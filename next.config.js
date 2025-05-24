// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configuration des images
  images: {
    domains: ['localhost', 'res.cloudinary.com'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: `/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/**`,
      },
    ],
  },
  // Configuration webpack
  webpack: (config, { dev, isServer }) => {
    // Configuration de développement
    if (dev && !isServer) {
      config.watchOptions = {
        ...(config.watchOptions || {}),
        ignored: /node_modules/,
        poll: 1000,
      };
    }
    // Gestion des modules Node côté client
    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve?.fallback,
          fs: false,
          net: false,
          tls: false,
        },
      };
    }
    return config;
  },
  // Configuration du serveur HTTP
  httpAgentOptions: {
    keepAlive: true,
  },
  // Configuration des en-têtes et des rewrites
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
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,DELETE,PATCH,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-API-Key, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/bictorys/:path*',
        destination: `${process.env.NEXT_PUBLIC_BICTORYS_API_URL}/:path*`
      }
    ];
  },
  // Variables d'environnement publiques
  env: {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    // Configuration Stripe
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_STRIPE_KEY: process.env.NEXT_PUBLIC_STRIPE_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    // Configuration Stripe Live
    STRIPE_LIVE_SECRET_KEY: process.env.STRIPE_LIVE_SECRET_KEY,
    NEXT_PUBLIC_STRIPE_LIVE_KEY: process.env.NEXT_PUBLIC_STRIPE_LIVE_KEY,
    STRIPE_LIVE_WEBHOOK_SECRET: process.env.STRIPE_LIVE_WEBHOOK_SECRET,
    // Configuration Bictorys
    NEXT_PUBLIC_BICTORYS_API_URL: process.env.NEXT_PUBLIC_BICTORYS_API_URL,
    NEXT_PUBLIC_BICTORYS_API_KEY: process.env.NEXT_PUBLIC_BICTORYS_API_KEY,
  },
  // Configuration expérimentale
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

module.exports = nextConfig;