// src/lib/config/index.ts
const isServer = typeof window === 'undefined';

export const config = {
  api: {
    url: process.env.NEXT_PUBLIC_API_URL,
    env: process.env.NODE_ENV === 'production' ? 'production' : 'development'
  },
  openai: {
    apiKey: isServer ? process.env.OPENAI_API_KEY : undefined,
    debug: process.env.OPENAI_DEBUG === 'true'
  },
  bictorys: {
    apiKey: process.env.NEXT_PUBLIC_BICTORYS_API_KEY,
    webhookSecret: isServer ? process.env.BICTORYS_WEBHOOK_SECRET : undefined,
    apiUrl: process.env.NEXT_PUBLIC_BICTORYS_API_URL || 'https://api.test.bictorys.com',
    jsUrl: process.env.NEXT_PUBLIC_BICTORYS_JS_URL
  },
  stripe: {
    publicKey: process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_STRIPE_LIVE_KEY 
      : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    secretKey: isServer 
      ? (process.env.NODE_ENV === 'production'
        ? process.env.STRIPE_LIVE_SECRET_KEY
        : process.env.STRIPE_SECRET_KEY) 
      : undefined,
    webhookSecret: isServer 
      ? (process.env.NODE_ENV === 'production'
        ? process.env.STRIPE_LIVE_WEBHOOK_SECRET
        : process.env.STRIPE_WEBHOOK_SECRET) 
      : undefined
  }
};

// Validation des configurations uniquement côté serveur
if (isServer) {
  const requiredServerConfigs = {
    'OPENAI_API_KEY': config.openai.apiKey,
    'BICTORYS_WEBHOOK_SECRET': config.bictorys.webhookSecret,
    'STRIPE_SECRET_KEY': config.stripe.secretKey,
  };

  Object.entries(requiredServerConfigs).forEach(([key, value]) => {
    if (!value) {
      console.error(`Configuration manquante : ${key}`);
    }
  });
}

export type Config = typeof config;