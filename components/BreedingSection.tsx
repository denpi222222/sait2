"use client"

import React, { useState } from 'react';
import { useUserNFTs, getTokenIdAsDecimal, getNFTImage, getNFTName } from '@/hooks/useUserNFTs';
import { useMultipleNFTGameInfo } from '@/hooks/useNFTGameData';
import { useCrazyCubeGame } from '@/hooks/useCrazyCubeGame';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Star, Clock, Zap, Plus, X, AlertCircle } from 'lucide-react';
import CooldownBadge from '@/components/CooldownBadge';
import { useToast } from '@/hooks/use-toast';
import { ShyCubes } from '@/components/ShyCubes';
import { useTranslation } from 'react-i18next';
import { formatWithCommas } from "@/utils/formatNumber"

interface BreedableNFTProps {
  nft: any;
  gameInfo: any;
  isSelected: boolean;
  onSelect: (tokenId: string) => void;
  disabled: boolean;
}

const BreedableNFT = ({ nft, gameInfo, isSelected, onSelect, disabled }: BreedableNFTProps) => {
  const { t } = useTranslation();

  const formatTimeLeft = (seconds: number): string => {
    if (seconds === 0) return t('status.ready', 'Ready!')
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  const canBreed = gameInfo?.canBreed && !disabled;
  
  // Check if NFT has active cooldowns (is newborn or on cooldown)
  const hasActiveCooldown = gameInfo?.breedCooldown > 0 || !canBreed

  return (
    <motion.div
      whileHover={{ scale: canBreed ? 1.02 : 1 }}
      whileTap={{ scale: canBreed ? 0.98 : 1 }}
      className={hasActiveCooldown ? 'grayscale opacity-60' : ''}
    >
      <Card 
        className={`cursor-pointer transition-all duration-200 ${
          isSelected 
            ? 'border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/20' 
            : canBreed
            ? 'border-orange-500/30 bg-slate-900/50 hover:border-orange-500/50'
            : 'border-slate-600/30 bg-slate-800/30 opacity-60'
        }`}
        onClick={() => canBreed && onSelect(nft.id.tokenId)}
      >
        <CardContent className="p-4">
          <div className="relative">
            <img 
              src={nft ? getNFTImage(nft) : ''} 
              alt={nft ? getNFTName(nft) : ''} 
              className="w-full h-32 object-cover rounded-lg mb-3"
            />
            
            {/* Selection indicator */}
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center"
              >
                <Heart className="w-4 h-4 text-white fill-current" />
              </motion.div>
            )}

            {/* Status badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {gameInfo?.isActivated && (
                <Badge className="bg-green-500/80 text-white text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              )}
            </div>

            {/* Stars */}
            <div className="absolute top-2 right-2">
              <Badge className="bg-yellow-500/80 text-black font-bold text-xs">
                ⭐ {gameInfo?.currentStars || 0}
              </Badge>
            </div>

            {/* Cooldown badge */}
            {gameInfo?.breedCooldown && gameInfo.breedCooldown > 0 && (
              <CooldownBadge secondsLeft={gameInfo.breedCooldown} />
            )}
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-orange-100 text-sm truncate">{getNFTName(nft)}</h4>
            
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Rarity:</span>
              <span className="text-orange-300">{gameInfo?.rarity || 'N/A'}</span>
            </div>

            {/* Breeding status */}
            <div className="text-xs">
              {gameInfo?.canBreed ? (
                <span className="text-green-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Ready to breed
                </span>
              ) : gameInfo?.breedCooldown > 0 ? (
                <span className="text-yellow-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeLeft(gameInfo.breedCooldown)}
                </span>
              ) : (
                <span className="text-red-400 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  {gameInfo?.currentStars === 0 ? "No stars" : "Not available"}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const BreedingSection = () => {
  const { nfts, loading: isLoadingNfts, error: nftsError } = useUserNFTs();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [selectedParents, setSelectedParents] = useState<string[]>([]);
  
  // Get game info for all NFTs
  const tokenIds = nfts.map(nft => nft.id.tokenId);
  const { nftInfos, isLoading: isLoadingGameInfo } = useMultipleNFTGameInfo(tokenIds);
  
  const {
    breedNFTs,
    approveCRA,
    breedCost,
    craBalance,
    graveyardSize,
    isWritePending,
    isTxLoading,
    isTxSuccess,
    isTxError,
    txHash,
    writeError,
    txError
  } = useCrazyCubeGame();

  const handleSelectParent = (tokenId: string) => {
    setSelectedParents(prev => {
      if (prev.includes(tokenId)) {
        return prev.filter(id => id !== tokenId);
      } else if (prev.length < 2) {
        return [...prev, tokenId];
      } else {
        // Replace the first selected parent
        return [prev[1]!, tokenId];
      }
    });
  };

  const handleBreed = async () => {
    if (selectedParents.length !== 2) {
      toast({
        variant: "destructive",
        title: "Selection Error",
        description: t('sections.breed.needTwoNfts', 'You need to select exactly 2 NFTs for breeding'),
      });
      return;
    }

    const breedCostNum = parseFloat(breedCost);
    const craBalanceNum = parseFloat(craBalance);

    if (craBalanceNum < breedCostNum) {
      toast({
        title: "Insufficient CRA",
        description: `You need ${breedCostNum.toFixed(2)} CRA for breeding. You have ${craBalanceNum.toFixed(2)} CRA.`,
        variant: "destructive",
      });
      return;
    }

    if (graveyardSize === 0) {
      toast({
        title: "Empty Graveyard",
        description: "The graveyard is empty. Burn some NFTs first to enable breeding.",
        variant: "destructive",
      });
      return;
    }

    try {
      // First approve CRA (approve function itself adds +10% buffer)
      await approveCRA(breedCost);
      
      toast({
        title: "Approval Sent",
        description: "Please confirm the CRA approval transaction",
      });

      // Wait for approval, then breed
      setTimeout(async () => {
        try {
          await breedNFTs(selectedParents[0] as string, selectedParents[1] as string);
          toast({
            title: "Breeding Initiated",
            description: `Breeding NFT #${selectedParents[0] as string} with NFT #${selectedParents[1] as string}`,
          });
          setSelectedParents([]); // Clear selection
        } catch (breedError: any) {
          toast({
            title: "Breeding Failed",
            description: breedError.message || "Failed to breed NFTs",
            variant: "destructive",
          });
        }
      }, 3000);
    } catch (error: any) {
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to process transaction",
        variant: "destructive",
      });
    }
  };

  // Filter breedable NFTs
  const breedableNfts = nfts.filter(nft => {
    const tokenHex = nft.id.tokenId;
    const gameInfo = nftInfos.find(info => info.tokenId === tokenHex);
    return gameInfo?.canBreed;
  });

  if (isLoadingNfts || isLoadingGameInfo) {
    return (
      <div className="flex justify-center items-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full"
        />
        <span className="ml-3 text-pink-300">Loading breeding candidates...</span>
      </div>
    );
  }

  if (nftsError) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <div className="text-red-400 mb-2">Error loading NFTs</div>
        <div className="text-slate-400">{nftsError}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 mb-2">
          Breed Your Cubes
        </h2>
        <p className="text-slate-400 mb-4">
          Select 2 NFTs to create a new one from the graveyard
        </p>
        
        {/* Breeding stats */}
        <div className="flex justify-center gap-6 text-sm">
          <div className="text-center">
            <div className="text-orange-300 font-bold">{breedCost} CRA</div>
            <div className="text-slate-400">Breeding Cost</div>
          </div>
          <div className="text-center">
            <div className="text-green-300 font-bold">{parseFloat(craBalance).toFixed(0)} CRA</div>
            <div className="text-slate-400">Your Balance</div>
          </div>
          <div className="text-center">
            <div className="text-purple-300 font-bold">{graveyardSize}</div>
            <div className="text-slate-400">Graveyard Size</div>
          </div>
        </div>
      </div>

      {/* Selected parents display */}
      <AnimatePresence>
        {selectedParents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-lg p-4"
          >
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-pink-300 mb-2">Selected Parents</h3>
              <div className="flex justify-center items-center gap-4">
                {selectedParents.map((parentId, index) => {
                  const nft = nfts.find(n => n.id.tokenId === parentId);
                  const gameInfo = nftInfos.find(info => info.tokenId === parentId);
                  return (
                    <div key={parentId} className="flex items-center gap-2">
                      <div className="text-center">
                        <img 
                          src={nft ? getNFTImage(nft) : ''} 
                          alt={nft ? getNFTName(nft) : ''} 
                          className="w-16 h-16 rounded-lg border-2 border-pink-500/50"
                        />
                        <div className="text-xs text-pink-300 mt-1">
                          #{parentId} ({gameInfo?.currentStars}⭐)
                        </div>
                      </div>
                      {index === 0 && selectedParents.length === 2 && (
                        <Plus className="w-6 h-6 text-pink-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="text-center">
              <Button
                onClick={handleBreed}
                disabled={selectedParents.length !== 2 || isWritePending || isTxLoading}
                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50"
              >
                {isWritePending || isTxLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                ) : (
                  <Heart className="w-4 h-4 mr-2" />
                )}
                Breed Selected NFTs ({breedCost} CRA)
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breedable NFTs grid */}
      {breedableNfts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {breedableNfts.map((nft) => {
            const tokenHex = nft.id.tokenId;
            return (
              <BreedableNFT
                key={nft.id.tokenId}
                nft={nft}
                gameInfo={nftInfos.find(info => info.tokenId === tokenHex)}
                isSelected={selectedParents.includes(tokenHex)}
                onSelect={handleSelectParent}
                disabled={selectedParents.length >= 2 && !selectedParents.includes(tokenHex)}
              />
            );
          })}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="text-6xl mb-4">💔</div>
          <h3 className="text-xl font-semibold text-pink-300 mb-2">No Breedable NFTs</h3>
          <p className="text-slate-400">
            Your NFTs need to be activated, have stars, and not be on cooldown to breed.
          </p>
        </motion.div>
      )}

      {/* Transaction status */}
      {(isWritePending || isTxLoading) && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center bg-blue-500/10 border border-blue-500/20 rounded-lg p-4"
        >
          <div className="flex justify-center items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"
            />
            <span className="text-blue-300">
              {isWritePending ? t('sections.breed.waitingForWallet', 'Waiting for wallet confirmation...') : t('sections.breed.processingBreeding', 'Processing breeding...')}
            </span>
          </div>
          {txHash && (
            <p className="text-xs text-slate-400 mt-2">
              Hash: {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </p>
          )}
        </motion.div>
      )}

      {isTxSuccess && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-pink-500/10 border border-pink-500/20 rounded-lg p-4"
        >
          <div className="text-pink-400 text-lg">💕 Breeding Successful!</div>
          <p className="text-sm text-slate-400 mt-1">
            A new NFT has been resurrected from the graveyard! Check your collection.
          </p>
        </motion.div>
      )}

      {(writeError || txError || isTxError) && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-red-500/10 border border-red-500/20 rounded-lg p-4"
        >
          <div className="text-red-400 text-lg">❌ Breeding Failed</div>
          <p className="text-sm text-slate-400 mt-1">
            {String(writeError?.message || txError || "Unknown error occurred")}
          </p>
        </motion.div>
      )}
      <ShyCubes active={selectedParents.length > 0} />
    </div>
  );
};
