import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Replaced deprecated `domains` with `remotePatterns`
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
    ],
  },
};

export default nextConfig;
