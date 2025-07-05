"use client"

import { useState, useEffect } from "react"
import { useAccount, useReadContract } from "wagmi"
import { TOKEN_CONTRACT_ADDRESS } from "@/config/wagmi"
import { tokenAbi } from "@/config/abis/tokenAbi"
import { formatUnits } from "viem"
import { useNFTs } from "./useNFTs" // Используем исправленный безопасный хук
import type { UserNFTStats } from "@/types/nft"

export function useUserNFTStats() {
  const { address, isConnected } = useAccount()
  // Используем наш новый, безопасный хук для получения NFT
  const { nfts, isLoading: isNftsLoading } = useNFTs()
  
  const [stats, setStats] = useState<UserNFTStats>({
    totalOwned: 0,
    totalFrozen: 0,
    totalRewards: 0,
    estimatedValue: "0",
  })
  const [isLoading, setIsLoading] = useState(true) // Общий статус загрузки
  const [error, setError] = useState<Error | null>(null)

  // Получаем баланс токенов пользователя
  const { data: tokenBalance } = useReadContract({
    address: TOKEN_CONTRACT_ADDRESS,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  })

  // Обновляем статистику пользователя при изменении данных
  useEffect(() => {
    // Ждем, пока загрузятся и NFT, и баланс токенов
    if (isNftsLoading || !isConnected) {
      return
    }

    try {
      const totalOwned = nfts.length
      const totalFrozen = nfts.filter((nft) => nft.frozen).length
      // TODO: Заменить на реальные данные из контракта, когда они будут
      const totalRewards = nfts.reduce((sum, nft) => sum + (nft.rewardBalance || 0), 0)

      // --- ИСПРАВЛЕНИЕ БЕЗОПАСНОСТИ ---
      // УБИРАЕМ опасную оценку на основе метаданных NFT
      // Показываем только реальный баланс токенов
      
      const tokenValue = tokenBalance ? parseFloat(formatUnits(tokenBalance, 18)) : 0
      // В реальном приложении сюда нужно добавить стоимость NFT в токенах, 
      // полученную с API маркетплейса или из verified контракта
      const estimatedValue = tokenValue.toFixed(6) // Показываем только токены

      setStats({
        totalOwned,
        totalFrozen,
        totalRewards,
        estimatedValue, // Теперь это только токены, без фейковой оценки NFT
      })

      setIsLoading(false)
    } catch (err) {
      console.error("Error updating user stats:", err)
      setError(err instanceof Error ? err : new Error("Failed to update user stats"))
      setIsLoading(false)
    }
  }, [nfts, tokenBalance, isConnected, isNftsLoading])

  // Сбрасываем состояние, если кошелек отключен
  useEffect(() => {
    if (!isConnected) {
      // Очищаем статистику для неподключенных пользователей
      setStats({
        totalOwned: 0,
        totalFrozen: 0,
        totalRewards: 0,
        estimatedValue: "0",
      })
      setIsLoading(false)
      setError(null)
    }
  }, [isConnected])

  return {
    stats,
    isLoading,
    error,
  }
}
