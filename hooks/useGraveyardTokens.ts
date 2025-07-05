import { useEffect, useState } from "react"
import { usePublicClient } from "wagmi"
import { apeChain } from '../config/chains'

const GAME_ADDR = apeChain.contracts.gameProxy.address
const ABI_MIN = [
  { name: "totalBurned", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "graveyardTokens", type: "function", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "burnRecords", type: "function", stateMutability: "view", inputs: [{type:"uint256"}], outputs:[
    {type:"address"}, // owner
    {type:"uint256"}, // totalAmount
    {type:"uint256"}, // claimAvailableTime
    {type:"uint256"}, // graveyardReleaseTime
    {type:"bool"},    // claimed
    {type:"uint8"}    // waitPeriod
  ] }
] as const

const CACHE_KEY = "crazycube:graveyard:tokens"
const REFRESH_INTERVAL_MS = 10000 // 10 sec

export function useGraveyardTokens() {
  const [tokens, setTokens] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  
  const publicClient = usePublicClient()

  useEffect(() => {
    let mounted = true

    const fetchTokensOnce = async () => {
      if (!publicClient) {
        if (mounted) setLoading(false)
        return
      }

      try {
        setError(null)
        console.log("🔄 Fetching graveyard tokens directly from contract...")

        // ТОЛЬКО прямой запрос к контракту - никакого субграфа!
        const graveyardSize = await publicClient.readContract({
          address: GAME_ADDR,
          abi: ABI_MIN,
          functionName: "totalBurned"
        }) as bigint

        console.log(`📊 Graveyard size: ${graveyardSize}`)

        let finalTokens: string[] = []
        const maxTokens = Math.min(Number(graveyardSize), 200) // лимит для производительности

        if (maxTokens > 0) {
          // Определяем, поддерживает ли сеть Multicall3
          const supportsMulticall = !!publicClient.chain?.contracts?.multicall3?.address

          if (supportsMulticall) {
            // ----------------------------------------------------------
            // 1) Быстрый путь — on-chain multicall (если доступен)
            // ----------------------------------------------------------
          const contracts = Array.from({ length: maxTokens }, (_, i) => ({
            address: GAME_ADDR,
            abi: ABI_MIN,
            functionName: "graveyardTokens" as const,
            args: [BigInt(i)] as const
          }))

          try {
              const mcRaw = await publicClient.multicall({
              contracts,
                allowFailure: true,
              }) as any

              const mcResults: any[] = Array.isArray(mcRaw) ? mcRaw : (mcRaw?.results ?? [])

              finalTokens = mcResults
              .filter(r => r.status === "success" && r.result && r.result > 0n)
              .map(r => (r.result as bigint).toString())

              console.log(`✅ [multicall] found ${finalTokens.length} tokens (contract)`)
          } catch (mcErr) {
              console.warn("⚠️ multicall error, switching to direct RPC", mcErr)
            }
          }

          // ------------------------------------------------------------
          // 2) Fallback – параллельные eth_call (до 10 одновременно)
          // ------------------------------------------------------------
          if (finalTokens.length === 0) {
            const CHUNK = 10
            for (let i = 0; i < maxTokens; i += CHUNK) {
              const slice = Array.from({ length: Math.min(CHUNK, maxTokens - i) }, (_, k) => i + k)
              const chunkResults = await Promise.all(slice.map(idx =>
              publicClient.readContract({
                address: GAME_ADDR,
                abi: ABI_MIN,
                functionName: "graveyardTokens",
                  args: [BigInt(idx)]
              }).catch(() => 0n)
              ))
              chunkResults.forEach(res => {
                if (res > 0n) finalTokens.push(res.toString())
              })
            }
          }
        }

        if (mounted) {
          setTokens(finalTokens)
          setReady(finalTokens.length > 0)
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), ids: finalTokens }))
        }

      } catch (e: any) {
        console.error("useGraveyardTokens error", e)
        if (mounted) {
          setError(e?.message || "error")
          // Попробуем загрузить из кэша при ошибке
          if(tokens.length===0){
            try{
              const cachedRaw = typeof window !== "undefined" ? localStorage.getItem(CACHE_KEY) : null
              if(cachedRaw){
                const cached = JSON.parse(cachedRaw) as {ts:number;ids:string[]}
                if(cached.ids?.length){
                  setTokens(cached.ids)
                  setReady(cached.ids.length > 0)
                }
              }
            }catch{}
          }
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchTokensOnce()

    const interval = setInterval(fetchTokensOnce, REFRESH_INTERVAL_MS)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [publicClient])

  return { tokens, loading, error, ready }
} 