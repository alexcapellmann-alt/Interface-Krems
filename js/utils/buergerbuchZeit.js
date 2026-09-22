// js/utils/buergerbuchZeit.js
// Gemeinsame Zeit-/Sektor-Aufbereitung für die Bürgerbuch-Visualisierungen
// (Auftrag "Bürgerbuch – Trellis (Umzug), Bump Chart (Neubau), Bipartiter
// Graph (Umzug)"), analog zu js/utils/urkundenZeit.js für Urkunden - bewusst
// eine EIGENSTÄNDIGE Datei statt eines zehnten Importeurs von urkundenZeit.js:
// dessen eigener REGRESSIONSSCHUTZ-Kommentar dokumentiert explizit "aktuell
// genutzt von [9 Urkunden-Modulen]" und urkunden.csv-spezifische Feldnamen
// (jahr/kategorien/datum_unsicher) - eine Kopplung hierher hätte diese Datei
// an ein fremdes Schema gebunden (dieselbe Trennungs-Logik wie
// js/utils/kategorieFarben.js, siehe dortiger Kommentar "CAT_COLORS ist NICHT
// hierfür gedacht ... deshalb eigenständige, hier zentrale Farblogik").
//
// REGRESSIONSSCHUTZ: aktuell genutzt von trellis.js, bumpChart.js,
// personennetzwerk.js (alle drei Bürgerbuch, siehe AUFTRAG "Bipartiter Graph
// → Urkunden (Sankey), Personennetzwerk → Bürgerbuch..." für den Umzug von
// personennetzwerk.js hierher - der frühere vierte Nutzer, das Bürger-Bürge-
// bipartiterGraph.js, ist im selben Auftrag entfallen, siehe dessen
// Rückumzug/Umbau zu Urkunden). Änderungen hier wirken sich auf alle drei aus.
//
// Feldnamen aus data/buergerbuch.csv (siehe SCHEMA.md): `Datum` (Freitext,
// Formate "JJJJ-MM-TT" oder "JJJJ", live gegen alle 2791 Zeilen geprüft -
// 0 leere Werte), `Wirtschaftssektor` (Freitext, bei 1250 von 2791 Zeilen
// leer), `Datum_unsicher`/`Beruf_unsicher` (von dataLoader.js bereits zu
// Boolean konvertiert, siehe MUSTER_UNSICHER_SPALTE dort).
//
// Farblogik bewusst NICHT aus js/config/constants.js' CAT_COLORS (das ist
// laut eigenem Kommentar dort eine feste, urkunden.csv-spezifische Taxonomie)
// - Wirtschaftssektor ist wie bkk_kategorie/dotPlot.js' Kategorienliste eine
// DATENGETRIEBENE Werteliste (Abschnitt 2/3: keine archivarischen Inhalte im
// Code), deshalb Wiederverwendung der bereits dafür gebauten, generischen
// js/utils/kategorieFarben.js.

import { baueKategorieFarbSkala, OHNE_KATEGORIE_FARBE } from './kategorieFarben.js';

// Wörtlich aus dem Auftragstext übernommen ("erscheint als eigenes,
// sichtbares Panel, nicht ausgeblendet") - bewusst dieser Wortlaut statt
// eines technischeren "(ohne Sektor)"-Namens, da er direkt im Auftrag als
// gewünschte Beschriftung genannt wurde.
export const WIRTSCHAFTSSEKTOR_NICHT_ANGEGEBEN = 'Beruf nicht angegeben';

export function parseJahr(record) {
  const treffer = String(record.Datum || '').match(/(\d{4})/);
  return treffer ? parseInt(treffer[1], 10) : null;
}

// Teilt Records nach vorhandenem Jahr - dieselbe "nie stillschweigend
// ausblenden"-Struktur wie urkundenZeit.js' teileNachJahr(), obwohl `ohneJahr`
// bei der aktuellen Datenlage immer leer bleibt (0 von 2791 Datum-Werten
// unauswertbar, live geprüft) - Robustheit statt Annahme, falls künftige
// Datenpflege einmal einen unvollständigen Datumswert einträgt.
export function teileNachJahr(records) {
  const mitJahr = [];
  const ohneJahr = [];
  records.forEach((record) => {
    const jahr = parseJahr(record);
    if (jahr !== null) {
      mitJahr.push({ record, jahr });
    } else {
      ohneJahr.push({ record, jahr: null });
    }
  });
  return { mitJahr, ohneJahr };
}

export function ermittleSektor(record) {
  return record.Wirtschaftssektor || WIRTSCHAFTSSEKTOR_NICHT_ANGEGEBEN;
}

// Häufigste zuerst - dieselbe Konvention wie urkundenZeit.js'
// ermittleKategorienSortiertNachHaeufigkeit(), hier auf Wirtschaftssektor
// übertragen. "Beruf nicht angegeben" ist dabei GLEICHBERECHTIGT (Punkt 1/2
// im Auftrag: "nicht ausgeblendet"/"wird mitgerankt") - keine Sonderbehandlung
// beim Sortieren.
export function ermittleSektorenSortiertNachHaeufigkeit(mitJahr) {
  const zaehlung = new Map();
  mitJahr.forEach((eintrag) => {
    const sektor = ermittleSektor(eintrag.record);
    zaehlung.set(sektor, (zaehlung.get(sektor) || 0) + 1);
  });
  return Array.from(zaehlung.entries()).sort((a, b) => b[1] - a[1]).map(([sektor]) => sektor);
}

// Feste Jahresfenster von binGroesse Jahren - identische Formel wie
// urkundenZeit.js' berechneJahresBins() (generisch über binGroesse, siehe
// Dateikopf-Kommentar zur bewussten Nicht-Wiederverwendung dieser Datei),
// hier eigenständig gehalten. trellis.js ruft mit binGroesse=1 (ein Balken
// je Jahr, siehe dortiger Kommentar), bumpChart.js mit binGroesse=10
// (Jahrzehnt, Auftrag Punkt 2).
export function berechneJahresBins(mitJahr, binGroesse) {
  const minJahr = d3.min(mitJahr, (d) => d.jahr);
  const maxJahr = d3.max(mitJahr, (d) => d.jahr);
  const binStart = Math.floor(minJahr / binGroesse) * binGroesse;
  const bins = [];
  for (let jahr = binStart; jahr <= maxJahr; jahr += binGroesse) {
    bins.push({ von: jahr, bis: jahr + binGroesse - 1 });
  }
  return bins;
}

function istZeitEintragUnsicher(record) {
  return !!(record.Datum_unsicher || record.Beruf_unsicher);
}

// Liefert pro Zeitfenster ein Objekt {sektor: {anzahl, unsicherAnzahl, eintraege}}
// - dieselbe Struktur wie urkundenZeit.js' gruppiereProBinUndKategorie().
export function gruppiereProBinUndSektor(mitJahr, sektoren, bins) {
  const matrix = bins.map(() => {
    const zeile = {};
    sektoren.forEach((sektor) => { zeile[sektor] = { anzahl: 0, unsicherAnzahl: 0, eintraege: [] }; });
    return zeile;
  });
  mitJahr.forEach((eintrag) => {
    const sektor = ermittleSektor(eintrag.record);
    const binIndex = bins.findIndex((b) => eintrag.jahr >= b.von && eintrag.jahr <= b.bis);
    if (binIndex === -1 || !matrix[binIndex][sektor]) return;
    const zelle = matrix[binIndex][sektor];
    zelle.anzahl += 1;
    zelle.eintraege.push(eintrag);
    if (istZeitEintragUnsicher(eintrag.record)) zelle.unsicherAnzahl += 1;
  });
  return matrix;
}

export function baueBuergerbuchTooltipText(record) {
  const zeilen = [
    record.Name || '(ohne Name)',
    record.Datum || '(kein Datum)',
    record.Beruf ? `${record.Beruf} (${ermittleSektor(record)})` : ermittleSektor(record)
  ];
  if (istZeitEintragUnsicher(record)) {
    zeilen.push('Achtung: Angabe unsicher');
  }
  return zeilen.join('\n');
}

// Alphabetisch sortierte Namensliste als stabile Grundlage für
// baueKategorieFarbSkala() (siehe dortiger Kommentar: "nicht nach
// Häufigkeit, die sich mit neuen Daten verschieben könnte") - "Beruf nicht
// angegeben" bewusst AUSGESCHLOSSEN (bekommt stattdessen die etablierte
// neutrale OHNE_KATEGORIE_FARBE, exakt wie "(ohne Kategorie)" bei den
// Urkunden-Modulen, siehe farbeFuerSektor() unten).
export function ermittleSektorenNamenAlphabetisch(records) {
  return [...new Set(records.map(ermittleSektor))]
    .filter((sektor) => sektor !== WIRTSCHAFTSSEKTOR_NICHT_ANGEGEBEN)
    .sort((a, b) => a.localeCompare(b, 'de'));
}

// Auftrag, Akzeptanzkriterium Punkt 3: "Farbkodierung nach Sektor konsistent
// mit Trellis/Bump Chart" - dadurch sichergestellt, dass alle drei Module
// dieselbe Farbe für denselben Sektor zeigen: `baueKategorieFarbSkala()`
// erzeugt ihre Farben rein aus Position+Länge der übergebenen, alphabetisch
// sortierten Namensliste - jedes Modul, das mit DENSELBEN vollständigen
// `records` (2791 Zeilen, von app.js an alle drei Ansichten gleichermaßen
// übergeben) aufruft, erhält deshalb IDENTISCHE Ergebnisse, ohne dass die drei
// Module sich eine gemeinsame Skala-Instanz teilen müssten - eine einzige
// Quelle der Wahrheit (diese Funktion) statt einer zufälligen Übereinstimmung.
export function baueSektorFarbSkala(records) {
  const namen = ermittleSektorenNamenAlphabetisch(records);
  const skala = baueKategorieFarbSkala(namen);
  return (sektor) => (sektor === WIRTSCHAFTSSEKTOR_NICHT_ANGEGEBEN ? OHNE_KATEGORIE_FARBE : skala(sektor));
}

// --- Bürgschaftsnetzwerk (Auftrag "... Personennetzwerk → Bürgerbuch...") --
//
// Übernommen aus dem vormaligen Bürger-Bürge-`bipartiterGraph.js` (siehe
// dessen Git-Historie/CHANGELOG-Eintrag (32) für die volle Herleitung) -
// hierher verschoben, weil jetzt personennetzwerk.js derselbe zweite Nutzer
// dieser Datenaufbereitung ist (dieselbe "bei zweitem Nutzer auslagern"-
// Konvention wie bei sidebar.js/kategorieFarben.js).
//
// "Buergen" (Namen) ist KOMMA-, "buergen_id" dagegen PIPE-getrennt (echte
// CSV-Konvention derselben Zeile, live geprüft) - bei ÜBEREINSTIMMENDER
// Länge werden beide Listen positionsgleich gepaart (329 von 330 Zeilen mit
// Bürgen stimmen so exakt überein). Bei Längen-Abweichung (1 von 330 Zeilen,
// z.B. ein Name wie "Khagerer, Andre." mit eingebettetem Komma) bewusst KEINE
// geratene Zuordnung - der volle Namensstring dient dann für JEDE zugehörige
// ID als Anzeigename.
export function ermittleBuergenNamen(record, ids) {
  const namen = (record.Buergen || '').replace(/\.$/, '').split(',').map((n) => n.trim()).filter(Boolean);
  if (namen.length === ids.length) return ids.map((id, i) => [id, namen[i]]);
  const zusammen = record.Buergen || ids.join(', ');
  return ids.map((id) => [id, zusammen]);
}

function ermittleBuergenIds(record) {
  return Array.isArray(record.buergen_id) ? record.buergen_id : (record.buergen_id ? [record.buergen_id] : []);
}

// Namensverzeichnis für Personensuchen (siehe personennetzwerk.js): jede ID
// (egal ob als Bürger, als Bürge oder beides vorkommend) einmal mit ihrem
// bestmöglichen Anzeigenamen - ein eigener Bürgerbuch-Eintrag (record.Name)
// hat Vorrang vor einem nur aus einer Bürgen-Nennung bekannten Namen (live
// geprüft: nur 65 von 447 Bürgen haben selbst einen eigenen Eintrag).
export function baueNamensverzeichnis(records) {
  const namenNachId = new Map();
  records.forEach((record) => { namenNachId.set(record.personen_id, record.Name); });
  records.forEach((record) => {
    const ids = ermittleBuergenIds(record);
    if (ids.length === 0) return;
    ermittleBuergenNamen(record, ids).forEach(([buergeId, buergeName]) => {
      if (!namenNachId.has(buergeId)) namenNachId.set(buergeId, buergeName);
    });
  });
  return namenNachId;
}

// Baut das vollständige Bürgschaftsnetzwerk (Auftrag Punkt 2: "Knoten:
// Personen unabhängig von Rolle Bürger/Bürge - eine einzige Personenmenge").
// Dieselbe Ergebnis-FORM wie js/utils/urkundenPersonen.js'
// baueKoNennungsNetzwerk() (knoten: {id,name,anzahl}, paare: {a,b,anzahl,
// unsicherAnzahl}) - bewusst NICHT von dort importiert (urkundenPersonen.js
// ist laut eigenem REGRESSIONSSCHUTZ-Kommentar für fünf Urkunden-Module
// gedacht, dieselbe Trennungs-Logik wie im Dateikopf-Kommentar oben), damit
// personennetzwerk.js dessen bereits bewährte Force-Simulation-/Tooltip-Logik
// mit minimalem Umbau weiterverwenden kann. `anzahl` ist hier der Grad
// (Anzahl unterschiedlicher Bürgschaftsbeziehungen), NICHT wie bei Urkunden
// eine Nennungshäufigkeit - für die dort verwendete Radius-Skalierung
// bedeutungsgleich ("wie zentral ist diese Person im Netzwerk").
// `sektor` je Knoten: der eigene Wirtschaftssektor bei eigenem Eintrag, sonst
// WIRTSCHAFTSSEKTOR_NICHT_ANGEGEBEN (Auftrag: "Farbe: Wirtschaftssektor der
// Person, inkl. 'nicht angegeben'" - eine Person ohne bekannten Sektor wird
// farblich NICHT anders behandelt als eine mit explizit unbekanntem Beruf).
export function baueBuergschaftsNetzwerk(records) {
  const eigenerEintragNachId = new Map(records.map((r) => [r.personen_id, r]));
  const knoten = new Map(); // id -> {id, name, sektor, anzahl}
  const paare = new Map(); // "idA|||idB" -> {a, b, anzahl, unsicherAnzahl}

  function ermittleKnoten(id, name) {
    if (!knoten.has(id)) {
      const eigenerEintrag = eigenerEintragNachId.get(id);
      const sektor = eigenerEintrag ? ermittleSektor(eigenerEintrag) : WIRTSCHAFTSSEKTOR_NICHT_ANGEGEBEN;
      knoten.set(id, { id, name, sektor, anzahl: 0 });
    }
    return knoten.get(id);
  }

  records.forEach((record) => {
    const ids = ermittleBuergenIds(record);
    if (ids.length === 0) return;
    const buergerKnoten = ermittleKnoten(record.personen_id, record.Name);
    ermittleBuergenNamen(record, ids).forEach(([buergeId, buergeName]) => {
      const buergeKnoten = ermittleKnoten(buergeId, buergeName);
      buergerKnoten.anzahl += 1;
      buergeKnoten.anzahl += 1;

      const schluessel = [buergerKnoten.id, buergeKnoten.id].sort().join('|||');
      if (!paare.has(schluessel)) {
        paare.set(schluessel, { a: buergerKnoten, b: buergeKnoten, anzahl: 0, unsicherAnzahl: 0 });
      }
      const paar = paare.get(schluessel);
      paar.anzahl += 1;
      if (record.zuordnung_sicher === 'nein') paar.unsicherAnzahl += 1;
    });
  });

  return { knoten: Array.from(knoten.values()), paare: Array.from(paare.values()) };
}
