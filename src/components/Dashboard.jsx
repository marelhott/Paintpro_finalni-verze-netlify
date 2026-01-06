
import React from 'react';
import { Chart } from 'react-chartjs-2';
import { Doughnut } from 'react-chartjs-2';
import { StatCard } from './index';

const Dashboard = ({
  dashboardData,
  getCombinedChartData,
  combinedChartOptions,
  doughnutChartData,
  doughnutChartOptions,
  getMonthlyPerformance,
  getYearlyData,
  zakazkyData,
  hoveredCard,
  setHoveredCard
}) => {
  return (
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
              <Chart type='bar' data={getCombinedChartData()} options={combinedChartOptions} />
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
                        style={{ width: `${month.revenuePercent}%` }}
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
                        style={{ width: `${month.ordersPercent}%` }}
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
            <div className="year-title">{new Date().getFullYear()}</div>
            <div className="progress-group">
              <div className="progress-item">
                <div className="progress-label">
                  <span>Celková cena</span>
                  <span className="progress-value">{getYearlyData().revenue.toLocaleString()} Kč</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill revenue"
                    style={{ width: `${getYearlyData().revenuePercent}%` }}
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
                    style={{ width: `${getYearlyData().ordersPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
