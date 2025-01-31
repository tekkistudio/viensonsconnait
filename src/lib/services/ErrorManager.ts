// src/lib/services/ErrorManager.ts
import { supabase } from "@/lib/supabase";
import { ErrorTypes, ErrorCategory, ErrorSeverity } from '@/constants/errors';

interface ErrorContext {
  userId?: string;
  path?: string;
  timestamp: string;
  input?: any;
  stack?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorResponse {
  userMessage: string;
  choices?: string[];
  severity: ErrorSeverity;
  shouldRetry: boolean;
}

export class ErrorManager {
  private static instance: ErrorManager;
  
  private readonly errorResponses: Record<ErrorCategory, ErrorResponse> = {
    [ErrorTypes.SYSTEM_ERROR]: {
      userMessage: "Une erreur système s'est produite. Veuillez réessayer.",
      choices: ["Réessayer", "Contacter le support"],
      severity: ErrorSeverity.HIGH,
      shouldRetry: true
    },
    [ErrorTypes.AI_ERROR]: {
      userMessage: "Je suis désolée, j'ai du mal à comprendre votre demande. Puis-je vous rediriger vers notre service client ?",
      choices: ["Réessayer", "Parler à un conseiller", "Voir les produits"],
      severity: ErrorSeverity.MEDIUM,
      shouldRetry: true
    },
    [ErrorTypes.DATABASE_ERROR]: {
      userMessage: "Je rencontre un problème technique. Pouvons-nous reprendre dans quelques instants ?",
      choices: ["Réessayer plus tard", "Parler à un conseiller"],
      severity: ErrorSeverity.HIGH,
      shouldRetry: false
    },
    [ErrorTypes.VALIDATION_ERROR]: {
      userMessage: "Certaines informations semblent incorrectes. Pouvez-vous vérifier ?",
      choices: ["Modifier les informations", "Parler à un conseiller"],
      severity: ErrorSeverity.LOW,
      shouldRetry: true
    },
    [ErrorTypes.PAYMENT_ERROR]: {
      userMessage: "Le paiement n'a pas pu être traité. Voulez-vous essayer un autre moyen de paiement ?",
      choices: ["Choisir un autre moyen de paiement", "Parler à un conseiller"],
      severity: ErrorSeverity.HIGH,
      shouldRetry: true
    },
    [ErrorTypes.PAYMENT_METHOD_ERROR]: {
      userMessage: "Cette méthode de paiement n'est pas disponible pour le moment. Veuillez en choisir une autre.",
      choices: ["Choisir un autre moyen de paiement", "Parler à un conseiller"],
      severity: ErrorSeverity.MEDIUM,
      shouldRetry: true
    },
    [ErrorTypes.ORDER_SUMMARY_ERROR]: {
      userMessage: "Une erreur s'est produite lors de la création du résumé de votre commande.",
      choices: ["Réessayer", "Recommencer la commande"],
      severity: ErrorSeverity.MEDIUM,
      shouldRetry: true
    },
    [ErrorTypes.FORM_STEP_ERROR]: {
      userMessage: "Une erreur s'est produite lors de la validation du formulaire.",
      choices: ["Réessayer", "Modifier les informations"],
      severity: ErrorSeverity.LOW,
      shouldRetry: true
    },
    [ErrorTypes.AI_RESPONSE_ERROR]: {
      userMessage: "Je suis désolée, je n'ai pas pu traiter votre demande correctement.",
      choices: ["Réessayer", "Parler à un conseiller"],
      severity: ErrorSeverity.MEDIUM,
      shouldRetry: true
    },
    [ErrorTypes.NETWORK_ERROR]: {
      userMessage: "La connexion semble instable. Pouvez-vous réessayer ?",
      choices: ["Réessayer", "Parler à un conseiller"],
      severity: ErrorSeverity.MEDIUM,
      shouldRetry: true
    },
    [ErrorTypes.UNKNOWN_ERROR]: {
      userMessage: "Je suis désolée, quelque chose ne s'est pas passé comme prévu.",
      choices: ["Réessayer", "Parler à un conseiller"],
      severity: ErrorSeverity.HIGH,
      shouldRetry: false
    }
  };

  private constructor() {}

  public static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  public async handleError(
    error: Error,
    category: ErrorCategory,
    context: ErrorContext
  ): Promise<ErrorResponse> {
    // Log l'erreur dans Supabase
    await this.logError(error, category, context);

    // Notification pour les erreurs critiques
    if (this.errorResponses[category].severity === ErrorSeverity.HIGH || 
        this.errorResponses[category].severity === ErrorSeverity.FATAL) {
      await this.notifyCriticalError(error, category, context);
    }

    // Retourner la réponse appropriée
    return this.errorResponses[category];
  }

  private async logError(
    error: Error,
    category: ErrorCategory,
    context: ErrorContext
  ): Promise<void> {
    try {
      await supabase.from('error_logs').insert([{
        error_message: error.message,
        error_category: category,
        error_stack: error.stack,
        severity: this.errorResponses[category].severity,
        user_id: context.userId,
        path: context.path,
        timestamp: context.timestamp,
        input_data: context.input,
        additional_data: context.additionalData
      }]);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  private async notifyCriticalError(
    error: Error,
    category: ErrorCategory,
    context: ErrorContext
  ): Promise<void> {
    try {
      console.error(`CRITICAL ERROR [${category}]:`, {
        message: error.message,
        context,
        timestamp: new Date().toISOString()
      });
    } catch (notifyError) {
      console.error('Failed to notify critical error:', notifyError);
    }
  }

  public isRetryableError(category: ErrorCategory): boolean {
    return this.errorResponses[category].shouldRetry;
  }

  public getErrorResponse(category: ErrorCategory): ErrorResponse {
    return this.errorResponses[category];
  }
}

export type { ErrorCategory };
