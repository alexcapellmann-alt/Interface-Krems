// js/fuehrungen/fuehrungenGalerie.js
// AUFTRAG "Führungen, Teil 2a", Punkt 3: Übersichtsgalerie aller Führungen,
// nach `themenbereich` gruppiert. Gestaltung an renderBestandTab()s/
// erzeugeGalerieFlyoutKontext()s Kachelraster angelehnt (eigene, schlankere
// Kacheln - die bestehende Maschinerie selbst wird NICHT wiederverwendet,
// sie ist für "Galerie -> Flyout mit mehreren VISUALISIERUNGEN" gebaut,
// Führungen brauchen stattdessen "Galerie -> EINE Station" - ein
// grundverschiedenes zweites Navigationsziel, siehe Selbstauskunft im Chat).

import { navigiereZu } from '../core/router.js';
import { ladeFuehrungenDaten } from './fuehrungenDaten.js';
import { ladeFotos } from '../utils/fotoOrdner.js';

async function ermittleKachelBild(fuehrung) {
  const ersterBeleg = fuehrung.stationen[0]?.belege[0];
  if (!ersterBeleg || ersterBeleg.fehler) return null;
  if (ersterBeleg.typ === 'bild') return ersterBeleg.id;
  if (ersterBeleg.typ === 'urkunde') {
    const fotos = await ladeFotos(ersterBeleg.record.foto_ordner);
    return fotos[0] || null;
  }
  return null;
}

function baueKachel(fuehrung, bildUrl) {
  const kachel = document.createElement('button');
  kachel.type = 'button';
  kachel.className = 'fuehrung-kachel';
  kachel.setAttribute('aria-label', fuehrung.fuehrung_titel || fuehrung.fuehrung_id);

  if (bildUrl) {
    const img = document.createElement('img');
    img.className = 'fuehrung-kachel-bild';
    img.src = bildUrl;
    img.alt = '';
    kachel.appendChild(img);
  } else {
    const platzhalter = document.createElement('div');
    platzhalter.className = 'fuehrung-kachel-bild fuehrung-kachel-bild-neutral';
    kachel.appendChild(platzhalter);
  }

  if (fuehrung.status === 'entwurf') {
    const badge = document.createElement('span');
    badge.className = 'fuehrung-kachel-entwurf';
    badge.textContent = 'Entwurf';
    kachel.appendChild(badge);
  }

  const titel = document.createElement('h3');
  titel.textContent = fuehrung.fuehrung_titel || fuehrung.fuehrung_id;
  const beschreibung = document.createElement('p');
  beschreibung.textContent = fuehrung.kurzbeschreibung;
  const zeitraum = document.createElement('p');
  zeitraum.className = 'fuehrung-kachel-zeitraum';
  zeitraum.textContent = fuehrung.zeitraum;
  kachel.append(titel, beschreibung, zeitraum);

  if (fuehrung.kurzbeschreibungZuLang) {
    const hinweis = document.createElement('p');
    hinweis.className = 'fuehrung-fehler';
    hinweis.textContent = 'kurzbeschreibung ist länger als 300 Zeichen.';
    kachel.appendChild(hinweis);
  }

  kachel.addEventListener('click', () => navigiereZu(['fuehrungen', fuehrung.fuehrung_id, '1']));
  return kachel;
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

export async function render(container, { hinweis } = {}) {
  container.innerHTML = '';
  const wurzel = document.createElement('div');
  wurzel.className = 'fuehrungen-galerie';
  container.appendChild(wurzel);

  if (hinweis) {
    const hinweisEl = document.createElement('p');
    hinweisEl.className = 'fuehrung-fehler fuehrungen-galerie-hinweis';
    hinweisEl.textContent = hinweis;
    wurzel.appendChild(hinweisEl);
  }

  const { fuehrungen } = await ladeFuehrungenDaten();
  const gruppen = gruppiereNachThemenbereich(fuehrungen);

  for (const [themenbereich, gruppe] of gruppen) {
    const abschnitt = document.createElement('section');
    const ueberschrift = document.createElement('h2');
    ueberschrift.className = 'fuehrungen-galerie-gruppentitel';
    ueberschrift.textContent = themenbereich;
    abschnitt.appendChild(ueberschrift);

    const raster = document.createElement('div');
    raster.className = 'fuehrungen-galerie-raster';
    const bilder = await Promise.all(gruppe.map(ermittleKachelBild));
    gruppe.forEach((fuehrung, i) => raster.appendChild(baueKachel(fuehrung, bilder[i])));
    abschnitt.appendChild(raster);
    wurzel.appendChild(abschnitt);
  }

  return { destroy: () => { container.innerHTML = ''; } };
}
