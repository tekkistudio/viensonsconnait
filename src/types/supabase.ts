// types/supabase.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Type séparé pour AuthLog
export interface AuthLog {
  id: string;
  created_at: string;
  user_id: string | null;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  error: string | null;
  metadata: Json | null;
}

// Types spécifiques pour les commandes et paiements
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentMethod = 'mobile_money' | 'card' | 'cash';

export interface Database {
  public: {
    Tables: {
      auth_logs: {
        Row: AuthLog;
        Insert: Omit<AuthLog, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<AuthLog, 'id' | 'created_at'>> & {
          id?: string;
          created_at?: string;
        };
      };
      blog_categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      blog_authors: {
        Row: {
          id: string
          name: string
          role: string | null
          bio: string | null
          image_url: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          role?: string | null
          bio?: string | null
          image_url?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: string | null
          bio?: string | null
          image_url?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      blog_posts: {
        Row: {
          id: string
          title: string
          slug: string
          excerpt: string | null
          content: string | null
          image_url: string | null
          category_id: string | null
          author_id: string | null
          featured: boolean
          status: 'draft' | 'published' | 'archived'
          read_time: string | null
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          excerpt?: string | null
          content?: string | null
          image_url?: string | null
          category_id?: string | null
          author_id?: string | null
          featured?: boolean
          status?: 'draft' | 'published' | 'archived'
          read_time?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          excerpt?: string | null
          content?: string | null
          image_url?: string | null
          category_id?: string | null
          author_id?: string | null
          featured?: boolean
          status?: 'draft' | 'published' | 'archived'
          read_time?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      blog_tags: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
      }
      blog_posts_tags: {
        Row: {
          post_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          post_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          post_id?: string
          tag_id?: string
          created_at?: string
        }
      }
      orders: {
        Row: {
          created_at: string | number | Date;
          id: number
          product_id: string | null
          customer_name: string | null
          first_name: string | null
          last_name: string | null
          city: string | null
          address: string | null
          phone: string | null
          payment_method: PaymentMethod | null
          order_details: string | null
          total_amount: number
          delivery_cost: number
          status: OrderStatus
          order_date: string
          updated_at: string
          metadata: Json | null
        }
        Insert: {
          id?: number
          product_id?: string | null
          customer_name?: string | null
          first_name?: string | null
          last_name?: string | null
          city?: string | null
          address?: string | null
          phone?: string | null
          payment_method?: PaymentMethod | null
          order_details?: string | null
          total_amount?: number
          delivery_cost?: number
          status?: OrderStatus
          order_date?: string
          updated_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: number
          product_id?: string | null
          customer_name?: string | null
          first_name?: string | null
          last_name?: string | null
          city?: string | null
          address?: string | null
          phone?: string | null
          payment_method?: PaymentMethod | null
          order_details?: string | null
          total_amount?: number
          delivery_cost?: number
          status?: OrderStatus
          order_date?: string
          updated_at?: string
          metadata?: Json | null
        }
      }
      payment_transactions: {
        Row: {
          id: string
          orderId: string
          amount: number
          currency: string
          provider: string
          status: string
          reference: string | null
          metadata: Json | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          orderId: string
          amount: number
          currency: string
          provider: string
          status: string
          reference?: string | null
          metadata?: Json | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          orderId?: string
          amount?: number
          currency?: string
          provider?: string
          status?: string
          reference?: string | null
          metadata?: Json | null
          updatedAt?: string
        }
      }
      // Nouvelles tables ajoutées
      conversations: {
        Row: {
          id: string
          customer_id: string
          status: 'active' | 'pending' | 'closed'
          intent: 'purchase' | 'support' | 'information'
          last_message: string
          last_message_date: string
          has_order: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          status?: 'active' | 'pending' | 'closed'
          intent?: 'purchase' | 'support' | 'information'
          last_message?: string
          last_message_date?: string
          has_order?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          customer_id?: string
          status?: 'active' | 'pending' | 'closed'
          intent?: 'purchase' | 'support' | 'information'
          last_message?: string
          last_message_date?: string
          has_order?: boolean
          metadata?: Json | null
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          content: string
          sender_type: 'customer' | 'assistant' | 'admin'
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          conversation_id: string
          content: string
          sender_type: 'customer' | 'assistant' | 'admin'
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          content?: string
          sender_type?: 'customer' | 'assistant' | 'admin'
          metadata?: Json | null
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          avatar_url: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          email?: string | null
          phone?: string | null
          avatar_url?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          email?: string | null
          phone?: string | null
          avatar_url?: string | null
          metadata?: Json | null
          updated_at?: string
        }
      }
      abandoned_carts: {
        Row: {
          id: string;
          product_id: string | null;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          phone: string | null;
          city: string | null;
          address: string | null;
          cart_stage: string | null;
          last_active_at: string;
          converted_to_order: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          city?: string | null;
          address?: string | null;
          cart_stage?: string | null;
          last_active_at?: string;
          converted_to_order?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          product_id?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          city?: string | null;
          address?: string | null;
          cart_stage?: string | null;
          last_active_at?: string;
          converted_to_order?: boolean;
          metadata?: Json | null;
          updated_at?: string;
        };
      };
    };
  };
}