import React, { useEffect, useRef, useState } from 'react';
import { StatCard } from './index';

const MapSection = ({ zakazkyData, workCategories }) => {
  const [mapInitialized, setMapInitialized] = useState(false);
  const [mapError, setMapError] = useState(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Funkce pro klasifikaci lokace podle adresy
  const getLocationCategory = (adresa) => {
    if (!adresa) return 'Okolí Prahy';
    const addressLower = adresa.toLowerCase();

    const pragueAreas = [
      'prague', 'praha', 'wenceslas', 'charles', 'old town', 'town square', 
      'castle', 'kampa', 'vinohrady', 'smíchov', 'karlín', 'dejvice', 
      'nové město', 'břevnov', 'letohradská', 'vyžlovská', 'lužická'
    ];

    const isPrague = pragueAreas.some(area => addressLower.includes(area));
    return isPrague ? 'Praha' : 'Okolí Prahy';
  };

  // Výpočet statistik podle lokace
  const locationStats = React.useMemo(() => {
    if (!zakazkyData || zakazkyData.length === 0) {
      return {
        'Praha': { count: 0, revenue: 0, profit: 0, orders: [] },
        'Okolí Prahy': { count: 0, revenue: 0, profit: 0, orders: [] }
      };
    }

    const stats = {
      'Praha': { count: 0, revenue: 0, profit: 0, orders: [] },
      'Okolí Prahy': { count: 0, revenue: 0, profit: 0, orders: [] }
    };

    zakazkyData.forEach(zakazka => {
      const location = getLocationCategory(zakazka.adresa);
      if (stats[location]) {
        stats[location].count++;
        stats[location].revenue += zakazka.castka || 0;
        stats[location].profit += zakazka.zisk || 0;
        stats[location].orders.push(zakazka);
      }
    });

    return stats;
  }, [zakazkyData]);

  // Funkce pro geocoding adres na souřadnice
  const getCoordinatesFromAddress = (adresa) => {
    if (!adresa) return null;

    const addressMapping = {
      'letohradská 1': [50.1067, 14.4378],
      'vyžlovská 2251/52': [50.0650, 14.4950],
      'lužická 9': [50.0889, 14.4400],
      'národní obrany 49': [50.1036, 14.3901],
      'cimburkova 9': [50.0900, 14.4460],
      'nad aleji 23': [50.1020, 14.3800]
    };

    const addressLower = adresa.toLowerCase();

    for (const [key, coords] of Object.entries(addressMapping)) {
      if (addressLower.includes(key) || key.includes(addressLower.split(' ')[0])) {
        return coords;
      }
    }

    const isPrague = getLocationCategory(adresa) === 'Praha';

    if (isPrague) {
      return [
        50.0755 + (Math.random() - 0.5) * 0.08,
        14.4378 + (Math.random() - 0.5) * 0.10
      ];
    } else {
      return [
        50.0755 + (Math.random() - 0.5) * 0.20,
        14.4378 + (Math.random() - 0.5) * 0.25
      ];
    }
  };

  // Inicializace mapy
  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      try {
        const L = await import('leaflet');

        if (!isMounted) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        if (!mapContainerRef.current) return;

        const map = L.map(mapContainerRef.current, {
          center: [50.0755, 14.4378],
          zoom: 11,
          zoomControl: true,
          scrollWheelZoom: true
        });

        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map);

        const uniqueDruhyPrace = [...new Set(zakazkyData.map(z => z.druh))].filter(druh => druh && druh.trim() !== '');

        zakazkyData.forEach((zakazka, index) => {
          const coords = getCoordinatesFromAddress(zakazka.adresa);
          if (coords) {
            const color = workCategories.find(cat => cat.name === zakazka.druh)?.color || '#6B7280';

            const getIconForCategory = (druh) => {
              const categoryLower = druh.toLowerCase();
              if (categoryLower.includes('mvč') || categoryLower.includes('malování')) return '🎨';
              if (categoryLower.includes('adam')) return '👤';
              if (categoryLower.includes('korálek')) return '⚪';
              if (categoryLower.includes('poplavky')) return '🎣';
              if (categoryLower.includes('dohoz')) return '🔧';
              if (categoryLower.includes('vincent')) return '🔨';
              if (categoryLower.includes('albert')) return '⚒️';
              if (categoryLower.includes('lenka')) return '🎯';
              if (categoryLower.includes('martin')) return '⚡';
              if (categoryLower.includes('minutost')) return '⏰';
              return '📋';
            };

            const marker = L.marker(coords, {
              icon: L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="
                  background-color: ${color};
                  width: 36px;
                  height: 36px;
                  border-radius: 50%;
                  border: 3px solid white;
                  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  position: relative;
                ">
                  <div style="
                    color: white;
                    font-size: 16px;
                    font-weight: 700;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.6);
                    line-height: 1;
                  ">${getIconForCategory(zakazka.druh)}</div>
                </div>`,
                iconSize: [42, 42],
                iconAnchor: [21, 21]
              })
            }).addTo(map);

            marker.bindPopup(`
              <div style="font-family: system-ui, sans-serif; min-width: 220px; max-width: 300px;">
                <h3 style="margin: 0 0 12px 0; color: ${color}; font-size: 16px; font-weight: 700; border-bottom: 2px solid ${color}; padding-bottom: 6px;">
                  ${zakazka.klient}
                </h3>
                <div style="font-size: 13px; line-height: 1.5;">
                  <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
                    <strong>Druh:</strong> 
                    <span style="color: ${color}; font-weight: 600;">${zakazka.druh}</span>
                  </div>
                  <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
                    <strong>Datum:</strong> 
                    <span>${zakazka.datum}</span>
                  </div>
                  <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
                    <strong>Částka:</strong> 
                    <span style="color: #059669; font-weight: 700;">${zakazka.castka.toLocaleString()} Kč</span>
                  </div>
                  <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
                    <strong>Zisk:</strong> 
                    <span style="color: #059669; font-weight: 700;">${zakazka.zisk.toLocaleString()} Kč</span>
                  </div>
                  <div style="margin-bottom: 8px;">
                    <strong>Adresa:</strong><br>
                    <span style="font-style: italic;">${zakazka.adresa}</span>
                  </div>
                  <div style="font-size: 11px; color: #6b7280; margin-top: 8px; text-align: center; padding-top: 6px; border-top: 1px solid #e5e7eb;">
                    Zakázka #${zakazka.cislo || index + 1}
                  </div>
                </div>
              </div>
            `);
          }
        });

        // Legenda
        const legend = L.control({position: 'bottomright'});
        legend.onAdd = function(map) {
          const div = L.DomUtil.create('div', 'info legend');

          const druhyStats = uniqueDruhyPrace.map(druh => {
            const zakazkyDruhu = zakazkyData.filter(z => z.druh === druh);
            return {
              name: druh,
              color: workCategories.find(cat => cat.name === druh)?.color || '#6B7280',
              count: zakazkyDruhu.length,
              totalRevenue: zakazkyDruhu.reduce((sum, z) => sum + z.castka, 0)
            };
          }).sort((a, b) => b.totalRevenue - a.totalRevenue);

          const legendItems = druhyStats.map(druh => 
            `<div style="margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 16px; height: 16px; background: ${druh.color}; border-radius: 50%; margin-right: 8px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                <span style="font-weight: 500; font-size: 12px;">${druh.name}</span>
              </div>
              <span style="font-size: 11px; color: #666; margin-left: 8px;">${druh.count}x</span>
            </div>`
          ).join('');

          div.innerHTML = `
            <div style="background: white; padding: 16px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); font-family: system-ui, sans-serif; border: 1px solid #e5e7eb; max-width: 200px;">
              <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #374151; text-align: center;">Druhy prací</h4>
              <div style="font-size: 12px; line-height: 1.4; max-height: 300px; overflow-y: auto;">
                ${legendItems}
              </div>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #666; text-align: center;">
                Celkem: ${uniqueDruhyPrace.length} druhů
              </div>
            </div>
          `;
          return div;
        };
        legend.addTo(map);

        if (isMounted) {
          setMapInitialized(true);
          setMapError(null);
        }

      } catch (error) {
        console.error('Error initializing map:', error);
        if (isMounted) {
          setMapError('Chyba při načítání mapy');
        }
      }
    };

    const timer = setTimeout(initializeMap, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [zakazkyData, workCategories]);

  return (
    <div className="mapa-zakazek">
      <style jsx>{`
          .location-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 32px;
          }

          @media (max-width: 768px) {
            .location-stats-grid {
              grid-template-columns: 1fr;
              gap: 16px;
            }
          }
        `}</style>
      <div className="page-header">
        <div>
          <h1>Mapa zakázek</h1>
          <p>Geografické zobrazení všech realizovaných zakázek</p>
        </div>
      </div>

      <div className="location-stats-grid">
        <StatCard
          title="PRAHA"
          value={`${locationStats['Praha'].count}`}
          subtitle={`Tržby: ${locationStats['Praha'].revenue.toLocaleString()} Kč`}
          iconClass="icon-map"
          color="blue"
          index={0}
          showCurrency={false}
          smallValueText={true}
          blueSubtitle={true}
        />
        <StatCard
          title="OKOLÍ PRAHY"
          value={`${locationStats['Okolí Prahy'].count}`}
          subtitle={`Tržby: ${locationStats['Okolí Prahy'].revenue.toLocaleString()} Kč`}
          iconClass="icon-map"
          color="green"
          index={1}
          showCurrency={false}
          smallValueText={true}
          blueSubtitle={true}
        />
        <StatCard
          title="CELKOVÝ ZISK - PRAHA"
          value={`${locationStats['Praha'].profit.toLocaleString()} Kč`}
          subtitle={`Průměr: ${locationStats['Praha'].count > 0 ? Math.round(locationStats['Praha'].profit / locationStats['Praha'].count).toLocaleString() : 0} Kč`}
          iconClass="icon-chart"
          color="purple"
          index={2}
          showCurrency={false}
          blueSubtitle={true}
        />
        <StatCard
          title="CELKOVÝ ZISK - OKOLÍ"
          value={`${locationStats['Okolí Prahy'].profit.toLocaleString()} Kč`}
          subtitle={`Průměr: ${locationStats['Okolí Prahy'].count > 0 ? Math.round(locationStats['Okolí Prahy'].profit / locationStats['Okolí Prahy'].count).toLocaleString() : 0} Kč`}
          iconClass="icon-chart"
          color="orange"
          index={3}
          showCurrency={false}
          blueSubtitle={true}
        />
      </div>

      <div className="map-container">
        <div className="map-header">
          <h2>🗺️ Interaktivní mapa zakázek</h2>
          <p>Klikněte na značky pro zobrazení detailů zakázky</p>
        </div>

        <div style={{ 
          width: '100%', 
          height: '600px', 
          borderRadius: '16px', 
          overflow: 'hidden',
          border: '2px solid #e5e7eb',
          position: 'relative'
        }}>
          {mapError ? (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f9fafb',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>{mapError}</h3>
              <p style={{ margin: '0' }}>Zkuste obnovit stránku</p>
            </div>
          ) : zakazkyData.length === 0 ? (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f9fafb',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>Žádné zakázky k zobrazení</h3>
              <p style={{ margin: '0' }}>Přidejte zakázky s adresami pro zobrazení na mapě</p>
            </div>
          ) : (
            <>
              {!mapInitialized && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: '#f9fafb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}>
                  <div style={{ textAlign: 'center', color: '#6b7280' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      border: '4px solid #e5e7eb', 
                      borderTop: '4px solid #3b82f6', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 16px'
                    }}></div>
                    <p>Načítám mapu...</p>
                  </div>
                </div>
              )}
              <div 
                ref={mapContainerRef} 
                style={{ 
                  width: '100%', 
                  height: '100%',
                  opacity: mapInitialized ? 1 : 0,
                  transition: 'opacity 0.3s ease'
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapSection;