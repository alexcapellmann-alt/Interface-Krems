// js/viz/horizonChart.js
// Horizon Chart der Urkunden: kompakte Kleinmehrfachdarstellung (eine schmale Zeile
// je Kategorie), Werte über einem Schwellenwert werden "gefaltet" und in derselben
// Kategorie-Farbe mit steigender Deckkraft übereinandergelegt, statt die Zeile für
// seltene Ausreißer unnötig hoch zu machen. Modul-Interface siehe Abschnitt 5.
// Gemeinsame Aggregation mit ridgeline.js/swimlanes.js, siehe
// js/utils/urkundenZeit.js (streamgraph.js war bis AUFTRAG "Streamgraph →
// Bürgerbuch" ebenfalls Teil dieser Gruppe - nutzt inzwischen
// buergerbuchZeit.js, siehe dortiger Dateikopf-Kommentar). Undatierte
// Urkunden erscheinen sichtbar in einem eigenen Bereich (Abschnitt 12),
// nicht ausgeblendet.
//
// Farben ausschließlich aus CAT_COLORS (Abschnitt 13): die "Faltung" wird über
// steigende fill-opacity derselben Kategorie-Farbe erzeugt, keine zusätzliche Skala.
//
// Unsicherheits-Kennzeichnung: kleines rotes Dreieck am oberen Rand jedes
// Zeitfensters mit mindestens einer unsicher datierten Urkunde dieser Kategorie.

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

const BIN_GROESSE_JAHRE = 20;
const BAND_ANZAHL = 3;
// Vollbild-Konvention (siehe docs/VOLLBILD_KONVENTION.md, Punkt 3a -
// zeilenbasierter Inhalt): Strip-Höhe wird pro Redraw aus der tatsächlich
// verfügbaren Container-Höhe berechnet, geklemmt auf [MIN_STRIP_HOEHE,
// MAX_STRIP_HOEHE], statt fest auf 24px codiert (siehe zeichneHorizonChart()).
// MIN_STRIP_HOEHE: bisheriger Wert bleibt die Untergrenze. MAX_STRIP_HOEHE
// bewusst deutlich niedriger als dotPlot.js' 44px: der ganze Zweck eines
// Horizon Chart ist die KOMPAKTE Darstellung vieler Zeilen durch gefaltete
// Deckkraft-Bänder statt vertikaler Höhe (siehe Dateikopf-Kommentar) - ein
// zu großzügiger oberer Wert würde diesem Zweck zuwiderlaufen und die
// Kleinmehrfachdarstellung optisch in Richtung eines gewöhnlichen
// Flächendiagramms verschieben; 40px (knapp 1,7x der Untergrenze) nutzt
// große Bildschirme sichtbar mehr, bleibt aber klar als "schmale Zeile"
// erkennbar. ZEILENABSTAND bleibt fest (reiner Zwischenraum, keine
// inhaltstragende Zeilenhöhe, siehe Konvention Punkt 3a: nur die
// "Zeile" selbst muss skalieren).
const MIN_STRIP_HOEHE = 24;
const MAX_STRIP_HOEHE = 40;
const ZEILENABSTAND = 6;
const RAND = { oben: 10, unten: 30, links: 160, rechts: 20 };
// Kein eigener Flex-Wrapper (Punkt 2 der Konvention) nötig - dieses Modul
// hat keine Werkzeugleiste, die SVG ist einziges Kind von `container`
// (= `.viz-inhalt`, hat `overflow:visible` - strukturell nicht durch
// hartes Clipping gefährdet, siehe Auftrag "Systemischer Clipping-Fix
// nach Vollbild-Umstellung") - dasselbe Muster wie streamgraph.js/
// parallelKoordinaten.js.

let instanz = null; // { container, records, options } – ein aktiver Horizon Chart pro Modul-Ladung

function farbeFuerKategorie(kategorie) {
  return CAT_COLORS[kategorie] || CAT_COLORS.default;
}

function bandHoehe(anzahl, bandIndex, schwellenwert, stripHoehe) {
  const wertInBand = Math.min(Math.max(anzahl - bandIndex * schwellenwert, 0), schwellenwert);
  return (wertInBand / schwellenwert) * stripHoehe;
}

function baueZellenTooltip(kategorie, bin, zelle) {
  const zeilen = [kategorie, `${bin.von}–${bin.bis}`, `${zelle.anzahl} Urkunde(n)`];
  if (zelle.unsicherAnzahl > 0) zeilen.push(`davon ${zelle.unsicherAnzahl} mit unsicherer Datierung`);
  return zeilen.join('\n');
}

function zeichneEineZeile(svg, kategorie, zeilenIndex, konfiguration) {
  const { bins, matrix, breiteProBin, schwellenwert, stripHoehe, container, zeigeUnsicherheit } = konfiguration;
  const rowTop = RAND.oben + zeilenIndex * (stripHoehe + ZEILENABSTAND);

  // AUFTRAG "Einheitliche Achsenbeschriftungsgröße app-weit" - RANDFALL,
  // bewusst NICHT auf ACHSEN_SCHRIFTGROESSE angehoben (dieselbe Begründung
  // wie swimlanes.js/ridgeline.js: zeichenanzahl-basierte, nicht
  // pixelgenaue Kürzung - Überlauf-Risiko in den Plot-Bereich, siehe
  // Abschlussbericht). Zusätzlich hier: die Zeile selbst ist mit
  // MIN_STRIP_HOEHE=24px ohnehin die kompakteste aller vier Zeilen-Module -
  // eine größere Schrift würde die für dieses Modul namensgebende
  // "kompakte Kleinmehrfachdarstellung" (siehe Dateikopf-Kommentar)
  // zusätzlich konterkarieren.
  svg.append('text')
    .attr('x', RAND.links - 8).attr('y', rowTop + stripHoehe / 2)
    .attr('text-anchor', 'end').attr('dominant-baseline', 'middle').attr('font-size', 11)
    .text(kategorie.length > 22 ? `${kategorie.slice(0, 20)}…` : kategorie);

  for (let bandIndex = 0; bandIndex < BAND_ANZAHL; bandIndex += 1) {
    const zellen = svg.append('g').selectAll(null)
      .data(bins.map((bin, i) => ({ bin, zelle: matrix[i][kategorie] })))
      .join('rect')
      .attr('tabindex', bandIndex === BAND_ANZAHL - 1 ? 0 : -1)
      .attr('x', (d, i) => RAND.links + i * breiteProBin)
      .attr('width', Math.max(breiteProBin - 1, 0))
      .attr('height', (d) => bandHoehe(d.zelle.anzahl, bandIndex, schwellenwert, stripHoehe))
      .attr('y', (d) => rowTop + stripHoehe - bandHoehe(d.zelle.anzahl, bandIndex, schwellenwert, stripHoehe))
      .attr('fill', farbeFuerKategorie(kategorie))
      .attr('fill-opacity', (bandIndex + 1) / BAND_ANZAHL);

    if (bandIndex === BAND_ANZAHL - 1) {
      zellen.filter((d) => d.zelle.anzahl > 0)
        .on('mouseenter focus', function (event, d) { zeigeTooltip(baueZellenTooltip(kategorie, d.bin, d.zelle), this, container); })
        .on('mouseleave blur', () => versteckeTooltip());
    }
  }

  const unsicherMarker = svg.append('g').selectAll(null)
    .data(bins.map((bin, i) => ({ bin, zelle: matrix[i][kategorie] })).filter((d) => zeigeUnsicherheit && d.zelle.unsicherAnzahl > 0))
    .join('polygon')
    .attr('points', (d, i) => {
      const x = RAND.links + bins.indexOf(d.bin) * breiteProBin + breiteProBin / 2;
      return `${x - 4},${rowTop} ${x + 4},${rowTop} ${x},${rowTop + 6}`;
    })
    .attr('fill', '#c0392b');
  unsicherMarker
    .on('mouseenter focus', function (event, d) { zeigeTooltip(baueZellenTooltip(kategorie, d.bin, d.zelle), this, container); })
    .on('mouseleave blur', () => versteckeTooltip());
}

function zeichneHorizonChart() {
  const { container, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  container.innerHTML = '';

  // Auftrag "Einheitliche Achsenbeschriftungsgröße app-weit": per CSS-Klasse
  // statt .attr('font-size', ...) gesetzt - siehe Kommentar bei der
  // Achsen-Gruppe weiter unten für die Begründung (d3.axisBottom()
  // überschreibt einen per .attr() gesetzten Wert bei jedem .call()).
  const style = document.createElement('style');
  style.textContent = `.horizonchart-achse { font-size: ${ACHSEN_SCHRIFTGROESSE}px; }`;
  container.appendChild(style);

  const { mitJahr, ohneJahr } = teileNachJahr(records);
  const kategorien = ermittleKategorienSortiertNachHaeufigkeit(mitJahr);
  const bins = mitJahr.length > 0 ? berechneJahresBins(mitJahr, BIN_GROESSE_JAHRE) : [];
  const matrix = gruppiereProBinUndKategorie(mitJahr, kategorien, bins);

  const breite = options.width || container.clientWidth || 900;
  const breiteProBin = bins.length > 0 ? (breite - RAND.links - RAND.rechts) / bins.length : 0;

  // Vollbild-Konvention Punkt 3a (siehe Konstanten-Kommentar oben): verfügbare
  // Höhe JETZT messen - `container` ist zu diesem Zeitpunkt bereits geleert
  // (kein Reflow-Problem, da kein eigener Wrapper zwischengeschaltet ist).
  // Der Sockel (RAND.oben/.unten + Reservierung + ZEILENABSTAND je Zeile)
  // wird VOR der Division abgezogen, da ZEILENABSTAND fest bleibt (siehe
  // Konstanten-Kommentar) und nicht Teil der zu klemmenden Zeilenhöhe ist.
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
  const sockel = RAND.oben + RAND.unten + reserviertFuerUndatiert + kategorien.length * ZEILENABSTAND;
  const verfuegbarFuerZeilen = Math.max(verfuegbareHoehe - sockel, 0);
  const stripHoeheRoh = kategorien.length > 0 ? verfuegbarFuerZeilen / kategorien.length : MIN_STRIP_HOEHE;
  const stripHoehe = Math.min(Math.max(stripHoeheRoh, MIN_STRIP_HOEHE), MAX_STRIP_HOEHE);
  const hoehePlot = RAND.oben + kategorien.length * (stripHoehe + ZEILENABSTAND);

  const maxAnzahl = d3.max(matrix.flatMap((zeile) => kategorien.map((k) => zeile[k].anzahl))) || 1;
  const schwellenwert = Math.max(maxAnzahl / BAND_ANZAHL, 1);

  const svg = d3.select(container).append('svg').attr('width', breite);
  const konfiguration = { bins, matrix, breiteProBin, schwellenwert, stripHoehe, container, zeigeUnsicherheit };

  kategorien.forEach((kategorie, i) => zeichneEineZeile(svg, kategorie, i, konfiguration));

  const xSkala = d3.scaleLinear()
    .domain(bins.length > 0 ? [bins[0].von, bins[bins.length - 1].bis + 1] : [1000, 2000])
    .range([RAND.links, breite - RAND.rechts]);
  // Auftrag "Einheitliche Achsenbeschriftungsgröße app-weit": Schriftgröße
  // per CSS-Klasse (.horizonchart-achse), NICHT per .attr('font-size', ...) -
  // d3.axisBottom() setzt bei jedem .call() selbst font-size:10 auf die
  // Gruppe und würde einen zuvor per .attr() gesetzten Wert überschreiben
  // (live entdeckt, siehe Abschlussbericht - dasselbe, bereits von
  // zeitachse.js gelöste Problem).
  svg.append('g')
    .attr('class', 'horizonchart-achse')
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
    .attr('aria-label', 'Horizon Chart der Urkunden je Kategorie über die Zeit');

  svg.append('desc').text(
    `Eine schmale Zeile je Kategorie, ${BAND_ANZAHL}-fach gefaltete Deckkraft-Bänder ` +
    'zeigen die Anzahl Urkunden je Zeitfenster kompakt an. Rote Dreiecke markieren ' +
    'Zeitfenster mit mindestens einer unsicher datierten Urkunde. Urkunden ohne Jahr ' +
    'erscheinen im grau hinterlegten Bereich unten.'
  );
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  instanz = { container, records: data, options: { showUncertainty: true, width: null, height: null, ...options } };
  zeichneHorizonChart();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneHorizonChart();
}

export function destroy() {
  if (!instanz) return;
  instanz.container.innerHTML = '';
  instanz = null;
}
