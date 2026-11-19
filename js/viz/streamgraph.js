// js/viz/streamgraph.js – Ansicht „Streamgraph“ des Bürgerbuchs
// Zweck: Bürgeraufnahmen je Wirtschaftssektor über die Zeit als geschichtete Fläche (x = Jahr), relative Veränderung
//   der 16 Sektoren; Farben wie in Trellis und Bump Chart, Legende in der Kopfzeile.
// Eingabe: `data` = buergerbuch.csv (Datum, Beruf bzw. Sektor, Datum_unsicher, Beruf_unsicher) über
//   utils/buergerbuchZeit.js.
// Schnittstelle: render(container, data, options), resize(neueOptionen), destroy() wie alle Ansichten (docs/SCHEMA.md);
//   options.showUncertainty zeigt rote Punkte an Segmenten mit unsicheren Angaben.
// Abhängigkeiten: D3 v7, utils/buergerbuchZeit.js, utils/tooltip.js, utils/infoButton.js, utils/abdunkeln.js.
// Bedienung: Hover hebt eine Fläche hervor, Klick friert sie ein, Klick ins Leere löst sie.
// Hintergrund: docs/MODULNOTIZEN.md, Abschnitt streamgraph.js.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { markiereHell } from '../utils/abdunkeln.js'; // Nachbesserung 3, Punkt 4
import { infotextFuerModul } from '../core/archivKonfiguration.js';
import {
  teileNachJahr,
  ermittleSektorenSortiertNachHaeufigkeit,
  berechneJahresBins,
  gruppiereProBinUndSektor,
  baueSektorFarbSkala
} from '../utils/buergerbuchZeit.js';

const BIN_GROESSE_JAHRE = 1;
const RAND = { oben: 20, unten: 40, links: 20, rechts: 20 };
const HOEHE_PLOT = 320;

const AKTIV_OPAZITAET = 1;
const INAKTIV_OPAZITAET = 0.15;
const STANDARD_OPAZITAET = 0.85;

let instanz = null; // { container, wurzel, records, options, infoButton, hoverSektor, frozenSektor, flaechenAuswahl } – eine aktive Ansicht pro Modul-Ladung

function baueSegmentTooltip(sektor, bin, zelle) {
  const zeilen = [sektor, `${bin.von}`, `${zelle.anzahl} Bürgeraufnahme(n)`];
  if (zelle.unsicherAnzahl > 0) zeilen.push(`davon ${zelle.unsicherAnzahl} mit unsicherer Angabe`);
  return zeilen.join('\n');
}

// Tooltips über Fläche und Legende (Wunsch des Autors, 2026-10-28)
const zahl = (n) => n.toLocaleString('de-AT');
const aufnahmen = (n) => `${zahl(n)} Bürgeraufnahme${n === 1 ? '' : 'n'}`;

// Kennzahlen je Sektor über alle Jahre: Summe, unsichere, erstes und letztes Jahr mit Aufnahme
function baueSektorSummen(sektoren, bins, matrix) {
  const summen = new Map();
  sektoren.forEach((sektor) => {
    let anzahl = 0;
    let unsicher = 0;
    let erstes = null;
    let letztes = null;
    bins.forEach((bin, i) => {
      const zelle = matrix[i][sektor];
      if (!zelle.anzahl) return;
      anzahl += zelle.anzahl;
      unsicher += zelle.unsicherAnzahl;
      if (erstes === null) erstes = bin.von;
      letztes = bin.von;
    });
    summen.set(sektor, { anzahl, unsicher, erstes, letztes });
  });
  return summen;
}

function baueSektorTooltip(sektor, summe, gesamt) {
  const anteil = gesamt ? Math.round((summe.anzahl / gesamt) * 1000) / 10 : 0;
  const zeilen = [sektor, `${aufnahmen(summe.anzahl)} (${anteil.toLocaleString('de-AT')} % aller)`];
  if (summe.erstes !== null) zeilen.push(summe.erstes === summe.letztes ? `nur ${summe.erstes}` : `${summe.erstes}–${summe.letztes}`);
  if (summe.unsicher > 0) zeilen.push(`davon ${zahl(summe.unsicher)} mit unsicherer Angabe`);
  return zeilen.join('\n');
}

// Dieselbe Drei-Zustände-Logik wie bumpChart.js' aktualisiereHervorhebung()
// (siehe docs/MODULNOTIZEN.md), hier auf Flächen statt Linien angewendet.
function aktualisiereHervorhebung() {
  const { flaechenAuswahl, hoverSektor, frozenSektor } = instanz;
  if (!flaechenAuswahl) return;
  const aktiv = frozenSektor || hoverSektor;
  flaechenAuswahl
    .classed('streamgraph-flaeche-eingefroren', (d) => d.key === frozenSektor)
    .attr('fill-opacity', (d) => (!aktiv ? STANDARD_OPAZITAET : d.key === aktiv ? AKTIV_OPAZITAET : INAKTIV_OPAZITAET))
    .attr('stroke', (d) => (d.key === aktiv ? 'var(--text)' : 'none'))
    .attr('stroke-width', (d) => (d.key === aktiv ? 1.5 : 0));
}

function baueKopfzeile(container, sektoren, farbeFuerSektor, tooltipFuer) {
  const kopfzeile = document.createElement('div');
  kopfzeile.className = 'streamgraph-kopfzeile';

  // AUFTRAG D, Punkt 1 (axe heading-order): <h2> statt <h3> nach der verborgenen <h1>; Größe per Klasse wie bisher
  const titel = document.createElement('h2');
  titel.className = 'streamgraph-titel';
  titel.textContent = 'Wirtschaftssektoren über die Zeit';
  kopfzeile.appendChild(titel);

  const legende = document.createElement('div');
  legende.className = 'streamgraph-legende';
  sektoren.forEach((sektor) => {
    const eintrag = document.createElement('span');
    eintrag.className = 'streamgraph-legende-eintrag';
    const punkt = document.createElement('span');
    punkt.className = 'streamgraph-legende-punkt';
    punkt.style.background = farbeFuerSektor(sektor);
    eintrag.append(punkt, document.createTextNode(sektor));
    // seit 2026-10-28: Tooltip mit Kennzahlen, die Fläche im Graph wird dabei hervorgehoben
    eintrag.tabIndex = 0;
    const zeige = () => { zeigeTooltip(tooltipFuer(sektor), eintrag, container); instanz.hoverSektor = sektor; aktualisiereHervorhebung(); };
    const verstecke = () => { versteckeTooltip(); instanz.hoverSektor = null; aktualisiereHervorhebung(); };
    eintrag.addEventListener('mouseenter', zeige);
    eintrag.addEventListener('focus', zeige);
    eintrag.addEventListener('mouseleave', verstecke);
    eintrag.addEventListener('blur', verstecke);
    legende.appendChild(eintrag);
  });
  kopfzeile.appendChild(legende);

  container.appendChild(kopfzeile);
  return kopfzeile;
}

// Länge begründet (über 100 Zeilen, Masterprompt §13.3; Nachbesserung 8): zeichnet die ganze Ansicht in einem Durchgang (Maße, Skalen, Achsen, Elemente, Beschriftung, Interaktion); die Schritte teilen viele lokale Größen, eine Zerlegung bräuchte lange Parameterlisten ohne Gewinn an Lesbarkeit.
function zeichneStreamgraph() {
  const { container, wurzel, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  instanz.hoverSektor = null;
  instanz.frozenSektor = null;

  if (instanz.infoButton) instanz.infoButton.destroy();
  wurzel.innerHTML = '';

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'streamgraph-werkzeugleiste';
  infotextFuerModul('streamgraph').then((cfg) => {
    if (!instanz || !cfg || !werkzeugleiste.isConnected) return;
    instanz.infoButton = erzeugeInfoButton(werkzeugleiste, cfg);
  });

  const plotBereich = document.createElement('div');
  plotBereich.className = 'streamgraph-plot-bereich';
  wurzel.append(werkzeugleiste, plotBereich);

  const { mitJahr } = teileNachJahr(records);
  const sektoren = ermittleSektorenSortiertNachHaeufigkeit(mitJahr);
  const farbeFuerSektor = baueSektorFarbSkala(records);
  const bins = mitJahr.length > 0 ? berechneJahresBins(mitJahr, BIN_GROESSE_JAHRE) : [];
  const matrix = gruppiereProBinUndSektor(mitJahr, sektoren, bins);

  const sektorSummen = baueSektorSummen(sektoren, bins, matrix);
  const gesamtAufnahmen = [...sektorSummen.values()].reduce((s, x) => s + x.anzahl, 0);
  const sektorTooltip = (sektor) => baueSektorTooltip(sektor, sektorSummen.get(sektor), gesamtAufnahmen);
  const kopfzeile = baueKopfzeile(plotBereich, sektoren, farbeFuerSektor, sektorTooltip);

  // Höhen-Budget von `instanz.container` gemessen, nicht von `plotBereich`
  // (derselbe bereits etablierte Fix wie in trellis.js/vermoegensschichtung.js
  // - `plotBereich` ist gerade erst neu bestückt, seine eigene Höhe wäre in
  // diesem Moment noch nicht verlässlich).
  const kopfzeileHoehe = kopfzeile.getBoundingClientRect().height + 10;
  const breite = options.width || container.clientWidth || 900;
  const hoehePlot = (options.height || Math.max(instanz.container.clientHeight || (HOEHE_PLOT + kopfzeileHoehe), HOEHE_PLOT + kopfzeileHoehe)) - kopfzeileHoehe;

  const stackDaten = bins.map((bin, binIndex) => {
    const zeile = { jahr: bin.von };
    sektoren.forEach((sektor) => { zeile[sektor] = matrix[binIndex][sektor].anzahl; });
    return zeile;
  });
  const reihen = d3.stack().keys(sektoren).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut)(stackDaten);

  const xSkala = d3.scaleLinear()
    .domain(bins.length > 0 ? d3.extent(stackDaten, (d) => d.jahr) : [1535, 1625])
    .range([RAND.links, breite - RAND.rechts]);
  const yExtent = reihen.length > 0
    ? [d3.min(reihen, (r) => d3.min(r, (d) => d[0])), d3.max(reihen, (r) => d3.max(r, (d) => d[1]))]
    : [0, 1];
  const ySkala = d3.scaleLinear().domain(yExtent).range([hoehePlot - RAND.unten, RAND.oben]);

  const svg = d3.select(plotBereich).append('svg').attr('width', breite);

  // Klick auf die freie Fläche setzt eine eingefrorene Hervorhebung zurück
  // (dieselbe Konvention wie bumpChart.js) - liegt UNTER allen Flächen, ein
  // Klick auf eine Fläche selbst stoppt die Ereignis-Weiterleitung (siehe
  // unten) und erreicht diesen Handler deshalb nie.
  svg.append('rect')
    .attr('width', breite).attr('height', hoehePlot).attr('fill', 'transparent')
    .on('click', () => { instanz.frozenSektor = null; aktualisiereHervorhebung(); });

  const flaeche = d3.area()
    .x((d, i) => xSkala(stackDaten[i].jahr))
    .y0((d) => ySkala(d[0]))
    .y1((d) => ySkala(d[1]))
    .curve(d3.curveBasis);

  const flaechenAuswahl = svg.append('g').attr('class', 'streamgraph-flaechen')
    .selectAll('path.streamgraph-flaeche')
    .data(reihen, (d) => d.key)
    .join('path')
    .attr('class', 'streamgraph-flaeche')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => `Sektor ${d.key} hervorheben`)
    .attr('d', flaeche)
    .attr('fill', (d) => farbeFuerSektor(d.key))
    .attr('fill-opacity', STANDARD_OPAZITAET);
  instanz.flaechenAuswahl = flaechenAuswahl;

  function schalteHervorhebung(sektor) {
    instanz.frozenSektor = instanz.frozenSektor === sektor ? null : sektor;
    aktualisiereHervorhebung();
  }

  // Tooltip über der Fläche (2026-10-28): ein unsichtbarer Anker folgt dem Mauszeiger, damit der Tooltip dort
  // erscheint (die Fläche selbst reicht über die ganze Breite); er nennt das Jahr unter dem Zeiger und die Summe
  const anker = svg.append('circle').attr('r', 1).attr('fill', 'none').attr('pointer-events', 'none').node();
  function flaechenTooltip(event, d) {
    const [mx, my] = d3.pointer(event, svg.node());
    anker.setAttribute('cx', mx);
    anker.setAttribute('cy', my);
    const jahr = Math.round(xSkala.invert(mx));
    const binIndex = d3.minIndex(bins, (b) => Math.abs(b.von - jahr));
    const zelle = binIndex >= 0 ? matrix[binIndex][d.key] : null;
    const zeilen = [sektorTooltip(d.key)];
    if (zelle) {
      zeilen.push('', `${bins[binIndex].von}: ${aufnahmen(zelle.anzahl)}`);
      if (zelle.unsicherAnzahl > 0) zeilen.push(`davon ${zahl(zelle.unsicherAnzahl)} mit unsicherer Angabe`);
    }
    zeigeTooltip(zeilen.join('\n'), anker, container);
  }
  flaechenAuswahl
    .on('mouseenter', (event, d) => { instanz.hoverSektor = d.key; aktualisiereHervorhebung(); flaechenTooltip(event, d); })
    .on('mousemove', (event, d) => flaechenTooltip(event, d))
    // 2026-10-28: Fokus wie Hover (Kontur der Fläche) statt rechteckigem Fokusrahmen (Wunsch des Autors)
    .on('focus', function (event, d) { instanz.hoverSektor = d.key; aktualisiereHervorhebung(); zeigeTooltip(sektorTooltip(d.key), this, container); })
    .on('blur', () => { instanz.hoverSektor = null; aktualisiereHervorhebung(); versteckeTooltip(); })
    .on('mouseleave', () => { instanz.hoverSektor = null; aktualisiereHervorhebung(); versteckeTooltip(); })
    .on('click', (event, d) => { event.stopPropagation(); schalteHervorhebung(d.key); })
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); schalteHervorhebung(d.key); }
    });

  // Unsicherheits-Marker (siehe docs/MODULNOTIZEN.md) - ein Punkt am oberen
  // Rand jedes Jahr/Sektor-Segments mit mindestens einer unsicheren Angabe.
  const markerDaten = [];
  reihen.forEach((reihe) => {
    reihe.forEach((punkt, binIndex) => {
      const zelle = matrix[binIndex][reihe.key];
      if (zeigeUnsicherheit && zelle.unsicherAnzahl > 0) {
        markerDaten.push({ sektor: reihe.key, bin: bins[binIndex], zelle, jahr: stackDaten[binIndex].jahr, y: punkt[1] });
      }
    });
  });

  const marker = svg.append('g').attr('class', 'streamgraph-unsicher-marker')
    .selectAll('circle.unsicher-marker')
    .data(markerDaten)
    .join('circle')
    .attr('class', 'unsicher-marker')
    .call((a) => markiereHell(a, () => true)) // Nachbesserung 3, Punkt 4: die Marker SIND die unsicheren Stellen
    .attr('tabindex', 0)
    .attr('cx', (d) => xSkala(d.jahr))
    .attr('cy', (d) => ySkala(d.y))
    .attr('r', 2.5)
    .attr('fill', '#c0392b');
  marker
    .on('mouseenter focus', function (event, d) { zeigeTooltip(baueSegmentTooltip(d.sektor, d.bin, d.zelle), this, container); })
    .on('mouseleave blur', () => versteckeTooltip());

  svg.append('g')
    .attr('class', 'streamgraph-achse')
    .attr('transform', `translate(0,${hoehePlot - RAND.unten})`)
    .call(d3.axisBottom(xSkala).tickFormat(d3.format('d')));

  svg.attr('height', hoehePlot)
    .attr('viewBox', `0 0 ${breite} ${hoehePlot}`)
    .attr('role', 'group') // AUFTRAG D, Punkt 2 (axe nested-interactive): enthält bedienbare Elemente; aria-label bleibt
    .attr('aria-label', 'Streamgraph des Bürgerbuchs: Wirtschaftssektoren über die Zeit');

  svg.append('desc').text(
    'Gestapelte, organisch geschichtete Flächen je Wirtschaftssektor (inklusive "Beruf nicht ' +
    'angegeben") über die Jahre 1535 bis 1625, Dicke zeigt die Anzahl Bürgeraufnahmen je Jahr. ' +
    'Rote Punkte markieren Jahr/Sektor-Kombinationen mit mindestens einer unsicheren Angabe. ' +
    'Hover hebt eine Fläche hervor, Klick friert die Hervorhebung ein.'
  );

  aktualisiereHervorhebung();
}

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .streamgraph-wurzel { display: flex; flex-direction: column; height: 100%; }
    .streamgraph-werkzeugleiste { display: flex; justify-content: flex-end; margin: 0 0 var(--space-3) 0; flex: 0 0 auto; }
    .streamgraph-plot-bereich { flex: 1 1 auto; overflow-x: hidden; overflow-y: visible; }
    .streamgraph-kopfzeile { margin-bottom: var(--space-2); }
    .streamgraph-titel { margin: 0 0 var(--space-2) 0; font-size: var(--fs-h3); }
    .streamgraph-legende { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); font-size: var(--fs-sm); }
    .streamgraph-legende-eintrag { display: inline-flex; align-items: center; gap: 4px; cursor: default; border-radius: 3px; padding: 0 2px; }
    .streamgraph-legende-eintrag:hover, .streamgraph-legende-eintrag:focus-visible { background: rgba(44, 74, 110, .08); outline: none; }
    .streamgraph-legende-punkt { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .streamgraph-flaeche { cursor: pointer; transition: fill-opacity .15s ease; }
    .streamgraph-flaeche:focus, .streamgraph-flaeche:focus-visible { outline: none; } /* Fokus zeigt die Kontur, siehe aktualisiereHervorhebung() */
    .streamgraph-achse { font-size: 12px; }
  `;
  container.appendChild(style);
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  container.innerHTML = '';
  fuegeStyleEin(container);

  const wurzel = document.createElement('div');
  wurzel.className = 'streamgraph-wurzel';
  container.appendChild(wurzel);

  instanz = {
    container,
    wurzel,
    records: data,
    options: { showUncertainty: true, width: null, height: null, ...options },
    infoButton: null,
    hoverSektor: null,
    frozenSektor: null,
    flaechenAuswahl: null
  };
  zeichneStreamgraph();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneStreamgraph();
}

export function destroy() {
  if (!instanz) return;
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
