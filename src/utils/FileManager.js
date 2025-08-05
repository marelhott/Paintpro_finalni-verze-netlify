// Centralizovaná správa souborů s pokročilými funkcemi
class FileManager {
  constructor() {
    this.maxFileSize = 25 * 1024 * 1024; // 25MB
    this.allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff',
      'application/pdf', 'text/plain', 'text/csv', 'application/json',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed',
      'video/mp4', 'video/webm', 'video/ogg', 'audio/mpeg', 'audio/wav', 'audio/ogg'
    ];
    this.storagePrefix = 'paintpro_files_';
    this.compressionQuality = 0.8; // Kvalita komprese pro obrázky
  }

  // Rozšířená validace souboru
  validateFile(file) {
    if (!file) {
      return { valid: false, error: 'Nebyl vybrán žádný soubor' };
    }

    if (file.size > this.maxFileSize) {
      return { valid: false, error: `Soubor je příliš velký (max ${this.maxFileSize / (1024*1024)}MB)` };
    }

    if (!this.allowedTypes.includes(file.type)) {
      return { valid: false, error: `Nepodporovaný typ souboru: ${file.type}` };
    }

    // Kontrola názvu souboru
    if (file.name.length > 255) {
      return { valid: false, error: 'Název souboru je příliš dlouhý (max 255 znaků)' };
    }

    // Kontrola nebezpečných znaků v názvu
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(file.name)) {
      return { valid: false, error: 'Název souboru obsahuje nepovolené znaky' };
    }

    return { valid: true };
  }

  // Komprese obrázku
  async compressImage(file, quality = this.compressionQuality) {
    if (!file.type.startsWith('image/')) {
      return file;
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Výpočet nových rozměrů (max 1920x1080)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Nakreslení a komprese
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob.size < file.size) {
            // Nový soubor je menší, použijeme komprimovaný
            const compressedFile = new File([blob], file.name, {
              type: blob.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            // Původní soubor je menší, ponecháme ho
            resolve(file);
          }
        }, file.type, quality);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Rozšířený upload souboru
  async uploadFile(file, zakazkaId) {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      // Komprese obrázku pokud je to potřeba
      const processedFile = await this.compressImage(file);

      const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const fileData = await this.fileToBase64(processedFile);

      const fileObject = {
        id: fileId,
        name: processedFile.name,
        originalName: file.name,
        type: processedFile.type,
        size: processedFile.size,
        originalSize: file.size,
        zakazkaId: zakazkaId,
        uploadDate: new Date().toISOString(),
        data: fileData,
        url: `data:${processedFile.type};base64,${fileData}`,
        compressed: processedFile.size < file.size,
        checksum: await this.calculateChecksum(fileData)
      };

      // Uložit do localStorage
      const storageKey = `${this.storagePrefix}${fileId}`;
      localStorage.setItem(storageKey, JSON.stringify(fileObject));

      console.log(`✅ Soubor ${processedFile.name} nahrán (${this.formatFileSize(processedFile.size)})`);
      return { success: true, fileObject };
    } catch (error) {
      console.error('❌ Chyba při nahrávání souboru:', error);
      return { success: false, error: 'Chyba při nahrávání souboru: ' + error.message };
    }
  }

  // Výpočet kontrolního součtu
  async calculateChecksum(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Formátování velikosti souboru
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Pomocná funkce pro převod na base64
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Rozšířené stažení souboru
  downloadFile(fileUrl, fileName) {
    try {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName || 'soubor';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log(`📥 Soubor ${fileName} stažen`);
    } catch (error) {
      console.error('❌ Chyba při stahování souboru:', error);
    }
  }

  // Smazání souboru s bezpečnostními kontrolami
  deleteFile(fileId) {
    try {
      const storageKey = `${this.storagePrefix}${fileId}`;
      const fileData = localStorage.getItem(storageKey);

      if (!fileData) {
        return { success: false, error: 'Soubor nebyl nalezen' };
      }

      localStorage.removeItem(storageKey);
      console.log(`🗑️ Soubor ${fileId} smazán`);
      return { success: true };
    } catch (error) {
      console.error('❌ Chyba při mazání souboru:', error);
      return { success: false, error: 'Chyba při mazání souboru' };
    }
  }

  // Získání všech souborů pro zakázku
  getFilesForOrder(zakazkaId) {
    try {
      const files = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.storagePrefix)) {
          try {
            const fileData = JSON.parse(localStorage.getItem(key));
            if (fileData.zakazkaId === zakazkaId) {
              files.push(fileData);
            }
          } catch (parseError) {
            console.warn(`⚠️ Chyba při parsování souboru ${key}:`, parseError);
          }
        }
      }
      return files.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    } catch (error) {
      console.error('❌ Chyba při načítání souborů:', error);
      return [];
    }
  }

  // Získání celkové velikosti všech souborů
  getTotalStorageSize() {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.storagePrefix)) {
        try {
          const fileData = JSON.parse(localStorage.getItem(key));
          totalSize += fileData.size || 0;
        } catch (error) {
          console.warn(`⚠️ Chyba při čtení velikosti souboru ${key}`);
        }
      }
    }
    return totalSize;
  }

  // Vyčištění starých souborů
  cleanupOldFiles(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let cleanedCount = 0;
    let cleanedSize = 0;

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.storagePrefix)) {
        try {
          const fileData = JSON.parse(localStorage.getItem(key));
          const uploadDate = new Date(fileData.uploadDate);

          if (uploadDate < cutoffDate) {
            cleanedSize += fileData.size || 0;
            localStorage.removeItem(key);
            cleanedCount++;
          }
        } catch (error) {
          console.warn(`⚠️ Chyba při čištění souboru ${key}`);
        }
      }
    }

    console.log(`🧹 Vyčištěno ${cleanedCount} souborů (${this.formatFileSize(cleanedSize)})`);
    return { count: cleanedCount, size: cleanedSize };
  }

  // Vytvoření backupu všech souborů
  createBackup() {
    const files = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.storagePrefix)) {
        try {
          const fileData = JSON.parse(localStorage.getItem(key));
          files.push(fileData);
        } catch (error) {
          console.warn(`⚠️ Chyba při zálohování souboru ${key}`);
        }
      }
    }

    const backup = {
      created: new Date().toISOString(),
      version: '1.0',
      files: files
    };

    const backupString = JSON.stringify(backup, null, 2);
    const blob = new Blob([backupString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    this.downloadFile(url, `paintpro_files_backup_${new Date().toISOString().split('T')[0]}.json`);

    console.log(`💾 Záloha ${files.length} souborů vytvořena`);
    return { success: true, count: files.length };
  }

  // Obnovení ze zálohy
  async restoreFromBackup(backupFile) {
    try {
      const backupText = await this.fileToText(backupFile);
      const backup = JSON.parse(backupText);

      let restoredCount = 0;
      for (const fileData of backup.files) {
        const storageKey = `${this.storagePrefix}${fileData.id}`;
        localStorage.setItem(storageKey, JSON.stringify(fileData));
        restoredCount++;
      }

      console.log(`🔄 Obnoveno ${restoredCount} souborů ze zálohy`);
      return { success: true, count: restoredCount };
    } catch (error) {
      console.error('❌ Chyba při obnovení ze zálohy:', error);
      return { success: false, error: error.message };
    }
  }

  // Pomocná funkce pro čtení textu ze souboru
  fileToText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}

export default new FileManager();