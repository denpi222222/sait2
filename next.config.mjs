/**
 * @type {import('next').NextConfig}
 */

import path from 'path'

// Define Enhanced Content Security Policy for Web3 DApp with Trusted Types
// Different policies for development and production
const isDevelopment = process.env.NODE_ENV === 'development'

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' ${isDevelopment ? "'unsafe-eval' 'unsafe-inline'" : ""} https://cdn.jsdelivr.net https://unpkg.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https: wss:;
  media-src 'self' https: data: blob:;
  frame-src 'self' https://*.walletconnect.org https://*.walletconnect.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  ${isDevelopment ? "" : "require-trusted-types-for 'script';"}
  ${isDevelopment ? "" : "upgrade-insecure-requests;"}
`.replace(/\s{2,}/g, ' ').trim()

// Production-only report policy (no upgrade-insecure-requests in report-only)
const ReportOnlyPolicy = `
  default-src 'self';
  script-src 'self' https://cdn.jsdelivr.net https://unpkg.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https: wss:;
  media-src 'self' https: data: blob:;
  frame-src 'self' https://*.walletconnect.org https://*.walletconnect.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  require-trusted-types-for 'script';
`.replace(/\s{2,}/g, ' ').trim()

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

    // Only add report-only policy in production to avoid 429 errors in development
    if (!isDevelopment) {
      headers.push({
        key: 'Content-Security-Policy-Report-Only',
        value: `${ReportOnlyPolicy} report-uri https://crazycube.report-uri.com/r/d/csp/reportOnly;`,
      })
    }

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