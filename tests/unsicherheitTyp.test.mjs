// Auftrag 12: Spalte `unsicherheit_typ` – Parser (js/utils/uncertainty.js) und Datenformat aller sieben Dateien.
// Regeln: unbekannter Typ oder unbekannte Ausprägung = Fehler; Typ ohne `<feld>_unsicher` bzw. Markierung ohne Typ = Warnung.
// Bekannte Warnungen (dokumentiert, keine Fehler):
// - orte.csv: `orte_unsicher` gilt für den ganzen Ort; fehlt nur die Lage, steht der Typ bei `lat`/`lon`. Einträge mit
//   ortsart „Herkunftsname“ sind kein Ort und bekommen keinen geographischen Typ.
// - bestandsverzeichnis.csv: `daten_unsicher` gilt für den ganzen Bestand, nicht für ein Feld „daten“.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ladeD3, setzeTestFetch, leseCsvRoh } from './hilfen.mjs';
import { leseUnsicherheitTypen, typFuerFeld, typenDesDatensatzes, pruefeUnsicherheitTypen, filtereErklaerungFuerFeld } from '../js/utils/uncertainty.js';

ladeD3(); setzeTestFetch();
const { ladeCSV } = await import('../js/core/dataLoader.js');
const VOK = { typen: new Set(['zeitlich', 'geographisch', 'attribut']), auspraegungen: new Set(['ungenau', 'fehlend', 'mehrdeutig', 'strittig']) };

test('Parser: Leerzeichen, Groß-/Kleinschreibung, mehrere Doppelpunkte, leere Einträge', () => {
  const e = leseUnsicherheitTypen('  Datum :  Zeitlich / Ungenau |orte: geographisch/mehrdeutig||  | x: y: attribut/fehlend');
  assert.deepEqual(e.map(({ feld, typ, auspraegung }) => [feld, typ, auspraegung]), [
    ['Datum', 'zeitlich', 'ungenau'], ['orte', 'geographisch', 'mehrdeutig'], ['x', 'y: attribut', 'fehlend']
  ]);
  assert.deepEqual(leseUnsicherheitTypen(['datum: zeitlich/ungenau']).length, 1);
  assert.deepEqual(leseUnsicherheitTypen(''), []);
  assert.deepEqual(leseUnsicherheitTypen(undefined), []);
});

test('typFuerFeld und typenDesDatensatzes', () => {
  const r = { unsicherheit_typ: ['DATUM: zeitlich/strittig', 'orte: geographisch/fehlend', 'lat: geographisch/fehlend'] };
  assert.deepEqual(typFuerFeld(r, 'datum'), { typ: 'zeitlich', auspraegung: 'strittig' });
  assert.equal(typFuerFeld(r, 'personen'), null);
  assert.deepEqual(typenDesDatensatzes(r), ['zeitlich', 'geographisch']);
  assert.deepEqual(typenDesDatensatzes({}), []);
});

test('Prüfung: Fehler und Warnungen', () => {
  const ok = pruefeUnsicherheitTypen({ unsicherheit_typ: 'datum: zeitlich/ungenau', datum_unsicher: true }, VOK);
  assert.deepEqual(ok, { fehler: [], warnungen: [] });
  const falsch = pruefeUnsicherheitTypen({ unsicherheit_typ: 'datum: zeitlich/vage|orte: raeumlich/fehlend|kaputt' }, VOK);
  assert.equal(falsch.fehler.length, 3);
  const w1 = pruefeUnsicherheitTypen({ unsicherheit_typ: 'datum: zeitlich/ungenau', datum_unsicher: false }, VOK);
  assert.equal(w1.warnungen.length, 1);
  const w2 = pruefeUnsicherheitTypen({ unsicherheit_typ: '', orte_unsicher: true }, VOK);
  assert.equal(w2.warnungen.length, 1);
  const ohneSpalte = pruefeUnsicherheitTypen({ unsicherheit_typ: 'ausstellungsort: geographisch/fehlend' }, VOK);
  assert.deepEqual(ohneSpalte.warnungen, []);
});

test('filtereErklaerungFuerFeld bleibt unverändert', () => {
  assert.equal(filtereErklaerungFuerFeld(['datum: Nur das Jahr.', 'orte: x'], 'datum'), 'Nur das Jahr.');
});

test('Vokabulardateien: acht Typen, vier Ausprägungen, identifikation als eigene Ergänzung', () => {
  const typen = leseCsvRoh('unsicherheit_typen.csv'); const ausp = leseCsvRoh('unsicherheit_auspraegungen.csv');
  assert.deepEqual(typen.map((t) => t.typ_id), ['zeitlich', 'geographisch', 'zuordnung', 'identifikation', 'beziehung', 'attribut', 'objekt', 'herkunft']);
  assert.deepEqual(ausp.map((a) => a.auspraegung_id), ['ungenau', 'strittig', 'fehlend', 'mehrdeutig']);
  assert.match(typen.find((t) => t.typ_id === 'identifikation').windhager_bezug, /eigene Ergänzung/);
});

for (const datei of ['urkunden', 'buergerbuch', 'familien', 'verlassenschaftsinventare', 'orte', 'bestandsverzeichnis', 'personenliste']) {
  test(`${datei}.csv: unsicherheit_typ ohne Fehler, Warnungen nur dokumentierte`, async () => {
    const { records, errors, warnungen } = await ladeCSV(`data/${datei}.csv`);
    assert.deepEqual(errors.filter((e) => e.spalte === 'unsicherheit_typ'), []);
    const unerwartet = warnungen.filter((w) => {
      const r = records[w.zeile - 2];
      if (datei === 'orte' && /orte_unsicher ist gesetzt/.test(w.grund)) return !(typFuerFeld(r, 'lat') || String(r.ortsart).trim() === 'Herkunftsname');
      if (datei === 'bestandsverzeichnis' && /daten_unsicher ist gesetzt/.test(w.grund)) return typenDesDatensatzes(r).length === 0;
      return true;
    });
    assert.deepEqual(unerwartet, []);
  });
}
