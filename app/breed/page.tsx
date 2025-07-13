"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Heart, Zap, Clock, Star, Plus, X } from "lucide-react"
import { useAlchemyNfts } from "@/hooks/useAlchemyNfts"
import Link from "next/link"
import { ParticleEffect } from "@/components/particle-effect"
import { useMobile } from "@/hooks/use-mobile"
import { TabNavigation } from "@/components/tab-navigation"
import { WalletConnectNoSSR as WalletConnect } from "@/components/web3/wallet-connect.no-ssr"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { useTranslation, Trans } from "react-i18next"
import Image from "next/image"
import { BreedingEffect } from "@/components/breeding-effect"
import { useNFTContractInfo } from "@/hooks/useNFTContractInfo"
import { useCrazyCubeGame } from "@/hooks/useCrazyCubeGame"
import { usePublicClient, useAccount, useConnect } from "wagmi"
import { parseEther, formatEther } from "viem"
import { getRarityColor, getRarityLabel } from "@/lib/rarity"
import BreedCard from "@/components/BreedCard"
import dynamic from "next/dynamic"
import { getTokenIdAsDecimal } from "@/hooks/useUserNFTs"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import CubeObservers from "@/components/breeding-cube-observers"
import { useLiveBredCubes } from "@/hooks/useLiveBredCubes"
import { useGraveyardTokens } from "@/hooks/useGraveyardTokens"
import { useNFTGameInfo, useMultipleNFTGameInfo } from '@/hooks/useNFTGameData'
import { useGraveyardReadiness } from "@/hooks/useGraveyardReadiness"

// Lazy-load HeartRain only on the client to shave ~30 KB from first load
const HeartRain = dynamic(() => import("@/components/heart-rain"), {
  ssr: false,
  loading: () => null,
})

// Helper wrapper
const getRarityByStars = (stars:number)=>getRarityLabel(stars)

// Convert ipfs:// URLs to HTTPS gateway
const resolveImageSrc = (url?: string) => {
  if (!url) return '/favicon.ico'
  if (url.startsWith('ipfs://')) {
    return `https://nftstorage.link/ipfs/${url.slice(7)}`
  }
  return url
}

export default function BreedPage() {
  const { isConnected: connected, address: account } = useAccount()
  const { connect, connectors } = useConnect()
  const { nfts: userNFTs, isLoading, error, refetch } = useAlchemyNfts()
  const { revived: liveRevived, startWatching, stopWatching } = useLiveBredCubes()
  const [selectedNFTs, setSelectedNFTs] = useState<number[]>([])
  const [isBreeding, setIsBreeding] = useState(false)
  const [showBreedingEffect, setShowBreedingEffect] = useState(false)
  const [selectedNFTsData, setSelectedNFTsData] = useState<{[tokenId: number]: {currentStars: number, isActivated: boolean}}>({})
  
  const { getNFTGameData } = useCrazyCubeGame()
  const { breedCost, breedNFTs, approveCRA, craBalance, isTxLoading, isTxSuccess, isTxError, txHash, txError, CRA_TOKEN_ADDRESS, CRA_TOKEN_ABI, GAME_CONTRACT_ADDRESS, ready: graveyardReady } = useCrazyCubeGame()
  
  // Use new hook to check graveyard readiness
  const { isReady: graveyardIsReady, timeUntilReady, totalTokens: graveyardTotalTokens, loading: graveyardLoading } = useGraveyardReadiness()
  const breedingCost = parseFloat(breedCost || '0') || 0
  const { isMobile } = useMobile()
  const { toast } = useToast()
  const { t } = useTranslation()
  const publicClient = usePublicClient()
  const [mounted, setMounted] = useState(false)
  useEffect(()=>{setMounted(true)},[])
  const tr = (key:string, fallback:string)=> mounted? t(key, fallback): fallback

  // Clear selected NFTs when disconnected
  useEffect(() => {
    if (!connected) {
      setSelectedNFTs([])
      setSelectedNFTsData({})
    }
  }, [connected])

  // Start/stop event watching based on page visibility
  useEffect(() => {
    if (connected) {
      startWatching()
      return () => stopWatching()
    }
    // when disconnected nothing to clean
    return undefined
  }, [connected, startWatching, stopWatching])

  // Load data for selected NFTs
  useEffect(() => {
    const loadNFTData = async () => {
      for (const tokenId of selectedNFTs) {
        if (!selectedNFTsData[tokenId]) {
          try {
            const nftData = await getNFTGameData(tokenId.toString())
            if (nftData) {
              setSelectedNFTsData(prev => ({
                ...prev,
                [tokenId]: {
                  currentStars: nftData.currentStars,
                  isActivated: nftData.isActivated
                }
              }))
            }
          } catch (error) {
            console.error(`Error loading NFT data for ${tokenId}:`, error)
          }
        }
      }
    }

    if (selectedNFTs.length > 0 && connected) {
      loadNFTData()
    }
  }, [selectedNFTs, connected, getNFTGameData])

  // Check if selected NFTs can be bred
  const canBreedSelectedNFTs = () => {
    if (selectedNFTs.length !== 2) return false
    
    // Check graveyard readiness
    if (!graveyardIsReady) {
      return false
    }
    
    // Check that both NFTs have stars (not gray)
    for (const tokenId of selectedNFTs) {
      const nftData = selectedNFTsData[tokenId]
      if (!nftData || nftData.currentStars === 0) {
        return false
      }
    }
    
    return true
  }

  const handleSelectNFT = (tokenId: number) => {
    if (selectedNFTs.includes(tokenId)) {
      setSelectedNFTs(prev => prev.filter(id => id !== tokenId))
    } else if (selectedNFTs.length < 2) {
      setSelectedNFTs(prev => [...prev, tokenId])
    } else {
      toast({
        title: tr('sections.breed.maximumSelectionReached', 'Maximum selection reached'),
        description: tr('sections.breed.canOnlySelectTwoNfts', 'You can only select 2 NFTs for breeding'),
        variant: "destructive"
      })
    }
  }

  const handleBreeding = async () => {
    if (selectedNFTs.length !== 2) {
      toast({
        title: tr('sections.breed.invalidSelection', 'Invalid selection'),
        description: tr('sections.breed.mustSelectExactlyTwoNfts', 'You must select exactly 2 NFTs for breeding'),
        variant: "destructive"
      })
      return
    }

    if (!connected) {
      toast({
        title: tr('sections.breed.walletNotConnected', 'Wallet not connected'),
        description: tr('sections.breed.pleaseConnectWalletFirst', 'Please connect your wallet first'),
        variant: "destructive"
      })
      return
    }

    // Check graveyard readiness
    if (!graveyardIsReady) {
      let description = tr('sections.breed.graveyardCooldownDesc', 'Wait until at least one burned cube finishes cooldown.')
      
      if (timeUntilReady && timeUntilReady > 0) {
        const minutes = Math.floor(timeUntilReady / 60)
        const seconds = timeUntilReady % 60
        description = `${tr('sections.breed.timeUntilReady', 'Time until ready:')} ${minutes}m ${seconds}s`
      }
      
      toast({
        title: tr('sections.breed.graveyardCooldown', 'Graveyard cooldown active'),
        description,
        variant: "destructive"
      })
      return
    }

    // Check that both NFTs have stars
    for (const tokenId of selectedNFTs) {
      const nftData = selectedNFTsData[tokenId]
      if (!nftData || nftData.currentStars === 0) {
        toast({
          title: tr('sections.breed.inactiveNftSelected', 'Inactive NFT selected'),
          description: tr('sections.breed.nftNoStarsLeft', 'NFT #{id} has no stars left and cannot be used for breeding.').replace('{id}', tokenId.toString()),
          variant: "destructive"
        })
        return
      }
    }

    // Pre-checks
    const costWei = parseEther(breedCost || '0')
    if (craBalance && BigInt(parseEther(craBalance)) < costWei) {
      toast({ 
        title: tr('sections.breed.insufficientCra', 'Insufficient CRA'), 
        description: tr('sections.breed.needCraToBreed', 'Need {amount} CRA to breed').replace('{amount}', breedCost), 
        variant: 'destructive' 
      })
      return
    }

    try {
      // Check allowance
      if (!publicClient) throw new Error('No RPC client')

      const allowance: bigint = await publicClient.readContract({
        address: CRA_TOKEN_ADDRESS as `0x${string}`,
        abi: CRA_TOKEN_ABI,
        functionName: 'allowance',
        args: [account as `0x${string}`, GAME_CONTRACT_ADDRESS]
      }) as bigint

      if (allowance < costWei) {
        toast({ 
          title: tr('sections.breed.approveCra', 'Approve CRA'), 
          description: tr('sections.breed.approveCraDesc', 'First transaction: give contract permission to spend CRA') 
        })
        await approveCRA(breedCost)
        toast({ 
          title: tr('sections.breed.approvalConfirmed', 'Approval confirmed'), 
          description: tr('sections.breed.craAllowanceSet', 'CRA allowance set') 
        })
      }

      setIsBreeding(true)
      setShowBreedingEffect(true)

      toast({ 
        title: tr('sections.breed.confirmBreeding', 'Confirm breeding'), 
        description: tr('sections.breed.signBreedingTransaction', 'Sign breeding transaction') 
      })
      await breedNFTs(String(selectedNFTs[0]), String(selectedNFTs[1]))

      // Final refresh once Tx fully confirmed
      refetch()
    } catch (e:any) {
      toast({ 
        title: tr('sections.breed.breedingCanceled', 'Breeding canceled'), 
        description: e?.message || tr('sections.breed.transactionRejected', 'Transaction rejected'), 
        variant: 'destructive' 
      })
      setIsBreeding(false)
      setShowBreedingEffect(false)
    }
  }

  // Watch tx status (after toast is defined)
  useEffect(() => {
    if (isTxSuccess) {
      toast({
        title: tr('sections.breed.breedingSuccessful', 'Breeding Successful! 💕'),
        description: tr('sections.breed.txConfirmed', 'Tx confirmed: {hash}...').replace('{hash}', txHash?.slice(0,10) || ''),
      })
      setSelectedNFTs([])
      setIsBreeding(false)
      setShowBreedingEffect(false)
      // Final refresh once Tx fully confirmed
      refetch()
    }
    if (isTxError) {
      toast({ 
        title: tr('sections.breed.transactionError', 'Transaction error'), 
        description: txError?.message, 
        variant: 'destructive' 
      })
      setIsBreeding(false)
      setShowBreedingEffect(false)
    }
  }, [isTxSuccess, isTxError])

  // calculate whether breeding cube observer should be shown
  const selectionCount = selectedNFTs.length
  const phase: "idle"|"breeding"|"success" = isBreeding ? "breeding" : (isTxSuccess?"success":"idle")

  useEffect(() => {
    if (liveRevived.length > 0) {
      // immediately refetch list to show resurrected cube
      refetch()
    }
  }, [liveRevived])

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-900 via-purple-900 to-pink-900 p-4">
      {/* Background hearts rain */}
      <HeartRain density={30} color="#fb7185" className="mix-blend-screen" />

      {/* Background particles in pink/purple tones */}
      <ParticleEffect
        count={isMobile ? 10 : 30}
        colors={["#ec4899", "#f472b6", "#c084fc", "#a855f7"]}
        speed={isMobile ? 0.4 : 0.5}
        size={isMobile ? 5 : 7}
      />

      <div className="container mx-auto relative z-10">
        <header className="mb-1 flex items-center justify-between">
          <Link href="/">
            <Button variant="outline" className="border-pink-500/30 bg-black/20 text-pink-300 hover:bg-black/40">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {tr('sections.breed.returnToHome', 'Return to Home')}
            </Button>
          </Link>
          {/* TabNavigation hidden on mobile */}
          {!isMobile && <TabNavigation color="pink" />}
          <WalletConnect />
        </header>

        <main>
          {/* Guide accordion */}
          <div className="flex justify-center mb-2">
            <Accordion type="single" collapsible className="w-full max-w-lg">
              <AccordionItem value="guide" className="border-none">
                <AccordionTrigger className="w-full bg-black/30 backdrop-blur-sm border border-pink-500/40 rounded-full px-4 py-2 text-center text-pink-200 text-sm md:text-base font-semibold hover:bg-black/50 focus:outline-none focus:ring-0 after:hidden">
                  {tr('sections.breed.guide.title','🪄 Breed Guide')}
                </AccordionTrigger>
                <AccordionContent className="text-sm space-y-2 text-pink-200 mt-2 bg-black/90 p-4 rounded-lg border border-pink-500/20">
                  {mounted ? (
                    <>
                      <p><Trans i18nKey="sections.breed.guide.intro" /></p>
                      <p><Trans i18nKey="sections.breed.guide.fee" /></p>
                      <p><Trans i18nKey="sections.breed.guide.requirement" /></p>
                      <p><Trans i18nKey="sections.breed.guide.rarity" /></p>
                      <p><Trans i18nKey="sections.breed.guide.penalty" /></p>
                      <ol className="list-decimal list-inside pl-4 space-y-0.5">
                        <li>{t('sections.breed.guide.step1')}</li>
                        <li>{t('sections.breed.guide.step2')}</li>
                      </ol>
                      <p className="text-xs text-pink-300"><Trans i18nKey="sections.breed.guide.note" /></p>
                    </>
                  ) : (
                    <>
                      <p>Breed a cube by paying 20 % of current price.</p>
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Wallet connection check */}
          {!connected ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-500/20 rounded-full mb-4">
                <Heart className="h-8 w-8 text-pink-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{tr('sections.breed.connectWallet', 'Connect Your Wallet')}</h3>
              <p className="text-gray-300 mb-4">{tr('sections.breed.connectWalletDesc', 'Please connect your wallet to view and breed your NFTs')}</p>
              {connectors.length > 0 && connectors[0] && (
                <Button 
                  onClick={() => {
                    const connector = connectors[0]
                    if (connector) {
                      connect({ connector })
                    }
                  }} 
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {tr('sections.breed.connectWalletButton', 'Connect Wallet')}
                </Button>
              )}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
                <Heart className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{tr('sections.breed.errorLoadingNfts', 'Error Loading NFTs')}</h3>
              <p className="text-gray-300 mb-4">{error.message}</p>
              <Button onClick={() => window.location.reload()} className="bg-gradient-to-r from-red-600 to-red-700">
                {tr('common.retry', 'Retry')}
              </Button>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-500/20 rounded-full mb-4 animate-spin">
                <Heart className="h-8 w-8 text-pink-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{tr('sections.breed.loadingNfts', 'Loading NFTs...')}</h3>
              <p className="text-gray-300">{tr('sections.breed.loadingNftsDesc', 'Fetching your CrazyCube collection')}</p>
            </div>
          ) : userNFTs.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-500/20 rounded-full mb-4">
                <Heart className="h-8 w-8 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{tr('sections.breed.noNftsFound', 'No NFTs Found')}</h3>
              <p className="text-gray-300">{tr('sections.breed.noNftsFoundDesc', 'You don\'t have any CrazyCube NFTs to breed')}</p>
              <Link href="/" className="mt-4 inline-block">
                <Button className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500">
                  {tr('sections.breed.goToCollection', 'Go to Collection')}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Breeding Selection Area */}
              <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-2 whitespace-nowrap">
                  {tr('sections.breed.selectNftsForBreeding', 'Select 2 NFTs for Breeding')} ({selectedNFTs.length}/2)
                </h3>
                
                {/* Graveyard status info */}
                <div className="mb-4">
                  {graveyardLoading ? (
                    <p className="text-sm text-pink-200">
                      ⏳ {tr('sections.breed.loadingGraveyardStatus', 'Loading graveyard status...')}
                    </p>
                  ) : graveyardTotalTokens === 0 ? (
                    <p className="text-sm text-amber-300">
                      ⚰️ {tr('sections.breed.graveyardEmpty', 'No burned cubes in graveyard')}
                    </p>
                  ) : graveyardIsReady ? (
                    <p className="text-sm text-green-300">
                      ✅ {tr('sections.breed.graveyardReady', 'Graveyard is ready for breeding')}
                    </p>
                  ) : (
                    <div className="text-sm text-red-300">
                      <p>⚠️ {tr('sections.breed.graveyardCooldown', 'Graveyard cooldown active')}</p>
                      {timeUntilReady && timeUntilReady > 0 && (
                        <p className="text-xs">
                          {tr('sections.breed.timeUntilReady', 'Time until ready:')} {Math.floor(timeUntilReady / 60)}m {timeUntilReady % 60}s
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Selected NFTs Display */}
                <div className="flex justify-center gap-3 mb-2">
                  {[0, 1].map((index) => (
                    <div
                      key={index}
                      className="w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 border-2 border-dashed border-pink-500/50 rounded-lg flex items-center justify-center bg-pink-500/10"
                    >
                      {selectedNFTs[index] ? (
                        <div className="relative group">
                          {(() => {
                            const nft = userNFTs.find(n => n.tokenId === selectedNFTs[index])
                            return nft ? (
                              <>
                                <div className="relative w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28">
                                  <Image
                                    src={resolveImageSrc(nft.image)}
                                    alt={`Selected ${nft.name}`}
                                    fill
                                    sizes="(max-width: 768px) 80px, 96px"
                                    className="object-contain rounded-md"
                                    priority
                                  />
                                </div>
                                <button
                                  onClick={() => handleSelectNFT(nft.tokenId)}
                                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-4 h-4 text-white" />
                                </button>
                              </>
                            ) : null
                          })()}
                        </div>
                      ) : (
                        <div className="text-center">
                          <Plus className="w-8 h-8 text-pink-500/50 mx-auto mb-2" />
                          <p className="text-xs text-pink-300/50">{tr('sections.breed.selectNft', 'Select NFT')}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Breeding Button */}
                {selectedNFTs.length === 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                  >
                    <Button
                      onClick={handleBreeding}
                      disabled={isBreeding || isTxLoading || !canBreedSelectedNFTs()}
                      className="w-full max-w-xs mx-auto bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBreeding ? (
                        <>
                          <Clock className="mr-2 h-5 w-5 animate-spin" />
                          {tr('sections.breed.breeding', 'Breeding...')}
                        </>
                      ) : (
                        <>
                          <Heart className="mr-2 h-5 w-5" />
                          {tr('sections.breed.breedNfts', 'Breed NFTs')} ({breedCost} CRA)
                        </>
                      )}
                    </Button>
                    
                    {/* Warning message when breeding is blocked */}
                    {!canBreedSelectedNFTs() && !isBreeding && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-3 text-center"
                      >
                        {!graveyardIsReady ? (
                          <div className="text-red-400 text-sm">
                            <p>⚠️ {tr('sections.breed.graveyardCooldown', 'Graveyard cooldown active')}</p>
                            <p className="text-xs">{tr('sections.breed.graveyardCooldownDesc', 'Wait until at least one burned cube finishes cooldown')}</p>
                            {timeUntilReady && timeUntilReady > 0 && (
                              <p className="text-xs">
                                {tr('sections.breed.timeUntilReady', 'Time until ready:')} {Math.floor(timeUntilReady / 60)}m {timeUntilReady % 60}s
                              </p>
                            )}
                          </div>
                        ) : selectedNFTs.some(tokenId => {
                          const nftData = selectedNFTsData[tokenId]
                          return !nftData || nftData.currentStars === 0
                        }) ? (
                          <p className="text-red-400 text-sm">
                            ⚠️ {tr('sections.breed.selectedNftsNoStars', 'Selected NFTs have no stars left! Choose active NFTs with stars.')}
                          </p>
                        ) : (
                          <p className="text-red-400 text-sm">
                            ⚠️ {tr('sections.breed.cannotBreedSelectedNfts', 'Cannot breed selected NFTs. Check requirements.')}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* NFT Grid Improved */}
              <div className="nft-card-grid">
                {userNFTs.map((nft, index) => {
                  const isSelected = selectedNFTs.includes(nft.tokenId)
                  const selectedOrder = selectedNFTs[0] === nft.tokenId ? 1 : selectedNFTs[1] === nft.tokenId ? 2 : undefined
                  
                  return (
                    <BreedCard
                      key={nft.tokenId || index}
                      nft={nft}
                      index={index}
                      selected={isSelected}
                      {...(selectedOrder && { selectedOrder })}
                      onSelect={handleSelectNFT}
                      onActionComplete={refetch}
                    />
                  )
                })}
              </div>

              {/* Cube observers commenting on breeding when 1 NFT selected */}
              <CubeObservers selectionCount={selectionCount} phase={phase} />
            </div>
          )}
        </main>
      </div>      {/* Breeding Effect */}
      {showBreedingEffect && (
        <BreedingEffect
          isActive={showBreedingEffect}
          onComplete={() => setShowBreedingEffect(false)}
        />
      )}
    </div>
  )
}

// NFTCard component with live contract data
function NFTCard({ nft, index, selected, onSelect, disableSelect }: {
  nft: ReturnType<typeof useAlchemyNfts>["nfts"][number]
  index: number
  selected: boolean
  onSelect: (tokenId: number) => void
  disableSelect: boolean
}) {
  const { nftInfo, isLoading, getRarityByStars, getColorByStars } = useNFTContractInfo(String(nft.tokenId))
  
  // Get game data for cooldown information
  const { nftInfo: gameInfo } = useNFTGameInfo(String(nft.tokenId))

  const burnedStars = nftInfo ? nftInfo.static.initialStars - nftInfo.dynamic.currentStars : 0
  const isDead = nftInfo ? nftInfo.dynamic.currentStars === 0 : false
  
  // Check if NFT has active cooldowns (is newborn or on cooldown)
  const hasActiveCooldown = gameInfo ? gameInfo.breedCooldown > 0 : false
  
  const finalDisabled = disableSelect || isDead || hasActiveCooldown

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group"
    >
      <Card className={`bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-2 transition-all duration-300 hover:scale-105 ${
        selected ? 'border-pink-500 shadow-lg shadow-pink-500/25' : 'border-slate-700 hover:border-pink-500/50'
      } ${isDead || hasActiveCooldown ? 'grayscale opacity-50' : ''}`}>
        <CardHeader className="pb-2">
          <div className="relative">
                          <div className="aspect-square bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
              <Image
                src={resolveImageSrc(nft.image)}
                alt={nft.name}
                                  width={160}
                  height={160}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Rarity Badge */}
            {nftInfo && (
              <Badge className={`absolute top-1.5 right-1.5 ${getRarityColor(nftInfo.static.initialStars)} text-white text-xs px-1.5 py-0.5`}>
                {getRarityByStars(nftInfo.static.initialStars)}
              </Badge>
            )}
            {selected && (
              <div className="absolute inset-0 bg-gradient-to-t from-pink-500/30 via-transparent to-transparent rounded-lg pointer-events-none">
                                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-center">
                    <Heart className="h-5 w-5 text-pink-400 animate-pulse" />
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CardTitle className="text-base text-white mb-1.5 text-center truncate">
            {nft.name}
          </CardTitle>
          <div className="space-y-1 mb-3 text-xs">
            {/* Token ID row removed: name already contains #ID, so avoid duplication/confusion */}
            {nftInfo && (
              <>
                {/* Stars visual */}
                <div className="flex items-center gap-0.5 mb-1">
                  {Array.from({length: nftInfo.static.initialStars}).map((_,i)=>(
                    <Star key={i} className={`w-3 h-3 ${i < nftInfo.dynamic.currentStars ? 'text-yellow-400' : 'text-gray-600'}`} />
                  ))}
                </div>
                <div className="flex justify-between text-xs"><span className="text-gray-400">Stars:</span><span className="text-yellow-300 font-semibold">{nftInfo.dynamic.currentStars} / {nftInfo.static.initialStars}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-400">Burned:</span><span className="text-red-400 font-semibold">{burnedStars}</span></div>
              </>
            )}
          </div>
          <Button
            variant={selected ? 'default' : 'outline'}
            className={`w-full ${selected ? 'bg-gradient-to-r from-pink-600 to-purple-600' : 'border-pink-500/50 text-pink-300 hover:bg-pink-500/20'}`}
            onClick={() => onSelect(nft.tokenId)}
            disabled={finalDisabled}
          >
            {selected ? (
              <><Heart className="mr-1.5 h-3 w-3"/>Selected</>
            ) : (
              <><Plus className="mr-1.5 h-3 w-3"/>Select</>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
