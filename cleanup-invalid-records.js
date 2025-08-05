
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lseqrqmtjymukewnejdd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupInvalidRecords() {
  console.log('🧹 === ČIŠTĚNÍ NEVALIDNÍCH ZÁZNAMŮ ===');
  console.log('⏰', new Date().toLocaleString('cs-CZ'));
  console.log('');

  // IDs nevalidních záznamů z diagnostiky
  const invalidIds = [59, 61, 62, 63, 65, 66, 68, 69, 70];
  
  console.log('🎯 Záznamy ke smazání:', invalidIds);
  console.log('');

  // Nejdříve si je zobrazíme pro kontrolu
  console.log('📋 KONTROLA ZÁZNAMŮ PŘED SMAZÁNÍM:');
  for (const id of invalidIds) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, datum, druh, klient, castka')
        .eq('id', id)
        .single();
      
      if (data) {
        console.log(`  ID: ${data.id} | ${data.datum} | ${data.druh} | ${data.klient || 'BEZ KLIENTA'} | ${data.castka} Kč`);
      }
    } catch (e) {
      console.log(`  ID: ${id} - nedostupný`);
    }
  }
  
  console.log('');
  console.log('⚠️ POZOR: Za 5 sekund začnu mazání nevalidních záznamů...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Smazání nevalidních záznamů
  console.log('🗑️ Mazání nevalidních záznamů...');
  
  let deletedCount = 0;
  let errorCount = 0;
  
  for (const id of invalidIds) {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id)
        .eq('user_id', 'admin_1'); // Extra ochrana
      
      if (error) {
        console.error(`❌ Chyba při mazání ID ${id}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Smazán záznam ID: ${id}`);
        deletedCount++;
      }
    } catch (e) {
      console.error(`💥 Fatální chyba při mazání ID ${id}:`, e.message);
      errorCount++;
    }
    
    // Krátká pauza mezi mazáními
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('');
  console.log('📊 VÝSLEDEK ČIŠTĚNÍ:');
  console.log(`✅ Úspěšně smazáno: ${deletedCount} záznamů`);
  console.log(`❌ Chyby: ${errorCount} záznamů`);
  
  // Finální kontrola
  console.log('');
  console.log('🔍 FINÁLNÍ KONTROLA...');
  
  const { data: remainingOrders, error } = await supabase
    .from('orders')
    .select('id, klient, castka')
    .eq('user_id', 'admin_1');
  
  if (error) {
    console.error('❌ Chyba při finální kontrole:', error);
    return;
  }
  
  const stillInvalid = remainingOrders.filter(order => !order.klient || !order.castka);
  
  console.log(`📊 Celkem záznamů po čištění: ${remainingOrders.length}`);
  console.log(`✅ Validních záznamů: ${remainingOrders.length - stillInvalid.length}`);
  console.log(`❌ Stále nevalidních: ${stillInvalid.length}`);
  
  if (stillInvalid.length > 0) {
    console.log('🚨 STÁLE NEVALIDNÍ ZÁZNAMY:');
    stillInvalid.forEach(order => {
      console.log(`  ID: ${order.id} | Klient: ${order.klient || 'NULL'} | Částka: ${order.castka || 'NULL'}`);
    });
  } else {
    console.log('🎉 VŠECHNY NEVALIDNÍ ZÁZNAMY ÚSPĚŠNĚ SMAZÁNY!');
  }
  
  console.log('');
  console.log('💡 DALŠÍ KROKY:');
  console.log('1. Vymaž lokální cache');
  console.log('2. Vymaž offline queue');  
  console.log('3. Restartuj aplikaci');
  
  console.log('');
  console.log('🧹 === ČIŠTĚNÍ DOKONČENO ===');
  console.log('⏰', new Date().toLocaleString('cs-CZ'));
}

// Spusť čištění
cleanupInvalidRecords().catch(console.error);
