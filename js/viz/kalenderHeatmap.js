// js/viz/kalenderHeatmap.js
// Kalender-Heatmap der Urkunden.
//
// AUSLEGUNGSENTSCHEIDUNG (bitte prüfen, keine im Masterprompt/SCHEMA.md festgelegte
// Vorgabe): Die Urkunden verteilen sich über ~700 Jahre (1108-1844) und haben nur bei
// exakter Tagesgenauigkeit ein auswertbares Monat/Tag-Datum. Ein klassisches
// Kalenderraster (Monat x Tag, 12x31 Zellen) macht daher nur Sinn, wenn man über ALLE
// Jahre hinweg aggregiert - eine Zelle zeigt "wie oft wurde eine Urkunde auf diesen
// Kalendertag datiert, unabhängig vom Jahr". Das ist inhaltlich interessant (mittel-
// alterliche Urkunden wurden oft an Feiertagen ausgestellt), aber eine andere Frage
// als "ein Kalenderjahr im Detail". Alternative wäre eine Jahres-x-Kategorie-Matrix
// gewesen (siehe swimlanes.js) - dafür gibt es aber bereits ein eigenes Modul.
//
// Nur Urkunden mit Tagesgenauigkeit (siehe datePrecision.js: 'exact') lassen sich
// überhaupt auf einem Kalendertag platzieren. Alle anderen (nur Jahr, nur Monat,
// ungefähre Angabe, undatiert) erscheinen sichtbar im "Nicht im Kalender darstellbar"-
// Bereich (Abschnitt 12: nie stillschweigend ausblenden).
//
// Modul-Interface siehe Abschnitt 5.
//
// AUFTRAG "Kalender-Heatmap – Farbdiagnose, Zeitraum-Regler, Achsen, Info-Button":
// fünf Nachbesserungen an diesem bereits bestehenden Modul, siehe jeweiliger
// Kommentar an Ort und Stelle:
//
// Punkt 1 (Root-Cause-Diagnose "durchgehend graue Felder"): live gegen die echten
// Daten geprüft (Root-Cause-Check, Schritt 1, siehe CHANGELOG für die genauen
// Messwerte) - die Frequenz-Aggregation UND die Opazitäts-Skala funktionierten
// bereits korrekt (Opazität variierte real zwischen 0,04 und 1,0 über 342 von 372
// Zellen), das war NICHT der Fehler. Ursache war die Farbwahl selbst: jede Zelle
// erhielt unconditional `CAT_COLORS.default` (`#888888`, ein neutrales Grau) als
// Füllfarbe - exakt dieselbe Art Fallback-Grauwert wie beim bereits bekannten
// CAT_COLORS-Vorfall bei ganttDiagramm.js, hier aber von Anfang an so entworfen
// (siehe vorheriger Dateikopf-Kommentar "Farben ausschließlich aus CAT_COLORS"),
// nicht durch eine fehlende Key-Zuordnung ausgelöst. Da nur die Opazität einer
// EINZIGEN Grundfarbe variierte, blieb das Ergebnis immer "irgendein Grauton" statt
// "hell bis dunkel Blau" wie im Alpha-Vorbild. Fix: `farbSkala()` (echte
// d3.scaleSequential(d3.interpolateBlues)) ersetzt CAT_COLORS.default+Opazität
// vollständig für die Zellenfarbe - CAT_COLORS wird weiterhin für die
// Kategorie-Badges in der neuen Urkunden-Liste (Punkt 5/Klick-Verhalten) benutzt,
// aber nicht mehr für die Zellenfläche selbst.
//
// Punkt 2 (Zeitraum-Regler): ersetzt eine laut Auftrag beschriebene, tatsächlich in
// diesem Modul nie vorhandene Zwei-Zahlenfelder-Version (siehe CHANGELOG,
// Root-Cause-Diagnose-Abschnitt) - es gab keine bestehende Zeitraum-Eingrenzung zu
// ersetzen, der beidseitige Regler ist komplett neu. Baut auf `parseJahr()` aus
// urkundenZeit.js auf (dieselbe Jahres-Parsing-Logik wie alle anderen
// Urkunden-Module). `aktiverZeitraum.bis` ist bewusst der START-Jahr der zuletzt
// eingeschlossenen Dekade (nicht deren Ende) - `zeichnePlot()` rechnet dafür
// konsistent mit `bis + 9`.
//
// Punkt 5b (Klick-auf-Zelle-öffnet-Liste sowie der Monat×Tag/Jahrzehnt×Monat-Toggle):
// beides existierte vor diesem Auftrag ebenfalls nicht (siehe CHANGELOG) - auf
// Rückfrage vom Auftraggeber ausdrücklich als neue Funktionalität freigegeben,
// nicht nur als Textanpassung. Sidebar-Gerüst/Fokus-Mechanik/CSS werden dafür
// UNVERÄNDERT aus js/utils/sidebar.js wiederverwendet (identisches Muster zu
// zeitachse.js: dortiger Dateikopf-Kommentar erklärt, warum baueSidebarInhalt()/
// oeffneSidebar() selbst NICHT wiederverwendet werden - Bestand-Schema-spezifisch,
// Urkunden haben andere Felder).
//
// FOLGEAUFTRAG "Kalender-Heatmap-Korrekturen, Sidebar-Umbau, Kategorie-
// Umbenennung" (siehe CHANGELOG für Details/Live-Verifikation):
// Punkt 1: Bugfix - Modus-Umschalter-Button zeigte den aktiven Zustand beim
//   ersten Laden nicht visuell an (aria-pressed korrekt, .kal-modus-aktiv
//   fehlte), siehe aktualisiereModusButtons()-Aufruf in baueWerkzeugleiste().
// Punkt 2 (KORRIGIERT, siehe unten): "Unsicherheiten anzeigen" öffnete
//   damals die Liste der nicht darstellbaren Urkunden als Sidebar.
// Punkt 3 (KORRIGIERT, siehe unten): Legende war damals kein sichtbares
//   Seitenelement mehr, sondern Teil des Info-Popover-Texts.
// Punkt 4: Sidebar-Listen (Zellklick, Unsicherheiten-Liste) sind jetzt
//   schlank (nur Signatur+Kategorie) und navigieren per Klick zum Regesten-
//   Kachelraster - die eigentliche Listendarstellung wurde dafür nach
//   js/utils/sidebar.js ausgelagert (baueUrkundenListeInhalt(), betrifft
//   künftig alle Module mit Mehrfach-Urkunden-Listen), Navigation über
//   state.js' zielSignatur + router.js' navigiereZu(), siehe
//   navigiereZuKachel() (WIE die Ziel-Urkunde im Kachelraster isoliert wird,
//   hat sich seither geändert - siehe regestenKachelraster.js' eigener
//   Dateikopf-Kommentar, Punkt 3 des unten genannten Folgeauftrags).
//
// FOLGEAUFTRAG "Kalender-Legende zurück, Sidebar-Navigation isolieren,
// Expand-Umrandung" (siehe CHANGELOG) - macht die beiden obigen Punkte
// bewusst rückgängig:
// Punkt 1 (ZWISCHENSTAND, siehe unten weiter korrigiert): Legende wieder als
//   sichtbares Seitenelement statt Absatz im Info-Popover - KALENDER_INFO_TEXT
//   war nie geändert worden (der Legenden-Satz wurde ausschließlich in
//   aktualisiereInfoButton() angehängt, jetzt umbenannt in
//   aktualisiereLegende()), daher hier keine Textänderung nötig. Da der
//   Info-Button-Text dadurch wieder vollständig STATISCH ist, entfällt auch
//   das bisherige destroy()-und-Neubau-Muster für den Info-Button bei jedem
//   Redraw - er bleibt ab render() unverändert bestehen (siehe dortiger
//   Bugfix-Kommentar zur unconditional Erzeugung).
// Punkt 2: "Unsicherheiten anzeigen" blendet jetzt die bereits vorhandene
//   "Nicht im Kalender darstellbar"-Tabelle (zeichneUnbekanntBereich() aus
//   urkundenZeit.js) direkt ein/aus (Standard: versteckt), statt eine
//   Sidebar zu öffnen - siehe zeichneTagModus()/zeichneJahrzehntModus(),
//   Bedingung `zeigeUnsicherheit`. Keine Änderung an der Berechnung der
//   nicht darstellbaren Menge selbst (weiterhin `nichtDarstellbar` aus
//   teileNachTagesgenauigkeit()/teileNachJahrzehntMonat()), nur an ihrer
//   Sichtbarkeits-Steuerung.
//
// KLEINAUFTRAG "Kalender-Legende auf ursprüngliches Erscheinungsbild
// zurücksetzen" (siehe CHANGELOG) - korrigiert Punkt 1 oben ein zweites Mal:
// der Zwischenstand (ein reiner Beschreibungssatz als <span> IN der
// Werkzeugleiste, rechtsbündig) entsprach nicht dem Alpha-Vorbild. Jetzt (ZWI-
// SCHENSTAND, siehe KLEINAUFTRAG "Legenden-Position anpassen" unten): eigene
// Zeile UNTERHALB der Werkzeugleiste, linksbündig, mit mehrstufigem
// Farbverlauf (LEGENDE_SCHRITTE echte <span>-Quadrate, eingefärbt mit
// derselben farbSkala-Funktion wie die Zellen selbst) statt reinem Text -
// siehe aktualisiereLegende() weiter unten.
//
// KLEINAUFTRAG "Legenden-Position anpassen" (siehe CHANGELOG) - korrigiert
// nur die POSITION aus dem vorigen Kleinauftrag, nicht die optische
// Gestaltung (Farbmuster-Quadrate bleiben wie dort beschrieben): die Legende
// ist wieder Teil derselben Zeile wie die Werkzeugleiste (.kal-legende-
// gruppe, direkt nach reglerGruppe in baueWerkzeugleiste() - also unmittelbar
// nach "Anwenden"/"Alle"), keine eigene Zeile mehr darunter. Bewusst als
// eigenständige Flex-Gruppe (nicht einzelne lose Kind-Elemente direkt in
// .kal-werkzeugleiste) - dasselbe Muster wie modusGruppe/reglerGruppe -,
// damit .kal-werkzeugleiste's bestehendes flex-wrap sie bei wenig Platz als
// GANZES in eine neue Zeile umbricht, ohne dass Quadrate einzeln abgeschnitten
// werden könnten. Keine margin-left:auto (das hatte die Legende im ersten
// Zwischenstand isoliert an den rechten Rand geschoben, siehe oben) - die
// Gruppe fügt sich stattdessen normal in den Zeilenfluss ein.
//
// AUFTRAG "Sidebar-Liste – Regest-Vorschauzeile & Inline-Detailansicht"
// (siehe CHANGELOG/PROJEKTLOG): macht den obigen Punkt 4 ("navigiert per
// Klick zum Regesten-Kachelraster") bewusst rückgängig - Klick auf einen
// Listeneintrag öffnet stattdessen die volle Detailansicht (inkl.
// Fotogalerie) INNERHALB derselben Sidebar. Die vormalige navigiereZuKachel()
// (state.js' setZielSignatur() + router.js' navigiereZu()) entfällt
// ersatzlos - dieser Pfad ruft filterleiste.js' setzeSuchbegriff() dadurch
// nicht mehr auf (Nicht-Ziel des Auftrags: setzeSuchbegriff() selbst bleibt
// unverändert bestehen, wird aber aus diesem Pfad nicht mehr erreicht).
// state.js'/regestenKachelraster.js' zielSignatur-Mechanismus bleibt
// unangetastet (Nicht-Ziel: keine Änderung an anderen Modulen) - er wird
// von hier aus schlicht nicht mehr befüllt, bleibt für einen möglichen
// künftigen Aufrufer aber funktionsfähig.
//
// AUFTRAG "Sidebar-Lightbox & app-weite Vereinheitlichung": die zuvor HIER
// lokal gehaltene Öffnen-Orchestrierung (oeffneUrkundenListe()/
// oeffneUrkundenDetail()/zurueckZurUrkundenListe(), Liste-vs-Detail-
// Umschaltung, Zurück-Button-Verdrahtung) ist jetzt komplett Teil von
// js/utils/sidebar.js selbst (zeigeUrkundenSidebar()/zeigeUrkundenDetail())
// - dieses Modul ruft nur noch zeigeUrkundenSidebar(sidebar, titel, records)
// auf und bekommt "1 Ergebnis -> Detail, mehrere -> Liste" automatisch
// (bisher öffnete jede Zelle IMMER die Liste, auch bei genau einem Treffer -
// siehe Akzeptanzkriterium des neuen Auftrags). Kein eigener Zurück-Button-
// Handler mehr nötig (sidebar.js verdrahtet ihn selbst).

import { CAT_COLORS } from '../config/constants.js';
import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { leiteDatumsPraezisionAb } from '../utils/datePrecision.js';
import {
  parseMonatTag,
  parseJahr,
  ersteKategorie,
  baueUrkundenTooltipText,
  zeichneUnbekanntBereich
} from '../utils/urkundenZeit.js';
import {
  baueSidebarGeruest,
  schliesseSidebar as schliesseSidebarModul,
  fuegeSidebarStyleEin,
  zeigeUrkundenSidebar
} from '../utils/sidebar.js';
import { ermittleVerfuegbareHoehe, ermittleVerfuegbareBreite } from '../utils/viewportGroesse.js';
import {
  istBildschirmZuKlein,
  baueBildschirmHinweis,
  fuegeBildschirmHinweisStyleEin
} from '../utils/bildschirmHinweis.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';

// Punkt 5 (Info-Button) - erste zwei Absätze wörtlich wie im Auftrag
// übernommen (Akzeptanzkriterium: keine eigenmächtige Umformulierung). Beide
// zuvor unklaren Sätze (Modus-Umschaltung, Klick öffnet Liste) sind
// tatsächlich vorhandene Funktionalität (siehe Dateikopf-Kommentar).
//
// Ein zwischenzeitlicher Folgeauftrag hatte die Legende ("Urkunden: hell →
// dunkel, max. X") testweise als dritten Absatz an diesen Text angehängt -
// per Auftrag "Kalender-Legende zurück..." (siehe Dateikopf-Kommentar)
// rückgängig gemacht: KALENDER_INFO_TEXT ist wieder rein statisch (nur diese
// zwei Absätze), die Legende ist wieder ein eigenes, sichtbares
// Seitenelement mit eigener dynamischer Zahl (siehe aktualisiereLegende()).
const KALENDER_INFO_TEXT = `Diese Heatmap zeigt, an welchen Kalendertagen bzw. in welchen Jahrzehnten die meisten Urkunden ausgestellt wurden. Je dunkler ein Feld, desto mehr Urkunden fallen auf dieses Datum (alle Jahre zusammengefasst).

Über die Umschaltung „Monat × Tag" / „Jahrzehnt × Monat" lässt sich die Darstellung wechseln. Der Zeitregler grenzt die Anzeige auf einen bestimmten Jahrzehnt-Bereich ein. Klick auf ein Feld öffnet die Liste der Urkunden dieses Datums.`;

const MONATSNAMEN = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const MONATSNAMEN_VOLL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const ZELLENGROESSE_MIN = 8;
const ZELLENGROESSE_MAX = 26;

// Punkt 4: Ränder vergrößert ggü. der ursprünglichen Fassung (20/10/40/20), um
// Platz für die neuen Achsentitel UND die größere Tick-Schrift zu schaffen -
// dieselbe Überlegung wie bei zeitachse.js' RAND-Anpassung im Folgeauftrag
// "Achsenbeschriftung".
const RAND = { oben: 24, unten: 46, links: 60, rechts: 20 };

// Punkt 4: 10px -> 14px (Faktor 1,4x), konsistent mit zeitachse.js'
// TICK_SCHRIFTGROESSE-Konvention (dortiger Dateikopf-Kommentar, Folgeauftrag
// "Achsenbeschriftung & Kontrast", Punkt B).
const TICK_SCHRIFTGROESSE = 14;
const ACHSENTITEL_SCHRIFTGROESSE = 13;
const MIN_TAG_LABEL_ABSTAND = 20; // zweistellige Zahlen, adaptive Schrittweite siehe ermittleLabelSchritt()
const MIN_JAHRZEHNT_LABEL_ABSTAND = 40; // vierstellige Zahlen brauchen mehr Platz

const JAHRZEHNT_SCHRITT = 10;

let instanz = null; // { container, werkzeugleiste, legendeFarbenElement, legendeMaxElement, plotBereich, sidebar, infoButtonZeile, infoButton, records, options, ansichtsModus, jahresSpanneVoll, aktiverZeitraum, modusButtons, ausgewaehlteZelle } – eine aktive Kalender-Heatmap pro Modul-Ladung (Liste-/Detail-/Zurück-Zustand der Sidebar lebt seit dem Auftrag "Sidebar-Lightbox & app-weite Vereinheitlichung" in sidebar.js selbst, nicht mehr hier)

function clamp(wert, min, max) {
  return Math.max(min, Math.min(max, wert));
}

function teileNachTagesgenauigkeit(records) {
  const tagesgenau = [];
  const nichtDarstellbar = [];
  records.forEach((record) => {
    if (leiteDatumsPraezisionAb(record.datum) === 'exact') {
      const { monat, tag } = parseMonatTag(record.datum);
      if (monat && tag) {
        tagesgenau.push({ record, monat, tag });
        return;
      }
    }
    nichtDarstellbar.push({ record });
  });
  return { tagesgenau, nichtDarstellbar };
}

function gruppiereNachTag(tagesgenau) {
  const gruppen = new Map();
  tagesgenau.forEach((eintrag) => {
    const schluessel = `${eintrag.monat}-${eintrag.tag}`;
    if (!gruppen.has(schluessel)) {
      gruppen.set(schluessel, { monat: eintrag.monat, tag: eintrag.tag, eintraege: [] });
    }
    gruppen.get(schluessel).eintraege.push(eintrag);
  });
  return Array.from(gruppen.values());
}

// Jahrzehnt×Monat braucht KEINE Tagesgenauigkeit - Records mit nur Monat-Präzision
// ('month', kein Tag) sind hier zusätzlich auswertbar (anders als im Tag-Modus),
// solange auch ein Jahr vorhanden ist (für die Dekaden-Zuordnung).
function teileNachJahrzehntMonat(records) {
  const auswertbar = [];
  const nichtDarstellbar = [];
  records.forEach((record) => {
    const praezision = leiteDatumsPraezisionAb(record.datum);
    const { monat } = parseMonatTag(record.datum);
    const jahr = parseJahr(record);
    if ((praezision === 'exact' || praezision === 'month') && monat && jahr !== null) {
      auswertbar.push({ record, monat, jahr });
    } else {
      nichtDarstellbar.push({ record });
    }
  });
  return { auswertbar, nichtDarstellbar };
}

function gruppiereNachJahrzehntMonat(auswertbar) {
  const gruppen = new Map();
  auswertbar.forEach((eintrag) => {
    const jahrzehnt = Math.floor(eintrag.jahr / JAHRZEHNT_SCHRITT) * JAHRZEHNT_SCHRITT;
    const schluessel = `${jahrzehnt}-${eintrag.monat}`;
    if (!gruppen.has(schluessel)) {
      gruppen.set(schluessel, { jahrzehnt, monat: eintrag.monat, eintraege: [] });
    }
    gruppen.get(schluessel).eintraege.push(eintrag);
  });
  return Array.from(gruppen.values());
}

// Punkt 2: frühestes/spätestes Jahr über ALLE Records (ungefiltert), auf das
// jeweilige Jahrzehnt ab-/abgerundet (beide per Math.floor, damit `bis` als
// Dekaden-START interpretierbar bleibt - siehe zeichnePlot()'s "+9"-Konvention
// weiter unten und Dateikopf-Kommentar).
function ermittleDatenJahresSpanneGerundet(records) {
  const jahre = records.map((r) => parseJahr(r)).filter((j) => j !== null);
  if (jahre.length === 0) return [1000, 2000];
  const minJahr = Math.min(...jahre);
  const maxJahr = Math.max(...jahre);
  return [Math.floor(minJahr / JAHRZEHNT_SCHRITT) * JAHRZEHNT_SCHRITT, Math.floor(maxJahr / JAHRZEHNT_SCHRITT) * JAHRZEHNT_SCHRITT];
}

// Punkt 4: adaptive Label-Schrittweite (analog zu zeitachse.js' ermittleTickAnzahl()) -
// zeigt bei schmalen Zellen nur jedes n-te Label, damit sich die größere 14px-Schrift
// nicht überlappt. Zellen/Gitterlinien selbst werden davon nicht berührt, nur die
// Textbeschriftung wird ausgedünnt.
function ermittleLabelSchritt(zellenBreite, mindestAbstand) {
  return Math.max(1, Math.ceil(mindestAbstand / zellenBreite));
}

function baueZellenTooltip(zelle, istJahrzehnt) {
  const jahre = zelle.eintraege.map((e) => e.jahr || e.record.jahr).filter(Boolean);
  const kopf = istJahrzehnt
    ? `${zelle.jahrzehnt}er, ${MONATSNAMEN_VOLL[zelle.monat - 1]}`
    : `${zelle.tag}. ${MONATSNAMEN_VOLL[zelle.monat - 1]}`;
  const zeilen = [
    kopf,
    `${zelle.eintraege.length} Urkunde(n)${istJahrzehnt ? '' : ` (${new Set(jahre).size} verschiedene Jahre)`}`
  ];
  const unsichere = zelle.eintraege.filter((e) => e.record.datum_unsicher).length;
  if (unsichere > 0) zeilen.push(`davon ${unsichere} mit unsicherer Datierung`);
  return zeilen.join('\n');
}

function schliesseZellenListe() {
  if (!instanz) return;
  instanz.ausgewaehlteZelle = null;
  schliesseSidebarModul(instanz.sidebar, instanz.plotBereich);
}

// Öffnen-Pfad für die Sidebar bei Zellklick (Punkt 5b). KORREKTUR (Auftrag
// "Kalender-Legende zurück, Sidebar-Navigation isolieren, Expand-Umrandung",
// Punkt 2): "Unsicherheiten anzeigen" nutzt diesen Pfad nicht mehr (siehe
// zeichneTagModus()/zeichneJahrzehntModus() - die "Nicht darstellbar"-Menge
// wird jetzt direkt sichtbar/unsichtbar geschaltet statt über eine eigene
// Sidebar-Liste).
//
// Auftrag "Sidebar-Lightbox & app-weite Vereinheitlichung", Punkt 2: ruft
// nur noch js/utils/sidebar.js' zeigeUrkundenSidebar() auf - Liste-vs-
// Detail-Entscheidung, Zurück-Button, Scroll-Position und Fotogalerie/
// Lightbox sind vollständig deren Aufgabe (vorher hier lokal nachgebaut,
// siehe CHANGELOG/PROJEKTLOG für die entfernte Vorversion). Eine Zelle mit
// genau einer Urkunde öffnet dadurch jetzt direkt die Detailansicht statt
// erst eine Ein-Element-Liste zu zeigen (Verhaltensänderung laut
// Akzeptanzkriterium des neuen Auftrags, kein Bug).
function oeffneZellenListe(zelle, istJahrzehnt) {
  instanz.ausgewaehlteZelle = zelle;
  const titel = istJahrzehnt
    ? `${zelle.jahrzehnt}er, ${MONATSNAMEN_VOLL[zelle.monat - 1]}`
    : `${zelle.tag}. ${MONATSNAMEN_VOLL[zelle.monat - 1]}`;
  zeigeUrkundenSidebar(instanz.sidebar, titel, zelle.eintraege.map((e) => e.record));
}

function wireZellenInteraktion(auswahl, istJahrzehnt, container) {
  auswahl
    .on('mouseenter focus', function mouseenterFocus(event, d) { zeigeTooltip(baueZellenTooltip(d, istJahrzehnt), this, container); })
    .on('mouseleave blur', () => versteckeTooltip())
    .on('click', (event, d) => oeffneZellenListe(d, istJahrzehnt))
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        oeffneZellenListe(d, istJahrzehnt);
      }
    });
}

function aktualisiereModusButtons() {
  Object.entries(instanz.modusButtons).forEach(([id, btn]) => {
    const aktiv = instanz.ansichtsModus === id;
    btn.setAttribute('aria-pressed', String(aktiv));
    btn.classList.toggle('kal-modus-aktiv', aktiv);
  });
}

// Anzahl der Farbmuster-Quadrate in der Legende - fein genug, um den
// Blau-Verlauf erkennbar zu machen, grob genug, um als kompakte Zeile neben
// dem "max. X"-Text zu passen (Alpha-Vorbild).
const LEGENDE_SCHRITTE = 6;

// KORREKTUR (Auftrag "Kalender-Legende auf ursprüngliches Erscheinungsbild
// zurücksetzen", siehe CHANGELOG): der vorige Zwischenstand (reiner
// Beschreibungssatz "Urkunden: hell bis dunkel Blau...") entsprach nicht dem
// Alpha-Vorbild - die Legende zeigt jetzt echte Farbmuster-Quadrate statt nur
// Text. `farbSkala` ist dieselbe Funktion, mit der auch die Zellen selbst
// eingefärbt werden (siehe zeichneTagModus()/zeichneJahrzehntModus()) - die
// Legende zeigt dadurch garantiert den TATSÄCHLICH verwendeten Verlauf, keine
// separat gepflegte Kopie. instanz.legendeFarbenElement (Teil der
// Werkzeugleiste, siehe baueWerkzeugleiste()/fuegeStyleEin()) wird bei jedem
// Redraw geleert und neu befüllt (billig genug für LEGENDE_SCHRITTE
// Quadrate, kein destroy()-Bedarf wie beim Info-Button - reine <span>s ohne
// Event-Listener).
function aktualisiereLegende(maxAnzahl, farbSkala) {
  instanz.legendeFarbenElement.innerHTML = '';
  for (let i = 0; i < LEGENDE_SCHRITTE; i += 1) {
    const wert = (i / (LEGENDE_SCHRITTE - 1)) * maxAnzahl;
    const swatch = document.createElement('span');
    swatch.className = 'kal-legende-swatch';
    swatch.style.background = farbSkala(wert);
    instanz.legendeFarbenElement.appendChild(swatch);
  }
  instanz.legendeMaxElement.textContent = `max. ${maxAnzahl}`;
}

function baueWerkzeugleiste() {
  const { jahresSpanneVoll, aktiverZeitraum } = instanz;

  // --- Punkt 5b: Modus-Umschaltung "Monat × Tag" / "Jahrzehnt × Monat" ---
  const modusGruppe = document.createElement('div');
  modusGruppe.className = 'kal-modus-gruppe';
  modusGruppe.setAttribute('role', 'group');
  modusGruppe.setAttribute('aria-label', 'Ansicht wählen');
  [
    { id: 'tag', label: 'Monat × Tag' },
    { id: 'jahrzehnt', label: 'Jahrzehnt × Monat' }
  ].forEach(({ id, label }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kal-modus-btn';
    btn.textContent = label;
    btn.setAttribute('aria-pressed', String(instanz.ansichtsModus === id));
    btn.addEventListener('click', () => {
      if (instanz.ansichtsModus === id) return;
      instanz.ansichtsModus = id;
      schliesseZellenListe();
      aktualisiereModusButtons();
      zeichnePlot();
    });
    instanz.modusButtons[id] = btn;
    modusGruppe.appendChild(btn);
  });
  // Bugfix (Punkt 1): aria-pressed wurde beim Erstaufbau zwar korrekt pro
  // Button gesetzt, die dazugehörige VISUELLE Klasse (.kal-modus-aktiv, blaue
  // Hervorhebung) aber nur bei einem tatsächlichen späteren Klick über
  // aktualisiereModusButtons() (siehe dort) - der Startzustand blieb dadurch
  // unmarkiert, bis einmal hin- und zurückgeklickt wurde. Derselbe Aufruf
  // hier stellt sicher, dass der Anfangszustand von Anfang an visuell mit dem
  // Zustand nach manuellem Klicken übereinstimmt.
  aktualisiereModusButtons();

  // --- Punkt 2: beidseitiger Zeitraum-Regler, 10-Jahres-Schritte ---
  // Zwei überlappende native <input type="range">, ein bereits im Web verbreitetes
  // Muster für einen Dual-Handle-Regler ohne externe Bibliothek: beide Inputs liegen
  // exakt übereinander (position:absolute, volle Breite), aber nur der jeweilige
  // ::-webkit-slider-thumb/::-moz-range-thumb ist per CSS klickbar (siehe
  // fuegeStyleEin()) - der (unsichtbare) Track selbst hat pointer-events:none, damit
  // Klicks IMMER den darunterliegenden Thumb erreichen statt am oberen Input
  // hängenzubleiben.
  const reglerGruppe = document.createElement('div');
  reglerGruppe.className = 'kal-regler-gruppe';

  const reglerLabel = document.createElement('span');
  reglerLabel.className = 'kal-regler-label';
  reglerLabel.textContent = 'Zeitraum:';

  const reglerAnzeige = document.createElement('span');
  reglerAnzeige.className = 'kal-regler-anzeige';

  const sliderWrapper = document.createElement('div');
  sliderWrapper.className = 'kal-slider-wrapper';

  const vonInput = document.createElement('input');
  vonInput.type = 'range';
  vonInput.className = 'kal-slider kal-slider-von';
  vonInput.min = String(jahresSpanneVoll[0]);
  vonInput.max = String(jahresSpanneVoll[1]);
  vonInput.step = String(JAHRZEHNT_SCHRITT);
  vonInput.value = String(aktiverZeitraum.von);
  vonInput.setAttribute('aria-label', 'Zeitraum-Anfang (Jahrzehnt)');

  const bisInput = document.createElement('input');
  bisInput.type = 'range';
  bisInput.className = 'kal-slider kal-slider-bis';
  bisInput.min = String(jahresSpanneVoll[0]);
  bisInput.max = String(jahresSpanneVoll[1]);
  bisInput.step = String(JAHRZEHNT_SCHRITT);
  bisInput.value = String(aktiverZeitraum.bis);
  bisInput.setAttribute('aria-label', 'Zeitraum-Ende (Jahrzehnt)');

  function aktualisiereReglerAnzeige() {
    reglerAnzeige.textContent = `${vonInput.value}–${Number(bisInput.value) + (JAHRZEHNT_SCHRITT - 1)}`;
  }
  aktualisiereReglerAnzeige();

  // Griffe dürfen sich nicht überkreuzen (Akzeptanzkriterium: "unterer Grenzwert
  // kann den oberen nicht überschreiten und umgekehrt") - Filter wird hier bewusst
  // NICHT angewendet (kein zeichnePlot()-Aufruf), nur die Live-Anzeige aktualisiert
  // (siehe Dateikopf-Kommentar/Auftrag: "Filter wird erst bei Klick aktiv").
  vonInput.addEventListener('input', () => {
    if (Number(vonInput.value) > Number(bisInput.value) - JAHRZEHNT_SCHRITT) {
      vonInput.value = String(Number(bisInput.value) - JAHRZEHNT_SCHRITT);
    }
    aktualisiereReglerAnzeige();
  });
  bisInput.addEventListener('input', () => {
    if (Number(bisInput.value) < Number(vonInput.value) + JAHRZEHNT_SCHRITT) {
      bisInput.value = String(Number(vonInput.value) + JAHRZEHNT_SCHRITT);
    }
    aktualisiereReglerAnzeige();
  });

  sliderWrapper.append(vonInput, bisInput);

  const anwendenBtn = document.createElement('button');
  anwendenBtn.type = 'button';
  anwendenBtn.className = 'kal-regler-btn';
  anwendenBtn.textContent = 'Anwenden';
  anwendenBtn.addEventListener('click', () => {
    instanz.aktiverZeitraum = { von: Number(vonInput.value), bis: Number(bisInput.value) };
    schliesseZellenListe();
    zeichnePlot();
  });

  const alleBtn = document.createElement('button');
  alleBtn.type = 'button';
  alleBtn.className = 'kal-regler-btn';
  alleBtn.textContent = 'Alle';
  alleBtn.addEventListener('click', () => {
    vonInput.value = String(jahresSpanneVoll[0]);
    bisInput.value = String(jahresSpanneVoll[1]);
    aktualisiereReglerAnzeige();
    instanz.aktiverZeitraum = { von: jahresSpanneVoll[0], bis: jahresSpanneVoll[1] };
    schliesseZellenListe();
    zeichnePlot();
  });

  reglerGruppe.append(reglerLabel, sliderWrapper, reglerAnzeige, anwendenBtn, alleBtn);

  // Kleinauftrag "Legenden-Position anpassen" (siehe CHANGELOG): zurück in
  // dieselbe Zeile wie die Werkzeugleiste, direkt nach reglerGruppe (also
  // unmittelbar nach "Anwenden"/"Alle") - bewusst als eigene, in sich
  // geschlossene Flex-Gruppe (.kal-legende-gruppe, exakt dasselbe Muster wie
  // modusGruppe/reglerGruppe), NICHT als eigene Zeile wie im vorigen Auftrag
  // ("Kalender-Legende auf ursprüngliches Erscheinungsbild zurücksetzen").
  // .kal-werkzeugleiste hat bereits flex-wrap:wrap + gap (siehe
  // fuegeStyleEin()) - reicht bei wenig Platz die Gruppe als GANZES in eine
  // neue Zeile um (kein Abschneiden, keine margin-left:auto-Verschiebung wie
  // beim vorletzten Zwischenstand, der die Legende isoliert ganz nach rechts
  // schob). Die Farbmuster-Quadrate selbst (aktualisiereLegende()) bleiben
  // unverändert - nur der Anker-Container ändert sich hier.
  const legendeGruppe = document.createElement('div');
  legendeGruppe.className = 'kal-legende-gruppe';
  const legendeLabel = document.createElement('span');
  legendeLabel.className = 'kal-legende-label';
  legendeLabel.textContent = 'Urkunden:';
  const legendeFarbenElement = document.createElement('span');
  legendeFarbenElement.className = 'kal-legende-farben';
  const legendeMaxElement = document.createElement('span');
  legendeMaxElement.className = 'kal-legende-max';
  legendeGruppe.append(legendeLabel, legendeFarbenElement, legendeMaxElement);
  instanz.legendeFarbenElement = legendeFarbenElement;
  instanz.legendeMaxElement = legendeMaxElement;

  instanz.werkzeugleiste.append(modusGruppe, reglerGruppe, legendeGruppe);
}

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .kal-info-button-zeile { display: flex; justify-content: flex-end; align-items: center; min-height: 44px; margin: 0 0 var(--space-2) 0; flex: 0 0 auto; }
    .kal-werkzeugleiste { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-4); margin: 0 0 var(--space-3) 0; }
    /* Bugfix (live im eigenen Test entdeckt): [hidden] (UA-Stylesheet, display:none)
       und die obige Klassen-Regel (display:flex) haben identische Spezifität (0,1,0) -
       bei Gleichstand gewinnt die später im Cascade stehende Autoren-Regel, hier also
       IMMER "flex", auch wenn zeichnePlot() bei zu kleinem Bildschirm .hidden=true
       setzt. Diese explizit höher-spezifische Regel (0,2,0) stellt sicher, dass
       [hidden] tatsächlich greift. */
    .kal-werkzeugleiste[hidden] { display: none; }
    .kal-modus-gruppe { display: flex; gap: var(--space-1); }
    .kal-modus-btn { min-height: 44px; padding: var(--space-2) var(--space-3); border: 1px solid var(--border);
      border-radius: var(--radius); background: var(--surface); font: inherit; font-size: var(--fs-sm); cursor: pointer; }
    .kal-modus-btn:hover { border-color: var(--accent); }
    .kal-modus-btn:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .kal-modus-btn.kal-modus-aktiv { background: var(--accent); color: #fff; border-color: var(--accent); }
    .kal-regler-gruppe { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
    .kal-regler-label { font-size: var(--fs-sm); color: var(--text-muted); }
    .kal-regler-anzeige { font-size: var(--fs-sm); font-weight: 600; min-width: 100px; }
    .kal-slider-wrapper { position: relative; width: 200px; height: 24px; }
    .kal-slider { position: absolute; top: 0; left: 0; width: 100%; height: 24px; margin: 0; background: none;
      pointer-events: none; -webkit-appearance: none; appearance: none; }
    .kal-slider::-webkit-slider-runnable-track { height: 4px; background: var(--border); border-radius: 2px; }
    .kal-slider::-moz-range-track { height: 4px; background: var(--border); border-radius: 2px; }
    .kal-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; pointer-events: auto;
      width: 18px; height: 18px; border-radius: 50%; background: var(--accent); border: 2px solid #fff;
      box-shadow: 0 0 0 1px var(--border); cursor: pointer; margin-top: -7px; }
    .kal-slider::-moz-range-thumb { pointer-events: auto; width: 18px; height: 18px; border-radius: 50%;
      background: var(--accent); border: 2px solid #fff; box-shadow: 0 0 0 1px var(--border); cursor: pointer; }
    .kal-slider:focus-visible::-webkit-slider-thumb { outline: 3px solid var(--accent); outline-offset: 2px; }
    .kal-regler-btn { min-height: 44px; padding: var(--space-2) var(--space-3); border: 1px solid var(--border);
      border-radius: var(--radius); background: var(--surface); font: inherit; font-size: var(--fs-sm); cursor: pointer; }
    .kal-regler-btn:hover { border-color: var(--accent); }
    .kal-regler-btn:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    /* Kleinauftrag "Legenden-Position anpassen" (siehe CHANGELOG): wieder
       Teil derselben Zeile wie die Werkzeugleiste (direkt nach reglerGruppe,
       siehe baueWerkzeugleiste()) statt eigener Zeile darunter - exakt
       dasselbe Flex-Gruppen-Muster wie .kal-modus-gruppe/.kal-regler-gruppe,
       daher hier KEIN eigenes margin/[hidden] nötig: .kal-werkzeugleiste
       selbst regelt Zeilenumbruch (flex-wrap) und Verstecken bereits für
       alle drei Gruppen gemeinsam. */
    .kal-legende-gruppe { display: flex; align-items: center; gap: var(--space-2); }
    .kal-legende-label { font-size: var(--fs-sm); color: var(--text-muted); }
    .kal-legende-farben { display: flex; gap: 2px; }
    .kal-legende-swatch { display: inline-block; width: 16px; height: 16px; border-radius: 3px; border: 1px solid var(--border); }
    .kal-legende-max { font-size: var(--fs-sm); color: var(--text-muted); font-weight: 600; }
    .kal-plot-bereich { overflow-x: auto; }
    .kal-achsentitel { fill: var(--text-muted); font-weight: 600; }
    .kal-tick-text { font-size: ${TICK_SCHRIFTGROESSE}px; }
    .kal-zelle { cursor: pointer; }
  `;
  container.appendChild(style);
}

// Gemeinsame Zellen-Zeichenfunktion für beide Modi - "d" liefert x/y (bereits in
// Pixeln), Breite/Höhe, Anzahl und Unsicher-Flag; Klick-/Tooltip-Verdrahtung und
// Farbskala sind für beide Modi identisch (Punkt 1).
function zeichneZellen(svg, zellenDaten, farbSkala, zellenBreite, zellenHoehe, zeigeUnsicherheit, istJahrzehnt, container) {
  const rechtecke = svg.append('g').attr('class', 'kal-zellen')
    .selectAll('rect.kal-zelle')
    .data(zellenDaten)
    .join('rect')
    .attr('class', 'kal-zelle')
    .attr('tabindex', (d) => (d.eintraege.length > 0 ? 0 : -1))
    .attr('role', (d) => (d.eintraege.length > 0 ? 'button' : null))
    .attr('aria-label', (d) => (d.eintraege.length > 0
      ? `${istJahrzehnt ? `${d.jahrzehnt}er, ${MONATSNAMEN_VOLL[d.monat - 1]}` : `${d.tag}. ${MONATSNAMEN_VOLL[d.monat - 1]}`}, ${d.eintraege.length} Urkunden, Liste öffnen`
      : null))
    .attr('x', (d) => d.x)
    .attr('y', (d) => d.y)
    .attr('width', Math.max(zellenBreite - 1, 1))
    .attr('height', Math.max(zellenHoehe - 1, 1))
    .attr('fill', (d) => farbSkala(d.eintraege.length))
    .attr('stroke', (d) => (zeigeUnsicherheit && d.eintraege.some((e) => e.record.datum_unsicher) ? '#c0392b' : 'none'))
    .attr('stroke-width', (d) => (zeigeUnsicherheit && d.eintraege.some((e) => e.record.datum_unsicher) ? 2 : 0))
    .attr('stroke-dasharray', (d) => (zeigeUnsicherheit && d.eintraege.some((e) => e.record.datum_unsicher) ? '3,2' : null));

  wireZellenInteraktion(rechtecke.filter((d) => d.eintraege.length > 0), istJahrzehnt, container);
  return rechtecke;
}

function zeichneTagModus(gefiltert, zeigeUnsicherheit) {
  const { plotBereich, options } = instanz;
  const { tagesgenau, nichtDarstellbar } = teileNachTagesgenauigkeit(gefiltert);
  const zellen = gruppiereNachTag(tagesgenau);
  const maxAnzahl = d3.max(zellen, (z) => z.eintraege.length) || 1;
  const farbSkala = d3.scaleSequential(d3.interpolateBlues).domain([0, maxAnzahl]);
  aktualisiereLegende(maxAnzahl, farbSkala);

  const anzahlSpalten = 31;
  const anzahlZeilen = 12;
  const breite = options.width || ermittleVerfuegbareBreite(plotBereich);
  const zellenBreite = clamp((breite - RAND.links - RAND.rechts) / anzahlSpalten, ZELLENGROESSE_MIN, ZELLENGROESSE_MAX);
  const verfuegbareHoehe = options.height || ermittleVerfuegbareHoehe(plotBereich, { reserveUnten: 10 });
  const zellenHoehe = clamp((verfuegbareHoehe - RAND.oben) / anzahlZeilen, ZELLENGROESSE_MIN, ZELLENGROESSE_MAX);

  const tatsaechlicheBreite = RAND.links + anzahlSpalten * zellenBreite + RAND.rechts;
  const hoehePlot = RAND.oben + anzahlZeilen * zellenHoehe;

  const svg = d3.select(plotBereich).append('svg').attr('width', tatsaechlicheBreite);

  MONATSNAMEN.forEach((name, i) => {
    svg.append('text')
      .attr('class', 'kal-tick-text')
      .attr('x', RAND.links - 6).attr('y', RAND.oben + i * zellenHoehe + zellenHoehe / 2)
      .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
      .text(name);
  });

  const tagSchritt = ermittleLabelSchritt(zellenBreite, MIN_TAG_LABEL_ABSTAND);
  for (let tag = 1; tag <= 31; tag += 1) {
    if ((tag - 1) % tagSchritt !== 0) continue;
    svg.append('text')
      .attr('class', 'kal-tick-text')
      .attr('x', RAND.links + (tag - 1) * zellenBreite + zellenBreite / 2)
      .attr('y', RAND.oben + anzahlZeilen * zellenHoehe + 16)
      .attr('text-anchor', 'middle')
      .text(tag);
  }

  // Punkt 3: Achsentitel "Tag" (X) / "Monat" (Y).
  svg.append('text')
    .attr('class', 'kal-achsentitel')
    .attr('x', RAND.links + (anzahlSpalten * zellenBreite) / 2)
    .attr('y', hoehePlot + RAND.unten - 6)
    .attr('text-anchor', 'middle')
    .attr('font-size', ACHSENTITEL_SCHRIFTGROESSE)
    .text('Tag');
  svg.append('text')
    .attr('class', 'kal-achsentitel')
    .attr('transform', `translate(14,${RAND.oben + (anzahlZeilen * zellenHoehe) / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle')
    .attr('font-size', ACHSENTITEL_SCHRIFTGROESSE)
    .text('Monat');

  const zellenMap = new Map(zellen.map((z) => [`${z.monat}-${z.tag}`, z]));
  const alleZellenDaten = [];
  for (let monat = 1; monat <= 12; monat += 1) {
    for (let tag = 1; tag <= 31; tag += 1) {
      const basis = zellenMap.get(`${monat}-${tag}`) || { monat, tag, eintraege: [] };
      alleZellenDaten.push({ ...basis, x: RAND.links + (tag - 1) * zellenBreite, y: RAND.oben + (monat - 1) * zellenHoehe });
    }
  }
  zeichneZellen(svg, alleZellenDaten, farbSkala, zellenBreite, zellenHoehe, zeigeUnsicherheit, false, plotBereich);

  // KORREKTUR (Auftrag "Kalender-Legende zurück, Sidebar-Navigation
  // isolieren, Expand-Umrandung", Punkt 2, siehe Dateikopf-Kommentar): die
  // "Nicht darstellbar"-Tabelle wird nur noch gezeichnet, wenn der globale
  // "Unsicherheiten anzeigen"-Button aktiv ist - Standardzustand versteckt
  // (bereichsHoehe 0, kein leerer Freiraum), Klick auf den Button blendet sie
  // über genau diese Bedingung ein/aus (resize({showUncertainty}) →
  // zeichnePlot() → hier). Keine Änderung an der Berechnung von
  // `nichtDarstellbar` selbst (Nicht-Ziel) - nur ob sie gerendert wird.
  const nichtDarstellbarStart = hoehePlot + RAND.unten;
  const bereichsHoehe = zeigeUnsicherheit
    ? zeichneUnbekanntBereich(svg, nichtDarstellbar, {
      breite: tatsaechlicheBreite,
      yStart: nichtDarstellbarStart,
      farbeFn: (d) => CAT_COLORS[ersteKategorie(d.record)] || CAT_COLORS.default,
      tooltipTextFn: (d) => baueUrkundenTooltipText(d.record),
      container: plotBereich
    })
    : 0;

  const gesamtHoehe = nichtDarstellbarStart + bereichsHoehe + 10;
  svg.attr('height', gesamtHoehe)
    .attr('viewBox', `0 0 ${tatsaechlicheBreite} ${gesamtHoehe}`)
    .attr('role', 'img')
    .attr('aria-label', `Kalender-Heatmap der Urkunden nach Monat und Tag, über alle Jahre aggregiert, Zeitraum ${instanz.aktiverZeitraum.von}–${instanz.aktiverZeitraum.bis + 9}`);

  svg.append('desc').text(
    'Zeilen: Monate. Spalten: Tage 1-31. Farbton (hell bis dunkel blau) zeigt, wie oft ' +
    'über den gewählten Zeitraum hinweg eine Urkunde auf diesen Kalendertag datiert wurde. ' +
    (zeigeUnsicherheit
      ? 'Urkunden ohne exaktes Tagesdatum erscheinen im grau hinterlegten Bereich unten. '
      : 'Urkunden ohne exaktes Tagesdatum sind über den Button "Unsicherheiten anzeigen" einblendbar. ') +
    'Gestrichelter roter Rand kennzeichnet Tage mit mindestens einer unsicher datierten ' +
    'Urkunde. Klick auf ein Feld öffnet die Liste der Urkunden dieses Tages.'
  );
}

function zeichneJahrzehntModus(gefiltert, zeigeUnsicherheit) {
  const { plotBereich, options, aktiverZeitraum } = instanz;
  const { auswertbar, nichtDarstellbar } = teileNachJahrzehntMonat(gefiltert);
  const zellen = gruppiereNachJahrzehntMonat(auswertbar);
  const maxAnzahl = d3.max(zellen, (z) => z.eintraege.length) || 1;
  const farbSkala = d3.scaleSequential(d3.interpolateBlues).domain([0, maxAnzahl]);
  aktualisiereLegende(maxAnzahl, farbSkala);

  const jahrzehnte = [];
  for (let j = aktiverZeitraum.von; j <= aktiverZeitraum.bis; j += JAHRZEHNT_SCHRITT) jahrzehnte.push(j);
  const anzahlSpalten = Math.max(jahrzehnte.length, 1);
  const anzahlZeilen = 12;

  const breite = options.width || ermittleVerfuegbareBreite(plotBereich);
  const zellenBreite = clamp((breite - RAND.links - RAND.rechts) / anzahlSpalten, ZELLENGROESSE_MIN, ZELLENGROESSE_MAX);
  const verfuegbareHoehe = options.height || ermittleVerfuegbareHoehe(plotBereich, { reserveUnten: 10 });
  const zellenHoehe = clamp((verfuegbareHoehe - RAND.oben) / anzahlZeilen, ZELLENGROESSE_MIN, ZELLENGROESSE_MAX);

  const tatsaechlicheBreite = RAND.links + anzahlSpalten * zellenBreite + RAND.rechts;
  const hoehePlot = RAND.oben + anzahlZeilen * zellenHoehe;

  const svg = d3.select(plotBereich).append('svg').attr('width', tatsaechlicheBreite);

  MONATSNAMEN.forEach((name, i) => {
    svg.append('text')
      .attr('class', 'kal-tick-text')
      .attr('x', RAND.links - 6).attr('y', RAND.oben + i * zellenHoehe + zellenHoehe / 2)
      .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
      .text(name);
  });

  const jahrzehntSchritt = ermittleLabelSchritt(zellenBreite, MIN_JAHRZEHNT_LABEL_ABSTAND);
  jahrzehnte.forEach((jahrzehnt, i) => {
    if (i % jahrzehntSchritt !== 0) return;
    svg.append('text')
      .attr('class', 'kal-tick-text')
      .attr('x', RAND.links + i * zellenBreite + zellenBreite / 2)
      .attr('y', RAND.oben + anzahlZeilen * zellenHoehe + 16)
      .attr('text-anchor', 'middle')
      .text(jahrzehnt);
  });

  // Punkt 3: "Falls die Jahrzehnt × Monat-Ansicht andere Achsdimensionen hat ...
  // dort passend Jahrzehnt statt Tag verwenden" - hat sie (siehe Dateikopf-
  // Kommentar/Auftrag Punkt 3).
  svg.append('text')
    .attr('class', 'kal-achsentitel')
    .attr('x', RAND.links + (anzahlSpalten * zellenBreite) / 2)
    .attr('y', hoehePlot + RAND.unten - 6)
    .attr('text-anchor', 'middle')
    .attr('font-size', ACHSENTITEL_SCHRIFTGROESSE)
    .text('Jahrzehnt');
  svg.append('text')
    .attr('class', 'kal-achsentitel')
    .attr('transform', `translate(14,${RAND.oben + (anzahlZeilen * zellenHoehe) / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle')
    .attr('font-size', ACHSENTITEL_SCHRIFTGROESSE)
    .text('Monat');

  const zellenMap = new Map(zellen.map((z) => [`${z.jahrzehnt}-${z.monat}`, z]));
  const alleZellenDaten = [];
  jahrzehnte.forEach((jahrzehnt, spalte) => {
    for (let monat = 1; monat <= 12; monat += 1) {
      const basis = zellenMap.get(`${jahrzehnt}-${monat}`) || { jahrzehnt, monat, eintraege: [] };
      alleZellenDaten.push({ ...basis, x: RAND.links + spalte * zellenBreite, y: RAND.oben + (monat - 1) * zellenHoehe });
    }
  });
  zeichneZellen(svg, alleZellenDaten, farbSkala, zellenBreite, zellenHoehe, zeigeUnsicherheit, true, plotBereich);

  // KORREKTUR (siehe zeichneTagModus() für den ausführlichen Kommentar zu
  // Punkt 2 - identisches Muster hier für den Jahrzehnt-Modus).
  const nichtDarstellbarStart = hoehePlot + RAND.unten;
  const bereichsHoehe = zeigeUnsicherheit
    ? zeichneUnbekanntBereich(svg, nichtDarstellbar, {
      breite: tatsaechlicheBreite,
      yStart: nichtDarstellbarStart,
      farbeFn: (d) => CAT_COLORS[ersteKategorie(d.record)] || CAT_COLORS.default,
      tooltipTextFn: (d) => baueUrkundenTooltipText(d.record),
      container: plotBereich
    })
    : 0;

  const gesamtHoehe = nichtDarstellbarStart + bereichsHoehe + 10;
  svg.attr('height', gesamtHoehe)
    .attr('viewBox', `0 0 ${tatsaechlicheBreite} ${gesamtHoehe}`)
    .attr('role', 'img')
    .attr('aria-label', `Kalender-Heatmap der Urkunden nach Jahrzehnt und Monat, Zeitraum ${aktiverZeitraum.von}–${aktiverZeitraum.bis + 9}`);

  svg.append('desc').text(
    'Zeilen: Monate. Spalten: Jahrzehnte im gewählten Zeitraum. Farbton (hell bis dunkel ' +
    'blau) zeigt, wie viele Urkunden mit bekanntem Monat in dieses Jahrzehnt fallen. ' +
    (zeigeUnsicherheit
      ? 'Urkunden ohne auswertbaren Monat oder ohne Jahr erscheinen im grau hinterlegten Bereich unten. '
      : 'Urkunden ohne auswertbaren Monat oder ohne Jahr sind über den Button "Unsicherheiten anzeigen" einblendbar. ') +
    'Gestrichelter roter Rand kennzeichnet Zellen mit mindestens einer ' +
    'unsicher datierten Urkunde. Klick auf ein Feld öffnet die Liste der Urkunden dieses ' +
    'Jahrzehnts/Monats.'
  );
}

function zeichnePlot() {
  const { plotBereich, records, options, aktiverZeitraum, ansichtsModus } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;

  // Punkt 4: Mindestgrößen-Platzhalter (dasselbe Muster wie zeitachse.js) -
  // unterhalb des Schwellenwerts wird NICHTS von der eigentlichen Visualisierung
  // gebaut, auch nicht die Werkzeugleiste (Modus-Umschaltung/Zeitraum-Regler).
  // Kleinauftrag "Legenden-Position anpassen" (siehe CHANGELOG): die Legende
  // ist wieder Teil von .kal-werkzeugleiste (siehe baueWerkzeugleiste()) -
  // das Verstecken der Werkzeugleiste hier deckt sie damit automatisch mit ab,
  // kein separates instanz.legendeZeile.hidden mehr nötig.
  if (istBildschirmZuKlein(window.innerWidth, window.innerHeight)) {
    instanz.werkzeugleiste.hidden = true;
    plotBereich.innerHTML = '';
    plotBereich.appendChild(baueBildschirmHinweis());
    return;
  }
  instanz.werkzeugleiste.hidden = false;
  plotBereich.innerHTML = '';

  // Punkt 2: Zeitraum-Filter - Records MIT Jahr werden auf [von, bis+9]
  // eingegrenzt, Records OHNE Jahr bleiben immer sichtbar (Abschnitt 12: nie
  // stillschweigend ausblenden - ein Record ohne Jahr kann nicht "aus einem
  // Jahrzehnt herausfallen", er hatte nie eines).
  const gefiltert = records.filter((record) => {
    const jahr = parseJahr(record);
    return jahr === null || (jahr >= aktiverZeitraum.von && jahr <= aktiverZeitraum.bis + (JAHRZEHNT_SCHRITT - 1));
  });

  if (ansichtsModus === 'tag') {
    zeichneTagModus(gefiltert, zeigeUnsicherheit);
  } else {
    zeichneJahrzehntModus(gefiltert, zeigeUnsicherheit);
  }
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  container.innerHTML = '';
  container.style.position = 'relative';
  fuegeStyleEin(container);
  fuegeSidebarStyleEin(container);
  fuegeBildschirmHinweisStyleEin(container);

  // Punkt 5: Info-Button-Anker - eigener, dauerhafter Streifen oben rechts, NIE
  // von zeichnePlot() angetastet (dasselbe Muster wie der Icicle-Bugfix "Icicle
  // Info-Button-Position korrigieren": ein echter Streifen im Dokumentfluss statt
  // eines absolut positionierten Ankers, der über Datenelemente geraten könnte -
  // die Kalender-Heatmap füllt wie Icicle ihre volle Breite bis zum rechten Rand).
  //
  // BUGFIX ("Info-Button-Absturz in Kalender-Heatmap", siehe CHANGELOG):
  // der Button wurde hier zuvor bewusst NICHT erzeugt, sondern erst später
  // (aufgerufen aus zeichneTagModus()/zeichneJahrzehntModus()) - diese
  // beiden laufen aber NIE, wenn zeichnePlot() wegen istBildschirmZuKlein()
  // vorzeitig mit dem Mindestgrößen-Platzhalter zurückkehrt (siehe dortiger
  // Kommentar). instanz.infoButton blieb dadurch bei einem ersten Zeichnen
  // unterhalb der 900×500px-Schwelle dauerhaft `null` - ein anschließender
  // destroy()-Aufruf (Ansichtswechsel) warf `TypeError: Cannot read
  // properties of null (reading 'destroy')`, was wiederum ansichtWechseln.js'
  // wirdGewechselt-Flag dauerhaft blockierte (siehe dortiger Bugfix, Teil B).
  // Fix: der Button wird jetzt HIER, unconditional, erzeugt - instanz.infoButton
  // ist dadurch ab sofort NIE mehr `null`, unabhängig vom Bildschirmzustand.
  // Seit Auftrag "Kalender-Legende zurück..." (siehe Dateikopf-Kommentar) ist
  // KALENDER_INFO_TEXT wieder vollständig statisch - der Button wird daher
  // NUR noch hier erzeugt und nirgends mehr destroy()/neu gebaut; der
  // `if (instanz.infoButton)`-Guard in destroy() bleibt trotzdem als reine
  // Absicherung bestehen (schadet nicht, greift nur nie mehr wegen `null`).
  const infoButtonZeile = document.createElement('div');
  infoButtonZeile.className = 'kal-info-button-zeile';
  container.appendChild(infoButtonZeile);
  const infoButton = erzeugeInfoButton(infoButtonZeile, {
    text: KALENDER_INFO_TEXT,
    ariaLabel: 'Erklärung zur Kalender-Heatmap'
  });

  // Werkzeugleiste (Modus-Umschaltung, Zeitraum-Regler, Legende) wird EINMAL
  // gebaut (baueWerkzeugleiste()) und nie komplett neu erzeugt - ein Redraw
  // (Filteränderung, Resize, Unsicherheiten-Toggle) würde sonst eine gerade in
  // Bearbeitung befindliche Regler-Position (vor "Anwenden") verwerfen. Nur der
  // Plot-Bereich (SVG) wird von zeichnePlot() bei jedem Aufruf neu gezeichnet -
  // dasselbe Grundmuster wie treemap.js/circlePacking.js' Werkzeugleiste mit
  // Zurück-Button/Titel, hier zusätzlich mit Live-Zustand (Regler-Drag).
  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'kal-werkzeugleiste';
  container.appendChild(werkzeugleiste);

  const plotBereich = document.createElement('div');
  plotBereich.className = 'kal-plot-bereich';
  container.appendChild(plotBereich);

  const sidebar = baueSidebarGeruest(container);

  const jahresSpanneVoll = ermittleDatenJahresSpanneGerundet(data);

  // legendeFarbenElement/legendeMaxElement werden erst in baueWerkzeugleiste()
  // erzeugt (Kleinauftrag "Legenden-Position anpassen", siehe CHANGELOG - die
  // Legende ist jetzt Teil der Werkzeugleiste, nicht mehr eine eigene Zeile)
  // und dort direkt auf instanz geschrieben; hier nur als Platzhalter
  // deklariert, damit die instanz-Feldliste an einer Stelle sichtbar bleibt.
  instanz = {
    container,
    werkzeugleiste,
    legendeFarbenElement: null,
    legendeMaxElement: null,
    plotBereich,
    sidebar,
    infoButtonZeile,
    infoButton,
    records: data,
    options: { showUncertainty: true, width: null, height: null, ...options },
    ansichtsModus: 'tag',
    jahresSpanneVoll,
    aktiverZeitraum: { von: jahresSpanneVoll[0], bis: jahresSpanneVoll[1] },
    modusButtons: {},
    ausgewaehlteZelle: null
  };
  sidebar.schliessenBtn.addEventListener('click', schliesseZellenListe);

  baueWerkzeugleiste();
  zeichnePlot();
}

// KORREKTUR (Auftrag "Kalender-Legende zurück, Sidebar-Navigation isolieren,
// Expand-Umrandung", Punkt 2, siehe Dateikopf-Kommentar): "Unsicherheiten
// anzeigen" öffnet/schließt keine Sidebar mehr - options.showUncertainty
// (hier gesetzt) ist jetzt direkt die Sichtbarkeits-Bedingung für die "Nicht
// darstellbar"-Tabelle in zeichneTagModus()/zeichneJahrzehntModus(), ein
// einfacher zeichnePlot()-Aufruf genügt dafür (kein gesonderter
// Wertwechsel-Vergleich mehr nötig). Die Sidebar bleibt dabei unbeteiligt -
// eine ggf. vom Zellklick (Punkt 5b) noch offene Instanz wird hier bewusst
// NICHT angetastet (weder geöffnet noch geschlossen).
export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichnePlot();
}

export function destroy() {
  if (!instanz) return;
  // Zweite Absicherung (siehe Bugfix-Kommentar in render()): instanz.infoButton
  // sollte durch die render()-Änderung nie mehr `null` sein, der Guard bleibt
  // trotzdem stehen - kostet nichts, verhindert aber zuverlässig jeden
  // erneuten TypeError hier, falls doch einmal ein Pfad entsteht, der ihn
  // nicht setzt.
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
