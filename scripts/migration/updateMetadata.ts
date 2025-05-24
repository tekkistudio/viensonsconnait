// scripts/migration/updateMetadata.ts
import 'dotenv/config';
import { supabase } from '../../src/lib/supabase';
import type { CloudinaryImage } from '../../src/types/product';

const CLOUDINARY_IMAGES: Record<string, CloudinaryImage[]> = {
    'e692369c-e2f6-420f-a6b1-9ed592e14115': [ // couples non mariés
      {
        url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1/products/couples/couples-1.jpg',
        publicId: 'products/couples/couples-1'
      },
      {
        url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1/products/couples/couples-2.jpg',
        publicId: 'products/couples/couples-2'
      }
    ],
    '6da8c128-3828-45f9-961a-c61adba787f3': [ // couples mariés
      {
        url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1/products/maries/maries-1.jpg',
        publicId: 'products/maries/maries-1'
      },
      {
        url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1/products/maries/maries-2.jpg',
        publicId: 'products/maries/maries-2'
      }
    ],
    '9657fe13-1686-4453-88e4-af4449b3e2ef': [ // famille
      {
        url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1/products/famille/famille-1.jpg',
        publicId: 'products/famille/famille-1'
      },
      {
        url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1/products/famille/famille-2.jpg',
        publicId: 'products/famille/famille-2'
      }
    ],
    '3474c719-ff8b-4a1b-a20c-6f75b5c61f99': [ // amis
      {
        url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1/products/amis/amis-1.jpg',
        publicId: 'products/amis/amis-1'
      },
      {
        url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1/products/amis/amis-2.jpg',
        publicId: 'products/amis/amis-2'
      }
    ],
    '1b69269e-1094-4a62-94bb-cdcb6769301a': [ // collègues
      {
        url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1/products/collegues/collegues-1.jpg',
        publicId: 'products/collegues/collegues-1'
      },
      {
        url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1/products/collegues/collegues-2.jpg',
        publicId: 'products/collegues/collegues-2'
      }
    ],
    '1df3cd1e-b56c-4b3a-a034-617db78ed622': [ // st-valentin
      {
        url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1/products/stvalentin/stvalentin-1.jpg',
        publicId: 'products/stvalentin/stvalentin-1'
      },
      {
        url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1/products/stvalentin/stvalentin-2.jpg',
        publicId: 'products/stvalentin/stvalentin-2'
      }
    ]
  };

async function updateSingleProduct(productId: string, images: CloudinaryImage[]) {
  try {
    // 1. Récupérer les données actuelles
    const { data: currentProduct, error: fetchError } = await supabase
      .from('products')
      .select('metadata')
      .eq('id', productId)
      .single();

    if (fetchError) {
      throw new Error(`Fetch error for ${productId}: ${fetchError.message}`);
    }

    // 2. Préparer les nouvelles métadonnées
    const currentMetadata = currentProduct?.metadata || {};
    const newMetadata = {
      ...currentMetadata,
      images: JSON.parse(JSON.stringify(images)) // Force deep clone
    };

    console.log(`\nUpdating product ${productId}`);
    console.log('New metadata:', JSON.stringify(newMetadata, null, 2));

    // 3. Mettre à jour avec une requête RPC personnalisée
    const { error: updateError } = await supabase
      .rpc('update_product_metadata', {
        p_product_id: productId,
        p_metadata: newMetadata
      });

    if (updateError) {
      throw new Error(`Update error for ${productId}: ${updateError.message}`);
    }

    // 4. Vérifier la mise à jour
    const { data: verifyProduct, error: verifyError } = await supabase
      .from('products')
      .select('metadata')
      .eq('id', productId)
      .single();

    if (verifyError) {
      throw new Error(`Verify error for ${productId}: ${verifyError.message}`);
    }

    const hasImages = verifyProduct?.metadata?.images?.length > 0;
    console.log(`✅ Product ${productId} updated`);
    console.log(`Has images: ${hasImages ? 'Yes' : 'No'}`);
    if (hasImages) {
      console.log(`Number of images: ${verifyProduct.metadata.images.length}`);
    }

    return true;
  } catch (error) {
    console.error(`Failed to update product ${productId}:`, error);
    return false;
  }
}

async function updateAllProducts() {
  console.log('Starting metadata update...');
  
  for (const [productId, images] of Object.entries(CLOUDINARY_IMAGES)) {
    await updateSingleProduct(productId, images);
  }
  
  console.log('\nMetadata update completed!');
}

// Fonction principale
async function main() {
  try {
    // Vérifier la connexion
    const { data, error } = await supabase.from('products').select('id').limit(1);
    if (error) throw error;
    
    console.log('✅ Connected to Supabase');
    
    // Créer la fonction RPC si elle n'existe pas
    const createRpcSql = `
      CREATE OR REPLACE FUNCTION update_product_metadata(p_product_id uuid, p_metadata jsonb)
      RETURNS void AS $$
      BEGIN
        UPDATE products
        SET metadata = p_metadata
        WHERE id = p_product_id;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error: rpcError } = await supabase.rpc('update_product_metadata', {
      p_product_id: data[0].id,
      p_metadata: {}
    });

    if (rpcError && !rpcError.message.includes('does not exist')) {
      throw rpcError;
    }

    await updateAllProducts();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();