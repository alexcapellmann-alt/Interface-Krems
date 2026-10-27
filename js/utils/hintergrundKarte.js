// js/utils/hintergrundKarte.js
// Zurückhaltender Stadtplan von Krems als Seitenhintergrund (Wunsch des Autors, 2026-10-27) auf den
// Übersichtsseiten: Bestand, Erkundung (Startseite und die Seiten der Bereiche Urkunden, Personen, Orte),
// Literatur und Über. Nicht in den einzelnen Visualisierungen, wo er mit den Diagrammen konkurrieren würde.
//
// Datengrundlage wie die Zeitleiste der Führungen: vendor/karten/krems.json (OpenStreetMap, ODbL,
// erzeugt mit Interface-Krems-Testserver\karte_krems.py). Die Pfade werden EINMAL zu einem SVG
// gebaut und als Hintergrundbild (Blob-URL) gesetzt; die Seite schaltet nur noch eine Klasse am <body>.
// Fehlt die Datei, bleibt der Hintergrund schlicht einfarbig.

const KARTE_PFAD = 'vendor/karten/krems.json';
// Ausschnitt (Grad): Altstädte von Krems und Stein, wie in der Zeitleiste
const FOKUS = { W: 15.565, E: 15.640, S: 48.396, N: 48.426 };
// [Ebene, Linienbreite px, Farbe, Deckkraft] - sehr dezent, Text liegt darüber
const EBENEN = [
  ['klein', 0.8, '#6b6358', 0.10], ['bahn', 1.1, '#6b6358', 0.11], ['gross', 1.6, '#6b6358', 0.14],
  ['wasser', 1.3, '#5f8aa6', 0.17], ['fluss', 3, '#5f8aa6', 0.20]
];

let ladeVersprechen = null;

function baueSvgUrl(grund) {
  const k = Math.cos(grund.lat0 * Math.PI / 180) * grund.faktor;
  const x0 = FOKUS.W * k, x1 = FOKUS.E * k, y0 = -FOKUS.N * grund.faktor, y1 = -FOKUS.S * grund.faktor;
  const pfade = EBENEN.filter(([name]) => grund.ebenen[name])
    .map(([name, breite, farbe, deckkraft]) => `<path d="${grund.ebenen[name]}" stroke="${farbe}" stroke-opacity="${deckkraft}" stroke-width="${breite}" vector-effect="non-scaling-stroke"/>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" preserveAspectRatio="xMidYMid slice">`
    + `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${pfade}</g></svg>`;
  return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
}

function ladeKarte() {
  if (!ladeVersprechen) {
    ladeVersprechen = fetch(KARTE_PFAD)
      .then((r) => (r.ok ? r.json() : null))
      .then((grund) => {
        if (!grund) return null;
        document.body.style.setProperty('--hintergrundkarte', `url("${baueSvgUrl(grund)}")`);
        return true;
      })
      .catch(() => null);
  }
  return ladeVersprechen;
}

// Welche Seiten den Hintergrund bekommen (route aus router.js: { tab, segmente })
export function seiteMitHintergrundkarte(route) {
  const [a, b] = route.segmente || [];
  if (route.tab === 'bestand') return !a;
  if (route.tab === 'visualisierungen') return !b; // Startseite „Erkundung“ und Bereichsseiten
  return route.tab === 'literatur' || route.tab === 'ueber';
}

export function aktualisiereHintergrundkarte(route) {
  const an = seiteMitHintergrundkarte(route);
  document.body.classList.toggle('mit-hintergrundkarte', an);
  if (an) ladeKarte();
}
