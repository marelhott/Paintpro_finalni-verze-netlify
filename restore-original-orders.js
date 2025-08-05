
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lseqrqmtjymukewnejdd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw';

const supabase = createClient(supabaseUrl, supabaseKey);

// Původní zakázky z tabulky
const originalOrders = [
  { id: 1, datum: '2025-04-11', druh: 'MVČ', klient: 'Gabriela Hajduchová', castka: 10000, fee: 2000, adresa: 'Letohradská', telefon: '777123456', typ: 'byt', poznamka: 'Praha 7' },
  { id: 2, datum: '2025-04-14', druh: 'Adam - minutost', klient: 'Tereza Pochovilásková', castka: 14000, fee: 2000, adresa: 'Eliškovstva 9', telefon: '702036273', typ: 'byt', poznamka: 'Praha 9' },
  { id: 3, datum: '2025-04-17', druh: 'MVČ', klient: 'Katka Szczepanilová', castka: 16000, fee: 2000, adresa: 'Nad aleji 23', telefon: '604209240', typ: 'byt', poznamka: 'Praha 6' },
  { id: 4, datum: '2025-04-18', druh: 'Adam - Albert', klient: '', castka: 3000, fee: 0, adresa: 'U polikonu', telefon: '', typ: 'byt', poznamka: 'Praha 2' },
  { id: 5, datum: '2025-04-21', druh: 'MVČ', klient: 'Marek Rucki', castka: 25000, fee: 4000, adresa: 'Národní ebrany 49', telefon: '724216335', typ: 'byt', poznamka: 'Praha 6' },
  { id: 6, datum: '2025-04-26', druh: 'MVČ', klient: 'Katka Szczepanilová', castka: 10000, fee: 0, adresa: 'Nad aleji 23', telefon: '604209240', typ: 'byt', poznamka: 'Praha 6', material: 0, pomocnik: 0, palivo: 0 },
  { id: 7, datum: '2025-04-27', druh: 'popravky', klient: 'Augustin', castka: 72000, fee: 20000, adresa: 'Horní polubný', telefon: '', typ: 'penzion', poznamka: 'Klenov', doba_realizace: 18 },
  { id: 8, datum: '2025-04-28', druh: 'MVČ', klient: 'Zdeněk Fiedler', castka: 24000, fee: 4000, adresa: 'Pod jerovem 14', telefon: '604889153', typ: 'byt', poznamka: 'Praha 3' },
  { id: 9, datum: '2025-05-02', druh: 'MVČ', klient: 'Vojtěch Král', castka: 15000, fee: 0, adresa: 'Kalváčová 542/8', telefon: '732863461', typ: 'byt', poznamka: 'Praha 9' },
  { id: 10, datum: '2025-05-05', druh: 'MVČ', klient: 'Petr Dvoják', castka: 30000, fee: 6000, adresa: 'Za Mlýnem 1746', telefon: '607864873', typ: 'byt', poznamka: 'Hostivice' },
  { id: 11, datum: '2025-05-07', druh: 'Adam - Albert', klient: '', castka: 4500, fee: 0, adresa: 'Beroun', telefon: '', typ: 'dům', poznamka: '' },
  { id: 12, datum: '2025-05-11', druh: 'Adam - Lenka', klient: 'Andrej Vacík', castka: 17800, fee: 4000, adresa: 'Na Pomezí 133/36', telefon: '', typ: 'byt', poznamka: 'Praha 5' },
  { id: 13, datum: '2025-05-13', druh: 'Adam - Lenka', klient: '', castka: 2000, fee: 0, adresa: '', telefon: '', typ: 'byt', poznamka: '' },
  { id: 14, datum: '2025-05-14', druh: 'Adam - Lenka', klient: '', castka: 2000, fee: 0, adresa: 'Beroun', telefon: '', typ: 'byt', poznamka: '' },
  { id: 15, datum: '2025-05-15', druh: 'Adam - Lenka', klient: '', castka: 2000, fee: 0, adresa: 'Říčany', telefon: '', typ: 'dům', poznamka: '' },
  { id: 16, datum: '2025-05-16', druh: 'MVČ', klient: 'Tomáš Parha', castka: 9000, fee: 1000, adresa: 'V Domki 1516/1c', telefon: '', typ: 'byt', poznamka: 'Praha Michli' },
  { id: 17, datum: '2025-05-17', druh: 'Adam - Martin', klient: '', castka: 11300, fee: 4000, adresa: 'Tuchoměřice', telefon: '', typ: 'byt', poznamka: '' },
  { id: 18, datum: '2025-05-20', druh: 'Adam - Albert', klient: '', castka: 2800, fee: 0, adresa: 'Praha Kamýk', telefon: '', typ: 'dveře', poznamka: '' },
  { id: 19, datum: '2025-05-20', druh: 'dohoz', klient: 'Josef Švejda', castka: 4000, fee: 0, adresa: 'Ortenovo náměstí', telefon: '', typ: 'podlaha', poznamka: 'Praha 7' },
  { id: 20, datum: '2025-05-22', druh: 'Adam - Albert', klient: '', castka: 3500, fee: 0, adresa: '', telefon: '', typ: 'byt', poznamka: '' },
  { id: 21, datum: '2025-05-23', druh: 'Adam - Vincent', klient: '', castka: 8000, fee: 2000, adresa: 'Říčany', telefon: '', typ: 'dům', poznamka: '' },
  { id: 22, datum: '2025-05-26', druh: 'Adam - Vincent', klient: '', castka: 4000, fee: 0, adresa: 'Zbraslav', telefon: '', typ: 'dům', poznamka: '' },
  { id: 23, datum: '2025-05-27', druh: 'MVČ', klient: 'Hancock', castka: 8000, fee: 0, adresa: 'Praha Nový', telefon: '', typ: 'byt', poznamka: '' },
  { id: 24, datum: '2025-05-28', druh: 'MVČ', klient: 'Kolínský - Mc Donalds', castka: 6000, fee: 0, adresa: 'Benátky na Jizerou', telefon: '', typ: 'provozovna', poznamka: '' }
];

function getUserIdFromDruh(druh) {
  if (druh.includes('Adam - Lenka')) return 'lenka';
  if (druh.includes('Adam')) return 'admin_1'; // Adam zakázky pro administrátora
  return 'admin_1'; // MVČ a ostatní pro administrátora
}

function calculateFeeOff(castka, fee) {
  return castka - fee;
}

function calculateZisk(castka, fee, material = 0, pomocnik = 0, palivo = 0) {
  const feeOff = calculateFeeOff(castka, fee);
  return feeOff - material - pomocnik - palivo;
}

function formatDate(dateStr) {
  // Převeď z 2025-04-11 na 11. 4. 2025
  const parts = dateStr.split('-');
  return `${parseInt(parts[2])}. ${parseInt(parts[1])}. ${parts[0]}`;
}

async function restoreOriginalOrders() {
  console.log('🔍 === OBNOVA PŮVODNÍCH ZAKÁZEK ===');
  console.log('⏰', new Date().toLocaleString('cs-CZ'));
  
  try {
    // Načti aktuální zakázky ze Supabase
    console.log('📊 Načítám aktuální zakázky ze Supabase...');
    const { data: currentOrders, error } = await supabase
      .from('orders')
      .select('id, cislo, klient, castka, datum')
      .order('id');
    
    if (error) {
      console.error('❌ Chyba při načítání aktuálních zakázek:', error);
      return;
    }
    
    console.log('✅ Aktuálně v databázi:', currentOrders.length, 'zakázek');
    console.log('📋 Existující ID:', currentOrders.map(o => o.id).join(', '));
    
    // Porovnej s původními zakázkami
    const missingOrders = originalOrders.filter(original => 
      !currentOrders.some(current => current.id === original.id)
    );
    
    console.log('❌ Chybějící zakázky:', missingOrders.length);
    
    if (missingOrders.length === 0) {
      console.log('✅ Všechny původní zakázky jsou již v databázi!');
      return;
    }
    
    console.log('🔄 Chybějící ID:', missingOrders.map(o => o.id).join(', '));
    
    // Pro každou chybějící zakázku vytvoř záznam
    let restoredCount = 0;
    let errorCount = 0;
    
    for (const order of missingOrders) {
      try {
        const userId = getUserIdFromDruh(order.druh);
        const material = order.material || 0;
        const pomocnik = order.pomocnik || 0;
        const palivo = order.palivo || 0;
        const feeOff = calculateFeeOff(order.castka, order.fee);
        const zisk = calculateZisk(order.castka, order.fee, material, pomocnik, palivo);
        
        const newOrder = {
          id: order.id,
          user_id: userId,
          datum: formatDate(order.datum),
          druh: order.druh,
          klient: order.klient || '',
          cislo: `ORIG-${order.id}`,
          castka: order.castka,
          fee: order.fee,
          fee_off: feeOff,
          material: material,
          pomocnik: pomocnik,
          palivo: palivo,
          adresa: order.adresa || '',
          typ: order.typ || 'byt',
          doba_realizace: order.doba_realizace || 1,
          poznamka: order.poznamka || '',
          soubory: [],
          zisk: zisk,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log(`\n🔄 Obnovuji zakázku ID ${order.id}:`);
        console.log(`  👤 Uživatel: ${userId}`);
        console.log(`  📅 Datum: ${newOrder.datum}`);
        console.log(`  🏷️ Druh: ${order.druh}`);
        console.log(`  👥 Klient: ${order.klient || 'BEZ KLIENTA'}`);
        console.log(`  💰 Částka: ${order.castka} Kč`);
        console.log(`  🏦 Fee: ${order.fee} Kč`);
        console.log(`  💵 Fee OFF: ${feeOff} Kč`);
        console.log(`  💚 Zisk: ${zisk} Kč`);
        
        const { error: insertError } = await supabase
          .from('orders')
          .insert([newOrder]);
        
        if (insertError) {
          console.error(`❌ Chyba při vkládání ID ${order.id}:`, insertError.message);
          errorCount++;
        } else {
          console.log(`✅ Obnovena zakázka ID: ${order.id}`);
          restoredCount++;
        }
        
        // Pauza mezi vkládáními
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (e) {
        console.error(`💥 Fatální chyba u ID ${order.id}:`, e.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 === VÝSLEDEK OBNOVY ===');
    console.log(`✅ Úspěšně obnoveno: ${restoredCount} zakázek`);
    console.log(`❌ Chyby: ${errorCount} zakázek`);
    console.log(`📋 Celkem původních zakázek: ${originalOrders.length}`);
    
    if (restoredCount > 0) {
      console.log('🎉 OBNOVA DOKONČENA - restartuj aplikaci pro načtení nových dat');
      
      // Kontrola po obnově
      const { data: finalCheck } = await supabase
        .from('orders')
        .select('id')
        .order('id');
      
      if (finalCheck) {
        console.log('🔍 Finální kontrola - ID v databázi:', finalCheck.map(o => o.id).join(', '));
      }
    }
    
  } catch (error) {
    console.error('💥 Fatální chyba:', error);
  }
}

// Spusť obnovu
restoreOriginalOrders()
  .then(() => {
    console.log('\n🏁 Skript dokončen');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Kritická chyba:', error);
    process.exit(1);
  });
