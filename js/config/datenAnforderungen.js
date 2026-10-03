// js/config/datenAnforderungen.js
// AUFTRAG B2 (Prüfbericht Punkt 3, Freigabe Phase 1 vom 2026-10-03): welche
// Dateien und Pflichtspalten jede Ansicht braucht. Technisches Verzeichnis wie
// archivalienRegistry.js - keine archivarischen Inhalte, nur Dateipfade und
// Spaltennamen. Die Liste ist GEMESSEN (jede Spalte einzeln entfernt, siehe
// PROJEKTLOG Eintrag 57), nicht aus SCHEMA.md übernommen: Pflicht ist eine
// Spalte nur, wenn ohne sie mindestens eine Ansicht inhaltlich nichts zeigt.
//
// Je Ansicht:
// - `dateien`: Hauptdateien mit ihren Pflichtspalten. Fehlt eine Hauptdatei,
//   ist sie leer, unlesbar oder fehlt eine Pflichtspalte, wird die Ansicht
//   NICHT gezeichnet (Hinweisbalken statt leerer Fläche oder Absturz).
// - `neben`: Nebendateien (Verweise, Nachschlagen). Ein Problem dort ergibt
//   nur einen Hinweisbalken, die Ansicht wird trotzdem gezeichnet.
// - `teilpflicht`: Pflichtspalten einer umschaltbaren Teildarstellung - ein
//   Fehlen sperrt nicht die ganze Ansicht, sondern ergibt einen Hinweis.
// - `ausblenden`: Datei, bei deren Fehlen/Leere die Ansicht aus Navigation,
//   Galerie und Flyouts verschwindet (Freigabe: Ansichten, die ausschließlich
//   diese Datei nutzen, plus die Personenliste).

const URKUNDEN = 'data/urkunden.csv';
const ORTE = 'data/orte.csv';
const BESTAND = 'data/bestandsverzeichnis.csv';
const BUERGERBUCH = 'data/buergerbuch.csv';
const INVENTARE = 'data/verlassenschaftsinventare.csv';
const FAMILIEN = 'data/familien.csv';
const PERSONENLISTE = 'data/personenliste.csv';
const FUEHRUNGEN = 'data/fuehrungen.csv';
const LITERATUR = 'data/literatur.csv';
const STARTSEITE = 'data/startseite.csv';
const UEBER = 'data/ueber.csv';
const ARCHIV = 'data/archiv.csv';

const JAHR = ['jahr']; // Grenzfall G1: ohne `jahr` landen alle Urkunden in "undatiert"
const VERMOEGENSPROFIL = ['Realvermoegen_fl', 'Gesamtvermoegen_fl', 'Anteil Grundstuecke am RV (%)',
  'Anteil Bargeld am RV (%)', 'Anteil Wertgegenstaende am RV (%)', 'Anteil Sonderbestand am RV (%)'];

const nurBestand = (pflicht = []) => ({ dateien: { [BESTAND]: pflicht }, ausblenden: BESTAND });
const nurUrkunden = (pflicht = []) => ({ dateien: { [URKUNDEN]: pflicht }, ausblenden: URKUNDEN });
const nurBuergerbuch = (pflicht = []) => ({ dateien: { [BUERGERBUCH]: pflicht }, ausblenden: BUERGERBUCH });
const nurInventare = (pflicht = []) => ({ dateien: { [INVENTARE]: pflicht }, ausblenden: INVENTARE });

export const ANSICHT_ANFORDERUNGEN = {
  // Bestand
  treemap: nurBestand(),
  sunburst: nurBestand(),
  icicle: nurBestand(),
  circlePacking: nurBestand(),
  ganttDiagramm: nurBestand(['zeitraum_von', 'zeitraum_bis']), // Grenzfall G2
  // Urkunden
  regestenKachelraster: nurUrkunden(),
  zeitachse: nurUrkunden(JAHR),
  kalenderHeatmap: nurUrkunden(JAHR),
  dotPlot: nurUrkunden(JAHR),
  swimlanes: nurUrkunden(JAHR),
  ridgeline: nurUrkunden(JAHR),
  horizonChart: nurUrkunden([...JAHR, 'kategorien']),
  marimekko: nurUrkunden(),
  alluvial: nurUrkunden(),
  adjazenzmatrix: nurUrkunden(['personen']),
  arcDiagramm: nurUrkunden(['personen']),
  sankey: nurUrkunden(['kategorien', 'orte']), // Freigabe Punkt 7: fängt das NaN im Sankey ab
  wortwolke: nurUrkunden(['regest']),
  // Bürgerbuch
  trellis: nurBuergerbuch(['Datum', 'Wirtschaftssektor']),
  bumpChart: nurBuergerbuch(['Datum']),
  personennetzwerk: nurBuergerbuch(['Name', 'buergen_id']),
  streamgraph: nurBuergerbuch(),
  // Verlassenschaften
  parallelKoordinaten: {
    dateien: { [INVENTARE]: VERMOEGENSPROFIL },
    // Aus dem Code abgeleitet, nicht gemessen (parallelKoordinaten.js, Achsen des Schuldenprofils)
    teilpflicht: [{ datei: INVENTARE, spalten: ['Anteil SchzG an Aktiva (%)', 'Anteil SchvG an Aktiva (%)'], darstellung: 'Forderungs-/Schuldenprofil' }],
    ausblenden: INVENTARE
  },
  korrelationsmatrix: nurInventare(),
  vermoegensschichtung: nurInventare(['Jahrzehnt']),
  marimekkoVerlassenschaften: nurInventare(),
  // Personen
  personenliste: { dateien: { [PERSONENLISTE]: [] }, neben: { [URKUNDEN]: [], [BUERGERBUCH]: [], [INVENTARE]: [] }, ausblenden: PERSONENLISTE },
  bubbleChart: { dateien: { [PERSONENLISTE]: [] }, ausblenden: PERSONENLISTE },
  familienbaum: { dateien: { [FAMILIEN]: ['familie', 'id'] }, ausblenden: FAMILIEN }, // `id`: Grenzfall G4
  chordDiagramm: { dateien: { [URKUNDEN]: [] }, neben: { [FAMILIEN]: [] } },
  // Orte (mehrere Dateien: nie ausgeblendet, Balken)
  karte: { dateien: { [URKUNDEN]: ['orte'], [ORTE]: ['orte', 'lat', 'lon'] } },
  verbindungskarte: { dateien: { [URKUNDEN]: ['orte'], [ORTE]: ['orte', 'lat', 'lon'] } },
  bipartiteFlowMap: { dateien: { [URKUNDEN]: [], [ORTE]: ['orte', 'lat', 'lon'] }, neben: { [FAMILIEN]: [] } },
  // Seiten
  startseite: { dateien: { [STARTSEITE]: ['typ', 'sichtbar'] }, neben: { [ARCHIV]: ['schluessel', 'wert'] } }, // archiv: Grenzfall G5
  ueber: { dateien: { [UEBER]: ['text', 'sichtbar'] }, neben: { [ARCHIV]: ['schluessel', 'wert'] }, ausblenden: UEBER },
  literatur: { dateien: { [LITERATUR]: ['zitation'] }, ausblenden: LITERATUR },
  fuehrungenUebersicht: { dateien: { [FUEHRUNGEN]: ['fuehrung_id'] }, ausblenden: FUEHRUNGEN },
  fuehrungStation: { dateien: { [FUEHRUNGEN]: ['fuehrung_id', 'station_nr', 'text'] }, ausblenden: FUEHRUNGEN },
  fuehrungAbschluss: { dateien: { [FUEHRUNGEN]: ['fuehrung_id'] }, neben: { [LITERATUR]: [] }, ausblenden: FUEHRUNGEN }
};

// Schlüssel- bzw. bekannte Spalten je Datei: Grundlage der Regel "keine
// bekannte Spalte erkannt" (Freigabe Punkt 6). Je Datei zusammen mit den
// Pflichtspalten mindestens ZWEI Spalten, damit das Fehlen einer einzelnen
// Spalte nicht als falsches Trennzeichen gedeutet wird. Enthält die Kopfzeile weder eine dieser
// Spalten noch eine Pflichtspalte, ist die Datei vermutlich mit falschem
// Trennzeichen gespeichert (die ganze Kopfzeile wird dann EINE Spalte).
export const SCHLUESSELSPALTEN = {
  [URKUNDEN]: ['signatur'],
  [ORTE]: ['orte_id'],
  [BESTAND]: ['kuerzel', 'name'],
  [BUERGERBUCH]: ['id'],
  [INVENTARE]: ['id'],
  [FAMILIEN]: ['id'],
  // Zwei bekannte Spalten: mit nur `personen_id` hätte schon deren Fehlen
  // fälschlich "falsches Trennzeichen" gemeldet (Nachkorrektur im Endlauf B2).
  [PERSONENLISTE]: ['personen_id', 'schreibweisen'],
  [FUEHRUNGEN]: ['fuehrung_id'],
  [LITERATUR]: ['literatur_id'],
  [STARTSEITE]: ['block_id'],
  [UEBER]: ['block_id'],
  [ARCHIV]: ['schluessel']
};

// Folge-Satz für Probleme in Nebendateien, wenn der allgemeine Satz zu
// unbestimmt wäre (Kerndatei archiv.csv, Freigabe Punkt 3).
export const NEBENDATEI_FOLGE = {
  [ARCHIV]: 'Name, Logo und Kontaktangaben des Archivs können deshalb nicht angezeigt werden.'
};

// Dateien, die die Hintergrund-Prüfung nach dem ersten Bildaufbau lädt
// (alle `ausblenden`-Dateien) - siehe js/core/datenVerfuegbarkeit.js.
export const AUSBLENDE_DATEIEN = [...new Set(Object.values(ANSICHT_ANFORDERUNGEN).map((a) => a.ausblenden).filter(Boolean))];
