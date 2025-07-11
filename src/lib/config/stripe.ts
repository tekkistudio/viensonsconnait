// src/lib/config/stripe.ts - Gestionnaire automatique d'environnement
export const StripeConfig = {
  // ✅ DÉTECTION AUTOMATIQUE de l'environnement
  isProduction: process.env.NODE_ENV === 'production',
  
  // ✅ CLÉS PUBLIQUES (détection automatique)
  getPublishableKey: () => {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!key) {
      throw new Error('Clé publique Stripe manquante');
    }
    
    // Vérification de cohérence
    const isLiveKey = key.startsWith('pk_live_');
    const isTestKey = key.startsWith('pk_test_');
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && !isLiveKey) {
      console.warn('⚠️ ATTENTION: Clé Stripe de test utilisée en production !');
    }
    
    if (!isProduction && isLiveKey) {
      console.warn('⚠️ ATTENTION: Clé Stripe live utilisée en développement !');
    }
    
    console.log(`🔧 Stripe Config: ${isLiveKey ? 'LIVE' : 'TEST'} mode (${process.env.NODE_ENV})`);
    
    return key;
  },
  
  // ✅ CLÉS SECRÈTES (côté serveur uniquement)
  getSecretKey: () => {
    if (typeof window !== 'undefined') {
      throw new Error('Clé secrète Stripe accessible uniquement côté serveur');
    }
    
    const key = process.env.STRIPE_SECRET_KEY;
    
    if (!key) {
      throw new Error('Clé secrète Stripe manquante');
    }
    
    return key;
  },
  
  // ✅ WEBHOOK SECRET
  getWebhookSecret: () => {
    if (typeof window !== 'undefined') {
      throw new Error('Secret webhook accessible uniquement côté serveur');
    }
    
    return process.env.STRIPE_WEBHOOK_SECRET;
  },
  
  // ✅ CONFIGURATION OPTIONS
  getStripeOptions: () => ({
    apiVersion: '2025-02-24.acacia' as const,
    typescript: true,
    maxNetworkRetries: 3,
  }),
  
  // ✅ VALIDATION de la configuration
  validateConfig: () => {
    const errors: string[] = [];
    
    try {
      const pubKey = StripeConfig.getPublishableKey();
      const isLive = pubKey.startsWith('pk_live_');
      const isProd = process.env.NODE_ENV === 'production';
      
      if (isProd && !isLive) {
        errors.push('Clé publique de test utilisée en production');
      }
      
      if (!isProd && isLive) {
        errors.push('Clé publique live utilisée en développement');
      }
      
    } catch (error) {
      errors.push(`Clé publique: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
    
    // Validation côté serveur uniquement
    if (typeof window === 'undefined') {
      try {
        StripeConfig.getSecretKey();
      } catch (error) {
        errors.push(`Clé secrète: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      environment: process.env.NODE_ENV,
      keyType: StripeConfig.getPublishableKey().startsWith('pk_live_') ? 'LIVE' : 'TEST'
    };
  }
};

// ✅ UTILITAIRE: Logger pour debug
export const logStripeConfig = () => {
  const validation = StripeConfig.validateConfig();
  
  console.log('🔧 Stripe Configuration:', {
    environment: validation.environment,
    keyType: validation.keyType,
    isValid: validation.isValid,
    errors: validation.errors
  });
  
  return validation;
};