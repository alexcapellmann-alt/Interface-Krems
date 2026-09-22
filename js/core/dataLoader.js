// js/core/dataLoader.js
// Vertrag: siehe Masterprompt Abschnitt 6.
//
// Voraussetzung: D3 v7 ist bereits als globales `d3` geladen (klassisches
// <script src="https://d3js.org/d3.v7.min.js"></script> in index.html) –
// kein Build-Step, kein npm-Import (Abschnitt 2).
//
// Der DataLoader bleibt bewusst generisch: er kennt keine konkreten
// Spaltennamen einzelner Tabellen (die stehen in docs/SCHEMA.md) und
// gruppiert/aggregiert/verrechnet nichts vor (Abschnitt 6).

const MUSTER_UNSICHER_SPALTE = /^(.+)_unsicher$/;

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

// Lädt eine CSV-Datei und liefert { records, schema, errors } (Abschnitt 6).
export async function ladeCSV(pfad) {
  const antwort = await fetch(pfad);
  if (!antwort.ok) {
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

  rohdaten.forEach((rohzeile, index) => {
    if (istLeereZeile(rohzeile, spaltennamen)) {
      errors.push({ zeile: index + 2, grund: 'Zeile ist vollständig leer', rohzeile });
      return;
    }
    records.push(leiteDatensatzAb(rohzeile, spaltennamen));
  });

  const schema = leiteSchemaAb(rohdaten, spaltennamen);

  return { records, schema, errors };
}
