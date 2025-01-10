// src/app/products/[productId]/layout.tsx
'use client';

import { AppLayout } from '../../../components/layouts/AppLayout';

export default function ProductLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <>{children}</>;
  }