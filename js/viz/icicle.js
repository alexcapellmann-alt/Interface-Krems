// js/viz/icicle.js
// Icicle-Diagramm des Gesamtbestands, immer horizontal (Masterprompt Abschnitt
// 13: Wert kodiert sich in der BREITE, nicht in der Höhe - die Höhe kodiert nur
// die Tiefe/Zeile). Modul-Interface siehe Abschnitt 5. Gleiche Datengrundlage
// wie treemap.js/sunburst.js, siehe js/utils/bestandsHierarchie.js.
//
// Auf denselben funktionalen/gestalterischen Stand wie treemap.js/sunburst.js
// gebracht (siehe CHANGELOG.md für Datum/Details): Kategorie-Farbcodierung aus
// js/utils/kategorieFarben.js (importiert, NICHT dupliziert), sqrt-
// Breitenskalierung, Mindestbreiten-Korrektur, Beschriftung, Zoom-Interaktion,
// Sidebar aus js/utils/sidebar.js.
//
// BEWUSSTE MODUL-SPEZIFISCHE AUSNAHME vom 2-Ebenen-Prinzip von treemap.js/
// sunburst.js/circlePacking.js (siehe CHANGELOG): Icicle-Zeilen stapeln sich
// vertikal und konkurrieren nicht um dieselbe Fläche wie Kacheln, Winkel oder
// Kreisradien - eine dritte Zeile kostet nur zusätzliche Höhe, nicht die
// Lesbarkeit der anderen Ebenen. Deshalb zeigt Ebene 1 (Übersicht) DREI
// gleichzeitig sichtbare Zeilen (Kategorie/Unterkategorie/Bestand,
// bestandsHierarchie.js liefert diese Struktur bereits vollständig - siehe
// CHANGELOG für den Root-Cause-Check). Klick auf JEDE Kachel in Ebene 1,
// unabhängig von ihrer Zeile, zoomt einheitlich in "Ebene 2" der jeweils
// zugehörigen Kategorie (kategorieDatenVonKnoten() läuft dafür über
// d.ancestors() bis zur Tiefe 1) - ein Klick wählt NIE direkt einen
// Einzelbestand aus, exakt das bereits für die Treemap etablierte Prinzip
// "Ebene-1-Klick öffnet eine Kategorie, wählt nicht direkt aus".
//
// Ebene 2 (Kategorie-Ansicht) bleibt bei ZWEI Zeilen: oben EIN vollbreites
// "aktuelle Kategorie"-Segment (Breadcrumb/Rücksprung-Fläche, siehe
// wechsleZuKategorie()/wechsleZuWurzel()), darunter die Bestand-Segmente
// dieser Kategorie (Unterkategorie-Zeile verschwindet hier wieder) - NUR in
// dieser Ansicht öffnet ein Klick auf eine Bestand-Kachel die Sidebar
// (Toggle-Verhalten). Rücksprung-Mechanismus (Auftrag verlangt explizit eine
// begründete Wahl): Klick auf GENAU diese obere Zeile - konsistent mit
// Sunburst, wo das Zentrum (die "übergeordnete" Fläche) ebenfalls sowohl
// Zurück-Ziel als auch sichtbarer Kontext-Anker ist, statt einen
// zusätzlichen, an keiner anderen Stelle dieses Projekts verwendeten
// Button-Typ einzuführen.
//
// treemap.js/sunburst.js/circlePacking.js bleiben unverändert beim
// 2-Ebenen-Modell - diese Ausnahme gilt ausschließlich für Icicle.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { baueBestandsHierarchie, baueTooltipText, OHNE_KATEGORIE } from '../utils/bestandsHierarchie.js';
import {
  passendeTextfarbe,
  baueKategorieFarbSkala,
  OHNE_KATEGORIE_FARBE,
  farbeFuerUnterkategorie
} from '../utils/kategorieFarben.js';
import {
  baueSidebarGeruest,
  oeffneSidebar as oeffneSidebarModul,
  schliesseSidebar as schliesseSidebarModul,
  fuegeSidebarStyleEin
} from '../utils/sidebar.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { ermittleBeschriftungstext } from '../utils/beschriftung.js';

const ICICLE_INFO_TEXT = `Dieses Icicle-Diagramm zeigt die Bestände als gestapelte, horizontale Ebenen: Kategorie, Unterkategorie und einzelner Bestand. Die Breite jedes Abschnitts entspricht seinem Umfang in Laufmetern.

Klick auf eine Kategorie oder Unterkategorie führt weiter in die nächste Ebene, Klick auf einen einzelnen Bestand öffnet die Detailansicht in der Seitenleiste.`;

const MIN_SCHRIFTGROESSE = 11; // dieselbe Richtgröße wie treemap.js/sunburst.js
const MINDESTBREITE_PX = 24; // dasselbe Fitts'sches-Gesetz-Ziel wie treemap.js' MINDESTHOEHE_ZELLE - hier direkt in Pixeln, keine Radius-Umrechnung nötig (im Unterschied zu sunburst.js' Winkel)
const ZEILE_HOEHE = 60; // feste Höhe je Zeile (Kategorie/Unterkategorie/Breadcrumb) - die jeweils letzte Zeile (Bestand) nimmt die restliche Höhe
const WARN_SYMBOL = '⚠';
const AUSWAHL_FARBE = '#e07820';

// Größenberechnung (Root-Cause-Check, Schritt 1): derselbe eigene, kleinere
// Mindestwert wie treemap.js/sunburst.js - bewusst NICHT der gemeinsame
// Default (10) in bestandsHierarchie.js, der bei diesen Daten (Median
// umfang_lfm 0,2 lfm) praktisch alle Bestände auf denselben Wert geflooert
// und jede sqrt-Breitenskalierung wirkungslos gemacht hätte (identischer
// Fehler wie ursprünglich bei treemap.js, dann bei sunburst.js bestätigt -
// hier VOR jeder Umsetzung aktiv geprüft, siehe CHANGELOG).
const MINDESTGROESSE_ROH_ICICLE = 0.05;

let instanz = null; // { container, svgBereich, hierarchieDaten, kategorieFarbSkala, options, aktuelleKategorieDaten, ausgewaehlterName, sidebar, infoButton }

function istUnsicherenKnoten(d, zeigeUnsicherheit) {
  return zeigeUnsicherheit && d.data.record && d.data.record.daten_unsicher;
}

// Icicle-Segmente sind Rechtecke - die Standard-Fokusrahmen-Bounding-Box
// entspricht hier der sichtbaren Form (wie bei treemap.js' Kacheln), der bei
// Sunburst/Circle Packing nötige eigene Fokus-Indikator ist hier NICHT
// erforderlich (siehe Auftrag: "bei Icicle unproblematisch, da rechteckig") -
// bewusst KEINE outline-Unterdrückung hier, Standard-Fokusrahmen bleibt aktiv.

// Post-Layout-Korrektur: analog zu sunburst.js' korrigiereWinkelFuerGeschwister(),
// aber für eine lineare Pixel-Breite statt eines Winkels - strukturell
// identisch (1D-Intervall, von d3.partition() bereits überlappungsfrei
// zugeteilt), nur ohne die Radius-zu-Bogenlänge-Umrechnung, da hier direkt in
// Pixeln gerechnet wird. Wasserfüllungsverfahren: zu schmale Segmente zuerst
// auf die Mindestbreite fixiert, das Defizit anteilig von den verbleibenden
// (noch nicht fixierten) Geschwistern abgezogen, iterativ bis stabil.
// RECHNERISCH UNMÖGLICHER FALL (siehe CHANGELOG, Präzedenzfall Treemap/
// Sunburst): reicht die gesamte verfügbare Breite nicht für alle betroffenen
// Segmente gleichzeitig aus, wird NICHTS korrigiert - Segmente bleiben an
// ihrer regulären, wertproportionalen Position, kein neuer Stapel-Mechanismus.
// KORRIGIERT NUR X0/X1 der übergebenen Liste selbst - ruft diese Funktion
// jemand mit den Knoten EINER ganzen Zeile auf, während diese Zeile Kinder
// unterschiedlicher Eltern aus der Zeile darüber enthält, bricht das die
// Verschachtelung zur Elternebene (siehe korrigierePropagiertProElternteil()
// weiter unten, das genau das verhindert) - deshalb wird diese Funktion NUR
// noch pro Elternteil aufgerufen, nie mehr global über eine ganze Zeile mit
// mehreren Eltern.
function korrigiereBreiteFuerGeschwister(knotenListe, mindestBreite) {
  if (knotenListe.length === 0) return;
  const gesamtStart = knotenListe[0].x0;
  const gesamtEnde = knotenListe[knotenListe.length - 1].x1;
  const gesamtBreite = gesamtEnde - gesamtStart;

  const mengen = knotenListe.map((k) => ({ knoten: k, breite: k.x1 - k.x0, fixiert: false }));
  const anfangsZuSchmal = mengen.filter((m) => m.breite < mindestBreite);
  if (anfangsZuSchmal.length === 0) return;
  if (anfangsZuSchmal.length * mindestBreite > gesamtBreite) return;

  anfangsZuSchmal.forEach((m) => { m.breite = mindestBreite; m.fixiert = true; });

  for (let runde = 0; runde < mengen.length; runde += 1) {
    const fixierteSumme = mengen.filter((m) => m.fixiert).reduce((s, m) => s + m.breite, 0);
    const frei = mengen.filter((m) => !m.fixiert);
    if (frei.length === 0) break;
    const zielFreiSumme = gesamtBreite - fixierteSumme;
    const bisherigeFreiSumme = frei.reduce((s, m) => s + m.breite, 0);
    const faktor = zielFreiSumme / bisherigeFreiSumme;

    let neueFixierung = false;
    frei.forEach((m) => {
      const neueBreite = m.breite * faktor;
      if (neueBreite < mindestBreite) {
        m.breite = mindestBreite;
        m.fixiert = true;
        neueFixierung = true;
      } else {
        m.breite = neueBreite;
      }
    });
    if (!neueFixierung) break;
  }

  let cursor = gesamtStart;
  mengen.forEach((m) => {
    m.knoten.x0 = cursor;
    m.knoten.x1 = cursor + m.breite;
    cursor = m.knoten.x1;
  });
}

// Skaliert linear ALLE Nachkommen (jeder Tiefe) von elternKnoten von dessen
// ALTER x0/x1-Spanne (vor einer Korrektur des Elternknotens selbst) in seine
// NEUE Spanne - hält die Verschachtelung konsistent, nachdem sich ein
// Elternknoten durch korrigiereBreiteFuerGeschwister() verschoben hat. Ohne
// diesen Schritt (siehe CHANGELOG, Nutzer-Rückmeldung "Kategoriegrenze
// verschiebt sich zwischen den Zeilen um mehrere hundert Pixel") lägen
// Unterkategorie-/Bestand-Kacheln nicht mehr innerhalb der x-Spanne ihrer
// Kategorie-Kachel aus Zeile 1, sobald DORT tatsächlich korrigiert wurde -
// exakt der vom Nutzer entdeckte Fehler.
function skaliereNachkommenX(elternKnoten, altX0, altX1) {
  const altSpanne = altX1 - altX0;
  if (altSpanne <= 0) return;
  const neuSpanne = elternKnoten.x1 - elternKnoten.x0;
  const faktor = neuSpanne / altSpanne;
  elternKnoten.each((nachfahre) => {
    if (nachfahre === elternKnoten) return;
    nachfahre.x0 = elternKnoten.x0 + (nachfahre.x0 - altX0) * faktor;
    nachfahre.x1 = elternKnoten.x0 + (nachfahre.x1 - altX0) * faktor;
  });
}

// Wendet korrigiereBreiteFuerGeschwister() GETRENNT auf die Kinder JEDES
// einzelnen Elternknotens an (statt einmal global über alle Knoten einer
// Zeile) - jede Gruppe bleibt dadurch strikt innerhalb der (ggf. bereits
// selbst korrigierten) Spanne ihres eigenen Elternteils. Zieht anschließend
// die jeweiligen Nachkommen jedes korrigierten Kindes nach (skaliereNachkommenX),
// damit die nächsttiefere Zeile wieder mit korrekten, verschachtelten
// Ausgangsspannen arbeitet.
function korrigierePropagiertProElternteil(elternKnotenListe, mindestBreite) {
  const ergebnis = [];
  elternKnotenListe.forEach((eltern) => {
    const kinder = eltern.children || [];
    const altSpannen = kinder.map((k) => ({ x0: k.x0, x1: k.x1 }));
    korrigiereBreiteFuerGeschwister(kinder, mindestBreite);
    kinder.forEach((k, i) => {
      const alt = altSpannen[i];
      if (k.x0 !== alt.x0 || k.x1 !== alt.x1) skaliereNachkommenX(k, alt.x0, alt.x1);
    });
    ergebnis.push(...kinder);
  });
  return ergebnis;
}

// Auto-Fit einzeilige Beschriftung (analog zu sunburst.js' Ansatz - bewusst
// einzeilig statt mehrzeilig wie treemap.js, für Konsistenz zwischen den
// beiden zuletzt gebauten Modulen und weil Icicle-Segmente in der Regel
// breiter als hoch sind). "Name only" (kein Umfang). NEU (Auftrag
// "Beschriftungs-Kürzung mit Ellipse", siehe CHANGELOG): passt der Name bei
// KEINER erlaubten Schriftgröße vollständig, wird bei MIN_SCHRIFTGROESSE eine
// mit "…" gekürzte Fassung versucht (js/utils/beschriftung.js, gemeinsam mit
// treemap.js/sunburst.js/circlePacking.js genutzt) statt komplett auf ein
// Label zu verzichten - passt selbst das nicht, bleibt der Name weiterhin
// ausschließlich über Tooltip erreichbar (unverändert, da Tooltip in diesem
// Modul ohnehin unconditional gewirt wird, siehe wireTooltip()-Aufruf am Ende
// von zeichneIcicle()s Zeichenschleife - kein separater Tooltip-Ersatz-Zweig
// wie bei treemap.js nötig).
function platziereBeschriftung(gruppe, text, breite, hoehe, textFarbe) {
  if (breite <= 20 || hoehe <= 14) return false;
  const maxSchrift = Math.max(MIN_SCHRIFTGROESSE, Math.min(15, breite / 6));
  for (let versuch = maxSchrift; versuch >= MIN_SCHRIFTGROESSE; versuch -= 1) {
    if (versuch + 4 > hoehe) continue;
    const zeichenBreite = versuch * 0.57;
    if (text.length * zeichenBreite <= breite - 8) {
      gruppe.append('text')
        .attr('x', 4).attr('y', Math.min(versuch + 3, hoehe - 4))
        .attr('fill', textFarbe).attr('font-size', versuch)
        .text(text);
      return true;
    }
  }

  if (MIN_SCHRIFTGROESSE + 4 > hoehe) return false;
  const gekuerzterText = ermittleBeschriftungstext(text, breite - 8, MIN_SCHRIFTGROESSE);
  if (!gekuerzterText) return false;
  gruppe.append('text')
    .attr('x', 4).attr('y', Math.min(MIN_SCHRIFTGROESSE + 3, hoehe - 4))
    .attr('fill', textFarbe).attr('font-size', MIN_SCHRIFTGROESSE)
    .text(gekuerzterText);
  return true;
}

function wireTooltip(auswahl, textFn, container) {
  auswahl
    .on('mouseenter.tooltip focus.tooltip', function mouseenterFocus(event, d) { zeigeTooltip(textFn(d), this, container); })
    .on('mouseleave.tooltip blur.tooltip', () => versteckeTooltip());
}

function faerbeKategorieSegment(kategorieName) {
  return kategorieName === OHNE_KATEGORIE ? OHNE_KATEGORIE_FARBE : instanz.kategorieFarbSkala(kategorieName);
}

// bestandKnoten.parent ist immer die Unterkategorie (dieselbe Struktur wie
// treemap.js/sunburst.js, da bestandsHierarchie.js die volle Tiefe liefert) -
// dieselbe Funktion färbt jetzt sowohl Bestand-Blätter als auch (mit dem
// Unterkategorie-Knoten selbst als zweitem Argument) die neue
// Unterkategorie-Zeile in Ebene 1, siehe faerbeUnterkategorieSegment().
function faerbeBestandSegment(bestandKnoten, kategorieName) {
  if (kategorieName === OHNE_KATEGORIE) return OHNE_KATEGORIE_FARBE;
  const basis = instanz.kategorieFarbSkala(kategorieName);
  return farbeFuerUnterkategorie(basis, bestandKnoten.parent);
}

// Die Unterkategorie-Zeile ist NUR in Ebene 1 dieses Moduls sichtbar (siehe
// Dateikopf-Kommentar) - treemap.js/sunburst.js nutzen dieselbe
// farbeFuerUnterkategorie() bereits für die Feinabstufung von Bestand-
// Blättern; hier wird sie direkt auf den Unterkategorie-Knoten selbst
// angewendet (der bereits die von der Funktion erwartete Form hat: .parent
// ist die Kategorie, .parent.children sind die Geschwister-Unterkategorien).
function faerbeUnterkategorieSegment(unterkategorieKnoten, kategorieName) {
  if (kategorieName === OHNE_KATEGORIE) return OHNE_KATEGORIE_FARBE;
  const basis = instanz.kategorieFarbSkala(kategorieName);
  return farbeFuerUnterkategorie(basis, unterkategorieKnoten);
}

// Ermittelt für einen Knoten JEDER Tiefe (Kategorie/Unterkategorie/Bestand)
// die zugehörigen Kategorie-DATEN (nicht nur den Namen) - wird für den
// einheitlichen "Klick zoomt in Ebene 2 der zugehörigen Kategorie"-
// Mechanismus in Ebene 1 gebraucht (Schritt 3): unabhängig davon, in
// welcher Zeile geklickt wird, muss dieselbe Kategorie-Ansicht geöffnet
// werden. Robust über d.ancestors() (wie bestandsHierarchie.js'
// kategorieVonKnoten(), hier aber die vollen Daten statt nur den Namen).
function kategorieDatenVonKnoten(d) {
  if (d.depth === 1) return d.data;
  return d.ancestors().find((vorfahre) => vorfahre.depth === 1).data;
}

function wechsleZuKategorie(kategorieDaten) {
  instanz.aktuelleKategorieDaten = kategorieDaten;
  instanz.ausgewaehlterName = null;
  schliesseSidebarModul(instanz.sidebar, instanz.svgBereich);
  zeichneIcicle();
}

function wechsleZuWurzel() {
  instanz.aktuelleKategorieDaten = null;
  instanz.ausgewaehlterName = null;
  schliesseSidebarModul(instanz.sidebar, instanz.svgBereich);
  zeichneIcicle();
}

// Klick auf ein BEREITS ausgewähltes Bestand-Segment schaltet ab (Sidebar
// schließt, Hervorhebung verschwindet) - Klick auf ein ANDERES Segment wählt
// es regulär aus (Toggle, analog zum bereits behobenen Treemap/Sunburst-Bug).
function waehleBestand(datenKnoten) {
  if (instanz.ausgewaehlterName === datenKnoten.name) {
    instanz.ausgewaehlterName = null;
    zeichneIcicle();
    schliesseSidebarModul(instanz.sidebar, instanz.svgBereich);
    instanz.svgBereich.focus();
    return;
  }
  instanz.ausgewaehlterName = datenKnoten.name;
  zeichneIcicle();
  const kategorieName = instanz.aktuelleKategorieDaten.name;
  const kategorieFarbe = kategorieName === OHNE_KATEGORIE ? OHNE_KATEGORIE_FARBE : instanz.kategorieFarbSkala(kategorieName);
  oeffneSidebarModul(instanz.sidebar, datenKnoten.record, { kategorieName, kategorieFarbe });
}

function zeichneIcicle() {
  const { svgBereich, hierarchieDaten, options, aktuelleKategorieDaten } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  svgBereich.innerHTML = '';

  const breite = options.width || svgBereich.clientWidth || 900;
  const hoehe = options.height || svgBereich.clientHeight || 600;
  const inKategorieAnsicht = !!aktuelleKategorieDaten;

  const anzeigeDaten = aktuelleKategorieDaten || hierarchieDaten;
  const wurzel = d3.hierarchy(anzeigeDaten).sum((d) => Math.sqrt(d.value || 0)).sort((a, b) => b.value - a.value);
  d3.partition().size([breite, hoehe])(wurzel);

  // Ebene 1 (Übersicht): DREI Zeilen gleichzeitig (siehe Dateikopf-
  // Kommentar). d3.partition() liefert initial perfekt verschachtelte x0/x1
  // (jede Elternspanne wird exakt auf ihre Kinder aufgeteilt) - die
  // Mindestbreiten-Korrektur DARF diese Verschachtelung aber nicht brechen:
  // eine erste Fassung korrigierte alle drei Zeilen unabhängig als je EINE
  // globale Gruppe - das verschob Unterkategorie-/Bestand-Kacheln aus der
  // x-Spanne ihrer Kategorie-Kachel heraus, sobald DORT tatsächlich
  // korrigiert wurde (per Nutzer-Rückmeldung am Übergang "Vermögen und
  // Finanzen"/"Verwaltung" entdeckt, siehe CHANGELOG). Behoben durch
  // HIERARCHISCHE Korrektur: Zeile 1 zuerst (global, keine übergeordnete
  // Ebene schränkt sie ein), danach werden alle Nachkommen jeder korrigierten
  // Kategorie proportional nachgezogen (skaliereNachkommenX()); erst DANACH
  // wird Zeile 2 PRO KATEGORIE korrigiert (nicht global) und ihre eigenen
  // Nachkommen nachgezogen; erst danach Zeile 3 PRO UNTERKATEGORIE korrigiert
  // (korrigierePropagiertProElternteil()). Jede Zeile arbeitet dadurch immer
  // innerhalb der bereits korrekten Spanne ihres unmittelbaren Elternteils.
  //
  // Ebene 2 (Kategorie-Ansicht): ZWEI Zeilen - oben das Breadcrumb-Segment
  // (kein echter d3-Knoten, sondern ein einfaches Objekt in derselben Form),
  // darunter alle Bestand-Blätter dieser Kategorie (überspringt die
  // Unterkategorie-Ebene, wie schon zuvor).
  let zeilen;
  if (inKategorieAnsicht) {
    const breadcrumbZeile = [{ x0: 0, x1: breite, y0: 0, y1: ZEILE_HOEHE, data: aktuelleKategorieDaten, depth: 0 }];
    const bestandZeile = wurzel.leaves().sort((a, b) => a.x0 - b.x0);
    bestandZeile.forEach((k) => { k.y0 = ZEILE_HOEHE; k.y1 = hoehe; });
    korrigiereBreiteFuerGeschwister(bestandZeile, MINDESTBREITE_PX);
    zeilen = [
      { klasse: 'icicle-breadcrumb', knoten: breadcrumbZeile, art: 'breadcrumb', klick: 'zurueck' },
      { klasse: 'icicle-bestand', knoten: bestandZeile, art: 'bestand', klick: 'waehlen' }
    ];
  } else {
    const restHoehe = Math.max(hoehe - 2 * ZEILE_HOEHE, 20);

    // Hierarchische Korrektur (siehe Kommentar oben): [wurzel] als einziger
    // "Elternteil" für Zeile 1 reproduziert die ursprüngliche globale
    // Korrektur (Kategorien teilen sich ohnehin die volle Spanne [0, breite]
    // der Wurzel), Zeile 2/3 laufen danach je PRO ELTERNTEIL - jede Zeile
    // erhält dadurch garantiert nur Spannen innerhalb ihres unmittelbaren
    // Elternteils aus der Zeile darüber. Die Reihenfolge bleibt dabei
    // durchgehend x0-aufsteigend (Kategorien sind es bereits durch
    // d3.partition(), jede Kategorie trägt nur ihre EIGENEN, ebenfalls
    // x0-aufsteigenden Nachkommen bei - keine zusätzliche Sortierung nötig).
    const kategorieZeile = korrigierePropagiertProElternteil([wurzel], MINDESTBREITE_PX);
    const unterkategorieZeile = korrigierePropagiertProElternteil(kategorieZeile, MINDESTBREITE_PX);
    const bestandZeile = korrigierePropagiertProElternteil(unterkategorieZeile, MINDESTBREITE_PX);

    kategorieZeile.forEach((k) => { k.y0 = 0; k.y1 = ZEILE_HOEHE; });
    unterkategorieZeile.forEach((k) => { k.y0 = ZEILE_HOEHE; k.y1 = 2 * ZEILE_HOEHE; });
    bestandZeile.forEach((k) => { k.y0 = 2 * ZEILE_HOEHE; k.y1 = 2 * ZEILE_HOEHE + restHoehe; });

    zeilen = [
      { klasse: 'icicle-kategorie', knoten: kategorieZeile, art: 'kategorie', klick: 'zoomen' },
      { klasse: 'icicle-unterkategorie', knoten: unterkategorieZeile, art: 'unterkategorie', klick: 'zoomen' },
      { klasse: 'icicle-bestand', knoten: bestandZeile, art: 'bestand', klick: 'zoomen' }
    ];
  }

  const svg = d3.select(svgBereich)
    .append('svg')
    .attr('width', breite)
    .attr('height', hoehe)
    .attr('viewBox', `0 0 ${breite} ${hoehe}`)
    .attr('role', 'img')
    .attr('aria-label', inKategorieAnsicht
      ? `Bestände der Kategorie ${aktuelleKategorieDaten.name}`
      : 'Icicle-Diagramm des Gesamtbestands, mit Kategorie-, Unterkategorie- und Bestand-Zeile');

  svg.append('desc').text(inKategorieAnsicht
    ? 'Horizontales Icicle-Diagramm, Kategorie-Ansicht: oben ein Rücksprung-Feld ' +
      'mit dem Kategorienamen, darunter die Bestände dieser Kategorie. Breite ' +
      'nach Umfang in Laufmetern (Quadratwurzel-skaliert). Klick auf einen ' +
      'Bestand öffnet Details in der Seitenleiste.'
    : 'Horizontales Icicle-Diagramm: obere Zeile Kategorien, mittlere Zeile ' +
      'Unterkategorien, untere Zeile einzelne Bestände - alle drei Zeilen ' +
      'gleichzeitig sichtbar. Breite nach Umfang in Laufmetern (Quadratwurzel- ' +
      'skaliert). Farbton zeigt die Kategorie, Helligkeit die Unterkategorie; ' +
      '"ohne Kategorie" erscheint neutral grau mit Punktmuster. Klick auf eine ' +
      'Kachel in jeder der drei Zeilen öffnet dieselbe Kategorie-Ansicht. ' +
      'Gestrichelter roter Rand, Warnsymbol und Schraffur kennzeichnen ' +
      'unsichere Angaben.'
  );

  const defs = svg.append('defs');
  defs.append('pattern')
    .attr('id', 'icicle-unsicher-schraffur')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 8).attr('height', 8)
    .append('path')
    .attr('d', 'M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4')
    .attr('stroke', '#aaaaaa').attr('stroke-width', 1.5).attr('opacity', 0.45);
  const musterOhneKategorie = defs.append('pattern')
    .attr('id', 'icicle-ohne-kategorie-muster')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 6).attr('height', 6);
  musterOhneKategorie.append('circle').attr('cx', 3).attr('cy', 3).attr('r', 1).attr('fill', '#ffffff').attr('opacity', 0.55);

  function zeichneSegment(gruppe, d, farbe, istUnsicher, ohneKategorie, istAusgewaehlt) {
    const b = Math.max(d.x1 - d.x0, 0);
    const h = Math.max(d.y1 - d.y0, 0);
    gruppe.append('rect')
      .attr('class', 'icicle-rand')
      .attr('width', b).attr('height', h)
      .attr('fill', farbe)
      .attr('stroke', istAusgewaehlt ? AUSWAHL_FARBE : (istUnsicher ? '#c0392b' : '#ffffff'))
      .attr('stroke-width', istAusgewaehlt || istUnsicher ? 2 : 1)
      .attr('stroke-dasharray', istUnsicher || ohneKategorie ? '4,3' : null);
    if (ohneKategorie) {
      gruppe.append('rect').attr('width', b).attr('height', h).attr('fill', 'url(#icicle-ohne-kategorie-muster)').attr('pointer-events', 'none');
    }
    if (istUnsicher) {
      gruppe.append('rect').attr('width', b).attr('height', h).attr('fill', 'url(#icicle-unsicher-schraffur)').attr('pointer-events', 'none');
      gruppe.append('text').attr('x', Math.max(b - 14, 2)).attr('y', 13).attr('aria-hidden', 'true').attr('font-size', 11).text(WARN_SYMBOL);
    }
    return { breite: b, hoehe: h };
  }

  // Eine gemeinsame Zeichenfunktion für alle vier Kachel-Arten (Kategorie/
  // Unterkategorie/Bestand-Übersicht/Bestand-Auswahl) statt vier getrennter,
  // fast identischer Blöcke - "art" bestimmt Farbe/Beschriftung/Tooltip,
  // "klick" bestimmt das Interaktionsverhalten (Schritt 3: in Ebene 1 zoomen
  // ALLE drei Zeilen in dieselbe Kategorie-Ansicht, unabhängig davon, in
  // welcher Zeile geklickt wurde - erst in Ebene 2 wählt ein Klick auf
  // Bestand tatsächlich aus und öffnet die Sidebar).
  zeilen.forEach(({ klasse, knoten, art, klick }) => {
    const gruppen = svg.selectAll(`g.${klasse}`)
      .data(knoten)
      .join('g')
      .attr('class', klasse)
      .attr('tabindex', 0)
      .attr('transform', (d) => `translate(${d.x0},${d.y0})`);

    gruppen.each(function jedeGruppe(d) {
      const gruppe = d3.select(this);
      let farbe;
      let name;
      let tooltipFn;
      let istUnsicher = false;
      let istAusgewaehlt = false;
      let ohneKategorie;

      if (art === 'breadcrumb') {
        const kategorieName = d.data.name;
        ohneKategorie = kategorieName === OHNE_KATEGORIE;
        farbe = faerbeKategorieSegment(kategorieName);
        name = `← ${kategorieName}`;
        tooltipFn = () => `Zurück zu allen Kategorien (aktuell: ${kategorieName})`;
      } else {
        const kategorieDaten = kategorieDatenVonKnoten(d);
        const kategorieName = kategorieDaten.name;
        ohneKategorie = kategorieName === OHNE_KATEGORIE;
        if (art === 'kategorie') {
          farbe = faerbeKategorieSegment(kategorieName);
          name = kategorieName;
          tooltipFn = () => `${kategorieName} (${d.leaves().length} Bestände)`;
        } else if (art === 'unterkategorie') {
          farbe = faerbeUnterkategorieSegment(d, kategorieName);
          name = d.data.name;
          tooltipFn = () => `${d.data.name} (Kategorie: ${kategorieName}, ${d.leaves().length} Bestände)`;
        } else {
          farbe = faerbeBestandSegment(d, kategorieName);
          name = d.data.name;
          tooltipFn = () => baueTooltipText(d);
          // Auswahl/Unsicher-Kennzeichnung gilt nur in Ebene 2 (klick ===
          // 'waehlen') - in Ebene 1 zoomt ein Bestand-Klick nur in die
          // Kategorie, es gibt dort kein Auswahlkonzept (Schritt 3).
          if (klick === 'waehlen') {
            istUnsicher = istUnsicherenKnoten(d, zeigeUnsicherheit);
            istAusgewaehlt = instanz.ausgewaehlterName === d.data.name;
          }
        }
      }

      const textFarbe = passendeTextfarbe(farbe);
      const { breite: b, hoehe: h } = zeichneSegment(gruppe, d, farbe, istUnsicher, ohneKategorie, istAusgewaehlt);
      platziereBeschriftung(gruppe, name, b, h, textFarbe);

      if (klick === 'zurueck') {
        gruppe.style('cursor', 'pointer').attr('role', 'button')
          .attr('aria-label', `Zurück zur Übersicht aller Kategorien (aktuell: ${d.data.name})`)
          .on('click', wechsleZuWurzel)
          .on('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); wechsleZuWurzel(); } });
      } else if (klick === 'zoomen') {
        const kategorieDaten = kategorieDatenVonKnoten(d);
        gruppe.style('cursor', 'zoom-in').attr('role', 'button')
          .attr('aria-label', `Kategorie ${kategorieDaten.name} öffnen`)
          .on('click', () => wechsleZuKategorie(kategorieDaten))
          .on('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); wechsleZuKategorie(kategorieDaten); } });
      } else {
        gruppe.style('cursor', 'pointer').attr('role', 'button')
          .attr('aria-label', `${d.data.name} auswählen`)
          .on('click', () => waehleBestand(d.data))
          .on('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); waehleBestand(d.data); } });
      }
      wireTooltip(gruppe, tooltipFn, svgBereich);
    });
  });
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  container.innerHTML = '';

  // Bugfix (Auftrag "Icicle Info-Button-Position korrigieren"): der zuvor
  // hier verwendete absolut positionierte Anker (top:0; right:0; wie bei
  // sunburst.js) lag bei Icicle über echten Datenelementen - anders als bei
  // Sunburst, wo die Zeichnung ein in die Fläche einbeschriebener KREIS ist
  // (die obere rechte Ecke bleibt dadurch von selbst leer), füllt Icicles
  // erste Zeile (Kategorie-Kacheln) die GESAMTE Breite bis zum rechten Rand
  // aus - der Anker lag deshalb direkt auf der ersten Kachel ("Gesundheit").
  // Fix: eigener, schmaler Streifen oberhalb der Zeichenfläche im normalen
  // Dokumentfluss (dasselbe bereits bewährte Muster wie
  // circlePacking.js' `.circlepacking-werkzeugleiste` + `.circlepacking-svg-
  // bereich` - dort ohne Überlauf-Probleme im Einsatz) statt absoluter
  // Überlagerung - schiebt die Zeichenfläche strukturell nach unten, statt
  // sich mit ihr zu überschneiden.
  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'icicle-werkzeugleiste';

  const svgBereich = document.createElement('div');
  svgBereich.className = 'icicle-svg-bereich';
  svgBereich.setAttribute('tabindex', '-1');
  container.append(werkzeugleiste, svgBereich);

  const style = document.createElement('style');
  style.textContent = `
    .icicle-svg-bereich { height: 100%; }
    .icicle-werkzeugleiste { display: flex; justify-content: flex-end; align-items: center; min-height: 44px; margin: 0 0 var(--space-2) 0; flex: 0 0 auto; }
  `;
  container.appendChild(style);
  fuegeSidebarStyleEin(container);
  const sidebar = baueSidebarGeruest(container);

  // Info-Button wird bewusst NUR EINMAL pro render() erzeugt, nicht bei
  // jedem Redraw neu (würde sonst bei jedem Klick neue document-Listener
  // registrieren, siehe infoButton.js) - werkzeugleiste selbst wird von
  // zeichneIcicle() nie angetastet (nur svgBereich wird dort geleert/neu
  // gezeichnet), der Info-Button bleibt also über alle Redraws hinweg
  // bestehen.
  const infoButton = erzeugeInfoButton(werkzeugleiste, {
    text: ICICLE_INFO_TEXT,
    ariaLabel: 'Erklärung zum Icicle-Diagramm'
  });

  const hierarchieDaten = baueBestandsHierarchie(data, MINDESTGROESSE_ROH_ICICLE);
  const kategorienNamen = hierarchieDaten.children.map((k) => k.name).filter((name) => name !== OHNE_KATEGORIE).sort((a, b) => a.localeCompare(b));

  instanz = {
    container,
    hierarchieDaten,
    kategorieFarbSkala: baueKategorieFarbSkala(kategorienNamen),
    options: { showUncertainty: true, width: null, height: null, ...options },
    aktuelleKategorieDaten: null,
    ausgewaehlterName: null,
    svgBereich,
    sidebar,
    infoButton
  };
  sidebar.schliessenBtn.addEventListener('click', () => schliesseSidebarModul(instanz.sidebar, instanz.svgBereich));
  zeichneIcicle();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneIcicle();
}

export function destroy() {
  if (!instanz) return;
  instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
