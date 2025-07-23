import { defineChain } from 'viem';

export const apeChain = defineChain({
  id: 33139, // Updated Chain ID for ApeChain mainnet 2025
  name: 'ApeChain',
  network: 'apechain',
  nativeCurrency: {
    decimals: 18,
    name: 'APE',
    symbol: 'APE',
  },
  rpcUrls: {
    default: {
      http: [
        'https://rpc.apechain.com',
        'https://apechain.calderachain.xyz',
        'https://apechain-rpc.publicnode.com',
        'https://apechain.drpc.org',
      ],
    },
    public: {
      http: [
        'https://rpc.apechain.com',
        'https://apechain.calderachain.xyz',
        'https://apechain-rpc.publicnode.com',
        'https://apechain.drpc.org',
      ],
    },
  },
  blockExplorers: {
    default: { name: 'ApeScan', url: 'https://apescan.io' },
  },
  contracts: {
    crazyCubeNFT: {
      address: '0x606a47707d5aEdaE9f616A6f1853fE3075bA740B' as `0x${string}`,
      blockCreated: 1_234_567,
    },
    crazyToken: {
      address: '0xBb526D657Cc1Ba772469A6EC96AcB2ed9D2A93e5' as `0x${string}`,
      blockCreated: 1_234_600,
    },
    gameProxy: {
      address: '0x7dFb75F1000039D650A4C2B8a068f53090e857dD' as `0x${string}`,
      blockCreated: 1_234_650,
    },
  },
});
