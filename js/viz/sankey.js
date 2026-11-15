// js/viz/sankey.js
// Sankey der Urkunden: Kategorie (links, erste Kategorie je Urkunde, ersteKategorie()) → Ort (rechts).
// Modul-Interface siehe Abschnitt 5. Kein d3-sankey (nicht im freigegebenen Stack), Bänder als Bezier-Flächen von Hand.
//
// Zählbasis: Bandbreite = Zahl der Urkunden je Kategorie-Ort-Paar (je Urkunde ein Set von Orten, keine Doppelzählung
// innerhalb eines Paars). Balkenhöhe, Tooltip und Kategorie-Bündelung verwenden dieselbe Summe (summeAnzahl()); sie kann
// über der Zahl eindeutiger Urkunden liegen, weil eine Urkunde mehrere Orte nennen kann – nur so füllen die Bänder den
// Balken. Die Orts-Bündelung zählt dagegen Urkunden je Ortsname (ermittleOrtRohZaehlung(), vor jeder Bündelung).
//
// Bündelung: Kategorien unter KATEGORIE_BUENDELUNG_SCHWELLE und Orte unter ORT_BUENDELUNG_SCHWELLE fallen unter
// „Andere Kategorien“ bzw. „Andere Orte“; deren Tooltip nennt die Bestandteile (höchstens BUENDEL_TOOLTIP_MAX_ZEILEN).
// Urkunden ohne Kategorie oder ohne Ort erscheinen als eigene Knoten „(ohne Kategorie)“/„(kein Ort)“ (Abschnitt 12:
// nicht stillschweigend weglassen); sie sind gestrichelt markiert und nur bei eingeschaltetem Unsicherheitsknopf zu
// sehen. Die Ortsauswahl zählt immer über alle Urkunden, damit der Knopf nur die Sichtbarkeit ändert, nicht das Layout.
//
// Beschriftung: Knotenbeschriftungen sitzen auf der Knotenmitte; ordneLabelsAn() (PAVA) verschiebt nur kollidierende
// Beschriftungen, ab LABEL_LEITLINIE_SCHWELLE px Versatz mit Führungslinie. Kürzung nach verfügbarer Pixelbreite
// (js/utils/beschriftung.js), der volle Name steht im Tooltip. Kategorien haben mehr Platz (RAND_KATEGORIE) und behalten
// immer LABEL_SCHRIFTGROESSE; nur die Ortsspalte wird bei Platzmangel kleiner. Bänder ab 12 px Breite tragen am Ende
// ihren Kategorienamen, damit die Farbe nicht das einzige Merkmal ist (WCAG 1.4.1).
//
// Bedienung: Hover hebt vorübergehend hervor; Klick, Enter oder Leertaste auf einem Band oder Knoten fixiert die Hervorhebung in
// `instanz.auswahl` (über Namen, damit sie Umschalten und Größenänderung übersteht). Zweiter Klick, Klick auf die freie
// Fläche oder Esc heben sie auf. Jeder Knoten hat eine unsichtbare Klickfläche von mindestens MIN_KLICKFLAECHE_HOEHE px.
// Das Modul öffnet keine Seitenleiste.
// Entstehung, Messwerte und frühere Fassungen: docs/PROJEKTLOG.md und docs/CHANGELOG.md.

import { farbeFuerUrkundenKategorie } from '../utils/urkundenKategorieFarben.js'; // AUFTRAG C2
import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { ersteKategorie, ermittleKategorienSortiertNachHaeufigkeit } from '../utils/urkundenZeit.js';
import { ermittleBeschriftungstext } from '../utils/beschriftung.js';
import { ermittleVerfuegbareBreite, ermittleVerfuegbareHoehe } from '../utils/viewportGroesse.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { EIGENES_ABDUNKELN_ATTR } from '../utils/abdunkeln.js'; // Nachbesserung 3, Punkt 4
import { infotextFuerModul } from '../core/archivKonfiguration.js';

const ANDERE_ORTE = 'Andere Orte';
const KEIN_ORT = '(kein Ort)';
const OHNE_KATEGORIE = '(ohne Kategorie)';

// Siehe Dateikopf - EINHEITLICHE Zählbasis: Balkenhöhe,
// Tooltip und Bündelungsschwelle verwenden ausschließlich `summeAnzahl()`
// (Bandbreiten-Summe über die - ggf. mehreren - ausgehenden/eingehenden
// Kategorie-Ort-Verbindungen), keine zweite, abweichende Zählmethode mehr.
const KATEGORIE_BUENDELUNG_SCHWELLE = 10;
const ANDERE_KATEGORIEN = 'Andere Kategorien';
// Dieselbe schwellenwertbasierte Bündelung wie bei den Kategorien.
// 2026-10-28 (Wunsch des Autors): 15 -> 17, damit Rehberg bei Krems (16) und Dürnstein (15) unter „Andere Orte“
// fallen; einzeln bleiben die 11 Orte ab 18 Verbindungen (Wien bis Graz).
const ORT_BUENDELUNG_SCHWELLE = 17;
// Siehe Dateikopf - Obergrenze für die Bestandteile-
// Liste im "Andere Orte"-Tooltip (bis zu 243 einzelne Ortsnamen wären
// unlesbar) - eigene, transparent dokumentierte Entscheidung, siehe
// formatiereBuendelTooltip().
const BUENDEL_TOOLTIP_MAX_ZEILEN = 15;

// Siehe Dateikopf: asymmetrische äußere
// Beschriftungsbereiche - Kategorien (links) großzügiger als Orte (rechts).
const RAND_KATEGORIE = 180;
const RAND_ORT = 110;
const KNOTEN_BREITE = 14;
const KNOTEN_ABSTAND = 3;
const NEUTRALE_KNOTEN_FARBE = '#888888';
// Siehe Dateikopf - Mindest-Klick-/Hover-Fläche je
// Knoten, unabhängig von seiner visuellen Balkendicke.
const MIN_KLICKFLAECHE_HOEHE = 10;

const NORMALE_OPAZITAET = 0.55;
const HERVORGEHOBENE_OPAZITAET = 0.85;
const ABGEBLENDETE_OPAZITAET = 0.06;
// Knoten bleiben beim Abblenden etwas sichtbarer als Bänder (sonst
// verschwindet die Kategorie-Farbfläche einer dünnen Spalte komplett).
const KNOTEN_ABGEBLENDETE_OPAZITAET = 0.15;
const LABEL_ABGEBLENDETE_OPAZITAET = 0.2;

// Siehe Dateikopf.
const LABEL_SCHRIFTGROESSE = 13;
const LABEL_SCHRIFTGROESSE_ORT_REDUZIERT = 11;
const LABEL_PUFFER = 8; // Abstand Knotenkante -> Label-Textanfang
const LABEL_RAND_PUFFER = 6; // zusätzlicher Puffer zum äußeren SVG-Rand
const LABEL_LEITLINIE_SCHWELLE = 4; // px Verschiebung, ab der eine Führungslinie gezeichnet wird

const TITEL_TEXT = 'Kategorie → Ort';


let instanz = null; // { container, records, options, auswahl, hover } – ein aktives Sankey-Diagramm pro Modul-Ladung

function farbeFuerKategorie(kategorie) {
  return farbeFuerUrkundenKategorie(kategorie);
}

// Pro Urkunde ein SET von Ort-"Buckets" (echter Ortsname, falls nicht in
// ortBuendelSet, sonst "Andere Orte") - ein Set statt einer Liste, damit
// eine Urkunde mit mehreren Orten, die alle in denselben Bucket fallen, für
// diesen Bucket nur einmal zählt (siehe Dateikopf-Kommentar).
function ermittleOrtBuckets(record, ortBuendelSet) {
  const orteListe = Array.isArray(record.orte) ? record.orte : (record.orte ? [record.orte] : []);
  if (orteListe.length === 0) return [KEIN_ORT];
  return [...new Set(orteListe.map((ort) => (ortBuendelSet.has(ort) ? ANDERE_ORTE : ort)))];
}

// Siehe Dateikopf - rohe Nennungshäufigkeit je Ortsname
// (ein Set pro Urkunde, Mehrfachnennung desselben Ortsnamens in einer
// Urkunde zählt nur einmal) - unabhängig von jeder Bündelung, Grundlage für
// ORT_BUENDELUNG_SCHWELLE weiter unten.
function ermittleOrtRohZaehlung(records) {
  const zaehlung = new Map();
  records.forEach((record) => {
    const orteListe = Array.isArray(record.orte) ? record.orte : (record.orte ? [record.orte] : []);
    new Set(orteListe).forEach((ort) => zaehlung.set(ort, (zaehlung.get(ort) || 0) + 1));
  });
  return zaehlung;
}

function summeAnzahl(links, feld, wert) {
  return links.filter((l) => l[feld] === wert).reduce((s, l) => s + l.anzahl, 0);
}

// Siehe Dateikopf - baut EINE Verbindungsliste
// (Erst-Kategorie x finaler Ort-Bucket, noch OHNE Kategorie-Bündelung) aus
// den rohen Records. summeAnzahl() darauf angewendet liefert exakt dieselbe
// Bandbreiten-Summe, die später (nach Kategorie-Bündelung) auch die
// Balkenhöhe bestimmt - Grundlage für die Kategorie-Bündelungsschwelle
// (siehe baueSankeyDaten()), OHNE dafür eine zweite Zählmethode zu
// erfinden.
function baueRoheLinks(records, ortBuendelSet) {
  const links = new Map();
  records.forEach((record) => {
    const von = ersteKategorie(record);
    ermittleOrtBuckets(record, ortBuendelSet).forEach((nach) => {
      const schluessel = `${von}|||${nach}`;
      links.set(schluessel, { von, nach, anzahl: (links.get(schluessel)?.anzahl || 0) + 1 });
    });
  });
  return Array.from(links.values());
}

// Siehe Dateikopf - Bestandteile-Liste eines
// Sammelknotens für dessen Tooltip: häufigste zuerst, ab
// BUENDEL_TOOLTIP_MAX_ZEILEN eine zusammenfassende "… und N weitere"-Zeile
// statt (bei "Andere Orte") bis zu 243 einzelner Namen.
function formatiereBuendelTooltip(label, gesamt, bestandteile) {
  const sortiert = [...bestandteile.entries()].sort((a, b) => b[1] - a[1]);
  const zeilen = sortiert.slice(0, BUENDEL_TOOLTIP_MAX_ZEILEN).map(([name, anzahl]) => `${name}: ${anzahl} Urkunde(n)`);
  const rest = sortiert.length - zeilen.length;
  if (rest > 0) zeilen.push(`… und ${rest} weitere`);
  return [`${label}: ${gesamt} Urkunde(n)`, ...zeilen].join('\n');
}

// Baut Kategorien-/Ort-Namenslisten und die Links dazwischen (samt
// unsicherAnzahl aus record.orte_unsicher). `zeigeUnsicherheit` steuert
// Siehe Dateikopf: ist er falsch, werden
// "(ohne Kategorie)"/"(kein Ort)" (samt ihrer Links) am Ende herausgefiltert.
// Siehe Dateikopf: keine Urkunden-Listen mehr (weder
// urkundenNachKategorie/-OrtBucket noch link.eintraege) - wurden nur für die
// jetzt entfernte Sidebar-Anzeige befüllt, Balkenhöhe/Tooltip kommen
// stattdessen aus derselben Bandbreiten-Summe wie die Stapelung.
function baueSankeyDaten(records, { zeigeUnsicherheit }) {
  // Punkt 4: Ort-Bündelung zuerst (unabhängig von der Kategorie-Bündelung)
  // - ihr Ergebnis (ortBuendelSet) wird für baueRoheLinks() gebraucht.
  const ortRohZaehlung = ermittleOrtRohZaehlung(records);
  const ortBuendelSet = new Set([...ortRohZaehlung.keys()].filter((ort) => ortRohZaehlung.get(ort) < ORT_BUENDELUNG_SCHWELLE));

  // Punkt 0/1: einheitliche Bandbreiten-Summe je ROHER (noch ungebündelter)
  // Erst-Kategorie, exakt via summeAnzahl() - Grundlage der Bündelungs-
  // schwelle, siehe PROJEKTLOG/CHANGELOG für die Gesundheit/Wirtschaft/
  // Bildung-und-Erziehung-Befunde.
  const kategorienRoh = ermittleKategorienSortiertNachHaeufigkeit(records.map((record) => ({ record })));
  const roheLinks = baueRoheLinks(records, ortBuendelSet);
  const kategorieSummenRoh = new Map(kategorienRoh.map((k) => [k, summeAnzahl(roheLinks, 'von', k)]));
  const kategorieBuendelSet = new Set(kategorienRoh.filter((k) => k !== OHNE_KATEGORIE && (kategorieSummenRoh.get(k) || 0) < KATEGORIE_BUENDELUNG_SCHWELLE));
  const anzeigeKategorie = (kategorie) => (kategorieBuendelSet.has(kategorie) ? ANDERE_KATEGORIEN : kategorie);

  // Bestandteile-Listen für die Sammelknoten-Tooltips (siehe
  // formatiereBuendelTooltip()) - direkt aus den bereits vorhandenen
  // Roh-Zählungen abgeleitet, kein zweiter Urkunden-Durchlauf nötig.
  const kategorieBuendelBestandteile = new Map([...kategorieSummenRoh.entries()].filter(([k]) => kategorieBuendelSet.has(k)));
  const ortBuendelBestandteile = new Map([...ortRohZaehlung.entries()].filter(([o]) => ortBuendelSet.has(o)));

  const links = new Map(); // "kategorie|||ortBucket" -> {von, nach, anzahl, unsicherAnzahl}

  records.forEach((record) => {
    const kategorie = anzeigeKategorie(ersteKategorie(record));
    ermittleOrtBuckets(record, ortBuendelSet).forEach((ortBucket) => {
      const schluessel = `${kategorie}|||${ortBucket}`;
      if (!links.has(schluessel)) links.set(schluessel, { von: kategorie, nach: ortBucket, anzahl: 0, unsicherAnzahl: 0 });
      const link = links.get(schluessel);
      link.anzahl += 1;
      if (record.orte_unsicher) link.unsicherAnzahl += 1;
    });
  });

  // Kategorie-Spalte: gebündelte Einzelkategorien raus, "Andere Kategorien"
  // (sofern es sie gibt) ans Ende - dieselbe "Sammelknoten zuletzt"-
  // Konvention wie bei der Ort-Spalte.
  let kategorienReihenfolge = kategorienRoh.filter((k) => !kategorieBuendelSet.has(k));
  if (kategorieBuendelSet.size > 0) kategorienReihenfolge.push(ANDERE_KATEGORIEN);

  // Ort-Spalte: alle Orte ab ORT_BUENDELUNG_SCHWELLE, häufigste zuerst -
  // "Andere Orte"/"(kein Ort)" (sofern vorhanden) stehen zuletzt.
  let ortReihenfolge = [...ortRohZaehlung.keys()].filter((o) => !ortBuendelSet.has(o)).sort((a, b) => ortRohZaehlung.get(b) - ortRohZaehlung.get(a));
  if (ortBuendelSet.size > 0) ortReihenfolge.push(ANDERE_ORTE);

  let linksArray = Array.from(links.values());
  if (linksArray.some((l) => l.nach === KEIN_ORT)) ortReihenfolge.push(KEIN_ORT);

  // Punkt 3: Ort-/Kategorie-Bündelung oben sind bewusst UNABHÄNGIG von
  // zeigeUnsicherheit berechnet (zählen über ALLE Urkunden) - nur das
  // Filtern hier unten hängt vom Toggle ab, damit sich beim Umschalten nur
  // Sichtbarkeit, nicht die Knoten-AUSWAHL selbst ändert (Auftrag:
  // "layoutstabil").
  if (!zeigeUnsicherheit) {
    kategorienReihenfolge = kategorienReihenfolge.filter((k) => k !== OHNE_KATEGORIE);
    ortReihenfolge = ortReihenfolge.filter((o) => o !== KEIN_ORT);
    linksArray = linksArray.filter((l) => l.von !== OHNE_KATEGORIE && l.nach !== KEIN_ORT);
  }

  return { kategorien: kategorienReihenfolge, orte: ortReihenfolge, links: linksArray, kategorieBuendelBestandteile, ortBuendelBestandteile };
}

// Stapelt eine Spalte proportional zu ihren Gesamtwerten und liefert {name: {top, hoehe}}.
function stapleSpalte(namen, summenProName, skala) {
  const positionen = new Map();
  let cursor = 0;
  namen.forEach((name) => {
    const hoehe = (summenProName.get(name) || 0) * skala;
    positionen.set(name, { top: cursor, hoehe });
    cursor += hoehe + KNOTEN_ABSTAND;
  });
  return { positionen, gesamtHoehe: cursor };
}

function baueRibbonPfad(x0, x1, y0Top, y0Bottom, y1Top, y1Bottom) {
  const xMitte = (x0 + x1) / 2;
  return `M${x0},${y0Top} C${xMitte},${y0Top} ${xMitte},${y1Top} ${x1},${y1Top} `
    + `L${x1},${y1Bottom} C${xMitte},${y1Bottom} ${xMitte},${y0Bottom} ${x0},${y0Bottom} Z`;
}

// Weist jedem Link innerhalb seines Von- und Nach-Knotens einen eigenen,
// gestapelten Höhenabschnitt zu (sonst würden mehrere Links desselben Knotens
// übereinander liegen statt sich zu stapeln) und zeichnet die Bezier-Bänder.
// Reine Tooltip-Verdrahtung hier - Klick/Fokus-Fixierung verdrahtet der
// Aufrufer separat (siehe zeichneSankey()), da sie den zentralen
// Auswahl-Zustand dieses Moduls kennen muss.
function zeichneVerbindungsEbene(svg, links, positionenVon, positionenNach, xVon, xNach, skala, farbeFn, container, zeigeUnsicherheit) {
  const cursorVon = new Map();
  const cursorNach = new Map();

  links.forEach((link) => {
    const dicke = link.anzahl * skala;
    const vonStart = cursorVon.get(link.von) ?? positionenVon.get(link.von).top;
    const nachStart = cursorNach.get(link.nach) ?? positionenNach.get(link.nach).top;
    link.y0Top = vonStart;
    link.y0Bottom = vonStart + dicke;
    link.y1Top = nachStart;
    link.y1Bottom = nachStart + dicke;
    cursorVon.set(link.von, link.y0Bottom);
    cursorNach.set(link.nach, link.y1Bottom);
  });

  // Siehe Dateikopf: die gestrichelte
  // Randmarkierung hing bisher an `unsicherAnzahl` (Datierungs-Unsicherheit
  // einzelner Urkunden - ein GANZ ANDERES Feld) und erschien dadurch an
  // vielen Bändern. Jetzt ausschließlich an den beiden Unsicherheits-Knoten
  // selbst (Von="(ohne Kategorie)" oder Nach="(kein Ort)").
  const istUnsicherheitsBand = (d) => d.von === OHNE_KATEGORIE || d.nach === KEIN_ORT;

  const pfade = svg.append('g').style('pointer-events', 'auto')
    .selectAll(null)
    .data(links)
    .join('path')
    .attr('class', 'sankey-band')
    .attr('tabindex', 0)
    .attr('d', (d) => baueRibbonPfad(xVon, xNach, d.y0Top, d.y0Bottom, d.y1Top, d.y1Bottom))
    .attr('fill', (d) => farbeFn(d))
    .attr('fill-opacity', NORMALE_OPAZITAET)
    .attr('stroke', (d) => (zeigeUnsicherheit && istUnsicherheitsBand(d) ? '#c0392b' : 'none'))
    .attr('stroke-width', (d) => (zeigeUnsicherheit && istUnsicherheitsBand(d) ? 1.5 : 0))
    .attr('stroke-dasharray', (d) => (zeigeUnsicherheit && istUnsicherheitsBand(d) ? '4,3' : null));

  pfade
    .on('mouseenter focus', function (event, d) {
      const zeilen = [`${d.von} → ${d.nach}`, `${d.anzahl} Urkunde(n)`];
      if (d.unsicherAnzahl > 0) zeilen.push(`davon ${d.unsicherAnzahl} mit unsicherer Datierung`);
      zeigeTooltip(zeilen.join('\n'), this, container);
    })
    .on('mouseleave blur', () => versteckeTooltip());

  // Nachbesserung 6, Punkt 14 (Befund 6.11): Farbe nicht als einziges Merkmal - jedes Band, das breit genug ist, trägt
  // am Ende vor dem Ort den Namen seiner Kategorie (dunkle Schrift mit hellem Rand, auf jeder Bandfarbe lesbar).
  // Schmalere Bänder bleiben über Tooltip und Fokus zuordenbar. Für Hilfsmittel verborgen: das Band selbst nennt beides.
  const MIN_BANDBREITE_BESCHRIFTUNG = 12;
  svg.append('g').attr('class', 'sankey-band-beschriftung').attr('aria-hidden', 'true').style('pointer-events', 'none')
    .selectAll('text')
    .data(links.filter((d) => d.y1Bottom - d.y1Top >= MIN_BANDBREITE_BESCHRIFTUNG))
    .join('text')
    .attr('x', xNach - 6).attr('y', (d) => (d.y1Top + d.y1Bottom) / 2).attr('dy', '0.35em')
    .attr('text-anchor', 'end').attr('font-size', 11)
    .attr('fill', '#1a1a1a').attr('stroke', '#ffffff').attr('stroke-width', 3).attr('stroke-opacity', 0.85)
    .style('paint-order', 'stroke')
    .text((d) => d.von);

  return pfade;
}

// optionen (alle einzeln optional):
// - onKlick(name): macht den Knoten fokussierbar/klickbar (tabindex/role/
//   aria-label, Klick UND Enter/Leertaste rufen onKlick(name) auf).
// - tooltipTextFn(name)/container: zeigt bei Hover/Fokus einen Tooltip mit
//   dem Rückgabewert, versteckt ihn bei mouseleave/blur.
// - onHoverStart(name)/onHoverEnd(): zusätzlich zum Tooltip aufgerufen - für
//   die temporäre Hervorhebung (siehe aktualisiereHighlight()).
// Zeichnet ZWEI Rechtecke pro Knoten (keine Labels, siehe
// zeichneLabelSpalte()): das sichtbare, farbige (`rects`, `pointer-
// events:none`) sowie - Punkt 2, siehe Dateikopf-Kommentar - ein
// unsichtbares, mindestens MIN_KLICKFLAECHE_HOEHE hohes "Hit"-Rechteck
// darüber, mittig um dieselbe Position zentriert und Träger ALLER
// Interaktions-Attribute/Handler - garantiert eine Mindest-Klick-/Hover-
// Fläche unabhängig von der tatsächlichen (ggf. sub-Pixel-dünnen)
// Balkendicke. Gibt die sichtbaren `rects` zurück (per Namen gebunden),
// damit aktualisiereHighlight() sie gezielt umfärben kann.
function zeichneKnotenSpalte(svg, positionen, x, farbeFn, optionen = {}) {
  const { onKlick, tooltipTextFn, onHoverStart, onHoverEnd, container } = optionen;
  const namen = [...positionen.keys()];
  const gruppe = svg.append('g').attr('class', 'sankey-knotenspalte');

  const rects = gruppe.selectAll(null)
    .data(namen)
    .join('rect')
    .attr('x', x)
    .attr('y', (name) => positionen.get(name).top)
    .attr('width', KNOTEN_BREITE)
    .attr('height', (name) => Math.max(positionen.get(name).hoehe, 0))
    .attr('fill', farbeFn)
    .style('pointer-events', 'none');

  const hitFlaeche = gruppe.selectAll(null)
    .data(namen)
    .join('rect')
    .attr('x', x)
    .attr('y', (name) => {
      const pos = positionen.get(name);
      return pos.top + pos.hoehe / 2 - Math.max(pos.hoehe, MIN_KLICKFLAECHE_HOEHE) / 2;
    })
    .attr('width', KNOTEN_BREITE)
    .attr('height', (name) => Math.max(positionen.get(name).hoehe, MIN_KLICKFLAECHE_HOEHE))
    .attr('fill', 'transparent');

  if (onKlick || tooltipTextFn) {
    hitFlaeche.attr('tabindex', 0).attr('role', 'button').attr('aria-label', (name) => `${name}, Verbindungen hervorheben`)
      .style('cursor', 'pointer');
  }
  if (onKlick) {
    hitFlaeche.on('click', (event, name) => { event.stopPropagation(); onKlick(name); })
      .on('keydown', (event, name) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        onKlick(name);
      });
  }
  if (tooltipTextFn) {
    hitFlaeche.on('mouseenter focus', function (event, name) { zeigeTooltip(tooltipTextFn(name), this, container); onHoverStart?.(name); })
      .on('mouseleave blur', (event, name) => { versteckeTooltip(); onHoverEnd?.(name); });
  }
  return rects;
}

// Punkt 1 (siehe Dateikopf-Kommentar, ROOT CAUSE des Label-Bugs) - PAVA
// (Pool Adjacent Violators Algorithm) statt einer reinen Vorwärts-
// /Rückwärts-Verschiebung: gesucht ist die Y-Folge, die (a) monoton um
// mindestens minAbstand steigt UND (b) den echten Knotenmitten möglichst
// nahekommt. Mit z_i = mitte_i - i*minAbstand ist Bedingung (a) gleich-
// bedeutend mit einer schlicht NICHT-FALLENDEN z-Folge - genau das liefert
// PAVA: läuft die Kandidaten der Reihe nach durch, verschmilzt ("poolt")
// dabei aber NUR jene Nachbarn zu einem gemeinsamen Mittelwert, deren
// natürliche Reihenfolge in z sonst verletzt würde (d.h. deren Knoten enger
// beieinander liegen als minAbstand erlaubt). Der entscheidende Unterschied
// zur vorherigen reinen Verschiebung: ein eng gepackter Cluster am unteren
// Spaltenende zieht dadurch NICHT mehr die gesamte Kette (inklusive längst
// unkritischer Label weiter oben) nach unten mit - jedes nicht am jeweiligen
// Cluster beteiligte Label bleibt exakt auf seiner echten Knotenmitte
// (root-cause-Befund, siehe CHANGELOG: genau dieses "unnötige Mitziehen"
// ließ die Gesamtspanne der Spalte unnötig anwachsen und löste dadurch die
// Gleichverteilungs-Rettung weiter unten für die GANZE Spalte aus, obwohl
// nur wenige Knoten tatsächlich kollidierten).
function ordneLabelsAn(kandidaten, minAbstand, verfuegbareHoehe) {
  const sortiert = [...kandidaten].sort((a, b) => a.mitte - b.mitte);
  const n = sortiert.length;
  if (n === 0) return sortiert;

  const pools = []; // je {summe, anzahl, start, ende} - Mittelwert der z-Werte, nicht-fallend über alle Pools hinweg
  for (let i = 0; i < n; i += 1) {
    let pool = { summe: sortiert[i].mitte - i * minAbstand, anzahl: 1, start: i, ende: i };
    while (pools.length > 0 && pools[pools.length - 1].summe / pools[pools.length - 1].anzahl > pool.summe / pool.anzahl) {
      const vorheriger = pools.pop();
      pool = { summe: vorheriger.summe + pool.summe, anzahl: vorheriger.anzahl + pool.anzahl, start: vorheriger.start, ende: pool.ende };
    }
    pools.push(pool);
  }
  pools.forEach((pool) => {
    const mittelwert = pool.summe / pool.anzahl;
    for (let i = pool.start; i <= pool.ende; i += 1) sortiert[i].y = mittelwert + i * minAbstand;
  });

  // Rand-Fit: die PAVA-Lösung oben ist bereits kollisionsfrei und minimal
  // verschoben, kennt aber den tatsächlich verfügbaren Bereich
  // [randPuffer, verfuegbareHoehe-randPuffer] noch nicht. Passt die Spalte
  // NUR MINIMAL an (verschiebt sie als Ganzes nur so weit wie nötig, wenn
  // sie oben oder unten übersteht) statt sie - wie zuvor - unconditional auf
  // den oberen Rand zu verankern (auch DAS war Teil des Label-Versatzes: ein
  // Label, dessen echte Knotenmitte z.B. bei 68px lag, wurde bislang auf
  // ~10px verschoben, selbst wenn dafür gar kein Platzmangel bestand).
  // +2 zusätzlich zu minAbstand/2 - live gemessen: einzelne Großbuchstaben-
  // Oberlängen (z.B. "P", "W") ragten mit reinem minAbstand/2 noch ~1px über
  // den Rand, dieser kleine Zuschlag deckt das zuverlässig ab.
  const randPuffer = minAbstand / 2 + 2;
  const spanne = sortiert[n - 1].y - sortiert[0].y;
  const verfuegbareSpanne = verfuegbareHoehe - 2 * randPuffer;
  if (spanne > verfuegbareSpanne) {
    // Selbst nach PAVA passt die Spalte nicht (nur bei künstlich extremen
    // Fensterhöhen, die die App selbst nie erreicht - siehe CHANGELOG):
    // letzte Rettung bleibt die gleichmäßige Verteilung. Eine reine
    // proportionale Stauchung wurde hier bewusst NICHT verwendet (bereits
    // früher live als fehlerhaft erkannt - siehe CHANGELOG (36): drückt
    // exakt-minAbstand-Paare unter das Minimum) - gleichmäßige Verteilung
    // mit einem einzigen, für jedes Paar IDENTISCHEN Abstand erzeugt dagegen
    // nirgends eine neue Überlappung.
    const gleichmaessigerAbstand = n > 1 ? verfuegbareSpanne / (n - 1) : 0;
    sortiert.forEach((k, i) => { k.y = randPuffer + i * gleichmaessigerAbstand; });
  } else {
    let verschiebung = 0;
    if (sortiert[0].y < randPuffer) verschiebung = randPuffer - sortiert[0].y;
    else if (sortiert[n - 1].y > verfuegbareHoehe - randPuffer) verschiebung = (verfuegbareHoehe - randPuffer) - sortiert[n - 1].y;
    if (verschiebung !== 0) sortiert.forEach((k) => { k.y += verschiebung; });
  }
  return sortiert;
}

// Zeichnet eine komplette Beschriftungsspalte: Kollisionsausgleich (siehe
// ordneLabelsAn()), pixelgenaue Kürzung (ermittleBeschriftungstext()) und
// bei tatsächlicher Verschiebung eine dünne Führungslinie zur echten
// Knotenmitte. Gibt {textAuswahl, leitlinienAuswahl} zurück (beide per Namen
// gebunden), damit aktualisiereHighlight() auch Labels/Führungslinien
// gezielt abblenden kann.
function zeichneLabelSpalte(svg, positionen, config) {
  const { seiteLinks, knotenKanteX, labelX, verfuegbareBreite, verfuegbareHoehe, schriftgroesse } = config;
  const minAbstand = schriftgroesse + 4;
  const kandidaten = [];
  positionen.forEach((pos, name) => kandidaten.push({ name, mitte: pos.top + pos.hoehe / 2 }));
  const angeordnet = ordneLabelsAn(kandidaten, minAbstand, verfuegbareHoehe)
    .map((k) => ({ ...k, text: ermittleBeschriftungstext(k.name, verfuegbareBreite, schriftgroesse), verschoben: Math.abs(k.y - k.mitte) > LABEL_LEITLINIE_SCHWELLE }));

  const gruppe = svg.append('g').attr('class', 'sankey-labelspalte');

  const leitlinienAuswahl = gruppe.selectAll(null)
    .data(angeordnet.filter((k) => k.verschoben && k.text !== null), (k) => k.name)
    .join('line')
    .attr('class', 'sankey-leitlinie')
    .attr('x1', knotenKanteX).attr('y1', (k) => k.mitte)
    .attr('x2', seiteLinks ? labelX + 3 : labelX - 3).attr('y2', (k) => k.y)
    .attr('stroke', '#999').attr('stroke-width', 1).attr('stroke-opacity', 0.6).attr('stroke-dasharray', '2,2');

  const textAuswahl = gruppe.selectAll(null)
    .data(angeordnet.filter((k) => k.text !== null), (k) => k.name)
    .join('text')
    .attr('x', labelX).attr('y', (k) => k.y)
    .attr('text-anchor', seiteLinks ? 'end' : 'start')
    .attr('dominant-baseline', 'middle')
    .attr('font-size', schriftgroesse)
    .text((k) => k.text);

  return { textAuswahl, leitlinienAuswahl };
}

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .kos-wurzel { display: flex; flex-direction: column; height: 100%; }
    .kos-kopf { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start;
      gap: var(--space-4); margin: 0 0 var(--space-3) 0; flex: 0 0 auto; }
    .kos-titel { margin: 0; font-size: 1.1rem; font-weight: 700; }
    .kos-kopf-rechts { display: flex; align-items: center; gap: var(--space-3); flex: 0 0 auto; }
    .kos-verbindungen-zaehler { font-size: var(--fs-sm); font-weight: 600; color: var(--text-muted); white-space: nowrap; }
    .kos-plot-bereich { flex: 1 1 auto; overflow-x: hidden; overflow-y: visible; }
    .sankey-band:focus-visible { outline: none; stroke: var(--accent); stroke-width: 2px; }
  `;
  container.appendChild(style);
}

// Punkt 2 (Klick-Fixierung, siehe Dateikopf-Kommentar): einzige Stelle, die
// tatsächlich Opazitäten auf Bänder/Knoten/Labels anwendet.
// `aktiv = instanz.auswahl || instanz.hover` - eine fixierte Auswahl hat
// IMMER Vorrang vor einem gerade laufenden Hover (Auftrag: Hover bleibt nur
// temporär wirksam, solange nichts fixiert ist).
function aktualisiereHighlight() {
  const {
    pfadeAuswahl, kategorieKnotenAuswahl, ortKnotenAuswahl,
    kategorieLabelAuswahl, ortLabelAuswahl, kategorieLeitlinienAuswahl, ortLeitlinienAuswahl,
    auswahl, hover
  } = instanz;
  if (!pfadeAuswahl) return;
  const aktiv = auswahl || hover;

  let linkPraedikat = null;
  let kategorieAktivPraedikat = null;
  let ortAktivPraedikat = null;
  let knotenUndLabelAbblenden = false;

  if (aktiv) {
    if (aktiv.typ === 'link') {
      linkPraedikat = (d) => d.von === aktiv.von && d.nach === aktiv.nach;
      kategorieAktivPraedikat = (name) => name === aktiv.von;
      ortAktivPraedikat = (name) => name === aktiv.nach;
      knotenUndLabelAbblenden = true;
    } else if (aktiv.typ === 'kategorie') {
      linkPraedikat = (d) => d.von === aktiv.name;
    } else if (aktiv.typ === 'ort') {
      linkPraedikat = (d) => d.nach === aktiv.name;
    }
  }

  pfadeAuswahl.attr('fill-opacity', (d) => {
    if (!aktiv) return NORMALE_OPAZITAET;
    return linkPraedikat(d) ? HERVORGEHOBENE_OPAZITAET : ABGEBLENDETE_OPAZITAET;
  });

  kategorieKnotenAuswahl.attr('fill-opacity', (name) => (!knotenUndLabelAbblenden || kategorieAktivPraedikat(name) ? 1 : KNOTEN_ABGEBLENDETE_OPAZITAET));
  ortKnotenAuswahl.attr('fill-opacity', (name) => (!knotenUndLabelAbblenden || ortAktivPraedikat(name) ? 1 : KNOTEN_ABGEBLENDETE_OPAZITAET));

  [kategorieLabelAuswahl, kategorieLeitlinienAuswahl].forEach((auswahlSel) => {
    auswahlSel.attr('opacity', (k) => (!knotenUndLabelAbblenden || kategorieAktivPraedikat(k.name) ? 1 : LABEL_ABGEBLENDETE_OPAZITAET));
  });
  [ortLabelAuswahl, ortLeitlinienAuswahl].forEach((auswahlSel) => {
    auswahlSel.attr('opacity', (k) => (!knotenUndLabelAbblenden || ortAktivPraedikat(k.name) ? 1 : LABEL_ABGEBLENDETE_OPAZITAET));
  });
}

// Länge begründet (über 100 Zeilen, Masterprompt §13.3; Nachbesserung 8): zeichnet die ganze Ansicht in einem Durchgang (Maße, Skalen, Achsen, Elemente, Beschriftung, Interaktion); die Schritte teilen viele lokale Größen, eine Zerlegung bräuchte lange Parameterlisten ohne Gewinn an Lesbarkeit.
function zeichneSankey() {
  const { container, plotBereich, verbindungenZaehler, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  instanz.hover = null;
  plotBereich.innerHTML = '';

  const { kategorien, orte, links, kategorieBuendelBestandteile, ortBuendelBestandteile } = baueSankeyDaten(records, { zeigeUnsicherheit });
  verbindungenZaehler.textContent = `${links.length} Verbindungen`;

  const breite = options.width || ermittleVerfuegbareBreite(container);
  const hoehePlot = options.height || ermittleVerfuegbareHoehe(plotBereich, { mindestHoehe: 500 });

  const kategorieSummen = new Map(kategorien.map((k) => [k, summeAnzahl(links, 'von', k)]));
  const ortSummen = new Map(orte.map((o) => [o, summeAnzahl(links, 'nach', o)]));

  // Beide Spalten bekommen ihre EIGENE, um den Zwischenraum-Verbrauch
  // (KNOTEN_ABSTAND je Knoten) reduzierte Skala, die kleinere (strengere)
  // gewinnt - garantiert, dass KEINE der beiden Spalten über hoehePlot
  // hinausragt (siehe CHANGELOG (35) für den vollen Root-Cause-Befund).
  const kategorieGesamtSumme = d3.sum(kategorien, (k) => kategorieSummen.get(k));
  const orteGesamtSumme = d3.sum(orte, (o) => ortSummen.get(o));
  const skalaKategorie = (hoehePlot - kategorien.length * KNOTEN_ABSTAND) / kategorieGesamtSumme;
  const skalaOrt = (hoehePlot - orte.length * KNOTEN_ABSTAND) / orteGesamtSumme;
  const skala = Math.min(skalaKategorie, skalaOrt);

  const { positionen: posKategorien } = stapleSpalte(kategorien, kategorieSummen, skala);
  const { positionen: posOrte } = stapleSpalte(orte, ortSummen, skala);

  const xLinks = RAND_KATEGORIE;
  const xRechts = breite - RAND_ORT - KNOTEN_BREITE;

  // Siehe Dateikopf: Ort-Schriftgröße nur reduzieren,
  // wenn die Spalte bei voller Größe rechnerisch nicht hineinpassen würde -
  // die Kategorie-Spalte bleibt IMMER bei LABEL_SCHRIFTGROESSE.
  const benoetigteHoeheOrtStandard = orte.length * (LABEL_SCHRIFTGROESSE + 4);
  const ortSchriftgroesse = benoetigteHoeheOrtStandard > hoehePlot ? LABEL_SCHRIFTGROESSE_ORT_REDUZIERT : LABEL_SCHRIFTGROESSE;

  const svg = d3.select(plotBereich).append('svg')
    .attr(EIGENES_ABDUNKELN_ATTR, '') // Nachbesserung 3, Punkt 4: Sankey dunkelt selbst ab (Bänder/Knoten), keine zweite Abdunkelung
    .attr('width', breite).attr('height', hoehePlot)
    .attr('viewBox', `0 0 ${breite} ${hoehePlot}`)
    .attr('role', 'group') // AUFTRAG D, Punkt 2 (axe nested-interactive): enthält bedienbare Elemente; aria-label bleibt
    .attr('aria-label', 'Kategoriefluss: Urkunden-Kategorien und die darin genannten Orte');

  svg.append('desc').text(
    `Links die Urkunden-Kategorien (mind. ${KATEGORIE_BUENDELUNG_SCHWELLE} Urkunden, sonst unter ` +
    `"${ANDERE_KATEGORIEN}"), rechts die Orte (mind. ${ORT_BUENDELUNG_SCHWELLE} Nennungen, sonst unter ` +
    '"Andere Orte"). Bandbreite zeigt Anzahl verbindender Urkunden, Farbe folgt der Kategorie. ' +
    'Gestrichelter roter Rand kennzeichnet Bänder zu "(ohne Kategorie)"/"(kein Ort)".'
  );

  // Siehe Dateikopf: unsichtbares Hintergrund-Rect als
  // UNTERSTE Ebene - Klick auf die freie Fläche setzt eine fixierte Auswahl
  // zurück. Bänder/Knoten liegen als eigene, spätere Geschwister-Elemente
  // darüber - ein Klick DIREKT auf ein Band/einen Knoten erreicht diesen
  // Handler dadurch strukturell nie (kein stopPropagation nötig, trotzdem
  // zusätzlich im Band-Klick gesetzt, siehe dort - Auftrag: "gegebenenfalls").
  svg.append('rect')
    .attr('width', breite).attr('height', hoehePlot).attr('fill', 'transparent')
    .on('click', () => { if (instanz.auswahl) { instanz.auswahl = null; aktualisiereHighlight(); } });

  const pfade = zeichneVerbindungsEbene(
    svg, links, posKategorien, posOrte, xLinks + KNOTEN_BREITE, xRechts, skala,
    (d) => farbeFuerKategorie(d.von), container, zeigeUnsicherheit
  );
  instanz.pfadeAuswahl = pfade;

  // Siehe Dateikopf: Klick fixiert/löst die Auswahl
  // dieses EINEN Bandes um - über von/nach (nicht Objektreferenz) verglichen,
  // damit die Auswahl auch nach einem Redraw (neue Link-Objekte) gültig
  // bleibt. KEINE Sidebar mehr (das war vorher wie bei Knoten verdrahtet).
  function schalteLinkAuswahl(link) {
    const schonAusgewaehlt = instanz.auswahl?.typ === 'link' && instanz.auswahl.von === link.von && instanz.auswahl.nach === link.nach;
    instanz.auswahl = schonAusgewaehlt ? null : { typ: 'link', von: link.von, nach: link.nach };
    aktualisiereHighlight();
  }
  pfade.attr('role', 'button').attr('aria-label', (d) => `${d.von} → ${d.nach} hervorheben`)
    .style('cursor', 'pointer')
    .on('click', (event, d) => { event.stopPropagation(); schalteLinkAuswahl(d); })
    .on('keydown', (event, d) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      schalteLinkAuswahl(d);
    });

  // Siehe Dateikopf: Knotenklick fixiert jetzt dieselbe
  // Hervorhebung wie Knoten-Hover (aktualisiereHighlight() kennt
  // `aktiv.typ==='kategorie'|'ort'` bereits identisch für beide Quellen,
  // siehe dort) - Knoten-Äquivalent zu schalteLinkAuswahl() oben. KEINE
  // Sidebar mehr (siehe Dateikopf-Kommentar, Punkt 5).
  function schalteKnotenAuswahl(typ, name) {
    const schonAusgewaehlt = instanz.auswahl?.typ === typ && instanz.auswahl.name === name;
    instanz.auswahl = schonAusgewaehlt ? null : { typ, name };
    aktualisiereHighlight();
  }
  // Siehe Dateikopf: Tooltip nutzt jetzt dieselbe
  // Bandbreiten-Summe (kategorieSummen/ortSummen) wie die Balkenhöhe, keine
  // zweite Zählmethode mehr. Sammelknoten-Tooltip siehe
  // formatiereBuendelTooltip().
  const kategorieKnotenAuswahl = zeichneKnotenSpalte(svg, posKategorien, xLinks, farbeFuerKategorie, {
    onKlick: (kategorie) => schalteKnotenAuswahl('kategorie', kategorie),
    tooltipTextFn: (kategorie) => (kategorie === ANDERE_KATEGORIEN
      ? formatiereBuendelTooltip(ANDERE_KATEGORIEN, kategorieSummen.get(kategorie), kategorieBuendelBestandteile)
      : `${kategorie}: ${kategorieSummen.get(kategorie)} Urkunde(n)`),
    onHoverStart: (kategorie) => { instanz.hover = { typ: 'kategorie', name: kategorie }; aktualisiereHighlight(); },
    onHoverEnd: () => { instanz.hover = null; aktualisiereHighlight(); },
    container
  });
  const ortKnotenAuswahl = zeichneKnotenSpalte(svg, posOrte, xRechts, () => NEUTRALE_KNOTEN_FARBE, {
    onKlick: (ort) => schalteKnotenAuswahl('ort', ort),
    tooltipTextFn: (ort) => (ort === ANDERE_ORTE
      ? formatiereBuendelTooltip(ANDERE_ORTE, ortSummen.get(ort), ortBuendelBestandteile)
      : `${ort}: ${ortSummen.get(ort)} Urkunde(n)`),
    onHoverStart: (ort) => { instanz.hover = { typ: 'ort', name: ort }; aktualisiereHighlight(); },
    onHoverEnd: () => { instanz.hover = null; aktualisiereHighlight(); },
    container
  });
  instanz.kategorieKnotenAuswahl = kategorieKnotenAuswahl;
  instanz.ortKnotenAuswahl = ortKnotenAuswahl;

  const kategorieLabels = zeichneLabelSpalte(svg, posKategorien, {
    seiteLinks: true, knotenKanteX: xLinks, labelX: xLinks - LABEL_PUFFER,
    verfuegbareBreite: RAND_KATEGORIE - LABEL_PUFFER - LABEL_RAND_PUFFER, verfuegbareHoehe: hoehePlot, schriftgroesse: LABEL_SCHRIFTGROESSE
  });
  const ortLabels = zeichneLabelSpalte(svg, posOrte, {
    seiteLinks: false, knotenKanteX: xRechts + KNOTEN_BREITE, labelX: xRechts + KNOTEN_BREITE + LABEL_PUFFER,
    verfuegbareBreite: RAND_ORT - LABEL_PUFFER - LABEL_RAND_PUFFER, verfuegbareHoehe: hoehePlot, schriftgroesse: ortSchriftgroesse
  });
  instanz.kategorieLabelAuswahl = kategorieLabels.textAuswahl;
  instanz.kategorieLeitlinienAuswahl = kategorieLabels.leitlinienAuswahl;
  instanz.ortLabelAuswahl = ortLabels.textAuswahl;
  instanz.ortLeitlinienAuswahl = ortLabels.leitlinienAuswahl;

  aktualisiereHighlight();
}

// Siehe Dateikopf: Escape setzt eine fixierte Auswahl
// zurück - app-weiter document-Listener (analog zu infoButton.js' Muster),
// in destroy() wieder entfernt.
function handleEscape(event) {
  if (event.key === 'Escape' && instanz?.auswahl) {
    instanz.auswahl = null;
    aktualisiereHighlight();
  }
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  container.innerHTML = '';
  fuegeStyleEin(container);

  const wurzel = document.createElement('div');
  wurzel.className = 'kos-wurzel';
  container.appendChild(wurzel);

  const kopf = document.createElement('div');
  kopf.className = 'kos-kopf';
  const titel = document.createElement('h2');
  titel.className = 'kos-titel';
  titel.textContent = TITEL_TEXT;

  const kopfRechts = document.createElement('div');
  kopfRechts.className = 'kos-kopf-rechts';
  const verbindungenZaehler = document.createElement('span');
  verbindungenZaehler.className = 'kos-verbindungen-zaehler';
  kopfRechts.appendChild(verbindungenZaehler);
  kopf.append(titel, kopfRechts);
  wurzel.appendChild(kopf);

  const plotBereich = document.createElement('div');
  plotBereich.className = 'kos-plot-bereich';
  wurzel.appendChild(plotBereich);

  instanz = {
    container,
    plotBereich,
    verbindungenZaehler,
    records: data,
    options: { showUncertainty: true, width: null, height: null, ...options },
    infoButton: null,
    pfadeAuswahl: null,
    kategorieKnotenAuswahl: null,
    ortKnotenAuswahl: null,
    kategorieLabelAuswahl: null,
    ortLabelAuswahl: null,
    kategorieLeitlinienAuswahl: null,
    ortLeitlinienAuswahl: null,
    auswahl: null,
    hover: null
  };
  infotextFuerModul('sankey', {
    ORT_BUENDELUNG_SCHWELLE,
    KATEGORIE_BUENDELUNG_SCHWELLE,
    ANDERE_KATEGORIEN
  }).then((cfg) => {
    if (!instanz || !cfg || !kopfRechts.isConnected) return;
    instanz.infoButton = erzeugeInfoButton(kopfRechts, cfg);
  });
  document.addEventListener('keydown', handleEscape);

  zeichneSankey();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneSankey();
}

export function destroy() {
  if (!instanz) return;
  document.removeEventListener('keydown', handleEscape);
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
