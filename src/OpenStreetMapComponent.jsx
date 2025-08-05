
import React, { useEffect, useRef, useState } from 'react';
import './OpenStreetMapComponent.css';

const OpenStreetMapComponent = ({ zakazkyData = [] }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Dynamicky načíst Leaflet
    const loadLeaflet = async () => {
      try {
        // Přidat CSS
        if (!document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        // Načíst Leaflet skript
        if (!window.L) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = initMap;
          document.head.appendChild(script);
        } else {
          initMap();
        }
      } catch (err) {
        setError('Chyba při načítání mapy');
        setIsLoading(false);
      }
    };

    const initMap = () => {
      if (!mapRef.current || !window.L) return;

      try {
        // Inicializovat mapu na Praha
        const leafletMap = window.L.map(mapRef.current).setView([50.0755, 14.4378], 11);

        // Přidat tile layer
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(leafletMap);

        // Přidat značky pro zakázky
        zakazkyData.forEach((zakazka, index) => {
          if (zakazka.adresa) {
            // Simulace koordinátů pro demo (v reálné aplikaci by se použila geocoding služba)
            const lat = 50.0755 + (Math.random() - 0.5) * 0.2;
            const lng = 14.4378 + (Math.random() - 0.5) * 0.2;

            const marker = window.L.marker([lat, lng]).addTo(leafletMap);
            
            const popupContent = `
              <div class="map-popup">
                <h3>${zakazka.klient || 'Nezadáno'}</h3>
                <p><strong>Adresa:</strong> ${zakazka.adresa}</p>
                <p><strong>Částka:</strong> ${zakazka.castka?.toLocaleString() || 0} Kč</p>
                <p><strong>Datum:</strong> ${zakazka.datum}</p>
                <p><strong>Druh:</strong> ${zakazka.druh || 'Nezadáno'}</p>
              </div>
            `;
            
            marker.bindPopup(popupContent);
          }
        });

        setMap(leafletMap);
        setIsLoading(false);
      } catch (err) {
        setError('Chyba při inicializaci mapy');
        setIsLoading(false);
      }
    };

    loadLeaflet();

    // Cleanup
    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [zakazkyData]);

  if (error) {
    return (
      <div className="map-error">
        <div className="error-icon">🗺️</div>
        <h3>{error}</h3>
        <p>Zkuste obnovit stránku</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="map-loading">
        <div className="loading-spinner"></div>
        <p>Načítám mapu...</p>
      </div>
    );
  }

  return <div ref={mapRef} className="leaflet-map" />;
};

export default OpenStreetMapComponent;
