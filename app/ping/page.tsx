"use client"

import { ArrowLeft, SatelliteDish } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useAccount, useConnect } from "wagmi"
import { ParticleEffect } from "@/components/particle-effect"
import dynamic from "next/dynamic"
const CoinsAnimation = dynamic(() => import("@/components/coins-animation").then(m => m.CoinsAnimation), { ssr: false })
import { Button } from "@/components/ui/button"
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
            {t('ping.description', 'Ping your NFTs every 3 minutes to earn CRA tokens! Ping once every 3 minutes or once every 15 days, accumulation up to 15 days.')}
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
      {show && <SocialPromptModal tweetId={process.env.NEXT_PUBLIC_PROMO_TWEET_ID || "1937267010896818686"} onClose={close} />}
    </div>
  )
} 