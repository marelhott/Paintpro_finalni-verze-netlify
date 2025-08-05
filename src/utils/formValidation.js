// Validační pravidla pro formuláře
class FormValidator {
  constructor() {
    this.rules = {
      required: (value) => value && value.toString().trim() !== '',
      email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      number: (value) => !isNaN(value) && isFinite(value),
      positiveNumber: (value) => !isNaN(value) && parseFloat(value) > 0,
      date: (value) => !isNaN(Date.parse(value)),
      minLength: (min) => (value) => value && value.length >= min,
      maxLength: (max) => (value) => value && value.length <= max,
      pattern: (regex) => (value) => regex.test(value)
    };
  }

  // Validace jednotlivého pole
  validateField(value, rules) {
    const errors = [];

    for (const rule of rules) {
      if (typeof rule === 'string') {
        // Jednoduchá pravidla
        if (!this.rules[rule](value)) {
          errors.push(this.getErrorMessage(rule, value));
        }
      } else if (typeof rule === 'object') {
        // Složitá pravidla s parametry
        const ruleName = rule.type;
        const ruleFunction = rule.params ? this.rules[ruleName](rule.params) : this.rules[ruleName];

        if (!ruleFunction(value)) {
          errors.push(rule.message || this.getErrorMessage(ruleName, value));
        }
      }
    }

    return errors;
  }

  // Validace celého formuláře
  validateForm(formData, validationSchema) {
    const errors = {};
    let isValid = true;

    for (const [fieldName, rules] of Object.entries(validationSchema)) {
      const fieldErrors = this.validateField(formData[fieldName], rules);

      if (fieldErrors.length > 0) {
        errors[fieldName] = fieldErrors;
        isValid = false;
      }
    }

    return { isValid, errors };
  }

  // Získání error zprávy
  getErrorMessage(ruleName, value) {
    const messages = {
      required: 'Toto pole je povinné',
      email: 'Neplatný formát emailu',
      number: 'Musí být číslo',
      positiveNumber: 'Musí být kladné číslo',
      date: 'Neplatný formát datumu',
      minLength: `Minimálně ${value} znaků`,
      maxLength: `Maximálně ${value} znaků`
    };

    return messages[ruleName] || 'Neplatná hodnota';
  }
}

// Validační schémata pro různé formuláře
export const validationSchemas = {
  zakazka: {
    datum: ['required', 'date'],
    druh: ['required'],
    klient: ['required'],
    cislo: ['required'],
    castka: ['required', 'positiveNumber'],
    delkaRealizace: ['required', 'positiveNumber'],
    typ: ['required']
  },

  user: {
    name: ['required', { type: 'minLength', params: 2, message: 'Jméno musí mít alespoň 2 znaky' }],
    avatar: ['required', { type: 'maxLength', params: 3, message: 'Avatar max 3 znaky' }],
    pin: ['required', { type: 'minLength', params: 4, message: 'PIN musí mít alespoň 4 znaky' }]
  },

  changePin: {
    currentPin: ['required', { type: 'minLength', params: 4, message: 'PIN musí mít alespoň 4 znaky' }],
    newPin: ['required', { type: 'minLength', params: 4, message: 'PIN musí mít alespoň 4 znaky' }],
    confirmPin: ['required', { type: 'minLength', params: 4, message: 'PIN musí mít alespoň 4 znaky' }]
  }
};

// Singleton instance
const formValidator = new FormValidator();
export default formValidator;

// Pokročilé validační funkce pro formuláře
export const validateZakazka = (formData) => {
  const errors = {};

  // Povinná pole
  if (!formData.datum) {
    errors.datum = 'Datum je povinné';
  } else {
    const dateValidation = validateDate(formData.datum);
    if (!dateValidation.isValid) {
      errors.datum = dateValidation.error;
    }
  }

  if (!formData.klient || formData.klient.trim() === '') {
    errors.klient = 'Jméno klienta je povinné';
  } else if (formData.klient.trim().length < 2) {
    errors.klient = 'Jméno klienta musí mít alespoň 2 znaky';
  } else if (formData.klient.trim().length > 100) {
    errors.klient = 'Jméno klienta je příliš dlouhé (max 100 znaků)';
  }

  if (!formData.cislo || formData.cislo.trim() === '') {
    errors.cislo = 'Číslo zakázky je povinné';
  } else if (formData.cislo.trim().length > 50) {
    errors.cislo = 'Číslo zakázky je příliš dlouhé (max 50 znaků)';
  }

  // Validace částky
  if (!formData.castka || formData.castka <= 0) {
    errors.castka = 'Částka musí být větší než 0';
  } else if (formData.castka > 10000000) {
    errors.castka = 'Částka je příliš vysoká (max 10 mil. Kč)';
  }

  // Validace číselných hodnot
  const numericFields = ['material', 'pomocnik', 'palivo', 'fee'];
  numericFields.forEach(field => {
    if (formData[field] && formData[field] < 0) {
      errors[field] = 'Hodnota nemůže být záporná';
    }
    if (formData[field] && formData[field] > 5000000) {
      errors[field] = 'Hodnota je příliš vysoká (max 5 mil. Kč)';
    }
  });

  // Validace délky realizace
  if (formData.delkaRealizace && formData.delkaRealizace < 1) {
    errors.delkaRealizace = 'Doba realizace musí být alespoň 1 den';
  } else if (formData.delkaRealizace && formData.delkaRealizace > 365) {
    errors.delkaRealizace = 'Doba realizace je příliš dlouhá (max 365 dní)';
  }

  // Validace adresy
  if (formData.adresa && formData.adresa.trim().length > 200) {
    errors.adresa = 'Adresa je příliš dlouhá (max 200 znaků)';
  }

  // Validace poznámek
  if (formData.poznamky && formData.poznamky.trim().length > 1000) {
    errors.poznamky = 'Poznámky jsou příliš dlouhé (max 1000 znaků)';
  }

  // Logická validace - zisk nesmí být záporný
  if (formData.castka && formData.fee && formData.material && formData.pomocnik && formData.palivo) {
    const zisk = formData.castka - formData.fee - formData.material - formData.pomocnik - formData.palivo;
    if (zisk < 0) {
      errors.general = 'Výsledný zisk je záporný. Zkontrolujte zadané hodnoty.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Validace datumu s pokročilými kontrolami
export const validateDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();

  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Neplatný formát datumu' };
  }

  // Datum nesmí být více než 50 let v minulosti
  const minDate = new Date();
  minDate.setFullYear(today.getFullYear() - 50);

  if (date < minDate) {
    return { isValid: false, error: 'Datum je příliš v minulosti (max 50 let)' };
  }

  // Datum nesmí být více než 10 let v budoucnosti
  const maxFutureDate = new Date();
  maxFutureDate.setFullYear(today.getFullYear() + 10);

  if (date > maxFutureDate) {
    return { isValid: false, error: 'Datum je příliš v budoucnosti (max 10 let)' };
  }

  return { isValid: true };
};

// Validace emailu
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return {
    isValid: emailRegex.test(email),
    error: emailRegex.test(email) ? null : 'Neplatný formát emailu'
  };
};

// Validace telefonu (české formáty)
export const validatePhone = (phone) => {
  const cleanPhone = phone.replace(/\s/g, '');
  const phoneRegex = /^(\+420)?[0-9]{9}$/;
  return {
    isValid: phoneRegex.test(cleanPhone),
    error: phoneRegex.test(cleanPhone) ? null : 'Neplatný formát telefonu (použijte formát +420123456789)'
  };
};

// Validace PSČ (české)
export const validatePostalCode = (postalCode) => {
  const postalRegex = /^\d{3}\s?\d{2}$/;
  return {
    isValid: postalRegex.test(postalCode),
    error: postalRegex.test(postalCode) ? null : 'Neplatný formát PSČ (použijte formát 123 45)'
  };
};

// Validace kategorie práce
export const validateWorkCategory = (category) => {
  if (!category || category.trim() === '') {
    return { isValid: false, error: 'Kategorie práce je povinná' };
  }

  if (category.trim().length < 2) {
    return { isValid: false, error: 'Kategorie musí mít alespoň 2 znaky' };
  }

  if (category.trim().length > 50) {
    return { isValid: false, error: 'Kategorie je příliš dlouhá (max 50 znaků)' };
  }

  return { isValid: true };
};

// Validace PIN kódu
export const validatePin = (pin) => {
  if (!pin || pin.toString().length !== 6) {
    return { isValid: false, error: 'PIN musí mít 6 číslic' };
  }

  if (!/^\d{6}$/.test(pin)) {
    return { isValid: false, error: 'PIN může obsahovat pouze číslice' };
  }

  return { isValid: true };
};

// Komplexní validace formuláře s detailním reportem
export const validateFormWithReport = (formData, fieldNames) => {
  const report = {
    isValid: true,
    errors: {},
    warnings: {},
    suggestions: []
  };

  // Základní validace
  const basicValidation = validateZakazka(formData);
  report.errors = basicValidation.errors;
  report.isValid = basicValidation.isValid;

  // Varování pro neobvyklé hodnoty
  if (formData.castka && formData.castka > 100000) {
    report.warnings.castka = 'Neobvykle vysoká částka - zkontrolujte správnost';
  }

  if (formData.delkaRealizace && formData.delkaRealizace > 30) {
    report.warnings.delkaRealizace = 'Dlouhá doba realizace - zkontrolujte správnost';
  }

  // Návrhy pro zlepšení
  if (!formData.adresa || formData.adresa.trim() === '') {
    report.suggestions.push('Doporučujeme vyplnit adresu pro lepší lokalizaci');
  }

  if (!formData.poznamky || formData.poznamky.trim() === '') {
    report.suggestions.push('Poznámky mohou pomoci s budoucí identifikací zakázky');
  }

  return report;
};