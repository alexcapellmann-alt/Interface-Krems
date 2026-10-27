// js/utils/unterleistenSchalter.js
// Schalter zum Einklappen der Unterleisten (Wunsch des Autors, 2026-10-27): Ein Klick auf den Pfeil
// (Chevron) rechts in der Kopfzeile blendet alle Leisten unter der Hauptnavigation aus (Bereichs-Leiste
// „Urkunden / Personen / Orte“ und Ansichten-Leiste) und gibt der Ansicht mehr Platz; ein zweiter Klick
// holt sie zurück. Sichtbar ist der Schalter nur auf Seiten, die solche Leisten haben (CSS :has).
// Der Zustand gilt für diesen Browser (localStorage, abgesichert; ohne Speicher einfach ausgeklappt).

const SPEICHER_SCHLUESSEL = 'interface-krems-unterleisten-eingeklappt';
const PFEIL = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 10l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function liesZustand() {
  try { return localStorage.getItem(SPEICHER_SCHLUESSEL) === 'ja'; } catch { return false; }
}
function speichereZustand(eingeklappt) {
  try { localStorage.setItem(SPEICHER_SCHLUESSEL, eingeklappt ? 'ja' : 'nein'); } catch { /* ohne Speicher */ }
}

export function erzeugeUnterleistenSchalter(kopfzeile) {
  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = 'unterleisten-schalter';
  knopf.innerHTML = PFEIL;
  const setze = (eingeklappt) => {
    document.body.classList.toggle('unterleisten-eingeklappt', eingeklappt);
    const text = eingeklappt ? 'Unterleisten einblenden' : 'Unterleisten einklappen';
    knopf.setAttribute('aria-label', text);
    knopf.title = text;
    knopf.setAttribute('aria-expanded', String(!eingeklappt));
  };
  setze(liesZustand());
  knopf.addEventListener('click', () => {
    const eingeklappt = !document.body.classList.contains('unterleisten-eingeklappt');
    setze(eingeklappt);
    speichereZustand(eingeklappt);
    // Ansichten messen ihre Fläche beim Größenwechsel neu (app.js' resize-Verdrahtung)
    window.dispatchEvent(new Event('resize'));
  });
  kopfzeile.appendChild(knopf);
  return knopf;
}
