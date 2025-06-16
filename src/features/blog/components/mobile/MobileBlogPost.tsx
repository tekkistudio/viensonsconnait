// src/features/blog/components/mobile/MobileBlogPost.tsx
"use client"

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Share2, Clock, ArrowLeft, Facebook, Twitter, Heart, BookOpen, Calendar } from 'lucide-react';
import type { Article } from '../../../../types/blog';
import { MobileRecommendedArticles } from './MobileRecommendedArticles';
import { useArticles } from '../../hooks/useArticles';

function MobileShareButton({ network, url, title }: { network: string; url: string; title: string }) {
  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
  };

  return (
    <button
      onClick={() => window.open(shareUrls[network as keyof typeof shareUrls], '_blank')}
      className="p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
      aria-label={`Partager sur ${network}`}
    >
      {network === 'facebook' ? (
        <Facebook className="w-5 h-5 text-white" />
      ) : (
        <Twitter className="w-5 h-5 text-white" />
      )}
    </button>
  );
}

export default function MobileBlogPost({ slug }: { slug: string }) {
  console.log("MobileBlogPost rendu avec slug:", slug);
  const { article, allArticles, isLoading, error } = useArticles(slug);

  console.log("État MobileBlogPost:", {
    slugReçu: slug,
    articleTrouvé: !!article,
    nomArticle: article?.title,
    nombreArticles: allArticles.length,
    isLoading,
    error
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-pink mx-auto mb-4" />
          <p className="text-white/70">Chargement de l'article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">📖</div>
          <h2 className="text-white text-xl font-bold mb-2">Article non trouvé</h2>
          <p className="text-white/70 mb-6">Cet article n'existe pas ou a été supprimé.</p>
          <Link 
            href="/blog"
            className="bg-brand-pink text-white px-6 py-3 rounded-full font-semibold hover:bg-brand-pink/90 transition-colors"
          >
            Retourner au blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] pt-16">
        <div className="absolute inset-0">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />
        </div>
        
        <div className="relative h-full flex flex-col justify-end p-6 min-h-[60vh]">
          {/* Back Button */}
          <div className="absolute top-6 left-6">
            <Link 
              href="/blog"
              className="flex items-center gap-2 bg-black/50 backdrop-blur-sm text-white px-3 py-2 rounded-full hover:bg-black/70 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Blog</span>
            </Link>
          </div>

          {/* Article Meta */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-brand-pink px-3 py-1.5 rounded-full text-white text-sm font-medium">
                {article.category}
              </span>
              <span className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {article.readTime}
              </span>
              <span className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {article.date}
              </span>
            </div>
            
            <h1 className="text-2xl font-bold text-white leading-tight">
              {article.title}
            </h1>
            
            {article.excerpt && (
              <p className="text-white/80 text-base leading-relaxed">
                {article.excerpt}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Article Content */}
      <section className="py-8">
        <div className="px-6">
          {/* Author Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-8 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10"
          >
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-brand-pink/20">
              <Image
                src={article.author.image}
                alt={article.author.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white text-sm">{article.author.name}</div>
              <div className="text-white/70 text-xs">
                {(article.author as any).role || 'Auteur'}
              </div>
            </div>
          </motion.div>

          {/* Article Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="prose prose-invert prose-sm max-w-none"
          >
            <div 
              className="text-white/90 leading-relaxed space-y-4"
              dangerouslySetInnerHTML={{ __html: article.content }}
              style={{
                fontSize: '16px',
                lineHeight: '1.7'
              }}
            />
          </motion.div>

          {/* Share Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 pt-6 border-t border-white/10"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-brand-pink" />
                <span className="text-white text-sm font-medium">Vous avez aimé cet article ?</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/70 text-sm">Partager :</span>
                <MobileShareButton 
                  network="facebook" 
                  url={typeof window !== 'undefined' ? window.location.href : ''} 
                  title={article.title}
                />
                <MobileShareButton 
                  network="twitter" 
                  url={typeof window !== 'undefined' ? window.location.href : ''} 
                  title={article.title}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Related Articles */}
      {allArticles.length > 0 && (
        <MobileRecommendedArticles
          currentArticle={article}
          allArticles={allArticles}
          maxArticles={3}
        />
      )}

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
              Plus d'articles comme celui-ci
            </h3>
            <p className="text-white/80 mb-6 leading-relaxed">
              Recevez nos meilleurs conseils et articles directement dans votre boîte mail.
            </p>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Votre adresse email"
                className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm text-white placeholder-white/60 rounded-full border border-white/30 focus:border-white/60 focus:outline-none"
              />
              <button className="w-full bg-brand-pink text-white py-3 px-6 rounded-full font-semibold hover:bg-brand-pink/90 transition-colors">
                S'inscrire
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Navigation Bottom */}
      <section className="py-6 border-t border-white/10">
        <div className="px-6">
          <Link 
            href="/blog"
            className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white py-3 px-6 rounded-full hover:bg-white/20 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Voir tous les articles</span>
          </Link>
        </div>
      </section>
    </div>
  );
}