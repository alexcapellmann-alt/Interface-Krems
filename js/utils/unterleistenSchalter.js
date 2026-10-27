// js/utils/unterleistenSchalter.js
// Schalter zum Einklappen der Unterleisten (Wunsch des Autors, 2026-10-27): ein kleiner Reiter mit Pfeil
// (Chevron), der rechts an der Unterkante der untersten aufgeklappten Leiste hängt. Ein Klick blendet alle
// Leisten unter der Hauptnavigation aus (Bereichs-Leiste „Urkunden / Personen / Orte“ und Ansichten-Leiste);
// der Reiter hängt dann unter der Kopfzeile, ein zweiter Klick holt die Leisten zurück.
// Sichtbar nur auf Seiten mit solchen Leisten (.bereichs-leiste-bereich). Die Lage wird gemessen, weil die
// Leisten je nach Seite eine oder zwei Zeilen haben und erst nach dem Laden entstehen.
// Der Zustand gilt für diesen Browser (localStorage, abgesichert; ohne Speicher einfach ausgeklappt).

const SPEICHER_SCHLUESSEL = 'interface-krems-unterleisten-eingeklappt';
const PFEIL = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 10l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function liesZustand() {
  try { return localStorage.getItem(SPEICHER_SCHLUESSEL) === 'ja'; } catch { return false; }
}
function speichereZustand(eingeklappt) {
  try { localStorage.setItem(SPEICHER_SCHLUESSEL, eingeklappt ? 'ja' : 'nein'); } catch { /* ohne Speicher */ }
}

export function erzeugeUnterleistenSchalter() {
  const kopf = document.querySelector('.app-header');
  const inhalt = document.getElementById('app-content');
  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = 'unterleisten-schalter';
  knopf.innerHTML = PFEIL;
  knopf.hidden = true;
  document.body.appendChild(knopf);

  // An die Unterkante der untersten sichtbaren Leiste (eingeklappt: der Kopfzeile) hängen
  function platziere() {
    const bereich = document.querySelector('.bereichs-leiste-bereich');
    knopf.hidden = !bereich;
    if (!bereich) return;
    const eingeklappt = document.body.classList.contains('unterleisten-eingeklappt');
    const bezug = eingeklappt ? kopf : bereich;
    knopf.style.top = `${bezug.getBoundingClientRect().bottom + window.scrollY}px`;
  }

  const setze = (eingeklappt) => {
    document.body.classList.toggle('unterleisten-eingeklappt', eingeklappt);
    const text = eingeklappt ? 'Unterleisten einblenden' : 'Unterleisten einklappen';
    knopf.setAttribute('aria-label', text);
    knopf.title = text;
    knopf.setAttribute('aria-expanded', String(!eingeklappt));
    platziere();
  };
  setze(liesZustand());
  knopf.addEventListener('click', () => {
    const eingeklappt = !document.body.classList.contains('unterleisten-eingeklappt');
    setze(eingeklappt);
    speichereZustand(eingeklappt);
    // Ansichten messen ihre Fläche beim Größenwechsel neu (app.js' resize-Verdrahtung)
    window.dispatchEvent(new Event('resize'));
  });

  // Leisten entstehen und verschwinden mit jedem Seitenwechsel; ihre Höhe ändert sich beim Aufbau
  const groesse = new ResizeObserver(platziere);
  groesse.observe(kopf);
  let beobachteterBereich = null;
  const folgeBereich = () => {
    const bereich = document.querySelector('.bereichs-leiste-bereich');
    if (bereich !== beobachteterBereich) {
      if (beobachteterBereich) groesse.unobserve(beobachteterBereich);
      if (bereich) groesse.observe(bereich);
      beobachteterBereich = bereich;
    }
    platziere();
  };
  new MutationObserver(folgeBereich).observe(inhalt, { childList: true });
  window.addEventListener('resize', platziere);
  folgeBereich();
  return knopf;
}
