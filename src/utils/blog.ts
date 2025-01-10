// utils/blog.ts
import type { Article, ArticleMetadata } from '../types/blog';

export const calculateArticleScore = (
  currentArticle: Article,
  compareArticle: Article,
  weights = {
    category: 3,
    tag: 2,
    date: 1
  }
): number => {
  let score = 0;

  // Score basé sur la catégorie
  if (currentArticle.category === compareArticle.category) {
    score += weights.category;
  }

  // Score basé sur les tags communs
  const commonTags = compareArticle.tags.filter(tag => 
    currentArticle.tags.includes(tag)
  );
  score += commonTags.length * weights.tag;

  // Score basé sur la proximité de date
  const currentDate = new Date(currentArticle.date);
  const compareDate = new Date(compareArticle.date);
  const daysDifference = Math.abs(
    (currentDate.getTime() - compareDate.getTime()) / (1000 * 3600 * 24)
  );
  if (daysDifference < 30) {
    score += weights.date;
  }

  return score;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const getArticleMetadata = (article: Article): ArticleMetadata => {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    image: article.image,
    category: article.category,
    readTime: article.readTime,
    date: article.date,
    tags: article.tags
  };
};