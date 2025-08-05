
import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import "./App.css";

const LoginScreen = () => {
  const [pin, setPin] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const { login, addUser, loadUsers, isOnline } = useAuth();

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

  // Načtení uživatelů při mount
  useEffect(() => {
    const initUsers = async () => {
      const userList = await loadUsers();
      setUsers(userList);
    };
    initUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      setError("Vyberte prosím uživatele");
      return;
    }
    if (pin.length < 4) {
      setError("PIN musí mít alespoň 4 číslice");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await login(pin, selectedUser.id);
      if (!result.success) {
        setError(result.error || "Neplatný PIN");
      }
    } catch (error) {
      setError("Chyba při přihlašování");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 8);
    setPin(value);
    setError("");
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setPin("");
    setError("");
  };

  const generateColor = () => {
    const colors = [
      '#8b5cf6', '#ef4444', '#f97316', '#eab308', '#84cc16', 
      '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#d946ef',
      '#ec4899', '#f43f5e'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const AddUserModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      pin: '',
      color: generateColor()
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!formData.name.trim() || !formData.pin) {
        setError("Vyplňte všechna pole");
        return;
      }

      setIsSubmitting(true);
      setError("");

      try {
        const result = await addUser({
          name: formData.name.trim(),
          avatar: formData.name.trim().substring(0, 2).toUpperCase(),
          color: formData.color,
          pin: hashPin(formData.pin)
        });

        if (result.success) {
          console.log('✅ Nový profil vytvořen:', result.user.name);
          const userList = await loadUsers();
          setUsers(userList);
          setShowAddUser(false);
        } else {
          setError(result.error || "Chyba při vytváření profilu");
        }
      } catch (error) {
        console.error('❌ Chyba při vytváření profilu:', error);
        setError("Chyba při vytváření profilu");
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="modal-overlay" onClick={() => setShowAddUser(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Přidat nový profil</h2>
            <button className="modal-close" onClick={() => setShowAddUser(false)}>×</button>
          </div>
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label>Jméno</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Zadejte jméno"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>PIN (4-8 číslic)</label>
              <input
                type="password"
                value={formData.pin}
                onChange={e => setFormData({...formData, pin: e.target.value.replace(/\D/g, "").slice(0, 8)})}
                placeholder="Zadejte PIN"
              />
            </div>
            <div className="form-group">
              <label>Barva profilu</label>
              <div className="color-picker">
                {['#8b5cf6', '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#d946ef', '#ec4899', '#f43f5e'].map(color => (
                  <div
                    key={color}
                    className={`color-option ${formData.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({...formData, color})}
                  />
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddUser(false)}>
                Zrušit
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Vytvářím...' : 'Vytvořit profil'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const EditUserModal = ({ user }) => {
    const [formData, setFormData] = useState({
      name: user.name,
      pin: '',
      color: user.color
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      const updatedUser = {
        ...user,
        name: formData.name.trim(),
        avatar: formData.name.trim().substring(0, 2).toUpperCase(),
        color: formData.color
      };

      if (formData.pin) {
        updatedUser.pin_hash = hashPin(formData.pin);
      }

      // Aktualizuj cache
      const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
      localStorage.setItem('paintpro_users_cache', JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      setShowEditUser(null);
    };

    const handleDelete = () => {
      if (user.is_admin) {
        setError("Nelze smazat administrátora");
        return;
      }
      
      if (window.confirm(`Opravdu chcete smazat profil ${user.name}?`)) {
        const updatedUsers = users.filter(u => u.id !== user.id);
        localStorage.setItem('paintpro_users_cache', JSON.stringify(updatedUsers));
        setUsers(updatedUsers);
        setShowEditUser(null);
      }
    };

    return (
      <div className="modal-overlay" onClick={() => setShowEditUser(null)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Upravit profil</h2>
            <button className="modal-close" onClick={() => setShowEditUser(null)}>×</button>
          </div>
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label>Jméno</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Zadejte jméno"
              />
            </div>
            <div className="form-group">
              <label>Nový PIN (volitelné)</label>
              <input
                type="password"
                value={formData.pin}
                onChange={e => setFormData({...formData, pin: e.target.value.replace(/\D/g, "").slice(0, 8)})}
                placeholder="Ponechte prázdné pro zachování"
              />
            </div>
            <div className="form-group">
              <label>Barva profilu</label>
              <div className="color-picker">
                {['#8b5cf6', '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#d946ef', '#ec4899', '#f43f5e'].map(color => (
                  <div
                    key={color}
                    className={`color-option ${formData.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({...formData, color})}
                  />
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowEditUser(null)}>
                Zrušit
              </button>
              {!user.is_admin && (
                <button type="button" className="btn btn-danger" onClick={handleDelete}>
                  Smazat profil
                </button>
              )}
              <button type="submit" className="btn btn-primary">
                Uložit změny
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        {!isOnline && (
          <div className="offline-indicator">
            📱 Offline režim - změny budou synchronizovány při obnovení připojení
          </div>
        )}

        {!selectedUser ? (
          <div className="user-selection">
            <h2>Vyberte profil</h2>
            <div className="profiles-grid">
              {users.map(user => (
                <div key={user.id} className="profile-card-container">
                  <div 
                    className="profile-card"
                    onClick={() => handleUserSelect(user)}
                  >
                    <div 
                      className="profile-avatar"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.avatar}
                    </div>
                    <div className="profile-name">{user.name}</div>
                    {user.is_admin && <div className="admin-badge">Admin</div>}
                  </div>
                  <button 
                    className="edit-profile-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEditUser(user);
                    }}
                  >
                    ⚙️
                  </button>
                </div>
              ))}
              
              <div className="profile-card add-profile" onClick={() => setShowAddUser(true)}>
                <div className="add-plus-icon">+</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="pin-input-section">
            <button className="back-button" onClick={() => setSelectedUser(null)}>
              ← Zpět
            </button>
            
            <div className="pin-header">
              <div 
                className="selected-avatar"
                style={{ backgroundColor: selectedUser.color }}
              >
                {selectedUser.avatar}
              </div>
              <h2>Vítejte, {selectedUser.name}</h2>
              <p>Zadejte PIN pro přihlášení</p>
            </div>

            <form onSubmit={handleSubmit} className="pin-form">
              <div className="pin-input-container">
                <input
                  type="password"
                  value={pin}
                  onChange={handlePinChange}
                  placeholder="••••••"
                  maxLength="8"
                  className={`pin-input ${error ? "error" : ""}`}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              
              {error && <div className="error-message">{error}</div>}

              <button
                type="submit"
                className="login-button"
                disabled={isLoading || pin.length < 4}
              >
                {isLoading ? "Přihlašování..." : "Přihlásit se"}
              </button>
            </form>

            
          </div>
        )}

        {showAddUser && <AddUserModal />}
        {showEditUser && <EditUserModal user={showEditUser} />}
      </div>
    </div>
  );
};

export default LoginScreen;
