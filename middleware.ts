import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory sliding window rate limiter (no external services or keys required)
const requestTimestamps = new Map<string, number[]>();

const botPatterns = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /headless/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /postman/i,
  /insomnia/i,
];

export function middleware(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || '';

  // Bot detection
  const isBot = botPatterns.some(pattern => pattern.test(userAgent));
  const limit = isBot ? 15 : 100; // Stricter limit for bots, 100 for users
  const windowMs = 60 * 1000; // 1 minute

  const now = Date.now();
  const timestamps = requestTimestamps.get(ip) || [];

  // Remove timestamps older than the window
  const relevantTimestamps = timestamps.filter(ts => now - ts < windowMs);

  // Check if the limit is exceeded
  if (relevantTimestamps.length >= limit) {
    return new NextResponse('Too many requests.', { status: 429 });
  }

  // Add the current timestamp and update the store
  relevantTimestamps.push(now);
  requestTimestamps.set(ip, relevantTimestamps);

  const response = NextResponse.next();

  // Enhanced security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // Enhanced, environment-aware Content Security Policy
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Define trusted domains
  const trustedDomains = [
    'https://*.netlify.app',
    'https://*.alchemy.com',
    'https://*.walletconnect.com',
    'https://*.apechain.com',
    'https://*.opensea.io',
    'https://*.magiceden.io',
    'https://*.ipfs.io',
    'https://*.ipfs.dweb.link',
    'https://*.gateway.pinata.cloud',
  ];

  const scriptSrc = [
    `'self'`,
    ...trustedDomains,
    `https://www.google.com/recaptcha/`,
    `https://www.gstatic.com/recaptcha/`,
    `https://cdn.jsdelivr.net`,
    `https://unpkg.com`,
    `https://*.metamask.io`,
    `https://*.walletconnect.org`,
    `https://*.walletconnect.com`,
    `https://*.rainbow.me`,
    `https://*.coinbase.com`,
    `https://*.trustwallet.com`,
  ];

  const styleSrc = [
    `'self'`,
    `'unsafe-inline'`, // Required for dynamic styles
    `https://fonts.googleapis.com`,
    `https://cdn.jsdelivr.net`,
    `https://unpkg.com`,
    ...trustedDomains,
  ];

  const imgSrc = [
    `'self'`,
    `data:`,
    `blob:`,
    `https:`,
    ...trustedDomains,
    `https://*.ipfs.io`,
    `https://*.ipfs.dweb.link`,
    `https://*.gateway.pinata.cloud`,
  ];

  const connectSrc = [
    `'self'`,
    `https:`,
    `wss:`,
    `ws:`,
    ...trustedDomains,
    `https://*.alchemy.com`,
    `https://*.walletconnect.com`,
    `https://*.walletconnect.org`,
    `https://*.apechain.com`,
    `https://*.metamask.io`,
    `https://*.rainbow.me`,
    `https://*.coinbase.com`,
    `https://*.trustwallet.com`,
    `https://*.infura.io`,
    `https://*.quicknode.com`,
    `https://api.web3modal.org`,
    `https://pulse.walletconnect.org`,
    `https://cloud.reown.com`,
  ];

  // Loosen policy for development environment
  if (isDevelopment) {
    scriptSrc.push(`'unsafe-eval'`);
    scriptSrc.push(`'unsafe-inline'`);
    connectSrc.push(`http:`);
    connectSrc.push(`ws:`);
  } else {
    // For production, не добавляем 'unsafe-inline' и 'unsafe-eval' (используем nonce через Netlify)
    // scriptSrc.push(`'unsafe-inline'`); // УДАЛЕНО
  }

  const cspHeader = [
    `default-src 'self'`,
    `script-src ${scriptSrc.join(' ')}`,
    `style-src ${styleSrc.join(' ')}`,
    `img-src ${imgSrc.join(' ')}`,
    `font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://unpkg.com`,
    `connect-src ${connectSrc.join(' ')}`,
    `media-src 'self' https: data: blob:`,
    `frame-src 'self' https://www.google.com/recaptcha/ https://*.walletconnect.com https://*.walletconnect.org https://*.metamask.io https://*.rainbow.me https://*.coinbase.com https://*.trustwallet.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
    // `report-uri /api/csp-report`, // УДАЛЕНО, Edge-плагин сам логирует
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Request-ID', crypto.randomUUID());

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
