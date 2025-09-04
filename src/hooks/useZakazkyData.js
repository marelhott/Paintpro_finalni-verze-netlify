
import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { filterMainOrdersOnly } from '../utils/dataFilters';

export const useZakazkyData = () => {
  const { currentUser, getUserData, addUserOrder, editUserOrder, deleteUserOrder } = useAuth();
  const [zakazkyData, setZakazkyData] = useState([]);

  // Načtení dat při přihlášení uživatele
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser?.id) {
        try {
          const data = await getUserData(currentUser.id);
          // OPRAVA: Bezpečná kontrola dat z AuthContext
          let safeData = Array.isArray(data) ? data : [];
          
          // PŘESUN: Přesun hodnot z fee do pomocník a přepočítání zisku
          const updatedData = safeData.map(zakazka => {
            let updatedZakazka = { ...zakazka };
            
            // Pokud má fee hodnotu a pomocník je 0, přesuň fee do pomocník
            if (zakazka.fee > 0 && zakazka.pomocnik === 0) {
              updatedZakazka.pomocnik = zakazka.fee;
              updatedZakazka.fee = 0;
            }
            
            // Přepočítej zisk podle aktuálních hodnot
            const castka = Number(updatedZakazka.castka) || 0;
            const fee = Number(updatedZakazka.fee) || 0;
            const material = Number(updatedZakazka.material) || 0;
            const pomocnik = Number(updatedZakazka.pomocnik) || 0;
            const palivo = Number(updatedZakazka.palivo) || 0;
            
            updatedZakazka.zisk = castka - fee - material - pomocnik - palivo;
            
            return updatedZakazka;
          });
          
          setZakazkyData(updatedData);
          console.log('✅ Data načtena pro uživatele:', currentUser.id, 'počet zakázek:', updatedData.length);
        } catch (error) {
          console.error('❌ Chyba při načítání dat:', error);
          setZakazkyData([]); // Fallback na prázdné pole
        }
      } else {
        setZakazkyData([]); // Žádný uživatel = prázdná data
      }
    };

    loadUserData();
  }, [currentUser?.id, getUserData]);

  // Funkce pro přidání zakázky
  const handleAddZakazka = async (zakazkaData) => {
    try {
      console.log('🔄 handleAddZakazka volána s daty:', zakazkaData);
      const updatedData = await addUserOrder(currentUser.id, zakazkaData);
      
      // addUserOrder nyní vrací kompletní seznam zakázek
      if (Array.isArray(updatedData)) {
        setZakazkyData(updatedData);
        console.log('✅ Zakázka přidána, celkem zakázek:', updatedData.length);
      } else {
        // Fallback - znovu načti data
        console.warn('⚠️ Neočekávaný formát dat, načítám znovu...');
        const refreshedData = await getUserData(currentUser.id);
        const safeRefreshedData = Array.isArray(refreshedData) ? refreshedData : [];
        setZakazkyData(safeRefreshedData);
      }
    } catch (error) {
      console.error('❌ Chyba při přidávání zakázky:', error);
      alert('Chyba při přidávání zakázky: ' + error.message);
      
      // Znovu načti data z localStorage pro jistotu
      if (currentUser?.id) {
        try {
          const refreshedData = await getUserData(currentUser.id);
          const safeRefreshedData = Array.isArray(refreshedData) ? refreshedData : [];
          setZakazkyData(safeRefreshedData);
        } catch (refreshError) {
          console.error('❌ Chyba i při načítání dat:', refreshError);
        }
      }
    }
  };

  // Funkce pro editaci zakázky
  const handleEditZakazka = async (editingZakazka, zakazkaData) => {
    try {
      console.log('🔄 handleEditZakazka volána s ID:', editingZakazka.id, 'data:', zakazkaData);
      const updatedData = await editUserOrder(currentUser.id, editingZakazka.id, zakazkaData);
      
      // editUserOrder nyní vrací kompletní seznam zakázek
      if (Array.isArray(updatedData)) {
        setZakazkyData(updatedData);
        console.log('✅ Zakázka upravena, celkem zakázek:', updatedData.length);
      } else {
        // Fallback - znovu načti data
        console.warn('⚠️ Neočekávaný formát dat, načítám znovu...');
        const refreshedData = await getUserData(currentUser.id);
        const safeRefreshedData = Array.isArray(refreshedData) ? refreshedData : [];
        setZakazkyData(safeRefreshedData);
      }
    } catch (error) {
      console.error('❌ Chyba při úpravě zakázky:', error);
      alert('Chyba při úpravě zakázky: ' + error.message);
    }
  };

  // Funkce pro smazání zakázky
  const handleDeleteZakazka = async (orderId) => {
    try {
      const updatedData = await deleteUserOrder(currentUser.id, orderId);
      // OPRAVA: Bezpečná kontrola dat před nastavením state
      const safeData = Array.isArray(updatedData) ? updatedData : [];
      setZakazkyData(safeData);
      console.log('✅ Zakázka smazána, nová data:', safeData.length, 'záznamů');
    } catch (error) {
      console.error('❌ Chyba při mazání zakázky:', error);
    }
  };

  // Funkce pro aktualizaci souborů zakázky
  const handleFilesUpdate = async (zakazkaId, newFiles) => {
    try {
      console.log(`🔄 Aktualizuji soubory pro zakázku ${zakazkaId}, počet souborů: ${newFiles.length}`);
      
      // Najdi zakázku v aktuálních datech
      const updatedZakazky = zakazkyData.map(zakazka => {
        if (zakazka.id === zakazkaId) {
          const updated = { ...zakazka, soubory: newFiles };
          console.log(`✅ Zakázka ${zakazkaId} aktualizována s ${newFiles.length} soubory`);
          return updated;
        }
        return zakazka;
      });

      // Aktualizuj lokální state okamžitě
      setZakazkyData(updatedZakazky);

      // Aktualizuj v localStorage
      const zakazkaToUpdate = zakazkyData.find(z => z.id === zakazkaId);
      if (zakazkaToUpdate && currentUser?.id) {
        try {
          await editUserOrder(currentUser.id, zakazkaId, {
            ...zakazkaToUpdate,
            soubory: newFiles
          });
          console.log(`💾 Soubory uloženy do databáze pro zakázku ${zakazkaId}`);
        } catch (dbError) {
          console.error('❌ Chyba při ukládání do databáze:', dbError);
          // I když se nepodaří uložit do DB, lokální stav zůstane aktualizovaný
        }
      }

    } catch (error) {
      console.error('❌ Chyba při aktualizaci souborů:', error);
    }
  };

  return {
    zakazkyData,
    setZakazkyData,
    handleAddZakazka,
    handleEditZakazka,
    handleDeleteZakazka,
    handleFilesUpdate
  };
};
