"use client"

import { useState, useEffect } from 'react'

// Интерфейсы для данных из subgraph
export interface ContractStats {
  id: string
  
  // Core Statistics from Contract
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
  
  // Game Configuration
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
  
  // Activity Counters
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

export interface GlobalStats {
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

// GraphQL запросы
const CONTRACT_STATS_QUERY = `
  query GetContractStats {
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
`

// Subgraph endpoint
const SUBGRAPH_URL = "https://api.studio.thegraph.com/query/111010/denis-2/v1.0.6"

// Хук для работы с subgraph данными
export const useSubgraphStats = () => {
  const [contractStats, setContractStats] = useState<ContractStats | null>(null)
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<number>(0)

  // Функция для выполнения GraphQL запроса
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

  // Загрузка статистики контракта
  const fetchContractStats = async () => {
    try {
      const data = await fetchGraphQL(CONTRACT_STATS_QUERY)
      setContractStats(data.contractStats)
    } catch (err) {
      console.error('Error fetching contract stats:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Загрузка глобальной статистики
  const fetchGlobalStats = async () => {
    try {
      const data = await fetchGraphQL(GLOBAL_STATS_QUERY)
      setGlobalStats(data.globalStats)
    } catch (err) {
      console.error('Error fetching global stats:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  // Загрузка всех данных
  const fetchAllStats = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      await Promise.all([
        fetchContractStats(),
        fetchGlobalStats()
      ])
      setLastRefresh(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats')
    } finally {
      setIsLoading(false)
    }
  }

  // Обновление данных
  const refresh = () => {
    fetchAllStats()
  }

  // Автоматическая загрузка при монтировании
  useEffect(() => {
    fetchAllStats()
  }, [])

  // Автоматическое обновление каждые 30 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllStats()
    }, 30000) // 30 секунд

    return () => clearInterval(interval)
  }, [])

  // Вспомогательные функции для форматирования
  const formatBigInt = (value: string | undefined) => {
    if (!value) return '0'
    return value
  }

  const formatEther = (value: string | undefined) => {
    if (!value) return '0'
    // Конвертируем wei в ether (делим на 10^18)
    const wei = BigInt(value)
    const ether = wei / BigInt(10 ** 18)
    const remainder = wei % BigInt(10 ** 18)
    
    if (remainder === BigInt(0)) {
      return ether.toString()
    } else {
      // Для более точного отображения с десятичными знаками
      return (Number(wei) / 10 ** 18).toFixed(6).replace(/\.?0+$/, '')
    }
  }

  const formatSeconds = (value: string | undefined) => {
    if (!value) return '0'
    const seconds = Number(value)
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    return `${Math.floor(seconds / 86400)}d`
  }

  const formatTimestamp = (value: string | undefined) => {
    if (!value) return 'Never'
    const timestamp = Number(value) * 1000 // Convert to milliseconds
    return new Date(timestamp).toLocaleString()
  }

  return {
    // Данные
    contractStats,
    globalStats,
    
    // Состояние
    isLoading,
    error,
    lastRefresh,
    
    // Функции
    refresh,
    fetchContractStats,
    fetchGlobalStats,
    
    // Утилиты форматирования
    formatBigInt,
    formatEther,
    formatSeconds,
    formatTimestamp,
    
    // Быстрый доступ к часто используемым данным
    get totalCRABurned() {
      return contractStats ? formatEther(contractStats.totalCRABurned) : '0'
    },
    
    get totalTokensBurned() {
      return contractStats ? contractStats.totalTokensBurned : '0'
    },
    
    get totalStars() {
      return contractStats ? contractStats.totalStars : '0'
    },
    
    get currentMonthlyPool() {
      return contractStats ? formatEther(contractStats.currentMonthlyPool) : '0'
    },
    
    get currentLockedPool() {
      return contractStats ? formatEther(contractStats.currentLockedPool) : '0'
    },
    
    get graveyardSize() {
      return contractStats ? contractStats.graveyardSize : '0'
    },
    
    get currentBreedCost() {
      return contractStats ? formatEther(contractStats.currentBreedCost) : '0'
    },
    
    get pingIntervalFormatted() {
      return contractStats ? formatSeconds(contractStats.pingInterval) : '0'
    },
    
    get breedCooldownFormatted() {
      return contractStats ? formatSeconds(contractStats.breedCooldown) : '0'
    }
  }
} 