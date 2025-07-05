import { useEffect, useState } from 'react'
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { Abi, parseAbi, decodeEventLog, formatEther, Address } from 'viem'
import { GAME_CONTRACT_ADDRESS } from '../config/wagmi'
import { toast } from 'sonner'

// ------------------------------------------------------------------
// КОНФИГУРАЦИЯ И ПРАВИЛЬНЫЙ ABI
// ------------------------------------------------------------------
// Адрес прокси-контракта игры берём из центральной конфигурации wagmi.ts
// (config/wagmi.ts → GAME_CONTRACT_ADDRESS)

// Используем parseAbi из viem для большей безопасности и авто-типизации
const GameContractABI = parseAbi([
    "event NFTBurned(address indexed player, uint256 indexed tokenId, uint256 amountToClaim, uint256 waitHours)",
    "function burnRecords(uint256 tokenId) view returns (address owner, uint256 totalAmount, uint256 claimAvailableTime, uint256 graveyardReleaseTime, bool claimed, uint8 waitPeriod)",
    "function burnSplits(uint8 waitPeriod) view returns (uint16 playerBps, uint16 poolBps, uint16 burnBps)",
    "function claimBurnRewards(uint256 tokenId)",
    "function nftContract() view returns (address)"
]);

// Типизация для данных, которые мы будем хранить в состоянии
export interface BurnedNftInfo {
    tokenId: string;
    record: {
        owner: Address;
        totalAmount: bigint;
        claimAvailableTime: bigint;
        graveyardReleaseTime: bigint;
        claimed: boolean;
        waitPeriod: number;
    };
    split: {
        playerBps: number;
        poolBps: number;
        burnBps: number;
    } | null;
    playerShare: bigint;
    isReadyToClaim: boolean;
}

/**
 * Хук для получения списка сожженных NFT пользователя и их данных.
 * Использует viem getLogs для эффективности.
 */
export const useBurnedNfts = () => {
    const { address, isConnected } = useAccount()
    const publicClient = usePublicClient()
    
    const [burnedNfts, setBurnedNfts] = useState<BurnedNftInfo[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isConnected || !address || !publicClient) {
            setIsLoading(false)
            setBurnedNfts([])
            return
        }

        const abortController = new AbortController();

        const fetchBurnedNfts = async () => {
            setIsLoading(true)
            setError(null)
            try {
                // текущий timestamp сети, по-умолчанию локальное время; обновим позже
                let chainNow = Math.floor(Date.now()/1000)

                // Попытаемся получить время последнего блока сразу
                try {
                    const latestBlock0 = await publicClient.getBlock()
                    chainNow = Number(latestBlock0.timestamp)
                } catch(_e) { /* ignore – fallback на локальное время */ }

                console.log("✅ [useBurnedNfts] Поиск сожжённых NFT для:", address);

                // ------------------------------------------------------------
                // 1) Быстрый путь — Subgraph (моментально отдаёт события)
                // ------------------------------------------------------------
                let tokenIds: string[] = [];
                try {
                    const sgQuery = `query($player: Bytes!) { player(id:$player){ burnEvents(first:1000){ tokenId } } }`;
                    
                    const sgRes = await fetch('/api/subgraph', {
                        signal: abortController.signal,
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: sgQuery, variables: { player: address.toLowerCase() } }),
                    });
                    if (sgRes.ok) {
                        const sgJson = await sgRes.json();
                        tokenIds = (sgJson.data?.player?.burnEvents || []).map((ev: any) => ev.tokenId.toString());
                    }
                } catch (sgErr) {
                    console.warn('⚠️ Subgraph недоступен, fallback на логи', sgErr);
                }

                // ------------------------------------------------------------
                // 2) Медленный путь — getLogs (если Subgraph пустой)
                // ------------------------------------------------------------
                if (tokenIds.length === 0) {
                    const latestBlock = await publicClient.getBlock()
                    chainNow = Number(latestBlock.timestamp)
                    const DEPLOY_BLOCK = 18087243n; // блок деплоя контракта

                    let allLogs: any[] = [];
                    try {
                        allLogs = await publicClient.getLogs({
                            address: GAME_CONTRACT_ADDRESS,
                            event: {
                                type: 'event',
                                name: 'NFTBurned',
                                inputs: [
                                    { type: 'address', name: 'player', indexed: true },
                                    { type: 'uint256', name: 'tokenId', indexed: true },
                                    { type: 'uint256', name: 'amountToClaim' },
                                    { type: 'uint256', name: 'waitHours' },
                                ],
                            },
                            args: { player: address },
                            fromBlock: DEPLOY_BLOCK,
                            toBlock: latestBlock.number,
                        });
                    } catch (bigRangeErr) {
                        console.warn('⚠️ RPC ограничил диапазон, батч-поиск', bigRangeErr);
                        const STEP = 50000n;
                        let toBlock = latestBlock.number;
                        let iterations = 0;
                        while (toBlock > DEPLOY_BLOCK && iterations < 240) {
                            const fromBlock = toBlock > STEP ? toBlock - STEP + 1n : DEPLOY_BLOCK;
                            const chunk = await publicClient.getLogs({
                                address: GAME_CONTRACT_ADDRESS,
                                event: {
                                    type: 'event',
                                    name: 'NFTBurned',
                                    inputs: [
                                        { type: 'address', name: 'player', indexed: true },
                                        { type: 'uint256', name: 'tokenId', indexed: true },
                                        { type: 'uint256', name: 'amountToClaim' },
                                        { type: 'uint256', name: 'waitHours' },
                                    ],
                                },
                                args: { player: address },
                                fromBlock,
                                toBlock,
                            });
                            allLogs.push(...chunk);
                            if (fromBlock === DEPLOY_BLOCK) break;
                            toBlock = fromBlock - 1n;
                            iterations++;
                        }
                    }

                    tokenIds = allLogs.map((log: any) => (decodeEventLog({ abi: GameContractABI, ...log }).args as any).tokenId.toString());
                }

                const uniqueIds = [...new Set(tokenIds)].reverse();

                console.log(`✅ [useBurnedNfts] Уникальных NFT: ${uniqueIds.length}`);

                const nftsInfo: BurnedNftInfo[] = []

                // Кэш для split-параметров (по waitPeriod) – чтобы не дергать контракт по 16 раз
                const splitCache = new Map<number, { playerBps: number; poolBps: number; burnBps: number }>()

                // Чанк-размер одновременных запросов
                const CHUNK = 8

                for (let i = 0; i < uniqueIds.length; i += CHUNK) {
                    const slice = uniqueIds.slice(i, i + CHUNK)

                    const chunkResults = await Promise.all(slice.map(async tokenId => {
                    try {
                        const recordResult: any = await publicClient.readContract({
                            address: GAME_CONTRACT_ADDRESS,
                            abi: GameContractABI,
                            functionName: 'burnRecords',
                            args: [BigInt(tokenId)]
                            })
                        
                            const [owner, totalAmount, claimAvailableTime, graveyardReleaseTime, claimed, waitPeriod] = recordResult

                            if (owner.toLowerCase() !== address.toLowerCase()) return null
                           
                            // Получаем сплит либо из кэша, либо из контракта
                            let split = splitCache.get(Number(waitPeriod))
                            if (!split) {
                            const splitResult = await publicClient.readContract({
                                address: GAME_CONTRACT_ADDRESS,
                                abi: GameContractABI,
                                functionName: 'burnSplits',
                                args: [waitPeriod]
                                }) as [number, number, number]

                                const [playerBps, poolBps, burnBps] = splitResult
                                split = { playerBps, poolBps, burnBps }
                                splitCache.set(Number(waitPeriod), split)
                            }

                            const playerShare = (totalAmount * BigInt(split.playerBps)) / 10000n

                            const info: BurnedNftInfo = {
                                tokenId,
                                record: {
                                    owner,
                                    totalAmount,
                                    claimAvailableTime,
                                    graveyardReleaseTime,
                                    claimed,
                                    waitPeriod,
                                },
                                split,
                                playerShare,
                                isReadyToClaim: !claimed && claimAvailableTime <= BigInt(chainNow),
                            }
                            return info
                        } catch (err) {
                            console.error(`❌ [useBurnedNfts] Ошибка при загрузке данных для NFT #${tokenId}:`, err)
                            return null
                        }
                    }))

                    chunkResults.forEach(r => { if (r) nftsInfo.push(r) })
                }
                
                nftsInfo.sort((a, b) => (b.isReadyToClaim ? 1 : 0) - (a.isReadyToClaim ? 1 : 0));
                setBurnedNfts(nftsInfo);

            } catch (e) {
                console.error("❌ [useBurnedNfts] Глобальная ошибка при загрузке событий:", e)
                setError("Failed to load burn history. Please refresh the page.")
                toast.error("Failed to load burn history.")
            } finally {
                setIsLoading(false)
            }
        }

        fetchBurnedNfts();
        return () => abortController.abort();
    }, [address, isConnected, publicClient])

    return { burnedNfts, isLoading, error }
}


/**
 * Хук для вызова функции claimBurnRewards
 */
export const useClaimReward = (tokenId: string) => {
    const { writeContractAsync, data: txHash, isPending, error } = useWriteContract();

    const { isLoading: isTxLoading, isSuccess: isTxSuccess, error: txError } = useWaitForTransactionReceipt({ 
        hash: txHash,
        confirmations: 2, // Ожидаем 2 подтверждения для надежности
    });

    const claim = async () => {
        try {
            toast.loading('Sending transaction...', { id: `claim-${tokenId}` });
            await writeContractAsync({
                address: GAME_CONTRACT_ADDRESS,
                abi: GameContractABI,
                functionName: 'claimBurnRewards',
                args: [BigInt(tokenId)]
            });
        } catch (e: any) {
            console.error("Error calling claimBurnRewards:", e);
            toast.error(e.message || 'Transaction failed', { id: `claim-${tokenId}` });
        }
    }

    // Обновляем тосты по статусу транзакции
    useEffect(() => {
        if(isTxLoading) {
            toast.loading('Transaction in progress...', { id: `claim-${tokenId}` });
        }
        if (isTxSuccess) {
            toast.success('Reward claimed successfully!', { id: `claim-${tokenId}`, duration: 5000 });
        }
        if (txError) {
            toast.error(txError.message || 'Transaction error', { id: `claim-${tokenId}` });
        }
    }, [isTxLoading, isTxSuccess, txError, tokenId]);

    return {
        claim,
        isClaiming: isPending || isTxLoading,
        isSuccess: isTxSuccess,
        error: error || txError,
        txHash
    };
} 