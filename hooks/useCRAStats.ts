/**
 * @deprecated This hook is deprecated. Use useSubgraphData instead for consolidated subgraph statistics.
 * This hook will be removed in a future version.
 */

import { useEffect, useState } from 'react';

interface CRAAStats {
  id: string;
  totalSupply: string; // bigint as string
  deadBalance: string; // bigint as string
  lastUpdated: string;
}

export default function useCRAAStats() {
  const [data, setData] = useState<CRAAStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/subgraph-token', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            query: `{craaStats(id:"1"){id totalSupply deadBalance lastUpdated}}`,
          }),
        });
        const json = await res.json();
        if (json.errors)
          throw new Error(json.errors[0]?.message || 'GraphQL error');
        setData(json.data?.craaStats);
      } catch (e: any) {
        setError(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const iv = setInterval(fetchData, 180000); // 3 minutes (was 60s)
    return () => clearInterval(iv);
  }, []);

  return { data, loading, error };
}
