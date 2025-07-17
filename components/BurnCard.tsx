import { useState, useEffect } from "react";
import { UnifiedNftCard } from "./UnifiedNftCard";
import { Flame, Star, Loader2, SatelliteDish } from "lucide-react";
import { useCrazyCubeGame, type NFTGameData } from "@/hooks/useCrazyCubeGame";
import { usePerformanceContext } from "@/hooks/use-performance-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { parseEther, formatEther } from "viem";
import { getColor, getLabel } from "@/lib/rarity";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type { NFT } from "@/types/nft";
import { useNetwork } from "@/hooks/use-network";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface BurnCardProps {
  nft: NFT;
  index: number;
  onActionComplete?: () => void;
}

// Helper: format wei → CRA human-readable
const fmtCRA = (val: string | bigint) => {
  const wei = typeof val === "string" ? parseEther(val) : val;
  const cra = Number(formatEther(wei));
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    cra,
  );
};

export default function BurnCard({
  nft,
  index,
  onActionComplete,
}: BurnCardProps) {
  const { t } = useTranslation();
  const tokenId = String(nft.tokenId);
  const { isLiteMode } = usePerformanceContext();
  const {
    getNFTGameData,
    burnFeeBps,
    approveCRA,
    approveNFT,
    burnNFT,
    isConnected,
    pingInterval,
    getBurnSplit,
  } = useCrazyCubeGame();
  const { toast } = useToast();
  const [data, setData] = useState<NFTGameData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<
    "idle" | "approvingCRA" | "approvingNFT" | "burning"
  >("idle");
  const [waitHours, setWaitHours] = useState<12 | 24 | 48>(12);
  const [burnSplit, setBurnSplit] = useState<{
    playerBps: number;
    poolBps: number;
    burnBps: number;
  }>({ playerBps: 0, poolBps: 0, burnBps: 0 });
  const [burnFX, setBurnFX] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { isApeChain, requireApeChain } = useNetwork();
  const { isMobile } = useMobile();

  useEffect(() => {
    getNFTGameData(tokenId).then(setData);
  }, [tokenId]);

  // Derived ping status
  const nowSec = Math.floor(Date.now() / 1000);
  const pingReady = data
    ? data.lastPingTime === 0 || nowSec > data.lastPingTime + pingInterval
    : false;
  const pingTimeLeft = data
    ? Math.max(0, data.lastPingTime + pingInterval - nowSec)
    : 0;

  // fetch burn split when waitHours changes
  useEffect(() => {
    let ignore = false;
    getBurnSplit(waitHours).then((split) => {
      if (!ignore) setBurnSplit(split);
    });
    return () => {
      ignore = true;
    };
  }, [waitHours]);

  const widgets = [] as JSX.Element[];
  // CRA badge
  if (data) {
    // CRA amount
    widgets.push(
      <Badge key="cra" className="bg-orange-600/80 text-xs font-mono">
        💰 {fmtCRA(data.lockedCRA)}
      </Badge>,
    );

    // Stars row (filled / empty)
    widgets.push(
      <span key="stars" className="flex space-x-0.5">
        {Array.from({ length: data.initialStars }).map((_, idx) => (
          <Star
            key={idx}
            className={`w-2 h-2 ${idx < data.currentStars ? "text-yellow-400 fill-current" : "text-gray-600"} `}
          />
        ))}
      </span>,
    );

    // Ping status badge
    widgets.push(
      <Badge
        key="ping"
        variant="secondary"
        className={`text-xs ${pingReady ? "text-green-400" : "text-gray-400"}`}
      >
        <SatelliteDish className="w-2 h-2 mr-0.5 inline" />{" "}
        {pingReady ? "Ping ✓" : `${Math.ceil(pingTimeLeft / 60)}m`}
      </Badge>,
    );
  }

  widgets.push(
    <Badge key="fee" variant="secondary" className="text-red-400/80 text-xs">
      <Flame className="w-2 h-2 mr-0.5 inline" /> Fee {burnFeeBps / 100}%
    </Badge>,
  );

  // Helper to calculate fee based on locked CRA and burnFeeBps
  const calcFee = () => {
    if (!data) return "0";
    const lockedWei = parseEther(data.lockedCRA);
    const feeWei = (lockedWei * BigInt(burnFeeBps)) / BigInt(10000);
    return fmtCRA(feeWei);
  };

  // Helper to calculate total locked CRA
  const calcTotalLocked = () => {
    if (!data) return "0";
    return fmtCRA(data.lockedCRA);
  };

  const calcShares = () => {
    if (!data) return { user: "0", pool: "0", burn: "0" };
    const totalWei = parseEther(data.lockedCRA);
    const userWei = (totalWei * BigInt(burnSplit.playerBps)) / BigInt(10000);
    const poolWei = (totalWei * BigInt(burnSplit.poolBps)) / BigInt(10000);
    const burnWei = (totalWei * BigInt(burnSplit.burnBps)) / BigInt(10000);
    return {
      user: fmtCRA(userWei),
      pool: fmtCRA(poolWei),
      burn: fmtCRA(burnWei),
    };
  };

  const startBurn = () => {
    if (!isConnected) {
      toast({
        title: t("wallet.notConnected", "Wallet not connected"),
        description: t("wallet.connectFirst", "Connect wallet first"),
        variant: "destructive",
      });
      return;
    }
    if (!data) return;
    if (data.isInGraveyard) {
      toast({
        title: t("burn.alreadyBurned", "Already burned"),
        description: t("burn.inGraveyard", "This NFT is already in graveyard"),
        variant: "destructive",
      });
      return;
    }
    setDialogOpen(true);
  };

  const handleBurn = requireApeChain(async () => {
    if (!isConnected) {
      toast({
        title: t("wallet.notConnected", "Wallet not connected"),
        description: t("wallet.connectFirst", "Connect wallet first"),
        variant: "destructive",
      });
      return;
    }
    if (!data) return;
    if (data.isInGraveyard) {
      toast({
        title: t("burn.alreadyBurned", "Already burned"),
        description: t("burn.inGraveyard", "This NFT is already in graveyard"),
        variant: "destructive",
      });
      return;
    }
    const fee = calcFee();
    try {
      setIsProcessing(true);
      setStep("approvingCRA");
      toast({ title: "Approving CRA", description: `Fee: ${fee} CRA` });
      await approveCRA(fee.replace(/,/g, ""));
      setStep("approvingNFT");
      toast({ title: "Approving NFT", description: `Token #${tokenId}` });
      await approveNFT(tokenId);
      setStep("burning");
      toast({ title: "Burning NFT", description: `Token #${tokenId}` });
      setBurnFX(true);
      setTimeout(() => setBurnFX(false), 3000);
      await burnNFT(tokenId, waitHours);
      toast({
        title: "NFT burned",
        description: `Sent to graveyard. Claim after ${waitHours}h`,
      });
      if (onActionComplete) onActionComplete();
      const updated = await getNFTGameData(tokenId);
      setData(updated);
    } catch (error: any) {
      console.error("Burn error", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to burn NFT",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setStep("idle");
    }
  });

  return (
    <>
      <div
        className={`flex flex-col h-full ${isLiteMode ? "min-h-[380px]" : "min-h-[420px]"}`}
      >
        <div className="flex-1 flex flex-col justify-between">
          {/* NFT visual layer */}
          <div
            className={`${data && Number(data.lockedCRA) === 0 ? "opacity-30 grayscale pointer-events-none" : ""}`}
          >
            <UnifiedNftCard
              imageSrc={nft.image}
              tokenId={tokenId}
              title={nft.name || `CrazyCube #${tokenId}`}
              rarityLabel={
                data?.rarity ? getLabel(data.rarity) || "Common" : "Common"
              }
              rarityColorClass={`${data ? getColor(data.rarity) : "bg-gray-500"} text-white`}
              widgets={widgets}
              delay={isLiteMode ? 0 : index * 0.05}
            />
          </div>

          {/* burn overlay */}
          {burnFX && (
            <div className="absolute inset-0 burn-overlay pointer-events-none rounded-lg" />
          )}

          {/* Wait period selector */}
          <div className="flex justify-center gap-1 mt-2">
            {[12, 24, 48].map((h) => (
              <Button
                key={h}
                variant={waitHours === h ? "default" : "outline"}
                size="sm"
                className="px-2 py-1"
                onClick={() => setWaitHours(h as 12 | 24 | 48)}
                disabled={isProcessing}
              >
                {h}h
              </Button>
            ))}
          </div>

          {/* Share breakdown */}
          {data && (
            <div className="mt-1 bg-black/90 border border-orange-500/40 rounded-md p-2 text-[11px] leading-tight space-y-1 shadow-md shadow-black/50">
              <div className="flex justify-between text-yellow-300 border-b border-orange-500/30 pb-1 mb-1">
                <span>💰 Total Locked</span>
                <span className="font-semibold font-mono text-sm">
                  {calcTotalLocked()}
                </span>
              </div>
              <div className="flex justify-between text-red-400 border-b border-orange-500/30 pb-1 mb-1">
                <span>💸 Fee ({burnFeeBps / 100}%)</span>
                <span className="font-semibold font-mono text-sm">
                  {calcFee()}
                </span>
              </div>
              {(() => {
                const s = calcShares();
                return (
                  <>
                    <div className="flex justify-between">
                      <span>👤 You</span>
                      <span className="font-semibold text-green-300 font-mono text-sm">
                        {s.user}
                      </span>
                    </div>
                    <div className="flex justify-between text-orange-300">
                      <span>🏦 Pool</span>
                      <span className="font-semibold font-mono text-sm">
                        {s.pool}
                      </span>
                    </div>
                    <div className="flex justify-between text-red-400">
                      <span>🔥 Burn</span>
                      <span className="font-semibold font-mono text-sm">
                        {s.burn}
                      </span>
                    </div>
                    <div className="text-center text-gray-400/70 pt-0.5 text-[10px]">
                      Split {burnSplit.playerBps / 100}% /{" "}
                      {burnSplit.poolBps / 100}% / {burnSplit.burnBps / 100}%
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          <div className="mt-2 text-xs text-gray-400 break-all overflow-hidden text-ellipsis max-h-12">
            {/* Example of long number */}
            {data && data.lockedCRA && (
              <span>{Number(data.lockedCRA).toLocaleString()}</span>
            )}
          </div>
        </div>
        <div className="mt-auto w-full">
          <Button
            size="sm"
            className={
              data && Number(data.lockedCRA) === 0
                ? "w-full bg-gray-400 text-gray-700 cursor-not-allowed"
                : "w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white"
            }
            disabled={
              !isApeChain ||
              isProcessing ||
              !!data?.isInGraveyard ||
              (!!data && Number(data.lockedCRA) === 0)
            }
            onClick={handleBurn}
          >
            Burn
          </Button>
        </div>
      </div>
      {/* Global burn animation style & keyframes */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <style jsx global>{`
        @keyframes burnFade {
          0% {
            opacity: 0;
            filter: brightness(2) saturate(1.5);
          }
          10% {
            opacity: 0.9;
          }
          100% {
            opacity: 0;
            transform: scale(0.8) rotate(2deg);
          }
        }
        .burn-overlay {
          background: radial-gradient(
            circle at center,
            rgba(255, 200, 0, 0.6) 0%,
            rgba(255, 0, 0, 0.5) 40%,
            transparent 80%
          );
          animation: burnFade 2.4s forwards ease-out;
        }
      `}</style>
      {/* Confirmation dialog */}
      {data && (
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogContent className="bg-[#2f2b2b]/95 border border-red-500/30 text-gray-100 max-w-md text-[15px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center text-red-300 text-lg">
                <Flame className="w-5 h-5 mr-2" /> Burn NFT #{tokenId}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-orange-50">
                <p>
                  Wait period:{" "}
                  <span className="font-medium text-orange-300">
                    {waitHours}h
                  </span>
                </p>
                <p>
                  Locked CRA:{" "}
                  <span className="font-mono text-yellow-300">
                    {data.lockedCRA}
                  </span>
                </p>
                <p>
                  Fee ({burnFeeBps / 100}%):{" "}
                  <span className="font-mono text-red-300">
                    {calcFee()} CRA
                  </span>
                </p>
                {(() => {
                  const s = calcShares();
                  return (
                    <div className="pt-1 text-xs text-gray-300 space-y-0.5">
                      <div className="bg-gray-800/60 border border-green-400/40 rounded-md px-2 py-1 flex justify-between items-center text-base font-semibold text-green-200">
                        <span>After burn you get</span>
                        <span className="font-mono">{s.user}</span>
                      </div>
                      <p>
                        Pool receives:{" "}
                        <span className="text-orange-300 font-mono">
                          {s.pool}
                        </span>
                      </p>
                      <p>
                        Burned forever:{" "}
                        <span className="text-red-400 font-mono">{s.burn}</span>
                      </p>
                    </div>
                  );
                })()}
                <div className="pt-2 text-xs text-gray-400">
                  You will sign 3 transactions:
                  <br />
                  1️⃣ Approve CRA fee • 2️⃣ Approve NFT • 3️⃣ Burn NFT
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setDialogOpen(false);
                  handleBurn();
                }}
              >
                Confirm Burn
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
