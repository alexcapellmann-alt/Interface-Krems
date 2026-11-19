// js/utils/zoomSteuerung.js – gemeinsame Zoom-Knöpfe (−, ⟷, +) für Ansichten mit Zeitachsen-Zoom
// Schnittstelle: erzeugeZoomSteuerung(container) → die drei Knöpfe; die Klick-Handler hängt der Aufrufer an (kennt
//   d3.zoom() selbst nicht).
// Barrierefreiheit: title und aria-label je Knopf, role="group" mit aria-label; sichtbarer Rahmen in Ruhe
//   (var(--text-muted)), bei Hover oder Fokus Akzentfarbe.
// Genutzt von ganttDiagramm.js und dotPlot.js. Hintergrund: docs/MODULNOTIZEN.md, Abschnitt zoomSteuerung.js.

function fuegeStyleEinmaligEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .zoom-steuerung { display: flex; flex: 0 0 auto; border: 1px solid var(--text-muted);
      border-radius: var(--radius); overflow: hidden; }
    .zoom-steuerung:has(button:hover), .zoom-steuerung:has(button:focus-visible) { border-color: var(--accent); }
    .zoom-steuerung button { min-width: 44px; min-height: 44px; border: none; border-left: 1px solid var(--text-muted);
      background: var(--surface); font: inherit; font-size: var(--fs-lg); cursor: pointer; }
    .zoom-steuerung button:first-child { border-left: none; }
    .zoom-steuerung button:hover { background: var(--bg); }
    .zoom-steuerung button:focus-visible { outline: 3px solid var(--accent); outline-offset: -3px;
      position: relative; z-index: 1; }
  `;
  container.appendChild(style);
}

// Baut die Drei-Button-Gruppe in `container` und gibt die Button-Elemente
// zurück (KEINE Klick-Listener angehängt - siehe docs/MODULNOTIZEN.md, das
// bleibt Sache des Aufrufers, sobald dessen zoomVerhalten existiert).
export function erzeugeZoomSteuerung(container) {
  fuegeStyleEinmaligEin(container);

  const gruppe = document.createElement('div');
  gruppe.className = 'zoom-steuerung';
  gruppe.setAttribute('role', 'group');
  gruppe.setAttribute('aria-label', 'Zeitachsen-Zoom');

  const btnRaus = document.createElement('button');
  btnRaus.type = 'button';
  btnRaus.textContent = '−';
  btnRaus.title = 'Verkleinern';
  btnRaus.setAttribute('aria-label', 'Zeitachse verkleinern');

  const btnReset = document.createElement('button');
  btnReset.type = 'button';
  btnReset.textContent = '⟷';
  btnReset.title = 'Zeitachse zurücksetzen';
  btnReset.setAttribute('aria-label', 'Zeitachsen-Zoom zurücksetzen');

  const btnRein = document.createElement('button');
  btnRein.type = 'button';
  btnRein.textContent = '+';
  btnRein.title = 'Vergrößern';
  btnRein.setAttribute('aria-label', 'Zeitachse vergrößern');

  gruppe.append(btnRaus, btnReset, btnRein);
  container.appendChild(gruppe);

  return { gruppe, raus: btnRaus, reset: btnReset, rein: btnRein };
}
