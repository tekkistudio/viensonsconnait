// src/features/product/hooks/useChatMessages.ts
import { useCallback } from 'react';
import { AIManager } from '@/lib/services/AIManager';
import useCountryStore from '@/core/hooks/useCountryStore';
import { getProductInfo, ProductId } from '@/config/products';
import { CartService } from '@/lib/services/cart.service';
import { BictorysService } from '@/lib/services/bictorys.service';
import { StripeService } from '@/lib/services/stripe.service';
import { DeliveryService } from '@/lib/services/delivery.service';
import { RecommendationService } from '@/lib/services/recommendation.service';
import { ErrorManager } from '@/lib/services/ErrorManager';
import { ErrorData, ErrorManagerResponse, PaymentErrorType } from '@/types/error';
import { toMutableArray } from '../utils/arrayHelpers';
import type { 
    ChatMessage,
    ChatAction,
    ConversationStep,
    AIContext,
    UseChatMessagesProps,
    OrderData,
    PaymentTotal,
    OrderSummaryData,
    ProductRecommendation
  } from '../types/chat';
import type { 
  PaymentMethodType, 
  CustomerInfo, 
  PaymentProvider,
  BictorysProvider
} from "@/types/payment";
import { GENERIC_MESSAGES, GENERIC_CHOICES } from '../utils/chatMessages';
import { ErrorTypes, ErrorCategory } from '@/constants/errors';

const VALID_PAYMENT_METHODS = ['wave', 'orange_money', 'stripe', 'carte bancaire', 'cod', 'livraison'] as const;
type ValidPaymentMethod = typeof VALID_PAYMENT_METHODS[number];

const paymentMethodMapping: Record<string, PaymentProvider> = {
  'wave': 'WAVE',
  'orange money': 'ORANGE_MONEY',
  'stripe': 'STRIPE',
  'carte bancaire': 'STRIPE',
  'cod': 'CASH',
  'livraison': 'CASH'
};

// Constants and validations
const isValidPaymentMethod = (method: string): method is ValidPaymentMethod => {
  return VALID_PAYMENT_METHODS.includes(method.toLowerCase() as ValidPaymentMethod);
};

// Services initialization
const deliveryService = new DeliveryService();
const errorManager = ErrorManager.getInstance();
const cartService = CartService.getInstance();
const bictorysService = new BictorysService();
const stripeService = new StripeService();

// Utility functions
function convertToPaymentTotal(amount: number): PaymentTotal {
  return {
    value: amount,
    formatted: `${amount.toLocaleString()} FCFA`,
    originalInFCFA: amount
  };
}

const isValidPhoneNumber = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\s/g, '');
  return /^\d{9,}$/.test(cleanPhone);
};

export function useChatMessages({
    dispatch,
    formStep,
    productId,
    orderData
}: UseChatMessagesProps & { orderData: OrderData }) {

    // Message handling - Doit être défini en premier car utilisé par d'autres fonctions
    const addBotResponse = useCallback(async (responses: ChatMessage[], delay = 1000) => {
        dispatch({ type: 'SET_TYPING', payload: true });
        try {
            for (const response of responses) {
                await new Promise((resolve) => setTimeout(resolve, delay));
                
                if (response.type === 'assistant' && response.choices && Array.isArray(response.choices) && response.choices.length > 0) {
                    dispatch({
                        type: 'ADD_MESSAGE',
                        payload: {
                            ...response,
                            choices: undefined
                        }
                    });
                    
                    dispatch({
                        type: 'ADD_MESSAGE',
                        payload: {
                            type: 'user-choices',
                            content: '',
                            choices: response.choices
                        }
                    });
                } else {
                    dispatch({
                        type: 'ADD_MESSAGE',
                        payload: response
                    });
                }
            }
        } catch (error) {
            const errorResponse = await errorManager.handleError(
                error instanceof Error ? error : new Error(String(error)),
                ErrorTypes.SYSTEM_ERROR as ErrorCategory,
                {
                    timestamp: new Date().toISOString(),
                    path: 'addBotResponse',
                    additionalData: { responses }
                }
            );
            
            dispatch({
                type: 'ADD_MESSAGE',
                payload: {
                    type: 'assistant',
                    content: errorResponse.userMessage,
                    choices: errorResponse.choices
                }
            });
        } finally {
            dispatch({ type: 'SET_TYPING', payload: false });
        }
    }, [dispatch]);

    // System message creation
    const createSystemMessage = useCallback((
        content: string,
        choices?: string[],
        metadata?: Record<string, any>
    ): ChatMessage => ({
        type: 'assistant',
        content,
        choices,
        metadata: {
            productContext: productId,
            ...metadata
        },
        timestamp: new Date().toISOString()
    }), [productId]);

    // Data validation utilities
    const validateUserData = useCallback((
        step: ConversationStep,
        value: string
    ): { isValid: boolean; error?: string } => {
        const trimmedValue = value.trim();

        switch (step) {
            case 'contact-info':
                const names = trimmedValue.split(' ');
                if (names.length < 2) {
                    return {
                        isValid: false,
                        error: "Veuillez fournir votre prénom et votre nom"
                    };
                }
                return { isValid: true };

            case 'city':
                if (!trimmedValue) {
                    return {
                        isValid: false,
                        error: "Veuillez indiquer votre ville"
                    };
                }
                return { isValid: true };

            case 'address':
                if (!trimmedValue || trimmedValue.length < 5) {
                    return {
                        isValid: false,
                        error: "Veuillez fournir une adresse complète"
                    };
                }
                return { isValid: true };

            case 'phone':
                if (!isValidPhoneNumber(trimmedValue)) {
                    return {
                        isValid: false,
                        error: "Veuillez fournir un numéro de téléphone valide"
                    };
                }
                return { isValid: true };

            default:
                return { isValid: true };
        }
    }, []);

    const handleValidationError = useCallback(async (error: string) => {
        await addBotResponse([
            createSystemMessage(error, ["Réessayer"])
        ]);
    }, [addBotResponse, createSystemMessage]);

    // Order data validation
    const validateOrderData = useCallback((data: Partial<OrderData>): boolean => {
        return !!(
            data.firstName &&
            data.lastName &&
            data.city &&
            data.address &&
            data.phone &&
            data.country &&
            data.items && 
            data.items.length > 0 &&
            data.deliveryCost !== undefined
        );
    }, []);

    // Order summary handling
    const handleOrderSummary = useCallback(async () => {
        try {
            if (!orderData.items?.length || !orderData.city || !orderData.address || !orderData.phone) {
                throw new Error("Informations de commande incomplètes");
            }

            const { currentCountry } = useCountryStore.getState();
            
            // Calculate subtotal with discounts
            const subtotal = orderData.items.reduce((acc, item) => {
                let itemTotal = 0;
                if (item.quantity >= 4) {
                    itemTotal = item.price * item.quantity * 0.8; // -20%
                } else if (item.quantity === 3) {
                    itemTotal = 35700; // Pack Trio
                } else if (item.quantity === 2) {
                    itemTotal = 25200; // Pack Duo
                } else {
                    itemTotal = item.price * item.quantity;
                }
                return acc + itemTotal;
            }, 0);

            const deliveryCost = orderData.deliveryCost ?? 0;
            const total = subtotal + deliveryCost;

            // Prepare order summary
            const summary: OrderSummaryData = {
                items: orderData.items,
                customerInfo: {
                    firstName: orderData.firstName,
                    lastName: orderData.lastName,
                    country: currentCountry?.name || 'Non spécifié',
                    city: orderData.city,
                    address: orderData.address,
                    phone: orderData.phone
                },
                subtotal: convertToPaymentTotal(subtotal),
                deliveryCost: convertToPaymentTotal(deliveryCost),
                total: convertToPaymentTotal(total)
            };

            dispatch({
                type: 'UPDATE_ORDER_DATA',
                payload: { 
                    summary,
                    totalAmount: total
                }
            });

            // Get and format recommendations
            const rawRecommendations = await RecommendationService.getRecommendations({
                currentProductId: productId as ProductId,
                buyingIntent: 0.8
            });
        
            const recommendations: ProductRecommendation[] = rawRecommendations.map(rec => ({
                productId: rec.productId,
                recommendationType: 'product',
                category: 'product',
                name: rec.name,
                reason: rec.reason || '',
                priority: rec.priority || 0
            }));

            const recommendationMessage = recommendations.length > 0 
                ? "\n\n💡 Vous pourriez aussi être intéressé(e) par :\n" + 
                recommendations.map(rec => `- ${rec.name}`).join('\n')
                : '';

            // Send complete order summary
            await addBotResponse([{
                type: 'assistant',
                content: `📋 Récapitulatif de votre commande :

🛍️ Articles :
${orderData.items.map(item => `${item.quantity}x ${item.name} - ${(item.price * item.quantity).toLocaleString()} FCFA`).join('\n')}

💰 Sous-total : ${summary.subtotal.formatted}
📦 Livraison : ${summary.deliveryCost.formatted}
💳 Total : ${summary.total.formatted}

📍 Informations de livraison :
Nom complet : ${summary.customerInfo.firstName} ${summary.customerInfo.lastName}
Adresse : ${summary.customerInfo.address}
Ville : ${summary.customerInfo.city}
Pays : ${summary.customerInfo.country}
Téléphone : ${summary.customerInfo.phone}
${recommendationMessage}

Ces informations sont-elles correctes ?`,
                choices: ["Oui, c'est correct", "Non, je veux modifier"],
                metadata: {
                    recommendations,
                    summary
                }
            }]);

            // Save to cart
            await cartService.saveCart({
                ...orderData,
                summary,
                totalAmount: total
            });

        } catch (error) {
            const errorResponse = await errorManager.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'ORDER_SUMMARY_ERROR',
                {
                    timestamp: new Date().toISOString(),
                    path: 'handleOrderSummary',
                    additionalData: { orderData }
                }
            );

            await addBotResponse([{
                type: 'assistant',
                content: errorResponse.userMessage,
                choices: ["Recommencer la commande"]
            }]);
        }
    }, [orderData, dispatch, addBotResponse, productId]);

    // Payment handling methods
    const handleMobilePayment = useCallback(async (provider: PaymentMethodType) => {
        try {
            const { phone, country } = orderData;
            if (!phone || !country) {
                throw new Error("Informations de contact manquantes");
            }

            const paymentSession = await bictorysService.createPaymentSession({
                amount: orderData.totalAmount || 0,
                currency: 'XOF',
                provider: provider.toLowerCase() as BictorysProvider,
                customerPhone: phone,
                customerCountry: country,
                orderId: orderData.orderId ? parseInt(orderData.orderId) : Date.now()
            });

            if (paymentSession.iframeUrl) {
                dispatch({
                    type: 'SET_PAYMENT_MODAL',
                    payload: {
                        isOpen: true,
                        iframeUrl: paymentSession.iframeUrl,
                        provider
                    }
                });
            }

            await addBotResponse([{
                type: 'assistant',
                content: `Parfait ! Je vous ai envoyé une demande de paiement ${provider}. Veuillez suivre les instructions pour finaliser votre commande.

💡 Une fois le paiement effectué, vous recevrez une confirmation ici même.`,
                metadata: {
                    paymentStatus: 'processing',
                    transactionId: paymentSession.transactionId
                }
            }]);

        } catch (error) {
            const errorResponse = await errorManager.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'PAYMENT_METHOD_ERROR',
                {
                    timestamp: new Date().toISOString(),
                    path: 'handleMobilePayment',
                    additionalData: { provider, orderData }
                }
            );

            await addBotResponse([{
                type: 'assistant',
                content: errorResponse.userMessage,
                choices: ["Réessayer", "Choisir un autre moyen de paiement"]
            }]);
        }
    }, [orderData, dispatch, addBotResponse]);

    const handleCardPayment = useCallback(async () => {
        try {
            const session = await stripeService.createCheckoutSession({
                amount: orderData.totalAmount || 0,
                currency: 'xof',
                orderId: orderData.orderId || `order_${Date.now()}`,
                customerEmail: orderData.email,
                customerName: `${orderData.firstName || ''} ${orderData.lastName || ''}`.trim(),
            });

            if (session.url) {
                dispatch({
                    type: 'SET_PAYMENT_MODAL',
                    payload: {
                        isOpen: true,
                        iframeUrl: session.url,
                        provider: 'STRIPE'
                    }
                });
            }

            await addBotResponse([{
                type: 'assistant',
                content: "Je vous redirige vers notre page de paiement sécurisée. Veuillez renseigner vos informations de carte bancaire. 💡 Une fois le paiement effectué, vous reviendrez automatiquement ici pour la confirmation.",
                metadata: {
                    paymentStatus: 'processing'
                }
            }]);

        } catch (error) {
            const errorResponse = await errorManager.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'PAYMENT_METHOD_ERROR',
                {
                    timestamp: new Date().toISOString(),
                    path: 'handleCardPayment',
                    additionalData: { orderData }
                }
            );

            await addBotResponse([{
                type: 'assistant',
                content: errorResponse.userMessage,
                choices: ["Réessayer", "Choisir un autre moyen de paiement"]
            }]);
        }
    }, [orderData, dispatch, addBotResponse]);

    const handleCashOnDelivery = useCallback(async () => {
        try {
            await addBotResponse([{
                type: 'assistant',
                content: `Parfait ! 🎉 Votre commande a bien été enregistrée.

📞 Notre livreur vous contactera au ${orderData.phone} pour organiser la livraison.

📧 Vous allez recevoir un email de confirmation avec les détails de votre commande.

À très bientôt ! ✨`,
                metadata: {
                    paymentStatus: 'pending'
                }
            }]);

            // Save order with appropriate status
            await cartService.completeCart(orderData.orderId || 'temp_id');

        } catch (error) {
            const errorResponse = await errorManager.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'PAYMENT_METHOD_ERROR',
                {
                    timestamp: new Date().toISOString(),
                    path: 'handleCashOnDelivery',
                    additionalData: { orderData }
                }
            );

            await addBotResponse([{
                type: 'assistant',
                content: errorResponse.userMessage,
                choices: ["Réessayer", "Choisir un autre moyen de paiement"]
            }]);
        }
    }, [orderData, addBotResponse]);

    // AI Response handling
    const handleAIResponse = useCallback(async (
        userInput: string,
        context?: AIContext
    ): Promise<ChatMessage[]> => {
        try {
            const aiResponse = await AIManager.getInstance().handleProductChatbot(
                { content: userInput, type: 'user' },
                productId,
                context?.currentStep || 'initial',
                context?.orderData || {}
            );
    
            const messages: ChatMessage[] = [{
                type: 'assistant',
                content: aiResponse.content,
                metadata: {
                    intent: aiResponse.buyingIntent,
                    recommendations: aiResponse.recommendations,
                    productContext: context?.productContext
                }
            }];
    
            // Si l'IA suggère des choix, on les ajoute dans un message séparé
            if (aiResponse.choices && aiResponse.choices.length > 0) {
                messages.push({
                    type: 'user-choices',
                    content: '',
                    choices: aiResponse.choices
                });
            }
            
            return messages;
    
        } catch (error) {
            const errorResponse = await errorManager.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'AI_RESPONSE_ERROR',
                {
                    timestamp: new Date().toISOString(),
                    path: 'handleAIResponse',
                    additionalData: { userInput, context }
                }
            );
    
            return [{
                type: 'assistant',
                content: errorResponse.userMessage,
                choices: errorResponse.choices
            }];
        }
    }, [productId]);

    // Payment method handling
    const handlePaymentMethod = useCallback(async (method: PaymentMethodType) => {
        try {
            const normalizedMethod = method.toLowerCase();
            const mappedProvider = paymentMethodMapping[normalizedMethod];
            
            if (!mappedProvider) {
                throw new Error(`Mode de paiement non supporté: ${method}`);
            }

            switch (mappedProvider) {
                case 'WAVE':
                case 'ORANGE_MONEY':
                    await handleMobilePayment(mappedProvider);
                    break;
                case 'STRIPE':
                    await handleCardPayment();
                    break;
                case 'CASH':
                    await handleCashOnDelivery();
                    break;
                default:
                    throw new Error(`Mode de paiement non supporté: ${method}`);
            }
        } catch (error) {
            const errorResponse = await errorManager.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'PAYMENT_METHOD_ERROR',
                {
                    timestamp: new Date().toISOString(),
                    path: 'handlePaymentMethod',
                    additionalData: { method, orderData }
                }
            );

            await addBotResponse([{
                type: 'assistant',
                content: errorResponse.userMessage,
                choices: ["Choisir un autre moyen de paiement"]
            }]);
        }
    }, [handleMobilePayment, handleCardPayment, handleCashOnDelivery, orderData, addBotResponse]);

    // Form steps handling
    const handleFormStep = useCallback(async (
        step: ConversationStep,
        value: string,
        additionalData?: {
            total?: PaymentTotal;
            product?: { name: string; id: string };
        }
    ) => {
        try {
            if (!step || !value) {
                throw new Error('Step and value are required');
            }

            const trimmedValue = value.trim();
            if (!trimmedValue) {
                await handleValidationError('La valeur ne peut pas être vide');
                return;
            }

            const validation = validateUserData(step, trimmedValue);
            if (!validation.isValid) {
                await handleValidationError(validation.error!);
                return;
            }

            switch (step) {
                case 'contact-info': {
                    const names = trimmedValue.split(' ');
                    const updatedData = {
                        ...orderData,
                        firstName: names[0],
                        lastName: names.slice(1).join(' '),
                        contactInfo: trimmedValue,
                    };

                    await cartService.saveCart(updatedData);
                    dispatch({
                        type: 'UPDATE_ORDER_DATA',
                        payload: updatedData
                    });
                    
                    dispatch({ type: 'SET_FORM_STEP', payload: 'city' });
                    await addBotResponse([{
                        type: 'assistant',
                        content: GENERIC_MESSAGES.askCity(names[0])
                    }]);
                    break;
                }

                case 'city': {
                    try {
                        const cityDeliveryCost = await deliveryService.getDeliveryCost(trimmedValue);
                        const updatedData = {
                            ...orderData,
                            city: trimmedValue,
                            deliveryCost: cityDeliveryCost
                        };

                        await cartService.saveCart(updatedData);
                        dispatch({
                            type: 'UPDATE_ORDER_DATA',
                            payload: updatedData
                        });

                        dispatch({ type: 'SET_FORM_STEP', payload: 'address' });
                        await addBotResponse([{
                            type: 'assistant',
                            content: GENERIC_MESSAGES.askAddress(trimmedValue)
                        }]);
                    } catch (error) {
                        console.error('Delivery cost error:', error);
                        throw new Error("Erreur lors du calcul des frais de livraison");
                    }
                    break;
                }

                case 'address': {
                    const updatedData = {
                        ...orderData,
                        address: trimmedValue
                    };

                    await cartService.saveCart(updatedData);
                    dispatch({
                        type: 'UPDATE_ORDER_DATA',
                        payload: { address: trimmedValue }
                    });

                    dispatch({ type: 'SET_FORM_STEP', payload: 'phone' });
                    await addBotResponse([{
                        type: 'assistant',
                        content: GENERIC_MESSAGES.askPhone
                    }]);
                    break;
                }

                case 'phone': {
                    const phoneNumber = trimmedValue.replace(/\s/g, '');
                    
                    if (!isValidPhoneNumber(phoneNumber)) {
                        throw new Error("Numéro de téléphone invalide");
                    }

                    const { currentCountry } = useCountryStore.getState();
                    const updatedData = {
                        ...orderData,
                        phone: phoneNumber,
                        country: currentCountry?.name || 'Non spécifié'
                    };

                    await cartService.saveCart(updatedData);
                    dispatch({
                        type: 'UPDATE_ORDER_DATA',
                        payload: updatedData
                    });

                    if (validateOrderData(updatedData)) {
                        dispatch({ type: 'SET_FORM_STEP', payload: 'summary' });
                        await handleOrderSummary();
                    } else {
                        await addBotResponse([{
                            type: 'assistant',
                            content: "Je suis désolée, il me manque certaines informations pour finaliser votre commande. Pouvons-nous reprendre depuis le début ?",
                            choices: ["Recommencer la commande"]
                        }]);
                        dispatch({ type: 'SET_FORM_STEP', payload: 'contact-info' });
                    }
                    break;
                }

                case 'summary': {
                    if (value === "Oui, c'est correct") {
                        dispatch({ type: 'SET_FORM_STEP', payload: 'payment-method' });
                        await addBotResponse([{
                            type: 'assistant',
                            content: "Excellent ! Comment souhaitez-vous effectuer le paiement ?",
                            choices: [
                                "Wave",
                                "Orange Money",
                                "Carte bancaire",
                                "Paiement à la livraison"
                            ]
                        }]);
                    } else if (value === "Non, je veux modifier") {
                        dispatch({ type: 'RESET_ORDER' });
                        dispatch({ type: 'SET_FORM_STEP', payload: 'contact-info' });
                        await addBotResponse([{
                            type: 'assistant',
                            content: "D'accord, reprenons depuis le début. Quel est votre nom complet ?"
                        }]);
                    }
                    break;
                }

                default:
                    console.warn('Étape non gérée:', step);
                    break;
            }
        } catch (error) {
            const errorResponse = await errorManager.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'FORM_STEP_ERROR',
                {
                    timestamp: new Date().toISOString(),
                    path: 'handleFormStep',
                    additionalData: { step, value, additionalData }
                }
            );

            await addBotResponse([{
                type: 'assistant',
                content: errorResponse.userMessage,
                choices: errorResponse.choices
            }]);
        }
    }, [dispatch, addBotResponse, orderData, validateUserData, handleValidationError, handleOrderSummary, validateOrderData]);

    // Return public interface
    return {
        addBotResponse,
        handleFormStep,
        handleAIResponse,
        createSystemMessage,
        handleOrderSummary,
        handlePaymentMethod
    };
}