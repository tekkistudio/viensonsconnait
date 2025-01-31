// src/app/admin/layout.tsx
'use client';

import { usePathname } from 'next/navigation';
import { AdminThemeProvider } from '@/core/theme/AdminThemeProvider';
import { LayoutProvider } from '@/core/context/LayoutContext';
import { NotificationsProvider } from '@/components/admin/NotificationsProvider';
import { AuthProvider } from '@/components/admin/AuthProvider';
import AdminSidebar from '../../components/admin/AdminSidebar';
import FloatingAssistant from '@/components/global/FloatingAssistant';
import { Toaster } from '@/components/ui/toaster';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  return (
    <AdminThemeProvider>
      <AuthProvider>
        <LayoutProvider>
          <NotificationsProvider>
            <div className="relative min-h-screen bg-background">
              {isLoginPage ? (
                <>{children}</>
              ) : (
                <div className="flex h-full min-h-screen">
                  {/* Sidebar pour desktop */}
                  <div className="hidden md:block w-64 fixed inset-y-0 left-0">
                    <AdminSidebar />
                  </div>

                  {/* Sidebar pour mobile */}
                  <div className="md:hidden">
                    <AdminSidebar />
                  </div>

                  {/* Contenu principal */}
                  <main className="flex-1 md:ml-64 w-full">
                    <div className="p-4 md:p-8 min-h-screen">
                      {children}
                    </div>
                  </main>

                  {/* Assistant flottant */}
                  <FloatingAssistant />
                </div>
              )}
              <Toaster />
            </div>
          </NotificationsProvider>
        </LayoutProvider>
      </AuthProvider>
    </AdminThemeProvider>
  );
}