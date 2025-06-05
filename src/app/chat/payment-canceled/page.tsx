// src/app/chat/payment-canceled/page.tsx - VERSION CORRIGÉE
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import type { ChatMessage, ConversationStep } from '@/types/chat';

export default function PaymentCanceledPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatStore = useChatStore();
  const [isRedirecting, setIsRedirecting] = useState(true);
  
  // ✅ CORRECTION: Gestion sécurisée de orderId
  const orderId = searchParams.get('order_id') || undefined;

  useEffect(() => {
    const handlePaymentCanceled = async () => {
      try {
        // Créer un message d'annulation pour le chat
        const cancelMessage: ChatMessage = {
          type: 'assistant',
          content: `😔 **Paiement annulé**

Votre paiement pour la commande #${orderId || 'N/A'} a été annulé.

🔄 **Pas de souci !** Vous pouvez :
• Réessayer le paiement
• Choisir un autre mode de paiement
• Contacter notre équipe pour assistance

Que souhaitez-vous faire ?`,
          choices: [
            '🔄 Réessayer le paiement',
            '💳 Changer de mode de paiement',
            '📞 Contacter le support',
            '🛍️ Continuer mes achats'
          ],
          assistant: {
            name: 'Rose',
            title: 'Assistante VOSC'
          },
          metadata: {
            nextStep: 'payment_retry' as ConversationStep,
            orderId, // ✅ CORRECTION: orderId peut être undefined
            flags: { 
              paymentCanceled: true,
              needsPaymentRetry: true
            }
          },
          timestamp: new Date().toISOString()
        };

        // Ajouter le message au chat
        chatStore.addMessage(cancelMessage);
        
        // Mettre à jour le statut de paiement
        chatStore.updateOrderData({
          payment_status: 'cancelled'
        });

        // ✅ CORRECTION: Redirection sécurisée
        setTimeout(() => {
          setIsRedirecting(false);
          try {
            router.back();
          } catch {
            router.push('/');
          }
        }, 1500);

      } catch (error) {
        console.error('Error handling payment cancellation:', error);
        setIsRedirecting(false);
        router.push('/');
      }
    };

    if (orderId) {
      handlePaymentCanceled();
    } else {
      router.push('/');
    }
  }, [orderId, chatStore, router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-orange-600 mb-2">Paiement annulé</h1>
          <p className="text-gray-600">
            Le paiement pour la commande #{orderId || 'N/A'} a été annulé.
          </p>
        </div>

        {isRedirecting && (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF7E93] mx-auto"></div>
            <p className="text-gray-500">Retour vers le chat...</p>
          </div>
        )}

        {!isRedirecting && (
          <div className="space-y-4">
            <p className="text-gray-500">Vous pouvez réessayer le paiement dans le chat.</p>
            <button
              onClick={() => {
                try {
                  router.back();
                } catch {
                  router.push('/');
                }
              }}
              className="bg-[#FF7E93] text-white px-6 py-2 rounded-lg hover:bg-[#FF7E93]/90 transition-colors"
            >
              Retour au chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}