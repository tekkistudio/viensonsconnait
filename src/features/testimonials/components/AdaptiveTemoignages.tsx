// src/features/testimonials/components/AdaptiveTemoignages.tsx
"use client"

import { useBreakpoint } from '@/core/theme/hooks/useBreakpoint';
import Temoignages from './Temoignages';
import MobileTemoignages from './mobile/MobileTemoignages';

export function AdaptiveTemoignages() {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <MobileTemoignages />;
  }

  return <Temoignages />;
}