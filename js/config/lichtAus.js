// js/config/lichtAus.js
// Auftrag 13 (Stufe B): Einstellungen des Unsicherheits-Modus „Licht aus“. Nur Werte, keine Logik
// (die Logik steht in js/utils/lichtAus.js, die Steuerung in js/core/lichtAusModus.js).
//
// Typnamen stehen hier bewusst nicht: Typen, Anzeigenamen und Erklärungen kommen aus data/unsicherheit_typen.csv.
// Die Ausprägungen erscheinen nur als Schlüssel für die Zuordnung zu einem Muster (Entscheidung des Autors,
// 16.11.2026: gestrichelt, Doppelkontur, schraffierter Rahmen, gepunktet); ihre Anzeigenamen und Erklärungen kommen aus
// data/unsicherheit_auspraegungen.csv. Eine Ausprägung ohne Eintrag hier bekommt das Muster `ohne` (durchgezogen).

// Massenangabe (Entscheidung 3): Eine Gruppe aus Feld und Typ/Ausprägung, die mindestens diesen Anteil der Datensätze
// einer Ansicht betrifft, zählt bei „Alle“ nicht mit und erscheint als eigener Zusatzschalter. Gerechnet auf den ganzen
// Daten der Ansicht, nicht auf dem Filterstand. Begründung des Werts und Gruppen bei 20/25/35/40 %: PROJEKTLOG 95.
// Seit 16.11.2026 ausgeschaltet (null; Wunsch des Autors: „Ausstellungsort fehlt“ zählt bei „Alle“ mit). Ein Wert
// zwischen 0 und 1 schaltet die Sonderbehandlung wieder ein (vorher 0.30).
export const MASSEN_SCHWELLE = null;

// Kompaktvariante der Typenleiste (Entscheidung 4): unter dieser Fensterhöhe (px) zeigt die Leiste nur die Typen, die
// in der Ansicht vorkommen; die übrigen stehen mit Begründung in einem Aufklapper.
export const KOMPAKT_UNTER_HOEHE = 900;

// Muster je Ausprägung (Schlüssel = auspraegung_id) → Wert von data-muster (css/components.css).
export const MUSTER_JE_AUSPRAEGUNG = {
  ungenau: 'gestrichelt',
  strittig: 'doppelt',
  fehlend: 'geist',
  mehrdeutig: 'gepunktet'
};

// Trägt ein Element mehrere Ausprägungen, zeigt es das Muster der ersten in dieser Reihenfolge (am Feld selbst steht
// jeweils das eigene Muster). Ausprägungen, die hier fehlen, kommen danach.
export const MUSTER_VORRANG = ['strittig', 'mehrdeutig', 'ungenau', 'fehlend'];

// Dunkle Akzentfarbe (Entscheidung 10): optional `akzentfarbe_dunkel` in data/archiv.csv; sonst wird sie aus
// `akzentfarbe` abgeleitet, bis sie diesen Kontrast gegen die dunklen Flächen (--lichtaus-bg, --lichtaus-surface) hält.
export const AKZENT_DUNKEL_MINDESTKONTRAST = 4.5;
