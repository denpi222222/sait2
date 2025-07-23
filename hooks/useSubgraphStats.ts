'use client';

/**
 * @deprecated This hook is deprecated. Use useSubgraphData instead for consolidated subgraph statistics.
 * This hook will be removed in a future version. useSubgraphData provides the same functionality
 * with better organization and additional features.
 */

import { useState, useEffect } from 'react';

// Interfaces for subgraph data
export interface ContractStats {
  id: string;

  // Core Statistics from Contract
  totalCRAABurned: string; // BigInt as string
  totalTokensBurned: string; // BigInt as string
  totalStars: string; // BigInt as string

  // Pool Information
  currentMonthlyPool: string; // BigInt as string
  currentLockedPool: string; // BigInt as string
  mainTreasury: string; // BigInt as string
  totalPoolRefills: string; // BigInt as string
  totalPoolTopUps: string; // BigInt as string
  lastMonthlyUnlock: string; // BigInt as string

  // Game Configuration
  breedCostBps: string; // BigInt as string
  rewardRatePerSecond: string; // BigInt as string
  pingInterval: string; // BigInt as string (in seconds)
  maxAccumulationPeriod: string; // BigInt as string
  breedCooldown: string; // BigInt as string (in seconds)
  graveyardCooldown: string; // BigInt as string
  monthlyUnlockPercentage: string; // BigInt as string
  burnFeeBps: string; // BigInt as string
  monthDuration: string; // BigInt as string

  // Price Information
  manualFloorPrice: string; // BigInt as string
  currentBreedCost: string; // BigInt as string

  // Activity Counters
  totalPings: number;
  totalBreeds: number;
  totalBurns: number;
  totalClaims: number;
  totalActivations: number;
  totalConfigChanges: number;
  totalAirdropsClaimed: number;
  totalAirdropAmount: string; // BigInt as string

  // Graveyard Info
  graveyardSize: string; // BigInt as string

  lastUpdated: string; // BigInt as string
}

export interface GlobalStats {
  id: string;
  totalBurns: number;
  totalClaimed: string; // BigInt as string
  totalPings: number;
  totalBreeds: number;
  totalActiveNFTs: number;
  totalInGraveyard: number;
  totalAirdropsClaimed: number;
  totalAirdropAmount: string; // BigInt as string
  lastUpdated: string; // BigInt as string
}

// GraphQL queries
const CONTRACT_STATS_QUERY = `
  query GetContractStats {
    contractStats(id: "contract") {
      id
      totalCRAABurned
      totalTokensBurned
      totalStars
      currentMonthlyPool
      currentLockedPool
      mainTreasury
      totalPoolRefills
      totalPoolTopUps
      lastMonthlyUnlock
      breedCostBps
      rewardRatePerSecond
      pingInterval
      maxAccumulationPeriod
      breedCooldown
      graveyardCooldown
      monthlyUnlockPercentage
      burnFeeBps
      monthDuration
      manualFloorPrice
      currentBreedCost
      totalPings
      totalBreeds
      totalBurns
      totalClaims
      totalActivations
      totalConfigChanges
      totalAirdropsClaimed
      totalAirdropAmount
      graveyardSize
      lastUpdated
    }
  }
`;

const GLOBAL_STATS_QUERY = `
  query GetGlobalStats {
    globalStats(id: "1") {
      id
      totalBurns
      totalClaimed
      totalPings
      totalBreeds
      totalActiveNFTs
      totalInGraveyard
      totalAirdropsClaimed
      totalAirdropAmount
      lastUpdated
    }
  }
`;

// Subgraph endpoint
const SUBGRAPH_URL =
  'https://api.studio.thegraph.com/query/111010/denis-2/v1.0.6';

// Hook for working with subgraph data
export const useSubgraphStats = () => {
  const [contractStats, setContractStats] = useState<ContractStats | null>(
    null
  );
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  // Function to execute GraphQL query
  const fetchGraphQL = async (query: string) => {
    try {
      const response = await fetch(SUBGRAPH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors.map((e: any) => e.message).join(', '));
      }

      return result.data;
    } catch (err) {
      throw err;
    }
  };

  // Load contract statistics
  const fetchContractStats = async () => {
    try {
      const data = await fetchGraphQL(CONTRACT_STATS_QUERY);
      setContractStats(data.contractStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Load global statistics
  const fetchGlobalStats = async () => {
    try {
      const data = await fetchGraphQL(GLOBAL_STATS_QUERY);
      setGlobalStats(data.globalStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Load all data
  const fetchAllStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([fetchContractStats(), fetchGlobalStats()]);
      setLastRefresh(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setIsLoading(false);
    }
  };

  // Update data
  const refresh = () => {
    fetchAllStats();
  };

  // Auto-load on mount
  useEffect(() => {
    fetchAllStats();
  }, []);

  // Auto-update every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllStats();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Helper functions for formatting
  const formatBigInt = (value: string | undefined) => {
    if (!value) return '0';
    return value;
  };

  const formatEther = (value: string | undefined) => {
    if (!value) return '0';
    // Convert wei to ether (divide by 10^18)
    const wei = BigInt(value);
    const ether = wei / BigInt(10 ** 18);
    const remainder = wei % BigInt(10 ** 18);

    if (remainder === BigInt(0)) {
      return ether.toString();
    } else {
      // For more precise display with decimal places
      return (Number(wei) / 10 ** 18).toFixed(6).replace(/\.?0+$/, '');
    }
  };

  const formatSeconds = (value: string | undefined) => {
    if (!value) return '0';
    const seconds = Number(value);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const formatTimestamp = (value: string | undefined) => {
    if (!value) return 'Never';
    const timestamp = Number(value) * 1000; // Convert to milliseconds
    return new Date(timestamp).toLocaleString();
  };

  return {
    // Data
    contractStats,
    globalStats,

    // State
    isLoading,
    error,
    lastRefresh,

    // Functions
    refresh,
    fetchContractStats,
    fetchGlobalStats,

    // Formatting utilities
    formatBigInt,
    formatEther,
    formatSeconds,
    formatTimestamp,

    // Quick access to frequently used data
    get totalCRAABurned() {
      return contractStats ? formatEther(contractStats.totalCRAABurned) : '0';
    },

    get totalTokensBurned() {
      return contractStats ? contractStats.totalTokensBurned : '0';
    },

    get totalStars() {
      return contractStats ? contractStats.totalStars : '0';
    },

    get currentMonthlyPool() {
      return contractStats
        ? formatEther(contractStats.currentMonthlyPool)
        : '0';
    },

    get currentLockedPool() {
      return contractStats ? formatEther(contractStats.currentLockedPool) : '0';
    },

    get graveyardSize() {
      return contractStats ? contractStats.graveyardSize : '0';
    },

    get currentBreedCost() {
      return contractStats ? formatEther(contractStats.currentBreedCost) : '0';
    },

    get pingIntervalFormatted() {
      return contractStats ? formatSeconds(contractStats.pingInterval) : '0';
    },

    get breedCooldownFormatted() {
      return contractStats ? formatSeconds(contractStats.breedCooldown) : '0';
    },
  };
};
