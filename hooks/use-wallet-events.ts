import { useEffect } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { toast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

/**
 * Hook to handle wallet events like account/chain changes
 * Improves security by notifying users and redirecting from sensitive pages
 */
export function useWalletEvents(options?: {
  redirectOnChange?: boolean
  sensitiveRoute?: boolean
}) {
  const { address } = useAccount()
  const chainId = useChainId()
  const router = useRouter()

  useEffect(() => {
    let previousAddress = address
    let previousChainId = chainId

    const checkChanges = () => {
      // Account changed
      if (previousAddress && address && previousAddress !== address) {
        toast({
          title: "Account changed",
          description: "Your wallet account has changed",
        })

        if (options?.sensitiveRoute && options?.redirectOnChange) {
          router.push('/')
        }
      }

      // Chain changed
      if (previousChainId && chainId && previousChainId !== chainId) {
        toast({
          title: "Network changed",
          description: "Your wallet network has changed",
        })

        if (options?.sensitiveRoute && options?.redirectOnChange) {
          router.push('/')
        }
      }

      previousAddress = address
      previousChainId = chainId
    }

    // Check on every render
    checkChanges()
  }, [address, chainId, router, options?.redirectOnChange, options?.sensitiveRoute])
} 