// src/components/blog/ArticleCard.tsx
import { Clock } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { Article } from '../../types/blog'

interface ArticleCardProps {
  article: Article
}

export default function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={`/blog/${article.slug}`} className="group">
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="relative aspect-[16/9]">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="p-6">
          <div className="mb-4 flex items-center gap-4">
            <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
              {article.category}
            </span>
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {article.readTime}
            </span>
          </div>
          <h3 className="text-xl font-bold text-brand-blue mb-2 group-hover:text-brand-pink transition-colors">
            {article.title}
          </h3>
          <p className="text-gray-600 mb-4">
            {article.excerpt}
          </p>
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {article.tags.map(tag => (
                <span 
                  key={tag} 
                  className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src={article.author.image}
                alt={article.author.name}
                width={24}
                height={24}
                className="rounded-full"
              />
              <span className="text-sm text-gray-600">{article.author.name}</span>
            </div>
            <span className="text-sm text-gray-500">
              {new Date(article.date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short'
              })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}