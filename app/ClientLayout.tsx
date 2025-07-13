"use client"

import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { BuildErrorDisplay } from "@/components/build-error-display"
import { SocialSidebar } from "@/components/social-sidebar"
// import { MobileNavigation } from "@/components/mobile-navigation"
import { setupGlobalErrorHandling } from "@/utils/logger"
import { ErrorBoundary } from "@/components/error-boundary"
import { useEffect, useState } from "react"
// Import i18n
import "@/lib/i18n"
// Import Web3 provider
import { WagmiProvider } from "wagmi"
import { config } from "@/config/wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { apeChain } from '@/config/chains'
import { PerformanceProvider } from "@/hooks/use-performance-context"
import { useWalletEvents } from "@/hooks/use-wallet-events"
import { useMobile } from "@/hooks/use-mobile"

// Create a client for React Query
const queryClient = new QueryClient()

// Music player removed (only optional per-page)

// Inner component that uses wallet events - must be inside WagmiProvider
function WalletEventHandler({ children }: { children: React.ReactNode }) {
  useWalletEvents()
  const { isMobile } = useMobile()
  return <>{children}</>
}

// Initialize Web3Modal only if enabled and has valid project ID
if (typeof window !== 'undefined' && !(window as any).web3modal_initialized) {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'crazycube-project-id'
  const isEnabled = process.env.NEXT_PUBLIC_WEB3_MODAL_ENABLED !== 'false' && projectId !== 'disabled'
  
  if (isEnabled && projectId !== 'crazycube-project-id') {
    createWeb3Modal({
      wagmiConfig: config,
      projectId,
      enableAnalytics: false,
      enableOnramp: false,  // Purchase crypto with fiat
      enableSwaps: true,    // 🔥 ENABLE SWAP FUNCTION
      themeMode: 'dark',
      themeVariables: {
        '--w3m-accent': '#0EA5E9',
        '--w3m-border-radius-master': '8px',
      },
      // Settings for recommended wallets
      featuredWalletIds: [
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
        '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
      ]
    })
    ;(window as any).web3modal_initialized = true
  }
}

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [mounted, setMounted] = useState(false)

  // Initialize i18n and error handling on client side
  useEffect(() => {
    setMounted(true)
    
    // Run global error handling immediately in client
    setupGlobalErrorHandling()

    // This ensures i18n is fully initialized on the client side
    const initI18n = async () => {
      try {
        const i18n = (await import("@/lib/i18n")).default
        if (i18n && !i18n.isInitialized) {
          await i18n.init()
        }
      } catch (error) {
        console.error("Failed to initialize i18n:", error)
      }
    }

    // Suppress common wallet extension errors
    const suppressEthereumErrors = () => {
      const originalError = console.error
      console.error = (...args) => {
        const message = args.join(' ')
        // Suppress known wallet extension conflicts and WebSocket errors
        if (
          message.includes('Cannot read properties of undefined (reading \'global\')') ||
          message.includes('provider - this is likely due to another Ethereum wallet extension') ||
          message.includes('Unchecked runtime.lastError') ||
          message.includes('Could not establish connection') ||
          message.includes('Connection interrupted while trying to subscribe') ||
          message.includes('WebSocket connection failed') ||
          message.includes('InternalRpcError') ||
          message.includes('ContractFunctionExecutionError') ||
          message.includes('RpcRequestError')
        ) {
          return // Suppress these errors
        }
        originalError.apply(console, args)
      }
    }

    // Create default Trusted Types policy to allow safe inline HTML if CSP requires it
    const initTrustedTypes = () => {
      if (window.trustedTypes && window.trustedTypes.createPolicy) {
        try {
          // @ts-ignore
          window.trustedTypes.createPolicy('default', {
            createHTML: (input: string) => input,
          })
        } catch(_) {/* already exists */}
      }
    }

    initI18n()
    suppressEthereumErrors()
    initTrustedTypes()
  }, [])

  useEffect(() => {
    // Detect Telegram in-app browser and mobile devices then set CSS classes for easier styling/runtime tweaks
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || "";
      const isTelegramBrowser = ua.includes("Telegram");
      const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || window.innerWidth < 768;

      const root = document.documentElement;
      if (isMobileDevice) root.classList.add("mobile");
      if (isTelegramBrowser) root.classList.add("telegram");
      // Reduce very heavy animations on constrained/mobile environments
      if (isMobileDevice || isTelegramBrowser) {
        root.classList.add("reduce-motion");
      }
    }
  }, []);

  return (
    <>
      {!mounted ? null : (
        <ThemeProvider attribute="class" defaultTheme="dark">
          <WagmiProvider config={config} reconnectOnMount={false}>
            <QueryClientProvider client={queryClient}>
              <ErrorBoundary>
                <PerformanceProvider>
                  <WalletEventHandler>
                    <div>
                      {/* LanguageSwitcher removed */}
                      {children}
                      {mounted && (
                        <>
                          <Toaster />
                          <BuildErrorDisplay />
                          <SocialSidebar />
                          {/* <MobileNavigation /> */}
                        </>
                      )}
                    </div>
                  </WalletEventHandler>
                </PerformanceProvider>
              </ErrorBoundary>
            </QueryClientProvider>
          </WagmiProvider>
        </ThemeProvider>
      )}
    </>
  )
}
