// js/utils/liveAnsage.js
// Nachbesserung 6, Punkt 10 (Befund 6.8): Trefferzahlen nach Suche und Filter für Bildschirmleser ansagen – eine
// unsichtbare, höfliche Statusregion (Muster der Statusregion der Bestandsuche). Angesagt wird erst nach einer kurzen
// Pause (keine Dauerdurchsage beim Tippen) und nur, wenn sich der Text geändert hat (Blättern und Sortieren mit
// gleicher Trefferzahl bleiben still).

export function erzeugeLiveAnsage(eltern, { verzoegerungMs = 700 } = {}) {
  const element = document.createElement('div');
  element.className = 'nur-fuer-hilfsmittel live-ansage';
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
  element.setAttribute('aria-atomic', 'true');
  eltern.appendChild(element);
  let timer = null;
  let letzter = null;
  return {
    element,
    ansagen(text) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (text === letzter) return;
        letzter = text;
        element.textContent = text;
      }, verzoegerungMs);
    },
    // erster Stand ohne Ansage (beim Öffnen der Ansicht soll nichts vorgelesen werden)
    merke(text) { letzter = text; },
    destroy() { clearTimeout(timer); element.remove(); }
  };
}
