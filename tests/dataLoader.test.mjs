// Vertrag des DataLoaders (Masterprompt §6): BOM, Semikolon, Anführungszeichen mit Semikolon und Zeilenumbruch,
// Pipe-Listen, `<feld>_unsicher` als Wahrheitswert, unbekannte Spalten, `errors` (leere Zeilen und fehlende Pflichtwerte).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ladeD3, setzeTestFetch } from './hilfen.mjs';

ladeD3();
const TESTDATEI = '﻿signatur;orte;orte_unsicher;regest;zahl;unbekannt\r\n'
  + 'T-1;Krems|Stein;ja;"Text mit; Semikolon";12;x\r\n'
  + 'T-2;Wien;nein;"Zeile mit\r\nUmbruch und ""Zitat""";3,5;\r\n'
  + ';;;;;\r\n'
  + '\r\n'
  + 'T-3; Linz | Passau ;;ohne Besonderheiten;-7;y\r\n'
  + ';Tulln;;Zeile ohne Signatur;1;\r\n';
setzeTestFetch({ 'data/__test.csv': TESTDATEI });
const { ladeCSV } = await import('../js/core/dataLoader.js');
const ergebnis = await ladeCSV('data/__test.csv');

test('liefert records, schema und errors', () => {
  assert.deepEqual(Object.keys(ergebnis), ['records', 'schema', 'errors']);
});

test('BOM entfernt, Spaltennamen unverändert, unbekannte Spalte bleibt erhalten', () => {
  assert.ok(Object.hasOwn(ergebnis.records[0], 'signatur'));
  assert.equal(ergebnis.records[0].unbekannt, 'x');
});

test('Semikolon und Zeilenumbruch in Anführungszeichen, verdoppelte Anführungszeichen', () => {
  assert.equal(ergebnis.records[0].regest, 'Text mit; Semikolon');
  assert.equal(ergebnis.records[1].regest, 'Zeile mit\r\nUmbruch und "Zitat"');
});

test('Pipe ergibt eine Liste, Leerraum um die Teile wird entfernt', () => {
  assert.deepEqual(ergebnis.records[0].orte, ['Krems', 'Stein']);
  assert.deepEqual(ergebnis.records[2].orte, ['Linz', 'Passau']);
});

test('<feld>_unsicher wird Wahrheitswert und in _unsicherFelder gesammelt', () => {
  assert.equal(ergebnis.records[0].orte_unsicher, true);
  assert.deepEqual(ergebnis.records[0]._unsicherFelder, ['orte']);
  assert.equal(ergebnis.records[1].orte_unsicher, false);
});

test('Zahlen bleiben Text (der Loader rechnet nicht)', () => {
  assert.equal(ergebnis.records[1].zahl, '3,5');
});

test('leere Zeilen stehen in errors und nicht in records', () => {
  const leer = ergebnis.errors.filter((e) => e.grund === 'Zeile ist vollständig leer');
  assert.equal(leer.length, 2);
  assert.equal(ergebnis.records.length, 4);
});

test('Zeile ohne Signatur steht in errors (Zeile, Spalte, Grund) und bleibt in records', () => {
  const fehlend = ergebnis.errors.filter((e) => e.spalte === 'signatur');
  assert.equal(fehlend.length, 1);
  assert.equal(fehlend[0].grund, 'Pflichtwert fehlt: signatur');
  assert.ok(Number.isInteger(fehlend[0].zeile));
  assert.equal(ergebnis.records.at(-1).regest, 'Zeile ohne Signatur');
});

test('fehlende Datei: ladeCSV wirft', async () => {
  await assert.rejects(() => ladeCSV('data/__gibt_es_nicht.csv'));
});
