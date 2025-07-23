import { useEffect, useState } from 'react';
import { usePublicClient, useChainId } from 'wagmi';
import { apeChain } from '../config/chains';

const GAME_ADDR = apeChain.contracts.gameProxy.address;
const ABI_MIN = [
  {
    name: 'totalBurned',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'graveyardTokens',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'burnRecords',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }],
    outputs: [
      { type: 'address' }, // owner
      { type: 'uint256' }, // totalAmount
      { type: 'uint256' }, // claimAvailableTime
      { type: 'uint256' }, // graveyardReleaseTime
      { type: 'bool' }, // claimed
      { type: 'uint8' }, // waitPeriod
    ],
  },
] as const;

const CACHE_KEY = 'crazycube:graveyard:tokens';
const REFRESH_INTERVAL_MS = 10000; // 10 sec

// Retry logic with exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a network error that we should retry
      const shouldRetry =
        error instanceof Error &&
        (error.message.includes('Failed to fetch') ||
          error.message.includes('Network request failed') ||
          error.message.includes('HTTP request failed') ||
          error.message.includes('timeout') ||
          error.message.includes('TimeoutError'));

      if (i === maxRetries || !shouldRetry) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, i);
      console.log(
        `Retrying request (attempt ${i + 1}/${maxRetries + 1}) after ${delay}ms delay`
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

export function useGraveyardTokens() {
  const [tokens, setTokens] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const publicClient = usePublicClient();
  const chainId = useChainId();
  const isApeChain = chainId === apeChain.id;

  useEffect(() => {
    let mounted = true;

    const fetchTokensOnce = async () => {
      if (!publicClient || !isApeChain) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        setError(null);
        // ONLY direct contract query - no subgraph!
        const graveyardSize = await withRetry(async () => {
          return (await publicClient.readContract({
            address: GAME_ADDR,
            abi: ABI_MIN,
            functionName: 'totalBurned',
          })) as bigint;
        });

        let finalTokens: string[] = [];
        const maxTokens = Math.min(Number(graveyardSize), 200); // limit for performance

        if (maxTokens > 0) {
          // Determine if network supports Multicall3
          const supportsMulticall =
            !!publicClient.chain?.contracts?.multicall3?.address;

          if (supportsMulticall) {
            // ----------------------------------------------------------
            // 1) Fast path — on-chain multicall (if available)
            // ----------------------------------------------------------
            const contracts = Array.from({ length: maxTokens }, (_, i) => ({
              address: GAME_ADDR,
              abi: ABI_MIN,
              functionName: 'graveyardTokens' as const,
              args: [BigInt(i)] as const,
            }));

            try {
              const mcRaw = await withRetry(async () => {
                return (await publicClient.multicall({
                  contracts,
                  allowFailure: true,
                })) as any;
              });

              const mcResults: any[] = Array.isArray(mcRaw)
                ? mcRaw
                : (mcRaw?.results ?? []);

              finalTokens = mcResults
                .filter(
                  r => r.status === 'success' && r.result && r.result > 0n
                )
                .map(r => (r.result as bigint).toString());
            } catch (mcErr) {}
          }

          // ------------------------------------------------------------
          // 2) Fallback – parallel eth_call (up to 10 simultaneously)
          // ------------------------------------------------------------
          if (finalTokens.length === 0) {
            const CHUNK = 10;
            for (let i = 0; i < maxTokens; i += CHUNK) {
              const slice = Array.from(
                { length: Math.min(CHUNK, maxTokens - i) },
                (_, k) => i + k
              );
              const chunkResults = await Promise.all(
                slice.map(idx =>
                  withRetry(async () => {
                    return await publicClient.readContract({
                      address: GAME_ADDR,
                      abi: ABI_MIN,
                      functionName: 'graveyardTokens',
                      args: [BigInt(idx)],
                    });
                  }).catch(() => 0n)
                )
              );
              chunkResults.forEach(res => {
                if (res > 0n) finalTokens.push(res.toString());
              });
            }
          }
        }

        if (mounted) {
          setTokens(finalTokens);
          setReady(finalTokens.length > 0);
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ ts: Date.now(), ids: finalTokens })
          );
        }
      } catch (e: any) {
        if (mounted) {
          // Handle timeout errors more gracefully
          const isTimeoutError =
            e?.message?.includes('timeout') ||
            e?.message?.includes('TimeoutError') ||
            e?.name === 'TimeoutError';

          const errorMessage = isTimeoutError
            ? 'Network timeout - please check your connection'
            : e?.message || 'Network connection failed';

          setError(errorMessage);

          // Try to load from cache on error
          if (tokens.length === 0) {
            try {
              const cachedRaw =
                typeof window !== 'undefined'
                  ? localStorage.getItem(CACHE_KEY)
                  : null;
              if (cachedRaw) {
                const cached = JSON.parse(cachedRaw) as {
                  ts: number;
                  ids: string[];
                };
                if (cached.ids?.length) {
                  setTokens(cached.ids);
                  setReady(cached.ids.length > 0);
                  console.log(
                    'Loaded graveyard tokens from cache due to network error'
                  );
                }
              }
            } catch (cacheError) {
              console.warn('Failed to load from cache:', cacheError);
            }
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTokensOnce();

    const interval = setInterval(fetchTokensOnce, REFRESH_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [publicClient, isApeChain]);

  return { tokens, loading, error, ready };
}
