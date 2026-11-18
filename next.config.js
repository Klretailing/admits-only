const path = require('path');

/* ──────────────────────────────────────────────────────────────────────
   Security headers, sent with every response.

   Strict-Transport-Security  browsers only ever use HTTPS for this site,
                              for two years, including subdomains.
   Content-Security-Policy    which sources may run code, load frames, or be
                              contacted. Scripts: this site and PayPal's SDK
                              (checkout) only; Vercel's toolbar appears on
                              preview deployments. No plugins, no framing of
                              this site by others (clickjacking), and forms
                              can only post back here.
   X-Frame-Options            the same anti-framing rule for older browsers.
   X-Content-Type-Options     no MIME sniffing.
   Referrer-Policy            other sites see only our origin, never full
                              URLs (which can carry ids).
   Permissions-Policy         no camera, microphone or location access.
   Cross-Origin-Opener-Policy isolates this window from other origins while
                              still allowing PayPal's checkout popup.
   API responses are also marked no-store, so personal data is never cached
   by a browser or a shared proxy.

   'unsafe-inline' for scripts is needed by the theme script that prevents
   a flash of the wrong theme, and by Next.js's inline bootstrap. Moving to
   nonces would let it go; until then the policy still blocks every
   external script that isn't listed below.
   ────────────────────────────────────────────────────────────────────── */

const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://www.paypal.com https://*.paypal.com https://*.paypalobjects.com https://vercel.live`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://www.paypal.com https://*.paypal.com https://vercel.live wss://*.pusher.com",
  "frame-src 'self' https://www.paypal.com https://*.paypal.com https://vercel.live",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }] },
    ];
  },
  // Browsers and crawlers still ask for /favicon.ico by default.
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/favicon.svg' }];
  },
};

module.exports = nextConfig;
