// src/features/home/components/sections/TestimonialsSection.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface Testimonial {
  id: string;
  author_name: string;
  author_location: string;
  content: string;
  rating: number;
  status: string;
  product_id: string;
}

const AUTOPLAY_INTERVAL = 5000;
const TESTIMONIALS_TO_SHOW = 3;

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Charger les témoignages
  useEffect(() => {
    async function fetchTestimonials() {
      try {
        const { data, error } = await supabase
          .from('testimonials')
          .select('*')
          .eq('status', 'active');

        if (error) throw error;

        const shuffledTestimonials = shuffleTestimonials(data || []);
        setTestimonials(shuffledTestimonials);
      } catch (error) {
        console.error('Error fetching testimonials:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTestimonials();
  }, []);

  // Gérer l'autoplay
  useEffect(() => {
    if (!isPaused && testimonials.length > TESTIMONIALS_TO_SHOW) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => 
          (prev + TESTIMONIALS_TO_SHOW >= testimonials.length) ? 0 : prev + TESTIMONIALS_TO_SHOW
        );
      }, AUTOPLAY_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused, testimonials.length]);

  const shuffleTestimonials = (allTestimonials: Testimonial[]) => {
    // Grouper par produit
    const groupedByProduct = allTestimonials.reduce((acc, testimonial) => {
      if (!acc[testimonial.product_id]) {
        acc[testimonial.product_id] = [];
      }
      acc[testimonial.product_id].push(testimonial);
      return acc;
    }, {} as Record<string, Testimonial[]>);

    // Sélectionner un nombre égal de témoignages de chaque produit
    const shuffled: Testimonial[] = [];
    const productsCount = Object.keys(groupedByProduct).length;
    const perProduct = Math.ceil(9 / productsCount); // Au moins 9 témoignages au total

    Object.values(groupedByProduct).forEach(productTestimonials => {
      const selected = productTestimonials
        .sort(() => Math.random() - 0.5)
        .slice(0, perProduct);
      shuffled.push(...selected);
    });

    return shuffled.sort(() => Math.random() - 0.5);
  };

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => 
      (prev + TESTIMONIALS_TO_SHOW >= testimonials.length) ? 0 : prev + TESTIMONIALS_TO_SHOW
    );
  }, [testimonials.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => 
      (prev - TESTIMONIALS_TO_SHOW < 0) ? 
        Math.max(testimonials.length - TESTIMONIALS_TO_SHOW, 0) : 
        prev - TESTIMONIALS_TO_SHOW
    );
  }, [testimonials.length]);

  const visibleTestimonials = testimonials.slice(
    currentIndex,
    currentIndex + TESTIMONIALS_TO_SHOW
  );

  if (loading) {
    return (
      <section className="w-full bg-brand-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      className="w-full bg-brand-white py-16"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-brand-blue mb-4">
          Ce que disent nos clients
        </h2>
        <p className="text-center text-gray-600 mb-12 max-w-3xl mx-auto">
          Découvrez les expériences authentiques de personnes qui ont renforcé
          leurs relations grâce à nos jeux.
        </p>

        <div className="max-w-5xl mx-auto relative">
          {testimonials.length > TESTIMONIALS_TO_SHOW && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 lg:-translate-x-16 z-10 p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
                aria-label="Témoignages précédents"
              >
                <ChevronLeft className="w-6 h-6 text-brand-blue" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 lg:translate-x-16 z-10 p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
                aria-label="Témoignages suivants"
              >
                <ChevronRight className="w-6 h-6 text-brand-blue" />
              </button>
            </>
          )}

          <div className="flex flex-col md:flex-row gap-8">
            <AnimatePresence mode="wait">
              {visibleTestimonials.map((testimonial) => (
                <motion.div
                  key={testimonial.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="flex-1 bg-white rounded-lg p-8 shadow-md hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="bg-brand-blue w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xl font-bold">
                        {testimonial.author_name[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-brand-blue">
                        {testimonial.author_name}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {testimonial.author_location}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4 line-clamp-4">
                    {testimonial.content}
                  </p>
                  <div className="flex text-brand-pink">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <span key={i} className="text-lg">★</span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/temoignages"
            className="inline-flex items-center px-6 py-3 bg-brand-blue text-white rounded-lg hover:bg-brand-pink transition-colors"
          >
            Voir plus de témoignages
          </Link>
        </div>
      </div>
    </section>
  );
}

export default TestimonialsSection;