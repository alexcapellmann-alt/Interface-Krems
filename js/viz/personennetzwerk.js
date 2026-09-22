// js/viz/personennetzwerk.js
// AUFTRAG "Bipartiter Graph → Urkunden (Sankey), Personennetzwerk →
// Bürgerbuch, plus Trellis/Bump-Chart-Korrekturen", Punkt 2 - UMZUG von
// Urkunden zu Bürgerbuch UND inhaltlicher Umbau: zeigt jetzt
// Bürgschaftsbeziehungen (data/buergerbuch.csv' `buergen_id`) statt
// Ko-Nennungen in Urkunden. Die Kraft-Simulations-Bausteine (Abschnitt 13/
// 10-Regeln: requestAnimationFrame-basiert über d3.forceSimulation(),
// prefers-reduced-motion-Vorberechnung, simulation.stop() in destroy())
// bleiben inhaltlich UNVERÄNDERT aus der bisherigen Urkunden-Fassung
// übernommen (siehe zeichneStatisch()/starteAnimierteSimulation() unten,
// nur um eine per-Knoten-Farbe statt einer festen KNOTEN_FARBE erweitert).
//
// Datengrundlage: js/utils/buergerbuchZeit.js' baueBuergschaftsNetzwerk()
// (hierher verschoben aus dem vormaligen Bürger-Bürge-`bipartiterGraph.js`,
// siehe dortiger Kommentar) statt js/utils/urkundenPersonen.js'
// baueKoNennungsNetzwerk() - beide liefern dieselbe {knoten, paare}-Form,
// der Rest dieses Moduls kannte strukturell schon immer nur diese Form, kein
// weiterer Umbau der Zeichenlogik nötig.
//
// Skalen-Einschränkung (Auftrag, wörtlich: "540 Verbindungen insgesamt zu
// dicht"): anders als bei Urkunden (1351 Knoten/4083 Kanten wurden dort
// bewusst ALLE gleichzeitig gezeigt, siehe Alt-Fassung) hier ZWEI Modi:
// - Übersicht (Standard, keine Person ausgewählt): nur die
//   TOP_HUB_ANZAHL=15 am dichtesten vernetzten Personen PLUS deren direkte
//   Nachbarn (live geprüft: 76 von 762 Personen, 68 von 540 Beziehungen -
//   eine reine "Top-N ohne Nachbarn"-Auswahl hätte dagegen nur 3 von 68
//   Kanten gezeigt, weil die meisten Bürgen sich untereinander NICHT
//   gegenseitig verbürgen, sondern für unterschiedliche, seltener genannte
//   Personen - "Top-N + deren Nachbarn" ist die informativere kompakte
//   Übersicht).
// - Ego-Netzwerk (nach Auswahl einer Person, per Klick auf einen Knoten ODER
//   per Namenssuche): die ausgewählte Person plus ALLE Personen, mit denen
//   sie direkt in einer Bürgschaftsbeziehung steht, plus jede Kante
//   zwischen zwei Personen dieser Menge (echtes induziertes Ego-Netzwerk,
//   nicht nur Stern-Kanten zur Mitte).
//
// Farbe: Wirtschaftssektor der Person (Auftrag Punkt 2) über
// buergerbuchZeit.js' baueSektorFarbSkala() - dieselbe Farbskala wie
// trellis.js/bumpChart.js (Akzeptanzkriterium "konsistent").

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { baueBuergschaftsNetzwerk, baueNamensverzeichnis, baueSektorFarbSkala } from '../utils/buergerbuchZeit.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';

const TOP_HUB_ANZAHL = 15;
const VORBERECHNUNGS_TICKS = 300;

const INFO_TEXT = `Dieses Personennetzwerk zeigt Bürgschaftsbeziehungen aus dem Bürgerbuch: ein Knoten ist eine Person (unabhängig davon, ob sie hier als aufgenommener Bürger, als Bürge oder als beides vorkommt), eine Kante eine Bürgschaftsbeziehung. Die Farbe zeigt den Wirtschaftssektor der Person.

Da alle 540 Beziehungen gleichzeitig unlesbar wären, zeigt die Übersicht ohne Auswahl nur die am dichtesten vernetzten Personen und ihre direkten Verbindungen.

Klick auf eine Person (oder die Suche oben) zeigt stattdessen deren vollständiges direktes Beziehungsnetz - „Übersicht" oben kehrt zurück.`;

let instanz = null; // { container, wurzel, records, options, infoButton, simulation, egoId, netzwerk, namenNachId } – ein aktives Netzwerk pro Modul-Ladung

function baueBuergschaftsTooltip(paar) {
  const zeilen = [`${paar.a.name} ↔ ${paar.b.name}`, `${paar.anzahl} Bürgschaftsbeziehung(en)`];
  if (paar.unsicherAnzahl > 0) zeilen.push(`davon ${paar.unsicherAnzahl} mit unsicherer Zuordnung`);
  return zeilen.join('\n');
}

// Übersicht (siehe Dateikopf-Kommentar): Top-N nach Grad PLUS deren direkte
// Nachbarn, samt jeder Kante innerhalb dieser Menge.
function waehleUebersichtsAusschnitt(knoten, paare) {
  const gradProId = new Map();
  paare.forEach((p) => {
    gradProId.set(p.a.id, (gradProId.get(p.a.id) || 0) + p.anzahl);
    gradProId.set(p.b.id, (gradProId.get(p.b.id) || 0) + p.anzahl);
  });
  const hubs = [...gradProId.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_HUB_ANZAHL).map(([id]) => id);
  const hubSet = new Set(hubs);
  const relevantePaare = paare.filter((p) => hubSet.has(p.a.id) || hubSet.has(p.b.id));
  const relevanteIds = new Set(relevantePaare.flatMap((p) => [p.a.id, p.b.id]));
  const relevanteKnoten = knoten.filter((k) => relevanteIds.has(k.id));
  return { knoten: relevanteKnoten, paare: relevantePaare, gesamtKnotenAnzahl: knoten.length, gesamtPaarAnzahl: paare.length };
}

// Ego-Netzwerk (siehe Dateikopf-Kommentar): egoId plus direkte Nachbarn,
// PLUS jede Kante zwischen zwei Personen dieser Menge (nicht nur Kanten zur
// Mitte) - ein echtes induziertes Ego-Netzwerk.
function waehleEgoAusschnitt(knoten, paare, egoId) {
  const nachbarIds = new Set([egoId]);
  paare.forEach((p) => {
    if (p.a.id === egoId) nachbarIds.add(p.b.id);
    if (p.b.id === egoId) nachbarIds.add(p.a.id);
  });
  const relevantePaare = paare.filter((p) => nachbarIds.has(p.a.id) && nachbarIds.has(p.b.id));
  const relevanteKnoten = knoten.filter((k) => nachbarIds.has(k.id));
  return { knoten: relevanteKnoten, paare: relevantePaare };
}

function zeichneStatisch(svg, knoten, paare, radius, farbeFn, mapDiv, zeigeUnsicherheit) {
  svg.selectAll('line.verbindung').data(paare).join('line')
    .attr('class', 'verbindung')
    .attr('x1', (p) => p.source.x).attr('y1', (p) => p.source.y)
    .attr('x2', (p) => p.target.x).attr('y2', (p) => p.target.y)
    .attr('stroke', '#999').attr('stroke-opacity', 0.4)
    .attr('stroke-dasharray', (p) => (zeigeUnsicherheit && p.unsicherAnzahl > 0 ? '4,3' : null));

  const knotenAuswahl = svg.selectAll('circle.person-knoten').data(knoten).join('circle')
    .attr('class', 'person-knoten')
    .attr('tabindex', 0)
    .attr('cx', (d) => d.x).attr('cy', (d) => d.y)
    .attr('r', (d) => radius(d.anzahl))
    .attr('fill', farbeFn);
  knotenAuswahl
    .on('mouseenter focus', function (event, d) { zeigeTooltip(`${d.name}\n${d.sektor}\n${d.anzahl} Beziehung(en)`, this, mapDiv); })
    .on('mouseleave blur', () => versteckeTooltip())
    .on('click', (event, d) => waehlePerson(d.id))
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); waehlePerson(d.id); }
    });
}

function starteAnimierteSimulation(svg, knoten, paare, radius, farbeFn, breite, hoehe, mapDiv, zeigeUnsicherheit) {
  const linien = svg.append('g').selectAll('line.verbindung').data(paare).join('line')
    .attr('class', 'verbindung')
    .attr('stroke', '#999').attr('stroke-opacity', 0.4)
    .attr('stroke-dasharray', (p) => (zeigeUnsicherheit && p.unsicherAnzahl > 0 ? '4,3' : null));
  linien
    .on('mouseenter', function (event, p) { zeigeTooltip(baueBuergschaftsTooltip(p), this, mapDiv); })
    .on('mouseleave', () => versteckeTooltip());

  const knotenAuswahl = svg.append('g').selectAll('circle.person-knoten').data(knoten).join('circle')
    .attr('class', 'person-knoten')
    .attr('tabindex', 0)
    .attr('r', (d) => radius(d.anzahl))
    .attr('fill', farbeFn);
  knotenAuswahl
    .on('mouseenter focus', function (event, d) { zeigeTooltip(`${d.name}\n${d.sektor}\n${d.anzahl} Beziehung(en)`, this, mapDiv); })
    .on('mouseleave blur', () => versteckeTooltip())
    .on('click', (event, d) => waehlePerson(d.id))
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); waehlePerson(d.id); }
    });

  const simulation = d3.forceSimulation(knoten)
    .force('link', d3.forceLink(paare).id((d) => d.id).distance(45).strength(0.2))
    .force('charge', d3.forceManyBody().strength(-60))
    .force('center', d3.forceCenter(breite / 2, hoehe / 2))
    .force('collide', d3.forceCollide((d) => radius(d.anzahl) + 2))
    .alpha(0.5);

  simulation.on('tick', () => {
    linien.attr('x1', (p) => p.source.x).attr('y1', (p) => p.source.y)
      .attr('x2', (p) => p.target.x).attr('y2', (p) => p.target.y);
    knotenAuswahl.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
  });

  return simulation;
}

function radiusSkala(maxAnzahl) {
  return d3.scaleSqrt().domain([1, maxAnzahl]).range([5, 22]);
}

function waehlePerson(id) {
  instanz.egoId = id;
  zeichneNetzwerk();
}

function baueWerkzeugleiste(container) {
  const { namenNachId, egoId } = instanz;
  const leiste = document.createElement('div');
  leiste.className = 'pnw-werkzeugleiste';

  const suchFeld = document.createElement('label');
  suchFeld.className = 'pnw-suchfeld';
  suchFeld.append('Person: ');
  const suchInput = document.createElement('input');
  suchInput.type = 'text';
  suchInput.setAttribute('list', 'pnw-personen-liste');
  suchInput.placeholder = 'Name eingeben …';
  if (egoId) suchInput.value = namenNachId.get(egoId) || '';
  const datalist = document.createElement('datalist');
  datalist.id = 'pnw-personen-liste';
  const nameZuId = new Map();
  [...namenNachId.entries()].sort((a, b) => a[1].localeCompare(b[1], 'de')).forEach(([id, name]) => {
    nameZuId.set(name, id);
    const option = document.createElement('option');
    option.value = name;
    datalist.appendChild(option);
  });
  suchInput.addEventListener('change', () => {
    const gefundeneId = nameZuId.get(suchInput.value.trim());
    if (gefundeneId) waehlePerson(gefundeneId);
  });
  suchFeld.append(suchInput, datalist);

  const uebersichtBtn = document.createElement('button');
  uebersichtBtn.type = 'button';
  uebersichtBtn.className = 'pnw-uebersicht-btn';
  uebersichtBtn.textContent = '← Übersicht';
  uebersichtBtn.hidden = !egoId;
  uebersichtBtn.addEventListener('click', () => { instanz.egoId = null; zeichneNetzwerk(); });

  const infoContainer = document.createElement('div');
  infoContainer.className = 'pnw-werkzeugleiste-rechts';

  leiste.append(suchFeld, uebersichtBtn, infoContainer);
  container.appendChild(leiste);
  return infoContainer;
}

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .pnw-wurzel { display: flex; flex-direction: column; }
    .pnw-werkzeugleiste { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3);
      margin: 0 0 var(--space-3) 0; }
    .pnw-suchfeld { display: flex; align-items: center; gap: var(--space-1); font-size: var(--fs-sm); }
    .pnw-suchfeld input { font: inherit; min-height: 32px; }
    .pnw-uebersicht-btn { min-height: 32px; }
    .pnw-werkzeugleiste-rechts { margin-left: auto; }
    .pnw-hinweis { font-size: var(--fs-sm); color: var(--text-muted); margin: 0 0 var(--space-2) 0; }
    .person-knoten { cursor: pointer; }
    .person-knoten:focus-visible { outline: 3px solid var(--accent); outline-offset: 1px; }
  `;
  container.appendChild(style);
}

function zeichneNetzwerk() {
  const { container, wurzel, netzwerk, egoId, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  const farbeFuerSektor = instanz.farbeFuerSektor;

  if (instanz.simulation) { instanz.simulation.stop(); instanz.simulation = null; }
  if (instanz.infoButton) instanz.infoButton.destroy();
  wurzel.innerHTML = '';

  const infoContainer = baueWerkzeugleiste(wurzel);
  instanz.infoButton = erzeugeInfoButton(infoContainer, { text: INFO_TEXT, ariaLabel: 'Erklärung zum Personennetzwerk' });

  const ausschnitt = egoId
    ? waehleEgoAusschnitt(netzwerk.knoten, netzwerk.paare, egoId)
    : waehleUebersichtsAusschnitt(netzwerk.knoten, netzwerk.paare);

  const hinweis = document.createElement('p');
  hinweis.className = 'pnw-hinweis';
  hinweis.textContent = egoId
    ? `„${instanz.namenNachId.get(egoId)}": vollständiges direktes Beziehungsnetz (${ausschnitt.paare.length} Beziehung(en), ${ausschnitt.knoten.length} Person(en)).`
    : `Übersicht: die ${TOP_HUB_ANZAHL} am dichtesten vernetzten Personen und ihre direkten Beziehungen `
      + `(${ausschnitt.knoten.length} von ${ausschnitt.gesamtKnotenAnzahl} Personen, ${ausschnitt.paare.length} von ${ausschnitt.gesamtPaarAnzahl} Beziehungen).`;
  wurzel.appendChild(hinweis);

  // d3.forceLink() erwartet .source/.target (nicht .a/.b) - hier einmalig
  // ergänzt, bevor paare an forceLink() übergeben wird (identisch zur
  // Urkunden-Vorfassung dieses Moduls).
  ausschnitt.paare.forEach((p) => { p.source = p.a.id; p.target = p.b.id; });

  const breite = options.width || container.clientWidth || 900;
  const hoehe = options.height || 600;
  const maxAnzahl = d3.max(ausschnitt.knoten, (d) => d.anzahl) || 1;
  const radius = radiusSkala(maxAnzahl);
  const farbeFn = (d) => farbeFuerSektor(d.sektor);

  const mapDiv = document.createElement('div');
  wurzel.appendChild(mapDiv);
  const svg = d3.select(mapDiv).append('svg')
    .attr('width', breite).attr('height', hoehe)
    .attr('role', 'img')
    .attr('aria-label', 'Personennetzwerk der Bürgschaftsbeziehungen im Bürgerbuch');
  svg.append('desc').text(
    'Kraft-basiertes Netzwerk der Bürgschaftsbeziehungen aus dem Bürgerbuch, Knotenfarbe nach ' +
    'Wirtschaftssektor, Knotengröße nach Anzahl Beziehungen. Ohne Personenauswahl eine Übersicht ' +
    'der am dichtesten vernetzten Personen, nach Auswahl das vollständige direkte Beziehungsnetz ' +
    'dieser Person. Gestrichelte Kanten kennzeichnen Bürgschaften mit unsicherer Zuordnung.'
  );

  const bevorzugtReduzierteBewegung = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (bevorzugtReduzierteBewegung) {
    const simulation = d3.forceSimulation(ausschnitt.knoten)
      .force('link', d3.forceLink(ausschnitt.paare).id((d) => d.id).distance(45).strength(0.2))
      .force('charge', d3.forceManyBody().strength(-60))
      .force('center', d3.forceCenter(breite / 2, hoehe / 2))
      .force('collide', d3.forceCollide((d) => radius(d.anzahl) + 2))
      .stop();
    for (let i = 0; i < VORBERECHNUNGS_TICKS; i += 1) simulation.tick();
    zeichneStatisch(svg, ausschnitt.knoten, ausschnitt.paare, radius, farbeFn, mapDiv, zeigeUnsicherheit);
    instanz.simulation = null;
  } else {
    instanz.simulation = starteAnimierteSimulation(svg, ausschnitt.knoten, ausschnitt.paare, radius, farbeFn, breite, hoehe, mapDiv, zeigeUnsicherheit);
  }
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  container.innerHTML = '';
  fuegeStyleEin(container);

  const wurzel = document.createElement('div');
  wurzel.className = 'pnw-wurzel';
  container.appendChild(wurzel);

  instanz = {
    container,
    wurzel,
    records: data,
    options: { showUncertainty: true, width: null, height: null, ...options },
    infoButton: null,
    simulation: null,
    egoId: null,
    netzwerk: baueBuergschaftsNetzwerk(data),
    namenNachId: baueNamensverzeichnis(data),
    farbeFuerSektor: baueSektorFarbSkala(data)
  };
  zeichneNetzwerk();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneNetzwerk();
}

export function destroy() {
  if (!instanz) return;
  if (instanz.simulation) instanz.simulation.stop();
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
