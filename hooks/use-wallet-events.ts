import { useEffect, useRef } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

/**
 * Hook to handle wallet events like account/chain changes
 * Improves security by notifying users and redirecting from sensitive pages
 */
export function useWalletEvents(options?: {
  redirectOnChange?: boolean;
  sensitiveRoute?: boolean;
}) {
  const { address } = useAccount();
  const chainId = useChainId();
  const router = useRouter();

  // Use refs to persist values between renders
  const previousAddressRef = useRef<string | undefined>(address);
  const previousChainIdRef = useRef<number | undefined>(chainId);

  useEffect(() => {
    // Account changed
    if (
      previousAddressRef.current &&
      address &&
      previousAddressRef.current !== address
    ) {
      toast({
        title: 'Account changed',
        description: 'Your wallet account has changed',
      });

      if (options?.sensitiveRoute && options?.redirectOnChange) {
        router.push('/');
      }
    }

    // Chain changed
    if (
      previousChainIdRef.current &&
      chainId &&
      previousChainIdRef.current !== chainId
    ) {
      toast({
        title: 'Network changed',
        description: 'Your wallet network has changed',
      });

      if (options?.sensitiveRoute && options?.redirectOnChange) {
        router.push('/');
      }
    }

    // Update refs with current values
    previousAddressRef.current = address;
    previousChainIdRef.current = chainId;
  }, [
    address,
    chainId,
    router,
    options?.redirectOnChange,
    options?.sensitiveRoute,
  ]);
}
