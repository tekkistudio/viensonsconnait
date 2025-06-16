// src/features/blog/components/AdaptiveBlog.tsx
"use client"

import { useBreakpoint } from '@/core/theme/hooks/useBreakpoint';
import Blog from './Blog';
import MobileBlog from './mobile/MobileBlog';

export function AdaptiveBlog() {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <MobileBlog />;
  }

  return <Blog />;
}