// app/blog/page.tsx - VERSION MISE À JOUR
import { Metadata } from 'next';
import { AdaptiveBlog } from '@/features/blog/components/AdaptiveBlog';

export const metadata: Metadata = {
  title: 'Blog | VIENS ON S\'CONNAÎT',
  description: 'Conseils, astuces et réflexions pour des relations plus fortes et épanouissantes.',
  openGraph: {
    title: 'Blog | VIENS ON S\'CONNAÎT',
    description: 'Conseils, astuces et réflexions pour des relations plus fortes et épanouissantes.',
    type: 'website',
    url: 'https://viens-on-sconnait.com/blog',
  },
};

export default function BlogPage() {
  return <AdaptiveBlog />;
}