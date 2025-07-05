"use client"

import { useState, useEffect } from 'react'
import { formatEther, parseEther } from 'viem'
import { BurnedNftInfo, useClaimReward } from '@/hooks/useBurnedNfts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Countdown } from '@/components/Countdown'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface BurnedNftCardProps {
    nft: BurnedNftInfo
}

export const BurnedNftCard = ({ nft }: BurnedNftCardProps) => {
    const { tokenId, record, split, playerShare } = nft
    const [isClaimReady, setIsClaimReady] = useState(() => {
        return nft.isReadyToClaim
    })
    const { claim, isClaiming, isSuccess } = useClaimReward(tokenId)
    const { t } = useTranslation()

    const [hide, setHide] = useState(false)

    // Hide card when claimed
    useEffect(()=>{
        if(isSuccess || record.claimed){
            // wait small fade out
            setTimeout(()=> setHide(true), 600)
        }
    }, [isSuccess, record.claimed])

    if(hide) return null

    // Helper formatter for human-readable CRA
    const fmt = (wei: bigint | string) => {
        const num = typeof wei === 'string' ? parseEther(wei) : wei
        const cra = Number(formatEther(num))
        
        // Use compact notation for large numbers
        if (cra >= 1000000) {
            return (cra / 1000000).toFixed(2) + 'M'
        } else if (cra >= 1000) {
            return (cra / 1000).toFixed(2) + 'K'
        } else if (cra >= 1) {
            return cra.toFixed(2)
        } else {
            return cra.toFixed(4)
        }
    }

    const totalAmount = record.totalAmount
    const poolShare = split ? (totalAmount * BigInt(split.poolBps)) / 10000n : 0n
    const burnShare = split ? (totalAmount * BigInt(split.burnBps)) / 10000n : 0n

    const handleClaim = async () => {
        if (!isClaimReady || isClaiming || isSuccess) return
        await claim()
    }

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    }

    return (
        <motion.div variants={cardVariants} initial="hidden" animate="visible" className="w-72 mx-auto scale-[0.75]">
            <Card className="group bg-gradient-to-br from-amber-900/80 to-yellow-900/70 border border-amber-600/40 hover:border-amber-400/60 rounded-xl overflow-hidden shadow-md hover:shadow-amber-500/30 transition-transform hover:-translate-y-2 duration-300 flex flex-col h-full p-4">
                <div className="flex flex-col justify-between h-full">
                    <CardHeader className="p-0 mb-4">
                        <div className="aspect-square w-full overflow-hidden rounded-md bg-slate-800">
                            <img
                                src={`https://d35a2j13p9i4c9.cloudfront.net/ipfs/QmdRAv2R2MNWEfT3kpostz13qVrDdD2j62jW2i2sra2aA1/${tokenId}.png`}
                                alt={`Cube #${tokenId}`}
                                className="w-full h-full object-cover bg-slate-800"
                                onError={(e)=>{
                                    const img=e.currentTarget as HTMLImageElement
                                    // 1) Попытка fallback на публичный IPFS шлюз (cloudflare)
                                    if(!img.dataset.ipfs){
                                        img.dataset.ipfs = '1'
                                        img.src = `https://cloudflare-ipfs.com/ipfs/QmdRAv2R2MNWEfT3kpostz13qVrDdD2j62jW2i2sra2aA1/${tokenId}.png`
                                        return
                                    }

                                    // 2) Локальный «зол» аватар
                                    if(!img.dataset.alt1){
                                    const idx=Number(tokenId)%7||7
                                        img.dataset.alt1='1'
                                        img.src=`/images/zol${idx}.png`
                                        return
                                    }

                                    // 3) Финальный плейсхолдер
                                    img.src='/placeholder-logo.png'
                                }}
                            />
                        </div>
                        <CardTitle className="mt-4 text-center text-xl font-bold text-white">{t('cube', 'Cube')} #{tokenId}</CardTitle>
                    </CardHeader>
                    
                    <CardContent className="p-0 space-y-2 text-sm text-slate-300 border-t border-slate-700 pt-4">
                        <div className="flex justify-between"><span>{t('rewards.accumulated', 'Accumulated:')}</span> <span className="font-medium text-white">{fmt(totalAmount)} CRA</span></div>
                        <div className="flex justify-between text-slate-400"><span>{t('rewards.toPool', 'To pool')} ({Number(split?.poolBps || 0) / 100}%):</span> <span className="text-rose-300">-{fmt(poolShare)} CRA</span></div>
                        <div className="flex justify-between text-slate-400"><span>{t('rewards.burned', 'Burned')} ({Number(split?.burnBps || 0) / 100}%):</span> <span className="text-rose-300">-{fmt(burnShare)} CRA</span></div>

                        {/* total payout highlight */}
                        <div className="bg-slate-800/60 rounded-md py-2 px-3 mt-3 text-center shadow-inner border border-slate-700/40">
                            <div className="text-[11px] uppercase tracking-wider text-slate-300">{t('rewards.toClaim', 'To claim')}</div>
                            <div className="text-2xl font-extrabold text-emerald-300 drop-shadow-md">{fmt(playerShare)} <span className="text-sm">CRA</span></div>
                        </div>
                    </CardContent>

                    <CardFooter className="p-0 mt-6">
                        {record.claimed || isSuccess ? (
                            <div className="w-full text-center font-bold text-lg py-3 rounded-lg bg-green-500/20 text-green-300">{t('rewards.claimed', 'REWARD CLAIMED')} ✅</div>
                        ) : (
                            <div className="w-full">
                                <div className="text-amber-200 mb-2">{t('rewards.availableIn', 'Available in:')}</div>
                                <Countdown targetTimestamp={record.claimAvailableTime} onComplete={() => setIsClaimReady(true)} />
                                <Button disabled={!isClaimReady || isClaiming} onClick={handleClaim} className="mt-2 w-full rounded-lg bg-amber-500 px-4 py-3 text-base font-bold text-black transition-all hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isClaiming ? t('rewards.processing', 'PROCESSING...') : t('rewards.claim', 'CLAIM REWARD')}
                                </Button>
                            </div>
                        )}
                    </CardFooter>
                </div>
            </Card>
        </motion.div>
    )
}

export default BurnedNftCard; 