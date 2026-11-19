// js/viz/bumpChart.js – Ansicht „Bump Chart“ des Bürgerbuchs
// Zweck: je Wirtschaftssektor eine Linie über die Jahrzehnte, y = Rang nach Bürgeraufnahmen im Jahrzehnt (wer liegt
//   vorn); ohne Aufnahme eine Lücke statt eines letzten Rangs; Gleichstand alphabetisch.
// Eingabe: `data` = buergerbuch.csv (Datum, Beruf bzw. Sektor, Datum_unsicher, Beruf_unsicher) über
//   utils/buergerbuchZeit.js.
// Schnittstelle: render(container, data, options), resize(neueOptionen), destroy() wie alle Ansichten (docs/SCHEMA.md);
//   options.showUncertainty zeigt rote Ringe an Punkten mit unsicheren Aufnahmen.
// Abhängigkeiten: D3 v7, utils/buergerbuchZeit.js, utils/tooltip.js, utils/infoButton.js.
// Bedienung: Hover hebt eine Linie hervor, Klick friert sie ein, Klick ins Leere löst sie; Etiketten am Linienende
//   überlappen nie, Führungslinien zeigen die Zuordnung. Hintergrund: docs/MODULNOTIZEN.md, Abschnitt bumpChart.js.

import { ACHSEN_SCHRIFTGROESSE } from '../config/constants.js';
import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import {
  teileNachJahr,
  ermittleSektor,
  ermittleSektorenSortiertNachHaeufigkeit,
  berechneJahresBins,
  gruppiereProBinUndSektor,
  baueSektorFarbSkala
} from '../utils/buergerbuchZeit.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { infotextFuerModul } from '../core/archivKonfiguration.js';

const JAHRZEHNT_GROESSE = 10;
const ZEILENHOEHE = 26;
const PUNKT_RADIUS = 4;
const RAND = { oben: 20, unten: 40, links: 20, rechts: 190 };
// 18px statt der reinen Textzeilenhöhe (~15px bei 12px Schriftgröße, live
// gemessen) - garantiert einen sichtbaren Zwischenraum statt zweier Labels,
// die sich exakt berühren (live geprüft: bei genau 15px lag der Abstand
// zwischen zwei Bounding-Boxen bei 0px - "keine Überlappung" im strengen
// Sinn, aber optisch zu knapp).
const LABEL_MINDESTABSTAND = 18;

let instanz = null; // { container, wurzel, records, options, infoButton, hoverSektor, frozenSektor, serienAuswahl } – ein aktives Bump Chart pro Modul-Ladung

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .bumpchart-wurzel { display: flex; flex-direction: column; }
    .bumpchart-werkzeugleiste { display: flex; justify-content: flex-end; margin: 0 0 var(--space-3) 0; }
    .bumpchart-achse { font-size: ${ACHSEN_SCHRIFTGROESSE}px; }
    .bumpchart-serie { cursor: pointer; }
    .bumpchart-serie:focus, .bumpchart-serie:focus-visible { outline: none; }
    .bumpchart-serie:focus-visible .bumpchart-serie-linie { stroke: var(--accent); stroke-width: 4px; }
    .bumpchart-serie-trefferflaeche { fill: none; stroke: transparent; stroke-width: 14px; }
  `;
  container.appendChild(style);
}

// Rangberechnung je Jahrzehnt: nur Sektoren mit anzahl>0 bekommen einen Rang
// (siehe docs/MODULNOTIZEN.md). Gibt eine Map sektor -> [{binIndex, rang,
// anzahl}] zurück (nur die Jahrzehnte, in denen der Sektor tatsächlich
// vorkommt - LÜCKEN werden hier implizit erzeugt, indem sie einfach fehlen).
function berechneRaenge(matrix, sektoren) {
  const ranglisten = new Map(sektoren.map((s) => [s, []]));
  matrix.forEach((zeile, binIndex) => {
    const aktive = sektoren
      .filter((s) => zeile[s].anzahl > 0)
      .sort((a, b) => (zeile[b].anzahl - zeile[a].anzahl) || a.localeCompare(b, 'de'));
    aktive.forEach((sektor, i) => {
      ranglisten.get(sektor).push({ binIndex, rang: i + 1, anzahl: zeile[sektor].anzahl, unsicherAnzahl: zeile[sektor].unsicherAnzahl });
    });
  });
  return ranglisten;
}

// Kollisions-Ausgleich für die rechten Endbeschriftungen (siehe docs/MODULNOTIZEN.md
//) - sortiert nach y, verschiebt bei Unterschreiten des
// Mindestabstands die jeweils UNTERE Beschriftung nach unten. Rein additiv
// (nie nach oben), damit die Reihenfolge der Beschriftungen untereinander
// stabil der Reihenfolge ihrer ursprünglichen y-Position entspricht.
function ordneLabelsAn(kandidaten) {
  const sortiert = [...kandidaten].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sortiert.length; i += 1) {
    const mindestY = sortiert[i - 1].y + LABEL_MINDESTABSTAND;
    if (sortiert[i].y < mindestY) sortiert[i].y = mindestY;
  }
  return sortiert;
}

function aktualisiereHervorhebung() {
  const { serienAuswahl, hoverSektor, frozenSektor } = instanz;
  if (!serienAuswahl) return;
  const aktiv = frozenSektor || hoverSektor;
  serienAuswahl
    .classed('bumpchart-serie-eingefroren', (d) => d.sektor === frozenSektor)
    .style('opacity', (d) => (!aktiv || d.sektor === aktiv ? 1 : 0.15));
  serienAuswahl.select('.bumpchart-serie-linie')
    .attr('stroke-width', (d) => (d.sektor === aktiv ? 3.5 : 1.75));
  serienAuswahl.select('.bumpchart-serie-label')
    .attr('font-weight', (d) => (d.sektor === aktiv ? 700 : 400));
}

// Länge begründet (über 100 Zeilen, Masterprompt §13.3; Nachbesserung 8): zeichnet die ganze Ansicht in einem Durchgang (Maße, Skalen, Achsen, Elemente, Beschriftung, Interaktion); die Schritte teilen viele lokale Größen, eine Zerlegung bräuchte lange Parameterlisten ohne Gewinn an Lesbarkeit.
function zeichneBumpChart() {
  const { container, wurzel, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  instanz.hoverSektor = null;
  instanz.frozenSektor = null;

  if (instanz.infoButton) instanz.infoButton.destroy();
  wurzel.innerHTML = '';

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'bumpchart-werkzeugleiste';
  infotextFuerModul('bumpChart').then((cfg) => {
    if (!instanz || !cfg || !werkzeugleiste.isConnected) return;
    instanz.infoButton = erzeugeInfoButton(werkzeugleiste, cfg);
  });

  const plotBereich = document.createElement('div');
  wurzel.append(werkzeugleiste, plotBereich);

  const { mitJahr } = teileNachJahr(records);
  const sektoren = ermittleSektorenSortiertNachHaeufigkeit(mitJahr);
  const farbeFuerSektor = baueSektorFarbSkala(records);
  const bins = mitJahr.length > 0 ? berechneJahresBins(mitJahr, JAHRZEHNT_GROESSE) : [];
  const matrix = gruppiereProBinUndSektor(mitJahr, sektoren, bins);
  const ranglisten = berechneRaenge(matrix, sektoren);
  const maxRang = d3.max(sektoren, (s) => d3.max(ranglisten.get(s), (d) => d.rang)) || 1;

  const breite = options.width || container.clientWidth || 900;
  const hoehePlot = RAND.oben + maxRang * ZEILENHOEHE;
  const gesamtHoehe = hoehePlot + RAND.unten;

  const xSkala = d3.scalePoint().domain(bins.map((b) => b.von)).range([RAND.links, breite - RAND.rechts]).padding(0.5);
  const ySkala = (rang) => RAND.oben + (rang - 0.5) * ZEILENHOEHE;

  const svg = d3.select(plotBereich).append('svg').attr('width', breite)
    .attr('height', gesamtHoehe)
    .attr('viewBox', `0 0 ${breite} ${gesamtHoehe}`)
    .attr('role', 'group') // AUFTRAG D, Punkt 2 (axe nested-interactive): enthält bedienbare Elemente; aria-label bleibt
    .attr('aria-label', 'Bump Chart des Bürgerbuchs: Rang der Wirtschaftssektoren je Jahrzehnt');

  svg.append('desc').text(
    'Eine Linie je Wirtschaftssektor (inklusive "Beruf nicht angegeben"), y-Position ist der ' +
    'Rang nach Anzahl Bürgeraufnahmen in diesem Jahrzehnt, Rang 1 = häufigster Sektor. Eine ' +
    'Lücke in der Linie bedeutet keine Aufnahme in diesem Jahrzehnt. Hover hebt eine Linie ' +
    'hervor, Klick friert die Hervorhebung ein.'
  );

  // Klick auf die freie Fläche setzt eine eingefrorene Hervorhebung zurück
  // (docs/MODULNOTIZEN.md) - der Hintergrund-Rect liegt UNTER allen Serien,
  // ein Klick auf eine Serie selbst stoppt die Ereignis-Weiterleitung (siehe
  // unten) und erreicht diesen Handler deshalb nie.
  svg.insert('rect', ':first-child')
    .attr('width', breite).attr('height', gesamtHoehe).attr('fill', 'transparent')
    .on('click', () => { instanz.frozenSektor = null; aktualisiereHervorhebung(); });

  const achseGruppe = svg.append('g')
    .attr('class', 'bumpchart-achse')
    .attr('transform', `translate(0,${hoehePlot})`);
  achseGruppe.call(d3.axisBottom(xSkala).tickFormat((jahr) => `${jahr}er`));

  const linie = d3.line()
    .defined((d) => d.rang != null)
    .x((d) => xSkala(bins[d.binIndex].von))
    .y((d) => ySkala(d.rang));

  const labelKandidaten = [];
  const serienDaten = sektoren.map((sektor) => {
    const punkte = ranglisten.get(sektor);
    const letzter = punkte[punkte.length - 1];
    let endPunkt = null;
    if (letzter) {
      endPunkt = { x: xSkala(bins[letzter.binIndex].von), y: ySkala(letzter.rang) };
      labelKandidaten.push({ sektor, y: endPunkt.y });
    }
    return { sektor, punkte, farbe: farbeFuerSektor(sektor), endPunkt };
  });
  const labelPositionen = new Map(ordneLabelsAn(labelKandidaten).map((l) => [l.sektor, l]));

  const serienGruppe = svg.append('g').attr('class', 'bumpchart-serien');
  const serienAuswahl = serienGruppe.selectAll('g.bumpchart-serie')
    .data(serienDaten, (d) => d.sektor)
    .join('g')
    .attr('class', 'bumpchart-serie')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => `Sektor ${d.sektor} hervorheben`);
  instanz.serienAuswahl = serienAuswahl;

  serienAuswahl.append('path')
    .attr('class', 'bumpchart-serie-trefferflaeche')
    .attr('d', (d) => linie(d.punkte));

  serienAuswahl.append('path')
    .attr('class', 'bumpchart-serie-linie')
    .attr('d', (d) => linie(d.punkte))
    .attr('fill', 'none')
    .attr('stroke', (d) => d.farbe)
    .attr('stroke-width', 1.75)
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round');

  serienAuswahl.selectAll('circle.bumpchart-serie-punkt')
    .data((d) => d.punkte.map((p) => ({ ...p, sektor: d.sektor, farbe: d.farbe })))
    .join('circle')
    .attr('class', 'bumpchart-serie-punkt')
    .attr('cx', (d) => xSkala(bins[d.binIndex].von))
    .attr('cy', (d) => ySkala(d.rang))
    .attr('r', PUNKT_RADIUS)
    .attr('fill', (d) => d.farbe)
    .attr('stroke', (d) => (zeigeUnsicherheit && d.unsicherAnzahl > 0 ? '#c0392b' : 'none'))
    .attr('stroke-width', (d) => (zeigeUnsicherheit && d.unsicherAnzahl > 0 ? 2 : 0))
    .on('mouseenter focus', function (event, d) {
      const zeilen = [`${d.sektor}`, `${bins[d.binIndex].von}er`, `Rang ${d.rang} (${d.anzahl} Bürgeraufnahme(n))`];
      if (d.unsicherAnzahl > 0) zeilen.push(`davon ${d.unsicherAnzahl} mit unsicherer Angabe`);
      zeigeTooltip(zeilen.join('\n'), this, container);
    })
    .on('mouseleave blur', () => versteckeTooltip());

  // Führungslinie vom TATSÄCHLICHEN Linienende (d.endPunkt, unverschoben) zum
  // ggf. per ordneLabelsAn() nach unten verschobenen Label (siehe docs/MODULNOTIZEN.md
  // "ROOT CAUSE") - macht die Zuordnung auch bei starker
  // Verschiebung eindeutig nachvollziehbar. Bei keiner Verschiebung (die
  // meisten Sektoren, die bis zum letzten Jahrzehnt durchlaufen) ist sie nur
  // wenige Pixel lang und praktisch unsichtbar - dieselbe Farbe wie die
  // Linie selbst, damit sie sich sichtbar als deren Fortsetzung liest.
  serienAuswahl.filter((d) => d.endPunkt).append('line')
    .attr('class', 'bumpchart-serie-leitlinie')
    .attr('x1', (d) => d.endPunkt.x)
    .attr('y1', (d) => d.endPunkt.y)
    .attr('x2', (d) => d.endPunkt.x + 8)
    .attr('y2', (d) => labelPositionen.get(d.sektor)?.y ?? d.endPunkt.y)
    .attr('stroke', (d) => d.farbe)
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '2,2');

  serienAuswahl.append('text')
    .attr('class', 'bumpchart-serie-label')
    .attr('x', (d) => (d.endPunkt ? d.endPunkt.x + 10 : 0))
    .attr('y', (d) => labelPositionen.get(d.sektor)?.y ?? 0)
    .attr('dominant-baseline', 'middle')
    .attr('font-size', 12)
    .attr('fill', (d) => d.farbe)
    .text((d) => d.sektor);

  function schalteHervorhebung(sektor) {
    instanz.frozenSektor = instanz.frozenSektor === sektor ? null : sektor;
    aktualisiereHervorhebung();
  }

  serienAuswahl
    .on('mouseenter', (event, d) => { instanz.hoverSektor = d.sektor; aktualisiereHervorhebung(); })
    .on('mouseleave', () => { instanz.hoverSektor = null; aktualisiereHervorhebung(); })
    .on('click', (event, d) => { event.stopPropagation(); schalteHervorhebung(d.sektor); })
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); schalteHervorhebung(d.sektor); }
    });

  aktualisiereHervorhebung();
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  container.innerHTML = '';
  fuegeStyleEin(container);

  const wurzel = document.createElement('div');
  wurzel.className = 'bumpchart-wurzel';
  container.appendChild(wurzel);

  instanz = {
    container,
    wurzel,
    records: data,
    options: { showUncertainty: true, width: null, height: null, ...options },
    infoButton: null,
    hoverSektor: null,
    frozenSektor: null,
    serienAuswahl: null
  };
  zeichneBumpChart();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneBumpChart();
}

export function destroy() {
  if (!instanz) return;
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
