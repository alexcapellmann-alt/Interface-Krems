// js/utils/tooltip.js
// Vertrag: siehe Masterprompt Abschnitt 5b.
// Eine einzige gemeinsame Tooltip-Komponente für alle Visualisierungen – kein
// Visualisierungsmodul baut sich eine eigene Lösung (weder <title> noch eigenes Overlay).

const TOOLTIP_ID = 'geteilter-tooltip';

let tooltipElement = null;
let aktuellerAnker = null;

// Das Tooltip-Element bleibt nach dem Erstellen dauerhaft im DOM und wird nie über
// display:none versteckt: display:none nimmt Inhalte aus dem Accessibility-Tree,
// wodurch aria-describedby bei vielen Screenreadern ins Leere liefe. Stattdessen wird
// es bei versteckeTooltip() unsichtbar (opacity 0) und aus dem sichtbaren Bereich
// herausgeschoben – bleibt aber weiterhin vorlesbar verknüpft, solange aria-describedby
// gesetzt ist.
function holeOderErstelleTooltipElement() {
  if (tooltipElement) return tooltipElement;

  tooltipElement = document.createElement('div');
  tooltipElement.id = TOOLTIP_ID;
  tooltipElement.setAttribute('role', 'tooltip');
  Object.assign(tooltipElement.style, {
    position: 'fixed',
    left: '-9999px',
    top: '-9999px',
    opacity: '0',
    pointerEvents: 'none',
    zIndex: '1000',
    whiteSpace: 'pre-line'
  });
  document.body.appendChild(tooltipElement);
  return tooltipElement;
}

function ermittleGrenzen(containerElement) {
  if (containerElement) {
    return containerElement.getBoundingClientRect();
  }
  return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
}

// Positioniert den Tooltip neben ankerElement, mit Rand-Clamping gegen containerElement
// (Fallback: window). Bei drohendem Überlauf klappt die Seite um (Abschnitt 5b).
function positioniereTooltip(ankerElement, containerElement) {
  const ankerRect = ankerElement.getBoundingClientRect();
  const grenzen = ermittleGrenzen(containerElement);
  const tooltipRect = tooltipElement.getBoundingClientRect();

  let x = ankerRect.left;
  let y = ankerRect.bottom + 6;

  if (x + tooltipRect.width > grenzen.right) {
    x = ankerRect.right - tooltipRect.width;
  }
  if (x < grenzen.left) {
    x = grenzen.left;
  }

  if (y + tooltipRect.height > grenzen.bottom) {
    y = ankerRect.top - tooltipRect.height - 6;
  }
  if (y < grenzen.top) {
    y = grenzen.top;
  }

  tooltipElement.style.left = `${x}px`;
  tooltipElement.style.top = `${y}px`;
}

// AUFTRAG "Visualisierungs-Tab-Leiste statt 'Zurück zur Übersicht'-Link",
// Punkt 3: `inhalt` darf jetzt auch ein DOM-Knoten sein (bisher nur reiner
// Text) - gebraucht für den Tab-Tooltip, der neben dem Namen zusätzlich das
// bereits bestehende vizIcons.js-Icon zeigt. Reine Erweiterung (Node statt
// String), bestehende Aufrufstellen (alle übergeben weiterhin Text) bleiben
// unverändert im Verhalten.
export function zeigeTooltip(inhalt, ankerElement, containerElement) {
  holeOderErstelleTooltipElement();
  if (inhalt instanceof Node) {
    tooltipElement.replaceChildren(inhalt);
  } else {
    tooltipElement.textContent = inhalt;
  }

  if (aktuellerAnker && aktuellerAnker !== ankerElement) {
    aktuellerAnker.removeAttribute('aria-describedby');
  }
  ankerElement.setAttribute('aria-describedby', TOOLTIP_ID);
  aktuellerAnker = ankerElement;

  tooltipElement.style.opacity = '1';
  positioniereTooltip(ankerElement, containerElement);
}

export function versteckeTooltip() {
  if (!tooltipElement) return;

  tooltipElement.style.opacity = '0';
  tooltipElement.style.left = '-9999px';
  tooltipElement.style.top = '-9999px';

  if (aktuellerAnker) {
    aktuellerAnker.removeAttribute('aria-describedby');
    aktuellerAnker = null;
  }
}
