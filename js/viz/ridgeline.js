// js/viz/ridgeline.js
// Ridgeline-Diagramm der Urkunden: eine Basislinie je Kategorie, darüber eine Kurve
// nach Anzahl Urkunden je Zeitfenster - Kurven benachbarter Kategorien dürfen sich
// bewusst leicht überlappen (klassische Ridgeline-Optik). Modul-Interface siehe
// Abschnitt 5. Gemeinsame Aggregation mit horizonChart.js/swimlanes.js,
// siehe js/utils/urkundenZeit.js (streamgraph.js war bis AUFTRAG "Streamgraph
// → Bürgerbuch" ebenfalls Teil dieser Gruppe - nutzt inzwischen
// buergerbuchZeit.js, siehe dortiger Dateikopf-Kommentar). Undatierte
// Urkunden erscheinen sichtbar in einem eigenen Bereich (Abschnitt 12),
// nicht ausgeblendet.
//
// Unsicherheits-Kennzeichnung: roter Punkt auf der Kurve an Zeitfenstern mit
// mindestens einer unsicher datierten Urkunde (derselbe Punkt-statt-Rand-
// Kompromiss wie ursprünglich im Urkunden-Streamgraph begründet).

import { CAT_COLORS, ACHSEN_SCHRIFTGROESSE } from '../config/constants.js';
import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import {
  teileNachJahr,
  ersteKategorie,
  ermittleKategorienSortiertNachHaeufigkeit,
  berechneJahresBins,
  gruppiereProBinUndKategorie,
  baueUrkundenTooltipText,
  zeichneUnbekanntBereich
} from '../utils/urkundenZeit.js';

const BIN_GROESSE_JAHRE = 10;
// Vollbild-Konvention (siehe docs/VOLLBILD_KONVENTION.md, Punkt 3a -
// zeilenbasierter Inhalt): Zeilenhöhe (= Basislinien-Abstand) wird pro
// Redraw aus der tatsächlich verfügbaren Container-Höhe berechnet, geklemmt
// auf [MIN_ZEILENHOEHE, MAX_ZEILENHOEHE], statt fest auf 34px codiert (siehe
// zeichneRidgeline()). Kurvenhöhe (hoeheSkala, über UEBERLAPP_FAKTOR) skaliert
// proportional mit. MIN_ZEILENHOEHE: bisheriger Wert bleibt die Untergrenze.
// MAX_ZEILENHOEHE bewusst niedriger als dotPlot.js' 44px: die Ridgeline-Optik
// lebt gerade vom leichten Überlappen benachbarter Kurven (UEBERLAPP_FAKTOR)
// - ein zu großer Basislinien-Abstand würde diese Überlappung sichtbar
// verkleinern und die charakteristische Ridgeline-Wirkung abschwächen; 50px
// (knapp 1,5x der Untergrenze) nutzt große Bildschirme sichtbar mehr, ohne
// die Kurven so weit auseinanderzuziehen, dass sie sich praktisch nicht mehr
// berühren.
const MIN_ZEILENHOEHE = 34;
const MAX_ZEILENHOEHE = 50;
const UEBERLAPP_FAKTOR = 1.8;
const RAND = { oben: 10, unten: 30, links: 160, rechts: 20 };
// Kein eigener Flex-Wrapper (Punkt 2 der Konvention) nötig - dieses Modul
// hat keine Werkzeugleiste, die SVG ist einziges Kind von `container`
// (= `.viz-inhalt`, hat `overflow:visible` - strukturell nicht durch
// hartes Clipping gefährdet, siehe Auftrag "Systemischer Clipping-Fix
// nach Vollbild-Umstellung") - dasselbe Muster wie streamgraph.js/
// parallelKoordinaten.js.

let instanz = null; // { container, records, options } – ein aktives Ridgeline-Diagramm pro Modul-Ladung

function farbeFuerKategorie(kategorie) {
  return CAT_COLORS[kategorie] || CAT_COLORS.default;
}

function baueSegmentTooltip(kategorie, bin, zelle) {
  const zeilen = [kategorie, `${bin.von}–${bin.bis}`, `${zelle.anzahl} Urkunde(n)`];
  if (zelle.unsicherAnzahl > 0) zeilen.push(`davon ${zelle.unsicherAnzahl} mit unsicherer Datierung`);
  return zeilen.join('\n');
}

function zeichneEineRidge(svg, kategorie, zeilenIndex, konfiguration) {
  const { bins, matrix, xSkala, hoeheSkala, zeilenhoehe, container, zeigeUnsicherheit } = konfiguration;
  const baseline = RAND.oben + zeilenIndex * zeilenhoehe + zeilenhoehe;

  const flaeche = d3.area()
    .x((bin) => xSkala(bin.von + BIN_GROESSE_JAHRE / 2))
    .y0(baseline)
    .y1((bin, i) => baseline - hoeheSkala(matrix[i][kategorie].anzahl))
    .curve(d3.curveBasis);

  svg.append('path')
    .datum(bins)
    .attr('d', flaeche)
    .attr('fill', farbeFuerKategorie(kategorie))
    .attr('fill-opacity', 0.75)
    .attr('stroke', farbeFuerKategorie(kategorie))
    .attr('stroke-width', 1);

  // AUFTRAG "Einheitliche Achsenbeschriftungsgröße app-weit" - RANDFALL,
  // bewusst NICHT auf ACHSEN_SCHRIFTGROESSE angehoben (dieselbe Begründung
  // wie swimlanes.js: zeichenanzahl-basierte, nicht pixelgenaue Kürzung -
  // eine größere Schrift würde denselben 22-Zeichen-Grenzwert auf mehr
  // Pixel abbilden und liefe Gefahr, in den Plot-Bereich hineinzuragen,
  // siehe Abschlussbericht).
  svg.append('text')
    .attr('x', RAND.links - 8).attr('y', baseline)
    .attr('text-anchor', 'end').attr('font-size', 11)
    .text(kategorie.length > 22 ? `${kategorie.slice(0, 20)}…` : kategorie);

  const markerDaten = bins
    .map((bin, i) => ({ bin, zelle: matrix[i][kategorie] }))
    .filter((d) => zeigeUnsicherheit && d.zelle.unsicherAnzahl > 0);

  const marker = svg.append('g').selectAll(null)
    .data(markerDaten)
    .join('circle')
    .attr('tabindex', 0)
    .attr('cx', (d) => xSkala(d.bin.von + BIN_GROESSE_JAHRE / 2))
    .attr('cy', (d) => baseline - hoeheSkala(d.zelle.anzahl))
    .attr('r', 3)
    .attr('fill', '#c0392b');
  marker
    .on('mouseenter focus', function (event, d) { zeigeTooltip(baueSegmentTooltip(kategorie, d.bin, d.zelle), this, container); })
    .on('mouseleave blur', () => versteckeTooltip());
}

function zeichneRidgeline() {
  const { container, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  container.innerHTML = '';

  // Auftrag "Einheitliche Achsenbeschriftungsgröße app-weit": per CSS-Klasse
  // statt .attr('font-size', ...) gesetzt - siehe Kommentar bei der
  // Achsen-Gruppe weiter unten für die Begründung (d3.axisBottom()
  // überschreibt einen per .attr() gesetzten Wert bei jedem .call()).
  const style = document.createElement('style');
  style.textContent = `.ridgeline-achse { font-size: ${ACHSEN_SCHRIFTGROESSE}px; }`;
  container.appendChild(style);

  const { mitJahr, ohneJahr } = teileNachJahr(records);
  const kategorien = ermittleKategorienSortiertNachHaeufigkeit(mitJahr);
  const bins = mitJahr.length > 0 ? berechneJahresBins(mitJahr, BIN_GROESSE_JAHRE) : [];
  const matrix = gruppiereProBinUndKategorie(mitJahr, kategorien, bins);

  const breite = options.width || container.clientWidth || 900;

  // Vollbild-Konvention Punkt 3a (siehe Konstanten-Kommentar oben): verfügbare
  // Höhe JETZT messen - `container` ist zu diesem Zeitpunkt bereits geleert
  // (kein Reflow-Problem, da kein eigener Wrapper zwischengeschaltet ist).
  //
  // AUFTRAG "Systemischer Clipping-Fix nach Vollbild-Umstellung" Schritt 2:
  // der Platzbedarf der "Undatiert"-Fläche wird jetzt EXAKT vorab ermittelt
  // (Trockenlauf von zeichneUnbekanntBereich() in eine nie angehängte SVG-
  // Gruppe) statt geschätzt - siehe dotPlot.js für die volle Begründung.
  const trockenlaufSvg = d3.create('svg');
  const reserviertFuerUndatiert = zeichneUnbekanntBereich(trockenlaufSvg, ohneJahr, {
    breite,
    yStart: 0,
    farbeFn: (d) => farbeFuerKategorie(ersteKategorie(d.record)),
    tooltipTextFn: (d) => baueUrkundenTooltipText(d.record),
    container
  }) + 10;
  const verfuegbareHoehe = container.clientHeight;
  const verfuegbarFuerZeilen = Math.max(verfuegbareHoehe - RAND.oben - RAND.unten - reserviertFuerUndatiert, 0);
  const zeilenhoeheRoh = kategorien.length > 0 ? verfuegbarFuerZeilen / kategorien.length : MIN_ZEILENHOEHE;
  const zeilenhoehe = Math.min(Math.max(zeilenhoeheRoh, MIN_ZEILENHOEHE), MAX_ZEILENHOEHE);
  const hoehePlot = RAND.oben + kategorien.length * zeilenhoehe;

  const jahresSpanne = bins.length > 0 ? [bins[0].von, bins[bins.length - 1].bis] : [1000, 2000];
  const xSkala = d3.scaleLinear().domain(jahresSpanne).range([RAND.links, breite - RAND.rechts]);
  const maxAnzahl = d3.max(matrix.flatMap((zeile) => kategorien.map((k) => zeile[k].anzahl))) || 1;
  const hoeheSkala = d3.scaleLinear().domain([0, maxAnzahl]).range([0, zeilenhoehe * UEBERLAPP_FAKTOR]);

  const svg = d3.select(container).append('svg').attr('width', breite);
  const konfiguration = { bins, matrix, xSkala, hoeheSkala, zeilenhoehe, container, zeigeUnsicherheit };

  // Rückwärts zeichnen: die häufigste (erste) Kategorie liegt zuletzt im DOM und damit
  // sichtbar vorne, wenn ihre Kurve in die Zeile darüber hineinragt.
  kategorien.slice().reverse().forEach((kategorie) => {
    zeichneEineRidge(svg, kategorie, kategorien.indexOf(kategorie), konfiguration);
  });

  // Auftrag "Einheitliche Achsenbeschriftungsgröße app-weit": Schriftgröße
  // per CSS-Klasse (.ridgeline-achse), NICHT per .attr('font-size', ...) -
  // d3.axisBottom() setzt bei jedem .call() selbst font-size:10 auf die
  // Gruppe und würde einen zuvor per .attr() gesetzten Wert überschreiben
  // (live entdeckt, siehe Abschlussbericht - dasselbe, bereits von
  // zeitachse.js gelöste Problem).
  svg.append('g')
    .attr('class', 'ridgeline-achse')
    .attr('transform', `translate(0,${hoehePlot})`)
    .call(d3.axisBottom(xSkala).tickFormat(d3.format('d')));

  const ohneJahrStart = hoehePlot + RAND.unten;
  const bereichsHoehe = zeichneUnbekanntBereich(svg, ohneJahr, {
    breite,
    yStart: ohneJahrStart,
    farbeFn: (d) => farbeFuerKategorie(ersteKategorie(d.record)),
    tooltipTextFn: (d) => baueUrkundenTooltipText(d.record),
    container
  });

  const gesamtHoehe = ohneJahrStart + bereichsHoehe + 10;
  svg.attr('height', gesamtHoehe)
    .attr('viewBox', `0 0 ${breite} ${gesamtHoehe}`)
    .attr('role', 'img')
    .attr('aria-label', 'Ridgeline-Diagramm der Urkunden je Kategorie über die Zeit');

  svg.append('desc').text(
    'Eine Basislinie je Kategorie, Kurvenhöhe zeigt die Anzahl Urkunden je Zeitfenster - ' +
    'benachbarte Kurven dürfen sich überlappen. Rote Punkte markieren Zeitfenster mit ' +
    'mindestens einer unsicher datierten Urkunde. Urkunden ohne Jahr erscheinen im grau ' +
    'hinterlegten Bereich unten.'
  );
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  instanz = { container, records: data, options: { showUncertainty: true, width: null, height: null, ...options } };
  zeichneRidgeline();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneRidgeline();
}

export function destroy() {
  if (!instanz) return;
  instanz.container.innerHTML = '';
  instanz = null;
}
