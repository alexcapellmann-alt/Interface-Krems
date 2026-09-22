// js/viz/alluvial.js
// Alluviales Diagramm der Urkunden: links Knoten je Jahrhundert (+ "Undatiert"),
// rechts Knoten je Kategorie, dazwischen Fluss-Bänder proportional zur Anzahl
// Urkunden je Jahrhundert-Kategorie-Kombination. Zeigt Verschiebungen der
// Kategorie-Zusammensetzung über die Zeit als Fluss statt als gestapelte Fläche
// (Unterschied zu marimekko.js: hier liegt der Fokus auf einzelnen Verbindungen
// zwischen zwei Stufen, nicht auf Flächenanteilen innerhalb einer Achse).
//
// Kein d3-sankey (nicht Teil des freigegebenen Stacks, Abschnitt 2) - die
// Fluss-Bänder werden als einfache Bezier-Ribbons von Hand gezeichnet.
//
// Modul-Interface siehe Abschnitt 5. Undatierte Urkunden sind ein regulärer eigener
// Knoten (Abschnitt 12: nie stillschweigend ausblenden), siehe
// gruppiereNachJahrhundertUndKategorie().

import { CAT_COLORS } from '../config/constants.js';
import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { ermittleKategorienSortiertNachHaeufigkeit, gruppiereNachJahrhundertUndKategorie } from '../utils/urkundenZeit.js';

const RAND = { oben: 10, unten: 10, links: 80, rechts: 140 };
const KNOTEN_BREITE = 14;
const KNOTEN_ABSTAND = 4;

let instanz = null; // { container, records, options } – ein aktives Alluvial-Diagramm pro Modul-Ladung

function farbeFuerKategorie(kategorie) {
  return CAT_COLORS[kategorie] || CAT_COLORS.default;
}

function baueRibbonPfad(x0, x1, y0Top, y0Bottom, y1Top, y1Bottom) {
  const xMitte = (x0 + x1) / 2;
  return `M${x0},${y0Top} C${xMitte},${y0Top} ${xMitte},${y1Top} ${x1},${y1Top} `
    + `L${x1},${y1Bottom} C${xMitte},${y1Bottom} ${xMitte},${y0Bottom} ${x0},${y0Bottom} Z`;
}

// Berechnet Knoten-Positionen (oben/Höhe je Bucket bzw. Kategorie) und die
// Fluss-Bänder dazwischen, konsistent auf beiden Seiten gestapelt.
function berechneLayout(buckets, kategorien, matrix, hoehePlot) {
  const bucketSummen = matrix.map((zeile) => Object.values(zeile).reduce((s, z) => s + z.anzahl, 0));
  const kategorieSummen = kategorien.map((k) => matrix.reduce((s, zeile) => s + zeile[k].anzahl, 0));
  const gesamtSumme = bucketSummen.reduce((a, b) => a + b, 0) || 1;
  const skala = (hoehePlot - Math.max(buckets.length, kategorien.length) * KNOTEN_ABSTAND) / gesamtSumme;

  const linkeKnoten = [];
  let cursorLinks = RAND.oben;
  buckets.forEach((bucket, i) => {
    linkeKnoten.push({ bucket, top: cursorLinks, hoehe: bucketSummen[i] * skala });
    cursorLinks += bucketSummen[i] * skala + KNOTEN_ABSTAND;
  });

  const rechteKnoten = [];
  let cursorRechts = RAND.oben;
  kategorien.forEach((kategorie, i) => {
    rechteKnoten.push({ kategorie, top: cursorRechts, hoehe: kategorieSummen[i] * skala });
    cursorRechts += kategorieSummen[i] * skala + KNOTEN_ABSTAND;
  });

  const linkeCursor = linkeKnoten.map((k) => k.top);
  const rechteCursor = rechteKnoten.map((k) => k.top);
  const baender = [];
  buckets.forEach((bucket, bucketIndex) => {
    kategorien.forEach((kategorie, kategorieIndex) => {
      const zelle = matrix[bucketIndex][kategorie];
      if (zelle.anzahl === 0) return;
      const dicke = zelle.anzahl * skala;
      const y0Top = linkeCursor[bucketIndex];
      const y1Top = rechteCursor[kategorieIndex];
      linkeCursor[bucketIndex] += dicke;
      rechteCursor[kategorieIndex] += dicke;
      baender.push({ bucket, kategorie, zelle, y0Top, y0Bottom: y0Top + dicke, y1Top, y1Bottom: y1Top + dicke });
    });
  });

  return { linkeKnoten, rechteKnoten, baender, gesamtHoehe: Math.max(cursorLinks, cursorRechts) };
}

function baueBandTooltip(band) {
  const zeilen = [band.bucket.label, '→', band.kategorie, `${band.zelle.anzahl} Urkunde(n)`];
  if (band.zelle.unsicherAnzahl > 0) zeilen.push(`davon ${band.zelle.unsicherAnzahl} mit unsicherer Datierung`);
  return zeilen.join(' ');
}

function zeichneKnoten(svg, knoten, x, beschriftungX, textAnker, beschriftungFn, farbeFn) {
  const gruppen = svg.append('g').selectAll(null)
    .data(knoten)
    .join('g');
  gruppen.append('rect')
    .attr('x', x).attr('y', (d) => d.top)
    .attr('width', KNOTEN_BREITE).attr('height', (d) => Math.max(d.hoehe, 0))
    .attr('fill', farbeFn);
  gruppen.append('text')
    .attr('x', beschriftungX).attr('y', (d) => d.top + d.hoehe / 2)
    .attr('text-anchor', textAnker).attr('dominant-baseline', 'middle').attr('font-size', 10)
    .text(beschriftungFn);
}

function zeichneAlluvial() {
  const { container, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  container.innerHTML = '';

  const kategorien = ermittleKategorienSortiertNachHaeufigkeit(records.map((record) => ({ record })));
  const { buckets, matrix } = gruppiereNachJahrhundertUndKategorie(records, kategorien);

  // Vollbild-Konvention (siehe docs/VOLLBILD_KONVENTION.md, Punkt 3b -
  // flächenbasierter Inhalt): Plot-Höhe aus der tatsächlich verfügbaren
  // Container-Höhe abgeleitet statt fest auf 500 codiert - kein eigener
  // Flex-Wrapper nötig (keine Werkzeugleiste in diesem Modul). 500 bleibt
  // als Mindesthöhe erhalten (Punkt 4 der Konvention).
  const breite = options.width || container.clientWidth || 900;
  const hoehePlot = options.height || Math.max(container.clientHeight || 500, 500);
  const { linkeKnoten, rechteKnoten, baender, gesamtHoehe } = berechneLayout(buckets, kategorien, matrix, hoehePlot);

  const svg = d3.select(container).append('svg').attr('width', breite);
  const xLinks = RAND.links;
  const xRechts = breite - RAND.rechts - KNOTEN_BREITE;

  const baenderAuswahl = svg.append('g').attr('class', 'alluvial-baender')
    .selectAll('path.fluss-band')
    .data(baender)
    .join('path')
    .attr('class', 'fluss-band')
    .attr('tabindex', 0)
    .attr('d', (d) => baueRibbonPfad(xLinks + KNOTEN_BREITE, xRechts, d.y0Top, d.y0Bottom, d.y1Top, d.y1Bottom))
    .attr('fill', (d) => farbeFuerKategorie(d.kategorie))
    .attr('fill-opacity', 0.55)
    .attr('stroke', (d) => (zeigeUnsicherheit && d.zelle.unsicherAnzahl > 0 ? '#c0392b' : 'none'))
    .attr('stroke-width', (d) => (zeigeUnsicherheit && d.zelle.unsicherAnzahl > 0 ? 1.5 : 0))
    .attr('stroke-dasharray', (d) => (zeigeUnsicherheit && d.zelle.unsicherAnzahl > 0 ? '4,3' : null));
  baenderAuswahl
    .on('mouseenter focus', function (event, d) { zeigeTooltip(baueBandTooltip(d), this, container); })
    .on('mouseleave blur', () => versteckeTooltip());

  zeichneKnoten(svg, linkeKnoten, xLinks, xLinks - 6, 'end', (d) => d.bucket.label, () => '#888888');
  zeichneKnoten(svg, rechteKnoten, xRechts, xRechts + KNOTEN_BREITE + 6, 'start', (d) => d.kategorie, (d) => farbeFuerKategorie(d.kategorie));

  const gesamtSvgHoehe = gesamtHoehe + RAND.unten;
  svg.attr('height', gesamtSvgHoehe)
    .attr('viewBox', `0 0 ${breite} ${gesamtSvgHoehe}`)
    .attr('role', 'img')
    .attr('aria-label', 'Alluviales Diagramm: Jahrhundert-Kategorie-Flüsse der Urkunden');

  svg.append('desc').text(
    'Links: Knoten je Jahrhundert (inkl. Undatiert). Rechts: Knoten je Kategorie. Die ' +
    'Dicke jedes Flussbands zeigt die Anzahl Urkunden dieser Kombination. Gestrichelter ' +
    'roter Rand kennzeichnet Bänder mit mindestens einer unsicher datierten Urkunde.'
  );
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  instanz = { container, records: data, options: { showUncertainty: true, width: null, height: null, ...options } };
  zeichneAlluvial();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneAlluvial();
}

export function destroy() {
  if (!instanz) return;
  instanz.container.innerHTML = '';
  instanz = null;
}
