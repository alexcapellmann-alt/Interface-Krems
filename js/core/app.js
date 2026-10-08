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
import { getZustand, setUnsicherheitModus } from './state.js';
import { ladeGecachteCSV } from './datenCache.js';
import { erzeugeAnsichtWechseln } from './ansichtWechseln.js';
import { erzeugeUnsicherheitsButton } from './unsicherheitsButton.js';
import { erzeugeStartseite } from './startseite.js';
import { erzeugeBereichsLeiste, erzeugeBereichsLeistenVorschau } from './bereichsLeiste.js';
import { erzeugeVisualisierungsGalerie } from './visualisierungsGalerie.js';
import { erzeugeFlyoutPanel, verankereFlyout, verankereVorschauFlyout, verankereIconFlyout, fuegeFlyoutStyleEin } from './visualisierungsTabs.js';
import { BESTAND_ANSICHTEN, ARCHIVALIENTYPEN } from '../config/archivalienRegistry.js';
import { verarbeiteDatensatzAufruf } from '../utils/datensatzAufruf.js';
import { initialisiereFortsetzenButton } from '../fuehrungen/fuehrungFortsetzen.js';
import { ladeArchivKonfiguration, konfigurationswert, ladeSeitenBloecke, ersetzePlatzhalterImText } from './archivKonfiguration.js';
import { ladeAnsichtenKonfiguration, wendeAnsichtenKonfigurationAn, istNichtAngeboten, NICHT_ANGEBOTEN_TEXTE } from './ansichtenKonfiguration.js';
import { erzeugeUeberSeite } from './ueberSeite.js';
import { erzeugeLiteraturSeite } from './literaturSeite.js';

// AUFTRAG B2 (Entscheidung "erster Bildaufbau", 2026-10-03): Prüfung,
// Anforderungen und Hinweisbalken (js/core/datenVerfuegbarkeit.js samt
// datenAnforderungen.js/hinweisBalken.js) stehen NICHT im Start-Modulgraphen -
// sie verzögerten dort messbar die erste Darstellung. Nachgeladen per
// dynamischem import(): parallel zu den Daten einer Ansicht (vor deren
// Zeichnen abgewartet) bzw. nach dem ersten Bildaufbau für die Hintergrund-
// Prüfung. Solange das Modul nicht geladen ist, gilt nichts als ausgeblendet.
let pruefModul = null;
let pruefModulLaden = null;
function ladePruefModul() {
  // Alle drei Dateien gleichzeitig anfordern: sonst fordert der Browser die
  // statischen Importe von datenVerfuegbarkeit.js erst an, wenn diese Datei
  // geladen ist - ein zweiter Ladeschritt, der die Treemap bei 100 ms Latenz
  // messbar verzögerte (PROJEKTLOG Eintrag 57). Funktion unverändert.
  if (!pruefModulLaden) {
    pruefModulLaden = Promise.all([
      import('./datenVerfuegbarkeit.js'),
      import('../config/datenAnforderungen.js'),
      import('../utils/hinweisBalken.js')
    ]).then(([m]) => { pruefModul = m; return m; });
  }
  return pruefModulLaden;
}
const istAnsichtAusgeblendet = (ansichtId) => (pruefModul ? pruefModul.istAnsichtAusgeblendet(ansichtId) : false);
const istBereichAusgeblendet = (bereich) => (pruefModul ? pruefModul.istBereichAusgeblendet(bereich) : false);

// Abschnitt 4.2: Personennetzwerk/Gantt-Diagramm werden auch auf kleinen
// Bildschirmen geladen, aber mit sichtbarem Hinweis versehen. Schwellenwert ist
// eine bewusste, im Masterprompt nicht exakt vorgegebene Auslegung von "kleiner
// Bildschirm" (siehe Zusammenfassung an den Nutzer).
const KLEINER_BILDSCHIRM_SCHWELLE = 700;
const GROSSBILDSCHIRM_ANSICHTEN = new Set(['personennetzwerk', 'ganttDiagramm', 'urkundenNetzwerk']); // AUFTRAG G1: urkundenNetzwerk

const contentRoot = document.getElementById('app-content');

// AUFTRAG D, Punkt 1 (axe page-has-heading-one): jede Seite hat genau eine
// <h1> - nur für Hilfsmittel (visuell verborgen, Freigabe des Autors). Text:
// Ansicht und Archiv, z. B. "Zeitachse – Urkunden – Stadtarchiv Krems". Sie
// steht als erstes Element im Hauptbereich und wird nach jedem Leeren des
// Bereichs wieder eingesetzt (raeumeSeiteAuf()).
const seitenueberschrift = document.createElement('h1');
seitenueberschrift.className = 'nur-fuer-hilfsmittel';
seitenueberschrift.id = 'app-seitenueberschrift';

const TAB_NAMEN = { bestand: 'Bestand', visualisierungen: 'Visualisierungen', fuehrungen: 'Führungen', literatur: 'Literatur', ueber: 'Über das Archiv' };

function setzeSeitenueberschrift(teile) {
  const archiv = String(konfigurationswert('archiv_kurzname') || '').trim();
  seitenueberschrift.textContent = [...teile.filter(Boolean), archiv].filter(Boolean).join(' – ');
  if (seitenueberschrift.parentNode !== contentRoot) contentRoot.prepend(seitenueberschrift);
}

// Teile der Überschrift aus der Route: Registry/ansichten.csv für Bereiche und
// Ansichten, fuehrungen.csv für Führungen (Titel, sobald geladen).
function aktualisiereSeitenueberschrift(route) {
  const [a, b] = route.segmente;
  if (!route.tab) return setzeSeitenueberschrift(['Startseite']);
  if (route.tab === 'bestand') {
    return setzeSeitenueberschrift([BESTAND_ANSICHTEN.find((x) => x.id === a)?.label, 'Bestand']);
  }
  if (route.tab === 'visualisierungen') {
    const typ = ARCHIVALIENTYPEN.find((x) => x.typ === a);
    const ansicht = typ?.ansichten.find((x) => x.id === b);
    return setzeSeitenueberschrift(ansicht ? [ansicht.label, typ.label] : [typ?.label, 'Visualisierungen']);
  }
  if (route.tab === 'fuehrungen') {
    const schritt = b === 'ende' ? 'Ende der Führung' : (b ? `Station ${b}` : null);
    setzeSeitenueberschrift(a ? ['Führung', schritt] : ['Führungen']);
    if (!a) return undefined;
    import('../fuehrungen/fuehrungenDaten.js')
      .then((m) => m.ladeFuehrungenDaten())
      .then(({ fuehrungen }) => {
        const titel = fuehrungen.find((f) => f.fuehrung_id === a)?.fuehrung_titel;
        if (titel && aktuelleRoute().segmente[0] === a && aktuelleRoute().segmente[1] === b) setzeSeitenueberschrift([titel, schritt]);
      })
      .catch(() => {});
    return undefined;
  }
  return setzeSeitenueberschrift([TAB_NAMEN[route.tab] || 'Nicht gefunden']);
}
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

// AUFTRAG B2 (Prüfbericht Punkt 3): Hinweisbalken bei Problemen mit den
// Datendateien (js/core/datenVerfuegbarkeit.js entscheidet, was gemeldet wird).
// Über einer Visualisierung: eigener Grid-Bereich (Zeile 3, layout.css), der
// NUR im Problemfall entsteht - mit vollständigen Daten bleibt das DOM gleich.
function setzeVizHinweisBalken(kontext, texte) {
  kontext.hinweisBalkenBereich?.remove();
  kontext.hinweisBalkenBereich = null;
  if (!texte.length) return;
  const bereich = document.createElement('div');
  bereich.className = 'hinweis-balken-bereich';
  bereich.appendChild(pruefModul.erzeugeHinweisBalken(texte));
  contentRoot.insertBefore(bereich, kontext.vizContainer);
  kontext.hinweisBalkenBereich = bereich;
}

// Seiten (Startseite, Über, Literatur, Führungen): Balken als erstes Element
// im Seitencontainer. Kann die Seite nicht angezeigt werden (pruefung.blockiert),
// ersetzt der Balken ihren Inhalt; entferneModul() baut das Seitenmodul ab.
function zeigeSeitenPruefung(container, pruefung, entferneModul) {
  if (!pruefung.texte.length) return;
  if (pruefung.blockiert) {
    entferneModul();
    container.innerHTML = '';
  }
  container.prepend(pruefModul.erzeugeHinweisBalken(pruefung.texte));
}

// state.js' datenCache (Abschnitt 7) hält bereits geladene CSV-Records fest, damit
// wiederholtes Wechseln zwischen Ansichten desselben Archivalientyps (z.B. mehrfach
// hin und her zum Personennetzwerk) nicht jedes Mal neu lädt/parst.
// AUFTRAG B2 (Cache-Umstellung): die bisher hier stehende lokale
// ladeGecachteCSV()-Kopie ist nach js/core/datenCache.js gewandert (gemeinsam
// mit archivKonfiguration.js, siehe dortiger Dateikopf).

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
// AUFTRAG B2: fehlt bei mehreren Quellen EINE Datei, bricht nicht mehr das
// ganze Laden ab (bisher Absturz der Ansicht) - die fehlende Quelle wird als
// leere Liste weitergegeben, pruefeAnsicht() meldet sie im Hinweisbalken bzw.
// sperrt die Ansicht, wenn es eine ihrer Hauptdateien ist.
// AUFTRAG C2: Sobald urkunden.csv zu den Daten gehört, werden die Farben
// unbekannter Kategorien aus der GESAMTEN Datei vergeben (unabhängig von der
// Zeilenreihenfolge), bevor eine Ansicht zeichnet - so nutzen alle Ansichten
// und die Sidebar dieselbe Zuordnung. Das Farbmodul kommt per import()
// gleichzeitig mit den Daten (nicht im Startgraphen, kein zusätzlicher Schritt).
const URKUNDEN_DATEI = 'data/urkunden.csv';

async function ladeArchivalienDaten(datenDatei) {
  const mitUrkunden = typeof datenDatei === 'string' ? datenDatei === URKUNDEN_DATEI : Object.values(datenDatei).includes(URKUNDEN_DATEI);
  const farbModul = mitUrkunden ? import('../utils/urkundenKategorieFarben.js') : null;
  if (typeof datenDatei === 'string') {
    const records = await ladeGecachteCSV(datenDatei);
    if (farbModul) (await farbModul).vergibKategorieFarben(records);
    return records;
  }
  const eintraege = await Promise.all(
    Object.entries(datenDatei).map(async ([schluessel, pfad]) => [schluessel, await ladeGecachteCSV(pfad).catch(() => [])])
  );
  const ergebnis = Object.fromEntries(eintraege);
  if (farbModul) {
    const urkundenSchluessel = Object.keys(datenDatei).find((k) => datenDatei[k] === URKUNDEN_DATEI);
    (await farbModul).vergibKategorieFarben(ergebnis[urkundenSchluessel] || []);
  }
  return ergebnis;
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
  contentRoot.prepend(seitenueberschrift); // AUFTRAG D, Punkt 1
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
  // AUFTRAG B2: Ansichten ohne Daten erscheinen nicht in der Tab-Liste.
  const tabs = archivalientyp.ansichten.filter((a) => !istAnsichtAusgeblendet(a.id)).map((a) => ({ id: a.id, label: a.label }));
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
    verankereVizFlyout: (link, typ) => erzeugeVizVorschauFlyout(link, typ),
    istAusgeblendet: istBereichAusgeblendet // AUFTRAG B2
  });
}

async function renderVisualisierungenTab() {
  const meineGeneration = generation;
  const route = aktuelleRoute();
  const archivalientyp = ARCHIVALIENTYPEN.find((a) => a.typ === route.segmente[0]);
  const bereichsLeiste = erzeugeBereichsLeisteFuerTab(archivalientyp?.typ ?? null);

  if (!archivalientyp) {
    const hinweisContainer = erzeugeUnterContainer('visualisierungen-hinweis-bereich');
    // AUFTRAG C2 (Restpunkt aus C1): direkter Link auf einen Bereich mit anbieten=nein
    if (route.segmente[0] && istNichtAngeboten(route.segmente[0])) {
      const pm = await ladePruefModul();
      if (meineGeneration !== generation) return;
      hinweisContainer.appendChild(pm.erzeugeHinweisBalken([NICHT_ANGEBOTEN_TEXTE.bereich]));
    }
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
    return aktualisiereGalerieFlyoutAnsicht(kontext); // AUFTRAG B2: Promise fuer "erster Bildaufbau"
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
    // AUFTRAG G1: obergrenze aus ansichten.csv (fehlt sie, gilt die Vorgabe des Moduls)
    mod.render(vizContainer, datenFuerModul, { showUncertainty: getZustand().unsicherheitModusAktiv, obergrenze: eintrag.obergrenze });
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
      kontext.hinweisBalkenBereich?.remove(); // AUFTRAG B2
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
  // AUFTRAG B2: Ansichten ohne Daten erscheinen nicht als Kachel; sind alle
  // ausgeblendet (direkter Link auf einen leeren Bereich), steht dort der Balken.
  const sichtbareAnsichten = kontext.bereich.ansichten.filter((a) => !istAnsichtAusgeblendet(a.id));
  if (sichtbareAnsichten.length === 0) {
    // nur erreichbar, wenn etwas ausgeblendet ist - das Prüfmodul ist dann geladen
    galerieContainer.appendChild(pruefModul.erzeugeHinweisBalken(pruefModul.texteFuerLeerenBereich(kontext.bereich)));
    kontext.galerie = null;
    return;
  }
  // AUFTRAG C1, Punkt 1/2: Beschreibungen mit Platzhaltern (z. B. die
  // berechnete Urkundenzahl) stehen zunächst leer und werden nachgetragen,
  // sobald der Wert feststeht - so erscheint nie ein falscher oder roher Text.
  const mitPlatzhalter = (a) => /\{[a-zA-Z0-9_]+\}/.test(a.beschreibung || '');
  kontext.galerie = erzeugeVisualisierungsGalerie(galerieContainer, {
    archivalientyp: { ...kontext.bereich, ansichten: sichtbareAnsichten.map((a) => (mitPlatzhalter(a) ? { ...a, beschreibung: '\u00a0' } : a)) }, // {label, ansichten} - erzeugeVisualisierungsGalerie() kennt nur diese Form, nicht den Namen "archivalientyp"
    onAuswahl: (ansicht) => navigiereZu(kontext.routeSegmente(ansicht.id))
  });
  sichtbareAnsichten.forEach(async (ansicht, index) => {
    if (!mitPlatzhalter(ansicht)) return;
    const text = (await ersetzePlatzhalterImText(ansicht.beschreibung)) ?? ansicht.beschreibungStandard ?? '';
    if (kontext.galerieContainer !== galerieContainer) return; // inzwischen gewechselt
    const ziel = galerieContainer.querySelectorAll('.visualisierungs-galerie-beschreibung')[index];
    if (ziel) ziel.textContent = text;
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
    ...kontext.bereich.ansichten.filter((a) => !istAnsichtAusgeblendet(a.id)).map((a) => ({ id: a.id, label: a.label })) // AUFTRAG B2
  ];
}

function raeumeVizAnsichtAuf(kontext) {
  if (kontext.modus !== 'viz') return;
  kontext.aktuellesVizModul?.destroy();
  kontext.aktuellesVizModul = null;
  kontext.flyout?.destroy();
  kontext.unsicherheitsButton?.destroy();
  kontext.kleinerBildschirmHinweis?.remove();
  kontext.hinweisBalkenBereich?.remove(); // AUFTRAG B2
  kontext.hinweisBalkenBereich = null;
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
    // AUFTRAG B2: Daten und Prüfmodul PARALLEL laden. Fehlt die (einzige)
    // Datei, meldet pruefeAnsicht() das unten im Hinweisbalken, statt dass der
    // Ladefehler die Ansicht abbricht.
    const [records, pm] = await Promise.all([
      kontext.records ? Promise.resolve(kontext.records) : ladeArchivalienDaten(kontext.bereich.datenDatei).catch(() => null),
      ladePruefModul()
    ]);
    kontext.records = records;
    if (meineGeneration !== generation) return;
    // AUFTRAG B2 (Prüfbericht Punkt 3): Pflichtspalten/leere Dateien prüfen,
    // BEVOR das Modul zeichnet - eine gesperrte Ansicht zeigt nur den Balken.
    await pm.stelleDateienSicher(eintrag.id);
    if (meineGeneration !== generation) return;
    const pruefung = pm.pruefeAnsicht(eintrag.id);
    if (pruefung.blockiert || !kontext.records) {
      if (kontext.aktuellesVizModul) {
        try { kontext.aktuellesVizModul.destroy(); } finally { kontext.aktuellesVizModul = null; }
      }
      kontext.vizContainer.innerHTML = '';
      setzeVizHinweisBalken(kontext, pruefung.texte);
      kontext.records = null;
      kontext.ansichtId = eintrag.id;
      kontext.kleinerBildschirmHinweis.hidden = true;
      kontext.flyout?.aktualisiere({ tabs: baueTabListe(kontext), aktiverId: kontext.ansichtId });
      return;
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
    mod.render(kontext.vizContainer, datenFuerModul, { showUncertainty: false, obergrenze: eintrag.obergrenze }); // AUFTRAG G1
    setzeVizHinweisBalken(kontext, pruefung.texte); // AUFTRAG B2: nur bei Problemen in Nebendateien

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
  const ansichtId = kontext.ermittleAnsichtId(route);
  const eintrag = kontext.bereich.ansichten.find((a) => a.id === ansichtId);
  if (!eintrag) {
    zeigeGalerie(kontext);
    // AUFTRAG C2 (Restpunkt aus C1): direkter Link auf eine Ansicht mit
    // anbieten=nein - Hinweisbalken über der Galerie statt stillschweigend.
    if (ansichtId && istNichtAngeboten(kontext.typ ?? 'bestand', ansichtId)) {
      const pm = await ladePruefModul();
      const container = kontext.galerieContainer;
      if (aktuellerKontext === kontext && container && !container.querySelector('.hinweis-balken')) {
        container.prepend(pm.erzeugeHinweisBalken([NICHT_ANGEBOTEN_TEXTE.ansicht]));
      }
    }
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

// Literatur (und der generische "Route nicht gefunden"-Fall): klar
// gekennzeichnete Platzhalter statt stillschweigend leerer Seiten
// (Abschnitt 12/15), bis Daten bzw. Anzeige-Modul vorliegen - ausdrücklich
// mit dem Nutzer so vereinbart für Teil C. "Über" nutzt das seit AUFTRAG
// "Archivspezifische Texte..." NICHT mehr - siehe renderUeberTab() unten.
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

// AUFTRAG "Archivspezifische Texte...", Punkt 2.6: ersetzt den bisherigen
// renderPlatzhalterTab('ueber', ...)-Aufruf durch das neue, aus ueber.csv
// gespeiste Modul (js/core/ueberSeite.js). Lädt asynchron (ueber.csv wird
// laut Punkt 2.1 erst bei Bedarf geladen) - derselbe schlanke
// Tab-Kontext wie renderFuehrungenTab() unten, kontext wird SOFORT
// gesetzt (raeumeSeiteAuf() kann daher sofort destroy() aufrufen, falls
// währenddessen weggenavigiert wird), das eigentliche Modul erst nach
// dem Laden nachgereicht. Wurde der Tab in der Zwischenzeit bereits
// gewechselt (aktuellerKontext !== kontext), wird das inzwischen fertig
// gebaute Modul sofort wieder zerstört statt es unsichtbar leaken zu lassen.
function renderUeberTab() {
  const container = erzeugeUnterContainer('ueber-bereich');
  const kontext = { tab: 'ueber', modul: null, destroy: () => kontext.modul?.destroy() };
  aktuellerKontext = kontext;
  return erzeugeUeberSeite(container).then(async (modul) => {
    if (aktuellerKontext !== kontext) { modul.destroy(); return; }
    kontext.modul = modul;
    // AUFTRAG B2: Hinweisbalken (ueber.csv, Kerndatei archiv.csv)
    const pm = await ladePruefModul();
    await pm.stelleDateienSicher('ueber');
    if (aktuellerKontext !== kontext) return;
    zeigeSeitenPruefung(container, pm.pruefeAnsicht('ueber'), () => { modul.destroy(); kontext.modul = null; });
  });
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
  const [{ ladeFuehrungenDaten, BELEG_QUELLEN }, galerieModul, stationModul, abschlussModul, pm] = await Promise.all([
    import('../fuehrungen/fuehrungenDaten.js'),
    import('../fuehrungen/fuehrungenGalerie.js'),
    import('../fuehrungen/fuehrungStation.js'),
    import('../fuehrungen/fuehrungAbschluss.js'),
    ladePruefModul() // AUFTRAG B2: Prüfmodul parallel, nicht im Startgraphen
  ]);
  if (meineGeneration !== generation) return; // Tab während des Ladens bereits gewechselt

  // AUFTRAG B2 (Prüfbericht Punkt 3): fuehrungen.csv vor dem Aufbau prüfen -
  // fehlt sie, ist sie leer, unlesbar oder fehlt eine Pflichtspalte, steht dort
  // nur der Hinweisbalken (bisher leere Übersicht bzw. "nicht gefunden").
  const pruefAnsicht = !fuehrungId ? 'fuehrungenUebersicht' : (stationNrRoh === 'ende' ? 'fuehrungAbschluss' : 'fuehrungStation');
  await pm.stelleDateienSicher(pruefAnsicht);
  if (meineGeneration !== generation) return;
  const vorabPruefung = pm.pruefeAnsicht(pruefAnsicht);

  kontext.modul?.destroy();
  kontext.container.innerHTML = '';
  kontext.aktuellesVizModul = null; // vor jedem Neuaufbau zurücksetzen, s.u.

  if (vorabPruefung.blockiert) {
    kontext.modul = null;
    kontext.container.appendChild(pm.erzeugeHinweisBalken(vorabPruefung.texte));
    return;
  }

  if (!fuehrungId) {
    kontext.modul = await galerieModul.render(kontext.container);
    return;
  }

  const { fuehrungen } = await ladeFuehrungenDaten();
  if (meineGeneration !== generation) return;
  const fuehrung = fuehrungen.find((f) => f.fuehrung_id === fuehrungId);

  // AUFTRAG "Fuehrungen, Teil 2c", Punkt 2: #fuehrungen/<id>/ende - eigene
  // Ansicht statt einer Stationsnummer, VOR der stationNr-Aufloesung
  // abgezweigt (sonst wuerde Number('ende') zu NaN und faelschlich "nicht
  // gefunden" ausloesen).
  if (fuehrung && stationNrRoh === 'ende') {
    // AUFTRAG E, Punkt 1: literatur.csv nur prüfen, wenn diese Führung "Zum
    // Weiterlesen" hat (ladeFuehrungenDaten() hat die Datei bereits geladen).
    const literaturBedarf = fuehrung.weiterlesen.length > 0 ? ['data/literatur.csv'] : [];
    await pm.stelleDateienSicher('fuehrungAbschluss', literaturBedarf);
    if (meineGeneration !== generation) return;
    kontext.modul = abschlussModul.render(kontext.container, fuehrung);
    kontext.aktuellesVizModul = kontext.modul;
    zeigeSeitenPruefung(kontext.container, pm.pruefeAnsicht('fuehrungAbschluss', literaturBedarf), () => {}); // AUFTRAG B2: literatur.csv
    return;
  }

  const stationNr = Number(stationNrRoh || '1');
  const station = fuehrung?.stationen.find((s) => s.station_nr === stationNr);

  if (!fuehrung || !station) {
    const hinweis = `Führung „${fuehrungId}"${stationNrRoh ? `, Station ${stationNrRoh}` : ''} wurde nicht gefunden.`;
    kontext.modul = await galerieModul.render(kontext.container, { hinweis });
    return;
  }
  kontext.modul = stationModul.render(kontext.container, fuehrung, stationNr);
  // AUFTRAG B2: Hinweis, wenn eine Belegquelle dieser Station keine Daten hat
  // (die einzelnen Belege zeigen zusätzlich weiterhin ihre eigene Fehlerbox).
  const belegDateien = (station.belege || []).map((b) => BELEG_QUELLEN[b.typ]?.pfad).filter(Boolean);
  zeigeSeitenPruefung(kontext.container, pm.pruefeAnsicht('fuehrungStation', belegDateien), () => {});
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
  return aktualisiereFuehrungenAnsicht(kontext); // AUFTRAG B2: Promise fuer "erster Bildaufbau"
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
  // AUFTRAG "Archivspezifische Texte...", Punkt 2.5: erzeugeStartseite() lädt
  // jetzt startseite.csv/archiv.csv und ist daher async - derselbe
  // Sofort-Kontext+Nachreich-Wettlauf-Schutz wie renderUeberTab() oben.
  const wurzelContainer = erzeugeUnterContainer('startseite-container');
  const kontext = { tab: null, startseite: null, destroy: () => kontext.startseite?.destroy() };
  aktuellerKontext = kontext;
  return erzeugeStartseite(wurzelContainer).then(async (startseite) => {
    if (aktuellerKontext !== kontext) { startseite.destroy(); return; }
    kontext.startseite = startseite;
    // AUFTRAG B2: Kerndateien startseite.csv und archiv.csv - Hinweisbalken
    const pm = await ladePruefModul(); // erst NACH dem Aufbau der Startseite nachgeladen
    await pm.stelleDateienSicher('startseite');
    if (aktuellerKontext !== kontext) return;
    zeigeSeitenPruefung(wurzelContainer, pm.pruefeAnsicht('startseite'), () => { startseite.destroy(); kontext.startseite = null; });
  });
}

// AUFTRAG "Literaturseite", Punkt 6: derselbe Sofort-Kontext+Nachreich-
// Wettlauf-Schutz wie renderUeberTab() oben (literatur.csv lädt asynchron) -
// zusätzlich wird nach dem Laden verarbeiteDatensatzAufruf() aufgerufen
// (Deep Link literatur:<id> über ?datensatz=, siehe
// js/utils/datensatzAufruf.js), analog zu aktualisiereGalerieFlyoutAnsicht()s
// gleichlautendem Aufruf für Bestand/Visualisierungen - Literatur läuft
// nicht über diese generische Galerie/Flyout-Pipeline, braucht die
// Verdrahtung deshalb hier separat.
function renderLiteraturTab() {
  const container = erzeugeUnterContainer('literatur-bereich');
  const kontext = { tab: 'literatur', modul: null, destroy: () => kontext.modul?.destroy() };
  aktuellerKontext = kontext;
  const route = aktuelleRoute();
  return erzeugeLiteraturSeite(container).then(async (modul) => {
    if (aktuellerKontext !== kontext) { modul.destroy(); return; }
    kontext.modul = modul;
    // AUFTRAG B2: literatur.csv prüfen (leer, unlesbar, Spalte 'zitation')
    const pm = await ladePruefModul();
    await pm.stelleDateienSicher('literatur');
    if (aktuellerKontext !== kontext) return;
    const pruefung = pm.pruefeAnsicht('literatur');
    zeigeSeitenPruefung(container, pruefung, () => { modul.destroy(); kontext.modul = null; });
    if (!pruefung.blockiert) verarbeiteDatensatzAufruf(modul, route);
  });
}

function renderTab(tab) {
  if (!tab) return renderStartTab();
  if (tab === 'bestand') return renderBestandTab();
  if (tab === 'visualisierungen') return renderVisualisierungenTab();
  if (tab === 'fuehrungen') return renderFuehrungenTab();
  if (tab === 'literatur') {
    return renderLiteraturTab();
  }
  if (tab === 'ueber') {
    return renderUeberTab();
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
  aktualisiereSeitenueberschrift(route); // AUFTRAG D, Punkt 1

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
  const aufbau = renderTab(route.tab);
  contentRoot.focus();
  return aufbau; // AUFTRAG B2: fuer pruefeDatenImHintergrund() ("nach dem ersten Bildaufbau")
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
    // KORREKTURAUFTRAG "Vier unabhängige Korrekturen", Punkt 4: temporärer
    // Vorschau-Flyout (Hauptnav "Visualisierungen") - schließt zusätzlich
    // per Hover-Wegbewegen (siehe visualisierungsTabs.js' Kommentar zu
    // `schliesstBeiWegbewegen`).
    schliesstBeiWegbewegen: true,
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
        verankereVizFlyout: (link, typ) => erzeugeVizVorschauFlyout(link, typ, () => vizFlyout.schliesse()),
        istAusgeblendet: istBereichAusgeblendet // AUFTRAG B2
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

// AUFTRAG "Archivspezifische Texte...", Punkt 2.1/2.3/2.4: überträgt die
// geladenen archiv.csv-Werte in die statischen index.html-Elemente
// (Titel/Logo/Logo-Untertitel/aria-Label/Fußzeile) sowie die
// --accent-CSS-Variable (Punkt 2.4). Läuft EINMALIG, direkt nachdem
// ladeArchivKonfiguration() im Bootstrap unten abgeschlossen ist - bei
// fehlender archiv.csv liefert konfigurationswert() bereits die neutralen
// Ersatzwerte (siehe archivKonfiguration.js), hier keine weitere
// Fehlerbehandlung nötig.
function wendeArchivIdentitaetAn() {
  document.title = konfigurationswert('seitentitel');

  const logoLink = document.getElementById('app-logo-link');
  const logoImg = document.getElementById('app-logo-img');
  const logoSub = document.getElementById('app-logo-sub');
  const logoDatei = konfigurationswert('logo_datei');
  if (logoImg && logoDatei) logoImg.src = `data/${logoDatei}`;
  // AUFTRAG C1, Punkt 5: ohne Logo-Datei steht der Kurzname als Text an der
  // Logo-Stelle (vorher blieb sie leer).
  if (logoImg && !logoDatei) {
    const text = document.createElement('span');
    text.className = 'app-logo-text';
    text.textContent = konfigurationswert('archiv_kurzname');
    logoImg.replaceWith(text);
  }
  if (logoSub) logoSub.textContent = konfigurationswert('logo_untertitel');
  if (logoLink) logoLink.setAttribute('aria-label', `${konfigurationswert('archiv_kurzname')}, Startseite`);

  const footerText = document.getElementById('app-footer-text');
  if (footerText) footerText.textContent = konfigurationswert('footer_text');

  const akzentfarbe = konfigurationswert('akzentfarbe');
  if (akzentfarbe) document.documentElement.style.setProperty('--accent', akzentfarbe);

  wendeFaviconAn();
}

// AUFTRAG "Favicon": das Favicon soll wie das Logo über archiv.csv
// konfigurierbar sein, damit andere Archive ihr eigenes verwenden können.
// index.html enthält bewusst KEINE eigenen <link rel="icon">-Elemente -
// sie werden hier je Schlüssel einzeln erzeugt, damit ein fehlender/leerer
// Eintrag (Punkt 2, Auftrag wörtlich) das entsprechende Element schlicht
// nicht entstehen lässt, statt ein <link> mit leerem/kaputtem href zu
// setzen (kein Konsolenfehler, kein 404 auf "data/"). `.remove()` vor dem
// Neuaufbau ist eine reine Absicherung gegen einen theoretischen zweiten
// Aufruf dieser Funktion, nicht für den normalen Ein-mal-Bootstrap nötig.
function wendeFaviconAn() {
  const eintraege = [
    { schluessel: 'favicon_datei', id: 'app-favicon-svg', rel: 'icon', typ: 'image/svg+xml' },
    { schluessel: 'favicon_png_datei', id: 'app-favicon-png', rel: 'icon', typ: 'image/png' },
    { schluessel: 'apple_touch_icon_datei', id: 'app-apple-touch-icon', rel: 'apple-touch-icon', typ: null }
  ];
  eintraege.forEach(({ schluessel, id, rel, typ }) => {
    document.getElementById(id)?.remove();
    const datei = konfigurationswert(schluessel);
    if (!datei) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = rel;
    if (typ) link.type = typ;
    link.href = `data/${datei}`;
    document.head.appendChild(link);
  });
  // AUFTRAG C2 (Restpunkt aus C1): index.html enthält ein leeres Ersatz-Favicon
  // (#app-favicon-leer), damit der Browser beim Laden nicht von sich aus
  // /favicon.ico anfragt (404 in der Konsole, wenn das Archiv kein Favicon
  // hat). Nennt archiv.csv ein Favicon (Krems), wird der Ersatz entfernt.
  if (konfigurationswert('favicon_datei') || konfigurationswert('favicon_png_datei')) {
    document.getElementById('app-favicon-leer')?.remove();
  }
}

// Punkt 2.1, Ausfallverhalten "ueber.csv fehlt": Navigationspunkt "Über"
// wird ausgeblendet. Prüft das im Hintergrund (nicht blockierend fürs
// erste Rendern, siehe Dateikopf-Kommentar "erst bei Bedarf" in
// archivKonfiguration.js) - ladeSeitenBloecke() cacht das Ergebnis, ein
// späterer echter Aufruf der Über-Seite lädt die Datei dadurch nicht
// erneut. Nur eine leere Blockliste bei vorhandener, aber inhaltsleerer
// Datei blendet die Navigation NICHT aus (das ist kein Fehlerfall) - SEIT
// AUFTRAG B2 überholt: eine Datei ohne Datensätze gilt als "nicht vorhanden"
// und wird von wendeAusblendungenAn() nach der Hintergrund-Prüfung ebenfalls
// ausgeblendet (Entscheidung des Autors vom 2026-10-03) -
// unterschieden über denselben Cache-Eintrag, indem ladeCSV() selbst bei
// fehlender Datei wirft (siehe ladeSeitenBloecke()s try/catch) und hier
// separat, nur für die Ausblenden-Entscheidung, erneut geprüft wird.
async function pruefeUeberSeiteVerfuegbarkeit() {
  try {
    await ladeGecachteCSV('data/ueber.csv');
  } catch {
    document.getElementById('nav-ueber-link')?.setAttribute('hidden', '');
  }
}

// AUFTRAG "Literaturseite", Punkt 3 (Content-driven): fehlt literatur.csv
// oder hat sie keine Datenzeilen, wird der Nav-Punkt "Literatur" ausgeblendet
// - dieselbe Konvention wie pruefeUeberSeiteVerfuegbarkeit() oben, hier
// zusätzlich die Datenzeilen-Anzahl geprüft (Auftrag wörtlich: "fehlt ODER
// hat keine Datenzeilen"), da eine vorhandene, aber leere CSV bei
// ladeCSV() nicht wirft.
async function pruefeLiteraturVerfuegbarkeit() {
  try {
    const records = await ladeGecachteCSV('data/literatur.csv');
    if (records.length === 0) throw new Error('data/literatur.csv hat keine Datenzeilen.');
  } catch {
    document.getElementById('nav-literatur-link')?.setAttribute('hidden', '');
  }
}

// AUFTRAG B2 (Prüfbericht Punkt 3): Ergebnis der Hintergrund-Prüfung anwenden -
// nur aufgerufen, wenn tatsächlich etwas ausgeblendet wird. Hauptnavigation:
// Punkte ohne Daten verschwinden; ist gerade eine Seite mit Bereichsleiste
// oder Galerie offen, wird sie neu aufgebaut, damit auch dort nichts Leeres
// mehr angeboten wird. Ein direkter Link auf eine ausgeblendete Ansicht zeigt
// weiterhin den Hinweisbalken (Freigabe Punkt 5).
function wendeAusblendungenAn() {
  const navAusblenden = {
    bestand: istBereichAusgeblendet({ ansichten: BESTAND_ANSICHTEN }),
    visualisierungen: ARCHIVALIENTYPEN.every((typ) => istBereichAusgeblendet(typ)),
    fuehrungen: istAnsichtAusgeblendet('fuehrungenUebersicht'),
    literatur: istAnsichtAusgeblendet('literatur'),
    ueber: istAnsichtAusgeblendet('ueber')
  };
  navLinks.forEach((link) => { if (navAusblenden[link.dataset.tab]) link.setAttribute('hidden', ''); });
  const route = aktuelleRoute();
  if (route.tab === 'bestand' || route.tab === 'visualisierungen') {
    raeumeSeiteAuf();
    renderTab(route.tab);
  }
}

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

// AUFTRAG "Fuehrungen, Teil 2c", Punkt 1: einmalig app-weit verankert (nicht
// an einen einzelnen Tab-Kontext gebunden), siehe fuehrungFortsetzen.js'
// Dateikopf-Kommentar - bleibt dadurch ueber jeden Tab-/Ansichtswechsel
// bestehen.
initialisiereFortsetzenButton();
window.addEventListener('hashchange', handleRouteChange);
window.addEventListener('resize', planeResizeVerarbeitung);

// AUFTRAG "Archivspezifische Texte...", Punkt 2.1: archiv.csv wird VOR dem
// ersten Rendern geladen - top-level await (index.html bindet app.js als
// <script type="module">, das unterstützt das nativ, kein Build-Step
// nötig). pruefeUeberSeiteVerfuegbarkeit() bewusst NICHT mit awaited -
// blockiert das erste Rendern nicht (siehe dortiger Kommentar).
// AUFTRAG C1, Punkt 2: ansichten.csv GLEICHZEITIG mit archiv.csv (kein
// zusätzlicher Ladeschritt), danach die Registry anpassen - vor dem ersten
// Aufbau, damit Navigation und Galerie sofort die Angaben des Archivs zeigen.
const [, ansichtenZeilen] = await Promise.all([ladeArchivKonfiguration(), ladeAnsichtenKonfiguration()]);
wendeAnsichtenKonfigurationAn(ansichtenZeilen);
wendeArchivIdentitaetAn();
pruefeUeberSeiteVerfuegbarkeit();
pruefeLiteraturVerfuegbarkeit();
const erstesRendern = handleRouteChange();
// AUFTRAG B2 (Entscheidung des Autors, 2026-10-03): erst NACH dem ersten
// Bildaufbau im Hintergrund prüfen, welche Dateien fehlen oder keine
// Datensätze haben, und deren Tabs/Ansichten ausblenden - siehe
// js/core/datenVerfuegbarkeit.js (Abweichung von der Lazy-Loading-Regel).
// Das Prüfmodul selbst wird erst NACH dem ersten Aufbau geladen (nicht beim Start).
Promise.allSettled([erstesRendern])
  .then(() => ladePruefModul())
  .then((pm) => pm.pruefeDatenImHintergrund(erstesRendern, wendeAusblendungenAn));
