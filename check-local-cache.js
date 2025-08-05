
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lseqrqmtjymukewnejdd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLocalData() {
  console.log('🔍 === KONTROLA LOKÁLNÍCH DAT ===');
  console.log('⏰', new Date().toLocaleString('cs-CZ'));
  
  // Smazané IDs
  const deletedIds = [59, 61, 62, 63, 65, 66, 68, 69, 70];
  
  console.log('🗑️ Smazané ID zakázek:', deletedIds);
  
  // Zkontroluj aktuální stav v Supabase
  console.log('\n📊 Aktuální stav v Supabase:');
  const { data: currentOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('user_id', 'admin_1')
    .order('id');
    
  if (currentOrders) {
    const existingIds = currentOrders.map(o => o.id);
    console.log('✅ Existující ID v databázi:', existingIds.join(', '));
    
    const missingIds = deletedIds.filter(id => !existingIds.includes(id));
    console.log('❌ Chybějící ID:', missingIds);
  }
  
  // Zkontroluj localStorage
  console.log('\n💾 Kontrola localStorage:');
  try {
    // Simulace kontroly localStorage (v Node.js to nebude fungovat)
    console.log('ℹ️ localStorage kontrola musí být provedena v prohlížeči');
    console.log('📋 Zkontroluj v Developer Tools:');
    console.log('   - localStorage.getItem("zakazky_admin_1")');
    console.log('   - localStorage.getItem("offline_queue")');
    console.log('   - sessionStorage.getItem("cache_admin_1")');
  } catch (e) {
    console.log('❌ localStorage nedostupný v Node.js prostředí');
  }
  
  // Vytvoř základní template pro obnovu
  console.log('\n🔧 Template pro obnovu smazanych zakázek:');
  const recoveryTemplate = deletedIds.map(id => ({
    id: id,
    user_id: 'admin_1',
    datum: new Date().toLocaleDateString('cs-CZ'),
    druh: 'OBNOVA',
    klient: 'Obnovená zakázka',
    cislo: `RECOVERY-${id}`,
    castka: 0,
    fee: 0,
    fee_off: 0,
    material: 0,
    pomocnik: 0,
    palivo: 0,
    adresa: 'Neznámá',
    typ: 'byt',
    doba_realizace: 1,
    poznamka: `Obnovená zakázka ID ${id} - původní data ztracena`,
    soubory: [],
    zisk: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  
  console.log('📝 Recovery template vytvořen pro', recoveryTemplate.length, 'zakázek');
  
  // Nabídni možnosti obnovy
  console.log('\n🎯 MOŽNOSTI OBNOVY:');
  console.log('1. Obnov s prázdnými daty (rychlé)');
  console.log('2. Zkontroluj zálohy v attached_assets');
  console.log('3. Zkontroluj browser cache manuálně');
  console.log('4. Vytvoř nové zakázky s originálními ID');
  
  return recoveryTemplate;
}

// Funkce pro obnovu s prázdnými daty
async function restoreWithEmptyData(template) {
  console.log('\n🔄 === OBNOVA S PRÁZDNÝMI DATY ===');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const order of template) {
    try {
      const { error } = await supabase
        .from('orders')
        .insert([order]);
      
      if (error) {
        console.error(`❌ Chyba při obnově ID ${order.id}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Obnovena zakázka ID: ${order.id}`);
        successCount++;
      }
      
      // Pauza mezi vkládáním
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (e) {
      console.error(`💥 Fatální chyba u ID ${order.id}:`, e.message);
      errorCount++;
    }
  }
  
  console.log('\n📊 VÝSLEDEK OBNOVY:');
  console.log(`✅ Úspěšně obnoveno: ${successCount} zakázek`);
  console.log(`❌ Chyby: ${errorCount} zakázek`);
  
  if (successCount > 0) {
    console.log('🎉 OBNOVA DOKONČENA - restartuj aplikaci');
  }
}

// Spusť kontrolu
checkLocalData()
  .then(template => {
    console.log('\n❓ Chceš obnovit zakázky s prázdnými daty? (spusť znovu s parametrem "restore")');
    
    if (process.argv[2] === 'restore') {
      return restoreWithEmptyData(template);
    }
  })
  .catch(console.error);
