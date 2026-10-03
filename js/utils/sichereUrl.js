// js/utils/sichereUrl.js
// AUFTRAG A "Sicherheit" (Prüfbericht 2026-10-03, Punkt 5b/5e): href-Werte aus
// CSV-Dateien wurden bisher ungeprüft übernommen - ein `javascript:`-Eintrag in
// z.B. literatur.csv wurde beim Klick ausgeführt. Eine zentrale Prüfung statt
// einer Kopie pro Aufrufstelle, damit die Erlaubnisliste nur an einer Stelle steht.
//
// Erlaubt: http, https, mailto, tel sowie Werte ohne Schema (interne Hash-Links
// wie `#literatur` und relative Pfade wie `data/x.pdf`). Alles andere
// (javascript:, data:, vbscript:, file: ...) ergibt keinen Link.

const ERLAUBTE_SCHEMATA = ['http', 'https', 'mailto', 'tel'];
const SCHEMA_MUSTER = /^([a-z][a-z0-9+.-]*):/i;

// Browser ignorieren Steuerzeichen und Leerraum innerhalb des Schemas
// ("java\tscript:" wird als javascript: ausgeführt) - deshalb wird das Schema
// an einer davon bereinigten Fassung bestimmt, nicht am Rohwert.
export function sichereUrl(wert) {
  if (typeof wert !== 'string') return null;
  const getrimmt = wert.trim();
  if (getrimmt === '') return null;
  const kompakt = getrimmt.replace(/[\u0000- \u007f]/g, '');
  const treffer = kompakt.match(SCHEMA_MUSTER);
  if (!treffer) return getrimmt;
  return ERLAUBTE_SCHEMATA.includes(treffer[1].toLowerCase()) ? getrimmt : null;
}

// Liefert für einen CSV-Wert entweder ein <a> mit geprüftem href oder - bei nicht
// erlaubtem Schema - ein <span> mit dem Rohwert als Text (Auftrag: "der Wert wird
// als Text angezeigt"; nicht stillschweigend ausblenden, Masterprompt Abschnitt 15).
// `istLink` sagt der Aufrufstelle, ob Linktext/target/aria-label zu setzen sind.
export function erzeugeLinkOderText(wert) {
  const href = sichereUrl(wert);
  if (href === null) {
    const span = document.createElement('span');
    span.className = 'unzulaessiger-link-wert';
    span.textContent = typeof wert === 'string' ? wert : '';
    return { element: span, istLink: false };
  }
  const link = document.createElement('a');
  link.href = href;
  return { element: link, istLink: true };
}
