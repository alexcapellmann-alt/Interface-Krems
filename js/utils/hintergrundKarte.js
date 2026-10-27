// js/utils/hintergrundKarte.js
// Zurückhaltender Stadtplan von Krems und Stein als Seitenhintergrund (Wunsch des Autors, 2026-10-27) auf der
// Startseite und den Übersichtsseiten: Bestand, Erkundung (Startseite und die Seiten der Bereiche Urkunden, Personen, Orte),
// Literatur und Über. Nicht in den einzelnen Visualisierungen, wo er mit den Diagrammen konkurrieren würde.
//
// Datengrundlage wie die Zeitleiste der Führungen: vendor/karten/krems.json (OpenStreetMap, ODbL,
// erzeugt mit Interface-Krems-Testserver\karte_krems.py). Die Pfade werden EINMAL zu einem SVG
// gebaut und als Hintergrundbild (Blob-URL) gesetzt; die Seite schaltet nur noch eine Klasse am <body>.
// Fehlt die Datei, bleibt der Hintergrund schlicht einfarbig.

const KARTE_PFAD = 'vendor/karten/krems.json';
// Ausschnitt (Grad): Krems, Stein und gegenüber Mautern mit der Donau dazwischen
const FOKUS = { W: 15.552, E: 15.642, S: 48.386, N: 48.426 };
// Ortsnamen, dezent in die Karte geschrieben (Lage der Ortskerne, Grad)
const BESCHRIFTUNGEN = [
  { text: 'KREMS', lat: 48.4115, lon: 15.6050, groesse: 11 },
  { text: 'STEIN', lat: 48.4035, lon: 15.5835, groesse: 9 },
  { text: 'MAUTERN', lat: 48.3925, lon: 15.5770, groesse: 8 },
  { text: 'Donau', lat: 48.3978, lon: 15.6050, groesse: 8, wasser: true }
];
// Zwei Fassungen: `hell` für helle Seiten (dunkle Linien), `dunkel` für die dunkle Bühne der
// Führungsstationen (helle Linien, wie in der Bilderwand). [Ebene, Linienbreite px, Farbe, Deckkraft]
const FASSUNGEN = {
  hell: {
    ebenen: [['klein', 0.8, '#6b6358', 0.10], ['bahn', 1.1, '#6b6358', 0.11], ['gross', 1.6, '#6b6358', 0.14],
      ['wasser', 1.3, '#5f8aa6', 0.17], ['fluss', 3, '#5f8aa6', 0.20]],
    name: ['#6b6358', 0.26], wasserName: ['#5f8aa6', 0.32]
  },
  dunkel: {
    ebenen: [['klein', 0.8, '#ffffff', 0.05], ['bahn', 1.1, '#ffffff', 0.06], ['gross', 1.6, '#ffffff', 0.08],
      ['wasser', 1.3, '#9fc3dc', 0.10], ['fluss', 3, '#9fc3dc', 0.12]],
    name: ['#ffffff', 0.12], wasserName: ['#9fc3dc', 0.16]
  }
};

let ladeVersprechen = null;

function baueSvgUrl(grund, fassung) {
  const { ebenen, name, wasserName } = FASSUNGEN[fassung];
  const k = Math.cos(grund.lat0 * Math.PI / 180) * grund.faktor;
  const x0 = FOKUS.W * k, x1 = FOKUS.E * k, y0 = -FOKUS.N * grund.faktor, y1 = -FOKUS.S * grund.faktor;
  const pfade = ebenen.filter(([ebene]) => grund.ebenen[ebene])
    .map(([ebene, breite, farbe, deckkraft]) => `<path d="${grund.ebenen[ebene]}" stroke="${farbe}" stroke-opacity="${deckkraft}" stroke-width="${breite}" vector-effect="non-scaling-stroke"/>`)
    .join('');
  const namen = BESCHRIFTUNGEN.map((b) => {
    const x = b.lon * k, y = -b.lat * grund.faktor;
    const stil = b.wasser
      ? `fill="${wasserName[0]}" fill-opacity="${wasserName[1]}" font-style="italic" letter-spacing="1"`
      : `fill="${name[0]}" fill-opacity="${name[1]}" letter-spacing="${b.groesse * 0.35}"`;
    return `<text x="${x}" y="${y}" font-family="Georgia, 'Times New Roman', serif" font-size="${b.groesse}" text-anchor="middle" ${stil}>${b.text}</text>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" preserveAspectRatio="xMidYMid slice">`
    + `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${pfade}</g>${namen}</svg>`;
  return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
}

function ladeKarte() {
  if (!ladeVersprechen) {
    ladeVersprechen = fetch(KARTE_PFAD)
      .then((r) => (r.ok ? r.json() : null))
      .then((grund) => {
        if (!grund) return null;
        document.body.style.setProperty('--hintergrundkarte', `url("${baueSvgUrl(grund, 'hell')}")`);
        document.body.style.setProperty('--hintergrundkarte-dunkel', `url("${baueSvgUrl(grund, 'dunkel')}")`);
        return true;
      })
      .catch(() => null);
  }
  return ladeVersprechen;
}

// Welche Seiten den Hintergrund bekommen (route aus router.js: { tab, segmente })
export function seiteMitHintergrundkarte(route) {
  const [a, b] = route.segmente || [];
  if (!route.tab) return true; // Startseite (seit 2026-10-27)
  if (route.tab === 'bestand') return !a;
  if (route.tab === 'visualisierungen') return !b; // Startseite „Erkundung“ und Bereichsseiten
  // Führungen (seit 2026-10-27): Übersicht und Stationen; nicht die Zeitleiste, die ihren eigenen Stadtplan zeichnet
  if (route.tab === 'fuehrungen') return a !== 'zeitleiste';
  return route.tab === 'literatur' || route.tab === 'ueber';
}

export function aktualisiereHintergrundkarte(route) {
  const an = seiteMitHintergrundkarte(route);
  document.body.classList.toggle('mit-hintergrundkarte', an);
  if (an) ladeKarte();
}
