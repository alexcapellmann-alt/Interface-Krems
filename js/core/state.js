// js/core/state.js
// Vertrag: siehe Masterprompt Abschnitt 7.
//
// Zugriffsregel (Abschnitt 7): Verändert werden darf dieser Zustand ausschließlich
// durch die hier exportierten Funktionen. Andere Module dürfen ausschließlich lesen
// (getZustand()). Kein anderes Modul greift direkt auf das interne Objekt zu.

const zustand = {
  aktiverTab: null,
  aktiveAnsicht: null,
  unsicherheitModusAktiv: false,
  // Nachbesserung 1 (2026-11-15): Entity-Filter entfernt (nie ausgewertet, Prüfung 14.11.2026, Befund 8.2);
  // Kontext läuft über ?datensatz=<typ>:<id>, siehe router.js.
  filter: {
    zeitraum: null,
    suchbegriff: null
  },
  datenCache: {},
  // Auftrag "Kalender-Heatmap-Korrekturen, Sidebar-Umbau, Kategorie-Umbenennung",
  // Punkt 4: einmaliger ("one-shot") Übergabekanal für "Klick auf einen
  // Urkunden-Listeneintrag (z.B. Kalender-Heatmap) soll im Regesten-
  // Kachelraster die passende Kachel aufgeklappt/gescrollt zeigen" - bewusst
  // ein eigenes Feld für eine EINMALIGE Navigationsabsicht, die nach dem
  // ersten Konsum durch regestenKachelraster.js sofort wieder gelöscht wird
  // (siehe clearZielSignatur() dort in render()) - sonst würde ein späterer,
  // regulärer Aufruf des Kachelrasters fälschlich erneut aufklappen/scrollen.
  zielSignatur: null
};

// Liefert eine flache Kopie zum Lesen, damit Aufrufer das interne Objekt
// nicht versehentlich direkt mutieren können (siehe Zugriffsregel oben).
export function getZustand() {
  return {
    ...zustand,
    filter: { ...zustand.filter },
    datenCache: { ...zustand.datenCache }
  };
}

export function setAktiverTab(tab) {
  zustand.aktiverTab = tab;
}

export function setAktiveAnsicht(ansicht) {
  zustand.aktiveAnsicht = ansicht;
}

export function setUnsicherheitModus(aktiv) {
  zustand.unsicherheitModusAktiv = Boolean(aktiv);
}

export function toggleUnsicherheitModus() {
  zustand.unsicherheitModusAktiv = !zustand.unsicherheitModusAktiv;
}

export function setFilterZeitraum(zeitraum) {
  zustand.filter.zeitraum = zeitraum;
}

export function setFilterSuchbegriff(suchbegriff) {
  zustand.filter.suchbegriff = suchbegriff;
}

export function setZielSignatur(signatur) {
  zustand.zielSignatur = signatur;
}

export function clearZielSignatur() {
  zustand.zielSignatur = null;
}

export function setDatenCacheEintrag(schluessel, wert) {
  zustand.datenCache[schluessel] = wert;
}

export function getDatenCacheEintrag(schluessel) {
  return zustand.datenCache[schluessel];
}
