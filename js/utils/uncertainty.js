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
