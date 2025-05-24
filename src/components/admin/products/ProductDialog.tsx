// src/components/admin/products/ProductDialog.tsx
"use client"

import { useState, useEffect } from 'react';
import { MediaUpload } from './MediaUpload';
import { adminProductService } from '@/lib/services/adminProductService';
import type { AdminProduct, MediaUpload as MediaUploadType } from '@/types/product';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const preserveLineBreaks = (text: string) => {
  // Remplacer les retours chariot simples par \n pour le stockage
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (product: Partial<AdminProduct>) => Promise<void>;
  initialData?: Partial<AdminProduct>;
}

const defaultMetadata = {
  category: '',
  players: '',
  duration: '',
  language: 'Français',
  min_age: 12,
  stats: {
    sold: 0,
    satisfaction: 98,
    reviews: 0
  },
  benefits: [],
  topics: []
};

const defaultFormData: Partial<AdminProduct> = {
  name: '',
  description: '',
  price: 0,
  status: 'draft',
  stock_quantity: 0,
  metadata: defaultMetadata,
  media: [],
  game_rules: ''
};

export function ProductDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData
}: ProductDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Partial<AdminProduct>>(defaultFormData);
  const { toast } = useToast();

  // Réinitialiser le formulaire lors de l'ouverture/fermeture
  useEffect(() => {
    if (open) {
      setFormData(initialData ? {
        ...defaultFormData,
        ...initialData,
        metadata: {
          ...defaultMetadata,
          ...initialData.metadata
        }
      } : defaultFormData);
      setFormErrors({});
    }
  }, [open, initialData]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      errors.name = 'Le nom est requis';
    }
    
    if (!formData.price || formData.price <= 0) {
      errors.price = 'Le prix doit être supérieur à 0';
    }
    
    if (formData.compareAtPrice && formData.compareAtPrice <= formData.price!) {
      errors.compareAtPrice = 'Le prix barré doit être supérieur au prix de vente';
    }

    if (formData.stock_quantity! < 0) {
      errors.stock_quantity = 'Le stock ne peut pas être négatif';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    // Supprimer l'erreur du champ lors de la modification
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  
    if (name.includes('.')) {
      // Gestion des champs imbriqués (metadata)
      const [parent, child] = name.split('.');
      if (parent === 'metadata') {
        setFormData(prev => ({
          ...prev,
          metadata: {
            ...prev?.metadata,
            [child]: value
          }
        }));
      }
    } else {
      // Gestion des types pour certains champs
      let processedValue: any = value;
      if (name === 'price' || name === 'compareAtPrice' || name === 'stock_quantity') {
        processedValue = value === '' ? '' : Number(value);
      } else if (name === 'description' || name === 'game_rules') {
        // Préserver les sauts de ligne pour les champs de texte
        processedValue = preserveLineBreaks(value);
      }
  
      setFormData(prev => ({
        ...prev,
        [name]: processedValue
      }));
    }
  };

  const handleMediaUpload = (files: MediaUploadType[]) => {
    setFormData(prev => ({
      ...prev,
      media: files
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Erreur de validation",
        description: "Veuillez corriger les erreurs dans le formulaire"
      });
      return;
    }
  
    setIsLoading(true);
  
    try {
      // Process des données
      const processedData = {
        ...formData,
        price: Number(formData.price),
        compareAtPrice: formData.compareAtPrice ? Number(formData.compareAtPrice) : undefined,
        stock_quantity: formData.stock_quantity !== undefined ? Number(formData.stock_quantity) : undefined,
        // S'assurer que game_rules est inclus
        game_rules: formData.game_rules || '',
        // Préserver les sauts de ligne dans la description
        description: formData.description || ''
      };
      
      console.log('Données processées:', processedData);
      
      await onSubmit(processedData);
      onOpenChange(false);
      
      toast({
        title: "Succès",
        description: initialData ? "Produit mis à jour" : "Produit créé",
        duration: 3000
      });
    } catch (error) {
      console.error('Form submission error:', error);
      
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderError = (fieldName: string) => {
    if (!formErrors[fieldName]) return null;
    return (
      <div className="flex items-center gap-2 mt-1 text-sm text-red-500">
        <AlertCircle className="w-4 h-4" />
        <span>{formErrors[fieldName]}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {initialData ? 'Modifier le produit' : 'Ajouter un nouveau produit'}
            </DialogTitle>
            <DialogDescription>
              Remplissez les informations du produit. Les champs marqués d'un * sont obligatoires.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Images du produit */}
            <div className="space-y-2">
              <Label htmlFor="media">Images du produit</Label>
              <MediaUpload
                value={formData.media}
                onUpload={handleMediaUpload}
                maxFiles={5}
                acceptedTypes={['image/*']}
              />
            </div>

            {/* Informations de base */}
            <div className="space-y-1">
              <Label htmlFor="name" className="text-right">
                Nom *
              </Label>
              <Input
                id="name"
                name="name"
                className={formErrors.name ? 'border-red-500' : ''}
                value={formData.name || ''}
                onChange={handleInputChange}
                placeholder="Nom du produit"
              />
              {renderError('name')}
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                placeholder="Description du produit"
                rows={4}
                style={{ whiteSpace: 'pre-wrap' }}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="game_rules">
                Règles du jeu
              </Label>
              <Textarea
                id="game_rules"
                name="game_rules"
                value={formData.game_rules || ''}
                onChange={handleInputChange}
                placeholder="Décrivez comment jouer à ce jeu..."
                rows={6}
                style={{ whiteSpace: 'pre-wrap' }}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="price">
                Prix *
              </Label>
              <Input
                id="price"
                name="price"
                type="number"
                className={formErrors.price ? 'border-red-500' : ''}
                value={formData.price || ''}
                onChange={handleInputChange}
                placeholder="Prix en FCFA"
                min="0"
                step="100"
              />
              {renderError('price')}
            </div>

            <div className="space-y-1">
              <Label htmlFor="compareAtPrice">
                Prix barré
              </Label>
              <Input
                id="compareAtPrice"
                name="compareAtPrice"
                type="number"
                className={formErrors.compareAtPrice ? 'border-red-500' : ''}
                value={formData.compareAtPrice || ''}
                onChange={handleInputChange}
                placeholder="Prix barré en FCFA"
                min="0"
                step="100"
              />
              {renderError('compareAtPrice')}
            </div>

            {/* Métadonnées */}
            <div className="space-y-1">
              <Label htmlFor="metadata.category">
                Catégorie
              </Label>
              <Input
                id="metadata.category"
                name="metadata.category"
                value={formData.metadata?.category || ''}
                onChange={handleInputChange}
                placeholder="Catégorie du produit"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="metadata.players">
                Joueurs
              </Label>
              <Input
                id="metadata.players"
                name="metadata.players"
                value={formData.metadata?.players || ''}
                onChange={handleInputChange}
                placeholder="Ex: 2-6 joueurs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="metadata.duration">
                Durée
              </Label>
              <Input
                id="metadata.duration"
                name="metadata.duration"
                value={formData.metadata?.duration || ''}
                onChange={handleInputChange}
                placeholder="Ex: 30-45 minutes"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="metadata.min_age">
                Âge minimum
              </Label>
              <Input
                id="metadata.min_age"
                name="metadata.min_age"
                type="number"
                value={formData.metadata?.min_age || ''}
                onChange={handleInputChange}
                placeholder="Âge minimum recommandé"
                min="0"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="status">
                Statut
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  status: value as AdminProduct['status']
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="archived">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="stock_quantity">
                Stock
              </Label>
              <Input
                id="stock_quantity"
                name="stock_quantity"
                type="number"
                className={formErrors.stock_quantity ? 'border-red-500' : ''}
                value={formData.stock_quantity || ''}
                onChange={handleInputChange}
                placeholder="Quantité en stock"
                min="0"
              />
              {renderError('stock_quantity')}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              type="button"
            >
              Annuler
            </Button>
            <Button 
              type="submit"
              disabled={isLoading || Object.keys(formErrors).length > 0}
            >
              {isLoading ? 'Chargement...' : initialData ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}