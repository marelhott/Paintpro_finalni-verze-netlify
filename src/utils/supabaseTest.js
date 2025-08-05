
import { createClient } from '@supabase/supabase-js';

// Testovací funkce pro Supabase připojení
export const testSupabaseConnection = async () => {
  console.log('🔍 Testuji Supabase připojení...');
  
  // Načti environment variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('🔧 Environment variables:');
  console.log('- VITE_SUPABASE_URL:', supabaseUrl ? '✅ Nastaveno' : '❌ Chybí');
  console.log('- VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Nastaveno' : '❌ Chybí');
  
  if (!supabaseUrl || !supabaseKey) {
    return {
      success: false,
      error: 'Chybí environment variables',
      details: 'Nastavte VITE_SUPABASE_URL a VITE_SUPABASE_ANON_KEY v Replit Secrets'
    };
  }
  
  try {
    // Vytvoř Supabase klienta
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test připojení - pokus o načtení uživatelů
    console.log('📡 Testuji připojení k Supabase...');
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase error:', error);
      return {
        success: false,
        error: 'Supabase chyba',
        details: error.message
      };
    }
    
    console.log('✅ Supabase připojení úspěšné!');
    return {
      success: true,
      data: data,
      url: supabaseUrl
    };
    
  } catch (networkError) {
    console.error('❌ Síťová chyba:', networkError);
    return {
      success: false,
      error: 'Síťová chyba',
      details: networkError.message
    };
  }
};

// Test konkrétních tabulek
export const testSupabaseTables = async () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return { success: false, error: 'Chybí konfigurace' };
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const results = {};
  
  // Test tabulky users
  try {
    const { data, error } = await supabase.from('users').select('count');
    results.users = error ? `❌ ${error.message}` : '✅ OK';
  } catch (e) {
    results.users = `❌ ${e.message}`;
  }
  
  // Test tabulky orders
  try {
    const { data, error } = await supabase.from('orders').select('count');
    results.orders = error ? `❌ ${error.message}` : '✅ OK';
  } catch (e) {
    results.orders = `❌ ${e.message}`;
  }
  
  return results;
};
