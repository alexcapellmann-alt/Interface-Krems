// js/utils/uncertainty.js
// Filtert aus unsicherheit_anmerkung die zu einem konkreten Feld passende Erklärung
// heraus (Abschnitt 11, v4.2). Verbindliches Format pro Listeneintrag (bei mehreren
// unsicheren Feldern zerlegt der dataLoader das per Pipe-Konvention bereits in eine
// Liste, siehe Abschnitt 12): "<feldname>: <Erklärung>" - der Text vor dem ersten
// Doppelpunkt wird case-insensitiv mit dem Feldnamen abgeglichen. Strukturiertes
// Parsen eines festen Formats, keine Heuristik über freien Satzinhalt.
//
// Fallback bei Nichteinhaltung des Formats (z.B. noch nicht überarbeitete Altdaten,
// siehe Abschnitt 12 v4.2): kein Absturz, stattdessen wird der komplette Text
// gezeigt statt fälschlich nichts anzuzeigen.

// Lesbare Bezeichnung des Feldnamens vor dem Doppelpunkt (Nachbesserung 3, Punkt 2, Wunsch des Autors
// 15.11.2026): die EINZIGE Stelle dieser Übersetzung. Schlüssel klein geschrieben, Abgleich ohne
// Groß-/Kleinschreibung (wie filtereErklaerungFuerFeld). Unbekannter Feldname: Rohname bleibt stehen.
const FELD_BEZEICHNUNGEN = {
  datum: 'Datierung',
  orte: 'Ort',
  personen: 'Personen',
  personen_id: 'Personenzuordnung',
  kategorien: 'Kategorien',
  bilder: 'Fotos',
  name: 'Name',
  beruf: 'Beruf',
  wirtschaftssektor: 'Wirtschaftssektor',
  umfang: 'Umfang'
};

export function feldBezeichnung(feldname) {
  const roh = String(feldname || '').trim();
  const schluessel = roh.toLowerCase();
  return Object.hasOwn(FELD_BEZEICHNUNGEN, schluessel) ? FELD_BEZEICHNUNGEN[schluessel] : roh;
}

// Für Anzeigen, die die GANZE Anmerkung zeigen (Sidebar, Tooltips): "<feldname>: <Erklärung>" wird zu
// "<Bezeichnung>: <Erklärung>". Ersetzt wird nur ein bekannter Feldname; Einträge ohne Doppelpunkt oder mit
// anderem Text davor bleiben wörtlich. Liste (Pipe-Konvention) wird mit `trenner` verbunden.
export function lesbareAnmerkung(anmerkung, trenner = ' | ') {
  if (!anmerkung) return '';
  const eintraege = Array.isArray(anmerkung) ? anmerkung : [anmerkung];
  return eintraege.map((eintrag) => {
    const text = String(eintrag);
    const doppelpunkt = text.indexOf(':');
    if (doppelpunkt === -1) return text;
    const schluessel = text.slice(0, doppelpunkt).trim().toLowerCase();
    if (!Object.hasOwn(FELD_BEZEICHNUNGEN, schluessel)) return text;
    return `${FELD_BEZEICHNUNGEN[schluessel]}:${text.slice(doppelpunkt + 1)}`;
  }).join(trenner);
}

export function filtereErklaerungFuerFeld(anmerkung, feldname) {
  if (!anmerkung) return '';
  const eintraege = Array.isArray(anmerkung) ? anmerkung : [anmerkung];

  const passende = eintraege
    .filter((eintrag) => {
      const doppelpunkt = eintrag.indexOf(':');
      if (doppelpunkt === -1) return false;
      return eintrag.slice(0, doppelpunkt).trim().toLowerCase() === feldname.toLowerCase();
    })
    .map((eintrag) => eintrag.slice(eintrag.indexOf(':') + 1).trim());

  if (passende.length > 0) {
    return passende.join(' | ');
  }

  // Kein Treffer im festen Format gefunden - gesamten Text als Fallback zeigen.
  return eintraege.join(' | ');
}
