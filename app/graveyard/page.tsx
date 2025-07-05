"use client"

import { ArrowLeft, Skull } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { useGraveyardTokens } from "@/hooks/useGraveyardTokens"
import { useCrazyCubeGame } from "@/hooks/useCrazyCubeGame"
import { GraveyardCubeCard } from "@/components/GraveyardCubeCard"
import { motion, AnimatePresence } from "framer-motion"
import { TabNavigation } from "@/components/tab-navigation"
import { GlueCube } from "@/components/GlueCube"

// Dynamic import for heavy animation component
const AshEffect = dynamic(() => import("@/components/ash-effect").then(mod => ({ default: mod.AshEffect })), {
  ssr: false,
  loading: () => null
})

export default function GraveyardPage() {
  const { tokens: tokenIds, loading: isLoadingNFTs } = useGraveyardTokens()
  const { graveyardSize } = useCrazyCubeGame()
  const [mounted, setMounted] = useState(false)
  const [showTitle, setShowTitle] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Animate title with delay
    const timer = setTimeout(() => {
      setShowTitle(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  if (!mounted) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center text-white">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Skull className="w-12 h-12 text-red-400 animate-pulse" />
      </motion.div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 p-4">
      {/* Realistic ash background using canvas */}
      <AshEffect count={350} size={1.8} className="z-20" colors={["#7a7a7a","#9a9a9a","#b0b0b0"]} />
      
      <div className="container mx-auto relative z-10">
        <header className="mb-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="outline" className="border-gray-500/30 bg-black/20 text-gray-300 hover:bg-black/40 hover:border-red-500/30">
              <ArrowLeft className="mr-2 w-4 h-4" /> Home
            </Button>
          </Link>
          
          <TabNavigation color="gray" />
          
          <div className="flex items-center">
            <AnimatePresence>
              {showTitle && (
                <motion.h1 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-gray-300 flex items-center"
                >
                  <motion.span 
                    animate={{ y: [0, -4, 0], rotateZ: [0, -5, 0] }} 
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Skull className="w-6 h-6 mr-2 text-red-500" />
                  </motion.span>
                  {graveyardSize > 0 && (
                    <span className="text-base font-medium text-gray-400/70">({graveyardSize})</span>
                  )}
                </motion.h1>
              )}
            </AnimatePresence>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {isLoadingNFTs ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mx-auto mb-4 w-12 h-12 border-2 border-t-transparent border-red-400 rounded-full"
              />
              <p className="text-gray-300">Loading your NFTs from the graveyard...</p>
            </motion.div>
          ) : tokenIds.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  opacity: [1, 0.7, 1]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Skull className="w-16 h-16 text-gray-500 mx-auto mb-6" />
              </motion.div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-gray-300 to-red-500">
                КЛАДБИЩЕ ПУСТО
              </h2>
              <p className="text-gray-400 mt-2">Ни одного сожжённого куба не найдено.</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="nft-card-grid">
                {tokenIds.slice(0, 20).map((id, idx) => (
                  <GraveyardCubeCard key={id} tokenId={id} index={idx} />
                ))}
              </div>
              
              {tokenIds.length > 20 && (
                <motion.div 
                  className="mt-8 text-center text-gray-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  Showing 20 of {tokenIds.length} burned NFTs
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Global repair cube walking across screen */}
      <GlueCube delay={8.8} className="fixed bottom-2 left-0 z-50" />
    </div>
  )
} 