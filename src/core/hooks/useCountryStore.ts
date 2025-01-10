"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import emojiFlags from "emoji-flags";

interface Currency {
  code: string;
  symbol: string;
  rate: number;
}

interface Country {
  code: string;
  name: string;
  flag: string;
  currency?: Currency;
}

interface CountryStore {
  currentCountry: Country | null;
  setCountry: (country: Country) => void;
  convertPrice: (price: number) => {
    value: number;
    formatted: string;
  };
}

// Taux de conversion depuis le FCFA
const DEFAULT_RATES = {
  XOF: 1, // FCFA
  EUR: 655.957, // 1 Euro = 655.957 FCFA
  USD: 600.0, // Approximatif, 1 USD = 600 FCFA
};

export const getDefaultCountry = async (): Promise<Country> => {
  try {
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();

    // Déterminer le taux de conversion en fonction de la région
    let rate = DEFAULT_RATES.USD; // Par défaut USD
    let symbol = "$";
    let currencyCode = "USD";

    // Pays de la zone FCFA (UEMOA et CEMAC)
    const fcfaCountries = [
      "SN",
      "CI",
      "BJ",
      "BF",
      "ML",
      "NE",
      "TG",
      "GW",
      "CM",
      "GA",
      "CG",
      "TD",
      "CF",
      "GQ",
    ];
    // Pays de la zone Euro
    const euroCountries = [
      "FR",
      "DE",
      "IT",
      "ES",
      "PT",
      "NL",
      "BE",
      "IE",
      "FI",
      "AT",
      "GR",
      "SK",
      "SI",
      "LU",
      "LV",
      "EE",
      "CY",
      "MT",
    ];

    if (fcfaCountries.includes(data.country_code)) {
      rate = DEFAULT_RATES.XOF;
      symbol = "FCFA";
      currencyCode = "XOF";
    } else if (euroCountries.includes(data.country_code)) {
      rate = DEFAULT_RATES.EUR;
      symbol = "€";
      currencyCode = "EUR";
    }

    return {
      code: data.country_code,
      name: data.country_name,
      flag: emojiFlags.countryCode(data.country_code)?.emoji || data.country_code,
      currency: {
        code: currencyCode,
        symbol: symbol,
        rate: rate,
      },
    };
  } catch (error) {
    // Pays par défaut en cas d'erreur
    return {
      code: "SN",
      name: "Sénégal",
      flag: "🇸🇳",
      currency: {
        code: "XOF",
        symbol: "FCFA",
        rate: DEFAULT_RATES.XOF,
      },
    };
  }
};

export const useCountryStore = create<CountryStore>()(
  persist(
    (set, get) => ({
      currentCountry: null,
      setCountry: (country) => set({ currentCountry: country }),
      convertPrice: (price) => {
        if (isNaN(price)) {
          return { value: 0, formatted: "N/A" };
        }
        const country = get().currentCountry;
        if (!country || !country.currency) {
          return {
            value: price,
            formatted: `${price.toLocaleString()} FCFA`,
          };
        }

        if (country.currency.code === "XOF") {
          return {
            value: price,
            formatted: `${price.toLocaleString()} ${country.currency.symbol}`,
          };
        }

        // Conversion depuis FCFA vers la devise cible
        const convertedValue = Math.round(price / country.currency.rate);
        return {
          value: convertedValue,
          formatted: country.currency.code === "EUR" 
            ? `${convertedValue.toLocaleString()} ${country.currency.symbol}` 
            : `${country.currency.symbol}${convertedValue.toLocaleString()}`,
        };
      },
    }),
    {
      name: "country-store",
      onRehydrateStorage: () => {
        return async (state) => {
          if (!state?.currentCountry) {
            const country = await getDefaultCountry();
            if (state?.setCountry) {
              state.setCountry(country);
            }
          }
        };
      },
    }
  )
);

export default useCountryStore;