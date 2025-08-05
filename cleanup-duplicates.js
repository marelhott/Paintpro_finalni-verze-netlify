
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lseqrqmtjymukewnejdd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function removeDuplicates() {
  try {
    console.log('🔍 Načítám všechny zakázky Lenky...');
    
    const { data: allOrders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', 'lenka')
      .order('id');
      
    if (error) {
      console.error('❌ Chyba při načítání:', error);
      return;
    }
    
    console.log('📊 Celkem zakázek:', allOrders.length);
    
    // Seskup podle čísla zakázky
    const groups = {};
    allOrders.forEach(order => {
      const key = order.cislo;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(order);
    });
    
    console.log('📋 Unikátních čísel zakázek:', Object.keys(groups).length);
    
    // Najdi duplicity a ponechej jen nejstarší záznam
    const toDelete = [];
    Object.entries(groups).forEach(([cislo, orders]) => {
      if (orders.length > 1) {
        console.log(`🔍 Duplicita pro číslo ${cislo}: ${orders.length} záznamů`);
        // Seřaď podle ID (nejstarší má nejmenší ID)
        orders.sort((a, b) => a.id - b.id);
        // Ponechej první (nejstarší), zbytek smaž
        for (let i = 1; i < orders.length; i++) {
          toDelete.push(orders[i].id);
          console.log(`  ❌ Ke smazání: ID ${orders[i].id}`);
        }
      }
    });
    
    console.log(`🗑️ Celkem ke smazání: ${toDelete.length} duplicitních záznamů`);
    
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .in('id', toDelete);
        
      if (deleteError) {
        console.error('❌ Chyba při mazání:', deleteError);
      } else {
        console.log(`✅ Úspěšně smazáno ${toDelete.length} duplicitních záznamů`);
      }
    }
    
    // Kontrola po vyčištění
    const { data: finalOrders } = await supabase
      .from('orders')
      .select('id, cislo, datum, druh, castka')
      .eq('user_id', 'lenka')
      .order('id');
      
    console.log(`\n📊 Finální stav: ${finalOrders?.length || 0} zakázek`);
    finalOrders?.forEach(order => {
      console.log(`  ${order.cislo} | ${order.datum} | ${order.druh} | ${order.castka} Kč`);
    });
    
  } catch (error) {
    console.error('❌ Celková chyba:', error);
  }
}

removeDuplicates();
