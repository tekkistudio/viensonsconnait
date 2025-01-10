// app/admin/articles/[articleId]/edit/page.tsx
'use client'

import ArticleForm from '../../../../../components/ArticleForm' 

export default function EditArticlePage({ params }: { params: { articleId: string } }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Modifier l'article</h1>
      <ArticleForm articleId={params.articleId} />
    </div>
  )
}