// js/viz/buergerinnen.js
// „Bürgerinnen?“ (Wunsch des Autors, 2026-10-28): Das Bürgerbuch von Krems (1535–1625) nennt 2 655 Personen -
// Neubürger und ihre Bürgen -, aber keine einzige Frau. Die Ansicht zeigt dieses Fehlen: ein Punktfeld mit
// einem Punkt je Person; ein Klick auf „Nach Geschlecht ordnen“ lässt die Punkte in zwei Spalten fließen,
// links „Männer“, rechts „Frauen“. Die rechte Spalte bleibt leer - als gestrichelter Rahmen in derselben
// Größe, damit sichtbar wird, dass hier Platz wäre. Ein Satz darunter verhindert den Fehlschluss, es habe
// keine Frauen gegeben, und verweist auf die Führung „Frauen im Archiv“.
//
// Personen: aufgenommene Personen (`personen_id`) und Bürgen (`buergen_id`) aus buergerbuch.csv, je Person
// ein Punkt (eindeutige Kennung). Das Bürgerbuch hat keine Spalte zum Geschlecht; dass keine Frau darin
// vorkommt, hat der Autor am Quelltext geprüft. Trägt ein Datensatz künftig `geschlecht` = w/weiblich,
// erscheint die Person rechts - die Ansicht behauptet die Null also nicht, sie zählt sie.
// Modul-Interface siehe Abschnitt 5.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { infotextFuerModul } from '../core/archivKonfiguration.js';
import { ermittleVerfuegbareHoehe } from '../utils/viewportGroesse.js';
import { teileNachJahr } from '../utils/buergerbuchZeit.js';
import { alsText } from '../utils/textwert.js';

const FARBE = '#2c4a6e';          // Tintenblau der Seite
const RAHMEN = '#9a9081';         // warmes Grau für den leeren Rahmen
const DAUER = 1300;
const KOPF_SPALTEN = 64;          // Platz über den Spalten für Überschrift und Zahl
const FUEHRUNG_LINK = '#fuehrungen/frauen-im-archiv';

let instanz = null; // { container, wurzel, personen, sortiert, svg, punkte, infoButton, beobachter }

const zahl = (n) => n.toLocaleString('de-AT');
const istFrau = (p) => /^w(eiblich)?$/i.test(alsText(p.geschlecht).trim());

// Eine Person je Kennung: Neubürger mit Jahr der Aufnahme, Bürgen mit ihrem Namen aus der Bürgenliste
function sammlePersonen(buergerbuch, personenliste) {
  const namen = new Map((personenliste || []).map((p) => {
    const sw = Array.isArray(p.schreibweisen) ? p.schreibweisen[0] : alsText(p.schreibweisen).split('|')[0];
    return [p.personen_id, sw];
  }));
  const personen = new Map();
  const jahrJeRecord = new Map(teileNachJahr(buergerbuch).mitJahr.map(({ record, jahr }) => [record, jahr]));
  buergerbuch.forEach((r) => {
    const id = alsText(r.personen_id);
    if (id && !personen.has(id)) {
      personen.set(id, { id, name: namen.get(id) || alsText(r.Name) || id, rolle: 'neubuerger', jahr: jahrJeRecord.get(r) ?? null, geschlecht: r.geschlecht });
    }
  });
  buergerbuch.forEach((r) => {
    const ids = Array.isArray(r.buergen_id) ? r.buergen_id : alsText(r.buergen_id).split('|');
    const bnamen = Array.isArray(r.Buergen) ? r.Buergen : alsText(r.Buergen).split('|');
    ids.map((x) => alsText(x).trim()).forEach((id, i) => {
      if (id && !personen.has(id)) personen.set(id, { id, name: namen.get(id) || alsText(bnamen[i]).trim() || id, rolle: 'buerge', jahr: null });
    });
  });
  return [...personen.values()];
}

function jahresSpanne(buergerbuch) {
  const jahre = teileNachJahr(buergerbuch).mitJahr.map((e) => e.jahr);
  return jahre.length ? [Math.min(...jahre), Math.max(...jahre)] : null;
}

// Gleichmäßige, leicht gemischte Reihenfolge für das Punktfeld (fester Startwert: jedes Mal dasselbe Bild)
function mische(liste) {
  let s = 7;
  const zufall = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(zufall() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.map((p) => ({ ...p, helligkeit: 0.55 + zufall() * 0.4, verzoegerung: zufall() }));
}

// Punktwolke für den Ausgangszustand: Sonnenblumen-Spirale (Phyllotaxis) in einer Ellipse - gleichmäßig dicht,
// aber organisch statt eines starren Rasters
const GOLDENER_WINKEL = Math.PI * (3 - Math.sqrt(5));
function wolke(n, cx, cy, rx, ry) {
  const zelle = Math.sqrt((Math.PI * rx * ry) / Math.max(n, 1));
  return { zelle, pos: (i) => {
    const t = Math.sqrt((i + 0.5) / n);
    const w = i * GOLDENER_WINKEL;
    return [cx + rx * t * Math.cos(w), cy + ry * t * Math.sin(w)];
  } };
}

// Raster für n Punkte in einem Rechteck: Zellgröße so, dass alle hineinpassen
function raster(n, x, y, b, h) {
  if (n === 0) return { zelle: 0, pos: () => [x, y] };
  let zelle = Math.sqrt((b * h) / n);
  let spalten = Math.max(1, Math.floor(b / zelle));
  while (spalten * Math.floor(h / zelle) < n) { zelle *= 0.97; spalten = Math.max(1, Math.floor(b / zelle)); }
  const zeilen = Math.ceil(n / spalten);
  const ox = x + (b - spalten * zelle) / 2 + zelle / 2;
  const oy = y + (h - zeilen * zelle) / 2 + zelle / 2;
  return { zelle, pos: (i) => [ox + (i % spalten) * zelle, oy + Math.floor(i / spalten) * zelle] };
}

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .bgi-wurzel { display: flex; flex-direction: column; height: 100%; min-height: 480px; }
    .bgi-werkzeugleiste { display: flex; justify-content: flex-end; margin-bottom: 4px; min-height: 32px; }
    .bgi-kopf { text-align: center; margin: 0 auto var(--space-3); }
    .bgi-ueberzeile { font-size: var(--fs-sm); letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted); }
    .bgi-zahl { font-family: var(--font-heading); font-size: clamp(2rem, 4.2vw, 3.2rem); line-height: 1.05; margin: var(--space-1) 0 0; color: var(--text); }
    .bgi-unterzeile { font-size: var(--fs-md); color: var(--text-muted); margin-top: 2px; }
    .bgi-knopf { margin-top: var(--space-4); font: inherit; font-size: var(--fs-md); font-weight: 600; padding: 10px 22px; min-height: 44px;
      border-radius: 999px; border: 1px solid ${FARBE}; background: ${FARBE}; color: #fff; cursor: pointer;
      box-shadow: 0 4px 14px rgba(44, 74, 110, .25); transition: transform .15s ease, box-shadow .15s ease, background .15s ease; }
    .bgi-knopf:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(44, 74, 110, .32); }
    .bgi-knopf:focus-visible { outline: 3px solid #e0b429; outline-offset: 3px; }
    .bgi-knopf[aria-pressed="true"] { background: var(--surface); color: ${FARBE}; }
    .bgi-buehne { position: relative; flex: 1 1 auto; min-height: 300px; }
    .bgi-buehne svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .bgi-punkt { cursor: default; }
    .bgi-spaltenkopf { font-family: var(--font-heading); font-size: 1.5rem; fill: var(--text); text-anchor: middle; }
    .bgi-spaltenzahl { font-size: var(--fs-md); fill: var(--text-muted); text-anchor: middle; letter-spacing: .04em; }
    .bgi-leer { font-size: var(--fs-md); font-style: italic; fill: ${RAHMEN}; text-anchor: middle; }
    .bgi-beschluss { max-width: 62ch; margin: var(--space-3) auto 0; text-align: center; font-size: var(--fs-md); line-height: var(--lh-body);
      color: var(--text); opacity: 0; transform: translateY(6px); transition: opacity .6s ease .2s, transform .6s ease .2s; }
    .bgi-beschluss.sichtbar { opacity: 1; transform: none; }
    .bgi-beschluss a { color: var(--accent); font-weight: 600; }
    @media (prefers-reduced-motion: reduce) { .bgi-beschluss, .bgi-knopf { transition: none; } }
  `;
  container.appendChild(style);
}

function ohneAnimation() {
  return document.hidden || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// Zielpositionen für den aktuellen Zustand (Feld oder Spalten) und die Bühnengröße
function berechneLayout() {
  const { buehne, personen } = instanz;
  const b = buehne.clientWidth || 900;
  const h = buehne.clientHeight || 420;
  const maenner = personen.filter((p) => !istFrau(p));
  const frauen = personen.filter(istFrau);
  const feld = wolke(personen.length, b / 2, h / 2, Math.min(b * 0.42, h * 1.35), h / 2 - 6);
  const spaltenBreite = Math.min(b * 0.36, 460);
  const links = { x: b / 2 - spaltenBreite - b * 0.04, b: spaltenBreite };
  const rechts = { x: b / 2 + b * 0.04, b: spaltenBreite };
  const spaltenHoehe = h - KOPF_SPALTEN - 8;
  // gemeinsame Zellgröße für beide Spalten (die größere Gruppe bestimmt sie)
  const groesser = Math.max(maenner.length, frauen.length, 1);
  const r = raster(groesser, 0, 0, spaltenBreite, spaltenHoehe);
  const spalte = (gruppe, s) => {
    const g = raster(gruppe.length, s.x, KOPF_SPALTEN, s.b, spaltenHoehe);
    const zelle = Math.min(g.zelle || r.zelle, r.zelle);
    const spaltenZahl = Math.max(1, Math.floor(s.b / zelle));
    const ox = s.x + (s.b - spaltenZahl * zelle) / 2 + zelle / 2;
    return (i) => [ox + (i % spaltenZahl) * zelle, KOPF_SPALTEN + zelle / 2 + Math.floor(i / spaltenZahl) * zelle];
  };
  const posLinks = spalte(maenner, links);
  const posRechts = spalte(frauen, rechts);
  const index = new Map();
  maenner.forEach((p, i) => index.set(p, posLinks(i)));
  frauen.forEach((p, i) => index.set(p, posRechts(i)));
  const radiusFeld = Math.max(1.2, feld.zelle * 0.36);
  const radiusSpalte = Math.max(1.2, Math.min(r.zelle, feld.zelle) * 0.36);
  return { b, h, feld, index, links, rechts, spaltenHoehe, radiusFeld, radiusSpalte, maenner, frauen };
}

function zeichne(animiert) {
  const { svg, punkte, sortiert } = instanz;
  const L = berechneLayout();
  instanz.layout = L;
  svg.attr('viewBox', `0 0 ${L.b} ${L.h}`);
  const ziel = (p, i) => (sortiert ? L.index.get(p) : L.feld.pos(i));
  const radius = sortiert ? L.radiusSpalte : L.radiusFeld;
  const setze = (sel) => sel
    .attr('cx', (p, i) => ziel(p, i)[0]).attr('cy', (p, i) => ziel(p, i)[1])
    .attr('r', radius)
    .attr('fill-opacity', (p) => (sortiert ? 0.85 : p.helligkeit));
  punkte.interrupt();
  if (animiert && !ohneAnimation()) {
    // Kaskade: Punkte setzen sich gestaffelt in Bewegung, nach Ziel-Zeile und etwas Zufall
    punkte.transition().duration(DAUER)
      .delay((p, i) => (sortiert ? (ziel(p, i)[1] / L.h) * 420 : p.verzoegerung * 260) + p.verzoegerung * 300)
      .ease(d3.easeCubicInOut).call(setze);
    setTimeout(() => { if (instanz) setze(punkte.interrupt()); }, DAUER + 900); // ruhende Tabs: Endzustand sicher
  } else {
    setze(punkte);
  }
  zeichneSpalten(animiert);
  instanz.beschluss.classList.toggle('sichtbar', sortiert);
}

// Überschriften, Zahlen und der leere Rahmen der Frauen-Spalte
function zeichneSpalten(animiert) {
  const { ebeneSpalten, sortiert, layout: L } = instanz;
  ebeneSpalten.selectAll('*').remove();
  if (!sortiert) return;
  const g = ebeneSpalten.append('g').attr('opacity', animiert && !ohneAnimation() ? 0 : 1);
  [[L.links, 'Männer', L.maenner.length], [L.rechts, 'Frauen', L.frauen.length]].forEach(([s, titel, anzahl]) => {
    const mitte = s.x + s.b / 2;
    g.append('text').attr('class', 'bgi-spaltenkopf').attr('x', mitte).attr('y', 26).text(titel);
    g.append('text').attr('class', 'bgi-spaltenzahl').attr('x', mitte).attr('y', 50).text(zahl(anzahl));
  });
  if (L.frauen.length === 0) {
    const rechts = L.rechts;
    g.append('rect')
      .attr('x', rechts.x).attr('y', KOPF_SPALTEN).attr('width', rechts.b).attr('height', L.spaltenHoehe)
      .attr('rx', 10).attr('fill', 'none').attr('stroke', RAHMEN).attr('stroke-width', 1.4).attr('stroke-dasharray', '6 6');
    g.append('text').attr('class', 'bgi-leer').attr('x', rechts.x + rechts.b / 2).attr('y', KOPF_SPALTEN + L.spaltenHoehe / 2).text('keine Einträge');
  }
  if (animiert && !ohneAnimation()) {
    g.transition().delay(DAUER * 0.55).duration(700).attr('opacity', 1);
    setTimeout(() => g.attr('opacity', 1), DAUER + 1200);
  }
}

function schalte() {
  instanz.sortiert = !instanz.sortiert;
  const k = instanz.knopf;
  k.setAttribute('aria-pressed', String(instanz.sortiert));
  k.textContent = instanz.sortiert ? 'Wieder mischen' : 'Nach Geschlecht ordnen';
  instanz.svg.attr('aria-label', instanz.sortiert
    ? `${zahl(instanz.layout.maenner.length)} Männer und ${zahl(instanz.layout.frauen.length)} Frauen im Bürgerbuch`
    : `${zahl(instanz.personen.length)} Personen im Bürgerbuch, als Punktfeld`);
  zeichne(true);
}

export function render(container, data, options = {}) {
  if (instanz) destroy();
  container.innerHTML = '';
  fuegeStyleEin(container);
  const buergerbuch = data?.buergerbuch || [];
  const personen = mische(sammlePersonen(buergerbuch, data?.personenliste));
  const spanne = jahresSpanne(buergerbuch);

  const wurzel = document.createElement('div');
  wurzel.className = 'bgi-wurzel';
  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'bgi-werkzeugleiste';
  const kopf = document.createElement('div');
  kopf.className = 'bgi-kopf';
  kopf.innerHTML = `<div class="bgi-ueberzeile">Bürgerbuch Krems${spanne ? ` · ${spanne[0]}–${spanne[1]}` : ''}</div>
    <p class="bgi-zahl">${zahl(personen.length)} Personen</p>
    <div class="bgi-unterzeile">Neubürger und ihre Bürgen, ein Punkt je Person</div>`;
  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = 'bgi-knopf';
  knopf.textContent = 'Nach Geschlecht ordnen';
  knopf.setAttribute('aria-pressed', 'false');
  kopf.appendChild(knopf);
  const buehne = document.createElement('div');
  buehne.className = 'bgi-buehne';
  const beschluss = document.createElement('p');
  beschluss.className = 'bgi-beschluss';
  beschluss.setAttribute('aria-live', 'polite');
  beschluss.innerHTML = `Das Bürgerbuch nennt in diesen Jahren keine einzige Frau. Frauen lebten und arbeiteten dennoch in Krems und Stein,
    manche heißen in anderen Quellen ausdrücklich Bürgerin. Die Führung <a href="${FUEHRUNG_LINK}">Frauen im Archiv</a> folgt ihren Spuren.`;
  wurzel.append(werkzeugleiste, kopf, buehne, beschluss);
  container.appendChild(wurzel);

  // Höhe: die Bühne füllt den sichtbaren Platz (abzüglich Kopf und Schlusssatz)
  const hoehe = options.height || ermittleVerfuegbareHoehe(buehne, { reserveUnten: 120, mindestHoehe: 320 });
  buehne.style.height = `${hoehe}px`;

  const svg = d3.select(buehne).append('svg').attr('role', 'img')
    .attr('aria-label', `${zahl(personen.length)} Personen im Bürgerbuch, als Punktfeld`);
  const ebeneSpalten = svg.append('g');
  const punkte = svg.append('g').selectAll('circle').data(personen).join('circle')
    .attr('class', 'bgi-punkt').attr('fill', FARBE);
  punkte
    .on('mouseenter', function (event, p) {
      const zeile = p.rolle === 'neubuerger' ? `Neubürger${p.jahr ? ` ${p.jahr}` : ''}` : 'Bürge';
      zeigeTooltip(`${p.name}\n${zeile}`, this, container);
    })
    .on('mouseleave', () => versteckeTooltip());

  instanz = { container, wurzel, buehne, personen, sortiert: false, svg, punkte, ebeneSpalten, knopf, beschluss, infoButton: null, layout: null };
  knopf.addEventListener('click', schalte);
  infotextFuerModul('buergerinnen').then((cfg) => {
    if (!instanz || !cfg || !werkzeugleiste.isConnected) return;
    instanz.infoButton = erzeugeInfoButton(werkzeugleiste, cfg);
  });
  zeichne(false);
  instanz.beobachter = new ResizeObserver(() => { if (instanz) zeichne(false); });
  instanz.beobachter.observe(buehne);
}

export function resize() {
  if (instanz) zeichne(false);
}

export function destroy() {
  if (!instanz) return;
  instanz.beobachter?.disconnect();
  instanz.punkte?.interrupt();
  instanz.infoButton?.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
