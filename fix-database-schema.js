
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lseqrqmtjymukewnejdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw'
);

async function fixDatabaseSchema() {
  console.log('🔧 Opravuji strukturu databáze...');
  
  try {
    // 1. Přidej chybějící sloupec poznamky
    console.log('📝 Přidávám sloupec poznamky...');
    const { error: poznamkyError } = await supabase.rpc('sql', {
      query: `
        ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS poznamky TEXT;
      `
    });
    
    if (poznamkyError) {
      console.error('❌ Chyba při přidávání poznamky:', poznamkyError);
    } else {
      console.log('✅ Sloupec poznamky přidán');
    }

    // 2. Aktualizuj existující záznamy kde je poznamka null na poznamky
    console.log('🔄 Migrace dat poznamka -> poznamky...');
    const { error: migrateError } = await supabase.rpc('sql', {
      query: `
        UPDATE orders 
        SET poznamky = poznamka 
        WHERE poznamky IS NULL AND poznamka IS NOT NULL;
      `
    });
    
    if (migrateError) {
      console.error('❌ Chyba při migraci dat:', migrateError);
    } else {
      console.log('✅ Data migrována');
    }

    // 3. Test vytvoření nové zakázky
    console.log('🧪 Testuji vytvoření nové zakázky...');
    const testOrder = {
      user_id: 'admin_1',
      datum: new Date().toLocaleDateString('cs-CZ'),
      druh: 'Test',
      klient: 'Test Klient',
      cislo: 'TEST-' + Date.now(),
      castka: 1000,
      fee: 261,
      material: 0,
      pomocnik: 0,
      palivo: 0,
      adresa: 'Test adresa',
      typ: 'byt',
      poznamky: 'Test poznámka',
      soubory: [],
      zisk: 739,
      created_at: new Date().toISOString()
    };
    
    const { data: newOrder, error: insertError } = await supabase
      .from('orders')
      .insert([testOrder])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Chyba při testování:', insertError);
    } else {
      console.log('✅ Test zakázka vytvořena:', newOrder.id);
      
      // Smaž testovací zakázku
      await supabase.from('orders').delete().eq('id', newOrder.id);
      console.log('🧹 Test zakázka smazána');
    }

    // 4. Kontrola finální struktury
    console.log('🔍 Kontrola struktury tabulky...');
    const { data: columns } = await supabase.rpc('sql', {
      query: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        ORDER BY ordinal_position;
      `
    });
    
    if (columns) {
      console.log('📋 Sloupce tabulky orders:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }

    console.log('🎉 Struktura databáze opravena!');
    
  } catch (error) {
    console.error('💥 Fatální chyba:', error);
  }
}

fixDatabaseSchema();
