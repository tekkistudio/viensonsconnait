// app/temoignages/page.tsx
import { Metadata } from 'next';
import { AdaptiveTemoignages } from '@/features/testimonials/components/AdaptiveTemoignages';

export const metadata: Metadata = {
  title: 'Témoignages | VIENS ON S\'CONNAÎT',
  description: 'Découvrez les expériences authentiques de personnes qui ont renforcé leurs relations grâce à nos jeux.',
};

export default function TemoignagesPage() {
  return <AdaptiveTemoignages />;
}