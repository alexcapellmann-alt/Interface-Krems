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
// Nachbesserung 6, Punkt 8 (Befund 6.1, axe `region`): der Tooltip hängt in <main> (Landmark) statt direkt in <body>.
// position: fixed bleibt (main bildet keinen eigenen Bezugsrahmen), damit auch Lage und aria-describedby unverändert.
// Leert ein Seitenwechsel <main>, wird das Element beim nächsten Zeigen wieder eingehängt.
function tooltipEltern() {
  return document.getElementById('app-content') || document.body;
}

function holeOderErstelleTooltipElement() {
  if (tooltipElement) {
    if (!tooltipElement.isConnected) tooltipEltern().appendChild(tooltipElement);
    return tooltipElement;
  }

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
  tooltipEltern().appendChild(tooltipElement);
  return tooltipElement;
}

// Nachbesserung 6, Punkt 11 (Befund 6.7): die Grenzen sind die Schnittmenge aus Container und sichtbarem Fenster - ein
// Container, der höher oder breiter ist als das Fenster (Strahl, Stammbaum), ließ den Tooltip sonst über den Rand ragen.
function ermittleGrenzen(containerElement) {
  const fenster = { left: 0, top: 0, right: document.documentElement.clientWidth || window.innerWidth, bottom: window.innerHeight };
  if (!containerElement) return fenster;
  const c = containerElement.getBoundingClientRect();
  return {
    left: Math.max(c.left, fenster.left), top: Math.max(c.top, fenster.top),
    right: Math.min(c.right, fenster.right), bottom: Math.min(c.bottom, fenster.bottom)
  };
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
  // Nachbesserung 6, Punkt 11: auch nach dem Umklappen nie über den Rand (z. B. Anker selbst halb außerhalb)
  x = Math.max(grenzen.left, Math.min(x, grenzen.right - tooltipRect.width));
  y = Math.max(grenzen.top, Math.min(y, grenzen.bottom - tooltipRect.height));

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
