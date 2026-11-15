// Datenformat: Jeder Eintrag in `unsicherheit_anmerkung` (je durch `|` getrennter Teil, wie der DataLoader ihn zerlegt)
// folgt `<feldname>: <Erklärung>` mit einer Spalte derselben Tabelle (SCHEMA.md, PROJEKTLOG 80). Ausnahmen:
// - Fortsetzungen einer Signaturliste in orte.csv („(Signatur(en): SIG1|SIG2)“), keine eigenen Einträge;
// - die bewusst unveränderten Einträge aus Nachbesserung 3, Punkt 1 (mehrere Felder oder ganzer Datensatz,
//   Zweitinventarisierungen; Entscheidung des Autors, Liste in PROJEKTLOG 80). Kommt ein neuer Eintrag ohne Feldnamen
//   hinzu, schlägt der Test fehl; verschwindet eine Ausnahme aus den Daten, ebenfalls (Liste dann nachführen).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { WURZEL, leseCsvRoh } from './hilfen.mjs';

// [Datei ohne .csv, Wert der ersten Spalte, Textanfang]
const AUSNAHMEN = [
  ['urkunden', 'StaAKr-0007', 'Doppelt erfasst als StaAKr-0873 (Datensa'],
  ['urkunden', 'StaAKr-0008', 'Weitere Ausfertigung des Privilegs StaAK'],
  ['urkunden', 'StaAKr-0876', 'Doppelt erfasst als StaAKr-0542 (Datensa'],
  ['orte', 'maigen', 'Koordinaten noch nicht ermittelt.'],
  ['orte', 'marquartsurfar', 'Historischer Flurname/Insel bei Mautern,'],
  ['personenliste', 'bartholomaeus_eggartner', 'Zweitinventarisierung derselben Person ('],
  ['personenliste', 'anna_catharina_schoenthanin_hievor_leutmanslehnerin', 'Zweitinventarisierung derselben Person ('],
  ['verlassenschaftsinventare', 'VI-0024', 'Zweitinventarisierung derselben Person ('],
  ['verlassenschaftsinventare', 'VI-0028', 'Zweitinventarisierung derselben Person ('],
  ['verlassenschaftsinventare', 'VI-0032', 'Zweitinventarisierung derselben Person ('],
  ['verlassenschaftsinventare', 'VI-0033', 'Zweitinventarisierung derselben Person ('],
  ['bestandsverzeichnis', 'Passprotokolle', 'Zeitraum (von/bis) nicht überliefert bzw'],
  ['bestandsverzeichnis', 'Einzelne Pässe und Passierscheine', 'Zeitraum (von/bis) nicht überliefert bzw'],
  ['bestandsverzeichnis', 'Einzelne Rechnungsbücher', 'Zeitraum (von/bis) nicht überliefert bzw'],
  ['bestandsverzeichnis', 'Grundbuchsangelegenheiten', 'Zeitraum (von/bis) nicht überliefert bzw'],
  ['bestandsverzeichnis', 'Musikaliensammlung', 'Zeitraum (von/bis) nicht überliefert bzw'],
  ['bestandsverzeichnis', 'Robert Streibel', 'Bestandsinhalt nicht überliefert bzw. ni'],
  ['bestandsverzeichnis', 'Nachlass Josef Maria Eder', 'Bestandsinhalt, -umfang sowie Zeitraum ('],
  ['bestandsverzeichnis', 'Nachlass Familie Robitschek / Nachlass Familie Rieger / Nachlass Familie Herzog', 'Bestandsumfang sowie Zeitraum (von/bis) '],
  ['bestandsverzeichnis', 'Kartographische Sammlung, Allgemeine Reihe', 'Bestandsumfang sowie Zeitraum (von/bis) '],
  ['bestandsverzeichnis', 'Stadtpläne Krems und Stein', 'Bestandsinhalt, -umfang sowie Zeitraum ('],
  ['bestandsverzeichnis', 'Pläne aus der Zentralregistratur', 'Zeitraum (von/bis) nicht überliefert bzw'],
  ['bestandsverzeichnis', 'Nachlass Josef Utz, Vater und Sohn Baupläne und Bauaufnahmen', 'Bestandsumfang sowie Zeitraum (von/bis) '],
  ['bestandsverzeichnis', 'Nachlass Josef Utz, Vater und Sohn Studien und Skizzen', 'Bestandsumfang sowie Zeitraum (von/bis) '],
  ['bestandsverzeichnis', 'Fotosammlung', 'Bestandsinhalt, -umfang sowie Zeitraum ('],
  ['bestandsverzeichnis', 'Kremser Theaterzettel', 'Bestandsumfang sowie Zeitraum (von/bis) '],
  ['bestandsverzeichnis', 'Auswärtige Theaterzettel', 'Bestandsumfang sowie Zeitraum (von/bis) '],
  ['bestandsverzeichnis', 'Partezettelsammlung', 'Bestandsumfang sowie Zeitraum (von/bis) '],
  ['bestandsverzeichnis', 'Handschriften, Manuskripte und Typoskripte', 'Bestandsinhalt, -umfang sowie Zeitraum ('],
  ['bestandsverzeichnis', 'Fragmentesammlung', 'Bestandsinhalt, -umfang sowie Zeitraum (']
];
const FORTSETZUNG = /^(StaAKr|StAK)-[\w-]+\)?\.?$/;

const dateien = fs.readdirSync(path.join(WURZEL, 'data')).filter((f) => f.endsWith('.csv'));
const mitAnmerkung = dateien.filter((f) => leseCsvRoh(f).columns?.includes('unsicherheit_anmerkung'));

test('mindestens die sechs bekannten Dateien haben die Spalte', () => {
  for (const f of ['urkunden.csv', 'buergerbuch.csv', 'orte.csv', 'personenliste.csv', 'verlassenschaftsinventare.csv', 'bestandsverzeichnis.csv']) assert.ok(mitAnmerkung.includes(f), f);
});

for (const datei of mitAnmerkung) {
  test(`${datei}: jeder Eintrag im Format <feldname>: <Erklärung> oder dokumentierte Ausnahme`, () => {
    const zeilen = leseCsvRoh(datei);
    const spalten = new Set(zeilen.columns.map((s) => s.toLowerCase()));
    const kurz = datei.replace(/\.csv$/, '');
    const verstoesse = [];
    const genutzt = new Set();
    for (const z of zeilen) {
      const roh = (z.unsicherheit_anmerkung || '').trim();
      if (!roh) continue;
      const kennung = z[zeilen.columns[0]];
      const teile = roh.split('|').map((t) => t.trim()).filter(Boolean);
      teile.forEach((t, k) => {
        if (k > 0 && FORTSETZUNG.test(t)) return;
        const dp = t.indexOf(':');
        if (dp > 0 && spalten.has(t.slice(0, dp).trim().toLowerCase())) return;
        const a = AUSNAHMEN.findIndex(([d, id, anfang]) => d === kurz && id === kennung && t.startsWith(anfang));
        if (a >= 0) { genutzt.add(a); return; }
        verstoesse.push(`${kennung}: ${t.slice(0, 60)}`);
      });
    }
    assert.deepEqual(verstoesse, []);
    const erwartet = AUSNAHMEN.map((x, i) => [x, i]).filter(([[d]]) => d === kurz).map(([, i]) => i);
    assert.deepEqual([...genutzt].sort((x, y) => x - y), erwartet, 'Ausnahmeliste passt nicht mehr zu den Daten');
  });
}
