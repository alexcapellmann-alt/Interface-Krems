// js/fuehrungen/fuehrungStation.js
// AUFTRAG "Führungen, Teil 2a", Punkt 1+4+6: Einzelstationsansicht samt
// Navigation. Stationswechsel über die Pfeile aktualisieren den Hash
// ERSETZEND (Punkt 1, Auftrag wörtlich: "damit die Browser-Zurück-Taste die
// Führung verlässt, statt Station für Station zurückzugehen") - gelöst über
// `history.replaceState()` (löst KEIN `hashchange` aus) statt
// router.js' `navigiereZu()` (erzeugt IMMER einen neuen Verlaufseintrag,
// siehe dortiger Kommentar) - deshalb KEINE Änderung an router.js nötig,
// wie im Auftrag zur Rückmeldung vorgesehen falls doch nötig gewesen wäre.
// Nur der Ersteinstieg Galerie -> Station 1 UND "Zurück zur Übersicht"
// bleiben normale, verlaufs-erzeugende Navigation (`navigiereZu()`).
//
// KORREKTURAUFTRAG "Führungen, Teil 2a-K – Bildschirmfüllendes Layout und
// Präsentationsnavigation":
//
// Punkt 0 (Ist-Zustand, siehe PROJEKTLOG für die volle Messtabelle):
// Hauptursache des Überlaufs war NICHT eine einzelne zu große Komponente,
// sondern das Fehlen JEDER Höhenbegrenzung - `.fuehrungen-bereich` (in
// `app.js`) nahm keine Grid-Fläche ein (siehe `css/layout.css`s neue Regel)
// und `.fuehrung-station-inhalt`/`.fuehrung-beleg` wuchsen ungebremst mit
// ihrem Inhalt (vor allem dem unskalierten Urkundenfoto). Deshalb reicht
// eine reine Bildskalierung NICHT - es brauchte eine komplette
// Höhenverteilung von oben (`.fuehrungen-bereich`, `css/layout.css`) bis
// unten (einzelne Scroll-Container).
//
// Punkt 1 (bildschirmfüllend, KEIN `dvh`): dasselbe, bereits im Projekt
// etablierte Flexbox-Prinzip wie `css/layout.css`s "VOLLBILD-KORREKTUR"
// (body als Flex-Spalte, `#app-content` als einziger wachsender Bereich) -
// bewusst KEIN `dvh`/fester `calc(100vh - Xpx)`, aus demselben dort
// genannten Grund (Header/Footer können durch `flex-wrap` ihre Höhe ändern).
// `.fuehrung-station` ist jetzt selbst eine Flex-ZEILE (Hauptspalte +
// Navigationssäule, siehe Punkt 2), die Hauptspalte eine Flex-SPALTE (Kopf
// `flex:0 0 auto`, Inhalt `flex:1 1 auto; min-height:0`) - `min-height:0`
// auf JEDER Ebene ist hier der eigentliche Kniff (Flex-Items wachsen sonst
// per Default-`min-height:auto` über den zugeteilten Platz hinaus, siehe
// `layout.css`-Kommentar zum selben, dort bereits einmal dokumentierten
// CSS-Verhalten). `.fuehrung-beleg`/`.fuehrung-erzaehltext` bekommen dadurch
// eine ECHTE Höhenbegrenzung und scrollen bei Bedarf INTERN
// (`overflow-y:auto`, `tabindex=0` für Tastatur-Erreichbarkeit) - der
// native Scrollbalken bleibt sichtbar (keine `scrollbar-width:none`-o.ä.
// Unterdrückung), das erfüllt "Scrollbare Bereiche müssen erkennbar sein"
// ohne zusätzliches Ausblendverlauf-Overlay. Mobil (`--fuehrung-umbruch`,
// dieselbe Breakpoint-Variable wie für die Beleg/Text-Spalten aus Teil 2a)
// wird die Höhenbegrenzung per Media Query wieder aufgehoben - Station
// verhält sich dort wie normaler, seitenscrollender Inhalt (Auftrag
// wörtlich). Rückfall bei 200%-Zoom/sehr niedriger Fensterhöhe (WCAG 1.4.4/
// 1.4.10): bewusst KEIN `overflow:hidden` auf `.fuehrungen-bereich`/`body`
// gesetzt - wird der Inhalt trotz aller internen Scroll-Container insgesamt
// zu hoch (z.B. weil selbst die Mindesthöhen aller Teile zusammen den
// Viewport übersteigen), wächst die Seite wie gehabt ganz normal (Standard-
// Flex-Verhalten von `body`, unverändert seit der VOLLBILD-KORREKTUR) -
// nichts wird abgeschnitten.
//
// Punkt 2 (vertikale Navigationssäule): ehemals zwei horizontale Pfeile
// NACH dem Inhalt - jetzt eine feste, dritte Flex-Spalte NEBEN Kopf+Inhalt
// (nicht `position:fixed`/`absolute` - ein echtes Flex-Geschwister
// überlagert per Definition nichts und braucht keine gesonderte
// Platzreservierung, siehe Dateikopf-Kommentar). Da die Säule dadurch
// automatisch die GESAMTE Stationshöhe einnimmt (Punkt 1 macht diese Höhe
// je Station identisch), stehen Pfeil-hoch (oben), Fortschritt (vertikal
// zentriert) und Pfeil-runter/"Zur Übersicht" (unten) auf JEDER Station an
// exakt derselben Pixel-Position - eine Folge von Punkt 1, kein separater
// Positionierungs-Mechanismus nötig. Mobil wird dieselbe Säule per Media
// Query zu einer `position:sticky`-Leiste am unteren Rand (bleibt beim
// Scrollen der Station sichtbar, ohne fremden Content zu verdecken - sticky
// braucht anders als `fixed` keine manuelle Platzreservierung).

import { baueHash } from '../core/router.js';
import { fuegeSidebarStyleEin } from '../utils/sidebar.js';
import { baueBelegBereich } from './belegDarstellung.js';
import { erzeugeUnsicherheitHinweis } from '../utils/unsicherheitHinweis.js';
import { ermittleVerfuegbareHoehe } from '../utils/viewportGroesse.js';
import { speichereZustand } from './fuehrungFortsetzen.js';

// NACHTRAG zu Punkt 1 (nach Diagnose einer verbliebenen Bildschirm-
// Überschreitung): reines Flex-Shrinking über `#app-content` funktioniert
// NICHT bis ganz nach oben, weil `#app-content` (body-Ebene, siehe
// layout.css-Kommentar zur VOLLBILD-KORREKTUR) ABSICHTLICH kein
// `min-height:0` bekommt - andere Tabs sollen bei Bedarf über den Viewport
// hinaus wachsen dürfen, das darf diese Korrektur laut Nicht-Ziel nicht
// verändern. `.fuehrung-station` bekommt deshalb hier eine EXPLIZITE,
// gemessene Höhe (`viewportGroesse.js`, wie im Auftrag als Alternative zu
// `dvh` vorgesehen: "je nachdem, was im Projekt üblich ist") - das verankert
// die bereits vorhandene `min-height:0`-Kette (Punkt 1 s.o.) an einem festen
// Wert, statt sie auf ein Flex-Shrinking angewiesen sein zu lassen, das eine
// Ebene höher absichtlich nicht stattfindet. `viewportGroesse.js` selbst
// bleibt dabei unverändert (nur verwendet, Nicht-Ziel/Auftrag wörtlich).
// Mobil (Soll-Zustand Punkt 1, Auftrag wörtlich: "Kein Zwang zur
// Bildschirmfüllung, die Station scrollt wie bisher normal") bekommt KEINE
// feste Höhe - dieselbe Breakpoint-Schwelle wie `--fuehrung-umbruch` in
// components.css (800px), hier nicht importierbar (reines CSS-Custom-
// Property), deshalb als Zahl gespiegelt.
const MOBIL_UMBRUCH_PX = 800;

function passeGroesseAn(wurzel) {
  if (window.innerWidth <= MOBIL_UMBRUCH_PX) {
    wurzel.style.height = '';
    return;
  }
  // reserveUnten = tatsächliche Fußzeilenhöhe (schwankt kaum, aber lieber
  // gemessen als geraten): ohne sie bliebe ein kleiner Rest-Überschuss durch
  // die Fußzeile übrig, obwohl `.fuehrung-station` selbst schon exakt passt -
  // "Die Seite selbst scrollt nicht" (Punkt 1, Auftrag wörtlich) gilt auch
  // für diesen Rest.
  const fusszeile = document.querySelector('.app-footer');
  const hoehe = ermittleVerfuegbareHoehe(wurzel, {
    mindestHoehe: 320,
    reserveUnten: fusszeile ? fusszeile.getBoundingClientRect().height : 0
  });
  wurzel.style.height = `${hoehe}px`;
}

function baueKopf(fuehrung, station, aktuelleNr) {
  const kopf = document.createElement('header');
  kopf.className = 'fuehrung-station-kopf';

  const zurueck = document.createElement('a');
  zurueck.href = baueHash(['fuehrungen']);
  zurueck.className = 'fuehrung-station-zurueck';
  zurueck.textContent = '← Alle Führungen';
  kopf.appendChild(zurueck);

  if (fuehrung.status === 'entwurf') {
    const badge = document.createElement('span');
    badge.className = 'fuehrung-kachel-entwurf';
    badge.textContent = 'Entwurf';
    kopf.appendChild(badge);
  }

  const fuehrungstitel = document.createElement('span');
  fuehrungstitel.className = 'fuehrung-station-fuehrungstitel';
  fuehrungstitel.textContent = fuehrung.fuehrung_titel;
  const stationstitel = document.createElement('h2');
  stationstitel.className = 'fuehrung-station-titel';
  stationstitel.tabIndex = -1;
  stationstitel.textContent = station.station_titel;
  const meta = document.createElement('span');
  meta.className = 'fuehrung-station-meta';
  const zeitraum = station.station_zeitraum || fuehrung.zeitraum;
  meta.textContent = zeitraum || '';
  kopf.append(fuehrungstitel, stationstitel, meta);

  fuehrung.kopfFehler.forEach((text) => {
    const box = document.createElement('p');
    box.className = 'fuehrung-fehler';
    box.textContent = text;
    kopf.appendChild(box);
  });
  return kopf;
}

function baueInhaltsBereich(station) {
  const bereich = document.createElement('div');
  const vergleich = station.belege.length > 1;
  bereich.className = vergleich ? 'fuehrung-station-inhalt vergleich' : 'fuehrung-station-inhalt';

  bereich.appendChild(baueBelegBereich(station.belege[0], station.bild_text));
  bereich.appendChild(baueErzaehlbereich(station));
  if (vergleich) bereich.appendChild(baueBelegBereich(station.belege[1], station.bild_text));
  return bereich;
}

// Punkt 1 (siehe Dateikopf-Kommentar): `tabindex=0` macht den Bereich per
// Tastatur fokussierbar (Voraussetzung dafür, dass native Pfeiltasten-/
// Bild-auf-ab-Scrollbedienung überhaupt greifen kann) - `istTastaturZielGesperrt()`
// unten erkennt genau diese Klasse und lässt die Stations-Tastatursteuerung
// dort bewusst NICHT eingreifen.
function baueErzaehlbereich(station) {
  const bereich = document.createElement('div');
  bereich.className = 'fuehrung-erzaehltext';
  bereich.tabIndex = 0;
  bereich.setAttribute('role', 'region');
  bereich.setAttribute('aria-label', 'Erzähltext, bei Bedarf scrollbar');

  station.stationWarnungen.forEach((text) => {
    const box = document.createElement('p');
    box.className = 'fuehrung-fehler';
    box.textContent = text;
    bereich.appendChild(box);
  });

  station.textBloecke.forEach((block) => {
    if (block.art === 'liste') {
      const liste = document.createElement('ul');
      block.punkte.forEach((punkt) => {
        const li = document.createElement('li');
        li.textContent = punkt;
        liste.appendChild(li);
      });
      bereich.appendChild(liste);
    } else {
      const p = document.createElement('p');
      p.textContent = block.text;
      bereich.appendChild(p);
    }
  });

  if (station.unsicherheit_hinweis) {
    erzeugeUnsicherheitHinweis(bereich, station.unsicherheit_hinweis);
  }
  if (station.vertiefung.length > 0) {
    bereich.appendChild(baueVertiefungsBereich(station.vertiefung));
  }
  return bereich;
}

// AUFTRAG "Fuehrungen, Teil 2b", Punkt 6: optisch abgesetzter Block "unter
// dem Erzaehltext" - als letztes Kind von .fuehrung-erzaehltext (dieselbe
// scrollbare Spalte, siehe components.css), nicht als eigener, weiterer
// Flex-Bereich, damit Punkt 1 aus 2a-K (Hoehenverteilung) unangetastet
// bleibt. Ein ungueltiger Pfad (fehler gesetzt, siehe fuehrungenDaten.js'
// parseVertiefung()) zeigt denselben .fuehrung-fehler-Hinweis wie andere
// Pruefregel-Verstoesse statt eines Links.
function baueVertiefungsBereich(vertiefung) {
  const bereich = document.createElement('div');
  bereich.className = 'fuehrung-vertiefung';
  vertiefung.forEach(({ href, beschriftung, fehler }) => {
    if (fehler) {
      const box = document.createElement('p');
      box.className = 'fuehrung-fehler';
      box.textContent = fehler;
      bereich.appendChild(box);
      return;
    }
    const link = document.createElement('a');
    link.className = 'fuehrung-vertiefung-link';
    link.href = href;
    link.textContent = beschriftung;
    bereich.appendChild(link);
  });
  return bereich;
}

function baueNavPfeil(label, symbol, aktiv, onKlick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fuehrung-nav-pfeil';
  btn.setAttribute('aria-label', label);
  btn.title = label;
  btn.disabled = !aktiv;
  btn.textContent = symbol;
  if (aktiv) btn.addEventListener('click', onKlick);
  return btn;
}

// Punkt 2 (siehe Dateikopf-Kommentar): drei Elemente von oben nach unten -
// Pfeil-hoch, Fortschritt ("2 / 4"), Pfeil-runter bzw. auf der letzten
// Station "Zur Übersicht" (gleich großer, beschrifteter Button statt Pfeil).
function baueNavigation(fuehrung, aktuelleNr, geheZu) {
  const nav = document.createElement('nav');
  nav.className = 'fuehrung-nav';
  nav.setAttribute('aria-label', 'Stationsnavigation');

  const ersteNr = fuehrung.stationen[0].station_nr;
  const letzteNr = fuehrung.stationen[fuehrung.stationen.length - 1].station_nr;
  nav.appendChild(baueNavPfeil('Vorherige Station', '▲', aktuelleNr > ersteNr, () => geheZu(aktuelleNr - 1, { ersetzeVerlauf: true })));

  const fortschritt = document.createElement('span');
  fortschritt.className = 'fuehrung-nav-fortschritt';
  fortschritt.textContent = `${aktuelleNr} / ${fuehrung.stationen.length}`;
  nav.appendChild(fortschritt);

  if (aktuelleNr >= letzteNr) {
    // AUFTRAG "Fuehrungen, Teil 2c", Punkt 2: letzte Station -> ▼ fuehrt
    // jetzt zum Abschlussbildschirm statt direkt zur Uebersicht (der hat
    // dort selbst einen "Zur Uebersicht"-Weg, siehe fuehrungAbschluss.js).
    const abschluss = document.createElement('a');
    abschluss.href = baueHash(['fuehrungen', fuehrung.fuehrung_id, 'ende']);
    abschluss.className = 'fuehrung-nav-pfeil fuehrung-nav-uebersicht';
    abschluss.textContent = 'Ende der Führung';
    nav.appendChild(abschluss);
  } else {
    nav.appendChild(baueNavPfeil('Nächste Station', '▼', true, () => geheZu(aktuelleNr + 1, { ersetzeVerlauf: true })));
  }
  return nav;
}

// Punkt 6 (Auftrag wörtlich, jetzt auch Punkt 1's scrollbare Bereiche):
// Tasten wirken nicht, solange der Fokus in einem Eingabefeld, dem offenen
// ⚠-Fenster ODER einem scrollbaren Belegtext-/Erzähltext-Bereich liegt -
// dort sollen Pfeiltasten/Bild-auf-ab stattdessen normal scrollen.
function istTastaturZielGesperrt(target) {
  if (!target || typeof target.closest !== 'function') return false;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true;
  return Boolean(target.closest('.unsicherheit-hinweis-panel, .fuehrung-beleg-scroll, .fuehrung-erzaehltext'));
}

export function render(container, fuehrung, initialeNr) {
  container.innerHTML = '';
  fuegeSidebarStyleEin(container);
  const wurzel = document.createElement('div');
  wurzel.className = 'fuehrung-station';
  container.appendChild(wurzel);

  const haupt = document.createElement('div');
  haupt.className = 'fuehrung-station-haupt';
  wurzel.appendChild(haupt);

  let aktuelleNr = initialeNr;

  function geheZu(neueNr, { ersetzeVerlauf }) {
    if (ersetzeVerlauf) history.replaceState(null, '', baueHash(['fuehrungen', fuehrung.fuehrung_id, String(neueNr)]));
    aktuelleNr = neueNr;
    zeichne();
  }

  // AUFTRAG "Fuehrungen, Teil 2c", Punkt 1: NUR ein Klick auf einen Belegs-
  // oder Vertiefungslink speichert den Fortsetzen-Zustand (Auftrag
  // woertlich) - normale Stationsnavigation (Pfeile/Tastatur) tut es
  // bewusst nicht. Ein delegierter Listener auf `haupt` deckt beide
  // Linkarten ab, ohne belegDarstellung.js' Funktionssignaturen zu aendern.
  function merkeVerlassenBeiLinkKlick(event) {
    const link = event.target.closest('.fuehrung-beleg-archivlink, .fuehrung-vertiefung-link');
    if (!link) return;
    const station = fuehrung.stationen.find((s) => s.station_nr === aktuelleNr);
    speichereZustand({
      fuehrungId: fuehrung.fuehrung_id,
      stationNr: aktuelleNr,
      fuehrungTitel: fuehrung.fuehrung_titel,
      stationTitel: station.station_titel
    });
  }
  haupt.addEventListener('click', merkeVerlassenBeiLinkKlick);

  function zeichne() {
    haupt.innerHTML = '';
    wurzel.querySelector('.fuehrung-nav')?.remove();
    const station = fuehrung.stationen.find((s) => s.station_nr === aktuelleNr);
    haupt.appendChild(baueKopf(fuehrung, station, aktuelleNr));
    haupt.appendChild(baueInhaltsBereich(station));
    wurzel.appendChild(baueNavigation(fuehrung, aktuelleNr, geheZu));
    haupt.querySelector('.fuehrung-station-titel')?.focus();
    // Kopfzeile kann je Station leicht unterschiedlich hoch sein (z.B. durch
    // Zeilenumbruch bei längeren Titeln) - bei jedem Stationswechsel neu
    // vermessen, nicht nur einmalig beim ersten Aufbau.
    passeGroesseAn(wurzel);
  }

  function tastaturHandler(event) {
    if (istTastaturZielGesperrt(event.target)) return;
    const erste = fuehrung.stationen[0].station_nr;
    const letzte = fuehrung.stationen[fuehrung.stationen.length - 1].station_nr;
    const zurueck = ['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key);
    const vor = ['ArrowRight', 'ArrowDown', 'PageDown'].includes(event.key);
    if (zurueck && aktuelleNr > erste) { event.preventDefault(); geheZu(aktuelleNr - 1, { ersetzeVerlauf: true }); }
    if (vor && aktuelleNr < letzte) { event.preventDefault(); geheZu(aktuelleNr + 1, { ersetzeVerlauf: true }); }
  }

  document.addEventListener('keydown', tastaturHandler);
  zeichne();

  return {
    destroy: () => document.removeEventListener('keydown', tastaturHandler),
    // app.js' zentrale, 200ms-debouncte resize()-Verdrahtung (siehe
    // Dateikopf-Kommentar) - misst bei jeder Fenstergrößenänderung neu, u.a.
    // damit ein Wechsel über/unter MOBIL_UMBRUCH_PX (Drehen eines Tablets,
    // Verkleinern des Fensters) sofort zwischen fester Höhe und normalem
    // Seitenscrollen umschaltet.
    resize: () => passeGroesseAn(wurzel)
  };
}
