import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { DiskStorageSettings } from './index';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { currentUser, logout } = useAuth();
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showDiskSettings, setShowDiskSettings] = useState(false);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <div className="modern-icon size-medium icon-dashboard"></div>
          <div className="logo-text">
            <div className="logo-title">PaintPro</div>
            <div className="logo-subtitle">Správa zakázek</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="modern-icon icon-dashboard"></div>
          Dashboard
        </div>
        <div
          className={`nav-item ${activeTab === 'zakazky' ? 'active' : ''}`}
          onClick={() => setActiveTab('zakazky')}
        >
          <div className="modern-icon icon-orders"></div>
          Zakázky
        </div>
        <div
          className={`nav-item ${activeTab === 'reporty' ? 'active' : ''}`}
          onClick={() => setActiveTab('reporty')}
        >
          <div className="modern-icon icon-reports"></div>
          Reporty
        </div>
        <div
          className={`nav-item ${activeTab === 'kalendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('kalendar')}
        >
          <div className="modern-icon icon-calendar"></div>
          Kalendář
        </div>
        <div
          className={`nav-item ${activeTab === 'mapa' ? 'active' : ''}`}
          onClick={() => setActiveTab('mapa')}
        >
          <div className="modern-icon icon-map"></div>
          Mapa zakázek
        </div>
        <div
          className={`nav-item ${activeTab === 'kalkulacka' ? 'active' : ''}`}
          onClick={() => setActiveTab('kalkulacka')}
        >
          <div className="modern-icon icon-calculator"></div>
          Kalkulačka
        </div>
      </nav>

      {currentUser && (
        <div className="sidebar-bottom">
          <div className="settings-section">
            <div 
              className="settings-item"
              onClick={() => setShowDiskSettings(true)}
              title="Nastavení ukládání na disk"
            >
              <div className="modern-icon icon-settings"></div>
              <span>Ukládání na disk</span>
            </div>
          </div>
          
          <div className="user-info-bottom">
            <div 
              className="user-avatar"
              style={{ backgroundColor: currentUser.color }}
            >
              {currentUser.avatar}
            </div>
            <div className="user-details">
              <div className="user-name">{currentUser.name}</div>
              <button className="logout-btn" onClick={logout}>
                Odhlásit se
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showDiskSettings && (
        <DiskStorageSettings 
          isOpen={showDiskSettings}
          onClose={() => setShowDiskSettings(false)}
        />
      )}
    </div>
  );
};

export default Sidebar;