// js/fuehrungen/belegDarstellung.js
// AUFTRAG "Führungen, Teil 2a", Punkt 4: baut den Belegbereich EINER Station
// (ein oder zwei Belege). Wiederverwendung der Sidebar-Feldformatierung
// SOWEIT OHNE ÄNDERUNG an js/utils/sidebar.js möglich (Auftrag wörtlich):
// - `urkunde` nutzt sidebar.js' bereits EXPORTIERTES baueUrkundenDetailInhalt()
//   direkt (Regest/Orte/Fotos+Lightbox/Unsicherheit sind darin bereits fertig
//   gebaut, keine Neuimplementierung).
// - `bestand`/`buergerbuch`/`inventar`/`person`/`bild`, für die es in
//   sidebar.js keinen passenden Baustein gibt (baueSidebarInhalt() böte sich
//   für `bestand` an, baut dabei aber IMMER Kategorie-Badges mit - ohne
//   `kategorieFarbe`, die hier fachlich keinen Sinn ergibt, stürzt deren
//   Textkontrast-Berechnung ab, live gefunden - siehe Selbstauskunft im
//   Chat), werden hier NEUE, aber optisch
//   IDENTISCHE Felder gebaut (dieselben CSS-Klassen `.bestand-sidebar-feld`/
//   `.bestand-sidebar-feld-label`/`.bestand-sidebar-unsicher`, deren Regeln
//   sidebar.js' fuegeSidebarStyleEin() liefert - vom Aufrufer EINMAL pro
//   Stationsaufbau eingebunden, siehe fuehrungStation.js) - keine
//   sidebar.js-Änderung nötig, weil diese Klassen bereits als eigenständige,
//   nicht auf `.bestand-sidebar` verschachtelte Selektoren definiert sind.
// Kein `innerHTML` mit CSV-Inhalten irgendwo in dieser Datei (Punkt 2,
// Auftrag wörtlich) - ausschließlich `textContent`/DOM-Erzeugung.
//
// KORREKTURAUFTRAG "Führungen, Teil 2a-K – Bildschirmfüllendes Layout":
// Scope hier laut Auftrag AUSSCHLIESSLICH "Größenverhalten von Bildern und
// langen Belegtexten". `.fuehrung-beleg` bekommt eine neue innere Struktur:
// Quellenzeile/Fehlerbox bleiben FEST sichtbar oben, der eigentliche
// typspezifische Inhalt (inkl. des wiederverwendeten `baueUrkundenDetailInhalt()`)
// wandert in einen neuen `.fuehrung-beleg-scroll`-Wrapper (`tabindex=0`,
// scrollt intern bei Bedarf - `css/components.css` macht daraus per
// `flex:1;min-height:0;overflow-y:auto` den eigentlichen Höhenbegrenzer,
// siehe fuehrungStation.js' Dateikopf-Kommentar für die volle Höhen-
// Verteilungskette). Bilder (sowohl der eigene `bild`-Belegtyp als auch das
// wiederverwendete Urkundenfoto aus `sidebar.js`) bekommen `object-fit:
// contain` samt Höhendeckel (`components.css`, dort per spezifischerem
// Selektor `.fuehrung-beleg-scroll .bestand-sidebar-foto-haupt` überschrieben
// - KEINE Änderung an `sidebar.js` selbst nötig).

import { baueUrkundenDetailInhalt } from '../utils/sidebar.js';
import { oeffneLightbox } from '../utils/lightbox.js';

function feld(label, wert) {
  const el = document.createElement('div');
  el.className = 'bestand-sidebar-feld';
  const labelEl = document.createElement('div');
  labelEl.className = 'bestand-sidebar-feld-label';
  labelEl.textContent = label;
  const wertEl = document.createElement('div');
  wertEl.textContent = wert;
  el.append(labelEl, wertEl);
  return el;
}

function alsText(wert) {
  return Array.isArray(wert) ? wert.join('; ') : (wert || '');
}

// Punkt 4 (Unsicherheitsfelder wie in den Sidebars): `_unsicher`-Flags ODER
// befüllte unsicherheit_anmerkung -> derselbe Hinweis-Absatz wie sidebar.js.
function baueUnsicherheitAbsatz(record, unsicherFelder) {
  const istUnsicher = unsicherFelder.some((f) => record[f]) || Boolean(alsText(record.unsicherheit_anmerkung).trim());
  if (!istUnsicher) return null;
  const p = document.createElement('p');
  p.className = 'bestand-sidebar-unsicher';
  const anmerkung = alsText(record.unsicherheit_anmerkung);
  p.textContent = `Achtung: Angaben unsicher${anmerkung ? ` – ${anmerkung}` : ''}`;
  return p;
}

function baueFehlerBox(fehlertext) {
  const box = document.createElement('p');
  box.className = 'fuehrung-fehler';
  box.textContent = fehlertext;
  return box;
}

// Quellenzeile: Typ, ID, Datum/Zeitraum (Punkt 4, Auftrag wörtlich).
function baueQuellenzeile(beleg, datumWert) {
  const zeile = document.createElement('p');
  zeile.className = 'fuehrung-beleg-quellenzeile';
  const teile = [beleg.typ, beleg.id, datumWert].filter(Boolean);
  zeile.textContent = teile.join(' · ');
  return zeile;
}

function baueBuergerbuchInhalt(r) {
  const wrapper = document.createElement('div');
  wrapper.append(
    feld('Name', r.Name),
    feld('Datum', r.Datum || '(ohne Datum)')
  );
  if (r.Beruf) wrapper.appendChild(feld('Beruf', r.Beruf));
  if (r.Ort) wrapper.appendChild(feld('Ort', r.Ort));
  if (r.Buergen && alsText(r.Buergen).trim()) wrapper.appendChild(feld('Bürgen', alsText(r.Buergen)));
  const hinweis = baueUnsicherheitAbsatz(r, ['Datum_unsicher', 'Beruf_unsicher', 'orte_unsicher']);
  if (hinweis) wrapper.appendChild(hinweis);
  return wrapper;
}

function baueInventarInhalt(r) {
  const wrapper = document.createElement('div');
  wrapper.append(feld('Name', r.Name), feld('Jahr', r.Jahr));
  if (r['Beruf/Funktion/Stand']) wrapper.appendChild(feld('Beruf/Funktion/Stand', r['Beruf/Funktion/Stand']));
  if (r.Vermoegensgruppe) wrapper.appendChild(feld('Vermögensgruppe', r.Vermoegensgruppe));
  const hinweis = baueUnsicherheitAbsatz(r, []);
  if (hinweis) wrapper.appendChild(hinweis);
  return wrapper;
}

// Bewusst NICHT baueSidebarInhalt() (obwohl exportiert): die baut zusätzlich
// Kategorie-Badges (baueSidebarBadges()), die eine Farbe voraussetzen - ohne
// `kategorieFarbe` (hier nicht sinnvoll übergebbar, Führungen kennen keine
// bkk_kategorie-Farbzuordnung) stürzt passendeTextfarbe() beim Auflösen der
// Textkontrastfarbe ab (live gefunden, siehe Selbstauskunft im Chat). Punkt 4
// verlangt für `bestand` ohnehin nur Name/Zitierweise/Zeitraum/Umfang/
// Kurzbeschreibung, keine Badges - eigene Feldliste wie bei den anderen
// Typen ohne sidebar.js-Baustein.
function baueBestandInhalt(r) {
  const wrapper = document.createElement('div');
  wrapper.appendChild(feld('Name', r.name));
  const zeitraum = [r.zeitraum_von, r.zeitraum_bis].filter(Boolean).join('–') || r.zeitraum_text;
  if (zeitraum) wrapper.appendChild(feld('Zeitraum', zeitraum));
  if (r.umfang) wrapper.appendChild(feld('Umfang', r.umfang));
  if (r.zitierweise) wrapper.appendChild(feld('Zitierweise', r.zitierweise));
  if (r.kurzbeschreibung) wrapper.appendChild(feld('Kurzbeschreibung', r.kurzbeschreibung));
  const hinweis = baueUnsicherheitAbsatz(r, ['daten_unsicher']);
  if (hinweis) wrapper.appendChild(hinweis);
  return wrapper;
}

function bauePersonInhalt(r) {
  const wrapper = document.createElement('div');
  wrapper.append(
    feld('Schreibweisen', alsText(r.schreibweisen)),
    feld('Erste Nennung', r.erste_nennung),
    feld('Letzte Nennung', r.letzte_nennung),
    feld('Anzahl Nennungen', r.anzahl_nennungen)
  );
  const hinweis = baueUnsicherheitAbsatz(r, []);
  if (hinweis) wrapper.appendChild(hinweis);
  return wrapper;
}

// Punkt 1 (siehe Dateikopf-Kommentar): eigener Flex-Wrapper um das <img> -
// zentriert es innerhalb der verfügbaren Fläche, `object-fit:contain`
// (components.css) sorgt für unverzerrte, vollständige Darstellung.
function baueBildInhalt(pfad, bildText) {
  const wrapper = document.createElement('div');
  wrapper.className = 'fuehrung-beleg-bild-rahmen';
  const img = document.createElement('img');
  img.className = 'fuehrung-beleg-bild';
  img.src = pfad;
  img.alt = bildText || '';
  img.tabIndex = 0;
  img.addEventListener('click', () => oeffneLightbox([{ url: pfad, alt: bildText || '' }], 0));
  wrapper.appendChild(img);
  if (bildText) {
    const caption = document.createElement('p');
    caption.className = 'fuehrung-beleg-bildunterschrift';
    caption.textContent = bildText;
    wrapper.appendChild(caption);
  }
  return wrapper;
}

// Punkt 1 (siehe Dateikopf-Kommentar): der eigentliche, potenziell lange
// Inhalt (Bild ODER typspezifische Felder) steht IMMER in diesem
// scrollbaren Wrapper - Quellenzeile/Fehlerbox (fest sichtbar) bleiben
// außerhalb, direkt in `.fuehrung-beleg`.
function baueScrollWrapper() {
  const scroll = document.createElement('div');
  scroll.className = 'fuehrung-beleg-scroll';
  scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', 'Belegdetails, bei Bedarf scrollbar');
  return scroll;
}

// Baut den vollständigen Belegbereich (Fehlerbox bei ungültigem Beleg,
// sonst Quellenzeile + typspezifischer Inhalt) für EINEN Beleg.
export function baueBelegBereich(beleg, bildText) {
  const bereich = document.createElement('div');
  bereich.className = 'fuehrung-beleg';

  if (beleg.fehler) bereich.appendChild(baueFehlerBox(beleg.fehler));

  if (beleg.typ === 'bild') {
    const scroll = baueScrollWrapper();
    scroll.appendChild(baueBildInhalt(beleg.id, bildText));
    bereich.appendChild(scroll);
    return bereich;
  }
  if (!beleg.record) return bereich; // unbekannter Typ/ID nicht gefunden - nur die Fehlerbox oben

  const r = beleg.record;
  const datumFelder = { urkunde: r.datum, buergerbuch: r.Datum, inventar: r.Jahr, bestand: r.zeitraum_text, person: r.erste_nennung };
  bereich.appendChild(baueQuellenzeile(beleg, datumFelder[beleg.typ]));

  const scroll = baueScrollWrapper();
  if (beleg.typ === 'urkunde') scroll.appendChild(baueUrkundenDetailInhalt(r));
  else if (beleg.typ === 'buergerbuch') scroll.appendChild(baueBuergerbuchInhalt(r));
  else if (beleg.typ === 'inventar') scroll.appendChild(baueInventarInhalt(r));
  else if (beleg.typ === 'bestand') scroll.appendChild(baueBestandInhalt(r));
  else if (beleg.typ === 'person') scroll.appendChild(bauePersonInhalt(r));
  bereich.appendChild(scroll);
  return bereich;
}
