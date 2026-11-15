// js/core/unbekannteDaten.js
// Nachbesserung 4, Punkt 4 (Befund 4.3, Masterprompt §2 „noch nicht visualisierbar“): Datenbestände, für die das
// Interface noch keine Visualisierung hat, werden auf der Startseite der Erkundung dezent genannt statt übergangen.
//
// Zwei Wege (Entscheidung des Autors, 15.11.2026):
// 1. Eine Bereichszeile in data/ansichten.csv, deren Bereich die Registry nicht kennt (z. B.
//    `gemeinderatsprotokolle;;Gemeinderatsprotokolle;…`) – funktioniert auf jedem Server, auch auf GitHub Pages.
// 2. Nur wenn die Seite lokal läuft (localhost): der Ordner data/ wird abgefragt; liefert der Server eine
//    Verzeichnisliste, gilt jede .csv-Datei als unbekannt, die weder eine Ansicht noch die Konfiguration nutzt.
//    Auf GitHub Pages gibt es keine Verzeichnisliste; dort wird nicht gefragt (kein 404).
// Ein neuer Bereichstyp entsteht dadurch nicht (Masterprompt, Auftrag C1) – es ist nur ein Hinweis.

import { ARCHIVALIENTYPEN } from '../config/archivalienRegistry.js';
import { ANSICHT_ANFORDERUNGEN } from '../config/datenAnforderungen.js';
import { unbekannteBereichszeilen } from './ansichtenKonfiguration.js';

// Konfigurations- und Begleitdateien, die nicht in datenAnforderungen.js stehen
const KONFIGURATIONSDATEIEN = ['archiv.csv', 'ansichten.csv', 'infotexte.csv', 'recherche_links.csv', 'startseite.csv',
  'ueber.csv', 'literatur.csv', 'fuehrungen.csv', 'wortwolke_filter.csv'];
const BEGLEITDATEI_PRAEFIXE = ['buergerinnen_']; // Willkommenstour

function bekannteDateien() {
  const namen = new Set(KONFIGURATIONSDATEIEN);
  const nimm = (pfad) => { if (typeof pfad === 'string') namen.add(pfad.split('/').pop()); };
  ARCHIVALIENTYPEN.forEach((t) => (typeof t.datenDatei === 'string' ? nimm(t.datenDatei) : Object.values(t.datenDatei || {}).forEach(nimm)));
  Object.values(ANSICHT_ANFORDERUNGEN).forEach((a) => {
    ['dateien', 'neben', 'optional', 'bedarf'].forEach((art) => Object.keys(a[art] || {}).forEach(nimm));
    nimm(a.ausblenden);
  });
  return namen;
}

function laeuftLokal() {
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.localhost');
}

async function csvDateienImOrdner() {
  if (!laeuftLokal()) return [];
  try {
    const antwort = await fetch('data/');
    if (!antwort.ok || !(antwort.headers.get('content-type') || '').includes('html')) return [];
    const dok = new DOMParser().parseFromString(await antwort.text(), 'text/html');
    return [...dok.querySelectorAll('a[href]')]
      .map((a) => decodeURIComponent(a.getAttribute('href').split('?')[0].split('/').pop()))
      .filter((n) => /\.csv$/i.test(n));
  } catch {
    return [];
  }
}

// Liste [{ name, datei }] der Datenbestände ohne Visualisierung (leer, wenn es keine gibt)
export async function ermittleUnbekannteDatenbestaende() {
  const ergebnis = new Map();
  unbekannteBereichszeilen().forEach(({ id, name }) => ergebnis.set(id, { name, datei: `${id}.csv` }));
  const bekannt = bekannteDateien();
  (await csvDateienImOrdner())
    .filter((n) => !bekannt.has(n) && !BEGLEITDATEI_PRAEFIXE.some((p) => n.startsWith(p)))
    .forEach((n) => {
      const id = n.replace(/\.csv$/i, '');
      if (!ergebnis.has(id)) ergebnis.set(id, { name: id, datei: n });
    });
  return [...ergebnis.values()];
}

// Dezenter Hinweis (kein Warnbalken): ein Absatz unter der Einleitung der Erkundung
export function baueHinweisUnbekannteDaten(liste) {
  if (!liste.length) return null;
  const p = document.createElement('p');
  p.className = 'hinweis-unbekannte-daten';
  const namen = liste.map((e) => `${e.name} (${e.datei})`);
  const aufzaehlung = namen.length > 1 ? `${namen.slice(0, -1).join(', ')} und ${namen.at(-1)}` : namen[0];
  p.textContent = `Für ${aufzaehlung} gibt es in diesem Interface noch keine Visualisierung. Die Daten sind vorhanden, werden aber noch nicht angezeigt.`;
  return p;
}
