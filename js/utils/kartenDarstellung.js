// js/utils/kartenDarstellung.js
// Nachbesserung 5 (Entscheidung des Autors, 15.11.2026): Ausschnitte und Beschriftungen einer Kartendatei stehen in
// einer Begleitdatei daneben – gleicher Name, Endung `.darstellung.json` (z. B. vendor/karten/krems.json →
// vendor/karten/krems.darstellung.json). Ein anderes Archiv tauscht Karte und Begleitdatei gemeinsam aus; das
// Erzeugungsskript der Karte überschreibt die Begleitdatei nicht. Aufbau siehe docs/SCHEMA.md, Abschnitt 13.1.
//
// Fehlt die Begleitdatei oder der benannte Ausschnitt, zeigt die Karte den ganzen Bereich der Kartendatei (`bereich`)
// ohne Beschriftungen; die Konsole nennt die fehlende Datei (dezent, kein Warnbalken: die Karte ist Hintergrund).

const zwischenspeicher = new Map();

export function darstellungsPfad(kartenPfad) {
  return String(kartenPfad || '').replace(/\.json$/i, '') + '.darstellung.json';
}

// Lädt die Begleitdatei einmal je Pfad; Ergebnis oder null
export function ladeKartenDarstellung(kartenPfad) {
  if (!kartenPfad) return Promise.resolve(null);
  const pfad = darstellungsPfad(kartenPfad);
  if (!zwischenspeicher.has(pfad)) {
    zwischenspeicher.set(pfad, fetch(pfad)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => {
        if (!d) console.warn(`Kartendarstellung nicht gefunden: ${pfad}. Die Karte zeigt ihren ganzen Bereich ohne Beschriftungen.`);
        return d;
      }));
  }
  return zwischenspeicher.get(pfad);
}

// Benannter Ausschnitt { W, E, S, N, beschriftungen } oder null (Begleitdatei fehlt, Name fehlt, Werte unbrauchbar)
export function ausschnittAus(darstellung, name) {
  const a = darstellung?.ausschnitte?.[name];
  if (!a || ![a.W, a.E, a.S, a.N].every(Number.isFinite)) {
    if (darstellung) console.warn(`Kartendarstellung: Ausschnitt „${name}“ fehlt oder ist unvollständig. Die Karte zeigt ihren ganzen Bereich.`);
    return null;
  }
  const beschriftungen = (Array.isArray(a.beschriftungen) ? a.beschriftungen : [])
    .filter((b) => b && typeof b.text === 'string' && Number.isFinite(b.lat) && Number.isFinite(b.lon));
  return { W: a.W, E: a.E, S: a.S, N: a.N, beschriftungen };
}

// Sichtfenster in Kartenkoordinaten (x = Länge · cos(lat0) · faktor, y = −Breite · faktor, wie die Kartendateien):
// aus dem Ausschnitt, sonst aus `bereich` der Kartendatei ([x0, y0, x1, y1]), sonst null
export function sichtfenster(grund, ausschnitt) {
  const faktor = grund?.faktor ?? 1;
  const k = Math.cos(((grund?.lat0 ?? 0) * Math.PI) / 180) * faktor;
  if (ausschnitt) return { x0: ausschnitt.W * k, x1: ausschnitt.E * k, y0: -ausschnitt.N * faktor, y1: -ausschnitt.S * faktor, k, faktor };
  const b = grund?.bereich;
  if (Array.isArray(b) && b.length === 4 && b.every(Number.isFinite)) return { x0: b[0], y0: b[1], x1: b[2], y1: b[3], k, faktor };
  return null;
}
