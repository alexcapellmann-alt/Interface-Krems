// js/utils/datePrecision.js
// Leitet aus dem Freitext eines Datumsfelds eine Präzisionsstufe ab (Abschnitt 6/12).
// Mustertabelle jetzt verbindlich (Masterprompt Abschnitt 12, v4.2):
//
//   Muster                                          Stufe       Beispiel
//   JJJJ [röm. Monat] [TT]                           exact       1347 III 12
//   JJJJ [röm. Monat]                                month       1347 VIII
//   um/ca./vor/nach/Ende/Mitte + Jahr                approx      um 1400
//   nur Jahreszahl, alles andere                     year        1347
//   leer/nicht überliefert                           undatiert   –
//
// Korrektur gegenüber der ersten Fassung: leer -> 'undatiert', nicht 'year' - ein
// undatierter Eintrag muss in aggregierenden/zeitbasierten Visualisierungen sichtbar
// behandelt werden (eigener Bereich, wie beim Gantt-Diagramm für fehlende Zeiträume),
// nicht stillschweigend wie ein Jahr eingeordnet oder ausgeblendet werden.
//
// "alles andere" landet laut Tabelle bewusst ebenfalls bei 'year' (kein separater
// "unklar"-Fall) - so von der Bestandsaufnahme festgelegt, hier bewusst nicht
// eigenmächtig um eine weitere Stufe ergänzt.

const MUSTER_EXAKT = /^\d{3,4}\s+[IVXLCM]+\s+\d{1,2}$/i;
const MUSTER_MONAT = /^\d{3,4}\s+[IVXLCM]+$/i;
const MUSTER_UNGEFAEHR = /^(um|ca\.?|vor|nach|ende|mitte)\s+\d{3,4}/i;

// Rückgabewerte: 'exact' | 'month' | 'approx' | 'year' | 'undatiert'
export function leiteDatumsPraezisionAb(datumsText) {
  const text = (datumsText || '').trim();
  if (text === '') return 'undatiert';
  if (MUSTER_UNGEFAEHR.test(text)) return 'approx';
  if (MUSTER_EXAKT.test(text)) return 'exact';
  if (MUSTER_MONAT.test(text)) return 'month';
  return 'year';
}
