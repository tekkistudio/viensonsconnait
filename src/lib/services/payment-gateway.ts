// src/lib/services/payment-gateway.ts
import Stripe from 'stripe';
import { BictorysService } from './bictorys.service';
import { supabase } from '@/lib/supabase';
import type {
  PaymentProvider,
  PaymentInitiationParams,
  PaymentTransaction,
  CustomerInfo,
  BictorysPaymentParams,
  BictorysProvider,
  PaymentResponse
} from '@/types/payment';
import type {
  BictorysWebhookPayload
} from '@/types/bictorys';

interface StripeConfig {
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  mode: 'test' | 'live';
}

const stripeConfig: StripeConfig = {
  publicKey: process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_STRIPE_LIVE_KEY!
    : process.env.NEXT_PUBLIC_STRIPE_KEY!,
  secretKey: process.env.NODE_ENV === 'production'
    ? process.env.STRIPE_LIVE_SECRET_KEY!
    : process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.NODE_ENV === 'production'
    ? process.env.STRIPE_LIVE_WEBHOOK_SECRET!
    : process.env.STRIPE_WEBHOOK_SECRET!,
  mode: process.env.NODE_ENV === 'production' ? 'live' : 'test'
};

const providerMapping: Record<PaymentProvider, BictorysProvider | undefined> = {
  'WAVE': 'wave_money',
  'ORANGE_MONEY': 'orange_money',
  'STRIPE': undefined,
  'CASH': undefined
};

export class PaymentGateway {
  private stripe: Stripe;
  private bictorysService: BictorysService;

  constructor() {
    if (!stripeConfig.secretKey) {
      throw new Error('Stripe secret key not configured');
    }
  
    this.stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
      appInfo: {
        name: 'VOSC Chat',
        version: '1.0.0'
      }
    });
    this.bictorysService = new BictorysService();
  }

  private isValidAmount(amount: number): boolean {
    return amount > 0 && Number.isFinite(amount);
  }

  async initiatePayment(params: PaymentInitiationParams): Promise<PaymentResponse> {
    try {
      if (!this.isValidAmount(params.amount)) {
        throw new Error('Montant invalide. Le montant doit être supérieur à 0.');
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
            ...params.metadata
          }
        }])
        .select()
        .single();

      if (error) throw error;

      switch (params.provider) {
        case 'STRIPE':
          return await this.initiateStripePayment(params, transaction);
        case 'WAVE':
        case 'ORANGE_MONEY':
          return await this.initiateMobileMoneyPayment(params, transaction);
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

  private async initiateStripePayment(
    params: PaymentInitiationParams,
    transaction: PaymentTransaction
  ): Promise<PaymentResponse> {
    try {
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
        success_url: `${process.env.NEXT_PUBLIC_API_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_API_URL}/payment/cancel`,
        customer_email: params.customerInfo.email,
        metadata: {
          orderId: params.orderId.toString(),
          transactionId: transaction.id
        }
      });

      await supabase
        .from('payment_transactions')
        .update({
          reference: session.id,
          metadata: {
            ...transaction.metadata,
            stripeSessionId: session.id
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

  private async initiateMobileMoneyPayment(
    params: PaymentInitiationParams,
    transaction: PaymentTransaction
  ): Promise<PaymentResponse> {
    try {
      const bictorysProvider = providerMapping[params.provider];
      if (!bictorysProvider) {
        throw new Error(`Provider incompatible avec Bictorys: ${params.provider}`);
      }
  
      if (!params.customerInfo.phone) {
        throw new Error('Le numéro de téléphone est requis pour le paiement mobile');
      }
  
      const bictorysParams: BictorysPaymentParams = {
        amount: params.amount,
        currency: params.currency,
        provider: bictorysProvider,
        customerPhone: params.customerInfo.phone,
        customerCountry: params.customerInfo.city || 'SN',
        orderId: params.orderId
      };
  
      const session = await this.bictorysService.createPaymentSession(bictorysParams);
  
      await supabase
        .from('payment_transactions')
        .update({
          reference: session.transactionId,
          metadata: {
            ...transaction.metadata,
            bictorysResponse: session,
            bictorysTransactionId: session.transactionId
          }
        })
        .eq('id', transaction.id);
  
      return {
        success: true,
        paymentUrl: session.iframeUrl,
        transactionId: session.transactionId,
        reference: transaction.reference
      };
  
    } catch (error) {
      console.error('Mobile money payment initiation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Mobile money payment initiation failed'
      };
    }
  }

  async handleWebhook(provider: PaymentProvider, payload: any, receivedSignature: string): Promise<{ received: boolean }> {
    switch (provider) {
      case 'STRIPE':
        return this.handleStripeWebhook(payload, receivedSignature);
      case 'WAVE':
      case 'ORANGE_MONEY': {
        const webhookPayload = payload as BictorysWebhookPayload;
        webhookPayload.type = 'payment';
        webhookPayload.orderType = 'standard';
        webhookPayload.merchantId = webhookPayload.id;
        webhookPayload.paymentReference = webhookPayload.merchantReference;
        webhookPayload.timestamp = new Date().toISOString();
        return this.handleBictorysWebhook(webhookPayload);
      }
      default:
        throw new Error(`Provider de webhook non supporté: ${provider}`);
    }
  }

  private async handleStripeWebhook(payload: any, signature: string): Promise<{ received: boolean }> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        stripeConfig.webhookSecret
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
                mode: stripeConfig.mode
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
                updatedAt: new Date().toISOString()
              }
            })
            .eq('reference', paymentIntent.id);
          break;
        }
      }

      return { received: true };
    } catch (error) {
      console.error('Stripe webhook handling failed:', error);
      throw error;
    }
  }

  private async handleBictorysWebhook(payload: BictorysWebhookPayload): Promise<{ received: boolean }> {
    try {
      const signature = process.env.BICTORYS_WEBHOOK_SECRET;
      if (!signature) {
        throw new Error('BICTORYS_WEBHOOK_SECRET is not configured');
      }

      const result = await this.bictorysService.handleWebhook(payload, signature);
      return { received: true };
    } catch (error) {
      console.error('Bictorys webhook handling failed:', error);
      throw error;
    }
  }
}

export const paymentGateway = new PaymentGateway();