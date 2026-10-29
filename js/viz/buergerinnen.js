// js/viz/buergerinnen.js
// „Bürgerinnen?“ (Wunsch des Autors, 2026-10-28): Das Bürgerbuch von Krems (1535–1625) nennt 2 655 Personen -
// Neubürger und ihre Bürgen -, aber keine einzige Frau. Die Ansicht zeigt dieses Fehlen: ein Punktfeld mit
// einem Punkt je Person (zusammen bilden sie das Steiner Tor); ein Klick auf „Nach Geschlecht ordnen“ lässt die Punkte in zwei Spalten fließen,
// links „Männer“, rechts „Frauen“. Die rechte Spalte bleibt leer - als gestrichelter Rahmen in derselben
// Größe, damit sichtbar wird, dass hier Platz wäre. Ein Satz darunter verhindert den Fehlschluss, es habe
// keine Frauen gegeben, und verweist auf die Führung „Frauen im Archiv“.
//
// Personen: aufgenommene Personen (`personen_id`) und Bürgen (`buergen_id`) aus buergerbuch.csv, je Person
// ein Punkt (eindeutige Kennung). Das Bürgerbuch hat keine Spalte zum Geschlecht; dass keine Frau darin
// vorkommt, hat der Autor am Quelltext geprüft. Trägt ein Datensatz künftig `geschlecht` = w/weiblich,
// erscheint die Person rechts - die Ansicht behauptet die Null also nicht, sie zählt sie.
// Klick auf einen Punkt (seit 2026-10-28, Wunsch des Autors) öffnet dieselbe Sidebar wie die Personenliste:
// alle Quelleneinträge der Person (Bürgerbuch als Neubürger oder Bürge, dazu Urkunden und Inventare aus der
// Personenliste). Klick auf eine freie Stelle oder auf „Nach Geschlecht ordnen“/„Wieder mischen“ schließt sie.
// Nach dem Ordnen steht zwischen den beiden Spalten eine kurze Erklärung (2026-10-28): was das Bürgerbuch ist und
// warum keine Frau darin steht; auf schmalen Bildschirmen steht sie unter den Spalten.
//
// Folien (Wunsch des Autors, 2026-10-28): immer nur ein sprechender Weiter-Knopf mit hüpfendem Pfeil nach unten und
// ein Zurück-Knopf. Folge: Steiner Tor → Nach Geschlecht ordnen → die leere Frauen-Spalte füllt sich mit ebenso vielen
// symbolischen Punkten wie Männer (Folie `frauen`, Punkte ohne Person, kein Klick) → Männer und Frauen vereinen sich
// zu Haushalten: aus den Männern werden drei Säulen der
// Bürgerschaft nach Schicht (links Kleinhändler und Hauer, rechts reiche Handelsleute), daneben links ein kurzer
// Text → Goldmünzen regnen in die schon reservierten Felder unter den Säulen (Gesamtvermögen je Schicht), Text kommt
// dazu → links neben dem Text steigt Punkt für Punkt die Säule der Inwohner und Hilfskräfte ohne Bürgerrecht auf
// (mindestens so viele, ohne Münzen) → Stadt und Kirche (Folie `klerus`, Beginn der Reformations-Erzählung): rechts
// formen alle blauen und violetten Punkte wieder das Steiner Tor, die Münzen eine kleine goldene Kirche; der Text
// bleibt an seinem Platz → Reformation (Folie `reformation`): die Punkte des Tors wandern links neben den Text und
// bilden ein blau-lila Kreuz, die Kirche bleibt stehen. In den drei Vermögens-Folien steht ein Punkt für einen Anteil der
// Bürgerschaft, nicht für eine bestimmte Person (kein Klick, Tooltip nennt die Schicht). Knöpfe, Texte und Münzwert
// stehen in data/buergerinnen_stationen.csv, Anteile und Gulden-Spannen in data/buergerinnen_schichten.csv (siehe
// docs/SCHEMA.md 13.8); Vermögen einer Schicht = Haushalte × Mittelwert.
// Modul-Interface siehe Abschnitt 5.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { infotextFuerModul } from '../core/archivKonfiguration.js';
import { ermittleVerfuegbareHoehe } from '../utils/viewportGroesse.js';
import { teileNachJahr } from '../utils/buergerbuchZeit.js';
import { alsText } from '../utils/textwert.js';
import { baueSidebarGeruest, fuegeSidebarStyleEin, schliesseSidebar, oeffneSidebar as oeffneBestandSidebar, zeigeUrkundenDetail } from '../utils/sidebar.js';
import { paletteFarbeNachRang, OHNE_KATEGORIE_FARBE } from '../utils/kategorieFarben.js';
import { OHNE_KATEGORIE } from '../utils/bestandsHierarchie.js';
import {
  zeigePersonenNennungen, zurueckZurKombiniertenListe, ermittleUrkundenFuerPerson, ermittleBuergerbuchFuerPerson, ermittleInventareFuerPerson
} from './personenliste.js';
import { baueDatensatzLink } from '../utils/datensatzAufruf.js';
import { ladeCSV } from '../core/dataLoader.js';

const FARBE = '#2c4a6e';          // Tintenblau der Seite
const RAHMEN = '#9a9081';         // warmes Grau für leere Rahmen und die Säule ohne Bürgerrecht
const AUSWAHL = '#e0b429';        // Ring um den gewählten Punkt (wie der Fokusrahmen des Knopfs)
const FRAUEN_FARBE = '#7a5a8c';   // symbolische Frauen-Punkte (gedämpftes Violett, unterscheidbar vom Tintenblau)
// Haushalte (Vermögens-Folien): Mischfarbe aus Männern (Tintenblau #2c4a6e) und Frauen (Violett #7a5a8c), genau
// die Mitte beider; beim Verschmelzen gehen beide Punktfarben fließend in sie über (Wunsch des Autors, 2026-10-28;
// zuvor kurz Türkis)
const HAUSHALT_FARBE = '#53527d';
const BORDEAUX = '#7b2232';        // Folie `weinzoll`: die Punkte als Wein
const GOLD = '#c9a227';           // Münzen (wie die Regierungszeit im Stammbaum)
const GOLD_RAND = '#8a6d1a';
// VORLÄUFIG (2026-10-29, zur Abstimmung mit dem Autor; später entfernen): Foliennummer neben den Knöpfen und
// Diagnosezeilen in der Konsole, wenn eine Bewegung nicht von selbst fertig wird oder ein Klick lange dauert
const DIAGNOSE = true;
const DAUER = 1300;
const LEINWAND_UEBERSTAND = 60;   // px: die Leinwand reicht unter die Bühne (Punkte, die von unten aufsteigen)
const STAFFELUNG = 250;           // ms: so weit setzen sich die Punkte zeitversetzt in Bewegung
// Folien `klerus`/`reformation`: Formen in eigenen kleinen Koordinatenfeldern - Kreuz aus den Bürgerpunkten,
// kleine Kirche (Turm mit Helm und kleinem Kreuz, Schiff mit Satteldach, Tür ausgespart) aus den Münzen
// Aufgeschlagenes Buch (Folien `tor`, `berufe`, `buergerbuch`; seit 2026-10-29 statt des Steiner Tors, das jetzt für
// das ganze Archiv steht): zwei Seiten mit gewölbter Ober- und Unterkante, dazwischen der Bund
const BUCH = {
  w: 200, h: 130,
  links: 'M6,26 Q50,-6 97,16 V124 Q50,108 6,128 Z',
  rechts: 'M103,16 Q150,-6 194,26 V128 Q150,108 103,124 Z',
  umriss: 'M1,31 Q50,-3 100,20 Q150,-3 199,31 V133 Q150,112 100,128 Q50,112 1,133 Z', // Einband, dünn gezeichnet
  ruecken: 'M100,20 V128'
};

// Weinflasche (Folie `weinzoll`), Burgunderform (Wunsch des Autors): Lippe, langer Hals, flach abfallende Schultern,
// Bauch mit leicht gerundetem Boden
const FLASCHE = {
  w: 100, h: 300,
  flaechen: ['M40,0 H60 V12 H58 V78 C58,126 90,138 90,186 V290 Q90,300 80,300 H20 Q10,300 10,290 V186 C10,138 42,126 42,78 V12 H40 Z'],
  bauch: [10, 90] // linker und rechter Rand des Bauchs (für Pegellinie und Beschriftung)
};
// Folie `reformation` („Wie viele glaubten was?“, tiefe Unsicherheit): der katholische Anteil ist unbekannt; die Punkte
// pendeln zwischen Kreuz und Kirche durch diese Anteile (höchstens KATHOLISCH_HOECHSTENS)
const KATHOLISCH_ANTEILE = [0.025, 0.15, 0.05, 0.2, 0.08];
const KATHOLISCH_HOECHSTENS = 0.2;
const PENDEL_TAKT = 3800;          // ms je Schritt
const KIRCHE_BLASS = 0.3;          // Deckkraft der Münzkirche dort
// Folie `behauptung`: Schreiben des Rates (linke Seite) und Ratsprotokoll des Tages (rechte Seite, fast leer)
const BELEG = {
  eintraege: 14,                      // so viele Punkte für die anderen Einträge des Tages im Protokoll
  streifen: 'M112,24 H186 V40 H112 Z', // dort stehen sie (oben auf der rechten Seite)
  rahmen: [112, 52, 74, 64]           // x, y, Breite, Höhe des leeren, gestrichelten Rahmens
};
const KIRCHENSCHIFF = ['M38,78 H112 V124 H38 Z']; // dort sitzen sie (Tür ausgespart, siehe KIRCHE)
const KREUZ = { w: 100, h: 150, flaechen: ['M40,0 H60 V150 H40 Z', 'M8,32 H92 V52 H8 Z'] };
const KIRCHE = {
  w: 120, h: 126,
  flaechen: [
    'M21.5,0 H24.5 V18 H21.5 Z', 'M17,4.5 H28 V7.5 H17 Z',          // Kreuz auf dem Turm
    'M10,48 H36 V126 H10 Z', 'M8,49 L23,16 L38,49 Z',             // Turm, Helm
    'M36,76 H114 V126 H36 Z', 'M33,77 L74,46 L117,77 Z'           // Schiff, Dach
  ],
  aussparungen: ['M66,126 V110 A8,8 0 0 1 82,110 V126 Z', 'M19,66 H27 V78 H19 Z'] // Tür, Turmfenster
};
const WEIN_SINKEN = 1400;         // ms: so lange sinken auf `weinzoll` die oberen Punkte der Säule und verblassen
const REGEN_START = 700;          // ms bis der Münzregen beginnt (die Seite scrollt vorher zu den Münzfeldern)
const REGEN_DAUER = 2600;         // ms, über die sich der Regen von der untersten bis zur obersten Reihe verteilt
const KOPF_SPALTEN = 64;          // Platz über den Spalten für Überschrift und Zahl
const TEXT_MIN_BREITE = 820;      // ab dieser Bühnenbreite steht die Erklärung neben bzw. zwischen den Säulen
const TEXT_BREITE = 400;          // höchstens so breit
const STATIONEN_DATEI = 'data/buergerinnen_stationen.csv';
const SCHICHTEN_DATEI = 'data/buergerinnen_schichten.csv';
const SEKTOREN_DATEI = 'data/buergerinnen_sektoren.csv';
const WEIN_DATEI = 'data/buergerinnen_weinexport.csv';
const ARCHIV_DATEI = 'data/buergerinnen_archiv.csv';      // welcher Bestand das Bürgerbuch ist, ergänzte Bestände
const BESTAND_DATEI = 'data/bestandsverzeichnis.csv';
const URKUNDEN_DATEI = 'data/urkunden.csv';
const BUERGERBUCH_DATEI = 'data/buergerbuch.csv'; // roh nachgeladen: Bürgen und ihre Berufe stellengleich (siehe ergaenzeSektoren())
const OHNE_BUERGERRECHT = 'ohne_buergerrecht'; // id der grauen Säule in buergerinnen_schichten.csv
const STANDARD_MUENZE = 1000;     // Gulden je Münze, falls die Stationsdatei keinen Wert nennt
const STANDARD_UNTERZEILE = 'Neubürger und ihre Bürgen, ein Punkt je Person';
// Archiv-Folien vor dem Bürgerbuch (Wunsch des Autors, 2026-10-29): ein Punkt je Bestand des Stadtarchivs
// Verlust-Kapitel am Ende (Wunsch des Autors, 2026-10-29): je Folie fällt eine Gruppe der verlorenen Bestände (Ringe)
// aus dem Tor; danach `urkunden` (Lücke oder Wandel?) und `mitmachen` (goldene Punkte füllen die Löcher)
const VERLUST_STATIONEN = ['verlust1', 'verlust2', 'verlust3'];
const VERLUST_GRUPPEN = 3;
const VERLOREN_ANTEIL = 0.75;      // so viele Ringe wie 3/4 der Bestände - ein Bild, keine Messung
const TEXT_RECHTS = ['kategorien', 'urkunden', 'verarbeitung']; // dort steht der Text rechts vom Bild (sonst links, auch auf allen Verlust-Folien)
const VERLUST_ROT = '#a4442f';     // Ringe färben sich so, bevor sie aus dem Tor fallen
const FALL_WEG = 190;              // px: so tief fallen sie
// Karte der Urkunden-Orte (2026-10-29): `orte` (wo liegt das?) und `verarbeitung` (die Karte ist sicherer als wir)
const KARTE_STATIONEN = ['orte', 'verarbeitung'];
const ORTE_DATEI = 'data/orte.csv';
// Lauf der Donau zur Orientierung (Länge, Breite; vereinfacht über Ulm, Regensburg, Passau, Linz, Melk, Krems, Tulln,
// Wien, Pressburg, Komárom, Esztergom, Budapest)
const DONAU = [[9.99, 48.40], [12.10, 49.02], [13.46, 48.57], [14.29, 48.31], [15.33, 48.23], [15.61, 48.41], [16.05, 48.33],
  [16.37, 48.21], [17.11, 48.14], [18.12, 47.76], [18.74, 47.79], [19.04, 47.50]];
const ORT_HOECHSTENS = 40;         // so viele Urkunden je Ort zeigt die Karte höchstens (Wien und Krems haben viel mehr)
const UNSICHER_HELL = '#d9897a';   // Folie `verarbeitung`: Urkunden mit unsicher zugeordnetem Ort
const HERVOR = '#b4541f';
const AUSGEGRAUT = '#b3ada2';      // Folie `schreibweisen`: die übrigen Personen          // Folie `schreibweisen`: Personen mit mehreren Schreibweisen
const ARCHIV_STATIONEN = ['archiv', 'kategorien', 'zeitraeume', 'klick', ...VERLUST_STATIONEN, 'urkunden', ...KARTE_STATIONEN, 'mitmachen'];
const BEKANNTE_STATIONEN = [...ARCHIV_STATIONEN, 'tor', 'berufe', 'buergerbuch', 'schreibweisen', 'geschlecht', 'frauen', 'schichten', 'muenzen', 'vermoegenslos', 'klerus', 'reformation', 'behauptung', 'weinzoll'];
const VERMOEGEN_STATIONEN = ['schichten', 'muenzen', 'vermoegenslos']; // gemeinsames Säulen-Layout
// Beiwerk je Folie (siehe zeichneTeile())
const TEILE = {
  tor: ['buch'],
  buergerbuch: ['buch'],
  schreibweisen: ['buch', 'schreibbeispiele'],
  berufe: ['sektoren'],
  geschlecht: ['geschlecht', 'leeresFeld'],
  frauen: ['geschlecht'], // die Überschriften werden neu gesetzt (ohne Zahlen), siehe zeichneTeile()
  schichten: ['koepfe', 'muenzen', 'legende'], // Münzen schon angelegt, aber verborgen (der Regen startet ohne Aufbau)
  muenzen: ['koepfe', 'werte', 'muenzen', 'legende'],
  vermoegenslos: ['koepfe', 'werte', 'muenzen', 'grau', 'legende'],
  klerus: ['muenzen'],
  reformation: ['muenzen', 'pendel'],
  behauptung: ['muenzen', 'beleg'], // die Kirche blendet aus (AKTUALISIERER.muenzen)
  weinzoll: ['muenzen', 'wein'] // die Kirche blendet aus (AKTUALISIERER.muenzen), an ihrer Stelle steht der Text
};
const PERSONEN_STATIONEN = ['tor', 'berufe', 'buergerbuch', 'schreibweisen', 'geschlecht', 'frauen'];
const TOR_STATIONEN = ['tor', 'buergerbuch']; // das ganze aufgeschlagene Buch (auf `buergerbuch` mit Text links daneben)
// ohne Stationsdatei: Tor und Geschlecht ohne Text
const STANDARD_STATIONEN = [
  { id: 'tor', knopf: 'Steiner Tor', unterzeile: '', muenze: null, anhaengen: false, absaetze: [] },
  { id: 'geschlecht', knopf: 'Nach Geschlecht ordnen', unterzeile: '', muenze: null, anhaengen: false, absaetze: [] }
];

let instanz = null; // { container, wurzel, buehne, personen, station, stationen, schichten, zuordnung, svg, punkte, graue, layout, sidebar, … }

const zahl = (n) => n.toLocaleString('de-AT');
const istFrau = (p) => /^w(eiblich)?$/i.test(alsText(p.geschlecht).trim());

// Eine Person je Kennung: Neubürger mit Jahr der Aufnahme, Bürgen mit ihrem Namen aus der Bürgenliste
function sammlePersonen(buergerbuch, personenliste) {
  const alleSchreibweisen = new Map((personenliste || []).map((p) => [p.personen_id,
    (Array.isArray(p.schreibweisen) ? p.schreibweisen : alsText(p.schreibweisen).split('|')).map((x) => alsText(x).trim()).filter(Boolean)]));
  const namen = new Map([...alleSchreibweisen].map(([id, liste]) => [id, liste[0]]));
  const personen = new Map();
  const jahrJeRecord = new Map(teileNachJahr(buergerbuch).mitJahr.map(({ record, jahr }) => [record, jahr]));
  buergerbuch.forEach((r) => {
    const id = alsText(r.personen_id);
    if (id && !personen.has(id)) {
      personen.set(id, { id, name: namen.get(id) || alsText(r.Name) || id, rolle: 'neubuerger', jahr: jahrJeRecord.get(r) ?? null, geschlecht: r.geschlecht,
        schreibweisen: alleSchreibweisen.get(id) || [] });
    }
  });
  buergerbuch.forEach((r) => {
    const ids = Array.isArray(r.buergen_id) ? r.buergen_id : alsText(r.buergen_id).split('|');
    const bnamen = Array.isArray(r.Buergen) ? r.Buergen : alsText(r.Buergen).split('|');
    ids.map((x) => alsText(x).trim()).forEach((id, i) => {
      if (id && !personen.has(id)) personen.set(id, { id, name: namen.get(id) || alsText(bnamen[i]).trim() || id, rolle: 'buerge', jahr: null, schreibweisen: alleSchreibweisen.get(id) || [] });
    });
  });
  return [...personen.values()];
}

// Wirtschaftssektor je Person (Folie `berufe`, 2026-10-29): Neubürger aus ihrer frühesten Aufnahme mit Sektor;
// sonst - Bürgen, die selbst nie aufgenommen wurden, oder Neubürger ohne Sektor - über ihren Beruf als Bürge, mit
// derselben Zuordnung Beruf → Sektor, die die Aufnahmen zeigen (dann `sektorErschlossen`). Bürgen und Berufe gehören
// über ihre Stelle in den |-Listen zusammen; der Datenlader lässt leere Stellen weg (bei 35 Aufnahmen verschöbe das
// die Berufe), deshalb kommen die beiden Listen aus der roh gelesenen Datei (`rohZeilen`). Fehlt sie, zählen nur
// Aufnahmen, bei denen gleich viele Bürgen und Berufe stehen.
function ergaenzeSektoren(personen, buergerbuch, rohZeilen) {
  const jahrJeRecord = new Map(teileNachJahr(buergerbuch).mitJahr.map(({ record, jahr }) => [record, jahr]));
  const sektorVonBeruf = new Map();
  const eigen = new Map();
  buergerbuch.map((r, k) => ({ r, k, jahr: jahrJeRecord.get(r) ?? Infinity }))
    .sort((a, c) => a.jahr - c.jahr || a.k - c.k)
    .forEach(({ r }) => {
      const sektor = alsText(r.Wirtschaftssektor).trim();
      const beruf = alsText(r.Beruf).trim();
      if (!sektor) return;
      if (beruf && !sektorVonBeruf.has(beruf)) sektorVonBeruf.set(beruf, sektor);
      const id = alsText(r.personen_id).trim();
      if (id && !eigen.has(id)) eigen.set(id, { sektor, beruf });
    });
  const alsBuerge = new Map();
  const listen = rohZeilen
    ? rohZeilen.map((r) => [alsText(r.buergen_id).split('|'), alsText(r.Buergen_Berufe).split('|')])
    : buergerbuch.map((r) => [r.buergen_id, r.Buergen_Berufe].map((w) => (Array.isArray(w) ? w : [alsText(w)])))
      .filter(([ids, berufe]) => ids.length === berufe.length);
  listen.forEach(([ids, berufe]) => {
    ids.forEach((id, k) => {
      const kennung = alsText(id).trim();
      const beruf = alsText(berufe[k]).trim();
      if (kennung && !alsBuerge.has(kennung) && sektorVonBeruf.has(beruf)) alsBuerge.set(kennung, { sektor: sektorVonBeruf.get(beruf), beruf });
    });
  });
  personen.forEach((p) => {
    const treffer = eigen.get(p.id) || alsBuerge.get(p.id);
    p.sektor = treffer?.sektor || null;
    p.beruf = treffer?.beruf || null;
    p.sektorErschlossen = Boolean(treffer && !eigen.has(p.id));
  });
}

function jahresSpanne(buergerbuch) {
  const jahre = teileNachJahr(buergerbuch).mitJahr.map((e) => e.jahr);
  return jahre.length ? [Math.min(...jahre), Math.max(...jahre)] : null;
}

// Gleichmäßige, leicht gemischte Reihenfolge für das Punktfeld (fester Startwert: jedes Mal dasselbe Bild)
function mische(liste) {
  let s = 7;
  const zufall = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(zufall() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.map((p) => ({ ...p, helligkeit: 0.55 + zufall() * 0.4, verzoegerung: zufall() }));
}

// Ausgangszustand (Wunsch des Autors, 2026-10-28; vorher eine Sonnenblumen-Spirale): die Punkte bilden schemenhaft
// das Steiner Tor, nachgezeichnet nach einer Umrisszeichnung des Autors (Koordinaten in deren Bildpunkten): unten
// der Torturm mit Torbogen, darüber der achteckige Aufsatz mit Glockenhelm, Laterne, Zwiebel, Kugel und Spitze;
// links und rechts die beiden Rundtürme mit hohen Kegeldächern und Dachgauben. Torbogen und Rundbogenfenster sind ausgespart.
const TOR = { x0: 40, y0: 35, breite: 955, hoehe: 1390 };
const TOR_FLAECHEN = [
  'M350,792 L450,750 L622,746 L712,778 V1400 H350 Z',                                         // Torturm
  'M398,762 V560 L384,522 C420,494 455,470 470,456 L440,452 L428,404 C450,370 460,330 535,305 '
    + 'C610,330 620,370 642,404 L630,452 L600,456 C620,470 655,492 690,508 L680,560 V762 Z',  // Aufsatz und Glockenhelm
  'M492,306 V220 H580 V306 Z',                                                               // Laterne
  'M500,216 C490,190 505,160 536,138 C567,160 582,190 572,216 Z',                            // Zwiebel
  'M528,140 H544 V105 H528 Z', 'M519,93 A16,16 0 1 0 551,93 A16,16 0 1 0 519,93 Z',          // Hals, Kugel
  'M531,79 H541 V40 H531 Z',                                                                 // Spitze
  'M45,1085 H352 V1405 H45 Z',                                                               // linker Rundturm
  'M50,1086 C120,1000 170,800 214,640 C250,800 300,1000 348,1083 Z', 'M206,665 L214,620 L222,665 Z',
  'M80,1070 V988 L75,988 L110,915 L142,988 L138,988 V1070 Z',                                // Gaube links außen
  'M708,1068 H990 V1410 H708 Z',                                                             // rechter Rundturm
  'M712,1066 C760,1000 790,800 815,585 C840,800 920,980 988,1056 Z', 'M807,610 L815,570 L823,610 Z'
];
const TOR_AUSSPARUNGEN = [
  'M436,1405 V1262 C470,1212 595,1212 625,1262 V1405 Z',                                     // Torbogen
  'M505,682 V600 A21.5,21.5 0 0 1 548,600 V682 Z'                                            // Rundbogenfenster
  // die kleinen Fenster der Vorlage entfallen: bei 2 655 Punkten wären sie nur Kerben im Umriss
];

// Punkte des Tors (2026-10-29, symmetrisch und geradlinig auf Wunsch des Autors; vorher eine Randreihe und ein
// versetztes Gitter): ein rechtwinkliges Gitter, dessen Spalten spiegelbildlich um die Mittelachse des Turms liegen.
// Ein Platz zählt nur, wenn er und sein Spiegelbild in der Form liegen. Der Abstand wird so gesucht, dass mindestens
// n Plätze entstehen; überzählige fallen in der untersten Reihe außen weg (paarweise, so bleibt das Bild
// symmetrisch, und Spitze, Helm und Kegeldächer bleiben erhalten).
const TOR_ACHSE = 533; // Mittelachse (Spitze, Torbogen) in den Koordinaten der Umrisszeichnung
const torPunkteCache = new Map(); // je Punktzahl
function torPunkte(n) {
  if (torPunkteCache.has(n)) return torPunkteCache.get(n).punkte;
  // Form einmal als Maske zeichnen (Flächen, dann Aussparungen herausgestanzt)
  const mb = TOR.x0 + TOR.breite + 2, mh = TOR.y0 + TOR.hoehe + 2;
  const leinwand = document.createElement('canvas');
  leinwand.width = mb;
  leinwand.height = mh;
  const ctx = leinwand.getContext('2d', { willReadFrequently: true });
  TOR_FLAECHEN.forEach((d) => ctx.fill(new Path2D(d)));
  ctx.globalCompositeOperation = 'destination-out';
  TOR_AUSSPARUNGEN.forEach((d) => ctx.fill(new Path2D(d)));
  const maske = ctx.getImageData(0, 0, mb, mh).data;
  const innen = (x, y) => {
    const xi = Math.round(x), yi = Math.round(y);
    return xi >= 0 && yi >= 0 && xi < mb && yi < mh && maske[(yi * mb + xi) * 4 + 3] > 127;
  };
  const gitter = (a) => {
    const liste = [];
    for (let y = TOR.y0 + TOR.hoehe - a / 2; y > TOR.y0; y -= a) {
      for (let k = 0; TOR_ACHSE + k * a < TOR.x0 + TOR.breite; k += 1) {
        const xr = TOR_ACHSE + k * a, xl = TOR_ACHSE - k * a;
        if (innen(xr, y) && innen(xl, y)) {
          liste.push([xr, y]);
          if (k) liste.push([xl, y]);
        }
      }
    }
    return liste;
  };
  let klein = 2, gross = 120;
  for (let i = 0; i < 18; i += 1) {
    const mitte = (klein + gross) / 2;
    if (gitter(mitte).length >= n) klein = mitte; else gross = mitte;
  }
  const punkte = gitter(klein)
    .sort((p, q) => p[1] - q[1] || Math.abs(p[0] - TOR_ACHSE) - Math.abs(q[0] - TOR_ACHSE))
    .slice(0, n)
    .sort((p, q) => p[1] - q[1] || p[0] - q[0]); // von oben nach unten
  torPunkteCache.set(n, { punkte, abstand: klein });
  return punkte;
}

// Punkte des Buchs: zuerst die linke Seite (nl Punkte), dann die rechte; je Seite ein eigenes Raster, damit auf der
// Folie `berufe` die linke Seite genau die Personen ohne Sektor trägt und der Schnitt der Bund ist
function buchPunkte(nl, nr) {
  const links = formRaster('buchLinks', nl, [BUCH.links], BUCH, [], { obenWeg: true });
  const rechts = formRaster('buchRechts', nr, [BUCH.rechts], BUCH, [], { obenWeg: true });
  return { punkte: [...links.punkte, ...rechts.punkte], abstand: Math.min(links.abstand, rechts.abstand) };
}

// Buch auf der Bühne (oben Platz für Beschriftungen); pos(k) = k-ter Punkt (siehe buchPunkte()), ort() rechnet
// Buchkoordinaten um
function buchForm(b, h) {
  const n = instanz.personen.length;
  const nl = instanz.berufe ? instanz.berufe.ohne : Math.floor(n / 2);
  const { punkte, abstand } = buchPunkte(nl, n - nl);
  const f = inRechteck(BUCH, { x: b * 0.05, y: 50, b: b * 0.9, h: h - 56 });
  const [ox, oy] = f.pos([0, 0]);
  return { zelle: abstand * f.skala, pos: (k) => f.pos(punkte[k % punkte.length]), ort: f.pos, transform: `translate(${ox},${oy}) scale(${f.skala})` };
}

function torForm(n, b, h) {
  return torFormIn(n, { x: b * 0.05, y: 6, b: b * 0.9, h: h - 12 });
}

// Tor in einem Rechteck (zentriert, Seitenverhältnis bleibt)
function torFormIn(n, r) {
  const punkte = torPunkte(n);
  const skala = Math.min(r.h / TOR.hoehe, r.b / TOR.breite);
  const ox = r.x + (r.b - TOR.breite * skala) / 2 - TOR.x0 * skala;
  const oy = r.y + (r.h - TOR.hoehe * skala) / 2 - TOR.y0 * skala;
  return {
    zelle: torPunkteCache.get(n).abstand * skala,
    pos: (i) => { const [x, y] = punkte[i % punkte.length] || [512, 900]; return [ox + x * skala, oy + y * skala]; },
    ort: ([x, y]) => [ox + x * skala, oy + y * skala] // Punkt in den Koordinaten der Umrisszeichnung
  };
}

// n Punkte auf versetztem Gitter innerhalb einer Form (Flächen als Pfade im Feld form.w × form.h); Abstand per Suche
const formCache = new Map();
function formRaster(name, n, flaechen, form, aussparungen = [], { obenWeg = false } = {}) {
  const schluessel = `${name}|${n}|${obenWeg}`;
  if (formCache.has(schluessel)) return formCache.get(schluessel);
  const aufl = 4;
  const c = document.createElement('canvas');
  c.width = form.w * aufl;
  c.height = form.h * aufl;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.scale(aufl, aufl);
  flaechen.forEach((d) => ctx.fill(new Path2D(d)));
  ctx.globalCompositeOperation = 'destination-out';
  aussparungen.forEach((d) => ctx.fill(new Path2D(d)));
  const maske = ctx.getImageData(0, 0, c.width, c.height).data;
  const innen = (x, y) => {
    const xi = Math.round(x * aufl), yi = Math.round(y * aufl);
    return xi >= 0 && yi >= 0 && xi < c.width && yi < c.height && maske[(yi * c.width + xi) * 4 + 3] > 127;
  };
  const gitter = (a) => {
    const liste = [];
    const za = a * 0.866;
    for (let k = 0, y = za / 2; y < form.h; k += 1, y += za) {
      for (let x = k % 2 ? a : a / 2; x < form.w; x += a) if (innen(x, y)) liste.push([x, y]);
    }
    return liste;
  };
  let klein = 0.1, gross = 40;
  for (let i = 0; i < 18; i += 1) { const m = (klein + gross) / 2; if (gitter(m).length >= n) klein = m; else gross = m; }
  const alle = gitter(klein);
  // überzählige Plätze: verteilt weglassen, oder (obenWeg) die obersten - dann bleibt die Fläche ohne Löcher
  const punkte = alle.length <= n ? alle
    : (obenWeg ? [...alle].sort((a, c) => c[1] - a[1] || a[0] - c[0]).slice(0, n)
      : Array.from({ length: n }, (_, i) => alle[Math.floor((i * alle.length) / n)]));
  const ergebnis = { punkte, abstand: klein };
  formCache.set(schluessel, ergebnis);
  return ergebnis;
}

// Form in ein Rechteck legen (zentriert, Seitenverhältnis bleibt); `unten`: auf die Unterkante gestellt
function inRechteck(form, r, unten = false) {
  const skala = Math.min(r.b / form.w, r.h / form.h);
  const ox = r.x + (r.b - form.w * skala) / 2, oy = r.y + (r.h - form.h * skala) * (unten ? 1 : 0.5);
  return { skala, pos: ([x, y]) => [ox + x * skala, oy + y * skala] };
}

// Raster für n Punkte in einem Rechteck: Zellgröße so, dass alle hineinpassen
function raster(n, x, y, b, h) {
  if (n === 0) return { zelle: 0, pos: () => [x, y] };
  let zelle = Math.sqrt((b * h) / n);
  let spalten = Math.max(1, Math.floor(b / zelle));
  while (spalten * Math.floor(h / zelle) < n) { zelle *= 0.97; spalten = Math.max(1, Math.floor(b / zelle)); }
  const zeilen = Math.ceil(n / spalten);
  const ox = x + (b - spalten * zelle) / 2 + zelle / 2;
  const oy = y + (h - zeilen * zelle) / 2 + zelle / 2;
  return { zelle, pos: (i) => [ox + (i % spalten) * zelle, oy + Math.floor(i / spalten) * zelle] };
}

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .bgi-wurzel { display: flex; flex-direction: column; height: 100%; min-height: 480px; }
    .bgi-werkzeugleiste { display: flex; justify-content: flex-end; margin-bottom: 4px; min-height: 32px; }
    .bgi-kopf { text-align: center; margin: 0 auto var(--space-3); }
    .bgi-ueberzeile { font-size: var(--fs-sm); letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted); }
    .bgi-zahl { font-family: var(--font-heading); font-size: clamp(2rem, 4.2vw, 3.2rem); line-height: 1.05; margin: var(--space-1) 0 0; color: var(--text); }
    .bgi-unterzeile { font-size: var(--fs-md); color: var(--text-muted); margin-top: 2px; }
    /* bleibt beim Scrollen oben stehen (z. B. nach dem Sprung zu den Münzfeldern), ohne darunter Klicks abzufangen */
    .bgi-steuerung { position: sticky; top: 8px; z-index: 6; display: flex; align-items: center; justify-content: center;
      gap: var(--space-3); margin: 0 0 var(--space-3); min-height: 64px; pointer-events: none; }
    .bgi-steuerung > * { pointer-events: auto; }
    /* Weiter = nur der hüpfende Pfeil (2026-10-28, Wunsch des Autors); sein Name steht in aria-label und title */
    .bgi-weiter { display: grid; place-items: center; width: 52px; height: 52px; padding: 0; border-radius: 50%;
      border: none; background: ${FARBE}; color: #fff; cursor: pointer; box-shadow: 0 4px 14px rgba(44, 74, 110, .3);
      animation: bgi-huepfen 1.6s ease-in-out infinite; }
    .bgi-weiter:hover { animation-play-state: paused; box-shadow: 0 6px 18px rgba(44, 74, 110, .4); }
    .bgi-weiter svg { width: 24px; height: 24px; }
    .bgi-weiter[hidden], .bgi-zurueck[hidden] { display: none; }
    .bgi-foliennummer { position: absolute; left: 0; font-size: var(--fs-sm); font-weight: 600; color: #a4442f; } /* vorläufig */
    @keyframes bgi-huepfen { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
    .bgi-zurueck { font: inherit; font-size: var(--fs-sm); font-weight: 600; min-height: 44px; padding: 10px 16px; border-radius: 999px;
      border: 1px solid ${FARBE}; background: var(--surface); color: ${FARBE}; cursor: pointer; }
    .bgi-zurueck:hover { background: rgba(44, 74, 110, .08); }
    .bgi-weiter:focus-visible, .bgi-zurueck:focus-visible { outline: 3px solid #e0b429; outline-offset: 3px; }
    .bgi-buehne { position: relative; flex: 1 1 auto; min-height: 300px; }
    .bgi-buehne svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .bgi-leinwand { position: absolute; left: 0; top: 0; pointer-events: none; }
    .bgi-punkt { cursor: pointer; stroke: transparent; stroke-width: 3px; } /* durchsichtiger Rand: größere Klickfläche */
    .bgi-punkt.anteil { cursor: default; }
    .bgi-grau { fill: none; stroke: ${RAHMEN}; stroke-width: 1px; }
    .bgi-archiv { cursor: pointer; }
    .bgi-geist { fill: rgba(154, 144, 129, 0.18); stroke: ${RAHMEN}; stroke-width: 1.6px; }
    .bgi-verlustjahr { font-family: var(--font-heading); font-size: 1.9rem; fill: ${VERLUST_ROT}; }
    .bgi-archiv:focus-visible { outline: none; stroke: ${AUSWAHL}; stroke-width: 3px; }
    .bgi-puls { fill: none; stroke: ${AUSWAHL}; stroke-width: 2px; pointer-events: none; transform-box: fill-box; transform-origin: center;
      animation: bgi-puls 1.6s ease-out infinite; }
    @keyframes bgi-puls { 0% { transform: scale(1); opacity: .95; } 100% { transform: scale(3.4); opacity: 0; } }
    .bgi-hinweis { fill: ${FARBE}; }
    .bgi-wein .bgi-grau { fill: ${BORDEAUX}; fill-opacity: .9; stroke: none; } /* Folie weinzoll */
    .bgi-spaltenkopf { font-family: var(--font-heading); font-size: 1.5rem; fill: var(--text); text-anchor: middle; }
    .bgi-spaltenkopf.klein { font-size: 1.1rem; }
    .bgi-spaltenkopf.eng { font-size: 13px; }
    .bgi-spaltenzahl { font-size: var(--fs-md); fill: var(--text-muted); text-anchor: middle; letter-spacing: .04em; }
    .bgi-spaltenzahl.eng { font-size: 11px; letter-spacing: 0; }
    .bgi-leer { font-size: var(--fs-md); font-style: italic; fill: ${RAHMEN}; text-anchor: middle; }
    .bgi-wert { font-size: 13px; font-weight: 600; fill: var(--text); text-anchor: middle; }
    .bgi-wert-klein { font-size: 12px; fill: var(--text-muted); text-anchor: middle; }
    .bgi-legende text { font-size: 12px; fill: var(--text-muted); }
    .bgi-erklaerung { max-width: 62ch; margin: var(--space-3) auto 0; font-size: var(--fs-sm); line-height: 1.55; color: var(--text);
      opacity: 0; visibility: hidden; transform: translateY(6px);
      transition: opacity .4s ease, transform .4s ease, visibility 0s linear .4s; }
    .bgi-erklaerung.sichtbar { opacity: 1; visibility: visible; transform: none;
      transition: opacity .7s ease .7s, transform .7s ease .7s, visibility 0s; }
    .bgi-erklaerung:not(.mittig):not(.sichtbar) { display: none; }
    .bgi-erklaerung.mittig { position: absolute; margin: 0; max-width: none; }
    .bgi-erklaerung p { margin: 0 0 .7em; }
    .bgi-erklaerung p:last-child { margin-bottom: 0; }
    .bgi-erklaerung p.neu { animation: bgi-einblenden .8s ease 1.2s both; }
    @keyframes bgi-einblenden { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    .bgi-erklaerung a, .bgi-textperson { color: var(--accent); font-weight: 600; }
    .bgi-textperson { font: inherit; font-weight: 600; padding: 0; border: none; background: none; cursor: pointer;
      text-decoration: underline; text-decoration-style: dotted; text-underline-offset: 3px; }
    .bgi-textperson:focus-visible { outline: 3px solid #e0b429; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) {
      .bgi-erklaerung { transition: none; }
      .bgi-weiter, .bgi-erklaerung p.neu, .bgi-puls { animation: none; }
    }
  `;
  container.appendChild(style);
}

function ohneAnimation() {
  return document.hidden || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// --- Texte und Zahlen aus den beiden CSV-Dateien ---------------------------------------------------------

const zahlWert = (wert) => {
  const n = Number(alsText(wert).replace(/\s/g, '').replace(',', '.'));
  return alsText(wert).trim() !== '' && Number.isFinite(n) ? n : null;
};
const prozent = (wert) => (wert < 10
  ? wert.toLocaleString('de-AT', { maximumFractionDigits: 1 })
  : Math.round(wert).toLocaleString('de-AT'));

// Stationen in der Reihenfolge der Datei (die Folien; seit 2026-10-29 können Archiv-Folien vor `tor` stehen)
function bereiteStationenAuf(records) {
  const roh = (records || []).map((r) => ({
    id: alsText(r.station).trim(),
    knopf: alsText(r.knopf).trim(),
    unterzeile: alsText(r.unterzeile).trim(),
    muenze: zahlWert(r.muenze_gulden),
    anhaengen: alsText(r.text_anhaengen).trim() === 'ja',
    ueberzeile: alsText(r.ueberzeile).trim(),
    titel: alsText(r.titel).trim(),
    absaetze: (Array.isArray(r.text) ? r.text : [alsText(r.text)]).map((t) => String(t).trim()).filter(Boolean),
    jahre: (Array.isArray(r.jahreszahlen) ? r.jahreszahlen : [alsText(r.jahreszahlen)]).map((t) => String(t).trim()).filter(Boolean)
  })).filter((s) => BEKANNTE_STATIONEN.includes(s.id));
  // die erste Folie braucht keinen Knopf (zu ihr führt kein Weiter-Pfeil), alle anderen schon; `tor` muss dabei sein
  const liste = roh.filter((s, k) => k === 0 || s.knopf);
  return liste.some((s) => s.id === 'tor') && liste.length > 1 ? liste : STANDARD_STATIONEN;
}

// Schichten von links nach rechts in der Reihenfolge der Datei; Haushalte je Schicht nach Anteil (die letzte
// bekommt den Rest), Vermögen = Haushalte × Mittelwert aus gulden_von und gulden_bis
function bereiteSchichtenAuf(records, n) {
  const zeilen = (records || []).map((r) => ({
    id: alsText(r.id).trim(),
    name: alsText(r.name).trim(),
    anteil: zahlWert(r.anteil_prozent),
    von: zahlWert(r.gulden_von) ?? 0,
    bis: zahlWert(r.gulden_bis) ?? 0,
    beschreibung: alsText(r.beschreibung).trim()
  })).filter((z) => z.id && z.name);
  const buerger = zeilen.filter((z) => z.id !== OHNE_BUERGERRECHT && z.anteil > 0);
  if (!buerger.length) return null;
  const summeAnteile = buerger.reduce((s, z) => s + z.anteil, 0);
  let vergeben = 0;
  buerger.forEach((s, i) => {
    s.anzahl = i === buerger.length - 1 ? n - vergeben : Math.round((n * s.anteil) / summeAnteile);
    vergeben += s.anzahl;
    s.mittel = (s.von + s.bis) / 2;
    s.summe = s.anzahl * s.mittel;
  });
  const gesamt = buerger.reduce((s, z) => s + z.summe, 0);
  buerger.forEach((s) => { s.vermoegensanteil = gesamt ? (s.summe / gesamt) * 100 : 0; });
  const ohne = zeilen.find((z) => z.id === OHNE_BUERGERRECHT) || null;
  return { buerger, ohne, gesamt };
}

// Wirtschaftssektoren (Folie `berufe`): Gruppen aus buergerinnen_sektoren.csv; je Gruppe die Personen mit diesem
// Sektor (siehe ergaenzeSektoren()). Sektoren, die keiner Gruppe zugeordnet sind, zählen zur letzten. Dazu für die
// Platzhalter die Aufnahmen (Zeilen) mit und ohne Sektor.
function bereiteBerufeAuf(records, buergerbuch, personen) {
  const gruppen = (records || []).map((r) => ({
    id: alsText(r.id).trim(),
    name: alsText(r.name).trim(),
    sektoren: (Array.isArray(r.sektoren) ? r.sektoren : [r.sektoren]).map((x) => alsText(x).trim()).filter(Boolean),
    beispiele: alsText(r.beispiele).trim(),
    mitglieder: []
  })).filter((g) => g.id && g.name);
  if (!gruppen.length) return null;
  const gruppeVonSektor = new Map();
  gruppen.forEach((g) => g.sektoren.forEach((x) => gruppeVonSektor.set(x, g)));
  const gruppeVon = personen.map((p, i) => {
    if (!p.sektor) return null;
    const g = gruppeVonSektor.get(p.sektor) || gruppen[gruppen.length - 1];
    g.mitglieder.push(i);
    return g;
  });
  const mit = gruppen.reduce((summe, g) => summe + g.mitglieder.length, 0);
  if (!mit) return null;
  gruppen.forEach((g) => { g.anzahl = g.mitglieder.length; });
  const aufnahmenMit = buergerbuch.filter((r) => alsText(r.Wirtschaftssektor).trim()).length;
  return {
    gruppen: gruppen.filter((g) => g.anzahl > 0), gruppeVon, mit, ohne: personen.length - mit,
    aufnahmen: buergerbuch.length, aufnahmenMit
  };
}

// Plätze im Buch (2026-10-29): Die Personen ohne Sektor stehen auf der linken Seite, die mit Sektor auf der rechten,
// nach Gruppen von oben nach unten (so fließen sie auf der Folie `berufe` ohne Überkreuzen in ihre Balken)
function vergibTorPlaetze(personen, B) {
  const n = personen.length;
  const roh = buchPunkte(B.ohne, B.mit).punkte;
  const links = d3.range(B.ohne);
  const rechts = d3.range(B.ohne, n).sort((a, c) => roh[a][1] - roh[c][1] || roh[a][0] - roh[c][0]);
  const platz = new Array(n);
  personen.forEach((p, i) => { if (!B.gruppeVon[i]) platz[i] = links.shift(); });
  let k = 0;
  B.gruppen.forEach((g) => {
    g.mitglieder.forEach((i) => { platz[i] = rechts[k]; k += 1; });
  });
  const helligkeit = personen.map((p) => p.helligkeit);
  personen.forEach((p, i) => { p.helligkeit = helligkeit[platz[i]]; });
  return platz;
}

// Archiv (Folien `archiv` bis `klick`): ein Eintrag je Bestand des Bestandsverzeichnisses, dazu die in
// buergerinnen_archiv.csv ergänzten Bestände (bisher die Urkundenreihe, deren Zeitraum und Zahl aus den Urkunden
// berechnet werden). Kategorien nach Zahl der Bestände, Farben wie in der Treemap (paletteFarbeNachRang()).
function bereiteArchivAuf(bestand, urkunden, konfig) {
  if (!bestand?.length) return null;
  const zeilen = (konfig || []).map((r) => ({
    rolle: alsText(r.rolle).trim(), kuerzel: alsText(r.kuerzel).trim(), name: alsText(r.name).trim(),
    kategorie: alsText(r.bkk_kategorie).trim(), quelle: alsText(r.quelle).trim(), beschreibung: alsText(r.beschreibung).trim()
  }));
  const bbKuerzel = zeilen.find((z) => z.rolle === 'buergerbuch')?.kuerzel;
  const items = bestand.map((r) => ({
    record: r, name: alsText(r.name).trim() || alsText(r.kuerzel), kategorie: alsText(r.bkk_kategorie).trim() || OHNE_KATEGORIE,
    von: zahlWert(r.zeitraum_von), bis: zahlWert(r.zeitraum_bis), buergerbuch: Boolean(bbKuerzel) && alsText(r.kuerzel).trim() === bbKuerzel
  }));
  zeilen.filter((z) => z.rolle === 'ergaenzung' && z.quelle === 'urkunden' && urkunden?.length).forEach((z) => {
    // nach Jahr (dann Signatur) geordnet: so liegen sie auch in ihren Säulen
    const liste = urkunden.map((u) => ({ record: u, jahr: zahlWert(u.jahr) })).filter((u) => u.jahr !== null)
      .sort((a, c) => a.jahr - c.jahr || alsText(a.record.signatur).localeCompare(alsText(c.record.signatur), 'de', { numeric: true }));
    if (!liste.length) return;
    const jahre = liste.map((u) => u.jahr);
    const von = jahre[0], bis = jahre[jahre.length - 1];
    items.push({
      record: { name: z.name, umfang: `${zahl(jahre.length)} Urkunden`, zeitraum_von: von, zeitraum_bis: bis, kurzbeschreibung: z.beschreibung, bkk_kategorie: z.kategorie },
      name: z.name, kategorie: z.kategorie || OHNE_KATEGORIE, von, bis, urkunden: true, jahre, urkundenListe: liste, ergaenzt: true
    });
  });
  const zaehlung = d3.rollups(items, (v) => v.length, (d) => d.kategorie)
    .sort((a, c) => (a[0] === OHNE_KATEGORIE) - (c[0] === OHNE_KATEGORIE) || c[1] - a[1] || a[0].localeCompare(c[0], 'de'));
  const kategorien = zaehlung.map(([name, anzahl], rang) => ({ name, anzahl, farbe: name === OHNE_KATEGORIE ? OHNE_KATEGORIE_FARBE : paletteFarbeNachRang(rang) }));
  const farbeVon = new Map(kategorien.map((k) => [k.name, k.farbe]));
  items.forEach((it) => { it.farbe = farbeVon.get(it.kategorie); it.datiert = it.von !== null && it.bis !== null; });
  // feste, gemischte Reihenfolge der Plätze im Tor (sonst stünden die Kategorien in Blöcken)
  const platz = d3.range(items.length).sort((a, c) => (Math.imul(a + 17, 2654435761) >>> 0) - (Math.imul(c + 17, 2654435761) >>> 0));
  const torPlatz = new Array(items.length);
  platz.forEach((i, k) => { torPlatz[i] = k; });
  // Tor mit Löchern: N Bestände und G verlorene auf N + G Plätzen, gemischt
  const verloren = Math.round(items.length * VERLOREN_ANTEIL);
  const lochPlatz = d3.range(items.length + verloren)
    .sort((a, c) => (Math.imul(a + 101, 2246822519) >>> 0) - (Math.imul(c + 101, 2246822519) >>> 0));
  return {
    items, kategorien, torPlatz, verloren, lochPlatz,
    bb: items.findIndex((it) => it.buergerbuch), urk: items.findIndex((it) => it.urkunden),
    ohneZeit: items.filter((it) => !it.datiert).length
  };
}

// Lage der Archivpunkte je Folie. Jeder Bestand ist ein Rechteck mit runden Ecken: als Punkt im Tor (archiv, klick),
// in den Kategorie-Feldern (kategorien), als Balken über seinen Zeitraum (zeitraeume). Auf den Verlust-Folien steht
// er im „Tor mit Löchern“: dazwischen hohle Ringe für Verlorenes, die Folie für Folie herausfallen (VERLUST_STATIONEN);
// auf `urkunden` bricht die Urkundenreihe in ihre Urkunden auf, auf `mitmachen` füllen goldene Punkte die Löcher.
// Text und Bild stehen als Paar in der Mitte der Bühne, der Text wechselt die Seite; schmal: Text unter der Bühne.
function layoutArchiv(station, b) {
  const A = instanz.archiv;
  const h = instanz.basisHoehe;
  const N = A.items.length;
  const luecke = Math.max(14, b * 0.025);
  const breit = b >= TEXT_MIN_BREITE;
  const textB = breit ? Math.min(TEXT_BREITE * 0.85, b * 0.28) : 0;
  const abstand = luecke * 2.5;
  const textRechts = TEXT_RECHTS.includes(station);
  // Paar aus Text und Tor (Tor so breit, wie es bei voller Höhe ist); platzRechts: Raum für den Hinweis auf `klick`
  const torPaar = (platzRechts = 0) => {
    const torB = Math.min((h - 16) * (TOR.breite / TOR.hoehe), b * 0.4);
    const x0 = Math.max(8, (b - (textB + abstand + torB)) / 2 - platzRechts);
    return textRechts
      ? { text: { x: x0 + torB + abstand, b: textB, top: 4 }, vis: { x: x0, y: 8, b: torB, h: h - 16 } }
      : { text: { x: x0, b: textB, top: 4 }, vis: { x: x0 + textB + abstand, y: 8, b: torB, h: h - 16 } };
  };
  // Paar aus Text und breitem Bild (Treemap, Zeitachse, Urkunden-Säulen)
  const breitesPaar = () => {
    const gesamt = Math.min(b - 16, 1180);
    const x0 = (b - gesamt) / 2;
    const visB = gesamt - textB - abstand;
    return { text: { x: textRechts ? x0 + visB + abstand : x0, b: textB, top: 4 }, vis: { x: textRechts ? x0 : x0 + textB + abstand, y: 8, b: visB, h: h - 16 } };
  };
  const torFolie = ['archiv', 'klick', ...VERLUST_STATIONEN, 'mitmachen'].includes(station);
  const paar = breit ? (torFolie ? torPaar(station === 'klick' ? 60 : 0) : breitesPaar()) : null;
  const text = paar ? paar.text : null;
  const vis = paar ? paar.vis : { x: 8, y: 8, b: b - 16, h: h - 16 };
  const punkt = ([x, y], r) => ({ x: x - r, y: y - r, w: r * 2, h: r * 2, rx: r });
  const lage = new Array(N), farbe = new Array(N), deckkraft = new Array(N).fill(1);
  const beschriftungen = [];
  let urkunden = null, puls = false, geister = null, beitraege = null, jahreSpalte = null;
  const rTor = Math.max(2.5, torFormIn(N, vis).zelle * 0.42); // Punktgröße wie im Archiv-Tor (auch für Treemap, Balken)
  if (station === 'archiv' || station === 'klick') {
    const tor = torFormIn(N, vis);
    A.items.forEach((it, i) => {
      lage[i] = punkt(tor.pos(A.torPlatz[i]), rTor);
      farbe[i] = station === 'klick' && i === A.bb ? AUSWAHL : FARBE;
    });
    if (station === 'klick' && A.bb >= 0) {
      puls = true;
      // Hinweis rechts neben dem Tor, mit einer Linie zum Punkt
      const l = lage[A.bb];
      const rechts = d3.max(lage, (q) => q.x + q.w);
      beschriftungen.push({ art: 'hinweis', x: rechts + 34, y: l.y + l.h / 2, von: l.x + l.w + 4, text: 'Hier klicken' });
    }
  } else if (station === 'kategorien') {
    // Treemap aus Punkten: Fläche je Kategorie nach Zahl der Bestände, darin die Punkte im Raster
    const wurzel = d3.hierarchy({ children: A.kategorien }).sum((d) => d.anzahl || 0);
    d3.treemap().size([vis.b, vis.h]).paddingInner(5).round(false)(wurzel);
    const felder = wurzel.leaves().map((blatt) => {
      const w = blatt.x1 - blatt.x0, hh = blatt.y1 - blatt.y0;
      const mitName = w > 74 && hh > 54;
      return { k: blatt.data, x: vis.x + blatt.x0, y: vis.y + blatt.y0, w, h: hh, kopf: mitName ? 34 : 4 };
    });
    const zelleFuer = (f) => {
      let z = Math.sqrt(((f.w - 6) * (f.h - f.kopf - 4)) / f.k.anzahl);
      while (z > 1 && Math.floor((f.w - 6) / z) * Math.floor((f.h - f.kopf - 4) / z) < f.k.anzahl) z *= 0.95;
      return z;
    };
    // jedes Feld verteilt seine Punkte gleichmäßig über die eigene Fläche; die Punkte bleiben so groß wie im Tor
    // (nur ein zu kleines Feld macht sie kleiner)
    felder.forEach((f) => {
      const z = zelleFuer(f);
      const r = Math.max(1.5, Math.min(rTor, z * 0.42));
      const spalten = Math.max(1, Math.floor((f.w - 6) / z));
      const zeilen = Math.ceil(f.k.anzahl / spalten);
      const ox = f.x + (f.w - spalten * z) / 2 + z / 2;
      const oy = f.y + f.kopf + (f.h - f.kopf - zeilen * z) / 2 + z / 2;
      const mitglieder = A.items.map((it, i) => i).filter((i) => A.items[i].kategorie === f.k.name);
      mitglieder.forEach((i, j) => {
        lage[i] = punkt([ox + (j % spalten) * z, oy + Math.floor(j / spalten) * z], r);
        farbe[i] = A.items[i].farbe;
      });
      beschriftungen.push({ art: 'feld', ...f, farbe: f.k.farbe, name: f.k.name, anzahl: f.k.anzahl });
    });
  } else if (station === 'zeitraeume') {
    // Zeitraum je Bestand als Balken; Bahnen werden der Reihe nach belegt (ein Balken beginnt erst nach dem vorigen)
    const datiert = A.items.map((it, i) => i).filter((i) => A.items[i].datiert);
    const achseH = 28;
    const von = d3.min(datiert, (i) => A.items[i].von), bis = d3.max(datiert, (i) => A.items[i].bis);
    const xs = d3.scaleLinear().domain([Math.floor(von / 100) * 100, Math.ceil((bis + 1) / 100) * 100]).range([vis.x, vis.x + vis.b]);
    const bahnenEnde = [];
    const bahnVon = new Map();
    [...datiert].sort((a, c) => A.items[a].von - A.items[c].von || A.items[a].bis - A.items[c].bis).forEach((i) => {
      const start = xs(A.items[i].von);
      let k = bahnenEnde.findIndex((ende) => ende + 3 <= start);
      if (k < 0) { k = bahnenEnde.length; bahnenEnde.push(0); }
      bahnenEnde[k] = Math.max(start + 2, xs(A.items[i].bis + 1));
      bahnVon.set(i, k);
    });
    const hoehe = vis.h - achseH;
    const p = hoehe / Math.max(1, bahnenEnde.length);
    const bh = Math.max(1.5, Math.min(rTor * 2, p * 0.72));
    datiert.forEach((i) => {
      const it = A.items[i];
      const x = xs(it.von);
      lage[i] = { x, y: vis.y + bahnVon.get(i) * p + (p - bh) / 2, w: Math.max(bh, xs(it.bis + 1) - x), h: bh, rx: bh / 2 };
      farbe[i] = it.farbe;
    });
    const unten = vis.y + hoehe;
    // Bestände ohne Zeitangabe werden hier nicht gezeigt (Wunsch des Autors)
    A.items.forEach((it, i) => {
      if (it.datiert) return;
      lage[i] = punkt([vis.x + vis.b / 2, unten], bh);
      farbe[i] = it.farbe;
      deckkraft[i] = 0;
    });
    beschriftungen.push({ art: 'achse', xs, y: unten, x0: vis.x, x1: vis.x + vis.b });
  } else {
    // Tor mit Löchern: Bestände und verlorene (Ringe) gemischt auf einem Tor aus N + G Plätzen; das Tor steht auf
    // `urkunden` an derselben Stelle wie auf der Folie davor (dort tritt es zurück)
    const torVis = (station === 'urkunden' || KARTE_STATIONEN.includes(station)) && breit ? torPaar().vis : vis;
    const G = A.verloren;
    const loch = torFormIn(N + G, torVis);
    const r = Math.max(1.8, loch.zelle * 0.42);
    A.items.forEach((it, i) => {
      lage[i] = punkt(loch.pos(A.lochPlatz[i]), r);
      farbe[i] = FARBE;
      if (station === 'urkunden') deckkraft[i] = 0; // das Tor der Vorfolie tritt ganz zurück
      if (KARTE_STATIONEN.includes(station)) deckkraft[i] = 0; // auf der Karte nur die Urkunden
    });
    const geisterPos = d3.range(G).map((j) => loch.pos(A.lochPlatz[N + j]));
    const gefallen = { verlust1: 1, verlust2: 2 }[station] ?? VERLUST_GRUPPEN;
    geister = { pos: geisterPos, r, gefallen };
    if (station === 'mitmachen') beitraege = { pos: geisterPos, r, start: geisterPos.map(([x], j) => [x + ((j * 7919) % 61) - 30, h + 60]) };
    // Jahreszahlen der Verluste: bleiben über die drei Verlust-Folien stehen und ordnen sich zeitlich ein (zeichneJahre())
    if (VERLUST_STATIONEN.includes(station)) jahreSpalte = { x: torVis.x + torVis.b + luecke * 1.5, y: torVis.y + 44, abstand: 40, station };
    if (KARTE_STATIONEN.includes(station) && instanz.karte && A.urk >= 0) {
      const l = lage[A.urk];
      urkunden = karteUrkunden(station, vis, beschriftungen, [l.x + l.w / 2, l.y + l.h / 2]);
    }
    if (station === 'urkunden' && A.urk >= 0) {
      // die Urkunden einzeln, in Säulen je Jahrzehnt, auf einer Zeitachse über ihren Zeitraum
      const jahre = A.items[A.urk].jahre;
      const achseH = 28;
      const hoehe = vis.h - achseH;
      const xu = d3.scaleLinear().domain([Math.floor(d3.min(jahre) / 100) * 100, Math.ceil((d3.max(jahre) + 1) / 50) * 50]).range([vis.x, vis.x + vis.b]);
      const jeJahrzehnt = d3.rollup(jahre, (v) => v.length, (j) => Math.floor(j / 10) * 10);
      const meiste = d3.max([...jeJahrzehnt.values()]);
      const breite = (xu(10) - xu(0)) * 0.9;
      // Punktabstand z und Punkte je Reihe k so, dass die höchste Säule in die Höhe passt
      let z = Math.min(breite, hoehe - 8), k = 1;
      for (let i = 0; i < 200; i += 1) {
        k = Math.max(1, Math.floor(breite / z));
        if (Math.ceil(meiste / k) * z <= hoehe - 8) break;
        z *= 0.97;
      }
      // die Säulen stehen oben auf Höhe des Textes, die Achse direkt darunter
      const basis = Math.min(vis.y + hoehe, vis.y + 30 + Math.ceil(meiste / k) * z);
      beschriftungen.push({ art: 'achse', xs: xu, y: basis, x0: vis.x, x1: vis.x + vis.b });
      const stand = new Map();
      const l = lage[A.urk];
      urkunden = {
        r: Math.max(0.8, z * 0.42),
        start: [l.x + l.w / 2, l.y + l.h / 2],
        pos: jahre.map((j) => { // schon nach Jahr geordnet (bereiteArchivAuf())
          const d = Math.floor(j / 10) * 10;
          const n = stand.get(d) || 0;
          stand.set(d, n + 1);
          return [xu(d + 5) + ((n % k) - (k - 1) / 2) * z, basis - z / 2 - Math.floor(n / k) * z];
        })
      };
      const spitze = d3.greatest([...jeJahrzehnt], (e) => e[1]);
      beschriftungen.push({ art: 'notiz', x: xu(spitze[0] + 5), y: basis - Math.ceil(spitze[1] / k) * z - 12, text: `${zahl(jahre.length)} Urkunden, je Jahrzehnt eine Säule` });
    }
  }
  const bb = A.bb >= 0 ? lage[A.bb] : null;
  return {
    lage, farbe, deckkraft, beschriftungen, urkunden, puls, text, geister, beitraege, jahreSpalte,
    bbPos: bb ? [bb.x + Math.min(bb.w, bb.h * 3) / 2, bb.y + bb.h / 2] : [b / 2, h / 2]
  };
}

// Orte der Urkunden (Folien `orte`, `verarbeitung`): je Urkunde der erste genannte Ort mit Koordinaten; ohne solchen
// Ort, aber mit Ortsnamen: „ohne Koordinaten“ (auf einer Karte fehlt sie sonst stillschweigend)
function bereiteKarteAuf(orte, A) {
  if (!orte?.length || A?.urk === undefined || A.urk < 0) return null;
  // der Datenlader liefert Zahlen schon als Zahl und `…_unsicher` als Wahrheitswert; aus Text geht es auch
  const zahlAus = (w) => {
    if (typeof w === 'number') return Number.isFinite(w) ? w : null;
    const t = String(w ?? '').trim().replace(',', '.');
    return t === '' || !Number.isFinite(Number(t)) ? null : Number(t);
  };
  const istUnsicher = (w) => w === true || String(w ?? '').trim() === 'ja';
  const ortVon = new Map(orte.map((o) => [String(o.orte ?? '').trim(), {
    name: String(o.orte ?? '').trim(), lat: zahlAus(o.lat), lon: zahlAus(o.lon), unsicher: istUnsicher(o.orte_unsicher)
  }]));
  A.items[A.urk].urkundenListe.forEach((u) => {
    const namen = (Array.isArray(u.record.orte) ? u.record.orte : String(u.record.orte ?? '').split('|')).map((x) => String(x).trim()).filter(Boolean);
    const treffer = namen.map((n) => ortVon.get(n)).filter(Boolean);
    u.ort = treffer.find((o) => o.lat !== null && o.lon !== null) || null;
    u.ohneKoordinaten = !u.ort && namen.length > 0;
  });
  const genutzt = [...new Set(A.items[A.urk].urkundenListe.filter((u) => u.ort).map((u) => u.ort))];
  if (!genutzt.length) return null;
  return {
    orte: orte.length,
    unsicher: orte.filter((o) => istUnsicher(o.orte_unsicher)).length,
    ohne: A.items[A.urk].urkundenListe.filter((u) => u.ohneKoordinaten).length,
    lonMin: d3.min(genutzt, (o) => o.lon), lonMax: d3.max(genutzt, (o) => o.lon),
    latMin: d3.min(genutzt, (o) => o.lat), latMax: d3.max(genutzt, (o) => o.lat)
  };
}

// Karte: Urkunden spiralförmig um ihren Ort. Die Orte reichen von Flandern bis Rom; damit die vielen Urkunden aus der
// Nähe von Krems Platz haben, ist die Karte um Krems verzerrt (Richtung bleibt, Entfernung hoch 0,42; Kreise für 100
// und 500 km zeigen die Verzerrung). Donau, Krems und die häufigsten Orte beschriftet. Auf `verarbeitung` unscharfe Höfe um unsicher zugeordnete Orte und die Urkunden ohne
// Koordinaten unten am Rand (auf `orte` fehlen sie, wie auf jeder Karte)
function karteUrkunden(station, vis, beschriftungen, start) {
  const K = instanz.karte, A = instanz.archiv;
  const liste = A.items[A.urk].urkundenListe;
  const KREMS = [15.61, 48.41], HOCH = 0.42;
  const kx = Math.cos((KREMS[1] * Math.PI) / 180);
  const km = ([lon, lat]) => [(lon - KREMS[0]) * 111.3 * kx, (KREMS[1] - lat) * 111.3]; // Osten, Süden positiv
  const randUnten = 46;
  // Maßstab aus den nächsten 90 % der Orte; fernere (etwa Rom, Flandern) stehen in ihrer Richtung am äußeren Kreis
  const verzerrt = ([x, y]) => { const d = Math.hypot(x, y); const f = d > 0 ? d ** HOCH / d : 0; return [x * f, y * f]; };
  const radien = [...new Set(liste.filter((u) => u.ort).map((u) => u.ort))]
    .map((o) => Math.hypot(...verzerrt(km([o.lon, o.lat])))).sort(d3.ascending);
  const R = d3.quantile(radien, 0.9) || 1;
  const skala = Math.min(vis.b - 60, vis.h - 50 - randUnten) / (2 * R);
  const ox = vis.x + vis.b / 2, oy = vis.y + 30 + R * skala;
  const proj = (lonLat) => {
    let [x, y] = verzerrt(km(lonLat));
    const d = Math.hypot(x, y);
    if (d > R) { x *= R / d; y *= R / d; }
    return [ox + x * skala, oy + y * skala];
  };
  const hoeheGrad = 2 * R * skala; // Höhe der Karte in px (für den Rand darunter)
  [100, 500].filter((d) => d ** HOCH < R * 0.97).forEach((d) => beschriftungen.push({ art: 'kreis', x: ox, y: oy, r: d ** HOCH * skala, text: `${d} km` }));
  beschriftungen.push({ art: 'kreis', x: ox, y: oy, r: R * skala, text: 'weiter entfernt' });
  const verarbeitung = station === 'verarbeitung';
  const r = 2.2, z = r * 2.3;
  const zaehler = new Map();
  const unten = vis.y + 30 + hoeheGrad + 30;
  let fach = 0;
  const pos = [], deckkraft = [], farbe = [];
  liste.forEach((u) => {
    farbe.push(verarbeitung && u.ort?.unsicher ? UNSICHER_HELL : null);
    if (u.ort) {
      const n = zaehler.get(u.ort) || 0;
      zaehler.set(u.ort, n + 1);
      const [x, y] = proj([u.ort.lon, u.ort.lat]);
      // je Ort höchstens ORT_HOECHSTENS Urkunden (die übrigen bleiben verborgen am Ortspunkt)
      const m = Math.min(n, ORT_HOECHSTENS - 1), w = m * 2.39996, rr = n < ORT_HOECHSTENS ? z * Math.sqrt(m) * 0.62 : 0;
      pos.push([x + Math.cos(w) * rr, y + Math.sin(w) * rr]);
      deckkraft.push(n < ORT_HOECHSTENS ? 0.9 : 0);
    } else if (u.ohneKoordinaten) {
      pos.push([vis.x + 6 + (fach % 60) * z, unten + 12 + Math.floor(fach / 60) * z]);
      deckkraft.push(verarbeitung ? 0.9 : 0);
      farbe[farbe.length - 1] = verarbeitung ? UNSICHER_HELL : null;
      fach += 1;
    } else {
      pos.push([vis.x + vis.b / 2, unten]);
      deckkraft.push(0);
    }
  });
  const donau = DONAU.map(proj).filter(([x]) => x >= vis.x - 2 && x <= vis.x + vis.b + 2);
  beschriftungen.push({ art: 'linie', punkte: donau, text: 'Donau', textAn: proj([14.29, 48.31]) });
  // auf `verarbeitung` sind die Urkunden mit unsicher zugeordnetem Ort hellrot (farbe), dazu der Rand unten
  if (verarbeitung && K.ohne) beschriftungen.push({ art: 'ohneZeit', x: vis.x, y: unten, text: `nicht auf der Karte: ${zahl(K.ohne)} Urkunden mit nicht sicher identifizierten Orten` });
  // Krems und die häufigsten Orte (ohne Überlappung)
  const beschriftet = [];
  [...zaehler].sort((a, c) => (c[0].name === 'Krems') - (a[0].name === 'Krems') || c[1] - a[1]).forEach(([ort, n]) => {
    if (ort.name !== 'Krems' && (n < 12 || beschriftet.length >= 7)) return;
    const [x, y] = proj([ort.lon, ort.lat]);
    if (beschriftet.some(([bx, by]) => Math.abs(bx - x) < 70 && Math.abs(by - y) < 18)) return;
    beschriftet.push([x, y]);
    beschriftungen.push({ art: 'ort', x: x + z * Math.sqrt(Math.min(n, ORT_HOECHSTENS)) * 0.62 + 5, y: y + 4, haupt: ort.name === 'Krems', text: ort.name });
  });
  return { r, start, pos, deckkraft, farbe };
}

// Sidebar eines Bestands (wie in der Treemap)
function oeffneBestand(it) {
  instanz.auswahl = 'bestand';
  markiereAuswahl();
  oeffneBestandSidebar(instanz.sidebar, it.record, { kategorieName: it.kategorie, kategorieFarbe: it.farbe });
}

const escapeHtml = (t) => String(t).replace(/[&<>"]/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[z]));

// Platzhalter in den Stationstexten: {anteil:id} (Prozent des Vermögens), {summe:id}, {mittel:id}, {anzahl:id}, {muenze}, {personen},
// {aufnahmen}, {mitberuf}, {ohneberuf}, {berufanteil} (Aufnahmen ins Bürgerbuch mit bzw. ohne Berufsangabe),
// {personenmitberuf}, {personenanteil} (Personen mit Sektor, auch Bürgen über ihren Beruf), {eimer:jahr} (Weinausfuhr),
// {bestaende}, {ohnezeit}, {urkunden} (Archiv-Folien)
function platzhalterWert(name, id) {
  if (name === 'muenze') return zahl(instanz.muenzeGulden);
  if (name === 'personen') return zahl(instanz.personen.length);
  const A = instanz.archiv;
  if (A && name === 'bestaende') return zahl(A.items.length);
  if (name === 'schreibweisen') return zahl(instanz.personen.filter((p) => p.schreibweisen.length > 1).length);
  const K = instanz.karte;
  if (K && name === 'orte') return zahl(K.orte);
  if (K && name === 'orteunsicher') return zahl(K.unsicher);
  if (K && name === 'urkohne') return zahl(K.ohne);
  if (A && name === 'ohnezeit') return zahl(A.ohneZeit);
  if (A && name === 'urkunden' && A.urk >= 0) return zahl(A.items[A.urk].jahre.length);
  if (name === 'eimer') { const zeile = instanz.wein?.zeilen.find((w) => String(w.jahr) === id); return zeile ? zahl(zeile.eimer) : null; }
  const B = instanz.berufe;
  if (B && name === 'aufnahmen') return zahl(B.aufnahmen);
  if (B && name === 'mitberuf') return zahl(B.aufnahmenMit);
  if (B && name === 'ohneberuf') return zahl(B.aufnahmen - B.aufnahmenMit);
  if (B && name === 'berufanteil') return prozent((B.aufnahmenMit / B.aufnahmen) * 100);
  if (B && name === 'personenmitberuf') return zahl(B.mit);
  if (B && name === 'personenanteil') return prozent((B.mit / instanz.personen.length) * 100);
  const s = instanz.schichten?.buerger.find((x) => x.id === id);
  if (!s) return null;
  return { anteil: prozent(s.vermoegensanteil), summe: zahl(Math.round(s.summe)), mittel: zahl(s.mittel), anzahl: zahl(s.anzahl) }[name] ?? null;
}

// Absatz → HTML: [[id=Name]] wird ein Knopf zur Person, [[bestand:kuerzel=Text]] einer zum Bestand (Seitenleiste),
// [Text](#ziel) ein Link innerhalb der Seite
function absatzHtml(absatz, klasse = '') {
  let html = escapeHtml(absatz).replace(/\{(\w+)(?::([\w-]+))?\}/g, (treffer, name, id) => platzhalterWert(name, id) ?? treffer);
  html = html.replace(/\[\[([^=\]]+)=([^\]]+)\]\]/g, '<button type="button" class="bgi-textperson" data-person="$1">$2</button>');
  html = html.replace(/\[([^\]]+)\]\((#[^)\s]*)\)/g, '<a href="$2">$1</a>');
  return `<p${klasse ? ` class="${klasse}"` : ''}>${html}</p>`;
}

// Texte einer Station: mit `text_anhaengen` = ja kommen sie zu denen der vorigen Station dazu
function absaetzeVon(index) {
  const s = instanz.stationen[index];
  if (!s) return [];
  return s.anhaengen && index > 0 ? [...absaetzeVon(index - 1), ...s.absaetze] : s.absaetze;
}

function umbrechen(text, maxZeichen) {
  const zeilen = [];
  text.split(/\s+/).filter(Boolean).forEach((wort) => {
    const letzte = zeilen[zeilen.length - 1];
    if (letzte && (letzte + ' ' + wort).length <= maxZeichen) zeilen[zeilen.length - 1] = `${letzte} ${wort}`;
    else zeilen.push(wort);
  });
  return zeilen;
}

// --- Layouts je Station -------------------------------------------------------------------------------

function berechneLayout(station = instanz.station) {
  const { buehne, personen } = instanz;
  const b = buehne.clientWidth || 900;
  const h = buehne.clientHeight || 420;
  const feld = buchForm(b, h);
  const radiusFeld = Math.max(1.1, feld.zelle * 0.4);
  const basis = { b, h, feld, radiusFeld, station, benoetigt: 0, text: null, art: station };
  if (station === 'berufe' && instanz.berufe) return { ...basis, ...layoutBerufe(b), art: 'berufe' };
  if (ARCHIV_STATIONEN.includes(station) && instanz.archiv) {
    const LA = layoutArchiv(station, b);
    return { ...basis, ziel: () => LA.bbPos, radius: radiusFeld, text: LA.text, archiv: LA, art: 'archiv' };
  }
  if (station === 'buergerbuch' || station === 'tor' || station === 'schreibweisen') {
    // das ganze Buch (Ausgangshöhe), der Text links daneben wie auf `berufe`
    const tor = buchForm(b, instanz.basisHoehe);
    const ziel = (p, i) => tor.pos(instanz.torPlatz ? instanz.torPlatz[i] : i);
    const L0 = { ...basis, ziel, radius: radiusFeld, text: textNebenTor(b, tor), buch: tor };
    if (station !== 'schreibweisen') return L0;
    // Folie `schreibweisen` (Inkonsistenz): Personen mit mehreren Schreibweisen leuchten, drei Beispiele rechts
    return { ...L0, hervor: (p) => p.schreibweisen.length > 1, beispiele: schreibBeispiele(ziel, tor) };
  }
  if (station === 'geschlecht' || station === 'frauen') return { ...basis, ...layoutGeschlecht(b, h, radiusFeld), art: 'geschlecht' };
  if (VERMOEGEN_STATIONEN.includes(station) && instanz.schichten) return { ...basis, ...layoutVermoegen(b), art: 'vermoegen' };
  if (station === 'weinzoll' && instanz.schichten && instanz.wein) return { ...basis, ...layoutWein(b), art: 'wein' };
  if (station === 'behauptung') return { ...basis, ...layoutBehauptung(b), art: 'behauptung' };
  if ((station === 'klerus' || station === 'reformation') && instanz.schichten) {
    return { ...basis, ...layoutKlerus(b, station === 'reformation'), art: 'klerus' };
  }
  return { ...basis, ziel: (p, i) => feld.pos(instanz.torPlatz ? instanz.torPlatz[i] : i), radius: radiusFeld, buch: feld };
}

// Folie `berufe` (Wunsch des Autors, 2026-10-29): Das Buch wird am Bund geteilt. Die linke Seite (Personen ohne
// Sektor) bleibt stehen, die Personen der rechten Seite (siehe vergibTorPlaetze()) bilden ein Balkendiagramm der
// Wirtschaftssektoren, ein Punkt je Person; im Balken steht links, wer im Tor links stand. Das Tor steht wie auf der
// ersten Folie (Ausgangshöhe, auch wenn der Text die Bühne höher macht); der Text links daneben.
function layoutBerufe(b) {
  const { personen, berufe: B, torPlatz } = instanz;
  const h = instanz.basisHoehe;
  const n = personen.length;
  const feld = buchForm(b, h);
  const lage = d3.range(n).map((i) => feld.pos(torPlatz[i]));
  const schnitt = d3.min(B.gruppen.flatMap((g) => g.mitglieder), (i) => lage[i][0]) ?? b / 2;
  const luecke = Math.max(14, b * 0.025);
  const x0 = schnitt + luecke, breite = b - 8 - x0;
  // Balken: so viele Punktreihen je Balken, dass die Punkte möglichst so groß wie im Tor bleiben
  const zahlBreite = 46, beschriftung = 18, abstand = 8;
  const G = B.gruppen.length;
  const hoeheJe = (h - KOPF_SPALTEN - 8) / G;
  const groesste = Math.max(...B.gruppen.map((g) => g.anzahl), 1);
  const passend = (reihen) => Math.min((breite - zahlBreite) / Math.ceil(groesste / reihen), (hoeheJe - beschriftung - abstand) / reihen);
  let reihen = 1, z = passend(1);
  for (let r = 1; r <= 12; r += 1) {
    const zr = passend(r);
    if (zr >= feld.zelle) { reihen = r; z = zr; break; }
    if (zr > z) { reihen = r; z = zr; }
  }
  z = Math.max(1, Math.min(z, feld.zelle));
  const ziel = lage.slice();
  const balken = B.gruppen.map((g, gi) => {
    const oben = KOPF_SPALTEN + gi * (beschriftung + reihen * z + abstand);
    [...g.mitglieder].sort((a, c) => lage[a][0] - lage[c][0] || lage[a][1] - lage[c][1]).forEach((i, j) => {
      ziel[i] = [x0 + z / 2 + Math.floor(j / reihen) * z, oben + beschriftung + z / 2 + (j % reihen) * z];
    });
    return { g, oben, ende: x0 + Math.ceil(g.anzahl / reihen) * z, mitte: oben + beschriftung + (reihen * z) / 2 };
  });
  return {
    ziel: (p, i) => ziel[i],
    bleibt: (i) => !B.gruppeVon[i],
    radius: Math.max(1.1, z * 0.4),
    text: textNebenTor(b, feld),
    x0, balken, buchOrt: feld.ort
  };
}

// drei Beispiele (zwei oder drei Schreibweisen, kurz genug für eine Zeile), rechts neben dem Buch untereinander, je mit
// Linie zum Punkt; über die Höhe des Buchs verteilt
function schreibBeispiele(ziel, tor) {
  const { personen } = instanz;
  const passend = personen.map((p, i) => ({ p, i, text: p.schreibweisen.join(' / ') }))
    .filter(({ p, text }) => p.schreibweisen.length >= 2 && p.schreibweisen.length <= 3 && text.length <= 40)
    .sort((a, c) => ziel(a.p, a.i)[1] - ziel(c.p, c.i)[1]);
  const kandidaten = [0.15, 0.5, 0.85].map((q) => passend[Math.floor(q * (passend.length - 1))]).filter(Boolean)
    .map(({ p, i }) => ({ p, punkt: ziel(p, i) }))
    .sort((a, c) => a.punkt[1] - c.punkt[1]);
  const [rechts, oben] = tor.ort([BUCH.w, 20]);
  const [, unten] = tor.ort([BUCH.w, BUCH.h - 10]);
  return kandidaten.map(({ p, punkt }, k) => ({
    punkt, x: rechts + 34, y: oben + ((k + 0.5) / kandidaten.length) * (unten - oben), text: p.schreibweisen.join(' / ')
  }));
}

// Text links neben dem ganzen Buch (Folien `berufe` und `buergerbuch`); zu schmal: unter der Bühne
function textNebenTor(b, feld) {
  const torLinks = d3.min(d3.range(instanz.personen.length), (i) => feld.pos(i)[0]);
  const luecke = Math.max(14, b * 0.025);
  const textBreite = Math.min(TEXT_BREITE * 0.85, torLinks - luecke - 8); // nicht bis an den Rand
  return b >= TEXT_MIN_BREITE && textBreite >= 220 ? { x: torLinks - luecke - textBreite, b: textBreite, top: 4 } : null;
}

// Folien `geschlecht` und `frauen` (2026-10-29 als Buch, Wunsch des Autors): Die Männer bilden die linke Seite des
// aufgeschlagenen Buchs, die (symbolischen) Frauen füllen auf `frauen` die rechte, die auf `geschlecht` nur als
// gestrichelter Umriss leer dasteht. Der Text steht links neben dem Buch.
function layoutGeschlecht(b, h, radiusFeld) {
  const { personen } = instanz;
  const maenner = personen.filter((p) => !istFrau(p));
  const frauen = personen.filter(istFrau);
  const f = inRechteck(BUCH, { x: b * 0.05, y: 74, b: b * 0.9, h: instanz.basisHoehe - 80 });
  const links = formRaster('buchLinks', Math.max(1, maenner.length), [BUCH.links], BUCH, [], { obenWeg: true });
  const rechts = formRaster('buchRechts', personen.length, [BUCH.rechts], BUCH, [], { obenWeg: true });
  const index = new Map();
  maenner.forEach((p, i) => index.set(p, f.pos(links.punkte[i])));
  frauen.forEach((p, i) => index.set(p, f.pos(rechts.punkte[i % rechts.punkte.length])));
  const zelle = Math.min(links.abstand, rechts.abstand) * f.skala;
  const [ox, oy] = f.pos([0, 0]);
  const feld = { pos: (k) => f.pos(links.punkte[k % links.punkte.length]) }; // für textNebenTor()
  return {
    ziel: (p) => index.get(p),
    radius: Math.max(1.1, Math.min(zelle * 0.4, radiusFeld * 1.4)),
    text: textNebenTor(b, feld),
    frauZiel: (j) => f.pos(rechts.punkte[j % rechts.punkte.length]),
    buch: { transform: `translate(${ox},${oy}) scale(${f.skala})` },
    seiten: { links: f.pos([51, 2]), rechts: f.pos([149, 2]), leerMitte: f.pos([149, 72]) },
    maenner, frauen
  };
}

// Seit 2026-10-29 (Wunsch des Autors) ist `klerus` aus der Folge genommen; `reformation` („Wie viele glaubten was?“)
// pendelt den katholischen Anteil (pendleKonfession()). Folien `klerus` und `reformation` (2026-10-29 umgestellt): Der Text wandert in die Mitte der Bühne;
// links das Steiner Tor aus allen blauen, violetten und braunen (Inwohner und Hilfskräfte) Punkten, gemischt; mittig
// rechts neben dem Text die kleine goldene Kirche aus allen Münzen. Auf `reformation` bilden die Punkte des Tors an
// seiner Stelle ein Kreuz; jeder KATHOLISCH_JEDER-te Punkt (um 1570 „kaum noch 100 Katholiken“ bei rund 4 000
// Einwohnern) geht stattdessen ins Kirchenschiff. Schmal: Tor bzw. Kreuz links, Kirche rechts, Text darunter.
function layoutKlerus(b, mitKreuz) {
  const { personen, schichten, muenzeGulden } = instanz;
  const h = instanz.basisHoehe;
  const LV = layoutVermoegen(b);
  const luecke = Math.max(14, b * 0.025);
  let torR, kircheR, text = null;
  if (LV.text) {
    text = { ...LV.text, x: (b - LV.text.b) / 2 };
    torR = { x: 0, y: 8, b: text.x - luecke * 2, h: h - 16 };
    const x2 = text.x + text.b + luecke * 2;
    kircheR = { x: x2, y: h * 0.5 - 8, b: Math.min(b - x2 - 8, h * 0.6), h: h * 0.5 };
  } else {
    torR = { x: 0, y: 8, b: b * 0.6, h: h - 16 };
    kircheR = { x: b * 0.62, y: h * 0.5 - 8, b: b * 0.38, h: h * 0.5 };
  }
  const kreuzR = torR;
  const n = personen.length;
  // alle Männer, Frauen und Inwohner/Hilfskräfte (graue Säule), gemischt (fester Zufall), bilden Tor bzw. Kreuz
  const mitGrauen = Boolean(instanz.graue);
  const { reihe, platz } = gemischteReihe(n, mitGrauen);
  const kirche = inRechteck(KIRCHE, kircheR, true); // Kirche und Kreuz stehen auf derselben Linie wie das Tor
  let pos, zelle, konfession = null, kreuzOben = null;
  if (mitKreuz) {
    // jeder Punkt hat einen festen Platz im Kreuz; die nach einem festen Zufallsrang ersten (Anteil × Zahl) gehen
    // stattdessen ins Kirchenschiff, das sich von unten füllt; im Kreuz bleiben dann Lücken
    const N = reihe.length;
    const hoechstens = Math.round(N * KATHOLISCH_HOECHSTENS);
    const rang = new Array(N);
    d3.range(N).sort((a, c) => (Math.imul(a + 3, 2246822519) >>> 0) - (Math.imul(c + 3, 2246822519) >>> 0)).forEach((k, r) => { rang[k] = r; });
    const kreuz = inRechteck(KREUZ, kreuzR, true);
    const raster = formRaster('kreuz', N, KREUZ.flaechen, KREUZ);
    const schiff = formRaster('kirchenschiff', hoechstens, KIRCHENSCHIFF, KIRCHE, KIRCHE.aussparungen);
    const unten = [...schiff.punkte].sort((a, c) => c[1] - a[1] || a[0] - c[0]);
    const posFuer = (anteil) => {
      const grenze = Math.round(anteil * N);
      return (k) => (rang[k] < grenze ? kirche.pos(unten[rang[k] % unten.length]) : kreuz.pos(raster.punkte[k % raster.punkte.length]));
    };
    pos = posFuer(KATHOLISCH_ANTEILE[0]);
    kreuzOben = kreuz.pos([KREUZ.w / 2, 0]);
    konfession = (anteil) => {
      const q = posFuer(anteil);
      return { personen: (i) => q(platz.m.get(i)), frauen: (j) => q(platz.f.get(j)), graue: mitGrauen ? (j) => q(platz.g.get(j)) : null };
    };
    zelle = raster.abstand * kreuz.skala;
  } else {
    const tor = torFormIn(reihe.length, torR);
    pos = tor.pos;
    zelle = tor.zelle;
  }
  // Kirche aus allen Münzen
  const muenzAnzahl = schichten.buerger.reduce((summe, sch) => summe + Math.ceil(sch.summe / muenzeGulden - 1e-9), 0);
  const kirchenRaster = formRaster('kirche', muenzAnzahl, KIRCHE.flaechen, KIRCHE, KIRCHE.aussparungen);
  return {
    ziel: (p) => pos(platz.m.get(p.nr)),
    frauZiel: (j) => pos(platz.f.get(j)),
    grauZiel: mitGrauen ? (j) => pos(platz.g.get(j)) : null,
    kirchenZiel: (i) => kirche.pos(kirchenRaster.punkte[i % kirchenRaster.punkte.length]),
    kirchenRadius: Math.max(0.6, kirchenRaster.abstand * kirche.skala * 0.42),
    radius: Math.max(0.8, zelle * 0.4),
    text, konfession,
    kreuzMitte: kreuzOben,
    kircheOben: kirche.pos([KIRCHE.w / 2, 0])
  };
}

// Männer, Frauen und Inwohner/Hilfskräfte gemischt (fester Zufall); platz[art] ordnet jedem Punkt seinen Rang zu
function gemischteReihe(n, mitGrauen) {
  const reihe = [];
  for (let i = 0; i < n; i += 1) {
    reihe.push(['m', i], ['f', i]);
    if (mitGrauen) reihe.push(['g', i]);
  }
  const versatzVon = { m: 0, f: 7919, g: 15887 };
  const mischWert = ([art, i]) => (Math.imul(i + versatzVon[art], 2654435761) >>> 0);
  reihe.sort((a, c) => mischWert(a) - mischWert(c));
  const platz = { m: new Map(), f: new Map(), g: new Map() };
  reihe.forEach(([art, i], k) => platz[art].set(i, k));
  return { reihe, platz };
}

// Folie `weinzoll` (Wunsch des Autors, 2026-10-29): Der Text wandert nach rechts, die Kirche blendet aus. Alle Punkte
// aus Kreuz und Kirche werden bordeauxrot und füllen links eine Weinflasche (FLASCHE) für die Weinausfuhr des ersten Jahres
// (buergerinnen_weinexport.csv); danach sinken die oberen Punkte - der Anteil, um den die Ausfuhr bis zum zweiten Jahr
// fiel - hinab und verblassen, die Flasche leert sich bis zum Pegel des zweiten Jahres (weinEinbruch()). Die Flasche steht
// auf derselben Grundlinie wie Tor, Kreuz und Kirche.
function layoutWein(b) {
  const { personen, wein } = instanz;
  const h = instanz.basisHoehe;
  // je Breite einmal (der Klick berechnet das Layout sonst mehrfach)
  const schluessel = `${b}|${h}|${Boolean(instanz.graue)}`;
  if (instanz.weinLayout?.schluessel === schluessel) return instanz.weinLayout.L;
  const LV = layoutVermoegen(b);
  const luecke = Math.max(14, b * 0.025);
  const mitGrauen = Boolean(instanz.graue);
  const { reihe, platz } = gemischteReihe(personen.length, mitGrauen);
  const N = reihe.length;
  const text = LV.text ? { ...LV.text, x: Math.min(b * 0.58, b - LV.text.b - 8) } : null; // rechts, aber nah an der Mitte
  const bereich = text ? text.x - luecke * 2 : b;
  const oben = KOPF_SPALTEN + 16, unten = h - 8;
  // die Punkte füllen die Flasche von unten nach oben (Rang 0 = unten)
  const flasche = inRechteck(FLASCHE, { x: 0, y: oben, b: bereich, h: unten - oben }, true);
  const raster = formRaster('flasche', N, FLASCHE.flaechen, FLASCHE);
  const plaetze = raster.punkte.map(flasche.pos).sort((a, c) => c[1] - a[1] || a[0] - c[0]);
  const z = raster.abstand * flasche.skala;
  const pos = (k) => plaetze[k % plaetze.length];
  const bleiben = Math.round((N * wein.nachher.eimer) / wein.vorher.eimer);
  const [ox, oy] = flasche.pos([0, 0]);
  const ergebnis = {
    ziel: (p) => pos(platz.m.get(p.nr)),
    frauZiel: (j) => pos(platz.f.get(j)),
    grauZiel: mitGrauen ? (j) => pos(platz.g.get(j)) : null,
    sinkt: {
      personen: (i) => platz.m.get(i) >= bleiben,
      frauen: (j) => platz.f.get(j) >= bleiben,
      graue: (j) => mitGrauen && platz.g.get(j) >= bleiben
    },
    sinkWeg: Math.max(40, z * 12),
    radius: Math.max(0.8, z * 0.4),
    text,
    flasche: {
      ox, oy, skala: flasche.skala, oben: oy, mitte: flasche.pos([FLASCHE.w / 2, 0])[0],
      links: flasche.pos([FLASCHE.bauch[0], 0])[0], rechts: flasche.pos([FLASCHE.bauch[1], 0])[0],
      pegel: plaetze[Math.max(0, bleiben - 1)][1] - z / 2 // Oberkante des Weins, der bleibt
    }
  };
  instanz.weinLayout = { schluessel, L: ergebnis };
  return ergebnis;
}

// Ein gemeinsames Layout für die drei Vermögens-Folien, damit nichts springt: links der Platz der grauen Säule
// (Inwohner und Hilfskräfte, erscheint erst auf der letzten Folie), daneben der Text, rechts die drei Säulen der
// Bürgerschaft (untere Schicht links, obere rechts). Alle Säulen mit derselben Punktgröße, die Münzfelder unter
// der Grundlinie sind von Anfang an reserviert. Schmal: vier Säulen nebeneinander, Text unter der Bühne.
function layoutVermoegen(b) {
  const S = instanz.schichten;
  const breit = b >= TEXT_MIN_BREITE;
  const luecke = Math.max(14, b * 0.025);
  const textBreite = breit ? Math.min(TEXT_BREITE * 0.85, b * 0.24) : 0;
  const grau = { ...(S.ohne || { id: OHNE_BUERGERRECHT, name: '', beschreibung: '' }), anzahl: instanz.personen.length, grau: true };
  const spalten = [grau, ...S.buerger.map((s) => ({ ...s }))];
  const zwischenraeume = spalten.length - 1 + (breit ? 1 : 0);
  const sb = (b - textBreite - luecke * zwischenraeume) / spalten.length;
  const eng = sb < 120;
  const kopfRaum = 96;
  const punktHoehe = Math.min(320, Math.max(150, instanz.basisHoehe * 0.42));
  const maxAnzahl = Math.max(...spalten.map((s) => s.anzahl), 1);
  let z = Math.sqrt((sb * punktHoehe) / maxAnzahl);
  while (Math.floor(sb / z) * Math.floor(punktHoehe / z) < maxAnzahl) z *= 0.97;
  const proZeile = Math.max(1, Math.floor(sb / z));
  const hoeheVon = (anzahl) => Math.ceil(anzahl / proZeile) * z;
  const grundlinie = kopfRaum + Math.max(...spalten.map((s) => hoeheVon(s.anzahl)));
  const muenzStart = grundlinie + 84;
  const mz = Math.max(5, Math.min(9, z * 1.5));
  const mProZeile = Math.max(1, Math.floor(sb / mz));
  let unten = muenzStart;
  spalten.forEach((s, k) => {
    s.x = k === 0 ? 0 : sb + luecke + (breit ? textBreite + luecke : 0) + (k - 1) * (sb + luecke);
    s.b = sb;
    s.eng = eng;
    const ox = s.x + (sb - proZeile * z) / 2 + z / 2;
    s.punkt = (rang) => [ox + (rang % proZeile) * z, grundlinie - z / 2 - Math.floor(rang / proZeile) * z];
    s.oben = grundlinie - hoeheVon(s.anzahl);
    s.muenzen = s.grau ? 0 : s.summe / instanz.muenzeGulden;
    s.mProZeile = mProZeile;
    s.muenzReihen = Math.ceil(s.muenzen / mProZeile);
    const mox = s.x + (sb - mProZeile * mz) / 2 + mz / 2;
    s.muenzPos = (j) => [mox + (j % mProZeile) * mz, muenzStart + mz / 2 + Math.floor(j / mProZeile) * mz];
    s.kopfZeilen = umbrechen(s.name, Math.max(8, Math.floor(sb / (eng ? 7.5 : 10.5))));
    s.beschreibungZeilen = s.grau ? umbrechen(s.beschreibung, Math.max(12, Math.floor(sb / 6.4))) : [];
    const ende = s.grau ? muenzStart + 64 + s.beschreibungZeilen.length * 15 : muenzStart + s.muenzReihen * mz;
    unten = Math.max(unten, ende);
  });
  const legendeY = unten + 28;
  const buergerSpalten = spalten.slice(1);
  return {
    ziel: (p) => { const zu = instanz.zuordnung[p.nr]; return buergerSpalten[zu.k].punkt(zu.rang); },
    grauZiel: (j) => spalten[0].punkt(j),
    radius: Math.max(1.1, z * 0.36),
    text: breit ? { x: sb + luecke, b: textBreite, top: 4 } : null,
    spalten, x0: breit ? sb + luecke : 0, grundlinie, muenzStart, muenzRadius: mz * 0.42, legendeY,
    benoetigt: legendeY + 3 * 18 + 12
  };
}

// --- Zeichnen -----------------------------------------------------------------------------------------

function zeichne(animiert) {
  const { svg, punkte } = instanz;
  const L = berechneLayout();
  instanz.vorigesLayout = instanz.layout;
  instanz.layout = L;
  instanz.letzteBreite = L.b; // eigene Neuzeichnung: die Breitenüberwachung soll sie nicht noch einmal auslösen
  halteZeichnung(DAUER + STAFFELUNG + 2500);
  svg.attr('viewBox', `0 0 ${L.b} ${L.h}`);
  const mitAnimation = animiert && !ohneAnimation();
  const imFeld = TOR_STATIONEN.includes(L.station);
  punkte.classed('anteil', !PERSONEN_STATIONEN.includes(L.station));
  const personenBewegen = zeigePersonen(L, mitAnimation); // verborgen von Archiv-Folie zu Archiv-Folie: ohne Bewegung
  // Größe und Deckkraft springen gleich auf den Zielwert (der Unterschied ist klein), nur die Lage wird animiert
  const deckVon = (p, i) => {
    if (L.hervor) return L.hervor(p) ? 0.95 : 0.55;
    return imFeld || L.bleibt?.(i) ? p.helligkeit : 0.85;
  };
  const farbeVon = (p) => (L.hervor ? (L.hervor(p) ? HERVOR : AUSGEGRAUT) : FARBE);
  // zwischen `buergerbuch` und `schreibweisen` (gleiche Lage) färben sich die Punkte langsam um, statt zu springen
  const umfaerben = mitAnimation && [L.station, instanz.vorigesLayout?.station].sort().join() === 'buergerbuch,schreibweisen';
  punkte.interrupt('hervor').attr('r', L.radius);
  if (!umfaerben) {
    punkte.attr('fill-opacity', deckVon);
    if (instanz.hervorAktiv && !L.hervor) punkte.attr('fill', FARBE); // zurück von `schreibweisen`
  }
  instanz.hervorAktiv = Boolean(L.hervor);
  punkte.attr('opacity', null); // auf `weinzoll` verblasste Punkte sind zurück
  bewegePunkte(punkte.data().map((p, i) => L.ziel(p, i)), mitAnimation && personenBewegen,
    umfaerben ? punkte.node().getAttribute('fill') : (L.art === 'vermoegen' ? HAUSHALT_FARBE : (L.art === 'wein' ? BORDEAUX : FARBE)));
  if (umfaerben) {
    punkte.transition('hervor').delay((p) => p.verzoegerung * 500).duration(1800).ease(d3.easeCubicInOut)
      .attr('fill', farbeVon).attr('fill-opacity', deckVon);
  } else if (L.hervor) {
    punkte.attr('fill', farbeVon);
  }
  if (mitAnimation) instanz.animationBis = Date.now() + DAUER + STAFFELUNG + 400 + (L.art === 'wein' ? WEIN_SINKEN + 900 : 0);
  zeichneFrauen(L, mitAnimation);
  zeichneGraue(L, mitAnimation);
  if (L.art === 'wein') weinEinbruch(L, mitAnimation);
  pendleKonfession(L);
  zeichneTeile(L, mitAnimation);
  zeichneArchiv(L, mitAnimation);
  platziereErklaerung();
  markiereAuswahl();
}

// Personen auf den Archiv-Folien: im Punkt des Bürgerbuchs zusammengezogen und verborgen. Weiter zum Buch brechen sie
// aus diesem Punkt hervor; zurück ziehen sie sich wieder hinein und verschwinden.
function zeigePersonen(L, mitAnimation) {
  const gruppe = instanz.punkte.node().parentNode;
  const sichtbar = L.art !== 'archiv';
  const war = instanz.personenSichtbar;
  instanz.personenSichtbar = sichtbar;
  gruppe.style.pointerEvents = sichtbar ? '' : 'none';
  clearTimeout(instanz.personenZeit);
  if (sichtbar && !war) {
    const [x, y] = instanz.vorigesLayout?.archiv?.bbPos || L.archiv?.bbPos || [L.b / 2, L.h / 2];
    beendeBewegung('personen', { schreiben: false });
    instanz.punkte.attr('cx', x).attr('cy', y);
    gruppe.style.opacity = '';
  } else if (!sichtbar) {
    if (mitAnimation && war) {
      instanz.personenZeit = setTimeout(() => { if (instanz?.layout === L) gruppe.style.opacity = 0; }, DAUER + STAFFELUNG + 80);
    } else {
      gruppe.style.opacity = 0;
    }
  }
  return sichtbar || war;
}

// Archivpunkte zeichnen bzw. bewegen (316 Rechtecke: d3-Übergänge genügen), Beschriftungen, Urkunden, Puls
function zeichneArchiv(L, mitAnimation) {
  const A = instanz.archiv;
  if (!A) return;
  const { archivPunkte, archivUrkunden, archivBeschriftung, archivPuls, archivEbene } = instanz;
  const aktiv = L.art === 'archiv';
  const warAktiv = instanz.archivAktiv;
  instanz.archivAktiv = aktiv;
  archivEbene.style('pointer-events', aktiv ? null : 'none');
  archivBeschriftung.selectAll('*').interrupt().remove();
  archivPuls.attr('display', 'none');
  archivPunkte.interrupt('archiv');
  if (!aktiv) {
    if (mitAnimation && warAktiv) archivPunkte.transition('archiv').duration(450).attr('opacity', 0);
    else archivPunkte.attr('opacity', 0);
    archivUrkunden.interrupt('urk').attr('opacity', 0);
    instanz.urkundenSichtbar = false;
    zeichneVerluste(null, mitAnimation);
    zeichneJahre(null, mitAnimation);
    return;
  }
  zeichneVerluste(L.archiv, mitAnimation);
  zeichneJahre(L.archiv, mitAnimation);
  const LA = L.archiv;
  const ziel = (sel) => sel.attr('x', (d, i) => LA.lage[i].x).attr('y', (d, i) => LA.lage[i].y)
    .attr('width', (d, i) => LA.lage[i].w).attr('height', (d, i) => LA.lage[i].h).attr('rx', (d, i) => LA.lage[i].rx)
    .attr('fill', (d, i) => LA.farbe[i]);
  if (!mitAnimation) {
    ziel(archivPunkte).attr('opacity', (d, i) => LA.deckkraft[i]);
  } else if (!warAktiv) {
    // zurück vom Buch: die Archivpunkte blenden an ihrem Platz wieder ein, während die Personen hineinfließen
    ziel(archivPunkte).attr('opacity', 0);
    archivPunkte.transition('archiv').delay(DAUER * 0.45).duration(700).attr('opacity', (d, i) => LA.deckkraft[i]);
  } else {
    ziel(archivPunkte.transition('archiv').delay((d, i) => ((i * 7919) % 997) / 997 * STAFFELUNG * 1.6).duration(DAUER).ease(d3.easeCubicInOut))
      .attr('opacity', (d, i) => LA.deckkraft[i]);
  }
  // Bürgerbuch auf `klick`: als Knopf bedienbar
  archivPunkte.attr('tabindex', (d, i) => (LA.puls && i === A.bb ? 0 : null))
    .attr('role', (d, i) => (LA.puls && i === A.bb ? 'button' : null))
    .attr('aria-label', (d, i) => (LA.puls && i === A.bb ? 'Bürgerbuch öffnen' : null));
  if (LA.puls) {
    const [x, y] = LA.bbPos;
    archivPuls.attr('cx', x).attr('cy', y).attr('r', LA.lage[A.bb].w / 2 + 2).attr('display', null);
  }
  // Urkunden: aus ihrem Bestandspunkt hervor bzw. wieder hinein
  const U = LA.urkunden;
  archivUrkunden.interrupt('urk').style('pointer-events', (d, i) => (U && !(U.deckkraft && U.deckkraft[i] < 0.2) ? null : 'none'));
  if (A.urk >= 0) archivUrkunden.attr('fill', (d, i) => U?.farbe?.[i] || A.items[A.urk].farbe);
  // fast unsichtbare Bestände (auf `urkunden`) sind nicht anklickbar
  archivPunkte.style('pointer-events', (d, i) => (LA.deckkraft[i] < 0.2 ? 'none' : null));
  if (U) {
    if (!instanz.urkundenSichtbar) archivUrkunden.attr('cx', U.start[0]).attr('cy', U.start[1]).attr('opacity', 0);
    const n = U.pos.length;
    const sel = archivUrkunden.attr('r', U.r);
    (mitAnimation ? sel.transition('urk').delay((d, i) => DAUER * 0.35 + (i / n) * 900).duration(DAUER).ease(d3.easeCubicOut) : sel)
      .attr('cx', (d, i) => U.pos[i][0]).attr('cy', (d, i) => U.pos[i][1]).attr('opacity', (d, i) => (U.deckkraft ? U.deckkraft[i] : 0.9));
    instanz.urkundenSichtbar = true;
  } else if (instanz.urkundenSichtbar) {
    const it = A.urk >= 0 ? LA.lage[A.urk] : null;
    const [x, y] = it ? [it.x + Math.min(it.w, 40) / 2, it.y + it.h / 2] : [0, 0];
    (mitAnimation ? archivUrkunden.transition('urk').duration(DAUER * 0.8).ease(d3.easeCubicIn) : archivUrkunden)
      .attr('cx', x).attr('cy', y).attr('opacity', 0);
    instanz.urkundenSichtbar = false;
  }
  zeichneArchivBeschriftung(LA, mitAnimation);
}

// Verlust-Kapitel: Ringe für verlorene Bestände (Gruppe j % VERLUST_GRUPPEN fällt auf der Folie j + 1) und goldene
// Beiträge auf `mitmachen`. Kommt man von vorn, blenden zuerst alle Ringe ein, dann fällt die erste Gruppe; zurück
// steigen gefallene Ringe wieder an ihren Platz.
function zeichneVerluste(LA, mitAnimation) {
  const { archivGeister: geister, archivBeitraege: beitraege } = instanz;
  if (!geister) return;
  const GE = LA?.geister;
  const vorher = instanz.geisterStand;
  geister.interrupt('geist');
  if (!GE) {
    if (vorher >= 0 && mitAnimation) geister.transition('geist').duration(450).attr('opacity', 0);
    else geister.attr('opacity', 0);
    instanz.geisterStand = -1;
  } else {
    const neu = vorher < 0;
    const sichtbar = (j) => j % VERLUST_GRUPPEN >= GE.gefallen;
    const faelltJetzt = (j) => !sichtbar(j) && (neu || j % VERLUST_GRUPPEN >= vorher);
    const zufall = (j) => ((j * 7919) % 997) / 997;
    const seitlich = (j) => ((j * 31) % 41) - 20; // gefallene Ringe treiben etwas zur Seite
    const weg = (j) => [GE.pos[j][0] + seitlich(j), GE.pos[j][1] + FALL_WEG];
    geister.attr('r', GE.r);
    if (neu) geister.attr('cx', (j) => GE.pos[j][0]).attr('cy', (j) => GE.pos[j][1]).attr('opacity', 0).style('stroke', null).style('fill', null);
    if (!mitAnimation) {
      geister.attr('cx', (j) => (sichtbar(j) ? GE.pos[j] : weg(j))[0]).attr('cy', (j) => (sichtbar(j) ? GE.pos[j] : weg(j))[1])
        .attr('opacity', (j) => (sichtbar(j) ? 1 : 0)).style('stroke', null).style('fill', null);
    } else {
      // 1. an den Platz (einblenden, mitwandern oder wieder aufsteigen); 2. die Ringe dieser Folie färben sich rot;
      // 3. sie fallen tief und leicht seitlich aus dem Tor und verblassen
      const bleibt = (j) => sichtbar(j) || faelltJetzt(j);
      geister.transition('geist').delay(neu ? 300 : 0).duration(neu ? 900 : DAUER).ease(d3.easeCubicInOut)
        .attr('cx', (j) => (bleibt(j) ? GE.pos[j] : weg(j))[0]).attr('cy', (j) => (bleibt(j) ? GE.pos[j] : weg(j))[1])
        .attr('opacity', (j) => (bleibt(j) ? 1 : 0)).style('stroke', RAHMEN).style('fill', 'rgba(154, 144, 129, 0.18)')
        .transition('geist').delay((j) => (faelltJetzt(j) ? 200 + zufall(j) * 1600 : 0)).duration((j) => (faelltJetzt(j) ? 350 : 0))
        .style('stroke', (j) => (faelltJetzt(j) ? VERLUST_ROT : RAHMEN)).style('fill', (j) => (faelltJetzt(j) ? 'rgba(164, 68, 47, 0.35)' : 'rgba(154, 144, 129, 0.18)'))
        .transition('geist').duration((j) => (faelltJetzt(j) ? 1100 : 0)).ease(d3.easeCubicIn)
        .attr('cx', (j) => (sichtbar(j) ? GE.pos[j] : weg(j))[0]).attr('cy', (j) => (sichtbar(j) ? GE.pos[j] : weg(j))[1])
        .attr('opacity', (j) => (sichtbar(j) ? 1 : 0));
    }
    instanz.geisterStand = GE.gefallen;
  }
  const BE = LA?.beitraege;
  beitraege.interrupt('beitrag');
  if (BE) {
    if (!instanz.beitraegeSichtbar) beitraege.attr('cx', (j) => BE.start[j][0]).attr('cy', (j) => BE.start[j][1]).attr('opacity', 0);
    beitraege.attr('r', BE.r);
    // langsam, einer nach dem anderen, von unten in die Löcher
    (mitAnimation ? beitraege.transition('beitrag').delay((j) => 900 + (((j * 7919) % 997) / 997) * 8000).duration(1600).ease(d3.easeCubicOut) : beitraege)
      .attr('cx', (j) => BE.pos[j][0]).attr('cy', (j) => BE.pos[j][1]).attr('opacity', 1);
    instanz.beitraegeSichtbar = true;
  } else if (instanz.beitraegeSichtbar) {
    (mitAnimation ? beitraege.transition('beitrag').duration(500) : beitraege).attr('opacity', 0);
    instanz.beitraegeSichtbar = false;
  }
}

// Jahreszahlen der Verluste (Folien verlust1–3): Jede Folie fügt ihre Jahre hinzu; alle stehen zeitlich geordnet
// untereinander, schon gezeigte rücken auf, neue schieben sich von rechts ein (die der aktuellen Folie kräftig, die
// früheren blasser). Zurück verschwinden die Jahre der verlassenen Folie wieder.
function zeichneJahre(LA, mitAnimation) {
  const g = instanz.archivJahre;
  if (!g) return;
  const S = LA?.jahreSpalte;
  const liste = [];
  if (S) {
    const bis = VERLUST_STATIONEN.indexOf(S.station);
    VERLUST_STATIONEN.slice(0, bis + 1).forEach((id, k) => (instanz.stationen.find((x) => x.id === id)?.jahre || [])
      .forEach((text) => liste.push({ text, aktuell: k === bis })));
    liste.sort((a, c) => parseInt(a.text, 10) - parseInt(c.text, 10));
  }
  const y = (d) => S.y + liste.indexOf(d) * S.abstand;
  const sel = g.selectAll('text').data(liste, (d) => d.text);
  sel.exit().interrupt().transition().duration(mitAnimation ? 350 : 0).attr('opacity', 0).remove();
  if (!S) return;
  const neu = sel.enter().append('text').attr('class', 'bgi-verlustjahr').text((d) => d.text)
    .attr('x', S.x + 60).attr('y', y).attr('opacity', 0);
  const neuReihe = liste.filter((d) => d.aktuell);
  sel.merge(neu).interrupt()
    .transition().delay((d) => (mitAnimation ? (d.aktuell ? 1100 + neuReihe.indexOf(d) * 450 : 200) : 0)).duration(mitAnimation ? 700 : 0)
    .ease(d3.easeCubicOut)
    .attr('x', S.x).attr('y', y).attr('opacity', (d) => (d.aktuell ? 1 : 0.45));
}

// Feldnamen der Kategorien, Zeitachse, „ohne Zeitangabe“, Notiz zu den Urkunden, „Hier klicken“
function zeichneArchivBeschriftung(LA, mitAnimation) {
  const g = instanz.archivBeschriftung.append('g');
  LA.beschriftungen.forEach((e) => {
    if (e.art === 'feld') {
      g.append('rect').attr('x', e.x).attr('y', e.y).attr('width', e.w).attr('height', e.h).attr('rx', 6)
        .attr('fill', e.farbe).attr('fill-opacity', 0.08).attr('stroke', e.farbe).attr('stroke-opacity', 0.45);
      if (e.kopf > 10) {
        const name = umbrechen(e.name, Math.max(6, Math.floor(e.w / 7.2)))[0];
        g.append('text').attr('class', 'bgi-wert').style('text-anchor', 'start').attr('x', e.x + 7).attr('y', e.y + 15)
          .text(name === e.name ? name : `${name} …`);
        g.append('text').attr('class', 'bgi-wert-klein').style('text-anchor', 'start').attr('x', e.x + 7).attr('y', e.y + 29).text(zahl(e.anzahl));
      }
    } else if (e.art === 'achse') {
      g.append('line').attr('x1', e.x0).attr('x2', e.x1).attr('y1', e.y + 4).attr('y2', e.y + 4).attr('stroke', '#c3c2b7');
      const [a, z] = e.xs.domain();
      for (let j = a; j <= z; j += 100) {
        g.append('line').attr('x1', e.xs(j)).attr('x2', e.xs(j)).attr('y1', e.y + 4).attr('y2', e.y + 9).attr('stroke', '#c3c2b7');
        g.append('text').attr('class', 'bgi-wert-klein').attr('x', e.xs(j)).attr('y', e.y + 22).text(j);
      }
    } else if (e.art === 'ohneZeit') {
      g.append('text').attr('class', 'bgi-wert-klein').style('text-anchor', 'start').attr('x', e.x).attr('y', e.y).text(e.text);
    } else if (e.art === 'notiz') {
      g.append('text').attr('class', 'bgi-wert').attr('x', e.x).attr('y', e.y).text(e.text);
    } else if (e.art === 'jahr') {
      const t = g.append('text').attr('class', 'bgi-verlustjahr').attr('x', e.x).attr('y', e.y).text(e.text);
      if (mitAnimation) t.attr('opacity', 0).transition().delay(900 + e.k * 450).duration(600).attr('opacity', 1);
    } else if (e.art === 'umriss') {
      g.append('path').attr('d', `${d3.line()(e.punkte)}Z`).attr('fill', 'none').attr('stroke', '#a9a294').attr('stroke-width', 1)
        .attr('stroke-linejoin', 'round');
    } else if (e.art === 'linie') {
      g.append('path').attr('d', d3.line()(e.punkte)).attr('fill', 'none').attr('stroke', '#9db7c9').attr('stroke-width', 2.5)
        .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
      g.append('text').attr('class', 'bgi-wert-klein').style('fill', '#6f8ea3').style('font-style', 'italic')
        .attr('x', e.textAn[0]).attr('y', e.textAn[1] + 16).text(e.text);
    } else if (e.art === 'kreis') {
      g.append('circle').attr('cx', e.x).attr('cy', e.y).attr('r', e.r).attr('fill', 'none').attr('stroke', '#c3c2b7').attr('stroke-dasharray', '3 4');
      g.append('text').attr('class', 'bgi-wert-klein').attr('x', e.x).attr('y', e.y - e.r - 4).text(e.text);
    } else if (e.art === 'hof') {
      g.append('circle').attr('cx', e.x).attr('cy', e.y).attr('r', e.r * 1.7).attr('fill', VERLUST_ROT).attr('fill-opacity', 0.07);
      g.append('circle').attr('cx', e.x).attr('cy', e.y).attr('r', e.r).attr('fill', VERLUST_ROT).attr('fill-opacity', 0.13);
    } else if (e.art === 'ort') {
      g.append('text').attr('class', e.haupt ? 'bgi-wert' : 'bgi-wert-klein').style('text-anchor', 'start')
        .attr('x', e.x).attr('y', e.y).text(e.text);
    } else if (e.art === 'hinweis') {
      g.append('line').attr('x1', e.von).attr('x2', e.x - 8).attr('y1', e.y).attr('y2', e.y)
        .attr('stroke', AUSWAHL).attr('stroke-width', 1.5).attr('stroke-dasharray', '3 3');
      g.append('text').attr('class', 'bgi-spaltenkopf klein bgi-hinweis').style('text-anchor', 'start').attr('x', e.x).attr('y', e.y + 6).text(e.text);
    }
  });
  blendeEin(g, mitAnimation, DAUER * 0.6);
}

// Bewegungen auf der Leinwand (2026-10-28, „ruckelt“ beim Verschmelzen von Männern und Frauen): Bewegen sich
// Tausende SVG-Kreise gleichzeitig, kostet das Neuzeichnen 30–60 ms je Bild. Während einer Bewegung wird die
// SVG-Gruppe deshalb verborgen und die Punkte werden auf einem Canvas über der Grafik gezeichnet; am Ende stehen die
// SVG-Kreise an ihrem Ziel und werden wieder gezeigt. Mehrere Bewegungen (Personen, Frauen) teilen sich eine
// Schleife. Eine neue Bewegung gleichen Namens übernimmt die aktuelle Lage der laufenden.
const VOLLKREIS = Math.PI * 2;

// Punkte ohne Seitenelemente (2026-10-29, Wunsch des Autors): Personen, Frauen, Inwohner und Münzen sind keine
// SVG-Kreise mehr, sondern leichte Objekte (VPunkt) mit getAttribute/setAttribute wie ein Element - so laufen
// d3-Auswahlen, -Übergänge und der übrige Code unverändert weiter. Gezeichnet wird alles auf der einen Leinwand
// (zeichneAlles(), nur wenn sich etwas ändert). Anlass: Erweiterungen wie Werbeblocker durchsuchen nach jeder Änderung
// die ganze Seite; bei über 15 000 Kreisen stand der Browser dabei Sekunden still und die Übergänge sprangen.
// Tooltip und Klick ermittelt trefferBei() aus der Mausposition.
class VStil {
  constructor(gruppe) { this.g = gruppe; this.p = Object.create(null); }
  setProperty(name, wert) { this.p[name] = String(wert); this.g.dirty = true; neuZeichnen(); }
  removeProperty(name) { if (name in this.p) { delete this.p[name]; this.g.dirty = true; neuZeichnen(); } }
  getPropertyValue(name) { return this.p[name] ?? ''; }
}

class VPunkt {
  constructor(gruppe) {
    this.parentNode = gruppe;
    this.a = Object.create(null);
    this.style = new VStil(gruppe);
  }
  // Werte bleiben, wie sie kommen (meist Zahlen); nur nach außen als Text wie bei einem Element
  getAttribute(name) { return name in this.a ? String(this.a[name]) : null; }
  setAttribute(name, wert) { this.a[name] = wert; this.parentNode.dirty = true; neuZeichnen(); }
  removeAttribute(name) { if (name in this.a) { delete this.a[name]; this.parentNode.dirty = true; neuZeichnen(); } }
  hasAttribute(name) { return name in this.a; }
  // für den Tooltip (positioniert sich an seinem Anker)
  getBoundingClientRect() {
    const s = instanz.buehne.getBoundingClientRect();
    const r = Number(this.a.r) || 2, x = s.left + (Number(this.a.cx) || 0), y = s.top + (Number(this.a.cy) || 0);
    return { left: x - r, right: x + r, top: y - r, bottom: y + r, width: r * 2, height: r * 2, x: x - r, y: y - r };
  }
}

// Gruppe virtueller Punkte (ersetzt das <g>): style wie ein Element (visibility, opacity, pointerEvents), handler für
// Tooltip (zeige) und Klick (klick, klickbar); dom: zugehöriges SVG-<g>, dessen display/opacity mitgelten (Münzen).
// cache: die ruhende Gruppe als fertiges Bild - neu gemalt nur, wenn sich einer ihrer Punkte ändert (dirty)
function vGruppe(name, handler = {}) {
  return { name, knoten: [], handler, dom: null, cache: null, dirty: true, style: { visibility: '', opacity: '', pointerEvents: '' }, appendChild() {} };
}

function vPunkte(gruppe, daten) {
  gruppe.knoten = daten.map(() => new VPunkt(gruppe));
  return d3.selectAll(gruppe.knoten).data(daten);
}

// Neu zeichnen im nächsten Bild (mehrere Änderungen in einem Bild werden zusammengefasst)
function neuZeichnen() {
  if (!instanz || instanz.zeichenAnfrage) return;
  instanz.zeichenAnfrage = requestAnimationFrame(zeichneAlles);
}

// eine Weile jedes Bild zeichnen (Ein- und Ausblenden der Münzgruppe läuft als d3-Übergang am SVG-<g>)
function halteZeichnung(ms) {
  if (!instanz) return;
  instanz.zeichnenBis = Math.max(instanz.zeichnenBis, performance.now() + ms);
  neuZeichnen();
}

function zeichneAlles() {
  if (!instanz) return;
  instanz.zeichenAnfrage = null;
  const { bewegungen, leinwand, buehne } = instanz;
  const dpr = window.devicePixelRatio || 1;
  const breite = buehne.clientWidth, hoehe = buehne.clientHeight + LEINWAND_UEBERSTAND;
  if (leinwand.width !== Math.round(breite * dpr) || leinwand.height !== Math.round(hoehe * dpr)) {
    leinwand.width = Math.round(breite * dpr);
    leinwand.height = Math.round(hoehe * dpr);
    leinwand.style.width = `${breite}px`;
    leinwand.style.height = `${hoehe}px`;
  }
  const ctx = leinwand.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, breite, hoehe);
  const jetzt = performance.now();
  instanz.bildNr += 1;
  // Münzgruppen, deren <g> entfernt wurde, fallen weg
  instanz.muenzGruppen.forEach((g) => { if (!g.dom?.isConnected) instanz.muenzGruppen.delete(g); });
  const ebenen = [...[...instanz.muenzGruppen].map((g) => ['muenzen', g]),
    ['graue', instanz.graueGruppe], ['frauen', instanz.frauenGruppe], ['personen', instanz.personenGruppe]];
  const gezeichnet = new Set();
  ebenen.forEach(([name, gruppe]) => {
    if (!gruppe) return;
    const b = bewegungen.get(name);
    if (b && b.gruppe === gruppe) {
      zeichneBewegung(ctx, name, b, jetzt);
      gezeichnet.add(name);
    } else {
      zeichneStatisch(ctx, gruppe, dpr);
    }
  });
  [...bewegungen.entries()].forEach(([name, b]) => { if (!gezeichnet.has(name)) zeichneBewegung(ctx, name, b, jetzt); });
  ctx.globalAlpha = 1;
  if (bewegungen.size || jetzt < instanz.zeichnenBis) neuZeichnen();
}

// ruhende Punkte einer Gruppe: aus dem Zwischenbild, das nur neu entsteht, wenn sich etwas geändert hat; die Deckkraft
// der ganzen Gruppe (Ein- und Ausblenden) wirkt erst beim Einsetzen
function zeichneStatisch(ctx, gruppe, dpr) {
  if (gruppe.style.visibility === 'hidden') return;
  let deckGruppe = gruppe.style.opacity === '' ? 1 : Number(gruppe.style.opacity);
  if (gruppe.dom) {
    if (gruppe.dom.getAttribute('display') === 'none') return;
    const o = gruppe.dom.getAttribute('opacity');
    if (o !== null) deckGruppe *= Number(o);
  }
  if (!(deckGruppe > 0.005)) return;
  const grau = gruppe === instanz.graueGruppe;
  const hohl = grau && !instanz.ebeneGraue.classed('bgi-wein');
  const { width, height } = ctx.canvas;
  if (!gruppe.cache) gruppe.cache = document.createElement('canvas');
  if (gruppe.cache.width !== width || gruppe.cache.height !== height || gruppe.hohl !== hohl) {
    gruppe.cache.width = width;
    gruppe.cache.height = height;
    gruppe.hohl = hohl;
    gruppe.dirty = true;
  }
  // ändert sich eine Gruppe Bild für Bild (Münzregen), fehlen die dünnen Ränder, bis sie wieder ruht
  if (gruppe.dirty || gruppe.nachmalen) {
    const heiss = gruppe.dirty && gruppe.zuletzt === instanz.bildNr - 1;
    if (gruppe.dirty) gruppe.zuletzt = instanz.bildNr;
    gruppe.nachmalen = heiss;
    const c = gruppe.cache.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, width, height);
    gruppe.leer = maleGruppe(c, gruppe, grau, hohl, !heiss) === 0;
    gruppe.dirty = false;
    if (heiss) neuZeichnen();
  }
  if (gruppe.leer) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = deckGruppe;
  ctx.drawImage(gruppe.cache, 0, 0);
  ctx.restore();
}

// alle Punkte einer Gruppe, gebündelt nach Farbe und (auf 1/20 gerundeter) Deckkraft; Inwohner hohl (außer auf
// `weinzoll`), Münzen mit Rand, die gewählte Person mit Ring
function maleGruppe(ctx, gruppe, grau, hohl, mitRand = true) {
  const deckGruppe = 1;
  let anzahl = 0;
  const fuellung = new Map(), raender = new Map(), ringe = [];
  const merke = (karte, schluessel, x, y, r) => {
    let liste = karte.get(schluessel);
    if (!liste) { liste = []; karte.set(schluessel, liste); }
    liste.push(x, y, r);
  };
  for (const k of gruppe.knoten) {
    const a = k.a;
    const deck = (a.opacity === undefined ? 1 : Number(a.opacity)) * deckGruppe;
    const r = Number(a.r);
    if (!(deck > 0.01) || !(r > 0)) continue;
    const x = Number(a.cx), y = Number(a.cy);
    anzahl += 1;
    if (hohl) { merke(raender, `${RAHMEN}|${Math.round(deck * 20)}|1`, x, y, r); continue; }
    const farbe = grau ? BORDEAUX : (a.fill || FARBE);
    const fo = grau ? 0.9 : (a['fill-opacity'] === undefined ? 1 : Number(a['fill-opacity']));
    const alpha = Math.round(deck * fo * 20);
    if (alpha > 0) merke(fuellung, `${farbe}|${alpha}`, x, y, r);
    if (a.stroke && mitRand) merke(raender, `${a.stroke}|${Math.round(deck * 20)}|${a['stroke-width'] || 1}`, x, y, r);
    if (k.style.p.stroke) ringe.push(k);
  }
  const pfad = (liste) => {
    ctx.beginPath();
    for (let i = 0; i < liste.length; i += 3) {
      ctx.moveTo(liste[i] + liste[i + 2], liste[i + 1]);
      ctx.arc(liste[i], liste[i + 1], liste[i + 2], 0, VOLLKREIS);
    }
  };
  fuellung.forEach((liste, schluessel) => {
    const [farbe, alpha] = schluessel.split('|');
    ctx.fillStyle = farbe;
    ctx.globalAlpha = Number(alpha) / 20;
    pfad(liste);
    ctx.fill();
  });
  raender.forEach((liste, schluessel) => {
    const [farbe, alpha, breite] = schluessel.split('|');
    if (Number(alpha) <= 0) return;
    ctx.strokeStyle = farbe;
    ctx.globalAlpha = Number(alpha) / 20;
    ctx.lineWidth = Number(breite);
    pfad(liste);
    ctx.stroke();
  });
  ringe.forEach((k) => {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = k.style.p.stroke;
    ctx.lineWidth = parseFloat(k.style.p['stroke-width']) || 2;
    ctx.beginPath();
    ctx.arc(Number(k.a.cx), Number(k.a.cy), (Number(k.a.r) || 2) + 1, 0, VOLLKREIS);
    ctx.stroke();
  });
  return anzahl;
}

// eine laufende Bewegung (vorher zeichneLeinwand())
function zeichneBewegung(ctx, name, b, jetzt) {
  if (b.beginn === null) b.beginn = jetzt;
  b.bilder += 1;
  const vergangen = jetzt - b.beginn;
  let farbStufe = -1;
  let alleFertig = true;
  // einfarbig, ohne Deckkraftverlauf (Münzen): alle Kreise in einem Pfad, ein einziges fill()
  if (b.farbeVon === b.farbeNach && !b.deckkraft) {
    ctx.fillStyle = b.farben[0];
    ctx.globalAlpha = b.fuell[0];
    ctx.beginPath();
    for (let i = 0; i < b.knoten.length; i += 1) {
      const t = Math.min(1, Math.max(0, (vergangen - b.verzoegerung[i]) / b.dauer));
      if (t < 1) alleFertig = false;
      const e = t <= 0 ? 0 : (t >= 1 ? 1 : b.ease(t));
      b.e[i] = e;
      const r = b.radiusNach === undefined ? b.radius : b.radius + (b.radiusNach - b.radius) * e;
      const x = b.start[i][0] + (b.ziel[i][0] - b.start[i][0]) * e, y = b.start[i][1] + (b.ziel[i][1] - b.start[i][1]) * e;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, VOLLKREIS);
    }
    ctx.fill();
    if (alleFertig) beendeBewegung(name);
    return;
  }
  // Punkte nach Farbstufe und (auf 1/20 gerundeter) Deckkraft bündeln: je Bündel ein Pfad und ein fill()
  const buendel = new Map();
  for (let i = 0; i < b.knoten.length; i += 1) {
    const t = Math.min(1, Math.max(0, (vergangen - b.verzoegerung[i]) / b.dauer));
    if (t < 1) alleFertig = false;
    const e = t <= 0 ? 0 : (t >= 1 ? 1 : b.ease(t));
    b.e[i] = e;
    const a = Math.round((b.deckkraft ? b.deckkraft(e, i) : 1) * b.fuell[i] * 20);
    if (a <= 0) continue;
    const schluessel = Math.round(e * 20) * 32 + a;
    let liste = buendel.get(schluessel);
    if (!liste) { liste = []; buendel.set(schluessel, liste); }
    liste.push(i, e);
  }
  buendel.forEach((liste, schluessel) => {
    const stufe = Math.floor(schluessel / 32);
    if (stufe !== farbStufe) { ctx.fillStyle = b.farben[stufe]; farbStufe = stufe; }
    ctx.globalAlpha = (schluessel % 32) / 20;
    ctx.beginPath();
    for (let k = 0; k < liste.length; k += 2) {
      const i = liste[k], e = liste[k + 1];
      const r = b.radiusNach === undefined ? b.radius : b.radius + (b.radiusNach - b.radius) * e;
      const x = b.start[i][0] + (b.ziel[i][0] - b.start[i][0]) * e, y = b.start[i][1] + (b.ziel[i][1] - b.start[i][1]) * e;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, VOLLKREIS);
    }
    ctx.fill();
  });
  if (alleFertig) beendeBewegung(name);
}

// Treffer an der Mausposition: oberste sichtbare Gruppe zuerst (Personen, Frauen, Inwohner, Münzen)
function trefferBei(event) {
  const s = instanz.buehne.getBoundingClientRect();
  const x = event.clientX - s.left, y = event.clientY - s.top;
  const gruppen = [instanz.personenGruppe, instanz.frauenGruppe, instanz.graueGruppe, ...instanz.muenzGruppen];
  for (const g of gruppen) {
    if (!g?.handler.zeige || g.style.pointerEvents === 'none' || g.style.visibility === 'hidden' || g.style.opacity === '0') continue;
    if (g.dom && (!g.dom.isConnected || g.dom.getAttribute('display') === 'none' || g.dom.style.pointerEvents === 'none'
      || Number(g.dom.getAttribute('opacity') ?? 1) < 0.1)) continue;
    let bester = null, abstand = Infinity;
    for (const k of g.knoten) {
      const a = k.a;
      if (k.style.p['pointer-events'] === 'none' || (a.opacity !== undefined && Number(a.opacity) < 0.1)) continue;
      const dx = Number(a.cx) - x, dy = Number(a.cy) - y, d = dx * dx + dy * dy, grenze = Math.max((Number(a.r) || 0) + 2, 4);
      if (d <= grenze * grenze && d < abstand) { bester = k; abstand = d; }
    }
    if (bester) return bester;
  }
  return null;
}

function starteBewegung(name, b) {
  const { bewegungen, leinwand } = instanz;
  bewegungen.delete(name);
  b.beginn = null; // startet mit dem ersten gezeichneten Bild (der Klick selbst kostet ein langes Bild)
  b.bilder = 0; // gezeichnete Bilder (Diagnose)
  // Farbverlauf in 21 Stufen vorab (statt je Punkt und Bild eine Farbe zu berechnen)
  const mische = d3.interpolateRgb(b.farbeVon, b.farbeNach);
  b.farben = d3.range(21).map((k) => mische(k / 20));
  b.e = new Float32Array(b.knoten.length);
  b.gesamt = Math.max(...b.verzoegerung) + b.dauer;
  b.gruppe.style.visibility = 'hidden';
  bewegungen.set(name, b);
  setTimeout(() => {
    if (instanz?.bewegungen.get(name) !== b) return;
    if (DIAGNOSE) {
      console.warn(`[Bürgerinnen? Diagnose] Folie ${instanz.stationIndex + 1} (${instanz.station}): Bewegung „${name}“ nicht von selbst fertig - `
        + `${b.bilder} Bilder gezeichnet, ${b.beginn === null ? 'nie begonnen' : `${Math.round(performance.now() - b.beginn)} ms seit dem ersten Bild`}, `
        + `Leinwand ${leinwand.width} × ${leinwand.height} px (Bildschirmfaktor ${window.devicePixelRatio || 1}), ${b.knoten.length} Punkte, `
        + `Zeichnen ${instanz.zeichenAnfrage ? 'angefordert' : 'ruht'}, Tab ${document.hidden ? 'verborgen' : 'sichtbar'}`);
    }
    beendeBewegung(name);
  }, b.gesamt + 600); // ruhende Tabs
  neuZeichnen();
}

// Ziel in die (virtuellen) Punkte schreiben und die Gruppe wieder zeigen
function beendeBewegung(name, { schreiben = true } = {}) {
  const b = instanz.bewegungen.get(name);
  if (!b) return;
  instanz.bewegungen.delete(name);
  if (schreiben) {
    b.knoten.forEach((k, i) => {
      k.setAttribute('cx', b.ziel[i][0].toFixed(1));
      k.setAttribute('cy', b.ziel[i][1].toFixed(1));
      if (b.deckkraft) k.setAttribute('opacity', b.deckkraft(1, i).toFixed(2));
    });
  }
  if (schreiben) b.knoten.forEach((k) => k.setAttribute('fill', b.farbeNach));
  if (schreiben && b.zielRadien) b.knoten.forEach((k, i) => k.setAttribute('r', b.zielRadien[i].toFixed(2)));
  b.gruppe.style.visibility = '';
  neuZeichnen();
}

// Aktuelle Lage (und Deckkraft) einer Punktgruppe - aus der laufenden Bewegung oder aus den SVG-Kreisen
function lageVon(name, knoten) {
  const b = instanz.bewegungen.get(name);
  return knoten.map((k, i) => {
    if (!b) return [Number(k.getAttribute('cx')) || 0, Number(k.getAttribute('cy')) || 0, Number(k.getAttribute('opacity') ?? 1)];
    const e = b.e[i];
    return [b.start[i][0] + (b.ziel[i][0] - b.start[i][0]) * e, b.start[i][1] + (b.ziel[i][1] - b.start[i][1]) * e, b.deckkraft ? b.deckkraft(e, i) : 1];
  });
}

// Morphen der Personenpunkte (Lage; Größe und Deckkraft springen vorher auf den Zielwert). Jeder Punkt startet mit
// höchstens STAFFELUNG ms Verzögerung; Punkte, die schon am Ziel stehen, bleiben unberührt.
function bewegePunkte(ziele, mitAnimation, zielFarbe) {
  const knoten = instanz.punkte.nodes();
  const farbeVon = knoten[0].getAttribute('fill') || FARBE;
  if (!mitAnimation) {
    beendeBewegung('personen', { schreiben: false });
    knoten.forEach((k, i) => { k.setAttribute('cx', ziele[i][0].toFixed(1)); k.setAttribute('cy', ziele[i][1].toFixed(1)); k.setAttribute('fill', zielFarbe); });
    return;
  }
  const start = lageVon('personen', knoten).map(([x, y]) => [x, y]);
  if (start.every(([x, y], i) => Math.abs(x - ziele[i][0]) < 0.05 && Math.abs(y - ziele[i][1]) < 0.05)) {
    beendeBewegung('personen', { schreiben: false });
    if (farbeVon !== zielFarbe) knoten.forEach((k) => k.setAttribute('fill', zielFarbe));
    return;
  }
  starteBewegung('personen', {
    gruppe: knoten[0].parentNode, knoten, start, ziel: ziele, ebene: 2, farbeVon, farbeNach: zielFarbe,
    fuell: knoten.map((k) => Number(k.getAttribute('fill-opacity')) || 0.85),
    radius: Number(knoten[0].getAttribute('r')) || 2,
    verzoegerung: instanz.punkte.data().map((p) => p.verzoegerung * STAFFELUNG),
    dauer: DAUER, ease: d3.easeCubicInOut
  });
}

// Bewegung der symbolischen Frauen-Punkte (Lage und Deckkraft über `deckkraft(e)`)
function animiere(knoten, start, ziel, { verzoegerung, dauer, deckkraft, ease = d3.easeCubicInOut, farbeNach = FRAUEN_FARBE }) {
  starteBewegung('frauen', {
    gruppe: knoten[0].parentNode, knoten, start, ziel, ebene: 1, farbeVon: knoten[0].getAttribute('fill') || FRAUEN_FARBE, farbeNach,
    fuell: knoten.map(() => 0.85), radius: Number(knoten[0].getAttribute('r')) || 2,
    verzoegerung, dauer, deckkraft, ease
  });
}

// Symbolische Frauen-Punkte (Folie `frauen`, Wunsch des Autors 2026-10-28): neben jedem Bürger eine Frau, ohne
// bestimmte Person. Von `geschlecht` her steigen sie Reihe für Reihe von unten in die leere Spalte; weiter zu den
// Schichten fliegt jede Frau zum Punkt ihres Haushalts (des Mannes mit demselben Index) und verschmilzt mit ihm;
// zurück lösen sie sich wieder aus den Haushalten bzw. sinken hinab.
function zeichneFrauen(L, mitAnimation) {
  const { frauenPunkte: sel, personen } = instanz;
  if (!sel) return;
  const knoten = sel.nodes();
  const sichtbar = ['frauen', 'klerus', 'reformation', 'behauptung', 'weinzoll'].includes(L.station);
  const farbe = L.art === 'wein' ? BORDEAUX : FRAUEN_FARBE;
  const warSichtbar = instanz.frauenSichtbar;
  instanz.frauenSichtbar = sichtbar;
  sel.attr('r', L.radius).style('pointer-events', sichtbar ? null : 'none');
  const unten = Math.max(L.h, L.benoetigt || 0) + 30;
  const spalte = sichtbar ? knoten.map((k, j) => L.frauZiel(j)) : null;
  const aktuell = lageVon('frauen', knoten).map(([x, y]) => [x, y]);
  if (mitAnimation && sichtbar && warSichtbar) { // z. B. vom Tor ins Kreuz: einfach mitwandern
    animiere(knoten, aktuell, spalte, {
      verzoegerung: knoten.map((k, j) => personen[j].verzoegerung * STAFFELUNG), dauer: DAUER, deckkraft: () => 1, farbeNach: farbe
    });
    return;
  }
  if (!mitAnimation || sichtbar === warSichtbar) {
    beendeBewegung('frauen', { schreiben: false });
    if (sichtbar) knoten.forEach((k, j) => { k.setAttribute('cx', spalte[j][0]); k.setAttribute('cy', spalte[j][1]); k.setAttribute('opacity', 1); k.setAttribute('fill', farbe); });
    else knoten.forEach((k) => k.setAttribute('opacity', 0));
    return;
  }
  const V = instanz.vorigesLayout;
  const versatz = (j) => personen[j].verzoegerung * STAFFELUNG;
  if (sichtbar && V?.art === 'vermoegen') {
    // aus den Haushalten lösen
    const start = knoten.map((k, j) => V.ziel(personen[j], j));
    animiere(knoten, start, spalte, {
      verzoegerung: knoten.map((k, j) => (L.frauVerz ? L.frauVerz(j) : versatz(j))), dauer: DAUER, deckkraft: (e) => Math.min(1, e * 2.5)
    });
  } else if (sichtbar) {
    // Reihe für Reihe von unten in die Spalte steigen
    const ys = spalte.map(([, y]) => y);
    const oben = Math.min(...ys), tief = Math.max(...ys);
    const start = spalte.map(([x]) => [x, unten]);
    animiere(knoten, start, spalte, {
      verzoegerung: spalte.map(([, y], j) => ((tief - y) / Math.max(1, tief - oben)) * 1500 + ((j * 7919) % 97) * 3),
      dauer: 750, deckkraft: (e) => Math.min(1, e * 3), ease: d3.easeCubicOut
    });
  } else if (L.art === 'vermoegen') {
    // mit dem Mann zum Haushalt verschmelzen: gleiches Ziel, gegen Ende ausblenden
    const ziel = knoten.map((k, j) => L.ziel(personen[j], j));
    animiere(knoten, aktuell, ziel, {
      verzoegerung: knoten.map((k, j) => versatz(j)), dauer: DAUER, deckkraft: (e) => 1 - Math.max(0, (e - 0.6) / 0.4),
      farbeNach: HAUSHALT_FARBE
    });
  } else {
    // hinabsinken
    animiere(knoten, aktuell, aktuell.map(([x]) => [x, unten]), {
      verzoegerung: knoten.map((k, j) => ((j * 7919) % 97) * 4), dauer: 600, deckkraft: (e) => 1 - e, ease: d3.easeCubicIn
    });
  }
}

// Graue Punkte (Inwohner und Hilfskräfte): steigen punktweise von unten in ihre Säule bzw. sinken wieder hinab;
// auf den Folien klerus/reformation sind sie Teil von Tor und Kreuz
function zeichneGraue(L, mitAnimation) {
  const { graue } = instanz;
  if (!graue) return;
  const sichtbar = ['vermoegenslos', 'klerus', 'reformation', 'behauptung', 'weinzoll'].includes(L.station) && Boolean(L.grauZiel);
  const wein = L.art === 'wein';
  const warSichtbar = instanz.graueSichtbar;
  instanz.graueSichtbar = sichtbar;
  const unten = Math.max(L.h, L.benoetigt || 0) + 30;
  const ziel = (j) => (L.grauZiel ? L.grauZiel(j) : [-40, unten]);
  graue.interrupt('grau').style('pointer-events', sichtbar ? null : 'none').attr('r', L.radius);
  if (mitAnimation && sichtbar && warSichtbar) {
    // von der Säule ins Tor, vom Tor ins Kreuz und zurück: über die Leinwand (gefüllt gezeichnet, am Ende wieder hohl)
    // auf `weinzoll` bordeauxrot gefüllt (Stil statt Klasse), sonst wieder hohl; auf `weinzoll` verblasste Punkte sind zurück
    const knoten = graue.nodes();
    const farbeVon = instanz.ebeneGraue.classed('bgi-wein') ? BORDEAUX : RAHMEN;
    starteBewegung('graue', {
      gruppe: knoten[0].parentNode, knoten, start: lageVon('graue', knoten).map(([x, y]) => [x, y]), ziel: knoten.map((k, j) => ziel(j)),
      ebene: 0.5, farbeVon, farbeNach: wein ? BORDEAUX : RAHMEN, fuell: knoten.map(() => 0.9), radius: L.radius,
      verzoegerung: knoten.map((k, j) => (((j * 7919) % 997) / 997) * STAFFELUNG), dauer: DAUER, ease: d3.easeCubicInOut
    });
    instanz.ebeneGraue.classed('bgi-wein', wein);
    graue.attr('opacity', 1);
    return;
  }
  beendeBewegung('graue', { schreiben: false });
  instanz.ebeneGraue.classed('bgi-wein', wein);
  if (!mitAnimation || sichtbar === warSichtbar) {
    graue.attr('cx', (j) => ziel(j)[0]).attr('cy', (j) => (sichtbar ? ziel(j)[1] : unten)).attr('opacity', sichtbar ? 1 : 0);
    return;
  }
  const n = graue.size();
  if (sichtbar) {
    // unterste Reihen zuerst, dazu etwas Zufall: die Säule wächst Punkt für Punkt von unten
    graue.attr('cx', (j) => ziel(j)[0]).attr('cy', unten).attr('opacity', 0)
      .transition('grau').delay((j) => (j / n) * 1800 + ((j * 7919) % 97) * 3).duration(700).ease(d3.easeCubicOut)
      .attr('cy', (j) => ziel(j)[1]).attr('opacity', 1);
    setTimeout(() => { if (instanz?.layout === L) graue.interrupt('grau').attr('cy', (j) => ziel(j)[1]).attr('opacity', 1); }, 2900);
  } else {
    graue.transition('grau').delay((j) => ((n - j) / n) * 500).duration(500).ease(d3.easeCubicIn)
      .attr('cy', unten).attr('opacity', 0);
    setTimeout(() => { if (instanz?.layout === L) graue.interrupt('grau').attr('cy', unten).attr('opacity', 0); }, 1200);
  }
}

// Folie `weinzoll`: Sind die Punkte in der Säule angekommen, sinken die oberen (der verlorene Teil der Ausfuhr) ein
// Stück hinab und verblassen; ohne Animation stehen sie gleich verblasst unten
function weinEinbruch(L, mitAnimation) {
  const gruppen = [['personen', instanz.punkte.nodes(), 0.85, 2], ['frauen', instanz.frauenPunkte.nodes(), 0.85, 1]];
  if (instanz.graue) gruppen.push(['graue', instanz.graue.nodes(), 0.9, 0.5]);
  clearTimeout(instanz.weinZeit);
  if (!mitAnimation) {
    gruppen.forEach(([name, knoten]) => knoten.forEach((k, i) => {
      if (!L.sinkt[name](i)) return;
      k.setAttribute('cy', (Number(k.getAttribute('cy')) + L.sinkWeg).toFixed(1));
      k.setAttribute('opacity', 0);
    }));
    return;
  }
  instanz.weinZeit = setTimeout(() => {
    if (instanz?.layout !== L) return;
    gruppen.forEach(([name, knoten, fuell, ebene]) => {
      const start = lageVon(name, knoten).map(([x, y]) => [x, y]);
      const faellt = knoten.map((k, i) => L.sinkt[name](i));
      starteBewegung(name, {
        gruppe: knoten[0].parentNode, knoten, start, ziel: start.map(([x, y], i) => (faellt[i] ? [x, y + L.sinkWeg] : [x, y])),
        ebene, farbeVon: BORDEAUX, farbeNach: BORDEAUX, fuell: knoten.map(() => fuell), radius: L.radius,
        verzoegerung: knoten.map((k, i) => (faellt[i] ? (((i * 7919) % 997) / 997) * 500 : 0)),
        dauer: WEIN_SINKEN, ease: d3.easeCubicIn, deckkraft: (e, i) => (faellt[i] ? 1 - e : 1)
      });
    });
  }, DAUER + STAFFELUNG + 400);
}

// Folie `reformation`: Der katholische Anteil ist unbekannt (tiefe Unsicherheit). Sind die Punkte angekommen, wandern
// sie Schritt für Schritt zwischen Kreuz und Kirche hin und her (KATHOLISCH_ANTEILE), bis man die Folie verlässt
function pendleKonfession(L) {
  clearTimeout(instanz.pendelZeit);
  if (!L.konfession || ohneAnimation()) return;
  let schritt = 1;
  const weiter = () => {
    if (instanz?.layout !== L) return;
    const Z = L.konfession(KATHOLISCH_ANTEILE[schritt % KATHOLISCH_ANTEILE.length]);
    schritt += 1;
    const gruppen = [['personen', instanz.punkte.nodes(), FARBE, 0.85, 2], ['frauen', instanz.frauenPunkte.nodes(), FRAUEN_FARBE, 0.85, 1]];
    if (instanz.graue && Z.graue) gruppen.push(['graue', instanz.graue.nodes(), RAHMEN, 0.45, 0.5]);
    gruppen.forEach(([name, knoten, farbe, fuell, ebene]) => {
      const start = lageVon(name, knoten).map(([x, y]) => [x, y]);
      starteBewegung(name, {
        gruppe: knoten[0].parentNode, knoten, start, ziel: knoten.map((k, i) => Z[name](i)), ebene, farbeVon: farbe, farbeNach: farbe,
        fuell: knoten.map(() => fuell), radius: L.radius,
        verzoegerung: knoten.map((k, i) => (((i * 7919) % 997) / 997) * 700), dauer: 1500, ease: d3.easeCubicInOut
      });
    });
    instanz.pendelZeit = setTimeout(weiter, PENDEL_TAKT);
  };
  instanz.pendelZeit = setTimeout(weiter, DAUER + STAFFELUNG + 1800);
}

// n Punkte als stilisierte Schrift in einem Rechteck (Buchkoordinaten): Zeilen aus Wörtern verschiedener Länge,
// Absätze mit Einzug und kürzerer letzter Zeile; der Punktabstand wird so gesucht, dass alle hineinpassen
function zeilenPunkte(n, r) {
  const versuch = (a) => {
    const punkte = [];
    let zeile = 0;
    for (let y = r.y + a / 2; y <= r.y + r.h; y += a * 2.7, zeile += 1) {
      const ende = r.x + r.b - (zeile % 6 === 5 ? r.b * 0.4 : 0);
      let x = r.x + (zeile % 6 === 0 ? a * 4 : 0);
      let wort = 0, laenge = 2 + ((zeile * 7 + 3) % 7);
      while (x <= ende) {
        punkte.push([x, y]);
        x += a;
        wort += 1;
        if (wort >= laenge) { x += a * 1.3; wort = 0; laenge = 2 + ((punkte.length * 13 + zeile * 5) % 7); }
      }
    }
    return punkte;
  };
  let klein = 0.05, gross = 30;
  for (let i = 0; i < 24; i += 1) { const m = (klein + gross) / 2; if (versuch(m).length >= n) klein = m; else gross = m; }
  return { punkte: versuch(klein).slice(0, n), abstand: klein };
}

// Folie `behauptung` (Fehlerhaftigkeit): ein aufgeschlagenes Buch aus allen Punkten - links das Schreiben des Rates von
// 1615 (voll), rechts das Ratsprotokoll vom 14. August 1607 mit nur wenigen Einträgen und einem leeren Rahmen, wo der
// behauptete Beschluss stehen müsste. Text links daneben.
function layoutBehauptung(b) {
  const { personen } = instanz;
  const h = instanz.basisHoehe;
  const mitGrauen = Boolean(instanz.graue);
  const { reihe, platz } = gemischteReihe(personen.length, mitGrauen);
  const N = reihe.length;
  const luecke = Math.max(14, b * 0.025);
  const breit = b >= TEXT_MIN_BREITE;
  const textB = breit ? Math.min(TEXT_BREITE * 0.85, b * 0.28) : 0;
  const x0 = breit ? Math.max(8, (b - 1180) / 2) : 8;
  const text = breit ? { x: x0, b: textB, top: 4 } : null;
  const vis = breit ? { x: x0 + textB + luecke * 2.5, y: 84, b: Math.min(b - 8, x0 + 1180) - (x0 + textB + luecke * 2.5), h: h - 92 } : { x: 8, y: 84, b: b - 16, h: h - 92 };
  const buch = inRechteck(BUCH, vis);
  // die Punkte als geschriebene Zeilen: links das ganze Schreiben, rechts zwei kurze Zeilen für die anderen Einträge
  const links = zeilenPunkte(N - BELEG.eintraege, { x: 14, y: 30, b: 74, h: 86 });
  const rechts = zeilenPunkte(BELEG.eintraege, { x: 113, y: 24, b: 50, h: 12 });
  const pos = (k) => buch.pos(k < N - BELEG.eintraege ? links.punkte[k] : rechts.punkte[(k - (N - BELEG.eintraege)) % rechts.punkte.length]);
  const [ox, oy] = buch.pos([0, 0]);
  return {
    ziel: (p) => pos(platz.m.get(p.nr)),
    frauZiel: (j) => pos(platz.f.get(j)),
    grauZiel: mitGrauen ? (j) => pos(platz.g.get(j)) : null,
    radius: Math.max(0.8, links.abstand * buch.skala * 0.4),
    text,
    beleg: { transform: `translate(${ox},${oy}) scale(${buch.skala})`, ort: buch.pos, skala: buch.skala }
  };
}

// Beiwerk in Teilen, je Station eine Auswahl (TEILE). Ein Teil, der neu dazukommt, wird eingeblendet (Münzen regnen),
// einer, der wegfällt, ausgeblendet; was bleibt, bleibt unverändert stehen.
function zeichneTeile(L, mitAnimation) {
  const { ebeneSpalten, ebeneMuenzen } = instanz;
  const schluessel = `${L.art}|${Math.round(L.b)}`;
  const schluesselVon = (teil) => {
    if (teil === 'muenzen') return `geld|${Math.round(L.b)}`; // Münzen bleiben bis zur Folie reformation
    if (teil === 'geschlecht') return `${L.station}|${Math.round(L.b)}`; // auf `frauen` ohne Zahlen neu
    return schluessel;
  };
  const jetzt = new Set(TEILE[L.station] || []);
  const bestehend = new Map();
  [ebeneSpalten, ebeneMuenzen].forEach((ebene) => ebene.selectAll(':scope > g[data-teil]').each(function () {
    bestehend.set(this.dataset.teil, d3.select(this));
  }));
  bestehend.forEach((g, teil) => {
    if (jetzt.has(teil) && g.attr('data-schluessel') === schluesselVon(teil) && teil !== 'legende') { // bleibt stehen
      AKTUALISIERER[teil]?.(g, L, mitAnimation);
      return;
    }
    bestehend.delete(teil);
    g.attr('data-teil', null);
    if (mitAnimation && !jetzt.has(teil)) {
      g.interrupt().transition().duration(350).attr('opacity', 0).remove();
      setTimeout(() => g.remove(), 700);
    } else {
      g.remove();
    }
  });
  jetzt.forEach((teil) => {
    if (bestehend.has(teil)) return;
    const neu = mitAnimation && !instanz.teileVorher?.has(teil);
    const ebene = teil === 'muenzen' ? ebeneMuenzen : ebeneSpalten;
    const g = ebene.append('g').attr('data-teil', teil).attr('data-schluessel', schluesselVon(teil));
    ZEICHNER[teil]?.(g, L, neu);
  });
  instanz.teileVorher = jetzt;
}

// Teile, die stehen bleiben, aber je Station anders aussehen
const AKTUALISIERER = {
  // Münzen: auf „schichten“ verborgen, ab „muenzen“ sichtbar; beim Vorwärtsschritt regnen sie, rückwärts blenden sie aus
  muenzen(g, L, mitAnimation) {
    // Folie weinzoll: die Kirche blendet aus (bleibt aber liegen, zurück blendet sie nur wieder ein). Ausgeblendet wird
    // über die Leinwand (Deckkraft je Münze) - eine SVG-Gruppe mit 4 443 Kreisen auszublenden kostete je Bild zu viel
    const weg = L.art === 'wein' || L.art === 'behauptung';
    // auf `reformation` ist die Kirche blass, damit man die katholischen Punkte darin sieht
    const deck = L.station === 'reformation' ? KIRCHE_BLASS : 1;
    const deckVorher = g.property('__deck') ?? 1;
    g.property('__deck', deck);
    if (weg || g.property('__weg')) {
      g.property('__weg', weg).style('pointer-events', weg ? 'none' : null);
      const knoten = (g.property('__muenzen') || []).map((m) => m.knoten);
      const lage = lageVon('muenzen', knoten).map(([x, y]) => [x, y]);
      if (mitAnimation && knoten.length) {
        starteBewegung('muenzen', {
          gruppe: g.property('__vgruppe'), knoten, start: lage, ziel: lage, ebene: 0, farbeVon: GOLD, farbeNach: GOLD, fuell: knoten.map(() => 1),
          radius: Number(knoten[0].getAttribute('r')) || 2, verzoegerung: knoten.map(() => (weg ? 0 : 300)),
          dauer: weg ? 500 : 700, ease: d3.easeCubicInOut, deckkraft: weg ? (e) => (1 - e) * deckVorher : (e) => e * deck
        });
      } else {
        beendeBewegung('muenzen', { schreiben: false });
        knoten.forEach((k) => k.setAttribute('opacity', weg ? 0 : deck));
      }
      return;
    }
    // Folien klerus/reformation: die Münzen fliegen zur Kirche bzw. von dort zurück in ihre Felder
    const inKirche = L.art === 'klerus';
    if (inKirche || g.property('__inKirche')) {
      if (inKirche !== Boolean(g.property('__inKirche'))) morpheMuenzen(g, L, inKirche, mitAnimation);
      if (deck !== deckVorher || inKirche) (g.property('__muenzen') || []).forEach((m) => m.knoten.setAttribute('opacity', inKirche ? deck : 1));
      return;
    }
    const sichtbar = L.station !== 'schichten';
    const warSichtbar = g.attr('display') !== 'none';
    if (sichtbar === warSichtbar) return;
    instanz.regenSchleife?.stop();
    if (sichtbar) {
      baueMuenzen(g); // falls zu schnell weitergeklickt wurde
      if (mitAnimation) regne(g);
      else g.attr('display', null);
      return;
    }
    if (!mitAnimation) { g.attr('display', 'none'); return; }
    g.interrupt().transition().duration(350).attr('opacity', 0)
      .on('end', () => g.attr('display', 'none').attr('opacity', null));
    setTimeout(() => { if (instanz?.station === 'schichten') g.attr('display', 'none').attr('opacity', null); }, 700);
  }
};

// Münzen zur Kirche (Folien klerus/reformation) bzw. zurück in die Münzfelder; Radius wird mit überblendet
function morpheMuenzen(g, L, inKirche, mitAnimation) {
  baueMuenzen(g);
  instanz.regenSchleife?.stop();
  g.property('__inKirche', inKirche);
  g.attr('display', null).attr('opacity', null);
  const liste = g.property('__muenzen');
  const knoten = liste.map((m) => m.knoten);
  const ziel = inKirche ? liste.map((m, i) => L.kirchenZiel(i)) : liste.map((m) => [m.x, m.y]);
  const zielRadien = inKirche ? liste.map(() => L.kirchenRadius) : liste.map((m) => m.r);
  if (!mitAnimation) {
    beendeBewegung('muenzen', { schreiben: false });
    knoten.forEach((k, i) => { k.setAttribute('cx', ziel[i][0].toFixed(1)); k.setAttribute('cy', ziel[i][1].toFixed(1)); k.setAttribute('r', zielRadien[i].toFixed(2)); k.setAttribute('opacity', 1); });
    return;
  }
  starteBewegung('muenzen', {
    gruppe: g.property('__vgruppe'), knoten, start: lageVon('muenzen', knoten).map(([x, y]) => [x, y]), ziel, ebene: 0,
    farbeVon: GOLD, farbeNach: GOLD, fuell: knoten.map(() => 1),
    radius: Number(knoten[0].getAttribute('r')) || 3, radiusNach: zielRadien[0], zielRadien,
    verzoegerung: liste.map((m, i) => (((i * 7919) % 997) / 997) * 450), dauer: DAUER + 200, ease: d3.easeCubicInOut
  });
}

// Münzen eines Münzen-Teils einmal anlegen; je Münze Knoten, Zielhöhe und Reihe für regne()
function baueMuenzen(g) {
  if (g.property('__muenzen')) return;
  const L = g.property('__layout');
  const { muenzeGulden } = instanz;
  const liste = [];
  // virtuelle Münzen (siehe VPunkt), gezeichnet auf der Leinwand; Sichtbarkeit und Deckkraft des <g> gelten mit
  const vg = vGruppe('muenzen', { zeige(k) { zeigeTooltip(k.titel, k, instanz.container); } });
  vg.dom = g.node();
  L.spalten.filter((s) => !s.grau).forEach((s) => {
    const anzahl = Math.ceil(s.muenzen - 1e-9);
    const rest = s.muenzen - Math.floor(s.muenzen);
    const titel = `${s.name}: ${zahl(Math.round(s.summe))} Gulden, `
      + `${s.muenzen.toLocaleString('de-AT', { maximumFractionDigits: 1 })} Münzen zu ${zahl(muenzeGulden)} Gulden`;
    for (let j = 0; j < anzahl; j += 1) {
      const [x, y] = s.muenzPos(j);
      const r = L.muenzRadius * (j === anzahl - 1 && rest > 0 ? Math.sqrt(rest) : 1);
      const k = new VPunkt(vg);
      Object.assign(k.a, { cx: x.toFixed(1), cy: y.toFixed(1), r: String(r), fill: GOLD, stroke: GOLD_RAND, 'stroke-width': '0.6' });
      k.titel = titel;
      vg.knoten.push(k);
      liste.push({ knoten: k, x, y, r, reihe: Math.floor(j / s.mProZeile), reihen: Math.max(1, s.muenzReihen), j });
    }
  });
  g.property('__muenzen', liste).property('__vgruppe', vg);
  instanz.muenzGruppen.add(vg);
  neuZeichnen();
}

// Münzregen (2026-10-28 überarbeitet, „ruckelt am Anfang“): eine einzige Schleife (d3.timer) statt einer Transition je
// Münze, die Münzen sind schon angelegt; der Regen beginnt erst nach dem Scrollen zu den Münzfeldern (REGEN_START).
// Jede Münze fällt eine sichtbare Strecke und landet mit kleinem Aufprall, die untersten Reihen zuerst.
function regne(g) {
  instanz.regenSchleife?.stop();
  const liste = g.property('__muenzen') || [];
  const fallhoehe = Math.min(320, Math.max(160, window.innerHeight * 0.4));
  const daten = liste.map((m) => ({
    ...m,
    start: m.y - fallhoehe - ((m.j * 31) % 60),
    verzoegerung: (1 - m.reihe / m.reihen) * REGEN_DAUER + ((m.j * 7919) % 101) * 5,
    dauer: 800 + ((m.j * 104729) % 37) * 10,
    zustand: 0 // 0 wartet, 1 fällt, 2 gelandet
  }));
  daten.forEach((m) => { m.knoten.setAttribute('cy', m.start.toFixed(1)); m.knoten.setAttribute('opacity', '0'); });
  g.attr('display', null).attr('opacity', null);
  const ende = REGEN_DAUER + 1300;
  const schleife = d3.timer((vergangen) => {
    for (let i = 0; i < daten.length; i += 1) {
      const m = daten[i];
      if (m.zustand === 2) continue;
      const t = (vergangen - m.verzoegerung) / m.dauer;
      if (t <= 0) continue;
      if (m.zustand === 0) { m.knoten.setAttribute('opacity', '1'); m.zustand = 1; }
      if (t >= 1) { m.knoten.setAttribute('cy', m.y.toFixed(1)); m.zustand = 2; continue; }
      m.knoten.setAttribute('cy', (m.start + (m.y - m.start) * d3.easeBounceOut(t)).toFixed(1));
    }
    if (vergangen >= ende) schleife.stop();
  }, REGEN_START);
  instanz.regenSchleife = schleife;
  setTimeout(() => { // ruhende Tabs: Endzustand sicher
    if (instanz?.regenSchleife !== schleife) return;
    schleife.stop();
    daten.forEach((m) => { m.knoten.setAttribute('cy', m.y.toFixed(1)); m.knoten.setAttribute('opacity', '1'); });
  }, REGEN_START + ende + 500);
}

// sanft einblenden, wenn neu (mit Sicherung für ruhende Tabs)
function blendeEin(g, neu, verzoegerung = DAUER * 0.55) {
  if (!neu) return;
  g.attr('opacity', 0).transition().delay(verzoegerung).duration(700).attr('opacity', 1);
  setTimeout(() => g.attr('opacity', 1), verzoegerung + 900);
}

const ZEICHNER = {
  // Folie `reformation`: Fragen statt Zahlen über Kreuz und Kirche
  pendel(g, L, neu) {
    if (L.kreuzMitte) g.append('text').attr('class', 'bgi-spaltenkopf klein').attr('x', L.kreuzMitte[0]).attr('y', L.kreuzMitte[1] - 14).text('evangelisch: wie viele?');
    if (L.kircheOben) g.append('text').attr('class', 'bgi-spaltenkopf klein').attr('x', L.kircheOben[0]).attr('y', L.kircheOben[1] - 14).text('katholisch: wie viele?');
    blendeEin(g, neu);
  },

  // Folie `behauptung`: Buch mit Seitentiteln, leerer Rahmen im Protokoll
  beleg(g, L, neu) {
    const B = L.beleg;
    if (!B) return;
    [BUCH.umriss, BUCH.ruecken].forEach((d) => g.append('path').attr('d', d).attr('transform', B.transform)
      .attr('fill', 'none').attr('stroke', RAHMEN).attr('stroke-width', 1.2).attr('vector-effect', 'non-scaling-stroke'));
    // Seitentitel (fett) und Unterzeile, je auf die Breite einer Seite umbrochen, von unten nach oben über der Seite
    const [lx, ly] = B.ort([51, 0]);
    const [rx] = B.ort([149, 0]);
    const zeichen = Math.max(14, Math.floor((86 * B.skala) / 7));
    [[lx, 'Schreiben des Rates, 1615', '„am 14. August 1607 beschlossen“'], [rx, 'Ratsprotokoll, 14. August 1607', 'andere Einträge des Tages']]
      .forEach(([x, titel, unter]) => {
        const zeilen = [...umbrechen(titel, zeichen).map((t) => ['bgi-wert', t]), ...umbrechen(unter, zeichen + 4).map((t) => ['bgi-wert-klein', t])];
        zeilen.forEach(([klasse, t], k) => g.append('text').attr('class', klasse).attr('x', x).attr('y', ly - 8 - (zeilen.length - 1 - k) * 16).text(t));
      });
    const [x, y, w, hh] = BELEG.rahmen;
    const [ax, ay] = B.ort([x, y]);
    g.append('rect').attr('x', ax).attr('y', ay).attr('width', w * B.skala).attr('height', hh * B.skala).attr('rx', 6)
      .attr('fill', 'none').attr('stroke', VERLUST_ROT).attr('stroke-width', 1.5).attr('stroke-dasharray', '6 5');
    umbrechen('kein Eintrag zur Pflicht des Beichtzettels', Math.max(12, Math.floor((w * B.skala) / 7))).forEach((zeile, k, alle) => g.append('text')
      .attr('class', 'bgi-wert').style('fill', VERLUST_ROT).attr('x', ax + (w * B.skala) / 2).attr('y', ay + (hh * B.skala) / 2 + (k - (alle.length - 1) / 2) * 17 + 4).text(zeile));
    blendeEin(g, neu);
  },

  // Einband und Rücken des aufgeschlagenen Buchs (hinter den Punkten)
  // Folie `schreibweisen`: Beispiele mit allen Schreibweisen, Linie zum Punkt
  schreibbeispiele(g, L, neu) {
    (L.beispiele || []).forEach((e) => {
      g.append('line').attr('x1', e.punkt[0]).attr('y1', e.punkt[1]).attr('x2', e.x - 6).attr('y2', e.y - 4)
        .attr('stroke', HERVOR).attr('stroke-width', 1).attr('stroke-dasharray', '3 3');
      g.append('circle').attr('cx', e.punkt[0]).attr('cy', e.punkt[1]).attr('r', L.radius + 2.5)
        .attr('fill', 'none').attr('stroke', HERVOR).attr('stroke-width', 1.5);
      g.append('text').attr('class', 'bgi-wert').style('text-anchor', 'start').style('fill', HERVOR).attr('x', e.x).attr('y', e.y).text(e.text);
    });
    blendeEin(g, neu, 500);
  },

  buch(g, L, neu) {
    if (!L.buch) return;
    [BUCH.umriss, BUCH.ruecken].forEach((d) => g.append('path').attr('d', d).attr('transform', L.buch.transform)
      .attr('fill', 'none').attr('stroke', RAHMEN).attr('stroke-width', 1.2).attr('vector-effect', 'non-scaling-stroke'));
    blendeEin(g, neu);
  },

  // Folie `weinzoll`: gestrichelter Umriss und Zahl des ersten Jahres; Linie und Zahl des zweiten Jahres erscheinen,
  // wenn die oberen Punkte gesunken sind
  wein(g, L, neu) {
    const W = instanz.wein, F = L.flasche;
    g.append('path').attr('d', FLASCHE.flaechen[0]).attr('transform', `translate(${F.ox},${F.oy}) scale(${F.skala})`)
      .attr('fill', 'none').attr('stroke', RAHMEN).attr('stroke-width', 1.4).attr('vector-effect', 'non-scaling-stroke');
    g.append('text').attr('class', 'bgi-spaltenkopf klein').attr('x', F.mitte).attr('y', F.oben - 32).text(`${W.vorher.jahr} · ${zahl(W.vorher.eimer)} Eimer`);
    g.append('text').attr('class', 'bgi-spaltenzahl').attr('x', F.mitte).attr('y', F.oben - 13).text('Weinausfuhr über die Passauer Maut');
    const spaet = g.append('g');
    spaet.append('line').attr('x1', F.links - 4).attr('x2', F.rechts + 12).attr('y1', F.pegel).attr('y2', F.pegel)
      .attr('stroke', BORDEAUX).attr('stroke-width', 1.5);
    spaet.append('text').attr('class', 'bgi-spaltenkopf klein').style('text-anchor', 'start').attr('x', F.rechts + 18).attr('y', F.pegel + 6)
      .text(`${W.nachher.jahr} · ${zahl(W.nachher.eimer)} Eimer`);
    spaet.append('text').attr('class', 'bgi-spaltenzahl').style('text-anchor', 'start').attr('x', F.rechts + 18).attr('y', F.pegel + 26)
      .text(`${prozent((W.nachher.eimer / W.vorher.eimer) * 100)} % von ${W.vorher.jahr}`);
    blendeEin(g, neu);
    blendeEin(spaet, neu, DAUER + STAFFELUNG + 400 + WEIN_SINKEN * 0.6);
  },

  // Folie `berufe`: Überschrift und Zahl über dem Diagramm, Name und Zahl je Balken, im Tor die Beschriftung des
  // stehenden Teils (über dem linken Rundturm)
  sektoren(g, L, neu) {
    const B = instanz.berufe;
    const anteil = (wert) => `${prozent((wert / instanz.personen.length) * 100)} %`;
    g.append('text').attr('class', 'bgi-spaltenkopf klein').style('text-anchor', 'start').attr('x', L.x0).attr('y', 26).text('Mit Berufsangabe');
    g.append('text').attr('class', 'bgi-spaltenzahl').style('text-anchor', 'start').attr('x', L.x0).attr('y', 48)
      .text(`${zahl(B.mit)} Personen · ${anteil(B.mit)}`);
    L.balken.forEach(({ g: gruppe, oben, ende, mitte }) => {
      g.append('text').attr('class', 'bgi-wert-klein').style('text-anchor', 'start').attr('x', L.x0).attr('y', oben + 13).text(gruppe.name);
      g.append('text').attr('class', 'bgi-wert').style('text-anchor', 'start').attr('x', ende + 6).attr('y', mitte + 4).text(zahl(gruppe.anzahl));
    });
    const [mx, my] = L.buchOrt([51, 4]); // über der linken Seite
    [['bgi-spaltenkopf klein', 'Ohne Berufsangabe', -26], ['bgi-spaltenzahl', `${zahl(B.ohne)} Personen · ${anteil(B.ohne)}`, -8]]
      .forEach(([klasse, text, dy]) => g.append('text').attr('class', klasse).attr('x', mx).attr('y', my + dy).text(text));
    blendeEin(g, neu);
  },

  // Überschriften und Zahlen der beiden Spalten (bleiben auf der Folie `frauen` stehen)
  geschlecht(g, L, neu) {
    // über den Buchseiten; die Zahlen nur auf `geschlecht` (auf `frauen` wären sie irreführend)
    [[L.seiten.links, 'Männer', L.maenner.length], [L.seiten.rechts, 'Frauen', L.frauen.length]].forEach(([[x, y], titel, anzahl]) => {
      g.append('text').attr('class', 'bgi-spaltenkopf').attr('x', x).attr('y', y - (L.station === 'geschlecht' ? 32 : 12)).text(titel);
      if (L.station === 'geschlecht') g.append('text').attr('class', 'bgi-spaltenzahl').attr('x', x).attr('y', y - 10).text(zahl(anzahl));
    });
    blendeEin(g, neu);
  },

  // leerer Rahmen der Frauen-Spalte; blendet aus, wenn sie sich auf der Folie `frauen` füllt
  leeresFeld(g, L, neu) {
    if (L.frauen.length === 0) {
      g.append('path').attr('d', BUCH.rechts).attr('transform', L.buch.transform).attr('fill', 'none').attr('stroke', RAHMEN)
        .attr('stroke-width', 1.4).attr('stroke-dasharray', '6 6').attr('vector-effect', 'non-scaling-stroke');
      g.append('text').attr('class', 'bgi-leer').attr('x', L.seiten.leerMitte[0]).attr('y', L.seiten.leerMitte[1]).text('keine Einträge');
    }
    blendeEin(g, neu);
  },

  // Namen und Anteile über den drei Bürgersäulen, Grundlinie
  koepfe(g, L, neu) {
    const buerger = L.spalten.filter((s) => !s.grau);
    g.append('line').attr('x1', buerger[0].x).attr('x2', L.b).attr('y1', L.grundlinie + 0.5).attr('y2', L.grundlinie + 0.5)
      .attr('stroke', '#c3c2b7').attr('stroke-width', 1);
    buerger.forEach((s) => zeichneSaeulenkopf(g, s, `${prozent(s.anteil)} % · ${zahl(s.anzahl)}`));
    blendeEin(g, neu);
  },

  // Gesamtvermögen, Anteil, Mittelwert und Spanne unter der Grundlinie
  werte(g, L, neu) {
    L.spalten.filter((s) => !s.grau).forEach((s) => {
      const mitte = s.x + s.b / 2;
      [`${zahl(Math.round(s.summe))} fl`, s.eng ? `${prozent(s.vermoegensanteil)} %` : `${prozent(s.vermoegensanteil)} % des Vermögens`,
        `Ø ${zahl(s.mittel)} fl`, s.eng ? `${zahl(s.von)}–${zahl(s.bis)}` : `(${zahl(s.von)}–${zahl(s.bis)} fl)`]
        .forEach((t, z) => g.append('text').attr('class', z === 0 ? 'bgi-wert' : 'bgi-wert-klein')
          .attr('x', mitte).attr('y', L.grundlinie + 20 + z * 16).text(t));
    });
    blendeEin(g, neu, 300);
  },

  // Münzen: eine je muenzeGulden, die letzte angebrochene flächengleich kleiner. Neu: sie regnen herab, sobald die
  // Seite zu den Münzfeldern gescrollt hat (zeigeMuenzfelder()), fallen eine sichtbare Strecke über den Säulen (hinter
  // den Punkten) und landen mit kleinem Aufprall; die untersten Reihen zuerst, sodass sich die Felder von unten füllen
  // Auf „schichten“ verborgen und erst angelegt, wenn die Punkte angekommen sind (sonst stockt der Anfang des
  // Morphens); spätestens beim Weiterklicken legt AKTUALISIERER.muenzen sie an.
  muenzen(g, L, neu) {
    if (['klerus', 'wein', 'behauptung'].includes(L.art)) { // auf `weinzoll`/`behauptung` (z. B. nach einer Breitenänderung) ausgeblendet
      g.property('__layout', berechneLayout('muenzen'));
      morpheMuenzen(g, L.art === 'klerus' ? L : berechneLayout('reformation'), true, false);
      g.property('__deck', L.station === 'reformation' ? KIRCHE_BLASS : 1);
      if (L.station === 'reformation') (g.property('__muenzen') || []).forEach((m) => m.knoten.setAttribute('opacity', KIRCHE_BLASS));
      if (L.art !== 'klerus') {
        g.property('__weg', true).style('pointer-events', 'none');
        (g.property('__muenzen') || []).forEach((m) => m.knoten.setAttribute('opacity', 0));
      }
      return;
    }
    g.property('__layout', L);
    if (L.station === 'schichten') {
      g.attr('display', 'none');
      clearTimeout(instanz.muenzAufbau);
      instanz.muenzAufbau = setTimeout(() => { if (g.node().isConnected) baueMuenzen(g); }, DAUER + STAFFELUNG + 200);
      return;
    }
    baueMuenzen(g);
    if (neu) regne(g);
  },

  // graue Säule: Kopf, „kein erfasster Besitz“, leeres Feld statt Münzen, Beschreibung
  grau(g, L, neu) {
    const s = L.spalten[0];
    const mitte = s.x + s.b / 2;
    zeichneSaeulenkopf(g, s, s.eng ? 'mind. so viele' : 'mindestens so viele');
    (s.eng ? ['kein erfasster', 'Besitz'] : ['kein erfasster Besitz']).forEach((t, z) => g.append('text')
      .attr('class', z === 0 ? 'bgi-wert' : 'bgi-wert-klein').attr('x', mitte).attr('y', L.grundlinie + 20 + z * 16).text(t));
    g.append('line').attr('x1', s.x).attr('x2', s.x + s.b).attr('y1', L.grundlinie + 0.5).attr('y2', L.grundlinie + 0.5)
      .attr('stroke', '#c3c2b7').attr('stroke-width', 1);
    g.append('rect').attr('x', s.x).attr('y', L.muenzStart).attr('width', s.b).attr('height', 44).attr('rx', 8)
      .attr('fill', 'none').attr('stroke', RAHMEN).attr('stroke-width', 1.2).attr('stroke-dasharray', '5 5');
    s.beschreibungZeilen.forEach((zeile, z) => g.append('text').attr('class', 'bgi-wert-klein')
      .attr('x', mitte).attr('y', L.muenzStart + 64 + z * 15).text(zeile));
    blendeEin(g, neu, 1600);
  },

  // Legende: Einträge je nach Station (ohne Einblenden, sie wird bei jedem Wechsel neu gesetzt)
  legende(g, L) {
    const lg = g.attr('class', 'bgi-legende').attr('transform', `translate(${L.spalten[1].x + 4},${L.legendeY})`);
    const eintraege = [['punkt', '1 Punkt = 1 Haushalt der Bürgerschaft (Anteil)']];
    if (L.station !== 'schichten') eintraege.push(['muenze', `1 Münze = ${zahl(instanz.muenzeGulden)} Gulden`]);
    if (L.station === 'vermoegenslos') eintraege.push(['grau', '1 Punkt = Einwohner ohne Bürgerrecht']);
    eintraege.forEach(([art, text], z) => {
      const y = z * 18;
      const zeichen = lg.append('circle').attr('cx', 6).attr('cy', y);
      if (art === 'punkt') zeichen.attr('r', L.radius + 0.4).attr('fill', HAUSHALT_FARBE).attr('fill-opacity', 0.85);
      if (art === 'muenze') zeichen.attr('r', L.muenzRadius).attr('fill', GOLD).attr('stroke', GOLD_RAND).attr('stroke-width', 0.6);
      if (art === 'grau') zeichen.attr('r', L.radius + 0.4).attr('class', 'bgi-grau');
      lg.append('text').attr('x', 18).attr('y', y + 4).text(text);
    });
  }
};

// Name (ggf. umbrochen) und Zahlzeile über einer Säule
function zeichneSaeulenkopf(g, s, zahlzeile) {
  const mitte = s.x + s.b / 2;
  const kopf = g.append('text').attr('class', `bgi-spaltenkopf klein${s.eng ? ' eng' : ''}`).attr('x', mitte).attr('y', s.oben - 30);
  s.kopfZeilen.forEach((teil, z) => kopf.append('tspan').attr('x', mitte)
    .attr('dy', z ? '1.05em' : `${-(s.kopfZeilen.length - 1) * 1.05}em`).text(teil));
  g.append('text').attr('class', `bgi-spaltenzahl${s.eng ? ' eng' : ''}`).attr('x', mitte).attr('y', s.oben - 12).text(zahlzeile);
}

// Quelleneinträge einer Person: Bürgerbuch direkt (als Neubürger oder Bürge), dazu die Nennungen aus der
// Personenliste (Urkunden, Inventare, weitere Bürgerbuch-Einträge)
function oeffnePerson(p) {
  const q = instanz.quellen;
  const record = q.personNachId.get(p.id);
  const buergerbuch = new Map(q.buergerbuchJePerson.get(p.id)?.map((r) => [r.id, r]) || []);
  if (record) ermittleBuergerbuchFuerPerson(record, q.buergerbuchNachId).forEach((r) => buergerbuch.set(r.id, r));
  instanz.auswahl = p.id;
  markiereAuswahl();
  zeigePersonenNennungen(instanz.sidebar, p.name,
    record ? ermittleUrkundenFuerPerson(record, q.urkundenNachSignatur) : [],
    [...buergerbuch.values()],
    record ? ermittleInventareFuerPerson(record, q.inventareNachId) : [],
    { personenLink: record ? baueDatensatzLink('person', p.id) : null });
}

// Erklärung zwischen bzw. neben den Säulen (breit) oder darunter (schmal); sichtbar, wenn die Station Text hat
function platziereErklaerung() {
  const { erklaerung, buehne, layout: L } = instanz;
  const sichtbar = absaetzeVon(instanz.stationIndex).length > 0;
  if (L.text && erklaerung.parentNode !== buehne) buehne.appendChild(erklaerung);
  if (!L.text && erklaerung.previousSibling !== buehne) buehne.after(erklaerung);
  erklaerung.classList.toggle('mittig', Boolean(L.text));
  erklaerung.style.left = L.text ? `${L.text.x}px` : '';
  erklaerung.style.width = L.text ? `${L.text.b}px` : '';
  erklaerung.style.top = L.text ? `${L.text.top}px` : '';
  erklaerung.classList.toggle('sichtbar', sichtbar);
  erklaerung.inert = !sichtbar;
}

// Text der neuen Station setzen: kommt er nur dazu (vorwärts auf eine Station mit text_anhaengen), werden nur die
// neuen Absätze angehängt und eingeblendet; sonst wird der ganze Text getauscht und neu eingeblendet
function setzeText(vorherIndex) {
  const { erklaerung, stationIndex } = instanz;
  const station = instanz.stationen[stationIndex];
  if (station.anhaengen && vorherIndex === stationIndex - 1 && erklaerung.classList.contains('sichtbar')) {
    erklaerung.insertAdjacentHTML('beforeend', station.absaetze.map((a) => absatzHtml(a, 'neu')).join(''));
    return;
  }
  erklaerung.classList.remove('sichtbar');
  void erklaerung.offsetWidth;
  erklaerung.innerHTML = absaetzeVon(stationIndex).map((a) => absatzHtml(a)).join('');
}

// Bühnenhöhe je Station: Säulen und Münzen sowie der Text daneben bestimmen sie, mindestens die Ausgangshöhe
function passeHoeheAn() {
  const { buehne, erklaerung, basisHoehe } = instanz;
  const L = berechneLayout();
  let hoehe = Math.max(basisHoehe, L.benoetigt || 0);
  if (L.text && absaetzeVon(instanz.stationIndex).length) {
    erklaerung.classList.add('mittig');
    erklaerung.style.width = `${L.text.b}px`;
    hoehe = Math.max(hoehe, L.text.top + erklaerung.offsetHeight + 12);
  }
  buehne.style.height = `${hoehe}px`;
  void buehne.clientWidth; // Layout jetzt erzwingen: ein neu erscheinender Scrollbalken ändert die Breite vor dem Zeichnen
}

// Vor dem Münzregen die Seite so weit scrollen, dass die Münzfelder in der unteren Bildschirmhälfte sichtbar sind
// (sonst fiele der Regen auf vielen Bildschirmen unterhalb des sichtbaren Bereichs)
function zeigeMuenzfelder() {
  const L = instanz.layout;
  if (!L.muenzStart) return;
  const svgOben = instanz.svg.node().getBoundingClientRect().top + window.scrollY;
  const ziel = svgOben + L.muenzStart - window.innerHeight * 0.45;
  if (ziel > window.scrollY + 20) window.scrollTo({ top: ziel, behavior: ohneAnimation() ? 'auto' : 'smooth' });
}

function zeigePersonMitId(id) {
  if (id.startsWith('bestand:')) {
    const it = instanz.archiv?.items.find((x) => alsText(x.record.kuerzel).trim() === id.slice('bestand:'.length));
    if (it) oeffneBestand(it);
    return;
  }
  const p = instanz.personen.find((x) => x.id === id);
  if (p) oeffnePerson(p);
}

function schliessePerson() {
  if (!instanz?.auswahl) return;
  instanz.auswahl = null;
  markiereAuswahl();
  schliesseSidebar(instanz.sidebar, instanz.weiterKnopf.hidden ? instanz.zurueckKnopf : instanz.weiterKnopf);
}

function markiereAuswahl() {
  const { punkte, auswahl } = instanz;
  punkte.style('stroke', (p) => (p.id === auswahl ? AUSWAHL : null)).style('stroke-width', (p) => (p.id === auswahl ? '2px' : null));
  punkte.filter((p) => p.id === auswahl).raise();
}

function stationsBeschriftung() {
  const { station, layout: L, schichten, personen } = instanz;
  if (ARCHIV_STATIONEN.includes(station) && instanz.archiv) {
    const A = instanz.archiv;
    if (station === 'archiv') return `${zahl(A.items.length)} Bestände des Stadtarchivs Krems als Punkte, zusammen das Steiner Tor`;
    if (station === 'kategorien') return `Bestände nach Kategorie: ${A.kategorien.map((k) => `${k.name} ${zahl(k.anzahl)}`).join(', ')}`;
    if (station === 'zeitraeume') return `Zeitraum jedes Bestands als Balken; ${zahl(A.ohneZeit)} Bestände ohne Zeitangabe`;
    if (station === 'urkunden' && A.urk >= 0) return `Die ${zahl(A.items[A.urk].jahre.length)} Urkunden einzeln, in Säulen je Jahrzehnt`;
    if (VERLUST_STATIONEN.includes(station)) return 'Steiner Tor aus den Beständen, dazwischen Ringe für verlorene Bestände; ein Teil der Ringe fällt heraus';
    if (station === 'orte') return 'Karte: die Urkunden an den Orten, die sie nennen, entlang der Donau und weit darüber hinaus';
    if (station === 'verarbeitung') return 'Karte: unscharfe Höfe um unsicher zugeordnete Orte, unten die Urkunden, deren Orte keine Koordinaten haben';
    if (station === 'mitmachen') return 'Steiner Tor mit Lücken; goldene Punkte für Beiträge füllen sie nach und nach';
    return 'Steiner Tor aus den Beständen; der Punkt des Bürgerbuchs leuchtet und öffnet das Bürgerbuch';
  }
  if (station === 'berufe' && instanz.berufe) {
    const B = instanz.berufe;
    return `Personen im Bürgerbuch nach Wirtschaftssektor: ${zahl(B.mit)} mit Berufsangabe als Balken, `
      + `${B.gruppen.map((g) => `${g.name} ${zahl(g.anzahl)}`).join(', ')}; ${zahl(B.ohne)} ohne Berufsangabe bleiben im Tor`;
  }
  if (station === 'schreibweisen') return `${zahl(personen.filter((p) => p.schreibweisen.length > 1).length)} Personen im Buch hervorgehoben, die in mehreren Schreibweisen überliefert sind`;
  if (station === 'geschlecht') return `${zahl(L.maenner.length)} Männer und ${zahl(L.frauen.length)} Frauen im Bürgerbuch`;
  if (station === 'klerus') return 'Stadt und Kirche: Bürger, Frauen sowie Inwohner und Hilfskräfte bilden links wieder das Steiner Tor, rechts neben dem Text eine kleine Kirche mit Kreuz aus den Münzen';
  if (station === 'weinzoll' && instanz.wein) {
    const W = instanz.wein;
    return `Weinausfuhr über die Passauer Maut: ${zahl(W.vorher.eimer)} Eimer ${W.vorher.jahr}, ${zahl(W.nachher.eimer)} Eimer ${W.nachher.jahr}. `
      + `Alle Punkte füllen bordeauxrot eine Weinflasche; die oberen ${prozent(100 - (W.nachher.eimer / W.vorher.eimer) * 100)} Prozent sinken hinab und verblassen, die Flasche leert sich`;
  }
  if (station === 'reformation') return 'Kreuz und kleine Kirche: Die Punkte wandern immer wieder zwischen beiden hin und her, weil niemand weiß, wie viele katholisch waren';
  if (station === 'behauptung') return 'Aufgeschlagenes Buch: links das Schreiben des Rates von 1615, rechts das Ratsprotokoll vom 14. August 1607 mit einem leeren Rahmen, wo der Beschluss stehen müsste';
  if (station === 'frauen') return `${zahl(L.maenner.length)} Männer im Bürgerbuch, daneben ebenso viele symbolische Punkte für die Frauen, die es nicht nennt`;
  if (VERMOEGEN_STATIONEN.includes(station) && schichten) {
    const teile = schichten.buerger.map((s) => (station === 'schichten'
      ? `${s.name}: ${prozent(s.anteil)} Prozent der Haushalte`
      : `${s.name}: ${prozent(s.anteil)} Prozent der Haushalte, ${prozent(s.vermoegensanteil)} Prozent des Vermögens`));
    return `Bürgerschaft nach Schichten. ${teile.join('. ')}.${station === 'vermoegenslos' ? ` Dazu mindestens ebenso viele ${schichten.ohne?.name || 'Einwohner ohne Bürgerrecht'}, ohne erfassten Besitz.` : ''}`;
  }
  return `${zahl(personen.length)} Personen im Bürgerbuch, als aufgeschlagenes Buch`;
}

// Folien: Weiter (hüpfender Pfeil; der Name der nächsten Folie steht in aria-label und title) und Zurück
function aktualisiereSteuerung() {
  const { stationen, stationIndex, weiterKnopf, zurueckKnopf } = instanz;
  if (instanz.foliennummer) instanz.foliennummer.textContent = DIAGNOSE ? `Folie ${stationIndex + 1} / ${stationen.length}` : '';
  const naechste = stationen[stationIndex + 1];
  weiterKnopf.hidden = !naechste || instanz.station === 'klick'; // auf `klick` führt der Klick auf das Bürgerbuch weiter
  if (naechste) {
    weiterKnopf.setAttribute('aria-label', `Weiter: ${naechste.knopf}`);
    weiterKnopf.title = naechste.knopf;
  }
  zurueckKnopf.hidden = stationIndex === 0;
  const vorige = stationen[stationIndex - 1];
  zurueckKnopf.setAttribute('aria-label', vorige ? `Zurück: ${vorige.knopf || 'Anfang'}` : 'Zurück');
  setzeKopf();
}

// Kopfzeilen: auf den Archiv-Folien das Archiv, sonst das Bürgerbuch
function setzeKopf() {
  const { kopf, archiv, station } = instanz;
  const imArchiv = ARCHIV_STATIONEN.includes(station) && archiv;
  // je Folie aus der Stationsdatei (Spalten `ueberzeile`, `titel`, Platzhalter wie im Text); sonst wie bisher
  const s = instanz.stationen[instanz.stationIndex];
  const mitWerten = (t) => t.replace(/\{(\w+)(?::([\w-]+))?\}/g, (treffer, name, id) => platzhalterWert(name, id) ?? treffer);
  kopf.querySelector('.bgi-ueberzeile').textContent = s?.ueberzeile ? mitWerten(s.ueberzeile) : (imArchiv ? 'Stadtarchiv Krems' : instanz.kopfUeberzeile);
  kopf.querySelector('.bgi-zahl').textContent = s?.titel ? mitWerten(s.titel)
    : (imArchiv ? `${zahl(archiv.items.length)} Bestände` : `${zahl(instanz.personen.length)} Personen`);
  instanz.unterzeile.textContent = mitWerten(s?.unterzeile || STANDARD_UNTERZEILE);
}

function geheZu(index) {
  if (!instanz || index < 0 || index >= instanz.stationen.length || index === instanz.stationIndex) return;
  const fokusWar = document.activeElement;
  schliessePerson();
  const vorher = instanz.stationIndex;
  instanz.stationIndex = index;
  instanz.station = instanz.stationen[index].id;
  instanz.unterzeile.textContent = instanz.stationen[index].unterzeile || STANDARD_UNTERZEILE;
  setzeText(vorher);
  passeHoeheAn();
  const zeitVor = performance.now();
  zeichne(true);
  const dauerKlick = performance.now() - zeitVor;
  if (DIAGNOSE && dauerKlick > 150) console.info(`[Bürgerinnen? Diagnose] Folie ${index + 1} (${instanz.station}): Aufbau beim Klick ${Math.round(dauerKlick)} ms`);
  instanz.svg.attr('aria-label', stationsBeschriftung());
  if (instanz.station === 'muenzen' && index > vorher) zeigeMuenzfelder();
  if (instanz.layout.art === 'klerus') { // Bühne wieder ganz zeigen (die Münzfelder lagen weiter unten)
    const oben = instanz.svg.node().getBoundingClientRect().top + window.scrollY - 90;
    if (window.scrollY > oben + 20) window.scrollTo({ top: Math.max(0, oben), behavior: ohneAnimation() ? 'auto' : 'smooth' });
  }
  aktualisiereSteuerung();
  // verschwindet der gedrückte Knopf (erste/letzte Folie), bleibt der Fokus auf dem anderen
  if (fokusWar === instanz.weiterKnopf && instanz.weiterKnopf.hidden) instanz.zurueckKnopf.focus();
  if (fokusWar === instanz.zurueckKnopf && instanz.zurueckKnopf.hidden) instanz.weiterKnopf.focus();
}

// Daten der Stationen nachladen; bis dahin ist die Bühne verborgen

// Archivpunkte anlegen: ein Rechteck je Bestand (Klick: Sidebar des Bestands; auf `klick` öffnet das Bürgerbuch die
// nächste Folie), dazu die Urkunden als kleine Kreise und ein pulsierender Ring
function baueArchivpunkte() {
  const A = instanz.archiv;
  const { archivEbene, container } = instanz;
  // Ringe für verlorene Bestände (unter den Beständen) und goldene Punkte für Beiträge
  instanz.archivGeister = archivEbene.append('g').style('pointer-events', 'none').selectAll('circle')
    .data(d3.range(A.verloren)).join('circle').attr('class', 'bgi-geist').attr('opacity', 0);
  instanz.geisterStand = -1;
  instanz.archivUrkunden = archivEbene.append('g').selectAll('circle')
    .data(A.urk >= 0 ? A.items[A.urk].urkundenListe : []).join('circle')
    .attr('class', 'bgi-archiv').attr('fill', A.urk >= 0 ? A.items[A.urk].farbe : FARBE).attr('opacity', 0).style('pointer-events', 'none')
    .on('mouseenter', function (event, u) { zeigeTooltip(`${alsText(u.record.signatur)}\n${alsText(u.record.datum) || u.jahr}`, this, container); })
    .on('mouseleave', () => versteckeTooltip())
    .on('click', (event, u) => {
      event.stopPropagation();
      versteckeTooltip();
      instanz.auswahl = 'urkunde';
      zeigeUrkundenDetail(instanz.sidebar, u.record);
    });
  const istKnopf = (i) => instanz.station === 'klick' && i === A.bb;
  instanz.archivPunkte = archivEbene.append('g').selectAll('rect').data(A.items).join('rect')
    .attr('class', 'bgi-archiv').attr('opacity', 0)
    .on('mouseenter', function (event, it) {
      const zeit = it.datiert ? (it.von === it.bis ? `${it.von}` : `${it.von}–${it.bis}`) : 'ohne Zeitangabe';
      const hinweis = it.ergaenzt ? '\nnicht im Bestandsverzeichnis, ergänzt aus den Urkunden' : '';
      zeigeTooltip(`${it.name}\n${zeit} · ${it.kategorie}${hinweis}`, this, container);
    })
    .on('mouseleave', () => versteckeTooltip())
    .on('click', (event, it) => {
      event.stopPropagation();
      versteckeTooltip();
      const i = A.items.indexOf(it);
      if (istKnopf(i)) geheZu(instanz.stationIndex + 1);
      else oeffneBestand(it);
    })
    .on('keydown', (event, it) => {
      if ((event.key === 'Enter' || event.key === ' ') && istKnopf(A.items.indexOf(it))) { event.preventDefault(); geheZu(instanz.stationIndex + 1); }
    });
  instanz.archivBeitraege = archivEbene.append('g').style('pointer-events', 'none').selectAll('circle')
    .data(d3.range(A.verloren)).join('circle').attr('fill', GOLD).attr('opacity', 0);
  instanz.archivBeschriftung = archivEbene.append('g').style('pointer-events', 'none');
  instanz.archivJahre = archivEbene.append('g').style('pointer-events', 'none');
  instanz.archivPuls = archivEbene.append('circle').attr('class', 'bgi-puls').attr('display', 'none');
}

async function ladeStationsdaten() {
  const [stationen, schichten, sektoren, weinexport, rohBuergerbuch, archivKonfig, bestand, urkunden, orte] = await Promise.all([
    ladeCSV(STATIONEN_DATEI).then((r) => r.records).catch(() => null),
    ladeCSV(SCHICHTEN_DATEI).then((r) => r.records).catch(() => null),
    ladeCSV(SEKTOREN_DATEI).then((r) => r.records).catch(() => null),
    ladeCSV(WEIN_DATEI).then((r) => r.records).catch(() => null),
    fetch(BUERGERBUCH_DATEI).then((r) => (r.ok ? r.text() : null)).then((t) => (t ? d3.dsvFormat(';').parse(t) : null)).catch(() => null),
    ladeCSV(ARCHIV_DATEI).then((r) => r.records).catch(() => null),
    instanz.daten?.bestandsverzeichnis || ladeCSV(BESTAND_DATEI).then((r) => r.records).catch(() => null),
    instanz.daten?.urkunden || ladeCSV(URKUNDEN_DATEI).then((r) => r.records).catch(() => null),
    instanz.daten?.orte || ladeCSV(ORTE_DATEI).then((r) => r.records).catch(() => null)
  ]);
  if (!instanz) return;
  if (sektoren) ergaenzeSektoren(instanz.personen, instanz.buergerbuch, rohBuergerbuch);
  instanz.schichten = bereiteSchichtenAuf(schichten, instanz.personen.length);
  const weinZeilen = (weinexport || []).map((r) => ({ jahr: zahlWert(r.jahr), eimer: zahlWert(r.eimer) }))
    .filter((w) => w.jahr !== null && w.eimer > 0).sort((a, c) => a.jahr - c.jahr);
  instanz.wein = weinZeilen.length >= 2 ? { zeilen: weinZeilen, vorher: weinZeilen[0], nachher: weinZeilen[weinZeilen.length - 1] } : null;
  instanz.berufe = bereiteBerufeAuf(sektoren, instanz.buergerbuch, instanz.personen);
  if (instanz.berufe) {
    instanz.torPlatz = vergibTorPlaetze(instanz.personen, instanz.berufe);
    if (instanz.station === 'tor') zeichne(false); // gleiche Punkte, nur andere Personen darauf
  }
  instanz.archiv = archivKonfig ? bereiteArchivAuf(bestand, urkunden, archivKonfig) : null;
  if (instanz.archiv) baueArchivpunkte();
  instanz.karte = instanz.archiv ? bereiteKarteAuf(orte, instanz.archiv) : null;
  instanz.stationen = bereiteStationenAuf(stationen)
    .filter((s) => !ARCHIV_STATIONEN.includes(s.id) || instanz.archiv)
    .filter((s) => s.id !== 'urkunden' || instanz.archiv?.urk >= 0)
    .filter((s) => !KARTE_STATIONEN.includes(s.id) || instanz.karte)
    .filter((s) => s.id !== 'klick' || instanz.archiv?.bb >= 0)
    .filter((s) => s.id !== 'berufe' || instanz.berufe)
    .filter((s) => s.id !== 'weinzoll' || (instanz.wein && instanz.schichten))
    .filter((s) => !VERMOEGEN_STATIONEN.includes(s.id) || instanz.schichten)
    .filter((s) => s.id !== 'vermoegenslos' || instanz.schichten?.ohne);
  instanz.muenzeGulden = instanz.stationen.find((s) => s.muenze)?.muenze || STANDARD_MUENZE;
  if (instanz.schichten) {
    // Zuordnung Punkt → Schicht und Platz in der Säule (nach der gemischten Reihenfolge, also ohne Bezug zur Person)
    const grenzen = [];
    instanz.schichten.buerger.reduce((summe, s) => { grenzen.push(summe + s.anzahl); return summe + s.anzahl; }, 0);
    instanz.zuordnung = instanz.personen.map((p, i) => {
      const k = grenzen.findIndex((g) => i < g);
      return { k, rang: i - (k > 0 ? grenzen[k - 1] : 0) };
    });
    if (instanz.schichten.ohne) {
      instanz.graueGruppe = vGruppe('graue', {
        zeige(k) { zeigeTooltip(`${instanz.schichten.ohne.name}\n${instanz.schichten.ohne.beschreibung}`, k, instanz.container); }
      });
      instanz.graue = vPunkte(instanz.graueGruppe, d3.range(instanz.personen.length))
        .attr('class', 'bgi-grau').attr('cx', -40).attr('cy', 0).attr('opacity', 0).style('pointer-events', 'none');
    }
  }
  // erste Folie (meist `archiv`) zeigen; bis hierhin war die Bühne verborgen
  const erste = instanz.stationen[0];
  instanz.stationIndex = 0;
  instanz.station = erste.id;
  instanz.unterzeile.textContent = erste.unterzeile || STANDARD_UNTERZEILE;
  setzeText(-1);
  passeHoeheAn();
  zeichne(false);
  instanz.svg.attr('aria-label', stationsBeschriftung());
  instanz.buehne.style.visibility = '';
  aktualisiereSteuerung();
  // Formen der Folien klerus/reformation (Tor mit mehr Punkten, Kirche, Kreuz) im Leerlauf vorab berechnen - beim Klick
  // kosteten sie sonst ein Bild von rund 0,3 s; die Ergebnisse hängen nicht von der Fensterbreite ab
  if (instanz.schichten && instanz.stationen.some((s) => s.id === 'klerus' || s.id === 'reformation')) {
    // nur, wenn gerade nichts in Bewegung ist (sonst stockt ein laufender Übergang); sonst eine Sekunde später erneut
    const vorab = () => {
      if (!instanz) return;
      if (instanz.bewegungen.size || Date.now() < instanz.animationBis) { setTimeout(plane, 1000); return; }
      layoutKlerus(instanz.buehne.clientWidth || 900, false);
      layoutKlerus(instanz.buehne.clientWidth || 900, true);
    };
    const plane = () => (window.requestIdleCallback ? window.requestIdleCallback(vorab, { timeout: 4000 }) : vorab());
    setTimeout(plane, 1500);
  }
}

export function render(container, data, options = {}) {
  if (instanz) destroy();
  container.innerHTML = '';
  fuegeStyleEin(container);
  fuegeSidebarStyleEin(container);
  const buergerbuch = data?.buergerbuch || [];
  const personen = mische(sammlePersonen(buergerbuch, data?.personenliste)).map((p, nr) => ({ ...p, nr }));
  const spanne = jahresSpanne(buergerbuch);

  const wurzel = document.createElement('div');
  wurzel.className = 'bgi-wurzel';
  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'bgi-werkzeugleiste';
  const kopf = document.createElement('div');
  kopf.className = 'bgi-kopf';
  kopf.innerHTML = `<div class="bgi-ueberzeile">Bürgerbuch Krems${spanne ? ` · ${spanne[0]}–${spanne[1]}` : ''}</div>
    <p class="bgi-zahl">${zahl(personen.length)} Personen</p>
    <div class="bgi-unterzeile">${STANDARD_UNTERZEILE}</div>`;
  const steuerung = document.createElement('div');
  steuerung.className = 'bgi-steuerung';
  steuerung.innerHTML = `<span class="bgi-foliennummer" aria-hidden="true"></span><button type="button" class="bgi-zurueck" hidden>Zurück</button>
    <button type="button" class="bgi-weiter" hidden><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  const buehne = document.createElement('div');
  buehne.className = 'bgi-buehne';
  const erklaerung = document.createElement('div');
  erklaerung.className = 'bgi-erklaerung';
  erklaerung.setAttribute('aria-live', 'polite');
  wurzel.append(werkzeugleiste, kopf, steuerung, buehne, erklaerung);
  container.appendChild(wurzel);

  // Höhe: die Bühne füllt den sichtbaren Platz (abzüglich Kopf); die Vermögens-Folien machen sie bei Bedarf höher
  const hoehe = options.height || ermittleVerfuegbareHoehe(buehne, { reserveUnten: 24, mindestHoehe: 320 });
  buehne.style.height = `${hoehe}px`;

  const svg = d3.select(buehne).append('svg').attr('role', 'img')
    .attr('aria-label', `${zahl(personen.length)} Personen im Bürgerbuch, als Steiner Tor`);
  const ebeneSpalten = svg.append('g');
  const ebeneMuenzen = svg.append('g');
  const ebeneGraue = svg.append('g');
  const leinwand = document.createElement('canvas'); // alle Punkte, Frauen, Inwohner und Münzen (siehe zeichneAlles())
  leinwand.className = 'bgi-leinwand';
  leinwand.setAttribute('aria-hidden', 'true');
  buehne.appendChild(leinwand);
  // symbolische Frauen-Punkte (unter den Männern, damit sie beim Verschmelzen unter ihnen verschwinden); alle Punkte
  // virtuell (siehe VPunkt), Tooltip und Klick über trefferBei()
  const frauenGruppe = vGruppe('frauen', { zeige(k) { zeigeTooltip('Frau (symbolischer Punkt)\nkeine bestimmte Person', k, container); } });
  const frauenPunkte = vPunkte(frauenGruppe, d3.range(personen.length))
    .attr('class', 'bgi-frau').attr('fill', FRAUEN_FARBE).attr('fill-opacity', 0.85).attr('opacity', 0).attr('cx', -40).attr('cy', 0)
    .style('pointer-events', 'none');
  const personenGruppe = vGruppe('personen', {
    zeige(k, p) {
      if (PERSONEN_STATIONEN.includes(instanz.station)) {
        const zeile = p.rolle === 'neubuerger' ? `Neubürger${p.jahr ? ` ${p.jahr}` : ''}` : 'Bürge';
        let sektor = '';
        if (instanz.station === 'schreibweisen' && p.schreibweisen.length > 1) sektor = `\nSchreibweisen: ${p.schreibweisen.join(' / ')}`;
        if (instanz.station === 'berufe') {
          const gruppe = instanz.berufe?.gruppeVon[p.nr];
          sektor = gruppe
            ? `\n${p.beruf ? `${p.beruf} · ` : ''}${gruppe.name}${p.sektorErschlossen ? '\n(Sektor aus dem Beruf als Bürge erschlossen)' : ''}`
            : '\nohne Berufsangabe';
        }
        zeigeTooltip(`${p.name}\n${zeile}${sektor}`, k, container);
        return;
      }
      if (['klerus', 'reformation', 'behauptung', 'weinzoll'].includes(instanz.station)) return;
      const s = instanz.schichten?.buerger[instanz.zuordnung[p.nr].k];
      if (s) zeigeTooltip(`${s.name}\n1 von ${zahl(s.anzahl)} Haushalten (Anteil, keine bestimmte Person)`, k, container);
    },
    // in den Vermögens-Folien steht ein Punkt für keinen bestimmten Menschen
    klickbar: () => PERSONEN_STATIONEN.includes(instanz.station),
    klick(p) {
      versteckeTooltip();
      oeffnePerson(p);
    }
  });
  const punkte = vPunkte(personenGruppe, personen).attr('class', 'bgi-punkt').attr('fill', FARBE);
  // Maus über der Bühne: Tooltip und Zeiger für den getroffenen Punkt, Klick öffnet die Person
  let ueber = null;
  buehne.addEventListener('pointermove', (event) => {
    if (!instanz) return;
    const k = trefferBei(event);
    if (k === ueber) return;
    if (ueber) versteckeTooltip();
    ueber = k;
    const h = k?.parentNode.handler;
    buehne.style.cursor = h?.klick && h.klickbar() ? 'pointer' : '';
    if (k) h.zeige(k, k.__data__);
  });
  buehne.addEventListener('pointerleave', () => {
    if (ueber) versteckeTooltip();
    ueber = null;
    buehne.style.cursor = '';
  });
  buehne.addEventListener('click', (event) => {
    if (!instanz) return;
    const k = trefferBei(event);
    const h = k?.parentNode.handler;
    if (!h?.klick || !h.klickbar()) return;
    event.stopPropagation();
    h.klick(k.__data__);
  });

  const archivEbene = svg.append('g'); // Archiv-Folien (über den Personen; dort sind diese verborgen)

  // Nachschlagetabellen für die Sidebar (einmal je Darstellung)
  const buergerbuchJePerson = new Map();
  const merke = (id, r) => {
    if (!id) return;
    if (!buergerbuchJePerson.has(id)) buergerbuchJePerson.set(id, []);
    if (!buergerbuchJePerson.get(id).includes(r)) buergerbuchJePerson.get(id).push(r);
  };
  buergerbuch.forEach((r) => {
    merke(alsText(r.personen_id), r);
    (Array.isArray(r.buergen_id) ? r.buergen_id : alsText(r.buergen_id).split('|')).forEach((id) => merke(alsText(id).trim(), r));
  });
  const quellen = {
    personNachId: new Map((data?.personenliste || []).map((r) => [alsText(r.personen_id), r])),
    buergerbuchJePerson,
    buergerbuchNachId: new Map(buergerbuch.map((r) => [r.id, r])),
    urkundenNachSignatur: new Map((data?.urkunden || []).map((r) => [r.signatur, r])),
    inventareNachId: new Map((data?.verlassenschaften || []).map((r) => [r.id, r]))
  };

  const sidebar = baueSidebarGeruest(container);
  instanz = {
    container, wurzel, buehne, personen, buergerbuch, berufe: null, torPlatz: null, wein: null, weinZeit: null,
    archiv: null, archivEbene, archivAktiv: false, personenSichtbar: true, daten: data, kopf,
    kopfUeberzeile: `Bürgerbuch Krems${spanne ? ` · ${spanne[0]}–${spanne[1]}` : ''}`, station: 'tor', stationIndex: 0, stationen: STANDARD_STATIONEN, schichten: null,
    zuordnung: null, muenzeGulden: STANDARD_MUENZE, svg, punkte, graue: null, graueSichtbar: false, frauenPunkte, frauenSichtbar: false, leinwand, bewegungen: new Map(),
    personenGruppe, frauenGruppe, graueGruppe: null, muenzGruppen: new Set(), zeichenAnfrage: null, zeichnenBis: 0, bildNr: 0, ebeneSpalten, ebeneMuenzen,
    ebeneGraue, teileVorher: new Set(), weiterKnopf: steuerung.querySelector('.bgi-weiter'), zurueckKnopf: steuerung.querySelector('.bgi-zurueck'), foliennummer: steuerung.querySelector('.bgi-foliennummer'),
    unterzeile: kopf.querySelector('.bgi-unterzeile'), erklaerung, infoButton: null, layout: null, sidebar, quellen,
    auswahl: null, basisHoehe: hoehe, letzteBreite: 0, animationBis: 0
  };
  instanz.weiterKnopf.addEventListener('click', () => geheZu(instanz.stationIndex + 1));
  instanz.zurueckKnopf.addEventListener('click', () => geheZu(instanz.stationIndex - 1));
  sidebar.schliessenBtn.addEventListener('click', schliessePerson);
  sidebar.zurueckBtn.addEventListener('click', () => zurueckZurKombiniertenListe(sidebar)); // Liste der Person wieder zeigen
  erklaerung.addEventListener('click', (event) => {
    const knopfPerson = event.target.closest('.bgi-textperson');
    if (knopfPerson) zeigePersonMitId(knopfPerson.dataset.person);
  });
  // Klick auf eine freie Stelle der Ansicht schließt die Sidebar (Punkte stoppen ihren Klick; Links bleiben Links)
  wurzel.addEventListener('click', (event) => { if (!event.target.closest('a, button')) schliessePerson(); });
  infotextFuerModul('buergerinnen').then((cfg) => {
    if (!instanz || !cfg || !werkzeugleiste.isConnected) return;
    instanz.infoButton = erzeugeInfoButton(werkzeugleiste, cfg);
  });
  buehne.style.visibility = 'hidden'; // bis die Folien geladen sind (sonst stünde kurz das Buch statt des Archivs da)
  zeichne(false);
  ladeStationsdaten().catch((fehler) => console.error('[Bürgerinnen?] Folien konnten nicht geladen werden:', fehler)).finally(() => { if (instanz) instanz.buehne.style.visibility = ''; });
  // Nur echte Breitenänderungen (Fenster) neu zeichnen. zeichne() merkt sich die Breite, mit der es gezeichnet hat;
  // läuft gerade ein Übergang, wird erst danach neu gezeichnet, damit er nicht abbricht.
  let geplant = null;
  instanz.beobachter = new ResizeObserver(() => {
    if (!instanz || buehne.clientWidth === instanz.letzteBreite) return;
    clearTimeout(geplant);
    geplant = setTimeout(() => {
      if (!instanz || buehne.clientWidth === instanz.letzteBreite) return;
      passeHoeheAn();
      zeichne(false);
    }, Math.max(150, instanz.animationBis - Date.now()));
  });
  instanz.beobachter.observe(buehne);
}

export function resize() {
  if (instanz) zeichne(false);
}

export function destroy() {
  if (!instanz) return;
  instanz.beobachter?.disconnect();
  instanz.archivGeister?.interrupt('geist');
  instanz.archivBeitraege?.interrupt('beitrag');
  if (instanz.zeichenAnfrage) cancelAnimationFrame(instanz.zeichenAnfrage);
  instanz.regenSchleife?.stop();
  clearTimeout(instanz.weinZeit);
  clearTimeout(instanz.pendelZeit);
  instanz.graue?.interrupt();
  instanz.infoButton?.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
