// src/features/testimonials/components/mobile/MobileTemoignages.tsx
"use client"

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  Filter, 
  Search, 
  Heart, 
  MessageSquare, 
  Users,
  Quote,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Testimonial {
  id: string;
  product_id: string;
  author_name: string;
  author_location: string;
  content: string;
  rating: number;
  status: string;
}

const categories = [
  { value: "all", label: "Tous", emoji: "🌟", color: "from-purple-500 to-pink-500" },
  { value: "e692369c-e2f6-420f-a6b1-9ed592e14115", label: "Couples", emoji: "💕", color: "from-pink-500 to-red-500" },
  { value: "6da8c128-3828-45f9-961a-c61adba787f3", label: "Mariés", emoji: "💒", color: "from-red-500 to-orange-500" },
  { value: "9657fe13-1686-4453-88e4-af4449b3e2ef", label: "Famille", emoji: "👨‍👩‍👧‍👦", color: "from-blue-500 to-indigo-500" },
  { value: "3474c719-ff8b-4a1b-a20c-6f75b5c61f99", label: "Amis", emoji: "👫", color: "from-green-500 to-emerald-500" }
];

const filterOptions = [
  { value: "recent", label: "Plus récents", icon: "⏰" },
  { value: "rating", label: "Mieux notés", icon: "⭐" },
  { value: "popular", label: "Populaires", icon: "🔥" }
];

export default function MobileTemoignages() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [filteredTestimonials, setFilteredTestimonials] = useState<Testimonial[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [displayCount, setDisplayCount] = useState(6);
  const categoriesRef = useRef<HTMLDivElement>(null);

  // Charger les témoignages
  useEffect(() => {
    async function fetchTestimonials() {
      try {
        const { data, error } = await supabase
          .from('testimonials')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTestimonials(data || []);
      } catch (error) {
        console.error('Error fetching testimonials:', error);
        // Fallback data
        setTestimonials([
          {
            id: '1',
            product_id: 'couples',
            author_name: 'Aminata D.',
            author_location: 'Dakar, Sénégal',
            content: 'Ce jeu a transformé nos soirées en couple. Nous nous découvrons encore après 5 ans de mariage ! Les questions sont profondes et nous permettent d\'aborder des sujets qu\'on n\'aurait jamais pensé à discuter.',
            rating: 5,
            status: 'active'
          },
          {
            id: '2',
            product_id: 'famille',
            author_name: 'Ibrahim K.',
            author_location: 'Abidjan, Côte d\'Ivoire',
            content: 'Mes enfants adorent jouer avec nous. C\'est devenu notre tradition du dimanche soir. Même les plus timides participent maintenant !',
            rating: 5,
            status: 'active'
          },
          {
            id: '3',
            product_id: 'amis',
            author_name: 'Fatou M.',
            author_location: 'Casablanca, Maroc',
            content: 'Un cadeau parfait pour mes amies. Nous avons ri et pleuré en même temps ! Ces moments de partage sont précieux.',
            rating: 5,
            status: 'active'
          }
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchTestimonials();
  }, []);

  // Filtrer et trier les témoignages
  useEffect(() => {
    let filtered = testimonials;

    // Filtre par catégorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.product_id === selectedCategory);
    }

    // Filtre par recherche
    if (searchQuery.trim()) {
      filtered = filtered.filter(t => 
        t.author_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.author_location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Trier
    switch (sortBy) {
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'popular':
        // Simuler la popularité par la longueur du contenu
        filtered.sort((a, b) => b.content.length - a.content.length);
        break;
      default:
        // Recent (déjà trié par created_at)
        break;
    }

    setFilteredTestimonials(filtered);
  }, [testimonials, selectedCategory, searchQuery, sortBy]);

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 6);
  };

  const displayedTestimonials = filteredTestimonials.slice(0, displayCount);
  const hasMore = displayCount < filteredTestimonials.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="relative h-64 bg-gradient-to-r from-brand-pink/20 to-brand-blue/20">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] bg-gradient-to-r from-brand-pink/30 to-brand-blue/30 overflow-hidden pt-24 pb-8">
        <div className="absolute inset-0 bg-black/50" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative h-full flex flex-col justify-center px-6 text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full mb-8 relative z-10">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">Témoignages</span>
            </div>
          </motion.div>
          
          <h1 className="text-3xl font-bold text-white mb-6 leading-tight">
            Ce que disent nos 
            <span className="text-brand-pink"> clients</span>
          </h1>
          
          <p className="text-white/80 text-lg mb-8 max-w-md mx-auto leading-relaxed">
            Découvrez les expériences authentiques de personnes qui ont renforcé leurs relations
          </p>

          <div className="flex items-center justify-center gap-4 text-white/60 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>4.9/5 moyenne</span>
            </div>
            <div className="w-1 h-1 bg-white/40 rounded-full" />
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-brand-pink" />
              <span>98% satisfaction</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Search & Filters */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un témoignage..."
              className="w-full pl-10 pr-4 py-3 bg-white/10 text-white placeholder-white/50 rounded-xl border border-white/20 focus:border-brand-pink focus:outline-none"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  showFilters 
                    ? 'bg-brand-pink text-white' 
                    : 'bg-white/10 text-white/70'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm">Filtres</span>
              </button>
            </div>

            <div className="text-white/60 text-sm">
              {filteredTestimonials.length} témoignage{filteredTestimonials.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/10 overflow-hidden"
            >
              {/* Categories */}
              <div className="p-4">
                <h3 className="text-white font-semibold mb-3">Catégories</h3>
                <div 
                  ref={categoriesRef}
                  className="flex gap-2 overflow-x-auto scrollbar-hide pb-2"
                >
                  {categories.map((category) => (
                    <button
                      key={category.value}
                      onClick={() => setSelectedCategory(category.value)}
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                        selectedCategory === category.value
                          ? "bg-brand-pink text-white"
                          : "bg-white/10 text-white/70"
                      }`}
                    >
                      <span>{category.emoji}</span>
                      <span className="text-sm">{category.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Options */}
              <div className="p-4 border-t border-white/10">
                <h3 className="text-white font-semibold mb-3">Trier par</h3>
                <div className="grid grid-cols-3 gap-2">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                        sortBy === option.value
                          ? "bg-brand-pink text-white"
                          : "bg-white/10 text-white/70"
                      }`}
                    >
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Testimonials */}
      <div className="p-4">
        {filteredTestimonials.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-white text-xl font-bold mb-2">
              Aucun témoignage trouvé
            </h3>
            <p className="text-white/60 mb-6">
              Essayez de modifier vos critères de recherche
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSortBy("recent");
              }}
              className="bg-brand-pink text-white px-6 py-3 rounded-full font-semibold"
            >
              Réinitialiser les filtres
            </button>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {displayedTestimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
                >
                  {/* Quote icon */}
                  <div className="flex justify-center mb-4">
                    <div className="bg-brand-pink rounded-full p-3">
                      <Quote className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <blockquote className="text-white text-base leading-relaxed text-center mb-6">
                    "{testimonial.content}"
                  </blockquote>

                  {/* Rating */}
                  <div className="flex justify-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < testimonial.rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Author */}
                  <div className="text-center">
                    <div className="bg-brand-blue w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-white text-lg font-bold">
                        {testimonial.author_name[0]}
                      </span>
                    </div>
                    <h4 className="text-white font-semibold">
                      {testimonial.author_name}
                    </h4>
                    <p className="text-white/60 text-sm">
                      {testimonial.author_location}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Load More Button */}
            {hasMore && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center mt-8"
              >
                <button
                  onClick={handleLoadMore}
                  className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-full font-semibold border border-white/20 hover:bg-white/20 transition-colors flex items-center gap-2 mx-auto"
                >
                  <span>Voir plus de témoignages</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="p-6 mt-8"
      >
        <div className="bg-gradient-to-r from-brand-pink/20 to-brand-blue/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <div className="text-center mb-6">
            <h3 className="text-white text-xl font-bold mb-2">
              Rejoignez notre communauté
            </h3>
            <p className="text-white/70">
              Des milliers de personnes nous font déjà confiance
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-pink">7000+</div>
              <div className="text-white/60 text-sm">Jeux vendus</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-blue">98%</div>
              <div className="text-white/60 text-sm">Satisfaction</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-pink">4.9/5</div>
              <div className="text-white/60 text-sm">Note moyenne</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-white/60 text-sm">
            <Sparkles className="w-4 h-4 text-brand-pink" />
            <span>Rejoignez l'aventure dès aujourd'hui</span>
          </div>
        </div>
      </motion.div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="p-6 mt-4"
      >
        <div className="text-center bg-gradient-to-r from-brand-pink/20 to-brand-blue/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <div className="text-4xl mb-4">💝</div>
          <h3 className="text-white text-xl font-bold mb-3">
            Prêt à créer vos propres souvenirs ?
          </h3>
          <p className="text-white/80 mb-6">
            Découvrez nos jeux et commencez votre propre histoire
          </p>
          
          <a
            href="/nos-jeux"
            className="w-full bg-brand-pink text-white py-4 px-6 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-brand-pink/90 transition-colors"
          >
            <Heart className="w-5 h-5" />
            <span>Découvrir nos jeux</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
}