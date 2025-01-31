// src/features/product/hooks/useConversationalPayment.ts
import { useCallback } from 'react';
import { useChatContext } from '../context/ChatContext';
import { useState } from 'react';
import type { PaymentStage } from '../types/chat';
import type { PaymentMethodType } from '@/types/payment';
import { STRUCTURED_CHOICES } from '../utils/conversationChoices';
import { toMutableArray } from '../utils/arrayHelpers';
import useCountryStore from '@/core/hooks/useCountryStore';
import { PaymentGateway } from '@/lib/services/payment-gateway';

const paymentGateway = new PaymentGateway();

export function useConversationalPayment() {
  const { state, dispatch } = useChatContext();
  const [paymentStage, setPaymentStage] = useState<PaymentStage>('init');

  const handlePaymentSuccess = async (response: any, method: string) => {
    dispatch({
      type: 'SET_PAYMENT_MODAL',
      payload: {
        isOpen: true,
        iframeUrl: response.checkoutUrl
      }
    });

    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        type: 'assistant',
        content: '💳 Paiement en cours de traitement...',
        metadata: {
          paymentStatus: 'processing',
          transactionId: response.transactionId
        }
      }
    });

    setPaymentStage('processing');
  };

  const handlePaymentError = async (method: string, error?: string) => {
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        type: 'assistant',
        content: `❌ Le paiement avec ${method} a échoué. ${error || 'Veuillez réessayer ou choisir un autre mode de paiement.'}`,
        choices: toMutableArray(STRUCTURED_CHOICES.afterPaymentError)
      }
    });

    setPaymentStage('init');
  };

  const initiatePaymentFlow = useCallback(async () => {
    try {
      setPaymentStage('method');
      const { currentCountry } = useCountryStore.getState();
      
      if (!currentCountry) {
        throw new Error('Pays non sélectionné');
      }

      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          type: 'assistant',
          content: 'Comment souhaitez-vous effectuer le paiement ?',
          choices: toMutableArray(STRUCTURED_CHOICES.paymentMethods)
        }
      });

    } catch (error) {
      await handlePaymentError('paiement', error instanceof Error ? error.message : undefined);
    }
  }, [dispatch]);

  const handlePaymentMethod = useCallback(async (method: string) => {
    try {
      setPaymentStage('processing');

      const customerInfo = {
        name: `${state.orderData.firstName} ${state.orderData.lastName}`,
        phone: state.orderData.phone,
        city: state.orderData.city,
        email: ''
      };

      const { currentCountry } = useCountryStore.getState();
      if (!currentCountry) {
        throw new Error('Pays non sélectionné');
      }

      const total = state.orderData.summary?.total;
      if (!total) {
        throw new Error('Montant de la commande non défini');
      }

      const response = await paymentGateway.initiatePayment({
        amount: total.value,
        currency: currentCountry.currency?.code ?? 'XOF',
        provider: method as PaymentMethodType,
        customerInfo,
        orderId: parseInt(state.orderData.orderId || Date.now().toString(), 10)
      });

      if (response.success) {
        await handlePaymentSuccess(response, method);
      } else {
        await handlePaymentError(method, response.error);
      }
    } catch (error) {
      await handlePaymentError(method);
    }
  }, [state.orderData, dispatch]);

  const completePaymentFlow = useCallback(async () => {
    try {
      setPaymentStage('complete');
      
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          type: 'assistant',
          content: '✅ Paiement confirmé ! Votre commande sera traitée dans les plus brefs délais.',
          choices: toMutableArray(STRUCTURED_CHOICES.afterPayment)
        }
      });
    } catch (error) {
      await handlePaymentError('confirmation');
    }
  }, [dispatch]);

  return {
    paymentStage,
    initiatePaymentFlow,
    handlePaymentMethod,
    completePaymentFlow
  };
}