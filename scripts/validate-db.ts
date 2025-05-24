// scripts/validate-db.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function validateDatabase() {
  console.log('🔍 Validation de la structure de la base de données...\n');

  try {
    // 1. Vérifier la table products
    console.log('1️⃣ Vérification de la table products...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*');

    if (productsError) {
      throw new Error(`Erreur lors de l'accès à la table products: ${productsError.message}`);
    }

    console.log(`✓ Table products accessible - ${products?.length || 0} produits trouvés\n`);

    // 2. Analyser la structure des données existantes
    if (products && products.length > 0) {
      console.log('2️⃣ Analyse des données existantes...');
      for (const product of products) {
        console.log(`\nProduit: ${product.name}`);
        console.log('- ID:', product.id);
        console.log('- Prix:', product.price);
        console.log('- Status:', product.status);
        console.log('- Metadata:', product.metadata ? '✓' : '✗');
      }
    }

    // 3. Nettoyer les données si nécessaire
    console.log('\n3️⃣ Nettoyage des données invalides...');
    if (products) {
      for (const product of products) {
        // Vérifier si les données sont valides
        const isValid = 
          product.name &&
          product.price &&
          typeof product.price === 'number' &&
          ['active', 'draft', 'archived'].includes(product.status || '');

        if (!isValid) {
          console.log(`⚠️ Suppression du produit invalide: ${product.name || product.id}`);
          const { error: deleteError } = await supabase
            .from('products')
            .delete()
            .eq('id', product.id);

          if (deleteError) {
            console.error(`Erreur lors de la suppression: ${deleteError.message}`);
          }
        }
      }
    }

    console.log('\n✅ Validation terminée');
    return true;

  } catch (error) {
    console.error('\n❌ Erreur lors de la validation:', error);
    return false;
  }
}

// Exécuter la validation
validateDatabase()
  .then(async (success) => {
    if (success) {
      console.log('\n🚀 La base de données est prête pour l\'import');
    } else {
      console.log('\n⚠️ Des problèmes ont été détectés. Veuillez les corriger avant l\'import');
    }
    process.exit(success ? 0 : 1);
  });