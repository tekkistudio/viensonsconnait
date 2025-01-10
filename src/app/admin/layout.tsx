// app/admin/layout.tsx
import { Metadata } from 'next'
import AdminSidebar from './components/AdminSidebar'
import AdminHeader from './components/AdminHeader'

export const metadata: Metadata = {
  title: 'Admin Dashboard | VIENS ON S\'CONNAÎT',
  description: 'Tableau de bord d\'administration',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}