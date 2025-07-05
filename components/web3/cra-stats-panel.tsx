"use client"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import useCRAStats from "@/hooks/useCRAStats"
import { Flame, Users, CircleDollarSign } from "lucide-react"

export default function CRAStatsPanel(){
  const { data, loading, error } = useCRAStats()
  if(error) return <Card className="p-6 bg-slate-800/70 border border-red-500/30 text-red-400">Ошибка: {error.message}</Card>
  if(loading || !data) return <Skeleton className="w-full h-40" />

  const total = BigInt(data.totalSupply)
  const burned = BigInt(data.deadBalance)
  const circulating = total - burned
  const burnedPct = Number((burned * 100n) / (total||1n))

  return (
    <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700">
      <h3 className="text-xl font-bold text-slate-200 mb-4 flex items-center">
        <CircleDollarSign className="h-5 w-5 mr-2 text-yellow-400" /> CRA Token Overview
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Supply */}
        <div className="bg-slate-900/40 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-400 mb-1">Всего выпущено</p>
          <p className="text-2xl font-bold text-slate-200">{total.toString()}</p>
        </div>
        {/* Burned */}
        <div className="bg-slate-900/40 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-400 mb-1 flex items-center justify-center"><Flame className="h-4 w-4 text-orange-400 mr-1"/> Сожжено</p>
          <p className="text-2xl font-bold text-orange-400">{burned.toString()} ({burnedPct}%)</p>
        </div>
        {/* Circulating */}
        <div className="bg-slate-900/40 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-400 mb-1">В обращении</p>
          <p className="text-2xl font-bold text-green-400">{circulating.toString()}</p>
        </div>
        {/* Holders - placeholder */}
        <div className="bg-slate-900/30 rounded-lg p-4 text-center md:col-span-3">
          <p className="text-sm text-slate-400 mb-1 flex items-center justify-center"><Users className="h-4 w-4 mr-1"/> Держателей</p>
          <p className="text-xl font-bold text-slate-300">—</p>
          <p className="text-xs text-slate-500">метрика появится позже</p>
        </div>
      </div>
    </Card>
  )
} 