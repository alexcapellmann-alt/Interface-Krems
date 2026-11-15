// tests/hilfen.mjs
// Gemeinsame Hilfen der Tests (Aufruf: `node --test tests/`, ohne Installation, ohne Netzwerk).
// - d3 wird wie im Browser als globales `d3` aus vendor/d3/d3.v7.min.js geladen (kein npm-Paket).
// - `fetch` liest im Test lokale Dateien bzw. vorgegebene Texte statt über das Netz.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function ladeD3() {
  if (globalThis.d3) return globalThis.d3;
  globalThis.self = globalThis; // die UMD-Datei hängt d3 an `self`
  vm.runInThisContext(fs.readFileSync(path.join(WURZEL, 'vendor/d3/d3.v7.min.js'), 'utf8'));
  return globalThis.d3;
}

// fetch für Tests: Pfade aus `texte` (Pfad -> Inhalt) zuerst, sonst die Datei unter der Projektwurzel; fehlt sie: 404
export function setzeTestFetch(texte = {}) {
  globalThis.fetch = async (pfad) => {
    const p = String(pfad).replace(/^\.?\//, '');
    if (Object.hasOwn(texte, p)) return new Response(texte[p], { status: 200 });
    const datei = path.join(WURZEL, p);
    if (fs.existsSync(datei)) return new Response(fs.readFileSync(datei), { status: 200 });
    return new Response('', { status: 404 });
  };
}

// Eine CSV-Datei aus data/ mit dem d3-Parser lesen (Semikolon, BOM entfernt) – wie der DataLoader, aber ohne Aufbereitung
export function leseCsvRoh(name) {
  const d3 = ladeD3();
  const text = fs.readFileSync(path.join(WURZEL, 'data', name), 'utf8').replace(/^﻿/, '');
  return d3.dsvFormat(';').parse(text);
}
