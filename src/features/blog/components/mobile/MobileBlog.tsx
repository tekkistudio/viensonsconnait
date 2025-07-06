// src/features/blog/components/mobile/MobileBlog.tsx - VERSION OPTIMISÉE THÈMES
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
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-pink mx-auto mb-4" />
          <p className="text-theme-secondary">Chargement des articles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-theme-primary text-xl font-bold mb-2">Erreur</h2>
          <p className="text-theme-secondary mb-6">{error}</p>
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
    <div className="min-h-screen bg-theme-primary">
      {/* Hero Section */}
      <section className="relative min-h-[65vh] overflow-hidden pt-24 pb-10">
        {/* Dégradé adaptatif selon le thème */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-pink/30 to-brand-blue/30 dark:from-brand-pink/40 dark:to-black/60" />
        <div className="absolute inset-0 bg-theme-primary/20 dark:bg-black/30" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative h-full flex flex-col justify-center px-6 text-center z-10"
        >
          <div className="inline-flex items-center gap-2 bg-theme-card backdrop-blur-sm text-theme-primary px-4 py-2 rounded-full mb-6 mx-auto border border-theme">
            <Star className="w-4 h-4" />
            <span className="text-sm font-medium">Blog</span>
          </div>
          
          <h1 className="text-3xl font-bold text-theme-primary mb-4 leading-tight">
            Conseils & Inspiration
          </h1>
          <p className="text-theme-primary text-lg mb-8 max-w-md mx-auto leading-relaxed">
            Des conseils pratiques pour enrichir vos relations et créer des liens plus profonds.
          </p>

          {/* Search Bar Mobile */}
          <div className="relative max-w-sm mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-3 bg-theme-card backdrop-blur-sm text-theme-primary placeholder-theme-secondary rounded-full border border-theme focus:border-brand-pink focus:outline-none transition-colors"
            />
          </div>
        </motion.div>
      </section>

      {/* Filters Section */}
      <div className="sticky top-0 z-20 bg-theme-primary/90 backdrop-blur-sm border-b border-theme">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-theme-primary font-semibold">Catégories</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                showFilters ? 'bg-brand-pink text-white' : 'bg-theme-card text-theme-secondary'
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
                          : "bg-theme-card text-theme-secondary hover:bg-theme-secondary/10"
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
            <h2 className="text-theme-primary text-xl font-bold mb-6 flex items-center gap-2">
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
                    <div className="bg-theme-card backdrop-blur-sm rounded-xl overflow-hidden border border-theme hover:bg-theme-secondary/5 transition-colors shadow-sm hover:shadow-lg">
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
            <h2 className="text-theme-primary text-xl font-bold">
              Tous les articles
            </h2>
            <span className="text-theme-secondary text-sm">
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
              <h3 className="text-theme-primary text-xl font-bold mb-2">
                Aucun article
              </h3>
              <p className="text-theme-secondary mb-6">
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
                    <div className="flex gap-4 bg-theme-card hover:bg-theme-secondary/5 rounded-xl p-4 border border-theme transition-colors shadow-sm hover:shadow-lg">
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
                          <ChevronRight className="w-4 h-4 text-theme-secondary group-hover:text-brand-pink transition-colors" />
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

      {/* WhatsApp Section */}
      <section className="py-12 bg-gradient-to-r from-brand-pink/5 to-brand-blue/5">
        <div className="px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-theme-card backdrop-blur-sm rounded-2xl p-6 border border-theme text-center shadow-sm"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#25D366] rounded-full mb-6">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.386"/>
              </svg>
            </div>
            
            <h3 className="text-theme-primary text-xl font-bold mb-3">
              Rejoignez notre communauté WhatsApp
            </h3>
            <p className="text-theme-secondary mb-6 leading-relaxed">
              Recevez nos meilleurs articles, conseils relationnels et offres exclusives 
              directement sur WhatsApp. Plus de 2500 membres nous font déjà confiance !
            </p>
            
            <div className="space-y-4">
              {/* Avantages */}
              <div className="grid grid-cols-1 gap-3 text-left">
                <div className="flex items-center gap-3 bg-theme-secondary/5 rounded-lg p-3">
                  <div className="bg-[#25D366] rounded-full p-1.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-theme-primary text-sm font-medium">
                    Articles exclusifs en avant-première
                  </span>
                </div>
                
                <div className="flex items-center gap-3 bg-theme-secondary/5 rounded-lg p-3">
                  <div className="bg-[#25D366] rounded-full p-1.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-theme-primary text-sm font-medium">
                    Conseils relationnels personnalisés
                  </span>
                </div>
                
                <div className="flex items-center gap-3 bg-theme-secondary/5 rounded-lg p-3">
                  <div className="bg-[#25D366] rounded-full p-1.5 flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-theme-primary text-sm font-medium">
                    Offres spéciales sur nos jeux
                  </span>
                </div>
              </div>
              
              {/* Bouton d'inscription WhatsApp */}
              <button 
                onClick={() => {
                  const message = encodeURIComponent(
                    "Bonjour ! 👋\n\nJe souhaite rejoindre la communauté VIENS ON S'CONNAÎT pour recevoir :\n" +
                    "📚 Les articles exclusifs\n" +
                    "💝 Les conseils relationnels\n" +
                    "🎁 Les offres spéciales\n" +
                    "✨ Les nouveautés en avant-première"
                  );
                  window.open(`https://wa.me/221781362728?text=${message}`, '_blank');
                }}
                className="w-full bg-[#25D366] text-white py-4 px-6 rounded-full font-bold hover:bg-[#128C7E] transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.386"/>
                </svg>
                <span>Rejoindre la communauté</span>
              </button>
              
              {/* Stats sociales */}
              <div className="flex items-center justify-center gap-4 text-theme-secondary text-xs pt-3">
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <span>+2500 membres</span>
                </div>
                <div className="w-1 h-1 bg-theme-secondary/30 rounded-full" />
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>100% gratuit</span>
                </div>
                <div className="w-1 h-1 bg-theme-secondary/30 rounded-full" />
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>Désabonnement facile</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}