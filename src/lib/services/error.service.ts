// src/lib/services/error.service.ts
import { pusherServer } from '@/lib/pusher';
import { supabase } from '@/lib/supabase';

interface ErrorContext {
  orderId?: string | number;
  customerInfo?: any;
  paymentMethod?: string;
  additionalData?: any;
}

export class ErrorService {
  private static instance: ErrorService;

  private constructor() {}

  public static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  async handlePaymentError(error: Error, context: ErrorContext) {
    try {
      // Log l'erreur dans Supabase
      await this.logError('PAYMENT', error, context);

      // Notifier le client via Pusher si orderId est présent
      if (context.orderId) {
        const errorInfo = {
          message: this.getUserFriendlyMessage(error),
          code: this.getErrorCode(error),
          timestamp: new Date().toISOString()
        };

        try {
          await pusherServer.trigger(
            `order_${context.orderId}`,
            'payment_error',
            errorInfo
          );
        } catch (pusherError) {
          console.error('Pusher notification failed:', pusherError);
        }

        // Mettre à jour le statut de la transaction
        try {
          await supabase
            .from('payment_transactions')
            .update({
              status: 'FAILED',
              metadata: {
                error: {
                  message: error.message,
                  code: this.getErrorCode(error),
                  timestamp: new Date().toISOString(),
                  context: {
                    paymentMethod: context.paymentMethod,
                    additionalData: context.additionalData
                  }
                }
              }
            })
            .eq('order_id', context.orderId);
        } catch (dbError) {
          console.error('Transaction update failed:', dbError);
        }
      }

      return {
        userMessage: this.getUserFriendlyMessage(error),
        errorCode: this.getErrorCode(error),
        shouldRetry: this.shouldRetryPayment(error),
        technicalDetails: {
          message: error.message,
          stack: error.stack,
          context: context
        }
      };
    } catch (handlingError) {
      console.error('Error handling failed:', handlingError);
      return {
        userMessage: "Une erreur inattendue s'est produite. Veuillez réessayer.",
        errorCode: 'HANDLING_ERROR',
        shouldRetry: true
      };
    }
  }

  private async logError(type: string, error: Error, context: any) {
    try {
      await supabase.from('error_logs').insert([{
        error_type: type,
        error_message: error.message,
        error_stack: error.stack,
        context: {
          ...context,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV
        },
        created_at: new Date().toISOString()
      }]);
    } catch (logError) {
      console.error('Error logging failed:', logError);
    }
  }

  private getUserFriendlyMessage(error: Error): string {
    const errorMessage = error.message.toLowerCase();

    // Messages spécifiques selon le type d'erreur
    if (errorMessage.includes('cors')) {
      return "Un problème technique empêche actuellement le paiement. Notre équipe a été notifiée.";
    }
    if (errorMessage.includes('404')) {
      return "Le service de paiement est temporairement indisponible. Veuillez réessayer dans quelques instants.";
    }
    if (errorMessage.includes('timeout')) {
      return "La connexion au service de paiement a pris trop de temps. Veuillez réessayer.";
    }
    if (errorMessage.includes('network')) {
      return "Problème de connexion détecté. Veuillez vérifier votre connexion internet et réessayer.";
    }
    if (errorMessage.includes('api_key')) {
      return "Configuration du paiement invalide. Notre équipe technique a été notifiée.";
    }
    if (errorMessage.includes('invalid phone')) {
      return "Le numéro de téléphone fourni n'est pas valide. Veuillez vérifier et réessayer.";
    }
    if (errorMessage.includes('insufficient balance')) {
      return "Solde insuffisant pour effectuer le paiement. Veuillez réessayer avec un autre moyen de paiement.";
    }
    if (errorMessage.includes('transaction_id')) {
      return "La transaction n'a pas pu être complétée. Veuillez réessayer.";
    }

    // Message par défaut
    return "Une erreur est survenue lors du paiement. Notre équipe technique a été notifiée. Veuillez réessayer ou choisir un autre mode de paiement.";
  }

  private getErrorCode(error: Error): string {
    const errorMessage = error.message.toLowerCase();

    const errorCodes: Record<string, string> = {
      cors: 'CORS_ERROR',
      404: 'SERVICE_UNAVAILABLE',
      timeout: 'TIMEOUT_ERROR',
      network: 'NETWORK_ERROR',
      api_key: 'CONFIG_ERROR',
      'invalid phone': 'INVALID_PHONE',
      'insufficient balance': 'INSUFFICIENT_BALANCE',
      transaction_id: 'TRANSACTION_ERROR'
    };

    // Rechercher le code d'erreur correspondant
    for (const [key, code] of Object.entries(errorCodes)) {
      if (errorMessage.includes(key)) {
        return code;
      }
    }

    return 'UNKNOWN_ERROR';
  }

  private shouldRetryPayment(error: Error): boolean {
    const retryableErrors = [
      'timeout',
      'network',
      '404',
      'connection refused',
      'service unavailable',
      'transaction_id'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(errType => errorMessage.includes(errType));
  }

  // Méthode utilitaire pour normaliser les messages d'erreur
  private normalizeErrorMessage(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'object' && error !== null) {
      return error.message || JSON.stringify(error);
    }
    return 'Une erreur inconnue est survenue';
  }
}

export const errorService = ErrorService.getInstance();