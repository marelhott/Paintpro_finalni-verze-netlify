
// Helper funkce pro filtrování kalendářových vs. hlavních zakázek
export const filterMainOrdersOnly = (zakazkyData) => {
  if (!Array.isArray(zakazkyData)) return [];

  return zakazkyData.filter(zakazka => {
    // Vyfiltrovat kalendářové zakázky (identifikované pomocí prefixu CAL- nebo calendar_origin)
    const isCalendarOrder = (
      (zakazka.cislo && zakazka.cislo.toString().startsWith('CAL-')) ||
      (zakazka.id_zakazky && zakazka.id_zakazky.toString().startsWith('CAL-')) ||
      zakazka.calendar_origin === true
    );

    // Vrátit pouze NEkalenářové zakázky (hlavní zakázky)
    return !isCalendarOrder;
  });
};
