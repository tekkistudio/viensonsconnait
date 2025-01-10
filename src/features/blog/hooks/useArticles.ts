// features/blog/hooks/useArticles.ts
import { useState, useEffect } from 'react'
import { blogApi, CompletePost } from '../services/api'

export function useArticles(slug?: string) {
  const [article, setArticle] = useState<CompletePost | null>(null)
  const [allArticles, setAllArticles] = useState<CompletePost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Charger tous les articles
        const articles = await blogApi.getAllPosts()
        setAllArticles(articles)
        
        // Si un slug est fourni, charger l'article spécifique
        if (slug) {
          const foundArticle = await blogApi.getPostBySlug(slug)
          if (foundArticle) {
            setArticle(foundArticle)
          } else {
            setError('Article non trouvé')
          }
        }
      } catch (err) {
        setError('Erreur lors du chargement des articles')
        console.error('Error in useArticles:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [slug])

  return { article, allArticles, isLoading, error }
}