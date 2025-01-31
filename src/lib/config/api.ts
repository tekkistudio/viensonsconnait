// src/lib/config/api.ts
export const API_CONFIG = {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    bictorys: {
      baseUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/bictorys`,
      apiKey: process.env.NEXT_PUBLIC_BICTORYS_API_KEY
    }
  } as const;