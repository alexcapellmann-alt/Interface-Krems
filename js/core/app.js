// js/core/app.js
// Teil C: verdrahtet die drei Bauteile aus Abschnitt 5 (kachelauswahl.js,
// ansichtWechseln.js, unsicherheitsButton.js) mit router.js/state.js und den
// echten Visualisierungsmodulen zu den fünf Haupttabs aus Abschnitt 4.
//
// AUFTRAG "Navigation – Permanente Bereichs-Leiste & Visualisierungs-Galerie
// (Pilot: Urkunden)": kachelauswahl.js (einmalige "Kachel wählen, dann
// verschwindet sie"-Landingpage) wird hier nicht mehr aufgerufen - ersetzt
// durch bereichsLeiste.js (dieselbe "Bereich wählen"-Aufgabe, aber dauerhaft
// sichtbar, siehe dortiger Dateikopf-Kommentar) und, für Bereiche mit
// `hatGalerie:true` (aktuell nur `urkunden`, Pilot), visualisierungsGalerie.js
// statt eines automatischen Sprungs zur Primäransicht + ansichtWechseln.js'
// Dropdown (Auftrag, wörtlich: "Die bisherige 'Ansicht'-Dropdown-Leiste
// entfällt vollständig, die Galerie übernimmt ihre Funktion" - gilt bewusst
// nur für `hatGalerie`-Bereiche, siehe renderVisualisierungenTab()).
// kachelauswahl.js selbst war dadurch von nirgends mehr erreichbar (genuin
// toter Code) und wurde gelöscht.
//
// FOLGEAUFTRAG "Visualisierungs-Tab-Leiste statt 'Zurück zur Übersicht'-Link
// (Pilot: Urkunden)" (CHANGELOG 41): eine aus der Galerie geöffnete
// Visualisierung öffnete zunächst einen Tab in einer neuen Zeile unterhalb
// der Bereichs-Leiste, mehrere Tabs blieben dabei gleichzeitig offen (wie
// Browser-Tabs) - siehe CHANGELOG für die damalige Begründung.
//
// FOLGEAUFTRAG "Permanente Tab-Leiste statt dynamischer Multi-Tabs (Pilot:
// Urkunden)" (CHANGELOG 42): ersetzte diese Multi-Tab-Funktion durch eine
// PERMANENTE Tab-Leiste, die immer ALLE Visualisierungen des Bereichs zeigt -
// klassisches Single-Select-Tab-Menü, genau ein Tab aktiv, kein Offenhalten/
// Schließen mehr. Dadurch entfiel die in (41) eingeführte Ausnahme vom
// LEICHTGEWICHTIGER-ANSICHTSWECHSEL-vs-VOLLSTÄNDIGER-TAB-NEUAUFBAU-Prinzip
// weiter unten wieder GRÖSSTENTEILS: ein Tab-Wechsel funktioniert seitdem
// fast wie ansichtWechseln.js' wechsleZu() (destroy() des alten, render()
// des neuen Moduls).
//
// FOLGEAUFTRAG "Visualisierungs-Tab-Leiste als Hover/Klick-Flyout + Galerie-
// Muster für Bestand" (AKTUELLER STAND, CHANGELOG 44): zwei Änderungen.
// (1) Die permanente Tab-Leiste aus (42) nahm dauerhaft eine eigene Grid-
// Zeile ein (Visualisierung dadurch kleiner als nötig) - jetzt ein Hover/
// Klick-FLYOUT (visualisierungsTabs.js' verankereFlyout()), `position:fixed`,
// überlappt die Visualisierung statt ihr Platz wegzunehmen (siehe layout.css:
// die dafür eingeführte Grid-Zeile ist wieder entfernt). Verankert am
// jeweiligen "Auslöser" (Urkunden: der aktive Bereichs-Leiste-Eintrag;
// Bestand: der "Bestand"-Hauptnav-Link).
// (2) Bestand bekommt DASSELBE Galerie+Flyout-Muster wie Urkunden, obwohl es
// ein TOP-LEVEL-Tab ist (kein Archivalientyp, keine Bereichs-Leiste
// darunter) - deshalb sind ab hier alle vormals urkunden/hatGalerie-
// spezifischen Funktionen (zeigeGalerie(), stelleVizFlyoutSicher(),
// wechsleZuAnsicht(), aktualisiereGalerieFlyoutAnsicht() - ehemals
// aktualisiereHatGalerieAnsicht()) VERALLGEMEINERT: sie arbeiten auf einem
// generischen `kontext.bereich` ({label, ansichten, datenDatei} - bei
// Urkunden der echte `archivalientyp`, bei Bestand ein dafür gebautes
// gleichförmiges Objekt) statt fest auf `kontext.archivalientyp`, plus
// `kontext.routeSegmente(id)`/`kontext.ermittleAnsichtId(route)` (wie sich
// die Route für diesen Bereich zusammensetzt - bei Urkunden ein 2./3.
// Segment unter 'visualisierungen', bei Bestand das 1. Segment direkt unter
// 'bestand') und `kontext.ausloeser` (das Flyout-Trigger-Element). Sowohl
// renderVisualisierungenTab()s hatGalerie-Zweig als auch das neue
// renderBestandTab() bauen nur noch ihren jeweiligen kontext und rufen
// danach dieselben gemeinsamen Funktionen auf - keine zweite, fast
// identische Kopie der ganzen Galerie/Flyout-Logik für Bestand.
//
// FOLGEAUFTRAG "Hover-Flyouts in der Hauptnavigation" (AKTUELLER STAND,
// CHANGELOG 46): drei Erweiterungen des Flyout-Musters, alle über
// verankereHauptnavFlyouts() UNTEN einmalig beim App-Start verankert (nicht
// an den render*Tab()-Lebenszyklus gebunden - anders als die bisherigen
// Flyouts sollen diese von JEDER Stelle der App aus per Hover erreichbar
// sein, auch bevor "Visualisierungen"/"Bestand" je angeklickt wurden):
// (1) "Visualisierungen" bekommt bei Hover einen Flyout mit einer
//     Vorschau-Kopie der Bereichs-Leiste (bereichsLeiste.js'
//     erzeugeBereichsLeistenVorschau()) - Klick auf "Visualisierungen"
//     selbst bleibt unverändert eine normale Navigation (kein Toggle, siehe
//     visualisierungsTabs.js' verankereIconFlyout()-artige Klick-
//     Behandlung, hier direkt in verankereHauptnavFlyouts() nachgebaut).
// (2) "Bestand" bekommt bei Hover einen Flyout mit seinen 5 Visualisierungen
//     als Icon+Name-Kacheln (visualisierungsTabs.js' verankereIconFlyout()),
//     Klick darin springt DIREKT zur Visualisierung (nicht zur Galerie).
// (3) JEDER Bereichs-Leiste-Eintrag (nicht mehr nur der aktive) bekommt
//     einen eigenen Visualisierungs-Tab-Flyout (bereichsLeiste.js'
//     baueBereichsPillen()-Erweiterung, siehe dortiger Kommentar) - dieselbe
//     erzeugeVizVorschauFlyout()-Hilfsfunktion unten wird sowohl von der
//     PERMANENTEN Bereichs-Leiste (erzeugeBereichsLeisteFuerTab()) als auch
//     von der VERSCHACHTELTEN Vorschau innerhalb des "Visualisierungen"-
//     Hover-Flyouts aus (1) wiederverwendet - dadurch funktioniert Punkt 3
//     ("von jeder beliebigen Stelle in der App aus") automatisch auch dort:
//     Hover "Visualisierungen" (von z.B. Bestand aus) -> Vorschau-Bereichs-
//     Leiste erscheint -> Hover eines ihrer Einträge -> dessen Visualisierungs-
//     Tab-Flyout erscheint verschachtelt darunter.
//
// Fünf Tabs: Bestand (Galerie -> Flyout-Tab-Leiste, siehe oben - kein
// automatischer Sprung zur Primäransicht mehr), Visualisierungen
// (Bereichs-Leiste -> Archivalientyp -> bei `hatGalerie` dasselbe
// Galerie/Flyout-Muster, sonst weiterhin Primäransicht + Ansicht wechseln),
// Führungen/Literatur/Über (Abschnitt 4.3-4.5) sind vorerst klar gekennzeichnete
// Platzhalterseiten, siehe renderPlatzhalterTab() - explizit so vereinbart
// (Führungen: keine Datentabelle vorhanden; Literatur: Datentabelle vorhanden,
// aber noch kein Anzeige-Modul, Abschnitt 2 "Content-driven, mit Einschränkung";
// Über: Inhalt noch nicht verfasst).
//
// LAZY LOADING (Abschnitt 2): jedes Visualisierungsmodul wird erst per
// dynamischem import() geladen, wenn seine Ansicht erstmals aufgerufen wird -
// nie beim Start. Die Modul-Pfade aus archivalienRegistry.js sind relativ zu
// js/config/ notiert; da js/core/ und js/config/ Geschwisterordner auf
// derselben Ebene unter js/ sind, lösen sich dieselben "../viz/xxx.js"-Pfade
// von hier aus identisch auf - keine gesonderte Pfadauflösung nötig.
//
// WETTLAUF-SCHUTZ (wichtig für den Speicherleck-Test bei schnellem Wechsel,
// z.B. mehrfach zwischen Personennetzwerk und anderen Ansichten): ein
// generation-Zähler wird bei jedem vollständigen Tab-Neuaufbau erhöht. Jede
// asynchrone Ladefunktion merkt sich ihre eigene Generation beim Start und
// bricht nach jedem await ab, falls zwischenzeitlich ein neuerer Tab-Aufbau
// begonnen hat - so wird nie in einen bereits abgebauten Container gerendert
// und nie eine Visualisierung (inkl. laufender Force-Simulation) an einer
// bereits verworfenen Stelle neu erzeugt, ohne dass ihr destroy() je aufgerufen
// werden könnte.
//
// LEICHTGEWICHTIGER ANSICHTSWECHSEL vs. VOLLSTÄNDIGER TAB-NEUAUFBAU: wechselt
// nur die Ansicht innerhalb desselben Tabs/Archivalientyps (Dropdown, Browser-
// Zurück/Vor auf eine Nachbar-Route), wird NICHT der ganze Tab abgebaut,
// sondern nur ansichtWechseln.wechsleZu() erneut aufgerufen (dieselbe
// Bauteil-Instanz bleibt bestehen). Das ist nicht nur eine Optimierung, sondern
// notwendig: ohne diese Unterscheidung würde navigiereZu() innerhalb von
// ladeModulUndRender() einen hashchange auslösen, der wiederum denselben
// Ansichtswechsel ein zweites Mal anstößt (jeder Wechsel würde doppelt rendern).
//
// RESIZE-VERDRAHTUNG (Abschnitt 5: resize() "passt die Darstellung an eine
// veränderte Bildschirmgröße an"): ein einziger, debounced window-resize-
// Listener ruft resize() ohne Argumente auf dem gerade aktiven Modul auf - jedes
// Modul liest dabei intern frisch container.clientWidth (bzw. bei karte.js/
// verbindungskarte.js/bipartiteFlowMap.js speziell Leaflets invalidateSize()),
// app.js muss keine expliziten Maße kennen. Debounce (200ms) verhindert, dass
// beim Ziehen am Fensterrand bei jedem einzelnen resize-Ereignis neu gerendert
// wird. Derselbe generation-Zähler wie beim Lade-Wettlauf schützt davor, nach
// einem Tab-Wechsel während der Debounce-Pause noch in ein bereits verlassenes
// Modul hinein zu resizen: die Generation wird beim jeweils LETZTEN rohen
// resize-Ereignis vor der Pause festgehalten und beim tatsächlichen Aufruf
// (nach der Pause) gegen den dann aktuellen Stand geprüft.

import { starteRouter, navigiereZu, aktuelleRoute } from './router.js';
import { getZustand, getDatenCacheEintrag, setDatenCacheEintrag, setUnsicherheitModus } from './state.js';
import { ladeCSV } from './dataLoader.js';
import { erzeugeAnsichtWechseln } from './ansichtWechseln.js';
import { erzeugeUnsicherheitsButton } from './unsicherheitsButton.js';
import { erzeugeStartseite } from './startseite.js';
import { erzeugeBereichsLeiste, erzeugeBereichsLeistenVorschau } from './bereichsLeiste.js';
import { erzeugeVisualisierungsGalerie } from './visualisierungsGalerie.js';
import { erzeugeFlyoutPanel, verankereFlyout, verankereVorschauFlyout, verankereIconFlyout, fuegeFlyoutStyleEin } from './visualisierungsTabs.js';
import { BESTAND_ANSICHTEN, ARCHIVALIENTYPEN } from '../config/archivalienRegistry.js';
import { verarbeiteDatensatzAufruf } from '../utils/datensatzAufruf.js';

// Abschnitt 4.2: Personennetzwerk/Gantt-Diagramm werden auch auf kleinen
// Bildschirmen geladen, aber mit sichtbarem Hinweis versehen. Schwellenwert ist
// eine bewusste, im Masterprompt nicht exakt vorgegebene Auslegung von "kleiner
// Bildschirm" (siehe Zusammenfassung an den Nutzer).
const KLEINER_BILDSCHIRM_SCHWELLE = 700;
const GROSSBILDSCHIRM_ANSICHTEN = new Set(['personennetzwerk', 'ganttDiagramm']);

const contentRoot = document.getElementById('app-content');
const navLinks = Array.from(document.querySelectorAll('.haupt-navigation a[data-tab]'));

let generation = 0;
let aktuellerKontext = null; // { tab, typ?, ansichtId?, ansichtWechseln?, aktuellesVizModul?, destroy() }

function erzeugeUnterContainer(klasse) {
  const div = document.createElement('div');
  div.className = klasse;
  contentRoot.appendChild(div);
  return div;
}

function erzeugeKleinerBildschirmHinweis() {
  const hinweis = document.createElement('p');
  hinweis.className = 'kleiner-bildschirm-hinweis';
  hinweis.setAttribute('role', 'status');
  hinweis.hidden = true;
  contentRoot.appendChild(hinweis);
  return hinweis;
}

function aktualisiereKleinerBildschirmHinweis(hinweisElement, ansichtId) {
  const brauchtHinweis = GROSSBILDSCHIRM_ANSICHTEN.has(ansichtId) && window.innerWidth < KLEINER_BILDSCHIRM_SCHWELLE;
  hinweisElement.hidden = !brauchtHinweis;
  hinweisElement.textContent = brauchtHinweis ? 'Diese Ansicht ist für größere Bildschirme optimiert.' : '';
}

// state.js' datenCache (Abschnitt 7) hält bereits geladene CSV-Records fest, damit
// wiederholtes Wechseln zwischen Ansichten desselben Archivalientyps (z.B. mehrfach
// hin und her zum Personennetzwerk) nicht jedes Mal neu lädt/parst.
async function ladeGecachteCSV(pfad) {
  const gecacht = getDatenCacheEintrag(pfad);
  if (gecacht) return gecacht;
  const { records } = await ladeCSV(pfad);
  setDatenCacheEintrag(pfad, records);
  return records;
}

// AUFTRAG "Neue Kacheln Bürgerbuch/Verlassenschaften/Personen": archivalienRegistry.js'
// `datenDatei` ist bei den meisten Archivalientypen weiterhin ein einzelner
// Pfad-String (unverändertes Verhalten, ein ladeGecachteCSV()-Aufruf) - bei
// `personen` aber ein Objekt aus zwei gemeinsam benötigten Quellen
// (`{ familien: 'data/familien.csv', personenliste: 'data/personenliste.csv' }`,
// siehe dortiger Kommentar). Diese Funktion erweitert das bisherige
// Ein-Datei-Laden rückwärtskompatibel: ein String lädt weiterhin GENAU EINE
// Records-Liste (unverändert für `urkunden`), ein Objekt lädt jeden Pfad
// einzeln (weiterhin über denselben ladeGecachteCSV()/datenCache-Mechanismus,
// also ebenfalls pro Pfad zwischengespeichert) und liefert ein gleich
// benanntes Objekt aus Records-Listen zurück (`{ familien: [...], personenliste:
// [...] }`) - das künftige Personen-Modul liest die beiden Listen darüber
// unter denselben Schlüsseln wieder aus, ohne dass app.js irgendetwas über
// deren fachlichen Inhalt wissen muss.
async function ladeArchivalienDaten(datenDatei) {
  if (typeof datenDatei === 'string') return ladeGecachteCSV(datenDatei);
  const eintraege = await Promise.all(
    Object.entries(datenDatei).map(async ([schluessel, pfad]) => [schluessel, await ladeGecachteCSV(pfad)])
  );
  return Object.fromEntries(eintraege);
}

function aktualisiereNavHervorhebung(tab) {
  navLinks.forEach((link) => {
    if (link.dataset.tab === tab) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function raeumeSeiteAuf() {
  generation += 1;
  if (aktuellerKontext) {
    aktuellerKontext.destroy();
    aktuellerKontext = null;
  }
  contentRoot.innerHTML = '';
}

function ermittleVisualisierungenAnsichtId(archivalientyp) {
  const route = aktuelleRoute();
  const ansichtParam = route.segmente[1];
  return archivalientyp.ansichten.some((a) => a.id === ansichtParam) ? ansichtParam : archivalientyp.primaeransicht;
}

// FOLGEAUFTRAG "...Galerie-Muster für Bestand", Punkt 2: Bestand bekommt
// dasselbe Galerie+Flyout-Muster wie Urkunden (siehe Dateikopf-Kommentar) -
// baut nur noch den generischen kontext und übergibt ihn an dieselben
// gemeinsamen Funktionen weiter unten (erzeugeGalerieFlyoutKontext() etc.),
// die vormals nur für den `hatGalerie`-Zweig von renderVisualisierungenTab()
// existierten. `bereich` ist bewusst ein eigenes, schlankes Objekt statt
// eines Eintrags in ARCHIVALIENTYPEN - Bestand ist kein Archivalientyp (kein
// Unterreiter einer Bereichs-Leiste), sondern ein eigener Top-Level-Tab.
function renderBestandTab() {
  const bereich = { label: 'Bestand', ansichten: BESTAND_ANSICHTEN, datenDatei: 'data/bestandsverzeichnis.csv' };
  const ausloeser = document.querySelector('.haupt-navigation a[data-tab="bestand"]');
  const kontext = erzeugeGalerieFlyoutKontext({
    tab: 'bestand',
    bereich,
    ausloeser,
    routeSegmente: (id) => (id ? ['bestand', id] : ['bestand']),
    ermittleAnsichtId: (route) => route.segmente[0],
    zusaetzlichBeimZerstoeren: () => {},
    // Siehe erzeugeGalerieFlyoutKontext()s Kommentar zu eigenerFlyoutNoetig:
    // der "Bestand"-Link hat über verankereHauptnavFlyouts() bereits einen
    // permanenten, globalen Flyout (Punkt 2) - ein zweiter, kontext-eigener
    // hier würde sich mit dessen Klick-Verhalten beißen.
    eigenerFlyoutNoetig: false
  });
  aktuellerKontext = kontext;
  return aktualisiereGalerieFlyoutAnsicht(kontext);
}

// Punkt 1 (siehe Dateikopf-Kommentar): die Bereichs-Leiste wird IMMER
// erzeugt, sobald renderVisualisierungenTab() läuft - unabhängig davon, ob
// bereits ein Archivalientyp gewählt ist (Akzeptanzkriterium: "bleibt beim
// Navigieren... durchgehend sichtbar"). Eigene kleine Hilfsfunktion, weil sie
// von allen drei Zweigen unten (kein Typ / Galerie / Einzel-Visualisierung)
// gleichermaßen gebraucht wird.
// FOLGEAUFTRAG "Hover-Flyouts in der Hauptnavigation", Punkt 3: Tab-Liste für
// einen Bereich, unabhängig von einem laufenden kontext (die hier gebauten
// Vorschau-Flyouts zeigen nie eine "aktive" Ansicht - der Bereich ist ja
// gerade NICHT der aktuell offene, siehe erzeugeVizVorschauFlyout() unten).
// "Übersicht" nur bei hatGalerie (ergibt sonst keinen Sinn - ohne Galerie
// gibt es auch keine "Übersicht", zu der man zurückkehren könnte).
function baueVizVorschauTabs(archivalientyp) {
  const tabs = archivalientyp.ansichten.map((a) => ({ id: a.id, label: a.label }));
  return archivalientyp.hatGalerie ? [{ id: null, label: 'Übersicht', istUebersicht: true }, ...tabs] : tabs;
}

function baueVizRoute(archivalientyp, id) {
  return id ? ['visualisierungen', archivalientyp.typ, id] : ['visualisierungen', archivalientyp.typ];
}

// Verankert einen reinen Hover-Flyout (visualisierungsTabs.js'
// verankereVorschauFlyout(), kein Klick-Toggle am Auslöser - siehe dortiger
// Dateikopf-Kommentar) an `link` für `archivalientyp`. Punkt 3: wird für
// JEDEN NICHT-aktiven Bereichs-Leiste-Eintrag aufgerufen (siehe
// bereichsLeiste.js' baueBereichsPillen()) - sowohl von der PERMANENTEN
// Bereichs-Leiste (erzeugeBereichsLeisteFuerTab() unten) als auch von deren
// Vorschau-Kopie im "Visualisierungen"-Hauptnav-Flyout
// (verankereHauptnavFlyouts() weiter unten). `zusaetzlichSchliessen`:
// optional, nur von Letzterer übergeben - schließt zusätzlich den äußeren
// Hauptnav-Flyout, wenn innerhalb dessen verschachtelter Vorschau ein
// Eintrag angeklickt wird (sonst bliebe der äußere Flyout nach der
// Navigation sichtbar offen stehen).
function erzeugeVizVorschauFlyout(link, archivalientyp, zusaetzlichSchliessen) {
  return verankereVorschauFlyout(link, {
    tabs: baueVizVorschauTabs(archivalientyp),
    onAktivieren: (id) => {
      navigiereZu(baueVizRoute(archivalientyp, id));
      zusaetzlichSchliessen?.();
    }
  });
}

function erzeugeBereichsLeisteFuerTab(aktiverTyp) {
  const bereichsLeisteContainer = erzeugeUnterContainer('bereichs-leiste-bereich');
  return erzeugeBereichsLeiste(bereichsLeisteContainer, {
    aktiverTyp,
    onAuswahl: (typ) => {
      // FOLGEAUFTRAG "...Hover/Klick-Flyout...": ein Klick auf den BEREITS
      // aktiven `hatGalerie`-Bereich navigiert NICHT mehr (das war (42)s
      // Verhalten) - stattdessen übernimmt jetzt der an genau diesem Link
      // verankerte Flyout (visualisierungsTabs.js' verankereFlyout(), siehe
      // erzeugeGalerieFlyoutKontext() unten) den Klick über seinen eigenen,
      // separat registrierten Listener (inkl. eigenem preventDefault()) -
      // beide Listener hängen am selben <a>-Element, ohne diese Bedingung
      // würde ein Klick auf "Urkunden" während der Flyout geöffnet werden
      // soll gleichzeitig auch noch zur Galerie navigieren (Route-Wechsel
      // würde den gerade erst geöffneten Flyout sofort wieder zerstören).
      if (typ.hatGalerie && typ.typ === aktiverTyp) return;
      navigiereZu(typ.hatGalerie ? ['visualisierungen', typ.typ] : ['visualisierungen', typ.typ, typ.primaeransicht]);
    },
    // Punkt 3 (siehe Dateikopf-Kommentar): jeder NICHT-aktive Eintrag bekommt
    // einen eigenen Visualisierungs-Tab-Flyout - bereichsLeiste.js selbst
    // entscheidet, den aktiven Link dabei auszusparen (siehe dortiger
    // Kommentar), hier wird nur noch übergeben, WIE so ein Flyout gebaut wird.
    verankereVizFlyout: (link, typ) => erzeugeVizVorschauFlyout(link, typ)
  });
}

async function renderVisualisierungenTab() {
  const meineGeneration = generation;
  const route = aktuelleRoute();
  const archivalientyp = ARCHIVALIENTYPEN.find((a) => a.typ === route.segmente[0]);
  const bereichsLeiste = erzeugeBereichsLeisteFuerTab(archivalientyp?.typ ?? null);

  if (!archivalientyp) {
    const hinweisContainer = erzeugeUnterContainer('visualisierungen-hinweis-bereich');
    const hinweis = document.createElement('p');
    hinweis.className = 'visualisierungen-hinweis';
    hinweis.textContent = 'Bitte oben einen Bereich wählen.';
    hinweisContainer.appendChild(hinweis);
    aktuellerKontext = { tab: 'visualisierungen', typ: null, hatGalerie: false, destroy: () => bereichsLeiste.destroy() };
    return;
  }

  // FOLGEAUFTRAG "...Galerie-Muster für Bestand" (siehe Dateikopf-Kommentar):
  // `hatGalerie`-Archivalientypen (aktuell nur `urkunden`) bekommen ab hier
  // einen eigenen, dauerhaften Kontext über dieselbe erzeugeGalerieFlyoutKontext()/
  // aktualisiereGalerieFlyoutAnsicht()-Maschinerie wie Bestand weiter unten.
  if (archivalientyp.hatGalerie) {
    const kontext = erzeugeGalerieFlyoutKontext({
      tab: 'visualisierungen',
      typ: archivalientyp.typ,
      hatGalerie: true,
      bereich: archivalientyp, // hat bereits {label, ansichten, datenDatei} - passt direkt
      ausloeser: bereichsLeiste.aktiverLink,
      routeSegmente: (id) => (id ? ['visualisierungen', archivalientyp.typ, id] : ['visualisierungen', archivalientyp.typ]),
      ermittleAnsichtId: (route) => route.segmente[1],
      zusaetzlichBeimZerstoeren: () => bereichsLeiste.destroy()
    });
    aktuellerKontext = kontext;
    aktualisiereGalerieFlyoutAnsicht(kontext);
    return;
  }

  const unsicherheitsContainer = erzeugeUnterContainer('werkzeugleiste-unsicherheit');
  const wechselnContainer = erzeugeUnterContainer('werkzeugleiste-wechseln');
  const kleinerBildschirmHinweis = erzeugeKleinerBildschirmHinweis();
  const vizContainer = erzeugeUnterContainer('viz-inhalt');

  const records = await ladeArchivalienDaten(archivalientyp.datenDatei);
  if (meineGeneration !== generation) return;

  const kontext = {
    tab: 'visualisierungen',
    typ: archivalientyp.typ,
    hatGalerie: archivalientyp.hatGalerie,
    archivalientyp,
    ansichtId: null,
    ansichtWechseln: null,
    aktuellesVizModul: null,
    kleinerBildschirmHinweis,
    destroy() {}
  };
  aktuellerKontext = kontext;

  // KORREKTUR (siehe CHANGELOG): resize() statt render(), wie in renderBestandTab()
  // oben - identischer Fehler, identische Behebung.
  const unsicherheitsButton = erzeugeUnsicherheitsButton(unsicherheitsContainer, {
    onToggle: (aktiv) => kontext.aktuellesVizModul?.resize({ showUncertainty: aktiv })
  });

  async function ladeModulUndRender(eintrag) {
    const mod = await import(eintrag.modulPfad);
    if (meineGeneration !== generation) return null;
    unsicherheitsButton.setzeZurueck();
    aktualisiereKleinerBildschirmHinweis(kleinerBildschirmHinweis, eintrag.id);
    // KLEINAUFTRAG "Familienbaum & Personenliste in die Registry unter
    // 'Personen' umhängen": `records` ist bei Archivalientypen mit mehreren
    // Quellen (aktuell nur `personen`, siehe archivalienRegistry.js/
    // ladeArchivalienDaten()) ein Objekt aus mehreren Records-Listen, nicht
    // eine einzelne flache Liste - einzelne Ansichten (familienbaum.js/
    // personenliste.js/bubbleChart.js) erwarten aber weiterhin genau EINE
    // flache Liste ihrer eigenen Quelle (Nicht-Ziel: keine Änderung an
    // diesen Modulen selbst). eintrag.datenSchluessel (optional, von der
    // jeweiligen Ansicht in der Registry gesetzt) wählt daher hier den
    // passenden Teil aus - ohne datenSchluessel (alle übrigen Ansichten)
    // bleibt das Verhalten exakt wie zuvor (records unverändert durchgereicht).
    const datenFuerModul = eintrag.datenSchluessel ? records[eintrag.datenSchluessel] : records;
    mod.render(vizContainer, datenFuerModul, { showUncertainty: getZustand().unsicherheitModusAktiv });
    kontext.ansichtId = eintrag.id;
    kontext.aktuellesVizModul = mod;
    navigiereZu(['visualisierungen', archivalientyp.typ, eintrag.id]);
    return mod;
  }

  const ansichtWechseln = erzeugeAnsichtWechseln(wechselnContainer, {
    ansichten: archivalientyp.ansichten,
    aktuelleAnsichtId: ermittleVisualisierungenAnsichtId(archivalientyp),
    ladeModulUndRender
  });
  kontext.ansichtWechseln = ansichtWechseln;
  kontext.destroy = () => {
    ansichtWechseln.destroy();
    unsicherheitsButton.destroy();
    bereichsLeiste.destroy();
  };

  await ansichtWechseln.wechsleZu(ermittleVisualisierungenAnsichtId(archivalientyp));
}

// ---------------------------------------------------------------------------
// FOLGEAUFTRAG "Visualisierungs-Tab-Leiste als Hover/Klick-Flyout + Galerie-
// Muster für Bestand" (siehe Dateikopf-Kommentar für die Verallgemeinerung):
// alles unterhalb bedient sowohl Urkunden (renderVisualisierungenTab()s
// hatGalerie-Zweig) als auch Bestand (renderBestandTab()) über denselben
// generischen `kontext` (kontext.bereich/routeSegmente/ermittleAnsichtId/
// ausloeser). Zwei Anzeige-Zustände (kontext.modus): 'galerie' (eigene
// Vollbild-Seite) und 'viz' (Flyout-Auslöser aktiv + eine Visualisierung -
// der Flyout selbst ist standardmäßig eingeklappt, siehe visualisierungsTabs.js'
// verankereFlyout()). aktualisiereGalerieFlyoutAnsicht() ist der EINZIGE
// Einstiegspunkt von außen (erstes Rendern UND jede spätere Routenänderung,
// siehe handleRouteChange()).
// ---------------------------------------------------------------------------

// kontext-Felder, die für Urkunden UND Bestand identisch aussehen - baut nur
// das Objekt, ruft aber (bewusst) noch NICHT aktualisiereGalerieFlyoutAnsicht()
// auf (das erledigt jeder Aufrufer selbst, direkt nachdem er aktuellerKontext
// gesetzt hat).
function erzeugeGalerieFlyoutKontext({ tab, typ, hatGalerie, bereich, ausloeser, routeSegmente, ermittleAnsichtId, zusaetzlichBeimZerstoeren, eigenerFlyoutNoetig = true }) {
  const kontext = {
    tab,
    typ,
    hatGalerie,
    bereich,
    ausloeser,
    routeSegmente,
    ermittleAnsichtId,
    // FOLGEAUFTRAG "Hover-Flyouts in der Hauptnavigation": SELBST GEFUNDENER
    // KONFLIKT (live beim Testen entdeckt, siehe Selbstauskunft/CHANGELOG):
    // Bestands `ausloeser` ist derselbe Hauptnav-Link, den
    // verankereHauptnavFlyouts() unten bereits PERMANENT mit einem eigenen,
    // globalen Icon-Flyout verankert (Punkt 2) - stelleVizFlyoutSicher()
    // würde ohne dieses Flag zusätzlich noch den alten, aus (44) stammenden
    // Live-Flyout (verankereFlyout(), klickt/togglet MIT preventDefault) an
    // GENAU DENSELBEN Link hängen: zwei unabhängige Klick-Listener auf einem
    // Element, deren zweiter jeden Klick auf "Bestand" abfing (preventDefault)
    // und damit die in Punkt 2 geforderte normale Navigation zur Galerie-
    // Seite verhinderte. Bei Urkunden & Co. tritt der Konflikt NICHT auf: der
    // aktive Bereichs-Leiste-Eintrag ist ein ANDERES Element als der
    // "Visualisierungen"-Hauptnav-Link. eigenerFlyoutNoetig:false (nur von
    // renderBestandTab() gesetzt) lässt stelleVizFlyoutSicher() diesen
    // zusätzlichen, konfliktträchtigen Flyout-Aufbau für Bestand komplett
    // aus - der permanente Icon-Flyout aus Punkt 2 übernimmt dessen Aufgabe
    // ohnehin vollständig (und mit Icons sogar besser).
    eigenerFlyoutNoetig,
    modus: null, // 'galerie' | 'viz' | null (vor dem ersten Aufbau)
    ansichtId: null, // null = Galerie aktiv, sonst id der aktiven Visualisierung
    records: null, // einmal geladen (siehe wechsleZuAnsicht()), für alle Ansichten dieses Bereichs wiederverwendet
    wirdGewechselt: false, // Wettlauf-Schutz, wie ansichtWechseln.js' wirdGewechselt
    galerie: null,
    galerieContainer: null,
    flyout: null,
    unsicherheitsButton: null,
    kleinerBildschirmHinweis: null,
    vizContainer: null,
    aktuellesVizModul: null,
    destroy() {
      kontext.aktuellesVizModul?.destroy();
      kontext.aktuellesVizModul = null;
      kontext.galerie?.destroy();
      kontext.flyout?.destroy();
      kontext.unsicherheitsButton?.destroy();
      kontext.galerieContainer?.remove();
      kontext.kleinerBildschirmHinweis?.remove();
      kontext.vizContainer?.remove();
      zusaetzlichBeimZerstoeren();
    }
  };
  return kontext;
}

function raeumeGalerieAuf(kontext) {
  if (kontext.modus !== 'galerie') return;
  kontext.galerie?.destroy();
  kontext.galerieContainer?.remove();
  kontext.galerie = null;
  kontext.galerieContainer = null;
  kontext.modus = null;
}

function zeigeGalerie(kontext) {
  if (kontext.modus === 'galerie') return;
  raeumeVizAnsichtAuf(kontext); // Flyout wird mit abgebaut (siehe dort) - auf der Galerie-Seite gibt es keinen Auslöser-Kontext
  kontext.modus = 'galerie';
  const galerieContainer = erzeugeUnterContainer('galerie-bereich');
  kontext.galerieContainer = galerieContainer;
  kontext.galerie = erzeugeVisualisierungsGalerie(galerieContainer, {
    archivalientyp: kontext.bereich, // {label, ansichten} - erzeugeVisualisierungsGalerie() kennt nur diese Form, nicht den Namen "archivalientyp"
    onAuswahl: (ansicht) => navigiereZu(kontext.routeSegmente(ansicht.id))
  });
}

// Baut Werkzeugleiste/Viz-Container/Flyout einmalig auf, sobald erstmals eine
// Visualisierung geöffnet wird - bleiben danach bestehen, solange man
// innerhalb dieses Bereichs zwischen Visualisierungen wechselt (nur
// wechsleZuAnsicht() unten tauscht das aktive Modul + aktualisiert den
// Flyout-Inhalt über dessen eigenes aktualisiere()).
function stelleVizFlyoutSicher(kontext) {
  if (kontext.modus === 'viz') return;
  raeumeGalerieAuf(kontext);
  kontext.modus = 'viz';
  const unsicherheitsContainer = erzeugeUnterContainer('werkzeugleiste-unsicherheit');
  kontext.kleinerBildschirmHinweis = erzeugeKleinerBildschirmHinweis();
  kontext.vizContainer = erzeugeUnterContainer('viz-inhalt');
  kontext.unsicherheitsButton = erzeugeUnsicherheitsButton(unsicherheitsContainer, {
    onToggle: (aktiv) => kontext.aktuellesVizModul?.resize({ showUncertainty: aktiv })
  });
  // Siehe kontext.eigenerFlyoutNoetig-Kommentar in erzeugeGalerieFlyoutKontext()
  // oben: für Bestand bewusst ausgelassen (permanenter Icon-Flyout aus Punkt 2
  // sitzt bereits am selben Auslöser).
  if (kontext.eigenerFlyoutNoetig) {
    kontext.flyout = verankereFlyout(kontext.ausloeser, {
      tabs: baueTabListe(kontext),
      aktiverId: kontext.ansichtId,
      onAktivieren: (id) => navigiereZu(kontext.routeSegmente(id))
    });
  }
}

function baueTabListe(kontext) {
  return [
    { id: null, label: 'Übersicht', istUebersicht: true },
    ...kontext.bereich.ansichten.map((a) => ({ id: a.id, label: a.label }))
  ];
}

function raeumeVizAnsichtAuf(kontext) {
  if (kontext.modus !== 'viz') return;
  kontext.aktuellesVizModul?.destroy();
  kontext.aktuellesVizModul = null;
  kontext.flyout?.destroy();
  kontext.unsicherheitsButton?.destroy();
  kontext.kleinerBildschirmHinweis?.remove();
  kontext.vizContainer?.remove();
  kontext.flyout = null;
  kontext.unsicherheitsButton = null;
  kontext.kleinerBildschirmHinweis = null;
  kontext.vizContainer = null;
  kontext.ansichtId = null;
  kontext.modus = null;
}

// Punkt 2 (Single-Select, wie ansichtWechseln.js' wechsleZu()): schon aktiv
// -> nichts zu tun. Sonst laden (Daten einmalig gecacht, siehe
// kontext.records), altes Modul zerstören, neues rendern. wirdGewechselt
// schützt wie in ansichtWechseln.js gegen überlappende Wechsel.
async function wechsleZuAnsicht(kontext, eintrag) {
  if (kontext.ansichtId === eintrag.id) return;
  if (kontext.wirdGewechselt) return;
  kontext.wirdGewechselt = true;
  const meineGeneration = generation;
  try {
    if (!kontext.records) {
      kontext.records = await ladeArchivalienDaten(kontext.bereich.datenDatei);
      if (meineGeneration !== generation) return;
    }
    const mod = await import(eintrag.modulPfad);
    if (meineGeneration !== generation) return;

    if (kontext.aktuellesVizModul) {
      try { kontext.aktuellesVizModul.destroy(); } finally { kontext.aktuellesVizModul = null; }
    }
    setUnsicherheitModus(false); // Abschnitt 11, wie ansichtWechseln.js: setzt sich bei jedem Wechsel zurück
    kontext.unsicherheitsButton.setzeZurueck();

    // KLEINAUFTRAG "Familienbaum & Personenliste...": siehe identischer
    // Kommentar in renderVisualisierungenTab()'s ladeModulUndRender() oben.
    const datenFuerModul = eintrag.datenSchluessel ? kontext.records[eintrag.datenSchluessel] : kontext.records;
    mod.render(kontext.vizContainer, datenFuerModul, { showUncertainty: false });

    kontext.ansichtId = eintrag.id;
    kontext.aktuellesVizModul = mod;
    aktualisiereKleinerBildschirmHinweis(kontext.kleinerBildschirmHinweis, eintrag.id);
    kontext.flyout?.aktualisiere({ tabs: baueTabListe(kontext), aktiverId: kontext.ansichtId });
  } finally {
    kontext.wirdGewechselt = false;
  }
}

// Einziger Einstiegspunkt (siehe Kommentar oben): liest die aktuelle Route
// und stellt sicher, dass genau der dazu passende Anzeige-Zustand (Galerie
// oder eine bestimmte aktive Visualisierung) gezeigt wird.
async function aktualisiereGalerieFlyoutAnsicht(kontext) {
  const route = aktuelleRoute();
  const eintrag = kontext.bereich.ansichten.find((a) => a.id === kontext.ermittleAnsichtId(route));
  if (!eintrag) {
    zeigeGalerie(kontext);
    return;
  }
  stelleVizFlyoutSicher(kontext);
  await wechsleZuAnsicht(kontext, eintrag);
  // AUFTRAG "Fuehrungen, Teil 2b", Punkt 4: einziger Aufrufort fuer JEDE
  // Route zu einer Galerie/Flyout-Ansicht (Bestand UND alle hatGalerie-
  // Archivalientypen, siehe Dateikopf-Kommentar) - deckt damit sowohl den
  // Erstaufbau als auch einen Wechsel INNERHALB derselben Ansicht ab (bei
  // dem wechsleZuAnsicht() oben wegen `kontext.ansichtId === eintrag.id`
  // frueh zurueckkehrt, kontext.aktuellesVizModul aber unveraendert auf dem
  // weiterhin aktiven Modul steht) - ein zweiter datensatz-Link auf
  // dieselbe Ansicht wirkt dadurch trotzdem.
  verarbeiteDatensatzAufruf(kontext.aktuellesVizModul, route);
}

// Führungen/Literatur/Über: klar gekennzeichnete Platzhalter statt stillschweigend
// leerer Seiten (Abschnitt 12/15), bis Daten bzw. Anzeige-Modul vorliegen -
// ausdrücklich mit dem Nutzer so vereinbart für Teil C.
function renderPlatzhalterTab(tab, ueberschrift, hinweistext) {
  const wrapper = document.createElement('div');
  wrapper.className = 'platzhalter-seite';
  const titel = document.createElement('h2');
  titel.textContent = ueberschrift;
  const hinweis = document.createElement('p');
  hinweis.className = 'platzhalter-hinweis';
  hinweis.textContent = hinweistext;
  wrapper.append(titel, hinweis);
  contentRoot.appendChild(wrapper);
  aktuellerKontext = { tab, destroy() {} };
}

// AUFTRAG "Führungen, Teil 2a", Punkt 1: eigener, schlanker Tab-Kontext statt
// der generischen Galerie/Flyout-Maschinerie oben (die ist für "Galerie ->
// eine von mehreren VISUALISIERUNGEN" gebaut - Führungen brauchen "Galerie
// -> genau EINE Station", ein anderes zweites Navigationsziel, siehe
// Selbstauskunft im Chat). `kontext.modul` hält die jeweils aktive
// Untermodul-Instanz (Galerie ODER Station), `aktualisiereFuehrungenAnsicht()`
// entscheidet anhand der Route, welche davon gebraucht wird - Lazy Loading
// (Punkt 1, Auftrag wörtlich): `fuehrungenDaten.js`/die fünf Quell-CSVs
// werden dadurch erst beim ersten Aufruf dieser Funktion geladen, nie beim
// App-Start.
async function aktualisiereFuehrungenAnsicht(kontext) {
  const meineGeneration = generation;
  const route = aktuelleRoute();
  const [fuehrungId, stationNrRoh] = route.segmente;

  // Lazy Loading (Punkt 1, Auftrag wörtlich): dynamischer import() statt
  // statischem Top-of-File-Import - dieselbe Konvention wie bei jedem
  // Visualisierungsmodul (siehe Dateikopf-Kommentar "LAZY LOADING"), hier nur
  // manuell nachgebaut, weil Führungen (anders als die Visualisierungen)
  // nicht über archivalienRegistry.js/ladeModulUndRender() läuft.
  const [{ ladeFuehrungenDaten }, galerieModul, stationModul] = await Promise.all([
    import('../fuehrungen/fuehrungenDaten.js'),
    import('../fuehrungen/fuehrungenGalerie.js'),
    import('../fuehrungen/fuehrungStation.js')
  ]);
  if (meineGeneration !== generation) return; // Tab während des Ladens bereits gewechselt

  kontext.modul?.destroy();
  kontext.container.innerHTML = '';
  kontext.aktuellesVizModul = null; // vor jedem Neuaufbau zurücksetzen, s.u.

  if (!fuehrungId) {
    kontext.modul = await galerieModul.render(kontext.container);
    return;
  }

  const { fuehrungen } = await ladeFuehrungenDaten();
  if (meineGeneration !== generation) return;
  const fuehrung = fuehrungen.find((f) => f.fuehrung_id === fuehrungId);
  const stationNr = Number(stationNrRoh || '1');
  const station = fuehrung?.stationen.find((s) => s.station_nr === stationNr);

  if (!fuehrung || !station) {
    const hinweis = `Führung „${fuehrungId}"${stationNrRoh ? `, Station ${stationNrRoh}` : ''} wurde nicht gefunden.`;
    kontext.modul = await galerieModul.render(kontext.container, { hinweis });
    return;
  }
  kontext.modul = stationModul.render(kontext.container, fuehrung, stationNr);
  // KORREKTURAUFTRAG "Führungen, Teil 2a-K": nur die Stationsansicht braucht
  // die zentrale, 200ms-debouncte resize()-Verdrahtung (fuehrungStation.js
  // misst darüber ihre bildschirmfüllende Höhe neu) - die Galerie oben
  // (kontext.aktuellesVizModul bleibt dort unverändert null) nicht.
  kontext.aktuellesVizModul = kontext.modul;
}

function renderFuehrungenTab() {
  const container = erzeugeUnterContainer('fuehrungen-bereich');
  const kontext = {
    tab: 'fuehrungen',
    container,
    modul: null,
    aktuellesVizModul: null,
    destroy: () => kontext.modul?.destroy()
  };
  aktuellerKontext = kontext;
  aktualisiereFuehrungenAnsicht(kontext);
}

// Startseite (Landingpage, siehe startseite.js): erscheint bei leerem Hash
// (Root-URL) - KEIN sechster Nav-Tab (Nicht-Ziel: Hauptnavigation bleibt bei
// den fünf bestehenden Einträgen unverändert), sondern die Ansicht, die vor
// jeder Tab-Wahl gezeigt wird. Einfachster aller renderXXXTab()-Fälle: keine
// Werkzeugleisten, kein Datenladen, kein Kleiner-Bildschirm-Hinweis - die
// Landingpage braucht nichts davon.
function renderStartTab() {
  // erzeugeUnterContainer() legt hier nur den Platz im DOM an - die Klasse
  // wird sofort von erzeugeStartseite() selbst überschrieben (startseite.js
  // kennt/setzt ihre eigene Wurzel-Klasse, analog zum Baustein-Muster der
  // anderen erzeuge*()-Bausteine).
  const wurzelContainer = erzeugeUnterContainer('startseite-container');
  const startseite = erzeugeStartseite(wurzelContainer);
  aktuellerKontext = { tab: null, destroy: () => startseite.destroy() };
}

function renderTab(tab) {
  if (!tab) return renderStartTab();
  if (tab === 'bestand') return renderBestandTab();
  if (tab === 'visualisierungen') return renderVisualisierungenTab();
  if (tab === 'fuehrungen') return renderFuehrungenTab();
  if (tab === 'literatur') {
    return renderPlatzhalterTab('literatur', 'Literatur', 'Die Datentabelle data/literatur.csv ist vorhanden, aber es existiert noch kein Anzeige-Modul dafür (Abschnitt 2: Content-driven, mit Einschränkung). Erscheint hier, sobald eines gebaut ist.');
  }
  if (tab === 'ueber') {
    return renderPlatzhalterTab('ueber', 'Über', 'Projektbeschreibung, Datengrundlage und Unsicherheitslegende folgen in einer späteren Etappe.');
  }
  return renderPlatzhalterTab(tab || 'bestand', 'Nicht gefunden', 'Diese Adresse konnte keinem Tab zugeordnet werden.');
}

const RESIZE_DEBOUNCE_MS = 200;
let resizeTimeout = null;

// Wird bei JEDEM rohen resize-Ereignis aufgerufen (können sehr viele pro
// Sekunde sein, siehe Auftrag) - hält nur den Timer zurück und merkt sich die
// zu diesem Zeitpunkt aktuelle Generation für den späteren Wettlauf-Check.
function planeResizeVerarbeitung() {
  const meineGeneration = generation;
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => verarbeiteResize(meineGeneration), RESIZE_DEBOUNCE_MS);
}

// Läuft erst 200ms nach dem letzten resize-Ereignis - hier tatsächlich neu
// layouten, nicht bei jedem einzelnen Pixel-Schritt beim Ziehen am Fensterrand.
function verarbeiteResize(meineGeneration) {
  resizeTimeout = null;
  if (meineGeneration !== generation || !aktuellerKontext) return; // Tab während der Pause bereits gewechselt
  if (aktuellerKontext.kleinerBildschirmHinweis) {
    aktualisiereKleinerBildschirmHinweis(aktuellerKontext.kleinerBildschirmHinweis, aktuellerKontext.ansichtId);
  }
  aktuellerKontext.aktuellesVizModul?.resize();
}

function handleRouteChange() {
  const route = aktuelleRoute();
  aktualisiereNavHervorhebung(route.tab);

  if (aktuellerKontext && aktuellerKontext.tab === route.tab) {
    // FOLGEAUFTRAG "...Galerie-Muster für Bestand": Bestand läuft jetzt über
    // dieselbe Galerie/Flyout-Maschinerie wie `hatGalerie`-Archivalientypen
    // weiter unten (kein ansichtWechseln.js mehr, siehe renderBestandTab()) -
    // IMMER aktualisiereGalerieFlyoutAnsicht(), aus demselben Grund wie beim
    // hatGalerie-Fall unten (kein voller Neuaufbau, sonst würde der gerade
    // evtl. offene Flyout mitten in einer Interaktion zerstört).
    if (route.tab === 'bestand') {
      aktualisiereGalerieFlyoutAnsicht(aktuellerKontext);
      contentRoot.focus();
      return;
    }
    // Punkt 1 (siehe aktualisiereFuehrungenAnsicht()): derselbe leichte
    // Update-Pfad wie beim Bestand-Fall oben, statt vollem Tab-Neuaufbau.
    if (route.tab === 'fuehrungen') {
      aktualisiereFuehrungenAnsicht(aktuellerKontext);
      contentRoot.focus();
      return;
    }
    if (route.tab === 'visualisierungen' && !aktuellerKontext.hatGalerie) {
      const typ = route.segmente[0] || null;
      if (aktuellerKontext.typ === typ) {
        if (typ && aktuellerKontext.ansichtWechseln) {
          const ziel = ermittleVisualisierungenAnsichtId(aktuellerKontext.archivalientyp);
          if (ziel !== aktuellerKontext.ansichtId) {
            aktuellerKontext.ansichtWechseln.wechsleZu(ziel);
          }
        }
        contentRoot.focus();
        return; // auch der Fall "weiterhin Kachelauswahl" (typ === null) landet hier, nichts zu tun
      }
    }

    // `hatGalerie`-Kontexte (aktuell nur `urkunden`) nehmen EBENFALLS einen
    // Schnellpfad, solange derselbe Archivalientyp aktiv bleibt - anders als
    // oben aber nicht "nichts zu tun bei unverändertem Ziel", sondern IMMER
    // aktualisiereGalerieFlyoutAnsicht() (Galerie<->Tab-Ansicht-Wechsel UND
    // Tab-zu-Tab-Wechsel laufen beide darüber, siehe dortiger Kommentar) - ein
    // vollständiger raeumeSeiteAuf()+renderTab()-Neuaufbau würde hier auch die
    // Bereichs-Leiste unnötig neu aufbauen (Flackern, Akzeptanzkriterium aus
    // CHANGELOG (39): "durchgehend sichtbar").
    if (route.tab === 'visualisierungen' && aktuellerKontext.hatGalerie) {
      const typ = route.segmente[0] || null;
      if (aktuellerKontext.typ === typ) {
        aktualisiereGalerieFlyoutAnsicht(aktuellerKontext);
        contentRoot.focus();
        return;
      }
    }
  }

  raeumeSeiteAuf();
  renderTab(route.tab);
  contentRoot.focus();
}

// FOLGEAUFTRAG "Hover-Flyouts in der Hauptnavigation" (siehe Dateikopf-
// Kommentar): einmalig, unabhängig vom aktuellen Tab/Kontext - die beiden
// Hauptnav-Links selbst werden nie entfernt/neu erzeugt (index.html), daher
// kein destroy()/keine Wiederholung bei jedem render*Tab() nötig, anders als
// alle bisherigen Flyout-Verankerungen dieses Projekts.
function verankereHauptnavFlyouts() {
  const vizLink = document.querySelector('.haupt-navigation a[data-tab="visualisierungen"]');
  let vorschauHandle = null;
  const vizFlyout = erzeugeFlyoutPanel(vizLink, {
    klasse: 'visualisierungs-tabs-flyout',
    rendereInhalt: (panel) => {
      // Vorherige Vorschau-Instanz (samt ihrer eigenen, verschachtelten
      // Punkt-3-Flyouts) erst abbauen - sonst sammeln sich bei jedem
      // erneuten Öffnen weitere, in <body> verwaiste Flyout-Panels an
      // (erzeugeBereichsLeistenVorschau()s eigenes destroy() räumt genau
      // das aktuell offene Set aber vollständig ab, siehe dortiger Kommentar).
      vorschauHandle?.destroy();
      // WICHTIG: erzeugeBereichsLeistenVorschau() leert `panel` selbst als
      // ERSTES (eigener "container.innerHTML=''"-Baustein-Vertrag, siehe
      // bereichsLeiste.js) - fuegeFlyoutStyleEin() muss deshalb ERST DANACH
      // laufen, sonst würde ihr eigener <style>-Block sofort wieder mit
      // gelöscht (führte live zu einem unsichtbaren, unpositionierten Panel:
      // .visualisierungs-tabs-flyout's position:fixed/Größe/Hintergrund
      // fehlte dadurch komplett - selbst gefunden und behoben, siehe
      // Selbstauskunft/CHANGELOG).
      // Nur "aktiv" zeigen, wenn wir GERADE auf Visualisierungen sind -
      // sonst (z.B. Hover von "Bestand" aus) ist kein Bereich aktiv.
      const aktiverTyp = aktuellerKontext?.tab === 'visualisierungen' ? aktuellerKontext.typ : null;
      vorschauHandle = erzeugeBereichsLeistenVorschau(panel, {
        aktiverTyp,
        onAuswahl: (typ) => {
          navigiereZu(typ.hatGalerie ? ['visualisierungen', typ.typ] : ['visualisierungen', typ.typ, typ.primaeransicht]);
          vizFlyout.schliesse();
        },
        // Punkt 3 auch HIER (verschachtelt): siehe Dateikopf-Kommentar -
        // schließt zusätzlich diesen äußeren Flyout, wenn ein Klick in der
        // verschachtelten Vorschau navigiert.
        verankereVizFlyout: (link, typ) => erzeugeVizVorschauFlyout(link, typ, () => vizFlyout.schliesse())
      });
      fuegeFlyoutStyleEin(panel);
    }
  });
  // Punkt 1: Klick auf "Visualisierungen" selbst navigiert normal (kein
  // preventDefault, kein Toggle) - nur den Flyout schließen, damit er nicht
  // über der frisch geladenen, jetzt PERMANENTEN Bereichs-Leiste stehen bleibt.
  vizLink.addEventListener('click', () => vizFlyout.schliesse());

  // Punkt 2: "Bestand" bekommt einen Icon+Name-Flyout mit allen 5
  // Visualisierungen - Klick darin springt DIREKT dorthin (nicht zur
  // Galerie); Klick auf "Bestand" selbst bleibt unverändert (siehe
  // visualisierungsTabs.js' verankereIconFlyout()-Dateikopf-Kommentar).
  const bestandLink = document.querySelector('.haupt-navigation a[data-tab="bestand"]');
  verankereIconFlyout(bestandLink, {
    eintraege: BESTAND_ANSICHTEN.map((a) => ({ id: a.id, label: a.label })),
    onAktivieren: (id) => navigiereZu(['bestand', id])
  });
}
verankereHauptnavFlyouts();

// KORREKTUR (siehe CHANGELOG, Startseite): ein leerer Hash wurde bisher
// unconditional auf '#bestand' umgeleitet (Root-Cause-Befund: es gab bis
// dahin gar keine eigene Startseiten-Route, die Root-URL landete faktisch
// immer direkt im Bestand-Tab). Jetzt bleibt ein leerer Hash leer -
// handleRouteChange()/renderTab(null) zeigt dafür die neue Startseite
// (startseite.js). starteRouter()s eigener interner '#bestand'-Fallback
// betrifft nur den (ohnehin nirgendwo gelesenen) state.js-Wert aktiverTab,
// nicht das tatsächliche Rendering - siehe dortiger Vertrag, hier bewusst
// unverändert gelassen (Nicht-Ziel: keine Änderung an router.js).
starteRouter();
window.addEventListener('hashchange', handleRouteChange);
window.addEventListener('resize', planeResizeVerarbeitung);
handleRouteChange();
