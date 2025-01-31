// src/components/delivery/AddDriverForm.tsx
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
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js';

interface AddDriverFormProps {
  onSubmit: (data: DriverFormData) => Promise<void>;
  onCancel: () => void;
  className?: string;
  initialData?: Partial<DriverFormData>;
}

export interface DriverFormData {
  full_name: string;
  phone: string;
  email?: string;
  vehicle_type: string;
  current_zone: string;
  availability_hours?: string;
  notes?: string;
}

interface FormErrors extends Partial<Record<keyof DriverFormData, string>> {
  submit?: string;
}

const vehicleTypes = [
  { value: 'motorcycle', label: 'Moto' },
  { value: 'car', label: 'Voiture' },
  { value: 'van', label: 'Camionnette' },
  { value: 'bicycle', label: 'Vélo' }
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

export function AddDriverForm({
  onSubmit,
  onCancel,
  className,
  initialData
}: AddDriverFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<DriverFormData>({
    full_name: initialData?.full_name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    vehicle_type: initialData?.vehicle_type || '',
    current_zone: initialData?.current_zone || '',
    availability_hours: initialData?.availability_hours || '',
    notes: initialData?.notes || ''
  });

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Le nom est requis';
    }

    if (!validatePhoneNumber(formData.phone)) {
      newErrors.phone = 'Numéro de téléphone invalide';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!formData.vehicle_type) {
      newErrors.vehicle_type = 'Type de véhicule requis';
    }

    if (!formData.current_zone.trim()) {
      newErrors.current_zone = 'Zone de livraison requise';
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
      setErrors({
        ...errors,
        submit: 'Une erreur est survenue lors de la création du livreur'
      });
      console.error('Error submitting driver form:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof DriverFormData, value: string) => {
    if (field === 'phone') {
      value = formatPhoneNumber(value);
    }

    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="full_name">
            Nom complet *
          </Label>
          <Input
            id="full_name"
            placeholder="Nom et prénom du livreur"
            value={formData.full_name}
            onChange={(e) => handleInputChange('full_name', e.target.value)}
            disabled={isLoading}
            className={cn(errors.full_name && "border-red-500 focus-visible:ring-red-500")}
          />
          {errors.full_name && (
            <p className="text-sm text-red-500">{errors.full_name}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone">
            Téléphone *
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Numéro de téléphone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            disabled={isLoading}
            className={cn(errors.phone && "border-red-500 focus-visible:ring-red-500")}
          />
          {errors.phone ? (
            <p className="text-sm text-red-500">{errors.phone}</p>
          ) : (
            <p className="text-xs text-gray-500">
              Le livreur recevra les notifications par SMS à ce numéro
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Adresse email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            disabled={isLoading}
            className={cn(errors.email && "border-red-500 focus-visible:ring-red-500")}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="vehicle_type">Type de véhicule *</Label>
          <Select
            value={formData.vehicle_type}
            onValueChange={(value) => handleInputChange('vehicle_type', value)}
            disabled={isLoading}
          >
            <SelectTrigger className={cn(errors.vehicle_type && "border-red-500 focus-visible:ring-red-500")}>
              <SelectValue placeholder="Sélectionner un type de véhicule" />
            </SelectTrigger>
            <SelectContent>
              {vehicleTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.vehicle_type && (
            <p className="text-sm text-red-500">{errors.vehicle_type}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="current_zone">Zone de livraison principale *</Label>
          <Input
            id="current_zone"
            placeholder="Zone principale d'intervention"
            value={formData.current_zone}
            onChange={(e) => handleInputChange('current_zone', e.target.value)}
            disabled={isLoading}
            className={cn(errors.current_zone && "border-red-500 focus-visible:ring-red-500")}
          />
          {errors.current_zone && (
            <p className="text-sm text-red-500">{errors.current_zone}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="availability_hours">Horaires de disponibilité</Label>
          <Input
            id="availability_hours"
            placeholder="Ex: Lun-Ven 9h-18h"
            value={formData.availability_hours}
            onChange={(e) => handleInputChange('availability_hours', e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="notes">Notes supplémentaires</Label>
          <Textarea
            id="notes"
            placeholder="Informations complémentaires..."
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
          {initialData ? 'Modifier' : 'Ajouter'} le livreur
        </Button>
      </div>
    </form>
  );
}