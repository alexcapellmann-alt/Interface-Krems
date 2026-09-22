// js/viz/adjazenzmatrix.js
// Adjazenzmatrix der Ko-Nennungen: Zelle (i,j) zeigt, wie oft Person i und Person j
// gemeinsam in einer Urkunde genannt werden. Modul-Interface siehe Abschnitt 5.
//
// SKALEN-EINSCHRÄNKUNG (bewusst, siehe js/utils/urkundenPersonen.js): eine
// vollständige Matrix über alle 1351 verbundenen Personen wäre 1.351.801 Zellen -
// weder sinnvoll lesbar noch praktikabel renderbar. Gezeigt werden die Top 40 nach
// Verbindungsgrad, mit sichtbarer Beschriftung "Top 40 von N" (Abschnitt 12: keine
// stille Einschränkung, sondern eine klar ausgewiesene).

import { CAT_COLORS } from '../config/constants.js';
import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { baueKoNennungsNetzwerk, waehleTopPersonenNachGrad } from '../utils/urkundenPersonen.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';

// AUFTRAG "Info-Button für die 6 bleibenden Module" - erste Textfassung
// nannte fälschlich Kategorien statt Personen und eine nicht existierende
// Klick-Funktion (siehe CHANGELOG/PROJEKTLOG, Eintrag 19) - diese, vom
// Auftraggeber nach Rückmeldung korrigierte Fassung, wörtlich übernommen.
const ADJAZENZMATRIX_INFO_TEXT = `Diese Matrix zeigt, wie oft zwei Personen gemeinsam in derselben Urkunde genannt werden. Dargestellt sind die 40 Personen mit den meisten Verbindungen. Eine dunklere Zelle bedeutet häufigere gemeinsame Nennung. Gemeinsame Nennung bedeutet zunächst nur dokumentarische Ko-Präsenz, nicht automatisch eine persönliche, politische oder verwandtschaftliche Beziehung.`;

const TOP_N = 40;
const ZELLENGROESSE = 16;
const RAND = { oben: 110, unten: 10, links: 140, rechts: 10 };

let instanz = null; // { container, records, options, infoButton } – eine aktive Adjazenzmatrix pro Modul-Ladung

function baueZellenIndex(paare) {
  const index = new Map();
  paare.forEach((paar) => {
    index.set(`${paar.a.id}|||${paar.b.id}`, paar);
    index.set(`${paar.b.id}|||${paar.a.id}`, paar);
  });
  return index;
}

// Dasselbe "bei jedem Redraw neu einfügen"-Muster wie karte.js' fuegeStyleEin()
// - container.innerHTML='' unten leert auch ein zuvor eingefügtes <style>.
function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `.adjazenzmatrix-werkzeugleiste { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
    .adjazenzmatrix-werkzeugleiste p { font-size: 12px; margin: 0 0 4px 0; }`;
  container.appendChild(style);
}

function zeichneMatrix() {
  const { container, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  // Info-Button wird bei jedem Redraw zerstört/neu erzeugt, siehe karte.js'
  // identisches Muster/identische Begründung.
  if (instanz.infoButton) instanz.infoButton.destroy();
  container.innerHTML = '';
  fuegeStyleEin(container);

  const { knoten, paare } = baueKoNennungsNetzwerk(records);
  const { knoten: topKnoten, gesamtAnzahlVerbunden } = waehleTopPersonenNachGrad(knoten, paare, TOP_N);
  const zellenIndex = baueZellenIndex(paare);

  const breite = options.width || container.clientWidth || Math.max(topKnoten.length * ZELLENGROESSE + RAND.links + RAND.rechts, 600);
  const hoehePlot = topKnoten.length * ZELLENGROESSE;
  const gesamtHoehe = RAND.oben + hoehePlot + RAND.unten;

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'adjazenzmatrix-werkzeugleiste';
  const hinweis = document.createElement('p');
  hinweis.textContent = `Top ${topKnoten.length} von ${gesamtAnzahlVerbunden} Personen mit mindestens einer Ko-Nennung, nach Verbindungsgrad sortiert.`;
  werkzeugleiste.appendChild(hinweis);
  instanz.infoButton = erzeugeInfoButton(werkzeugleiste, { text: ADJAZENZMATRIX_INFO_TEXT, ariaLabel: 'Erklärung zur Adjazenzmatrix' });
  container.appendChild(werkzeugleiste);

  const svg = d3.select(container).append('svg')
    .attr('width', breite).attr('height', gesamtHoehe)
    .attr('viewBox', `0 0 ${breite} ${gesamtHoehe}`)
    .attr('role', 'img')
    .attr('aria-label', `Adjazenzmatrix der Top ${topKnoten.length} Personen nach Ko-Nennungen`);

  svg.append('desc').text(
    'Jede Zelle zeigt, wie oft zwei Personen gemeinsam in einer Urkunde genannt ' +
    'werden. Gestrichelter roter Rand kennzeichnet Ko-Nennungen mit unsicherer ' +
    'Personenangabe.'
  );

  topKnoten.forEach((person, i) => {
    svg.append('text')
      .attr('x', RAND.links - 6).attr('y', RAND.oben + i * ZELLENGROESSE + ZELLENGROESSE / 2)
      .attr('text-anchor', 'end').attr('dominant-baseline', 'middle').attr('font-size', 9)
      .text(person.name.length > 22 ? `${person.name.slice(0, 20)}…` : person.name);
    svg.append('text')
      .attr('transform', `translate(${RAND.links + i * ZELLENGROESSE + ZELLENGROESSE / 2},${RAND.oben - 6}) rotate(-60)`)
      .attr('text-anchor', 'start').attr('font-size', 9)
      .text(person.name.length > 22 ? `${person.name.slice(0, 20)}…` : person.name);
  });

  const zellenDaten = [];
  topKnoten.forEach((zeile, i) => {
    topKnoten.forEach((spalte, j) => {
      if (i === j) return;
      const paar = zellenIndex.get(`${zeile.id}|||${spalte.id}`);
      if (paar) zellenDaten.push({ i, j, paar });
    });
  });
  const maxAnzahl = d3.max(zellenDaten, (d) => d.paar.anzahl) || 1;
  const opazitaetSkala = d3.scaleLinear().domain([0, maxAnzahl]).range([0.15, 1]);

  const zellen = svg.append('g')
    .selectAll('rect.matrix-zelle')
    .data(zellenDaten)
    .join('rect')
    .attr('class', 'matrix-zelle')
    .attr('tabindex', 0)
    .attr('x', (d) => RAND.links + d.j * ZELLENGROESSE)
    .attr('y', (d) => RAND.oben + d.i * ZELLENGROESSE)
    .attr('width', ZELLENGROESSE - 1).attr('height', ZELLENGROESSE - 1)
    .attr('fill', CAT_COLORS.default)
    .attr('fill-opacity', (d) => opazitaetSkala(d.paar.anzahl))
    .attr('stroke', (d) => (zeigeUnsicherheit && d.paar.unsicherAnzahl > 0 ? '#c0392b' : 'none'))
    .attr('stroke-width', (d) => (zeigeUnsicherheit && d.paar.unsicherAnzahl > 0 ? 1.5 : 0))
    .attr('stroke-dasharray', (d) => (zeigeUnsicherheit && d.paar.unsicherAnzahl > 0 ? '3,2' : null));

  zellen
    .on('mouseenter focus', function (event, d) {
      const zeilen = [`${d.paar.a.name} ↔ ${d.paar.b.name}`, `${d.paar.anzahl} gemeinsame Nennung(en)`];
      if (d.paar.unsicherAnzahl > 0) zeilen.push(`davon ${d.paar.unsicherAnzahl} mit unsicherer Personenangabe`);
      zeigeTooltip(zeilen.join('\n'), this, container);
    })
    .on('mouseleave blur', () => versteckeTooltip());
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  instanz = { container, records: data, options: { showUncertainty: true, width: null, height: null, ...options }, infoButton: null };
  zeichneMatrix();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneMatrix();
}

export function destroy() {
  if (!instanz) return;
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
