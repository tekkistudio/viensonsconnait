// src/lib/env.ts
const isServer = typeof window === 'undefined';

function validateServerEnv() {
  const required = [
    'OPENAI_API_KEY',
    'BICTORYS_WEBHOOK_SECRET',
    'STRIPE_SECRET_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(
      `Warning: Les variables d'environnement serveur suivantes sont manquantes :\n` +
      missing.map(key => `  - ${key}`).join('\n')
    );
  }
}

function validateClientEnv() {
  const required = [
    'NEXT_PUBLIC_BICTORYS_API_KEY',
    'NEXT_PUBLIC_STRIPE_KEY',
    'NEXT_PUBLIC_API_URL'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(
      `Warning: Les variables d'environnement client suivantes sont manquantes :\n` +
      missing.map(key => `  - ${key}`).join('\n')
    );
  }
}

// Valider les variables d'environnement au démarrage
if (isServer) {
  validateServerEnv();
} else {
  validateClientEnv();
}

export const env = {
  OPENAI_API_KEY: isServer ? process.env.OPENAI_API_KEY : undefined,
  BICTORYS_WEBHOOK_SECRET: isServer ? process.env.BICTORYS_WEBHOOK_SECRET : undefined,
  NEXT_PUBLIC_BICTORYS_API_KEY: process.env.NEXT_PUBLIC_BICTORYS_API_KEY,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  // ... ajoutez d'autres variables selon les besoins
} as const;