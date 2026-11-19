// js/config/constants.js – rein technische Konstanten (archivarische Inhalte stehen in data/*.csv)
// CAT_COLORS: Farben der Urkunden-Kategorien (je ≥ 4,5:1 nachjustiert; `default` und `__unbekannt__` gleich grau);
// ACHSEN_SCHRIFTGROESSE: einheitliche Achsenschrift (14 px, als JS-Wert, weil SVG-Attribute kein var() auflösen);
// UNSICHERHEIT_SYMBOL, UNSICHERHEIT_SYMBOL_LABEL: Zeichen und Name der Unsicherheitskennzeichnung.
// Abhängigkeiten: keine. Herleitung der Farben und Messwerte: docs/MODULNOTIZEN.md, Abschnitt constants.js.

export const ACHSEN_SCHRIFTGROESSE = 14;

// AUFTRAG "Teil 2f", Punkt 1: EINE zentrale Konstante für das
// Unsicherheitssymbol, ersetzt sowohl die sieben bisherigen lokalen
// `WARN_SYMBOL = '⚠'`-Kopien (circlePacking.js/familienbaum.js/
// ganttDiagramm.js/icicle.js/regestenKachelraster.js/sunburst.js/
// treemap.js) als auch die wörtlichen '⚠'-Vorkommen in
// js/utils/sidebar.js, js/utils/unsicherheitHinweis.js,
// js/fuehrungen/belegDarstellung.js und js/core/unsicherheitsButton.js -
// jedes betroffene Modul importiert ab jetzt ausschließlich von hier.
// σ (U+03C3, GRIECHISCHES KLEINES SIGMA) statt ⚠: bewusst nicht
// wiederverwendet für die ANDERE Bedeutung "Fehler"/Prüfregel-Verstoß
// (siehe js/fuehrungen/belegDarstellung.js' `baueFehlerBox()`/
// `.fuehrung-fehler` in css/components.css - die verwenden weiterhin den
// Text "Fehler: " ohne Icon, kein ⚠/σ-Konflikt vorhanden, live geprüft).
// `UNSICHERHEIT_SYMBOL_LABEL`: gemeinsamer zugänglicher Name für Stellen,
// an denen σ ohne begleitenden sichtbaren Text steht (z. B. die reinen
// SVG-Icon-Marker in den sieben Viz-Modulen, dort `aria-hidden="true"` +
// Bedeutung über das umgebende Element/Tooltip vermittelt, unverändert
// aus der bisherigen ⚠-Konvention) - an Stellen mit sichtbarem
// Begleittext (z. B. "σ Unsicherheiten anzeigen") liefert bereits der
// Text selbst eine zugängliche Bezeichnung, dort wird diese Konstante
// nicht zusätzlich gebraucht.
export const UNSICHERHEIT_SYMBOL = 'σ';
export const UNSICHERHEIT_SYMBOL_LABEL = 'Unsicherheit';

export const CAT_COLORS = {
  'Bevölkerung': '#952323',
  'Bildung und Erziehung': '#da8f62',
  'Gesundheit': '#a68527',
  'Grund und Boden': '#cbda62',
  'Kultur': '#5c9523',
  'Medien': '#71da62',
  'Politik': '#23953f',
  'Privatvermögen': '#62daad',
  'Rechtswesen': '#239595',
  'Religion': '#62adda',
  'Soziales Leben': '#233f95',
  'Stadt und Raum': '#7162da',
  'Verkehr, Ver- und Entsorgung': '#5c2395',
  'Vermögen und Finanzen': '#cb62da',
  'Verwaltung': '#952378',
  'Wirtschaft': '#da628f',
  default: '#888888',
  __unbekannt__: '#888888'
};
