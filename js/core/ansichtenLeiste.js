// js/core/ansichtenLeiste.js
// Dritte Navigationsebene (Wunsch des Autors, 2026-10-27): Ist eine Ansicht geöffnet (z. B. die Zeitachse
// im Bereich Urkunden oder die Treemap im Bestand), steht unter der Bereichs-Leiste eine Reihe mit allen
// Ansichten dieses Bereichs; die aktuelle ist wie „Urkunden“ darüber hervorgehoben. Ergänzt die
// Hover-Flyouts (visualisierungsTabs.js), ersetzt sie nicht.
//
// Gleiches Aussehen wie bereichsLeiste.js (.bereichs-leiste); die Reihe beginnt waagrecht unter dem
// aktiven Eintrag der Ebene darüber (Bereichs-Pille bzw. „Bestand“ in der Hauptnavigation), solange
// sie dort in die Breite passt.

const RESIZE_DEBOUNCE_MS = 150;

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .ansichten-leiste-huelle { margin: 0 calc(-1 * var(--space-4)); padding: 0 var(--space-4);
      background: var(--bg); border-top: 1px solid var(--border); box-shadow: var(--shadow); }
    .ansichten-leiste-huelle:first-child { margin-top: calc(-1 * var(--space-4)); border-top: none; }
    .ansichten-leiste { display: flex; flex-wrap: wrap; gap: var(--space-1); font-size: var(--fs-sm); }
    .ansichten-leiste a { display: inline-flex; align-items: center; min-height: 40px; padding: var(--space-1) var(--space-3);
      text-decoration: none; color: var(--text); font-weight: 500; border-radius: var(--radius); }
    .ansichten-leiste a:hover { background: var(--surface); }
    .ansichten-leiste a:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .ansichten-leiste a[aria-current="page"] { background: var(--accent); color: var(--surface); font-weight: 600; }
  `;
  container.appendChild(style);
}

// options.ansichten: [{ id, label }], options.aktiveId, options.zielFuer(id) -> Hash ohne '#',
// options.onAuswahl(id), options.ausrichtenAn: Element, unter dem die Reihe beginnen soll
export function erzeugeAnsichtenLeiste(bereich, { ansichten, aktiveId, zielFuer, onAuswahl, ausrichtenAn, bereichLabel }) {
  const huelle = document.createElement('div');
  huelle.className = 'ansichten-leiste-huelle';
  fuegeStyleEin(huelle);
  const nav = document.createElement('nav');
  nav.className = 'ansichten-leiste';
  nav.setAttribute('aria-label', bereichLabel ? `Ansichten: ${bereichLabel}` : 'Ansichten');
  const links = new Map();
  ansichten.forEach((a) => {
    const link = document.createElement('a');
    link.href = `#${zielFuer(a.id)}`;
    link.textContent = a.label;
    link.addEventListener('click', (e) => { e.preventDefault(); onAuswahl(a.id); });
    links.set(a.id, link);
    nav.appendChild(link);
  });
  huelle.appendChild(nav);
  bereich.appendChild(huelle);

  const setzeAktiv = (id) => links.forEach((link, lid) => {
    if (lid === id) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  setzeAktiv(aktiveId);

  const ausrichten = () => {
    nav.style.marginLeft = '0px';
    if (!ausrichtenAn?.isConnected) return;
    const versatz = ausrichtenAn.getBoundingClientRect().left - nav.getBoundingClientRect().left;
    const inhalt = [...links.values()].reduce((summe, l) => summe + l.getBoundingClientRect().width + 4, 0);
    // nur verschieben, wenn die Reihe dann noch in eine Zeile passt
    nav.style.marginLeft = versatz > 0 && versatz + inhalt <= nav.clientWidth ? `${versatz}px` : '0px';
  };
  ausrichten();
  document.fonts?.ready?.then(ausrichten);
  let timer = null;
  const beiResize = () => { clearTimeout(timer); timer = setTimeout(ausrichten, RESIZE_DEBOUNCE_MS); };
  window.addEventListener('resize', beiResize);

  return {
    aktualisiere(id) { setzeAktiv(id); },
    destroy() { clearTimeout(timer); window.removeEventListener('resize', beiResize); huelle.remove(); }
  };
}
