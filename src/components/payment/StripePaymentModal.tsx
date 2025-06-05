// src/components/payment/StripePaymentModal.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { useChatStore } from '@/stores/chatStore';
import { pusherClient } from '@/lib/pusher';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientSecret: string;
  orderId?: string;
  amount?: number;
  currency?: string;
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function StripePaymentModal({
  isOpen,
  onClose,
  clientSecret,
  orderId,
  amount,
  currency = 'eur'
}: StripePaymentModalProps) {
  const [key, setKey] = useState(0);

  // ✅ CORRECTION: Réinitialiser Elements quand le modal s'ouvre/ferme
  useEffect(() => {
    if (isOpen) {
      setKey(prev => prev + 1);
    }
  }, [isOpen, clientSecret]);

  if (!clientSecret) {
    return null;
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#FF7E93',
        colorBackground: '#ffffff',
        colorText: '#30313d',
        colorDanger: '#df1b41',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px'
      },
      rules: {
        '.Input': {
          border: '1px solid #e6e6e6',
          boxShadow: 'none'
        },
        '.Input:focus': {
          border: '1px solid #FF7E93',
          boxShadow: '0 0 0 1px #FF7E93'
        }
      }
    },
    locale: 'fr' as const
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Paiement sécurisé
          </DialogTitle>
          {amount && (
            <p className="text-sm text-gray-600 mt-2">
              Montant à payer : <span className="font-semibold">{amount.toLocaleString()} {currency.toUpperCase()}</span>
            </p>
          )}
        </DialogHeader>
        
        <div className="px-6 pb-6">
          <Elements key={key} stripe={stripePromise} options={options}>
            <PaymentForm 
              onClose={onClose} 
              orderId={orderId}
              amount={amount}
              currency={currency}
            />
          </Elements>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PaymentFormProps {
  onClose: () => void;
  orderId?: string;
  amount?: number;
  currency?: string;
}

function PaymentForm({ onClose, orderId, amount, currency }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);
  const [pusherChannel, setPusherChannel] = useState<any>(null);
  const { addMessage } = useChatStore();

  // ✅ CORRECTION: Setup Pusher pour écouter les confirmations
  useEffect(() => {
    if (orderId) {
      const channel = pusherClient.subscribe(`order_${orderId}`);
      setPusherChannel(channel);

      channel.bind('payment_status', (data: any) => {
        console.log('📡 Pusher payment status:', data);
        
        if (data.status === 'success') {
          setPaymentSucceeded(true);
          setProcessing(false);
          
          // ✅ Ajouter message de succès au chat
          setTimeout(() => {
            addMessage({
              type: 'assistant',
              content: `🎉 **Paiement confirmé !**

✅ Votre commande **#${orderId}** a été validée avec succès.

📧 Un email de confirmation vous sera envoyé sous peu.
🚚 Votre commande sera préparée et expédiée dans les plus brefs délais.

Merci pour votre confiance ! 🙏`,
              choices: [
                '📦 Suivre ma commande',
                '📞 Nous contacter', 
                '🛍️ Autres produits'
              ],
              assistant: {
                name: 'Rose',
                title: 'Assistante VOSC'
              },
              metadata: {
                orderId,
                flags: { orderCompleted: true, paymentConfirmed: true }
              },
              timestamp: new Date().toISOString()
            });
            
            // Fermer le modal après 2 secondes
            setTimeout(() => {
              onClose();
            }, 2000);
          }, 1000);
        } else if (data.status === 'failed') {
          setError(data.error || 'Le paiement a échoué');
          setProcessing(false);
        }
      });

      return () => {
        channel.unsubscribe();
        pusherClient.unsubscribe(`order_${orderId}`);
      };
    }
  }, [orderId, onClose, addMessage]);

  // ✅ CORRECTION: Validation avant soumission
  const validateForm = useCallback((): boolean => {
    if (!stripe || !elements) {
      setError('Stripe n\'est pas encore chargé. Veuillez patienter.');
      return false;
    }

    const paymentElement = elements.getElement('payment');
    if (!paymentElement) {
      setError('Impossible de localiser le formulaire de paiement.');
      return false;
    }

    return true;
  }, [stripe, elements]);

  // ✅ CORRECTION: Gestion de la soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (processing) return;

    setProcessing(true);
    setError(null);

    try {
      console.log('💳 Starting Stripe payment process...');

      // ✅ Confirmer le paiement
      const { error: submitError, paymentIntent } = await stripe!.confirmPayment({
        elements: elements!,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success?order_id=${orderId}`,
        },
        redirect: 'if_required'
      });

      if (submitError) {
        console.error('❌ Payment submission error:', submitError);
        setError(getErrorMessage(submitError.code, submitError.message));
        setProcessing(false);
        return;
      }

      if (paymentIntent) {
        console.log('✅ Payment Intent result:', paymentIntent.status);
        
        switch (paymentIntent.status) {
          case 'succeeded':
            console.log('🎉 Payment succeeded immediately');
            setPaymentSucceeded(true);
            // Le message sera ajouté via Pusher
            break;
            
          case 'processing':
            console.log('⏳ Payment is processing...');
            // Attendre la confirmation via Pusher
            break;
            
          case 'requires_action':
            console.log('🔐 Payment requires additional action');
            // Stripe va gérer automatiquement (3D Secure, etc.)
            break;
            
          default:
            console.log('❓ Unexpected payment status:', paymentIntent.status);
            setError('Statut de paiement inattendu. Veuillez contacter le support.');
            setProcessing(false);
        }
      }

    } catch (err) {
      console.error('❌ Payment error:', err);
      setError(err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite');
      setProcessing(false);
    }
  };

  // ✅ FONCTION: Messages d'erreur personnalisés
  const getErrorMessage = (code?: string, defaultMessage?: string): string => {
    const errorMessages: Record<string, string> = {
      'card_declined': 'Votre carte a été refusée. Veuillez essayer avec une autre carte.',
      'insufficient_funds': 'Fonds insuffisants. Veuillez vérifier votre solde.',
      'expired_card': 'Votre carte a expiré. Veuillez utiliser une carte valide.',
      'incorrect_cvc': 'Le code de sécurité (CVC) est incorrect.',
      'incorrect_number': 'Le numéro de carte est incorrect.',
      'invalid_expiry_month': 'Le mois d\'expiration est invalide.',
      'invalid_expiry_year': 'L\'année d\'expiration est invalide.',
      'processing_error': 'Une erreur de traitement s\'est produite. Veuillez réessayer.',
      'generic_decline': 'Votre carte a été refusée. Contactez votre banque pour plus d\'informations.'
    };

    return errorMessages[code || ''] || defaultMessage || 'Une erreur est survenue lors du paiement.';
  };

  // ✅ AFFICHAGE: État de succès
  if (paymentSucceeded) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Paiement réussi !
        </h3>
        <p className="text-gray-600 mb-4">
          Votre commande a été confirmée avec succès.
        </p>
        <div className="flex items-center justify-center text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Fermeture automatique...
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ✅ Informations de commande */}
      {orderId && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Détails de la commande</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Commande :</span>
              <span className="font-medium">#{orderId}</span>
            </div>
            {amount && (
              <div className="flex justify-between">
                <span>Montant :</span>
                <span className="font-medium">{amount.toLocaleString()} {currency?.toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ Élément de paiement Stripe */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Informations de paiement
        </label>
        <PaymentElement 
          options={{
            layout: 'tabs',
            defaultValues: {
              billingDetails: {
                address: {
                  country: 'FR'
                }
              }
            }
          }}
        />
      </div>

      {/* ✅ Affichage des erreurs */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ✅ Boutons d'action */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={processing}
          className="flex-1"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 bg-[#FF7E93] hover:bg-[#FF7E93]/90"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Traitement...
            </>
          ) : (
            `Payer ${amount ? amount.toLocaleString() + ' ' + currency?.toUpperCase() : ''}`
          )}
        </Button>
      </div>

      {/* ✅ Informations de sécurité */}
      <div className="text-xs text-gray-500 text-center pt-2">
        <p>🔒 Paiement sécurisé par Stripe</p>
        <p>Vos informations bancaires sont chiffrées et protégées</p>
      </div>
    </form>
  );
}