'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Heart,
  Flame,
  Coins,
  BarChart3,
  SatelliteDish,
  Skull,
} from 'lucide-react';
import Image from 'next/image';

import { useTranslation } from 'react-i18next';
import { TabNavigation } from '@/components/tab-navigation';
import dynamic from 'next/dynamic';
import { WalletConnectNoSSR as WalletConnect } from '@/components/web3/wallet-connect.no-ssr';
import { SocialSidebar } from '@/components/social-sidebar';
const UserNFTsPreview = dynamic(
  () => import('@/components/UserNFTsPreview').then(m => m.UserNFTsPreview),
  { ssr: false }
);
import { useAccount } from 'wagmi';
import { usePerformanceContext } from '@/hooks/use-performance-context';
import { useNetwork } from '@/hooks/use-network';
import { NetworkSwitchProgress } from '@/components/NetworkSwitchProgress';

// Dynamic imports of heavy animations with conditional loading
const CubeAnimation = dynamic(
  () =>
    import('@/components/cube-animation').then(m => ({
      default: m.CubeAnimation,
    })),
  { ssr: false }
);
const FireAnimation = dynamic(
  () =>
    import('@/components/fire-animation').then(m => ({
      default: m.FireAnimation,
    })),
  { ssr: false }
);
const CoinsAnimation = dynamic(
  () =>
    import('@/components/coins-animation').then(m => ({
      default: m.CoinsAnimation,
    })),
  { ssr: false }
);
const StatsAnimation = dynamic(
  () =>
    import('@/components/stats-animation').then(m => ({
      default: m.StatsAnimation,
    })),
  { ssr: false }
);
const ParticleEffect = dynamic(
  () =>
    import('@/components/particle-effect').then(m => ({
      default: m.ParticleEffect,
    })),
  { ssr: false }
);

export default function HomePage() {
  // Use translation hook
  const { t } = useTranslation();
  const { isLiteMode, isMobile, isWeakDevice } = usePerformanceContext();

  const { isConnected: connected } = useAccount();
  const { isApeChain, isSwitching, switchAttempts, forceSwitchToApeChain } =
    useNetwork();
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Performance-aware animation settings
  const shouldShowParticles = !isLiteMode && !isWeakDevice;
  const particleCount = isMobile ? 8 : isWeakDevice ? 5 : 15;
  const animationIntensity = isLiteMode ? 0.1 : isWeakDevice ? 0.3 : 0.5;

  useEffect(() => {
    // Ensure we're on client side
    setIsClient(true);

    // Set a maximum loading time to prevent infinite loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Performance-aware animation variants
  const animationVariants = {
    lite: {
      hover: { scale: 1.01 },
      tap: { scale: 0.99 },
      transition: { duration: 0.1 },
    },
    full: {
      hover: { scale: 1.02, y: -2 },
      tap: { scale: 0.98 },
      transition: { duration: 0.2, type: 'spring', stiffness: 400 },
    },
  };

  const currentVariant =
    isLiteMode || isWeakDevice
      ? animationVariants.lite
      : animationVariants.full;

  // Reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shouldAnimate = !prefersReducedMotion && !isLiteMode;

  // Helper to render main CTA buttons that require ApeChain
  const renderActionButton = (
    href: string,
    label: string,
    extra?: React.ReactNode
  ) => {
    if (!isApeChain) {
      return (
        <Button
          onClick={() => {
            void forceSwitchToApeChain();
          }}
          className='neon-button w-full h-12 text-base font-semibold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500'
        >
          🔄 Switch to ApeChain
        </Button>
      );
    }
    return (
      <Link href={href} className='relative z-10 mt-auto block'>
        <Button className='neon-button w-full flex items-center justify-center'>
          {extra}
          {label}
        </Button>
      </Link>
    );
  };

  // Rendering loading screen
  if (isLoading || !isClient) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900'>
        <div className='mb-6 w-32 h-32 md:w-40 md:h-40 relative animate-pulse'>
          <Image
            src='/favicon.ico'
            alt='CrazyCube Logo'
            width={160}
            height={160}
            className='object-contain'
            sizes='(max-width: 768px) 50vw, 160px'
          />
        </div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}
          className='text-4xl md:text-6xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-300 mb-4'
        >
          Loading...
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          className='text-xl text-cyan-300'
        >
          Oh no, the site is stuck! Wait, we&apos;re just lazy 🦥
        </motion.p>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen mobile-content-wrapper bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative ${isLiteMode ? 'lite-mode' : ''}`}
      style={{
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1,
        overflow: 'visible',
      }}
    >
      {/* Adding particle effect - reduced quantity */}
      {shouldShowParticles && !isMobile && (
        <ParticleEffect
          count={particleCount}
          colors={['#22d3ee', '#0ea5e9', '#3b82f6', '#0284c7']}
          speed={animationIntensity}
          size={isMobile ? 3 : 4}
        />
      )}

      {/* Noise texture for background */}
      <div className='absolute inset-0 bg-blue-noise opacity-5 mix-blend-soft-light'></div>

      {/* Header */}
      <header className='relative z-10 mobile-header-fix mobile-safe-layout px-4 py-2'>
        <div className='mobile-header-spacing'>
          <div className='flex items-center justify-between w-full'>
            <div className='flex items-center flex-shrink-0'>
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: [0.9, 1.1, 0.9], rotate: [0, 5, -5, 0] }}
                transition={{
                  duration: 4,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut',
                }}
                className='mr-3 w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 relative'
              >
                <Image
                  src='/favicon.ico'
                  alt='CrazyCube Logo'
                  width={80}
                  height={80}
                  className='object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]'
                  priority={true}
                />
              </motion.div>
              <div className='flex-1 min-w-0 relative'>
                {/* SVG glow under the logo */}
                <svg
                  className='absolute left-0 top-1/2 -translate-y-1/2 w-full h-[110%] pointer-events-none select-none'
                  viewBox='0 0 600 120'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                  style={{ filter: 'blur(16px)', zIndex: 0 }}
                >
                  <ellipse
                    cx='300'
                    cy='60'
                    rx='240'
                    ry='34'
                    fill='#1e90ff'
                    fillOpacity='0.18'
                  />
                  <ellipse
                    cx='300'
                    cy='60'
                    rx='160'
                    ry='20'
                    fill='#3ab0ff'
                    fillOpacity='0.22'
                  />
                  <ellipse
                    cx='300'
                    cy='60'
                    rx='90'
                    ry='10'
                    fill='#3ab0ff'
                    fillOpacity='0.32'
                  />
                </svg>
                {/* Neon animated logo text */}
                <h1 className='crazycube-neon-logo relative z-10 text-2xl md:text-4xl lg:text-6xl font-extrabold uppercase tracking-widest text-center mx-auto'>
                  {t('home.title', 'CrazyCube')}
                </h1>
                <span
                  className='crazycube-neon-subtitle block text-[11px] md:text-base lg:text-lg text-blue-100/90 text-center mt-1 tracking-wide font-medium'
                  style={{ textShadow: '0 0 8px #1e90ff, 0 0 16px #3ab0ff' }}
                >
                  {t('home.subtitle', 'Where cubes cry and joke!')}
                </span>
                <style jsx>{`
                  .crazycube-neon-logo {
                    color: #1e90ff;
                    text-shadow:
                      0 0 10px #1e90ff,
                      0 0 28px #3ab0ff,
                      0 0 48px #3ab0ff,
                      0 0 100px #3ab0ff;
                    animation: crazycubeNeonPulse 2.8s infinite alternate;
                    letter-spacing: 0.18em;
                  }
                  @keyframes crazycubeNeonPulse {
                    0%,
                    100% {
                      text-shadow:
                        0 0 10px #1e90ff,
                        0 0 28px #3ab0ff,
                        0 0 48px #3ab0ff,
                        0 0 100px #3ab0ff;
                      filter: brightness(1.08) saturate(1.2);
                    }
                    50% {
                      text-shadow:
                        0 0 24px #1e90ff,
                        0 0 48px #3ab0ff,
                        0 0 100px #3ab0ff,
                        0 0 180px #3ab0ff;
                      filter: brightness(1.22) saturate(1.5);
                    }
                  }
                  .crazycube-neon-subtitle {
                    text-shadow:
                      0 0 8px #1e90ff,
                      0 0 16px #3ab0ff;
                  }
                `}</style>
              </div>
            </div>

            {/* Wallet connection */}
            <div className='flex justify-end flex-shrink-0'>
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className='relative z-10 container mx-auto px-4 py-16'>
        {/* Tab navigation */}
        <div className='mb-16'>
          <TabNavigation />
        </div>

        {/* Hero section with 3D animation */}
        <div className='flex flex-col items-center justify-center mb-24'>
          <div
            className={`w-full relative ${isMobile ? 'h-[220px]' : 'h-[400px]'}`}
          >
            <CubeAnimation />
          </div>
        </div>

        {/* balance info hidden per new design */}

        {/* Network status and wallet connection section removed per latest design */}

        {/* Network Switch Progress */}
        {connected && (
          <div className='mb-16'>
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
        <div className='mb-16'>
          <UserNFTsPreview />
        </div>

        {/* Main Grid - OPTIMIZED */}
        <div
          className='grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 2xl:gap-8 mb-12'
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
        >
          {/* Breed Section - CUBE - OPTIMIZED */}
          <motion.div
            {...(shouldAnimate && {
              whileHover: currentVariant.hover,
              whileTap: currentVariant.tap,
              transition: currentVariant.transition,
            })}
            className='crypto-card relative overflow-hidden bg-gradient-to-br from-pink-500/80 via-fuchsia-500/70 to-rose-400/80 p-4 md:p-6 flex flex-col justify-between'
          >
            {/* Animated flying red hearts */}
            {!isLiteMode && (
              <div className='absolute inset-0 overflow-hidden pointer-events-none'>
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={`heart-${i}`}
                    className='absolute text-pink-400/80'
                    style={{
                      left: `${10 + Math.random() * 80}%`,
                      top: `${10 + Math.random() * 80}%`,
                    }}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{
                      opacity: [0, 0.7, 0],
                      scale: [0.7, 1.3, 0.7],
                      y: [-30, 30, -30],
                    }}
                    transition={{
                      duration: 3.5 + Math.random() * 2.5,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: Math.random() * 3,
                    }}
                  >
                    <Heart className='w-5 h-5' fill='currentColor' />
                  </motion.div>
                ))}
              </div>
            )}

            <div className='flex items-center mb-4 relative z-10'>
              <Heart
                className='w-8 h-8 text-pink-400 mr-3'
                fill='currentColor'
              />
              <h2 className='heading-3 neon-text'>
                {t('sections.breed.title', 'Breed NFTs (Cube Love!)')}
              </h2>
            </div>
            <p className='body-text text-pink-200 mb-6 relative z-10 flex-1'>
              {t(
                'sections.breed.description',
                'Combine two NFTs to resurrect one from the graveyard! Love is in the air! 💕'
              )}
            </p>
            {renderActionButton(
              '/breed',
              t('sections.breed.button', 'Breed NFTs')
            )}

            {/* Pulsating pink glow */}
            <motion.div
              className='absolute inset-0 bg-gradient-radial from-pink-400/20 to-transparent rounded-2xl'
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
              transition: currentVariant.transition,
            })}
            className='crypto-card relative overflow-hidden bg-gradient-to-br from-orange-900/90 to-red-900/80 p-4 md:p-6 flex flex-col justify-between'
          >
            {/* Add FireAnimation component with reduced intensity */}
            {!isLiteMode && <FireAnimation intensity={animationIntensity} />}

            <div className='flex items-center mb-4 relative z-10'>
              <Flame className='w-8 h-8 text-orange-400 mr-3' />
              <h2 className='heading-3 neon-text'>
                {t('sections.burn.title', 'Burn NFT (Roast the Cube!)')}
              </h2>
            </div>
            <p className='body-text text-orange-200 mb-6 relative z-10 flex-1'>
              {t(
                'sections.burn.description',
                'Burn NFT and get CRA tokens! Epic scene of a fiery grill with NFTs flying in screaming: "Tell my mom I love her!"'
              )}
            </p>
            {renderActionButton(
              '/burn',
              t('sections.burn.button', 'Burn NFT'),
              <div className='btn-flames mr-2' />
            )}
          </motion.div>

          {/* Claim Section - GOLD - OPTIMIZED */}
          <motion.div
            {...(shouldAnimate && {
              whileHover: currentVariant.hover,
              whileTap: currentVariant.tap,
              transition: currentVariant.transition,
            })}
            className='crypto-card relative overflow-hidden bg-gradient-to-br from-amber-900/90 to-yellow-900/80 p-4 md:p-6 flex flex-col justify-between'
          >
            {/* Gold coins animation */}
            {!isLiteMode && <CoinsAnimation />}

            <div className='flex items-center mb-4 relative z-10'>
              <Coins className='w-8 h-8 text-yellow-400 mr-3' />
              <h2 className='heading-3 neon-text'>
                {t('sections.claim.title', "Claim Rewards (Where's my CRA?)")}
              </h2>
            </div>
            <p className='body-text text-yellow-200 mb-6 relative z-10 flex-1'>
              {t(
                'sections.claim.description',
                'A cube with huge sad eyes shouts: "Claim me and get your CRA!"'
              )}
            </p>
            {renderActionButton(
              '/claim',
              t('sections.claim.button', 'Claim Reward')
            )}
          </motion.div>

          {/* Stats Section - NEON CYBERPUNK - OPTIMIZED */}
          <motion.div
            {...(shouldAnimate && {
              whileHover: currentVariant.hover,
              whileTap: currentVariant.tap,
              transition: currentVariant.transition,
            })}
            className='crypto-card relative overflow-hidden bg-gradient-to-br from-violet-900/90 to-indigo-900/80 p-4 md:p-6 flex flex-col justify-between'
          >
            {/* Add StatsAnimation component */}
            {!isLiteMode && <StatsAnimation />}

            <div className='flex items-center mb-4 relative z-10'>
              <BarChart3 className='w-8 h-8 text-violet-400 mr-3' />
              <h2 className='heading-3 neon-text'>
                {t(
                  'sections.stats.title',
                  'Statistics (Tears and Pain Counter)'
                )}
              </h2>
            </div>
            <p className='body-text text-violet-200 mb-6 relative z-10 flex-1'>
              {t(
                'sections.stats.description',
                'Shows how many NFTs were burned, returned from the graveyard, and how many CRA coins are in the pool'
              )}
            </p>

            {renderActionButton(
              '/stats',
              t('sections.stats.button', 'View Statistics')
            )}
          </motion.div>

          {/* Ping Section */}
          <motion.div
            {...(shouldAnimate && {
              whileHover: currentVariant.hover,
              whileTap: currentVariant.tap,
              transition: currentVariant.transition,
            })}
            className='crypto-card relative overflow-hidden bg-gradient-to-br from-cyan-900/90 to-sky-900/80 p-4 md:p-6 flex flex-col justify-between'
          >
            {/* Blue coins animation for ping */}
            {!isMobile && !isLiteMode && <CoinsAnimation />}

            <div className='flex items-center mb-4 relative z-10'>
              <SatelliteDish className='w-8 h-8 text-cyan-400 mr-3' />
              <h2 className='heading-3 neon-text'>
                {t('sections.ping.title', 'Ping Cubes (Keep them Alive)')}
              </h2>
            </div>
            <p className='body-text text-cyan-200 mb-6 relative z-10 flex-1'>
              {t(
                'sections.ping.description',
                "Send a heartbeat to your cubes so they don't drift into the void."
              )}
            </p>
            {renderActionButton(
              '/ping',
              t('sections.ping.button', 'Ping Now'),
              <SatelliteDish className='w-4 h-4 mr-2' />
            )}
          </motion.div>

          {/* Graveyard Section */}
          <motion.div
            {...(shouldAnimate && {
              whileHover: currentVariant.hover,
              whileTap: currentVariant.tap,
              transition: currentVariant.transition,
            })}
            className='crypto-card relative overflow-hidden bg-gradient-to-br from-gray-900/90 to-slate-900/80 p-4 md:p-6 flex flex-col justify-between'
          >
            <div className='flex items-center mb-4 relative z-10'>
              <Skull className='w-8 h-8 text-red-400 mr-3' />
              <h2 className='heading-3 neon-text'>
                {t('sections.graveyard.title', 'Graveyard')}
              </h2>
            </div>
            <p className='body-text text-gray-300 mb-6 relative z-10 flex-1'>
              {t(
                'sections.graveyard.description',
                'See your burned cubes, mourn them, and claim their CRA rewards.'
              )}
            </p>
            {renderActionButton(
              '/graveyard',
              t('sections.graveyard.button', 'Enter Graveyard'),
              <Skull className='w-5 h-5 mr-2' />
            )}

            {/* Floating skulls */}
            <div className='absolute inset-0 overflow-hidden pointer-events-none'>
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={`skull-${i}`}
                  className='absolute text-red-400/30'
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: [0, 0.5, 0],
                    scale: [0.5, 1.1, 0.5],
                    y: [-10, 10, -10],
                  }}
                  transition={{
                    duration: 4 + Math.random() * 3,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: Math.random() * 5,
                  }}
                >
                  <Skull className='w-4 h-4' />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Game Section - 3D CUBE GAME */}
          <motion.div
            {...(shouldAnimate && {
              whileHover: currentVariant.hover,
              whileTap: currentVariant.tap,
              transition: currentVariant.transition,
            })}
            className='crypto-card relative overflow-hidden bg-gradient-to-br from-emerald-900/90 to-teal-900/80 p-4 md:p-6 flex flex-col justify-between'
          >
            <p className='body-text text-teal-200 mb-4 relative z-10 flex-1'>
              {t(
                'sections.game.description',
                'Интерактивная игра в стиле майнкрафта, с открытым сумасшедшим миром, с сумасшедшей, удивительной физикой и геймплеем! СКОРО!'
              )}
            </p>

            {/* Floating cubes */}
            <div className='absolute inset-0 overflow-hidden pointer-events-none'>
              {Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                  key={`cube-${i}`}
                  className='absolute text-emerald-400/40'
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
                  animate={{
                    opacity: [0, 0.6, 0],
                    scale: [0.5, 1.2, 0.5],
                    rotate: [0, 180, 360],
                    y: [-15, 15, -15],
                  }}
                  transition={{
                    duration: 5 + Math.random() * 2,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: Math.random() * 3,
                  }}
                >
                  <div className='w-3 h-3 bg-emerald-400 transform rotate-45'></div>
                </motion.div>
              ))}
            </div>
            <div className='mt-auto'>
              {renderActionButton(
                '/game',
                t('sections.game.button', 'Play Game'),
                <span className='w-5 h-5 mr-2 flex items-center justify-center'>
                  <svg
                    className='animate-pulse'
                    width='20'
                    height='20'
                    viewBox='0 0 20 20'
                    fill='none'
                  >
                    <path
                      d='M7 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm10-14v10a2 2 0 1 1-2-2V7h-4V3h6Z'
                      fill='#34d399'
                    />
                  </svg>
                </span>
              )}
            </div>
          </motion.div>

          {/* Новая карточка Bridge NFT */}
          <motion.div
            {...(shouldAnimate && {
              whileHover: currentVariant.hover,
              whileTap: currentVariant.tap,
              transition: currentVariant.transition,
            })}
            className='crypto-card relative overflow-hidden bg-gradient-to-br from-cyan-900/90 to-blue-900/80 p-4 md:p-6 flex flex-col justify-between'
          >
            <p className='body-text text-cyan-200 mb-4 relative z-10 flex-1'>
              {t(
                'sections.bridge.description',
                'Переноси свои NFT между сетями быстро и безопасно! Мост для твоих кубов: расширяй свои возможности и участвуй в новых мирах.'
              )}
            </p>
            <div className='mt-auto'>
              {renderActionButton(
                '/bridge',
                t('sections.bridge.button', 'Bridge'),
                <span className='w-7 h-5 mr-2 flex items-center justify-center relative'>
                  {/* Мост */}
                  <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
                    <path
                      d='M2 10h16M10 2v16'
                      stroke='#38bdf8'
                      strokeWidth='2'
                      strokeLinecap='round'
                    />
                  </svg>
                  {/* Анимированная точка */}
                  <motion.div
                    className='absolute top-1 left-0 w-2 h-2 rounded-full bg-cyan-400 shadow-lg'
                    animate={{ x: [0, 16, 0] }}
                    transition={{
                      duration: 2.8,
                      repeat: Infinity,
                      repeatType: 'loop',
                    }}
                  />
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer - OPTIMIZED */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className='text-center text-gray-400 mt-8'
      >
        <motion.p
          {...(shouldAnimate && {
            whileHover: { scale: 1.05 },
            transition: { duration: 0.1 },
          })}
          className='mt-2 text-sm'
        >
          {t(
            'footer.crashMessage',
            'If the site crashed, the cube went out for pizza'
          )}{' '}
          🍕
        </motion.p>

        <motion.p
          {...(shouldAnimate && {
            whileHover: { color: '#00d4ff' },
            transition: { duration: 0.1 },
          })}
          className='mt-2 text-xs'
        >
          {t('footer.madeWith', 'Made with ❤️ for the CrazyCube community')}
        </motion.p>
      </motion.footer>

      {/* Social sidebar - ADDED COMPONENT */}
      <SocialSidebar />
    </div>
  );
}
