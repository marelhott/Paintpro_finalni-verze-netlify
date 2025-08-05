
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lseqrqmtjymukewnejdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw'
);

async function restoreLenkaFees() {
  console.log('🔧 === OBNOVA FEE PRO LENKA ===');
  console.log('⏰', new Date().toLocaleString('cs-CZ'));

  try {
    // Najdi Lenka user_id
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('name', 'Lenka');

    if (userError || !users || users.length === 0) {
      console.error('❌ Lenka nenalezena:', userError);
      return;
    }

    const lenkaUserId = users[0].id;
    console.log('👤 Lenka nalezena, ID:', lenkaUserId);

    // Načti všechny zakázky Lenky
    const { data: lenkaOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', lenkaUserId)
      .order('id');

    if (ordersError) {
      console.error('❌ Chyba při načítání zakázek Lenky:', ordersError);
      return;
    }

    console.log('📊 Celkem zakázek Lenky:', lenkaOrders.length);

    if (lenkaOrders.length === 0) {
      console.log('ℹ️ Lenka nemá žádné zakázky k opravě');
      return;
    }

    let fixedCount = 0;
    let errorCount = 0;

    // Pro každou zakázku Lenky vypočítej správné fee (26.1% z tržby)
    for (const order of lenkaOrders) {
      try {
        const trzba = order.castka || 0;
        const correctFee = Math.round(trzba * 0.261); // 26.1% fee pro Lenku
        const correctFeeOff = trzba - correctFee; // Fee OFF = tržba - fee
        const correctZisk = correctFeeOff - (order.material || 0) - (order.pomocnik || 0) - (order.palivo || 0);

        console.log(`\n🔄 Opravuji zakázku ID ${order.id} - ${order.klient}`);
        console.log(`  💰 Tržba: ${trzba} Kč`);
        console.log(`  🏦 Fee: ${order.fee} → ${correctFee} Kč (26.1%)`);
        console.log(`  💵 Fee OFF: ${order.fee_off} → ${correctFeeOff} Kč`);
        console.log(`  💚 Zisk: ${order.zisk} → ${correctZisk} Kč`);

        // Aktualizuj zakázku
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

    console.log('\n📊 === VÝSLEDEK OBNOVY FEE PRO LENKA ===');
    console.log('✅ Opraveno zakázek:', fixedCount);
    console.log('❌ Chyb:', errorCount);
    console.log('🎉 OBNOVA FEE PRO LENKA DOKONČENA');

    // Kontrola po opravě
    const { data: controlOrders } = await supabase
      .from('orders')
      .select('id, castka, fee, fee_off, zisk')
      .eq('user_id', lenkaUserId)
      .order('id')
      .limit(5);

    if (controlOrders) {
      console.log('\n🔍 Kontrola prvních 5 zakázek Lenky:');
      controlOrders.forEach(order => {
        const expectedFee = Math.round(order.castka * 0.261);
        const expectedFeeOff = order.castka - expectedFee;
        const feeOK = order.fee === expectedFee ? '✅' : '❌';
        const feeOffOK = order.fee_off === expectedFeeOff ? '✅' : '❌';
        console.log(`${feeOK}${feeOffOK} ID ${order.id}: tržba=${order.castka}, fee=${order.fee} (${expectedFee}), fee_off=${order.fee_off} (${expectedFeeOff}), zisk=${order.zisk}`);
      });
    }

  } catch (error) {
    console.error('💥 Fatální chyba:', error);
  }
}

// Spusť obnovu
restoreLenkaFees().then(() => {
  console.log('\n🏁 Skript dokončen');
  process.exit(0);
}).catch(error => {
  console.error('💥 Kritická chyba:', error);
  process.exit(1);
});
