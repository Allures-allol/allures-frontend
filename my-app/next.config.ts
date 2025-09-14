import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bcxrmegesyvkbpzvljpc.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.alluresallol.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'hotline.ua',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',           // фронт дергает /api/...
        destination: 'https://api.alluresallol.com/product/:path*', // проксируем на /product
      },
    ];
  },
};

export default nextConfig;
