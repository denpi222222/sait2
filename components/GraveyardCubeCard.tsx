import { useEffect, useState, memo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ShatterImage } from "./shatter-image"
import { motion } from "framer-motion"
import { useCrazyCubeGame, type NFTGameData, type BurnRecord } from "@/hooks/useCrazyCubeGame"
import { getLabel } from "@/lib/rarity"
import { Timer, Clock } from "lucide-react"
import { useTranslation } from "react-i18next"

interface GraveyardCubeCardProps {
  tokenId: string
  index: number
}

// Memoize component to prevent unnecessary re-renders
export const GraveyardCubeCard = memo(function GraveyardCubeCard({ tokenId, index }: GraveyardCubeCardProps) {
  const { getNFTGameData, getBurnRecord } = useCrazyCubeGame()
  const [gameData, setGameData] = useState<NFTGameData | null>(null)
  const [record, setRecord] = useState<BurnRecord | null>(null)
  const [now, setNow] = useState<number>(Math.floor(Date.now()/1000))
  const { t } = useTranslation()

  useEffect(() => {
    let ignore = false
    const fetch = async () => {
      const data = await getNFTGameData(tokenId)
      const rec = await getBurnRecord(tokenId)
      if (!ignore) { setGameData(data); setRecord(rec) }
    }
    fetch()
    return () => { ignore = true }
  }, [tokenId, getNFTGameData, getBurnRecord])

  useEffect(()=>{
    const id = setInterval(()=>setNow(Math.floor(Date.now()/1000)), 60_000)
    return ()=>clearInterval(id)
  },[])

  const getRarityLabelLocal = (r?: number) => getLabel(r || 1)

  // Pick one of the local placeholder images (z1–z9) based on the card index
  const imgIdx = (index % 9) + 1 // 1…9
  const imageSrc = `/images/z${imgIdx}.png`

  // Vary brightness slightly so repeated placeholders look different
  const variation = (Math.floor(index / 9) % 6) * 0.07 // 0, .07, .14 …
  const brightness = 1 + variation // between 1-1.42

  // Calculate breeding readiness
  const isReadyForBreeding = record && record.graveyardReleaseTime ? now >= record.graveyardReleaseTime : false
  const breedingTimeLeft = record && record.graveyardReleaseTime ? Math.max(0, record.graveyardReleaseTime - now) : 0

  // Calculate claim readiness  
  const isReadyForClaim = record && !record.claimed && record.claimAvailableTime ? now >= record.claimAvailableTime : false
  const claimTimeLeft = record && record.claimAvailableTime ? Math.max(0, record.claimAvailableTime - now) : 0

  // Format time display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes}m ${secs}s`
    return `${secs}s`
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: Math.min(index * 0.05, 1) }} // Cap maximum delay
      whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
      className="scale-[0.75]"
    >
      <Card className={`bg-gradient-to-br from-gray-800/80 to-slate-800/80 border ${
        isReadyForBreeding ? 'border-green-400/40 hover:border-green-400/60' : 'border-gray-600/30 hover:border-red-400/40'
      } w-60 mx-auto`}>
        <CardHeader className="pb-2">
          <div className="aspect-square relative overflow-hidden rounded-lg burned-img pt-1.5">
            <div style={{ filter: `brightness(${brightness})` }} className="w-full h-full">
              <ShatterImage
                src={imageSrc}
                alt={`Cube #${tokenId}`}
                className="w-full h-full"
                priority={index < 4}
              />
            </div>
            
            {/* Breeding Ready Badge */}
            {isReadyForBreeding && (
              <div className="absolute top-1.5 right-1.5 bg-green-500/90 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center">
                <Timer className="w-2 h-2 mr-0.5" />
                Ready!
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="text-center space-y-1 pt-0">
          <motion.p 
            className="text-gray-300 text-sm"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Token #{tokenId}
          </motion.p>
          {gameData && (
            <p className="text-xs text-amber-400">{getRarityLabelLocal(gameData.rarity)}</p>
          )}
          
          {/* Breeding Cooldown */}
          <div className="space-y-0.5">
            {isReadyForBreeding ? (
              <div className="text-green-400 text-xs flex items-center justify-center">
                <Timer className="w-2 h-2 mr-0.5" />
                {t('status.readyForBreeding', 'Ready for breeding!')}
              </div>
            ) : breedingTimeLeft > 0 && (
              <div className="text-blue-400 text-xs flex items-center justify-center">
                <Clock className="w-2 h-2 mr-0.5" />
                Breed in: {formatTime(breedingTimeLeft)}
              </div>
            )}
            
            {/* Claim Status */}
            {record && !record.claimed && (
              <>
                {isReadyForClaim ? (
                  <div className="text-amber-400 text-xs flex items-center justify-center mt-0.5">
                    💰 {t('status.claimReady', 'Claim Ready!')}
                  </div>
                ) : claimTimeLeft > 0 && (
                  <div className="text-orange-400 text-xs">
                    💰 Claim in: {formatTime(claimTimeLeft)}
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}) 