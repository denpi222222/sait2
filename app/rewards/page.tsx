'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BurnedNftCard } from '@/components/BurnedNftCard';
import { useBurnedNfts } from '@/hooks/useBurnedNfts';
import { WalletConnectNoSSR as WalletConnect } from '@/components/web3/wallet-connect.no-ssr';
import { useMobile } from '@/hooks/use-mobile';
import { TabNavigation } from '@/components/tab-navigation';
import { LazyLoad } from '@/components/LazyLoad';

const CoinsAnimation = dynamic(
  () => import('@/components/coins-animation').then(m => m.CoinsAnimation),
  { ssr: false }
);

export default function RewardsPage() {
  const { isMobile } = useMobile();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { t } = useTranslation();
  const { isConnected } = useAccount();
  const { burnedNfts, isLoading, error } = useBurnedNfts();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const renderContent = () => {
    if (!isConnected) {
      return (
        <div className='flex flex-col items-center justify-center text-center py-20'>
          <Info className='w-16 h-16 text-amber-400 mb-4' />
          <h2 className='text-2xl font-bold text-white mb-2'>
            {t('rewards.connect.title')}
          </h2>
          <p className='text-slate-400 mb-6'>
            {t('rewards.connect.description')}
          </p>
          <WalletConnect />
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className='flex flex-col items-center justify-center py-20 text-center'>
          <div className='mx-auto mb-6 w-14 h-14 border-4 border-t-transparent border-amber-400 rounded-full animate-spin mobile-safe-button' />
          <h2 className='text-2xl font-bold text-amber-300 mb-1'>
            {t('rewards.loading.title', 'Searching for your rewards…')}
          </h2>
          <p className='text-amber-200/80 max-w-md'>
            {t(
              'rewards.loading.description',
              'Scanning blockchain and graveyard, this may take a few seconds.'
            )}
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className='flex flex-col items-center justify-center text-center py-20 bg-red-900/20 border border-red-500/30 rounded-lg mobile-safe-button'>
          <AlertTriangle className='w-16 h-16 text-red-400 mb-4' />
          <h2 className='text-2xl font-bold text-red-300 mb-2'>
            {t('rewards.error.title')}
          </h2>
          <p className='text-red-300/80'>{error}</p>
        </div>
      );
    }

    if (burnedNfts.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center py-24 text-center'>
          <AlertTriangle className='w-16 h-16 text-amber-500 mb-4' />
          <h2 className='text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400 mb-2'>
            {t('rewards.empty.title', 'NO NFT TO CLAIM')}
          </h2>
          <p className='text-amber-200/80 max-w-md'>
            {t(
              'rewards.empty.description',
              "It seems all your burned cubes have already yielded rewards or you haven't sent any to the fire yet."
            )}
          </p>
        </div>
      );
    }

    return (
      <LazyLoad
        placeholder={
          <Skeleton className='h-72 w-full bg-amber-800/30 col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4' />
        }
      >
        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate='visible'
          className='nft-card-grid'
        >
          <AnimatePresence>
            {burnedNfts.map(nft => (
              <BurnedNftCard key={nft.tokenId} nft={nft} />
            ))}
          </AnimatePresence>
        </motion.div>
      </LazyLoad>
    );
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-amber-900 via-yellow-800 to-amber-900 text-white p-4 sm:p-8 relative overflow-hidden'>
      <CoinsAnimation intensity={isMobile ? 0.6 : 1.8} />
      <div className='container mx-auto relative z-10'>
        <header className='mb-4 flex items-center justify-between mobile-header-fix mobile-safe-layout'>
          <Link href='/'>
            <Button
              variant='outline'
              className='border-amber-500/30 bg-black/20 text-amber-300 hover:bg-black/40 hover:border-amber-500/30 mobile-safe-button'
            >
              <ArrowLeft className='mr-2 w-4 h-4' />{' '}
              {t('navigation.home', 'Home')}
            </Button>
          </Link>

          <TabNavigation color='amber' />

          <WalletConnect />
        </header>

        <main>{mounted ? renderContent() : null}</main>
      </div>
    </div>
  );
}
