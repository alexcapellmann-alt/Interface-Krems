// js/utils/urkundenOrte.js
// Gemeinsame Orts-Auflösung für die ortsbasierten Urkunden-Visualisierungen
// (Abschnitt 13, DRY). Referenzierung weiterhin rein namensbasiert (Masterprompt
// Abschnitt 8 - orte_id als robusterer Schlüssel ist laut SCHEMA.md eine offene
// Frage, hier bewusst nicht eigenmächtig vorweggenommen).
//
// REGRESSIONSSCHUTZ: aktuell genutzt von karte.js, verbindungskarte.js,
// bipartiteFlowMap.js. Änderungen hier wirken sich auf alle drei aus.

import { ladeCSV } from '../core/dataLoader.js';

let ortsVerzeichnisPromise = null;

function parseKommaZahl(rohwert) {
  const zahl = parseFloat(String(rohwert || '').trim().replace(',', '.'));
  return Number.isFinite(zahl) ? zahl : null;
}

// Lädt orte.csv einmalig (Memoisierung wie bei fotoOrdner.js) und baut ein
// Namen -> {lat, lon, ...} Verzeichnis. Orte ohne auswertbare Koordinaten werden
// nicht aufgenommen (dieselbe "Datenehrlichkeit vor Code-Eleganz"-Haltung wie beim
// DataLoader: kein Rateweise-Platzhalterwert für fehlende Koordinaten).
export function ladeOrtsVerzeichnis() {
  if (!ortsVerzeichnisPromise) {
    ortsVerzeichnisPromise = ladeCSV('data/orte.csv').then(({ records }) => {
      const verzeichnis = new Map();
      records.forEach((record) => {
        const lat = parseKommaZahl(record.lat);
        const lon = parseKommaZahl(record.lon);
        if (lat === null || lon === null) return;
        verzeichnis.set(record.orte, {
          lat,
          lon,
          orteId: record.orte_id,
          haeufigkeit: record.haeufigkeit,
          orteUnsicher: record.orte_unsicher
        });
      });
      return verzeichnis;
    });
  }
  return ortsVerzeichnisPromise;
}

// Löst die orte-Liste eines Urkunden-Records anhand des Verzeichnisses auf.
// Ergebnis: { aufgeloest: [{name, lat, lon, ...}], nicht: [name, ...] } - "nicht"
// enthält sowohl Namen ohne Verzeichniseintrag als auch Namen ohne Koordinaten.
export function loeseOrteAuf(record, ortsVerzeichnis) {
  const orteListe = Array.isArray(record.orte) ? record.orte : (record.orte ? [record.orte] : []);
  const aufgeloest = [];
  const nicht = [];
  orteListe.forEach((name) => {
    const eintrag = ortsVerzeichnis.get(name);
    if (eintrag) {
      aufgeloest.push({ name, ...eintrag });
    } else {
      nicht.push(name);
    }
  });
  return { aufgeloest, nicht };
}
