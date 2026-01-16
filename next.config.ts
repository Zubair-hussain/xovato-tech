import type { NextConfig } from 'next';
import type { Configuration as WebpackConfig } from 'webpack';

const nextConfig: NextConfig = {
  webpack: (config: WebpackConfig): WebpackConfig => {
    // Prevent client-side errors when packages import Node.js built-ins
    // Required for three.js, @react-three/fiber, postprocessing, canvas libs, etc.
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        path: false,
        // Uncomment/add more only if new browser errors appear (rare):
        // stream: false,
        // crypto: false,
      },
    };

    return config;
  },

  reactStrictMode: true,

  images: {
    // Modern, secure configuration (domains deprecated since Next.js 14+)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      // Add more patterns here as your app needs them, e.g.:
      // {
      //   protocol: 'https',
      //   hostname: 'images.unsplash.com',
      // },
    ],
  },

  // Optional security/performance tweaks (uncomment if you want them later)
  // poweredByHeader: false,   // Removes X-Powered-By header
  // compress: true,           // Enables gzip/brotli (default true in most cases)
};

export default nextConfig;
