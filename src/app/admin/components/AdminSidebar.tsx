// app/admin/components/AdminSidebar.tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  FileText,
  Tags,
  Users,
  FolderOpen,
  Settings
} from 'lucide-react'
import { cn } from '../../../lib/utils'

const menuItems = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard
  },
  {
    name: 'Articles',
    href: '/admin/articles',
    icon: FileText
  },
  {
    name: 'Catégories',
    href: '/admin/categories',
    icon: FolderOpen
  },
  {
    name: 'Tags',
    href: '/admin/tags',
    icon: Tags
  },
  {
    name: 'Auteurs',
    href: '/admin/authors',
    icon: Users
  },
  {
    name: 'Paramètres',
    href: '/admin/settings',
    icon: Settings
  }
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-[calc(100vh-64px)] bg-white border-r border-gray-200">
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-brand-blue text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}