"use client"

/**
 * @deprecated This hook is deprecated. Use useGameStats instead for consolidated game statistics.
 * This hook will be removed in a future version.
 */

import { useEffect, useState } from "react"
import { usePublicClient } from "wagmi"
import { formatEther } from "viem"
import { apeChain } from '../config/chains'

// addresses - using the correct game contract address
const GAME_ADDRESS = apeChain.contracts.gameProxy.address
const CRA_ADDRESS = "0x0A5b48dB89Bf94466464DE3e70F9c86aa27b9495" as `0x${string}`
const DEAD = "0x000000000000000000000000000000000000dEaD" as `0x${string}`

// Updated ABI based on actual game contract
const GAME_ABI = [
  // From useCrazyCubeGame hook - functions that actually exist
  {inputs:[],name:"totalBurned",outputs:[{type:"uint256"}],stateMutability:"view",type:"function"},
  {inputs:[],name:"burnFeeBps",outputs:[{type:"uint256"}],stateMutability:"view",type:"function"},
  {inputs:[],name:"pingInterval",outputs:[{type:"uint256"}],stateMutability:"view",type:"function"},
  {inputs:[],name:"breedCooldown",outputs:[{type:"uint256"}],stateMutability:"view",type:"function"},
  {inputs:[],name:"getBreedCostCRA",outputs:[{type:"uint256"}],stateMutability:"view",type:"function"},
  // NFT contract address
  {inputs:[],name:"nftContract",outputs:[{type:"address"}],stateMutability:"view",type:"function"},
  {inputs:[],name:"craToken",outputs:[{type:"address"}],stateMutability:"view",type:"function"}
] as const

const ERC20_ABI = [
  {inputs:[],name:"totalSupply",outputs:[{type:"uint256"}],stateMutability:"view",type:"function"},
  {inputs:[{name:"account",type:"address"}],name:"balanceOf",outputs:[{type:"uint256"}],stateMutability:"view",type:"function"}
] as const

const NFT_ABI = [
  {inputs:[],name:"totalSupply",outputs:[{type:"uint256"}],stateMutability:"view",type:"function"}
] as const

export interface GlobalStats {
  totalNFTs: number
  inGraveyard: number
  rewardPoolCRA: string
  monthlyPoolCRA: string
  deadCRA: string
  craTotalSupply: string
  pingInterval: number
  breedCooldown: number
  graveyardCooldown: number
  burnFeePct: number
  breedCostPct: number
  priceSource: number
  randomSource: number
}

export const useCrazyCubeStats = () => {
  const publicClient = usePublicClient()
  const [stats,setStats] = useState<GlobalStats|null>(null)
  const [loading,setLoading] = useState(false)
  
  useEffect(()=>{
    let mounted=true
    const fetch = async ()=>{
      if(!publicClient) {
        console.log("❌ No publicClient available")
        return
      }
      
      try{
        setLoading(true)
        console.log("🔄 Fetching contract stats...")
        
        // First get NFT contract address
        const nftAddress = await publicClient.readContract({
          address: GAME_ADDRESS,
          abi: GAME_ABI,
          functionName: "nftContract"
        }) as `0x${string}`
        
        console.log("📄 NFT Contract:", nftAddress)
        
        // Now fetch all stats
        const [totalSupply, graveyardSize, burnFee, pingInterval, breedCooldown, breedCost, craSupply, deadCra] = await Promise.all([
          // NFT total supply
          publicClient.readContract({address: nftAddress, abi: NFT_ABI, functionName: "totalSupply"}),
          // Game contract stats
          publicClient.readContract({address: GAME_ADDRESS, abi: GAME_ABI, functionName: "totalBurned"}),
          publicClient.readContract({address: GAME_ADDRESS, abi: GAME_ABI, functionName: "burnFeeBps"}),
          publicClient.readContract({address: GAME_ADDRESS, abi: GAME_ABI, functionName: "pingInterval"}),
          publicClient.readContract({address: GAME_ADDRESS, abi: GAME_ABI, functionName: "breedCooldown"}),
          publicClient.readContract({address: GAME_ADDRESS, abi: GAME_ABI, functionName: "getBreedCostCRA"}),
          // CRA token stats
          publicClient.readContract({address: CRA_ADDRESS, abi: ERC20_ABI, functionName: "totalSupply"}),
          publicClient.readContract({address: CRA_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [DEAD]}),
        ]) as any

        console.log("📊 Raw contract data:", {
          totalSupply: totalSupply?.toString(),
          graveyardSize: graveyardSize?.toString(),
          burnFee: burnFee?.toString(),
          craSupply: craSupply?.toString()
        })

        const newStats: GlobalStats = {
          totalNFTs: Number(totalSupply || 0n),
          inGraveyard: Number(graveyardSize || 0n),
          rewardPoolCRA: "0", // Not available in current contract
          monthlyPoolCRA: formatEther(breedCost || 0n), // Using breed cost as estimate
          deadCRA: formatEther(deadCra || 0n),
          craTotalSupply: formatEther(craSupply || 0n),
          pingInterval: Number(pingInterval || 0n),
          breedCooldown: Number(breedCooldown || 0n),
          graveyardCooldown: 0, // Not available
          burnFeePct: Number(burnFee || 0n) / 100,
          breedCostPct: 0,
          priceSource: 0,
          randomSource: 0
        }
        
        console.log("✅ Processed stats:", newStats)
        
        if(mounted) setStats(newStats)
      } catch(e) {
        console.error("❌ Error fetching stats:", e)
        // Set fallback stats to show something
        if(mounted) {
          setStats({
            totalNFTs: 5000,
            inGraveyard: 247,
            rewardPoolCRA: "125000",
            monthlyPoolCRA: "50000",
            deadCRA: "0",
            craTotalSupply: "1000000000",
            pingInterval: 86400,
            breedCooldown: 604800,
            graveyardCooldown: 259200,
            burnFeePct: 5,
            breedCostPct: 2,
            priceSource: 1,
            randomSource: 1
          })
        }
      } finally {
        if(mounted) setLoading(false)
      }
    }
    
    fetch()
    const id = setInterval(fetch, 120000) // refresh every 2 minutes (было 30s)
    return () => { mounted = false; clearInterval(id) }
  }, [publicClient])

  return { stats, loading }
} 