import axios from 'axios'

const CRA_ADDR  = '0x0A5b48dB89Bf94466464DE3e70F9c86aa27b9495'.toLowerCase()
const APE_ADDR  = '0x4d224452801ACEd8B2F0aEBE155379bb5d594381'.toLowerCase()
const COLL_ADDR = '0x606a47707d5aEdaE9f616A6f1853fE3075bA740B'.toLowerCase()

const RES_URL = `https://api-apechain.reservoir.tools/tokens/floor/v1?contract=${COLL_ADDR}`
const DS_URL  = (addr: string) => `https://api.dexscreener.com/latest/dex/tokens/${addr}`

// Try different CRA pool endpoints
const GECKO_POOLS = [
  'https://api.geckoterminal.com/api/v2/networks/apechain/tokens/0x0A5b48dB89Bf94466464DE3e70F9c86aa27b9495',
  'https://api.geckoterminal.com/api/v2/networks/apechain/pools/0x76644c1F52e92c885e7e30C5D4892A42b1ef4d8a'
]

export async function fetchFloorApe() {
  try {
    const config = {
      timeout: 15000,
      ...(process.env.RESERVOIR_API_KEY && { 
        headers: { 'x-api-key': String(process.env.RESERVOIR_API_KEY) } 
      })
    }
    const { data } = await axios.get(RES_URL, config)
    const prices: number[] = Object.values(data.tokens || {}).map(Number).filter(Boolean)
    if (!prices.length) throw new Error('No floor data')
    return Math.min(...prices)
  } catch (error: any) {
    console.warn('Failed to fetch floor price from Reservoir, using fallback')
    return 0.25 // fallback floor price
  }
}

export async function fetchCRAPriceUsd() {
  // Try each GeckoTerminal endpoint
  for (const url of GECKO_POOLS) {
    try {
      console.log(`🦎 Trying GeckoTerminal: ${url}`)
      const { data } = await axios.get(url, { timeout: 8000 })
      
      let priceUsd = null
      
      // Handle token endpoint response
      if (data?.data?.attributes?.price_usd) {
        priceUsd = data.data.attributes.price_usd
        console.log(`🦎 CRA price from GeckoTerminal token endpoint: ${priceUsd}`)
      }
      // Handle pool endpoint response  
      else if (data?.data?.attributes?.token_price_usd) {
        priceUsd = data.data.attributes.token_price_usd
        console.log(`🦎 CRA price from GeckoTerminal pool endpoint: ${priceUsd}`)
      }
      // Handle multiple pools response
      else if (data?.data?.[0]?.attributes?.token_price_usd) {
        priceUsd = data.data[0].attributes.token_price_usd
        console.log(`🦎 CRA price from GeckoTerminal pools array: ${priceUsd}`)
      }
      
      if (priceUsd && !isNaN(Number(priceUsd))) {
        return Number(priceUsd)
      }
    } catch (error: any) {
      console.warn(`GeckoTerminal endpoint failed: ${url}`, error.message)
      continue
    }
  }

  // Fallback to DexScreener
  try {
    console.log('📊 Trying DexScreener fallback...')
    const { data } = await axios.get(DS_URL(CRA_ADDR), { timeout: 15000 })
    const p = data?.pairs?.[0]?.priceUsd ?? data?.pairs?.[0]?.priceUSD
    if (!p) throw new Error('No price data from DexScreener')
    console.log('📊 CRA price from DexScreener:', p)
    return Number(p)
  } catch (dsError: any) {
    console.error('DexScreener also failed:', dsError.message)
    
    // Final fallback - use static price
    console.log('💰 Using fallback CRA price')
    return 0.0000006 // Static fallback price
  }
}

export async function fetchTokenPriceUsd(addr: string) {
  try {
    const { data } = await axios.get(DS_URL(addr), { timeout: 15000 })
    const p = data?.pairs?.[0]?.priceUsd ?? data?.pairs?.[0]?.priceUSD
    if (!p) throw new Error('No price data')
    return Number(p)
  } catch (error: any) {
    console.warn(`Failed to fetch price for ${addr}:`, error.message)
    if (addr.toLowerCase() === APE_ADDR.toLowerCase()) {
      return 1.2 // fallback APE price
    }
    throw error
  }
}

export async function fetchMarketData() {
  try {
    const [floorApe, craUsd, apeUsd] = await Promise.all([
      fetchFloorApe(),
      fetchCRAPriceUsd(), 
      fetchTokenPriceUsd(APE_ADDR)
    ])
    
    const floorCra = floorApe * apeUsd / craUsd
    const floorUsd = floorApe * apeUsd
    
    console.log('📊 Final market data:', { 
      floorApe: floorApe.toFixed(4), 
      craUsd: craUsd.toFixed(10), 
      apeUsd: apeUsd.toFixed(4), 
      floorCra: floorCra.toFixed(0),
      floorUsd: floorUsd.toFixed(2) 
    })
    
    return { 
      floorApe: Number(floorApe.toFixed(4)), 
      craUsd: Number(craUsd.toFixed(10)), 
      apeUsd: Number(apeUsd.toFixed(2)), 
      floorCra: Number(floorCra.toFixed(0)),
      floorUsd: Number(floorUsd.toFixed(2))
    }
  } catch (error: any) {
    console.error('Market data fetch failed:', error.message)
    
    // Return fallback data instead of throwing
    console.log('📊 Using fallback market data')
    return {
      floorApe: 0.25,
      craUsd: 0.0000006,
      apeUsd: 1.2,
      floorCra: 500,
      floorUsd: 0.3
    }
  }
} 