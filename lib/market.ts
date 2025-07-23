import axios from 'axios';

const CRAA_ADDR = '0xBb526D657Cc1Ba772469A6EC96AcB2ed9D2A93e5'.toLowerCase();
const APE_ADDR = '0x4d224452801ACEd8B2F0aEBE155379bb5d594381'.toLowerCase();
const COLL_ADDR = '0x606a47707d5aEdaE9f616A6f1853fE3075bA740B'.toLowerCase();

const RES_URL = `https://api-apechain.reservoir.tools/tokens/floor/v1?contract=${COLL_ADDR}`;
const DS_URL = (addr: string) =>
  `https://api.dexscreener.com/latest/dex/tokens/${addr}`;

// Try different CRAA pool endpoints
const GECKO_POOLS = [
  'https://api.geckoterminal.com/api/v2/networks/apechain/tokens/0xBb526D657Cc1Ba772469A6EC96AcB2ed9D2A93e5',
  'https://api.geckoterminal.com/api/v2/networks/apechain/pools/0x76644c1F52e92c885e7e30C5D4892A42b1ef4d8a',
];

export async function fetchFloorApe() {
  try {
    const config = {
      timeout: 15000,
      ...(process.env.RESERVOIR_API_KEY && {
        headers: { 'x-api-key': String(process.env.RESERVOIR_API_KEY) },
      }),
    };
    const { data } = await axios.get(RES_URL, config);
    const prices: number[] = Object.values(data.tokens || {})
      .map(Number)
      .filter(Boolean);
    if (!prices.length) throw new Error('No floor data');
    return Math.min(...prices);
  } catch {
    return 0.25; // fallback floor price
  }
}

export async function fetchCRAAPriceUsd() {
  // Try each GeckoTerminal endpoint
  for (const url of GECKO_POOLS) {
    try {
      const { data } = await axios.get(url, { timeout: 8000 });

      let priceUsd = null;

      // Handle token endpoint response
      if (data?.data?.attributes?.price_usd) {
        priceUsd = data.data.attributes.price_usd;
      }
      // Handle pool endpoint response
      else if (data?.data?.attributes?.token_price_usd) {
        priceUsd = data.data.attributes.token_price_usd;
      }
      // Handle multiple pools response
      else if (data?.data?.[0]?.attributes?.token_price_usd) {
        priceUsd = data.data[0].attributes.token_price_usd;
      }

      if (priceUsd && !isNaN(Number(priceUsd))) {
        return Number(priceUsd);
      }
    } catch {
      continue;
    }
  }

  // Fallback to DexScreener
  try {
    const { data } = await axios.get(DS_URL(CRAA_ADDR), { timeout: 15000 });
    const p = data?.pairs?.[0]?.priceUsd ?? data?.pairs?.[0]?.priceUSD;
    if (!p) throw new Error('No price data from DexScreener');
    return Number(p);
  } catch {
    // Final fallback - use static price
    return 0.0000006; // Static fallback price
  }
}

export async function fetchTokenPriceUsd(addr: string) {
  try {
    const { data } = await axios.get(DS_URL(addr), { timeout: 15000 });
    const p = data?.pairs?.[0]?.priceUsd ?? data?.pairs?.[0]?.priceUSD;
    if (!p) throw new Error('No price data');
    return Number(p);
  } catch (error) {
    if (addr.toLowerCase() === APE_ADDR.toLowerCase()) {
      return 1.2; // fallback APE price
    }
    throw error;
  }
}

export async function fetchMarketData() {
  try {
    const [floorApe, craaUsd, apeUsd] = await Promise.all([
      fetchFloorApe(),
      fetchCRAAPriceUsd(),
      fetchTokenPriceUsd(APE_ADDR),
    ]);

    const floorCraa = (floorApe * apeUsd) / craaUsd;
    const floorUsd = floorApe * apeUsd;

    return {
      floorApe: Number(floorApe.toFixed(4)),
      craaUsd: Number(craaUsd.toFixed(10)),
      apeUsd: Number(apeUsd.toFixed(2)),
      floorCraa: Number(floorCraa.toFixed(0)),
      floorUsd: Number(floorUsd.toFixed(2)),
    };
  } catch {
    // Return fallback data instead of throwing
    return {
      floorApe: 0.25,
      craaUsd: 0.0000006,
      apeUsd: 1.2,
      floorCraa: 500,
      floorUsd: 0.3,
    };
  }
}
