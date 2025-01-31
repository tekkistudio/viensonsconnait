// src/features/product/utils/conversationChoices.ts
export const CONVERSION_CHOICES = {
  buyNow: "Je veux l'acheter maintenant",
  multipleGames: "Commander plusieurs jeux",
  seeMore: "Je veux en savoir plus",
  seePricing: "Voir les packs disponibles",
  seeQuestions: "Voir des exemples de questions",
  seeTestimonials: "Voir les témoignages",
  confirmOrder: "Oui, c'est correct",
  modifyOrder: "Non, je veux modifier"
} as const;

export const STRUCTURED_CHOICES = {
  initial: [
    CONVERSION_CHOICES.seeMore,
    CONVERSION_CHOICES.seePricing,
    CONVERSION_CHOICES.seeQuestions
  ],
  afterDescription: [
    CONVERSION_CHOICES.buyNow,
    CONVERSION_CHOICES.seeQuestions,
    CONVERSION_CHOICES.seeTestimonials
  ],
  afterTestimonials: [
    CONVERSION_CHOICES.buyNow,
    CONVERSION_CHOICES.seePricing,
    CONVERSION_CHOICES.seeQuestions
  ],
  afterPricing: [
    CONVERSION_CHOICES.buyNow,
    CONVERSION_CHOICES.multipleGames,
    CONVERSION_CHOICES.seeTestimonials
  ],
  afterQuestions: [
    CONVERSION_CHOICES.buyNow,
    CONVERSION_CHOICES.seePricing,
    CONVERSION_CHOICES.multipleGames
  ],
  multipleGames: [
    "2 exemplaires",
    "3 exemplaires",
    "4 exemplaires ou plus"
  ],
  orderConfirmation: [
    CONVERSION_CHOICES.confirmOrder,
    CONVERSION_CHOICES.modifyOrder
  ],
  paymentMethods: [
    "Payer avec le téléphone",
    "Payer par carte bancaire",
    "Payer à la livraison"
  ],
  mobilePaymentOptions: [
    "Wave",
    "Orange Money"
  ],
  afterPayment: [
    "Suivre ma commande",
    "Voir d'autres jeux",
    "J'ai une question"
  ],
  afterPaymentError: [
    "Réessayer le paiement",
    "Choisir un autre mode de paiement",
    "Parler à un conseiller"
  ],
  upsell: [
    "Découvrir ce jeu",
    "Voir d'autres suggestions",
    "Non merci"
  ]
} as const;