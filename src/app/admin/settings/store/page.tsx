// src/app/admin/settings/store/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Globe2,
  MapPin,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Save,
  Loader2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

interface StoreSettings {
  id: string;
  name: string;
  description: string;
  currency: string;
  language: string;
  timezone: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  instagram: string;
  facebook: string;
  logo_url?: string;
  theme: {
    colors: {
      primary: string;
      secondary: string;
    };
    font: string;
  };
}

const currencies = [
  { code: "XOF", name: "Franc CFA BCEAO" },
  { code: "XAF", name: "Franc CFA BEAC" },
  { code: "USD", name: "Dollar américain" },
  { code: "EUR", name: "Euro" },
];

const languages = [
  { code: "fr", name: "Français" },
  { code: "en", name: "Anglais" },
];

const timezones = [
  { id: "Africa/Dakar", name: "(GMT+0) Dakar" },
  { id: "Africa/Abidjan", name: "(GMT+0) Abidjan" },
  { id: "Africa/Casablanca", name: "(GMT+1) Casablanca" },
  { id: "Africa/Lagos", name: "(GMT+1) Lagos" },
];

const countries = [
  { code: "SN", name: "Sénégal" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "CM", name: "Cameroun" },
  { code: "MA", name: "Maroc" },
  { code: "NG", name: "Nigeria" },
];

export default function StoreSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchStoreSettings();
  }, []);

  const fetchStoreSettings = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/admin/login");
        return;
      }

      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
      } else {
        // Créer des paramètres par défaut si non existants
        const defaultSettings: Partial<StoreSettings> = {
          name: "VIENS ON S'CONNAÎT",
          description: "Jeux de cartes pour améliorer les relations",
          currency: "XOF",
          language: "fr",
          timezone: "Africa/Dakar",
          country: "SN",
          theme: {
            colors: {
              primary: "#2563EB",
              secondary: "#9333EA",
            },
            font: "Inter",
          },
        };
        setSettings(defaultSettings as StoreSettings);
      }
    } catch (error) {
      console.error("Error fetching store settings:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedLogo(file);
    }
  };

  const uploadLogo = async () => {
    if (!selectedLogo) return null;

    const fileExt = selectedLogo.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `store-logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("public")
      .upload(filePath, selectedLogo);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("public")
      .getPublicUrl(filePath);

    return publicUrl;
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

      let logoUrl = settings.logo_url;

      if (selectedLogo) {
        logoUrl = await uploadLogo();
      }

      const { error } = await supabase
        .from("store_settings")
        .upsert({
          ...settings,
          logo_url: logoUrl,
          user_id: session.user.id,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Les paramètres ont été sauvegardés",
        variant: "success",
      });
    } catch (error) {
      console.error("Error saving store settings:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
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
          Paramètres de la boutique
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Gérez les informations générales de votre boutique en ligne
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations de base */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Store className="w-5 h-5" />
            Informations de base
          </h2>

          <div className="space-y-4">
            {/* Logo */}
            <div>
              <Label>Logo de la boutique</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-lg border dark:border-gray-700 overflow-hidden">
                  {settings.logo_url ? (
                    <Image
                      src={settings.logo_url}
                      alt="Logo"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                      <Store className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/20 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30"
                />
              </div>
            </div>

            {/* Nom de la boutique */}
            <div>
              <Label htmlFor="name">Nom de la boutique</Label>
              <Input
                id="name"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={settings.description}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        {/* Paramètres régionaux */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Globe2 className="w-5 h-5" />
            Paramètres régionaux
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Devise */}
            <div>
              <Label htmlFor="currency">Devise</Label>
              <Select
                value={settings.currency}
                onValueChange={(value) => setSettings({ ...settings, currency: value })}
              >
                <SelectTrigger id="currency" className="mt-1">
                  <SelectValue placeholder="Sélectionner une devise" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Langue */}
            <div>
              <Label htmlFor="language">Langue</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => setSettings({ ...settings, language: value })}
              >
                <SelectTrigger id="language" className="mt-1">
                  <SelectValue placeholder="Sélectionner une langue" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((language) => (
                    <SelectItem key={language.code} value={language.code}>
                      {language.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fuseau horaire */}
            <div>
              <Label htmlFor="timezone">Fuseau horaire</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => setSettings({ ...settings, timezone: value })}
              >
                <SelectTrigger id="timezone" className="mt-1">
                  <SelectValue placeholder="Sélectionner un fuseau horaire" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((timezone) => (
                    <SelectItem key={timezone.id} value={timezone.id}>
                      {timezone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pays */}
            <div>
              <Label htmlFor="country">Pays</Label>
              <Select
                value={settings.country}
                onValueChange={(value) => setSettings({ ...settings, country: value })}
              >
                <SelectTrigger id="country" className="mt-1">
                  <SelectValue placeholder="Sélectionner un pays" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Contact */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Contact et localisation
          </h2>

          <div className="space-y-4">
            {/* Adresse */}
            <div>
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ville */}
              <div>
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  value={settings.city}
                  onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                  className="mt-1"
                />
              </div>

              {/* Téléphone */}
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="mt-1"
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="mt-1"
                />
              </div>

              {/* Instagram */}
              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Instagram className="w-4 h-4 text-gray-400" />
                  </div>
                  <Input
                    id="instagram"
                    value={settings.instagram}
                    onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
                    className="pl-10"
                    placeholder="@votrecompte"
                  />
                </div>
              </div>

              {/* Facebook */}
              <div>
                <Label htmlFor="facebook">Facebook</Label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Facebook className="w-4 h-4 text-gray-400" />
                  </div>
                  <Input
                    id="facebook"
                    value={settings.facebook}
                    onChange={(e) => setSettings({ ...settings, facebook: e.target.value })}
                    className="pl-10"
                    placeholder="facebook.com/votrepage"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Thème */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Store className="w-5 h-5" />
            Apparence
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Couleur primaire */}
            <div>
              <Label htmlFor="primary-color">Couleur primaire</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  type="color"
                  id="primary-color"
                  value={settings.theme.colors.primary}
                  onChange={(e) => setSettings({
                    ...settings,
                    theme: {
                      ...settings.theme,
                      colors: {
                        ...settings.theme.colors,
                        primary: e.target.value
                      }
                    }
                  })}
                  className="w-12 h-12 p-1 rounded-lg"
                />
                <Input
                  type="text"
                  value={settings.theme.colors.primary}
                  onChange={(e) => setSettings({
                    ...settings,
                    theme: {
                      ...settings.theme,
                      colors: {
                        ...settings.theme.colors,
                        primary: e.target.value
                      }
                    }
                  })}
                  className="flex-1"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* Couleur secondaire */}
            <div>
              <Label htmlFor="secondary-color">Couleur secondaire</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  type="color"
                  id="secondary-color"
                  value={settings.theme.colors.secondary}
                  onChange={(e) => setSettings({
                    ...settings,
                    theme: {
                      ...settings.theme,
                      colors: {
                        ...settings.theme.colors,
                        secondary: e.target.value
                      }
                    }
                  })}
                  className="w-12 h-12 p-1 rounded-lg"
                />
                <Input
                  type="text"
                  value={settings.theme.colors.secondary}
                  onChange={(e) => setSettings({
                    ...settings,
                    theme: {
                      ...settings.theme,
                      colors: {
                        ...settings.theme.colors,
                        secondary: e.target.value
                      }
                    }
                  })}
                  className="flex-1"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* Police de caractères */}
            <div>
              <Label htmlFor="font">Police de caractères</Label>
              <Select
                value={settings.theme.font}
                onValueChange={(value) => setSettings({
                  ...settings,
                  theme: {
                    ...settings.theme,
                    font: value
                  }
                })}
              >
                <SelectTrigger id="font" className="mt-1">
                  <SelectValue placeholder="Sélectionner une police" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="Montserrat">Montserrat</SelectItem>
                  <SelectItem value="Poppins">Poppins</SelectItem>
                  <SelectItem value="Roboto">Roboto</SelectItem>
                </SelectContent>
              </Select>
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