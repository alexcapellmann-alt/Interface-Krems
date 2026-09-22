// js/utils/vermoegensgruppenFarben.js
// Gemeinsame Farblogik für die Vermögensgruppen (A-E, plus die Sonderwerte
// A*/S) aus data/verlassenschaftsinventare.csv - von parallelKoordinaten.js
// UND vermoegensschichtung.js genutzt (AUFTRAG "Parallelkoordinaten-
// Anpassung + neue Visualisierung 'Vermögensschichtung'" verlangt
// ausdrücklich "gleiche ordinale Rot-Grün-Skala... für Wiedererkennbarkeit
// zwischen den Modulen") - eine einzige Stelle statt zweier paralleler
// Farbimplementierungen (Abschnitt 13, DRY, dieselbe Begründung wie bei
// js/utils/kategorieFarben.js/verlassenschaftenFelder.js).
//
// BEWUSST KEINE Wiederverwendung von kategorieFarben.js' baueKategorieFarbSkala():
// die dortige Skala verteilt Farbtöne gleichmäßig über den vollen Farbkreis
// für NOMINALE (ungeordnete) Kategorien - A bis E sind aber eine ECHTE
// Rangordnung (A = verschuldet bis E = Oberschicht, Auftrag, wörtlich), eine
// Regenbogen-Verteilung würde diese Ordnung visuell verschleiern statt
// zeigen. Hier stattdessen eine SEQUENZIELLE/DIVERGIERENDE Skala
// (d3.interpolateRdYlGn, Teil der d3-scale-chromatic-Module, die im
// geladenen d3.v7-Bundle enthalten sind) über die fünf geordneten Gruppen.
//
// A*/S (siehe VERMOEGENSGRUPPE_ORDINAL - beide bewusst NICHT Teil davon):
// live gegen die Daten geprüft (siehe Selbstauskunft im Chat) - "A*" kommt
// in der gesamten Tabelle genau einmal vor (VI-0032, Gesamtvermögen -5 fl.,
// exakt an der A/B-Grenze von 0 fl.) und trägt KEINE unsicherheit_anmerkung
// und KEIN <feld>_unsicher-Begleitfeld (dataLoader.js würde ein solches
// Feld sonst automatisch als eigenen Boolean erkennen, siehe dortiger
// Dateikopf-Kommentar) - technisch also KEINE Unsicherheits-Markierung im
// Sinne des Datenschemas. docs/SCHEMA.md dokumentiert die Spalte zudem
// ausdrücklich nur als "Text (A-E, S)", OHNE "A*" zu erwähnen. Die exakte
// inhaltliche Bedeutung des Sternchens (vermutlich ein Grenzfall knapp an
// der A/B-Schwelle) ist damit NICHT zweifelsfrei aus den Daten ableitbar -
// wird hier deshalb, wie vom Auftrag verlangt, genau wie "S" mit einer
// neutralen Sonderfarbe behandelt, keine Vermutung über die Skala hinaus.

export const VERMOEGENSGRUPPE_ORDINAL = ['A', 'B', 'C', 'D', 'E'];
// Anzeige-/Sortierreihenfolge für Legenden und die Kategorie-Achse in
// vermoegensschichtung.js (Auftrag, Teil B Punkt 1, wörtlich: "A, A*, B, C,
// D, E, S in dieser Reihenfolge").
export const VERMOEGENSGRUPPE_ANZEIGE_REIHENFOLGE = ['A', 'A*', 'B', 'C', 'D', 'E', 'S'];
export const VERMOEGENSGRUPPE_SONDERFARBE = '#8a8a8a';

export function farbeFuerVermoegensgruppe(wert) {
  const index = VERMOEGENSGRUPPE_ORDINAL.indexOf(wert);
  if (index === -1) return VERMOEGENSGRUPPE_SONDERFARBE;
  return d3.interpolateRdYlGn(index / (VERMOEGENSGRUPPE_ORDINAL.length - 1));
}
