// js/viz/bubbleChart.js
// Bubble Chart: eine Kreisfläche je Person, Größe nach Gesamt-Nennungshäufigkeit
// (personenliste.csv - Urkunden UND Bürgerbuch, wie personenliste.js). Modul-
// Interface siehe Abschnitt 5.
//
// Erwartete `data`: das flache `records`-Array aus dataLoader.js für
// personenliste.csv.
//
// Farbe: ein einzelner technischer Ton (kein Kategorie-Bezug, siehe karte.js) -
// Größe ist der informationstragende Kanal (Abschnitt 10: nie nur Farbe).
// Mindestgröße analog bestandsHierarchie.js, damit auch Personen mit wenigen
// Nennungen als eigene, klickbare Fläche sichtbar bleiben statt zu verschwinden.

import { CAT_COLORS } from '../config/constants.js';
import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';

let instanz = null; // { container, records, options } – ein aktiver Bubble Chart pro Modul-Ladung

const MINDESTWERT = 1;
const LABEL_MINDESTRADIUS = 14;

function baueTooltip(record) {
  const zeilen = [
    Array.isArray(record.schreibweisen) ? record.schreibweisen[0] : record.schreibweisen || record.personen_id,
    `${record.quelle || 'unbekannte Quelle'}, ${Number(record.anzahl_nennungen) || 0} Nennung(en)`
  ];
  if (record.unsicherheit_anmerkung) {
    const anmerkung = Array.isArray(record.unsicherheit_anmerkung) ? record.unsicherheit_anmerkung.join(' | ') : record.unsicherheit_anmerkung;
    zeilen.push(anmerkung);
  }
  return zeilen.join('\n');
}

function zeichneBubbleChart() {
  const { container, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  container.innerHTML = '';

  // Vollbild-Konvention (siehe docs/VOLLBILD_KONVENTION.md, Punkt 3b -
  // flächenbasierter Inhalt): Höhe wird wie die Breite bereits daneben zur
  // Laufzeit aus dem Container gemessen statt fest auf 800 codiert - kein
  // eigener Flex-Wrapper nötig, da dieses Modul (anders als z.B. Treemap)
  // KEINE Werkzeugleiste hat, die von der verfügbaren Höhe abgezogen werden
  // müsste - die SVG ist das einzige Kind von `container` (= `.viz-inhalt`,
  // hat bereits über das gemeinsame CSS-Grid die korrekte volle Höhe).
  const breite = options.width || container.clientWidth || 800;
  const hoehe = options.height || container.clientHeight || 800;

  const wurzel = d3.hierarchy({ children: records })
    .sum((d) => Math.max(Number(d.anzahl_nennungen) || 0, MINDESTWERT));
  d3.pack().size([breite, hoehe]).padding(1.5)(wurzel);

  const svg = d3.select(container).append('svg')
    .attr('width', breite).attr('height', hoehe)
    .attr('viewBox', `0 0 ${breite} ${hoehe}`)
    .attr('role', 'img')
    .attr('aria-label', 'Bubble Chart des Personenregisters nach Nennungshäufigkeit');

  svg.append('desc').text(
    'Ein Kreis je Person, Fläche nach Gesamt-Nennungshäufigkeit über Urkunden und ' +
    'Bürgerbuch. Gestrichelter roter Rand kennzeichnet Personen mit einer ' +
    'Unsicherheits-Anmerkung.'
  );

  const blaetter = wurzel.leaves();
  const knoten = svg.selectAll('g.person-blase')
    .data(blaetter)
    .join('g')
    .attr('class', 'person-blase')
    .attr('tabindex', 0)
    .attr('transform', (d) => `translate(${d.x},${d.y})`);

  knoten.append('circle')
    .attr('r', (d) => d.r)
    .attr('fill', CAT_COLORS.default)
    .attr('fill-opacity', 0.75)
    .attr('stroke', (d) => (zeigeUnsicherheit && d.data.unsicherheit_anmerkung ? '#c0392b' : '#ffffff'))
    .attr('stroke-width', (d) => (zeigeUnsicherheit && d.data.unsicherheit_anmerkung ? 2 : 1))
    .attr('stroke-dasharray', (d) => (zeigeUnsicherheit && d.data.unsicherheit_anmerkung ? '4,3' : null));

  knoten.filter((d) => d.r > LABEL_MINDESTRADIUS)
    .append('text')
    .attr('text-anchor', 'middle').attr('dy', '0.3em').attr('font-size', 9).attr('fill', '#111')
    .text((d) => {
      const name = Array.isArray(d.data.schreibweisen) ? d.data.schreibweisen[0] : d.data.schreibweisen || d.data.personen_id;
      return name.length > 14 ? `${name.slice(0, 12)}…` : name;
    });

  knoten
    .on('mouseenter focus', function (event, d) { zeigeTooltip(baueTooltip(d.data), this, container); })
    .on('mouseleave blur', () => versteckeTooltip());
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  instanz = { container, records: data, options: { showUncertainty: true, width: null, height: null, ...options } };
  zeichneBubbleChart();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneBubbleChart();
}

export function destroy() {
  if (!instanz) return;
  instanz.container.innerHTML = '';
  instanz = null;
}
