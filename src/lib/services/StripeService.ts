// src/lib/services/StripeService.ts 
import { loadStripe, Stripe } from '@stripe/stripe-js';

interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  orderId: string;
  customerInfo: {
    name: string;
    email?: string;
    phone: string;
  };
}

interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

interface StripeSessionOptions {
  amount: number;
  currency: string;
  orderId: string;
  customerEmail?: string;
  customerName?: string;
  successUrl?: string;
  cancelUrl?: string;
}

interface StripeSession {
  id: string;
  url: string;
  clientSecret?: string;
}

export class StripeService {
  private static instance: StripeService;
  private stripePromise: Promise<Stripe | null>;
  
  private constructor() {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      throw new Error('Clé publique Stripe manquante');
    }
    this.stripePromise = loadStripe(publishableKey);
  }

  public static getInstance(): StripeService {
    if (!this.instance) {
      this.instance = new StripeService();
    }
    return this.instance;
  }

  // ✅ MÉTHODE PRINCIPALE: Créer Payment Intent
  async createPaymentIntent(data: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> {
    try {
      console.log('🔷 Creating Stripe Payment Intent:', {
        amount: data.amount,
        currency: data.currency,
        orderId: data.orderId
      });

      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(data.amount * 100), // Convertir en centimes
          currency: data.currency.toLowerCase(),
          orderId: data.orderId,
          customerInfo: data.customerInfo,
          metadata: {
            orderId: data.orderId,
            source: 'chatbot',
            timestamp: new Date().toISOString()
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Stripe API Error:', errorData);
        throw new Error(errorData.error || 'Erreur lors de la création du paiement');
      }

      const result = await response.json();
      
      if (!result.clientSecret) {
        throw new Error('Client secret manquant dans la réponse');
      }

      console.log('✅ Payment Intent created successfully');
      
      return {
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId
      };

    } catch (error) {
      console.error('❌ Error creating payment intent:', error);
      throw error;
    }
  }

  // ✅ MÉTHODE: Créer session Checkout (pour redirection)
  async createCheckoutSession(options: StripeSessionOptions): Promise<StripeSession> {
    try {
      console.log('🔷 Creating Stripe Checkout Session:', options);

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(options.amount * 100),
          currency: options.currency.toLowerCase(),
          orderId: options.orderId,
          customerEmail: options.customerEmail,
          customerName: options.customerName,
          successUrl: options.successUrl || `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: options.cancelUrl || `${window.location.origin}/payment/cancel`,
          metadata: {
            orderId: options.orderId,
            source: 'chatbot'
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la création de la session');
      }

      const session = await response.json();
      
      return {
        id: session.id,
        url: session.url
      };

    } catch (error) {
      console.error('❌ Error creating checkout session:', error);
      throw error;
    }
  }

  // ✅ MÉTHODE: Confirmer paiement avec Elements
  async confirmPayment(clientSecret: string, paymentMethod: any): Promise<{success: boolean, error?: string}> {
    try {
      const stripe = await this.stripePromise;
      if (!stripe) {
        throw new Error('Stripe non initialisé');
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: paymentMethod,
        redirect: 'if_required'
      });

      if (error) {
        console.error('❌ Payment confirmation error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      if (paymentIntent?.status === 'succeeded') {
        console.log('✅ Payment confirmed successfully');
        return { success: true };
      }

      return {
        success: false,
        error: 'Paiement non confirmé'
      };

    } catch (error) {
      console.error('❌ Error confirming payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // ✅ MÉTHODE: Vérifier statut du paiement
  async getPaymentStatus(paymentIntentId: string): Promise<{
    status: 'succeeded' | 'failed' | 'pending' | 'canceled';
    amount?: number;
    currency?: string;
  }> {
    try {
      const response = await fetch(`/api/stripe/payment-status/${paymentIntentId}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la vérification du statut');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error getting payment status:', error);
      throw error;
    }
  }

  // ✅ MÉTHODE: Créer URL de paiement direct
  async createPaymentUrl(orderId: string, amount: number, currency: string = 'eur'): Promise<string> {
    try {
      const session = await this.createCheckoutSession({
        amount,
        currency,
        orderId,
        successUrl: `${window.location.origin}/payment/success?order_id=${orderId}`,
        cancelUrl: `${window.location.origin}/chat?payment=canceled`
      });

      return session.url;
    } catch (error) {
      console.error('❌ Error creating payment URL:', error);
      throw error;
    }
  }
}