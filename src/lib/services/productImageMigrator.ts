// src/lib/services/productImageMigrator.ts
import { cloudinaryService } from './cloudinaryService';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export async function migrateProductImages() {
  try {
    // 1. Lire chaque image du dossier public/images/products
    const publicDir = path.join(process.cwd(), 'public/images/products');
    const files = fs.readdirSync(publicDir);
    
    for (const file of files) {
      // 2. Upload vers Cloudinary
      const filePath = path.join(publicDir, file);
      const fileData = fs.readFileSync(filePath);
      const result = await cloudinaryService.upload(
        new File([fileData], file),
        'products_upload',
        'products'
      );
      
      // 3. Mettre à jour les URLs dans Supabase
      const productId = file.split('-')[0]; // Exemple: couples-1.jpg -> couples
      const { data: product } = await supabase
        .from('products')
        .select('metadata')
        .eq('id', productId)
        .single();
        
      if (product) {
        const metadata = product.metadata || {};
        metadata.images = metadata.images.map((img: string) => 
          img === `/images/products/${file}` ? result.secure_url : img
        );
        
        await supabase
          .from('products')
          .update({ metadata })
          .eq('id', productId);
      }
    }
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}