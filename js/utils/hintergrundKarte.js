// js/utils/hintergrundKarte.js
// Zurückhaltender Stadtplan des Archivorts als Seitenhintergrund auf allen Seiten. Ausnahme: die Zeitleiste der
// Führungen zeichnet denselben Stadtplan selbst.
//
// Der Pfad kommt aus data/archiv.csv (`hintergrundkarte_pfad`), Ausschnitt und Beschriftungen aus der Begleitdatei
// <karte>.darstellung.json (js/utils/kartenDarstellung.js). Die Pfade werden EINMAL zu einem SVG gebaut und als
// Hintergrundbild (Blob-URL) gesetzt; die Seite schaltet nur noch eine Klasse am <body>.
// Leerer Eintrag = bewusst ohne Karte (kein Abruf); fehlt die Datei, nennt die Konsole den Eintrag statt eines
// stillen 404, und der Hintergrund bleibt einfarbig.

import { konfigurationswert } from '../core/archivKonfiguration.js';
import { ladeKartenDarstellung, ausschnittAus, sichtfenster } from './kartenDarstellung.js';

export function hintergrundkartenPfad() { return String(konfigurationswert('hintergrundkarte_pfad') || '').trim(); }
// Nachbesserung 5: Ausschnitt und Ortsnamen (Text, Lage, Größe, `wasser` für Gewässer) stehen in der Begleitdatei der Karte
// (Ausschnitt „hintergrund“, js/utils/kartenDarstellung.js); ohne sie der ganze Kartenbereich ohne Namen.
const AUSSCHNITT_NAME = 'hintergrund';
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
const maskiere = (t) => String(t).replace(/[&<>"]/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[z]));

function baueSvgUrl(grund, fassung, ausschnitt) {
  const { ebenen, name, wasserName } = FASSUNGEN[fassung];
  const fenster = sichtfenster(grund, ausschnitt);
  if (!fenster) return null;
  const { k, x0, x1, y0, y1 } = fenster;
  const pfade = ebenen.filter(([ebene]) => grund.ebenen[ebene])
    .map(([ebene, breite, farbe, deckkraft]) => `<path d="${grund.ebenen[ebene]}" stroke="${farbe}" stroke-opacity="${deckkraft}" stroke-width="${breite}" vector-effect="non-scaling-stroke"/>`)
    .join('');
  const namen = (ausschnitt?.beschriftungen || []).map((b) => {
    const x = b.lon * k, y = -b.lat * grund.faktor;
    const groesse = Number.isFinite(b.groesse) ? b.groesse : 9;
    const stil = b.wasser
      ? `fill="${wasserName[0]}" fill-opacity="${wasserName[1]}" font-style="italic" letter-spacing="1"`
      : `fill="${name[0]}" fill-opacity="${name[1]}" letter-spacing="${groesse * 0.35}"`;
    return `<text x="${x}" y="${y}" font-family="Georgia, 'Times New Roman', serif" font-size="${groesse}" text-anchor="middle" ${stil}>${maskiere(b.text)}</text>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" preserveAspectRatio="xMidYMid slice">`
    + `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${pfade}</g>${namen}</svg>`;
  return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
}

function ladeKarte() {
  if (!ladeVersprechen) {
    const pfad = hintergrundkartenPfad();
    ladeVersprechen = !pfad ? Promise.resolve(null) : fetch(pfad)
      .then((r) => {
        if (r.ok) return r.json();
        console.warn(`Hintergrundkarte nicht gefunden: ${pfad} (Eintrag hintergrundkarte_pfad in data/archiv.csv). Die Seiten erscheinen ohne Kartenhintergrund.`);
        return null;
      })
      .then(async (grund) => {
        if (!grund) return null;
        const ausschnitt = ausschnittAus(await ladeKartenDarstellung(pfad), AUSSCHNITT_NAME);
        const hell = baueSvgUrl(grund, 'hell', ausschnitt), dunkel = baueSvgUrl(grund, 'dunkel', ausschnitt);
        if (!hell) return null;
        document.body.style.setProperty('--hintergrundkarte', `url("${hell}")`);
        document.body.style.setProperty('--hintergrundkarte-dunkel', `url("${dunkel}")`);
        return true;
      })
      .catch(() => null);
  }
  return ladeVersprechen;
}

// Welche Seiten den Hintergrund bekommen (route aus router.js: { tab, segmente })
export function seiteMitHintergrundkarte(route) {
  const [a] = route.segmente || [];
  // nicht die Zeitleiste der Führungen, die ihren eigenen Stadtplan zeichnet
  return !(route.tab === 'fuehrungen' && a === 'zeitleiste');
}

export function aktualisiereHintergrundkarte(route) {
  const an = seiteMitHintergrundkarte(route);
  document.body.classList.toggle('mit-hintergrundkarte', an);
  if (an) ladeKarte();
}
