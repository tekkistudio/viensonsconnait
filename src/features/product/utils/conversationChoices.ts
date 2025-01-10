// src/features/product/utils/conversationChoices.ts
export const CONVERSION_CHOICES = {
    buyNow: "Je veux l'acheter maintenant",
    multipleGames: "Commander plusieurs jeux",
    seeMore: "Je veux en savoir plus",
    seePricing: "Voir les packs disponibles",
  } as const;
  
  // Réutiliser les choix génériques existants
  export const STRUCTURED_CHOICES = {
    initial: [
      CONVERSION_CHOICES.buyNow,
      CONVERSION_CHOICES.seeMore,
      "Voir les témoignages"
    ],
    afterDescription: [
      CONVERSION_CHOICES.buyNow,
      "Voir les exemples de questions",
      CONVERSION_CHOICES.multipleGames
    ],
    afterTestimonials: [
      CONVERSION_CHOICES.buyNow,
      CONVERSION_CHOICES.seePricing,
      "Voir d'autres témoignages"
    ],
    afterPricing: [
      CONVERSION_CHOICES.buyNow,
      CONVERSION_CHOICES.multipleGames,
      "Voir les témoignages"
    ],
    multipleGames: [
      "2 exemplaires",
      "3 exemplaires",
      "4 exemplaires ou plus"
    ],
    paymentMethods: [
      "Wave",
      "Orange Money",
      "Paiement à la livraison"
    ]
  } as const;