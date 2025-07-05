'use client'

import { useNetworkGuard } from '@/hooks/use-network-guard'
import { useSwitchChain } from 'wagmi'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Wifi } from 'lucide-react'
import { useEffect } from 'react'

export function NetworkSwitchOverlay() {
  const { needsNetworkSwitch, isConnected } = useNetworkGuard()
  const { switchChain, isPending } = useSwitchChain()

  const handleSwitchNetwork = async () => {
    try {
      await switchChain({ chainId: 33139 }) // ApeChain mainnet
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }

  // Не показываем оверлей если кошелек не подключен или сеть правильная
  if (!isConnected || !needsNetworkSwitch) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-red-900/90 to-orange-900/90 border border-red-500/50 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <AlertTriangle className="w-16 h-16 text-red-400 animate-pulse" />
            <Wifi className="w-8 h-8 text-orange-400 absolute -top-1 -right-1 animate-bounce" />
          </div>
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-4">
          Смените сеть
        </h2>
        
        <p className="text-red-200 mb-6 text-lg leading-relaxed">
          Для работы с CrazyCube необходимо переключиться на сеть ApeChain
        </p>
        
        <div className="space-y-4">
          <Button 
            onClick={handleSwitchNetwork}
            disabled={isPending}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg"
          >
            {isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                Переключение...
              </>
            ) : (
              <>
                <Wifi className="w-5 h-5 mr-3" />
                Switch to ApeChain
              </>
            )}
          </Button>
          
          <div className="text-sm text-red-300/80">
            Это действие откроет ваш кошелек для подтверждения
          </div>
        </div>
      </div>
    </div>
  )
} 