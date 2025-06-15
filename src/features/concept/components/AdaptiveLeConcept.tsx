// src/features/concept/components/AdaptiveLeConcept.tsx
"use client"

import { useBreakpoint } from '@/core/theme/hooks/useBreakpoint';
import LeConcept from './LeConcept';
import MobileLeConcept from './mobile/MobileLeConcept';

export function AdaptiveLeConcept() {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <MobileLeConcept />;
  }

  return <LeConcept />;
}