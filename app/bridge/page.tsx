"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Heart } from "lucide-react"
import Link from "next/link"
import { useMobile } from "@/hooks/use-mobile"
import Image from "next/image"
import { WalletConnectNoSSR as WalletConnect } from "@/components/web3/wallet-connect.no-ssr"
import { TabNavigation } from "@/components/tab-navigation"
import { useTranslation } from "react-i18next"
import { BreedForm } from "@/components/BreedForm"
import { useAccount } from "wagmi"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Trans } from "react-i18next"

export default function BridgePage() {
  const { isConnected } = useAccount()
  const isMobile = useMobile()
  const { t } = useTranslation()

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 flex flex-col items-center justify-center p-4">
        <div className="mb-6 w-24 h-24 relative">
          <Image
            src="/favicon.ico"
            alt="CrazyCube Logo"
            width={96}
            height={96}
            className="object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
          />
        </div>
        <Card className="w-full max-w-md bg-black/30 border border-pink-500/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-pink-400">
              {t("sections.bridge.title", "Bridge NFT 🔄")}
            </CardTitle>
            <CardDescription className="text-center text-pink-300">
              {t("sections.bridge.description", "Return NFT from the graveyard")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <WalletConnect />
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/">
              <Button variant="outline" className="border-pink-500/30 bg-black/20 text-pink-300 hover:bg-black/40">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("construction.returnHome", "Return to Home")}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 p-4">
      {/* Add heart animation instead of particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: isMobile ? 15 : 30 }).map((_, i) => (
          <motion.div
            key={i}
            className={`absolute ${
              i % 4 === 0
                ? "text-pink-400"
                : i % 4 === 1
                  ? "text-rose-400"
                  : i % 4 === 2
                    ? "text-red-400"
                    : "text-pink-300"
            }`}
            initial={{
              x: Math.random() * 100,
              y: Math.random() * 100,
              scale: Math.random() * 0.5 + 0.5,
              opacity: 0,
              rotate: Math.random() * 30 - 15,
            }}
            animate={{
              y: [null, -100 - Math.random() * 50],
              opacity: [0, 0.9, 0],
              scale: [0.5, 1 + Math.random() * 0.5, 0.5],
              rotate: [Math.random() * 30 - 15, Math.random() * 30 - 15],
            }}
            transition={{
              duration: 3 + Math.random() * 3,
              repeat: Number.POSITIVE_INFINITY,
              delay: Math.random() * 5,
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          >
            <Heart
              size={i % 5 === 0 ? 40 : i % 5 === 1 ? 32 : i % 5 === 2 ? 24 : i % 5 === 3 ? 48 : 36}
              fill="currentColor"
              style={{
                filter: "drop-shadow(0 0 8px currentColor)",
              }}
            />
          </motion.div>
        ))}
      </div>

      <div className="container mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/">
            <Button variant="outline" className="border-pink-500/30 bg-black/20 text-pink-300 hover:bg-black/40">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("construction.returnHome", "Return to Home")}
            </Button>
          </Link>
          <div className="ml-4 w-10 h-10 relative">
            <Image
              src="/favicon.ico"
              alt="CrazyCube Logo"
              width={40}
              height={40}
              className="object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
            />
          </div>
          <WalletConnect />
        </header>

        {/* Add tab navigation */}
        <TabNavigation />
        <h1 className="text-3xl font-bold mt-4 text-center text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-400">
          {t("sections.bridge.title", "Bridge (Bring Back the Cube!)")} 💖
        </h1>
        <p className="text-center text-pink-300 mt-2">
          {t(
            "sections.bridge.description",
            'Cubes return from the graveyard — a random NFT jumps out shouting "I\'m free!"',
          )}
        </p>

        {/* Guide accordion */}
        <div className="flex justify-center my-4">
          <Accordion type="single" collapsible className="w-full max-w-lg">
            <AccordionItem value="guide" className="border-none">
              <AccordionTrigger className="w-full bg-black/30 backdrop-blur-sm border border-pink-500/40 rounded-full px-4 py-2 text-center text-pink-200 text-sm md:text-base font-semibold hover:bg-black/50 focus:outline-none focus:ring-0 after:hidden">
                {t('sections.bridge.guide.title')}
              </AccordionTrigger>
              <AccordionContent className="text-sm space-y-2 text-pink-200 mt-2 bg-black/90 p-4 rounded-lg border border-pink-500/20">
                <p><Trans i18nKey="sections.bridge.guide.intro" /></p>
                <p><Trans i18nKey="sections.bridge.guide.fee" /></p>
                <p><Trans i18nKey="sections.bridge.guide.requirement" /></p>
                <p><Trans i18nKey="sections.bridge.guide.rarity" /></p>
                <p><Trans i18nKey="sections.bridge.guide.penalty" /></p>
                <ol className="list-decimal list-inside pl-4 space-y-0.5">
                  <li>{t('sections.bridge.guide.step1')}</li>
                  <li>{t('sections.bridge.guide.step2')}</li>
                </ol>
                <p className="text-xs text-pink-300"><Trans i18nKey="sections.bridge.guide.note" /></p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <BreedForm />
      </div>
    </div>
  )
}
