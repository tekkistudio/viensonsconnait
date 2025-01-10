// src/services/payment.ts
class PaymentService {
    private static waveBaseUrl = process.env.NEXT_PUBLIC_WAVE_PAYMENT_BASE_URL;
    private static omUrl = process.env.NEXT_PUBLIC_OM_PAYMENT_URL;
  
    static getWavePaymentUrl(amount: number): string {
      if (!this.waveBaseUrl) throw new Error('Wave payment URL not configured');
      return `${this.waveBaseUrl}/?amount=${amount}`;
    }
  
    static getOrangeMoneyPaymentUrl(): string {
      if (!this.omUrl) throw new Error('Orange Money payment URL not configured');
      return this.omUrl;
    }
  }
  
  export default PaymentService;