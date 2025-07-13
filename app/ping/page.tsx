"use client"

import { ArrowLeft, SatelliteDish } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useAccount, useConnect } from "wagmi"
import { ParticleEffect } from "@/components/particle-effect"
import dynamic from "next/dynamic"
const CoinsAnimation = dynamic(() => import("@/components/coins-animation").then(m => m.CoinsAnimation), { ssr: false })
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BookOpen } from "lucide-react"
import { useMobile } from "@/hooks/use-mobile"
import { useAlchemyNfts } from "@/hooks/useAlchemyNfts"
import NFTPingCard from "@/components/NFTPingCard"
import { useCrazyCubeGame } from "@/hooks/useCrazyCubeGame"
import { motion } from "framer-motion"
import { WalletConnectNoSSR as WalletConnect } from "@/components/web3/wallet-connect.no-ssr"
import { TabNavigation } from "@/components/tab-navigation"
import { LazyLoad } from "@/components/LazyLoad"
import { Skeleton } from "@/components/ui/skeleton"
import { useSocialPrompt } from "@/hooks/use-social-prompt"
import { SocialPromptModal } from "@/components/SocialPromptModal"
import { usePerformanceContext } from "@/hooks/use-performance-context"
import { useTranslation } from "react-i18next"

export default function PingPage() {
  const { t } = useTranslation()
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { nfts, isLoading: isLoadingNFTs, error, refetch } = useAlchemyNfts()
  const [mounted, setMounted] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const { isMobile } = useMobile()
  const { pingInterval } = useCrazyCubeGame()

  const { isLiteMode } = usePerformanceContext()

  // track ping success
  const [pingedNow, setPingedNow] = useState(false)
  const { show, close } = useSocialPrompt(address, pingedNow)

  const handlePingSuccessWrapper = () => {
    setPingedNow(true)
    // reset flag after evaluation to avoid repeated opens until next ping
    setTimeout(() => setPingedNow(false), 100)
  }

  // Auto-show guide logic
  useEffect(() => {
    if (!isConnected || !address) return
    
    const GUIDE_STORAGE_KEY = `crazycube_guide_shown_${address}`
    const lastShown = localStorage.getItem(GUIDE_STORAGE_KEY)
    const now = Date.now()
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    
    // Show if never shown or 7+ days passed
    if (!lastShown || (now - parseInt(lastShown)) > sevenDaysMs) {
      setShowGuide(true)
      localStorage.setItem(GUIDE_STORAGE_KEY, now.toString())
    }
  }, [isConnected, address])

  const gameGuideContent = `🎮 CrazyCube Game Guide

🔹 Getting Started
• Get CRA tokens — for gas fees and game actions
• Buy CrazyCube NFTs on the marketplace

🔹 How to Start Playing
• Go to the Ping tab — you'll see your NFTs
• For a new cube, press Activate — this is the first Ping, it doesn't give CRA but starts the timer
• After activation, you can ping (click Ping). Default is once every 10 days, rewards start accumulating
• Each successful Ping brings CRA — amount depends on:
  - Cube rarity (Common, Rare, Mystic, etc.)
  - Your experience bonus — grows every 10 days without missing pings
  - Time between pings (if more periods passed, more CRA)

🔹 What is Experience Bonus
• Initially all cubes have -18.9% penalty
• Every 10 days without missing — +2.7%
• Maximum you can reach +97.2%
• If you miss more than 10 days — bonus won't increase
• If you miss 20+ days — bonus resets to -18.9%

🔹 How to Get CRA
• CRA doesn't drop to wallet immediately, but accumulates inside the cube (this way each NFT has real value)
• To collect — you need to burn the cube (Burn) (your cube goes to graveyard section and no longer belongs to you, you get CRA coins in the claim section)

🔹 How to Burn
• Go to Burn section
• Choose cube and waiting time:
  - 12 hours → 60% to player
  - 24 hours → 70%
  - 48 hours → 80%
• The rest is split between pool and permanent burning (goes to official dead wallet)
• After chosen time, go and press Claim — CRA will come to your wallet

🔹 How to Revive Cube (Breed)
• Go to Breed section
• Choose 2 living cubes (that have stars and are not in cooldown)
• Pay CRA (8% of minimum marketplace price, constantly updated)
• Random NFT from graveyard will return to you as new, with all stars but no coins:
  - Bonus is reset (back to -18.9%)
  - Stars are restored
  - Can ping again from scratch

🔹 Where CRA is in the System
• CRA for Ping comes from monthly reward pool
• CRA spent on Breed returns to this pool
• CRA from Burn burns forever
• Everything burned goes to special wallet 0x...dead and disappears forever

🔹 Example Strategy
You have three cubes:
• Common (regular) — ping it, bonus grows by 2.7% every 10 days up to 97%, then stops. Can sell, transfer NFT, bonus is preserved
• Rare — use for Breed or accumulate CRA
• Mystic — rare, brings more CRA, better not to burn

Play calmly:
• Once every 10 days log in and press Ping
• Periodically burn weak cubes → get tokens
• Or revive dead ones — get chance for rarer one

💡 Tips
Want maximum profit — ping regularly and don't burn rare cubes too early.
💥 Burned tokens won't return — this increases the value of remaining CRA.

🚀 Our Vision
Our plans within 1-2 months are to adjust the gameplay and renounce admin rights on NFT and token contracts. We want to conduct a social experiment and create fully social gameplay where there are no possibilities to change anything — only market and people decide.

The team has no bonuses in the contract in the form of CRA coins. You can create a wallet, for example, in Rabby wallet in 1 minute and play our game.

Soon our game will be 100% decentralized with market self-regulation.`

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleConnect = () => {
    const injected = connectors.find(c => c.type === 'injected')
    if (injected) connect({ connector: injected })
  }

  if (!mounted) return (<div className="min-h-screen bg-gradient-to-br from-sky-900 via-cyan-900 to-sky-900 flex items-center justify-center text-white">{t('common.loading', 'Loading...')}</div>)

  return (
    <div className={`min-h-screen bg-gradient-to-br from-sky-900 via-cyan-900 to-sky-900 p-4 ${isLiteMode ? 'lite-mode' : ''}`}>
      {/* Cosmic rain of golden cubes */}
      {!isLiteMode && (
        <>
          <CoinsAnimation intensity={isMobile ? 0.8 : 1.4} theme="blue" />
          <ParticleEffect count={isMobile?12:20} colors={["#38bdf8","#06b6d4","#0ea5e9"]} speed={isMobile?0.3:0.5} size={isMobile?3:5} />
        </>
      )}
      <div className="container mx-auto relative z-10">
        <header className="mb-3 flex items-center justify-between">
          <Link href="/">
            <Button variant="outline" className="border-cyan-500/30 bg-black/20 text-cyan-300 hover:bg-black/40">
              <ArrowLeft className="mr-2 w-4 h-4" /> {t('navigation.home', 'Home')}
            </Button>
          </Link>
          
          <TabNavigation color="sky" />
          
          <WalletConnect />
        </header>

        {/* Page Title and Info */}
        <div className="text-center mb-3">
          <p className="text-cyan-300/80 text-xs font-medium leading-relaxed max-w-xl mx-auto">
            {t('ping.description', 'Ping your NFTs every 10 days to earn CRA tokens! Your bonus grows with consistent pinging.')}
          </p>
        </div>

        {!isConnected ? (
          <div className="text-center py-12">
            <SatelliteDish className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
            <p className="text-cyan-200 mb-4">{t('ping.connectWallet', 'Connect wallet to view your cubes')}</p>
            <Button onClick={handleConnect} className="bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500"><motion.span animate={{opacity:[0.5,1,0.5]}} transition={{duration:1.5,repeat:Infinity}}>{t('wallet.connect', 'Connect Wallet')}</motion.span></Button>
          </div>
        ) : isLoadingNFTs ? (
          <div className="text-center text-cyan-200">{t('common.loadingNFTs', 'Loading NFTs...')}</div>
        ) : nfts.length === 0 ? (
          <div className="text-center text-cyan-200">{t('ping.noNFTs', 'No CrazyCube NFTs found.')}</div>
        ) : (
          <LazyLoad placeholder={<Skeleton className="h-64 w-full bg-sky-800/30" />}>
            <div className="nft-card-grid">
              {nfts.map((nft, idx) => (
                <NFTPingCard key={idx} nft={nft} index={idx} onActionComplete={() => { refetch(); handlePingSuccessWrapper() }} />
              ))}
            </div>
          </LazyLoad>
        )}
      </div>
      
      {/* Auto-show Game Guide Modal */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-2xl max-h-[80vh] bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-cyan-400" />
              {t('wallet.gameGuide', 'CrazyCube Game Guide')}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="text-slate-300 whitespace-pre-line text-sm leading-relaxed">
              {gameGuideContent}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {show && <SocialPromptModal tweetId={process.env.NEXT_PUBLIC_PROMO_TWEET_ID || "1937267010896818686"} onClose={close} />}
    </div>
  )
} 