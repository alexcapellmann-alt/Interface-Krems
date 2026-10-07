// js/utils/urkundenKategorieFarben.js
// AUFTRAG C2 (Prüfbericht Punkt 6, Übertragbarkeit): Farben der
// Urkundenkategorien (Spalte `kategorien` in urkunden.csv).
//
// - Kategorien aus der festen Tabelle CAT_COLORS (js/config/constants.js)
//   behalten ihre Farbe (Entscheidung des Autors).
// - Kategorien, die es dort nicht gibt (z. B. bei einem anderen Archiv),
//   bekommen automatisch eine Farbe aus einer FESTEN Liste von 24 Farben -
//   kein Zufall. Der Platz in der Liste ergibt sich aus dem Namen
//   (Prüfsumme FNV-1a, Rest durch 24): gleicher Name, gleiche Farbe.
// - Wollen zwei Namen denselben Platz, bekommt der alphabetisch spätere den
//   nächsten freien Platz in Schritten von 7 (7 und 24 sind teilerfremd, so
//   wird jeder Platz erreicht; der erste Ausweichplatz liegt farblich weit
//   entfernt: Abstand mindestens ΔE 20 statt 11,5 beim direkten Nachbarn). Die Vergabe läuft über ALLE Kategorien der Datei,
//   alphabetisch sortiert - deshalb hängt das Ergebnis nicht von der
//   Reihenfolge der Zeilen ab. Ab 25 unbekannten Kategorien wiederholen sich
//   Farben.
// - Namen, die nicht in den Daten vorkommen (technische Bezeichnungen wie
//   "(ohne Kategorie)" oder "Andere Kategorien"), bleiben grau wie bisher.
//
// Die Palette ist per Skript hergeleitet (Pruefung_2026-10-03/tools/
// pC2_palette.mjs): jede Farbe hat mindestens 3:1 Kontrast gegen den
// Seitenhintergrund #f7f5f0 (grafische Elemente) und mindestens 4,5:1 für
// weiße Beschriftung; Abstand zu jeder festen Krems-Farbe mindestens ΔE 20.

import { CAT_COLORS } from '../config/constants.js';

export const AUTOMATISCHE_FARBEN = [
  '#414e1a', '#2828d9', '#264c73', '#6c4013', '#aa26d7', '#1b5252', '#297a52', '#d02525',
  '#ce244f', '#822b41', '#0f570f', '#216cb8', '#2f748c', '#9c5c1c', '#6f6f25', '#1c5438',
  '#58491d', '#125166', '#753a27', '#8f40dd', '#802b55', '#376fa6', '#916130', '#30520f'
];

const AUSWEICH_SCHRITT = 7;
const TECHNISCHE_SCHLUESSEL = new Set(['default', '__unbekannt__']);
const FESTE_KATEGORIEN = Object.keys(CAT_COLORS).filter((schluessel) => !TECHNISCHE_SCHLUESSEL.has(schluessel));

let vergebenePlaetze = new Map(); // Kategoriename -> Platz in AUTOMATISCHE_FARBEN
let unbekannteKategorien = [];
let vorhandeneKategorien = null; // null = noch keine Daten (dann gilt die feste Tabelle)

// FNV-1a (32 Bit) über die Zeichen des Namens - feste Prüfsumme, kein Zufall.
export function pruefsumme(name) {
  let wert = 0x811c9dc5;
  for (const zeichen of String(name).normalize('NFC')) {
    wert ^= zeichen.codePointAt(0);
    wert = Math.imul(wert, 0x01000193) >>> 0;
  }
  return wert;
}

function kategorienDesRecords(record) {
  const wert = record?.kategorien;
  return (Array.isArray(wert) ? wert : [wert]).map((k) => String(k ?? '').trim()).filter((k) => k !== '');
}

// Vergibt die Plätze für alle Kategorien der übergebenen Urkunden, die nicht
// in der festen Tabelle stehen. Aufruf durch app.js, sobald urkunden.csv
// geladen ist (vor dem Zeichnen jeder Ansicht).
export function vergibKategorieFarben(urkundenRecords = []) {
  const alle = new Set(urkundenRecords.flatMap(kategorienDesRecords));
  vorhandeneKategorien = alle;
  unbekannteKategorien = [...alle].filter((k) => !(k in CAT_COLORS)).sort((a, b) => a.localeCompare(b, 'de'));
  vergebenePlaetze = new Map();
  const belegt = new Set();
  unbekannteKategorien.forEach((name) => {
    let platz = pruefsumme(name) % AUTOMATISCHE_FARBEN.length;
    for (let versuch = 0; belegt.has(platz) && versuch < AUTOMATISCHE_FARBEN.length; versuch += 1) {
      platz = (platz + AUSWEICH_SCHRITT) % AUTOMATISCHE_FARBEN.length;
    }
    belegt.add(platz);
    vergebenePlaetze.set(name, platz);
  });
}

// Farbe einer Kategorie: feste Farbe, sonst die vergebene automatische,
// sonst (kein Datenwert) das bisherige Grau.
export function farbeFuerUrkundenKategorie(kategorie) {
  if (kategorie in CAT_COLORS && !TECHNISCHE_SCHLUESSEL.has(kategorie)) return CAT_COLORS[kategorie];
  if (vergebenePlaetze.has(kategorie)) return AUTOMATISCHE_FARBEN[vergebenePlaetze.get(kategorie)];
  return CAT_COLORS.default;
}

// Alle Kategorien für Filter und Legenden: zuerst die der festen Tabelle (in
// deren Reihenfolge), dann die automatisch gefärbten (alphabetisch) - jeweils
// nur, wenn sie in den Daten vorkommen (ein anderes Archiv sieht keine
// Krems-Kategorien ohne Urkunden). Vor dem ersten Laden: die feste Tabelle.
export function alleUrkundenKategorien() {
  if (!vorhandeneKategorien) return [...FESTE_KATEGORIEN];
  return [...FESTE_KATEGORIEN.filter((k) => vorhandeneKategorien.has(k)), ...unbekannteKategorien];
}

// Für Prüfung und Dokumentation: Platz einer automatisch gefärbten Kategorie.
export function platzDerKategorie(kategorie) {
  return vergebenePlaetze.get(kategorie);
}
