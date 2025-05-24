// src/components/payment/BictorysPaymentModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useChatContext } from '@/features/product/context/ChatContext';
import { pusherClient } from '@/lib/pusher';
import type { PaymentProvider, CustomerInfo } from '@/types/order';

interface BictorysPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export function BictorysPaymentModal({
  isOpen,
  onClose,
  amount,
  currency,
  orderId,
  customerInfo
}: BictorysPaymentModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const { dispatch } = useChatContext();
  const [pusherChannel, setPusherChannel] = useState<any>(null);

  useEffect(() => {
    return () => {
      if (pusherChannel) {
        pusherChannel.unsubscribe();
      }
    };
  }, [pusherChannel]);

  const setupPusherListener = (chargeId: string) => {
    const channel = pusherClient.subscribe(`order_${orderId}`);
    setPusherChannel(channel);

    channel.bind('payment_status', (data: any) => {
      if (data.status === 'success') {
        onClose();
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            type: 'assistant',
            content: `✅ Paiement réussi !
            
Votre commande sera livrée à :
${customerInfo.city}

${customerInfo.email ? `Un email de confirmation vous a été envoyé à ${customerInfo.email}.` : ''}

Que puis-je faire d'autre pour vous ?`,
            choices: ["Suivre ma commande", "J'ai une question"]
          }
        });
      } else if (data.status === 'failed') {
        setError(data.error || 'Le paiement a échoué');
        setIsLoading(false);
      }
    });

    channel.bind('pusher:subscription_error', () => {
      setError('Erreur de connexion au service de paiement');
      setIsLoading(false);
    });
  };

  const handlePaymentInitiation = async (provider: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setPaymentUrl(null);

      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethod: provider,
          amount,
          currency,
          orderId,
          customerInfo: {
            ...customerInfo,
            phone: customerInfo.phone.replace(/\s/g, '')
          },
          metadata: {
            initiatedFrom: 'chat',
            timestamp: new Date().toISOString()
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'initiation du paiement');
      }

      if (!data.link) {
        throw new Error('URL de paiement non disponible');
      }

      setPaymentUrl(data.link);
      
      if (data.transactionId) {
        setupPusherListener(data.transactionId);
      }

    } catch (err) {
      console.error('Payment initiation error:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setPaymentUrl(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setIsLoading(false);
    setPaymentUrl(null);
    if (pusherChannel) {
      pusherChannel.unsubscribe();
      setPusherChannel(null);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choisissez votre mode de paiement mobile</DialogTitle>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="min-h-[500px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-[#FF7E93] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : paymentUrl ? (
            <iframe 
              src={paymentUrl}
              className="w-full h-[500px] border-none rounded-lg"
              title="Payment"
            />
          ) : (
            <div className="space-y-4">
              <button 
                onClick={() => handlePaymentInitiation('wave_money')}
                disabled={isLoading}
                className="w-full p-4 flex items-center gap-3 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <img src="/images/payments/wave_1.svg" alt="Wave" className="w-8 h-8" />
                <div>
                  <div className="font-medium">Wave</div>
                  <div className="text-sm text-gray-500">Mobile Money</div>
                </div>
              </button>
              
              <button 
                onClick={() => handlePaymentInitiation('orange_money')}
                disabled={isLoading}
                className="w-full p-4 flex items-center gap-3 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <img src="/images/payments/om_1.svg" alt="Orange Money" className="w-8 h-8" />
                <div>
                  <div className="font-medium">Orange Money</div>
                  <div className="text-sm text-gray-500">Mobile Money</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}