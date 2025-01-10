// features/blog/components/RecommendedArticles.tsx
"use client"

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Clock, ArrowRight } from 'lucide-react';
import type { Article } from '../../../types/blog';
import { calculateArticleScore, formatDate, getArticleMetadata } from '../../../utils/blog';

interface RecommendedArticlesProps {
  currentArticle: Article;
  allArticles: Article[];
  maxArticles?: number;
}

export function RecommendedArticles({ 
  currentArticle, 
  allArticles, 
  maxArticles = 3 
}: RecommendedArticlesProps) {
  const recommendedArticles = useMemo(() => {
    // Exclure l'article actuel
    const otherArticles = allArticles.filter(article => article.id !== currentArticle.id);

    // Calculer les scores et trier
    const articlesWithScores = otherArticles
      .map(article => ({
        article,
        score: calculateArticleScore(currentArticle, article)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxArticles)
      .map(({ article }) => getArticleMetadata(article));

    return articlesWithScores;
  }, [currentArticle, allArticles, maxArticles]);

  if (recommendedArticles.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-gray-200 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          Articles recommandés
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {recommendedArticles.map((article, index) => (
            <motion.article
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col"
            >
              <Link
                href={`/blog/${article.slug}`}
                className="group flex flex-col flex-1"
              >
                <div className="relative aspect-[16/9] rounded-lg overflow-hidden mb-4">
                  <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-3 text-sm mb-2">
                    <span className="bg-brand-pink/10 text-brand-pink px-2 py-1 rounded-full">
                      {article.category}
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-4 h-4" />
                      {article.readTime}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 group-hover:text-brand-blue transition-colors line-clamp-2 mb-2">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center gap-2 text-brand-pink text-sm font-medium mt-auto group-hover:gap-3 transition-all">
                    <span>Lire l'article</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
