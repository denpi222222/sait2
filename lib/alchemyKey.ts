// Advanced multi-tier API provider system with smart fallbacks

let lastIdx = -1;
const failedKeys = new Set<string>();
let lastResetTime = Date.now();
let currentTier = 0; // 0 = Alchemy, 1 = Public RPC, 2 = Wagmi

// Reset failed keys every 3 minutes (more aggressive to recover faster)
const RESET_INTERVAL = 3 * 60 * 1000;

// Track usage / failure stats per key for debugging and smarter rotation
const keyStats = new Map<
  string,
  { uses: number; fails: number; lastUsed: number }
>();

// Tier 1: Premium Alchemy endpoints (fastest, rate limited)
// SECURITY: Use environment variables first, fallback to hardcoded keys
const ALCHEMY_KEYS = [
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_1,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_2,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_3,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_4,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_5,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY, // Fallback to single key
].filter((key): key is string => typeof key === 'string' && key.length > 0);

// Tier 2: Public RPC endpoints (slower but reliable)
const PUBLIC_RPC_ENDPOINTS = [
  'https://rpc.apechain.com',
  'https://apechain.calderachain.xyz',
  'https://rpc.ankr.com/apechain',
  'https://apechain-mainnet.rpc.thirdweb.com',
];

// Tier 3: Wagmi public client (slowest but always works)
let wagmiPublicClient: any = null;

export const getAlchemyKey = (): string => {
  // Reset failed keys periodically
  const now = Date.now();
  if (now - lastResetTime > RESET_INTERVAL) {
    failedKeys.clear();
    lastResetTime = now;
    currentTier = 0; // Reset to premium tier
  }

  // Use environment variables first, fallback to hardcoded keys
  const availableKeys = ALCHEMY_KEYS.filter(
    (k): k is string => typeof k === 'string' && !failedKeys.has(k)
  );

  // If no Alchemy keys available, escalate to public RPC
  if (availableKeys.length === 0) {
    if (currentTier === 0) {
      currentTier = 1;
    }
    return PUBLIC_RPC_ENDPOINTS[0] || 'https://rpc.apechain.com';
  }

  // Round-robin through available keys
  if (availableKeys.length === 0) {
    throw new Error('No available Alchemy keys');
  }

  lastIdx = (lastIdx + 1) % availableKeys.length;
  const selectedKey = availableKeys[lastIdx];

  if (!selectedKey) {
    throw new Error('No available Alchemy keys');
  }

  // Track usage statistics
  const stat = keyStats.get(selectedKey) || { uses: 0, fails: 0, lastUsed: 0 };
  stat.uses++;
  stat.lastUsed = now;
  keyStats.set(selectedKey, stat);

  return selectedKey;
};

// Mark a key as failed and escalate tier if needed
export const markKeyAsFailed = (key: string): void => {
  failedKeys.add(key);

  // If all Alchemy keys failed, escalate to public RPC
  const availableKeys = ALCHEMY_KEYS.filter(
    (k): k is string => typeof k === 'string' && !failedKeys.has(k)
  );

  if (availableKeys.length === 0 && currentTier === 0) {
    currentTier = 1;
  }

  // Update stats
  const stat = keyStats.get(key) || { uses: 0, fails: 0, lastUsed: 0 };
  stat.fails++;
  keyStats.set(key, stat);
};

// Get best available endpoint based on current tier
export const getBestEndpoint = (): {
  url: string;
  type: 'alchemy' | 'rpc' | 'wagmi';
} => {
  const now = Date.now();

  // Reset tier periodically
  if (now - lastResetTime > RESET_INTERVAL) {
    currentTier = 0;
  }

  // Tier 1: Try Alchemy
  if (currentTier === 0) {
    const key = getAlchemyKey();
    return {
      url: `https://apechain-mainnet.g.alchemy.com/v2/${key}`,
      type: 'alchemy',
    };
  }

  // Tier 2: Public RPC
  if (currentTier === 1) {
    const rpcIdx = Math.floor(Math.random() * PUBLIC_RPC_ENDPOINTS.length);
    return {
      url:
        PUBLIC_RPC_ENDPOINTS[rpcIdx] ||
        PUBLIC_RPC_ENDPOINTS[0] ||
        'https://rpc.ankr.com/apechain',
      type: 'rpc',
    };
  }

  // Tier 3: Wagmi fallback
  return {
    url: 'wagmi-public-client',
    type: 'wagmi',
  };
};

// Initialize wagmi public client for emergency fallback
export const initWagmiClient = (client: object) => {
  wagmiPublicClient = client;
};

// Ultra-smart fetch with multi-tier fallback
export const ultraSmartFetch = async (
  requestData: { [key: string]: any },
  options: RequestInit = {},
  maxRetries = 6
): Promise<any> => {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    const endpoint = getBestEndpoint();

    try {
      // Tier 3: Use wagmi public client
      if (endpoint.type === 'wagmi' && wagmiPublicClient) {
        // Handle different request types for wagmi
        if (requestData.method === 'eth_getBalance') {
          return await wagmiPublicClient.getBalance({
            address: requestData.params[0],
          });
        }
        if (requestData.method === 'eth_call') {
          return await wagmiPublicClient.call({
            to: requestData.params[0].to,
            data: requestData.params[0].data,
          });
        }
        if (requestData.method === 'eth_blockNumber') {
          return await wagmiPublicClient.getBlockNumber();
        }

        // For other methods, fall back to RPC
        currentTier = 1;
        continue;
      }

      // Tier 1 & 2: HTTP requests
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(requestData),
        ...options,
      });

      if (response.status === 429) {
        if (endpoint.type === 'alchemy') {
          markKeyAsFailed(getAlchemyKey());
        }
        currentTier = Math.min(currentTier + 1, 2);
        throw new Error(`Rate limited: ${response.status}`);
      }

      if (response.status >= 500) {
        if (endpoint.type === 'alchemy') {
          markKeyAsFailed(getAlchemyKey());
        }
        throw new Error(`Server error: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Log successful tier usage
      if (attempt > 0) {
      }

      return result;
    } catch (error) {
      lastError = error as Error;
      attempt++;

      if (attempt <= maxRetries) {
        // Escalate tier on failure
        if (endpoint.type === 'alchemy') {
          currentTier = 1;
        } else if (endpoint.type === 'rpc') {
          currentTier = 2;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('All provider tiers exhausted');
};

// Legacy compatibility functions
export const getAlchemyUrl = (endpoint: 'rpc' | 'nft' = 'rpc'): string => {
  const bestEndpoint = getBestEndpoint();

  if (bestEndpoint.type === 'alchemy') {
    return endpoint === 'rpc'
      ? bestEndpoint.url
      : bestEndpoint.url.replace('/v2/', '/nft/v3/');
  }

  // For non-Alchemy endpoints, return RPC URL
  return bestEndpoint.url;
};

export const smartAlchemyFetch = ultraSmartFetch;

// Get rotation statistics for debugging / monitoring
export const getRotationStats = () => {
  const stats = Array.from(keyStats.entries()).map(([key, s]) => ({
    key: key.slice(0, 8) + '...',
    uses: s.uses,
    fails: s.fails,
    lastUsed: new Date(s.lastUsed).toISOString(),
    failRate: s.uses ? ((s.fails / s.uses) * 100).toFixed(1) + '%' : '0%',
  }));

  return {
    currentTier,
    failedKeys: Array.from(failedKeys).map(k => k.slice(0, 8) + '...'),
    stats,
    lastResetTime: new Date(lastResetTime).toISOString(),
  };
};

/**
 * USAGE EXAMPLES:
 *
 * // Initialize wagmi client for Tier 3 fallback
 * import { createPublicClient, http } from 'viem'
 * import { apeChain } from '@/config/chains'
 *
 * const publicClient = createPublicClient({
 *   chain: apeChain,
 *   transport: http()
 * })
 * initWagmiClient(publicClient)
 *
 * // Ultra-smart fetch with 3-tier fallback
 * const result = await ultraSmartFetch({
 *   jsonrpc: '2.0',
 *   method: 'eth_getBalance',
 *   params: ['0x...', 'latest'],
 *   id: 1
 * })
 *
 * // Get best endpoint for manual requests
 * const endpoint = getBestEndpoint()
 * *
 * // Legacy compatibility
 * const url = getAlchemyUrl('rpc')
 * const response = await smartAlchemyFetch(requestData)
 */
