// src/components/admin/orders/NewOrderDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Plus, Minus, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { OrderStatus } from '@/types/order';
import { handleError } from '@/lib/error-handling';

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  description?: string;
  metadata?: {
    images?: Array<{ url: string; publicId: string; }>;
  };
}

const orderItemSchema = z.object({
  product_id: z.string(),
  quantity: z.number().min(1, 'La quantité minimum est 1'),
  price: z.number(),
  name: z.string(),
  image: z.string().nullable(), // Image ajoutée
  total_price: z.number().optional() // Total price ajouté
});

const orderFormSchema = z.object({
  first_name: z.string().min(2, 'Le prénom est obligatoire'),
  last_name: z.string().min(2, 'Le nom est obligatoire'),
  phone: z.string()
    .min(9, 'Le numéro doit contenir au moins 9 chiffres')
    .max(15, 'Le numéro est trop long')
    .regex(/^\d+$/, 'Le numéro ne doit contenir que des chiffres'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  city: z.string().min(2, 'La ville est obligatoire'),
  address: z.string().min(5, 'L\'adresse est obligatoire'),
  payment_method: z.enum(['wave', 'orange_money', 'card', 'cash_on_delivery']),
  delivery_cost: z.number().min(0, 'Les frais de livraison sont obligatoires'),
  items: z.array(orderItemSchema).min(1, 'Au moins un produit est obligatoire'), // Utilisation du schéma modifié
  notes: z.string().optional()
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

const cities = [
  'Dakar', 'Thiès', 'Touba', 'Saint-Louis', 'Rufisque',
  'Kaolack', 'Mbour', 'Ziguinchor', 'Abidjan'
];

const paymentMethods = [
  { id: 'wave', label: 'Wave' },
  { id: 'orange_money', label: 'Orange Money'},
  { id: 'card', label: 'Carte bancaire'},
  { id: 'cash_on_delivery', label: 'Paiement à la livraison' }
];

const defaultDeliveryCosts = {
  'Dakar': 0, 'Thiès': 3000, 'Touba': 3000,
  'Saint-Louis': 3000, 'Rufisque': 2000,
  'Kaolack': 3000, 'Mbour': 3000,
  'Ziguinchor': 4000, 'Abidjan': 3000
};

export function NewOrderDialog({ onOrderCreated }: { onOrderCreated: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const { toast } = useToast();

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      city: '',
      address: '',
      payment_method: 'cash_on_delivery',
      delivery_cost: 0,
      items: [],
      notes: ''
    }
  });

  const { fields, append, remove } = useFieldArray<OrderFormValues>({
    control: form.control,
    name: "items"
  });

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  useEffect(() => {
    const city = form.watch('city');
    if (city && defaultDeliveryCosts[city as keyof typeof defaultDeliveryCosts]) {
      form.setValue('delivery_cost', defaultDeliveryCosts[city as keyof typeof defaultDeliveryCosts]);
    }
  }, [form.watch('city')]);

  // Ajout de l'effet pour la mise à jour automatique du total
  useEffect(() => {
    const subscription = form.watch(() => {
      // Force la mise à jour du formulaire pour recalculer les totaux
      form.trigger();
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, stock_quantity, description, metadata')
        .eq('status', 'active');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les produits"
      });
    }
  };

  const calculateTotal = () => {
    const items = form.getValues('items');
    const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryCost = form.getValues('delivery_cost') || 0;
    return itemsTotal + deliveryCost;
  };

  const handleAddProduct = () => {
    if (products.length === 0) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Aucun produit disponible"
      });
      return;
    }
    
    const firstProduct = products[0];
    append({
      product_id: firstProduct.id,
      quantity: 1,
      price: firstProduct.price,
      name: firstProduct.name,
      image: firstProduct.metadata?.images?.[0]?.url || null,
      total_price: firstProduct.price // ajout du total_price
    });
  };

  const onSubmit = async (data: OrderFormValues) => {
    setIsLoading(true);
    try {
      // Vérification des produits
      if (!data.items?.length) {
        throw new Error('Au moins un produit est requis');
      }
  
      // Préparation des données...
      const orderItems = data.items.map(item => ({
        product_id: item.product_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total_price: item.price * item.quantity,
        image: item.image
      }));
  
      const subtotal = orderItems.reduce((sum, item) => sum + item.total_price, 0);
  
      const orderData = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        email: data.email || null,
        city: data.city,
        address: data.address,
        payment_method: data.payment_method,
        product_id: data.items[0].product_id,
        items: orderItems,
        total_amount: subtotal + data.delivery_cost,
        delivery_cost: data.delivery_cost,
        status: 'pending',
        // Utiliser order_details au lieu de notes
        order_details: data.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          source: 'admin',
          createdAt: new Date().toISOString(),
          paymentStatus: 'pending',
          deliveryStatus: 'pending',
          totalItems: orderItems.length,
          // Stocker aussi les notes dans metadata si nécessaire
          notes: data.notes || ''
        }
      };
  
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();
  
      if (orderError) {
        console.error('Erreur Supabase:', orderError);
        throw orderError;
      }
  
      toast({
        title: "Succès",
        description: "La commande a été créée avec succès"
      });
  
      onOrderCreated();
      setIsOpen(false);
      form.reset();
  
    } catch (err: unknown) {
      const errorMessage = handleError(err);
      console.error('Error creating order:', err);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-brand-blue hover:bg-brand-blue/90 text-white">
          Nouvelle commande
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
            Nouvelle commande
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">
            Remplissez les informations de la commande
          </DialogDescription>
          <DialogClose className="absolute right-4 top-4 opacity-70 transition-opacity hover:opacity-100">
            <X className="h-4 w-4" />
          </DialogClose>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Section Produits */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Produits</h3>
                <Button
                  type="button"
                  onClick={handleAddProduct}
                  className="bg-brand-blue hover:bg-brand-blue/90 text-white gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un produit
                </Button>
              </div>

              {fields.map((field, index) => (
                <Card key={field.id} className="p-4 bg-white dark:bg-gray-800">
                  <div className="space-y-4">
                    <div className="flex justify-between gap-4">
                      <FormField
                        control={form.control}
                        name={`items.${index}.product_id`}
                        render={({ field: productField }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-gray-700 dark:text-gray-200">
                              Produit
                            </FormLabel>
                            <Select
                              value={productField.value.toString()}
                              onValueChange={(value) => {
                                const product = products.find(p => p.id === value);
                                if (product) {
                                  const price = product.price;
                                  productField.onChange(product.id);
                                  form.setValue(`items.${index}.price`, price);
                                  form.setValue(`items.${index}.name`, product.name);
                                  form.setValue(`items.${index}.image`, product.metadata?.images?.[0]?.url || null);
                                  form.setValue(`items.${index}.total_price`, price); // ajout du total_price
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-white dark:bg-gray-900">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem 
                                    key={product.id}
                                    value={product.id}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 dark:bg-gray-800">
                                        {product.metadata?.images?.[0] ? (
                                          <img
                                            src={product.metadata.images[0].url}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <Package className="w-5 h-5 text-gray-400" />
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <div className="font-medium">{product.name}</div>
                                        <div className="text-sm text-gray-500">
                                          {product.price.toLocaleString()} FCFA
                                        </div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field: quantityField }) => (
                        <FormItem className="w-40">
                          <FormLabel className="text-gray-700 dark:text-gray-200">
                            Quantité: x{quantityField.value}
                          </FormLabel>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newValue = Math.max(1, quantityField.value - 1);
                                quantityField.onChange(newValue);
                                // Forcer la mise à jour du total
                                form.trigger('items');
                              }}
                              className="dark:border-gray-600"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <div className="w-8 text-center font-medium">
                              {quantityField.value}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newValue = quantityField.value + 1;
                                quantityField.onChange(newValue);
                                // Forcer la mise à jour du total
                                form.trigger('items');
                              }}
                              className="dark:border-gray-600"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-8 hover:text-red-500 dark:hover:text-red-400"
                        onClick={() => remove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Sous-total de l'item */}
                    <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                            Sous-total: {((form.watch(`items.${index}.quantity`) || 0) * 
                              (form.watch(`items.${index}.price`) || 0)).toLocaleString()} FCFA
                          </div>
                        </div>
                      </Card>
                    ))}


              {fields.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Aucun produit ajouté. Cliquez sur "Ajouter un produit" pour commencer.
                </div>
              )}
            </div>

            {/* Section Informations Client */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-200">Prénom</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-white dark:bg-gray-900" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-200">Nom</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-white dark:bg-gray-900" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-200">Téléphone</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-white dark:bg-gray-900" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-200">Email (optionnel)</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" className="bg-white dark:bg-gray-900" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-200">Ville</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-gray-900">
                          <SelectValue placeholder="Sélectionnez une ville" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cities.map(city => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-200">Moyen de paiement</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethods.map(method => (
                          <SelectItem key={method.id} value={method.id}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="delivery_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-200">Frais de livraison</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => field.onChange(Number(e.target.value))}
                        className="bg-white dark:bg-gray-900"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 dark:text-gray-200">Adresse de livraison</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="bg-white dark:bg-gray-900 min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 dark:text-gray-200">Notes (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Notes spéciales pour la commande..."
                      className="bg-white dark:bg-gray-900 min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Total de la commande */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between items-center text-lg font-medium">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-gray-900 dark:text-white">
                  {calculateTotal().toLocaleString()} FCFA
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="dark:border-gray-600">
                  Annuler
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className="bg-brand-blue hover:bg-brand-blue/90 text-white"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Création..." : "Créer la commande"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}