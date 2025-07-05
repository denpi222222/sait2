import { usePublicClient } from 'wagmi'
import { apeChain } from '../config/chains'
import { useState, useEffect, useCallback } from 'react'
import { getRarityLabel, getRarityColor as rarityColor } from "@/lib/rarity"

// Game contract address
const GAME_CONTRACT_ADDRESS = apeChain.contracts.gameProxy.address

// ABI for new functions nftData and nftState
const GAME_CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "nftData",
    "outputs": [
      {"internalType": "uint8", "name": "rarity", "type": "uint8"},
      {"internalType": "uint8", "name": "initialStars", "type": "uint8"},
      {"internalType": "bool", "name": "isActivated", "type": "bool"}
        ],
    "stateMutability": "view",
    "type": "function"
      },
      {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "nftState",
    "outputs": [
      {"internalType": "uint8", "name": "currentStars", "type": "uint8"},
      {"internalType": "uint256", "name": "lockedCRA", "type": "uint256"},
      {"internalType": "uint256", "name": "lastPingTime", "type": "uint256"},
      {"internalType": "uint256", "name": "lastBreedTime", "type": "uint256"},
      {"internalType": "bool", "name": "isInGraveyard", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export interface NFTStaticInfo {
  rarity: number
  initialStars: number
  isActivated: boolean
}

export interface NFTDynamicInfo {
  currentStars: number
  lockedCRA: bigint
  lastPingTime: bigint
  lastBreedTime: bigint
  isInGraveyard: boolean
}

export interface NFTContractInfo {
  static: NFTStaticInfo
  dynamic: NFTDynamicInfo
}

export function useNFTContractInfo(tokenId: string | undefined) {
  const publicClient = usePublicClient()
  const [nftInfo, setNftInfo] = useState<NFTContractInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    const isValidId = tokenId !== undefined && /^\d+$/.test(tokenId)
    if (!publicClient || !isValidId) {
      if (isValidId) setIsLoading(true) // Show loading if ID exists but client is not ready yet
      else setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Call data reading directly to bypass automatic multicall from wagmi
      const nftDataPromise = publicClient.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'nftData',
        args: [BigInt(tokenId!)],
      })

      const nftStatePromise = publicClient.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'nftState',
        args: [BigInt(tokenId!)],
      })

      const [nftData, nftState] = await Promise.all([nftDataPromise, nftStatePromise])

      const parsedInfo: NFTContractInfo = {
        static: {
          rarity: Number(nftData[0]),
          initialStars: Number(nftData[1]),
          isActivated: nftData[2],
        },
        dynamic: {
          currentStars: Number(nftState[0]),
          lockedCRA: nftState[1],
          lastPingTime: nftState[2],
          lastBreedTime: nftState[3],
          isInGraveyard: nftState[4],
        },
      }
      setNftInfo(parsedInfo)
    } catch (e) {
      console.error(`Failed to fetch contract info for token ${tokenId}:`, e)
      setError(e as Error)
      setNftInfo(null)
    } finally {
      setIsLoading(false)
    }
  }, [tokenId, publicClient])

  useEffect(() => {
    fetchData()
    // Set up interval for periodic data updates
    const intervalId = setInterval(fetchData, 30000) // Update every 30 seconds
    return () => clearInterval(intervalId)
  }, [fetchData])

  const refetch = useCallback(() => {
    // Don't reset data, just start loading again
    void fetchData()
  }, [fetchData])

  // Functions for convenience
  const getRarityText = getRarityLabel
  const getRarityColor = rarityColor

  const getRarityByStars = (stars: number): string => {
    const map = ['Common','Uncommon','Rare','Epic','Legendary','Mythic']
    return map[Math.min(Math.max(stars,1),6)-1]
  }

  const getColorByStars = (stars:number): string => {
    switch(stars){
      case 6: return 'bg-red-500'
      case 5: return 'bg-orange-500'
      case 4: return 'bg-purple-500'
      case 3: return 'bg-blue-500'
      case 2: return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getStarsBurnedCount = (): number => {
    if (!nftInfo) return 0
    return nftInfo.static.initialStars - nftInfo.dynamic.currentStars
  }

  const isNFTDead = (): boolean => {
    return nftInfo?.dynamic.currentStars === 0 || nftInfo?.dynamic.isInGraveyard || false
  }

  return {
    // Data
    nftInfo,
    isLoading,
    error,
    refetch,

    // Utilities
    getRarityText,
    getRarityColor,
    getRarityByStars,
    getColorByStars,
    getStarsBurnedCount,
    isNFTDead,

    // Convenient getters
    rarity: nftInfo?.static.rarity || 0,
    currentStars: nftInfo?.dynamic.currentStars || 0,
    initialStars: nftInfo?.static.initialStars || 0,
    isActivated: nftInfo?.static.isActivated || false,
    isInGraveyard: nftInfo?.dynamic.isInGraveyard || false,
    lockedCRA: nftInfo?.dynamic.lockedCRA || BigInt(0)
  }
}
