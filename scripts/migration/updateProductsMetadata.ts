// scripts/migration/updateProductsMetadata.ts
import 'dotenv/config';
import { supabase } from '../../src/lib/supabase';

interface CloudinaryImage {
  url: string;
  publicId: string;
}

const PRODUCT_IMAGES: Record<string, CloudinaryImage[]> = {
  'e692369c-e2f6-420f-a6b1-9ed592e14115': [ // couples non mariés
    {
      url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1738642215/products/couples/couples-1.jpg',
      publicId: 'products/couples/couples-1'
    },
    {
      url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1738642219/products/couples/couples-2.jpg',
      publicId: 'products/couples/couples-2'
    }
  ],
  '6da8c128-3828-45f9-961a-c61adba787f3': [ // couples mariés
    {
      url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1738642231/products/maries/maries-1.jpg',
      publicId: 'products/maries/maries-1'
    },
    {
      url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1738642235/products/maries/maries-2.jpg',
      publicId: 'products/maries/maries-2'
    }
  ],
  '9657fe13-1686-4453-88e4-af4449b3e2ef': [ // famille
    {
      url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1738642223/products/famille/famille-1.jpg',
      publicId: 'products/famille/famille-1'
    },
    {
      url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1738642226/products/famille/famille-2.jpg',
      publicId: 'products/famille/famille-2'
    }
  ],
  '3474c719-ff8b-4a1b-a20c-6f75b5c61f99': [ // amis
    {
      url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1738642203/products/amis/amis-1.jpg',
      publicId: 'products/amis/amis-1'
    },
    {
      url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1738642209/products/amis/amis-2.jpg',
      publicId: 'products/amis/amis-2'
    }
  ],
  '1b69269e-1094-4a62-94bb-cdcb6769301a': [ // collègues
    {
      url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1738642210/products/collegues/collegues-1.jpg',
      publicId: 'products/collegues/collegues-1'
    },
    {
      url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1738642211/products/collegues/collegues-2.jpg',
      publicId: 'products/collegues/collegues-2'
    }
  ],
  '1df3cd1e-b56c-4b3a-a034-617db78ed622': [ // st-valentin
    {
      url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1738642239/products/stvalentin/stvalentin-1.jpg',
      publicId: 'products/stvalentin/stvalentin-1'
    },
    {
      url: 'https://res.cloudinary.com/dq6pustuw/image/upload/v1738642241/products/stvalentin/stvalentin-2.jpg',
      publicId: 'products/stvalentin/stvalentin-2'
    }
  ]
};

async function updateProductsMetadata() {
  try {
    console.log('Starting database update...');

    for (const [productId, images] of Object.entries(PRODUCT_IMAGES)) {
      console.log(`Updating product ${productId}...`);

      const { data, error } = await supabase
        .from('products')
        .select('metadata')
        .eq('id', productId)
        .single();

      if (error) {
        console.error(`Error fetching product ${productId}:`, error);
        continue;
      }

      const currentMetadata = data?.metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        images
      };

      const { error: updateError } = await supabase
        .from('products')
        .update({ metadata: updatedMetadata })
        .eq('id', productId);

      if (updateError) {
        console.error(`Error updating product ${productId}:`, updateError);
      } else {
        console.log(`✅ Successfully updated product ${productId}`);
      }
    }

    console.log('Database update completed!');
  } catch (error) {
    console.error('Update failed:', error);
    throw error;
  }
}

updateProductsMetadata().catch(console.error);