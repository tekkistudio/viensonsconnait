// src/config/payment.ts

export const PAYMENT_URLS = {
  WAVE: process.env.NEXT_PUBLIC_WAVE_PAYMENT_URL || 'https://pay.wave.com/m/M_OfAgT8X_IT6P/c/sn',
  ORANGE_MONEY: process.env.NEXT_PUBLIC_OM_PAYMENT_URL || 'https://qrcode.orange.sn/dcAiTp1xOXcf_SJqtDAm'
} as const;

export const BICTORYS_CONFIG = {
  successRedirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
  errorRedirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/error`,
  webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/bictorys`
} as const;

export type PaymentProvider = keyof typeof PAYMENT_URLS;