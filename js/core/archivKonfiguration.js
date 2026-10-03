// js/core/archivKonfiguration.js
// AUFTRAG "Archivspezifische Texte und Identität in CSV-Dateien", Punkt 2.1:
// gemeinsamer Loader für die vier Konfigurationsdateien (archiv.csv,
// startseite.csv, ueber.csv, infotexte.csv), damit andere Kommunalarchive
// das Interface ohne Programmierkenntnisse nachnutzen können - alle
// archivspezifischen Texte/Angaben stehen jetzt in diesen CSVs statt fest
// im Code (Ausnahme laut Auftrag: CAT_COLORS, kein Setup-Assistent).
//
// Drei bereitgestellte Funktionen (Auftrag wörtlich):
// - konfigurationswert(schluessel) - ein Wert aus archiv.csv
// - ladeSeitenBloecke(pfad) - Blöcke einer Seite (startseite.csv/ueber.csv),
//   nach `reihenfolge` sortiert, nur `sichtbar=ja`, Platzhalter aufgelöst
// - infotextFuerModul(modulId, zusatzWerte) - Infotext+aria-Label aus
//   infotexte.csv, Platzhalter aufgelöst
// Dazu ersetzePlatzhalterInRecord() als die "gemeinsame Funktion, die
// Absätze an | trennt und Platzhalter ersetzt" (Punkt 2.1 letzter Satz) -
// das Trennen an `|` erledigt bereits js/core/dataLoader.js selbst (jede
// Zelle mit einem `|` wird dort generisch zu einer Liste, siehe dessen
// Dateikopf-Kommentar) - hier bleibt nur noch die Platzhalter-Ersetzung.
//
// Ladereihenfolge (Punkt 2.1): archiv.csv wird von app.js VOR dem ersten
// Rendern geladen (siehe dort, `await ladeArchivKonfiguration()`) - die
// übrigen drei Dateien laden erst bei Bedarf, hier über denselben
// state.js-Datencache wie alle Archivalien-CSVs (mehrfache Aufrufe derselben
// Seite laden nicht erneut).

import { ladeCSV } from './dataLoader.js';
import { ladeGecachteCSV } from './datenCache.js';

// Punkt 2.1, Ausfallverhalten "archiv.csv fehlt": neutrale Ersatzwerte statt
// Absturz - jedes Modul, das konfigurationswert() aufruft, bekommt so immer
// einen (ggf. leeren/neutralen) String zurück, nie `undefined`.
const ARCHIV_ERSATZWERTE = {
  archiv_name: 'Archiv',
  archiv_kurzname: 'Archiv',
  seitentitel: 'Archiv-Interface',
  logo_datei: '',
  logo_untertitel: '',
  adresse_strasse: '',
  adresse_ort: '',
  telefon: '',
  telefon_international: '',
  email: '',
  website: '',
  website_link: '',
  akzentfarbe: '',
  karte_zentrum_lat: '48.42',
  karte_zentrum_lon: '15.6',
  karte_zoom: '7',
  footer_text: ''
};

let archivWerte = null;
let archivLadePromise = null;

// Lädt archiv.csv EINMALIG (weitere Aufrufe während/nach dem ersten Laden
// erhalten dieselbe Promise/dasselbe Ergebnis) - app.js ruft das vor dem
// ersten Rendern auf und wartet darauf (Punkt 2.1).
export function ladeArchivKonfiguration() {
  if (archivLadePromise) return archivLadePromise;
  archivLadePromise = (async () => {
    try {
      const { records } = await ladeCSV('data/archiv.csv');
      const werte = { ...ARCHIV_ERSATZWERTE };
      records.forEach((r) => {
        if (r.schluessel) werte[r.schluessel] = r.wert ?? '';
      });
      archivWerte = werte;
    } catch (fehler) {
      console.error('data/archiv.csv konnte nicht geladen werden - verwende neutrale Ersatzwerte.', fehler);
      archivWerte = { ...ARCHIV_ERSATZWERTE };
    }
    return archivWerte;
  })();
  return archivLadePromise;
}

// Synchroner Zugriff auf EINEN Konfigurationswert - setzt voraus, dass
// ladeArchivKonfiguration() bereits (mindestens einmal) abgeschlossen ist
// (bei app.js' Start garantiert, siehe dortiges `await`). Vor diesem
// Zeitpunkt oder falls archiv.csv fehlt: Ersatzwert bzw. leerer String.
export function konfigurationswert(schluessel) {
  const quelle = archivWerte || ARCHIV_ERSATZWERTE;
  return quelle[schluessel] ?? ARCHIV_ERSATZWERTE[schluessel] ?? '';
}

// AUFTRAG B2 (Cache-Umstellung): ladeGecachteCSV() kommt jetzt aus
// js/core/datenCache.js (bisher eine lokale, gleichlautende Kopie hier).

// Punkt 2.2: Zählwerte aus den bereits vorhandenen Archivalien-Tabellen -
// über denselben Datencache wie app.js' eigenes Laden (state.js), kostet
// also kein zweites Mal etwas, falls die jeweilige Tabelle andernorts
// bereits geladen wurde/wird. Einzeln abgesichert (Promise.allSettled):
// fehlt z.B. nur verlassenschaftsinventare.csv, bleiben die drei anderen
// Zählwerte trotzdem nutzbar (statt dass ein einzelner Fehler alle vier
// Platzhalter unauflösbar macht).
const ZAEHLWERT_DATEIEN = {
  n_bestaende: 'data/bestandsverzeichnis.csv',
  n_urkunden: 'data/urkunden.csv',
  n_buergerbuch: 'data/buergerbuch.csv',
  n_inventare: 'data/verlassenschaftsinventare.csv'
};

async function ermittleZaehlwerte() {
  const eintraege = await Promise.allSettled(
    Object.entries(ZAEHLWERT_DATEIEN).map(async ([schluessel, pfad]) => [schluessel, (await ladeGecachteCSV(pfad)).length])
  );
  const werte = {};
  eintraege.forEach((ergebnis, i) => {
    const [schluessel] = Object.entries(ZAEHLWERT_DATEIEN)[i];
    if (ergebnis.status === 'fulfilled') {
      werte[schluessel] = String(ergebnis.value[1]);
    } else {
      console.warn(`Zählwert "${schluessel}" konnte nicht ermittelt werden (Quelldatei fehlt).`, ergebnis.reason);
    }
  });
  return werte;
}

async function ermittleGlobaleWerte() {
  await ladeArchivKonfiguration();
  const zaehlwerte = await ermittleZaehlwerte();
  return { ...archivWerte, ...zaehlwerte };
}

// Punkt 2.2: `{schluessel}` wird ersetzt, wenn `werte[schluessel]` einen
// nicht-leeren Wert hat - eckige Klammern `[...]` sind KEINE Platzhalter
// (Auftrag wörtlich) und werden vom Muster unten gar nicht erst erfasst.
const PLATZHALTER_MUSTER = /\{([a-zA-Z0-9_]+)\}/g;

function ersetzePlatzhalterInText(text, werte, fehlendeSammlung) {
  return text.replace(PLATZHALTER_MUSTER, (treffer, schluessel) => {
    const wert = werte[schluessel];
    if (wert !== undefined && wert !== null && wert !== '') return String(wert);
    fehlendeSammlung.add(schluessel);
    return treffer;
  });
}

// Wendet die Platzhalter-Ersetzung auf JEDES Textfeld eines Records an
// (String oder - bei Pipe-Feldern, siehe dataLoader.js - Array von
// Absätzen), unabhängig vom konkreten Spaltennamen (funktioniert dadurch
// gleichermaßen für startseite.csv/ueber.csv/infotexte.csv, ohne deren
// jeweilige Spaltennamen zu kennen). `_unsicherFelder`/Booleans/leere
// Werte werden unverändert durchgereicht.
// Rückgabe: das verarbeitete Record, oder `null`, wenn mindestens ein
// Platzhalter nicht auflösbar war (Punkt 2.2: "wird der ganze Block nicht
// angezeigt") - `bezeichner` (z.B. block_id/modul_id) macht die
// console.warn-Meldung zuordenbar.
export function ersetzePlatzhalterInRecord(record, werte, bezeichner) {
  const fehlend = new Set();
  const ergebnis = {};
  for (const [feld, wert] of Object.entries(record)) {
    if (Array.isArray(wert)) {
      ergebnis[feld] = wert.map((teil) => (typeof teil === 'string' ? ersetzePlatzhalterInText(teil, werte, fehlend) : teil));
    } else if (typeof wert === 'string') {
      ergebnis[feld] = ersetzePlatzhalterInText(wert, werte, fehlend);
    } else {
      ergebnis[feld] = wert;
    }
  }
  if (fehlend.size > 0) {
    console.warn(`"${bezeichner}": nicht auflösbare Platzhalter {${[...fehlend].join('}, {')}} - Block wird nicht angezeigt.`);
    return null;
  }
  return ergebnis;
}

const seitenBloeckeCache = new Map(); // pfad -> Array verarbeiteter Blöcke, oder null (Datei fehlt/leer)

// Punkt 2.1: Blöcke einer Seite, nach `reihenfolge` sortiert, nur
// `sichtbar=ja`, Platzhalter bereits aufgelöst. Fehlt die Datei, wird laut
// Punkt 2.1 z.B. "nur Kopf- und Fußzeile" gezeigt - hier realisiert, indem
// eine leere Liste zurückgegeben wird (die aufrufenden Module bauen dann
// einfach keine Blöcke), plus console.warn.
export async function ladeSeitenBloecke(pfad) {
  if (seitenBloeckeCache.has(pfad)) return seitenBloeckeCache.get(pfad);
  let ergebnis;
  try {
    // AUFTRAG B2 (Cache-Umstellung): Laden über den gemeinsamen Cache
    // (js/core/datenCache.js), damit keine Datei doppelt angefragt wird.
    const [records, globaleWerte] = await Promise.all([ladeGecachteCSV(pfad), ermittleGlobaleWerte()]);
    const sichtbare = records.filter((r) => r.sichtbar === 'ja');
    ergebnis = sichtbare
      .map((r) => ersetzePlatzhalterInRecord(r, globaleWerte, r.block_id || pfad))
      .filter(Boolean)
      .sort((a, b) => Number(a.reihenfolge) - Number(b.reihenfolge));
  } catch (fehler) {
    console.warn(`${pfad} konnte nicht geladen werden.`, fehler);
    ergebnis = [];
  }
  seitenBloeckeCache.set(pfad, ergebnis);
  return ergebnis;
}

let infotexteCache = null; // Map modul_id -> Rohrecord, oder null (Datei fehlt)
let infotexteLadePromise = null;

function ladeInfotexteRohdaten() {
  if (infotexteLadePromise) return infotexteLadePromise;
  infotexteLadePromise = (async () => {
    try {
      const { records } = await ladeCSV('data/infotexte.csv');
      infotexteCache = new Map(records.map((r) => [r.modul_id, r]));
    } catch (fehler) {
      console.warn('data/infotexte.csv konnte nicht geladen werden - keine Info-Buttons verfügbar.', fehler);
      infotexteCache = new Map();
    }
    return infotexteCache;
  })();
  return infotexteLadePromise;
}

// Punkt 2.1/2.7: liefert { text, ariaLabel } für erzeugeInfoButton()
// (js/utils/infoButton.js erwartet `text` als EINEN String mit `\n\n`
// zwischen Absätzen - infotexte.csv liefert die Absätze wegen der
// Pipe-Konvention als Array, hier deshalb mit '\n\n' wieder
// zusammengefügt) - oder `null`, wenn die Datei fehlt, kein Eintrag für
// `modulId` existiert oder ein Platzhalter unauflösbar ist (jeweils mit
// console.warn inkl. `modulId`, Punkt 2.1 wörtlich). `zusatzWerte`
// (optional): modulinterne Werte, die zuvor per Template-Literal
// eingesetzt wurden (Punkt 2.2, z.B. Sankeys ORT_BUENDELUNG_SCHWELLE) -
// überschreiben bei Namensgleichheit NICHT die globalen Werte (archiv.csv/
// Zählwerte), sondern ergänzen sie nur.
export async function infotextFuerModul(modulId, zusatzWerte = {}) {
  const [rohdaten, globaleWerte] = await Promise.all([ladeInfotexteRohdaten(), ermittleGlobaleWerte()]);
  const roh = rohdaten.get(modulId);
  if (!roh) {
    console.warn(`infotexte.csv enthält keinen Eintrag für Modul "${modulId}" - kein Info-Button.`);
    return null;
  }
  const werte = { ...globaleWerte, ...zusatzWerte };
  const verarbeitet = ersetzePlatzhalterInRecord(roh, werte, modulId);
  if (!verarbeitet) return null; // ersetzePlatzhalterInRecord() hat bereits gewarnt
  const absaetze = Array.isArray(verarbeitet.text) ? verarbeitet.text : [verarbeitet.text];
  return { text: absaetze.join('\n\n'), ariaLabel: verarbeitet.aria_label || undefined };
}
