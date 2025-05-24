// scripts/migration/migrateImages.ts
import 'dotenv/config';
import path from 'path';
import fs from 'fs/promises';
import { v2 as cloudinary } from 'cloudinary';

// Configuration de Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function migrateImages() {
  const productsDir = path.join(process.cwd(), 'public/images/products');
  
  try {
    const files = await fs.readdir(productsDir);
    const imageFiles = files.filter(file => 
      ['.jpg', '.jpeg', '.png'].includes(path.extname(file).toLowerCase())
    );

    console.log(`Found ${imageFiles.length} images to migrate`);
    console.log('Using Cloudinary config:', {
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY?.slice(-4) // Afficher seulement les 4 derniers caractères pour la sécurité
    });

    for (const filename of imageFiles) {
      try {
        console.log(`Processing ${filename}...`);
        const filePath = path.join(productsDir, filename);
        const productId = filename.split('-')[0];

        // Upload vers Cloudinary en utilisant directement l'API Node.js
        const result = await cloudinary.uploader.upload(filePath, {
          folder: `products/${productId}`,
          resource_type: 'image',
          use_filename: true,
          unique_filename: false,
          overwrite: true
        });

        console.log(`✅ Successfully migrated ${filename}:`, {
          url: result.secure_url,
          publicId: result.public_id
        });
      } catch (error) {
        console.error(`❌ Failed to migrate ${filename}:`, error);
      }
    }

    console.log('Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Vérification des variables d'environnement requises
if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
  throw new Error('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not defined');
}
if (!process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY) {
  throw new Error('NEXT_PUBLIC_CLOUDINARY_API_KEY is not defined');
}
if (!process.env.CLOUDINARY_API_SECRET) {
  throw new Error('CLOUDINARY_API_SECRET is not defined');
}

// Exécuter la migration
migrateImages().catch(console.error);