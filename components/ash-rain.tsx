"use client"

import { useMemo } from "react"

interface AshRainProps {
  /** Amount of ash particles per 100 vw (≈ screen width). Default = 18 */
  density?: number
  /** Base gray color (CSS). Default = #9ca3af */
  color?: string
  /** Extra classes on root wrapper */
  className?: string
}

/**
 * Very lightweight ash-fall background, built with pure CSS (no canvas).
 * Similar to <HeartRain/> but spawns little gray rectangles / specks that
 * drift downward with slight rotation. No layout shift and virtually no CPU.
 */
export default function AshRain({ density = 18, color = "#9ca3af", className = "" }: AshRainProps) {
  const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  
  const ashes = useMemo(() => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1440
    const count = Math.max(18, Math.round((vw / 1440) * density))
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100, // vw %
      size: 2 + Math.random() * 6, // 2..8 px
      delay: Math.random() * 6, // s
      duration: 6 + Math.random() * 6, // 6..12 s
      opacity: 0.25 + Math.random() * 0.4,
      tilt: (Math.random() - 0.5) * 45, // initial rotation deg
      sway: Math.random() > 0.5 ? 1 : -1, // horizontal sway dir
    }))
  }, [density])

  if (prefersReduced) return null

  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}>      
      {ashes.map((a, i) => (
        <span
          key={i}
          className="absolute animate-ash-fall"
          style={{
            left: `${a.left}%`,
            width: a.size,
            height: a.size * 3, // make it look like elongated speck
            backgroundColor: color,
            opacity: a.opacity,
            borderRadius: a.size / 2,
            transform: `rotate(${a.tilt}deg)`,
            animationDelay: `${a.delay}s`,
            animationDuration: `${a.duration}s`,
          }}
        />
      ))}

      {/* local keyframes */}
      <style jsx>{`
        @keyframes ash-fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
          }
        }
        .animate-ash-fall {
          top: -5vh;
          animation-name: ash-fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  )
} 