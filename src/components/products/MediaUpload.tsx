// components/products/MediaUpload.tsx
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Image as ImageIcon, Video, X, Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { cloudinaryService } from '@/lib/services/cloudinaryService';

export interface MediaUpload {
  url: string;
  publicId: string;
  type: 'image' | 'video';
  thumbnail?: string;
}

interface MediaUploadProps {
  onUpload: (files: MediaUpload[]) => void;
  value?: MediaUpload[];
  maxFiles?: number;
  acceptedTypes?: string[];
  maxFileSize?: number; // en bytes, par défaut 5MB
}

export function MediaUpload({
  onUpload,
  value = [],
  maxFiles = 5,
  acceptedTypes = ['image/*', 'video/*'],
  maxFileSize = 5 * 1024 * 1024 // 5MB par défaut
}: MediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const uploadToCloudinary = async (file: File): Promise<MediaUpload> => {
    try {
      const data = await cloudinaryService.upload(file, 'products_upload', 'products');
      
      return {
        url: data.secure_url,
        publicId: data.public_id,
        type: data.resource_type === 'image' ? 'image' : 'video',
        thumbnail: data.resource_type === 'video' ? data.thumbnail_url : undefined
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Validation de la taille des fichiers
      const oversizedFiles = acceptedFiles.filter(file => file.size > maxFileSize);
      if (oversizedFiles.length > 0) {
        throw new Error(`Les fichiers ne doivent pas dépasser ${maxFileSize / (1024 * 1024)}MB`);
      }

      // Validation des types de fichiers
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'];
      const invalidFiles = acceptedFiles.filter(file => !validTypes.includes(file.type));
      if (invalidFiles.length > 0) {
        throw new Error('Types de fichiers non supportés. Utilisez JPG, PNG, GIF, MP4 ou WEBM');
      }

      const totalFiles = acceptedFiles.length;
      let completedFiles = 0;

      const uploadPromises = acceptedFiles.map(async (file) => {
        const result = await uploadToCloudinary(file);
        completedFiles++;
        setUploadProgress((completedFiles / totalFiles) * 100);
        return result;
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      onUpload([...value, ...uploadedFiles].slice(0, maxFiles));
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors du téléchargement');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [value, maxFiles, onUpload, maxFileSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, curr) => ({ ...acc, [curr]: [] }), {}),
    maxFiles: maxFiles - value.length,
    disabled: isUploading || value.length >= maxFiles,
    maxSize: maxFileSize
  });

  const removeMedia = (index: number) => {
    if (value[index]?.publicId) {
      cloudinaryService.delete(value[index].publicId).catch(console.error);
    }
    const newValue = [...value];
    newValue.splice(index, 1);
    onUpload(newValue);
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="ml-2">{error}</span>
        </Alert>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {value.map((file, index) => (
          <div key={file.publicId} className="relative aspect-square group">
            {file.type === 'image' ? (
              <div className="relative w-full h-full">
                <Image
                  src={file.url}
                  alt="Media upload"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            ) : (
              <div className="relative w-full h-full">
                <Image
                  src={file.thumbnail || ''}
                  alt="Video thumbnail"
                  fill
                  className="object-cover rounded-lg"
                />
                <Video className="absolute inset-0 m-auto w-8 h-8 text-white" />
              </div>
            )}
            <Button
              onClick={() => removeMedia(index)}
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}

        {value.length < maxFiles && (
          <div
            {...getRootProps()}
            className={cn(
              "relative aspect-square rounded-lg border-2 border-dashed transition-colors",
              isDragActive 
                ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950" 
                : "border-gray-300 dark:border-gray-700",
              isUploading && "opacity-50 cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              {isUploading ? (
                <div className="w-full space-y-2">
                  <div className="flex justify-center">
                    <Upload className="w-6 h-6 text-blue-500 animate-bounce" />
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-center text-gray-500">
                    Téléchargement en cours... {Math.round(uploadProgress)}%
                  </p>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    {isDragActive 
                      ? "Déposez les fichiers ici"
                      : "Cliquez ou déposez vos fichiers"}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Formats acceptés : JPG, PNG, GIF, MP4, WEBM. 
        Max {maxFiles} fichiers, {maxFileSize / 1024 / 1024}MB par fichier.
      </p>
    </div>
  );
}