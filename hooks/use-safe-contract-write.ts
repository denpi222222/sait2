import {
  useAccount,
  useChainId,
  useSwitchChain,
  useWriteContract,
} from 'wagmi';
import { apeChain } from '@/config/chains';
import { ALLOWED_CONTRACTS } from '@/config/allowedContracts';
import { toast } from '@/components/ui/use-toast';
import { useCallback } from 'react';

/**
 * Safe contract write hook that ensures the user is on the correct chain
 * before allowing contract writes
 */
export function useSafeContractWrite() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContract, ...writeContractReturn } = useWriteContract();

  const safeWriteContract = useCallback(
    async (args: Parameters<typeof writeContract>[0]) => {
      // Check if wallet is connected
      if (!isConnected) {
        toast({
          title: 'Wallet not connected',
          description: 'Please connect your wallet first',
          variant: 'destructive',
        });
        return;
      }

      // Check if contract is allowed
      if (!ALLOWED_CONTRACTS.has(args.address.toLowerCase() as `0x${string}`)) {
        toast({
          title: 'Contract blocked',
          description: 'Attempt to write to an unknown contract',
          variant: 'destructive',
        });
        return;
      }

      // Check if on correct chain
      if (chainId !== apeChain.id) {
        toast({
          title: 'Wrong network',
          description: 'Switching to ApeChain...',
        });

        try {
          await switchChain({ chainId: apeChain.id });
          // Wait a bit for the chain switch to complete
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          toast({
            title: 'Network switch failed',
            description: 'Please switch to ApeChain manually',
            variant: 'destructive',
          });
          return;
        }
      }

      // Proceed with the contract write
      return writeContract(args);
    },
    [isConnected, chainId, switchChain, writeContract]
  );

  return {
    writeContract: safeWriteContract,
    ...writeContractReturn,
  };
}
