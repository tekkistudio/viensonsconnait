// src/lib/services/bictorys.service.ts
import { supabase } from '@/lib/supabase';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { errorService } from './error.service';
import { PAYMENT_CONFIG, validatePaymentConfig } from '@/lib/config/payment.config';
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
  private readonly axiosInstance: AxiosInstance;
  private readonly mode: 'test' | 'live';
  private readonly apiBaseUrl: string;

  constructor() {
    try {
      validatePaymentConfig(typeof window === 'undefined');

      if (!PAYMENT_CONFIG.bictorys.publicKey) {
        throw new Error('BICTORYS_API_KEY is not configured');
      }

      // Utiliser le proxy pour les appels API côté client
      this.apiBaseUrl = typeof window === 'undefined'
        ? PAYMENT_CONFIG.bictorys.apiUrl!
        : '/api/bictorys';

      this.axiosInstance = axios.create({
        baseURL: this.apiBaseUrl,
        headers: {
          'X-Api-Key': PAYMENT_CONFIG.bictorys.publicKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      this.mode = PAYMENT_CONFIG.mode;
      this.setupInterceptors();
    } catch (error) {
      console.error('BictorysService initialization error:', error);
      
      this.axiosInstance = axios.create();
      this.mode = 'test';
      this.apiBaseUrl = '';
      
      if (typeof window === 'undefined') {
        throw error;
      }
    }
  }

  getApiUrl(): string {
    return this.apiBaseUrl;
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
        return Promise.reject(this.formatAxiosError(error));
      }
    );
  }

  private formatAxiosError(error: AxiosError): Error {
    let message = 'Une erreur est survenue';
    let code = 'UNKNOWN_ERROR';
    let shouldRetry = false;

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      switch (status) {
        case 400:
          message = data.message || 'Requête invalide';
          code = 'INVALID_REQUEST';
          break;
        case 401:
          message = 'Clé API invalide';
          code = 'INVALID_API_KEY';
          break;
        case 403:
          message = 'Accès refusé';
          code = 'ACCESS_DENIED';
          break;
        case 404:
          message = 'Service temporairement indisponible';
          code = 'SERVICE_UNAVAILABLE';
          shouldRetry = true;
          break;
        default:
          message = data.message || 'Erreur serveur';
          code = 'SERVER_ERROR';
          shouldRetry = true;
      }
    } else if (error.request) {
      if (error.code === 'ECONNABORTED') {
        message = 'Le service met trop de temps à répondre';
        code = 'TIMEOUT';
        shouldRetry = true;
      } else {
        message = 'Problème de connexion';
        code = 'NETWORK_ERROR';
        shouldRetry = true;
      }
    }

    return new Error(JSON.stringify({
      userMessage: message,
      errorCode: code,
      shouldRetry,
      technicalDetails: {
        originalError: error.message,
        status: error.response?.status,
        data: error.response?.data
      }
    }));
  }

  async createPaymentSession(params: BictorysPaymentParams): Promise<BictorysPaymentSession> {
    try {
      const paymentConfig = {
        amount: params.amount,
        currency: params.currency || 'XOF',
        provider: params.provider,
        merchantReference: params.merchantReference,
        successRedirectUrl: params.successRedirectUrl,
        errorRedirectUrl: params.errorRedirectUrl,
        callbackUrl: params.callbackUrl,
        customer: {
          name: params.customer.name,
          phone: params.customer.phone.replace(/\s/g, ''),
          email: params.customer.email || '',
          city: params.customer.city,
          country: params.customer.country
        }
      };
  
      const response = await this.axiosInstance.post<BictorysPaymentResponse>(
        '/pay/v1/charges',
        paymentConfig
      );
  
      if (!response.data || !response.data.link) {
        throw new Error('Réponse invalide du service de paiement');
      }
  
      return {
        iframeUrl: response.data.link,
        transactionId: response.data.chargeId,
        opToken: response.data.opToken
      };
    } catch (error) {
      // L'erreur est déjà formatée par l'intercepteur
      throw error;
    }
  }

  async handleWebhook(payload: BictorysWebhookPayload, signature: string): Promise<{ success: boolean; transaction: PaymentTransaction }> {
    try {
      // Vérification de la signature selon la documentation Bictorys
      if (signature !== PAYMENT_CONFIG.bictorys.webhookSecret) {
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
            mode: this.mode,
            updatedAt: new Date().toISOString()
          }
        })
        .eq('id', transaction.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Mise à jour du statut de la commande si le paiement est réussi
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
}

export const bictorysService = new BictorysService();