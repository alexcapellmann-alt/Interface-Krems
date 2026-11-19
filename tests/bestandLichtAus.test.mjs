// tests/bestandLichtAus.test.mjs
// Auftrag 17: Zerlegen der fehlenden Jahrgänge und Zahlen der Bestandsansichten (Strahl, Baum, Sonne) im Modus
// „Licht aus“ auf den echten Daten.
import test from 'node:test';
import assert from 'node:assert/strict';
import { leseCsvRoh } from './hilfen.mjs';
import { zerlegeJahrgaenge, kurztextLuecken, volltextLuecken, anzahlJahrgaenge, ausserhalbDerLaufzeit } from '../js/utils/jahrgaenge.js';
import { bestandEinheit, BESTAND_FELDER } from '../js/utils/bestandLichtAus.js';
import { lichtAusVorbereitung, zaehleFuerLeiste, LEERE_AUSWAHL } from '../js/utils/lichtAus.js';

test('fehlende Jahrgänge zerlegen: Einzeljahr, Spanne, mehrere, ungültig, Array', () => {
  assert.deepEqual(zerlegeJahrgaenge('1786').intervalle, [[1786, 1786]]);
  assert.deepEqual(zerlegeJahrgaenge('1519-1526').intervalle, [[1519, 1526]]);
  assert.deepEqual(zerlegeJahrgaenge('1667-1670|1519-1526|1620').intervalle, [[1519, 1526], [1620, 1620], [1667, 1670]]);
  assert.deepEqual(zerlegeJahrgaenge('1700-1690|abc|1750').ungueltig, ['1700-1690', 'abc']);
  assert.deepEqual(zerlegeJahrgaenge(['1739', '1740']).intervalle, [[1739, 1739], [1740, 1740]]);
  assert.deepEqual(zerlegeJahrgaenge('').intervalle, []);
  const drei = zerlegeJahrgaenge('1519-1526|1656-1662|1667-1670').intervalle;
  assert.equal(kurztextLuecken(drei, 'fehlt'), 'fehlt: 1519–1526, 1656–1662, 1667–1670');
  const vier = zerlegeJahrgaenge('1|2|3|4'.replace(/\d/g, (d) => `170${d}`)).intervalle;
  assert.equal(kurztextLuecken(vier, 'fehlt'), '4 Lücken (4 Jahrgänge)');
  assert.equal(volltextLuecken([[1786, 1786]]), 'Jahrgang 1786 nicht überliefert');
  assert.equal(anzahlJahrgaenge(drei), 8 + 7 + 4);
});

test('Bestandsansichten: Zahlen des Modus auf den Daten (Entwurf Auftrag 16)', () => {
  const bestaende = leseCsvRoh('bestandsverzeichnis.csv');
  assert.equal(bestaende.length, 315);
  const einheiten = bestaende.map((r) => bestandEinheit(r));
  const v = lichtAusVorbereitung(einheiten, LEERE_AUSWAHL);
  const z = zaehleFuerLeiste(einheiten, LEERE_AUSWAHL, v.masse);
  assert.equal(z.alle, 53, 'Bestände mit Typ');
  assert.deepEqual(z.proTyp, { objekt: 31, zeitlich: 18, attribut: 15, herkunft: 2 });
  const jahr = (w) => (/^\d{3,4}$/.test(String(w).trim()) ? Number(w) : null);
  const ohneLaufzeit = bestaende.filter((r) => jahr(r.zeitraum_von) === null || jahr(r.zeitraum_bis) === null);
  assert.equal(ohneLaufzeit.length, 18);
  const mitLuecken = bestaende.map((r) => ({ r, l: zerlegeJahrgaenge(r.fehlende_jahrgaenge).intervalle })).filter((x) => x.l.length);
  assert.equal(mitLuecken.length, 28);
  assert.equal(mitLuecken.reduce((n, x) => n + x.l.length, 0), 109);
  // Lücken ohne Jahresangabe: Typ am Feld, aber keine Jahre
  const ohneJahre = bestaende.filter((r) => /fehlende_jahrgaenge:/.test(r.unsicherheit_typ) && !zerlegeJahrgaenge(r.fehlende_jahrgaenge).intervalle.length);
  assert.equal(ohneJahre.length, 3);
  // Datenbefund (PROJEKTLOG 100): genau ein Bestand nennt Lücken außerhalb seiner Laufzeit
  const ausserhalb = mitLuecken.filter((x) => jahr(x.r.zeitraum_von) !== null && ausserhalbDerLaufzeit(x.l, jahr(x.r.zeitraum_von), jahr(x.r.zeitraum_bis)).length);
  assert.deepEqual(ausserhalb.map((x) => `${x.r.kuerzel} ${ausserhalbDerLaufzeit(x.l, jahr(x.r.zeitraum_von), jahr(x.r.zeitraum_bis)).map((i) => i.join('-'))}`), ['1.2.2.2.1. 1783-1785']);
  assert.ok(BESTAND_FELDER.includes('fehlende_jahrgaenge'));
});
