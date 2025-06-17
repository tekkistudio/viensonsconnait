// src/features/blog/components/mobile/MobileBlogPost.tsx - VERSION OPTIMISÉE THÈMES
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
      className="p-3 bg-theme-card backdrop-blur-sm rounded-full hover:bg-theme-secondary/10 transition-colors border border-theme shadow-sm hover:shadow-lg"
      aria-label={`Partager sur ${network}`}
    >
      {network === 'facebook' ? (
        <Facebook className="w-5 h-5 text-theme-primary" />
      ) : (
        <Twitter className="w-5 h-5 text-theme-primary" />
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
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-pink mx-auto mb-4" />
          <p className="text-theme-secondary">Chargement de l'article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-theme-primary flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">📖</div>
          <h2 className="text-theme-primary text-xl font-bold mb-2">Article non trouvé</h2>
          <p className="text-theme-secondary mb-6">Cet article n'existe pas ou a été supprimé.</p>
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
    <div className="min-h-screen bg-theme-primary">
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
            className="flex items-center gap-3 mb-8 bg-theme-card backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm"
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
              <div className="font-semibold text-theme-primary text-sm">{article.author.name}</div>
              <div className="text-theme-secondary text-xs">
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
              className="text-theme-primary leading-relaxed space-y-4"
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
            className="mt-8 pt-6 border-t border-theme"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-brand-pink" />
                <span className="text-theme-primary text-sm font-medium">Vous avez aimé cet article ?</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-theme-secondary text-sm">Partager :</span>
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
              Plus d'articles comme celui-ci
            </h3>
            <p className="text-theme-secondary mb-6 leading-relaxed">
              Rejoignez notre communauté WhatsApp et recevez nos meilleurs conseils relationnels,
              articles exclusifs et offres spéciales. Plus de 2500 membres nous font confiance !
            </p>
            
            <div className="space-y-4">
              {/* Avantages simplifiés pour article */}
              <div className="flex flex-wrap justify-center gap-3 text-xs">
                <div className="flex items-center gap-2 bg-theme-secondary/5 rounded-full px-3 py-2">
                  <div className="w-2 h-2 bg-[#25D366] rounded-full"></div>
                  <span className="text-theme-primary font-medium">Articles exclusifs</span>
                </div>
                <div className="flex items-center gap-2 bg-theme-secondary/5 rounded-full px-3 py-2">
                  <div className="w-2 h-2 bg-[#25D366] rounded-full"></div>
                  <span className="text-theme-primary font-medium">Conseils pratiques</span>
                </div>
                <div className="flex items-center gap-2 bg-theme-secondary/5 rounded-full px-3 py-2">
                  <div className="w-2 h-2 bg-[#25D366] rounded-full"></div>
                  <span className="text-theme-primary font-medium">Offres spéciales</span>
                </div>
              </div>
              
              {/* Bouton d'inscription WhatsApp */}
              <button 
                onClick={() => {
                  const message = encodeURIComponent(
                    "Bonjour ! 👋\n\nJe viens de lire un article sur votre blog et je souhaite rejoindre la communauté pour recevoir :\n" +
                    "📚 Les articles exclusifs\n" +
                    "💝 Les conseils relationnels\n" +
                    "🎁 Les offres spéciales"
                  );
                  window.open(`https://wa.me/221781362728?text=${message}`, '_blank');
                }}
                className="w-full bg-[#25D366] text-white py-4 px-6 rounded-full font-bold hover:bg-[#128C7E] transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.386"/>
                </svg>
                <span>Rejoindre maintenant</span>
              </button>
              
              {/* Stats simplifiées */}
              <p className="text-theme-secondary text-xs">
                🚀 Plus de 2500 membres • 💬 100% gratuit • ✅ Désabonnement facile
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Navigation Bottom */}
      <section className="py-6 border-t border-theme">
        <div className="px-6">
          <Link 
            href="/blog"
            className="flex items-center justify-center gap-2 bg-theme-card backdrop-blur-sm text-theme-primary py-3 px-6 rounded-full hover:bg-theme-secondary/10 transition-colors border border-theme shadow-sm hover:shadow-lg"
          >
            <BookOpen className="w-4 h-4" />
            <span>Voir tous les articles</span>
          </Link>
        </div>
      </section>
    </div>
  );
}