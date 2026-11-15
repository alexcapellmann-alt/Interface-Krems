// Datierungsgenauigkeit: alle Beispiele der Mustertabelle aus Masterprompt §12 und die Randfälle aus Nachbesserung 7.
import test from 'node:test';
import assert from 'node:assert/strict';
import { leiteDatumsPraezisionAb, datumsHinweis } from '../js/utils/datePrecision.js';

test('Mustertabelle Masterprompt §12', () => {
  assert.equal(leiteDatumsPraezisionAb('1347 III 12'), 'exact');
  assert.equal(leiteDatumsPraezisionAb('1347 VIII'), 'month');
  assert.equal(leiteDatumsPraezisionAb('um 1400'), 'approx');
  assert.equal(leiteDatumsPraezisionAb('1347'), 'year');
  assert.equal(leiteDatumsPraezisionAb(''), 'undatiert');
});

test('weitere ungefähre Angaben', () => {
  for (const t of ['ca. 1300', 'ca 1300', 'vor 1450', 'nach 1500', 'Ende 1499', 'Mitte 1350']) assert.equal(leiteDatumsPraezisionAb(t), 'approx', t);
});

test('leer, null und ausdrücklich ohne Datum ergeben undatiert', () => {
  for (const t of [null, undefined, '   ', 'o. D.', 'o.D.', 'o. D', 'undatiert', 'Undatiert', 'ohne Datum', 'nicht überliefert']) assert.equal(leiteDatumsPraezisionAb(t), 'undatiert', String(t));
});

test('unmöglicher Tag oder Monat ergibt das Jahr und einen Vermerk', () => {
  for (const t of ['1347 III 32', '1347 XIII 1', '1347 XIII', '1347 II 30', '1347 IV 31', '1347 III 0']) {
    assert.equal(leiteDatumsPraezisionAb(t), 'year', t);
    assert.notEqual(datumsHinweis(t), '', t);
  }
  assert.equal(leiteDatumsPraezisionAb('1347 II 29'), 'exact');
  assert.equal(datumsHinweis('1347 III 12'), '');
});

test('Formen außerhalb der Tabelle bleiben year (Tabelle: „alles andere“)', () => {
  for (const t of ['15. Jh.', 'Ende 15. Jh.', '1450/51', '13.3.1347']) assert.equal(leiteDatumsPraezisionAb(t), 'year', t);
});
