// src/app/chat/payment-canceled/page.ts
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';

// Composant interne qui utilise useSearchParams
function PaymentCanceledContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatStore = useChatStore();
  
  const orderId = searchParams.get('order_id') || undefined;

  const handleReturnToChat = () => {
    try {
      router.back();
    } catch {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Paiement annulé</h1>
          <p className="text-gray-600 mb-6">
            {orderId ? `La commande #${orderId} a été annulée.` : 'Le paiement a été annulé.'}
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-gray-500">Vous pouvez réessayer le paiement ou nous contacter si vous rencontrez des difficultés.</p>
          
          <div className="space-y-3">
            <button
              onClick={handleReturnToChat}
              className="w-full bg-[#FF7E93] text-white px-6 py-3 rounded-lg hover:bg-[#FF7E93]/90 transition-colors"
            >
              Retourner sur la page produit
            </button>
            
            <button
              onClick={() => router.push('https://wa.me/221781362728')}
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Nous contacter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant de chargement
function PaymentCanceledLoading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Chargement...</p>
      </div>
    </div>
  );
}

// Composant principal exporté avec Suspense
export default function PaymentCanceledPage() {
  return (
    <Suspense fallback={<PaymentCanceledLoading />}>
      <PaymentCanceledContent />
    </Suspense>
  );
}