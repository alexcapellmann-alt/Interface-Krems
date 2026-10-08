// js/fuehrungen/fuehrungenDaten.js
// AUFTRAG "Führungen, Teil 2a", Punkt 1+2: lädt fuehrungen.csv PLUS alle fünf
// Quell-CSVs aus der beleg-Präfixtabelle (docs/SCHEMA.md Abschnitt 10) lazy
// (erst bei erstem Aufruf, memoisiert) und baut daraus eine geprüfte,
// gruppierte Datenstruktur: eine Zeile pro Station, Führungsangaben nur aus
// der Zeile mit der niedrigsten station_nr, Reihenfolge nach erstem
// Auftreten in der Datei (Auftrag wörtlich, Punkt 2).
//
// Prüfregeln (Punkt 2, Tabelle im Auftrag) laufen HIER, nicht erst in der
// Darstellung - jede Station/jeder Beleg trägt ihr/sein Ergebnis bereits
// fertig aufbereitet (record + fehler) in sich, die Darstellungsmodule
// (fuehrungenGalerie.js/fuehrungStation.js/belegDarstellung.js) müssen die
// Quell-CSVs selbst nicht kennen.

import { ladeGecachteCSV } from '../core/datenCache.js';
import { ermittleVertiefungsLink } from '../utils/datensatzAufruf.js';

// Präfixtabelle aus docs/SCHEMA.md Abschnitt 10 - gegen die tatsächlichen
// Spaltennamen der Quell-CSVs geprüft (siehe PROJEKTLOG).
// AUFTRAG "Teil 2f", Punkt 2: neuer Belegtyp `familie` -> data/familien.csv
// (derselbe Habsburg-Stammbaum-Datensatz, den js/viz/familienbaum.js/
// chordDiagramm.js bereits als `familien` laden), id-Spalte `id`.
// AUFTRAG B2: exportiert (unverändert), damit js/core/app.js die Belegquellen einer
// Station für den Hinweisbalken kennt.
export const BELEG_QUELLEN = {
  urkunde: { pfad: 'data/urkunden.csv', idFeld: 'signatur' },
  buergerbuch: { pfad: 'data/buergerbuch.csv', idFeld: 'id' },
  inventar: { pfad: 'data/verlassenschaftsinventare.csv', idFeld: 'id' },
  bestand: { pfad: 'data/bestandsverzeichnis.csv', idFeld: 'kuerzel' },
  person: { pfad: 'data/personenliste.csv', idFeld: 'personen_id' },
  familie: { pfad: 'data/familien.csv', idFeld: 'id' }
};

let datenPromise = null;

// AUFTRAG B3: Eine fehlende (404) oder leere Belegquelle bricht das Laden
// NICHT mehr ab - vorher scheiterten damit alle Führungen. Die Quelle bekommt
// eine leere Karte, und `nichtVerfuegbar` hält fest, warum sie fehlt; nur die
// Belege, die darauf verweisen, zeigen dann einen Hinweis (parseBeleg()).
// Der Schlüssel `nichtVerfuegbar` kollidiert nicht mit Belegtypen, weil
// parseBeleg() den Typ vorher gegen BELEG_QUELLEN prüft.
async function ladeQuellKarten() {
  const nichtVerfuegbar = {};
  const eintraege = await Promise.all(
    Object.entries(BELEG_QUELLEN).map(async ([typ, { pfad, idFeld }]) => {
      const records = await ladeGecachteCSV(pfad).catch(() => null);
      if (!records) nichtVerfuegbar[typ] = 'fehlt';
      else if (records.length === 0) nichtVerfuegbar[typ] = 'ist leer';
      return [typ, new Map((records || []).map((r) => [r[idFeld], r]))];
    })
  );
  return { ...Object.fromEntries(eintraege), nichtVerfuegbar };
}

// AUFTRAG B3: Hinweistext für eine nicht verfügbare Quelle, oder null.
// AUFTRAG C3, Punkt 8: Komma statt Doppelpunkt - die Darstellung setzt
// "Hinweis: " davor (Beleg mit `quelleFehlt`, siehe belegDarstellung.js).
function quellenHinweis(quellKarten, typ, anfang = 'Beleg nicht verfügbar') {
  const grund = quellKarten.nichtVerfuegbar[typ];
  if (!grund) return null;
  return `${anfang}, Quelle ${BELEG_QUELLEN[typ].pfad.replace(/^data\//, '')} ${grund}`;
}

// Text (Punkt 2, Auftrag wörtlich): Absätze an `|` trennen, aufeinander-
// folgende, mit `- ` beginnende Absätze werden zu EINER Liste zusammengefasst.
function parseText(rohtext) {
  const absaetze = (Array.isArray(rohtext) ? rohtext : (rohtext ? [rohtext] : []));
  const bloecke = [];
  absaetze.forEach((absatz) => {
    if (absatz.startsWith('- ')) {
      const letzter = bloecke[bloecke.length - 1];
      const punkt = absatz.slice(2).trim();
      if (letzter && letzter.art === 'liste') letzter.punkte.push(punkt);
      else bloecke.push({ art: 'liste', punkte: [punkt] });
    } else {
      bloecke.push({ art: 'absatz', text: absatz });
    }
  });
  return bloecke;
}

// beleg (Punkt 2): an `|` trennen, je Eintrag am ERSTEN Doppelpunkt in
// Typ/ID teilen. `bild` schlägt keine Quell-CSV nach (ID = Bildpfad),
// braucht aber `bild_text` (sonst Prüfregel-Fehler "Bild ohne Bildunterschrift").
function parseBeleg(rohbeleg, quellKarten, bildText) {
  const eintraege = (Array.isArray(rohbeleg) ? rohbeleg : (rohbeleg ? [rohbeleg] : []));
  return eintraege.map((eintrag) => {
    const doppelpunkt = eintrag.indexOf(':');
    const typ = doppelpunkt === -1 ? eintrag : eintrag.slice(0, doppelpunkt).trim();
    const id = doppelpunkt === -1 ? '' : eintrag.slice(doppelpunkt + 1).trim();

    if (typ === 'bild') {
      const fehlt = !bildText || !bildText.trim();
      return { typ, id, record: null, fehler: fehlt ? `Bild „${id}" ohne bild_text (Bildunterschrift/Alt-Text)` : null };
    }
    if (!BELEG_QUELLEN[typ]) {
      return { typ, id, record: null, fehler: `Unbekannter Belegtyp „${typ}" (Eintrag „${eintrag}")` };
    }
    const nichtVerfuegbar = quellenHinweis(quellKarten, typ);
    if (nichtVerfuegbar) return { typ, id, record: null, fehler: nichtVerfuegbar, quelleFehlt: true };
    const record = quellKarten[typ].get(id);
    if (!record) {
      return { typ, id, record: null, fehler: `${typ}:${id} - ID nicht in ${BELEG_QUELLEN[typ].pfad} gefunden` };
    }
    // AUFTRAG "Teil 2f", Punkt 2: `familie` braucht zusätzlich zum eigenen
    // Record die VOLLSTÄNDIGE familien.csv-Karte, um Eltern/Ehepartner-IDs
    // zu Namen aufzulösen (belegDarstellung.js' baueFamilieInhalt()) - hier
    // am Beleg mitgegeben statt baueBelegBereich()s Signatur zu ändern, da
    // nur dieser eine Typ eine zweite Karte braucht.
    // AUFTRAG "Teil 2g", Punkt 4: `buergerbuch` braucht zusätzlich die
    // VOLLSTÄNDIGE personenliste.csv-Karte, um die `buergen_id`-Liste zu
    // Namen aufzulösen (`Buergen` selbst ist reiner, nicht zu `buergen_id`
    // index-paralleler Freitext, siehe belegDarstellung.js' Kommentar zu
    // baueBuergerbuchInhalt()) - dieselbe Karte, die `person`-Belege ohnehin
    // schon referenzieren (`quellKarten.person`, BELEG_QUELLEN oben).
    if (typ === 'familie') return { typ, id, record, fehler: null, familienKarte: quellKarten.familie };
    if (typ === 'buergerbuch') {
      // AUFTRAG B3: Ohne personenliste.csv lassen sich die Bürgen nur als ID
      // zeigen - der Beleg bleibt sichtbar, mit Hinweis darüber.
      const buergen = Array.isArray(record.buergen_id) ? record.buergen_id : (record.buergen_id ? [record.buergen_id] : []);
      const fehler = buergen.length > 0 ? quellenHinweis(quellKarten, 'person', 'Bürgennamen nicht verfügbar') : null;
      return { typ, id, record, fehler, quelleFehlt: Boolean(fehler), personenKarte: quellKarten.person };
    }
    return { typ, id, record, fehler: null };
  });
}

// AUFTRAG "Fuehrungen, Teil 2b", Punkt 6: vertiefung an `|` trennen, jeder
// Eintrag ein roher Hash-Pfad ("#visualisierungen/urkunden/zeitachse").
// Neue Pruefregel (Stil 2a): Pfad existiert nicht in der Registry -> sicht-
// barer Fehlerhinweis statt Link (js/utils/datensatzAufruf.js'
// ermittleVertiefungsLink() ist dieselbe Stelle, die auch spaeter entfernte
// Ansichten erkennt - "Fuehrungen haengen nicht an einzelnen Ansichten").
function parseVertiefung(rohVertiefung) {
  const eintraege = (Array.isArray(rohVertiefung) ? rohVertiefung : (rohVertiefung ? [rohVertiefung] : []));
  return eintraege.map((pfad) => ermittleVertiefungsLink(pfad));
}

// Baut eine einzelne Station aus ihrer Rohzeile. `istErsteStation` steuert,
// ob Führungsangaben aus dieser Zeile gelten (Punkt 2: "aus der Zeile mit
// der niedrigsten station_nr").
function baueStation(zeile, quellKarten, ersteZeile) {
  const stationWarnungen = [];
  if (zeile !== ersteZeile) {
    ['fuehrung_titel', 'leitfrage', 'kurzbeschreibung', 'themenbereich', 'zeitraum', 'status', 'weiterlesen']
      .forEach((feld) => {
        const wert = zeile[feld];
        const gefuellt = Array.isArray(wert) ? wert.length > 0 : Boolean(wert && wert.trim());
        if (gefuellt) stationWarnungen.push(`Feld „${feld}" ist hier abweichend befüllt - nur die erste Station gilt.`);
      });
  }
  return {
    station_nr: Number(zeile.station_nr),
    station_titel: zeile.station_titel,
    station_zeitraum: zeile.station_zeitraum,
    textBloecke: parseText(zeile.text),
    belege: parseBeleg(zeile.beleg, quellKarten, zeile.bild_text),
    bild_text: zeile.bild_text || '',
    unsicherheit_hinweis: zeile.unsicherheit_hinweis || '',
    vertiefung: parseVertiefung(zeile.vertiefung),
    stationWarnungen
  };
}

// AUFTRAG "Fuehrungen, Teil 2c", Punkt 2: weiterlesen an "|" trennen (siehe
// dataLoader.js, automatisches Pipe-Splitting), jeder Eintrag ein
// literatur_id - neue Pruefregel im Stil von 2a: ID nicht in literatur.csv
// gefunden -> fehler statt record (fuehrungAbschluss.js zeigt dann den
// Fehlerhinweis an dieser Stelle).
// AUFTRAG C3, Punkt 7: `literaturGrund` ("fehlt"/"ist leer") - dann trägt
// jeder Eintrag nur den Hinweis, die Führung selbst bleibt bedienbar.
function parseWeiterlesen(rohWeiterlesen, literaturKarte, literaturGrund) {
  const eintraege = (Array.isArray(rohWeiterlesen) ? rohWeiterlesen : (rohWeiterlesen ? [rohWeiterlesen] : []));
  if (literaturGrund) {
    return eintraege.map(() => ({ record: null, fehler: `Literaturangabe nicht verfügbar, Quelle literatur.csv ${literaturGrund}`, quelleFehlt: true }));
  }
  return eintraege.map((id) => {
    const record = literaturKarte.get(id);
    return record ? { record, fehler: null } : { record: null, fehler: `weiterlesen: literatur_id „${id}" nicht in literatur.csv gefunden` };
  });
}

// Baut eine Führung aus all ihren Rohzeilen (bereits in Datei-Reihenfolge).
function baueFuehrung(fuehrungId, zeilen, quellKarten, literaturKarte, literaturGrund) {
  const kopfFehler = [];
  const nummern = zeilen.map((z) => z.station_nr);
  const doppelte = nummern.filter((n, i) => nummern.indexOf(n) !== i);
  if (doppelte.length > 0) kopfFehler.push(`Doppelte station_nr: ${[...new Set(doppelte)].join(', ')}`);
  if (nummern.some((n) => !n || !n.trim())) kopfFehler.push('Mindestens eine Zeile hat keine station_nr.');

  const sortiert = [...zeilen].sort((a, b) => Number(a.station_nr) - Number(b.station_nr));
  const ersteZeile = sortiert[0];
  const kurzbeschreibung = ersteZeile.kurzbeschreibung || '';

  return {
    fuehrung_id: fuehrungId,
    fuehrung_titel: ersteZeile.fuehrung_titel || '',
    leitfrage: ersteZeile.leitfrage || '',
    kurzbeschreibung,
    themenbereich: ersteZeile.themenbereich || '(ohne Themenbereich)',
    zeitraum: ersteZeile.zeitraum || '',
    status: ersteZeile.status || 'entwurf',
    kopfFehler,
    kurzbeschreibungZuLang: kurzbeschreibung.length > 300,
    weiterlesen: parseWeiterlesen(ersteZeile.weiterlesen, literaturKarte, literaturGrund),
    stationen: sortiert.map((zeile) => baueStation(zeile, quellKarten, ersteZeile))
  };
}

function gruppiereNachFuehrung(zeilen) {
  const reihenfolge = [];
  const gruppen = new Map();
  zeilen.forEach((zeile) => {
    const id = zeile.fuehrung_id;
    if (!id) return;
    if (!gruppen.has(id)) { gruppen.set(id, []); reihenfolge.push(id); }
    gruppen.get(id).push(zeile);
  });
  return reihenfolge.map((id) => [id, gruppen.get(id)]);
}

export function ladeFuehrungenDaten() {
  if (!datenPromise) {
    datenPromise = (async () => {
      // AUFTRAG B2 (Cache-Umstellung): über den gemeinsamen Cache statt ladeCSV().
      const [fuehrungenZeilen, quellKarten, literaturZeilen] = await Promise.all([
        ladeGecachteCSV('data/fuehrungen.csv'),
        ladeQuellKarten(),
        // AUFTRAG C3, Punkt 7: fehlt literatur.csv, fallen die Führungen nicht
        // mehr aus - nur "Zum Weiterlesen" zeigt dann den Hinweis.
        ladeGecachteCSV('data/literatur.csv').catch(() => null)
      ]);
      // AUFTRAG F, Punkt 5: ohne Spalte `zitation` stand sonst "undefined" im Eintrag -
      // jetzt derselbe Hinweis wie bei fehlender Datei (Balken: datenAnforderungen.js, `bedarf`).
      const literaturGrund = !literaturZeilen ? 'fehlt'
        : (literaturZeilen.length === 0 ? 'ist leer' : (!('zitation' in literaturZeilen[0]) ? "ohne Spalte 'zitation'" : null));
      const literaturKarte = new Map((literaturZeilen || []).map((r) => [r.literatur_id, r]));
      const gruppen = gruppiereNachFuehrung(fuehrungenZeilen);
      const fuehrungen = gruppen.map(([id, zeilen]) => baueFuehrung(id, zeilen, quellKarten, literaturKarte, literaturGrund));
      return { fuehrungen };
    })();
  }
  return datenPromise;
}
