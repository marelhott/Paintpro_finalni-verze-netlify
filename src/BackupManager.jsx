
```jsx
import React, { useState } from 'react';

const BackupManager = ({ currentUser }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Export všech dat do JSON
  const exportData = async () => {
    setIsExporting(true);
    try {
      const userData = JSON.parse(localStorage.getItem(`paintpro_orders_${currentUser.id}`) || '[]');
      const userInfo = JSON.parse(localStorage.getItem('paintpro_users') || '[]');
      
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        user: currentUser,
        orders: userData,
        metadata: {
          totalOrders: userData.length,
          totalRevenue: userData.reduce((sum, order) => sum + order.castka, 0),
          totalProfit: userData.reduce((sum, order) => sum + order.zisk, 0)
        }
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `paintpro-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      alert('✅ Backup úspěšně vytvořen!');
    } catch (error) {
      console.error('Chyba při exportu:', error);
      alert('❌ Chyba při vytváření backupu');
    } finally {
      setIsExporting(false);
    }
  };

  // Import dat z JSON souboru
  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const backupData = JSON.parse(e.target.result);
        
        if (!backupData.version || !backupData.orders) {
          throw new Error('Neplatný formát backup souboru');
        }

        // Potvrzení importu
        const confirmed = window.confirm(
          `Opravdu chcete importovat data?\n\n` +
          `Datum backupu: ${new Date(backupData.timestamp).toLocaleString('cs-CZ')}\n` +
          `Počet zakázek: ${backupData.orders.length}\n` +
          `Celkové tržby: ${backupData.metadata?.totalRevenue?.toLocaleString() || 'N/A'} Kč\n\n` +
          `VAROVÁNÍ: Současná data budou přepsána!`
        );

        if (confirmed) {
          // Import dat
          localStorage.setItem(`paintpro_orders_${currentUser.id}`, JSON.stringify(backupData.orders));
          alert('✅ Data úspěšně importována! Obnovte stránku.');
          window.location.reload();
        }
      } catch (error) {
        console.error('Chyba při importu:', error);
        alert('❌ Chyba při importu dat: ' + error.message);
      } finally {
        setIsImporting(false);
        event.target.value = '';
      }
    };
    
    reader.readAsText(file);
  };

  // Auto-backup do browser cache
  const setupAutoBackup = () => {
    const autoBackup = () => {
      try {
        const userData = JSON.parse(localStorage.getItem(`paintpro_orders_${currentUser.id}`) || '[]');
        const backupKey = `paintpro_autobackup_${currentUser.id}`;
        const backupData = {
          timestamp: new Date().toISOString(),
          orders: userData
        };
        localStorage.setItem(backupKey, JSON.stringify(backupData));
        console.log('🔄 Auto-backup vytvořen');
      } catch (error) {
        console.error('Auto-backup selhání:', error);
      }
    };

    // Auto-backup každých 30 minut
    const interval = setInterval(autoBackup, 30 * 60 * 1000);
    return () => clearInterval(interval);
  };

  React.useEffect(() => {
    const cleanup = setupAutoBackup();
    return cleanup;
  }, [currentUser.id]);

  return (
    <div className="backup-manager">
      <div className="backup-actions">
        <button 
          className="btn btn-secondary"
          onClick={exportData}
          disabled={isExporting}
        >
          {isExporting ? '📦 Exportuji...' : '📦 Export dat'}
        </button>
        
        <input
          type="file"
          id="import-file"
          accept=".json"
          onChange={importData}
          style={{ display: 'none' }}
        />
        <button 
          className="btn btn-secondary"
          onClick={() => document.getElementById('import-file').click()}
          disabled={isImporting}
        >
          {isImporting ? '📥 Importuji...' : '📥 Import dat'}
        </button>
      </div>
    </div>
  );
};

export default BackupManager;
```
