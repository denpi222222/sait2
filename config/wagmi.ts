import { createConfig, http, fallback } from "wagmi"
import { injected, metaMask, walletConnect } from "wagmi/connectors"
import { apeChain } from "./chains"
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
  chains: [apeChain],
  transports: {
    [apeChain.id]: fallback([
      http(apeChain.rpcUrls.default.http[0]),
      http(apeChain.rpcUrls.default.http[1]),
      http(apeChain.rpcUrls.default.http[2]),
      http(apeChain.rpcUrls.default.http[3]),
    ]),
  },
  // Disable persistent storage to prevent auto-reconnect across sessions
  storage: null,
  connectors: [
    // 1) MetaMask connector (opens MetaMask mobile via deeplink when not injected)
    metaMask({
      dappMetadata: {
        name: "CrazyCube",
        url: typeof window !== "undefined" ? window.location.origin : "https://crazycube.xyz",
        iconUrl: "https://crazycube.xyz/favicon.ico",
      },
    }),

    // 2) WalletConnect V2 connector – covers all mobile wallets (MetaMask, Rabby, Trust, etc.)
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "crazycube-project-id",
      metadata: {
        name: "CrazyCube",
        description: "CrazyCube NFT Game",
        url: typeof window !== "undefined" ? window.location.origin : "https://crazycube.xyz",
        icons: ["https://crazycube.xyz/favicon.ico"],
      },
      showQrModal: true,
    }),

    // 3) Fallback plain injected (covers any other extension that injects ethereum)
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