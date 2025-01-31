// src/hooks/usePayment.ts
import { useState, useCallback } from 'react';
import { PaymentGateway } from '@/lib/services/payment-gateway';
import type { 
  PaymentProvider, 
  PaymentInitiationParams,
  PaymentResult 
} from '@/types/payment';

const paymentGateway = new PaymentGateway();

interface UsePaymentProps {
  onSuccess?: (result: PaymentResult) => void;
  onError?: (error: Error) => void;
}

export function usePayment({ onSuccess, onError }: UsePaymentProps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    provider?: PaymentProvider;
    iframeUrl?: string;
  }>({
    isOpen: false
  });

  const initializePayment = useCallback(async (params: PaymentInitiationParams) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await paymentGateway.initiatePayment(params);
      
      if (!result.success) {
        throw new Error(result.error || 'Échec de l\'initialisation du paiement');
      }

      if (result.checkoutUrl) {
        setModalConfig({
          isOpen: true,
          provider: params.provider,
          iframeUrl: result.checkoutUrl
        });
      }

      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur inconnue');
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onError]);

  const closeModal = useCallback(() => {
    setModalConfig({ isOpen: false });
  }, []);

  return {
    initializePayment,
    closeModal,
    isLoading,
    error,
    modalConfig
  };
}