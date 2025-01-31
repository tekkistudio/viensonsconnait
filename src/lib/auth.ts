// src/lib/auth.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

export interface AuthUser {
  id: string
  email: string
  role: string
  metadata: {
    role?: string
  }
}

export async function authenticateUser() {
  const supabase = createClientComponentClient<Database>()
  
  try {
    // 1. Vérifier si une session existe
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) throw sessionError
    if (!session?.user) return null

    // 2. Récupérer les données utilisateur depuis la table users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (userError) throw userError

    // 3. Mettre à jour les métadonnées de l'utilisateur si nécessaire
    if (!session.user.user_metadata?.role || session.user.user_metadata.role !== userData?.role) {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { role: userData?.role }
      })
      
      if (updateError) throw updateError
    }

    return {
      id: session.user.id,
      email: session.user.email,
      role: userData?.role,
      metadata: session.user.user_metadata
    } as AuthUser
  } catch (error) {
    console.error('Erreur d\'authentification:', error)
    return null
  }
}

export async function checkAdminAccess(): Promise<boolean> {
  const user = await authenticateUser()
  return user?.role === 'admin'
}