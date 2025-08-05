import { useMemo } from 'react';
import { filterMainOrdersOnly } from '../utils/dataFilters';

export const useZakazkyStatistics = (zakazkyData, workCategories) => {
  // Dynamicky počítané dashboard data
  const dashboardData = useMemo(() => {
    const safeZakazkyData = Array.isArray(zakazkyData) ? zakazkyData : [];
    const mainOrdersOnly = filterMainOrdersOnly(safeZakazkyData);

    const celkoveTrzby = mainOrdersOnly.reduce((sum, z) => sum + z.castka, 0);
    const celkovyZisk = mainOrdersOnly.reduce((sum, z) => sum + z.zisk, 0);
    const pocetZakazek = mainOrdersOnly.length;
    const prumernyZisk = pocetZakazek > 0 ? Math.round(celkovyZisk / pocetZakazek) : 0;

    // Kategorie statistiky
    const categoryStats = {};
    const availableCategories = workCategories?.map(cat => cat.name) || [];

    availableCategories.forEach(category => {
      categoryStats[category] = 0;
    });

    filterMainOrdersOnly(zakazkyData).forEach(zakazka => {
      if (categoryStats.hasOwnProperty(zakazka.druh)) {
        categoryStats[zakazka.druh] += zakazka.zisk;
      } else {
        categoryStats[zakazka.druh] = zakazka.zisk;
      }
    });

    // Měsíční data
    const monthlyDataMap = {};
    filterMainOrdersOnly(zakazkyData).forEach(zakazka => {
      let parsedDate, month, year;

      if (zakazka.datum.includes('.')) {
        const cleanDatum = zakazka.datum.replace(/\s+/g, '');
        const dateParts = cleanDatum.split('.');

        if (dateParts.length >= 3) {
          const day = parseInt(dateParts[0]) || 1;
          month = parseInt(dateParts[1]) - 1;
          year = parseInt(dateParts[2]) || 2025;
          parsedDate = new Date(year, month, day);
        } else if (dateParts.length === 2) {
          const day = 1;
          month = parseInt(dateParts[0]) - 1;
          year = parseInt(dateParts[1]) || 2025;
          parsedDate = new Date(year, month, day);
        } else {
          month = 0;
          year = 2025;
          parsedDate = new Date(year, month, 1);
        }
      } else {
        const monthNames = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];
        month = monthNames.indexOf(zakazka.datum);
        if (month === -1) month = 0;
        year = 2025;
        parsedDate = new Date(year, month, 1);
      }

      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

      if (!monthlyDataMap[monthKey]) {
        monthlyDataMap[monthKey] = {
          revenue: 0,
          month: month,
          year: year,
          datum: parsedDate
        };
      }
      monthlyDataMap[monthKey].revenue += zakazka.zisk;
    });

    const sortedMonthsData = Object.values(monthlyDataMap)
      .sort((a, b) => a.datum - b.datum);

    const monthNames = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čer', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];
    const mesicniLabels = sortedMonthsData.map(data => monthNames[data.month]);
    const mesicniValues = sortedMonthsData.map(data => data.revenue);

    return {
      celkoveTrzby: celkoveTrzby.toLocaleString(),
      celkovyZisk: celkovyZisk.toLocaleString(),
      pocetZakazek: pocetZakazek.toString(),
      prumernyZisk: prumernyZisk.toLocaleString(),
      mesicniData: {
        labels: mesicniLabels,
        values: mesicniValues
      },
      rozlozeniData: {
        labels: Object.keys(categoryStats),
        values: Object.values(categoryStats),
        colors: workCategories?.map(cat => cat.color) || []
      }
    };
  }, [zakazkyData, workCategories]);

  return { dashboardData };
};