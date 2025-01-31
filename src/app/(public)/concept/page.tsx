// app/concept/page.tsx
import { Metadata } from 'next';
import LeConcept from '../../../features/concept/components/LeConcept';

export const metadata: Metadata = {
  title: 'Le Concept | VIENS ON S\'CONNAÎT',
  description: 'Découvrez comment nos jeux de cartes innovants renforcent les relations humaines à travers des conversations authentiques et profondes.',
};

export default function LeConceptPage() {
  return <LeConcept />;
}