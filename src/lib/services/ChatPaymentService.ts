// src/lib/services/ChatPaymentService.ts

import { supabase } from '@/lib/supabase';
import type { PaymentProvider, OrderData } from '@/types/order';

export class PaymentService {
  private static instance: PaymentService | null = null;

  private constructor() {}

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  async initializePayment(
    sessionId: string,
    method: PaymentProvider,
    orderData: Partial<OrderData>
  ): Promise<{
    transactionId: string;
    paymentUrl?: string;
    instructions?: string;
  }> {
    try {
      if (method === 'CASH') {
        return {
          transactionId: `COD-${Date.now()}`,
          instructions: 'Paiement à la livraison'
        };
      }

      const paymentRequestData = {
        amount: orderData.total_amount || 0,
        currency: 'XOF',
        provider: method,
        phoneNumber: orderData.phone,
        orderId: sessionId,
        metadata: {
          customerName: `${orderData.first_name} ${orderData.last_name}`,
          city: orderData.city
        }
      };

      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      if (!API_URL) throw new Error('API URL not configured');

      if (method === 'WAVE' || method === 'ORANGE_MONEY') {
        const response = await fetch(`${API_URL}/payments/mobile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentRequestData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Payment initialization failed');
        }

        const data = await response.json();
        return {
          transactionId: data.transactionId,
          paymentUrl: data.paymentUrl,
          instructions: data.instructions
        };
      }

      if (method === 'STRIPE') {
        const response = await fetch(`${API_URL}/payments/stripe/create-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentRequestData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Payment initialization failed');
        }

        const data = await response.json();
        return {
          transactionId: data.transactionId,
          paymentUrl: data.url
        };
      }

      throw new Error('Unsupported payment method');

    } catch (error) {
      console.error('Payment initialization error:', error);
      throw new Error('Erreur lors de l\'initialisation du paiement');
    }
  }

  async verifyPayment(
    sessionId: string,
    transactionId: string
  ): Promise<{
    status: 'pending' | 'completed' | 'failed';
    message?: string;
  }> {
    try {
      // D'abord, vérifier dans notre base de données
      const { data: order } = await supabase
        .from('orders')
        .select('payment_status, payment_method')
        .eq('session_id', sessionId)
        .single();

      if (order?.payment_status === 'completed') {
        return { status: 'completed' };
      }

      // Si le paiement n'est pas encore confirmé, vérifier avec l'API de paiement
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      if (!API_URL) throw new Error('API URL not configured');

      const response = await fetch(`${API_URL}/payments/verify/${transactionId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to verify payment');
      }

      const data = await response.json();
      
      // Mettre à jour le statut dans notre base de données
      if (data.status === 'completed') {
        await this.updatePaymentStatus(sessionId, 'completed');
      }

      return {
        status: data.status,
        message: data.message
      };

    } catch (error) {
      console.error('Payment verification error:', error);
      return { 
        status: 'pending',
        message: 'Impossible de vérifier le paiement pour le moment'
      };
    }
  }

  private async updatePaymentStatus(
    sessionId: string,
    status: 'pending' | 'completed' | 'failed'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      if (error) throw error;

    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  getPaymentInstructions(
    method: PaymentProvider,
    paymentData: {
      transactionId: string;
      paymentUrl?: string;
      instructions?: string;
    }
  ): string {
    switch (method) {
      case 'WAVE':
        return [
          `Pour payer avec Wave :`,
          ``,
          `1. Ouvrez votre application Wave`,
          `2. Cliquez sur "Payer"`,
          `3. Scannez le code QR ou utilisez ce lien : ${paymentData.paymentUrl}`,
          `4. Validez le paiement dans votre application`,
          ``,
          `Une fois le paiement effectué, dites-moi "oui" pour que je puisse vérifier.`
        ].join('\n');
      
      case 'ORANGE_MONEY':
        return [
          `Pour payer avec Orange Money :`,
          ``,
          `1. Composez #144#`,
          `2. Sélectionnez "Paiement marchand"`,
          `3. Entrez le code : ${paymentData.transactionId}`,
          `4. Validez avec votre code secret`,
          ``,
          `Une fois le paiement effectué, dites-moi "oui" pour que je puisse vérifier.`
        ].join('\n');
      
      case 'STRIPE':
        return `Vous allez être redirigé vers une page de paiement sécurisée. ` +
               `Cliquez sur ce lien pour procéder au paiement : ${paymentData.paymentUrl}`;
      
      case 'CASH':
        return 'Vous avez choisi de payer à la livraison. Notre livreur vous contactera bientôt !';
      
      default:
        return 'Instructions de paiement non disponibles.';
    }
  }
}