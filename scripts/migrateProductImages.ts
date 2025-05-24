// src/scripts/migrateProductImages.ts
import { cloudinaryService } from '@/lib/services/cloudinaryService';
import { supabase } from '@/lib/supabase';
import fs from 'fs/promises';
import path from 'path';

interface ProductImage {
  publicId: string;
  secureUrl: string;
  productId: string;
}

async function migrateProductImages() {
  try {
    console.log('Starting product images migration...');
    
    // 1. Récupérer tous les produits de Supabase
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name');

    if (error) throw error;

    const migratedImages: ProductImage[] = [];
    const publicDir = path.join(process.cwd(), 'public/images/products');

    // 2. Pour chaque produit
    for (const product of products) {
      console.log(`Processing product: ${product.name}`);

      // Chercher les images correspondantes
      const files = await fs.readdir(publicDir);
      const productImages = files.filter(file => file.startsWith(`${product.id}`));

      // Upload chaque image vers Cloudinary
      for (const imageName of productImages) {
        const imagePath = path.join(publicDir, imageName);
        const imageFile = await fs.readFile(imagePath);
        
        const uploadResult = await cloudinaryService.upload(
          new File([imageFile], imageName, { type: 'image/jpeg' }),
          'product_images',
          `products/${product.id}`
        );

        migratedImages.push({
          publicId: uploadResult.public_id,
          secureUrl: uploadResult.secure_url,
          productId: product.id
        });
      }

      // Mettre à jour les métadonnées du produit dans Supabase
      await supabase
        .from('products')
        .update({
          metadata: {
            images: migratedImages
              .filter(img => img.productId === product.id)
              .map(img => ({
                url: img.secureUrl,
                publicId: img.publicId
              }))
          }
        })
        .eq('id', product.id);
    }

    console.log('Migration completed successfully!');
    return migratedImages;

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

export { migrateProductImages };