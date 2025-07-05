import { useEffect, useState } from "react"
import { useAccount, usePublicClient } from "wagmi"
import { decodeEventLog, parseAbiItem } from "viem"
import { apeChain } from '../config/chains'

const GAME_ADDR = apeChain.contracts.gameProxy.address

// минимальное ABI только с событием NFTBred
const NFTBRED_ITEM = parseAbiItem(
  "event NFTBred(address indexed requester,uint256 parent1Id,uint256 parent2Id,uint256 revivedId)"
)

export const useLiveBredCubes = () => {
  const { address } = useAccount()
  const client = usePublicClient()
  const [revived, setRevived] = useState<number[]>([])
  const [isWatching, setIsWatching] = useState(false)

  useEffect(() => {
    if (!client || !address) return

    // Throttle event watching - только включать когда пользователь активно на странице
    if (isWatching) {
      const unwatch = client.watchEvent({
        address: GAME_ADDR,
        event: NFTBRED_ITEM,
        onLogs: (logs:any) => {
          logs.forEach((log) => {
            const { args } = decodeEventLog({ abi: [NFTBRED_ITEM], eventName: "NFTBred", ...log })
            if ((args.requester as string).toLowerCase() === address.toLowerCase()) {
              setRevived((prev) => prev.includes(Number(args.revivedId)) ? prev : [...prev, Number(args.revivedId)])
            }
          })
        }
      })

      return () => unwatch?.()
    }
  }, [client, address, isWatching])

  // Методы для контроля watching
  const startWatching = () => setIsWatching(true)
  const stopWatching = () => setIsWatching(false)

  return { 
    revived, 
    startWatching, 
    stopWatching, 
    isWatching 
  }
} 