"use client"

import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useChainId, useSwitchChain } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { useState, useCallback } from 'react'
import { useGraveyardTokens } from './useGraveyardTokens'
import { apeChain } from '@/config/chains'
import { toast } from '@/hooks/use-toast'
import { formatWithCommas } from '@/utils/formatNumber'

// ABI for the game contract CrazyCubeUltimate
const GAME_CONTRACT_ABI = [
  // Read functions
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "nftData",
    "outputs": [
      {"internalType": "uint8", "name": "rarity", "type": "uint8"},
      {"internalType": "uint8", "name": "initialStars", "type": "uint8"},
      {"internalType": "bool", "name": "isActivated", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "nftState",
    "outputs": [
      {"internalType": "uint8", "name": "currentStars", "type": "uint8"},
      {"internalType": "uint256", "name": "lockedCRA", "type": "uint256"},
      {"internalType": "uint256", "name": "lastPingTime", "type": "uint256"},
      {"internalType": "uint256", "name": "lastBreedTime", "type": "uint256"},
      {"internalType": "bool", "name": "isInGraveyard", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "getBurnRecord",
    "outputs": [
      {"internalType": "uint256", "name": "lockedAmount", "type": "uint256"},
      {"internalType": "uint8", "name": "waitPeriod", "type": "uint8"},
      {"internalType": "uint256", "name": "burnTime", "type": "uint256"},
      {"internalType": "bool", "name": "claimed", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBreedCostCRA",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalBurned",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "burnFeeBps",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pingInterval",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "breedCooldown",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType":"uint8","name":"","type":"uint8"}],
    "name": "burnSplits",
    "outputs": [
      {"internalType":"uint16","name":"playerBps","type":"uint16"},
      {"internalType":"uint16","name":"poolBps","type":"uint16"},
      {"internalType":"uint16","name":"burnBps","type":"uint16"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nftContract",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "craToken",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "burnRecords",
    "outputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "uint256", "name": "totalAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "claimAvailableTime", "type": "uint256"},
      {"internalType": "uint256", "name": "graveyardReleaseTime", "type": "uint256"},
      {"internalType": "bool", "name": "claimed", "type": "bool"},
      {"internalType": "uint8", "name": "waitPeriod", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Write functions
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "ping",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"internalType": "uint8", "name": "waitHours", "type": "uint8"}
    ],
    "name": "burnNFT",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "claimBurnRewards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "parent1Id", "type": "uint256"},
      {"internalType": "uint256", "name": "parent2Id", "type": "uint256"},
      {"internalType": "bytes32", "name": "userRandom", "type": "bytes32"}
    ],
    "name": "requestBreed",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

// ABI for the CRA token
const CRA_TOKEN_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// Contract addresses from config
const GAME_CONTRACT_ADDRESS = apeChain.contracts.gameProxy.address
const CRA_TOKEN_ADDRESS = apeChain.contracts.crazyToken.address

const APE_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 33139)

const ERC721_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export interface NFTGameData {
  tokenId: string
  rarity: number
  initialStars: number
  currentStars: number
  isActivated: boolean
  lockedCRA: string
  lockedCRAWei: bigint
  lastPingTime: number
  lastBreedTime: number
  isInGraveyard: boolean
}

export interface BurnRecord {
  tokenId: string
  lockedAmount: string
  waitPeriod: number
  burnTime: number
  claimed: boolean
  canClaim: boolean
  timeLeft: number
  claimAvailableTime?: number
  graveyardReleaseTime?: number
}

export const useCrazyCubeGame = () => {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [isLoading, setIsLoading] = useState(false)

  // Use graveyard hook to inform front-end when cooldown is finished
  const { ready: graveyardReady } = useGraveyardTokens()

  // Write contract hook
  const { writeContractAsync, isPending: isWritePending, data: txHash, error: writeError } = useWriteContract()
  
  // Transaction receipt
  const { 
    isLoading: isTxLoading, 
    isSuccess: isTxSuccess, 
    isError: isTxError,
    error: txError 
  } = useWaitForTransactionReceipt({ hash: txHash })

  // Read CRA balance
  const { data: craBalance, refetch: refetchCraBalance } = useReadContract({
    address: CRA_TOKEN_ADDRESS,
    abi: CRA_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // Read breed cost (raw wei)
  const { data: breedCost } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'getBreedCostCRA',
  })

  // Format breed cost to human-readable CRA (handle possible double-scaling)
  let breedCostFormatted = '0.00'
  if (breedCost) {
    try {
      const craVal = parseFloat(formatEther(breedCost as bigint))
      breedCostFormatted = craVal.toFixed(2)
    } catch {
      breedCostFormatted = '0.00'
    }
  }

  // Read burn fee (in bps)
  const { data: burnFeeBpsData } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'burnFeeBps',
    query: { enabled: true }
  })
  const burnFeeBps = burnFeeBpsData ? Number(burnFeeBpsData) : 0

  // Read ping interval (seconds)
  const { data: pingIntervalData } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'pingInterval',
    query: { enabled: true }
  })
  const pingInterval = pingIntervalData ? Number(pingIntervalData) : 0

  // Read breed cooldown (seconds)
  const { data: breedCooldownData } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'breedCooldown',
    query: { enabled: true }
  })
  const breedCooldown = breedCooldownData ? Number(breedCooldownData) : 0

  // Read current number of NFTs in graveyard (totalBurned)
  const { data: graveyardSize } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'totalBurned',
  })

  const publicClient = usePublicClient()

  // Ability to switch chain automatically if wallet supports it
  const { switchChain } = useSwitchChain()

  const ensureNetwork = useCallback(async () => {
    if (chainId !== APE_CHAIN_ID) {
      try {
        await switchChain({ chainId: APE_CHAIN_ID })
        console.log("✅ Switched to ApeChain")
        return true
      } catch (error) {
        console.error("Failed to switch network:", error)
        // Consider showing a toast or modal to the user here
        throw new Error("Please switch to ApeChain network.")
      }
    }
    return true
  }, [chainId, switchChain])

  // Get NFT game data
  const getNFTGameData = useCallback(async (tokenId: string): Promise<NFTGameData | null> => {
    if (!publicClient) return null
    try {
      const [dataStatic, dataDynamic]: any = await Promise.all([
        publicClient.readContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'nftData',
          args: [BigInt(tokenId)]
        }),
        publicClient.readContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'nftState',
          args: [BigInt(tokenId)]
        })
      ])

      const result: NFTGameData = {
        tokenId: tokenId,
        rarity: Number(dataStatic[0]),
        initialStars: Number(dataStatic[1]),
        isActivated: dataStatic[2],
        currentStars: Number(dataDynamic[0]),
        lockedCRA: formatEther(dataDynamic[1] as bigint),
        lockedCRAWei: dataDynamic[1] as bigint,
        lastPingTime: Number(dataDynamic[2]),
        lastBreedTime: Number(dataDynamic[3]),
        isInGraveyard: dataDynamic[4]
      }

      return result
    } catch (error) {
      console.error('Error getting NFT game data:', error)
      return null
    }
  }, [publicClient])

  // Get burn record - updated for new contract structure
  const getBurnRecord = useCallback(async (tokenId: string): Promise<BurnRecord | null> => {
    if (!publicClient) return null
    try {
      const data: any = await publicClient.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'burnRecords',
        args: [BigInt(tokenId)]
      })

      const now = Math.floor(Date.now() / 1000)
      
      // New contract structure: [owner, totalAmount, claimAvailableTime, graveyardReleaseTime, claimed, waitPeriod]
      const burnRecord: BurnRecord = {
        tokenId,
        lockedAmount: formatEther(data[1] as bigint), // totalAmount
        waitPeriod: Number(data[5]), // waitPeriod
        burnTime: Number(data[2]), // use claimAvailableTime as burnTime for compatibility
        claimed: data[4], // claimed
        canClaim: !data[4] && now >= Number(data[2]), // can claim if not claimed and time has come
        timeLeft: Math.max(0, Number(data[2]) - now), // time until claim
        claimAvailableTime: Number(data[2]), // claimAvailableTime
        graveyardReleaseTime: Number(data[3]) // graveyardReleaseTime for breeding
      }
      
      console.log(`🔍 Burn record for #${tokenId}:`, {
        claimAvailableTime: new Date(burnRecord.claimAvailableTime! * 1000).toLocaleString(),
        graveyardReleaseTime: new Date(burnRecord.graveyardReleaseTime! * 1000).toLocaleString(),
        now: new Date(now * 1000).toLocaleString(),
        claimed: burnRecord.claimed
      })
      
      return burnRecord
    } catch (e) {
      console.error('getBurnRecord error for', tokenId, e)
      return null
    }
  }, [publicClient])

  // Ping NFT
  const pingNFT = useCallback(async (tokenId: string) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Wallet not connected')
    }
    try {
      await ensureNetwork()
      const hash = await writeContractAsync({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'ping',
        args: [BigInt(tokenId)],
        gas: BigInt(300000)
      })
      return hash
    } catch (error) {
      console.error('Ping error:', error)
      throw error
    }
  }, [writeContractAsync, isConnected, ensureNetwork])

  // Burn NFT
  const burnNFT = useCallback(async (tokenId: string, waitHours: 12 | 24 | 48) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Wallet not connected')
    }

    try {
      await ensureNetwork()
      const hash = await writeContractAsync({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'burnNFT',
        args: [BigInt(tokenId), waitHours],
        gas: BigInt(500000)
      })
      return hash
    } catch (error) {
      console.error('Burn error:', error)
      throw error
    }
  }, [writeContractAsync, isConnected, ensureNetwork])

  // Claim burn rewards
  const claimBurnRewards = useCallback(async (tokenId: string) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Wallet not connected')
    }

    try {
      await ensureNetwork()
      const hash = await writeContractAsync({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'claimBurnRewards',
        args: [BigInt(tokenId)],
        maxFeePerGas: BigInt("30000000000"), // 30 gwei
        maxPriorityFeePerGas: BigInt("1500000000") // 1.5 gwei tip
      })
      return hash
    } catch (error) {
      console.error('Claim error:', error)
      throw error
    }
  }, [writeContractAsync, isConnected, ensureNetwork])

  // Breed NFTs
  const breedNFTs = useCallback(async (parent1Id: string, parent2Id: string) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Wallet not connected')
    }

    try {
      await ensureNetwork()
      const hash = await writeContractAsync({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'requestBreed',
        args: [BigInt(parent1Id), BigInt(parent2Id), `0x${Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')}` as `0x${string}`],
        gas: BigInt(800000)
      })
      return hash
    } catch (error) {
      console.error('Breed error:', error)
      throw error
    }
  }, [writeContractAsync, isConnected, ensureNetwork])

  // Approve CRA tokens
  const approveCRA = useCallback(async (amount: string) => {
    if (!writeContractAsync || !isConnected) {
      throw new Error('Wallet not connected')
    }

    try {
      await ensureNetwork()
      
      // Add 10% buffer to amount to avoid shortage of pennies due to rounding
      const baseAmount = parseEther(amount)
      const bufferAmount = (baseAmount * BigInt(110)) / BigInt(100) // +10%
      
      console.log(`💰 Approving CRA: ${amount} + 10% buffer = ${formatEther(bufferAmount)}`)
      
      const hash = await writeContractAsync({
        address: CRA_TOKEN_ADDRESS,
        abi: CRA_TOKEN_ABI,
        functionName: 'approve',
        args: [GAME_CONTRACT_ADDRESS, bufferAmount],
        gas: BigInt(100000)
      })
      return hash
    } catch (error) {
      console.error('Approve error:', error)
      throw error
    }
  }, [writeContractAsync, isConnected, ensureNetwork])

  // Approve single NFT for the game contract
  const approveNFT = useCallback(async (tokenId: string) => {
    if (!writeContractAsync || !isConnected || !publicClient) throw new Error('Wallet not connected')

    // Read NFT contract address from game contract
    const nftAddress: `0x${string}` = await publicClient.readContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: 'nftContract',
    }) as `0x${string}`

    const hash = await writeContractAsync({
      address: nftAddress,
      abi: ERC721_ABI,
      functionName: 'approve',
      args: [GAME_CONTRACT_ADDRESS, BigInt(tokenId)],
      gas: BigInt(100000)
    })
    return hash
  }, [writeContractAsync, isConnected, publicClient])

  // Get burn split for given wait hours (12,24,48)
  const getBurnSplit = useCallback(async (waitHours: 12 | 24 | 48) => {
    if (!publicClient) return { playerBps: 0, poolBps: 0, burnBps: 0 };
    try {
      const split: any = await publicClient.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'burnSplits',
        args: [BigInt(waitHours) as any],
      })
      // struct BurnSplit { uint16 playerBps; uint16 poolBps; uint16 burnBps; }
      return {
        playerBps: Number(split.playerBps || split[0]),
        poolBps: Number(split.poolBps || split[1]),
        burnBps: Number(split.burnBps || split[2]),
      }
    } catch (e) {
      console.error('getBurnSplit error', e)
      return { playerBps: 0, poolBps: 0, burnBps: 0 }
    }
  }, [publicClient])

  return {
    // State
    isConnected,
    address,
    isLoading,
    
    // Contract data
    craBalance: craBalance ? formatEther(craBalance) : '0',
    breedCost: breedCostFormatted,
    burnFeeBps,
    graveyardSize: graveyardSize ? Number(graveyardSize) : 0,
    
    // Transaction state
    isWritePending,
    isTxLoading,
    isTxSuccess,
    isTxError,
    txHash,
    writeError,
    txError,
    
    // Functions
    getNFTGameData,
    getBurnRecord,
    pingNFT,
    burnNFT,
    claimBurnRewards,
    breedNFTs,
    approveCRA,
    approveNFT,
    getBurnSplit,
    refetchCraBalance,
    
    // Contract addresses for external use
    GAME_CONTRACT_ADDRESS,
    CRA_TOKEN_ADDRESS,
    GAME_CONTRACT_ABI,
    CRA_TOKEN_ABI,
    ERC721_ABI,
    
    // Game parameters
    pingInterval,
    breedCooldown,

    // Graveyard readiness flag
    ready: graveyardReady
  }
}
