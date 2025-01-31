// src/components/products/ProductDialog.tsx
"use client"

import { useState } from 'react';
import { MediaUpload } from './MediaUpload';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (product: any) => Promise<void>;
  initialData?: any;
}

export function ProductDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData
}: ProductDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    price: initialData?.price || '',
    stock_quantity: initialData?.stock_quantity || '',
    category: initialData?.metadata?.category || '',
    media: initialData?.media || [],
    status: initialData?.status || 'draft',
    metadata: {
      players: initialData?.metadata?.players || '',
      duration: initialData?.metadata?.duration || '',
      language: initialData?.metadata?.language || 'Français',
      min_age: initialData?.metadata?.min_age || 12,
      highlights: initialData?.metadata?.highlights || []
    }
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.name || !formData.price) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      await onSubmit({
        ...formData,
        price: Number(formData.price),
        stock_quantity: Number(formData.stock_quantity)
      });

      toast({
        title: "Succès",
        description: initialData 
          ? "Le produit a été mis à jour" 
          : "Le produit a été créé",
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue"
      });
    } finally {
      setIsLoading(false);
    }
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
            <div className="space-y-2">
              <Label htmlFor="media">Images du produit</Label>
              <MediaUpload
                value={formData.media}
                onUpload={(files) => setFormData({ ...formData, media: files })}
                maxFiles={5}
                acceptedTypes={['image/*', 'video/*']}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nom *
              </Label>
              <Input
                id="name"
                className="col-span-3"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom du produit"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                className="col-span-3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du produit"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Prix *
              </Label>
              <Input
                id="price"
                type="number"
                className="col-span-3"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="Prix en FCFA"
                required
                min="0"
                step="100"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock" className="text-right">
                Stock initial
              </Label>
              <Input
                id="stock"
                type="number"
                className="col-span-3"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  stock_quantity: e.target.value 
                })}
                placeholder="Quantité en stock"
                min="0"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Catégorie
              </Label>
              <Input
                id="category"
                className="col-span-3"
                value={formData.category}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  category: e.target.value 
                })}
                placeholder="Catégorie du produit"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="players" className="text-right">
                Nombre de joueurs
              </Label>
              <Input
                id="players"
                className="col-span-3"
                value={formData.metadata.players}
                onChange={(e) => setFormData({
                  ...formData,
                  metadata: { ...formData.metadata, players: e.target.value }
                })}
                placeholder="Ex: 2-6 joueurs"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duration" className="text-right">
                Durée de jeu
              </Label>
              <Input
                id="duration"
                className="col-span-3"
                value={formData.metadata.duration}
                onChange={(e) => setFormData({
                  ...formData,
                  metadata: { ...formData.metadata, duration: e.target.value }
                })}
                placeholder="Ex: 30-45 minutes"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="min_age" className="text-right">
                Âge minimum
              </Label>
              <Input
                id="min_age"
                type="number"
                className="col-span-3"
                value={formData.metadata.min_age}
                onChange={(e) => setFormData({
                  ...formData,
                  metadata: { ...formData.metadata, min_age: Number(e.target.value) }
                })}
                placeholder="Âge minimum recommandé"
                min="0"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Statut
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({
                  ...formData,
                  status: value as 'draft' | 'active' | 'archived'
                })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Sélectionnez un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="archived">Archivé</SelectItem>
                </SelectContent>
              </Select>
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
              disabled={isLoading}
            >
              {isLoading ? 'Chargement...' : initialData ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}