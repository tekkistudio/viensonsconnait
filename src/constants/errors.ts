// src/constants/errors.ts

export const ErrorTypes = {
  // Erreurs système
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  AI_ERROR: 'AI_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  
  // Erreurs de processus
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  PAYMENT_METHOD_ERROR: 'PAYMENT_METHOD_ERROR',
  ORDER_SUMMARY_ERROR: 'ORDER_SUMMARY_ERROR',
  FORM_STEP_ERROR: 'FORM_STEP_ERROR',
  AI_RESPONSE_ERROR: 'AI_RESPONSE_ERROR'
} as const;

export type ErrorCategory = typeof ErrorTypes[keyof typeof ErrorTypes];

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  FATAL = 'FATAL'
}

// Interface pour les données d'erreur
export interface ErrorData {
  timestamp: string;
  path: string;
  additionalData?: Record<string, any>;
}

// Interface pour la réponse du gestionnaire d'erreurs
export interface ErrorManagerResponse {
  userMessage: string;
  choices?: string[];
  errorType: ErrorCategory;
  severity?: ErrorSeverity;
}