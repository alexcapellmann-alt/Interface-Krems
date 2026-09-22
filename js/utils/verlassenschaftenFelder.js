// js/utils/verlassenschaftenFelder.js
// Gemeinsame Definition der acht numerischen Vermögens-Kennzahlen aus
// data/verlassenschaftsinventare.csv - von parallelKoordinaten.js UND
// korrelationsmatrix.js genutzt (beide im AUFTRAG "Parallelkoordinaten &
// Korrelationsmatrix → Verlassenschaften" von urkunden.csv hierher
// umgezogen, siehe deren Dateikopf-Kommentare). Eine einzige Stelle statt
// zweier paralleler Feld-/Skalentyp-Definitionen - dieselbe Begründung wie
// bei js/utils/kategorieFarben.js/urkundenOrte.js (Abschnitt 13, DRY).
//
// dataLoader.js normalisiert keine Spaltennamen (siehe dortiger Dateikopf-
// Kommentar) - die Schlüssel unten (`feld`) sind deshalb wörtlich die
// CSV-Spaltenüberschriften inkl. Leerzeichen/Klammern/Prozentzeichen.
//
// Feldnamen-Herkunft (Abschluss-Anforderung Punkt 2, "volle Feldnamen"):
// - `label`: ausgeschriebene Achsen-/Spaltenbeschriftung für die
//   Korrelationsmatrix (Punkt 2) und als Tooltip-Titel in den
//   Parallelkoordinaten (Punkt 1). "RV" wurde zu "Realvermögen" aufgelöst -
//   das ist KEINE Vermutung, sondern direkt aus der eigenen CSV-Kopfzeile
//   abgeleitet (die Spalte `Realvermoegen_fl` schreibt denselben Begriff
//   bereits explizit aus).
// - `SchzG`/`SchvG` bleiben BEWUSST unaufgelöst (Auftrag, wörtlich: "falls
//   die volle Bedeutung nicht sicher bekannt ist, bitte Abkürzung
//   beibehalten statt zu raten, und zurückmelden") - siehe Selbstauskunft im
//   Chat: die volle Bedeutung dieser beiden Kürzel ist nicht zweifelsfrei
//   bekannt (vermutlich "Schulden zu/von Gläubigern" o.ä., aber nicht
//   sicher belegt), daher hier nicht geraten.
// - `kurzLabel`: kompakte Achsenbeschriftung für die Parallelkoordinaten
//   (Punkt 1 hat dort keine Vollname-Anforderung, acht Achsen nebeneinander
//   brauchen aber kurze Titel, um nicht zu überlappen) - reine
//   Platzsparmaßnahme der Darstellung, keine andere Bedeutung als `label`.
// - `skalentyp`: 'symlog' NUR bei `gesamtvermoegen` (mind. 20 von 67
//   Personen mit negativem Gesamtvermögen, siehe Auftrag) - eine reine
//   log-Skala würde bei negativen/Null-Werten versagen. Alle anderen sieben
//   Felder sind entweder durchgehend positiv (Realvermögen, alle sechs
//   Anteilswerte in %) oder durch die Natur eines Anteilswerts nach unten
//   durch 0 begrenzt - lineare Skala genügt dort.

export function parseKommaZahl(rohwert) {
  if (rohwert === undefined || rohwert === null || String(rohwert).trim() === '') return null;
  const zahl = parseFloat(String(rohwert).trim().replace(',', '.'));
  return Number.isFinite(zahl) ? zahl : null;
}

export const VERMOEGENS_VARIABLEN = [
  { schluessel: 'realvermoegen', feld: 'Realvermoegen_fl', label: 'Realvermögen (fl)', kurzLabel: 'Realvermögen', skalentyp: 'linear' },
  { schluessel: 'gesamtvermoegen', feld: 'Gesamtvermoegen_fl', label: 'Gesamtvermögen (fl)', kurzLabel: 'Gesamtvermögen', skalentyp: 'symlog' },
  { schluessel: 'schzg', feld: 'Anteil SchzG an Aktiva (%)', label: 'Anteil SchzG an Aktiva (%)', kurzLabel: 'SchzG (%)', skalentyp: 'linear' },
  { schluessel: 'schvg', feld: 'Anteil SchvG an Aktiva (%)', label: 'Anteil SchvG an Aktiva (%)', kurzLabel: 'SchvG (%)', skalentyp: 'linear' },
  { schluessel: 'grundstuecke', feld: 'Anteil Grundstuecke am RV (%)', label: 'Anteil Grundstücke am Realvermögen (%)', kurzLabel: 'Grundstücke (%)', skalentyp: 'linear' },
  { schluessel: 'bargeld', feld: 'Anteil Bargeld am RV (%)', label: 'Anteil Bargeld am Realvermögen (%)', kurzLabel: 'Bargeld (%)', skalentyp: 'linear' },
  { schluessel: 'wertgegenstaende', feld: 'Anteil Wertgegenstaende am RV (%)', label: 'Anteil Wertgegenstände am Realvermögen (%)', kurzLabel: 'Wertgegenst. (%)', skalentyp: 'linear' },
  { schluessel: 'sonderbestand', feld: 'Anteil Sonderbestand am RV (%)', label: 'Anteil Sonderbestand am Realvermögen (%)', kurzLabel: 'Sonderbestand (%)', skalentyp: 'linear' }
];

export function wertFuerVariable(record, variable) {
  return parseKommaZahl(record[variable.feld]);
}

// Ein Datensatz gilt als vollständig, wenn ALLE acht Kennzahlen einen
// auswertbaren Wert haben - in der aktuellen CSV betrifft das genau einen
// von 68 Datensätzen (VI-0004, dem sämtliche Vermögenswerte fehlen), siehe
// Selbstauskunft im Chat für die Live-Verifikation.
export function istVollstaendig(record) {
  return VERMOEGENS_VARIABLEN.every((variable) => wertFuerVariable(record, variable) !== null);
}

export function baueSkalaFuerVariable(variable, domain, bereich) {
  const skala = variable.skalentyp === 'symlog' ? d3.scaleSymlog() : d3.scaleLinear();
  return skala.domain(domain).range(bereich);
}
