// src/app/admin/settings/integrations/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Link,
  MessageSquare,
  CreditCard,
  Truck,
  BarChart3,
  Box,
  Phone,
  Mail,
  Globe,
  Loader2,
  Settings2,
  AlertTriangle,
  CheckCircle2,
  RefreshCcw,
  ExternalLink,
  Lock,
  ShieldCheck,
  Clock
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";

interface IntegrationProvider {
  id: string;
  name: string;
  description: string;
  logo: string;
  category: "messaging" | "payment" | "delivery" | "analytics" | "marketing";
  isConnected: boolean;
  status: "active" | "inactive" | "error" | "pending";
  credentials?: {
    [key: string]: string;
  };
  settings?: {
    [key: string]: any;
  };
  lastSyncAt?: string;
  error?: string;
}

interface IntegrationSettings {
  id: string;
  providers: IntegrationProvider[];
  webhookUrl: string;
  debugMode: boolean;
}

const defaultProviders: IntegrationProvider[] = [
  // Messagerie
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Intégrez WhatsApp pour communiquer avec vos clients",
    logo: "/logos/whatsapp.svg",
    category: "messaging",
    isConnected: false,
    status: "inactive",
    credentials: {
      apiKey: "",
      phoneNumberId: "",
      verificationToken: ""
    },
    settings: {
      automaticReplies: true,
      notifyNewOrders: true,
      notifyShipments: true
    }
  },
  // Paiement
  {
    id: "wave",
    name: "Wave",
    description: "Acceptez les paiements via Wave",
    logo: "/logos/wave.svg",
    category: "payment",
    isConnected: false,
    status: "inactive",
    credentials: {
      apiKey: "",
      merchantId: "",
      secretKey: ""
    },
    settings: {
      autoCapture: true,
      testMode: true
    }
  },
  {
    id: "orange_money",
    name: "Orange Money",
    description: "Acceptez les paiements via Orange Money",
    logo: "/logos/orange-money.svg",
    category: "payment",
    isConnected: false,
    status: "inactive",
    credentials: {
      apiKey: "",
      merchantId: "",
      secretKey: ""
    },
    settings: {
      autoCapture: true,
      testMode: true
    }
  },
  // Livraison
  {
    id: "yobante",
    name: "Yobanté Express",
    description: "Intégrez Yobanté pour la livraison",
    logo: "/logos/yobante.svg",
    category: "delivery",
    isConnected: false,
    status: "inactive",
    credentials: {
      apiKey: "",
      partnerId: ""
    },
    settings: {
      autoAssign: true,
      maxDistance: 30
    }
  },
  // Analytics
  {
    id: "google_analytics",
    name: "Google Analytics",
    description: "Suivez le comportement des utilisateurs",
    logo: "/logos/google-analytics.svg",
    category: "analytics",
    isConnected: false,
    status: "inactive",
    credentials: {
      measurementId: "",
      propertyId: ""
    },
    settings: {
      enableEcommerce: true,
      anonymizeIp: true
    }
  },
  // Marketing
  {
    id: "mailchimp",
    name: "Mailchimp",
    description: "Gérez vos campagnes email",
    logo: "/logos/mailchimp.svg",
    category: "marketing",
    isConnected: false,
    status: "inactive",
    credentials: {
      apiKey: "",
      listId: ""
    },
    settings: {
      autoSync: true,
      doubleOptIn: true
    }
  }
];

export default function IntegrationsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/admin/login");
        return;
      }

      const { data, error } = await supabase
        .from("integration_settings")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
      } else {
        // Créer des paramètres par défaut
        const defaultSettings: Partial<IntegrationSettings> = {
          providers: defaultProviders,
          webhookUrl: `${window.location.origin}/api/webhooks/integrations`,
          debugMode: false
        };

        const { error: createError } = await supabase
          .from("integration_settings")
          .insert({
            ...defaultSettings,
            user_id: session.user.id
          });

        if (createError) throw createError;
        setSettings(defaultSettings as IntegrationSettings);
      }
    } catch (error) {
      console.error("Error fetching integration settings:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres d'intégration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const connectProvider = async (provider: IntegrationProvider) => {
    try {
      setIsLoading(true);
      
      // Dans un vrai scénario, ici nous aurions l'OAuth ou l'API d'authentification
      // Pour l'exemple, on simule une connexion réussie
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (!settings) return;

      const updatedProviders = settings.providers.map(p =>
        p.id === provider.id
          ? { ...p, isConnected: true, status: "active" as const }
          : p
      );

      setSettings({
        ...settings,
        providers: updatedProviders
      });

      const { error } = await supabase
        .from("integration_settings")
        .update({
          providers: updatedProviders
        })
        .eq("id", settings.id);

      if (error) throw error;

      toast({
        title: "Connexion réussie",
        description: `${provider.name} a été connecté avec succès`,
        variant: "success",
      });
    } catch (error) {
      console.error(`Error connecting to ${provider.name}:`, error);
      toast({
        title: "Erreur de connexion",
        description: `Impossible de se connecter à ${provider.name}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowConfigDialog(false);
    }
  };

  const disconnectProvider = async (provider: IntegrationProvider) => {
    try {
      setIsLoading(true);
      
      if (!settings) return;

      const updatedProviders = settings.providers.map(p =>
        p.id === provider.id
          ? { ...p, isConnected: false, status: "inactive" as const }
          : p
      );

      setSettings({
        ...settings,
        providers: updatedProviders
      });

      const { error } = await supabase
        .from("integration_settings")
        .update({
          providers: updatedProviders
        })
        .eq("id", settings.id);

      if (error) throw error;

      toast({
        title: "Déconnexion réussie",
        description: `${provider.name} a été déconnecté avec succès`,
        variant: "success",
      });
    } catch (error) {
      console.error(`Error disconnecting ${provider.name}:`, error);
      toast({
        title: "Erreur de déconnexion",
        description: `Impossible de déconnecter ${provider.name}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateProviderSettings = async (
    provider: IntegrationProvider,
    newSettings: typeof provider.settings
  ) => {
    try {
      setIsLoading(true);
      
      if (!settings) return;

      const updatedProviders = settings.providers.map(p =>
        p.id === provider.id
          ? { ...p, settings: newSettings }
          : p
      );

      setSettings({
        ...settings,
        providers: updatedProviders
      });

      const { error } = await supabase
        .from("integration_settings")
        .update({
          providers: updatedProviders
        })
        .eq("id", settings.id);

      if (error) throw error;

      toast({
        title: "Paramètres mis à jour",
        description: `Les paramètres de ${provider.name} ont été mis à jour`,
        variant: "success",
      });
    } catch (error) {
      console.error(`Error updating ${provider.name} settings:`, error);
      toast({
        title: "Erreur",
        description: `Impossible de mettre à jour les paramètres de ${provider.name}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Intégrations
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gérez vos intégrations avec des services externes
          </p>
        </div>
      </div>

      {/* URL de webhook global */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              URL de webhook
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              URL pour recevoir les notifications des services intégrés
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={settings.webhookUrl}
              readOnly
              className="w-96 font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(settings.webhookUrl);
                toast({
                  title: "URL copiée",
                  description: "L'URL du webhook a été copiée dans le presse-papier",
                  variant: "success",
                });
              }}
            >
              <Link className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-sm">Mode test</span>
          </div>
          <Switch
            checked={settings.debugMode}
            onCheckedChange={(checked) => {
              setSettings({
                ...settings,
                debugMode: checked
              });
            }}
          />
        </div>
      </Card>

      {/* Liste des intégrations */}
      <Tabs defaultValue="messaging" className="space-y-6">
        <TabsList>
          <TabsTrigger value="messaging" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Messagerie
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Paiement
          </TabsTrigger>
          <TabsTrigger value="delivery" className="gap-2">
            <Truck className="w-4 h-4" />
            Livraison
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="marketing" className="gap-2">
            <Box className="w-4 h-4" />
            Marketing
          </TabsTrigger>
        </TabsList>

        {["messaging", "payment", "delivery", "analytics", "marketing"].map((category) => (
          <TabsContent key={category} value={category}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {settings.providers
                .filter((provider) => provider.category === category)
                .map((provider) => (
                    <Card key={provider.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            {/* Placeholder pour le logo */}
                            <Box className="w-6 h-6 text-gray-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {provider.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {provider.description}
                            </p>
                            {provider.lastSyncAt && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Dernière synchro : {new Date(provider.lastSyncAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={provider.status === 'active' ? 'success' : 
                                  provider.status === 'error' ? 'destructive' :
                                  provider.status === 'pending' ? 'warning' : 'outline'}
                          className="ml-2"
                        >
                          {provider.status === 'active' ? 'Connecté' :
                           provider.status === 'error' ? 'Erreur' :
                           provider.status === 'pending' ? 'En attente' : 'Non connecté'}
                        </Badge>
                      </div>
  
                      {provider.error && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          {provider.error}
                        </div>
                      )}
  
                      <div className="mt-6 flex items-center gap-2">
                        {provider.isConnected ? (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedProvider(provider);
                                setShowConfigDialog(true);
                              }}
                              className="gap-2"
                            >
                              <Settings2 className="w-4 h-4" />
                              Configurer
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => disconnectProvider(provider)}
                              className="gap-2"
                            >
                              <Lock className="w-4 h-4" />
                              Déconnecter
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => {
                              setSelectedProvider(provider);
                              setShowConfigDialog(true);
                            }}
                            className="gap-2"
                          >
                            <Link className="w-4 h-4" />
                            Connecter
                          </Button>
                        )}
                        {provider.status === 'active' && (
                          <Button variant="ghost" size="icon" className="ml-auto">
                            <RefreshCcw className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
  
        {/* Boîte de dialogue de configuration */}
        <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogContent className="sm:max-w-[600px]">
            {selectedProvider && (
              <>
                <DialogHeader>
                  <DialogTitle>Configuration de {selectedProvider.name}</DialogTitle>
                  <DialogDescription>
                    Configurez les paramètres de connexion et les options
                  </DialogDescription>
                </DialogHeader>
  
                <div className="space-y-6 py-4">
                  {/* Identifiants */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Identifiants</h4>
                    {selectedProvider.credentials && Object.entries(selectedProvider.credentials).map(([key, value]) => (
                      <div key={key}>
                        <Label className="capitalize">
                          {key.replace(/_/g, ' ')}
                        </Label>
                        <Input
                          type="password"
                          value={value}
                          onChange={(e) => {
                            if (!settings) return;
                            const updatedProviders = settings.providers.map(p =>
                              p.id === selectedProvider.id
                                ? {
                                    ...p,
                                    credentials: {
                                      ...p.credentials,
                                      [key]: e.target.value
                                    }
                                  }
                                : p
                            );
                            setSettings({
                              ...settings,
                              providers: updatedProviders
                            });
                          }}
                          className="mt-1"
                        />
                      </div>
                    ))}
                  </div>
  
                  {/* Paramètres */}
                  {selectedProvider.settings && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Paramètres</h4>
                      {Object.entries(selectedProvider.settings).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <Label className="capitalize">
                            {key.replace(/_/g, ' ')}
                          </Label>
                          <Switch
                            checked={value}
                            onCheckedChange={(checked) => {
                              if (!settings) return;
                              const updatedProviders = settings.providers.map(p =>
                                p.id === selectedProvider.id
                                  ? {
                                      ...p,
                                      settings: {
                                        ...p.settings,
                                        [key]: checked
                                      }
                                    }
                                  : p
                              );
                              setSettings({
                                ...settings,
                                providers: updatedProviders
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
  
                  {/* Documentation */}
                  <div className="rounded-lg border p-4 bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Documentation</p>
                        <p className="text-sm text-gray-500">
                          Consultez la documentation pour plus d'informations
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Voir la doc
                      </Button>
                    </div>
                  </div>
                </div>
  
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowConfigDialog(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={() => connectProvider(selectedProvider)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Connexion...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {selectedProvider.isConnected ? 'Mettre à jour' : 'Connecter'}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }