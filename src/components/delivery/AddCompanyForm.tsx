// src/components/delivery/AddCompanyForm.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { X, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js';

interface AddCompanyFormProps {
  onSubmit: (data: CompanyFormData) => Promise<void>;
  onCancel: () => void;
  className?: string;
  initialData?: Partial<CompanyFormData>;
}

export interface CompanyFormData {
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  website?: string;
  integration_type: 'api' | 'manual' | 'sms';
  api_key?: string;
  coverage_areas: string[];
  pricing_model?: 'fixed' | 'per_km' | 'zone_based';
  base_price?: number;
  notes?: string;
}

interface FormErrors extends Partial<Record<keyof CompanyFormData, string>> {
  submit?: string;
}

const integrationTypes = [
  { value: 'api', label: 'API' },
  { value: 'manual', label: 'Manuel' },
  { value: 'sms', label: 'SMS' }
];

const pricingModels = [
  { value: 'fixed', label: 'Prix fixe' },
  { value: 'per_km', label: 'Prix par km' },
  { value: 'zone_based', label: 'Prix par zone' }
];

const validatePhoneNumber = (phone: string) => {
  try {
    return isValidPhoneNumber(phone) || phone.replace(/\D/g, '').length >= 8;
  } catch (error) {
    return false;
  }
};

const formatPhoneNumber = (phone: string) => {
  try {
    const phoneNumber = parsePhoneNumberFromString(phone);
    return phoneNumber ? phoneNumber.formatInternational() : phone;
  } catch (error) {
    return phone;
  }
};

export function AddCompanyForm({
  onSubmit,
  onCancel,
  className,
  initialData
}: AddCompanyFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [newArea, setNewArea] = useState('');
  const [formData, setFormData] = useState<CompanyFormData>({
    name: initialData?.name || '',
    contact_name: initialData?.contact_name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    website: initialData?.website || '',
    integration_type: initialData?.integration_type || 'sms',
    api_key: initialData?.api_key || '',
    coverage_areas: initialData?.coverage_areas || [],
    pricing_model: initialData?.pricing_model || 'fixed',
    base_price: initialData?.base_price || 0,
    notes: initialData?.notes || ''
  });

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Le nom de l'entreprise est requis";
    }

    if (!formData.contact_name.trim()) {
      newErrors.contact_name = 'Le nom du contact est requis';
    }

    if (!validatePhoneNumber(formData.phone)) {
      newErrors.phone = 'Numéro de téléphone invalide';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (formData.website && !/^https?:\/\//.test(formData.website)) {
      newErrors.website = 'URL invalide (doit commencer par http:// ou https://)';
    }

    if (formData.integration_type === 'api' && !formData.api_key) {
      newErrors.api_key = "La clé d'API est requise pour l'intégration API";
    }

    if (formData.coverage_areas.length === 0) {
      newErrors.coverage_areas = 'Au moins une zone de couverture est requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      const dataToSubmit = {
        ...formData,
        phone: formData.phone.replace(/\D/g, '')
      };
      await onSubmit(dataToSubmit);
    } catch (error) {
      console.error('Error submitting company form:', error);
      setErrors({
        ...errors,
        submit: "Une erreur est survenue lors de la création de l'entreprise"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CompanyFormData, value: any) => {
    if (field === 'phone') {
      value = formatPhoneNumber(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const addCoverageArea = () => {
    if (newArea.trim()) {
      setFormData(prev => ({
        ...prev,
        coverage_areas: [...prev.coverage_areas, newArea.trim()]
      }));
      setNewArea('');
      if (errors.coverage_areas) {
        setErrors(prev => ({ ...prev, coverage_areas: undefined }));
      }
    }
  };

  const removeCoverageArea = (index: number) => {
    setFormData(prev => ({
      ...prev,
      coverage_areas: prev.coverage_areas.filter((_, i) => i !== index)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      <div className="grid gap-4">
        {/* Informations générales */}
        <div className="grid gap-2">
          <Label htmlFor="name">Nom de l'entreprise *</Label>
          <Input
            id="name"
            placeholder="Nom de l'entreprise de livraison"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            disabled={isLoading}
            className={cn(errors.name && "border-red-500 focus-visible:ring-red-500")}
          />
          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="contact_name">Nom du contact *</Label>
          <Input
            id="contact_name"
            placeholder="Personne à contacter"
            value={formData.contact_name}
            onChange={(e) => handleInputChange('contact_name', e.target.value)}
            disabled={isLoading}
            className={cn(errors.contact_name && "border-red-500 focus-visible:ring-red-500")}
          />
          {errors.contact_name && <p className="text-sm text-red-500">{errors.contact_name}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone">Téléphone *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Numéro de téléphone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            disabled={isLoading}
            className={cn(errors.phone && "border-red-500 focus-visible:ring-red-500")}
          />
          {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="email@entreprise.com"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            disabled={isLoading}
            className={cn(errors.email && "border-red-500 focus-visible:ring-red-500")}
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="website">Site web</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://www.entreprise.com"
            value={formData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            disabled={isLoading}
            className={cn(errors.website && "border-red-500 focus-visible:ring-red-500")}
          />
          {errors.website && <p className="text-sm text-red-500">{errors.website}</p>}
        </div>

        {/* Paramètres d'intégration */}
        <div className="grid gap-2">
          <Label htmlFor="integration_type">Type d'intégration *</Label>
          <Select
            value={formData.integration_type}
            onValueChange={(value) => handleInputChange('integration_type', value)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir le type d'intégration" />
            </SelectTrigger>
            <SelectContent>
              {integrationTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.integration_type === 'api' && (
          <div className="grid gap-2">
            <Label htmlFor="api_key">Clé API *</Label>
            <Input
              id="api_key"
              type="text"
              value={formData.api_key}
              onChange={(e) => handleInputChange('api_key', e.target.value)}
              disabled={isLoading}
              className={cn(errors.api_key && "border-red-500 focus-visible:ring-red-500")}
            />
            {errors.api_key && <p className="text-sm text-red-500">{errors.api_key}</p>}
          </div>
        )}

        {/* Zones de couverture */}
        <div className="grid gap-2">
          <Label>Zones de couverture *</Label>
          <div className="flex gap-2">
            <Input
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              placeholder="Ajouter une zone"
              disabled={isLoading}
            />
            <Button
              type="button"
              onClick={addCoverageArea}
              disabled={isLoading || !newArea.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.coverage_areas.map((area, index) => (
              <Badge
                key={index}
                variant="outline"
                className="flex items-center gap-1"
              >
                {area}
                <button
                  type="button"
                  onClick={() => removeCoverageArea(index)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          {errors.coverage_areas && (
            <p className="text-sm text-red-500">{errors.coverage_areas}</p>
          )}
        </div>

        {/* Modèle de tarification */}
        <div className="grid gap-2">
          <Label htmlFor="pricing_model">Modèle de tarification</Label>
          <Select
            value={formData.pricing_model}
            onValueChange={(value) => handleInputChange('pricing_model', value)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir le modèle de tarification" />
            </SelectTrigger>
            <SelectContent>
              {pricingModels.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="base_price">Prix de base (FCFA)</Label>
          <Input
            id="base_price"
            type="number"
            value={formData.base_price}
            onChange={(e) => handleInputChange('base_price', Number(e.target.value))}
            min="0"
            disabled={isLoading}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Notes supplémentaires..."
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            disabled={isLoading}
            rows={3}
          />
        </div>
      </div>

      {errors.submit && (
        <p className="text-sm text-red-500 mt-4">{errors.submit}</p>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Annuler
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {initialData ? 'Modifier' : 'Ajouter'} l'entreprise
        </Button>
      </div>
    </form>
  );
}