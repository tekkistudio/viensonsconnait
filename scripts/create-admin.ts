// scripts/create-admin.ts
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import type { Database } from '@/types/supabase'

dotenv.config()

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Clé service nécessaire pour la création d'utilisateurs
)

async function createAdmin(email: string, password: string) {
  try {
    // 1. Créer l'utilisateur
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'admin'
      }
    })

    if (authError) throw authError

    // 2. Logger la création
    await supabase
      .from('auth_logs')
      .insert([{
        user_id: authData.user.id,
        action: 'admin_created',
        success: true,
        metadata: {
          email,
          created_at: new Date().toISOString(),
          created_by: 'system'
        }
      }])

    console.log('Administrateur créé avec succès:', {
      id: authData.user.id,
      email: authData.user.email,
      role: authData.user.user_metadata.role
    })

  } catch (error) {
    console.error('Erreur lors de la création de l\'admin:', error)
    process.exit(1)
  }
}

// Lire les arguments de la ligne de commande
const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.error('Usage: ts-node create-admin.ts <email> <password>')
  process.exit(1)
}

createAdmin(email, password)