// src/lib/config/index.ts
export const config = {
    api: {
      url: process.env.NEXT_PUBLIC_API_URL,
      env: process.env.NODE_ENV === 'production' ? 'production' : 'development'
    },
    bictorys: {
      apiKey: process.env.NEXT_PUBLIC_BICTORYS_API_KEY,
      webhookSecret: process.env.BICTORYS_WEBHOOK_SECRET,
      apiUrl: process.env.NEXT_PUBLIC_BICTORYS_API_URL || 'https://api.test.bictorys.com',
      jsUrl: process.env.NEXT_PUBLIC_BICTORYS_JS_URL
    },
    stripe: {
      publicKey: process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_STRIPE_LIVE_KEY 
        : process.env.NEXT_PUBLIC_STRIPE_KEY,
      secretKey: process.env.NODE_ENV === 'production'
        ? process.env.STRIPE_LIVE_SECRET_KEY
        : process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.NODE_ENV === 'production'
        ? process.env.STRIPE_LIVE_WEBHOOK_SECRET
        : process.env.STRIPE_WEBHOOK_SECRET
    },
    pusher: {
      appId: process.env.PUSHER_APP_ID,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    }
  };
  
  // Validation des configurations requises
  const requiredConfigs = {
    'NEXT_PUBLIC_BICTORYS_API_KEY': config.bictorys.apiKey,
    'BICTORYS_WEBHOOK_SECRET': config.bictorys.webhookSecret,
    'NEXT_PUBLIC_STRIPE_KEY': config.stripe.publicKey,
    'STRIPE_SECRET_KEY': config.stripe.secretKey
  };
  
  Object.entries(requiredConfigs).forEach(([key, value]) => {
    if (!value) {
      console.error(`Configuration manquante : ${key}`);
    }
  });