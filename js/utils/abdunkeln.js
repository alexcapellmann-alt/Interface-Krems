// js/utils/abdunkeln.js
// Nachbesserung 3, Punkt 4 (Befund 7.4, Masterprompt §11): EINE gemeinsame Umsetzung von „Unsicherheiten anzeigen
// dunkelt den Hintergrund ab, unsichere Elemente bleiben hell“ für alle Ansichten mit dem allgemeinen Knopf.
//
// Aufteilung (vgl. Kommentar in js/core/unsicherheitsButton.js – ein Overlay von außen allein kann nicht wissen,
// welches Element unsicher ist):
// - js/core/app.js schaltet am Ansichtscontainer die Klasse ABGEDUNKELT_KLASSE um (setzeAbdunkelung), an genau den
//   Stellen, an denen es options.showUncertainty an das Modul gibt.
// - Jedes Modul kennzeichnet seine unsicheren Elemente (bzw. deren Gruppe) mit HELL_KLASSE (markiereHell /
//   markiereHellElement) – die Unsicherheitslogik dafür hat es ohnehin.
// - css/components.css dunkelt im Modus den Grund der Ansicht ab und blendet alle Grafikelemente, Kartenkacheln,
//   Tabellenzeilen und Kacheln ab, die NICHT hell gekennzeichnet sind. Bedienelemente, Seitenleisten, Legenden und
//   Hinweise bleiben unverändert.
// Ansichten mit eigener, gleichwertiger Abdunkelung (Sankey, Bilderwand) setzen EIGENES_ABDUNKELN_ATTR an ihre
// Zeichenfläche; die gemeinsamen Regeln lassen sie dann aus.

export const ABGEDUNKELT_KLASSE = 'unsicherheit-abgedunkelt';
export const HELL_KLASSE = 'unsicher-hell';
export const EIGENES_ABDUNKELN_ATTR = 'data-eigenes-abdunkeln';

export function setzeAbdunkelung(container, aktiv) {
  if (container) container.classList.toggle(ABGEDUNKELT_KLASSE, Boolean(aktiv));
}

// d3-Auswahl: `praedikat(d)` = Element ist unsicher (und wird im Modus hell gezeigt)
export function markiereHell(auswahl, praedikat) {
  return auswahl.classed(HELL_KLASSE, (d, i, n) => Boolean(praedikat(d, i, n)));
}

export function markiereHellElement(element, hell) {
  if (element) element.classList.toggle(HELL_KLASSE, Boolean(hell));
  return element;
}
