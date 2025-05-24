// scripts/import-products.ts
import { createClient } from '@supabase/supabase-js';
import { parse } from 'papaparse';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Utiliser la service_role key au lieu de la anon key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Utiliser la clé service_role
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function importProducts() {
  console.log('🚀 Démarrage de l\'import des produits...\n');

  try {
    const csvPath = path.join(process.cwd(), 'produits.csv');
    const csvFile = fs.readFileSync(csvPath, 'utf-8');
    console.log('✓ Fichier CSV lu avec succès\n');

    return new Promise((resolve, reject) => {
      parse(csvFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            console.log('🔍 Validation du CSV...');
            
            if (results.errors.length > 0) {
              console.error('Erreurs dans le CSV:', results.errors);
              reject(results.errors);
              return;
            }

            const products = results.data.map((row: any) => {
              console.log('\nTraitement du produit:', row.name);

              let category = '';
              if (row.name.toLowerCase().includes('valentin')) {
                category = 'couples';
              } else if (row.name.toLowerCase().includes('couple')) {
                category = 'couples';
              } else if (row.name.toLowerCase().includes('famille')) {
                category = 'famille';
              } else if (row.name.toLowerCase().includes('ami')) {
                category = 'amis';
              } else if (row.name.toLowerCase().includes('collègue')) {
                category = 'collegues';
              }

              const metadata = {
                category,
                players: category === 'couples' ? '2 joueurs' : '2-8 joueurs',
                duration: '30-60 minutes',
                language: 'Français',
                min_age: category === 'famille' ? 12 : 18,
                stats: {
                  sold: 0,
                  satisfaction: 98,
                  reviews: 0
                },
                benefits: [],
                topics: []
              };

              const formattedProduct = {
                id: row.id,
                name: row.name,
                description: row.description,
                price: parseInt(row.price),
                compare_at_price: parseInt(row.compare_at_price), 
                status: 'active',
                stock_quantity: parseInt(row.stock_quantity) || 100,
                metadata,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };

              console.log('Catégorie détectée:', category);
              return formattedProduct;
            });

            console.log(`\n✓ ${products.length} produits validés\n`);
            
            try {
              console.log('🗑️ Suppression des anciens produits...');
              const { error: deleteError } = await supabase
                .from('products')
                .delete()
                .gte('created_at', '2000-01-01');

              if (deleteError) {
                console.error('Erreur de suppression:', deleteError);
                throw deleteError;
              }
              console.log('✓ Anciens produits supprimés\n');

              console.log('📥 Insertion des nouveaux produits...');
              let insertedCount = 0;
              for (const product of products) {
                const { error: insertError } = await supabase
                  .from('products')
                  .insert(product);

                if (insertError) {
                  console.error(`Erreur lors de l'insertion de ${product.name}:`, insertError);
                  throw new Error(`Erreur lors de l'insertion de ${product.name}: ${insertError.message}`);
                }
                insertedCount++;
                console.log(`✓ Produit inséré (${insertedCount}/${products.length}): ${product.name}`);
              }

              console.log(`\n✅ ${insertedCount} produits importés avec succès`);
              resolve(true);
            } catch (error) {
              reject(error);
            }
          } catch (error) {
            reject(error);
          }
        },
        error: (error: any) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    throw error;
  }
}

// Exécution
importProducts()
  .then(() => {
    console.log('\n🎉 Import terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur lors de l\'import:', error);
    process.exit(1);
  });