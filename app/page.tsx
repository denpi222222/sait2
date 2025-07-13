"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Heart, Flame, Coins, BarChart3, SatelliteDish, Skull } from "lucide-react"
import Image from "next/image"

import { useTranslation } from "react-i18next"
import { TabNavigation } from "@/components/tab-navigation"
import dynamic from "next/dynamic"
import { withIdleImport } from "@/components/withIdleImport"
import { WalletConnectNoSSR as WalletConnect } from "@/components/web3/wallet-connect.no-ssr"
import { SocialSidebar } from "@/components/social-sidebar"
import { UserNFTsPreview } from "@/components/UserNFTsPreview"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { PerformanceModeToggle } from "@/components/performance-mode-toggle"
import { usePerformanceContext } from "@/hooks/use-performance-context"
import { useNetwork } from "@/hooks/use-network"
import { NetworkSwitchProgress } from "@/components/NetworkSwitchProgress"

// Dynamically import the I18nLanguageSwitcher with no SSR
const I18nLanguageSwitcher = dynamic(
  () => import("@/components/i18n-language-switcher").then((mod) => mod.I18nLanguageSwitcher),
  { ssr: false },
)

// Dynamic imports of heavy animations with conditional loading
// @ts-ignore - Complex type resolution for dynamic imports
const CubeAnimation = withIdleImport(() => import("@/components/cube-animation").then(m=>({default:m.CubeAnimation})))
const FireAnimation = withIdleImport(() => import("@/components/fire-animation"))
// @ts-ignore - Complex type resolution for dynamic imports
const CoinsAnimation = withIdleImport(() => import("@/components/coins-animation").then(m=>({default:m.CoinsAnimation})))
// @ts-ignore - Complex type resolution for dynamic imports  
const StatsAnimation = withIdleImport(() => import("@/components/stats-animation").then(m=>({default:m.StatsAnimation})))
// Lazy-loaded particle effect with performance check
// @ts-ignore - Complex type resolution for dynamic imports
const ParticleEffect = withIdleImport(() => import("@/components/particle-effect").then(m=>({default:m.ParticleEffect})))

export default function HomePage() {
  // Use translation hook
  const { t } = useTranslation()
  const { isLiteMode, isMobile, isWeakDevice } = usePerformanceContext()

  const { isConnected: connected, address: account } = useAccount()
  const { isApeChain, isSwitching, switchAttempts, forceSwitchToApeChain } = useNetwork()
  const [balance, setBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)

  // Performance-aware animation settings
  const shouldShowParticles = !isLiteMode && !isWeakDevice
  const particleCount = isMobile ? 8 : isWeakDevice ? 5 : 15
  const animationIntensity = isLiteMode ? 0.1 : isWeakDevice ? 0.3 : 0.5

  // States for hover effects - memoized with useMemo
  const [bridgeHovered, setBridgeHovered] = useState(false)
  const [burnHovered, setBurnHovered] = useState(false)
  const [claimHovered, setClaimHovered] = useState(false)
  const [statsHovered, setStatsHovered] = useState(false)

  // Optimized functions with useCallback
  const handleBridgeHover = useCallback(
    (isHovered: boolean) => {
      setBridgeHovered(isMobile ? false : isHovered)
    },
    [isMobile],
  )

  const handleBurnHover = useCallback(
    (isHovered: boolean) => {
      setBurnHovered(isMobile ? false : isHovered)
    },
    [isMobile],
  )

  const handleClaimHover = useCallback(
    (isHovered: boolean) => {
      setClaimHovered(isMobile ? false : isHovered)
    },
    [isMobile],
  )

  const handleStatsHover = useCallback(
    (isHovered: boolean) => {
      setStatsHovered(isMobile ? false : isHovered)
    },
    [isMobile],
  )

  useEffect(() => {
    setIsClient(true)


  }, [])

  // Simulate fetching balance when connected
  useEffect(() => {
    if (connected && account) {
      setBalance(1000)
    } else {
      setBalance(0)
    }
  }, [connected, account])

  useEffect(() => {
    // Ensure we're on client side
    setIsClient(true)

    // Set a maximum loading time to prevent infinite loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  // Performance-aware animation variants
  const animationVariants = {
    lite: {
      hover: { scale: 1.01 },
      tap: { scale: 0.99 },
      transition: { duration: 0.1 }
    },
    full: {
      hover: { scale: 1.02, y: -2 },
      tap: { scale: 0.98 },
      transition: { duration: 0.2, type: "spring", stiffness: 400 }
    }
  }

  const currentVariant = isLiteMode || isWeakDevice ? animationVariants.lite : animationVariants.full

  // Reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const shouldAnimate = !prefersReducedMotion && !isLiteMode

  // Helper to render main CTA buttons that require ApeChain
  const renderActionButton = (href: string, label: string, extra?: React.ReactNode) => {
    if (!isApeChain) {
      return (
        <Button
          onClick={() => { void forceSwitchToApeChain() }}
          className="neon-button w-full h-12 text-base font-semibold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500"
        >
          🔄 Switch to ApeChain
        </Button>
      )
    }
    return (
      <Link href={href} className="relative z-10 mt-auto block">
        <Button className="neon-button w-full h-12 text-base font-semibold flex items-center justify-center">
          {extra}
          {label}
        </Button>
      </Link>
    )
  }

  // Rendering loading screen
  if (isLoading || !isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="mb-6 w-32 h-32 md:w-40 md:h-40 relative animate-pulse">
          <Image src="/favicon.ico" alt="CrazyCube Logo" width={160} height={160} className="object-contain" sizes="(max-width: 768px) 50vw, 160px" />
        </div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}
          className="text-4xl md:text-6xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-300 mb-4"
        >
          Loading...
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          className="text-xl text-cyan-300"
        >
          Oh no, the site is stuck! Wait, we&apos;re just lazy 🦥
        </motion.p>
      </div>
    )
  }

  return (
    <div className={`min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative ${isLiteMode ? 'lite-mode' : ''}`}>
      {/* Adding particle effect - reduced quantity */}
      {shouldShowParticles && (
        <ParticleEffect
          count={particleCount}
          colors={["#22d3ee", "#0ea5e9", "#3b82f6", "#0284c7"]}
          speed={animationIntensity}
          size={isMobile ? 3 : 4}
        />
      )}

      {/* Noise texture for background */}
      <div className="absolute inset-0 bg-blue-noise opacity-5 mix-blend-soft-light"></div>

      {/* Header */}
      <header className="relative z-10 flex flex-col md:flex-row items-center justify-between p-4 md:p-6">
        <div className="flex items-center mb-4 md:mb-0">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: [0.9, 1.1, 0.9], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="mr-3 w-16 h-16 md:w-20 md:h-20 relative"
          >
            <Image
              src="/favicon.ico"
              alt="CrazyCube Logo"
              width={80}
              height={80}
              className="object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
              priority={true}
            />
          </motion.div>
          <div>
            {/* Enhanced and more noticeable title */}
            <motion.h1
              className="heading-1 neon-text relative"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                textShadow: "0 0 20px hsl(var(--primary)), 0 0 40px hsl(var(--primary))",
                filter: "drop-shadow(0 0 8px hsl(var(--primary)))",
              }}
            >
              {t("home.title", "CrazyCube")}
            </motion.h1>
            <motion.span
              initial={{ opacity: 0.5, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
              className="body-text text-foreground/80"
            >
              {t("home.subtitle", "Where cubes cry and joke!")}
            </motion.span>
          </div>
        </div>

        {/* Language switcher and other elements */}
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <div className="w-full md:w-auto overflow-x-auto">
            <I18nLanguageSwitcher />
          </div>
          <div className="flex justify-center md:justify-end">
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 container mx-auto px-4 py-16">
        {/* Tab navigation */}
        <div className="mb-16">
          <TabNavigation />
        </div>

        {/* Hero section with 3D animation */}
        <div className="flex flex-col items-center justify-center mb-24">
          {!isMobile && (
            <div className="h-[400px] w-full relative">
              <CubeAnimation />
            </div>
          )}
          {isMobile && (
            <div className="h-[220px] w-full flex items-center justify-center">
              <Image src="/images/cube1.png" alt="Cube" width={120} height={120} />
            </div>
          )}

          {/* balance info hidden per new design */}
        </div>

        {/* Network status and wallet connection section removed per latest design */}

        {/* Network Switch Progress */}
        {connected && (
          <div className="mb-16">
            <NetworkSwitchProgress
              isSwitching={isSwitching}
              switchAttempts={switchAttempts}
              maxAttempts={5}
              isApeChain={isApeChain}
              onForceSwitch={forceSwitchToApeChain}
            />
          </div>
        )}

        {/* User NFTs Preview */}
        <div className="mb-16">
          <UserNFTsPreview />
        </div>

        {/* Main Grid - OPTIMIZED */}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 2xl:gap-8 mb-12">
          {/* Breed Section - CUBE - OPTIMIZED */}
          <motion.div
            {...(shouldAnimate && {
              whileHover: currentVariant.hover,
              whileTap: currentVariant.tap,
              transition: currentVariant.transition
            })}
            onHoverStart={() => shouldAnimate && handleBridgeHover(true)}
            onHoverEnd={() => shouldAnimate && handleBridgeHover(false)}
            className="crypto-card relative overflow-hidden bg-gradient-to-br from-emerald-900/90 to-green-900/80 p-4 md:p-6 flex flex-col justify-between h-60"
          >
            {/* Removed CubeAnimation to prevent interference with main hero animation */}
            {/* Simple heart animation instead */}
            {!isMobile && !isLiteMode && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 6 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute text-emerald-400/30"
                    style={{ 
                      left: `${20 + Math.random() * 60}%`, 
                      top: `${20 + Math.random() * 60}%` 
                    }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ 
                      opacity: [0, 0.6, 0], 
                      scale: [0.5, 1.2, 0.5], 
                      y: [-20, 20, -20] 
                    }}
                    transition={{ 
                      duration: 3 + Math.random() * 2, 
                      repeat: Number.POSITIVE_INFINITY, 
                      delay: Math.random() * 3 
                    }}
                  >
                    <Heart className="w-4 h-4" fill="currentColor" />
                  </motion.div>
                ))}
              </div>
            )}

            <div className="flex items-center mb-4 relative z-10">
              <Heart className="w-8 h-8 text-emerald-400 mr-3" fill="currentColor" />
              <h2 className="heading-3 neon-text">
                {t("sections.breed.title", "Breed NFTs (Cube Love!)")}
              </h2>
            </div>
            <p className="body-text text-emerald-200 mb-6 relative z-10 flex-1">
              {t(
                "sections.breed.description",
                'Combine two NFTs to resurrect one from the graveyard! Love is in the air! 💕',
              )}
            </p>
            {renderActionButton("/breed", t("sections.breed.button", "Breed NFTs"))}

            {/* Pulsating glow - OPTIMIZED */}
            <motion.div
              className="absolute inset-0 bg-gradient-radial from-emerald-500/20 to-transparent rounded-2xl"
              animate={{
                scale: [1, 1.02, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
            />
          </motion.div>

          {/* Burn Section - FIRE - OPTIMIZED */}
          <motion.div
            {...(shouldAnimate && {
              whileHover: currentVariant.hover,
              whileTap: currentVariant.tap,
              transition: currentVariant.transition
            })}
            onHoverStart={() => shouldAnimate && handleBurnHover(true)}
            onHoverEnd={() => shouldAnimate && handleBurnHover(false)}
            className="crypto-card relative overflow-hidden bg-gradient-to-br from-orange-900/90 to-red-900/80 p-4 md:p-6 flex flex-col justify-between h-60"
          >
            {/* Add FireAnimation component with reduced intensity */}
            {!isMobile && !isLiteMode && <FireAnimation intensity={animationIntensity} />}

            <div className="flex items-center mb-4 relative z-10">
              <Flame className="w-8 h-8 text-orange-400 mr-3" />
              <h2 className="heading-3 neon-text">
                {t("sections.burn.title", "Burn NFT (Roast the Cube!)")}
              </h2>
            </div>
            <p className="body-text text-orange-200 mb-6 relative z-10 flex-1">
              {t(
                "sections.burn.description",
                'Burn NFT and get CRA tokens! Epic scene of a fiery grill with NFTs flying in screaming: "Tell my mom I love her!"',
              )}
            </p>
            {renderActionButton(
              "/burn",
              t("sections.burn.button", "Burn NFT"),
              <div className="btn-flames mr-2" />
            )}
          </motion.div>

          {/* Claim Section - GOLD - OPTIMIZED */}
          <motion.div
            {...(shouldAnimate && {
              whileHover: currentVariant.hover,
              whileTap: currentVariant.tap,
              transition: currentVariant.transition
            })}
            onHoverStart={() => shouldAnimate && handleClaimHover(true)}
            onHoverEnd={() => shouldAnimate && handleClaimHover(false)}
            className="crypto-card relative overflow-hidden bg-gradient-to-br from-amber-900/90 to-yellow-900/80 p-4 md:p-6 flex flex-col justify-between h-60"
          >
            {/* Gold coins animation */}
            {!isMobile && !isLiteMode && <CoinsAnimation intensity={animationIntensity} />}

            <div className="flex items-center mb-4 relative z-10">
              <Coins className="w-8 h-8 text-yellow-400 mr-3" />
              <h2 className="heading-3 neon-text">
                {t("sections.claim.title", "Claim Rewards (Where's my CRA?)")}
              </h2>
            </div>
            <p className="body-text text-yellow-200 mb-6 relative z-10 flex-1">
              {t("sections.claim.description", 'A cube with huge sad eyes shouts: "Claim me and get your CRA!"')}
            </p>
            {renderActionButton("/claim", t("sections.claim.button", "Claim Reward"))}
          </motion.div>

          {/* Stats Section - NEON CYBERPUNK - OPTIMIZED */}
          <motion.div
            {...(shouldAnimate && {
              whileHover: currentVariant.hover,
              whileTap: currentVariant.tap,
              transition: currentVariant.transition
            })}
            onHoverStart={() => shouldAnimate && handleStatsHover(true)}
            onHoverEnd={() => shouldAnimate && handleStatsHover(false)}
            className="crypto-card relative overflow-hidden bg-gradient-to-br from-violet-900/90 to-indigo-900/80 p-4 md:p-6 flex flex-col justify-between h-60"
          >
            {/* Add StatsAnimation component */}
            {!isMobile && !isLiteMode && <StatsAnimation />}

            <div className="flex items-center mb-4 relative z-10">
              <BarChart3 className="w-8 h-8 text-violet-400 mr-3" />
              <h2 className="heading-3 neon-text">
                {t("sections.stats.title", "Statistics (Tears and Pain Counter)")}
              </h2>
            </div>
            <p className="body-text text-violet-200 mb-6 relative z-10 flex-1">
              {t(
                "sections.stats.description",
                "Shows how many NFTs were burned, returned from the graveyard, and how many CRA coins are in the pool",
              )}
            </p>

            {renderActionButton("/stats", t("sections.stats.button", "View Statistics"))}
          </motion.div>

          {/* Ping Section */}
          <motion.div
            {...(shouldAnimate && {
              whileHover: currentVariant.hover,
              whileTap: currentVariant.tap,
              transition: currentVariant.transition
            })}
            className="crypto-card relative overflow-hidden bg-gradient-to-br from-cyan-900/90 to-sky-900/80 p-4 md:p-6 flex flex-col justify-between h-60"
          >
            {/* Blue coins animation for ping */}
            {!isMobile && !isLiteMode && <CoinsAnimation intensity={animationIntensity * 0.8} theme="blue" />}

            <div className="flex items-center mb-4 relative z-10">
              <SatelliteDish className="w-8 h-8 text-cyan-400 mr-3" />
              <h2 className="heading-3 neon-text">
                {t("sections.ping.title", "Ping Cubes (Keep them Alive)")}
              </h2>
            </div>
            <p className="body-text text-cyan-200 mb-6 relative z-10 flex-1">
              {t("sections.ping.description", "Send a heartbeat to your cubes so they don't drift into the void.")}
            </p>
            {renderActionButton(
              "/ping",
              t("sections.ping.button", "Ping Now"),
              <SatelliteDish className="w-4 h-4 mr-2" />
            )}
          </motion.div>

          {/* Graveyard Section */}
          <motion.div
            {...(shouldAnimate && {
              whileHover: currentVariant.hover,
              whileTap: currentVariant.tap,
              transition: currentVariant.transition
            })}
            className="crypto-card relative overflow-hidden bg-gradient-to-br from-gray-900/90 to-slate-900/80 p-4 md:p-6 flex flex-col justify-between h-60"
          >
            <div className="flex items-center mb-4 relative z-10">
              <Skull className="w-8 h-8 text-red-400 mr-3" />
              <h2 className="heading-3 neon-text">
                {t("sections.graveyard.title", "Graveyard")}
              </h2>
            </div>
            <p className="body-text text-gray-300 mb-6 relative z-10 flex-1">
              {t("sections.graveyard.description", "See your burned cubes, mourn them, and claim their CRA rewards.")}
            </p>
            {renderActionButton(
              "/graveyard",
              t("sections.graveyard.button", "Enter Graveyard"),
              <Skull className="w-5 h-5 mr-2" />
            )}

            {/* Floating skulls */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-red-400/30"
                  style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: [0, 0.5, 0], scale: [0.5, 1.1, 0.5], y: [-10, 10, -10] }}
                  transition={{ duration: 4 + Math.random() * 3, repeat: Number.POSITIVE_INFINITY, delay: Math.random() * 5 }}
                >
                  <Skull className="w-4 h-4" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer - OPTIMIZED */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="text-center text-gray-400 mt-8"
      >
        <motion.p
          {...(shouldAnimate && {
            whileHover: { scale: 1.05 },
            transition: { duration: 0.1 }
          })}
          className="mt-2 text-sm"
        >
          {t("footer.crashMessage", "If the site crashed, the cube went out for pizza")} 🍕
        </motion.p>

        <motion.p
          {...(shouldAnimate && {
            whileHover: { color: "#00d4ff" },
            transition: { duration: 0.1 }
          })}
          className="mt-2 text-xs"
        >
          {t("footer.madeWith", "Made with ❤️ for the CrazyCube community")}
        </motion.p>
      </motion.footer>

      {/* Social sidebar - ADDED COMPONENT */}
      <SocialSidebar />
    </div>
  )
}
