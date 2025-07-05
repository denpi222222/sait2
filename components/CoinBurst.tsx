"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

interface CoinBurstProps {
  children: React.ReactNode
  onBurstEnd?: () => void
  total?: number
  duration?: number
}

export default function CoinBurst({
  children,
  onBurstEnd,
  total = 24,
  duration = 0.65,
}: CoinBurstProps) {
  const [active, setActive] = useState(false)

  const fire = () => {
    if (active) return
    setActive(true)
    setTimeout(() => {
      setActive(false)
      onBurstEnd?.()
    }, duration * 1000)
  }

  return (
    <div className="relative inline-block" onClick={fire}>
      {children}

      <AnimatePresence>
        {active &&
          Array.from({ length: total }).map((_, i) => {
            const angle = (360 / total) * i + Math.random() * 15
            const dist = 110 + Math.random() * 40
            const x = dist * Math.cos((angle * Math.PI) / 180)
            const y = dist * Math.sin((angle * Math.PI) / 180)

            return (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2 w-6 h-6 pointer-events-none select-none"
                style={{ translateX: "-50%", translateY: "-50%" }}
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ x, y, rotate: 540, scale: 1 }}
                exit={{ opacity: 0, scale: 0.3 }}
                transition={{ duration, ease: "easeOut" }}
              >
                <Image src="/images/coin-blue.png" alt="coin" width={24} height={24} draggable={false} priority />
              </motion.div>
            )
          })}
      </AnimatePresence>
    </div>
  )
} 