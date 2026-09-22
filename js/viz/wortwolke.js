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

import { CAT_COLORS } from '../config/constants.js';
import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';

// AUFTRAG "Info-Button für die 6 bleibenden Module": Text wörtlich übernommen.
const WORTWOLKE_INFO_TEXT = `Diese Wortwolke zeigt die häufigsten Begriffe aus den Regesten-Texten – je größer ein Wort, desto häufiger kommt es vor. Hinweis: Regesten enthalten oft wiederkehrende Quellenangaben und Formelsprache; die Häufigkeit eines Begriffs sagt daher nichts über seine historische Bedeutung aus.`;

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

function bereinigeRegestText(regest) {
  return (regest || '').split(/(?:Source|Quelle) Regest\s*:/i)[0];
}

function zaehleWorthaeufigkeit(records) {
  const zaehlung = new Map();
  records.forEach((record) => {
    const text = bereinigeRegestText(record.regest).toLowerCase();
    const woerter = text.match(/[a-zäöüß]{3,}/g) || [];
    woerter.forEach((wort) => {
      if (STOPWOERTER.has(wort)) return;
      zaehlung.set(wort, (zaehlung.get(wort) || 0) + 1);
    });
  });
  return Array.from(zaehlung.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_WOERTER)
    .map(([text, anzahl]) => ({ text, anzahl }));
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
  instanz.infoButton = erzeugeInfoButton(werkzeugleiste, { text: WORTWOLKE_INFO_TEXT, ariaLabel: 'Erklärung zur Wortwolke' });

  const breite = options.width || container.clientWidth || 800;
  const hoehe = options.height || 600;

  const woerter = zaehleWorthaeufigkeit(records);
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
    hinweis.style.color = '#888';
    hinweis.textContent = `${nichtPlatziert.length} Wörter (${nichtPlatziert.map((w) => w.text).join(', ')}) `
      + 'passten bei dieser Fenstergröße nicht kollisionsfrei hinein - bei mehr Platz erscheinen sie.';
    container.appendChild(hinweis);
  }
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  instanz = { container, records: data, options: { showUncertainty: true, width: null, height: null, ...options }, infoButton: null };
  zeichneWortwolke();
}

// Die Spiral-Platzierung hängt von den exakten Pixel-Maßen ab - resize() zeichnet
// deshalb immer vollständig neu, wie bei verbindungskarte.js/bipartiteFlowMap.js.
export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneWortwolke();
}

export function destroy() {
  if (!instanz) return;
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
