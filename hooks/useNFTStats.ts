"use client"

import { useState, useEffect } from "react"
import { useReadContract } from "wagmi"
import { NFT_CONTRACT_ADDRESS, MAIN_CHAIN_ID } from "@/config/wagmi"
import crazyCubeUltimateAbi from "@/contracts/abi/CrazyCubeUltimate.json"
import { nftAbi } from "@/config/abis/nftAbi"
import { formatEther } from "viem"
import type { NFTStats } from "@/types/nft"

export function useNFTStats() {
  const [stats, setStats] = useState<NFTStats>({
    totalSupply: 0,
    burnedCount: 0,
    mintedCount: 0,
    inGraveyard: 0,
    burned24h: 0,
    minted24h: 0,
    bridged24h: 0,
    rewardPool: "0",
    monthlyUnlock: "0",
    totalValueLocked: "0",
    holders: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // totalSupply из ERC721 (NFT contract)
  const { data: totalSupply } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: nftAbi,
    functionName: "totalSupply",
    chainId: MAIN_CHAIN_ID,
  })

  // graveyard size и burnRewardPool из игрового контракта
  const gameAddress = (
    process.env.NEXT_PUBLIC_CRAZYCUBE_CONTRACT && process.env.NEXT_PUBLIC_CRAZYCUBE_CONTRACT !== "undefined"
      ? process.env.NEXT_PUBLIC_CRAZYCUBE_CONTRACT
      : "0x606a47707d5aEdaE9f616A6f1853fE3075bA740B"
  ) as `0x${string}`

  const { data: graveyardSize } = useReadContract({
    address: gameAddress,
    abi: crazyCubeUltimateAbi.abi ?? crazyCubeUltimateAbi,
    functionName: "totalBurned",
    chainId: MAIN_CHAIN_ID,
  })

  const { data: burnRewardPool } = useReadContract({
    address: gameAddress,
    abi: crazyCubeUltimateAbi.abi ?? crazyCubeUltimateAbi,
    functionName: "burnRewardPool",
    chainId: MAIN_CHAIN_ID,
  })

  // Обновляем статистику при изменении данных
  useEffect(() => {
    try {
      // Если данные загружены, обновляем статистику
      if (totalSupply !== undefined) {
        setStats((prev) => ({
          ...prev,
          totalSupply: totalSupply ? Number(totalSupply) : prev.totalSupply,
          burnedCount: 0,
          mintedCount: totalSupply ? Number(totalSupply) : 0,
          inGraveyard: graveyardSize ? Number(graveyardSize) : prev.inGraveyard,
          rewardPool: typeof burnRewardPool === "bigint" ? formatEther(burnRewardPool) : prev.rewardPool,
          monthlyUnlock: "0",
        }))
        setIsLoading(false)
      }
    } catch (err) {
      console.error("Error updating stats:", err)
      setError(err instanceof Error ? err : new Error("Failed to update stats"))
      setIsLoading(false)
    }
  }, [totalSupply, graveyardSize, burnRewardPool])

  // Инициализируем пустые статистики если данные не загружены
  useEffect(() => {
    if (isLoading && !totalSupply) {
      // Показываем пустые данные пока идет загрузка
      setStats({
        totalSupply: 0,
        burnedCount: 0,
        mintedCount: 0,
        inGraveyard: 0,
        burned24h: 0,
        minted24h: 0,
        bridged24h: 0,
        rewardPool: "0",
        monthlyUnlock: "0",
        totalValueLocked: "0",
        holders: 0,
      })
      setIsLoading(false)
    }
  }, [isLoading, totalSupply])

  return {
    stats,
    isLoading,
    error,
  }
}
