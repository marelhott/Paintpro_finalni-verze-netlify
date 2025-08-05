
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lseqrqmtjymukewnejdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw'
);

// Data bez fee_off - použijeme jen existující sloupce
const finalData = [
  {
    cislo: '#14347',
    datum: '27.1.2025',
    castka: 6700,
    fee: 1748,
    palivo: 300,
    material: 1000,
    pomocnik: 0,
    zisk: 3652,
    doba_realizace: 1
  },
  {
    cislo: '#14181',
    datum: '15.3.2025',
    castka: 6400,
    fee: 1670,
    palivo: 300,
    material: 400,
    pomocnik: 0,
    zisk: 4030,
    doba_realizace: 1
  },
  {
    cislo: '#14674',
    datum: '23.2.2025',
    castka: 5800,
    fee: 1514,
    palivo: 300,
    material: 400,
    pomocnik: 0,
    zisk: 3586,
    doba_realizace: 1
  },
  {
    cislo: 'zakázka Vincent',
    datum: '25.2.2025',
    castka: 5750,
    fee: 1501,
    palivo: 300,
    material: 1000,
    pomocnik: 0,
    zisk: 2949,
    doba_realizace: 1
  },
  {
    cislo: '#15457',
    datum: '16.4.2025',
    castka: 8400,
    fee: 2192,
    palivo: 500,
    material: 1000,
    pomocnik: 1000,
    zisk: 3708,
    doba_realizace: 2
  },
  {
    cislo: '#81913',
    datum: '24.4.2025',
    castka: 10500,
    fee: 2741,
    palivo: 200,
    material: 1000,
    pomocnik: 2500,
    zisk: 4059,
    doba_realizace: 3
  },
  {
    cislo: '#67703',
    datum: '22.4.2025',
    castka: 10400,
    fee: 2714,
    palivo: 500,
    material: 1000,
    pomocnik: 2000,
    zisk: 4186,
    doba_realizace: 3
  },
  {
    cislo: '#82187',
    datum: '14.5.2025',
    castka: 17800,
    fee: 4646,
    palivo: 300,
    material: 700,
    pomocnik: 0,
    zisk: 12154,
    doba_realizace: 4
  },
  {
    cislo: '#95067',
    datum: '15.5.2025',
    castka: 7500,
    fee: 1958,
    palivo: 300,
    material: 700,
    pomocnik: 2000,
    zisk: 2542,
    doba_realizace: 2
  },
  {
    cislo: '#95105',
    datum: '13.5.2025',
    castka: 11400,
    fee: 2975,
    palivo: 300,
    material: 700,
    pomocnik: 2000,
    zisk: 5425,
    doba_realizace: 3
  },
  {
    cislo: '#67475',
    datum: '11.5.2025',
    castka: 8100,
    fee: 2114,
    palivo: 300,
    material: 700,
    pomocnik: 2000,
    zisk: 2986,
    doba_realizace: 2
  },
  {
    cislo: '#95333',
    datum: '9.6.2025',
    castka: 24000,
    fee: 6264,
    palivo: 300,
    material: 700,
    pomocnik: 2000,
    zisk: 14736,
    doba_realizace: 5
  },
  {
    cislo: '#104470',
    datum: '16.6.2025',
    castka: 7200,
    fee: 1879,
    palivo: 200,
    material: 700,
    pomocnik: 2000,
    zisk: 2421,
    doba_realizace: 2
  },
  {
    cislo: '#88368',
    datum: '5.7.2025',
    castka: 27200,
    fee: 7099,
    palivo: 700,
    material: 2400,
    pomocnik: 7000,
    zisk: 10001,
    doba_realizace: 6
  },
  {
    cislo: '#107239',
    datum: 'Duben',
    castka: 3380,
    fee: 882,
    palivo: 300,
    material: 1000,
    pomocnik: 2000,
    zisk: -802,
    doba_realizace: 1
  }
];

async function updateAll() {
  console.log('🚀 Začínám aktualizaci - BEZ fee_off sloupce...');
  
  for (const item of finalData) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          datum: item.datum,
          castka: item.castka,
          fee: item.fee,
          fee_off: item.castka - item.fee,
          palivo: item.palivo,
          material: item.material,
          pomocnik: item.pomocnik,
          zisk: item.zisk,
          doba_realizace: item.doba_realizace
        })
        .eq('user_id', 'lenka')
        .eq('cislo', item.cislo);
      
      if (error) {
        console.error(`❌ Chyba u ${item.cislo}:`, error);
      } else {
        console.log(`✅ ${item.cislo} - ${item.castka} Kč - HOTOVO`);
      }
    } catch (err) {
      console.error(`💥 Fatální chyba u ${item.cislo}:`, err);
    }
  }
  
  console.log('🎉 Aktualizace dokončena!');
}

updateAll();
