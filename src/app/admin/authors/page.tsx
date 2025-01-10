// app/admin/authors/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, Upload, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import Image from 'next/image'
import type { Database } from '../../../types/supabase'
import { v4 as uuidv4 } from 'uuid'

type Author = Database['public']['Tables']['blog_authors']['Row']

interface AuthorFormData {
  name: string
  role: string
  bio: string
  email: string
  image_url: string
}

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [formData, setFormData] = useState<AuthorFormData>({
    name: '',
    role: '',
    bio: '',
    email: '',
    image_url: ''
  })

  useEffect(() => {
    fetchAuthors()
  }, [])

  const fetchAuthors = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('blog_authors')
        .select('*')
        .order('name')

      if (error) throw error

      setAuthors(data)
    } catch (err) {
      setError('Erreur lors du chargement des auteurs')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return

    const file = e.target.files[0]
    if (!file.type.startsWith('image/')) {
      setError('Le fichier doit être une image')
      return
    }

    try {
      setIsUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `authors/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, image_url: publicUrl }))
    } catch (err) {
      setError('Erreur lors de l\'upload de l\'image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('blog_authors')
          .update(formData)
          .eq('id', isEditing)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('blog_authors')
          .insert([formData])

        if (error) throw error
      }

      fetchAuthors()
      resetForm()
    } catch (err) {
      setError(`Erreur lors de ${isEditing ? 'la modification' : 'la création'} de l'auteur`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet auteur ?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('blog_authors')
        .delete()
        .eq('id', id)

      if (error) throw error

      setAuthors(prev => prev.filter(author => author.id !== id))
    } catch (err) {
      setError('Erreur lors de la suppression de l\'auteur')
    }
  }

  const startEdit = (author: Author) => {
    setIsEditing(author.id)
    setFormData({
      name: author.name,
      role: author.role || '',
      bio: author.bio || '',
      email: author.email || '',
      image_url: author.image_url || ''
    })
  }

  const resetForm = () => {
    setIsEditing(null)
    setFormData({
      name: '',
      role: '',
      bio: '',
      email: '',
      image_url: ''
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
        <h1 className="text-2xl font-bold text-gray-900">Auteurs</h1>
        <p className="mt-1 text-sm text-gray-600">
          Gérez les auteurs du blog
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
          {isEditing ? 'Modifier l\'auteur' : 'Nouvel auteur'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nom complet
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-pink focus:ring-brand-pink"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-pink focus:ring-brand-pink"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Rôle
            </label>
            <input
              type="text"
              id="role"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-pink focus:ring-brand-pink"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Photo de profil
            </label>
            <div className="mt-1 flex items-center gap-4">
              {formData.image_url && (
                <div className="relative w-16 h-16 rounded-full overflow-hidden">
                  <Image
                    src={formData.image_url}
                    alt=""
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                    className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                <Upload className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {isUploading ? 'Uploading...' : 'Upload image'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          <div className="col-span-2">
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
              Biographie
            </label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              rows={4}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-pink focus:ring-brand-pink"
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

      {/* Liste des auteurs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Auteur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {authors.map((author) => (
              <tr key={author.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {author.image_url ? (
                      <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden relative">
                        <Image
                          src={author.image_url}
                          alt={author.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 font-medium">
                          {author.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="ml-4">
                      <div className="font-medium text-gray-900">{author.name}</div>
                      {author.bio && (
                        <div className="text-sm text-gray-500 line-clamp-1">
                          {author.bio}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-600">{author.role || '-'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-600">{author.email || '-'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => startEdit(author)}
                    className="text-gray-400 hover:text-brand-blue p-1"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(author.id)}
                    className="text-gray-400 hover:text-red-500 p-1 ml-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {authors.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Aucun auteur créé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}