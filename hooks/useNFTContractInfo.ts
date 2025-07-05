import { useReadContract } from 'wagmi'
import { apeChain } from '../config/chains'
import { getRarityLabel, getRarityColor as rarityColor } from "@/lib/rarity"

// Адрес игрового контракта
const GAME_CONTRACT_ADDRESS = apeChain.contracts.gameProxy.address

// ABI для новых функций nftData и nftState
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
  const isValidId = tokenId !== undefined && /^\d+$/.test(tokenId)

  // Получаем статические данные NFT
  const { data: nftData, isLoading: isLoadingData, error: dataError, refetch: refetchData } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'nftData',
    args: isValidId ? [BigInt(tokenId!)] : undefined,
    query: { 
      enabled: isValidId,
      refetchInterval: 60000 // статические данные обновляем реже
    }
  })

  // Получаем динамические данные NFT
  const { data: nftState, isLoading: isLoadingState, error: stateError, refetch: refetchState } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'nftState',
    args: isValidId ? [BigInt(tokenId!)] : undefined,
    query: { 
      enabled: isValidId,
      // Обновляем каждые 30 секунд, так как звезды могут сгореть
      refetchInterval: 30000 
    }
  })

  const isLoading = isLoadingData || isLoadingState
  const error = dataError || stateError

  const refetch = () => {
    refetchData()
    refetchState()
  }

  // Парсим данные контракта
  const nftInfo: NFTContractInfo | null = (nftData && nftState) ? {
    static: {
      rarity: Number(nftData[0]),
      initialStars: Number(nftData[1]),
      isActivated: nftData[2]
    },
    dynamic: {
      currentStars: Number(nftState[0]),
      lockedCRA: nftState[1],
      lastPingTime: nftState[2],
      lastBreedTime: nftState[3],
      isInGraveyard: nftState[4]
    }
  } : null

  // Функции для удобства
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
    // Данные
    nftInfo,
    isLoading,
    error,
    refetch,

    // Утилиты
    getRarityText,
    getRarityColor,
    getRarityByStars,
    getColorByStars,
    getStarsBurnedCount,
    isNFTDead,

    // Удобные геттеры
    rarity: nftInfo?.static.rarity || 0,
    currentStars: nftInfo?.dynamic.currentStars || 0,
    initialStars: nftInfo?.static.initialStars || 0,
    isActivated: nftInfo?.static.isActivated || false,
    isInGraveyard: nftInfo?.dynamic.isInGraveyard || false,
    lockedCRA: nftInfo?.dynamic.lockedCRA || BigInt(0)
  }
}
