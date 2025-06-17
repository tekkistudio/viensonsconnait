// src/features/blog/components/mobile/MobileRecommendedArticles.tsx - VERSION OPTIMISÉE THÈMES
"use client"

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Clock, ArrowRight, Star, ChevronRight } from 'lucide-react';
import type { Article } from '../../../../types/blog';
import { calculateArticleScore, formatDate, getArticleMetadata } from '../../../../utils/blog';

interface MobileRecommendedArticlesProps {
  currentArticle: Article;
  allArticles: Article[];
  maxArticles?: number;
}

export function MobileRecommendedArticles({ 
  currentArticle, 
  allArticles, 
  maxArticles = 3 
}: MobileRecommendedArticlesProps) {
  const recommendedArticles = useMemo(() => {
    // Exclure l'article actuel
    const otherArticles = allArticles.filter(article => article.id !== currentArticle.id);

    // Calculer les scores et trier
    const articlesWithScores = otherArticles
      .map(article => ({
        article,
        score: calculateArticleScore ? calculateArticleScore(currentArticle, article) : Math.random()
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxArticles)
      .map(({ article }) => getArticleMetadata ? getArticleMetadata(article) : article);

    return articlesWithScores;
  }, [currentArticle, allArticles, maxArticles]);

  if (recommendedArticles.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <h2 className="text-theme-primary text-xl font-bold mb-2 flex items-center gap-2">
            <Star className="w-5 h-5 text-brand-pink" />
            Articles recommandés
          </h2>
          <p className="text-theme-secondary text-sm">
            D'autres articles qui pourraient vous intéresser
          </p>
        </motion.div>

        <div className="space-y-4">
          {recommendedArticles.map((article, index) => (
            <motion.article
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={`/blog/${article.slug}`}
                className="group block"
              >
                <div className="flex gap-4 bg-theme-card hover:bg-theme-secondary/5 rounded-xl p-4 border border-theme transition-colors shadow-sm hover:shadow-lg">
                  {/* Image */}
                  <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                    <Image
                      src={article.image}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="80px"
                    />
                  </div>
                  
                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-brand-blue/20 text-brand-blue px-2 py-1 rounded text-xs font-medium">
                        {article.category}
                      </span>
                      <span className="text-theme-secondary text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {article.readTime}
                      </span>
                    </div>
                    
                    <h3 className="text-theme-primary font-semibold text-sm mb-2 line-clamp-2 group-hover:text-brand-pink transition-colors">
                      {article.title}
                    </h3>
                    
                    {article.excerpt && (
                      <p className="text-theme-secondary text-xs line-clamp-2 mb-2">
                        {article.excerpt}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-theme-secondary text-xs">
                        {article.date}
                      </span>
                      <div className="flex items-center gap-1 text-brand-pink text-xs group-hover:gap-2 transition-all">
                        <span>Lire</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>

        {/* Voir plus d'articles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 bg-theme-card backdrop-blur-sm text-theme-primary px-6 py-3 rounded-full hover:bg-theme-secondary/10 transition-colors border border-theme shadow-sm hover:shadow-lg"
          >
            <span>Voir tous les articles</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}