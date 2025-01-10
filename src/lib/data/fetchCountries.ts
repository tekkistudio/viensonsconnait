// src/lib/data/fetchCountries.ts
import axios from 'axios';

export interface Country {
  code: string;
  name: string;
  flag: string;
  currency?: {
    code: string;
    symbol: string;
  };
}

export const fetchCountries = async (): Promise<Country[]> => {
  const { data } = await axios.get('https://restcountries.com/v3.1/all');

  const countries: Country[] = data.map((country: any) => {
    const currencyCode = country.currencies ? Object.keys(country.currencies)[0] : undefined;
    const currency = currencyCode
      ? {
          code: currencyCode,
          symbol: country.currencies[currencyCode].symbol || '',
        }
      : undefined;

    return {
      code: country.cca2, // Code ISO 3166-1 alpha-2
      name: country.name.common,
      flag: country.flag,
      currency,
    };
  });

  return countries;
};