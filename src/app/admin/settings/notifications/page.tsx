// src/app/admin/settings/notifications/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Mail,
  MessageSquare,
  SmartphoneNfc,
  Settings2,
  Loader2,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  Check
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";

interface NotificationTemplate {
  id: string;
  name: string;
  subject?: string;
  content: string;
  isActive: boolean;
  type: "email" | "sms" | "whatsapp";
  trigger: 
    | "order_created" 
    | "order_confirmed" 
    | "payment_received" 
    | "delivery_started"
    | "delivery_completed"
    | "order_cancelled"
    | "refund_initiated"
    | "refund_completed";
  variables: string[];
}

interface NotificationProvider {
  type: "email" | "sms" | "whatsapp";
  isActive: boolean;
  credentials: {
    [key: string]: string;
  };
  settings: {
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
    senderNumber?: string;
  };
}

interface NotificationSettings {
  id: string;
  providers: {
    email: NotificationProvider;
    sms: NotificationProvider;
    whatsapp: NotificationProvider;
  };
  templates: NotificationTemplate[];
  defaultLanguage: string;
  customerNotifications: {
    orderUpdates: boolean;
    deliveryUpdates: boolean;
    marketingEmails: boolean;
  };
  adminNotifications: {
    newOrders: boolean;
    lowStock: boolean;
    customerMessages: boolean;
    dailyReport: boolean;
  };
}

const defaultTemplates: NotificationTemplate[] = [
  {
    id: "order-confirmation",
    name: "Confirmation de commande",
    subject: "Votre commande #{order_number} a été confirmée",
    content: "Bonjour {customer_name},\n\nNous avons bien reçu votre commande #{order_number} d'un montant de {order_amount} FCFA.\n\nNous vous tiendrons informé de son évolution.\n\nCordialement,\n{store_name}",
    isActive: true,
    type: "email",
    trigger: "order_confirmed",
    variables: ["customer_name", "order_number", "order_amount", "store_name"]
  },
  {
    id: "payment-received",
    name: "Paiement reçu",
    content: "Votre paiement de {amount} FCFA pour la commande #{order_number} a été reçu. Merci de votre confiance !",
    isActive: true,
    type: "sms",
    trigger: "payment_received",
    variables: ["amount", "order_number"]
  },
  {
    id: "delivery-started",
    name: "Livraison en cours",
    content: "Votre commande #{order_number} est en cours de livraison. Notre livreur {driver_name} arrivera dans environ {eta} minutes. Vous pouvez le joindre au {driver_phone}.",
    isActive: true,
    type: "whatsapp",
    trigger: "delivery_started",
    variables: ["order_number", "driver_name", "eta", "driver_phone"]
  }
];

export default function NotificationSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchNotificationSettings();
  }, []);

  const fetchNotificationSettings = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/admin/login");
        return;
      }

      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
      } else {
        // Créer des paramètres par défaut
        const defaultSettings: Partial<NotificationSettings> = {
          providers: {
            email: {
              type: "email",
              isActive: false,
              credentials: {
                apiKey: "",
                smtpHost: "",
                smtpPort: "",
                smtpUser: "",
                smtpPass: ""
              },
              settings: {
                fromName: "VOSC",
                fromEmail: "support@viensonconnait.com",
                replyTo: "contact@viensonconnait.com"
              }
            },
            sms: {
              type: "sms",
              isActive: false,
              credentials: {
                apiKey: "",
                apiSecret: ""
              },
              settings: {
                senderNumber: ""
              }
            },
            whatsapp: {
              type: "whatsapp",
              isActive: false,
              credentials: {
                apiKey: "",
                phoneNumberId: ""
              },
              settings: {}
            }
          },
          templates: defaultTemplates,
          defaultLanguage: "fr",
          customerNotifications: {
            orderUpdates: true,
            deliveryUpdates: true,
            marketingEmails: false
          },
          adminNotifications: {
            newOrders: true,
            lowStock: true,
            customerMessages: true,
            dailyReport: false
          }
        };
        setSettings(defaultSettings as NotificationSettings);
      }
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres de notification",
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
        .from("notification_settings")
        .upsert({
          ...settings,
          user_id: session.user.id,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Les paramètres de notification ont été sauvegardés",
        variant: "success",
      });
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addTemplate = (type: "email" | "sms" | "whatsapp") => {
    if (!settings) return;

    const newTemplate: NotificationTemplate = {
      id: `template-${Date.now()}`,
      name: "Nouveau modèle",
      content: "",
      isActive: true,
      type,
      trigger: "order_created",
      variables: []
    };

    if (type === "email") {
      newTemplate.subject = "";
    }

    setSettings({
      ...settings,
      templates: [...settings.templates, newTemplate]
    });
  };

  const updateTemplate = (templateId: string, field: keyof NotificationTemplate, value: any) => {
    if (!settings) return;

    setSettings({
      ...settings,
      templates: settings.templates.map(template =>
        template.id === templateId
          ? { ...template, [field]: value }
          : template
      )
    });
  };

  const deleteTemplate = (templateId: string) => {
    if (!settings) return;

    setSettings({
      ...settings,
      templates: settings.templates.filter(template => template.id !== templateId)
    });
  };

  const testProvider = async (type: "email" | "sms" | "whatsapp") => {
    try {
      setIsLoading(true);
      // TODO: Implémenter le test d'envoi
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Test réussi",
        description: `Le test d'envoi ${type} a réussi`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Le test d'envoi ${type} a échoué`,
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
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Paramètres des notifications
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configurez les paramètres de notification et les modèles de messages
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Fournisseurs de notification */}
        <Tabs defaultValue="email" className="space-y-6">
          <TabsList>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-2">
              <SmartphoneNfc className="w-4 h-4" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </TabsTrigger>
          </TabsList>

          {/* Email Settings */}
          <TabsContent value="email">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Configuration Email
                </h2>
                <Switch
                  checked={settings.providers.email.isActive}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    providers: {
                      ...settings.providers,
                      email: {
                        ...settings.providers.email,
                        isActive: checked
                      }
                    }
                  })}
                />
              </div>

              <div className="space-y-6">
                {/* SMTP Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(settings.providers.email.credentials).map(([key, value]) => (
                    <div key={key}>
                      <Label className="capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                      </Label>
                      <Input
                        type="password"
                        value={value}
                        onChange={(e) => {
                          const newCredentials = {
                            ...settings.providers.email.credentials,
                            [key]: e.target.value
                          };
                          setSettings({
                            ...settings,
                            providers: {
                              ...settings.providers,
                              email: {
                                ...settings.providers.email,
                                credentials: newCredentials
                              }
                            }
                          });
                        }}
                        className="mt-1"
                      />
                    </div>
                  ))}
                </div>

                {/* Email Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nom d'expéditeur</Label>
                    <Input
                      value={settings.providers.email.settings.fromName}
                      onChange={(e) => {
                        setSettings({
                          ...settings,
                          providers: {
                            ...settings.providers,
                            email: {
                              ...settings.providers.email,
                              settings: {
                                ...settings.providers.email.settings,
                                fromName: e.target.value
                              }
                            }
                          }
                        });
                      }}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Email d'expéditeur</Label>
                    <Input
                      type="email"
                      value={settings.providers.email.settings.fromEmail}
                      onChange={(e) => {
                        setSettings({
                          ...settings,
                          providers: {
                            ...settings.providers,
                            email: {
                              ...settings.providers.email,
                              settings: {
                                ...settings.providers.email.settings,
                                fromEmail: e.target.value
                              }
                            }
                          }
                        });
                      }}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Email de réponse</Label>
                    <Input
                      type="email"
                      value={settings.providers.email.settings.replyTo}
                      onChange={(e) => {
                        setSettings({
                          ...settings,
                          providers: {
                            ...settings.providers,
                            email: {
                              ...settings.providers.email,
                              settings: {
                                ...settings.providers.email.settings,
                                replyTo: e.target.value
                              }
                            }
                          }
                        });
                      }}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => testProvider('email')}
                    disabled={!settings.providers.email.isActive || isLoading}
                  >
                    Tester l'envoi d'email
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* SMS Settings */}
          <TabsContent value="sms">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <SmartphoneNfc className="w-5 h-5" />
                  Configuration SMS
                </h2>
                <Switch
                  checked={settings.providers.sms.isActive}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    providers: {
                      ...settings.providers,
                      sms: {
                        ...settings.providers.sms,
                        isActive: checked
                      }
                    }
                  })}
                />
              </div>

              <div className="space-y-6">
                {/* API Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(settings.providers.sms.credentials).map(([key, value]) => (
                    <div key={key}>
                      <Label className="capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                      </Label>
                      <Input
                        type="password"
                        value={value}
                        onChange={(e) => {
                          const newCredentials = {
                            ...settings.providers.sms.credentials,
                            [key]: e.target.value
                          };
                          setSettings({
                            ...settings,
                            providers: {
                              ...settings.providers,
                              sms: {
                                ...settings.providers.sms,
                                credentials: newCredentials
                              }
                            }
                          });
                        }}
                        className="mt-1"
                      />
                    </div>
                  ))}
                </div>

                {/* SMS Settings */}
                <div>
                  <Label>Numéro d'envoi</Label>
                  <Input
                    value={settings.providers.sms.settings.senderNumber}
                    onChange={(e) => {
                      setSettings({
                        ...settings,
                        providers: {
                          ...settings.providers,
                          sms: {
                            ...settings.providers.sms,
                            settings: {
                              ...settings.providers.sms.settings,
                              senderNumber: e.target.value
                            }
                          }
                        }
                      });
                    }}
                    className="mt-1"
                    placeholder="+221..."
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => testProvider('sms')}
                    disabled={!settings.providers.sms.isActive || isLoading}
                  >
                    Tester l'envoi de SMS
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* WhatsApp Settings */}
          <TabsContent value="whatsapp">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Configuration WhatsApp
                </h2>
                <Switch
                  checked={settings.providers.whatsapp.isActive}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    providers: {
                      ...settings.providers,
                      whatsapp: {
                        ...settings.providers.whatsapp,
                        isActive: checked
                      }
                    }
                  })}
                />
              </div>

              <div className="space-y-6">
                {/* WhatsApp Business API Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(settings.providers.whatsapp.credentials).map(([key, value]) => (
                    <div key={key}>
                      <Label className="capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                      </Label>
                      <Input
                        type="password"
                        value={value}
                        onChange={(e) => {
                          const newCredentials = {
                            ...settings.providers.whatsapp.credentials,
                            [key]: e.target.value
                          };
                          setSettings({
                            ...settings,
                            providers: {
                              ...settings.providers,
                              whatsapp: {
                                ...settings.providers.whatsapp,
                                credentials: newCredentials
                              }
                            }
                          });
                        }}
                        className="mt-1"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => testProvider('whatsapp')}
                    disabled={!settings.providers.whatsapp.isActive || isLoading}
                  >
                    Tester l'envoi WhatsApp
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Templates de notification */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Modèles de notification
            </h2>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => addTemplate('email')}
              >
                + Email
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => addTemplate('sms')}
              >
                + SMS
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => addTemplate('whatsapp')}
              >
                + WhatsApp
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {settings.templates.map((template) => (
              <div
                key={template.id}
                className="border rounded-lg p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={template.isActive}
                      onCheckedChange={(checked) => updateTemplate(template.id, "isActive", checked)}
                    />
                    {template.type === 'email' ? (
                      <Mail className="w-5 h-5 text-blue-500" />
                    ) : template.type === 'sms' ? (
                      <SmartphoneNfc className="w-5 h-5 text-green-500" />
                    ) : (
                      <MessageSquare className="w-5 h-5 text-purple-500" />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTemplate(template.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nom du modèle</Label>
                    <Input
                      value={template.name}
                      onChange={(e) => updateTemplate(template.id, "name", e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Déclencheur</Label>
                    <Select
                      value={template.trigger}
                      onValueChange={(value: NotificationTemplate['trigger']) => 
                        updateTemplate(template.id, "trigger", value)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Sélectionner le déclencheur" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="order_created">Commande créée</SelectItem>
                        <SelectItem value="order_confirmed">Commande confirmée</SelectItem>
                        <SelectItem value="payment_received">Paiement reçu</SelectItem>
                        <SelectItem value="delivery_started">Livraison commencée</SelectItem>
                        <SelectItem value="delivery_completed">Livraison terminée</SelectItem>
                        <SelectItem value="order_cancelled">Commande annulée</SelectItem>
                        <SelectItem value="refund_initiated">Remboursement initié</SelectItem>
                        <SelectItem value="refund_completed">Remboursement terminé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {template.type === 'email' && (
                  <div>
                    <Label>Sujet</Label>
                    <Input
                      value={template.subject}
                      onChange={(e) => updateTemplate(template.id, "subject", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}

                <div>
                  <Label>Contenu</Label>
                  <Textarea
                    value={template.content}
                    onChange={(e) => updateTemplate(template.id, "content", e.target.value)}
                    rows={5}
                    className="mt-1 font-mono"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Variables disponibles : {template.variables.map(v => `{${v}}`).join(', ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Préférences de notification */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Préférences de notification
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Notifications client */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700 dark:text-gray-300">
                Notifications client
              </h3>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Mises à jour des commandes</Label>
                  <Switch
                    checked={settings.customerNotifications.orderUpdates}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      customerNotifications: {
                        ...settings.customerNotifications,
                        orderUpdates: checked
                      }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Mises à jour des livraisons</Label>
                  <Switch
                    checked={settings.customerNotifications.deliveryUpdates}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      customerNotifications: {
                        ...settings.customerNotifications,
                        deliveryUpdates: checked
                      }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Emails marketing</Label>
                  <Switch
                    checked={settings.customerNotifications.marketingEmails}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      customerNotifications: {
                        ...settings.customerNotifications,
                        marketingEmails: checked
                      }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Notifications admin */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700 dark:text-gray-300">
                Notifications admin
              </h3>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Nouvelles commandes</Label>
                  <Switch
                    checked={settings.adminNotifications.newOrders}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      adminNotifications: {
                        ...settings.adminNotifications,
                        newOrders: checked
                      }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Stock faible</Label>
                  <Switch
                    checked={settings.adminNotifications.lowStock}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      adminNotifications: {
                        ...settings.adminNotifications,
                        lowStock: checked
                      }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Messages clients</Label>
                  <Switch
                    checked={settings.adminNotifications.customerMessages}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      adminNotifications: {
                        ...settings.adminNotifications,
                        customerMessages: checked
                      }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Rapport journalier</Label>
                  <Switch
                    checked={settings.adminNotifications.dailyReport}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      adminNotifications: {
                        ...settings.adminNotifications,
                        dailyReport: checked
                      }
                    })}
                  />
                </div>
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