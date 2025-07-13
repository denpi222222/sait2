import { NextResponse } from 'next/server'

// GeckoTerminal API for specific CRA pool on ApeChain
const GECKO_TERMINAL_API = 'https://api.geckoterminal.com/api/v2'
const CRA_TOKEN_ADDRESS = '0x0A5b48dB89Bf94466464DE3e70F9c86aa27b9495'
const CRA_POOL_ADDRESS = '0xc9c2f86e542620daf12107d4b6eda37936efb903'
const APECHAIN_NETWORK = 'apechain'

interface GeckoPoolData {
  id: string
  type: string
  attributes: {
    name: string
    address: string
    base_token_price_usd: string
    quote_token_price_usd: string
    base_token_price_native_currency: string
    quote_token_price_native_currency: string
    pool_created_at: string
    fdv_usd: string
    market_cap_usd: string
    price_change_percentage: {
      h1: string
      h6: string
      h24: string
    }
    transactions: {
      h1: {
        buys: number
        sells: number
        buyers: number
        sellers: number
      }
      h6: {
        buys: number
        sells: number
        buyers: number
        sellers: number
      }
      h24: {
        buys: number
        sells: number
        buyers: number
        sellers: number
      }
    }
    volume_usd: {
      h1: string
      h6: string
      h24: string
    }
    reserve_in_usd: string
  }
  relationships: {
    base_token: {
      data: {
        id: string
        type: string
      }
    }
    quote_token: {
      data: {
        id: string
        type: string
      }
    }
  }
}

interface GeckoTokenData {
  id: string
  type: string
  attributes: {
    address: string
    name: string
    symbol: string
    image_url: string
    coingecko_coin_id: string
    decimals: number
    total_supply: string
  }
}

interface CRATokenInfo {
  price_usd: number
  price_ape: number
  price_change_24h: number
  price_change_1h: number
  price_change_6h: number
  volume_24h: number
  market_cap: number
  fdv: number
  total_supply: string
  pool_address: string
  pool_reserves_usd: number
  transactions_24h: {
    buys: number
    sells: number
    buyers: number
    sellers: number
  }
  pool_created_at: string
  last_updated: string
}

export async function GET() {
  try {
    console.log('🦎 Fetching CRA data from GeckoTerminal...')
    
    // Get pool data
    const poolResponse = await fetch(
      `${GECKO_TERMINAL_API}/networks/${APECHAIN_NETWORK}/pools/${CRA_POOL_ADDRESS}?include=base_token,quote_token`,
      {
        // Use built-in Data Cache from Next.js, which reliably works in serverless
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 60 } // Cache for 60 seconds
      }
    )

    if (!poolResponse.ok) {
      // Log error with details for debugging
      const errorBody = await poolResponse.text()
      console.error(`GeckoTerminal API error: ${poolResponse.status}`, { errorBody })
      // Throw error to catch block and return fallback data
      throw new Error(`Failed to fetch from GeckoTerminal API with status: ${poolResponse.status}`)
    }

    const poolData = await poolResponse.json()
    const pool: GeckoPoolData = poolData.data
    const baseToken: GeckoTokenData = poolData.included?.find((item: any) => item.type === 'token' && item.id.includes('cra')) || poolData.included?.[0]
    const quoteToken: GeckoTokenData = poolData.included?.find((item: any) => item.type === 'token' && !item.id.includes('cra')) || poolData.included?.[1]

    console.log('📊 Pool data:', {
      name: pool.attributes.name,
      baseToken: baseToken?.attributes.symbol,
      quoteToken: quoteToken?.attributes.symbol,
      priceUSD: pool.attributes.base_token_price_usd
    })

    // Data parsing
    const craInfo: CRATokenInfo = {
      price_usd: parseFloat(pool.attributes.base_token_price_usd || '0'),
      price_ape: parseFloat(pool.attributes.base_token_price_native_currency || '0'),
      price_change_24h: parseFloat(pool.attributes.price_change_percentage.h24 || '0'),
      price_change_1h: parseFloat(pool.attributes.price_change_percentage.h1 || '0'),
      price_change_6h: parseFloat(pool.attributes.price_change_percentage.h6 || '0'),
      volume_24h: parseFloat(pool.attributes.volume_usd.h24 || '0'),
      market_cap: parseFloat(pool.attributes.market_cap_usd || '0'),
      fdv: parseFloat(pool.attributes.fdv_usd || '0'),
      total_supply: baseToken?.attributes.total_supply || '0',
      pool_address: pool.attributes.address,
      pool_reserves_usd: parseFloat(pool.attributes.reserve_in_usd || '0'),
      transactions_24h: {
        buys: pool.attributes.transactions.h24.buys,
        sells: pool.attributes.transactions.h24.sells,
        buyers: pool.attributes.transactions.h24.buyers,
        sellers: pool.attributes.transactions.h24.sellers
      },
      pool_created_at: pool.attributes.pool_created_at,
      last_updated: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: craInfo,
      source: 'GeckoTerminal',
      pool_url: `https://www.geckoterminal.com/apechain/pools/${CRA_POOL_ADDRESS}`
    })

  } catch (error: any) {
    console.error('❌ Error fetching CRA data:', error)
    
    // Return fallback data in case of error
    return NextResponse.json({
      success: false,
      error: error.message,
      data: {
        price_usd: 0,
        price_ape: 0,
        price_change_24h: 0,
        price_change_1h: 0,
        price_change_6h: 0,
        volume_24h: 0,
        market_cap: 0,
        fdv: 0,
        total_supply: '0',
        pool_address: CRA_POOL_ADDRESS,
        pool_reserves_usd: 0,
        transactions_24h: {
          buys: 0,
          sells: 0,
          buyers: 0,
          sellers: 0
        },
        pool_created_at: '',
        last_updated: new Date().toISOString()
      }
    })
  }
}
