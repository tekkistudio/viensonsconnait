// src/features/blog/components/Blog.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useArticles } from '@/features/blog/hooks/useArticles';
import type { Article } from '@/types/blog';
import FeaturedArticle from '@/components/blog/FeaturedArticle';
import ArticleCard from '@/components/blog/ArticleCard';

const categories = [
  { id: 'all', name: 'Tous les articles' },
  { id: 'couples', name: 'Relations de couple' },
  { id: 'family', name: 'Vie de famille' },
  { id: 'friendship', name: 'Amitiés' },
  { id: 'communication', name: 'Communication' },
  { id: 'marriage', name: 'Mariage' }
] as const;

type CategoryId = typeof categories[number]['id'];

const SearchBar = () => {
  return (
    <div className="relative max-w-xl mx-auto">
      <input
        type="text"
        placeholder="Rechercher un article..."
        className="w-full text-gray-600 px-4 py-3 pl-12 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent"
      />
      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
    </div>
  );
};

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const { allArticles, isLoading, error } = useArticles();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-pink"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  const featuredArticles = allArticles.filter((article): article is Article => {
    return Boolean(article.featured) && 
           typeof article.image === 'string' &&
           typeof article.category === 'string';
  });
  
  const filteredArticles = allArticles.filter((article): article is Article => {
    return !article.featured &&
           typeof article.image === 'string' &&
           typeof article.category === 'string' &&
           (selectedCategory === 'all' || article.category === selectedCategory);
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <section className="bg-brand-blue text-white py-16 md:py-24">
        <motion.div 
          className="max-w-6xl mx-auto px-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Notre Blog
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-12">
            Des conseils pratiques et des réflexions pour enrichir vos relations 
            et créer des liens plus profonds avec vos proches.
          </p>
          <SearchBar />
        </motion.div>
      </section>

      {/* Categories */}
      <section className="py-8 bg-white border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-2 rounded-full transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-brand-blue text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {featuredArticles.length > 0 && (
        <section className="py-12">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-brand-blue mb-8">
              Articles à la une
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {featuredArticles.map((article) => (
                <FeaturedArticle key={article.id} article={article} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Regular Articles */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-brand-blue mb-8">
            Tous les articles
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
          {filteredArticles.length === 0 && (
            <p className="text-center text-gray-600">
              Aucun article trouvé dans cette catégorie.
            </p>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-brand-blue mb-4">
            Restez inspiré
          </h2>
          <p className="text-gray-600 mb-8">
            Recevez nos meilleurs articles et conseils directement dans votre boîte mail.
          </p>
          <div className="flex gap-4 max-w-xl mx-auto">
            <input
              type="email"
              placeholder="Votre adresse email"
              className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent"
            />
            <button className="px-6 py-3 bg-brand-blue text-white rounded-lg font-medium hover:bg-brand-pink transition-colors">
              S'inscrire
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}