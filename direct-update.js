import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lseqrqmtjymukewnejdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw'
);

// Přesné hodnoty z fotky
const updates = [
  { cislo: '#14347', castka: 6700, palivo: 300, material: 1000, pomocnik: 0 },
  { cislo: '#14181', castka: 6400, palivo: 300, material: 400, pomocnik: 0 },
  { cislo: '#14674', castka: 5800, palivo: 300, material: 400, pomocnik: 0 },
  { cislo: 'zakázka Vincent', castka: 5750, palivo: 300, material: 1000, pomocnik: 0 },
  { cislo: '#15457', castka: 8400, palivo: 500, material: 1000, pomocnik: 1000 },
  { cislo: '#81913', castka: 10500, palivo: 200, material: 1000, pomocnik: 2500 },
  { cislo: '#67703', castka: 10400, palivo: 500, material: 1000, pomocnik: 2000 },
  { cislo: '#82187', castka: 17800, palivo: 300, material: 700, pomocnik: 0 },
  { cislo: '#95067', castka: 7500, palivo: 300, material: 700, pomocnik: 2000 },
  { cislo: '#95105', castka: 11400, palivo: 300, material: 700, pomocnik: 2000 },
  { cislo: '#67475', castka: 8100, palivo: 300, material: 700, pomocnik: 2000 },
  { cislo: '#95333', castka: 24000, palivo: 300, material: 700, pomocnik: 2000 },
  { cislo: '#104470', castka: 7200, palivo: 200, material: 700, pomocnik: 2000 },
  { cislo: '#88368', castka: 27200, palivo: 700, material: 2400, pomocnik: 7000 },
  { cislo: '#107239', castka: 3380, palivo: 300, material: 1000, pomocnik: 2000 }
];

async function updateData() {
  for (const item of updates) {
    const fee = Math.round(item.castka * 0.261);
    const fee_off = item.castka - fee;
    const zisk = fee_off - item.palivo - item.material - item.pomocnik;

    await supabase
      .from('orders')
      .update({
        castka: item.castka,
        fee: fee,
        fee_off: fee_off,
        palivo: item.palivo,
        material: item.material,
        pomocnik: item.pomocnik,
        zisk: zisk
      })
      .eq('user_id', 'lenka')
      .eq('cislo', item.cislo);

    console.log(`✅ ${item.cislo} aktualizováno`);
  }
}

updateData();