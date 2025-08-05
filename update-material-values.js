
import { createClient } from '@supabase/supabase-js';

// Připoj se k Supabase
const supabase = createClient(
  'https://lseqrqmtjymukewnejdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw'
);

// Data přesně podle fotky - řazeno od nejnovějších po nejstarší
const dataZFotky = [
  // Červenec 2025
  { datum: '5.7.2025', id_zakazky: '#107239', trzba: 3380, palivo: 300, material: 1000, pomocnik: 2000, doba_realizace: 3 },
  
  // Červen 2025  
  { datum: '16.6.2025', id_zakazky: '#88368', trzba: 27200, palivo: 700, material: 2400, pomocnik: 7000, doba_realizace: 2 },
  { datum: '9.6.2025', id_zakazky: '#104470', trzba: 7200, palivo: 200, material: 700, pomocnik: 2000, doba_realizace: 1 },
  
  // Květen 2025
  { datum: '11.5.2025', id_zakazky: '#95333', trzba: 24000, palivo: 300, material: 700, pomocnik: 2000, doba_realizace: 2 },
  { datum: '13.5.2025', id_zakazky: '#67475', trzba: 8100, palivo: 300, material: 700, pomocnik: 2000, doba_realizace: 1 },
  { datum: '15.5.2025', id_zakazky: '#95105', trzba: 11400, palivo: 300, material: 700, pomocnik: 2000, doba_realizace: 1 },
  { datum: '14.5.2025', id_zakazky: '#95067', trzba: 7500, palivo: 300, material: 700, pomocnik: 2000, doba_realizace: 1 },
  
  // Duben 2025
  { datum: '22.4.2025', id_zakazky: '#82187', trzba: 17800, palivo: 300, material: 700, pomocnik: 0, doba_realizace: 2 },
  { datum: '24.4.2025', id_zakazky: '#67703', trzba: 10400, palivo: 500, material: 1000, pomocnik: 2000, doba_realizace: 2 },
  { datum: '16.4.2025', id_zakazky: '#15457', trzba: 8400, palivo: 500, material: 1000, pomocnik: 1000, doba_realizace: 1 },
  { datum: '19.4.2025', id_zakazky: '#81913', trzba: 10500, palivo: 200, material: 1000, pomocnik: 2500, doba_realizace: 2 },
  
  // Únor 2025
  { datum: '25.2.2025', id_zakazky: '#14674', trzba: 5800, palivo: 300, material: 400, pomocnik: 0, doba_realizace: 1 },
  { datum: '23.2.2025', id_zakazky: '#14181', trzba: 6400, palivo: 300, material: 400, pomocnik: 0, doba_realizace: 1 },
  
  // Březen 2025
  { datum: '15.3.2025', id_zakazky: 'zakázka Vincent', trzba: 5750, palivo: 300, material: 1000, pomocnik: 0, doba_realizace: 2 },
  
  // Leden 2025
  { datum: '27.1.2025', id_zakazky: '#14347', trzba: 6700, palivo: 300, material: 1000, pomocnik: 0, doba_realizace: 2 }
];

async function aktualizujDleDataZFotky() {
  try {
    console.log('📊 Aktualizuji data podle fotky a tvých pokynů...');
    console.log('📋 Celkem k aktualizaci:', dataZFotky.length, 'zakázek');
    
    let uspesne = 0;
    let chyby = 0;
    
    for (const radek of dataZFotky) {
      try {
        // Spočítej fee (26,1% z tržby)
        const fee = Math.round(radek.trzba * 0.261);
        // Spočítej fee_off (tržba - fee)
        const fee_off = radek.trzba - fee;
        // Spočítej čistý zisk (fee_off - všechny náklady)
        const cisty_zisk = fee_off - radek.palivo - radek.material - radek.pomocnik;
        
        console.log(`\n🔄 Zpracovávám: ${radek.id_zakazky}`);
        console.log(`   📅 Datum: ${radek.datum}`);
        console.log(`   💰 Tržba: ${radek.trzba} Kč`);
        console.log(`   🏦 Fee (26,1%): ${fee} Kč`);
        console.log(`   💵 Fee OFF: ${fee_off} Kč`);
        console.log(`   ⛽ Palivo: ${radek.palivo} Kč`);
        console.log(`   🔧 Materiál: ${radek.material} Kč`);
        console.log(`   👷 Pomocník: ${radek.pomocnik} Kč`);
        console.log(`   💚 Čistý zisk: ${cisty_zisk} Kč`);
        console.log(`   📆 Doba realizace: ${radek.doba_realizace} dnů`);
        
        // Najdi existující zakázku podle ID nebo tržby
        const { data: existujici, error: hledaniError } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', 'lenka')
          .or(`cislo.eq.${radek.id_zakazky},castka.eq.${radek.trzba}`)
          .maybeSingle();
          
        if (hledaniError) {
          console.error(`❌ Chyba při hledání ${radek.id_zakazky}:`, hledaniError);
          chyby++;
          continue;
        }
        
        if (existujici) {
          // Aktualizuj existující záznam
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              datum: radek.datum,
              cislo: radek.id_zakazky,
              castka: radek.trzba,
              fee: fee,
              fee_off: fee_off,
              palivo: radek.palivo,
              material: radek.material,
              pomocnik: radek.pomocnik,
              zisk: cisty_zisk,
              doba_realizace: radek.doba_realizace
            })
            .eq('id', existujici.id);
            
          if (updateError) {
            console.error(`❌ Chyba při aktualizaci ${radek.id_zakazky}:`, updateError);
            chyby++;
          } else {
            console.log(`✅ ${radek.id_zakazky} úspěšně aktualizováno`);
            uspesne++;
          }
        } else {
          // Vytvoř nový záznam
          const { error: insertError } = await supabase
            .from('orders')
            .insert([{
              user_id: 'lenka',
              datum: radek.datum,
              cislo: radek.id_zakazky,
              druh: 'malování',
              castka: radek.trzba,
              fee: fee,
              fee_off: fee_off,
              palivo: radek.palivo,
              material: radek.material,
              pomocnik: radek.pomocnik,
              zisk: cisty_zisk,
              doba_realizace: radek.doba_realizace,
              typ: 'byt'
            }]);
            
          if (insertError) {
            console.error(`❌ Chyba při vytváření ${radek.id_zakazky}:`, insertError);
            chyby++;
          } else {
            console.log(`✅ ${radek.id_zakazky} úspěšně vytvořeno`);
            uspesne++;
          }
        }
        
        // Krátká pauza
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Chyba při zpracování ${radek.id_zakazky}:`, error);
        chyby++;
      }
    }
    
    console.log(`\n📊 VÝSLEDEK:`);
    console.log(`✅ Úspěšně zpracováno: ${uspesne} zakázek`);
    console.log(`❌ Chyby: ${chyby} zakázek`);
    
    // Zobraz finální stav
    console.log('\n🔍 Kontrola finálního stavu:');
    const { data: vsechnyZakazky } = await supabase
      .from('orders')
      .select('datum, cislo, castka, fee, fee_off, palivo, material, pomocnik, zisk, doba_realizace')
      .eq('user_id', 'lenka')
      .order('datum', { ascending: false });
      
    if (vsechnyZakazky) {
      console.log('\n📋 Aktuální stav zakázek (od nejnovějších):');
      vsechnyZakazky.forEach(z => {
        console.log(`${z.cislo} | ${z.datum} | Tržba: ${z.castka} | Fee: ${z.fee} | Fee OFF: ${z.fee_off} | Zisk: ${z.zisk} | Doba: ${z.doba_realizace} dnů`);
      });
    }
    
  } catch (error) {
    console.error('❌ Celková chyba:', error);
  }
}

// Spusť aktualizaci
aktualizujDleDataZFotky();
