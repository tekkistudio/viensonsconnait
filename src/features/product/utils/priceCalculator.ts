// src/features/product/utils/priceCalculator.ts

import { useCountryStore } from "../../../core/hooks/useCountryStore";

export function calculateDeliveryPrice(city: string): number {
  const countryStore = useCountryStore.getState();
  const country = countryStore.currentCountry;

  // Convertir le prix de livraison selon la devise
  const deliveryPriceFCFA = city.toLowerCase() === "dakar" ? 0 : 3000;
  if (!country || !country.currency) return deliveryPriceFCFA;

  const convertedDeliveryPrice = deliveryPriceFCFA * country.currency.rate;
  return Math.round(convertedDeliveryPrice);
}

export function calculateDiscount(quantity: number, basePrice: number): number {
  const countryStore = useCountryStore.getState();
  const country = countryStore.currentCountry;

  // Calcul du prix avec remise en fonction de la quantité
  let discountRate = 0;
  if (quantity >= 4) discountRate = 0.2; // -20%
  else if (quantity === 3) discountRate = 0.15; // -15%
  else if (quantity === 2) discountRate = 0.1; // -10%

  const discountedPriceFCFA = basePrice * discountRate;

  // Convertir le prix après remise selon la devise
  if (!country || !country.currency) return discountedPriceFCFA;

  const convertedDiscountedPrice = discountedPriceFCFA * country.currency.rate;
  return Math.round(convertedDiscountedPrice);
}

export function calculateTotalPrice(
  basePrice: number,
  quantity: number,
  city: string
): { value: number; formatted: string } {
  const countryStore = useCountryStore.getState();
  const country = countryStore.currentCountry;

  // Calculer le prix total en FCFA
  const deliveryPrice = calculateDeliveryPrice(city);
  const discount = calculateDiscount(quantity, basePrice);
  const totalPriceFCFA = basePrice * quantity - discount + deliveryPrice;

  // Convertir le prix total selon la devise
  if (!country || !country.currency) {
    return {
      value: totalPriceFCFA,
      formatted: `${totalPriceFCFA.toLocaleString()} FCFA`,
    };
  }

  const convertedTotalPrice = totalPriceFCFA * country.currency.rate;
  return {
    value: Math.round(convertedTotalPrice),
    formatted: `${Math.round(convertedTotalPrice).toLocaleString()} ${
      country.currency.symbol
    }`,
  };
}