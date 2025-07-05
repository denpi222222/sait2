'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { alchemyFetch } from '@/lib/alchemyFetch';

export interface AlchemyNFT {
  contract: {
    address: string;
  };
  id: {
    tokenId: string;
    tokenMetadata?: {
      tokenType: string;
    };
  };
  balance: string;
  title: string;
  description: string;
  tokenUri: {
    gateway: string;
    raw: string;
  };
  media: Array<{
    gateway: string;
    thumbnail: string;
    raw: string;
    format: string;
    bytes?: number;
  }>;
  metadata: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{
      trait_type: string;
      value: any;
    }>;
  };
  timeLastUpdated: string;
  contractMetadata: {
    name: string;
    symbol: string;
    tokenType: string;
  };
  spamInfo?: {
    isSpam: boolean;
    classifications: string[];
  };
}

export interface UseUserNFTsReturn {
  nfts: AlchemyNFT[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const CONTRACT_ADDRESSES = [
  "0x606a47707d5aEdaE9f616A6f1853fE3075bA740B", // NFT contract address (40 символов)
  // Добавьте другие адреса контрактов если нужно
];

// Вспомогательные функции для работы с tokenId
// Convert a tokenId that may be in hex (padded 0x… or raw hex) OR already decimal
// to its plain decimal string form.
export const hexToDecimal = (value: string): string => {
  if (!value) return "";
  // If already looks like plain decimal, just return
  if (/^\d+$/.test(value)) return value;

  try {
    const clean = value.startsWith("0x") ? value.slice(2) : value;
    return BigInt("0x" + clean).toString();
  } catch {
    return "";
  }
};

export const decimalToHex = (decimal: string): string => {
  return '0x' + parseInt(decimal, 10).toString(16).padStart(64, '0');
};

// Функция для получения tokenId в десятичном формате
export const getTokenIdAsDecimal = (nft: AlchemyNFT): string => {
  // 1) Try to extract ID from name/title (e.g. "CrazyCube #3430")
  const nameField = nft.metadata?.name || nft.title || "";
  const match = nameField.match(/#(\d+)/);
  if (match) {
    return match[1];
  }

  // 2) Fallback: hex from Alchemy id -> decimal (if present)
  if (nft.id?.tokenId) {
    const dec = hexToDecimal(nft.id.tokenId);
    return dec || "";
  }

  // 3) Last resort – empty string (so UI shows "#" or hides number)
  return "";
};

// Функция для получения изображения NFT
export const getNFTImage = (nft: AlchemyNFT): string => {
  let imageUrl = '';
  
  // Проверяем media массив
  if (nft.media && nft.media.length > 0) {
    imageUrl = nft.media[0].gateway || nft.media[0].raw;
  }
  
  // Если нет в media, проверяем metadata
  if (!imageUrl && nft.metadata?.image) {
    imageUrl = nft.metadata.image;
  }
  
  // Конвертируем IPFS URL в HTTP URL через стабильный gateway
  if (imageUrl.startsWith('ipfs://')) {
    const ipfsHash = imageUrl.replace('ipfs://', '');
    const gateways = [
      'https://gateway.pinata.cloud/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://ipfs.io/ipfs/'
    ];
    imageUrl = `${gateways[0]}${ipfsHash}`;
    // На клиенте можно попробовать подменить gateway при ошибке изображения (onError), но это за пределами хука
  }
  
  return imageUrl;
};

// Функция для получения имени NFT
export const getNFTName = (nft: AlchemyNFT): string => {
  return nft.title || nft.metadata?.name || `Token #${getTokenIdAsDecimal(nft)}`;
};

export function useUserNFTs(): UseUserNFTsReturn {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<AlchemyNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);  const fetchNFTs = async () => {
    if (!address || !isConnected) {
      setNfts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Собираем query string вручную, чтобы оставить 'contractAddresses[]' без URL-encode.
      const parts: string[] = [
        `owner=${address}`,
        'withMetadata=true',
        'pageSize=100'
      ];
      CONTRACT_ADDRESSES.forEach(addr => {
        parts.push(`contractAddresses[]=${addr}`);
      });
      const queryPath = `/getNFTsForOwner?${parts.join('&')}`;
      
      console.log('Fetching NFTs from Alchemy with rotation support:', queryPath);

      // Используем alchemyFetch с автоматической ротацией ключей и retry логикой
      const response = await alchemyFetch('nft', queryPath, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Alchemy API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      const userNFTs: AlchemyNFT[] = data.ownedNfts || [];
      
      console.log('Fetched NFTs from Alchemy:', userNFTs.length, userNFTs);

      // Try to enrich NFTs that lack media/image via getNFTMetadata
      const enriched = await Promise.all(userNFTs.map(async (item: AlchemyNFT) => {
        const hasImage = getNFTImage(item) !== ''
        if (hasImage) return item
        try {
          if (!item.id?.tokenId) return item;
          const metaPath = `/getNFTMetadata?contractAddress=${item.contract.address}&tokenId=${hexToDecimal(item.id.tokenId)}`
          const metaRes = await alchemyFetch('nft', metaPath, { method: 'GET' })
          if (!metaRes.ok) throw new Error('meta')
          const meta = await metaRes.json()
          // merge metadata/media fields if present
          if (meta.rawMetadata) {
            item.metadata = meta.rawMetadata
          }
          if (meta.media && Array.isArray(meta.media) && meta.media.length) {
            item.media = meta.media
          }
        } catch (e) {
          console.warn('metadata fetch failed', e)
        }
        return item
      }))

      setNfts(enriched);
      
    } catch (err) {
      console.error('Error fetching NFTs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch NFTs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNFTs();
  }, [address, isConnected]);

  return {
    nfts,
    loading,
    error,
    refetch: fetchNFTs,
  };
}
