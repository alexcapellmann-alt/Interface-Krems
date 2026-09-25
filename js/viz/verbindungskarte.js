// js/viz/verbindungskarte.js
// Verbindungskarte der Urkunden: Linien zwischen Orten, die in derselben Urkunde
// gemeinsam genannt werden (Ko-Nennung), Liniendicke nach Häufigkeit dieser
// Orts-Kombination. Modul-Interface siehe Abschnitt 5. Voraussetzung: Leaflet 1.9
// global geladen.
//
// Kartengrundlage über js/utils/statischeKarte.js.
//
// KORREKTUR (Auftrag "SVG-Overlay z-index setzen", siehe CHANGELOG): das
// SVG-Overlay wird jetzt über js/utils/statischeKarte.js' neue
// erzeugeUeberlagerungsSvg() gebaut statt selbst per `d3.select(mapDiv)
// .append('svg')...` - Root-Cause-Fund aus dem vorigen Diagnoseauftrag: ohne
// explizites z-index lag das Overlay dauerhaft UNTER Leaflets Kachel-Ebene
// (`.leaflet-map-pane`, z-index:400), sobald deren Kacheln tatsächlich
// geladen waren - die Linien verschwanden dadurch, sobald die Kacheln
// nachluden. Siehe dortiger Kommentar für die volle Herleitung.
//
// ERGÄNZUNGSAUFTRAG "Karten navigierbar machen, 'Nicht verortet'-Knoten
// entfernen":
//
// Punkt 1 (Zoom/Pan): js/utils/statischeKarte.js' baueStatischeKarte()
// liefert jetzt Standard-interaktives Leaflet (siehe dortiger Kommentar).
// Die Bildschirm-Positionen der Linien/Knoten (projiziere(), s.o.) gelten
// deshalb nur bis zur nächsten Kartenbewegung - aktualisierePositionen()
// (neu, unten) berechnet sie neu und wird über `karte.on('zoom move', ...)`
// bei JEDER Kartenbewegung erneut aufgerufen (nicht nur 'zoomend'/'moveend' -
// Auftrag wörtlich: "map.on('zoom'/'move', ...)-Events nutzen" - dadurch
// folgen die Linien der Karte flüssig, nicht erst nach Abschluss der Geste).
//
// Punkt 2 ("Nicht verortet"-Knoten entfernt): der frühere Sammelknoten für
// Urkunden mit nicht auflösbarem Ortsnamen ist ERSATZLOS entfernt (kein
// Platzhalter, keine Erwähnung, Auftrag wörtlich) - dieselbe Konvention wie
// karte.js' baueOrtsAggregation() ("nicht auflösbare Records werden direkt
// verworfen, nicht mehr gesammelt", siehe dortiger Kommentar). ermittleKnoten()
// nimmt jetzt NUR NOCH tatsächlich auflösbare Ortsnamen auf; eine Urkunde mit
// weniger als zwei auflösbaren Orten bildet dadurch (wie zuvor bei weniger
// als zwei GENANNTEN Orten) einfach keine Verbindung - ohne eigene Zählung
// dafür (die frühere `ohneVerbindungMoeglich`-Zählung hing ausschließlich am
// jetzt entfernten Knoten-Tooltip und ist mangels Anzeigeort mitentfernt,
// dieselbe Datenehrlichkeit-vs-Anzeigeort-Abwägung wie bei karte.js oben).
//
// AUFTRAG "Stärke-Regler (Verbindungskarte) + Node-Klick-Sidebar (beide
// Module)":
//
// Punkt 0 (Vorab-Diagnose, siehe Selbstauskunft im Chat): die Verbindungs-
// stärke (Anzahl gemeinsamer Urkunden je Linie) wurde bereits VOR diesem
// Auftrag über die LINIENSTÄRKE kodiert (`dickeSkala`/`stroke-width`, s.u.,
// unverändert) - Opazität ist fix (0.5), Farbe ist fix (LINIEN_FARBE). Der
// neue Stärke-Regler (Punkt 1) filtert zusätzlich zu dieser bestehenden
// Kodierung, ersetzt sie nicht.
//
// Punkt 1 (Stärke-Regler, NUR Verbindungskarte): staerkeSchwelle (lokaler
// Zustand je Redraw, wie der Zoom-/Pan-Stand bewusst nicht redraw-übergreifend
// gemerkt) blendet Linien mit `p.anzahl < staerkeSchwelle` per
// `style('display', 'none')` aus (nicht `remove()` - die D3-Datenbindung
// bleibt intakt, kein erneutes `.join()` bei jeder Reglerbewegung nötig) -
// aktualisiereSichtbarkeit() (neu, unten) macht das UND aktualisiert den
// Status-Text ("X von Y Verbindungen").
//
// Punkt 2 (Node-Klick-Sidebar, beide Module): Klick auf einen Orts-Knoten
// öffnet jetzt sidebar.js' etabliertes zeigeUrkundenSidebar() mit den
// tatsächlich zu diesem Ort beitragenden Urkunden (baueOrtRecordsMap(), neu,
// unten - ALLE Records, deren `orte`-Feld diesen Namen auflösbar enthält,
// nicht nur die, die zusätzlich eine Verbindung bilden) - dasselbe Muster
// wie karte.js' Marker-Klick (Kleinauftrag "Karte – Klick auf Ort-Marker
// öffnet Sidebar"). Die Sidebar wird jetzt IMMER aufgebaut (geschlossen,
// öffnet sich erst durch Klick) - da Leaflets eigene Steuerelemente
// (Zoom-Buttons/Attribution) seit dem vorigen Ergänzungsauftrag AKTIV sind
// (Punkt 1 dort), gilt dieselbe, dort bereits diagnostizierte
// Überlappungs-Problematik (Werkzeugleiste/Attribution liegen bei
// z-index:900 bzw. Leaflet-intern über der Sidebar, z-index:500) jetzt AUCH
// hier - dieselbe `:has()`-Ausblendung wie in karte.js proaktiv übernommen
// (s.u.), statt denselben, bereits einmal behobenen Fehler hier neu
// einzuführen.
//
// AUFTRAG "Verbindungskarte – verwaiste Orte ausblenden, Mindestschwelle 2,
// breitere Hover-Trefferfläche":
//
// Punkt 1 (verwaiste Orte ausblenden): aktualisiereSichtbarkeit() (s.u.)
// ermittelt zusätzlich zur Linien-Sichtbarkeit die Menge der Ortsnamen, die
// bei der aktuellen Schwelle noch an MINDESTENS EINER sichtbaren Linie
// beteiligt sind, und blendet `ortsKnoten` entsprechend mit aus.
//
// Punkt 2 (Mindestschwelle 2): Regler-`min`/Startwert jetzt 2 statt 1 -
// Einzelverbindungen (Stärke 1) werden dadurch NIE angezeigt, auch nicht im
// Ausgangszustand (Nicht-Ziel: die Datengrundlage/Paar-Berechnung selbst
// bleibt unverändert, nur die Anzeige-Schwelle).
//
// Punkt 3 (breitere Hover-Trefferfläche): eine zusätzliche, unsichtbare
// `line.verbindung-trefferflaeche` (transparent, stroke-width:14, KEINE
// Stärke-Kodierung) liegt direkt über jeder sichtbaren, dünnen Linie - sie
// trägt jetzt Tooltip-Listener/tabindex/Klick-Filterung, die sichtbare Linie
// selbst ist rein dekorativ (`pointer-events:none`, keine eigenen Listener
// mehr). Beide Selektionen werden aus DENSELBEN `paare`-Daten gebaut und bei
// jeder Positions-/Sichtbarkeits-Aktualisierung gemeinsam mitgeführt.
//
// KORREKTURAUFTRAG "Vier unabhängige Korrekturen", Punkt 2: Regler-
// Beschriftung "Mindeststärke:" -> "Verbindungsstärke" (Auftrag wörtlich).
// `reglerMin`/Startwert 2 bereits seit obigem Auftrag korrekt, unverändert.
// Der Status-Text ("X von Y Verbindungen", s. Punkt 1 oben) entfällt
// ersatzlos - Y (`paare.length`) zählte auch die seit `reglerMin=2` nie
// mehr erreichbaren Einzelverbindungen (Stärke 1) mit und war dadurch
// irreführend (Auftrag wörtlich). `reglerStatus`-Element samt CSS-Klasse
// entfernt, `aktualisiereSichtbarkeit()` setzt ihn nicht mehr.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { ladeOrtsVerzeichnis } from '../utils/urkundenOrte.js';
import { baueStatischeKarte, projiziere, erzeugeUeberlagerungsSvg } from '../utils/statischeKarte.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { baueSidebarGeruest, fuegeSidebarStyleEin, schliesseSidebar, zeigeUrkundenSidebar } from '../utils/sidebar.js';

// AUFTRAG "Info-Button für die 6 bleibenden Module": Text wörtlich übernommen.
const VERBINDUNGSKARTE_INFO_TEXT = `Diese Karte zeigt, welche Orte gemeinsam in derselben Urkunde genannt werden. Eine Verbindungslinie zwischen zwei Orten bedeutet, dass beide in mindestens einer gemeinsamen Urkunde vorkommen – nicht, dass zwischen ihnen eine tatsächliche Reise- oder Handelsbeziehung bestand.`;

const LINIEN_FARBE = '#1a4d8f';

let instanz = null; // { container, records, options, karte } – eine aktive Verbindungskarte pro Modul-Ladung

// Ermittelt für eine Urkunde die eindeutigen, TATSÄCHLICH AUFLÖSBAREN
// Knoten-Namen (Punkt 2, siehe Dateikopf-Kommentar: nicht auflösbare Namen
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

// Punkt 2 (siehe Dateikopf-Kommentar): Name -> alle Urkunden-Records, deren
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
    .verbindungskarte-regler-gruppe { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
    .verbindungskarte-regler-label { font-size: var(--fs-sm); color: var(--text-muted); }
    .verbindungskarte-regler-input { width: 160px; }
    .orts-knoten { cursor: pointer; }
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

async function zeichneVerbindungskarte() {
  const { container, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  // Info-Button wird bei jedem Redraw zerstört/neu erzeugt, siehe karte.js'
  // identisches Muster/identische Begründung.
  if (instanz.infoButton) instanz.infoButton.destroy();
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

  // Punkt 2 (siehe Dateikopf-Kommentar): Sidebar IMMER aufgebaut (wie
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

  const maxAnzahl = d3.max(paare, (p) => p.anzahl) || 1;
  const dickeSkala = d3.scaleSqrt().domain([1, maxAnzahl]).range([1.5, 8]);

  // Punkt 1 (siehe Dateikopf-Kommentar): Stärke-Regler - Bereich deckt die
  // tatsächliche Spannweite ab, links in der Werkzeugleiste (Info-Button
  // bleibt rechts, siehe fuegeStyleEin()s space-between).
  // KORREKTUR Punkt 2 (siehe Dateikopf-Kommentar): min/Startwert jetzt 2
  // (Math.max() schützt vor einem ungültigen min>max-Bereich, falls
  // maxAnzahl im Datensatz jemals unter 2 läge).
  const reglerMin = 2;
  const reglerMax = Math.max(maxAnzahl, reglerMin);
  const reglerGruppe = document.createElement('div');
  reglerGruppe.className = 'verbindungskarte-regler-gruppe';
  const reglerLabel = document.createElement('span');
  reglerLabel.className = 'verbindungskarte-regler-label';
  // KORREKTURAUFTRAG "Vier unabhängige Korrekturen", Punkt 2: Beschriftung
  // von "Mindeststärke:" auf "Verbindungsstärke" geändert (Auftrag wörtlich).
  reglerLabel.textContent = 'Verbindungsstärke';
  const reglerInput = document.createElement('input');
  reglerInput.type = 'range';
  reglerInput.className = 'verbindungskarte-regler-input';
  reglerInput.min = String(reglerMin);
  reglerInput.max = String(reglerMax);
  reglerInput.step = '1';
  reglerInput.value = String(reglerMin);
  reglerInput.setAttribute('aria-label', 'Mindestanzahl gemeinsamer Urkunden je Verbindung');
  reglerGruppe.append(reglerLabel, reglerInput);
  werkzeugleiste.appendChild(reglerGruppe);
  instanz.infoButton = erzeugeInfoButton(werkzeugleiste, { text: VERBINDUNGSKARTE_INFO_TEXT, ariaLabel: 'Erklärung zur Verbindungskarte' });

  const linienGruppe = svgUeberlagerung.append('g').style('pointer-events', 'auto');

  // Sichtbare, dünne Linie - reine Darstellung (Stärke-Kodierung, Punkt 0),
  // KEINE eigenen Interaktions-Listener mehr (Punkt 3, siehe Dateikopf-
  // Kommentar - die übernimmt jetzt die breitere Trefferfläche darunter).
  const linien = linienGruppe
    .selectAll('line.verbindung')
    .data(paare)
    .join('line')
    .attr('class', 'verbindung')
    .attr('pointer-events', 'none')
    .attr('stroke', LINIEN_FARBE)
    .attr('stroke-opacity', 0.5)
    .attr('stroke-width', (p) => dickeSkala(p.anzahl))
    .attr('stroke-dasharray', (p) => (zeigeUnsicherheit && p.unsicherAnzahl > 0 ? '4,3' : null));

  // KORREKTUR Punkt 3 (siehe Dateikopf-Kommentar): unsichtbare, deutlich
  // breitere Trefferfläche direkt über der sichtbaren Linie - trägt Tooltip/
  // Tastatur-Fokus, die sichtbare Linienstärke bleibt davon unberührt.
  const linienTrefferflaeche = linienGruppe
    .selectAll('line.verbindung-trefferflaeche')
    .data(paare)
    .join('line')
    .attr('class', 'verbindung-trefferflaeche')
    .attr('tabindex', 0)
    .attr('stroke', 'transparent')
    .attr('stroke-width', 14);
  linienTrefferflaeche
    .on('mouseenter focus', function (event, p) { zeigeTooltip(baueVerbindungTooltip(p), this, mapDiv); })
    .on('mouseleave blur', () => versteckeTooltip());

  const ortsKnoten = svgUeberlagerung.append('g').style('pointer-events', 'auto')
    .selectAll('circle.orts-knoten')
    .data(beteiligteOrte)
    .join('circle')
    .attr('class', 'orts-knoten')
    .attr('tabindex', 0)
    .attr('r', 4)
    .attr('fill', LINIEN_FARBE);
  // Punkt 2 (siehe Dateikopf-Kommentar, Auftrag "Stärke-Regler + Node-Klick-
  // Sidebar"): Klick/Enter/Leertaste öffnet die Urkunden-Sidebar für diesen
  // Ort - dieselbe Klick-plus-Tastatur-Äquivalenz wie karte.js' Marker-Klick.
  ortsKnoten.each(function (ort) {
    const element = this;
    const aktiviere = () => zeigeUrkundenSidebar(instanz.sidebar, ort.name, ortRecordsMap.get(ort.name) || []);
    element.addEventListener('click', aktiviere);
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        aktiviere();
      }
    });
  });

  // KORREKTUR Punkt 1 (siehe Dateikopf-Kommentar): blendet Linien (beide
  // Selektionen, sichtbar UND Trefferfläche) unterhalb der Mindeststärke aus
  // - UND blendet jeden Orts-Knoten aus, der bei der aktuellen Schwelle an
  // keiner sichtbaren Linie mehr beteiligt ist (verwaiste Orte).
  // style('display') statt erneutem .join(), die Datenbindung bleibt
  // unangetastet.
  // KORREKTURAUFTRAG "Vier unabhängige Korrekturen", Punkt 2: der
  // Status-Text ("X von Y Verbindungen") entfällt ersatzlos - die Gesamt-
  // zahl Y zählte auch die technisch seit reglerMin=2 nie mehr erreichbaren
  // Einzelverbindungen (Stärke 1) mit und war dadurch irreführend (Auftrag
  // wörtlich).
  function aktualisiereSichtbarkeit() {
    const schwelle = Number(reglerInput.value);
    const sichtbarePaare = paare.filter((p) => p.anzahl >= schwelle);
    const sichtbareOrte = new Set(sichtbarePaare.flatMap((p) => [p.a, p.b]));
    linien.style('display', (p) => (p.anzahl >= schwelle ? null : 'none'));
    linienTrefferflaeche.style('display', (p) => (p.anzahl >= schwelle ? null : 'none'));
    ortsKnoten.style('display', (o) => (sichtbareOrte.has(o.name) ? null : 'none'));
  }
  aktualisiereSichtbarkeit();
  reglerInput.addEventListener('input', aktualisiereSichtbarkeit);

  // Punkt 1 (Zoom/Pan, siehe Dateikopf-Kommentar): einmalig für den
  // Erstaufbau UND bei jeder Kartenbewegung erneut aufgerufen (s.u.) - hält
  // beide Linien-Selektionen und die Orts-Knoten mit der jeweils aktuellen
  // Zoom-/Pan-Position synchron.
  function aktualisierePositionen() {
    [linien, linienTrefferflaeche].forEach((selektion) => {
      selektion
        .attr('x1', (p) => positionVonKnoten(p.a, ortsVerzeichnis, karte).x)
        .attr('y1', (p) => positionVonKnoten(p.a, ortsVerzeichnis, karte).y)
        .attr('x2', (p) => positionVonKnoten(p.b, ortsVerzeichnis, karte).x)
        .attr('y2', (p) => positionVonKnoten(p.b, ortsVerzeichnis, karte).y);
    });
    ortsKnoten
      .attr('cx', (o) => projiziere(karte, o.lat, o.lon).x)
      .attr('cy', (o) => projiziere(karte, o.lat, o.lon).y);
  }
  aktualisierePositionen();
  karte.on('zoom move', aktualisierePositionen);
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  // Punkt 2 (siehe Dateikopf-Kommentar): stabile Klasse auf `container`
  // selbst (übersteht container.innerHTML=''), Anker für die
  // `:has()`-Sichtbarkeitsregel in fuegeStyleEin() - dasselbe Muster wie
  // karte.js' `karte-viz-container`.
  container.classList.add('verbindungskarte-viz-container');
  instanz = { container, records: data, options: { showUncertainty: true, width: null, height: null, ...options }, karte: null, infoButton: null, sidebar: null };
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
