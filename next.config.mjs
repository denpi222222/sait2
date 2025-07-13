/**
 * @type {import('next').NextConfig}
 */

import path from 'path'

// Define Enhanced Content Security Policy for Web3 DApp - DEVELOPMENT MODE
// Allow unsafe-inline and unsafe-eval for development and Web3 functionality
const isDevelopment = process.env.NODE_ENV === 'development'

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://api.web3modal.org https://pulse.walletconnect.org https://relay.walletconnect.org https://registry.walletconnect.org;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob: http: https://api.web3modal.org https://imagedelivery.net;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https: wss: http: https://api.web3modal.org https://pulse.walletconnect.org https://registry.walletconnect.org https://relay.walletconnect.org wss://relay.walletconnect.org;
  media-src 'self' https: data: blob:;
  frame-src 'self' https://*.walletconnect.org https://*.walletconnect.com https://secure.walletconnect.org;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  worker-src 'self' blob:;
  child-src 'self' blob: https://*.walletconnect.org;
`.replace(/\s{2,}/g, ' ').trim()

// CSP configured for Web3 DApp with inline scripts allowed

const nextConfig = {
  reactStrictMode: true,
  
  // Deduplicate lit library to avoid multiple versions in bundle
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
  },
  
  // Режим для правильной работы с API маршрутами
  output: 'standalone',
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.ipfs.dweb.link',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'nft-cdn.alchemy.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'nftstorage.link',
        port: '',
        pathname: '/**',
      },
    ],
    // Disable optimization for faster loading from public IPFS gateways
    unoptimized: true,
  },
  
  // Add enhanced security headers with monitoring
  async headers() {
    const headers = [
      {
        key: 'Content-Security-Policy',
        value: ContentSecurityPolicy,
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      },
    ]

    // DISABLE report-only policy to avoid CSP conflicts
    // Report-only disabled to prevent inline script blocking
    console.log('🚫 CSP Report-Only disabled for Web3 compatibility')

    return [
      {
        source: '/:path*',
        headers,
      },
    ]
  },

  webpack(config) {
    // Ensure only one version of lit is bundled
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Force a single copy of lit in the bundle.
      lit: path.resolve(process.cwd(), 'node_modules/lit')
    }
    return config
  },

  // --- ВКЛЮЧАЕМ СТРОГУЮ ПРОВЕРКУ ТИПОВ ДЛЯ СТАБИЛЬНОСТИ ---
  typescript: {
    // Включаем проверку ошибок TypeScript для стабильности
    ignoreBuildErrors: false,
  },
  eslint: {
    // Включаем ESLint проверки для выявления ошибок
    ignoreDuringBuilds: false,
  },
}

export default nextConfig