import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import DiskStorageManager from '../utils/DiskStorageManager';

const DiskStorageSettings = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [selectedFolder, setSelectedFolder] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Kontrola podpory File System Access API
    setIsSupported(DiskStorageManager.isFileSystemAccessSupported());
    
    // Načtení uložené cesty
    const savedPath = DiskStorageManager.getSelectedDirectory();
    if (savedPath) {
      setSelectedFolder(savedPath);
    }
  }, []);

  const selectFolder = async () => {
    if (!isSupported) {
      setMessage({ 
        text: 'Váš prohlížeč nepodporuje výběr složky. Použijte Chrome, Edge nebo jiný moderní prohlížeč.', 
        type: 'error' 
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const folderName = await DiskStorageManager.selectDirectory();
      setSelectedFolder(folderName);
      
      setMessage({ 
        text: `✅ Složka "${folderName}" byla úspěšně vybrána a nastavena pro ukládání dat.`, 
        type: 'success' 
      });
      
    } catch (error) {
      console.error('Chyba při výběru složky:', error);
      setMessage({ 
        text: error.message, 
        type: error.message.includes('zrušen') ? 'info' : 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearFolder = () => {
    DiskStorageManager.clearSelectedDirectory();
    setSelectedFolder('');
    setMessage({ 
      text: 'Nastavení složky bylo vymazáno. Data se budou ukládat pouze v prohlížeči.', 
      type: 'info' 
    });
  };

  const exportCurrentData = async () => {
    if (!selectedFolder) {
      setMessage({ text: 'Nejprve vyberte složku pro ukládání.', type: 'error' });
      return;
    }

    try {
      setIsLoading(true);
      
      const result = await DiskStorageManager.exportUserData(currentUser.id, currentUser.name);
      
      if (result.success) {
        setMessage({ 
          text: `✅ Export ${result.ordersCount} zakázek byl úspěšně uložen jako ${result.filename}.`, 
          type: 'success' 
        });
      } else {
        setMessage({ 
          text: result.error, 
          type: 'error' 
        });
      }
      
    } catch (error) {
      console.error('Chyba při exportu:', error);
      setMessage({ 
        text: `Chyba při exportu: ${error.message}`, 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Nastavení ukládání na disk</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="disk-storage-settings">
          <div className="setting-section">
            <h3>📁 Výběr složky pro ukládání</h3>
            <p>Vyberte složku na vašem počítači, kam se budou automaticky ukládat CSV soubory se zakázkami.</p>
            
            {!isSupported && (
              <div className="warning-message">
                ⚠️ Váš prohlížeč nepodporuje přímé ukládání na disk. 
                Doporučujeme použít Chrome, Edge nebo jiný moderní prohlížeč.
              </div>
            )}
            
            <div className="folder-selection">
              {selectedFolder ? (
                <div className="selected-folder">
                  <span className="folder-icon">📁</span>
                  <span className="folder-name">{selectedFolder}</span>
                  <button 
                    className="btn btn-secondary btn-small" 
                    onClick={clearFolder}
                    disabled={isLoading}
                  >
                    Zrušit
                  </button>
                </div>
              ) : (
                <div className="no-folder">
                  <span>Žádná složka není vybrána</span>
                </div>
              )}
              
              <button 
                className="btn btn-primary" 
                onClick={selectFolder}
                disabled={!isSupported || isLoading}
              >
                {isLoading ? '🔄 Vybírám...' : '📁 Vybrat složku'}
              </button>
            </div>
          </div>

          <div className="setting-section">
            <h3>💾 Export dat</h3>
            <p>Exportujte aktuální zakázky do CSV souboru ve vybrané složce.</p>
            
            <button 
              className="btn btn-success" 
              onClick={exportCurrentData}
              disabled={!selectedFolder || isLoading}
            >
              {isLoading ? '🔄 Exportuji...' : '📤 Exportovat zakázky'}
            </button>
          </div>

          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <div className="setting-section">
            <h3>ℹ️ Informace</h3>
            <ul className="info-list">
              <li>Data se budou automaticky ukládat při každé změně zakázky</li>
              <li>CSV soubory jsou kompatibilní s Excel a dalšími programy</li>
              <li>Vybraná složka se uloží pro příští spuštění aplikace</li>
              <li>Data zůstávají také uložena v prohlížeči jako záloha</li>
            </ul>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiskStorageSettings;