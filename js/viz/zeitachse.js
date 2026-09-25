// js/viz/zeitachse.js
// Zeitachse der Urkunden: ein Punkt pro Urkunde, positioniert nach Jahr (Abschnitt 9).
// Modul-Interface siehe Abschnitt 5. Undatierte Urkunden (kein auswertbares Jahr)
// erscheinen sichtbar in einem eigenen Bereich (Abschnitt 12), nicht ausgeblendet.
//
// NEUAUFBAU (Auftrag "Zeitachse – Neuaufbau nach Alpha-Vorbild"): ersetzt das
// bisherige vertikale Stapel-Layout ("Stalaktiten": Punkte eines Jahres
// wurden per stapelIndex stur nach unten gereiht) durch ein echtes
// Beeswarm-Layout (d3-force), ergänzt Zoom/Pan sowie Klick-zu-Sidebar. Die
// Farbkodierung nach Kategorie (CAT_COLORS) war bereits vorher vorhanden und
// bleibt inhaltlich unverändert - siehe farbeFuerKategorie()/ersteKategorie().
//
// Unsicherheits-Filter (Punkt 5, siehe Auftrag): anders als vorher (wo der
// Toggle nur die Stroke-Farbe eines Punktes umschaltete, aber nie einen
// Punkt wirklich verbarg) filtert options.showUncertainty jetzt ECHT - nicht
// zutreffende Urkunden verschwinden komplett aus records/Beeswarm/Undatiert-
// Bereich, nicht nur optisch ausgegraut. Kriterien identisch zu
// regestenKachelraster.js' istRecordUnsicher() (dort nicht exportiert, daher
// hier als eigene, bewusst inhaltsgleiche Kopie - siehe dortiger Nicht-Ziel:
// keine Änderung an regestenKachelraster.js).
//
// FOLGEAUFTRAG "Größe & Kategorie-Mehrfachauswahl": zwei Nachbesserungen an
// diesem bereits abgenommenen Modul, OHNE Beeswarm-Algorithmus/Zoom-Pan-
// Mechanik/Sidebar-Klick-Logik anzufassen (Nicht-Ziel, wörtlich):
// (A) die verfügbare Bildschirmhöhe wird jetzt zur Laufzeit gemessen
//     (ermittleVerfuegbareHoehe()) und fließt als Ziel-/Mindesthöhe in
//     berechneBeeswarm() ein, statt dass die SVG-Höhe rein aus der
//     natürlichen Ausdehnung der Simulation entsteht - dieselbe volle
//     Neuberechnung bei jedem resize() wie zuvor, nur zusätzlich
//     höhen-bewusst; zusätzlich passt sich die Zoom-Obergrenze der jeweils
//     aktuellen Breite an (ermittleZoomSkalenExtent()).
// (B) die bisherige reine Anzeige-Legende (baueLegende(), horizontal
//     scrollbare Leiste) weicht einem Mehrfachauswahl-Menü
//     (baueKategorieFilter()), das gleichzeitig als echter, mit dem
//     Unsicherheiten-Filter UND-verknüpfter Kategorie-Filter dient -
//     Neutralzustand (keine Auswahl) zeigt alle Punkte einheitlich in
//     NEUTRALE_PUNKTFARBE statt nach Kategorie eingefärbt.
//
// FOLGEAUFTRAG "Achsenbeschriftung & Kontrast": drei weitere Nachbesserungen,
// wieder OHNE Beeswarm-Algorithmus/Zoom-Pan/Sidebar/Kategorie-Filter/
// responsive Größenberechnung anzufassen (Nicht-Ziel):
// (A) X-Achse bekommt den Titel "Ausstellungsjahr" (Y-Achse hatte laut
//     Rückfrage im Auftrag ohnehin noch keinen - siehe SELBSTAUSKUNFT unten),
//     Y-Achse den Titel "Anzahl der Urkunden" (rotiert, Standard-D3-Muster).
//     SELBSTAUSKUNFT: im gesamten Projekt (alle 31 Viz-Module durchsucht)
//     existiert AKTUELL KEIN einziges Beispiel einer D3-Achsentitel-Rotation/
//     -Positionierung (weder bei den "Bestandsvisualisierungen" noch sonst
//     wo) - der Auftrag verweist auf eine Konvention, die es so nicht gibt.
//     Die Positionierung unten wurde daher neu, aber konsistent mit den im
//     Projekt bereits verwendeten Typografie-/Farb-Tokens (var(--fs-sm)/
//     var(--text-muted)) entworfen.
// (B) Tick-Schriftgröße 10px -> 14px (= var(--fs-sm), Faktor 1,4x, siehe
//     TICK_SCHRIFTGROESSE) - Tick-ANZAHL wird zusätzlich adaptiv an die
//     verfügbare Breite gekoppelt (ermittleTickAnzahl()), damit die größere
//     Schrift bei keiner Breite/Zoomstufe zu Überlappungen führt.
// (C) SELBSTAUSKUNFT (nach Rückfrage beim Nutzer): eine EINZELNE globale
//     Hintergrundfläche kann rechnerisch NICHT gegen alle 16 Kategorie-Farben
//     + Neutralfarbe + Standardfarbe (18 Farben) gleichzeitig 3:1 erreichen
//     (bewiesen per Erschöpfungssuche über den gesamten Grauwertebereich -
//     die hellsten ~6 Kategorie-Farben brauchen einen dunkleren Hintergrund,
//     die dunkelsten brauchen einen helleren; keine einzelne Fläche kann
//     beides gleichzeitig, ohne CAT_COLORS zu ändern, was laut Nicht-Ziel
//     ausgeschlossen ist). Auf Nutzerwunsch daher STATT einer globalen
//     Fläche: ein individuell pro Punkt berechneter Kontrast-Rand
//     (ermittleRandfarbe(), wiederverwendet passendeTextfarbe() aus
//     kategorieFarben.js - exakt dieselbe Schwarz/Weiß-Wahl-Logik, die dort
//     bereits für Badge-Text genutzt wird) - siehe Kontrast-Dokumentation
//     direkt bei ermittleRandfarbe().
//
// FOLGEAUFTRAG "Geteilte Viewport-Utilities": die lokale
// ermittleVerfuegbareHoehe() (Folgeauftrag "Größe & Kategorie-Mehrfachauswahl")
// ist jetzt in js/utils/viewportGroesse.js ausgelagert (Punkt 1) - identische
// Formel, nur containerunabhängig statt hier lokal dupliziert, damit künftige
// Urkunden-Module sie mitnutzen können. Zusätzlich neuer Mindestgrößen-
// Platzhalter (Punkt 2, js/utils/bildschirmHinweis.js): unterhalb von 900×500px
// (window.innerWidth/-Height) ersetzt ein einheitlicher Hinweistext die
// gesamte Visualisierung, geprüft bei jedem zeichneZeitachse()-Aufruf (also
// sowohl render() als auch jedes resize()-Ereignis, da zeichneZeitachse()
// von beiden unconditional aufgerufen wird - keine Strukturänderung an
// render()/resize() nötig). Beeswarm-Algorithmus/Zoom-Pan/Sidebar/Kategorie-
// Filter selbst unangetastet (Nicht-Ziel).
//
// AUFTRAG "Geteilter Info-Button mit Erklär-Popover": der feste
// Bedienhinweistext "Scrollen = Zoom · Ziehen = Verschieben" entfällt,
// ersetzt durch den geteilten Info-Button (js/utils/infoButton.js) mit
// ausführlicherem Erklärtext (siehe ZEITACHSE_INFO_TEXT). Anders als das
// Kategorie-Menü (das bei jedem zeichneZeitachse()-Neuaufbau innerhalb von
// `wurzel` mit-entsteht) wird der Info-Button bewusst NUR EINMAL in
// render() erzeugt, in einem eigenen, von zeichneZeitachse() nie
// angetasteten Geschwister-Container (analog zur Sidebar) - er registriert
// eigene document-Listener (Außerhalb-Klick/Escape), die sonst bei jedem
// Neuaufbau erneut angehängt würden (Listener-Leck), und sein Text ändert
// sich ohnehin nie zur Laufzeit.
//
// AUFTRAG "Sidebar-Lightbox & app-weite Vereinheitlichung": die bis dahin
// hier lokal gehaltene Urkunden-Sidebar-Detailansicht (Datum/Orte/Personen/
// Kategorien/Regest/Unsicher-Hinweis, OHNE Fotogalerie) ist auf die
// inzwischen geteilte js/utils/sidebar.js' zeigeUrkundenDetail()/
// baueUrkundenDetailInhalt() umgestellt - Klick auf einen Punkt zeigt
// dadurch jetzt zusätzlich die Fotogalerie samt Lightbox (siehe
// oeffneSidebar() weiter unten für die Migrations-Details).

import { CAT_COLORS } from '../config/constants.js';
import { passendeTextfarbe } from '../utils/kategorieFarben.js';
import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import {
  teileNachJahr,
  ersteKategorie,
  baueUrkundenTooltipText,
  zeichneUnbekanntBereich
} from '../utils/urkundenZeit.js';
import {
  baueSidebarGeruest,
  schliesseSidebar as schliesseSidebarModul,
  fuegeSidebarStyleEin,
  zeigeUrkundenDetail
} from '../utils/sidebar.js';
import { ermittleVerfuegbareHoehe, ermittleVerfuegbareBreite } from '../utils/viewportGroesse.js';
import {
  istBildschirmZuKlein,
  baueBildschirmHinweis,
  fuegeBildschirmHinweisStyleEin
} from '../utils/bildschirmHinweis.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';

// Auftrag "Geteilter Info-Button", Punkt 2 - Text wörtlich wie im Auftrag
// formuliert übernommen (Akzeptanzkriterium: "keine eigenmächtige
// Umformulierung"), Absätze durch Leerzeilen getrennt (siehe infoButton.js).
const ZEITACHSE_INFO_TEXT = `Diese Visualisierung zeigt alle Urkunden verteilt über ihr Ausstellungsjahr. Jeder Punkt steht für eine Urkunde; die Farbe zeigt ihre thematische Kategorie. Jahre mit vielen Urkunden bilden dichte Punktwolken, einzelne Jahre mit wenigen Urkunden erscheinen als vereinzelte Punkte.

Mit dem Mausrad kann in die Zeitachse hinein- und herausgezoomt werden, durch Ziehen lässt sich der sichtbare Ausschnitt verschieben. Ein Klick auf einen Punkt öffnet die Detailansicht der jeweiligen Urkunde. Über das Kategorie-Menü lassen sich einzelne oder mehrere Themenbereiche gezielt ein- oder ausblenden. Der Button „Unsicherheiten anzeigen" zeigt ausschließlich jene Urkunden, deren Datierung, Ort oder beteiligte Personen nicht sicher überliefert sind.`;

const PUNKT_RADIUS = 4;
// "oben" entfällt bewusst gegenüber der alten RAND-Konstante: die
// Beeswarm-Höhe wird jetzt aus der tatsächlich erreichten Ausdehnung der
// Simulation berechnet (siehe berechneBeeswarm()/PLOT_PADDING_Y), nicht mehr
// aus einem festen oberen Rand vor der ersten Stapel-Reihe.
//
// FOLGEAUFTRAG "Achsenbeschriftung": unten/links gegenüber vorher (30/30)
// vergrößert, um Platz für die neuen Achsentitel UND die größere
// Tick-Schrift (Punkt B) zu schaffen, ohne dass Titel/Zahlen sich
// überlappen (Akzeptanzkriterium Punkt A) - Werte per Sichtprüfung im Test
// ermittelt (siehe Screenshots im Auftrag).
const RAND = { unten: 58, links: 55, rechts: 20 };

// Punkt B: 10px -> 14px (= var(--fs-sm), Faktor 1,4x - siehe Dateikopf-
// Kommentar). TICK_MIN_PIXELABSTAND steuert die adaptive Tick-Anzahl
// (ermittleTickAnzahl()): 90px pro Tick reicht bei 14px-Schrift sicher für
// vierstellige Jahreszahlen samt Abstand zueinander.
const TICK_SCHRIFTGROESSE = 14;
const TICK_MIN_PIXELABSTAND = 90;

// Punkt A: Achsentitel-Texte, Abstand vom jeweiligen Tick-Beschriftungsrand.
const X_ACHSEN_TITEL = 'Ausstellungsjahr';
const Y_ACHSEN_TITEL = 'Anzahl der Urkunden';
const ACHSENTITEL_SCHRIFTGROESSE = 13;

// Beeswarm-Simulation (Punkt 1): forceX zieht jeden Punkt zu seiner exakten
// Jahres-x-Position, forceY zu einer gemeinsamen horizontalen Mittelachse,
// forceCollide verhindert Überlappung - genau die im Auftrag benannte
// Kombination. 200 Ticks synchron (kein animiertes Einpendeln) reichen bei
// ~1069 Punkten für ein stabiles Ergebnis; ein einzelner Tick-Lauf ist auch
// bei jedem Redraw (z.B. Unsicherheiten-Toggle) noch spürbar unter 100ms und
// muss nicht zwischengespeichert werden.
const SIM_TICKS = 200;
const FORCEX_STAERKE = 0.85;
const FORCEY_STAERKE = 0.06;
const COLLIDE_ABSTAND = PUNKT_RADIUS + 1.5;
const PLOT_PADDING_Y = 12;
const MIN_PLOT_HOEHE = 100;

// Punkt 4 (Zoom/Pan): [1,40] erlaubt das Hineinzoomen bis auf einzelne
// Jahre, ohne beliebig weit über die Datenspanne hinaus verkleinern zu
// können (untere Grenze 1 = Ausgangszustand). Gleiches Muster wie
// ganttDiagramm.js' ZOOM_SCALE_EXTENT, dort [1,20] - hier etwas großzügiger,
// weil die Zeitachse über mehrere Jahrhunderte reicht (gantt-Zeiträume sind
// i.d.R. kürzer).
const ZOOM_SCALE_MIN = 1;
// Punkt A: die bisher feste Obergrenze 40 wird durch ermittleZoomSkalenExtent()
// ersetzt, die die tatsächliche Breite berücksichtigt (schmales Fenster =
// weniger Pixel pro Jahr sinnvoll auflösbar, breiter Bildschirm erlaubt
// tieferes Hineinzoomen) - 40 bleibt als Untergrenze für die Obergrenze
// selbst erhalten (auch ein schmales Fenster soll mindestens so tief zoomen
// können wie bisher).
const ZOOM_SCALE_MAX_MIN = 40;
const PIXEL_PRO_ZOOMSTUFE = 25; // je 25px Breite ein weiterer Zoomstufen-Punkt an der Obergrenze


// Punkt B: Neutralfarbe im Nicht-gefilterten Grundzustand (keine Kategorie
// ausgewählt) - bewusst der App-Akzentton (--accent), damit klar erkennbar
// eine bewusste, einheitliche Farbe ist und nicht zufällig mit einer der 16
// CAT_COLORS-Farben verwechselt werden kann.
//
// FOLGEAUFTRAG "Kontrast" (Punkt C): als literaler Hex-Wert statt
// `var(--accent)` hinterlegt (identisch zu base.css' --accent: #2c4a6e) -
// ermittleRandfarbe() unten muss mit wcagKontrast()/relativeLuminanz()
// tatsächlich rechnen können, was mit einer CSS-Variablen-Referenz als
// String nicht möglich wäre. Bei einer künftigen Änderung von --accent in
// base.css muss dieser Wert manuell nachgezogen werden (bewusster
// Kompromiss, dokumentiert statt stillschweigend riskiert).
const NEUTRALE_PUNKTFARBE = '#2c4a6e';

// AUFTRAG "Teil 2h", Punkt 2: Deckkraft der NICHT ausgewählten Punkte bei
// aktiver Hervorhebung - "als Wert in einer Konstante" (Auftrag wörtlich).
// Wirkt auf `opacity` (nicht `fill-opacity`), deckt dadurch automatisch
// sowohl die Füllung als auch den Unsicher-Rand (Punkt 5, `stroke`) mit ab -
// zeitachse.js hat KEIN separates σ-Icon je Punkt (anders als die sieben
// WARN_SYMBOL-Module), die Unsicherheit wird ausschließlich über den
// Punkt-Rand kodiert (s.u.), "σ tritt mit zurück" ist damit bereits erfüllt.
const HERVORHEBUNG_DIM_OPAZITAET = 0.12;

let instanz = null; // { container, wurzel, sidebar, infoButton, records, options, zoomVerhalten, zoomTransform, letzteBreite, ausgewaehltesRecord, punkteAuswahl, ausgewaehlteKategorien, kategorieMenuOffen, kategoriePanel, kategorieTriggerBtn } – eine aktive Zeitachse pro Modul-Ladung

function farbeFuerKategorie(kategorie) {
  return CAT_COLORS[kategorie] || CAT_COLORS.default;
}

// Punkt 5, Kriterien wörtlich aus dem Auftrag - identisch zu
// regestenKachelraster.js' istRecordUnsicher() (siehe Dateikopf-Kommentar:
// bewusste, inhaltsgleiche Kopie statt Import, da dort nicht exportiert und
// eine Änderung an regestenKachelraster.js außerhalb des Auftragsrahmens
// läge).
function istRecordUnsicher(record) {
  const anmerkung = record.unsicherheit_anmerkung;
  const anmerkungVorhanden = Array.isArray(anmerkung) ? anmerkung.length > 0 : !!(anmerkung && anmerkung.trim() !== '');
  return !!(record.datum_unsicher || record.orte_unsicher || record.personen_unsicher || anmerkungVorhanden);
}

// Punkt 2/B: die 16 echten Kategorie-Werte, u.a. für das Mehrfachauswahl-
// Menü (baueKategorieFilter()) - gleicher Ausschluss der beiden technischen
// Fallback-Schlüssel wie in filterleiste.js/regestenKachelraster.js (dort
// ebenfalls nicht exportiert, daher auch hier eine kleine, bewusst
// inhaltsgleiche Kopie).
function ermittleAlleKategorien() {
  return Object.keys(CAT_COLORS).filter((schluessel) => schluessel !== 'default' && schluessel !== '__unbekannt__');
}
const ANZAHL_KATEGORIEN = ermittleAlleKategorien().length; // CAT_COLORS ändert sich nicht zur Laufzeit - einmalig berechnet statt bei jedem Filter-Aufruf pro Record neu

// Punkt 3, Feldauswahl: "gleiche Feldauswahl wie in der aufgeklappten
// Kachelraster-Ansicht" (Signatur/Datum/Orte/Personen/Kategorien/Regest).
// URSPRÜNGLICHE SELBSTAUSKUNFT (Auftrag "Zeitachse" verlangte Rückmeldung,
// falls eine gemeinsame Detail-Darstellung nicht 1:1 übernommen werden
// kann): js/utils/sidebar.js' baueSidebarInhalt()/oeffneSidebar() waren
// fest auf das Bestandsverzeichnis-Schema zugeschnitten - keines dieser
// Felder existiert bei Urkunden-Records, der Inhalt wurde daher HIER lokal
// gebaut (baueUrkundenSidebarInhalt(), inhaltlich fast identisch zur
// späteren, geteilten Version unten, aber OHNE Fotogalerie/Lightbox).
//
// AUFTRAG "Sidebar-Lightbox & app-weite Vereinheitlichung", Punkt 0/2: seit
// dem Auftrag "Sidebar-Liste – Regest-Vorschauzeile & Inline-Detailansicht"
// existiert in js/utils/sidebar.js genau diese Urkunden-spezifische
// Detailansicht bereits geteilt (baueUrkundenDetailInhalt(), inkl.
// Fotogalerie) - die lokale Parallel-Implementierung hier (baueSidebarFeld()/
// baueUrkundenSidebarInhalt()) entfällt daher vollständig zugunsten von
// zeigeUrkundenDetail() (Import s.o.). oeffneSidebar() bleibt als DÜNNER
// Wrapper bestehen, der zusätzlich instanz.ausgewaehltesRecord nachführt -
// das braucht die Filterwechsel-Logik weiter unten (schließt die Sidebar,
// falls die gerade angezeigte Urkunde aus der sichtbaren Menge fällt), ist
// aber KEIN Teil der generischen sidebar.js-Logik (die kennt "Filter" nicht).
// AUFTRAG "Teil 2h", Punkt 2: Hervorhebung ausschließlich über diese beiden
// bestehenden Funktionen gesteuert (Auftrag wörtlich: "keine zweite
// Logik") - jeder Aufrufer, der bereits `oeffneSidebar()`/`schliesseSidebar()`
// nutzt (Klick auf einen Punkt, `oeffneDatensatz()` s.u. für den
// Datensatzaufruf aus einer Führung), bekommt die Hervorhebung dadurch
// automatisch mit, ohne selbst etwas davon zu wissen.
function oeffneSidebar(record) {
  instanz.ausgewaehltesRecord = record;
  zeigeUrkundenDetail(instanz.sidebar, record);
  aktualisiereHervorhebung();
}

function schliesseSidebar() {
  if (!instanz) return;
  instanz.ausgewaehltesRecord = null;
  schliesseSidebarModul(instanz.sidebar, instanz.wurzel);
  aktualisiereHervorhebung();
}

// Setzt/aktualisiert `opacity` auf der AKTUELLEN Punkte-Selektion
// (`instanz.punkteAuswahl`, bei jedem Neuaufbau in zeichneZeitachse()
// frisch gesetzt) - reiner Style-Update ohne Neuaufbau, wie
// aktualisiereHighlight()/aktualisiereHervorhebung() in den anderen
// Modulen mit Klick-Hervorhebung (chordDiagramm.js/familienbaum.js).
function aktualisiereHervorhebung() {
  if (!instanz || !instanz.punkteAuswahl) return;
  const ausgewaehlt = instanz.ausgewaehltesRecord;
  instanz.punkteAuswahl.attr('opacity', (d) => (
    ausgewaehlt && d.record !== ausgewaehlt ? HERVORHEBUNG_DIM_OPAZITAET : 1
  ));
}

function wireInteraktion(auswahl, container) {
  auswahl
    .on('mouseenter focus', function (event, d) {
      zeigeTooltip(baueUrkundenTooltipText(d.record), this, container);
    })
    .on('mouseleave blur', () => versteckeTooltip())
    .on('click', (event, d) => oeffneSidebar(d.record))
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        oeffneSidebar(d.record);
      }
    });
}

// Punkt A: Zoom-Obergrenze richtet sich nach der tatsächlichen Breite (mehr
// Pixel pro Jahr sinnvoll auflösbar = tieferes Zoomen sinnvoll) statt einem
// festen Wert - wird bei jedem Neuaufbau mit der jeweils aktuellen `breite`
// neu berechnet.
function ermittleZoomSkalenExtent(breite) {
  const obergrenze = Math.max(ZOOM_SCALE_MAX_MIN, Math.round(breite / PIXEL_PRO_ZOOMSTUFE));
  return [ZOOM_SCALE_MIN, obergrenze];
}

// Punkt 1 (unverändert, Nicht-Ziel dieses Folgeauftrags): reines Beeswarm -
// forceX hält jeden Punkt nahe an seiner tatsächlichen Jahres-x-Position,
// forceY zieht zu einer gemeinsamen Mittelachse, forceCollide verteilt bei
// vielen Urkunden desselben Jahres symmetrisch nach links/rechts/oben/unten.
// d.dx merkt sich die durch die Kollisionsauflösung entstandene, kleine
// horizontale Abweichung von der exakten Jahresposition - wird von
// wireZoom() gebraucht (siehe dortiger Kommentar).
//
// NEU in diesem Folgeauftrag (Punkt A) ist ausschließlich der Parameter
// zielHoehe (die von ermittleVerfuegbareHoehe() gemessene, tatsächlich
// verfügbare Bildschirmhöhe) - er ersetzt den vorherigen hartkodierten
// Anker-Wert 200 und bestimmt, ob der Schwarm mittig in der verfügbaren
// Fläche zentriert wird (genug Platz vorhanden) oder eng von oben beginnt
// (Datensatz braucht mehr Platz, als der Bildschirm hergibt - dann wächst
// die Höhe über zielHoehe hinaus, damit nichts gestaucht/überlappt wird).
// forceX/forceY/forceCollide selbst, ihre Stärken und die Tick-Zahl bleiben
// unverändert - das ist weiterhin derselbe, bereits bestätigte Algorithmus.
function berechneBeeswarm(mitJahr, xSkalaBasis, zielHoehe) {
  if (mitJahr.length === 0) return { knoten: [], hoehe: Math.max(MIN_PLOT_HOEHE, zielHoehe) };

  const mitteAnker = zielHoehe / 2;
  const knoten = mitJahr.map((eintrag) => ({
    ...eintrag,
    x: xSkalaBasis(eintrag.jahr) + (Math.random() - 0.5),
    y: mitteAnker + (Math.random() - 0.5)
  }));

  const simulation = d3.forceSimulation(knoten)
    .force('x', d3.forceX((d) => xSkalaBasis(d.jahr)).strength(FORCEX_STAERKE))
    .force('y', d3.forceY(mitteAnker).strength(FORCEY_STAERKE))
    .force('collide', d3.forceCollide(COLLIDE_ABSTAND))
    .stop();
  for (let i = 0; i < SIM_TICKS; i += 1) simulation.tick();

  const [yMin, yMax] = d3.extent(knoten, (d) => d.y);
  const natuerlicheHoehe = (yMax - yMin) + 2 * PLOT_PADDING_Y;

  // Passt der Schwarm bequem in die verfügbare Höhe: mittig zentrieren, damit
  // die Fläche tatsächlich ausgefüllt aussieht (statt oben zu kleben und
  // darunter leer zu bleiben). Braucht er MEHR Platz als verfügbar: eng von
  // oben beginnen (wie zuvor) und die Höhe über zielHoehe hinaus wachsen
  // lassen, statt zu stauchen/überlappen zu lassen.
  const verschiebung = natuerlicheHoehe <= zielHoehe
    ? zielHoehe / 2 - (yMin + yMax) / 2
    : PLOT_PADDING_Y - yMin;
  knoten.forEach((d) => {
    d.y += verschiebung;
    d.dx = d.x - xSkalaBasis(d.jahr);
  });

  const hoehe = Math.max(MIN_PLOT_HOEHE, zielHoehe, natuerlicheHoehe);
  return { knoten, hoehe };
}

// Punkt 4: exakt das in ganttDiagramm.js etablierte Muster (rescaleX() auf
// einer FIXEN Basis-Skala statt die Simulation neu zu berechnen) - ABER
// bewusst OHNE dessen Strg+Wheel-Einschränkung: der Auftrag verlangt hier
// wörtlich "Scrollen = Zoom" wie im Alpha-Screenshot beschrieben, nicht
// Strg+Scrollen (ganttDiagramm.js schützt damit das vertikale Seiten-
// Scrollen über einer breiten Tabelle - hier ist die Zeitachse der einzige
// Achsen-Inhalt, ein einfacher Mausrad-Zoom entspricht daher exakt der
// Vorgabe). Die x-Position jedes Punktes wird bei jedem Zoom-Schritt direkt
// aus dessen Jahr NEU berechnet (neueXSkala(d.jahr) + d.dx), nicht aus dem
// alten cx skaliert - dadurch bleibt jeder Punkt bei jeder Zoomstufe exakt an
// seiner Jahresposition (plus der kleinen, konstanten Kollisions-Abweichung
// dx), ohne Verzerrung (r bleibt konstant, y wird nie skaliert) und ohne
// Drift nach mehrfachem Zoomen (jede Berechnung geht wieder von d.jahr aus,
// keine Akkumulation von Rundungsfehlern über mehrere Zoom-Schritte hinweg).
function wireZoom({ svgAuswahl, xSkalaBasis, achseGruppe, punkteAuswahl, breite, hoehe, skalenExtent, tickAnzahl }) {
  const zoomVerhalten = d3.zoom()
    .scaleExtent(skalenExtent)
    .translateExtent([[0, 0], [breite, hoehe]])
    .extent([[0, 0], [breite, hoehe]])
    // clickDistance (Standard: 0 bei d3-zoom): live gegen einen echten Klick
    // getestet, mit 0 blieb Punkt 3 (Klick öffnet Sidebar) wirkungslos - jede
    // noch so minimale Zeiger-Bewegung zwischen mousedown/mouseup (auch
    // technisch bedingtes Sub-Pixel-Zittern, nicht nur absichtliches Ziehen)
    // wertete d3-zoom bereits als Pan-Geste und unterdrückte das
    // anschließende native click-Ereignis auf dem Kreis. 6px Toleranz lässt
    // echtes Ziehen (Punkt 4) weiterhin normal zum Verschieben führen, ohne
    // einen beabsichtigten Klick auf einen Punkt zu verschlucken.
    .clickDistance(6)
    .on('zoom', (event) => {
      instanz.zoomTransform = event.transform;
      const neueXSkala = event.transform.rescaleX(xSkalaBasis);
      // Punkt B (Folgeauftrag): tickAnzahl bleibt bei jedem Zoom-Schritt
      // dieselbe, breiten-abhängige Vorgabe wie beim Erstaufbau (siehe
      // ermittleTickAnzahl()) - verhindert Überlappung der größeren
      // 14px-Schrift bei JEDER Zoomstufe, nicht nur beim Ausgangszustand.
      achseGruppe.call(d3.axisBottom(neueXSkala).ticks(tickAnzahl).tickFormat(d3.format('d')));
      punkteAuswahl.attr('cx', (d) => neueXSkala(d.jahr) + d.dx);
    });

  svgAuswahl.call(zoomVerhalten);
  if (instanz.zoomTransform) {
    svgAuswahl.call(zoomVerhalten.transform, instanz.zoomTransform);
  }
  return zoomVerhalten;
}

// Punkt B: true, wenn der Kategorie-Filter aktiv einschränkt (0 < Auswahl <
// 16) - "Alle auswählen" (=16) ist laut Auftrag "entspricht dem bisherigen
// Default-Verhalten" und schränkt NICHT ein (auch die 14 Urkunden ganz ohne
// Kategorie bleiben dann sichtbar, siehe passtKategorieFilter()).
function kategorieFilterSchraenktEin() {
  const anzahl = instanz.ausgewaehlteKategorien.size;
  return anzahl > 0 && anzahl < ANZAHL_KATEGORIEN;
}

function passtKategorieFilter(record) {
  if (!kategorieFilterSchraenktEin()) return true;
  const kategorienListe = Array.isArray(record.kategorien) ? record.kategorien : (record.kategorien ? [record.kategorien] : []);
  return kategorienListe.some((k) => instanz.ausgewaehlteKategorien.has(k));
}

// Punkt B: Neutralzustand (keine Auswahl) => einheitliche Farbe, jede Auswahl
// (auch "Alle auswählen") => Kategorie-Farbe wie zuvor.
function ermittleAnzeigeFarbe(record) {
  if (instanz.ausgewaehlteKategorien.size === 0) return NEUTRALE_PUNKTFARBE;
  return farbeFuerKategorie(ersteKategorie(record));
}

// FOLGEAUFTRAG "Achsenbeschriftung & Kontrast", Punkt C: individueller
// Kontrast-Rand statt globaler Hintergrundfläche (nach Rückfrage beim
// Nutzer - eine einzelne Fläche kann rechnerisch NICHT 3:1 gegen alle 18
// verwendeten Punktfarben gleichzeitig erreichen, siehe Dateikopf-
// Kommentar). Wiederverwendet passendeTextfarbe() aus kategorieFarben.js
// UNVERÄNDERT (dieselbe Schwarz/Weiß-Wahl per echter WCAG-Formel, die auch
// für die Sidebar-Badge-Textfarbe genutzt wird, siehe js/utils/sidebar.js'
// baueUrkundenDetailInhalt()) - keine neue Kontrastlogik, nur ein neuer
// Anwendungsfall derselben bereits geprüften Funktion.
//
// Kontrastprüfung aller 18 tatsächlich vorkommenden Punktfarben gegen die
// von passendeTextfarbe() gewählte Randfarbe (per Skript mit derselben
// wcagKontrast()-Formel nachgerechnet, alle ≥ 3:1 WCAG 1.4.11):
//   Bevölkerung                          8,26:1 (weißer Rand)
//   Bildung und Erziehung                6,70:1 (dunkler Rand)
//   Gesundheit                           4,98:1 (dunkler Rand)
//   Grund und Boden                     11,39:1 (dunkler Rand)
//   Kultur                               4,79:1 (dunkler Rand)
//   Medien                               9,87:1 (dunkler Rand)
//   Politik                              4,51:1 (dunkler Rand) - schwächster Fall, weiterhin klar über 3:1
//   Privatvermögen                      10,07:1 (dunkler Rand)
//   Rechtswesen                          4,81:1 (dunkler Rand)
//   Religion                             7,05:1 (dunkler Rand)
//   Soziales Leben                       9,47:1 (weißer Rand)
//   Stadt und Raum                       4,71:1 (weißer Rand)
//   Verkehr, Ver- und Entsorgung          9,86:1 (weißer Rand)
//   Vermögen und Finanzen                5,22:1 (dunkler Rand)
//   Verwaltung                           7,53:1 (weißer Rand)
//   Wirtschaft                           5,08:1 (dunkler Rand)
//   default/__unbekannt__                4,91:1 (dunkler Rand)
//   NEUTRALE_PUNKTFARBE (--accent)       9,08:1 (weißer Rand)
// (Werte identisch zur bereits bestehenden Text-Kontrastdokumentation in
// constants.js, da passendeTextfarbe() dieselbe Berechnung für denselben
// Satz Farben durchführt - dort für Text, hier für den Punkt-Rand.)
function ermittleRandfarbe(record) {
  return passendeTextfarbe(ermittleAnzeigeFarbe(record));
}

// Punkt B: adaptive Tick-Anzahl statt eines festen Werts - TICK_MIN_PIXELABSTAND
// pro Tick verhindert bei der größeren 14px-Schrift Überlappungen
// benachbarter Jahreszahlen, unabhängig von Container-Breite oder Zoomstufe
// (wird sowohl beim Erstaufbau als auch bei jedem Zoom-Schritt verwendet,
// siehe wireZoom()).
function ermittleTickAnzahl(breite) {
  return Math.max(3, Math.floor(breite / TICK_MIN_PIXELABSTAND));
}

// Öffnet/schließt das Panel rein per DOM-Zustand (KEIN zeichneZeitachse()) -
// ein kompletter Neuaufbau inkl. 200-Tick-Beeswarm-Simulation wäre für einen
// bloßen Öffnen/Schließen-Klick unnötige Arbeit (bis zu 1069 Knoten). Nur
// eine tatsächliche Auswahländerung (Checkbox/Alle/Zurücksetzen) löst weiter
// unten einen echten Neuaufbau aus.
function setzeKategorieMenuOffen(offen) {
  instanz.kategorieMenuOffen = offen;
  if (instanz.kategoriePanel) instanz.kategoriePanel.hidden = !offen;
  if (instanz.kategorieTriggerBtn) instanz.kategorieTriggerBtn.setAttribute('aria-expanded', String(offen));
}

// Schließt das Menü bei Klick außerhalb - ein einziger, in render() EINMAL
// registrierter document-Listener (siehe dortiger Kommentar), damit bei
// jedem Neuaufbau (Filteränderung, Resize) kein weiterer Listener
// hinzukommt und sich über die Zeit ansammelt.
function behandleDokumentKlick(event) {
  if (!instanz || !instanz.kategorieMenuOffen) return;
  if (!event.target.closest('.zeitachse-kategorie-filter')) setzeKategorieMenuOffen(false);
}

function behandleDokumentTaste(event) {
  if (!instanz) return;
  if (event.key !== 'Escape') return;
  if (instanz.kategorieMenuOffen) {
    setzeKategorieMenuOffen(false);
    if (instanz.kategorieTriggerBtn) instanz.kategorieTriggerBtn.focus();
    return;
  }
  // AUFTRAG "Teil 2h", Punkt 2 (Auftrag wörtlich: "Die Hervorhebung endet
  // ... bei Escape"): schließt dieselbe Sidebar wie der ×-Button - dieselbe
  // Funktion, die auch die Hervorhebung zurücksetzt (siehe schliesseSidebar()
  // oben), keine zweite Logik.
  if (instanz.ausgewaehltesRecord) schliesseSidebar();
}

// Jede tatsächliche Auswahländerung braucht laut Auftrag einen echten
// Neuaufbau ("Beeswarm-Layout muss sich bei Filteränderung neu berechnen") -
// das Menü bleibt dabei bewusst offen (instanz.kategorieMenuOffen bleibt
// unverändert), damit mehrere Kategorien nacheinander angehakt werden können,
// ohne das Panel nach jedem Klick erneut öffnen zu müssen.
function aktualisiereKategorieAuswahl(neueAuswahl) {
  instanz.ausgewaehlteKategorien = neueAuswahl;
  zeichneZeitachse();
}

function baueKategorieFilter() {
  const wrapper = document.createElement('div');
  wrapper.className = 'zeitachse-kategorie-filter';

  const alleKategorien = [...ermittleAlleKategorien()].sort((a, b) => a.localeCompare(b, 'de'));
  const anzahlAusgewaehlt = instanz.ausgewaehlteKategorien.size;
  const beschriftung = anzahlAusgewaehlt === 0
    ? 'Kategorie: keine Auswahl (alle sichtbar)'
    : anzahlAusgewaehlt >= ANZAHL_KATEGORIEN
      ? 'Kategorie: alle ausgewählt'
      : `Kategorie: ${anzahlAusgewaehlt} ausgewählt`;

  const triggerBtn = document.createElement('button');
  triggerBtn.type = 'button';
  triggerBtn.className = 'zeitachse-kategorie-btn';
  triggerBtn.textContent = beschriftung;
  triggerBtn.setAttribute('aria-haspopup', 'true');
  triggerBtn.setAttribute('aria-expanded', String(instanz.kategorieMenuOffen));
  triggerBtn.addEventListener('click', (event) => {
    event.stopPropagation(); // sonst würde derselbe Klick sofort den document-Listener auslösen und das Panel wieder schließen
    setzeKategorieMenuOffen(!instanz.kategorieMenuOffen);
  });

  const panel = document.createElement('div');
  panel.className = 'zeitachse-kategorie-panel';
  panel.hidden = !instanz.kategorieMenuOffen;
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Kategorien auswählen');

  const aktionen = document.createElement('div');
  aktionen.className = 'zeitachse-kategorie-aktionen';
  const alleBtn = document.createElement('button');
  alleBtn.type = 'button';
  alleBtn.textContent = 'Alle auswählen';
  alleBtn.addEventListener('click', () => aktualisiereKategorieAuswahl(new Set(alleKategorien)));
  const zuruecksetzenBtn = document.createElement('button');
  zuruecksetzenBtn.type = 'button';
  zuruecksetzenBtn.textContent = 'Zurücksetzen';
  zuruecksetzenBtn.addEventListener('click', () => aktualisiereKategorieAuswahl(new Set()));
  aktionen.append(alleBtn, zuruecksetzenBtn);
  panel.appendChild(aktionen);

  const liste = document.createElement('div');
  liste.className = 'zeitachse-kategorie-liste';
  alleKategorien.forEach((kategorie) => {
    const label = document.createElement('label');
    label.className = 'zeitachse-kategorie-eintrag';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = instanz.ausgewaehlteKategorien.has(kategorie);
    checkbox.addEventListener('change', () => {
      const neueAuswahl = new Set(instanz.ausgewaehlteKategorien);
      if (checkbox.checked) neueAuswahl.add(kategorie); else neueAuswahl.delete(kategorie);
      aktualisiereKategorieAuswahl(neueAuswahl);
    });
    const swatch = document.createElement('span');
    swatch.className = 'zeitachse-legende-swatch';
    swatch.style.background = farbeFuerKategorie(kategorie);
    label.append(checkbox, swatch, document.createTextNode(kategorie));
    liste.appendChild(label);
  });
  panel.appendChild(liste);

  wrapper.append(triggerBtn, panel);
  instanz.kategoriePanel = panel;
  instanz.kategorieTriggerBtn = triggerBtn;
  return wrapper;
}

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .zeitachse-wurzel { display: flex; flex-direction: column; }
    .zeitachse-werkzeugleiste { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: var(--space-3); margin-bottom: var(--space-2); }
    .zeitachse-legende-swatch { width: 14px; height: 14px; border-radius: 3px; border: 1px solid var(--border); flex: 0 0 auto; }
    /* Auftrag "Geteilter Info-Button": fester Anker oben rechts im
       Modulbereich, unabhängig vom bei jedem Neuaufbau geleerten wurzel-Div
       (siehe render()-Kommentar zum Info-Button). */
    .zeitachse-info-button-anker { position: absolute; top: 0; right: 0; z-index: 25; }
    .zeitachse-plot-bereich { overflow: hidden; touch-action: none; }
    .urkunde-punkt { cursor: pointer; }
    .zeitachse-leer-hinweis { color: var(--text-muted); padding: var(--space-3) 0; }
    /* Folgeauftrag "Achsenbeschriftung": dezenter als die Tick-Zahlen selbst
       (die bleiben mit ihrer Standard-SVG-Füllung/-Schriftfarbe unverändert),
       damit Titel klar als Beschriftung und nicht als weiterer Datenwert lesbar sind. */
    .zeitachse-achsentitel { fill: var(--text-muted); font-weight: 600; }
    /* Per CSS statt .attr() gesetzt - siehe Kommentar bei achseGruppe in
       zeichneZeitachse() dazu, warum ein .attr('font-size', ...) hier von
       d3.axisBottom() selbst bei jedem Aufbau/Zoom-Schritt überschrieben würde. */
    .zeitachse-x-achse { font-size: ${TICK_SCHRIFTGROESSE}px; }
    /* Punkt B: Mehrfachauswahl-Menü ersetzt die vorherige horizontal
       scrollbare Legendenleiste - kompaktes Dropdown statt Platz für 16
       gleichzeitig sichtbare Einträge zu beanspruchen. */
    .zeitachse-kategorie-filter { position: relative; }
    .zeitachse-kategorie-btn { min-height: 44px; padding: 4px 12px; font: inherit; font-size: var(--fs-sm);
      border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); cursor: pointer; }
    .zeitachse-kategorie-btn:hover { border-color: var(--accent); }
    .zeitachse-kategorie-btn:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .zeitachse-kategorie-panel { position: absolute; top: calc(100% + 4px); left: 0; z-index: 20; min-width: 260px;
      max-height: 340px; overflow-y: auto; background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); box-shadow: var(--shadow); padding: var(--space-2); }
    .zeitachse-kategorie-aktionen { display: flex; gap: var(--space-2); margin-bottom: var(--space-2);
      padding-bottom: var(--space-2); border-bottom: 1px solid var(--border); }
    .zeitachse-kategorie-aktionen button { flex: 1 1 auto; min-height: 36px; font: inherit; font-size: var(--fs-sm);
      border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg); cursor: pointer; }
    .zeitachse-kategorie-aktionen button:hover { border-color: var(--accent); }
    .zeitachse-kategorie-liste { display: flex; flex-direction: column; gap: 2px; }
    .zeitachse-kategorie-eintrag { display: flex; align-items: center; gap: var(--space-2); font-size: var(--fs-sm);
      padding: 6px 4px; border-radius: 3px; cursor: pointer; }
    .zeitachse-kategorie-eintrag:hover { background: var(--bg); }
  `;
  container.appendChild(style);
}

function zeichneZeitachse() {
  const { wurzel, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  wurzel.innerHTML = '';

  // FOLGEAUFTRAG "Geteilte Viewport-Utilities", Punkt 2: läuft bei JEDEM
  // Aufruf von zeichneZeitachse() - also sowohl bei render() als auch bei
  // jedem resize()-Ereignis (resize() ruft diese Funktion unconditional
  // erneut auf, siehe dort) - vor jeder anderen Berechnung. Unterhalb des
  // Schwellenwerts wird NICHTS von der eigentlichen Visualisierung gebaut
  // (kein Beeswarm, keine Werkzeugleiste), nur der Platzhalter.
  if (istBildschirmZuKlein(window.innerWidth, window.innerHeight)) {
    fuegeBildschirmHinweisStyleEin(wurzel);
    wurzel.appendChild(baueBildschirmHinweis());
    return;
  }

  // Punkt 5 + Punkt B: BEIDE Filter (Unsicherheiten-Toggle, Kategorie-
  // Mehrfachauswahl) wirken per UND-Verknüpfung, wie schon beim Kachelraster-
  // Vorbild - alle weiteren Berechnungen (Beeswarm, Undatiert-Bereich) laufen
  // bereits auf der kombiniert reduzierten Menge.
  const sichtbareRecords = records.filter((record) => (
    (!zeigeUnsicherheit || istRecordUnsicher(record)) && passtKategorieFilter(record)
  ));

  // Zuvor ausgewählte Urkunde, die durch den Filterwechsel aus der sichtbaren
  // Menge gefallen ist: Sidebar würde sonst verwaiste Daten einer nicht mehr
  // angezeigten Urkunde zeigen - besser sauber schließen (gleiches Prinzip
  // wie treemap.js' schliesseSidebar()-Aufruf vor jedem Wurzel-/Kategorie-
  // Wechsel).
  if (instanz.ausgewaehltesRecord && !sichtbareRecords.includes(instanz.ausgewaehltesRecord)) {
    schliesseSidebar();
  }

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'zeitachse-werkzeugleiste';
  werkzeugleiste.append(baueKategorieFilter());
  wurzel.appendChild(werkzeugleiste);

  const { mitJahr, ohneJahr } = teileNachJahr(sichtbareRecords);

  if (sichtbareRecords.length === 0) {
    const leerHinweis = document.createElement('p');
    leerHinweis.className = 'zeitachse-leer-hinweis';
    leerHinweis.textContent = 'Keine Urkunden für die aktuelle Filterauswahl gefunden.';
    wurzel.appendChild(leerHinweis);
    return;
  }

  // FOLGEAUFTRAG "Geteilte Viewport-Utilities", Punkt 1: ermittleVerfuegbareBreite()
  // aus js/utils/viewportGroesse.js ersetzt die vorherige lokale
  // `instanz.container.clientWidth || 900`-Inline-Berechnung (identisches
  // Verhalten, nur nicht mehr modul-lokal dupliziert) - options.width bleibt
  // als modul-eigener externer Override davor geschaltet, das kennt die
  // geteilte Utility bewusst nicht (reines Modul-Interface, siehe render()).
  const breite = options.width || ermittleVerfuegbareBreite(instanz.container);
  // Zoom-Zustand nur bei tatsächlicher Breitenänderung zurücksetzen (echtes
  // Fenster-Resize) - dasselbe Prinzip wie ganttDiagramm.js: bei bloßem
  // Umschalten des Unsicherheiten-Filters (unveränderte Breite) bleibt die
  // aktuelle Zoom-/Pan-Position erhalten (Modul-Vertrag Abschnitt 5:
  // resize() darf internen Zustand nicht grundlos zurücksetzen).
  if (instanz.letzteBreite !== null && instanz.letzteBreite !== breite) {
    instanz.zoomTransform = null;
  }
  instanz.letzteBreite = breite;

  const jahresSpanne = mitJahr.length > 0
    ? [d3.min(mitJahr, (d) => d.jahr), d3.max(mitJahr, (d) => d.jahr)]
    : [1000, 2000];
  const xSkalaBasis = d3.scaleLinear().domain(jahresSpanne).range([RAND.links, breite - RAND.rechts]);

  // Punkt A: plotBereich wird VOR der Beeswarm-Berechnung (noch leer) ins DOM
  // gehängt, damit ermittleVerfuegbareHoehe() seine tatsächliche Position im
  // Viewport messen kann (berücksichtigt automatisch die bereits darüber
  // gerenderte Werkzeugleiste/Kopfzeile, unabhängig davon, wie hoch die auf
  // dem jeweiligen Bildschirm tatsächlich ausfällt - z.B. mehrzeilig
  // umgebrochen auf einem schmalen Fenster).
  const plotBereich = document.createElement('div');
  plotBereich.className = 'zeitachse-plot-bereich';
  wurzel.appendChild(plotBereich);

  // FOLGEAUFTRAG "Geteilte Viewport-Utilities", Punkt 1: geteilte Funktion
  // aus js/utils/viewportGroesse.js statt der vorherigen lokalen
  // ermittleVerfuegbareHoehe() - reserveUnten: RAND.unten reproduziert exakt
  // dieselbe Formel wie zuvor (Regressionsschutz, Akzeptanzkriterium Punkt 1).
  const verfuegbareHoehe = ermittleVerfuegbareHoehe(plotBereich, { reserveUnten: RAND.unten });
  const { knoten, hoehe: hoehePlot } = berechneBeeswarm(mitJahr, xSkalaBasis, verfuegbareHoehe);

  const svg = d3.select(plotBereich).append('svg').attr('width', breite);

  // Punkt B (Folgeauftrag): tickAnzahl einmal pro Neuaufbau berechnet, für
  // Erstaufbau UND jeden Zoom-Schritt (wireZoom()) identisch verwendet -
  // 14px-Schrift statt vorher 10px (siehe TICK_SCHRIFTGROESSE), Tick-Anzahl
  // an die Breite gekoppelt, damit die größere Schrift bei keiner Breite
  // überlappt.
  //
  // WICHTIG: die Schriftgröße wird über die CSS-Klasse .zeitachse-x-achse
  // gesetzt (fuegeStyleEin()), NICHT per .attr('font-size', ...) - d3's
  // axisBottom() schreibt bei JEDEM .call(axis) intern selbst
  // attr('font-size', 10) auf die Gruppe (Teil seiner eigenen Rendering-
  // Routine, unabhängig von der Aufrufreihenfolge). Ein vorher/nachher
  // gesetztes .attr() würde entweder sofort überschrieben (vorher) oder bei
  // jedem Zoom-Schritt erneut zurückgesetzt (Zoom ruft achseGruppe.call(axis)
  // ja wiederholt auf, siehe wireZoom()) - live per Test entdeckt (Tick-Text
  // blieb bei computed 10px, obwohl .attr() vor dem .call() auf 14 stand).
  // Eine CSS-Regel hat höhere Spezifität als d3's eigenes Attribut und
  // gewinnt zuverlässig bei jedem Neuaufbau/Zoom-Schritt.
  const tickAnzahl = ermittleTickAnzahl(breite);
  const achseGruppe = svg.append('g')
    .attr('class', 'zeitachse-x-achse')
    .attr('transform', `translate(0,${hoehePlot})`)
    .call(d3.axisBottom(xSkalaBasis).ticks(tickAnzahl).tickFormat(d3.format('d')));

  // Punkt A (Folgeauftrag): X-Achsen-Titel, zentriert unterhalb der
  // Tick-Beschriftungen (eigener Textknoten, kein Teil von achseGruppe -
  // damit d3.axisBottom() ihn bei jedem Zoom-Schritt/Neuaufbau NICHT
  // mitentfernt/überschreibt, siehe wireZoom()/achseGruppe.call(...)).
  svg.append('text')
    .attr('class', 'zeitachse-achsentitel')
    .attr('x', (RAND.links + (breite - RAND.rechts)) / 2)
    .attr('y', hoehePlot + RAND.unten - 6)
    .attr('text-anchor', 'middle')
    .attr('font-size', ACHSENTITEL_SCHRIFTGROESSE)
    .text(X_ACHSEN_TITEL);

  // Y-Achsen-Titel: Standard-D3-Muster (um -90° rotiert, links außerhalb der
  // Tick-Beschriftungen zentriert auf die Plot-Höhe) - siehe Dateikopf-
  // Kommentar zur Selbstauskunft (kein bestehendes Projekt-Vorbild dafür
  // gefunden, daher neu nach diesem verbreiteten D3-Standardmuster
  // entworfen).
  svg.append('text')
    .attr('class', 'zeitachse-achsentitel')
    .attr('transform', `translate(14,${hoehePlot / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle')
    .attr('font-size', ACHSENTITEL_SCHRIFTGROESSE)
    .text(Y_ACHSEN_TITEL);

  const punkte = svg.append('g').attr('class', 'zeitachse-punkte')
    .selectAll('circle.urkunde-punkt')
    .data(knoten)
    .join('circle')
    .attr('class', 'urkunde-punkt')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => `Urkunde ${d.record.signatur}, ${d.jahr}, Details anzeigen`)
    .attr('cx', (d) => xSkalaBasis(d.jahr) + d.dx)
    .attr('cy', (d) => d.y)
    .attr('r', PUNKT_RADIUS)
    .attr('fill', (d) => ermittleAnzeigeFarbe(d.record))
    // Punkt 5: der Stroke zeigt "unsicher" nur, wenn der Filter aktiv ist -
    // dann ist jeder sichtbare Punkt per Definition unsicher (sonst wäre er
    // bereits herausgefiltert), dieselbe bewusst redundante Bestätigung wie
    // in regestenKachelraster.js' Warn-Icon (dort ebenfalls nur bei aktivem
    // Filter sichtbar). Punkt "Nicht-Ziele": KEINE Kodierung der
    // Datumspräzision (exakt/Monat/Jahr/ungefähr) hier - nur die binäre
    // Unsicher-Kennzeichnung, unverändert aus dem bisherigen Stroke-Muster
    // übernommen. NUR im Normalzustand (Filter inaktiv) ersetzt der neue,
    // individuell berechnete Kontrast-Rand (Folgeauftrag Punkt C,
    // ermittleRandfarbe()) den vorherigen festen weißen Rand - der rote
    // Unsicher-Rand bleibt unverändert bestehen.
    .attr('stroke', (d) => (zeigeUnsicherheit ? '#c0392b' : ermittleRandfarbe(d.record)))
    .attr('stroke-width', zeigeUnsicherheit ? 2 : 1.5)
    .attr('stroke-dasharray', zeigeUnsicherheit ? '3,2' : null)
    // AUFTRAG "Teil 2h", Punkt 2: initiale Deckkraft direkt beim Aufbau -
    // deckt den Fall ab, dass ein Neuaufbau (Resize, Filterwechsel mit
    // weiterhin sichtbarer Auswahl) stattfindet, WÄHREND bereits eine
    // Urkunde ausgewählt ist (instanz.ausgewaehltesRecord überlebt den
    // Neuaufbau, die alte `punkte`-Selektion nicht).
    .attr('opacity', (d) => (
      instanz.ausgewaehltesRecord && d.record !== instanz.ausgewaehltesRecord ? HERVORHEBUNG_DIM_OPAZITAET : 1
    ));
  wireInteraktion(punkte, instanz.container);
  instanz.punkteAuswahl = punkte;

  svg.attr('height', hoehePlot + RAND.unten)
    .attr('viewBox', `0 0 ${breite} ${hoehePlot + RAND.unten}`)
    .attr('role', 'img')
    .attr('aria-label', 'Zeitachse der Urkunden nach Jahr, als Schwarm-Diagramm')
    // AUFTRAG "Teil 2h", Punkt 2 (Auftrag wörtlich: "bei Klick auf eine
    // leere Fläche der Visualisierung"): `event.target === svg.node()`
    // trifft nur zu, wenn der Klick direkt auf den SVG-Hintergrund traf
    // (kein Punkt/Achse/Text dazwischen) - dieselbe Funktion wie der
    // ×-Button, kein separater Reset-Pfad.
    .on('click', (event) => {
      if (event.target === svg.node() && instanz.ausgewaehltesRecord) schliesseSidebar();
    });

  svg.append('desc').text(
    'Jeder Punkt ist eine Urkunde, als Schwarm um ihr Jahr verteilt und eingefärbt nach ' +
    'Kategorie. Klick auf einen Punkt öffnet die Detailansicht in der Seitenleiste. ' +
    'Scrollen zoomt die Zeitachse, Ziehen verschiebt den Ausschnitt.'
  );

  instanz.zoomVerhalten = wireZoom({
    svgAuswahl: svg,
    xSkalaBasis,
    achseGruppe,
    punkteAuswahl: punkte,
    breite,
    hoehe: hoehePlot + RAND.unten,
    skalenExtent: ermittleZoomSkalenExtent(breite),
    tickAnzahl
  });

  const svgUndatiert = d3.select(plotBereich).append('svg').attr('width', breite);
  const bereichsHoehe = zeichneUnbekanntBereich(svgUndatiert, ohneJahr, {
    breite,
    yStart: 0,
    farbeFn: (d) => ermittleAnzeigeFarbe(d.record),
    tooltipTextFn: (d) => baueUrkundenTooltipText(d.record),
    container: instanz.container
  });
  svgUndatiert
    .attr('height', bereichsHoehe)
    .attr('viewBox', `0 0 ${breite} ${bereichsHoehe}`)
    .style('margin-top', '10px')
    .attr('role', 'img')
    .attr('aria-label', 'Urkunden ohne auswertbares Jahr');
  if (ohneJahr.length === 0) svgUndatiert.remove();
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  container.innerHTML = '';
  fuegeStyleEin(container);
  fuegeSidebarStyleEin(container);
  // Anker für den fest (oben rechts) positionierten Info-Button, siehe
  // .zeitachse-info-button-anker (position:absolute) - braucht einen
  // positionierten Vorfahren, damit sich "oben rechts" auf den Modulbereich
  // selbst bezieht statt auf ein weiter außen liegendes Element.
  container.style.position = 'relative';

  const wurzel = document.createElement('div');
  wurzel.className = 'zeitachse-wurzel';
  container.appendChild(wurzel);

  const sidebar = baueSidebarGeruest(container);
  sidebar.schliessenBtn.addEventListener('click', schliesseSidebar);

  // Auftrag "Geteilter Info-Button": eigener, von zeichneZeitachse() nie
  // angetasteter Geschwister-Container (wie die Sidebar) - siehe
  // Dateikopf-Kommentar zur Begründung (Listener-Leck vermeiden).
  const infoButtonContainer = document.createElement('div');
  infoButtonContainer.className = 'zeitachse-info-button-anker';
  container.appendChild(infoButtonContainer);
  const infoButton = erzeugeInfoButton(infoButtonContainer, {
    text: ZEITACHSE_INFO_TEXT,
    ariaLabel: 'Erklärung zur Zeitachse anzeigen'
  });

  instanz = {
    container,
    wurzel,
    sidebar,
    infoButton,
    records: data,
    options: { showUncertainty: true, width: null, height: null, ...options },
    zoomVerhalten: null,
    zoomTransform: null,
    letzteBreite: null,
    ausgewaehltesRecord: null,
    // AUFTRAG "Teil 2h", Punkt 2: aktuelle Punkte-Selektion fuer
    // aktualisiereHervorhebung() - wird bei jedem zeichneZeitachse()-Aufbau
    // neu gesetzt (s. dort).
    punkteAuswahl: null,
    // KLEINAUFTRAG "Standardzustand des Kategorie-Filters ändern": Startzustand
    // ist jetzt "alle 16 ausgewählt" (identisch zum bisherigen "Alle
    // auswählen"-Ergebnis) statt eines leeren Sets - alle Punkte sind beim
    // ersten Laden bereits nach Kategorie eingefärbt. Das leere Set (Neutral-
    // zustand, einheitliche Farbe) bleibt über den "Zurücksetzen"-Button
    // weiterhin erreichbar (siehe baueKategorieFilter()), ist nur nicht mehr
    // der Ausgangszustand. ermittleAnzeigeFarbe()/passtKategorieFilter()
    // selbst sind unverändert - beide werten ausgewaehlteKategorien.size aus,
    // ohne einen Unterschied zwischen "durch Alle-auswählen-Klick befüllt"
    // und "beim Start bereits befüllt" zu kennen.
    ausgewaehlteKategorien: new Set(ermittleAlleKategorien()),
    kategorieMenuOffen: false,
    kategoriePanel: null,
    kategorieTriggerBtn: null
  };
  // Je EIN document-weiter Listener für die gesamte Modul-Lebensdauer (nicht
  // pro Neuaufbau neu registriert) - schließt das Kategorie-Menü bei Klick
  // außerhalb bzw. Escape. Siehe behandleDokumentKlick()/behandleDokumentTaste()
  // für die Erklärung, warum das NICHT bei jedem zeichneZeitachse()-Aufruf
  // neu angehängt wird (Listener-Leck).
  document.addEventListener('click', behandleDokumentKlick);
  document.addEventListener('keydown', behandleDokumentTaste);
  zeichneZeitachse();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneZeitachse();
}

export function destroy() {
  if (!instanz) return;
  document.removeEventListener('click', behandleDokumentKlick);
  document.removeEventListener('keydown', behandleDokumentTaste);
  instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}

// AUFTRAG "Fuehrungen, Teil 2b", Punkt 4: schmale, von js/utils/
// datensatzAufruf.js aufgerufene Oeffnen-Funktion - findet den Record per
// signatur und ruft denselben oeffneSidebar() auf wie der bestehende
// Klick-Handler (Zeile 268) - keine eigene Sidebar-Logik hier. Keine
// Hervorhebung (siehe PROJEKTLOG: fuer Zeitachse-Punkte heute nicht
// implementiert, hier nicht neu gebaut).
export function oeffneDatensatz(signatur) {
  if (!instanz) return false;
  const record = instanz.records.find((r) => r.signatur === signatur);
  if (!record) return false;
  oeffneSidebar(record);
  return true;
}
