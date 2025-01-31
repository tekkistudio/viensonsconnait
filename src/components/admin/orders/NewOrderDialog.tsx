// src/components/admin/orders/NewOrderDialog.tsx
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

interface NewOrderFormData {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  payment_method: string;
  total_amount: number;
  delivery_cost: number;
  order_details: string;
}

const initialFormData: NewOrderFormData = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  payment_method: 'cash_on_delivery',
  total_amount: 0,
  delivery_cost: 0,
  order_details: ''
};

const paymentMethods = [
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'card', label: 'Carte bancaire' },
  { value: 'cash_on_delivery', label: 'Paiement à la livraison' }
];

export function NewOrderDialog({ onOrderCreated }: { onOrderCreated: () => void }) {
  const [formData, setFormData] = useState<NewOrderFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Créer ou mettre à jour le client
      const customerData = {
        full_name: `${formData.first_name} ${formData.last_name}`,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        address: formData.address
      };

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .upsert([customerData])
        .select()
        .single();

      if (customerError) throw customerError;

      // Créer la commande
      const orderData = {
        customer_id: customer.id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        email: formData.email,
        city: formData.city,
        address: formData.address,
        payment_method: formData.payment_method,
        total_amount: formData.total_amount,
        delivery_cost: formData.delivery_cost,
        order_details: formData.order_details,
        status: 'pending'
      };

      const { error: orderError } = await supabase
        .from('orders')
        .insert([orderData]);

      if (orderError) throw orderError;

      toast({
        title: "Commande créée",
        description: "La commande a été créée avec succès"
      });

      onOrderCreated();
      setFormData(initialFormData);

    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer la commande"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-brand-blue hover:bg-brand-blue/90 text-white">
          Nouvelle commande
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
            Nouvelle commande
          </DialogTitle>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 disabled:pointer-events-none data-[state=open]:bg-gray-100 dark:ring-offset-gray-950 dark:focus:ring-gray-300 dark:data-[state=open]:bg-gray-800">
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="sr-only">Fermer</span>
          </DialogClose>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Prénom
              </label>
              <Input
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
                className="bg-white dark:bg-gray-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nom
              </label>
              <Input
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
                className="bg-white dark:bg-gray-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Téléphone
              </label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="bg-white dark:bg-gray-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="bg-white dark:bg-gray-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Ville
              </label>
              <Input
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                required
                className="bg-white dark:bg-gray-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Moyen de paiement
              </label>
              <Select
                name="payment_method"
                value={formData.payment_method}
                onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger className="bg-white dark:bg-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(method => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Montant total
              </label>
              <Input
                type="number"
                name="total_amount"
                value={formData.total_amount}
                onChange={handleInputChange}
                required
                className="bg-white dark:bg-gray-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Frais de livraison
              </label>
              <Input
                type="number"
                name="delivery_cost"
                value={formData.delivery_cost}
                onChange={handleInputChange}
                required
                className="bg-white dark:bg-gray-900"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Adresse de livraison
            </label>
            <Textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
              className="bg-white dark:bg-gray-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Détails de la commande
            </label>
            <Textarea
              name="order_details"
              value={formData.order_details}
              onChange={handleInputChange}
              required
              className="bg-white dark:bg-gray-900"
              placeholder="Produits, quantités, notes spéciales..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              className="bg-brand-blue hover:bg-brand-blue/90 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Création..." : "Créer la commande"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}