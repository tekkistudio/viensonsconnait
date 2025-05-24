// src/lib/services/whatsapp.service.ts
import { supabase } from '@/lib/supabase';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

interface WhatsAppSubscriber {
  phone_number: string;
  country_code: string;
  full_phone_number: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export const whatsappService = {
  validatePhoneNumber(phoneNumber: string): boolean {
    try {
      return isValidPhoneNumber(phoneNumber);
    } catch (error) {
      console.error('Error validating phone number:', error);
      return false;
    }
  },

  formatPhoneNumber(phoneNumber: string): { 
    formatted: string;
    countryCode: string;
    fullNumber: string;
  } | null {
    try {
      const parsed = parsePhoneNumber(phoneNumber);
      if (!parsed) return null;

      return {
        formatted: parsed.formatInternational(),
        countryCode: parsed.country || 'UNKNOWN',
        fullNumber: parsed.format('E.164') // Format: +XXXXXXXXXXXX
      };
    } catch (error) {
      console.error('Error formatting phone number:', error);
      return null;
    }
  },

  async addSubscriber(phoneNumber: string): Promise<WhatsAppSubscriber | null> {
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      if (!formattedNumber) throw new Error('Invalid phone number format');

      const { data, error } = await supabase
        .from('whatsapp_subscribers')
        .insert([{
          phone_number: formattedNumber.formatted,
          country_code: formattedNumber.countryCode,
          full_phone_number: formattedNumber.fullNumber,
          tags: ['website_signup'],
          metadata: {
            signup_source: 'website',
            signup_date: new Date().toISOString()
          }
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique violation
          console.log('Phone number already registered');
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error adding subscriber:', error);
      throw error;
    }
  },

  async getSubscriber(phoneNumber: string): Promise<WhatsAppSubscriber | null> {
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      if (!formattedNumber) return null;

      const { data, error } = await supabase
        .from('whatsapp_subscribers')
        .select('*')
        .eq('full_phone_number', formattedNumber.fullNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting subscriber:', error);
      return null;
    }
  },

  async updateLastInteraction(phoneNumber: string): Promise<void> {
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      if (!formattedNumber) return;

      await supabase
        .from('whatsapp_subscribers')
        .update({ 
          last_interaction_date: new Date().toISOString()
        })
        .eq('full_phone_number', formattedNumber.fullNumber);
    } catch (error) {
      console.error('Error updating last interaction:', error);
    }
  }
};