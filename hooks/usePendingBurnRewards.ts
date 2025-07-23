import { useEffect, useState, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { apeChain } from '../config/chains';
import { alchemyFetch } from '@/lib/alchemyFetch';

// Contract constants
const GAME_ADDRESS = apeChain.contracts.gameProxy.address;
const NFT_ADDRESS = '0x606a47707d5aEdaE9f616A6f1853fE3075bA740B' as const;

const GAME_ABI = [
  // graveyard functions
  'function getGraveyardSize() view returns (uint256)',
  'function graveyardTokens(uint256) view returns (uint256)',
  // burn record mapping (tokenId => (owner,totalAmount,claimAvailableTime,claimed))
  'function burnRecords(uint256) view returns (address owner,uint256 totalAmount,uint256 claimAvailableTime,bool claimed)',
] as const;

const NFT_BURNED_EVENT = {
  anonymous: false,
  inputs: [
    { indexed: true, type: 'address', name: 'player' },
    { indexed: true, type: 'uint256', name: 'tokenId' },
  ],
  name: 'NFTBurned',
  type: 'event',
} as const;

export interface PendingReward {
  tokenId: string;
  image?: string;
  name?: string;
  record: {
    lockedAmount: bigint;
    lockedAmountFormatted: string;
    waitPeriod: number;
    waitPeriodHours: number;
    burnTimestamp: number;
    claimed: boolean;
    canClaim: boolean;
    timeLeft: number;
    timeLeftFormatted: string;
  };
}

const CACHE_KEY = 'crazycube:pendingRewards';
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export function usePendingBurnRewards() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [rewards, setRewards] = useState<PendingReward[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scanningHistory, setScanningHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // helper to read cache
  const readCache = () => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(CACHE_KEY + ':' + address);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { ts: number; data: PendingReward[] };
      if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
      return parsed.data;
    } catch {
      return null;
    }
  };

  const writeCache = (data: PendingReward[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        CACHE_KEY + ':' + address,
        JSON.stringify({ ts: Date.now(), data })
      );
    } catch {}
  };

  // deep scan across historical burns (may be slow)
  const scanHistoricalBurns = useCallback(
    async (already: Set<string>): Promise<PendingReward[]> => {
      if (!publicClient || !address) return [];
      setScanningHistory(true);
      const extra: PendingReward[] = [];
      try {
        const deployBlock = apeChain.contracts.gameProxy.blockCreated ?? 0;
        const logs = (await publicClient.getLogs({
          address: GAME_ADDRESS,
          event: NFT_BURNED_EVENT,
          fromBlock: BigInt(deployBlock),
          args: { player: address },
        })) as any[];
        const ids = logs.map(l => BigInt(l.args.tokenId).toString());
        if (ids.length === 0) return [];
        for (const id of ids) {
          if (already.has(id)) continue;
          const rec = (await publicClient.readContract({
            address: GAME_ADDRESS,
            abi: GAME_ABI,
            functionName: 'burnRecords',
            args: [BigInt(id)],
          })) as any;
          const [owner, total, claimAt, claimed] = rec;
          if (
            !owner ||
            owner.toLowerCase() !== address.toLowerCase() ||
            claimed ||
            BigInt(total) === 0n
          )
            continue;
          const now = Math.floor(Date.now() / 1000);
          const timeLeft = Math.max(0, Number(claimAt) - now);
          extra.push({
            tokenId: id,
            record: {
              lockedAmount: total,
              lockedAmountFormatted: formatEther(total),
              waitPeriod: 0,
              waitPeriodHours: 0,
              burnTimestamp: Number(claimAt) - 43200,
              claimed: false,
              canClaim: timeLeft === 0,
              timeLeft,
              timeLeftFormatted:
                timeLeft === 0 ? 'Ready!' : `${Math.floor(timeLeft / 3600)}h`,
            },
          });
        }
        return extra;
      } catch (e) {
        return extra;
      } finally {
        setScanningHistory(false);
      }
    },
    [publicClient, address]
  );

  const fetchAndProcessRewards = useCallback(async (): Promise<
    PendingReward[]
  > => {
    // 1. Fetch all burn records for the user. This is the single source of truth.
    const allBurns = await scanHistoricalBurns(new Set());

    // 2. Enrich with metadata and CORRECTLY set the image path.
    await Promise.allSettled(
      allBurns.map(async item => {
        try {
          // We still fetch metadata for the name for a better UX
          if (!item.name) {
            const queryPath = `getNFTMetadata?contractAddress=${NFT_ADDRESS}&tokenId=${item.tokenId}`;
            const r = await alchemyFetch('nft', queryPath, undefined, 3);
            if (r.ok) {
              const m = await r.json();
              item.name =
                m.rawMetadata?.name || m.title || `CrazyCube #${item.tokenId}`;
            } else {
              item.name = `CrazyCube #${item.tokenId}`;
            }
          }
        } catch {
          // If metadata fails, provide a fallback name.
          item.name = `CrazyCube #${item.tokenId}`;
        }
        // As per your request, force all images to load from the local public folder.
        // This is the fix for the images.
        item.image = `/images/${item.tokenId}.png`;
      })
    );

    return allBurns;
  }, [address, isConnected, publicClient, scanHistoricalBurns]);

  const run = useCallback(
    async (showSpinner: boolean) => {
      if (!address || !isConnected) {
        setRewards([]); // Clear rewards if wallet is not connected
        return;
      }

      if (showSpinner) setLoading(true);
      setError(null);

      try {
        // On initial load, show cached data immediately for better UX
        if (showSpinner) {
          // Only use cache on the very first load
          const cached = readCache();
          if (cached) {
            setRewards(cached);
          }
        }

        // 1. Fetch all data in one go.
        const allRewards = await fetchAndProcessRewards();

        // 2. Create a unique list using a Map. This is the fix for the duplicates.
        const uniqueRewards = Array.from(
          new Map(allRewards.map(item => [item.tokenId, item])).values()
        );

        // 3. Update the state ONCE with the final, clean list.
        setRewards(uniqueRewards);
        writeCache(uniqueRewards);
      } catch (e: any) {
        setError(e.message || 'Failed to fetch rewards.');
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [address, isConnected, fetchAndProcessRewards]
  );

  const refresh = async () => {
    setRefreshing(true);
    try {
      await run(true); // show spinner on manual refresh
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const hasCache = readCache() !== null;
    run(!hasCache); // show spinner only if no cache
  }, [run]);

  return {
    rewards,
    loading,
    error,
    refreshing,
    refresh,
    scanningHistory,
    scanHistory: () =>
      scanHistoricalBurns(
        new Set(rewards.map((rr: PendingReward) => rr.tokenId))
      ),
  };
}
