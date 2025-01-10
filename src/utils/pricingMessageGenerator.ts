// src/utils/pricingMessageGenerator.ts

import { useCountryStore } from '../core/hooks/useCountryStore';

export const generatePricingMessage = (): string => {
  const { convertPrice } = useCountryStore();

  // Prix des packs en FCFA
  const soloPrice = convertPrice(14000).formatted;
  const duoPrice = convertPrice(25200).formatted;
  const trioPrice = convertPrice(35700).formatted;

  return `
🎁 Pack Solo (1 jeu) : ${soloPrice}
🎁 Pack Duo (-10%) : ${duoPrice}
🎁 Pack Trio (-15%) : ${trioPrice}
🎁 Pack Comité (-20%) : à partir de 4 jeux
  `;
};