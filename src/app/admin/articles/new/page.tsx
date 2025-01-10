// app/admin/articles/new/page.tsx
import ArticleForm from '../../../../components/ArticleForm' 

export default function NewArticlePage() {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Nouvel article</h1>
        <ArticleForm />
      </div>
    )
  }