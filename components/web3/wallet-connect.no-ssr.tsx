"use client"

import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useAccount, useChainId, useBalance } from 'wagmi'
import { useNetwork } from '@/hooks/use-network'
import { apeChain } from '@/config/chains'
import { Button } from '@/components/ui/button'
import { Wallet, AlertTriangle, Coins } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function WalletConnectNoSSR() {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { isApeChain } = useNetwork()
  const { t } = useTranslation()
  const { open } = useWeb3Modal()

  const { data: craBal } = useBalance({
    address,
    token: apeChain.contracts.crazyToken.address as `0x${string}`,
    chainId: apeChain.id,
    query: { enabled: !!address }
  })

  // Format CRA balance nicely
  const formatCRABalance = (balance: string) => {
    const num = parseFloat(balance)
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`
    } else {
      return num.toFixed(2)
    }
  }

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Network Status */}
      {isConnected && !isApeChain && (
        <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 border border-red-500/50 rounded-md">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-xs text-red-400">
            {t('network.wrong', 'Wrong Network')}
          </span>
        </div>
      )}
      
      {/* Web3Modal Connect Button */}
      {!isConnected ? (
        <Button
          onClick={() => open()}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0"
        >
          <Wallet className="w-4 h-4 mr-2" />
          {t('wallet.connect', 'Connect Wallet')}
        </Button>
      ) : !isApeChain ? (
        <Button
          onClick={() => open({ view: 'Networks' })}
          className="bg-red-600 hover:bg-red-700 text-white border-0"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          {t('network.switch', 'Switch to ApeChain')}
        </Button>
      ) : (
        <div className="flex flex-col items-end gap-2">
          <Button
            onClick={() => open()}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 min-w-[180px] px-4 py-2 text-sm font-medium"
          >
            <Wallet className="w-4 h-4 mr-2" />
            {address ? formatAddress(address) : t('wallet.connected', 'Connected')}
          </Button>
          
          {/* CRA Balance Display */}
          {craBal && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-400/40 rounded-lg backdrop-blur-sm shadow-lg">
              <div className="flex items-center gap-1">
                <Coins className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-medium text-cyan-300">Balance:</span>
              </div>
              <span className="text-sm font-bold text-cyan-100 font-mono">
                {formatCRABalance(craBal.formatted)} CRA
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 