// app/blog/page.tsx
import { Metadata } from 'next';
import Blog from '../../../features/blog/components/Blog';

export const metadata: Metadata = {
  title: 'Blog | VIENS ON S\'CONNAÎT',
  description: 'Conseils, astuces et réflexions pour des relations plus fortes et épanouissantes.',
};

export default function BlogPage() {
  return <Blog />;
}

