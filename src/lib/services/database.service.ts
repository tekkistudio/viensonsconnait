// src/lib/services/database.service.ts
import { supabase } from '@/lib/supabase'
import type { Database } from '../../types/supabase'

export type Order = Database['public']['Tables']['orders']['Row']

export class DatabaseService {
  // Créer une commande
  async createOrder(data: {
    product_id: string
    customer_name: string
    first_name: string
    last_name: string
    city: string
    address: string
    phone: string
    payment_method: string
    order_details: string
    total_amount: number
    delivery_cost?: number
    metadata?: any
  }) {
    const { data: order, error } = await supabase
      .from('orders')
      .insert([{
        ...data,
        status: 'pending',
        order_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        delivery_cost: data.delivery_cost || 0
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating order:', error)
      throw error
    }
    return order
  }

  // Obtenir une commande par ID
  async getOrder(id: number) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error getting order:', error)
      throw error
    }
    return data
  }

  // Mettre à jour le statut d'une commande
  async updateOrderStatus(id: number, status: string) {
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating order status:', error)
      throw error
    }
    return data
  }

  // Obtenir toutes les commandes
  async getAllOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('order_date', { ascending: false })

    if (error) {
      console.error('Error getting orders:', error)
      throw error
    }
    return data
  }

  // Mettre à jour les métadonnées d'une commande
  async updateOrderMetadata(id: number, metadata: any) {
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating order metadata:', error)
      throw error
    }
    return data
  }
}

export const databaseService = new DatabaseService()