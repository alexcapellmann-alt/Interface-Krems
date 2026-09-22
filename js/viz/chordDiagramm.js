// js/viz/chordDiagramm.js
// AUFTRAG "Chord-Diagramm – soziale Gruppen (Dynastie/Adel/Klerus/Bürger),
// Umzug nach Personen": Rekonstruktion der Alpha-Funktionalität - komplette
// inhaltliche Neukonzeption (nicht nur Registry-Umzug wie beim Personen-/
// Bürgerbuch-Vorläufer-Präzedenzfall): statt eines Chord-Diagramms der
// Top-20-EINZELPERSONEN (bisherige Fassung, siehe Git-Historie) zeigt dieses
// Modul jetzt vier SOZIALE GRUPPEN als Segmente - Dynastie/Adel/Klerus/
// Bürgertum. Datenquelle bleibt urkunden.csv PLUS familien.csv (nur für den
// Dynastie-Abgleich, siehe Punkt 1) - der Umzug nach `personen.ansichten`
// betrifft daher nur die REGISTRY-Zuordnung, nicht die Datenquelle selbst
// (siehe archivalienRegistry.js' Kommentar zu `datenDatei`/fehlendem
// `datenSchluessel`: dieses Modul bekommt das komplette geladene
// `{familien, personenliste, urkunden}`-Objekt und wählt sich `urkunden`/
// `familien` selbst heraus, `personenliste` bleibt ungenutzt).
//
// KORREKTURAUFTRAG "Chord-Diagramm – Zählung pro Urkunde statt pro
// Personenpaar": Sehnenstärke = Anzahl gemeinsamer Nennungen zwischen
// PERSONEN(-PAAREN) zweier Gruppen (ursprüngliche Fassung, siehe Git-
// Historie) ERSETZT durch: Sehnenstärke = Anzahl URKUNDEN, die mindestens
// eine Person aus Gruppe i UND mindestens eine Person aus Gruppe j
// enthalten (Diagonale: mindestens ZWEI Personen aus derselben Gruppe) -
// JEDE Urkunde trägt dadurch HÖCHSTENS EINMAL zu jeder Gruppen-Gruppen-
// Zelle bei, unabhängig davon, wie viele Personen/Personenpaare der
// jeweiligen Gruppen tatsächlich darin vorkommen (Root Cause der vorherigen
// Verzerrung: eine Urkunde mit k gemeinsam genannten Personen erzeugt
// kombinatorisch C(k,2) Personenpaare, jedes davon zählte einzeln - eine
// einzelne vielpersonige Urkunde trug dadurch überproportional viele
// "Verbindungen" bei, siehe Diagnose im Chat). Umgesetzt in
// baueGruppenMatrixProUrkunde() unten - ersetzt sowohl die alte
// baueGruppenMatrix() (arbeitete auf urkundenPersonen.js'
// PERSONENPAAR-Liste `paare`) als auch die zugehörige
// ermittleGruppeProKnoten()-Hilfsfunktion (beide entfallen ersatzlos,
// urkundenPersonen.js' baueKoNennungsNetzwerk() wird hierfür nicht mehr
// gebraucht - stattdessen direkt `ermittlePersonenDerUrkunde()` pro Urkunde).
// Nicht-Ziel (Auftrag, wörtlich): KEINE Änderung an der
// Gruppenzuordnungs-Logik selbst (ermittleGruppe() unverändert).
//
// Plausibilitätsgrenze (Akzeptanzkriterium): JEDE Matrixzelle matrix[i][j]
// ist durch die neue Zählweise BAUARTBEDINGT durch 1069 (Gesamtzahl der
// Urkunden) begrenzt - jede Urkunde erhöht eine gegebene Zelle um höchstens
// 1. Die ZEILENSUMME (d.value, bestimmt die Segment-Winkelgröße) ist
// dagegen NICHT automatisch auf 1069 begrenzt: eine einzelne Urkunde mit
// Personen aus 3 oder 4 verschiedenen Gruppen trägt zu MEHREREN Zellen
// DERSELBEN Zeile gleichzeitig bei (z. B. Dynastie+Adel+Bürger in einer
// Urkunde erhöht sowohl matrix[dynastie][adel] als auch
// matrix[dynastie][buerger] um je 1 - macht 2 Beiträge zur Dynastie-Zeile
// aus EINER Urkunde). Live geprüft (siehe Selbstauskunft im Chat): nur 13
// von 1069 Urkunden betreffen 3 oder mehr Gruppen gleichzeitig (12 mit drei,
// 1 mit allen vier) - dieser Effekt bleibt dadurch klein, alle vier
// Zeilensummen liegen in der Praxis deutlich unter 1069 (live bestätigt).
//
// Punkt 1 (Gruppenzuordnungs-Regel, EXAKT in der vorgegebenen Priorität):
// 1. Dynastie: `personen_id` kommt in familien.csv' `id`-Spalte vor (beide
//    nutzen dieselbe Slug-Konvention, z. B. "albrecht_ii" - live gegen die
//    CSV geprüft: 448 von 2277 Personennennungen in urkunden.csv treffen
//    exakt eine von 80 familien.csv-IDs, deckt sich exakt mit dem im Auftrag
//    vorab ermittelten Wert, siehe Selbstauskunft im Chat).
// 2. Klerus: GANZES WORT (nicht Teilstring - Auftrag, wörtlich: "nicht als
//    Teilstring von 'Priorin' fälschlich 'Prior' zusätzlich zählen") aus
//    KLERUS_WOERTER, Position im Namen beliebig.
// 3. Adel: GANZES WORT aus ADEL_TITEL_WOERTER ODER eine der recherchierten
//    Adelsfamiliennamen-Varianten (ADEL_FAMILIEN_VARIANTEN) als Teilstring
//    des Namens (bewusst KEIN Wortgrenzen-Zwang hier, anders als bei den
//    Titelwörtern: das sind seltene, unverwechselbare Eigennamen mit
//    mehreren Schreibvarianten - eine Wortgrenzen-Prüfung würde bei
//    abweichenden Flexionsformen/Zusammensetzungen eher Treffer verpassen
//    als fälschlich welche erzeugen, anders als bei den generischen
//    Klerus-/Adelstitel-WÖRTERN, die echte Teilstrings anderer Wörter sein
//    können).
// 4. Bürger: alles Übrige (Standardfall, inkl. aller "von X"-Namen ohne
//    Titel/Familienzuordnung).
// WICHTIG (Punkt 1, wörtlich): eine eigene, NICHT-quellenbasierte Heuristik,
// keine belegte historische Klassifikation - im Info-Text unmissverständlich
// benannt (STREAMGRAPH_INFO_TEXT unten, wörtlich aus dem Auftrag übernommen).
//
// ermittleGruppenGroessen() (unten) klassifiziert JEDE EINZELNE
// Personennennung roh aus den Records (Auftrag Punkt 1, wörtlich: "Für JEDE
// Personennennung") - liefert die für das Akzeptanzkriterium/die
// Selbstauskunft maßgebliche Gruppengröße (448/64/120/1645 Nennungen). Diese
// Funktion bleibt vom KORREKTURAUFTRAG oben UNBERÜHRT (betrifft nur die
// Matrix-Zählweise, nicht die Gruppenzuordnung/-größe selbst) - wird aber
// weiterhin nirgends aufgerufen (bereits in der vorherigen Diagnose im Chat
// als toter Code geflaggt; hier bewusst NICHT verdrahtet, da das außerhalb
// des Korrekturauftrags-Scopes läge, siehe Selbstauskunft).
//
// Punkt 3 (Interaktion): Hover/Klick-Hervorhebung nach demselben etablierten
// Muster wie in sankey.js/bumpChart.js/streamgraph.js (hoverGruppe temporär,
// frozenGruppe per Klick eingefroren, aktualisiereHighlight() zentral, Klick
// auf freie Fläche/Escape setzt zurück) - hier auf die vier Gruppen-Segmente
// angewendet: Hover/Freeze eines Segments hebt alle davon ausgehenden Sehnen
// hervor (inkl. der Selbstschleife bei Hover des eigenen Segments), übrige
// Sehnen blenden ab. Klick auf eine SEHNE (unabhängig vom Segment-
// Hervorhebungszustand) öffnet die bereits bestehende, Urkunden-spezifische
// Sidebar (js/utils/sidebar.js' zeigeUrkundenSidebar()/baueUrkundenDetailInhalt()
// - hier bewusst VOLL wiederverwendet, nicht wie in vermoegensschichtung.js
// nur das generische Gerüst: die zugrundeliegenden Datensätze SIND echte
// Urkunden-Records mit Signatur/Regest/Personen-Feld, die Urkunden-
// spezifischen Bausteine passen deshalb 1:1, ohne eigene Listendarstellung
// nachzubauen).
//
// KLEINAUFTRAG "Chord-Diagramm – Fokus-Rahmen entfernen, horizontale
// Beschriftung":
//
// Punkt 1 (Fokus-Rahmen bei Klick entfernen): dieselbe Lösung wie bereits
// in bipartiteFlowMap.js umgesetzt (siehe dortiger Dateikopf-Kommentar) -
// `:focus:not(:focus-visible) { outline: none; }` auf `.chord-gruppe`/
// `.chord-sehne` (in fuegeStyleEin() der Werkzeugleiste, unten) ergänzt.
// Die bereits bestehende `:focus-visible`-Regel (eigener 3px-Rahmen,
// unverändert) bleibt für Tastatur-Fokus (Tab-Navigation) erhalten - nur
// der zusätzliche Browser-Standard-Rahmen bei reinem Mausklick verschwindet.
//
// Punkt 2 (horizontale Beschriftung statt radial gedrehter Labels): die
// Text-Transformation `rotate(...) translate(...) rotate(180)` (drehte das
// Label MIT der Kreiskrümmung, dadurch bei den meisten Winkeln schräg/
// senkrecht lesbar) entfällt ersatzlos - das `<text>`-Element bekommt jetzt
// nur noch eine reine Positions-Translation (KEINE Rotation) auf einen
// Punkt bei `radiusAussen + LABEL_ABSTAND` entlang desselben Mittelwinkels
// wie zuvor, `text-anchor` weiterhin nach Kreishälfte (links/rechts)
// gewählt, damit der Text vom Segment WEG statt IN es hinein wächst -
// exakt wie eine Legende neben dem Diagramm, nicht mehr an die
// Kreisform gebunden. Zusätzlich eine kurze, segmentfarbene
// Verbindungslinie vom äußeren Bogenrand zum Label-Ansatzpunkt (Auftrag:
// "mit kurzer Verbindungslinie falls nötig") - bei vier unterschiedlich
// großen Segmenten (Bürgertum dominiert die Fläche, die anderen drei sind
// vergleichsweise schmal) macht das JEDERZEIT eindeutig sichtbar, welches
// Label zu welchem Segment gehört, auch wenn der Label-Ansatzpunkt durch
// den größeren Label-Abstand nicht mehr unmittelbar am Bogenrand klebt.
// Beschriftungstext GEKÜRZT auf den reinen Gruppennamen (die zuvor
// ergänzte "(X Urkunden-Verbindungen)"-Zahl, siehe Korrekturauftrag "damit
// klar ist, was gezählt wird" oben, entfällt NUR aus dem On-Chart-Label -
// die Information bleibt vollständig über den bestehenden Hover-Tooltip
// erhalten, der ohnehin bereits mehr Detail zeigt, gesamt UND intern
// aufgeschlüsselt): ein horizontales Label mit der vollen, langen
// Zahlformulierung hätte bei den Bild-Rändern deutlich mehr Platz gebraucht
// als eine radiale Schräglage - Kürzung auf den Gruppennamen hält den
// Platzbedarf überschaubar (Auftrag deutet mit "ähnlich einer Legende"
// ohnehin auf kurze Legenden-Beschriftungen hin, nicht auf lange
// Datenlabels). `radiusAussen`-Randmarge (`breite`/`hoehe` abzüglich
// Durchmesser) von 90 auf 170px erhöht, damit auch das längste Label
// ("Dynastie (Habsburger)") bei 13px/fett vollständig innerhalb des
// SVG-Viewports Platz findet (das äußere `<svg>` selbst clippt am eigenen
// Viewport, `overflow: visible` auf dem umschließenden Div-Container reicht
// dafür NICHT aus).

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { baueSidebarGeruest, fuegeSidebarStyleEin, zeigeUrkundenSidebar, schliesseSidebar } from '../utils/sidebar.js';
import { ermittlePersonenDerUrkunde } from '../utils/urkundenPersonen.js';

// Punkt 1.2 - Wortgrenzen-Prüfung (siehe Dateikopf-Kommentar).
const KLERUS_WOERTER = [
  'Bischof', 'Erzbischof', 'Abt', 'Äbtissin', 'Dechant', 'Propst', 'Pfarrer', 'Kaplan',
  'Kanoniker', 'Domherr', 'Prior', 'Priorin', 'Guardian', 'Kardinal', 'Weihbischof',
  'Offizial', 'Vikar', 'Chorherr', 'Stiftsherr', 'Pater', 'Frater', 'Konventual', 'Mönch', 'Nonne'
];

// Punkt 1.3a - ebenfalls wortgrenzen-geprüft.
const ADEL_TITEL_WOERTER = [
  'Herzog', 'Herzogin', 'Graf', 'Gräfin', 'Ritter', 'Freiherr', 'Freifrau', 'Markgraf',
  'Markgräfin', 'Fürst', 'Fürstin', 'Erzherzog', 'Erzherzogin', 'Baron', 'Junker',
  'Landgraf', 'Pfalzgraf', 'Burggraf', 'Edler', 'Edle'
];

// Punkt 1.3b - je Familie alle im Auftrag genannten Schreibvarianten, als
// Teilstring geprüft (siehe Dateikopf-Kommentar zur bewussten Abweichung von
// der Wortgrenzen-Regel bei diesen Eigennamen).
const ADEL_FAMILIEN_VARIANTEN = [
  ['Wallsee'], ['Eytzing', 'Eytzingen', 'Eyzing'], ['Grafenegg'],
  ['Puchhaim', 'Puchheim', 'Buchhaim'], ['Maissau'], ['Roggendorf'], ['Hardegg'], ['Zelking'],
  ['Volkenstorf', 'Volkensdorf', 'Volkensdorff', 'Volkerstorff', 'Volkestorf'], ['Sternberg'],
  ['Cunstat'], ['Podiebrad'], ['Starhemberg', 'Starchenberger'], ['Schaunberg'], ['Chuenring'],
  ['Liechtenstein'], ['Eberstorff'], ['Brandis'], ['Zedwitz'], ['Pottendorf', 'Potendorf'],
  ['Dachsperg', 'Dachsberg'], ['Rechberg'], ['Plankenstein'], ['Welz']
];

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
  { schluessel: 'dynastie', label: 'Dynastie (Habsburger)', farbe: '#8b1a2b' },
  { schluessel: 'adel', label: 'Adel', farbe: '#1f4e8c' },
  { schluessel: 'klerus', label: 'Klerus', farbe: '#5b2d82' },
  { schluessel: 'buerger', label: 'Bürgertum', farbe: '#2f7a45' }
];

const CHORD_INFO_TEXT = 'Dieses Diagramm zeigt, wie oft Personen aus vier sozialen Gruppen – Dynastie (Habsburger), Adel, Klerus und Bürgertum – gemeinsam in Urkunden genannt werden. Die Gruppenzuordnung basiert auf einer eigens entwickelten Heuristik (erkennbare Titelwörter im Namen, Abgleich mit der Habsburger-Stammbaumdatei, sowie eine recherchierte Liste bekannter Adelsfamilien) – sie ist keine belegte historische Klassifikation der einzelnen Personen, sondern eine Näherung. Personen ohne erkennbaren Titel oder bekannten Adelsnamen werden als „Bürger" eingeordnet, was echten, nicht erkennbaren niederen Adel unterschätzen kann.';

let instanz = null; // { container, wurzel, chartContainer, familienRecords, urkundenRecords, options, infoButton, sidebar, hoverGruppe, frozenGruppe, gruppenAuswahl, sehnenAuswahl, ausgewaehlteSehne } – eine aktive Ansicht pro Modul-Ladung

function woerterDesNamens(name) {
  return (String(name || '').match(/\p{L}+/gu) || []);
}

function enthaeltGanzesWort(name, liste) {
  const woerter = woerterDesNamens(name).map((w) => w.toLowerCase());
  return liste.some((wort) => woerter.includes(wort.toLowerCase()));
}

function enthaeltFamilienname(name) {
  const lower = String(name || '').toLowerCase();
  return ADEL_FAMILIEN_VARIANTEN.some((varianten) => varianten.some((v) => lower.includes(v.toLowerCase())));
}

// Punkt 1, EXAKT in der vorgegebenen Priorität (siehe Dateikopf-Kommentar).
// Exportiert (siehe Auftrag "Bipartite Flow Map – ..." oben) - Wiederver-
// wendung statt Neuimplementierung in bipartiteFlowMap.js.
export function ermittleGruppe(name, personenId, familienIds) {
  if (personenId && familienIds.has(personenId)) return 'dynastie';
  if (enthaeltGanzesWort(name, KLERUS_WOERTER)) return 'klerus';
  if (enthaeltGanzesWort(name, ADEL_TITEL_WOERTER) || enthaeltFamilienname(name)) return 'adel';
  return 'buerger';
}

// Ebene (a) - siehe Dateikopf-Kommentar: klassifiziert JEDE Personennennung
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
// Dateikopf-Kommentar): ermittelt je Urkunde, wie viele EINDEUTIGE Personen
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
// Dateikopf-Kommentar "KORREKTURAUFTRAG"): jede Urkunde erhöht JEDE
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
// siehe Dateikopf-Kommentar) - `d.source.value` zählt jetzt Urkunden, keine
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

function zeichneChordDiagramm() {
  const { container, chartContainer, urkundenRecords, familienRecords, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  chartContainer.innerHTML = '';
  instanz.hoverGruppe = null;
  instanz.frozenGruppe = null;
  instanz.ausgewaehlteSehne = null;

  const familienIds = new Set(familienRecords.map((r) => r.id));
  const { matrix, recordsProZelle, unsicherProZelle } = baueGruppenMatrixProUrkunde(urkundenRecords, familienIds);

  // Akzeptanzkriterium (KORREKTURAUFTRAG, siehe Dateikopf-Kommentar): aktive
  // Plausibilitätsprüfung statt bloßer Behauptung - jede EINZELNE Zelle ist
  // bauartbedingt durch die Gesamtzahl der Urkunden begrenzt (eine Urkunde
  // erhöht eine Zelle höchstens um 1); die ZEILENSUMME ist das nicht
  // zwangsläufig (Mehrgruppen-Urkunden, siehe Dateikopf-Kommentar). Reine
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

  const breite = options.width || container.clientWidth || 700;
  const hoehe = options.height || Math.max(container.clientHeight || 700, 500);
  // Punkt 2 (siehe Dateikopf-Kommentar): Randmarge von 90 auf 170px erhöht -
  // Platz für die jetzt horizontalen (nicht mehr radial gedrehten) Labels.
  const radiusAussen = Math.min(breite, hoehe) / 2 - 170;
  const radiusInnen = radiusAussen - 16;

  const chordLayout = d3.chord().padAngle(0.06).sortSubgroups(d3.descending)(matrix);
  const bogen = d3.arc().innerRadius(radiusInnen).outerRadius(radiusAussen);
  const sehne = d3.ribbon().radius(radiusInnen);

  const svg = d3.select(chartContainer).append('svg')
    .attr('width', breite).attr('height', hoehe)
    .attr('viewBox', `${-breite / 2} ${-hoehe / 2} ${breite} ${hoehe}`)
    .attr('role', 'img')
    .attr('aria-label', 'Chord-Diagramm: Ko-Nennungen zwischen den sozialen Gruppen Dynastie, Adel, Klerus und Bürgertum');

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

  // Punkt 2 (siehe Dateikopf-Kommentar): horizontales Label ("ähnlich einer
  // Legende") statt radial gedrehtem Text - Positions-Punkt weiterhin am
  // Segment-Mittelwinkel, aber KEINE Rotation mehr auf dem `<text>` selbst.
  // Die vorherige Zahlen-Ergänzung "(X Urkunden-Verbindungen)" bleibt aus
  // Platzgründen auf den Hover-Tooltip beschränkt (siehe Dateikopf-
  // Kommentar) - der On-Chart-Text zeigt nur noch den Gruppennamen.
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
    .chord-werkzeugleiste { display: flex; justify-content: flex-end; margin: 0 0 var(--space-3) 0; flex: 0 0 auto; }
    .chord-chart-bereich { flex: 1 1 auto; overflow: visible; }
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

  // Punkt 1 (Dateikopf-Kommentar): dieses Modul bekommt bewusst OHNE
  // `datenSchluessel` das gesamte geladene `{familien, personenliste,
  // urkunden}`-Objekt (siehe archivalienRegistry.js) und wählt sich hier
  // selbst die zwei benötigten Teile heraus. `personenliste` bleibt
  // ungenutzt (nur `familienbaum`/`personenliste`/`bubbleChart` brauchen sie).
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
  instanz.infoButton = erzeugeInfoButton(werkzeugleiste, { text: CHORD_INFO_TEXT, ariaLabel: 'Erklärung zum Chord-Diagramm' });
  instanz.sidebar = baueSidebarGeruest(container);
  instanz.sidebar.schliessenBtn.addEventListener('click', () => {
    schliesseSidebar(instanz.sidebar, chartContainer);
    instanz.ausgewaehlteSehne = null;
    aktualisiereHighlight();
  });

  zeichneChordDiagramm();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneChordDiagramm();
}

export function destroy() {
  if (!instanz) return;
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
