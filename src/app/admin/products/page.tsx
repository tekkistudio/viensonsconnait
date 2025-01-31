'use client';

import { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ShoppingBag,
  Edit,
  Archive,
  Loader2,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ProductDialog } from '@/components/products/ProductDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compare_at_p: number | null;
  status: 'active' | 'draft' | 'archived';
  stock_quantity: number;
  metadata: {
    players?: string;
    duration?: string;
    language?: string;
    category?: string;
    min_age?: number;
    highlights?: string[];
  } | null;
  created_at: string;
  updated_at: string;
  media?: Array<{
    url: string;
    publicId: string;
    type: 'image' | 'video';
    thumbnail?: string;
  }>;
}

interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 0 });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<ProductStats>({
    totalProducts: 0,
    activeProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, [filter]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('products')
        .select('*');

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setProducts(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les produits"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (productsData: Product[]) => {
    const stats = {
      totalProducts: productsData.length,
      activeProducts: productsData.filter(p => p.status === 'active').length,
      lowStock: productsData.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5).length,
      outOfStock: productsData.filter(p => p.stock_quantity === 0).length,
      totalValue: productsData.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0)
    };
    setStats(stats);
  };

  const handleAddProduct = async (productData: any) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          ...productData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      toast({
        variant: "success",
        title: "Succès",
        description: "Le produit a été ajouté avec succès"
      });

      setIsAddDialogOpen(false);
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter le produit"
      });
    }
  };

  const updateProductStatus = async (productId: string, status: 'active' | 'archived') => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;

      toast({
        variant: "success",
        title: "Succès",
        description: `Le produit a été ${status === 'archived' ? 'archivé' : 'activé'}`
      });

      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le produit"
      });
    }
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: 'Rupture', color: 'bg-red-100 text-red-800' };
    if (quantity <= 5) return { label: 'Stock bas', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'En stock', color: 'bg-green-100 text-green-800' };
  };

  const applyFilters = () => {
    setIsFiltersDialogOpen(false);
  };

  const filteredProducts = products.filter(product => {
    // Filtre de recherche
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtre de statut
    const matchesStatus = filter === 'all' || product.status === filter;
    
    // Filtre de prix
    const matchesPrice = 
      (!priceRange.min || product.price >= priceRange.min) &&
      (!priceRange.max || product.price <= priceRange.max);
    
    // Filtre de catégories
    const matchesCategory = 
      selectedCategories.length === 0 || 
      (product.metadata?.category && selectedCategories.includes(product.metadata.category));

    return matchesSearch && matchesStatus && matchesPrice && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }
    return (
      <div className="space-y-6 p-6">
        {/* En-tête et actions */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Produits
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Gérez votre catalogue de produits
            </p>
          </div>
          <>
            <Button 
              className="bg-brand-blue hover:bg-brand-blue/90"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un produit
            </Button>
            <ProductDialog 
              open={isAddDialogOpen} 
              onOpenChange={setIsAddDialogOpen} 
              onSubmit={handleAddProduct} 
            />
          </>
        </div>
  
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total produits</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalProducts}
                </p>
              </div>
            </div>
          </Card>
  
          <Card className="p-4 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Actifs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.activeProducts}
                </p>
              </div>
            </div>
          </Card>
  
          <Card className="p-4 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Stock critique</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.lowStock}
                </p>
              </div>
            </div>
          </Card>
  
          <Card className="p-4 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Valeur stock</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalValue.toLocaleString()} FCFA
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filtres et recherche */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les produits</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="draft">Brouillons</SelectItem>
            <SelectItem value="archived">Archivés</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={isFiltersDialogOpen} onOpenChange={setIsFiltersDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Plus de filtres
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Filtres avancés</DialogTitle>
              <DialogDescription>
                Affinez votre recherche de produits
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Prix */}
              <div className="space-y-2">
                <Label>Plage de prix</Label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min || ''}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max || ''}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>

              {/* Catégories */}
              <div className="space-y-2">
                <Label>Catégories</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from(new Set(products.map(p => p.metadata?.category).filter(Boolean))).map((category) => (
                    <div key={category} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={category}
                        checked={selectedCategories.includes(category!)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCategories(prev => [...prev, category!]);
                          } else {
                            setSelectedCategories(prev => prev.filter(c => c !== category));
                          }
                        }}
                      />
                      <label htmlFor={category}>{category}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFiltersDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={applyFilters}>
                Appliquer les filtres
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des produits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product.stock_quantity);
            return (
              <Card key={product.id} className="overflow-hidden">
                {/* Image du produit */}
                <div className="relative h-48 bg-gray-100 dark:bg-gray-800">
                  {product.media && product.media[0] ? (
                    product.media[0].type === 'image' ? (
                      <img
                        src={product.media[0].url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="relative w-full h-full">
                        <img
                          src={product.media[0].thumbnail || ''}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        <video className="absolute inset-0 w-8 h-8 m-auto" />
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="w-12 h-12 text-gray-400" />
                    </div>
                  )}

                  {product.compare_at_p && product.compare_at_p > product.price && (
                    <Badge className="absolute top-2 right-2 bg-red-500 text-white">
                      Promo
                    </Badge>
                  )}
                </div>

                <div className="p-4">
                  {/* En-tête avec titre et menu */}
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {product.description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => updateProductStatus(product.id, product.status === 'archived' ? 'active' : 'archived')}
                        className={product.status === 'archived' ? 'text-green-600' : 'text-red-600'}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Prix */}
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {product.price.toLocaleString()} FCFA
                        </span>
                        {product.compare_at_p && product.compare_at_p > product.price && (
                          <div className="text-sm text-gray-500 line-through">
                            {product.compare_at_p.toLocaleString()} FCFA
                          </div>
                        )}
                      </div>
                      <Badge className={cn("text-xs", stockStatus.color)}>
                        {stockStatus.label}
                      </Badge>
                    </div>

                    {/* Métadonnées */}
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300 mt-2">
                      {product.metadata?.players && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Joueurs :</span>
                          <br />
                          {product.metadata.players}
                        </div>
                      )}
                      {product.metadata?.duration && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Durée :</span>
                          <br />
                          {product.metadata.duration}
                        </div>
                      )}
                    </div>

                    {/* Statistiques */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-sm">
                        Stock: {product.stock_quantity}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {product.metadata?.category || 'Non catégorisé'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
            <Package className="w-12 h-12 mb-4 opacity-50" />
            {searchTerm ? (
              <p>Aucun produit ne correspond à votre recherche</p>
            ) : (
              <>
                <p className="mb-2">Aucun produit pour le moment</p>
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  variant="outline"
                  className="mt-2"
                >
                  Ajouter un produit
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}