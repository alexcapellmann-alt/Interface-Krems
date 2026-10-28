// js/viz/ganttDiagramm.js
// Gantt-Diagramm des Gesamtbestands: Laufzeit aus zeitraum_von/zeitraum_bis
// (Abschnitt 4.1, 9). Modul-Interface siehe Abschnitt 5. Gleiche Hierarchie wie
// treemap.js (js/utils/bestandsHierarchie.js), hier aber ohne Größenwert - die
// Balkenlänge ergibt sich aus der Zeitspanne, nicht aus umfang_lfm.
//
// NEUAUFBAU (siehe CHANGELOG/PROJEKTLOG für den vollständigen Root-Cause-Befund
// und die Verifikationswerte): die Vorversion zeichnete zwar technisch schon
// Balken und eine Zeitachse, beides war jedoch strukturell unbrauchbar. Befund
// in Kurzform:
// - Kein hierarchischer/verschachtelter Layout-Fehler (kein Icicle/Treemap-
//   artiges Problem) - jede Zeile bekam bereits einen simplen, sequenziellen
//   y-Wert nach Listenindex. Die gemeldete "Kaskade" war ein reines SORTIER-
//   Artefakt: die Liste war zuerst nach Kategorie-Name, erst danach nach
//   zeitraum_von sortiert - das erzeugte 12 separate, je in sich aufsteigende
//   Mini-Kaskaden (eine pro Kategorie), übereinandergestapelt.
// - Die x-Skala (zeitraum_von/bis -> d3.scaleLinear) existierte bereits und war
//   funktional korrekt.
// - baueBestandsHierarchie() wurde bereits genutzt, keine eigenständige
//   CSV-Lesung.
// - Zusätzlich zwei Fehler, die den Eindruck "unfarbig"/"ohne Zeitachse"
//   erklären: (1) die Balkenfarbe kam aus js/config/constants.js' CAT_COLORS -
//   einem für urkunden.csv gedachten Platzhalter mit nur einem Eintrag
//   ({default:'#888888'}) - jeder Balken fiel deshalb auf dieselbe graue Farbe
//   zurück (empirisch bestätigt: alle 292 gerenderten Balken exakt #888888).
//   (2) die Zeitachse wurde an der y-Position NACH allen Balkenzeilen platziert
//   (ganz unten in einer >5600px hohen SVG) statt oben - technisch vorhanden,
//   praktisch unauffindbar.
//
// Diese Fassung ersetzt die Zeichenlogik durch ein klassisches Gantt-Layout:
// feste Namensspalte links (eigenständiger DOM-Ast, wird vom Zeitachsen-Zoom
// nie berührt - "fix stehen" ergibt sich damit strukturell, ohne CSS-Trick),
// separat gerenderte Zeitachse oben (position:sticky, bleibt beim vertikalen
// Scrollen der Bestandsliste sichtbar - dieselbe Seiten-Scroll-Konvention wie
// bei treemap.js/sunburst.js/icicle.js/circlePacking.js, siehe dortige
// SVG-Höhen), Balken chronologisch sortiert (Kategorien durchmischt),
// Farbcodierung aus kategorieFarben.js (importiert, NICHT dupliziert).

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { ACHSEN_SCHRIFTGROESSE, UNSICHERHEIT_SYMBOL } from '../config/constants.js';
import { baueBestandsHierarchie, baueTooltipText, kategorieVonKnoten, OHNE_KATEGORIE, parseUmfangLfm } from '../utils/bestandsHierarchie.js';
import { baueBestandFarbSkala, OHNE_KATEGORIE_FARBE, lesbareTextfarbe } from '../utils/kategorieFarben.js';
import {
  baueSidebarGeruest,
  oeffneSidebar as oeffneSidebarModul,
  schliesseSidebar as schliesseSidebarModul,
  fuegeSidebarStyleEin
} from '../utils/sidebar.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { infotextFuerModul } from '../core/archivKonfiguration.js';
import { erzeugeZoomSteuerung } from '../utils/zoomSteuerung.js';

// Auftrag "Info-Button für die 5 Bestandsvisualisierungen": der vorgegebene
// Text deckte ursprünglich nur den Balken-Klick ab, nicht die vorhandene
// Zoom/Pan-Interaktion dieses Moduls (wireZoom(), Strg+Wheel/Pinch/Drag/
// Buttons) - auf Rückfrage vom Auftraggeber freigegeben, den Text um einen
// dritten Absatz dazu zu ergänzen (siehe CHANGELOG). Erste beiden Absätze
// bleiben wörtlich wie vorgegeben.

const NAMENSSPALTE_BREITE = 220;
const ZEILENHOEHE = 16;        // Balkenhöhe (unverändert aus der Vorversion)
const ZEILENABSTAND = 3;       // Lücke zwischen Zeilen
const ZEILE_GESAMT = ZEILENHOEHE + ZEILENABSTAND;
const RAND = { links: 12, rechts: 20 };
const ACHSE_HOEHE = 34;
const MIN_SCHRIFTGROESSE = 11; // dieselbe Richtgröße wie treemap.js/sunburst.js/icicle.js/circlePacking.js
// AUFTRAG "Teil 2f", Punkt 1: keine lokale Kopie mehr - zentrale Konstante
// aus config/constants.js (siehe dortiger Kommentar), unter demselben
// lokalen Namen weiterverwendet (minimale Diff an den Aufrufstellen unten).
const WARN_SYMBOL = UNSICHERHEIT_SYMBOL;

// Mindestbreite für Balken (Schritt 4, Fitts'sches Gesetz - dieselbe Zielgröße
// wie MINDESTBREITE_PX in icicle.js/treemap.js bzw. MINDESTRADIUS_PX*2 in
// circlePacking.js). Verifiziert gegen die echten Daten (siehe PROJEKTLOG):
// bei einer typischen Zeitachsenbreite von ca. 1200px über die volle
// Datumsspanne 1108-2024 (916 Jahre, ca. 1,3px/Jahr) fielen 83 von 292
// Beständen mit auswertbarem Zeitraum (28%) unter 24px, darunter 7 mit exakt
// nulljähriger Laufzeit (z.B. "Volkszählung 1824", von=bis=1824) - ohne
// Mindestbreite wären diese als 1-2px-Haarlinien praktisch unsichtbar und
// kaum klickbar/fokussierbar gewesen. Da jeder Bestand seine EIGENE Zeile hat
// (anders als bei Treemap/Sunburst/Icicle/Circle Packing, wo Geschwister sich
// eine gemeinsame Achse/Fläche teilen), kann das Erzwingen dieser Breite bei
// EINEM Balken nie einen anderen verdrängen - keine Wasserfüll-/
// Kollisionslogik nötig, ein einfaches Math.max() genügt.
const MINDESTBALKENBREITE_PX = 24;

// Wie weit darf reingezoomt werden (Schritt 5). 20x auf eine 916-Jahre-Spanne
// zoomt ein einzelnes Jahr auf ca. 20x seine Ausgangsbreite - genug, um auch
// die kürzesten, auf MINDESTBALKENBREITE_PX geklemmten Zeiträume im Kontext
// benachbarter Jahre klar auseinanderzuziehen.
const ZOOM_SCALE_EXTENT = [1, 20];

// Kategorie-Ansicht (Wunsch des Autors, 2026-10-28): eine Zeile je Kategorie mit einem Dichteband über
// der Zeitachse - Dicke = Laufmeter der Kategorie, die aus diesem Jahr stammen. Die Laufmeter eines
// Bestands werden gleichmäßig auf seine Laufzeit verteilt (10 lfm über 400 Jahre zählen je Jahr weniger
// als 10 lfm aus einem Jahrzehnt). Bestände ohne Laufmeterangabe gehen nicht in die Dichte ein, werden
// aber gezählt. Seit 2026-10-28 (Wunsch des Autors) ein gemeinsamer Maßstab für alle Zeilen, mit der
// Quadratwurzel gestaucht, damit kleine Kategorien nicht zu Haarlinien werden - das Band zeigt so Zeit UND
// Menge. Vorher war jede Zeile auf ihr eigenes Maximum bezogen; eine Kategorie mit einem einzigen Bestand
// (Religion, 0,1 lfm) erschien dadurch als voller Block.
const KATEGORIE_ZEILE = 46;
const KATEGORIE_RAND = 6;        // Abstand des Bandes zum Zeilenrand
const UEBERGANG_MS = 650;        // Dauer des animierten Wechsels Einzelbestände <-> Kategorien
const MODUS_BESTAENDE = 'bestaende';
const MODUS_KATEGORIEN = 'kategorien';

let instanz = null; // { container, wurzel, sidebar, mitZeitraum, ohneZeitraum, kategorienNamen, kategorieFarbSkala, options, letzteBreite, zoomTransform, ausgewaehlterSchluessel, gruppeNachSchluessel, infoButton }

function istUnsicher(blatt, zeigeUnsicherheit) {
  return zeigeUnsicherheit && blatt.data.record.daten_unsicher;
}

function farbeFuerBlatt(blatt, kategorieFarbSkala) {
  const kategorie = kategorieVonKnoten(blatt);
  return kategorie === OHNE_KATEGORIE ? OHNE_KATEGORIE_FARBE : kategorieFarbSkala(kategorie);
}

function parseJahr(rohwert) {
  const zahl = parseInt(String(rohwert || '').trim(), 10);
  return Number.isFinite(zahl) ? zahl : null;
}

// Stabiler, positionsunabhängiger Schlüssel für das Hover-Highlighting
// zwischen Namensspalte und Balken (siehe wireHervorhebung() weiter unten) -
// bewusst NICHT der Array-Index (bricht bei jeder Sortier-/Filter-Änderung),
// sondern `kuerzel` - live gegen die echten Daten verifiziert: bei allen 315
// Beständen vorhanden und einzigartig (0 leere, 315 einzigartige Werte).
function schluesselFuerBlatt(blatt) {
  return blatt.data.record.kuerzel;
}

// Root-Cause-Fix (siehe Dateikopf-Kommentar): Sortierung jetzt ausschließlich
// nach zeitraum_von aufsteigend, KEINE vorgeschaltete Kategorie-Gruppierung
// mehr ("Kategorien durchmischt", siehe Auftrag) - genau die vorherige
// Gruppierung hatte die gemeldete Kaskade erzeugt. Bestände ohne auswertbaren
// Zeitraum werden nicht gefiltert (Abschnitt 12: nie stillschweigend
// ausblenden), sondern ans Ende der Liste gestellt (sie liefern kein
// Sortierkriterium) und dort alphabetisch sortiert.
function teileUndSortiere(blaetter) {
  const mitZeitraum = [];
  const ohneZeitraum = [];

  for (const blatt of blaetter) {
    const von = parseJahr(blatt.data.record.zeitraum_von);
    const bis = parseJahr(blatt.data.record.zeitraum_bis);
    if (von !== null && bis !== null && von <= bis) {
      blatt.von = von;
      blatt.bis = bis;
      mitZeitraum.push(blatt);
    } else {
      ohneZeitraum.push(blatt);
    }
  }

  mitZeitraum.sort((a, b) => a.von - b.von);
  ohneZeitraum.sort((a, b) => a.data.name.localeCompare(b.data.name));
  return { mitZeitraum, ohneZeitraum };
}

// Erweitert baueTooltipText() (bestandsHierarchie.js, gemeinsam mit allen
// anderen Modulen genutzt) um die Zeitraum-Zeile, die dort bewusst nicht Teil
// der gemeinsamen Funktion ist (nur für Gantt relevant) - keine Duplikation
// der übrigen Zeilen (Name/Kategorie/Unterkategorie/Umfang/Unsicher-Hinweis).
function baueGanttTooltipText(blatt) {
  const zeitraumZeile = Number.isFinite(blatt.von)
    ? `Zeitraum: ${blatt.von}–${blatt.bis}`
    : 'Zeitraum: keine Angabe';
  return `${zeitraumZeile}\n${baueTooltipText(blatt)}`;
}

function wireTooltip(auswahl, container) {
  auswahl
    .on('mouseenter.tooltip focus.tooltip', function tooltipZeigen(event, d) {
      zeigeTooltip(baueGanttTooltipText(d), this, container);
    })
    .on('mouseleave.tooltip blur.tooltip', () => versteckeTooltip());
}

// Bidirektionales Hover-Highlighting zwischen Namensspalte und Balken/Marker.
// Verknüpfung über schluesselFuerBlatt() (kuerzel), NICHT über Position/Index -
// bleibt dadurch auch nach Sortier-/Filteränderungen korrekt (Auftrag
// explizit so gefordert). `.on('...​.hervorheben', ...)` nutzt einen eigenen
// Namespace, damit die bereits vorhandenen `.tooltip`-Listener auf denselben
// Elementen unangetastet bleiben (beide feuern unabhängig voneinander).
// Fokus (Tastatur) auf einem Balken/Marker hebt dieselbe Zeile ebenfalls
// hervor wie ein Maus-Hover - die Namensspalte selbst trägt bewusst keinen
// eigenen Tabstop (siehe Modul-Kommentar zu einem Tabstop pro Zeile), Hover
// darauf bleibt daher eine reine Maus-Interaktion.
// Baut die Map kuerzel->SVG-Gruppen-Element einmal zentral - wird von
// wireHervorhebung() UND von der Auswahl-/Sidebar-Logik (waehleBestand(),
// aktualisiereAuswahlMarkierung()) gemeinsam genutzt, damit nicht zweimal
// dieselbe Sammlung aufgebaut wird.
function baueGruppeNachSchluessel(gruppenAuswahlen) {
  const gruppeNachSchluessel = new Map();
  gruppenAuswahlen.forEach((auswahl) => {
    auswahl.each(function sammleGruppe(d) {
      gruppeNachSchluessel.set(schluesselFuerBlatt(d), this);
    });
  });
  return gruppeNachSchluessel;
}

function wireHervorhebung(zeileNachSchluessel, gruppeNachSchluessel, gruppenAuswahlen) {
  zeileNachSchluessel.forEach((zeileElement, schluessel) => {
    const gruppeElement = gruppeNachSchluessel.get(schluessel);
    if (!gruppeElement) return;
    zeileElement.addEventListener('mouseenter', () => gruppeElement.classList.add('gantt-hervorgehoben'));
    zeileElement.addEventListener('mouseleave', () => gruppeElement.classList.remove('gantt-hervorgehoben'));
  });

  gruppenAuswahlen.forEach((auswahl) => {
    auswahl
      .on('mouseenter.hervorheben focus.hervorheben', function hervorhebenEin(event, d) {
        const zeileElement = zeileNachSchluessel.get(schluesselFuerBlatt(d));
        if (zeileElement) zeileElement.classList.add('gantt-hervorgehoben');
      })
      .on('mouseleave.hervorheben blur.hervorheben', function hervorhebenAus(event, d) {
        const zeileElement = zeileNachSchluessel.get(schluesselFuerBlatt(d));
        if (zeileElement) zeileElement.classList.remove('gantt-hervorgehoben');
      });
  });
}

// Auswahl-Markierung (Punkt 1, Sidebar): bewusst eine reine Klassen-
// Umschaltung anhand von instanz.ausgewaehlterSchluessel, OHNE zeichneGantt()
// erneut aufzurufen - ein voller Redraw für eine reine Auswahländerung wäre
// unnötig teuer (315 Zeilen neu bauen für eine einzelne Markierung) und würde
// unnötig den Zoom-/Pan-Zustand berühren. Nach einem ECHTEN Redraw (resize()/
// Unsicherheiten-Toggle, wo die DOM-Knoten neu entstehen) wird diese Funktion
// erneut aufgerufen, um die Markierung auf die neuen Knoten zu übertragen -
// funktioniert unverändert über denselben kuerzel-Schlüssel.
function aktualisiereAuswahlMarkierung() {
  instanz.gruppeNachSchluessel.forEach((element, schluessel) => {
    element.classList.toggle('gantt-ausgewaehlt', schluessel === instanz.ausgewaehlterSchluessel);
  });
  // Seit 2026-10-28 auch die Zeile der Namensspalte (Wunsch des Autors: bei offener Sidebar hervorgehoben)
  instanz.zeileNachSchluessel?.forEach((element, schluessel) => {
    element.classList.toggle('gantt-ausgewaehlt', schluessel === instanz.ausgewaehlterSchluessel);
  });
}

// Punkt 1 (Sidebar bei Balken-Klick), dasselbe bereits dreimal erprobte
// Wrapper-Muster wie treemap.js/sunburst.js/circlePacking.js: Klick auf ein
// bereits ausgewähltes Element schließt die Sidebar wieder (Toggle), sonst
// öffnet sie mit den Bestandsdetails. Fokus-Fallback beim Schließen ist
// bewusst das jeweils betroffene Balken-/Marker-Element selbst (aus
// gruppeNachSchluessel aufgelöst) statt eines einzelnen festen
// "svgBereich" wie bei den anderen Modulen - der Gantt hat keinen
// vergleichbaren einzelnen Container, aber das konkrete Element ist ohnehin
// die genauere, korrektere Wahl für die Fokus-Rückkehr.
function waehleBestand(blatt) {
  const schluessel = schluesselFuerBlatt(blatt);
  const zielElement = instanz.gruppeNachSchluessel.get(schluessel);

  if (instanz.ausgewaehlterSchluessel === schluessel) {
    instanz.ausgewaehlterSchluessel = null;
    aktualisiereAuswahlMarkierung();
    schliesseSidebarModul(instanz.sidebar, zielElement);
    if (zielElement) zielElement.focus();
    return;
  }

  instanz.ausgewaehlterSchluessel = schluessel;
  aktualisiereAuswahlMarkierung();
  const kategorieName = kategorieVonKnoten(blatt);
  const kategorieFarbe = kategorieName === OHNE_KATEGORIE ? OHNE_KATEGORIE_FARBE : instanz.kategorieFarbSkala(kategorieName);
  oeffneSidebarModul(instanz.sidebar, blatt.data.record, { kategorieName, kategorieFarbe });
}

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .gantt-wurzel { display: flex; flex-direction: column; height: 100%; }
    .gantt-werkzeugleiste { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: var(--space-3); margin: 0 0 var(--space-3) 0; flex: 0 0 auto; }
    .gantt-legende { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); align-items: center; }
    .gantt-legende-eintrag { font-size: var(--fs-sm); font-weight: 600; }
    /* Per CSS statt .attr() gesetzt - siehe Kommentar bei achseGruppe in
       zeichneGantt() dazu, warum ein .attr('font-size', ...) hier von
       d3.axisTop() selbst bei jedem Aufbau/Zoom-Schritt überschrieben würde. */
    .gantt-x-achse { font-size: ${ACHSEN_SCHRIFTGROESSE}px; }
    /* margin-left:auto statt (nur) auf justify-content:space-between zu
       vertrauen: bei vielen Kategorien nimmt .gantt-legende die GESAMTE
       Zeilenbreite ein (sie hat selbst flex-wrap) und verdrängt diesen
       Wrapper per flex-wrap der Werkzeugleiste auf eine EIGENE zweite
       Zeile - dort ist er dann das einzige Element, space-between würde ihn
       (ohne margin-left:auto) fälschlich an den LINKEN statt rechten Rand
       setzen (live reproduziert, siehe PROJEKTLOG). margin-left:auto bleibt
       unabhängig von Zeilenumbrüchen korrekt rechtsbündig. */
    .gantt-modus-schalter { display: inline-flex; border: 1px solid var(--accent); border-radius: var(--radius); overflow: hidden; flex: 0 0 auto; }
    .gantt-modus-schalter button { font: inherit; font-size: var(--fs-sm); min-height: 36px; padding: 0 var(--space-3); border: 0;
      background: var(--surface); color: var(--accent); cursor: pointer; }
    .gantt-modus-schalter button + button { border-left: 1px solid var(--accent); }
    .gantt-modus-schalter button[aria-pressed="true"] { background: var(--accent); color: #fff; }
    .gantt-modus-schalter button:focus-visible { outline: 3px solid #e0b429; outline-offset: -3px; }
    .gantt-namensspalte-zeile.gantt-kategorie-name { height: ${KATEGORIE_ZEILE}px; flex-direction: column; align-items: flex-start;
      justify-content: center; gap: 0; font-size: var(--fs-sm); }
    .gantt-namensspalte-zeile.gantt-kategorie-name .gantt-namensspalte-name { flex: 0 0 auto; width: 100%; font-weight: 600; }
    .gantt-kategorie-meta { font-size: 11px; color: var(--text-muted); }
    .gantt-kategorie-zeile.gantt-ausgewaehlt .gantt-kategorie-band { stroke: #e0b429; stroke-width: 2.5px; stroke-dasharray: none; }
    .gantt-kategorie-zeile:hover .gantt-kategorie-band { filter: brightness(1.15); }
    .gantt-werkzeugleiste-rechts { display: flex; align-items: center; gap: var(--space-2); flex: 0 0 auto;
      margin-left: auto; }
    .gantt-kopfzeile { display: flex; position: sticky; top: 0; z-index: 3; background: var(--surface);
      border-bottom: 1px solid var(--border); flex: 0 0 auto; }
    .gantt-kopf-namensplatzhalter { flex: 0 0 ${NAMENSSPALTE_BREITE}px; min-width: 0; display: flex; align-items: center;
      padding: 0 var(--space-2); font-weight: 600; font-size: var(--fs-sm); color: var(--text-muted);
      border-right: 1px solid var(--border); }
    .gantt-kopf-achse-bereich { flex: 1 1 auto; overflow: hidden; }
    .gantt-koerper { display: flex; flex: 1 1 auto; align-items: flex-start; }
    /* min-width:0 ist hier PFLICHT, kein Aufräum-Kosmetik: Flex-Items haben
       standardmäßig min-width:auto, was bei einem Nachfahren mit
       white-space:nowrap (.gantt-namensspalte-name) dazu führt, dass der
       Browser die Spalte auf die Breite des LÄNGSTEN unwrapped Namens
       aufbläst, statt sie bei flex-basis 220px zu belassen - live bestätigt:
       ohne diese Zeile wuchs die Spalte auf 520.8px (Breite des längsten
       Bestandsnamens), wodurch Namensspalte und Kopf-Platzhalter (220px)
       nicht mehr übereinstimmten und dadurch Zeitachse und Balken um ca.
       300px gegeneinander verschoben wirkten (siehe PROJEKTLOG). */
    /* AUFTRAG "Einheitliche Achsenbeschriftungsgröße app-weit" - RANDFALL,
       bewusst NICHT auf ACHSEN_SCHRIFTGROESSE (14px) angehoben: die Zeile
       hat eine FESTE Höhe (ZEILE_GESAMT, hier 19px), auf die Balkenhöhe
       (ZEILENHOEHE=16px) abgestimmt - anders als bei den Urkunden-
       Zeilen-Modulen ist diese Höhe NICHT dynamisch gestreckt. Eine
       größere Schrift würde die Zeile vertikal sprengen (14px-Zeilenhöhe
       allein liegt bereits nahe an/über 19px, vor jeglichem Zeilenabstand)
       - horizontal wäre dank text-overflow:ellipsis zwar unkritisch, das
       vertikale Risiko besteht trotzdem, siehe Abschlussbericht. */
    .gantt-namensspalte { flex: 0 0 ${NAMENSSPALTE_BREITE}px; min-width: 0; border-right: 1px solid var(--border); }
    .gantt-namensspalte-zeile { display: flex; align-items: center; gap: var(--space-1); height: ${ZEILE_GESAMT}px;
      padding: 0 var(--space-2); font-size: ${MIN_SCHRIFTGROESSE}px; box-sizing: border-box; }
    .gantt-namensspalte-zeile:nth-child(even) { background: #f7f6f2; }
    .gantt-namensspalte-zeile { cursor: pointer; }
    .gantt-namensspalte-zeile:focus-visible { outline: 3px solid var(--accent); outline-offset: -3px; }
    .gantt-namensspalte-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .gantt-namensspalte-badge { flex: 0 0 auto; font-size: 9px; color: var(--text-muted); border: 1px solid var(--border);
      border-radius: 3px; padding: 0 3px; white-space: nowrap; }
    /* Nach der :nth-child(even)-Regel platziert (gleiche Selektor-Spezifität,
       0,2,0 vs. 0,2,0) - gewinnt dadurch bei gleichzeitig gerader Zeile UND
       Hover per Quellreihenfolge, unabhängig von Gerade/Ungerade. */
    .gantt-namensspalte-zeile.gantt-hervorgehoben { background: #fce6cc; box-shadow: inset 3px 0 0 #e07820; }
    .gantt-zeitbereich { flex: 1 1 auto; overflow: hidden; touch-action: pan-y; }
    .gantt-balken-zeile:focus,
    .gantt-balken-zeile:focus-visible,
    .gantt-ohne-zeitraum-marker:focus,
    .gantt-ohne-zeitraum-marker:focus-visible { outline: none; }
    .gantt-balken-zeile:focus rect.gantt-balken,
    .gantt-ohne-zeitraum-marker:focus rect.gantt-ohne-zeitraum-sichtbar { stroke: #e07820; stroke-width: 2px; }
    /* Hover-Highlighting (Namensspalte <-> Balken/Marker, siehe
       wireHervorhebung()): verstärkter Rahmen + dezenter Glow statt
       Fill-Änderung - überschreibt die per .attr() gesetzte Stroke-Farbe/
       -breite, da CSS-Regeln SVG-Präsentationsattribute grundsätzlich
       überschreiben (dieselbe bereits genutzte Eigenschaft wie bei der
       :focus-Regel oben). Kategoriefarbe (fill) bleibt unverändert
       sichtbar - nur der Rahmen ändert sich. Selektoren zielen bewusst auf
       die spezifische .gantt-ohne-zeitraum-sichtbar-Klasse, NICHT auf ein
       generisches "rect" - sonst würde dieselbe Regel versehentlich auch die
       unsichtbare .gantt-ohne-zeitraum-trefferflaeche einfärben und sie
       dadurch sichtbar machen (siehe deren Kommentar). */
    .gantt-balken-zeile.gantt-hervorgehoben rect.gantt-balken,
    .gantt-ohne-zeitraum-marker.gantt-hervorgehoben rect.gantt-ohne-zeitraum-sichtbar {
      stroke: #e07820; stroke-width: 3px;
      filter: drop-shadow(0 0 3px rgba(224, 120, 32, 0.7));
    }
    /* Auswahl-Markierung (Punkt 1, Sidebar offen) - bewusst ANDERE Farbe
       (var(--accent), dasselbe dunkle Blau, das app-weit für
       "aktiv/ausgewählt" steht) UND anderer Effekt (solide statt Glow) als
       das Hover-Highlighting oben, damit "gehovert" und "ausgewählt" nicht
       verwechselt werden können - explizit im Auftrag gefordert. NACH der
       Hover-Regel platziert, damit Auswahl bei gleichzeitigem Hover
       (gleiche Selektor-Spezifität) sichtbar gewinnt - eine dauerhafte
       Auswahl soll nicht von einem flüchtigen Hover überdeckt werden. */
    .gantt-balken-zeile.gantt-ausgewaehlt rect.gantt-balken,
    .gantt-ohne-zeitraum-marker.gantt-ausgewaehlt rect.gantt-ohne-zeitraum-sichtbar {
      stroke: #e0b429; stroke-width: 3px; stroke-dasharray: none;
      filter: drop-shadow(0 0 2px rgba(224, 180, 41, .8));
    }
    /* 2026-10-28: Gold der Startseite statt --accent - das Blau verschwand auf den nun blauen Kategorien */
    .gantt-namensspalte-zeile.gantt-ausgewaehlt { background: #f6ecd0; box-shadow: inset 4px 0 0 #c99a3a; font-weight: 600; }
  `;
  container.appendChild(style);
}

// Zeichnet/aktualisiert die Zeitachse für eine gegebene (ggf. per Zoom
// reskalierte) x-Skala - eigene, kleine Funktion, da sie sowohl beim
// initialen Aufbau als auch bei jedem Zoom-/Pan-Ereignis erneut aufgerufen
// wird (Header-Achse und Balken müssen exakt dieselbe Skala verwenden, sonst
// laufen sie bei Interaktion auseinander).
function zeichneAchse(achseGruppe, xSkala) {
  achseGruppe.call(d3.axisTop(xSkala).tickFormat(d3.format('d')).tickSizeOuter(0));
}

// Aktualisiert Balkenposition/-breite und die Sichtbarkeit ihrer
// Zeitraum-Beschriftung für eine gegebene x-Skala (initial UND bei jedem
// Zoom-/Pan-Tick). Getrennt von der einmaligen Erzeugung der Elemente
// (zeichneBalken()), da beim Zoomen nur Attribute aktualisiert werden -
// kein erneutes .join() nötig.
function aktualisierePositionen(balkenAuswahl, textAuswahl, xSkala) {
  balkenAuswahl
    .attr('x', (d) => xSkala(d.von))
    .attr('width', (d) => Math.max(xSkala(d.bis) - xSkala(d.von), MINDESTBALKENBREITE_PX));

  textAuswahl.each(function aktualisiereText(d) {
    const x0 = xSkala(d.von);
    const breite = Math.max(xSkala(d.bis) - xSkala(d.von), MINDESTBALKENBREITE_PX);
    const text = `${d.von}–${d.bis}`;
    const zeichenBreite = MIN_SCHRIFTGROESSE * 0.57; // dieselbe Kennzahl wie treemap.js/sunburst.js/icicle.js/circlePacking.js
    const passtHinein = text.length * zeichenBreite <= breite - 6;
    d3.select(this)
      .attr('x', x0 + breite / 2)
      .attr('display', passtHinein ? null : 'none')
      .text(passtHinein ? text : '');
  });
}

function zeichneBalken(gruppe, mitZeitraum, kategorieFarbSkala, container, zeigeUnsicherheit) {
  const zeilen = gruppe.selectAll('g.gantt-balken-zeile')
    .data(mitZeitraum)
    .join('g')
    .attr('class', 'gantt-balken-zeile')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => `${d.data.name}, ${d.von}–${d.bis}, Details anzeigen`)
    .attr('data-bestand-schluessel', schluesselFuerBlatt)
    .style('cursor', 'pointer')
    .attr('transform', (d, i) => `translate(0,${i * ZEILE_GESAMT + ZEILENABSTAND / 2})`);

  wireTooltip(zeilen, container);
  // Punkt 1 (Sidebar): dasselbe Klick-/Enter-Leerzeichen-Muster wie
  // circlePacking.js' waehleBestand()-Verdrahtung.
  zeilen
    .on('click.auswahl', (event, d) => waehleBestand(d))
    .on('keydown.auswahl', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); waehleBestand(d); }
    });

  const balken = zeilen.append('rect')
    .attr('class', 'gantt-balken')
    .attr('height', ZEILENHOEHE)
    .attr('rx', 2)
    .attr('fill', (d) => farbeFuerBlatt(d, kategorieFarbSkala))
    .attr('stroke', (d) => (istUnsicher(d, zeigeUnsicherheit) ? '#c0392b' : '#ffffff'))
    .attr('stroke-width', (d) => (istUnsicher(d, zeigeUnsicherheit) ? 2 : 1))
    .attr('stroke-dasharray', (d) => (istUnsicher(d, zeigeUnsicherheit) ? '4,3' : null));

  zeilen.filter((d) => istUnsicher(d, zeigeUnsicherheit))
    .append('text')
    .attr('x', 4).attr('y', -4)
    .attr('font-size', 10).attr('aria-hidden', 'true')
    .text(WARN_SYMBOL);

  const texte = zeilen.append('text')
    .attr('y', ZEILENHOEHE / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'middle')
    .attr('font-size', MIN_SCHRIFTGROESSE)
    .attr('fill', '#ffffff')
    .attr('pointer-events', 'none')
    .attr('aria-hidden', 'true');

  return { balken, texte, zeilen };
}

// Eigene, klar markierte Zeilen für Bestände ohne auswertbaren Zeitraum
// (Schritt 6, Abschnitt 12: nie stillschweigend ausblenden). Anders als in
// der Vorversion (separater grauer Kachel-Block unterhalb der Zeitachse)
// jetzt als GLEICHWERTIGE Zeilen am Ende derselben Liste - dieselbe
// Zeilenhöhe, dieselbe Namensspalte, damit sie beim Scrollen/Suchen nicht als
// separater Modus wahrgenommen werden, sondern als das, was sie sind: Bestände
// ohne Zeitangabe. Fester, NICHT von xSkala/Zoom abhängiger Platzhalter statt
// eines Balkens (es gibt keine Zeitposition, die man zoomen könnte).
function zeichneOhneZeitraumMarker(gruppe, ohneZeitraum, startIndex, kategorieFarbSkala, container, zeigeUnsicherheit) {
  const zeilen = gruppe.selectAll('g.gantt-ohne-zeitraum-marker')
    .data(ohneZeitraum)
    .join('g')
    .attr('class', 'gantt-ohne-zeitraum-marker')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => `${d.data.name}, kein Zeitraum verzeichnet, Details anzeigen`)
    .attr('data-bestand-schluessel', schluesselFuerBlatt)
    .style('cursor', 'pointer')
    .attr('transform', (d, i) => `translate(${RAND.links},${(startIndex + i) * ZEILE_GESAMT + ZEILENABSTAND / 2})`);

  wireTooltip(zeilen, container);
  zeilen
    .on('click.auswahl', (event, d) => waehleBestand(d))
    .on('keydown.auswahl', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); waehleBestand(d); }
    });

  // Root-Cause-Fix (Punkt 3, siehe PROJEKTLOG): die sichtbare, gestrichelte
  // Markierung hat `fill:none` - per SVG-Spezifikation zählt bei
  // pointer-events:visiblePainted (Standard) eine `fill:none`-Fläche NICHT
  // zur Trefferfläche, nur der (dünne, zusätzlich gestrichelte, also
  // perforierte) Stroke-Pfad selbst reagiert auf Maus-Ereignisse - live
  // bestätigt als exakt der gemeldete "nur bei sehr präziser Mausposition"-
  // Effekt. Diese unsichtbare Trefferflächen-Rect (fill:transparent - zählt
  // laut Spezifikation SEHR WOHL als "painted" trotz Unsichtbarkeit) deckt
  // stattdessen die VOLLE Zeilenhöhe (ZEILE_GESAMT, nicht nur die kleinere
  // Balkenhöhe) und dieselbe Breite wie die sichtbare Markierung (90px -
  // bereits großzügiger als MINDESTBALKENBREITE_PX von regulären Balken) ab.
  // Zuerst gezeichnet, damit sie unter der sichtbaren Markierung liegt, ohne
  // deren Optik zu verändern - alle drei Interaktionen (Tooltip, Hover-
  // Highlighting, Klick-Auswahl) hängen an derselben `<g>` und profitieren
  // dadurch gemeinsam von der vergrößerten Fläche.
  zeilen.append('rect')
    .attr('class', 'gantt-ohne-zeitraum-trefferflaeche')
    .attr('x', 0).attr('y', -ZEILENABSTAND / 2)
    .attr('width', 90).attr('height', ZEILE_GESAMT)
    .attr('fill', 'transparent');

  zeilen.append('rect')
    .attr('class', 'gantt-ohne-zeitraum-sichtbar')
    .attr('width', 90).attr('height', ZEILENHOEHE).attr('rx', 2)
    .attr('fill', 'none')
    .attr('stroke', (d) => (istUnsicher(d, zeigeUnsicherheit) ? '#c0392b' : farbeFuerBlatt(d, kategorieFarbSkala)))
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '3,2');

  zeilen.append('text')
    .attr('x', 6).attr('y', ZEILENHOEHE / 2).attr('dy', '0.35em')
    .attr('font-size', 10).attr('fill', 'var(--text-muted)').attr('pointer-events', 'none')
    .text('ohne Zeitangabe');

  return zeilen;
}

function zeichneZebraStreifen(svg, anzahlZeilen, breite, zeilenHoehe = ZEILE_GESAMT) {
  svg.append('g').attr('aria-hidden', 'true')
    .selectAll('rect')
    .data(d3.range(anzahlZeilen))
    .join('rect')
    .attr('x', 0).attr('y', (i) => i * zeilenHoehe)
    .attr('width', breite).attr('height', zeilenHoehe)
    .attr('fill', (i) => (i % 2 === 0 ? 'transparent' : '#f7f6f2'));
}

// Seit 2026-10-28 (Wunsch des Autors): Kategorienamen in ihrer Farbe statt farbiger Kästchen davor - für die
// Lesbarkeit so weit abgedunkelt, dass sie auf hellem Grund mindestens 4,5:1 Kontrast haben
function baueLegende(legendeContainer, kategorienNamen, kategorieFarbSkala, hatOhneKategorie) {
  legendeContainer.innerHTML = '';
  const eintraege = kategorienNamen.map((name) => [name, kategorieFarbSkala(name)]);
  if (hatOhneKategorie) eintraege.push([OHNE_KATEGORIE, OHNE_KATEGORIE_FARBE]);
  eintraege.forEach(([name, farbe]) => {
    const eintrag = document.createElement('span');
    eintrag.className = 'gantt-legende-eintrag';
    eintrag.textContent = name;
    eintrag.style.color = lesbareTextfarbe(farbe);
    legendeContainer.appendChild(eintrag);
  });
}

// Baut die Namensspalte und gibt eine Map Schlüssel->Zeilen-Element zurück -
// wird von wireHervorhebung() genutzt, um bei Hover über einen Balken die
// zugehörige Namenszeile zu finden, ohne Positions-/Index-Vergleiche
// (siehe Dateikopf-Kommentar zu schluesselFuerBlatt()).
//
// Punkt 2 (Tooltip bei Hover über den Namen): Tooltip wird hier auf der
// GANZEN Zeile verdrahtet (nicht nur dem schmaleren, ggf. per Ellipsis
// gekürzten Namens-Span) - großzügigerer Hover-Bereich, deckt bei
// "ohne Zeitangabe"-Zeilen auch das Badge mit ab, konsistent mit dem in
// Punkt 3 verlangten großzügigen Hover-Verhalten. Verwendet denselben
// baueGanttTooltipText() wie der Balken-Hover (dieselbe Information, keine
// Duplikation).
function baueNamensspalte(namensspalte, alleZeilen, container) {
  namensspalte.innerHTML = '';
  const zeileNachSchluessel = new Map();
  const fragment = document.createDocumentFragment();
  alleZeilen.forEach((blatt) => {
    const zeile = document.createElement('div');
    zeile.className = 'gantt-namensspalte-zeile';
    zeile.dataset.bestandSchluessel = schluesselFuerBlatt(blatt);
    const name = document.createElement('span');
    name.className = 'gantt-namensspalte-name';
    name.textContent = blatt.data.name;
    name.style.color = lesbareTextfarbe(farbeFuerBlatt(blatt, instanz.kategorieFarbSkala)); // 2026-10-28: in der Farbe der Kategorie
    zeile.appendChild(name);
    if (!Number.isFinite(blatt.von)) {
      const badge = document.createElement('span');
      badge.className = 'gantt-namensspalte-badge';
      badge.textContent = 'ohne Zeitangabe';
      zeile.appendChild(badge);
    }
    zeile.addEventListener('mouseenter', () => zeigeTooltip(baueGanttTooltipText(blatt), zeile, container));
    zeile.addEventListener('mouseleave', () => versteckeTooltip());
    // Seit 2026-10-28 (Wunsch des Autors): auch ein Klick auf den Namen öffnet bzw. schließt die Sidebar,
    // wie der Klick auf den Balken
    zeile.tabIndex = 0;
    zeile.setAttribute('role', 'button');
    zeile.setAttribute('aria-label', `${blatt.data.name}, Details anzeigen`);
    zeile.addEventListener('click', () => waehleBestand(blatt));
    zeile.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); waehleBestand(blatt); }
    });
    fragment.appendChild(zeile);
    zeileNachSchluessel.set(schluesselFuerBlatt(blatt), zeile);
  });
  namensspalte.appendChild(fragment);
  return zeileNachSchluessel;
}

// Pan/Zoom-Interaktion (Schritt 5): d3.zoom() auf der Zeitachse, eingeschränkt
// auf die x-Achse (Positionen werden per event.transform.rescaleX() auf einer
// FIXEN Basis-Skala neu berechnet, statt die y-Achse mit zu verschieben/zu
// skalieren - d3.zoom() selbst kennt keine "nur x"-Option). Gewählte Variante:
// Ziehen (Drag) verschiebt die Zeitachse, Mausrad/Trackpad-Geste MIT
// gedrückter Strg-Taste zoomt (Browser melden Trackpad-Pinch als
// Wheel-Events mit ctrlKey=true - dieselbe Konvention wie Karten-/
// Grafikwerkzeuge à la Figma/Google Maps), zusätzlich drei Buttons
// (+/-/Zurücksetzen) für Tastatur- und Touch-Bedienung ohne Wheel/Drag.
// Begründung für die Strg-Bedingung: einfaches Mausrad OHNE Strg wird bewusst
// NICHT abgefangen (d3.zoom().filter() liefert dafür false, sodass kein
// preventDefault() ausgelöst wird) - genau das erhält das in Schritt 5
// geforderte "vertikales Scrollen bleibt unabhängig vom horizontalen Pan
// funktionsfähig": ohne diese Einschränkung würde JEDES Mausrad-Ereignis über
// der Zeitachse zoomen statt die Seite vertikal zu scrollen, sobald die Maus
// über dem Diagramm steht.
// `aktualisiere(xSkala)` (seit 2026-10-28): setzt alle zeitabhängigen Positionen - Balken in der
// Einzelbestand-Ansicht, Dichtebänder in der Kategorie-Ansicht.
function wireZoom({ svgAuswahl, xSkalaBasis, achseGruppe, aktualisiere, breite, hoehe }) {
  // extent()/translateExtent() bewusst auf die TATSÄCHLICHE Pixel-Fläche der
  // Zeitbereich-SVG gesetzt (nicht nur eine schmale x-Leiste) - d3.zoom()
  // nutzt dieses Rechteck intern für seine Zeiger-/Constraint-Berechnung
  // (u.a. für Drag-Erkennung); eine künstlich auf 1px verengte Höhe hatte in
  // einem ersten Testlauf dazu geführt, dass Drag-Pan gar nicht mehr
  // reagierte. Da beim Zoom-Handler unten NUR event.transform.rescaleX()
  // verwendet wird, hat ein zugelassener y-Anteil der Transformation ohnehin
  // keine sichtbare Wirkung - er wird schlicht nie gelesen.
  const zoomVerhalten = d3.zoom()
    .scaleExtent(ZOOM_SCALE_EXTENT)
    .translateExtent([[0, 0], [breite, hoehe]])
    .extent([[0, 0], [breite, hoehe]])
    .filter((event) => {
      if (event.type === 'wheel') return event.ctrlKey; // Strg+Wheel bzw. Trackpad-Pinch = Zoom, sonst Seiten-Scroll
      return !event.button; // Drag (linke Maustaste)/Touch weiterhin erlaubt
    })
    .on('zoom', (event) => {
      instanz.zoomTransform = event.transform;
      const neueXSkala = event.transform.rescaleX(xSkalaBasis);
      zeichneAchse(achseGruppe, neueXSkala);
      aktualisiere(neueXSkala);
    });

  svgAuswahl.call(zoomVerhalten);
  if (instanz.zoomTransform) {
    svgAuswahl.call(zoomVerhalten.transform, instanz.zoomTransform);
  }
  return zoomVerhalten;
}

// --- Kategorie-Ansicht (2026-10-28) ------------------------------------------------------------------

// Eine Zeile je Kategorie; `knoten` ist der d3-Hierarchieknoten der Kategorie (enthält alle Blätter, so
// funktioniert auch die Vorschau-Hervorhebung der Bestand-Suche, js/utils/bestandVorschau.js).
// Reihenfolge nach dem zeitlichen Schwerpunkt (nach Laufmetern gewichtete Laufzeitmitte).
function baueKategorieZeilen(mitZeitraum, ohneZeitraum) {
  const nachKnoten = new Map();
  const zeileFuer = (blatt) => {
    const knoten = blatt.ancestors().find((a) => a.depth === 1) || blatt;
    if (!nachKnoten.has(knoten)) nachKnoten.set(knoten, { knoten, name: kategorieVonKnoten(blatt), blaetter: [], ohneZeitraum: 0 });
    return nachKnoten.get(knoten);
  };
  mitZeitraum.forEach((b) => zeileFuer(b).blaetter.push(b));
  ohneZeitraum.forEach((b) => { zeileFuer(b).ohneZeitraum += 1; });
  const zeilen = [...nachKnoten.values()].filter((z) => z.blaetter.length > 0).map((z) => {
    const jeJahr = new Map();
    let lfm = 0;
    let gewicht = 0;
    let schwerpunkt = 0;
    z.blaetter.forEach((b) => {
      const umfang = parseUmfangLfm(b.data.record.umfang_lfm);
      lfm += umfang;
      const jahre = b.bis - b.von + 1;
      for (let j = b.von; j <= b.bis; j += 1) jeJahr.set(j, (jeJahr.get(j) || 0) + umfang / jahre);
      const g = umfang || 0.0001; // ohne Laufmeter: nur für die Reihenfolge, nicht für die Dichte
      gewicht += g;
      schwerpunkt += (g * (b.von + b.bis)) / 2;
    });
    const von = d3.min(z.blaetter, (b) => b.von);
    const bis = d3.max(z.blaetter, (b) => b.bis);
    const dichte = [[von - 1, 0]];
    for (let j = von; j <= bis; j += 1) dichte.push([j, jeJahr.get(j) || 0]);
    dichte.push([bis + 1, 0]);
    const ohneLfm = z.blaetter.filter((b) => !parseUmfangLfm(b.data.record.umfang_lfm)).length;
    return { ...z, von, bis, lfm, ohneLfm, dichte, max: d3.max(dichte, (d) => d[1]) || 0, schwerpunkt: schwerpunkt / gewicht };
  });
  return zeilen.sort((a, b) => a.schwerpunkt - b.schwerpunkt);
}

const anzahlBestaende = (n) => `${n} ${n === 1 ? 'Bestand' : 'Bestände'}`;
const lfmText = (wert) => `${wert.toLocaleString('de-AT', { maximumFractionDigits: 1 })} lfm`;

function kategorieFarbe(zeile, kategorieFarbSkala) {
  return zeile.name === OHNE_KATEGORIE ? OHNE_KATEGORIE_FARBE : kategorieFarbSkala(zeile.name);
}

function baueKategorieTooltipText(zeile, zeigeUnsicherheit) {
  const zeilen = [
    zeile.name,
    `${anzahlBestaende(zeile.blaetter.length)} mit Zeitraum${zeile.ohneZeitraum ? `, ${zeile.ohneZeitraum} ohne` : ''}`,
    `Umfang: ${lfmText(zeile.lfm)}${zeile.ohneLfm ? ` (${zeile.ohneLfm} ohne Angabe)` : ''}`,
    `Zeitraum: ${zeile.von}–${zeile.bis}, Schwerpunkt um ${Math.round(zeile.schwerpunkt)}`
  ];
  const unsicher = zeile.blaetter.filter((b) => b.data.record.daten_unsicher).length;
  if (zeigeUnsicherheit && unsicher) zeilen.push(`${WARN_SYMBOL} ${unsicher} davon mit unsicheren Angaben`);
  return zeilen.join('\n');
}

// Sidebar einer Kategorie: ihre Bestände nach Beginn, Klick öffnet den Bestand (Zurück führt zur Liste)
function zeigeKategorieListe(zeile) {
  const { sidebar, titel, koerper, zurueckBtn } = instanz.sidebar;
  instanz.ausgewaehlteKategorie = zeile.name;
  instanz.sidebar._kategorieListe = null;
  aktualisiereKategorieMarkierung();
  titel.textContent = zeile.name;
  koerper.innerHTML = '';
  const anzahl = document.createElement('p');
  anzahl.className = 'bestand-sidebar-urkunden-anzahl';
  anzahl.textContent = `${anzahlBestaende(zeile.blaetter.length)}, ${lfmText(zeile.lfm)}, ${zeile.von}–${zeile.bis}`;
  const liste = document.createElement('ul');
  liste.className = 'bestand-sidebar-urkunden-liste';
  [...zeile.blaetter].sort((a, b) => a.von - b.von).forEach((blatt) => {
    const li = document.createElement('li');
    li.className = 'bestand-sidebar-urkunden-eintrag';
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    const kopf = document.createElement('span');
    kopf.className = 'bestand-sidebar-urkunden-signatur';
    kopf.textContent = blatt.data.name;
    const info = document.createElement('p');
    info.className = 'bestand-sidebar-urkunden-regest';
    const umfang = parseUmfangLfm(blatt.data.record.umfang_lfm);
    info.textContent = `${blatt.von}–${blatt.bis}${umfang ? ` · ${lfmText(umfang)}` : ''}`;
    li.append(kopf, info);
    const oeffnen = () => {
      oeffneSidebarModul(instanz.sidebar, blatt.data.record, { kategorieName: zeile.name, kategorieFarbe: farbeFuerBlatt(blatt, instanz.kategorieFarbSkala) });
      instanz.sidebar._kategorieListe = zeile;
      zurueckBtn.hidden = false;
    };
    li.addEventListener('click', oeffnen);
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); oeffnen(); } });
    liste.appendChild(li);
  });
  koerper.append(anzahl, liste);
  zurueckBtn.hidden = true;
  sidebar.classList.add('offen');
  sidebar.setAttribute('aria-hidden', 'false');
  sidebar.inert = false;
  titel.focus();
}

// Klick auf dieselbe Kategorie bei offener Sidebar schließt sie wieder (wie bei den Einzelbeständen)
function waehleKategorie(zeile) {
  if (instanz.ausgewaehlteKategorie === zeile.name && instanz.sidebar.sidebar.classList.contains('offen')) {
    instanz.ausgewaehlteKategorie = null;
    instanz.sidebar._kategorieListe = null;
    aktualisiereKategorieMarkierung();
    schliesseSidebarModul(instanz.sidebar, instanz.kategorieElemente?.get(zeile.name)?.zeile);
    return;
  }
  zeigeKategorieListe(zeile);
}

function aktualisiereKategorieMarkierung() {
  instanz.kategorieElemente?.forEach(({ zeile, gruppe }, name) => {
    const an = name === instanz.ausgewaehlteKategorie;
    zeile.classList.toggle('gantt-ausgewaehlt', an);
    gruppe?.classList.toggle('gantt-ausgewaehlt', an);
  });
}

// Zeichnet Namensspalte und Dichtebänder; gibt die Auswahl der Band-Gruppen zurück (für die Animation)
function zeichneKategorieAnsicht({ namensspalte, zeitbereich, xSkalaBasis, achseGruppe, zeitbereichBreite, zoomButtons }) {
  const { container, kategorieZeilen, kategorieFarbSkala, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  const hoehe = kategorieZeilen.length * KATEGORIE_ZEILE;
  instanz.kategorieElemente = new Map();

  namensspalte.innerHTML = '';
  kategorieZeilen.forEach((zeile) => {
    const div = document.createElement('div');
    div.className = 'gantt-namensspalte-zeile gantt-kategorie-name';
    div.tabIndex = 0;
    div.setAttribute('role', 'button');
    div.setAttribute('aria-label', `${zeile.name}, ${anzahlBestaende(zeile.blaetter.length)}, ${zeile.von}–${zeile.bis}, Bestände anzeigen`);
    const name = document.createElement('span');
    name.className = 'gantt-namensspalte-name';
    name.textContent = zeile.name;
    name.style.color = lesbareTextfarbe(kategorieFarbe(zeile, kategorieFarbSkala)); // 2026-10-28: Name in der Kategoriefarbe
    const meta = document.createElement('span');
    meta.className = 'gantt-kategorie-meta';
    meta.textContent = `${anzahlBestaende(zeile.blaetter.length)} · ${lfmText(zeile.lfm)}`;
    div.append(name, meta);
    div.addEventListener('click', () => waehleKategorie(zeile));
    div.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); waehleKategorie(zeile); } });
    div.addEventListener('mouseenter', () => zeigeTooltip(baueKategorieTooltipText(zeile, zeigeUnsicherheit), div, container));
    div.addEventListener('mouseleave', () => versteckeTooltip());
    namensspalte.appendChild(div);
    instanz.kategorieElemente.set(zeile.name, { zeile: div, gruppe: null });
  });

  const svg = d3.select(zeitbereich).append('svg')
    .attr('width', zeitbereichBreite).attr('height', Math.max(hoehe, 1))
    .attr('role', 'group')
    .attr('aria-label', `Gantt-Diagramm nach Kategorien: ${kategorieZeilen.length} Kategorien`);
  svg.append('desc').text('Eine Zeile je Kategorie. Das Band zeigt, aus welcher Zeit die Bestände der Kategorie '
    + 'stammen: je dicker, desto mehr Laufmeter aus diesen Jahren. Die dünne Linie reicht vom frühesten bis zum spätesten Jahr.');
  zeichneZebraStreifen(svg, kategorieZeilen.length, zeitbereichBreite, KATEGORIE_ZEILE);

  const mitte = KATEGORIE_ZEILE / 2;
  const halb = mitte - KATEGORIE_RAND;
  const gesamtMax = d3.max(kategorieZeilen, (z) => z.max) || 1;
  const dicke = (wert) => Math.sqrt(wert / gesamtMax) * halb; // gemeinsamer Maßstab, Quadratwurzel
  const gruppen = svg.append('g').selectAll('g.gantt-kategorie-zeile')
    .data(kategorieZeilen.map((z) => z.knoten))
    .join('g')
    .attr('class', 'gantt-kategorie-zeile')
    .attr('transform', (d, i) => `translate(0,${i * KATEGORIE_ZEILE})`)
    .style('cursor', 'pointer');
  // unsichtbare Trefferfläche über die ganze Zeile, damit auch dünne Bandstellen klickbar sind
  gruppen.append('rect').attr('width', zeitbereichBreite).attr('height', KATEGORIE_ZEILE).attr('fill', 'transparent');
  const formen = gruppen.append('g').attr('class', 'gantt-kategorie-form').attr('pointer-events', 'none');
  const linien = formen.append('line')
    .attr('y1', mitte).attr('y2', mitte)
    .attr('stroke', (d, i) => kategorieFarbe(kategorieZeilen[i], kategorieFarbSkala))
    .attr('stroke-width', 1.5).attr('stroke-opacity', 0.55);
  const baender = formen.append('path')
    .attr('class', 'gantt-kategorie-band')
    .attr('fill', (d, i) => kategorieFarbe(kategorieZeilen[i], kategorieFarbSkala))
    .attr('stroke', (d, i) => (zeigeUnsicherheit && kategorieZeilen[i].blaetter.some((b) => b.data.record.daten_unsicher) ? '#c0392b' : 'none'))
    .attr('stroke-dasharray', '4,3');
  gruppen.each(function verdrahte(d, i) {
    const zeile = kategorieZeilen[i];
    const eintrag = instanz.kategorieElemente.get(zeile.name);
    eintrag.gruppe = this;
    d3.select(this)
      .on('click', () => waehleKategorie(zeile))
      .on('mouseenter', (event) => {
        zeigeTooltip(baueKategorieTooltipText(zeile, zeigeUnsicherheit), event.currentTarget, container);
        eintrag.zeile.classList.add('gantt-hervorgehoben');
      })
      .on('mouseleave', () => {
        versteckeTooltip();
        eintrag.zeile.classList.remove('gantt-hervorgehoben');
      });
  });

  const aktualisiere = (x) => {
    linien.attr('x1', (d, i) => x(kategorieZeilen[i].von)).attr('x2', (d, i) => x(kategorieZeilen[i].bis + 1));
    baender.attr('d', (d, i) => {
      const zeile = kategorieZeilen[i];
      if (!zeile.max) return null;
      return d3.area()
        .x((p) => x(p[0]))
        .y0((p) => mitte - dicke(p[1]))
        .y1((p) => mitte + dicke(p[1]))
        .curve(d3.curveBasis)(zeile.dichte);
    });
  };
  aktualisiere(instanz.zoomTransform ? instanz.zoomTransform.rescaleX(xSkalaBasis) : xSkalaBasis);
  aktualisiereKategorieMarkierung();

  const zoomVerhalten = wireZoom({ svgAuswahl: svg, xSkalaBasis, achseGruppe, aktualisiere, breite: zeitbereichBreite, hoehe: Math.max(hoehe, 1) });
  zoomButtons.rein.addEventListener('click', () => svg.call(zoomVerhalten.scaleBy, 1.5));
  zoomButtons.raus.addEventListener('click', () => svg.call(zoomVerhalten.scaleBy, 1 / 1.5));
  zoomButtons.reset.addEventListener('click', () => svg.call(zoomVerhalten.transform, d3.zoomIdentity));
  return formen;
}

// --- Animierter Wechsel Einzelbestände <-> Kategorien ------------------------------------------------
// d3-Übergänge laufen über requestAnimationFrame, das in Hintergrund-Tabs ruht. Jeder Schritt endet
// deshalb zusätzlich nach fester Zeit (setTimeout) im Endzustand - die Ansicht bleibt nie halb animiert.

const ohneAnimation = () => document.hidden || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function nachUebergang(auswahl, dauer, endzustand) {
  return new Promise((fertig) => {
    setTimeout(() => {
      auswahl.interrupt();
      endzustand(auswahl);
      fertig();
    }, dauer + 80);
  });
}

async function wechsleModus(neuerModus) {
  if (!instanz || instanz.modus === neuerModus || instanz.wechseltModus) return;
  const zeilenIndex = new Map(instanz.kategorieZeilen.map((z, i) => [z.name, i]));
  const yKategorie = (blatt) => (zeilenIndex.get(kategorieVonKnoten(blatt)) ?? 0) * KATEGORIE_ZEILE + KATEGORIE_ZEILE / 2 - ZEILENHOEHE / 2;
  const mitte = KATEGORIE_ZEILE / 2;
  const flach = (sel) => sel.attr('transform', `translate(0,${mitte * 0.9}) scale(1,0.1)`).style('opacity', 0.3);
  const voll = (sel) => sel.attr('transform', 'translate(0,0) scale(1,1)').style('opacity', 1);
  instanz.ausgewaehlterSchluessel = null;
  instanz.ausgewaehlteKategorie = null;
  instanz.sidebar._kategorieListe = null;
  if (instanz.sidebar.sidebar.classList.contains('offen')) schliesseSidebarModul(instanz.sidebar);
  if (ohneAnimation()) { instanz.modus = neuerModus; zeichneGantt(); return; }
  instanz.wechseltModus = true;
  const nebenElemente = () => d3.select(instanz.wurzel).selectAll('.gantt-namensspalte-zeile, g.gantt-ohne-zeitraum-marker');
  try {
    if (neuerModus === MODUS_KATEGORIEN) {
      // 1. Balken gleiten in die Zeile ihrer Kategorie und verblassen, die Namen treten zurück
      const balken = d3.select(instanz.wurzel).selectAll('g.gantt-balken-zeile');
      const ziel = (sel) => sel.attr('transform', (d) => `translate(0,${yKategorie(d)})`).style('opacity', 0.15);
      balken.transition().duration(UEBERGANG_MS).ease(d3.easeCubicInOut).call(ziel);
      nebenElemente().transition().duration(UEBERGANG_MS / 2).style('opacity', 0);
      await nachUebergang(balken, UEBERGANG_MS, ziel);
      // 2. Kategorie-Ansicht zeichnen, die Bänder wachsen aus ihrer Mittellinie
      instanz.modus = neuerModus;
      const formen = zeichneGantt();
      flach(formen);
      formen.transition().duration(UEBERGANG_MS * 0.6).ease(d3.easeCubicOut).call(voll);
      await nachUebergang(formen, UEBERGANG_MS * 0.6, voll);
    } else {
      // 1. Bänder ziehen sich auf ihre Mittellinie zusammen
      const formen = d3.select(instanz.wurzel).selectAll('g.gantt-kategorie-form');
      formen.transition().duration(UEBERGANG_MS * 0.5).ease(d3.easeCubicIn).call(flach);
      await nachUebergang(formen, UEBERGANG_MS * 0.5, flach);
      // 2. Einzelbestände zeichnen; jeder Balken startet in der Zeile seiner Kategorie und fächert auf
      instanz.modus = neuerModus;
      zeichneGantt();
      const balken = d3.select(instanz.wurzel).selectAll('g.gantt-balken-zeile');
      const endTransform = new Map();
      balken.each(function merke() { endTransform.set(this, this.getAttribute('transform')); });
      const auf = (sel) => sel.attr('transform', function ende() { return endTransform.get(this); }).style('opacity', 1);
      balken.attr('transform', (d) => `translate(0,${yKategorie(d)})`).style('opacity', 0.15);
      balken.transition().duration(UEBERGANG_MS).delay((d, i) => Math.min(i * 0.8, 200)).ease(d3.easeCubicInOut).call(auf);
      nebenElemente().style('opacity', 0).transition().delay(UEBERGANG_MS / 2).duration(UEBERGANG_MS / 2).style('opacity', 1);
      await nachUebergang(balken, UEBERGANG_MS + 200, auf);
      nebenElemente().interrupt().style('opacity', null);
    }
  } finally {
    if (instanz) instanz.wechseltModus = false;
  }
}


// Schalter „Einzelbestände | Kategorien“ in der Werkzeugleiste (seit 2026-10-28 wieder hier, Wunsch des Autors)
function baueModusSchalter(ziel) {
  const gruppe = document.createElement('div');
  gruppe.className = 'gantt-modus-schalter';
  gruppe.setAttribute('role', 'group');
  gruppe.setAttribute('aria-label', 'Darstellung');
  [[MODUS_BESTAENDE, 'Einzelbestände'], [MODUS_KATEGORIEN, 'Kategorien']].forEach(([modus, text]) => {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.textContent = text;
    knopf.setAttribute('aria-pressed', String(instanz.modus === modus));
    knopf.addEventListener('click', () => wechsleModus(modus));
    gruppe.appendChild(knopf);
  });
  ziel.prepend(gruppe);
}

function zeichneGantt() {
  const { container, wurzel, mitZeitraum, ohneZeitraum, kategorienNamen, kategorieFarbSkala, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  // Root-Cause-Fix (Punkt "Sidebar nicht mitlöschen", siehe PROJEKTLOG - das
  // bereits einmal beim Sunburst aufgetretene Problem): NUR den inneren
  // `wurzel`-Wrapper leeren, NICHT `container` selbst. Die Sidebar (siehe
  // render()) hängt als GESCHWISTER von `wurzel` direkt in `container` -
  // würde hier `container.innerHTML` geleert, würde jeder Redraw (resize(),
  // Unsicherheiten-Toggle) eine gerade offene Sidebar mitsamt ihrem Zustand
  // zerstören. Dieselbe Struktur wie treemap.js/sunburst.js/circlePacking.js
  // (dort: svgBereich.innerHTML statt container.innerHTML).
  //
  // Info-Button (Auftrag "Info-Button für die 5 Bestandsvisualisierungen"):
  // die Werkzeugleiste selbst entsteht hier bei JEDEM Redraw neu (anders als
  // treemap.js/circlePacking.js, wo baueWerkzeugleiste() nur einmal in
  // render() läuft) - ein einfaches erneutes erzeugeInfoButton() würde daher
  // bei jedem resize()/Unsicherheiten-Toggle zusätzliche document-Listener
  // registrieren (siehe infoButton.js), ohne die vorherigen je zu entfernen.
  // Deshalb wird die vorherige Instanz hier explizit zerstört, BEVOR
  // wurzel.innerHTML sie aus dem DOM entfernt.
  if (instanz.infoButton) instanz.infoButton.destroy();
  wurzel.innerHTML = '';

  const breite = options.width || container.clientWidth || 900;
  // Zoom-Zustand nur über eine tatsächliche Breitenänderung zurücksetzen
  // (echtes Fenster-Resize) - beim bloßen Umschalten von "Unsicherheiten
  // anzeigen" (resize() mit unveränderter Breite) bleibt die aktuelle
  // Zoom-/Pan-Position erhalten, siehe Modul-Vertrag Abschnitt 5 ("resize()
  // darf den internen Zustand nicht zurücksetzen") - dieselbe Regel, die
  // treemap.js/icicle.js für ihre Drilldown-Position bereits befolgen. Eine
  // andere Breite macht die alte Transformation jedoch ungültig (sie bezog
  // sich auf Pixelwerte der alten Breite), daher hier bewusst kein Erhalt.
  if (instanz.letzteBreite !== null && instanz.letzteBreite !== breite) {
    instanz.zoomTransform = null;
  }
  instanz.letzteBreite = breite;

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'gantt-werkzeugleiste';
  const legende = document.createElement('div');
  legende.className = 'gantt-legende';
  // Auftrag "Dot Plot - Nachbesserungen" Punkt 3: Zoom-Buttons und
  // Info-Button müssen sichtbar ZUSAMMENHÄNGEN (nicht per space-between
  // an entgegengesetzte Enden der Werkzeugleiste verteilt werden, wie es
  // vor diesem Auftrag der Fall war - ein einzelnes drittes
  // space-between-Kind hätte KEINE Adjazenz zu den Zoom-Buttons
  // garantiert). Beide werden daher als GEMEINSAMES drittes Kind in einen
  // eigenen Flex-Wrapper gepackt, der als Ganzes rechts landet.
  const werkzeugleisteRechts = document.createElement('div');
  werkzeugleisteRechts.className = 'gantt-werkzeugleiste-rechts';
  const zoomButtons = erzeugeZoomSteuerung(werkzeugleisteRechts);
  baueModusSchalter(werkzeugleiste);
  const kategorieModus = instanz.modus === MODUS_KATEGORIEN;
  const btnRaus = zoomButtons.raus;
  const btnReset = zoomButtons.reset;
  const btnRein = zoomButtons.rein;
  werkzeugleiste.append(legende, werkzeugleisteRechts);
  infotextFuerModul('ganttDiagramm').then((cfg) => {
    if (!instanz || !cfg || !werkzeugleisteRechts.isConnected) return;
    instanz.infoButton = erzeugeInfoButton(werkzeugleisteRechts, cfg);
  });

  const kopfzeile = document.createElement('div');
  kopfzeile.className = 'gantt-kopfzeile';
  const kopfPlatzhalter = document.createElement('div');
  kopfPlatzhalter.className = 'gantt-kopf-namensplatzhalter';
  kopfPlatzhalter.textContent = kategorieModus ? 'Kategorie' : 'Bestand';
  const kopfAchseBereich = document.createElement('div');
  kopfAchseBereich.className = 'gantt-kopf-achse-bereich';
  kopfzeile.append(kopfPlatzhalter, kopfAchseBereich);

  const koerper = document.createElement('div');
  koerper.className = 'gantt-koerper';
  const namensspalte = document.createElement('div');
  namensspalte.className = 'gantt-namensspalte';
  const zeitbereich = document.createElement('div');
  zeitbereich.className = 'gantt-zeitbereich';
  koerper.append(namensspalte, zeitbereich);

  wurzel.append(werkzeugleiste, kopfzeile, koerper);

  const hatOhneKategorie = [...mitZeitraum, ...ohneZeitraum].some((b) => kategorieVonKnoten(b) === OHNE_KATEGORIE);
  if (!kategorieModus) baueLegende(legende, kategorienNamen, kategorieFarbSkala, hatOhneKategorie);

  const alleZeilen = [...mitZeitraum, ...ohneZeitraum];

  const zeitbereichBreite = Math.max(breite - NAMENSSPALTE_BREITE, 200);
  const gesamtHoehe = alleZeilen.length * ZEILE_GESAMT;

  const jahresSpanne = mitZeitraum.length > 0
    ? [d3.min(mitZeitraum, (d) => d.von), d3.max(mitZeitraum, (d) => d.bis)]
    : [1100, 2025];
  // Root-Cause-Fix (siehe PROJEKTLOG): .nice() rundete die Domain bei der
  // realen Spanne 1108-2024 auf [1100, 2100] auf - ein willkürlicher,
  // 76 Jahre über das tatsächliche Datenmaximum hinausreichender Wert (d3s
  // .nice() richtet sich nach der Standard-Tick-Anzahl, nicht nach den realen
  // Daten). Domain-Enden werden jetzt stattdessen explizit auf die nächsten
  // vollen 10 Jahre auf-/abgerundet - ein "sinnvoller kleiner Puffer" statt
  // einer willkürlichen Rundung: real 1108-2024 -> Domain [1100, 2030], nur
  // 6 Jahre über dem echten Maximum statt 76.
  const domainVon = Math.floor(jahresSpanne[0] / 10) * 10;
  const domainBis = Math.ceil(jahresSpanne[1] / 10) * 10;
  const xSkalaBasis = d3.scaleLinear().domain([domainVon, domainBis]).range([RAND.links, zeitbereichBreite - RAND.rechts]);

  const achseSvg = d3.select(kopfAchseBereich).append('svg')
    .attr('width', zeitbereichBreite).attr('height', ACHSE_HOEHE)
    .attr('role', 'img')
    .attr('aria-label', `Zeitachse von ${jahresSpanne[0]} bis ${jahresSpanne[1]}`);
  // Auftrag "Einheitliche Achsenbeschriftungsgröße app-weit": Schriftgröße
  // per CSS-KLASSE gesetzt, NICHT per .attr('font-size', ...) - d3-axis
  // setzt bei JEDEM .call() (hier: zeichneAchse(), erneut bei JEDEM
  // Zoom-Tick über wireZoom()) selbst font-size:10 auf die Gruppe (Teil
  // seiner eigenen Default-Präsentation) und würde ein zuvor per .attr()
  // gesetztes font-size sofort wieder überschreiben - live entdeckt (siehe
  // Abschlussbericht: font-size blieb trotz .attr() bei 10, bei jedem
  // .call() erneut). Eine CSS-Klasse hat höhere Präzedenz als ein
  // SVG-Präsentationsattribut und übersteht daher jeden erneuten .call()
  // unverändert - exakt dasselbe, bereits von zeitachse.js für dasselbe
  // Problem etablierte Muster (.zeitachse-x-achse), hier unter
  // .gantt-x-achse für Gantt übernommen.
  const achseGruppe = achseSvg.append('g').attr('class', 'gantt-x-achse').attr('transform', `translate(0,${ACHSE_HOEHE})`);
  zeichneAchse(achseGruppe, instanz.zoomTransform ? instanz.zoomTransform.rescaleX(xSkalaBasis) : xSkalaBasis);

  if (kategorieModus) {
    instanz.gruppeNachSchluessel = new Map();
    instanz.zeileNachSchluessel = null;
    return zeichneKategorieAnsicht({ namensspalte, zeitbereich, xSkalaBasis, achseGruppe, zeitbereichBreite, zoomButtons });
  }
  instanz.kategorieElemente = null;
  const zeileNachSchluessel = baueNamensspalte(namensspalte, alleZeilen, container);

  const svg = d3.select(zeitbereich).append('svg')
    .attr('width', zeitbereichBreite).attr('height', Math.max(gesamtHoehe, 1))
    .attr('role', 'group') // AUFTRAG D, Punkt 2 (axe nested-interactive): enthält bedienbare Elemente; aria-label bleibt
    .attr('aria-label', `Gantt-Diagramm: ${mitZeitraum.length} Bestände nach Zeitraum, ${ohneZeitraum.length} ohne Zeitangabe`);

  svg.append('desc').text(
    'Ein horizontaler Balken pro Bestand, Position und Breite nach überliefertem ' +
    'Zeitraum, chronologisch aufsteigend sortiert. Farbton zeigt die Kategorie ' +
    '(Legende oberhalb), "ohne Kategorie" erscheint neutral grau mit Punktmuster. ' +
    'Gestrichelter roter Rand und Warnsymbol kennzeichnen unsichere Angaben. ' +
    'Bestände ohne verzeichneten Zeitraum erscheinen am Ende der Liste als ' +
    'gestrichelter Platzhalter ohne Balken, nicht ausgeblendet. Ziehen verschiebt ' +
    'die Zeitachse, Strg+Mausrad bzw. Trackpad-Zoomgeste zoomt.'
  );

  zeichneZebraStreifen(svg, alleZeilen.length, zeitbereichBreite);
  const balkenGruppe = svg.append('g');
  const { balken, texte, zeilen: balkenZeilen } = zeichneBalken(balkenGruppe, mitZeitraum, kategorieFarbSkala, container, zeigeUnsicherheit);
  aktualisierePositionen(balken, texte, xSkalaBasis);

  const ohneZeitraumGruppe = svg.append('g');
  const ohneZeitraumZeilen = zeichneOhneZeitraumMarker(ohneZeitraumGruppe, ohneZeitraum, mitZeitraum.length, kategorieFarbSkala, container, zeigeUnsicherheit);

  const gruppenAuswahlen = [balkenZeilen, ohneZeitraumZeilen];
  instanz.gruppeNachSchluessel = baueGruppeNachSchluessel(gruppenAuswahlen);
  instanz.zeileNachSchluessel = zeileNachSchluessel;
  wireHervorhebung(zeileNachSchluessel, instanz.gruppeNachSchluessel, gruppenAuswahlen);
  // Nach jedem Redraw (resize()/Unsicherheiten-Toggle entstehen die Balken-/
  // Marker-Knoten komplett neu) die Auswahl-Markierung auf die neuen Knoten
  // übertragen - die Sidebar selbst bleibt unberührt (siehe wurzel.innerHTML
  // oben), zeigt aber weiterhin denselben record; nur der visuelle "aktiv"-
  // Rahmen muss auf dem NEUEN DOM-Knoten erneut gesetzt werden.
  aktualisiereAuswahlMarkierung();

  const zoomVerhalten = wireZoom({
    svgAuswahl: svg,
    xSkalaBasis,
    achseGruppe,
    aktualisiere: (x) => aktualisierePositionen(balken, texte, x),
    breite: zeitbereichBreite,
    hoehe: Math.max(gesamtHoehe, 1)
  });

  // Bewusst OHNE .transition(): d3-Transitions laufen über requestAnimationFrame -
  // auf einem Gerät/Tab, der gerade nicht sichtbar/composited ist (z.B. ein
  // Hintergrund-Tab), feuert rAF nicht zuverlässig, wodurch eine animierte
  // Zoom-Änderung dort unbemerkt ausbleiben könnte. Ein direkter, sofortiger
  // Sprung ist unabhängig davon garantiert wirksam - Zuverlässigkeit hat hier
  // Vorrang vor der rein kosmetischen Ease-Animation.
  btnRein.addEventListener('click', () => svg.call(zoomVerhalten.scaleBy, 1.5));
  btnRaus.addEventListener('click', () => svg.call(zoomVerhalten.scaleBy, 1 / 1.5));
  btnReset.addEventListener('click', () => svg.call(zoomVerhalten.transform, d3.zoomIdentity));
  return null;
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  // AUFTRAG B1 (Prüfbericht Punkt 3): ohne Datensätze ist die Wurzel der
  // Hierarchie selbst ein "Blatt" ohne `record` - teileUndSortiere() griff
  // darauf zu und brach ab. Kontrolliert beenden, nichts zeichnen (ob und wie
  // das gemeldet wird, regelt Auftrag B2).
  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = '';
    return;
  }
  const hierarchieDaten = baueBestandsHierarchie(data);
  const kategorienNamen = hierarchieDaten.children
    .map((k) => k.name)
    .filter((name) => name !== OHNE_KATEGORIE)
    .sort((a, b) => a.localeCompare(b));

  const blaetter = d3.hierarchy(hierarchieDaten).leaves();
  const { mitZeitraum, ohneZeitraum } = teileUndSortiere(blaetter);

  // Punkt 1 (Sidebar): container.innerHTML wird HIER, EINMALIG pro
  // render()-Aufruf geleert - zeichneGantt() (aufgerufen bei jedem
  // resize()/Unsicherheiten-Toggle) leert danach nur noch `wurzel`, NIE mehr
  // `container` selbst. `sidebar` hängt als GESCHWISTER von `wurzel` direkt
  // in `container` und bleibt dadurch über jeden Redraw hinweg erhalten -
  // genau das beim Sunburst einmal aufgetretene Problem (Redraw löscht
  // versehentlich die offene Sidebar mit) wird dadurch strukturell
  // vermieden, exakt nach demselben, bereits etablierten Muster wie
  // treemap.js/sunburst.js/circlePacking.js (dort: svgBereich statt wurzel).
  container.innerHTML = '';
  const wurzel = document.createElement('div');
  wurzel.className = 'gantt-wurzel';
  container.appendChild(wurzel);
  fuegeStyleEin(container);
  fuegeSidebarStyleEin(container);
  const sidebar = baueSidebarGeruest(container);

  instanz = {
    container,
    wurzel,
    sidebar,
    mitZeitraum,
    ohneZeitraum,
    kategorienNamen,
    kategorieFarbSkala: baueBestandFarbSkala(hierarchieDaten.children.filter((k) => k.name !== OHNE_KATEGORIE)), // 2026-10-28: Palette „Vier Familien“
    options: { showUncertainty: true, width: null, height: null, ...options },
    letzteBreite: null,
    zoomTransform: null,
    ausgewaehlterSchluessel: null,
    gruppeNachSchluessel: new Map(),
    modus: MODUS_BESTAENDE, // 2026-10-28: Einzelbestände oder Kategorien
    kategorieZeilen: baueKategorieZeilen(mitZeitraum, ohneZeitraum),
    ausgewaehlteKategorie: null,
    kategorieElemente: null,
    wechseltModus: false
  };
  // Zurück aus einem Bestand in die Liste seiner Kategorie (Kategorie-Ansicht)
  sidebar.zurueckBtn.addEventListener('click', () => {
    if (instanz?.sidebar._kategorieListe) zeigeKategorieListe(instanz.sidebar._kategorieListe);
  });
  sidebar.schliessenBtn.addEventListener('click', () => {
    const zielElement = instanz.gruppeNachSchluessel.get(instanz.ausgewaehlterSchluessel);
    instanz.ausgewaehlterSchluessel = null;
    instanz.ausgewaehlteKategorie = null;
    instanz.sidebar._kategorieListe = null;
    aktualisiereAuswahlMarkierung();
    aktualisiereKategorieMarkierung();
    schliesseSidebarModul(instanz.sidebar, zielElement);
  });
  zeichneGantt();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneGantt();
}

export function destroy() {
  if (!instanz) return;
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}

// Suchfeld der Bestand-Visualisierungen und Datensatzaufruf: wählt den Balken bzw. Marker des
// Bestands aus (öffnet die Sidebar) und holt ihn in den sichtbaren Bereich.
export function oeffneDatensatz(kuerzel) {
  if (!instanz) return false;
  const blatt = [...instanz.mitZeitraum, ...instanz.ohneZeitraum].find((b) => b.data?.record?.kuerzel === kuerzel);
  if (!blatt) return false;
  if (instanz.modus !== MODUS_BESTAENDE) { instanz.modus = MODUS_BESTAENDE; zeichneGantt(); } // Suche zeigt den einzelnen Bestand
  if (instanz.ausgewaehlterSchluessel !== schluesselFuerBlatt(blatt)) waehleBestand(blatt);
  instanz.gruppeNachSchluessel.get(schluesselFuerBlatt(blatt))?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  return true;
}
