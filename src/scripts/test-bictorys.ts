// src/scripts/test-bictorys.ts
import dotenv from 'dotenv';
import { testBictorysConnection } from '../lib/tests/bictorys-connection';

// Charger les variables d'environnement
dotenv.config();

async function runTest() {
  console.log('Starting Bictorys connection test...');
  console.log('API URL:', process.env.NEXT_PUBLIC_BICTORYS_API_URL);
  console.log('API Key (first 8 chars):', process.env.NEXT_PUBLIC_BICTORYS_API_KEY?.substring(0, 8));
  
  try {
    const result = await testBictorysConnection();
    console.log('\nTest result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\nTest failed:', error);
  }
}

runTest();