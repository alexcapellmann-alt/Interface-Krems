// js/core/datenVerfuegbarkeit.js
// AUFTRAG B2 (Prüfbericht Punkt 3, Freigabe Phase 1 vom 2026-10-03):
// entscheidet je Ansicht anhand der beim Laden festgehaltenen Dateiprüfung
// (js/core/dataLoader.js, holeDateiZustand()) und der freigegebenen
// Anforderungen (js/config/datenAnforderungen.js):
// - pruefeAnsicht(): zeichnen, zeichnen mit Hinweisbalken, oder nur Balken;
// - istAnsichtAusgeblendet()/istBereichAusgeblendet(): ob eine Ansicht bzw. ein
//   Bereich aus Navigation, Galerie und Flyouts verschwindet (Datei fehlt oder
//   enthält keine Datensätze - auch "nur Kopfzeile").
//
// Dieses Modul selbst wird NICHT beim Start geladen, sondern von app.js per
// dynamischem import() - parallel zu den Daten der ersten Ansicht bzw. nach
// dem ersten Bildaufbau (Entscheidung des Autors vom 2026-10-03: "erster
// Bildaufbau" = Seitengerüst/FCP, nicht der Ansichtsinhalt).
//
// Abweichung von der Lazy-Loading-Regel (Masterprompt Abschnitt 2/13,
// Entscheidung des Autors vom 2026-10-03): damit Tabs leerer Dateien gar
// nicht erst erscheinen, lädt pruefeDatenImHintergrund() die `ausblenden`-
// Dateien NACH dem ersten Bildaufbau im Hintergrund - ausschließlich über den
// gemeinsamen Cache (js/core/datenCache.js), also ohne doppelte Anfragen.
// Ansichten selbst (Code und Darstellung) laden weiterhin erst beim Öffnen.

import { ANSICHT_ANFORDERUNGEN, NEBENDATEI_FOLGE, AUSBLENDE_DATEIEN, SCHLUESSELSPALTEN } from '../config/datenAnforderungen.js';
import { holeDateiZustand } from './dataLoader.js';
import { ladeGecachteCSV } from './datenCache.js';
import { konfigurationsliste } from './archivKonfiguration.js';

// Mit diesem Modul nachgeladen (app.js braucht den Balken erst, wenn die Prüfung
// ein Problem gefunden hat) - so kommen alle drei Dateien mit EINEM dynamischen
// import() und keine davon steht im Start-Modulgraphen.
export { erzeugeHinweisBalken } from '../utils/hinweisBalken.js';

const dateiname = (pfad) => pfad.replace(/^data\//, '');
const zitiere = (spalten) => spalten.map((s) => `'${s}'`).join(', ');

// Dateien, die ihre Ansichten über einen EIGENEN, bereits zwischengespeicherten
// Weg laden - die Prüfung nutzt denselben Weg, damit nichts doppelt angefragt wird.
const EIGENE_LADER = {
  'data/orte.csv': () => import('../utils/urkundenOrte.js').then((m) => m.ladeOrtsVerzeichnis()),
  'data/archiv.csv': () => import('./archivKonfiguration.js').then((m) => m.ladeArchivKonfiguration())
};

function ladeFuerPruefung(pfad) {
  const lader = EIGENE_LADER[pfad] || (() => ladeGecachteCSV(pfad));
  return lader().catch(() => null); // "Datei fehlt" hält dataLoader.js selbst fest
}

// Alle Pflichtspalten einer Datei über alle Ansichten (für die Regel "keine
// bekannte Spalte erkannt").
function pflichtspaltenDerDatei(pfad) {
  const spalten = new Set();
  Object.values(ANSICHT_ANFORDERUNGEN).forEach((anforderung) => {
    [anforderung.dateien, anforderung.neben, anforderung.optional, anforderung.bedarf].forEach((gruppe) => (gruppe?.[pfad] || []).forEach((s) => spalten.add(s)));
    (anforderung.teilpflicht || []).filter((t) => t.datei === pfad).forEach((t) => t.spalten.forEach((s) => spalten.add(s)));
  });
  return spalten;
}

// Enthält die Kopfzeile keine einzige bekannte Spalte, ist die Datei vermutlich
// mit falschem Trennzeichen gespeichert (die ganze Kopfzeile wird EINE Spalte).
// Nur bei vorhandener Kopfzeile - sonst gilt die Datei als leer.
function keineBekannteSpalte(pfad, spalten) {
  const bekannte = new Set([...pflichtspaltenDerDatei(pfad), ...(SCHLUESSELSPALTEN[pfad] || [])]);
  return bekannte.size > 0 && spalten.length > 0 && !spalten.some((s) => bekannte.has(s));
}

// Problem einer Datei in Worten, oder null. Reihenfolge: fehlt, unlesbar
// (vermutlich falsches Trennzeichen), keine Datensätze, fehlende Pflichtspalten.
function beschreibeProblem(pfad, pflicht = []) {
  const zustand = holeDateiZustand(pfad);
  if (!zustand) return null;
  const name = dateiname(pfad);
  if (zustand.fehlt) return { leer: true, text: `Die Datei ${name} fehlt.` };
  if (keineBekannteSpalte(pfad, zustand.spalten)) {
    return { leer: false, text: `In ${name} wurden keine bekannten Spalten erkannt. Vermutlich wurde die Datei mit einem falschen Trennzeichen gespeichert (zum Beispiel Komma statt Semikolon).` };
  }
  if (zustand.anzahlDatensaetze === 0) return { leer: true, text: `${name} enthält keine Datensätze.` };
  const fehlend = pflicht.filter((s) => !zustand.spalten.includes(s));
  if (fehlend.length === 1) return { leer: false, text: `In ${name} fehlt die Spalte ${zitiere(fehlend)}.` };
  if (fehlend.length > 1) return { leer: false, text: `In ${name} fehlen die Spalten ${zitiere(fehlend)}.` };
  return null;
}

function alleDateien(anforderung) {
  return [...Object.keys(anforderung.dateien || {}), ...Object.keys(anforderung.neben || {}),
    ...Object.keys(anforderung.optional || {}), ...(anforderung.teilpflicht || []).map((t) => t.datei)];
}

// AUFTRAG C1, Punkt 3: Ansichten, deren `merkmal` in den Daten fehlt (z. B.
// keine Person der Herrscherfamilie aus archiv.csv in familien.csv). Wird wie
// eine leere Datei behandelt: Ansicht ausgeblendet, direkter Link zeigt Balken.
const merkmalFehlt = new Set();

async function pruefeMerkmal(ansichtId) {
  const merkmal = ANSICHT_ANFORDERUNGEN[ansichtId]?.merkmal;
  if (!merkmal) return;
  const records = await ladeFuerPruefung(merkmal.datei);
  const werte = konfigurationsliste(merkmal.konfiguration);
  const erfuellt = Array.isArray(records) && records.some((r) => werte.includes(String(r[merkmal.spalte] ?? '').trim()));
  if (erfuellt) merkmalFehlt.delete(ansichtId);
  else merkmalFehlt.add(ansichtId);
}

// Lädt (über die vorhandenen Cache-Wege) alle Dateien einer Ansicht, damit
// ihre Prüfung vorliegt. Bereits geladene Dateien werden nicht erneut angefragt.
export async function stelleDateienSicher(ansichtId, zusatzDateien = []) {
  const anforderung = ANSICHT_ANFORDERUNGEN[ansichtId];
  const pfade = [...new Set([...(anforderung ? alleDateien(anforderung) : []), ...zusatzDateien])];
  await Promise.all(pfade.map(ladeFuerPruefung));
  await pruefeMerkmal(ansichtId);
}

// Ergebnis: { blockiert, texte } - blockiert = Ansicht nicht zeichnen, nur den
// Balken zeigen; texte = Sätze für den Hinweisbalken (leer = kein Balken).
// zusatzNeben: weitere Nebendateien, die erst zur Laufzeit feststehen (z. B.
// die Belegquellen einer bestimmten Führungsstation). Steht der Pfad unter
// `bedarf` der Ansicht, gelten dessen Pflichtspalten (AUFTRAG E, Punkt 1).
export function pruefeAnsicht(ansichtId, zusatzNeben = []) {
  const anforderung = ANSICHT_ANFORDERUNGEN[ansichtId];
  if (!anforderung) return { blockiert: false, texte: [] };
  const texte = [];
  let blockiert = false;

  Object.entries(anforderung.dateien || {}).forEach(([pfad, pflicht]) => {
    const problem = beschreibeProblem(pfad, pflicht);
    if (!problem) return;
    blockiert = true;
    texte.push(problem.leer && pfad === anforderung.ausblenden
      ? `Für diese Ansicht liegen keine Daten vor: ${problem.text}`
      : `${problem.text} Diese Ansicht kann nicht angezeigt werden.`);
  });

  // AUFTRAG C1, Punkt 3: Merkmal fehlt (nur wenn die Dateien selbst in Ordnung sind)
  if (!blockiert && merkmalFehlt.has(ansichtId)) {
    blockiert = true;
    texte.push(`Für diese Ansicht liegen keine Daten vor: ${anforderung.merkmal.text}`);
  }

  const neben = { ...(anforderung.neben || {}) };
  zusatzNeben.forEach((pfad) => { if (!(pfad in neben) && !(pfad in (anforderung.dateien || {}))) neben[pfad] = anforderung.bedarf?.[pfad] || []; });
  Object.entries(neben).forEach(([pfad, pflicht]) => {
    const problem = beschreibeProblem(pfad, pflicht);
    if (problem) texte.push(`${problem.text} ${NEBENDATEI_FOLGE[pfad] || 'Diese Ansicht ist deshalb unvollständig.'}`);
  });

  // AUFTRAG C1: optionale Dateien - Fehlen oder 0 Datensätze ist kein Problem
  // (es gelten Vorgaben), nur eine vorhandene, aber unbrauchbare Datei.
  Object.entries(anforderung.optional || {}).forEach(([pfad, pflicht]) => {
    const problem = beschreibeProblem(pfad, pflicht);
    if (problem && !problem.leer) texte.push(`${problem.text} ${NEBENDATEI_FOLGE[pfad] || ''}`.trim());
  });

  if (!blockiert) {
    (anforderung.teilpflicht || []).forEach(({ datei, spalten, darstellung }) => {
      const problem = beschreibeProblem(datei, spalten);
      if (problem) texte.push(`${problem.text} Die Darstellung „${darstellung}“ kann deshalb nicht angezeigt werden.`);
    });
  }
  return { blockiert, texte };
}

// --- Ausblenden ------------------------------------------------------------

let ausgeblendeteDateien = new Set(); // bis zum Ende der Hintergrund-Prüfung leer: nichts wird vorab ausgeblendet

export function istAnsichtAusgeblendet(ansichtId) {
  const pfad = ANSICHT_ANFORDERUNGEN[ansichtId]?.ausblenden;
  return Boolean(pfad && ausgeblendeteDateien.has(pfad)) || merkmalFehlt.has(ansichtId);
}

// Ein Bereich (Archivalientyp bzw. Bestand) verschwindet, wenn ALLE seine
// Ansichten ausgeblendet sind (z. B. bleibt "Personen" wegen des Chord-
// Diagramms bei leerer personenliste.csv sichtbar).
export function istBereichAusgeblendet(bereich) {
  return bereich.ansichten.length > 0 && bereich.ansichten.every((a) => istAnsichtAusgeblendet(a.id));
}

// Text für eine Galerie, deren Ansichten alle ausgeblendet sind (direkter Link).
export function texteFuerLeerenBereich(bereich) {
  const pfad = ANSICHT_ANFORDERUNGEN[bereich.ansichten[0]?.id]?.ausblenden;
  const problem = pfad ? beschreibeProblem(pfad) : null;
  return [`Für diesen Bereich liegen keine Daten vor${problem ? `: ${problem.text}` : '.'}`];
}

function nachErstemBildaufbau(erstesRendern) {
  return Promise.allSettled([erstesRendern]).then(() => new Promise((fertig) => {
    // Zwei Frames: der erste Bildaufbau ist tatsächlich gezeichnet; danach im
    // Leerlauf (spätestens nach 2 s), damit die Prüfung keine Ansicht bremst.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (window.requestIdleCallback) window.requestIdleCallback(() => fertig(), { timeout: 2000 });
      else setTimeout(fertig, 0);
    }));
  }));
}

// Startet die Hintergrund-Prüfung, sobald `erstesRendern` (Promise des ersten
// Seitenaufbaus) erledigt ist. Ruft beiNeuenAusblendungen() nur auf, wenn
// tatsächlich etwas ausgeblendet wird - mit vollständigen Daten passiert nichts.
export async function pruefeDatenImHintergrund(erstesRendern, beiNeuenAusblendungen) {
  await nachErstemBildaufbau(erstesRendern);
  await Promise.all(AUSBLENDE_DATEIEN.map(ladeFuerPruefung));
  const leer = AUSBLENDE_DATEIEN.filter((pfad) => {
    const zustand = holeDateiZustand(pfad);
    return zustand && (zustand.fehlt || zustand.anzahlDatensaetze === 0);
  });
  await Promise.all(Object.keys(ANSICHT_ANFORDERUNGEN).filter((id) => ANSICHT_ANFORDERUNGEN[id].merkmal).map(pruefeMerkmal));
  if (leer.length === 0 && merkmalFehlt.size === 0) return;
  ausgeblendeteDateien = new Set(leer);
  beiNeuenAusblendungen();
}
