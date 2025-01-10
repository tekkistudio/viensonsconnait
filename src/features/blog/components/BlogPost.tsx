// features/blog/components/BlogPost.tsx
"use client"

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Share2, Clock, ArrowLeft, Facebook, Twitter } from 'lucide-react';
import type { Article } from '../../../types/blog'
import { RecommendedArticles } from './RecommendedArticles';
import { useArticles } from '../hooks/useArticles';

function ShareButton({ network, url, title }: { network: string; url: string; title: string }) {
  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
  };

  return (
    <a
      href={shareUrls[network as keyof typeof shareUrls]}
      target="_blank"
      rel="noopener noreferrer"
      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
      aria-label={`Partager sur ${network}`}
    >
      {network === 'facebook' ? (
        <Facebook className="w-5 h-5 text-gray-600" />
      ) : (
        <Twitter className="w-5 h-5 text-gray-600" />
      )}
    </a>
  );
}

export default function BlogPost({ slug }: { slug: string }) {
    console.log("BlogPost rendu avec slug:", slug); // Debug log
    const { article, allArticles, isLoading, error } = useArticles(slug);
  
    console.log("État BlogPost:", {
      slugReçu: slug,
      articleTrouvé: !!article,
      nomArticle: article?.title,
      nombreArticles: allArticles.length,
      isLoading,
      error
    });
  
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-pink"></div>
        </div>
      );
    }
  
    if (!article) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Article non trouvé</h2>
          <Link 
            href="/blog"
            className="text-brand-blue hover:text-brand-pink transition-colors"
          >
            Retourner à la liste des articles
          </Link>
        </div>
      );
    }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-[60vh] min-h-[400px] bg-brand-blue">
        <Image
          src={article.image}
          alt={article.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-4xl mx-auto px-4 text-white text-center">
            <motion.h1 
              className="text-4xl md:text-5xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {article.title}
            </motion.h1>
            <motion.div
              className="flex items-center justify-center gap-4 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <span className="bg-brand-pink/20 backdrop-blur-sm px-3 py-1 rounded-full">
                {article.category}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {article.readTime}
              </span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Article Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            href="/blog"
            className="flex items-center gap-2 text-gray-600 hover:text-brand-blue transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux articles</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Partager :</span>
            <ShareButton 
              network="facebook" 
              url={typeof window !== 'undefined' ? window.location.href : ''} 
              title={article.title}
            />
            <ShareButton 
              network="twitter" 
              url={typeof window !== 'undefined' ? window.location.href : ''} 
              title={article.title}
            />
          </div>
        </div>

        {/* Author */}
        <div className="flex items-center gap-4 mb-8 p-4 bg-gray-50 rounded-lg">
          <Image
            src={article.author.image}
            alt={article.author.name}
            width={60}
            height={60}
            className="rounded-full"
          />
          <div>
            <div className="font-medium text-gray-900">{article.author.name}</div>
            <div className="text-sm text-gray-600">{article.author.role}</div>
            <div className="text-sm text-gray-500">{article.date}</div>
          </div>
        </div>

        {/* Article Content */}
        <div 
          className="prose prose-lg max-w-none text-gray-600"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Related Articles */}
        {allArticles.length > 0 && (
          <RecommendedArticles
            currentArticle={article}
            allArticles={allArticles}
            maxArticles={3}
          />
        )}
      </div>

      {/* Newsletter Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold text-brand-blue mb-4">
            Restez informé
          </h3>
          <p className="text-gray-600 mb-8">
            Recevez nos meilleurs conseils et articles directement dans votre boîte mail.
          </p>
          <form className="flex gap-4">
            <input
              type="email"
              placeholder="Votre adresse email"
              className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-brand-blue text-white rounded-lg font-medium hover:bg-brand-pink transition-colors"
            >
              S'inscrire
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}