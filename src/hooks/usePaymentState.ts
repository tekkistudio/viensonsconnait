// src/hooks/usePaymentState.ts
import { useState, useCallback } from 'react';

export interface PaymentState {
  isProcessing: boolean;
  error: string | null;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  transactionId: string | null;
}

export function usePaymentState() {
  const [state, setState] = useState<PaymentState>({
    isProcessing: false,
    error: null,
    status: 'idle',
    transactionId: null
  });

  const startPayment = useCallback(() => {
    setState(prev => ({
      ...prev,
      isProcessing: true,
      status: 'processing',
      error: null
    }));
  }, []);

  const completePayment = useCallback((transactionId: string) => {
    setState(prev => ({
      ...prev,
      isProcessing: false,
      status: 'completed',
      transactionId
    }));
  }, []);

  const failPayment = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      isProcessing: false,
      status: 'failed',
      error
    }));
  }, []);

  const resetPayment = useCallback(() => {
    setState({
      isProcessing: false,
      error: null,
      status: 'idle',
      transactionId: null
    });
  }, []);

  return {
    state,
    startPayment,
    completePayment,
    failPayment,
    resetPayment
  };
}