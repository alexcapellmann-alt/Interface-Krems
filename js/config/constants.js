// js/config/constants.js
// Rein technische Konstanten, die laut Masterprompt Abschnitt 2/3 im Code stehen dürfen
// (im Unterschied zu archivarischen Inhalten, die ausschließlich aus data/*.csv kommen).
//
// AUFTRAG "Kategorie-Umbenennung" (siehe CHANGELOG für den vollen Wortlaut/Grund):
// ein Kategoriename wurde gekürzt - nur der Name/Key geändert, Farbwert (#952323)
// unverändert. Betrifft hier nur urkunden.csv's kategorien-Feld (CAT_COLORS);
// bestandsverzeichnis.csv's bkk_kategorie nutzt eine separate, datengetriebene
// Farblogik (kategorieFarben.js), dort war keine Code-Änderung nötig.

// Vormals Platzhalter (siehe CHANGELOG/PROJEKTLOG, Etappe "Regesten-
// Kachelraster – Überarbeitung") - jetzt mit den tatsächlichen Kategorienwerten
// aus urkunden.csv (Spalte "kategorien") befüllt. Root-Cause-Check vor dem
// Befüllen: eine naive Semikolon-Aufteilung der CSV lieferte zunächst Unsinn
// (Personennamen/IDs statt Kategorien), weil mehrere Regest-Freitextfelder
// eingebettete Anführungszeichen mit Semikolons enthalten - eine RFC4180-
// konforme Zeilen-Parsing (Anführungszeichen respektiert) ergab sauber 16
// tatsächlich vorkommende, eindeutige Kategorien (1069 Datenzeilen, 14 ganz
// ohne Kategorie).
//
// Farben nach demselben, bereits etablierten Verfahren wie
// js/utils/kategorieFarben.js's baueKategorieFarbSkala() erzeugt (gleichmäßig
// verteilter Farbton über den vollen Kreis + alternierende Helligkeit,
// alphabetisch sortierte Kategorienliste als stabile, reproduzierbare
// Grundlage - nicht nach Häufigkeit, die sich mit neuen Daten verschieben
// könnte) und einzeln gegen WCAG-AA (4,5:1) mit garantiereKontrast()
// geprüft/nachjustiert. Textfarbe wird nicht hier festgelegt, sondern von
// den aufrufenden Modulen weiterhin per passendeTextfarbe(hex) berechnet
// (kategorieFarben.js) - Kontrastwerte hier nur zur Dokumentation der
// Prüfung, live verifiziert (alle ≥ 4,5:1):
//   Bevölkerung                          8,26:1 (weiß)
//   Bildung und Erziehung                6,70:1 (schwarz)
//   Gesundheit                           4,98:1 (schwarz)
//   Grund und Boden                     11,39:1 (schwarz)
//   Kultur                               4,79:1 (schwarz)
//   Medien                               9,87:1 (schwarz)
//   Politik                              4,51:1 (schwarz)
//   Privatvermögen                      10,07:1 (schwarz)
//   Rechtswesen                          4,81:1 (schwarz)
//   Religion                             7,05:1 (schwarz)
//   Soziales Leben                       9,47:1 (weiß)
//   Stadt und Raum                       4,71:1 (weiß)
//   Verkehr, Ver- und Entsorgung          9,86:1 (weiß)
//   Vermögen und Finanzen                5,22:1 (schwarz)
//   Verwaltung                           7,53:1 (weiß)
//   Wirtschaft                           5,08:1 (schwarz)
//   default/__unbekannt__                4,91:1 (schwarz)
//
// `default` bleibt aus Rückwärtskompatibilität erhalten (Nicht-Ziel: keine
// Änderung an den ca. 25 anderen, noch unfertigen Urkunden-Visualisierungs-
// modulen, die bereits alle einheitlich `CAT_COLORS[kategorie] ||
// CAT_COLORS.default` als Fallback-Muster verwenden) - `__unbekannt__` ist
// derselbe Farbwert unter dem im aktuellen Auftrag explizit verlangten,
// selbsterklärenden Namen (Abschnitt 12: Kategorie nie über eine zufällige
// oder fehlende Farbe kommunizieren). Beide Schlüssel bewusst identisch,
// keine zwei konkurrierenden "Unbekannt"-Grautöne.
// AUFTRAG "Einheitliche Achsenbeschriftungsgröße app-weit": Referenzwert ist
// zeitachse.js' TICK_SCHRIFTGROESSE (dort lokal, da vor diesem Auftrag kein
// zweites Modul denselben Wert brauchte) - 14px = var(--fs-sm) im
// Design-System (siehe css/base.css), von 10px hochgesetzt, weil 10px bei
// echten Nutzertests als schwer lesbar galt (siehe zeitachse.js' eigener
// Dateikopf-Kommentar zu diesem Schritt). HIER statt in zeitachse.js selbst
// exportiert (nicht umgekehrt importiert), weil constants.js bereits von
// praktisch jedem Viz-Modul für CAT_COLORS importiert wird - ein Import aus
// einer spezifischen anderen Viz-Datei wäre eine unnötige Kopplung.
//
// BEWUSST NICHT als CSS-Variable (var(--fs-sm)) direkt in den Modulen
// referenziert: die meisten Aufrufstellen setzen die Schriftgröße als
// SVG-Präsentationsattribut (`.attr('font-size', ...)`), und
// Attributwerte werden nicht als CSS geparst - `var()` würde dort nicht
// aufgelöst, sondern als ungültiger Wert ignoriert. Eine gemeinsame
// JS-Konstante funktioniert dagegen sowohl für `.attr()`-Aufrufe als auch
// für die wenigen CSS-Klassen-basierten Fälle (per Template-String
// eingesetzt) - bleibt dabei eine einzige Änderungsstelle für beide Fälle.
export const ACHSEN_SCHRIFTGROESSE = 14;

export const CAT_COLORS = {
  'Bevölkerung': '#952323',
  'Bildung und Erziehung': '#da8f62',
  'Gesundheit': '#a68527',
  'Grund und Boden': '#cbda62',
  'Kultur': '#5c9523',
  'Medien': '#71da62',
  'Politik': '#23953f',
  'Privatvermögen': '#62daad',
  'Rechtswesen': '#239595',
  'Religion': '#62adda',
  'Soziales Leben': '#233f95',
  'Stadt und Raum': '#7162da',
  'Verkehr, Ver- und Entsorgung': '#5c2395',
  'Vermögen und Finanzen': '#cb62da',
  'Verwaltung': '#952378',
  'Wirtschaft': '#da628f',
  default: '#888888',
  __unbekannt__: '#888888'
};
