
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lseqrqmtjymukewnejdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw'
);

async function addFeeOffColumn() {
  try {
    console.log('🔧 Přidávám sloupec fee_off do tabulky orders...');
    
    const { error } = await supabase.rpc('sql', {
      query: 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS fee_off DECIMAL(10,2) DEFAULT 0;'
    });
    
    if (error) {
      console.error('❌ Chyba při přidávání sloupce:', error);
    } else {
      console.log('✅ Sloupec fee_off úspěšně přidán');
    }
  } catch (err) {
    console.error('💥 Fatální chyba:', err);
  }
}

addFeeOffColumn();
