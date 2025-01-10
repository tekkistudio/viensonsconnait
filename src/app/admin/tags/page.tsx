// app/admin/tags/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Database } from '../../../types/supabase'

type Tag = Database['public']['Tables']['blog_tags']['Row']

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: ''
  })

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('blog_tags')
        .select('*')
        .order('name')

      if (error) throw error

      setTags(data)
    } catch (err) {
      setError('Erreur lors du chargement des tags')
    } finally {
      setIsLoading(false)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('blog_tags')
          .update({
            name: formData.name,
            slug: formData.slug || generateSlug(formData.name)
          })
          .eq('id', isEditing)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('blog_tags')
          .insert([{
            name: formData.name,
            slug: formData.slug || generateSlug(formData.name)
          }])

        if (error) throw error
      }

      fetchTags()
      resetForm()
    } catch (err) {
      setError(`Erreur lors de ${isEditing ? 'la modification' : 'la création'} du tag`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce tag ?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('blog_tags')
        .delete()
        .eq('id', id)

      if (error) throw error

      setTags(prev => prev.filter(tag => tag.id !== id))
    } catch (err) {
      setError('Erreur lors de la suppression du tag')
    }
  }

  const startEdit = (tag: Tag) => {
    setIsEditing(tag.id)
    setFormData({
      name: tag.name,
      slug: tag.slug
    })
  }

  const resetForm = () => {
    setIsEditing(null)
    setFormData({
      name: '',
      slug: ''
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tags</h1>
        <p className="mt-1 text-sm text-gray-600">
          Gérez les tags des articles
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        <h2 className="text-lg font-medium text-gray-900">
          {isEditing ? 'Modifier le tag' : 'Nouveau tag'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nom
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                name: e.target.value,
                slug: generateSlug(e.target.value)
              }))}
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
        </div>

        <div className="flex justify-end gap-4">
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-pink transition-colors"
          >
            {isEditing ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </form>

      {/* Liste des tags */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Articles
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tags.map((tag) => (
              <tr key={tag.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900">{tag.name}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-600">{tag.slug}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-blue bg-opacity-10 text-brand-blue">
                    Bientôt disponible
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => startEdit(tag)}
                    className="text-gray-400 hover:text-brand-blue p-1"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id)}
                    className="text-gray-400 hover:text-red-500 p-1 ml-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {tags.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Aucun tag créé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}