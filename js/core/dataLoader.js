// js/core/dataLoader.js
// Vertrag: siehe Masterprompt Abschnitt 6.
//
// Voraussetzung: D3 v7 ist bereits als globales `d3` geladen (klassisches
// <script src="vendor/d3/d3.v7.min.js"></script> in index.html, seit
// AUFTRAG "Lokale Bibliotheken und Schriften", Punkt 1.1 lokal statt vom
// bisherigen externen CDN eingebunden) – kein Build-Step, kein npm-Import
// (Abschnitt 2).
//
// Der DataLoader bleibt bewusst generisch: er kennt keine konkreten
// Spaltennamen einzelner Tabellen (die stehen in docs/SCHEMA.md) und
// gruppiert/aggregiert/verrechnet nichts vor (Abschnitt 6).

// Nachbesserung 7, Punkt 1: kleines Blattmodul ohne eigene Importe (verlängert die Importkette beim Start nur um eine
// winzige Datei; die Ansichts-Prüfung datenAnforderungen.js bleibt wie in PROJEKTLOG 57 begründet außen vor)
import { fehlendeMindestfelder } from '../utils/vollstaendigkeit.js';
import { pruefeUnsicherheitTypen } from '../utils/uncertainty.js'; // Auftrag 12

const MUSTER_UNSICHER_SPALTE = /^(.+)_unsicher$/;

// AUFTRAG B2 (Prüfbericht Punkt 3): Spaltenprüfung beim Laden. Der Loader
// bleibt generisch - er hält je Datei nur fest, was beim Laden auffiel (Datei
// fehlt, erkannte Spalten, Anzahl der Datensätze). Den Abgleich mit den
// freigegebenen Pflicht- und Schlüsselspalten (js/config/datenAnforderungen.js)
// macht js/core/datenVerfuegbarkeit.js - bewusst NICHT hier importiert: das
// hätte die Importkette beim Start um eine Ebene verlängert und die erste
// Darstellung messbar verzögert (siehe PROJEKTLOG Eintrag 57).
const dateiZustaende = new Map(); // pfad -> { fehlt, anzahlDatensaetze, spalten }

function haltePruefungFest(pfad, spaltennamen, anzahlDatensaetze) {
  dateiZustaende.set(pfad, { fehlt: false, anzahlDatensaetze, spalten: spaltennamen });
}

// Prüfergebnis der zuletzt geladenen Fassung einer Datei, oder null, wenn
// sie in dieser Sitzung noch nicht geladen wurde.
export function holeDateiZustand(pfad) {
  return dateiZustaende.get(pfad) || null;
}

function entferneBOM(text) {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

// Erkennt den technischen Grundtyp einer Spalte anhand ihrer Rohwerte.
// Nur text | zahl | ja_nein (Abschnitt 6) – niemals inhaltliche Interpretation.
// Datumsfelder bleiben also immer "text", ihre Präzision wird andernorts
// (datePrecision.js) aus diesem Text abgeleitet, nicht hier.
function erkenneSpaltentyp(spaltenname, werte) {
  const belegteWerte = werte.filter((wert) => wert !== '' && wert != null);
  if (belegteWerte.length === 0) {
    return 'text';
  }

  if (MUSTER_UNSICHER_SPALTE.test(spaltenname)) {
    return 'ja_nein';
  }

  const alleJaNein = belegteWerte.every((wert) => wert === 'ja' || wert === 'nein');
  if (alleJaNein) {
    return 'ja_nein';
  }

  const alleZahlen = belegteWerte.every((wert) => /^-?\d+([.,]\d+)?$/.test(wert.trim()));
  if (alleZahlen) {
    return 'zahl';
  }

  return 'text';
}

// Enthält irgendein Wert dieser Spalte ein Pipe-Zeichen? Rein informativ im
// Schema – die eigentliche Umwandlung in Listen passiert pro Datensatz in
// leiteDatensatzAb(), nicht hier.
function spalteHatMehrfachwerte(werte) {
  return werte.some((wert) => typeof wert === 'string' && wert.includes('|'));
}

function leiteSchemaAb(rohdaten, spaltennamen) {
  const schema = {};
  for (const spaltenname of spaltennamen) {
    const werte = rohdaten.map((zeile) => zeile[spaltenname]);
    schema[spaltenname] = {
      typ: erkenneSpaltentyp(spaltenname, werte),
      mehrfach: spalteHatMehrfachwerte(werte)
    };
  }
  return schema;
}

// Wandelt eine einzelne Rohzeile in einen aufbereiteten Datensatz um:
// - Pipe-getrennte Werte werden zu echten Listen (Abschnitt 6)
// - <feldname>_unsicher wird zu einem Boolean, zusätzlich gesammelt in
//   _unsicherFelder (Liste der Basis-Feldnamen, die als unsicher markiert sind
//   – Grundlage für den Hover-Tooltip aus Abschnitt 11, ohne dass dataLoader.js
//   dafür wissen muss, welche Felder bei welcher Tabelle unsicherheitsfähig sind)
//
// Bekannte Einschränkung (bitte vor Etappe 2 bestätigen): Die generische Regel
// "Pipe = Liste" gilt für JEDE Spalte gleichermaßen. In den echten Urkunden-Daten
// nutzt die Spalte `unsicherheit_anmerkung` (laut SCHEMA.md vom Typ "Text", keine
// Liste) das Pipe-Zeichen jedoch stellenweise als lesbares Trennzeichen zwischen
// mehreren Unsicherheitsgründen in einem Freitext, z.B.:
//   "Ortsidentifikation unsicher: ... | Datierung unsicher: ..."
// (siehe Zeile StaAKr-0001b in urkunden.csv). Mit der aktuellen, bewusst
// generischen Regel wird dieser Freitext ebenfalls in eine Liste zerlegt, obwohl
// er inhaltlich ein zusammenhängender Text ist. Da dataLoader.js in dieser Etappe
// ausdrücklich keine Spaltennamen-spezifischen Ausnahmen kennen soll, wird das
// hier bewusst nicht "repariert" - siehe Zusammenfassung an den Nutzer.
function leiteDatensatzAb(rohzeile, spaltennamen) {
  const datensatz = {};
  const unsichereFelder = [];

  for (const spaltenname of spaltennamen) {
    const rohwert = rohzeile[spaltenname] != null ? rohzeile[spaltenname].trim() : '';
    const unsicherTreffer = spaltenname.match(MUSTER_UNSICHER_SPALTE);

    if (unsicherTreffer) {
      const istUnsicher = rohwert === 'ja';
      datensatz[spaltenname] = istUnsicher;
      if (istUnsicher) {
        unsichereFelder.push(unsicherTreffer[1]);
      }
      continue;
    }

    if (rohwert.includes('|')) {
      datensatz[spaltenname] = rohwert
        .split('|')
        .map((teil) => teil.trim())
        .filter((teil) => teil !== '');
    } else {
      datensatz[spaltenname] = rohwert;
    }
  }

  datensatz._unsicherFelder = unsichereFelder;
  return datensatz;
}

// Generische Fehlerdefinition (Abschnitt 6: "Liste fehlerhafter/unvollständiger
// Zeilen mit Grund"): eine Zeile, in der wirklich jedes Feld leer ist, gilt
// unabhängig von der jeweiligen Tabelle als fehlerhaft/unvollständig. Eine
// tabellenspezifische Pflichtfeld-Prüfung (z.B. "signatur darf nicht leer sein")
// ist bewusst nicht Teil dieser Etappe, da sie Wissen über einzelne Spalten
// aus SCHEMA.md voraussetzen würde.
function istLeereZeile(rohzeile, spaltennamen) {
  return spaltennamen.every((spaltenname) => {
    const wert = rohzeile[spaltenname];
    return wert == null || wert.trim() === '';
  });
}

// Auftrag 12: Vokabular der Unsicherheitstypen (data/unsicherheit_typen.csv, data/unsicherheit_auspraegungen.csv), einmal
// je Ordner geladen. Fehlt es, entfällt nur die Vokabularprüfung (das Format wird weiter geprüft).
const vokabularCache = new Map();
function ladeVokabular(ordner) {
  if (!vokabularCache.has(ordner)) {
    const spalte = (datei, name) => ladeCSV(ordner + datei).then(({ records }) => new Set(records.map((r) => String(r[name] ?? '').trim().toLowerCase()).filter(Boolean)));
    vokabularCache.set(ordner, Promise.all([spalte('unsicherheit_typen.csv', 'typ_id'), spalte('unsicherheit_auspraegungen.csv', 'auspraegung_id')])
      .then(([typen, auspraegungen]) => ({ typen, auspraegungen })).catch(() => null));
  }
  return vokabularCache.get(ordner);
}

// Lädt eine CSV-Datei und liefert { records, schema, errors, warnungen } (Abschnitt 6; `warnungen` seit Auftrag 12, additiv).
// Jeder Datensatz trägt zusätzlich `_quelle` = Dateiname (Nachbesserung 3, Punkt 3).
export async function ladeCSV(pfad) {
  let antwort;
  try {
    antwort = await fetch(pfad);
  } catch (fehler) {
    dateiZustaende.set(pfad, { fehlt: true });
    throw fehler;
  }
  if (!antwort.ok) {
    dateiZustaende.set(pfad, { fehlt: true });
    throw new Error(`CSV konnte nicht geladen werden: ${pfad} (${antwort.status})`);
  }

  const rohtext = entferneBOM(await antwort.text());
  // Abschnitt 12 legt Semikolon als Spaltentrenner fest; d3.csvParse() selbst
  // versteht nur Komma. d3.dsvFormat(';').parse() ist derselbe RFC-4180-robuste
  // D3-Parser (Anführungszeichen, Zeilenumbrüche in Zellen funktionieren gleich),
  // nur mit dem in Abschnitt 12 vorgegebenen Trennzeichen – siehe Zusammenfassung
  // an den Nutzer zu diesem Widerspruch zwischen Abschnitt 6 (nennt wörtlich
  // "d3.csvParse()") und Abschnitt 12 (Semikolon-Konvention).
  const rohdaten = d3.dsvFormat(';').parse(rohtext);
  const spaltennamen = rohdaten.columns;

  const records = [];
  const errors = [];
  const quellname = String(pfad).split(/[\/]/).pop().split('?')[0];

  rohdaten.forEach((rohzeile, index) => {
    if (istLeereZeile(rohzeile, spaltennamen)) {
      errors.push({ zeile: index + 2, grund: 'Zeile ist vollständig leer', rohzeile });
      return;
    }
    const datensatz = leiteDatensatzAb(rohzeile, spaltennamen);
    // Nachbesserung 3, Punkt 3: nur der Dateiname, generisch (keine Spaltenkenntnis, kein Import); welche
    // Felder Mindestfelder sind, weiß js/utils/vollstaendigkeit.js.
    datensatz._quelle = quellname;
    records.push(datensatz);
    // Nachbesserung 7, Punkt 1 (Befund 3.1, Masterprompt §6): Zeilen mit leerem Mindestfeld (ID/Signatur, Bezeichnung;
    // js/utils/vollstaendigkeit.js) zusätzlich in `errors` - mit Zeile, Spalte und Grund. Die Zeile bleibt in `records`.
    fehlendeMindestfelder(datensatz).forEach((spalte) => {
      errors.push({ zeile: index + 2, spalte, grund: `Pflichtwert fehlt: ${spalte}`, rohzeile });
    });
  });

  // Auftrag 12: Spalte `unsicherheit_typ` prüfen – unbekannte Typen/Ausprägungen und falsches Format als `errors`,
  // Typ ohne Markierung bzw. Markierung ohne Typ als `warnungen`. Der Lader ändert dabei nichts an den Datensätzen.
  const warnungen = [];
  if ((spaltennamen || []).includes('unsicherheit_typ')) {
    const ordner = String(pfad).includes('/') ? String(pfad).slice(0, String(pfad).lastIndexOf('/') + 1) : '';
    const vokabular = await ladeVokabular(ordner);
    records.forEach((datensatz, i) => {
      const { fehler, warnungen: w } = pruefeUnsicherheitTypen(datensatz, vokabular);
      fehler.forEach((grund) => errors.push({ zeile: i + 2, spalte: 'unsicherheit_typ', grund }));
      w.forEach((grund) => warnungen.push({ zeile: i + 2, spalte: 'unsicherheit_typ', grund }));
    });
  }

  const schema = leiteSchemaAb(rohdaten, spaltennamen);
  haltePruefungFest(pfad, spaltennamen || [], records.length);

  return { records, schema, errors, warnungen };
}
