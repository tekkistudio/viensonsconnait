// src/features/about/components/AdaptiveNotreHistoire.tsx
"use client"

import { useBreakpoint } from '@/core/theme/hooks/useBreakpoint';
import NotreHistoire from './NotreHistoire';
import MobileNotreHistoire from './mobile/MobileNotreHistoire';

export function AdaptiveNotreHistoire() {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <MobileNotreHistoire />;
  }

  return <NotreHistoire />;
}

