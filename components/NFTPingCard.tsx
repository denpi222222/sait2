"use client"

// @ts-nocheck
/* eslint-disable */

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, SatelliteDish, Star, RefreshCw, Zap, Clock, Coins, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react"
import { useCrazyCubeGame, type NFTGameData } from "@/hooks/useCrazyCubeGame"
import { useToast } from "@/hooks/use-toast"
import { createPublicClient, http } from "viem"
import { apeChain } from "@/config/chains"
import type { NFT } from "@/types/nft"
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from "wagmi"
import { parseEther, formatEther } from "viem"
import { useMobile } from "@/hooks/use-mobile"
import { getColor, getLabel } from "@/lib/rarity"
import CoinBurst from "@/components/CoinBurst"
import { useTranslation } from 'react-i18next'
import { usePerformanceContext } from "@/hooks/use-performance-context"
import { useNetwork } from "@/hooks/use-network"
import { cn } from "@/lib/utils"

// Use address from config instead of hardcoding
const GAME_ADDR = apeChain.contracts.gameProxy.address
const CRA_ADDR = apeChain.contracts.crazyToken.address
const CHAIN_ID = apeChain.id

// Helper function to format numbers
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

interface NFTPingCardProps {
  nft: NFT
  index?: number
  onActionComplete?: () => void
}

export default function NFTPingCard({ nft, index = 0, onActionComplete }: NFTPingCardProps) {
  const tokenIdDec = nft.tokenId.toString()
  const { isLiteMode } = usePerformanceContext()
  const { getNFTGameData, pingNFT, isConnected, pingInterval } = useCrazyCubeGame()
  const { toast } = useToast()
  const [gameData, setGameData] = useState<NFTGameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [earnings, setEarnings] = useState<any>(null)
  const { t } = useTranslation()
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { isApeChain, requireApeChain } = useNetwork();
  const { isMobile } = useMobile()

  // Show warning if not on ApeChain
  useEffect(() => {
    if (!isApeChain && isConnected) {
      toast({
        title: 'Wrong Network',
        description: 'Please switch to ApeChain to interact with CrazyCube!',
        variant: 'destructive',
      });
    }
  }, [isApeChain, isConnected, toast]);

  // Fetch game data on mount
  useEffect(() => {
    let ignore = false
    const fetchData = async () => {
      const data = await getNFTGameData(tokenIdDec)
      if (!ignore) {
        setGameData(data)
      }

      try {
        const client = createPublicClient({ chain: apeChain, transport: http() })

        // Read only what we need: sharePerPing (base reward) and rarity bonus BPS
        const MINI_ABI = [
          { name: "sharePerPing", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
          { name: "rarityBonusBps", type: "function", stateMutability: "view", inputs: [{ type: "uint8" }], outputs: [{ type: "uint256" }] },
        ] as const

        const rarity = data?.rarity ?? 0

        const [sharePerPingWei, bonusBps] = await Promise.all([
          client.readContract({ address: GAME_ADDR, abi: MINI_ABI, functionName: "sharePerPing" }) as Promise<bigint>,
          client.readContract({ address: GAME_ADDR, abi: MINI_ABI, functionName: "rarityBonusBps", args: [rarity] }) as Promise<bigint>,
        ])

        console.log('CONTRACT DEBUG:', { 
          sharePerPingWei: sharePerPingWei.toString(), 
          sharePerPingWeiFormatted: formatEther(sharePerPingWei),
          bonusBps: bonusBps.toString(),
          rarity 
        })

        // Rewards per ping (base) – already in wei
        const basePerPingWei = sharePerPingWei

        // Total reward per ping with rarity bonus
        const totalPerPingWei = (basePerPingWei * (10000n + bonusBps)) / 10000n

        // Rewards per hour – depends on ping interval (contract value; default to 180s)
        const safeInterval = pingInterval || 180
        const periodsPerHour = BigInt(Math.floor(3600 / safeInterval))
        const basePerHourWei = (basePerPingWei * periodsPerHour)
        const totalPerHourWei = (basePerHourWei * (10000n + bonusBps)) / 10000n

        // Convert bonus from basis points (bps) to a human-friendly percent value
        const bonusPercent = parseInt(bonusBps.toString()) / 100 // e.g. 1500 bps → 15%

        if (!ignore) setEarnings({
          basePerHour: basePerHourWei,
          bonusPercent,
          rarityMultiplier: bonusPercent,
          totalPerHour: totalPerHourWei,
          basePerPing: basePerPingWei,
          bonusPerPing: totalPerPingWei - basePerPingWei,
          totalPerPing: totalPerPingWei,
        })
      } catch (err) {
        console.error("earnings calc error", err)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    fetchData()
    return () => {
      ignore = true
    }
  }, [tokenIdDec, getNFTGameData, pingInterval])

  // Derived status – convert bigint values (from contract) to number for UI calculations
  const nowSec = Math.floor(Date.now() / 1000)
  const lastPingTimeSec = gameData ? Number(gameData.lastPingTime) : 0
  const pingReady = gameData ? (lastPingTimeSec === 0 || nowSec > lastPingTimeSec + pingInterval) : false
  const timeLeft = gameData ? Math.max(0, (lastPingTimeSec + pingInterval) - nowSec) : 0

  const formatDuration = (sec: number): string => {
    if (sec <= 0) return '0s'
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${h ? h + 'h ' : ''}${m ? m + 'm ' : ''}${!h && !m ? s + 's' : ''}`.trim()
  }

  const handlePing = requireApeChain(async () => {
    if (!isConnected) {
      toast({ title: 'Wallet not connected', variant: 'destructive' })
      return
    }
    if (!pingReady) return
    try {
      setIsProcessing(true)
      await pingNFT(tokenIdDec)
      toast({ title: `Ping sent for #${tokenIdDec}` })
      // refetch data
      const updated = await getNFTGameData(tokenIdDec)
      setGameData(updated)
      if (onActionComplete) onActionComplete()
    } catch (e:any) {
      toast({ title: 'Ping error', description: e?.message, variant: 'destructive' })
    } finally {
      setIsProcessing(false)
    }
  });

  // Format CRA with proper wei to CRA conversion
  const formatCRADisplay = (wei: bigint): string => {
    const craAmount = parseFloat(formatEther(wei))
    return new Intl.NumberFormat('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(craAmount)
  }

  const highlightClass = "font-mono tabular-nums text-cyan-50"

  // Gray filter only if NFT cannot be pinged yet
  const hasActiveCooldown = !pingReady

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: isLiteMode ? 0 : index * 0.05 }}
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "transition-all duration-200 hover:shadow-cyan-400/30 hover:shadow-2xl rounded-2xl",
        hasActiveCooldown ? 'grayscale opacity-60' : '',
        isMobile && "hover:scale-100 hover:translate-y-0"
      )}
    >
      <Card className={`bg-gradient-to-br from-slate-900/85 via-slate-800/80 to-slate-900/85 border-2 border-slate-700/40 hover:border-orange-500/60 shadow-lg rounded-2xl flex flex-col w-full min-w-[200px] max-w-[260px] nft-card-padding backdrop-blur-md transition-colors duration-300`}>
        <div className="flex-1 flex flex-col justify-between">
          <CardHeader className="pb-1">
            <div className="aspect-square rounded-xl overflow-hidden relative w-full shadow-lg max-w-[160px] mx-auto">
              {nft.image ? (
                <Image 
                  src={nft.image} 
                  alt={`CrazyCube #${tokenIdDec}`} 
                  width={160} 
                  height={160} 
                  sizes="(max-width: 768px) 160px, 160px" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center" />
              )}
              {gameData && (
                <>
                  {/* Dynamic stars based on currentStars (falls back to rarity) */}
                  <div className="absolute top-1 left-1 flex gap-[2px] bg-black/70 rounded px-1 py-0.5">
                    {Array.from({ length: Math.min(6, gameData.currentStars || gameData.rarity || 1) }).map((_, idx) => (
                      <Star key={idx} className="w-3 h-3 text-sky-400" />
                    ))}
                  </div>
                  <Badge className={`absolute top-1 right-1 ${getColor(gameData.rarity)} text-white mobile-text-xs px-1 py-0.5 shadow-md`}>
                    {getLabel(gameData.rarity)}
                  </Badge>
                </>
              )}
            </div>
            
            <div className="mt-2 text-center">
              <h3 className="font-bold text-cyan-100 mobile-text-sm mb-1">
                Token #{tokenIdDec}
              </h3>
              <div className="flex items-center justify-center gap-1 mobile-text-xs">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-green-300 font-medium">Ready to Ping</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0 pb-2 px-2">
            {/* Rewards Section */}
            <div className="bg-slate-900/75 border border-slate-700/40 rounded-lg mobile-p-2 shadow-inner">
              <div className="text-center text-cyan-300 mb-2 font-bold mobile-text-xs uppercase tracking-wider">
                💰 Rewards
              </div>
              
              <div className="space-y-1.5">
                {/* Base per hour */}
                <div className="flex justify-between items-center py-1 px-2 bg-cyan-900/20 rounded border border-cyan-700/30">
                  <span className="text-cyan-300 nft-rewards-text">⏱️ Base /h</span>
                  <span className="font-bold text-cyan-100 font-mono nft-rewards-text">
                    {earnings ? formatCRADisplay(earnings.basePerHour) : '...'} CRA
                  </span>
                </div>

                {/* Rarity bonus */}
                <div className="flex justify-between items-center py-1 px-2 bg-yellow-900/20 rounded border border-yellow-700/30">
                  <span className="text-yellow-300 nft-rewards-text">⭐ Rarity</span>
                  <span className="font-bold text-yellow-100 font-mono nft-rewards-text">
                    +{earnings ? earnings.bonusPercent : 0}%
                  </span>
                </div>

                {/* Total per hour - highlighted */}
                <div className="flex justify-between items-center py-1.5 px-2 bg-gradient-to-r from-green-900/40 to-emerald-900/40 rounded border border-green-500/50">
                  <span className="text-green-300 nft-rewards-text font-semibold">💎 Total /h</span>
                  <span className="font-bold text-green-100 font-mono mobile-text-sm">
                    {earnings ? formatCRADisplay(earnings.totalPerHour) : '...'} CRA
                  </span>
                </div>

                {/* Next ping info */}
                <div className="flex justify-between items-center py-1 px-2 bg-purple-900/20 rounded border border-purple-700/30">
                  <span className="text-purple-300 nft-rewards-text">🎯 Next ping</span>
                  <span className="font-bold text-purple-100 font-mono nft-rewards-text">
                    {earnings ? formatCRADisplay(earnings.totalPerPing) : '...'} CRA
                  </span>
                </div>
              </div>
            </div>
          </CardContent>

          {/* Ping button with larger touch target */}
          <div className="px-2 pb-2 flex justify-center">
            <CoinBurst total={32}>
              <Button
                onClick={handlePing}
                disabled={!pingReady || isProcessing}
                className="neon-button mobile-button w-full max-w-[180px] touch-target no-select"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <SatelliteDish className="w-4 h-4 mr-2" />
                    Ping NFT
                  </>
                )}
              </Button>
            </CoinBurst>
          </div>
        </div>
      </Card>
    </motion.div>
  )
} 
