//src/features/blog/services/api.ts
import { supabase } from '../../../lib/supabase'
import type { Database } from '../../../types/supabase'

type BlogPost = Database['public']['Tables']['blog_posts']['Row']
type BlogCategory = Database['public']['Tables']['blog_categories']['Row']
type BlogAuthor = Database['public']['Tables']['blog_authors']['Row']
type BlogTag = Database['public']['Tables']['blog_tags']['Row']

export interface CompletePost extends BlogPost {
  category: BlogCategory | null
  author: BlogAuthor | null
  tags: BlogTag[]
}

export const blogApi = {
  // Posts
  async getAllPosts(): Promise<CompletePost[]> {
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        category:blog_categories(*),
        author:blog_authors(*),
        tags:blog_posts_tags(blog_tags(*))
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Error fetching posts:', error)
      return []
    }

    return posts.map(post => ({
      ...post,
      tags: post.tags.map((tag: any) => tag.blog_tags)
    })) as CompletePost[]
  },

  async getPostBySlug(slug: string): Promise<CompletePost | null> {
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        category:blog_categories(*),
        author:blog_authors(*),
        tags:blog_posts_tags(blog_tags(*))
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error) {
      console.error('Error fetching post:', error)
      return null
    }

    return {
      ...post,
      tags: post.tags.map((tag: any) => tag.blog_tags)
    } as CompletePost
  },

  async getFeaturedPosts(): Promise<CompletePost[]> {
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        category:blog_categories(*),
        author:blog_authors(*),
        tags:blog_posts_tags(blog_tags(*))
      `)
      .eq('status', 'published')
      .eq('featured', true)
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Error fetching featured posts:', error)
      return []
    }

    return posts.map(post => ({
      ...post,
      tags: post.tags.map((tag: any) => tag.blog_tags)
    })) as CompletePost[]
  },

  async getPostsByCategory(categorySlug: string): Promise<CompletePost[]> {
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        category:blog_categories(*),
        author:blog_authors(*),
        tags:blog_posts_tags(blog_tags(*))
      `)
      .eq('status', 'published')
      .eq('category.slug', categorySlug)
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Error fetching posts by category:', error)
      return []
    }

    return posts.map(post => ({
      ...post,
      tags: post.tags.map((tag: any) => tag.blog_tags)
    })) as CompletePost[]
  },

  // Categories
  async getAllCategories(): Promise<BlogCategory[]> {
    const { data: categories, error } = await supabase
      .from('blog_categories')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching categories:', error)
      return []
    }

    return categories
  },

  // Tags
  async getAllTags(): Promise<BlogTag[]> {
    const { data: tags, error } = await supabase
      .from('blog_tags')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching tags:', error)
      return []
    }

    return tags
  }
}