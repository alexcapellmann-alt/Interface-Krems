// Bestands-Hierarchie: vier Ebenen (Gesamtbestand → bkk_kategorie → bkk_unterkategorie → Bestand), mit den echten Daten.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ladeD3, leseCsvRoh } from './hilfen.mjs';

ladeD3();
const { baueBestandsHierarchie, OHNE_KATEGORIE } = await import('../js/utils/bestandsHierarchie.js');

test('vier Ebenen; jeder Datensatz ist genau ein Blatt', () => {
  const records = leseCsvRoh('bestandsverzeichnis.csv');
  const wurzel = baueBestandsHierarchie(records);
  assert.equal(wurzel.name, 'Gesamtbestand');
  const h = globalThis.d3.hierarchy(wurzel);
  assert.equal(h.height, 3);
  assert.equal(h.leaves().length, records.length);
  for (const blatt of h.leaves()) {
    assert.equal(blatt.depth, 3);
    assert.equal(blatt.parent.data.ebenenTyp !== undefined, true);
  }
});

test('ohne Kategorie und ohne Unterkategorie werden eigene Knoten, nichts fällt weg', () => {
  const wurzel = baueBestandsHierarchie([
    { name: 'A', kuerzel: '1', bkk_kategorie: 'K', bkk_unterkategorie: 'U', umfang_lfm: '2' },
    { name: 'B', kuerzel: '2', bkk_kategorie: '', bkk_unterkategorie: '', umfang_lfm: '' }
  ]);
  const namen = wurzel.children.map((k) => k.name);
  assert.ok(namen.includes('K'));
  assert.ok(namen.includes(OHNE_KATEGORIE));
  assert.equal(globalThis.d3.hierarchy(wurzel).leaves().length, 2);
});
