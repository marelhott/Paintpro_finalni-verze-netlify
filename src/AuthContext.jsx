import React, { createContext, useContext, useState, useEffect } from 'react';
import DiskStorageManager from './utils/DiskStorageManager';

console.log('🔧 Aplikace běží v offline režimu s lokálním úložištěm');

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
    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    if (queue.length === 0) {
      console.log('📋 Queue je prázdná');
      return;
    }

    console.log('🔄 Zpracovávám offline queue (lokálně):', queue.length, 'operací');
    
    // V offline režimu pouze vyčistíme queue, protože vše je už uloženo lokálně
    localStorage.setItem('sync_queue', JSON.stringify([]));
    console.log('✅ Queue vyčištěna - všechny operace jsou uloženy lokálně');
  };

  // Načtení uživatelů - pouze z localStorage
  const loadUsers = async () => {
    try {
      console.log('🔍 Načítám uživatele z localStorage...');
      
      const cached = localStorage.getItem('paintpro_users_cache');
      if (cached) {
        const users = JSON.parse(cached);
        console.log('✅ Načteno z cache:', users.length, 'uživatelů');
        return users;
      }
      
      console.log('⚠️ Žádná cache, vytvářím výchozího admina...');
      return createDefaultAdmin();
    } catch (error) {
      console.error('❌ Chyba při načítání z localStorage:', error);
      console.log('⚠️ Vytvářím výchozího admina...');
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

    console.log('✅ Výchozí admin vytvořen:', admin.name);
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

  // Načtení dat uživatele - pouze z localStorage
  const getUserData = async (userId) => {
    const cacheKey = `paintpro_orders_cache_${userId}`;
    
    try {
      console.log('📦 Načítám data z localStorage pro uživatele:', userId);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        console.log('✅ Data načtena pro', userId, ':', data.length, 'zakázek');
        return data;
      }

      console.log('📝 Žádná data pro uživatele', userId);
      return [];
    } catch (error) {
      console.error('❌ Chyba při načítání z localStorage:', error);
      return [];
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

      console.log('✅ Uživatel vytvořen lokálně');

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

      // Ukládám pouze lokálně
      console.log('💾 Ukládám zakázku lokálně...');
      
      // Dočasné ID pro cache
      const tempId = 'local_' + Date.now() + '_' + Math.random();
      const orderWithTempId = { ...newOrder, id: tempId };

      // Aktualizuj cache
      const cacheKey = `paintpro_orders_cache_${userId}`;
      const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      cached.unshift(orderWithTempId);
      localStorage.setItem(cacheKey, JSON.stringify(cached));

      console.log('✅ Zakázka uložena lokálně s ID:', tempId);
      
      // Automatické ukládání na disk
      if (currentUser) {
        DiskStorageManager.autoSaveOrders(cached, currentUser)
          .then(success => {
            if (success) {
              console.log('💾 Automatické uložení na disk dokončeno');
            }
          })
          .catch(error => {
            console.warn('⚠️ Automatické uložení na disk selhalo:', error.message);
          });
      }
      
      return cached;
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

      console.log('✅ Zakázka upravena lokálně');
      
      // Automatické ukládání na disk
      if (currentUser) {
        DiskStorageManager.autoSaveOrders(cached, currentUser)
          .then(success => {
            if (success) {
              console.log('💾 Automatické uložení na disk dokončeno (editace)');
            }
          })
          .catch(error => {
            console.warn('⚠️ Automatické uložení na disk selhalo:', error.message);
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

      console.log('✅ Zakázka smazána lokálně');
      
      // Automatické ukládání na disk
      if (currentUser) {
        DiskStorageManager.autoSaveOrders(updatedOrders, currentUser)
          .then(success => {
            if (success) {
              console.log('💾 Automatické uložení na disk dokončeno (smazání)');
            }
          })
          .catch(error => {
            console.warn('⚠️ Automatické uložení na disk selhalo:', error.message);
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

      console.log('✅ PIN změněn lokálně');

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

      console.log('✅ PIN administrátora aktualizován lokálně');

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

        // Načtení uživatelů z localStorage
        console.log('🔧 Načítám uživatele z localStorage...');
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