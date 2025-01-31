// src/components/layouts/ScriptsLoader.tsx
'use client';

import Script from 'next/script';
import { useEffect } from 'react';

export function ScriptsLoader() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Window loaded, ready for scripts');
    }
  }, []);

  return (
    <Script
      src="https://cdn.bictorys.com/js/v1/bictorys.min.js"
      strategy="afterInteractive"
    />
  );
}