// js/utils/viewportGroesse.js
// Geteilte Höhen-/Breitenermittlung für Urkunden-Module mit bildschirmfüllender,
// responsiver Darstellung (Auftrag "Geteilte Viewport-Utilities") -
// verallgemeinert aus zeitachse.js' vorheriger, dort lokalen
// ermittleVerfuegbareHoehe() (siehe deren Folgeauftrag "Größe & Kategorie-
// Mehrfachauswahl"), damit künftige Urkunden-Module dieselbe Lösung
// wiederverwenden statt sie leicht unterschiedlich neu zu bauen.
//
// Rein lesend (misst nur den bereits gerenderten DOM-Zustand) - registriert
// selbst KEINEN eigenen resize-Listener. Jedes aufrufende Modul nutzt
// weiterhin sein eigenes, bereits etabliertes resize()-Interface (200ms
// Debounce, zentral in js/core/app.js verdrahtet) und ruft diese Funktionen
// von dort aus bei jedem Neuaufbau erneut auf - exakt das bisherige Muster,
// nur nicht mehr pro Modul dupliziert.

const STANDARD_MINDEST_HOEHE = 320;
const STANDARD_SEITENFUSS_PUFFER = 24;
const STANDARD_BREITEN_FALLBACK = 900;

// referenzElement: das (ggf. noch leere, aber bereits ins DOM gehängte)
// Element, dessen Position im Viewport die tatsächlich verfügbare Höhe
// bestimmt (window.innerHeight abzüglich seiner eigenen Top-Position) -
// identische Formel zu zeitachse.js' vorheriger lokaler Implementierung.
//
// reserveUnten: modul-eigener Platzbedarf UNTERHALB des Referenzelements
// (z.B. zeitachse.js' Achsenrand RAND.unten) - kennt nur das aufrufende
// Modul selbst, daher als Parameter statt hier fest codiert.
export function ermittleVerfuegbareHoehe(referenzElement, {
  reserveUnten = 0,
  mindestHoehe = STANDARD_MINDEST_HOEHE,
  seitenfussPuffer = STANDARD_SEITENFUSS_PUFFER
} = {}) {
  const oben = referenzElement.getBoundingClientRect().top;
  const verfuegbar = window.innerHeight - oben - seitenfussPuffer - reserveUnten;
  return Math.max(mindestHoehe, Math.round(verfuegbar));
}

// Analoge Breitenermittlung - clientWidth des Referenzelements mit Fallback,
// falls das Element (noch) keine Breite hat (z.B. beim allerersten Aufbau,
// bevor der Browser einen Reflow durchgeführt hat).
export function ermittleVerfuegbareBreite(referenzElement, {
  fallback = STANDARD_BREITEN_FALLBACK,
  mindestBreite = 0
} = {}) {
  const breite = referenzElement.clientWidth || fallback;
  return Math.max(mindestBreite, breite);
}

// Bequemlichkeits-Funktion für Module, die Breite UND Höhe vom SELBEN
// Referenzelement ableiten können (zeitachse.js braucht dagegen zwei
// unterschiedliche Referenzelemente für Breite/Höhe - siehe dortige
// getrennte Aufrufe von ermittleVerfuegbareBreite()/ermittleVerfuegbareHoehe()
// weiter oben - für den einfacheren Fall reicht dieser kombinierte Aufruf).
export function ermittleVerfuegbareGroesse(referenzElement, config = {}) {
  return {
    breite: ermittleVerfuegbareBreite(referenzElement, config),
    hoehe: ermittleVerfuegbareHoehe(referenzElement, config)
  };
}
