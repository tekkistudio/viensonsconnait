// src/app/admin/products/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search,
  AlertCircle,
  BarChart3,
  ShoppingBag,
  Edit,
  Archive,
  Trash2,
  LayoutGrid,
  List,
  Loader2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ProductDialog } from '@/components/admin/products/ProductDialog';
import { adminProductService } from '@/lib/services/adminProductService';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AdminProduct } from '@/types/product';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [productToDelete, setProductToDelete] = useState<AdminProduct | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [stats, setStats] = useState<ProductStats>({
    totalProducts: 0,
    activeProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  });

  const { toast } = useToast();

  const fetchProducts = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const fetchedProducts = await adminProductService.getAllProducts();
      setProducts(fetchedProducts);
      calculateStats(fetchedProducts);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du chargement des produits';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filter]);

  const calculateStats = (productsData: AdminProduct[]) => {
    try {
      const stats = {
        totalProducts: productsData.length,
        activeProducts: productsData.filter(p => p.status === 'active').length,
        lowStock: productsData.filter(p => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= 5).length,
        outOfStock: productsData.filter(p => !p.stock_quantity || p.stock_quantity === 0).length,
        totalValue: productsData.reduce((sum, p) => sum + ((p.stock_quantity || 0) * (p.price || 0)), 0)
      };
      setStats(stats);
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const handleDeleteProduct = async (product: AdminProduct) => {
    setProductToDelete(product);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete?.id) return;
    
    setProcessingAction(`delete-${productToDelete.id}`);
    try {
      await adminProductService.deleteProduct(productToDelete.id);
      toast({
        title: "Succès",
        description: "Le produit a été supprimé"
      });
      await fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer le produit"
      });
    } finally {
      setProcessingAction(null);
      setShowDeleteDialog(false);
      setProductToDelete(null);
    }
  };

  const handleAddProduct = async (productData: Partial<AdminProduct>) => {
    setProcessingAction('add');
    try {
      const newProduct = await adminProductService.createProduct(productData);
      toast({
        title: "Succès",
        description: "Le produit a été ajouté avec succès"
      });
      setIsAddDialogOpen(false);
      await fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'ajouter le produit"
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleUpdateProduct = async (productData: Partial<AdminProduct>) => {
    if (!selectedProduct?.id) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "ID du produit manquant"
      });
      return;
    }
    
    setProcessingAction('update');
    try {
      await adminProductService.updateProduct(selectedProduct.id, productData);
      
      toast({
        title: "Succès",
        description: "Le produit a été mis à jour"
      });
      
      setSelectedProduct(null);
      await fetchProducts();
      
    } catch (error) {
      console.error('Error updating product:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Une erreur inattendue s'est produite lors de la mise à jour du produit";
      
      toast({
        variant: "destructive",
        title: "Erreur de mise à jour",
        description: errorMessage
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleStatusChange = async (productId: string, newStatus: AdminProduct['status']) => {
    setProcessingAction(`status-${productId}`);
    try {
      await adminProductService.updateProductStatus(productId, newStatus);
      toast({
        title: "Succès",
        description: `Le statut du produit a été mis à jour`
      });
      await fetchProducts();
    } catch (error) {
      console.error('Error updating product status:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour le statut"
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const getStockStatus = (quantity: number = 0) => {
    if (quantity === 0) return { label: 'Rupture', color: 'bg-red-100 text-red-800' };
    if (quantity <= 5) return { label: 'Stock bas', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'En stock', color: 'bg-green-100 text-green-800' };
  };

  const filteredProducts = products
    .filter(product => filter === 'all' || product.status === filter)
    .filter(product => 
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const renderProductList = () => {
    if (viewMode === 'list') {
      return (
        <div className="space-y-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                {product.metadata?.images?.[0] ? (
                  <img
                    src={product.metadata.images[0].url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-8 h-8 text-gray-400" />
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-1">{product.description}</p>
                <div className="mt-2 flex items-center gap-4">
                  <span className="text-lg font-bold">{product.price?.toLocaleString()} FCFA</span>
                  <Badge variant="outline" className="text-xs">
                    {product.metadata?.category || 'Non catégorisé'}
                  </Badge>
                  <span className="text-sm text-gray-600">Stock: {product.stock_quantity || 0}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProduct(product)}
                  className="text-blue-600"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStatusChange(product.id as string, product.status === 'archived' ? 'active' : 'archived')}
                  disabled={!!processingAction}
                  className={product.status === 'archived' ? 'text-green-600' : 'text-red-600'}
                >
                  <Archive className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteProduct(product)}
                  disabled={!!processingAction}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => {
          const stockStatus = getStockStatus(product.stock_quantity);

          return (
            <Card key={product.id} className="overflow-hidden">
              <div className="relative h-48 bg-gray-100">
                {product.metadata?.images?.[0] ? (
                  <img
                    src={product.metadata.images[0].url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.src = '/images/placeholder.jpg';
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusChange(
                        product.id as string,
                        product.status === 'archived' ? 'active' : 'archived'
                      )}
                      className={product.status === 'archived' ? 'text-green-600' : 'text-red-600'}
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteProduct(product)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">
                      {product.price?.toLocaleString()} FCFA
                    </span>
                    <Badge className={stockStatus.color}>
                      {stockStatus.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    {product.metadata?.players && (
                      <div>
                        <span className="text-gray-500">Joueurs :</span>
                        <br />
                        {product.metadata.players}
                      </div>
                    )}
                    {product.metadata?.duration && (
                      <div>
                        <span className="text-gray-500">Durée :</span>
                        <br />
                        {product.metadata.duration}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <div className="text-sm">
                      Stock: {product.stock_quantity || 0}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {product.metadata?.category || 'Non catégorisé'}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
          <p className="text-gray-500">Chargement des produits...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          onClick={fetchProducts} 
          variant="outline" 
          className="mt-4"
        >
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez votre catalogue de produits
          </p>
        </div>
        <Button 
          className="bg-brand-blue hover:bg-brand-blue/90"
          onClick={() => setIsAddDialogOpen(true)}
          disabled={!!processingAction}
        >
          {processingAction === 'add' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Ajout en cours...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un produit
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total produits</p>
              <p className="text-2xl font-bold">{stats.totalProducts}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Actifs</p>
              <p className="text-2xl font-bold">{stats.activeProducts}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Stock critique</p>
              <p className="text-2xl font-bold">{stats.lowStock}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Valeur stock</p>
              <p className="text-xl font-bold">
                {stats.totalValue.toLocaleString()} FCFA
              </p>
            </div>
          </div>
        </Card>
      </div>

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

        <div className="flex gap-2">
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

          <div className="flex rounded-lg border bg-white">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-gray-100' : ''}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-gray-100' : ''}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          </div>
      </div>

      {filteredProducts.length > 0 ? (
        renderProductList()
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
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

      <ProductDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddProduct}
      />

      {selectedProduct && (
        <ProductDialog
          open={true}
          onOpenChange={() => setSelectedProduct(null)}
          onSubmit={(productData) => handleUpdateProduct(productData)}
          initialData={selectedProduct}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation de suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!processingAction}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!!processingAction}
            >
              {processingAction?.startsWith('delete') ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}