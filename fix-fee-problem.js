
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lseqrqmtjymukewnejdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw'
);

async function fixFeeForAllOrders() {
  console.log('🔧 === OPRAVA FEE PRO VŠECHNY ZAKÁZKY ===');
  console.log('⏰', new Date().toLocaleString('cs-CZ'));

  try {
    // Načti všechny záznamy
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('id');

    if (error) {
      console.error('❌ Chyba při načítání:', error);
      return;
    }

    console.log('📊 Celkem záznamů:', orders.length);

    let fixedCount = 0;
    let errorCount = 0;

    for (const order of orders) {
      try {
        // Spočítej správné hodnoty
        const correctFee = 0; // Fee by mělo být vždy 0
        const correctFeeOff = order.castka; // Fee_off = celá tržba
        const correctZisk = correctFeeOff - (order.material || 0) - (order.pomocnik || 0) - (order.palivo || 0);

        console.log(`\n🔄 Opravuji ID ${order.id} - ${order.klient}`);
        console.log(`  💰 Tržba: ${order.castka} Kč`);
        console.log(`  🏦 Fee: ${order.fee} → ${correctFee} Kč`);
        console.log(`  💵 Fee OFF: ${order.fee_off} → ${correctFeeOff} Kč`);
        console.log(`  💚 Zisk: ${order.zisk} → ${correctZisk} Kč`);

        // Aktualizuj záznam
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            fee: correctFee,
            fee_off: correctFeeOff,
            zisk: correctZisk
          })
          .eq('id', order.id);

        if (updateError) {
          console.error(`❌ Chyba při aktualizaci ID ${order.id}:`, updateError);
          errorCount++;
        } else {
          console.log(`✅ ID ${order.id} úspěšně opraveno`);
          fixedCount++;
        }

      } catch (err) {
        console.error(`💥 Fatální chyba u ID ${order.id}:`, err);
        errorCount++;
      }

      // Krátká pauza mezi aktualizacemi
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 === VÝSLEDEK OPRAVY FEE ===');
    console.log('✅ Opraveno záznamů:', fixedCount);
    console.log('❌ Chyb:', errorCount);
    console.log('🎉 OPRAVA FEE DOKONČENA');

    // Kontrola po opravě
    const { data: controlOrders } = await supabase
      .from('orders')
      .select('id, castka, fee, fee_off, zisk')
      .order('id')
      .limit(5);

    if (controlOrders) {
      console.log('\n🔍 Kontrola prvních 5 záznamů:');
      controlOrders.forEach(order => {
        const feeOK = order.fee === 0 ? '✅' : '❌';
        const feeOffOK = order.fee_off === order.castka ? '✅' : '❌';
        console.log(`${feeOK}${feeOffOK} ID ${order.id}: tržba=${order.castka}, fee=${order.fee}, fee_off=${order.fee_off}, zisk=${order.zisk}`);
      });
    }

  } catch (error) {
    console.error('💥 Fatální chyba:', error);
  }
}

// Spusť opravu
fixFeeForAllOrders();
