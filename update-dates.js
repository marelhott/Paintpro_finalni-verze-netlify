
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lseqrqmtjymukewnejdd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mapování podle částek z faktury
const dateMapping = [
  { cislo: '#14347', castka: 6700, datum: '27.1.2025' },
  { cislo: '#14348', castka: 5750, datum: '15.3.2025' }, // Zakázka Vincent
  { cislo: '#14181', castka: 6400, datum: '23.2.2025' },
  { cislo: '#14674', castka: 5800, datum: '25.2.2025' },
  { cislo: '#15457', castka: 8400, datum: '16.4.2025' },
  { cislo: '#91913', castka: 10400, datum: '19.4.2025' }, // Ve faktuře 10600, ale v DB 10400
  { cislo: '#67703', castka: 10400, datum: '24.4.2025' },
  { cislo: '#87637', castka: 17800, datum: '22.4.2025' }, // Ve faktuře #82187
  { cislo: '#95067', castka: 7600, datum: '14.5.2025' },
  { cislo: '#95105', castka: 11400, datum: '15.5.2025' },
  { cislo: '#87475', castka: 8100, datum: '13.5.2025' }, // Ve faktuře #67475
  { cislo: '#85333', castka: 24000, datum: '11.5.2025' }, // Ve faktuře #95333
  { cislo: '#104470', castka: 7200, datum: '9.6.2025' },
  { cislo: '#69268', castka: 27200, datum: '16.6.2025' }, // Ve faktuře #68088
  { cislo: '#107239', castka: 3300, datum: '5.7.2025' } // Ve faktuře 3380, ale v DB 3300
];

async function updateDates() {
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
    
    let updatedCount = 0;
    
    for (const mapping of dateMapping) {
      // Najdi zakázku podle částky (primární) nebo čísla zakázky (sekundární)
      const order = allOrders.find(o => 
        o.castka === mapping.castka || o.cislo === mapping.cislo
      );
      
      if (order) {
        console.log(`🔄 Aktualizuji ${order.cislo} (${order.castka} Kč) -> ${mapping.datum}`);
        
        const { error: updateError } = await supabase
          .from('orders')
          .update({ datum: mapping.datum })
          .eq('id', order.id);
          
        if (updateError) {
          console.error(`❌ Chyba při aktualizaci ${order.cislo}:`, updateError);
        } else {
          console.log(`✅ ${order.cislo} aktualizováno na ${mapping.datum}`);
          updatedCount++;
        }
      } else {
        console.warn(`⚠️ Nenalezena zakázka pro ${mapping.cislo} (${mapping.castka} Kč)`);
      }
    }
    
    console.log(`\n📊 Celkem aktualizováno: ${updatedCount} zakázek`);
    
    // Kontrola po aktualizaci
    const { data: finalOrders } = await supabase
      .from('orders')
      .select('id, cislo, datum, castka')
      .eq('user_id', 'lenka')
      .order('datum');
      
    console.log('\n📅 Finální přehled dat:');
    finalOrders?.forEach(order => {
      console.log(`  ${order.datum} | ${order.cislo} | ${order.castka} Kč`);
    });
    
  } catch (error) {
    console.error('❌ Celková chyba:', error);
  }
}

updateDates();
