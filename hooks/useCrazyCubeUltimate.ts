import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import CrazyCubeUltimateABI_JSON from '@/contracts/abi/CrazyCubeUltimate.json'; // Import ABI
import { NFT_CONTRACT_ADDRESS, MAIN_CHAIN_ID } from '@/config/wagmi'; // Contract address and network ID

// In Wagmi v2 ABI is passed as array. If your JSON file is object with 'abi' field, use CrazyCubeUltimateABI_JSON.abi
// If JSON file is directly ABI array, then use CrazyCubeUltimateABI_JSON
// This line tries to handle both cases.
const contractAbi =
  (CrazyCubeUltimateABI_JSON as any).abi || CrazyCubeUltimateABI_JSON;

export function useCrazyCubeUltimate() {
  const { address: accountAddress, chainId } = useAccount();
  const isConnectedToCorrectChain = chainId === MAIN_CHAIN_ID;

  // --- Functions to read data from contract ---

  // Get total NFT count (totalSupply)
  const {
    data: totalSupply,
    isLoading: isLoadingTotalSupply,
    error: errorTotalSupply,
    refetch: refetchTotalSupply,
  } = useReadContract({
    abi: contractAbi,
    address: NFT_CONTRACT_ADDRESS,
    functionName: 'totalSupply',
    chainId: MAIN_CHAIN_ID,
    query: {
      enabled: isConnectedToCorrectChain, // Query is active if connected to correct network
    },
  });

  // Get NFT balance for current account (balanceOf)
  const {
    data: balanceOf,
    isLoading: isLoadingBalanceOf,
    error: errorBalanceOf,
    refetch: refetchBalanceOf,
  } = useReadContract({
    abi: contractAbi,
    address: NFT_CONTRACT_ADDRESS,
    functionName: 'balanceOf',
    args: accountAddress ? [accountAddress] : undefined, // Argument - account address
    chainId: MAIN_CHAIN_ID,
    query: {
      enabled: isConnectedToCorrectChain && !!accountAddress, // Active if address exists and correct network
    },
  });

  // --- Functions to write data (send transactions) ---
  const {
    data: hash,
    error: writeContractError,
    isPending: isSubmittingTx,
    writeContractAsync,
  } = useWriteContract();

  // Function to burn NFT (burnNFT)
  const burnNFT = async (tokenId: bigint) => {
    if (!isConnectedToCorrectChain) {
      alert('Please connect to ApeChain network.');
      return;
    }
    if (!writeContractAsync) {
      alert('Error: transaction send function unavailable.');
      return;
    }
    try {
      const txHash = await writeContractAsync({
        address: NFT_CONTRACT_ADDRESS,
        abi: contractAbi,
        functionName: 'burnNFT',
        args: [tokenId],
        chainId: MAIN_CHAIN_ID,
      });
      return txHash;
    } catch (err) {
      alert(`Error burning NFT: ${(err as Error).message}`);
      throw err;
    }
  };

  // Function to activate NFT (activateNFT)
  const activateNFT = async (tokenId: bigint) => {
    if (!isConnectedToCorrectChain) {
      alert('Please connect to ApeChain network.');
      return;
    }
    if (!writeContractAsync) {
      alert('Error: transaction send function unavailable.');
      return;
    }
    try {
      const txHash = await writeContractAsync({
        address: NFT_CONTRACT_ADDRESS,
        abi: contractAbi,
        functionName: 'activateNFT',
        args: [tokenId],
        chainId: MAIN_CHAIN_ID,
      });
      return txHash;
    } catch (err) {
      alert(`Error activating NFT: ${(err as Error).message}`);
      throw err;
    }
  };

  // --- Read data and statuses ---
  const {
    isLoading: isConfirmingTx,
    isSuccess: isTxConfirmed,
    error: txConfirmationError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    // Read data
    totalSupply,
    isLoadingTotalSupply,
    errorTotalSupply,
    refetchTotalSupply,

    balanceOf,
    isLoadingBalanceOf,
    errorBalanceOf,
    refetchBalanceOf,

    // Write functions
    burnNFT,
    activateNFT,

    // Write statuses
    isSubmittingTx, // true, when transaction is being sent to wallet
    writeContractError, // Error when sending transaction
    hash, // Transaction hash after sending

    // Transaction confirmation statuses
    isConfirmingTx, // true, when waiting for transaction mining
    isTxConfirmed, // true, when transaction is confirmed
    txConfirmationError, // Error during transaction confirmation
  };
}
