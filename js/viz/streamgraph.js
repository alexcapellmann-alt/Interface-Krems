// js/viz/streamgraph.js
// AUFTRAG "Streamgraph → Bürgerbuch (Wirtschaftssektoren über die Zeit)":
// UMZUG von urkunden.ansichten nach buergerbuch.ansichten (Registry-Zuordnung
// UND Dateiinhalt komplett neu gebaut - derselbe Präzedenzfall wie
// parallelKoordinaten.js' Umzug von Urkunden zu Verlassenschaften, siehe
// dortiger Dateikopf-Kommentar: `id`/`modulPfad` bleiben unverändert
// `streamgraph`/`../viz/streamgraph.js`, nur die Zuordnung UND der Inhalt
// ändern sich). Dritte Darstellung derselben Frage (Verteilung der
// Bürgeraufnahmen je Wirtschaftssektor über die Zeit) neben trellis.js
// (Kleinmultiples, absolute Anzahl je Jahr) und bumpChart.js
// (Rangverschiebung je Jahrzehnt) - hier als organisch geschichtete Fläche
// (d3.stackOffsetWiggle), zeigt die RELATIVE Größenveränderung der Sektoren
// im Fluss der Zeit (Info-Text, wörtlich).
//
// Datengrundlage/Utility: js/utils/buergerbuchZeit.js (dieselbe wie
// trellis.js/bumpChart.js/personennetzwerk.js) statt der bisherigen
// urkundenZeit.js - "Undatiert"-Sonderbereich (zeichneUnbekanntBereich())
// deshalb ENTFALLEN, nicht übersehen: buergerbuchZeit.js' eigener
// Dateikopf-Kommentar dokumentiert bereits 0 von 2791 Zeilen mit
// unauswertbarem Datum (robust für künftige Datenlücken, aber aktuell ohne
// sichtbare Fläche) - derselbe bereits etablierte Präzedenzfall wie
// trellis.js' Wegfall der "Undatiert"-Kachel.
//
// Punkt 1 (Achsen/Daten): X-Achse Jahr (echte Jahresauflösung,
// BIN_GROESSE_JAHRE=1 - dieselbe Designentscheidung wie trellis.js: 91 Jahre
// Gesamtspanne sind wenig genug für Einzeljahre, UND diese Auflösung macht
// Streamgraph/Trellis direkt vergleichbar, da beide dieselben Jahres-Bins
// zeigen, nur anders angeordnet). Alle 16 Sektoren (inkl. "Beruf nicht
// angegeben") als eigene Schicht - JEDER Bürgerbucheintrag hat genau einen
// Sektor (ermittleSektor() liefert nie null), die Stack-Summe entspricht
// deshalb je Jahr exakt der Eintragszahl (kein Unsicherheitsproblem wie bei
// Urkunden-Kategorien, die mehrfach oder gar nicht zugeordnet sein können -
// siehe Dateikopf-Kommentar des alten Urkunden-Streamgraphs/urkundenZeit.js).
// Farbe: baueSektorFarbSkala() aus buergerbuchZeit.js wiederverwendet -
// identische Funktion wie in trellis.js/bumpChart.js, dieselben `records`
// liefern deshalb IDENTISCHE Farben je Sektor über alle drei Module hinweg
// (Akzeptanzkriterium "Farben konsistent mit Trellis/Bump Chart").
//
// Legende (nicht explizit beauftragt, aber ohne sie wäre die Hervorhebung
// aus Punkt 2 nicht sinnvoll nutzbar: eine hervorgehobene Fläche ohne
// erkennbare Farbe-zu-Sektor-Zuordnung sagt dem Betrachter nichts) - dieselbe
// "immer sichtbare Identifikation" wie bumpChart.js' Endbeschriftungen neben
// jeder Linie, hier als kompakte Farblegende in der Kopfzeile (16 Einträge,
// dieselbe Reihenfolge wie ermittleSektorenSortiertNachHaeufigkeit()).
//
// Punkt 2 (Interaktion): Hover/Klick-Hervorhebung 1:1 nach bumpChart.js'
// bereits etablierter Drei-Zustände-Logik (hoverSektor temporär, frozenSektor
// eingefroren durch Klick, Klick auf freie Fläche setzt zurück,
// aktualisiereHervorhebung() zentral) - hier auf Flächen statt Linien
// übertragen: aktive Fläche volle Deckkraft + Randlinie, übrige Flächen
// treten durch reduzierte Deckkraft zurück (Auftrag, wörtlich: "kräftigere
// Füllung/Rand ... andere treten zurück").
//
// Unsicherheits-Kennzeichnung: wie im alten Urkunden-Streamgraph ein kleiner
// roter Punkt am oberen Rand jedes Jahr/Sektor-Segments mit mindestens einer
// unsicheren Angabe (istZeitEintragUnsicher() in buergerbuchZeit.js prüft
// Datum_unsicher/Beruf_unsicher) - eine Fläche hat keinen sinnvollen
// "gestrichelten" Teilbereich, derselbe Punkt-statt-Rand-Kompromiss wie
// zuvor, nur jetzt über den app-weiten "Unsicherheiten anzeigen"-Knopf
// (options.showUncertainty) gesteuert wie bei trellis.js/bumpChart.js.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
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

const STREAMGRAPH_INFO_TEXT = `Diese Ansicht zeigt die zeitliche Entwicklung der Bürgeraufnahmen je Wirtschaftssektor als organisch geschichtete Flächen. Im Unterschied zu Trellis (getrennte Panels) und Bump Chart (Rangverschiebung) lässt sich hier die relative Größenveränderung der Sektoren im Fluss der Zeit erfassen. „Beruf nicht angegeben" ist als eigene Schicht enthalten, da dieses Feld bei 1.250 von 2.791 Einträgen fehlt.`;

let instanz = null; // { container, wurzel, records, options, infoButton, hoverSektor, frozenSektor, flaechenAuswahl } – eine aktive Ansicht pro Modul-Ladung

function baueSegmentTooltip(sektor, bin, zelle) {
  const zeilen = [sektor, `${bin.von}`, `${zelle.anzahl} Bürgeraufnahme(n)`];
  if (zelle.unsicherAnzahl > 0) zeilen.push(`davon ${zelle.unsicherAnzahl} mit unsicherer Angabe`);
  return zeilen.join('\n');
}

// Dieselbe Drei-Zustände-Logik wie bumpChart.js' aktualisiereHervorhebung()
// (siehe Dateikopf-Kommentar), hier auf Flächen statt Linien angewendet.
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

function baueKopfzeile(container, sektoren, farbeFuerSektor) {
  const kopfzeile = document.createElement('div');
  kopfzeile.className = 'streamgraph-kopfzeile';

  const titel = document.createElement('h3');
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
    legende.appendChild(eintrag);
  });
  kopfzeile.appendChild(legende);

  container.appendChild(kopfzeile);
  return kopfzeile;
}

function zeichneStreamgraph() {
  const { container, wurzel, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  instanz.hoverSektor = null;
  instanz.frozenSektor = null;

  if (instanz.infoButton) instanz.infoButton.destroy();
  wurzel.innerHTML = '';

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'streamgraph-werkzeugleiste';
  instanz.infoButton = erzeugeInfoButton(werkzeugleiste, { text: STREAMGRAPH_INFO_TEXT, ariaLabel: 'Erklärung zum Streamgraph' });

  const plotBereich = document.createElement('div');
  plotBereich.className = 'streamgraph-plot-bereich';
  wurzel.append(werkzeugleiste, plotBereich);

  const { mitJahr } = teileNachJahr(records);
  const sektoren = ermittleSektorenSortiertNachHaeufigkeit(mitJahr);
  const farbeFuerSektor = baueSektorFarbSkala(records);
  const bins = mitJahr.length > 0 ? berechneJahresBins(mitJahr, BIN_GROESSE_JAHRE) : [];
  const matrix = gruppiereProBinUndSektor(mitJahr, sektoren, bins);

  const kopfzeile = baueKopfzeile(plotBereich, sektoren, farbeFuerSektor);

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

  flaechenAuswahl
    .on('mouseenter', (event, d) => { instanz.hoverSektor = d.key; aktualisiereHervorhebung(); })
    .on('mouseleave', () => { instanz.hoverSektor = null; aktualisiereHervorhebung(); })
    .on('click', (event, d) => { event.stopPropagation(); schalteHervorhebung(d.key); })
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); schalteHervorhebung(d.key); }
    });

  // Unsicherheits-Marker (siehe Dateikopf-Kommentar) - ein Punkt am oberen
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
    .attr('role', 'img')
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
    .streamgraph-titel { margin: 0 0 var(--space-2) 0; }
    .streamgraph-legende { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); font-size: var(--fs-sm); }
    .streamgraph-legende-eintrag { display: inline-flex; align-items: center; gap: 4px; }
    .streamgraph-legende-punkt { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .streamgraph-flaeche { cursor: pointer; transition: fill-opacity .15s ease; }
    .streamgraph-flaeche:focus-visible { outline: 3px solid var(--accent); outline-offset: -3px; }
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
