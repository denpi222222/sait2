"use client"

import { useEffect, useMemo, useState } from "react"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMobile } from "@/hooks/use-mobile"
import { useTranslation } from "react-i18next"

export function I18nLanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const isMobile = useMobile()
  const [mounted, setMounted] = useState(false)

  // Memoize supported languages to prevent recreation on each render
  const languages = useMemo(
    () => [
      { code: "en", name: "English", display: "EN" },
      { code: "zh", name: "中文", flag: "🇨🇳" },
      { code: "ru", name: "Русский", flag: "🇷🇺" },
      { code: "uk", name: "Українська", flag: "🇺🇦" },
      { code: "es", name: "Español", flag: "🇪🇸" },
      { code: "ko", name: "한국어", flag: "🇰🇷" },
      { code: "tr", name: "Türkçe", flag: "🇹🇷" },
      { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
    ],
    [],
  )

  // Function to switch language safely
  const switchLanguage = (langCode: string) => {
    try {
      if (i18n && typeof i18n.changeLanguage === "function") {
        i18n.changeLanguage(langCode)
        // Save selected language to localStorage
        localStorage.setItem("i18nextLng", langCode)
      } else {
        console.error("i18n.changeLanguage is not available")
      }
    } catch (error) {
      console.error("Error changing language:", error)
    }
  }

  // Initialize component on client side only
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="flex items-center space-x-1 overflow-x-auto py-1 px-1 bg-black/30 rounded-lg border border-cyan-500/30 max-w-full">
      <Globe className="h-4 w-4 text-cyan-300 flex-shrink-0 mr-1" />
      <div className="flex space-x-1 overflow-x-auto no-scrollbar">
        {languages.map((language) => (
          <Button
            key={language.code}
            variant="ghost"
            size="sm"
            onClick={() => switchLanguage(language.code)}
            className={`px-2 py-1 h-7 min-w-0 flex-shrink-0 ${
              i18n.language === language.code
                ? "bg-cyan-900/50 text-cyan-300 hover:bg-cyan-900/70"
                : "text-cyan-500 hover:text-cyan-300 hover:bg-slate-800/50"
            }`}
            title={language.name}
          >
            <span>{language.flag || language.display}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}

export default I18nLanguageSwitcher
