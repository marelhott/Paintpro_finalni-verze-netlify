
import React, { useState } from 'react';
import { useAuth } from '../AuthContext';

// Test hash funkce (stejná jako v AuthContext)
const testHashPin = (pin) => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
};

const ProfileSettings = ({ isOpen, onClose }) => {
  const { changePin, currentUser } = useAuth();
  const [formData, setFormData] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleInputChange = (field, value) => {
    // Pouze číslice, max 8 znaků
    const numericValue = value.replace(/\D/g, '').slice(0, 8);
    setFormData(prev => ({ ...prev, [field]: numericValue }));
    setMessage({ text: '', type: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔧 ProfileSettings - handleSubmit START');
    console.log('📝 Současný uživatel:', currentUser?.id, currentUser?.name);
    console.log('📝 Aktuální PIN hash v currentUser:', currentUser?.pin_hash);
    console.log('📝 Zadaný současný PIN:', formData.currentPin);
    console.log('📝 Hash zadaného současného PINu:', testHashPin(formData.currentPin));
    console.log('📝 Zadaný nový PIN:', formData.newPin);
    console.log('📝 Hash zadaného nového PINu:', testHashPin(formData.newPin));
    
    if (formData.currentPin.length < 4) {
      setMessage({ text: 'Současný PIN musí mít alespoň 4 číslice', type: 'error' });
      return;
    }

    if (formData.newPin.length < 4) {
      setMessage({ text: 'Nový PIN musí mít alespoň 4 číslice', type: 'error' });
      return;
    }

    if (formData.newPin !== formData.confirmPin) {
      setMessage({ text: 'Nové PINy se neshodují', type: 'error' });
      return;
    }

    if (formData.currentPin === formData.newPin) {
      setMessage({ text: 'Nový PIN musí být odlišný od současného', type: 'error' });
      return;
    }

    setIsLoading(true);
    setMessage({ text: '', type: '' });

    try {
      console.log('🔧 ProfileSettings - Zahajuji změnu PINu');
      console.log('📝 Aktuální uživatel před změnou:', currentUser?.id, currentUser?.name);
      console.log('📝 Aktuální PIN hash před změnou:', currentUser?.pin_hash);
      console.log('📝 Zadaný současný PIN:', formData.currentPin);
      console.log('📝 Hash zadaného současného PINu:', testHashPin(formData.currentPin));
      console.log('📝 Zadaný nový PIN:', formData.newPin);
      console.log('📝 Hash zadaného nového PINu:', testHashPin(formData.newPin));
      
      const result = await changePin(formData.currentPin, formData.newPin);
      
      console.log('📝 Výsledek změny PINu:', result);
      console.log('📝 Aktuální uživatel PO změně:', currentUser?.id, currentUser?.name);
      console.log('📝 Aktuální PIN hash PO změně:', currentUser?.pin_hash);
      
      if (result.success) {
        setMessage({ text: '✅ PIN byl úspěšně změněn! Při příštím přihlášení použijte nový PIN.', type: 'success' });
        setFormData({ currentPin: '', newPin: '', confirmPin: '' });
        
        // Automaticky zavři po 3 sekundách s odpočítáváním
        let countdown = 3;
        const timer = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            setMessage({ text: `✅ PIN byl úspěšně změněn! Zavírám za ${countdown} sekund...`, type: 'success' });
          } else {
            clearInterval(timer);
            onClose();
          }
        }, 1000);
      } else {
        console.error('❌ Chyba při změně PINu:', result.error);
        setMessage({ text: result.error || 'Chyba při změně PINu', type: 'error' });
      }
    } catch (error) {
      console.error('❌ Chyba při změně PINu:', error);
      setMessage({ text: 'Chyba při změně PINu', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nastavení profilu</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="profile-settings-content">
          {/* Informace o profilu */}
          <div className="profile-info">
            <div 
              className="profile-avatar-large"
              style={{ backgroundColor: currentUser.color }}
            >
              {currentUser.avatar}
            </div>
            <div className="profile-details">
              <h3>{currentUser.name}</h3>
              {currentUser.is_admin && <span className="admin-badge-small">Admin</span>}
            </div>
          </div>

          {/* Formulář pro změnu PINu */}
          <form onSubmit={handleSubmit} className="change-pin-form">
            <h3>Změna PINu</h3>
            
            <div className="form-group">
              <label>Současný PIN</label>
              <input
                type="password"
                value={formData.currentPin}
                onChange={e => handleInputChange('currentPin', e.target.value)}
                placeholder="Zadejte současný PIN"
                maxLength="8"
                autoComplete="current-password"
              />
            </div>

            <div className="form-group">
              <label>Nový PIN (4-8 číslic)</label>
              <input
                type="password"
                value={formData.newPin}
                onChange={e => handleInputChange('newPin', e.target.value)}
                placeholder="Zadejte nový PIN"
                maxLength="8"
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label>Potvrdit nový PIN</label>
              <input
                type="password"
                value={formData.confirmPin}
                onChange={e => handleInputChange('confirmPin', e.target.value)}
                placeholder="Potvrďte nový PIN"
                maxLength="8"
                autoComplete="new-password"
              />
            </div>

            {message.text && (
              <div className={`message ${message.type}`}>
                {message.text}
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Zrušit
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isLoading || !formData.currentPin || !formData.newPin || !formData.confirmPin}
              >
                {isLoading ? '🔄 Změním PIN...' : '🔐 Změnit PIN'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
