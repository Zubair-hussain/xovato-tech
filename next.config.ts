import type { NextConfig } from "next";
import type { Configuration as WebpackConfig } from "webpack"; // ← This fixes the type error

const nextConfig: NextConfig = {
  // Turbopack config is now TOP-LEVEL (not experimental) in Next.js 16
  // Comment this out or remove if you want to use Turbopack (default in Next.js 16)
  // turbopack: {
  //   // your turbopack options here if needed
  // },

  // Recommended: force Webpack in dev (most stable for three.js + postprocessing right now)
  // Remove or comment this line later when Turbopack becomes more reliable for your project
  // (you can also use `next dev --webpack` instead of this config)
  webpack: (config: WebpackConfig): WebpackConfig => {
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        path: false,
      },
    };

    return config;
  },

  // Other useful options
  reactStrictMode: true,

  images: {
    domains: ["picsum.photos"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default nextConfig;