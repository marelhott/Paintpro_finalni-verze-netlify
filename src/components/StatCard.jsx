
import React from 'react';

const StatCard = React.memo(({ title, value, subtitle, iconClass, color, index, showCurrency = true, blueSubtitle = false, smallValueText = false, hoveredCard, setHoveredCard }) => (
  <div
    className={`stat-card ${hoveredCard === index ? 'hovered' : ''}`}
    onMouseEnter={() => setHoveredCard(index)}
    onMouseLeave={() => setHoveredCard(null)}
  >
    {/* Geometrické zdobení - tři průhledná kola */}
    <div className="geometric-decoration">
      <div className="circle circle-1"></div>
      <div className="circle circle-2"></div>
      <div className="circle circle-3"></div>
    </div>

    <div className="stat-header">
      <div className="stat-title">{title}</div>
    </div>
    <div className="stat-content">
      <div className="stat-value-row">
        <div className={`stat-icon ${iconClass}`}></div>
        <div className="stat-value-with-subtitle">
          {smallValueText ? (
            <div className="stat-value">
              {value} <span className="small-text">{subtitle}</span>
            </div>
          ) : (
            <>
              <div className="stat-value">{value}{showCurrency ? ' Kč' : ''}</div>
              {subtitle && (
                <div className={`stat-subtitle ${blueSubtitle ? 'blue' : ''}`}>{subtitle}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  </div>
));

StatCard.displayName = 'StatCard';

export default StatCard;
