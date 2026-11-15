// Auftrag 9: Grenze für den Hinweis „größerer Bildschirm“ (js/utils/bildschirmHinweis.js) – reine Funktionen, Grenzwerte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MINDEST_BREITE, MINDEST_HOEHE, istBildschirmZuKlein, istDarstellungsbereichZuKlein } from '../js/utils/bildschirmHinweis.js';

test('Grenzwerte stehen an einer Stelle: 900 × 500', () => {
  assert.equal(MINDEST_BREITE, 900);
  assert.equal(MINDEST_HOEHE, 500);
});

test('istBildschirmZuKlein: genau an der Grenze ist nicht zu klein', () => {
  assert.equal(istBildschirmZuKlein(900, 500), false);
  assert.equal(istBildschirmZuKlein(899, 500), true);
  assert.equal(istBildschirmZuKlein(900, 499), true);
});

test('Stammbaum: gängige Laptop-Fenster sind nicht zu klein (Darstellungsbereich = Fenster − 32 px Rand)', () => {
  for (const [w, h] of [[1280, 720], [1366, 768], [1440, 900], [1536, 864], [1920, 1080], [1366, 657], [1280, 609], [1536, 730]]) {
    assert.equal(istDarstellungsbereichZuKlein(w - 32, h), false, `${w}×${h}`);
  }
});

test('Stammbaum: Telefon und schmale Fenster bekommen den Hinweis', () => {
  assert.equal(istDarstellungsbereichZuKlein(375 - 32, 812), true);
  assert.equal(istDarstellungsbereichZuKlein(844 - 32, 390), true);
  assert.equal(istDarstellungsbereichZuKlein(899, 900), true);
});

test('Stammbaum: Breite oder Höhe 0 (noch nicht gelayoutet) heißt „später messen“, nicht „zu klein“', () => {
  assert.equal(istDarstellungsbereichZuKlein(0, 800), null);
  assert.equal(istDarstellungsbereichZuKlein(1200, 0), null);
});
