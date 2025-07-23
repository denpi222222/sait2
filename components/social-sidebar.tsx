'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Twitter } from 'lucide-react';
import { useMobile } from '@/hooks/use-mobile';
import React from 'react';
import { useTranslation } from 'react-i18next';

// Update the SocialSidebar component by adding links to Telegram and Discord
export const SocialSidebar = React.memo(function SocialSidebar() {
  const [isVisible, setIsVisible] = useState(false);
  // Track how many times the icons have been shown during the current session
  const [showCount, setShowCount] = useState(0);
  const { isMobile } = useMobile();
  const { t } = useTranslation();

  // Track page scrolling - COMPACT MOBILE WITH AUTO-HIDE
  useEffect(() => {
    let hideTimer: NodeJS.Timeout;
    let showTimer: NodeJS.Timeout;

    const showIcons = () => {
      if (showCount >= 3) return; // Max 3 times per session
      
      setIsVisible(true);
      setShowCount(prev => prev + 1);
      
      // Auto-hide only on mobile, desktop stays visible
      if (isMobile) {
        hideTimer = setTimeout(() => {
          setIsVisible(false);
        }, 3000);
      }
    };

    // Show icons immediately on desktop, with delay on mobile
    if (isMobile) {
      // Mobile: show after 5 minutes, then every 5 minutes
      const scheduleNextShow = () => {
        if (showCount < 3) {
          showTimer = setTimeout(() => {
            showIcons();
            scheduleNextShow(); // Schedule next show
          }, 5 * 60 * 1000); // 5 minutes
        }
      };
      scheduleNextShow();
    } else {
      // Desktop: show immediately and stay visible
      setIsVisible(true);
    }

    // Clean up timers when component unmounts
    return () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
      if (showTimer) {
        clearTimeout(showTimer);
      }
    };
  }, [isMobile, showCount]);

  // Define styles based on device - SOCIAL ICONS ON TOP FOR MOBILE
  const sidebarClass = isMobile
    ? 'fixed top-16 left-0 right-0 z-50 flex-row justify-center'
    : 'fixed top-1/2 -translate-y-1/2 left-0 z-50 flex-col';

  return (
    <motion.div
      initial={isMobile ? { y: -100 } : { x: -100 }}
      animate={
        isVisible
          ? isMobile
            ? { y: 0 }
            : { x: 0 }
          : isMobile
            ? { y: -100 }
            : { x: -100 }
      }
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`${sidebarClass} flex items-center gap-1 bg-gradient-to-r from-slate-900/90 to-blue-900/90 backdrop-blur-md border border-cyan-500/20 shadow-lg shadow-cyan-500/10 ${
        isMobile ? 'mx-auto max-w-[140px] p-2 rounded-lg' : 'max-w-[300px] p-1 rounded-full'
      }`}
    >
      {/* Twitter/X */}
      <a
        href='https://x.com/crazy___cube'
        target='_blank'
        rel='noopener noreferrer'
        className='relative group'
      >
        <motion.div
          whileHover={{ scale: 1.2, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          className={`bg-gradient-to-r from-slate-800/80 to-slate-900/80 rounded-full border border-cyan-500/30 shadow-md shadow-cyan-500/10 ${
            isMobile ? 'p-2' : 'p-4'
          }`}
        >
          <Twitter className={`text-cyan-300 ${isMobile ? 'w-4 h-4' : 'w-8 h-8'}`} />
        </motion.div>
        <span className='absolute left-full ml-2 top-1/2 -translate-y-1/2 text-cyan-300 text-sm font-medium bg-slate-900/90 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap hidden md:block'>
          Twitter/X
        </span>
      </a>

      {/* Telegram */}
      <a
        href='https://t.me/+gEnPkDekDKgzZmYx'
        target='_blank'
        rel='noopener noreferrer'
        className='relative group'
      >
        <motion.div
          whileHover={{ scale: 1.2, rotate: -5 }}
          whileTap={{ scale: 0.9 }}
          className={`bg-gradient-to-r from-slate-800/80 to-slate-900/80 rounded-full border border-blue-500/30 shadow-md shadow-blue-500/10 ${
            isMobile ? 'p-2' : 'p-4'
          }`}
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width={isMobile ? '16' : '32'}
            height={isMobile ? '16' : '32'}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='text-blue-400'
          >
            <path d='M21.5 4.5L2.5 12.5L11.5 14.5L14.5 21.5L21.5 4.5Z' />
            <path d='M11.5 14.5L14.5 21.5' />
            <path d='M11.5 14.5L16.5 9.5' />
          </svg>
        </motion.div>
        <span className='absolute left-full ml-2 top-1/2 -translate-y-1/2 text-blue-300 text-sm font-medium bg-slate-900/90 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap hidden md:block'>
          {t('social.telegram')}
        </span>
      </a>

      {/* Discord */}
      <a
        href='https://discord.gg/a8tufdh65m'
        target='_blank'
        rel='noopener noreferrer'
        className='relative group'
      >
        <motion.div
          whileHover={{ scale: 1.2, rotate: -5 }}
          whileTap={{ scale: 0.9 }}
          className={`bg-gradient-to-r from-slate-800/80 to-slate-900/80 rounded-full border border-indigo-500/30 shadow-md shadow-indigo-500/10 ${
            isMobile ? 'p-2' : 'p-4'
          }`}
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width={isMobile ? '16' : '32'}
            height={isMobile ? '16' : '32'}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='text-indigo-400'
          >
            <path d='M9 12C9 12.5523 8.55228 13 8 13C7.44772 13 7 12.5523 7 12C7 11.4477 7.44772 11 8 11C8.55228 11 9 11.4477 9 12Z' />
            <path d='M16 12C16 12.5523 15.5523 13 15 13C14.4477 13 14 12.5523 14 12C14 11.4477 14.4477 11 15 11C15.5523 11 16 11.4477 16 12Z' />
            <path d='M9 6C9 6 10 4 12 4C14 4 15 6 15 6' />
            <path d='M19.5 7L18.5 5H5.5L4.5 7' />
            <path d='M4.5 7C4.5 7 3 15 3 16C3 17 3.5 20 8 20C12.5 20 11.5 17 11.5 17' />
            <path d='M19.5 7C19.5 7 21 15 21 16C21 17 20.5 20 16 20C11.5 20 12.5 17 12.5 17' />
          </svg>
        </motion.div>
        <span className='absolute left-full ml-2 top-1/2 -translate-y-1/2 text-indigo-300 text-sm font-medium bg-slate-900/90 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap hidden md:block'>
          {t('social.discord')}
        </span>
      </a>


    </motion.div>
  );
});
