// src/app/chat/payment-success/page.tsx - VERSION COMPLÈTE CORRIGÉE
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import type { ChatMessage, ConversationStep } from '@/types/chat';

// Composant interne qui utilise useSearchParams
function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatStore = useChatStore();
  const [isRedirecting, setIsRedirecting] = useState(true);
  
  // ✅ CORRECTION: Gestion sécurisée de orderId
  const orderId = searchParams.get('order_id') || undefined;

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      try {
        // Créer un message de succès pour le chat
        const successMessage: ChatMessage = {
          type: 'assistant',
          content: `🎉 **Paiement réussi !** 🎉

📋 **Commande #${orderId || 'N/A'}** confirmée avec succès !

✅ Votre paiement a été traité
📧 Un email de confirmation vous sera envoyé
📦 Votre commande sera expédiée sous 24-48h

🙏 **Merci pour votre confiance !**

Que souhaitez-vous faire maintenant ?`,
          choices: [
            '📦 Suivre ma commande',
            '📞 Nous contacter',
            '🛍️ Autres produits',
            '⭐ Donner un avis'
          ],
          assistant: {
            name: 'Rose',
            title: 'Assistante VOSC'
          },
          metadata: {
            nextStep: 'order_complete' as ConversationStep,
            orderId,
            flags: { 
              orderCompleted: true,
              paymentSuccessful: true
            }
          },
          timestamp: new Date().toISOString()
        };

        // Ajouter le message au chat
        chatStore.addMessage(successMessage);
        
        // Mettre à jour le statut de paiement
        chatStore.updateOrderData({
          payment_status: 'completed',
          status: 'confirmed'
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
        console.error('Error handling payment success:', error);
        setIsRedirecting(false);
        router.push('/');
      }
    };

    if (orderId) {
      handlePaymentSuccess();
    } else {
      router.push('/');
    }
  }, [orderId, chatStore, router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-green-600 mb-2">Paiement réussi !</h1>
          <p className="text-gray-600">
            Votre commande #{orderId || 'N/A'} a été confirmée avec succès.
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
            <p className="text-gray-500">Vous allez être redirigé automatiquement.</p>
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
              Continuer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Composant de chargement
function PaymentSuccessLoading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" />
        <p className="text-gray-600">Traitement du paiement...</p>
      </div>
    </div>
  );
}

// Composant principal exporté avec Suspense
export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentSuccessLoading />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}