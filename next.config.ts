import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // {
      //   protocol: 'http',
      //   hostname: 'relojes-bv-beni-api.onrender.com',
      //   pathname: '/uploads/**',
      // },
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
