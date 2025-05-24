// src/features/product/components/ProductTestimonials.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { testimonialsService } from '@/lib/services/testimonials.service';
import { useBreakpoint } from '@/core/theme/hooks/useBreakpoint';

interface Testimonial {
  id: string;
  author_name: string;
  author_location: string;
  content: string;
  rating: number;
  created_at: string;
}

interface ProductTestimonialsProps {
  productId: string;
}

type SortOption = 'recent' | 'highest' | 'lowest';

const ITEMS_PER_PAGE = 6;
const MOBILE_ITEMS_PER_PAGE = 3;

export default function ProductTestimonials({ productId }: ProductTestimonialsProps) {
  const { isMobile } = useBreakpoint();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [stats, setStats] = useState({ total: 0, average: 0 });

  useEffect(() => {
    const loadTestimonials = async () => {
      setLoading(true);
      try {
        const [testimonialsData, totalCount, averageRating] = await Promise.all([
          testimonialsService.getProductTestimonials(productId),
          testimonialsService.getTestimonialsCountByProduct(productId),
          testimonialsService.getAverageRating(productId)
        ]);

        setTestimonials(testimonialsData);
        setStats({
          total: totalCount,
          average: averageRating
        });
      } catch (error) {
        console.error('Error loading testimonials:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTestimonials();
  }, [productId]);

  const filteredTestimonials = testimonials
    .filter(t => selectedRating ? t.rating === selectedRating : true)
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'highest':
          return b.rating - a.rating;
        case 'lowest':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });

  const itemsPerPage = isMobile ? MOBILE_ITEMS_PER_PAGE : ITEMS_PER_PAGE;
  const totalPages = Math.ceil(filteredTestimonials.length / itemsPerPage);
  const paginatedTestimonials = filteredTestimonials.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleRatingFilter = (rating: number) => {
    setSelectedRating(selectedRating === rating ? null : rating);
    setCurrentPage(1);
  };

  if (loading) {
    return null;
  }

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full">
      <div className="absolute inset-0" />
      
      <div className="relative pt-16 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-[#132D5D] mb-2">
                Avis de nos clients
              </h2>
              <p className="text-gray-600">
                {stats.total} témoignages • Note moyenne de {stats.average.toFixed(1)}/5
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                {[5, 4, 3, 2, 1].map(rating => (
                  <button
                    key={rating}
                    onClick={() => handleRatingFilter(rating)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedRating === rating
                        ? 'bg-[#132D5D] text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {rating} ★
                  </button>
                ))}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-2 bg-white rounded-lg border text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <option value="recent">Plus récents</option>
                <option value="highest">Meilleures notes</option>
                <option value="lowest">Notes les plus basses</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {paginatedTestimonials.map((testimonial) => (
                <motion.div
                  key={testimonial.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="bg-[#132D5D] w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xl font-bold">
                        {testimonial.author_name[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-[#132D5D]">
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
                  <div className="flex text-[#FF7E93]">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < testimonial.rating 
                            ? 'fill-[#FF7E93] text-[#FF7E93]' 
                            : 'fill-gray-200 text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white shadow-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-10 h-10 rounded-lg transition-colors ${
                    currentPage === i + 1
                      ? 'bg-[#132D5D] text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-white shadow-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}