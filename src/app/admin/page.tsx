'use client'

import { useEffect, useState } from 'react'
import { FileText, Users, Tags, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import DashboardStats from '../../components/admin/DashboardStats'
import Link from 'next/link'

interface DashboardStats {
  totalPosts: number
  totalAuthors: number
  totalTags: number
  draftPosts: number
}

const StatCard = ({ 
  title, 
  value, 
  icon: Icon,
  href
}: { 
  title: string
  value: number
  icon: React.ElementType
  href: string
}) => (
  <Link
    href={href}
    className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex items-center gap-4">
      <div className="bg-brand-blue/10 p-4 rounded-lg">
        <Icon className="w-6 h-6 text-brand-blue" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </Link>
)

const QuickAction = ({ 
  title, 
  description, 
  icon: Icon,
  href 
}: { 
  title: string
  description: string
  icon: React.ElementType
  href: string
}) => (
  <Link
    href={href}
    className="flex items-start gap-4 p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="bg-brand-pink/10 p-3 rounded-lg">
      <Icon className="w-6 h-6 text-brand-pink" />
    </div>
    <div>
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </Link>
)

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPosts: 0,
    totalAuthors: 0,
    totalTags: 0,
    draftPosts: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState({
    conversionData: [
      { country: 'Sénégal', rate: 4.2 },
      { country: 'Côte d\'Ivoire', rate: 3.8 },
      { country: 'Cameroun', rate: 3.5 },
      { country: 'Mali', rate: 2.9 }
    ],
    visitsData: [
      { date: '01/01', visits: 145 },
      { date: '02/01', visits: 231 },
      { date: '03/01', visits: 178 },
      { date: '04/01', visits: 298 },
      { date: '05/01', visits: 265 }
    ]
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Nombre total d'articles
        const { count: totalPosts } = await supabase
          .from('blog_posts')
          .select('*', { count: 'exact', head: true })

        // Nombre d'articles en brouillon
        const { count: draftPosts } = await supabase
          .from('blog_posts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'draft')

        // Nombre total d'auteurs
        const { count: totalAuthors } = await supabase
          .from('blog_authors')
          .select('*', { count: 'exact', head: true })

        // Nombre total de tags
        const { count: totalTags } = await supabase
          .from('blog_tags')
          .select('*', { count: 'exact', head: true })

        setStats({
          totalPosts: totalPosts || 0,
          draftPosts: draftPosts || 0,
          totalAuthors: totalAuthors || 0,
          totalTags: totalTags || 0
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-pink"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Tableau de bord
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Bienvenue dans l'interface d'administration de VIENS ON S'CONNAÎT
        </p>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Articles publiés"
          value={stats.totalPosts}
          icon={FileText}
          href="/admin/articles"
        />
        <StatCard 
          title="Brouillons"
          value={stats.draftPosts}
          icon={TrendingUp}
          href="/admin/articles?status=draft"
        />
        <StatCard 
          title="Auteurs"
          value={stats.totalAuthors}
          icon={Users}
          href="/admin/authors"
        />
        <StatCard 
          title="Tags"
          value={stats.totalTags}
          icon={Tags}
          href="/admin/tags"
        />
      </div>

      {/* Nouveaux graphiques et statistiques */}
      <DashboardStats 
        conversionData={analyticsData.conversionData}
        visitsData={analyticsData.visitsData}
      />

      {/* Actions rapides */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Actions rapides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <QuickAction
            title="Nouvel article"
            description="Créer et publier un nouvel article de blog"
            icon={FileText}
            href="/admin/articles/new"
          />
          <QuickAction
            title="Nouvel auteur"
            description="Ajouter un nouveau membre à l'équipe éditoriale"
            icon={Users}
            href="/admin/authors/new"
          />
        </div>
      </div>
    </div>
  )
}