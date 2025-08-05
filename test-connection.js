
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lseqrqmtjymukewnejdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw'
);

async function testConnection() {
  console.log('🔍 Testuji připojení k Supabase...');
  
  try {
    // Test připojení
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
      
    if (usersError) {
      console.error('❌ Chyba při načítání uživatelů:', usersError);
      return;
    }
    
    console.log('✅ Uživatelé načteni:', users.length);
    users.forEach(user => {
      console.log(`- ${user.name} (${user.id}) PIN hash: ${user.pin_hash}`);
    });
    
    // Test vytvoření testovací zakázky
    const testOrder = {
      user_id: 'admin_1',
      datum: new Date().toLocaleDateString('cs-CZ'),
      druh: 'Test',
      klient: 'Test Klient',
      cislo: 'TEST-' + Date.now(),
      castka: 1000,
      fee: 261,
      material: 0,
      pomocnik: 0,
      palivo: 0,
      adresa: 'Test adresa',
      typ: 'byt',
      poznamky: 'Test zakázka pro ověření připojení',
      soubory: [],
      zisk: 739,
      created_at: new Date().toISOString()
    };
    
    console.log('🔄 Vytvářím testovací zakázku...');
    const { data: newOrder, error: insertError } = await supabase
      .from('orders')
      .insert([testOrder])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Chyba při vytváření zakázky:', insertError);
      return;
    }
    
    console.log('✅ Testovací zakázka vytvořena:', newOrder.id);
    
    // Okamžitě ji smaž
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', newOrder.id);
    
    if (deleteError) {
      console.error('❌ Chyba při mazání testovací zakázky:', deleteError);
    } else {
      console.log('✅ Testovací zakázka smazána');
    }
    
    // Načti skutečné zakázky
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', 'admin_1')
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      console.error('❌ Chyba při načítání zakázek:', ordersError);
    } else {
      console.log('✅ Načteno zakázek administrátora:', orders.length);
    }
    
    console.log('🎉 Test připojení dokončen úspěšně!');
    
  } catch (error) {
    console.error('💥 Fatální chyba při testu:', error);
  }
}

testConnection();
