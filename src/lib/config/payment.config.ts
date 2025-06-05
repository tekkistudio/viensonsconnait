// src/lib/config/payment.config.ts
export const PAYMENT_CONFIG = {
    stripe: {
      publicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      apiVersion: '2024-12-18.acacia' as const
    },
    bictorys: {
      publicKey: process.env.NEXT_PUBLIC_BICTORYS_API_KEY,
      webhookSecret: process.env.BICTORYS_WEBHOOK_SECRET,
      apiUrl: process.env.NEXT_PUBLIC_BICTORYS_API_URL,
      jsUrl: process.env.NEXT_PUBLIC_BICTORYS_JS_URL
    },
    mode: process.env.NODE_ENV === 'production' ? 'live' : 'test'
  } as const;
  
  // Validation séparée pour le client et le serveur
  export function validatePaymentConfig(isServer = false) {
    const missingKeys: string[] = [];
  
    // Vérifications communes (côté client et serveur)
    if (!PAYMENT_CONFIG.stripe.publicKey) missingKeys.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
    if (!PAYMENT_CONFIG.bictorys.publicKey) missingKeys.push('NEXT_PUBLIC_BICTORYS_API_KEY');
    if (!PAYMENT_CONFIG.bictorys.apiUrl) missingKeys.push('NEXT_PUBLIC_BICTORYS_API_URL');
  
    // Vérifications côté serveur uniquement
    if (isServer) {
      if (!PAYMENT_CONFIG.stripe.secretKey) missingKeys.push('STRIPE_SECRET_KEY');
      if (!PAYMENT_CONFIG.stripe.webhookSecret) missingKeys.push('STRIPE_WEBHOOK_SECRET');
      if (!PAYMENT_CONFIG.bictorys.webhookSecret) missingKeys.push('BICTORYS_WEBHOOK_SECRET');
    }
  
    if (missingKeys.length > 0) {
      throw new Error(`Configuration de paiement manquante: ${missingKeys.join(', ')}`);
    }
  }
  
  // Types pour l'autocomplétion et la sécurité
  export type PaymentMode = typeof PAYMENT_CONFIG.mode;
  export type StripeConfig = typeof PAYMENT_CONFIG.stripe;
  export type BictorysConfig = typeof PAYMENT_CONFIG.bictorys;