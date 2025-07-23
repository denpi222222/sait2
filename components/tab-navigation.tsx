'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import React from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  Heart,
  Coins,
  BarChart3,
  Bell,
  Skull,
  Info,
  Loader2,
  ArrowRightLeft,
} from 'lucide-react';
import { useMobile } from '@/hooks/use-mobile';

interface TabNavigationProps {
  color?: 'cyan' | 'pink' | 'amber' | 'red' | 'sky' | 'gray' | 'purple';
}

export const TabNavigation = React.memo(function TabNavigation({
  color = 'cyan',
}: TabNavigationProps) {
  const pathname = usePathname();
  const { isMobile } = useMobile();
  const router = useRouter();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [targetPath, setTargetPath] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tr = (key: string, fallback: string) =>
    mounted ? t(key, fallback) : fallback;

  const tabs = [
    {
      path: '/ping',
      label: tr('tabs.ping', 'Ping'),
      icon: <Bell className='w-4 h-4 mr-1' />,
    },
    {
      path: '/breed',
      label: tr('tabs.breed', 'Breeding'),
      icon: <Heart className='w-4 h-4 mr-1' />,
    },
    {
      path: '/burn',
      label: tr('tabs.burn', 'Burn'),
      icon: <Flame className='w-4 h-4 mr-1' />,
    },
    {
      path: '/graveyard',
      label: tr('tabs.graveyard', 'Graveyard'),
      icon: <Skull className='w-4 h-4 mr-1' />,
    },
    {
      path: '/rewards',
      label: tr('tabs.rewards', 'Rewards'),
      icon: <Coins className='w-4 h-4 mr-1' />,
    },
    {
      path: '/info',
      label: tr('tabs.info', 'Info'),
      icon: <Info className='w-4 h-4 mr-1' />,
    },
    {
      path: '/bridge',
      label: tr('tabs.bridge', 'Bridge'),
      icon: <ArrowRightLeft className='w-4 h-4 mr-1' />,
    },
  ];

  // Prefetch all tab routes once on mount
  useEffect(() => {
    if (
      typeof (router as { prefetch?: (path: string) => void }).prefetch ===
      'function'
    ) {
      tabs.forEach(tab => {
        try {
          (router as { prefetch: (path: string) => void }).prefetch(tab.path);
        } catch {}
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset navigation state when pathname changes
  useEffect(() => {
    setIsNavigating(false);
    setTargetPath(null);
  }, [pathname]);

  // Debounced navigation to prevent multiple clicks
  const handleNavigation = useCallback(
    (path: string) => {
      if (isNavigating || pathname === path) return;

      setIsNavigating(true);
      setTargetPath(path);

      // Use setTimeout to ensure smooth transition
      setTimeout(() => {
        router.push(path);
      }, 50);
    },
    [router, pathname, isNavigating]
  );

  const palette: Record<
    string,
    { border: string; text: string; active: string; hoverBg: string }
  > = {
    cyan: {
      border: 'border-cyan-500/30',
      text: 'text-cyan-300',
      active: 'from-cyan-600 to-blue-600',
      hoverBg: 'bg-cyan-900/30',
    },
    pink: {
      border: 'border-pink-500/30',
      text: 'text-pink-300',
      active: 'from-pink-600 to-purple-600',
      hoverBg: 'bg-pink-900/30',
    },
    amber: {
      border: 'border-amber-500/30',
      text: 'text-amber-300',
      active: 'from-amber-500 to-orange-500',
      hoverBg: 'bg-amber-900/30',
    },
    red: {
      border: 'border-red-500/30',
      text: 'text-red-300',
      active: 'from-red-600 to-orange-600',
      hoverBg: 'bg-red-900/30',
    },
    sky: {
      border: 'border-cyan-500/30',
      text: 'text-cyan-300',
      active: 'from-cyan-600 to-sky-600',
      hoverBg: 'bg-cyan-900/30',
    },
    gray: {
      border: 'border-gray-500/30',
      text: 'text-gray-300',
      active: 'from-gray-600 to-slate-600',
      hoverBg: 'bg-gray-800/30',
    },
    purple: {
      border: 'border-purple-500/30',
      text: 'text-purple-300',
      active: 'from-purple-600 to-pink-600',
      hoverBg: 'bg-purple-900/30',
    },
  };

  const theme = palette[color] || palette.cyan;

  if (isMobile) {
    return null;
  }

  return (
    <div className='flex justify-center mb-6'>
      <div className='crypto-card bg-card/50 backdrop-blur-md rounded-2xl p-2 shadow-xl max-w-full overflow-hidden'>
        <div className='flex space-x-1 md:space-x-2 flex-wrap justify-center'>
          {tabs.map(tab => {
            const isActive = pathname === tab.path;
            const isLoading = isNavigating && targetPath === tab.path;
            return (
              <motion.div
                key={tab.path}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  className={`relative transition-all duration-200 text-xs md:text-sm px-2 md:px-3 py-1 md:py-2 ${
                    isActive
                      ? `neon-button neon-outline`
                      : `text-foreground/70 hover:text-foreground hover:bg-card/50`
                  } ${isLoading ? 'opacity-70' : ''}`}
                  onClick={() => handleNavigation(tab.path)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className='w-3 h-3 md:w-4 md:h-4 mr-1 animate-spin' />
                  ) : (
                    <span className='w-3 h-3 md:w-4 md:h-4 mr-1'>
                      {tab.icon}
                    </span>
                  )}
                  <span suppressHydrationWarning className='hidden sm:inline'>
                    {tab.label}
                  </span>
                  {isActive && (
                    <motion.div
                      className='absolute inset-0 rounded-xl bg-primary/10'
                      layoutId='activeTab'
                      transition={{
                        type: 'spring',
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                    />
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
