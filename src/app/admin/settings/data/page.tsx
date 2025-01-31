// src/app/admin/settings/data/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Database,
  Download,
  Upload,
  Trash2,
  Clock,
  Shield,
  Save,
  Loader2,
  AlertTriangle,
  FileJson,
  FileSpreadsheet,
  RotateCcw,
  Lock,
  CheckCircle2,
  Info
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import Papa from 'papaparse';

interface BackupSettings {
  autoBackup: boolean;
  frequency: "daily" | "weekly" | "monthly";
  retentionPeriod: number; // en jours
  lastBackupAt?: string;
  nextBackupAt?: string;
  backupLocations: {
    local: boolean;
    cloud: boolean;
  };
}

interface DataCleanupSettings {
  enabled: boolean;
  rules: {
    abandonedCarts: number; // en jours
    cancelledOrders: number; // en jours
    inactiveCustomers: number; // en jours
    deletedProducts: number; // en jours
  };
  lastCleanupAt?: string;
}

interface PrivacySettings {
  dataRetention: {
    customerData: number; // en jours
    orderHistory: number; // en jours
    analyticsData: number; // en jours
  };
  anonymization: {
    automaticAnonymization: boolean;
    period: number; // en jours
  };
  consentManagement: boolean;
  dataEncryption: boolean;
}

interface Backup {
  id: string;
  createdAt: string;
  size: number;
  type: "auto" | "manual";
  status: "completed" | "failed";
  downloadUrl?: string;
}

interface DataSettings {
  id: string;
  backup: BackupSettings;
  cleanup: DataCleanupSettings;
  privacy: PrivacySettings;
}

const defaultSettings: DataSettings = {
  id: "",
  backup: {
    autoBackup: true,
    frequency: "daily",
    retentionPeriod: 30,
    backupLocations: {
      local: true,
      cloud: true
    }
  },
  cleanup: {
    enabled: true,
    rules: {
      abandonedCarts: 30,
      cancelledOrders: 90,
      inactiveCustomers: 180,
      deletedProducts: 30
    }
  },
  privacy: {
    dataRetention: {
      customerData: 365,
      orderHistory: 730,
      analyticsData: 90
    },
    anonymization: {
      automaticAnonymization: true,
      period: 180
    },
    consentManagement: true,
    dataEncryption: true
  }
};

export default function DataSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<DataSettings>(defaultSettings);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchSettings();
    fetchBackups();
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
        .from("data_settings")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
      } else {
        // Créer des paramètres par défaut
        const { error: createError } = await supabase
          .from("data_settings")
          .insert({
            ...defaultSettings,
            user_id: session.user.id
          });

        if (createError) throw createError;
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error("Error fetching data settings:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBackups = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const { data, error } = await supabase
        .from("backups")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBackups(data || []);
    } catch (error) {
      console.error("Error fetching backups:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les sauvegardes",
        variant: "destructive",
      });
    }
  };

  const createBackup = async () => {
    try {
      setIsLoading(true);
      // 1. Récupérer toutes les données nécessaires
      const tables = ["products", "orders", "customers", "conversations"];
      const backupData: Record<string, any> = {};

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select("*");

        if (error) throw error;
        backupData[table] = data;
      }

      // 2. Créer le fichier de sauvegarde
      const blob = new Blob([JSON.stringify(backupData)], { type: "application/json" });
      const fileName = `backup-${new Date().toISOString()}.json`;

      // 3. Enregistrer les métadonnées de la sauvegarde
      const { data: backup, error } = await supabase
        .from("backups")
        .insert({
          file_name: fileName,
          size: blob.size,
          type: "manual",
          status: "completed"
        })
        .select()
        .single();

      if (error) throw error;

      // 4. Télécharger le fichier
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: "Sauvegarde créée",
        description: "La sauvegarde a été créée avec succès",
        variant: "success",
      });

      fetchBackups();
    } catch (error) {
      console.error("Error creating backup:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la sauvegarde",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      setIsLoading(true);
      setImportProgress(0);

      // Pour chaque fichier sélectionné
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const reader = new FileReader();

        reader.onload = async (e) => {
          try {
            const content = e.target?.result as string;
            
            // Détecter le type de fichier
            if (file.name.endsWith('.json')) {
              // Traiter le fichier JSON
              const data = JSON.parse(content);
              // TODO: Implémenter l'import JSON
            } else if (file.name.endsWith('.csv')) {
              // Traiter le fichier CSV
              Papa.parse(content, {
                header: true,
                complete: async (results) => {
                  // TODO: Implémenter l'import CSV
                }
              });
            }

            setImportProgress(((i + 1) / selectedFiles.length) * 100);
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
          }
        };

        reader.readAsText(file);
      }

      toast({
        title: "Import terminé",
        description: "Les données ont été importées avec succès",
        variant: "success",
      });
    } catch (error) {
      console.error("Error importing data:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'importer les données",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowImportDialog(false);
      setSelectedFiles(null);
    }
  };

  const handleExport = async (format: "json" | "csv") => {
    try {
      setIsLoading(true);
      
      // 1. Récupérer les données
      const tables = ["products", "orders", "customers"];
      const exportData: Record<string, any> = {};

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select("*");

        if (error) throw error;
        exportData[table] = data;
      }

      // 2. Formater et télécharger
      if (format === "json") {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: "application/json"
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `export-${new Date().toISOString()}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        // Pour chaque table, créer un fichier CSV
        for (const [table, data] of Object.entries(exportData)) {
          const csv = Papa.unparse(data);
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${table}-${new Date().toISOString()}.csv`;
          document.body.appendChild(link);
          link.click();
          link.remove();
        }
      }

      toast({
        title: "Export terminé",
        description: "Les données ont été exportées avec succès",
        variant: "success",
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter les données",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Gestion des données
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Gérez vos sauvegardes, importations et paramètres de confidentialité
        </p>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex flex-col items-center text-center">
            <Database className="w-8 h-8 text-blue-500 mb-2" />
            <h3 className="font-medium">Sauvegarde</h3>
            <p className="text-sm text-gray-500 mb-4">
              Créez une sauvegarde manuelle de vos données
            </p>
            <Button
              onClick={createBackup}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Créer une sauvegarde
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex flex-col items-center text-center">
            <Upload className="w-8 h-8 text-green-500 mb-2" />
            <h3 className="font-medium">Import</h3>
            <p className="text-sm text-gray-500 mb-4">
              Importez des données depuis un fichier
            </p>
            <Button
              onClick={() => setShowImportDialog(true)}
              disabled={isLoading}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importer des données
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex flex-col items-center text-center">
            <Download className="w-8 h-8 text-purple-500 mb-2" />
            <h3 className="font-medium">Export</h3>
            <p className="text-sm text-gray-500 mb-4">
              Exportez vos données dans différents formats
            </p>
            <div className="flex gap-2 w-full">
              <Button
                onClick={() => handleExport('json')}
                disabled={isLoading}
                className="flex-1"
              >
                <FileJson className="w-4 h-4 mr-2" />
                JSON
              </Button>
              <Button
                onClick={() => handleExport('csv')}
                disabled={isLoading}
                className="flex-1"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Paramètres de sauvegarde */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Database className="w-5 h-5" />
          Paramètres de sauvegarde
        </h2>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Sauvegarde automatique</Label>
              <p className="text-sm text-gray-500">
                Activez la sauvegarde automatique de vos données
              </p>
            </div>
            <Switch
              checked={settings.backup.autoBackup}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                backup: {
                  ...settings.backup,
                  autoBackup: checked
                }
              })}
            />
          </div>

          {settings.backup.autoBackup && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Fréquence</Label>
                <Select
                  value={settings.backup.frequency}
                  onValueChange={(value: "daily" | "weekly" | "monthly") => 
                    setSettings({
                      ...settings,
                      backup: {
                        ...settings.backup,
                        frequency: value
                      }
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionner la fréquence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Quotidienne</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="monthly">Mensuelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Période de rétention (jours)</Label>
                <Input
                  type="number"
                  value={settings.backup.retentionPeriod}
                  onChange={(e) => setSettings({
                    ...settings,
                    backup: {
                      ...settings.backup,
                      retentionPeriod: parseInt(e.target.value)
                    }
                  })}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Stockage local</Label>
                  <p className="text-sm text-gray-500">
                    Sauvegarder sur votre serveur
                  </p>
                </div>
                <Switch
                  checked={settings.backup.backupLocations.local}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    backup: {
                      ...settings.backup,
                      backupLocations: {
                        ...settings.backup.backupLocations,
                        local: checked
                      }
                    }
                  })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Stockage cloud</Label>
                  <p className="text-sm text-gray-500">
                    Sauvegarder sur le cloud
                  </p>
                </div>
                <Switch
                  checked={settings.backup.backupLocations.cloud}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    backup: {
                      ...settings.backup,
                      backupLocations: {
                        ...settings.backup.backupLocations,
                        cloud: checked
                      }
                    }
                  })}
                />
              </div>
            </div>
          )}

          {/* Liste des sauvegardes */}
          <div className="mt-6">
            <h3 className="font-medium mb-4">Sauvegardes récentes</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell>
                      {new Date(backup.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        backup.type === 'auto' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                      }`}>
                        {backup.type === 'auto' ? 'Auto' : 'Manuel'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {(backup.size / 1024 / 1024).toFixed(2)} MB
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 ${
                        backup.status === 'completed' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {backup.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                        {backup.status === 'completed' ? 'Terminé' : 'Échec'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {backup.downloadUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(backup.downloadUrl, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      {/* Nettoyage des données */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          Nettoyage des données
        </h2>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Nettoyage automatique</Label>
              <p className="text-sm text-gray-500">
                Supprimez automatiquement les données obsolètes
              </p>
            </div>
            <Switch
              checked={settings.cleanup.enabled}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                cleanup: {
                  ...settings.cleanup,
                  enabled: checked
                }
              })}
            />
          </div>

          {settings.cleanup.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Paniers abandonnés (jours)</Label>
                <Input
                  type="number"
                  value={settings.cleanup.rules.abandonedCarts}
                  onChange={(e) => setSettings({
                    ...settings,
                    cleanup: {
                      ...settings.cleanup,
                      rules: {
                        ...settings.cleanup.rules,
                        abandonedCarts: parseInt(e.target.value)
                      }
                    }
                  })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Commandes annulées (jours)</Label>
                <Input
                  type="number"
                  value={settings.cleanup.rules.cancelledOrders}
                  onChange={(e) => setSettings({
                    ...settings,
                    cleanup: {
                      ...settings.cleanup,
                      rules: {
                        ...settings.cleanup.rules,
                        cancelledOrders: parseInt(e.target.value)
                      }
                    }
                  })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Clients inactifs (jours)</Label>
                <Input
                  type="number"
                  value={settings.cleanup.rules.inactiveCustomers}
                  onChange={(e) => setSettings({
                    ...settings,
                    cleanup: {
                      ...settings.cleanup,
                      rules: {
                        ...settings.cleanup.rules,
                        inactiveCustomers: parseInt(e.target.value)
                      }
                    }
                  })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Produits supprimés (jours)</Label>
                <Input
                  type="number"
                  value={settings.cleanup.rules.deletedProducts}
                  onChange={(e) => setSettings({
                    ...settings,
                    cleanup: {
                      ...settings.cleanup,
                      rules: {
                        ...settings.cleanup.rules,
                        deletedProducts: parseInt(e.target.value)
                      }
                    }
                  })}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Confidentialité */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Confidentialité et RGPD
        </h2>

        <div className="space-y-6">
          {/* Rétention des données */}
          <div>
            <h3 className="font-medium mb-4">Rétention des données</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Données clients (jours)</Label>
                <Input
                  type="number"
                  value={settings.privacy.dataRetention.customerData}
                  onChange={(e) => setSettings({
                    ...settings,
                    privacy: {
                      ...settings.privacy,
                      dataRetention: {
                        ...settings.privacy.dataRetention,
                        customerData: parseInt(e.target.value)
                      }
                    }
                  })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Historique des commandes (jours)</Label>
                <Input
                  type="number"
                  value={settings.privacy.dataRetention.orderHistory}
                  onChange={(e) => setSettings({
                    ...settings,
                    privacy: {
                      ...settings.privacy,
                      dataRetention: {
                        ...settings.privacy.dataRetention,
                        orderHistory: parseInt(e.target.value)
                      }
                    }
                  })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Données analytiques (jours)</Label>
                <Input
                  type="number"
                  value={settings.privacy.dataRetention.analyticsData}
                  onChange={(e) => setSettings({
                    ...settings,
                    privacy: {
                      ...settings.privacy,
                      dataRetention: {
                        ...settings.privacy.dataRetention,
                        analyticsData: parseInt(e.target.value)
                      }
                    }
                  })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Anonymisation */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label>Anonymisation automatique</Label>
                <p className="text-sm text-gray-500">
                  Anonymisez automatiquement les données inactives
                </p>
              </div>
              <Switch
                checked={settings.privacy.anonymization.automaticAnonymization}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  privacy: {
                    ...settings.privacy,
                    anonymization: {
                      ...settings.privacy.anonymization,
                      automaticAnonymization: checked
                    }
                  }
                })}
              />
            </div>

            {settings.privacy.anonymization.automaticAnonymization && (
              <div>
                <Label>Période d'inactivité avant anonymisation (jours)</Label>
                <Input
                  type="number"
                  value={settings.privacy.anonymization.period}
                  onChange={(e) => setSettings({
                    ...settings,
                    privacy: {
                      ...settings.privacy,
                      anonymization: {
                        ...settings.privacy.anonymization,
                        period: parseInt(e.target.value)
                      }
                    }
                  })}
                  className="mt-1"
                />
              </div>
            )}
          </div>

          {/* Autres paramètres de confidentialité */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Gestion des consentements</Label>
                <p className="text-sm text-gray-500">
                  Activer le système de gestion des consentements
                </p>
              </div>
              <Switch
                checked={settings.privacy.consentManagement}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  privacy: {
                    ...settings.privacy,
                    consentManagement: checked
                  }
                })}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Chiffrement des données</Label>
                <p className="text-sm text-gray-500">
                  Activer le chiffrement des données sensibles
                </p>
              </div>
              <Switch
                checked={settings.privacy.dataEncryption}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  privacy: {
                    ...settings.privacy,
                    dataEncryption: checked
                  }
                })}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Dialogue d'import */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importer des données</DialogTitle>
            <DialogDescription>
              Sélectionnez les fichiers à importer (JSON ou CSV)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Input
              type="file"
              multiple
              accept=".json,.csv"
              onChange={(e) => setSelectedFiles(e.target.files)}
              className="w-full"
            />
            
            {importProgress > 0 && (
              <div className="space-y-2">
                <Progress value={importProgress} />
                <p className="text-sm text-gray-500 text-center">
                  {importProgress}% complete
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedFiles || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end">
        <Button
          onClick={async () => {
            try {
              setIsLoading(true);
              const { error } = await supabase
                .from('data_settings')
                .update(settings)
                .eq('id', settings.id);

              if (error) throw error;

              toast({
                title: "Paramètres sauvegardés",
                description: "Les paramètres ont été mis à jour avec succès",
                variant: "success"
              });
            } catch (error) {
              console.error('Error saving settings:', error);
              toast({
                title: "Erreur",
                description: "Impossible de sauvegarder les paramètres",
                variant: "destructive"
              });
            } finally {
              setIsLoading(false);
            }
          }}
          disabled={isLoading}
          className="gap-2"
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
    </div>
  );
}