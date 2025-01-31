// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Fonction de création de client personnalisé - gardée pour la compatibilité
export const createSupabaseClient = (options: {
  persistSession?: boolean;
  autoRefreshToken?: boolean;
  enableLogging?: boolean;
} = {}) => {
  const {
    persistSession = true,
    autoRefreshToken = true,
    enableLogging = process.env.NODE_ENV === 'development'
  } = options;

  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession,
        autoRefreshToken,
        detectSessionInUrl: false,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      db: {
        schema: 'public'
      },
      global: enableLogging ? {
        fetch: (url, options) => {
          console.log(`Supabase request: ${options?.method || 'GET'} ${url}`);
          return fetch(url, options);
        }
      } : undefined
    }
  )
}

// Client par défaut pour l'utilisation côté client
export const supabase = createSupabaseClient({
  persistSession: true,
  autoRefreshToken: true,
  enableLogging: process.env.NODE_ENV === 'development'
})

// Client pour les fonctions serverless et API routes
export const supabaseServer = createSupabaseClient({
  persistSession: false,
  autoRefreshToken: false,
  enableLogging: false
})

// Helper pour les logs d'erreur
export const logSupabaseError = (error: any, context: string) => {
  console.error(`Supabase error in ${context}:`, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
  })
}