# 🎨 PaintPro - Malířská CRM Aplikace

**PaintPro** je komplexní offline-first aplikace pro správu malířských zakázek, financí a projektů.

## ✨ Hlavní Funkce

- 📊 **Dashboard** - Přehled tržeb, zisku a statistik
- 📝 **Správa zakázek** - Kompletní evidence zakázek s přílohami
- 👥 **Multi-user systém** - Více uživatelů s PIN autentizací
- 📅 **Kalendář** - Plánování a organizace zakázek
- 🗺️ **Mapa** - Geografické zobrazení zakázek (OpenStreetMap)
- 🧮 **Kalkulačka** - Rychlý výpočet cen
- 📄 **Export** - CSV a PDF export dat
- 💾 **Offline režim** - Vše funguje bez internetu

## 🚀 Instalace a Spuštění

### Prerekvizity
- Node.js 18+ 
- npm nebo yarn

### Lokální vývoj

```bash
# Instalace závislostí
npm install

# Spuštění dev serveru
npm run dev

# Aplikace běží na http://localhost:5173/
```

### Production build

```bash
# Build aplikace
npm run build

# Preview production buildu
npm run preview
```

## 👤 Výchozí Přihlášení

**Administrátor**
- PIN: `135715`

Po prvním spuštění si můžete vytvořit vlastní uživatelské profily.

## 🌐 Deployment na Netlify

Aplikace je připravena pro deployment na Netlify:

1. **Připojte repozitář** k Netlify
2. **Build settings** jsou automaticky nastaveny v `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Deploy!** - Netlify automaticky nasadí aplikaci

Alternativně použijte Netlify CLI:

```bash
npm install -g netlify-cli
netlify deploy --prod
```

## 🏗️ Architektura

```
src/
├── App.jsx              # Hlavní aplikace
├── AuthContext.jsx      # Autentizace a správa uživatelů
├── components/          # React komponenty
├── hooks/               # Custom React hooks
└── utils/               # Utility funkce
    ├── DiskStorageManager.js    # Offline úložiště
    ├── FileManager.js           # Správa souborů
    └── WorkCategoryManager.js   # Kategorie prací
```

## 📦 Technologie

- **React 18.2** - UI framework
- **Vite 5.4+** - Build tool a dev server
- **Chart.js** - Grafy a vizualizace
- **Leaflet** - Mapy (OpenStreetMap)
- **html2pdf.js** - PDF export
- **localStorage** - Offline data persistence

## 📝 Licence

Copyright © 2026 PaintPro. All rights reserved.