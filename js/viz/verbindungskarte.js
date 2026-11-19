// js/viz/verbindungskarte.js – Ansicht „Verbindungskarte“
// Zweck: Orte, die in derselben Urkunde gemeinsam genannt werden (Ko-Nennung). In Ruhe nur die Orte (Größe nach Zahl
//   der Urkunden); Hover, Fokus oder Klick zeigt die Verbindungen dieses einen Ortes als Bögen.
// Eingabe: `data` = urkunden.csv (orte, signatur); Orte namensbasiert über utils/urkundenOrte.js (orte.csv mit lat/lon).
// Schnittstelle: render(container, data, options), resize(neueOptionen), destroy() wie alle Ansichten (docs/SCHEMA.md).
// Abhängigkeiten: Leaflet 1.9 (global), D3 v7, utils/statischeKarte.js (Karte und SVG-Ebene), utils/urkundenOrte.js,
//   utils/sidebar.js, utils/tooltip.js, utils/infoButton.js.
// Bedienung: Orte per Tab erreichbar; Klick hält die Hervorhebung fest und öffnet die Urkunden des Ortes in der
//   Seitenleiste, ein zweiter Klick oder Klick auf die Karte löst sie. Bei offener Seitenleiste sind Werkzeugleiste und
//   Attribution ausgeblendet. Das SVG trägt eine Beschreibung aus dem Infotext.
// Hintergrund (frühere Formen, Lehren zur Stapelung): docs/MODULNOTIZEN.md, Abschnitt verbindungskarte.js.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { ladeOrtsVerzeichnis } from '../utils/urkundenOrte.js';
import { baueStatischeKarte, projiziere, erzeugeUeberlagerungsSvg } from '../utils/statischeKarte.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { beschreibeSvgAusInfotext } from '../utils/svgBeschreibung.js';
import { markiereHell } from '../utils/abdunkeln.js'; // Nachbesserung 3, Punkt 4
import { markiereSvg, mitUnvollstaendigHinweis } from '../utils/vollstaendigkeit.js';
import { infotextFuerModul } from '../core/archivKonfiguration.js';
import { baueSidebarGeruest, fuegeSidebarStyleEin, schliesseSidebar, zeigeUrkundenSidebar } from '../utils/sidebar.js';

// AUFTRAG "Info-Button für die 6 bleibenden Module": Text wörtlich übernommen.

const LINIEN_FARBE = '#2c4a6e'; // Tintenblau der Seite (seit 2026-10-28, vorher #1a4d8f)

let instanz = null; // { container, records, options, karte } – eine aktive Verbindungskarte pro Modul-Ladung

// Ermittelt für eine Urkunde die eindeutigen, TATSÄCHLICH AUFLÖSBAREN
// Knoten-Namen (Punkt 2, siehe docs/MODULNOTIZEN.md: nicht auflösbare Namen
// werden verworfen, nicht durch einen Sammelknoten ersetzt).
function ermittleKnoten(record, ortsVerzeichnis) {
  const orteListe = Array.isArray(record.orte) ? record.orte : (record.orte ? [record.orte] : []);
  const knoten = new Set();
  orteListe.forEach((name) => {
    if (ortsVerzeichnis.has(name)) knoten.add(name);
  });
  return Array.from(knoten);
}

function baueVerbindungen(records, ortsVerzeichnis) {
  const paare = new Map();

  records.forEach((record) => {
    const knoten = ermittleKnoten(record, ortsVerzeichnis);
    if (knoten.length < 2) return;
    for (let i = 0; i < knoten.length; i += 1) {
      for (let j = i + 1; j < knoten.length; j += 1) {
        const schluessel = [knoten[i], knoten[j]].sort().join('|||');
        if (!paare.has(schluessel)) {
          paare.set(schluessel, { a: knoten[i], b: knoten[j], anzahl: 0, unsicherAnzahl: 0 });
        }
        const paar = paare.get(schluessel);
        paar.anzahl += 1;
        if (record.orte_unsicher) paar.unsicherAnzahl += 1;
      }
    }
  });

  return Array.from(paare.values());
}

// Punkt 2 (siehe docs/MODULNOTIZEN.md): Name -> alle Urkunden-Records, deren
// `orte`-Feld diesen Ort auflösbar enthält (dieselbe ermittleKnoten()-
// Auflösung wie baueVerbindungen() oben, hier aber unabhängig davon, ob die
// Urkunde tatsächlich eine Verbindung bildet - "die Urkunden, die zu diesem
// Knoten beitragen" ist umfassender als "die Urkunden, die eine Verbindung
// bilden").
function baueOrtRecordsMap(records, ortsVerzeichnis) {
  const map = new Map();
  records.forEach((record) => {
    ermittleKnoten(record, ortsVerzeichnis).forEach((name) => {
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(record);
    });
  });
  return map;
}

function positionVonKnoten(name, ortsVerzeichnis, karte) {
  const ort = ortsVerzeichnis.get(name);
  return projiziere(karte, ort.lat, ort.lon);
}

function baueVerbindungTooltip(paar) {
  const zeilen = [`${paar.a} ↔ ${paar.b}`, `${paar.anzahl} gemeinsame Nennung(en)`];
  if (paar.unsicherAnzahl > 0) zeilen.push(`davon ${paar.unsicherAnzahl} mit unsicherer Ortsangabe`);
  return zeilen.join('\n');
}

// Dasselbe "bei jedem Redraw neu einfügen"-Muster wie karte.js' fuegeStyleEin()
// - container.innerHTML='' unten leert auch ein zuvor eingefügtes <style>.
function fuegeStyleEin(container) {
  const style = document.createElement('style');
  // Dieselbe Leaflet-Pane-Überdeckung wie karte.js (siehe dortiger
  // Kommentar) - position:relative + z-index:900 hebt das Popover sicher
  // über Leaflets internen Panes (max. z-index 700) hervor.
  style.textContent = `
    .verbindungskarte-werkzeugleiste { display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: var(--space-3); margin-bottom: 6px; position: relative; z-index: 900; }
    .verbindungskarte-werkzeugleiste { justify-content: flex-end; }
    /* gedämpfte Kartenkacheln: css/components.css (gemeinsam mit der Bipartite Flow Map) */
    .orts-knoten { cursor: pointer; fill: #6b6358; fill-opacity: .55; stroke: #f7f5f0; stroke-width: .8;
      transition: fill-opacity .15s, fill .15s; }
    .orts-knoten.tritt-zurueck { fill-opacity: .15; }
    .orts-knoten.ist-verbunden { fill: ${LINIEN_FARBE}; fill-opacity: .6; }
    .orts-knoten.ist-aktiv { fill: ${LINIEN_FARBE}; fill-opacity: 1; stroke: #ffffff; stroke-width: 2;
      filter: drop-shadow(0 0 5px rgba(44, 74, 110, .55)); }
    .orts-knoten:focus { outline: none; }
    .orts-knoten:focus-visible { stroke: #e0b429; stroke-width: 3; }
    .verbindungskarte-boegen path.verbindung { fill: none; stroke: ${LINIEN_FARBE}; stroke-linecap: round; pointer-events: stroke; }
    .verbindungskarte-name { font: 600 13px var(--font-ui); fill: #1a1a1a; paint-order: stroke; stroke: #f7f5f0; stroke-width: 3.5px; }
    /* Punkt 2 (siehe Dateikopf-Kommentar): dieselbe :has()-Ausblendung wie
       karte.js (Kleinauftrag "Klick auf Ort-Marker öffnet Sidebar") - jetzt
       auch hier nötig, seit Leaflets eigene Steuerelemente aktiv sind. */
    .verbindungskarte-viz-container:has(> .bestand-sidebar.offen) .verbindungskarte-werkzeugleiste,
    .verbindungskarte-viz-container:has(> .bestand-sidebar.offen) .leaflet-bottom.leaflet-right {
      visibility: hidden;
    }
  `;
  container.appendChild(style);
}

// Länge begründet (über 100 Zeilen, Masterprompt §13.3; Nachbesserung 8): zeichnet die ganze Ansicht in einem Durchgang (Maße, Skalen, Achsen, Elemente, Beschriftung, Interaktion); die Schritte teilen viele lokale Größen, eine Zerlegung bräuchte lange Parameterlisten ohne Gewinn an Lesbarkeit.
async function zeichneVerbindungskarte() {
  const { container, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  // Info-Button wird bei jedem Redraw zerstört/neu erzeugt, siehe karte.js'
  // identisches Muster/identische Begründung.
  if (instanz.infoButton) instanz.infoButton.destroy();
  // Auftrag 15, Punkt 1: die Leaflet-Karte des vorigen Aufbaus abbauen (sonst blieben ihre Listener an window hängen)
  if (instanz.karte) { instanz.karte.remove(); instanz.karte = null; }
  container.innerHTML = '';
  fuegeStyleEin(container);

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'verbindungskarte-werkzeugleiste';
  container.appendChild(werkzeugleiste);

  const breite = options.width || container.clientWidth || 900;
  const hoehe = options.height || 600;
  const mapDiv = document.createElement('div');
  mapDiv.style.width = `${breite}px`;
  mapDiv.style.height = `${hoehe}px`;
  mapDiv.style.position = 'relative';
  container.appendChild(mapDiv);

  // Punkt 2 (siehe docs/MODULNOTIZEN.md): Sidebar IMMER aufgebaut (wie
  // karte.js' Marker-Klick-Sidebar), geschlossen bis zum ersten Node-Klick.
  fuegeSidebarStyleEin(container);
  instanz.sidebar = baueSidebarGeruest(container);
  instanz.sidebar.schliessenBtn.addEventListener('click', () => schliesseSidebar(instanz.sidebar, mapDiv));

  const ortsVerzeichnis = await ladeOrtsVerzeichnis();
  if (!instanz) return; // destroy() kann während des await aufgerufen worden sein

  const ortRecordsMap = baueOrtRecordsMap(records, ortsVerzeichnis);
  const paare = baueVerbindungen(records, ortsVerzeichnis);
  const beteiligteOrte = Array.from(new Set(paare.flatMap((p) => [p.a, p.b])))
    .map((name) => ({ name, ...ortsVerzeichnis.get(name) }));

  const karte = baueStatischeKarte(mapDiv, beteiligteOrte);
  instanz.karte = karte;

  const svgUeberlagerung = erzeugeUeberlagerungsSvg(mapDiv, breite, hoehe, {
    ariaLabel: 'Verbindungskarte: gemeinsam genannte Orte in Urkunden'
  });
  beschreibeSvgAusInfotext(svgUeberlagerung.node(), 'verbindungskarte'); // Nachbesserung 6, Punkt 12: Beschreibung aus dem Info-Text

  // Seit 2026-10-28 (Wunsch des Autors) nach dem Prinzip der Karte hinter der Bilderwand: in Ruhe nur die Orte
  // (Kreisgröße = Zahl der Urkunden, zurückhaltend), keine Linien. Zeigt man auf einen Ort (oder fokussiert
  // ihn per Tastatur), tritt er hervor - mit Hof und Namen -, nur SEINE Verbindungen erscheinen als dünne,
  // leicht gebogene Bögen (Deckkraft nach Zahl gemeinsamer Urkunden), die verbundenen Orte leuchten dezent
  // mit, alle übrigen treten zurück. Klick hält die Hervorhebung fest und öffnet die Sidebar mit den Urkunden
  // des Ortes; ein zweiter Klick oder ein Klick auf die freie Karte löst sie. Der frühere Regler
  // „Verbindungsstärke“ entfällt (es ist ohnehin nur ein Ort mit seinen Verbindungen sichtbar).
  const verbindungenJeOrt = new Map();
  paare.forEach((p) => {
    [[p.a, p.b], [p.b, p.a]].forEach(([von, nach]) => {
      if (!verbindungenJeOrt.has(von)) verbindungenJeOrt.set(von, []);
      verbindungenJeOrt.get(von).push({ ort: nach, paar: p });
    });
  });
  const maxAnzahl = d3.max(paare, (p) => p.anzahl) || 1;
  const maxUrkunden = d3.max(beteiligteOrte, (o) => (ortRecordsMap.get(o.name) || []).length) || 1;
  const radius = (o) => 2.5 + 7 * Math.sqrt((ortRecordsMap.get(o.name) || []).length / maxUrkunden);
  const deckkraftBogen = (p) => 0.2 + 0.65 * Math.sqrt(p.anzahl / maxAnzahl);
  const breiteBogen = (p) => 0.9 + 1.6 * Math.sqrt(p.anzahl / maxAnzahl);

  infotextFuerModul('verbindungskarte').then((cfg) => {
    if (!instanz || !cfg || !werkzeugleiste.isConnected) return;
    instanz.infoButton = erzeugeInfoButton(werkzeugleiste, cfg);
  });

  const boegenGruppe = svgUeberlagerung.append('g').attr('class', 'verbindungskarte-boegen');
  const ortsGruppe = svgUeberlagerung.append('g').style('pointer-events', 'auto');
  // Nachbesserung 6, Punkt 1: Ebene für die Kopie des aktiven Ortes (statt raise(), siehe zeichneHervorhebung())
  const obenaufGruppe = svgUeberlagerung.append('g').attr('aria-hidden', 'true').style('pointer-events', 'none');
  const namenGruppe = svgUeberlagerung.append('g').attr('class', 'verbindungskarte-namen').attr('pointer-events', 'none');
  function zeichneObenauf() {
    obenaufGruppe.selectAll('*').remove();
    const aktiv = fokus || instanz.fixiert;
    const original = aktiv ? ortsKnoten.filter((o) => o.name === aktiv).node() : null;
    if (!original) return;
    const kopie = original.cloneNode(false);
    ['tabindex', 'role', 'aria-label', 'aria-describedby', 'data-unvollstaendig'].forEach((a) => kopie.removeAttribute(a));
    obenaufGruppe.node().appendChild(kopie);
  }

  const ortsKnoten = ortsGruppe
    .selectAll('circle.orts-knoten')
    .data(beteiligteOrte)
    .join('circle')
    .attr('class', 'orts-knoten')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (o) => `${o.name}: ${(ortRecordsMap.get(o.name) || []).length} Urkunden, gemeinsam genannt mit ${(verbindungenJeOrt.get(o.name) || []).length} Orten`)
    .attr('r', radius)
    .call((a) => markiereSvg(a, (o) => o.ortRecord)); // Nachbesserung 3, Punkt 3

  let fokus = null; // Name des hervorgehobenen Ortes (Zeigen/Tastatur)
  // Auftrag 15, Punkt 1: der per Klick festgehaltene Ort steht in instanz.fixiert (nicht in dieser Zeichnung), damit er
  // einen Neuaufbau (σ-Knopf, Fenstergröße) übersteht. Fällt der Ort weg, wird die Auswahl aufgehoben.
  if (instanz.fixiert && !beteiligteOrte.some((o) => o.name === instanz.fixiert)) instanz.fixiert = null;

  const pos = (name) => positionVonKnoten(name, ortsVerzeichnis, karte);
  // leicht gebogener Bogen, immer gleich herum gekrümmt (unabhängig von der Richtung, wie in der Bilderwand)
  function bogenPfad(p) {
    const [a, b] = [p.a, p.b].sort();
    const pa = pos(a);
    const pb = pos(b);
    const mx = (pa.x + pb.x) / 2;
    const my = (pa.y + pb.y) / 2;
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    return `M${pa.x},${pa.y}Q${mx - dy * 0.2},${my + dx * 0.2} ${pb.x},${pb.y}`;
  }

  function zeichneHervorhebung() {
    const aktiv = fokus || instanz.fixiert;
    const verbunden = new Map((verbindungenJeOrt.get(aktiv) || []).map((v) => [v.ort, v.paar]));
    ortsKnoten
      .classed('ist-aktiv', (o) => o.name === aktiv)
      .classed('ist-verbunden', (o) => verbunden.has(o.name))
      .classed('tritt-zurueck', (o) => Boolean(aktiv) && o.name !== aktiv && !verbunden.has(o.name));
    // Nachbesserung 6, Punkt 1 (Befund 6.3), Ursache der fehlenden Tastaturbedienung: Hier stand raise(). Es hängte den
    // aktiven Kreis im DOM ans Ende und nahm ihm damit den Fokus, den er gerade bekommen hatte (focus() wirkungslos, per
    // Tab kein Ort erreichbar). Jetzt bleibt die Reihenfolge im DOM (= Tab-Reihenfolge) unverändert; obenauf liegt eine
    // nicht fokussierbare, für Hilfsmittel verborgene Kopie des aktiven Kreises.
    zeichneObenauf();

    const boegen = aktiv ? [...verbunden.values()] : [];
    const pfade = boegenGruppe.selectAll('path.verbindung').data(boegen, (p) => `${p.a}|${p.b}`).join('path')
      .attr('class', 'verbindung')
      .attr('d', bogenPfad)
      .attr('stroke-width', breiteBogen)
      .attr('stroke-opacity', deckkraftBogen)
      .attr('stroke-dasharray', (p) => (zeigeUnsicherheit && p.unsicherAnzahl > 0 ? '4,3' : null))
      .call((a) => markiereHell(a, (p) => zeigeUnsicherheit && p.unsicherAnzahl > 0)); // Nachbesserung 3, Punkt 4
    pfade.selectAll('title').remove();
    pfade.append('title').text(baueVerbindungTooltip);

    namenGruppe.selectAll('text').data(aktiv ? [aktiv] : []).join('text')
      .attr('class', 'verbindungskarte-name')
      .text((name) => name);
    aktualisierePositionen();
  }

  function aktualisierePositionen() {
    ortsKnoten
      .attr('cx', (o) => projiziere(karte, o.lat, o.lon).x)
      .attr('cy', (o) => projiziere(karte, o.lat, o.lon).y);
    boegenGruppe.selectAll('path.verbindung').attr('d', bogenPfad);
    namenGruppe.selectAll('text')
      .attr('x', (name) => pos(name).x + radius({ name }) + 7)
      .attr('y', (name) => pos(name).y + 4);
    zeichneObenauf(); // Nachbesserung 6, Punkt 1: Kopie folgt der Kartenbewegung
  }

  const zeigeOrtTooltip = (element, o) => {
    const anzahlUrkunden = (ortRecordsMap.get(o.name) || []).length;
    const anzahlOrte = (verbindungenJeOrt.get(o.name) || []).length;
    zeigeTooltip(mitUnvollstaendigHinweis(o.ortRecord, `${o.name}\n${anzahlUrkunden} Urkunde(n), gemeinsam genannt mit ${anzahlOrte} Ort(en)`), element, mapDiv);
  };
  ortsKnoten.each(function verdrahte(o) {
    const element = this;
    element.addEventListener('mouseenter', () => { fokus = o.name; zeigeOrtTooltip(element, o); zeichneHervorhebung(); });
    element.addEventListener('focus', () => { fokus = o.name; zeigeOrtTooltip(element, o); zeichneHervorhebung(); });
    element.addEventListener('mouseleave', () => { fokus = null; versteckeTooltip(); zeichneHervorhebung(); });
    element.addEventListener('blur', () => { fokus = null; versteckeTooltip(); zeichneHervorhebung(); });
    const aktiviere = (event) => {
      event?.stopPropagation();
      if (instanz.fixiert === o.name) {
        instanz.fixiert = null;
        schliesseSidebar(instanz.sidebar, mapDiv);
      } else {
        instanz.fixiert = o.name;
        zeigeUrkundenSidebar(instanz.sidebar, o.name, ortRecordsMap.get(o.name) || []);
      }
      zeichneHervorhebung();
    };
    element.addEventListener('click', aktiviere);
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        aktiviere(event);
      }
    });
  });
  // Klick auf die freie Karte oder Schließen der Sidebar löst die festgehaltene Hervorhebung
  karte.on('click', () => { if (instanz.fixiert) { instanz.fixiert = null; zeichneHervorhebung(); } });
  instanz.sidebar.schliessenBtn.addEventListener('click', () => { instanz.fixiert = null; zeichneHervorhebung(); });

  // Neuaufbau mit bestehender Auswahl: Sidebar wieder öffnen, der Fokus bleibt, wo er war (z. B. auf dem σ-Knopf)
  if (instanz.fixiert) {
    const vorherFokus = document.activeElement;
    zeigeUrkundenSidebar(instanz.sidebar, instanz.fixiert, ortRecordsMap.get(instanz.fixiert) || []);
    if (vorherFokus && vorherFokus !== document.body && vorherFokus.isConnected) vorherFokus.focus({ preventScroll: true });
  }
  zeichneHervorhebung();
  karte.on('zoom move', aktualisierePositionen);
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  // Punkt 2 (siehe docs/MODULNOTIZEN.md): stabile Klasse auf `container`
  // selbst (übersteht container.innerHTML=''), Anker für die
  // `:has()`-Sichtbarkeitsregel in fuegeStyleEin() - dasselbe Muster wie
  // karte.js' `karte-viz-container`.
  container.classList.add('verbindungskarte-viz-container');
  instanz = { container, records: data, options: { showUncertainty: true, width: null, height: null, ...options }, karte: null, infoButton: null, sidebar: null, fixiert: null };
  zeichneVerbindungskarte();
}

// resize() zeichnet weiterhin komplett neu statt nur die Kartengröße zu
// invalidieren - ein einfaches invalidateSize() würde weder eine geänderte
// mapDiv-Breite/-Höhe (options.width/height) noch showUncertainty-bedingte
// Strich-Änderungen an den Linien nachziehen. Setzt dabei bewusst auch
// Zoom-/Pan-Stand zurück (fitBounds() in baueStatischeKarte()) - Nicht-Ziel
// dieses Auftrags, den Kartenausschnitt über einen Redraw hinweg zu merken.
export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneVerbindungskarte();
}

export function destroy() {
  if (!instanz) return;
  if (instanz.infoButton) instanz.infoButton.destroy();
  if (instanz.karte) {
    instanz.karte.remove();
  }
  instanz.container.innerHTML = '';
  instanz.container.classList.remove('verbindungskarte-viz-container');
  instanz = null;
}
