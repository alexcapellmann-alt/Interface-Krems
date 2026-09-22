// js/viz/marimekko.js
// Marimekko (Mekko-Diagramm) der Urkunden: x-Achse = Jahrhundert (+ eigene Spalte
// "Undatiert"), Spaltenbreite proportional zur Gesamtzahl Urkunden dieses Jahrhunderts;
// innerhalb jeder Spalte 100%-gestapelt nach Kategorie-Anteil. Zeigt so gleichzeitig
// "wie viele Urkunden je Jahrhundert" (Breite) und "welche Kategorien überwiegen in
// welchem Jahrhundert" (Höhe) - Marimekko braucht per Definition zwei unabhängig
// bedeutungstragende Achsen, anders als z.B. swimlanes.js (dort ist nur die Farbe/
// Deckkraft informationstragend, die Zeilenhöhe ist konstant).
//
// Modul-Interface siehe Abschnitt 5. Undatierte Urkunden werden NICHT in einem
// separaten Bereich gezeigt, sondern als reguläre eigene Spalte (Abschnitt 12: nie
// stillschweigend ausblenden) - siehe gruppiereNachJahrhundertUndKategorie().

import { CAT_COLORS } from '../config/constants.js';
import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { ermittleKategorienSortiertNachHaeufigkeit, gruppiereNachJahrhundertUndKategorie } from '../utils/urkundenZeit.js';

const RAND = { oben: 10, unten: 40, links: 10, rechts: 10 };
const SPALTENABSTAND = 2;

let instanz = null; // { container, records, options } – ein aktives Marimekko pro Modul-Ladung

function farbeFuerKategorie(kategorie) {
  return CAT_COLORS[kategorie] || CAT_COLORS.default;
}

function summeProBucket(zeile) {
  return Object.values(zeile).reduce((summe, zelle) => summe + zelle.anzahl, 0);
}

function baueSegmentTooltip(kategorie, bucket, zelle, bucketSumme) {
  const anteil = bucketSumme > 0 ? Math.round((zelle.anzahl / bucketSumme) * 100) : 0;
  const zeilen = [kategorie, bucket.label, `${zelle.anzahl} von ${bucketSumme} Urkunden (${anteil}%)`];
  if (zelle.unsicherAnzahl > 0) zeilen.push(`davon ${zelle.unsicherAnzahl} mit unsicherer Datierung`);
  return zeilen.join('\n');
}

function zeichneMarimekko() {
  const { container, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  container.innerHTML = '';

  const kategorien = ermittleKategorienSortiertNachHaeufigkeit(records.map((record) => ({ record })));
  const { buckets, matrix } = gruppiereNachJahrhundertUndKategorie(records, kategorien);
  const bucketSummen = matrix.map(summeProBucket);
  const gesamtSumme = bucketSummen.reduce((a, b) => a + b, 0) || 1;

  // Vollbild-Konvention (siehe docs/VOLLBILD_KONVENTION.md, Punkt 3b -
  // flächenbasierter Inhalt): Plot-Höhe wird aus der tatsächlich
  // verfügbaren Container-Höhe abgeleitet statt fest auf 400 codiert - kein
  // eigener Flex-Wrapper nötig (keine Werkzeugleiste in diesem Modul, die
  // SVG ist einziges Kind von `container` = `.viz-inhalt`, hat bereits über
  // das gemeinsame CSS-Grid die korrekte volle Höhe).
  const breite = options.width || container.clientWidth || 900;
  const hoehePlot = options.height || Math.max((container.clientHeight || 440) - RAND.oben - RAND.unten, 0);
  const nutzbareBreite = breite - RAND.links - RAND.rechts - (buckets.length - 1) * SPALTENABSTAND;

  const svg = d3.select(container).append('svg').attr('width', breite);

  let xPosition = RAND.links;
  buckets.forEach((bucket, bucketIndex) => {
    const spaltenBreite = Math.max((bucketSummen[bucketIndex] / gesamtSumme) * nutzbareBreite, 0);
    let yPosition = RAND.oben;

    kategorien.forEach((kategorie) => {
      const zelle = matrix[bucketIndex][kategorie];
      if (zelle.anzahl === 0) return;
      const segmentHoehe = (zelle.anzahl / bucketSummen[bucketIndex]) * hoehePlot;

      const rect = svg.append('rect')
        .attr('tabindex', 0)
        .attr('x', xPosition).attr('y', yPosition)
        .attr('width', Math.max(spaltenBreite - 1, 0)).attr('height', Math.max(segmentHoehe - 1, 0))
        .attr('fill', farbeFuerKategorie(kategorie))
        .attr('stroke', zeigeUnsicherheit && zelle.unsicherAnzahl > 0 ? '#c0392b' : '#ffffff')
        .attr('stroke-width', zeigeUnsicherheit && zelle.unsicherAnzahl > 0 ? 2 : 1)
        .attr('stroke-dasharray', zeigeUnsicherheit && zelle.unsicherAnzahl > 0 ? '4,3' : null);
      rect
        .on('mouseenter focus', function () { zeigeTooltip(baueSegmentTooltip(kategorie, bucket, zelle, bucketSummen[bucketIndex]), this, container); })
        .on('mouseleave blur', () => versteckeTooltip());

      yPosition += segmentHoehe;
    });

    svg.append('text')
      .attr('x', xPosition + spaltenBreite / 2).attr('y', hoehePlot + RAND.oben + 16)
      .attr('text-anchor', 'middle').attr('font-size', 10)
      .text(spaltenBreite > 24 ? bucket.label : '');

    xPosition += spaltenBreite + SPALTENABSTAND;
  });

  const gesamtHoehe = RAND.oben + hoehePlot + RAND.unten;
  svg.attr('height', gesamtHoehe)
    .attr('viewBox', `0 0 ${breite} ${gesamtHoehe}`)
    .attr('role', 'img')
    .attr('aria-label', 'Marimekko der Urkunden: Jahrhundert x Kategorie');

  svg.append('desc').text(
    'Spaltenbreite zeigt die Anzahl Urkunden je Jahrhundert (inkl. eigener Spalte für ' +
    'undatierte Urkunden), Spaltenhöhe je Segment zeigt den Kategorie-Anteil innerhalb ' +
    'dieses Jahrhunderts. Gestrichelter roter Rand kennzeichnet Segmente mit ' +
    'mindestens einer unsicher datierten Urkunde.'
  );
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  instanz = { container, records: data, options: { showUncertainty: true, width: null, height: null, ...options } };
  zeichneMarimekko();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneMarimekko();
}

export function destroy() {
  if (!instanz) return;
  instanz.container.innerHTML = '';
  instanz = null;
}
