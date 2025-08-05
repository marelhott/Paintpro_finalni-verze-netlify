import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase konfigurace - environment variables s bezpečnymi fallback hodnotami
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lseqrqmtjymukewnejdd.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw';

console.log('🔧 Supabase konfigurace:');
console.log('- URL:', supabaseUrl ? '✅ Nastaveno' : '❌ CHYBÍ');
console.log('- Key:', supabaseKey ? '✅ Nastaveno' : '❌ CHYBÍ');
console.log('- URL hodnota:', supabaseUrl);

// KONTROLA: Ověř, že konfigurace je kompletní
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ KRITICKÁ CHYBA: Chybí Supabase konfigurace!');
  console.error('📋 KROKY K OPRAVĚ:');
  console.error('1. Otevřete Replit Secrets (Tools > Secrets)');
  console.error('2. Přidejte: VITE_SUPABASE_URL = https://lseqrqmtjymukewnejdd.supabase.co');
  console.error('3. Přidejte: VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw');
  console.error('4. Restartujte aplikaci');
}

// Vytvoř Supabase klienta - vždy by měl existovat
const supabase = createClient(supabaseUrl, supabaseKey);

// Vytvoření AuthContext
const AuthContext = createContext();

// Hook pro použití AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider komponenta
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Hash funkce pro PIN
  const hashPin = (pin) => {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  };

  // Offline queue pro synchronizaci
  const addToQueue = (operation) => {
    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    queue.push({
      ...operation,
      timestamp: Date.now(),
      id: Date.now() + Math.random()
    });
    localStorage.setItem('sync_queue', JSON.stringify(queue));
  };

  // Zpracování offline queue
  const processQueue = async () => {
    if (!isOnline) {
      console.log('📱 Offline - queue se nezpracovává');
      return;
    }

    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    if (queue.length === 0) {
      console.log('📋 Queue je prázdná');
      return;
    }

    console.log('🔄 Zpracovávám offline queue:', queue.length, 'operací');
    const processedOperations = [];
    const failedOperations = [];

    for (const operation of queue) {
      try {
        console.log('🔄 Zpracovávám:', operation.type, operation.tempId || operation.orderId || 'N/A');

        let result = null;
        switch (operation.type) {
          case 'create_user':
            result = await supabase.from('users').insert([operation.data]).select().single();
            break;
          case 'create_order':
            result = await supabase.from('orders').insert([operation.data]).select().single();

            // Pokud má tempId, aktualizuj cache s reálným ID
            if (operation.tempId && result.data) {
              const cacheKey = `paintpro_orders_cache_${operation.data.user_id}`;
              const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
              const updatedCache = cached.map(order => 
                order.id === operation.tempId ? result.data : order
              );
              localStorage.setItem(cacheKey, JSON.stringify(updatedCache));
              console.log('✅ Cache aktualizována s reálným ID:', result.data.id);
            }
            break;
          case 'update_order':
            result = await supabase.from('orders').update(operation.data).eq('id', operation.orderId).select();
            break;
          case 'delete_order':
            result = await supabase.from('orders').delete().eq('id', operation.orderId);
            break;
          case 'update_user_pin':
            result = await supabase.from('users').update(operation.data).eq('id', operation.userId).select();
            break;
        }

        if (result?.error) {
          throw result.error;
        }

        console.log('✅ Synchronizována operace:', operation.type);
        processedOperations.push(operation);
      } catch (error) {
        console.error('❌ Chyba při synchronizaci:', operation.type, error);
        failedOperations.push(operation);
        continue;
      }
    }

    // Zachovej pouze neúspěšné operace v queue
    localStorage.setItem('sync_queue', JSON.stringify(failedOperations));
    console.log(`✅ Queue zpracována: ${processedOperations.length} úspěšných, ${failedOperations.length} neúspěšných`);

    // Znovu načti data pokud byly úspěšné operace
    if (processedOperations.length > 0 && currentUser?.id) {
      console.log('🔄 Obnovuji data po synchronizaci...');
      await getUserData(currentUser.id);
    }
  };

  // Načtení uživatelů - přímo ze Supabase
  const loadUsers = async () => {
    try {
      console.log('🔍 Načítám uživatele ze Supabase...');
      const { data, error } = await supabase.from('users').select('*');

      if (error) {
        console.error('❌ Supabase chyba:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log('✅ Načteno ze Supabase:', data.length, 'uživatelů');
        console.log('👥 Uživatelé:', data.map(u => u.name));
        // Aktualizuj také cache
        localStorage.setItem('paintpro_users_cache', JSON.stringify(data));
        return data;
      }

      console.log('⚠️ Žádní uživatelé v Supabase, vytvářím admin...');
      return createDefaultAdmin();
    } catch (error) {
      console.error('❌ Chyba při načítání ze Supabase:', error);
      // Fallback na cache pouze v případě chyby
      const cached = JSON.parse(localStorage.getItem('paintpro_users_cache') || '[]');
      if (cached.length > 0) {
        console.log('📦 Použita cache:', cached.length, 'uživatelů');
        return cached;
      }
      return createDefaultAdmin();
    }
  };

  // Vytvoření výchozího admina
  const createDefaultAdmin = () => {
    const admin = {
      id: 'admin_1',
      name: 'Administrátor',
      avatar: 'AD',
      color: '#8b5cf6',
      pin_hash: hashPin('135715'),
      is_admin: true,
      created_at: new Date().toISOString()
    };

    localStorage.setItem('paintpro_users_cache', JSON.stringify([admin]));

    // Přidej do queue pro synchronizaci
    if (isOnline) {
      addToQueue({
        type: 'create_user',
        data: admin
      });
    }

    return [admin];
  };

  // Přihlášení pomocí PIN
  const login = async (pin, userId = null) => {
    try {
      console.log('🔧 LOGIN - START');
      console.log('📝 Pokus o přihlášení s PINem:', pin);
      console.log('📝 User ID (pokud zadán):', userId);

      const users = await loadUsers();
      const hashedPin = hashPin(pin);
      console.log('📝 Hash zadaného PINu:', hashedPin);

      if (userId) {
        const targetUser = users.find(u => u.id === userId);
        if (targetUser) {
          console.log('📝 Cílový uživatel nalezen:', targetUser.name);
          console.log('📝 Uložený hash cílového uživatele:', targetUser.pin_hash);
          console.log('📝 Porovnání:', hashedPin, '===', targetUser.pin_hash, '?', hashedPin === targetUser.pin_hash);
        }
      }

      let user;
      if (userId) {
        user = users.find(u => u.id === userId && u.pin_hash === hashedPin);
      } else {
        user = users.find(u => u.pin_hash === hashedPin);
      }

      if (user) {
        setCurrentUser(user);
        localStorage.setItem('paintpro_current_user', JSON.stringify(user));
        console.log('✅ Úspěšné přihlášení:', user.name);
        console.log('📝 Přihlášený uživatel PIN hash:', user.pin_hash);
        return { success: true };
      }

      console.log('❌ Přihlášení selhalo - PIN nenalezen');
      return { success: false, error: 'Neplatný PIN' };
    } catch (error) {
      console.error('❌ Chyba při přihlašování:', error);
      return { success: false, error: 'Chyba při přihlašování' };
    }
  };

  // Odhlášení
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('paintpro_current_user');
  };

  // Načtení dat uživatele (Supabase first, localStorage cache) - OPTIMALIZOVANÉ
  const getUserData = async (userId) => {
    try {
      const cacheKey = `paintpro_orders_cache_${userId}`;
      console.log('🔍 getUserData START - userId:', userId, 'isOnline:', isOnline);

      if (isOnline) {
        console.log('🌐 Online - načítám ze Supabase...');
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          console.log('✅ Supabase data načtena pro', userId, ':', data.length, 'zakázek');

          // OPRAVENÁ VALIDACE: Méně přísná validace - zobraz i zakázky bez klienta
          const validData = data.filter(order => {
            const hasValidCastka = order.castka && order.castka > 0;
            const hasValidUserId = order.user_id === userId;
            
            // Klient může být prázdný (např. Adam zakázky) - to je v pořádku
            const hasKlient = order.klient !== null && order.klient !== undefined;

            const isValid = hasValidCastka && hasValidUserId && hasKlient;

            if (!isValid) {
              console.warn('⚠️ Nevalidní zakázka ODSTRANĚNA:', {
                id: order.id,
                klient: order.klient,
                castka: order.castka,
                user_id: order.user_id,
                reasons: {
                  invalidCastka: !hasValidCastka, 
                  invalidUserId: !hasValidUserId,
                  missingKlientField: !hasKlient
                }
              });
            }

            return isValid;
          });

          console.log('✅ Validních zakázek po filtraci:', validData.length);

          // DEDUPLIKACE - odstraň duplicity podle ID
          const uniqueData = [];
          const seenIds = new Set();

          validData.forEach(order => {
            if (!seenIds.has(order.id)) {
              seenIds.add(order.id);
              uniqueData.push(order);
            } else {
              console.warn('🔄 Duplicitní ID odstraněno:', order.id);
            }
          });

          console.log('✅ Unikátních zakázek po deduplikaci:', uniqueData.length);

          // Ulož pouze čistá, validní data
          localStorage.setItem(cacheKey, JSON.stringify(uniqueData));
          return uniqueData;
        } else if (error) {
          console.error('❌ Supabase chyba:', error);
          throw error;
        }
      }

      // Fallback na cache - ale i cache validuj
      console.log('📦 Offline/Fallback - načítám z cache...');
      const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');

      // Validuj i cache data - umožni prázdné klienty
      const validCached = cached.filter(order => 
        order.klient !== null && 
        order.klient !== undefined && 
        order.castka > 0 &&
        order.user_id === userId
      );

      if (validCached.length !== cached.length) {
        console.warn('📦 Nevalidní data odstraněna z cache:', cached.length - validCached.length, 'záznamů');
        localStorage.setItem(cacheKey, JSON.stringify(validCached));
      }

      console.log('📦 Validní cache data:', validCached.length, 'zakázek');
      return validCached;
    } catch (error) {
      console.error('❌ Chyba při getUserData:', error);
      // Poslední fallback - ale i ten validuj
      const fallbackData = JSON.parse(localStorage.getItem(`paintpro_orders_cache_${userId}`) || '[]');
      const validFallback = fallbackData.filter(order => 
        order.klient !== null && order.klient !== undefined && order.castka > 0 && order.user_id === userId
      );
      console.log('🆘 Validní fallback data:', validFallback.length, 'zakázek');
      return validFallback;
    }
  };

  // Přidání nového uživatele
  const addUser = async (userData) => {
    try {
      const newUser = {
        id: `user_${Date.now()}`,
        name: userData.name,
        avatar: userData.avatar,
        color: userData.color,
        pin_hash: userData.pin,
        is_admin: false,
        created_at: new Date().toISOString()
      };

      // Aktualizuj cache
      const cached = JSON.parse(localStorage.getItem('paintpro_users_cache') || '[]');
      cached.push(newUser);
      localStorage.setItem('paintpro_users_cache', JSON.stringify(cached));

      if (isOnline) {
        try {
          const { error } = await supabase.from('users').insert([newUser]);
          if (error) throw error;
          console.log('✅ Uživatel vytvořen v Supabase');
        } catch (supabaseError) {
          console.warn('⚠️ Supabase nedostupný, přidáno do queue');
          addToQueue({
            type: 'create_user',
            data: newUser
          });
        }
      } else {
        addToQueue({
          type: 'create_user',
          data: newUser
        });
      }

      return { success: true, user: newUser };
    } catch (error) {
      console.error('❌ Chyba při přidávání uživatele:', error);
      return { success: false, error: 'Chyba při přidávání uživatele' };
    }
  };

  // Přidání nové zakázky
  const addUserOrder = async (userId, orderData) => {
    try {
      console.log('🔄 addUserOrder START - userId:', userId, 'orderData:', orderData);

      const newOrder = {
        user_id: userId,
        datum: orderData.datum,
        druh: orderData.druh,
        klient: orderData.klient || '',
        cislo: orderData.cislo || '',
        castka: parseInt(orderData.castka) || 0,
        fee: parseInt(orderData.fee) || 0,
        material: parseInt(orderData.material) || 0,
        pomocnik: parseInt(orderData.pomocnik) || 0,
        palivo: parseInt(orderData.palivo) || 0,
        adresa: orderData.adresa || '',
        typ: orderData.typ || 'byt',
        doba_realizace: parseInt(orderData.delkaRealizace) || 1,
        poznamka: orderData.poznamky || '',
        soubory: JSON.stringify(orderData.soubory || []),
        zisk: (parseInt(orderData.castka) || 0) - (parseInt(orderData.material) || 0) - (parseInt(orderData.pomocnik) || 0) - (parseInt(orderData.palivo) || 0),
        fee_off: parseInt(orderData.castka) || 0,
        created_at: new Date().toISOString()
      };

      console.log('📋 Připravený objekt zakázky:', newOrder);

      // NEJDŘÍV ulož do Supabase (priorita)
      if (isOnline) {
        try {
          console.log('💾 Ukládám do Supabase...');
          const { data, error } = await supabase
            .from('orders')
            .insert([newOrder])
            .select()
            .single();

          if (error) {
            console.error('❌ Supabase error:', error);
            throw error;
          }

          console.log('✅ Zakázka úspěšně uložena do Supabase:', data);

          // Aktualizuj cache s reálnými daty ze Supabase
          const cacheKey = `paintpro_orders_cache_${userId}`;
          const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
          cached.unshift(data);
          localStorage.setItem(cacheKey, JSON.stringify(cached));

          console.log('✅ Cache aktualizována, celkem zakázek:', cached.length);
          return cached;

        } catch (supabaseError) {
          console.error('❌ DETAILNÍ SUPABASE CHYBA:');
          console.error('- Error object:', supabaseError);
          console.error('- Error message:', supabaseError?.message);
          console.error('- Error details:', supabaseError?.details);
          console.error('- Error hint:', supabaseError?.hint);
          console.error('- Error code:', supabaseError?.code);
          console.error('- Odesílaná data:', newOrder);
          console.error('❌ Supabase selhala, ukládám do queue:', supabaseError);

          // Fallback - dočasné ID pro cache
          const tempId = 'temp_' + Date.now() + '_' + Math.random();
          const orderWithTempId = { ...newOrder, id: tempId };

          // Okamžitě aktualizuj cache
          const cacheKey = `paintpro_orders_cache_${userId}`;
          const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
          cached.unshift(orderWithTempId);
          localStorage.setItem(cacheKey, JSON.stringify(cached));

          // Přidej do queue pro pozdější synchronizaci
          addToQueue({
            type: 'create_order',
            data: newOrder,
            tempId: tempId
          });

          console.log('⚠️ Zakázka uložena dočasně, bude synchronizována později');
          return cached;
        }
      } else {
        console.log('📱 Offline režim - ukládám do cache a queue');

        // Offline - dočasné ID
        const tempId = 'offline_' + Date.now() + '_' + Math.random();
        const orderWithTempId = { ...newOrder, id: tempId };

        // Aktualizuj cache
        const cacheKey = `paintpro_orders_cache_${userId}`;
        const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        cached.unshift(orderWithTempId);
        localStorage.setItem(cacheKey, JSON.stringify(cached));

        // Přidej do queue
        addToQueue({
          type: 'create_order',
          data: newOrder,
          tempId: tempId
        });

        return cached;
      }
    } catch (error) {
      console.error('❌ Kritická chyba při addUserOrder:', error);
      throw error;
    }
  };

  // Editace zakázky
  const editUserOrder = async (userId, orderId, updatedData) => {
    try {
      const updatedOrderData = {
        ...updatedData,
        zisk: (updatedData.castka || 0) - (updatedData.material || 0) - (updatedData.pomocnik || 0) - (updatedData.palivo || 0)
      };

      // Okamžitě aktualizuj cache
      const cacheKey = `paintpro_orders_cache_${userId}`;
      const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      const orderIndex = cached.findIndex(order => order.id == orderId);

      if (orderIndex !== -1) {
        cached[orderIndex] = { ...cached[orderIndex], ...updatedOrderData };
        localStorage.setItem(cacheKey, JSON.stringify(cached));
      }

      if (isOnline) {
        try {
          const { error } = await supabase
            .from('orders')
            .update(updatedOrderData)
            .eq('id', orderId)
            .eq('user_id', userId);

          if (error) throw error;
          console.log('✅ Zakázka upravena v Supabase');
        } catch (supabaseError) {
          console.warn('⚠️ Supabase nedostupný, přidáno do queue');
          addToQueue({
            type: 'update_order',
            orderId: orderId,
            data: updatedOrderData
          });
        }
      } else {
        addToQueue({
          type: 'update_order',
          orderId: orderId,
          data: updatedOrderData
        });
      }

      return cached;
    } catch (error) {
      console.error('❌ Chyba při editaci zakázky:', error);
      throw error;
    }
  };

  // Smazání zakázky
  const deleteUserOrder = async (userId, orderId) => {
    try {
      // Okamžitě odstraň z cache
      const cacheKey = `paintpro_orders_cache_${userId}`;
      const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      const updatedOrders = cached.filter(order => order.id != orderId);
      localStorage.setItem(cacheKey, JSON.stringify(updatedOrders));

      if (isOnline) {
        try {
          const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderId)
            .eq('user_id', userId);

          if (error) throw error;
          console.log('✅ Zakázka smazána v Supabase');
        } catch (supabaseError) {
          console.warn('⚠️ Supabase nedostupný, přidáno do queue');
          addToQueue({
            type: 'delete_order',
            orderId: orderId
          });
        }
      } else {
        addToQueue({
          type: 'delete_order',
          orderId: orderId
        });
      }

      return updatedOrders;
    } catch (error) {
      console.error('❌ Chyba při mazání zakázky:', error);
      throw error;
    }
  };

  // Změna PINu
  const changePin = async (currentPinPlain, newPinPlain) => {
    try {
      console.log('🔧 ZMĚNA PIN - START');
      console.log('📝 Současný uživatel ID:', currentUser?.id);
      console.log('📝 Současný uživatel name:', currentUser?.name);
      console.log('📝 Současný uživatel pin_hash:', currentUser?.pin_hash);

      if (!currentUser) {
        return { success: false, error: 'Žádný přihlášený uživatel' };
      }

      // Ověř současný PIN proti aktuálnímu stavu uživatele
      const hashedCurrentPin = hashPin(currentPinPlain);
      console.log('📝 Hash zadaného současného PINu:', hashedCurrentPin);
      console.log('📝 Uložený hash uživatele:', currentUser.pin_hash);

      if (currentUser.pin_hash !== hashedCurrentPin) {
        console.log('❌ PIN nesouhlasí');
        return { success: false, error: 'Současný PIN je nesprávný' };
      }

      console.log('✅ PIN ověřen správně');

      const hashedNewPin = hashPin(newPinPlain);
      console.log('📝 Hash nového PINu:', hashedNewPin);

      // Vytvoř aktualizovaného uživatele
      const updatedUserData = { ...currentUser, pin_hash: hashedNewPin };
      console.log('📝 Aktualizovaný uživatel:', updatedUserData);

      // Aktualizuj současného uživatele VE STAVU IHNED
      setCurrentUser(updatedUserData);
      localStorage.setItem('paintpro_current_user', JSON.stringify(updatedUserData));
      console.log('✅ CurrentUser aktualizován v React stavu a localStorage');

      // Aktualizuj cache uživatelů
      const users = JSON.parse(localStorage.getItem('paintpro_users_cache') || '[]');
      const updatedUsers = users.map(u => 
        u.id === currentUser.id ? updatedUserData : u
      );
      localStorage.setItem('paintpro_users_cache', JSON.stringify(updatedUsers));
      console.log('✅ Cache uživatelů aktualizována');

      // Synchronizuj s Supabase (ale nevadí, když selže)
      try {
        if (isOnline) {
          console.log('🔧 Synchronizuji s Supabase...');
          const { error } = await supabase
            .from('users')
            .update({ pin_hash: hashedNewPin })
            .eq('id', currentUser.id);

          if (error) {
            console.error('❌ Supabase chyba:', error);
            throw error;
          }
          console.log('✅ PIN úspěšně synchronizován s Supabase');
        } else {
          throw new Error('Offline režim');
        }
      } catch (error) {
        console.warn('⚠️ PIN změněn lokálně, přidáno do queue pro pozdější synchronizaci');
        addToQueue({
          type: 'update_user_pin',
          userId: currentUser.id,
          data: { pin_hash: hashedNewPin }
        });
      }

      console.log('🔧 ZMĚNA PIN - ÚSPĚCH, nový hash:', hashedNewPin);
      return { success: true };
    } catch (error) {
      console.error('❌ Chyba při změně PINu:', error);
      return { success: false, error: 'Chyba při změně PINu' };
    }
  };

  // Sledování online/offline stavu
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🌐 Připojení obnoveno');
      processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('📱 Offline režim');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Vytvoření profilu Lenka - přímý zápis do localStorage
  const createLenkaProfile = () => {
    console.log('🔧 Vytvářím profil Lenka přímo...');

    const lenkaProfile = {
      id: 'lenka', // Unikátní ID pro Lenku
      name: 'Lenka',
      avatar: 'LE',
      color: '#ec4899',
      pin_hash: hashPin('321321'),
      is_admin: false,
      created_at: new Date().toISOString()
    };

    // Načti stávající profily
    let users = [];
    try {
      users = JSON.parse(localStorage.getItem('paintpro_users_cache') || '[]');
    } catch (e) {
      users = [];
    }

    // Zkontroluj, jestli Lenka už neexistuje
    const existingLenka = users.find(u => u.name === 'Lenka' || u.id === 'lenka');
    if (existingLenka) {
      console.log('ℹ️ Profil Lenka již existuje:', existingLenka);
      return existingLenka;
    }

    // Přidej Lenka do seznamu
    users.push(lenkaProfile);

    // Ulož zpět do localStorage
    localStorage.setItem('paintpro_users_cache', JSON.stringify(users));

    console.log('✅ Profil Lenka vytvořen a uložen:', lenkaProfile);
    console.log('👥 Všichni uživatelé:', users);

    // Přidej do queue pro synchronizaci se Supabase
    if (isOnline) {
      addToQueue({
        type: 'create_user',
        data: lenkaProfile
      });
    }

    return lenkaProfile;
  };

  // Oprava PIN administrátora
  const fixAdminPin = async () => {
    try {
      console.log('🔧 Opravuji PIN administrátora na 135715...');
      const newPinHash = hashPin('135715');

      // Aktualizuj v Supabase
      if (isOnline) {
        const { error } = await supabase
          .from('users')
          .update({ pin_hash: newPinHash })
          .eq('id', 'admin_1');

        if (error) {
          console.error('❌ Chyba při aktualizaci PIN v Supabase:', error);
        } else {
          console.log('✅ PIN administrátora úspěšně aktualizován v Supabase');
        }
      }

      // Aktualizuj v cache
      const users = JSON.parse(localStorage.getItem('paintpro_users_cache') || '[]');
      const updatedUsers = users.map(user => 
        user.id === 'admin_1' ? { ...user, pin_hash: newPinHash } : user
      );
      localStorage.setItem('paintpro_users_cache', JSON.stringify(updatedUsers));

      // Pokud je admin přihlášený, aktualizuj i currentUser
      const currentUserData = localStorage.getItem('paintpro_current_user');
      if (currentUserData) {
        const user = JSON.parse(currentUserData);
        if (user.id === 'admin_1') {
          const updatedUser = { ...user, pin_hash: newPinHash };
          setCurrentUser(updatedUser);
          localStorage.setItem('paintpro_current_user', JSON.stringify(updatedUser));
        }
      }

      console.log('✅ PIN administrátora opraven na 135715');
    } catch (error) {
      console.error('❌ Chyba při opravě PIN:', error);
    }
  };

  // Inicializace
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('🚀 Inicializace AuthContext...');

        // Načtení uživatelů ze Supabase
        console.log('🔧 Načítám uživatele ze Supabase...');
        await loadUsers();

        // Oprav PIN administrátora
        await fixAdminPin();

        // Zkontroluj uloženého uživatele
        const savedUser = localStorage.getItem('paintpro_current_user');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          console.log('👤 Obnoven uložený uživatel:', user.name);
        }

        // Zpracuj queue při startu
        if (isOnline) {
          console.log('🔄 Zpracovávám queue při startu...');
          await processQueue();
        }
      } catch (error) {
        console.error('❌ Chyba při inicializaci:', error);
      } finally {
        setIsLoading(false);
        console.log('✅ AuthContext inicializován');
      }
    };

    initialize();
  }, []);

  // Samostatný effect pro zpracování queue při změně online stavu
  useEffect(() => {
    if (isOnline) {
      console.log('🌐 Připojení obnoveno - zpracovávám queue...');
      processQueue();
    }
  }, [isOnline]);

  const value = {
    currentUser,
    isLoading,
    isOnline,
    login,
    logout,
    getUserData,
    addUserOrder,
    editUserOrder,
    deleteUserOrder,
    changePin,
    addUser,
    loadUsers
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
export default AuthProvider;