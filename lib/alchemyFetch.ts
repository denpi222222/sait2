import { getAlchemyKey, markKeyAsFailed } from './alchemyKey';

/**
 * Advanced Alchemy fetch helper with smart key rotation:
 * 1) Picks an Alchemy API key via round-robin (getAlchemyKey)
 * 2) Retries on 429 / 5xx with exponential back-off, rotating key each time
 * 3) Marks failed keys to avoid reusing them
 * 4) Supports both RPC (v2) and NFT (v3) endpoints on ApeChain mainnet
 */
export async function alchemyFetch(
  endpoint: 'rpc' | 'nft',
  path: string, // the part after /v2/{key} or /nft/v3/{key}
  init?: RequestInit,
  maxRetries = 5
): Promise<Response> {
  let attempt = 0;
  let delayMs = 1000; // start 1s

  while (attempt <= maxRetries) {
    const key = getAlchemyKey();
    // For ApeChain, use v2 for both RPC and NFT endpoints since v3 is not supported
    const base = `https://apechain-mainnet.g.alchemy.com/v2/${key}`;
    const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;

    try {
      const res = await fetch(url, init);
      if (res.status === 429 || res.status >= 500) {
        // Mark this key as failed for temporary blacklisting
        markKeyAsFailed(key);
        throw new Error(`status ${res.status}`);
      }
      return res;
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) throw err;
      await sleep(delayMs + Math.floor(Math.random() * 400));
      delayMs = Math.min(delayMs * 2, 64000);
    }
  }
  // should never reach here
  throw new Error('alchemyFetch: exhausted retries');
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
