// js/utils/ortsart.js
// Art eines Eintrags der Ortsliste (Spalte `ortsart` in orte.csv, Auftrag 11). Einträge, die keinen Ort meinen, sondern nur
// Namensbestandteil einer Person sind (`Herkunftsname`), bleiben in den Daten und in der Spalte `orte` der Urkunden stehen.
// Ansichten, die Orte als Orte behandeln (Karten, Ortsliste, Ortswolke, Kategoriefluss), überspringen sie. Die Regel steht
// nur hier; angewandt wird sie zentral beim Laden der Daten (js/core/app.js, ladeArchivalienDaten) und im
// Ortsverzeichnis der Karten (js/utils/urkundenOrte.js). Kacheln und Detailansichten zeigen weiter die Orte wie im Regest
// (`orte_im_regest`), damit der Name aus dem Regest nachvollziehbar bleibt. Leere `ortsart` gilt als Ort.

export const ORTSARTEN_OHNE_ORTSBEZUG = new Set(['Herkunftsname']);

const text = (v) => String(v ?? '').trim();
const liste = (v) => (Array.isArray(v) ? v : (v ? String(v).split('|') : [])).map(text).filter(Boolean);

export function hatOrtsbezug(ortRecord) {
  return !ORTSARTEN_OHNE_ORTSBEZUG.has(text(ortRecord?.ortsart));
}

export function namenOhneOrtsbezug(orteRecords) {
  return new Set((orteRecords || []).filter((r) => !hatOrtsbezug(r)).map((r) => text(r.orte)).filter(Boolean));
}

// Filtert die Spalte `orte` der Urkunden um Namen ohne Ortsbezug und bewahrt die ursprüngliche Liste in `orte_im_regest`.
// Mehrfacher Aufruf auf denselben (gecachten) Datensätzen ist unschädlich.
export function bereinigeUrkundenOrte(urkunden, ohneOrtsbezug) {
  if (!Array.isArray(urkunden)) return urkunden;
  urkunden.forEach((r) => {
    if (!r || r.orte_im_regest !== undefined) return;
    r.orte_im_regest = r.orte;
    if (!ohneOrtsbezug.size) return;
    const vorher = liste(r.orte);
    const nachher = vorher.filter((n) => !ohneOrtsbezug.has(n));
    if (nachher.length !== vorher.length) r.orte = Array.isArray(r.orte) ? nachher : nachher.join('|');
  });
  return urkunden;
}

// Für Anzeigen (Kachel, Detailansicht): die Orte wie im Regest.
export function orteWieImRegest(record) {
  return record?.orte_im_regest !== undefined ? record.orte_im_regest : record?.orte;
}
