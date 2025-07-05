"use client"

import { useState, useEffect } from 'react'

/**
 * Interface for comprehensive subgraph statistics
 */
export interface SubgraphStats {
  id: string
  
  // Core Statistics from Contract Events
  totalCRABurned: string // BigInt as string
  totalTokensBurned: string // BigInt as string
  totalStars: string // BigInt as string
  
  // Pool Information
  currentMonthlyPool: string // BigInt as string
  currentLockedPool: string // BigInt as string
  mainTreasury: string // BigInt as string
  totalPoolRefills: string // BigInt as string
  totalPoolTopUps: string // BigInt as string
  lastMonthlyUnlock: string // BigInt as string
  
  // Game Configuration (from events)
  breedCostBps: string // BigInt as string
  rewardRatePerSecond: string // BigInt as string
  pingInterval: string // BigInt as string (in seconds)
  maxAccumulationPeriod: string // BigInt as string
  breedCooldown: string // BigInt as string (in seconds)
  graveyardCooldown: string // BigInt as string
  monthlyUnlockPercentage: string // BigInt as string
  burnFeeBps: string // BigInt as string
  monthDuration: string // BigInt as string
  
  // Price Information
  manualFloorPrice: string // BigInt as string
  currentBreedCost: string // BigInt as string
  
  // Activity Counters (event-based)
  totalPings: number
  totalBreeds: number
  totalBurns: number
  totalClaims: number
  totalActivations: number
  totalConfigChanges: number
  totalAirdropsClaimed: number
  totalAirdropAmount: string // BigInt as string
  
  // Graveyard Info
  graveyardSize: string // BigInt as string
  
  lastUpdated: string // BigInt as string
}

/**
 * Global activity statistics from subgraph
 */
export interface GlobalActivityStats {
  id: string
  totalBurns: number
  totalClaimed: string // BigInt as string
  totalPings: number
  totalBreeds: number
  totalActiveNFTs: number
  totalInGraveyard: number
  totalAirdropsClaimed: number
  totalAirdropAmount: string // BigInt as string
  lastUpdated: string // BigInt as string
}

/**
 * CRA token statistics from subgraph
 */
export interface CRATokenStats {
  id: string
  totalSupply: string // BigInt as string
  deadBalance: string // BigInt as string
  lastUpdated: string
}

// GraphQL queries
const SUBGRAPH_STATS_QUERY = `
  query GetSubgraphStats {
    contractStats(id: "contract") {
      id
      totalCRABurned
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
`

const GLOBAL_ACTIVITY_QUERY = `
  query GetGlobalActivity {
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
`

const CRA_TOKEN_QUERY = `
  query GetCRAToken {
    craStats(id: "1") {
      id
      totalSupply
      deadBalance
      lastUpdated
    }
  }
`

// Subgraph endpoint
const SUBGRAPH_URL = "https://api.studio.thegraph.com/query/111010/denis-2/v1.0.6"

/**
 * Consolidated subgraph data hook
 * 
 * This hook replaces useSubgraphStats and provides a unified interface
 * for all subgraph-based statistics and historical data.
 * 
 * @returns {object} Subgraph statistics and utility functions
 */
export const useSubgraphData = () => {
  const [contractStats, setContractStats] = useState<SubgraphStats | null>(null)
  const [globalStats, setGlobalStats] = useState<GlobalActivityStats | null>(null)
  const [craStats, setCraStats] = useState<CRATokenStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<number>(0)

  // Function to execute GraphQL query
  const fetchGraphQL = async (query: string) => {
    try {
      const response = await fetch(SUBGRAPH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.errors) {
        throw new Error(result.errors.map((e: any) => e.message).join(', '))
      }

      return result.data
    } catch (err) {
      console.error('GraphQL fetch error:', err)
      throw err
    }
  }

  // Fetch contract statistics
  const fetchContractStats = async () => {
    try {
      const data = await fetchGraphQL(SUBGRAPH_STATS_QUERY)
      setContractStats(data.contractStats)
    } catch (err) {
      console.error('Error fetching contract stats:', err)
      throw err
    }
  }

  // Fetch global activity statistics
  const fetchGlobalStats = async () => {
    try {
      const data = await fetchGraphQL(GLOBAL_ACTIVITY_QUERY)
      setGlobalStats(data.globalStats)
    } catch (err) {
      console.error('Error fetching global stats:', err)
      throw err
    }
  }

  // Fetch CRA token statistics
  const fetchCRAStats = async () => {
    try {
      const data = await fetchGraphQL(CRA_TOKEN_QUERY)
      setCraStats(data.craStats)
    } catch (err) {
      console.error('Error fetching CRA stats:', err)
      throw err
    }
  }

  // Fetch all statistics
  const fetchAllStats = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Fetching subgraph data...')
      await Promise.all([
        fetchContractStats(),
        fetchGlobalStats(),
        fetchCRAStats()
      ])
      setLastRefresh(Date.now())
      console.log('✅ Subgraph data loaded successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subgraph stats'
      setError(errorMessage)
      console.error('❌ Subgraph data error:', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchAllStats()
  }, [])

  // Auto-refresh every 3 minutes (subgraph data updates less frequently)
  useEffect(() => {
    const interval = setInterval(fetchAllStats, 180000)
    return () => clearInterval(interval)
  }, [])

  // Utility functions
  const formatNumber = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatSeconds = (seconds: string) => {
    const secs = parseInt(seconds)
    const hours = Math.floor(secs / 3600)
    const minutes = Math.floor((secs % 3600) / 60)
    const remainingSeconds = secs % 60
    
    if (hours > 0) return `${hours}h ${minutes}m ${remainingSeconds}s`
    if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
    return `${remainingSeconds}s`
  }

  const formatBPS = (bps: string) => {
    const percentage = (parseInt(bps) / 100).toFixed(2)
    return `${percentage}%`
  }

  return {
    // Data
    contractStats,
    globalStats,
    craStats,
    
    // State
    isLoading,
    error,
    lastRefresh,
    
    // Actions
    refresh: fetchAllStats,
    refreshContract: fetchContractStats,
    refreshGlobal: fetchGlobalStats,
    refreshCRA: fetchCRAStats,
    
    // Utility functions
    formatNumber,
    formatSeconds,
    formatBPS,
    
    // Convenience getters for backward compatibility
    get totalActivityEvents() {
      return (globalStats?.totalPings ?? 0) + 
             (globalStats?.totalBreeds ?? 0) + 
             (globalStats?.totalBurns ?? 0)
    },
    
    get totalValueLocked() {
      return contractStats?.currentLockedPool ?? '0'
    },
    
    get averageActivityPerDay() {
      if (!contractStats) return 0
      const daysRunning = Math.max(1, Math.floor((Date.now() - parseInt(contractStats.lastUpdated) * 1000) / (1000 * 60 * 60 * 24)))
      return Math.round(this.totalActivityEvents / daysRunning)
    }
  }
}
