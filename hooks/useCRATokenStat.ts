'use client';

/**
 * @deprecated This hook is deprecated. Use useSubgraphData instead for consolidated subgraph statistics.
 * This hook will be removed in a future version.
 */

import { useEffect, useState } from 'react';

interface TokenStat {
  totalSupply: bigint;
  burned: bigint;
  circulating: bigint;
  treasury: bigint;
  dexLiquidity: bigint;
  airdrop: bigint;
  rewards: bigint;
  priceUsd?: number;
  marketCapUsd?: number;
  volume24hUsd?: number;
}

const SUBGRAPH_URL = '/api/subgraph-token';

export const useCRAATokenStat = () => {
  const [stat, setStat] = useState<TokenStat | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        setLoading(true);
        const query = `query TokenStat { tokenStat(id: \"craa\") { totalSupply burned circulating treasury dexLiquidity airdrop rewards priceUsd marketCapUsd volume24hUsd } }`;
        const res = await fetch(SUBGRAPH_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const json = await res.json();
        const data = json?.data?.tokenStat;
        if (data && mounted) {
          const parsed: TokenStat = {
            totalSupply: BigInt(data.totalSupply || 0),
            burned: BigInt(data.burned || 0),
            circulating: BigInt(data.circulating || 0),
            treasury: BigInt(data.treasury || 0),
            dexLiquidity: BigInt(data.dexLiquidity || 0),
            airdrop: BigInt(data.airdrop || 0),
            rewards: BigInt(data.rewards || 0),
            ...(data.priceUsd !== undefined && { priceUsd: data.priceUsd }),
            ...(data.marketCapUsd !== undefined && {
              marketCapUsd: data.marketCapUsd,
            }),
            ...(data.volume24hUsd !== undefined && {
              volume24hUsd: data.volume24hUsd,
            }),
          };
          setStat(parsed);
        }
      } catch (e: any) {
        if (mounted) setError(e.message || 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchStats();
    const id = setInterval(fetchStats, 180000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return { stat, loading, error };
};
