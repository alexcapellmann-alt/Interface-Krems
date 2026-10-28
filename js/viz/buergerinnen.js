// js/viz/buergerinnen.js
// „Bürgerinnen?“ (Wunsch des Autors, 2026-10-28): Das Bürgerbuch von Krems (1535–1625) nennt 2 655 Personen -
// Neubürger und ihre Bürgen -, aber keine einzige Frau. Die Ansicht zeigt dieses Fehlen: ein Punktfeld mit
// einem Punkt je Person (zusammen bilden sie das Steiner Tor); ein Klick auf „Nach Geschlecht ordnen“ lässt die Punkte in zwei Spalten fließen,
// links „Männer“, rechts „Frauen“. Die rechte Spalte bleibt leer - als gestrichelter Rahmen in derselben
// Größe, damit sichtbar wird, dass hier Platz wäre. Ein Satz darunter verhindert den Fehlschluss, es habe
// keine Frauen gegeben, und verweist auf die Führung „Frauen im Archiv“.
//
// Personen: aufgenommene Personen (`personen_id`) und Bürgen (`buergen_id`) aus buergerbuch.csv, je Person
// ein Punkt (eindeutige Kennung). Das Bürgerbuch hat keine Spalte zum Geschlecht; dass keine Frau darin
// vorkommt, hat der Autor am Quelltext geprüft. Trägt ein Datensatz künftig `geschlecht` = w/weiblich,
// erscheint die Person rechts - die Ansicht behauptet die Null also nicht, sie zählt sie.
// Klick auf einen Punkt (seit 2026-10-28, Wunsch des Autors) öffnet dieselbe Sidebar wie die Personenliste:
// alle Quelleneinträge der Person (Bürgerbuch als Neubürger oder Bürge, dazu Urkunden und Inventare aus der
// Personenliste). Klick auf eine freie Stelle oder auf „Nach Geschlecht ordnen“/„Wieder mischen“ schließt sie.
// Nach dem Ordnen steht zwischen den beiden Spalten eine kurze Erklärung (2026-10-28): was das Bürgerbuch ist und
// warum keine Frau darin steht (ERKLAERUNG); auf schmalen Bildschirmen steht sie unter den Spalten.
// Modul-Interface siehe Abschnitt 5.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { infotextFuerModul } from '../core/archivKonfiguration.js';
import { ermittleVerfuegbareHoehe } from '../utils/viewportGroesse.js';
import { teileNachJahr } from '../utils/buergerbuchZeit.js';
import { alsText } from '../utils/textwert.js';
import { baueSidebarGeruest, fuegeSidebarStyleEin, schliesseSidebar } from '../utils/sidebar.js';
import {
  zeigePersonenNennungen, zurueckZurKombiniertenListe, ermittleUrkundenFuerPerson, ermittleBuergerbuchFuerPerson, ermittleInventareFuerPerson
} from './personenliste.js';
import { baueDatensatzLink } from '../utils/datensatzAufruf.js';

const FARBE = '#2c4a6e';          // Tintenblau der Seite
const RAHMEN = '#9a9081';         // warmes Grau für den leeren Rahmen
const AUSWAHL = '#e0b429';        // Ring um den gewählten Punkt (wie der Fokusrahmen des Knopfs)
const DAUER = 1300;
const KOPF_SPALTEN = 64;          // Platz über den Spalten für Überschrift und Zahl
const FUEHRUNG_LINK = '#fuehrungen/frauen-im-archiv';
const TEXT_MIN_BREITE = 820;      // ab dieser Bühnenbreite steht die Erklärung zwischen den Spalten
const TEXT_BREITE = 400;          // höchstens so breit

// Erklärung nach dem Ordnen. [[id|Name]] wird ein Knopf, der die Person im Feld zeigt und ihre Sidebar öffnet.
const ERKLAERUNG = [
  'Das Bürgerbuch verzeichnet, wer zwischen 1535 und 1625 in Krems und Stein Bürger wurde und wer dafür bürgte. '
    + 'Ein Bürger schwor vor dem Rat den Bürgereid, wählte den Rat mit und konnte selbst darin sitzen.',
  'Das alles stand nur Männern offen. Das Bürgerrecht hing am Haushaltsvorstand, am Meister, Händler oder '
    + 'Hausbesitzer. Seine Frau war „Bürgerin“ durch die Ehe, nicht durch einen eigenen Eintrag. In den Amtsbüchern '
    + 'heißt sie meist „Ehefrau des …“ oder „Witwe nach …“.',
  'Unsichtbar heißt nicht abwesend. Starb ein Meister, durfte die Witwe die Werkstatt eine Zeit lang weiterführen, '
    + 'danach verlangten Zunft und Rat wieder einen Mann. Für zugewanderte Gesellen war die Heirat mit einer '
    + 'Bürgerwitwe der schnellste Weg zum Bürgerrecht: [[paul_zimerhaeckl|Paull Zimerhäckhl]] wurde 1577 Bürger, '
    + 'nachdem er die Witwe des Peter Winderstorffer geheiratet hatte.',
  'Erst im 18. Jahrhundert erwarben in Krems vereinzelt Frauen selbst das Bürgerrecht. Den Eid durften sie trotzdem '
    + 'nicht selbst sprechen, das tat ein Mann für sie.',
  'Auch Männer fehlen: Taglöhner, Weingartenarbeiter, Gesellen und Dienstboten, wohl die Hälfte der rund 4 000 '
    + 'Einwohner, hatten kein Bürgerrecht. Das Buch zeigt nicht, wer in der Stadt lebte, sondern wer in ihr '
    + 'mitbestimmen durfte.',
  `In anderen Quellen treten Frauen deutlich hervor, in Verlassenschaften etwa als Eisenhändlerin, Schlosserin oder `
    + `Bindermeisterin, in Testamenten als Stifterinnen. Die Führung <a href="${FUEHRUNG_LINK}">Frauen im Archiv</a> `
    + 'folgt ihren Spuren.'
];

let instanz = null; // { container, wurzel, personen, sortiert, svg, punkte, infoButton, beobachter }

const zahl = (n) => n.toLocaleString('de-AT');
const istFrau = (p) => /^w(eiblich)?$/i.test(alsText(p.geschlecht).trim());

// Eine Person je Kennung: Neubürger mit Jahr der Aufnahme, Bürgen mit ihrem Namen aus der Bürgenliste
function sammlePersonen(buergerbuch, personenliste) {
  const namen = new Map((personenliste || []).map((p) => {
    const sw = Array.isArray(p.schreibweisen) ? p.schreibweisen[0] : alsText(p.schreibweisen).split('|')[0];
    return [p.personen_id, sw];
  }));
  const personen = new Map();
  const jahrJeRecord = new Map(teileNachJahr(buergerbuch).mitJahr.map(({ record, jahr }) => [record, jahr]));
  buergerbuch.forEach((r) => {
    const id = alsText(r.personen_id);
    if (id && !personen.has(id)) {
      personen.set(id, { id, name: namen.get(id) || alsText(r.Name) || id, rolle: 'neubuerger', jahr: jahrJeRecord.get(r) ?? null, geschlecht: r.geschlecht });
    }
  });
  buergerbuch.forEach((r) => {
    const ids = Array.isArray(r.buergen_id) ? r.buergen_id : alsText(r.buergen_id).split('|');
    const bnamen = Array.isArray(r.Buergen) ? r.Buergen : alsText(r.Buergen).split('|');
    ids.map((x) => alsText(x).trim()).forEach((id, i) => {
      if (id && !personen.has(id)) personen.set(id, { id, name: namen.get(id) || alsText(bnamen[i]).trim() || id, rolle: 'buerge', jahr: null });
    });
  });
  return [...personen.values()];
}

function jahresSpanne(buergerbuch) {
  const jahre = teileNachJahr(buergerbuch).mitJahr.map((e) => e.jahr);
  return jahre.length ? [Math.min(...jahre), Math.max(...jahre)] : null;
}

// Gleichmäßige, leicht gemischte Reihenfolge für das Punktfeld (fester Startwert: jedes Mal dasselbe Bild)
function mische(liste) {
  let s = 7;
  const zufall = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(zufall() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.map((p) => ({ ...p, helligkeit: 0.55 + zufall() * 0.4, verzoegerung: zufall() }));
}

// Ausgangszustand (Wunsch des Autors, 2026-10-28; vorher eine Sonnenblumen-Spirale): die Punkte bilden schemenhaft
// das Steiner Tor, nachgezeichnet nach einer Umrisszeichnung des Autors (Koordinaten in deren Bildpunkten): unten
// der Torturm mit Torbogen, darüber der achteckige Aufsatz mit Glockenhelm, Laterne, Zwiebel, Kugel und Spitze;
// links und rechts die beiden Rundtürme mit hohen Kegeldächern und Dachgauben. Torbogen und Rundbogenfenster sind ausgespart.
const TOR = { x0: 40, y0: 35, breite: 955, hoehe: 1390 };
const TOR_FLAECHEN = [
  'M350,792 L450,750 L622,746 L712,778 V1400 H350 Z',                                         // Torturm
  'M398,762 V560 L384,522 C420,494 455,470 470,456 L440,452 L428,404 C450,370 460,330 535,305 '
    + 'C610,330 620,370 642,404 L630,452 L600,456 C620,470 655,492 690,508 L680,560 V762 Z',  // Aufsatz und Glockenhelm
  'M492,306 V220 H580 V306 Z',                                                               // Laterne
  'M500,216 C490,190 505,160 536,138 C567,160 582,190 572,216 Z',                            // Zwiebel
  'M528,140 H544 V105 H528 Z', 'M519,93 A16,16 0 1 0 551,93 A16,16 0 1 0 519,93 Z',          // Hals, Kugel
  'M531,79 H541 V40 H531 Z',                                                                 // Spitze
  'M45,1085 H352 V1405 H45 Z',                                                               // linker Rundturm
  'M50,1086 C120,1000 170,800 214,640 C250,800 300,1000 348,1083 Z', 'M206,665 L214,620 L222,665 Z',
  'M80,1070 V988 L75,988 L110,915 L142,988 L138,988 V1070 Z',                                // Gaube links außen
  'M708,1068 H990 V1410 H708 Z',                                                             // rechter Rundturm
  'M712,1066 C760,1000 790,800 815,585 C840,800 920,980 988,1056 Z', 'M807,610 L815,570 L823,610 Z'
];
const TOR_AUSSPARUNGEN = [
  'M436,1405 V1262 C470,1212 595,1212 625,1262 V1405 Z',                                     // Torbogen
  'M505,682 V600 A21.5,21.5 0 0 1 548,600 V682 Z'                                            // Rundbogenfenster
  // die kleinen Fenster der Vorlage entfallen: bei 2 655 Punkten wären sie nur Kerben im Umriss
];

// Punkte des Tors (2026-10-28, geglättet auf Wunsch des Autors): zuerst eine Punktreihe entlang des Umrisses (auch
// um Torbogen und Fenster), damit Dachschwünge und Bögen glatt verlaufen; dann füllt ein versetztes Gitter das Innere
// mit Abstand zur Randreihe. Der Abstand wird so gesucht, dass mindestens n Punkte entstehen; überzählige fallen im
// Inneren gleichmäßig verteilt weg, die Randreihe bleibt vollständig. Ergebnis je Punktzahl zwischengespeichert.
let torPunkteCache = null;
function torPunkte(n) {
  if (torPunkteCache?.n === n) return torPunkteCache.punkte;
  // Form einmal als Maske zeichnen (Flächen, dann Aussparungen herausgestanzt) - Abfragen sind dann nur noch
  // ein Blick in die Bilddaten statt Pfadtests
  const mb = TOR.x0 + TOR.breite + 2, mh = TOR.y0 + TOR.hoehe + 2;
  const leinwand = document.createElement('canvas');
  leinwand.width = mb;
  leinwand.height = mh;
  const ctx = leinwand.getContext('2d', { willReadFrequently: true });
  TOR_FLAECHEN.forEach((d) => ctx.fill(new Path2D(d)));
  ctx.globalCompositeOperation = 'destination-out';
  TOR_AUSSPARUNGEN.forEach((d) => ctx.fill(new Path2D(d)));
  const maske = ctx.getImageData(0, 0, mb, mh).data;
  const innen = (x, y) => {
    const xi = Math.round(x), yi = Math.round(y);
    return xi >= 0 && yi >= 0 && xi < mb && yi < mh && maske[(yi * mb + xi) * 4 + 3] > 127;
  };
  // Umrisse einmal abtasten (alle 5 Einheiten, Normale aus den Nachbarproben); getPointAtLength braucht ein Element im Dokument
  const svgNs = 'http://www.w3.org/2000/svg';
  const messSvg = document.createElementNS(svgNs, 'svg');
  messSvg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
  document.body.appendChild(messSvg);
  const pfade = [...TOR_FLAECHEN, ...TOR_AUSSPARUNGEN].map((d) => {
    const p = document.createElementNS(svgNs, 'path');
    p.setAttribute('d', d);
    messSvg.appendChild(p);
    const laenge = p.getTotalLength();
    const punkte = [];
    for (let l = 0; l <= laenge; l += 5) punkte.push({ l, ...(({ x, y }) => ({ x, y }))(p.getPointAtLength(l)) }); // getPointAtLength ist teuer
    return punkte.map((q, i) => {
      const a = punkte[Math.max(0, i - 1)], b = punkte[Math.min(punkte.length - 1, i + 1)];
      const tx = b.x - a.x, ty = b.y - a.y, tl = Math.hypot(tx, ty) || 1;
      return { ...q, nx: -ty / tl, ny: tx / tl };
    });
  });
  messSvg.remove();

  const versuch = (abstand) => {
    // Randreihe: Proben entlang jedes Pfads; behalten wird nur, was auf dem Rand der Gesamtform liegt, um
    // 0,35 Abstände nach innen gerückt
    const rand = [];
    const belegt = new Map();
    const zelleVon = (x, y) => `${Math.floor(x / abstand)}|${Math.floor(y / abstand)}`;
    const nahe = (x, y, grenze) => {
      const zx = Math.floor(x / abstand), zy = Math.floor(y / abstand);
      for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
        for (const [px, py] of belegt.get(`${zx + dx}|${zy + dy}`) || []) if ((px - x) ** 2 + (py - y) ** 2 < grenze * grenze) return true;
      }
      return false;
    };
    const setze = (liste, x, y) => {
      liste.push([x, y]);
      const k = zelleVon(x, y);
      if (!belegt.has(k)) belegt.set(k, []);
      belegt.get(k).push([x, y]);
    };
    const schritt = abstand / 4;
    pfade.forEach((proben) => {
      let letzte = null;
      let naechste = 0;
      for (const { l, x: qx, y: qy, nx, ny } of proben) {
        if (l < naechste) continue;
        naechste = l + schritt;
        const q = { x: qx, y: qy };
        const d = abstand * 0.35;
        const vorne = innen(q.x + nx * d, q.y + ny * d), hinten = innen(q.x - nx * d, q.y - ny * d);
        if (vorne === hinten) continue; // kein Rand der Gesamtform (z. B. Fuge zwischen Turm und Rundturm)
        const x = vorne ? q.x + nx * d : q.x - nx * d, y = vorne ? q.y + ny * d : q.y - ny * d;
        if (letzte && Math.hypot(x - letzte[0], y - letzte[1]) < abstand * 0.95) continue;
        if (nahe(x, y, abstand * 0.8)) continue;
        setze(rand, x, y);
        letzte = [x, y];
      }
    });
    // Inneres: versetztes Gitter mit Abstand zur Randreihe
    const inneres = [];
    const zeilenAbstand = abstand * 0.866;
    for (let k = 0, y = TOR.y0 + zeilenAbstand / 2; y < TOR.y0 + TOR.hoehe; k += 1, y += zeilenAbstand) {
      for (let x = TOR.x0 + (k % 2 ? abstand : abstand / 2); x < TOR.x0 + TOR.breite; x += abstand) {
        if (innen(x, y) && !nahe(x, y, abstand * 0.85)) inneres.push([x, y]);
      }
    }
    return { rand, inneres };
  };

  let klein = 2, gross = 100, bester = null;
  for (let i = 0; i < 14; i += 1) { // 14 Halbierungen genügen (Genauigkeit unter 0,01)
    const mitte = (klein + gross) / 2;
    const v = versuch(mitte);
    if (v.rand.length + v.inneres.length >= n) { klein = mitte; bester = v; } else gross = mitte;
  }
  bester = bester || versuch(klein);
  const ueber = bester.rand.length + bester.inneres.length - n;
  const inneres = ueber > 0
    ? Array.from({ length: bester.inneres.length - ueber }, (_, i) => bester.inneres[Math.floor((i * bester.inneres.length) / (bester.inneres.length - ueber))])
    : bester.inneres;
  // Reihenfolge von oben nach unten, damit Nachbarn im Feld auch in der Liste nah beieinander liegen
  const punkte = [...bester.rand, ...inneres].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  torPunkteCache = { n, punkte, abstand: klein };
  return punkte;
}

function torForm(n, b, h) {
  const punkte = torPunkte(n);
  const skala = Math.min((h - 12) / TOR.hoehe, (b * 0.9) / TOR.breite);
  const ox = (b - TOR.breite * skala) / 2 - TOR.x0 * skala;
  const oy = (h - TOR.hoehe * skala) / 2 - TOR.y0 * skala;
  return { zelle: torPunkteCache.abstand * skala, pos: (i) => { const [x, y] = punkte[i % punkte.length] || [512, 900]; return [ox + x * skala, oy + y * skala]; } };
}

// Raster für n Punkte in einem Rechteck: Zellgröße so, dass alle hineinpassen
function raster(n, x, y, b, h) {
  if (n === 0) return { zelle: 0, pos: () => [x, y] };
  let zelle = Math.sqrt((b * h) / n);
  let spalten = Math.max(1, Math.floor(b / zelle));
  while (spalten * Math.floor(h / zelle) < n) { zelle *= 0.97; spalten = Math.max(1, Math.floor(b / zelle)); }
  const zeilen = Math.ceil(n / spalten);
  const ox = x + (b - spalten * zelle) / 2 + zelle / 2;
  const oy = y + (h - zeilen * zelle) / 2 + zelle / 2;
  return { zelle, pos: (i) => [ox + (i % spalten) * zelle, oy + Math.floor(i / spalten) * zelle] };
}

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .bgi-wurzel { display: flex; flex-direction: column; height: 100%; min-height: 480px; }
    .bgi-werkzeugleiste { display: flex; justify-content: flex-end; margin-bottom: 4px; min-height: 32px; }
    .bgi-kopf { text-align: center; margin: 0 auto var(--space-3); }
    .bgi-ueberzeile { font-size: var(--fs-sm); letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted); }
    .bgi-zahl { font-family: var(--font-heading); font-size: clamp(2rem, 4.2vw, 3.2rem); line-height: 1.05; margin: var(--space-1) 0 0; color: var(--text); }
    .bgi-unterzeile { font-size: var(--fs-md); color: var(--text-muted); margin-top: 2px; }
    .bgi-knopf { margin-top: var(--space-4); font: inherit; font-size: var(--fs-md); font-weight: 600; padding: 10px 22px; min-height: 44px;
      border-radius: 999px; border: 1px solid ${FARBE}; background: ${FARBE}; color: #fff; cursor: pointer;
      box-shadow: 0 4px 14px rgba(44, 74, 110, .25); transition: transform .15s ease, box-shadow .15s ease, background .15s ease; }
    .bgi-knopf:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(44, 74, 110, .32); }
    .bgi-knopf:focus-visible { outline: 3px solid #e0b429; outline-offset: 3px; }
    .bgi-knopf[aria-pressed="true"] { background: var(--surface); color: ${FARBE}; }
    .bgi-buehne { position: relative; flex: 1 1 auto; min-height: 300px; }
    .bgi-buehne svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .bgi-punkt { cursor: pointer; stroke: transparent; stroke-width: 3px; } /* durchsichtiger Rand: größere Klickfläche */
    .bgi-spaltenkopf { font-family: var(--font-heading); font-size: 1.5rem; fill: var(--text); text-anchor: middle; }
    .bgi-spaltenzahl { font-size: var(--fs-md); fill: var(--text-muted); text-anchor: middle; letter-spacing: .04em; }
    .bgi-leer { font-size: var(--fs-md); font-style: italic; fill: ${RAHMEN}; text-anchor: middle; }
    .bgi-erklaerung { max-width: 62ch; margin: var(--space-3) auto 0; font-size: var(--fs-sm); line-height: 1.55; color: var(--text);
      opacity: 0; visibility: hidden; transform: translateY(6px);
      transition: opacity .4s ease, transform .4s ease, visibility 0s linear .4s; }
    .bgi-erklaerung.sichtbar { opacity: 1; visibility: visible; transform: none;
      transition: opacity .7s ease .7s, transform .7s ease .7s, visibility 0s; }
    .bgi-erklaerung:not(.mittig):not(.sichtbar) { display: none; }
    .bgi-erklaerung.mittig { position: absolute; margin: 0; max-width: none; }
    .bgi-erklaerung p { margin: 0 0 .7em; }
    .bgi-erklaerung p:last-child { margin-bottom: 0; }
    .bgi-erklaerung a, .bgi-textperson { color: var(--accent); font-weight: 600; }
    .bgi-textperson { font: inherit; font-weight: 600; padding: 0; border: none; background: none; cursor: pointer;
      text-decoration: underline; text-decoration-style: dotted; text-underline-offset: 3px; }
    .bgi-textperson:focus-visible { outline: 3px solid #e0b429; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { .bgi-erklaerung, .bgi-knopf { transition: none; } }
  `;
  container.appendChild(style);
}

function ohneAnimation() {
  return document.hidden || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// Zielpositionen für den aktuellen Zustand (Feld oder Spalten) und die Bühnengröße
function berechneLayout() {
  const { buehne, personen } = instanz;
  const b = buehne.clientWidth || 900;
  const h = buehne.clientHeight || 420;
  const maenner = personen.filter((p) => !istFrau(p));
  const frauen = personen.filter(istFrau);
  const feld = torForm(personen.length, b, h);
  const breit = b >= TEXT_MIN_BREITE;
  const luecke = b * 0.03;
  const textBreite = breit ? Math.min(TEXT_BREITE, b * 0.36) : 0;
  const spaltenBreite = breit ? Math.min((b - textBreite) / 2 - luecke * 2, 380) : Math.min(b * 0.36, 460);
  const links = breit
    ? { x: b / 2 - textBreite / 2 - luecke - spaltenBreite, b: spaltenBreite }
    : { x: b / 2 - spaltenBreite - b * 0.04, b: spaltenBreite };
  const rechts = breit ? { x: b / 2 + textBreite / 2 + luecke, b: spaltenBreite } : { x: b / 2 + b * 0.04, b: spaltenBreite };
  const text = breit ? { x: b / 2 - textBreite / 2, b: textBreite } : null;
  const spaltenHoehe = h - KOPF_SPALTEN - 8;
  // gemeinsame Zellgröße für beide Spalten (die größere Gruppe bestimmt sie)
  const groesser = Math.max(maenner.length, frauen.length, 1);
  const r = raster(groesser, 0, 0, spaltenBreite, spaltenHoehe);
  const spalte = (gruppe, s) => {
    const g = raster(gruppe.length, s.x, KOPF_SPALTEN, s.b, spaltenHoehe);
    const zelle = Math.min(g.zelle || r.zelle, r.zelle);
    const spaltenZahl = Math.max(1, Math.floor(s.b / zelle));
    const ox = s.x + (s.b - spaltenZahl * zelle) / 2 + zelle / 2;
    return (i) => [ox + (i % spaltenZahl) * zelle, KOPF_SPALTEN + zelle / 2 + Math.floor(i / spaltenZahl) * zelle];
  };
  const posLinks = spalte(maenner, links);
  const posRechts = spalte(frauen, rechts);
  const index = new Map();
  maenner.forEach((p, i) => index.set(p, posLinks(i)));
  frauen.forEach((p, i) => index.set(p, posRechts(i)));
  const radiusFeld = Math.max(1.1, feld.zelle * 0.4);
  const radiusSpalte = Math.max(1.2, Math.min(r.zelle * 0.36, radiusFeld * 1.4));
  return { b, h, feld, index, links, rechts, text, spaltenHoehe, radiusFeld, radiusSpalte, maenner, frauen };
}

function zeichne(animiert) {
  const { svg, punkte, sortiert } = instanz;
  const L = berechneLayout();
  instanz.layout = L;
  svg.attr('viewBox', `0 0 ${L.b} ${L.h}`);
  const ziel = (p, i) => (sortiert ? L.index.get(p) : L.feld.pos(i));
  const radius = sortiert ? L.radiusSpalte : L.radiusFeld;
  const setze = (sel) => sel
    .attr('cx', (p, i) => ziel(p, i)[0]).attr('cy', (p, i) => ziel(p, i)[1])
    .attr('r', radius)
    .attr('fill-opacity', (p) => (sortiert ? 0.85 : p.helligkeit));
  punkte.interrupt();
  if (animiert && !ohneAnimation()) {
    // Kaskade: Punkte setzen sich gestaffelt in Bewegung, nach Ziel-Zeile und etwas Zufall
    punkte.transition().duration(DAUER)
      .delay((p, i) => (sortiert ? (ziel(p, i)[1] / L.h) * 420 : p.verzoegerung * 260) + p.verzoegerung * 300)
      .ease(d3.easeCubicInOut).call(setze);
    setTimeout(() => { if (instanz) setze(punkte.interrupt()); }, DAUER + 900); // ruhende Tabs: Endzustand sicher
  } else {
    setze(punkte);
  }
  zeichneSpalten(animiert);
  platziereErklaerung();
}

// Überschriften, Zahlen und der leere Rahmen der Frauen-Spalte
function zeichneSpalten(animiert) {
  const { ebeneSpalten, sortiert, layout: L } = instanz;
  ebeneSpalten.selectAll('*').remove();
  if (!sortiert) return;
  const g = ebeneSpalten.append('g').attr('opacity', animiert && !ohneAnimation() ? 0 : 1);
  [[L.links, 'Männer', L.maenner.length], [L.rechts, 'Frauen', L.frauen.length]].forEach(([s, titel, anzahl]) => {
    const mitte = s.x + s.b / 2;
    g.append('text').attr('class', 'bgi-spaltenkopf').attr('x', mitte).attr('y', 26).text(titel);
    g.append('text').attr('class', 'bgi-spaltenzahl').attr('x', mitte).attr('y', 50).text(zahl(anzahl));
  });
  if (L.frauen.length === 0) {
    const rechts = L.rechts;
    g.append('rect')
      .attr('x', rechts.x).attr('y', KOPF_SPALTEN).attr('width', rechts.b).attr('height', L.spaltenHoehe)
      .attr('rx', 10).attr('fill', 'none').attr('stroke', RAHMEN).attr('stroke-width', 1.4).attr('stroke-dasharray', '6 6');
    g.append('text').attr('class', 'bgi-leer').attr('x', rechts.x + rechts.b / 2).attr('y', KOPF_SPALTEN + L.spaltenHoehe / 2).text('keine Einträge');
  }
  if (animiert && !ohneAnimation()) {
    g.transition().delay(DAUER * 0.55).duration(700).attr('opacity', 1);
    setTimeout(() => g.attr('opacity', 1), DAUER + 1200);
  }
}

// Quelleneinträge einer Person: Bürgerbuch direkt (als Neubürger oder Bürge), dazu die Nennungen aus der
// Personenliste (Urkunden, Inventare, weitere Bürgerbuch-Einträge)
function oeffnePerson(p) {
  const q = instanz.quellen;
  const record = q.personNachId.get(p.id);
  const buergerbuch = new Map(q.buergerbuchJePerson.get(p.id)?.map((r) => [r.id, r]) || []);
  if (record) ermittleBuergerbuchFuerPerson(record, q.buergerbuchNachId).forEach((r) => buergerbuch.set(r.id, r));
  instanz.auswahl = p.id;
  markiereAuswahl();
  zeigePersonenNennungen(instanz.sidebar, p.name,
    record ? ermittleUrkundenFuerPerson(record, q.urkundenNachSignatur) : [],
    [...buergerbuch.values()],
    record ? ermittleInventareFuerPerson(record, q.inventareNachId) : [],
    { personenLink: record ? baueDatensatzLink('person', p.id) : null });
}

// Erklärung zwischen den Spalten (breit) bzw. darunter (schmal); sichtbar nur im geordneten Zustand
function platziereErklaerung() {
  const { erklaerung, sortiert, buehne, layout: L } = instanz;
  if (L.text && erklaerung.parentNode !== buehne) buehne.appendChild(erklaerung);
  if (!L.text && erklaerung.previousSibling !== buehne) buehne.after(erklaerung);
  erklaerung.classList.toggle('mittig', Boolean(L.text));
  erklaerung.style.left = L.text ? `${L.text.x}px` : '';
  erklaerung.style.width = L.text ? `${L.text.b}px` : '';
  erklaerung.style.top = L.text ? '4px' : '';
  erklaerung.classList.toggle('sichtbar', sortiert);
  erklaerung.inert = !sortiert;
}

// Reicht die Bühne für den Text zwischen den Spalten nicht, wird sie im geordneten Zustand höher
function passeHoeheAn() {
  const { buehne, erklaerung, basisHoehe, sortiert } = instanz;
  let hoehe = basisHoehe;
  if (sortiert && buehne.clientWidth >= TEXT_MIN_BREITE) {
    erklaerung.classList.add('mittig');
    erklaerung.style.width = `${Math.min(TEXT_BREITE, buehne.clientWidth * 0.36)}px`;
    hoehe = Math.max(basisHoehe, erklaerung.offsetHeight + 12);
  }
  buehne.style.height = `${hoehe}px`;
}

function zeigePersonMitId(id) {
  const p = instanz.personen.find((x) => x.id === id);
  if (p) oeffnePerson(p);
}

function schliessePerson() {
  if (!instanz?.auswahl) return;
  instanz.auswahl = null;
  markiereAuswahl();
  schliesseSidebar(instanz.sidebar, instanz.knopf);
}

function markiereAuswahl() {
  const { punkte, auswahl } = instanz;
  punkte.style('stroke', (p) => (p.id === auswahl ? AUSWAHL : null)).style('stroke-width', (p) => (p.id === auswahl ? '2px' : null));
  punkte.filter((p) => p.id === auswahl).raise();
}

function schalte() {
  schliessePerson();
  instanz.sortiert = !instanz.sortiert;
  const k = instanz.knopf;
  k.setAttribute('aria-pressed', String(instanz.sortiert));
  k.textContent = instanz.sortiert ? 'Wieder mischen' : 'Nach Geschlecht ordnen';
  instanz.svg.attr('aria-label', instanz.sortiert
    ? `${zahl(instanz.layout.maenner.length)} Männer und ${zahl(instanz.layout.frauen.length)} Frauen im Bürgerbuch`
    : `${zahl(instanz.personen.length)} Personen im Bürgerbuch, als Steiner Tor`);
  passeHoeheAn();
  zeichne(true);
}

export function render(container, data, options = {}) {
  if (instanz) destroy();
  container.innerHTML = '';
  fuegeStyleEin(container);
  fuegeSidebarStyleEin(container);
  const buergerbuch = data?.buergerbuch || [];
  const personen = mische(sammlePersonen(buergerbuch, data?.personenliste));
  const spanne = jahresSpanne(buergerbuch);

  const wurzel = document.createElement('div');
  wurzel.className = 'bgi-wurzel';
  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'bgi-werkzeugleiste';
  const kopf = document.createElement('div');
  kopf.className = 'bgi-kopf';
  kopf.innerHTML = `<div class="bgi-ueberzeile">Bürgerbuch Krems${spanne ? ` · ${spanne[0]}–${spanne[1]}` : ''}</div>
    <p class="bgi-zahl">${zahl(personen.length)} Personen</p>
    <div class="bgi-unterzeile">Neubürger und ihre Bürgen, ein Punkt je Person</div>`;
  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = 'bgi-knopf';
  knopf.textContent = 'Nach Geschlecht ordnen';
  knopf.setAttribute('aria-pressed', 'false');
  kopf.appendChild(knopf);
  const buehne = document.createElement('div');
  buehne.className = 'bgi-buehne';
  const erklaerung = document.createElement('div');
  erklaerung.className = 'bgi-erklaerung';
  erklaerung.setAttribute('aria-live', 'polite');
  erklaerung.innerHTML = ERKLAERUNG.map((absatz) => `<p>${absatz.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g,
    '<button type="button" class="bgi-textperson" data-person="$1">$2</button>')}</p>`).join('');
  wurzel.append(werkzeugleiste, kopf, buehne, erklaerung);
  container.appendChild(wurzel);

  // Höhe: die Bühne füllt den sichtbaren Platz (abzüglich Kopf)
  const hoehe = options.height || ermittleVerfuegbareHoehe(buehne, { reserveUnten: 24, mindestHoehe: 320 });
  buehne.style.height = `${hoehe}px`;

  const svg = d3.select(buehne).append('svg').attr('role', 'img')
    .attr('aria-label', `${zahl(personen.length)} Personen im Bürgerbuch, als Steiner Tor`);
  const ebeneSpalten = svg.append('g');
  const punkte = svg.append('g').selectAll('circle').data(personen).join('circle')
    .attr('class', 'bgi-punkt').attr('fill', FARBE);
  punkte
    .on('mouseenter', function (event, p) {
      const zeile = p.rolle === 'neubuerger' ? `Neubürger${p.jahr ? ` ${p.jahr}` : ''}` : 'Bürge';
      zeigeTooltip(`${p.name}\n${zeile}`, this, container);
    })
    .on('mouseleave', () => versteckeTooltip())
    .on('click', (event, p) => { event.stopPropagation(); versteckeTooltip(); oeffnePerson(p); });

  // Nachschlagetabellen für die Sidebar (einmal je Darstellung)
  const buergerbuchJePerson = new Map();
  const merke = (id, r) => {
    if (!id) return;
    if (!buergerbuchJePerson.has(id)) buergerbuchJePerson.set(id, []);
    if (!buergerbuchJePerson.get(id).includes(r)) buergerbuchJePerson.get(id).push(r);
  };
  buergerbuch.forEach((r) => {
    merke(alsText(r.personen_id), r);
    (Array.isArray(r.buergen_id) ? r.buergen_id : alsText(r.buergen_id).split('|')).forEach((id) => merke(alsText(id).trim(), r));
  });
  const quellen = {
    personNachId: new Map((data?.personenliste || []).map((r) => [alsText(r.personen_id), r])),
    buergerbuchJePerson,
    buergerbuchNachId: new Map(buergerbuch.map((r) => [r.id, r])),
    urkundenNachSignatur: new Map((data?.urkunden || []).map((r) => [r.signatur, r])),
    inventareNachId: new Map((data?.verlassenschaften || []).map((r) => [r.id, r]))
  };

  const sidebar = baueSidebarGeruest(container);
  instanz = { container, wurzel, buehne, personen, sortiert: false, svg, punkte, ebeneSpalten, knopf, erklaerung, infoButton: null, layout: null, sidebar, quellen, auswahl: null, basisHoehe: hoehe };
  sidebar.schliessenBtn.addEventListener('click', schliessePerson);
  sidebar.zurueckBtn.addEventListener('click', () => zurueckZurKombiniertenListe(sidebar)); // Liste der Person wieder zeigen
  erklaerung.addEventListener('click', (event) => {
    const knopfPerson = event.target.closest('.bgi-textperson');
    if (knopfPerson) zeigePersonMitId(knopfPerson.dataset.person);
  });
  knopf.addEventListener('click', schalte);
  // Klick auf eine freie Stelle der Ansicht schließt die Sidebar (Punkte stoppen ihren Klick; Links bleiben Links)
  wurzel.addEventListener('click', (event) => { if (!event.target.closest('a, button')) schliessePerson(); });
  infotextFuerModul('buergerinnen').then((cfg) => {
    if (!instanz || !cfg || !werkzeugleiste.isConnected) return;
    instanz.infoButton = erzeugeInfoButton(werkzeugleiste, cfg);
  });
  zeichne(false);
  // nur Breitenänderungen neu zeichnen - die Höhe ändert passeHoeheAn() selbst (sonst bräche das den Übergang ab)
  let letzteBreite = buehne.clientWidth;
  instanz.beobachter = new ResizeObserver(() => {
    if (!instanz || buehne.clientWidth === letzteBreite) return;
    letzteBreite = buehne.clientWidth;
    passeHoeheAn();
    zeichne(false);
  });
  instanz.beobachter.observe(buehne);
}

export function resize() {
  if (instanz) zeichne(false);
}

export function destroy() {
  if (!instanz) return;
  instanz.beobachter?.disconnect();
  instanz.punkte?.interrupt();
  instanz.infoButton?.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
