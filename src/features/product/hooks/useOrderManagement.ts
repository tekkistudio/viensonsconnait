// src/features/product/hooks/useOrderManagement.ts
import { useCallback } from 'react';
import type { 
  OrderItem,
  OrderData,
  ChatMessage,
  ChatAction,
  PaymentTotal,
  OrderSummaryData
} from '../types/chat';
import { PRODUCTS_INFO } from '@/config/products';
import { ChatSyncService } from '@/services/ChatSyncService';
import useCountryStore from '@/core/hooks/useCountryStore';

interface UseOrderManagementProps {
  orderData: OrderData;
  dispatch: React.Dispatch<ChatAction>;
  addBotResponse: (messages: ChatMessage[]) => Promise<void>;
}

export function useOrderManagement({
  orderData,
  dispatch,
  addBotResponse
}: UseOrderManagementProps) {
  const { convertPrice } = useCountryStore();

  const calculateOrderTotal = useCallback((): PaymentTotal => {
    const subtotal = orderData.items.reduce((accumulator, item) => {
      let itemTotal = 0;
      if (item.quantity >= 4) {
        itemTotal = item.price * item.quantity * 0.8; // -20% pour 4 ou plus
      } else if (item.quantity === 3) {
        itemTotal = 35700; // Prix fixe pour 3
      } else if (item.quantity === 2) {
        itemTotal = 25200; // Prix fixe pour 2
      } else {
        itemTotal = item.price * item.quantity;
      }
      return accumulator + itemTotal;
    }, 0);
      
    const deliveryCost = orderData.city?.toLowerCase() === 'dakar' ? 0 : 3000;
    const totalInFCFA = subtotal + deliveryCost;
  
    return {
      value: totalInFCFA,
      formatted: `${totalInFCFA.toLocaleString()} FCFA`,
      originalInFCFA: totalInFCFA
    };
  }, [orderData.items, orderData.city]);

  const handleOrderSummary = useCallback(async () => {
    if (!orderData.items.length || !orderData.city || !orderData.address || !orderData.phone) {
      await addBotResponse([{
        type: 'assistant',
        content: "Je suis désolée, il me manque certaines informations pour finaliser votre commande. Pouvons-nous reprendre ?",
        choices: ["Recommencer la commande"]
      }]);
      return;
    }

    const { currentCountry } = useCountryStore.getState();
    const deliveryCost = orderData.city.toLowerCase() === 'dakar' ? 0 : 3000;

    const subtotal = orderData.items.reduce((total, item) => {
      if (item.quantity >= 4) return total + (item.price * item.quantity * 0.8);
      if (item.quantity === 3) return total + 35700;
      if (item.quantity === 2) return total + 25200;
      return total + (item.price * item.quantity);
    }, 0);

    const total = subtotal + deliveryCost;

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
      subtotal: {
        value: subtotal,
        formatted: `${subtotal.toLocaleString()} FCFA`,
        originalInFCFA: subtotal
      },
      deliveryCost: {
        value: deliveryCost,
        formatted: deliveryCost === 0 ? 'Gratuit' : `${deliveryCost.toLocaleString()} FCFA`,
        originalInFCFA: deliveryCost
      },
      total: {
        value: total,
        formatted: `${total.toLocaleString()} FCFA`,
        originalInFCFA: total
      }
    };

    // Mettre à jour le state avec le résumé
    dispatch({
      type: 'UPDATE_ORDER_DATA',
      payload: { summary }
    });

    // Afficher le message de récapitulatif
    await addBotResponse([{
      type: 'assistant',
      content: '',
      metadata: {
        orderSummary: summary
      },
      choices: ["Confirmer la commande", "Modifier les informations"]
    }]);
  }, [orderData, dispatch, addBotResponse]);

  const addProductToOrder = useCallback(async (
    productId: string, 
    quantity: number = 1
  ): Promise<boolean> => {
    try {
      const stockCheck = await ChatSyncService.checkProductAvailability(
        productId,
        quantity
      );

      if (!stockCheck.available) {
        await addBotResponse([{
          type: 'assistant',
          content: "Désolé, ce produit n'est plus disponible en stock pour la quantité demandée.",
          choices: ["Voir d'autres produits", "Commander une quantité différente"]
        }]);
        return false;
      }

      const product = PRODUCTS_INFO[productId];
      if (!product) {
        throw new Error('Product not found');
      }

      const newItem: OrderItem = {
        productId,
        name: product.name,
        quantity,
        price: product.price,
        totalPrice: product.price * quantity
      };
    
      dispatch({
        type: 'UPDATE_ORDER_DATA',
        payload: {
          items: [...orderData.items, newItem],
          currentItem: newItem
        }
      });

      return true;
    } catch (error) {
      console.error('Error adding product to order:', error);
      await addBotResponse([{
        type: 'assistant',
        content: "Désolé, une erreur est survenue lors de l'ajout du produit.",
        choices: ["Réessayer", "Voir d'autres produits"]
      }]);
      return false;
    }
  }, [orderData.items, dispatch, addBotResponse]);

  const updateQuantity = useCallback(async (
    productId: string,
    newQuantity: number
  ): Promise<boolean> => {
    try {
      if (newQuantity < 1) return false;

      const stockCheck = await ChatSyncService.checkProductAvailability(
        productId,
        newQuantity
      );

      if (!stockCheck.available) {
        await addBotResponse([{
          type: 'assistant',
          content: "Désolé, la quantité demandée n'est pas disponible en stock.",
          choices: ["Voir d'autres produits", "Commander une quantité différente"]
        }]);
        return false;
      }

      dispatch({
        type: 'UPDATE_PRODUCT_QUANTITY',
        payload: {
          productId,
          quantity: newQuantity
        }
      });

      return true;
    } catch (error) {
      console.error('Error updating quantity:', error);
      await addBotResponse([{
        type: 'assistant',
        content: "Désolé, une erreur est survenue lors de la mise à jour de la quantité.",
        choices: ["Réessayer", "Annuler la modification"]
      }]);
      return false;
    }
  }, [dispatch, addBotResponse]);

  const removeProduct = useCallback((productId: string) => {
    dispatch({
      type: 'REMOVE_PRODUCT_FROM_ORDER',
      payload: productId
    });
  }, [dispatch]);

  const validateOrder = useCallback((orderData: OrderData): string[] => {
    const errors: string[] = [];

    if (!orderData.items.length) {
      errors.push("Aucun produit dans le panier");
    }

    if (!orderData.firstName || !orderData.lastName) {
      errors.push("Nom incomplet");
    }

    if (!orderData.phone) {
      errors.push("Numéro de téléphone manquant");
    }

    if (!orderData.city || !orderData.address) {
      errors.push("Adresse de livraison incomplète");
    }

    return errors;
  }, []);

  const handleMultipleProducts = useCallback(async (
    choice: string,
    productId: string
  ): Promise<boolean> => {
    const quantity = choice === "2 exemplaires" ? 2 : 
                    choice === "3 exemplaires" ? 3 : 4;
    
    const success = await addProductToOrder(productId, quantity);
    
    if (success) {
      dispatch({ type: 'SET_FORM_STEP', payload: 'contact-info' });
      await addBotResponse([{
        type: 'assistant',
        content: "Pour procéder à votre commande, j'ai besoin de quelques informations. Tout d'abord, quel est votre nom complet ?"
      }]);
    }
    
    return success;
  }, [dispatch, addProductToOrder, addBotResponse]);

  return {
    calculateOrderTotal,
    addProductToOrder,
    updateQuantity,
    removeProduct,
    validateOrder,
    handleMultipleProducts,
    handleOrderSummary
  };
}