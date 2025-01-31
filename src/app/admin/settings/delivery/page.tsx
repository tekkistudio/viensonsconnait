// src/app/admin/settings/delivery/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck,
  MapPin,
  Clock,
  Settings2,
  Loader2,
  Save,
  Plus,
  Trash2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ZoneCard } from '@/components/delivery/ZoneCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';

interface DeliveryZone {
  id: string;
  name: string;
  cities: string[];
  baseFee: number;
  additionalFee: number;
  estimatedTime: {
    min: number;
    max: number;
    unit: 'minutes' | 'hours' | 'days';
  };
  isActive: boolean;
}

interface DeliverySettings {
  id: string;
  user_id: string;
  zones: DeliveryZone[];
  partners: {
    id: string;
    name: string;
    type: string;
    zones: string[];
    isActive: boolean;
  }[];
  free_delivery_rules: {
    id: string;
    condition: {
      type: string;
      value: number | string | string[];
    };
    isActive: boolean;
  }[];
  default_settings: {
    allowMultipleCarriers: boolean;
    requireSignature: boolean;
    allowContactlessDelivery: boolean;
    allowScheduledDelivery: boolean;
    allowExpressDelivery: boolean;
    expressDeliveryFee: number;
    maxDeliveryAttempts: number;
    autoAssignDriver: boolean;
  };
  created_at: string;
  updated_at: string;
}

const defaultSettings: DeliverySettings = {
  id: crypto.randomUUID(),
  user_id: '',
  zones: [{
    id: crypto.randomUUID(),
    name: "Dakar Centre",
    cities: ["Plateau", "Médina", "Fann", "Point E"],
    baseFee: 1500,
    additionalFee: 500,
    estimatedTime: {
      min: 30,
      max: 60,
      unit: "minutes"
    },
    isActive: true
  }],
  partners: [],
  free_delivery_rules: [],
  default_settings: {
    allowMultipleCarriers: false,
    requireSignature: true,
    allowContactlessDelivery: true,
    allowScheduledDelivery: false,
    allowExpressDelivery: false,
    expressDeliveryFee: 3000,
    maxDeliveryAttempts: 3,
    autoAssignDriver: true
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const DeliverySettingsPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<DeliverySettings>(defaultSettings);
  const { toast } = useToast();
  const router = useRouter();

  const handleZoneUpdate = (updatedZone: DeliveryZone) => {
    const updatedSettings = {
      ...settings,
      zones: settings.zones.map(zone =>
        zone.id === updatedZone.id ? updatedZone : zone
      )
    };
    setSettings(updatedSettings);
  };

  const handleZoneDelete = (zoneId: string) => {
    const updatedSettings = {
      ...settings,
      zones: settings.zones.filter(zone => zone.id !== zoneId)
    };
    setSettings(updatedSettings);
  };

  useEffect(() => {
    fetchDeliverySettings();
  }, []);

  // Modification de la fonction fetchDeliverySettings
const fetchDeliverySettings = async () => {
  try {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push("/auth/login");
      return;
    }

    const { data, error } = await supabase
      .from('delivery_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    console.log('Données récupérées:', data);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      // Création des paramètres par défaut avec une zone
      const defaultZone = {
        id: crypto.randomUUID(),
        name: "Dakar",
        cities: ["Dakar"],
        baseFee: 0,
        additionalFee: 0,
        estimatedTime: {
          min: 1,
          max: 2,
          unit: "days"
        },
        isActive: true
      };

      const newSettings = {
        user_id: session.user.id,
        zones: [defaultZone],
        partners: [],
        free_delivery_rules: [],
        default_settings: {
          allowMultipleCarriers: false,
          requireSignature: true,
          allowContactlessDelivery: true,
          allowScheduledDelivery: false,
          allowExpressDelivery: false,
          expressDeliveryFee: 3000,
          maxDeliveryAttempts: 3,
          autoAssignDriver: true
        }
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('delivery_settings')
        .insert([newSettings])
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('Paramètres créés:', insertedData);
      setSettings(insertedData);
    } else {
      // S'assurer que les zones existent et sont dans le bon format
      const updatedData = {
        ...data,
        zones: Array.isArray(data.zones) ? data.zones : [],
        partners: Array.isArray(data.partners) ? data.partners : [],
        free_delivery_rules: Array.isArray(data.free_delivery_rules) ? data.free_delivery_rules : []
      };

      console.log('Paramètres chargés:', updatedData);
      setSettings(updatedData);
    }
  } catch (error) {
    console.error("Erreur lors du chargement des paramètres:", error);
    toast({
      title: "Erreur",
      description: "Impossible de charger les paramètres de livraison",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

  const addZone = () => {
    const newZone: DeliveryZone = {
      id: crypto.randomUUID(),
      name: "Nouvelle zone",
      cities: [],
      baseFee: 0,
      additionalFee: 0,
      estimatedTime: {
        min: 1,
        max: 2,
        unit: "hours"
      },
      isActive: true
    };
  
    // Créer une nouvelle copie des paramètres
    const updatedSettings = {
      ...settings,
      zones: [...(settings.zones || []), newZone]
    };
  
    // Mettre à jour l'état local
    setSettings(updatedSettings);
  
    console.log('Adding new zone:', newZone);
    console.log('Updated settings:', updatedSettings);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/auth/login");
        return;
      }
  
      // S'assurer que l'ID utilisateur est défini
      if (!settings.user_id) {
        settings.user_id = session.user.id;
      }
  
      // Vérifier et nettoyer les données avant la sauvegarde
      const cleanedSettings = {
        ...settings,
        zones: settings.zones.map((zone) => ({
          ...zone,
          cities: Array.isArray(zone.cities) 
            ? zone.cities 
            : typeof zone.cities === 'string'
              ? String(zone.cities).split(',').map((city: string) => city.trim())
              : [],
          baseFee: Number(zone.baseFee) || 0,
          additionalFee: Number(zone.additionalFee) || 0,
          estimatedTime: {
            min: Number(zone.estimatedTime?.min) || 1,
            max: Number(zone.estimatedTime?.max) || 2,
            unit: zone.estimatedTime?.unit || 'days'
          },
          isActive: Boolean(zone.isActive)
        })),
        updated_at: new Date().toISOString()
      };
  
      // Vérifier si l'enregistrement existe déjà
      const { data: existingSettings } = await supabase
        .from('delivery_settings')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();
  
      let result;
      if (existingSettings) {
        // Mise à jour
        result = await supabase
          .from('delivery_settings')
          .update(cleanedSettings)
          .eq('user_id', session.user.id)
          .select()
          .single();
      } else {
        // Insertion
        result = await supabase
          .from('delivery_settings')
          .insert([cleanedSettings])
          .select()
          .single();
      }
  
      if (result.error) throw result.error;
  
      setSettings(result.data);
      toast({
        title: "Succès",
        description: "Les paramètres de livraison ont été sauvegardés",
      });
  
      // Rafraîchir les données
      await fetchDeliverySettings();
  
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const debugZones = () => {
    console.log('Current zones in settings:', settings.zones);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Paramètres de livraison
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configurez les zones et les options de livraison
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Zones de livraison */}
<Card className="p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 transition-colors">
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-2">
      <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Zones de livraison
      </h2>
    </div>
    <Button
      type="button"
      variant="outline"
      onClick={addZone}
      className="gap-2 border-gray-200 dark:border-gray-800"
    >
      <Plus className="w-4 h-4" />
      Ajouter une zone
    </Button>
  </div>

  <div className="space-y-6">
    {!settings.zones || settings.zones.length === 0 ? (
      <div className="text-center p-4 border dark:border-gray-800 rounded-lg text-gray-500 dark:text-gray-400">
        Aucune zone de livraison configurée
      </div>
    ) : (
      settings.zones.map((zone) => (
        <ZoneCard
          key={zone.id}
          zone={zone}
          onUpdate={handleZoneUpdate}
          onDelete={handleZoneDelete}
        />
      ))
    )}
  </div>
</Card>

        {/* Paramètres par défaut */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Settings2 className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Paramètres par défaut
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Options générales */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  Permettre plusieurs transporteurs
                  <span className="text-sm text-gray-500">(entreprises/livreurs)</span>
                </Label>
                <Switch
                  checked={settings.default_settings.allowMultipleCarriers}
                  onCheckedChange={(checked) => {
                    setSettings({
                      ...settings,
                      default_settings: {
                        ...settings.default_settings,
                        allowMultipleCarriers: checked
                      }
                    });
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  Signature requise
                  <span className="text-sm text-gray-500">(à la livraison)</span>
                </Label>
                <Switch
                  checked={settings.default_settings.requireSignature}
                  onCheckedChange={(checked) => {
                    setSettings({
                      ...settings,
                      default_settings: {
                        ...settings.default_settings,
                        requireSignature: checked
                      }
                    });
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  Livraison sans contact
                  <span className="text-sm text-gray-500">(dépôt sécurisé)</span>
                </Label>
                <Switch
                  checked={settings.default_settings.allowContactlessDelivery}
                  onCheckedChange={(checked) => {
                    setSettings({
                      ...settings,
                      default_settings: {
                        ...settings.default_settings,
                        allowContactlessDelivery: checked
                      }
                    });
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  Livraison programmée
                  <span className="text-sm text-gray-500">(choix du créneau)</span>
                </Label>
                <Switch
                  checked={settings.default_settings.allowScheduledDelivery}
                  onCheckedChange={(checked) => {
                    setSettings({
                      ...settings,
                      default_settings: {
                        ...settings.default_settings,
                        allowScheduledDelivery: checked
                      }
                    });
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  Attribution automatique
                  <span className="text-sm text-gray-500">(livreurs)</span>
                </Label>
                <Switch
                  checked={settings.default_settings.autoAssignDriver}
                  onCheckedChange={(checked) => {
                    setSettings({
                      ...settings,
                      default_settings: {
                        ...settings.default_settings,
                        autoAssignDriver: checked
                      }
                    });
                  }}
                />
              </div>
            </div>

            {/* Options avancées */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  Livraison express
                  <span className="text-sm text-gray-500">(surcoût)</span>
                </Label>
                <Switch
                  checked={settings.default_settings.allowExpressDelivery}
                  onCheckedChange={(checked) => {
                    setSettings({
                      ...settings,
                      default_settings: {
                        ...settings.default_settings,
                        allowExpressDelivery: checked
                      }
                    });
                  }}
                />
              </div>

              {settings.default_settings.allowExpressDelivery && (
                <div>
                  <Label>Frais de livraison express (FCFA)</Label>
                  <Input
                    type="number"
                    value={settings.default_settings.expressDeliveryFee}
                    onChange={(e) => {
                      setSettings({
                        ...settings,
                        default_settings: {
                          ...settings.default_settings,
                          expressDeliveryFee: parseInt(e.target.value)
                        }
                      });
                    }}
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label className="flex items-center gap-2">
                  Nombre maximum de tentatives
                  <span className="text-sm text-gray-500">(échec de livraison)</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={settings.default_settings.maxDeliveryAttempts}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      default_settings: {
                        ...settings.default_settings,
                        maxDeliveryAttempts: parseInt(e.target.value)
                      }
                    });
                  }}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Bouton de sauvegarde */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sauvegarde en cours...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Sauvegarder les modifications
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DeliverySettingsPage;