
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lseqrqmtjymukewnejdd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runComprehensiveDiagnostic() {
  console.log('🔍 === SUPABASE DIAGNOSTIKA START ===');
  console.log('⏰', new Date().toLocaleString('cs-CZ'));
  console.log('');

  // === 1. ZÁKLADNÍ PŘIPOJENÍ ===
  console.log('📡 1. TESTOVÁNÍ PŘIPOJENÍ');
  try {
    const { data, error } = await supabase.from('users').select('count');
    if (error) {
      console.error('❌ Chyba připojení:', error.message);
      return;
    }
    console.log('✅ Připojení k Supabase funguje');
  } catch (e) {
    console.error('❌ Fatální chyba připojení:', e.message);
    return;
  }
  console.log('');

  // === 2. ANALÝZA UŽIVATELŮ ===
  console.log('👥 2. ANALÝZA UŽIVATELŮ');
  try {
    const { data: users, error } = await supabase.from('users').select('*');
    if (error) throw error;
    
    console.log('📊 Celkem uživatelů:', users.length);
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.id}) | PIN hash: ${user.pin_hash} | Admin: ${user.is_admin ? 'ANO' : 'NE'}`);
    });
  } catch (e) {
    console.error('❌ Chyba při načítání uživatelů:', e.message);
  }
  console.log('');

  // === 3. ANALÝZA VŠECH ZAKÁZEK ===
  console.log('📋 3. ANALÝZA VŠECH ZAKÁZEK');
  try {
    const { data: allOrders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log('📊 Celkem zakázek v databázi:', allOrders.length);
    
    // Analýza podle uživatelů
    const ordersByUser = {};
    allOrders.forEach(order => {
      if (!ordersByUser[order.user_id]) {
        ordersByUser[order.user_id] = [];
      }
      ordersByUser[order.user_id].push(order);
    });
    
    console.log('📊 Rozdělení podle uživatelů:');
    Object.entries(ordersByUser).forEach(([userId, orders]) => {
      console.log(`  - ${userId}: ${orders.length} zakázek`);
    });
    
  } catch (e) {
    console.error('❌ Chyba při načítání zakázek:', e.message);
  }
  console.log('');

  // === 4. IDENTIFIKACE NEVALIDNÍCH ZÁZNAMŮ ===
  console.log('⚠️  4. IDENTIFIKACE PROBLÉMOVÝCH ZÁZNAMŮ');
  try {
    const { data: allOrders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', 'admin_1')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log('📊 Zakázky administrátora celkem:', allOrders.length);
    
    // Kontrola validity
    const validOrders = [];
    const invalidOrders = [];
    
    allOrders.forEach(order => {
      if (!order.klient || order.klient === null || order.klient === '') {
        invalidOrders.push({
          id: order.id,
          reason: 'Chybí klient',
          datum: order.datum,
          druh: order.druh,
          castka: order.castka,
          created_at: order.created_at
        });
      } else if (!order.castka || order.castka === 0) {
        invalidOrders.push({
          id: order.id,
          reason: 'Nulová/chybí částka',
          datum: order.datum,
          druh: order.druh,
          klient: order.klient,
          created_at: order.created_at
        });
      } else {
        validOrders.push(order);
      }
    });
    
    console.log('✅ Validní zakázky:', validOrders.length);
    console.log('❌ Nevalidní zakázky:', invalidOrders.length);
    
    if (invalidOrders.length > 0) {
      console.log('');
      console.log('🚨 SEZNAM PROBLÉMOVÝCH ZÁZNAMŮ:');
      invalidOrders.forEach(order => {
        console.log(`  ID: ${order.id} | ${order.reason} | ${order.datum} | ${order.druh} | Vytvořeno: ${new Date(order.created_at).toLocaleString('cs-CZ')}`);
      });
    }
    
  } catch (e) {
    console.error('❌ Chyba při analýze validity:', e.message);
  }
  console.log('');

  // === 5. IDENTIFIKACE DUPLICIT ===
  console.log('🔍 5. HLEDÁNÍ DUPLICITNÍCH ZÁZNAMŮ');
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', 'admin_1')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Hledej duplicity podle času vytvoření
    const timeGroups = {};
    orders.forEach(order => {
      const timeKey = new Date(order.created_at).getTime();
      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = [];
      }
      timeGroups[timeKey].push(order);
    });
    
    const duplicates = Object.entries(timeGroups).filter(([time, orders]) => orders.length > 1);
    
    console.log('📊 Skupiny se stejným časem vytvoření:', duplicates.length);
    
    if (duplicates.length > 0) {
      console.log('');
      console.log('🚨 DUPLICITNÍ ZÁZNAMY (stejný čas vytvoření):');
      duplicates.forEach(([time, orders]) => {
        const date = new Date(parseInt(time)).toLocaleString('cs-CZ');
        console.log(`  Čas: ${date} - ${orders.length} záznamů:`);
        orders.forEach(order => {
          console.log(`    ID: ${order.id} | ${order.klient || 'BEZ KLIENTA'} | ${order.castka} Kč | ${order.druh}`);
        });
        console.log('');
      });
    }
    
  } catch (e) {
    console.error('❌ Chyba při hledání duplicit:', e.message);
  }
  console.log('');

  // === 6. ANALÝZA CACHE ===
  console.log('💾 6. ANALÝZA LOKÁLNÍ CACHE');
  try {
    const cacheKey = 'paintpro_orders_cache_admin_1';
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const cachedData = JSON.parse(cached);
      console.log('📊 Cache obsahuje:', cachedData.length, 'záznamů');
      
      const validCached = cachedData.filter(order => order.klient && order.castka);
      console.log('✅ Validní v cache:', validCached.length);
      console.log('❌ Nevalidní v cache:', cachedData.length - validCached.length);
    } else {
      console.log('📊 Cache je prázdná nebo neexistuje');
    }
  } catch (e) {
    console.error('❌ Chyba při analýze cache:', e.message);
  }
  console.log('');

  // === 7. ANALÝZA OFFLINE QUEUE ===
  console.log('🔄 7. ANALÝZA OFFLINE QUEUE');
  try {
    const queue = localStorage.getItem('sync_queue');
    if (queue) {
      const queueData = JSON.parse(queue);
      console.log('📊 Queue obsahuje:', queueData.length, 'operací');
      
      if (queueData.length > 0) {
        const operationTypes = {};
        queueData.forEach(op => {
          operationTypes[op.type] = (operationTypes[op.type] || 0) + 1;
        });
        
        console.log('📊 Typy operací v queue:');
        Object.entries(operationTypes).forEach(([type, count]) => {
          console.log(`  - ${type}: ${count}x`);
        });
      }
    } else {
      console.log('📊 Queue je prázdná');
    }
  } catch (e) {
    console.error('❌ Chyba při analýze queue:', e.message);
  }
  console.log('');

  // === 8. DOPORUČENÍ ===
  console.log('💡 8. DOPORUČENÍ PRO ŘEŠENÍ');
  
  try {
    const { data: allOrders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', 'admin_1');
    
    if (error) throw error;
    
    const invalidCount = allOrders.filter(order => !order.klient || !order.castka).length;
    const validCount = allOrders.length - invalidCount;
    
    if (invalidCount > 0) {
      console.log(`🔧 1. VYČISTIT ${invalidCount} nevalidních záznamů ze Supabase`);
      console.log('🔧 2. VYMAZAT lokální cache pro resynchronizaci');
      console.log('🔧 3. VYMAZAT offline queue');
      console.log('🔧 4. RESTARTOVAT aplikaci');
    } else {
      console.log('✅ Databáze je čistá, problémy jsou pravděpodobně v aplikační logice');
    }
    
    console.log('');
    console.log('📊 SHRNUTÍ:');
    console.log(`  - Celkem záznamů: ${allOrders.length}`);
    console.log(`  - Validní záznamy: ${validCount}`);
    console.log(`  - Nevalidní záznamy: ${invalidCount}`);
    console.log(`  - Úspěšnost: ${Math.round((validCount / allOrders.length) * 100)}%`);
    
  } catch (e) {
    console.error('❌ Chyba při generování doporučení:', e.message);
  }
  
  console.log('');
  console.log('🔍 === DIAGNOSTIKA DOKONČENA ===');
  console.log('⏰', new Date().toLocaleString('cs-CZ'));
}

// Spusť diagnostiku
runComprehensiveDiagnostic().catch(console.error);
