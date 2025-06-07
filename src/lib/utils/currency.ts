// src/lib/utils/currency.ts - VERSION CORRIGÉE POUR STRIPE
import { useCountryStore } from "@/core/hooks/useCountryStore";

export function formatPrice(amount: number, currencyCode?: string): string {
  const { currentCountry, convertPrice } = useCountryStore.getState();
  
  if (!currentCountry) {
    return `${amount.toLocaleString()} FCFA`;
  }

  const { value, formatted } = convertPrice(amount);
  return formatted;
}

// ✅ CORRECTION PRINCIPALE: Taux de change FCFA → EUR corrigé
export const convertCFAToEUR = (cfaAmount: number): number => {
  // ✅ TAUX CORRIGÉ: 1 EUR = 655.957 XOF (taux fixe CFA)
  const rate = 655.957;
  const eurAmount = cfaAmount / rate;
  
  // Retourner en centimes d'EUR pour Stripe (multiplié par 100)
  return Math.round(eurAmount * 100);
};

export const convertEURToCFA = (eurAmount: number): number => {
  const rate = 655.957;
  return Math.round(eurAmount * rate);
};

export const formatCurrency = (amount: number, currency: 'CFA' | 'EUR'): string => {
  if (currency === 'CFA') {
    return `${amount.toLocaleString()} FCFA`;
  }
  return `${amount.toFixed(2)}€`;
};

// ✅ NOUVELLE FONCTION: Calcul spécifique pour Stripe
export const calculateStripeAmount = (cfaAmount: number): number => {
  return convertCFAToEUR(cfaAmount);
};

// ✅ FONCTION AMÉLIORÉE: Calcul du total avec remises
export function calculateOrderTotal(
  items: Array<{ price: number; quantity: number }>,
  city: string
): {
  subtotal: number;
  deliveryCost: number;
  total: number;
  formatted: string;
  stripeAmount: number; // ✅ NOUVEAU: Montant pour Stripe en centimes EUR
} {
  const subtotal = items.reduce((acc, item) => {
    let itemTotal = 0;
    if (item.quantity >= 4) {
      itemTotal = item.price * item.quantity * 0.8; // -20%
    } else if (item.quantity === 3) {
      itemTotal = 35700; // Prix fixe pour 3
    } else if (item.quantity === 2) {
      itemTotal = 25200; // Prix fixe pour 2
    } else {
      itemTotal = item.price * item.quantity;
    }
    return acc + itemTotal;
  }, 0);

  const deliveryCost = city.toLowerCase() === 'dakar' ? 0 : 3000;
  const total = subtotal + deliveryCost;

  return {
    subtotal,
    deliveryCost,
    total,
    formatted: formatPrice(total),
    stripeAmount: calculateStripeAmount(total) // ✅ NOUVEAU: Pour Stripe
  };
}

// ✅ NOUVELLE FONCTION: Validation des montants
export const validatePaymentAmount = (amount: number, currency: 'CFA' | 'EUR'): boolean => {
  if (currency === 'CFA') {
    return amount >= 500 && amount <= 10000000; // Entre 500 FCFA et 10M FCFA
  } else {
    return amount >= 0.76 && amount <= 15245; // Entre 0.76€ et 15,245€
  }
};

// ✅ FONCTION DEBUG: Pour vérifier les conversions
export const debugConversion = (cfaAmount: number): void => {
  const eurCentimes = convertCFAToEUR(cfaAmount);
  const eurAmount = eurCentimes / 100;
  
  console.log(`💰 Conversion Debug:`, {
    original: `${cfaAmount.toLocaleString()} FCFA`,
    converted: `${eurAmount.toFixed(2)}€`,
    stripeCentimes: eurCentimes,
    reverseCheck: `${convertEURToCFA(eurAmount).toLocaleString()} FCFA`
  });
};