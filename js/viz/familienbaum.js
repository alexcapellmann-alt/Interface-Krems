// js/viz/familienbaum.js – Ansicht „Stammbaum“ (Zeitleistenbaum der Habsburger)
// Zweck: je Person ein senkrechtes Kästchen über die echte Lebensspanne (Jahresachse), angeordnet nach Familienzweig;
//   Regierungszeit und Rang durch Heirat farbig, Eltern-, Kinder- und Ehelinien.
// Eingabe: `data` = familien.csv (id, name, titel, familie, vater_id, mutter_id, ehepartner_id, geburtsjahr, sterbejahr,
//   herrschaft_von, herrschaft_bis, unsicherheit_typ). Personenkreis wird bei jedem render() aus den Daten ermittelt.
// Schnittstelle: render(container, data, options), resize(neueOptionen), destroy() wie alle Ansichten (docs/SCHEMA.md);
//   Modus „Licht aus“ über options.lichtAus (abdunkeln, nicht filtern).
// Abhängigkeiten: D3 v7, utils/tooltip.js, utils/uncertainty.js, utils/lichtAus.js, utils/lichtAusDarstellung.js,
//   utils/infoButton.js (Farblegende über `zusatzInhalt`), utils/viewportGroesse.js.
// Bedienung: Mausrad zoomt, Ziehen verschiebt; Hover und Klick heben direkte Verwandte hervor, Klick öffnet das Popover
//   (Fokus ohne Scrollen). Unter einer Mindestgröße des Fensters erscheint ein Hinweis statt des Baums.
// Hintergrund (Personenkreis, Überlappungslösung, Farben, Zoom): docs/MODULNOTIZEN.md, Abschnitt familienbaum.js.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { filtereErklaerungFuerFeld } from '../utils/uncertainty.js';
import { markiereSvg, mitUnvollstaendigHinweis, fehlendeMindestfelder, UNVOLLSTAENDIG_TEXT } from '../utils/vollstaendigkeit.js';
import { erzeugeHinweisBalken } from '../utils/hinweisBalken.js';
import { passendeTextfarbe } from '../utils/kategorieFarben.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { markiereHell } from '../utils/abdunkeln.js'; // Nachbesserung 3, Punkt 4
import { eintraegeAus, lichtAusVorbereitung } from '../utils/lichtAus.js'; // Auftrag 13
import { setzeLicht, musterAus, beschreibeEintraege } from '../utils/lichtAusDarstellung.js';
import { typName, auspraegungName } from '../core/unsicherheitVokabular.js';
import { infotextFuerModul, konfigurationswert, konfigurationsliste } from '../core/archivKonfiguration.js';
import { ermittleVerfuegbareHoehe, ermittleVerfuegbareBreite } from '../utils/viewportGroesse.js';
import {
  istDarstellungsbereichZuKlein,
  baueBildschirmHinweis,
  fuegeBildschirmHinweisStyleEin
} from '../utils/bildschirmHinweis.js';
import { UNSICHERHEIT_SYMBOL } from '../config/constants.js';
import { mitTextfeldern } from '../utils/textwert.js';

// AUFTRAG B1 (Prüfbericht Punkt 3): "|" macht im Loader jedes Feld zur Liste,
// auch Freitext - diese Felder werden hier als Text (Liste mit " | ") verarbeitet,
// sonst brach das Modul an ermittleKurzname() (name.split) ab.
const TEXTFELDER = ['name', 'titel'];

// Punkt 1 (4. Folgeauftrag): 20→13 (moderat verringert, siehe docs/MODULNOTIZEN.md
// - Gegengewicht zur nochmals größeren Schrift, Kästchen wirken
// dadurch gedrungener statt extrem in die Höhe gezogen). War zuvor 5→20
// (3. Folgeauftrag).
const PIXEL_PRO_JAHR = 13;
const RAND = { oben: 30, unten: 30, links: 56, rechts: 30 };
// AUFTRAG "Teil 2f", Punkt 1: keine lokale Kopie mehr - zentrale Konstante
// aus config/constants.js, unter demselben lokalen Namen weiterverwendet.
const WARN_SYMBOL = UNSICHERHEIT_SYMBOL;
const MAX_TIEFE = 25; // Sicherheitsgrenze gegen Datenfehler-Zyklen (Kreis hat 75 Personen, weit weniger Generationen).
// Punkt 2 (4. Folgeauftrag): 11→24 (mehr als verdoppelt, Auftrag wörtlich
// "mindestens verdoppeln") - ermittleTextbreite()/berechneKastenbreite()
// verwenden dieselbe Konstante zur Messung, die Kästchenbreite (Punkt 1,
// 2. Folgeauftrag, UNVERÄNDERTE Logik) wächst dadurch automatisch mit,
// keine separate Anpassung nötig.
// Punkt 1 (4. Folgeauftrag): 24→34 (nochmals deutlich vergrößert, siehe
// docs/MODULNOTIZEN.md). War zuvor 11→24 (3. Folgeauftrag).
const SCHRIFTGROESSE = 34;
const SCHRIFTGEWICHT = 600;
const SCHRIFTFAMILIE = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"; // dieselbe --font-ui-Deklaration wie css/base.css, siehe ermittleTextbreite()
// Punkt 1 (2. Folgeauftrag): Innenabstand links+rechts zusammen - die
// Kästchenbreite selbst ist jetzt datengetrieben (berechneKastenbreite()),
// kein fester BAR_BREITE-Wert mehr.
const KASTEN_PADDING_X = 14;
// Punkt 2 (2. Folgeauftrag): fester Mindest-Leerraum zwischen zwei
// benachbarten Kästchen-Spalten, zusätzlich zur (datengetriebenen)
// Kästchenbreite selbst - siehe instanz.spaltenAbstand. Basiswert, wird in
// render() ggf. durch den Spuren-Bedarf (siehe docs/MODULNOTIZEN.md Punkt 3)
// nach oben überschrieben.
const ZWEIG_LUECKE_BASIS = 56;
// Punkt 3 (2. Folgeauftrag): feste Einrückung oben/unten je Kästchen -
// siehe docs/MODULNOTIZEN.md (nur noch kosmetisch, SPALTEN_MIN_LUECKE liefert
// die eigentliche Garantie).
const BOX_Y_INSET = 2;
// Punkt 3 (2. Folgeauftrag): Mindestabstand zwischen zwei Kästchen derselben
// Spur (echte Pixel, unabhängig vom zeitlichen Abstand) und seitlicher
// Zusatzabstand zwischen zwei Spuren derselben Spalte - siehe
// loeseUeberlappungGlobal() und docs/MODULNOTIZEN.md.
const SPALTEN_MIN_LUECKE = 8;
const SPALTEN_LANE_PADDING = 10;

// Punkt 2 (3. Folgeauftrag): adaptive Jahres-Tick-Schrittweite, siehe
// docs/MODULNOTIZEN.md und ermittleJahresTickSchritt().
const JAHRES_TICK_SCHRITTE = [200, 100, 50, 25, 10, 5, 2, 1];
const TICK_MIN_PIXELABSTAND_Y = 40;

// Punkt 3 (3. Folgeauftrag): Opazität für nicht direkt verwandte
// Kästchen/Linien bei Hover/Klick-Hervorhebung (Auftrag nennt "ca. 0,1-0,15").
const HERVORHEBUNG_DIM_OPAZITAET = 0.12;

// AUFTRAG C1, Punkt 3: welche Werte der Spalte `familie` zur Herrscherfamilie
// gehören und wie sie heißt, steht in archiv.csv (`dynastie_familien`,
// `dynastie_name`; Krems: Habsburg) - nicht mehr fest im Code. Ob die Ansicht
// überhaupt angeboten wird, entscheidet datenVerfuegbarkeit.js (`merkmal`).
const dynastieFamilien = () => konfigurationsliste('dynastie_familien');
const dynastieName = () => {
  const wert = konfigurationswert('dynastie_name');
  return (Array.isArray(wert) ? wert.join(' ') : String(wert ?? '')).trim() || 'Herrscherfamilie';
};

// Farbsystem - Habsburg-Basis + 3 Varianten (dieselbe Technik wie zuvor:
// d3.rgb().brighter()/.darker(), analog zu kategorieFarben.js'
// farbeFuerUnterkategorie()). Da der Personenkreis jetzt AUSSCHLIESSLICH
// aus Habsburg-Familien + deren Ehepartnern besteht, tragen die
// Ehepartner-Familien (z.B. "burgund", "luxemburg" ...) hier bewusst NUR
// noch die neutrale Grau-Farbe (nicht mehr die im vorherigen Auftrag
// aufgebauten 6 eigenen Töne) - dieser Auftrag definiert die Farbgebung
// ausdrücklich neu ("Teil-Einfärbung ... Rest des Balkens bleibt in der
// neutralen/Familienfarbe") und nennt nur Habsburg-Varianten + Neutral,
// keine weiteren Familienfarben mehr.
const HABSBURG_BASIS_FARBE = '#7a1f2e';
// AUFTRAG C1, Punkt 3: Helligkeitsabstufung je Zweig in der Reihenfolge von
// `dynastie_familien` (Krems: habsburg 0, spanische_habsburger 0.8,
// habsburg_tirol -0.5, habsburg_lothringen 0.4 - wie bisher fest im Code).
// 2026-10-27: Lothringen-Stufe 1.6 -> 0.4; 1.6 ergab ein Pink (#d83751), das bei Joseph II. aus dem
// Bordeaux-Ton herausfiel (Hinweis des Autors).
const ZWEIG_ABSTUFUNGEN = [0, 0.8, -0.5, 0.4];
const GRAU_EHEPARTNERFAMILIE = '#9a9a9a';

// Politische Stellung - Rand/Symbol UND jetzt zusätzlich die
// Teil-/Vollbalken-Füllfarbe (siehe docs/MODULNOTIZEN.md).
const GOLD_FARBE = '#c9a227';
const HEIRAT_FARBE = '#e8cf8a'; // helle Gold-Variante, siehe docs/MODULNOTIZEN.md
const KRONE_PFAD = 'M-5,4 L-5,-1 L-2.5,1.5 L0,-3.5 L2.5,1.5 L5,-1 L5,4 Z';

// Wunsch des Autors (2026-10-28): Ehen als liegende Acht (Lemniskate) statt Verbindungslinie. Breite in
// Baum-Einheiten (ein Kästchen ist rund 350 breit); liegen die Partner weiter auseinander, verbindet eine
// feine Haarlinie die Kästchen mit dem Symbol, sonst wäre nicht zu erkennen, wer zusammengehört.
const EHE_FARBE = '#c98a2c';
const EHE_SYMBOL_BREITE = 140;
const EHE_SYMBOL_PFAD = (() => {
  const a = EHE_SYMBOL_BREITE / 2;
  const punkte = d3.range(0, 2 * Math.PI, Math.PI / 40).map((t) => {
    const n = 1 + Math.sin(t) ** 2;
    return `${(a * Math.cos(t) / n).toFixed(1)},${(a * Math.sin(t) * Math.cos(t) / n).toFixed(1)}`;
  });
  return `M${punkte.join('L')}Z`;
})();
// Linien bei Hover/Klick (2026-10-28): dicker; zu den Eltern durchgezogen, zu den Kindern gestrichelt und in
// eigener Farbe. Strichstärken in Bildschirmpunkten (vector-effect: non-scaling-stroke), damit sie bei
// jeder Zoomstufe gleich dick bleiben.
const LINIE_NORMAL = { farbe: '#999', breite: 1.2 };
const LINIE_ELTERN = { farbe: '#2c5d8f', breite: 4, strich: null };
const LINIE_KINDER = { farbe: '#2e7d5b', breite: 4, strich: '7,4' };

let instanz = null; // { container, wurzel, plotBereich, records, options, byId, kinderIndex, familienFarben, jahrMin, jahrMax, kastenBreite, spaltenAbstand, spaltenLaneAbstand, zoomVerhalten, zoomTransform, letzteBreite, infoButton, hoverFokusId, eingefrorenerFokusId, selektionen } – eine aktive Ansicht pro Modul-Ladung

function ehepartnerListe(record) {
  return Array.isArray(record.ehepartner_id) ? record.ehepartner_id : (record.ehepartner_id ? [record.ehepartner_id] : []);
}

function istPersonUnsicher(record) {
  return Boolean(
    record.geburtsdatum_unsicher || record.sterbedatum_unsicher
    || record.ehepartner_id_unsicher || record.vater_id_unsicher || record.mutter_id_unsicher
  );
}

// Punkt 3 (3. Folgeauftrag): direkte Familienbeziehungen (Eltern,
// Ehepartner, Kinder) EINER Person - bewusst über die echten
// Datenfelder/kinderIndex ermittelt, nicht über die d3.hierarchy-
// Baumstruktur (siehe docs/MODULNOTIZEN.md). Geschwister sind hier bewusst
// NICHT enthalten (Auftrag, wörtlich).
function ermittleDirekteBeziehungen(person, byId, kinderIndex) {
  const ids = new Set();
  [person.vater_id, person.mutter_id].forEach((id) => { if (id && byId.has(id)) ids.add(id); });
  ehepartnerListe(person).forEach((id) => { if (byId.has(id)) ids.add(id); });
  (kinderIndex.get(person.id) || []).forEach((kind) => ids.add(kind.id));
  return ids;
}

function baueUnsicherTooltip(record) {
  const felder = ['geburtsdatum', 'sterbedatum', 'vater_id', 'mutter_id', 'ehepartner_id'];
  const feldname = felder.find((f) => record[`${f}_unsicher`]);
  if (!feldname) return '';
  return filtereErklaerungFuerFeld(record.unsicherheit_anmerkung, feldname) || 'Angabe unsicher';
}

function baueDatenIndex(records) {
  const byId = new Map(records.map((r) => [r.id, r]));
  const kinderIndex = new Map();
  records.forEach((r) => {
    [r.vater_id, r.mutter_id].forEach((elternId) => {
      if (!elternId || !byId.has(elternId)) return;
      if (!kinderIndex.has(elternId)) kinderIndex.set(elternId, []);
      kinderIndex.get(elternId).push(r);
    });
  });
  return { byId, kinderIndex };
}

// --- Personenkreis (Vorab-Datenarbeit, siehe docs/MODULNOTIZEN.md) --------

// Habsburg-Kernfamilien PLUS alle über ehepartner_id verknüpften Personen,
// die nicht bereits im Kern sind - live aus den geladenen Daten ermittelt,
// nicht hartcodiert (siehe docs/MODULNOTIZEN.md).
function ermittleHabsburgKreis(records) {
  const byId = new Map(records.map((r) => [r.id, r]));
  const familien = dynastieFamilien();
  const kern = new Set(records.filter((r) => familien.includes(r.familie)).map((r) => r.id));
  const zusaetzlich = new Set();
  kern.forEach((id) => {
    ehepartnerListe(byId.get(id)).forEach((eid) => {
      if (!kern.has(eid) && byId.has(eid)) zusaetzlich.add(eid);
    });
  });
  return { kreisIds: new Set([...kern, ...zusaetzlich]), zusaetzlicheEhepartnerIds: zusaetzlich };
}

// --- Farben ---------------------------------------------------------------

function berechneFamilienFarben() {
  const farben = new Map();
  dynastieFamilien().forEach((familie, index) => {
    const faktor = ZWEIG_ABSTUFUNGEN[index % ZWEIG_ABSTUFUNGEN.length];
    const basis = d3.rgb(HABSBURG_BASIS_FARBE);
    const farbe = (faktor >= 0 ? basis.brighter(faktor) : basis.darker(-faktor)).formatHex();
    farben.set(familie, farbe);
  });
  return farben;
}

function farbeFuerFamilie(familie) {
  return instanz.familienFarben.get(familie) || GRAU_EHEPARTNERFAMILIE;
}

// --- Kästchenbreite (Punkt 1, 2. Folgeauftrag) ----------------------------

// Punkt 3 (4. Folgeauftrag): Präpositionen, die den Beginn des Herkunfts-/
// Familiennamen-Teils markieren (z.B. "Eleonore Magdalene VON
// Pfalz-Neuburg") - siehe ermittleKurzname().
const NAMENS_PRAEPOSITIONEN = new Set(['von', 'zu', 'de', 'van', 'af', 'aus', 'della', 'di']);

// Punkt 3 (4. Folgeauftrag): der einzige im gesamten Datensatz tatsächlich
// vorkommende Doppel-Vorname OHNE nachfolgende Präposition (grep-geprüft
// gegen alle 80 name-Werte, siehe Selbstauskunft im Chat) - für den echten
// String-Vergleich gegen `name` reicht daher diese kleine, explizite Liste,
// statt ein generisches "zwei Wörter ohne Präposition = Doppelname"-Muster
// zu raten (das hätte z.B. "Viridis Visconti" oder "Bianca Maria Sforza"
// fälschlich als Doppel-Vorname samt Nachname eingeschlossen - dort ist das
// zweite Wort ein bloßer Familienname, keine Präposition grenzt ihn ab).
const BEKANNTE_DOPPELVORNAMEN_OHNE_PRAEPOSITION = new Set(['Maria Theresia']);

// Punkt 3 (4. Folgeauftrag): Ist-Zustand war ein reiner "erstes Wort"-
// Kurzname (außer bei folgender römischer Ordnungszahl) - das schnitt bei
// echten Doppel-Vornamen (z.B. "Maria Theresia", "Eleonore Magdalene von
// Pfalz-Neuburg") fälschlich das zweite Namenswort ab, KEINE der bisherigen
// Titel-/Präfix-Entfernungsregeln aus personenliste.js war hier beteiligt
// (diese Funktion kannte nur "erstes Wort" + römische-Zahl-Sonderfall).
// Neu: das zweite Wort gehört zum Vornamen, wenn eindeutig erkennbar -
// entweder folgt direkt danach eine Präposition (das dritte Wort markiert
// dann den Beginn des Herkunfts-/Familiennamen-Teils) ODER der Name ist
// einer der wenigen bekannten Doppelvornamen ohne jeden nachfolgenden Teil
// (s.o.). Live gegen alle 80 `name`-Werte im Datensatz verifiziert: 12
// korrigiert (u.a. "Maria Theresia", "Eleonore Magdalene", "Elisabeth
// Christine"), 0 falsch-positive (Klammer-Zusätze wie "Gertrud (Anna) von
// Hohenberg" und bloße Nachnamen wie "Viridis Visconti" bleiben
// unverändert) - siehe Selbstauskunft im Chat für die vollständige Liste.
function ermittleKurzname(name) {
  const voller = name || '';
  const tokens = voller.split(' ');
  if (tokens.length > 1 && /^[IVXLCDM]+\.?$/.test(tokens[1])) return `${tokens[0]} ${tokens[1]}`;
  if (BEKANNTE_DOPPELVORNAMEN_OHNE_PRAEPOSITION.has(voller)) return voller;
  if (tokens.length > 2) {
    const zweitesWort = tokens[1];
    const istSelbstPraeposition = NAMENS_PRAEPOSITIONEN.has(zweitesWort.toLowerCase());
    const istKlammerZusatz = zweitesWort.startsWith('(');
    const drittesIstPraeposition = NAMENS_PRAEPOSITIONEN.has(tokens[2].toLowerCase());
    if (!istSelbstPraeposition && !istKlammerZusatz && drittesIstPraeposition) {
      return `${tokens[0]} ${zweitesWort}`;
    }
  }
  return tokens[0] || voller;
}

// Echte Textbreiten-Messung per Canvas-measureText() (Auftrag, wörtlich -
// keine Zeichenanzahl-Heuristik) - derselbe Canvas-2D-Context wird
// wiederverwendet (memoisiert), da measureText() selbst keinen Zustand
// zwischen Aufrufen hält und ein Canvas-Element nicht bei jeder Messung
// neu erzeugt werden muss.
let textbreiteKontext = null;
function ermittleTextbreite(text) {
  if (!textbreiteKontext) textbreiteKontext = document.createElement('canvas').getContext('2d');
  textbreiteKontext.font = `${SCHRIFTGEWICHT} ${SCHRIFTGROESSE}px ${SCHRIFTFAMILIE}`;
  return textbreiteKontext.measureText(text).width;
}

// Einheitliche Kästchenbreite = längster gemessener Kurzname + Innenabstand
// (Punkt 1) - aus den tatsächlichen 75 Personen berechnet, nicht
// hartcodiert (Abschnitt 2 "content-driven", dieselbe Konvention wie
// ermittleHabsburgKreis()/ermittleJahresSpanne()).
function berechneKastenbreite(records) {
  const breiten = records.map((r) => ermittleTextbreite(ermittleKurzname(r.name)));
  const maxBreite = Math.max(...breiten, 0);
  return Math.ceil(maxBreite) + KASTEN_PADDING_X;
}

// --- Jahres-Y-Achse ---------------------------------------------------

function ermittleJahr(datumText) {
  const treffer = (datumText || '').match(/\d{3,4}/);
  return treffer ? Number(treffer[0]) : null;
}

// Domain aus dem tatsächlichen Kreis berechnet (siehe docs/MODULNOTIZEN.md) -
// ergibt bei den aktuellen Daten exakt 1218-1790.
function ermittleJahresSpanne(records) {
  let min = Infinity;
  let max = -Infinity;
  records.forEach((r) => {
    const g = ermittleJahr(r.geburtsdatum);
    const t = ermittleJahr(r.sterbedatum);
    if (g !== null && g < min) min = g;
    if (t !== null && t > max) max = t;
  });
  return { jahrMin: Number.isFinite(min) ? min : 1200, jahrMax: Number.isFinite(max) ? max : 1800 };
}

function jahrZuY(jahr) {
  return (jahr - instanz.jahrMin) * PIXEL_PRO_JAHR;
}

// --- Geschwister-Reihenfolge (unverändert aus dem vorherigen Auftrag:
// Ehe-Gruppe zuerst, dann Geburtsjahr) -------------------------------------

function andererElternteilVon(kindPerson, elternPerson) {
  if (kindPerson.vater_id === elternPerson.id) return kindPerson.mutter_id || null;
  if (kindPerson.mutter_id === elternPerson.id) return kindPerson.vater_id || null;
  return null;
}

function vergleicheKinderReihenfolge(kindA, kindB, elternPerson) {
  const ehepartnerReihenfolge = ehepartnerListe(elternPerson);
  const gruppeA = ehepartnerReihenfolge.indexOf(andererElternteilVon(kindA, elternPerson) || '');
  const gruppeB = ehepartnerReihenfolge.indexOf(andererElternteilVon(kindB, elternPerson) || '');
  if (gruppeA !== gruppeB) return gruppeA - gruppeB;
  const jahrA = ermittleJahr(kindA.geburtsdatum);
  const jahrB = ermittleJahr(kindB.geburtsdatum);
  if (jahrA === null) return jahrB === null ? 0 : 1;
  if (jahrB === null) return -1;
  return jahrA - jahrB;
}

// --- Baumaufbau (auf den bereits auf den Habsburg-Kreis gefilterten
// byId/kinderIndex bezogen - siehe docs/MODULNOTIZEN.md, kein separates
// "sichtbareIds" mehr nötig). ----------------------------------------------

function baueWurzeln(byId, kinderIndex) {
  function hatEigeneEltern(r) {
    return Boolean((r.vater_id && byId.has(r.vater_id)) || (r.mutter_id && byId.has(r.mutter_id)));
  }
  function zaehleNachkommen(id, gezaehlt) {
    (kinderIndex.get(id) || []).forEach((k) => {
      if (gezaehlt.has(k.id)) return;
      gezaehlt.add(k.id);
      zaehleNachkommen(k.id, gezaehlt);
    });
    return gezaehlt.size;
  }
  function baueKnoten(id, besucht, tiefe) {
    if (besucht.has(id) || tiefe > MAX_TIEFE) return null;
    const person = byId.get(id);
    if (!person) return null;
    besucht.add(id);
    const kinder = (kinderIndex.get(id) || [])
      .map((k) => baueKnoten(k.id, besucht, tiefe + 1))
      .filter(Boolean)
      .sort((ka, kb) => vergleicheKinderReihenfolge(ka.person, kb.person, person));
    return { id, person, children: kinder.length ? kinder : undefined };
  }

  const kandidaten = [...byId.values()]
    .filter((r) => {
      if (hatEigeneEltern(r)) return false;
      return !ehepartnerListe(r).some((eid) => byId.has(eid) && hatEigeneEltern(byId.get(eid) || {}));
    })
    .sort((a, b) => zaehleNachkommen(b.id, new Set()) - zaehleNachkommen(a.id, new Set()));

  const besucht = new Set();
  const alsEhepartnerVergeben = new Set();
  const wurzelKnoten = [];
  kandidaten.forEach((r) => {
    if (besucht.has(r.id) || alsEhepartnerVergeben.has(r.id)) return;
    const knoten = baueKnoten(r.id, besucht, 0);
    if (!knoten) return;
    wurzelKnoten.push(knoten);
    ehepartnerListe(r).forEach((eid) => { if (byId.has(eid)) alsEhepartnerVergeben.add(eid); });
  });
  return wurzelKnoten;
}

// --- Layout: d3.tree() liefert weiterhin nur die X-Position (siehe
// docs/MODULNOTIZEN.md) - Y kommt vollständig aus der Jahres-Skala. --------

function baueForstLayout(wurzelKnotenListe) {
  const root = d3.hierarchy({ id: '__forst__', person: null, children: wurzelKnotenListe });
  d3.tree().nodeSize([instanz.spaltenAbstand, 1])(root);
  root.each((d) => { d.data.x = d.x; });
  return root.children || [];
}

// Verschiebt Personen so weit seitlich von ihrer bevorzugten (aus dem
// d3.tree()-Layout bzw. der Ehepartner-Satelliten-Regel stammenden)
// X-Position, bis sich keine zwei GLEICHZEITIG (echte Lebenszeit,
// yTop/yBottom) aktiven Kästchen mehr näher als instanz.spaltenLaneAbstand
// kommen - klassisches Sweep-Line-Verfahren (sortiert nach yTop, eine Liste
// "aktiver" bereits platzierter Kästchen, deren Zeitspanne den aktuellen
// Knoten noch überlappt).
//
// WARUM nicht (wie in einer früheren Fassung) nur Personen mit IDENTISCHER
// X-Gruppieren und dort Spuren verteilen: Live-Nachverifikation zeigte, dass
// d3.tree()s `nodeSize` NUR den Abstand zwischen direkten Geschwistern
// garantiert, nicht zwischen beliebigen Spalten - bei tiefen
// Einzelerben-Ketten (ein Kind ohne Geschwister übernimmt die X-Position
// des Elternteils, ein Elternteil ohne Geschwister wiederum die des
// GROSSELTERNTEILS usw.) liegen manche Nachbarspalten nur 45px auseinander,
// deutlich weniger als die 85px breite Kästchen (Punkt 1) - das führte zu
// echten Rechteck-Überlappungen zwischen VÖLLIG UNVERWANDTEN Personen, auch
// ganz ohne die in Punkt 3 behandelte Eltern-Kind-Überlappung. Ein reiner
// Gleiche-Spalte-Ausgleich (vorherige Fassung dieser Funktion) übersah das
// strukturell, weil er nur exakt gleiche X-Werte gruppierte. Diese
// Sweep-Line-Fassung prüft dagegen JEDES Paar zeitlich aktiver Kästchen,
// unabhängig von ihrer ursprünglichen Spalte, und garantiert dadurch
// zusätzlich, dass auch Punkt 2 ("kein Berühren/Überlappen" zwischen
// Familienzweigen) für ALLE 75×74 Paare eingehalten wird, nicht nur für die
// in Punkt 3 gemeinte Eltern-Kind-Situation. Per Skript exhaustiv gegen alle
// Paare verifiziert (siehe Selbstauskunft im Chat).
function loeseUeberlappungGlobal(positionVonId) {
  const mindestAbstand = instanz.spaltenLaneAbstand; // Mittenabstand, der Rechteck-Überlappung ausschließt (kastenBreite + Puffer)

  const eintraege = [...positionVonId.entries()]
    .map(([id, pos]) => ({ id, prefX: pos.x, yTop: pos.yTop, yBottom: pos.yBottom }))
    .sort((a, b) => a.yTop - b.yTop);

  const finaleX = new Map();
  const aktiv = []; // { x, yBottom } - bereits platzierte Kästchen, deren Zeitspanne (+ Mindestlücke) noch nicht abgelaufen ist

  eintraege.forEach((eintrag) => {
    for (let i = aktiv.length - 1; i >= 0; i -= 1) {
      if (aktiv[i].yBottom + SPALTEN_MIN_LUECKE <= eintrag.yTop) aktiv.splice(i, 1);
    }

    let x = eintrag.prefX;
    let versuch = 0;
    while (aktiv.some((a) => Math.abs(a.x - x) < mindestAbstand)) {
      versuch += 1;
      const richtung = versuch % 2 === 1 ? 1 : -1;
      const schritt = Math.ceil(versuch / 2);
      x = eintrag.prefX + richtung * schritt * mindestAbstand;
    }

    finaleX.set(eintrag.id, x);
    aktiv.push({ x, yBottom: eintrag.yBottom });
  });

  return finaleX;
}

// Mitte der zeitlichen Überlappung zweier Balken (siehe docs/MODULNOTIZEN.md
// "Ehepaar-Anker") - Fallback: Mitte des ersten Balkens, falls
// keine Überlappung besteht (z.B. bei einer Datenlücke).
function ermittleVerbindungsY(barA, barB) {
  const overlapStart = Math.max(barA.yTop, barB.yTop);
  const overlapEnde = Math.min(barA.yBottom, barB.yBottom);
  if (overlapStart <= overlapEnde) return (overlapStart + overlapEnde) / 2;
  return (barA.yTop + barA.yBottom) / 2;
}

function berechneJahresBereich(person) {
  const geburtsjahr = ermittleJahr(person.geburtsdatum);
  const sterbejahr = ermittleJahr(person.sterbedatum);
  const yTop = jahrZuY(geburtsjahr ?? instanz.jahrMin);
  const yBottom = jahrZuY(sterbejahr ?? geburtsjahr ?? instanz.jahrMax);
  return { yTop: Math.min(yTop, yBottom), yBottom: Math.max(yTop, yBottom) };
}

function baueBalken(id, person, x) {
  return { id, person, x, ...berechneJahresBereich(person) };
}

// Baut aus einer gelayouteten d3.hierarchy-Wurzel das flache Render-Modell -
// dieselbe Ehepartner-Satelliten-Mechanik wie in den vorherigen Aufträgen
// (Zwei-Durchlauf-Duplikatvermeidung, individueller Kind-Linien-
// Startpunkt), jetzt auf Balken (yTop/yBottom) statt Einzelpunkte bezogen.
//
// Zwei Durchläufe über den Baum, nicht einer (Punkt 3, 2. Folgeauftrag):
// Durchlauf A ermittelt für JEDEN Knoten - Anker UND Ehepartner-Satelliten -
// die anfängliche Position, Durchlauf B baut Boxen UND Verbindungslinien
// erst NACH der globalen Überlappungsauflösung (loeseUeberlappungGlobal,
// dazwischen), damit Linien-Endpunkte garantiert dieselbe (ggf. verschobene)
// X-Position verwenden wie die gezeichneten Boxen.
// Länge begründet (über 100 Zeilen, Masterprompt §13.3; Nachbesserung 8): leitet aus Layout und Daten das gesamte Zeichenmodell (Kästen, Linien, Ehesymbole) ab; die Teile verweisen gegenseitig aufeinander.
function baueRenderModell(wurzeln, byId) {
  const ankerIds = new Set();
  wurzeln.forEach((wurzelKnoten) => wurzelKnoten.each((d) => ankerIds.add(d.data.id)));

  // --- Durchlauf A: anfängliche Position jedes Knotens sammeln ---------
  const anfangsPosition = new Map(); // id -> {x, yTop, yBottom}
  const bereitsGezaehltA = new Set();
  wurzeln.forEach((wurzelKnoten) => {
    wurzelKnoten.each((d) => {
      const { id, person, x } = d.data;
      if (!anfangsPosition.has(id)) anfangsPosition.set(id, { x, ...berechneJahresBereich(person) });

      let i = 0;
      ehepartnerListe(person).forEach((ehepartnerId) => {
        if (!byId.has(ehepartnerId) || ankerIds.has(ehepartnerId)) return;
        if (bereitsGezaehltA.has(`${id}|${ehepartnerId}`)) return;
        bereitsGezaehltA.add(`${id}|${ehepartnerId}`);
        bereitsGezaehltA.add(`${ehepartnerId}|${id}`);
        i += 1;
        const satX = x + i * instanz.spaltenAbstand;
        if (!anfangsPosition.has(ehepartnerId)) {
          anfangsPosition.set(ehepartnerId, { x: satX, ...berechneJahresBereich(byId.get(ehepartnerId)) });
        }
      });
    });
  });

  const finaleX = loeseUeberlappungGlobal(anfangsPosition);

  // --- Durchlauf B: Boxen + Linien mit der finalen X-Position bauen ----
  const knoten = [];
  const eheLinien = [];
  const elternKindLinien = [];
  const satellitPositionVon = new Map(); // "ankerId|ehepartnerId" -> {x, y}
  const bereitsAlsSatellitGezeigt = new Set();
  const balkenVonId = new Map();

  function fuegeKnotenEin(id, person, istSatellit) {
    const balken = baueBalken(id, person, finaleX.get(id));
    balkenVonId.set(id, balken);
    knoten.push({ ...balken, istSatellit });
    return balken;
  }

  wurzeln.forEach((wurzelKnoten) => {
    wurzelKnoten.each((d) => {
      const { id, person } = d.data;
      const ankerBar = fuegeKnotenEin(id, person, false);
      const x = ankerBar.x;

      let i = 0;
      ehepartnerListe(person).forEach((ehepartnerId) => {
        if (!byId.has(ehepartnerId)) return;
        if (ankerIds.has(ehepartnerId)) return; // hat einen eigenen Anker-Platz, kein Satellit nötig
        if (bereitsAlsSatellitGezeigt.has(`${id}|${ehepartnerId}`)) return;
        bereitsAlsSatellitGezeigt.add(`${id}|${ehepartnerId}`);
        bereitsAlsSatellitGezeigt.add(`${ehepartnerId}|${id}`);

        i += 1;
        const satBar = fuegeKnotenEin(ehepartnerId, byId.get(ehepartnerId), true);
        const satX = satBar.x;
        const verbindungsY = ermittleVerbindungsY(ankerBar, satBar);
        eheLinien.push({ x1: x, y1: verbindungsY, x2: satX, y2: verbindungsY, aId: id, bId: ehepartnerId });
        satellitPositionVon.set(`${id}|${ehepartnerId}`, { x: (x + satX) / 2, y: verbindungsY });
        satellitPositionVon.set(`${ehepartnerId}|${id}`, { x: (x + satX) / 2, y: verbindungsY });
      });

      if (d.parent && d.parent.data.person) {
        const elternPerson = d.parent.data.person;
        const kindPerson = person;
        const andererElternteil = kindPerson.vater_id === elternPerson.id
          ? kindPerson.mutter_id
          : (kindPerson.mutter_id === elternPerson.id ? kindPerson.vater_id : null);
        const paarMitte = andererElternteil ? satellitPositionVon.get(`${elternPerson.id}|${andererElternteil}`) : null;
        const elternBar = balkenVonId.get(d.parent.data.id);
        const start = paarMitte || { x: finaleX.get(d.parent.data.id), y: elternBar ? (elternBar.yTop + elternBar.yBottom) / 2 : 0 };
        // Punkt 3 (3. Folgeauftrag): elternIds trägt IMMER beide echten
        // Eltern-IDs (vater_id/mutter_id), unabhängig davon, welcher
        // Elternteil strukturell der Baum-Anker ist (siehe docs/MODULNOTIZEN.md
        //) - für die Hover-Hervorhebung zählt die echte
        // Verwandtschaft, nicht die Baum-Struktur.
        const elternIds = [kindPerson.vater_id, kindPerson.mutter_id].filter((eid) => eid && byId.has(eid));
        elternKindLinien.push({ x1: start.x, y1: start.y, x2: x, y2: ankerBar.yTop, kindId: id, elternIds });
      }
    });
  });

  // Nachtrag: Paare, bei denen BEIDE Seiten einen eigenen Anker-Platz haben
  // (z.B. eine verwandtschaftliche Doppelverbindung) - direkte Linie
  // zwischen den beiden Anker-Positionen (Verbindungs-Y wie bei Satelliten).
  const bereitsAlsAnkerPaarGezeigt = new Set();
  knoten.forEach((k) => {
    if (k.istSatellit) return;
    ehepartnerListe(k.person).forEach((ehepartnerId) => {
      if (!ankerIds.has(ehepartnerId) || ehepartnerId === k.id) return;
      const paarSchluessel = [k.id, ehepartnerId].sort().join('|||');
      if (bereitsAlsAnkerPaarGezeigt.has(paarSchluessel)) return;
      bereitsAlsAnkerPaarGezeigt.add(paarSchluessel);
      const partnerBar = balkenVonId.get(ehepartnerId);
      if (partnerBar) {
        const verbindungsY = ermittleVerbindungsY(k, partnerBar);
        eheLinien.push({ x1: k.x, y1: verbindungsY, x2: partnerBar.x, y2: verbindungsY, aId: k.id, bId: ehepartnerId });
      }
    });
  });

  return { knoten, eheLinien, elternKindLinien };
}

// --- Zeichnen -------------------------------------------------------------

// Hat diese Person eine befüllte Regierungszeit (die 17 Kaiser/Könige aus
// eigenem Recht, siehe familien.csv-Erweiterung)?
function ermittleRegierungszeit(person) {
  if (!person.herrschaft_von || !person.herrschaft_bis) return null;
  const von = Number(person.herrschaft_von);
  const bis = Number(person.herrschaft_bis);
  if (!Number.isFinite(von) || !Number.isFinite(bis)) return null;
  return { yTop: jahrZuY(von), yBottom: jahrZuY(bis) };
}

// Länge begründet (über 100 Zeilen, Masterprompt §13.3; Nachbesserung 8): zeichnet die ganze Ansicht in einem Durchgang (Maße, Skalen, Achsen, Elemente, Beschriftung, Interaktion); die Schritte teilen viele lokale Größen, eine Zerlegung bräuchte lange Parameterlisten ohne Gewinn an Lesbarkeit.
function zeichneBaum(svg, modell, container, zeigeUnsicherheit) {
  const zoomInhalt = svg.append('g').attr('class', 'familienbaum-zoom-inhalt');

  const elternKindLinienSel = zoomInhalt.append('g').attr('class', 'familienbaum-eltern-kind-linien')
    .selectAll('line').data(modell.elternKindLinien).join('line')
    .attr('x1', (d) => d.x1).attr('y1', (d) => d.y1)
    .attr('x2', (d) => d.x2).attr('y2', (d) => d.y2)
    .attr('vector-effect', 'non-scaling-stroke')
    .attr('stroke', LINIE_NORMAL.farbe).attr('stroke-width', LINIE_NORMAL.breite);

  // Ehe: Haarlinie nur bis an das Symbol heran (bei nebeneinanderstehenden Partnern entfällt sie ganz)
  const eheMitte = (d) => (d.x1 + d.x2) / 2;
  const eheLinienSel = zoomInhalt.append('g').attr('class', 'familienbaum-ehe-linien')
    .selectAll('path').data(modell.eheLinien).join('path')
    .attr('d', (d) => {
      const links = Math.min(d.x1, d.x2) + instanz.kastenBreite / 2;
      const rechts = Math.max(d.x1, d.x2) - instanz.kastenBreite / 2;
      if (rechts - links <= EHE_SYMBOL_BREITE * 1.5) return null;
      const m = eheMitte(d);
      return `M${links},${d.y1}H${m - EHE_SYMBOL_BREITE / 2}M${m + EHE_SYMBOL_BREITE / 2},${d.y1}H${rechts}`;
    })
    .attr('fill', 'none')
    .attr('vector-effect', 'non-scaling-stroke')
    .attr('stroke', EHE_FARBE).attr('stroke-width', 1);

  const knotenGruppen = zoomInhalt.append('g').attr('class', 'familienbaum-knoten')
    .selectAll('g.familienbaum-person').data(modell.knoten, (d) => d.id).join('g')
    .attr('class', 'familienbaum-person')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => `${d.person.name}, Details anzeigen`)
    .attr('transform', (d) => `translate(${d.x},0)`);

  const unsicher = (d) => zeigeUnsicherheit && istPersonUnsicher(d.person);
  markiereHell(knotenGruppen, unsicher); // Nachbesserung 3, Punkt 4
  const istEigenesRecht = (d) => ['kaiser', 'koenig'].includes(d.person.hrr_status);
  const istDurchHeirat = (d) => ['kaiserin_heirat', 'koenigin_heirat'].includes(d.person.hrr_status);
  const kastenBreite = instanz.kastenBreite;

  // Punkt 3 (2. Folgeauftrag): feste Einrückung oben/unten (BOX_Y_INSET) -
  // siehe docs/MODULNOTIZEN.md. Bodenfall (Math.max(...,2)) verhindert eine
  // unsichtbare/negative Höhe bei extrem kurzen Lebensspannen.
  const boxYTop = (d) => d.yTop + BOX_Y_INSET;
  const boxHoehe = (d) => Math.max((d.yBottom - d.yTop) - BOX_Y_INSET * 2, 2);

  // Basis-Kästchen: ganze Lebensspanne (abzüglich der festen Einrückung),
  // Familienfarbe - bzw. bei "durch Heirat"-Status die volle Kästchen-
  // fläche bereits in HEIRAT_FARBE (siehe docs/MODULNOTIZEN.md
  // "Teil-Einfärbung").
  knotenGruppen.append('rect')
    .attr('class', 'familienbaum-balken')
    .attr('x', -kastenBreite / 2).attr('y', boxYTop)
    .attr('width', kastenBreite).attr('height', boxHoehe)
    .attr('rx', 3)
    .attr('fill', (d) => (istDurchHeirat(d) ? HEIRAT_FARBE : farbeFuerFamilie(d.person.familie)))
    .attr('stroke', (d) => (unsicher(d) ? '#c0392b' : '#ffffff'))
    .attr('stroke-width', (d) => (unsicher(d) ? 2 : 1))
    .attr('stroke-dasharray', (d) => (unsicher(d) ? '4,3' : null))
    .call((a) => markiereSvg(a, (d) => d.person)); // Nachbesserung 3, Punkt 3

  // Regierungs-Overlay: nur für die 17 Personen mit herrschaft_von/bis -
  // deckt ausschließlich den Regierungsabschnitt in Gold ab (siehe
  // docs/MODULNOTIZEN.md). An die Einrückung des Basis-Kästchens geklemmt
  // (Math.max/min), damit das Overlay nie über dessen sichtbaren Rand
  // hinausragt, selbst wenn herrschaft_von/bis exakt mit Geburt/Tod
  // zusammenfällt.
  knotenGruppen.filter((d) => ermittleRegierungszeit(d.person))
    .append('rect')
    .attr('class', 'familienbaum-regierung')
    .attr('x', -kastenBreite / 2)
    .attr('y', (d) => Math.max(ermittleRegierungszeit(d.person).yTop, boxYTop(d)))
    .attr('width', kastenBreite)
    .attr('height', (d) => {
      const r = ermittleRegierungszeit(d.person);
      const yEnde = Math.min(r.yBottom, d.yBottom - BOX_Y_INSET);
      const yStart = Math.max(r.yTop, boxYTop(d));
      return Math.max(yEnde - yStart, 2);
    })
    .attr('fill', GOLD_FARBE)
    .attr('pointer-events', 'none');

  // AUFTRAG "Teil 2f", Punkt 1: `aria-hidden` ergänzt (fehlte bisher, im
  // Unterschied zu den sechs anderen Modulen mit demselben Icon-Muster) -
  // reine Konsistenz-Ergänzung, keine Verhaltensänderung: `knotenGruppen`
  // selbst trägt bereits ein eigenes `aria-label` (s.o.), das überschreibt
  // die Vorlesereihenfolge ohnehin vollständig.
  knotenGruppen.filter((d) => unsicher(d)).append('text')
    .attr('class', 'familienbaum-warn-icon')
    .attr('x', kastenBreite / 2 - 10).attr('y', (d) => boxYTop(d) + 11)
    .attr('font-size', 11)
    .attr('aria-hidden', 'true')
    .text(WARN_SYMBOL);

  // Kronen-Symbol - gefüllt für "aus eigenem Recht" (am Beginn des
  // Regierungsabschnitts), hohl für "durch Heirat" (am Kästchenanfang) -
  // permanent sichtbar. Sitzt knapp OBERHALB des Kästchens (floats wie
  // eine Krone "auf dem Kopf"), statt den jetzt zentrierten Namenstext zu
  // überlagern.
  knotenGruppen.filter(istEigenesRecht)
    .append('path').attr('class', 'familienbaum-krone')
    .attr('transform', (d) => `translate(0,${(ermittleRegierungszeit(d.person)?.yTop ?? d.yTop) - 3})`)
    .attr('d', KRONE_PFAD).attr('fill', GOLD_FARBE);
  knotenGruppen.filter(istDurchHeirat)
    .append('path').attr('class', 'familienbaum-krone-hohl')
    .attr('transform', (d) => `translate(0,${d.yTop - 3})`)
    .attr('d', KRONE_PFAD).attr('fill', 'none').attr('stroke', '#8a6d1a').attr('stroke-width', 1.2);

  // Punkt 1 (2. Folgeauftrag): Name zentriert INNERHALB des Kästchens -
  // kein separates Außen-Label mehr, keine Kürzung nötig, da
  // instanz.kastenBreite bereits so berechnet ist, dass der längste
  // Kurzname vollständig hineinpasst (siehe berechneKastenbreite()).
  knotenGruppen.append('text')
    .attr('class', 'familienbaum-name')
    .attr('x', 0).attr('y', (d) => (boxYTop(d) + boxHoehe(d) / 2))
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('font-size', SCHRIFTGROESSE)
    .attr('font-weight', SCHRIFTGEWICHT)
    .attr('fill', (d) => passendeTextfarbe(istDurchHeirat(d) ? HEIRAT_FARBE : farbeFuerFamilie(d.person.familie)))
    .text((d) => ermittleKurzname(d.person.name));

  // Ehe-Symbol über den Kästchen (überlappt deren Ränder bei nebeneinanderstehenden Partnern), mit weißem Hof
  const eheSymbolSel = zoomInhalt.append('g').attr('class', 'familienbaum-ehe-symbole')
    .selectAll('g').data(modell.eheLinien).join('g')
    .attr('transform', (d) => `translate(${eheMitte(d)},${d.y1})`)
    .attr('pointer-events', 'none')
    .attr('aria-hidden', 'true');
  eheSymbolSel.append('path').attr('class', 'familienbaum-ehe-hof')
    .attr('d', EHE_SYMBOL_PFAD).attr('fill', 'none').attr('vector-effect', 'non-scaling-stroke')
    .attr('stroke', '#ffffff').attr('stroke-width', 4.5).attr('stroke-linejoin', 'round');
  eheSymbolSel.append('path').attr('class', 'familienbaum-ehe-zeichen')
    .attr('d', EHE_SYMBOL_PFAD).attr('fill', 'none').attr('vector-effect', 'non-scaling-stroke')
    .attr('stroke', EHE_FARBE).attr('stroke-width', 2).attr('stroke-linejoin', 'round');

  // Punkt 3 (3. Folgeauftrag): Referenzen auf die drei Selektionen, die
  // aktualisiereHervorhebung() bei Hover/Klick per .style('opacity', ...)
  // aktualisiert, OHNE einen kompletten Neuaufbau auszulösen - siehe
  // docs/MODULNOTIZEN.md.
  instanz.selektionen = { knoten: knotenGruppen, elternKindLinien: elternKindLinienSel, eheLinien: eheLinienSel, eheSymbole: eheSymbolSel };

  // AUFTRAG "Teil 2f", Punkt 2: eine waehrend eines noch laufenden Aufbaus
  // eingegangene oeffneDatensatz()-Anfrage (siehe dortiger Kommentar) jetzt
  // nachholen - `instanz.selektionen` ist ab dieser Zeile gesetzt.
  if (instanz.ausstehenderDatensatz) {
    const ausstehendeId = instanz.ausstehenderDatensatz;
    instanz.ausstehenderDatensatz = null;
    oeffnePersonImBaum(ausstehendeId);
  }

  knotenGruppen
    .on('mouseenter focus', function (event, d) {
      const lebensdaten = [d.person.geburtsdatum, d.person.sterbedatum].filter(Boolean).join(' – ');
      const zeilen = [d.person.name, d.person.titel || d.person.familie, lebensdaten];
      if (unsicher(d)) zeilen.push(baueUnsicherTooltip(d.person));
      zeigeTooltip(mitUnvollstaendigHinweis(d.person, zeilen.filter(Boolean).join('\n')), this, container); // Nachbesserung 3, Punkt 3
      instanz.hoverFokusId = d.id;
      aktualisiereHervorhebung();
    })
    .on('mouseleave blur', () => {
      versteckeTooltip();
      instanz.hoverFokusId = null;
      aktualisiereHervorhebung();
    })
    .on('click', function (event, d) {
      // Punkt 3: verhindert, dass derselbe Klick zusätzlich den
      // Leerflächen-Handler auf dem svg-Element auslöst (siehe
      // zeichneFamilienbaum()) - der würde die gerade gesetzte
      // eingefrorenerFokusId sonst im selben Klick wieder löschen.
      event.stopPropagation();
      versteckeTooltip();
      instanz.eingefrorenerFokusId = d.id;
      aktualisiereHervorhebung();
      zeigePersonenPopover(d.person, this);
    })
    .on('keydown', function (event, d) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        versteckeTooltip();
        instanz.eingefrorenerFokusId = d.id;
        aktualisiereHervorhebung();
        zeigePersonenPopover(d.person, this);
      }
    });

  aktualisiereHervorhebung();

  return zoomInhalt;
}

// Punkt 3 (3. Folgeauftrag): effektiver Fokus = temporärer Hover, sonst die
// eingefrorene (per Klick gesetzte) Auswahl, sonst kein Fokus (Normalzustand)
// - siehe docs/MODULNOTIZEN.md. Setzt/entfernt nur .style('opacity', ...),
// baut nichts neu auf.
function aktualisiereHervorhebung() {
  const sel = instanz?.selektionen;
  if (!sel) return;
  const fokusId = instanz.hoverFokusId || instanz.eingefrorenerFokusId || null;

  // 2026-10-28: Linien der fokussierten Person dicker, zu den Eltern anders als zu den Kindern (LINIE_*)
  const linienStil = (d) => {
    if (!fokusId) return LINIE_NORMAL;
    if (d.kindId === fokusId) return LINIE_ELTERN;
    return d.elternIds.includes(fokusId) ? LINIE_KINDER : LINIE_NORMAL;
  };
  sel.elternKindLinien
    .attr('stroke', (d) => linienStil(d).farbe)
    .attr('stroke-width', (d) => linienStil(d).breite)
    .attr('stroke-dasharray', (d) => linienStil(d).strich ?? null);
  const eheAktiv = (d) => Boolean(fokusId) && (d.aId === fokusId || d.bId === fokusId);
  sel.eheLinien.attr('stroke-width', (d) => (eheAktiv(d) ? 3 : 1));
  sel.eheSymbole.select('.familienbaum-ehe-hof').attr('stroke-width', (d) => (eheAktiv(d) ? 7 : 4.5));
  sel.eheSymbole.select('.familienbaum-ehe-zeichen').attr('stroke-width', (d) => (eheAktiv(d) ? 3.5 : 2));

  if (!fokusId) {
    sel.knoten.style('opacity', null);
    sel.elternKindLinien.style('opacity', null);
    sel.eheLinien.style('opacity', null);
    sel.eheSymbole.style('opacity', null);
    return;
  }

  const person = instanz.byId.get(fokusId);
  const beziehungsIds = person ? ermittleDirekteBeziehungen(person, instanz.byId, instanz.kinderIndex) : new Set();

  sel.knoten.style('opacity', (d) => (d.id === fokusId || beziehungsIds.has(d.id) ? 1 : HERVORHEBUNG_DIM_OPAZITAET));
  sel.elternKindLinien.style('opacity', (d) => (
    d.kindId === fokusId || d.elternIds.includes(fokusId) ? 1 : HERVORHEBUNG_DIM_OPAZITAET
  ));
  sel.eheLinien.style('opacity', (d) => (eheAktiv(d) ? 1 : HERVORHEBUNG_DIM_OPAZITAET));
  sel.eheSymbole.style('opacity', (d) => (eheAktiv(d) ? 1 : HERVORHEBUNG_DIM_OPAZITAET));
}

// --- Lokales Detail-Popover -------------------------------------------
// AUFTRAG "Habsburg-Zeitleistenbaum – Klick-Popup verschiebt Ansicht,
// größere Beschriftung" (2026-09-11, vierter Folgeauftrag), Punkt 1 -
// KONKRETE URSACHE (per Live-Messung identifiziert, nicht nur vermutet):
// `ankerElement` ist die komplette Personen-`<g>`, deren
// `getBoundingClientRect()` die Bounding-Box des GESAMTEN Lebensspanne-
// Kästchens liefert - NICHT nur die tatsächlich angeklickte Stelle. Seit
// dem vorigen Folgeauftrag (PIXEL_PRO_JAHR 5→20 plus Wegfall des Auto-Fit-
// auf Viewport-Höhe, siehe docs/MODULNOTIZEN.md) können einzelne
// Kästchen weit höher als der Viewport sein (per Test: Rudolf I., 73 Lebens-
// jahre, ergab bei Zoom-Skala 0,61 ein 892px hohes Kästchen auf einer
// 705px hohen Ansicht) - `rect.bottom` lag dadurch bei y≈1126, WEIT
// UNTERHALB des sichtbaren Bereichs. `popover.style.top` wurde exakt an
// dieser Stelle gesetzt (weit außerhalb der Seite zu dem Zeitpunkt), und
// das anschließende `popover.focus()` (ohne `{ preventScroll: true }`)
// löste GENAU DESHALB Browser-Standardverhalten aus: es scrollte die ganze
// Seite (nicht nur den Baum) so weit nach unten, bis das neu eingefügte,
// fokussierte Popover sichtbar wurde (per Test: window.scrollY 0→540,
// document.documentElement.scrollHeight 972→1490) - exakt der im Auftrag
// beschriebene "nur noch schmaler Streifen sichtbar"-Sprung. ZWEI
// zusammenwirkende Ursachen, nicht eine: (a) die Anker-Position wurde ohne
// Rücksicht auf den tatsächlich sichtbaren Ausschnitt aus der vollen
// Kästchenhöhe berechnet, (b) `.focus()` ohne `preventScroll` scrollt
// automatisch. Behoben durch BEIDES: `ermittleSichtbareAnkerkante()`
// klemmt Ober-/Unterkante des Ankers auf den aktuell sichtbaren
// Viewport-Bereich, BEVOR die Popover-Position berechnet wird (das Popup
// erscheint dadurch immer innerhalb des bereits Sichtbaren, auch bei
// extrem hohen Kästchen) - zusätzlich bekommt jeder `.focus()`-Aufruf in
// diesem Popover-Code (Öffnen, Schließen-Button, Escape) `{ preventScroll:
// true }` als zweite, unabhängige Absicherung (verhindert JEDES
// ungewollte Scrollen durch Fokuswechsel, auch für Randfälle, die die
// Klemmung selbst nicht abdeckt, z.B. sehr schmale Viewports).
let popoverElement = null;
let popoverAussenKlick = null;
let popoverEscape = null;

function schliessePersonenPopover() {
  if (!popoverElement) return;
  popoverElement.remove();
  popoverElement = null;
  if (popoverAussenKlick) document.removeEventListener('click', popoverAussenKlick);
  if (popoverEscape) document.removeEventListener('keydown', popoverEscape);
  popoverAussenKlick = null;
  popoverEscape = null;
}

const HRR_STATUS_LABEL = {
  kaiser: 'Kaiser',
  koenig: 'König',
  kaiserin_heirat: 'Kaiserin (durch Heirat)',
  koenigin_heirat: 'Königin (durch Heirat)'
};

function zeigePersonenPopover(person, ankerElement) {
  schliessePersonenPopover();

  const popover = document.createElement('div');
  popover.className = 'familienbaum-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', `Details zu ${person.name}`);
  popover.setAttribute('tabindex', '-1');

  const herrschaft = person.herrschaft_von && person.herrschaft_bis
    ? `${person.herrschaft_von}–${person.herrschaft_bis}`
    : null;
  const felder = [
    ['Name', person.name],
    ['Titel', person.titel],
    ['Geburtsdatum', person.geburtsdatum],
    ['Sterbedatum', person.sterbedatum],
    ['Familie', person.familie],
    ['Politische Stellung', HRR_STATUS_LABEL[person.hrr_status] || null],
    ['Herrschaftszeitraum', herrschaft]
  ];
  felder.forEach(([label, wert]) => {
    if (!wert) return;
    const feld = document.createElement('div');
    feld.className = 'familienbaum-popover-feld';
    const labelEl = document.createElement('div');
    labelEl.className = 'familienbaum-popover-feld-label';
    labelEl.textContent = label;
    const wertEl = document.createElement('div');
    wertEl.textContent = wert;
    feld.append(labelEl, wertEl);
    popover.appendChild(feld);
  });

  const schliessenBtn = document.createElement('button');
  schliessenBtn.type = 'button';
  schliessenBtn.className = 'familienbaum-popover-schliessen';
  schliessenBtn.setAttribute('aria-label', 'Details schließen');
  schliessenBtn.textContent = '×';
  schliessenBtn.addEventListener('click', () => { schliessePersonenPopover(); ankerElement.focus({ preventScroll: true }); });
  popover.appendChild(schliessenBtn);

  document.body.appendChild(popover);
  // Punkt 1 (4. Folgeauftrag, siehe docs/MODULNOTIZEN.md): Ober-/Unterkante
  // des Ankers auf den AKTUELL SICHTBAREN Viewport-Bereich geklemmt, statt
  // die volle (bei langlebigen Personen ggf. weit über den Viewport
  // hinausragende) Kästchenhöhe zu verwenden.
  const rect = ankerElement.getBoundingClientRect();
  const ankerObenSichtbar = Math.min(Math.max(rect.top, 0), window.innerHeight);
  const ankerUntenSichtbar = Math.min(Math.max(rect.bottom, 0), window.innerHeight);
  const popoverHoehe = popover.offsetHeight;

  let top = ankerUntenSichtbar + window.scrollY + 6;
  // Passt das Popup unterhalb der sichtbaren Anker-Kante nicht mehr in den
  // aktuellen Viewport, wird es stattdessen oberhalb davon platziert -
  // bleibt dadurch immer vollständig innerhalb des bereits Sichtbaren,
  // ganz ohne dass die Seite scrollen müsste.
  if (top + popoverHoehe > window.scrollY + window.innerHeight) {
    top = Math.max(window.scrollY + 6, ankerObenSichtbar + window.scrollY - popoverHoehe - 6);
  }
  popover.style.left = `${Math.min(rect.left + window.scrollX, window.scrollX + document.documentElement.clientWidth - 260)}px`;
  popover.style.top = `${top}px`;
  popoverElement = popover;
  // Punkt 1 (4. Folgeauftrag): { preventScroll: true } als zweite,
  // unabhängige Absicherung gegen ungewolltes Scrollen (siehe
  // docs/MODULNOTIZEN.md) - ohne Klammerzusatz scrollt der Browser
  // standardmäßig das fokussierte Element in den sichtbaren Bereich.
  popover.focus({ preventScroll: true });

  popoverAussenKlick = (event) => {
    if (!popover.contains(event.target) && event.target !== ankerElement) schliessePersonenPopover();
  };
  popoverEscape = (event) => {
    if (event.key === 'Escape') { schliessePersonenPopover(); ankerElement.focus({ preventScroll: true }); }
  };
  setTimeout(() => {
    document.addEventListener('click', popoverAussenKlick);
    document.addEventListener('keydown', popoverEscape);
  }, 0);
}

// Punkt 2 (3. Folgeauftrag): gröbste Schrittweite aus JAHRES_TICK_SCHRITTE,
// die mit höchstens `hoehePixel / TICK_MIN_PIXELABSTAND_Y` Ticks über die
// AKTUELL SICHTBARE Jahresspanne (nicht die volle Baum-Spanne) auskommt -
// siehe docs/MODULNOTIZEN.md zur Begründung gegenüber scale.ticks(n).
function ermittleJahresTickSchritt(sichtbareJahresSpanne, hoehePixel) {
  const maxTicks = Math.max(2, Math.floor(hoehePixel / TICK_MIN_PIXELABSTAND_Y));
  // Von FEIN nach GROB durchgehen (JAHRES_TICK_SCHRITTE ist grob→fein
  // sortiert) und die erste (= feinste) Schrittweite zurückgeben, die noch
  // innerhalb des Tick-Platzbudgets bleibt - deckt sich mit maxTicks bei
  // KEINER Schrittweite (extrem wenig Pixel-Platz), Fallback auf die
  // gröbste verfügbare Schrittweite.
  for (let i = JAHRES_TICK_SCHRITTE.length - 1; i >= 0; i -= 1) {
    const schritt = JAHRES_TICK_SCHRITTE[i];
    if (sichtbareJahresSpanne / schritt <= maxTicks) return schritt;
  }
  return JAHRES_TICK_SCHRITTE[0];
}

function baueJahresTickWerte(minJahr, maxJahr, schritt) {
  const start = Math.ceil(minJahr / schritt) * schritt;
  const werte = [];
  for (let jahr = start; jahr <= maxJahr; jahr += schritt) werte.push(jahr);
  return werte;
}

// --- Zoom/Pan (Grundmuster unverändert aus den vorherigen Aufträgen, siehe
// docs/MODULNOTIZEN.md zur Zeitachse-Herleitung; Punkt 1/2 des 3.
// Folgeauftrags ändern nur den initialen Fit sowie die Tick-Berechnung,
// siehe docs/MODULNOTIZEN.md). -----------------------------------------------
function wireZoom(svg, zoomInhalt, achseGruppe, breite, hoehe, ausdehnung) {
  // WICHTIG (Punkt 2, 3. Folgeauftrag - per Live-Test gefunden, siehe
  // docs/MODULNOTIZEN.md): transform.rescaleY() geht davon aus, dass die
  // RANGE der Basis-Skala bereits dem sichtbaren Viewport entspricht (so
  // wie bei zeitachse.js' xSkalaBasis, deren Range = [RAND.links,
  // breite-RAND.rechts] ist) - hier ist die RANGE von ySkalaBasis aber der
  // GESAMTE Inhalts-Bereich (0 bis Gesamthöhe des Baums in Pixeln, oft weit
  // größer als der Viewport, siehe Punkt 1), da familienbaum.js einen
  // Canvas/Karten-artigen Zoom verwendet (großer, fester Inhaltsraum, eine
  // Kamera-Transform blendet nur einen Ausschnitt ein) statt zeitachses
  // "Skala selbst neu skalieren"-Ansatz. `rescaleY(ySkalaBasis).domain()`
  // lieferte dadurch beim ersten Test falsche, weit außerhalb des sichtbaren
  // Bereichs liegende Jahre (Ticks bei Pixel-Position >9000 auf einer
  // 705px-hohen Ansicht) - stattdessen werden die beiden sichtbaren
  // Viewport-Ränder (0 und hoehe) über `transform.invertY()` zurück in
  // Inhalts-Pixel und dann über `ySkalaBasis.invert()` in Jahre übersetzt,
  // und eine EIGENE, viewport-breite Achsen-Skala (Range = [0, hoehe])
  // daraus gebaut - das ist unabhängig von rescaleY()s Annahme korrekt.
  function aktualisiereAchse(transform) {
    const ySkalaBasis = d3.scaleLinear().domain([instanz.jahrMin, instanz.jahrMax]).range([0, (instanz.jahrMax - instanz.jahrMin) * PIXEL_PRO_JAHR]);
    const jahrA = ySkalaBasis.invert(transform.invertY(0));
    const jahrB = ySkalaBasis.invert(transform.invertY(hoehe));
    const sichtbarMin = Math.min(jahrA, jahrB);
    const sichtbarMax = Math.max(jahrA, jahrB);
    const achsenSkala = d3.scaleLinear().domain([sichtbarMin, sichtbarMax]).range([0, hoehe]);
    const schritt = ermittleJahresTickSchritt(sichtbarMax - sichtbarMin, hoehe);
    const tickWerte = baueJahresTickWerte(sichtbarMin, sichtbarMax, schritt);
    achseGruppe.call(d3.axisLeft(achsenSkala).tickValues(tickWerte).tickFormat(d3.format('d')));
  }

  const zoomVerhalten = d3.zoom()
    // Punkt 2 (3. Folgeauftrag): Obergrenze 4→24, siehe docs/MODULNOTIZEN.md -
    // reine Parameteränderung, dieselbe Zoom/Pan-Mechanik (Mausrad zoomt,
    // Ziehen verschiebt) bleibt unverändert.
    .scaleExtent([0.2, 24])
    .translateExtent([
      [ausdehnung.minX - breite, ausdehnung.minY - hoehe],
      [ausdehnung.maxX + breite, ausdehnung.maxY + hoehe]
    ])
    .on('zoom', (event) => {
      instanz.zoomTransform = event.transform;
      // Die Transform gilt in svg-Koordinaten (Mauszeiger); der Ausschnitt beginnt erst bei RAND.links
      zoomInhalt.attr('transform', `translate(${-RAND.links},0) ${event.transform}`);
      aktualisiereAchse(event.transform);
    });
  svg.call(zoomVerhalten);

  if (instanz.zoomTransform) {
    svg.call(zoomVerhalten.transform, instanz.zoomTransform);
  } else {
    const baumBreite = Math.max(ausdehnung.maxX - ausdehnung.minX, 1);
    // Punkt 1 (3. Folgeauftrag): NUR noch breiten-begrenzt (verhindert
    // seitliches Abschneiden auf schmalen Fenstern), NICHT mehr
    // höhen-begrenzt - siehe docs/MODULNOTIZEN.md ("künstliches Höhenlimit").
    const skala = Math.min(1, breite / baumBreite);
    const startX = RAND.links + breite / 2 - ((ausdehnung.minX + ausdehnung.maxX) / 2) * skala;
    const startY = RAND.oben - ausdehnung.minY * skala;
    svg.call(zoomVerhalten.transform, d3.zoomIdentity.translate(startX, startY).scale(skala));
  }
  return zoomVerhalten;
}

// Punkt 4 (3. Folgeauftrag): liest die tatsächlich im Code verwendeten
// Fill-Konstanten aus, siehe docs/MODULNOTIZEN.md - keine erfundenen
// Kategorien. Modul-Funktion statt Inline im Aufrufer, damit die Zuordnung
// Konstante->Legenden-Text an einer Stelle steht.
// Wunsch des Autors (2026-10-28): die Legende steht nicht mehr im Infotext, sondern kompakt in der Zeile
// neben „Unsicherheiten anzeigen“ - daher kurze Beschriftungen; dazu Ehe-Symbol und die beiden Linienarten.
function baueFarblegende() {
  const wrapper = document.createElement('div');
  wrapper.className = 'familienbaum-legende';
  wrapper.setAttribute('role', 'list');
  wrapper.setAttribute('aria-label', 'Legende zum Stammbaum');

  const zeile = (zeichen, label, klasse = '') => {
    const z = document.createElement('div');
    z.className = `familienbaum-legende-zeile ${klasse}`.trim();
    z.setAttribute('role', 'listitem');
    z.append(zeichen, document.createTextNode(label));
    wrapper.appendChild(z);
    return z;
  };
  const swatch = (farbe, klasse = '') => {
    const s = document.createElement('span');
    s.className = `familienbaum-legende-swatch ${klasse}`.trim();
    if (farbe) s.style.background = farbe;
    s.setAttribute('aria-hidden', 'true');
    return s;
  };
  const linie = ({ farbe, strich }) => {
    const s = document.createElement('span');
    s.className = 'familienbaum-legende-linie';
    s.style.borderTop = `3px ${strich ? 'dashed' : 'solid'} ${farbe}`;
    s.setAttribute('aria-hidden', 'true');
    return s;
  };

  [
    { farbe: HABSBURG_BASIS_FARBE, label: dynastieName() },
    { farbe: GRAU_EHEPARTNERFAMILIE, label: 'andere Familie' },
    { farbe: GOLD_FARBE, label: 'Regierungszeit' },
    { farbe: HEIRAT_FARBE, label: 'Kaiserin/Königin durch Heirat' }
  ].forEach(({ farbe, label }) => zeile(swatch(farbe), label));

  const ehe = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ehe.setAttribute('class', 'familienbaum-legende-ehe');
  ehe.setAttribute('viewBox', `${-EHE_SYMBOL_BREITE / 2 - 8} -30 ${EHE_SYMBOL_BREITE + 16} 60`);
  ehe.setAttribute('aria-hidden', 'true');
  ehe.innerHTML = `<path d="${EHE_SYMBOL_PFAD}" fill="none" stroke="${EHE_FARBE}" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
  zeile(ehe, 'Ehe');
  zeile(linie(LINIE_ELTERN), 'zu den Eltern');
  zeile(linie(LINIE_KINDER), 'zu den Kindern');

  // nur bei eingeschalteten Unsicherheiten sichtbar (siehe zeichneFamilienbaum())
  zeile(swatch(null, 'familienbaum-legende-swatch-unsicher'), 'unsichere Angabe', 'familienbaum-legende-unsicher');

  return wrapper;
}

// --- Werkzeugleiste: nur noch der Info-Button (Punkt 1, Folgeauftrag:
// der Politische-Stellung-Umschalter entfällt ersatzlos). -----------------

function baueWerkzeugleiste(container) {
  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'familienbaum-werkzeugleiste';

  const infoContainer = document.createElement('div');
  infoContainer.className = 'familienbaum-info-anker';
  werkzeugleiste.appendChild(infoContainer);
  // 2026-10-28: Legende in die Zeile des Unsicherheiten-Knopfs (Geschwister des Viz-Containers, siehe
  // app.js stelleVizFlyoutSicher()); fehlt diese Zeile, bleibt sie wie bisher im Infotext
  const knopfZeile = instanz.container.parentElement?.querySelector(':scope > .werkzeugleiste-unsicherheit');
  const legende = baueFarblegende();
  if (knopfZeile) {
    knopfZeile.appendChild(legende);
    instanz.legende = legende;
  }
  infotextFuerModul('familienbaum').then((cfg) => {
    if (!instanz || !cfg || !infoContainer.isConnected) return;
    instanz.infoButton = erzeugeInfoButton(infoContainer, { ...cfg, zusatzInhalt: knopfZeile ? undefined : legende });
  });

  container.appendChild(werkzeugleiste);
}

// --- Hauptzeichenfunktion --------------------------------------------------
function zeichneFamilienbaum() {
  const { container, plotBereich, byId, kinderIndex, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  instanz.letzteUnsicherheit = Boolean(zeigeUnsicherheit); // Auftrag 13 (resize)
  plotBereich.innerHTML = '';
  if (instanz.legende) instanz.legende.querySelector('.familienbaum-legende-unsicher').hidden = !zeigeUnsicherheit;
  // Punkt 3 (3. Folgeauftrag): kein Element wird gerade gehovert, direkt
  // nach einem Neuaufbau (z.B. Fenster-Resize) - die eingefrorene Auswahl
  // (Klick) bleibt dagegen bewusst bestehen (siehe render()-Instanz-Objekt).
  instanz.hoverFokusId = null;

  const wurzelKnotenListe = baueWurzeln(byId, kinderIndex);
  const wurzeln = baueForstLayout(wurzelKnotenListe);

  if (wurzeln.length === 0) {
    const hinweis = document.createElement('p');
    hinweis.className = 'familienbaum-leer-hinweis';
    hinweis.textContent = `Keine Personen im ${dynastieName()}-Kreis gefunden.`;
    plotBereich.appendChild(hinweis);
    return;
  }

  const modell = baueRenderModell(wurzeln, byId);

  const minX = Math.min(...modell.knoten.map((k) => k.x)) - instanz.kastenBreite;
  const maxX = Math.max(...modell.knoten.map((k) => k.x)) + instanz.kastenBreite + instanz.spaltenAbstand;
  const minY = Math.min(...modell.knoten.map((k) => k.yTop)) - 20;
  const maxY = Math.max(...modell.knoten.map((k) => k.yBottom)) + 10;

  const breite = options.width || ermittleVerfuegbareBreite(plotBereich);
  const hoehe = options.height || ermittleVerfuegbareHoehe(plotBereich, { reserveUnten: RAND.unten });

  const svg = d3.select(plotBereich).append('svg')
    .attr('width', breite).attr('height', hoehe)
    .attr('role', 'group') // AUFTRAG D, Punkt 2 (axe nested-interactive): enthält bedienbare Elemente; aria-label bleibt
    .attr('aria-label', `${dynastieName()}-Zeitleistenbaum`);
  // Punkt 3 (3. Folgeauftrag): Klick auf freie Fläche löst die eingefrorene
  // Hervorhebung - erreicht diesen Handler NUR, wenn der Klick nicht auf
  // einer Personen-Gruppe war (deren eigener Klick-Handler ruft
  // event.stopPropagation() auf, siehe zeichneBaum()).
  svg.on('click', () => {
    if (!instanz.eingefrorenerFokusId) return;
    instanz.eingefrorenerFokusId = null;
    aktualisiereHervorhebung();
  });
  svg.append('desc').text(
    `Zeitleisten-Stammbaum des Hauses ${dynastieName()}: jeder Balken reicht vom Geburts- bis zum Sterbejahr der Person. `
    + 'Bei Kaisern und Königen aus eigenem Recht ist der Regierungszeitraum golden hervorgehoben, Kaiserinnen und '
    + 'Königinnen durch Heirat sind vollständig in einem helleren Goldton gefüllt. Eine liegende Acht verbindet '
    + 'Ehepartner. Gestrichelt umrandete Personen haben unsichere Angaben.'
  );

  // Linke Jahres-Achse: eigene, NICHT mitgezoomte <g> (Zoom verschiebt nur
  // zoomInhalt) - wireZoom() berechnet ihre Ticks bei jedem Zoom-Schritt
  // aus der aktuellen Transform neu (siehe dortiger Kommentar).
  const achseGruppe = svg.append('g').attr('class', 'familienbaum-jahresachse').attr('transform', `translate(${RAND.links},0)`);

  // 2026-10-27: Baum in eigenem, rechts der Jahresachse beschnittenem Ausschnitt - die Zoom-Transform
  // überschrieb bisher das translate(RAND.links) und Balken ragten über die Achse (Hinweis des Autors).
  const ausschnittId = `familienbaum-ausschnitt-${Math.random().toString(36).slice(2, 8)}`;
  svg.append('clipPath').attr('id', ausschnittId)
    .append('rect').attr('width', Math.max(breite - RAND.links, 0)).attr('height', hoehe);
  const ausschnitt = svg.append('g')
    .attr('transform', `translate(${RAND.links},0)`)
    .attr('clip-path', `url(#${ausschnittId})`);
  const zoomInhalt = zeichneBaum(ausschnitt, modell, plotBereich, zeigeUnsicherheit);

  instanz.zoomVerhalten = wireZoom(svg, zoomInhalt, achseGruppe, breite - RAND.links, hoehe, { minX, maxX, minY, maxY });
  instanz.letzteBaumausdehnung = { minX, maxX, minY, maxY };
  kennzeichneLichtAus(); // Auftrag 13
}

// --- Auftrag 13: Modus „Licht aus“ ------------------------------------------
// Unsichere Personen leuchten: Lichthof (Bernstein) mit dunklem Spalt um den Balken, damit das Licht auch neben hellen
// Füllungen (Grau, Gold, „durch Heirat“) 3:1 hält. Die zeitliche Unsicherheit steht als Querstrich im Muster ihrer
// Ausprägung an der Kante: oben Geburtsdatum, unten Sterbedatum. Übrige Personen: nur die Flächen gedimmt, Namen
// bleiben lesbar; Linien und Ehe-Symbole gedimmt (css/components.css). Strichbreiten in Bildschirmpixeln
// (vector-effect), damit sie bei jedem Zoom gleich bleiben. „Nur diese zeigen“ gibt es hier nicht (Lücken im Baum).
// Identifikations- oder Beziehungsangaben trägt familien.csv nicht (Auftrag 12); sie erscheinen in der Leiste ausgegraut.
const LICHT_AUS_DATEI = 'familien.csv';
const LICHT_AUS_FELDER = ['geburtsdatum', 'sterbedatum'];
const LICHT_AUS_OHNE_NUR_DIESE = 'Im Stammbaum würden Lücken entstehen: Linien zwischen Eltern, Kindern und Ehepartnern verlören ihren Bezug.';

function kennzeichneLichtAus() {
  const knoten = instanz?.selektionen?.knoten;
  if (!knoten) return;
  knoten.selectAll('.lichtaus-hof, .lichtaus-strich, .lichtaus-strich-innen').remove();
  const optionen = instanz.options.lichtAus;
  if (!optionen) {
    knoten.each(function () { setzeLicht(this, null); });
    knoten.attr('aria-label', (d) => `${d.person.name}, Details anzeigen`);
    return;
  }
  const einheiten = knoten.data().map((d) => ({ id: d.id, eintraege: eintraegeAus(d.person, LICHT_AUS_DATEI, LICHT_AUS_FELDER) }));
  const vorbereitung = lichtAusVorbereitung(einheiten, optionen.auswahl);
  knoten.each(function (d, i) {
    const wirksam = vorbereitung.wirksam(einheiten[i]);
    setzeLicht(this, wirksam.length > 0);
    this.setAttribute('aria-label', `${d.person.name}${wirksam.length ? `, unsicher: ${beschreibeEintraege(wirksam, typName, auspraegungName)}` : ''}, Details anzeigen`);
    if (!wirksam.length) return;
    const g = d3.select(this);
    const balken = g.select('rect.familienbaum-balken');
    const x = +balken.attr('x'), y = +balken.attr('y'), w = +balken.attr('width'), h = +balken.attr('height');
    g.insert('rect', ':first-child').attr('class', 'lichtaus-hof').attr('aria-hidden', 'true')
      .attr('x', x).attr('y', y).attr('width', w).attr('height', h).attr('rx', 3);
    for (const feld of LICHT_AUS_FELDER) {
      const muster = musterAus(wirksam.filter((e) => e.feld === feld).map((e) => e.auspraegung));
      if (!muster) continue;
      const yy = feld === 'geburtsdatum' ? y : y + h;
      const strich = (klasse) => g.append('line').attr('class', klasse).attr('aria-hidden', 'true')
        .attr('x1', x).attr('x2', x + w).attr('y1', yy).attr('y2', yy);
      strich('lichtaus-strich').attr('data-muster', muster);
      if (muster === 'doppelt') strich('lichtaus-strich-innen');
    }
  });
  optionen.melde?.({ einheiten, massengruppen: vorbereitung.massengruppen, felder: { [LICHT_AUS_DATEI]: LICHT_AUS_FELDER },
    nurDieseMoeglich: false, nurDieseGrund: LICHT_AUS_OHNE_NUR_DIESE });
}

// --- Modul-Interface (Abschnitt 5) ---------------------------------------

// Länge begründet (über 100 Zeilen, Masterprompt §13.3; Nachbesserung 8): Einstieg des Moduls (Modul-Interface, Masterprompt §13): baut Gerüst, Instanz und Ereignisse in fester Reihenfolge auf; die Schritte hängen voneinander ab.
export function render(container, data, options = {}) {
  if (instanz) destroy();

  container.innerHTML = '';
  fuegeStyleEin(container);
  fuegeBildschirmHinweisStyleEin(container);

  const datensaetze = mitTextfeldern(data, TEXTFELDER);
  const { kreisIds } = ermittleHabsburgKreis(datensaetze);
  const kreisRecords = datensaetze.filter((r) => kreisIds.has(r.id));
  const { byId, kinderIndex } = baueDatenIndex(kreisRecords);
  const { jahrMin, jahrMax } = ermittleJahresSpanne(kreisRecords);
  // Punkt 1/2 (2. Folgeauftrag): Kästchenbreite aus den tatsächlichen
  // Namen berechnet, Spaltenabstand folgt daraus (siehe docs/MODULNOTIZEN.md
  //) - beide vor der Instanz-Erzeugung, da baueForstLayout()/
  // baueRenderModell() bereits beim ersten zeichneFamilienbaum()-Aufruf
  // auf instanz.spaltenAbstand zugreifen.
  const kastenBreite = berechneKastenbreite(kreisRecords);

  instanz = {
    container,
    records: kreisRecords,
    options: { showUncertainty: true, width: null, height: null, ...options },
    byId,
    kinderIndex,
    familienFarben: berechneFamilienFarben(),
    jahrMin,
    jahrMax,
    kastenBreite,
    spaltenAbstand: kastenBreite + ZWEIG_LUECKE_BASIS,
    // Mindest-Mittenabstand, den loeseUeberlappungGlobal() zwischen zwei
    // zeitlich aktiven Kästchen erzwingt (siehe docs/MODULNOTIZEN.md Punkt 3) -
    // unabhängig von spaltenAbstand, das nur die BEVORZUGTE (nicht
    // garantierte) Baum-Spaltenbreite ist.
    spaltenLaneAbstand: kastenBreite + SPALTEN_LANE_PADDING,
    zoomVerhalten: null,
    zoomTransform: null,
    infoButton: null,
    // Punkt 3 (3. Folgeauftrag): siehe docs/MODULNOTIZEN.md/aktualisiereHervorhebung().
    hoverFokusId: null,
    eingefrorenerFokusId: null,
    selektionen: null,
    // AUFTRAG "Teil 2f", Punkt 2: siehe oeffneDatensatz()/oeffnePersonImBaum().
    ausstehenderDatensatz: null
  };

  const wurzel = document.createElement('div');
  wurzel.className = 'familienbaum-wurzel';
  container.appendChild(wurzel);
  instanz.wurzel = wurzel;

  // Nachbesserung 3, Punkt 3: Eine Person ohne `id` lässt sich im Baum nicht verorten (Verknüpfungen laufen über die
  // id) - nicht still weglassen (Masterprompt §12), sondern benennen.
  const ohneId = datensaetze.filter((r) => fehlendeMindestfelder(r).includes('id'));
  if (ohneId.length) {
    const namen = ohneId.map((r) => String(r.name || '').trim() || '(ohne Namen)').join(', ');
    wurzel.appendChild(erzeugeHinweisBalken([`${UNVOLLSTAENDIG_TEXT}: ${ohneId.length === 1 ? 'Eine Person' : `${ohneId.length} Personen`} in familien.csv ohne id, im Stammbaum nicht darstellbar: ${namen}.`]));
  }

  // KORREKTURAUFTRAG "Vier unabhängige Korrekturen", Punkt 3: Diagnose per
  // Debug-Instrumentierung (siehe Selbstauskunft im Chat) - KEIN DPI-/
  // devicePixelRatio-Fehler (das Projekt liest devicePixelRatio nirgends,
  // grep-geprüft). Tatsächliche Ursache: `window.innerWidth`/
  // `window.innerHeight` können GENAU an dieser Stelle noch **0** sein - der
  // erste `render()`-Aufruf einer frisch geladenen Seite läuft synchron
  // (Ende der `await ladeArchivalienDaten()`-Kette in app.js) VOR dem
  // allerersten Layout/Paint-Durchlauf des Browsers, der `window.inner*`
  // erst mit echten Werten befüllt - live gemessen: `{breite:166, hoehe:320,
  // innerWidth:0, innerHeight:0}` statt der tatsächlichen Fenstergröße,
  // dadurch fälschlich `istBildschirmZuKlein() === true`. Unter normalen
  // Bedingungen ist dieses Zeitfenster verschwindend kurz und bleibt
  // unbemerkt; die zusätzliche Compositor-/Rasterisierungsarbeit, die
  // fraktionale Windows-Skalierung (125 %) beim allerersten Frame
  // verursacht, verbreitert dieses Zeitfenster vermutlich spürbar - deckt
  // sich mit dem gemeldeten Symptom (reproduzierbar bei 125 %, nicht bei
  // 100 %). Behebung: liegt `window.innerWidth`/`innerHeight` erkennbar
  // noch nicht vor (0 - ein gültiges Browserfenster hat nie 0px Breite/
  // Höhe), wird EIN Frame gewartet (`requestAnimationFrame`) und danach neu
  // gemessen, statt die verfrühte 0-Messung als "Bildschirm zu klein" zu
  // werten. Im Normalfall (innerWidth/innerHeight bereits gültig) läuft
  // exakt derselbe Code wie zuvor, synchron, ohne Verzögerung.
  // Auftrag 9: Prüfung nach Breite des Darstellungsbereichs und Fensterhöhe (siehe bildschirmHinweis.js); ist der
  // Bereich noch nicht gelayoutet (Breite 0), wird ein Frame später gemessen statt „zu klein“ zu melden.
  function pruefeGroesseUndBaueRest(versuch = 0) {
    const zuKlein = istDarstellungsbereichZuKlein(container.clientWidth, window.innerHeight);
    if (zuKlein === null && versuch < 5) {
      requestAnimationFrame(() => { if (instanz && instanz.wurzel === wurzel) pruefeGroesseUndBaueRest(versuch + 1); });
      return;
    }
    if (zuKlein) {
      wurzel.appendChild(baueBildschirmHinweis());
      return;
    }

    baueWerkzeugleiste(wurzel);

    const plotBereich = document.createElement('div');
    plotBereich.className = 'familienbaum-plot-bereich';
    wurzel.appendChild(plotBereich);
    instanz.plotBereich = plotBereich;

    zeichneFamilienbaum();
  }

  if (!window.innerWidth || !window.innerHeight) {
    requestAnimationFrame(() => { if (instanz && instanz.wurzel === wurzel) pruefeGroesseUndBaueRest(); });
    return;
  }
  pruefeGroesseUndBaueRest();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  // Auftrag 13: nur die Auswahl im Modus „Licht aus“ geändert – Kennzeichnung neu, ohne den Baum neu zu zeichnen
  const nurLichtAus = Object.keys(neueOptionen).every((k) => k === 'lichtAus' || (k === 'showUncertainty' && !neueOptionen.showUncertainty === !instanz.letzteUnsicherheit));
  if (nurLichtAus && 'lichtAus' in neueOptionen && instanz.selektionen?.knoten && !instanz.selektionen.knoten.empty()) {
    kennzeichneLichtAus();
    return;
  }

  if (!instanz.plotBereich) {
    render(instanz.container, instanz.records, instanz.options);
    return;
  }
  if (istDarstellungsbereichZuKlein(instanz.options.width || instanz.container.clientWidth, window.innerHeight)) {
    render(instanz.container, instanz.records, instanz.options);
    return;
  }

  const neueBreite = instanz.options.width || ermittleVerfuegbareBreite(instanz.plotBereich);
  if (instanz.letzteBreite !== undefined && instanz.letzteBreite !== neueBreite) {
    instanz.zoomTransform = null;
  }
  instanz.letzteBreite = neueBreite;
  zeichneFamilienbaum();
}

export function destroy() {
  if (!instanz) return;
  schliessePersonenPopover();
  instanz.infoButton?.destroy();
  instanz.legende?.remove();
  instanz.container.innerHTML = '';
  instanz = null;
}

// AUFTRAG "Teil 2f", Punkt 2: Kern der Oeffnen-Logik - nutzt EXAKT dieselbe
// Logik wie ein Klick auf die Person (Auftrag woertlich): setzt
// `eingefrorenerFokusId`, aktualisiert die Hervorhebung, oeffnet dasselbe
// Popover - kein separater Hervorhebungs-Mechanismus. `instanz.selektionen.knoten`
// ist dieselbe D3-Selektion, die auch der Klick-Handler oben durchsucht
// (Datum je Knoten traegt `.id`/`.person`, siehe zeichneFamilienbaum()).
function oeffnePersonImBaum(id) {
  if (!instanz || !instanz.selektionen) return false;
  const gefunden = instanz.selektionen.knoten.filter((d) => d.id === id);
  if (gefunden.empty()) return false;
  const d = gefunden.datum();
  versteckeTooltip();
  // 2026-10-30: den Ausschnitt auf die Person zentrieren (Maßstab bleibt), bevor das Popover an ihr erscheint -
  // sonst lag sie bei einem Aufruf von außen (z. B. aus der Willkommenstour) oft außerhalb des Bildes
  const knoten = gefunden.node();
  const svgElement = knoten.ownerSVGElement;
  if (instanz.zoomVerhalten && svgElement) {
    const box = knoten.getBBox();
    d3.select(svgElement).call(instanz.zoomVerhalten.translateTo, d.x + box.x + box.width / 2, box.y + box.height / 2);
  }
  instanz.eingefrorenerFokusId = d.id;
  aktualisiereHervorhebung();
  zeigePersonenPopover(d.person, knoten);
  return true;
}

// Schmale Oeffnen-Funktion fuer den `familie`-Datensatzaufruf
// (js/utils/datensatzAufruf.js' verarbeiteDatensatzAufruf()) - dasselbe
// etablierte Muster wie zeitachse.js/parallelKoordinaten.js/treemap.js/
// personenliste.js aus Teil 2b.
//
// SONDERFALL (live gefunden, siehe Selbstauskunft im Chat): bei einem
// GANZ FRISCHEN Seitenaufruf direkt auf `?datensatz=familie:...` kann
// `render()` seinen Aufbau gerade per `requestAnimationFrame` verzoegert
// haben (Korrekturauftrag "Vier unabhaengige Korrekturen", Punkt 3 - dort
// derselbe, absichtlich enge Zeitraum, in dem `window.innerWidth`/
// `innerHeight` noch nicht bereitstehen). `verarbeiteDatensatzAufruf()`
// ruft `oeffneDatensatz()` aber synchron GENAU EINMAL auf, ohne erneuten
// Versuch - `instanz.selektionen` existiert in diesem engen Zeitfenster
// noch nicht. Statt dann faelschlich "nicht gefunden" zu melden, merkt
// sich diese Funktion die Anfrage auf `instanz.ausstehenderDatensatz` und
// gibt optimistisch `true` zurueck - `zeichneFamilienbaum()` holt die
// Anfrage oben (s.o.) nach, sobald `instanz.selektionen` steht.
export function oeffneDatensatz(id) {
  if (instanz && !instanz.selektionen) {
    instanz.ausstehenderDatensatz = id;
    return true;
  }
  return oeffnePersonImBaum(id);
}

// --- Styles ---
function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .familienbaum-wurzel { display: flex; flex-direction: column; height: 100%; }
    .familienbaum-werkzeugleiste { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3);
      margin-bottom: var(--space-3); flex: 0 0 auto; }
    .familienbaum-info-anker { margin-left: auto; flex: 0 0 auto; }
    .familienbaum-plot-bereich { flex: 1 1 auto; overflow: hidden; touch-action: none; }
    .familienbaum-jahresachse { font-size: 11px; }
    .familienbaum-person { cursor: pointer; transition: opacity 150ms ease; }
    .familienbaum-person:focus, .familienbaum-person:focus-visible { outline: none; }
    .familienbaum-person:focus rect.familienbaum-balken, .familienbaum-person:focus-visible rect.familienbaum-balken { stroke: var(--accent); stroke-width: 2.5px; }
    /* Punkt 3 (3. Folgeauftrag): dieselbe Übergangszeit wie .familienbaum-person,
       damit Kästchen und ihre Verbindungslinien optisch synchron ein-/ausblenden. */
    .familienbaum-eltern-kind-linien line, .familienbaum-ehe-linien line { transition: opacity 150ms ease; }
    .familienbaum-leer-hinweis { padding: var(--space-4); color: var(--text-muted); }
    /* 2026-10-28: Legende neben „Unsicherheiten anzeigen“ (vorher im Info-Popover). */
    .familienbaum-legende { display: inline-flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-3);
      margin-left: var(--space-4); vertical-align: middle; max-width: 100%; }
    .familienbaum-legende-zeile { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-sm); white-space: nowrap; }
    .familienbaum-legende-zeile[hidden] { display: none; }
    .familienbaum-legende-linie { width: 22px; height: 0; flex: 0 0 auto; }
    .familienbaum-legende-ehe { width: 24px; height: 12px; flex: 0 0 auto; }
    @media (max-width: 700px) { .familienbaum-legende { margin-left: 0; margin-top: var(--space-2); } }
    .familienbaum-legende-swatch { width: 14px; height: 14px; min-width: 14px; border-radius: 3px;
      border: 1px solid var(--border); flex: 0 0 auto; }
    .familienbaum-legende-swatch-unsicher { background: transparent; border: 2px dashed #c0392b; }
    .familienbaum-popover { position: absolute; z-index: 40; width: 240px; background: var(--surface);
      border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding: var(--space-3); }
    .familienbaum-popover:focus { outline: none; }
    .familienbaum-popover-feld { margin-bottom: var(--space-2); font-size: var(--fs-sm); }
    .familienbaum-popover-feld:last-of-type { margin-bottom: 0; }
    .familienbaum-popover-feld-label { font-weight: 600; color: var(--text-muted); font-size: 11px; }
    .familienbaum-popover-schliessen { position: absolute; top: 4px; right: 4px; min-width: 32px; min-height: 32px;
      border: none; background: none; font-size: 1.2rem; cursor: pointer; }
    .familienbaum-popover-schliessen:focus-visible { outline: 3px solid var(--accent); outline-offset: 1px; }
  `;
  container.appendChild(style);
}
