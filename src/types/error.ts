// src/types/error.ts

export type ErrorCategory =
  | 'SYSTEM_ERROR'
  | 'PAYMENT_ERROR'
  | 'PAYMENT_METHOD_ERROR'
  | 'ORDER_SUMMARY_ERROR'
  | 'FORM_STEP_ERROR'
  | 'AI_RESPONSE_ERROR';

export interface ErrorData {
  timestamp: string;
  path: string;
  additionalData?: Record<string, any>;
}

export interface ErrorManagerResponse {
  userMessage: string;
  choices?: string[];
  errorType: ErrorCategory;
}

export type ErrorHandler = (
  error: Error,
  category: ErrorCategory,
  data: ErrorData
) => Promise<ErrorManagerResponse>;


export type PaymentErrorType = 
  | 'PAYMENT_ERROR'
  | 'PAYMENT_METHOD_ERROR'
  | 'ORDER_SUMMARY_ERROR'
  | 'FORM_STEP_ERROR'
  | 'SYSTEM_ERROR'
  | 'AI_RESPONSE_ERROR';
