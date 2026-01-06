import { useMemo } from 'react';
import { filterMainOrdersOnly } from '../utils/dataFilters';

export const useChartData = (zakazkyData) => {
  // Kombinovaný graf data
  const getCombinedChartData = useMemo(() => {
    const safeZakazkyDataForChart = filterMainOrdersOnly(zakazkyData);

    if (safeZakazkyDataForChart.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    const monthlyStats = {};

    safeZakazkyDataForChart.forEach(zakazka => {
      let parsedDate, month, year;

      if (zakazka.datum.includes('.')) {
        const cleanDatum = zakazka.datum.replace(/\s+/g, '');
        const dateParts = cleanDatum.split('.');

        if (dateParts.length >= 3) {
          const day = parseInt(dateParts[0]) || 1;
          month = parseInt(dateParts[1]) - 1;
          year = parseInt(dateParts[2]) || new Date().getFullYear();
          parsedDate = new Date(year, month, day);
        } else if (dateParts.length === 2) {
          const day = 1;
          month = parseInt(dateParts[0]) - 1;
          year = parseInt(dateParts[1]) || new Date().getFullYear();
          parsedDate = new Date(year, month, day);
        } else {
          month = 0;
          year = new Date().getFullYear();
          parsedDate = new Date(year, month, 1);
        }
      } else {
        const monthNames = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];
        month = monthNames.indexOf(zakazka.datum);
        if (month === -1) month = 0;
        year = new Date().getFullYear();
        parsedDate = new Date(year, month, 1);
      }

      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          zisk: 0,
          trzby: 0,
          month: month,
          year: year,
          datum: parsedDate,
          monthKey: monthKey
        };
      }

      const trzba = zakazka.castka || 0;
      const fee = zakazka.fee || 0; // Použij skutečné fee z databáze
      const feeOff = zakazka.fee_off || trzba; // Použij fee_off z databáze
      const zisk = zakazka.zisk || (feeOff - (zakazka.palivo || 0) - (zakazka.material || 0) - (zakazka.pomocnik || 0)); // Použij předpočítaný zisk


      monthlyStats[monthKey].zisk += zisk;
      monthlyStats[monthKey].trzby += trzba;
    });

    const sortedMonthsData = Object.values(monthlyStats).sort((a, b) => a.datum - b.datum);
    const monthNames = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čer', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];

    const labels = sortedMonthsData.map(data => {
      return `${monthNames[data.month]} ${data.year}`;
    });

    const ziskData = sortedMonthsData.map(data => data.zisk);
    const trzbyData = sortedMonthsData.map(data => data.trzby);

    return {
      labels: labels,
      datasets: [
        {
          type: 'bar',
          label: 'Zisk',
          data: ziskData,
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return '#4F46E5';

            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(79, 70, 229, 0.8)');
            gradient.addColorStop(0.5, 'rgba(79, 70, 229, 0.9)');
            gradient.addColorStop(1, 'rgba(99, 102, 241, 1)');
            return gradient;
          },
          borderColor: '#4F46E5',
          borderWidth: 0,
          borderRadius: 8,
          borderSkipped: false,
          barThickness: 24,
        },
        {
          type: 'bar',
          label: 'Tržby',
          data: trzbyData,
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return '#06B6D4';

            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(6, 182, 212, 0.6)');
            gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.7)');
            gradient.addColorStop(1, 'rgba(8, 145, 178, 0.8)');
            return gradient;
          },
          borderColor: '#06B6D4',
          borderWidth: 0,
          borderRadius: 8,
          borderSkipped: false,
          barThickness: 24,
        },
        {
          type: 'line',
          label: 'Trend zisku',
          data: ziskData,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#10B981',
          pointBorderColor: 'var(--text-secondary)',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        }
      ],
    };
  }, [zakazkyData]);

  return { getCombinedChartData };
};