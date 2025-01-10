// src/lib/services/bictorys.service.ts
import { PaymentTransaction, PaymentStatus, PaymentProvider } from '@prisma/client';
import { prisma } from '../prisma';

interface InitiatePaymentParams {
  amount: number;
  currency: string;
  provider: PaymentProvider;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
    city: string;
  };
  orderId: string;
  metadata?: Record<string, any>;
}

export class BictorysService {
  private apiKey: string;
  private apiUrl: string;
  
  constructor() {
    this.apiKey = process.env.BICTORYS_API_KEY || '';
    this.apiUrl = process.env.BICTORYS_API_URL || '';
  }

  async initiatePayment(params: InitiatePaymentParams) {
    try {
      // 1. Créer la transaction dans notre base de données
      const transaction = await prisma.paymentTransaction.create({
        data: {
          orderId: params.orderId,
          amount: params.amount,
          currency: params.currency,
          provider: params.provider,
          status: 'PENDING',
          metadata: {
            customerInfo: params.customerInfo,
            initiatedAt: new Date().toISOString(),
            ...params.metadata
          }
        }
      });

      // 2. Préparer la requête vers Bictorys
      const requestBody = {
        amount: params.amount,
        currency: params.currency,
        provider: params.provider.toLowerCase(),
        phoneNumber: params.customerInfo.phone,
        customerObject: params.customerInfo,
        reference: transaction.id, // Utiliser l'ID de notre transaction comme référence
        successRedirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?ref=${transaction.id}`,
        errorRedirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/error?ref=${transaction.id}`,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/bictorys`,
        metadata: {
          orderId: params.orderId,
          transactionId: transaction.id
        }
      };

      // 3. Envoyer la requête à Bictorys
      const response = await fetch(`${this.apiUrl}/v1/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Bictorys payment initiation failed: ${response.statusText}`);
      }

      const paymentData = await response.json();

      // 4. Mettre à jour notre transaction avec la référence Bictorys
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          reference: paymentData.reference,
          metadata: {
            ...transaction.metadata,
            bictorysResponse: paymentData,
            updatedAt: new Date().toISOString()
          }
        }
      });

      return {
        success: true,
        paymentUrl: paymentData.paymentUrl,
        reference: paymentData.reference,
        transactionId: transaction.id
      };

    } catch (error) {
      console.error('Payment initiation failed:', error);
      throw error;
    }
  }

  // Méthode pour vérifier le statut d'une transaction
  async checkTransactionStatus(transactionId: string) {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.reference) {
      const response = await fetch(`${this.apiUrl}/v1/payments/${transaction.reference}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.ok) {
        const paymentStatus = await response.json();
        return paymentStatus;
      }
    }

    return {
      status: transaction.status,
      transactionId,
      reference: transaction.reference
    };
  }
}

export const bictorysService = new BictorysService();