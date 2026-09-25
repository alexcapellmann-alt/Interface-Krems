// js/viz/sunburst.js
// Sunburst des Gesamtbestands (Abschnitt 4.1, 9). Modul-Interface siehe Abschnitt 5:
// render(container, data, options) / destroy() / resize(). Gleiche Datengrundlage
// wie treemap.js, siehe js/utils/bestandsHierarchie.js.
//
// Überarbeitung (siehe CHANGELOG.md für Datum/Details): auf denselben
// funktionalen/gestalterischen Stand wie treemap.js gebracht - Kategorie-
// Farbcodierung (aus js/utils/kategorieFarben.js importiert, NICHT dupliziert),
// sqrt-Winkelskalierung, Mindestwinkel-Korrektur, Beschriftung, Zoom-Interaktion.
//
// ZWEI NAVIGATIONSZUSTÄNDE bleiben bestehen (Übersicht/Kategorie-Ansicht,
// instanz.aktuelleKategorieDaten hält den Zustand, exakt dasselbe Namens-/
// Architekturmuster wie treemap.js' aktuelleKategorieDaten) - GEÄNDERT hat
// sich, WIE VIELE Ebenen pro Zustand gleichzeitig als Ring sichtbar sind,
// siehe Auftrag "Sunburst – Rückkehr zur 3-Ebenen-Ansicht":
//
// BEWUSSTE MODUL-SPEZIFISCHE AUSNAHME vom 2-Ebenen-Prinzip von treemap.js/
// circlePacking.js (siehe CHANGELOG, analog zu icicle.js' bereits
// bestehender Ausnahme): die radiale Geometrie erlaubt zusätzliche
// konzentrische Ringe ohne Lesbarkeitsverlust der äußeren Ringe - anders als
// bei Treemap/Circle Packing, wo eine dritte verschachtelte Ebene die
// äußeren Kacheln/Kreise auf Kosten der Lesbarkeit verkleinern würde. Übersicht
// (Ebene 1) zeigt DREI gleichzeitig sichtbare, konzentrische Ringe (Kategorie
// innen, Unterkategorie mittig, Bestand außen; "ohne Kategorie" bleibt auf
// allen drei Ringen konsistent eine dauerhafte eigene Gruppe). Klick auf JEDES
// Segment in JEDEM der drei Ringe zoomt einheitlich in die Kategorie-Ansicht
// der jeweils zugehörigen Kategorie (kategorieDatenVonKnoten() läuft dafür
// über d.ancestors() bis zur Tiefe 1, analog zu icicle.js) - ein Klick wählt
// NIE direkt einen Einzelbestand aus, dasselbe bereits für Treemap/Icicle
// etablierte Prinzip "Ring-1-Klick öffnet eine Kategorie, wählt nicht direkt
// aus".
//
// Kategorie-Ansicht (Ebene 2) zeigt - ANDERS als icicle.js, wo die
// Unterkategorie-Zeile beim Zoom wieder verschwindet - weiterhin ZWEI Ringe:
// Unterkategorien dieser einen Kategorie innen, deren Einzelbestände außen;
// die Kategorie-Ebene selbst wird zum Zentrum (unverändert, Klick dort
// navigiert zurück zu Ebene 1). Klick auf ein Bestand-Segment öffnet/
// schließt (Toggle) die Sidebar wie bisher. Klick auf ein Unterkategorie-
// Segment bleibt hier bewusst OHNE Wirkung (kein Zeigercursor, kein Klick-/
// Tastatur-Handler, aber weiterhin per Hover/Fokus mit Tooltip erreichbar) -
// dieselbe "reine Information, kein Klick-Ziel"-Konvention, die dieses Modul
// bereits für das Zentrum in der Übersicht etabliert hat (siehe dortiger
// Kommentar in zeichneZentrum(): "vermeidet genau die ... Verwechslung
// 'sieht klickbar aus, ist es aber nicht'"). Eine Unterkategorie-Gruppe hat
// keinen einzelnen `record` für die Sidebar (die Detailansicht ist strikt
// pro Bestand konzipiert, siehe sidebar.js' Nicht-Ziel "keine Änderung am
// Sidebar-Wrapper-Muster") und es gibt - anders als bei Kategorien - keine
// weitere Zoom-Ebene darunter, in die ein Klick sinnvoll führen könnte: die
// Kategorie-Ansicht IST bereits die tiefste Navigationsebene dieses Moduls.
//
// treemap.js/circlePacking.js bleiben unverändert beim 2-Ebenen-Modell -
// diese Ausnahme gilt (wie bei icicle.js) ausschließlich für Sunburst.
//
// bestandsHierarchie.js liefert weiterhin dieselbe volle 4-Ebenen-Struktur
// (Gesamtbestand -> Kategorie -> Unterkategorie -> Bestand), unverändert seit
// der Icicle-Etappe (Root-Cause-Check, siehe CHANGELOG) - keine Änderung an
// dieser Datei nötig.

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
import { UNSICHERHEIT_SYMBOL } from '../config/constants.js';

// Auftrag "Sunburst – Rückkehr zur 3-Ebenen-Ansicht": Text aktualisiert, um
// den jetzt sichtbaren dritten (Unterkategorie-)Ring zu beschreiben - reine
// Inhaltsanpassung an den neuen Ist-Zustand der Visualisierung, keine
// Änderung am Info-Button-Mechanismus selbst (Nicht-Ziel, siehe render()).
const SUNBURST_INFO_TEXT = `Dieser Sunburst zeigt dieselben Bestände wie die Treemap, nur radial angeordnet: Kategorien bilden den innersten Ring, Unterkategorien den mittleren, einzelne Bestände den äußersten. Die Größe eines Segments entspricht dem Umfang des Bestands in Laufmetern.

Klick auf ein Segment in jedem der drei Ringe zoomt in die zugehörige Kategorie, ein Klick auf das Zentrum führt zurück. Klick auf einen einzelnen Bestand öffnet die Detailansicht in der Seitenleiste.`;

const MIN_SCHRIFTGROESSE = 11; // dieselbe Richtgröße wie treemap.js
// Fitts'sches Gesetz (Abschnitt 9): dieselbe 24px-Zielgröße wie treemap.js'
// MINDESTHOEHE_ZELLE, hier als Ziel-BOGENLÄNGE (nicht Winkel direkt) angewandt -
// der daraus resultierende Mindestwinkel wird responsiv aus dem tatsächlich
// gerenderten Außenradius berechnet (siehe zeichneSunburst()), bleibt dadurch
// bei jeder Containergröße auf ca. 24px Kantenlänge am äußeren Rand des Rings.
const MINDEST_BOGENLAENGE_PX = 24;
const INNERER_RADIUS = 40; // Zentrum-Hub (Klickfläche "zurück" in der Kategorie-Ansicht)

// Größenberechnung (Schritt 4): derselbe eigene, viel kleinere Mindestwert wie
// treemap.js' MINDESTGROESSE_ROH_TREEMAP - bewusst NICHT der gemeinsame
// Default (10) in bestandsHierarchie.js, der bei diesen Daten (Median
// umfang_lfm 0,2 lfm) 99% aller Bestände auf denselben Wert geflooert hätte
// und jede sqrt-Winkelskalierung wirkungslos gemacht hätte (per Test
// nachgewiesen: ohne diesen Parameter erhielten alle 142 Bestände einer
// Kategorie exakt denselben Winkel, siehe CHANGELOG - derselbe bereits in der
// Treemap-Etappe behobene und für sunburst.js als Folgeauftrag angekündigte
// Fehler). bestandsHierarchie.js selbst bleibt unverändert (Nicht-Ziel) - der
// Parameter existiert dort bereits seit der Treemap-Etappe.
//
// ROOT-CAUSE-CHECK (Auftrag "Sunburst – Rückkehr zur 3-Ebenen-Ansicht",
// Schritt 1, VOR der Umsetzung geprüft, nicht erst zufällig entdeckt - dieser
// Fehler war bereits dreimal aufgetreten, siehe Kommentar oben): 0,05 bleibt
// nach Ergänzung der dritten (Unterkategorie-)Ebene weiterhin korrekt, denn
// dieser Wert wirkt als Floor auf `record.umfang_lfm` GENAU EINMAL, an der
// BLATT-Ebene (siehe bestandsHierarchie.js' baueBestandsHierarchie(), Zeile
// "Math.max(parseUmfangLfm(...), mindestgroesse)") - unabhängig davon, WIE
// VIELE Ebenen darüber später tatsächlich als Ring gezeichnet werden. Die
// Anzahl gleichzeitig sichtbarer Ringe ist eine reine
// Darstellungsentscheidung in zeichneSunburst(), berührt die Wertberechnung
// selbst nicht. Zusätzlich bereits empirisch bestätigt: icicle.js nutzt
// exakt denselben Wert (MINDESTGROESSE_ROH_ICICLE = 0.05) für eine bereits
// produktiv 3-ebenige Darstellung (Kategorie/Unterkategorie/Bestand-Zeile,
// siehe dortiger Kommentar) - derselbe Parameter, dieselbe Datengrundlage,
// bereits gegen 3 Ebenen verifiziert.
const MINDESTGROESSE_ROH_SUNBURST = 0.05;
// AUFTRAG "Teil 2f", Punkt 1: keine lokale Kopie mehr - zentrale Konstante
// aus config/constants.js, unter demselben lokalen Namen weiterverwendet.
const WARN_SYMBOL = UNSICHERHEIT_SYMBOL;
const AUSWAHL_FARBE = '#e07820'; // dieselbe Farbe wie treemap.js' Auswahl-Hervorhebung
const FOKUS_STROKE_BREITE = 3;

let instanz = null; // { container, svgBereich, hierarchieDaten, kategorieFarbSkala, options, aktuelleKategorieDaten, ausgewaehlterName, sidebar, infoButton }

function istUnsicherenKnoten(d, zeigeUnsicherheit) {
  return zeigeUnsicherheit && d.data.record && d.data.record.daten_unsicher;
}

// Randfarbe/-breite im "Ruhezustand" eines Segments (Punkt A/D: derselbe
// Indikator dient sowohl der Auswahl-Markierung als auch, per Fokus-
// Ereignis, der Tastatur-Fokusanzeige - siehe wireFokusHighlight()). Eine
// Funktion statt inline dupliziertem Ausdruck, weil sie an ZWEI Stellen
// exakt gleich gebraucht wird: beim initialen Zeichnen und beim
// Zurücksetzen nach "blur".
function randStilFuerSegment({ istAusgewaehlt, istUnsicher, ohneKategorie }) {
  if (istAusgewaehlt) return { stroke: AUSWAHL_FARBE, breite: 2, dasharray: null };
  if (istUnsicher) return { stroke: '#c0392b', breite: 2, dasharray: '4,3' };
  return { stroke: '#ffffff', breite: 1, dasharray: ohneKategorie ? '4,3' : null };
}

// Punkt A: der browserseitige Standard-Fokusrahmen (:focus-visible in
// base.css, [tabindex]:focus-visible { outline: 3px solid var(--accent) })
// zeichnet für JEDES fokussierbare Element eine CSS-`outline` - die ist per
// Spezifikation IMMER ein Rechteck entlang der Border-Box, kann einer
// gekrümmten Bogenform also grundsätzlich nie folgen (anders als bei
// treemap.js' rechteckigen Kacheln, wo Border-Box und sichtbare Form
// übereinstimmen - dort fällt es nicht auf). Behoben durch: `outline: none`
// NUR für .sunburst-segment (treemap.js' Fokusrahmen bleibt unverändert,
// Nicht-Ziel), ersetzt durch einen zur Bogenform passenden Indikator
// (verstärkter `stroke` direkt auf dem Pfad, siehe wireFokusHighlight()) -
// kein ersatzloses outline:none (WCAG erfordert sichtbaren Fokus).
// .sunburst-svg-bereich: eigener Unter-Container statt direkt in container zu
// zeichnen (wie vor der Sidebar-Integration) - container (die geteilte
// .viz-inhalt) trägt jetzt ZUSÄTZLICH die Sidebar als Geschwisterelement;
// zeichneSunburst() darf deshalb nicht mehr container.innerHTML komplett
// leeren (das würde die Sidebar bei jedem Redraw mitlöschen), sondern nur
// noch den SVG-Unter-Container - exakt dasselbe Strukturmuster wie
// treemap.js' svgBereich. height:100% ist nötig, damit clientHeight die
// volle verfügbare Höhe misst (die Sidebar ist position:fixed, nimmt am
// normalen Fluss nicht teil, zählt für die Höhenmessung des Geschwisters
// also nicht mit - ohne diese Regel bliebe .sunburst-svg-bereich ohne
// eigene Höhenangabe bei "auto", siehe Vollbild-Etappe im CHANGELOG).
function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .sunburst-svg-bereich { height: 100%; }
    .sunburst-segment:focus,
    .sunburst-segment:focus-visible,
    .sunburst-zentrum:focus,
    .sunburst-zentrum:focus-visible { outline: none; }
    /* Auftrag "Info-Button für die 5 Bestandsvisualisierungen": fester Anker
       oben rechts im Modulbereich, unabhängig vom bei jedem Neuaufbau
       geleerten svgBereich-Div (siehe render()-Kommentar zum Info-Button) -
       dasselbe Muster wie zeitachse.js' .zeitachse-info-button-anker. */
    .sunburst-info-button-anker { position: absolute; top: 0; right: 0; z-index: 25; }
  `;
  container.appendChild(style);
}

function baueSchraffurPattern(defs) {
  defs.append('pattern')
    .attr('id', 'sunburst-unsicher-schraffur')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 8).attr('height', 8)
    .append('path')
    .attr('d', 'M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4')
    .attr('stroke', '#aaaaaa')
    .attr('stroke-width', 1.5)
    .attr('opacity', 0.45);
}

// Bewusst dasselbe Punktmuster wie treemap.js (eigene <pattern>-Definition,
// da jedes Modul sein eigenes <svg><defs> aufbaut - Farb-/Kontrastlogik wird
// geteilt, reines SVG-Zeichnen bleibt modul-lokal, analog zu treemap.js).
function baueOhneKategorieMuster(defs) {
  const muster = defs.append('pattern')
    .attr('id', 'sunburst-ohne-kategorie-muster')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 6).attr('height', 6);
  muster.append('circle').attr('cx', 3).attr('cy', 3).attr('r', 1).attr('fill', '#ffffff').attr('opacity', 0.55);
}

// Post-Layout-Korrektur: kein Segment darf unter mindestWinkelRad fallen
// (Klickbarkeit/Lesbarkeit) - analog zu treemap.js' korrigiereMindesthoehen(),
// aber für eine 1D-Winkelaufteilung statt einer 2D-Fläche. WICHTIGER
// UNTERSCHIED zur ersten (fehlgeschlagenen) treemap-Lösung: d3.partition()
// garantiert bereits von sich aus eine überlappungsfreie Aufteilung ALLER
// Geschwister (reines 1D-Intervall) - die hier gewählte Wasserfüllungs-
// Methode verschiebt NIE etwas außerhalb des ursprünglich zugeteilten
// Gesamtwinkels, kann also die Instanz aus dem CHANGELOG (Zellen laufen über
// den Elternbereich hinaus) strukturell gar nicht wiederholen.
// Iteratives Vorgehen: zu kleine Segmente werden zuerst auf den Mindestwinkel
// fixiert, das dadurch entstandene Defizit wird anteilig von den verbleibenden
// (noch nicht fixierten) Geschwistern abgezogen; fällt dabei eines von ihnen
// selbst unter den Mindestwinkel, wird auch es fixiert und der Rest erneut
// verteilt - konvergiert nachweislich (jede Runde fixiert mindestens ein
// weiteres Element oder die Schleife endet), spätestens nach N Runden.
// RECHNERISCH UNMÖGLICHER FALL (siehe CHANGELOG, Präzedenzfall "Öffentliches
// Vermögen" in der Treemap): reicht der gesamte verfügbare Winkel nicht für
// alle betroffenen Segmente gleichzeitig aus, wird NICHTS korrigiert - die
// Segmente bleiben an ihrer regulären, wertproportionalen Position (dieselbe
// bereits etablierte Lösung wie in der Treemap, keine neue Stapel-Mechanik).
function korrigiereWinkelFuerGeschwister(knotenListe, mindestWinkelRad) {
  if (knotenListe.length === 0) return;
  const gesamtStart = knotenListe[0].x0;
  const gesamtEnde = knotenListe[knotenListe.length - 1].x1;
  const gesamtWinkel = gesamtEnde - gesamtStart;

  const mengen = knotenListe.map((k) => ({ knoten: k, winkel: k.x1 - k.x0, fixiert: false }));
  const anfangsZuKlein = mengen.filter((m) => m.winkel < mindestWinkelRad);
  if (anfangsZuKlein.length === 0) return;
  if (anfangsZuKlein.length * mindestWinkelRad > gesamtWinkel) return;

  anfangsZuKlein.forEach((m) => { m.winkel = mindestWinkelRad; m.fixiert = true; });

  for (let runde = 0; runde < mengen.length; runde += 1) {
    const fixierteSumme = mengen.filter((m) => m.fixiert).reduce((s, m) => s + m.winkel, 0);
    const frei = mengen.filter((m) => !m.fixiert);
    if (frei.length === 0) break;
    const zielFreiSumme = gesamtWinkel - fixierteSumme;
    const bisherigeFreiSumme = frei.reduce((s, m) => s + m.winkel, 0);
    const faktor = zielFreiSumme / bisherigeFreiSumme;

    let neueFixierung = false;
    frei.forEach((m) => {
      const neuerWinkel = m.winkel * faktor;
      if (neuerWinkel < mindestWinkelRad) {
        m.winkel = mindestWinkelRad;
        m.fixiert = true;
        neueFixierung = true;
      } else {
        m.winkel = neuerWinkel;
      }
    });
    if (!neueFixierung) break;
  }

  let cursor = gesamtStart;
  mengen.forEach((m) => {
    m.knoten.x0 = cursor;
    m.knoten.x1 = cursor + m.winkel;
    cursor = m.knoten.x1;
  });
}

// Auftrag "Sunburst – Rückkehr zur 3-Ebenen-Ansicht" (siehe CHANGELOG):
// dieselbe HIERARCHISCHE Korrektur-Kaskade wie icicle.js' skaliereNachkommenX()/
// korrigierePropagiertProElternteil() (dort für Icicle-Zeilen/Pixel-Breite),
// hier unverändert übernommen für Winkel - x0/x1 sind bei d3.partition() in
// BEIDEN Fällen dasselbe 1D-Intervall-Konzept, nur die geometrische
// Interpretation (Bogenwinkel statt Pixel-Breite) unterscheidet sich, die
// Korrekturlogik selbst ist identisch. Ohne diesen Schritt (wie bei Icicle
// per Nutzer-Rückmeldung entdeckt, siehe dortiger Kommentar) würden
// Unterkategorie-/Bestand-Segmente aus der Winkel-Spanne ihres
// Kategorie-Segments herauslaufen, sobald DORT tatsächlich korrigiert wurde.
// Skaliert ALLE Nachkommen (jeder Tiefe) von elternKnoten von dessen ALTER
// x0/x1-Spanne in seine NEUE Spanne - hält die Verschachtelung konsistent.
function skaliereNachkommenWinkel(elternKnoten, altX0, altX1) {
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

// Wendet korrigiereWinkelFuerGeschwister() GETRENNT auf die Kinder JEDES
// einzelnen Elternknotens an (statt einmal global über alle Knoten einer
// Ebene) - jede Gruppe bleibt dadurch strikt innerhalb der (ggf. bereits
// selbst korrigierten) Winkel-Spanne ihres eigenen Elternteils. Zieht
// anschließend die jeweiligen Nachkommen jedes korrigierten Kindes nach
// (skaliereNachkommenWinkel), damit die nächsttiefere Ebene wieder mit
// korrekten, verschachtelten Ausgangsspannen arbeitet. mindestWinkelRad wird
// pro Aufruf übergeben (nicht als globale Konstante), da er sich - anders als
// bei Icicle's einheitlicher Pixel-Mindestbreite - pro Ring aus dessen
// EIGENEM Außenradius ergibt (siehe zeichneSunburst()).
function korrigiereWinkelPropagiertProElternteil(elternKnotenListe, mindestWinkelRad) {
  const ergebnis = [];
  elternKnotenListe.forEach((eltern) => {
    const kinder = eltern.children || [];
    const altSpannen = kinder.map((k) => ({ x0: k.x0, x1: k.x1 }));
    korrigiereWinkelFuerGeschwister(kinder, mindestWinkelRad);
    kinder.forEach((k, i) => {
      const alt = altSpannen[i];
      if (k.x0 !== alt.x0 || k.x1 !== alt.x1) skaliereNachkommenWinkel(k, alt.x0, alt.x1);
    });
    ergebnis.push(...kinder);
  });
  return ergebnis;
}

// Auto-Fit radiale Beschriftung: Text läuft vom inneren zum äußeren Rand des
// Segments (übliches Sunburst-Muster), gespiegelt in der unteren Kreishälfte,
// damit er nie auf dem Kopf steht. Heuristische Zeichenbreite (0.57×
// Schriftgröße), dieselbe Konstante wie treemap.js' platziereAutoFitText().
// NEU (Auftrag "Beschriftungs-Kürzung mit Ellipse", siehe CHANGELOG): passt
// der Name bei KEINER erlaubten Schriftgröße vollständig, wird bei
// MIN_SCHRIFTGROESSE eine mit "…" gekürzte Fassung versucht statt komplett
// auf ein Label zu verzichten (js/utils/beschriftung.js, gemeinsam mit
// treemap.js/icicle.js/circlePacking.js genutzt) - dieselbe
// Höhen-/Bogenlängen-Bedingung wie beim vollen Namen gilt dabei unverändert
// weiter: reicht die Ringdicke an dieser Stelle nicht mal für eine Zeile bei
// MIN_SCHRIFTGROESSE, hilft auch eine Kürzung nichts. Rückgabe ist jetzt ein
// Tri-State ('voll' | 'gekuerzt' | false) - der einzige Aufrufer (siehe
// zeichneSunburst()) nutzt die genauere Unterscheidung, um beim
// Kategorie-Ring bei gekürzter Anzeige weiterhin die AUSFÜHRLICHERE
// Tooltip-Variante (mit Bestände-Zahl) statt nur des - dann nicht mehr
// vollständig sichtbaren - Namens zu zeigen; alle bestehenden
// Wahrheitswert-Prüfungen funktionieren unverändert weiter ('voll'/
// 'gekuerzt' sind beide truthy).
function fuegeSegmentBeschriftungEin(gruppe, d, text, textFarbe) {
  const innenRadius = d.y0;
  const aussenRadius = d.y1;
  const mitteWinkel = (d.x0 + d.x1) / 2;
  const winkelSpanne = d.x1 - d.x0;
  const textStartRadius = innenRadius + 6;
  const verfuegbareRadialeLaenge = (aussenRadius - innenRadius) - 12;
  const bogenlaengeAmStart = winkelSpanne * textStartRadius;

  if (verfuegbareRadialeLaenge <= 10 || bogenlaengeAmStart <= 8) return false;

  const maxSchrift = Math.max(MIN_SCHRIFTGROESSE, Math.min(15, verfuegbareRadialeLaenge / 6));
  let gewaehlteSchrift = null;
  for (let versuch = maxSchrift; versuch >= MIN_SCHRIFTGROESSE; versuch -= 1) {
    const zeilenHoehe = versuch * 1.2;
    if (zeilenHoehe > bogenlaengeAmStart) continue;
    const zeichenBreite = versuch * 0.57;
    if (text.length * zeichenBreite <= verfuegbareRadialeLaenge) {
      gewaehlteSchrift = versuch;
      break;
    }
  }

  let angezeigterText = text;
  let istGekuerzt = false;
  if (gewaehlteSchrift === null) {
    if (MIN_SCHRIFTGROESSE * 1.2 > bogenlaengeAmStart) return false;
    const gekuerzterText = ermittleBeschriftungstext(text, verfuegbareRadialeLaenge, MIN_SCHRIFTGROESSE);
    if (!gekuerzterText) return false;
    gewaehlteSchrift = MIN_SCHRIFTGROESSE;
    angezeigterText = gekuerzterText;
    istGekuerzt = true;
  }

  const gespiegelt = mitteWinkel > Math.PI;
  const gradVersatz = (mitteWinkel * 180) / Math.PI - 90;
  const transform = gespiegelt
    ? `rotate(${gradVersatz + 180}) translate(${-textStartRadius - (angezeigterText.length * gewaehlteSchrift * 0.57)},0)`
    : `rotate(${gradVersatz}) translate(${textStartRadius},0)`;

  gruppe.append('text')
    .attr('transform', transform)
    .attr('dy', '0.32em')
    .attr('fill', textFarbe)
    .attr('font-size', gewaehlteSchrift)
    .text(angezeigterText);
  return istGekuerzt ? 'gekuerzt' : 'voll';
}

function faerbeKategorieSegment(kategorieName) {
  return kategorieName === OHNE_KATEGORIE ? OHNE_KATEGORIE_FARBE : instanz.kategorieFarbSkala(kategorieName);
}

// bestandKnoten.parent ist immer die Unterkategorie - dieselbe Struktur wie
// in treemap.js, da bestandsHierarchie.js weiterhin die volle Tiefe liefert.
function faerbeBestandSegment(bestandKnoten, kategorieName) {
  if (kategorieName === OHNE_KATEGORIE) return OHNE_KATEGORIE_FARBE;
  const basis = instanz.kategorieFarbSkala(kategorieName);
  return farbeFuerUnterkategorie(basis, bestandKnoten.parent);
}

// Auftrag "Sunburst – Rückkehr zur 3-Ebenen-Ansicht" (siehe CHANGELOG,
// analog zu icicle.js' faerbeUnterkategorieSegment()): die Unterkategorie-
// Ebene wird jetzt selbst als eigener Ring gezeichnet (nicht mehr nur zur
// Feinabstufung von Bestand-Blättern genutzt) - dieselbe farbeFuerUnterkategorie()
// wird hier direkt auf den Unterkategorie-Knoten SELBST angewendet (der
// bereits die von der Funktion erwartete Form hat: .parent ist die
// Kategorie, .parent.children sind die Geschwister-Unterkategorien).
function faerbeUnterkategorieSegment(unterkategorieKnoten, kategorieName) {
  if (kategorieName === OHNE_KATEGORIE) return OHNE_KATEGORIE_FARBE;
  const basis = instanz.kategorieFarbSkala(kategorieName);
  return farbeFuerUnterkategorie(basis, unterkategorieKnoten);
}

// Ermittelt für einen Knoten JEDER Tiefe (Kategorie/Unterkategorie/Bestand)
// der ÜBERSICHT (Ebene 1) die zugehörigen Kategorie-DATEN (nicht nur den
// Namen) - für den einheitlichen "Klick auf jeden Ring zoomt in dieselbe
// Kategorie"-Mechanismus (Schritt 3, analog zu icicle.js' gleichnamiger
// Funktion). NUR für Knoten der Übersicht gültig (depth 1 = Kategorie) - in
// der Zoomansicht ist die Kategorie bereits instanz.aktuelleKategorieDaten
// selbst, kein Ancestor-Lookup nötig (siehe zeichneSunburst()).
function kategorieDatenVonKnoten(d) {
  if (d.depth === 1) return d.data;
  return d.ancestors().find((vorfahre) => vorfahre.depth === 1).data;
}

// Namespaced events (".tooltip"/".highlight", siehe wireFokusHighlight()):
// .on('focus', ...) auf derselben Selektion würde sonst einen zuvor per
// .on('focus', ...) gesetzten Handler überschreiben (D3 kennt pro
// Event-TYP nur einen Handler ohne Namespace) - Tooltip UND
// Fokus-Hervorhebung müssen aber unabhängig voneinander auf "focus"/"blur"
// reagieren können.
function wireTooltip(auswahl, textFn, container) {
  auswahl
    .on('mouseenter.tooltip focus.tooltip', function mouseenterFocus(event, d) { zeigeTooltip(textFn(d), this, container); })
    .on('mouseleave.tooltip blur.tooltip', () => versteckeTooltip());
}

// Punkt A/D, per JS statt reiner CSS umgesetzt: derselbe Vergleichstest wie
// bei treemap.js' Kategorie-Gruppen-Hervorhebung hatte dort bereits gezeigt,
// dass ein bereits per .attr() gesetztes Präsentationsattribut (hier:
// stroke/stroke-width) Vorrang vor einer reinen CSS-Regel für dieselbe
// Eigenschaft behält - der hier gewählte Event+.attr()-Ansatz ist deshalb
// die bewährte, nicht nur vermutete Lösung. `ruheZustand()` wird bei
// "blur" NEU ausgewertet (nicht einmalig eingefangen), damit ein Segment,
// das zwischenzeitlich zur Auswahl wurde, beim Verlassen des Fokus seine
// Auswahl-Hervorhebung behält statt auf den unmarkierten Ruhezustand
// zurückzufallen.
function wireFokusHighlight(gruppe, pfad, ruheZustand) {
  gruppe
    .on('focus.highlight', () => pfad.attr('stroke', AUSWAHL_FARBE).attr('stroke-width', FOKUS_STROKE_BREITE))
    .on('blur.highlight', () => {
      const stil = ruheZustand();
      pfad.attr('stroke', stil.stroke).attr('stroke-width', stil.breite).attr('stroke-dasharray', stil.dasharray);
    });
}

function wechsleZuKategorie(kategorieDaten) {
  instanz.aktuelleKategorieDaten = kategorieDaten;
  instanz.ausgewaehlterName = null;
  schliesseSidebarModul(instanz.sidebar, instanz.svgBereich);
  zeichneSunburst();
}

function wechsleZuWurzel() {
  instanz.aktuelleKategorieDaten = null;
  instanz.ausgewaehlterName = null;
  schliesseSidebarModul(instanz.sidebar, instanz.svgBereich);
  zeichneSunburst();
}

// Klick auf ein BEREITS ausgewähltes Bestand-Segment schaltet ab (Sidebar
// schließt, Hervorhebung verschwindet) statt wirkungslos zu bleiben - Klick
// auf ein ANDERES Segment wählt es regulär aus und öffnet/aktualisiert die
// Sidebar (analog zum bereits behobenen Treemap-Bug, siehe CHANGELOG).
function waehleBestand(datenKnoten) {
  if (instanz.ausgewaehlterName === datenKnoten.name) {
    instanz.ausgewaehlterName = null;
    zeichneSunburst();
    schliesseSidebarModul(instanz.sidebar, instanz.svgBereich);
    // schliesseSidebarModul() holt den Fokus nur zurück, wenn er sich VOR
    // dem Schließen innerhalb der Sidebar befand - hier kommt der Klick
    // aber vom soeben durch zeichneSunburst() zerstörten Segment selbst,
    // der Fokus wäre sonst auf <body> verwaist (derselbe Fix wie in
    // treemap.js' waehleBestandAus(), siehe CHANGELOG).
    instanz.svgBereich.focus();
    return;
  }
  instanz.ausgewaehlterName = datenKnoten.name;
  zeichneSunburst();
  const kategorieName = instanz.aktuelleKategorieDaten.name;
  const kategorieFarbe = kategorieName === OHNE_KATEGORIE ? OHNE_KATEGORIE_FARBE : instanz.kategorieFarbSkala(kategorieName);
  oeffneSidebarModul(instanz.sidebar, datenKnoten.record, { kategorieName, kategorieFarbe });
}

// Zentrum (Punkt 7): reine Information in der Übersicht (kein Klick-Ziel,
// daher auch kein Zeigercursor/Hover-Effekt - vermeidet genau die in der
// Treemap behobene Verwechslung "sieht klickbar aus, ist es aber nicht"
// spiegelverkehrt), Kategorie-Name + Zurück-Hinweis samt eindeutigem
// Klick-Feedback in der Kategorie-Ansicht.
function zeichneZentrum(svg, container, gesamtAnzahl) {
  const inKategorieAnsicht = !!instanz.aktuelleKategorieDaten;
  const gruppe = svg.append('g').attr('class', 'sunburst-zentrum');

  const kreis = gruppe.append('circle')
    .attr('r', INNERER_RADIUS)
    .attr('fill', 'var(--surface, #ffffff)')
    .attr('stroke', 'var(--border, #ddd8cf)')
    .attr('stroke-width', 1);

  if (!inKategorieAnsicht) {
    gruppe.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .attr('font-size', 11)
      .attr('font-weight', 700)
      .text(gesamtAnzahl);
    gruppe.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .attr('font-size', 9)
      .text('Bestände');
    return;
  }

  kreis.style('cursor', 'pointer');
  gruppe.attr('tabindex', 0).attr('role', 'button')
    .attr('aria-label', `Zurück zur Übersicht aller Kategorien (aktuell: ${instanz.aktuelleKategorieDaten.name})`);

  const name = instanz.aktuelleKategorieDaten.name;
  const nameGekuerzt = name.length > 16 ? `${name.slice(0, 15)}…` : name;
  gruppe.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '-0.3em')
    .attr('font-size', 10)
    .attr('font-weight', 700)
    .text(nameGekuerzt);
  gruppe.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '1em')
    .attr('font-size', 9)
    .attr('fill', 'var(--accent, #2c4a6e)')
    .text('← zurück');

  gruppe
    .on('mouseenter', () => kreis.attr('fill', 'var(--bg, #f7f5f0)'))
    .on('mouseleave', () => kreis.attr('fill', 'var(--surface, #ffffff)'))
    .on('click', wechsleZuWurzel)
    .on('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); wechsleZuWurzel(); }
    });
  // Punkt A gilt auch fürs Zentrum: dessen Standard-Fokusrahmen ist zwar
  // (als Kreis-Bounding-Box) weniger auffällig fehlplatziert als bei den
  // Bogen-Segmenten, aber ebenfalls unterdrückt (siehe fuegeStyleEin()) -
  // ohne Ersatz wäre das ein WCAG-Verstoß (fehlender sichtbarer Fokus).
  // Derselbe Indikator (verstärkter Rand, AUSWAHL_FARBE) wie bei den
  // Segmenten.
  gruppe
    .on('focus.highlight', () => kreis.attr('stroke', AUSWAHL_FARBE).attr('stroke-width', FOKUS_STROKE_BREITE))
    .on('blur.highlight', () => kreis.attr('stroke', 'var(--border, #ddd8cf)').attr('stroke-width', 1));
  wireTooltip(gruppe, () => `Zurück zu allen Kategorien (aktuell: ${name})`, container);
}

function zeichneSunburst() {
  const { svgBereich, hierarchieDaten, options, aktuelleKategorieDaten } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  svgBereich.innerHTML = '';

  const breite = options.width || svgBereich.clientWidth || 700;
  const hoehe = options.height || svgBereich.clientHeight || 700;
  const aussenRadius = Math.max(Math.min(breite, hoehe) / 2 - 8, INNERER_RADIUS + 20);
  const inKategorieAnsicht = !!aktuelleKategorieDaten;

  const anzeigeDaten = aktuelleKategorieDaten || hierarchieDaten;
  const wurzel = d3.hierarchy(anzeigeDaten).sum((d) => Math.sqrt(d.value || 0)).sort((a, b) => b.value - a.value);
  d3.partition().size([2 * Math.PI, aussenRadius])(wurzel);

  // Auftrag "Sunburst – Rückkehr zur 3-Ebenen-Ansicht" (siehe Dateikopf-
  // Kommentar): Übersicht zeigt DREI konzentrische Ringe gleichzeitig
  // (Kategorie/Unterkategorie/Bestand); Kategorie-Ansicht zeigt ZWEI
  // (Unterkategorie/Bestand) - die Kategorie-Ebene selbst wird dort zum
  // Zentrum (siehe zeichneZentrum(), unverändert). Jeder Ring bekommt eine
  // EIGENE Radius-Bande, gleich breit über [INNERER_RADIUS, aussenRadius]
  // verteilt. Mindest-Bogenlänge (Punkt 5: 24px, dieselbe Fitts'sches-
  // Gesetz-Zielgröße wie treemap.js' MINDESTHOEHE_ZELLE) wird PRO RING aus
  // dessen EIGENEM Außenradius berechnet, nicht mehr aus dem globalen
  // aussenRadius: weiter innen liegende Ringe haben bei gleichem Winkel eine
  // kürzere Bogenlänge, brauchen also einen größer Mindestwinkel, um auf
  // dieselbe 24px-Zielgröße zu kommen.
  const anzahlRinge = inKategorieAnsicht ? 2 : 3;
  const ringDicke = (aussenRadius - INNERER_RADIUS) / anzahlRinge;
  const bandFuerRing = (index) => [INNERER_RADIUS + index * ringDicke, INNERER_RADIUS + (index + 1) * ringDicke];
  const mindestWinkelFuerBand = (band) => MINDEST_BOGENLAENGE_PX / band[1];

  // Dieselbe hierarchische Korrektur-Kaskade wie icicle.js (siehe
  // korrigiereWinkelPropagiertProElternteil()): jede Ebene wird GETRENNT pro
  // Elternteil korrigiert, damit die Verschachtelung zur Elternspanne nicht
  // bricht (Präzedenzfall siehe dortiger Kommentar). [wurzel] als einziger
  // Elternteil für die erste gezeichnete Ebene reproduziert dabei die
  // ursprüngliche globale Korrektur (deren Kinder teilen sich ohnehin die
  // volle Spanne der Wurzel).
  let ringe;
  if (inKategorieAnsicht) {
    const unterkategorieBand = bandFuerRing(0);
    const bestandBand = bandFuerRing(1);
    const unterkategorieKnoten = korrigiereWinkelPropagiertProElternteil([wurzel], mindestWinkelFuerBand(unterkategorieBand));
    const bestandKnoten = korrigiereWinkelPropagiertProElternteil(unterkategorieKnoten, mindestWinkelFuerBand(bestandBand));
    unterkategorieKnoten.forEach((k) => { k.y0 = unterkategorieBand[0]; k.y1 = unterkategorieBand[1]; });
    bestandKnoten.forEach((k) => { k.y0 = bestandBand[0]; k.y1 = bestandBand[1]; });
    ringe = [
      // Schritt 4: Unterkategorie-Ring bleibt in der Zoomansicht bewusst
      // OHNE Klick-Wirkung (siehe Dateikopf-Kommentar für die Begründung) -
      // Bestand-Ring wählt wie bisher aus (Sidebar-Toggle).
      { knoten: unterkategorieKnoten, art: 'unterkategorie', klick: 'inert' },
      { knoten: bestandKnoten, art: 'bestand', klick: 'waehlen' }
    ];
  } else {
    const kategorieBand = bandFuerRing(0);
    const unterkategorieBand = bandFuerRing(1);
    const bestandBand = bandFuerRing(2);
    const kategorieKnoten = korrigiereWinkelPropagiertProElternteil([wurzel], mindestWinkelFuerBand(kategorieBand));
    const unterkategorieKnoten = korrigiereWinkelPropagiertProElternteil(kategorieKnoten, mindestWinkelFuerBand(unterkategorieBand));
    const bestandKnoten = korrigiereWinkelPropagiertProElternteil(unterkategorieKnoten, mindestWinkelFuerBand(bestandBand));
    kategorieKnoten.forEach((k) => { k.y0 = kategorieBand[0]; k.y1 = kategorieBand[1]; });
    unterkategorieKnoten.forEach((k) => { k.y0 = unterkategorieBand[0]; k.y1 = unterkategorieBand[1]; });
    bestandKnoten.forEach((k) => { k.y0 = bestandBand[0]; k.y1 = bestandBand[1]; });
    // Schritt 3: JEDER der drei Ringe zoomt einheitlich in dieselbe
    // Kategorie-Ansicht, unabhängig davon, in welchem Ring geklickt wurde.
    ringe = [
      { knoten: kategorieKnoten, art: 'kategorie', klick: 'zoomen' },
      { knoten: unterkategorieKnoten, art: 'unterkategorie', klick: 'zoomen' },
      { knoten: bestandKnoten, art: 'bestand', klick: 'zoomen' }
    ];
  }

  const bogen = d3.arc()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle(0.004)
    .padRadius(aussenRadius)
    .innerRadius((d) => d.y0)
    .outerRadius((d) => d.y1);

  const svg = d3.select(svgBereich)
    .append('svg')
    .attr('width', breite)
    .attr('height', hoehe)
    .attr('viewBox', `${-breite / 2} ${-hoehe / 2} ${breite} ${hoehe}`)
    .attr('role', 'img')
    .attr('aria-label', inKategorieAnsicht
      ? `Bestände der Kategorie ${aktuelleKategorieDaten.name}, mit Unterkategorie- und Bestand-Ring`
      : 'Sunburst des Gesamtbestands, mit Kategorie-, Unterkategorie- und Bestand-Ring');

  svg.append('desc').text(inKategorieAnsicht
    ? 'Radiale Darstellung, Kategorie-Ansicht: Zentrum zeigt den Kategorienamen ' +
      '(Klick kehrt zur Übersicht zurück), innerer Ring die Unterkategorien ' +
      'dieser Kategorie, äußerer Ring deren einzelne Bestände. Winkel nach ' +
      'Umfang in Laufmetern (Quadratwurzel-skaliert). Klick auf einen Bestand ' +
      'öffnet Details in der Seitenleiste. Gestrichelter roter Rand, ' +
      'Warnsymbol und Schraffur kennzeichnen unsichere Angaben.'
    : 'Radiale Darstellung: innerster Ring ein Segment pro Kategorie, ' +
      'mittlerer Ring die Unterkategorien, äußerster Ring die einzelnen ' +
      'Bestände - alle drei Ringe gleichzeitig sichtbar. Winkel nach Umfang ' +
      'in Laufmetern (Quadratwurzel-skaliert). Farbton zeigt die Kategorie, ' +
      'Helligkeit die Unterkategorie; "ohne Kategorie" erscheint neutral ' +
      'grau mit Punktmuster. Klick auf ein Segment in jedem der drei Ringe ' +
      'öffnet dieselbe Kategorie-Ansicht.'
  );

  const defs = svg.append('defs');
  baueSchraffurPattern(defs);
  baueOhneKategorieMuster(defs);

  // Eine gemeinsame Zeichenschleife für alle Ringe statt getrennter, fast
  // identischer Blöcke - "art" bestimmt Farbe/Beschriftung/Tooltip, "klick"
  // das Interaktionsverhalten. Eigene, pro Ring unterschiedliche Selektor-
  // Klasse (sunburst-segment-${art}) ist hier notwendig, NICHT nur
  // Geschmackssache: svg.selectAll() würde sonst bei der zweiten/dritten
  // Ring-Iteration bereits die im ERSTEN Durchlauf erzeugten <g>-Elemente
  // erneut treffen (alle drei Ringe teilten sich sonst dieselbe Basis-
  // Klasse "sunburst-segment") und deren DOM fälschlich mit den neuen Ring-
  // Daten aktualisieren statt frische Gruppen anzulegen. Die gemeinsame
  // Klasse "sunburst-segment" bleibt ZUSÄTZLICH gesetzt (Nicht-Ziel: keine
  // Änderung am Fokus-Indikator) - die bestehende CSS-Regel .sunburst-
  // segment:focus{outline:none} (siehe fuegeStyleEin()) greift dadurch
  // unverändert für alle drei Ringe.
  ringe.forEach(({ knoten, art, klick }) => {
    const segmente = svg.selectAll(`g.sunburst-segment-${art}`)
      .data(knoten)
      .join('g')
      .attr('class', `sunburst-segment sunburst-segment-${art}`)
      // Schritt 4/Dateikopf-Kommentar: der inerte Unterkategorie-Ring der
      // Zoomansicht bekommt bewusst KEIN tabindex (nicht per Tastatur
      // fokussierbar) - dieselbe "reine Information, kein Klick-Ziel"-
      // Konvention wie das Zentrum in der Übersicht (siehe zeichneZentrum(),
      // dort ebenfalls ohne tabindex/role im nicht-interaktiven Zustand).
      .attr('tabindex', klick === 'inert' ? null : 0);

    segmente.each(function jedesSegment(d) {
      const gruppe = d3.select(this);
      const kategorieDaten = inKategorieAnsicht ? aktuelleKategorieDaten : kategorieDatenVonKnoten(d);
      const kategorieName = kategorieDaten.name;
      const ohneKategorie = kategorieName === OHNE_KATEGORIE;

      let farbe;
      let name;
      let tooltipFn;
      let istUnsicher = false;
      let istAusgewaehlt = false;

      if (art === 'kategorie') {
        farbe = faerbeKategorieSegment(kategorieName);
        name = kategorieName;
        // tooltipFn hängt von `beschriftet` ab (erst nach der Beschriftung
        // bekannt) - siehe unten, direkt nach fuegeSegmentBeschriftungEin().
      } else if (art === 'unterkategorie') {
        farbe = faerbeUnterkategorieSegment(d, kategorieName);
        name = d.data.name;
        tooltipFn = () => `${d.data.name} (Kategorie: ${kategorieName}, ${d.leaves().length} Bestände)`;
      } else {
        farbe = faerbeBestandSegment(d, kategorieName);
        name = d.data.name;
        tooltipFn = () => baueTooltipText(d);
        // Auswahl/Unsicher-Kennzeichnung gilt nur, wenn ein Klick tatsächlich
        // auswählt (Zoomansicht-Bestand-Ring, klick === 'waehlen') - in der
        // Übersicht zoomt ein Bestand-Klick nur in die Kategorie, es gibt
        // dort kein Auswahlkonzept (Schritt 3).
        if (klick === 'waehlen') {
          istUnsicher = istUnsicherenKnoten(d, zeigeUnsicherheit);
          istAusgewaehlt = instanz.ausgewaehlterName === d.data.name;
        }
      }

      const textFarbe = passendeTextfarbe(farbe);
      const ruheZustand = () => randStilFuerSegment({ istAusgewaehlt, istUnsicher, ohneKategorie });
      const stil = ruheZustand();

      const pfad = gruppe.append('path')
        .attr('class', 'sunburst-pfad')
        .attr('d', bogen(d))
        .attr('fill', farbe)
        .attr('stroke', stil.stroke)
        .attr('stroke-width', stil.breite)
        .attr('stroke-dasharray', stil.dasharray);

      if (ohneKategorie) {
        gruppe.append('path').attr('d', bogen(d)).attr('fill', 'url(#sunburst-ohne-kategorie-muster)').attr('pointer-events', 'none');
      }
      if (istUnsicher) {
        gruppe.append('path').attr('d', bogen(d)).attr('fill', 'url(#sunburst-unsicher-schraffur)').attr('pointer-events', 'none');
        const warnWinkel = (d.x0 + d.x1) / 2;
        const warnRadius = d.y1 - 12;
        gruppe.append('text')
          .attr('x', Math.sin(warnWinkel) * warnRadius)
          .attr('y', -Math.cos(warnWinkel) * warnRadius)
          .attr('text-anchor', 'middle')
          .attr('aria-hidden', 'true')
          .attr('font-size', 11)
          .text(WARN_SYMBOL);
      }

      const beschriftungsGruppe = gruppe.append('g').attr('pointer-events', 'none');
      const beschriftet = fuegeSegmentBeschriftungEin(beschriftungsGruppe, d, name, textFarbe);
      if (!tooltipFn) {
        // Nur art === 'kategorie' erreicht diesen Zweig (siehe oben) - der
        // kurze Tooltip-Text (nur kategorieName) erscheint jetzt NUR noch bei
        // 'voll' (Name bereits vollständig sichtbar) - bei 'gekuerzt' UND bei
        // false zeigt der Tooltip die ausführlichere Variante mit
        // Bestände-Zahl, da der volle Name in beiden Fällen nicht direkt
        // sichtbar ist (Auftrag "Beschriftungs-Kürzung mit Ellipse", Schritt 3:
        // "Tooltip zeigt weiterhin den vollständigen Namen").
        tooltipFn = () => (beschriftet === 'voll' ? kategorieName : `${kategorieName} (${d.leaves().length} Bestände)`);
      }

      wireFokusHighlight(gruppe, pfad, ruheZustand);

      if (klick === 'waehlen') {
        // Punkt B/C (unverändert): Klick öffnet/schließt die Sidebar (Toggle
        // bei bereits ausgewähltem Segment) - der Hover-Tooltip bleibt
        // zusätzlich bestehen, beide schließen sich nicht aus.
        gruppe.style('cursor', 'pointer').attr('role', 'button')
          .attr('aria-label', `${d.data.name} auswählen`)
          .on('click', () => waehleBestand(d.data))
          .on('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); waehleBestand(d.data); }
          });
      } else if (klick === 'zoomen') {
        gruppe.style('cursor', 'zoom-in').attr('role', 'button')
          .attr('aria-label', `Kategorie ${kategorieName} öffnen`)
          .on('click', () => wechsleZuKategorie(kategorieDaten))
          .on('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); wechsleZuKategorie(kategorieDaten); }
          });
      }
      // klick === 'inert': bewusst KEIN Klick-/Tastatur-Handler, kein
      // Zeigercursor (siehe Kommentar bei ringe-Aufbau oben) - der Hover-
      // Tooltip bleibt trotzdem informativ nutzbar.

      wireTooltip(gruppe, tooltipFn, svgBereich);
    });
  });

  const gesamtAnzahl = wurzel.leaves().length;
  zeichneZentrum(svg, svgBereich, inKategorieAnsicht ? null : gesamtAnzahl);
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  container.innerHTML = '';

  // Eigener Unter-Container fürs SVG (siehe fuegeStyleEin()) - container
  // (die geteilte .viz-inhalt) trägt daneben die Sidebar; svgBereich ist
  // tabindex="-1" programmatisches Fokus-Ziel beim Schließen der Sidebar
  // per Klick auf das soeben zerstörte Bestand-Segment (analog zu
  // treemap.js, siehe waehleBestand()).
  const svgBereich = document.createElement('div');
  svgBereich.className = 'sunburst-svg-bereich';
  svgBereich.setAttribute('tabindex', '-1');
  container.appendChild(svgBereich);

  fuegeStyleEin(container);
  fuegeSidebarStyleEin(container);
  // Anker für den fest (oben rechts) positionierten Info-Button, siehe
  // .sunburst-info-button-anker (position:absolute) - braucht einen
  // positionierten Vorfahren, damit sich "oben rechts" auf den Modulbereich
  // selbst bezieht statt auf ein weiter außen liegendes Element (dasselbe
  // Muster wie zeitachse.js).
  container.style.position = 'relative';
  const sidebar = baueSidebarGeruest(container);

  // Eigener, von zeichneSunburst() nie angetasteter Geschwister-Container
  // (wie die Sidebar) - Info-Button wird bewusst NUR EINMAL pro render()
  // erzeugt, nicht bei jedem Redraw neu (würde sonst bei jedem Klick neue
  // document-Listener registrieren, siehe infoButton.js).
  const infoButtonContainer = document.createElement('div');
  infoButtonContainer.className = 'sunburst-info-button-anker';
  container.appendChild(infoButtonContainer);
  const infoButton = erzeugeInfoButton(infoButtonContainer, {
    text: SUNBURST_INFO_TEXT,
    ariaLabel: 'Erklärung zum Sunburst'
  });

  const hierarchieDaten = baueBestandsHierarchie(data, MINDESTGROESSE_ROH_SUNBURST);
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
  zeichneSunburst();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneSunburst();
}

export function destroy() {
  if (!instanz) return;
  instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
