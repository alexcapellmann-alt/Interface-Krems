// js/viz/korrelationsmatrix.js
// AUFTRAG "Parallelkoordinaten & Korrelationsmatrix → Verlassenschaften":
// zeigte bisher Pearson-Korrelationen zwischen fünf Urkunden-Kennzahlen -
// strukturell ungeeignet (Urkunden haben keine mehreren kontinuierlichen
// Zahlenwerte je Datensatz). Jetzt umgebaut auf data/verlassenschaftsinventare.csv
// (siehe archivalienRegistry.js: von `urkunden.ansichten` nach
// `verlassenschaften.ansichten` verschoben) und auf dieselben acht
// Vermögenskennzahlen wie parallelKoordinaten.js (js/utils/verlassenschaftenFelder.js,
// EINE gemeinsame Feld-/Skalentyp-Definition statt zweier paralleler, siehe
// dortiger Dateikopf-Kommentar).
//
// Spearman statt Pearson (Auftrag, wörtlich: "wegen der kleinen Stichprobe
// (67) und der bekannten Ausreißer"): live verifiziert, `Anteil SchvG an
// Aktiva (%)` erreicht bei einer Person 780,49 % - ein einzelner Ausreißer
// dieser Größenordnung verzerrt eine Pearson-Korrelation stark (empfindlich
// gegen Extremwerte), eine Rang-Korrelation ist robust dagegen. Umsetzung:
// Spearman = Pearson-Korrelation der RÄNGE (mit Durchschnittsrang bei
// Bindungen) - mathematisch die Standarddefinition, keine Näherung.
//
// Unterschied zu adjazenzmatrix.js: dort zählt eine Zelle KO-NENNUNGEN zwischen
// zwei kategorialen Entitäten (Personen), hier ein statistischer
// Zusammenhangs-Koeffizient zwischen zwei NUMERISCHEN Variablen über den ganzen
// Bestand - andere Fragestellung, andere Berechnung.
//
// FARB-AUSNAHME (bereits einmal bestätigt, unverändert übernommen): Eine
// Korrelationsmatrix muss das VORZEICHEN zeigen (positiver vs. negativer
// Zusammenhang), nicht nur die Stärke - deshalb weiterhin zwei bereits im
// Projekt etablierte technische Farben (Kartenblau #1a4d8f/Unsicherheits-Rot
// #c0392b) statt einer neuen Farbskala.
//
// Fehlende Werte werden paarweise ausgeschlossen (nur Zeilen mit Werten in
// BEIDEN Variablen fließen in dieses eine Zellenpaar ein) - der einzige
// unvollständige Datensatz dieser Tabelle (VI-0004, siehe
// parallelKoordinaten.js' Dateikopf-Kommentar) fehlt ALLEN acht Kennzahlen
// gleichermaßen (nicht nur einer einzelnen), daher zeigt live jede Zelle
// einheitlich N=67, nicht unterschiedliche N je Feldpaar - siehe
// Live-Verifikation in der Selbstauskunft. Stichprobengröße N steht mit im
// Tooltip - das ist die
// bereits etablierte Transparenz-Lösung für fehlende Werte bei DIESEM
// Modultyp (anders als parallelKoordinaten.js, das einzelne Datensätze
// zeichnet und deshalb einen eigenen Hinweistext braucht).
//
// NEU in diesem Auftrag: Klick auf eine Zelle öffnet ein Streudiagramm der
// beiden gewählten Variablen (Punkt 2, "macht den abstrakten
// Korrelationswert konkret nachvollziehbar") - eigenes, schlankes Overlay
// (oeffneScatterplot() unten), NICHT js/utils/lightbox.js wiederverwendet
// (das ist auf Fotos/<img> zugeschnitten, hier wird ein SVG-Diagramm
// gebraucht) - aber IM SELBEN, bereits etablierten Architekturmuster
// (lazy erzeugtes Singleton-Overlay im <body>, wiederverwendet über alle
// Öffnungen hinweg, Escape/Klick-außerhalb schließt) wie lightbox.js selbst,
// siehe dortiger Dateikopf-Kommentar zur Begründung dieses Musters. Bewusst
// NICHT nach js/utils/ ausgelagert: nur dieses eine Modul braucht es
// (anders als lightbox.js/sidebar.js, die von mehreren Modulen geteilt
// werden) - eine Auslagerung ohne zweiten Aufrufer wäre verfrühte
// Abstraktion.
//
// Achsenbeschriftung mit vollen Feldnamen (Punkt 2, Akzeptanzkriterium):
// VARIABLEN[].label aus js/utils/verlassenschaftenFelder.js - "SchzG"/
// "SchvG" bleiben dort BEWUSST unaufgelöst (deren volle Bedeutung ist nicht
// zweifelsfrei bekannt, siehe dortiger Kommentar und Selbstauskunft im Chat
// - Auftrag ausdrücklich: "Abkürzung beibehalten statt zu raten").

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { VERMOEGENS_VARIABLEN, wertFuerVariable, baueSkalaFuerVariable } from '../utils/verlassenschaftenFelder.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';

// Punkt 3 ("Info-Button-Texte... bitte Vorschläge machen, ich gebe frei"):
// Vorschlag, noch nicht freigegeben. Nennt SchzG/SchvG bewusst nur beim
// Namen, ohne ihre Bedeutung zu erklären - die ist nicht zweifelsfrei
// bekannt (siehe Dateikopf-Kommentar oben).
const INFO_TEXT = `Diese Matrix zeigt die Spearman-Rangkorrelation zwischen acht Vermögenskennzahlen je Person aus den Verlassenschaftsinventaren (Realvermögen, Gesamtvermögen sowie sechs Anteilswerte in Prozent - SchzG und SchvG jeweils an den Aktiva, Grundstücke, Bargeld, Wertgegenstände und Sonderbestand jeweils am Realvermögen). Blaue Zellen zeigen einen positiven, rote Zellen einen negativen Zusammenhang - je kräftiger die Farbe, desto stärker der Zusammenhang.

Die Rangkorrelation statt der gebräuchlicheren Pearson-Korrelation wurde gewählt, weil die Stichprobe klein ist (67 Personen) und einzelne Werte stark ausreißen - eine Rangkorrelation reagiert darauf robuster.

Fehlende Werte werden paarweise ausgeschlossen, die tatsächliche Stichprobengröße (N) steht im Tooltip jeder Zelle. Klick auf eine Zelle öffnet ein Streudiagramm der beiden gewählten Variablen.`;

let instanz = null; // { container, records, options, infoButton } – eine aktive Korrelationsmatrix pro Modul-Ladung

const FARBE_POSITIV = '#1a4d8f';
const FARBE_NEGATIV = '#c0392b';
const ZELLENGROESSE = 90;
// oben/links deutlich größer als in der urkunden-Vorgängerversion (140/190):
// die vollen Feldnamen (Punkt 2, bis zu "Anteil Wertgegenstände am
// Realvermögen (%)") sind spürbar länger als die vorigen fünf kurzen
// Kennzahlen-Labels - ohne diese Vergrößerung würden die schräg gestellten
// Spaltentitel oben bzw. die Zeilentitel links am SVG-Rand abgeschnitten
// (live geprüft, siehe Selbstauskunft im Chat).
const RAND = { oben: 240, unten: 10, links: 300, rechts: 10 };

// Rang je Wert einer Liste, mit Durchschnittsrang bei Bindungen (1-basiert) -
// Standardverfahren für Spearman bei wiederholten Werten (z.B. mehrere
// Personen mit exakt 0 % Sonderbestand).
function ermittleRaenge(werte) {
  const sortierteIndizes = werte.map((_, i) => i).sort((a, b) => werte[a] - werte[b]);
  const raenge = new Array(werte.length);
  let i = 0;
  while (i < sortierteIndizes.length) {
    let j = i;
    while (j + 1 < sortierteIndizes.length && werte[sortierteIndizes[j + 1]] === werte[sortierteIndizes[i]]) j += 1;
    const durchschnittsRang = (i + j) / 2 + 1;
    for (let k = i; k <= j; k += 1) raenge[sortierteIndizes[k]] = durchschnittsRang;
    i = j + 1;
  }
  return raenge;
}

// Pearson-Korrelation über beliebige Zahlenpaare - dient hier als Baustein
// für spearman() (Pearson der RÄNGE), wird selbst NICHT mehr als
// angezeigter Wert verwendet (Auftrag: "Spearman... nicht Pearson").
function lineareKorrelation(paare) {
  const n = paare.length;
  if (n < 2) return null;
  const mittelX = d3.mean(paare, (p) => p[0]);
  const mittelY = d3.mean(paare, (p) => p[1]);
  let zaehler = 0;
  let nennerX = 0;
  let nennerY = 0;
  paare.forEach(([x, y]) => {
    zaehler += (x - mittelX) * (y - mittelY);
    nennerX += (x - mittelX) ** 2;
    nennerY += (y - mittelY) ** 2;
  });
  const nenner = Math.sqrt(nennerX * nennerY);
  return nenner === 0 ? null : zaehler / nenner;
}

function spearman(paare) {
  if (paare.length < 2) return null;
  const xRaenge = ermittleRaenge(paare.map((p) => p[0]));
  const yRaenge = ermittleRaenge(paare.map((p) => p[1]));
  return lineareKorrelation(xRaenge.map((r, i) => [r, yRaenge[i]]));
}

function berechneMatrix(records) {
  return VERMOEGENS_VARIABLEN.map((zeilenVar) => VERMOEGENS_VARIABLEN.map((spaltenVar) => {
    const paare = records
      .map((r) => [wertFuerVariable(r, zeilenVar), wertFuerVariable(r, spaltenVar)])
      .filter(([x, y]) => x !== null && y !== null);
    return { r: spearman(paare.map(([x, y]) => [x, y])), n: paare.length };
  }));
}

function farbeFuerR(r) {
  if (r === null) return '#eeeeee';
  const basis = r >= 0 ? FARBE_POSITIV : FARBE_NEGATIV;
  return d3.color(basis).copy({ opacity: Math.max(Math.abs(r), 0.08) });
}

function baueLegende(container) {
  const legende = document.createElement('div');
  legende.style.fontSize = '11px';
  legende.style.margin = '0 0 6px 0';
  legende.innerHTML = `<span style="color:${FARBE_NEGATIV}">■ negativ</span> &nbsp;
    <span style="color:#999">■ kein Zusammenhang</span> &nbsp;
    <span style="color:${FARBE_POSITIV}">■ positiv</span> (Deckkraft = Stärke |r|, Spearman-Rangkorrelation) &nbsp;
    <span style="color:var(--text-muted)">Zelle anklicken für Streudiagramm</span>`;
  container.appendChild(legende);
}

// ---- Streudiagramm-Overlay (Punkt 2) ----------------------------------
// Lazy erzeugtes Singleton im <body>, dasselbe Architekturmuster wie
// js/utils/lightbox.js (siehe Dateikopf-Kommentar), aber bewusst lokal in
// diesem Modul gehalten statt nach js/utils/ ausgelagert (nur ein
// Aufrufer). z-index 900: BEWUSST unter dem geteilten Tooltips z-index 1000
// (js/utils/tooltip.js) gewählt, damit der Hover-Tooltip auf den
// Streudiagramm-Punkten selbst sichtbar über diesem Overlay erscheint -
// live geprüft, ohne diese Anpassung läge der Tooltip unter dem Overlay
// (Stacking-Reihenfolge folgt dem höheren z-index, nicht der DOM-Reihenfolge).
const SCATTER_OVERLAY_ID = 'korrelationsmatrix-scatter-overlay';
const SCATTER_STYLE_ID = 'korrelationsmatrix-scatter-style';

let scatterOverlay = null;
let scatterTitel = null;
let scatterInhalt = null;
let scatterSchliessenBtn = null;
let scatterFokusVorOeffnen = null;

function fuegeScatterStyleEinmaligEin() {
  if (document.getElementById(SCATTER_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SCATTER_STYLE_ID;
  style.textContent = `
    #${SCATTER_OVERLAY_ID} { position: fixed; inset: 0; background: rgba(20,20,20,.55); z-index: 900;
      display: none; align-items: center; justify-content: center; padding: var(--space-5); }
    #${SCATTER_OVERLAY_ID}.offen { display: flex; }
    #${SCATTER_OVERLAY_ID} .scatter-box { background: var(--surface); border-radius: var(--radius);
      box-shadow: var(--shadow); padding: var(--space-4); max-width: min(92vw, 640px); max-height: 90vh;
      overflow: auto; position: relative; }
    #${SCATTER_OVERLAY_ID} .scatter-titel { margin: 0 var(--space-5) var(--space-2) 0; font-size: var(--fs-md); }
    #${SCATTER_OVERLAY_ID} .scatter-schliessen { position: absolute; top: var(--space-2); right: var(--space-2);
      min-width: 44px; min-height: 44px; border: none; background: none; font-size: 1.5rem; line-height: 1; cursor: pointer; }
    #${SCATTER_OVERLAY_ID} .scatter-schliessen:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    #${SCATTER_OVERLAY_ID} .scatter-zusammenfassung { font-size: var(--fs-sm); color: var(--text-muted); margin: 4px 0 0; }
    .scatter-punkt { fill: ${FARBE_POSITIV}; fill-opacity: .6; }
    .scatter-punkt:hover, .scatter-punkt:focus-visible { fill-opacity: 1; outline: none; }
  `;
  document.head.appendChild(style);
}

function schliesseScatterplot() {
  if (!scatterOverlay || !scatterOverlay.classList.contains('offen')) return;
  scatterOverlay.classList.remove('offen');
  scatterInhalt.innerHTML = '';
  if (scatterFokusVorOeffnen && document.body.contains(scatterFokusVorOeffnen)) {
    scatterFokusVorOeffnen.focus();
  }
  scatterFokusVorOeffnen = null;
}

function holeOderErstelleScatterOverlay() {
  if (scatterOverlay) return scatterOverlay;
  fuegeScatterStyleEinmaligEin();

  scatterOverlay = document.createElement('div');
  scatterOverlay.id = SCATTER_OVERLAY_ID;
  scatterOverlay.setAttribute('role', 'dialog');
  scatterOverlay.setAttribute('aria-modal', 'true');
  scatterOverlay.setAttribute('aria-label', 'Streudiagramm zweier Kennzahlen');
  scatterOverlay.setAttribute('tabindex', '-1');
  scatterOverlay.addEventListener('click', (event) => { if (event.target === scatterOverlay) schliesseScatterplot(); });
  scatterOverlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); schliesseScatterplot(); }
  });

  const box = document.createElement('div');
  box.className = 'scatter-box';

  scatterSchliessenBtn = document.createElement('button');
  scatterSchliessenBtn.type = 'button';
  scatterSchliessenBtn.className = 'scatter-schliessen';
  scatterSchliessenBtn.setAttribute('aria-label', 'Streudiagramm schließen');
  scatterSchliessenBtn.textContent = '×';
  scatterSchliessenBtn.addEventListener('click', schliesseScatterplot);

  scatterTitel = document.createElement('h3');
  scatterTitel.className = 'scatter-titel';

  scatterInhalt = document.createElement('div');

  box.append(scatterSchliessenBtn, scatterTitel, scatterInhalt);
  scatterOverlay.appendChild(box);
  document.body.appendChild(scatterOverlay);
  return scatterOverlay;
}

function zeichneScatterInhalt(zeilenVar, spaltenVar, records) {
  const paare = records
    .map((r) => ({ record: r, x: wertFuerVariable(r, spaltenVar), y: wertFuerVariable(r, zeilenVar) }))
    .filter((p) => p.x !== null && p.y !== null);
  const rWert = spearman(paare.map((p) => [p.x, p.y]));

  scatterTitel.textContent = `${spaltenVar.label} × ${zeilenVar.label}`;
  scatterInhalt.innerHTML = '';

  const breite = 480;
  const hoehe = 360;
  const rand = { oben: 10, unten: 46, links: 74, rechts: 14 };

  const svg = d3.select(scatterInhalt).append('svg')
    .attr('width', breite).attr('height', hoehe)
    .attr('viewBox', `0 0 ${breite} ${hoehe}`)
    .attr('role', 'img')
    .attr('aria-label', `Streudiagramm ${spaltenVar.label} gegen ${zeilenVar.label}`);
  svg.append('desc').text(
    `Jeder Punkt ist eine Person. Spearman-Rangkorrelation r = ${rWert === null ? 'nicht berechenbar' : rWert.toFixed(2)}, N = ${paare.length}.`
  );

  const xSkala = baueSkalaFuerVariable(spaltenVar, d3.extent(paare, (p) => p.x), [rand.links, breite - rand.rechts]);
  const ySkala = baueSkalaFuerVariable(zeilenVar, d3.extent(paare, (p) => p.y), [hoehe - rand.unten, rand.oben]);

  svg.append('g').attr('transform', `translate(0,${hoehe - rand.unten})`).call(d3.axisBottom(xSkala).ticks(5));
  svg.append('g').attr('transform', `translate(${rand.links},0)`).call(d3.axisLeft(ySkala).ticks(5));

  svg.append('text')
    .attr('x', (rand.links + breite - rand.rechts) / 2).attr('y', hoehe - 6)
    .attr('text-anchor', 'middle').attr('font-size', 11).text(spaltenVar.label);
  svg.append('text')
    .attr('transform', `translate(16,${(rand.oben + hoehe - rand.unten) / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle').attr('font-size', 11).text(zeilenVar.label);

  svg.append('g')
    .selectAll('circle.scatter-punkt')
    .data(paare)
    .join('circle')
    .attr('class', 'scatter-punkt')
    .attr('tabindex', 0)
    .attr('cx', (p) => xSkala(p.x)).attr('cy', (p) => ySkala(p.y)).attr('r', 4)
    .on('mouseenter focus', function (event, p) {
      zeigeTooltip(`${p.record['Name'] || '(ohne Name)'}\n${spaltenVar.label}: ${p.x}\n${zeilenVar.label}: ${p.y}`, this, scatterInhalt);
    })
    .on('mouseleave blur', () => versteckeTooltip());

  const zusammenfassung = document.createElement('p');
  zusammenfassung.className = 'scatter-zusammenfassung';
  zusammenfassung.textContent = `Spearman r = ${rWert === null ? 'nicht berechenbar' : rWert.toFixed(2)}, N = ${paare.length}`;
  scatterInhalt.appendChild(zusammenfassung);
}

function oeffneScatterplot(zeilenVar, spaltenVar, records) {
  holeOderErstelleScatterOverlay();
  scatterFokusVorOeffnen = document.activeElement;
  zeichneScatterInhalt(zeilenVar, spaltenVar, records);
  scatterOverlay.classList.add('offen');
  scatterSchliessenBtn.focus();
}
// ------------------------------------------------------------------------

function zeichneKorrelationsmatrix() {
  const { container, records } = instanz;
  container.innerHTML = '';

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.style.cssText = 'display:flex;justify-content:flex-end;';
  container.appendChild(werkzeugleiste);
  instanz.infoButton = erzeugeInfoButton(werkzeugleiste, { text: INFO_TEXT, ariaLabel: 'Erklärung zur Korrelationsmatrix' });

  baueLegende(container);

  const matrix = berechneMatrix(records);
  const breite = VERMOEGENS_VARIABLEN.length * ZELLENGROESSE + RAND.links + RAND.rechts;
  const hoehe = VERMOEGENS_VARIABLEN.length * ZELLENGROESSE + RAND.oben + RAND.unten;

  const svg = d3.select(container).append('svg')
    .attr('width', breite).attr('height', hoehe)
    .attr('viewBox', `0 0 ${breite} ${hoehe}`)
    .attr('role', 'img')
    .attr('aria-label', 'Korrelationsmatrix der Vermögenskennzahlen aus den Verlassenschaftsinventaren');

  svg.append('desc').text(
    'Spearman-Rangkorrelation zwischen acht numerischen Vermögenskennzahlen je Person. ' +
    'Blau: positiver Zusammenhang, Rot: negativer Zusammenhang, Deckkraft nach Stärke. ' +
    'Klick auf eine Zelle öffnet ein Streudiagramm der beiden Variablen.'
  );

  VERMOEGENS_VARIABLEN.forEach((variable, i) => {
    svg.append('text')
      .attr('x', RAND.links - 6).attr('y', RAND.oben + i * ZELLENGROESSE + ZELLENGROESSE / 2)
      .attr('text-anchor', 'end').attr('dominant-baseline', 'middle').attr('font-size', 11)
      .text(variable.label);
    svg.append('text')
      .attr('transform', `translate(${RAND.links + i * ZELLENGROESSE + ZELLENGROESSE / 2},${RAND.oben - 8}) rotate(-40)`)
      .attr('text-anchor', 'start').attr('font-size', 11)
      .text(variable.label);
  });

  const zellenDaten = [];
  VERMOEGENS_VARIABLEN.forEach((zeilenVar, i) => {
    VERMOEGENS_VARIABLEN.forEach((spaltenVar, j) => {
      zellenDaten.push({ i, j, zeilenVar, spaltenVar, ...matrix[i][j] });
    });
  });

  const aktiviere = (d) => {
    if (d.r === null) return;
    oeffneScatterplot(d.zeilenVar, d.spaltenVar, records);
  };

  const zellen = svg.append('g')
    .selectAll('rect.korrelation-zelle')
    .data(zellenDaten)
    .join('rect')
    .attr('class', 'korrelation-zelle')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => `${d.zeilenVar.label} × ${d.spaltenVar.label}, Streudiagramm öffnen`)
    .attr('x', (d) => RAND.links + d.j * ZELLENGROESSE)
    .attr('y', (d) => RAND.oben + d.i * ZELLENGROESSE)
    .attr('width', ZELLENGROESSE - 1).attr('height', ZELLENGROESSE - 1)
    .attr('fill', (d) => farbeFuerR(d.r))
    .style('cursor', (d) => (d.r === null ? 'default' : 'pointer'));

  zellen
    .on('mouseenter focus', function (event, d) {
      const rText = d.r === null ? 'nicht berechenbar' : d.r.toFixed(2);
      zeigeTooltip(`${d.zeilenVar.label} × ${d.spaltenVar.label}\nSpearman r = ${rText}\nN = ${d.n}`, this, container);
    })
    .on('mouseleave blur', () => versteckeTooltip())
    .on('click', (event, d) => aktiviere(d))
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        aktiviere(d);
      }
    });

  svg.append('g')
    .selectAll('text.korrelation-wert')
    .data(zellenDaten)
    .join('text')
    .attr('class', 'korrelation-wert')
    .attr('x', (d) => RAND.links + d.j * ZELLENGROESSE + ZELLENGROESSE / 2)
    .attr('y', (d) => RAND.oben + d.i * ZELLENGROESSE + ZELLENGROESSE / 2)
    .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle').attr('font-size', 11)
    .attr('fill', (d) => (Math.abs(d.r || 0) > 0.5 ? '#fff' : '#111'))
    .style('pointer-events', 'none')
    .text((d) => (d.r === null ? '–' : d.r.toFixed(2)));
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  instanz = { container, records: data, options: { width: null, height: null, ...options } };
  zeichneKorrelationsmatrix();
}

// Feste Rastergröße nach Anzahl Variablen, nicht nach Containerbreite (8x8-Matrix
// bleibt bei jeder Fenstergröße gleich lesbar) - resize() tut hier bewusst nichts.
export function resize() {}

export function destroy() {
  if (!instanz) return;
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
