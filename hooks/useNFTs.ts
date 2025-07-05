"use client"

import { useState, useEffect } from "react"
import { useAccount, useReadContract } from "wagmi"
import { NFT_CONTRACT_ADDRESS } from "@/config/wagmi"
import { nftAbi } from "@/config/abis/nftAbi"
import type { NFT, NFTMetadata } from "@/types/nft"

export function useNFTs() {
  const { address, isConnected } = useAccount()
  const [nfts, setNfts] = useState<NFT[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Получаем баланс NFT пользователя
  const { data: balanceData } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: nftAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  })

  // Получаем токены пользователя
  useEffect(() => {
    const fetchNFTs = async () => {
      if (!address || !isConnected || !balanceData) return

      setIsLoading(true)
      setError(null)

      try {
        const balance = Number(balanceData)
        const tokenIds: number[] = []

        // Получаем ID токенов пользователя
        for (let i = 0; i < balance; i++) {
          try {
            const tokenId = await fetchTokenOfOwnerByIndex(address, BigInt(i))
            if (tokenId) tokenIds.push(Number(tokenId))
          } catch (err) {
            console.error("Error fetching token ID:", err)
          }
        }

        // Получаем метаданные для каждого токена
        const nftPromises = tokenIds.map(async (tokenId) => {
          try {
            const tokenURI = await fetchTokenURI(tokenId)
            const metadata = await fetchMetadata(tokenURI)

            return {
              id: `${tokenId}`,
              tokenId,
              name: metadata.name,
              image: metadata.image,
              rarity: determineRarity(metadata.attributes),
              attributes: metadata.attributes,
              rewardBalance: Math.floor(Math.random() * 100), // Заглушка, в реальности получаем из контракта
              frozen: Math.random() > 0.7, // Заглушка, в реальности получаем из контракта
            } as NFT
          } catch (err) {
            console.error(`Error fetching metadata for token ${tokenId}:`, err)
            return null
          }
        })

        const fetchedNFTs = (await Promise.all(nftPromises)).filter((nft): nft is NFT => nft !== null)
        setNfts(fetchedNFTs)
      } catch (err) {
        console.error("Error fetching NFTs:", err)
        setError(err instanceof Error ? err : new Error("Failed to fetch NFTs"))
      } finally {
        setIsLoading(false)
      }
    }

    fetchNFTs()
  }, [address, isConnected, balanceData])

  // Вспомогательные функции
  const fetchTokenOfOwnerByIndex = async (owner: string, index: bigint): Promise<bigint | null> => {
    try {
      const result = await fetch(`/api/nft/tokenOfOwnerByIndex?owner=${owner}&index=${index}`)
      const data = await result.json()
      return BigInt(data.tokenId)
    } catch (err) {
      console.error("Error fetching token by index:", err)
      return null
    }
  }

  const fetchTokenURI = async (tokenId: number): Promise<string> => {
    try {
      const result = await fetch(`/api/nft/tokenURI?tokenId=${tokenId}`)
      const data = await result.json()
      return data.tokenURI
    } catch (err) {
      console.error("Error fetching token URI:", err)
      return ""
    }
  }

  const fetchMetadata = async (tokenURI: string): Promise<NFTMetadata> => {
    try {
      // Если URI начинается с ipfs://, преобразуем его в HTTP URL
      const url = tokenURI.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${tokenURI.slice(7)}` : tokenURI

      const response = await fetch(url)
      return await response.json()
    } catch (err) {
      console.error("Error fetching metadata:", err)
      return {
        name: "Unknown NFT",
        description: "Metadata could not be loaded",
        image: "/placeholder.svg",
        attributes: [],
      }
    }
  }

  const determineRarity = (attributes: { trait_type: string; value: string | number }[]): NFT["rarity"] => {
    // Логика определения редкости на основе атрибутов
    const rarityAttribute = attributes.find((attr) => attr.trait_type.toLowerCase() === "rarity")
    if (rarityAttribute) {
      const value = String(rarityAttribute.value).toLowerCase()
      if (value.includes("common")) return "Common"
      if (value.includes("uncommon")) return "Uncommon"
      if (value.includes("rare")) return "Rare"
      if (value.includes("epic")) return "Epic"
      if (value.includes("legendary")) return "Legendary"
      if (value.includes("mythic")) return "Mythic"
    }

    // Если атрибут редкости не найден, используем случайное значение
    const rarities: NFT["rarity"][] = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"]
    const weights = [50, 30, 15, 3, 1.5, 0.5] // Вероятности в процентах
    const random = Math.random() * 100

    let cumulativeWeight = 0
    for (let i = 0; i < rarities.length; i++) {
      cumulativeWeight += weights[i]
      if (random <= cumulativeWeight) {
        return rarities[i]
      }
    }

    return "Common"
  }

  // Для демонстрации, если нет подключения к кошельку, возвращаем моковые данные
  useEffect(() => {
    if (!isConnected) {
      // Генерируем моковые NFT для демонстрации
      const mockNFTs: NFT[] = Array.from({ length: 8 }, (_, i) => ({
        id: `mock-${i + 1}`,
        tokenId: 1000 + i,
        name: `CrazyCube #${1000 + i}`,
        image: `/images/cube${(i % 8) + 1}.png`,
        rarity: ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"][
          Math.floor(Math.random() * 6)
        ] as NFT["rarity"],
        attributes: [
          { trait_type: "Background", value: ["Blue", "Red", "Green", "Purple"][Math.floor(Math.random() * 4)] },
          { trait_type: "Eyes", value: ["Happy", "Sad", "Angry", "Surprised"][Math.floor(Math.random() * 4)] },
          { trait_type: "Mouth", value: ["Smile", "Frown", "Open", "Closed"][Math.floor(Math.random() * 4)] },
        ],
        rewardBalance: Math.floor(Math.random() * 100),
        frozen: Math.random() > 0.7,
      }))

      setNfts(mockNFTs)
    }
  }, [isConnected])

  return {
    nfts,
    isLoading,
    error,
  }
}
