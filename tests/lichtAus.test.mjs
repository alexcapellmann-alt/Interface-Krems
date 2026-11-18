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
import { pruefeUnsicherheitTypen, leseUnsicherheitTypen, erklaerungFuerFeldAus, beschreibungFuerFelder } from '../js/utils/uncertainty.js';
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
  // Seit 16.11.2026 keine Sonderbehandlung von Massenangaben: „Ausstellungsort fehlt“ zählt bei „Alle“ mit
  assert.equal(MASSEN_SCHWELLE, null);
  // Regesten: Einheit = Urkunde, Felder datum/orte/personen/ausstellungsort
  const urkunden = leseCsvRoh('urkunden.csv');
  const kacheln = urkunden.map((r) => ({ eintraege: eintraegeAus(r, 'urkunden.csv', ['datum', 'orte', 'personen', 'ausstellungsort', 'bilder', 'kategorien']) }));
  const v = lichtAusVorbereitung(kacheln, LEERE_AUSWAHL);
  assert.deepEqual(v.massengruppen, []);
  const z = zaehleFuerLeiste(kacheln, LEERE_AUSWAHL, v.masse);
  // 213 wie bisher (PROJEKTLOG 95) + die Urkunden, die nur „Ausstellungsort fehlt“ tragen
  assert.equal(z.alle, 687);
  // seit 16./18.11.2026 dazu: Fotos (StAK-UrkSt-0004, Einzelangabe) und Kategorien (StaAKr-0566b und 13 Urkunden ohne
  // Kategorien, Zuordnung); alle tragen schon „Ausstellungsort fehlt“, „Alle“ bleibt deshalb 687
  assert.deepEqual(z.proTyp, { zeitlich: 77, geographisch: 617, identifikation: 85, zuordnung: 14, attribut: 1 });
  // Mit der früheren Schwelle 30 % wäre „Ausstellungsort fehlt“ (571) die einzige Massengruppe (Regel bleibt prüfbar)
  const frueher = lichtAusVorbereitung(kacheln, LEERE_AUSWAHL, 0.30);
  assert.deepEqual(frueher.massengruppen.map((g) => `${g.feld} ${g.typ}/${g.auspraegung} ${g.anzahl}`), ['ausstellungsort geographisch/fehlend 571']);
  // 213 + StAK-UrkSt-0004 und StaAKr-0566b (Fotos, Kategorien) = 215; dieselbe Zahl wie der alte σ-Filter, andere Menge
  // (PROJEKTLOG 95, Nachtrag 16.11.2026)
  assert.equal(zaehleFuerLeiste(kacheln, LEERE_AUSWAHL, frueher.masse).alle, 215);
  // Stammbaum: keine Massengruppe
  const familien = leseCsvRoh('familien.csv').map((r) => ({ eintraege: eintraegeAus(r, 'familien.csv', ['geburtsdatum', 'sterbedatum']) }));
  assert.deepEqual(lichtAusVorbereitung(familien, LEERE_AUSWAHL, 0.30).massengruppen, []);
});

test('urkunden.csv: Typ und Markierung passen zusammen (ausstellungsort_unsicher seit 16.11.2026)', () => {
  const vok = { typen: new Set(leseCsvRoh('unsicherheit_typen.csv').map((t) => t.typ_id)), auspraegungen: new Set(leseCsvRoh('unsicherheit_auspraegungen.csv').map((a) => a.auspraegung_id)) };
  const probleme = [];
  for (const roh of leseCsvRoh('urkunden.csv')) {
    const r = { ...roh };
    Object.keys(r).filter((k) => /_unsicher$/.test(k)).forEach((k) => { r[k] = r[k] === 'ja'; });
    const { fehler, warnungen } = pruefeUnsicherheitTypen(r, vok);
    if (fehler.length || warnungen.length) probleme.push(`${roh.signatur}: ${[...fehler, ...warnungen].join('; ')}`);
  }
  assert.deepEqual(probleme, []);
  assert.equal(leseCsvRoh('urkunden.csv').filter((r) => r.ausstellungsort_unsicher === 'ja').length, 578); // 18.11.2026: + StaAKr-0155, StAK-UrkKr-0520 (Auftrag 15), StaAKr-0564 (Auftrag 16)
  assert.equal(leseCsvRoh('urkunden.csv').filter((r) => r.kategorien_unsicher === 'ja').length, 14);
});

test('Standardtexte: gültige Schlüssel, und jedes Feld mit Typ ohne eigene Anmerkung in urkunden.csv hat einen Text', () => {
  const texte = leseCsvRoh('unsicherheit_standardtexte.csv');
  const ausp = new Set(leseCsvRoh('unsicherheit_auspraegungen.csv').map((a) => a.auspraegung_id));
  const spalten = {};
  for (const t of texte) {
    spalten[t.datei] ??= Object.keys(leseCsvRoh(t.datei)[0] || {});
    assert.ok(spalten[t.datei].includes(t.feld), `${t.datei}: Spalte ${t.feld} fehlt`);
    assert.ok(ausp.has(t.auspraegung), `unbekannte Ausprägung ${t.auspraegung}`);
    assert.ok(t.text.trim(), `${t.datei}/${t.feld}/${t.auspraegung}: Text leer`);
  }
  const schluessel = new Set(texte.map((t) => `${t.datei}|${t.feld}|${t.auspraegung}`));
  assert.equal(schluessel.size, texte.length, 'Schlüssel doppelt');
  const ohneText = [];
  for (const r of leseCsvRoh('urkunden.csv')) {
    const mitAnmerkung = new Set(String(r.unsicherheit_anmerkung || '').split('|').map((a) => /^\s*([^:]+):/.exec(a)?.[1].trim().toLowerCase()).filter(Boolean));
    for (const e of leseUnsicherheitTypen(r.unsicherheit_typ)) {
      if (['ausstellungsort', 'kategorien'].includes(e.feld) && !mitAnmerkung.has(e.feld) && !schluessel.has(`urkunden.csv|${e.feld}|${e.auspraegung}`)) ohneText.push(`${r.signatur} ${e.feld}`);
    }
  }
  assert.deepEqual(ohneText, []);
});

test('Zugängliche Beschreibung der Kachel: Ausstellungsort fehlt → „Im Regest nicht angegeben.“ (Auftrag 14, Punkt 2)', () => {
  const standardtexte = leseCsvRoh('unsicherheit_standardtexte.csv');
  const roh = leseCsvRoh('urkunden.csv').find((r) => r.signatur === 'StaKr-0103');
  const record = { ...roh, unsicherheit_anmerkung: roh.unsicherheit_anmerkung ? roh.unsicherheit_anmerkung.split('|') : [] };
  const felder = leseUnsicherheitTypen(record.unsicherheit_typ).map((e) => e.feld);
  const beschreibung = beschreibungFuerFelder(record, 'urkunden.csv', felder, standardtexte);
  assert.match(beschreibung, /Ausstellungsort: Im Regest nicht angegeben\./);
  assert.match(beschreibung, /Kategorien: Keine inhaltliche Kategorie zugeordnet\./);
  // eigene Anmerkung geht vor, fremde Felder werden nicht übernommen
  const r2 = { unsicherheit_typ: 'ausstellungsort: geographisch/fehlend|bilder: attribut/mehrdeutig', unsicherheit_anmerkung: ['bilder: Zuordnung offen'] };
  assert.equal(erklaerungFuerFeldAus(r2, 'urkunden.csv', 'ausstellungsort', standardtexte), 'Im Regest nicht angegeben.');
  assert.equal(erklaerungFuerFeldAus(r2, 'urkunden.csv', 'bilder', standardtexte), 'Zuordnung offen');
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
