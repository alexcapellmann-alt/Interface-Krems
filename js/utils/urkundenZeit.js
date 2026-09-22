// js/utils/urkundenZeit.js
// Gemeinsame Zeit-Aufbereitung für die zeit-/kategoriebasierten Urkunden-
// Visualisierungen (Abschnitt 13, DRY).
//
// REGRESSIONSSCHUTZ: aktuell genutzt von zeitachse.js, kalenderHeatmap.js, dotPlot.js,
// swimlanes.js, ridgeline.js, horizonChart.js, marimekko.js, alluvial.js.
// Änderungen hier wirken sich auf alle acht aus. (streamgraph.js war bis
// AUFTRAG "Streamgraph → Bürgerbuch" ebenfalls Nutzer - mit dem Umzug von
// Urkunden zu Bürgerbuch nutzt es jetzt buergerbuchZeit.js statt dieser
// Datei, siehe dortiger Dateikopf-Kommentar.)

import { zeigeTooltip, versteckeTooltip } from './tooltip.js';

const ROEMISCH_ZU_MONAT = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };
const KACHELGROESSE_UNBEKANNT = 14;

// Zentraler Fix (Auftrag "Zentraler Fix für urkundenZeit.js + Permanente
// Button-Umrandung", Teil A) - Root Cause: bei 0 Einträgen lieferte
// zeichneUnbekanntBereich() vormals `bereichsHoehe=0` zurück, zeichnete die
// "X (0)"-Beschriftung (lokales y=16, font-size 11 bold, Textunterkante bei
// ca. y=20) aber trotzdem - Aufrufer nutzen `bereichsHoehe` zur Berechnung
// ihrer SVG-Gesamthöhe, die dadurch ca. 9-10px zu knapp ausfiel und die
// Beschriftung per SVG-Standardverhalten `overflow:hidden` sichtbar abschnitt
// (live an dotPlot.js reproduziert und zunächst dort lokal behoben, siehe
// CHANGELOG/PROJEKTLOG "Dot Plot - Nachbesserungen"). Jetzt hier zentral
// gelöst, damit ALLE neun Aufrufer (siehe REGRESSIONSSCHUTZ oben) automatisch
// geschützt sind, ohne einen eigenen lokalen Guard zu brauchen - 24px deckt
// Baseline+Unterlänge mit Sicherheitsabstand ab.
const MINDEST_HOEHE_LEER = 24;
const MUSTER_TAG = /^(\d{3,4})\s+([IVXLCM]+)\s+(\d{1,2})$/i;
const MUSTER_MONAT = /^(\d{3,4})\s+([IVXLCM]+)$/i;

export function parseJahr(record) {
  const zahl = parseInt(String(record.jahr || '').trim(), 10);
  return Number.isFinite(zahl) ? zahl : null;
}

// Teilt Records nach vorhandenem Jahr. Undatierte Einträge (kein auswertbares Jahr)
// werden nie stillschweigend ausgeblendet (Abschnitt 12), sondern von der jeweiligen
// Visualisierung sichtbar in einem eigenen Bereich gezeigt (Muster aus ganttDiagramm.js
// für Bestände ohne Zeitraum, hier übertragen auf Urkunden ohne Jahr).
export function teileNachJahr(records) {
  const mitJahr = [];
  const ohneJahr = [];
  records.forEach((record) => {
    const jahr = parseJahr(record);
    if (jahr !== null) {
      mitJahr.push({ record, jahr });
    } else {
      ohneJahr.push({ record, jahr: null });
    }
  });
  return { mitJahr, ohneJahr };
}

// Extrahiert Monat/Tag aus dem datum-Freitext, wenn die Präzision (siehe
// datePrecision.js) das hergibt. {monat, tag} - jeweils null, wenn nicht auswertbar.
export function parseMonatTag(datumsText) {
  const text = (datumsText || '').trim();
  const tagTreffer = text.match(MUSTER_TAG);
  if (tagTreffer) {
    return { monat: ROEMISCH_ZU_MONAT[tagTreffer[2].toUpperCase()] || null, tag: parseInt(tagTreffer[3], 10) };
  }
  const monatTreffer = text.match(MUSTER_MONAT);
  if (monatTreffer) {
    return { monat: ROEMISCH_ZU_MONAT[monatTreffer[2].toUpperCase()] || null, tag: null };
  }
  return { monat: null, tag: null };
}

export function ersteKategorie(record) {
  if (!record.kategorien) return '(ohne Kategorie)';
  const wert = Array.isArray(record.kategorien) ? record.kategorien[0] : record.kategorien;
  return wert || '(ohne Kategorie)';
}

// Häufigste Kategorie zuerst - gemeinsame Sortierung für alle Kategorie-Achsen/-Lanes.
export function ermittleKategorienSortiertNachHaeufigkeit(mitJahr) {
  const zaehlung = new Map();
  mitJahr.forEach((eintrag) => {
    const kategorie = ersteKategorie(eintrag.record);
    zaehlung.set(kategorie, (zaehlung.get(kategorie) || 0) + 1);
  });
  return Array.from(zaehlung.entries()).sort((a, b) => b[1] - a[1]).map(([kategorie]) => kategorie);
}

// Feste Jahresfenster von binGroesse Jahren, vom abgerundeten Startjahr bis zum
// Maximaljahr. Gemeinsame Grundlage für Swimlanes/Streamgraph/Ridgeline/Horizon Chart
// (alle vier sind letztlich Varianten derselben "Anzahl je Zeitfenster und Kategorie"-
// Aggregation, nur unterschiedlich dargestellt).
export function berechneJahresBins(mitJahr, binGroesse) {
  const minJahr = d3.min(mitJahr, (d) => d.jahr);
  const maxJahr = d3.max(mitJahr, (d) => d.jahr);
  const binStart = Math.floor(minJahr / binGroesse) * binGroesse;
  const bins = [];
  for (let jahr = binStart; jahr <= maxJahr; jahr += binGroesse) {
    bins.push({ von: jahr, bis: jahr + binGroesse - 1 });
  }
  return bins;
}

// Liefert pro Zeitfenster ein Objekt {kategorie: {anzahl, unsicherAnzahl, eintraege}}.
export function gruppiereProBinUndKategorie(mitJahr, kategorien, bins) {
  const matrix = bins.map(() => {
    const zeile = {};
    kategorien.forEach((kategorie) => { zeile[kategorie] = { anzahl: 0, unsicherAnzahl: 0, eintraege: [] }; });
    return zeile;
  });
  mitJahr.forEach((eintrag) => {
    const kategorie = ersteKategorie(eintrag.record);
    const binIndex = bins.findIndex((b) => eintrag.jahr >= b.von && eintrag.jahr <= b.bis);
    if (binIndex === -1 || !matrix[binIndex][kategorie]) return;
    const zelle = matrix[binIndex][kategorie];
    zelle.anzahl += 1;
    zelle.eintraege.push(eintrag);
    if (eintrag.record.datum_unsicher) zelle.unsicherAnzahl += 1;
  });
  return matrix;
}

// Gruppiert ALLE Records (inkl. undatierte) nach Jahrhundert x Kategorie. Undatierte
// Urkunden landen in einem eigenen, regulären letzten "Bucket" statt in einem separaten
// Bereich - anders als teileNachJahr()/zeichneUnbekanntBereich(), weil Marimekko und
// Alluvial-Diagramm eine zusätzliche Spalte/Knoten technisch genauso behandeln können
// wie jede andere und damit kein Sonderfall im Rendering nötig ist. Gemeinsame
// Grundlage für marimekko.js und alluvial.js.
export function gruppiereNachJahrhundertUndKategorie(records, kategorien) {
  const { mitJahr, ohneJahr } = teileNachJahr(records);
  const jahrhundertBins = mitJahr.length > 0 ? berechneJahresBins(mitJahr, 100) : [];
  const buckets = jahrhundertBins.map((bin) => ({ ...bin, label: `${bin.von}` }));
  buckets.push({ von: null, bis: null, label: 'Undatiert' });
  const undatiertIndex = buckets.length - 1;

  const matrix = buckets.map(() => {
    const zeile = {};
    kategorien.forEach((kategorie) => { zeile[kategorie] = { anzahl: 0, unsicherAnzahl: 0, eintraege: [] }; });
    return zeile;
  });

  function trageEin(bucketIndex, eintrag) {
    const kategorie = ersteKategorie(eintrag.record);
    if (bucketIndex === -1 || !matrix[bucketIndex][kategorie]) return;
    const zelle = matrix[bucketIndex][kategorie];
    zelle.anzahl += 1;
    zelle.eintraege.push(eintrag);
    if (eintrag.record.datum_unsicher) zelle.unsicherAnzahl += 1;
  }

  mitJahr.forEach((eintrag) => {
    trageEin(jahrhundertBins.findIndex((b) => eintrag.jahr >= b.von && eintrag.jahr <= b.bis), eintrag);
  });
  ohneJahr.forEach((eintrag) => trageEin(undatiertIndex, eintrag));

  return { buckets, matrix };
}

export function baueUrkundenTooltipText(record) {
  const zeilen = [record.signatur, record.datum || '(kein Datum)', ersteKategorie(record)];
  if (record.datum_unsicher) {
    zeilen.push('Achtung: Datierung unsicher');
  }
  return zeilen.join('\n');
}

// Rendert eine sichtbar markierte Sammelfläche für Urkunden, die sich in der
// jeweiligen Visualisierung nicht regulär einordnen lassen (z.B. kein Jahr, oder für
// die Kalender-Heatmap kein exaktes Monat/Tag) - nie stillschweigend ausblenden
// (Abschnitt 12). Gleiches Grundmuster wie das "Ohne Zeitangabe"-Feld in
// ganttDiagramm.js, hier für Wiederverwendung durch mehrere Module extrahiert.
// Rendert in eine vom Aufrufer bereits erzeugte D3-<svg>-Selection. Gibt die
// tatsächlich benötigte Höhe zurück.
export function zeichneUnbekanntBereich(svg, eintraege, konfiguration) {
  const { breite, yStart, farbeFn, tooltipTextFn, container } = konfiguration;
  const proZeile = Math.max(Math.floor(breite / (KACHELGROESSE_UNBEKANNT + 4)), 1);
  const zeilenAnzahl = eintraege.length === 0 ? 0 : Math.ceil(eintraege.length / proZeile);
  // MINDEST_HOEHE_LEER (siehe Dateikopf-Kommentar dort): auch bei 0
  // Einträgen braucht die Fläche selbst Platz - sie darf nie kleiner sein,
  // als sie für ihren eigenen Inhalt tatsächlich benötigt. Die Höhenformel
  // ist bewusst UNVERÄNDERT gegenüber vorher (Auftrag "Undatiert-Beschriftung
  // entfernen": nur das jetzt entfallene Text-Element brauchte den früheren
  // 30px-Sockel/16px-Textzeile - der Sockel bleibt trotzdem bestehen, um
  // keine Höhen-/Ausrichtungsänderung an den aufrufenden Modulen auszulösen,
  // die außerhalb dieses Auftrags liegt).
  const bereichsHoehe = eintraege.length === 0 ? MINDEST_HOEHE_LEER : 30 + zeilenAnzahl * (KACHELGROESSE_UNBEKANNT + 4);

  const bereich = svg.append('g').attr('transform', `translate(0,${yStart})`);
  bereich.append('rect').attr('width', breite).attr('height', bereichsHoehe).attr('fill', '#f4f4f4').attr('stroke', '#bbb');

  const kacheln = bereich.selectAll('rect.unbekannt-kachel')
    .data(eintraege)
    .join('rect')
    .attr('class', 'unbekannt-kachel')
    .attr('tabindex', 0)
    .attr('x', (d, i) => 6 + (i % proZeile) * (KACHELGROESSE_UNBEKANNT + 4))
    .attr('y', (d, i) => 24 + Math.floor(i / proZeile) * (KACHELGROESSE_UNBEKANNT + 4))
    .attr('width', KACHELGROESSE_UNBEKANNT)
    .attr('height', KACHELGROESSE_UNBEKANNT)
    .attr('fill', (d) => farbeFn(d));

  kacheln
    .on('mouseenter focus', function (event, d) { zeigeTooltip(tooltipTextFn(d), this, container); })
    .on('mouseleave blur', () => versteckeTooltip());

  return bereichsHoehe;
}
