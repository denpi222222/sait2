/**
 * Generic helper: performs a subgraph request and, if it fails/returns empty,
 * automatically falls back to RPC (or any secondary source).
 */
export async function getDataWithFallback<T>(
  primary: () => Promise<T | null | undefined>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    const res = await primary();
    if (res !== null && res !== undefined) return res;
    console.warn('[getDataWithFallback] primary returned empty result – fallback');
  } catch (e) {
    console.warn('[getDataWithFallback] primary threw error – falling back', e);
  }
  return fallback();
}
