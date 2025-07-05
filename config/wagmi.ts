import { createConfig, http, fallback } from "wagmi"
import { injected } from "wagmi/connectors"
import { apeChain } from "./chains"
import { mainnet } from "viem/chains"
import { createPublicClient } from "viem"
import { initWagmiClient } from "@/lib/alchemyKey"

// Create public client with fallback transports
const publicClient = createPublicClient({
  chain: apeChain,
  transport: fallback([
    http(apeChain.rpcUrls.default.http[0]),
    http(apeChain.rpcUrls.default.http[1]),
    http(apeChain.rpcUrls.default.http[2]),
    http(apeChain.rpcUrls.default.http[3]),
  ]),
})

// Initialize the multi-tier system with wagmi client
initWagmiClient(publicClient)

// Define configuration for Wagmi with fallback transports
export const config = createConfig({
  chains: [apeChain, mainnet],
  transports: {
    [apeChain.id]: fallback([
      http(apeChain.rpcUrls.default.http[0]),
      http(apeChain.rpcUrls.default.http[1]),
      http(apeChain.rpcUrls.default.http[2]),
      http(apeChain.rpcUrls.default.http[3]),
    ]),
    [mainnet.id]: http('https://cloudflare-eth.com'),
  },
  // Disable persistent storage to prevent auto-reconnect across sessions
  storage: null,
  connectors: [
    // Simple injected connector for MetaMask and other wallets
    injected({
      shimDisconnect: true,
    }),
  ],
  ssr: false,
})

export const MAIN_CHAIN_ID = apeChain.id
export const NFT_CONTRACT_ADDRESS = apeChain.contracts.crazyCubeNFT.address
export const TOKEN_CONTRACT_ADDRESS = apeChain.contracts.crazyToken.address
export const GAME_CONTRACT_ADDRESS = apeChain.contracts.gameProxy.address

// Export public client for direct use
export { publicClient }