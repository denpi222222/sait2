"use client"

// @ts-nocheck
/* eslint-disable */

import React, { useEffect, useState, useCallback } from "react"
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

function NFTPingCardComponent({ nft, index = 0, onActionComplete }: NFTPingCardProps) {
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
    if (!tokenIdDec) return
    let cancelled = false
    const load = async () => {
      try {
        const gd = await getNFTGameData(tokenIdDec)
        if (!cancelled) setGameData(gd)
      } catch (e) {
        console.error('getNFTGameData error', e)
      }
    }
    load()
    return () => { cancelled = true }
  }, [tokenIdDec, getNFTGameData])

  // Fetch earnings and multiplier
  // ------------------------------------------------------
  // Existing effect renamed
  useEffect(() => {
    let ignore = false
    const fetchData = async () => {
      if (!tokenIdDec) return
      try {
        setLoading(true)
        const client = createPublicClient({ chain: apeChain, transport: http() })
        const MINI_ABI = [
          { name: "sharePerPing", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
          { name: "rarityBonusBps", type: "function", stateMutability: "view", inputs: [{ type: "uint8" }], outputs: [{ type: "uint256" }] },
          { name: "currentMultiplierBps", type: "function", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }] },
        ] as const

        const rarity = gameData?.rarity ?? 0

        const [sharePerPingWei, rarityBps, multiplierBps] = await Promise.all([
          client.readContract({ address: GAME_ADDR, abi: MINI_ABI, functionName: "sharePerPing" }) as Promise<bigint>,
          client.readContract({ address: GAME_ADDR, abi: MINI_ABI, functionName: "rarityBonusBps", args: [rarity] }) as Promise<bigint>,
          client.readContract({ address: GAME_ADDR, abi: MINI_ABI, functionName: "currentMultiplierBps", args: [BigInt(tokenIdDec)] }) as Promise<bigint>,
        ])

        console.log('CONTRACT DEBUG:', { 
          sharePerPingWei: sharePerPingWei.toString(), 
          sharePerPingWeiFormatted: formatEther(sharePerPingWei),
          rarityBps: rarityBps.toString(),
          multiplierBps: multiplierBps.toString(),
          rarity 
        })

        // Rewards per ping (base) – already in wei
        const basePerPingWei = sharePerPingWei

        // Total reward per ping with rarity bonus
        const withRarityWei = basePerPingWei + (basePerPingWei * rarityBps) / 10000n
        const totalPerPingWei = (withRarityWei * multiplierBps) / 10000n

        // Rewards per hour – depends on ping interval (contract value; default to 180s)
        const safeInterval = pingInterval || 180
        const periodsPerHour = BigInt(Math.floor(3600 / safeInterval))
        const basePerHourWei = (basePerPingWei * periodsPerHour)
        const totalPerHourWei = (basePerHourWei * (10000n + rarityBps)) / 10000n

        // Per day (24h)
        const basePerDayWei = basePerHourWei * 24n
        const totalPerDayWei = totalPerHourWei * 24n

        // Convert bonus from basis points (bps) to a human-friendly percent value
        const rarityPercent = Number(rarityBps) / 100
        const streakPercent = (Number(multiplierBps) - 10000) / 100
        const bonusPercent = rarityPercent + streakPercent

        if (!ignore) setEarnings({
          basePerHour: basePerHourWei,
          totalPerHour: totalPerHourWei,
          basePerDay: basePerDayWei,
          totalPerDay: totalPerDayWei,
          bonusPercent,
          rarityPercent,
          streakPercent,
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
  }, [tokenIdDec, getNFTGameData, pingInterval, gameData])

  // Derived status – convert bigint values (from contract) to number for UI calculations
  const [nowSec, setNowSec] = useState(Math.floor(Date.now() / 1000))

  // Tick every second to keep countdown fresh (only while cooldown is active)
  useEffect(() => {
    const id = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const lastPingTimeSec = gameData ? Number(gameData.lastPingTime) : 0
  const isActivated = lastPingTimeSec !== 0
  const pingReady = gameData ? (!isActivated || nowSec > lastPingTimeSec + pingInterval) : false
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
      toast({ 
        title: t('wallet.notConnected', 'Wallet not connected'), 
        variant: 'destructive' 
      })
      return
    }
    if (!pingReady) return
    try {
      setIsProcessing(true)
      await pingNFT(tokenIdDec)
      toast({ title: t('ping.sentFor', `Ping sent for #${tokenIdDec}`) })
      // refetch data
      const updated = await getNFTGameData(tokenIdDec)
      setGameData(updated)
      if (onActionComplete) onActionComplete()
    } catch (e:any) {
      toast({ 
        title: t('ping.error', 'Ping error'), 
        description: e?.message, 
        variant: 'destructive' 
      })
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

  // Calculate CRA accumulated and available to collect with the next ping
  const pendingPeriods = isActivated && pingInterval > 0 ? Math.floor((nowSec - lastPingTimeSec) / pingInterval) : 0
  const pendingWei = earnings ? earnings.totalPerPing * BigInt(pendingPeriods) : 0n

  // Gray filter only if NFT cannot be pinged yet
  const hasActiveCooldown = !pingReady

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group scale-[0.75]"
    >
       <Card className={cn(
         "bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-2 rounded-xl transition-all duration-300 hover:scale-105",
         hasActiveCooldown ? 'opacity-60 grayscale pointer-events-none' : 'border-slate-700 hover:border-orange-500/50'
       )}>
          <div className="flex-1 flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="aspect-square rounded-lg overflow-hidden relative w-full shadow-lg max-w-[112px] mx-auto">
                {nft.image ? (
                  <Image 
                    src={nft.image} 
                    alt={`CrazyCube #${tokenIdDec}`} 
                    width={112} 
                    height={112} 
                    sizes="112px" 
                    className="w-full h-full object-cover" 
                    priority={index < 6}
                    loading={index < 6 ? 'eager' : 'lazy'}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center" />
                )}
                {gameData && (
                  <>
                    {/* Rarity badge at very top-left */}
                    <Badge className={`absolute top-1 left-1 ${getColor(gameData.rarity)} text-white text-[8px] px-1 py-0.5 rounded shadow`}>
                      {getLabel(gameData.rarity)}
                    </Badge>
                    {(!isActivated) && (
                      <div className="absolute bottom-1 left-1 bg-orange-600/80 text-[10px] text-white px-1 rounded">Activate</div>
                    )}
                    {/* Stars: vertical column on the right side of the image */}
                    <div className="absolute top-1 right-1 flex flex-col gap-[2px] bg-black/60 rounded px-0.5 py-0.5">
                      {Array.from({ length: Math.min(6, gameData.rarity || 1) }).map((_, idx) => (
                        <Star key={idx} className="w-3 h-3 text-sky-400" />
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              <div className="mt-1 text-center">
                <h3 className="font-semibold text-cyan-100 text-xs mb-0.5">
                  #{tokenIdDec}
                </h3>
                {pingReady ? (
                  <div className="flex items-center justify-center gap-1 text-[10px]">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span className="text-green-300 font-medium">Ready to Ping</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1 text-[10px] text-orange-300">
                    <Clock className="w-3 h-3" />
                    <span>{formatDuration(timeLeft)} left</span>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-0 pb-2 px-2 text-[10px] space-y-1">
              <div className="flex justify-between text-cyan-300">
                <span>Base/h</span>
                <span className="font-mono font-semibold text-cyan-100">
                  {earnings ? formatCRADisplay(earnings.basePerHour) : '...'}
                </span>
              </div>
              <div className="flex justify-between text-yellow-300">
                <span>Rarity</span>
                <span className="font-mono font-semibold text-yellow-100">+{earnings ? earnings.rarityPercent.toFixed(1) : 0}%</span>
              </div>
              <div className="flex justify-between text-orange-300">
                <span>{earnings && earnings.streakPercent >= 0 ? 'Streak' : 'Penalty'}</span>
                <span className="font-mono font-semibold text-orange-100">{earnings && earnings.streakPercent>=0?'+':''}{earnings ? earnings.streakPercent.toFixed(1) : 0}%</span>
              </div>
              <div className="flex justify-between text-amber-300">
                <span>Total Bonus</span>
                <span className="font-mono font-semibold text-amber-100">{earnings && earnings.bonusPercent>=0?'+':''}{earnings ? earnings.bonusPercent.toFixed(1) : 0}%</span>
              </div>
              <div className="flex justify-between text-emerald-300 font-semibold">
                <span>24h</span>
                <span className="font-mono text-emerald-100">
                  {earnings ? formatCRADisplay(earnings.totalPerDay) : '...'}
                </span>
              </div>
              <div className="flex justify-between text-lime-300 font-semibold">
                <span>Pending</span>
                <span className="font-mono text-lime-100">
                  {earnings ? formatCRADisplay(pendingWei) : '0.00'}
                </span>
              </div>
            </CardContent>

            {/* Ping button */}
            <div className="px-2 pb-2">
              <Button
                variant={pingReady ? 'default' : 'outline'}
                className={
                  pingReady
                    ? 'w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
                    : 'w-full border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10'
                }
                onClick={handlePing}
                disabled={isProcessing || !pingReady}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <SatelliteDish className="mr-2 h-4 w-4" /> {isActivated ? 'Ping NFT' : 'Activate NFT'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
    </motion.div>
  )
}
export default React.memo(NFTPingCardComponent, (prev, next) => {
  return prev.nft.id === next.nft.id && prev.nft.stars === next.nft.stars && prev.nft.rewardBalance === next.nft.rewardBalance
}) 

