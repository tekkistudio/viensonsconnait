// src/features/shared/components/CountrySelector.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import useCountryStore, { getDefaultCountry } from "@/core/hooks/useCountryStore";
import { countries } from "@/lib/data/countries";
import { supabase } from "@/lib/supabase";

interface CountrySelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CountrySelector({ isOpen, onClose }: CountrySelectorProps) {
  const { setCountry, currentCountry } = useCountryStore();
  const [selectedCountry, setSelectedCountry] = useState<string>(currentCountry?.code || "SN");

  const handleCountryChange = async (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode);
    if (country) {
      setSelectedCountry(countryCode);
      setCountry(country);

      // Sauvegarder la préférence de pays pour l'utilisateur
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase
            .from('user_preferences')
            .upsert({
              user_id: session.user.id,
              country_code: countryCode,
              currency_code: country.currency?.code || 'XOF',
              updated_at: new Date().toISOString()
            });
        }
      } catch (error) {
        console.error('Error saving country preference:', error);
      }

      // Stocker dans le localStorage
      localStorage.setItem('userCountry', JSON.stringify({
        code: country.code,
        name: country.name,
        currency: country.currency,
        flag: country.flag
      }));

      onClose();
    }
  };

  useEffect(() => {
    const checkFirstVisit = async () => {
      // Vérifier d'abord le localStorage
      const savedCountry = localStorage.getItem('userCountry');
      if (savedCountry) {
        const parsed = JSON.parse(savedCountry);
        setSelectedCountry(parsed.code);
        setCountry(parsed);
        return;
      }

      // Ensuite vérifier les préférences utilisateur dans Supabase
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: preferences } = await supabase
            .from('user_preferences')
            .select('country_code')
            .eq('user_id', session.user.id)
            .single();

          if (preferences?.country_code) {
            const country = countries.find(c => c.code === preferences.country_code);
            if (country) {
              setSelectedCountry(country.code);
              setCountry(country);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user preferences:', error);
      }

      // Si aucune préférence trouvée, détecter le pays
      const hasVisited = localStorage.getItem("hasVisitedBefore");
      if (!hasVisited) {
        const detectedCountry = await getDefaultCountry();
        setSelectedCountry(detectedCountry.code);
        setCountry(detectedCountry);
        localStorage.setItem("hasVisitedBefore", "true");
      }
    };

    checkFirstVisit();
  }, [setCountry]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Choisir un pays / région
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Sélectionnez votre pays/région pour une expérience personnalisée dans notre boutique
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Select value={selectedCountry} onValueChange={handleCountryChange}>
            <SelectTrigger className="w-full mt-4 bg-black text-white border border-gray-300 rounded-md">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {countries.find((c) => c.code === selectedCountry)?.flag}
                  </span>
                  <span>
                    {countries.find((c) => c.code === selectedCountry)?.name || "Sélectionnez votre pays/région"}
                  </span>
                </div>
              </SelectValue>
            </SelectTrigger>

            <SelectContent className="max-h-60 overflow-y-auto">
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{country.flag}</span>
                    <span>{country.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            onClick={onClose}
            className="w-full bg-brand-blue text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Continuer
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}