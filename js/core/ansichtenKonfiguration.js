// js/core/ansichtenKonfiguration.js
// AUFTRAG C1, Punkt 2 (Prüfbericht Punkt 6, Übertragbarkeit): die
// archivspezifischen Angaben der Bereiche und Ansichten kommen aus
// data/ansichten.csv - Name eines Bereichs, Name und Beschreibung einer
// Ansicht, Reihenfolge und ob eine Ansicht überhaupt angeboten wird.
// Die Technik bleibt in js/config/archivalienRegistry.js: welche Datei zu
// welchem Bereich gehört und welches Modul eine Ansicht zeichnet. Ein neuer
// Bereichstyp ist deshalb allein über die Daten nicht möglich.
//
// Ablauf: app.js lädt die Datei GLEICHZEITIG mit archiv.csv vor dem ersten
// Aufbau (kein zusätzlicher Ladeschritt) und übergibt die Zeilen an
// wendeAnsichtenKonfigurationAn(). Diese passt die Registry-Einträge an Ort
// und Stelle an, sodass alle Nutzer der Registry (Navigation, Galerie,
// Bereichsleiste, Datensatz-Aufruf) ohne eigene Änderung die Angaben sehen.
//
// Fehlt die Datei, ist sie leer oder fehlt die Spalte `bereich`, gelten die
// neutralen Vorgaben aus der Registry - kein Absturz. Ist die Datei
// unbrauchbar (Spalte `bereich` fehlt, falsches Trennzeichen), meldet das der
// Hinweisbalken der Startseite (datenAnforderungen.js, `optional`).

import { ladeGecachteCSV } from './datenCache.js';
import { ARCHIVALIENTYPEN, BESTAND_ANSICHTEN } from '../config/archivalienRegistry.js';

export const ANSICHTEN_PFAD = 'data/ansichten.csv';

export function ladeAnsichtenKonfiguration() {
  return ladeGecachteCSV(ANSICHTEN_PFAD).catch(() => []);
}

const alsText = (wert) => (Array.isArray(wert) ? wert.join(' ') : String(wert ?? '')).trim();

// Sortiert eine Liste an Ort und Stelle nach `reihenfolge`; Einträge ohne
// gültige Angabe behalten ihre bisherige Position hinter den angegebenen.
function sortiereAnOrt(liste, reihenfolgeVon) {
  const sortiert = liste
    .map((eintrag, index) => {
      const angabe = Number(reihenfolgeVon(eintrag));
      return { eintrag, schluessel: Number.isFinite(angabe) && reihenfolgeVon(eintrag) !== '' ? angabe : 100000 + index };
    })
    .sort((a, b) => a.schluessel - b.schluessel)
    .map(({ eintrag }) => eintrag);
  liste.splice(0, liste.length, ...sortiert);
}

export function wendeAnsichtenKonfigurationAn(zeilen) {
  if (!Array.isArray(zeilen) || zeilen.length === 0 || !('bereich' in zeilen[0])) return;

  const bereiche = new Map(ARCHIVALIENTYPEN.map((typ) => [typ.typ, typ]));
  bereiche.set('bestand', { typ: 'bestand', ansichten: BESTAND_ANSICHTEN });
  const reihenfolgeBereich = new Map();
  const reihenfolgeAnsicht = new Map();
  const nichtAnbieten = new Set();

  zeilen.forEach((zeile) => {
    const bereichId = alsText(zeile.bereich);
    const ansichtId = alsText(zeile.ansicht);
    const bereich = bereiche.get(bereichId);
    if (!bereich) {
      if (bereichId) console.warn(`ansichten.csv: unbekannter Bereich "${bereichId}" - Zeile wird ignoriert.`);
      return;
    }
    const name = alsText(zeile.name);
    const anbieten = alsText(zeile.anbieten).toLowerCase() !== 'nein';
    if (!ansichtId) {
      // Zeile beschreibt den Bereich selbst (der Name "Bestand" ist der Reiter der Hauptnavigation und bleibt).
      if (name && bereichId !== 'bestand') bereich.label = name;
      reihenfolgeBereich.set(bereich, alsText(zeile.reihenfolge));
      if (!anbieten && bereichId !== 'bestand') nichtAnbieten.add(bereich);
      return;
    }
    const ansicht = bereich.ansichten.find((a) => a.id === ansichtId);
    if (!ansicht) {
      console.warn(`ansichten.csv: unbekannte Ansicht "${ansichtId}" im Bereich "${bereichId}" - Zeile wird ignoriert.`);
      return;
    }
    if (name) ansicht.label = name;
    const beschreibung = alsText(zeile.beschreibung);
    if (beschreibung) {
      // Vorgabe aus der Registry aufheben: gilt, wenn ein Platzhalter (z. B.
      // {n_urkunden_punkt}) nicht aufgelöst werden kann (app.js).
      ansicht.beschreibungStandard = ansicht.beschreibung;
      ansicht.beschreibung = beschreibung;
    }
    reihenfolgeAnsicht.set(ansicht, alsText(zeile.reihenfolge));
    if (!anbieten) nichtAnbieten.add(ansicht);
  });

  bereiche.forEach((bereich) => {
    const behalten = bereich.ansichten.filter((a) => !nichtAnbieten.has(a));
    bereich.ansichten.splice(0, bereich.ansichten.length, ...behalten);
    sortiereAnOrt(bereich.ansichten, (a) => reihenfolgeAnsicht.get(a) ?? '');
    if (bereich.primaeransicht && !bereich.ansichten.some((a) => a.id === bereich.primaeransicht)) {
      bereich.primaeransicht = bereich.ansichten[0]?.id;
    }
  });
  const behalteneTypen = ARCHIVALIENTYPEN.filter((typ) => !nichtAnbieten.has(typ) && typ.ansichten.length > 0);
  ARCHIVALIENTYPEN.splice(0, ARCHIVALIENTYPEN.length, ...behalteneTypen);
  sortiereAnOrt(ARCHIVALIENTYPEN, (typ) => reihenfolgeBereich.get(typ) ?? '');
}
