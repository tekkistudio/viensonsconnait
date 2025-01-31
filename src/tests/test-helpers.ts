// src/tests/test-helpers.ts
import { supabase } from '@/lib/supabase';

export async function generateUniqueOrderId(): Promise<number> {
  // Générer un ID aléatoire entre 1000 et 9999
  let orderId = Math.floor(Math.random() * 9000) + 1000;
  
  // Vérifier si l'ID existe déjà
  const { data } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .single();
  
  // Si l'ID existe, réessayer
  if (data) {
    return generateUniqueOrderId();
  }
  
  return orderId;
}

export async function cleanupTestData() {
  await supabase
    .from('payment_transactions')
    .delete()
    .match({ provider: ['WAVE', 'ORANGE_MONEY'] });
  
  await supabase
    .from('orders')
    .delete()
    .match({ product_id: 'TEST-001' });
}