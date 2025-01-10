// src/components/media/ImageCropper.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Crop, X } from 'lucide-react'

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperProps {
  imageUrl: string;
  aspectRatio?: number;
  onCrop: (cropArea: CropArea) => void;
  onCancel: () => void;
}

export default function ImageCropper({ imageUrl, aspectRatio, onCrop, onCancel }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    const image = new Image();
    image.src = imageUrl;
    image.onload = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Ajuster la taille du canvas
          canvas.width = image.width;
          canvas.height = image.height;
          
          // Dessiner l'image
          ctx.drawImage(image, 0, 0);
          
          // Initialiser la zone de recadrage
          const initialCrop = {
            x: image.width * 0.1,
            y: image.height * 0.1,
            width: image.width * 0.8,
            height: aspectRatio 
              ? (image.width * 0.8) / aspectRatio 
              : image.height * 0.8
          };
          setCropArea(initialCrop);
          drawCropOverlay(ctx, initialCrop);
        }
      }
    };
  }, [imageUrl, aspectRatio]);

  const drawCropOverlay = (ctx: CanvasRenderingContext2D, crop: CropArea) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redessiner l'image
    const image = new Image();
    image.src = imageUrl;
    ctx.drawImage(image, 0, 0);
    
    // Dessiner l'overlay semi-transparent
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Effacer la zone de recadrage pour la rendre visible
    ctx.clearRect(crop.x, crop.y, crop.width, crop.height);
    
    // Dessiner le cadre de recadrage
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCropStart({ x, y });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (ctx) {
      let width = x - cropStart.x;
      let height = aspectRatio ? width / aspectRatio : y - cropStart.y;
      
      // Assurer que la zone de recadrage reste dans les limites du canvas
      width = Math.min(width, canvas.width - cropStart.x);
      height = Math.min(height, canvas.height - cropStart.y);
      
      const newCropArea = {
        x: cropStart.x,
        y: cropStart.y,
        width: Math.abs(width),
        height: Math.abs(height)
      };
      
      setCropArea(newCropArea);
      drawCropOverlay(ctx, newCropArea);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-4 max-w-4xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Recadrer l'image</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="overflow-auto">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="max-w-full cursor-crosshair"
          />
        </div>
        
        <div className="flex justify-end gap-4 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Annuler
          </button>
          <button
            onClick={() => onCrop(cropArea)}
            className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-pink transition-colors flex items-center gap-2"
          >
            <Crop className="w-4 h-4" />
            Recadrer
          </button>
        </div>
      </div>
    </div>
  );
}