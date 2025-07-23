# CrazyCubeUltimate3 — Cheat Sheet

## 0. Connecting in Frontend

```ts
import abi from '@/abi/CrazyCubeUltimate3_Safe.json';
import { ethers } from 'ethers';

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const cube = new ethers.Contract(CUBE_PROXY_ADDR, abi, signer);
```

**Tip:** use `formatUnits(value, 18)` when displaying amounts and work in wei inside logic.

## 1. Admin / Configurator Functions

| Function                                           | What it does                                       | Example call (ethers v6)                                |
| -------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| `topUpMonthlyPool(amountWei)`                      | Puts CRA directly into monthlyRewardPool           | `cube.topUpMonthlyPool(parseUnits("6666670425963",18))` |
| `topUpLockedPool(amountWei)`                       | Replenishes long-term totalLockedForRewards        | `cube.topUpLockedPool(parseUnits("8e13",18))`           |
| `setMonthlyUnlockPercentage(bps)`                  | Changes autounlock speed. 833 = 8.33 % ≈ 12 months | `cube.setMonthlyUnlockPercentage(833)`                  |
| `configureTimings(ping, maxAcc, breedCd, graveCd)` | ⚙️ Time in seconds                                 | `cube.configureTimings(30, 15*24*3600, 30, 30)`         |
| `setCapDivisor(d)`                                 | Payment limit per ping. Default = 5000 (1 NFT)     | `cube.setCapDivisor(10000)`                             |
| `configureBurnSplit(waitH, player, pool, burn)`    | Distribution on burn                               | `cube.configureBurnSplit(24, 7000, 2000, 1000)`         |
| `configureMonthDuration(sec)`                      | Length of "month" for unlock logic                 | `cube.configureMonthDuration(86400*28)`                 |
| `setManualFloorPrice(priceWei)`                    | Manual floor-price for breed-cost calculation      | `cube.setManualFloorPrice(parseUnits("1",18))`          |
| `setRarityBonus(key, bps)`                         | Sets rarity bonus                                  | `cube.setRarityBonus("legendary", 5000)`                |
| `setBreedCostBps(bps)`                             | Sets % from floor for breed                        | `cube.setBreedCostBps(3500)`                            |
| `emergencyResetLockedCRA(ids[])`                   | Resets lockedCRA for NFTs                          | `cube.emergencyResetLockedCRA([1,2,3])`                 |

**Important:** All "CONFIG" functions require `CONFIGURATOR_ROLE`, and any fund transfers require `FUND_MANAGER_ROLE` or `ADMIN_ROLE`.

## 2. Game Actions (Frontend)

| Function                       | When to call                  | Explanation                                       |
| ------------------------------ | ----------------------------- | ------------------------------------------------- |
| `ping(tokenId)`                | User clicked "Ping"           | Distributes reward, auto-unlock, writes lockedCRA |
| `requestBreed(id1, id2, rand)` | 2 NFTs selected in UI         | rand — any bytes32 from frontend                  |
| `burnNFT(id, waitH)`           | Player wants to "burn"        | waitH — 1, 10, 24… according to configured splits |
| `claimBurnRewards(id)`         | After timeout — click "Claim" |                                                   |

## 3. Connecting to Next.js / React

```tsx
// example: useCube.ts
export const useCube = () => {
  const { data: signer } = useSigner(); // wagmi
  const contract = useMemo(
    () => new Contract(CUBE_PROXY_ADDR, abi, signer!),
    [signer]
  );
  return contract as unknown as CrazyCubeUltimate3_Safe;
};
```

### Displaying Amounts

```tsx
const costWei = await cube.getBreedCostCRA();
const costCRA = formatUnits(costWei, 18); // "59360.12"
console.log(Number(costCRA).toLocaleString()); // 59 360.12
```

### approve → call

```ts
const erc20 = new Contract(CRA_ADDR, erc20Abi, signer);
await erc20.approve(CUBE_PROXY_ADDR, costWei);
await cube.requestBreed(id1, id2, randomBytes32);
```

## 4. Production Diagnostics

```bash
npx hardhat run scripts/diagnostics.ts \
  --network mainnet \
  | column -t
```

You'll see:

```bash
monthlyCRA      6 666 670 425 963.000
lockedCRA       73 333 374 685 593.000
monthly/unlocked 833 bps
rate CRA/sec    77 160.09
pingInterval    30 s
monthDuration   720 h
lastUnlock      2025-07-02T18:05:48Z
CRA balance ok  true
```

If `balance ok=false` — urgently call `reconcileBalances()`.

## 5. Upgrade Logic

```bash
# 1. Compile new implementation
npx hardhat compile

# 2. Deploy implementation
npx hardhat run scripts/deploy.ts --network mainnet
# remember implementation address

# 3. Upgrade proxy
npx hardhat run --network mainnet \
  "scripts/upgrade.ts <proxy> <newImpl>"
```

upgrade.ts example:

```ts
import { upgrades, ethers } from 'hardhat';
async function main() {
  const [proxy, impl] = process.argv.slice(2);
  await upgrades.forceImport(
    proxy,
    await ethers.getContractFactory('CrazyCubeUltimate3_Safe')
  );
  await upgrades.upgradeProxy(proxy, impl);
  console.log('Upgraded!');
}
main();
```

**Role:** `UPGRADER_ROLE` required for tx-sender.

## 6. View Functions

| Function                  | Returns                      | Example                                  |
| ------------------------- | ---------------------------- | ---------------------------------------- |
| `manualFloorPrice()`      | Current floor price          | `await cube.manualFloorPrice()`          |
| `breedCostBps()`          | % from floor price for breed | `await cube.breedCostBps()`              |
| `pingCooldown()`          | Ping cooldown in seconds     | `await cube.pingCooldown()`              |
| `breedCooldown()`         | Breed cooldown in seconds    | `await cube.breedCooldown()`             |
| `monthDuration()`         | Month duration in seconds    | `await cube.monthDuration()`             |
| `rarityBonusBps(key)`     | Rarity bonus by key          | `await cube.rarityBonusBps("legendary")` |
| `nftState(tokenId)`       | NFT state                    | `await cube.nftState(1337)`              |
| `monthlyRewardPool()`     | Monthly pool size            | `await cube.monthlyRewardPool()`         |
| `totalLockedForRewards()` | Locked pool size             | `await cube.totalLockedForRewards()`     |

## 7. Non-existent Methods (DON'T CALL!)

❌ `setRarityBonus()` - NOT in contract (only with key!)
❌ `setPingInterval()` - NOT (use `configureTimings`)  
❌ `setMonthDuration()` - NOT (use `configureMonthDuration`)
❌ `setBreedCost()` - NOT (use `setBreedCostBps`)

**Correct methods:**
✅ `setRarityBonus(string key, uint256 bps)`
✅ `configureTimings(ping, maxAcc, breed, grave)`
✅ `configureMonthDuration(seconds)`
✅ `setBreedCostBps(bps)`

## 8. Useful Utilities

```ts
// Time formatting
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

// Basis points formatting
function formatBps(bps: number): string {
  return `${bps / 100}%`;
}

// CRA formatting with localization
function formatCRA(amountWei: bigint): string {
  return Number(ethers.formatEther(amountWei)).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

// Time until event check
function getTimeUntil(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = timestamp - now;

  if (diff <= 0) {
    return 'Available now';
  }

  return `In ${formatDuration(diff)}`;
}
```

## 9. Contract Addresses (ApeChain)
