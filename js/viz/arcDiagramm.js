// js/viz/arcDiagramm.js
// Arc-Diagramm der Ko-Nennungen: Personen entlang einer Achse aufgereiht, Bögen
// darüber verbinden gemeinsam genannte Personen. Modul-Interface siehe Abschnitt 5.
//
// SKALEN-EINSCHRÄNKUNG (siehe js/utils/urkundenPersonen.js): Top 40 nach
// Verbindungsgrad, mit sichtbarer Beschriftung "Top 40 von N" (Abschnitt 12).

import { CAT_COLORS } from '../config/constants.js';
import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { baueKoNennungsNetzwerk, waehleTopPersonenNachGrad, baueKoNennungTooltip } from '../utils/urkundenPersonen.js';

const TOP_N = 40;
const RAND = { oben: 20, unten: 90, links: 20, rechts: 20 };
const BOGEN_HOEHE_MAX = 200;

let instanz = null; // { container, records, options } – ein aktives Arc-Diagramm pro Modul-Ladung

function baueBogenPfad(x0, x1, hoehe) {
  const xMitte = (x0 + x1) / 2;
  const yAchse = 0;
  return `M${x0},${yAchse} Q${xMitte},${yAchse - hoehe} ${x1},${yAchse}`;
}

function zeichneArcDiagramm() {
  const { container, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  container.innerHTML = '';

  const { knoten, paare } = baueKoNennungsNetzwerk(records);
  const { knoten: topKnoten, paare: topPaare, gesamtAnzahlVerbunden } = waehleTopPersonenNachGrad(knoten, paare, TOP_N);

  const hinweis = document.createElement('p');
  hinweis.style.fontSize = '12px';
  hinweis.style.margin = '0 0 4px 0';
  hinweis.textContent = `Top ${topKnoten.length} von ${gesamtAnzahlVerbunden} Personen mit mindestens einer Ko-Nennung, nach Verbindungsgrad sortiert.`;
  container.appendChild(hinweis);

  const breite = options.width || container.clientWidth || Math.max(topKnoten.length * 60, 700);
  const xSkala = d3.scalePoint().domain(topKnoten.map((k) => k.id)).range([RAND.links, breite - RAND.rechts]).padding(0.5);
  const maxAnzahl = d3.max(topKnoten, (d) => d.anzahl) || 1;
  const radiusSkala = d3.scaleSqrt().domain([1, maxAnzahl]).range([3, 12]);
  const maxPaarAnzahl = d3.max(topPaare, (p) => p.anzahl) || 1;
  const bogenHoeheSkala = d3.scaleSqrt().domain([1, maxPaarAnzahl]).range([20, BOGEN_HOEHE_MAX]);

  const hoehe = BOGEN_HOEHE_MAX + RAND.unten;
  const svg = d3.select(container).append('svg')
    .attr('width', breite).attr('height', hoehe)
    .attr('viewBox', `0 0 ${breite} ${hoehe}`)
    .attr('role', 'img')
    .attr('aria-label', `Arc-Diagramm der Top ${topKnoten.length} Personen nach Ko-Nennungen`);

  svg.append('desc').text(
    'Personen entlang einer Achse, Bögen darüber verbinden gemeinsam genannte ' +
    'Personen, Bogenhöhe nach Häufigkeit. Gestrichelter roter Rand kennzeichnet ' +
    'Bögen mit unsicherer Personenangabe.'
  );

  const achsenGruppe = svg.append('g').attr('transform', `translate(0,${BOGEN_HOEHE_MAX + 10})`);

  const baender = achsenGruppe.append('g').attr('fill', 'none')
    .selectAll('path.ko-nennung-bogen')
    .data(topPaare)
    .join('path')
    .attr('class', 'ko-nennung-bogen')
    .attr('tabindex', 0)
    .attr('d', (p) => baueBogenPfad(xSkala(p.a.id), xSkala(p.b.id), bogenHoeheSkala(p.anzahl)))
    .attr('stroke', CAT_COLORS.default)
    .attr('stroke-opacity', 0.5)
    .attr('stroke-width', (p) => Math.max(1, Math.sqrt(p.anzahl)))
    .attr('stroke-dasharray', (p) => (zeigeUnsicherheit && p.unsicherAnzahl > 0 ? '4,3' : null));
  baender
    .on('mouseenter focus', function (event, p) { zeigeTooltip(baueKoNennungTooltip(p), this, container); })
    .on('mouseleave blur', () => versteckeTooltip());

  const knotenGruppe = achsenGruppe.append('g').selectAll('g.person-knoten')
    .data(topKnoten)
    .join('g')
    .attr('class', 'person-knoten')
    .attr('transform', (d) => `translate(${xSkala(d.id)},0)`);
  knotenGruppe.append('circle').attr('tabindex', 0).attr('r', (d) => radiusSkala(d.anzahl)).attr('fill', CAT_COLORS.default);
  knotenGruppe.append('text')
    .attr('transform', 'rotate(45)')
    .attr('x', 6).attr('dominant-baseline', 'middle').attr('font-size', 9)
    .text((d) => (d.name.length > 18 ? `${d.name.slice(0, 16)}…` : d.name));
  knotenGruppe
    .on('mouseenter focus', function (event, d) { zeigeTooltip(`${d.name}\n${d.anzahl} Nennung(en) gesamt`, this, container); })
    .on('mouseleave blur', () => versteckeTooltip());
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  instanz = { container, records: data, options: { showUncertainty: true, width: null, height: null, ...options } };
  zeichneArcDiagramm();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneArcDiagramm();
}

export function destroy() {
  if (!instanz) return;
  instanz.container.innerHTML = '';
  instanz = null;
}
