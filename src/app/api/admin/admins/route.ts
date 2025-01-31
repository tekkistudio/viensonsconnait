// app/api/admin/admins/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.user_metadata?.role || session.user.user_metadata.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: admins, error } = await supabase
      .from('auth_logs')
      .select('user_id, metadata')
      .eq('action', 'admin_created')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ admins })

  } catch (error) {
    console.error('Error fetching admins:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admins' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est un super admin
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.user_metadata?.role || session.user.user_metadata.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Créer le nouvel admin
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'admin'
      }
    })

    if (authError) throw authError

    // Logger la création
    await supabase
      .from('auth_logs')
      .insert([{
        user_id: authData.user.id,
        action: 'admin_created',
        success: true,
        metadata: {
          email,
          created_at: new Date().toISOString(),
          created_by: session.user.id
        }
      }])

    return NextResponse.json({
      success: true,
      admin: {
        id: authData.user.id,
        email: authData.user.email,
        role: authData.user.user_metadata.role
      }
    })

  } catch (error) {
    console.error('Error creating admin:', error)
    return NextResponse.json(
      { error: 'Failed to create admin' },
      { status: 500 }
    )
  }
}