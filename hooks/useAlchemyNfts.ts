'use client';

import { useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { labelToIndex, getRarityLabel } from '@/lib/rarity';
import { alchemyFetch } from '@/lib/alchemyFetch';
import { resolveIpfsUrl } from '@/lib/ipfs';
import { hexToDecimal } from './useUserNFTs';
import rarityList from '@/public/cube_rarity.json';
import { apeChain } from '@/config/chains';

interface AlchemyNft {
  contract: { address: string };
  tokenId: string; // This is correct according to Alchemy docs
  tokenType: string;
  title?: string;
  description?: string;
  image?: {
    cachedUrl?: string;
    thumbnailUrl?: string;
    pngUrl?: string;
    contentType?: string;
  };
  raw?: {
    tokenUri?: string;
    metadata?: {
      name?: string;
      description?: string;
      image?: string;
      attributes?: Array<{
        trait_type: string;
        value: string | number;
      }>;
    };
    error?: string;
  };
  collection?: {
    name?: string;
    slug?: string;
  };
  balance?: string;
  timeLastUpdated?: string;
}

// Quick lookup table: tokenId -> rarity index (1-6)
const rarityMap: Record<number, number> = {};
(rarityList as Array<{ tokenId: number; rarity: number }>).forEach(entry => {
  rarityMap[entry.tokenId] = entry.rarity;
});

// Use addresses from config/chains.ts instead of hardcoded values
const CRAZYCUBE_ADDR = apeChain.contracts.crazyCubeNFT.address;
const GAME_ADDRESS = apeChain.contracts.gameProxy.address;

export function useAlchemyNfts() {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<import('@/types/nft').NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const publicClient = usePublicClient();

  const GAME_ABI_MIN = [
    {
      inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
      name: 'nftState',
      outputs: [
        { internalType: 'uint8', name: 'currentStars', type: 'uint8' },
        { internalType: 'uint256', name: 'lockedCRAA', type: 'uint256' },
        { internalType: 'uint256', name: 'lastPingTime', type: 'uint256' },
        { internalType: 'uint256', name: 'lastBreedTime', type: 'uint256' },
        { internalType: 'bool', name: 'isInGraveyard', type: 'bool' },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  ] as const;

  const saveCache = (data: any[]) => {
    if (!address) return;
    try {
      localStorage.setItem(
        `${CACHE_KEY_PREFIX}${address}`,
        JSON.stringify({ ts: Date.now(), nfts: data })
      );
    } catch {}
  };

  const fetchNfts = async () => {
    if (!isConnected || !address) {
      setNfts([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 🛡️ WHALE PROTECTION: Fetch NFTs with pagination to prevent DoS attacks on large holders
      await fetchNftsWithPagination();
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNftsWithPagination = async () => {
    const allNFTs: import('@/types/nft').NFT[] = [];
    let pageKey: string | undefined = undefined;
    const PAGE_SIZE = 100; // Alchemy's recommended page size
    let pageCount = 0;
    const MAX_PAGES = 20; // Protection against infinite loops (max 2000 NFTs)

    do {
      pageCount++;
      if (pageCount > MAX_PAGES) {
        break;
      }

      // Primary attempt: Alchemy NFT API with pagination
      try {
        let queryPath = `/getNFTsForOwner?owner=${address}&contractAddresses[]=${CRAZYCUBE_ADDR}&limit=${PAGE_SIZE}`;
        if (pageKey) {
          queryPath += `&pageKey=${encodeURIComponent(pageKey)}`;
        }

        const response = await alchemyFetch('nft', queryPath, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          pageKey = data.pageKey;

          // Debug: log the full response structure
          console.log('Full Alchemy response:', data);
          console.log('First NFT structure:', data.ownedNfts?.[0]);

          const items: import('@/types/nft').NFT[] = (
            data.ownedNfts as AlchemyNft[]
          ).map((nft: AlchemyNft) => {
            const metadata = nft.raw?.metadata;

            // Debug logging - show full NFT object

            // Extract tokenId - check multiple possible locations
            let tokenIdDec: number;
            let tokenIdStr: string | undefined;

            // Try different possible locations for tokenId
            if (nft.tokenId) {
              tokenIdStr = nft.tokenId;
            } else if ((nft as any).id?.tokenId) {
              tokenIdStr = (nft as any).id.tokenId;
            } else if ((nft as any).id && typeof (nft as any).id === 'string') {
              tokenIdStr = (nft as any).id;
            }

            if (tokenIdStr) {
              // Try direct conversion first (for decimal strings like "1", "2")
              if (/^\d+$/.test(tokenIdStr)) {
                tokenIdDec = Number(tokenIdStr);
              } else {
                // Try hex conversion for hex strings
                const hexConverted = hexToDecimal(tokenIdStr);
                tokenIdDec = Number(hexConverted) || 0;
              }
            } else {
              // Fallback: try to extract from name/title
              const idFromNameMatch = (metadata?.name || nft.title || '').match(
                /#(\d+)/
              );
              tokenIdDec = idFromNameMatch ? Number(idFromNameMatch[1]) : 0;
            }

            // Get image from multiple possible sources
            const nftData = nft as any;
            const imageUrl =
              nftData.metadata?.image || // First try metadata.image
              metadata?.image || // Then raw.metadata.image
              nftData.media?.[0]?.gateway || // Then media array
              nftData.image?.cachedUrl || // Then image object
              nftData.image?.thumbnailUrl ||
              nftData.image?.pngUrl ||
              '/favicon.ico'; // Fallback

            console.log('Image extraction:', {
              metadataImage: nftData.metadata?.image,
              rawMetadataImage: metadata?.image,
              mediaGateway: nftData.media?.[0]?.gateway,
              finalImage: imageUrl,
            });

            return {
              id: `${tokenIdDec}`,
              tokenId: tokenIdDec,
              name: metadata?.name || nft.title || `CrazyCube #${tokenIdDec}`,
              image: resolveIpfsUrl(imageUrl),
              attributes: metadata?.attributes || [],
              rewardBalance: 0,
              frozen: false,
              stars: 0, // Safe default value. Real stars will be loaded from contract.
              rarity: 'Common', // Default rarity
            };
          });

          // Try to enrich NFTs that lack images
          const enriched = await Promise.all(
            items.map(async item => {
              // Skip if image already exists and isn't favicon
              if (item.image && item.image !== '/favicon.ico') return item;

              try {
                const metaPath = `/getNFTMetadata?contractAddress=${CRAZYCUBE_ADDR}&tokenId=${item.tokenId}`;
                const metaRes = await alchemyFetch('nft', metaPath, {
                  method: 'GET',
                });
                if (!metaRes.ok) throw new Error('Failed to fetch metadata');

                const meta = await metaRes.json();
                if (meta.media && meta.media.length > 0) {
                  item.image =
                    meta.media[0].gateway || meta.media[0].raw || item.image;
                }
                if (meta.rawMetadata?.image) {
                  item.image = meta.rawMetadata.image;
                }

                item.image = resolveIpfsUrl(item.image) || item.image;
              } catch (e) {}

              return item;
            })
          );

          setNfts(enriched);

          // 🔄 ENHANCED VALIDATION: Get game state but don't filter out graveyard NFTs
          if (publicClient) {
            const enrichedWithGameState = await Promise.all(
              enriched.map(async item => {
                try {
                  // Check ownership first
                  const nftAddr: `0x${string}` =
                    CRAZYCUBE_ADDR as `0x${string}`;
                  const owner: `0x${string}` = (await publicClient.readContract(
                    {
                      address: nftAddr,
                      abi: [
                        {
                          inputs: [
                            {
                              internalType: 'uint256',
                              name: 'tokenId',
                              type: 'uint256',
                            },
                          ],
                          name: 'ownerOf',
                          outputs: [
                            {
                              internalType: 'address',
                              name: '',
                              type: 'address',
                            },
                          ],
                          stateMutability: 'view',
                          type: 'function',
                        },
                      ],
                      functionName: 'ownerOf',
                      args: [BigInt(item.tokenId)],
                    }
                  )) as `0x${string}`;

                  if (owner.toLowerCase() !== address!.toLowerCase()) {
                    return null; // Only filter if not owned
                  }

                  // Get game state to mark graveyard status
                  const state: any = await publicClient.readContract({
                    address: GAME_ADDRESS,
                    abi: GAME_ABI_MIN,
                    functionName: 'nftState',
                    args: [BigInt(item.tokenId)],
                  });

                  // Update item with game state info
                  const isInGraveyard = state[4] as boolean;
                  const currentStars = state[0] as number;

                  return {
                    ...item,
                    frozen: isInGraveyard, // Mark graveyard NFTs as frozen
                    stars: currentStars || item.stars, // Use current stars from contract
                    isInGraveyard, // Add graveyard status
                  };
                } catch (e) {
                  return item; // Keep NFT if game state check fails
                }
              })
            );

            // Only filter out NFTs that are not owned, keep graveyard NFTs
            setNfts(enrichedWithGameState.filter(Boolean) as any);
            saveCache(enrichedWithGameState.filter(Boolean) as any);
          }
          return;
        }
      } catch (alchemyError) {}

      // Fallback: our own proxy API (avoids CORS / rate limits)
      const res = await fetch(`/api/alchemy/getNfts?owner=${address}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      const items: import('@/types/nft').NFT[] = (
        json.ownedNfts as AlchemyNft[]
      ).map((nft: AlchemyNft) => {
        const metadata = nft.raw?.metadata;

        // Debug logging for fallback
        console.log('Fallback NFT data:', {
          tokenId: nft.tokenId,
          name: metadata?.name || nft.title,
          hexConverted: hexToDecimal(nft.tokenId),
        });

        const idFromNameMatch = (metadata?.name || nft.title || '').match(
          /#(\d+)/
        );

        let tokenIdDec: number;
        if (idFromNameMatch && idFromNameMatch[1]) {
          tokenIdDec = Number(idFromNameMatch[1]);
        } else {
          const hexConverted = hexToDecimal(nft.tokenId);
          tokenIdDec = Number(hexConverted) || 0;
        }

        return {
          id: `${tokenIdDec}`,
          tokenId: tokenIdDec,
          name: metadata?.name || nft.title || `CrazyCube #${tokenIdDec}`,
          image: (() => {
            const img =
              metadata?.image ||
              nft.image?.cachedUrl ||
              nft.image?.pngUrl ||
              '/favicon.ico';
            return resolveIpfsUrl(img);
          })(),
          attributes: metadata?.attributes || [],
          rewardBalance: 0,
          frozen: false,
          stars: 0, // Safe default value.
          rarity: 'Common', // Default rarity
        };
      });

      // Try to enrich NFTs that lack images
      const enriched = await Promise.all(
        items.map(async item => {
          // Skip if image already exists and isn't favicon
          if (item.image && item.image !== '/favicon.ico') return item;

          try {
            const metaPath = `/getNFTMetadata?contractAddress=${CRAZYCUBE_ADDR}&tokenId=${item.tokenId}`;
            const metaRes = await alchemyFetch('nft', metaPath, {
              method: 'GET',
            });
            if (!metaRes.ok) throw new Error('Failed to fetch metadata');

            const meta = await metaRes.json();
            if (meta.media && meta.media.length > 0) {
              item.image =
                meta.media[0].gateway || meta.media[0].raw || item.image;
            }
            if (meta.rawMetadata?.image) {
              item.image = meta.rawMetadata.image;
            }

            item.image = resolveIpfsUrl(item.image) || item.image;
          } catch (e) {}

          return item;
        })
      );

      setNfts(enriched);

      // Apply same enhanced validation for fallback
      if (publicClient) {
        const enrichedWithGameState = await Promise.all(
          enriched.map(async item => {
            try {
              // Check ownership first
              const nftAddr: `0x${string}` = CRAZYCUBE_ADDR as `0x${string}`;
              const owner: `0x${string}` = (await publicClient.readContract({
                address: nftAddr,
                abi: [
                  {
                    inputs: [
                      {
                        internalType: 'uint256',
                        name: 'tokenId',
                        type: 'uint256',
                      },
                    ],
                    name: 'ownerOf',
                    outputs: [
                      { internalType: 'address', name: '', type: 'address' },
                    ],
                    stateMutability: 'view',
                    type: 'function',
                  },
                ],
                functionName: 'ownerOf',
                args: [BigInt(item.tokenId)],
              })) as `0x${string}`;

              if (owner.toLowerCase() !== address!.toLowerCase()) {
                return null; // Only filter if not owned
              }

              // Get game state to mark graveyard status
              const state: any = await publicClient.readContract({
                address: GAME_ADDRESS,
                abi: GAME_ABI_MIN,
                functionName: 'nftState',
                args: [BigInt(item.tokenId)],
              });

              // Update item with game state info
              const isInGraveyard = state[4] as boolean;
              const currentStars = state[0] as number;

              return {
                ...item,
                frozen: isInGraveyard, // Mark graveyard NFTs as frozen
                stars: currentStars || item.stars, // Use current stars from contract
                isInGraveyard, // Add graveyard status
              };
            } catch (e) {
              return item; // Keep NFT if game state check fails
            }
          })
        );

        // Only filter out NFTs that are not owned, keep graveyard NFTs
        setNfts(enrichedWithGameState.filter(Boolean) as any);
        saveCache(enrichedWithGameState.filter(Boolean) as any);
      }
    } while (pageKey);
  };

  const CACHE_KEY_PREFIX = 'alchemy_nfts_';
  const CACHE_TTL_MS = 60000; // 60 seconds

  // Fetch immediately on mount / dependency change (with cache consideration)
  useEffect(() => {
    if (!isConnected || !address) {
      setNfts([]);
      return;
    }

    const cacheKey = `${CACHE_KEY_PREFIX}${address}`;
    try {
      const cachedStr = localStorage.getItem(cacheKey);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr) as { ts: number; nfts: any[] };
        if (Date.now() - cached.ts < CACHE_TTL_MS) {
          setNfts(cached.nfts);
        }
      }
    } catch {}

    fetchNfts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected]);

  return { nfts, isLoading, error, refetch: fetchNfts };
}
