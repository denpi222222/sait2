"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { motion } from "framer-motion"

interface CoinsAnimationProps {
  /** Base intensity multiplier. 1 = default. Increase for more coins. */
  intensity?: number
  /** Optional extra Tailwind classes for the container. */
  className?: string
  /** How long (in seconds) the initial rain-burst should last. Set to 0 to disable. */
  rainDuration?: number
  /** Color theme: gold (default) or blue */
  theme?: "gold" | "blue"
}

export function CoinsAnimation({ intensity = 1, className = "", rainDuration = 3, theme = "gold" }: CoinsAnimationProps) {
  const [isClient, setIsClient] = useState(false)
  const [coins, setCoins] = useState<
    Array<{ id: number; x: number; y: number; size: number; delay: number; duration: number; rotation: number }>
  >([])
  const [showRain, setShowRain] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // Theme-based class helpers (all class names enumerated for Tailwind JIT)
  const glowClass = theme === "gold" ? "bg-yellow-500/20" : "bg-cyan-500/20"
  const outerGradClass =
    theme === "gold"
      ? "bg-gradient-radial from-yellow-300 via-yellow-400 to-yellow-600"
      : "bg-gradient-radial from-blue-300 via-cyan-400 to-blue-600"
  const innerGradClass =
    theme === "gold"
      ? "bg-gradient-radial from-yellow-200 via-yellow-300 to-yellow-500"
      : "bg-gradient-radial from-blue-200 via-cyan-300 to-blue-500"
  const borderClass = theme === "gold" ? "border-yellow-600/50" : "border-cyan-600/50"
  const pileLayer1 =
    theme === "gold"
      ? "bg-gradient-to-t from-yellow-700 via-yellow-600 to-yellow-500"
      : "bg-gradient-to-t from-blue-800 via-cyan-700 to-blue-600"
  const pileLayer2 =
    theme === "gold"
      ? "bg-gradient-to-t from-yellow-600 via-yellow-500 to-yellow-400"
      : "bg-gradient-to-t from-blue-700 via-cyan-600 to-blue-500"
  const pileLayer3 =
    theme === "gold"
      ? "bg-gradient-to-t from-yellow-500 via-yellow-400 to-yellow-300"
      : "bg-gradient-to-t from-blue-600 via-cyan-500 to-blue-400"

  useEffect(() => {
    setIsClient(true)
    // Hide the rain effect after the configured duration to save resources
    if (rainDuration > 0) {
      const timer = setTimeout(() => setShowRain(false), rainDuration * 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Optimize coin generation with useCallback
  const generateCoins = useCallback((intensity: number, isMobile: boolean) => {
    // Reduce coin count for better performance
    // More coins on desktop, fewer on mobile for performance
    const coinCount = Math.floor((isMobile ? 25 : 50) * intensity)
    return Array.from({ length: coinCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100, // X position (percentage)
      y: Math.random() * 100, // Initial Y position
      size: Math.random() * 20 + (isMobile ? 15 : 24), // Slightly larger coins on desktop
      delay: Math.random() * 2, // Shorter random delay so most coins fall within rainDuration
      duration: 2.5 + Math.random() * 1.5, // Duration 2.5-4 s so they finish within rainDuration window
      rotation: Math.random() * 360, // Initial rotation angle
    }))
  }, [])

  useEffect(() => {
    if (!isClient) return

    const isMobile = window.innerWidth < 768
    const newCoins = generateCoins(intensity, isMobile)
    setCoins(newCoins)

    // Add resize handler to adjust coin count on window resize
    const handleResize = () => {
      const isMobile = window.innerWidth < 768
      setCoins(generateCoins(intensity, isMobile))
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [isClient, intensity, generateCoins])

  if (!isClient) return null

  // Determine if we're on mobile for responsive adjustments
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ zIndex: 1 }}
    >
      {/* Background glow - simplified */}
      <div className={`absolute inset-0 ${glowClass} blur-3xl`}></div>

      {/* One-time falling rain effect */}
      {showRain &&
        coins.map((coin) => (
          <motion.div
            key={coin.id}
            className="absolute"
            style={{
              left: `${coin.x}%`,
              top: `-${coin.size}px`,
              width: coin.size,
              height: coin.size,
            }}
            initial={{
              y: -100,
              x: 0,
              opacity: 0,
              rotate: coin.rotation,
            }}
            animate={{
              y: [`${-coin.size}px`, `${typeof window !== "undefined" ? window.innerHeight + coin.size : 1000}px`],
              x: [0, (Math.random() - 0.5) * (isClient && window.innerWidth > 1024 ? 300 : 150)],
              opacity: [0, 0.9, 0],
              rotate: [coin.rotation, coin.rotation + 360 * (Math.random() > 0.5 ? 1 : -1)],
              scale: [1, 1.1, 0.9, 1],
            }}
            transition={{
              duration: coin.duration,
              delay: coin.delay,
              repeat: 0, // Play once for rain burst
              ease: "easeIn",
            }}
          >
            {/* Gold coin - simplified rendering */}
            <div className="w-full h-full relative">
              <div className={`absolute inset-0 rounded-full ${outerGradClass} shadow-lg`}></div>
              <div className={`absolute inset-[2px] rounded-full ${innerGradClass} border-2 ${borderClass}`}></div>
              <div className="absolute top-1/4 left-1/4 w-1/5 h-1/5 bg-white/70 rounded-full blur-[1px]"></div>
            </div>
          </motion.div>
        ))}

      {/* Upward flying coins - reduced quantity */}
      {Array.from({ length: Math.floor(10 * intensity) }).map((_, i) => (
        <motion.div
          key={`up-coin-${i}`}
          className="absolute"
          style={{
            left: `${10 + Math.random() * 80}%`,
            bottom: `-50px`,
            width: 20 + Math.random() * 15,
            height: 20 + Math.random() * 15,
          }}
          initial={{
            y: 0,
            opacity: 0,
            rotate: Math.random() * 360,
          }}
          animate={{
            y: [0, -200 - Math.random() * 100], // Height coins fly up
            x: [(Math.random() - 0.5) * 50, (Math.random() - 0.5) * 120], // Horizontal drift
            opacity: [0, 1, 0],
            rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 6,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: Math.random() * 4,
            ease: "easeOut",
          }}
        >
          {/* Gold coin - simplified */}
          <div className="w-full h-full relative">
            <div className={`absolute inset-0 rounded-full ${outerGradClass} shadow-lg`}></div>
            <div className={`absolute inset-[2px] rounded-full ${innerGradClass} border-2 ${borderClass}`}></div>
            <div className="absolute top-1/4 left-1/4 w-1/5 h-1/5 bg-white/70 rounded-full blur-[1px]"></div>
          </div>
        </motion.div>
      ))}

      {/* Gold pile at bottom - simplified */}
      {!isMobile && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-2xl">
          <div className="relative h-40">
            <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-20 ${pileLayer1} rounded-[50%] shadow-lg`}></div>
            <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 w-[90%] h-16 ${pileLayer2} rounded-[50%] shadow-lg`}></div>
            <div className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 w-[80%] h-12 ${pileLayer3} rounded-[50%] shadow-lg`}></div>
          </div>
        </div>
      )}
    </div>
  )
}