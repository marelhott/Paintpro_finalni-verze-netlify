
import React, { useState, useEffect } from 'react';
import './CalculatorComponent.css';

const CalculatorComponent = () => {
  // Form data state - přesně podle HTML
  const [formData, setFormData] = useState({
    selectedWork: "Půdorys",
    totalArea: "",
    ceilingHeightForPrice: "250",
    repairType: "",
    material: "",
    furnitureMoving: "",
    covering: "",
    cleaning: ""
  });

  const [totalPrice, setTotalPrice] = useState(0);

  // Price calculation - přesně podle HTML logiky
  const calculatePrice = () => {
    let basePrice = 0;
    let calculatedPrice = 0;
    const area = Number(formData.totalArea) || 0;

    if (area > 0) {
      // Výpočet základní ceny
      if (formData.selectedWork === "Půdorys") {
        basePrice = area > 20 ? 3000 + (area - 20) * 140 : 3000;
      } else if (formData.selectedWork === "Stěna") {
        basePrice = area > 80 ? 3000 + (area - 80) * 40 : 3000;
      }

      calculatedPrice = basePrice;

      // Příplatek za výšku stropu (pouze pro půdorys)
      if (formData.selectedWork === "Půdorys") {
        if (formData.ceilingHeightForPrice === "350") {
          calculatedPrice += basePrice * 0.15; // +15%
        } else if (formData.ceilingHeightForPrice === "450") {
          calculatedPrice += basePrice * 0.3; // +30%
        }
      }

      // Přidání dalších nákladů
      if (formData.repairType === "Malé") calculatedPrice += basePrice * 0.17;
      if (formData.repairType === "Střední") calculatedPrice += basePrice * 0.35;
      if (formData.repairType === "Velké") calculatedPrice += basePrice * 0.8;

      if (formData.material === "Ano") calculatedPrice += basePrice * 0.2;
      if (formData.furnitureMoving === "Ano") calculatedPrice += basePrice * 0.12;
      if (formData.covering === "Ano") calculatedPrice += basePrice * 0.05;
      if (formData.cleaning === "Potřebuji") calculatedPrice += basePrice * 0.1;

      // Příplatek za úklid (vždy)
      calculatedPrice += basePrice * 0.2;

      // Zaokrouhlení
      calculatedPrice = Math.round(calculatedPrice);
    }

    setTotalPrice(calculatedPrice);
  };

  // Update price when form data changes
  useEffect(() => {
    calculatePrice();
  }, [formData]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="calculator-container">
      {/* Background Pattern */}
      <div className="calc-bg-pattern"></div>

      {/* Floating Elements */}
      <div className="calc-floating-elements">
        <div className="calc-floating-element-1"></div>
        <div className="calc-floating-element-2"></div>
        <div className="calc-floating-element-3"></div>
      </div>

      <div className="calc-container">
        <div className="calc-main-grid calc-two-column">
          {/* Form Column */}
          <div className="calc-left-column">

            {/* Typ plochy */}
            <div className="calc-card">
              <div className="calc-card-header">
                <div className="calc-card-icon">
                  <div className="modern-icon icon-home"></div>
                </div>
                <h2>Typ plochy</h2>
              </div>

              <div className="calc-form-grid-2">
                <label 
                  className={`calc-radio-option ${formData.selectedWork === "Půdorys" ? 'selected' : ''}`}
                  onClick={() => handleInputChange('selectedWork', 'Půdorys')}
                >
                  <input 
                    type="radio" 
                    name="selectedWork" 
                    value="Půdorys" 
                    checked={formData.selectedWork === "Půdorys"}
                    onChange={() => {}}
                  />
                  <div className="calc-radio-dot"></div>
                  <div className="calc-radio-content">
                    <div className="modern-icon icon-ruler"></div>
                    <div className="calc-radio-label">Podlahová plocha</div>
                  </div>
                </label>

                <label 
                  className={`calc-radio-option ${formData.selectedWork === "Stěna" ? 'selected' : ''}`}
                  onClick={() => handleInputChange('selectedWork', 'Stěna')}
                >
                  <input 
                    type="radio" 
                    name="selectedWork" 
                    value="Stěna" 
                    checked={formData.selectedWork === "Stěna"}
                    onChange={() => {}}
                  />
                  <div className="calc-radio-dot"></div>
                  <div className="calc-radio-content">
                    <div className="modern-icon icon-home"></div>
                    <div className="calc-radio-label">Stěnová plocha</div>
                  </div>
                </label>
              </div>

              <div className="calc-input-group">
                <label className="calc-input-label">Celková plocha (m²)</label>
                <input 
                  type="number" 
                  className="calc-input-field" 
                  placeholder="Zadejte plochu v m²"
                  value={formData.totalArea}
                  onChange={(e) => handleInputChange('totalArea', e.target.value)}
                />
              </div>

              {/* Ceiling Height Section - pouze pro půdorys */}
              {formData.selectedWork === "Půdorys" && (
                <div className="calc-ceiling-section">
                  <label className="calc-ceiling-label">Výška stropu (ovlivňuje cenu)</label>
                  <div className="calc-ceiling-options">
                    {[
                      { value: "250", label: "250 cm", desc: "standardní" },
                      { value: "350", label: "350 cm", desc: "vyšší" },
                      { value: "450", label: "450 cm", desc: "velmi vysoký" }
                    ].map((option) => (
                      <label 
                        key={option.value}
                        className={`calc-ceiling-option ${formData.ceilingHeightForPrice === option.value ? 'selected' : ''}`}
                        onClick={() => handleInputChange('ceilingHeightForPrice', option.value)}
                      >
                        <input 
                          type="radio" 
                          name="ceilingHeightForPrice" 
                          value={option.value}
                          checked={formData.ceilingHeightForPrice === option.value}
                          onChange={() => {}}
                        />
                        <div className="calc-ceiling-value">{option.label}</div>
                        <div className="calc-ceiling-desc">{option.desc}</div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Typ opravy a Služby */}
            <div className="calc-repair-services-grid">
              {/* Typ opravy */}
              <div className="calc-card">
                <div className="calc-card-header">
                  <div className="calc-card-icon">
                    <div className="modern-icon icon-settings"></div>
                  </div>
                  <h2>Typ opravy</h2>
                </div>

                <div className="calc-repair-grid-compact">
                  {[
                    {
                      value: "Malé",
                      label: "Malé opravy",
                      desc: "malé dírky, vyplnění malých otvorů a opravu drobných trhlin, obitých rohů, menší tmelení"
                    },
                    {
                      value: "Střední",
                      label: "Střední opravy",
                      desc: "lokální škrábání menších ploch, rozsáhlejší trhliny, vyspravení omítek, vyrovnání i oprava poškozených štuků"
                    },
                    {
                      value: "Velké",
                      label: "Velké opravy",
                      desc: "rozsáhlejší škrábání a jakékoli rozsáhlejší opravy na větších plochách"
                    },
                    {
                      value: "Žádné",
                      label: "Žádné opravy",
                      desc: ""
                    }
                  ].map((repair) => (
                    <div key={repair.value}>
                      <label 
                        className={`calc-repair-option-compact ${formData.repairType === repair.value ? 'selected' : ''}`}
                        onClick={() => handleInputChange('repairType', repair.value)}
                      >
                        <input 
                          type="radio" 
                          name="repairType" 
                          value={repair.value}
                          checked={formData.repairType === repair.value}
                          onChange={() => {}}
                        />
                        <div className="calc-repair-header-compact">
                          <div className="calc-radio-dot"></div>
                          <div className="calc-radio-content">
                            <div className="modern-icon icon-settings"></div>
                            <div className="calc-radio-label">{repair.label}</div>
                          </div>
                        </div>
                      </label>
                      {repair.desc && (
                        <div className="calc-repair-description-compact">{repair.desc}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Služby */}
              <div className="calc-card">
                <div className="calc-card-header">
                  <div className="calc-card-icon">
                    <div className="modern-icon icon-list"></div>
                  </div>
                  <h2>Služby</h2>
                </div>

                <div className="calc-services-compact">
                  {/* Barva */}
                  <div className="calc-service-group">
                    <label className="calc-service-label">Barva</label>
                    <div className="calc-service-options">
                      <label 
                        className={`calc-service-option ${formData.material === "Ano" ? 'selected' : ''}`}
                        onClick={() => handleInputChange('material', 'Ano')}
                      >
                        <input 
                          type="radio" 
                          name="material" 
                          value="Ano"
                          checked={formData.material === "Ano"}
                          onChange={() => {}}
                        />
                        <div className="calc-radio-dot"></div>
                        <span>Malíř zajistí</span>
                      </label>
                      <label 
                        className={`calc-service-option ${formData.material === "Ne" ? 'selected' : ''}`}
                        onClick={() => handleInputChange('material', 'Ne')}
                      >
                        <input 
                          type="radio" 
                          name="material" 
                          value="Ne"
                          checked={formData.material === "Ne"}
                          onChange={() => {}}
                        />
                        <div className="calc-radio-dot"></div>
                        <span>Mám vlastní</span>
                      </label>
                    </div>
                  </div>

                  {/* Posunutí nábytku */}
                  <div className="calc-service-group">
                    <label className="calc-service-label">Posunutí nábytku</label>
                    <div className="calc-service-options">
                      <label 
                        className={`calc-service-option ${formData.furnitureMoving === "Ano" ? 'selected' : ''}`}
                        onClick={() => handleInputChange('furnitureMoving', 'Ano')}
                      >
                        <input 
                          type="radio" 
                          name="furnitureMoving" 
                          value="Ano"
                          checked={formData.furnitureMoving === "Ano"}
                          onChange={() => {}}
                        />
                        <div className="calc-radio-dot"></div>
                        <span>Ano</span>
                      </label>
                      <label 
                        className={`calc-service-option ${formData.furnitureMoving === "Ne" ? 'selected' : ''}`}
                        onClick={() => handleInputChange('furnitureMoving', 'Ne')}
                      >
                        <input 
                          type="radio" 
                          name="furnitureMoving" 
                          value="Ne"
                          checked={formData.furnitureMoving === "Ne"}
                          onChange={() => {}}
                        />
                        <div className="calc-radio-dot"></div>
                        <span>Ne</span>
                      </label>
                    </div>
                  </div>

                  {/* Zakrývání */}
                  <div className="calc-service-group">
                    <label className="calc-service-label">Zakrývání</label>
                    <div className="calc-service-options">
                      <label 
                        className={`calc-service-option ${formData.covering === "Ano" ? 'selected' : ''}`}
                        onClick={() => handleInputChange('covering', 'Ano')}
                      >
                        <input 
                          type="radio" 
                          name="covering" 
                          value="Ano"
                          checked={formData.covering === "Ano"}
                          onChange={() => {}}
                        />
                        <div className="calc-radio-dot"></div>
                        <span>Ano</span>
                      </label>
                      <label 
                        className={`calc-service-option ${formData.covering === "Ne" ? 'selected' : ''}`}
                        onClick={() => handleInputChange('covering', 'Ne')}
                      >
                        <input 
                          type="radio" 
                          name="covering" 
                          value="Ne"
                          checked={formData.covering === "Ne"}
                          onChange={() => {}}
                        />
                        <div className="calc-radio-dot"></div>
                        <span>Ne</span>
                      </label>
                    </div>
                  </div>

                  {/* Úklid */}
                  <div className="calc-service-group">
                    <label className="calc-service-label">Úklid</label>
                    <div className="calc-service-options">
                      <label 
                        className={`calc-service-option ${formData.cleaning === "Potřebuji" ? 'selected' : ''}`}
                        onClick={() => handleInputChange('cleaning', 'Potřebuji')}
                      >
                        <input 
                          type="radio" 
                          name="cleaning" 
                          value="Potřebuji"
                          checked={formData.cleaning === "Potřebuji"}
                          onChange={() => {}}
                        />
                        <div className="calc-radio-dot"></div>
                        <span>Potřebuji</span>
                      </label>
                      <label 
                        className={`calc-service-option ${formData.cleaning === "Nepotřebuji" ? 'selected' : ''}`}
                        onClick={() => handleInputChange('cleaning', 'Nepotřebuji')}
                      >
                        <input 
                          type="radio" 
                          name="cleaning" 
                          value="Nepotřebuji"
                          checked={formData.cleaning === "Nepotřebuji"}
                          onChange={() => {}}
                        />
                        <div className="calc-radio-dot"></div>
                        <span>Nepotřebuji</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar with Price Display */}
          <div className="calc-sidebar">
            <div className="calc-price-card">
              <div className="calc-price-header">
                <div className="calc-price-icon">
                  <div className="modern-icon icon-money"></div>
                </div>
                <div className="calc-price-label">Přibližná cena</div>
              </div>
              <div className="calc-price-amount">{totalPrice.toLocaleString('cs-CZ')}</div>
              <div className="calc-price-currency">Kč</div>
            </div>

            {/* Breakdown section */}
            <div className="calc-breakdown-card">
              <h3>Rozpis ceny</h3>
              <div className="calc-breakdown-item">
                <span>Typ plochy:</span>
                <span>{formData.selectedWork}</span>
              </div>
              <div className="calc-breakdown-item">
                <span>Plocha:</span>
                <span>{formData.totalArea || 0} m²</span>
              </div>
              {formData.selectedWork === "Půdorys" && (
                <div className="calc-breakdown-item">
                  <span>Výška stropu:</span>
                  <span>{formData.ceilingHeightForPrice} cm</span>
                </div>
              )}
              {formData.repairType && (
                <div className="calc-breakdown-item">
                  <span>Opravy:</span>
                  <span>{formData.repairType}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculatorComponent;
