// lib/auth-helpers.ts
import { supabase } from './supabase'

export async function checkAdminRole(): Promise<boolean> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Erreur lors de la vérification du rôle:', error)
      return false
    }

    console.log('Métadonnées utilisateur:', {
      id: user?.id,
      email: user?.email,
      metadata: user?.user_metadata
    })

    return user?.user_metadata?.role === 'admin'
  } catch (err) {
    console.error('Erreur dans checkAdminRole:', err)
    return false
  }
}