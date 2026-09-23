// js/fuehrungen/fuehrungAbschluss.js
// AUFTRAG "Fuehrungen, Teil 2c", Punkt 2: Abschlussbildschirm einer Fuehrung
// (Route #fuehrungen/<id>/ende, siehe js/core/app.js' aktualisiereFuehrungenAnsicht()).
// Kopfbereich/Navigationssaeule/bildschirmfuellendes Verhalten sind bewusst
// EIGENSTAENDIG nachgebaut statt aus fuehrungStation.js importiert - dessen
// baueKopf()/passeGroesseAn() sind dort nicht exportiert und fest auf eine
// echte `station` zugeschnitten (Auftrag: keine Aenderung an bestehenden
// Klick-Handlern/Funktionssignaturen); dieselben CSS-Klassen
// (`.fuehrung-station-kopf`, `.fuehrung-nav`, ...) sorgen trotzdem fuer
// identisches Erscheinungsbild, wie im Auftrag verlangt. Kein "Mitmachen"-
// Block (Nicht-Ziel) - Stelle fuer einen spaeteren Auftrag im PROJEKTLOG
// vermerkt.

import { baueHash } from '../core/router.js';
import { ermittleVerfuegbareHoehe } from '../utils/viewportGroesse.js';
import { loescheZustand } from './fuehrungFortsetzen.js';

const MOBIL_UMBRUCH_PX = 800;

function passeGroesseAn(wurzel) {
  if (window.innerWidth <= MOBIL_UMBRUCH_PX) { wurzel.style.height = ''; return; }
  const fusszeile = document.querySelector('.app-footer');
  const hoehe = ermittleVerfuegbareHoehe(wurzel, {
    mindestHoehe: 320,
    reserveUnten: fusszeile ? fusszeile.getBoundingClientRect().height : 0
  });
  wurzel.style.height = `${hoehe}px`;
}

function baueKopf(fuehrung) {
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
  kopf.appendChild(fuehrungstitel);
  return kopf;
}

function baueNav(fuehrung, letzteNr) {
  const nav = document.createElement('nav');
  nav.className = 'fuehrung-nav';
  nav.setAttribute('aria-label', 'Stationsnavigation');
  const hoch = document.createElement('a');
  hoch.href = baueHash(['fuehrungen', fuehrung.fuehrung_id, String(letzteNr)]);
  hoch.className = 'fuehrung-nav-pfeil';
  hoch.textContent = '▲';
  hoch.title = 'Letzte Station';
  hoch.setAttribute('aria-label', 'Letzte Station');
  const fortschritt = document.createElement('span');
  fortschritt.className = 'fuehrung-nav-fortschritt';
  fortschritt.textContent = 'Ende';
  const uebersicht = document.createElement('a');
  uebersicht.href = baueHash(['fuehrungen']);
  uebersicht.className = 'fuehrung-nav-pfeil fuehrung-nav-uebersicht';
  uebersicht.textContent = 'Zur Übersicht';
  nav.append(hoch, fortschritt, uebersicht);
  return nav;
}

// "Selbst erkunden": alle vertiefung-Links aller Stationen, ohne Dubletten
// (dedupliziert ueber den aufgeloesten href) - ungueltige Pfade (fehler
// gesetzt, siehe fuehrungenDaten.js' parseVertiefung()) erscheinen als
// derselbe Pruefregel-Hinweis wie auf den Stationen.
function baueSelbstErkunden(fuehrung) {
  const gesehen = new Set();
  const eintraege = [];
  fuehrung.stationen.forEach((station) => station.vertiefung.forEach((eintrag) => {
    const schluessel = eintrag.href || eintrag.fehler;
    if (gesehen.has(schluessel)) return;
    gesehen.add(schluessel);
    eintraege.push(eintrag);
  }));
  if (eintraege.length === 0) return null;
  const abschnitt = document.createElement('section');
  abschnitt.className = 'fuehrung-vertiefung';
  const titel = document.createElement('h3');
  titel.textContent = 'Selbst erkunden';
  abschnitt.appendChild(titel);
  eintraege.forEach(({ href, beschriftung, fehler }) => {
    if (fehler) {
      const box = document.createElement('p');
      box.className = 'fuehrung-fehler';
      box.textContent = fehler;
      abschnitt.appendChild(box);
      return;
    }
    const link = document.createElement('a');
    link.className = 'fuehrung-vertiefung-link';
    link.href = href;
    link.textContent = beschriftung;
    abschnitt.appendChild(link);
  });
  return abschnitt;
}

// "Zum Weiterlesen": weiterlesen-Eintraege (bereits gegen literatur.csv
// aufgeloest, siehe fuehrungenDaten.js' parseWeiterlesen()). Externer Link
// (falls vorhanden) mit Symbol + target="_blank"/rel="noopener" als extern
// gekennzeichnet (Auftrag woertlich).
function baueWeiterlesen(fuehrung) {
  if (fuehrung.weiterlesen.length === 0) return null;
  const abschnitt = document.createElement('section');
  abschnitt.className = 'fuehrung-vertiefung';
  const titel = document.createElement('h3');
  titel.textContent = 'Zum Weiterlesen';
  abschnitt.appendChild(titel);
  fuehrung.weiterlesen.forEach(({ record, fehler }) => {
    if (fehler) {
      const box = document.createElement('p');
      box.className = 'fuehrung-fehler';
      box.textContent = fehler;
      abschnitt.appendChild(box);
      return;
    }
    const p = document.createElement('p');
    const angabe = [record.autor, record.titel, record.jahr].filter(Boolean).join(', ');
    if (record.link) {
      const link = document.createElement('a');
      link.href = record.link;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = `${angabe} ↗`;
      link.setAttribute('aria-label', `${angabe}, externer Link, öffnet in neuem Tab`);
      p.appendChild(link);
    } else {
      p.textContent = angabe;
    }
    abschnitt.appendChild(p);
  });
  return abschnitt;
}

export function render(container, fuehrung) {
  container.innerHTML = '';
  loescheZustand();
  const wurzel = document.createElement('div');
  wurzel.className = 'fuehrung-station';
  container.appendChild(wurzel);

  const haupt = document.createElement('div');
  haupt.className = 'fuehrung-station-haupt';
  haupt.appendChild(baueKopf(fuehrung));

  const inhalt = document.createElement('div');
  inhalt.className = 'fuehrung-erzaehltext fuehrung-abschluss-inhalt';
  inhalt.tabIndex = -1;
  const ueberschrift = document.createElement('h2');
  ueberschrift.textContent = 'Ende der Führung';
  const leitfrage = document.createElement('p');
  leitfrage.className = 'fuehrung-abschluss-leitfrage';
  leitfrage.textContent = fuehrung.leitfrage;
  inhalt.append(ueberschrift, leitfrage);
  const erkunden = baueSelbstErkunden(fuehrung);
  if (erkunden) inhalt.appendChild(erkunden);
  const weiterlesen = baueWeiterlesen(fuehrung);
  if (weiterlesen) inhalt.appendChild(weiterlesen);
  haupt.appendChild(inhalt);

  const letzteNr = fuehrung.stationen[fuehrung.stationen.length - 1].station_nr;
  wurzel.append(haupt, baueNav(fuehrung, letzteNr));
  inhalt.focus();
  passeGroesseAn(wurzel);

  return { destroy: () => {}, resize: () => passeGroesseAn(wurzel) };
}
