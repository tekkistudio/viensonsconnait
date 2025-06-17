// src/features/home/components/mobile/MobileTestimonialsSection.tsx - VERSION OPTIMISÉE THÈMES
"use client"

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Testimonial {
  id: string;
  author_name: string;
  author_location: string;
  content: string;
  rating: number;
  product_name?: string;
}

interface ProductRow {
  name: string;
}

interface TestimonialRow {
  id: string;
  author_name: string;
  author_location: string;
  content: string;
  rating: number;
  products?: {
    name: string;
  };
}

const AUTOPLAY_INTERVAL = 4000;

export default function MobileTestimonialsSection() {
  const router = useRouter();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleViewMoreTestimonials = () => {
    router.push('/temoignages');
  };

  useEffect(() => {
    async function fetchTestimonials() {
      try {
        const { data, error } = await supabase
          .from('testimonials')
          .select(`
            id,
            author_name,
            author_location,
            content,
            rating,
            products!inner(name)
          `)
          .eq('status', 'active')
          .limit(10);

        if (error) throw error;

        const formattedTestimonials: Testimonial[] = (data || []).map((item: any) => ({
          id: item.id,
          author_name: item.author_name,
          author_location: item.author_location,
          content: item.content,
          rating: item.rating,
          product_name: item.products?.name
        }));

        setTestimonials(formattedTestimonials);
      } catch (error) {
        console.error('Error fetching testimonials:', error);
        // Données de fallback
        setTestimonials([
          {
            id: '1',
            author_name: 'Aminata D.',
            author_location: 'Dakar, Sénégal',
            content: 'Ce jeu a transformé nos soirées en couple. Nous nous découvrons encore après 5 ans de mariage !',
            rating: 5,
            product_name: 'Couples'
          },
          {
            id: '2',
            author_name: 'Ibrahim K.',
            author_location: 'Abidjan, Côte d\'Ivoire',
            content: 'Mes enfants adorent jouer avec nous. C\'est devenu notre tradition du dimanche soir.',
            rating: 5,
            product_name: 'Famille'
          },
          {
            id: '3',
            author_name: 'Fatou M.',
            author_location: 'Casablanca, Maroc',
            content: 'Un cadeau parfait pour mes amies. Nous avons ri et pleuré en même temps !',
            rating: 5,
            product_name: 'Amis'
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTestimonials();
  }, []);

  // Auto-play
  useEffect(() => {
    if (!isPaused && testimonials.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % testimonials.length);
      }, AUTOPLAY_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, testimonials.length]);

  const handlePrevious = () => {
    setCurrentIndex(prev => (prev - 1 + testimonials.length) % testimonials.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 3000);
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % testimonials.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 3000);
  };

  if (isLoading) {
    return (
      <section className="bg-gradient-to-r from-theme-secondary/5 to-theme-primary py-16 transition-colors duration-300">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-brand-pink border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </div>
      </section>
    );
  }

  if (testimonials.length === 0) {
    return null;
  }

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section 
      className="bg-gradient-to-r from-theme-secondary/5 to-theme-primary py-16 transition-colors duration-300"
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 2000)}
    >
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-4 py-2 rounded-full mb-6">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-medium">Témoignages Clients</span>
          </div>
          
          <h2 className="text-3xl font-bold text-theme-primary mb-4">
            Ce Que Disent Nos Clients
          </h2>
          <p className="text-theme-secondary text-lg leading-relaxed max-w-2xl mx-auto">
            Découvrez comment nos jeux transforment les relations de milliers de personnes 
            à travers l'Afrique et au-delà.
          </p>
        </motion.div>

        {/* Carrousel de témoignages */}
        <div className="relative max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="bg-theme-secondary/5 backdrop-blur-sm rounded-3xl p-8 border border-theme shadow-lg"
            >
              {/* Quote icon */}
              <div className="flex justify-center mb-6">
                <div className="bg-brand-pink rounded-full p-3 shadow-lg">
                  <Quote className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Content */}
              <blockquote className="text-theme-primary text-lg leading-relaxed text-center mb-6">
                "{currentTestimonial.content}"
              </blockquote>

              {/* Rating */}
              <div className="flex justify-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < currentTestimonial.rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-400 dark:text-gray-600'
                    }`}
                  />
                ))}
              </div>

              {/* Author */}
              <div className="text-center">
                <div className="bg-brand-blue w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <span className="text-white text-xl font-bold">
                    {currentTestimonial.author_name[0]}
                  </span>
                </div>
                <h4 className="text-theme-primary font-semibold text-lg">
                  {currentTestimonial.author_name}
                </h4>
                <p className="text-theme-secondary text-sm mb-2">
                  {currentTestimonial.author_location}
                </p>
                {currentTestimonial.product_name && (
                  <p className="text-brand-pink text-sm font-medium">
                    A Propos du Jeu {currentTestimonial.product_name}
                  </p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          {testimonials.length > 1 && (
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={handlePrevious}
                className="bg-theme-card hover:bg-theme-secondary/20 backdrop-blur-sm rounded-full p-3 transition-colors border border-theme shadow-sm hover:shadow-lg"
                aria-label="Témoignage précédent"
              >
                <ChevronLeft className="w-6 h-6 text-theme-primary" />
              </button>

              {/* Indicateurs */}
              <div className="flex gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentIndex 
                        ? 'bg-brand-pink w-8' 
                        : 'bg-theme-secondary/40 hover:bg-theme-secondary/60'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="bg-theme-card hover:bg-theme-secondary/20 backdrop-blur-sm rounded-full p-3 transition-colors border border-theme shadow-sm hover:shadow-lg"
                aria-label="Témoignage suivant"
              >
                <ChevronRight className="w-6 h-6 text-theme-primary" />
              </button>
            </div>
          )}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-center mt-12"
        >
          <p className="text-theme-secondary text-sm mb-6">
            Rejoignez les milliers de personnes qui nous font confiance
          </p>
          <button 
            onClick={handleViewMoreTestimonials}
            className="bg-gradient-to-r from-brand-pink to-red-500 text-white px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 active:scale-95"
          >
            Voir Plus de Témoignages
          </button>
        </motion.div>
      </div>
    </section>
  );
}