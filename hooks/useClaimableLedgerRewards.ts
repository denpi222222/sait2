import { useEffect, useState, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';

interface ClaimableRewardLedger {
  tokenId: string;
  waitHours: number;
  burnTime: number;
  canClaim: boolean;
  timeLeft: number;
}

export function useClaimableLedgerRewards(refreshIntervalMs = 60000) {
  const { address, isConnected } = useAccount();
  const [rewards, setRewards] = useState<ClaimableRewardLedger[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<NodeJS.Timeout>();

  const CACHE_KEY = address ? `crazycube:claimable:${address}` : undefined;
  const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  const fetchOnce = useCallback(async () => {
    if (!address || !isConnected) {
      setRewards([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      // Try cache first
      let cached: { ts: number; data: ClaimableRewardLedger[] } | null = null;
      if (CACHE_KEY && typeof window !== 'undefined') {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          try {
            cached = JSON.parse(raw);
            if (cached && Date.now() - cached.ts < CACHE_TTL) {
              setRewards(cached.data);
            }
          } catch {
            localStorage.removeItem(CACHE_KEY);
          }
        }
      }

      let list: ClaimableRewardLedger[] = [];

      // ---- 1) Try through Subgraph
      try {
        const sgQuery = `query($player: Bytes!) {
          player(id: $player) {
            totalClaimable
            burnEvents(orderBy: timestamp, orderDirection: desc, first: 50) {
              tokenId waitHours timestamp amount
            }
          }
        }`;
        const sgRes = await fetch('/api/subgraph', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: sgQuery,
            variables: { player: address },
          }),
        });
        if (sgRes.ok) {
          const sgJson = await sgRes.json();
          const p = sgJson?.data?.player;
          if (p) {
            list = (p.burnEvents || []).map((ev: any) => ({
              tokenId: ev.tokenId.toString(),
              waitHours: ev.waitHours,
              burnTime: ev.timestamp,
              canClaim: false, // will calculate below
              timeLeft: 0,
            }));
          }
        }
      } catch {}

      // ---- 2) If Subgraph is empty – REST ledger
      if (list.length === 0) {
        const res = await fetch(`/api/ledger/claimable/${address}`);
        if (res.ok) {
          const json = await res.json();
          list = json.pending || [];
        }
      }

      setRewards(list);
      if (CACHE_KEY) {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ ts: Date.now(), data: list })
        );
      }
    } catch (e: any) {
      setError(e?.message || 'error');
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, CACHE_KEY]);

  // initial + refresh interval
  useEffect(() => {
    fetchOnce();
    if (refreshIntervalMs > 0 && address) {
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(fetchOnce, refreshIntervalMs);
      return () => {
        if (timer.current) clearInterval(timer.current);
      };
    }
    return undefined;
  }, [address, refreshIntervalMs]);

  return { rewards, loading, error, refresh: fetchOnce };
}
