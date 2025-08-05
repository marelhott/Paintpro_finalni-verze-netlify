
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lseqrqmtjymukewnejdd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseSyncIssue() {
  console.log('🔍 === DIAGNOSTIKA PROBLÉMU SYNCHRONIZACE ===');
  console.log('⏰', new Date().toLocaleString('cs-CZ'));
  
  try {
    // Načti všechny zakázky pro admin_1
    console.log('\n📊 Načítám všechny zakázky pro admin_1...');
    const { data: allOrders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', 'admin_1')
      .order('id');
    
    if (error) {
      console.error('❌ Chyba při načítání:', error);
      return;
    }
    
    console.log('✅ Celkem zakázek v Supabase:', allOrders.length);
    
    // Analýza podle kategorií
    let validCount = 0;
    let emptyKlientCount = 0;
    let nullKlientCount = 0;
    let invalidCastkaCount = 0;
    let otherIssues = 0;
    
    console.log('\n📋 Detailní analýza zakázek:');
    allOrders.forEach((order, index) => {
      const hasValidCastka = order.castka && order.castka > 0;
      const hasKlientField = order.klient !== null && order.klient !== undefined;
      const hasNonEmptyKlient = hasKlientField && order.klient.trim() !== '';
      
      let status = '✅ PLATNÁ';
      let reason = '';
      
      if (!hasValidCastka) {
        status = '❌ NEPLATNÁ';
        reason = 'Neplatná částka';
        invalidCastkaCount++;
      } else if (!hasKlientField) {
        status = '❌ NEPLATNÁ';
        reason = 'Klient je null/undefined';
        nullKlientCount++;
      } else if (!hasNonEmptyKlient) {
        status = '⚠️ PRÁZDNÝ KLIENT';
        reason = 'Prázdný klient (ale může být platný)';
        emptyKlientCount++;
      } else {
        validCount++;
      }
      
      if (index < 10 || status !== '✅ PLATNÁ') {
        console.log(`${index + 1}. ID: ${order.id} | ${status} | Klient: "${order.klient}" | Částka: ${order.castka} | ${reason}`);
      }
    });
    
    console.log('\n📊 SOUHRN:');
    console.log(`✅ Platné zakázky: ${validCount}`);
    console.log(`⚠️ Prázdný klient: ${emptyKlientCount}`);
    console.log(`❌ Null klient: ${nullKlientCount}`);
    console.log(`❌ Neplatná částka: ${invalidCastkaCount}`);
    console.log(`📋 Celkem: ${allOrders.length}`);
    
    // Simulace současné logiky validace
    console.log('\n🔬 Simulace současné validace (PŘÍSNÁ):');
    const strictValid = allOrders.filter(order => {
      const hasValidKlient = order.klient && order.klient.trim() !== '' && order.klient !== 'null';
      const hasValidCastka = order.castka && order.castka > 0;
      const hasValidUserId = order.user_id === 'admin_1';
      return hasValidKlient && hasValidCastka && hasValidUserId;
    });
    console.log(`📉 Přísná validace by zobrazila: ${strictValid.length} zakázek`);
    
    // Simulace nové logiky validace
    console.log('\n🔬 Simulace nové validace (MÍRNĚJŠÍ):');
    const lenientValid = allOrders.filter(order => {
      const hasValidCastka = order.castka && order.castka > 0;
      const hasValidUserId = order.user_id === 'admin_1';
      const hasKlient = order.klient !== null && order.klient !== undefined;
      return hasValidCastka && hasValidUserId && hasKlient;
    });
    console.log(`📈 Mírnější validace by zobrazila: ${lenientValid.length} zakázek`);
    
    // Seznam zakázek s prázdným klientem
    const emptyKlientOrders = allOrders.filter(order => 
      order.klient !== null && order.klient !== undefined && order.klient.trim() === '' && order.castka > 0
    );
    
    if (emptyKlientOrders.length > 0) {
      console.log('\n📋 Zakázky s prázdným klientem (které by se nyní zobrazily):');
      emptyKlientOrders.forEach(order => {
        console.log(`- ID: ${order.id} | Druh: ${order.druh} | Částka: ${order.castka} | Datum: ${order.datum}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Fatální chyba:', error);
  }
}

// Spusť diagnostiku
diagnoseSyncIssue()
  .then(() => {
    console.log('\n🏁 Diagnostika dokončena');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Kritická chyba:', error);
    process.exit(1);
  });
