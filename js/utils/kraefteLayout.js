// js/utils/kraefteLayout.js
// Nachbesserung 2, Punkt 2 (2026-11-15, Prüfung 14.11.2026, Befunde 1.10 und 10.2): Rechnet eine angehaltene
// d3-Kraftsimulation (`.stop()`) mit einer festen Zahl von Schritten zu Ende, aber verteilt auf mehrere
// Animationsbilder (requestAnimationFrame) in Zeitscheiben von höchstens `budgetMs`. Vorher liefen diese
// Schritte in einer Schleife am Stück und blockierten den Hauptthread (Urkundennetzwerk: 334 ms).
//
// Ergebnis und Endlage sind dieselben wie bei der Schleife: Es werden genau `schritte` Aufrufe von
// simulation.tick() ausgeführt, in derselben Reihenfolge. Gezeichnet wird weiterhin erst, wenn alle Schritte
// gerechnet sind - es entsteht keine sichtbare Animation (deshalb auch bei prefers-reduced-motion geeignet).
// Bei verborgenem Tab (requestAnimationFrame pausiert dort) wird mit setTimeout weitergerechnet.
//
// Rückgabe: { fertig: Promise<boolean>, abbrechen() } - fertig wird mit true aufgelöst, wenn alle Schritte
// gerechnet sind, und mit false, wenn vorher abgebrochen wurde (z. B. destroy() oder neuer Aufbau).

export function rechneSchrittweise(simulation, schritte, { budgetMs = 8 } = {}) {
  let erledigt = 0;
  let abgebrochen = false;
  let rafId = null;
  let timeoutId = null;
  let loese = null;

  const plane = (fn) => {
    if (typeof document !== 'undefined' && document.hidden) timeoutId = setTimeout(fn, 0);
    else rafId = requestAnimationFrame(fn);
  };

  const schritt = () => {
    rafId = null;
    timeoutId = null;
    if (abgebrochen) return;
    const start = performance.now();
    while (erledigt < schritte && performance.now() - start < budgetMs) {
      simulation.tick();
      erledigt += 1;
    }
    if (erledigt >= schritte) loese(true);
    else plane(schritt);
  };

  const fertig = new Promise((resolve) => { loese = resolve; });
  if (schritte <= 0) loese(true);
  else plane(schritt);

  return {
    fertig,
    abbrechen() {
      if (abgebrochen) return;
      abgebrochen = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (timeoutId !== null) clearTimeout(timeoutId);
      loese(false);
    }
  };
}
