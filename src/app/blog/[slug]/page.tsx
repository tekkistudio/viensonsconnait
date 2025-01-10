// app/blog/[slug]/page.tsx
import { Metadata } from 'next';
import BlogPost from '../../../features/blog/components/BlogPost';
import { blogService } from '../../../features/blog/services/blogService';

interface Props {
  params: { slug: string }
}

const SITE_NAME = "VIENS ON SCONNAIT";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = blogService.getArticleBySlug(params.slug);
  
  return {
    title: article 
      ? `${article.title} | ${SITE_NAME}` 
      : `Article | ${SITE_NAME}`,
    description: article?.excerpt || `Article du blog ${SITE_NAME}`,
    openGraph: {
      title: article?.title || 'Article',
      description: article?.excerpt || `Article du blog ${SITE_NAME}`,
      type: 'article',
      url: `https://viens-on-sconnait.com/blog/${params.slug}`,
    },
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = params;
  
  return <BlogPost slug={slug} />;
}