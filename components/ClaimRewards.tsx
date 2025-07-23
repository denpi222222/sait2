'use client';

import React from 'react';
import { usePendingBurnRewards } from '@/hooks/usePendingBurnRewards';
import { useBurnRecord } from '@/hooks/useNFTGameData';
import { useCrazyCubeGame } from '@/hooks/useCrazyCubeGame';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Clock, Gift, Coins, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useReadContract, useAccount, usePublicClient } from 'wagmi';
import { NFT_CONTRACT_ADDRESS, GAME_CONTRACT_ADDRESS } from '@/config/wagmi';
import { useTranslation } from 'react-i18next';
import { useNetwork } from '@/hooks/use-network';

// REWRITTEN FROM SCRATCH AS REQUESTED
interface ClaimableNFTCardProps {
  tokenId: string;
  onClaim: (tokenId: string) => void;
  isLoading: boolean;
  index: number;
}

const ClaimableNFTCard = ({
  tokenId,
  onClaim,
  isLoading,
  index,
}: ClaimableNFTCardProps) => {
  const { t } = useTranslation();
  const { burnRecord, isLoading: isLoadingBurnRecord } = useBurnRecord(tokenId);
  const { address: wallet } = useAccount();
  const { data: currentOwner } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: [
      {
        inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
        name: 'ownerOf',
        outputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    ] as const,
    functionName: 'ownerOf',
    args: [BigInt(tokenId)],
    query: { enabled: !!tokenId },
  });
  const { isApeChain, requireApeChain } = useNetwork();

  if (isLoadingBurnRecord) {
    return (
      <Card className='border-orange-500/30 bg-slate-900/50 backdrop-blur-sm'>
        <CardContent className='p-6'>
          <div className='animate-pulse flex space-x-4'>
            <div className='rounded-lg bg-slate-700 h-24 w-24'></div>
            <div className='flex-1 space-y-2'>
              <div className='h-4 bg-slate-700 rounded w-3/4'></div>
              <div className='h-4 bg-slate-700 rounded w-1/2'></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (
    !burnRecord ||
    burnRecord.claimed ||
    parseFloat(burnRecord.lockedAmountFormatted) === 0
  ) {
    return null;
  }

  const isRevivedByOther =
    currentOwner &&
    currentOwner.toLowerCase() !== GAME_CONTRACT_ADDRESS.toLowerCase() &&
    wallet &&
    currentOwner.toLowerCase() !== wallet.toLowerCase();

  const getWaitPeriodColor = (period: number) => {
    switch (period) {
      case 0:
        return 'bg-red-500';
      case 1:
        return 'bg-orange-500';
      case 2:
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRewardPercentage = (period: number) => {
    switch (period) {
      case 0:
        return 50;
      case 1:
        return 60;
      case 2:
        return 70;
      default:
        return 50;
    }
  };

  const rewardPercentage = getRewardPercentage(burnRecord.waitPeriod);
  const estimatedReward =
    parseFloat(burnRecord.lockedAmountFormatted) * (rewardPercentage / 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className='border-orange-500/30 bg-slate-900/50 backdrop-blur-sm hover:border-orange-500/50 transition-colors'>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-lg font-semibold text-orange-100'>
              {`NFT #${tokenId}`}
            </CardTitle>
            <div className='flex gap-2'>
              <Badge
                className={`${getWaitPeriodColor(burnRecord.waitPeriod)} text-white`}
              >
                {burnRecord.waitPeriodHours}h
              </Badge>
              {burnRecord.canClaim && (
                <Badge className='bg-green-500 text-white animate-pulse'>
                  <Gift className='w-3 h-3 mr-1' />
                  {t('status.ready', 'Ready')}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className='space-y-4'>
          <div className='flex items-center gap-4'>
            <img
              src={`/images/zol${(index % 7) + 1}.png`}
              alt={`NFT #${tokenId}`}
              className='w-16 h-16 rounded-lg object-cover border border-orange-500/30'
            />

            <div className='flex-1 space-y-2'>
              {isRevivedByOther && (
                <div className='text-center text-xs mb-2 py-1 rounded-full bg-blue-500/20 text-blue-300'>
                  Revived by another player
                </div>
              )}

              <div className='flex justify-between text-sm'>
                <span className='text-slate-400'>Locked Amount:</span>
                <span className='text-orange-300 font-mono'>
                  {parseFloat(burnRecord.lockedAmountFormatted).toFixed(2)} CRA
                </span>
              </div>

              <div className='flex justify-between text-sm'>
                <span className='text-slate-400'>Estimated Reward:</span>
                <span className='text-green-300 font-mono font-bold'>
                  {estimatedReward.toFixed(2)} CRAA ({rewardPercentage}%)
                </span>
              </div>

              <div className='flex justify-between text-sm'>
                <span className='text-slate-400'>Status:</span>
                <div className='flex items-center gap-1'>
                  {burnRecord.canClaim ? (
                    <>
                      <CheckCircle className='w-4 h-4 text-green-400' />
                      <span className='text-green-400 font-medium'>
                        {t('status.readyToClaim', 'Ready to Claim')}
                      </span>
                    </>
                  ) : (
                    <>
                      <Clock className='w-4 h-4 text-yellow-400' />
                      <span className='text-yellow-400'>
                        {burnRecord.timeLeftFormatted}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={requireApeChain(() => onClaim(tokenId))}
            disabled={!isApeChain || !burnRecord.canClaim || isLoading}
            className={`w-full ${
              burnRecord.canClaim
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'
                : 'bg-slate-700 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className='w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2'
              />
            ) : (
              <Coins className='w-4 h-4 mr-2' />
            )}
            {burnRecord.canClaim
              ? `Claim ${estimatedReward.toFixed(2)} CRAA`
              : `Wait ${burnRecord.timeLeftFormatted}`}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const ClaimRewards = () => {
  const {
    rewards,
    loading: isLoadingNfts,
    error: nftsError,
    refreshing,
    refresh,
  } = usePendingBurnRewards();
  const { toast } = useToast();

  const {
    claimBurnRewards,
    isWritePending,
    isTxLoading,
    isTxSuccess,
    isTxError,
    txHash,
    writeError,
    txError,
  } = useCrazyCubeGame();

  const publicClient = usePublicClient();
  const { t } = useTranslation();

  const handleClaim = async (tokenId: string) => {
    try {
      const hash = await claimBurnRewards(tokenId);
      toast({
        title: 'Claim transaction sent',
        description: `TX: ${hash.slice(0, 10)}...`,
      });

      await publicClient!.waitForTransactionReceipt({ hash });

      toast({ title: 'Rewards claimed!' });
      refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to claim rewards';
      toast({
        title: 'Claim Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  if (isLoadingNfts && rewards.length === 0) {
    return (
      <div className='flex justify-center items-center py-12'>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className='w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full'
        />
        <span className='ml-3 text-green-300'>
          Loading claimable rewards...
        </span>
      </div>
    );
  }

  if (nftsError) {
    return (
      <div className='text-center py-12'>
        <AlertCircle className='w-12 h-12 text-red-400 mx-auto mb-4' />
        <div className='text-red-400 mb-2'>Error loading data</div>
        <div className='text-slate-400'>{nftsError}</div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <h2 className='text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-2'>
          Claim Your Rewards
        </h2>
        <p className='text-slate-400'>Collect rewards from your burned NFTs</p>
        <div className='mt-4'>
          <Button variant='secondary' onClick={refresh} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {rewards.map((r, index) => (
          <ClaimableNFTCard
            key={r.tokenId}
            tokenId={r.tokenId}
            onClaim={handleClaim}
            isLoading={isWritePending || isTxLoading}
            index={index}
          />
        ))}
      </div>

      {rewards.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='text-center py-12'
        >
          <div className='text-6xl mb-4'>🎁</div>
          <h3 className='text-xl font-semibold text-green-300 mb-2'>
            No Rewards to Claim
          </h3>
          <p className='text-slate-400'>
            Burn some NFTs first to earn rewards!
          </p>
        </motion.div>
      )}

      {/* Transaction Status */}
      {(isWritePending || isTxLoading) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='text-center bg-blue-500/10 border border-blue-500/20 rounded-lg p-4'
        >
          <div className='flex justify-center items-center gap-2'>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className='w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full'
            />
            <span className='text-blue-300'>
              {isWritePending
                ? t(
                    'sections.claim.waitingForWallet',
                    'Waiting for wallet confirmation...'
                  )
                : t('sections.claim.processingClaim', 'Processing claim...')}
            </span>
          </div>
          {txHash && (
            <p className='text-xs text-slate-400 mt-2'>
              Hash: {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </p>
          )}
        </motion.div>
      )}

      {isTxSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className='text-center bg-green-500/10 border border-green-500/20 rounded-lg p-4'
        >
          <div className='text-green-400 text-lg'>
            🎉 Rewards Claimed Successfully!
          </div>
          <p className='text-sm text-slate-400 mt-1'>
            Your CRAA rewards have been transferred to your wallet.
          </p>
        </motion.div>
      )}

      {(writeError || txError || isTxError) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className='text-center bg-red-500/10 border border-red-500/20 rounded-lg p-4'
        >
          <div className='text-red-400 text-lg'>❌ Claim Failed</div>
          <p className='text-sm text-slate-400 mt-1'>
            {String(writeError?.message || txError || 'Unknown error occurred')}
          </p>
        </motion.div>
      )}
    </div>
  );
};
