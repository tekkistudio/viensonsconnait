// src/features/product/components/ProductChat/components/PaymentMessageHandler.tsx
'use client';

import React from 'react';
import { useEffect } from 'react';
import { Phone, CreditCard } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useChatContext } from '../../../context/ChatContext';
import { pusherClient } from '@/lib/pusher';
import { UnifiedPaymentModal } from '@/components/payment/UnifiedPaymentModal';
import { Alert } from '@/components/ui/alert';

type PaymentStatus = 'completed' | 'pending' | 'processing' | 'failed';

interface PaymentMessageData {
  amount: number;
  currency: string;
  orderId: number;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
    city: string;
  };
}

interface PaymentStatusUpdate {
  status: 'success' | 'failed';
  transactionId: string;
  error?: string;
}

interface PaymentMessageHandlerProps {
  data: PaymentMessageData;
}

export function PaymentMessageHandler({ data }: PaymentMessageHandlerProps) {
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<'mobile' | 'card' | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const context = useChatContext();

  useEffect(() => {
    if (!data?.orderId) return;

    const channel = pusherClient.subscribe(`order-${data.orderId}`);
    
    channel.bind('payment-status', (status: PaymentStatusUpdate) => {
      // Réinitialiser les erreurs précédentes
      setError(null);

      try {
        context.handleUserChoice('system-message');
        context.dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            type: 'assistant',
            content: status.status === 'success'
              ? `✅ Paiement confirmé ! Votre commande sera livrée à ${data.customerInfo?.city || 'votre adresse'}.`
              : `❌ ${status.error || 'Le paiement a échoué'}. Voulez-vous réessayer ?`,
            metadata: {
              paymentStatus: status.status === 'success' ? 'completed' as PaymentStatus : 'failed' as PaymentStatus,
              transactionId: status.transactionId
            }
          }
        });

        if (status.status === 'success') {
          setShowPaymentModal(false);
        }
      } catch (error) {
        console.error('Erreur lors du traitement du statut de paiement:', error);
        setError("Une erreur est survenue lors du traitement du paiement. Veuillez réessayer.");
      }
    });

    // Gérer les erreurs de connexion Pusher
    channel.bind('pusher:subscription_error', (error: any) => {
      console.error('Pusher subscription error:', error);
      setError("Problème de connexion au service de paiement. Veuillez réessayer.");
    });

    return () => {
      try {
        pusherClient.unsubscribe(`order-${data.orderId}`);
      } catch (error) {
        console.error('Erreur lors de la désinscription Pusher:', error);
      }
    };
  }, [data?.orderId, data?.customerInfo?.city, context]);

  const handlePaymentComplete = (result: { 
    success: boolean; 
    transactionId?: string; 
    error?: string; 
  }) => {
    setShowPaymentModal(false);
    setError(null);

    if (!result.success) {
      const errorMessage = result.error || "Le paiement n'a pas pu être initié";
      setError(errorMessage);
      
      context.dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          type: 'assistant',
          content: `${errorMessage}. Voulez-vous réessayer ?`,
          metadata: {
            error: result.error,
            paymentStatus: 'failed' as PaymentStatus
          }
        }
      });
    }
  };

  const paymentOptions = [
    {
      id: 'mobile',
      label: 'Paiement Mobile',
      description: 'Wave, Orange Money',
      icon: Phone
    },
    {
      id: 'card',
      label: 'Carte Bancaire',
      description: 'Visa, Mastercard',
      icon: CreditCard
    }
  ];

  // Validation des données requises
  if (!data?.amount || !data?.currency || !data?.orderId) {
    return (
      <Alert variant="destructive">
        Configuration de paiement invalide. Veuillez réessayer.
      </Alert>
    );
  }

  return (
    <div className="space-y-4 max-w-md mx-auto bg-white p-4 rounded-lg shadow-sm">
      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="text-center mb-4">
        <div className="text-xl font-semibold text-gray-900">
          {data.amount.toLocaleString()} {data.currency}
        </div>
        <div className="text-sm text-gray-500">Choisissez votre mode de paiement</div>
      </div>

      <div className="grid gap-3">
        {paymentOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Button
              key={option.id}
              variant="outline"
              className="w-full p-4 h-auto flex items-center gap-3"
              onClick={() => {
                setError(null);  // Réinitialiser les erreurs
                setPaymentMethod(option.id as 'mobile' | 'card');
                setShowPaymentModal(true);
              }}
            >
              <div className="p-2 bg-gray-50 rounded-full">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-gray-500">{option.description}</div>
              </div>
            </Button>
          );
        })}
      </div>

      {showPaymentModal && (
        <UnifiedPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setError(null);  // Réinitialiser les erreurs
          }}
          amount={data.amount}
          currency={data.currency}
          customerInfo={data.customerInfo}
          orderId={data.orderId}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
}