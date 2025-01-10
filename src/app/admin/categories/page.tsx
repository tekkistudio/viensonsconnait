// app/admin/categories/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Database } from '../../../types/supabase'

type Category = Database['public']['Tables']['blog_categories']['Row']

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    description: '',
    color: '#132D5D'
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('name')

      if (error) throw error

      setCategories(data)
    } catch (err) {
      setError('Erreur lors du chargement des catégories')
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data, error } = await supabase
        .from('blog_categories')
        .insert([
          {
            name: editForm.name,
            slug: editForm.slug || generateSlug(editForm.name),
            description: editForm.description,
            color: editForm.color
          }
        ])
        .select()
        .single()

      if (error) throw error

      setCategories(prev => [...prev, data])
      setEditForm({ name: '', slug: '', description: '', color: '#132D5D' })
    } catch (err) {
      setError('Erreur lors de la création de la catégorie')
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditing) return

    try {
      const { error } = await supabase
        .from('blog_categories')
        .update({
          name: editForm.name,
          slug: editForm.slug || generateSlug(editForm.name),
          description: editForm.description,
          color: editForm.color
        })
        .eq('id', isEditing)

      if (error) throw error

      fetchCategories()
      setIsEditing(null)
      setEditForm({ name: '', slug: '', description: '', color: '#132D5D' })
    } catch (err) {
      setError('Erreur lors de la modification de la catégorie')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('blog_categories')
        .delete()
        .eq('id', id)

      if (error) throw error

      setCategories(prev => prev.filter(cat => cat.id !== id))
    } catch (err) {
      setError('Erreur lors de la suppression de la catégorie')
    }
  }

  const startEdit = (category: Category) => {
    setIsEditing(category.id)
    setEditForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      color: category.color || '#132D5D'
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
        <h1 className="text-2xl font-bold text-gray-900">Catégories</h1>
        <p className="mt-1 text-sm text-gray-600">
          Gérez les catégories d'articles
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Formulaire de création/édition */}
      <form 
        onSubmit={isEditing ? handleEdit : handleCreate}
        className="bg-white p-6 rounded-lg shadow-sm space-y-4"
      >
        <h2 className="text-lg font-medium text-gray-900">
          {isEditing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nom
            </label>
            <input
              type="text"
              id="name"
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ 
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
              value={editForm.slug}
              onChange={(e) => setEditForm(prev => ({ ...prev, slug: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-pink focus:ring-brand-pink"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-pink focus:ring-brand-pink"
            />
          </div>

          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700">
              Couleur
            </label>
            <input
              type="color"
              id="color"
              value={editForm.color}
              onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
              className="mt-1 block w-full h-10 rounded-md border border-gray-300 px-3 focus:border-brand-pink focus:ring-brand-pink"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(null)
                setEditForm({ name: '', slug: '', description: '', color: '#132D5D' })
              }}
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

      {/* Liste des catégories */}
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
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Couleur
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900">{category.name}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-600">{category.slug}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-gray-600 line-clamp-2">
                    {category.description || '-'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: category.color || '#132D5D' }}
                    />
                    <span className="text-gray-600">{category.color || '-'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => startEdit(category)}
                    className="text-gray-400 hover:text-brand-blue p-1"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="text-gray-400 hover:text-red-500 p-1 ml-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Aucune catégorie créée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}