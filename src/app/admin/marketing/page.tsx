// src/app/admin/marketing/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  CampaignManager,
  PromoManager,
  AdAccountManager,
  InfluencerManager 
} from '@/components/admin/marketing';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { 
  Loader2, 
  TrendingUp, 
  DollarSign, 
  Users, 
  ArrowUpRight,
  MessageSquare,
  Megaphone
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MarketingStats {
  campaignCount: number;
  activePromos: number;
  influencerCount: number;
  totalRevenue: number;
  conversionRate: number;
  customerAcquisition: number;
  roiPercentage: number;
}

export default function MarketingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<MarketingStats>({
    campaignCount: 0,
    activePromos: 0,
    influencerCount: 0,
    totalRevenue: 0,
    conversionRate: 0,
    customerAcquisition: 0,
    roiPercentage: 0
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchMarketingStats();
  }, []);

  const fetchMarketingStats = async () => {
    try {
      setIsLoading(true);

      // Récupérer les statistiques des campagnes
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('marketing_campaigns')
        .select('*');

      if (campaignsError) throw campaignsError;

      // Récupérer les codes promo actifs
      const { data: promosData, error: promosError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('is_active', true);

      if (promosError) throw promosError;

      // Récupérer les influenceurs
      const { data: influencersData, error: influencersError } = await supabase
        .from('influencers')
        .select('*')
        .eq('status', 'active');

      if (influencersError) throw influencersError;

      // Récupérer les statistiques marketing
      const { data: statsData, error: statsError } = await supabase
        .from('marketing_stats')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      if (statsError) throw statsError;

      // Calculer les statistiques globales
      const totalRevenue = statsData?.reduce((sum, stat) => sum + (stat.revenue || 0), 0) || 0;
      const totalSpend = statsData?.reduce((sum, stat) => sum + (stat.spend || 0), 0) || 0;
      const roi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;

      setStats({
        campaignCount: campaignsData?.length || 0,
        activePromos: promosData?.length || 0,
        influencerCount: influencersData?.length || 0,
        totalRevenue,
        conversionRate: (statsData?.[0]?.conversions || 0) * 100,
        customerAcquisition: statsData?.reduce((sum, stat) => sum + (stat.conversions || 0), 0) || 0,
        roiPercentage: roi
      });

    } catch (error) {
      console.error('Error fetching marketing stats:', error);
      toast({
        variant: "error",
        title: "Erreur",
        description: "Impossible de charger les statistiques marketing"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = () => {
    // Implémentation à venir
    toast({
      title: "Création de campagne",
      description: "Cette fonctionnalité sera bientôt disponible"
    });
  };

  const handleCreatePromo = () => {
    // Implémentation à venir
    toast({
      title: "Création de promotion",
      description: "Cette fonctionnalité sera bientôt disponible"
    });
  };

  const handleAddInfluencer = () => {
    // Implémentation à venir
    toast({
      title: "Ajout d'influenceur",
      description: "Cette fonctionnalité sera bientôt disponible"
    });
  };

  const handleConnectAd = (platform: string) => {
    // Implémentation à venir
    toast({
      title: `Connexion à ${platform}`,
      description: "Cette fonctionnalité sera bientôt disponible"
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Marketing
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Gérez vos campagnes marketing et suivez leurs performances
        </p>
      </div>

      {/* Statistiques générales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Revenu généré</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalRevenue.toLocaleString()} FCFA
                </p>
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">ROI</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.roiPercentage.toFixed(1)}%
                </p>
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Nouveaux clients</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.customerAcquisition}
                </p>
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <Megaphone className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Taux de conversion</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.conversionRate.toFixed(1)}%
                </p>
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Contenu principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="campaigns">Campagnes</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
          <TabsTrigger value="influencers">Influenceurs</TabsTrigger>
          <TabsTrigger value="ads">Publicités</TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-6">
          <TabsContent value="overview">
            <div className="space-y-6">
              <AdAccountManager onConnect={handleConnectAd} />
              <CampaignManager onCreateCampaign={handleCreateCampaign} />
              <PromoManager onCreatePromo={handleCreatePromo} />
            </div>
          </TabsContent>

          <TabsContent value="campaigns">
            <CampaignManager onCreateCampaign={handleCreateCampaign} />
          </TabsContent>

          <TabsContent value="promotions">
            <PromoManager onCreatePromo={handleCreatePromo} />
          </TabsContent>

          <TabsContent value="influencers">
            <InfluencerManager onAddInfluencer={handleAddInfluencer} />
          </TabsContent>

          <TabsContent value="ads">
            <AdAccountManager onConnect={handleConnectAd} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}