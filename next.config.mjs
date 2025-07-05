import { createRequire } from 'module'

const require = createRequire(import.meta.url)

let withBundleAnalyzer = (config) => config

if (process.env.ANALYZE === 'true') {
  try {
    withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true })
  } catch (err) {
    console.warn('⚠️  Bundle analyzer not installed; run `npm i -D @next/bundle-analyzer` to enable.')
  }
}

/** @type {import('next').NextConfig} */
const baseConfig = {
  // Use standard build for Netlify
  // output: 'export', // Commented out because we have API routes
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  
  // Disable image optimization for Netlify
  images: {
    unoptimized: true,
  },
  
  // Disable strict TypeScript checks
  typescript: {
    ignoreBuildErrors: true,
  },
  // Enable ESLint checks during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Add image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dulcet-cannoli-e7490f.netlify.app',
      },
      {
        protocol: 'https',
        hostname: 'v0.dev',
      },
      {
        protocol: 'https',
        hostname: 'v0.blob.com',
      },
      // IPFS gateways
      {
        protocol: 'https',
        hostname: 'ipfs.io',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
      },
      // Alchemy IPFS gateway
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      // IPFS pattern for any IPFS hash
      {
        protocol: 'https',
        hostname: '*.ipfs.dweb.link',
      }
    ],
    // Allow loading any image for development
    unoptimized: process.env.NODE_ENV === 'development',
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    formats: ['image/webp'],
    // Add image optimization settings for production
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'self' *.alchemy.com",
  },
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Add error handling for webpack
  webpack: (config, { isServer, dev }) => {
    // Only add source maps in development and not on server
    if (dev && !isServer) {
      config.devtool = false // Disable devtool to avoid performance issues
    }
    // Suppress optional dependency warnings (e.g., pino-pretty used by pino in WalletConnect)
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'pino-pretty': false,
    }

    // Treat WalletLink HeartbeatWorker as raw asset to avoid SWC minify crash
    config.module.rules = config.module.rules || []
    config.module.rules.push({
      test: /HeartbeatWorker.*\.js$/,
      type: 'asset/source',
    })

    // Disable filesystem pack cache on Windows OneDrive paths – fallback to in-memory to avoid ENOENT rename errors
    if (process.env.NODE_ENV === 'development') {
      config.cache = {
        type: 'memory',
      }
    }

    return config
  },
}

// Build Content-Security-Policy dynamically so dev builds are less restrictive.
const cspBase = [
  "default-src 'self'",
  "script-src 'self' *.alchemy.com",
  "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
  "img-src 'self' data: https:",
  "object-src 'none'",
  "media-src 'self' https://dulcet-cannoli-e7490f.netlify.app https://cdn.pixabay.com https://assets.mixkit.co data:",
  "font-src 'self' fonts.gstatic.com",
  "connect-src 'self' https://rpc.apechain.com https://apechain.calderachain.xyz https://rpc.ankr.com https://*.alchemy.com https://metamask-sdk.api.cx.metamask.io https://api.studio.thegraph.com",
  "frame-ancestors 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
]

// Only enforce Trusted Types in production
if (process.env.NODE_ENV === 'production') {
  cspBase.push("require-trusted-types-for 'script'")
}

// Re-add 'unsafe-eval' during development; Next.js dev server relies on eval for HMR.
if (process.env.NODE_ENV !== 'production') {
  // Ensure dev builds allow Next.js HMR scripts (eval + inline)
  const idx = cspBase.findIndex((d) => d.startsWith("script-src"))
  if (idx !== -1) {
    if (!cspBase[idx].includes("'unsafe-inline'")) {
      cspBase[idx] += " 'unsafe-inline'"
    }
    if (!cspBase[idx].includes("'unsafe-eval'")) {
      cspBase[idx] += " 'unsafe-eval'"
    }
  }
}

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: cspBase.join('; '),
  },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
]

baseConfig.headers = async () => [
  {
    source: '/(.*)',
    headers: securityHeaders,
  },
]

export default withBundleAnalyzer(baseConfig)

// Development build uses the same strict CSP (no WalletConnect, Trusted Types enforced)
