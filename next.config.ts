import type { NextConfig } from "next";
import type { Configuration as WebpackConfig } from "webpack";

const nextConfig: NextConfig = {
  // Désactiver la compression temporairement pour déboguer
  compress: false,
  
  // Configuration des images
  images: {
    domains: ['localhost'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },

  // Configuration webpack
  webpack: (config: WebpackConfig, { dev, isServer }): WebpackConfig => {
    if (dev && !isServer) {
      config.watchOptions = {
        ...(config.watchOptions || {}),
        ignored: /node_modules/,
        poll: 1000,
      };
    }
    return config;
  },

  // Configuration du serveur HTTP
  httpAgentOptions: {
    keepAlive: true,
  },

  // Configuration des en-têtes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },

  // Configuration expérimentale
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;