
import html2canvas from 'html2canvas';

// Funkce pro kompletní PDF export všech stránek
export const exportCompletePDF = async (activeTab, setActiveTab, userData) => {
  try {
    // Zobrazit loading indikátor
    const loadingDiv = document.createElement('div');
    loadingDiv.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;">
        📄 Generuji PDF... Prosím čekejte
      </div>
    `;
    document.body.appendChild(loadingDiv);

    const originalTab = activeTab;
    const tabs = ['dashboard', 'zakazky', 'reporty', 'kalendar', 'mapa'];
    const tabNames = {
      'dashboard': 'Dashboard - Přehled',
      'zakazky': 'Zakázky - Správa', 
      'reporty': 'Reporty - Analýzy',
      'kalendar': 'Kalendář - Plánování',
      'mapa': 'Mapa zakázek'
    };

    // Horizontální PDF (landscape)
    const pdf = new (await import('jspdf')).jsPDF('l', 'mm', 'a4');
    let isFirstPage = true;

    for (const tab of tabs) {
      try {
        console.log(`🔄 Zpracovávám sekci: ${tabNames[tab]}`);

        // Přepni na tab
        setActiveTab(tab);

        // Počkej na render - delší doba pro grafy a mapy
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Najdi specifický obsah podle tabu
        let element;
        if (tab === 'dashboard') {
          element = document.querySelector('.dashboard');
        } else if (tab === 'zakazky') {
          element = document.querySelector('.zakazky');
        } else if (tab === 'reporty') {
          element = document.querySelector('.reporty');
        } else if (tab === 'kalendar') {
          element = document.querySelector('.kalendar');
        } else if (tab === 'mapa') {
          element = document.querySelector('.mapa-zakazek');
        }

        // Fallback na main-content pokud specifický element neexistuje
        if (!element) {
          element = document.querySelector('.main-content');
        }

        // Další fallbacky
        if (!element) {
          element = document.querySelector('[class*="container"]');
        }
        if (!element) {
          element = document.querySelector('.app > div:last-child');
        }
        if (!element) {
          element = document.body;
        }

        if (element) {
          console.log(`📸 Zachytávám screenshot pro ${tab} z elementu:`, element.className);

          // Počkej na dokončení všech animací a renderování
          await new Promise(resolve => requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
          }));

          // Pro reporty a mapu počkej ještě déle na grafy/mapu
          if (tab === 'reporty' || tab === 'mapa') {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          // Vyšší kvalita screenshotu s lepším nastavením
          const canvas = await html2canvas(element, {
            scale: 1.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: element.scrollWidth,
            height: element.scrollHeight,
            scrollX: 0,
            scrollY: 0,
            logging: true,
            removeContainer: false,
            foreignObjectRendering: true,
            timeout: 10000
          });

          // Převeď na image
          const imgData = canvas.toDataURL('image/jpeg', 0.85);

          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;

          // Přidej nadpis stránky
          pdf.setFontSize(18);
          pdf.setTextColor(60, 60, 60);
          pdf.text(tabNames[tab], 20, 20);

          // Vypočítej rozměry pro horizontální A4
          const pageWidth = pdf.internal.pageSize.getWidth(); // ~297mm
          const pageHeight = pdf.internal.pageSize.getHeight(); // ~210mm
          const imgAspectRatio = canvas.width / canvas.height;

          let imgWidth = pageWidth - 40; // margin 20mm z každé strany
          let imgHeight = imgWidth / imgAspectRatio;

          // Pokud je obrázek příliš vysoký, přizpůsob
          const maxHeight = pageHeight - 50; // margin + nadpis
          if (imgHeight > maxHeight) {
            imgHeight = maxHeight;
            imgWidth = imgHeight * imgAspectRatio;
          }

          // Vycentruj obrázek
          const x = (pageWidth - imgWidth) / 2;
          const y = 30;

          // Přidej obrázek
          pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);

          console.log(`✅ PDF stránka ${tab} přidána (${Math.round(imgWidth)}x${Math.round(imgHeight)}mm)`);
        } else {
          console.error(`❌ Nenalezen element pro tab ${tab}`);
        }
      } catch (error) {
        console.error(`❌ Chyba při zpracování ${tab}:`, error);
      }
    }

    // Vrať původní tab
    setActiveTab(originalTab);

    // Stáhni PDF
    const fileName = `PaintPro_Kompletni_Report_${new Date().toLocaleDateString('cs-CZ').replace(/\./g, '_')}.pdf`;
    pdf.save(fileName);

    // Odstraň loading
    document.body.removeChild(loadingDiv);

    console.log('✅ PDF export dokončen (horizontální formát)');

  } catch (error) {
    console.error('❌ Chyba při PDF exportu:', error);
    alert('Chyba při generování PDF. Zkuste to prosím znovu.');

    // Odstraň loading pokud existuje
    const loadingDiv = document.querySelector('[style*="position: fixed"][style*="z-index: 10000"]');
    if (loadingDiv) loadingDiv.remove();
  }
};
