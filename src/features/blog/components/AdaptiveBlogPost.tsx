// src/features/blog/components/AdaptiveBlogPost.tsx
"use client"

import { useBreakpoint } from '@/core/theme/hooks/useBreakpoint';
import BlogPost from './BlogPost';
import MobileBlogPost from './mobile/MobileBlogPost';

interface AdaptiveBlogPostProps {
  slug: string;
}

export function AdaptiveBlogPost({ slug }: AdaptiveBlogPostProps) {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <MobileBlogPost slug={slug} />;
  }

  return <BlogPost slug={slug} />;
}