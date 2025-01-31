const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://fhojaocrcefvatzexzfh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZob2phb2NyY2VmdmF0emV4emZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNjI5MTEsImV4cCI6MjA1MTgzODkxMX0.ffRoHCYdOWce2bl9uAxpkbnjshCPljqLdye9QuRhWcY'

async function testConnection() {
  try {
    console.log('Initializing Supabase client...')
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    console.log('Testing connection...')
    
    // Test simple query
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Connection error:', error)
      return
    }

    console.log('Connection successful!')
    console.log('Test query result:', data)

  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Exécuter le test
testConnection()