// src/lib/payment-config.ts 
export const paymentConfig = {
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  bictorys: {
    apiKey: process.env.NEXT_PUBLIC_BICTORYS_API_KEY || '',
    apiUrl: process.env.NEXT_PUBLIC_BICTORYS_API_URL || 'https://api.test.bictorys.com',
    webhookSecret: process.env.BICTORYS_WEBHOOK_SECRET || '',
  }
};

// Validation des clés en mode production
export function validatePaymentConfig() {
  const errors: string[] = [];
  
  if (!paymentConfig.stripe.publishableKey) {
    errors.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY manquante');
  }
  
  if (!paymentConfig.stripe.secretKey) {
    errors.push('STRIPE_SECRET_KEY manquante');
  }
  
  if (!paymentConfig.bictorys.apiKey) {
    errors.push('NEXT_PUBLIC_BICTORYS_API_KEY manquante');
  }
  
  if (errors.length > 0 && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ Configuration de paiement incomplète:', errors);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}