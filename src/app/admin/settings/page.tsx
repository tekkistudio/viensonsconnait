// src/app/admin/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Store,
  CreditCard,
  Truck,
  Bell,
  Users,
  Database,
  Link as LinkIcon,
  Bot,
  ArrowRight,
  Globe2,
  Mail,
  Phone,
  MessageSquare,
  ShieldCheck,
  Settings2,
  Building2,
  ImageIcon
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { supabase } from '@/lib/supabase';

const settingsGroups = [
  {
    title: "Paramètres de la boutique",
    description: "Configuration générale de votre boutique en ligne",
    items: [
      {
        title: "Informations de la boutique",
        description: "Gérez le nom et les informations de contact",
        icon: Store,
        href: "/admin/settings/store",
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-900/20"
      },
      {
        title: "Chatbot IA",
        description: "Configurez la personnalité et le comportement de votre Chatbot",
        icon: Bot,
        href: "/admin/settings/chatbot",
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-50 dark:bg-purple-900/20"
      },
      {
        title: "Médias",  
        description: "Gérez l'ensemble de vos images et fichiers multimédias",
        icon: ImageIcon,
        href: "/admin/settings/media",
        color: "text-indigo-600 dark:text-indigo-400",
        bgColor: "bg-indigo-50 dark:bg-indigo-900/20"
      }
    ]
  },
  {
    title: "Commerce",
    description: "Gérez vos options de paiement et de livraison",
    items: [
      {
        title: "Paiements",
        description: "Configurez Wave, Orange Money et autres moyens de paiement",
        icon: CreditCard,
        href: "/admin/settings/payments",
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-50 dark:bg-emerald-900/20"
      },
      {
        title: "Livraison",
        description: "Gérez les zones et options de livraison",
        icon: Truck,
        href: "/admin/settings/delivery",
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-50 dark:bg-orange-900/20"
      }
    ]
  },
  {
    title: "Communication",
    description: "Gérez vos notifications et communications clients",
    items: [
      {
        title: "Emails",
        description: "Configurez vos modèles d'emails transactionnels",
        icon: Mail,
        href: "/admin/settings/notifications",
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-50 dark:bg-yellow-900/20"
      },
      {
        title: "SMS",
        description: "Gérez les notifications par SMS",
        icon: Phone,
        href: "/admin/settings/notifications",
        color: "text-pink-600 dark:text-pink-400",
        bgColor: "bg-pink-50 dark:bg-pink-900/20"
      },
      {
        title: "WhatsApp",
        description: "Gérez votre communication sur WhatsApp",
        icon: WhatsAppIcon,
        href: "/admin/settings/whatsapp",
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-900/20"
      }
    ]
  },
  {
    title: "Équipe",
    description: "Gérez les accès et la sécurité",
    items: [
      {
        title: "Membres",
        description: "Gérez les utilisateurs et leurs rôles",
        icon: Users,
        href: "/admin/settings/users",
        color: "text-indigo-600 dark:text-indigo-400",
        bgColor: "bg-indigo-50 dark:bg-indigo-900/20"
      },
      {
        title: "Autorisations",
        description: "Configurez les permissions et les accès",
        icon: ShieldCheck,
        href: "/admin/settings/users",
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-900/20"
      }
    ]
  },
  {
    title: "Système",
    description: "Gérez les aspects techniques de votre boutique",
    items: [
      {
        title: "Sauvegardes",
        description: "Configurez la sauvegarde automatique des données",
        icon: Database,
        href: "/admin/settings/data",
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-900/20"
      },
      {
        title: "Intégrations",
        description: "Gérez les connexions avec des services externes",
        icon: LinkIcon,
        href: "/admin/settings/integrations",
        color: "text-cyan-600 dark:text-cyan-400",
        bgColor: "bg-cyan-50 dark:bg-cyan-900/20"
      },
      {
        title: "Maintenance",
        description: "Nettoyage et optimisation des données",
        icon: Settings2,
        href: "/admin/settings/data",
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-50 dark:bg-purple-900/20"
      }
    ]
  },
  {
    title: "Boutique",
    description: "Gérez l'apparence et le contenu",
    items: [
      {
        title: "Thème",
        description: "Personnalisez l'apparence de votre boutique",
        icon: Building2,
        href: "/admin/settings/store",
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-50 dark:bg-orange-900/20"
      }
    ]
  }
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [storeInfo, setStoreInfo] = useState<any>(null);

  useEffect(() => {
    fetchStoreInfo();
  }, []);

  const fetchStoreInfo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setStoreInfo(data);
      }
    } catch (error) {
      console.error('Error fetching store info:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations de la boutique",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Paramètres
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gérez tous les aspects de votre boutique en ligne
          </p>
        </div>
        {storeInfo && (
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {storeInfo.name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Dernière mise à jour : {new Date(storeInfo.updated_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {settingsGroups.map((group, index) => (
          <div key={index}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {group.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {group.description}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {group.items.map((item, itemIndex) => (
                <Link key={itemIndex} href={item.href}>
                  <Card className="p-6 hover:shadow-md transition-all duration-200 cursor-pointer group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "p-3 rounded-lg transition-colors",
                          item.bgColor,
                          "group-hover:bg-opacity-80"
                        )}>
                          <item.icon className={cn(
                            "w-6 h-6",
                            item.color
                          )} />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {item.title}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}