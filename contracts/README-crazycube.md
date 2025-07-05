# CrazyCubeUltimate3 — шпаргалка

## 0. Подключаемся во фронте

```ts
import abi from "@/abi/CrazyCubeUltimate3_Safe.json";
import { ethers } from "ethers";

const provider  = new ethers.BrowserProvider(window.ethereum);
const signer    = await provider.getSigner();
const cube      = new ethers.Contract(CUBE_PROXY_ADDR, abi, signer);
```

**Совет:** используйте `formatUnits(value, 18)` при показе сумм и работайте в wei внутри логики.

## 1. Функции админа / конфигуратора

| Функция | Что делает | Пример вызова (ethers v6) |
|---------|------------|---------------------------|
| `topUpMonthlyPool(amountWei)` | Кладёт CRA прямо в monthlyRewardPool | `cube.topUpMonthlyPool(parseUnits("6666670425963",18))` |
| `topUpLockedPool(amountWei)` | Пополняет долгосрочный totalLockedForRewards | `cube.topUpLockedPool(parseUnits("8e13",18))` |
| `setMonthlyUnlockPercentage(bps)` | Меняет скорость autounlock. 833 = 8.33 % ≈ 12 мес | `cube.setMonthlyUnlockPercentage(833)` |
| `configureTimings(ping, maxAcc, breedCd, graveCd)` | ⚙️ Время в секундах | `cube.configureTimings(30, 15*24*3600, 30, 30)` |
| `setCapDivisor(d)` | Лимит выплат в один ping. По умолч. = 5000 (1 NFT) | `cube.setCapDivisor(10000)` |
| `configureBurnSplit(waitH, player, pool, burn)` | Распределение при burn | `cube.configureBurnSplit(24, 7000, 2000, 1000)` |
| `configureMonthDuration(sec)` | Длина «месяца» для unlock-логики | `cube.configureMonthDuration(86400*28)` |
| `setManualFloorPrice(priceWei)` | Ручной floor-price для расчёта breed-cost | `cube.setManualFloorPrice(parseUnits("1",18))` |
| `setRarityBonus(key, bps)` | Устанавливает бонус редкости | `cube.setRarityBonus("legendary", 5000)` |
| `setBreedCostBps(bps)` | Устанавливает % от floor для breed | `cube.setBreedCostBps(3500)` |
| `emergencyResetLockedCRA(ids[])` | Обнуляет lockedCRA у NFT | `cube.emergencyResetLockedCRA([1,2,3])` |

**Важно:** Все функции "CONFIG" требует роль `CONFIGURATOR_ROLE`, а любые переводы средств — `FUND_MANAGER_ROLE` или `ADMIN_ROLE`.

## 2. Игровые действия (фронт)

| Функция | Когда дёргать | Пояснение |
|---------|---------------|-----------|
| `ping(tokenId)` | Пользователь нажал «Ping» | Раздаёт награду, авто-unlock, пишет lockedCRA |
| `requestBreed(id1, id2, rand)` | В UI выбрано 2 NFT | rand — любой bytes32 от фронта |
| `burnNFT(id, waitH)` | Игрок хочет «сжечь» | waitH — 1, 10, 24… по настроенным сплитам |
| `claimBurnRewards(id)` | После тайм-аута — клик «Claim» | |

## 3. Подключение к Next.js / React

```tsx
// example: useCube.ts
export const useCube = () => {
  const { data: signer } = useSigner();           // wagmi
  const contract = useMemo(() =>
    new Contract(CUBE_PROXY_ADDR, abi, signer!), [signer]);
  return contract as unknown as CrazyCubeUltimate3_Safe;
};
```

### Показываем суммы

```tsx
const costWei   = await cube.getBreedCostCRA();
const costCRA   = formatUnits(costWei, 18);           // "59360.12"
console.log( Number(costCRA).toLocaleString() );      // 59 360.12
```

### approve → call

```ts
const erc20 = new Contract(CRA_ADDR, erc20Abi, signer);
await erc20.approve(CUBE_PROXY_ADDR, costWei);
await cube.requestBreed(id1, id2, randomBytes32);
```

## 4. Диагностика на проде

```bash
npx hardhat run scripts/diagnostics.ts \
  --network mainnet \
  | column -t
```

Вы увидите:

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

Если `balance ok=false` — срочно зовите `reconcileBalances()`.

## 5. Апгрейд логики

```bash
# 1. Компилируем новую реализацию
npx hardhat compile

# 2. Деплой implementation
npx hardhat run scripts/deploy.ts --network mainnet
# запомните адрес implementation

# 3. Апгрейд прокси
npx hardhat run --network mainnet \
  "scripts/upgrade.ts <proxy> <newImpl>"
```

upgrade.ts пример:

```ts
import { upgrades, ethers } from "hardhat";
async function main() {
  const [proxy, impl] = process.argv.slice(2);
  await upgrades.forceImport(proxy, await ethers.getContractFactory("CrazyCubeUltimate3_Safe"));
  await upgrades.upgradeProxy(proxy, impl);
  console.log("Upgraded!");
}
main();
```

**Роль:** `UPGRADER_ROLE` обязателен у tx-sender.

## 6. Функции просмотра (view)

| Функция | Возвращает | Пример |
|---------|------------|---------|
| `manualFloorPrice()` | Текущая цена пола | `await cube.manualFloorPrice()` |
| `breedCostBps()` | % от цены пола для breed | `await cube.breedCostBps()` |
| `pingCooldown()` | Кулдаун пинга в секундах | `await cube.pingCooldown()` |
| `breedCooldown()` | Кулдаун брида в секундах | `await cube.breedCooldown()` |
| `monthDuration()` | Длительность месяца в секундах | `await cube.monthDuration()` |
| `rarityBonusBps(key)` | Бонус редкости по ключу | `await cube.rarityBonusBps("legendary")` |
| `nftState(tokenId)` | Состояние NFT | `await cube.nftState(1337)` |
| `monthlyRewardPool()` | Размер месячного пула | `await cube.monthlyRewardPool()` |
| `totalLockedForRewards()` | Размер заблокированного пула | `await cube.totalLockedForRewards()` |

## 7. Несуществующие методы (НЕ ВЫЗЫВАЙТЕ!)

❌ `setRarityBonus()` - НЕТ в контракте (есть только с ключом!)
❌ `setPingInterval()` - НЕТ (используйте `configureTimings`)  
❌ `setMonthDuration()` - НЕТ (используйте `configureMonthDuration`)
❌ `setBreedCost()` - НЕТ (используйте `setBreedCostBps`)

**Правильные методы:**
✅ `setRarityBonus(string key, uint256 bps)` 
✅ `configureTimings(ping, maxAcc, breed, grave)`
✅ `configureMonthDuration(seconds)`
✅ `setBreedCostBps(bps)`

## 8. Полезные утилиты

```ts
// Форматирование времени
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}ч ${minutes}м ${remainingSeconds}с`;
  } else if (minutes > 0) {
    return `${minutes}м ${remainingSeconds}с`;
  } else {
    return `${remainingSeconds}с`;
  }
}

// Форматирование basis points
function formatBps(bps: number): string {
  return `${bps / 100}%`;
}

// Форматирование CRA с локализацией
function formatCRA(amountWei: bigint): string {
  return Number(ethers.formatEther(amountWei)).toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

// Проверка времени до события
function getTimeUntil(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = timestamp - now;
  
  if (diff <= 0) {
    return "Доступно сейчас";
  }
  
  return `Через ${formatDuration(diff)}`;
}
```

## 9. Контракт адреса (ApeChain)

```ts
// Основные адреса
const GAME_ADDRESS = "0x7dFb75F1000039D650A4C2B8a068f53090e857dD";
const NFT_ADDRESS = "0x..."; // Адрес NFT контракта
const CRA_ADDRESS = "0x..."; // Адрес CRA токена
const ENTROPY_ADDRESS = "0x..."; // Адрес Entropy Oracle

// RPC
const RPC_URL = "https://rpc.apechain.com";
```

---

**Этот README создан для проекта Crazy Cube Ultimate 3 - версия Safe с улучшенной безопасностью и диагностикой.**
