// src/lib/services/OrderPaymentService.ts

import { supabase } from '@/lib/supabase';
import { PAYMENT_URLS, BICTORYS_CONFIG } from '@/config/payment';
import type { 
  PaymentProvider, 
  CustomerInfo,
  PaymentVerificationResult
} from '@/types/payment';
import { ChatOrderData } from '@/types/chat';

interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  reference?: string;
  paymentUrl?: string;
  error?: string;
  status?: 'pending' | 'completed' | 'failed';
  testMode?: boolean;
}

export class OrderPaymentService {
  private static instance: OrderPaymentService | null = null;
  private readonly isTestMode: boolean;
  private readonly PAYMENT_TIMEOUT = 300000; // 5 minutes en millisecondes
  private readonly VERIFICATION_INTERVAL = 5000; // 5 secondes entre chaque vérification

  private constructor() {
    this.isTestMode = process.env.NEXT_PUBLIC_PAYMENT_MODE === 'test';
  }

  public static getInstance(): OrderPaymentService {
    if (!OrderPaymentService.instance) {
      OrderPaymentService.instance = new OrderPaymentService();
    }
    return OrderPaymentService.instance;
  }

  async initiatePayment(sessionId: string, updatedOrderData: Partial<ChatOrderData>, paymentMethod: string, params: {
  sessionId: string;
  provider: PaymentProvider;
  amount: number;
  customerInfo: CustomerInfo;
  metadata?: Record<string, any>;
}): Promise<PaymentResponse> {
    try {
      // Validation du montant
      if (!this.isValidAmount(params.amount)) {
        throw new Error('Le montant doit être entre 100 et 10,000,000 FCFA');
      }

      // Validation des informations client
      if (!this.isValidCustomerInfo(params.customerInfo)) {
        throw new Error('Informations client incomplètes');
      }

      // En mode test ou avant l'intégration complète de Bictorys
      if (this.isTestMode || !BICTORYS_CONFIG.webhookUrl) {
        return this.handleDirectPayment(params);
      }

      // Si Bictorys est configuré, utiliser l'intégration Bictorys
      return this.handleBictorysPayment(params);

    } catch (error) {
      console.error('Payment initiation error:', {
        error,
        params: {
          ...params,
          customerInfo: { ...params.customerInfo, phone: '******' } // Masquer le numéro
        }
      });
      return {
        success: false,
        error: this.formatErrorMessage(error)
      };
    }
  }

  getPaymentInstructions(
    method: PaymentProvider,
    data: {
      transactionId: string;
      paymentUrl?: string;
      instructions?: string;
    }
  ): string {
    const baseInstructions = {
      'WAVE': [
        `Pour payer avec Wave :`,
        ``,
        `1. Ouvrez votre application Wave`,
        `2. Cliquez sur "Payer"`,
        `3. Scannez le code QR ou utilisez ce lien : ${data.paymentUrl}`,
        `4. Validez le paiement dans votre application`,
        ``,
        `Une fois le paiement effectué, dites-moi "oui" pour que je puisse vérifier.`
      ],
      'ORANGE_MONEY': [
        `Pour payer avec Orange Money :`,
        ``,
        `1. Composez #144#`,
        `2. Sélectionnez "Paiement marchand"`,
        `3. Entrez le code : ${data.transactionId}`,
        `4. Validez avec votre code secret`,
        ``,
        `Une fois le paiement effectué, dites-moi "oui" pour que je puisse vérifier.`
      ],
      'STRIPE': [
        `Vous allez être redirigé vers une page de paiement sécurisée.`,
        `Cliquez sur ce lien pour procéder au paiement : ${data.paymentUrl}`
      ],
      'CASH': [
        `Vous avez choisi de payer à la livraison.`,
        `Notre livreur vous contactera bientôt !`
      ]
    };

    return (baseInstructions[method] || ['Instructions de paiement non disponibles.']).join('\n');
  }

  async verifyPayment(
    sessionId: string,
    clientSecret?: string
  ): Promise<PaymentVerificationResult> {
    try {
      if (!clientSecret) {
        // Vérification via l'ID de session
        const { data: transaction } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('order_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (!transaction) {
          return {
            isValid: false,
            success: false,
            status: 'failed',
            message: 'Transaction non trouvée'
          };
        }
        
        return {
          isValid: true,
          success: transaction.status === 'completed',
          status: transaction.status as 'pending' | 'completed' | 'failed',
          transactionId: transaction.id,
          message: transaction.status === 'completed' 
            ? 'Paiement confirmé' 
            : transaction.status === 'failed'
              ? 'Paiement échoué'
              : 'En attente de confirmation'
        };
      } else {
        // Vérification via clientSecret
        try {
          // Vérifier le paiement via l'API appropriée
          const response = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientSecret, sessionId })
          });
          
          const result = await response.json();
          
          return {
            isValid: true,
            success: result.status === 'completed',
            status: result.status as 'pending' | 'completed' | 'failed',
            transactionId: result.transactionId,
            message: result.message
          };
        } catch (error) {
          return {
            isValid: false,
            success: false,
            status: 'failed',
            message: this.formatErrorMessage(error)
          };
        }
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      return {
        isValid: false,
        success: false,
        status: 'failed',
        message: this.formatErrorMessage(error)
      };
    }
  }
  
  // Ajouter cette méthode utilitaire
  private async getLatestTransaction(sessionId: string) {
    const { data } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('order_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    return data;
  }
  
  // Ajouter cette méthode si vous utilisez des secrets spécifiques (comme pour Stripe)
  private async verifyPaymentWithSecret(
    sessionId: string, 
    clientSecret: string
  ): Promise<PaymentVerificationResult> {
    try {
      // Vérifier le paiement via l'API appropriée
      // Ceci est un exemple, à adapter selon votre intégration
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientSecret, sessionId })
      });
      
      const result = await response.json();
      
      return {
        isValid: true,
        success: result.status === 'completed',
        status: result.status,
        transactionId: result.transactionId,
        message: result.message
      };
    } catch (error) {
      return {
        isValid: false,
        success: false,
        status: 'failed',
        message: this.formatErrorMessage(error)
      };
    }
  }

  private async handleDirectPayment(params: {
    sessionId: string;
    provider: PaymentProvider;
    amount: number;
    customerInfo: CustomerInfo;
  }): Promise<PaymentResponse> {
    try {
      const reference = this.generateReference(params.sessionId);
      const paymentUrl = this.buildPaymentUrl(params.provider, params.amount);

      if (!paymentUrl) {
        throw new Error('Méthode de paiement non supportée en mode direct');
      }

      const transaction = await this.createTransaction({
        orderId: params.sessionId,
        provider: params.provider,
        amount: params.amount,
        reference,
        paymentUrl,
        customerInfo: params.customerInfo
      });

      return {
        success: true,
        transactionId: transaction.id,
        reference,
        paymentUrl,
        testMode: this.isTestMode
      };

    } catch (error) {
      console.error('Direct payment error:', error);
      return {
        success: false,
        error: this.formatErrorMessage(error)
      };
    }
  }

  private async handleBictorysPayment(params: {
    sessionId: string;
    provider: PaymentProvider;
    amount: number;
    customerInfo: CustomerInfo;
    metadata?: Record<string, any>;
  }): Promise<PaymentResponse> {
    try {
      const bictorysProvider = this.mapToBictorysProvider(params.provider);
      if (!bictorysProvider) {
        throw new Error('Méthode de paiement non supportée par Bictorys');
      }
  
      const paymentRequestData = {
        amount: params.amount,
        currency: 'XOF',
        provider: bictorysProvider,
        phoneNumber: params.customerInfo.phone.replace(/\s/g, ''),
        orderId: params.sessionId,
        successRedirectUrl: BICTORYS_CONFIG.successRedirectUrl,
        errorRedirectUrl: BICTORYS_CONFIG.errorRedirectUrl,
        webhookUrl: BICTORYS_CONFIG.webhookUrl,
        customer: {
          name: params.customerInfo.name,
          phone: params.customerInfo.phone,
          email: params.customerInfo.email,
          city: params.customerInfo.city,
          country: 'SN'
        },
        metadata: {
          ...params.metadata,
          source: 'chatbot',
          initiatedAt: new Date().toISOString()
        }
      };
  
      // Enregistrer d'abord la transaction comme pending
      const { data: transaction } = await this.createTransaction({
        orderId: params.sessionId,
        provider: params.provider,
        amount: params.amount,
        reference: this.generateReference(params.sessionId),
        paymentUrl: '',  // Sera mis à jour après la réponse de Bictorys
        customerInfo: params.customerInfo
      });
  
      // Appeler l'API Bictorys
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/bictorys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentRequestData),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'initialisation du paiement Bictorys');
      }
  
      const data = await response.json();
  
      // Mettre à jour la transaction avec les informations de Bictorys
      await this.updateTransactionStatus(
        transaction.id,
        'pending',
        {
          bictorysTransactionId: data.transactionId,
          paymentUrl: data.paymentUrl,
          updatedAt: new Date().toISOString()
        }
      );
  
      return {
        success: true,
        transactionId: transaction.id,
        reference: data.transactionId,
        paymentUrl: data.paymentUrl
      };
  
    } catch (error) {
      console.error('Bictorys payment error:', error);
      // Fallback to direct payment if Bictorys fails
      console.log('Falling back to direct payment...');
      return this.handleDirectPayment(params);
    }
  }
  
  private mapToBictorysProvider(provider: PaymentProvider): string | null {
    const providerMap: Record<PaymentProvider, string | null> = {
      'WAVE': 'wave_money',
      'ORANGE_MONEY': 'orange_money',
      'STRIPE': null,
      'CASH': null
    };
    return providerMap[provider] || null;
  }

  private async createTransaction(params: {
    orderId: string;
    provider: PaymentProvider;
    amount: number;
    reference: string;
    paymentUrl: string;
    customerInfo: CustomerInfo;
  }) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert([{
        order_id: params.orderId,
        provider: params.provider,
        amount: params.amount,
        currency: 'XOF',
        status: 'pending',
        reference: params.reference,
        metadata: {
          customerInfo: params.customerInfo,
          paymentUrl: params.paymentUrl,
          directPayment: true,
          testMode: this.isTestMode,
          createdAt: new Date().toISOString()
        }
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private isValidAmount(amount: number): boolean {
    return amount >= 100 && amount <= 10000000;
  }

  private isValidCustomerInfo(info: CustomerInfo): boolean {
    return !!(
      info.name &&
      info.phone &&
      info.city &&
      info.phone.replace(/\s/g, '').match(/^(70|75|76|77|78)\d{7}$/)
    );
  }

  private generateReference(sessionId: string): string {
    return `PAY_${Date.now()}_${sessionId}`;
  }

  private buildPaymentUrl(provider: PaymentProvider, amount: number): string | null {
    switch (provider) {
      case 'WAVE':
        return `${PAYMENT_URLS.WAVE}/?amount=${amount}`;
      case 'ORANGE_MONEY':
        return PAYMENT_URLS.ORANGE_MONEY;
      default:
        return null;
    }
  }

  private formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Une erreur est survenue lors du paiement';
  }

  private async updateTransactionStatus(
    transactionId: string,
    status: 'pending' | 'completed' | 'failed',  
    metadata?: Record<string, any>
  ): Promise<void> {
    const { error } = await supabase
      .from('payment_transactions')
      .update({
        status,
        metadata: {
          ...metadata,
          updatedAt: new Date().toISOString()
        }
      })
      .eq('id', transactionId);
  
    if (error) {
      console.error('Error updating transaction status:', error);
    }
  }
}