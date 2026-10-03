// js/utils/textwert.js
// AUFTRAG B1 (Prüfbericht 2026-10-03, Punkt 3): "|" ist laut docs/SCHEMA.md
// in JEDER Spalte das Listentrennzeichen - js/core/dataLoader.js macht aus
// einem Feldwert mit "|" deshalb immer eine Liste, auch in Freitextfeldern.
// Module, die dort einen Text erwarteten (.split(), .localeCompare(), .length),
// brachen bei einer Liste ab. Diese Hilfsfunktionen machen aus einer Liste
// wieder einen Anzeigetext, ohne die Zerlegung im Loader zu ändern.

// " | " statt Komma (Array.toString()), damit das Trennzeichen in der Anzeige
// sichtbar bleibt und der Wert erkennbar als Liste gelesen wurde.
export const LISTEN_ANZEIGE_TRENNER = ' | ';

export function alsText(wert) {
  if (Array.isArray(wert)) return wert.join(LISTEN_ANZEIGE_TRENNER);
  if (wert === null || wert === undefined) return '';
  return wert;
}

// Liefert die Datensätze mit den genannten Feldern als Text. Nur Datensätze,
// in denen eines dieser Felder tatsächlich eine Liste ist, werden kopiert -
// alle übrigen bleiben dieselben Objekte (Masterprompt Abschnitt 5: übergebene
// Rohdaten nicht verändern; Objektidentität bleibt für Auswahl/Vergleiche erhalten).
export function mitTextfeldern(records, felder) {
  return records.map((record) => {
    if (!felder.some((feld) => Array.isArray(record[feld]))) return record;
    const kopie = { ...record };
    felder.forEach((feld) => { if (Array.isArray(kopie[feld])) kopie[feld] = alsText(kopie[feld]); });
    return kopie;
  });
}
