// Auftrag 13: Modus „Licht aus“ – Zustandslogik als reine Funktionen (js/utils/lichtAus.js), dunkle Akzentfarbe
// (js/utils/kategorieFarben.js: hellGenugAufDunkel), Methodenhinweise je Ansicht und die Zahlen der Pilotansichten auf
// den echten Daten. Dazu die Regel „keine Typnamen im Code“.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ladeD3, leseCsvRoh, WURZEL } from './hilfen.mjs';
import {
  LEERE_AUSWAHL, gruppenSchluessel, eintraegeAus, zaehleGruppen, ermittleMassengruppen, wirksameEintraege, zaehleFuerLeiste,
  schalteTyp, schalteMasse, schalteNurDiese, modusNachWechsel, vorrangigeAuspraegung, musterFuer, fehlendeTypen,
  hinweiseFuerAnsicht, hinweisFuerGruppe, lichtAusVorbereitung
} from '../js/utils/lichtAus.js';
import { MASSEN_SCHWELLE, MUSTER_JE_AUSPRAEGUNG, MUSTER_VORRANG } from '../js/config/lichtAus.js';

ladeD3();
const { hellGenugAufDunkel, wcagKontrast } = await import('../js/utils/kategorieFarben.js');

const E = (feld, typ, auspraegung, datei = 'x.csv') => ({ datei, feld, typ, auspraegung });
const einheit = (...eintraege) => ({ eintraege });

test('Auswahl: Alle, ein Typ, mehrere Typen, zurück zu Alle', () => {
  let a = { ...LEERE_AUSWAHL };
  a = schalteTyp(a, 't1'); assert.deepEqual(a.typen, ['t1']);
  a = schalteTyp(a, 't2'); assert.deepEqual(a.typen, ['t1', 't2']);
  a = schalteTyp(a, 't1'); assert.deepEqual(a.typen, ['t2']);
  a = schalteTyp(a, 't2'); assert.equal(a.typen, 'alle', 'leere Auswahl gilt als Alle');
  a = schalteTyp(schalteTyp(a, 't1'), 'alle'); assert.equal(a.typen, 'alle');
  assert.equal(schalteNurDiese(a).nurDiese, true);
  assert.deepEqual(schalteMasse(schalteMasse(a, 'g'), 'g').masseEin, []);
});

test('wirksame Einträge: Typfilter und Massengruppen', () => {
  const eintraege = [E('datum', 't1', 'a1'), E('ort', 't2', 'a2'), E('masse', 't2', 'a3')];
  const masse = [gruppenSchluessel(eintraege[2])];
  assert.equal(wirksameEintraege(eintraege, LEERE_AUSWAHL, masse).length, 2, 'Masse zählt bei Alle nicht');
  assert.equal(wirksameEintraege(eintraege, { typen: ['t2'], masseEin: [] }, masse).length, 1, 'auch nicht bei Wahl ihres Typs');
  assert.equal(wirksameEintraege(eintraege, { typen: ['t1'], masseEin: masse }, masse).length, 2, 'nur über ihren Schalter');
});

test('Massengruppen: Schwelle auf den ganzen Daten, Grenze eingeschlossen', () => {
  const alle = [einheit(E('a', 't', 'x')), einheit(E('a', 't', 'x'), E('a', 't', 'x')), einheit(E('b', 't', 'y')), einheit()];
  assert.deepEqual(ermittleMassengruppen(alle, 0.5).map((g) => g.feld), ['a'], 'eine Einheit zählt je Gruppe einmal: 2/4 = 50 %');
  assert.deepEqual(ermittleMassengruppen(alle, 0.51), []);
  assert.equal(zaehleGruppen(alle).get(gruppenSchluessel(E('b', 't', 'y'))).anzahl, 1);
});

test('Zähler der Leiste und ausgegraute Typen', () => {
  const einheiten = [einheit(E('a', 't1', 'x')), einheit(E('b', 't2', 'y'), E('m', 't3', 'z')), einheit()];
  const masse = [gruppenSchluessel(E('m', 't3', 'z'))];
  const z = zaehleFuerLeiste(einheiten, LEERE_AUSWAHL, masse);
  assert.equal(z.alle, 2);
  assert.deepEqual(z.proTyp, { t1: 1, t2: 1 });
  assert.deepEqual(Object.values(z.proMasse), [1]);
  assert.deepEqual(z.auspraegungen.sort(), ['x', 'y']);
  const vok = ['t1', 't2', 't3', 't4'].map((typ_id) => ({ typ_id }));
  assert.deepEqual(fehlendeTypen(vok, z.proTyp, z.proMasse, [{ schluessel: masse[0], typ: 't3' }]), ['t4'], 't3 kommt als Massengruppe vor');
});

test('Moduswechsel beim Ansichtenwechsel', () => {
  assert.equal(modusNachWechsel({ aktiv: true, vorherLichtAus: true, nachherLichtAus: true }), true, 'zwischen Pilotansichten bleibt er');
  assert.equal(modusNachWechsel({ aktiv: true, vorherLichtAus: true, nachherLichtAus: false }), false, 'in andere Ansichten: Licht an');
  assert.equal(modusNachWechsel({ aktiv: true, vorherLichtAus: false, nachherLichtAus: true }), false, 'alter Modus wird nicht zu Licht aus');
  assert.equal(modusNachWechsel({ aktiv: false, vorherLichtAus: true, nachherLichtAus: true }), false);
});

test('Muster je Ausprägung: Vorrang und Rückfall', () => {
  assert.equal(vorrangigeAuspraegung(['ungenau', 'strittig'], MUSTER_VORRANG), 'strittig');
  assert.equal(vorrangigeAuspraegung(['neu'], MUSTER_VORRANG), 'neu');
  assert.equal(musterFuer('neu', MUSTER_JE_AUSPRAEGUNG), 'ohne');
  const ausp = leseCsvRoh('unsicherheit_auspraegungen.csv').map((a) => a.auspraegung_id);
  for (const a of ausp) assert.ok(MUSTER_JE_AUSPRAEGUNG[a], `Muster für ${a}`);
  assert.equal(new Set(Object.values(MUSTER_JE_AUSPRAEGUNG)).size, ausp.length, 'jede Ausprägung ein eigenes Muster');
});

test('Dunkle Akzentfarbe: mindestens 4,5:1 gegen beide dunklen Flächen', () => {
  const css = fs.readFileSync(path.join(WURZEL, 'css/base.css'), 'utf8');
  const wert = (name) => css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))[1];
  const gruende = [wert('--lichtaus-bg'), wert('--lichtaus-surface')];
  const archiv = leseCsvRoh('archiv.csv');
  const akzent = archiv.find((z) => z.schluessel === 'akzentfarbe')?.wert || wert('--accent');
  for (const basis of [akzent, '#000000', '#2c4a6e', '#7a1f2e', '#ffff00']) {
    const dunkel = hellGenugAufDunkel(basis, gruende, 4.5);
    for (const g of gruende) assert.ok(wcagKontrast(dunkel, g) >= 4.5, `${basis} → ${dunkel} gegen ${g}`);
  }
  // Schrift auf dem dunklen Akzent (--accent-text = --lichtaus-bg)
  assert.ok(wcagKontrast(hellGenugAufDunkel(akzent, gruende, 4.5), gruende[0]) >= 4.5);
});

test('Methodenhinweise je Pilotansicht (geltungsbereich)', () => {
  const hinweise = leseCsvRoh('methodenhinweise.csv');
  const ids = (ansicht) => hinweiseFuerAnsicht(hinweise, ansicht).map((h) => h.id).sort();
  assert.deepEqual(ids({ felder: { 'urkunden.csv': ['datum', 'orte', 'personen', 'ausstellungsort', 'kategorien'] }, namen: ['Regesten'], bereich: 'Urkunden' }),
    ['ausstellungsort', 'kategorien', 'orte_personen_urkunden']);
  assert.deepEqual(ids({ felder: { 'orte.csv': ['orte'], 'urkunden.csv': ['orte', 'datum'] }, namen: ['Karte'], bereich: 'Orte' }), ['orte_personen_urkunden']);
  assert.deepEqual(ids({ felder: { 'familien.csv': ['geburtsdatum', 'sterbedatum'] }, namen: ['Stammbaum'], bereich: 'Personen' }), ['familienbaum_eltern']);
  assert.equal(hinweisFuerGruppe(hinweise, { datei: 'urkunden.csv', feld: 'ausstellungsort' })?.id, 'ausstellungsort');
});

test('Zahlen der Pilotansichten auf den Daten (Schwelle aus der Konfiguration)', () => {
  assert.equal(MASSEN_SCHWELLE, 0.30);
  // Regesten: Einheit = Urkunde, Felder datum/orte/personen/ausstellungsort
  const urkunden = leseCsvRoh('urkunden.csv');
  const kacheln = urkunden.map((r) => ({ eintraege: eintraegeAus(r, 'urkunden.csv', ['datum', 'orte', 'personen', 'ausstellungsort']) }));
  const v = lichtAusVorbereitung(kacheln, LEERE_AUSWAHL);
  assert.deepEqual(v.massengruppen.map((g) => `${g.feld} ${g.typ}/${g.auspraegung} ${g.anzahl}`), ['ausstellungsort geographisch/fehlend 571']);
  const z = zaehleFuerLeiste(kacheln, LEERE_AUSWAHL, v.masse);
  // 210 Urkunden mit Typ bei Datum, Orten oder Personen + 3 nur mit „Ausstellungsort ungenau“ (Feldlager, keine Massengruppe)
  assert.equal(z.alle, 213, 'Alle ohne Massenangabe (PROJEKTLOG 95; alter σ-Filter: 215)');
  assert.deepEqual(z.proTyp, { zeitlich: 77, geographisch: 72, identifikation: 85 });
  assert.equal(zaehleFuerLeiste(kacheln, { typen: 'alle', masseEin: v.masse }, v.masse).alle, 687);
  // Stammbaum: keine Massengruppe (Geburtsdatum ungenau 25 % < 30 %)
  const familien = leseCsvRoh('familien.csv').map((r) => ({ eintraege: eintraegeAus(r, 'familien.csv', ['geburtsdatum', 'sterbedatum']) }));
  assert.deepEqual(lichtAusVorbereitung(familien, LEERE_AUSWAHL).massengruppen, []);
});

test('Keine Typnamen im Code (Typen kommen aus unsicherheit_typen.csv)', () => {
  const typen = leseCsvRoh('unsicherheit_typen.csv').map((t) => t.typ_id);
  const muster = new RegExp(`['"\`](${typen.join('|')})['"\`/]`);
  const funde = [];
  const geh = (ordner) => fs.readdirSync(ordner, { withFileTypes: true }).forEach((e) => {
    const p = path.join(ordner, e.name);
    if (e.isDirectory()) geh(p); else if (p.endsWith('.js') && muster.test(fs.readFileSync(p, 'utf8'))) funde.push(path.relative(WURZEL, p));
  });
  geh(path.join(WURZEL, 'js'));
  assert.deepEqual(funde, []);
});
