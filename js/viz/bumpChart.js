// js/viz/bumpChart.js
// AUFTRAG "Bürgerbuch – Trellis (Umzug), Bump Chart (Neubau), Bipartiter
// Graph (Umzug)", Punkt 2 - NEUBAU. Zeigt je Wirtschaftssektor eine Linie
// über die Jahrzehnte, y-Position = Rang nach Anzahl Bürgeraufnahmen in
// diesem Jahrzehnt (Rang 1 = häufigster Sektor) - ein "Bump Chart"/"Rang-
// Zeitreihe", verwandt mit, aber bewusst NICHT identisch zu trellis.js
// (dort: absolute Anzahl je Jahr, hier: RELATIVER Rang je Jahrzehnt -
// beantwortet eine andere Frage: nicht "wie viele", sondern "wer liegt
// vorn").
//
// Datengrundlage/Utility: js/utils/buergerbuchZeit.js (dieselbe wie
// trellis.js/bipartiterGraph.js, siehe dortiger Dateikopf-Kommentar zur
// bewussten Trennung von urkundenZeit.js).
//
// Rang-Berechnung: nur Sektoren mit mindestens einer Bürgeraufnahme in einem
// gegebenen Jahrzehnt bekommen dort einen Rang (Sektoren mit 0 Aufnahmen in
// einem Jahrzehnt erscheinen als LÜCKE in ihrer Linie, nicht als
// "letzter Rang mit 0" - eine Null-Aufnahme ist keine reale Platzierung).
// "Beruf nicht angegeben" wird dabei reguär mitgerankt (Auftrag, wörtlich:
// "wird mitgerankt, nicht ausgeblendet") - keine Sonderbehandlung. Bei
// Gleichstand (identische Anzahl) entscheidet die alphabetische Reihenfolge
// des Sektornamens (deterministisch, reproduzierbar - eine reine
// Darstellungsentscheidung ohne fachliche Aussage über eine "echte"
// Rangfolge bei Gleichstand, die die Quelle nicht hergibt).
//
// Beschriftung (Akzeptanzkriterium "keine überlappenden Labels"): jedes Label
// wird zunächst an der y-Position des letzten Jahrzehnts platziert, in dem
// der jeweilige Sektor einen Rang hatte (meist, aber nicht immer das letzte
// Jahrzehnt insgesamt - z. B. "Kirche & Religion" hat ihre letzte Nennung im
// Jahrzehnt 1610, nicht 1620, live geprüft). Da SEHR WOHL mehrere Sektoren
// mit unterschiedlichem letzten Jahrzehnt rechnerisch auf denselben y-Wert
// fallen könnten (Rang ist nur INNERHALB eines Jahrzehnts eindeutig, nicht
// jahrzehntübergreifend), läuft danach ein einfacher, deterministischer
// Kollisions-Ausgleich (siehe ordneLabelsAn()): alle Kandidaten werden nach
// y sortiert und bei Unterschreiten des Mindestabstands nach unten verschoben
// - garantiert für JEDE Datenlage überlappungsfreie Labels, nicht nur für die
// aktuell vorliegende (dieselbe "für jede Datenlage, nicht nur den Zufallsfall"
// -Denkweise wie familienbaum.js' loeseUeberlappungGlobal()).
//
// ROOT CAUSE (Folgeauftrag "Bump-Chart: Endbeschriftungen korrekt zuordnen"):
// der Nudge oben verschiebt NUR die y-Position eines Labels, niemals seine
// x-Position (bleibt bei xSkala des Sektors EIGENEM letzten Jahrzehnts, siehe
// oben) - bei Sektoren mit wenigen/unregelmäßigen Nennungen (Gesundheit,
// Gastgewerbe & Getränke, Verwaltung/Recht/Bildung, Sonstige
// Dienstleistungen, Kirche & Religion: alle fünf enden VOR dem letzten
// Jahrzehnt 1620, live geprüft) kollidierten ihre ursprünglichen y-Werte mit
// dicht benachbarten Rangpositionen anderer, länger laufender Sektoren -
// der Ausgleich schob sie dadurch spürbar nach unten, WÄHREND ihre x-Position
// unverändert bei ihrem eigenen (früheren) Jahrzehnt blieb. Ergebnis: das
// Label hing sichtbar "in der Luft" neben/unter dem eigentlichen Linienende,
// ohne jede visuelle Verbindung dorthin. Fix (siehe zeichneBumpChart()):
// eine dünne Führungslinie vom TATSÄCHLICHEN Linienende (echte x/y-Position
// des letzten Rang-Punkts) zum ggf. verschobenen Label - bei keiner
// Verschiebung ist sie nur wenige Pixel lang (praktisch unsichtbar), bei
// starker Verschiebung macht sie die Zuordnung eindeutig nachvollziehbar.
//
// Unsicherheit: ein Datenpunkt (Sektor×Jahrzehnt) bekommt einen roten Ring,
// wenn mindestens eine der zugrundeliegenden Bürgeraufnahmen ein unsicheres
// Datum oder einen unsicheren Beruf hat (istZeitEintragUnsicher() in
// buergerbuchZeit.js) - dieselbe Konvention wie trellis.js' Balkenrand, hier
// auf einzelne Rang-Punkte übertragen, sichtbar/versteckbar über denselben
// app-weiten "Unsicherheiten anzeigen"-Knopf.
//
// Hervorhebung (Auftrag: "Muster wie Familienbaum"): Hover hebt eine Linie
// TEMPORÄR hervor (übrige Linien abgeblendet), ein Klick FRIERT diese
// Hervorhebung ein (bleibt nach mouseleave bestehen, erneuter Klick auf
// dieselbe Linie löst sie wieder), Klick auf die freie Fläche setzt zurück -
// exakt dieselbe Drei-Zustände-Logik wie familienbaum.js'
// aktualisiereHervorhebung()/Klick-Frieren, hier auf Sektor-Linien statt
// Familienbeziehungen übertragen.

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

const BUMPCHART_INFO_TEXT = `Dieses Bump Chart zeigt, wie sich der Rang der Wirtschaftssektoren nach Anzahl der Bürgeraufnahmen von Jahrzehnt zu Jahrzehnt verändert - Rang 1 ist der jeweils häufigste Sektor in diesem Jahrzehnt.

„Beruf nicht angegeben" wird dabei ganz regulär mitgerankt, nicht ausgeblendet. Eine Lücke in einer Linie bedeutet: dieser Sektor hatte in diesem Jahrzehnt keine einzige Bürgeraufnahme.

Bewegen der Maus über eine Linie hebt sie hervor, ein Klick friert diese Hervorhebung ein (bleibt auch nach dem Wegbewegen der Maus bestehen, erneuter Klick löst sie wieder); ein Klick auf die freie Fläche setzt die Hervorhebung zurück.`;

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
// (siehe Dateikopf-Kommentar). Gibt eine Map sektor -> [{binIndex, rang,
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

// Kollisions-Ausgleich für die rechten Endbeschriftungen (siehe Dateikopf-
// Kommentar) - sortiert nach y, verschiebt bei Unterschreiten des
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

function zeichneBumpChart() {
  const { container, wurzel, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  instanz.hoverSektor = null;
  instanz.frozenSektor = null;

  if (instanz.infoButton) instanz.infoButton.destroy();
  wurzel.innerHTML = '';

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'bumpchart-werkzeugleiste';
  instanz.infoButton = erzeugeInfoButton(werkzeugleiste, { text: BUMPCHART_INFO_TEXT, ariaLabel: 'Erklärung zum Bump Chart' });

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
    .attr('role', 'img')
    .attr('aria-label', 'Bump Chart des Bürgerbuchs: Rang der Wirtschaftssektoren je Jahrzehnt');

  svg.append('desc').text(
    'Eine Linie je Wirtschaftssektor (inklusive "Beruf nicht angegeben"), y-Position ist der ' +
    'Rang nach Anzahl Bürgeraufnahmen in diesem Jahrzehnt, Rang 1 = häufigster Sektor. Eine ' +
    'Lücke in der Linie bedeutet keine Aufnahme in diesem Jahrzehnt. Hover hebt eine Linie ' +
    'hervor, Klick friert die Hervorhebung ein.'
  );

  // Klick auf die freie Fläche setzt eine eingefrorene Hervorhebung zurück
  // (Dateikopf-Kommentar) - der Hintergrund-Rect liegt UNTER allen Serien,
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
  // ggf. per ordneLabelsAn() nach unten verschobenen Label (siehe Dateikopf-
  // Kommentar "ROOT CAUSE") - macht die Zuordnung auch bei starker
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
