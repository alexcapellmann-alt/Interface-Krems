// js/viz/marimekkoVerlassenschaften.js
// AUFTRAG "Marimekko für Verlassenschaften (Vermögensgruppe x
// Realvermögens-Zusammensetzung)".
//
// Neue Datei statt Umwidmung von js/viz/marimekko.js (Auftrag bat um eine
// kurze Einschätzung, siehe Selbstauskunft im Chat): marimekko.js ist unter
// `urkunden.ansichten` weiterhin aktiv (Jahrhundert x Kategorie, Spaltenbreite
// = Urkundenzahl, Live-Zählung über urkundenZeit.js) - eine Umwidmung hätte
// entweder diese bestehende, funktionierende Ansicht ersatzlos entfernt oder
// beide Datenmodelle (Zählungs-Stapel je Kategorie vs. geld-gewichtete
// Prozent-Zusammensetzung je Vermögensgruppe, inkl. eigenem fünften Segment
// und anderer Formel für die Spaltenbreite) in einer Datei verschränkt -
// strukturell zwei verschiedene Diagramme trotz gemeinsamem Diagrammtyp-Namen
// ("Marimekko"). Eine neue, eigene Datei ist hier der geringere Aufwand UND
// das geringere Risiko (keine Regression an der bestehenden Urkunden-Ansicht).
//
// Zahlen: der Auftrag liefert eine "vorab berechnete, verifizierte" Tabelle
// (bitte 1:1 übernehmen). LIVE gegen data/verlassenschaftsinventare.csv
// nachgerechnet (siehe Selbstauskunft im Chat, Methode: `Realvermoegen_fl`
// je Person mit ihrem jeweiligen Anteils-Prozentsatz gewichtet, dann über die
// Gruppe aufsummiert - NICHT der einfache Durchschnitt der Einzelprozente,
// exakt wie im Auftrag beschrieben) - deckt sich für alle fünf Gruppen A-E
// exakt mit der gelieferten Tabelle. Bewusst NICHT als hartcodierte Tabelle
// übernommen, sondern weiterhin LIVE aus den Records berechnet
// (ermittleGruppenDaten() unten, dieselbe Begründung/Präzedenzfall wie
// vermoegensschichtung.js: Abschnitt 2 verlangt archivarische Inhalte
// ausschließlich aus data/*.csv, nicht im Code verdoppelt - die
// Live-Berechnung IST die verifizierte Tabelle, nur ohne Duplizierung).
// Felder/Spaltennamen aus js/utils/verlassenschaftenFelder.js wiederverwendet
// (dieselbe Single-Source-of-Truth wie parallelKoordinaten.js/
// korrelationsmatrix.js).
//
// Gruppen A*/S bewusst NICHT Teil der x-Achse (Auftrag, wörtlich: "X-Achse:
// 5 Spalten A-E") - anders als vermoegensschichtung.js (dort alle sieben
// Werte inkl. A*/S in eigener Achsen-Reihenfolge, siehe dortiger
// Dateikopf-Kommentar). Records ohne auswertbares Realvermögen (aktuell nur
// VI-0004, Gruppe S, ohnehin außerhalb A-E) werden robust übersprungen.
//
// Punkt 1 (Farbe): alle fünf Bestandteile (Grundstücke/Bargeld/
// Wertgegenstände/Beruflicher Sonderbestand/Übrige Mobilien) bekommen je eine
// eigene, gedeckte Flächenfarbe (SEGMENT_FARBEN unten) - eine neue, eigene
// kleine Farbpalette (nicht js/utils/vermoegensgruppenFarben.js's ordinale
// Rot-Gelb-Grün-Skala: die ist für die GRUPPEN A-E als Rangfolge gedacht, hier
// geht es dagegen um fünf NOMINALE, gleichrangige Vermögensbestandteile -
// andere Bedeutung, andere Skala nötig). "Übrige Mobilien" (siehe FOLGEAUFTRAG
// unten) ist bewusst KEINE Schraffur mehr, sondern eine eigene, nur farblich
// zurückhaltendere Vollfarbe.
//
// Punkt 2 (Beschriftung): Gruppenbezeichnung + "n=…" unterhalb jeder Spalte
// (analog zur Bucket-Beschriftung in marimekko.js, hier zweizeilig wegen der
// zusätzlichen n-Angabe). Hover pro Segment zeigt Bezeichnung, exakten
// Prozentwert UND Gulden-Betrag (baueSegmentTooltip()) - der Betrag ist die
// bereits im Rahmen der Live-Berechnung ermittelte gewichtete Teilsumme,
// nicht separat aus der Prozentzahl zurückgerechnet (vermeidet doppelte
// Rundung). Eine Farblegende (nicht explizit beauftragt, aber ohne sie wäre
// die Segmentfarbe ohne Hover nicht decodierbar - dieselbe Begründung wie die
// Legenden in parallelKoordinaten.js/vermoegensschichtung.js) ergänzt die
// Kopfzeile.
//
// FOLGEAUFTRAG "Marimekko – fünftes Segment neu benennen und interpretieren":
// nach Rücksprache mit der Quelle (Dietrich, Kapitel VII.III, S. 39-40) ist
// das fünfte Segment KEINE Datenlücke, sondern eine bewusste methodische
// Entscheidung des Autors - "übrige Mobilien" (Textilien, Geschirr, Möbel
// u.a.), qualitativ statt quantitativ behandelt. Der bisherige Schlüssel
// `rest` heißt jetzt `mobilien` (durchgängig umbenannt, inkl. aller darauf
// verweisenden Funktionen/Konstanten - reine Namens-/Bedeutungsänderung,
// siehe Nicht-Ziel-Vorgabe: die BERECHNUNG selbst, also welcher Betrag/Anteil
// diesem Segment zugeordnet wird, bleibt unverändert die Differenz zur
// Gruppen-RV-Summe). Darstellung von grauer Schraffur (signalisiert in
// Datenvisualisierungs-Konventionen typischerweise "fehlend/platzhalter") auf
// eine fünfte, eigene VOLLFARBE umgestellt (`#6b7a8f`, gedecktes Blaugrau) -
// dieselbe visuelle Behandlung wie die vier Hauptkategorien (durchgezogene
// Fläche, weißer Rand), nur farblich zurückhaltender/neutraler gehalten, um
// weiterhin von den vier "harten" Dietrich-Kategorien unterscheidbar zu
// bleiben, ohne wie eine unbekannte/fehlende Kategorie zu wirken
// (Akzeptanzkriterium, wörtlich).

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { parseKommaZahl, VERMOEGENS_VARIABLEN } from '../utils/verlassenschaftenFelder.js';

const RAND = { oben: 16, unten: 48, links: 12, rechts: 12 };
const SPALTENABSTAND = 6;

const GRUPPEN_REIHENFOLGE = ['A', 'B', 'C', 'D', 'E'];

// Reihenfolge der vier realen Bestandteile - entspricht der Spaltenreihenfolge
// der Auftragstabelle. `feld` je Schlüssel kommt direkt aus
// verlassenschaftenFelder.js (Single Source of Truth für CSV-Spaltennamen).
const SEGMENT_SCHLUESSEL = ['grundstuecke', 'bargeld', 'wertgegenstaende', 'sonderbestand'];
const SEGMENT_FELD = Object.fromEntries(
  SEGMENT_SCHLUESSEL.map((schluessel) => [schluessel, VERMOEGENS_VARIABLEN.find((v) => v.schluessel === schluessel).feld])
);
const REALVERMOEGEN_FELD = VERMOEGENS_VARIABLEN.find((v) => v.schluessel === 'realvermoegen').feld;

const SEGMENT_LABEL = {
  grundstuecke: 'Grundstücke',
  bargeld: 'Bargeld',
  wertgegenstaende: 'Wertgegenstände',
  sonderbestand: 'Beruflicher Sonderbestand',
  mobilien: 'Übrige Mobilien (Textilien, Geschirr, Möbel u. a.)'
};

// Gedeckte, klar unterscheidbare Flächenfarben (Punkt 1, siehe
// Dateikopf-Kommentar) - einzeln gegen WCAG nicht geprüft, da auf den
// Segmenten selbst kein Text sitzt (nur Hover-Tooltip, siehe tooltip.js).
// `mobilien` bewusst zurückhaltender/neutraler (gedecktes Blaugrau) als die
// vier "harten" Dietrich-Kategorien, aber eine eigene Vollfarbe wie diese.
const SEGMENT_FARBEN = {
  grundstuecke: '#b08968',
  bargeld: '#c9a227',
  wertgegenstaende: '#7d5ba6',
  sonderbestand: '#4f8a8b',
  mobilien: '#6b7a8f'
};

// Zeichenreihenfolge: zeichneEineSpalte() füllt von UNTEN nach OBEN (erster
// Eintrag = unterste Position), das LETZTE Element landet also zuoberst -
// "mobilien" deshalb bewusst als letztes Element, damit es weiterhin exakt
// "oben" sitzt (unverändert seit dem vorherigen Auftrag), sonst identisch zur
// Tabellen-Reihenfolge der vier quantitativ ausgewerteten Bestandteile.
const SEGMENT_ZEICHEN_REIHENFOLGE = ['grundstuecke', 'bargeld', 'wertgegenstaende', 'sonderbestand', 'mobilien'];

const INFO_TEXT = 'Dieses Marimekko zeigt, wie sich das Realvermögen der Verlassenschaftsinventare je Vermögensgruppe (A = verschuldet bis E = Oberschicht, nach Dietrichs Klassifikation) zusammensetzt. Die Spaltenbreite entspricht der Summe des Realvermögens der jeweiligen Gruppe, die Segmenthöhe der Vermögenszusammensetzung.\n\nGrundstücke, Bargeld, Wertgegenstände und beruflicher Sonderbestand sind die vier von Dietrich quantitativ ausgewerteten Kategorien. Der verbleibende Anteil entfällt auf übrige Mobilien (Textilien, Geschirr, Möbel und sonstige Alltagsgegenstände) – diese wurden bewusst nicht in die Prozentrechnung einbezogen, da ihre uneinheitliche historische Verbuchung (z. B. Hauerzubehör mal als Fahrnis, mal als Handelslager) die quantitative Auswertung verzerrt hätte. Dietrich untersucht diese Gegenstände stattdessen qualitativ in einem eigenen Kapitel seiner Arbeit.';

let instanz = null; // { container, wurzel, chartContainer, records, options, infoButton } – eine aktive Ansicht pro Modul-Ladung

function formatiereGulden(betrag) {
  return `${Math.round(betrag).toLocaleString('de-DE')} fl.`;
}

function formatiereProzent(anteil) {
  return `${anteil.toFixed(1).replace('.', ',')} %`;
}

// Live-Aggregation (siehe Dateikopf-Kommentar): je Person wird ihr
// Realvermögen MIT dem jeweiligen Anteils-Prozentsatz gewichtet, erst danach
// über die Gruppe aufsummiert - das entspricht "gewichtet nach tatsächlichem
// Realvermögen, nicht Durchschnitt der Einzelprozente" (Auftrag, wörtlich).
// Das "mobilien"-Segment wird weiterhin als Differenz zur Gruppen-RV-Summe
// berechnet (nicht separat aus einer eigenen CSV-Spalte, die es nicht gibt -
// die Verbuchung dieser Gegenstände war laut Dietrich gerade uneinheitlich)
// - unverändert seit dem vorherigen Auftrag (Nicht-Ziel: keine Änderung an
// der Berechnung selbst), damit die vier quantitativen Segmente plus
// "mobilien" IMMER exakt 100% der Spalte ergeben, ohne Rundungslücken.
function ermittleGruppenDaten(records) {
  const gruppen = {};
  GRUPPEN_REIHENFOLGE.forEach((g) => {
    gruppen[g] = { n: 0, rvSumme: 0, segmentSummen: { grundstuecke: 0, bargeld: 0, wertgegenstaende: 0, sonderbestand: 0 } };
  });

  records.forEach((record) => {
    const gruppe = record['Vermoegensgruppe'];
    if (!gruppen[gruppe]) return; // nur A-E (Auftrag, wörtlich) - A*/S bleiben hier außen vor
    const rv = parseKommaZahl(record[REALVERMOEGEN_FELD]);
    if (rv === null) return; // z.B. VI-0004 (Gruppe S, betrifft A-E ohnehin nicht) - robust für künftige Datenlücken
    gruppen[gruppe].n += 1;
    gruppen[gruppe].rvSumme += rv;
    SEGMENT_SCHLUESSEL.forEach((schluessel) => {
      const anteilProzent = parseKommaZahl(record[SEGMENT_FELD[schluessel]]) || 0;
      gruppen[gruppe].segmentSummen[schluessel] += rv * (anteilProzent / 100);
    });
  });

  return GRUPPEN_REIHENFOLGE.map((gruppe) => {
    const d = gruppen[gruppe];
    const segmente = SEGMENT_SCHLUESSEL.map((schluessel) => ({
      schluessel,
      betrag: d.segmentSummen[schluessel],
      anteil: d.rvSumme > 0 ? (d.segmentSummen[schluessel] / d.rvSumme) * 100 : 0
    }));
    const bekannteSumme = segmente.reduce((summe, s) => summe + s.betrag, 0);
    const mobilienBetrag = Math.max(d.rvSumme - bekannteSumme, 0);
    segmente.push({ schluessel: 'mobilien', betrag: mobilienBetrag, anteil: d.rvSumme > 0 ? (mobilienBetrag / d.rvSumme) * 100 : 0 });
    return { gruppe, n: d.n, rvSumme: d.rvSumme, segmente };
  });
}

function baueSegmentTooltip(gruppeDaten, segment) {
  return [
    `${SEGMENT_LABEL[segment.schluessel]} – Gruppe ${gruppeDaten.gruppe}`,
    formatiereProzent(segment.anteil),
    formatiereGulden(segment.betrag)
  ].join('\n');
}

function baueSegmentAriaLabel(gruppeDaten, segment) {
  return `${SEGMENT_LABEL[segment.schluessel]}, Vermögensgruppe ${gruppeDaten.gruppe}: ${formatiereProzent(segment.anteil)}, ${formatiereGulden(segment.betrag)}`;
}

function baueKopfzeile(container) {
  const kopfzeile = document.createElement('div');
  kopfzeile.className = 'mekkoverl-kopfzeile';

  const titel = document.createElement('h3');
  titel.className = 'mekkoverl-titel';
  titel.textContent = 'Realvermögens-Zusammensetzung nach Vermögensgruppe';
  kopfzeile.appendChild(titel);

  const legende = document.createElement('div');
  legende.className = 'mekkoverl-legende';
  [...SEGMENT_SCHLUESSEL, 'mobilien'].forEach((schluessel) => {
    const eintrag = document.createElement('span');
    eintrag.className = 'mekkoverl-legende-eintrag';
    const punkt = document.createElement('span');
    punkt.className = 'mekkoverl-legende-punkt';
    punkt.style.background = SEGMENT_FARBEN[schluessel];
    eintrag.append(punkt, document.createTextNode(SEGMENT_LABEL[schluessel]));
    legende.appendChild(eintrag);
  });
  kopfzeile.appendChild(legende);

  container.appendChild(kopfzeile);
  return kopfzeile;
}

function zeichneEineSpalte(svg, gruppeDaten, xPosition, spaltenBreite, hoehePlot, container) {
  let yUnten = RAND.oben + hoehePlot;

  SEGMENT_ZEICHEN_REIHENFOLGE.forEach((schluessel) => {
    const segment = gruppeDaten.segmente.find((s) => s.schluessel === schluessel);
    const segmentHoehe = gruppeDaten.rvSumme > 0 ? (segment.anteil / 100) * hoehePlot : 0;
    if (segmentHoehe <= 0) return;
    const yOben = yUnten - segmentHoehe;

    const rect = svg.append('rect')
      .attr('tabindex', 0)
      .attr('aria-label', baueSegmentAriaLabel(gruppeDaten, segment))
      .attr('x', xPosition).attr('y', yOben)
      .attr('width', Math.max(spaltenBreite - 1, 0)).attr('height', Math.max(segmentHoehe - 1, 0))
      .attr('fill', SEGMENT_FARBEN[schluessel])
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1);

    rect
      .on('mouseenter focus', function () {
        d3.select(this).attr('stroke', 'var(--text)').attr('stroke-width', 2);
        zeigeTooltip(baueSegmentTooltip(gruppeDaten, segment), this, container);
      })
      .on('mouseleave blur', function () {
        d3.select(this).attr('stroke', '#ffffff').attr('stroke-width', 1);
        versteckeTooltip();
      });

    yUnten = yOben;
  });

  svg.append('text')
    .attr('class', 'mekkoverl-spalten-gruppe')
    .attr('x', xPosition + spaltenBreite / 2).attr('y', RAND.oben + hoehePlot + 20)
    .attr('text-anchor', 'middle').attr('font-weight', 'bold')
    .text(gruppeDaten.gruppe);
  svg.append('text')
    .attr('class', 'mekkoverl-spalten-n')
    .attr('x', xPosition + spaltenBreite / 2).attr('y', RAND.oben + hoehePlot + 36)
    .attr('text-anchor', 'middle')
    .text(`n=${gruppeDaten.n}`);
}

function zeichneMarimekko() {
  const { chartContainer, records } = instanz;
  const container = chartContainer;
  container.innerHTML = '';

  const kopfzeile = baueKopfzeile(container);

  const gruppenDaten = ermittleGruppenDaten(records);
  const gesamtRV = d3.sum(gruppenDaten, (d) => d.rvSumme) || 1;

  // Höhen-Budget: von `instanz.container` gemessen, nicht von `chartContainer`
  // (Reihenfolge-Abhängigkeit - `chartContainer` ist gerade erst neu bestückt,
  // seine eigene Höhe wäre in diesem Moment noch nicht verlässlich; derselbe
  // bereits etablierte Fix wie in trellis.js/vermoegensschichtung.js).
  const kopfzeileHoehe = kopfzeile.getBoundingClientRect().height + 10;
  const breite = instanz.options.width || instanz.container.clientWidth || 900;
  const hoehePlot = (instanz.options.height || Math.max(instanz.container.clientHeight || 440, 440)) - RAND.oben - RAND.unten - kopfzeileHoehe;
  const nutzbareBreite = breite - RAND.links - RAND.rechts - (gruppenDaten.length - 1) * SPALTENABSTAND;

  const svg = d3.select(container).append('svg').attr('width', breite);

  let xPosition = RAND.links;
  gruppenDaten.forEach((gruppeDaten) => {
    const spaltenBreite = Math.max((gruppeDaten.rvSumme / gesamtRV) * nutzbareBreite, 0);
    zeichneEineSpalte(svg, gruppeDaten, xPosition, spaltenBreite, hoehePlot, container);
    xPosition += spaltenBreite + SPALTENABSTAND;
  });

  const gesamtHoehe = RAND.oben + hoehePlot + RAND.unten;
  svg.attr('height', gesamtHoehe)
    .attr('viewBox', `0 0 ${breite} ${gesamtHoehe}`)
    .attr('role', 'img')
    .attr('aria-label', 'Marimekko der Verlassenschaften: Vermögensgruppe x Realvermögens-Zusammensetzung');

  svg.append('desc').text(
    'Fünf Spalten (Vermögensgruppen A bis E), Spaltenbreite proportional zur Summe des Realvermögens ' +
    'der jeweiligen Gruppe. Jede Spalte ist nach Grundstücke, Bargeld, Wertgegenstände, beruflicher ' +
    'Sonderbestand und übrigen Mobilien (Textilien, Geschirr, Möbel u. a.) zu 100% gestapelt.'
  );
}

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .mekkoverl-wurzel { display: flex; flex-direction: column; height: 100%; }
    .mekkoverl-werkzeugleiste { display: flex; justify-content: flex-end; margin: 0 0 var(--space-3) 0; flex: 0 0 auto; }
    .mekkoverl-chart-bereich { flex: 1 1 auto; overflow-x: hidden; overflow-y: visible; }
    .mekkoverl-kopfzeile { margin-bottom: var(--space-2); }
    .mekkoverl-titel { margin: 0 0 var(--space-2) 0; }
    .mekkoverl-legende { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); font-size: var(--fs-sm); }
    .mekkoverl-legende-eintrag { display: inline-flex; align-items: center; gap: 4px; }
    .mekkoverl-legende-punkt { width: 12px; height: 12px; border-radius: 2px; display: inline-block; border: 1px solid var(--border); }
    .mekkoverl-spalten-gruppe { font-size: 14px; }
    .mekkoverl-spalten-n { font-size: 11px; fill: var(--text-muted); }
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
  wurzel.className = 'mekkoverl-wurzel';
  container.appendChild(wurzel);

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'mekkoverl-werkzeugleiste';
  wurzel.appendChild(werkzeugleiste);

  const chartContainer = document.createElement('div');
  chartContainer.className = 'mekkoverl-chart-bereich';
  wurzel.appendChild(chartContainer);

  instanz = { container, wurzel, chartContainer, records: data, options: { width: null, height: null, ...options }, infoButton: null };
  instanz.infoButton = erzeugeInfoButton(werkzeugleiste, { text: INFO_TEXT, ariaLabel: 'Erklärung zum Marimekko der Verlassenschaften' });
  zeichneMarimekko();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneMarimekko();
}

export function destroy() {
  if (!instanz) return;
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
