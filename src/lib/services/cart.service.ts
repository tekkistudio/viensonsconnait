// src/lib/services/cart.service.ts
import { supabase } from "@/lib/supabase";
import { OrderData } from "@/features/product/types/chat";

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
}

interface Cart {
  id?: string;
  product_id?: string;
  metadata: {
    items: CartItem[];
    totalAmount?: number;
    [key: string]: any;
  };
  cart_stage: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  address?: string;
  converted_to_order: boolean;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

const TABLE_NAME = 'abandoned_carts';

export class CartService {
  private static instance: CartService;
  private currentCart: Cart | null = null;

  private constructor() {}

  public static getInstance(): CartService {
    if (!CartService.instance) {
      CartService.instance = new CartService();
    }
    return CartService.instance;
  }

  async initializeCart(userId?: string): Promise<Cart> {
    try {
      const newCart: Partial<Cart> = {
        product_id: userId,
        cart_stage: 'initial',
        converted_to_order: false,
        metadata: {
          items: [],
          totalAmount: 0,
          createdAt: new Date().toISOString()
        },
        last_active_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert([newCart])
        .select()
        .single();

      if (error) {
        console.error('Error initializing cart in Supabase:', error);
        throw new Error(`Failed to initialize cart: ${error.message}`);
      }

      if (!data) {
        throw new Error('No cart data returned after initialization');
      }

      this.currentCart = data;
      return data;
    } catch (error) {
      console.error('Error initializing cart:', error);
      throw error;
    }
  }

  async getOrCreateCart(userId?: string): Promise<Cart> {
    try {
      if (this.currentCart) {
        return this.currentCart;
      }

      const { data: existingCart, error: fetchError } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('converted_to_order', false)
        .eq('product_id', userId || '')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') { // No rows returned
          return this.initializeCart(userId);
        }
        console.error('Error fetching cart from Supabase:', fetchError);
        throw new Error(`Failed to fetch cart: ${fetchError.message}`);
      }

      if (!existingCart) {
        return this.initializeCart(userId);
      }

      this.currentCart = existingCart;
      return existingCart;
    } catch (error) {
      console.error('Error getting/creating cart:', error);
      throw error;
    }
  }

  async saveCart(orderData: Partial<OrderData>): Promise<Cart | null> {
    try {
      if (!this.currentCart?.id) {
        this.currentCart = await this.getOrCreateCart();
      }

      const cartItems: CartItem[] = orderData.items?.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        name: item.name
      })) || [];

      const updatedCart: Partial<Cart> = {
        first_name: orderData.firstName,
        last_name: orderData.lastName,
        email: orderData.email,
        phone: orderData.phone,
        city: orderData.city,
        address: orderData.address,
        metadata: {
          ...this.currentCart.metadata,
          items: cartItems,
          totalAmount: orderData.totalAmount || 0,
          lastUpdated: new Date().toISOString()
        },
        cart_stage: orderData.formStep || 'initial',
        last_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: cart, error } = await supabase
        .from(TABLE_NAME)
        .update(updatedCart)
        .eq('id', this.currentCart.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating cart in Supabase:', error);
        throw new Error(`Failed to save cart: ${error.message}`);
      }

      this.currentCart = cart;
      return cart;
    } catch (error) {
      console.error('CartService.saveCart error:', error);
      return null;
    }
  }

  async completeCart(orderId: string): Promise<void> {
    try {
      if (!this.currentCart?.id) return;

      const { error } = await supabase
        .from(TABLE_NAME)
        .update({
          converted_to_order: true,
          metadata: { 
            ...this.currentCart.metadata,
            orderId,
            completedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentCart.id);

      if (error) throw new Error(`Failed to complete cart: ${error.message}`);

      this.currentCart = null;
    } catch (error) {
      console.error('Error completing cart:', error);
    }
  }

  async abandonCart(): Promise<void> {
    try {
      if (!this.currentCart?.id) return;

      const { error } = await supabase
        .from(TABLE_NAME)
        .update({
          cart_stage: 'abandoned',
          metadata: {
            ...this.currentCart.metadata,
            abandonedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentCart.id);

      if (error) throw new Error(`Failed to abandon cart: ${error.message}`);

      this.currentCart = null;
    } catch (error) {
      console.error('Error abandoning cart:', error);
    }
  }
}