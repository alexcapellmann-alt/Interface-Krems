// js/viz/vermoegensschichtung.js
// AUFTRAG "Parallelkoordinaten-Anpassung + neue Visualisierung
// 'Vermögensschichtung'", Teil B: neue Visualisierung, die Max Roman
// Dietrichs Kernbefund (Masterarbeit "Verlassenschaftsinventare in Krems
// und Stein zwischen 1671 und 1719") direkt zeigt - drei nebeneinander
// stehende Kleinmultiples-Balkendiagramme (eines je untersuchtem
// Jahrzehnt), X-Achse Vermögensgruppe (A, A*, B, C, D, E, S), Y-Achse
// Anzahl der Inventare mit GEMEINSAMER Skala über alle drei Panels.
//
// Zahlen: der Auftrag liefert eine "vorab verifizierte", 1:1 zu
// übernehmende Tabelle - LIVE gegen data/verlassenschaftsinventare.csv
// nachgerechnet (siehe Selbstauskunft im Chat), deckt sich exakt. Bewusst
// NICHT als hartcodierte Tabelle im Code übernommen, sondern weiterhin LIVE
// aus den Records berechnet (ermittleGruppierteDaten() unten) - Abschnitt 2
// verlangt, archivarische Inhalte ausschließlich aus data/*.csv zu beziehen,
// nicht im Code zu verdoppeln; die Live-Berechnung IST die verifizierte
// Tabelle, nur ohne Duplizierung.
//
// Farbe der Balken: dieselbe ordinale Rot-Gelb-Grün-Skala wie
// parallelKoordinaten.js (js/utils/vermoegensgruppenFarben.js, siehe
// dortiger Dateikopf-Kommentar für die volle Begründung inkl. A*/S) - "für
// Wiedererkennbarkeit zwischen den Modulen" (Auftrag, wörtlich).
//
// Punkt 2 (Aufteilen nach Ort/Geschlecht): stapelt die Balken je
// Unterkategorie. Die Unterkategorie-FARBE variiert bewusst NICHT den
// Farbton (das würde mit der Vermögensgruppen-Rot-Grün-Kodierung der
// Balken selbst konkurrieren), sondern nur die DECKKRAFT derselben
// Gruppenfarbe (siehe SEGMENT_OPAZITAETEN) - die Balkenfarbe bleibt dadurch
// immer eindeutig der Vermögensgruppe zuordenbar, auch gestapelt.
//
// Punkt 3 (Klick öffnet Personenliste): eigene, schlanke Listendarstellung
// (baueListeInhalt() unten) statt js/utils/sidebar.js' Urkunden-spezifischer
// baueUrkundenListeInhalt()/zeigeUrkundenListe() (die sind strukturell an
// Urkunden-Felder wie signatur/regest/kategorien gebunden, siehe dortiger
// Dateikopf-Kommentar) - wiederverwendet wird nur das generische Gerüst
// (baueSidebarGeruest()/fuegeSidebarStyleEin(), kennt laut eigenem
// Dateikopf-Kommentar bewusst nur "einen Container, ... eine kleine
// Konfiguration").

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { baueSidebarGeruest, fuegeSidebarStyleEin } from '../utils/sidebar.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { farbeFuerVermoegensgruppe, VERMOEGENSGRUPPE_ANZEIGE_REIHENFOLGE } from '../utils/vermoegensgruppenFarben.js';

const RAND = { oben: 26, unten: 44, links: 44, rechts: 12 };
const PANEL_ABSTAND = 32;
// Punkt 2 (siehe Dateikopf-Kommentar): Deckkraft-Stufen je Unterkategorie-
// Index - bis zu vier Unterkategorien abgedeckt (Ort hat drei: Krems/Stein/
// unklar; Geschlecht zwei), mehr kommen in diesen Daten nicht vor.
const SEGMENT_OPAZITAETEN = [1, 0.55, 0.3, 0.15];

// Punkt 2: Button-Gruppe "Keine/Ort/Geschlecht". `suffix`: siehe
// parallelKoordinaten.js' FARBFELD-Kommentar - Ort braucht den
// "(geschätzt)"-Zusatz in der Legende, Geschlecht trägt ihn bereits im
// CSV-Rohwert selbst.
const SPLIT_OPTIONEN = {
  keine: { knopfLabel: 'Keine', spalte: null, suffix: false },
  ort: { knopfLabel: 'Ort', spalte: 'Ort (Schaetzung)', suffix: true },
  geschlecht: { knopfLabel: 'Geschlecht', spalte: 'Geschlecht (Schaetzung)', suffix: false }
};

const INFO_TEXT = 'Diese Ansicht zeigt, wie sich die Verlassenschaftsinventare auf die Vermögensgruppen A (verschuldet) bis E (Oberschicht) verteilen - je ein Diagramm pro untersuchtem Jahrzehnt, nach Dietrichs Klassifikation. Über den Schalter lässt sich die Verteilung zusätzlich nach Ort oder geschätztem Geschlecht aufschlüsseln, um etwa die wirtschaftliche Entwicklung Steins oder geschlechtsspezifische Vermögensmuster sichtbar zu machen.';

let instanz = null; // { container, chartContainer, records, splitModus, sidebar, infoButton } – eine aktive Ansicht pro Modul-Ladung

function ermittleJahrzehnteSortiert(records) {
  const werte = new Set();
  records.forEach((r) => { if (r['Jahrzehnt']) werte.add(r['Jahrzehnt']); });
  return [...werte].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
}

function ermittleWerteSortiert(records, spalte) {
  const werte = new Set();
  records.forEach((r) => { if (r[spalte]) werte.add(r[spalte]); });
  return [...werte].sort();
}

function baueLegendeText(splitModus, wert) {
  return SPLIT_OPTIONEN[splitModus].suffix ? `${wert} (geschätzt)` : wert;
}

// Baut für EIN Jahrzehnt die sieben Balken (eine je Vermögensgruppe in
// VERMOEGENSGRUPPE_ANZEIGE_REIHENFOLGE), jede mit ihren Segmenten
// (unsplit: ein einziges Segment = Gesamtzahl; gesplittet: eines je
// subKategorien-Wert, auch mit Anzahl 0, damit das Stapeln/die Legende
// über alle Panels konsistent bleibt).
function ermittleGruppierteDaten(records, jahrzehnt, splitKonfig, subKategorien) {
  const zeilenRecords = records.filter((r) => r['Jahrzehnt'] === jahrzehnt);
  return VERMOEGENSGRUPPE_ANZEIGE_REIHENFOLGE.map((gruppe) => {
    const gruppenRecords = zeilenRecords.filter((r) => r['Vermoegensgruppe'] === gruppe);
    if (!splitKonfig.spalte) {
      return { gruppe, gesamt: gruppenRecords.length, segmente: [{ wert: null, anzahl: gruppenRecords.length, records: gruppenRecords }] };
    }
    const segmente = subKategorien.map((sub) => {
      const subRecords = gruppenRecords.filter((r) => r[splitKonfig.spalte] === sub);
      return { wert: sub, anzahl: subRecords.length, records: subRecords };
    });
    return { gruppe, gesamt: gruppenRecords.length, segmente };
  });
}

function baueListeInhalt(records) {
  const liste = document.createElement('ul');
  liste.className = 'vermschicht-liste';
  records.forEach((record) => {
    const item = document.createElement('li');
    item.className = 'vermschicht-liste-eintrag';
    const name = document.createElement('div');
    name.className = 'vermschicht-liste-name';
    name.textContent = record['Name'] || '(ohne Name)';
    const detail = document.createElement('div');
    detail.className = 'vermschicht-liste-detail';
    const beruf = record['Beruf'] || record['Beruf/Funktion/Stand'] || '(Beruf unbekannt)';
    const realvermoegen = record['Realvermoegen_fl'] ? `${record['Realvermoegen_fl']} fl.` : '–';
    detail.textContent = `${beruf} · Realvermögen: ${realvermoegen}`;
    item.append(name, detail);
    liste.appendChild(item);
  });
  return liste;
}

// Punkt 3: eigener, schlanker Öffnen-Aufruf statt sidebar.js' Urkunden-
// spezifischer zeigeUrkundenListe() (siehe Dateikopf-Kommentar).
function oeffneDetailliste(titel, records) {
  const { sidebar } = instanz;
  sidebar.titel.textContent = titel;
  sidebar.koerper.innerHTML = '';
  const anzahl = document.createElement('p');
  anzahl.className = 'vermschicht-anzahl';
  anzahl.textContent = `${records.length} Inventar(e)`;
  sidebar.koerper.appendChild(anzahl);
  sidebar.koerper.appendChild(baueListeInhalt(records));
  sidebar.sidebar.classList.add('offen');
  sidebar.sidebar.setAttribute('aria-hidden', 'false');
  sidebar.titel.focus();
}

function schliesseDetailliste() {
  const { sidebar } = instanz;
  sidebar.sidebar.classList.remove('offen');
  sidebar.sidebar.setAttribute('aria-hidden', 'true');
}

function baueTooltipText(jahrzehnt, gruppe, segment, splitModus) {
  const zeilen = [`Vermögensgruppe ${gruppe}, ${jahrzehnt}`];
  if (splitModus === 'keine') {
    zeilen.push(`Anzahl: ${segment.anzahl}`);
  } else {
    zeilen.push(`${baueLegendeText(splitModus, segment.wert)}: ${segment.anzahl}`);
  }
  return zeilen.join('\n');
}

function baueKopfzeile() {
  const kopfzeile = document.createElement('div');
  kopfzeile.className = 'vermschicht-kopfzeile';

  const titel = document.createElement('h3');
  titel.className = 'vermschicht-titel';
  titel.textContent = 'Vermögensschichtung nach Jahrzehnt';
  kopfzeile.appendChild(titel);

  const umschalterZeile = document.createElement('div');
  umschalterZeile.className = 'vermschicht-umschalter-zeile';
  const label = document.createElement('span');
  label.className = 'vermschicht-umschalter-label';
  label.textContent = 'Aufteilen nach:';
  umschalterZeile.appendChild(label);

  const umschalter = document.createElement('div');
  umschalter.className = 'vermschicht-umschalter';
  Object.entries(SPLIT_OPTIONEN).forEach(([modus, konfig]) => {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = modus === instanz.splitModus ? 'vermschicht-knopf ist-aktiv' : 'vermschicht-knopf';
    knopf.textContent = konfig.knopfLabel;
    knopf.addEventListener('click', () => {
      if (instanz.splitModus === modus) return;
      instanz.splitModus = modus;
      schliesseDetailliste();
      zeichneVermoegensschichtung();
    });
    umschalter.appendChild(knopf);
  });
  umschalterZeile.appendChild(umschalter);
  kopfzeile.appendChild(umschalterZeile);

  return kopfzeile;
}

function baueLegende(container, subKategorien, splitModus) {
  if (subKategorien.length === 0) return;
  const legende = document.createElement('div');
  legende.className = 'vermschicht-legende';
  subKategorien.forEach((wert, index) => {
    const eintrag = document.createElement('span');
    eintrag.className = 'vermschicht-legende-eintrag';
    const punkt = document.createElement('span');
    punkt.className = 'vermschicht-legende-punkt';
    punkt.style.background = `rgba(40,40,40,${SEGMENT_OPAZITAETEN[index] ?? 0.15})`;
    eintrag.append(punkt, document.createTextNode(baueLegendeText(splitModus, wert)));
    legende.appendChild(eintrag);
  });
  container.appendChild(legende);
}

function zeichnePanel(svg, xOffset, panelBreite, hoehePlot, jahrzehnt, daten, ySkala, splitModus) {
  const panel = svg.append('g').attr('transform', `translate(${xOffset},0)`);

  panel.append('text').attr('class', 'vermschicht-panel-titel')
    .attr('x', panelBreite / 2).attr('y', -8).attr('text-anchor', 'middle').attr('font-weight', 'bold')
    .text(jahrzehnt);

  const xSkala = d3.scaleBand().domain(VERMOEGENSGRUPPE_ANZEIGE_REIHENFOLGE).range([0, panelBreite]).padding(0.25);

  panel.append('g').attr('class', 'vermschicht-achse-x').attr('transform', `translate(0,${hoehePlot})`)
    .call(d3.axisBottom(xSkala));

  // Y-Achse (Zahlen+Ticks) nur im ersten Panel, um die geteilte Skala nicht
  // dreimal redundant zu wiederholen (übliches Kleinmultiples-Muster) - der
  // Aufrufer übergibt dafür `xOffset === 0` implizit über die Reihenfolge.
  if (xOffset === 0) {
    panel.append('g').attr('class', 'vermschicht-achse-y').call(d3.axisLeft(ySkala).ticks(5));
  }
  // Dezente horizontale Gitterlinien in JEDEM Panel, damit die Höhen trotz
  // geteilter Y-Achse nur im ersten Panel direkt vergleichbar bleiben.
  panel.append('g').attr('class', 'vermschicht-gitter')
    .call(d3.axisLeft(ySkala).ticks(5).tickSize(-panelBreite).tickFormat(''));

  daten.forEach((eintrag) => {
    const x = xSkala(eintrag.gruppe);
    const breite = xSkala.bandwidth();
    let yKumuliert = hoehePlot;

    eintrag.segmente.forEach((segment, index) => {
      if (segment.anzahl === 0) return;
      const hoeheInPixel = ySkala(0) - ySkala(segment.anzahl);
      const yOben = yKumuliert - hoeheInPixel;

      const rect = panel.append('rect')
        .attr('class', 'vermschicht-balken')
        .attr('tabindex', segment.anzahl > 0 ? 0 : null)
        .attr('role', segment.anzahl > 0 ? 'button' : null)
        .attr('aria-label', segment.anzahl > 0 ? `Vermögensgruppe ${eintrag.gruppe}, ${jahrzehnt}${splitModus === 'keine' ? '' : `, ${baueLegendeText(splitModus, segment.wert)}`}: ${segment.anzahl} Inventare, Details anzeigen` : null)
        .attr('x', x).attr('width', breite)
        .attr('y', yOben).attr('height', Math.max(hoeheInPixel, 0))
        .attr('fill', farbeFuerVermoegensgruppe(eintrag.gruppe))
        .attr('fill-opacity', splitModus === 'keine' ? 1 : (SEGMENT_OPAZITAETEN[index] ?? 0.15))
        .style('cursor', segment.anzahl > 0 ? 'pointer' : 'default');

      rect
        .on('mouseenter focus', function () {
          d3.select(this).attr('stroke', 'var(--text)').attr('stroke-width', 1.5);
          zeigeTooltip(baueTooltipText(jahrzehnt, eintrag.gruppe, segment, splitModus), this, instanz.chartContainer);
        })
        .on('mouseleave blur', function () {
          d3.select(this).attr('stroke', 'none');
          versteckeTooltip();
        });

      if (segment.anzahl > 0) {
        const aktiviere = () => {
          const titelZusatz = splitModus === 'keine' ? '' : ` – ${baueLegendeText(splitModus, segment.wert)}`;
          oeffneDetailliste(`Vermögensgruppe ${eintrag.gruppe}, ${jahrzehnt}${titelZusatz}`, segment.records);
        };
        rect.on('click', aktiviere).on('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); aktiviere(); }
        });
      }

      yKumuliert = yOben;
    });
  });

  return panel;
}

function zeichneVermoegensschichtung() {
  const { chartContainer, records, splitModus } = instanz;
  const container = chartContainer;
  container.innerHTML = '';

  const style = document.createElement('style');
  style.textContent = `
    .vermschicht-titel { margin: 0 0 var(--space-2) 0; }
    .vermschicht-kopfzeile { margin-bottom: var(--space-2); }
    .vermschicht-umschalter-zeile { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-2); }
    .vermschicht-umschalter-label { font-size: var(--fs-sm); color: var(--text-muted); }
    .vermschicht-umschalter { display: flex; gap: var(--space-2); }
    .vermschicht-knopf { min-height: 44px; padding: var(--space-1) var(--space-3); border-radius: var(--radius);
      border: 1px solid var(--border); background: var(--bg); font-family: inherit; font-size: var(--fs-sm); cursor: pointer; }
    .vermschicht-knopf.ist-aktiv { background: var(--accent); border-color: var(--accent); color: var(--surface); font-weight: 600; }
    .vermschicht-knopf:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .vermschicht-legende { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); margin-bottom: var(--space-2); font-size: var(--fs-sm); }
    .vermschicht-legende-eintrag { display: inline-flex; align-items: center; gap: 4px; }
    .vermschicht-legende-punkt { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
    .vermschicht-panel-titel { font-size: ${14}px; }
    .vermschicht-achse-x, .vermschicht-achse-y { font-size: 12px; }
    .vermschicht-gitter line { stroke: var(--border); stroke-opacity: .6; }
    .vermschicht-gitter path { display: none; }
    .vermschicht-gitter text { display: none; }
    .vermschicht-balken:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .vermschicht-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }
    .vermschicht-liste-eintrag { border: 1px solid var(--border); border-radius: var(--radius); padding: var(--space-2); }
    .vermschicht-liste-name { font-weight: 600; font-size: var(--fs-sm); }
    .vermschicht-liste-detail { font-size: var(--fs-sm); color: var(--text-muted); }
    .vermschicht-anzahl { color: var(--text-muted); font-size: var(--fs-sm); margin: 0 0 var(--space-3) 0; }
  `;
  container.appendChild(style);

  const jahrzehnte = ermittleJahrzehnteSortiert(records);
  const splitKonfig = SPLIT_OPTIONEN[splitModus];
  const subKategorien = splitKonfig.spalte ? ermittleWerteSortiert(records, splitKonfig.spalte) : [];

  const kopfzeile = baueKopfzeile();
  container.appendChild(kopfzeile);
  baueLegende(kopfzeile, subKategorien, splitModus);

  const kopfzeileHoehe = kopfzeile.getBoundingClientRect().height + 10;
  const breite = instanz.options.width || container.clientWidth || 900;
  // Höhen-Budget von `instanz.container` gemessen (siehe CHANGELOG (49) für
  // die volle Begründung, warum NICHT von `container`/chartContainer hier).
  const hoehePlot = (instanz.options.height || Math.max(instanz.container.clientHeight || 450, 450)) - RAND.oben - RAND.unten - kopfzeileHoehe;

  // Alle drei Panels' Rohdaten VOR der Skalenberechnung ermitteln, damit die
  // Y-Skala (Punkt 1: "gemeinsame Skala über alle drei Panels") den
  // tatsächlichen Höchstwert über ALLE Panels hinweg kennt.
  const alleDaten = jahrzehnte.map((jz) => ermittleGruppierteDaten(records, jz, splitKonfig, subKategorien));
  const maxGesamt = d3.max(alleDaten.flat(), (d) => d.gesamt) || 1;
  const ySkala = d3.scaleLinear().domain([0, maxGesamt]).nice().range([hoehePlot, 0]);

  const svgHoehe = hoehePlot + RAND.oben + RAND.unten;
  const svg = d3.select(container).append('svg').attr('width', breite).attr('height', svgHoehe)
    .attr('viewBox', `0 0 ${breite} ${svgHoehe}`)
    .attr('role', 'img')
    .attr('aria-label', 'Vermögensschichtung: Anzahl der Verlassenschaftsinventare je Vermögensgruppe und Jahrzehnt');
  svg.append('desc').text(
    `Drei Balkendiagramme (${jahrzehnte.join(', ')}), je eines pro Jahrzehnt, X-Achse Vermögensgruppe A bis E ` +
    'plus A* und S, Y-Achse Anzahl der Inventare mit gemeinsamer Skala. Klick auf einen Balken öffnet die Liste ' +
    'der betroffenen Personen.'
  );

  const plotGruppe = svg.append('g').attr('transform', `translate(${RAND.links},${RAND.oben})`);
  const panelBreite = (breite - RAND.links - RAND.rechts - (jahrzehnte.length - 1) * PANEL_ABSTAND) / jahrzehnte.length;

  jahrzehnte.forEach((jahrzehnt, index) => {
    zeichnePanel(plotGruppe, index * (panelBreite + PANEL_ABSTAND), panelBreite, hoehePlot, jahrzehnt, alleDaten[index], ySkala, splitModus);
  });
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  container.innerHTML = '';
  const chartContainer = document.createElement('div');
  container.appendChild(chartContainer);

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.style.cssText = 'display:flex;justify-content:flex-end;';
  container.appendChild(werkzeugleiste);

  instanz = { container, chartContainer, records: data, options: { width: null, height: null, ...options }, splitModus: 'keine' };
  instanz.infoButton = erzeugeInfoButton(werkzeugleiste, { text: INFO_TEXT, ariaLabel: 'Erklärung zur Vermögensschichtung' });
  fuegeSidebarStyleEin(container);
  instanz.sidebar = baueSidebarGeruest(container);
  instanz.sidebar.schliessenBtn.addEventListener('click', schliesseDetailliste);
  zeichneVermoegensschichtung();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneVermoegensschichtung();
}

export function destroy() {
  if (!instanz) return;
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
