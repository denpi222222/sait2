'use client';

import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount, useChainId, useBalance } from 'wagmi';
import { useNetwork } from '@/hooks/use-network';
import { apeChain } from '@/config/chains';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wallet, AlertTriangle, Coins, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function WalletConnectNoSSR() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { isApeChain } = useNetwork();
  const { t } = useTranslation();
  const { open } = useWeb3Modal();
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const { data: craBal } = useBalance({
    address,
    token: apeChain.contracts.crazyToken.address as `0x${string}`,
    chainId: apeChain.id,
    query: { enabled: !!address },
  });

  // Format CRA balance nicely
  const formatCRABalance = (balance: string) => {
    const num = parseFloat(balance);
    if (!isFinite(num) || num < 0) {
      return '0';
    }
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
      num
    );
  };

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className='flex items-center'>
      {!isConnected ? (
        <Button
          onClick={() => open()}
          className='bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0'
        >
          <Wallet className='w-4 h-4 mr-2' />
          {t('wallet.connect', 'Connect Wallet')}
        </Button>
      ) : !isApeChain ? (
        <Button
          onClick={() => open({ view: 'Networks' })}
          className='bg-red-600 hover:bg-red-700 text-white border-0'
        >
          <AlertTriangle className='w-4 h-4 mr-2' />
          {t('network.switch', 'Switch to ApeChain')}
        </Button>
      ) : (
        <div className='flex flex-col items-end gap-2'>
          <Button
            onClick={() => open()}
            className='bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 min-w-[180px] px-4 py-2 text-sm font-medium'
          >
            <Wallet className='w-4 h-4 mr-2' />
            {address
              ? formatAddress(address)
              : t('wallet.connected', 'Connected')}
          </Button>

          {/* CRA Balance Display */}
          {craBal && (
            <div className='flex flex-col items-end gap-1'>
              <div className='flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-400/40 rounded-lg backdrop-blur-sm shadow-lg'>
                <div className='flex items-center gap-1'>
                  <Coins className='w-4 h-4 text-cyan-400' />
                  <span className='text-xs font-medium text-cyan-300'>
                    Balance:
                  </span>
                </div>
                <span className='text-sm font-bold text-cyan-100 font-mono'>
                  {formatCRABalance(craBal.formatted)} CRAA
                </span>
              </div>

              {/* Game Guide Button */}
              <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant='outline'
                    size='default'
                    className='w-full min-w-[180px] text-sm px-3 py-1.5 h-8 bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  >
                    <BookOpen className='w-4 h-4 mr-2' />
                    {t('wallet.instruction', 'Instruction')}
                  </Button>
                </DialogTrigger>
                <DialogContent className='max-w-2xl max-h-[80vh] bg-slate-900 border-slate-700'>
                  <DialogHeader>
                    <DialogTitle className='text-xl font-bold text-white flex items-center'>
                      <BookOpen className='w-5 h-5 mr-2 text-cyan-400' />
                      {t('wallet.gameGuide', 'CrazyCube Game Guide')}
                    </DialogTitle>
                  </DialogHeader>
                  <ScrollArea className='h-[60vh] pr-4'>
                    <div className='text-slate-300 whitespace-pre-line text-sm leading-relaxed'>
                      {t(
                        'wallet.gameGuideContent',
                        'Game guide content not available'
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
