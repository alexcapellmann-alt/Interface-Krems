// js/utils/zoomSteuerung.js
// Gemeinsame Zoom-Button-Leiste (−/⟷/+) für Module mit Zeitachsen-Zoom/Pan
// (Auftrag "Dot Plot – Nachbesserungen", Punkt 3) - ausgelagert aus
// ganttDiagramm.js/dotPlot.js, VORLAGE für weitere Urkunden-Module mit
// Zeitachse. Baustein-Muster wie kategorieFarben.js/sidebar.js/
// beschriftung.js: kennt selbst NICHTS über d3.zoom(), die konkrete Skala
// oder das Timing der Zoom-Erzeugung (Nicht-Ziel laut Auftrag: "Keine
// Änderung an der Zoom-/Pan-Logik selbst"). Baut nur DOM+Optik und gibt die
// drei <button>-Elemente an den Aufrufer zurück - der hängt die
// click-Listener selbst an, GENAU wie zuvor lokal in ganttDiagramm.js/
// dotPlot.js (dort erst am Ende der Zeichenfunktion möglich, weil
// zoomVerhalten erst nach dem SVG-Aufbau existiert, die Werkzeugleiste aber
// VOR dem SVG gebaut wird - siehe Aufrufstellen).
//
// Beschriftung (Auftrag Punkt 3): title-Attribut (Tooltip bei Hover) +
// aria-label je Button, kein zusätzlicher sichtbarer Text.
//
// Rahmen (Auftrag Punkt 3, "zusätzlich eine Umrandung zur deutlicheren
// visuellen Abgrenzung"): die Gruppe TRÄGT SELBST eine Umrandung (statt
// jeder Button einzeln, wie zuvor in .gantt-zoom-buttons/
// .dotplot-zoom-buttons) - Trennlinien zwischen den Buttons per
// border-left, die Gruppen-Umrandung nimmt bei Hover/Fokus EINES der
// Buttons per :has() die Akzentfarbe an (dezenter grauer Rahmen ->
// Akzentfarbe, wie gefordert). role="group" + aria-label fasst die drei
// Buttons semantisch als zusammengehörige Steuerung zusammen.
//
// NACHBESSERUNG (Auftrag "Zentraler Fix für urkundenZeit.js + Permanente
// Button-Umrandung", Teil B) - Root Cause: der Ruhezustand-Rahmen nutzte
// `var(--border)` (#ddd8cf) - gegen den umgebenden `var(--bg)` (#f7f5f0) UND
// den eigenen `var(--surface)`-Button-Hintergrund (#ffffff) liegen alle drei
// Farbtöne so nah beieinander (helles Beige/Weiß), dass der 1px-Rahmen im
// Ruhezustand PRAKTISCH unsichtbar war - keine CSS-Logik verhinderte ihn
// (er war nie an :hover/:focus gebunden), er ging nur im Kontrast unter.
// Fix: Ruhezustand nutzt jetzt `var(--text-muted)` (#595959, bereits im
// Design-System für sekundären, aber klar lesbaren Text etabliert - siehe
// z.B. ganttDiagramm.js' .gantt-kopf-namensplatzhalter) statt
// `var(--border)` - deutlich höherer Kontrast gegen sowohl `--bg` als auch
// `--surface`, bleibt aber "dezent" (Grauton, nicht die Akzentfarbe selbst).
// Hover/Fokus wechseln weiterhin auf `var(--accent)` (stärkere Hervorhebung
// bei Interaktion) - der Rahmen selbst ist jetzt aber in JEDEM Zustand
// erkennbar, nicht erst ab Hover.

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
// zurück (KEINE Klick-Listener angehängt - siehe Dateikopf-Kommentar, das
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
