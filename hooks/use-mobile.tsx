"use client"

import { useState, useEffect } from "react"

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTelegram, setIsTelegram] = useState(false)
  const [isMetaMaskBrowser, setIsMetaMaskBrowser] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      // Check if mobile device
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768

      // Check if Telegram browser
      const telegram = /Telegram/i.test(navigator.userAgent) || 
        (window as any).Telegram !== undefined ||
        (window as any).TelegramWebviewProxy !== undefined

      // Check if MetaMask mobile browser
      const metamask = /MetaMask/i.test(navigator.userAgent) ||
        (window.ethereum && window.ethereum.isMetaMask && mobile)

      setIsMobile(mobile)
      setIsTelegram(telegram)
      setIsMetaMaskBrowser(metamask)

      // Add classes to body for CSS targeting
      if (mobile) document.body.classList.add('mobile')
      if (telegram) document.body.classList.add('telegram')
      if (metamask) document.body.classList.add('metamask-browser')
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)

    return () => {
      window.removeEventListener('resize', checkDevice)
      document.body.classList.remove('mobile', 'telegram', 'metamask-browser')
    }
  }, [])

  return { isMobile, isTelegram, isMetaMaskBrowser }
}

// Convenience alias to match older import signature
export const useIsMobile = useMobile;
