// js/viz/dotPlot.js
// Dot Plot der Urkunden: x = Jahr, y = Kategorie (eine Zeile pro Kategorie),
// ein Punkt pro Urkunde (Abschnitt 9: "hierarchische Verschachtelung" trifft hier
// nicht zu - Dot Plot zeigt stattdessen zeitliche Verteilung je Kategorie).
// Modul-Interface siehe Abschnitt 5. Undatierte Urkunden erscheinen sichtbar in
// einem eigenen Bereich (Abschnitt 12), nicht ausgeblendet.
//
// Unsicherheits-Kennzeichnung: zeigt datum_unsicher (siehe zeitachse.js).
//
// AUFTRAG "Urkunden-Dot-Plot – Vollbild, Info-Button, Kategorie-Farben,
// Zoom/Pan" (siehe CHANGELOG/PROJEKTLOG für den vollständigen Root-Cause-
// Befund - ERSTES von 26 Urkunden-Modulen auf den Bestand-Qualitätsstand
// gebracht, VORLAGE für die übrigen 25, siehe dortige Verweise "Vorlage für
// Urkunden-Module"):
//
// Punkt 1 (Vollbild) - Root Cause: dieses Modul hatte bislang GAR KEINE
// eigene <style>-Injektion und keinen Werkzeugleisten-Wrapper - `container`
// (von app.js als `.viz-inhalt` übergeben, IDENTISCHE Stelle wie bei den 5
// Bestand-Modulen, siehe dortiger Kommentar in app.js' erzeugeUnterContainer())
// bekam die SVG direkt als einziges Kind. WICHTIGE KLARSTELLUNG (live
// vermessen, siehe PROJEKTLOG): `.viz-inhalt` selbst bekommt über das
// gemeinsame CSS-Grid in css/layout.css (`#app-content{display:grid;
// grid-template-rows:auto auto 1fr}`, Grid-Items stretchen per Default)
// BEREITS korrekt die volle verfügbare Höhe - das war NIE der eigentliche
// Fehler und betrifft alle 31 Module gleichermaßen (keine zentrale
// Nachbesserung an layout.css nötig). Der eigentliche Fehler war: dieses
// Modul versuchte nie, diese verfügbare Höhe überhaupt zu NUTZEN - weder für
// eine Werkzeugleiste (die schlicht nicht existierte) noch strukturell
// vorbereitet für eine künftige. Fix, nach demselben - saubereren - Muster
// wie ganttDiagramm.js (NICHT treemap.js' Muster, das `.viz-inhalt` selbst
// per lokaler <style>-Injektion überschreibt - funktioniert zwar, ist aber
// fragiler/Cascade-Reihenfolge-abhängig): ein eigener Wrapper `.dotplot-
// wurzel` (display:flex, flex-direction:column, height:100% - bezieht sich
// korrekt auf `.viz-inhalt`s bereits vorhandene, gestreckte Höhe) wird als
// EINZIGES Kind von `container` eingehängt, Werkzeugleiste bekommt
// flex:0 0 auto (natürliche Höhe), der Plot-Bereich flex:1 1 auto (gesamter
// Rest). WICHTIGE NUANCE für künftige Urkunden-Module: das macht die
// Zeichenfläche NICHT künstlich so hoch wie der verfügbare Platz - ein Dot
// Plot mit wenigen Kategorien bleibt weiterhin inhaltsgetrieben hoch (exakt
// dasselbe, bereits akzeptierte Verhalten wie bei ganttDiagramm.js, das bei
// wenigen Zeilen ebenfalls nicht künstlich streckt) - "Vollbild" bedeutet
// hier "der Container nutzt korrekt die volle Höhe/Breite UND wächst bei zu
// VIEL Inhalt korrekt als Seiten-Scroll (kein Abschneiden)", nicht "jedes
// Modul muss seinen Inhalt künstlich auf Bildschirmgröße strecken".
//
// Punkt 2 (Info-Button) - Root Cause: js/utils/infoButton.js war schlicht
// NICHT importiert (nicht: importiert, aber falsch eingebunden) - dieses
// Modul entstand vor der Info-Button-Etappe und wurde seither nie
// nachgezogen. Fix: erzeugeInfoButton() unverändert importiert (Nicht-Ziel),
// dasselbe destroy-bei-jedem-Redraw-Muster wie ganttDiagramm.js (nicht
// treemap.js' einmalig-in-render()-Muster) - notwendig, weil hier wie bei
// Gantt die GESAMTE Werkzeugleiste bei jedem zeichneDotPlot()-Aufruf neu
// entsteht (siehe Punkt 5, Zoom-Buttons brauchen bei jedem Redraw eine frische
// Referenz auf das dann aktuelle zoomVerhalten).
//
// Punkt 3 (abgeschnittener Text unten links) - Root Cause: das Element ist
// die "Undatiert (N)"-Beschriftung von zeichneUnbekanntBereich()
// (urkundenZeit.js, gemeinsam mit 8 weiteren Urkunden-Modulen genutzt,
// UNVERÄNDERT). Live vermessen (siehe PROJEKTLOG): der Text selbst wird an
// KEINER Stelle per CSS `overflow:hidden` abgeschnitten - `.viz-inhalt` hat
// `overflow:visible` (siehe layout.css, bewusst so für den Seiten-Scroll-
// Fallback bei zu wenig Höhe). Die Wahrnehmung "abgeschnitten" entstand
// dadurch, dass der Text bei knapper Fensterhöhe unterhalb der sichtbaren
// Fensterkante lag (Seiten-Scroll nötig, aber durch das fehlende, optisch
// strukturierende Werkzeugleisten-Layout aus Punkt 1 nicht als "hier geht es
// einfach weiter, bitte scrollen" erkennbar) - direkt abhängig von Punkt 1,
// keine eigenständige Ursache. Nach Schritt 6 erneut geprüft (siehe
// PROJEKTLOG): Wahrnehmung verschwindet mit der klar strukturierten
// Werkzeugleiste von selbst.
//
// Punkt 4 (Zoom/Pan) - Root Cause: beim Neuaufbau dieses Moduls (wie bei den
// Bestand-Modulen, siehe deren jeweilige "NEUAUFBAU"-Kommentare) nie
// übernommen, nicht nur deaktiviert - im Code existierte keinerlei
// d3.zoom()-Aufruf. Fix: exakt ganttDiagramm.js' bereits produktiv
// bewährtes wireZoom()-Muster übernommen (siehe dortiger Dateikopf-
// Kommentar für die volle Begründung) - dieselben zwei dort bereits
// gefundenen Stolpersteine von vornherein vermieden: KEINE .transition()
// irgendwo in der Zoom-Kette (requestAnimationFrame-Abhängigkeit würde bei
// inaktivem Tab unzuverlässig), translateExtent()/extent() auf die
// TATSÄCHLICHE volle SVG-Pixelfläche gesetzt statt eines künstlich
// verengten Rechtecks.
//
// VORLAGEN-HINWEIS für die übrigen 25 Urkunden-Module: alle vier oben
// beschriebenen Root-Cause-Befunde gelten strukturell identisch für JEDES
// der 26 Urkunden-Module (dieselbe `.viz-inhalt`-Anbindung über app.js,
// derselbe fehlende Info-Button-Import, dieselbe potenzielle Unsichtbarkeits-
// Wahrnehmung bei knapper Höhe, dasselbe Fehlen von Zoom/Pan bei zeitbasierten
// Diagrammen) - künftige Aufträge für diese Module können auf diesen
// Dateikopf-Kommentar sowie CHANGELOG.md/docs/PROJEKTLOG.md, Eintrag
// "Urkunden-Dot-Plot ... (Vorlage für Urkunden-Module)", verweisen, statt die
// Analyse zu wiederholen. Modul-spezifisch bleibt jeweils zu prüfen: ob das
// Modul überhaupt eine Zeitachse hat (Zoom/Pan ist nur dafür sinnvoll, z.B.
// nicht für Adjazenzmatrix/Personennetzwerk) und ob dieselbe
// Kategorie-Farb-Randfall-Prüfung (Schritt 4 unten) erneut nötig ist (bei
// gleichbleibender urkunden.csv-Datengrundlage: nein, hier bereits
// abschließend geklärt).
//
// AUFTRAG "Dot Plot – Nachbesserungen (teilweise auch rückwirkend für
// Gantt)" (siehe CHANGELOG/PROJEKTLOG für den vollständigen Befund):
//
// Punkt 1 (Vollbild weiterhin nicht erreicht) - Root Cause: KEINE Regression
// gefunden. Live nachgemessen (siehe PROJEKTLOG): `.viz-inhalt` liefert bei
// 720px Fensterhöhe unverändert 503.391px - exakt derselbe Wert wie beim
// ursprünglichen Root-Cause-Befund oben, die neu hinzugekommene Werkzeug-
// leiste (44px, einzeilig) verdrängt den Plot-Bereich nicht relevant. Die
// Wahrnehmung "nicht vollflächig" ist stattdessen Punkt 2 (siehe dort) plus
// das bereits oben dokumentierte, bewusst inhaltsgetriebene Höhenverhalten
// (ein Dot Plot mit wenigen Kategorien füllt die Höhe nicht künstlich aus -
// dasselbe akzeptierte Verhalten wie ganttDiagramm.js).
//
// Punkt 2 (abgeschnittener Text weiterhin sichtbar) - Root Cause (diesmal
// eigenständig, NICHT nur Folge von Punkt 1, siehe PROJEKTLOG für den vollen
// Ancestor-Chain-Befund mit Pixelwerten): urkundenZeit.js' gemeinsam
// genutzte zeichneUnbekanntBereich() lieferte bei 0 undatierten Urkunden
// `bereichsHoehe=0` zurück, zeichnete die "Undatiert (0)"-Beschriftung aber
// TROTZDEM - das umgebende `<svg>`-Element (per UA-Stylesheet standardmäßig
// `overflow:hidden`, KEIN CSS-Layout-Container) endete dadurch ca. 9px vor
// der tatsächlichen Textunterkante und schnitt sie sichtbar ab. Ursprünglich
// hier lokal über einen Mindestwert für die SVG-Gesamthöhe behoben, da
// urkundenZeit.js damals nicht zu den "Betroffenen Dateien" gehörte
// (potenziell 8 weitere Module betroffen). NACHTRÄGLICH (Auftrag "Zentraler
// Fix für urkundenZeit.js + Permanente Button-Umrandung") zentral in
// urkundenZeit.js' zeichneUnbekanntBereich() selbst behoben (siehe dortiger
// Kommentar, MINDEST_HOEHE_LEER) - der lokale Guard hier wurde entfernt, alle
// neun Aufrufer der gemeinsamen Funktion sind jetzt automatisch geschützt.
//
// Punkt 3 (Zoom-Button-Position/-Optik, betrifft auch Gantt) - ausgelagert
// nach js/utils/zoomSteuerung.js (Baustein-Muster wie kategorieFarben.js/
// sidebar.js/beschriftung.js: kennt nichts über d3.zoom() selbst, liefert
// nur DOM+Optik, der Aufrufer verdrahtet die Klick-Handler). Wichtige
// Randnotiz (siehe PROJEKTLOG): Gantts tatsächlicher Vorzustand hatte die
// Zoom-Buttons NICHT neben dem Info-Button (das war eine Fehlannahme im
// Auftragstext, live widerlegt: 1061px Abstand) - Soll-Zustand war trotzdem
// eindeutig ("links neben dem Info-Button") und wurde für beide Module
// identisch umgesetzt: ein gemeinsamer rechter Flex-Wrapper hält
// Zoom-Steuerung UND Info-Button als EIN Werkzeugleisten-Kind (garantiert
// Adjazenz unabhängig von space-between/Kindanzahl).
//
// Punkt 4 (Punkte wandern beim Zoom in die Beschriftungsspalte) - Fix: die
// Punktgruppe (.dotplot-punkte) trägt jetzt einen clip-path, der strikt auf
// die Plot-Fläche rechts von RAND.links begrenzt (siehe zeichneDotPlot()) -
// d3.zoom() transformiert nur die Kreis-Positionen, die geometrische
// SVG-Begrenzung bleibt davon unberührt und bleibt in JEDEM Zoom-/
// Pan-Zustand korrekt.
//
// Punkt 5 (Sidebar bei Klick auf einen Punkt) - dasselbe, bereits fünffach
// erprobte Sidebar-Wrapper-Muster (siehe sidebar.js). URSPRÜNGLICH wurde
// hier bewusst nur das Gerüst/Öffnen-Schließen-Verhalten wiederverwendet
// (baueSidebarGeruest/schliesseSidebar/fuegeSidebarStyleEin), NICHT
// baueSidebarInhalt()/STANDARD_SIDEBAR_FELDER (Bestand-Schema passt nicht
// zu Urkunden-Records) - der Inhalt wurde daher lokal gebaut
// (baueUrkundenSidebarInhalt(), inkl. ALLER pipe-getrennten Kategorien aus
// record.kategorien, nicht nur der für die Zeilen-Zuordnung verwendeten
// Primärkategorie aus ersteKategorie()).
//
// AUFTRAG "Sidebar-Lightbox & app-weite Vereinheitlichung", Punkt 0/2: seit
// dem Auftrag "Sidebar-Liste – Regest-Vorschauzeile & Inline-Detailansicht"
// existiert in js/utils/sidebar.js genau diese Urkunden-Detailansicht
// bereits geteilt (baueUrkundenDetailInhalt(), zeigt ALLE
// pipe-getrennten Kategorien identisch zur bisherigen Anforderung hier,
// zusätzlich inkl. Fotogalerie+Lightbox) - die lokale Parallel-
// Implementierung entfällt daher zugunsten von zeigeUrkundenDetail(), siehe
// waehlePunkt() weiter unten. EIN dabei entdeckter Nebeneffekt (siehe
// PROJEKTLOG für die volle Bestandsaufnahme): die Kategorie-BADGE-Farben in
// der Sidebar kommen jetzt aus CAT_COLORS (der app-weiten, festen Urkunden-
// Palette, dieselbe wie in allen anderen Urkunden-Modulen), nicht mehr aus
// der HIER weiterhin für die PUNKTE/ZEILEN selbst genutzten, dynamisch pro
// Render erzeugten kategorieFarbSkala() (siehe farbeFuerKategorie() unten,
// UNVERÄNDERT) - ein Punkt und sein Sidebar-Badge derselben Kategorie
// können sich dadurch jetzt in der Farbe unterscheiden. Diese Diskrepanz
// existierte bereits VORHER zwischen diesem Modul und allen anderen
// Urkunden-Modulen (die schon immer CAT_COLORS nutzten) - unverändert nicht
// Teil dieses Auftrags, hier nur explizit gemeldet statt stillschweigend
// übernommen (Abschnitt 12). Eine Umstellung von kategorieFarbSkala() auf
// CAT_COLORS für die Punkte selbst wäre ein eigener, hier nicht
// beauftragter Folgeauftrag (Nicht-Ziel: keine Änderung an der Kernvisualisierung).
//
// AUFTRAG "Dot Plot – Vollbild-Streckung, erneuter Clipping-Fund, Tooltip
// für Kategorie-Labels":
//
// Schritt 1 (erneut abgeschnittenes Label) - Root-Cause-Befund: KEINE neue
// overflow:hidden-Clipping-Regression gefunden (live geprüft über mehrere
// Viewport-Größen 480×720 bis 1280×720, mit/ohne Unsicherheiten-Toggle,
// mit/ohne Zoom - kein Text-Element lag je außerhalb der SVG- oder
// .dotplot-plot-bereich-Grenzen, "Undatiert (0)" bleibt durch den zentralen
// Fix in urkundenZeit.js weiterhin korrekt sichtbar). Das tatsächlich
// gemeinte Element ist die ZEICHENANZAHL-basierte Ellipsen-Kürzung der
// Zeilen-Beschriftung (`kategorie.length > 22 ? slice(0,20)+'…' : kategorie`,
// live reproduziert an "Verkehr, Ver- und Entsorgung" → "Verkehr, Ver- und
// En…") - das ist KEIN CSS-Overflow-Clipping, sondern bewusst gekürzter Text
// OHNE Tooltip-Fallback (= exakt Schritt 3 dieses Auftrags). Warum deckte der
// zentrale Fix das nicht ab? Weil es sich um ZWEI VOLLSTÄNDIG UNABHÄNGIGE
// Code-Pfade handelt: der zentrale Fix betraf ausschließlich
// urkundenZeit.js' zeichneUnbekanntBereich() (Höhenberechnung für die
// "Undatiert"-Beschriftung), die hier betroffene Zeilen-Beschriftung ist
// modul-lokaler Code in zeichneDotPlot() (Zeichenanzahl-Kürzung der
// Kategorienamen), der davon nie berührt war - der Fix konnte diesen Fall
// strukturell gar nicht abdecken, da es kein Bug in derselben Funktion war.
// Fix: Umstellung auf js/utils/beschriftung.js' `ermittleBeschriftungstext()`
// (siehe Schritt 3 unten) - kennt die TATSÄCHLICH verfügbare Pixelbreite
// statt einer geschätzten Zeichenanzahl UND liefert bei Kürzung einen
// Tooltip-fähigen Rückgabewert.
//
// Schritt 2 (Vollbild-Streckung) - die Zeilenhöhe war bislang fest auf 20px
// codiert, unabhängig von der tatsächlich verfügbaren Höhe - bei großen
// Bildschirmen blieb dadurch sichtbar ungenutzter Freiraum unterhalb des
// Plots (dasselbe "inhaltsgetrieben, nicht künstlich gestreckt"-Verhalten,
// das in Punkt 1 oben noch als GEWÜNSCHT dokumentiert war - dieser Auftrag
// erweitert das bewusst: Streckung IST jetzt erwünscht, innerhalb
// vernünftiger Grenzen). Fix: Zeilenhöhe wird pro Redraw aus der tatsächlich
// verfügbaren Höhe (`plotBereich.clientHeight`, bereits nach Werkzeugleiste
// bemessen) berechnet, geklemmt auf [MIN_ZEILENHOEHE, MAX_ZEILENHOEHE] (siehe
// dortige Konstanten-Kommentare für die Werte-Begründung) - Punktradius
// skaliert proportional mit. Bei zu wenig verfügbarer Höhe (MIN_ZEILENHOEHE
// bereits erreicht) bleibt der etablierte Seiten-Scroll-Fallback intakt
// (keine Änderung an diesem Mechanismus).
//
// Schritt 3 (Tooltip für gekürzte Kategorie-Labels) - js/utils/beschriftung.js'
// `ermittleBeschriftungstext()` erwies sich als DIREKT wiederverwendbar
// (Auftrag, zu prüfen): sie ist bereits geometrieunabhängig gebaut (nimmt nur
// Name + verfügbare Pixelbreite + Schriftgröße entgegen, kennt selbst keine
// Kachel-/Bogen-/Kreis-Geometrie) - hier wird ihr statt einer
// Kachelbreite/Bogenlänge/Kreissehne einfach die FESTE Spaltenbreite
// (RAND.links, abzüglich Achsenabstand/Puffer) übergeben, exakt dieselbe
// "geteilte Formel, modul-lokale Geometrie"-Trennung wie bei den 4
// Bestand-Modulen. Keine eigene Kürzungslogik nötig. Tooltip-Wiring
// (`wireKategorieLabelTooltip()`) nach demselben Muster wie treemap.js'
// `wireVerzoegerterTooltip()` (mouseenter/focus zeigt, mouseleave/blur
// versteckt) - NUR wenn das Label tatsächlich gekürzt ist (voller Name
// überspringt den Tooltip weiterhin, exakt wie bei den 4 Bestand-Modulen).

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { ACHSEN_SCHRIFTGROESSE } from '../config/constants.js';
import {
  teileNachJahr,
  ersteKategorie,
  ermittleKategorienSortiertNachHaeufigkeit,
  baueUrkundenTooltipText,
  zeichneUnbekanntBereich
} from '../utils/urkundenZeit.js';
import { baueKategorieFarbSkala, OHNE_KATEGORIE_FARBE } from '../utils/kategorieFarben.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { erzeugeZoomSteuerung } from '../utils/zoomSteuerung.js';
import {
  baueSidebarGeruest,
  schliesseSidebar as schliesseSidebarModul,
  fuegeSidebarStyleEin,
  zeigeUrkundenDetail
} from '../utils/sidebar.js';
import { ermittleBeschriftungstext } from '../utils/beschriftung.js';

// Schritt 4 (Kategorie-Farben-Abgleich, siehe PROJEKTLOG für den vollen
// Befund): dieselbe Zeichenkette wie urkundenZeit.js' ersteKategorie()
// verwendet (dort kein exportiertes Symbol - bestandsHierarchie.js' eigenes
// OHNE_KATEGORIE ('(ohne Kategorie)', zufällig wortgleich) wird hier bewusst
// NICHT importiert, um dieses Urkunden-Modul nicht an eine Bestand-spezifische
// Datei zu koppeln, siehe Nicht-Ziel "keine Änderung an den fünf Bestand-
// Visualisierungen"). ersteKategorie() liefert diese Zeichenkette als
// Kategorie-Wert für Urkunden ohne "kategorien"-Feld - taucht dadurch auch in
// der von ermittleKategorienSortiertNachHaeufigkeit() gelieferten Zeilenliste
// auf und MUSS deshalb aus der an baueKategorieFarbSkala() übergebenen
// Namensliste ausgeschlossen werden (sonst bekäme "(ohne Kategorie)" eine
// zufällige "echte" Kategoriefarbe statt der etablierten neutralen
// OHNE_KATEGORIE_FARBE - exakt das bei den 5 Bestand-Modulen bereits gelöste
// Muster, hier identisch angewendet).
const OHNE_KATEGORIE = '(ohne Kategorie)';

// Schritt 3 (Info-Button-Text, siehe Abschlussbericht zur Prüfung durch den
// Auftraggeber vorgelegt) - drei Absätze nach demselben Muster wie
// ganttDiagramm.js' GANTT_INFO_TEXT: was zeigt die Visualisierung, was
// bedeuten die beiden "nie stillschweigend ausblenden"-Sonderfälle
// ((ohne Kategorie)/Undatiert), wie wird sie bedient (Zoom/Pan, Schritt 5).
const DOTPLOT_INFO_TEXT = `Dieser Dot Plot zeigt, wie sich die Urkunden über die Zeit und nach Kategorie verteilen. Jede Punktreihe entspricht einer Kategorie, die x-Achse dem Jahr der Urkunde - je dichter die Punkte an einer Stelle, desto mehr Urkunden wurden in diesem Zeitraum dieser Kategorie zugeordnet.

„(ohne Kategorie)" fasst Urkunden ohne zugeordnete Kategorie in einer eigenen Zeile zusammen, statt sie auszublenden. Urkunden ohne auswertbares Jahr erscheinen im grau hinterlegten Bereich unten.

Klick auf einen Punkt öffnet die Detailansicht der jeweiligen Urkunde in der Seitenleiste.

Ziehen verschiebt die Zeitachse, Strg+Mausrad bzw. Trackpad-Pinch zoomt hinein oder heraus; die Buttons +/−/⟷ links neben diesem Info-Button bieten dieselbe Funktion für Tastatur und Touch.`;

// Schritt 2 (siehe Dateikopf-Kommentar): Basis-Punktradius bei
// MIN_ZEILENHOEHE - skaliert proportional mit der tatsächlich verwendeten
// Zeilenhöhe (siehe zeichneDotPlot()).
const PUNKT_RADIUS = 3.5;

// Schritt 2 - unterer Richtwert: der bisherige kompakte Wert (20px), bleibt
// die Untergrenze, damit bei knapper Höhe kein zu enges/unlesbares Layout
// entsteht (dann greift stattdessen der etablierte Seiten-Scroll-Fallback,
// siehe Dateikopf-Kommentar Punkt 1).
const MIN_ZEILENHOEHE = 20;
// Schritt 2 - Höchstwert (Auftrag verlangt eine Begründung): 44px ist im
// Design-System bereits als "komfortable Bedien-/Lesegröße" etabliert
// (dieselbe Fitts'sches-Gesetz-Zielgröße wie die Zoom-Buttons in
// zoomSteuerung.js, min-width/min-height:44px) - mehr als doppelt so groß
// wie der kompakte Wert, nutzt bei großen Bildschirmen sichtbar mehr
// Fläche, ohne die Zeilen einer reinen Verteilungsübersicht unnatürlich
// weit auseinanderzuziehen (bei 44px liegt zwischen den Datenpunkt-Reihen
// noch klar erkennbar dieselbe "eine Kategorie"-Zeile, keine Fläche, die
// wie ein eigener Abschnitt wirkt).
const MAX_ZEILENHOEHE = 44;

const RAND = { oben: 10, unten: 30, links: 160, rechts: 20 };

// Schritt 3 (siehe Dateikopf-Kommentar): Schriftgröße der Zeilen-
// Beschriftung bleibt INNERHALB eines Redraws fest (nur die Zeilenhöhe/der
// Punktradius skaliert, Schritt 2) - Puffer vor der eigentlichen
// Achsenlinie (RAND.links), damit selbst ein voll ausgenutztes Label nicht
// direkt an die Trennlinie stößt.
//
// AUFTRAG "Einheitliche Achsenbeschriftungsgröße app-weit": auf
// ACHSEN_SCHRIFTGROESSE (zeitachse.js-Referenzwert, 14px) angehoben - sicher
// möglich, weil die Kürzung bereits pixelgenau über ermittleBeschriftungstext()
// erfolgt (Schritt 3 oben) und sich automatisch an die tatsächlich
// übergebene Schriftgröße anpasst, statt wie bei einer reinen
// Zeichenanzahl-Heuristik zu überlaufen.
const BESCHRIFTUNG_SCHRIFTGROESSE = ACHSEN_SCHRIFTGROESSE;
const BESCHRIFTUNG_PUFFER = 4;

// Schritt 5 (Zoom/Pan) - dieselbe Zoomtiefe wie ganttDiagramm.js'
// ZOOM_SCALE_EXTENT (dortiger Kommentar: 20x auf eine ~900-jährige Spanne
// zieht auch ein einzelnes Jahr im Kontext benachbarter Jahre klar
// auseinander) - urkunden.csv deckt mit 1108-1844 eine vergleichbare
// Größenordnung ab, derselbe Wert bleibt sinnvoll, keine eigene Herleitung
// nötig.
const ZOOM_SCALE_EXTENT = [1, 20];

let instanz = null; // { container, wurzel, plotBereich, sidebar, records, kategorienNamen, kategorieFarbSkala, options, letzteBreite, zoomTransform, infoButton, ausgewaehlteSignatur, punkteAuswahl }

// Schritt 4: OHNE_KATEGORIE bekommt die etablierte neutrale Sonderfarbe
// (dieselbe wie bei allen 5 Bestand-Modulen), jede andere Kategorie ihre
// Farbe aus der urkunden.csv-eigenen Skala (siehe render()).
function farbeFuerKategorie(kategorie) {
  return kategorie === OHNE_KATEGORIE ? OHNE_KATEGORIE_FARBE : instanz.kategorieFarbSkala(kategorie);
}

function istUnsicher(eintrag, zeigeUnsicherheit) {
  return zeigeUnsicherheit && eintrag.record.datum_unsicher;
}

function wireTooltip(auswahl, container) {
  auswahl
    .on('mouseenter focus', function (event, d) {
      zeigeTooltip(baueUrkundenTooltipText(d.record), this, container);
    })
    .on('mouseleave blur', () => versteckeTooltip());
}

// Schritt 3 (siehe Dateikopf-Kommentar) - dasselbe Muster wie treemap.js'
// wireVerzoegerterTooltip() (dort mit einer Verzögerung von 0ms aufgerufen,
// hier direkt ohne Verzögerungs-Parameter, da Zeilen-Beschriftungen anders
// als Treemap-Kacheln nicht dicht an dicht liegen - kein Risiko, beim
// bloßen Durchqueren mehrerer Elemente unnötig viele Tooltips aufblitzen zu
// lassen). `name` ist bewusst der VOLLE, ungekürzte Kategoriename (nicht
// das ggf. gekürzte, tatsächlich angezeigte Label).
function wireKategorieLabelTooltip(auswahl, name, container) {
  auswahl
    .on('mouseenter focus', function () { zeigeTooltip(name, this, container); })
    .on('mouseleave blur', () => versteckeTooltip());
}

// Punkt 5 (siehe Dateikopf-Kommentar) - Sidebar-Inhalt kommt seit dem
// Auftrag "Sidebar-Lightbox & app-weite Vereinheitlichung" von der
// geteilten js/utils/sidebar.js' zeigeUrkundenDetail() (Fotogalerie inkl.
// Lightbox, Signatur/Datum/Regest/Kategorien/Orte/Personen/Unsicher-
// Hinweis - ALLE pipe-getrennten Kategorien aus record.kategorien, nicht
// nur die für die Zeilen-Zuordnung verwendete Primärkategorie aus
// ersteKategorie(), identisch zur bisherigen lokalen Anforderung hier).
//
// Punkt 5, dasselbe bereits fünffach erprobte Toggle-Muster wie
// ganttDiagramm.js' waehleBestand() (Klick auf einen bereits ausgewählten
// Punkt schließt die Sidebar wieder). `signatur` dient als stabiler
// Schlüssel (live gegen urkunden.csv verifiziert: bei allen 1069 Urkunden
// vorhanden und einzigartig, 0 leere/doppelte Werte) - dieselbe
// kuerzel-statt-Index-Konvention wie bei Gantt.
function waehlePunkt(record, element) {
  const signatur = record.signatur;
  if (instanz.ausgewaehlteSignatur === signatur) {
    instanz.ausgewaehlteSignatur = null;
    aktualisierePunktAuswahlMarkierung();
    schliesseSidebarModul(instanz.sidebar, element);
    element.focus();
    return;
  }
  instanz.ausgewaehlteSignatur = signatur;
  aktualisierePunktAuswahlMarkierung();
  zeigeUrkundenDetail(instanz.sidebar, record);
}

function aktualisierePunktAuswahlMarkierung() {
  if (instanz.punkteAuswahl) {
    instanz.punkteAuswahl.classed('ausgewaehlt', (d) => d.record.signatur === instanz.ausgewaehlteSignatur);
  }
}

// Punkt 1 (Vollbild, siehe Dateikopf-Kommentar): eigener Wrapper statt
// Überschreiben von `.viz-inhalt` selbst - dasselbe, sauberere Muster wie
// ganttDiagramm.js' `.gantt-wurzel`.
function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .dotplot-wurzel { display: flex; flex-direction: column; height: 100%; }
    .dotplot-werkzeugleiste { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end;
      gap: var(--space-3); margin: 0 0 var(--space-3) 0; flex: 0 0 auto; }
    .dotplot-werkzeugleiste-rechts { display: flex; align-items: center; gap: var(--space-2); flex: 0 0 auto;
      margin-left: auto; }
    /* Per CSS statt .attr() gesetzt - siehe Kommentar bei achseGruppe in
       zeichneDotPlot() dazu, warum ein .attr('font-size', ...) hier von
       d3.axisBottom() selbst bei jedem Aufbau/Zoom-Schritt überschrieben würde. */
    .dotplot-achse { font-size: ${ACHSEN_SCHRIFTGROESSE}px; }
    /* overflow-y:visible (statt hidden) als Sicherheitsnetz (Auftrag
       "Systemischer Clipping-Fix nach Vollbild-Umstellung"): die
       Zeilenhöhen-/Reservierungsrechnung oben ist jetzt exakt (kein
       Schätzwert mehr), aber overflow:hidden hätte JEDE verbleibende
       Diskrepanz (Rundung, künftige Änderungen) hart abgeschnitten statt
       wie beim Rest der Seite üblich scrollen zu lassen - overflow-x bleibt
       hidden (die Breite wird bereits exakt aus container.clientWidth
       gemessen, kein Überlauf zu erwarten). */
    .dotplot-plot-bereich { flex: 1 1 auto; overflow-x: hidden; overflow-y: visible; touch-action: pan-y; }
    .urkunde-punkt { cursor: pointer; }
    .urkunde-punkt:focus, .urkunde-punkt:focus-visible { outline: none; stroke: var(--accent); stroke-width: 2px; }
    .urkunde-punkt.ausgewaehlt { stroke: var(--accent); stroke-width: 2.5px; }
    .dotplot-zeilen text[tabindex]:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  `;
  container.appendChild(style);
}

function zeichneAchse(achseGruppe, xSkala) {
  achseGruppe.call(d3.axisBottom(xSkala).tickFormat(d3.format('d')));
}

// Aktualisiert nur die x-Position der Punkte für eine gegebene x-Skala
// (initial UND bei jedem Zoom-/Pan-Tick) - dieselbe Trennung "einmalige
// Erzeugung vs. Positions-Update" wie ganttDiagramm.js' aktualisierePositionen().
function aktualisierePunktPositionen(punkteAuswahl, xSkala) {
  punkteAuswahl.attr('cx', (d) => xSkala(d.jahr));
}

// Schritt 5 (Zoom/Pan), exakt ganttDiagramm.js' wireZoom()-Muster (siehe
// dortiger Kommentar für die volle Begründung jeder einzelnen Design-
// Entscheidung - hier nicht wiederholt, nur übernommen):
// - KEINE .transition() (requestAnimationFrame-Abhängigkeit bei inaktivem Tab)
// - translateExtent()/extent() auf die TATSÄCHLICHE volle SVG-Pixelfläche
//   (inkl. Undatiert-Bereich), nicht künstlich verengt
// - Strg+Wheel/Pinch zoomt, einfaches Wheel bleibt für vertikales
//   Seiten-Scrollen frei (event.ctrlKey-Filter)
// - Der "Undatiert"-Bereich (zeichneUnbekanntBereich()) ist bewusst NICHT
//   Teil dieser Funktion - er hat keine Zeitposition, die man zoomen könnte
//   (identische Begründung wie ganttDiagramm.js' "ohne Zeitraum"-Marker).
function wireZoom({ svgAuswahl, xSkalaBasis, achseGruppe, punkteAuswahl, breite, hoehe }) {
  const zoomVerhalten = d3.zoom()
    .scaleExtent(ZOOM_SCALE_EXTENT)
    .translateExtent([[0, 0], [breite, hoehe]])
    .extent([[0, 0], [breite, hoehe]])
    .filter((event) => {
      if (event.type === 'wheel') return event.ctrlKey;
      return !event.button;
    })
    .on('zoom', (event) => {
      instanz.zoomTransform = event.transform;
      const neueXSkala = event.transform.rescaleX(xSkalaBasis);
      zeichneAchse(achseGruppe, neueXSkala);
      aktualisierePunktPositionen(punkteAuswahl, neueXSkala);
    });

  svgAuswahl.call(zoomVerhalten);
  if (instanz.zoomTransform) {
    svgAuswahl.call(zoomVerhalten.transform, instanz.zoomTransform);
  }
  return zoomVerhalten;
}

function zeichneDotPlot() {
  const { container, plotBereich, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;

  // Punkt 2 (Info-Button, siehe Dateikopf-Kommentar): wird bei JEDEM Redraw
  // zerstört/neu erzeugt, weil die gesamte Werkzeugleiste hier neu entsteht
  // (dasselbe Muster wie ganttDiagramm.js) - ohne das explizite destroy()
  // würden document-Listener aus infoButton.js bei jedem resize()/
  // Unsicherheiten-Toggle erneut registriert, ohne die vorherigen je zu
  // entfernen.
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.wurzel.innerHTML = '';

  const { mitJahr, ohneJahr } = teileNachJahr(records);
  const kategorien = ermittleKategorienSortiertNachHaeufigkeit(mitJahr);

  const breite = options.width || container.clientWidth || 900;
  // Zoom-Zustand nur bei echter Breitenänderung zurücksetzen (dasselbe Muster
  // wie ganttDiagramm.js - resize() darf den internen Zustand laut Modul-
  // Vertrag Abschnitt 5 sonst nicht zurücksetzen).
  if (instanz.letzteBreite !== null && instanz.letzteBreite !== breite) {
    instanz.zoomTransform = null;
  }
  instanz.letzteBreite = breite;

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'dotplot-werkzeugleiste';
  // Punkt 3 (siehe Dateikopf-Kommentar): Zoom-Steuerung + Info-Button als
  // GEMEINSAMES Kind der Werkzeugleiste, damit sie sichtbar zusammenhängen -
  // dasselbe Muster wie ganttDiagramm.js' .gantt-werkzeugleiste-rechts.
  const werkzeugleisteRechts = document.createElement('div');
  werkzeugleisteRechts.className = 'dotplot-werkzeugleiste-rechts';
  const zoomButtons = erzeugeZoomSteuerung(werkzeugleisteRechts);
  const btnRaus = zoomButtons.raus;
  const btnReset = zoomButtons.reset;
  const btnRein = zoomButtons.rein;
  werkzeugleiste.append(werkzeugleisteRechts);
  instanz.infoButton = erzeugeInfoButton(werkzeugleisteRechts, { text: DOTPLOT_INFO_TEXT, ariaLabel: 'Erklärung zum Dot Plot' });

  instanz.wurzel.append(werkzeugleiste, plotBereich);
  plotBereich.innerHTML = '';

  // Schritt 2 (siehe Dateikopf-Kommentar): verfügbare Höhe JETZT messen -
  // plotBereich ist gerade wieder im DOM eingehängt (append() oben) und
  // bereits nach der Werkzeugleiste bemessen (flex:1 1 auto im Vergleich zu
  // deren flex:0 0 auto), `clientHeight` löst dieselbe synchrone
  // Reflow-Messung aus wie `container.clientWidth` für `breite` oben.
  //
  // AUFTRAG "Systemischer Clipping-Fix nach Vollbild-Umstellung" - Root
  // Cause (siehe PROJEKTLOG für den vollen Befund): hier stand vormals ein
  // GESCHÄTZTER Reservierungswert (RESERVIERT_FUER_UNDATIERT=34, basierend
  // auf der Annahme "0 Einträge -> MINDEST_HOEHE_LEER=24 + 10px Puffer").
  // Das ist rechnerisch zwar für GENAU 0 Einträge exakt (siehe PROJEKTLOG-
  // Beleg), aber eine SCHÄTZUNG bleibt ein Schätzung - jede Abweichung
  // (z.B. durch künftige Datenänderungen mit tatsächlich undatierten
  // Urkunden, oder Rundungs-/Layout-Effekte) hätte den `overflow:hidden`-
  // Plot-Bereich hart abschneiden lassen, statt wie beim Rest der Seite
  // üblich zu scrollen. Fix: der TATSÄCHLICHE Platzbedarf wird jetzt exakt
  // vorab ermittelt - ein "Trockenlauf" von zeichneUnbekanntBereich() in
  // eine nie angehängte, unsichtbare SVG-Gruppe liefert denselben Wert, den
  // die Funktion auch beim echten Zeichnen weiter unten zurückgibt (der
  // Rückgabewert hängt nachweislich nur von `breite`/`ohneJahr`, NICHT von
  // `yStart` ab). Das dupliziert keine Formel (die einzige Quelle der
  // Wahrheit bleibt urkundenZeit.js' zeichneUnbekanntBereich() selbst,
  // unverändert und außerhalb der Betroffenen Dateien dieses Auftrags) und
  // macht die Reservierung dadurch für JEDE Datenlage exakt, nicht nur für
  // den aktuell zufällig vorliegenden 0-Einträge-Fall.
  const trockenlaufSvg = d3.create('svg');
  const reserviertFuerUndatiert = zeichneUnbekanntBereich(trockenlaufSvg, ohneJahr, {
    breite,
    yStart: 0,
    farbeFn: (d) => farbeFuerKategorie(ersteKategorie(d.record)),
    tooltipTextFn: (d) => baueUrkundenTooltipText(d.record),
    container
  }) + 10; // +10: derselbe Abstand wie unten bei der echten gesamtHoehe-Berechnung
  const verfuegbareHoehe = plotBereich.clientHeight;
  const verfuegbarFuerZeilen = Math.max(verfuegbareHoehe - RAND.oben - RAND.unten - reserviertFuerUndatiert, 0);
  const zeilenhoeheRoh = kategorien.length > 0 ? verfuegbarFuerZeilen / kategorien.length : MIN_ZEILENHOEHE;
  const zeilenhoehe = Math.min(Math.max(zeilenhoeheRoh, MIN_ZEILENHOEHE), MAX_ZEILENHOEHE);
  const punktRadius = PUNKT_RADIUS * (zeilenhoehe / MIN_ZEILENHOEHE);

  const hoehePlot = RAND.oben + kategorien.length * zeilenhoehe;

  const jahresSpanne = mitJahr.length > 0
    ? [d3.min(mitJahr, (d) => d.jahr), d3.max(mitJahr, (d) => d.jahr)]
    : [1000, 2000];
  // Dieselbe "auf volle 10 Jahre auf-/abrunden statt d3 .nice()"-Konvention
  // wie ganttDiagramm.js (dortiger Root-Cause-Fund: .nice() rundete auf einen
  // von der Tick-Anzahl abhängigen, teils weit über die echten Daten
  // hinausreichenden Wert auf).
  const domainVon = Math.floor(jahresSpanne[0] / 10) * 10;
  const domainBis = Math.ceil(jahresSpanne[1] / 10) * 10;
  const xSkalaBasis = d3.scaleLinear().domain([domainVon, domainBis]).range([RAND.links, breite - RAND.rechts]);
  const ySkala = d3.scalePoint().domain(kategorien).range([RAND.oben, hoehePlot - zeilenhoehe]).padding(0.5);

  const svg = d3.select(plotBereich).append('svg').attr('width', breite);

  const zeilenGruppe = svg.append('g').attr('class', 'dotplot-zeilen');
  const beschriftungVerfuegbareBreite = RAND.links - 8 - BESCHRIFTUNG_PUFFER;
  kategorien.forEach((kategorie) => {
    zeilenGruppe.append('line')
      .attr('x1', RAND.links).attr('x2', breite - RAND.rechts)
      .attr('y1', ySkala(kategorie)).attr('y2', ySkala(kategorie))
      .attr('stroke', '#e0e0e0');

    // Schritt 3 (siehe Dateikopf-Kommentar): geteilte Kürzungsformel statt
    // der vormaligen Zeichenanzahl-Heuristik - kennt die tatsächlich
    // verfügbare Pixelbreite. Bei Kürzung (oder im seltenen Randfall, dass
    // nicht mal eine Kürzung passt, siehe beschriftung.js) zusätzlich ein
    // Tooltip mit dem vollen Namen, analog zur Treemap/Sunburst/Icicle/
    // Circle-Packing-Konvention.
    const beschriftungstext = ermittleBeschriftungstext(kategorie, beschriftungVerfuegbareBreite, BESCHRIFTUNG_SCHRIFTGROESSE);
    const label = zeilenGruppe.append('text')
      .attr('x', RAND.links - 8).attr('y', ySkala(kategorie))
      .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
      .attr('font-size', BESCHRIFTUNG_SCHRIFTGROESSE)
      .text(beschriftungstext || '');
    if (beschriftungstext !== kategorie) {
      label.attr('tabindex', 0);
      wireKategorieLabelTooltip(label, kategorie, container);
    }
  });

  // Auftrag "Einheitliche Achsenbeschriftungsgröße app-weit": Schriftgröße
  // per CSS-Klasse (.dotplot-achse, siehe fuegeStyleEin()), NICHT per
  // .attr('font-size', ...) - d3.axisBottom() setzt bei JEDEM .call()
  // (hier: zeichneAchse(), erneut bei jedem Zoom-Tick über wireZoom())
  // selbst font-size:10 auf die Gruppe und würde einen zuvor per .attr()
  // gesetzten Wert sofort überschreiben (live entdeckt, siehe
  // Abschlussbericht - dasselbe, bereits von zeitachse.js gelöste Problem).
  const achseGruppe = svg.append('g')
    .attr('class', 'dotplot-achse')
    .attr('transform', `translate(0,${hoehePlot})`);
  zeichneAchse(achseGruppe, xSkalaBasis);

  // Punkt 4 (siehe Dateikopf-Kommentar): clip-path begrenzt die Punktgruppe
  // strikt auf die Plot-Fläche rechts von RAND.links - d3.zoom() transfor-
  // miert nur die cx-Werte der Kreise, die geometrische SVG-Begrenzung
  // bleibt davon unberührt und bleibt in JEDEM Zoom-/Pan-Zustand korrekt
  // (keine erneute Anpassung bei jedem 'zoom'-Event nötig).
  svg.append('defs').append('clipPath')
    .attr('id', 'dotplot-punkte-clip')
    .append('rect')
    .attr('x', RAND.links)
    .attr('y', 0)
    .attr('width', Math.max(breite - RAND.links - RAND.rechts, 0))
    .attr('height', hoehePlot);

  const punkteGruppe = svg.append('g').attr('class', 'dotplot-punkte')
    .attr('clip-path', 'url(#dotplot-punkte-clip)');

  const punkte = punkteGruppe
    .selectAll('circle.urkunde-punkt')
    .data(mitJahr)
    .join('circle')
    .attr('class', 'urkunde-punkt')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => `Urkunde ${d.record.signatur || '(ohne Signatur)'}, Details anzeigen`)
    .attr('cy', (d) => ySkala(ersteKategorie(d.record)))
    .attr('r', punktRadius)
    .attr('fill', (d) => farbeFuerKategorie(ersteKategorie(d.record)))
    .attr('fill-opacity', 0.7)
    .attr('stroke', (d) => (istUnsicher(d, zeigeUnsicherheit) ? '#c0392b' : 'none'))
    .attr('stroke-width', (d) => (istUnsicher(d, zeigeUnsicherheit) ? 2 : 0))
    .attr('stroke-dasharray', (d) => (istUnsicher(d, zeigeUnsicherheit) ? '3,2' : null));
  wireTooltip(punkte, container);
  // Punkt 5 (siehe Dateikopf-Kommentar), dasselbe Klick-/Enter-Leerzeichen-
  // Toggle-Muster wie ganttDiagramm.js' waehleBestand() - hier direkt auf
  // den Kreis-Elementen (kein Zeilen-Wrapper wie bei Gantt nötig).
  punkte
    .on('click.auswahl', function (event, d) { waehlePunkt(d.record, this); })
    .on('keydown.auswahl', function (event, d) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); waehlePunkt(d.record, this); }
    });
  instanz.punkteAuswahl = punkte;
  aktualisierePunktAuswahlMarkierung();
  aktualisierePunktPositionen(punkte, xSkalaBasis);

  const ohneJahrStart = hoehePlot + RAND.unten;
  const bereichsHoehe = zeichneUnbekanntBereich(svg, ohneJahr, {
    breite,
    yStart: ohneJahrStart,
    farbeFn: (d) => farbeFuerKategorie(ersteKategorie(d.record)),
    tooltipTextFn: (d) => baueUrkundenTooltipText(d.record),
    container
  });

  // Punkt 2 (Auftrag "Dot Plot - Nachbesserungen") - der vormals hier lokale
  // Mindesthöhen-Guard wurde zentral nach urkundenZeit.js' zeichneUnbekanntBereich()
  // verschoben (Auftrag "Zentraler Fix für urkundenZeit.js") - die Funktion
  // liefert jetzt selbst nie eine zu kleine Fläche für ihre eigene
  // Beschriftung zurück, `bereichsHoehe` kann hier direkt verwendet werden.
  const gesamtHoehe = ohneJahrStart + bereichsHoehe + 10;
  svg.attr('height', gesamtHoehe)
    .attr('viewBox', `0 0 ${breite} ${gesamtHoehe}`)
    .attr('role', 'img')
    .attr('aria-label', 'Dot Plot der Urkunden: Jahr je Kategorie');

  svg.append('desc').text(
    'Eine Zeile je Kategorie, ein Punkt je Urkunde nach Jahr positioniert. Urkunden ' +
    'ohne Jahr erscheinen im grau hinterlegten Bereich unten. Gestrichelter roter Rand ' +
    'kennzeichnet unsichere Datierung. Ziehen verschiebt die Zeitachse, Strg+Mausrad ' +
    'bzw. Trackpad-Zoomgeste zoomt. Klick auf einen Punkt öffnet die Detailansicht in ' +
    'der Seitenleiste.'
  );

  const zoomVerhalten = wireZoom({
    svgAuswahl: svg,
    xSkalaBasis,
    achseGruppe,
    punkteAuswahl: punkte,
    breite,
    hoehe: Math.max(gesamtHoehe, 1)
  });

  // Bewusst OHNE .transition() (siehe Dateikopf-Kommentar/ganttDiagramm.js'
  // identische Begründung: rAF-Abhängigkeit bei inaktivem Tab).
  btnRein.addEventListener('click', () => svg.call(zoomVerhalten.scaleBy, 1.5));
  btnRaus.addEventListener('click', () => svg.call(zoomVerhalten.scaleBy, 1 / 1.5));
  btnReset.addEventListener('click', () => svg.call(zoomVerhalten.transform, d3.zoomIdentity));
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  container.innerHTML = '';
  fuegeStyleEin(container);
  fuegeSidebarStyleEin(container);

  const wurzel = document.createElement('div');
  wurzel.className = 'dotplot-wurzel';
  container.appendChild(wurzel);

  const plotBereich = document.createElement('div');
  plotBereich.className = 'dotplot-plot-bereich';

  // Punkt 5 (siehe Dateikopf-Kommentar): Gerüst hängt als GESCHWISTER von
  // `wurzel` direkt in `container` - `container.innerHTML` wird NUR hier,
  // einmalig pro render(), geleert (zeichneDotPlot() leert danach nur noch
  // `wurzel`), dieselbe bereits etablierte Konvention wie
  // ganttDiagramm.js/treemap.js/sunburst.js/circlePacking.js, die verhindert,
  // dass ein Redraw eine gerade offene Sidebar mitsamt ihrem Zustand löscht.
  const sidebar = baueSidebarGeruest(container);

  // Schritt 4 (Kategorie-Farben): Skala aus urkunden.csv's EIGENER
  // Kategorienliste aufgebaut (dieselbe Funktion wie bei allen 5 Bestand-
  // Modulen, hier mit den tatsächlich in `data` vorkommenden Namen befüllt -
  // siehe PROJEKTLOG für den vollständigen Abgleich inkl. "Privatvermögen").
  const kategorienNamen = [...new Set(data.map((record) => ersteKategorie(record)))]
    .filter((name) => name !== OHNE_KATEGORIE)
    .sort((a, b) => a.localeCompare(b, 'de'));

  instanz = {
    container,
    wurzel,
    plotBereich,
    sidebar,
    records: data,
    kategorienNamen,
    kategorieFarbSkala: baueKategorieFarbSkala(kategorienNamen),
    options: { showUncertainty: true, width: null, height: null, ...options },
    letzteBreite: null,
    zoomTransform: null,
    infoButton: null,
    ausgewaehlteSignatur: null,
    punkteAuswahl: null
  };
  sidebar.schliessenBtn.addEventListener('click', () => {
    instanz.ausgewaehlteSignatur = null;
    aktualisierePunktAuswahlMarkierung();
    schliesseSidebarModul(instanz.sidebar, instanz.plotBereich);
  });
  zeichneDotPlot();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneDotPlot();
}

export function destroy() {
  if (!instanz) return;
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
