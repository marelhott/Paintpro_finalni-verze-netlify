# Přehled chyb, nedostatků a doporučení

Tento soubor obsahuje podrobný seznam chyb, nedostatků a doporučení z analýzy projektu **PaintPro_1-main**.

---

## 1. Chyby v logice a překlepy

### CSV Import v App.jsx
- **Chybějící catch blok:**
  V handleru pro import CSV (`handleCSVImport`) je na konci bloku `try` volán `console.error('Chyba při importu CSV:', error);` a `alert('❌ Chyba při importu CSV souboru');`, ale proměnná `error` zde není definovaná.
  - **Oprava:** Chybí `catch` blok, nebo je tento kód omylem uvnitř `try`.

### Export CSV – nekonzistence názvů polí
- V exportu CSV se používá `zakazka.dobaRealizace || zakazka.delkaRealizace || 1`, ale v některých částech kódu se používá pouze jedno z těchto polí.
  - **Doporučení:** Sjednotit názvy (`dobaRealizace` vs. `delkaRealizace`).

### File upload – nekonzistence
- V `App.jsx` je funkce `uploadFileToSupabase`, která ukládá soubory do localStorage, ale v `OptimizedOrderTable.jsx` je vlastní logika pro upload souborů, která také ukládá do localStorage, ale pod jiným formátem.
  - **Důsledek:** Může vést k nekonzistenci a nefunkčnosti synchronizace souborů mezi tabulkou a zbytkem aplikace.

### Chybějící validace dat
- V některých formulářích (např. přidání zakázky) není validace povinných polí, což může vést k ukládání neúplných nebo chybných dat.

---

## 2. Potenciální runtime chyby

### CalendarComponent.jsx – parsování datumu
- Pokud `zakazka.datum` není ve formátu `DD. MM. YYYY`, dojde k chybě při parsování.
  - **Doporučení:** Přidat validaci nebo fallback.

### App.jsx – globální error handler
- V `useEffect` pro globální error handler je v `window.removeEventListener('unhandledrejection', handleGitError);`, ale listener byl přidán jako anonymní funkce s parametrem `event => handleGitError(event.reason);`.
  - **Důsledek:** `removeEventListener` nebude fungovat správně, protože reference na funkci je jiná.

---

## 3. Importy a závislosti

### Import gitLockManager
- V `src/App.jsx` je importován `gitLockManager` s malým písmenem, ale soubor se jmenuje `GitLockManager.js`.
  - **Důsledek:** Na case-sensitive systému (např. Linux) to způsobí chybu importu.

---

## 4. Bezpečnostní a konfigurační nedostatky

### AuthContext.jsx – hardcoded Supabase klíče
- Je zde fallback na hardcoded Supabase klíče, což není bezpečné pro produkci.

### Chybějící typy
- Projekt je nastaven na TypeScript (`tsconfig.json`), ale všechny soubory jsou `.jsx`.
  - **Doporučení:** Pokud chcete využívat typovou kontrolu, přejděte na `.tsx` a přidejte typy.

---

## 5. Další doporučení a drobné nedostatky

- **Duplicita a nekonzistence v logice uploadu souborů** – viz výše.
- **Možné chyby při parsování datumu v kalendáři** – viz výše.
- **Chybějící validace vstupů v některých formulářích** – viz výše.
- **Nekonzistence v názvech polí** – viz výše.

---

## 6. Shrnutí hlavních problémů
- Špatné odstranění event listeneru v App.jsx (globální error handler).
- Chybějící catch blok v CSV importu.
- Nekonzistence v názvech polí (`dobaRealizace` vs. `delkaRealizace`).
- Potenciální problém s importem `gitLockManager` vs. `GitLockManager`.
- Duplicita a nekonzistence v logice uploadu souborů.
- Možné chyby při parsování datumu v kalendáři.
- Hardcoded Supabase klíče.
- Projekt není skutečně typově bezpečný (TypeScript nastavení, ale kód v JS/JSX).

---

Pokud budete chtít některý bod opravit, napište mi konkrétní požadavek a mohu navrhnout nebo rovnou provést úpravu kódu. 