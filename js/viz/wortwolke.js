// js/viz/wortwolke.js
// Wortwolke der Urkunden: Worthäufigkeit im regest-Volltext. Modul-Interface siehe
// Abschnitt 5.
//
// Kein d3-cloud (nicht im freigegebenen Stack, gleiche Begründung wie bei
// alluvial.js/sankey.js) - Spiral-Platzierung mit Kollisionsprüfung von Hand
// gebaut, canvas.measureText() für schnelle Textbreiten-Schätzung (Standardtechnik,
// auch d3-cloud intern verwendet), ohne die Zeichenfläche selbst zu benutzen.
//
// GEFUNDENE DATENEIGENHEIT (bitte bestätigen): 796 von 1069 regest-Feldern enthalten
// einen angehängten Quellenverweis, in ZWEI unterschiedlichen Formulierungen
// ("Source Regest: Harry Kühnel, Stadtarchiv Krems..." bei älteren Einträgen,
// "Quelle Regest: Stadtarchiv Krems, 2020" bei neueren) - das ist eine Zitation,
// kein inhaltlicher Urkundentext. Ohne Abschneiden würde die Wolke von "Source",
// "Regest", "Kühnel", "Krems", "1960"/"2020" dominiert statt vom eigentlichen
// Regesteninhalt. Der Text ab der jeweiligen Zitationsmarkierung wird deshalb vor
// der Auszählung entfernt. Beim ersten Testlauf wurde nur die erste Formulierung
// abgedeckt ("Quelle Regest:" fehlte) - "regest" tauchte dadurch selbst noch unter
// den häufigsten Wörtern auf; per gezielter Datenprüfung gefunden und behoben.
//
// ERSTE FASSUNG der deutschen Stoppwortliste (bitte bei Bedarf verfeinern, wie schon
// bei datePrecision.js) - historisches Deutsch in den Regesten kann Wörter enthalten,
// die eine allgemeine Liste nicht abdeckt.
//
// Farbe: CAT_COLORS.default mit Deckkraft nach Häufigkeit (kein Kategorie-Bezug,
// ein Wort ist keiner einzelnen Urkunden-Kategorie zugeordnet).
//
// AUFTRAG F: archivspezifische Filter aus data/wortwolke_filter.csv (optional,
// siehe docs/SCHEMA.md 13.7). Reihenfolge: Ein Wort entfällt, wenn es selbst oder
// seine Leitform ausgelassen wird (Liste, Vorname, Regel "roemische_zahlen");
// danach zählen Schreibweisen und Beugungsformen unter ihrer Leitform. Fehlt die
// Datei, ist sie leer oder unbrauchbar, zählt die Wolke wie vorher (nur die
// allgemeinen Füllwörter unten). Der Info-Button nennt die angewendeten Filter.

import { CAT_COLORS } from '../config/constants.js';
import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { infotextFuerModul, konfigurationsliste } from '../core/archivKonfiguration.js';
import { alsText } from '../utils/textwert.js';
import { ladeGecachteCSV } from '../core/datenCache.js';
import { holeDateiZustand } from '../core/dataLoader.js';

// AUFTRAG "Info-Button für die 6 bleibenden Module": Text wörtlich übernommen.

let instanz = null; // { container, records, options, infoButton } – eine aktive Wortwolke pro Modul-Ladung

const MAX_WOERTER = 90;
const SCHRIFTGROESSE = { min: 12, max: 56 };
const MAX_PLATZIERUNGSVERSUCHE = 500;

const STOPWOERTER = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'eines', 'einem', 'einen',
  'und', 'oder', 'in', 'im', 'an', 'am', 'auf', 'zu', 'zum', 'zur', 'von', 'vom', 'für', 'mit',
  'bei', 'ist', 'war', 'waren', 'wird', 'sich', 'dass', 'als', 'auch', 'nach', 'über', 'durch',
  'um', 'aus', 'es', 'er', 'sie', 'nicht', 'wie', 'so', 'dieser', 'diese', 'dieses', 'ihm', 'ihr',
  'ihre', 'ihren', 'ihrer', 'sein', 'seine', 'seiner', 'seinem', 'wurde', 'wurden', 'werden',
  'hat', 'haben', 'hatte', 'kann', 'soll', 'sollen', 'noch', 'nur', 'schon', 'wieder', 'sondern',
  'ohne', 'unter', 'zwischen', 'gegen', 'vor', 'seit', 'jahr', 'jahre', 'jahres'
]);

// AUFTRAG B1 (Prüfbericht Punkt 3): `regest` kann durch "|" eine Liste sein
// (Loader-Konvention) - als Text mit " | " verarbeiten statt an .split() abzubrechen.
// AUFTRAG C1, Punkt 4: ab welchem Vermerk der Text als Quellenangabe gilt und
// nicht mehr gezählt wird, steht in archiv.csv (`regest_quellenvermerk`,
// Krems: "Source Regest|Quelle Regest", jeweils gefolgt von ":"). Leer: das
// ganze Regest zählt.
const alsMuster = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
function bereinigeRegestText(regest) {
  const vermerke = konfigurationsliste('regest_quellenvermerk');
  if (vermerke.length === 0) return alsText(regest);
  return alsText(regest).split(new RegExp(`(?:${vermerke.map(alsMuster).join('|')})\\s*:`, 'i'))[0];
}

// AUFTRAG F: Filterdatei lesen. Liefert null (= nicht filtern), wenn die Datei
// fehlt, leer ist oder die Spalten `typ`/`wort` fehlen (falsches Trennzeichen) -
// den Balken dafür zeigt die zentrale Prüfung (datenAnforderungen.js, `optional`).
const FILTER_DATEI = 'data/wortwolke_filter.csv';
const ROEMISCHE_ZAHL = /^m{0,3}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/;
// Mittelalterliches Schluss-j (vij = vii) zählt mit.
const istRoemischeZahl = (wort) => ROEMISCHE_ZAHL.test(wort.endsWith('j') ? `${wort.slice(0, -1)}i` : wort);
const zelle = (wert) => alsText(wert).trim().toLowerCase();

function leseFilter(zeilen) {
  if (!Array.isArray(zeilen) || zeilen.length === 0 || !('typ' in zeilen[0]) || !('wort' in zeilen[0])) return null;
  const filter = { auslassen: new Set(), vornamen: new Set(), roemisch: false, schreibweisen: new Map(), beugungen: new Map(), uebergangen: 0 };
  zeilen.forEach((zeile) => {
    const typ = zelle(zeile.typ);
    const wort = zelle(zeile.wort);
    const leitform = zelle(zeile.leitform);
    if (!wort) filter.uebergangen += 1;
    else if (typ === 'auslassen') filter.auslassen.add(wort);
    else if (typ === 'vorname') filter.vornamen.add(wort);
    else if (typ === 'regel' && wort === 'roemische_zahlen') filter.roemisch = true;
    else if (typ === 'zusammenfuehren' && leitform) filter.schreibweisen.set(wort, leitform);
    else if (typ === 'beugung' && leitform) filter.beugungen.set(wort, leitform);
    else filter.uebergangen += 1;
  });
  return filter;
}

// Leitform über Schreibweise/Beugung, auch als Kette (pfen -> pfennig), mit Schutz gegen Zyklen.
function leitformVon(wort, filter) {
  let aktuell = wort;
  for (let schritt = 0; schritt < 5; schritt += 1) {
    const naechste = filter.schreibweisen.get(aktuell) ?? filter.beugungen.get(aktuell);
    if (!naechste || naechste === aktuell) break;
    aktuell = naechste;
  }
  return aktuell;
}

// Grund des Auslassens oder null. Reihenfolge der Gründe: Liste, Vorname, römische Zahl.
function auslassGrund(wort, leitform, grossgeschrieben, filter) {
  if (filter.auslassen.has(wort) || filter.auslassen.has(leitform)) return 'liste';
  if (filter.vornamen.has(wort) || filter.vornamen.has(leitform)) return 'vorname';
  if (filter.roemisch && ((grossgeschrieben && istRoemischeZahl(wort)) || (leitform !== wort && istRoemischeZahl(leitform)))) return 'roemisch';
  return null;
}

// Ohne Filter zählt die Wolke wie vor AUFTRAG F (gleiche Wörter, gleiche Zahlen).
// Mit Filter hält instanz.filterStatistik die Zahlen für den Info-Button fest.
function zaehleWorthaeufigkeit(records, filter = null) {
  const zaehlung = new Map();
  const statistik = { liste: 0, vorname: 0, roemisch: 0, roh: new Map(), schreibweisen: new Map(), beugungen: new Map() };
  records.forEach((record) => {
    const original = bereinigeRegestText(record.regest);
    const text = original.toLowerCase();
    // Großschreibung im Original nur für die Regel "roemische_zahlen" (gleiche Länge = gleiche Positionen)
    const gleicheLaenge = original.length === text.length;
    for (const treffer of text.matchAll(/[a-zäöüß]{3,}/g)) {
      const wort = treffer[0];
      if (STOPWOERTER.has(wort)) continue;
      let zielwort = wort;
      if (filter) {
        const leitform = leitformVon(wort, filter);
        const grossgeschrieben = gleicheLaenge && original[treffer.index] !== text[treffer.index];
        const grund = auslassGrund(wort, leitform, grossgeschrieben, filter);
        if (grund) { statistik[grund] += 1; continue; }
        statistik.roh.set(wort, (statistik.roh.get(wort) || 0) + 1);
        if (leitform !== wort) (filter.schreibweisen.has(wort) ? statistik.schreibweisen : statistik.beugungen).set(wort, leitform);
        zielwort = leitform;
      }
      zaehlung.set(zielwort, (zaehlung.get(zielwort) || 0) + 1);
    }
  });
  if (instanz) instanz.filterStatistik = filter ? statistik : null;
  return Array.from(zaehlung.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_WOERTER)
    .map(([text, anzahl]) => ({ text, anzahl }));
}

// AUFTRAG F: Absatz für den Info-Button, alle Zahlen aus der aktuellen Zählung.
// Zahl mit Einzahl/Mehrzahl, z. B. anzahl(1, 'Wort', 'Wörter') -> "1 Wort".
const anzahl = (n, einzahl, mehrzahl) => `${n.toLocaleString('de-DE')} ${n === 1 ? einzahl : mehrzahl}`;
const nennungen = (n) => anzahl(n, 'Nennung', 'Nennungen');
function beispiel(zuordnung, roh) {
  const [wort, leitform] = [...zuordnung.entries()].sort((a, b) => (roh.get(b[0]) || 0) - (roh.get(a[0]) || 0))[0];
  return `zum Beispiel „${wort}“ unter „${leitform}“`;
}

function baueFilterAbsatz() {
  const absatz = document.createElement('p');
  const saetze = ['Allgemeine Füllwörter wie „und“ oder „der“ werden nicht gezählt.'];
  const { filter, filterStatistik: st } = instanz;
  if (!filter || !st) {
    saetze.push('Weitere Filter sind für dieses Archiv nicht eingestellt.');
  } else {
    const teile = [];
    if (filter.auslassen.size) teile.push(`${anzahl(filter.auslassen.size, 'Wort', 'Wörter')} aus einer Liste (${nennungen(st.liste)})`);
    if (filter.roemisch) teile.push(`römische Zahlen (${nennungen(st.roemisch)})`);
    if (filter.vornamen.size) teile.push(`${anzahl(filter.vornamen.size, 'Vorname', 'Vornamen')} (${nennungen(st.vorname)})`);
    if (teile.length) {
      const aufzaehlung = teile.length > 1 ? `${teile.slice(0, -1).join(', ')} und ${teile[teile.length - 1]}` : teile[0];
      saetze.push(`Für dieses Archiv werden zusätzlich ${aufzaehlung} ausgelassen (Datei wortwolke_filter.csv).`);
    }
    if (st.schreibweisen.size) {
      saetze.push(`${anzahl(st.schreibweisen.size, 'Schreibweise wird', 'Schreibweisen werden')} unter ${anzahl(new Set(st.schreibweisen.values()).size, 'Hauptform', 'Hauptformen')} zusammengezählt, ${beispiel(st.schreibweisen, st.roh)}.`);
    }
    if (st.beugungen.size) {
      // N: höchster Rang einer zusammengezählten Beugungsform unter allen Wörtern
      // nach dem Auslassen und vor dem Zusammenzählen.
      const rang = new Map([...st.roh.entries()].sort((a, b) => b[1] - a[1]).map(([wort], i) => [wort, i + 1]));
      const n = Math.max(...[...st.beugungen.keys()].map((wort) => rang.get(wort)));
      const formen = anzahl(st.beugungen.size, 'Beugungsform', 'Beugungsformen');
      const verb = st.beugungen.size === 1 ? 'wird' : 'werden';
      saetze.push(`Bei den ${n} häufigsten Wörtern ${verb} außerdem ${formen} unter ${anzahl(new Set(st.beugungen.values()).size, 'Grundform', 'Grundformen')} zusammengezählt, ${beispiel(st.beugungen, st.roh)}.`);
    }
    if (filter.uebergangen) {
      saetze.push(`${anzahl(filter.uebergangen, 'Zeile', 'Zeilen')} der Filterdatei ${filter.uebergangen === 1 ? 'wurde' : 'wurden'} nicht verwendet (unbekannter Typ oder fehlende Leitform).`);
    }
  }
  absatz.textContent = saetze.join(' ');
  return absatz;
}

function baueSpiralPosition(schritt) {
  const winkel = 0.15 * schritt;
  const radius = 2.5 * schritt;
  return { dx: radius * Math.cos(winkel), dy: radius * Math.sin(winkel) };
}

function ueberlappt(box, platzierteBoxen) {
  return platzierteBoxen.some((p) => !(box.x2 < p.x1 || box.x1 > p.x2 || box.y2 < p.y1 || box.y1 > p.y2));
}

// Platziert Wörter (größte/häufigste zuerst) spiralförmig um die Mitte, mit
// Kollisionsprüfung über achsenparallele Bounding-Boxen. Wörter, die im
// verfügbaren Platz nach MAX_PLATZIERUNGSVERSUCHE Versuchen nicht kollisionsfrei
// untergebracht werden können, bleiben unplatziert (platziert=false) statt
// stillschweigend irgendwo überlappend gezeichnet zu werden.
function platziereWoerter(woerter, breite, hoehe, canvasKontext) {
  const zentrumX = breite / 2;
  const zentrumY = hoehe / 2;
  const platzierteBoxen = [];

  woerter.forEach((wort) => {
    canvasKontext.font = `${wort.schriftgroesse}px sans-serif`;
    const textBreite = canvasKontext.measureText(wort.text).width;
    const textHoehe = wort.schriftgroesse * 1.1;

    for (let versuch = 0; versuch < MAX_PLATZIERUNGSVERSUCHE; versuch += 1) {
      const spiral = baueSpiralPosition(versuch);
      const x = zentrumX + spiral.dx;
      const y = zentrumY + spiral.dy;
      const box = { x1: x - textBreite / 2 - 2, x2: x + textBreite / 2 + 2, y1: y - textHoehe / 2 - 2, y2: y + textHoehe / 2 + 2 };
      if (box.x1 < 0 || box.x2 > breite || box.y1 < 0 || box.y2 > hoehe) continue;
      if (ueberlappt(box, platzierteBoxen)) continue;
      platzierteBoxen.push(box);
      wort.x = x;
      wort.y = y;
      wort.platziert = true;
      break;
    }
  });

  return woerter;
}

// Dasselbe "bei jedem Redraw neu einfügen"-Muster wie karte.js' fuegeStyleEin().
function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `.wortwolke-werkzeugleiste { display: flex; justify-content: flex-end; margin-bottom: 6px; }`;
  container.appendChild(style);
}

function zeichneWortwolke() {
  const { container, records, options } = instanz;
  if (instanz.infoButton) instanz.infoButton.destroy();
  container.innerHTML = '';
  fuegeStyleEin(container);

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'wortwolke-werkzeugleiste';
  container.appendChild(werkzeugleiste);
  infotextFuerModul('wortwolke').then((cfg) => {
    if (!instanz || !cfg || !werkzeugleiste.isConnected) return;
    instanz.infoButton = erzeugeInfoButton(werkzeugleiste, { ...cfg, zusatzInhalt: baueFilterAbsatz() }); // AUFTRAG F
  });

  const breite = options.width || container.clientWidth || 800;
  const hoehe = options.height || 600;

  const woerter = zaehleWorthaeufigkeit(records, instanz.filter);
  const maxAnzahl = d3.max(woerter, (w) => w.anzahl) || 1;
  const schriftgroessenSkala = d3.scaleSqrt().domain([1, maxAnzahl]).range([SCHRIFTGROESSE.min, SCHRIFTGROESSE.max]);
  const opazitaetSkala = d3.scaleLinear().domain([1, maxAnzahl]).range([0.5, 1]);
  woerter.forEach((w) => { w.schriftgroesse = schriftgroessenSkala(w.anzahl); });

  const canvas = document.createElement('canvas');
  const canvasKontext = canvas.getContext('2d');
  platziereWoerter(woerter, breite, hoehe, canvasKontext);

  const svg = d3.select(container).append('svg')
    .attr('width', breite).attr('height', hoehe)
    .attr('viewBox', `0 0 ${breite} ${hoehe}`)
    .attr('role', 'img')
    .attr('aria-label', 'Wortwolke der häufigsten Wörter aus den Urkunden-Regesten');

  svg.append('desc').text(
    `Die ${woerter.length} häufigsten inhaltlichen Wörter aus allen Regesten, ` +
    'Schriftgröße nach Häufigkeit. Zitationsverweise ("Source Regest: ..." bzw. ' +
    '"Quelle Regest: ...") sind vor der Auszählung entfernt.'
  );

  const platzierte = woerter.filter((w) => w.platziert);
  const nichtPlatziert = woerter.filter((w) => !w.platziert);

  svg.selectAll('text.wolken-wort')
    .data(platzierte)
    .join('text')
    .attr('class', 'wolken-wort')
    .attr('tabindex', 0)
    .attr('x', (w) => w.x).attr('y', (w) => w.y)
    .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
    .attr('font-size', (w) => w.schriftgroesse)
    .attr('fill', CAT_COLORS.default)
    .attr('fill-opacity', (w) => opazitaetSkala(w.anzahl))
    .text((w) => w.text)
    .on('mouseenter focus', function (event, w) { zeigeTooltip(`${w.text}: ${w.anzahl} Nennung(en)`, this, container); })
    .on('mouseleave blur', () => versteckeTooltip());

  if (nichtPlatziert.length > 0) {
    const hinweis = document.createElement('p');
    hinweis.style.fontSize = '11px';
    hinweis.style.color = '#6b6b6b'; // AUFTRAG D, Punkt 3: 3,25:1 -> 4,89:1 auf #f7f5f0
    hinweis.textContent = `${nichtPlatziert.length} Wörter (${nichtPlatziert.map((w) => w.text).join(', ')}) `
      + 'passten bei dieser Fenstergröße nicht kollisionsfrei hinein - bei mehr Platz erscheinen sie.';
    container.appendChild(hinweis);
  }
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  instanz = { container, records: data, options: { showUncertainty: true, width: null, height: null, ...options }, infoButton: null, filter: null, filterGeladen: false };
  // AUFTRAG F: Filterdatei erst beim Öffnen der Wolke (die zentrale Prüfung hat sie
  // vorher über denselben Cache geladen); gezeichnet wird, sobald sie vorliegt.
  // Hat die Prüfung die Datei schon als fehlend erkannt, nicht erneut anfragen
  // (der Cache behält fehlgeschlagene Ladeversuche bewusst nicht).
  const meineInstanz = instanz;
  const laden = holeDateiZustand(FILTER_DATEI)?.fehlt ? Promise.resolve(null) : ladeGecachteCSV(FILTER_DATEI).catch(() => null);
  laden.then((zeilen) => {
    if (instanz !== meineInstanz) return;
    instanz.filter = leseFilter(zeilen);
    instanz.filterGeladen = true;
    zeichneWortwolke();
  });
}

// Die Spiral-Platzierung hängt von den exakten Pixel-Maßen ab - resize() zeichnet
// deshalb immer vollständig neu, wie bei verbindungskarte.js/bipartiteFlowMap.js.
export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  if (instanz.filterGeladen) zeichneWortwolke(); // AUFTRAG F: sonst zeichnet render() nach dem Laden
}

export function destroy() {
  if (!instanz) return;
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
