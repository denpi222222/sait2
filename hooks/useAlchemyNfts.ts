"use client"

import { useEffect, useState } from "react"
import { useAccount, usePublicClient } from "wagmi"
import { labelToIndex, getRarityLabel } from "@/lib/rarity"
import { alchemyFetch } from "@/lib/alchemyFetch"
import { resolveIpfsUrl } from "@/lib/ipfs"
import { hexToDecimal } from "./useUserNFTs"
import rarityList from "@/public/cube_rarity.json"
import { apeChain } from "@/config/chains"

interface AlchemyNft {
  contract: { address: string }
  tokenId: string
  tokenType: string
  name?: string
  description?: string
  image?: {
    originalUrl?: string
    pngUrl?: string
    cachedUrl?: string
  }
  media?: Array<{ gateway?: string; raw?: string }>
  raw?: {
    metadata?: {
      name?: string
      description?: string
      image?: string
      attributes?: Array<{
        trait_type: string
        value: string | number
      }>
    }
  }
}

// Quick lookup table: tokenId -> rarity index (1-6)
const rarityMap: Record<number, number> = {}
;(rarityList as Array<{ tokenId: number; rarity: number }>).forEach(entry => {
  rarityMap[entry.tokenId] = entry.rarity
})

// Use addresses from config/chains.ts instead of hardcoded values
const CRAZYCUBE_ADDR = apeChain.contracts.crazyCubeNFT.address
const GAME_ADDRESS = apeChain.contracts.gameProxy.address

export function useAlchemyNfts() {
  const { address, isConnected } = useAccount()
  const [nfts, setNfts] = useState<import("@/types/nft").NFT[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const publicClient = usePublicClient()
  
  const GAME_ABI_MIN = [
    {
      "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
      "name": "nftState",
      "outputs": [
        { "internalType": "uint8", "name": "currentStars", "type": "uint8" },
        { "internalType": "uint256", "name": "lockedCRA", "type": "uint256" },
        { "internalType": "uint256", "name": "lastPingTime", "type": "uint256" },
        { "internalType": "uint256", "name": "lastBreedTime", "type": "uint256" },
        { "internalType": "bool", "name": "isInGraveyard", "type": "bool" }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ] as const

  const fetchNfts = async () => {
    if (!isConnected || !address) {
      setNfts([])
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      // 🛡️ WHALE PROTECTION: Fetch NFTs with pagination to prevent DoS attacks on large holders
      await fetchNftsWithPagination()
    } catch (e) {
      console.error('Alchemy fetch error', e)
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchNftsWithPagination = async () => {
    let allNFTs: import("@/types/nft").NFT[] = []
    let pageKey: string | undefined = undefined
    const PAGE_SIZE = 100 // Alchemy's recommended page size
    let pageCount = 0
    const MAX_PAGES = 20 // Protection against infinite loops (max 2000 NFTs)

    do {
      pageCount++
      if (pageCount > MAX_PAGES) {
        console.warn(`Reached maximum page limit (${MAX_PAGES}) for user ${address}`)
        break
      }

      // Primary attempt: Alchemy NFT API with pagination
      try {
        let queryPath = `/getNFTsForOwner?owner=${address}&contractAddresses[]=${CRAZYCUBE_ADDR}&limit=${PAGE_SIZE}`
        if (pageKey) {
          queryPath += `&pageKey=${encodeURIComponent(pageKey)}`
        }

        const response = await alchemyFetch('nft', queryPath, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json()
          pageKey = data.pageKey
          
          const items: import("@/types/nft").NFT[] = (data.ownedNfts as AlchemyNft[]).map((nft: AlchemyNft) => {
            let tokenIdDec: number
            const metadata = nft.raw?.metadata
            const idFromNameMatch = (metadata?.name || nft.name || "").match(/#(\d+)/)
            tokenIdDec = idFromNameMatch ? Number(idFromNameMatch[1]) : Number(hexToDecimal(nft.tokenId) || 0)

            return {
              id: `${tokenIdDec}`,
              tokenId: tokenIdDec,
              name: metadata?.name || nft.name || `CrazyCube #${tokenIdDec}`,
              image: (() => {
                let img = metadata?.image 
                  || nft.image?.cachedUrl 
                  || nft.image?.originalUrl 
                  || (nft.media && nft.media.length ? nft.media[0].gateway : '')
                  || '/favicon.ico';
                return resolveIpfsUrl(img)
              })(),
              attributes: metadata?.attributes || [],
              rewardBalance: 0,
              frozen: false,
              stars: 0, // Safe default value. Real stars will be loaded from contract.
            }
          })
          
          // Try to enrich NFTs that lack images
          const enriched = await Promise.all(items.map(async (item) => {
            // Skip if image already exists and isn't favicon
            if (item.image && item.image !== '/favicon.ico') return item
            
            try {
              const metaPath = `/getNFTMetadata?contractAddress=${CRAZYCUBE_ADDR}&tokenId=${item.tokenId}`
              const metaRes = await alchemyFetch('nft', metaPath, { method: 'GET' })
              if (!metaRes.ok) throw new Error('Failed to fetch metadata')
              
              const meta = await metaRes.json()
              if (meta.media && meta.media.length > 0) {
                item.image = meta.media[0].gateway || meta.media[0].raw || item.image
              }
              if (meta.rawMetadata?.image) {
                item.image = meta.rawMetadata.image
              }
              
              item.image = resolveIpfsUrl(item.image) || item.image
            } catch (e) {
              console.warn('Metadata enrichment failed for token', item.tokenId, e)
            }
            
            return item
          }))
          
          setNfts(enriched)

          // 🔄 ENHANCED VALIDATION: Get game state but don't filter out graveyard NFTs
          if (publicClient) {
            const enrichedWithGameState = await Promise.all(enriched.map(async (item) => {
              try {
                // Check ownership first
                const nftAddr: `0x${string}` = CRAZYCUBE_ADDR as `0x${string}`
                const owner: `0x${string}` = await publicClient.readContract({
                  address: nftAddr,
                  abi: [{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}],
                  functionName: "ownerOf",
                  args: [BigInt(item.tokenId)]
                }) as `0x${string}`
                
                if (owner.toLowerCase() !== address!.toLowerCase()) {
                  return null // Only filter if not owned
                }

                // Get game state to mark graveyard status
                const state: any = await publicClient.readContract({
                  address: GAME_ADDRESS,
                  abi: GAME_ABI_MIN,
                  functionName: "nftState",
                  args: [BigInt(item.tokenId)]
                })
                
                // Update item with game state info
                const isInGraveyard = state[4] as boolean
                const currentStars = state[0] as number
                
                return {
                  ...item,
                  frozen: isInGraveyard, // Mark graveyard NFTs as frozen
                  stars: currentStars || item.stars, // Use current stars from contract
                  isInGraveyard // Add graveyard status
                }
              } catch (e) {
                console.warn('Failed to get game state for token', item.tokenId, e)
                return item // Keep NFT if game state check fails
              }
            }))
            
            // Only filter out NFTs that are not owned, keep graveyard NFTs
            setNfts(enrichedWithGameState.filter(Boolean) as any)
          }
          return
        }
      } catch (alchemyError) {
        console.warn('Alchemy API with rotation failed, falling back to proxy:', alchemyError)
      }

      // Fallback: our own proxy API (avoids CORS / rate limits)
      const res = await fetch(`/api/alchemy/getNfts?owner=${address}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)

      const items: import("@/types/nft").NFT[] = (json.ownedNfts as AlchemyNft[]).map((nft: AlchemyNft) => {
        let tokenIdDec: number
        const metadata = nft.raw?.metadata
        const idFromNameMatch = (metadata?.name || nft.name || "").match(/#(\d+)/)
        tokenIdDec = idFromNameMatch ? Number(idFromNameMatch[1]) : Number(hexToDecimal(nft.tokenId) || 0)

        return {
          id: `${tokenIdDec}`,
          tokenId: tokenIdDec,
          name: metadata?.name || nft.name || `CrazyCube #${tokenIdDec}`,
          image: (() => {
            let img = metadata?.image 
              || nft.image?.cachedUrl 
              || nft.image?.originalUrl 
              || (nft.media && nft.media.length ? nft.media[0].gateway : '')
              || '/favicon.ico';
            return resolveIpfsUrl(img)
          })(),
          attributes: metadata?.attributes || [],
          rewardBalance: 0,
          frozen: false,
          stars: 0, // Safe default value.
        }
      })
      
      // Try to enrich NFTs that lack images
      const enriched = await Promise.all(items.map(async (item) => {
        // Skip if image already exists and isn't favicon
        if (item.image && item.image !== '/favicon.ico') return item
        
        try {
          const metaPath = `/getNFTMetadata?contractAddress=${CRAZYCUBE_ADDR}&tokenId=${item.tokenId}`
          const metaRes = await alchemyFetch('nft', metaPath, { method: 'GET' })
          if (!metaRes.ok) throw new Error('Failed to fetch metadata')
          
          const meta = await metaRes.json()
          if (meta.media && meta.media.length > 0) {
            item.image = meta.media[0].gateway || meta.media[0].raw || item.image
          }
          if (meta.rawMetadata?.image) {
            item.image = meta.rawMetadata.image
          }
          
          item.image = resolveIpfsUrl(item.image) || item.image
        } catch (e) {
          console.warn('Metadata enrichment failed for token', item.tokenId, e)
        }
        
        return item
      }))
      
      setNfts(enriched)

      // Apply same enhanced validation for fallback
      if (publicClient) {
        const enrichedWithGameState = await Promise.all(enriched.map(async (item) => {
          try {
            // Check ownership first
            const nftAddr: `0x${string}` = CRAZYCUBE_ADDR as `0x${string}`
            const owner: `0x${string}` = await publicClient.readContract({
              address: nftAddr,
              abi: [{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}],
              functionName: "ownerOf",
              args: [BigInt(item.tokenId)]
            }) as `0x${string}`
            
            if (owner.toLowerCase() !== address!.toLowerCase()) {
              return null // Only filter if not owned
            }

            // Get game state to mark graveyard status
            const state: any = await publicClient.readContract({
              address: GAME_ADDRESS,
              abi: GAME_ABI_MIN,
              functionName: "nftState",
              args: [BigInt(item.tokenId)]
            })
            
            // Update item with game state info
            const isInGraveyard = state[4] as boolean
            const currentStars = state[0] as number
            
            return {
              ...item,
              frozen: isInGraveyard, // Mark graveyard NFTs as frozen
              stars: currentStars || item.stars, // Use current stars from contract
              isInGraveyard // Add graveyard status
            }
          } catch (e) {
            console.warn('Failed to get game state for token', item.tokenId, e)
            return item // Keep NFT if game state check fails
          }
        }))
        
        // Only filter out NFTs that are not owned, keep graveyard NFTs
        setNfts(enrichedWithGameState.filter(Boolean) as any)
      }
    } while (pageKey);
  }

  // Fetch immediately on mount / dependency change
  useEffect(() => {
    fetchNfts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected])

  return { nfts, isLoading, error, refetch: fetchNfts }
} 