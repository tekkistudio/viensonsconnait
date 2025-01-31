// src/hooks/usePaymentScripts.ts
import { useState, useEffect } from 'react';

interface UsePaymentScriptsResult {
  isBictorysReady: boolean;
  isStripeReady: boolean;
  error: string | null;
}

export function usePaymentScripts(): UsePaymentScriptsResult {
  const [isBictorysReady, setBictorysReady] = useState(false);
  const [isStripeReady, setStripeReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadScript = async (url: string, onLoad: () => void, errorMessage: string) => {
      try {
        // Vérifier si le script est déjà chargé
        const existingScript = document.querySelector(`script[src="${url}"]`);
        if (existingScript) {
          onLoad();
          return;
        }

        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        
        script.onload = () => {
          if (mounted) {
            onLoad();
          }
        };
        
        script.onerror = () => {
          if (mounted) {
            setError(errorMessage);
          }
        };

        document.body.appendChild(script);
      } catch (error) {
        if (mounted) {
          setError(errorMessage);
        }
      }
    };

    // Charger Bictorys
    loadScript(
      process.env.NEXT_PUBLIC_BICTORYS_JS_URL!,
      () => setBictorysReady(true),
      "Erreur de chargement du service de paiement mobile"
    );

    // Charger Stripe
    loadScript(
      'https://js.stripe.com/v3/',
      () => setStripeReady(true),
      "Erreur de chargement du service de paiement par carte"
    );

    return () => {
      mounted = false;
    };
  }, []);

  return { isBictorysReady, isStripeReady, error };
}