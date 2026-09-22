// js/viz/swimlanes.js
// Swimlanes der Urkunden: eine Zeile ("Lane") je Kategorie, x-Achse in Zeitfenster
// (Bins) unterteilt. Jede Zelle zeigt die Anzahl Urkunden dieser Kategorie in diesem
// Zeitfenster über die Deckkraft der Kategorie-Farbe - bewusst anders als dotPlot.js
// (dort: einzelne Punkte statt aggregierter Dichte je Zeitfenster), damit die beiden
// Module nicht dieselbe Darstellung doppelt liefern.
//
// Farben ausschließlich aus CAT_COLORS (Abschnitt 13): die Zeitfenster-Dichte wird
// nicht über eine zusätzliche Sequential-Farbskala kodiert, sondern über die
// fill-opacity der jeweiligen Kategorie-Farbe (analog zur Tiefen-Deckkraft in
// circlePacking.js).
//
// Modul-Interface siehe Abschnitt 5. Undatierte Urkunden erscheinen sichtbar in
// einem eigenen Bereich (Abschnitt 12), nicht ausgeblendet.

import { CAT_COLORS, ACHSEN_SCHRIFTGROESSE } from '../config/constants.js';
import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import {
  teileNachJahr,
  ersteKategorie,
  ermittleKategorienSortiertNachHaeufigkeit,
  baueUrkundenTooltipText,
  zeichneUnbekanntBereich
} from '../utils/urkundenZeit.js';

const BIN_GROESSE_JAHRE = 25;
// Vollbild-Konvention (siehe docs/VOLLBILD_KONVENTION.md, Punkt 3a -
// zeilenbasierter Inhalt): Zeilenhöhe wird pro Redraw aus der tatsächlich
// verfügbaren Container-Höhe berechnet, geklemmt auf [MIN_ZEILENHOEHE,
// MAX_ZEILENHOEHE], statt fest auf 24px codiert (siehe zeichneSwimlanes()).
// MIN_ZEILENHOEHE: bisheriger kompakter Wert bleibt die Untergrenze (dann
// greift der etablierte Seiten-Scroll-Fallback). MAX_ZEILENHOEHE: dieselbe
// 44px-Zielgröße wie dotPlot.js (Fitts'sches Gesetz) - die Zellen sind hier
// wie dort per Klick/Tastatur bedienbar (tabindex auf belegten Zellen),
// dieselbe Begründung trägt unverändert.
const MIN_ZEILENHOEHE = 24;
const MAX_ZEILENHOEHE = 44;
const RAND = { oben: 10, unten: 30, links: 160, rechts: 20 };
// Kein eigener Flex-Wrapper (Punkt 2 der Konvention) nötig - dieses Modul
// hat keine Werkzeugleiste, die SVG ist einziges Kind von `container`
// (= `.viz-inhalt`, hat `overflow:visible` - strukturell nicht durch
// hartes Clipping gefährdet, siehe Auftrag "Systemischer Clipping-Fix
// nach Vollbild-Umstellung") - dasselbe Muster wie horizonChart.js/
// ridgeline.js.

let instanz = null; // { container, records, options } – ein aktives Swimlanes-Diagramm pro Modul-Ladung

function farbeFuerKategorie(kategorie) {
  return CAT_COLORS[kategorie] || CAT_COLORS.default;
}

function berechneBins(mitJahr) {
  const minJahr = d3.min(mitJahr, (d) => d.jahr);
  const maxJahr = d3.max(mitJahr, (d) => d.jahr);
  const binStart = Math.floor(minJahr / BIN_GROESSE_JAHRE) * BIN_GROESSE_JAHRE;
  const bins = [];
  for (let jahr = binStart; jahr <= maxJahr; jahr += BIN_GROESSE_JAHRE) {
    bins.push({ von: jahr, bis: jahr + BIN_GROESSE_JAHRE - 1 });
  }
  return bins;
}

// Gruppiert nach Kategorie x Zeitfenster: {anzahl, unsicherAnzahl, eintraege}.
function gruppiereNachKategorieUndBin(mitJahr, kategorien, bins) {
  const gruppen = new Map();
  kategorien.forEach((kategorie) => {
    bins.forEach((bin) => gruppen.set(`${kategorie}|${bin.von}`, { kategorie, bin, anzahl: 0, unsicherAnzahl: 0, eintraege: [] }));
  });
  mitJahr.forEach((eintrag) => {
    const kategorie = ersteKategorie(eintrag.record);
    const bin = bins.find((b) => eintrag.jahr >= b.von && eintrag.jahr <= b.bis);
    if (!bin) return;
    const gruppe = gruppen.get(`${kategorie}|${bin.von}`);
    gruppe.anzahl += 1;
    gruppe.eintraege.push(eintrag);
    if (eintrag.record.datum_unsicher) gruppe.unsicherAnzahl += 1;
  });
  return Array.from(gruppen.values());
}

function baueZellenTooltip(zelle, zeigeUnsicherheit) {
  const zeilen = [
    zelle.kategorie,
    `${zelle.bin.von}–${zelle.bin.bis}`,
    `${zelle.anzahl} Urkunde(n)`
  ];
  if (zeigeUnsicherheit && zelle.unsicherAnzahl > 0) {
    zeilen.push(`davon ${zelle.unsicherAnzahl} mit unsicherer Datierung`);
  }
  return zeilen.join('\n');
}

function zeichneSwimlanes() {
  const { container, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  container.innerHTML = '';

  // Auftrag "Einheitliche Achsenbeschriftungsgröße app-weit": per CSS-Klasse
  // statt .attr('font-size', ...) gesetzt - siehe Kommentar bei der
  // Achsen-Gruppe weiter unten für die Begründung (d3.axisBottom()
  // überschreibt einen per .attr() gesetzten Wert bei jedem .call()).
  const style = document.createElement('style');
  style.textContent = `.swimlanes-achse { font-size: ${ACHSEN_SCHRIFTGROESSE}px; }`;
  container.appendChild(style);

  const { mitJahr, ohneJahr } = teileNachJahr(records);
  const kategorien = ermittleKategorienSortiertNachHaeufigkeit(mitJahr);
  const bins = mitJahr.length > 0 ? berechneBins(mitJahr) : [];
  const zellen = gruppiereNachKategorieUndBin(mitJahr, kategorien, bins);
  const maxAnzahl = d3.max(zellen, (z) => z.anzahl) || 1;
  const opazitaetSkala = d3.scaleLinear().domain([0, maxAnzahl]).range([0.12, 1]);

  const breite = options.width || container.clientWidth || 900;
  const breiteProBin = bins.length > 0 ? (breite - RAND.links - RAND.rechts) / bins.length : 0;

  // Vollbild-Konvention Punkt 3a (siehe Konstanten-Kommentar oben): verfügbare
  // Höhe JETZT messen - `container` ist zu diesem Zeitpunkt bereits geleert
  // (kein Reflow-Problem, da kein eigener Wrapper zwischengeschaltet ist).
  //
  // AUFTRAG "Systemischer Clipping-Fix nach Vollbild-Umstellung" Schritt 2:
  // der Platzbedarf der "Undatiert"-Fläche wird jetzt EXAKT vorab ermittelt
  // (Trockenlauf von zeichneUnbekanntBereich() in eine nie angehängte SVG-
  // Gruppe) statt geschätzt - siehe dotPlot.js für die volle Begründung
  // (der Rückgabewert hängt nachweislich nur von `breite`/`ohneJahr` ab,
  // nicht von `yStart`, daher liefert der Trockenlauf denselben Wert wie
  // der echte Aufruf weiter unten).
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

  const svg = d3.select(container).append('svg').attr('width', breite);

  // AUFTRAG "Einheitliche Achsenbeschriftungsgröße app-weit" - RANDFALL,
  // bewusst NICHT auf ACHSEN_SCHRIFTGROESSE (14px) angehoben (siehe
  // Abschlussbericht): diese Kürzung ist noch die alte, rein
  // zeichenanzahl-basierte Heuristik (`length > 22`), NICHT pixelgenau wie
  // bei dotPlot.js' ermittleBeschriftungstext(). Eine größere Schrift würde
  // denselben 22-Zeichen-Grenzwert auf mehr Pixel abbilden und liefe Gefahr,
  // in den Plot-Bereich (RAND.links=160) hineinzuragen - siehe Auftrag:
  // "bitte explizit melden statt stillschweigend eine kleinere Ausnahme zu
  // setzen". Empfehlung: erst auf ermittleBeschriftungstext() umstellen
  // (wie bei dotPlot.js), dann anheben - beides zusammen in einem eigenen
  // Folgeauftrag, nicht hier (Nicht-Ziel: keine sonstigen inhaltlichen
  // Änderungen über das Vollbild-/Achsenbeschriftungs-Thema hinaus).
  kategorien.forEach((kategorie, zeilenIndex) => {
    svg.append('text')
      .attr('x', RAND.links - 8).attr('y', RAND.oben + zeilenIndex * zeilenhoehe + zeilenhoehe / 2)
      .attr('text-anchor', 'end').attr('dominant-baseline', 'middle').attr('font-size', 11)
      .text(kategorie.length > 22 ? `${kategorie.slice(0, 20)}…` : kategorie);
  });

  const zellenGruppe = svg.append('g').attr('class', 'swimlanes-zellen')
    .selectAll('rect.swimlane-zelle')
    .data(zellen)
    .join('rect')
    .attr('class', 'swimlane-zelle')
    .attr('tabindex', (d) => (d.anzahl > 0 ? 0 : -1))
    .attr('x', (d) => RAND.links + bins.indexOf(d.bin) * breiteProBin)
    .attr('y', (d) => RAND.oben + kategorien.indexOf(d.kategorie) * zeilenhoehe)
    .attr('width', Math.max(breiteProBin - 1, 0))
    .attr('height', zeilenhoehe - 1)
    .attr('fill', (d) => farbeFuerKategorie(d.kategorie))
    .attr('fill-opacity', (d) => (d.anzahl === 0 ? 0.04 : opazitaetSkala(d.anzahl)))
    .attr('stroke', (d) => (zeigeUnsicherheit && d.unsicherAnzahl > 0 ? '#c0392b' : 'none'))
    .attr('stroke-width', (d) => (zeigeUnsicherheit && d.unsicherAnzahl > 0 ? 2 : 0))
    .attr('stroke-dasharray', (d) => (zeigeUnsicherheit && d.unsicherAnzahl > 0 ? '3,2' : null));

  zellenGruppe.filter((d) => d.anzahl > 0)
    .on('mouseenter focus', function (event, d) { zeigeTooltip(baueZellenTooltip(d, zeigeUnsicherheit), this, container); })
    .on('mouseleave blur', () => versteckeTooltip());

  const xSkala = d3.scaleLinear()
    .domain([bins[0] ? bins[0].von : 1000, bins.length > 0 ? bins[bins.length - 1].bis + 1 : 2000])
    .range([RAND.links, breite - RAND.rechts]);
  // Auftrag "Einheitliche Achsenbeschriftungsgröße app-weit": Schriftgröße
  // per CSS-Klasse (.swimlanes-achse, siehe Style-Injektion oben in dieser
  // Funktion), NICHT per .attr('font-size', ...) - d3.axisBottom() setzt
  // bei jedem .call() selbst font-size:10 auf die Gruppe und würde einen
  // zuvor per .attr() gesetzten Wert überschreiben (live entdeckt, siehe
  // Abschlussbericht - dasselbe, bereits von zeitachse.js gelöste Problem).
  svg.append('g')
    .attr('class', 'swimlanes-achse')
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
    .attr('aria-label', `Swimlanes der Urkunden nach Kategorie, ${BIN_GROESSE_JAHRE}-Jahres-Fenster`);

  svg.append('desc').text(
    `Eine Zeile je Kategorie, Spalten in ${BIN_GROESSE_JAHRE}-Jahres-Fenstern. Deckkraft ` +
    'zeigt die Anzahl Urkunden je Feld. Urkunden ohne Jahr erscheinen im grau ' +
    'hinterlegten Bereich unten. Gestrichelter roter Rand kennzeichnet Felder mit ' +
    'mindestens einer unsicher datierten Urkunde.'
  );
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  instanz = { container, records: data, options: { showUncertainty: true, width: null, height: null, ...options } };
  zeichneSwimlanes();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneSwimlanes();
}

export function destroy() {
  if (!instanz) return;
  instanz.container.innerHTML = '';
  instanz = null;
}
