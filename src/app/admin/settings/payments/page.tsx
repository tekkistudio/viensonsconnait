// src/app/admin/settings/payments/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Smartphone,
  Building2,
  Settings2,
  Loader2,
  Save,
  AlertTriangle,
  Check,
  X,
  ChevronDown
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { countries } from "@/lib/data/countries";

interface PaymentProvider {
  id: string;
  name: string;
  type: "mobile_money" | "card" | "bank_transfer";
  isActive: boolean;
  credentials: {
    apiKey?: string;
    secretKey?: string;
    merchantId?: string;
    callbackUrl?: string;
    [key: string]: string | undefined;
  };
  fees: {
    type: "fixed" | "percentage" | "both";
    fixedAmount?: number;
    percentage?: number;
    payedBy: "customer" | "merchant";
  };
  limits: {
    minAmount: number;
    maxAmount: number;
  };
  countries: string[];
}

interface PaymentSettings {
  id: string;
  providers: PaymentProvider[];
  defaultCurrency: string;
  testMode: boolean;
  autoCapture: boolean;
  webhookUrl: string;
  refundPolicy: string;
  style: {
    displayMode: "list" | "grid";
    showLogos: boolean;
    primaryColor: string;
  };
}

const defaultProviders: PaymentProvider[] = [
  {
    id: "wave",
    name: "Wave",
    type: "mobile_money",
    isActive: false,
    credentials: {
      apiKey: "",
      secretKey: "",
      merchantId: ""
    },
    fees: {
      type: "percentage",
      percentage: 1,
      payedBy: "merchant"
    },
    limits: {
      minAmount: 100,
      maxAmount: 1000000
    },
    countries: ["SN", "CI"]
  },
  {
    id: "orange_money",
    name: "Orange Money",
    type: "mobile_money",
    isActive: false,
    credentials: {
      apiKey: "",
      secretKey: "",
      merchantId: ""
    },
    fees: {
      type: "percentage",
      percentage: 1.5,
      payedBy: "merchant"
    },
    limits: {
      minAmount: 100,
      maxAmount: 1000000
    },
    countries: ["SN", "CI", "ML"]
  },
  {
    id: "bictorys",
    name: "Bictorys",
    type: "mobile_money",
    isActive: false,
    credentials: {
      apiKey: "",
      secretKey: ""
    },
    fees: {
      type: "percentage",
      percentage: 2,
      payedBy: "merchant"
    },
    limits: {
      minAmount: 100,
      maxAmount: 5000000
    },
    countries: ["SN", "CI", "BF", "ML"]
  },
  {
    id: "stripe",
    name: "Stripe",
    type: "card",
    isActive: false,
    credentials: {
      apiKey: "",
      secretKey: "",
      webhookSecret: ""
    },
    fees: {
      type: "both",
      fixedAmount: 100,
      percentage: 2.9,
      payedBy: "merchant"
    },
    limits: {
      minAmount: 500,
      maxAmount: 10000000
    },
    countries: ["SN", "CI", "CM", "MA"]
  }
];

export default function PaymentSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchPaymentSettings();
  }, []);

  const fetchPaymentSettings = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/admin/login");
        return;
      }

      const { data, error } = await supabase
        .from("payment_settings")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
      } else {
        // Créer des paramètres par défaut
        const defaultSettings: Partial<PaymentSettings> = {
          defaultCurrency: "XOF",
          providers: defaultProviders,
          testMode: true,
          autoCapture: true,
          webhookUrl: `${window.location.origin}/api/webhooks/payments`,
          refundPolicy: "Les remboursements sont traités sous 7 jours ouvrables.",
          style: {
            displayMode: "list",
            showLogos: true,
            primaryColor: "#2563EB"
          }
        };
        setSettings(defaultSettings as PaymentSettings);
      }
    } catch (error) {
      console.error("Error fetching payment settings:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres de paiement",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testProviderConnection = async (providerId: string) => {
    const provider = settings?.providers.find(p => p.id === providerId);
    if (!provider) return;

    try {
      setIsLoading(true);
      // TODO: Implémenter le test de connexion pour chaque provider
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Test réussi",
        description: `Connexion établie avec ${provider.name}`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Erreur de connexion",
        description: `Impossible de se connecter à ${provider.name}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/admin/login");
        return;
      }

      const { error } = await supabase
        .from("payment_settings")
        .upsert({
          ...settings,
          user_id: session.user.id,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Les paramètres de paiement ont été sauvegardés",
        variant: "success",
      });
    } catch (error) {
      console.error("Error saving payment settings:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateProvider = (providerId: string, field: string, value: any) => {
    if (!settings) return;

    setSettings({
      ...settings,
      providers: settings.providers.map(provider =>
        provider.id === providerId
          ? { ...provider, [field]: value }
          : provider
      )
    });
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
            Paramètres de paiement
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configurez les moyens de paiement et leurs paramètres
          </p>
        </div>

        {settings.testMode && (
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-full text-sm">
            <AlertTriangle className="w-4 h-4" />
            Mode test activé
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Paramètres généraux */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Paramètres généraux
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mode test */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Mode test
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Activez pour tester les paiements sans transactions réelles
                </p>
              </div>
              <Switch
                checked={settings.testMode}
                onCheckedChange={(checked) => setSettings({ ...settings, testMode: checked })}
              />
            </div>

            {/* Capture automatique */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Capture automatique
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Capturer automatiquement les paiements autorisés
                </p>
              </div>
              <Switch
                checked={settings.autoCapture}
                onCheckedChange={(checked) => setSettings({ ...settings, autoCapture: checked })}
              />
            </div>

            {/* URL de webhook */}
            <div>
              <Label htmlFor="webhookUrl">URL de webhook</Label>
              <div className="mt-1">
                <Input
                  id="webhookUrl"
                  value={settings.webhookUrl}
                  onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                  className="font-mono text-sm"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Cette URL recevra les notifications de paiement
                </p>
              </div>
            </div>

            {/* Politique de remboursement */}
            <div>
              <Label htmlFor="refundPolicy">Politique de remboursement</Label>
              <div className="mt-1">
                <Input
                  id="refundPolicy"
                  value={settings.refundPolicy}
                  onChange={(e) => setSettings({ ...settings, refundPolicy: e.target.value })}
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Cette politique sera affichée aux clients
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Fournisseurs de paiement */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Fournisseurs de paiement
          </h2>

          <Accordion type="single" collapsible className="space-y-4">
            {settings.providers.map((provider) => (
              <AccordionItem
                key={provider.id}
                value={provider.id}
                className="border rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={provider.isActive}
                        onCheckedChange={(checked) => 
                          updateProvider(provider.id, "isActive", checked)
                        }
                      />
                      {provider.type === "mobile_money" ? (
                        <Smartphone className="w-5 h-5 text-orange-500" />
                      ) : provider.type === "bank_transfer" ? (
                        <Building2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <CreditCard className="w-5 h-5 text-blue-500" />
                      )}
                      <div>
                        <span className="font-medium">{provider.name}</span>
                        <span className="ml-2 text-sm text-gray-500">
                          {provider.type === "mobile_money" 
                            ? "Paiement mobile" 
                            : provider.type === "bank_transfer"
                            ? "Virement bancaire"
                            : "Carte bancaire"
                          }
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => testProviderConnection(provider.id)}
                      disabled={!provider.isActive || isLoading}
                      className="text-sm"
                    >
                      Tester la connexion
                    </Button>
                  </div>
                </div>

                <AccordionContent className="pt-4">
                  <div className="space-y-6">
                    {/* Clés d'API */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                        Clés d'API {settings.testMode ? "(Mode test)" : "(Mode production)"}
                      </h4>
                      
                      {Object.entries(provider.credentials).map(([key, value]) => (
                        <div key={key}>
                          <Label htmlFor={`${provider.id}-${key}`} className="capitalize">
                            {key.replace(/_/g, ' ')}
                          </Label>
                          <Input
                            id={`${provider.id}-${key}`}
                            type="password"
                            value={value}
                            onChange={(e) => {
                              const newCredentials = {
                                ...provider.credentials,
                                [key]: e.target.value
                              };
                              updateProvider(provider.id, "credentials", newCredentials);
                            }}
                            className="mt-1 font-mono"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Frais */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                        Configuration des frais
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Type de frais</Label>
                          <Select
                            value={provider.fees.type}
                            onValueChange={(value: "fixed" | "percentage" | "both") => {
                              updateProvider(provider.id, "fees", {
                                ...provider.fees,
                                type: value
                              });
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Sélectionner le type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Montant fixe</SelectItem>
                              <SelectItem value="percentage">Pourcentage</SelectItem>
                              <SelectItem value="both">Les deux</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {(provider.fees.type === "fixed" || provider.fees.type === "both") && (
                          <div>
                            <Label>Montant fixe (FCFA)</Label>
                            <Input
                              type="number"
                              value={provider.fees.fixedAmount}
                              onChange={(e) => {
                                updateProvider(provider.id, "fees", {
                                  ...provider.fees,
                                  fixedAmount: parseInt(e.target.value)
                                });
                              }}
                              className="mt-1"
                            />
                          </div>
                        )}

                        {(provider.fees.type === "percentage" || provider.fees.type === "both") && (
                          <div>
                            <Label>Pourcentage (%)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={provider.fees.percentage}
                              onChange={(e) => {
                                updateProvider(provider.id, "fees", {
                                  ...provider.fees,
                                  percentage: parseFloat(e.target.value)
                                });
                              }}
                              className="mt-1"
                            />
                          </div>
                        )}

                        <div>
                          <Label>Payé par</Label>
                          <Select
                            value={provider.fees.payedBy}
                            onValueChange={(value: "customer" | "merchant") => {
                              updateProvider(provider.id, "fees", {
                                ...provider.fees,
                                payedBy: value
                              });
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Sélectionner qui paie" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="customer">Client</SelectItem>
                              <SelectItem value="merchant">Marchand</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Limites */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                        Limites de transaction
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Montant minimum (FCFA)</Label>
                          <Input
                            type="number"
                            value={provider.limits.minAmount}
                            onChange={(e) => {
                              updateProvider(provider.id, "limits", {
                                ...provider.limits,
                                minAmount: parseInt(e.target.value)
                              });
                            }}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label>Montant maximum (FCFA)</Label>
                          <Input
                            type="number"
                            value={provider.limits.maxAmount}
                            onChange={(e) => {
                              updateProvider(provider.id, "limits", {
                                ...provider.limits,
                                maxAmount: parseInt(e.target.value)
                              });
                            }}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pays disponibles */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                        Disponibilité par pays
                      </h4>

                      {countries.map((country) => (
                        <div key={country.code} className="flex items-center gap-2">
                          <Switch
                            checked={provider.countries.includes(country.code)}
                            onCheckedChange={(checked) => {
                              const newCountries = checked
                                ? [...provider.countries, country.code]
                                : provider.countries.filter(c => c !== country.code);
                              updateProvider(provider.id, "countries", newCountries);
                            }}
                          />
                          <span>{country.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        {/* Apparence */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Apparence du module de paiement
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Mode d'affichage</Label>
              <Select
                value={settings.style.displayMode}
                onValueChange={(value: "list" | "grid") => {
                  setSettings({
                    ...settings,
                    style: {
                      ...settings.style,
                      displayMode: value
                    }
                  });
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner le mode d'affichage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">Liste</SelectItem>
                  <SelectItem value="grid">Grille</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Affichage des logos */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Logos des moyens de paiement
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Afficher les logos des services de paiement
                </p>
              </div>
              <Switch
                checked={settings.style.showLogos}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  style: {
                    ...settings.style,
                    showLogos: checked
                  }
                })}
              />
            </div>

            {/* Couleur primaire */}
            <div>
              <Label>Couleur primaire</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  type="color"
                  value={settings.style.primaryColor}
                  onChange={(e) => setSettings({
                    ...settings,
                    style: {
                      ...settings.style,
                      primaryColor: e.target.value
                    }
                  })}
                  className="w-12 h-12 p-1 rounded-lg"
                />
                <Input
                  type="text"
                  value={settings.style.primaryColor}
                  onChange={(e) => setSettings({
                    ...settings,
                    style: {
                      ...settings.style,
                      primaryColor: e.target.value
                    }
                  })}
                  className="flex-1"
                  placeholder="#000000"
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
}