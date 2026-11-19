// js/fuehrungen/fuehrungStation.js – Einzelstation einer Führung samt Navigation
// Zweck: eine Station (Kopf, Beleg, Erzähltext) bildschirmfüllend mit senkrechter Navigationssäule (hoch, Fortschritt,
//   runter bzw. „Zur Übersicht“); auf schmalen Fenstern normal scrollend mit Leiste am unteren Rand.
// Eingabe: Führung und Station aus fuehrungen/fuehrungenDaten.js (data/fuehrungen.csv und Belege).
// Schnittstelle: render(container, fuehrung, initialeNr).
// Abhängigkeiten: core/router.js (baueHash), fuehrungen/belegDarstellung.js, fuehrungHinweisBox.js, fuehrungFortsetzen.js,
//   utils/unsicherheitHinweis.js, utils/viewportGroesse.js, utils/sidebar.js (Stile), css/layout.css.
// Verhalten: Stationswechsel ersetzen den Hash (history.replaceState), die Browser-Zurück-Taste verlässt die Führung;
//   Beleg und Text scrollen innen (tabindex="0"); kein overflow:hidden, bei 200 % Zoom wächst die Seite.
// Hintergrund (Höhenverteilung, min-height: 0): docs/MODULNOTIZEN.md, Abschnitt fuehrungStation.js.

import { baueFuehrungHinweisBox } from './fuehrungHinweisBox.js'; // AUFTRAG D, Punkt 4
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

  fuehrung.kopfFehler.forEach((text) => kopf.appendChild(baueFuehrungHinweisBox(text)));
  return kopf;
}

// AUFTRAG "Fuehrungen, Teil 2e", Punkt 1: fehlt der Beleg (belege.length ===
// 0, bewusst KEIN Fehler/Pruefhinweis - siehe fuehrungenDaten.js' parseBeleg(),
// die dafuer bereits ein leeres Array statt eines Fehlereintrags liefert),
// entfaellt .fuehrung-beleg vollstaendig - eigene Grid-Variante `ohne-beleg`
// (components.css) statt der bestehenden 1- bzw. 2-Beleg-Varianten.
function baueInhaltsBereich(station) {
  const bereich = document.createElement('div');
  const anzahlBelege = station.belege.length;
  bereich.className = anzahlBelege === 0
    ? 'fuehrung-station-inhalt ohne-beleg'
    : (anzahlBelege > 1 ? 'fuehrung-station-inhalt vergleich' : 'fuehrung-station-inhalt');

  if (anzahlBelege > 0) bereich.appendChild(baueBelegBereich(station.belege[0], station.bild_text));
  bereich.appendChild(baueErzaehlbereich(station));
  if (anzahlBelege > 1) bereich.appendChild(baueBelegBereich(station.belege[1], station.bild_text));
  return bereich;
}

// Punkt 1 (siehe docs/MODULNOTIZEN.md): `tabindex=0` macht den Bereich per
// Tastatur fokussierbar (Voraussetzung dafür, dass native Pfeiltasten-/
// Bild-auf-ab-Scrollbedienung überhaupt greifen kann) - `istTastaturZielGesperrt()`
// unten erkennt genau diese Klasse und lässt die Stations-Tastatursteuerung
// dort bewusst NICHT eingreifen.
// AUFTRAG "Teil 2g", Punkt 3 (Auftrag wörtlich: "Der Textblock steht
// vertikal mittig in seiner Spalte"): der eigentliche Inhalt wandert in
// einen inneren `.fuehrung-erzaehltext-mitte`-Wrapper (components.css:
// `min-height:100%` + Flex-Zentrierung) - `bereich` selbst bleibt der
// scrollbare Rahmen mit `tabindex`/`role`/`aria-label` (unverändert, siehe
// `istTastaturZielGesperrt()`-Kommentar oben).
function baueErzaehlbereich(station) {
  const bereich = document.createElement('div');
  bereich.className = 'fuehrung-erzaehltext';
  bereich.tabIndex = 0;
  bereich.setAttribute('role', 'region');
  bereich.setAttribute('aria-label', 'Erzähltext, bei Bedarf scrollbar');

  const mitte = document.createElement('div');
  mitte.className = 'fuehrung-erzaehltext-mitte';
  bereich.appendChild(mitte);

  station.stationWarnungen.forEach((text) => mitte.appendChild(baueFuehrungHinweisBox(text)));

  station.textBloecke.forEach((block) => {
    if (block.art === 'liste') {
      const liste = document.createElement('ul');
      block.punkte.forEach((punkt) => {
        const li = document.createElement('li');
        li.textContent = punkt;
        liste.appendChild(li);
      });
      mitte.appendChild(liste);
    } else {
      const p = document.createElement('p');
      p.textContent = block.text;
      mitte.appendChild(p);
    }
  });

  if (station.unsicherheit_hinweis) {
    erzeugeUnsicherheitHinweis(mitte, station.unsicherheit_hinweis);
  }
  if (station.vertiefung.length > 0) {
    mitte.appendChild(baueVertiefungsBereich(station.vertiefung));
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
      bereich.appendChild(baueFuehrungHinweisBox(fehler));
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

// Punkt 2 (siehe docs/MODULNOTIZEN.md): drei Elemente von oben nach unten -
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

// Länge begründet (über 100 Zeilen, Masterprompt §13.3; Nachbesserung 8): Einstieg des Moduls (Modul-Interface, Masterprompt §13): baut Gerüst, Instanz und Ereignisse in fester Reihenfolge auf; die Schritte hängen voneinander ab.
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
    const richtung = Math.sign(neueNr - aktuelleNr);
    aktuelleNr = neueNr;
    zeichne(richtung);
  }

  // Wunsch des Autors (2026-10-28): Stationswechsel als Schiebeeffekt - vorwärts
  // gleitet die alte Station nach oben hinaus und die neue von unten herein,
  // rückwärts umgekehrt. Die alte Station wandert dafür in eine absolut
  // positionierte Kopie von `haupt` (gleiches Flex-Layout), die nach der
  // Animation entfernt wird.
  const SCHIEBE_DAUER = 450;
  let laufenderWechsel = null;

  function schiebe(richtung) {
    laufenderWechsel?.();
    const alt = document.createElement('div');
    alt.className = 'fuehrung-station-haupt fuehrung-station-alt';
    alt.setAttribute('aria-hidden', 'true');
    alt.inert = true;
    alt.append(...haupt.childNodes);
    haupt.appendChild(alt);
    haupt.classList.add('schiebt');
    return () => {
      const hoehe = haupt.clientHeight;
      const neu = [...haupt.children].filter((el) => el !== alt);
      const ablauf = { duration: SCHIEBE_DAUER, easing: 'cubic-bezier(.65, 0, .35, 1)' };
      const animationen = [
        alt.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${-richtung * hoehe}px)`, opacity: 0 }], ablauf),
        ...neu.map((el) => el.animate([{ transform: `translateY(${richtung * hoehe}px)` }, { transform: 'translateY(0)' }], ablauf))
      ];
      let fertig = false;
      const abschliessen = () => {
        if (fertig) return;
        fertig = true;
        animationen.forEach((a) => a.cancel());
        alt.remove();
        haupt.classList.remove('schiebt');
        haupt.scrollTop = 0;
        // mobil scrollt die Seite selbst: neuen Stationstitel ins Bild holen
        if (window.innerWidth <= MOBIL_UMBRUCH_PX) haupt.querySelector('.fuehrung-station-titel')?.scrollIntoView({ block: 'nearest' });
        if (laufenderWechsel === abschliessen) laufenderWechsel = null;
      };
      laufenderWechsel = abschliessen;
      animationen[0].finished.then(abschliessen, abschliessen);
      // Rückfallebene: in verborgenen Tabs pausieren Animationen
      setTimeout(abschliessen, SCHIEBE_DAUER + 150);
    };
  }

  // AUFTRAG "Fuehrungen, Teil 2c", Punkt 1: NUR ein Klick auf einen Belegs-
  // oder Vertiefungslink speichert den Fortsetzen-Zustand (Auftrag
  // woertlich) - normale Stationsnavigation (Pfeile/Tastatur) tut es
  // bewusst nicht. Ein delegierter Listener auf `haupt` deckt beide
  // Linkarten ab, ohne belegDarstellung.js' Funktionssignaturen zu aendern.
  // AUFTRAG "Teil 2g", Punkt 4 (Auftrag wörtlich: "Verlässt man die Führung
  // über einen solchen Link, greift der bestehende Fortsetzen-Button"):
  // `.genannte-personen-link` (js/utils/genanntePersonen.js) ergänzt -
  // dieselbe Drei-Linkarten-Erkennung wie oben.
  function merkeVerlassenBeiLinkKlick(event) {
    const link = event.target.closest('.fuehrung-beleg-archivlink, .fuehrung-vertiefung-link, .genannte-personen-link');
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

  function zeichne(richtung = 0) {
    const mitSchieben = richtung !== 0 && haupt.childElementCount > 0
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const starteSchieben = mitSchieben ? schiebe(richtung) : null;
    if (!mitSchieben) {
      laufenderWechsel?.();
      haupt.innerHTML = '';
    }
    wurzel.querySelector('.fuehrung-nav')?.remove();
    const station = fuehrung.stationen.find((s) => s.station_nr === aktuelleNr);
    const alt = haupt.querySelector('.fuehrung-station-alt');
    haupt.insertBefore(baueKopf(fuehrung, station, aktuelleNr), alt);
    haupt.insertBefore(baueInhaltsBereich(station), alt);
    wurzel.appendChild(baueNavigation(fuehrung, aktuelleNr, geheZu));
    // preventScroll: `haupt` ist während des Schiebens überlaufend
    haupt.querySelector('.fuehrung-station-titel')?.focus({ preventScroll: mitSchieben });
    // Kopfzeile kann je Station leicht unterschiedlich hoch sein (z.B. durch
    // Zeilenumbruch bei längeren Titeln) - bei jedem Stationswechsel neu
    // vermessen, nicht nur einmalig beim ersten Aufbau.
    passeGroesseAn(wurzel);
    starteSchieben?.();
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
    // docs/MODULNOTIZEN.md) - misst bei jeder Fenstergrößenänderung neu, u.a.
    // damit ein Wechsel über/unter MOBIL_UMBRUCH_PX (Drehen eines Tablets,
    // Verkleinern des Fensters) sofort zwischen fester Höhe und normalem
    // Seitenscrollen umschaltet.
    resize: () => passeGroesseAn(wurzel)
  };
}
