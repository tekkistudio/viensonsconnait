// features/blog/hooks/useArticles.ts
import { useState, useEffect } from 'react';
import { blogApi, CompletePost } from '../services/api';
import type { Article } from '@/types/blog';

const convertToArticle = (post: CompletePost): Article => {
  return {
    id: post.id.toString(), 
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt || '',
    content: post.content || '', 
    featured: post.featured || false,
    image: post.image_url || '',
    category: post.category?.name || 'Non catégorisé',
    readTime: `${Math.ceil((post.content || '').split(' ').length / 200)} min`, 
    date: post.published_at || post.created_at,
    tags: post.tags ? post.tags.map(tag => tag.name) : [],
    author: {
      name: post.author?.name || 'Anonyme',
      image: post.author?.image_url || '/images/default-avatar.png' 
    }
  };
};

export function useArticles(slug?: string) {
  const [article, setArticle] = useState<Article | null>(null);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Charger tous les articles
        const posts = await blogApi.getAllPosts();
        const convertedArticles = posts.map(convertToArticle);
        setAllArticles(convertedArticles);

        // Si un slug est fourni, charger l'article spécifique
        if (slug) {
          const foundPost = await blogApi.getPostBySlug(slug);
          if (foundPost) {
            setArticle(convertToArticle(foundPost));
          } else {
            setError('Article non trouvé');
          }
        }
      } catch (err) {
        setError('Erreur lors du chargement des articles');
        console.error('Error in useArticles:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  return { article, allArticles, isLoading, error };
}