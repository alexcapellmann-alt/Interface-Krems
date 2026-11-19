// Unsicherheits-Erklärungen: Format `<feldname>: <Erklärung>` (SCHEMA.md), feldspezifischer Tooltip, lesbare Feldnamen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { filtereErklaerungFuerFeld, lesbareAnmerkung, feldBezeichnung } from '../js/utils/uncertainty.js';

test('nur die Erklärung des gefragten Feldes', () => {
  const a = ['orte: Ort A unsicher', 'datum: nur das Jahr'];
  assert.equal(filtereErklaerungFuerFeld(a, 'datum'), 'nur das Jahr');
  assert.equal(filtereErklaerungFuerFeld(a, 'orte'), 'Ort A unsicher');
});

test('Abgleich ohne Groß-/Kleinschreibung; mehrere Einträge zum selben Feld werden verbunden', () => {
  assert.equal(filtereErklaerungFuerFeld('Datum: x', 'datum'), 'x');
  assert.equal(filtereErklaerungFuerFeld(['personen: a', 'personen: b'], 'personen'), 'a | b');
});

test('Erklärung mit weiterem Doppelpunkt bleibt vollständig', () => {
  assert.equal(filtereErklaerungFuerFeld('personen_id: vereinheitlicht (vorher x): siehe BB-1', 'personen_id'), 'vereinheitlicht (vorher x): siehe BB-1');
});

test('Rückfall ohne passendes Feld: ganzer Text statt nichts', () => {
  assert.equal(filtereErklaerungFuerFeld('Doppelt erfasst als X', 'datum'), 'Doppelt erfasst als X');
  assert.equal(filtereErklaerungFuerFeld('', 'datum'), '');
});

test('lesbare Feldnamen, unbekannte bleiben roh', () => {
  assert.equal(lesbareAnmerkung(['orte: A', 'datum: B']), 'Ort: A | Datierung: B');
  assert.equal(lesbareAnmerkung('laufnummer: x'), 'laufnummer: x');
  assert.equal(lesbareAnmerkung('zeitraum_von: x'), 'Laufzeit (Beginn): x'); // seit Auftrag 17 bekannt
  assert.equal(lesbareAnmerkung('Doppelt erfasst als A: B'), 'Doppelt erfasst als A: B');
  assert.equal(feldBezeichnung('constructor'), 'constructor');
  assert.equal(feldBezeichnung('Beruf'), 'Beruf');
});
