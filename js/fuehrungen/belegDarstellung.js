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
//   `.bestand-sidebar-feld-label`, deren Regeln sidebar.js' fuegeSidebarStyleEin()
//   liefert - vom Aufrufer EINMAL pro
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
import { baueDatensatzLink, TYP_ANZEIGE } from '../utils/datensatzAufruf.js';
import { baueUnsicherheitAbsatz } from '../utils/unsicherAbsatz.js';
import { baueVerlinkteNamen } from '../utils/genanntePersonen.js';

// AUFTRAG "Fuehrungen, Teil 2b", Punkt 5: Linkbeschriftung je Belegtyp aus
// der Freigabe (buergerbuch verlinkt wie person, siehe baueArchivLink()
// unten). TYP_ANZEIGE (K1, Teil 2c) kommt zentral aus datensatzAufruf.js -
// dieselbe Quelle wie die Quellenzeile unten, keine zweite Beschriftungs-
// Stelle im Code.
// AUFTRAG "Teil 2f", Punkt 2: "Im Stammbaum ansehen" (Auftrag wörtlich).
// AUFTRAG "Teil 2g", Punkt 4: `buergerbuch` entfallen (Auftrag wörtlich:
// "Der bisherige Link 'Alle Einträge zu dieser Person' in der Quellenzeile
// entfällt, da der Name selbst verlinkt ist" - siehe baueBuergerbuchInhalt()/
// baueArchivLink() unten).
const LINKTEXT = {
  person: 'Alle Einträge zu dieser Person',
  familie: 'Im Stammbaum ansehen'
};

// K2 (Teil 2c): "JJJJ_MM_TT" (urkunde) oder "JJJJ-MM-TT" (buergerbuch) bzw.
// ein reines Jahr (inventar/person) - MM/TT "00" oder fehlend heisst
// unbekannt, wird NICHT ergaenzt/geraten. Nur hier verwendet (Nicht-Ziel:
// Darstellung in anderen Modulen bleibt unveraendert) - im Projekt existiert
// keine bereits geteilte, wiederverwendbare Hilfsfunktion fuer diesen
// Zweck (kalenderHeatmap.js' MONATSNAMEN_VOLL ist lokal/nicht exportiert
// und arbeitet auf bereits geparsten {jahr,monat,tag}, nicht auf rohen
// Datumstexten unterschiedlicher Quell-Formate).
const MONATSNAMEN = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function formatiereDatum(rohwert) {
  const teile = (rohwert || '').split(/[_-]/).map(Number);
  const [jahr, monat, tag] = teile;
  if (!jahr) return rohwert || '';
  if (monat > 0 && tag > 0) return `${tag}. ${MONATSNAMEN[monat - 1]} ${jahr}`;
  if (monat > 0) return `${MONATSNAMEN[monat - 1]} ${jahr}`;
  return String(jahr);
}

// bild bekommt keinen Link (Auftrag woertlich). buergerbuch bekommt seit
// Teil 2g, Punkt 4 KEINEN Quellenzeilen-Link mehr - der Name ist jetzt
// direkt im Feld "Name" verlinkt (siehe baueBuergerbuchInhalt() unten),
// ein zweiter Link auf dieselbe Person in der Quellenzeile waere redundant
// (Auftrag woertlich).
function baueArchivLink(beleg) {
  if (beleg.typ === 'bild' || beleg.typ === 'buergerbuch' || !beleg.record) return null;
  const href = baueDatensatzLink(beleg.typ, beleg.id);
  if (!href) return null;
  const link = document.createElement('a');
  link.className = 'fuehrung-beleg-archivlink';
  link.href = href;
  link.textContent = LINKTEXT[beleg.typ] || 'Im Archiv ansehen';
  link.setAttribute('aria-label', `${TYP_ANZEIGE[beleg.typ] || beleg.typ} ${beleg.id}: ${link.textContent}`);
  return link;
}

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

// AUFTRAG "Teil 2g", Punkt 4: wie feld() oben, aber der Wert ist bereits
// fertiger DOM-Inhalt (verlinkte Namen aus genanntePersonen.js) statt eines
// reinen Textstrings - eigene Funktion statt feld() um einen optionalen
// Node-Parameter zu erweitern, damit dessen bestehende, einfache Signatur
// (Label, Text) an allen anderen Aufrufstellen unveraendert bleibt.
function feldMitKnoten(label, knoten) {
  const el = document.createElement('div');
  el.className = 'bestand-sidebar-feld';
  const labelEl = document.createElement('div');
  labelEl.className = 'bestand-sidebar-feld-label';
  labelEl.textContent = label;
  const wertEl = document.createElement('div');
  wertEl.appendChild(knoten);
  el.append(labelEl, wertEl);
  return el;
}

function alsText(wert) {
  return Array.isArray(wert) ? wert.join('; ') : (wert || '');
}

function baueFehlerBox(fehlertext) {
  const box = document.createElement('p');
  box.className = 'fuehrung-fehler';
  box.textContent = fehlertext;
  return box;
}

// Quellenzeile: Typ, ID, Datum/Zeitraum (Punkt 4, Auftrag wörtlich), dazu
// (Teil 2b, Punkt 5) ein eigenes <a> statt textContent - NICHT der ganze
// Belegbereich klickbar, damit ein Klick auf ein Urkundenfoto weiterhin die
// Lightbox oeffnet (siehe baueBildInhalt() unten).
function baueQuellenzeile(beleg, datumWert) {
  const zeile = document.createElement('p');
  zeile.className = 'fuehrung-beleg-quellenzeile';
  const teile = [TYP_ANZEIGE[beleg.typ] || beleg.typ, beleg.id, datumWert].filter(Boolean);
  zeile.appendChild(document.createTextNode(teile.join(' · ')));
  const link = baueArchivLink(beleg);
  if (link) {
    zeile.appendChild(document.createTextNode(' · '));
    zeile.appendChild(link);
  }
  return zeile;
}

// AUFTRAG "Teil 2g", Punkt 4: Name UND jede:r Buerge verlinkt zur
// Personenliste. `Buergen` (Freitext, z. B. "Hanns Holzinger, Philip
// Niderholzer, Ambrosy Druml.") ist NICHT index-parallel zu `buergen_id`
// (Pipe-Liste) - anders als bei urkunde/personen_id kann der Anzeigename
// hier deshalb nicht direkt aus dem Record gezippt werden. Stattdessen wird
// jede buergen_id ueber `personenKarte` (von fuehrungenDaten.js' parseBeleg()
// mitgegeben, dieselbe Karte wie fuer `person`-Belege) zum kanonischen
// Namen aus personenliste.csv aufgeloest - Buergen faellt dadurch als
// separates Feld weg, die Namen stehen stattdessen (verlinkt) im Feld
// "Buergen" selbst.
function ermittleBuergenNamen(buergenIds, personenKarte) {
  const ids = Array.isArray(buergenIds) ? buergenIds : (buergenIds ? [buergenIds] : []);
  return ids.map((id) => {
    const schreibweisen = personenKarte.get(id)?.schreibweisen;
    // Erste (kanonische) Schreibweise als Anzeigename - nicht alle Varianten
    // zusammen (per Semikolon), das waere als EIN Linktext unpassend.
    const name = Array.isArray(schreibweisen) ? schreibweisen[0] : (schreibweisen || id);
    return { id, name };
  });
}

function baueBuergerbuchInhalt(r, personenKarte) {
  const wrapper = document.createElement('div');
  wrapper.append(
    feldMitKnoten('Name', baueVerlinkteNamen([{ name: r.Name, id: r.personen_id }])),
    feld('Datum', r.Datum ? formatiereDatum(r.Datum) : '(ohne Datum)')
  );
  if (r.Beruf) wrapper.appendChild(feld('Beruf', r.Beruf));
  if (r.Ort) wrapper.appendChild(feld('Ort', r.Ort));
  if (r.buergen_id) {
    wrapper.appendChild(feldMitKnoten('Bürgen', baueVerlinkteNamen(ermittleBuergenNamen(r.buergen_id, personenKarte))));
  } else if (r.Buergen && alsText(r.Buergen).trim()) {
    // Seltener Datenrandfall: Buergen-Freitext ohne buergen_id - unverlinkt
    // wie bisher zeigen, statt Information stillschweigend zu verlieren.
    wrapper.appendChild(feld('Bürgen', alsText(r.Buergen)));
  }
  const hinweis = baueUnsicherheitAbsatz(r, ['Datum_unsicher', 'Beruf_unsicher', 'orte_unsicher']);
  if (hinweis) wrapper.appendChild(hinweis);
  return wrapper;
}

// AUFTRAG "Teil 2h", Punkt 4b: Name verlinkt zur Personenliste, sobald
// `personen_id` vorliegt - analog zu baueBuergerbuchInhalt()'s Name-Feld.
// personen_id_unsicher wird hier NICHT extra angezeigt (kein `_unsicher`-
// Symbol neben dem Namen wie bei urkunde/buergerbuch): aktuell (Stand
// Punkt 4b) ist bei allen 68 Inventaren personen_id_unsicher "nein", ein
// eigenes Unsicher-Symbol für dieses Feld wäre unbelegter Vorgriff.
function baueInventarInhalt(r) {
  const wrapper = document.createElement('div');
  wrapper.append(
    feldMitKnoten('Name', baueVerlinkteNamen([{ name: r.Name, id: r.personen_id }])),
    feld('Jahr', formatiereDatum(r.Jahr))
  );
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
    feld('Erste Nennung', formatiereDatum(r.erste_nennung)),
    feld('Letzte Nennung', formatiereDatum(r.letzte_nennung)),
    feld('Anzahl Nennungen', r.anzahl_nennungen)
  );
  const hinweis = baueUnsicherheitAbsatz(r, []);
  if (hinweis) wrapper.appendChild(hinweis);
  return wrapper;
}

// AUFTRAG "Teil 2f", Punkt 2: `familie`-Beleg (data/familien.csv, der
// Habsburg-Stammbaum) - Name, Titel, Geburts-/Sterbedatum (bereits als
// lesbarer Text in familien.csv hinterlegt, z. B. "9. September 1349 oder
// 1350" - KEIN formatiereDatum() anwendbar, anderes Format als
// urkunde/buergerbuch/inventar/person), Eltern und Ehepartner ALS NAMEN
// (über die IDs aufgelöst, `familienKarte` kommt von fuehrungenDaten.js'
// parseBeleg(), siehe dortiger Kommentar), Anmerkung.
function ermittleFamilienNamen(rohIds, familienKarte) {
  const ids = Array.isArray(rohIds) ? rohIds : (rohIds ? [rohIds] : []);
  return ids.map((id) => familienKarte.get(id)?.name || id);
}

function baueFamilieInhalt(r, familienKarte) {
  const wrapper = document.createElement('div');
  wrapper.appendChild(feld('Name', r.name));
  if (r.titel) wrapper.appendChild(feld('Titel', r.titel));
  if (r.geburtsdatum) wrapper.appendChild(feld('Geburtsdatum', r.geburtsdatum));
  if (r.sterbedatum) wrapper.appendChild(feld('Sterbedatum', r.sterbedatum));
  const eltern = ermittleFamilienNamen([r.vater_id, r.mutter_id].filter(Boolean), familienKarte);
  if (eltern.length > 0) wrapper.appendChild(feld('Eltern', eltern.join('; ')));
  const ehepartner = ermittleFamilienNamen(r.ehepartner_id, familienKarte);
  if (ehepartner.length > 0) wrapper.appendChild(feld('Ehepartner', ehepartner.join('; ')));
  if (r.anmerkung) wrapper.appendChild(feld('Anmerkung', r.anmerkung));
  const hinweis = baueUnsicherheitAbsatz(r, [
    'geburtsdatum_unsicher', 'sterbedatum_unsicher', 'ehepartner_id_unsicher', 'vater_id_unsicher', 'mutter_id_unsicher'
  ]);
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
  // K2 (Teil 2c): urkunde nutzt datum_normiert ("JJJJ_MM_TT", Tag/Monat "00"
  // bei Unbekannt) statt des rohen `datum`-Textfelds (dort historische
  // Schreibweisen wie roemische Monatszahlen) - genau fuer diesen Zweck
  // angelegt, siehe docs/SCHEMA.md.
  const datumFelder = {
    urkunde: formatiereDatum(r.datum_normiert),
    buergerbuch: formatiereDatum(r.Datum),
    inventar: formatiereDatum(r.Jahr),
    bestand: r.zeitraum_text,
    person: formatiereDatum(r.erste_nennung)
    // familie: bewusst kein Eintrag - Geburts-/Sterbedatum stehen als
    // eigene Felder im Belegbereich (s.u.), nicht redundant in der
    // Quellenzeile (Auftrag nennt dort nur "Stammbaum" als Bezeichnung).
  };
  bereich.appendChild(baueQuellenzeile(beleg, datumFelder[beleg.typ]));

  const scroll = baueScrollWrapper();
  if (beleg.typ === 'urkunde') {
    // AUFTRAG "Teil 2i": die vormals hier zusätzlich gebaute "Genannte
    // Personen"-Zeile entfernt - baueUrkundenDetailInhalt() (sidebar.js)
    // liefert die verlinkte Personenzeile seit Teil 2h bereits selbst, eine
    // zweite Zeile daneben war redundant (Auftrag "Teil 2g", Punkt 4, ging
    // noch von einer unveränderten sidebar.js ohne eigene Verlinkung aus).
    scroll.appendChild(baueUrkundenDetailInhalt(r));
  } else if (beleg.typ === 'buergerbuch') scroll.appendChild(baueBuergerbuchInhalt(r, beleg.personenKarte));
  else if (beleg.typ === 'inventar') scroll.appendChild(baueInventarInhalt(r));
  else if (beleg.typ === 'bestand') scroll.appendChild(baueBestandInhalt(r));
  else if (beleg.typ === 'person') scroll.appendChild(bauePersonInhalt(r));
  else if (beleg.typ === 'familie') scroll.appendChild(baueFamilieInhalt(r, beleg.familienKarte));
  bereich.appendChild(scroll);
  return bereich;
}
