'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import { useCrazyCubeGame } from './useCrazyCubeGame';
import { apeChain } from '../config/chains';
import { useEffect } from 'react';

// Import ABI and addresses from the main hook
const GAME_CONTRACT_ADDRESS = apeChain.contracts.gameProxy.address;

const GAME_CONTRACT_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'nftData',
    outputs: [
      { internalType: 'uint8', name: 'rarity', type: 'uint8' },
      { internalType: 'uint8', name: 'initialStars', type: 'uint8' },
      { internalType: 'bool', name: 'isActivated', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'nftState',
    outputs: [
      { internalType: 'uint8', name: 'currentStars', type: 'uint8' },
      { internalType: 'uint256', name: 'lockedCRAA', type: 'uint256' },
      { internalType: 'uint256', name: 'lastPingTime', type: 'uint256' },
      { internalType: 'uint256', name: 'lastBreedTime', type: 'uint256' },
      { internalType: 'bool', name: 'isInGraveyard', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'burnRecords',
    outputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'totalAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'claimAvailableTime', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'graveyardReleaseTime',
        type: 'uint256',
      },
      { internalType: 'bool', name: 'claimed', type: 'bool' },
      { internalType: 'uint8', name: 'waitPeriod', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface NFTGameInfo {
  tokenId: string;
  rarity: number;
  initialStars: number;
  currentStars: number;
  isActivated: boolean;
  lockedCRAA: string;
  lockedCRAAFormatted: string;
  lastPingTime: number;
  lastBreedTime: number;
  isInGraveyard: boolean;
  canPing: boolean;
  canBreed: boolean;
  pingCooldown: number;
  breedCooldown: number;
}

export interface BurnRecordInfo {
  tokenId: string;
  lockedAmount: string;
  lockedAmountFormatted: string;
  waitPeriod: number;
  waitPeriodHours: number;
  burnTime: number;
  claimed: boolean;
  canClaim: boolean;
  timeLeft: number;
  timeLeftFormatted: string;
}

// Hook to get information about one NFT
export const useNFTGameInfo = (tokenId: string | undefined) => {
  const enabled = !!tokenId;

  const {
    data: nftData,
    isLoading: isLoadingData,
    error: dataError,
    refetch: refetchData,
  } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'nftData',
    args: tokenId ? [BigInt(tokenId)] : undefined,
    query: { enabled },
  });

  const {
    data: nftState,
    isLoading: isLoadingState,
    error: stateError,
    refetch: refetchState,
  } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'nftState',
    args: tokenId ? [BigInt(tokenId)] : undefined,
    query: { enabled },
  });

  const { pingInterval, breedCooldown: globalBreedCooldown } =
    useCrazyCubeGame();

  const formatNFTInfo = (): NFTGameInfo | null => {
    if (!nftData || !nftState || !tokenId) return null;

    const currentTime = Math.floor(Date.now() / 1000);
    const pingSec = pingInterval || 180;
    const breedSec = globalBreedCooldown || 3600;
    const pingCooldown = Math.max(
      0,
      Number(nftState[2]) + pingSec - currentTime
    );
    const breedCooldown = Math.max(
      0,
      Number(nftState[3]) + breedSec - currentTime
    );

    return {
      tokenId,
      rarity: Number(nftData[0]), // ✅ SAFE: taken from smart contract
      initialStars: Number(nftData[1]),
      currentStars: Number(nftState[0]),
      isActivated: nftData[2],
      lockedCRAA: nftState[1].toString(),
      lockedCRAAFormatted: formatEther(nftState[1]),
      lastPingTime: Number(nftState[2]),
      lastBreedTime: Number(nftState[3]),
      isInGraveyard: nftState[4],
      canPing: nftData[2] && !nftState[4] && pingCooldown === 0, // activated, not in grave, no cooldown
      canBreed:
        nftData[2] &&
        !nftState[4] &&
        Number(nftState[0]) > 0 &&
        breedCooldown === 0, // has stars
      pingCooldown,
      breedCooldown,
    };
  };

  const refetch = () => {
    refetchData();
    refetchState();
  };

  return {
    nftInfo: formatNFTInfo(),
    isLoading: isLoadingData || isLoadingState,
    error: dataError || stateError,
    refetch,
  };
};

// Hook for getting information about burn record
export const useBurnRecord = (tokenId: string | undefined) => {
  const enabled = !!tokenId;

  const {
    data: burnRecord,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'burnRecords',
    args: tokenId ? [BigInt(tokenId)] : undefined,
    query: { enabled },
  });

  const { pingInterval, breedCooldown: globalBreedCooldown } =
    useCrazyCubeGame();

  const formatBurnRecord = (): BurnRecordInfo | null => {
    if (!burnRecord || !tokenId) return null;

    const currentTime = Math.floor(Date.now() / 1000);
    const pingSec = pingInterval || 180;
    const breedSec = globalBreedCooldown || 3600;
    const waitPeriodHours = [12, 24, 48][Number(burnRecord[5])] || 24;
    const claimTime = Number(burnRecord[2]);
    const timeLeft = Math.max(0, claimTime - currentTime);
    const canClaim =
      !burnRecord[4] && timeLeft === 0 && Number(burnRecord[1]) > 0;

    const formatTimeLeft = (seconds: number): string => {
      if (seconds === 0) return 'Ready!';
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    };

    return {
      tokenId,
      lockedAmount: burnRecord[1].toString(),
      lockedAmountFormatted: formatEther(burnRecord[1]),
      waitPeriod: Number(burnRecord[5]),
      waitPeriodHours,
      burnTime: Number(burnRecord[2]),
      claimed: burnRecord[4],
      canClaim,
      timeLeft,
      timeLeftFormatted: formatTimeLeft(timeLeft),
    };
  };

  return {
    burnRecord: formatBurnRecord(),
    isLoading,
    error,
    refetch,
  };
};

// Hook for getting information about multiple NFT
export const useMultipleNFTGameInfo = (tokenIds: string[]) => {
  const enabled = tokenIds.length > 0;

  // Prepare contracts for batch reading
  const dataContracts = tokenIds.map(tokenId => ({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'nftData',
    args: [BigInt(tokenId)],
  }));

  const stateContracts = tokenIds.map(tokenId => ({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'nftState',
    args: [BigInt(tokenId)],
  }));

  const {
    data: nftDataResults,
    isLoading: isLoadingData,
    error: dataError,
    refetch: refetchData,
  } = useReadContracts({
    contracts: dataContracts,
    query: { enabled },
  });

  const {
    data: nftStateResults,
    isLoading: isLoadingState,
    error: stateError,
    refetch: refetchState,
  } = useReadContracts({
    contracts: stateContracts,
    query: { enabled },
  });

  const { pingInterval, breedCooldown: globalBreedCooldown } =
    useCrazyCubeGame();

  const formatMultipleNFTInfo = (): NFTGameInfo[] => {
    if (!nftDataResults || !nftStateResults) return [];

    const currentTime = Math.floor(Date.now() / 1000);

    return tokenIds
      .map((tokenId, index) => {
        const dataResult = nftDataResults[index];
        const stateResult = nftStateResults[index];

        if (
          !dataResult ||
          !stateResult ||
          dataResult.status !== 'success' ||
          stateResult.status !== 'success'
        ) {
          return null;
        }

        const nftData = dataResult.result as any;
        const nftState = stateResult.result as any;

        const pingSec = pingInterval || 180;
        const breedSec = globalBreedCooldown || 3600;
        const pingCooldown = Math.max(
          0,
          Number(nftState[2]) + pingSec - currentTime
        );
        const breedCooldown = Math.max(
          0,
          Number(nftState[3]) + breedSec - currentTime
        );

        return {
          tokenId,
          rarity: Number(nftData[0]),
          initialStars: Number(nftData[1]),
          currentStars: Number(nftState[0]),
          isActivated: nftData[2],
          lockedCRAA: nftState[1].toString(),
          lockedCRAAFormatted: formatEther(nftState[1]),
          lastPingTime: Number(nftState[2]),
          lastBreedTime: Number(nftState[3]),
          isInGraveyard: nftState[4],
          canPing: nftData[2] && !nftState[4] && pingCooldown === 0,
          canBreed:
            nftData[2] &&
            !nftState[4] &&
            Number(nftState[0]) > 0 &&
            breedCooldown === 0,
          pingCooldown,
          breedCooldown,
        };
      })
      .filter((info): info is NFTGameInfo => info !== null);
  };

  const refetch = () => {
    refetchData();
    refetchState();
  };

  return {
    nftInfos: formatMultipleNFTInfo(),
    isLoading: isLoadingData || isLoadingState,
    error: dataError || stateError,
    refetch,
  };
};
