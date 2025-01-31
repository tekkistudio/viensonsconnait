// src/lib/services/bictorys.service.ts
import { supabase } from '@/lib/supabase';
import axios, { AxiosInstance } from 'axios';
import { errorService } from './error.service';
import { API_CONFIG } from '@/lib/config/api';
import type {
  IBictorysService,
  BictorysPaymentParams,
  BictorysPaymentSession,
  PaymentTransaction,
  PaymentProvider,
  BictorysProvider,
  BictorysPaymentResponse,
  BictorysWebhookPayload
} from '@/types/payment';

export class BictorysService implements IBictorysService {
  private axiosInstance: AxiosInstance;
  private readonly config: {
    API_URL: string;
    API_KEY: string | undefined;
    WEBHOOK_SECRET: string | undefined;
    ENV: 'test' | 'live';
  };

  constructor() {
    this.config = {
      API_URL: API_CONFIG.bictorys.baseUrl,
      API_KEY: API_CONFIG.bictorys.apiKey,
      WEBHOOK_SECRET: process.env.BICTORYS_WEBHOOK_SECRET,
      ENV: process.env.NODE_ENV === 'production' ? 'live' : 'test'
    };

    if (!this.config.API_KEY) {
      console.error('Configuration manquante - API_KEY:', this.config.API_KEY);
      throw new Error('NEXT_PUBLIC_BICTORYS_API_KEY is not configured');
    }

    this.axiosInstance = axios.create({
      baseURL: this.config.API_URL,
      headers: {
        'X-Api-Key': this.config.API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(request => {
      console.log('🚀 Requête Bictorys:', {
        url: request.url,
        method: request.method,
        data: request.data,
        headers: request.headers
      });
      return request;
    });

    this.axiosInstance.interceptors.response.use(
      response => {
        console.log('✅ Réponse Bictorys:', response.data);
        return response;
      },
      error => {
        console.error('❌ Erreur Bictorys:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          config: error.config
        });
        return Promise.reject(error);
      }
    );
  }

  private async checkApiHealth(): Promise<void> {
    try {
      console.log('Checking Bictorys API health...');
      const response = await this.axiosInstance.get('/health');
      console.log('API Health response:', response.data);
    } catch (error) {
      console.error('API Health check failed:', error);
      throw new Error('Service de paiement temporairement indisponible');
    }
  }

  async createPaymentSession(params: BictorysPaymentParams): Promise<BictorysPaymentSession> {
    try {
      if (!params.customerPhone) {
        throw new Error('Le numéro de téléphone est requis');
      }

      await this.checkApiHealth();

      const reference = this.generateReference(params.orderId);

      const paymentConfig = {
        amount: params.amount,
        currency: params.currency || 'XOF',
        payment_type: params.provider,
        paymentReference: reference,
        successRedirectUrl: `${window.location.origin}/payment/success`,
        errorRedirectUrl: `${window.location.origin}/payment/error`,
        callbackUrl: `${window.location.origin}/api/webhooks/bictorys`,
        country: params.customerCountry || 'SN',
        customer: {
          name: params.customerName || '',
          phone: params.customerPhone.replace(/\s/g, ''),
          email: params.customerEmail,
          city: params.customerCity || '',
          country: params.customerCountry || 'SN'
        },
        metadata: {
          orderId: params.orderId,
          environment: this.config.ENV,
          provider: params.provider,
          initiatedAt: new Date().toISOString()
        }
      };

      console.log('Initiating payment with config:', paymentConfig);

      const response = await this.axiosInstance.post<BictorysPaymentResponse>(
        '/pay/v1/charges',
        paymentConfig
      );

      if (!response.data) {
        throw new Error('Réponse invalide du service de paiement');
      }

      await this.saveTransaction({
        orderId: params.orderId,
        reference,
        provider: this.mapProviderToMain(params.provider),
        amount: params.amount,
        currency: params.currency,
        response: response.data
      });

      return {
        iframeUrl: response.data.link || response.data.paymentUrl || '',
        transactionId: response.data.transactionId || response.data.id || ''
      };
    } catch (error) {
      const errorResponse = await this.handleError(error, {
        orderId: params.orderId,
        paymentMethod: this.mapProviderToMain(params.provider),
        amount: params.amount,
        currency: params.currency
      });
      throw new Error(JSON.stringify(errorResponse));
    }
  }

  async handleWebhook(
    payload: BictorysWebhookPayload,
    signature: string
  ): Promise<{ success: boolean; transaction: PaymentTransaction }> {
    try {
      if (signature !== this.config.WEBHOOK_SECRET) {
        throw new Error('Invalid webhook signature');
      }

      const { data: transaction, error: findError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('reference', payload.merchantReference)
        .single();

      if (findError || !transaction) {
        throw new Error(`Transaction non trouvée: ${payload.merchantReference}`);
      }

      const status = this.mapPaymentStatus(payload.status);
      
      const { data: updatedTransaction, error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          status,
          metadata: {
            ...transaction.metadata,
            webhookPayload: payload,
            updatedAt: new Date().toISOString()
          }
        })
        .eq('id', transaction.id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (status === 'completed') {
        await supabase
          .from('orders')
          .update({
            status: 'PAID',
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.order_id);
      }

      return { success: true, transaction: updatedTransaction };
    } catch (error) {
      console.error('Erreur webhook:', error);
      throw error;
    }
  }

  private generateReference(orderId: number): string {
    return `TR_${Date.now()}_${orderId}`;
  }

  private mapPaymentStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'succeeded': 'completed',
      'failed': 'failed',
      'cancelled': 'cancelled',
      'pending': 'pending',
      'processing': 'processing',
      'reversed': 'cancelled',
      'authorized': 'pending'
    };
    return statusMap[status.toLowerCase()] || 'pending';
  }

  private mapProviderToMain(provider: BictorysProvider): PaymentProvider {
    const providerMap: Record<BictorysProvider, PaymentProvider> = {
      'wave_money': 'WAVE',
      'orange_money': 'ORANGE_MONEY',
      'card': 'STRIPE'
    };
    return providerMap[provider];
  }

  private async saveTransaction(params: {
    orderId: number;
    reference: string;
    provider: PaymentProvider;
    amount: number;
    currency: string;
    response: BictorysPaymentResponse;
  }): Promise<void> {
    const { error } = await supabase
      .from('payment_transactions')
      .insert([{
        order_id: params.orderId,
        provider: params.provider,
        amount: params.amount,
        currency: params.currency,
        status: 'pending',
        reference: params.reference,
        metadata: {
          bictorysResponse: params.response,
          initiatedAt: new Date().toISOString()
        }
      }]);

    if (error) {
      console.error('Erreur lors de l\'enregistrement de la transaction:', error);
      throw error;
    }
  }

  private async handleError(error: any, context: {
    orderId: number;
    paymentMethod: PaymentProvider;
    amount: number;
    currency: string;
  }): Promise<any> {
    return await errorService.handlePaymentError(
      error instanceof Error ? error : new Error(String(error)),
      {
        orderId: context.orderId,
        paymentMethod: context.paymentMethod,
        additionalData: {
          amount: context.amount,
          currency: context.currency
        }
      }
    );
  }
}

export const bictorysService = new BictorysService();