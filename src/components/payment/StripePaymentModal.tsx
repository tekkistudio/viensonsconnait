// src/components/payment/StripePaymentModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { 
  Elements, 
  PaymentElement,
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useChatContext } from '@/features/product/context/ChatContext';
import type { PaymentProvider, CustomerInfo } from '@/types/order';
import { pusherClient } from '@/lib/pusher';

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientSecret: string;
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!);

export function StripePaymentModal({
  isOpen,
  onClose,
  clientSecret
}: StripePaymentModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Paiement par carte bancaire</DialogTitle>
        </DialogHeader>
        <Elements stripe={stripePromise} options={{ 
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#FF7E93',
            }
          }
        }}>
          <PaymentForm onClose={onClose} />
        </Elements>
      </DialogContent>
    </Dialog>
  );
}

interface PaymentFormProps {
  onClose: () => void;
}

function PaymentForm({ onClose }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const { dispatch } = useChatContext();
  const [pusherChannel, setPusherChannel] = useState<any>(null);

  useEffect(() => {
    return () => {
      if (pusherChannel) {
        pusherChannel.unsubscribe();
      }
    };
  }, [pusherChannel]);

  const setupPusherListener = (paymentIntentId: string) => {
    const channel = pusherClient.subscribe(`payment_${paymentIntentId}`);
    setPusherChannel(channel);

    channel.bind('payment_status', (data: any) => {
      if (data.status === 'success') {
        onClose();
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            type: 'assistant',
            content: `✅ Paiement confirmé !

Votre commande a été validée et sera bientôt préparée.
Un email de confirmation vous sera envoyé.

Que puis-je faire d'autre pour vous ?`,
            choices: ["Suivre ma commande", "J'ai une question"]
          }
        });
      }
    });

    channel.bind('pusher:subscription_error', () => {
      setError('Erreur de connexion au service de notification');
      setProcessing(false);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
        redirect: 'if_required'
      });

      if (submitError) {
        setError(submitError.message || 'Une erreur est survenue');
        setProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setupPusherListener(paymentIntent.id);
      } else if (paymentIntent) {
        setError('Le paiement est en attente de confirmation');
        setupPusherListener(paymentIntent.id);
        setProcessing(false);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full"
      >
        {processing ? 'Traitement en cours...' : 'Payer maintenant'}
      </Button>
    </form>
  );
}