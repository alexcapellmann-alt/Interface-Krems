// js/utils/beschriftung.js
// Gemeinsame Kürzungsregel für Namens-Beschriftungen in Treemap, Sunburst,
// Icicle und Circle Packing (Auftrag "Beschriftungs-Kürzung mit Ellipse").
// Bewusst NICHT für ganttDiagramm.js gedacht - dessen Namensspaltenkürzung
// ist bereits eine eigene, funktionierende Lösung (andere Anforderung: dort
// wird spaltenbreiten-abhängig gekürzt, nicht flächen-/bogen-/kreisabhängig)
// und bleibt unverändert (Nicht-Ziel).
//
// ROOT-CAUSE-CHECK (Schritt 1, vor der Umsetzung geprüft): die "voller Name
// oder gar kein Text"-Logik war in allen vier Modulen NICHT identisch, aber
// auch nicht zufällig verschieden - jedes Modul hatte sein eigenes,
// geometrieabhängiges "größte passende Schriftgröße suchen"-Verfahren
// (treemap.js: mehrzeiliger Wortumbruch in ein Rechteck; sunburst.js:
// einzeilig entlang eines Kreisbogens, Radius-abhängige Bogenlänge;
// icicle.js: einzeilig in ein Rechteck, kein Wortumbruch; circlePacking.js:
// einzeilig, Sehnenbreite eines Kreises bei gegebenem Radius - dort bislang
// nicht einmal in eine eigene Funktion ausgelagert). Eine 1:1-Duplikation lag
// also nicht vor, extrahierbar war ausschließlich der letzte, in allen vieren
// GLEICHE Schritt: "passt der Name bei dieser einen (kleinsten erlaubten)
// Schriftgröße nicht mehr vollständig in die (bereits vom Aufrufer
// geometrieabhängig berechnete) verfügbare Breite - reicht wenigstens eine
// Kürzung mit '…'?" Genau dieser Schritt wird hier zentral bereitgestellt,
// alles Geometrische (Rechteck/Bogen/Kreis-Sehne, Zeilenumbruch, verfügbare
// Höhe) bleibt bewusst modul-lokal (Nicht-Ziel: keine Änderung an der
// Skalierungslogik der vier Module) - dieselbe Trennung "geteilte Formel,
// modul-lokales Zeichnen" wie bei kategorieFarben.js (Farbberechnung geteilt,
// SVG-Zeichnen bleibt modul-lokal) und sidebar.js (Baustein-Muster).
//
// INTEGRATION (siehe je Modul-Kommentar an der Aufrufstelle): jedes Modul
// behält seine BESTEHENDE, unveränderte Schriftgrößen-Suche (größte
// Schriftgröße, bei der der VOLLE Name passt - das war bereits korrekt und
// ist nicht Teil dieses Auftrags, siehe Nicht-Ziel "keine Änderung an der
// Mindestschriftgröße selbst"). Erst wenn diese Suche bei JEDER erlaubten
// Schriftgröße scheitert, ruft das Modul diese Funktion EIN einziges Mal bei
// der etablierten Mindestschriftgröße auf, um zu prüfen, ob wenigstens eine
// gekürzte Fassung hineinpasst - kleinere Schrift = mehr Zeichen pro Pixel,
// die Mindestschriftgröße gibt der Kürzung damit die größtmögliche Chance.

// "Ver…" = 3 echte Zeichen + 1 Auslassungspunkt = 4 sichtbare Zeichen
// (Auftrag, wörtlich: "mindestens 3 Zeichen + '…' passen").
const MIN_GEKUERZTE_ZEICHEN = 3;

// Dieselbe heuristische Zeichenbreite (0,57 × Schriftgröße), die bereits in
// allen vier Modulen für ihre eigene "passt der volle Name"-Prüfung genutzt
// wird - hier als Default belassen, damit Aufrufer sie nicht jedes Mal
// erneut angeben müssen, aber überschreibbar, falls ein Modul künftig eine
// andere Schriftart/Messmethode nutzt.
const STANDARD_ZEICHENBREITE_FAKTOR = 0.57;

// name: der vollständige, unveränderte Name (Auftrag: "Name ausschließlich
// über Tooltip erreichbar" bleibt für den Fall, dass selbst die Kürzung nicht
// passt - der Aufrufer reicht dafür weiterhin den vollen `name`, nicht das
// Ergebnis dieser Funktion, an seine Tooltip-Logik weiter).
// verfuegbareBreite: bereits vom Aufrufer geometrieabhängig berechnete
// nutzbare Breite in px bei der übergebenen `schriftgroesse` (z. B.
// Kachelbreite minus Innenabstand, Bogenlänge am Textstart-Radius, Sehne
// eines Kreises bei diesem Radius) - diese Funktion kennt selbst keine
// Geometrie, nur Text und Zahl.
//
// Rückgabe: der vollständige Name, falls er passt; ein mit "…" gekürzter
// Name (mindestens MIN_GEKUERZTE_ZEICHEN echte Zeichen), falls das reicht;
// sonst `null` (kein Text darstellbar - Aufrufer zeigt dann nichts, Name
// bleibt nur über Tooltip erreichbar, bestehendes Verhalten).
export function ermittleBeschriftungstext(name, verfuegbareBreite, schriftgroesse, zeichenBreiteFaktor = STANDARD_ZEICHENBREITE_FAKTOR) {
  if (!name) return null;
  const zeichenBreite = schriftgroesse * zeichenBreiteFaktor;
  if (zeichenBreite <= 0 || verfuegbareBreite <= 0) return null;

  const maxZeichen = Math.floor(verfuegbareBreite / zeichenBreite);
  if (name.length <= maxZeichen) return name;
  if (maxZeichen >= MIN_GEKUERZTE_ZEICHEN + 1) return `${name.slice(0, maxZeichen - 1)}…`;
  return null;
}
