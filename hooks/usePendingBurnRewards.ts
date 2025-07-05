import { useEffect, useState, useCallback } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatEther } from 'viem'
import { apeChain } from '../config/chains'
import { alchemyFetch } from '@/lib/alchemyFetch'

// Contract constants
const GAME_ADDRESS = apeChain.contracts.gameProxy.address
const NFT_ADDRESS = '0x606a47707d5aEdaE9f616A6f1853fE3075bA740B' as const

const GAME_ABI = [
  // graveyard functions
  'function getGraveyardSize() view returns (uint256)',
  'function graveyardTokens(uint256) view returns (uint256)',
  // burn record mapping (tokenId => (owner,totalAmount,claimAvailableTime,claimed))
  'function burnRecords(uint256) view returns (address owner,uint256 totalAmount,uint256 claimAvailableTime,bool claimed)'
] as const

const NFT_BURNED_EVENT = {
  anonymous: false,
  inputs: [
    { indexed: true, type: 'address', name: 'player' },
    { indexed: true, type: 'uint256', name: 'tokenId' }
  ],
  name: 'NFTBurned',
  type: 'event'
} as const

export interface PendingReward {
  tokenId: string
  image?: string
  name?: string
  record: {
    lockedAmount: bigint
    lockedAmountFormatted: string
    waitPeriod: number
    waitPeriodHours: number
    burnTimestamp: number
    claimed: boolean
    canClaim: boolean
    timeLeft: number
    timeLeftFormatted: string
  }
}

const CACHE_KEY = 'crazycube:pendingRewards'
const CACHE_TTL_MS = 60 * 1000 // 1 minute

export function usePendingBurnRewards() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const [rewards, setRewards] = useState<PendingReward[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [scanningHistory, setScanningHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // helper to read cache
  const readCache = () => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(CACHE_KEY + ':' + address)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { ts: number; data: PendingReward[] }
      if (Date.now() - parsed.ts > CACHE_TTL_MS) return null
      return parsed.data
    } catch {
      return null
    }
  }

  const writeCache = (data: PendingReward[]) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(CACHE_KEY + ':' + address, JSON.stringify({ ts: Date.now(), data }))
    } catch {}
  }

  // deep scan across historical burns (may be slow)
  const scanHistoricalBurns = useCallback(async (already: Set<string>): Promise<PendingReward[]> => {
    if (!publicClient || !address) return []
    setScanningHistory(true)
    const extra: PendingReward[] = []
    try {
      const deployBlock = apeChain.contracts.gameProxy.blockCreated ?? 0
      const logs = await publicClient.getLogs({
        address: GAME_ADDRESS,
        event: NFT_BURNED_EVENT,
        fromBlock: BigInt(deployBlock),
        args: { player: address },
      }) as any[]
      const ids = logs.map(l=>BigInt(l.args.tokenId).toString())
      if (ids.length===0) return []
      for (const id of ids){
        if (already.has(id)) continue
        const rec = await publicClient.readContract({address:GAME_ADDRESS,abi:GAME_ABI,functionName:'burnRecords',args:[BigInt(id)]}) as any
        const [owner,total,claimAt,claimed] = rec
        if(!owner || owner.toLowerCase()!==address.toLowerCase()||claimed||BigInt(total)===0n) continue
        const now = Math.floor(Date.now()/1000)
        const timeLeft = Math.max(0, Number(claimAt)-now)
        extra.push({tokenId:id,record:{lockedAmount:total,lockedAmountFormatted:formatEther(total),waitPeriod:0,waitPeriodHours:0,burnTimestamp:Number(claimAt)-43200,claimed:false,canClaim:timeLeft===0,timeLeft,timeLeftFormatted:timeLeft===0?'Ready!':`${Math.floor(timeLeft/3600)}h`}})
      }
      return extra
    }catch(e){console.warn('deep scan err',e);return extra}finally{setScanningHistory(false)}
  }, [publicClient, address])

  const fetchByEvents = useCallback(async (): Promise<PendingReward[]> => {
    // Просто вызываем scanHistoricalBurns, передавая пустой Set (ищем все токены пользователя)
    const res = await scanHistoricalBurns(new Set())
    // enrich with metadata if missing
    try {
      await Promise.allSettled(res.map(async item => {
        if (item.image) return
        try {
          const queryPath = `getNFTMetadata?contractAddress=${NFT_ADDRESS}&tokenId=${item.tokenId}`
          const r = await alchemyFetch('nft', queryPath, undefined, 3)
          if (!r.ok) throw new Error('meta')
          const m = await r.json()
          const name = m.rawMetadata?.name || m.title || `CrazyCube #${item.tokenId}`
          let img = m.rawMetadata?.image || m.media?.[0]?.gateway || ''
          if (img.startsWith('ipfs://')) img = `https://gateway.pinata.cloud/ipfs/${img.replace('ipfs://', '')}`
          item.name = name
          item.image = img
        } catch {}
      }))
    } catch {}
    return res
  }, [address, isConnected, publicClient, scanHistoricalBurns])

  const run = useCallback(async (showSpinner:boolean) => {
    if(showSpinner) setLoading(true)
    try {
      // Try cache first
      const cached = readCache()
      if (cached) {
        setRewards(cached)
      }
      const fromEvents = await fetchByEvents()
      setRewards(fromEvents)
      writeCache(fromEvents)
      const setIds = new Set<string>(fromEvents.map((rr:PendingReward)=>rr.tokenId))
      const hist = await scanHistoricalBurns(setIds)
      if(hist && hist.length){
        setRewards(prev=>[...prev,...hist])
      }
    }catch(e:any){console.error(e);setError(e.message||'error')}finally{if(showSpinner) setLoading(false)}
  }, [address, isConnected, scanHistoricalBurns, fetchByEvents])

  const refresh = async () => {
    setRefreshing(true)
    try {
      await run(true) // show spinner on manual refresh
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const hasCache = readCache() !== null
    run(!hasCache) // show spinner only if no cache
  }, [run])

  return { rewards, loading, error, refreshing, refresh, scanningHistory, scanHistory: () => scanHistoricalBurns(new Set(rewards.map((rr:PendingReward)=>rr.tokenId))) }
} 