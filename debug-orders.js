
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lseqrqmtjymukewnejdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw'
);

async function checkAllOrders() {
  console.log('🔍 Kontroluji všechny zakázky v databázi...');
  
  // Načti všechny uživatele
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*');
    
  if (usersError) {
    console.error('❌ Chyba při načítání uživatelů:', usersError);
    return;
  }
  
  console.log('👥 Uživatelé v databázi:', users.map(u => `${u.name} (${u.id})`));
  
  // Načti všechny zakázky
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10); // Posledních 10 zakázek
    
  if (ordersError) {
    console.error('❌ Chyba při načítání zakázek:', ordersError);
    return;
  }
  
  console.log('📋 Posledních 10 zakázek:');
  orders.forEach(order => {
    const user = users.find(u => u.id === order.user_id);
    const userName = user ? user.name : 'Neznámý uživatel';
    console.log(`- ${order.cislo} | ${order.klient} | ${order.castka} Kč | ${userName} | ${order.created_at}`);
  });
  
  // Hledej zakázky vytvořené v posledních 2 hodinách
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', twoHoursAgo)
    .order('created_at', { ascending: false });
    
  if (recentOrders && recentOrders.length > 0) {
    console.log('🕐 Zakázky vytvořené v posledních 2 hodinách:');
    recentOrders.forEach(order => {
      const user = users.find(u => u.id === order.user_id);
      const userName = user ? user.name : 'Neznámý uživatel';
      console.log(`- ${order.cislo} | ${order.klient} | ${order.castka} Kč | ${userName} | ${new Date(order.created_at).toLocaleString('cs-CZ')}`);
    });
  } else {
    console.log('📅 Žádné zakázky vytvořené v posledních 2 hodinách');
  }
}

checkAllOrders().catch(console.error);
