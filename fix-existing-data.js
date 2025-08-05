
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lseqrqmtjymukewnejdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw'
);

async function fixExistingData() {
  console.log('🔧 === OPRAVA EXISTUJÍCÍCH DAT ===');
  console.log('⏰', new Date().toLocaleString('cs-CZ'));

  try {
    // Načti všechny záznamy
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*');

    if (error) {
      console.error('❌ Chyba při načítání:', error);
      return;
    }

    console.log('📊 Celkem záznamů:', orders.length);

    let fixedCount = 0;
    let errorCount = 0;

    for (const order of orders) {
      try {
        let needsUpdate = false;
        const updates = {};

        // 1. Oprav soubory - z "[]" string na prázdné pole
        if (typeof order.soubory === 'string' && order.soubory === '[]') {
          updates.soubory = JSON.stringify([]);
          needsUpdate = true;
          console.log(`📁 Opravuji soubory pro ID ${order.id}`);
        }

        // 2. Zkontroluj fee - pokud je fee_off = castka, znamená to že fee mělo být 0
        if (order.fee_off === order.castka && order.fee > 0) {
          updates.fee = 0;
          updates.zisk = order.castka - 0 - (order.material || 0) - (order.pomocnik || 0) - (order.palivo || 0);
          needsUpdate = true;
          console.log(`💰 Opravuji fee pro ID ${order.id} (fee: ${order.fee} → 0)`);
        }

        // 3. Aktualizuj pokud je potřeba
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', order.id);

          if (updateError) {
            console.error(`❌ Chyba při aktualizaci ID ${order.id}:`, updateError);
            errorCount++;
          } else {
            console.log(`✅ Opraven záznam ID ${order.id}`);
            fixedCount++;
          }
        }

      } catch (err) {
        console.error(`💥 Fatální chyba u ID ${order.id}:`, err);
        errorCount++;
      }
    }

    console.log('\n📊 === VÝSLEDEK OPRAVY ===');
    console.log('✅ Opraveno záznamů:', fixedCount);
    console.log('❌ Chyb:', errorCount);
    console.log('🎉 OPRAVA DOKONČENA');

  } catch (error) {
    console.error('💥 Fatální chyba:', error);
  }
}

// Spusť opravu
fixExistingData();
