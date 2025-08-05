
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lseqrqmtjymukewnejdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw'
);

// Správné hodnoty materiálu podle identifikace zakázek
const materialUpdates = [
  { cislo: '#14347', material: 1000 },
  { cislo: '#14181', material: 400 },
  { cislo: '#14674', material: 400 },
  { cislo: 'zakázka Vincent', material: 1000 },
  { cislo: '#15457', material: 1000 },
  { cislo: '#81913', material: 1000 },
  { cislo: '#67703', material: 1000 },
  { cislo: '#82187', material: 700 },
  { cislo: '#95067', material: 700 },
  { cislo: '#95105', material: 700 },
  { cislo: '#67475', material: 700 },
  { cislo: '#95333', material: 700 },
  { cislo: '#104470', material: 700 },
  { cislo: '#88368', material: 2400 },
  { cislo: '#107239', material: 1000 }
];

async function updateMaterialValues() {
  try {
    console.log('🔍 Načítám aktuální data z tabulky orders...');
    
    const { data: currentOrders, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', 'lenka')
      .order('id');
      
    if (fetchError) {
      console.error('❌ Chyba při načítání:', fetchError);
      return;
    }
    
    console.log('📊 Celkem zakázek v databázi:', currentOrders.length);
    console.log('🎯 Aktualizace materiálu pro:', materialUpdates.length, 'zakázek');
    
    let updatedCount = 0;
    let notFoundCount = 0;
    
    for (const update of materialUpdates) {
      console.log(`\n🔍 Hledám zakázku: ${update.cislo}`);
      
      // Najdi zakázku podle čísla
      const order = currentOrders.find(o => o.cislo === update.cislo);
      
      if (order) {
        const oldMaterial = order.material;
        const newMaterial = update.material;
        
        console.log(`  📋 Nalezena zakázka ID: ${order.id}`);
        console.log(`  🔧 Starý materiál: ${oldMaterial} Kč`);
        console.log(`  ✨ Nový materiál: ${newMaterial} Kč`);
        
        // Přepočítej zisk s novým materiálem
        const fee_off = order.castka - order.fee;
        const newZisk = fee_off - order.palivo - newMaterial - order.pomocnik;
        
        console.log(`  💰 Přepočítaný zisk: ${newZisk} Kč`);
        
        // Aktualizuj v databázi
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            material: newMaterial,
            zisk: newZisk
          })
          .eq('id', order.id);
          
        if (updateError) {
          console.error(`  ❌ Chyba při aktualizaci ${update.cislo}:`, updateError);
        } else {
          console.log(`  ✅ ${update.cislo} úspěšně aktualizováno`);
          updatedCount++;
        }
      } else {
        console.log(`  ⚠️ Zakázka ${update.cislo} nebyla nalezena`);
        notFoundCount++;
      }
      
      // Krátká pauza mezi aktualizacemi
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 VÝSLEDEK AKTUALIZACE MATERIÁLU:`);
    console.log(`✅ Úspěšně aktualizováno: ${updatedCount} zakázek`);
    console.log(`⚠️ Nenalezeno: ${notFoundCount} zakázek`);
    
    // Zobraz finální stav materiálu
    console.log('\n🔍 Kontrola aktualizovaných hodnot:');
    const { data: updatedOrders } = await supabase
      .from('orders')
      .select('cislo, material, zisk')
      .eq('user_id', 'lenka')
      .order('cislo');
      
    if (updatedOrders) {
      console.log('\n📋 Aktuální hodnoty materiálu:');
      updatedOrders.forEach(order => {
        const updateInfo = materialUpdates.find(u => u.cislo === order.cislo);
        const status = updateInfo ? (order.material === updateInfo.material ? '✅' : '❌') : '⚪';
        console.log(`${status} ${order.cislo} | Materiál: ${order.material} Kč | Zisk: ${order.zisk} Kč`);
      });
    }
    
  } catch (error) {
    console.error('❌ Celková chyba:', error);
  }
}

// Spusť aktualizaci
updateMaterialValues();
