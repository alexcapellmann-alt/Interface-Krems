// js/viz/bipartiteFlowMap.js – Ansicht „Karte Soziale Gruppen“
// Zweck: je Ort ein Kreisdiagramm, wie viele Urkunden den Ort mit Personen der vier sozialen Gruppen (Dynastie, Adel,
//   Klerus, Bürgertum) verbinden; Fläche proportional zur Summe.
// Eingabe: `data.urkunden` (urkunden.csv: orte, personen, personen_id, orte_unsicher), `data.personenliste`
//   (soziale_gruppe) und `data.familien` (Rückfall für Dynastie); Ortsverzeichnis orte.csv über ladeOrtsVerzeichnis().
// Schnittstelle: render(container, data, options), resize(neueOptionen), destroy() wie alle Ansichten (docs/SCHEMA.md).
// Abhängigkeiten: D3 v7, Leaflet 1.9 (global), js/utils/statischeKarte.js (Karte und SVG-Ebene), chordDiagramm.js
//   (GRUPPEN, ermittleGruppe), utils/urkundenOrte.js, utils/urkundenPersonen.js, utils/tooltip.js, utils/sidebar.js.
// Bedienung: Klick auf Segment oder Kreis öffnet die Urkunden in der Seitenleiste und vergrößert den Ort; Gruppen-Knöpfe
//   heben Orte hervor, an denen eine Gruppe dominiert. Tastaturfokus sichtbar, nach Mausklick kein Fokusrahmen.
// Achtung: Die SVG-Ebene ist ein Geschwister der Leaflet-Karte; flächige klickbare Elemente darüber schlucken Mausrad und
//   Ziehen. Hintergrund und Lehren: docs/MODULNOTIZEN.md, Abschnitt bipartiteFlowMap.js.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { ladeOrtsVerzeichnis } from '../utils/urkundenOrte.js';
import { ermittlePersonenDerUrkunde } from '../utils/urkundenPersonen.js';
import { baueStatischeKarte, projiziere, erzeugeUeberlagerungsSvg } from '../utils/statischeKarte.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { beschreibeSvgAusInfotext } from '../utils/svgBeschreibung.js';
import { markiereHell } from '../utils/abdunkeln.js'; // Nachbesserung 3, Punkt 4
import { infotextFuerModul } from '../core/archivKonfiguration.js';
import { baueSidebarGeruest, fuegeSidebarStyleEin, schliesseSidebar, zeigeUrkundenSidebar } from '../utils/sidebar.js';
// Wiederverwendung statt Neuimplementierung (unverändert seit dem
// Gruppen-Umbau, s.o.).
import { GRUPPEN, ermittleGruppe, uebernehmePersonenGruppen } from './chordDiagramm.js';

// AUFTRAG "Info-Button für die 6 bleibenden Module" - erste Textfassung
// nannte fälschlich Urkunden/Orte als die zwei Knotenseiten statt Orte/
// Kategorien (siehe CHANGELOG/PROJEKTLOG, Eintrag 19) - diese, vom
// Auftraggeber nach Rückmeldung korrigierte Fassung, wörtlich übernommen.
// KORREKTUR (aktueller Auftrag, s.o.): auf die neue Tortendiagramm-
// Darstellung inkl. Klick-Vergrößerung und Pluralitätsregel aktualisiert.

// Punkt 1 (siehe docs/MODULNOTIZEN.md): Mindestradius (Auftrag-Richtwert
// 4-5px) und Höchstradius der größenskalierten Kreise.
const MINDEST_RADIUS = 5;
const MAX_RADIUS = 26;
// Punkt 2 (siehe docs/MODULNOTIZEN.md): Vergrößerungsfaktor bei Klick
// (Auftrag-Richtwert 1,5-2).
const VERGROESSERUNGS_FAKTOR = 1.75;
// Zusätzlicher, unsichtbarer Rand der Trefferfläche über den sichtbaren
// Radius hinaus - komfortablere Klickfläche gerade bei MINDEST_RADIUS.
const TREFFERFLAECHE_ZUSATZ = 5;
// Punkt 3 (siehe docs/MODULNOTIZEN.md): derselbe Opazitäts-Wert wie im
// allerersten Balken-Vorgänger-Highlight dieses Moduls.
const KNOTEN_ABGEBLENDETE_OPAZITAET = 0.15;
// Punkt 1 (siehe docs/MODULNOTIZEN.md): neutrale Füllfarbe für Orte ohne
// jede Gruppen-Verbindung (kein Kreisdiagramm, keine erfundenen Anteile).
const NEUTRAL_FARBE = '#b7b7b7';

let instanz = null; // { container, urkundenRecords, familienRecords, options, karte, sidebar, infoButton, vergroessert, hervorhebung } - eine aktive Ansicht pro Modul-Ladung

// Farbe je sozialer Gruppe - direkt aus chordDiagramm.js' GRUPPEN, nicht neu
// definiert (Wiedererkennbarkeit).
function farbeFuerGruppe(gruppe) {
  return GRUPPEN.find((g) => g.schluessel === gruppe)?.farbe || '#999999';
}

function labelFuerGruppe(gruppe) {
  return GRUPPEN.find((g) => g.schluessel === gruppe)?.label || gruppe;
}

// Dieselbe "eindeutige Personen pro Urkunde"-Deduplizierung wie
// chordDiagramm.js' ermittleGruppenAnzahlProUrkunde() - hier nur die MENGE
// der beteiligten Gruppen gebraucht, nicht deren Anzahl.
function ermittleGruppenDerUrkunde(record, familienIds) {
  const personen = ermittlePersonenDerUrkunde(record);
  const eindeutig = Array.from(new Map(personen.map((p) => [p.id, p])).values());
  const gruppen = new Set();
  eindeutig.forEach((p) => gruppen.add(ermittleGruppe(p.name, p.id, familienIds)));
  return Array.from(gruppen);
}

// Punkt 1 (siehe docs/MODULNOTIZEN.md): EIN gemeinsamer Durchlauf baut
// - zaehlung: Ort -> Gruppe -> {anzahl, unsicherAnzahl} (für die
//   Segmentanteile UND den Tooltip)
// - ortRecords: Ort -> alle Urkunden mit auflösbarem Ort (für den
//   Cluster-/Trefferflächen-Klick, dieselbe Datenehrlichkeit wie die
//   vorige baueOrtRecordsMap() - unabhängig davon, ob die Urkunde
//   überhaupt eine klassifizierbare Person enthält)
// - ortGruppeRecords: `${ort}|||${gruppe}` -> Urkunden dieser Kombination
//   (für den Einzel-Segment-Klick)
// - gesamtProOrt: Ort -> Summe aller vier Gruppenwerte (Basis der
//   Radius-Skala UND der Pluralitätsregel)
// - maxGesamt: höchste Ortssumme, Basis der gemeinsamen Radius-Skala
function baueOrtDaten(records, ortsVerzeichnis, familienIds) {
  const zaehlung = new Map();
  const ortRecords = new Map();
  const ortGruppeRecords = new Map();

  records.forEach((record) => {
    const orteListe = Array.isArray(record.orte) ? record.orte : (record.orte ? [record.orte] : []);
    const orte = new Set(orteListe.filter((name) => ortsVerzeichnis.has(name)));
    if (orte.size === 0) return;

    orte.forEach((ort) => {
      if (!ortRecords.has(ort)) ortRecords.set(ort, []);
      ortRecords.get(ort).push(record);
    });

    const gruppenListe = ermittleGruppenDerUrkunde(record, familienIds);
    if (gruppenListe.length === 0) return;

    orte.forEach((ort) => {
      if (!zaehlung.has(ort)) zaehlung.set(ort, new Map());
      const proGruppe = zaehlung.get(ort);
      gruppenListe.forEach((gruppe) => {
        if (!proGruppe.has(gruppe)) proGruppe.set(gruppe, { anzahl: 0, unsicherAnzahl: 0 });
        const eintrag = proGruppe.get(gruppe);
        eintrag.anzahl += 1;
        if (record.orte_unsicher) eintrag.unsicherAnzahl += 1;

        const schluessel = `${ort}|||${gruppe}`;
        if (!ortGruppeRecords.has(schluessel)) ortGruppeRecords.set(schluessel, []);
        ortGruppeRecords.get(schluessel).push(record);
      });
    });
  });

  const gesamtProOrt = new Map();
  let maxGesamt = 0;
  zaehlung.forEach((proGruppe, ort) => {
    let summe = 0;
    proGruppe.forEach((eintrag) => { summe += eintrag.anzahl; });
    gesamtProOrt.set(ort, summe);
    maxGesamt = Math.max(maxGesamt, summe);
  });

  return { zaehlung, ortRecords, ortGruppeRecords, gesamtProOrt, maxGesamt };
}

// Ortsname + alle vier Gruppen-Zahlen, auch 0-Werte werden explizit gezeigt
// (Datenehrlichkeit - kein Weglassen).
function baueClusterTooltip(ortName, proGruppe) {
  const zeilen = [ortName];
  GRUPPEN.forEach((g) => {
    const anzahl = proGruppe.get(g.schluessel)?.anzahl || 0;
    zeilen.push(`${g.label}: ${anzahl}`);
  });
  return zeilen.join('\n');
}

// Punkt 3 (siehe docs/MODULNOTIZEN.md): Pluralitätsregel - eine Gruppe ist an
// einem Ort dominant, wenn ihr Wert dem Maximum der vier Gruppenwerte
// entspricht (Gleichstand: alle gleichauf führenden Gruppen gelten als
// dominant, s.o.). Orte ohne jede Verbindung sind für keine Gruppe dominant.
function istGruppeDominant(ortName, gruppe, zaehlung, gesamtProOrt) {
  const gesamt = gesamtProOrt.get(ortName) || 0;
  if (gesamt === 0) return false;
  const proGruppe = zaehlung.get(ortName);
  const maxWert = Math.max(...GRUPPEN.map((g) => proGruppe.get(g.schluessel)?.anzahl || 0));
  return (proGruppe.get(gruppe)?.anzahl || 0) === maxWert;
}

// Dasselbe Leaflet-Pane-Überdeckungsproblem wie karte.js/verbindungskarte.js
// (siehe dortiger Kommentar): position:relative + z-index:900 hebt das
// Popover sicher über Leaflets internen Panes (max. z-index 700) hervor.
function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .bipartiteflowmap-werkzeugleiste { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 6px; position: relative; z-index: 900; }
    .bipartiteflowmap-gruppen-buttons { display: flex; flex-wrap: wrap; gap: 6px; }
    .gruppe-button {
      display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
      border: 1px solid #ccc; border-radius: 4px; background: #fff; cursor: pointer;
      font-size: var(--fs-sm, 13px); line-height: 1.2;
    }
    .gruppe-button:hover { border-color: #888; }
    .gruppe-button[aria-pressed="true"] { background: var(--gruppe-farbe, #eee); border-color: var(--gruppe-farbe, #999); font-weight: 600; }
    .gruppe-button-punkt { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex: none; }
    .ort-cluster { cursor: pointer; }
    .ort-segment, .ort-neutral { cursor: pointer; }
    /* Punkt 2 (siehe Dateikopf-Kommentar): dieselbe :has()-Ausblendung wie
       verbindungskarte.js/karte.js - nötig, seit Leaflets eigene
       Steuerelemente aktiv sind. */
    .bipartiteflowmap-viz-container:has(> .bestand-sidebar.offen) .bipartiteflowmap-werkzeugleiste,
    .bipartiteflowmap-viz-container:has(> .bestand-sidebar.offen) .leaflet-bottom.leaflet-right {
      visibility: hidden;
    }
    /* KORREKTUR (Auftrag "Zoom, Performance, Sichtbarkeit, Fokus-Rahmen",
       Punkt 6, siehe Dateikopf-Kommentar): unterdrückt den blauen
       Standard-Browser-Fokusrahmen NUR bei Maus-Fokus (:focus, aber nicht
       :focus-visible) - Leaflets Kartencontainer (.leaflet-container, von
       Leaflet selbst mit tabindex versehen) sowie die eigenen
       fokussierbaren Orts-Cluster (tabindex="0") behalten den Rahmen bei
       Tastatur-Fokus (Tab-Navigation, :focus-visible) - keine pauschale
       outline:none, um die Tastatur-Zugänglichkeit nicht zu opfern. */
    .bipartiteflowmap-viz-container .leaflet-container:focus:not(:focus-visible),
    .bipartiteflowmap-viz-container .ort-cluster:focus:not(:focus-visible) {
      outline: none;
    }
  `;
  container.appendChild(style);
}

// Länge begründet (über 100 Zeilen, Masterprompt §13.3; Nachbesserung 8): zeichnet die ganze Ansicht in einem Durchgang (Maße, Skalen, Achsen, Elemente, Beschriftung, Interaktion); die Schritte teilen viele lokale Größen, eine Zerlegung bräuchte lange Parameterlisten ohne Gewinn an Lesbarkeit.
async function zeichneFlowMap() {
  const { container, urkundenRecords, familienRecords, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  // Info-Button wird bei jedem Redraw zerstört/neu erzeugt, siehe karte.js'
  // identisches Muster/identische Begründung.
  if (instanz.infoButton) instanz.infoButton.destroy();
  // Auftrag 15, Punkt 1: die Leaflet-Karte des vorigen Aufbaus abbauen (sonst blieben ihre Listener an window hängen)
  if (instanz.karte) { instanz.karte.remove(); instanz.karte = null; }
  container.innerHTML = '';
  fuegeStyleEin(container);
  // Punkt 2/3 (siehe docs/MODULNOTIZEN.md): Vergrößerung, Hervorhebung und Inhalt der Sidebar stehen in `instanz`.
  // Seit Auftrag 15 (Punkt 1) überstehen sie den Neuaufbau durch den σ-Knopf; resize() setzt sie nur bei anderen
  // Änderungen (Fenstergröße) zurück.

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'bipartiteflowmap-werkzeugleiste';
  container.appendChild(werkzeugleiste);

  // Punkt 3 (siehe docs/MODULNOTIZEN.md): vier Gruppen-Buttons, DOM-Reihenfolge
  // vor dem Info-Button - `justify-content:space-between` in fuegeStyleEin()
  // schiebt sie dadurch an den linken, den Info-Button an den rechten Rand.
  const gruppenLeiste = document.createElement('div');
  gruppenLeiste.className = 'bipartiteflowmap-gruppen-buttons';
  gruppenLeiste.setAttribute('role', 'group');
  gruppenLeiste.setAttribute('aria-label', 'Gruppe hervorheben');
  werkzeugleiste.appendChild(gruppenLeiste);
  const gruppenButtons = new Map();
  GRUPPEN.forEach((g) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gruppe-button';
    btn.setAttribute('aria-pressed', 'false');
    btn.style.setProperty('--gruppe-farbe', g.farbe);
    const punkt = document.createElement('span');
    punkt.className = 'gruppe-button-punkt';
    punkt.style.background = g.farbe;
    btn.appendChild(punkt);
    btn.appendChild(document.createTextNode(g.label));
    btn.addEventListener('click', () => {
      instanz.hervorhebung = instanz.hervorhebung === g.schluessel ? null : g.schluessel;
      aktualisiereHervorhebung();
    });
    gruppenLeiste.appendChild(btn);
    gruppenButtons.set(g.schluessel, btn);
  });

  infotextFuerModul('bipartiteFlowMap').then((cfg) => {
    if (!instanz || !cfg || !werkzeugleiste.isConnected) return;
    instanz.infoButton = erzeugeInfoButton(werkzeugleiste, cfg);
  });

  const breite = options.width || container.clientWidth || 900;
  const hoehe = options.height || 600;

  // Keine Kategoriespalte (seit dem vorigen Auftrag) - `plotWrapper` deckt
  // genau die Kartenbreite ab, `mapDiv` beginnt bei `left:0`.
  const plotWrapper = document.createElement('div');
  plotWrapper.className = 'bipartiteflowmap-plot';
  plotWrapper.style.position = 'relative';
  plotWrapper.style.width = `${breite}px`;
  plotWrapper.style.height = `${hoehe}px`;
  container.appendChild(plotWrapper);

  const mapDiv = document.createElement('div');
  mapDiv.style.position = 'absolute';
  mapDiv.style.left = '0';
  mapDiv.style.top = '0';
  mapDiv.style.width = `${breite}px`;
  mapDiv.style.height = `${hoehe}px`;
  // Erzwingt weiterhin einen eigenen CSS-Stapelkontext (siehe docs/MODULNOTIZEN.md
  //, Punkt 4 der "Überarbeitung") - Leaflets interne Panes bleiben
  // dadurch garantiert unter dem SVG-Overlay (z-index 450, Geschwister von
  // mapDiv).
  mapDiv.style.zIndex = '1';
  plotWrapper.appendChild(mapDiv);

  // Sidebar IMMER aufgebaut, geschlossen bis zum ersten Klick - dasselbe
  // Muster wie verbindungskarte.js.
  fuegeSidebarStyleEin(container);
  instanz.sidebar = baueSidebarGeruest(container);
  instanz.sidebar.schliessenBtn.addEventListener('click', () => { instanz.sidebarInhalt = null; schliesseSidebar(instanz.sidebar, mapDiv); });

  const ortsVerzeichnis = await ladeOrtsVerzeichnis();
  if (!instanz) return; // destroy() kann während des await aufgerufen worden sein

  const familienIds = new Set(familienRecords.map((r) => r.id));
  // Alle Orte aus dem Verzeichnis, keine Mindestschwelle - unverändert seit
  // dem vorigen Auftrag, unabhängig davon ob dieser Ort überhaupt eine
  // Gruppen-Verbindung hat.
  const alleOrte = Array.from(ortsVerzeichnis, ([name, werte]) => ({ name, ...werte }));
  const { zaehlung, ortRecords, ortGruppeRecords, gesamtProOrt, maxGesamt } = baueOrtDaten(urkundenRecords, ortsVerzeichnis, familienIds);

  // Punkt 1 (siehe docs/MODULNOTIZEN.md): Flächenkodierung (scaleSqrt) statt
  // linearer Radius-Kodierung, explizite Mindestgröße per Math.max().
  const radiusSkala = d3.scaleSqrt().domain([0, maxGesamt || 1]).range([0, MAX_RADIUS]);
  const radiusBasis = (ortName) => Math.max(radiusSkala(gesamtProOrt.get(ortName) || 0), MINDEST_RADIUS);
  // Punkt 2 (siehe docs/MODULNOTIZEN.md): tatsächlich gezeigter Radius -
  // berücksichtigt die Klick-Vergrößerung.
  const radiusAktuell = (ortName) => {
    const basis = radiusBasis(ortName);
    return instanz.vergroessert === ortName ? basis * VERGROESSERUNGS_FAKTOR : basis;
  };

  const pieGen = d3.pie().sort(null).value((d) => d.anzahl);
  const arcGen = d3.arc().innerRadius(0).outerRadius((d) => radiusAktuell(d.data.ort));

  const karte = baueStatischeKarte(mapDiv, alleOrte);
  instanz.karte = karte;

  // Leaflet-Steuerelement-Verlagerung samt eigenem `pointer-events:none`
  // (Root Cause s.o., unverändert seit den vorigen Aufträgen).
  const steuerElemente = mapDiv.querySelector('.leaflet-control-container');
  if (steuerElemente) {
    steuerElemente.style.position = 'absolute';
    steuerElemente.style.left = '0';
    steuerElemente.style.top = '0';
    steuerElemente.style.width = `${breite}px`;
    steuerElemente.style.height = `${hoehe}px`;
    steuerElemente.style.zIndex = '1000';
    steuerElemente.style.pointerEvents = 'none';
    plotWrapper.appendChild(steuerElemente);
  }

  const svgUeberlagerung = erzeugeUeberlagerungsSvg(plotWrapper, breite, hoehe, {
    ariaLabel: 'Karte: Orte als Tortendiagramme der sozialen Gruppen'
  }).attr('role', 'group'); // AUFTRAG D, Punkt 2 (nested-interactive): bedienbare Orts-Knoten (seit Nachbesserung 6 auch die Verbindungskarte)
  beschreibeSvgAusInfotext(svgUeberlagerung.node(), 'bipartiteFlowMap'); // Nachbesserung 6, Punkt 12: Beschreibung aus dem Info-Text

  // Ein Cluster (<g>) pro Ort, per `transform: translate(...)` an dessen
  // Kartenposition verankert - alle Kreiselemente sind relativ zum
  // Cluster-Ursprung (0,0 = Ortspunkt).
  const clusterGruppe = svgUeberlagerung.append('g').style('pointer-events', 'auto');
  const cluster = clusterGruppe.selectAll('g.ort-cluster')
    .data(alleOrte)
    .join('g')
    .attr('class', 'ort-cluster')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (o) => `Ort ${o.name}`);

  // Trefferfläche zuerst (unterste Ebene im Cluster) - unsichtbar, etwas
  // größer als der sichtbare Kreis für eine komfortable Klickfläche gerade
  // bei MINDEST_RADIUS. Wird unten von aktualisiereRadien() mitgeführt.
  cluster.append('circle')
    .attr('class', 'ort-trefferflaeche')
    .attr('r', (o) => radiusAktuell(o.name) + TREFFERFLAECHE_ZUSATZ)
    .attr('fill', 'transparent');

  // Punkt 1 (siehe docs/MODULNOTIZEN.md): pro Ort entweder vier Pie-Segmente
  // (gesamt>0) oder ein neutraler Vollkreis (gesamt===0, keine erfundenen
  // Anteile).
  cluster.each(function (ort) {
    const g = d3.select(this);
    const gesamt = gesamtProOrt.get(ort.name) || 0;
    if (gesamt > 0) {
      const daten = GRUPPEN.map((grp) => {
        const eintrag = zaehlung.get(ort.name)?.get(grp.schluessel);
        return {
          ort: ort.name,
          gruppe: grp.schluessel,
          anzahl: eintrag?.anzahl || 0,
          unsicherAnzahl: eintrag?.unsicherAnzahl || 0
        };
      });
      g.selectAll('path.ort-segment')
        .data(pieGen(daten))
        .join('path')
        .attr('class', 'ort-segment')
        .attr('d', arcGen)
        .attr('fill', (d) => farbeFuerGruppe(d.data.gruppe))
        .attr('stroke', (d) => (zeigeUnsicherheit && d.data.unsicherAnzahl > 0 ? '#c0392b' : '#fff'))
        .attr('stroke-width', (d) => (zeigeUnsicherheit && d.data.unsicherAnzahl > 0 ? 1.5 : 0.5))
        .call((a) => markiereHell(a, (d) => zeigeUnsicherheit && d.data.unsicherAnzahl > 0)); // Nachbesserung 3, Punkt 4
    } else {
      g.append('circle')
        .attr('class', 'ort-neutral')
        .attr('r', radiusBasis(ort.name))
        .attr('fill', NEUTRAL_FARBE)
        .attr('fill-opacity', 0.7);
    }
  });

  cluster
    .on('mouseenter focus', function (event, o) {
      zeigeTooltip(baueClusterTooltip(o.name, zaehlung.get(o.name) || new Map()), this, mapDiv);
    })
    .on('mouseleave blur', () => versteckeTooltip());

  // Punkt 2 (siehe docs/MODULNOTIZEN.md): Klick auf den Rest-Cluster
  // (Trefferfläche oder Neutralkreis, nicht von einem Segment via
  // stopPropagation abgefangen) vergrößert den Knoten UND öffnet die
  // Sidebar mit ALLEN Urkunden dieses Ortes - unverändertes Sidebar-
  // Verhalten aus dem vorigen Auftrag, nur um die Vergrößerung ergänzt.
  cluster.each(function (ort) {
    const element = this;
    const aktiviere = () => {
      instanz.vergroessert = ort.name;
      aktualisiereRadien();
      instanz.sidebarInhalt = { ort: ort.name };
      zeigeUrkundenSidebar(instanz.sidebar, ort.name, ortRecords.get(ort.name) || []);
    };
    element.addEventListener('click', aktiviere);
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        aktiviere();
      }
    });
  });

  // Punkt 2 (siehe docs/MODULNOTIZEN.md): Klick auf ein einzelnes Segment
  // vergrößert denselben Knoten UND zeigt nur die Urkunden DIESER Gruppe an
  // diesem Ort - event.stopPropagation() verhindert, dass zusätzlich der
  // Rest-Cluster-Klick (oben, mit ALLEN Urkunden des Ortes) mitfeuert.
  cluster.selectAll('path.ort-segment').on('click', (event, d) => {
    event.stopPropagation();
    instanz.vergroessert = d.data.ort;
    aktualisiereRadien();
    const schluessel = `${d.data.ort}|||${d.data.gruppe}`;
    instanz.sidebarInhalt = { ort: d.data.ort, gruppe: d.data.gruppe };
    zeigeUrkundenSidebar(instanz.sidebar, `${d.data.ort} – ${labelFuerGruppe(d.data.gruppe)}`, ortGruppeRecords.get(schluessel) || []);
  });

  instanz.cluster = cluster;

  // Punkt 2 (siehe docs/MODULNOTIZEN.md): schreibt den aktuellen Radius
  // (Basis oder vergrößert) auf Trefferfläche, Segmente und Neutralkreise
  // jedes Clusters neu.
  function aktualisiereRadien() {
    cluster.select('circle.ort-trefferflaeche').attr('r', (o) => radiusAktuell(o.name) + TREFFERFLAECHE_ZUSATZ);
    cluster.selectAll('path.ort-segment').attr('d', arcGen);
    cluster.selectAll('circle.ort-neutral').attr('r', (o) => radiusAktuell(o.name));
  }

  // Punkt 2 (siehe docs/MODULNOTIZEN.md): Klick auf freie Kartenfläche setzt
  // die Vergrößerung zurück, ohne die Sidebar zu beeinflussen - Leaflets
  // eigenes `click`-Ereignis auf `mapDiv`, das ein Klick auf ein
  // Cluster-Element (Geschwister-Teilbaum) strukturell nie erreicht (s.o.).
  karte.on('click', () => {
    if (instanz.vergroessert) {
      instanz.vergroessert = null;
      aktualisiereRadien();
    }
  });

  // Punkt 3 (siehe docs/MODULNOTIZEN.md): volle Deckkraft + `.raise()` für
  // Orte, an denen die aktive Gruppe dominant ist, gedämpfte Opazität für
  // alle übrigen - unverändert (Opazität 1) ohne aktive Gruppe.
  function aktualisiereHervorhebung() {
    gruppenButtons.forEach((btn, schluessel) => {
      btn.setAttribute('aria-pressed', String(instanz.hervorhebung === schluessel));
    });
    if (!instanz.hervorhebung) {
      cluster.style('opacity', 1);
      return;
    }
    const gruppe = instanz.hervorhebung;
    cluster.style('opacity', (o) => (istGruppeDominant(o.name, gruppe, zaehlung, gesamtProOrt) ? 1 : KNOTEN_ABGEBLENDETE_OPAZITAET));
    cluster.filter((o) => istGruppeDominant(o.name, gruppe, zaehlung, gesamtProOrt)).raise();
  }

  // Zoom/Pan (Nicht-Ziel, unverändert): jedes Cluster hängt von der
  // Kartenposition seines Ortes ab - bei jeder Kartenbewegung neu
  // projiziert.
  function aktualisierePositionen() {
    cluster.attr('transform', (o) => {
      const p = projiziere(karte, o.lat, o.lon);
      return `translate(${p.x},${p.y})`;
    });
  }
  aktualisierePositionen();
  karte.on('zoom move', aktualisierePositionen);

  // Auftrag 15, Punkt 1: Zustand aus `instanz` nach einem Neuaufbau wieder anwenden; der Fokus bleibt, wo er war
  if (instanz.vergroessert && !ortRecords.has(instanz.vergroessert)) instanz.vergroessert = null;
  aktualisiereRadien();
  aktualisiereHervorhebung();
  const inhalt = instanz.sidebarInhalt;
  if (inhalt) {
    const vorherFokus = document.activeElement;
    if (inhalt.gruppe) {
      zeigeUrkundenSidebar(instanz.sidebar, `${inhalt.ort} – ${labelFuerGruppe(inhalt.gruppe)}`, ortGruppeRecords.get(`${inhalt.ort}|||${inhalt.gruppe}`) || []);
    } else {
      zeigeUrkundenSidebar(instanz.sidebar, inhalt.ort, ortRecords.get(inhalt.ort) || []);
    }
    if (vorherFokus && vorherFokus !== document.body && vorherFokus.isConnected) vorherFokus.focus({ preventScroll: true });
  }
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  // Stabile Klasse auf `container` selbst, Anker für die
  // `:has()`-Sichtbarkeitsregel in fuegeStyleEin() - dasselbe Muster wie
  // karte.js/verbindungskarte.js.
  container.classList.add('bipartiteflowmap-viz-container');
  uebernehmePersonenGruppen(data.personenliste || []); // soziale_gruppe aus personenliste.csv (statt rollen.csv)
  // `data` ist das kombinierte `{urkunden, familien}`-Objekt
  // (archivalienRegistry.js' `orte.datenDatei`, s.o.) - dasselbe Muster wie
  // chordDiagramm.js' `data.familien || []`.
  instanz = {
    container,
    urkundenRecords: data.urkunden || [],
    familienRecords: data.familien || [],
    options: { showUncertainty: true, width: null, height: null, ...options },
    karte: null, infoButton: null, sidebar: null, cluster: null,
    vergroessert: null, hervorhebung: null, sidebarInhalt: null
  };
  zeichneFlowMap();
}

// resize() zeichnet weiterhin komplett neu statt nur die Kartengröße zu
// invalidieren - dieselbe Begründung wie verbindungskarte.js' resize()
// (siehe dortiger Kommentar): geänderte Maße/showUncertainty müssen
// nachgezogen werden, Zoom-/Pan-Stand wird dabei bewusst zurückgesetzt.
export function resize(neueOptionen = {}) {
  if (!instanz) return;
  // Auftrag 15, Punkt 1: nur der σ-Knopf (bzw. „Licht aus“) behält Vergrößerung, Hervorhebung und Sidebar
  const nurUnsicherheit = Object.keys(neueOptionen).length > 0 && Object.keys(neueOptionen).every((k) => k === 'showUncertainty' || k === 'lichtAus');
  if (!nurUnsicherheit) { instanz.vergroessert = null; instanz.hervorhebung = null; instanz.sidebarInhalt = null; }
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneFlowMap();
}

export function destroy() {
  if (!instanz) return;
  if (instanz.infoButton) instanz.infoButton.destroy();
  if (instanz.karte) {
    instanz.karte.remove();
  }
  instanz.container.innerHTML = '';
  instanz.container.classList.remove('bipartiteflowmap-viz-container');
  instanz = null;
}
