// src/lib/services/payment.service.ts
import { PaymentTransaction, PaymentStatus, PaymentProvider } from '@prisma/client';
import { prisma } from '@/lib/database';
import crypto from 'crypto';

interface CreatePaymentParams {
  amount: number;
  currency: string;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
    city: string;
  };
  orderId: string;
  paymentMethod: PaymentProvider;
  metadata?: Record<string, any>;
}

export class PaymentService {
  async createPayment(params: CreatePaymentParams) {
    try {
      console.log('Starting payment creation:', {
        amount: params.amount,
        method: params.paymentMethod,
        orderId: params.orderId
      });

      // 1. Créer une transaction dans notre base
      const transaction = await prisma.paymentTransaction.create({
        data: {
          orderId: params.orderId,
          amount: params.amount,
          currency: params.currency,
          provider: params.paymentMethod,
          status: 'PENDING',
          reference: `tr_${crypto.randomUUID()}`,
          metadata: {
            customerInfo: params.customerInfo,
            initiatedAt: new Date().toISOString(),
            ...params.metadata
          }
        }
      });

      console.log('Transaction created:', transaction.id);

      // 2. Préparer le payload pour Bictorys
      const bictorysPayload = {
        amount: params.amount,
        currency: params.currency,
        provider: params.paymentMethod.toLowerCase(),
        phoneNumber: params.customerInfo.phone,
        customerObject: params.customerInfo,
        reference: transaction.id,
        successRedirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?ref=${transaction.id}`,
        errorRedirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?ref=${transaction.id}`,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/bictorys`,
        metadata: {
          orderId: params.orderId,
          transactionId: transaction.id
        }
      };

      // 3. Appeler l'API Bictorys
      const response = await fetch(`${process.env.BICTORYS_API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BICTORYS_API_KEY}`
        },
        body: JSON.stringify(bictorysPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bictorys API error: ${errorText}`);
      }

      const bictorysResponse = await response.json();
      
      // 4. Mettre à jour la transaction avec la référence Bictorys
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          reference: bictorysResponse.reference || transaction.id,
          metadata: {
            ...transaction.metadata,
            bictorysResponse,
            updatedAt: new Date().toISOString()
          }
        }
      });

      return {
        success: true,
        paymentData: bictorysResponse,
        transactionId: transaction.id
      };

    } catch (error) {
      console.error('Payment creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private mapPaymentStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'succeeded': 'COMPLETED',
      'failed': 'FAILED',
      'pending': 'PENDING',
      'processing': 'PROCESSING',
      'cancelled': 'FAILED',
      'reversed': 'REFUNDED'
    };
    return statusMap[status] || 'PENDING';
  }
}

export const paymentService = new PaymentService();