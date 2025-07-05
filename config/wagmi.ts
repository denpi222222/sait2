import { createConfig, http } from "wagmi"
import { injected } from "wagmi/connectors"
import { apeChain } from "./chains"
import { mainnet } from "viem/chains"
import { createPublicClient } from "viem"
import { initWagmiClient } from "@/lib/alchemyKey"

// Create public client for emergency fallback
const publicClient = createPublicClient({
  chain: apeChain,
  transport: http(apeChain.rpcUrls.default.http[0]),
})

// Initialize the multi-tier system with wagmi client
initWagmiClient(publicClient)

// Определяем конфигурацию для Wagmi
export const config = createConfig({
  chains: [apeChain, mainnet],
  transports: {
    [apeChain.id]: http(apeChain.rpcUrls.default.http[0]),
    [mainnet.id]: http('https://cloudflare-eth.com'),
  },
  // Disable persistent storage to prevent auto-reconnect across sessions
  storage: null,
  connectors: [
    // Простой injected коннектор для MetaMask и других кошельков
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