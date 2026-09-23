// js/utils/datensatzAufruf.js
// AUFTRAG "Fuehrungen, Teil 2b", Punkt 4: zentraler, typbasierter Mechanismus
// fuer "Datensatz per URL oeffnen" (?datensatz=<typ>:<id>). Genau EINE Stelle
// (ZUORDNUNG unten) verknuepft Typ, Zielansicht und die schmale Oeffnen-
// Funktion, die das Zielmodul dafuer exportiert - faellt eine Zielansicht
// weg oder kommt eine neue hinzu, genuegt eine Aenderung hier (Auftrag
// woertlich). Jede Zielansicht wird zusaetzlich zur Laufzeit gegen die
// Registry (archivalienRegistry.js) geprueft: existiert der referenzierte
// Eintrag dort nicht mehr, entsteht ein sichtbarer Hinweis statt eines
// Fehlers - Voraussetzung dafuer, dass Fuehrungen laut Auftrag "nicht an
// einzelnen Ansichten haengen" duerfen.
//
// buergerbuch ist bewusst KEIN eigener Typ (Freigabe, PROJEKTLOG): ein
// Bürgerbuch-Beleg verlinkt stattdessen direkt auf typ:'person' mit der
// personen_id des Eintrags (siehe belegDarstellung.js). Ein direkter Aufruf
// mit ?datensatz=buergerbuch:... faellt hier auf den "Typ nicht unterstuetzt"-
// Hinweis zurueck (kein Eintrag in ZUORDNUNG).

import { ARCHIVALIENTYPEN, BESTAND_ANSICHTEN } from '../config/archivalienRegistry.js';

// Router-Pfadsegmente direkt (dasselbe Format wie ein Hash-Pfad ohne "#") -
// EINE gemeinsame Form fuer "bestand" (2 Segmente) UND "visualisierungen"
// (3 Segmente), dieselbe Form, die ermittleAnsicht()/ermittleVertiefungsLink()
// unten ohnehin schon brauchen. Vermeidet die vormals nötige Fallunter-
// scheidung nach Tab beim Aufloesen (siehe PROJEKTLOG: dort schlug die
// Zuordnung für "bestand" fehl, weil eine positionsabhängige Kurzform
// dieser Segmente an der falschen Stelle erwartet wurde).
const ZUORDNUNG = {
  urkunde: { segmente: ['visualisierungen', 'urkunden', 'zeitachse'] },
  inventar: { segmente: ['visualisierungen', 'verlassenschaften', 'parallelKoordinaten'] },
  bestand: { segmente: ['bestand', 'treemap'] },
  person: { segmente: ['visualisierungen', 'personen', 'personenliste'] }
};

// K1 (Teil 2c): lesbare Typbezeichnungen an EINER Stelle - fuer die
// Quellenzeile UND die Screenreader-Beschriftung der Archiv-Links
// (js/fuehrungen/belegDarstellung.js), statt interner Typnamen wie
// "buergerbuch". "bild" (Fuehrungs-eigener Belegtyp, kein ZUORDNUNG-
// Eintrag, siehe oben) ist hier trotzdem mit aufgenommen.
export const TYP_ANZEIGE = {
  urkunde: 'Urkunde',
  buergerbuch: 'Bürgerbuch',
  inventar: 'Verlassenschaftsinventar',
  bestand: 'Bestand',
  person: 'Person',
  bild: 'Abbildung'
};

// Deklinationshilfe nur fuer die Bereichs-Haelfte der Vertiefungslink-
// Beschriftung (Punkt 6, z.B. "der Urkunden"/"des Bestands") - reine
// Grammatik der ohnehin schon in archivalienRegistry.js vorhandenen
// Bereichs-Labels, keine eigenen Inhalte. Die Ansichts-Haelfte ("In der
// Zeitachse ...") verwendet bewusst durchgehend den (fuer die bisherigen wie
// kuenftigen Ansichtsnamen meist passenden) Artikel "der" - vollstaendige
// Deklination ueber beliebige, teils fremdsprachige Diagrammnamen hinweg
// (Sunburst, Sankey, Bump Chart, ...) ist ohne eigene, gepflegte
// Wortlisten nicht zuverlaessig automatisierbar.
const GENITIV_ARTIKEL = { urkunden: 'der', buergerbuch: 'des', verlassenschaften: 'der', personen: 'der', orte: 'der', bestand: 'des' };

function genitiv(label, schluessel) {
  const artikel = GENITIV_ARTIKEL[schluessel] || 'der';
  const nomen = artikel === 'des' && !label.endsWith('s') ? `${label}s` : label;
  return `${artikel} ${nomen}`;
}

// Loest ["visualisierungen","urkunden","zeitachse"] bzw. ["bestand","treemap"]
// gegen die Registry auf - EIN Parameter (Pfadsegmente-Array), EIN Aufrufweg
// fuer beide ZUORDNUNG-Eintraege UND ermittleVertiefungsLink() unten. Gibt
// null zurueck, wenn der Pfad dort nicht (mehr) existiert - der einzige Ort,
// an dem "existiert nicht" erkannt wird.
function ermittleAnsicht(segmente) {
  const [tab, a, b] = segmente || [];
  if (tab === 'bestand') {
    const ansicht = BESTAND_ANSICHTEN.find((x) => x.id === a);
    return ansicht ? { segmente: ['bestand', ansicht.id], label: ansicht.label, bereichLabel: null, bereichSchluessel: 'bestand' } : null;
  }
  if (tab === 'visualisierungen') {
    const archivalientyp = ARCHIVALIENTYPEN.find((x) => x.typ === a);
    const ansicht = archivalientyp?.ansichten.find((x) => x.id === b);
    return ansicht
      ? { segmente: ['visualisierungen', a, ansicht.id], label: ansicht.label, bereichLabel: archivalientyp.label, bereichSchluessel: a }
      : null;
  }
  return null;
}

function ermittleZielFuerTyp(typ) {
  return ermittleAnsicht(ZUORDNUNG[typ]?.segmente);
}

// Punkt 5: baut den Link-Href fuer einen Beleg. null, wenn der Typ nicht
// unterstuetzt wird oder die Zielansicht in der Registry fehlt (Aufrufer
// zeigt dann keinen Link, statt eines toten Links).
export function baueDatensatzLink(typ, id) {
  const ziel = ermittleZielFuerTyp(typ);
  if (!ziel) return null;
  return `#${ziel.segmente.join('/')}?datensatz=${encodeURIComponent(typ)}:${encodeURIComponent(id)}`;
}

// Punkt 6: baut Href + generierte Beschriftung fuer einen Vertiefungslink aus
// einem rohen Hash-Pfad ("#visualisierungen/urkunden/zeitachse" o. ae.).
// fehler ist gesetzt, wenn der Pfad nicht in der Registry existiert (neue
// Pruefregel, fuehrungenDaten.js zeigt fehler dann als sichtbaren Hinweis).
export function ermittleVertiefungsLink(rohPfad) {
  const segmente = (rohPfad || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  const ziel = ermittleAnsicht(segmente);
  if (!ziel) return { href: null, beschriftung: null, fehler: `Vertiefungslink „${rohPfad}" verweist auf keine vorhandene Ansicht.` };
  const beschriftung = ziel.bereichLabel
    ? `In der ${ziel.label} ${genitiv(ziel.bereichLabel, ziel.bereichSchluessel)} erkunden`
    : `${ziel.label} erkunden`;
  return { href: `#${ziel.segmente.join('/')}`, beschriftung, fehler: null };
}

function zeigeHinweis(text) {
  document.querySelector('.datensatz-hinweis')?.remove();
  const box = document.createElement('div');
  box.className = 'datensatz-hinweis';
  box.setAttribute('role', 'alert');
  const inhalt = document.createElement('span');
  inhalt.textContent = text;
  const schliessenBtn = document.createElement('button');
  schliessenBtn.type = 'button';
  schliessenBtn.className = 'datensatz-hinweis-schliessen';
  schliessenBtn.setAttribute('aria-label', 'Hinweis schließen');
  schliessenBtn.textContent = '×';
  schliessenBtn.addEventListener('click', () => box.remove());
  box.append(inhalt, schliessenBtn);
  document.body.appendChild(box);
}

// Punkt 4: von app.js nach jedem Rendern einer Ansicht aufgerufen (auch wenn
// kein Datensatz-Parameter vorliegt - dann sofortiger No-Op). `mod` ist das
// gerade aktive, bereits importierte Modul (kontext.aktuellesVizModul) - ruft
// dessen exportierte oeffneDatensatz(id) auf, keine eigene Sidebar-/
// Hervorhebungslogik hier.
export function verarbeiteDatensatzAufruf(mod, route) {
  if (!route.datensatz) return;
  const trennzeichen = route.datensatz.indexOf(':');
  if (trennzeichen === -1) {
    zeigeHinweis(`Datensatz „${route.datensatz}" nicht gefunden.`);
    return;
  }
  const typ = route.datensatz.slice(0, trennzeichen);
  const id = route.datensatz.slice(trennzeichen + 1);
  if (!ermittleZielFuerTyp(typ)) {
    zeigeHinweis(`Datensatztyp „${typ}" wird nicht unterstützt.`);
    return;
  }
  const gefunden = mod?.oeffneDatensatz?.(id);
  if (!gefunden) zeigeHinweis(`Datensatz „${id}" nicht gefunden.`);
}
