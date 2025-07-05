import { useEffect, useState } from "react"
import { usePublicClient } from "wagmi"
import { apeChain } from "@/config/chains"

const GAME_ADDR = apeChain.contracts.gameProxy.address as `0x${string}`

// ABI для проверки готовности кладбища
const GRAVEYARD_ABI = [
  {
    "inputs": [],
    "name": "totalBurned",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "index", "type": "uint256"}],
    "name": "graveyardTokens",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "burnRecords",
    "outputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "uint256", "name": "totalAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "claimAvailableTime", "type": "uint256"},
      {"internalType": "uint256", "name": "graveyardReleaseTime", "type": "uint256"},
      {"internalType": "bool", "name": "claimed", "type": "bool"},
      {"internalType": "uint8", "name": "waitPeriod", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export interface GraveyardReadiness {
  isReady: boolean
  readyTokens: string[]
  totalTokens: number
  timeUntilReady: number | null
  loading: boolean
  error: string | null
}

export function useGraveyardReadiness(): GraveyardReadiness {
  const [isReady, setIsReady] = useState(false)
  const [readyTokens, setReadyTokens] = useState<string[]>([])
  const [totalTokens, setTotalTokens] = useState(0)
  const [timeUntilReady, setTimeUntilReady] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const publicClient = usePublicClient()

  useEffect(() => {
    let mounted = true

    const checkGraveyardReadiness = async () => {
      if (!publicClient) {
        if (mounted) {
          setLoading(false)
          setError("No public client")
        }
        return
      }

      try {
        setError(null)
        setLoading(true)

        // Получаем общее количество сожженных NFT
        const totalBurned = await publicClient.readContract({
          address: GAME_ADDR,
          abi: GRAVEYARD_ABI,
          functionName: "totalBurned"
        }) as bigint

        const total = Number(totalBurned)
        setTotalTokens(total)

        if (total === 0) {
          if (mounted) {
            setIsReady(false)
            setReadyTokens([])
            setTimeUntilReady(null)
            setLoading(false)
          }
          return
        }

        // Проверяем первые 50 токенов на готовность (для производительности)
        const maxCheck = Math.min(total, 50)
        const now = Math.floor(Date.now() / 1000)
        let readyCount = 0
        let earliestReadyTime: number | null = null

        for (let i = 0; i < maxCheck; i++) {
          try {
            // Получаем tokenId из кладбища
            const tokenId = await publicClient.readContract({
              address: GAME_ADDR,
              abi: GRAVEYARD_ABI,
              functionName: "graveyardTokens",
              args: [BigInt(i)]
            }) as bigint

            if (tokenId > 0n) {
              // Получаем запись о сжигании
              const burnRecord = await publicClient.readContract({
                address: GAME_ADDR,
                abi: GRAVEYARD_ABI,
                functionName: "burnRecords",
                args: [tokenId]
              }) as any

              const graveyardReleaseTime = Number(burnRecord.graveyardReleaseTime || burnRecord[3])
              
              if (graveyardReleaseTime <= now) {
                readyCount++
                if (readyCount <= 10) { // Ограничиваем количество готовых токенов
                  setReadyTokens(prev => [...prev, tokenId.toString()])
                }
              } else {
                if (earliestReadyTime === null || graveyardReleaseTime < earliestReadyTime) {
                  earliestReadyTime = graveyardReleaseTime
                }
              }
            }
          } catch (err) {
            console.warn(`Error checking token at index ${i}:`, err)
          }
        }

        if (mounted) {
          setIsReady(readyCount > 0)
          setTimeUntilReady(earliestReadyTime ? earliestReadyTime - now : null)
          setLoading(false)
        }

      } catch (err: any) {
        console.error("Error checking graveyard readiness:", err)
        if (mounted) {
          setError(err?.message || "Failed to check graveyard")
          setLoading(false)
        }
      }
    }

    checkGraveyardReadiness()

    // Проверяем каждые 30 секунд
    const interval = setInterval(checkGraveyardReadiness, 30000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [publicClient])

  return {
    isReady,
    readyTokens,
    totalTokens,
    timeUntilReady,
    loading,
    error
  }
} 