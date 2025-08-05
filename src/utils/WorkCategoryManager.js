
// =========================
// CENTRÁLNÍ SYSTÉM PRO SPRÁVU KATEGORIÍ PRÁCE
// =========================

// Výchozí kategorie a barvy
const DEFAULT_WORK_CATEGORIES = [
  { name: 'Adam', color: '#6366f1' },
  { name: 'MVČ', color: '#06b6d4' },
  { name: 'Korálek', color: '#10b981' },
  { name: 'Ostatní', color: '#f59e0b' }
];

// Generátor barev pro nové kategorie
const generateColorForCategory = (index) => {
  const colors = [
    '#8b5cf6', '#ef4444', '#f97316', '#eab308', '#84cc16', 
    '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
    '#d946ef', '#ec4899', '#f43f5e', '#dc2626', '#ea580c'
  ];
  return colors[index % colors.length];
};

// Jednoduchá třída pro správu kategorií - bez složitých listenerů
class SimpleWorkCategoryManager {
  constructor() {
    this.storageKey = 'workCategories';
    this.loadCategories();
  }

  loadCategories() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.categories = JSON.parse(stored);
      } else {
        this.categories = [...DEFAULT_WORK_CATEGORIES];
        this.saveCategories();
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      this.categories = [...DEFAULT_WORK_CATEGORIES];
    }
  }

  saveCategories() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.categories));
    } catch (error) {
      console.error('Error saving categories:', error);
    }
  }

  getAllCategories() {
    return [...this.categories];
  }

  getCategoryNames() {
    return this.categories.map(cat => cat.name);
  }

  getCategoryColor(categoryName) {
    const category = this.categories.find(cat => cat.name === categoryName);
    return category ? category.color : '#6b7280';
  }

  addCategory(categoryName) {
    if (!categoryName || categoryName.trim() === '') return false;

    const trimmedName = categoryName.trim();
    if (this.categories.some(cat => cat.name.toLowerCase() === trimmedName.toLowerCase())) {
      return false; // už existuje
    }

    const newCategory = {
      name: trimmedName,
      color: generateColorForCategory(this.categories.length)
    };

    this.categories.push(newCategory);
    this.saveCategories();
    return true;
  }
}

// Globální instance manageru
const workCategoryManager = new SimpleWorkCategoryManager();

export default workCategoryManager;
