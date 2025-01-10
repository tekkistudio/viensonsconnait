// types/supabase.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
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
    }
  }
}