import { useEffect, useState, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { decodeEventLog, parseAbiItem } from 'viem';
import { apeChain } from '../config/chains';

const GAME_ADDR = apeChain.contracts.gameProxy.address;

// minimal ABI with only NFTBred event
const NFTBRED_ITEM = parseAbiItem(
  'event NFTBred(address indexed requester,uint256 parent1Id,uint256 parent2Id,uint256 revivedId)'
);

export const useLiveBredCubes = () => {
  const { address } = useAccount();
  const client = usePublicClient();
  const [revived, setRevived] = useState<number[]>([]);
  const [isWatching, setIsWatching] = useState(false);

  useEffect(() => {
    if (!client || !address) return undefined;

    // Throttle event watching - only enable when user is actively on the page
    if (isWatching) {
      const unwatch = client.watchEvent({
        address: GAME_ADDR,
        event: NFTBRED_ITEM,
        onLogs: (logs: any[]) => {
          // [SECURITY/UX-NOTE] Relying solely on events for critical UI updates can be misleading.
          // A block reorganization could revert the transaction, but the UI would have already
          // shown a "success" state.
          // BEST PRACTICE: Use the event as a trigger to re-fetch the definitive state from the contract.
          // For example, after catching this event, you should trigger a refetch of the NFT's owner
          // or its status to confirm the change is final.

          logs.forEach(log => {
            const { args } = decodeEventLog({
              abi: [NFTBRED_ITEM],
              eventName: 'NFTBred',
              ...log,
            });
            if (
              args &&
              typeof args === 'object' &&
              'requester' in args &&
              'revivedId' in args
            ) {
              if (
                (args.requester as string).toLowerCase() ===
                address.toLowerCase()
              ) {
                setRevived(prev =>
                  prev.includes(Number(args.revivedId))
                    ? prev
                    : [...prev, Number(args.revivedId)]
                );
              }
            }
          });
        },
      });
      return () => unwatch();
    }
    return undefined;
  }, [client, address, isWatching]);

  // Methods for controlling watching
  const startWatching = useCallback(() => setIsWatching(true), []);
  const stopWatching = useCallback(() => setIsWatching(false), []);

  return {
    revived,
    startWatching,
    stopWatching,
    isWatching,
  };
};
