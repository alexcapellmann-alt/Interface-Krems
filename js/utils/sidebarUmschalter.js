// js/utils/sidebarUmschalter.js
// Interface-weite Regel (Wunsch des Autors, 2026-10-28): Ein zweiter Klick auf das Feld, das eine Sidebar
// geöffnet hat, klappt sie wieder ein. Gilt für alle Sidebars aus js/utils/sidebar.js' baueSidebarGeruest()
// (Klasse `.bestand-sidebar`), ohne dass jedes Modul dafür eigenen Code braucht.
// Ablauf: Vor jedem Klick (Capture-Phase) wird der Zustand der Sidebars gemerkt; hat der Klick danach eine
// Sidebar geöffnet oder ihren Inhalt gewechselt, gilt das angeklickte Feld als ihr Auslöser. Trifft ein
// späterer Klick denselben Auslöser, während die Sidebar offen ist, wird er abgefangen und stattdessen der
// Schließen-Knopf der Sidebar betätigt - so räumt jedes Modul wie beim Klick auf „×“ selbst auf
// (Auswahl-Markierung, Fokus). Als „dasselbe Feld“ zählt dasselbe Element oder ein neu gezeichnetes Element
// mit demselben d3-Datensatz. Zeichenflächen (<canvas>, z. B. die Bilderwand) regeln das selbst, weil dort
// ein Element viele Felder enthält.

const FELD = 'a, button, [role="button"], [role="option"], [tabindex], tr, li, g, path, circle, rect';
const ausloeser = new WeakMap(); // Sidebar -> { element, datum }

function feldVon(ziel) {
  if (!(ziel instanceof Element) || ziel.closest('.bestand-sidebar, canvas')) return null;
  return ziel.closest(FELD);
}

function gleichesFeld(a, b) {
  if (!a || !b) return false;
  if (a.element === b.element) return true;
  return a.datum != null && a.datum === b.datum; // z. B. Fläche und Beschriftung derselben Kachel
}

const zustand = (sidebar) => ({ offen: sidebar.classList.contains('offen'), titel: sidebar.querySelector('.bestand-sidebar-titel')?.textContent ?? '' });

export function aktiviereSidebarUmschalter(wurzel = document) {
  wurzel.addEventListener('click', (event) => {
    const element = feldVon(event.target);
    if (!element) return;
    const feld = { element, datum: element.__data__ ?? null };

    // Zweiter Klick auf den Auslöser einer offenen Sidebar: schließen statt erneut öffnen
    for (const sidebar of document.querySelectorAll('.bestand-sidebar.offen')) {
      if (!gleichesFeld(ausloeser.get(sidebar), feld)) continue;
      event.preventDefault();
      event.stopImmediatePropagation();
      ausloeser.delete(sidebar);
      [...sidebar.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Sidebar schließen')?.click();
      return;
    }

    // Sonst: merken, ob dieser Klick eine Sidebar öffnet oder ihren Inhalt wechselt
    const vorher = new Map([...document.querySelectorAll('.bestand-sidebar')].map((s) => [s, zustand(s)]));
    setTimeout(() => {
      document.querySelectorAll('.bestand-sidebar').forEach((sidebar) => {
        const jetzt = zustand(sidebar);
        const alt = vorher.get(sidebar) || { offen: false, titel: '' };
        if (!jetzt.offen) { ausloeser.delete(sidebar); return; }
        if (!alt.offen || alt.titel !== jetzt.titel) ausloeser.set(sidebar, feld);
      });
    }, 0);
  }, true);
}
