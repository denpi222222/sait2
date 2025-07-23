'use client';

/**
 * @deprecated This hook is deprecated. Use useGameStats instead for consolidated game statistics.
 * This hook will be removed in a future version. useGameStats provides the same functionality
 * with better performance and additional features.
 */

import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { apeChain } from '../config/chains';

const GAME_ADDR = apeChain.contracts.gameProxy.address;

// Minimal ABI for contract stats reading
const CONTRACT_ABI = [
  {
    name: 'totalBurned',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getBreedCostCRA',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'monthlyRewardPool',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'totalLockedForRewards',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'mainTreasury',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'totalBurnedCRAA',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'totalBurned',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  // { name: 'totalStars', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    name: 'rewardRatePerSecond',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'pingInterval',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'breedCooldown',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'graveyardCooldown',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'burnFeeBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'manualFloorPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'monthlyUnlockPercentage',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'perPingCapDivisor',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'paused',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
] as const;

export interface ContractStats {
  // Core Statistics
  totalCRAABurned: string;
  totalTokensBurned: string;
  totalStars: string;

  // Pool Information
  currentMonthlyPool: string;
  currentLockedPool: string;
  mainTreasury: string;

  // Game Configuration
  currentBreedCost: string;
  rewardRatePerSecond: string;
  pingInterval: string;
  breedCooldown: string;
  graveyardCooldown: string;
  burnFeeBps: string;
  manualFloorPrice: string;
  monthlyUnlockPercentage: string;
  perPingCapDivisor: string;

  // Graveyard Info
  graveyardSize: string;
  activeNFTs: string;

  // Contract Status
  isPaused: boolean;

  lastUpdated: number;
}

export const useContractStats = () => {
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient();

  const fetchContractStats = async () => {
    if (!publicClient) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      // Fetch all stats in parallel for better performance
      const [
        totalCRAABurned,
        totalTokensBurned,
        currentMonthlyPool,
        currentLockedPool,
        mainTreasury,
        currentBreedCost,
        rewardRatePerSecond,
        pingInterval,
        breedCooldown,
        graveyardCooldown,
        burnFeeBps,
        manualFloorPrice,
        monthlyUnlockPercentage,
        graveyardSize,
        perPingCapDivisor,
        isPaused,
      ] = await Promise.all([
        publicClient.readContract({
          address: GAME_ADDR,
          abi: CONTRACT_ABI,
          functionName: 'totalBurnedCRAA',
        }),
        publicClient.readContract({
          address: GAME_ADDR,
          abi: CONTRACT_ABI,
          functionName: 'totalBurned',
        }),
        // publicClient.readContract({ address: GAME_ADDR, abi: CONTRACT_ABI, functionName: 'totalStars' }),
        publicClient.readContract({
          address: GAME_ADDR,
          abi: CONTRACT_ABI,
          functionName: 'monthlyRewardPool',
        }),
        publicClient.readContract({
          address: GAME_ADDR,
          abi: CONTRACT_ABI,
          functionName: 'totalLockedForRewards',
        }),
        publicClient.readContract({
          address: GAME_ADDR,
          abi: CONTRACT_ABI,
          functionName: 'mainTreasury',
        }),
        publicClient.readContract({
          address: GAME_ADDR,
          abi: CONTRACT_ABI,
          functionName: 'getBreedCostCRA',
        }),
        publicClient.readContract({
          address: GAME_ADDR,
          abi: CONTRACT_ABI,
          functionName: 'rewardRatePerSecond',
        }),
        publicClient.readContract({
          address: GAME_ADDR,
          abi: CONTRACT_ABI,
          functionName: 'pingInterval',
        }),
        publicClient.readContract({
          address: GAME_ADDR,
          abi: CONTRACT_ABI,
          functionName: 'breedCooldown',
        }),
        publicClient.readContract({
          address: GAME_ADDR,
          abi: CONTRACT_ABI,
          functionName: 'graveyardCooldown',
        }),
        publicClient.readContract({
          address: GAME_ADDR,
          abi: CONTRACT_ABI,
          functionName: 'burnFeeBps',
        }),
        publicClient.readContract({
          address: GAME_ADDR,
          abi: CONTRACT_ABI,
          functionName: 'manualFloorPrice',
        }),
        publicClient.readContract({
          address: GAME_ADDR,
          abi: CONTRACT_ABI,
          functionName: 'monthlyUnlockPercentage',
        }),
        publicClient.readContract({
          address: GAME_ADDR,
          abi: CONTRACT_ABI,
          functionName: 'totalBurned',
        }),
        publicClient.readContract({
          address: GAME_ADDR,
          abi: CONTRACT_ABI,
          functionName: 'perPingCapDivisor',
        }),
        publicClient.readContract({
          address: GAME_ADDR,
          abi: CONTRACT_ABI,
          functionName: 'paused',
        }),
      ]);

      const burnedCount = Number(totalTokensBurned as bigint);
      // Max NFTs is always 5,000 regardless of breeding (breeding revives from graveyard)
      const MAX_NFTS = 5000;
      const activeCount = Math.min(MAX_NFTS - burnedCount, MAX_NFTS);

      const contractStats: ContractStats = {
        totalCRAABurned: formatEther(totalCRAABurned as bigint),
        totalTokensBurned: (totalTokensBurned as bigint).toString(),
        totalStars: 'N/A', // Function disabled - returns invalid data
        currentMonthlyPool: formatEther(currentMonthlyPool as bigint),
        currentLockedPool: formatEther(currentLockedPool as bigint),
        mainTreasury: formatEther(mainTreasury as bigint),
        currentBreedCost: formatEther(currentBreedCost as bigint),
        rewardRatePerSecond: formatEther(rewardRatePerSecond as bigint),
        pingInterval: (pingInterval as bigint).toString(),
        breedCooldown: (breedCooldown as bigint).toString(),
        graveyardCooldown: (graveyardCooldown as bigint).toString(),
        burnFeeBps: (burnFeeBps as bigint).toString(),
        manualFloorPrice: formatEther(manualFloorPrice as bigint),
        monthlyUnlockPercentage: (monthlyUnlockPercentage as bigint).toString(),
        graveyardSize: (graveyardSize as bigint).toString(),
        activeNFTs: activeCount.toString(),
        perPingCapDivisor: (perPingCapDivisor as bigint).toString(),
        isPaused: isPaused as boolean,
        lastUpdated: Date.now(),
      };

      setStats(contractStats);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch contract stats');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContractStats();
  }, [publicClient]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(fetchContractStats, 120000);
    return () => clearInterval(interval);
  }, [publicClient]);

  // Helper functions for formatting
  const formatSeconds = (seconds: string) => {
    const secs = parseInt(seconds);
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const remainingSeconds = secs % 60;

    if (hours > 0) return `${hours}h ${minutes}m ${remainingSeconds}s`;
    if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
    return `${remainingSeconds}s`;
  };

  const formatBPS = (bps: string) => {
    const percentage = (parseInt(bps) / 100).toFixed(2);
    return `${percentage}%`;
  };

  return {
    stats,
    isLoading,
    error,
    refresh: fetchContractStats,

    // Formatted getters
    get pingIntervalFormatted() {
      return stats ? formatSeconds(stats.pingInterval) : '0';
    },

    get breedCooldownFormatted() {
      return stats ? formatSeconds(stats.breedCooldown) : '0';
    },

    get graveyardCooldownFormatted() {
      return stats ? formatSeconds(stats.graveyardCooldown) : '0';
    },

    get burnFeeFormatted() {
      return stats ? formatBPS(stats.burnFeeBps) : '0%';
    },

    get monthlyUnlockFormatted() {
      return stats ? formatBPS(stats.monthlyUnlockPercentage) : '0%';
    },
  };
};
