// scripts/fix-products.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Vérification de la configuration:');
console.log('URL Supabase présente:', !!supabaseUrl);
console.log('Clé Supabase présente:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variables d\'environnement Supabase manquantes');
}

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('count');

    if (error) {
      console.error('Erreur lors de la connexion à Supabase:', error);
      return false;
    }

    console.log('Connexion à Supabase réussie');
    return true;
  } catch (err) {
    console.error('Erreur inattendue:', err);
    return false;
  }
}

async function listTables() {
  try {
    console.log('Tentative de listage des tables...');
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Erreur lors de la lecture de la table products:', error);
    } else {
      console.log('Données de test:', data);
    }
  } catch (err) {
    console.error('Erreur lors du listage des tables:', err);
  }
}

async function addTestProduct() {
  try {
    console.log('Tentative d\'ajout d\'un produit de test...');
    
    const testProduct = {
      name: "Pour les Couples non mariés",
      description: "Jeu de 150 questions soigneusement élaborées pour les couples non mariés",
      price: 14000,
      compare_at_p: 17000,
      status: 'active',
      stock_quantity: 100,
      metadata: {
        category: 'couples',
        players: '2 joueurs',
        duration: '30-60 minutes',
        language: 'Français',
        min_age: 18
      }
    };

    const { data, error } = await supabase
      .from('products')
      .insert([testProduct])
      .select();

    if (error) {
      console.error('Erreur lors de l\'ajout du produit de test:', error);
    } else {
      console.log('Produit de test ajouté avec succès:', data);
    }
  } catch (err) {
    console.error('Erreur lors de l\'ajout du produit de test:', err);
  }
}

async function init() {
  console.log('Démarrage du script de diagnostic...');
  
  // Vérifier la connexion
  const isConnected = await checkConnection();
  if (!isConnected) {
    console.error('Impossible de se connecter à Supabase');
    return;
  }

  // Lister les tables
  await listTables();

  // Si aucun produit n'est trouvé, ajouter un produit de test
  const { data: products, error } = await supabase
    .from('products')
    .select('*');

  if (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    return;
  }

  console.log(`Nombre de produits trouvés: ${products?.length || 0}`);

  if (!products || products.length === 0) {
    console.log('Aucun produit trouvé, ajout d\'un produit de test...');
    await addTestProduct();
  }
}

// Exécuter le script
init()
  .then(() => {
    console.log('Script de diagnostic terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  });