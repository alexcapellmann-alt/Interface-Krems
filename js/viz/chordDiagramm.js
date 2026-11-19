// js/viz/chordDiagramm.js – Ansicht „Soziale Gruppen“ (Chord-Diagramm)
// Zweck: vier soziale Gruppen (Dynastie, Adel, Klerus, Bürgertum) als Segmente; eine Sehne zählt die Urkunden, die
//   Personen beider Gruppen nennen (jede Urkunde höchstens einmal je Zelle).
// Eingabe: `data.urkunden` (urkunden.csv: personen, personen_id), `data.personenliste` (personenliste.csv:
//   soziale_gruppe) und `data.familien` (familien.csv: id, Rückfall für Dynastie). Die Einteilung ist eine eigene
//   Faustregel, keine belegte historische Klassifikation (so im Infotext).
// Schnittstelle: render(container, data, options), resize(neueOptionen), destroy() wie alle Ansichten (docs/SCHEMA.md);
//   exportiert GRUPPEN, ermittleGruppe() und uebernehmePersonenGruppen() (genutzt von bipartiteFlowMap.js).
// Abhängigkeiten: D3 v7, utils/urkundenPersonen.js, utils/sidebar.js, utils/tooltip.js, utils/infoButton.js.
// Bedienung: Hover und Klick auf ein Segment heben seine Sehnen hervor (Escape oder Klick ins Leere setzt zurück);
//   Klick auf eine Sehne öffnet die Urkunden. Tastaturfokus sichtbar, nach Mausklick kein Fokusrahmen.
// Hintergrund (Zählung, Zuordnungsregel, Beschriftung): docs/MODULNOTIZEN.md, Abschnitt chordDiagramm.js.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { markiereHell } from '../utils/abdunkeln.js'; // Nachbesserung 3, Punkt 4
import { infotextFuerModul, konfigurationswert } from '../core/archivKonfiguration.js';
import { baueSidebarGeruest, fuegeSidebarStyleEin, zeigeUrkundenSidebar, schliesseSidebar } from '../utils/sidebar.js';
import { ermittlePersonenDerUrkunde } from '../utils/urkundenPersonen.js';
import { ermittleVerfuegbareBreite, ermittleVerfuegbareHoehe } from '../utils/viewportGroesse.js';

// Soziale Gruppe je Person aus personenliste.csv (Spalte `soziale_gruppe`: dynastie/adel/klerus/buerger),
// seit 2026-10-27 statt der Wortlisten aus rollen.csv (Wunsch des Autors: rollen.csv entfällt). Die
// Spalte war bereits mit derselben Logik befüllt; geprüft: 2 276 von 2 276 Personennennungen der Urkunden
// ergeben dieselbe Gruppe wie die bisherige Laufzeitberechnung. Geladen über die Bereichsdaten
// (archivalienRegistry.js, `personenliste`) und hier per uebernehmePersonenGruppen() gesetzt.
const GUELTIGE_GRUPPEN = new Set(['dynastie', 'adel', 'klerus', 'buerger']);
let gruppeJePerson = new Map();

// Exportiert: bipartiteFlowMap.js nutzt dieselbe Einteilung (ermittleGruppe()).
export function uebernehmePersonenGruppen(personenlisteRecords = []) {
  gruppeJePerson = new Map();
  personenlisteRecords.forEach((r) => {
    const id = String(r.personen_id ?? '').trim();
    const gruppe = String(r.soziale_gruppe ?? '').trim().toLowerCase();
    if (id && GUELTIGE_GRUPPEN.has(gruppe)) gruppeJePerson.set(id, gruppe);
  });
}

// Reihenfolge bestimmt sowohl die Segment-Anordnung im Kreis als auch die
// Matrix-Indizierung. Farben: vier klar unterscheidbare, moderat gesättigte
// Töne (Akzeptanzkriterium "eindeutig unterscheidbar") - eine neue, eigene
// NOMINALE Vier-Farben-Palette (nicht vermoegensgruppenFarben.js' ordinale
// Skala: die kodiert eine Rangfolge A-E, hier sind die vier Gruppen
// gleichrangig-nominal, andere Bedeutung).
//
// AUFTRAG "Bipartite Flow Map – Zoom-Regression beheben, Balken auf soziale
// Gruppen umstellen", Punkt 2: GRUPPEN und ermittleGruppe() (unten) jetzt
// EXPORTIERT - bipartiteFlowMap.js importiert und nutzt exakt diese, unver-
// änderte Klassifikationslogik für seine vier Kategoriebalken/Flussbänder,
// statt sie ein zweites Mal zu implementieren (Auftrag wörtlich).
export const GRUPPEN = [
  // AUFTRAG C1, Punkt 3: Name aus archiv.csv (`dynastie_gruppenname`,
  // Krems: "Dynastie (Habsburger)"); Getter, weil archiv.csv erst beim Start
  // geladen wird, dieses Modul aber schon vorher ausgewertet sein kann.
  { schluessel: 'dynastie', get label() { return String(konfigurationswert('dynastie_gruppenname') || '').trim() || 'Dynastie'; }, farbe: '#8b1a2b' },
  { schluessel: 'adel', label: 'Adel', farbe: '#1f4e8c' },
  { schluessel: 'klerus', label: 'Klerus', farbe: '#5b2d82' },
  { schluessel: 'buerger', label: 'Bürgertum', farbe: '#2f7a45' }
];

let instanz = null; // { container, wurzel, chartContainer, familienRecords, urkundenRecords, options, infoButton, sidebar, hoverGruppe, frozenGruppe, gruppenAuswahl, sehnenAuswahl, ausgewaehlteSehne } – eine aktive Ansicht pro Modul-Ladung

// Punkt 1, EXAKT in der vorgegebenen Priorität (siehe docs/MODULNOTIZEN.md).
// Exportiert (siehe Auftrag "Bipartite Flow Map – ..." oben) - Wiederver-
// wendung statt Neuimplementierung in bipartiteFlowMap.js.
// Seit 2026-10-27: die Gruppe steht in personenliste.csv; ohne Eintrag dort zählt eine Person der
// Herrscherfamilie (familien.csv) zur Dynastie, alle übrigen zum Bürgertum. `name` bleibt als
// Parameter, damit die Aufrufer unverändert bleiben.
export function ermittleGruppe(name, personenId, familienIds) {
  const id = String(personenId ?? '').trim();
  if (id && gruppeJePerson.has(id)) return gruppeJePerson.get(id);
  if (id && familienIds.has(id)) return 'dynastie';
  return 'buerger';
}

// Ebene (a) - siehe docs/MODULNOTIZEN.md: klassifiziert JEDE Personennennung
// einzeln, direkt aus den rohen `personen`/`personen_id`-Listen jeder
// Urkunde (index-parallel, siehe urkundenPersonen.js). Liefert die
// maßgebliche Gruppengröße für Akzeptanzkriterium/Selbstauskunft.
function ermittleGruppenGroessen(urkundenRecords, familienIds) {
  const groessen = Object.fromEntries(GRUPPEN.map((g) => [g.schluessel, 0]));
  urkundenRecords.forEach((record) => {
    const namen = Array.isArray(record.personen) ? record.personen : (record.personen ? [record.personen] : []);
    const ids = Array.isArray(record.personen_id) ? record.personen_id : (record.personen_id ? [record.personen_id] : []);
    namen.forEach((name, i) => {
      if (!name) return;
      groessen[ermittleGruppe(name, ids[i], familienIds)] += 1;
    });
  });
  return groessen;
}

// KORREKTURAUFTRAG "Zählung pro Urkunde statt pro Personenpaar" (siehe
// docs/MODULNOTIZEN.md): ermittelt je Urkunde, wie viele EINDEUTIGE Personen
// jeder Gruppe darin vorkommen (nicht NUR die Menge der vorkommenden
// Gruppen - die Diagonale braucht zusätzlich die Information "kommen
// MINDESTENS ZWEI Personen derselben Gruppe vor", Auftrag Punkt 1-2,
// wörtlich). `eindeutig` dedupliziert Mehrfachnennungen derselben Person
// INNERHALB einer Urkunde (dieselbe Vorsichtsmaßnahme wie zuvor in
// urkundenPersonen.js' baueKoNennungsNetzwerk()).
function ermittleGruppenAnzahlProUrkunde(record, familienIds) {
  const personen = ermittlePersonenDerUrkunde(record);
  const eindeutig = Array.from(new Map(personen.map((p) => [p.id, p])).values());
  const anzahlProGruppe = new Map();
  eindeutig.forEach((p) => {
    const gruppe = ermittleGruppe(p.name, p.id, familienIds);
    anzahlProGruppe.set(gruppe, (anzahlProGruppe.get(gruppe) || 0) + 1);
  });
  return anzahlProGruppe;
}

// Baut die 4x4-Matrix NEU nach der korrigierten Zählweise (siehe
// docs/MODULNOTIZEN.md "KORREKTURAUFTRAG"): jede Urkunde erhöht JEDE
// Gruppen-Gruppen-Zelle, die sie berührt, um GENAU 1 - unabhängig von der
// Personenzahl dahinter. Off-Diagonale: Zelle [i][j] +1, wenn die Urkunde
// mindestens eine Person aus Gruppe i UND mindestens eine aus Gruppe j
// enthält. Diagonale [i][i]: +1 NUR, wenn mindestens ZWEI eindeutige
// Personen aus Gruppe i vorkommen (Auftrag, wörtlich - eine einzelne Person
// bildet kein "Beziehungspaar" mit sich selbst). `recordsProZelle` bleibt
// ein Set (dedupliziert automatisch über mehrere Aufrufstellen hinweg, hier
// aber ohnehin nur noch EIN `.add()` pro Urkunde und Zelle möglich - siehe
// Akzeptanzkriterium "ohne Duplikate").
function baueGruppenMatrixProUrkunde(urkundenRecords, familienIds) {
  const n = GRUPPEN.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));
  const recordsProZelle = Array.from({ length: n }, () => Array.from({ length: n }, () => new Set()));
  const unsicherProZelle = Array.from({ length: n }, () => Array(n).fill(false));

  urkundenRecords.forEach((record) => {
    const anzahlProGruppe = ermittleGruppenAnzahlProUrkunde(record, familienIds);
    const gruppenSchluessel = [...anzahlProGruppe.keys()];
    if (gruppenSchluessel.length === 0) return;
    const unsicher = !!record.personen_unsicher;

    for (let a = 0; a < gruppenSchluessel.length; a += 1) {
      for (let b = a + 1; b < gruppenSchluessel.length; b += 1) {
        const gi = GRUPPEN.findIndex((g) => g.schluessel === gruppenSchluessel[a]);
        const gj = GRUPPEN.findIndex((g) => g.schluessel === gruppenSchluessel[b]);
        matrix[gi][gj] += 1;
        matrix[gj][gi] += 1;
        recordsProZelle[gi][gj].add(record);
        recordsProZelle[gj][gi].add(record);
        if (unsicher) { unsicherProZelle[gi][gj] = true; unsicherProZelle[gj][gi] = true; }
      }
    }

    gruppenSchluessel.forEach((schluessel) => {
      if (anzahlProGruppe.get(schluessel) < 2) return;
      const gi = GRUPPEN.findIndex((g) => g.schluessel === schluessel);
      matrix[gi][gi] += 1;
      recordsProZelle[gi][gi].add(record);
      if (unsicher) unsicherProZelle[gi][gi] = true;
    });
  });

  return { matrix, recordsProZelle, unsicherProZelle };
}

function aktualisiereHighlight() {
  const { gruppenAuswahl, sehnenAuswahl, hoverGruppe, frozenGruppe, ausgewaehlteSehne } = instanz;
  if (!gruppenAuswahl || !sehnenAuswahl) return;
  const aktiv = frozenGruppe ?? hoverGruppe;

  gruppenAuswahl.classed('chord-gruppe-eingefroren', (d) => d.index === frozenGruppe);

  sehnenAuswahl
    .attr('fill-opacity', (d) => {
      if (ausgewaehlteSehne && d.source.index === ausgewaehlteSehne[0] && d.target.index === ausgewaehlteSehne[1]) return 0.95;
      if (aktiv === null || aktiv === undefined) return 0.65;
      return d.source.index === aktiv || d.target.index === aktiv ? 0.9 : 0.06;
    })
    .attr('stroke-width', (d) => (ausgewaehlteSehne && d.source.index === ausgewaehlteSehne[0] && d.target.index === ausgewaehlteSehne[1] ? 2 : null));
}

// "X Urkunde(n)" statt vormals "X gemeinsame Nennung(en)" (Korrekturauftrag,
// siehe docs/MODULNOTIZEN.md) - `d.source.value` zählt jetzt Urkunden, keine
// Personenpaare mehr, der Text muss das widerspiegeln.
function baueSehnenTooltip(d) {
  const gi = GRUPPEN[d.source.index];
  const gj = GRUPPEN[d.target.index];
  const zeilen = d.source.index === d.target.index
    ? [`${gi.label} (intern)`, `${d.source.value} Urkunde(n) mit mind. zwei Personen aus dieser Gruppe`]
    : [`${gi.label} ↔ ${gj.label}`, `${d.source.value} Urkunde(n) mit Personen aus beiden Gruppen`];
  return zeilen.join('\n');
}

function oeffneSehnenSidebar(d, recordsProZelle) {
  const gi = GRUPPEN[d.source.index];
  const gj = GRUPPEN[d.target.index];
  const titel = d.source.index === d.target.index ? `${gi.label} (intern)` : `${gi.label} ↔ ${gj.label}`;
  const records = [...recordsProZelle[d.source.index][d.target.index]];
  instanz.ausgewaehlteSehne = [d.source.index, d.target.index];
  aktualisiereHighlight();
  zeigeUrkundenSidebar(instanz.sidebar, titel, records);
}

// Länge begründet (über 100 Zeilen, Masterprompt §13.3; Nachbesserung 8): zeichnet die ganze Ansicht in einem Durchgang (Maße, Skalen, Achsen, Elemente, Beschriftung, Interaktion); die Schritte teilen viele lokale Größen, eine Zerlegung bräuchte lange Parameterlisten ohne Gewinn an Lesbarkeit.
function zeichneChordDiagramm() {
  const { container, chartContainer, urkundenRecords, familienRecords, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  chartContainer.innerHTML = '';
  instanz.hoverGruppe = null;
  instanz.frozenGruppe = null;
  instanz.ausgewaehlteSehne = null;

  const familienIds = new Set(familienRecords.map((r) => r.id));
  const { matrix, recordsProZelle, unsicherProZelle } = baueGruppenMatrixProUrkunde(urkundenRecords, familienIds);

  // Akzeptanzkriterium (KORREKTURAUFTRAG, siehe docs/MODULNOTIZEN.md): aktive
  // Plausibilitätsprüfung statt bloßer Behauptung - jede EINZELNE Zelle ist
  // bauartbedingt durch die Gesamtzahl der Urkunden begrenzt (eine Urkunde
  // erhöht eine Zelle höchstens um 1); die ZEILENSUMME ist das nicht
  // zwangsläufig (Mehrgruppen-Urkunden, siehe docs/MODULNOTIZEN.md). Reine
  // console.warn()-Diagnose, kein Rendering-Abbruch - macht eine künftige
  // Regression sofort sichtbar, ohne die Darstellung zu gefährden.
  const gesamtUrkunden = urkundenRecords.length;
  matrix.forEach((zeile, i) => {
    zeile.forEach((wert, j) => {
      if (wert > gesamtUrkunden) {
        console.warn(`chordDiagramm.js: Plausibilitätsgrenze verletzt - matrix[${GRUPPEN[i].schluessel}][${GRUPPEN[j].schluessel}] = ${wert} > ${gesamtUrkunden} Urkunden insgesamt.`);
      }
    });
  });

  // KORREKTURAUFTRAG "Vier unabhängige Korrekturen", Punkt 1: die Randmarge
  // wuchs (siehe Kommentar zu RAND_MARGE unten) von 90 auf 170px, wodurch der
  // Kreis bei UNVERÄNDERTER SVG-Größe automatisch kleiner wurde (radius =
  // min(breite,hoehe)/2 - marge). Statt die Marge zurückzunehmen (die
  // Labels bräuchten den Platz weiterhin) wird stattdessen die
  // GESAMT-SVG-Größe um genau das Doppelte der Margenvergrößerung erhöht -
  // "doppelt", weil die Marge auf JEDER Seite des Kreises anfällt (min(b,h)
  // ist ein Durchmesser-Maß, die Marge wird zweimal abgezogen, einmal je
  // Seite). Damit landet radiusAussen exakt wieder beim Stand vor der
  // Label-Änderung: (min(b,h)+160)/2 - 170 = min(b,h)/2 + 80 - 170 =
  // min(b,h)/2 - 90. `.chord-chart-bereich`s `overflow:visible` (siehe
  // fuegeStyleEin() unten) lässt das dadurch über den Flex-Container hinaus
  // gewachsene `<svg>` unbeschnitten wachsen, exakt wie es die Randmarge
  // selbst schon vorher tat.
  // 2026-10-27 (Hinweis des Autors): das um GROESSEN_AUSGLEICH vergrößerte <svg> ragte über die Seite hinaus und
  // erzwang Schiebebalken. Jetzt genau so groß wie der sichtbare Platz, der Kreis mittig darin. Seitlich bleibt
  // Raum für die waagrechten Gruppen-Beschriftungen, oben und unten nur für Bogen und Verbindungslinie.
  const RAND_SEITLICH = 190;
  const RAND_VERTIKAL = 50;
  const breite = options.width || ermittleVerfuegbareBreite(chartContainer);
  const hoehe = options.height || ermittleVerfuegbareHoehe(chartContainer, { mindestHoehe: 360 });
  const radiusAussen = Math.max(Math.min(breite / 2 - RAND_SEITLICH, hoehe / 2 - RAND_VERTIKAL), 80);
  const radiusInnen = radiusAussen - 16;

  const chordLayout = d3.chord().padAngle(0.06).sortSubgroups(d3.descending)(matrix);
  const bogen = d3.arc().innerRadius(radiusInnen).outerRadius(radiusAussen);
  const sehne = d3.ribbon().radius(radiusInnen);

  const svg = d3.select(chartContainer).append('svg')
    .attr('width', breite).attr('height', hoehe)
    .attr('viewBox', `${-breite / 2} ${-hoehe / 2} ${breite} ${hoehe}`)
    .attr('role', 'group') // AUFTRAG D, Punkt 2 (axe nested-interactive): enthält bedienbare Elemente; aria-label bleibt
    .attr('aria-label', 'Soziale Gruppen: Ko-Nennungen zwischen Dynastie, Adel, Klerus und Bürgertum in den Urkunden');

  svg.append('desc').text(
    'Vier Segmente (Dynastie, Adel, Klerus, Bürgertum), Sehnen zeigen die Anzahl Urkunden, die ' +
    'mindestens eine Person aus beiden verbundenen Gruppen nennen (inklusive Urkunden mit ' +
    'mindestens zwei Personen derselben Gruppe, als Beziehung innerhalb einer Gruppe). Jede ' +
    'Urkunde trägt höchstens einmal je Gruppen-Verbindung bei. Die Gruppenzuordnung ist eine ' +
    'eigens entwickelte Heuristik, keine belegte historische Klassifikation (siehe Info-Button).'
  );

  // Klick auf die freie Fläche setzt eine eingefrorene Segment-Hervorhebung
  // zurück (dieselbe Konvention wie bumpChart.js/streamgraph.js) - liegt
  // UNTER Segmenten/Sehnen, ein Klick auf diese stoppt die
  // Ereignis-Weiterleitung und erreicht diesen Handler deshalb nie.
  svg.append('rect')
    .attr('x', -breite / 2).attr('y', -hoehe / 2).attr('width', breite).attr('height', hoehe)
    .attr('fill', 'transparent')
    .on('click', () => { instanz.frozenGruppe = null; aktualisiereHighlight(); });

  const sehnenAuswahl = svg.append('g').attr('fill-opacity', 0.65)
    .selectAll('path.chord-sehne')
    .data(chordLayout)
    .join('path')
    .attr('class', 'chord-sehne')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('d', sehne)
    .attr('fill', (d) => GRUPPEN[d.source.index].farbe)
    .attr('stroke', (d) => (zeigeUnsicherheit && unsicherProZelle[d.source.index][d.target.index] ? '#c0392b' : 'var(--surface, #fff)'))
    .attr('stroke-width', (d) => (zeigeUnsicherheit && unsicherProZelle[d.source.index][d.target.index] ? 1.5 : 0.5))
    .attr('stroke-dasharray', (d) => (zeigeUnsicherheit && unsicherProZelle[d.source.index][d.target.index] ? '4,3' : null))
    .call((a) => markiereHell(a, (d) => zeigeUnsicherheit && unsicherProZelle[d.source.index][d.target.index])) // Nachbesserung 3, Punkt 4
    .attr('aria-label', (d) => `Sehne ${baueSehnenTooltip(d).replace('\n', ', ')}, Details anzeigen`);
  instanz.sehnenAuswahl = sehnenAuswahl;

  sehnenAuswahl
    .on('mouseenter focus', function (event, d) { zeigeTooltip(baueSehnenTooltip(d), this, chartContainer); })
    .on('mouseleave blur', () => versteckeTooltip())
    .on('click', (event, d) => { event.stopPropagation(); oeffneSehnenSidebar(d, recordsProZelle); })
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); oeffneSehnenSidebar(d, recordsProZelle); }
    });

  // tabindex/role/aria-label bewusst auf dem <g> selbst (nicht auf dem
  // Kind-<path>) gesetzt - `focus`/`blur` bubblen in der Regel NICHT, ein
  // Handler auf dem übergeordneten <g> (siehe unten) würde bei Fokus auf ein
  // Kindelement sonst nie feuern. Dieselbe Konvention wie bumpChart.js'
  // `serienAuswahl` (dort ebenfalls tabindex direkt auf dem <g>, das auch
  // die mouseenter/focus-Handler trägt).
  const gruppenAuswahl = svg.append('g').selectAll('g.chord-gruppe')
    .data(chordLayout.groups)
    .join('g')
    .attr('class', 'chord-gruppe')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => `Gruppe ${GRUPPEN[d.index].label} hervorheben`);
  instanz.gruppenAuswahl = gruppenAuswahl;

  gruppenAuswahl.append('path')
    .attr('d', bogen)
    .attr('fill', (d) => GRUPPEN[d.index].farbe);

  // Punkt 2 (siehe docs/MODULNOTIZEN.md): horizontales Label ("ähnlich einer
  // Legende") statt radial gedrehtem Text - Positions-Punkt weiterhin am
  // Segment-Mittelwinkel, aber KEINE Rotation mehr auf dem `<text>` selbst.
  // Die vorherige Zahlen-Ergänzung "(X Urkunden-Verbindungen)" bleibt aus
  // Platzgründen auf den Hover-Tooltip beschränkt (siehe docs/MODULNOTIZEN.md
  //) - der On-Chart-Text zeigt nur noch den Gruppennamen.
  const LABEL_ABSTAND = 26;
  const labelPunkt = (d) => {
    const winkel = (d.startAngle + d.endAngle) / 2;
    // d3.arc()/d3.chord() zählen Winkel ab 12-Uhr-Position im Uhrzeigersinn -
    // x = sin(winkel), y = -cos(winkel) bildet das auf Bildschirmkoordinaten ab.
    const r = radiusAussen + LABEL_ABSTAND;
    return { x: r * Math.sin(winkel), y: -r * Math.cos(winkel), winkel };
  };
  const istRechteHaelfte = (d) => Math.sin((d.startAngle + d.endAngle) / 2) >= 0;

  // Kurze, segmentfarbene Verbindungslinie vom äußeren Bogenrand zum
  // Label-Ansatzpunkt (Auftrag: "mit kurzer Verbindungslinie falls nötig") -
  // macht die Zuordnung bei vier unterschiedlich großen Segmenten eindeutig,
  // auch wenn das Label durch den größeren Randabstand nicht mehr
  // unmittelbar am Bogen klebt.
  gruppenAuswahl.append('line')
    .attr('x1', (d) => { const w = (d.startAngle + d.endAngle) / 2; return radiusAussen * Math.sin(w); })
    .attr('y1', (d) => { const w = (d.startAngle + d.endAngle) / 2; return -radiusAussen * Math.cos(w); })
    .attr('x2', (d) => labelPunkt(d).x)
    .attr('y2', (d) => labelPunkt(d).y)
    .attr('stroke', (d) => GRUPPEN[d.index].farbe)
    .attr('stroke-width', 1.5);

  gruppenAuswahl.append('text')
    .attr('x', (d) => labelPunkt(d).x)
    .attr('y', (d) => labelPunkt(d).y)
    .attr('text-anchor', (d) => (istRechteHaelfte(d) ? 'start' : 'end'))
    .attr('font-size', 13)
    .attr('font-weight', 700)
    .attr('dominant-baseline', 'middle')
    .attr('fill', (d) => GRUPPEN[d.index].farbe)
    .text((d) => GRUPPEN[d.index].label);

  function schalteGruppenHervorhebung(index) {
    instanz.frozenGruppe = instanz.frozenGruppe === index ? null : index;
    aktualisiereHighlight();
  }

  gruppenAuswahl
    .on('mouseenter focus', function (event, d) {
      instanz.hoverGruppe = d.index;
      aktualisiereHighlight();
      const internAnzahl = matrix[d.index][d.index];
      const zeilen = [
        GRUPPEN[d.index].label,
        `${d.value} Urkunden-Verbindungen insgesamt`,
        `davon ${internAnzahl} intern (≥2 Personen dieser Gruppe in derselben Urkunde)`
      ];
      zeigeTooltip(zeilen.join('\n'), this, chartContainer);
    })
    .on('mouseleave blur', () => { instanz.hoverGruppe = null; aktualisiereHighlight(); versteckeTooltip(); })
    .on('click', (event, d) => { event.stopPropagation(); schalteGruppenHervorhebung(d.index); })
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); schalteGruppenHervorhebung(d.index); }
    });

  aktualisiereHighlight();
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  container.innerHTML = '';
  fuegeSidebarStyleEin(container);

  const wurzel = document.createElement('div');
  wurzel.className = 'chord-wurzel';
  const style = document.createElement('style');
  style.textContent = `
    .chord-wurzel { display: flex; flex-direction: column; height: 100%; }
    .chord-werkzeugleiste { display: flex; justify-content: flex-end; margin: 0 0 var(--space-3) 0; flex: 0 0 auto; min-height: 32px; } /* Platz für den nachgeladenen Info-Button, sonst rutscht das Diagramm nach dem Messen nach unten */
    .chord-chart-bereich { flex: 1 1 auto; overflow: hidden; display: flex; justify-content: center; }
    .chord-sehne { cursor: pointer; }
    .chord-gruppe { cursor: pointer; }
    .chord-gruppe:focus-visible, .chord-sehne:focus-visible { outline: 3px solid var(--accent); outline-offset: 1px; }
    /* KORREKTUR ("Chord-Diagramm - Fokus-Rahmen entfernen, horizontale
       Beschriftung", Punkt 1): dieselbe Lösung wie bipartiteFlowMap.js -
       unterdrückt den blauen Standard-Browser-Fokusrahmen NUR bei
       Maus-Fokus (:focus, aber nicht :focus-visible), Tastatur-Fokus
       (Tab-Navigation, :focus-visible) zeigt weiterhin den obigen,
       eigenen Rahmen. */
    .chord-gruppe:focus:not(:focus-visible), .chord-sehne:focus:not(:focus-visible) { outline: none; }
  `;
  container.append(style, wurzel);

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'chord-werkzeugleiste';
  wurzel.appendChild(werkzeugleiste);

  const chartContainer = document.createElement('div');
  chartContainer.className = 'chord-chart-bereich';
  wurzel.appendChild(chartContainer);

  // Punkt 1 (docs/MODULNOTIZEN.md): dieses Modul bekommt bewusst OHNE
  // `datenSchluessel` das gesamte geladene `{familien, personenliste,
  // urkunden}`-Objekt (siehe archivalienRegistry.js) und wählt sich hier
  // selbst die zwei benötigten Teile heraus. `personenliste` bleibt
  // ungenutzt (nur `familienbaum`/`personenliste`/`bubbleChart` brauchen sie).
  uebernehmePersonenGruppen(data.personenliste || []); // soziale_gruppe aus personenliste.csv (statt rollen.csv)
  instanz = {
    container,
    wurzel,
    chartContainer,
    urkundenRecords: data.urkunden || [],
    familienRecords: data.familien || [],
    options: { showUncertainty: true, width: null, height: null, ...options },
    infoButton: null,
    sidebar: null,
    hoverGruppe: null,
    frozenGruppe: null,
    gruppenAuswahl: null,
    sehnenAuswahl: null,
    ausgewaehlteSehne: null
  };
  infotextFuerModul('chordDiagramm').then((cfg) => {
    if (!instanz || !cfg || !werkzeugleiste.isConnected) return;
    instanz.infoButton = erzeugeInfoButton(werkzeugleiste, cfg);
  });
  instanz.sidebar = baueSidebarGeruest(container);
  const schliesseSehnenSidebar = () => {
    schliesseSidebar(instanz.sidebar, chartContainer);
    instanz.ausgewaehlteSehne = null;
    aktualisiereHighlight();
  };
  instanz.sidebar.schliessenBtn.addEventListener('click', schliesseSehnenSidebar);
  // Wunsch des Autors (2026-10-28): Klick auf eine leere Stelle schließt die offene Sidebar. Sehnen und Segmente
  // stoppen ihren Klick (stopPropagation), er kommt hier also nur von der freien Fläche an.
  chartContainer.addEventListener('click', () => {
    if (instanz?.sidebar.sidebar.classList.contains('offen')) schliesseSehnenSidebar();
  });

  zeichneChordDiagramm();
  // Die Leisten über dem Diagramm (Ansichten-Leiste, „σ Unsicherheiten“) entstehen teils erst nach render() und
  // schieben es nach unten. Rutscht es dadurch an eine andere Stelle, wird es dort neu vermessen (2026-10-27).
  // Beobachtet werden Änderungen im Seiteninhalt, weil die Leisten dabei ersetzt und nicht nur vergrößert werden.
  let obenBeimZeichnen = chartContainer.getBoundingClientRect().top;
  let geplant = false;
  instanz.lageBeobachter = new MutationObserver(() => {
    if (geplant) return;
    geplant = true;
    setTimeout(() => {
      geplant = false;
      if (!instanz || instanz.chartContainer !== chartContainer) return;
      const oben = chartContainer.getBoundingClientRect().top;
      if (Math.abs(oben - obenBeimZeichnen) <= 1) return;
      obenBeimZeichnen = oben;
      zeichneChordDiagramm();
    }, 0);
  });
  const appInhalt = document.getElementById('app-content');
  if (appInhalt) instanz.lageBeobachter.observe(appInhalt, { childList: true, subtree: true });
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneChordDiagramm();
}

export function destroy() {
  if (!instanz) return;
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.lageBeobachter?.disconnect();
  instanz.container.innerHTML = '';
  instanz = null;
}
