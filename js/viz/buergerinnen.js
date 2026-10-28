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
// warum keine Frau darin steht; auf schmalen Bildschirmen steht sie unter den Spalten.
//
// Folien (Wunsch des Autors, 2026-10-28): immer nur ein sprechender Weiter-Knopf mit hüpfendem Pfeil nach unten und
// ein Zurück-Knopf. Folge: Steiner Tor → Nach Geschlecht ordnen → die leere Frauen-Spalte füllt sich mit ebenso vielen
// symbolischen Punkten wie Männer (Folie `frauen`, Punkte ohne Person, kein Klick) → Männer und Frauen vereinen sich
// zu Haushalten: aus den Männern werden drei Säulen der
// Bürgerschaft nach Schicht (links Kleinhändler und Hauer, rechts reiche Handelsleute), daneben links ein kurzer
// Text → Goldmünzen regnen in die schon reservierten Felder unter den Säulen (Gesamtvermögen je Schicht), Text kommt
// dazu → links neben dem Text steigt Punkt für Punkt die Säule der Inwohner und Hilfskräfte ohne Bürgerrecht auf
// (mindestens so viele, ohne Münzen). In den drei Vermögens-Folien steht ein Punkt für einen Anteil der
// Bürgerschaft, nicht für eine bestimmte Person (kein Klick, Tooltip nennt die Schicht). Knöpfe, Texte und Münzwert
// stehen in data/buergerinnen_stationen.csv, Anteile und Gulden-Spannen in data/buergerinnen_schichten.csv (siehe
// docs/SCHEMA.md 13.8); Vermögen einer Schicht = Haushalte × Mittelwert.
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
import { ladeCSV } from '../core/dataLoader.js';

const FARBE = '#2c4a6e';          // Tintenblau der Seite
const RAHMEN = '#9a9081';         // warmes Grau für leere Rahmen und die Säule ohne Bürgerrecht
const AUSWAHL = '#e0b429';        // Ring um den gewählten Punkt (wie der Fokusrahmen des Knopfs)
const FRAUEN_FARBE = '#7a5a8c';   // symbolische Frauen-Punkte (gedämpftes Violett, unterscheidbar vom Tintenblau)
// Haushalte (Vermögens-Folien): eigene Farbe, weil sich darin Männer (Tintenblau) und Frauen (Violett) vereinen;
// beim Verschmelzen gehen beide Punktfarben fließend in diese über (Wunsch des Autors, 2026-10-28)
const HAUSHALT_FARBE = '#1f8a83';
const GOLD = '#c9a227';           // Münzen (wie die Regierungszeit im Stammbaum)
const GOLD_RAND = '#8a6d1a';
const DAUER = 1300;
const LEINWAND_UEBERSTAND = 60;   // px: die Leinwand reicht unter die Bühne (Punkte, die von unten aufsteigen)
const STAFFELUNG = 250;           // ms: so weit setzen sich die Punkte zeitversetzt in Bewegung
const REGEN_START = 700;          // ms bis der Münzregen beginnt (die Seite scrollt vorher zu den Münzfeldern)
const REGEN_DAUER = 2600;         // ms, über die sich der Regen von der untersten bis zur obersten Reihe verteilt
const KOPF_SPALTEN = 64;          // Platz über den Spalten für Überschrift und Zahl
const TEXT_MIN_BREITE = 820;      // ab dieser Bühnenbreite steht die Erklärung neben bzw. zwischen den Säulen
const TEXT_BREITE = 400;          // höchstens so breit
const STATIONEN_DATEI = 'data/buergerinnen_stationen.csv';
const SCHICHTEN_DATEI = 'data/buergerinnen_schichten.csv';
const OHNE_BUERGERRECHT = 'ohne_buergerrecht'; // id der grauen Säule in buergerinnen_schichten.csv
const STANDARD_MUENZE = 1000;     // Gulden je Münze, falls die Stationsdatei keinen Wert nennt
const STANDARD_UNTERZEILE = 'Neubürger und ihre Bürgen, ein Punkt je Person';
const BEKANNTE_STATIONEN = ['tor', 'geschlecht', 'frauen', 'schichten', 'muenzen', 'vermoegenslos'];
const VERMOEGEN_STATIONEN = ['schichten', 'muenzen', 'vermoegenslos']; // gemeinsames Säulen-Layout
// Beiwerk je Folie (siehe zeichneTeile())
const TEILE = {
  geschlecht: ['geschlecht', 'leeresFeld'],
  frauen: ['geschlecht'],
  schichten: ['koepfe', 'muenzen', 'legende'], // Münzen schon angelegt, aber verborgen (der Regen startet ohne Aufbau)
  muenzen: ['koepfe', 'werte', 'muenzen', 'legende'],
  vermoegenslos: ['koepfe', 'werte', 'muenzen', 'grau', 'legende']
};
const PERSONEN_STATIONEN = ['tor', 'geschlecht', 'frauen']; // dort steht ein Punkt für eine Person (Klick öffnet die Sidebar)
// ohne Stationsdatei: Tor und Geschlecht ohne Text
const STANDARD_STATIONEN = [
  { id: 'tor', knopf: 'Steiner Tor', unterzeile: '', muenze: null, anhaengen: false, absaetze: [] },
  { id: 'geschlecht', knopf: 'Nach Geschlecht ordnen', unterzeile: '', muenze: null, anhaengen: false, absaetze: [] }
];

let instanz = null; // { container, wurzel, buehne, personen, station, stationen, schichten, zuordnung, svg, punkte, graue, layout, sidebar, … }

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
    /* bleibt beim Scrollen oben stehen (z. B. nach dem Sprung zu den Münzfeldern), ohne darunter Klicks abzufangen */
    .bgi-steuerung { position: sticky; top: 8px; z-index: 6; display: flex; align-items: center; justify-content: center;
      gap: var(--space-3); margin: 0 0 var(--space-3); min-height: 64px; pointer-events: none; }
    .bgi-steuerung > * { pointer-events: auto; }
    /* Weiter = nur der hüpfende Pfeil (2026-10-28, Wunsch des Autors); sein Name steht in aria-label und title */
    .bgi-weiter { display: grid; place-items: center; width: 52px; height: 52px; padding: 0; border-radius: 50%;
      border: none; background: ${FARBE}; color: #fff; cursor: pointer; box-shadow: 0 4px 14px rgba(44, 74, 110, .3);
      animation: bgi-huepfen 1.6s ease-in-out infinite; }
    .bgi-weiter:hover { animation-play-state: paused; box-shadow: 0 6px 18px rgba(44, 74, 110, .4); }
    .bgi-weiter svg { width: 24px; height: 24px; }
    .bgi-weiter[hidden], .bgi-zurueck[hidden] { display: none; }
    @keyframes bgi-huepfen { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
    .bgi-zurueck { font: inherit; font-size: var(--fs-sm); font-weight: 600; min-height: 44px; padding: 10px 16px; border-radius: 999px;
      border: 1px solid ${FARBE}; background: var(--surface); color: ${FARBE}; cursor: pointer; }
    .bgi-zurueck:hover { background: rgba(44, 74, 110, .08); }
    .bgi-weiter:focus-visible, .bgi-zurueck:focus-visible { outline: 3px solid #e0b429; outline-offset: 3px; }
    .bgi-buehne { position: relative; flex: 1 1 auto; min-height: 300px; }
    .bgi-buehne svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .bgi-leinwand { position: absolute; left: 0; top: 0; pointer-events: none; }
    .bgi-punkt { cursor: pointer; stroke: transparent; stroke-width: 3px; } /* durchsichtiger Rand: größere Klickfläche */
    .bgi-punkt.anteil { cursor: default; }
    .bgi-grau { fill: none; stroke: ${RAHMEN}; stroke-width: 1px; }
    .bgi-spaltenkopf { font-family: var(--font-heading); font-size: 1.5rem; fill: var(--text); text-anchor: middle; }
    .bgi-spaltenkopf.klein { font-size: 1.1rem; }
    .bgi-spaltenkopf.eng { font-size: 13px; }
    .bgi-spaltenzahl { font-size: var(--fs-md); fill: var(--text-muted); text-anchor: middle; letter-spacing: .04em; }
    .bgi-spaltenzahl.eng { font-size: 11px; letter-spacing: 0; }
    .bgi-leer { font-size: var(--fs-md); font-style: italic; fill: ${RAHMEN}; text-anchor: middle; }
    .bgi-wert { font-size: 13px; font-weight: 600; fill: var(--text); text-anchor: middle; }
    .bgi-wert-klein { font-size: 12px; fill: var(--text-muted); text-anchor: middle; }
    .bgi-legende text { font-size: 12px; fill: var(--text-muted); }
    .bgi-erklaerung { max-width: 62ch; margin: var(--space-3) auto 0; font-size: var(--fs-sm); line-height: 1.55; color: var(--text);
      opacity: 0; visibility: hidden; transform: translateY(6px);
      transition: opacity .4s ease, transform .4s ease, visibility 0s linear .4s; }
    .bgi-erklaerung.sichtbar { opacity: 1; visibility: visible; transform: none;
      transition: opacity .7s ease .7s, transform .7s ease .7s, visibility 0s; }
    .bgi-erklaerung:not(.mittig):not(.sichtbar) { display: none; }
    .bgi-erklaerung.mittig { position: absolute; margin: 0; max-width: none; }
    .bgi-erklaerung p { margin: 0 0 .7em; }
    .bgi-erklaerung p:last-child { margin-bottom: 0; }
    .bgi-erklaerung p.neu { animation: bgi-einblenden .8s ease 1.2s both; }
    @keyframes bgi-einblenden { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    .bgi-erklaerung a, .bgi-textperson { color: var(--accent); font-weight: 600; }
    .bgi-textperson { font: inherit; font-weight: 600; padding: 0; border: none; background: none; cursor: pointer;
      text-decoration: underline; text-decoration-style: dotted; text-underline-offset: 3px; }
    .bgi-textperson:focus-visible { outline: 3px solid #e0b429; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) {
      .bgi-erklaerung { transition: none; }
      .bgi-weiter, .bgi-erklaerung p.neu { animation: none; }
    }
  `;
  container.appendChild(style);
}

function ohneAnimation() {
  return document.hidden || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// --- Texte und Zahlen aus den beiden CSV-Dateien ---------------------------------------------------------

const zahlWert = (wert) => {
  const n = Number(alsText(wert).replace(/\s/g, '').replace(',', '.'));
  return alsText(wert).trim() !== '' && Number.isFinite(n) ? n : null;
};
const prozent = (wert) => (wert < 10
  ? wert.toLocaleString('de-AT', { maximumFractionDigits: 1 })
  : Math.round(wert).toLocaleString('de-AT'));

// Stationen in der Reihenfolge der Datei (die Folien); `tor` ist immer die erste
function bereiteStationenAuf(records) {
  const liste = (records || []).map((r) => ({
    id: alsText(r.station).trim(),
    knopf: alsText(r.knopf).trim(),
    unterzeile: alsText(r.unterzeile).trim(),
    muenze: zahlWert(r.muenze_gulden),
    anhaengen: alsText(r.text_anhaengen).trim() === 'ja',
    absaetze: (Array.isArray(r.text) ? r.text : [alsText(r.text)]).map((t) => String(t).trim()).filter(Boolean)
  })).filter((s) => BEKANNTE_STATIONEN.includes(s.id) && (s.id === 'tor' || s.knopf));
  const ohneTor = liste.filter((s) => s.id !== 'tor');
  const tor = liste.find((s) => s.id === 'tor') || STANDARD_STATIONEN[0];
  return ohneTor.length ? [tor, ...ohneTor] : STANDARD_STATIONEN;
}

// Schichten von links nach rechts in der Reihenfolge der Datei; Haushalte je Schicht nach Anteil (die letzte
// bekommt den Rest), Vermögen = Haushalte × Mittelwert aus gulden_von und gulden_bis
function bereiteSchichtenAuf(records, n) {
  const zeilen = (records || []).map((r) => ({
    id: alsText(r.id).trim(),
    name: alsText(r.name).trim(),
    anteil: zahlWert(r.anteil_prozent),
    von: zahlWert(r.gulden_von) ?? 0,
    bis: zahlWert(r.gulden_bis) ?? 0,
    beschreibung: alsText(r.beschreibung).trim()
  })).filter((z) => z.id && z.name);
  const buerger = zeilen.filter((z) => z.id !== OHNE_BUERGERRECHT && z.anteil > 0);
  if (!buerger.length) return null;
  const summeAnteile = buerger.reduce((s, z) => s + z.anteil, 0);
  let vergeben = 0;
  buerger.forEach((s, i) => {
    s.anzahl = i === buerger.length - 1 ? n - vergeben : Math.round((n * s.anteil) / summeAnteile);
    vergeben += s.anzahl;
    s.mittel = (s.von + s.bis) / 2;
    s.summe = s.anzahl * s.mittel;
  });
  const gesamt = buerger.reduce((s, z) => s + z.summe, 0);
  buerger.forEach((s) => { s.vermoegensanteil = gesamt ? (s.summe / gesamt) * 100 : 0; });
  const ohne = zeilen.find((z) => z.id === OHNE_BUERGERRECHT) || null;
  return { buerger, ohne, gesamt };
}

const escapeHtml = (t) => String(t).replace(/[&<>"]/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[z]));

// Platzhalter in den Stationstexten: {anteil:id} (Prozent des Vermögens), {summe:id}, {mittel:id}, {anzahl:id}, {muenze}
function platzhalterWert(name, id) {
  if (name === 'muenze') return zahl(instanz.muenzeGulden);
  const s = instanz.schichten?.buerger.find((x) => x.id === id);
  if (!s) return null;
  return { anteil: prozent(s.vermoegensanteil), summe: zahl(Math.round(s.summe)), mittel: zahl(s.mittel), anzahl: zahl(s.anzahl) }[name] ?? null;
}

// Absatz → HTML: [[id=Name]] wird ein Knopf zur Person, [Text](#ziel) ein Link innerhalb der Seite
function absatzHtml(absatz, klasse = '') {
  let html = escapeHtml(absatz).replace(/\{(\w+)(?::([\w-]+))?\}/g, (treffer, name, id) => platzhalterWert(name, id) ?? treffer);
  html = html.replace(/\[\[([^=\]]+)=([^\]]+)\]\]/g, '<button type="button" class="bgi-textperson" data-person="$1">$2</button>');
  html = html.replace(/\[([^\]]+)\]\((#[^)\s]*)\)/g, '<a href="$2">$1</a>');
  return `<p${klasse ? ` class="${klasse}"` : ''}>${html}</p>`;
}

// Texte einer Station: mit `text_anhaengen` = ja kommen sie zu denen der vorigen Station dazu
function absaetzeVon(index) {
  const s = instanz.stationen[index];
  if (!s) return [];
  return s.anhaengen && index > 0 ? [...absaetzeVon(index - 1), ...s.absaetze] : s.absaetze;
}

function umbrechen(text, maxZeichen) {
  const zeilen = [];
  text.split(/\s+/).filter(Boolean).forEach((wort) => {
    const letzte = zeilen[zeilen.length - 1];
    if (letzte && (letzte + ' ' + wort).length <= maxZeichen) zeilen[zeilen.length - 1] = `${letzte} ${wort}`;
    else zeilen.push(wort);
  });
  return zeilen;
}

// --- Layouts je Station -------------------------------------------------------------------------------

function berechneLayout(station = instanz.station) {
  const { buehne, personen } = instanz;
  const b = buehne.clientWidth || 900;
  const h = buehne.clientHeight || 420;
  const feld = torForm(personen.length, b, h);
  const radiusFeld = Math.max(1.1, feld.zelle * 0.4);
  const basis = { b, h, feld, radiusFeld, station, benoetigt: 0, text: null, art: station };
  if (station === 'geschlecht' || station === 'frauen') return { ...basis, ...layoutGeschlecht(b, h, radiusFeld), art: 'geschlecht' };
  if (VERMOEGEN_STATIONEN.includes(station) && instanz.schichten) return { ...basis, ...layoutVermoegen(b), art: 'vermoegen' };
  return { ...basis, ziel: (p, i) => feld.pos(i), radius: radiusFeld };
}

// Männer links, Frauen rechts; ab TEXT_MIN_BREITE steht die Erklärung dazwischen
function layoutGeschlecht(b, h, radiusFeld) {
  const { personen } = instanz;
  const maenner = personen.filter((p) => !istFrau(p));
  const frauen = personen.filter(istFrau);
  const breit = b >= TEXT_MIN_BREITE;
  const luecke = b * 0.03;
  const textBreite = breit ? Math.min(TEXT_BREITE, b * 0.36) : 0;
  const spaltenBreite = breit ? Math.min((b - textBreite) / 2 - luecke * 2, 380) : Math.min(b * 0.36, 460);
  const links = breit
    ? { x: b / 2 - textBreite / 2 - luecke - spaltenBreite, b: spaltenBreite }
    : { x: b / 2 - spaltenBreite - b * 0.04, b: spaltenBreite };
  const rechts = breit ? { x: b / 2 + textBreite / 2 + luecke, b: spaltenBreite } : { x: b / 2 + b * 0.04, b: spaltenBreite };
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
  const posSymbolisch = spalte({ length: maenner.length }, rechts); // Folie `frauen`: so viele Punkte wie Männer
  const index = new Map();
  maenner.forEach((p, i) => index.set(p, posLinks(i)));
  frauen.forEach((p, i) => index.set(p, posRechts(i)));
  return {
    ziel: (p) => index.get(p),
    radius: Math.max(1.2, Math.min(r.zelle * 0.36, radiusFeld * 1.4)),
    text: breit ? { x: b / 2 - textBreite / 2, b: textBreite, top: 4 } : null,
    frauZiel: posSymbolisch,
    links, rechts, spaltenHoehe, maenner, frauen
  };
}

// Ein gemeinsames Layout für die drei Vermögens-Folien, damit nichts springt: links der Platz der grauen Säule
// (Inwohner und Hilfskräfte, erscheint erst auf der letzten Folie), daneben der Text, rechts die drei Säulen der
// Bürgerschaft (untere Schicht links, obere rechts). Alle Säulen mit derselben Punktgröße, die Münzfelder unter
// der Grundlinie sind von Anfang an reserviert. Schmal: vier Säulen nebeneinander, Text unter der Bühne.
function layoutVermoegen(b) {
  const S = instanz.schichten;
  const breit = b >= TEXT_MIN_BREITE;
  const luecke = Math.max(14, b * 0.025);
  const textBreite = breit ? Math.min(TEXT_BREITE * 0.85, b * 0.24) : 0;
  const grau = { ...(S.ohne || { id: OHNE_BUERGERRECHT, name: '', beschreibung: '' }), anzahl: instanz.personen.length, grau: true };
  const spalten = [grau, ...S.buerger.map((s) => ({ ...s }))];
  const zwischenraeume = spalten.length - 1 + (breit ? 1 : 0);
  const sb = (b - textBreite - luecke * zwischenraeume) / spalten.length;
  const eng = sb < 120;
  const kopfRaum = 96;
  const punktHoehe = Math.min(320, Math.max(150, instanz.basisHoehe * 0.42));
  const maxAnzahl = Math.max(...spalten.map((s) => s.anzahl), 1);
  let z = Math.sqrt((sb * punktHoehe) / maxAnzahl);
  while (Math.floor(sb / z) * Math.floor(punktHoehe / z) < maxAnzahl) z *= 0.97;
  const proZeile = Math.max(1, Math.floor(sb / z));
  const hoeheVon = (anzahl) => Math.ceil(anzahl / proZeile) * z;
  const grundlinie = kopfRaum + Math.max(...spalten.map((s) => hoeheVon(s.anzahl)));
  const muenzStart = grundlinie + 84;
  const mz = Math.max(5, Math.min(9, z * 1.5));
  const mProZeile = Math.max(1, Math.floor(sb / mz));
  let unten = muenzStart;
  spalten.forEach((s, k) => {
    s.x = k === 0 ? 0 : sb + luecke + (breit ? textBreite + luecke : 0) + (k - 1) * (sb + luecke);
    s.b = sb;
    s.eng = eng;
    const ox = s.x + (sb - proZeile * z) / 2 + z / 2;
    s.punkt = (rang) => [ox + (rang % proZeile) * z, grundlinie - z / 2 - Math.floor(rang / proZeile) * z];
    s.oben = grundlinie - hoeheVon(s.anzahl);
    s.muenzen = s.grau ? 0 : s.summe / instanz.muenzeGulden;
    s.mProZeile = mProZeile;
    s.muenzReihen = Math.ceil(s.muenzen / mProZeile);
    const mox = s.x + (sb - mProZeile * mz) / 2 + mz / 2;
    s.muenzPos = (j) => [mox + (j % mProZeile) * mz, muenzStart + mz / 2 + Math.floor(j / mProZeile) * mz];
    s.kopfZeilen = umbrechen(s.name, Math.max(8, Math.floor(sb / (eng ? 7.5 : 10.5))));
    s.beschreibungZeilen = s.grau ? umbrechen(s.beschreibung, Math.max(12, Math.floor(sb / 6.4))) : [];
    const ende = s.grau ? muenzStart + 64 + s.beschreibungZeilen.length * 15 : muenzStart + s.muenzReihen * mz;
    unten = Math.max(unten, ende);
  });
  const legendeY = unten + 28;
  const buergerSpalten = spalten.slice(1);
  return {
    ziel: (p) => { const zu = instanz.zuordnung[p.nr]; return buergerSpalten[zu.k].punkt(zu.rang); },
    grauZiel: (j) => spalten[0].punkt(j),
    radius: Math.max(1.1, z * 0.36),
    text: breit ? { x: sb + luecke, b: textBreite, top: 4 } : null,
    spalten, x0: breit ? sb + luecke : 0, grundlinie, muenzStart, muenzRadius: mz * 0.42, legendeY,
    benoetigt: legendeY + 3 * 18 + 12
  };
}

// --- Zeichnen -----------------------------------------------------------------------------------------

function zeichne(animiert) {
  const { svg, punkte } = instanz;
  const L = berechneLayout();
  instanz.vorigesLayout = instanz.layout;
  instanz.layout = L;
  instanz.letzteBreite = L.b; // eigene Neuzeichnung: die Breitenüberwachung soll sie nicht noch einmal auslösen
  svg.attr('viewBox', `0 0 ${L.b} ${L.h}`);
  const mitAnimation = animiert && !ohneAnimation();
  const imFeld = L.station === 'tor';
  punkte.classed('anteil', !PERSONEN_STATIONEN.includes(L.station));
  // Größe und Deckkraft springen gleich auf den Zielwert (der Unterschied ist klein), nur die Lage wird animiert
  punkte.attr('r', L.radius).attr('fill-opacity', (p) => (imFeld ? p.helligkeit : 0.85));
  bewegePunkte(punkte.data().map((p, i) => L.ziel(p, i)), mitAnimation, L.art === 'vermoegen' ? HAUSHALT_FARBE : FARBE);
  if (mitAnimation) instanz.animationBis = Date.now() + DAUER + STAFFELUNG + 400;
  zeichneFrauen(L, mitAnimation);
  zeichneGraue(L, mitAnimation);
  zeichneTeile(L, mitAnimation);
  platziereErklaerung();
  markiereAuswahl();
}

// Bewegungen auf einer Leinwand (2026-10-28, „ruckelt“ beim Verschmelzen von Männern und Frauen): Bewegen sich
// Tausende SVG-Kreise gleichzeitig, kostet das Neuzeichnen 30–60 ms je Bild. Während einer Bewegung wird die
// SVG-Gruppe deshalb verborgen und die Punkte werden auf einem Canvas über der Grafik gezeichnet; am Ende stehen die
// SVG-Kreise an ihrem Ziel und werden wieder gezeigt. Mehrere Bewegungen (Personen, Frauen) teilen sich eine
// Schleife. Eine neue Bewegung gleichen Namens übernimmt die aktuelle Lage der laufenden.
const VOLLKREIS = Math.PI * 2;

function starteBewegung(name, b) {
  const { bewegungen, buehne, leinwand } = instanz;
  bewegungen.delete(name);
  const dpr = window.devicePixelRatio || 1;
  const breite = buehne.clientWidth, hoehe = buehne.clientHeight + LEINWAND_UEBERSTAND;
  if (leinwand.width !== Math.round(breite * dpr) || leinwand.height !== Math.round(hoehe * dpr)) {
    leinwand.width = Math.round(breite * dpr);
    leinwand.height = Math.round(hoehe * dpr);
    leinwand.style.width = `${breite}px`;
    leinwand.style.height = `${hoehe}px`;
  }
  b.beginn = null; // startet mit dem ersten gezeichneten Bild (der Klick selbst kostet ein langes Bild)
  // Farbverlauf in 21 Stufen vorab (statt je Punkt und Bild eine Farbe zu berechnen)
  const mische = d3.interpolateRgb(b.farbeVon, b.farbeNach);
  b.farben = d3.range(21).map((k) => mische(k / 20));
  b.e = new Float32Array(b.knoten.length);
  b.gesamt = Math.max(...b.verzoegerung) + b.dauer;
  b.gruppe.style.visibility = 'hidden';
  bewegungen.set(name, b);
  setTimeout(() => { if (instanz?.bewegungen.get(name) === b) beendeBewegung(name); }, b.gesamt + 600); // ruhende Tabs
  if (!instanz.leinwandSchleife) instanz.leinwandSchleife = d3.timer(zeichneLeinwand);
}

// Ziel in die SVG-Kreise schreiben und die Gruppe wieder zeigen
function beendeBewegung(name, { schreiben = true } = {}) {
  const b = instanz.bewegungen.get(name);
  if (!b) return;
  instanz.bewegungen.delete(name);
  if (schreiben) {
    b.knoten.forEach((k, i) => {
      k.setAttribute('cx', b.ziel[i][0].toFixed(1));
      k.setAttribute('cy', b.ziel[i][1].toFixed(1));
      if (b.deckkraft) k.setAttribute('opacity', b.deckkraft(1).toFixed(2));
    });
  }
  if (schreiben) b.knoten.forEach((k) => k.setAttribute('fill', b.farbeNach));
  b.gruppe.style.visibility = '';
}

// Aktuelle Lage (und Deckkraft) einer Punktgruppe - aus der laufenden Bewegung oder aus den SVG-Kreisen
function lageVon(name, knoten) {
  const b = instanz.bewegungen.get(name);
  return knoten.map((k, i) => {
    if (!b) return [Number(k.getAttribute('cx')) || 0, Number(k.getAttribute('cy')) || 0, Number(k.getAttribute('opacity') ?? 1)];
    const e = b.e[i];
    return [b.start[i][0] + (b.ziel[i][0] - b.start[i][0]) * e, b.start[i][1] + (b.ziel[i][1] - b.start[i][1]) * e, b.deckkraft ? b.deckkraft(e) : 1];
  });
}

function zeichneLeinwand() {
  const { bewegungen, leinwand } = instanz;
  const ctx = leinwand.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, leinwand.width, leinwand.height);
  const jetzt = performance.now();
  [...bewegungen.entries()].sort((a, b) => a[1].ebene - b[1].ebene).forEach(([name, b]) => {
    if (b.beginn === null) b.beginn = jetzt;
    const vergangen = jetzt - b.beginn;
    let farbStufe = -1;
    let alleFertig = true;
    for (let i = 0; i < b.knoten.length; i += 1) {
      const t = Math.min(1, Math.max(0, (vergangen - b.verzoegerung[i]) / b.dauer));
      if (t < 1) alleFertig = false;
      const e = t <= 0 ? 0 : (t >= 1 ? 1 : b.ease(t));
      b.e[i] = e;
      const a = (b.deckkraft ? b.deckkraft(e) : 1) * b.fuell[i];
      if (a <= 0.004) continue;
      const stufe = Math.round(e * 20);
      if (stufe !== farbStufe) { ctx.fillStyle = b.farben[stufe]; farbStufe = stufe; }
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(b.start[i][0] + (b.ziel[i][0] - b.start[i][0]) * e, b.start[i][1] + (b.ziel[i][1] - b.start[i][1]) * e, b.radius, 0, VOLLKREIS);
      ctx.fill();
    }
    if (alleFertig) beendeBewegung(name);
  });
  ctx.globalAlpha = 1;
  if (!bewegungen.size) {
    instanz.leinwandSchleife.stop();
    instanz.leinwandSchleife = null;
    // ohne Bewegung keine Fläche: sonst behielte die Leinwand eine alte (breitere) Größe und erzeugte Scrollbalken
    leinwand.width = 0;
    leinwand.height = 0;
    leinwand.style.width = '0px';
    leinwand.style.height = '0px';
  }
}

// Morphen der Personenpunkte (Lage; Größe und Deckkraft springen vorher auf den Zielwert). Jeder Punkt startet mit
// höchstens STAFFELUNG ms Verzögerung; Punkte, die schon am Ziel stehen, bleiben unberührt.
function bewegePunkte(ziele, mitAnimation, zielFarbe) {
  const knoten = instanz.punkte.nodes();
  const farbeVon = knoten[0].getAttribute('fill') || FARBE;
  if (!mitAnimation) {
    beendeBewegung('personen', { schreiben: false });
    knoten.forEach((k, i) => { k.setAttribute('cx', ziele[i][0].toFixed(1)); k.setAttribute('cy', ziele[i][1].toFixed(1)); k.setAttribute('fill', zielFarbe); });
    return;
  }
  const start = lageVon('personen', knoten).map(([x, y]) => [x, y]);
  if (start.every(([x, y], i) => Math.abs(x - ziele[i][0]) < 0.05 && Math.abs(y - ziele[i][1]) < 0.05)) {
    beendeBewegung('personen', { schreiben: false });
    if (farbeVon !== zielFarbe) knoten.forEach((k) => k.setAttribute('fill', zielFarbe));
    return;
  }
  starteBewegung('personen', {
    gruppe: knoten[0].parentNode, knoten, start, ziel: ziele, ebene: 2, farbeVon, farbeNach: zielFarbe,
    fuell: knoten.map((k) => Number(k.getAttribute('fill-opacity')) || 0.85),
    radius: Number(knoten[0].getAttribute('r')) || 2,
    verzoegerung: instanz.punkte.data().map((p) => p.verzoegerung * STAFFELUNG),
    dauer: DAUER, ease: d3.easeCubicInOut
  });
}

// Bewegung der symbolischen Frauen-Punkte (Lage und Deckkraft über `deckkraft(e)`)
function animiere(knoten, start, ziel, { verzoegerung, dauer, deckkraft, ease = d3.easeCubicInOut, farbeNach = FRAUEN_FARBE }) {
  starteBewegung('frauen', {
    gruppe: knoten[0].parentNode, knoten, start, ziel, ebene: 1, farbeVon: knoten[0].getAttribute('fill') || FRAUEN_FARBE, farbeNach,
    fuell: knoten.map(() => 0.85), radius: Number(knoten[0].getAttribute('r')) || 2,
    verzoegerung, dauer, deckkraft, ease
  });
}

// Symbolische Frauen-Punkte (Folie `frauen`, Wunsch des Autors 2026-10-28): neben jedem Bürger eine Frau, ohne
// bestimmte Person. Von `geschlecht` her steigen sie Reihe für Reihe von unten in die leere Spalte; weiter zu den
// Schichten fliegt jede Frau zum Punkt ihres Haushalts (des Mannes mit demselben Index) und verschmilzt mit ihm;
// zurück lösen sie sich wieder aus den Haushalten bzw. sinken hinab.
function zeichneFrauen(L, mitAnimation) {
  const { frauenPunkte: sel, personen } = instanz;
  if (!sel) return;
  const knoten = sel.nodes();
  const sichtbar = L.station === 'frauen';
  const warSichtbar = instanz.frauenSichtbar;
  instanz.frauenSichtbar = sichtbar;
  sel.attr('r', L.radius).style('pointer-events', sichtbar ? null : 'none');
  const unten = Math.max(L.h, L.benoetigt || 0) + 30;
  const spalte = sichtbar ? knoten.map((k, j) => L.frauZiel(j)) : null;
  const aktuell = lageVon('frauen', knoten).map(([x, y]) => [x, y]);
  if (!mitAnimation || sichtbar === warSichtbar) {
    beendeBewegung('frauen', { schreiben: false });
    if (sichtbar) knoten.forEach((k, j) => { k.setAttribute('cx', spalte[j][0]); k.setAttribute('cy', spalte[j][1]); k.setAttribute('opacity', 1); k.setAttribute('fill', FRAUEN_FARBE); });
    else knoten.forEach((k) => k.setAttribute('opacity', 0));
    return;
  }
  const V = instanz.vorigesLayout;
  const versatz = (j) => personen[j].verzoegerung * STAFFELUNG;
  if (sichtbar && V?.art === 'vermoegen') {
    // aus den Haushalten lösen
    const start = knoten.map((k, j) => V.ziel(personen[j], j));
    animiere(knoten, start, spalte,
      { verzoegerung: knoten.map((k, j) => versatz(j)), dauer: DAUER, deckkraft: (e) => Math.min(1, e * 2.5) });
  } else if (sichtbar) {
    // Reihe für Reihe von unten in die Spalte steigen
    const ys = spalte.map(([, y]) => y);
    const oben = Math.min(...ys), tief = Math.max(...ys);
    const start = spalte.map(([x]) => [x, unten]);
    animiere(knoten, start, spalte, {
      verzoegerung: spalte.map(([, y], j) => ((tief - y) / Math.max(1, tief - oben)) * 1500 + ((j * 7919) % 97) * 3),
      dauer: 750, deckkraft: (e) => Math.min(1, e * 3), ease: d3.easeCubicOut
    });
  } else if (L.art === 'vermoegen') {
    // mit dem Mann zum Haushalt verschmelzen: gleiches Ziel, gegen Ende ausblenden
    const ziel = knoten.map((k, j) => L.ziel(personen[j], j));
    animiere(knoten, aktuell, ziel, {
      verzoegerung: knoten.map((k, j) => versatz(j)), dauer: DAUER, deckkraft: (e) => 1 - Math.max(0, (e - 0.6) / 0.4),
      farbeNach: HAUSHALT_FARBE
    });
  } else {
    // hinabsinken
    animiere(knoten, aktuell, aktuell.map(([x]) => [x, unten]), {
      verzoegerung: knoten.map((k, j) => ((j * 7919) % 97) * 4), dauer: 600, deckkraft: (e) => 1 - e, ease: d3.easeCubicIn
    });
  }
}

// Graue Punkte (Inwohner und Hilfskräfte): steigen punktweise von unten in ihre Säule bzw. sinken wieder hinab
function zeichneGraue(L, mitAnimation) {
  const { graue } = instanz;
  if (!graue) return;
  const sichtbar = L.station === 'vermoegenslos' && Boolean(L.grauZiel);
  const warSichtbar = instanz.graueSichtbar;
  instanz.graueSichtbar = sichtbar;
  const unten = Math.max(L.h, L.benoetigt || 0) + 30;
  const ziel = (j) => (L.grauZiel ? L.grauZiel(j) : [-40, unten]);
  graue.interrupt('grau').style('pointer-events', sichtbar ? null : 'none').attr('r', L.radius);
  if (!mitAnimation || sichtbar === warSichtbar) {
    graue.attr('cx', (j) => ziel(j)[0]).attr('cy', (j) => (sichtbar ? ziel(j)[1] : unten)).attr('opacity', sichtbar ? 1 : 0);
    return;
  }
  const n = graue.size();
  if (sichtbar) {
    // unterste Reihen zuerst, dazu etwas Zufall: die Säule wächst Punkt für Punkt von unten
    graue.attr('cx', (j) => ziel(j)[0]).attr('cy', unten).attr('opacity', 0)
      .transition('grau').delay((j) => (j / n) * 1800 + ((j * 7919) % 97) * 3).duration(700).ease(d3.easeCubicOut)
      .attr('cy', (j) => ziel(j)[1]).attr('opacity', 1);
    setTimeout(() => { if (instanz?.layout === L) graue.interrupt('grau').attr('cy', (j) => ziel(j)[1]).attr('opacity', 1); }, 2900);
  } else {
    graue.transition('grau').delay((j) => ((n - j) / n) * 500).duration(500).ease(d3.easeCubicIn)
      .attr('cy', unten).attr('opacity', 0);
    setTimeout(() => { if (instanz?.layout === L) graue.interrupt('grau').attr('cy', unten).attr('opacity', 0); }, 1200);
  }
}

// Beiwerk in Teilen, je Station eine Auswahl (TEILE). Ein Teil, der neu dazukommt, wird eingeblendet (Münzen regnen),
// einer, der wegfällt, ausgeblendet; was bleibt, bleibt unverändert stehen.
function zeichneTeile(L, mitAnimation) {
  const { ebeneSpalten, ebeneMuenzen } = instanz;
  const schluessel = `${L.art}|${Math.round(L.b)}`;
  const jetzt = new Set(TEILE[L.station] || []);
  const bestehend = new Map();
  [ebeneSpalten, ebeneMuenzen].forEach((ebene) => ebene.selectAll(':scope > g[data-teil]').each(function () {
    bestehend.set(this.dataset.teil, d3.select(this));
  }));
  bestehend.forEach((g, teil) => {
    if (jetzt.has(teil) && g.attr('data-schluessel') === schluessel && teil !== 'legende') { // bleibt stehen
      AKTUALISIERER[teil]?.(g, L, mitAnimation);
      return;
    }
    bestehend.delete(teil);
    g.attr('data-teil', null);
    if (mitAnimation && !jetzt.has(teil)) {
      g.interrupt().transition().duration(350).attr('opacity', 0).remove();
      setTimeout(() => g.remove(), 700);
    } else {
      g.remove();
    }
  });
  jetzt.forEach((teil) => {
    if (bestehend.has(teil)) return;
    const neu = mitAnimation && !instanz.teileVorher?.has(teil);
    const ebene = teil === 'muenzen' ? ebeneMuenzen : ebeneSpalten;
    const g = ebene.append('g').attr('data-teil', teil).attr('data-schluessel', schluessel);
    ZEICHNER[teil]?.(g, L, neu);
  });
  instanz.teileVorher = jetzt;
}

// Teile, die stehen bleiben, aber je Station anders aussehen
const AKTUALISIERER = {
  // Münzen: auf „schichten“ verborgen, ab „muenzen“ sichtbar; beim Vorwärtsschritt regnen sie, rückwärts blenden sie aus
  muenzen(g, L, mitAnimation) {
    const sichtbar = L.station !== 'schichten';
    const warSichtbar = g.attr('display') !== 'none';
    if (sichtbar === warSichtbar) return;
    instanz.regenSchleife?.stop();
    if (sichtbar) {
      baueMuenzen(g); // falls zu schnell weitergeklickt wurde
      if (mitAnimation) regne(g);
      else g.attr('display', null);
      return;
    }
    if (!mitAnimation) { g.attr('display', 'none'); return; }
    g.interrupt().transition().duration(350).attr('opacity', 0)
      .on('end', () => g.attr('display', 'none').attr('opacity', null));
    setTimeout(() => { if (instanz?.station === 'schichten') g.attr('display', 'none').attr('opacity', null); }, 700);
  }
};

// Münzen eines Münzen-Teils einmal anlegen; je Münze Knoten, Zielhöhe und Reihe für regne()
function baueMuenzen(g) {
  if (g.property('__muenzen')) return;
  const L = g.property('__layout');
  const { muenzeGulden } = instanz;
  const liste = [];
  L.spalten.filter((s) => !s.grau).forEach((s) => {
    const anzahl = Math.ceil(s.muenzen - 1e-9);
    const rest = s.muenzen - Math.floor(s.muenzen);
    const gm = g.append('g');
    gm.append('title').text(`${s.name}: ${zahl(Math.round(s.summe))} Gulden, `
      + `${s.muenzen.toLocaleString('de-AT', { maximumFractionDigits: 1 })} Münzen zu ${zahl(muenzeGulden)} Gulden`);
    gm.selectAll('circle').data(d3.range(anzahl)).join('circle')
      .attr('cx', (j) => s.muenzPos(j)[0]).attr('cy', (j) => s.muenzPos(j)[1])
      .attr('r', (j) => L.muenzRadius * (j === anzahl - 1 && rest > 0 ? Math.sqrt(rest) : 1))
      .attr('fill', GOLD).attr('stroke', GOLD_RAND).attr('stroke-width', 0.6)
      .each(function (j) { liste.push({ knoten: this, y: s.muenzPos(j)[1], reihe: Math.floor(j / s.mProZeile), reihen: Math.max(1, s.muenzReihen), j }); });
  });
  g.property('__muenzen', liste);
}

// Münzregen (2026-10-28 überarbeitet, „ruckelt am Anfang“): eine einzige Schleife (d3.timer) statt einer Transition je
// Münze, die Münzen sind schon angelegt; der Regen beginnt erst nach dem Scrollen zu den Münzfeldern (REGEN_START).
// Jede Münze fällt eine sichtbare Strecke und landet mit kleinem Aufprall, die untersten Reihen zuerst.
function regne(g) {
  instanz.regenSchleife?.stop();
  const liste = g.property('__muenzen') || [];
  const fallhoehe = Math.min(320, Math.max(160, window.innerHeight * 0.4));
  const daten = liste.map((m) => ({
    ...m,
    start: m.y - fallhoehe - ((m.j * 31) % 60),
    verzoegerung: (1 - m.reihe / m.reihen) * REGEN_DAUER + ((m.j * 7919) % 101) * 5,
    dauer: 800 + ((m.j * 104729) % 37) * 10,
    zustand: 0 // 0 wartet, 1 fällt, 2 gelandet
  }));
  daten.forEach((m) => { m.knoten.setAttribute('cy', m.start.toFixed(1)); m.knoten.setAttribute('opacity', '0'); });
  g.attr('display', null).attr('opacity', null);
  const ende = REGEN_DAUER + 1300;
  const schleife = d3.timer((vergangen) => {
    for (let i = 0; i < daten.length; i += 1) {
      const m = daten[i];
      if (m.zustand === 2) continue;
      const t = (vergangen - m.verzoegerung) / m.dauer;
      if (t <= 0) continue;
      if (m.zustand === 0) { m.knoten.setAttribute('opacity', '1'); m.zustand = 1; }
      if (t >= 1) { m.knoten.setAttribute('cy', m.y.toFixed(1)); m.zustand = 2; continue; }
      m.knoten.setAttribute('cy', (m.start + (m.y - m.start) * d3.easeBounceOut(t)).toFixed(1));
    }
    if (vergangen >= ende) schleife.stop();
  }, REGEN_START);
  instanz.regenSchleife = schleife;
  setTimeout(() => { // ruhende Tabs: Endzustand sicher
    if (instanz?.regenSchleife !== schleife) return;
    schleife.stop();
    daten.forEach((m) => { m.knoten.setAttribute('cy', m.y.toFixed(1)); m.knoten.setAttribute('opacity', '1'); });
  }, REGEN_START + ende + 500);
}

// sanft einblenden, wenn neu (mit Sicherung für ruhende Tabs)
function blendeEin(g, neu, verzoegerung = DAUER * 0.55) {
  if (!neu) return;
  g.attr('opacity', 0).transition().delay(verzoegerung).duration(700).attr('opacity', 1);
  setTimeout(() => g.attr('opacity', 1), verzoegerung + 900);
}

const ZEICHNER = {
  // Überschriften und Zahlen der beiden Spalten (bleiben auf der Folie `frauen` stehen)
  geschlecht(g, L, neu) {
    [[L.links, 'Männer', L.maenner.length], [L.rechts, 'Frauen', L.frauen.length]].forEach(([s, titel, anzahl]) => {
      const mitte = s.x + s.b / 2;
      g.append('text').attr('class', 'bgi-spaltenkopf').attr('x', mitte).attr('y', 26).text(titel);
      g.append('text').attr('class', 'bgi-spaltenzahl').attr('x', mitte).attr('y', 50).text(zahl(anzahl));
    });
    blendeEin(g, neu);
  },

  // leerer Rahmen der Frauen-Spalte; blendet aus, wenn sie sich auf der Folie `frauen` füllt
  leeresFeld(g, L, neu) {
    if (L.frauen.length === 0) {
      const rechts = L.rechts;
      g.append('rect')
        .attr('x', rechts.x).attr('y', KOPF_SPALTEN).attr('width', rechts.b).attr('height', L.spaltenHoehe)
        .attr('rx', 10).attr('fill', 'none').attr('stroke', RAHMEN).attr('stroke-width', 1.4).attr('stroke-dasharray', '6 6');
      g.append('text').attr('class', 'bgi-leer').attr('x', rechts.x + rechts.b / 2).attr('y', KOPF_SPALTEN + L.spaltenHoehe / 2).text('keine Einträge');
    }
    blendeEin(g, neu);
  },

  // Namen und Anteile über den drei Bürgersäulen, Grundlinie
  koepfe(g, L, neu) {
    const buerger = L.spalten.filter((s) => !s.grau);
    g.append('line').attr('x1', buerger[0].x).attr('x2', L.b).attr('y1', L.grundlinie + 0.5).attr('y2', L.grundlinie + 0.5)
      .attr('stroke', '#c3c2b7').attr('stroke-width', 1);
    buerger.forEach((s) => zeichneSaeulenkopf(g, s, `${prozent(s.anteil)} % · ${zahl(s.anzahl)}`));
    blendeEin(g, neu);
  },

  // Gesamtvermögen, Anteil, Mittelwert und Spanne unter der Grundlinie
  werte(g, L, neu) {
    L.spalten.filter((s) => !s.grau).forEach((s) => {
      const mitte = s.x + s.b / 2;
      [`${zahl(Math.round(s.summe))} fl`, s.eng ? `${prozent(s.vermoegensanteil)} %` : `${prozent(s.vermoegensanteil)} % des Vermögens`,
        `Ø ${zahl(s.mittel)} fl`, s.eng ? `${zahl(s.von)}–${zahl(s.bis)}` : `(${zahl(s.von)}–${zahl(s.bis)} fl)`]
        .forEach((t, z) => g.append('text').attr('class', z === 0 ? 'bgi-wert' : 'bgi-wert-klein')
          .attr('x', mitte).attr('y', L.grundlinie + 20 + z * 16).text(t));
    });
    blendeEin(g, neu, 300);
  },

  // Münzen: eine je muenzeGulden, die letzte angebrochene flächengleich kleiner. Neu: sie regnen herab, sobald die
  // Seite zu den Münzfeldern gescrollt hat (zeigeMuenzfelder()), fallen eine sichtbare Strecke über den Säulen (hinter
  // den Punkten) und landen mit kleinem Aufprall; die untersten Reihen zuerst, sodass sich die Felder von unten füllen
  // Auf „schichten“ verborgen und erst angelegt, wenn die Punkte angekommen sind (sonst stockt der Anfang des
  // Morphens); spätestens beim Weiterklicken legt AKTUALISIERER.muenzen sie an.
  muenzen(g, L, neu) {
    g.property('__layout', L);
    if (L.station === 'schichten') {
      g.attr('display', 'none');
      clearTimeout(instanz.muenzAufbau);
      instanz.muenzAufbau = setTimeout(() => { if (g.node().isConnected) baueMuenzen(g); }, DAUER + STAFFELUNG + 200);
      return;
    }
    baueMuenzen(g);
    if (neu) regne(g);
  },

  // graue Säule: Kopf, „kein erfasster Besitz“, leeres Feld statt Münzen, Beschreibung
  grau(g, L, neu) {
    const s = L.spalten[0];
    const mitte = s.x + s.b / 2;
    zeichneSaeulenkopf(g, s, s.eng ? 'mind. so viele' : 'mindestens so viele');
    (s.eng ? ['kein erfasster', 'Besitz'] : ['kein erfasster Besitz']).forEach((t, z) => g.append('text')
      .attr('class', z === 0 ? 'bgi-wert' : 'bgi-wert-klein').attr('x', mitte).attr('y', L.grundlinie + 20 + z * 16).text(t));
    g.append('line').attr('x1', s.x).attr('x2', s.x + s.b).attr('y1', L.grundlinie + 0.5).attr('y2', L.grundlinie + 0.5)
      .attr('stroke', '#c3c2b7').attr('stroke-width', 1);
    g.append('rect').attr('x', s.x).attr('y', L.muenzStart).attr('width', s.b).attr('height', 44).attr('rx', 8)
      .attr('fill', 'none').attr('stroke', RAHMEN).attr('stroke-width', 1.2).attr('stroke-dasharray', '5 5');
    s.beschreibungZeilen.forEach((zeile, z) => g.append('text').attr('class', 'bgi-wert-klein')
      .attr('x', mitte).attr('y', L.muenzStart + 64 + z * 15).text(zeile));
    blendeEin(g, neu, 1600);
  },

  // Legende: Einträge je nach Station (ohne Einblenden, sie wird bei jedem Wechsel neu gesetzt)
  legende(g, L) {
    const lg = g.attr('class', 'bgi-legende').attr('transform', `translate(${L.spalten[1].x + 4},${L.legendeY})`);
    const eintraege = [['punkt', '1 Punkt = 1 Haushalt der Bürgerschaft (Anteil)']];
    if (L.station !== 'schichten') eintraege.push(['muenze', `1 Münze = ${zahl(instanz.muenzeGulden)} Gulden`]);
    if (L.station === 'vermoegenslos') eintraege.push(['grau', '1 Punkt = Einwohner ohne Bürgerrecht']);
    eintraege.forEach(([art, text], z) => {
      const y = z * 18;
      const zeichen = lg.append('circle').attr('cx', 6).attr('cy', y);
      if (art === 'punkt') zeichen.attr('r', L.radius + 0.4).attr('fill', HAUSHALT_FARBE).attr('fill-opacity', 0.85);
      if (art === 'muenze') zeichen.attr('r', L.muenzRadius).attr('fill', GOLD).attr('stroke', GOLD_RAND).attr('stroke-width', 0.6);
      if (art === 'grau') zeichen.attr('r', L.radius + 0.4).attr('class', 'bgi-grau');
      lg.append('text').attr('x', 18).attr('y', y + 4).text(text);
    });
  }
};

// Name (ggf. umbrochen) und Zahlzeile über einer Säule
function zeichneSaeulenkopf(g, s, zahlzeile) {
  const mitte = s.x + s.b / 2;
  const kopf = g.append('text').attr('class', `bgi-spaltenkopf klein${s.eng ? ' eng' : ''}`).attr('x', mitte).attr('y', s.oben - 30);
  s.kopfZeilen.forEach((teil, z) => kopf.append('tspan').attr('x', mitte)
    .attr('dy', z ? '1.05em' : `${-(s.kopfZeilen.length - 1) * 1.05}em`).text(teil));
  g.append('text').attr('class', `bgi-spaltenzahl${s.eng ? ' eng' : ''}`).attr('x', mitte).attr('y', s.oben - 12).text(zahlzeile);
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

// Erklärung zwischen bzw. neben den Säulen (breit) oder darunter (schmal); sichtbar, wenn die Station Text hat
function platziereErklaerung() {
  const { erklaerung, buehne, layout: L } = instanz;
  const sichtbar = absaetzeVon(instanz.stationIndex).length > 0;
  if (L.text && erklaerung.parentNode !== buehne) buehne.appendChild(erklaerung);
  if (!L.text && erklaerung.previousSibling !== buehne) buehne.after(erklaerung);
  erklaerung.classList.toggle('mittig', Boolean(L.text));
  erklaerung.style.left = L.text ? `${L.text.x}px` : '';
  erklaerung.style.width = L.text ? `${L.text.b}px` : '';
  erklaerung.style.top = L.text ? `${L.text.top}px` : '';
  erklaerung.classList.toggle('sichtbar', sichtbar);
  erklaerung.inert = !sichtbar;
}

// Text der neuen Station setzen: kommt er nur dazu (vorwärts auf eine Station mit text_anhaengen), werden nur die
// neuen Absätze angehängt und eingeblendet; sonst wird der ganze Text getauscht und neu eingeblendet
function setzeText(vorherIndex) {
  const { erklaerung, stationIndex } = instanz;
  const station = instanz.stationen[stationIndex];
  if (station.anhaengen && vorherIndex === stationIndex - 1 && erklaerung.classList.contains('sichtbar')) {
    erklaerung.insertAdjacentHTML('beforeend', station.absaetze.map((a) => absatzHtml(a, 'neu')).join(''));
    return;
  }
  erklaerung.classList.remove('sichtbar');
  void erklaerung.offsetWidth;
  erklaerung.innerHTML = absaetzeVon(stationIndex).map((a) => absatzHtml(a)).join('');
}

// Bühnenhöhe je Station: Säulen und Münzen sowie der Text daneben bestimmen sie, mindestens die Ausgangshöhe
function passeHoeheAn() {
  const { buehne, erklaerung, basisHoehe } = instanz;
  const L = berechneLayout();
  let hoehe = Math.max(basisHoehe, L.benoetigt || 0);
  if (L.text && absaetzeVon(instanz.stationIndex).length) {
    erklaerung.classList.add('mittig');
    erklaerung.style.width = `${L.text.b}px`;
    hoehe = Math.max(hoehe, L.text.top + erklaerung.offsetHeight + 12);
  }
  buehne.style.height = `${hoehe}px`;
  void buehne.clientWidth; // Layout jetzt erzwingen: ein neu erscheinender Scrollbalken ändert die Breite vor dem Zeichnen
}

// Vor dem Münzregen die Seite so weit scrollen, dass die Münzfelder in der unteren Bildschirmhälfte sichtbar sind
// (sonst fiele der Regen auf vielen Bildschirmen unterhalb des sichtbaren Bereichs)
function zeigeMuenzfelder() {
  const L = instanz.layout;
  if (!L.muenzStart) return;
  const svgOben = instanz.svg.node().getBoundingClientRect().top + window.scrollY;
  const ziel = svgOben + L.muenzStart - window.innerHeight * 0.45;
  if (ziel > window.scrollY + 20) window.scrollTo({ top: ziel, behavior: ohneAnimation() ? 'auto' : 'smooth' });
}

function zeigePersonMitId(id) {
  const p = instanz.personen.find((x) => x.id === id);
  if (p) oeffnePerson(p);
}

function schliessePerson() {
  if (!instanz?.auswahl) return;
  instanz.auswahl = null;
  markiereAuswahl();
  schliesseSidebar(instanz.sidebar, instanz.weiterKnopf.hidden ? instanz.zurueckKnopf : instanz.weiterKnopf);
}

function markiereAuswahl() {
  const { punkte, auswahl } = instanz;
  punkte.style('stroke', (p) => (p.id === auswahl ? AUSWAHL : null)).style('stroke-width', (p) => (p.id === auswahl ? '2px' : null));
  punkte.filter((p) => p.id === auswahl).raise();
}

function stationsBeschriftung() {
  const { station, layout: L, schichten, personen } = instanz;
  if (station === 'geschlecht') return `${zahl(L.maenner.length)} Männer und ${zahl(L.frauen.length)} Frauen im Bürgerbuch`;
  if (station === 'frauen') return `${zahl(L.maenner.length)} Männer im Bürgerbuch, daneben ebenso viele symbolische Punkte für die Frauen, die es nicht nennt`;
  if (VERMOEGEN_STATIONEN.includes(station) && schichten) {
    const teile = schichten.buerger.map((s) => (station === 'schichten'
      ? `${s.name}: ${prozent(s.anteil)} Prozent der Haushalte`
      : `${s.name}: ${prozent(s.anteil)} Prozent der Haushalte, ${prozent(s.vermoegensanteil)} Prozent des Vermögens`));
    return `Bürgerschaft nach Schichten. ${teile.join('. ')}.${station === 'vermoegenslos' ? ` Dazu mindestens ebenso viele ${schichten.ohne?.name || 'Einwohner ohne Bürgerrecht'}, ohne erfassten Besitz.` : ''}`;
  }
  return `${zahl(personen.length)} Personen im Bürgerbuch, als Steiner Tor`;
}

// Folien: Weiter (hüpfender Pfeil; der Name der nächsten Folie steht in aria-label und title) und Zurück
function aktualisiereSteuerung() {
  const { stationen, stationIndex, weiterKnopf, zurueckKnopf } = instanz;
  const naechste = stationen[stationIndex + 1];
  weiterKnopf.hidden = !naechste;
  if (naechste) {
    weiterKnopf.setAttribute('aria-label', `Weiter: ${naechste.knopf}`);
    weiterKnopf.title = naechste.knopf;
  }
  zurueckKnopf.hidden = stationIndex === 0;
  const vorige = stationen[stationIndex - 1];
  zurueckKnopf.setAttribute('aria-label', vorige ? `Zurück: ${vorige.id === 'tor' ? 'Steiner Tor' : vorige.knopf}` : 'Zurück');
}

function geheZu(index) {
  if (!instanz || index < 0 || index >= instanz.stationen.length || index === instanz.stationIndex) return;
  const fokusWar = document.activeElement;
  schliessePerson();
  const vorher = instanz.stationIndex;
  instanz.stationIndex = index;
  instanz.station = instanz.stationen[index].id;
  instanz.unterzeile.textContent = instanz.stationen[index].unterzeile || STANDARD_UNTERZEILE;
  setzeText(vorher);
  passeHoeheAn();
  zeichne(true);
  instanz.svg.attr('aria-label', stationsBeschriftung());
  if (instanz.station === 'muenzen' && index > vorher) zeigeMuenzfelder();
  aktualisiereSteuerung();
  // verschwindet der gedrückte Knopf (erste/letzte Folie), bleibt der Fokus auf dem anderen
  if (fokusWar === instanz.weiterKnopf && instanz.weiterKnopf.hidden) instanz.zurueckKnopf.focus();
  if (fokusWar === instanz.zurueckKnopf && instanz.zurueckKnopf.hidden) instanz.weiterKnopf.focus();
}

// Daten der Stationen nachladen; bis dahin steht das Tor ohne Knöpfe
async function ladeStationsdaten() {
  const [stationen, schichten] = await Promise.all([
    ladeCSV(STATIONEN_DATEI).then((r) => r.records).catch(() => null),
    ladeCSV(SCHICHTEN_DATEI).then((r) => r.records).catch(() => null)
  ]);
  if (!instanz) return;
  instanz.schichten = bereiteSchichtenAuf(schichten, instanz.personen.length);
  instanz.stationen = bereiteStationenAuf(stationen)
    .filter((s) => !VERMOEGEN_STATIONEN.includes(s.id) || instanz.schichten)
    .filter((s) => s.id !== 'vermoegenslos' || instanz.schichten?.ohne);
  instanz.muenzeGulden = instanz.stationen.find((s) => s.muenze)?.muenze || STANDARD_MUENZE;
  if (instanz.schichten) {
    // Zuordnung Punkt → Schicht und Platz in der Säule (nach der gemischten Reihenfolge, also ohne Bezug zur Person)
    const grenzen = [];
    instanz.schichten.buerger.reduce((summe, s) => { grenzen.push(summe + s.anzahl); return summe + s.anzahl; }, 0);
    instanz.zuordnung = instanz.personen.map((p, i) => {
      const k = grenzen.findIndex((g) => i < g);
      return { k, rang: i - (k > 0 ? grenzen[k - 1] : 0) };
    });
    if (instanz.schichten.ohne) {
      instanz.graue = instanz.ebeneGraue.selectAll('circle').data(d3.range(instanz.personen.length)).join('circle')
        .attr('class', 'bgi-grau').attr('cx', -40).attr('cy', 0).attr('opacity', 0).style('pointer-events', 'none')
        .on('mouseenter', function () { zeigeTooltip(`${instanz.schichten.ohne.name}\n${instanz.schichten.ohne.beschreibung}`, this, instanz.container); })
        .on('mouseleave', () => versteckeTooltip());
    }
  }
  aktualisiereSteuerung();
}

export function render(container, data, options = {}) {
  if (instanz) destroy();
  container.innerHTML = '';
  fuegeStyleEin(container);
  fuegeSidebarStyleEin(container);
  const buergerbuch = data?.buergerbuch || [];
  const personen = mische(sammlePersonen(buergerbuch, data?.personenliste)).map((p, nr) => ({ ...p, nr }));
  const spanne = jahresSpanne(buergerbuch);

  const wurzel = document.createElement('div');
  wurzel.className = 'bgi-wurzel';
  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'bgi-werkzeugleiste';
  const kopf = document.createElement('div');
  kopf.className = 'bgi-kopf';
  kopf.innerHTML = `<div class="bgi-ueberzeile">Bürgerbuch Krems${spanne ? ` · ${spanne[0]}–${spanne[1]}` : ''}</div>
    <p class="bgi-zahl">${zahl(personen.length)} Personen</p>
    <div class="bgi-unterzeile">${STANDARD_UNTERZEILE}</div>`;
  const steuerung = document.createElement('div');
  steuerung.className = 'bgi-steuerung';
  steuerung.innerHTML = `<button type="button" class="bgi-zurueck" hidden>Zurück</button>
    <button type="button" class="bgi-weiter" hidden><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  const buehne = document.createElement('div');
  buehne.className = 'bgi-buehne';
  const erklaerung = document.createElement('div');
  erklaerung.className = 'bgi-erklaerung';
  erklaerung.setAttribute('aria-live', 'polite');
  wurzel.append(werkzeugleiste, kopf, steuerung, buehne, erklaerung);
  container.appendChild(wurzel);

  // Höhe: die Bühne füllt den sichtbaren Platz (abzüglich Kopf); die Vermögens-Folien machen sie bei Bedarf höher
  const hoehe = options.height || ermittleVerfuegbareHoehe(buehne, { reserveUnten: 24, mindestHoehe: 320 });
  buehne.style.height = `${hoehe}px`;

  const svg = d3.select(buehne).append('svg').attr('role', 'img')
    .attr('aria-label', `${zahl(personen.length)} Personen im Bürgerbuch, als Steiner Tor`);
  const ebeneSpalten = svg.append('g');
  const ebeneMuenzen = svg.append('g');
  const ebeneGraue = svg.append('g');
  const leinwand = document.createElement('canvas'); // Bewegungen vieler Punkte (siehe starteBewegung())
  leinwand.className = 'bgi-leinwand';
  leinwand.setAttribute('aria-hidden', 'true');
  buehne.appendChild(leinwand);
  // symbolische Frauen-Punkte (unter den Männern, damit sie beim Verschmelzen unter ihnen verschwinden)
  const frauenPunkte = svg.append('g').selectAll('circle').data(d3.range(personen.length)).join('circle')
    .attr('class', 'bgi-frau').attr('fill', FRAUEN_FARBE).attr('fill-opacity', 0.85).attr('opacity', 0).attr('cx', -40).attr('cy', 0)
    .style('pointer-events', 'none')
    .on('mouseenter', function () { zeigeTooltip('Frau (symbolischer Punkt)\nkeine bestimmte Person', this, container); })
    .on('mouseleave', () => versteckeTooltip());
  const punkte = svg.append('g').selectAll('circle').data(personen).join('circle')
    .attr('class', 'bgi-punkt').attr('fill', FARBE);
  punkte
    .on('mouseenter', function (event, p) {
      if (PERSONEN_STATIONEN.includes(instanz.station)) {
        const zeile = p.rolle === 'neubuerger' ? `Neubürger${p.jahr ? ` ${p.jahr}` : ''}` : 'Bürge';
        zeigeTooltip(`${p.name}\n${zeile}`, this, container);
        return;
      }
      const s = instanz.schichten?.buerger[instanz.zuordnung[p.nr].k];
      if (s) zeigeTooltip(`${s.name}\n1 von ${zahl(s.anzahl)} Haushalten (Anteil, keine bestimmte Person)`, this, container);
    })
    .on('mouseleave', () => versteckeTooltip())
    .on('click', (event, p) => {
      event.stopPropagation();
      if (!PERSONEN_STATIONEN.includes(instanz.station)) return; // in den Vermögens-Folien steht ein Punkt für keinen bestimmten Menschen
      versteckeTooltip();
      oeffnePerson(p);
    });

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
  instanz = {
    container, wurzel, buehne, personen, station: 'tor', stationIndex: 0, stationen: STANDARD_STATIONEN, schichten: null,
    zuordnung: null, muenzeGulden: STANDARD_MUENZE, svg, punkte, graue: null, graueSichtbar: false, frauenPunkte, frauenSichtbar: false, leinwand, bewegungen: new Map(), leinwandSchleife: null, ebeneSpalten, ebeneMuenzen,
    ebeneGraue, teileVorher: new Set(), weiterKnopf: steuerung.querySelector('.bgi-weiter'), zurueckKnopf: steuerung.querySelector('.bgi-zurueck'),
    unterzeile: kopf.querySelector('.bgi-unterzeile'), erklaerung, infoButton: null, layout: null, sidebar, quellen,
    auswahl: null, basisHoehe: hoehe, letzteBreite: 0, animationBis: 0
  };
  instanz.weiterKnopf.addEventListener('click', () => geheZu(instanz.stationIndex + 1));
  instanz.zurueckKnopf.addEventListener('click', () => geheZu(instanz.stationIndex - 1));
  sidebar.schliessenBtn.addEventListener('click', schliessePerson);
  sidebar.zurueckBtn.addEventListener('click', () => zurueckZurKombiniertenListe(sidebar)); // Liste der Person wieder zeigen
  erklaerung.addEventListener('click', (event) => {
    const knopfPerson = event.target.closest('.bgi-textperson');
    if (knopfPerson) zeigePersonMitId(knopfPerson.dataset.person);
  });
  // Klick auf eine freie Stelle der Ansicht schließt die Sidebar (Punkte stoppen ihren Klick; Links bleiben Links)
  wurzel.addEventListener('click', (event) => { if (!event.target.closest('a, button')) schliessePerson(); });
  infotextFuerModul('buergerinnen').then((cfg) => {
    if (!instanz || !cfg || !werkzeugleiste.isConnected) return;
    instanz.infoButton = erzeugeInfoButton(werkzeugleiste, cfg);
  });
  zeichne(false);
  ladeStationsdaten();
  // Nur echte Breitenänderungen (Fenster) neu zeichnen. zeichne() merkt sich die Breite, mit der es gezeichnet hat;
  // läuft gerade ein Übergang, wird erst danach neu gezeichnet, damit er nicht abbricht.
  let geplant = null;
  instanz.beobachter = new ResizeObserver(() => {
    if (!instanz || buehne.clientWidth === instanz.letzteBreite) return;
    clearTimeout(geplant);
    geplant = setTimeout(() => {
      if (!instanz || buehne.clientWidth === instanz.letzteBreite) return;
      passeHoeheAn();
      zeichne(false);
    }, Math.max(150, instanz.animationBis - Date.now()));
  });
  instanz.beobachter.observe(buehne);
}

export function resize() {
  if (instanz) zeichne(false);
}

export function destroy() {
  if (!instanz) return;
  instanz.beobachter?.disconnect();
  instanz.leinwandSchleife?.stop();
  instanz.regenSchleife?.stop();
  instanz.graue?.interrupt();
  instanz.infoButton?.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
