// js/viz/ortsliste.js
// Ortsliste (Wunsch des Autors, 2026-10-28): sortier- und durchsuchbare Tabelle aller Orte aus orte.csv
// mit der Zahl ihrer Nennungen in den Quellen - Urkunden (`orte`, mehrere je Urkunde) und
// Verlassenschaftsinventare (`Ort (Schaetzung)`). Das Bürgerbuch hat keine Ortsspalte.
// Aufbau, Sortierung, Suche und Seitenleiste wie js/viz/personenliste.js. Klick auf eine Zeile zeigt die
// Quelleneinträge in der Sidebar (ein Treffer: Detail, mehrere: Liste nach Quelle getrennt).
// „σ Unsicherheiten anzeigen“ zeigt wie die Karte nur Orte, die in orte.csv als unsicher markiert sind
// (`orte_unsicher`), mit der Anmerkung als Tooltip.
// Ortsnamen in Regesten-Kacheln und Urkunden-Sidebars verlinken über den Datensatzaufruf
// (typ `ort`, js/utils/datensatzAufruf.js) hierher - Kennung ist der Ortsname wie in urkunden.csv.
// Modul-Interface siehe Abschnitt 5.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { infotextFuerModul } from '../core/archivKonfiguration.js';
import { baueUnsicherheitAbsatz } from '../utils/unsicherAbsatz.js';
import { ortBezug } from '../beteiligung/bezuege.js'; // Partizipations-Modul
import { UNSICHERHEIT_SYMBOL } from '../config/constants.js';
import { alsText } from '../utils/textwert.js';
import {
  baueSidebarGeruest, fuegeSidebarStyleEin, schliesseSidebar,
  baueUrkundenListeInhalt, baueUrkundenDetailInhalt
} from '../utils/sidebar.js';
import { baueInventarListeInhalt, baueInventarDetailInhalt } from './personenliste.js';

const SEITENGROESSE = 100;
const INVENTAR_ORT = 'Ort (Schaetzung)';

let instanz = null; // { container, orte, options, sortierung, suchbegriff, exaktName, aktuelleSeite, infoButton, sidebar, hinweisElement }
let sidebarListenZustand = null; // zuletzt gezeigte Liste eines Ortes, Ziel des Zurück-Knopfs

const liste = (wert) => (Array.isArray(wert) ? wert : (wert ? [wert] : [])).map((x) => String(x).trim()).filter(Boolean);
const jahrVon = (wert) => { const j = parseInt(alsText(wert), 10); return Number.isFinite(j) ? j : null; };

// Ein Eintrag je Ort aus orte.csv; Urkunden und Inventare werden über den Ortsnamen zugeordnet
function baueOrte(orteRecords, urkunden, inventare) {
  const nachName = new Map();
  orteRecords.forEach((r) => {
    const name = alsText(r.orte).trim();
    if (!name) return;
    nachName.set(name, { name, record: r, urkunden: [], inventare: [], jahre: [] });
  });
  urkunden.forEach((u) => {
    new Set(liste(u.orte)).forEach((name) => {
      const ort = nachName.get(name);
      if (!ort) return;
      ort.urkunden.push(u);
      const j = jahrVon(u.jahr);
      if (j !== null) ort.jahre.push(j);
    });
  });
  inventare.forEach((v) => {
    const ort = nachName.get(alsText(v[INVENTAR_ORT]).trim());
    if (!ort) return;
    ort.inventare.push(v);
    const j = jahrVon(v.Jahr);
    if (j !== null) ort.jahre.push(j);
  });
  return [...nachName.values()].map((ort) => ({
    ...ort,
    nennungen: ort.urkunden.length + ort.inventare.length,
    erste: ort.jahre.length ? Math.min(...ort.jahre) : null,
    letzte: ort.jahre.length ? Math.max(...ort.jahre) : null,
    unsicher: Boolean(ort.record.orte_unsicher),
    anmerkung: alsText(ort.record.unsicherheit_anmerkung).trim()
  }));
}

const SPALTEN = [
  { schluessel: 'name', label: 'Ort', typ: 'text', wertFn: (o) => o.name },
  {
    schluessel: 'quellen', label: 'Quellen', typ: 'text',
    wertFn: (o) => [o.urkunden.length ? 'Urkunden' : '', o.inventare.length ? 'Verlassenschaftsinventare' : ''].filter(Boolean).join(', ')
  },
  { schluessel: 'nennungen', label: 'Nennungen', typ: 'zahl', wertFn: (o) => o.nennungen },
  { schluessel: 'erste', label: 'Erste Nennung', typ: 'zahl', wertFn: (o) => o.erste },
  { schluessel: 'letzte', label: 'Letzte Nennung', typ: 'zahl', wertFn: (o) => o.letzte }
];

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .ol-werkzeugleiste { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
    .ol-suche { padding: 4px; width: 100%; max-width: 320px; box-sizing: border-box; }
    .ol-tabelle { border-collapse: collapse; width: 100%; font-size: 13px; }
    .ol-tabelle th, .ol-tabelle td { border-bottom: 1px solid #ddd; padding: 4px 8px; text-align: left; }
    .ol-tabelle th { cursor: pointer; user-select: none; background: #f4f4f4; position: sticky; top: 0; }
    .ol-sortier-pfeil { margin-left: 4px; font-size: 10px; color: #555; }
    .ol-unsicher-symbol { color: var(--fuehrung-unsicher, #8a6d1f); font-weight: 700; margin-right: 4px; }
    .ol-paginierung { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 13px; }
    .ol-paginierung-oben { margin-bottom: 8px; }
    .ol-paginierung-unten { margin-top: 8px; }
    .ol-paginierung button { min-height: 32px; padding: 4px 10px; cursor: pointer; }
    .ol-paginierung button:disabled { cursor: default; opacity: 0.5; }
    .ol-zeile { cursor: pointer; }
    .ol-zeile:hover { background: #f7f7f7; }
    .ol-zeile:focus-visible { outline: 3px solid var(--accent); outline-offset: -3px; }
    .bestand-sidebar h4 { margin: var(--space-3) 0 var(--space-2); font-size: var(--fs-sm); color: var(--text-muted); }
  `;
  container.appendChild(style);
}

function vergleicheWerte(a, b, typ) {
  if (a === b) return 0;
  if (a === null || a === undefined || a === '') return 1;
  if (b === null || b === undefined || b === '') return -1;
  if (typ === 'zahl') return a - b;
  return String(a).localeCompare(String(b), 'de', { sensitivity: 'base', numeric: true });
}

function sortiere(orte, sortierung) {
  const spalte = SPALTEN.find((s) => s.schluessel === sortierung.schluessel);
  const sortiert = [...orte].sort((a, b) => vergleicheWerte(spalte.wertFn(a), spalte.wertFn(b), spalte.typ)
    || a.name.localeCompare(b.name, 'de'));
  if (sortierung.richtung === 'auf') return sortiert;
  // absteigend: leere Werte bleiben trotzdem am Ende, Gleichstände alphabetisch
  return [...orte].sort((a, b) => {
    const wa = spalte.wertFn(a), wb = spalte.wertFn(b);
    const leerA = wa === null || wa === '', leerB = wb === null || wb === '';
    if (leerA !== leerB) return leerA ? 1 : -1;
    return vergleicheWerte(wb, wa, spalte.typ) || a.name.localeCompare(b.name, 'de');
  });
}

function filtere(orte) {
  const { suchbegriff, exaktName, options } = instanz;
  let ergebnis = options.showUncertainty ? orte.filter((o) => o.unsicher) : orte;
  if (exaktName) return ergebnis.filter((o) => o.name === exaktName);
  const begriff = (suchbegriff || '').trim().toLowerCase();
  if (begriff) ergebnis = ergebnis.filter((o) => o.name.toLowerCase().includes(begriff) || alsText(o.record.orte_id).toLowerCase().includes(begriff));
  return ergebnis;
}

function baueKopfzeile(tabelle) {
  const { sortierung } = instanz;
  const kopf = tabelle.createTHead().insertRow();
  SPALTEN.forEach((spalte) => {
    const th = document.createElement('th');
    const beschriftung = document.createElement('span');
    beschriftung.textContent = spalte.label;
    th.appendChild(beschriftung);
    if (sortierung.schluessel === spalte.schluessel) {
      const pfeil = document.createElement('span');
      pfeil.className = 'ol-sortier-pfeil';
      pfeil.textContent = sortierung.richtung === 'auf' ? '▲' : '▼';
      pfeil.setAttribute('aria-hidden', 'true');
      th.appendChild(pfeil);
      th.setAttribute('aria-sort', sortierung.richtung === 'auf' ? 'ascending' : 'descending');
    } else {
      th.setAttribute('aria-sort', 'none');
    }
    th.setAttribute('tabindex', '0');
    th.setAttribute('role', 'columnheader');
    th.addEventListener('click', () => aendereSortierung(spalte.schluessel));
    th.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); aendereSortierung(spalte.schluessel); }
    });
    kopf.appendChild(th);
  });
}

function aendereSortierung(schluessel) {
  const { sortierung } = instanz;
  if (sortierung.schluessel === schluessel) sortierung.richtung = sortierung.richtung === 'auf' ? 'ab' : 'auf';
  else instanz.sortierung = { schluessel, richtung: schluessel === 'nennungen' ? 'ab' : 'auf' };
  instanz.aktuelleSeite = 1;
  zeichneTabelle();
}

function bauePaginierung(seite, gesamtSeiten, seitenTreffer, gesamtTreffer, position) {
  const leiste = document.createElement('div');
  leiste.className = `ol-paginierung ol-paginierung-${position}`;
  leiste.setAttribute('role', 'navigation');
  leiste.setAttribute('aria-label', `Ortsliste-Seiten (${position === 'oben' ? 'oberhalb' : 'unterhalb'} der Tabelle)`);
  const zurueck = document.createElement('button');
  zurueck.type = 'button';
  zurueck.textContent = '← Zurück';
  zurueck.setAttribute('aria-label', 'Vorherige Seite');
  zurueck.disabled = seite <= 1;
  zurueck.addEventListener('click', () => { instanz.aktuelleSeite = seite - 1; zeichneTabelle(); });
  const status = document.createElement('span');
  status.textContent = `Seite ${seite} / ${gesamtSeiten} (${seitenTreffer} von ${gesamtTreffer} Orten)`;
  const weiter = document.createElement('button');
  weiter.type = 'button';
  weiter.textContent = 'Weiter →';
  weiter.setAttribute('aria-label', 'Nächste Seite');
  weiter.disabled = seite >= gesamtSeiten;
  weiter.addEventListener('click', () => { instanz.aktuelleSeite = seite + 1; zeichneTabelle(); });
  leiste.append(zurueck, status, weiter);
  return leiste;
}

// --- Sidebar ---------------------------------------------------------------

function oeffne(sidebarInstanz, titelText, inhalt, zeigeZurueck) {
  const { sidebar, titel, koerper, zurueckBtn } = sidebarInstanz;
  titel.textContent = titelText;
  koerper.innerHTML = '';
  koerper.appendChild(inhalt);
  zurueckBtn.hidden = !zeigeZurueck;
  sidebar.classList.add('offen');
  sidebar.setAttribute('aria-hidden', 'false');
  sidebar.inert = false;
  titel.focus();
}

function zeigeDetailUrkunde(sidebarInstanz, record, zeigeZurueck) {
  oeffne(sidebarInstanz, record.signatur || '(ohne Signatur)', baueUrkundenDetailInhalt(record), zeigeZurueck);
}

function zeigeDetailInventar(sidebarInstanz, record, zeigeZurueck) {
  oeffne(sidebarInstanz, `${record.Name || record.id}${record.Name ? ` (${record.id})` : ''}`, baueInventarDetailInhalt(record), zeigeZurueck);
}

// Liste der Quelleneinträge eines Ortes; die Unsicherheitsangabe des Ortes (orte.csv) bzw. der Knopf
// „Änderung vorschlagen“ stehen über der Liste
function zeigeOrtListe(sidebarInstanz, ort) {
  sidebarListenZustand = ort;
  const inhalt = document.createElement('div');
  const anzahl = document.createElement('p');
  anzahl.className = 'bestand-sidebar-urkunden-anzahl';
  anzahl.textContent = `${ort.nennungen} ${ort.nennungen === 1 ? 'Nennung' : 'Nennungen'}`;
  inhalt.appendChild(anzahl);
  const unsicher = baueUnsicherheitAbsatz(ort.record, ['orte_unsicher'], { vorschlag: ortBezug(ort.record) });
  if (unsicher) inhalt.appendChild(unsicher);
  if (ort.urkunden.length) {
    const h = document.createElement('h4');
    h.textContent = 'In Urkunden:';
    inhalt.append(h, baueUrkundenListeInhalt(ort.urkunden, { onEintragKlick: (r) => zeigeDetailUrkunde(sidebarInstanz, r, true) }));
  }
  if (ort.inventare.length) {
    const h = document.createElement('h4');
    h.textContent = 'In den Verlassenschaftsinventaren:';
    inhalt.append(h, baueInventarListeInhalt(ort.inventare, { onEintragKlick: (r) => zeigeDetailInventar(sidebarInstanz, r, true) }));
  }
  oeffne(sidebarInstanz, ort.name, inhalt, false);
}

function zeigeOrt(ort) {
  if (ort.nennungen === 0) return;
  zeigeOrtListe(instanz.sidebar, ort);
}

// --- Tabelle -----------------------------------------------------------------

function baueZeile(ort, koerper) {
  const { container, options } = instanz;
  const zeile = koerper.insertRow();
  zeile.className = 'ol-zeile';
  zeile.setAttribute('tabindex', '0');
  zeile.setAttribute('role', 'button');
  const markiert = options.showUncertainty && ort.unsicher;
  zeile.setAttribute('aria-label', `${ort.name}${markiert ? ', Identifizierung unsicher' : ''}, Quelleneinträge anzeigen`);
  if (markiert) {
    const text = ort.anmerkung || 'Identifizierung unsicher';
    zeile.addEventListener('mouseenter', () => zeigeTooltip(text, zeile, container));
    zeile.addEventListener('focus', () => zeigeTooltip(text, zeile, container));
    zeile.addEventListener('mouseleave', () => versteckeTooltip());
    zeile.addEventListener('blur', () => versteckeTooltip());
  }
  zeile.addEventListener('click', () => zeigeOrt(ort));
  zeile.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); zeigeOrt(ort); }
  });
  SPALTEN.forEach((spalte) => {
    const zelle = zeile.insertCell();
    if (markiert && spalte.schluessel === 'name') {
      const symbol = document.createElement('span');
      symbol.className = 'ol-unsicher-symbol';
      symbol.setAttribute('aria-hidden', 'true');
      symbol.textContent = UNSICHERHEIT_SYMBOL;
      zelle.appendChild(symbol);
    }
    const wert = spalte.wertFn(ort);
    zelle.appendChild(document.createTextNode(wert === null || wert === undefined || wert === '' ? '–' : wert));
  });
}

function zeichneTabelle() {
  const { container, orte } = instanz;
  container.querySelector('table.ol-tabelle')?.remove();
  container.querySelectorAll('.ol-paginierung').forEach((el) => el.remove());
  const sortiert = sortiere(filtere(orte), instanz.sortierung);
  const gesamtSeiten = Math.max(1, Math.ceil(sortiert.length / SEITENGROESSE));
  instanz.aktuelleSeite = Math.min(Math.max(1, instanz.aktuelleSeite), gesamtSeiten);
  const start = (instanz.aktuelleSeite - 1) * SEITENGROESSE;
  const seite = sortiert.slice(start, start + SEITENGROESSE);

  container.appendChild(bauePaginierung(instanz.aktuelleSeite, gesamtSeiten, seite.length, sortiert.length, 'oben'));
  const tabelle = document.createElement('table');
  tabelle.className = 'ol-tabelle';
  baueKopfzeile(tabelle);
  const koerper = tabelle.createTBody();
  seite.forEach((ort) => baueZeile(ort, koerper));
  container.appendChild(tabelle);
  container.appendChild(bauePaginierung(instanz.aktuelleSeite, gesamtSeiten, seite.length, sortiert.length, 'unten'));
  instanz.hinweisElement.textContent = instanz.options.showUncertainty
    ? `${sortiert.length} von ${orte.length} Orten angezeigt (nur Orte mit unsicherer Identifizierung).`
    : `${sortiert.length} von ${orte.length} Orten angezeigt.`;
}

function zeichneOrtsliste() {
  const { container } = instanz;
  container.innerHTML = '';
  fuegeStyleEin(container);
  fuegeSidebarStyleEin(container);

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'ol-werkzeugleiste';
  const suche = document.createElement('input');
  suche.type = 'search';
  suche.className = 'ol-suche';
  suche.placeholder = 'Nach Ort suchen…';
  suche.setAttribute('aria-label', 'Ortsliste durchsuchen');
  suche.addEventListener('input', (event) => {
    instanz.suchbegriff = event.target.value;
    instanz.exaktName = null; // normales Tippen beendet einen Datensatzaufruf
    instanz.aktuelleSeite = 1;
    zeichneTabelle();
  });
  werkzeugleiste.appendChild(suche);
  infotextFuerModul('ortsliste').then((cfg) => {
    if (!instanz || !cfg || !werkzeugleiste.isConnected) return;
    instanz.infoButton = erzeugeInfoButton(werkzeugleiste, cfg);
  });
  container.appendChild(werkzeugleiste);

  const hinweis = document.createElement('p');
  hinweis.style.fontSize = '12px';
  container.appendChild(hinweis);
  instanz.hinweisElement = hinweis;

  instanz.sidebar = baueSidebarGeruest(container);
  instanz.sidebar.schliessenBtn.addEventListener('click', () => schliesseSidebar(instanz.sidebar, container));
  instanz.sidebar.zurueckBtn.addEventListener('click', () => {
    if (sidebarListenZustand) zeigeOrtListe(instanz.sidebar, sidebarListenZustand);
  });
  zeichneTabelle();
}

export function render(container, data, options = {}) {
  if (instanz) destroy();
  instanz = {
    container,
    orte: baueOrte(data.ortsverzeichnis || [], data.urkunden || [], data.verlassenschaften || []),
    options: { showUncertainty: false, ...options },
    sortierung: { schluessel: 'nennungen', richtung: 'ab' },
    suchbegriff: '',
    exaktName: null,
    aktuelleSeite: 1,
    infoButton: null,
    sidebar: null,
    hinweisElement: null
  };
  zeichneOrtsliste();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  instanz.aktuelleSeite = 1;
  zeichneTabelle();
}

export function destroy() {
  if (!instanz) return;
  instanz.infoButton?.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
  sidebarListenZustand = null;
}

// Datensatzaufruf (js/utils/datensatzAufruf.js, typ `ort`): Kennung ist der Ortsname wie in urkunden.csv,
// die orte_id aus orte.csv wird ebenfalls angenommen
export function oeffneDatensatz(kennung) {
  if (!instanz) return false;
  const ort = instanz.orte.find((o) => o.name === kennung) || instanz.orte.find((o) => o.record.orte_id === kennung);
  if (!ort) return false;
  if (instanz.options.showUncertainty && !ort.unsicher) instanz.options.showUncertainty = false;
  instanz.suchbegriff = ort.name;
  instanz.exaktName = ort.name;
  instanz.aktuelleSeite = 1;
  const suche = instanz.container.querySelector('.ol-suche');
  if (suche) suche.value = ort.name;
  zeichneTabelle();
  zeigeOrt(ort);
  return true;
}
