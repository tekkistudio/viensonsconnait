// src/lib/env-validation.ts - NOUVEAU FICHIER
// Ce fichier force les bonnes variables d'environnement

export const ENV_CONFIG = {
  // Variables Stripe corrigées
  STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  
  // Variables Bictorys
  BICTORYS_API_KEY: process.env.NEXT_PUBLIC_BICTORYS_API_KEY || '',
  BICTORYS_API_URL: process.env.NEXT_PUBLIC_BICTORYS_API_URL || '',
  
  // Variables Supabase
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  
  // Variables OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
};

// Validation des variables critiques
export function validateEnvironment() {
  const missing: string[] = [];
  
  if (!ENV_CONFIG.STRIPE_PUBLISHABLE_KEY) {
    missing.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  }
  
  if (!ENV_CONFIG.STRIPE_SECRET_KEY) {
    missing.push('STRIPE_SECRET_KEY');
  }
  
  if (!ENV_CONFIG.SUPABASE_URL) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  
  if (missing.length > 0) {
    console.error('❌ Variables d\'environnement manquantes:', missing);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Variables manquantes: ${missing.join(', ')}`);
    }
  }
  
  return {
    isValid: missing.length === 0,
    missing
  };
}

// Export pour compatibilité avec l'ancien code
export const NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = ENV_CONFIG.STRIPE_PUBLISHABLE_KEY;