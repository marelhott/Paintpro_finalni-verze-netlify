// Správa ukládání dat na disk pomocí File System Access API
class DiskStorageManager {
  constructor() {
    this.directoryHandle = null;
    this.isSupported = 'showDirectoryPicker' in window;
    this.storageKey = 'paintpro_disk_storage_path';
    this.handleKey = 'paintpro_directory_handle_ref';
  }

  // Kontrola podpory File System Access API
  isFileSystemAccessSupported() {
    return this.isSupported;
  }

  // Výběr složky pro ukládání
  async selectDirectory() {
    if (!this.isSupported) {
      throw new Error('File System Access API není podporováno v tomto prohlížeči');
    }

    try {
      this.directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      // Uložení reference na složku
      const folderInfo = {
        name: this.directoryHandle.name,
        kind: this.directoryHandle.kind
      };
      
      localStorage.setItem(this.storageKey, this.directoryHandle.name);
      localStorage.setItem(this.handleKey, JSON.stringify(folderInfo));

      // Test zápisu
      await this.testWriteAccess();

      console.log('✅ Složka pro ukládání byla úspěšně vybrána:', this.directoryHandle.name);
      return this.directoryHandle.name;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Výběr složky byl zrušen');
      }
      throw new Error(`Chyba při výběru složky: ${error.message}`);
    }
  }

  // Test zápisu do vybrané složky
  async testWriteAccess() {
    if (!this.directoryHandle) {
      throw new Error('Žádná složka není vybrána');
    }

    try {
      const testFileName = 'paintpro_test.txt';
      const fileHandle = await this.directoryHandle.getFileHandle(testFileName, {
        create: true
      });
      
      const writable = await fileHandle.createWritable();
      await writable.write('PaintPro test file - můžete tento soubor smazat');
      await writable.close();
      
      console.log('✅ Test zápisu do složky úspěšný');
    } catch (error) {
      throw new Error(`Nemám oprávnění k zápisu do vybrané složky: ${error.message}`);
    }
  }

  // Získání aktuálně vybrané složky
  getSelectedDirectory() {
    return localStorage.getItem(this.storageKey);
  }

  // Vymazání vybrané složky
  clearSelectedDirectory() {
    this.directoryHandle = null;
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.handleKey);
  }

  // Uložení CSV souboru
  async saveCSVFile(filename, csvContent) {
    if (!this.directoryHandle) {
      // Pokusíme se obnovit handle (v reálné aplikaci by bylo potřeba znovu vybrat složku)
      throw new Error('Žádná složka není vybrána. Vyberte složku znovu.');
    }

    try {
      const fileHandle = await this.directoryHandle.getFileHandle(filename, {
        create: true
      });
      
      const writable = await fileHandle.createWritable();
      await writable.write(csvContent);
      await writable.close();
      
      console.log(`✅ CSV soubor ${filename} byl úspěšně uložen`);
      return true;
    } catch (error) {
      console.error('❌ Chyba při ukládání CSV souboru:', error);
      throw new Error(`Chyba při ukládání souboru: ${error.message}`);
    }
  }

  // Vytvoření CSV obsahu ze zakázek
  createCSVContent(orders, userInfo = null) {
    const headers = [
      'ID',
      'Datum',
      'Klient',
      'Adresa',
      'Telefon',
      'Email',
      'Popis práce',
      'Materiál (Kč)',
      'Práce (Kč)',
      'Celková částka (Kč)',
      'Stav',
      'Poznámky',
      'Vytvořeno',
      'Uživatel'
    ];
    
    const csvRows = [headers.join(',')];
    
    // Přidání informací o exportu
    csvRows.push(`# Export dat PaintPro - ${new Date().toLocaleString('cs-CZ')}`);
    if (userInfo) {
      csvRows.push(`# Uživatel: ${userInfo.name}`);
    }
    csvRows.push(`# Celkem zakázek: ${orders.length}`);
    csvRows.push(''); // Prázdný řádek
    
    orders.forEach(order => {
      const row = [
        this.escapeCSV(order.id || ''),
        this.escapeCSV(order.datum || ''),
        this.escapeCSV(order.klient || ''),
        this.escapeCSV(order.adresa || ''),
        this.escapeCSV(order.telefon || ''),
        this.escapeCSV(order.email || ''),
        this.escapeCSV(order.popis || ''),
        order.material || 0,
        order.prace || 0,
        order.castka || 0,
        this.escapeCSV(order.stav || 'Nová'),
        this.escapeCSV(order.poznamky || ''),
        this.escapeCSV(order.created_at || ''),
        this.escapeCSV(userInfo?.name || '')
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }

  // Escapování hodnot pro CSV
  escapeCSV(value) {
    if (typeof value !== 'string') {
      value = String(value);
    }
    
    // Pokud obsahuje čárku, uvozovky nebo nový řádek, zabalíme do uvozovek
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      // Zdvojíme uvozovky uvnitř hodnoty
      value = value.replace(/"/g, '""');
      return `"${value}"`;
    }
    
    return value;
  }

  // Automatické uložení při změně dat
  async autoSaveOrders(orders, userInfo) {
    if (!this.getSelectedDirectory()) {
      console.log('📝 Automatické ukládání přeskočeno - žádná složka není vybrána');
      return false;
    }

    try {
      const filename = `paintpro_zakazky_${userInfo.name}_${new Date().toISOString().split('T')[0]}.csv`;
      const csvContent = this.createCSVContent(orders, userInfo);
      
      await this.saveCSVFile(filename, csvContent);
      console.log('✅ Automatické uložení dokončeno');
      return true;
    } catch (error) {
      console.error('❌ Chyba při automatickém ukládání:', error);
      // Nevyhazujeme chybu, aby nenarušilo běh aplikace
      return false;
    }
  }

  // Export všech dat uživatele
  async exportUserData(userId, userName) {
    try {
      // Načtení zakázek uživatele
      const cacheKey = `paintpro_orders_cache_${userId}`;
      const orders = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      
      if (orders.length === 0) {
        throw new Error('Žádné zakázky k exportu');
      }

      const userInfo = { id: userId, name: userName };
      const filename = `paintpro_export_${userName}_${new Date().toISOString().split('T')[0]}.csv`;
      const csvContent = this.createCSVContent(orders, userInfo);
      
      await this.saveCSVFile(filename, csvContent);
      
      return {
        success: true,
        filename,
        ordersCount: orders.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Získání statistik o ukládání
  getStorageStats() {
    const selectedDir = this.getSelectedDirectory();
    const isSupported = this.isFileSystemAccessSupported();
    
    return {
      isSupported,
      hasSelectedDirectory: !!selectedDir,
      selectedDirectory: selectedDir,
      lastUpdate: localStorage.getItem('paintpro_last_disk_save')
    };
  }

  // Aktualizace času posledního uložení
  updateLastSaveTime() {
    localStorage.setItem('paintpro_last_disk_save', new Date().toISOString());
  }
}

// Export singleton instance
export default new DiskStorageManager();