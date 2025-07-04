// src/lib/utils/currency.ts - VERSION CORRIGÉE
import { useCountryStore } from "@/core/hooks/useCountryStore";

export function formatPrice(amount: number, currencyCode?: string): string {
  const { currentCountry, convertPrice } = useCountryStore.getState();
  
  if (!currentCountry) {
    return `${amount.toLocaleString()} FCFA`;
  }

  const { value, formatted } = convertPrice(amount);
  return formatted;
}

// ✅ TAUX DE CHANGE OFFICIEL CORRECT : 1 EUR = 655.957 XOF
export const OFFICIAL_FCFA_TO_EUR_RATE = 655.957;

// ✅ CORRECTION MAJEURE: Conversion FCFA → EUR exacte
export const convertCFAToEUR = (cfaAmount: number): number => {
  // Conversion en EUR puis en centimes pour Stripe
  const eurAmount = cfaAmount / OFFICIAL_FCFA_TO_EUR_RATE;
  const eurCentimes = Math.round(eurAmount * 100);
  
  console.log(`💰 Conversion: ${cfaAmount} FCFA = ${eurAmount.toFixed(2)}€ = ${eurCentimes} centimes`);
  
  return eurCentimes;
};

export const convertEURToCFA = (eurAmount: number): number => {
  return Math.round(eurAmount * OFFICIAL_FCFA_TO_EUR_RATE);
};

export const formatCurrency = (amount: number, currency: 'CFA' | 'EUR'): string => {
  if (currency === 'CFA') {
    return `${amount.toLocaleString()} FCFA`;
  }
  return `${(amount / 100).toFixed(2)}€`; // amount est en centimes pour EUR
};

// ✅ FONCTION CORRIGÉE: Calcul spécifique pour Stripe
export const calculateStripeAmount = (cfaAmount: number): number => {
  return convertCFAToEUR(cfaAmount);
};

// ✅ FONCTION DE DEBUG: Vérifier les conversions
export const debugConversion = (cfaAmount: number): void => {
  const eurCentimes = convertCFAToEUR(cfaAmount);
  const eurAmount = eurCentimes / 100;
  
  console.log(`💰 Conversion Debug:`, {
    original: `${cfaAmount.toLocaleString()} FCFA`,
    converted: `${eurAmount.toFixed(2)}€`,
    stripeCentimes: eurCentimes,
    reverseCheck: `${convertEURToCFA(eurAmount).toLocaleString()} FCFA`,
    expectedFor28000: `28,000 FCFA = ${(28000 / OFFICIAL_FCFA_TO_EUR_RATE).toFixed(2)}€`
  });
  
  // Pour 28,000 FCFA, on devrait avoir environ 42.68€
  if (cfaAmount === 28000) {
    const expected = 28000 / OFFICIAL_FCFA_TO_EUR_RATE;
    console.log(`✅ Vérification 28,000 FCFA = ${expected.toFixed(2)}€ (${Math.round(expected * 100)} centimes)`);
  }
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
  stripeAmount: number; // ✅ Montant pour Stripe en centimes EUR
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
    stripeAmount: calculateStripeAmount(total) // ✅ Conversion correcte
  };
}

// ✅ VALIDATION DES MONTANTS
export const validatePaymentAmount = (amount: number, currency: 'CFA' | 'EUR'): boolean => {
  if (currency === 'CFA') {
    return amount >= 500 && amount <= 10000000; // Entre 500 FCFA et 10M FCFA
  } else {
    return amount >= 1 && amount <= 15245; // Entre 1€ et 15,245€ (en centimes)
  }
};