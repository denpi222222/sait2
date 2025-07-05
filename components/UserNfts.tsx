import React from 'react';
import { useAlchemyNfts } from '@/hooks/useAlchemyNfts';
import { useSafeContractWrite } from '@/hooks/use-safe-contract-write';
import crazyCubeUltimateAbi from '@/contracts/abi/CrazyCubeUltimate.json';

const CRAZYCUBE_ADDR =
  process.env.NEXT_PUBLIC_CRAZYCUBE_CONTRACT && process.env.NEXT_PUBLIC_CRAZYCUBE_CONTRACT !== "undefined"
    ? (process.env.NEXT_PUBLIC_CRAZYCUBE_CONTRACT as `0x${string}`)
    : ("0x606a47707d5aEdaE9f616A6f1853fE3075bA740B" as `0x${string}`);

const crazyCubeUltimateContract = {
  address: CRAZYCUBE_ADDR,
  abi: crazyCubeUltimateAbi.abi,
};

const NFTCard = ({ nft, onBurn }: { nft: any, onBurn: (id: string) => void }) => (
  <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '16px', margin: '8px', textAlign: 'center' }}>
    <img src={nft.image} alt={nft.name} width="200" height="200" style={{ objectFit: 'cover', borderRadius: '4px' }} />
    <h3>{nft.name}</h3>
    <p>Stars: {nft.stars}</p>
    <button onClick={() => onBurn(nft.id)} style={{ padding: '8px 16px', background: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
      Burn NFT
    </button>
  </div>
);

export const UserNfts = () => {
  const { nfts, isLoading, error } = useAlchemyNfts();
  const { writeContract, isPending: isBurning } = useSafeContractWrite();

  const handleBurn = (tokenId: string) => {
    writeContract({
      ...crazyCubeUltimateContract,
      functionName: 'burnNFT',
      args: [BigInt(tokenId)],
    });
  };

  if (isLoading) return <div>Loading your awesome Cubes...</div>;
  if (error) return <div>Error loading NFTs: {error.message}</div>;
  if (nfts.length === 0) return <div>You don't own any Crazy Cubes yet.</div>;

  return (
    <div>
      <h2>Your Crazy Cubes</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        {nfts.map(nft => (
          <NFTCard key={nft.id} nft={nft} onBurn={handleBurn} />
        ))}
      </div>
      {isBurning && <div>Burning in progress... Check your wallet!</div>}
    </div>
  );
};
