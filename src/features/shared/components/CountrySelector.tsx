// src/features/shared/components/CountrySelector.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle,
  DialogDescription,
  DialogHeader
} from "../../../components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../../components/ui/select";
import useCountryStore, { getDefaultCountry } from "../../../core/hooks/useCountryStore";
import { countries } from "../../../lib/data/countries";

interface CountrySelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CountrySelector({ isOpen, onClose }: CountrySelectorProps) {
  const { setCountry } = useCountryStore();
  const [selectedCountry, setSelectedCountry] = useState<string>("SN");

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode);
    if (country) {
      setSelectedCountry(countryCode);
      setCountry(country);
      onClose();
    }
  };

  useEffect(() => {
    const checkFirstVisit = async () => {
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
          {/* Country Selector */}
          <Select value={selectedCountry} onValueChange={handleCountryChange}>
            <SelectTrigger
              className="w-full mt-4 bg-black text-white border border-gray-300 rounded-md focus:border-brand-pink focus:ring-2 focus:ring-brand-pink"
            >
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
            <SelectContent className="max-h-60 overflow-y-auto bg-white text-gray-900 border border-gray-300 rounded-md">
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

          {/* Continue Button */}
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