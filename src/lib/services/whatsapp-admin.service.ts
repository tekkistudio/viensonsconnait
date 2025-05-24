// src/lib/services/whatsapp-admin.service.ts
import { supabase } from '@/lib/supabase';

export interface WhatsAppMessage {
  id: string;
  content: string;
  recipients: number;
  status: 'pending' | 'sent' | 'failed';
  sent_at: string;
}

export interface MessageStats {
  totalSent: number;
  deliveryRate: number;
  openRate: number;
}

interface WhatsAppFilters {
  status?: string;
  country?: string;
}

interface WhatsAppSubscriber {
  id: string;
  phone_number: string;
  country_code: string;
  status: string;
  opt_in_date: string;
  last_interaction_date: string | null;
  tags: string[];
}

interface WhatsAppStats {
  total: number;
  activeCount: number;
  byCountry: {
    [key: string]: number;
  };
}

// Helper function moved outside the service object
function calculateStats(data: WhatsAppSubscriber[]): WhatsAppStats {
  return {
    total: data.length,
    activeCount: data.filter(s => s.status === 'active').length,
    byCountry: data.reduce((acc, curr) => {
      acc[curr.country_code] = (acc[curr.country_code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}

export const whatsappAdminService = {
  async getAllSubscribers(filters: WhatsAppFilters = {}) {
    try {
      let query = supabase
        .from('whatsapp_subscribers')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.country) {
        query = query.eq('country_code', filters.country);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WhatsAppSubscriber[];
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      throw error;
    }
  },

  async getSubscriberStats(): Promise<WhatsAppStats> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_subscribers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return calculateStats(data);
    } catch (error) {
      console.error('Error fetching subscriber stats:', error);
      throw error;
    }
  },

  async sendBulkMessage(recipientIds: string[], message: string) {
    try {
      const { data: messageData, error: messageError } = await supabase
        .from('whatsapp_messages')
        .insert([{
          content: message,
          recipient_count: recipientIds.length,
          status: 'pending'
        }])
        .select()
        .single();

      if (messageError) throw messageError;

      const response = await fetch('/api/whatsapp/send-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientIds,
          message,
          messageId: messageData.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send WhatsApp message');
      }

      await supabase
        .from('whatsapp_messages')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', messageData.id);

      return messageData;
    } catch (error) {
      console.error('Error sending bulk message:', error);
      throw error;
    }
  },

  async getMessageHistory(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching message history:', error);
      throw error;
    }
  },

  async getMessageStats(messageId: string): Promise<MessageStats> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_message_stats')
        .select('*')
        .eq('message_id', messageId)
        .single();

      if (error) throw error;
      return {
        totalSent: data.total_sent,
        deliveryRate: data.delivery_rate,
        openRate: data.open_rate
      };
    } catch (error) {
      console.error('Error fetching message stats:', error);
      throw error;
    }
  },

  async updateSubscriberStatus(subscriberId: string, status: 'active' | 'inactive') {
    try {
      const { data, error } = await supabase
        .from('whatsapp_subscribers')
        .update({ status })
        .eq('id', subscriberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating subscriber status:', error);
      throw error;
    }
  },

  async addSubscriberTags(subscriberId: string, tags: string[]) {
    try {
      const { data: currentData } = await supabase
        .from('whatsapp_subscribers')
        .select('tags')
        .eq('id', subscriberId)
        .single();

      const updatedTags = [...new Set([...(currentData?.tags || []), ...tags])];

      const { data, error } = await supabase
        .from('whatsapp_subscribers')
        .update({ tags: updatedTags })
        .eq('id', subscriberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding subscriber tags:', error);
      throw error;
    }
  }
};