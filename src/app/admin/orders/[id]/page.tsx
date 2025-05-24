// src/app/admin/orders/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft,
  Printer,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Clock,
  Package,
  CreditCard,
  Loader2,
  AlertCircle,
  Truck,
  Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { DeliveryStatus, OrderData, OrderItem, OrderMetadata, OrderStatus, PaymentProvider } from '@/types/order';

// Fonction de traduction des statuts
const getOrderStatusLabel = (status: string) => {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'processing':
      return 'En traitement';
    case 'shipped':
      return 'Expédiée';
    case 'delivered':
      return 'Livrée';
    case 'cancelled':
      return 'Annulée';
    default:
      return status;
  }
};

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchOrderDetails(parseInt(params.id as string));
    }
  }, [params.id]);

  const updateOrderPaymentStatus = async (status: 'pending' | 'completed') => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          metadata: {
            ...order?.metadata,
            paymentStatus: status,
            updatedAt: new Date().toISOString()
          }
        })
        .eq('id', order?.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: status === 'completed' ? 
          "Le paiement a été marqué comme reçu" : 
          "Le statut de paiement a été mis à jour"
      });

      fetchOrderDetails(parseInt(order?.id as string));
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le statut du paiement"
      });
    }
  };

  const updateOrderStatus = async (status: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status,
          metadata: {
            ...order?.metadata,
            deliveryStatus: status,
            updatedAt: new Date().toISOString()
          }
        })
        .eq('id', order?.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Le statut de la commande a été mis à jour"
      });

      fetchOrderDetails(parseInt(order?.id as string));
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de la commande"
      });
    }
  };

  const fetchOrderDetails = async (orderId: number) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Order not found');
      }

      // Parse les items qui sont stockés en JSONB
      let parsedItems: OrderItem[] = [];
      try {
        parsedItems = typeof data.items === 'string' 
          ? JSON.parse(data.items) 
          : (Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        console.error('Error parsing items:', e);
      }

      // Transforme les données en OrderData
      const transformedOrder: OrderData = {
        id: data.id.toString(),
        session_id: data.session_id || '',
        items: parsedItems,
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        city: data.city || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email,
        payment_method: data.payment_method as PaymentProvider,
        order_details: data.order_details || '',
        total_amount: data.total_amount || 0,
        delivery_cost: data.delivery_cost || 0,
        status: data.status as OrderStatus,
        // Ajout du calcul du sous-total
        subtotal: parsedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        metadata: {
          source: 'web',
          createdAt: data.created_at || new Date().toISOString(),
          updatedAt: data.updated_at || new Date().toISOString(),
          conversationHistory: [],
          storeId: '',
          productId: data.product_id || '',
          conversationId: '',
          paymentStatus: data.payment_status || 'pending',
          deliveryStatus: data.status as DeliveryStatus || 'pending',
          ...(data.metadata || {})
        }
      };

      setOrder(transformedOrder);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les détails de la commande"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
      case 'processing':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
      case 'shipped':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400';
      case 'delivered':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'cancelled':
        return 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400';
      default:
        return 'bg-gray-50 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400';
    }
  };

  const getPaymentMethodLabel = (method: PaymentProvider | undefined) => {
    switch (method?.toLowerCase()) {
      case 'wave':
        return 'Wave';
      case 'orange_money':
        return 'Orange Money';
      case 'card':
        return 'Carte bancaire';
      case 'cash_on_delivery':
        return 'Paiement à la livraison';
      default:
        return 'Non spécifié';
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour aux commandes
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <AlertCircle className="h-12 w-12 text-gray-400" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            Commande introuvable
          </p>
          <p className="text-gray-500 dark:text-gray-400">
            La commande que vous recherchez n'existe pas ou a été supprimée.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour aux commandes
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Plus d'actions
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Commande #{order.id}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {format(order.metadata.createdAt, "d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </p>
          </div>
          <Badge className={cn("text-sm", getStatusColor(order.status))}>
            {getOrderStatusLabel(order.status)}
          </Badge>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-3 gap-6">
        {/* Colonne principale (2/3) */}
        <div className="col-span-2 space-y-6">
          {/* Produits commandés */}
          <Card>
            <CardHeader>
              <CardTitle>Produits commandés</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Prix unitaire</TableHead>
                    <TableHead className="text-center">Quantité</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {Array.isArray(order?.items) && order.items.map((item: OrderItem, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/placeholder-product.png';
                                  target.onerror = null;
                                }}
                              />
                            ) : (
                              <Package className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {item.name}
                            </div>
                            {item.productId && (
                              <div className="text-sm text-gray-500">
                                ID: {item.productId}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.price.toLocaleString()} FCFA
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {(item.price * item.quantity).toLocaleString()} FCFA
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Sous-total</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatPrice(order.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Frais de livraison</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatPrice(order.delivery_cost)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-medium pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatPrice(order.total_amount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chronologie */}
          <Card>
            <CardHeader>
              <CardTitle>Chronologie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-6">
                {/* Création commande */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
                    <Clock className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Commande créée
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {format(order.metadata.createdAt, "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </div>
                  </div>
                </div>

                {/* Statut paiement */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
                    <CreditCard className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {order.metadata.paymentStatus === 'completed' ? 'Paiement reçu' : 'Paiement en attente'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {getPaymentMethodLabel(order.payment_method)}
                        </div>
                      </div>
                      {order.metadata.paymentStatus !== 'completed' && (
                        <Button
                          size="sm"
                          onClick={() => updateOrderPaymentStatus('completed')}
                          className="bg-brand-blue hover:bg-brand-blue/90"
                        >
                          Marquer comme payé
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Statut livraison */}
                {order.status !== 'cancelled' && (
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-900/20">
                      <Truck className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {getOrderStatusLabel(order.status)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {format(order.metadata.updatedAt, "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {order.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus('processing')}
                              className="bg-brand-blue hover:bg-brand-blue/90"
                            >
                              Confirmer la commande
                            </Button>
                          )}
                          {order.status === 'processing' && (
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus('shipped')}
                              className="bg-brand-blue hover:bg-brand-blue/90"
                            >
                              Marquer comme expédiée
                            </Button>
                          )}
                          {order.status === 'shipped' && (
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus('delivered')}
                              className="bg-brand-blue hover:bg-brand-blue/90"
                            >
                              Marquer comme livrée
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale (1/3) */}
        <div className="space-y-6">
          {/* Client */}
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">
                      {order.first_name} {order.last_name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div className="flex gap-2">
                      <a 
                        href={`tel:${order.phone}`} 
                        className="text-brand-blue hover:underline"
                        title="Appeler"
                      >
                        {order.phone}
                      </a>
                      <span className="text-gray-300">|</span>
                      <a
                        href={`sms:${order.phone}`}
                        className="text-brand-blue hover:underline"
                        title="Envoyer un SMS"
                      >
                        SMS
                      </a>
                    </div>
                  </div>

                  {order.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a 
                        href={`mailto:${order.email}`}
                        className="text-brand-blue hover:underline"
                      >
                        {order.email}
                      </a>
                    </div>
                  )}

                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="text-gray-600 dark:text-gray-300">
                      {order.address}<br />
                      {order.city}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Paiement */}
          <Card>
            <CardHeader>
              <CardTitle>Paiement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {getPaymentMethodLabel(order.payment_method)}
                    </span>
                  </div>
                  <Badge 
                    className={cn(
                      "text-sm",
                      order.metadata.paymentStatus === 'completed' ? 
                        'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 
                        'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                    )}
                  >
                    {order.metadata.paymentStatus === 'completed' ? 'Payé' : 'En attente'}
                  </Badge>
                </div>

                {order.metadata.paymentId && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Transaction ID: {order.metadata.paymentId}
                  </div>
                )}

                {order.metadata.paymentStatus !== 'completed' && (
                  <Button
                    onClick={() => updateOrderPaymentStatus('completed')}
                    className="w-full bg-brand-blue hover:bg-brand-blue/90 mt-4"
                  >
                    Marquer comme payé
                  </Button>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Sous-total</span>
                      <span>{formatPrice(order.total_amount - (order.delivery_cost || 0))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Livraison</span>
                      <span>{formatPrice(order.delivery_cost || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>Total</span>
                      <span>{formatPrice(order.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {order.order_details || order.notes || order.metadata?.notes || 'Aucune note'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}