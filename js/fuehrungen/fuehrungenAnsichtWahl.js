// js/fuehrungen/fuehrungenAnsichtWahl.js
// Umschalter zwischen den beiden Übersichten der Führungen (Wunsch des Autors, 2026-10-26):
// „Nach Themen“ (Feldraster, #fuehrungen) und „Zeitleiste“ (#fuehrungen/zeitleiste).
// Echte Links (Hash-Routen), die aktuelle Ansicht mit aria-current="page".

export const ZEITLEISTE_SEGMENT = 'zeitleiste';

const ANSICHTEN = [
  { id: 'themen', label: 'Nach Themen', href: '#fuehrungen' },
  { id: 'zeitleiste', label: 'Zeitleiste', href: `#fuehrungen/${ZEITLEISTE_SEGMENT}` }
];

export function baueAnsichtWahl(aktiv) {
  const nav = document.createElement('nav');
  nav.className = 'fuehrungen-ansichtwahl';
  nav.setAttribute('aria-label', 'Ansicht der Führungen');
  ANSICHTEN.forEach((a) => {
    const link = document.createElement('a');
    link.href = a.href;
    link.textContent = a.label;
    if (a.id === aktiv) link.setAttribute('aria-current', 'page');
    nav.appendChild(link);
  });
  return nav;
}
