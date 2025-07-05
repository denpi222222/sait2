"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useNetwork } from "./use-network"

// This is a mock wallet context that would be replaced with real Solana wallet adapter
interface WalletContextType {
  connected: boolean
  connecting: boolean
  publicKey: string | null
  balance: number
  nfts: NFT[]
  connect: () => void
  disconnect: () => void
}

export interface NFT {
  id: string
  name: string
  image: string
  rarity: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Mythic"
  lastTransfer: Date
  rewardBalance: number
  frozen: boolean
}

const WalletContext = createContext<WalletContextType>({
  connected: false,
  connecting: false,
  publicKey: null,
  balance: 0,
  nfts: [],
  connect: () => {},
  disconnect: () => {},
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const { network } = useNetwork()
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)
  const [nfts, setNfts] = useState<NFT[]>([])

  // Update images in mockNFTs
  const mockNFTs: NFT[] = [
    {
      id: "cube1",
      name: "Sad Cube #1",
      image: "/images/cube1.png", // First cube
      rarity: "Common",
      lastTransfer: new Date(Date.now() - 48 * 60 * 60 * 1000),
      rewardBalance: 25,
      frozen: false,
    },
    {
      id: "cube2",
      name: "Cowboy Cube #42",
      image: "/images/cube2.png", // Second cube
      rarity: "Rare",
      lastTransfer: new Date(Date.now() - 12 * 60 * 60 * 1000),
      rewardBalance: 75,
      frozen: true,
    },
    {
      id: "cube3",
      name: "Glamour Cube #69",
      image: "/images/cube3.png", // Third cube
      rarity: "Epic",
      lastTransfer: new Date(Date.now() - 72 * 60 * 60 * 1000),
      rewardBalance: 120,
      frozen: false,
    },
    {
      id: "cube4",
      name: "Cool Green Cube #420",
      image: "/images/cube4.png", // Fourth cube
      rarity: "Uncommon",
      lastTransfer: new Date(Date.now() - 24 * 60 * 60 * 1000),
      rewardBalance: 50,
      frozen: false,
    },
    {
      id: "cube5",
      name: "Party Cube #777",
      image: "/images/party-cube.png", // Party cube
      rarity: "Legendary",
      lastTransfer: new Date(Date.now() - 36 * 60 * 60 * 1000),
      rewardBalance: 200,
      frozen: false,
    },
    {
      id: "cube6",
      name: "Worm Hat Cube #101",
      image: "/images/cube1.png", // First cube (reused)
      rarity: "Rare",
      lastTransfer: new Date(Date.now() - 60 * 60 * 60 * 1000),
      rewardBalance: 85,
      frozen: true,
    },
    {
      id: "cube7",
      name: "Ice Cream Cube #303",
      image: "/images/cube2.png", // Second cube (reused)
      rarity: "Epic",
      lastTransfer: new Date(Date.now() - 84 * 60 * 60 * 1000),
      rewardBalance: 150,
      frozen: false,
    },
  ]

  const connect = () => {
    setConnecting(true)
    // Simulate connection delay
    setTimeout(() => {
      setConnected(true)
      setPublicKey("CUB3x4x5x6x7x8x9xAxBxCxDxExFxGxHxJxKxL")
      setBalance(network === "devnet" ? 5000 : 1000)
      setNfts(mockNFTs)
      setConnecting(false)
    }, 1000)
  }

  const disconnect = () => {
    setConnected(false)
    setPublicKey(null)
    setBalance(0)
    setNfts([])
  }

  // Reset when network changes
  useEffect(() => {
    if (connected) {
      setBalance(network === "devnet" ? 5000 : 1000)
    }
  }, [network, connected])

  return (
    <WalletContext.Provider
      value={{
        connected,
        connecting,
        publicKey,
        balance,
        nfts,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}
