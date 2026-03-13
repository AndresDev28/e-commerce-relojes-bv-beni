import type { NextConfig } from 'next'

const nextConfig: NextConfig = {

  async headers() {
    return [
      {
        // Apply these headers to all routes in your application
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://res.cloudinary.com http://127.0.0.1:1337 http://localhost:1337 http://relojes-bv-beni-api.localhost:1355 https://relojes-bv-beni-api.localhost:1355; font-src 'self' data:; connect-src 'self' https://api.stripe.com http://127.0.0.1:1337 http://localhost:1337 http://relojes-bv-beni-api.localhost:1355 https://relojes-bv-beni-api.localhost:1355 https://relojes-bv-beni-api.onrender.com; frame-src 'self' https://js.stripe.com https://hooks.stripe.com;",
          },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '1337',
        pathname: '/uploads/**',
      },
    ],
  },
}

export default nextConfig
