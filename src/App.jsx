import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './App.css';
import './ModernIcons.css';
import html2pdf from 'html2pdf.js';
import CalendarComponent from './CalendarComponent';
import CalculatorComponent from './CalculatorComponent';
import { AuthProvider, useAuth } from './AuthContext';
import LoginScreen from './LoginScreen';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line, Chart } from 'react-chartjs-2';
import OptimizedOrderTable from './OptimizedOrderTable';
import { StatCard, Sidebar, FileUploadCell, ReportsSection, MapSection } from './components';
import { useZakazkyStatistics, useChartData } from './hooks';
import { exportCompletePDF } from './utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Import systému kategorií
import workCategoryManager from './utils/WorkCategoryManager';

// Import utility tříd
import FileManager from './utils/FileManager';

// Zpětná kompatibilita
const validateFile = FileManager.validateFile;
const uploadFileToSupabase = FileManager.uploadFile;
const downloadFile = FileManager.downloadFile;

// Import filtrovacích funkcí
import { filterMainOrdersOnly } from './utils/dataFilters';

const PaintPro = () => {
  const { currentUser, getUserData, addUserOrder, editUserOrder, deleteUserOrder } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reportPeriod, setReportPeriod] = useState('week');
  const [filterDruhPrace, setFilterDruhPrace] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingZakazka, setEditingZakazka] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  // Stav pro paginaci zakázek
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // OPRAVA: Inicializace zakazkyData jako prázdné pole
  const [zakazkyData, setZakazkyData] = useState([]);

  

  // Načtení dat při přihlášení uživatele
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser?.id) {
        try {
          console.log('🔄 Načítám data pro uživatele:', currentUser.id);
          const data = await getUserData(currentUser.id);
          
          // OPRAVA: Bezpečná kontrola dat z AuthContext
          let safeData = Array.isArray(data) ? data : [];
          console.log('📋 Načteno ze AuthContext:', safeData.length, 'zakázek');
          
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
          console.log('✅ Data zpracována a nastavena, celkem zakázek:', updatedData.length);
        } catch (error) {
          console.error('❌ Chyba při načítání dat:', error);
          setZakazkyData([]); // Fallback na prázdné pole
        }
      } else {
        console.log('👤 Žádný přihlášený uživatel');
        setZakazkyData([]); // Žádný uživatel = prázdná data
      }
    };

    loadUserData();
  }, [currentUser?.id, getUserData]);

  // Další effect pro debug - sledování změn v zakazkyData
  useEffect(() => {
    console.log('📊 zakazkyData state změněn, nová délka:', zakazkyData.length);
    if (zakazkyData.length > 0) {
      console.log('📊 První zakázka:', zakazkyData[0]);
    }
  }, [zakazkyData]);

  // Reset stránky při změně filtrů
  useEffect(() => {
    setCurrentPage(1);
  }, [searchClient, filterDruhPrace, filterDateFrom, filterDateTo]);

  // Jednoduchý stav pro kategorie - bez složitých listenerů
  const [workCategories, setWorkCategories] = useState(workCategoryManager.getAllCategories());

  // Vyčištění test kategorií při načtení
  useEffect(() => {
    // Odstranit test kategorie z localStorage
    const categories = workCategoryManager.getAllCategories();
    let categoriesChanged = false;

    const cleanedCategories = categories.filter(cat => {
      const isTestCategory = cat.name.toLowerCase().includes('test') && cat.name.includes('17');
      if (isTestCategory) {
        categoriesChanged = true;
        console.log('Removing test category:', cat.name);
      }
      return !isTestCategory;
    });

    if (categoriesChanged) {
      // Přímo upravit categories a uložit
      workCategoryManager.categories = cleanedCategories;
      workCategoryManager.saveCategories();
      setWorkCategories(workCategoryManager.getAllCategories());
    }
  }, []);
  // Reset stránky při změně filtrů
  useEffect(() => {
    setCurrentPage(1);
  }, [searchClient, filterDruhPrace, filterDateFrom, filterDateTo]);

  // Funkce pro přidání zakázky - OPRAVENO pro async
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

  // Funkce pro editaci zakázky - OPRAVENO pro async
  const handleEditZakazka = async (zakazkaData) => {
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
      
      setEditingZakazka(null);
      setShowEditModal(false);
    } catch (error) {
      console.error('❌ Chyba při úpravě zakázky:', error);
      alert('Chyba při úpravě zakázky: ' + error.message);
      setEditingZakazka(null);
      setShowEditModal(false);
    }
  };

  // Funkce pro smazání zakázky - OPRAVENO pro async
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
  const getMonthlyPerformance = () => {
    const monthNames = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čer', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];
    const monthlyData = {};

    // Inicializace všech měsíců
    for (let i = 0; i < 12; i++) {
      const key = `2025-${String(i + 1).padStart(2, '0')}`;
      monthlyData[key] = { revenue: 0, orders: 0, month: i, year: 2025 };
    }

    // Agregace dat ze zakázek - OPRAVENO pro bezpečnost
    const safeZakazkyData = Array.isArray(zakazkyData) ? zakazkyData : [];
    safeZakazkyData.forEach(zakazka => {
      const date = new Date(zakazka.datum.split('. ').reverse().join('-'));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (monthlyData[key]) {
        monthlyData[key].revenue += zakazka.castka;
        monthlyData[key].orders += 1;
      }
    });

    // Získání max hodnot pro procentuální výpočet
    const maxRevenue = Math.max(...Object.values(monthlyData).map(m => m.revenue));
    const maxOrders = Math.max(...Object.values(monthlyData).map(m => m.orders));

    // Posledních 6 měsíců s daty
    return Object.keys(monthlyData)
      .filter(key => monthlyData[key].revenue > 0 || monthlyData[key].orders > 0)
      .slice(-6)
      .map(key => {
        const data = monthlyData[key];
        return {
          name: monthNames[data.month],
          year: data.year,
          revenue: data.revenue,
          orders: data.orders,
          revenuePercent: maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0,
          ordersPercent: maxOrders > 0 ? (data.orders / maxOrders) * 100 : 0
        };
      });
  };

  // Funkce pro roční výkonnost - optimalizováno s useMemo
  const getYearlyData = () => {
    const currentYear = 2025;
    const yearData = zakazkyData
      .filter(zakazka => {
        const date = new Date(zakazka.datum.split('. ').reverse().join('-'));
        return date.getFullYear() === currentYear;
      })
      .reduce((acc, zakazka) => {
        acc.revenue += zakazka.castka;
        acc.orders += 1;
        return acc;
      }, { revenue: 0, orders: 0 });

    // Pro procenta použijeme target hodnoty nebo max z dostupných dat
    const revenueTarget = 200000; // 200k Kč target
    const ordersTarget = 50; // 50 zakázek target

    return {
      revenue: yearData.revenue,
      orders: yearData.orders,
      revenuePercent: Math.min((yearData.revenue / revenueTarget) * 100, 100),
      ordersPercent: Math.min((yearData.orders / ordersTarget) * 100, 100)
    };
  };
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  // Použití custom hooks pro statistiky a graf data
  const { dashboardData } = useZakazkyStatistics(zakazkyData, workCategories);
  const { getCombinedChartData } = useChartData(zakazkyData);

  // Funkce pro přidání zakázky - optimalizováno s useCallback
  const addZakazka = useCallback(async (newZakazka) => {
    try {
      await handleAddZakazka(newZakazka);
      setShowAddModal(false); // Zavři modal pouze po úspěšném přidání
      console.log('✅ Modal zavřen po úspěšném přidání zakázky');
    } catch (error) {
      console.error('❌ Chyba při přidávání - modal zůstává otevřený:', error);
      // Modal zůstane otevřený při chybě
    }
  }, [handleAddZakazka]);

  // Funkce pro editaci - optimalizováno s useCallback
  const editZakazka = useCallback((zakazka) => {
    setEditingZakazka(zakazka);
    setShowEditModal(true);
  }, []);

  // Funkce pro smazání zakázky - optimalizováno s useCallback
  const deleteZakazka = useCallback((id) => {
    if (window.confirm('Opravdu chcete smazat tuto zakázku?')) {
      handleDeleteZakazka(id);
    }
  }, [handleDeleteZakazka]);

  // Funkce pro aktualizaci souborů zakázky - optimalizováno s useCallback
  const handleFilesUpdate = useCallback(async (zakazkaId, newFiles) => {
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

      // Aktualizuj v Supabase na pozadí
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
  }, [zakazkyData, currentUser?.id, editUserOrder]);



  

  const combinedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'var(--text-chart)',
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
            weight: '500',
            letterSpacing: '0.3px',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(139, 92, 246, 0.5)',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        titleFont: {
          size: 14,
          weight: '600'
        },
        bodyFont: {
          size: 13,
          weight: '500'
        },
        padding: 12,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toLocaleString()} Kč`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(148, 163, 184, 0.2)',
          drawBorder: false,
        },
        ticks: {
          color: 'var(--text-chart)',
          font: {
            size: 11,
            weight: '500',
            letterSpacing: '0.2px',
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.2)',
          drawBorder: false,
        },
        ticks: {
          color: 'var(--text-chart)',
          font: {
            size: 11,
            letterSpacing: '0.2px',
          },
          callback: function(value) {
            return value.toLocaleString() + ' Kč';
          }
        },
      },
    },
    elements: {
      bar: {
        borderRadius: 8,
      },
      point: {
        hoverBackgroundColor: 'var(--text-secondary)',
        hoverBorderWidth: 3,
      },
    },
  };

  const doughnutChartData = {
    labels: dashboardData.rozlozeniData.labels,
    datasets: [
      {
        data: dashboardData.rozlozeniData.values,
        backgroundColor: dashboardData.rozlozeniData.colors.map(color => {
          // Převedení barvy na rgba s transparentností 0.9
          if (color.startsWith('#')) {
            const hex = color.slice(1);
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return `rgba(${r}, ${g}, ${b}, 0.9)`;
          } else if (color.startsWith('rgb')) {
            return color.replace('rgb', 'rgba').replace(')', ', 0.9)');
          }
          return color;
        }),
        borderColor: dashboardData.rozlozeniData.colors.map(color => {
          // Převedení barvy na rgba s transparentností 1.0
          if (color.startsWith('#')) {
            const hex = color.slice(1);
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return `rgba(${r}, ${g}, ${b}, 1)`;
          } else if (color.startsWith('rgb')) {
            return color.replace('rgb', 'rgba').replace(')', ', 1)');
          }
          return color;
        }),
        borderWidth: 0,
        hoverBorderWidth: 0,
        cutout: '65%',
        radius: '85%',
        rotation: -90,
        circumference: 360,
        spacing: 2,
        borderRadius: 8,
        borderSkipped: false,
      }
    ]
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: 40
    },
    plugins: {
      legend: {
        display: false // Disable default legend, we'll create custom external labels
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(139, 92, 246, 0.5)',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        titleFont: {
          size: 14,
          weight: '600'
        },
        bodyFont: {
          size: 13,
          weight: '500'
        },
        padding: 12,
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
            const percentage = Math.round((context.raw / total) * 100);
            return `${context.label}: ${percentage}% (${context.raw.toLocaleString()} Kč)`;
          }
        }
      },
    },
    elements: {
      arc: {
        borderJoinStyle: 'round',
      }
    },
    interaction: {
      intersect: false,
      mode: 'point'
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
      easing: 'easeOutCubic'
    }
  };

  

  

  const Dashboard = () => (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Přehled výkonnosti a klíčových metrik</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="CELKOVÉ TRŽBY"
          value={`${dashboardData.celkoveTrzby} Kč`}
          subtitle=""
          iconClass="icon-money"
          color="blue"
          index={0}
          showCurrency={false}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
        />
        <StatCard
          title="CELKOVÝ ZISK"
          value={`${dashboardData.celkovyZisk} Kč`}
          subtitle={`(Marže ${(() => {
            const trzby = parseInt(dashboardData.celkoveTrzby.replace(/,/g, ''));
            const zisk = parseInt(dashboardData.celkovyZisk.replace(/,/g, ''));
            return trzby > 0 ? Math.round((zisk / trzby) * 100) : 0;
          })()}%)`}
          iconClass="icon-chart"
          color="green"
          index={1}
          showCurrency={false}
          blueSubtitle={true}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
        />
        <StatCard
          title="POČET ZAKÁZEK"
          value={`${dashboardData.pocetZakazek}`}
          subtitle="dokončených zakázek"
          iconClass="icon-orders"
          color="purple"
          index={2}
          showCurrency={false}
          smallValueText={true}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
        />
        <StatCard
          title="PRŮMĚRNÝ ZISK"
          value={`${dashboardData.prumernyZisk} Kč`}
          subtitle="Na zakázku"
          iconClass="icon-target"
          color="orange"
          index={3}
          showCurrency={false}
          blueSubtitle={true}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
        />
      </div>

      <div className="charts-grid">
        <div className="chart-card large">
          <div className="chart-header">
            <div>
              <h3>PŘEHLED ZISKU</h3>
              <div className="chart-values-dual">
                <div className="chart-value-main">{dashboardData.celkovyZisk} Kč</div>
                <div className="chart-value-secondary">Měsíc: {(() => {
                  const zisk = parseInt(dashboardData.celkovyZisk.replace(/,/g, ''));
                  const pocetMesicu = dashboardData.mesicniData.values.filter(v => v > 0).length || 1;
                  return Math.round(zisk / pocetMesicu).toLocaleString();
                })()} Kč</div>
              </div>
            </div>
          </div>
          <div className="chart-container-large">
            {zakazkyData.length > 0 ? (
              <Bar data={getCombinedChartData} options={combinedChartOptions} />
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-muted)',
                fontSize: '16px',
                fontWeight: '500'
              }}>
                📊 Přidejte zakázky pro zobrazení grafu
              </div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>ROZLOŽENÍ PODLE DRUHU PŘÍJMŮ</h3>
              <div className="chart-value">{dashboardData.celkovyZisk} Kč</div>
            </div>
          </div>
          <div className="chart-container-donut">
            <div className="donut-chart-wrapper">
              {dashboardData.rozlozeniData.values.some(v => v > 0) ? (
                <>
                  <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
                  <div className="external-labels">
                    {(() => {
                      // Nejdřív filtruj kategorie s hodnotou > 0
                      const total = dashboardData.rozlozeniData.values.reduce((a, b) => a + b, 0);
                      const visibleCategories = dashboardData.rozlozeniData.labels
                        .map((label, index) => ({
                          label,
                          index,
                          value: dashboardData.rozlozeniData.values[index],
                          percentage: total > 0 ? Math.round((dashboardData.rozlozeniData.values[index] / total) * 100) : 0
                        }))
                        .filter(cat => cat.value > 0);

                      const visibleCount = visibleCategories.length;

                      return visibleCategories.map((category, visibleIndex) => {
                        // Dynamické pozicionování kolem kruhu
                        const angleStep = (2 * Math.PI) / visibleCount;
                        const angle = (visibleIndex * angleStep) - (Math.PI / 2); // Začít nahoře (-90°)

                        // Poloměr pro umístění labelů (vzdálenost od středu)
                        const radius = 200; // px od středu - maximální vzdálenost pro perfektní čitelnost
                        const centerX = 200; // střed kontejneru (400px / 2)
                        const centerY = 200; // střed kontejneru (400px / 2)

                        // Vypočítat x,y pozici
                        const x = centerX + radius * Math.cos(angle);
                        const y = centerY + radius * Math.sin(angle);

                        return (
                          <div 
                            key={category.label} 
                            className="label-item label-dynamic"
                            style={{
                              left: `${x}px`,
                              top: `${y}px`,
                              transform: 'translate(-50%, -50%)'
                            }}
                          >
                            <div className="label-content">
                              <div className="label-percentage">{category.percentage}%</div>
                              <div className="label-name">{category.label}</div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '200px',
                  color: 'var(--text-muted)',
                  fontSize: '16px',
                  fontWeight: '500'
                }}>
                  📊 Přidejte zakázky pro zobrazení rozložení
                </div>
              )}
            </div>
          </div>
          <div className="chart-details">
            <div className="detail-row">
              <span>KATEGORIÍ</span>
              <span>{dashboardData.rozlozeniData.labels.length}</span>
            </div>
            <div className="detail-row">
              <span>Největší podíl</span>
              <span>{(() => {
                const maxIndex = dashboardData.rozlozeniData.values.indexOf(Math.max(...dashboardData.rozlozeniData.values));
                const total = dashboardData.rozlozeniData.values.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((dashboardData.rozlozeniData.values[maxIndex] / total) * 100) : 0;
                return `${dashboardData.rozlozeniData.labels[maxIndex]} (${percentage}%)`;
              })()}</span>
            </div>
            <div className="detail-row">
              <span>Celková suma</span>
              <span>{dashboardData.celkovyZisk} Kč</span>
            </div>
          </div>
        </div>
      </div>

      <div className="performance-grid">
        {/* Měsíční výkonnost */}
        <div className="performance-card">
          <div className="performance-header">
            <h3>Měsíční výkonnost</h3>
          </div>
          <div className="performance-months">
            {getMonthlyPerformance().map((month, index) => (
              <div key={index} className="month-performance">
                <div className="month-title">{month.name} {month.year}</div>
                <div className="progress-group">
                  <div className="progress-item">
                    <div className="progress-label">
                      <span>Celková cena</span>
                      <span className="progress-value">{month.revenue.toLocaleString()} Kč</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill revenue" 
                        style={{width: `${month.revenuePercent}%`}}
                      ></div>
                    </div>
                  </div>
                  <div className="progress-item">
                    <div className="progress-label">
                      <span>Zakázky</span>
                      <span className="progress-value">{month.orders}</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill orders" 
                        style={{width: `${month.ordersPercent}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Roční výkonnost */}
        <div className="performance-card">
          <div className="performance-header">
            <h3>Roční výkonnost</h3>
          </div>
          <div className="yearly-performance">
            <div className="year-title">2025</div>
            <div className="progress-group">
              <div className="progress-item">
                <div className="progress-label">
                  <span>Celková cena</span>
                  <span className="progress-value">{getYearlyData().revenue.toLocaleString()} Kč</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill revenue" 
                    style={{width: `${getYearlyData().revenuePercent}%`}}
                  ></div>
                </div>
              </div>
              <div className="progress-item">
                <div className="progress-label">
                  <span>Zakázky</span>
                  <span className="progress-value">{getYearlyData().orders}</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill orders" 
                    style={{width: `${getYearlyData().ordersPercent}%`}}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Modal komponenty
  const AddZakazkaModal = () => {
    const [formData, setFormData] = useState({
      datum: new Date().toISOString().split('T')[0],
      druh: '',
      klient: '',
      cislo: '',
      adresa: '',
      castka: '',
      hasFee: false,
      material: '',
      pomocnik: '',
      palivo: '',
      delkaRealizace: '1',
      poznamky: '',
      typ: ''
    });

    const [isOcrProcessing, setIsOcrProcessing] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const fileInputRef = useRef(null);

    const handleSubmit = (e) => {
      e.preventDefault();

      // Přidat kategorii, pokud není prázdná a neexistuje
      if (formData.druh && formData.druh.trim()) {
        const trimmedCategory = formData.druh.trim();
        if (!workCategoryManager.getCategoryNames().includes(trimmedCategory)) {
          workCategoryManager.addCategory(trimmedCategory);
          setWorkCategories(workCategoryManager.getAllCategories());
        }
      }

      const processedData = {
        datum: formData.datum ? new Date(formData.datum).toLocaleDateString('cs-CZ') : '',
        druh: formData.druh || '',
        klient: formData.klient || '',
        cislo: formData.cislo || '',
        adresa: formData.adresa || '',
        castka: formData.castka ? Number(formData.castka) : 0,
        material: formData.material ? Number(formData.material) : 0,
        pomocnik: formData.pomocnik ? Number(formData.pomocnik) : 0,
        palivo: formData.palivo ? Number(formData.palivo) : 0,
        delkaRealizace: formData.delkaRealizace || '1',
        poznamky: formData.poznamky || '',
        typ: formData.typ || ''
      };

      // Fee se vždy přidá - buď vypočítané nebo 0
      if (formData.hasFee && formData.castka && Number(formData.castka) > 0) {
        processedData.fee = Math.round(Number(formData.castka) * 0.261);
      } else {
        processedData.fee = 0;
      }

      addZakazka(processedData);
      setShowAddModal(false);
    };

    const resetForm = () => {
      setFormData({
        datum: new Date().toISOString().split('T')[0],
        druh: '',
        klient: '',
        cislo: '',
        adresa: '',
        castka: '',
        hasFee: false,
        material: '',
        pomocnik: '',
        palivo: '',
        delkaRealizace: '1',
        poznamky: '',
        typ: ''
      });
    };

    // Reset formuláře při otevření modalu
    React.useEffect(() => {
      if (showAddModal) {
        resetForm();
      }
    }, [showAddModal]);

    // OCR funkce pro zpracování obrázků
    const handleOcrUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      // Kontrola typu souboru
      if (!file.type.startsWith('image/')) {
        alert('Prosím nahrájte obrázek (JPG, PNG, atd.)');
        return;
      }

      setIsOcrProcessing(true);
      setOcrProgress(0);

      try {
        // Dynamicky načteme Tesseract.js
        const Tesseract = await import('tesseract.js');

        console.log('🔍 Spouštím OCR analýzu souboru:', file.name);

        // Zpracování OCR s progress callbackem
        const { data: { text } } = await Tesseract.recognize(
          file,
          'ces+eng', // Český a anglický jazyk
          {
            logger: m => {
              if (m.status === 'recognizing text') {
                setOcrProgress(Math.round(m.progress * 100));
              }
            }
          }
        );

        console.log('✅ OCR dokončeno, extrahovaný text:', text);

        // Parsování extrahovaného textu
        const extractedData = parseOcrText(text);
        console.log('📋 Parsovaná data:', extractedData);

        // Automatické vyplnění formuláře
        setFormData(prev => ({
          ...prev,
          ...extractedData,
          poznamky: `${prev.poznamky}\n\nAutomaticky extrahováno z ${file.name}:\n${text.substring(0, 200)}...`.trim()
        }));

        alert(`✅ Text úspěšně extrahován z obrázku!\n\nNalezené údaje:\n${Object.entries(extractedData).filter(([k,v]) => v).map(([k,v]) => `${k}: ${v}`).join('\n')}`);

      } catch (error) {
        console.error('❌ Chyba při OCR:', error);
        alert('❌ Chyba při zpracování obrázku. Zkuste jiný obrázek nebo zadejte údaje ručně.');
      } finally {
        setIsOcrProcessing(false);
        setOcrProgress(0);
        // Reset file input
        if (event.target) {
          event.target.value = '';
        }
      }
    };

    // Funkce pro parsování OCR textu a extrakci údajů
    const parseOcrText = (text) => {
      const originalText = text;
      const cleanText = text.toLowerCase().replace(/\s+/g, ' ');
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const extractedData = {};

      console.log('🔍 OCR parsing - původní text:', originalText);
      console.log('🔍 OCR parsing - řádky:', lines);

      // Pokročilé regex vzory pro různé údaje
      const patterns = {
        // Telefonní čísla (české formáty)
        phone: /(\+420\s?)?[0-9]{3}\s?[0-9]{3}\s?[0-9]{3}/g,
        
        // Částky - vylepšené rozpoznávání
        amount: /(\d{1,3}(?:[,.\s]\d{3})*(?:[,.]\d{2})?)\s*(?:kč|czk|eur|€|korun?|crowns?)/gi,
        amountSimple: /\b(\d{3,})\b/g, // Jednoduchá částka bez měny
        
        // Datum - více formátů
        date: /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/g,
        dateWithText: /(datum|date)[\s:]*(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/gi,
        
        // Číslo faktury/zakázky
        invoice: /(faktura|invoice|číslo|number|zakázka|order)[\s:]*([a-z0-9\-\/]+)/gi,
        invoiceSimple: /[a-z]{2,4}[\-_]?\d{3,}/gi,
        
        // PSČ a město (české PSČ)
        postal: /(\d{3}\s?\d{2})\s+([a-záčďéěíňóřšťúůýž\s]+)/gi,
        address: /(ulice|street|adresa|address)[\s:]*([^,\n]+)/gi,
        
        // Email
        email: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
        
        // Jména - vylepšené rozpoznávání
        personName: /\b[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]{2,}\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]{2,}\b/g,
        clientField: /(klient|client|jméno|name|zákazník|customer)[\s:]*([a-záčďéěíňóřšťúůýž\s]+)/gi
      };

      // 1. EXTRAKCE KLIENTA/JMÉNA - nejvyšší priorita
      console.log('🔍 Hledám jméno klienta...');
      
      // Nejdřív hledej explicitní označení klienta
      const clientFieldMatch = originalText.match(patterns.clientField);
      if (clientFieldMatch) {
        const clientName = clientFieldMatch[0].split(/[\s:]+/).slice(1).join(' ').trim();
        if (clientName.length > 2) {
          extractedData.klient = clientName;
          console.log('✅ Nalezen klient (z pole):', clientName);
        }
      }

      // Pokud nenalezen, hledej jména ve formátu "Jméno Příjmení"
      if (!extractedData.klient) {
        const nameMatches = originalText.match(patterns.personName);
        if (nameMatches && nameMatches.length > 0) {
          // Vyfiltruj nechtěná jména
          const blacklistedNames = [
            'Praha', 'Česká', 'Republika', 'Telefon', 'Email', 'Adresa', 
            'Faktura', 'Invoice', 'Částka', 'Amount', 'Datum', 'Date',
            'Malování', 'Montáž', 'Korálek', 'Adam', 'Czech', 'Republic'
          ];
          
          const validNames = nameMatches.filter(name => {
            const nameParts = name.split(' ');
            return !blacklistedNames.some(blacklisted => 
              nameParts.some(part => part.toLowerCase().includes(blacklisted.toLowerCase()))
            );
          });
          
          if (validNames.length > 0) {
            extractedData.klient = validNames[0];
            console.log('✅ Nalezen klient (pattern):', validNames[0]);
          }
        }
      }

      // 2. EXTRAKCE ČÁSTKY
      console.log('🔍 Hledám částku...');
      
      // Nejdřív hledej částky s měnou
      const amountMatches = originalText.match(patterns.amount);
      if (amountMatches && amountMatches.length > 0) {
        // Vezmi největší částku
        const amounts = amountMatches.map(match => {
          const numStr = match.match(/\d{1,3}(?:[,.\s]\d{3})*(?:[,.]\d{2})?/)[0];
          return parseFloat(numStr.replace(/[,.\s]/g, '').slice(0, -2) + '.' + numStr.slice(-2));
        });
        
        const maxAmount = Math.max(...amounts);
        if (maxAmount > 100) { // Rozumná minimální částka
          extractedData.castka = Math.round(maxAmount);
          console.log('✅ Nalezena částka:', maxAmount);
        }
      }

      // Pokud nenalezena, hledej jednoduché číselné částky
      if (!extractedData.castka) {
        const simpleAmountMatches = originalText.match(patterns.amountSimple);
        if (simpleAmountMatches && simpleAmountMatches.length > 0) {
          const amounts = simpleAmountMatches.map(match => parseInt(match)).filter(amount => amount >= 1000 && amount <= 1000000);
          if (amounts.length > 0) {
            extractedData.castka = Math.max(...amounts);
            console.log('✅ Nalezena částka (jednoduchá):', extractedData.castka);
          }
        }
      }

      // 3. EXTRAKCE DATUMU
      console.log('🔍 Hledám datum...');
      
      const dateWithTextMatch = originalText.match(patterns.dateWithText);
      if (dateWithTextMatch) {
        const match = dateWithTextMatch[0].match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
        if (match) {
          const [, day, month, year] = match;
          extractedData.datum = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          console.log('✅ Nalezeno datum (s textem):', extractedData.datum);
        }
      }

      if (!extractedData.datum) {
        const dateMatch = originalText.match(patterns.date);
        if (dateMatch) {
          const [, day, month, year] = dateMatch[0].match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
          extractedData.datum = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          console.log('✅ Nalezeno datum:', extractedData.datum);
        }
      }

      // 4. EXTRAKCE ČÍSLA ZAKÁZKY
      console.log('🔍 Hledám číslo zakázky...');
      
      const invoiceMatch = originalText.match(patterns.invoice);
      if (invoiceMatch) {
        const invoiceNumber = invoiceMatch[0].split(/[\s:]+/).pop().trim();
        if (invoiceNumber.length > 1) {
          extractedData.cislo = invoiceNumber;
          console.log('✅ Nalezeno číslo zakázky:', invoiceNumber);
        }
      }

      if (!extractedData.cislo) {
        const invoiceSimpleMatch = originalText.match(patterns.invoiceSimple);
        if (invoiceSimpleMatch && invoiceSimpleMatch.length > 0) {
          extractedData.cislo = invoiceSimpleMatch[0];
          console.log('✅ Nalezeno číslo zakázky (jednoduchý pattern):', invoiceSimpleMatch[0]);
        }
      }

      // 5. EXTRAKCE ADRESY
      console.log('🔍 Hledám adresu...');
      
      // Hledej explicitní pole adresy
      const addressFieldMatch = originalText.match(patterns.address);
      if (addressFieldMatch) {
        const address = addressFieldMatch[0].split(/[\s:]+/).slice(1).join(' ').trim();
        if (address.length > 5) {
          extractedData.adresa = address;
          console.log('✅ Nalezena adresa (z pole):', address);
        }
      }

      // Hledej PSČ + město
      if (!extractedData.adresa) {
        const postalMatch = originalText.match(patterns.postal);
        if (postalMatch) {
          extractedData.adresa = postalMatch[0];
          console.log('✅ Nalezena adresa (PSČ + město):', postalMatch[0]);
        }
      }

      // 6. AUTOMATICKÁ KLASIFIKACE DRUHU PRÁCE
      console.log('🔍 Klasifikuji druh práce...');
      
      const workTypeKeywords = {
        'MVČ': ['malování', 'malíř', 'nátěr', 'barva', 'stěna', 'paint', 'painting', 'wall'],
        'Adam': ['montáž', 'instalace', 'sestavení', 'oprava', 'installation', 'assembly', 'repair'],
        'Korálek': ['korálek', 'korálky', 'bead', 'beads', 'výzdoba', 'decoration'],
        'poplavky': ['poplavky', 'plovák', 'float', 'floating', 'voda', 'water']
      };

      for (const [workType, keywords] of Object.entries(workTypeKeywords)) {
        if (keywords.some(keyword => cleanText.includes(keyword))) {
          extractedData.druh = workType;
          console.log('✅ Klasifikován druh práce:', workType);
          break;
        }
      }

      // 7. EXTRAKCE TELEFONNÍHO ČÍSLA
      const phoneMatch = originalText.match(patterns.phone);
      if (phoneMatch) {
        extractedData.telefon = phoneMatch[0].replace(/\s/g, '');
        console.log('✅ Nalezen telefon:', extractedData.telefon);
      }

      // 8. EXTRAKCE EMAILU
      const emailMatch = originalText.match(patterns.email);
      if (emailMatch) {
        extractedData.email = emailMatch[0];
        console.log('✅ Nalezen email:', extractedData.email);
      }

      console.log('🎯 Finální extrahovaná data:', extractedData);
      return extractedData;
    };

    // DŮLEŽITÉ: Zobrazit modal vždy když je showAddModal true
    if (!showAddModal) return null;

    return (
      <div 
        className="modal-overlay" 
        onMouseDown={(e) => {
          // Zavřít pouze při kliknutí přímo na overlay, ne na vnitřní obsah
          if (e.target === e.currentTarget) {
            setShowAddModal(false);
          }
        }}
      >
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Přidat novou zakázku</h2>
            <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
          </div>

          {/* OCR Upload Section */}
          <div className="ocr-upload-section" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '20px',
            border: '2px dashed #4c51bf',
            textAlign: 'center'
          }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleOcrUpload}
              style={{ display: 'none' }}
            />
            
            {!isOcrProcessing ? (
              <div>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📄</div>
                <h3 style={{ margin: '0 0 8px 0', color: 'white', fontSize: '16px' }}>
                  Automatické vyplnění z dokumentu
                </h3>
                <p style={{ margin: '0 0 12px 0', color: '#e2e8f0', fontSize: '13px' }}>
                  Nahrajte fotku faktury, smlouvy nebo poznámky - údaje se automaticky vyplní
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={e => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                >
                  📷 Nahrát foto dokumentu
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
                <h3 style={{ margin: '0 0 8px 0', color: 'white', fontSize: '16px' }}>
                  Zpracovávám dokument...
                </h3>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '8px',
                  margin: '8px 0'
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    height: '6px',
                    borderRadius: '3px',
                    width: `${ocrProgress}%`,
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
                <p style={{ margin: '0', color: '#e2e8f0', fontSize: '13px' }}>
                  {ocrProgress}% - Čtu text z obrázku...
                </p>
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-row">
              <div className="form-group">
                <label>Datum</label>
                <input
                  type="date"
                  value={formData.datum}
                  onChange={e => setFormData({...formData, datum: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Druh práce</label>
                <input
                  type="text"
                  value={formData.druh}
                  onChange={e => setFormData({...formData, druh: e.target.value})}
                  placeholder="Vložit druh práce"
                  list="work-categories-list"
                />
                <datalist id="work-categories-list">
                  {workCategories.map(category => (
                    <option key={category.name} value={category.name} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Klient</label>
                <input
                  type="text"
                  value={formData.klient}
                  onChange={e => setFormData({...formData, klient: e.target.value})}
                  placeholder="Jméno klienta"
                />
              </div>
              <div className="form-group">
                <label>Číslo zakázky</label>
                <input
                  type="text"
                  value={formData.cislo}
                  onChange={e => setFormData({...formData, cislo: e.target.value})}
                  placeholder="Číslo zakázky"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Adresa realizace</label>
              <input
                type="text"
                value={formData.adresa}
                onChange={e => setFormData({...formData, adresa: e.target.value})}
                placeholder="Zadejte adresu kde se práce realizovala"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Částka (Kč)</label>
                <input
                  type="number"
                  value={formData.castka}
                  onChange={e => setFormData({...formData, castka: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>Fee (26.1% z částky)</label>
                <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="radio"
                      name="hasFee"
                      checked={formData.hasFee === false}
                      onChange={() => setFormData({...formData, hasFee: false})}
                      style={{ marginRight: '8px' }}
                    />
                    Ne
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="radio"
                      name="hasFee"
                      checked={formData.hasFee === true}
                      onChange={() => setFormData({...formData, hasFee: true})}
                      style={{ marginRight: '8px' }}
                    />
                    Ano
                  </label>
                </div>
                {formData.hasFee && formData.castka && Number(formData.castka) > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#6B7280' }}>
                    Automaticky vypočítáno: {Math.round(Number(formData.castka) * 0.261)} Kč
                  </div>
                )}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Materiál (Kč)</label>
                <input
                  type="number"
                  value={formData.material}
                  onChange={e => setFormData({...formData, material: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>Pomocník (Kč)</label>
                <input
                  type="number"
                  value={formData.pomocnik}
                  onChange={e => setFormData({...formData, pomocnik: e.target.value})}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Palivo (Kč)</label>
                <input
                  type="number"
                  value={formData.palivo}
                  onChange={e => setFormData({...formData, palivo: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>Doba realizace (dny)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.delkaRealizace}
                  onChange={e => setFormData({...formData, delkaRealizace: e.target.value})}
                  placeholder="1"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Typ objektu</label>
                <select
                  value={formData.typ}
                  onChange={e => setFormData({...formData, typ: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Vyberte typ objektu</option>
                  <option value="byt">Byt</option>
                  <option value="dům">Dům</option>
                  <option value="pension">Pension</option>
                  <option value="obchod">Obchod</option>
                </select>
              </div>
              <div className="form-group">
                {/* Prázdné pole pro zachování layoutu */}
              </div>
            </div>
            <div className="form-group">
              <label>Poznámky</label>
              <textarea
                value={formData.poznamky}
                onChange={e => setFormData({...formData, poznamky: e.target.value})}
                placeholder="Volitelné poznámky k zakázce"
                rows="3"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => {
                resetForm();
                setShowAddModal(false);
              }}>
                Zrušit
              </button>
              <button type="submit" className="btn btn-primary">
                Přidat zakázku
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const EditZakazkaModal = () => {
    const [formData, setFormData] = useState(editingZakazka || {});

    React.useEffect(() => {
      if (editingZakazka) {
        const dateStr = editingZakazka.datum.split('. ').reverse().join('-').replace(' ', '');
        setFormData({
          ...editingZakazka,
          datum: dateStr
        });
      }
    }, [editingZakazka]);

    const handleSubmit = (e) => {
      e.preventDefault();

      // Přidat kategorii, pokud neexistuje (jednoduše při submitu)
      if (formData.druh && formData.druh.trim()) {
        const trimmedCategory = formData.druh.trim();
        if (!workCategoryManager.getCategoryNames().includes(trimmedCategory)) {
          workCategoryManager.addCategory(trimmedCategory);
          setWorkCategories(workCategoryManager.getAllCategories()); // Refresh kategorií
        }
      }

      const processedData = {
        ...formData,
        datum: new Date(formData.datum).toLocaleDateString('cs-CZ'),
        castka: Number(formData.castka),
        fee: Number(formData.fee),
        material: Number(formData.material),
        pomocnik: Number(formData.pomocnik),
        palivo: Number(formData.palivo)
      };
      handleEditZakazka(processedData);
    };

    if (!showEditModal || !editingZakazka) return null;

    return (
      <div 
        className="modal-overlay" 
        onMouseDown={(e) => {
          // Zavřít pouze při kliknutí přímo na overlay, ne na vnitřní obsah
          if (e.target === e.currentTarget) {
            setShowEditModal(false);
          }
        }}
      >
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Upravit zakázku</h2>
            <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
          </div>
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-row">
              <div className="form-group">
                <label>Datum *</label>
                <input
                  type="date"
                  value={formData.datum}
                  onChange={e => setFormData({...formData, datum: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Klient *</label>
                <input
                  type="text"
                  value={formData.klient}
                  onChange={e => setFormData({...formData, klient: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Druh práce</label>
                <input
                  type="text"
                  value={formData.druh || ''}
                  onChange={e => setFormData({...formData, druh: e.target.value})}
                  placeholder="Vložit druh práce"
                  list="work-categories-list-edit"
                />
                <datalist id="work-categories-list-edit">
                  {workCategories.map(category => (
                    <option key={category.name} value={category.name} />
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label>Číslo zakázky *</label>
                <input
                  type="text"
                  value={formData.cislo}
                  onChange={e => setFormData({...formData, cislo: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Adresa realizace</label>
              <input
                type="text"
                value={formData.adresa || ''}
                onChange={e => setFormData({...formData, adresa: e.target.value})}
                placeholder="Zadejte adresu kde se práce realizovala"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Částka (Kč) *</label>
                <input
                  type="number"
                  value={formData.castka}
                  onChange={e => setFormData({...formData, castka: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Fee (Kč)</label>
                <input
                  type="number"
                  value={formData.fee}
                  onChange={e => setFormData({...formData, fee: e.target.value})}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Materiál (Kč)</label>
                <input
                  type="number"
                  value={formData.material}
                  onChange={e => setFormData({...formData, material: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Pomocník (Kč)</label>
                <input
                  type="number"
                  value={formData.pomocnik}
                  onChange={e => setFormData({...formData, pomocnik: e.target.value})}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Palivo (Kč)</label>
              <input
                type="number"
                value={formData.palivo}
                onChange={e => setFormData({...formData, palivo: e.target.value})}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                Zrušit
              </button>
              <button type="submit" className="btn btn-primary">
                Uložit změny
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Funkce pro import CSV
  const handleCSVImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        const importedOrders = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length >= 6 && values[0]) { // Minimálně datum, klient, částka
            const order = {
              datum: values[0] || new Date().toLocaleDateString('cs-CZ'),
              druh: values[1] || 'Import',
              klient: values[2] || 'Nezadáno',
              cislo: values[3] || `IMP-${Date.now()}-${i}`,
              castka: Number(values[4]) || 0,
              fee: Number(values[5]) || 0,
              material: Number(values[6]) || 0,
              pomocnik: Number(values[7]) || 0,
              palivo: Number(values[8]) || 0,
              adresa: values[9] || '',
              typ: values[10] || 'byt',
              poznamky: values[11] || 'Importováno z CSV'
            };
            importedOrders.push(order);
          }
        }

        // Přidáme importované zakázky s await
        for (const order of importedOrders) {
          await handleAddZakazka(order);
        }

        alert(`✅ Úspěšně importováno ${importedOrders.length} zakázek z CSV`);
      } catch (error) {
        console.error('❌ Chyba při importu CSV:', error);
        alert('❌ Chyba při importu CSV souboru: ' + error.message);
      }
    };
    
    reader.onerror = (error) => {
      console.error('❌ Chyba při čtení CSV souboru:', error);
      alert('❌ Chyba při čtení CSV souboru');
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  // Funkce pro export CSV
  const handleCSVExport = () => {
    try {
      // Použijeme filtrované hlavní zakázky (bez kalendářových)
      const dataToExport = filterMainOrdersOnly(zakazkyData);
      
      if (dataToExport.length === 0) {
        alert('❌ Žádné zakázky k exportu');
        return;
      }

      // CSV header
      const headers = [
        'Datum',
        'Druh práce',
        'Klient',
        'Číslo zakázky',
        'Tržba (Kč)',
        'Fee (Kč)',
        'Materiál (Kč)',
        'Pomocník (Kč)',
        'Palivo (Kč)',
        'Adresa',
        'Typ objektu',
        'Doba realizace',
        'Poznámky',
        'Čistý zisk (Kč)'
      ];

      // CSV data rows
      const rows = dataToExport.map(zakazka => [
        zakazka.datum,
        zakazka.druh || '',
        zakazka.klient || '',
        zakazka.cislo || '',
        zakazka.castka || 0,
        zakazka.fee || 0,
        zakazka.material || 0,
        zakazka.pomocnik || 0,
        zakazka.palivo || 0,
        zakazka.adresa || '',
        zakazka.typ || '',
        zakazka.delkaRealizace || 1,
        zakazka.poznamky || '',
        zakazka.zisk || 0
      ]);

      // Kombinace headers a rows
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => {
          // Escape commas and quotes in fields
          const stringField = String(field);
          if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
          }
          return stringField;
        }).join(','))
        .join('\n');

      // Create and download file
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, filename);
      } else {
        link.href = URL.createObjectURL(blob);
        const currentDate = new Date().toLocaleDateString('cs-CZ').replace(/\./g, '_');
        link.download = `PaintPro_Zakazky_Export_${currentDate}.csv`;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      alert(`✅ Export dokončen! Exportováno ${dataToExport.length} zakázek do CSV souboru.`);
      
    } catch (error) {
      console.error('Chyba při exportu CSV:', error);
      alert('❌ Chyba při exportu CSV souboru');
    }
  };

  // Funkce pro přidání ukázkových dat
  const addSampleData = async () => {
    const sampleOrders = [
      { datum: '11. 4. 2025', druh: 'MVČ', klient: 'Gabriela Hajduchová', cislo: 'MVČ-001', castka: 10000, fee: 2000, material: 0, pomocnik: 0, palivo: 0, adresa: 'Letohradská, Praha 7', typ: 'byt' },
      { datum: '14. 4. 2025', druh: 'Adam - minutost', klient: 'Tereza Pochobradská', cislo: 'ADM-001', castka: 14000, fee: 2000, material: 0, pomocnik: 0, palivo: 0, adresa: 'Cimburkova 9, Praha 3', typ: 'byt' },
      { datum: '17. 4. 2025', druh: 'MVČ', klient: 'Katka Szczepaniková', cislo: 'MVČ-002', castka: 15000, fee: 2000, material: 0, pomocnik: 0, palivo: 0, adresa: 'Nad aleji 23, Praha 6', typ: 'byt' },
      { datum: '21. 4. 2025', druh: 'MVČ', klient: 'Marek Rucki', cislo: 'MVČ-003', castka: 25000, fee: 4000, material: 0, pomocnik: 0, palivo: 0, adresa: 'Národní obrany 49, Praha 6', typ: 'byt' },
      { datum: '27. 4. 2025', druh: 'poplavky', klient: 'Augustin', cislo: 'POP-001', castka: 72000, fee: 20000, material: 0, pomocnik: 0, palivo: 0, adresa: 'Horní poluby, Křenov', typ: 'pension' }
    ];

    for (const order of sampleOrders) {
      await handleAddZakazka(order);
    }
    alert(`✅ Přidáno ${sampleOrders.length} ukázkových zakázek`);
  };

  const Zakazky = () => (
    <div className="zakazky">
      <AddZakazkaModal />
      <EditZakazkaModal />

      <div className="page-header">
        <div>
          <h1>Správa zakázek</h1>
          <p>Přehled a správa všech malířských zakázek s automatickým výpočtem zisku</p>
        </div>
        <div className="page-actions">
          <input
            type="file"
            id="csv-import"
            accept=".csv"
            onChange={handleCSVImport}
            style={{ display: 'none' }}
          />
          <button className="btn btn-secondary" onClick={() => document.getElementById('csv-import').click()}>
            📁 Import CSV
          </button>
          <button className="btn btn-secondary" onClick={handleCSVExport}>
            📤 Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <div className="modern-icon size-small icon-add"></div>
            Přidat zakázku
          </button>
        </div>
      </div>



      <div className="filter-section">
        <div className="filter-card">
          <div className="filter-header">
            <h3>FILTRY REPORTŮ</h3>
            <div className="filter-title">Správa zakázek</div>
          </div>
          <div className="filter-content">
            <div className="filter-row">
              <div className="filter-item">
                <label>Druh práce</label>
                <select 
                  value={filterDruhPrace}
                  onChange={(e) => setFilterDruhPrace(e.target.value)}
                >
                  <option value="">Všechny druhy</option>
                  {workCategories.map(category => (
                    <option key={category.name} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div className="filter-item">
                <label>Klient</label>
                <input 
                  type="text" 
                  placeholder="Hledat podle jména klienta..." 
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                />
              </div>
              <div className="filter-item">
                <label>Datum od</label>
                <input 
                  type="date" 
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>
              <div className="filter-item">
                <label>Datum do</label>
                <input 
                  type="date" 
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
            </div>
            <div className="filter-actions">
              <button 
                className="btn btn-secondary btn-small"
                onClick={() => {
                  setSearchClient('');
                  setFilterDruhPrace('');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setCurrentPage(1); // Reset na první stránku
                }}
              >
                Vymazat filtry
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-container">
          {(() => {
            // Filtrování zakázek (pouze hlavní zakázky, bez kalendářových)
            const filteredZakazky = filterMainOrdersOnly(zakazkyData)
              .filter(zakazka => {
                // Filtr podle klienta
                const clientMatch = searchClient === '' || 
                  zakazka.klient.toLowerCase().includes(searchClient.toLowerCase());

                // Filtr podle druhu práce  
                const druhMatch = filterDruhPrace === '' || zakazka.druh === filterDruhPrace;

                // Filtr podle datumu
                let dateMatch = true;
                if (filterDateFrom || filterDateTo) {
                  const zakazkaDate = new Date(zakazka.datum.split('. ').reverse().join('-'));

                  if (filterDateFrom) {
                    const fromDate = new Date(filterDateFrom);
                    dateMatch = dateMatch && zakazkaDate >= fromDate;
                  }

                  if (filterDateTo) {
                    const toDate = new Date(filterDateTo);
                    dateMatch = dateMatch && zakazkaDate <= toDate;
                  }
                }

                return clientMatch && druhMatch && dateMatch;
              })
              // Řazení podle datumu - nejnovější nahoře, nejstarší dole
              .sort((a, b) => {
                const dateA = new Date(a.datum.split('. ').reverse().join('-'));
                const dateB = new Date(b.datum.split('. ').reverse().join('-'));
                return dateB - dateA; // Sestupně (nejnovější první)
              });

            const totalPages = Math.ceil(filteredZakazky.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;

            return (
              <OptimizedOrderTable
                zakazkyData={filteredZakazky}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                onEdit={editZakazka}
                onDelete={deleteZakazka}
                onFilesUpdate={handleFilesUpdate}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                startIndex={startIndex}
              />
            );
          })()}
        </div>

        
      </div>
    </div>
  );

  const Reporty = () => {
    // Příprava dat pro všechny 4 období
    const getAllPeriodsData = () => {
      const now = new Date();
      const periods = ['week', 'month', 'year', 'all'];
      const periodData = {};

      periods.forEach(period => {
        const filteredData = zakazkyData.filter(zakazka => {
          const zakazkaDate = new Date(zakazka.datum.split('. ').reverse().join('-'));

          switch(period) {
            case 'week':
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              return zakazkaDate >= weekAgo;
            case 'month':
              const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
              return zakazkaDate >= monthAgo;
            case 'year':
              const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
              return zakazkaDate >= yearAgo;
            case 'all':
            default:
              return true;
          }
        });

        periodData[period] = {
          celkoveTrzby: filteredData.reduce((sum, z) => sum + z.castka, 0),
          celkovyZisk: filteredData.reduce((sum, z) => sum + z.zisk, 0),
          pocetZakazek: filteredData.length,
          data: filteredData
        };
      });

      return periodData;
    };

    const allPeriods = getAllPeriodsData();

    // Vytvoření multi-line chart dat
    const createMultiLineChartData = (datasets) => {
      // Pokud nejsou žádné datasety, vytvoř prázdný graf
      if (!datasets || datasets.length === 0) {
        return {
          labels: ['Žádná data'],
          datasets: [{
            label: 'Žádná data',
            data: [0],
            borderColor: 'rgba(156, 163, 175, 0.5)',
            backgroundColor: 'rgba(156, 163, 175, 0.1)',
            fill: false,
            tension: 0,
            pointRadius: 0,
            borderWidth: 1,
          }]
        };
      }

      const result = {
        labels: datasets[0].labels,
        datasets: datasets.map(dataset => ({
          label: dataset.label,
          data: dataset.values,
          borderColor: dataset.color,
          backgroundColor: (context) => {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            if (!chartArea) return;
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, dataset.color.replace('1)', '0.1)'));
            gradient.addColorStop(1, dataset.color.replace('1)', '0.02)'));
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointBackgroundColor: dataset.color,
          pointBorderColor: dataset.color,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
        }))
      };

      return result;
    };

    // Data pro graf podle druhů práce (celá doba - měsíce)
    const getDruhyPraceData = () => {
      const safeDataForDruhy = Array.isArray(zakazkyData) ? zakazkyData : [];
      if (safeDataForDruhy.length === 0) {
        return [];
      }

      const monthlyData = {};

      // Agregace dat podle měsíců - OPRAVENO pro bezpečnost
      safeDataForDruhy.forEach(z => {
        const date = new Date(z.datum.split('. ').reverse().join('-'));
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[key]) {
          monthlyData[key] = { 
            Adam: 0, 
            MVČ: 0, 
            Korálek: 0, 
            Ostatní: 0,
            month: date.getMonth(),
            year: date.getFullYear()
          };
        }
        monthlyData[key][z.druh] += z.zisk;
      });

      const months = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čer', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];
      const sortedData = Object.values(monthlyData)
        .sort((a, b) => a.year - b.year || a.month - b.month);

      const labels = sortedData.map(item => `${months[item.month]} ${item.year}`);

      return [
        {
          label: 'Adam',
          values: sortedData.map(item => item.Adam),
          color: 'rgba(79, 70, 229, 1)',
          labels: labels
        },
        {
          label: 'MVČ',
          values: sortedData.map(item => item.MVČ),
          color: 'rgba(16, 185, 129, 1)',
          labels: labels
        },
        {
          label: 'Korálek',
          values: sortedData.map(item => item.Korálek),
          color: 'rgba(245, 158, 11, 1)',
          labels: labels
        },
        {
          label: 'Ostatní',
          values: sortedData.map(item => item.Ostatní),
          color: 'rgba(139, 92, 246, 1)',
          labels: labels
        }
      ];
    };

    // Data pro hlavní finanční ukazatele (celá doba)
    const getMainFinancialData = () => {
      const safeDataForFinancial = Array.isArray(zakazkyData) ? zakazkyData : [];
      if (safeDataForFinancial.length === 0) {
        return [];
      }

      const monthlyData = {};

      safeDataForFinancial.forEach(z => {
        const date = new Date(z.datum.split('. ').reverse().join('-'));
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[key]) {
          monthlyData[key] = { 
            trzby: 0, 
            zisk: 0, 
            cistyZisk: 0,
            month: date.getMonth(),
            year: date.getFullYear()
          };
        }
        monthlyData[key].trzby += z.castka;
        monthlyData[key].zisk += z.zisk;
        monthlyData[key].cistyZisk += (z.castka - z.fee);
      });

      const months = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čer', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];
      const sortedData = Object.values(monthlyData)
        .sort((a, b) => a.year - b.year || a.month - b.month);

      const labels = sortedData.map(item => `${months[item.month]} ${item.year}`);

      return [
        {
          label: 'Celkové tržby',
          values: sortedData.map(item => item.trzby),
          color: 'rgba(59, 130, 246, 1)',
          labels: labels
        },
        {
          label: 'Celkový zisk',
          values: sortedData.map(item => item.zisk),
          color: 'rgba(16, 185, 129, 1)',
          labels: labels
        },
        {
          label: 'Čistý zisk',
          values: sortedData.map(item => item.cistyZisk),
          color: 'rgba(245, 158, 11, 1)',
          labels: labels
        }
      ];
    };

    // Data pro hlavní finanční ukazatele (poslední měsíc)
    const getMainFinancialDataLastMonth = () => {
      const now = new Date();
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

      const dailyData = {};

      const lastMonthData = zakazkyData.filter(z => {
        const date = new Date(z.datum.split('. ').reverse().join('-'));
        return date >= monthAgo;
      });

      if (lastMonthData.length === 0) {
        return [];
      }

      lastMonthData.forEach(z => {
        const date = new Date(z.datum.split('. ').reverse().join('-'));
        const key = date.toISOString().split('T')[0];

        if (!dailyData[key]) {
          dailyData[key] = { trzby: 0, zisk: 0, cistyZisk: 0, date: date };
        }
        dailyData[key].trzby += z.castka;
        dailyData[key].zisk += z.zisk;
        dailyData[key].cistyZisk += (z.castka - z.fee);
      });

      const sortedData = Object.values(dailyData)
        .sort((a, b) => a.date - b.date);

      const labels = sortedData.map(item => item.date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' }));

      return [
        {
          label: 'Celkové tržby',
          values: sortedData.map(item => item.trzby),
          color: 'rgba(59, 130, 246, 1)',
          labels: labels
        },
        {
          label: 'Celkový zisk',
          values: sortedData.map(item => item.zisk),
          color: 'rgba(16, 185, 129, 1)',
          labels: labels
        },
        {
          label: 'Čistý zisk',
          values: sortedData.map(item => item.cistyZisk),
          color: 'rgba(245, 158, 11, 1)',
          labels: labels
        }
      ];
    };

    // Data pro náklady (celá doba)
    const getCostsData = () => {
      if (zakazkyData.length === 0) {
        return [];
      }

      const monthlyData = {};

      zakazkyData.forEach(z => {
        const date = new Date(z.datum.split('. ').reverse().join('-'));
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[key]) {
          monthlyData[key] = { 
            fee: 0, 
            pomocnik: 0, 
            material: 0, 
            palivo: 0,
            month: date.getMonth(),
            year: date.getFullYear()
          };
        }
        monthlyData[key].fee += z.fee;
        monthlyData[key].pomocnik += z.pomocnik;
        monthlyData[key].material += z.material;
        monthlyData[key].palivo += z.palivo;
      });

      const months = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čer', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];
      const sortedData = Object.values(monthlyData)
        .sort((a, b) => a.year - b.year || a.month - b.month);

      const labels = sortedData.map(item => `${months[item.month]} ${item.year}`);

      return [
        {
          label: 'Fee',
          values: sortedData.map(item => item.fee),
          color: 'rgba(239, 68, 68, 1)',
          labels: labels
        },
        {
          label: 'Pomocník',
          values: sortedData.map(item => item.pomocnik),
          color: 'rgba(168, 85, 247, 1)',
          labels: labels
        },
        {
          label: 'Materiál',
          values: sortedData.map(item => item.material),
          color: 'rgba(34, 197, 94, 1)',
          labels: labels
        },
        {
          label: 'Doprava',
          values: sortedData.map(item => item.palivo),
          color: 'rgba(251, 146, 60, 1)',
          labels: labels
        }
      ];
    };

    const lineChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: true,
          position: 'bottom',
          labels: {
            color: 'var(--text-chart)',
            padding: 15,
            usePointStyle: true,
            font: {
              size: 10,
              weight: '500',
              letterSpacing: '0.3px',
            },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: 'rgba(139, 92, 246, 0.5)',
          borderWidth: 1,
          cornerRadius: 12,
          displayColors: true,
          titleFont: {
            size: 13,
            weight: '600'
          },
          bodyFont: {
            size: 12,
            weight: '500'
          },
          padding: 10,
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y.toLocaleString()} Kč`;
            }
          }
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(148, 163, 184, 0.2)', drawBorder: false },
          ticks: { 
            color: 'var(--text-chart)', 
            font: { 
              size: 9,
              letterSpacing: '0.2px',
            },
            maxTicksLimit: 8,
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.2)', drawBorder: false },
          ticks: { 
            color: 'var(--text-chart)', 
            font: { 
              size: 9,
              letterSpacing: '0.2px',
            },
            callback: function(value) {
              return value.toLocaleString();
            }
          },
        },
      },
    };

    // Top klienti graf
    const getTopClientsData = () => {
      const clientTotals = zakazkyData.reduce((acc, z) => {
        acc[z.klient] = (acc[z.klient] || 0) + z.zisk;
        return acc;
      }, {});

      const sorted = Object.entries(clientTotals)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

      return {
        labels: sorted.map(([name]) => name),
        datasets: [{
          label: 'Zisk klientů',
          data: sorted.map(([,value]) => value),
          borderColor: '#4F46E5',
          backgroundColor: (context) => {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            if (!chartArea) return 'rgba(79, 70, 229, 0.1)';

            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(79, 70, 229, 0.3)');
            gradient.addColorStop(1, 'rgba(79, 70, 229, 0.05)');
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#4F46E5',
          pointBorderColor: 'var(--text-secondary)',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          borderWidth: 3,
        }],
      };
    };

    // Export funkce s plnou grafikou
    const exportToPDF = async () => {
      try {
        // Zobrazit loading
        const loadingToast = document.createElement('div');
        loadingToast.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #1F1F53; color: white; padding: 16px 24px; border-radius: 12px; z-index: 10000; font-family: Inter, sans-serif;">
            📄 Generuje se stylový PDF report...
          </div>
        `;
        document.body.appendChild(loadingToast);

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Přidat podporu pro české znaky
        pdf.addFont('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap', 'Inter', 'normal');

        // Background gradient simulace
        pdf.setFillColor(15, 15, 35); // #0F0F23
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Header s gradienty
        pdf.setFillColor(31, 31, 83); // #1F1F53
        pdf.roundedRect(15, 15, pageWidth - 30, 25, 3, 3, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(20);
        pdf.text('🎨 PaintPro - Financni Report', 20, 30);

        pdf.setFontSize(10);
        pdf.setTextColor(181, 181, 209);
        pdf.text(`Export: ${new Date().toLocaleDateString('cs-CZ')} ${new Date().toLocaleTimeString('cs-CZ')}`, 20, 36);

        let yPosition = 55;

        // Stylové statistiky karty
        const createStatsCard = (title, stats, yPos) => {
          // Karta pozadí
          pdf.setFillColor(42, 45, 95); // card-bg
          pdf.roundedRect(15, yPos, pageWidth - 30, 45, 3, 3, 'F');

          // Gradient top border
          pdf.setFillColor(79, 70, 229); // accent-blue
          pdf.rect(15, yPos, pageWidth - 30, 2, 'F');

          // Titulek
          pdf.setFontSize(14);
          pdf.setTextColor(255, 255, 255);
          pdf.text(title, 20, yPos + 12);

          // Statistiky
          pdf.setFontSize(9);
          let xPos = 20;
          stats.forEach(([label, value], index) => {
            if (index > 0 && index % 2 === 0) {
              xPos = 20;
              yPos += 8;
            } else if (index > 0) {
              xPos = 110;
            }

            pdf.setTextColor(139, 139, 167);
            pdf.text(label, xPos, yPos + 20);
            pdf.setTextColor(255, 255, 255);
            pdf.text(value, xPos, yPos + 26);
          });

          return yPos + 45;
        };

        // Celkové statistiky karta
        const stats = [
          ['Celkove trzby:', `${allPeriods.all.celkoveTrzby.toLocaleString()} Kc`],
          ['Celkovy zisk:', `${allPeriods.all.celkovyZisk.toLocaleString()} Kc`],
          ['Ziskova marze:', `${allPeriods.all.celkoveTrzby > 0 ? Math.round((allPeriods.all.celkovyZisk / allPeriods.all.celkoveTrzby) * 100) : 0}%`],
          ['Pocet zakazek:', `${allPeriods.all.pocetZakazek.toString()}`]
        ];

        yPosition = createStatsCard('📊 CELKOVE STATISTIKY', stats, yPosition) + 10;

        // Období statistiky tabulka
        pdf.setFillColor(42, 45, 95);
        pdf.roundedRect(15, yPosition, pageWidth - 30, 55, 3, 3, 'F');

        pdf.setFillColor(16, 185, 129); // green
        pdf.rect(15, yPosition, pageWidth - 30, 2, 'F');

        pdf.setFontSize(14);
        pdf.setTextColor(255, 255, 255);
        pdf.text('📈 STATISTIKY PODLE OBDOBI', 20, yPosition + 12);

        // Tabulka header
        pdf.setFontSize(8);
        pdf.setTextColor(181, 181, 209);
        const headers = ['Obdobi', 'Trzby (Kc)', 'Zisk (Kc)', 'Zakazky'];
        headers.forEach((header, index) => {
          pdf.text(header, 20 + (index * 35), yPosition + 22);
        });

        // Tabulka data
        const periodStats = [
          ['Tyden', allPeriods.week.celkoveTrzby.toLocaleString(), allPeriods.week.celkovyZisk.toLocaleString(), allPeriods.week.pocetZakazek.toString()],
          ['Mesic', allPeriods.month.celkoveTrzby.toLocaleString(), allPeriods.month.celkovyZisk.toLocaleString(), allPeriods.month.pocetZakazek.toString()],
          ['Rok', allPeriods.year.celkoveTrzby.toLocaleString(), allPeriods.year.celkovyZisk.toLocaleString(), allPeriods.year.pocetZakazek.toString()],
          ['Celkem', allPeriods.all.celkoveTrzby.toLocaleString(), allPeriods.all.celkovyZisk.toLocaleString(), allPeriods.all.pocetZakazek.toString()]
        ];

        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255);
        periodStats.forEach((row, index) => {
          const rowY = yPosition + 28 + (index * 6);
          row.forEach((cell, cellIndex) => {
            pdf.text(cell, 20 + (cellIndex * 35), rowY);
          });
        });

        yPosition += 65;

        // Top klienti karta
        const topClients = Object.entries(
          zakazkyData.reduce((acc, z) => {
            acc[z.klient] = (acc[z.klient] || 0) + z.zisk;
            return acc;
          }, {})
        ).sort(([,a], [,b]) => b - a).slice(0, 6);

        pdf.setFillColor(42, 45, 95);
        pdf.roundedRect(15, yPosition, pageWidth - 30, 50, 3, 3, 'F');

        pdf.setFillColor(245, 158, 11); // orange
        pdf.rect(15, yPosition, pageWidth - 30, 2, 'F');

        pdf.setFontSize(14);
        pdf.setTextColor(255, 255, 255);
        pdf.text('🏆 TOP KLIENTI', 20, yPosition + 12);

        pdf.setFontSize(8);
        topClients.forEach(([klient, zisk], index) => {
          const clientY = yPosition + 20 + (index * 5);
          const pocetZakazek = zakazkyData.filter(z => z.klient === klient).length;

          // Klient ikona
          pdf.setFillColor(79, 70, 229);
          pdf.circle(22, clientY, 1.5, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.text(klient[0], 21.3, clientY + 0.7);

          pdf.setTextColor(255, 255, 255);
          pdf.text(klient, 28, clientY + 1);
          pdf.setTextColor(16, 185, 129);
          pdf.text(`${zisk.toLocaleString()} Kc`, 80, clientY + 1);
          pdf.setTextColor(181, 181, 209);
          pdf.text(`${pocetZakazek} zakazek`, 130, clientY + 1);
        });

        // Nová stránka pro grafy
        pdf.addPage();

        // Background
        pdf.setFillColor(15, 15, 35);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        yPosition = 20;

        // Header
        pdf.setFillColor(31, 31, 83);
        pdf.roundedRect(15, 15, pageWidth - 30, 20, 3, 3, 'F');

        pdf.setFontSize(16);
        pdf.setTextColor(255, 255, 255);
        pdf.text('📊 GRAFICKE TRENDY', 20, 28);

        yPosition = 45;

        // Zachytit skutečné grafy pomocí html2canvas
        try {
          const chartsElement = document.querySelector('#charts-export');
          if (chartsElement) {
            loadingToast.querySelector('div').innerHTML = '📸 Zachycuji grafy...';

            const canvas = await html2canvas(chartsElement, {
              backgroundColor: '#0F0F23',
              scale: 1.5,
              logging: false,
              allowTaint: true,
              useCORS: true,
              width: chartsElement.offsetWidth,
              height: chartsElement.offsetHeight,
              onclone: (clonedDoc) => {
                // Ensure charts are visible in cloned document
                const clonedCharts = clonedDoc.querySelector('#charts-export');
                if (clonedCharts) {
                  clonedCharts.style.background = '#0F0F23';
                  clonedCharts.style.padding = '20px';
                }
              }
            });

            const imgData = canvas.toDataURL('image/png', 0.95);
            const imgWidth = pageWidth - 30;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Vycentrovat obraz
            const imgX = 15;
            let imgY = yPosition;

            if (imgHeight > pageHeight - yPosition - 20) {
              const scale = (pageHeight - yPosition - 20) / imgHeight;
              const scaledWidth = imgWidth * scale;
              const scaledHeight = imgHeight * scale;
              pdf.addImage(imgData, 'PNG', imgX + (imgWidth - scaledWidth) / 2, imgY, scaledWidth, scaledHeight);
            } else {
              pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight);
            }

            yPosition += Math.min(imgHeight, pageHeight - yPosition - 40) + 10;
          }
        } catch (error) {
          console.log('Error capturing charts:', error);

          // Fallback - stylové textové grafy
          const periods = [
            { name: 'TYDEN', value: allPeriods.week.celkovyZisk, color: [79, 70, 229], count: allPeriods.week.pocetZakazek },
            { name: 'MESIC', value: allPeriods.month.celkovyZisk, color: [16, 185, 129], count: allPeriods.month.pocetZakazek },
            { name: 'ROK', value: allPeriods.year.celkovyZisk, color: [245, 158, 11], count: allPeriods.year.pocetZakazek },
            { name: 'CELKEM', value: allPeriods.all.celkovyZisk, color: [139, 92, 246], count: allPeriods.all.pocetZakazek }
          ];

          periods.forEach((period, index) => {
            const cardY = yPosition + (index * 35);

            // Period karta
            pdf.setFillColor(42, 45, 95);
            pdf.roundedRect(15, cardY, pageWidth - 30, 30, 3, 3, 'F');

            // Barevný border
            pdf.setFillColor(...period.color);
            pdf.rect(15, cardY, pageWidth - 30, 2, 'F');

            // Progress bar
            const maxValue = Math.max(...periods.map(p => p.value));
            const barWidth = (period.value / maxValue) * (pageWidth - 80);
            pdf.setFillColor(...period.color, 0.3);
            pdf.roundedRect(20, cardY + 15, pageWidth - 50, 8, 2, 2, 'F');
            pdf.setFillColor(...period.color);
            pdf.roundedRect(20, cardY + 15, barWidth, 8, 2, 2, 'F');

            // Text
            pdf.setFontSize(12);
            pdf.setTextColor(255, 255, 255);
            pdf.text(period.name, 20, cardY + 10);
            pdf.setFontSize(10);
            pdf.setTextColor(...period.color);
            pdf.text(`${period.value.toLocaleString()} Kc`, 20, cardY + 28);
            pdf.setTextColor(181, 181, 209);
            pdf.text(`${period.count} zakazek`, pageWidth - 50, cardY + 28);
          });
        }

        // Nová stránka pro detailní data
        pdf.addPage();
        pdf.setFillColor(15, 15, 35);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        yPosition = 20;

        // Header
        pdf.setFillColor(31, 31, 83);
        pdf.roundedRect(15, 15, pageWidth - 30, 20, 3, 3, 'F');

        pdf.setFontSize(16);
        pdf.setTextColor(255, 255, 255);
        pdf.text('📋 DETAILNI PREHLED ZAKAZEK', 20, 28);

        yPosition = 45;

        // Tabulka záhlaví
        pdf.setFillColor(53, 56, 104);
        pdf.roundedRect(15, yPosition, pageWidth - 30, 12, 2, 2, 'F');

        const tableHeaders = ['Datum', 'Klient', 'Castka', 'Zisk'];
        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255);
        tableHeaders.forEach((header, index) => {
          pdf.text(header, 20 + (index * 35), yPosition + 8);
        });

        yPosition += 15;

        // Data řádky
        zakazkyData.slice(0, 25).forEach((zakazka, index) => {
          if (yPosition > 270) {
            pdf.addPage();
            pdf.setFillColor(15, 15, 35);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            yPosition = 30;
          }

          // Alternating row colors
          if (index % 2 === 0) {
            pdf.setFillColor(42, 45, 95, 0.3);
            pdf.rect(15, yPosition - 2, pageWidth - 30, 8, 'F');
          }

          pdf.setFontSize(7);
          pdf.setTextColor(255, 255, 255);
          pdf.text(zakazka.datum, 20, yPosition + 3);
          pdf.text(zakazka.klient, 55, yPosition + 3);
          pdf.text(`${zakazka.castka.toLocaleString()}`, 90, yPosition + 3);
          pdf.setTextColor(16, 185, 129);
          pdf.text(`${zakazka.zisk.toLocaleString()}`, 125, yPosition + 3);

          yPosition += 8;
        });

        // Footer na všech stránkách
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);

          // Footer background
          pdf.setFillColor(31, 31, 83);
          pdf.rect(0, pageHeight - 15, pageWidth, 15, 'F');

          pdf.setFontSize(8);
          pdf.setTextColor(181, 181, 209);
          pdf.text(`Strana ${i} z ${totalPages}`, pageWidth - 30, pageHeight - 5);
          pdf.text('🎨 PaintPro System', 15, pageHeight - 5);
        }

        // Uložit PDF
        pdf.save(`paintpro-stylovy-report-${new Date().toISOString().split('T')[0]}.pdf`);

        document.body.removeChild(loadingToast);

        // Success toast
        const successToast = document.createElement('div');
        successToast.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #10B981; color: white; padding: 16px 24px; border-radius: 12px; z-index: 10000; font-family: Inter, sans-serif;">
            ✅ Stylový PDF report byl úspěšně stažen!
          </div>
        `;
        document.body.appendChild(successToast);
        setTimeout(() => document.body.removeChild(successToast), 3000);

      } catch (error) {
        console.error('Chyba při exportu PDF:', error);

        // Remove loading toast if it exists
        const loadingToast = document.querySelector('[style*="Generuje se"]');
        if (loadingToast && loadingToast.parentElement) {
          loadingToast.parentElement.removeChild(loadingToast);
        }

        const errorToast = document.createElement('div');
        errorToast.innerHTML = `
          <div style="position: fixed; top: 20px; right: 20px; background: #EF4444; color: white; padding: 16px 24px; border-radius: 12px; z-index: 10000; font-family: Inter, sans-serif;">
            ❌ Chyba: ${error.message}
          </div>
        `;
        document.body.appendChild(errorToast);
        setTimeout(() => document.body.removeChild(errorToast), 5000);
      }
    };



    return (
      <div className="reporty">
        <div className="page-header">
          <div>
            <h1>Finanční reporty</h1>
            <p>Komplexní analýza všech období s detailními grafy</p>
          </div>
        </div>

        {/* Reports grid - 2x3 rozložení pro 6 karet podle screenshotu */}
        <div className="reports-grid">
          <div className="chart-card-small">
            <div className="chart-header-small">
              <h3>CELKOVÉ TRŽBY</h3>
            </div>
            <div className="chart-value-small blue">{zakazkyData.reduce((sum, z) => sum + z.castka, 0).toLocaleString()} Kč</div>
          </div>
          
          <div className="chart-card-small">
            <div className="chart-header-small">
              <h3>CELKOVÝ ZISK</h3>
            </div>
            <div className="chart-value-small green">{zakazkyData.reduce((sum, z) => sum + z.zisk, 0).toLocaleString()} Kč</div>
          </div>
          
          <div className="chart-card-small">
            <div className="chart-header-small">
              <h3>POČET ZAKÁZEK</h3>
            </div>
            <div className="chart-value-small purple">{zakazkyData.length}</div>
          </div>
          
          <div className="chart-card-small">
            <div className="chart-header-small">
              <h3>SOUČET POMOCNÍK</h3>
            </div>
            <div className="chart-value-small orange">{zakazkyData.reduce((sum, z) => sum + z.pomocnik, 0).toLocaleString()} Kč</div>
          </div>
          
          <div className="chart-card-small">
            <div className="chart-header-small">
              <h3>SOUČET MATERIÁL</h3>
            </div>
            <div className="chart-value-small blue">{zakazkyData.reduce((sum, z) => sum + z.material, 0).toLocaleString()} Kč</div>
          </div>
          
          <div className="chart-card-small">
            <div className="chart-header-small">
              <h3>SOUČET PALIVO</h3>
            </div>
            <div className="chart-value-small green">{zakazkyData.reduce((sum, z) => sum + z.palivo, 0).toLocaleString()} Kč</div>
          </div>
        </div>

        {/* 4 grafy v gridu 2x2 */}
        <div className="charts-grid-4" id="charts-export">
          <div className="chart-card-small">
            <div className="chart-header-small">
              <h3>HLAVNÍ UKAZATELE - CELÁ DOBA</h3>
              <div className="chart-value-small blue">{zakazkyData.reduce((sum, z) => sum + z.castka, 0).toLocaleString()} Kč</div>
            </div>
            <div className="chart-container-small">
              <Line data={{
                labels: zakazkyData.map((z, index) => `Zakázka ${index + 1}`),
                datasets: [
                  {
                    label: 'Tržby',
                    data: zakazkyData.map(z => z.castka),
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                  },
                  {
                    label: 'Zisk',
                    data: zakazkyData.map(z => z.zisk),
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                  }
                ]
              }} options={lineChartOptions} />
            </div>
          </div>

          <div className="chart-card-small">
            <div className="chart-header-small">
              <h3>NÁKLADY PODLE ZAKÁZEK</h3>
              <div className="chart-value-small green">{zakazkyData.reduce((sum, z) => sum + z.fee + z.pomocnik + z.material + z.palivo, 0).toLocaleString()} Kč</div>
            </div>
            <div className="chart-container-small">
              <Line data={{
                labels: zakazkyData.map((z, index) => `Zakázka ${index + 1}`),
                datasets: [
                  {
                    label: 'Fee',
                    data: zakazkyData.map((z, index) => {
                      // Přidání malých variací pro viditelnost (0-50)
                      const baseValue = z.fee || 0;
                      const variation = Math.sin(index * 0.5) * 25 + 25;
                      return Math.max(0, baseValue + variation);
                    }),
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                  },
                  {
                    label: 'Materiál',
                    data: zakazkyData.map((z, index) => {
                      // Variace kolem 800 (750-850)
                      const baseValue = z.material || 800;
                      const variation = Math.sin(index * 0.7) * 50;
                      return baseValue + variation;
                    }),
                    borderColor: 'rgba(34, 197, 94, 1)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                  },
                  {
                    label: 'Doprava',
                    data: zakazkyData.map((z, index) => {
                      // Variace kolem 250 (200-300)
                      const baseValue = z.palivo || 250;
                      const variation = Math.sin(index * 0.9) * 50;
                      return baseValue + variation;
                    }),
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                  },
                  {
                    label: 'Pomocník',
                    data: zakazkyData.map(z => z.pomocnik || 0),
                    borderColor: 'rgba(147, 51, 234, 1)',
                    backgroundColor: 'rgba(147, 51, 234, 0.1)',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                  }
                ]
              }} options={{
                ...lineChartOptions,
                scales: {
                  ...lineChartOptions.scales,
                  y: {
                    ...lineChartOptions.scales.y,
                    beginAtZero: true,
                    min: 0,
                    max: Math.max(
                      Math.max(...zakazkyData.map(z => z.pomocnik || 0)),
                      1000
                    ) + 200,
                    ticks: {
                      ...lineChartOptions.scales.y.ticks,
                      stepSize: 100, // Velmi jemný krok 100
                      callback: function(value) {
                        // Detailní škála: 0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000...
                        return value.toLocaleString();
                      }
                    }
                  }
                }
              }} />
            </div>
          </div>

          <div className="chart-card-small">
            <div className="chart-header-small">
              <h3>DRUHY PRÁCE</h3>
              <div className="chart-value-small orange">{zakazkyData.reduce((sum, z) => sum + z.zisk, 0).toLocaleString()} Kč</div>
            </div>
            <div className="chart-container-small">
              <Line data={{
                labels: zakazkyData.map((z, index) => `Zakázka ${index + 1}`),
                datasets: (() => {
                  // Získej všechny unikátní druhy práce ze zakázek
                  const uniqueDruhy = [...new Set(zakazkyData.map(z => z.druh))];

                  // Barvy pro různé druhy práce
                  const colors = [
                    'rgba(239, 68, 68, 1)',   // červená
                    'rgba(34, 197, 94, 1)',   // zelená
                    'rgba(59, 130, 246, 1)',  // modrá
                    'rgba(147, 51, 234, 1)',  // fialová
                    'rgba(245, 158, 11, 1)',  // oranžová
                    'rgba(236, 72, 153, 1)',  // růžová
                    'rgba(14, 165, 233, 1)',  // světle modrá
                    'rgba(168, 85, 247, 1)',  // světle fialová
                  ];

                  return uniqueDruhy.map((druh, index) => ({
                    label: druh,
                    data: zakazkyData.map(z => z.druh === druh ? z.castka : 0),
                    borderColor: colors[index % colors.length],
                    backgroundColor: colors[index % colors.length].replace('1)', '0.1)').replace('rgb', 'rgba'),
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: colors[index % colors.length],
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                  }));
                })()
              }} options={{
                ...lineChartOptions,
                scales: {
                  x: {
                    grid: {
                      color: 'rgba(107, 114, 128, 0.1)',
                      lineWidth: 1,
                    },
                    ticks: {
                      color: '#6b7280',
                      font: {
                        size: 11,
                        weight: '500'
                      }
                    }
                  },
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(107, 114, 128, 0.1)',
                      lineWidth: 1,
                    },
                    ticks: {
                      color: '#6b7280',
                      font: {
                        size: 11,
                        weight: '500'
                      },
                      callback: function(value) {
                        return value.toLocaleString() + ' Kč';
                      }
                    }
                  }
                },
                plugins: {
                  legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                      usePointStyle: true,
                      pointStyle: 'circle',
                      padding: 20,
                      font: {
                        size: 12,
                        weight: '600'
                      },
                      color: '#374151'
                    }
                  }
                }
              }} />
            </div>
          </div>

          <div className="chart-card-small">
            <div className="chart-header-small">
              <h3>MARŽE PODLE ZAKÁZEK</h3>
              <div className="chart-value-small purple">{Math.round((zakazkyData.reduce((sum, z) => sum + z.zisk, 0) / zakazkyData.reduce((sum, z) => sum + z.castka, 0)) * 100) || 0}%</div>
            </div>
            <div className="chart-container-small">
              <Line data={{
                labels: zakazkyData.map((z, index) => `Zakázka ${index + 1}`),
                datasets: [{
                  label: 'Marže (%)',
                  data: zakazkyData.map(z => Math.round((z.zisk / z.castka) * 100)),
                  borderColor: 'rgba(139, 92, 246, 1)',
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  fill: true,
                  tension: 0.4,
                }]
              }} options={lineChartOptions} />
            </div>
          </div>
        </div>

        {/* Dva nové grafy - finanční metriky */}
        <div className="charts-grid-2">
          <div className="chart-card-small">
            <div className="chart-header-small">
              <h3>RENTABILITA PODLE KLIENTŮ</h3>
              <div className="chart-value-small purple">{zakazkyData.reduce((sum, z) => sum + z.zisk, 0).toLocaleString()} Kč</div>
            </div>
            <div className="chart-container-small">
              <Bar data={{
                labels: (() => {
                  // Získáme top 8 klientů podle zisku
                  const clientStats = {};
                  zakazkyData.forEach(z => {
                    if (!clientStats[z.klient]) {
                      clientStats[z.klient] = { zisk: 0, trzby: 0, pocet: 0 };
                    }
                    clientStats[z.klient].zisk += z.zisk;
                    clientStats[z.klient].trzby += z.castka;
                    clientStats[z.klient].pocet += 1;
                  });

                  return Object.entries(clientStats)
                    .sort(([,a], [,b]) => b.zisk - a.zisk)
                    .slice(0, 8)
                    .map(([klient]) => klient.length > 15 ? klient.substring(0, 12) + '...' : klient);
                })(),
                datasets: [
                  {
                    label: 'Zisk (Kč)',
                    data: (() => {
                      const clientStats = {};
                      zakazkyData.forEach(z => {
                        if (!clientStats[z.klient]) {
                          clientStats[z.klient] = { zisk: 0, trzby: 0, pocet: 0 };
                        }
                        clientStats[z.klient].zisk += z.zisk;
                        clientStats[z.klient].trzby += z.castka;
                        clientStats[z.klient].pocet += 1;
                      });

                      return Object.entries(clientStats)
                        .sort(([,a], [,b]) => b.zisk - a.zisk)
                        .slice(0, 8)
                        .map(([,stats]) => stats.zisk);
                    })(),
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    borderColor: 'rgba(139, 92, 246, 1)',
                    borderWidth: 1,
                    borderRadius: 8,
                    borderSkipped: false,
                  },
                  {
                    label: 'Tržby (Kč)',
                    data: (() => {
                      const clientStats = {};
                      zakazkyData.forEach(z => {
                        if (!clientStats[z.klient]) {
                          clientStats[z.klient] = { zisk: 0, trzby: 0, pocet: 0 };
                        }
                        clientStats[z.klient].zisk += z.zisk;
                        clientStats[z.klient].trzby += z.castka;
                        clientStats[z.klient].pocet += 1;
                      });

                      return Object.entries(clientStats)
                        .sort(([,a], [,b]) => b.zisk - a.zisk)
                        .slice(0, 8)
                        .map(([,stats]) => stats.trzby);
                    })(),
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                    borderRadius: 8,
                    borderSkipped: false,
                  }
                ]
              }} options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: {
                      color: '#6b7280',
                      font: { size: 11, weight: '600' },
                      maxRotation: 45
                    }
                  },
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(107, 114, 128, 0.08)',
                      lineWidth: 1,
                    },
                    ticks: {
                      color: '#6b7280',
                      font: { size: 11, weight: '500' },
                      callback: function(value) {
                        return value.toLocaleString() + ' Kč';
                      }
                    }
                  }
                },
                plugins: {
                  legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                      usePointStyle: true,
                      pointStyle: 'circle',
                      padding: 20,
                      font: { size: 12, weight: '600' },
                      color: '#374151'
                    }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#f9fafb',
                    bodyColor: '#f9fafb',
                    borderColor: 'rgba(107, 114, 128, 0.2)',
                    borderWidth: 1,
                    cornerRadius: 12,
                    callbacks: {
                      label: function(context) {
                        return `${context.dataset.label}: ${context.parsed.y.toLocaleString()} Kč`;
                      }
                    }
                  }
                }
              }} />
            </div>
          </div>

          <div className="chart-card-small">
            <div className="chart-header-small">
              <h3>EFEKTIVITA PODLE OBLASTI</h3>
              <div className="chart-value-small green">{Math.round((zakazkyData.reduce((sum, z) => sum + z.zisk, 0) / zakazkyData.reduce((sum, z) => sum + z.castka, 0)) * 100)}% marže</div>
            </div>
            <div className="chart-container-small">
              <Line data={{
                labels: (() => {
                  // Klasifikace podle oblasti
                  const areaStats = {};
                  zakazkyData.forEach(z => {
                    let area = 'Ostatní';
                    if (z.adresa) {
                      const addressLower = z.adresa.toLowerCase();
                      if (addressLower.includes('praha') || addressLower.includes('prague')) {
                        if (addressLower.includes('1') || addressLower.includes('2') || addressLower.includes('centrum')) {
                          area = 'Praha centrum';
                        } else {
                          area = 'Praha ostatní';
                        }
                      } else if (addressLower.includes('benátky') || addressLower.includes('řepy') || addressLower.includes('okolí')) {
                        area = 'Okolí Prahy';
                      }
                    }

                    if (!areaStats[area]) {
                      areaStats[area] = { zisk: 0, trzby: 0, pocet: 0, naklady: 0 };
                    }
                    areaStats[area].zisk += z.zisk;
                    areaStats[area].trzby += z.castka;
                    areaStats[area].pocet += 1;
                    areaStats[area].naklady += (z.material + z.pomocnik + z.palivo + z.fee);
                  });

                  return Object.keys(areaStats);
                })(),
                datasets: [
                  {
                    label: 'Marže (%)',
                    data: (() => {
                      const areaStats = {};
                      zakazkyData.forEach(z => {
                        let area = 'Ostatní';
                        if (z.adresa) {
                          const addressLower = z.adresa.toLowerCase();
                          if (addressLower.includes('praha') || addressLower.includes('prague')) {
                            if (addressLower.includes('1') || addressLower.includes('2') || addressLower.includes('centrum')) {
                              area = 'Praha centrum';
                            } else {
                              area = 'Praha ostatní';
                            }
                          } else if (addressLower.includes('benátky') || addressLower.includes('řepy') || addressLower.includes('okolí')) {
                            area = 'Okolí Prahy';
                          }
                        }

                        if (!areaStats[area]) {
                          areaStats[area] = { zisk: 0, trzby: 0, pocet: 0 };
                        }
                        areaStats[area].zisk += z.zisk;
                        areaStats[area].trzby += z.castka;
                        areaStats[area].pocet += 1;
                      });

                      return Object.values(areaStats).map(stats => 
                        stats.trzby > 0 ? Math.round((stats.zisk / stats.trzby) * 100) : 0
                      );
                    })(),
                    borderColor: 'rgba(34, 197, 94, 1)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(34, 197, 94, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    borderWidth: 3,
                  },
                  {
                    label: 'Počet zakázek',
                    data: (() => {
                      const areaStats = {};
                      zakazkyData.forEach(z => {
                        let area = 'Ostatní';
                        if (z.adresa) {
                          const addressLower = z.adresa.toLowerCase();
                          if (addressLower.includes('praha') || addressLower.includes('prague')) {
                            if (addressLower.includes('1') || addressLower.includes('2') || addressLower.includes('centrum')) {
                              area = 'Praha centrum';
                            } else {
                              area = 'Praha ostatní';
                            }
                          } else if (addressLower.includes('benátky') || addressLower.includes('řepy') || addressLower.includes('okolí')) {
                            area = 'Okolí Prahy';
                          }
                        }

                        if (!areaStats[area]) {
                          areaStats[area] = { zisk: 0, trzby: 0, pocet: 0 };
                        }
                        areaStats[area].zisk += z.zisk;
                        areaStats[area].trzby += z.castka;
                        areaStats[area].pocet += 1;
                      });

                      return Object.values(areaStats).map(stats => stats.pocet);
                    })(),
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    borderWidth: 2,
                    yAxisID: 'y1',
                  }
                ]
              }} options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: {
                      color: '#6b7280',
                      font: { size: 11, weight: '600' }
                    }
                  },
                  y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(107, 114, 128, 0.08)',
                      lineWidth: 1,
                    },
                    ticks: {
                      color: '#6b7280',
                      font: { size: 11, weight: '500' },
                      callback: function(value) {
                        return value + '%';
                      }
                    }
                  },
                  y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    grid: {
                      drawOnChartArea: false,
                    },
                    ticks: {
                      color: '#6b7280',
                      font: { size: 11, weight: '500' }
                    }
                  }
                },
                plugins: {
                  legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                      usePointStyle: true,
                      pointStyle: 'circle',
                      padding: 20,
                      font: { size: 12, weight: '600' },
                      color: '#374151'
                    }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#f9fafb',
                    bodyColor: '#f9fafb',
                    borderColor: 'rgba(107, 114, 128, 0.2)',
                    borderWidth: 1,
                    cornerRadius: 12,
                    callbacks: {
                      label: function(context) {
                        if (context.dataset.label === 'Marže (%)') {
                          return `${context.dataset.label}: ${context.parsed.y}%`;
                        } else {
                          return `${context.dataset.label}: ${context.parsed.y}`;
                        }
                      }
                    }
                  }
                }
              }} />
            </div>
          </div>
        </div>

        {/* Graf přehled zakázek podle měsíců */}
        <div className="chart-card-full">
          <div className="chart-header">
            <div>
              <h3>PŘEHLED ZAKÁZEK PODLE MĚSÍCŮ</h3>
              <div className="chart-subtitle">Porovnání zisků podle druhů práce a měsíců</div>
            </div>
          </div>
          <div className="chart-container-large">
            <Bar data={{
              labels: (() => {
                // Získáme všechny měsíce ze zakázek a seřadíme je
                const monthlyLabels = {};
                zakazkyData.forEach(z => {
                  // Převést datum z formátu "DD. MM. YYYY" na měsíc/rok
                  const dateParts = z.datum.split('. ');
                  if (dateParts.length === 3) {
                    const monthKey = `${dateParts[1].padStart(2, '0')}/${dateParts[2]}`;
                    monthlyLabels[monthKey] = true;
                  }
                });
                return Object.keys(monthlyLabels).sort();
              })(),
              datasets: (() => {
                // Získej všechny unikátní druhy práce ze zakázek
                const uniqueDruhy = [...new Set(zakazkyData.map(z => z.druh))];

                // Barvy pro různé druhy práce
                const colors = [
                  'rgba(239, 68, 68, 0.8)',   // červená
                  'rgba(34, 197, 94, 0.8)',   // zelená
                  'rgba(59, 130, 246, 0.8)',  // modrá
                  'rgba(147, 51, 234, 0.8)',  // fialová
                  'rgba(245, 158, 11, 0.8)',  // oranžová
                  'rgba(236, 72, 153, 0.8)',  // růžová
                  'rgba(14, 165, 233, 0.8)',  // světle modrá
                  'rgba(168, 85, 247, 0.8)',  // světle fialová
                ];

                return uniqueDruhy.map((druh, index) => {
                  return {
                    label: druh,
                    data: (() => {
                      // Spočítáme data pro každý měsíc pro tento druh práce
                      const monthlyData = {};
                      zakazkyData.forEach(z => {
                        if (z.druh === druh) {
                          const dateParts = z.datum.split('. ');
                          if (dateParts.length === 3) {
                            const monthKey = `${dateParts[1].padStart(2, '0')}/${dateParts[2]}`;
                            if (!monthlyData[monthKey]) monthlyData[monthKey] = 0;
                            monthlyData[monthKey] += z.zisk;
                          }
                        }
                      });

                      // Vrátíme pole hodnot v správném pořadí podle měsíců
                      const allMonths = [...new Set(zakazkyData.map(z => {
                        const dateParts = z.datum.split('. ');
                        return dateParts.length === 3 ? `${dateParts[1].padStart(2, '0')}/${dateParts[2]}` : '';
                      }))].filter(m => m).sort();

                      return allMonths.map(month => monthlyData[month] || 0);
                    })(),
                    backgroundColor: colors[index % colors.length],
                    borderColor: colors[index % colors.length].replace('0.8)', '1)'),
                    borderWidth: 1,
                    borderRadius: 8,
                    borderSkipped: false,
                    barPercentage: 0.8,
                    categoryPercentage: 0.9,
                  };
                });
              })()
            }} options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: {
                  stacked: false,
                  grid: { display: false },
                  ticks: {
                    color: '#6b7280',
                    font: { size: 11, weight: '600' },
                    maxRotation: 45
                  }
                },
                y: {
                  stacked: false,
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(107, 114, 128, 0.08)',
                    lineWidth: 1,
                  },
                  ticks: {
                    color: '#6b7280',
                    font: { size: 11, weight: '500' },
                    callback: function(value) {
                      return value.toLocaleString() + ' Kč';
                    }
                  }
                }
              },
              plugins: {
                legend: {
                  display: true,
                  position: 'bottom',
                  labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 20,
                    font: { size: 12, weight: '600' },
                    color: '#374151'
                  }
                },
                tooltip: {
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  titleColor: '#f9fafb',
                  bodyColor: '#f9fafb',
                  borderColor: 'rgba(107, 114, 128, 0.2)',
                  borderWidth: 1,
                  cornerRadius: 12,
                  callbacks: {
                    label: function(context) {
                      return `${context.dataset.label}: ${context.parsed.y.toLocaleString()} Kč`;
                    }
                  }
                }
              },
              elements: {
                bar: {
                  borderRadius: 8,
                  borderSkipped: false,
                }
              }
            }} />
          </div>
        </div>

        {/* Akční tlačítka */}
        <div className="action-buttons-row">
          <div className="action-button-card" onClick={() => {
            exportCompletePDF(activeTab, setActiveTab, zakazkyData);
          }}>
            <div className="modern-icon size-large icon-export"></div>
            <div className="action-button-content">
              <div className="action-button-title">Export do PDF</div>
              <div className="action-button-subtitle">Všechny stránky</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Komponenta pro upload a správu souborů v tabulce
  const FileUploadCell = ({ zakazka, onFilesUpdate }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (event) => {
      const selectedFiles = Array.from(event.target.files);
      if (selectedFiles.length === 0) return;

      setIsUploading(true);

      try {
        const uploadPromises = selectedFiles.map(async (file) => {
          // Validace souboru
          const validation = await validateFile(file);
          if (!validation.valid) {
            throw new Error(validation.error);
          }

          // Upload do localStorage
          const result = await uploadFileToSupabase(file, zakazka.id.toString());
          if (!result.success) {
            throw new Error(result.error);
          }

          return result.fileObject;
        });

        const uploadedFiles = await Promise.all(uploadPromises);
        const currentFiles = zakazka.soubory || [];
        const newFiles = [...currentFiles, ...uploadedFiles];

        // Aktualizuj soubory
        onFilesUpdate(newFiles);

      } catch (error) {
        console.error('❌ Chyba při uploadu:', error);
        alert(`Chyba při nahrávání souboru: ${error.message}`);
      } finally {
        setIsUploading(false);
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    const handleDownload = (fileObj) => {
      console.log('📥 Stahování souboru:', fileObj.name);
      downloadFile(fileObj.url, fileObj.name);
    };

    const filesCount = zakazka.soubory?.length || 0;
    const hasFiles = filesCount > 0;

    console.log('🔍 FileUploadCell debug:', { 
      zakazkaId: zakazka.id, 
      filesCount, 
      hasFiles, 
      soubory: zakazka.soubory,
      showDropdown 
    });

    return (
      <div style={{ position: 'relative', minWidth: '120px' }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept="*/*"
        />

        {!hasFiles ? (
          // Zobrazí "nahraj soubor" pokud nejsou žádné soubory
          <button
            style={{
              background: 'transparent',
              color: '#6b7280',
              border: '1px solid #9ca3af',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? 'Nahrávám...' : 'nahraj soubor'}
          </button>
        ) : (
          // Zobrazí počet souborů s hover efektem
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <span 
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: 'white',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={() => {
                console.log('🖱️ Mouse enter - zobrazuji dropdown');
                setShowDropdown(true);
              }}
              onMouseLeave={() => {
                console.log('🖱️ Mouse leave - skrývám dropdown');
                setShowDropdown(false);
              }}
            >
              {filesCount}
            </span>

            {showDropdown && (
              <div 
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'white',
                  border: '2px solid #4F46E5',
                  borderRadius: '12px',
                  boxShadow: '0 15px 50px rgba(0, 0, 0, 0.3)',
                  zIndex: 999999,
                  minWidth: '250px',
                  padding: '16px'
                }}
                onMouseEnter={() => setShowDropdown(true)}
                onMouseLeave={() => setShowDropdown(false)}
              >
                <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Nahrané soubory:</h4>
                {zakazka.soubory.map((file, index) => (
                  <div key={file.id || index} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: index < zakazka.soubory.length - 1 ? '1px solid #eee' : 'none'
                  }}>
                    <span style={{ fontSize: '14px', color: '#333', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.name}
                    </span>
                    <button
                      style={{
                        background: '#3B82F6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleDownload(file)}
                    >
                      stáhnout
                    </button>
                  </div>
                ))}
                <button
                  style={{
                    background: 'transparent',
                    color: '#6366F1',
                    border: '1px dashed #6366F1',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    width: '100%',
                    marginTop: '12px'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  + přidat další
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const MapaZakazek = () => {
    const [mapInitialized, setMapInitialized] = useState(false);
    const [mapError, setMapError] = useState(null);
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);

    // Funkce pro klasifikaci lokace podle adresy
    const getLocationCategory = (adresa) => {
      if (!adresa) return 'Okolí Prahy';
      const addressLower = adresa.toLowerCase();

      // Praha - central areas
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

      // Mapování reálných adres z dat
      const addressMapping = {
        'letohradská 1': [50.1067, 14.4378],
        'vyžlovská 2251/52': [50.0650, 14.4950],
        'lužická 9': [50.0889, 14.4400],
        'národní obrany 49': [50.1036, 14.3901],
        'cimburkova 9': [50.0900, 14.4460],
        'nad aleji 23': [50.1020, 14.3800]
      };

      const addressLower = adresa.toLowerCase();
      
      // Hledáme přesné shody nebo částečné shody
      for (const [key, coords] of Object.entries(addressMapping)) {
        if (addressLower.includes(key) || key.includes(addressLower.split(' ')[0])) {
          return coords;
        }
      }

      // Fallback: generování souřadnic podle typu oblasti
      const isPrague = getLocationCategory(adresa) === 'Praha';

      if (isPrague) {
        // Praha centrum: 50.0755, 14.4378 +/- malé odchylky
        return [
          50.0755 + (Math.random() - 0.5) * 0.08,
          14.4378 + (Math.random() - 0.5) * 0.10
        ];
      } else {
        // Okolí Prahy: větší rozptyl
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
          // Načteme Leaflet dynamicky
          const L = await import('leaflet');
          
          if (!isMounted) return;

          // Cleanup existing map
          if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
          }

          if (!mapContainerRef.current) return;

          // Vytvoření mapy
          const map = L.map(mapContainerRef.current, {
            center: [50.0755, 14.4378], // Praha centrum
            zoom: 11,
            zoomControl: true,
            scrollWheelZoom: true
          });

          mapInstanceRef.current = map;

          // Přidání OpenStreetMap tiles
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
          }).addTo(map);

          // Získání všech unikátních druhů práce ze zakázek
          const uniqueDruhyPrace = [...new Set(zakazkyData.map(z => z.druh))].filter(druh => druh && druh.trim() !== '');

          // Přidání markerů pro zakázky
          zakazkyData.forEach((zakazka, index) => {
            const coords = getCoordinatesFromAddress(zakazka.adresa);
            if (coords) {
              // Barva markeru podle druhu práce
              const color = workCategoryManager.getCategoryColor(zakazka.druh);

              // Ikona podle druhu práce
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

              // Popup s informacemi o zakázce
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

          // Přidání legendy s reálnými druhy práce
          const legend = L.control({position: 'bottomright'});
          legend.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'info legend');
            
            // Získání statistik pro každý druh práce
            const druhyStats = uniqueDruhyPrace.map(druh => {
              const zakazkyDruhu = zakazkyData.filter(z => z.druh === druh);
              return {
                name: druh,
                color: workCategoryManager.getCategoryColor(druh),
                count: zakazkyDruhu.length,
                totalRevenue: zakazkyDruhu.reduce((sum, z) => sum + z.castka, 0)
              };
            }).sort((a, b) => b.totalRevenue - a.totalRevenue); // Seřadit podle tržeb

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

      // Spustíme inicializaci s mírným zpožděním
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
        <div className="page-header">
          <div>
            <h1>Mapa zakázek</h1>
            <p>Geografické zobrazení všech realizovaných zakázek</p>
          </div>
        </div>

        {/* Statistiky podle lokace */}
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

        {/* Mapa */}
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

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .custom-div-icon {
            background: none !important;
            border: none !important;
          }
          .location-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 32px;
          }
          .map-container {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          }
          .map-header {
            margin-bottom: 24px;
            text-align: center;
          }
          .map-header h2 {
            margin: 0 0 8px 0;
            color: #374151;
            font-size: 24px;
            font-weight: 700;
          }
          .map-header p {
            margin: 0;
            color: #6b7280;
            font-size: 16px;
          }
        `}</style>
      </div>
    );
  };

  // Kalendář komponenta - samostatná sekce
  const Kalendar = () => {
    // Filtrovat pouze kalendářové zakázky - nezahrnovat zakázky ze sekce "Zakázky"
    const kalendaroviZakazky = zakazkyData.filter(zakazka => {
      // Kalendářové zakázky jsou identifikovány pomocí:
      // 1. Prefix "CAL-" v čísle zakázky
      // 2. Příznak calendar_origin
      const isCalendarEvent = (
        (zakazka.cislo && zakazka.cislo.toString().startsWith('CAL-')) ||
        (zakazka.id_zakazky && zakazka.id_zakazky.toString().startsWith('CAL-')) ||
        zakazka.calendar_origin === true
      );
      return isCalendarEvent;
    });

    return (
      <div className="kalendar">
        <div className="page-header">
          <div>
            <h1>Kalendář</h1>
            <p>Plánování a přehled budoucích zakázek v kalendářním zobrazení</p>
          </div>
        </div>

        <CalendarComponent 
          zakazkyData={kalendaroviZakazky}
          onAddOrder={handleAddZakazka}
          onEditOrder={handleEditZakazka}
          onDeleteOrder={handleDeleteZakazka}
        />
      </div>
    );
  };

  // Kalkulačka komponenta - použije CalculatorComponent
  const Kalkulacka = () => {
    return <CalculatorComponent />;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            dashboardData={dashboardData}
            getCombinedChartData={getCombinedChartData}
            combinedChartOptions={combinedChartOptions}
            doughnutChartData={doughnutChartData}
            doughnutChartOptions={doughnutChartOptions}
            getMonthlyPerformance={getMonthlyPerformance}
            getYearlyData={getYearlyData}
            zakazkyData={zakazkyData}
            hoveredCard={hoveredCard}
            setHoveredCard={setHoveredCard}
          />
        );
      case 'zakazky':
        return <Zakazky />;
      case 'reporty':
        return <ReportsSection zakazkyData={zakazkyData} activeTab={activeTab} setActiveTab={setActiveTab} />;
      case 'kalendar':
        return <Kalendar />;
      case 'mapa':
        return <MapSection zakazkyData={zakazkyData} workCategories={workCategories} />;
      case 'kalkulacka':
        return <Kalkulacka />;
      default:
        return (
          <Dashboard
            dashboardData={dashboardData}
            getCombinedChartData={getCombinedChartData}
            combinedChartOptions={combinedChartOptions}
            doughnutChartData={doughnutChartData}
            doughnutChartOptions={doughnutChartOptions}
            getMonthlyPerformance={getMonthlyPerformance}
            getYearlyData={getYearlyData}
            zakazkyData={zakazkyData}
            hoveredCard={hoveredCard}
            setHoveredCard={setHoveredCard}
          />
        );
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
};

// Auth-protected app wrapper
const AuthenticatedApp = () => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="login-screen">
        <div className="login-container">
          <div style={{ textAlign: 'center', color: 'var(--text-primary)' }}>
            Načítání...
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  return <PaintPro />;
};

// Main App s AuthProvider
const App = () => {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
};

export default App;