
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lseqrqmtjymukewnejdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw'
);

async function fixDatabase() {
  console.log('🔧 Opravuji strukturu databáze...');
  
  try {
    // 1. Zkontroluj současnou strukturu
    console.log('🔍 Kontroluji současnou strukturu...');
    const { data: testSelect, error: testError } = await supabase
      .from('orders')
      .select('id, poznamka, poznamky')
      .limit(1);
    
    if (testError) {
      console.log('❌ Chyba při čtení:', testError.message);
      if (testError.message.includes('poznamky')) {
        console.log('💡 Sloupec poznamky neexistuje - musím ho přidat');
      }
    } else {
      console.log('✅ Test čtení úspěšný');
    }

    // 2. Test přímého vytvoření zakázky BEZ poznamky
    console.log('🧪 Testuji vytvoření zakázky bez poznamky...');
    const testOrderWithoutPoznamky = {
      user_id: 'admin_1',
      datum: new Date().toLocaleDateString('cs-CZ'),
      druh: 'Test oprava',
      klient: 'Test klient',
      cislo: 'TEST-' + Date.now(),
      castka: 1000,
      fee: 261,
      material: 0,
      pomocnik: 0,
      palivo: 0,
      adresa: 'Test adresa',
      typ: 'byt',
      poznamka: 'Test poznámka (poznamka)', // Starý sloupec
      soubory: [],
      zisk: 739
    };
    
    const { data: newOrder, error: insertError } = await supabase
      .from('orders')
      .insert([testOrderWithoutPoznamky])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Chyba při testování bez poznamky:', insertError);
    } else {
      console.log('✅ Test zakázka vytvořena úspěšně:', newOrder.id);
      
      // Smaž testovací zakázku
      await supabase.from('orders').delete().eq('id', newOrder.id);
      console.log('🧹 Test zakázka smazána');
    }

    // 3. Test s poznamky sloupcem
    console.log('🧪 Testuji vytvoření zakázky s poznamky...');
    const testOrderWithPoznamky = {
      user_id: 'admin_1',
      datum: new Date().toLocaleDateString('cs-CZ'),
      druh: 'Test poznamky',
      klient: 'Test klient 2',
      cislo: 'TEST2-' + Date.now(),
      castka: 2000,
      fee: 522,
      material: 0,
      pomocnik: 0,
      palivo: 0,
      adresa: 'Test adresa 2',
      typ: 'dům',
      poznamky: 'Test poznámka (poznamky)', // Nový sloupec
      soubory: [],
      zisk: 1478
    };
    
    const { data: newOrder2, error: insertError2 } = await supabase
      .from('orders')
      .insert([testOrderWithPoznamky])
      .select()
      .single();
    
    if (insertError2) {
      console.error('❌ Chyba při testování s poznamky:', insertError2);
      console.log('💡 Aplikace očekává sloupec "poznamky", ale databáze má "poznamka"');
    } else {
      console.log('✅ Test zakázka s poznamky vytvořena:', newOrder2.id);
      
      // Smaž testovací zakázku
      await supabase.from('orders').delete().eq('id', newOrder2.id);
      console.log('🧹 Test zakázka s poznamky smazána');
    }

    // 4. Kontrola všech sloupců
    console.log('🔍 Načítám jeden záznam pro analýzu struktury...');
    const { data: sampleRecord } = await supabase
      .from('orders')
      .select('*')
      .limit(1)
      .single();
    
    if (sampleRecord) {
      console.log('📋 Dostupné sloupce:');
      Object.keys(sampleRecord).forEach(key => {
        console.log(`  - ${key}: ${typeof sampleRecord[key]}`);
      });
    }

    console.log('🎯 ZÁVĚR: Musím upravit aplikaci, aby používala správný název sloupce!');
    
  } catch (error) {
    console.error('💥 Fatální chyba:', error);
  }
}

fixDatabase();
