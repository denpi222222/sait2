import { useAccount, useChainId } from 'wagmi';
import { useEffect, useState } from 'react';

const APECHAIN_ID = 33139; // ApeChain mainnet

export function useNetworkGuard() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [needsNetworkSwitch, setNeedsNetworkSwitch] = useState(false);

  useEffect(() => {
    if (isConnected && chainId !== APECHAIN_ID) {
      setNeedsNetworkSwitch(true);
    } else {
      setNeedsNetworkSwitch(false);
    }
  }, [isConnected, chainId]);

  return {
    needsNetworkSwitch,
    isConnected,
    currentChainId: chainId,
    requiredChainId: APECHAIN_ID,
    isCorrectNetwork: chainId === APECHAIN_ID,
  };
}
