// features/testimonials/components/Temoignages.tsx
"use client"

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  { value: "all", label: "Tous" },
  { value: "e692369c-e2f6-420f-a6b1-9ed592e14115", label: "Couples" },
  { value: "6da8c128-3828-45f9-961a-c61adba787f3", label: "Mariés" },
  { value: "9657fe13-1686-4453-88e4-af4449b3e2ef", label: "Famille" },
  { value: "3474c719-ff8b-4a1b-a20c-6f75b5c61f99", label: "Amis" }
];

export default function Temoignages() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 12;

  useEffect(() => {
    async function fetchTestimonials() {
      try {
        let query = supabase
          .from('testimonials')
          .select('*')
          .eq('status', 'active');

        if (selectedCategory !== 'all') {
          query = query.eq('product_id', selectedCategory);
        }

        const { data, error } = await query;

        if (error) throw error;
        setTestimonials(data || []);
      } catch (error) {
        console.error('Error fetching testimonials:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTestimonials();
  }, [selectedCategory]);

  const totalPages = Math.ceil(testimonials.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedTestimonials = testimonials.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

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
            Témoignages
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Découvrez les expériences authentiques de personnes qui ont renforcé
            leurs relations grâce à nos jeux.
          </p>
        </motion.div>
      </section>

      {/* Filters */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => {
                  setSelectedCategory(category.value);
                  setCurrentPage(1);
                }}
                className={`px-6 py-2 rounded-full transition-colors ${
                  selectedCategory === category.value
                    ? 'bg-brand-blue text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Grid */}
      <section className="py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            initial="initial"
            animate="animate"
            variants={{
              initial: { opacity: 0 },
              animate: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            {displayedTestimonials.map((testimonial) => (
              <motion.div
                key={testimonial.id}
                variants={{
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0 }
                }}
                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
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
                <p className="text-gray-600 mb-4">
                  {testimonial.content}
                </p>
                <div className="flex text-brand-pink">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <span key={i} className="text-lg">★</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center gap-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white shadow-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    currentPage === index + 1
                      ? 'bg-brand-blue text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-white shadow-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}