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

export interface WorkingHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

export interface DriverFormData {
  full_name: string;
  phone: string;
  email?: string;
  vehicle_type: string;
  current_zone: string;
  working_hours?: WorkingHours;
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

// Fonction pour parser les horaires de travail
const parseWorkingHours = (hoursString: string): WorkingHours => {
  const daysRegex = /Lun|Mar|Mer|Jeu|Ven|Sam|Dim/gi;
  const timeRegex = /\d{1,2}[h:]\d{2}/g;
  
  const days = hoursString.match(daysRegex) || [];
  const times = hoursString.match(timeRegex) || [];
  
  const workingHours: WorkingHours = {};
  
  const dayMapping: Record<string, keyof WorkingHours> = {
    'lun': 'monday',
    'mar': 'tuesday',
    'mer': 'wednesday',
    'jeu': 'thursday',
    'ven': 'friday',
    'sam': 'saturday',
    'dim': 'sunday'
  };

  // Si nous avons un format comme "Lun-Ven 9h-18h"
  if (hoursString.includes('-')) {
    const daysList = days.filter(Boolean);
    if (daysList.length >= 2) {
      const [start, end] = daysList;
      if (start && end) {
        const startDay = dayMapping[start.toLowerCase()];
        const endDay = dayMapping[end.toLowerCase()];
        const timeRange = times.join('-');

        const daysOrder: Array<keyof WorkingHours> = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        let recording = false;

        for (const day of daysOrder) {
          if (day === startDay) recording = true;
          if (recording && day) workingHours[day] = timeRange;
          if (day === endDay) recording = false;
        }
      }
    }
  } else {
    // Format individuel pour chaque jour
    days.forEach((day, index) => {
      const dayKey = day?.toLowerCase() || '';
      const englishDay = dayMapping[dayKey];
      if (englishDay && times[index]) {
        workingHours[englishDay] = times[index];
      }
    });
  }

  return workingHours;
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
    working_hours: initialData?.working_hours || {},
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
      const workingHoursString = typeof formData.working_hours === 'string' 
        ? formData.working_hours 
        : Object.entries(formData.working_hours || {}).map(([day, hours]) => `${day}: ${hours}`).join(', ');
      
      const parsedWorkingHours = workingHoursString ? parseWorkingHours(workingHoursString) : undefined;
      
      const dataToSubmit: DriverFormData = {
        ...formData,
        phone: formData.phone.replace(/\D/g, ''),
        working_hours: parsedWorkingHours
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

  const handleInputChange = (field: keyof DriverFormData, value: any) => {
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
          <Label htmlFor="working_hours">Horaires de travail</Label>
          <Select
            value={formData.working_hours ? 'custom' : 'default'}
            onValueChange={(value) => {
              const defaultHours = value === 'default' 
                ? { monday: '9h-18h', tuesday: '9h-18h', wednesday: '9h-18h', thursday: '9h-18h', friday: '9h-18h' }
                : {};
              handleInputChange('working_hours', defaultHours);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner les horaires" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Lun-Ven 9h-18h</SelectItem>
              <SelectItem value="custom">Horaires personnalisés</SelectItem>
            </SelectContent>
          </Select>
          
          {formData.working_hours && Object.keys(formData.working_hours).length > 0 && (
            <div className="grid gap-2 mt-2">
              {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => (
                <div key={day} className="flex items-center gap-2">
                  <Label className="w-24">{
                    day === 'monday' ? 'Lundi' :
                    day === 'tuesday' ? 'Mardi' :
                    day === 'wednesday' ? 'Mercredi' :
                    day === 'thursday' ? 'Jeudi' :
                    day === 'friday' ? 'Vendredi' :
                    day === 'saturday' ? 'Samedi' : 'Dimanche'
                  }</Label>
                  <Input
                    type="text"
                    placeholder="Ex: 9h-18h"
                    value={formData.working_hours?.[day] || ''}
                    onChange={(e) => {
                      const newHours = { ...formData.working_hours, [day]: e.target.value };
                      handleInputChange('working_hours', newHours);
                    }}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          )}
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