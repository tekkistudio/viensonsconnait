// src/lib/services/OrderService.ts - Version Corrigée

import { supabase } from '@/lib/supabase';
import type { 
  OrderData, 
  OrderStatus,
  PaymentProvider, 
  AbandonedCart,
  AbandonedCartMetadata,
  OrderItem
} from '@/types/order';
import type { ConversationStep } from '@/types/chat';

export class OrderService {
  private static instance: OrderService | null = null;

  private constructor() {}

  public static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  /**
   * Initialise un nouveau panier ou met à jour un panier existant
   */
  async initializeCart(
    sessionId: string,
    productId: string,
    storeId: string
  ): Promise<void> {
    try {
      // Récupérer les informations du produit
      const { data: product } = await supabase
        .from('products')
        .select('name, price')
        .eq('id', productId)
        .single();

      if (!product) {
        throw new Error('Product not found');
      }

      const cartData: Partial<AbandonedCart> = {
        id: sessionId,
        product_id: productId,
        cart_stage: 'initial',
        first_name: '',
        last_name: '',
        email: undefined,
        phone: '',
        city: '',
        address: '',
        converted_to_order: false,
        last_active_at: new Date().toISOString(),
        metadata: {
          orderData: {
            session_id: sessionId,
            items: [{
              productId,
              name: product.name,
              quantity: 1,
              price: product.price,
              totalPrice: product.price
            }],
            total_amount: product.price,
            delivery_cost: 0,
            metadata: {
              source: 'chatbot',
              storeId,
              productId,
              conversationId: sessionId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              conversationHistory: []
            }
          },
          lastUpdate: new Date().toISOString(),
          source: '',
          storeId: '',
          productId: '',
          conversationId: '',
          createdAt: '',
          updatedAt: '',
          conversationHistory: []
        }
      };

      // Upsert pour gérer à la fois la création et la mise à jour
      const { error } = await supabase
        .from('abandoned_carts')
        .upsert(cartData);

      if (error) throw error;

    } catch (error) {
      console.error('Error initializing cart:', error);
      throw error;
    }
  }

  /**
   * Met à jour le panier avec de nouvelles informations
   */
  async updateCart(
    sessionId: string,
    data: Partial<AbandonedCart>
  ): Promise<void> {
    try {
      const { data: currentCart } = await supabase
        .from('abandoned_carts')
        .select('metadata')
        .eq('id', sessionId)
        .single();

      const updatedMetadata: AbandonedCartMetadata = {
        ...(currentCart?.metadata || {}),
        ...(data.metadata || {}),
        lastUpdate: new Date().toISOString()
      };

      const { error } = await supabase
        .from('abandoned_carts')
        .update({
          ...data,
          last_active_at: new Date().toISOString(),
          metadata: updatedMetadata
        })
        .eq('id', sessionId);

      if (error) throw error;

    } catch (error) {
      console.error('Error updating cart:', error);
      throw error;
    }
  }

  /**
   * Met à jour les produits dans le panier
   */
  async updateCartItems(
    sessionId: string,
    items: OrderItem[],
    deliveryCost: number = 0
  ): Promise<void> {
    try {
      const totalAmount = this.calculateTotal(items, deliveryCost);

      const { data: currentCart } = await supabase
        .from('abandoned_carts')
        .select('metadata')
        .eq('id', sessionId)
        .single();

      const updatedMetadata = {
        ...currentCart?.metadata,
        orderData: {
          ...currentCart?.metadata?.orderData,
          items,
          total_amount: totalAmount,
          delivery_cost: deliveryCost,
          updatedAt: new Date().toISOString()
        }
      };

      await this.updateCart(sessionId, {
        metadata: updatedMetadata
      });

    } catch (error) {
      console.error('Error updating cart items:', error);
      throw error;
    }
  }

  /**
   * Convertit un panier abandonné en commande
   */
  async convertToOrder(
    sessionId: string,
    paymentMethod: PaymentProvider,
    paymentStatus: 'pending' | 'completed' = 'pending'
  ): Promise<string> {
    try {
      // Récupérer le panier
      const { data: cart } = await supabase
        .from('abandoned_carts')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!cart || cart.converted_to_order) {
        throw new Error('Cart not found or already converted');
      }

      const orderData = cart.metadata?.orderData;
      if (!orderData) {
        throw new Error('Invalid cart data');
      }

      // Créer la commande
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          session_id: sessionId,
          product_id: cart.product_id,
          customer_name: `${cart.first_name} ${cart.last_name}`,
          first_name: cart.first_name,
          last_name: cart.last_name,
          email: cart.email,
          phone: cart.phone,
          city: cart.city,
          address: cart.address,
          payment_method: paymentMethod,
          order_details: '',
          total_amount: orderData.total_amount,
          delivery_cost: orderData.delivery_cost,
          status: 'pending',
          items: orderData.items,
          payment_status: paymentStatus,
          order_date: new Date().toISOString(),
          metadata: {
            ...orderData.metadata,
            paymentProvider: paymentMethod,
            paymentStatus: paymentStatus,
            convertedAt: new Date().toISOString()
          }
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Marquer le panier comme converti
      await this.updateCart(sessionId, {
        converted_to_order: true,
        metadata: {
          ...cart.metadata,
          convertedToOrderAt: new Date().toISOString()
        }
      });

      // Mettre à jour les statistiques du client
      await this.updateCustomerStats(cart.phone, orderData.total_amount);

      return order.id;

    } catch (error) {
      console.error('Error converting cart to order:', error);
      throw error;
    }
  }
  
  /**
   * Crée une commande à partir d'un panier abandonné (sessionId)
   */
  public async createOrder(sessionId: string): Promise<string> {
    try {
      // Récupérer le panier abandonné
      const { data: cart, error: cartError } = await supabase
        .from('abandoned_carts')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (cartError || !cart) {
        throw new Error(`Cart not found: ${cartError?.message || 'Unknown error'}`);
      }
      
      // Générer un ID de commande unique avec préfixe
      const orderId = `ORD-${Math.floor(Math.random() * 10000)}-${new Date().getTime().toString().slice(-4)}`;
      
      // Extraire les données de commande du panier
      const cartData = cart as AbandonedCart;
      const orderData = cartData.metadata?.orderData as Partial<OrderData>;
      
      if (!orderData) {
        throw new Error('Order data not found in cart');
      }
      
      // Préparer les données de la commande
      const order = {
        id: orderId,
        customer_id: null, // À compléter si un utilisateur est connecté
        product_id: cartData.product_id,
        customer_name: `${cartData.first_name} ${cartData.last_name}`,
        first_name: cartData.first_name || orderData.first_name || '',
        last_name: cartData.last_name || orderData.last_name || '',
        email: cartData.email || orderData.email || null,
        phone: cartData.phone || orderData.phone || '',
        city: cartData.city || orderData.city || '',
        address: cartData.address || orderData.address || '',
        order_status: 'confirmed',
        payment_status: orderData.payment_method === 'CASH' as PaymentProvider ? 'pending' : 'completed',
        total_amount: orderData.total_amount || 0,
        delivery_cost: orderData.delivery_cost || 0,
        payment_method: orderData.payment_method || 'CASH' as PaymentProvider,
        items: orderData.items || [],
        order_details: orderData.order_details || '',
        status: 'pending',
        order_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          source: 'chatbot',
          originalCart: sessionId,
          ...(orderData.metadata || {})
        }
      };
      
      // Insérer la commande dans la base de données
      const { error: orderError } = await supabase
        .from('orders')
        .insert([order]);
      
      if (orderError) {
        throw new Error(`Failed to create order: ${orderError.message}`);
      }
      
      // Marquer le panier comme converti
      type CartUpdateData = Partial<AbandonedCart> & {
        converted_to_order: boolean;
        order_id?: string;
        conversion_date?: string;
      };
      
      const updateData: CartUpdateData = {
        converted_to_order: true,
        conversion_date: new Date().toISOString(),
        order_id: orderId
      };
      
      await this.updateCart(sessionId, updateData);
      
      // Mettre à jour les statistiques du client si nécessaire
     if (cartData.phone) {
      await this.updateCustomerStats(cartData.phone, order.total_amount);
    }
    
    return orderId;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

/**
 * NOUVELLE MÉTHODE - Crée une commande à partir de données complètes
 */
public async createOrderFromData(orderData: any): Promise<string> {
  try {
    // Générer un ID de commande unique
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Préparer les données de commande
    const orderPayload = {
      id: orderId,
      session_id: orderData.session_id,
      product_id: orderData.product_id,
      first_name: orderData.first_name || '',
      last_name: orderData.last_name || '',
      phone: orderData.phone || '',
      email: orderData.email || null,
      city: orderData.city || '',
      address: orderData.address || '',
      payment_method: orderData.payment_method || 'CASH',
      total_amount: orderData.total_amount || 0,
      delivery_cost: orderData.delivery_cost || 0,
      status: orderData.status || 'pending',
      payment_status: orderData.payment_status || 'pending',
      order_details: orderData.order_details || '',
      metadata: {
        ...orderData.metadata,
        items: orderData.items || [],
        source: 'chatbot_express',
        createdAt: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insérer la commande
    const { data, error } = await supabase
      .from('orders')
      .insert([orderPayload])
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }

    // Mettre à jour le statut du panier abandonné
    await supabase
      .from('abandoned_carts')
      .update({ 
        converted_to_order: true,
        order_id: orderId,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderData.session_id);

    console.log(`Order created successfully: ${orderId}`);
    return orderId;

  } catch (error) {
    console.error('Error in createOrderFromData:', error);
    throw error;
  }
}

/**
 * Met à jour le statut de la commande
 */
async updateOrderStatus(
  sessionId: string,
  status: OrderStatus,
  paymentStatus?: 'pending' | 'completed' | 'failed'
): Promise<void> {
  try {
    const updateData: any = { status };
    
    if (paymentStatus) {
      updateData.payment_status = paymentStatus;
    }

    const { error } = await supabase
      .from('orders')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);

    if (error) throw error;

  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

/**
 * Met à jour les statistiques du client
 */
private async updateCustomerStats(
  phone: string,
  amount: number
): Promise<void> {
  try {
    const { data: customer } = await supabase
      .from('customers')
      .select('id, total_orders, total_spent')
      .eq('phone', phone)
      .single();

    if (customer) {
      await supabase
        .from('customers')
        .update({
          total_orders: (customer.total_orders || 0) + 1,
          total_spent: (customer.total_spent || 0) + amount,
          last_order_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);
    }
  } catch (error) {
    console.error('Error updating customer stats:', error);
    // Ne pas propager l'erreur pour ne pas bloquer le processus
  }
}

/**
 * Calcule le total de la commande
 */
private calculateTotal(items: OrderItem[], deliveryCost: number = 0): number {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  return subtotal + deliveryCost;
}

/**
 * Récupère les données actuelles du panier
 */
async getCartData(sessionId: string): Promise<AbandonedCart | null> {
  try {
    const { data, error } = await supabase
      .from('abandoned_carts')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    return data;

  } catch (error) {
    console.error('Error fetching cart data:', error);
    return null;
  }
}

/**
 * Met à jour l'étape actuelle du panier
 */
async updateCartStep(
  sessionId: string,
  step: ConversationStep
): Promise<void> {
  try {
    const { data: currentCart } = await supabase
      .from('abandoned_carts')
      .select('metadata')
      .eq('id', sessionId)
      .single();

    if (!currentCart?.metadata?.orderData) {
      throw new Error('Invalid cart data');
    }

    const timestamp = new Date().toISOString();
    
    const updatedMetadata = {
      ...currentCart.metadata,
      orderData: {
        ...currentCart.metadata.orderData,
        formStep: step,
        metadata: {
          ...currentCart.metadata.orderData.metadata,
          updatedAt: timestamp
        }
      },
      lastUpdate: timestamp
    };

    await this.updateCart(sessionId, {
      cart_stage: step, // Gardons la synchronisation pour la rétrocompatibilité
      metadata: updatedMetadata
    });

    // Mettre à jour également la conversation si elle existe
    const { error: conversationError } = await supabase
      .from('conversations')
      .update({
        metadata: {
          step,
          lastUpdate: timestamp
        }
      })
      .eq('id', sessionId);

    if (conversationError) {
      console.warn('Could not update conversation step:', conversationError);
    }

  } catch (error) {
    console.error('Error updating cart step:', error);
    throw error;
  }
}

/**
 * Récupère l'étape actuelle du panier
 */
async getCurrentStep(sessionId: string): Promise<ConversationStep> {
  try {
    const { data: cart } = await supabase
      .from('abandoned_carts')
      .select('metadata')
      .eq('id', sessionId)
      .single();

    return cart?.metadata?.orderData?.formStep || 'initial';
  } catch (error) {
    console.error('Error getting current step:', error);
    return 'initial';
  }
}
}