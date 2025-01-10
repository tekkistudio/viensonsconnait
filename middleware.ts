// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from './src/types/supabase'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })

  // Vérifie si l'utilisateur essaie d'accéder au dashboard admin
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const { data: { session } } = await supabase.auth.getSession()
    
    // Exclure la page de login de la vérification
    if (req.nextUrl.pathname === '/admin/login') {
      // Si l'utilisateur est déjà connecté et est admin, rediriger vers le dashboard
      if (session) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.user_metadata?.role === 'admin') {
          return NextResponse.redirect(new URL('/admin', req.url))
        }
      }
      return res
    }

    // Si pas de session, redirection vers login
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }

    try {
      // Vérifier le rôle dans les métadonnées
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) throw userError

      if (!user?.user_metadata?.role || user.user_metadata.role !== 'admin') {
        // Log pour le débogage
        console.log('Accès refusé :', {
          userId: user?.id,
          metadata: user?.user_metadata,
          role: user?.user_metadata?.role
        })
        
        // Déconnecter l'utilisateur non autorisé
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/admin/login', req.url))
      }
    } catch (error) {
      console.error('Erreur middleware:', error)
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
  }

  return res
}

// Configurer les routes qui doivent être protégées
export const config = {
  matcher: '/admin/:path*'
}