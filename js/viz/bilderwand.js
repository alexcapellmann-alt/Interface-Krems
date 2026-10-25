// js/viz/bilderwand.js
// Bilderwand der Urkunden (Wunsch des Autors, 2026-10-25): dieselbe Darstellungsform wie der
// Theaterzettel-Prototyp (Desktop\Theaterzettel\prototyp, angelehnt an FH Potsdam „Past Visions“),
// mit urkunden.csv als Datengrundlage. Modul-Interface siehe Abschnitt 5.
//
// - Jede Urkunde ist eine Bildzelle (erstes Foto aus `bilder`) in einer Jahrzehnt-Säule,
//   innerhalb der Säule nach Datum, die älteste unten an der Achse.
// - Oben eine schräge Wortwolke der Orte (`orte`, die häufigsten), darunter Schalter für weitere
//   Filter: alle Orte, Kategorien, Personen (je eine durchsuchbare Wortwolke der 40 häufigsten).
//   Innerhalb eines Filters ODER (nur Orte: Mehrfachauswahl), zwischen Filtern UND.
// - Mit aktivem Filter teilen sich die Säulen: passende Urkunden oben, übrige gedämpft unten.
// - Hintergrund: die Orte aus orte.csv als Punkte (gleichabstandstreue Projektion um den
//   Kernausschnitt); Mouseover über einen Begriff hebt die betroffenen Orte hervor.
// - Strg+Mausrad oder +/− zoomt, Ziehen verschiebt, Klick öffnet die Urkunde in der Sidebar.
//
// Bilder: keine vorab erzeugten Sprite-Sheets (anders als der Prototyp), damit neue Fotos über die
// CSV-Zelle sofort erscheinen. Die Miniaturen aus fotos/thumbs werden gedrosselt geladen und in
// Atlas-Ebenen verschiedener Zellgröße gezeichnet (MIP_W); bis dahin steht eine Fläche.
//
// Zugänglichkeit: Filter sind Knöpfe mit Zahl im Namen; die Zeichenfläche ist fokussierbar,
// Pfeiltasten wählen eine Urkunde (Ansage über eine Live-Region), Eingabe öffnet sie.

import { erzeugeInfoButton } from '../utils/infoButton.js';
import { infotextFuerModul } from '../core/archivKonfiguration.js';
import { ermittleBildUrls } from '../utils/bilder.js';
import { ladeGecachteCSV } from '../core/datenCache.js';
import { alsText } from '../utils/textwert.js';
import {
  baueSidebarGeruest, fuegeSidebarStyleEin, zeigeUrkundenDetail, schliesseSidebar as schliesseSidebarModul
} from '../utils/sidebar.js';

// ---- Layout (Welt-Einheiten: 1 = Zellbreite) ----
const CH = 0.75;             // Zellhöhe (Querformat wie die meisten Urkundenfotos)
const G = 0.18;              // Abstand zwischen Zellen
const COL_GAP = 1.4;         // Abstand zwischen Säulen
const JAHRZEHNT = 10;
const BAND_PX = 24;          // Band für die Zeitachse
const TOP_PX = 16, PAD_X = 24;
const WOLKE_MIN = 5;         // Orte ab so vielen Nennungen stehen in der schrägen Wolke
const WOLKE_WINKEL = 38;
const TOP_N = 40;            // Einträge je Filterwolke
const MIP_W = [3, 6, 12, 24, 48]; // Zellbreiten der Atlas-Stufen in Pixeln
const LADE_PARALLEL = 6;
const DAUER = 750;
const FARBE = {
  buehne: '#17222c', papier: '#ebe3cf', text: '#d9d4c7', gedaempft: '#9a978f', linie: '#3a4550',
  akzent: '#f2d48a', flaeche: '#6f6a5f', unsicher: '#e0675a', karte: '#9a978f'
};
const SCHRIFT = "'Inter', system-ui, sans-serif";

const ICONS = {
  ort: '<path d="M8 15s5-5 5-9A5 5 0 0 0 3 6c0 4 5 9 5 9z"/><circle cx="8" cy="6" r="1.8"/>',
  kat: '<path d="M2 2h5l7 7-5 5-7-7zM5 5h.01"/>',
  person: '<circle cx="8" cy="5" r="3"/><path d="M2 15c1-4 11-4 12 0"/>'
};

const fmt = (n) => n.toLocaleString('de-DE');
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const liste = (wert) => (Array.isArray(wert) ? wert : (alsText(wert) ? [alsText(wert)] : []))
  .map((x) => String(x).trim()).filter(Boolean);
const mitZahl = (n, einzahl, mehrzahl) => `${fmt(n)} ${n === 1 ? einzahl : mehrzahl}`;
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

// Dieselben Kriterien wie zeitachse.js' istRecordUnsicher() (dort nicht exportiert).
function istRecordUnsicher(record) {
  const anmerkung = record.unsicherheit_anmerkung;
  const anmerkungVorhanden = Array.isArray(anmerkung) ? anmerkung.length > 0 : !!(anmerkung && String(anmerkung).trim() !== '');
  return !!(record.datum_unsicher || record.orte_unsicher || record.personen_unsicher || anmerkungVorhanden);
}

let I = null; // Instanz

// ---- Daten -----------------------------------------------------------------------------

function baueFacette(schluessel, beschriftung, werteJeUrkunde) {
  const begriffe = [], index = new Map();
  const z = werteJeUrkunde.map((werte) => {
    const ids = [];
    werte.forEach((w) => {
      if (!index.has(w)) { index.set(w, begriffe.length); begriffe.push(w); }
      const j = index.get(w);
      if (!ids.includes(j)) ids.push(j);
    });
    return ids;
  });
  return { key: schluessel, label: beschriftung, terms: begriffe, index, z, open: false, pick: 0 };
}

function bereiteDatenVor(records) {
  const urkunden = records.filter((r) => alsText(r.signatur));
  const jahre = urkunden.map((r) => parseInt(alsText(r.jahr), 10)).filter(Number.isFinite);
  const start = Math.floor(Math.min(...jahre) / JAHRZEHNT) * JAHRZEHNT;
  const ende = Math.floor(Math.max(...jahre) / JAHRZEHNT) * JAHRZEHNT;
  const saeulen = (ende - start) / JAHRZEHNT + 1;
  const ohneJahr = urkunden.some((r) => !Number.isFinite(parseInt(alsText(r.jahr), 10)));
  const facetten = [
    baueFacette('ort', 'Orte', urkunden.map((r) => liste(r.orte))),
    baueFacette('kat', 'Kategorien', urkunden.map((r) => liste(r.kategorien))),
    baueFacette('person', 'Personen', urkunden.map((r) => liste(r.personen)))
  ];
  const tiles = urkunden.map((r, i) => {
    const jahr = parseInt(alsText(r.jahr), 10);
    return {
      i, record: r, signatur: alsText(r.signatur), datum: alsText(r.datum), sort: alsText(r.datum_normiert) || alsText(r.jahr),
      m: Number.isFinite(jahr) ? (Math.floor(jahr / JAHRZEHNT) * JAHRZEHNT - start) / JAHRZEHNT : saeulen,
      bild: ermittleBildUrls(r)[0] || null, unsicher: istRecordUnsicher(r),
      f: Object.fromEntries(facetten.map((f) => [f.key, f.z[i]])),
      x: 0, y: 0, d: 0, tx: 0, ty: 0, td: 0, fx: 0, fy: 0, fd: 0, sx: 0, sy: 0, farbe: FARBE.flaeche
    };
  });
  tiles.sort((a, b) => a.m - b.m || a.sort.localeCompare(b.sort));
  return { tiles, facetten, start, saeulen: saeulen + (ohneJahr ? 1 : 0), ohneJahr };
}

// ---- Filter ------------------------------------------------------------------------------

const facette = (key) => I.facetten.find((f) => f.key === key);
const anyActive = () => I.facetten.some((f) => I.sel[f.key].size);
const hasTerm = (t, key, set) => t.f[key].some((j) => set.has(j));
function passes(t, except) {
  for (const f of I.facetten) if (f.key !== except && I.sel[f.key].size && !hasTerm(t, f.key, I.sel[f.key])) return false;
  return true;
}
function counts(key) {
  const f = facette(key), c = new Int32Array(f.terms.length);
  for (const t of I.tiles) if (passes(t, key)) for (const j of t.f[key]) c[j]++;
  return c;
}
const isHover = (t) => I.hoverTerm && t.f[I.hoverTerm.key].includes(I.hoverTerm.i);

function toggleTerm(key, j) {
  const f = facette(key), sel = I.sel[key];
  if (sel.has(j)) sel.delete(j);
  else if (key === 'ort') sel.add(j);
  else { I.sel[key] = new Set([j]); f.open = false; f.pick = ++I.pickSeq; I.hoverTerm = null; }
  I.userZoomed = false;
  update();
}
function clearAll() {
  I.facetten.forEach((f) => I.sel[f.key].clear());
  I.userZoomed = false;
  update();
}
function update() { syncBands(); refresh(); messeFlaeche(); layout(false); }
function setHover(h) {
  I.hoverTerm = h;
  I.hoverCount = h ? countByOrt((t) => isHover(t) && (!anyActive() || passes(t))) : null;
  requestDraw();
}

// ---- Kopfbereich: schräge Orte-Wolke -------------------------------------------------------

function buildCloud() {
  const f = facette('ort');
  const n = new Int32Array(f.terms.length);
  I.tiles.forEach((t) => t.f.ort.forEach((j) => n[j]++));
  I.wolke = [...f.terms.keys()].filter((j) => n[j] >= WOLKE_MIN).sort((a, b) => n[b] - n[a] || f.terms[a].localeCompare(f.terms[b], 'de'));
  I.wolke.forEach((j) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bw-ort';
    b.textContent = f.terms[j];
    b.addEventListener('mouseenter', () => setHover({ key: 'ort', i: j }));
    b.addEventListener('focus', () => setHover({ key: 'ort', i: j }));
    b.addEventListener('mouseleave', () => setHover(null));
    b.addEventListener('blur', () => setHover(null));
    b.addEventListener('click', () => toggleTerm('ort', j));
    I.wolkeEl.set(j, b);
    I.dom.wolke.appendChild(b);
  });
}

function refresh() {
  const c = counts('ort'), sel = I.sel.ort;
  // Schmale Fenster: nur so viele Orte, wie schräg nebeneinander passen (übrige über „Alle Orte“)
  const sinW = Math.sin(WOLKE_WINKEL * Math.PI / 180);
  const platz = Math.max(0, I.dom.kopf.clientWidth - PAD_X - Math.min(150, I.dom.kopf.clientWidth * 0.3));
  const passen = Math.max(5, Math.floor(platz / (10 * 1.15 / sinW)));
  I.wolkeSichtbar = I.wolke.slice(0, passen);
  I.wolke.forEach((j, k) => { I.wolkeEl.get(j).hidden = k >= passen; });
  const max = Math.max(1, ...I.wolkeSichtbar.map((j) => c[j]));
  const groesse = new Map(I.wolkeSichtbar.map((j) => [j, 11 + 15 * Math.sqrt(c[j] / max)]));
  const f = facette('ort');
  I.wolkeSichtbar.forEach((j) => {
    const el = I.wolkeEl.get(j);
    el.classList.toggle('an', sel.has(j));
    el.classList.toggle('leer', c[j] === 0 && !sel.has(j));
    el.setAttribute('aria-pressed', String(sel.has(j)));
    el.setAttribute('aria-label', `${f.terms[j]}, ${mitZahl(c[j], 'Urkunde', 'Urkunden')}`);
    el.title = `${f.terms[j]}: ${mitZahl(c[j], 'Urkunde', 'Urkunden')}`;
    el.style.fontSize = `${groesse.get(j)}px`;
  });
  // so verkleinern, dass auch die längste schräge Beschriftung in den Kopf passt
  const verfuegbar = I.dom.kopf.clientHeight - 16, sin = Math.sin(WOLKE_WINKEL * Math.PI / 180);
  const bedarf = Math.max(1, ...I.wolkeSichtbar.map((j) => I.wolkeEl.get(j).offsetWidth * sin + groesse.get(j)));
  const faktor = Math.min(1, verfuegbar / bedarf);
  const endgroesse = new Map(I.wolkeSichtbar.map((j) => [j, Math.max(9, groesse.get(j) * faktor)]));
  // Schräge Beschriftungen brauchen waagrecht etwa Zeilenhöhe / sin(Winkel): Abstand je nach Größe,
  // auf die verfügbare Breite gestreckt.
  const schritte = I.wolkeSichtbar.map((j) => endgroesse.get(j) * 1.15 / sin);
  const summe = schritte.slice(0, -1).reduce((x, y) => x + y, 0) || 1;
  const breite = platz;
  let links = PAD_X;
  I.wolkeSichtbar.forEach((j, k) => {
    const el = I.wolkeEl.get(j);
    el.style.fontSize = `${endgroesse.get(j).toFixed(1)}px`;
    el.style.left = `${links.toFixed(1)}px`;
    links += schritte[k] * (breite / summe);
  });
  I.facetten.forEach((x) => x.open && renderBand(x));
  renderPicked();
  I.dom.loeschen.hidden = !anyActive();
  const sichtbar = anyActive() ? I.tiles.filter((t) => passes(t)).length : I.tiles.length;
  I.dom.zahl.textContent = anyActive() ? `${mitZahl(sichtbar, 'Urkunde', 'Urkunden')} von ${fmt(I.tiles.length)}` : mitZahl(I.tiles.length, 'Urkunde', 'Urkunden');
}

// ---- Weitere Filter ---------------------------------------------------------------------------

function buildToggles() {
  I.facetten.forEach((f) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bw-schalter';
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${ICONS[f.key]}</svg><span></span>`;
    b.querySelector('span').textContent = f.key === 'ort' ? 'Alle Orte' : f.label;
    b.addEventListener('click', () => toggleBand(f));
    f.btn = b;
    I.dom.schalter.insertBefore(b, I.dom.schalterRest);
  });
}
function toggleBand(f) { f.open = !f.open; update(); if (f.open) f.band?.querySelector('input')?.focus(); }

function syncBands() {
  for (const f of I.facetten) {
    if (f.open && !f.band) {
      const sec = document.createElement('section');
      sec.className = 'bw-band';
      sec.setAttribute('aria-label', `Filter ${f.label}`);
      sec.innerHTML = `<div class="bw-bkopf"><svg viewBox="0 0 16 16" aria-hidden="true">${ICONS[f.key]}</svg><b></b>`
        + `<input type="search" placeholder="suchen …"><button type="button" class="bw-bzu" aria-label="Filter schließen">×</button></div><div class="bw-begriffe"></div>`;
      sec.querySelector('b').textContent = f.label;
      const eingabe = sec.querySelector('input');
      eingabe.setAttribute('aria-label', `${f.label} durchsuchen`);
      eingabe.addEventListener('input', () => { renderBand(f); messeFlaeche(); layout(false); });
      sec.querySelector('.bw-bzu').addEventListener('click', () => { toggleBand(f); f.btn.focus(); });
      sec.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); toggleBand(f); f.btn.focus(); } });
      f.band = sec;
      I.dom.baender.appendChild(sec);
    } else if (!f.open && f.band) {
      f.band.remove();
      f.band = null;
      if (I.hoverTerm && I.hoverTerm.key === f.key) I.hoverTerm = null;
    }
    f.btn.setAttribute('aria-pressed', String(f.open || I.sel[f.key].size > 0));
  }
}

// Getroffene Auswahlen (außer der Orte-Wolke selbst) in der Reihenfolge der Wahl
function renderPicked() {
  const box = I.dom.gewaehlt;
  box.textContent = '';
  const eintraege = [];
  I.facetten.forEach((f) => {
    if (f.open) return;
    [...I.sel[f.key]].forEach((j) => {
      if (f.key === 'ort' && I.wolkeSichtbar.includes(j)) return; // steht schon markiert in der Wolke
      eintraege.push({ f, j, pick: f.key === 'ort' ? 0 : f.pick });
    });
  });
  eintraege.sort((a, b) => a.pick - b.pick).forEach(({ f, j }) => {
    const d = document.createElement('span');
    d.className = 'bw-gewaehlt';
    d.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${ICONS[f.key]}</svg><small></small>`
      + '<button type="button" class="bw-gtext"></button><button type="button" class="bw-gx">×</button>';
    d.querySelector('small').textContent = f.key === 'ort' ? 'Ort' : f.label;
    d.querySelector('.bw-gtext').textContent = f.terms[j];
    d.querySelector('.bw-gtext').title = 'Auswahl ändern';
    d.querySelector('.bw-gtext').addEventListener('click', () => toggleBand(f));
    d.querySelector('.bw-gx').setAttribute('aria-label', `Filter ${f.terms[j]} entfernen`);
    d.querySelector('.bw-gx').addEventListener('click', () => toggleTerm(f.key, j));
    box.appendChild(d);
  });
}

function renderBand(f) {
  const c = counts(f.key), q = fold(f.band.querySelector('input').value.trim());
  if (q && !f.folded) f.folded = f.terms.map(fold);
  let ids = [];
  for (let j = 0; j < c.length; j++) if (c[j] > 0 && (!q || f.folded[j].includes(q))) ids.push(j);
  ids.sort((a, b) => c[b] - c[a] || f.terms[a].localeCompare(f.terms[b], 'de'));
  ids = ids.slice(0, TOP_N);
  I.sel[f.key].forEach((j) => { if (!ids.includes(j)) ids.unshift(j); });
  const max = Math.max(1, ...ids.map((j) => c[j]));
  const box = f.band.querySelector('.bw-begriffe');
  box.textContent = '';
  if (!ids.length) { box.innerHTML = '<span class="bw-keine">Keine Einträge für diese Auswahl</span>'; return; }
  for (const j of ids) {
    const b = document.createElement('button');
    const an = I.sel[f.key].has(j);
    b.type = 'button';
    b.className = `bw-begriff${an ? ' an' : ''}`;
    b.textContent = f.terms[j];
    b.setAttribute('aria-pressed', String(an));
    b.setAttribute('aria-label', `${f.terms[j]}, ${mitZahl(c[j], 'Urkunde', 'Urkunden')}`);
    b.style.fontSize = `${(13 + 9 * Math.sqrt(c[j] / max)).toFixed(1)}px`;
    b.title = `${f.terms[j]}: ${mitZahl(c[j], 'Urkunde', 'Urkunden')}`;
    b.addEventListener('mouseenter', () => setHover({ key: f.key, i: j }));
    b.addEventListener('focus', () => setHover({ key: f.key, i: j }));
    b.addEventListener('mouseleave', () => setHover(null));
    b.addEventListener('blur', () => setHover(null));
    b.addEventListener('click', () => toggleTerm(f.key, j));
    box.appendChild(b);
  }
}

// ---- Layout -------------------------------------------------------------------------------------

function layout(sofort) {
  const { tiles, saeulen } = I;
  const split = anyActive();
  for (const t of tiles) t.up = !split || passes(t);
  I.ortZahl = split ? countByOrt((t) => t.up) : null;
  const upN = new Array(saeulen).fill(0), downN = new Array(saeulen).fill(0);
  for (const t of tiles) (t.up ? upN : downN)[t.m]++;
  const verfuegbarH = Math.max(80, I.H - TOP_PX - BAND_PX - 10);
  let best = 0;
  for (let k = 1; k <= 8; k++) {
    const colS = k * (1 + G) + COL_GAP;
    const zeilen = Math.ceil(Math.max(...upN) / k) + Math.ceil(Math.max(0, ...downN) / k);
    const s = Math.min((I.W - 2 * PAD_X) / (saeulen * colS), verfuegbarH / (zeilen * (CH + G)));
    if (s > best) { best = s; I.K = k; I.COL_S = colS; }
  }
  const up = new Array(saeulen).fill(0), down = new Array(saeulen).fill(0);
  for (const t of tiles) {
    const n = t.up ? up[t.m]++ : down[t.m]++;
    const spalte = n % I.K, zeile = Math.floor(n / I.K);
    t.tx = t.m * I.COL_S + spalte * (1 + G);
    t.ty = t.up ? -(zeile + 1) * (CH + G) : zeile * (CH + G);
    t.td = t.up ? 0 : 1;
  }
  const upZ = Math.ceil(Math.max(...up) / I.K), downZ = Math.ceil(Math.max(0, ...down) / I.K);
  const s = Math.min((I.W - 2 * PAD_X) / (saeulen * I.COL_S), verfuegbarH / ((upZ + downZ) * (CH + G) || 1));
  I.ziel = { s, ox: PAD_X, oy: TOP_PX + upZ * (CH + G) * s };
  I.fitS = s;
  if (sofort) {
    Object.assign(I.view, I.ziel);
    for (const t of tiles) { t.x = t.tx; t.y = t.ty; t.d = t.td; }
    requestDraw();
    return;
  }
  for (const t of tiles) { t.fx = t.x; t.fy = t.y; t.fd = t.d; }
  I.von = { ...I.view };
  I.animT0 = performance.now();
  if (!I.animiert) { I.animiert = true; I.raf = requestAnimationFrame(schritt); }
}

function schritt(now) {
  if (!I) return;
  const p = Math.min(1, (now - I.animT0) / (I.reduziert ? 1 : DAUER)), e = ease(p);
  for (const t of I.tiles) {
    t.x = t.fx + (t.tx - t.fx) * e; t.y = t.fy + (t.ty - t.fy) * e; t.d = t.fd + (t.td - t.fd) * e;
  }
  if (!I.userZoomed) for (const k of ['s', 'ox', 'oy']) I.view[k] = I.von[k] + (I.ziel[k] - I.von[k]) * e;
  draw();
  if (p < 1) I.raf = requestAnimationFrame(schritt); else I.animiert = false;
}
function requestDraw() {
  if (!I || I.animiert || I.zeichnenGeplant) return;
  I.zeichnenGeplant = true;
  requestAnimationFrame(() => { if (!I) return; I.zeichnenGeplant = false; draw(); });
}

// ---- Bilder: gedrosselt laden, in Atlas-Stufen zeichnen ---------------------------------------------

function baueAtlanten() {
  const spalten = Math.ceil(Math.sqrt(I.tiles.length));
  I.atlasSpalten = spalten;
  I.atlanten = MIP_W.map((w) => {
    const c = document.createElement('canvas');
    c.width = spalten * w;
    c.height = Math.ceil(I.tiles.length / spalten) * Math.round(w * CH);
    if (w === MIP_W[0]) c.getContext('2d', { willReadFrequently: true }); // Durchschnittsfarbe je Zelle
    return c;
  });
  I.ladeSchlange = I.tiles.filter((t) => t.bild).slice();
  for (let k = 0; k < LADE_PARALLEL; k++) ladeNaechstes();
}

function ladeNaechstes() {
  if (!I || !I.ladeSchlange.length) return;
  // Sichtbare Zellen zuerst (beim Hineinzoomen), sonst in Zeitfolge
  const cw = I.view.s, ch = cw * CH;
  let k = I.ladeSchlange.findIndex((x) => x.sx + cw >= 0 && x.sx <= I.W && x.sy + ch >= 0 && x.sy <= I.H && cw * I.dpr >= 6);
  if (k < 0) k = 0;
  const [t] = I.ladeSchlange.splice(k, 1);
  const img = new Image();
  const weiter = () => { ladeNaechstes(); };
  img.onload = () => {
    if (!I) return;
    zeichneInAtlas(t, img);
    t.geladen = true;
    requestDraw();
    weiter();
  };
  img.onerror = () => { if (!I) return; console.warn(`Bild nicht gefunden: ${t.bild} (Urkunde ${t.signatur})`); weiter(); };
  img.src = t.bild;
}

// Bild „contain“ in die Zelle jeder Stufe; von der größten Stufe schrittweise verkleinert.
function zeichneInAtlas(t, img) {
  const x0 = t.i % I.atlasSpalten, y0 = Math.floor(t.i / I.atlasSpalten);
  let quelle = img, qx = 0, qy = 0, qw = img.naturalWidth, qh = img.naturalHeight;
  for (let L = MIP_W.length - 1; L >= 0; L--) {
    const w = MIP_W[L], h = Math.round(w * CH), g = I.atlanten[L].getContext('2d');
    g.imageSmoothingQuality = 'high';
    const r = Math.min(w / qw, h / qh), dw = qw * r, dh = qh * r;
    const zx = x0 * w + (w - dw) / 2, zy = y0 * h + (h - dh) / 2;
    g.fillStyle = FARBE.buehne;
    g.fillRect(x0 * w, y0 * h, w, h);
    g.drawImage(quelle, qx, qy, qw, qh, zx, zy, dw, dh);
    quelle = I.atlanten[L]; qx = zx; qy = zy; qw = dw; qh = dh;
  }
  try { // Durchschnittsfarbe für winzige Zellen
    const p = I.atlanten[0].getContext('2d').getImageData(x0 * MIP_W[0] + 1, y0 * Math.round(MIP_W[0] * CH) + 1, 1, 1).data;
    t.farbe = `rgb(${p[0]},${p[1]},${p[2]})`;
  } catch { /* ohne Farbe weiter */ }
}

// Für große Zellen das Originalbild (aus dem Browser-Cache) statt der Atlas-Kopie
function hiBild(t) {
  let im = I.hiRes.get(t.bild);
  if (!im) {
    if (I.hiRes.size > 120) I.hiRes.delete(I.hiRes.keys().next().value);
    im = new Image();
    im.onload = requestDraw;
    im.src = t.bild;
    I.hiRes.set(t.bild, im);
  }
  return im.complete && im.naturalWidth ? im : null;
}

// ---- Karte im Hintergrund ----------------------------------------------------------------------------

async function ladeKarte() {
  let orte = [];
  try { orte = await ladeGecachteCSV('data/orte.csv'); } catch { return; }
  if (!I) return;
  const zahl = (v) => parseFloat(String(alsText(v)).replace(',', '.'));
  const f = facette('ort');
  const punkte = new Map();
  orte.forEach((r) => {
    const j = f.index.get(alsText(r.orte).trim());
    const lat = zahl(r.lat), lon = zahl(r.lon);
    if (j !== undefined && Number.isFinite(lat) && Number.isFinite(lon)) punkte.set(j, { lat, lon });
  });
  if (!punkte.size) return;
  // Kernausschnitt: Orte der Wolke (häufig genannt), damit Einzelfälle in Belgien o. Ä. den
  // Maßstab nicht bestimmen; weiter entfernte Orte liegen außerhalb und werden nicht gezeichnet.
  const kern = I.wolke.map((j) => punkte.get(j)).filter(Boolean);
  const basis = kern.length >= 3 ? kern : [...punkte.values()];
  const lat0 = basis.reduce((a, p) => a + p.lat, 0) / basis.length, k = Math.cos(lat0 * Math.PI / 180);
  const xy = (p) => [p.lon * k, -p.lat];
  const xs = basis.map((p) => xy(p)[0]), ys = basis.map((p) => xy(p)[1]);
  I.karte = { punkte, xy, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  requestDraw();
}

function countByOrt(pred) {
  const c = new Array(facette('ort').terms.length).fill(0);
  for (const t of I.tiles) if (pred(t)) for (const j of t.f.ort) c[j]++;
  return c;
}

const kartenDeckkraft = () => Math.max(0, Math.min(1, 1 - (I.view.s / I.fitS - 1.5) / 2.5));

function zeichneKarte(ctx, a) {
  const km = I.karte;
  if (!km || a <= 0) return;
  const rand = 0.12, w = I.W * (1 - 2 * rand), h = I.H * (1 - 2 * rand);
  const s = Math.min(w / ((km.x1 - km.x0) || 1), h / ((km.y1 - km.y0) || 1));
  const ox = (I.W - (km.x1 - km.x0) * s) / 2 - km.x0 * s, oy = (I.H - (km.y1 - km.y0) * s) / 2 - km.y0 * s;
  const c = I.hoverCount || I.ortZahl, max = c ? Math.max(1, ...c) : 1;
  const terms = facette('ort').terms;
  // nur die häufigsten hervorgehobenen Orte beschriften, sonst überdecken sich die Namen
  const beschriftet = new Set(c ? [...km.punkte.keys()].filter((j) => c[j] > 0).sort((x, y) => c[y] - c[x]).slice(0, 8) : []);
  ctx.font = `600 11px ${SCHRIFT}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  km.punkte.forEach((p, j) => {
    const [px, py] = km.xy(p), x = ox + px * s, y = oy + py * s;
    if (x < -20 || x > I.W + 20 || y < -20 || y > I.H + 20) return;
    const n = c ? c[j] : 0;
    if (!n) {
      ctx.globalAlpha = 0.35 * a; ctx.fillStyle = FARBE.karte;
      ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill();
      return;
    }
    const r = 3 + 9 * Math.sqrt(n / max);
    ctx.globalAlpha = 0.25 * Math.max(a, 0.4); ctx.fillStyle = FARBE.akzent;
    ctx.beginPath(); ctx.arc(x, y, r + 5, 0, 7); ctx.fill();
    ctx.globalAlpha = Math.max(a, 0.4);
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    if (!beschriftet.has(j)) return;
    ctx.fillStyle = FARBE.buehne; ctx.globalAlpha *= 0.8; ctx.fillText(terms[j], x + r + 6, y + 1);
    ctx.fillStyle = FARBE.akzent; ctx.globalAlpha = Math.max(a, 0.4); ctx.fillText(terms[j], x + r + 5, y);
  });
  ctx.globalAlpha = 1;
}

// ---- Zeichnen -------------------------------------------------------------------------------------------

function messeFlaeche() {
  const r = I.dom.cv.getBoundingClientRect();
  I.dpr = window.devicePixelRatio || 1; I.W = r.width; I.H = r.height;
  I.dom.cv.width = Math.round(I.W * I.dpr); I.dom.cv.height = Math.round(I.H * I.dpr);
}

function draw() {
  if (!I) return;
  const { ctx, view: { s, ox, oy }, dpr } = I;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = FARBE.buehne;
  ctx.fillRect(0, 0, I.W, I.H);
  const ka = kartenDeckkraft();
  // Ruhende Karte sehr zurückhaltend; hervorgehobene Orte darüber nach den Zellen
  if (I.karte && !(I.hoverCount || I.ortZahl)) zeichneKarte(ctx, ka * 0.6);
  const cw = s, ch = s * CH;
  const L = MIP_W.findIndex((w) => w >= cw * dpr);
  const stufe = L >= 0 ? L : MIP_W.length - 1, lw = MIP_W[stufe], lh = Math.round(lw * CH);
  const atlas = I.atlanten[stufe];
  const gross = cw * dpr > MIP_W.at(-1) * 1.2;
  const unsicherZeigen = I.options.showUncertainty;
  for (const t of I.tiles) {
    const x = ox + t.x * s, y = oy + t.y * s + t.d * BAND_PX;
    t.sx = x; t.sy = y;
    if (x + cw < 0 || x > I.W || y + ch < 0 || y > I.H) continue;
    let alpha = t.d > 0.5 ? 0.3 : 1;
    if (I.hoverTerm && !isHover(t)) alpha = Math.min(alpha, 0.15);
    ctx.globalAlpha = alpha;
    const hi = gross && t.geladen ? hiBild(t) : null;
    if (cw * dpr < 2.5 || !t.geladen) {
      ctx.fillStyle = t.geladen ? t.farbe : FARBE.flaeche;
      ctx.fillRect(x, y, cw, ch);
    } else if (hi) {
      const r = Math.min(cw / hi.naturalWidth, ch / hi.naturalHeight), w = hi.naturalWidth * r, h = hi.naturalHeight * r;
      ctx.drawImage(hi, x + (cw - w) / 2, y + (ch - h) / 2, w, h);
    } else {
      ctx.drawImage(atlas, (t.i % I.atlasSpalten) * lw, Math.floor(t.i / I.atlasSpalten) * lh, lw, lh, x, y, cw, ch);
    }
    if (unsicherZeigen && t.unsicher && cw > 4) {
      ctx.strokeStyle = FARBE.unsicher; ctx.lineWidth = Math.max(1, Math.min(2, cw / 12));
      ctx.setLineDash([3, 2]); ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1); ctx.setLineDash([]);
    }
  }
  ctx.globalAlpha = 1;
  for (const t of [I.hoverTile, I.aktiv, I.ausgewaehlt]) {
    if (!t) continue;
    ctx.strokeStyle = FARBE.akzent; ctx.lineWidth = t === I.ausgewaehlt ? 3 : 2;
    ctx.strokeRect(t.sx - 1.5, t.sy - 1.5, cw + 3, ch + 3);
  }
  if (I.karte && (I.hoverCount || I.ortZahl)) zeichneKarte(ctx, ka);
  zeichneAchse(ctx);
}

function zeichneAchse(ctx) {
  const s = I.view.s, y = I.view.oy, colW = (I.K * (1 + G) - G) * s;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const breit = I.COL_S * s;
  const jedes = breit > 34 ? 1 : (breit > 14 ? 5 : 10); // Beschriftung je Jahrzehnt, halbem oder ganzem Jahrhundert
  for (let m = 0; m < I.saeulen; m++) {
    const x = I.view.ox + m * I.COL_S * s;
    if (x < -60 || x > I.W + 60) continue;
    const ohneJahr = I.ohneJahr && m === I.saeulen - 1;
    const jahr = I.start + m * JAHRZEHNT;
    const jahrhundert = jahr % 100 === 0;
    if (!ohneJahr && m % jedes !== 0 && !(jedes === 10 && jahrhundert)) continue;
    if (!ohneJahr && jedes === 10 && !jahrhundert) continue;
    ctx.font = `${jahrhundert || ohneJahr ? 700 : 400} 12px ${SCHRIFT}`;
    ctx.fillStyle = jahrhundert || ohneJahr ? FARBE.papier : FARBE.gedaempft;
    ctx.fillText(ohneJahr ? 'ohne Jahr' : (breit > 34 ? `${jahr}er` : String(jahr)), x + colW / 2, y + BAND_PX / 2);
    if (jahrhundert) ctx.fillRect(x - COL_GAP * s / 2, y + 2, 1, BAND_PX - 4);
  }
}

// ---- Interaktion --------------------------------------------------------------------------------------------

function hit(mx, my) {
  const cw = I.view.s, ch = I.view.s * CH;
  for (let k = I.tiles.length - 1; k >= 0; k--) {
    const t = I.tiles[k];
    if (mx >= t.sx && mx <= t.sx + cw && my >= t.sy && my <= t.sy + ch) return t;
  }
  return null;
}

function zoome(faktor, mx = I.W / 2, my = I.H / 2) {
  const ns = Math.max(I.ziel.s * 0.8, Math.min(I.ziel.s * 60, I.view.s * faktor));
  I.view.ox = mx - (mx - I.view.ox) * ns / I.view.s;
  I.view.oy = my - (my - I.view.oy) * ns / I.view.s;
  I.view.s = ns;
  I.userZoomed = true;
  versteckeTipp();
  requestDraw();
}

function zeigeTipp(t) {
  const tip = I.dom.tipp;
  tip.innerHTML = '';
  if (t.bild) {
    const img = document.createElement('img');
    img.alt = '';
    img.src = t.bild;
    tip.appendChild(img);
  }
  const titel = document.createElement('div');
  titel.className = 'bw-tt';
  titel.textContent = t.signatur;
  const meta = document.createElement('div');
  meta.className = 'bw-tm';
  meta.textContent = [t.datum, liste(t.record.orte).join(', ')].filter(Boolean).join(' · ');
  const regest = document.createElement('div');
  regest.className = 'bw-tr';
  const text = alsText(t.record.regest);
  regest.textContent = text.length > 180 ? `${text.slice(0, 177)} …` : text;
  tip.append(titel, meta, regest);
  if (I.options.showUncertainty && t.unsicher) {
    const u = document.createElement('div');
    u.className = 'bw-tu';
    u.textContent = 'σ Angaben teilweise unsicher';
    tip.appendChild(u);
  }
  let x = t.sx + I.view.s + 12, y = Math.max(8, Math.min(t.sy - 40, I.H - 340));
  if (x + 270 > I.W) x = t.sx - 272;
  tip.style.left = `${Math.max(4, x)}px`;
  tip.style.top = `${y}px`;
  tip.hidden = false;
}
function versteckeTipp() { if (I) I.dom.tipp.hidden = true; }

function oeffneSidebar(t) {
  I.ausgewaehlt = t;
  versteckeTipp();
  zeigeUrkundenDetail(I.sidebar, t.record);
  requestDraw();
}
function schliesseSidebar() {
  if (!I) return;
  I.ausgewaehlt = null;
  schliesseSidebarModul(I.sidebar, I.dom.cv);
  requestDraw();
}

// Tastatur auf der Zeichenfläche: Pfeile wählen (links/rechts in Zeitfolge, hoch/runter in der Säule)
function tastatur(e) {
  const sichtbar = I.tiles.filter((t) => t.up);
  if (!sichtbar.length) return;
  let k = I.aktiv ? sichtbar.indexOf(I.aktiv) : -1;
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') k = Math.min(sichtbar.length - 1, k + 1);
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') k = Math.max(0, k < 0 ? 0 : k - 1);
  else if (e.key === 'Home') k = 0;
  else if (e.key === 'End') k = sichtbar.length - 1;
  else if ((e.key === 'Enter' || e.key === ' ') && I.aktiv) { e.preventDefault(); oeffneSidebar(I.aktiv); return; }
  else if (e.key === '+' || e.key === '=') { zoome(1.4); return; }
  else if (e.key === '-') { zoome(1 / 1.4); return; }
  else return;
  e.preventDefault();
  I.aktiv = sichtbar[k];
  const t = I.aktiv;
  I.dom.ansage.textContent = `${t.signatur}, ${t.datum}${liste(t.record.orte).length ? `, ${liste(t.record.orte).join(', ')}` : ''}. ${k + 1} von ${sichtbar.length}.`;
  draw();
  if (t.sx < 0 || t.sx > I.W - I.view.s || t.sy < 0 || t.sy > I.H - I.view.s) {
    I.view.ox += I.W / 2 - t.sx; I.view.oy += I.H / 2 - t.sy; I.userZoomed = true; draw();
  }
  zeigeTipp(t);
}

function verdrahte() {
  const cv = I.dom.cv;
  cv.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return; // ohne Strg scrollt die Seite (wie urkundenNetzwerk.js)
    e.preventDefault();
    const r = cv.getBoundingClientRect();
    zoome(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  cv.addEventListener('pointerdown', (e) => {
    I.drag = { x: e.clientX, y: e.clientY, ox: I.view.ox, oy: I.view.oy, moved: false };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', (e) => {
    const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    if (I.drag) {
      const dx = e.clientX - I.drag.x, dy = e.clientY - I.drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) { I.drag.moved = true; cv.classList.add('zieht'); }
      if (I.drag.moved) { I.view.ox = I.drag.ox + dx; I.view.oy = I.drag.oy + dy; I.userZoomed = true; versteckeTipp(); requestDraw(); return; }
    }
    const t = hit(mx, my);
    if (t !== I.hoverTile) { I.hoverTile = t; t ? zeigeTipp(t) : versteckeTipp(); cv.style.cursor = t ? 'pointer' : ''; requestDraw(); }
  });
  cv.addEventListener('pointerup', (e) => {
    cv.classList.remove('zieht');
    if (I.drag && !I.drag.moved) {
      const r = cv.getBoundingClientRect();
      const t = hit(e.clientX - r.left, e.clientY - r.top);
      if (t) oeffneSidebar(t);
    }
    I.drag = null;
  });
  cv.addEventListener('pointerleave', () => { I.hoverTile = null; versteckeTipp(); requestDraw(); });
  cv.addEventListener('keydown', tastatur);
  cv.addEventListener('blur', () => { I.aktiv = null; versteckeTipp(); requestDraw(); });
  I.dom.loeschen.addEventListener('click', clearAll);
  I.dom.gesamt.addEventListener('click', () => { I.userZoomed = false; versteckeTipp(); layout(false); });
  I.dom.plus.addEventListener('click', () => zoome(1.4));
  I.dom.minus.addEventListener('click', () => zoome(1 / 1.4));
  I.sidebar.schliessenBtn.addEventListener('click', schliesseSidebar);
  I.wurzel.addEventListener('keydown', (e) => { if (e.key === 'Escape' && I.ausgewaehlt) schliesseSidebar(); });
}

// ---- Aufbau ------------------------------------------------------------------------------------------------------

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .bw-wurzel { display: flex; flex-direction: column; height: 100%; min-height: 520px; background: ${FARBE.buehne};
      color: ${FARBE.text}; border-radius: var(--radius); overflow: hidden; position: relative; }
    .bw-kopf { position: relative; flex: 0 0 auto; height: clamp(110px, 22vh, 190px); overflow: hidden; }
    .bw-wolke { position: absolute; inset: 0; }
    .bw-ort { position: absolute; bottom: 10px; transform-origin: 0 100%; transform: rotate(-${WOLKE_WINKEL}deg); white-space: nowrap;
      cursor: pointer; background: none; border: 0; padding: 1px 6px; margin: 0; color: ${FARBE.papier}; font: inherit; font-weight: 700;
      text-transform: uppercase; letter-spacing: .02em; line-height: 1.1; transition: color .2s, opacity .2s; }
    .bw-ort:hover, .bw-ort:focus-visible { color: ${FARBE.akzent}; outline: none; }
    .bw-ort:focus-visible { text-decoration: underline; }
    .bw-ort.leer { opacity: .4; }
    .bw-ort.an { background: ${FARBE.papier}; color: ${FARBE.buehne}; }
    .bw-ort.an::after { content: " ×"; font-weight: 400; }
    .bw-schalter-leiste { flex: 0 0 auto; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 6px 20px;
      font-size: var(--fs-sm); color: ${FARBE.gedaempft}; border-top: 1px solid ${FARBE.linie}; }
    .bw-rest { flex: 1; display: flex; gap: 6px; justify-content: flex-end; align-items: center; flex-wrap: wrap; }
    .bw-zahl { color: ${FARBE.text}; margin-right: 6px; }
    .bw-aktion, .bw-schalter { background: none; border: 1px solid #5d6873; color: ${FARBE.text}; border-radius: 14px; min-height: 32px;
      padding: 3px 10px; font: inherit; font-size: var(--fs-sm); cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }
    .bw-aktion { border-radius: 3px; }
    .bw-aktion[hidden] { display: none; }
    .bw-aktion:hover, .bw-schalter:hover { border-color: ${FARBE.gedaempft}; }
    .bw-aktion:focus-visible, .bw-schalter:focus-visible, .bw-begriff:focus-visible, .bw-gewaehlt button:focus-visible,
      .bw-bzu:focus-visible, .bw-band input:focus-visible { outline: 3px solid ${FARBE.akzent}; outline-offset: 2px; }
    .bw-schalter[aria-pressed="true"] { background: ${FARBE.papier}; color: ${FARBE.buehne}; border-color: ${FARBE.papier}; }
    .bw-schalter svg, .bw-bkopf svg, .bw-gewaehlt svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.4;
      stroke-linecap: round; stroke-linejoin: round; }
    .bw-gewaehlt-leiste { display: flex; flex-wrap: wrap; gap: 6px 10px; padding: 0 20px 6px; }
    .bw-gewaehlt-leiste:empty { display: none; }
    .bw-gewaehlt { display: inline-flex; gap: 6px; align-items: center; background: ${FARBE.papier}; color: ${FARBE.buehne};
      border-radius: 3px; padding: 3px 4px 3px 8px; font-size: var(--fs-sm); }
    .bw-gewaehlt small { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #4d493f; }
    .bw-gtext { background: none; border: 0; padding: 0; font: inherit; font-weight: 700; color: inherit; cursor: pointer; }
    .bw-gx { background: none; border: 0; font-size: 18px; line-height: 1; cursor: pointer; color: #4d493f; padding: 0 4px; min-width: 24px; min-height: 24px; }
    .bw-band { border-top: 1px solid ${FARBE.linie}; padding: 4px 20px 6px; }
    .bw-bkopf { display: flex; gap: 8px; align-items: center; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: ${FARBE.gedaempft}; }
    .bw-bkopf b { color: ${FARBE.text}; }
    .bw-band input { margin-left: 8px; background: #233140; border: 1px solid #5d6873; color: ${FARBE.text}; border-radius: 3px;
      padding: 3px 6px; font: inherit; font-size: var(--fs-sm); text-transform: none; letter-spacing: 0; width: 200px; }
    .bw-bzu { margin-left: auto; background: none; border: 0; color: ${FARBE.text}; font-size: 20px; cursor: pointer; line-height: 1; min-width: 32px; min-height: 32px; }
    .bw-begriffe { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 2px; margin-top: 3px; max-height: 30vh; overflow-y: auto; }
    .bw-begriff { background: none; border: 0; color: ${FARBE.papier}; font: inherit; font-weight: 700; cursor: pointer; padding: 0 5px;
      border-radius: 2px; line-height: 1.35; white-space: nowrap; }
    .bw-begriff:hover { color: ${FARBE.akzent}; }
    .bw-begriff.an { background: ${FARBE.papier}; color: ${FARBE.buehne}; }
    .bw-begriff.an::after { content: " ×"; font-weight: 400; }
    .bw-keine { color: ${FARBE.gedaempft}; font-size: var(--fs-sm); }
    .bw-buehne { position: relative; flex: 1 1 auto; min-height: 260px; }
    .bw-buehne canvas { position: absolute; inset: 0; width: 100%; height: 100%; cursor: grab; touch-action: none; }
    .bw-buehne canvas.zieht { cursor: grabbing; }
    .bw-buehne canvas:focus-visible { outline: 3px solid ${FARBE.akzent}; outline-offset: -3px; }
    .bw-tipp { position: absolute; width: 260px; padding: 10px; z-index: 5; background: #f4efe2; color: #1b1c1f; border-radius: 3px;
      box-shadow: 0 8px 30px rgba(0,0,0,.5); font-size: var(--fs-sm); pointer-events: none; }
    .bw-tipp img { display: block; width: 100%; height: auto; margin-bottom: 8px; background: #ddd5c0; }
    .bw-tt { font-weight: 700; font-size: 15px; }
    .bw-tm { color: #4d493f; margin-top: 2px; }
    .bw-tr { margin-top: 6px; line-height: 1.35; }
    .bw-tu { margin-top: 6px; color: #a0291c; font-weight: 600; }
    .bw-info-anker { position: absolute; top: 8px; right: 12px; z-index: 6; }
    .bw-nur-hilfsmittel { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    @media (max-width: 700px) { .bw-schalter-leiste, .bw-band, .bw-gewaehlt-leiste { padding-left: 12px; padding-right: 12px; } }
  `;
  container.appendChild(style);
}

function baueGeruest(container) {
  const wurzel = document.createElement('div');
  wurzel.className = 'bw-wurzel';
  wurzel.innerHTML = `
    <div class="bw-kopf"><div class="bw-wolke" role="group" aria-label="Orte, nach Häufigkeit"></div><div class="bw-info-anker"></div></div>
    <div class="bw-schalter-leiste" role="group" aria-label="Weitere Filter und Ansicht">
      <span>Weitere Filter:</span>
      <span class="bw-rest">
        <span class="bw-zahl" aria-live="polite"></span>
        <button type="button" class="bw-aktion bw-loeschen" hidden>Filter löschen</button>
        <button type="button" class="bw-aktion bw-minus" aria-label="Verkleinern">−</button>
        <button type="button" class="bw-aktion bw-plus" aria-label="Vergrößern">+</button>
        <button type="button" class="bw-aktion bw-gesamt">Gesamtansicht</button>
      </span>
    </div>
    <div class="bw-gewaehlt-leiste" aria-label="Gewählte Filter"></div>
    <div class="bw-baender"></div>
    <div class="bw-buehne">
      <canvas tabindex="0" role="img"></canvas>
      <div class="bw-tipp" hidden></div>
      <div class="bw-nur-hilfsmittel" aria-live="polite"></div>
    </div>`;
  container.appendChild(wurzel);
  const q = (s) => wurzel.querySelector(s);
  return {
    wurzel,
    dom: {
      kopf: q('.bw-kopf'), wolke: q('.bw-wolke'), info: q('.bw-info-anker'), schalter: q('.bw-schalter-leiste'), schalterRest: q('.bw-rest'),
      zahl: q('.bw-zahl'), loeschen: q('.bw-loeschen'), plus: q('.bw-plus'), minus: q('.bw-minus'), gesamt: q('.bw-gesamt'),
      gewaehlt: q('.bw-gewaehlt-leiste'), baender: q('.bw-baender'), cv: q('canvas'), tipp: q('.bw-tipp'), ansage: q('.bw-nur-hilfsmittel')
    }
  };
}

export function render(container, data, options = {}) {
  if (I) destroy();
  container.innerHTML = '';
  container.style.position = 'relative';
  fuegeStyleEin(container);
  fuegeSidebarStyleEin(container);
  const records = Array.isArray(data) ? data : (data?.urkunden || []);
  const { wurzel, dom } = baueGeruest(container);
  const sidebar = baueSidebarGeruest(container);
  const vorbereitet = bereiteDatenVor(records);
  I = {
    container, wurzel, dom, sidebar, ctx: dom.cv.getContext('2d'),
    options: { showUncertainty: false, ...options },
    ...vorbereitet,
    sel: Object.fromEntries(vorbereitet.facetten.map((f) => [f.key, new Set()])),
    wolke: [], wolkeEl: new Map(), pickSeq: 0, hoverTerm: null, hoverCount: null, ortZahl: null,
    hoverTile: null, aktiv: null, ausgewaehlt: null, userZoomed: false,
    view: { s: 1, ox: 0, oy: 0 }, ziel: { s: 1, ox: 0, oy: 0 }, von: { s: 1, ox: 0, oy: 0 }, fitS: 1,
    K: 3, COL_S: 3 * (1 + G) + COL_GAP, W: 0, H: 0, dpr: 1, animiert: false, zeichnenGeplant: false,
    hiRes: new Map(), karte: null, infoButton: null,
    reduziert: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  };
  dom.cv.setAttribute('aria-label', `Bilderwand: ${mitZahl(I.tiles.length, 'Urkunde', 'Urkunden')} als Bilder in Jahrzehnt-Säulen. `
    + 'Pfeiltasten wählen eine Urkunde, Eingabetaste öffnet sie, Plus und Minus zoomen.');
  buildCloud();
  buildToggles();
  verdrahte();
  messeFlaeche();
  layout(true);
  refresh();
  baueAtlanten();
  ladeKarte();
  infotextFuerModul('bilderwand', { bw_wolke: I.wolke.length, bw_ab: WOLKE_MIN }).then((cfg) => {
    if (!I || !cfg || !dom.info.isConnected) return;
    I.infoButton = erzeugeInfoButton(dom.info, cfg);
  });
  I.beobachter = new ResizeObserver(() => {
    if (!I) return;
    const r = dom.cv.getBoundingClientRect();
    if (Math.abs(r.width - I.W) < 1 && Math.abs(r.height - I.H) < 1) return;
    refresh(); messeFlaeche(); layout(!I.userZoomed);
  });
  I.beobachter.observe(dom.cv);
}

export function resize(neueOptionen = {}) {
  if (!I) return;
  I.options = { ...I.options, ...neueOptionen };
  refresh(); messeFlaeche(); layout(true);
}

export function destroy() {
  if (!I) return;
  I.beobachter?.disconnect();
  cancelAnimationFrame(I.raf);
  I.ladeSchlange = [];
  I.infoButton?.destroy();
  I.container.innerHTML = '';
  I = null;
}

// Datensatzaufruf (js/utils/datensatzAufruf.js), z. B. aus einer Führung
export function oeffneDatensatz(signatur) {
  if (!I) return false;
  const t = I.tiles.find((x) => x.signatur === signatur);
  if (!t) return false;
  oeffneSidebar(t);
  return true;
}
