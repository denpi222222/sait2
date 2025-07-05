"use client"

import { useMemo } from "react"

interface AshRainProps {
  /** Particles per 100vw. Default = 20 */
  density?: number
  /** Shades of grey for ash. */
  colors?: string[]
  className?: string
}

/**
 * CSS-only falling ash (small rotated rectangles) – lighter than canvas and identical to HeartRain mechanics.
 */
export default function AshRain({
  density = 20,
  colors = ["#9ca3af", "#6b7280", "#4b5563", "#374151"],
  className = "",
}: AshRainProps) {
  const pieces = useMemo(() => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1440
    const count = Math.max(10, Math.round((vw / 1440) * density))
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100, // vw %
      size: 3 + Math.random() * 5, // 3..8 px
      delay: Math.random() * 8, // s
      duration: 6 + Math.random() * 8, // s
      opacity: 0.3 + Math.random() * 0.4,
      rotate: Math.random() * 360,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))
  }, [colors, density])

  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute animate-ash-fall"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: p.opacity,
            transform: `rotate(${p.rotate}deg)` ,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      <style jsx>{`
        @keyframes ash-fall {
          0% {
            transform: translate(-10px, -10vh) rotate(0deg);
          }
          100% {
            transform: translate(10px, 110vh) rotate(360deg);
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