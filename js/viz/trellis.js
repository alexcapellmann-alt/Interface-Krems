// js/viz/trellis.js
// AUFTRAG "Bürgerbuch – Trellis (Umzug), Bump Chart (Neubau), Bipartiter
// Graph (Umzug)", Punkt 1 - UMZUG von Urkunden zu Bürgerbuch (data/
// buergerbuch.csv statt data/urkunden.csv, siehe archivalienRegistry.js).
// Kein inhaltlicher Neubau: Kernidee (ein Mini-Histogramm je Kategorie/
// Sektor, gemeinsame y-Skala für fairen Vergleich) bleibt identisch zum
// bisherigen Urkunden-Modul, nur die Datengrundlage/Feldnamen wechseln
// (js/utils/buergerbuchZeit.js statt js/utils/urkundenZeit.js, siehe dortiger
// Dateikopf-Kommentar zur bewussten Trennung der beiden Utility-Dateien).
//
// Soll-Zustand (Auftrag, wörtlich): "Ein kleines Diagramm pro
// Wirtschaftssektor (X = Jahr, Y = Anzahl Bürgeraufnahmen). 'Beruf nicht
// angegeben' (1.250 von 2.791 Einträgen) erscheint als eigenes, sichtbares
// Panel, nicht ausgeblendet."
//
// Designentscheidung X-Achse (bitte bei Bedarf zurückmelden): das bisherige
// Urkunden-Modul band Jahre in 50-Jahres-Fenster (BIN_GROESSE_JAHRE=50), weil
// urkunden.csv 736 Jahre (1108-1844) abdeckt - zu viele Einzeljahre für ein
// kleines Facet. Bürgerbuch.csv deckt dagegen nur 91 Jahre ab (1535-1625,
// live geprüft), UND der Auftrag nennt wörtlich "X = Jahr" (nicht
// "Zeitfenster", wie es beim ebenfalls in diesem Auftrag entstehenden
// bumpChart.js explizit "Jahrzehnt" heißt) - deshalb hier bewusst ECHTE
// Jahresauflösung (ein Balken je Kalenderjahr, BIN_GROESSE_JAHRE=1) statt
// einer erneuten Mehrjahres-Bin, plus eine breitere Facet-Fläche
// (FACET_BREITE 220→260) für minimal mehr Platz pro Jahresbalken.
//
// Undatierte Einträge: anders als bei Urkunden (wo jahresloses Datum real
// vorkommt und eine eigene "Undatiert"-Kachel bekommt) hat data/
// buergerbuch.csv bei ALLEN 2791 Zeilen ein auswertbares Datum (live
// geprüft, 0 leere/unauswertbare Werte) - eine eigene "Undatiert"-Kachel
// entfällt deshalb hier ersatzlos (nicht: übersehen). js/utils/
// buergerbuchZeit.js' teileNachJahr() bleibt trotzdem robust für den
// theoretischen Fall künftiger unvollständiger Datenpflege (liefert dann
// ein leeres, aber technisch vorhandenes ohneJahr-Array).
//
// Punkt 1 (Info-Button, Auftrag: "Vorschlag machen, ich gebe frei"): Text
// unten (TRELLIS_INFO_TEXT) ist ein VORSCHLAG, noch nicht freigegeben - siehe
// Selbstauskunft im Chat.
//
// AUFTRAG "Bürgerbuch-Trellis – größere Beschriftung, dünner Rahmen je
// Panel": Punkt 1 (Beschriftung vergrößern) - der Auftrag nennt "Sektor-Titel
// UND Achsenbeschriftungen"; dieses Modul zeichnet bislang aber gar keine
// separaten Achsen-Tick-Beschriftungen (nur den Sektor-Titel und eine
// unbeschriftete Baseline, siehe zeichneEinFacet()) - es gibt hier also
// nichts an "Achsenbeschriftungen" zu vergrößern, das nicht bereits der
// Sektor-Titel wäre (siehe Selbstauskunft im Chat, transparent gemeldet statt
// stillschweigend neue Achsenbeschriftungen zu ergänzen, was über den
// Auftrag "größere Beschriftung" hinausgehen würde). SEKTOR_TITEL_SCHRIFTGROESSE
// 11→15px (Faktor ≈1,36, im Auftrag als Richtwert 1,3-1,4× vorgegeben,
// identische Konvention zu früheren Schriftgrößen-Aufträgen, siehe CHANGELOG).
// Damit bei der bei größerer Schrift schneller drohenden Titel-Überlappung/
// -Abschneidung (Auftrag: "ohne dass Titel... überlappen oder abgeschnitten
// werden") KEIN reiner Zeichen-Zähl-Wert (bisher fix "30 Zeichen") verwendet
// wird, der bei kleineren Facetten (MIN_FACET_BREITE, siehe unten) zu lang
// werden könnte, wird die bereits geteilte, schriftgrößen- und
// breitenabhängige Kürzungsformel aus beschriftung.js (Auftrag
// "Beschriftungs-Kürzung mit Ellipse", bislang für Treemap/Sunburst/Icicle/
// Circle-Packing genutzt) hier ein fünftes Mal eingebunden - misst nicht die
// echte Textbreite, sondern nutzt dieselbe etablierte Heuristik
// (0,57 × Schriftgröße pro Zeichen), passt sich aber - anders als der
// bisherige feste "30 Zeichen"-Wert - korrekt an SEKTOR_TITEL_SCHRIFTGROESSE
// und die tatsächliche facetBreite an.
//
// Punkt 2 (dünner Rahmen je Panel): jedes Facet bekommt einen 1px-Rahmen in
// derselben gedeckten Rand-Farbe wie der Rest der Oberfläche (`var(--border,
// #ddd8cf)`, identisches Muster zu sunburst.js) - bewusst kein eigener,
// kräftigerer Farbton, damit der Rahmen abgrenzt, aber nicht dominiert
// (Akzeptanzkriterium: "kein zu kräftiger/dominanter Rahmen").
//
// AUFTRAG "Bipartiter Graph → Urkunden (Sankey), Personennetzwerk →
// Bürgerbuch, plus Trellis/Bump-Chart-Korrekturen", Punkt 3 (Trellis
// vergrößern) - Root Cause der bisherigen "sehr klein/gestaucht"-Wahrnehmung:
// die Panelgröße (FACET_BREITE/FACET_HOEHE) war fest codiert, NUR die
// Spaltenzahl passte sich der Breite an - die Höhe blieb rein inhaltsgetrieben
// (`zeilenAnzahl * FACET_HOEHE`), unabhängig davon, wie viel Bildschirmhöhe
// tatsächlich zur Verfügung stand (dasselbe Muster, das bei dotPlot.js vor
// dessen eigenem Vollbild-Auftrag bestand). Fix: js/utils/viewportGroesse.js'
// bereits etablierte `ermittleVerfuegbareBreite()`/`ermittleVerfuegbareHoehe()`
// liefern die TATSÄCHLICH verfügbare Fläche (Container-Breite bzw. Rest der
// Bildschirmhöhe unterhalb der Werkzeugleiste) - Spalten-/Zeilenzahl wird
// daraus so gewählt, dass das Seitenverhältnis der einzelnen Panels nahe an
// einem für ein Histogramm gut lesbaren Ziel-Verhältnis (`FACET_ZIEL_ASPEKT`)
// bleibt (`ermittleSpaltenzahl()`), FACET_BREITE/-HOEHE ergeben sich danach
// aus verfügbarer Fläche ÷ Spalten/Zeilen (mit MIN_FACET_*-Untergrenze für
// sehr kleine Bildschirme - danach greift wie bei allen Vollbild-Modulen der
// etablierte Seiten-Scroll-Fallback statt eines erzwungenen Unterschreitens).

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import {
  teileNachJahr,
  ermittleSektorenSortiertNachHaeufigkeit,
  berechneJahresBins,
  gruppiereProBinUndSektor,
  baueSektorFarbSkala
} from '../utils/buergerbuchZeit.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { ermittleVerfuegbareBreite, ermittleVerfuegbareHoehe } from '../utils/viewportGroesse.js';
import { ermittleBeschriftungstext } from '../utils/beschriftung.js';

const BIN_GROESSE_JAHRE = 1;
// Untergrenze statt fester Größe (siehe Dateikopf-Kommentar) - die
// tatsächliche Panelgröße ergibt sich aus der verfügbaren Bildschirmfläche
// und wächst dort deutlich darüber hinaus (Auftrag: "deutlich größere
// Panels"). Die bisherigen 260×150 bleiben als Mindestwert erhalten, damit
// auch auf kleinen Bildschirmen kein unlesbar winziges Panel entsteht.
const MIN_FACET_BREITE = 260;
const MIN_FACET_HOEHE = 150;
// Ziel-Seitenverhältnis (Breite:Höhe) für ein gut lesbares Jahres-Histogramm
// - orientiert an der bisherigen festen Größe (260/150 ≈ 1,73), bestimmt bei
// der Verteilung auf Spalten/Zeilen, ob eher mehr schmalere oder weniger,
// breitere Panels gewählt werden (siehe ermittleSpaltenzahl()).
const FACET_ZIEL_ASPEKT = 1.73;
// oben leicht erhöht (22→26), damit der vergrößerte Sektor-Titel (siehe
// SEKTOR_TITEL_SCHRIFTGROESSE) genug vertikalen Raum hat, ohne die
// Baseline/Balken darunter zu berühren.
const FACET_INNENRAND = { oben: 26, unten: 22, links: 6, rechts: 6 };
// Punkt 1 (siehe Dateikopf-Kommentar): 11→15px, Faktor ≈1,36.
const SEKTOR_TITEL_SCHRIFTGROESSE = 15;

const TRELLIS_INFO_TEXT = `Dieser Trellis zeigt für jeden Wirtschaftssektor ein eigenes kleines Diagramm: die x-Achse ist das Jahr, die y-Achse die Anzahl der Bürgeraufnahmen in diesem Jahr. Alle Diagramme nutzen dieselbe y-Skala, damit die Sektoren fair miteinander vergleichbar bleiben.

„Beruf nicht angegeben" fasst Bürgeraufnahmen ohne vermerkten Beruf/Sektor in einem eigenen Panel zusammen, statt sie auszublenden.

Gestrichelter roter Rand kennzeichnet Jahre mit mindestens einer unsicheren Datums- oder Berufsangabe.`;

let instanz = null; // { container, wurzel, records, options, infoButton } – ein aktiver Trellis pro Modul-Ladung

function baueBalkenTooltip(sektor, bin, zelle) {
  const zeilen = [sektor, `${bin.von}`, `${zelle.anzahl} Bürgeraufnahme(n)`];
  if (zelle.unsicherAnzahl > 0) zeilen.push(`davon ${zelle.unsicherAnzahl} mit unsicherer Angabe`);
  return zeilen.join('\n');
}

// ermittelt die Spaltenzahl, bei der die resultierende Panelgröße
// (verfuegbareBreite/spalten × verfuegbareHoehe/zeilen) dem Ziel-
// Seitenverhältnis FACET_ZIEL_ASPEKT am nächsten kommt - dieselbe
// "Grid an Container-Seitenverhältnis anpassen"-Idee, wie sie z.B. Foto-
// Rasterlayouts verwenden, hier neu für dieses Modul geschrieben (kein
// bestehender geteilter Baustein dafür im Projekt).
function ermittleSpaltenzahl(anzahlPanels, verfuegbareBreite, verfuegbareHoehe) {
  let besteSpalten = 1;
  let besteAbweichung = Infinity;
  for (let spalten = 1; spalten <= anzahlPanels; spalten += 1) {
    const zeilen = Math.ceil(anzahlPanels / spalten);
    const aspekt = (verfuegbareBreite / spalten) / (verfuegbareHoehe / zeilen);
    const abweichung = Math.abs(Math.log(aspekt / FACET_ZIEL_ASPEKT));
    if (abweichung < besteAbweichung) {
      besteAbweichung = abweichung;
      besteSpalten = spalten;
    }
  }
  return besteSpalten;
}

function zeichneEinFacet(svg, sektor, farbe, matrixZeile, bins, xSkala, ySkala, facetBreite, facetHoehe, container, zeigeUnsicherheit) {
  const innenHoehe = facetHoehe - FACET_INNENRAND.oben - FACET_INNENRAND.unten;

  // Punkt 2 (siehe Dateikopf-Kommentar): dünner, dezenter Rahmen um das
  // gesamte Panel (Titel + Plot-Fläche), nicht nur um die Balken.
  svg.append('rect')
    .attr('x', 0).attr('y', 0).attr('width', facetBreite).attr('height', facetHoehe)
    .attr('fill', 'none').attr('stroke', 'var(--border, #ddd8cf)').attr('stroke-width', 1);

  const titelText = ermittleBeschriftungstext(sektor, facetBreite - 8, SEKTOR_TITEL_SCHRIFTGROESSE) || sektor.slice(0, 3);
  svg.append('text')
    .attr('x', 4).attr('y', 17).attr('font-size', SEKTOR_TITEL_SCHRIFTGROESSE).attr('font-weight', 'bold')
    .text(titelText);

  const balken = svg.append('g')
    .selectAll(null)
    .data(bins.map((bin, i) => ({ bin, zelle: matrixZeile ? matrixZeile[i] : { anzahl: 0, unsicherAnzahl: 0, eintraege: [] } })))
    .join('rect')
    .attr('tabindex', (d) => (d.zelle.anzahl > 0 ? 0 : -1))
    .attr('x', (d) => xSkala(d.bin.von))
    .attr('width', Math.max(xSkala.bandwidth() - 1, 0))
    .attr('y', (d) => FACET_INNENRAND.oben + innenHoehe - ySkala(d.zelle.anzahl))
    .attr('height', (d) => ySkala(d.zelle.anzahl))
    .attr('fill', farbe)
    .attr('stroke', (d) => (zeigeUnsicherheit && d.zelle.unsicherAnzahl > 0 ? '#c0392b' : 'none'))
    .attr('stroke-width', (d) => (zeigeUnsicherheit && d.zelle.unsicherAnzahl > 0 ? 2 : 0))
    .attr('stroke-dasharray', (d) => (zeigeUnsicherheit && d.zelle.unsicherAnzahl > 0 ? '3,2' : null));

  balken.filter((d) => d.zelle.anzahl > 0)
    .on('mouseenter focus', function (event, d) { zeigeTooltip(baueBalkenTooltip(sektor, d.bin, d.zelle), this, container); })
    .on('mouseleave blur', () => versteckeTooltip());

  svg.append('line')
    .attr('x1', 0).attr('x2', facetBreite - FACET_INNENRAND.rechts)
    .attr('y1', FACET_INNENRAND.oben + innenHoehe).attr('y2', FACET_INNENRAND.oben + innenHoehe)
    .attr('stroke', '#ccc');
}

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .trellis-wurzel { display: flex; flex-direction: column; height: 100%; }
    .trellis-werkzeugleiste { display: flex; justify-content: flex-end; margin: 0 0 var(--space-3) 0; flex: 0 0 auto; }
    .trellis-plot-bereich { flex: 1 1 auto; overflow-x: hidden; overflow-y: visible; }
  `;
  container.appendChild(style);
}

function zeichneTrellis() {
  const { container, wurzel, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;

  if (instanz.infoButton) instanz.infoButton.destroy();
  wurzel.innerHTML = '';

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'trellis-werkzeugleiste';
  instanz.infoButton = erzeugeInfoButton(werkzeugleiste, { text: TRELLIS_INFO_TEXT, ariaLabel: 'Erklärung zum Trellis' });

  const plotBereich = document.createElement('div');
  plotBereich.className = 'trellis-plot-bereich';
  wurzel.append(werkzeugleiste, plotBereich);

  const { mitJahr } = teileNachJahr(records);
  const sektoren = ermittleSektorenSortiertNachHaeufigkeit(mitJahr);
  const farbeFuerSektor = baueSektorFarbSkala(records);
  const bins = mitJahr.length > 0 ? berechneJahresBins(mitJahr, BIN_GROESSE_JAHRE) : [];
  const matrix = gruppiereProBinUndSektor(mitJahr, sektoren, bins);
  const maxAnzahl = d3.max(matrix.flatMap((zeile) => sektoren.map((s) => zeile[s].anzahl))) || 1;

  // Punkt 3 (siehe Dateikopf-Kommentar): verfügbare Breite/Höhe JETZT messen
  // - plotBereich ist gerade wieder im DOM eingehängt (append() oben) und
  // bereits nach der Werkzeugleiste bemessen (flex:1 1 auto gegenüber deren
  // flex:0 0 auto), dieselbe Reihenfolge-Abhängigkeit wie bei dotPlot.js.
  const breite = options.width || ermittleVerfuegbareBreite(container);
  const verfuegbareHoehe = options.height || ermittleVerfuegbareHoehe(plotBereich);
  const spalten = Math.max(ermittleSpaltenzahl(sektoren.length, breite, verfuegbareHoehe), 1);
  const zeilenAnzahl = Math.ceil(sektoren.length / spalten);
  const facetBreite = Math.max(Math.floor(breite / spalten), MIN_FACET_BREITE);
  const facetHoehe = Math.max(Math.floor(verfuegbareHoehe / zeilenAnzahl), MIN_FACET_HOEHE);

  const xSkala = d3.scaleBand().domain(bins.map((b) => b.von)).range([FACET_INNENRAND.links, facetBreite - FACET_INNENRAND.rechts]).padding(0.1);
  const ySkala = d3.scaleLinear().domain([0, maxAnzahl]).range([0, facetHoehe - FACET_INNENRAND.oben - FACET_INNENRAND.unten]);

  const svg = d3.select(plotBereich).append('svg').attr('width', breite);

  sektoren.forEach((sektor, i) => {
    const spalte = i % spalten;
    const zeile = Math.floor(i / spalten);
    const gruppe = svg.append('g').attr('transform', `translate(${spalte * facetBreite},${zeile * facetHoehe})`);
    zeichneEinFacet(gruppe, sektor, farbeFuerSektor(sektor), matrix.map((z) => z[sektor]), bins, xSkala, ySkala, facetBreite, facetHoehe, container, zeigeUnsicherheit);
  });

  const gesamtHoehe = zeilenAnzahl * facetHoehe;
  svg.attr('height', gesamtHoehe)
    .attr('viewBox', `0 0 ${breite} ${gesamtHoehe}`)
    .attr('role', 'img')
    .attr('aria-label', 'Trellis des Bürgerbuchs: Jahresverteilung je Wirtschaftssektor');

  svg.append('desc').text(
    'Ein Mini-Histogramm je Wirtschaftssektor (inklusive "Beruf nicht angegeben"), alle mit ' +
    'derselben Skala für fairen Vergleich. Gestrichelter roter Rand kennzeichnet Jahre mit ' +
    'mindestens einer unsicheren Datums- oder Berufsangabe.'
  );
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  container.innerHTML = '';
  fuegeStyleEin(container);

  const wurzel = document.createElement('div');
  wurzel.className = 'trellis-wurzel';
  container.appendChild(wurzel);

  instanz = { container, wurzel, records: data, options: { showUncertainty: true, width: null, height: null, ...options }, infoButton: null };
  zeichneTrellis();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneTrellis();
}

export function destroy() {
  if (!instanz) return;
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
