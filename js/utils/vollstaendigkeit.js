// js/utils/vollstaendigkeit.js
// Nachbesserung 3, Punkt 3 (Befund 3.4, Masterprompt §12 „Fehlermarkierung“): EINE gemeinsame Prüfung und
// Kennzeichnung unvollständiger Datensätze für alle Visualisierungen (DRY wie bestandsHierarchie.js).
//
// Unvollständig ist ein Datensatz, dem ein MINDESTFELD fehlt. Mindestfelder nach Masterprompt §12: „eindeutige
// ID/Signatur, Bezeichnung“ (Entscheidung des Autors, 15.11.2026). Andere leere Werte (z. B. Urkunde ohne Personen,
// Ort ohne Koordinaten, Bestand ohne Zeitraum) sind KEINE Unvollständigkeit in diesem Sinn – dafür haben die Ansichten
// eigene Bereiche („undatiert“, „ohne Koordinaten“ usw.).
//
// Der DataLoader trägt je Datensatz nur den Dateinamen ein (`_quelle`, generisch, ohne Import); welche Felder
// Mindestfelder sind, steht allein hier. Geprüft wird bei Bedarf, das Ergebnis je Datensatz zwischengespeichert.

// Kennzeichnung: Bernstein (`--unvollstaendig`, #b45309), DURCHGEZOGENER Rahmen – deutlich verschieden von der
// Unsicherheit (rot #c0392b, gestrichelt). Tooltip-Text „Datensatz unvollständig“ (Masterprompt §12).

export const UNVOLLSTAENDIG_TEXT = 'Datensatz unvollständig';
export const UNVOLLSTAENDIG_FARBE = '#b45309'; // für Canvas-Zeichnungen; in CSS: var(--unvollstaendig)
export const UNVOLLSTAENDIG_KLASSE = 'datensatz-unvollstaendig';

// Dateiname (ohne Ordner) -> Mindestfelder [ID/Signatur, Bezeichnung]
const MINDESTFELDER = {
  'urkunden.csv': ['signatur', 'regest'],
  'bestandsverzeichnis.csv': ['kuerzel', 'name'],
  'buergerbuch.csv': ['id', 'Name'],
  'verlassenschaftsinventare.csv': ['id', 'Name'],
  'personenliste.csv': ['personen_id', 'schreibweisen'],
  'orte.csv': ['orte_id', 'orte'],
  'familien.csv': ['id', 'name']
};

// Nachbesserung 7, Punkt 1: für Dateien, die oben nicht stehen, gelten die üblichen Schlüsselspalten als Mindestfelder
// (geprüft nur, wenn die Spalte vorhanden ist)
const ID_SPALTEN = ['signatur', 'id', 'kuerzel', 'personen_id', 'orte_id'];

function istLeer(wert) {
  if (Array.isArray(wert)) return wert.length === 0;
  return wert == null || String(wert).trim() === '';
}

const zwischenspeicher = new WeakMap();

// Liste der leeren Mindestfelder dieses Datensatzes (leer = vollständig). Unbekannte Quelle: keine Prüfung.
// Eine ganz fehlende Spalte meldet nicht diese Prüfung je Zeile, sondern die Ansichts-Prüfung (datenAnforderungen.js).
export function fehlendeMindestfelder(record) {
  if (!record || typeof record !== 'object') return [];
  if (zwischenspeicher.has(record)) return zwischenspeicher.get(record);
  const felder = MINDESTFELDER[record._quelle] || ID_SPALTEN; // Nachbesserung 7: unbekannte Datei → Schlüsselspalten
  const fehlend = felder.filter((f) => Object.hasOwn(record, f) && istLeer(record[f]));
  zwischenspeicher.set(record, fehlend);
  return fehlend;
}

export function istUnvollstaendig(record) {
  return fehlendeMindestfelder(record).length > 0;
}

// Tooltip-/Beschriftungstext; mit `mitFeldern` zusätzlich, welche Angabe fehlt.
export function unvollstaendigText(record, { mitFeldern = true } = {}) {
  if (!istUnvollstaendig(record)) return '';
  return mitFeldern ? `${UNVOLLSTAENDIG_TEXT} (fehlt: ${fehlendeMindestfelder(record).join(', ')})` : UNVOLLSTAENDIG_TEXT;
}

// Stellt den Hinweis einem bestehenden Tooltip-Text voran (Text oder Zeilen mit "\n").
export function mitUnvollstaendigHinweis(record, text) {
  const hinweis = unvollstaendigText(record);
  if (!hinweis) return text;
  return text ? `${hinweis}\n${text}` : hinweis;
}

// HTML-Element kennzeichnen (Kachel, Tabellenzeile, Listeneintrag): Klasse + zugänglicher Name/Titel.
export function markiereElement(element, record) {
  if (!element || !istUnvollstaendig(record)) return element;
  element.classList.add(UNVOLLSTAENDIG_KLASSE);
  element.dataset.unvollstaendig = fehlendeMindestfelder(record).join(',');
  if (!element.getAttribute('title')) element.setAttribute('title', unvollstaendigText(record));
  return element;
}

// d3-Auswahl von SVG-Elementen kennzeichnen; `recordVon(d)` liefert den Datensatz zum gebundenen Datum.
// Die Klasse setzt Rahmenfarbe/-stärke per CSS (stärker als die Präsentationsattribute der Module).
export function markiereSvg(auswahl, recordVon = (d) => d) {
  auswahl
    .classed(UNVOLLSTAENDIG_KLASSE, (d) => istUnvollstaendig(recordVon(d)))
    .attr('data-unvollstaendig', (d) => (istUnvollstaendig(recordVon(d)) ? fehlendeMindestfelder(recordVon(d)).join(',') : null));
  return auswahl;
}
