// src/lib/services/payment-gateway.ts

import Stripe from 'stripe';
import { BictorysService } from './bictorys.service';
import { supabase } from '@/lib/supabase';
import { PAYMENT_CONFIG, validatePaymentConfig } from '@/lib/config/payment.config';
import type {
  PaymentProvider,
  PaymentInitiationParams,
  PaymentTransaction,
  CustomerInfo,
  BictorysPaymentParams,
  BictorysProvider,
  PaymentResponse,
  BictorysWebhookPayload,
  PaymentMode
} from '@/types/payment';

const providerMapping: Record<PaymentProvider, BictorysProvider | undefined> = {
  'WAVE': 'wave_money',
  'ORANGE_MONEY': 'orange_money',
  'STRIPE': undefined,
  'CASH': undefined
} as const;

export class PaymentGateway {
  private stripeInstance: Stripe | null = null;
  private readonly bictorysService: BictorysService;
  private readonly currentMode: PaymentMode;
  private readonly axiosInstance: any;

  constructor() {
    try {
      validatePaymentConfig(typeof window === 'undefined');

      // Initialiser Stripe uniquement côté serveur
      if (typeof window === 'undefined' && PAYMENT_CONFIG.stripe.secretKey) {
        this.stripeInstance = new Stripe(PAYMENT_CONFIG.stripe.secretKey, {
          apiVersion: '2025-02-24.acacia' as const,
          typescript: true,
          appInfo: {
            name: 'VOSC Chat',
            version: '1.0.0'
          }
        });
      }

      // Initialiser BictorysService
      this.bictorysService = new BictorysService();
      this.currentMode = PAYMENT_CONFIG.mode;

      // Initialiser axios avec la configuration correcte
      if (PAYMENT_CONFIG.bictorys.apiUrl) {
        const axios = require('axios');
        this.axiosInstance = axios.create({
          baseURL: PAYMENT_CONFIG.bictorys.apiUrl,
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': PAYMENT_CONFIG.bictorys.publicKey
          },
          timeout: 10000
        });
      }

    } catch (error) {
      console.error('PaymentGateway initialization error:', error);
      if (typeof window === 'undefined') {
        throw error;
      }
      // Initialisation par défaut pour le client
      this.bictorysService = new BictorysService();
      this.currentMode = 'test';
    }
  }

  protected get stripe(): Stripe {
    if (!this.stripeInstance) {
      throw new Error('Stripe n\'est pas initialisé ou n\'est disponible que côté serveur');
    }
    return this.stripeInstance;
  }

  protected get mode(): PaymentMode {
    return this.currentMode;
  }

  private isValidAmount(amount: number): boolean {
    return amount > 0 && Number.isFinite(amount) && amount <= 10000000;
  }

  async initiatePayment(params: PaymentInitiationParams): Promise<PaymentResponse> {
    try {
      if (!this.isValidAmount(params.amount)) {
        throw new Error('Montant invalide. Le montant doit être supérieur à 0 et inférieur à 10M FCFA.');
      }

      const reference = `tr_${Date.now()}_${params.orderId}`;
      const { data: transaction, error } = await supabase
        .from('payment_transactions')
        .insert([{
          order_id: params.orderId,
          amount: params.amount,
          currency: params.currency,
          provider: params.provider,
          status: 'pending',
          reference,
          metadata: {
            customerInfo: params.customerInfo,
            initiatedAt: new Date().toISOString(),
            mode: this.mode,
            ...params.metadata
          }
        }])
        .select()
        .single();

      if (error) throw error;

      switch (params.provider) {
        case 'STRIPE':
          return this.handleStripePayment(params, transaction);
        case 'WAVE':
        case 'ORANGE_MONEY':
          return this.handleMobileMoneyPayment(params, transaction);
        case 'CASH':
          return this.handleCashPayment(params, transaction);
        default:
          throw new Error(`Provider de paiement non supporté: ${params.provider}`);
      }
    } catch (error) {
      console.error('Payment initiation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment initiation failed'
      };
    }
  }

  private async handleStripePayment(
    params: PaymentInitiationParams,
    transaction: PaymentTransaction
  ): Promise<PaymentResponse> {
    try {
      if (!this.stripeInstance) {
        throw new Error('Stripe n\'est pas initialisé');
      }

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: params.currency.toLowerCase(),
            product_data: {
              name: `Commande #${params.orderId}`,
            },
            unit_amount: params.amount,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/stripe/cancel`,
        customer_email: params.customerInfo.email,
        metadata: {
          orderId: params.orderId.toString(),
          transactionId: transaction.id,
          mode: this.mode
        }
      });

      await supabase
        .from('payment_transactions')
        .update({
          reference: session.id,
          metadata: {
            ...transaction.metadata,
            stripeSessionId: session.id,
            mode: this.mode,
            updatedAt: new Date().toISOString()
          }
        })
        .eq('id', transaction.id);

      return {
        success: true,
        sessionId: session.id,
        paymentUrl: session.url || undefined,
        transactionId: transaction.id,
        reference: session.id
      };
    } catch (error) {
      console.error('Stripe payment initiation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stripe payment initiation failed'
      };
    }
  }

  private async handleMobileMoneyPayment(
    params: PaymentInitiationParams,
    transaction: PaymentTransaction
  ): Promise<PaymentResponse> {
    try {
      const bictorysParams = {
        amount: params.amount,
        currency: params.currency,
        successRedirectUrl: `${process.env.NEXT_PUBLIC_API_URL}/payment/success`,
        errorRedirectUrl: `${process.env.NEXT_PUBLIC_API_URL}/payment/error`,
        callbackUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/bictorys`,
        merchantReference: transaction.reference,
        customer: {
          name: params.customerInfo.name,
          phone: params.customerInfo.phone.replace(/\s/g, ''),
          email: params.customerInfo.email,
          city: params.customerInfo.city || 'Dakar',
          country: params.customerInfo.country || 'SN'
        }
      };

      // Utiliser le service Bictorys
      const bictorysResponse = await this.bictorysService.createPaymentSession({
        ...bictorysParams,
        provider: providerMapping[params.provider]!
      });

      if (!bictorysResponse.iframeUrl) {
        throw new Error('Réponse invalide de Bictorys');
      }

      await supabase
        .from('payment_transactions')
        .update({
          status: 'pending',
          reference: bictorysResponse.transactionId,
          metadata: {
            ...transaction.metadata,
            checkoutUrl: bictorysResponse.iframeUrl,
            mode: this.mode,
            updatedAt: new Date().toISOString()
          }
        })
        .eq('id', transaction.id);

      return {
        success: true,
        paymentUrl: bictorysResponse.iframeUrl,
        transactionId: bictorysResponse.transactionId
      };

    } catch (error) {
      console.error('Mobile money payment initiation failed:', error);
      
      await supabase
        .from('payment_transactions')
        .update({
          status: 'failed',
          metadata: {
            ...transaction.metadata,
            error: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date().toISOString()
          }
        })
        .eq('id', transaction.id);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Mobile money payment initiation failed'
      };
    }
  }

  private async handleCashPayment(
    params: PaymentInitiationParams,
    transaction: PaymentTransaction
  ): Promise<PaymentResponse> {
    try {
      await supabase
        .from('payment_transactions')
        .update({
          status: 'pending',
          metadata: {
            ...transaction.metadata,
            paymentMethod: 'CASH',
            initiatedAt: new Date().toISOString(),
            mode: this.mode
          }
        })
        .eq('id', transaction.id);

      return {
        success: true,
        transactionId: transaction.id,
        reference: transaction.reference
      };
    } catch (error) {
      console.error('Cash payment initiation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cash payment initiation failed'
      };
    }
  }

  async handleWebhook(
    provider: PaymentProvider,
    payload: any,
    receivedSignature: string
  ): Promise<{ received: boolean }> {
    try {
      switch (provider) {
        case 'STRIPE':
          return this.handleStripeWebhook(payload, receivedSignature);
        case 'WAVE':
        case 'ORANGE_MONEY':
          return this.handleBictorysWebhook(payload as BictorysWebhookPayload, receivedSignature);
        default:
          throw new Error(`Provider de webhook non supporté: ${provider}`);
      }
    } catch (error) {
      console.error('Webhook handling failed:', error);
      throw error;
    }
  }

  private async handleStripeWebhook(
    payload: any,
    signature: string
  ): Promise<{ received: boolean }> {
    try {
      if (!this.stripeInstance) {
        throw new Error('Stripe n\'est pas initialisé');
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        PAYMENT_CONFIG.stripe.webhookSecret!
      );

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          
          const { data: transaction, error: transactionError } = await supabase
            .from('payment_transactions')
            .update({
              status: 'completed',
              metadata: {
                stripePaymentId: session.payment_intent,
                paymentStatus: 'completed',
                updatedAt: new Date().toISOString(),
                mode: this.mode
              }
            })
            .eq('reference', session.id)
            .select()
            .single();

          if (transactionError) throw transactionError;

          const { error: orderError } = await supabase
            .from('orders')
            .update({
              status: 'PAID',
              payment_method: 'STRIPE',
              updated_at: new Date().toISOString()
            })
            .eq('id', transaction.order_id);

          if (orderError) throw orderError;
          break;
        }
        
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await supabase
            .from('payment_transactions')
            .update({
              status: 'failed',
              metadata: {
                stripePaymentId: paymentIntent.id,
                error: paymentIntent.last_payment_error?.message,
                updatedAt: new Date().toISOString(),
                mode: this.mode
              }
            })
            .eq('reference', paymentIntent.id);
          break;
        }

        case 'checkout.session.expired': {
          const session = event.data.object as Stripe.Checkout.Session;
          await supabase
            .from('payment_transactions')
            .update({
              status: 'expired',
              metadata: {
                updatedAt: new Date().toISOString(),
                mode: this.mode
              }
            })
            .eq('reference', session.id);
          break;
        }
      }

      return { received: true };
    } catch (error) {
      console.error('Stripe webhook handling failed:', error);
      throw error;
    }
  }

  private async handleBictorysWebhook(
    payload: BictorysWebhookPayload,
    signature: string
  ): Promise<{ received: boolean }> {
    try {
      const result = await this.bictorysService.handleWebhook(payload, signature);
      return { received: true };
    } catch (error) {
      console.error('Bictorys webhook handling failed:', error);
      throw error;
    }
  }
}

export const paymentGateway = new PaymentGateway();