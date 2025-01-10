// app/admin/articles/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Loader2
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Database } from '../../../types/supabase'

type BlogPost = Database['public']['Tables']['blog_posts']['Row'] & {
  category: Database['public']['Tables']['blog_categories']['Row']
  author: Database['public']['Tables']['blog_authors']['Row']
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<BlogPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          category:blog_categories(*),
          author:blog_authors(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setArticles(data)
    } catch (err) {
      console.error('Error fetching articles:', err)
      setError('Erreur lors du chargement des articles')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id)

      if (error) throw error

      fetchArticles()
    } catch (err) {
      console.error('Error deleting article:', err)
      setError('Erreur lors de la suppression')
    }
  }

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez les articles du blog
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-pink transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouvel article
        </Link>
      </div>

      {/* Filtres et recherche */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un article..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink"
        >
          <option value="all">Tous les statuts</option>
          <option value="draft">Brouillons</option>
          <option value="published">Publiés</option>
        </select>
      </div>

      {/* Liste des articles */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
          <button
            onClick={fetchArticles}
            className="mt-4 text-brand-blue hover:text-brand-pink"
          >
            Réessayer
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Article
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Auteur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredArticles.map((article) => (
                <tr key={article.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{article.title}</span>
                      {article.excerpt && (
                        <span className="text-sm text-gray-500 line-clamp-1">{article.excerpt}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-sm rounded-full bg-gray-100">
                      {article.category?.name || 'Sans catégorie'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900">{article.author?.name || 'Anonyme'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-sm rounded-full ${
                      article.status === 'published' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {article.status === 'published' ? 'Publié' : 'Brouillon'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(article.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Link
                      href={`/blog/${article.slug}`}
                      target="_blank"
                      className="text-gray-400 hover:text-brand-blue inline-flex p-1"
                    >
                      <Eye className="w-5 h-5" />
                    </Link>
                    <Link
                      href={`/admin/articles/${article.id}/edit`}
                      className="text-gray-400 hover:text-brand-blue inline-flex p-1"
                    >
                      <Edit className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(article.id)}
                      className="text-gray-400 hover:text-red-500 inline-flex p-1"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredArticles.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Aucun article trouvé
            </div>
          )}
        </div>
      )}
    </div>
  )
}