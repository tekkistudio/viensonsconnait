// src/lib/services/stripe.service.ts
interface StripeSessionOptions {
    amount: number;
    currency: string;
    orderId: string;
    customerEmail?: string;
    customerName?: string;
  }
  
  interface StripeSession {
    id: string;
    url: string;
  }
  
  export class StripeService {
    private readonly apiUrl: string;
    private readonly publicKey: string;
  
    constructor() {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
      if (!apiUrl || !publicKey) {
        throw new Error('Stripe configuration manquante');
      }
  
      this.apiUrl = apiUrl;
      this.publicKey = publicKey;
    }
  
    async createCheckoutSession(options: StripeSessionOptions): Promise<StripeSession> {
      try {
        const response = await fetch(`${this.apiUrl}/api/stripe/create-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: options.amount,
            currency: options.currency,
            orderId: options.orderId,
            customerEmail: options.customerEmail,
            customerName: options.customerName,
            success_url: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${window.location.origin}/payment/cancel`,
          }),
        });
  
        if (!response.ok) {
          throw new Error('Erreur lors de la création de la session Stripe');
        }
  
        const session = await response.json();
        
        if (!session.id || !session.url) {
          throw new Error('Réponse Stripe invalide');
        }
  
        return {
          id: session.id,
          url: session.url
        };
      } catch (error) {
        console.error('Stripe session creation error:', error);
        throw error;
      }
    }
  
    async getSessionStatus(sessionId: string): Promise<'complete' | 'expired' | 'pending'> {
      try {
        const response = await fetch(`${this.apiUrl}/api/stripe/session-status/${sessionId}`);
        
        if (!response.ok) {
          throw new Error('Erreur lors de la vérification du statut de la session');
        }
  
        const { status } = await response.json();
        return status;
      } catch (error) {
        console.error('Stripe session status error:', error);
        throw error;
      }
    }
  
    async refundPayment(paymentIntentId: string, amount?: number): Promise<boolean> {
      try {
        const response = await fetch(`${this.apiUrl}/api/stripe/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId,
            amount
          }),
        });
  
        if (!response.ok) {
          throw new Error('Erreur lors du remboursement');
        }
  
        const { success } = await response.json();
        return success;
      } catch (error) {
        console.error('Stripe refund error:', error);
        throw error;
      }
    }
  }