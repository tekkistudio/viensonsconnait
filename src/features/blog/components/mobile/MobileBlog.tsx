// src/features/blog/components/mobile/MobileBlog.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Clock, Star, Heart, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useArticles } from '@/features/blog/hooks/useArticles';
import type { Article } from '@/types/blog';

const categories = [
  { id: 'all', name: 'Tous', emoji: '📚' },
  { id: 'couples', name: 'Couples', emoji: '💕' },
  { id: 'family', name: 'Famille', emoji: '👨‍👩‍👧‍👦' },
  { id: 'friendship', name: 'Amitié', emoji: '👫' },
  { id: 'communication', name: 'Communication', emoji: '💬' },
  { id: 'marriage', name: 'Mariage', emoji: '💍' }
] as const;

type CategoryId = typeof categories[number]['id'];

export default function MobileBlog() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { allArticles, isLoading, error } = useArticles();

  const filteredArticles = allArticles.filter((article): article is Article => {
    if (typeof article.image !== 'string' || typeof article.category !== 'string') {
      return false;
    }

    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const featuredArticles = filteredArticles.filter(article => article.featured);
  const regularArticles = filteredArticles.filter(article => !article.featured);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-pink mx-auto mb-4" />
          <p className="text-white/70">Chargement des articles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-white text-xl font-bold mb-2">Erreur</h2>
          <p className="text-white/70 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-brand-pink text-white px-6 py-3 rounded-full font-semibold"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Hero Section */}
      <section className="relative h-96 bg-gradient-to-r from-brand-pink/30 to-brand-blue/30 overflow-hidden pt-16">
        <div className="absolute inset-0 bg-black/50" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative h-full flex flex-col justify-center px-6 text-center"
        >
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full mb-6 mx-auto">
            <Star className="w-4 h-4" />
            <span className="text-sm font-medium">Blog</span>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
            Conseils & Inspiration
          </h1>
          <p className="text-white/80 text-lg mb-8 max-w-md mx-auto leading-relaxed">
            Des conseils pratiques pour enrichir vos relations et créer des liens plus profonds.
          </p>

          {/* Search Bar Mobile */}
          <div className="relative max-w-sm mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-3 bg-white/20 backdrop-blur-sm text-white placeholder-white/60 rounded-full border border-white/30 focus:border-white/60 focus:outline-none"
            />
          </div>
        </motion.div>
      </section>

      {/* Filters Section */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Catégories</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                showFilters ? 'bg-brand-pink text-white' : 'bg-white/10 text-white/70'
              }`}
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Masquer' : 'Filtres'}
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all ${
                        selectedCategory === category.id
                          ? "bg-brand-pink text-white"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      <span>{category.emoji}</span>
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Featured Articles */}
      {featuredArticles.length > 0 && (
        <section className="py-8">
          <div className="px-6">
            <h2 className="text-white text-xl font-bold mb-6 flex items-center gap-2">
              <Star className="w-5 h-5 text-brand-pink" />
              À la une
            </h2>
            <div className="space-y-4">
              {featuredArticles.slice(0, 2).map((article, index) => (
                <motion.article
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={`/blog/${article.slug}`} className="group block">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:bg-white/15 transition-colors">
                      <div className="relative aspect-[16/9]">
                        <Image
                          src={article.image}
                          alt={article.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, 400px"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-brand-pink px-2 py-1 rounded-full text-white text-xs font-medium">
                              À la une
                            </span>
                            <span className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {article.readTime}
                            </span>
                          </div>
                          <h3 className="text-white font-bold text-lg line-clamp-2 group-hover:text-brand-pink transition-colors">
                            {article.title}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Regular Articles */}
      <section className="py-8">
        <div className="px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-xl font-bold">
              Tous les articles
            </h2>
            <span className="text-white/60 text-sm">
              {regularArticles.length} article{regularArticles.length > 1 ? 's' : ''}
            </span>
          </div>

          {regularArticles.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="text-6xl mb-4">📖</div>
              <h3 className="text-white text-xl font-bold mb-2">
                Aucun article
              </h3>
              <p className="text-white/60 mb-6">
                Aucun article trouvé pour cette recherche
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="bg-brand-pink text-white px-6 py-3 rounded-full font-semibold"
              >
                Voir tous les articles
              </button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {regularArticles.map((article, index) => (
                <motion.article
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={`/blog/${article.slug}`} className="group block">
                    <div className="flex gap-4 bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 transition-colors">
                      <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                        <Image
                          src={article.image}
                          alt={article.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="96px"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-brand-blue/20 text-brand-blue px-2 py-1 rounded text-xs">
                            {categories.find(cat => cat.id === article.category)?.name || article.category}
                          </span>
                          <span className="text-white/60 text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {article.readTime}
                          </span>
                        </div>
                        
                        <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2 group-hover:text-brand-pink transition-colors">
                          {article.title}
                        </h3>
                        
                        {article.excerpt && (
                          <p className="text-white/70 text-xs line-clamp-2 mb-2">
                            {article.excerpt}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-white/50 text-xs">
                            {article.date}
                          </span>
                          <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-brand-pink transition-colors" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-12 bg-gradient-to-r from-brand-pink/10 to-brand-blue/10">
        <div className="px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-center"
          >
            <div className="text-3xl mb-4">📬</div>
            <h3 className="text-white text-xl font-bold mb-3">
              Restez inspiré
            </h3>
            <p className="text-white/80 mb-6 leading-relaxed">
              Recevez nos meilleurs articles et conseils directement dans votre boîte mail.
            </p>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Votre adresse email"
                className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm text-white placeholder-white/60 rounded-full border border-white/30 focus:border-white/60 focus:outline-none"
              />
              <button className="w-full bg-brand-pink text-white py-3 px-6 rounded-full font-semibold hover:bg-brand-pink/90 transition-colors">
                S'inscrire à la newsletter
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}