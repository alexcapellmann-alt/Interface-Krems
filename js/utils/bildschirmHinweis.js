// js/utils/bildschirmHinweis.js
// Mindestgrößen-Check + Platzhalter-Komponente für Urkunden-Module mit
// bildschirmfüllender, responsiver Darstellung (Auftrag "Geteilte Viewport-
// Utilities") - verhindert, dass eine Visualisierung auf zu kleinen
// Bildschirmen (Smartphones, kleine Tablets im Hochformat) unbrauchbar
// zusammengequetscht/abgeschnitten dargestellt wird: unterhalb des
// Schwellenwerts ersetzt ein einheitlicher Hinweistext die Visualisierung
// vollständig, statt sie in einem zu kleinen Zustand zu zeigen.
//
// ABGRENZUNG zum bereits bestehenden .kleiner-bildschirm-hinweis (app.js/
// components.css, Abschnitt 4.2): jener ist ein schmaler, gelber Warnhinweis
// NEBEN einer weiterhin dargestellten (nur suboptimalen) Visualisierung
// (Personennetzwerk/Gantt-Diagramm auf mittelgroßen Bildschirmen). Dieses
// Modul hier ist etwas anderes: ein VOLLSTÄNDIGER ERSATZ der Visualisierung
// (unterhalb des Schwellenwerts wird gar nichts von ihr gerendert) - bewusst
// eigenständig benannt und nicht wiederverwendet, um diese beiden
// unterschiedlichen Bedeutungen nicht zu vermischen.

// Startwert lt. Auftrag: 900px Breite UND 500px Höhe - bewusst so gewählt,
// dass gängige Smartphone- und die meisten Tablet-Auflösungen im Hochformat
// darunterfallen (z.B. 375×667, 390×844, 768×1024 im Hochformat teils knapp
// darüber/darunter je nach Gerät), während normale Laptop-/Desktop-Fenster
// darüberliegen. RÜCKMELDUNG AUSSTEHEND (Auftrag, wörtlich): dieser Wert
// bitte nach dem ersten Test an echten Geräten/Fenstergrößen erneut prüfen,
// falls er sich als zu streng/zu locker erweist - siehe CHANGELOG.
export const MINDEST_BREITE = 900;
export const MINDEST_HOEHE = 500;

export function istBildschirmZuKlein(breite, hoehe) {
  return breite < MINDEST_BREITE || hoehe < MINDEST_HOEHE;
}

const HINWEIS_TEXT = 'Diese Visualisierung benötigt einen größeren Bildschirm. '
  + 'Bitte Fenster vergrößern oder einen Desktop-/Laptop-Bildschirm verwenden.';

// role="status" (nicht "alert"): kein dringender Fehler, lediglich ein
// Zustandshinweis, der beim Vergrößern des Fensters von selbst wieder
// verschwindet - dieselbe Dringlichkeitsstufe wie das bereits bestehende
// .kleiner-bildschirm-hinweis (siehe Dateikopf-Kommentar zur Abgrenzung).
export function baueBildschirmHinweis() {
  const wrapper = document.createElement('div');
  wrapper.className = 'bildschirm-zu-klein-hinweis';
  wrapper.setAttribute('role', 'status');
  const text = document.createElement('p');
  text.textContent = HINWEIS_TEXT;
  wrapper.appendChild(text);
  return wrapper;
}

// Eigener <style>-Tag (analog zum bereits etablierten Muster jedes
// Viz-Moduls, sein eigenes Styling zu injizieren, z.B. regestenKachelraster.js'
// fuegeStyleEin()) - vom Aufrufer einmal pro render() aufgerufen.
export function fuegeBildschirmHinweisStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .bildschirm-zu-klein-hinweis { display: flex; align-items: center; justify-content: center;
      text-align: center; min-height: 320px; padding: var(--space-5); }
    .bildschirm-zu-klein-hinweis p { max-width: 420px; margin: 0; color: var(--text-muted); font-size: var(--fs-md); }
  `;
  container.appendChild(style);
}
