import React, { useState, useRef, useEffect } from 'react';
import workCategoryManager from '../utils/WorkCategoryManager';
import { validateZakazka } from '../utils/formValidation';

const AddZakazkaModal = ({ showAddModal, setShowAddModal, addZakazka, workCategories, setWorkCategories }) => {
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
  const [validationErrors, setValidationErrors] = useState({});
  const fileInputRef = useRef(null);

  // Real-time validace při změně formuláře
  const handleFormChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Validuj pouze změněné pole
    const validation = validateZakazka(newFormData);
    setValidationErrors(validation.errors);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validace formuláře
    const validation = validateZakazka(formData);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      console.log('❌ Validační chyby:', validation.errors);

      // Najdi první chybu a skroluj k ní
      const firstErrorField = Object.keys(validation.errors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.focus();
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      return;
    }

    // Vyčisti chyby pokud je vše v pořádku
    setValidationErrors({});

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

    // Fee se přidá pouze pokud je zaškrtnuté
    processedData.fee = 0;

    // Inicializuj soubory jako prázdné pole, ne string
    processedData.soubory = [];

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

  // Funkce pro získání stylu pole s ohledem na validační chyby
  const getFieldStyle = (fieldName) => ({
    borderColor: validationErrors[fieldName] ? '#ef4444' : '#e5e7eb',
  });

  // Funkce pro zobrazení validační chyby
  const renderFieldError = (fieldName) => {
    return validationErrors[fieldName] && (
      <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
        {validationErrors[fieldName]}
      </div>
    );
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
              <label>Datum *</label>
              <input
                name="datum"
                type="date"
                value={formData.datum}
                onChange={e => handleFormChange('datum', e.target.value)}
                style={getFieldStyle('datum')}
              />
              {renderFieldError('datum')}
            </div>
            <div className="form-group">
              <label>Druh práce *</label>
              <input
                name="druh"
                type="text"
                value={formData.druh}
                onChange={e => handleFormChange('druh', e.target.value)}
                placeholder="Vložit druh práce"
                list="work-categories-list"
                style={getFieldStyle('druh')}
              />
              <datalist id="work-categories-list">
                {workCategories.map(category => (
                  <option key={category.name} value={category.name} />
                ))}
              </datalist>
              {renderFieldError('druh')}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Klient *</label>
              <input
                name="klient"
                type="text"
                value={formData.klient}
                onChange={e => handleFormChange('klient', e.target.value)}
                placeholder="Jméno klienta"
                style={getFieldStyle('klient')}
              />
              {renderFieldError('klient')}
            </div>
            <div className="form-group">
              <label>Číslo zakázky *</label>
              <input
                name="cislo"
                type="text"
                value={formData.cislo}
                onChange={e => handleFormChange('cislo', e.target.value)}
                placeholder="Číslo zakázky"
                style={getFieldStyle('cislo')}
              />
              {renderFieldError('cislo')}
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
              <label>Částka (Kč) *</label>
              <input
                name="castka"
                type="number"
                value={formData.castka}
                onChange={e => handleFormChange('castka', e.target.value)}
                placeholder="0"
                style={getFieldStyle('castka')}
              />
              {renderFieldError('castka')}
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

export default AddZakazkaModal;