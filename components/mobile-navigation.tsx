"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Flame, Heart, Zap, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"
import { useTranslation } from "react-i18next"

const getNavItems = (t: any) => [
  { href: "/", label: t('navigation.home', 'Home'), icon: Home },
  { href: "/ping", label: t('tabs.ping', 'Ping'), icon: Zap },
  { href: "/burn", label: t('tabs.burn', 'Burn'), icon: Flame },
  { href: "/breed", label: t('tabs.breed', 'Breed'), icon: Heart },
  { href: "/info", label: t('tabs.info', 'Info'), icon: Info },
]

export function MobileNavigation() {
  const pathname = usePathname()
  const isMobile = useMobile()
  const { t } = useTranslation()

  if (!isMobile) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-t border-slate-800">
      <nav className="mobile-nav">
        <div className="flex justify-around items-center h-16">
          {getNavItems(t).map((item) => {
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
    </div>
  )
} 