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

// Nachbesserung 7, Punkt 3 (Befund 3.6, Entscheidung des Autors 15.11.2026; Mustertabelle unverändert):
// - „o. D.“, „o.D.“, „ohne Datum“, „undatiert“, „nicht überliefert“ bedeuten ausdrücklich: kein Datum → 'undatiert'
//   (wie ein leeres Feld), nicht 'year'.
// - Ein unmöglicher Monat (nicht I bis XII) oder Tag (0 oder größer als der Monat Tage hat; Februar bis 29) gilt nicht
//   als 'exact' bzw. 'month', sondern als 'year'; datumsHinweis() liefert dazu den Vermerk für die Anzeige.
const MUSTER_UNDATIERT = /^(o\.\s*d\.?|ohne\s+datum|undatiert|nicht\s+überliefert)$/i;
const ROEMISCH = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const TAGE_JE_MONAT = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function pruefeMonatUndTag(text) {
  const teile = text.split(/\s+/);
  const monat = ROEMISCH.indexOf(String(teile[1] || '').toUpperCase()) + 1;
  if (!monat) return false;
  if (teile.length < 3) return true;
  const tag = Number(teile[2]);
  return Number.isInteger(tag) && tag >= 1 && tag <= TAGE_JE_MONAT[monat - 1];
}

// Rückgabewerte: 'exact' | 'month' | 'approx' | 'year' | 'undatiert'
export function leiteDatumsPraezisionAb(datumsText) {
  const text = (datumsText || '').trim();
  if (text === '' || MUSTER_UNDATIERT.test(text)) return 'undatiert';
  if (MUSTER_UNGEFAEHR.test(text)) return 'approx';
  if (MUSTER_EXAKT.test(text)) return pruefeMonatUndTag(text) ? 'exact' : 'year';
  if (MUSTER_MONAT.test(text)) return pruefeMonatUndTag(text) ? 'month' : 'year';
  return 'year';
}

// Vermerk zur Anzeige, wenn die Angabe wie ein genaues Datum aussieht, Monat oder Tag aber unmöglich sind; sonst ''.
export function datumsHinweis(datumsText) {
  const text = (datumsText || '').trim();
  if ((MUSTER_EXAKT.test(text) || MUSTER_MONAT.test(text)) && !pruefeMonatUndTag(text)) return 'Tages- oder Monatsangabe ungültig, nur das Jahr ausgewertet';
  return '';
}
