'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { apeChain } from '@/config/chains';
import { useToast } from '@/hooks/use-toast';

// Network types
type NetworkType = 'mainnet' | 'testnet' | 'devnet';

// Network context interface
interface NetworkContextType {
  network: NetworkType;
  setNetwork: (network: NetworkType) => void;
  isMainnet: boolean;
  isTestnet: boolean;
  isDevnet: boolean;
}

// Create context with default values
const NetworkContext = createContext<NetworkContextType>({
  network: 'mainnet',
  setNetwork: () => {},
  isMainnet: true,
  isTestnet: false,
  isDevnet: false,
});

// Network provider component
export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<NetworkType>('mainnet');

  // Computed properties
  const isMainnet = network === 'mainnet';
  const isTestnet = network === 'testnet';
  const isDevnet = network === 'devnet';

  // Function to change network
  const setNetwork = (newNetwork: NetworkType) => {
    setNetworkState(newNetwork);
    // Save to localStorage for persistence
    localStorage.setItem('preferred_network', newNetwork);
  };

  // Load saved network preference on mount
  useEffect(() => {
    const savedNetwork = localStorage.getItem(
      'preferred_network'
    ) as NetworkType | null;
    if (
      savedNetwork &&
      ['mainnet', 'testnet', 'devnet'].includes(savedNetwork)
    ) {
      setNetworkState(savedNetwork);
    }
  }, []);

  return (
    <NetworkContext.Provider
      value={{
        network,
        setNetwork,
        isMainnet,
        isTestnet,
        isDevnet,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

// Hook for using the network context
export function useNetwork() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { toast } = useToast();
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchAttempts, setSwitchAttempts] = useState(0);

  const isApeChain = chainId === apeChain.id;

  // Auto-switch on connection
  useEffect(() => {
    if (isConnected && !isApeChain && !isSwitching) {
      const timer = setTimeout(() => {
        forceSwitchToApeChain();
      }, 1500);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isConnected, isApeChain, isSwitching]);

  // Force network switch with multiple attempts
  const forceSwitchToApeChain = async (maxAttempts = 5) => {
    if (isSwitching || isApeChain) return;

    setIsSwitching(true);
    setSwitchAttempts(0);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        setSwitchAttempts(attempt);

        if (!switchChain) {
          throw new Error('Switch chain not available');
        }

        await switchChain({ chainId: apeChain.id });

        // Check if we actually switched
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (chainId === apeChain.id) {
          toast({
            title: 'Network Switched Successfully!',
            description: `Connected to ApeChain after ${attempt} attempt(s)`,
            variant: 'default',
          });
          break;
        }
      } catch (error: any) {
        if (attempt === maxAttempts) {
          toast({
            title: 'Network Switch Failed',
            description: 'Please manually switch to ApeChain in your wallet',
            variant: 'destructive',
          });
        } else {
          // Wait before next attempt
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }

    setIsSwitching(false);
  };

  // Regular network switch
  const switchToApeChain = async () => {
    if (!switchChain) {
      toast({
        title: 'Switch Network',
        description: 'Please switch to ApeChain in your wallet!',
        variant: 'destructive',
      });
      return;
    }

    try {
      await switchChain({ chainId: apeChain.id });
      toast({
        title: 'Network Switched',
        description: 'Successfully switched to ApeChain!',
        variant: 'default',
      });
    } catch (error: any) {
      if (error.code === 4001) {
        toast({
          title: 'Network Switch Required',
          description:
            'Please manually switch to ApeChain in your wallet to use this dApp!',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Switch Failed',
          description: 'Failed to switch to ApeChain. Please try manually.',
          variant: 'destructive',
        });
      }
    }
  };

  // Wrapper for actions that require ApeChain
  const requireApeChain =
    <T extends any[]>(action: (...args: T) => Promise<any> | void) =>
    async (...args: T) => {
      if (!isApeChain) {
        toast({
          title: 'Wrong Network',
          description: 'Switching to ApeChain...',
          variant: 'default',
        });
        await forceSwitchToApeChain();
        return;
      }
      return action(...args);
    };

  return {
    isApeChain,
    isSwitching,
    switchAttempts,
    switchToApeChain,
    forceSwitchToApeChain,
    requireApeChain,
  };
}
