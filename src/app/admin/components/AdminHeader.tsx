// app/admin/components/AdminHeader.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { User } from '@supabase/supabase-js'
import { LogOut, Settings } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function AdminHeader() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    fetchUser()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2">
          <Image
            src="/images/logos/logo-black.svg"
            alt="VIENS ON S'CONNAÎT"
            width={150}
            height={150}
            className="w-150 h-150"
          />
        </Link>

        <div className="flex items-center gap-4">
          {user && (
            <>
              <div className="text-sm text-gray-600">
                {user.email}
              </div>
              <Link
                href="/admin/settings"
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </Link>
              <button
                onClick={handleSignOut}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}