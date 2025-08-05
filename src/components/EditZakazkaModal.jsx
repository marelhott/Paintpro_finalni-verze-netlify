import React, { useState, useEffect } from 'react';
import workCategoryManager from '../utils/WorkCategoryManager';
import { validateZakazka } from '../utils/formValidation';

const EditZakazkaModal = ({ showEditModal, setShowEditModal, editingZakazka, handleEditZakazka, workCategories, setWorkCategories }) => {
  const [formData, setFormData] = useState(editingZakazka || {});
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (editingZakazka) {
      const dateStr = editingZakazka.datum.split('. ').reverse().join('-').replace(' ', '');
      setFormData({
        ...editingZakazka,
        datum: dateStr
      });
    }
  }, [editingZakazka]);

  // Real-time validace
  const handleFormChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

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

export default EditZakazkaModal;