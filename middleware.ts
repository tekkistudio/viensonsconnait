// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient<Database>({ req, res });

  console.log('🔒 Middleware - URL:', req.nextUrl.pathname);

  try {
    // Récupérer et rafraîchir la session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('❌ Erreur session:', sessionError);
      throw sessionError;
    }

    // Log détaillé de la session
    console.log('📋 Session détails:', {
      exists: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
    });

    // Pour les routes protégées
    if (req.nextUrl.pathname.startsWith('/admin') && 
        !req.nextUrl.pathname.startsWith('/admin/login')) {
      
      if (!session) {
        console.log('➡️ Redirection vers login - Pas de session');
        const redirectUrl = new URL('/admin/login', req.url);
        redirectUrl.searchParams.set('from', req.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
      }

      // Vérifier les données utilisateur
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userError) {
        console.error('❌ Erreur données utilisateur:', userError);
        throw userError;
      }

      console.log('👤 Données utilisateur:', userData);

      if (userData?.role !== 'admin') {
        console.log('❌ Non admin - Déconnexion');
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }

      // Page settings - pas de redirection, juste des logs
      if (req.nextUrl.pathname.startsWith('/admin/settings/')) {
        console.log('⚙️ Page settings - Store ID:', userData?.store_id);
      }

      // Mise à jour des headers pour la persistance de session
      const response = NextResponse.next();
      response.headers.set('x-user-id', userData.id);
      response.headers.set('x-user-role', userData.role);
      if (userData.store_id) {
        response.headers.set('x-store-id', userData.store_id);
      }

      return response;
    }

    // Page de login avec session active
    if (req.nextUrl.pathname === '/admin/login' && session) {
      console.log('➡️ Redirection vers dashboard - Déjà connecté');
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }

    return res;

  } catch (error) {
    console.error('❌ Erreur middleware:', error);
    // En cas d'erreur, on redirige vers login
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }
}

export const config = {
  matcher: ['/admin/:path*']
};