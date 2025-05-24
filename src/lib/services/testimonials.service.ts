// src/lib/services/testimonials.service.ts
import { supabase } from '@/lib/supabase';

interface Testimonial {
  id: string;
  product_id: string;
  author_name: string;
  author_location: string;
  content: string;
  rating: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export const testimonialsService = {
  async getTestimonialsCountByProduct(productId: string | undefined): Promise<number> {
    // Validation du productId
    if (!productId) {
      console.warn('getTestimonialsCountByProduct: productId is undefined');
      return 0;
    }

    try {
      console.log('Fetching testimonials count for productId:', productId);
      
      const { data, error, count } = await supabase
        .from('testimonials')
        .select('*', { count: 'exact' })
        .eq('product_id', productId)
        .eq('status', 'active');

      if (error) {
        console.error('Supabase error in getTestimonialsCountByProduct:', error);
        return 0;
      }

      console.log('Testimonials count result:', { data, count });
      return count ?? 0;
    } catch (error) {
      console.error('Error in getTestimonialsCountByProduct:', error);
      return 0;
    }
  },

  async getProductTestimonials(productId: string | undefined): Promise<Testimonial[]> {
    if (!productId) {
      console.warn('getProductTestimonials: productId is undefined');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('product_id', productId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error in getProductTestimonials:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProductTestimonials:', error);
      return [];
    }
  },

  async getAverageRating(productId: string | undefined): Promise<number> {
    if (!productId) {
      console.warn('getAverageRating: productId is undefined');
      return 0;
    }

    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('rating')
        .eq('product_id', productId)
        .eq('status', 'active');

      if (error) {
        console.error('Supabase error in getAverageRating:', error);
        return 0;
      }

      if (!data || data.length === 0) return 0;

      const sum = data.reduce((acc, curr) => acc + (curr.rating || 0), 0);
      return Number((sum / data.length).toFixed(1));
    } catch (error) {
      console.error('Error in getAverageRating:', error);
      return 0;
    }
  }
};