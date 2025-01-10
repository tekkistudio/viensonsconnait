// src/components/media/MediaManager.tsx
'use client'

import { useState, useEffect } from 'react'
import { Upload, X, Loader2, Image as ImageIcon, Search } from 'lucide-react'
import { mediaService } from '@/features/media/services/mediaService';
import { Card, CardContent } from '../../components/ui/card'

interface MediaFile {
  url: string;
  path: string;
  name: string;
  size?: number;
  created_at?: string;
}

interface MediaManagerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export default function MediaManager({ onSelect, onClose }: MediaManagerProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      setFiles([]);
    } catch (error) {
      setError('Erreur lors du chargement des images');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
  
    const file = e.target.files[0];
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);
  
    try {
      const result = await mediaService.uploadImage(file);
      const newFile: MediaFile = {
        url: result.url,
        path: result.path,
        name: result.name,
        size: result.size,
        created_at: result.created_at
      };
      setFiles(prev => [newFile, ...prev]);
    } catch (err) {
      setError('Erreur lors de l\'upload');
      console.error('Erreur détaillée:', err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  const handleDelete = async (file: MediaFile) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette image ?')) return;
  
    try {
      await mediaService.deleteImage(file.path);
      setFiles(prev => prev.filter(f => f.path !== file.path));
    } catch (err) {
      setError('Erreur lors de la suppression');
      console.error('Erreur détaillée:', err);
    }
  };

  const filteredFiles = files.filter(file =>
    file.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Médiathèque</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search and Upload */}
        <div className="p-4 border-b space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <label className="block">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
            <div className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer transition-colors">
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-600">
                  <Upload className="w-6 h-6" />
                  <span>Déposer une image ou cliquer pour parcourir</span>
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Files Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-4">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune image trouvée</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {filteredFiles.map((file) => (
    <div
      key={file.path}
      className="group relative aspect-square border rounded-lg overflow-hidden hover:border-blue-500 cursor-pointer"
      onClick={() => onSelect(file.url)}
    >
      <img
        src={file.url}
        alt={file.name}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(file);
            }}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  ))}
</div>
          )}
        </div>
      </Card>
    </div>
  );
}