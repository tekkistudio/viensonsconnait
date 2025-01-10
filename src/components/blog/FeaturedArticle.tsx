// src/components/blog/FeaturedArticle.tsx
import { Clock } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { Article } from '../../types/blog'

interface FeaturedArticleProps {
  article: Article
}

export default function FeaturedArticle({ article }: { article: Article }) {
  return (
    <Link href={`/blog/${article.slug}`} className="group">
      <div className="relative aspect-[16/9] rounded-lg overflow-hidden">
        <Image
          src={article.image}
          alt={article.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="mb-2 flex items-center gap-4">
            <span className="text-sm bg-brand-pink px-3 py-1 rounded-full">
              {article.category}
            </span>
            <span className="text-sm flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {article.readTime}
            </span>
            <span className="text-sm">
              {new Date(article.date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </div>
          <h3 className="text-2xl font-bold mb-2 group-hover:text-brand-pink transition-colors">
            {article.title}
          </h3>
          <p className="text-white/90">
            {article.excerpt}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Image
              src={article.author.image}
              alt={article.author.name}
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="text-sm">{article.author.name}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}