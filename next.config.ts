import type { NextConfig } from 'next';
import type { Configuration as WebpackConfig } from 'webpack';

const nextConfig: NextConfig = {
  webpack: (config: WebpackConfig): WebpackConfig => {
    // Prevent errors when packages try to import Node.js built-ins on client-side
    // (common with three.js, @react-three/fiber, postprocessing, etc.)
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        path: false,
        // Add more fallbacks here only if you get new "Module not found" errors in browser
        // e.g. stream: false, crypto: false
      },
    };

    return config;
  },

  reactStrictMode: true,

  images: {
    // Modern & secure way (domains is deprecated since Next.js 14+)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      // Add more hostnames here as needed, e.g.:
      // {
      //   protocol: 'https',
      //   hostname: 'images.unsplash.com',
      // },
    ],
  },

  // Optional: good security defaults
  // poweredByHeader: false,
  // compress: true,
};

export default nextConfig;
