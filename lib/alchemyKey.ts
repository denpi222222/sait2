// Advanced multi-tier API provider system with smart fallbacks

let lastIdx = -1
let failedKeys = new Set<string>()
let lastResetTime = Date.now()
let currentTier = 0 // 0 = Alchemy, 1 = Public RPC, 2 = Wagmi

// Reset failed keys every 3 minutes (more aggressive to recover faster)
const RESET_INTERVAL = 3 * 60 * 1000

// Track usage / failure stats per key for debugging and smarter rotation
const keyStats = new Map<string, { uses: number; fails: number; lastUsed: number }>()

// Tier 1: Premium Alchemy endpoints (fastest, rate limited)
const ALCHEMY_KEYS = [
  "Gj0JwOaaMGxdCUFF62G1jNY7ilv-RTQ7",
  "PhSj2jZcGV-pRBeSG9VQzUqKzfr-Ftnk", 
  "NTY_VpoftuNVbJzOT2dar_SMVKJkdx_C",
  "ekJ6zKl0S2nfMoMkGBOZuxZTGYa2nvCQ"
]

// Tier 2: Public RPC endpoints (slower but reliable)
const PUBLIC_RPC_ENDPOINTS = [
  "https://rpc.apechain.com",
  "https://apechain.calderachain.xyz", 
  "https://rpc.ankr.com/apechain",
  "https://apechain-mainnet.rpc.thirdweb.com"
]

// Tier 3: Wagmi public client (slowest but always works)
let wagmiPublicClient: any = null

export const getAlchemyKey = (): string => {
  // Reset failed keys periodically
  const now = Date.now()
  if (now - lastResetTime > RESET_INTERVAL) {
    failedKeys.clear()
    lastResetTime = now
    currentTier = 0 // Reset to premium tier
  }

  // Try environment variables first
  const envKeys = [
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_1,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_2,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_3,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_4,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_5,
  ].filter((k): k is string => typeof k === 'string')

  const allKeys = envKeys.length > 0 ? envKeys : ALCHEMY_KEYS

  // Filter out failed keys
  const availableKeys = allKeys.filter((k): k is string => typeof k === 'string' && !failedKeys.has(k))
  
  // If all keys failed, reset and try again
  if (availableKeys.length === 0) {
    failedKeys.clear()
    lastIdx = -1
    const selectedKey: string = (ALCHEMY_KEYS[0] as string) || "ekJ6zKl0S2nfMoMkGBOZuxZTGYa2nvCQ"

    // Track usage statistics
    const stat = keyStats.get(selectedKey) || { uses: 0, fails: 0, lastUsed: 0 }
    stat.uses++
    stat.lastUsed = now
    keyStats.set(selectedKey, stat)

    return selectedKey
  }

  // Round-robin through available keys
  lastIdx = (lastIdx + 1) % availableKeys.length
  const selectedKey = `${availableKeys[lastIdx] ?? ALCHEMY_KEYS[0] ?? "ekJ6zKl0S2nfMoMkGBOZuxZTGYa2nvCQ"}`;

  // Track usage statistics
  const stat = keyStats.get(selectedKey) || { uses: 0, fails: 0, lastUsed: 0 }
  stat.uses++
  stat.lastUsed = now
  keyStats.set(selectedKey, stat)

  return selectedKey
}

// Mark a key as failed and escalate tier if needed
export const markKeyAsFailed = (key: string): void => {
  failedKeys.add(key)
  console.warn(`🔑 Provider marked as failed: ${key.slice(0, 20)}...`)
  
  // If all Alchemy keys failed, escalate to public RPC
  const envKeys = [
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_1,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_2,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_3,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_4,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_5,
  ].filter((k): k is string => typeof k === 'string')
  
  const allKeys = envKeys.length > 0 ? envKeys : ALCHEMY_KEYS
  const availableKeys = allKeys.filter((k): k is string => typeof k === 'string' && !failedKeys.has(k))
  
  if (availableKeys.length === 0 && currentTier === 0) {
    currentTier = 1
    console.warn(`⬆️ Escalating to Tier 2: Public RPC endpoints`)
  }

  // Update stats
  const stat = keyStats.get(key) || { uses: 0, fails: 0, lastUsed: 0 }
  stat.fails++
  keyStats.set(key, stat)
}

// Get best available endpoint based on current tier
export const getBestEndpoint = (): { url: string; type: 'alchemy' | 'rpc' | 'wagmi' } => {
  const now = Date.now()
  
  // Reset tier periodically
  if (now - lastResetTime > RESET_INTERVAL) {
    currentTier = 0
  }

  // Tier 1: Try Alchemy
  if (currentTier === 0) {
    const key = getAlchemyKey()
    return {
      url: `https://apechain-mainnet.g.alchemy.com/v2/${key}`,
      type: 'alchemy'
    }
  }
  
  // Tier 2: Public RPC
  if (currentTier === 1) {
    const rpcIdx = Math.floor(Math.random() * PUBLIC_RPC_ENDPOINTS.length)
    return {
      url: PUBLIC_RPC_ENDPOINTS[rpcIdx] || PUBLIC_RPC_ENDPOINTS[0] || 'https://rpc.ankr.com/apechain',
      type: 'rpc'
    }
  }
  
  // Tier 3: Wagmi fallback
  return {
    url: 'wagmi-public-client',
    type: 'wagmi'
  }
}

// Initialize wagmi public client for emergency fallback
export const initWagmiClient = (client: any) => {
  wagmiPublicClient = client
}

// Ultra-smart fetch with multi-tier fallback
export const ultraSmartFetch = async (
  requestData: any,
  options: RequestInit = {},
  maxRetries = 6
): Promise<any> => {
  let attempt = 0
  let lastError: Error | null = null

  while (attempt <= maxRetries) {
    const endpoint = getBestEndpoint()
    
    try {
      // Tier 3: Use wagmi public client
      if (endpoint.type === 'wagmi' && wagmiPublicClient) {
        console.log(`🔄 Using Wagmi public client (Tier 3)`)
        
        // Handle different request types for wagmi
        if (requestData.method === 'eth_getBalance') {
          return await wagmiPublicClient.getBalance({ 
            address: requestData.params[0] 
          })
        }
        if (requestData.method === 'eth_call') {
          return await wagmiPublicClient.call({
            to: requestData.params[0].to,
            data: requestData.params[0].data
          })
        }
        if (requestData.method === 'eth_blockNumber') {
          return await wagmiPublicClient.getBlockNumber()
        }
        
        // For other methods, fall back to RPC
        currentTier = 1
        continue
      }
      
      // Tier 1 & 2: HTTP requests
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(requestData),
        ...options
      })

      if (response.status === 429) {
        console.warn(`⚠️ Rate limited on ${endpoint.type}, trying next tier...`)
        if (endpoint.type === 'alchemy') {
          markKeyAsFailed(getAlchemyKey())
        }
        currentTier = Math.min(currentTier + 1, 2)
        throw new Error(`Rate limited: ${response.status}`)
      }

      if (response.status >= 500) {
        console.warn(`⚠️ Server error on ${endpoint.type}: ${response.status}`)
        if (endpoint.type === 'alchemy') {
          markKeyAsFailed(getAlchemyKey())
        }
        throw new Error(`Server error: ${response.status}`)
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Log successful tier usage
      if (attempt > 0) {
        console.log(`✅ Success on ${endpoint.type} after ${attempt} retries`)
      }
      
      return result

    } catch (error) {
      lastError = error as Error
      attempt++
      
      console.warn(`❌ Attempt ${attempt} failed on ${endpoint.type}:`, lastError.message)
      
      if (attempt <= maxRetries) {
        // Escalate tier on failure
        if (endpoint.type === 'alchemy') {
          currentTier = 1
        } else if (endpoint.type === 'rpc') {
          currentTier = 2
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  console.error(`💥 All tiers failed after ${maxRetries} attempts`)
  throw lastError || new Error('All provider tiers exhausted')
}

// Legacy compatibility functions
export const getAlchemyUrl = (endpoint: 'rpc' | 'nft' = 'rpc'): string => {
  const bestEndpoint = getBestEndpoint()
  
  if (bestEndpoint.type === 'alchemy') {
    return endpoint === 'rpc' 
      ? bestEndpoint.url
      : bestEndpoint.url.replace('/v2/', '/nft/v3/')
  }
  
  // For non-Alchemy endpoints, return RPC URL
  return bestEndpoint.url
}

export const smartAlchemyFetch = ultraSmartFetch

// Get rotation statistics for debugging / monitoring
export const getRotationStats = () => {
  const stats = Array.from(keyStats.entries()).map(([key, s]) => ({
    key: key.slice(0, 8) + '...',
    uses: s.uses,
    fails: s.fails,
    lastUsed: new Date(s.lastUsed).toISOString(),
    failRate: s.uses ? ((s.fails / s.uses) * 100).toFixed(1) + '%' : '0%'
  }))

  return {
    currentTier,
    failedKeys: Array.from(failedKeys).map(k=>k.slice(0,8)+'...'),
    stats,
    lastResetTime: new Date(lastResetTime).toISOString()
  }
}

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
 * console.log(`Using: ${endpoint.type} - ${endpoint.url}`)
 * 
 * // Legacy compatibility
 * const url = getAlchemyUrl('rpc')
 * const response = await smartAlchemyFetch(requestData)
 */ 