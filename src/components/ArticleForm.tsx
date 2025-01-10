// src/components/ArticleForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { Loader2 } from 'lucide-react'
import RichTextEditor from '../components/editor/RichTextEditor'
import type { Database } from '../types/supabase'

type Category = Database['public']['Tables']['blog_categories']['Row']
type Author = Database['public']['Tables']['blog_authors']['Row']

interface ArticleFormData {
  title: string
  slug: string
  excerpt: string
  content: string
  category_id: string
  author_id: string
  status: 'draft' | 'published'
  featured: boolean
  read_time: string
}

export default function ArticleForm({ articleId }: { articleId?: string }) {
  const router = useRouter()
  const [formData, setFormData] = useState<ArticleFormData>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category_id: '',
    author_id: '',
    status: 'draft',
    featured: false,
    read_time: ''
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
    fetchAuthors()
    if (articleId) {
      fetchArticle()
    }
  }, [articleId])

  const fetchCategories = async () => {
    const { data } = await supabase.from('blog_categories').select('*')
    if (data) setCategories(data)
  }

  const fetchAuthors = async () => {
    const { data } = await supabase.from('blog_authors').select('*')
    if (data) setAuthors(data)
  }

  const fetchArticle = async () => {
    if (!articleId) return
    setIsLoading(true)
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', articleId)
      .single()

    if (error) {
      setError(error.message)
    } else if (data) {
      setFormData(data)
    }
    setIsLoading(false)
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      const { error } = articleId
        ? await supabase
            .from('blog_posts')
            .update(formData)
            .eq('id', articleId)
        : await supabase
            .from('blog_posts')
            .insert([{ ...formData, published_at: formData.status === 'published' ? new Date().toISOString() : null }])

      if (error) throw error

      router.push('/admin/articles')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Titre
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={handleTitleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-pink focus:ring-brand-pink"
            required
          />
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
            Slug
          </label>
          <input
            type="text"
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-pink focus:ring-brand-pink"
            required
          />
        </div>

        <div>
          <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700">
            Extrait
          </label>
          <textarea
            id="excerpt"
            value={formData.excerpt}
            onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-pink focus:ring-brand-pink"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contenu
          </label>
          <RichTextEditor
            content={formData.content}
            onChange={(content) => setFormData(prev => ({ ...prev, content }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Catégorie
            </label>
            <select
              id="category"
              value={formData.category_id}
              onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-pink focus:ring-brand-pink"
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="author" className="block text-sm font-medium text-gray-700">
              Auteur
            </label>
            <select
              id="author"
              value={formData.author_id}
              onChange={(e) => setFormData(prev => ({ ...prev, author_id: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-pink focus:ring-brand-pink"
            >
              <option value="">Sélectionner un auteur</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="readTime" className="block text-sm font-medium text-gray-700">
              Temps de lecture
            </label>
            <input
              type="text"
              id="readTime"
              value={formData.read_time}
              onChange={(e) => setFormData(prev => ({ ...prev, read_time: e.target.value }))}
              placeholder="Ex: 5 min"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-pink focus:ring-brand-pink"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Statut
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                status: e.target.value as 'draft' | 'published'
              }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-pink focus:ring-brand-pink"
            >
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="featured"
            checked={formData.featured}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              featured: e.target.checked
            }))}
            className="rounded border-gray-300 text-brand-pink focus:ring-brand-pink"
          />
          <label htmlFor="featured" className="text-sm font-medium text-gray-700">
            Article à la une
          </label>
        </div>
      </div>

      <div className="flex gap-4 justify-end pt-6 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-gray-700 hover:text-gray-900"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-pink 
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed 
            inline-flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            'Enregistrer'
          )}
        </button>
      </div>
    </form>
  )
}