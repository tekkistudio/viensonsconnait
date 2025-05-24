// src/app/admin/settings/media/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Image as ImageIcon, 
  Upload,
  Search,
  Filter,
  Trash2,
  Loader2,
  AlertCircle,
  Grid,
  List,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MediaUpload, type MediaUpload as MediaUploadType } from '@/components/admin/products/MediaUpload';
import { mediaService, type MediaAsset } from '@/lib/services/mediaService';
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
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDebounce } from '@/hooks/useDebounce';

const ITEMS_PER_PAGE = 24;

export default function MediaPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { toast } = useToast();

  const fetchAssets = useCallback(async (cursor?: string | null, newSearch = false) => {
    try {
      setError(null);
      if (newSearch) {
        setIsLoading(true);
      }
  
      const result = await mediaService.listAssets({
        maxResults: ITEMS_PER_PAGE,
        nextCursor: cursor || undefined,  // Conversion explicite pour l'API
        resourceType: 'image'
      });
  
      if (newSearch) {
        setAssets(result.assets);
      } else {
        setAssets(prev => [...prev, ...result.assets]);
      }
      
      setHasMore(!!result.nextCursor);  
      setNextCursor(result.nextCursor);  
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du chargement des médias';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    setCurrentPage(1);
    fetchAssets(undefined, true);
  }, [debouncedSearchTerm, fetchAssets]);

  const handleLoadMore = () => {
    if (!hasMore || isLoading) return;
    setCurrentPage(prev => prev + 1);
    fetchAssets(nextCursor);
  };

  const handleDeleteAsset = (asset: MediaAsset) => {
    setSelectedAsset(asset);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedAsset) return;
    
    setProcessingAction(`delete-${selectedAsset.id}`);
    try {
      await mediaService.deleteAsset(selectedAsset.publicId);
      toast({
        title: "Succès",
        description: "Le fichier a été supprimé"
      });
      await fetchAssets(undefined, true);
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer le fichier"
      });
    } finally {
      setProcessingAction(null);
      setShowDeleteDialog(false);
      setSelectedAsset(null);
    }
  };

  const handleUpload = async (uploaded: MediaUploadType[]) => {
    if (uploaded.length === 0) return;
    
    try {
      toast({
        title: "Succès",
        description: `${uploaded.length} fichier(s) téléchargé(s)`
      });
      
      await fetchAssets(undefined, true);
      setIsUploadOpen(false);
    } catch (error) {
      console.error('Error handling upload:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors du traitement des fichiers téléchargés"
      });
    }
  };

  const filteredAssets = assets.filter(asset => 
    asset.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const renderAssetList = () => {
    if (viewMode === 'list') {
      return (
        <div className="space-y-2">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="p-4 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {asset.resourceType === 'image' ? (
                    <img
                      src={asset.url}
                      alt={asset.altText || asset.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={asset.url}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{asset.title}</h3>
                  <div className="mt-1 text-sm text-gray-500 space-y-1">
                    <p>Type : {asset.format.toUpperCase()}</p>
                    <p>Taille : {formatFileSize(asset.fileSize)}</p>
                    <p>Dimensions : {asset.width} × {asset.height}</p>
                    {asset.references && asset.references.length > 0 && (
                      <p className="text-brand-blue">
                        Utilisé dans {asset.references.length} endroit{asset.references.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAsset(asset)}
                    disabled={!!processingAction}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {processingAction === `delete-${asset.id}` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredAssets.map((asset) => (
          <Card key={asset.id} className="overflow-hidden group hover:shadow-md transition-all duration-200">
            <div className="aspect-square bg-gray-100 relative">
              {asset.resourceType === 'image' ? (
                <img
                  src={asset.url}
                  alt={asset.altText || asset.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={asset.url}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteAsset(asset)}
                  disabled={!!processingAction}
                  className="text-white hover:text-red-400"
                >
                  {processingAction === `delete-${asset.id}` ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="p-2">
              <p className="text-sm font-medium truncate">{asset.title}</p>
              <p className="text-xs text-gray-500">{formatFileSize(asset.fileSize)}</p>
              {asset.references && asset.references.length > 0 && (
                <p className="text-xs text-brand-blue mt-1">
                  Utilisé ({asset.references.length})
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  if (isLoading && assets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
          <p className="text-gray-500">Chargement des médias...</p>
        </div>
      </div>
    );
  }

  if (error && assets.length === 0) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          onClick={() => fetchAssets(undefined, true)} 
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
          <h1 className="text-2xl font-bold text-gray-900">Fichiers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez vos images et vidéos
          </p>
        </div>
        <Button 
          className="bg-brand-blue hover:bg-brand-blue/90"
          onClick={() => setIsUploadOpen(true)}
        >
          <Upload className="w-4 h-4 mr-2" />
          Importer des fichiers
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher un fichier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex rounded-lg border bg-white">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-gray-100' : ''}
            >
              <Grid className="w-4 h-4" />
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

      {/* Liste des fichiers */}
      {filteredAssets.length > 0 ? (
        <>
          {renderAssetList()}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  'Charger plus'
                )}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
          {searchTerm ? (
            <p>Aucun fichier ne correspond à votre recherche</p>
          ) : (
            <>
              <p className="mb-2">Aucun fichier pour le moment</p>
              <Button
                onClick={() => setIsUploadOpen(true)}
                variant="outline"
                className="mt-2"
              >
                Importer des fichiers
              </Button>
            </>
          )}
        </div>
      )}

      {/* Dialog d'upload */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importer des fichiers</DialogTitle>
            <DialogDescription>
              Sélectionnez les fichiers à importer. Formats acceptés : JPG, PNG, GIF, MP4.
            </DialogDescription>
          </DialogHeader>
          
          <MediaUpload
            value={[]}
            onUpload={handleUpload}
            acceptedTypes={['image/*', 'video/*']}
            maxFiles={10}
            maxFileSize={10 * 1024 * 1024} // 10MB
            folder="products"
            preset="products_upload"
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUploadOpen(false)}
            >
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation de suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce fichier ? Cette action est irréversible.
              {selectedAsset?.references && selectedAsset.references.length > 0 && (
                <div className="mt-2 text-red-500">
                  Attention : ce fichier est utilisé dans {selectedAsset.references.length} endroit(s).
                </div>
              )}
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