"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Flame, Heart, Zap, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/ping", label: "Ping", icon: Zap },
  { href: "/burn", label: "Burn", icon: Flame },
  { href: "/breed", label: "Breed", icon: Heart },
  { href: "/info", label: "Info", icon: Info },
]

export function MobileNavigation() {
  const pathname = usePathname()
  const { isMobile } = useMobile()

  if (!isMobile) return null

  return (
    <nav className="mobile-nav">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                "text-muted-foreground hover:text-foreground",
                isActive && "text-primary"
              )}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
} 