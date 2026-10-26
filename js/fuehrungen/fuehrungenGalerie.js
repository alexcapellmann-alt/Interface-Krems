// js/fuehrungen/fuehrungenGalerie.js
// Übersicht aller Führungen: ein bildschirmfüllendes Raster mit EINEM Feld je
// Führungs-Kategorie (`themenbereich` aus fuehrungen.csv - die Zahl der Felder
// ergibt sich aus den Daten, nichts ist fest verdrahtet). Beim Überfahren mit
// der Maus zeigt ein Feld die Titel der enthaltenen Führungen, ein Klick auf
// einen Titel öffnet die Führung (Station 1).
//
// Zugänglichkeit: Hover allein ist nicht tastatur- und touchtauglich. Jedes
// Feld hat deshalb einen Kopf-Button (aria-expanded), der die Titelliste
// dauerhaft öffnet/schließt; die Liste ist außerdem bei Fokus innerhalb des
// Feldes sichtbar. Geschlossene Listen sind `visibility: hidden` und damit
// auch aus der Tab-Reihenfolge genommen.
//
// Vorher (Teil 2a, Punkt 3): Kachelraster je Kategorie mit Bild, Titel,
// Kurzbeschreibung und Zeitraum je Führung.

import { baueFuehrungHinweisBox } from './fuehrungHinweisBox.js'; // AUFTRAG D, Punkt 4
import { navigiereZu } from '../core/router.js';
import { ladeFuehrungenDaten } from './fuehrungenDaten.js';
import { ermittleBildUrls } from '../utils/bilder.js';
import { ermittlePausierteFuehrung } from './fuehrungFortsetzen.js';
import { baueAnsichtWahl } from './fuehrungenAnsichtWahl.js';

function ermittleKachelBild(fuehrung) {
  const ersterBeleg = fuehrung.stationen[0]?.belege[0];
  if (!ersterBeleg || ersterBeleg.fehler) return null;
  if (ersterBeleg.typ === 'bild') return ersterBeleg.id;
  if (ersterBeleg.typ === 'urkunde') {
    return ermittleBildUrls(ersterBeleg.record)[0] || null;
  }
  return null;
}

function gruppiereNachThemenbereich(fuehrungen) {
  const reihenfolge = [];
  const gruppen = new Map();
  fuehrungen.forEach((f) => {
    if (!gruppen.has(f.themenbereich)) { gruppen.set(f.themenbereich, []); reihenfolge.push(f.themenbereich); }
    gruppen.get(f.themenbereich).push(f);
  });
  return reihenfolge.map((themenbereich) => [themenbereich, gruppen.get(themenbereich)]);
}

// Ein Eintrag der Titelliste: Titel (+ Entwurf-Markierung, Zeitraum), Klick
// führt zu Station 1; ggf. „Fortsetzen“ für eine pausierte Führung und der
// Prüfhinweis zur Kurzbeschreibung wie bisher an der Kachel.
function baueTitelEintrag(fuehrung, pausiert) {
  const li = document.createElement('li');
  li.className = 'fuehrungen-feld-eintrag';

  const link = document.createElement('button');
  link.type = 'button';
  link.className = 'fuehrungen-feld-titel';
  const titel = document.createElement('span');
  titel.textContent = fuehrung.fuehrung_titel || fuehrung.fuehrung_id;
  link.appendChild(titel);
  if (fuehrung.status === 'entwurf') {
    const badge = document.createElement('span');
    badge.className = 'fuehrung-kachel-entwurf';
    badge.textContent = 'Entwurf';
    link.appendChild(badge);
  }
  if (fuehrung.zeitraum) {
    const zeit = document.createElement('span');
    zeit.className = 'fuehrungen-feld-zeitraum';
    zeit.textContent = fuehrung.zeitraum;
    link.appendChild(zeit);
  }
  link.addEventListener('click', () => navigiereZu(['fuehrungen', fuehrung.fuehrung_id, '1']));
  li.appendChild(link);

  if (pausiert && pausiert.fuehrungId === fuehrung.fuehrung_id) {
    const fortsetzen = document.createElement('button');
    fortsetzen.type = 'button';
    fortsetzen.className = 'fuehrung-kachel-fortsetzen';
    fortsetzen.textContent = `Fortsetzen bei Station ${pausiert.stationNr}`;
    fortsetzen.addEventListener('click', () => navigiereZu(['fuehrungen', fuehrung.fuehrung_id, String(pausiert.stationNr)]));
    li.appendChild(fortsetzen);
  }
  if (fuehrung.kurzbeschreibungZuLang) {
    li.appendChild(baueFuehrungHinweisBox(`kurzbeschreibung von „${fuehrung.fuehrung_titel}“ ist länger als 300 Zeichen.`));
  }
  return li;
}

function baueFeld(themenbereich, gruppe, index, pausiert) {
  const feld = document.createElement('section');
  feld.className = 'fuehrungen-feld';
  const bild = gruppe.map(ermittleKachelBild).find(Boolean);
  // Absolute URL: eine relative url() in einer CSS-Variable würde sonst gegen
  // css/components.css aufgelöst (→ css/fotos/…, 404).
  if (bild) feld.style.setProperty('--fuehrungen-feld-bild', `url("${new URL(bild, document.baseURI).href}")`);

  const listenId = `fuehrungen-feld-liste-${index}`;
  const kopf = document.createElement('button');
  kopf.type = 'button';
  kopf.className = 'fuehrungen-feld-kopf';
  kopf.setAttribute('aria-expanded', 'false');
  kopf.setAttribute('aria-controls', listenId);
  const name = document.createElement('h2');
  name.className = 'fuehrungen-feld-name';
  name.textContent = themenbereich;
  const anzahl = document.createElement('span');
  anzahl.className = 'fuehrungen-feld-anzahl';
  anzahl.textContent = gruppe.length === 1 ? '1 Führung' : `${gruppe.length} Führungen`;
  kopf.append(name, anzahl);
  kopf.addEventListener('click', () => {
    const offen = !feld.classList.contains('offen');
    feld.classList.toggle('offen', offen);
    kopf.setAttribute('aria-expanded', String(offen));
  });

  const liste = document.createElement('ul');
  liste.className = 'fuehrungen-feld-liste';
  liste.id = listenId;
  gruppe.forEach((f) => liste.appendChild(baueTitelEintrag(f, pausiert)));

  // Esc schließt ein geöffnetes Feld und gibt den Fokus an den Kopf zurück.
  feld.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && feld.classList.contains('offen')) {
      feld.classList.remove('offen');
      kopf.setAttribute('aria-expanded', 'false');
      kopf.focus();
    }
  });

  feld.append(kopf, liste);
  return feld;
}

export async function render(container, { hinweis } = {}) {
  container.innerHTML = '';
  const wurzel = document.createElement('div');
  wurzel.className = 'fuehrungen-galerie';
  wurzel.appendChild(baueAnsichtWahl('themen')); // Umschalter zur Zeitleiste (fuehrungenZeitleiste.js)
  container.appendChild(wurzel);

  if (hinweis) {
    wurzel.appendChild(baueFuehrungHinweisBox(hinweis, { zusatzKlasse: 'fuehrungen-galerie-hinweis' }));
  }

  const { fuehrungen } = await ladeFuehrungenDaten();
  const gruppen = gruppiereNachThemenbereich(fuehrungen);
  const pausiert = ermittlePausierteFuehrung();

  const raster = document.createElement('div');
  raster.className = 'fuehrungen-felder';
  raster.style.setProperty('--fuehrungen-feld-anzahl', String(gruppen.length));
  gruppen.forEach(([themenbereich, gruppe], i) => raster.appendChild(baueFeld(themenbereich, gruppe, i, pausiert)));
  wurzel.appendChild(raster);

  return { destroy: () => { container.innerHTML = ''; } };
}
