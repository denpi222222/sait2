import { defineChain } from "viem"

export const apeChain = defineChain({
  id: 33139, // Обновленный Chain ID для ApeChain mainnet 2025
  name: "ApeChain",
  network: "apechain",
  nativeCurrency: {
    decimals: 18,
    name: "APE",
    symbol: "APE",
  },
  rpcUrls: {
    default: {
      http: [
        "https://rpc.apechain.com",
        "https://apechain.calderachain.xyz",
      ],
    },
    public: {
      http: [
        "https://rpc.apechain.com",
        "https://apechain.calderachain.xyz",
      ],
    },
  },
  blockExplorers: {
    default: { name: "ApeScan", url: "https://apescan.io" },
  },
  contracts: {
    crazyCubeNFT: {
      address: "0x606a47707d5aEdaE9f616A6f1853fE3075bA740B" as `0x${string}`,
      blockCreated: 1_234_567,
    },
    crazyToken: {
      address: "0x0A5b48dB89Bf94466464DE3e70F9c86aa27b9495" as `0x${string}`,
      blockCreated: 1_234_600,
    },
    gameProxy: {
      address: "0x7dFb75F1000039D650A4C2B8a068f53090e857dD" as `0x${string}`,
      blockCreated: 1_234_650,
    },
  },
})
