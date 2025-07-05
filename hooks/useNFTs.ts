"use client"

import { useState, useEffect } from "react"
import { useAccount, useReadContract, useReadContracts } from "wagmi"
import { NFT_CONTRACT_ADDRESS } from "@/config/wagmi"
import { nftAbi } from "@/config/abis/nftAbi"
import type { NFT, NFTMetadata } from "@/types/nft"

export function useNFTs() {
  const { address, isConnected, chain } = useAccount()
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
    const controller = new AbortController()
    const signal = controller.signal

    const fetchNFTs = async () => {
      if (!address || !isConnected || balanceData === undefined) {
        if (!isConnected) setNfts([]) // Очищаем NFT если кошелек отключен
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const balance = Number(balanceData)
        if (balance === 0) {
          setNfts([])
          setIsLoading(false)
          return
        }

        // 1. Получаем все ID токенов пользователя одним батч-запросом
        const tokenOfOwnerByIndexContracts = Array.from({ length: balance }, (_, i) => ({
          address: NFT_CONTRACT_ADDRESS,
          abi: nftAbi,
          functionName: "tokenOfOwnerByIndex",
          args: [address, BigInt(i)],
        }))

        const tokenIdsResults = await readContracts({ contracts: tokenOfOwnerByIndexContracts })
        const tokenIds = tokenIdsResults.map(r => r.result as bigint).filter(Boolean)

        // 2. Получаем все tokenURI одним батч-запросом
        const tokenURIContracts = tokenIds.map(tokenId => ({
          address: NFT_CONTRACT_ADDRESS,
          abi: nftAbi,
          functionName: "tokenURI",
          args: [tokenId],
        }))

        const tokenURIResults = await readContracts({ contracts: tokenURIContracts })
        const tokenURIs = tokenURIResults.map(r => r.result as string).filter(Boolean)

        // 3. Загружаем метаданные
        const nftPromises = tokenURIs.map((tokenURI, index) =>
          fetchMetadata(tokenURI, Number(tokenIds[index]), signal)
        )

        const fetchedNFTs = (await Promise.all(nftPromises)).filter(
          (nft): nft is NFT => nft !== null
        )
        setNfts(fetchedNFTs)
      } catch (err) {
        console.error("Error fetching NFTs:", err)
        if (!signal.aborted) {
          setError(err instanceof Error ? err : new Error("Failed to fetch NFTs"))
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    fetchNFTs()

    // Отменяем запросы при уходе со страницы
    return () => {
      controller.abort()
    }
  }, [address, isConnected, balanceData, chain]) // Добавляем chain в зависимости

  // Используем useReadContracts для батчинга
  const { readContracts } = useReadContracts()

  const fetchMetadata = async (tokenURI: string, tokenId: number, signal: AbortSignal): Promise<NFT | null> => {
    try {
      // Если URI начинается с ipfs://, преобразуем его в HTTP URL
      const url = tokenURI.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${tokenURI.slice(7)}` : tokenURI

      // Проверяем, что URL безопасен (базовая проверка)
      if (!url.startsWith('https://') && !url.startsWith('http://localhost')) { // localhost для тестов
        console.warn(`Skipping insecure metadata URL for token ${tokenId}: ${url}`)
        return null
      }

      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error(`Failed to fetch metadata: ${response.statusText}`)
      const metadata: NFTMetadata = await response.json()

      return {
        id: `${tokenId}`,
        tokenId,
        name: metadata.name,
        image: metadata.image, // В идеале, это изображение тоже нужно проксировать и санировать
        rarity: determineRarity(metadata.attributes),
        attributes: metadata.attributes,
        rewardBalance: 0,
        frozen: false,
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error(`Error fetching metadata for token ${tokenId}:`, err)
      }
      return null
    }
  }

  const determineRarity = (attributes: { trait_type: string; value: string | number }[]): NFT["rarity"] => {
    // --- ИСПРАВЛЕНИЕ БЕЗОПАСНОСТИ ---
    // НЕЛЬЗЯ доверять метаданным NFT для определения редкости!
    // Злоумышленник может указать любую редкость в своих метаданных.
    // 
    // В продакшене здесь должна быть логика:
    // 1. Проверка tokenId в whitelist verified NFT
    // 2. Получение редкости из verified smart contract
    // 3. Или API, которое проверяет подлинность NFT
    
    // Пока что для безопасности возвращаем "Common" для всех NFT
    // и выводим предупреждение в консоль
    
    console.warn("⚠️ SECURITY WARNING: Rarity determination from metadata is unsafe!")
    console.warn("This could be exploited by malicious NFTs with fake rarity attributes.")
    console.warn("In production, verify rarity from trusted smart contract or API.")
    
    // TODO: Заменить на проверенный источник редкости
    return "Common" // Безопасное значение по умолчанию
  }

  return {
    nfts,
    isLoading,
    error,
  }
}
