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

  const client = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession,
        autoRefreshToken,
        detectSessionInUrl: true,
        storageKey: 'vosc-admin-supabase-auth',
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
  );

  // Debug logs en dev
  if (enableLogging && typeof window !== 'undefined') {
    client.auth.getSession().then(({ data: { session } }) => {
      console.log('Session initiale:', session);
    });

    client.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
    });
  }

  return client;
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