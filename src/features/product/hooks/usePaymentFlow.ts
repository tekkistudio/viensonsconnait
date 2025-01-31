// src/features/product/hooks/usePaymentFlow.ts
import { useCallback } from 'react';
import type { 
  OrderData,
  ChatAction,
  ChatMessage,
  UsePaymentFlowProps
} from '../types/chat';
import type {
  PaymentProvider,
  CustomerInfo,
  PaymentResult,
  PaymentInitiationParams
} from '@/types/payment';
import { ChatSyncService } from '@/services/ChatSyncService';
import { paymentGateway } from '@/lib/services/payment-gateway';
import { pusherClient } from '@/lib/pusher';

export function usePaymentFlow({
  orderData,
  dispatch,
  addBotResponse,
  calculateOrderTotal
}: UsePaymentFlowProps) {
  
  const handleMobilePayment = useCallback(async (
    method: PaymentProvider,
    customerInfo: CustomerInfo
  ) => {
    try {
      const total = calculateOrderTotal();
      
      // Sync order with database first
      const syncedOrder = await ChatSyncService.syncOrder(orderData);

      const response = await paymentGateway.initiatePayment({
        amount: total.value,
        currency: 'XOF',
        provider: method,
        customerInfo,
        orderId: parseInt(syncedOrder.id, 10),
        metadata: { source: 'chat_payment' }
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      dispatch({
        type: 'SET_PAYMENT_STATUS',
        payload: {
          status: 'processing',
          transactionId: response.transactionId
        }
      });

      // Subscribe to payment updates
      const channel = pusherClient.subscribe(`payment_${response.transactionId}`);
      
      channel.bind('payment_status', async (data: any) => {
        // Update payment status in database
        await ChatSyncService.updatePaymentStatus(syncedOrder.id, {
          type: 'payment-status',
          content: data.status === 'completed' ? '✅ Paiement confirmé!' : '❌ Échec du paiement',
          paymentData: {
            amount: total.value,
            currency: 'XOF',
            provider: method,
            status: data.status
          }
        });

        // If payment successful, update stock
        if (data.status === 'completed') {
          await ChatSyncService.updateProductStock(syncedOrder.id);
        }

        // Update UI
        dispatch({
          type: 'SET_PAYMENT_STATUS',
          payload: {
            status: data.status === 'completed' ? 'completed' : 'failed',
            transactionId: response.transactionId
          }
        });

        // Show message to user
        await addBotResponse([{
          type: 'assistant',
          content: data.status === 'completed'
            ? `🎉 Super ! Votre paiement a été effectué avec succès.\n\nRécapitulatif de votre commande :\n- Commande n°: ${syncedOrder.id}\n- Montant payé : ${total.formatted}\n- Mode de paiement : ${method}\n\nVotre commande sera livrée à l'adresse suivante :\n${orderData.address}\n${orderData.city}\n\nUn email de confirmation vous a été envoyé.\n\nQue puis-je faire d'autre pour vous ?`
            : "Une erreur est survenue lors du paiement. Voulez-vous réessayer ?",
          choices: data.status === 'completed'
            ? ["Suivre ma commande", "Voir mes autres commandes", "J'ai une question"]
            : ["Réessayer le paiement", "Changer de mode de paiement", "Parler à un conseiller"]
        }]);

        // Cleanup
        pusherClient.unsubscribe(`payment_${response.transactionId}`);
      });

      // Show payment modal
      dispatch({
        type: 'SET_PAYMENT_MODAL',
        payload: {
          isOpen: true,
          iframeUrl: response.checkoutUrl || ''
        }
      });

      // Show processing message
      await addBotResponse([{
        type: 'assistant',
        content: "💳 Paiement en cours... Je vous notifierai dès qu'il sera confirmé.",
        metadata: {
          paymentStatus: 'processing',
          transactionId: response.transactionId
        }
      }]);

    } catch (error) {
      console.error('Mobile payment error:', error);
      dispatch({
        type: 'SET_PAYMENT_STATUS',
        payload: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Une erreur est survenue'
        }
      });

      await addBotResponse([{
        type: 'assistant',
        content: "Une erreur est survenue lors de l'initiation du paiement. Voulez-vous réessayer ?",
        choices: ["Réessayer", "Choisir un autre mode de paiement"]
      }]);

      throw error;
    }
  }, [orderData, calculateOrderTotal, dispatch, addBotResponse]);

  const handleCashPayment = useCallback(async (
    customerInfo: CustomerInfo
  ) => {
    try {
      // Sync order with database first with CASH payment method
      const syncedOrder = await ChatSyncService.syncOrder({
        ...orderData,
        paymentMethod: 'CASH'
      });

      await addBotResponse([{
        type: 'assistant',
        content: `✅ Votre commande a bien été enregistrée !\n\n📦 Un livreur vous contactera au ${customerInfo.phone} pour organiser la livraison à :\n${orderData.address}\n${orderData.city}\n\n💰 Montant à payer à la livraison : ${calculateOrderTotal().formatted}\n\nUn email de confirmation a été envoyé à ${customerInfo.email || 'votre adresse email'}.\n\nÀ très bientôt ! 🙏`,
        choices: ["Suivre ma commande", "J'ai une question"]
      }]);

      return { success: true, orderId: syncedOrder.id };
    } catch (error) {
      console.error('Cash payment error:', error);
      await addBotResponse([{
        type: 'assistant',
        content: "Une erreur est survenue lors de l'enregistrement de votre commande. Voulez-vous réessayer ?",
        choices: ["Réessayer", "Choisir un autre mode de paiement"]
      }]);
      throw error;
    }
  }, [orderData, calculateOrderTotal, addBotResponse]);

  return {
    handleMobilePayment,
    handleCashPayment
  };
}