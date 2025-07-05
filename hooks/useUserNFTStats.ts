"use client"

import { useState, useEffect } from "react"
import { useAccount, useReadContract } from "wagmi"
import { TOKEN_CONTRACT_ADDRESS } from "@/config/wagmi"
import { tokenAbi } from "@/config/abis/tokenAbi"
import { formatEther } from "viem"
import { useAlchemyNfts } from "./useAlchemyNfts"
import type { UserNFTStats } from "@/types/nft"

export function useUserNFTStats() {
  const { address, isConnected } = useAccount()
  const { nfts } = useAlchemyNfts()
  const [stats, setStats] = useState<UserNFTStats>({
    totalOwned: 0,
    totalFrozen: 0,
    totalRewards: 0,
    estimatedValue: "0",
  })
  const [isLoading, setIsLoading] = useState(true)
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
    if (!isConnected) {
      setIsLoading(false)
      return
    }

    try {
      const totalOwned = nfts.length
      const totalFrozen = nfts.filter((nft) => nft.frozen).length
      const totalRewards = nfts.reduce((sum, nft) => sum + nft.rewardBalance, 0)

      // Оцениваем стоимость NFT на основе редкости
      const rarityValues = {
        Common: 10,
        Uncommon: 25,
        Rare: 50,
        Epic: 100,
        Legendary: 250,
        Mythic: 500,
      }

      const nftValue = nfts.reduce((sum, nft) => sum + rarityValues[nft.rarity], 0)
      const tokenValue = tokenBalance ? Number(formatEther(tokenBalance)) : 0
      const estimatedValue = (nftValue + tokenValue).toFixed(2)

      setStats({
        totalOwned,
        totalFrozen,
        totalRewards,
        estimatedValue,
      })

      setIsLoading(false)
    } catch (err) {
      console.error("Error updating user stats:", err)
      setError(err instanceof Error ? err : new Error("Failed to update user stats"))
      setIsLoading(false)
    }
  }, [nfts, tokenBalance, isConnected])

  // Для демонстрации, если нет подключения к кошельку, возвращаем моковые данные
  useEffect(() => {
    if (!isConnected && isLoading) {
      // Имитируем задержку загрузки данных
      const timer = setTimeout(() => {
        setStats({
          totalOwned: 1,
          totalFrozen: 0,
          totalRewards: 0,
          estimatedValue: "12535.99",
        })
        setIsLoading(false)
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [isConnected, isLoading])

  return {
    stats,
    isLoading,
    error,
  }
}
