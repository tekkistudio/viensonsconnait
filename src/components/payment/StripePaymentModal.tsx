// src/components/payment/StripePaymentModal.tsx - VERSION INTÉGRÉE DANS LE CHAT
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
import { CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientSecret?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  onSuccess?: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function StripePaymentModal({
  isOpen,
  onClose,
  clientSecret,
  orderId,
  amount,
  currency = 'eur',
  onSuccess,
  onError
}: StripePaymentModalProps) {
  const [key, setKey] = useState(0);
  const [internalClientSecret, setInternalClientSecret] = useState<string | null>(null);
  const [isLoadingIntent, setIsLoadingIntent] = useState(false);

  // ✅ NOUVEAU: Créer automatiquement un PaymentIntent si pas de clientSecret
  useEffect(() => {
    if (isOpen && !clientSecret && amount && orderId) {
      createPaymentIntent();
    } else if (clientSecret) {
      setInternalClientSecret(clientSecret);
    }
  }, [isOpen, clientSecret, amount, orderId]);

  // ✅ FONCTION: Créer un PaymentIntent Stripe
  const createPaymentIntent = async () => {
    if (!amount || !orderId) return;

    setIsLoadingIntent(true);
    
    try {
      // Convertir FCFA en EUR (approximation: 1 EUR = 656 FCFA)
      const amountInEur = Math.max(1, Math.round(amount / 656));
      
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInEur * 100, // Stripe utilise les centimes
          currency: 'eur',
          orderId: orderId,
          automatic_payment_methods: { enabled: true }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setInternalClientSecret(data.clientSecret);
        setKey(prev => prev + 1); // Force re-render des Elements
      } else {
        const errorData = await response.json();
        onError?.(errorData.message || 'Erreur lors de la création du paiement');
      }
    } catch (error) {
      console.error('❌ Error creating PaymentIntent:', error);
      onError?.('Impossible de créer le paiement. Veuillez réessayer.');
    } finally {
      setIsLoadingIntent(false);
    }
  };

  // ✅ Réinitialiser Elements quand le modal s'ouvre/ferme
  useEffect(() => {
    if (isOpen && internalClientSecret) {
      setKey(prev => prev + 1);
    }
  }, [isOpen, internalClientSecret]);

  const finalClientSecret = clientSecret || internalClientSecret;

  if (!finalClientSecret && !isLoadingIntent) {
    return null;
  }

  const options = {
    clientSecret: finalClientSecret,
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
      <DialogContent className="sm:max-w-[500px] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Paiement par carte
            </DialogTitle>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          {amount && (
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-600">Montant à payer :</span>
              <span className="font-semibold text-[#FF7E93]">
                {amount.toLocaleString()} FCFA
                <span className="text-xs text-gray-500 ml-1">
                  (≈ {Math.round(amount / 656)}€)
                </span>
              </span>
            </div>
          )}
        </DialogHeader>
        
        <div className="p-6">
          <AnimatePresence mode="wait">
            {isLoadingIntent ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-8"
              >
                <Loader2 className="w-8 h-8 animate-spin text-[#FF7E93] mb-4" />
                <p className="text-gray-600">Préparation du paiement sécurisé...</p>
              </motion.div>
            ) : finalClientSecret ? (
              <motion.div
                key="payment-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Elements key={key} stripe={stripePromise} options={options}>
                  <PaymentForm 
                    onClose={onClose} 
                    orderId={orderId}
                    amount={amount}
                    currency={currency}
                    onSuccess={onSuccess}
                    onError={onError}
                  />
                </Elements>
              </motion.div>
            ) : (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600">Impossible de charger le paiement</p>
                <Button
                  onClick={createPaymentIntent}
                  className="mt-4 bg-[#FF7E93] hover:bg-[#FF7E93]/90"
                >
                  Réessayer
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
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
  onSuccess?: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
}

function PaymentForm({ 
  onClose, 
  orderId, 
  amount, 
  currency,
  onSuccess,
  onError 
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);
  const { addMessage } = useChatStore();

  // ✅ VALIDATION: Vérifier que Stripe est chargé
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

  // ✅ GESTION: Soumission du paiement
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (processing) return;

    setProcessing(true);
    setError(null);

    try {
      console.log('💳 Starting Stripe payment process...');

      // ✅ Confirmer le paiement sans redirection
      const { error: submitError, paymentIntent } = await stripe!.confirmPayment({
        elements: elements!,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/payment/success?order_id=${orderId}`,
        }
      });

      if (submitError) {
        console.error('❌ Payment submission error:', submitError);
        const errorMessage = getErrorMessage(submitError.code, submitError.message);
        setError(errorMessage);
        onError?.(errorMessage);
        setProcessing(false);
        return;
      }

      if (paymentIntent) {
        console.log('✅ Payment Intent result:', paymentIntent.status);
        
        switch (paymentIntent.status) {
          case 'succeeded':
            console.log('🎉 Payment succeeded immediately');
            setPaymentSucceeded(true);
            
            // ✅ NOUVEAU: Ajouter message de succès au chat
            setTimeout(() => {
              addMessage({
                type: 'assistant',
                content: `🎉 **Paiement par carte réussi !**

✅ **Transaction confirmée**
💳 **Méthode :** Carte bancaire  
🆔 **Référence :** ${paymentIntent.id}

📧 Un reçu de paiement vous sera envoyé par email.
🚚 Votre commande sera préparée et expédiée dans les plus brefs délais.

Merci pour votre confiance ! 🙏`,
                choices: [
                  '📦 Suivre ma commande',
                  '📧 Recevoir le reçu par email',
                  '🛍️ Autres produits'
                ],
                assistant: {
                  name: 'Rose',
                  title: 'Assistante d\'achat'
                },
                metadata: {
                  orderId,
                  paymentIntentId: paymentIntent.id,
                  flags: { 
                    orderCompleted: true, 
                    paymentConfirmed: true,
                    stripePayment: true 
                  }
                },
                timestamp: new Date().toISOString()
              });
              
              onSuccess?.(paymentIntent.id);
              
              // Fermer le modal après 2 secondes
              setTimeout(() => {
                onClose();
              }, 2000);
            }, 1000);
            break;
            
          case 'processing':
            console.log('⏳ Payment is processing...');
            setError('Votre paiement est en cours de traitement. Vous recevrez une confirmation sous peu.');
            break;
            
          case 'requires_action':
            console.log('🔐 Payment requires additional action');
            // Stripe gère automatiquement (3D Secure, etc.)
            break;
            
          default:
            console.log('❓ Unexpected payment status:', paymentIntent.status);
            setError('Statut de paiement inattendu. Veuillez contacter le support.');
            setProcessing(false);
        }
      }

    } catch (err) {
      console.error('❌ Payment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite';
      setError(errorMessage);
      onError?.(errorMessage);
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
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center py-8"
      >
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Paiement réussi !
        </h3>
        <p className="text-gray-600 mb-4">
          Votre paiement a été traité avec succès.
        </p>
        <div className="flex items-center justify-center text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Fermeture automatique...
        </div>
      </motion.div>
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
                <span className="font-medium">
                  {amount.toLocaleString()} FCFA
                </span>
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
            `Payer ${amount ? Math.round(amount / 656) + '€' : ''}`
          )}
        </Button>
      </div>

      {/* ✅ Informations de sécurité */}
      <div className="text-xs text-gray-500 text-center pt-2 border-t">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Paiement sécurisé par Stripe</span>
        </div>
        <p>Vos informations bancaires sont chiffrées et protégées</p>
      </div>
    </form>
  );
}