// src/components/payment/StripePaymentModal.tsx - VERSION CORRIGÉE ANTI-ERREURS
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
  const [initError, setInitError] = useState<string | null>(null);

  // ✅ NOUVEAU: Créer automatiquement un PaymentIntent si pas de clientSecret
  useEffect(() => {
    if (isOpen && !clientSecret && amount && orderId) {
      createPaymentIntent();
    } else if (clientSecret) {
      setInternalClientSecret(clientSecret);
    }
  }, [isOpen, clientSecret, amount, orderId]);

  // ✅ FONCTION CORRIGÉE: Créer un PaymentIntent Stripe avec gestion d'erreurs renforcée
  const createPaymentIntent = async () => {
    if (!amount || !orderId) return;

    setIsLoadingIntent(true);
    setInitError(null);
    
    try {
      // Convertir FCFA en EUR (approximation: 1 EUR = 656 FCFA)
      const amountInEur = Math.max(1, Math.round(amount / 656));
      
      console.log('💳 Creating Stripe PaymentIntent:', {
        originalAmount: amount,
        convertedEur: amountInEur,
        orderId
      });
      
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

      const responseText = await response.text();
      console.log('📝 Raw Stripe API response:', responseText);

      if (response.ok) {
        const data = JSON.parse(responseText);
        console.log('✅ PaymentIntent created successfully:', data);
        
        if (data.clientSecret) {
          setInternalClientSecret(data.clientSecret);
          setKey(prev => prev + 1); // Force re-render des Elements
        } else {
          throw new Error('Client secret manquant dans la réponse');
        }
      } else {
        let errorMessage = 'Erreur lors de la création du paiement';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          errorMessage = `Erreur HTTP ${response.status}: ${responseText}`;
        }
        
        console.error('❌ Stripe API Error:', { status: response.status, responseText });
        setInitError(errorMessage);
        onError?.(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error creating PaymentIntent:', error);
      const errorMessage = error instanceof Error ? error.message : 'Impossible de créer le paiement. Veuillez réessayer.';
      setInitError(errorMessage);
      onError?.(errorMessage);
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

  // ✅ AFFICHAGE si aucun clientSecret et erreur d'initialisation
  if (!finalClientSecret && !isLoadingIntent && initError) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Erreur de paiement
              </DialogTitle>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </DialogHeader>
          
          <div className="p-6">
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Impossible d'initialiser le paiement
              </h3>
              <p className="text-gray-600 mb-4">{initError}</p>
              <div className="flex gap-3">
                <Button
                  onClick={createPaymentIntent}
                  className="flex-1 bg-[#FF7E93] hover:bg-[#FF7E93]/90"
                >
                  Réessayer
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!finalClientSecret && !isLoadingIntent) {
    return null;
  }

  const options = finalClientSecret
    ? {
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
      }
    : undefined;

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

  // ✅ VALIDATION RENFORCÉE: Vérifier que Stripe est chargé
  const validateForm = useCallback((): boolean => {
    if (!stripe) {
      setError('Stripe n\'est pas encore chargé. Veuillez patienter quelques secondes.');
      return false;
    }

    if (!elements) {
      setError('Les éléments de paiement ne sont pas encore chargés.');
      return false;
    }

    const paymentElement = elements.getElement('payment');
    if (!paymentElement) {
      setError('Impossible de localiser le formulaire de paiement. Rechargez la page.');
      return false;
    }

    return true;
  }, [stripe, elements]);

  // ✅ GESTION CORRIGÉE: Soumission du paiement avec logs détaillés
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('💳 Starting payment submission process...');
    
    if (!validateForm()) {
      console.error('❌ Form validation failed');
      return;
    }
    
    if (processing) {
      console.warn('⚠️ Payment already in progress, ignoring submission');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      console.log('🔄 Confirming payment with Stripe...');

      // ✅ Confirmer le paiement avec gestion d'erreurs améliorée
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
        return;
      }

      if (paymentIntent) {
        console.log('✅ Payment Intent result:', {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount
        });
        
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
            console.log('🔐 Payment requires additional action (3D Secure, etc.)');
            // Stripe gère automatiquement les actions supplémentaires
            setError('Votre banque demande une vérification supplémentaire. Suivez les instructions.');
            break;
            
          default:
            console.warn('❓ Unexpected payment status:', paymentIntent.status);
            setError(`Statut de paiement inattendu: ${paymentIntent.status}. Contactez le support si le problème persiste.`);
        }
      }

    } catch (err) {
      console.error('❌ Critical payment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Une erreur critique s\'est produite lors du paiement';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setProcessing(false);
    }
  };

  // ✅ FONCTION CORRIGÉE: Messages d'erreur personnalisés en français
  const getErrorMessage = (code?: string, defaultMessage?: string): string => {
    const errorMessages: Record<string, string> = {
      'card_declined': 'Votre carte a été refusée par votre banque. Veuillez essayer avec une autre carte ou contacter votre banque.',
      'insufficient_funds': 'Fonds insuffisants sur votre compte. Veuillez vérifier votre solde.',
      'expired_card': 'Votre carte a expiré. Veuillez utiliser une carte valide.',
      'incorrect_cvc': 'Le code de sécurité (CVC) saisi est incorrect.',
      'incorrect_number': 'Le numéro de carte saisi est incorrect.',
      'invalid_expiry_month': 'Le mois d\'expiration saisi est invalide.',
      'invalid_expiry_year': 'L\'année d\'expiration saisie est invalide.',
      'processing_error': 'Une erreur de traitement s\'est produite. Veuillez réessayer dans quelques minutes.',
      'generic_decline': 'Votre carte a été refusée. Contactez votre banque pour plus d\'informations.',
      'authentication_required': 'Votre banque exige une authentification supplémentaire.',
      'currency_not_supported': 'Cette devise n\'est pas supportée par votre carte.'
    };

    return errorMessages[code || ''] || defaultMessage || 'Une erreur est survenue lors du paiement. Veuillez réessayer.';
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

      {/* ✅ Affichage des erreurs amélioré */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* ✅ NOUVEAU: Informations sur les cartes de test */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800">
          <p className="font-medium mb-1">💳 Mode test - Utilisez ces cartes :</p>
          <p>• Visa: 4242 4242 4242 4242</p>
          <p>• Date: Toute date future</p>
          <p>• CVC: Tout code à 3 chiffres</p>
        </div>
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