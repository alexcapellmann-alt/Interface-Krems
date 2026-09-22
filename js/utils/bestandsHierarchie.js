// js/utils/bestandsHierarchie.js
// Gemeinsame Hierarchie-Aufbereitung für alle Bestandsverzeichnis-Visualisierungen
// (Abschnitt 13, DRY). Baut aus den flachen bestand.csv-Records (aus dataLoader.js)
// die Struktur Gesamtbestand -> bkk_kategorie -> bkk_unterkategorie -> einzelner
// Bestand auf (vier Ebenen, siehe docs/SCHEMA.md-Korrektur), ohne die übergebenen
// Records zu verändern (Abschnitt 5).
//
// REGRESSIONSSCHUTZ (Abschnitt 13): Diese Datei wird von FÜNF Modulen genutzt –
// treemap.js, sunburst.js, icicle.js, circlePacking.js UND ganttDiagramm.js (das
// zwar keinen value-Größenwert nutzt, aber sehr wohl baueBestandsHierarchie() für
// die Kategorie-Gruppierung/-Färbung importiert, siehe render()). Eine Änderung an
// baueBestandsHierarchie(), kategorieVonKnoten() oder baueTooltipText() wirkt sich
// auf alle fünf aus.
//
// kategorieVonKnoten()/baueKnotenTooltipText() (neu, Unterkategorie-Ebene):
// ersetzen je eine vormals in sunburst.js/icicle.js/circlePacking.js dupliziert
// vorhandene, depth-basierte lokale Kopie - die ging bei der Einführung der
// vierten Ebene, unbemerkt, still von falschen Annahmen aus.
//
// BUGFIX (Auftrag "Falsche Kategorie im Tooltip in Zoomansichten", siehe
// CHANGELOG): kategorieVonKnoten() verließ sich ursprünglich auf `depth === 1`,
// um die Kategorie-Ebene zu erkennen - korrekt, SOLANGE die Hierarchie stets
// ab Gesamtbestand aufgebaut wird (dort: 0=Gesamtbestand, 1=Kategorie,
// 2=Unterkategorie, 3=Bestand). Sunburst/Icicle/Treemap bauen ihre
// Kategorie-Zoomansicht aber über `d3.hierarchy(aktuelleKategorieDaten)` NEU
// VERWURZELT auf (0=Kategorie, 1=Unterkategorie, 2=Bestand) - dort lieferte
// `depth === 1` fälschlich die UNTERKATEGORIE. Circle Packing verwurzelt in
// seiner Zoomansicht zusätzlich noch FLACHER (baueFlacheBestaende(): Kategorie
// direkt über den Bestand-Blättern, keine Unterkategorie-Zwischenebene,
// 0=Kategorie, 1=Bestand) - dort lieferte `depth === 1` fälschlich den
// BESTAND selbst als "Kategorie". Live an "Steuerbücher"
// (bkk_kategorie="Vermögen und Finanzen", bkk_unterkategorie="Öffentliches
// Vermögen") reproduziert und nach dem Fix erneut verifiziert, siehe
// CHANGELOG/PROJEKTLOG.
//
// Fix: jeder Knoten trägt jetzt ein stabiles, tiefenUNABHÄNGIGES
// `ebenenTyp`-Attribut ('kategorie' | 'unterkategorie' | 'bestand', siehe
// EBENENTYP_*-Konstanten unten) - vergeben beim Aufbau in
// baueBestandsHierarchie() UND (wo die Hierarchie modul-lokal neu
// zusammengesetzt wird, siehe circlePacking.js' baueFlacheBestaende())
// explizit mitgegeben. kategorieVonKnoten() sucht über d.ancestors() (schließt
// den Knoten selbst ein) nach `ebenenTyp === 'kategorie'` statt nach einer
// festen Tiefe - bleibt dadurch korrekt, unabhängig davon, ob/wie/wo die
// Hierarchie neu verwurzelt wird.

export const OHNE_KATEGORIE = '(ohne Kategorie)';
const OHNE_UNTERKATEGORIE = '(ohne Unterkategorie)';
const MINDESTGROESSE = 10;

// Tiefenunabhängige Ebenen-Kennzeichnung (siehe Dateikopf-Kommentar,
// Bugfix "Falsche Kategorie im Tooltip in Zoomansichten") - exportiert, damit
// Module, die eine eigene, lokal neu zusammengesetzte Teilhierarchie bauen
// (aktuell nur circlePacking.js' baueFlacheBestaende(), siehe dortiger
// Kommentar), denselben Wert statt eines eigenen String-Literals verwenden.
export const EBENENTYP_KATEGORIE = 'kategorie';
export const EBENENTYP_UNTERKATEGORIE = 'unterkategorie';
export const EBENENTYP_BESTAND = 'bestand';

export function parseUmfangLfm(rohwert) {
  if (!rohwert) return 0;
  const zahl = parseFloat(String(rohwert).trim().replace(',', '.'));
  return Number.isFinite(zahl) ? zahl : 0;
}

// value: für flächen-/größenbasierte Layouts (Treemap, Sunburst, Icicle, Circle Packing)
// direkt verwendbar, inkl. Mindestgröße gegen Null-/leere Werte. Das Gantt-Diagramm
// ignoriert value und verwendet stattdessen record.zeitraum_von/record.zeitraum_bis.
//
// mindestgroesse (optional, Default unverändert bei 10): treemap.js übergibt hier
// einen eigenen, viel kleineren Wert (siehe dortiger Kommentar) - der reale
// umfang_lfm-Median liegt bei 0,2, ein Mindestwert von 10 floort 99% aller
// Bestände auf denselben Wert und zerstört jede Größenproportionalität. Der
// Default bleibt exakt 10, damit sunburst.js/icicle.js/circlePacking.js/
// ganttDiagramm.js (die alle ohne zweites Argument aufrufen) unverändert
// bleiben - bewusst nicht an der gemeinsamen Stelle für alle geändert, siehe
// CHANGELOG.md.
export function baueBestandsHierarchie(records, mindestgroesse = MINDESTGROESSE) {
  const kategorien = new Map(); // Kategorie -> Map(Unterkategorie -> Blätter[])

  for (const record of records) {
    const kategorie = record.bkk_kategorie && record.bkk_kategorie.trim() !== ''
      ? record.bkk_kategorie
      : OHNE_KATEGORIE;
    const unterkategorie = record.bkk_unterkategorie && record.bkk_unterkategorie.trim() !== ''
      ? record.bkk_unterkategorie
      : OHNE_UNTERKATEGORIE;

    if (!kategorien.has(kategorie)) {
      kategorien.set(kategorie, new Map());
    }
    const unterkategorien = kategorien.get(kategorie);
    if (!unterkategorien.has(unterkategorie)) {
      unterkategorien.set(unterkategorie, []);
    }
    unterkategorien.get(unterkategorie).push({
      name: record.name || record.kuerzel || '(ohne Name)',
      value: Math.max(parseUmfangLfm(record.umfang_lfm), mindestgroesse),
      ebenenTyp: EBENENTYP_BESTAND,
      record
    });
  }

  return {
    name: 'Gesamtbestand',
    children: Array.from(kategorien, ([kategorie, unterkategorien]) => ({
      name: kategorie,
      ebenenTyp: EBENENTYP_KATEGORIE,
      children: Array.from(unterkategorien, ([unterkategorie, blaetter]) => ({
        name: unterkategorie,
        ebenenTyp: EBENENTYP_UNTERKATEGORIE,
        children: blaetter
      }))
    }))
  };
}

// Ermittelt für einen beliebigen Knoten (Kategorie-, Unterkategorie- oder
// Bestand-Ebene) die zugehörige Top-Level-Kategorie - robust über
// d.ancestors() (schließt d selbst ein) nach `ebenenTyp === EBENENTYP_KATEGORIE`,
// unabhängig davon, wie viele Ebenen dazwischen liegen UND unabhängig davon,
// ob/wo die Hierarchie neu verwurzelt wurde (siehe Dateikopf-Kommentar,
// Bugfix "Falsche Kategorie im Tooltip in Zoomansichten" - vormals per fester
// `depth === 1`, das brach in jeder Zoomansicht). Fallback auf `d.data.name`
// selbst, falls wider Erwarten kein Kategorie-Vorfahre gefunden wird (z.B. ein
// künftiger, unvollständig konstruierter Aufrufer) - bewusst kein Wurf einer
// Exception wie zuvor (`.find(...).data.name` auf `undefined`), rein defensiv.
export function kategorieVonKnoten(d) {
  const kategorieKnoten = d.ancestors().find((vorfahre) => vorfahre.data.ebenenTyp === EBENENTYP_KATEGORIE);
  return kategorieKnoten ? kategorieKnoten.data.name : d.data.name;
}

// Tooltip-Text für EINEN Knoten gleich welcher Ebene: Bestand-Blätter (haben
// .data.record) über baueTooltipText(), Kategorie/Unterkategorie-Gruppenknoten
// (kein .data.record) über ihren Namen plus Ebenen-Bezeichnung. Nutzt jetzt
// ebenfalls `ebenenTyp` statt `depth` (siehe kategorieVonKnoten()) - aktuell
// von keinem der fünf Module aufgerufen (grep-bestätigt), der Depth-Fehler
// hier war daher nicht produktiv wirksam, wurde aber aus Konsistenzgründen
// mitkorrigiert, um denselben Fehler bei künftiger Nutzung zu vermeiden.
export function baueKnotenTooltipText(d) {
  if (d.data.record) return baueTooltipText(d);
  return `${d.data.ebenenTyp === EBENENTYP_KATEGORIE ? 'Kategorie' : 'Unterkategorie'}: ${d.data.name}`;
}

// Erwartet einen Blatt-Knoten aus d3.hierarchy(baueBestandsHierarchie(records)) –
// also mit .data.{name,value,record}.
//
// BUGFIX-NACHTRAG (beim Live-Verifizieren des obigen kategorieVonKnoten()-Fixes
// entdeckt, siehe CHANGELOG): die Unterkategorie-Zeile verließ sich auf
// `blatt.parent` OHNE zu prüfen, ob dieser Elternknoten tatsächlich eine
// Unterkategorie ist - traf in den meisten Modulen zu (Bestand-Blatt hängt
// direkt unter der Unterkategorie), aber NICHT in circlePacking.js'
// Kategorie-Zoomansicht (baueFlacheBestaende(): dort hängt das Bestand-Blatt
// direkt unter der KATEGORIE selbst, keine Unterkategorie-Zwischenebene) - dort
// zeigte "Unterkategorie: ..." fälschlich denselben Wert wie "Kategorie: ...".
// Jetzt: die Zeile erscheint nur noch, wenn der Elternknoten laut `ebenenTyp`
// tatsächlich eine Unterkategorie ist - fehlt diese Zwischenebene (wie bei
// circlePacking.js' flacher Struktur), entfällt die Zeile ganz, statt einen
// falschen Wert zu zeigen (dieselbe "lieber weglassen als falsch anzeigen"-
// Konvention wie beim bereits bestehenden OHNE_UNTERKATEGORIE-Fall direkt
// darunter).
export function baueTooltipText(blatt) {
  const zeilen = [
    blatt.data.name,
    `Kategorie: ${kategorieVonKnoten(blatt)}`
  ];
  if (blatt.parent && blatt.parent.data.ebenenTyp === EBENENTYP_UNTERKATEGORIE && blatt.parent.data.name !== OHNE_UNTERKATEGORIE) {
    zeilen.push(`Unterkategorie: ${blatt.parent.data.name}`);
  }
  zeilen.push(`Umfang: ${blatt.data.record.umfang || blatt.data.record.umfang_lfm || 'unbekannt'}`);
  if (blatt.data.record.daten_unsicher) {
    const anmerkung = blatt.data.record.unsicherheit_anmerkung;
    const anmerkungText = Array.isArray(anmerkung) ? anmerkung.join('; ') : anmerkung;
    zeilen.push('Achtung: Angaben unsicher' + (anmerkungText ? ' – ' + anmerkungText : ''));
  }
  return zeilen.join('\n');
}
