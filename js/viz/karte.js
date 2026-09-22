// js/viz/karte.js
// Karte der Urkunden: ein Marker je Ort, Radius nach Häufigkeit (Abschnitt 9:
// "räumliche Muster und Häufungen"). Modul-Interface siehe Abschnitt 5.
// Voraussetzung: Leaflet 1.9 global geladen (<script>/<link> in index.html, wie D3),
// Orts-Auflösung über js/utils/urkundenOrte.js (Abschnitt 8: namensbasiert).
//
// Farbe: ein einzelner technischer Marker-Ton (kein Kategorie-Bezug, die Karte zeigt
// räumliche Häufung, nicht Kategorie-Zusammensetzung) - Größe ist der informations-
// tragende Kanal, nicht Farbe (Abschnitt 10).
//
// AUFTRAG "Karte – Unsicherheiten-Sidebar, Zeitregler, unverortbare Urkunden
// ausblenden" + KORREKTURAUFTRAG "Karte – Sidebar-Filter, Live-Zeitregler,
// Rubrik 'völlig unklare Orte'":
//
// Punkt 1 (unverortbare Urkunden nicht mehr anzeigen): die bisherige
// baueNichtVerortbarPanel()-Liste unterhalb der Karte ist ERSATZLOS entfernt.
// `baueOrtsAggregation()` verwirft nicht auflösbare Records direkt.
//
// KORREKTUR Punkt 1 (Sidebar-Filter, ROOT CAUSE): die ERSTE Fassung dieses
// Moduls interpretierte "unsicherer Ort" fälschlich über urkunden.csv'
// ZEILENWEISES `orte_unsicher`-Feld (Ko-Vorkommen von "Ort X in dieser
// Zeile genannt" UND "diese Zeile hat irgendein unsicheres Ortsdetail") -
// das lieferte 86 Orte, aber mit KOMPLETT FALSCHER Zusammensetzung
// (alle 86 hatten zufällig Koordinaten, 0 ohne). Live-Diagnose (siehe
// Selbstauskunft im Chat): die tatsächlich korrekte, vom Auftrag gemeinte
// Quelle ist orte.csv' EIGENES `orte_unsicher`-Feld (eine Eigenschaft des
// ORTES selbst, nicht der einzelnen Urkunde-Zeile) - DAS liefert exakt
// 86 Orte (63 mit, 23 ohne Koordinaten), deckungsgleich mit den vorab
// verifizierten Zahlen. orte.csv' `unsicherheit_anmerkung` ist ein
// automatisch generierter Text der Form "Ortsidentifikation in N Urkunde(n)
// als unsicher markiert (Signatur(en): SIG1|SIG2)." - JEDE gelistete
// Signatur wird per Textabgleich gegen die echten urkunden.csv-Signaturen
// herausgefiltert (ermittleUnsichereUrkunden() unten, wortgrenzen-sicher
// gegen Präfix-Kollisionen wie "StaAKr-0001" vs "StaAKr-0001b" - live
// geprüft). 4 von 86 Orten benennen keine (auflösbare) Signatur in ihrer
// Anmerkung (freier Text wie "Koordinaten noch nicht ermittelt") - diese
// zeigen dann eine leere Urkundenliste, aber weiterhin die Anmerkung als
// Begründung (Datenehrlichkeit statt erfundener Verknüpfung). Klick auf
// eine Signatur ruft sidebar.js' bereits etablierte zeigeUrkundenDetail()
// auf (volle Detailansicht inkl. Fotogalerie/Lightbox, wiederverwendet statt
// neu gebaut) - ein zusätzlicher, selbst verdrahteter "← Zurück"-Handler auf
// demselben zurueckBtn (sidebar.js' eigener Handler bleibt als No-Op
// bestehen, da dessen `_urkundenListe`-Zustand hier nie gesetzt wird) führt
// zurück zur Orte-Übersicht, da die generische zeigeUrkundenListe()/
// `_urkundenListe`-Maschinerie eine FLACHE Liste erwartet, nicht die hier
// nötige, nach Ort gruppierte Struktur.
//
// KORREKTUR Punkt 2 (Live-Zeitregler ohne "Anwenden"): der "Anwenden"-Button
// entfällt, beide Slider lösen bei JEDEM 'input'-Ereignis (Ziehen, nicht nur
// Loslassen) eine leicht entprellte (80ms, siehe DEBOUNCE_MS) Kartenaktuali-
// sierung aus. Root-Cause-Überlegung: ein voller zeichneKarte()-Aufruf pro
// Debounce-Tick würde container.innerHTML='' auslösen und damit AUCH den
// gerade per Maus/Touch gezogenen Slider selbst zerstören - ein natives
// <input type="range"> verliert die laufende Ziehgeste, sobald das Element
// durch ein NEUES ersetzt wird (Browser-Drag-Tracking hängt am konkreten
// DOM-Knoten). Deshalb Trennung in zwei Funktionen: zeichneKarte() baut die
// Werkzeugleiste/Karte EINMAL auf, aktualisiereMarker() (neu) leert und
// befüllt NUR die Leaflet-Marker-Ebene (instanz.markerLayer) - Letztere ist
// die einzige Funktion, die während des Ziehens läuft, Regler/Karte-DOM
// bleiben dabei unangetastet.
//
// Punkt 3 (Zeitregler-Granularität/-Aufbau): weiterhin 1:1 nach
// kalenderHeatmap.js' Dual-Handle-Muster (zwei überlappende native
// <input type="range">, 10-Jahres-Schritte) - bewusst lokal dupliziert
// (Nicht-Ziel: keine Änderung an kalenderHeatmap.js, dessen Regler-Bau ist
// nicht exportiert).
//
// KORREKTUR Punkt 3 ("Völlig unklare Orte"): die 23 Orte ohne Koordinaten
// (in orte.csv' `orte_unsicher=ja`-Zeilen, aber ohne auswertbares lat/lon)
// erscheinen als EIGENER, ERSTER Abschnitt in der Sidebar - sie sind
// strukturell nie Teil von `ortsVerzeichnis` (js/utils/urkundenOrte.js'
// ladeOrtsVerzeichnis() verwirft Zeilen ohne Koordinaten bereits beim Laden,
// siehe dortiger Kommentar "kein Rateweise-Platzhalterwert für fehlende
// Koordinaten") und bekommen deshalb konsequent auch KEINEN Kartenmarker -
// dieselbe Datenehrlichkeit, hier nur zusätzlich SICHTBAR gemacht statt
// stillschweigend zu fehlen. Da orte.csv (Betroffene Dateien: nur karte.js)
// hierfür zusätzliche, von js/utils/urkundenOrte.js nicht exportierte Felder
// braucht (das dortige `ladeOrtsVerzeichnis()` gibt nur `orteUnsicher`
// zurück, nicht `unsicherheit_anmerkung`, UND verwirft koordinatenlose
// Zeilen komplett), lädt dieses Modul orte.csv für den Unsicherheiten-Modus
// EIGENSTÄNDIG über core/dataLoader.js' bereits geteilte ladeCSV() - parallel
// zu, nicht anstelle von urkundenOrte.js' ladeOrtsVerzeichnis() (die bleibt
// für den normalen/Zeitregler-Modus unverändert im Einsatz).
//
// Punkt 4 (gegenseitiger Ausschluss) - unverändert seit der ersten Fassung:
// der "Unsicherheiten anzeigen"-Button lebt in app.js' eigenem, von diesem
// Modul nicht erreichbaren Container - der Ausschluss bleibt deshalb
// PRÄVENTIV (Zeitregler disabled + zurückgesetzt, sobald der Unsicherheiten-
// Modus aktiv ist), siehe Selbstauskunft im Chat für die volle Herleitung.
//
// KORREKTURAUFTRAG "Karte – vier Fixes":
//
// Punkt 1 (Info-Button/Attribution hinter der Sidebar): Live-Diagnose per
// `document.elementFromPoint()` ergab den ROOT CAUSE für BEIDE Punkt 1 UND
// Punkt 3 zugleich: `.karte-werkzeugleiste` trägt `position:relative;
// z-index:900` (s.o., wegen des Info-Popovers über Leaflets Panes nötig) -
// das liegt automatisch ÜBER der Sidebar (z-index 500, js/utils/sidebar.js),
// unabhängig davon, ob der Info-Button selbst getroffen wird. Ebenso liegt
// Leaflets EIGENER `.leaflet-control-container` (eigene, von Leaflet intern
// verwaltete Stapel-Reihenfolge, unten rechts die Attribution) über der
// Sidebar. Fix: eine reine CSS-Regel mit `:has()` (bereits etabliertes
// Muster im Projekt, siehe js/utils/zoomSteuerung.js) blendet BEIDE
// (`.karte-werkzeugleiste` komplett UND nur die rechte untere Leaflet-Ecke,
// NICHT die linke obere mit den Zoom-Buttons - die überlappt die
// rechtsseitige Sidebar nie) per `visibility:hidden` aus, sobald die
// Sidebar tatsächlich `.offen` ist (nicht bloß, solange
// `options.showUncertainty` aktiv ist - die Sidebar kann davon unabhängig
// per Schließen-Button geschlossen werden, siehe render() unten, JEDE
// Sichtbarkeitslogik reagiert daher rein auf `.bestand-sidebar.offen`
// selbst, nicht auf den Modus). `visibility:hidden` statt `display:none`,
// damit die Karte selbst nicht neu positioniert wird (Leaflets interne
// Pixel-Koordinaten cachen die Container-Position - ein Reflow durch
// wegfallende Werkzeugleisten-Höhe würde ohne invalidateSize() zu
// Tile-Versatz führen). Die Werkzeugleiste ist ohnehin nur bei geöffneter
// Sidebar betroffen, also GENAU dann, wenn ihr einziger interaktiver Teil
// (der Zeitregler) bereits deaktiviert ist (Punkt 4 oben) - kein
// Funktionsverlust durchs Ausblenden.
//
// Punkt 3 (Klickfläche der Signatur-Buttons): war KEIN eigenständiger Bug,
// sondern dieselbe Ursache wie Punkt 1 - die deaktivierte Regler-Gruppe
// samt Hinweistext "(deaktiviert, solange ...)" wächst durch Flex-Wrap in
// der Höhe und reicht dadurch bis in den Bereich der Sidebar-Körper hinein;
// da `.karte-werkzeugleiste` bei z-index:900 über der Sidebar liegt, fängt
// sie dort Klicks ab - reproduzierbar exakt beim ERSTEN Sidebar-Eintrag
// (räumlich am nächsten am unteren Rand der Werkzeugleiste), live per
// `elementFromPoint()` an mehreren Punkten der ersten Signatur-Schaltfläche
// bestätigt (oberste ~3px trafen den Button, der Rest traf
// `.karte-regler-gruppe.deaktiviert`). Der Punkt-1-Fix (Werkzeugleiste
// komplett ausgeblendet, sobald die Sidebar offen ist) behebt dies
// automatisch mit, keine zusätzliche Änderung nötig.
//
// Punkt 4 (robustere Signatur-Zuordnung): ermittleUrkundenNachOrtsname()
// (neu, unten) ergänzt die reine Anmerkungs-Textsuche (ermittleUnsichere-
// Urkunden(), s.o., unverändert) um eine direkte, namensbasierte Suche in
// urkunden.csv (dieselbe "namensbasiert", nicht orte_id-basiert"-Konvention
// wie js/utils/urkundenOrte.js' loeseOrteAuf(), Abschnitt 8) - Ergänzung,
// keine Ersetzung (Auftrag, wörtlich), Ergebnis-Dedublizierung per
// Objekt-Referenz (beide Quellen filtern denselben `records`-Array, ein
// `Set` reicht). Live-Diagnose ergab: die beiden im Auftrag genannten Orte
// zeigen ein ECHTES Datenqualitäts-Problem, nicht bloß eine
// "andere Formulierung" - Markt Ascha zitiert in seiner Anmerkung die
// Signatur "StaAKr-0914", die in urkunden.csv NIRGENDS existiert (per
// Volltextsuche verifiziert - dieselbe Erkenntnis wie in der vorigen
// Korrektur), kann also nie auflösbar sein; die neue namensbasierte Suche
// findet trotzdem die tatsächlich zu "Markt Ascha" gehörende Urkunde
// (StaAKr-0792, orte-Feld exakt "Markt Ascha"). Neunkirchen zitiert
// "StaAKr-0765" - diese Signatur EXISTIERT zwar (daher fand die reine
// Textsuche sie bereits vorher, live bestätigt), gehört aber laut ihrem
// EIGENEN orte-Feld zu "Wien", nicht zu Neunkirchen (mutmaßlich ein
// Signatur-Zahlendreher im Anmerkungstext selbst) - die neue namensbasierte
// Suche ergänzt daher zusätzlich StaAKr-0673b (orte-Feld exakt
// "Neunkirchen"), Neunkirchen zeigt am Ende BEIDE Signaturen, nicht nur die
// im Auftrag genannte eine (siehe Selbstauskunft im Chat für die volle
// Herleitung und die Abweichung vom wörtlichen Akzeptanzkriterium).
//
// KORREKTURAUFTRAG "Karte – Klick auf Ort-Marker öffnet Sidebar
// (kontextabhängig)":
//
// Punkt 1 (Normalmodus, Marker-Klick öffnet Urkunden-Sidebar): die Sidebar
// (baueSidebarGeruest()) wird jetzt IMMER aufgebaut, nicht mehr nur im
// Unsicherheiten-Modus - im Normalmodus bleibt sie beim Aufbau geschlossen
// (Ausgangszustand von baueSidebarGeruest(), kein `.offen`) und öffnet sich
// erst durch einen Marker-Klick, über sidebar.js' bereits etablierten,
// generischen Einstiegspunkt zeigeUrkundenSidebar() (genau 1 Urkunde -> volle
// Detailansicht, mehrere -> kompakte Liste mit Weiterklick zur Detailansicht
// - exakt das im Auftrag geforderte, bereits vorhandene Muster, unverändert
// wiederverwendet, keine eigene Liste/Detail-Logik nötig). Die zugehörigen
// Urkunden kommen aus `ortsEintrag.eintraege` (baueOrtsAggregation() oben,
// bereits vorhanden).
//
// Punkt 2 (Unsicherheiten-Modus, Marker-Klick springt statt zu wechseln):
// springeZuOrtsAbschnitt() (neu, unten) ruft zuerst oeffneUnsichereOrteSidebar()
// auf (baut IMMER die Übersicht, nie die Detailansicht - idempotent, holt
// die Sidebar auch aus einer offenen Urkunden-Detailansicht zurück zur
// Übersicht) und scrollt/hervorhebt danach zum passenden `.karte-sidebar-ort`-
// Block (per Namensvergleich gegen `.karte-sidebar-ort-titel`, kein
// zusätzliches ID-Attribut nötig - derselbe Textvergleichs-Ansatz wie
// oeffneUnsichereOrteSidebar() selbst). Kurze, per CSS-Transition
// ausblendende Hervorhebung (`.karte-sidebar-ort-hervorgehoben`, s.u.).
//
// Beide Punkte teilen sich denselben Marker-Klick-Einstiegspunkt in
// zeichneMarkerFuerOrte() (neu: `aktiviere()`, an Klick UND Enter/Leertaste
// gekoppelt - dieselbe Tastatur-Äquivalenz wie sidebar.js'
// baueUrkundenListeInhalt(), konsequent zu Ende geführt, da Marker bereits
// zuvor `tabindex="0"` für den Tooltip trugen, aber noch keine Tastatur-
// Aktivierung hatten) - verzweigt per `istUnsicherModus`, demselben Flag,
// das zeichneMarkerFuerOrte() ohnehin schon für Farbe/Tooltip nutzt.
//
// Nebeneffekt (bewusst in Kauf genommen, siehe Selbstauskunft im Chat): die
// Punkt-1/3-CSS-Regel von weiter oben (Werkzeugleiste/Attribution
// ausgeblendet, sobald `.bestand-sidebar.offen`) greift jetzt auch im
// Normalmodus, sobald ein Marker-Klick die Sidebar öffnet - verhindert dort
// denselben Überlappungs-/Klickflächen-Fehler, den Punkt 1/3 der vorigen
// Korrektur für den Unsicherheiten-Modus behoben hat, auch für den (dort
// nicht deaktivierten) Zeitregler.
//
// KLEINAUFTRAG "Karte – deutlichere Hervorhebung & längerer Zeitregler":
//
// Punkt 1 (deutlichere Hervorhebung): die vorige Fassung entfernte die
// Hervorhebung bereits nach 200ms (siehe HERVORHEBUNG_DAUER_MS, vorher
// hartcodiert) - zu kurz, um sie zuverlässig wahrzunehmen. Jetzt
// HERVORHEBUNG_DAUER_MS = 2500 (Auftrag: "2-3 Sekunden") UND ein deutlich
// kräftigerer Effekt statt der reinen Hintergrundfarbe: ein farbiger Rahmen
// (`outline`, nicht `border` - ändert die Bo­x-Größe nicht, kein Reflow der
// Nachbar-Blöcke) in Orange (`#e07820`/`#fce6cc`) - bewusst dieselbe
// Farbkombination wie ganttDiagramm.js' bereits etabliertes
// `.gantt-hervorgehoben` (Wiederverwendung statt neuer Farbe), UND bewusst
// NICHT Rot/Blau: Rot kollidiert mit der bestehenden Unsicherheits-
// Kennzeichnung (`--unsicher`/Markerfarbe `#c0392b`), Blau mit der
// Marker-Füllfarbe (`MARKER_FARBE`) und dem App-Akzent (`--accent`) - Orange
// ist im gesamten Sidebar-Kontext sonst ungenutzt und hebt sich klar ab.
// `outline`/`background-color` als Übergang auf der BASIS-Regel
// `.karte-sidebar-ort` definiert (nicht nur auf der `.hervorgehoben`-
// Variante) - Grund: eine CSS-Transition greift nur, wenn die Eigenschaft in
// BEIDEN Zuständen existiert UND dieselbe Regel während des ganzen
// Übergangs matcht; da die Klasse per JS wieder ENTFERNT wird (nicht nur ihr
// Style geändert), müsste die Transition sonst auf der Basis-Regel liegen,
// damit auch das Ausblenden sanft (nicht abrupt) erfolgt.
//
// Punkt 2 (längerer Zeitregler): `.karte-slider-wrapper`s Breite von 200px
// auf 320px erhöht (Auftrag: "spürbar breiter", einzelne Jahrzehnt-Schritte
// leichter präzise treffbar) - die Werkzeugleiste selbst bleibt dank
// `flex-wrap:wrap` (bereits vorhanden) unverzerrt, bricht bei schmalen
// Containern lediglich in eine zweite Zeile um statt zu überlaufen, live
// geprüft.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { ladeOrtsVerzeichnis, loeseOrteAuf } from '../utils/urkundenOrte.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { baueSidebarGeruest, fuegeSidebarStyleEin, schliesseSidebar, zeigeUrkundenDetail, zeigeUrkundenSidebar } from '../utils/sidebar.js';
import { parseJahr } from '../utils/urkundenZeit.js';
import { ladeCSV } from '../core/dataLoader.js';

// Punkt 5 (Vorschlag, siehe Selbstauskunft im Chat - noch nicht freigegeben):
// dritter Absatz zum neuen Verhalten ergänzt.
const KARTE_INFO_TEXT = `Diese Karte zeigt alle in den Urkunden genannten Orte. Die Größe eines Punktes entspricht der Häufigkeit der Nennungen. Ein gestrichelter Rand kennzeichnet Orte mit unsicherer Identifizierung.

Wichtig: Ein genannter Ort bedeutet nicht zwingend, dass die Urkunde dort ausgestellt wurde oder ein Ereignis dort stattfand – die Karte zeigt Ortsnennungen, keine Ausstellungsorte oder Reisewege.

Urkunden ohne erkennbaren Ort werden hier nicht dargestellt. Der Zeitregler grenzt die Karte auf einen Jahrzehnt-Zeitraum ein; „Unsicherheiten anzeigen" blendet stattdessen ausschließlich Orte mit unsicherer Identifizierung ein (mit Liste in der Seitenleiste, inklusive der Orte ohne jede Koordinate) – beide lassen sich nicht gleichzeitig nutzen.`;

const MARKER_FARBE = '#1a4d8f';
const START_ZENTRUM = [48.42, 15.6]; // Krems an der Donau
const START_ZOOM = 7;
const JAHRZEHNT_SCHRITT = 10;
const DEBOUNCE_MS = 80;
const HERVORHEBUNG_DAUER_MS = 2500;

let instanz = null; // { container, records, options, karte, markerLayer, infoButton, sidebar, aktiverZeitraum, ortsVerzeichnis, unsichereOrteDaten, debounceTimer } – eine aktive Karte pro Modul-Ladung

// Punkt 1 (siehe Dateikopf-Kommentar): nicht auflösbare Records werden
// direkt verworfen, nicht mehr gesammelt.
function baueOrtsAggregation(records, ortsVerzeichnis) {
  const aggregation = new Map();
  records.forEach((record) => {
    const { aufgeloest } = loeseOrteAuf(record, ortsVerzeichnis);
    aufgeloest.forEach((ort) => {
      if (!aggregation.has(ort.name)) {
        aggregation.set(ort.name, { name: ort.name, lat: ort.lat, lon: ort.lon, anzahl: 0, eintraege: [] });
      }
      const eintrag = aggregation.get(ort.name);
      eintrag.anzahl += 1;
      eintrag.eintraege.push(record);
    });
  });
  return aggregation;
}

// Frühestes/spätestes Jahr über ALLE Records, auf das jeweilige Jahrzehnt
// abgerundet - identische Formel wie kalenderHeatmap.js' (nicht
// exportierte) ermittleDatenJahresSpanneGerundet().
function ermittleJahresSpanneGerundet(records) {
  const jahre = records.map((r) => parseJahr(r)).filter((j) => j !== null);
  if (jahre.length === 0) return [1000, 2000];
  const minJahr = Math.min(...jahre);
  const maxJahr = Math.max(...jahre);
  return [Math.floor(minJahr / JAHRZEHNT_SCHRITT) * JAHRZEHNT_SCHRITT, Math.floor(maxJahr / JAHRZEHNT_SCHRITT) * JAHRZEHNT_SCHRITT];
}

function ortHatJahrImZeitraum(ortsEintrag, zeitraum) {
  return ortsEintrag.eintraege.some((record) => {
    const jahr = parseJahr(record);
    return jahr !== null && jahr >= zeitraum.von && jahr <= zeitraum.bis + (JAHRZEHNT_SCHRITT - 1);
  });
}

function baueMarkerTooltip(ortsEintrag) {
  return [ortsEintrag.name, `${ortsEintrag.anzahl} Urkunde(n)`].join('\n');
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// KORREKTUR Punkt 1 (siehe Dateikopf-Kommentar): extrahiert aus einer
// orte.csv-Anmerkung wie "... (Signatur(en): StaAKr-0425|StaAKr-0428)." die
// tatsächlich referenzierten Urkunden-Records - per Textabgleich gegen ALLE
// echten Signaturen (nicht per Regex-Muster auf die Anmerkungs-Syntax
// selbst, da 5 von 86 Anmerkungen abweichend formuliert sind, siehe
// Selbstauskunft) - `(?![a-zA-Z0-9])` verhindert, dass eine kürzere Signatur
// fälschlich innerhalb einer längeren mitzählt (z.B. "StaAKr-0001" in
// "StaAKr-0001b").
function ermittleUnsichereUrkunden(anmerkung, alleSignaturenAbsteigend, signaturZuRecord) {
  if (!anmerkung) return [];
  const gefunden = [];
  alleSignaturenAbsteigend.forEach((signatur) => {
    if (new RegExp(`${escapeRegex(signatur)}(?![a-zA-Z0-9])`).test(anmerkung)) {
      gefunden.push(signaturZuRecord.get(signatur));
    }
  });
  return gefunden;
}

// KORREKTUR Punkt 4 (siehe Dateikopf-Kommentar): direkte, namensbasierte
// Ergänzung zur reinen Anmerkungs-Textsuche oben - jede urkunden.csv-Zeile,
// deren `orte`-Feld diesen Ortsnamen exakt enthält (dieselbe
// Normalisierungs-Konvention wie js/utils/urkundenOrte.js' loeseOrteAuf()).
function ermittleUrkundenNachOrtsname(ortName, records) {
  return records.filter((record) => {
    const orteListe = Array.isArray(record.orte) ? record.orte : (record.orte ? [record.orte] : []);
    return orteListe.includes(ortName);
  });
}

// KORREKTUR Punkt 1/3 (siehe Dateikopf-Kommentar): lädt orte.csv
// EIGENSTÄNDIG (nicht über urkundenOrte.js' ladeOrtsVerzeichnis(), die
// koordinatenlose Zeilen verwirft und `unsicherheit_anmerkung` nicht
// durchreicht) und liefert die nach Koordinaten-Vorhandensein getrennten,
// alphabetisch sortierten Listen unsicherer Orte, je Ort bereits mit den
// tatsächlich zugehörigen Urkunden-Records angereichert.
async function ladeUnsichereOrteDaten(records) {
  const { records: orteRecords } = await ladeCSV('data/orte.csv');
  const signaturZuRecord = new Map(records.filter((r) => r.signatur).map((r) => [r.signatur, r]));
  const alleSignaturenAbsteigend = Array.from(signaturZuRecord.keys()).sort((a, b) => b.length - a.length);

  const unsichereOrteRecords = orteRecords.filter((r) => r.orte_unsicher);
  const voelligUnklar = [];
  const kartiert = [];

  unsichereOrteRecords.forEach((r) => {
    const lat = parseFloat(String(r.lat || '').replace(',', '.'));
    const lon = parseFloat(String(r.lon || '').replace(',', '.'));
    const hatKoordinaten = Number.isFinite(lat) && Number.isFinite(lon);
    const ausAnmerkung = ermittleUnsichereUrkunden(r.unsicherheit_anmerkung, alleSignaturenAbsteigend, signaturZuRecord).filter(Boolean);
    const ausOrtsname = ermittleUrkundenNachOrtsname(r.orte, records);
    const eintrag = {
      name: r.orte,
      anmerkung: r.unsicherheit_anmerkung || '(keine Anmerkung hinterlegt)',
      urkunden: Array.from(new Set([...ausAnmerkung, ...ausOrtsname])),
      lat: hatKoordinaten ? lat : null,
      lon: hatKoordinaten ? lon : null
    };
    (hatKoordinaten ? kartiert : voelligUnklar).push(eintrag);
  });

  const nachName = (a, b) => a.name.localeCompare(b.name, 'de');
  voelligUnklar.sort(nachName);
  kartiert.sort(nachName);
  return { voelligUnklar, kartiert };
}

// KORREKTUR Punkt 1 (siehe Dateikopf-Kommentar): ein Ort-Abschnitt - Name,
// die ortsbezogene Anmerkung (Begründung, gilt für alle darunter gelisteten
// Urkunden) und die tatsächlich betroffenen Urkunden als anklickbare
// Signatur-Schaltflächen (öffnen die volle Detailansicht).
function baueOrtAbschnitt(ort) {
  const block = document.createElement('div');
  block.className = 'karte-sidebar-ort';

  const titel = document.createElement('h5');
  titel.className = 'karte-sidebar-ort-titel';
  titel.textContent = ort.name;
  block.appendChild(titel);

  const anmerkung = document.createElement('p');
  anmerkung.className = 'karte-sidebar-ort-anmerkung';
  anmerkung.textContent = ort.anmerkung;
  block.appendChild(anmerkung);

  if (ort.urkunden.length === 0) {
    const hinweis = document.createElement('p');
    hinweis.className = 'karte-sidebar-ort-keine-urkunde';
    hinweis.textContent = 'Keine auswertbare Signatur im Datensatz zugeordnet.';
    block.appendChild(hinweis);
  } else {
    const liste = document.createElement('ul');
    liste.className = 'karte-sidebar-urkunden-liste';
    ort.urkunden.forEach((record) => {
      const item = document.createElement('li');
      const knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = 'karte-sidebar-signatur-btn';
      knopf.textContent = `${record.signatur || '(ohne Signatur)'} – ${record.datum || '(kein Datum)'}`;
      knopf.addEventListener('click', () => {
        zeigeUrkundenDetail(instanz.sidebar, record);
        // Punkt 1 (siehe Dateikopf-Kommentar): eigener "Zurück"-Weg zur
        // Orte-Übersicht, da sidebar.js' generische zeigeUrkundenListe()/
        // `_urkundenListe` eine FLACHE Liste erwartet, nicht unsere nach Ort
        // gruppierte Struktur - der zurueckBtn selbst und sein Klick-
        // Verhalten kommen aus render() (siehe dort), hier nur sichtbar
        // gemacht (zeigeUrkundenDetail() versteckt ihn sonst mangels
        // `_urkundenListe`).
        instanz.sidebar.zurueckBtn.hidden = false;
      });
      item.appendChild(knopf);
      liste.appendChild(item);
    });
    block.appendChild(liste);
  }

  return block;
}

function baueOrteAbschnittsListe(titelText, orte) {
  const abschnitt = document.createElement('section');
  abschnitt.className = 'karte-sidebar-abschnitt';
  const titel = document.createElement('h4');
  titel.className = 'karte-sidebar-abschnitt-titel';
  titel.textContent = `${titelText} (${orte.length})`;
  abschnitt.appendChild(titel);
  orte.forEach((ort) => abschnitt.appendChild(baueOrtAbschnitt(ort)));
  return abschnitt;
}

// KORREKTUR Punkt 3 (siehe Dateikopf-Kommentar): "Völlig unklare Orte" ZUERST,
// danach die kartierten, aber unsicheren Orte.
function oeffneUnsichereOrteSidebar() {
  const { voelligUnklar, kartiert } = instanz.unsichereOrteDaten;
  const { sidebar, titel, koerper, zurueckBtn } = instanz.sidebar;
  titel.textContent = `Unsichere Orte (${voelligUnklar.length + kartiert.length})`;
  koerper.innerHTML = '';
  koerper.appendChild(baueOrteAbschnittsListe('Völlig unklare Orte', voelligUnklar));
  koerper.appendChild(baueOrteAbschnittsListe('Kartierte, aber unsichere Orte', kartiert));
  zurueckBtn.hidden = true;
  sidebar.classList.add('offen');
  sidebar.setAttribute('aria-hidden', 'false');
}

// KORREKTURAUFTRAG "Karte – Klick auf Ort-Marker öffnet Sidebar", Punkt 2
// (siehe Dateikopf-Kommentar): baut IMMER zuerst die Übersicht auf (holt die
// Sidebar auch aus einer offenen Detailansicht zurück), springt danach zum
// passenden Ortsabschnitt und hebt ihn kurz hervor.
function springeZuOrtsAbschnitt(ortName) {
  oeffneUnsichereOrteSidebar();
  const titelElemente = instanz.sidebar.koerper.querySelectorAll('.karte-sidebar-ort-titel');
  const treffer = Array.from(titelElemente).find((t) => t.textContent === ortName);
  if (!treffer) return;
  const block = treffer.closest('.karte-sidebar-ort');
  block.scrollIntoView({ block: 'start' });
  block.classList.add('karte-sidebar-ort-hervorgehoben');
  setTimeout(() => block.classList.remove('karte-sidebar-ort-hervorgehoben'), HERVORHEBUNG_DAUER_MS);
}

// Info-Button-/Regler-Werkzeugleiste - eigene <style>-Injektion, weil
// zeichneKarte() den gesamten `container` bei jedem vollen Redraw leert
// (container.innerHTML='' unten) und ein einmalig in render() eingefügtes
// <style>-Element damit mitgelöscht würde - dasselbe "bei jedem Redraw neu
// einfügen"-Muster wie treemap.js' fuegeStyleEin().
function fuegeStyleEin(container) {
  const style = document.createElement('style');
  // position:relative + hoher z-index nötig, DAMIT DAS POPOVER SICHTBAR
  // ÜBER DER LEAFLET-KARTE LIEGT: Leaflet setzt seinen eigenen Panes
  // intern z-index-Werte bis 700 - 900 liegt sicher darüber.
  style.textContent = `
    .karte-werkzeugleiste { display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: var(--space-3); margin-bottom: 6px; position: relative; z-index: 900; }
    .karte-regler-gruppe { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;
      transition: opacity .15s ease; }
    .karte-regler-gruppe.deaktiviert { opacity: 0.45; }
    .karte-regler-label { font-size: var(--fs-sm); color: var(--text-muted); }
    .karte-regler-hinweis { font-size: var(--fs-sm); color: var(--text-muted); font-style: italic; }
    .karte-regler-anzeige { font-size: var(--fs-sm); font-weight: 600; min-width: 100px; }
    .karte-slider-wrapper { position: relative; width: 320px; height: 24px; }
    .karte-slider { position: absolute; top: 0; left: 0; width: 100%; height: 24px; margin: 0; background: none;
      pointer-events: none; -webkit-appearance: none; appearance: none; }
    .karte-slider::-webkit-slider-runnable-track { height: 4px; background: var(--border); border-radius: 2px; }
    .karte-slider::-moz-range-track { height: 4px; background: var(--border); border-radius: 2px; }
    .karte-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; pointer-events: auto;
      width: 18px; height: 18px; border-radius: 50%; background: var(--accent); border: 2px solid #fff;
      box-shadow: 0 0 0 1px var(--border); cursor: pointer; margin-top: -7px; }
    .karte-slider::-moz-range-thumb { pointer-events: auto; width: 18px; height: 18px; border-radius: 50%;
      background: var(--accent); border: 2px solid #fff; box-shadow: 0 0 0 1px var(--border); cursor: pointer; }
    .karte-slider:focus-visible::-webkit-slider-thumb { outline: 3px solid var(--accent); outline-offset: 2px; }
    .karte-slider:disabled::-webkit-slider-thumb { cursor: not-allowed; }
    .karte-regler-btn { min-height: 44px; padding: var(--space-2) var(--space-3); border: 1px solid var(--border);
      border-radius: var(--radius); background: var(--surface); font: inherit; font-size: var(--fs-sm); cursor: pointer; }
    .karte-regler-btn:hover { border-color: var(--accent); }
    .karte-regler-btn:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .karte-regler-btn:disabled { cursor: not-allowed; }
    .karte-sidebar-abschnitt { margin-bottom: var(--space-4); }
    .karte-sidebar-abschnitt-titel { margin: 0 0 var(--space-2) 0; }
    .karte-sidebar-ort { margin-bottom: var(--space-3); padding-bottom: var(--space-2); border-bottom: 1px solid var(--border);
      outline: 3px solid transparent; outline-offset: 3px; border-radius: var(--radius);
      transition: background-color .5s ease, outline-color .5s ease; }
    .karte-sidebar-ort-titel { margin: 0 0 4px 0; font-size: var(--fs-sm); }
    .karte-sidebar-ort-anmerkung { margin: 0 0 var(--space-2) 0; font-size: var(--fs-sm); color: var(--text-muted); font-style: italic; }
    .karte-sidebar-ort-keine-urkunde { margin: 0; font-size: var(--fs-sm); color: var(--text-muted); }
    .karte-sidebar-urkunden-liste { list-style: none; margin: 0; padding: 0; font-size: var(--fs-sm); display: flex; flex-direction: column; gap: 4px; }
    .karte-sidebar-signatur-btn { min-height: 32px; padding: 2px 8px; border: 1px solid var(--border); border-radius: var(--radius);
      background: var(--surface); font: inherit; font-size: var(--fs-sm); text-align: left; cursor: pointer; }
    .karte-sidebar-signatur-btn:hover { border-color: var(--accent); }
    .karte-sidebar-signatur-btn:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    /* KORREKTUR Punkt 1/3 (siehe Dateikopf-Kommentar): sobald die Sidebar
       tatsächlich offen ist, verschwinden die komplette Werkzeugleiste
       (Info-Button + der ohnehin deaktivierte Zeitregler, dessen
       Hinweistext-Zeilenumbruch sonst auch Klicks auf die ersten
       Sidebar-Einträge abfängt) und Leaflets eigene Attribution-Ecke unten
       rechts - die Zoom-Buttons oben links bleiben unberührt, die
       überlappen die rechtsseitige Sidebar nie. :has() mit
       Geschwister-Selektor - dasselbe, bereits etablierte Muster wie
       js/utils/zoomSteuerung.js' :has(button:hover). */
    .karte-viz-container:has(> .bestand-sidebar.offen) .karte-werkzeugleiste,
    .karte-viz-container:has(> .bestand-sidebar.offen) .leaflet-bottom.leaflet-right {
      visibility: hidden;
    }
    /* KLEINAUFTRAG "Karte – deutlichere Hervorhebung & längerer Zeitregler",
       Punkt 1: kräftiger orangener Rahmen (outline statt border - ändert die
       Box-Größe nicht) + heller Hintergrund, bewusst weder Rot (kollidiert
       mit der Unsicherheits-Kennzeichnung) noch Blau (Marker-/Akzentfarbe) -
       dieselbe Farbkombination wie ganttDiagramm.js' etabliertes
       .gantt-hervorgehoben. Übergang (Ein-/Ausblenden) kommt von der
       Transition auf der Basis-Regel .karte-sidebar-ort oben - hier nur die
       Zielwerte, Klasse wird nach HERVORHEBUNG_DAUER_MS (2500ms) wieder
       entfernt (siehe springeZuOrtsAbschnitt()). */
    .karte-sidebar-ort.karte-sidebar-ort-hervorgehoben {
      background: #fce6cc;
      outline-color: #e07820;
    }
  `;
  container.appendChild(style);
}

// KORREKTUR Punkt 2 (siehe Dateikopf-Kommentar): Dual-Handle-Regler OHNE
// "Anwenden"-Button - jedes 'input'-Ereignis plant über planeLiveUpdate()
// eine entprellte aktualisiereMarker()-Aktualisierung. `deaktiviert`
// (Punkt 4): true während `options.showUncertainty` aktiv ist.
function baueReglerGruppe(jahresSpanneVoll, deaktiviert) {
  const reglerGruppe = document.createElement('div');
  reglerGruppe.className = deaktiviert ? 'karte-regler-gruppe deaktiviert' : 'karte-regler-gruppe';

  const reglerLabel = document.createElement('span');
  reglerLabel.className = 'karte-regler-label';
  reglerLabel.textContent = 'Zeitraum:';

  const reglerAnzeige = document.createElement('span');
  reglerAnzeige.className = 'karte-regler-anzeige';

  const sliderWrapper = document.createElement('div');
  sliderWrapper.className = 'karte-slider-wrapper';

  // Punkt 4: bei aktivem Unsicherheiten-Modus IMMER auf volle Spanne
  // zurückgesetzt (Auftrag, wörtlich: "Zeitregler setzt sich zurück, wenn
  // Unsicherheiten-Toggle aktiviert wird").
  const startZeitraum = deaktiviert
    ? { von: jahresSpanneVoll[0], bis: jahresSpanneVoll[1] }
    : instanz.aktiverZeitraum || { von: jahresSpanneVoll[0], bis: jahresSpanneVoll[1] };
  if (deaktiviert) instanz.aktiverZeitraum = null;

  const vonInput = document.createElement('input');
  vonInput.type = 'range';
  vonInput.className = 'karte-slider karte-slider-von';
  vonInput.min = String(jahresSpanneVoll[0]);
  vonInput.max = String(jahresSpanneVoll[1]);
  vonInput.step = String(JAHRZEHNT_SCHRITT);
  vonInput.value = String(startZeitraum.von);
  vonInput.disabled = deaktiviert;
  vonInput.setAttribute('aria-label', 'Zeitraum-Anfang (Jahrzehnt)');

  const bisInput = document.createElement('input');
  bisInput.type = 'range';
  bisInput.className = 'karte-slider karte-slider-bis';
  bisInput.min = String(jahresSpanneVoll[0]);
  bisInput.max = String(jahresSpanneVoll[1]);
  bisInput.step = String(JAHRZEHNT_SCHRITT);
  bisInput.value = String(startZeitraum.bis);
  bisInput.disabled = deaktiviert;
  bisInput.setAttribute('aria-label', 'Zeitraum-Ende (Jahrzehnt)');

  function aktualisiereReglerAnzeige() {
    reglerAnzeige.textContent = `${vonInput.value}–${Number(bisInput.value) + (JAHRZEHNT_SCHRITT - 1)}`;
  }
  aktualisiereReglerAnzeige();

  // KORREKTUR Punkt 2 (siehe Dateikopf-Kommentar): entprellte Live-
  // Aktualisierung statt "Anwenden"-Klick - aktualisiereMarker() (nicht
  // zeichneKarte()!) hält Werkzeugleiste/Slider-DOM unangetastet, damit die
  // laufende Ziehgeste nicht abbricht.
  function planeLiveUpdate() {
    instanz.aktiverZeitraum = { von: Number(vonInput.value), bis: Number(bisInput.value) };
    clearTimeout(instanz.debounceTimer);
    instanz.debounceTimer = setTimeout(() => { aktualisiereMarker(); }, DEBOUNCE_MS);
  }

  vonInput.addEventListener('input', () => {
    if (Number(vonInput.value) > Number(bisInput.value) - JAHRZEHNT_SCHRITT) {
      vonInput.value = String(Number(bisInput.value) - JAHRZEHNT_SCHRITT);
    }
    aktualisiereReglerAnzeige();
    planeLiveUpdate();
  });
  bisInput.addEventListener('input', () => {
    if (Number(bisInput.value) < Number(vonInput.value) + JAHRZEHNT_SCHRITT) {
      bisInput.value = String(Number(vonInput.value) + JAHRZEHNT_SCHRITT);
    }
    aktualisiereReglerAnzeige();
    planeLiveUpdate();
  });

  sliderWrapper.append(vonInput, bisInput);

  const alleBtn = document.createElement('button');
  alleBtn.type = 'button';
  alleBtn.className = 'karte-regler-btn';
  alleBtn.textContent = 'Alle';
  alleBtn.disabled = deaktiviert;
  alleBtn.addEventListener('click', () => {
    vonInput.value = String(jahresSpanneVoll[0]);
    bisInput.value = String(jahresSpanneVoll[1]);
    aktualisiereReglerAnzeige();
    instanz.aktiverZeitraum = null;
    clearTimeout(instanz.debounceTimer);
    aktualisiereMarker();
  });

  reglerGruppe.append(reglerLabel, sliderWrapper, reglerAnzeige, alleBtn);

  if (deaktiviert) {
    const hinweis = document.createElement('span');
    hinweis.className = 'karte-regler-hinweis';
    hinweis.textContent = '(deaktiviert, solange Unsicherheiten angezeigt werden)';
    reglerGruppe.appendChild(hinweis);
  }

  return reglerGruppe;
}

function zeichneMarkerFuerOrte(orteListe, radiusFn, istUnsicherModus) {
  instanz.markerLayer.clearLayers();
  orteListe.forEach((ortsEintrag) => {
    const marker = L.circleMarker([ortsEintrag.lat, ortsEintrag.lon], {
      radius: radiusFn(ortsEintrag),
      color: istUnsicherModus ? '#c0392b' : '#ffffff',
      weight: istUnsicherModus ? 2 : 1,
      dashArray: istUnsicherModus ? '4,3' : null,
      fillColor: MARKER_FARBE,
      fillOpacity: 0.65
    }).addTo(instanz.markerLayer);

    // KORREKTURAUFTRAG "Karte – Klick auf Ort-Marker öffnet Sidebar" (siehe
    // Dateikopf-Kommentar): Punkt 1 (Normalmodus) öffnet die Urkunden-Sidebar
    // über sidebar.js' etabliertes zeigeUrkundenSidebar(), Punkt 2
    // (Unsicherheiten-Modus) springt stattdessen innerhalb der bereits
    // offenen Übersicht zum passenden Ortsabschnitt.
    const aktiviere = () => {
      if (istUnsicherModus) {
        springeZuOrtsAbschnitt(ortsEintrag.name);
      } else {
        zeigeUrkundenSidebar(instanz.sidebar, ortsEintrag.name, ortsEintrag.eintraege);
      }
    };
    marker.on('click', aktiviere);

    const element = marker.getElement();
    if (element) {
      element.setAttribute('tabindex', '0');
      const tooltipText = istUnsicherModus
        ? [ortsEintrag.name, `${ortsEintrag.urkunden.length} unsichere Urkunde(n)`].join('\n')
        : baueMarkerTooltip(ortsEintrag);
      element.addEventListener('mouseenter', () => zeigeTooltip(tooltipText, element, instanz.mapDiv));
      element.addEventListener('focus', () => zeigeTooltip(tooltipText, element, instanz.mapDiv));
      element.addEventListener('mouseleave', () => versteckeTooltip());
      element.addEventListener('blur', () => versteckeTooltip());
      // Tastatur-Äquivalent zum Marker-Klick - der Marker trug bereits zuvor
      // tabindex="0" für den Tooltip, aber keine Aktivierung per Tastatur
      // (dieselbe Enter/Leertaste-Konvention wie sidebar.js'
      // baueUrkundenListeInhalt()).
      element.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          aktiviere();
        }
      });
    }
  });
}

// KORREKTUR Punkt 2 (siehe Dateikopf-Kommentar): aktualisiert NUR die
// Leaflet-Marker-Ebene (instanz.markerLayer) anhand des aktuellen Filter-
// Zustands - rührt Werkzeugleiste/Slider/Karte selbst nicht an, sicher
// während einer laufenden Zieh-Geste aufrufbar. Wird sowohl vom entprellten
// Zeitregler-Live-Update als auch am Ende von zeichneKarte() (Erstaufbau)
// aufgerufen.
function aktualisiereMarker() {
  const { options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;

  if (zeigeUnsicherheit) {
    const radiusSkala = d3.scaleSqrt()
      .domain([1, d3.max(instanz.unsichereOrteDaten.kartiert, (d) => d.urkunden.length) || 1])
      .range([6, 22]);
    zeichneMarkerFuerOrte(instanz.unsichereOrteDaten.kartiert, (d) => radiusSkala(Math.max(d.urkunden.length, 1)), true);
    return;
  }

  const alleOrte = Array.from(instanz.aggregation.values());
  const sichtbareOrte = instanz.aktiverZeitraum
    ? alleOrte.filter((ort) => ortHatJahrImZeitraum(ort, instanz.aktiverZeitraum))
    : alleOrte;
  const radiusSkala = d3.scaleSqrt().domain([1, d3.max(sichtbareOrte, (d) => d.anzahl) || 1]).range([5, 24]);
  zeichneMarkerFuerOrte(sichtbareOrte, (d) => radiusSkala(d.anzahl), false);
}

async function zeichneKarte() {
  const { container, records, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  // Info-Button wird bei JEDEM vollen Redraw zerstört/neu erzeugt
  // (container.innerHTML='' unten leert auch dessen DOM) - dasselbe Muster
  // wie dotPlot.js/ganttDiagramm.js, verhindert doppelt registrierte
  // document-Listener.
  if (instanz.infoButton) instanz.infoButton.destroy();
  clearTimeout(instanz.debounceTimer);
  container.innerHTML = '';
  fuegeStyleEin(container);

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'karte-werkzeugleiste';

  // Punkt 3/4 (siehe Dateikopf-Kommentar): Regler LINKS, Info-Button bleibt
  // rechts - "neben dem Unsicherheiten-Button" wörtlich nicht erreichbar
  // (Container-Trennung, siehe Dateikopf-Kommentar), hier die nächstliegende
  // erreichbare Platzierung in der eigenen Werkzeugleiste.
  const jahresSpanneVoll = ermittleJahresSpanneGerundet(records);
  const reglerGruppe = baueReglerGruppe(jahresSpanneVoll, zeigeUnsicherheit);
  werkzeugleiste.appendChild(reglerGruppe);

  container.appendChild(werkzeugleiste);
  instanz.infoButton = erzeugeInfoButton(werkzeugleiste, { text: KARTE_INFO_TEXT, ariaLabel: 'Erklärung zur Karte' });

  const mapDiv = document.createElement('div');
  const breite = options.width || container.clientWidth || 900;
  const hoehe = options.height || Math.max(container.clientHeight || 600, 400);
  const werkzeugleisteHoehe = werkzeugleiste.getBoundingClientRect().height + 10;
  mapDiv.style.width = `${breite}px`;
  mapDiv.style.height = `${Math.max(hoehe - werkzeugleisteHoehe, 300)}px`;
  container.appendChild(mapDiv);
  instanz.mapDiv = mapDiv;

  const karte = L.map(mapDiv).setView(START_ZENTRUM, START_ZOOM);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
  }).addTo(karte);
  instanz.karte = karte;
  instanz.markerLayer = L.layerGroup().addTo(karte);

  if (zeigeUnsicherheit) {
    instanz.unsichereOrteDaten = await ladeUnsichereOrteDaten(records);
  } else {
    const ortsVerzeichnis = await ladeOrtsVerzeichnis();
    if (!instanz) return; // destroy() kann während des await aufgerufen worden sein
    instanz.aggregation = baueOrtsAggregation(records, ortsVerzeichnis);
  }
  if (!instanz) return; // destroy() kann während des await aufgerufen worden sein

  aktualisiereMarker();

  // Punkt 1/3 (siehe Dateikopf-Kommentar) + KORREKTURAUFTRAG "Karte – Klick
  // auf Ort-Marker öffnet Sidebar", Punkt 1: die Sidebar wird bei jedem
  // vollen Redraw neu aufgebaut (container.innerHTML='' oben hat eine ggf.
  // vorherige Sidebar bereits entfernt) - jetzt IMMER, nicht mehr nur im
  // Unsicherheiten-Modus. Im Normalmodus bleibt sie geschlossen
  // (Ausgangszustand von baueSidebarGeruest()) und öffnet sich erst durch
  // einen Marker-Klick (zeichneMarkerFuerOrte()); im Unsicherheiten-Modus
  // unverändert sofort mit der Übersicht befüllt/geöffnet.
  fuegeSidebarStyleEin(container);
  instanz.sidebar = baueSidebarGeruest(container);
  instanz.sidebar.schliessenBtn.addEventListener('click', () => schliesseSidebar(instanz.sidebar, mapDiv));
  // Punkt 1 (siehe Dateikopf-Kommentar): eigener "Zurück zur Übersicht"-Weg
  // (zusätzlich zu sidebar.js' eigenem, hier wirkungslosem Handler, da
  // `_urkundenListe` nie gesetzt wird) - führt von der Detailansicht einer
  // Urkunde zurück zur nach Ort gruppierten Übersicht. NUR im
  // Unsicherheiten-Modus wirksam (Bedingung neu, siehe Korrekturauftrag
  // "Klick auf Ort-Marker öffnet Sidebar"): im Normalmodus zeigt
  // zeigeUrkundenSidebar() eine FLACHE Liste, für die sidebar.js' eigener,
  // bereits verdrahteter zurueckZurUrkundenListe()-Handler zuständig ist -
  // ohne diese Bedingung würde der Klick dort ZUSÄTZLICH
  // oeffneUnsichereOrteSidebar() auslösen, die im Normalmodus mangels
  // instanz.unsichereOrteDaten sofort abstürzen würde.
  instanz.sidebar.zurueckBtn.addEventListener('click', () => {
    if (zeigeUnsicherheit) oeffneUnsichereOrteSidebar();
  });
  if (zeigeUnsicherheit) {
    oeffneUnsichereOrteSidebar();
  }
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  // KORREKTUR Punkt 1 (siehe Dateikopf-Kommentar): eigene, stabile Klasse
  // auf `container` selbst (NICHT von zeichneKarte()s container.innerHTML=''
  // betroffen, da das nur den INHALT leert) - Anker für die
  // `:has()`-Sichtbarkeitsregel in fuegeStyleEin().
  container.classList.add('karte-viz-container');
  instanz = {
    container,
    records: data,
    options: { showUncertainty: true, width: null, height: null, ...options },
    karte: null,
    markerLayer: null,
    mapDiv: null,
    infoButton: null,
    sidebar: null,
    aktiverZeitraum: null,
    aggregation: null,
    unsichereOrteDaten: null,
    debounceTimer: null
  };
  zeichneKarte();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  if (neueOptionen.width || neueOptionen.height || 'showUncertainty' in neueOptionen) {
    zeichneKarte();
  } else if (instanz.karte) {
    instanz.karte.invalidateSize();
  }
}

export function destroy() {
  if (!instanz) return;
  clearTimeout(instanz.debounceTimer);
  if (instanz.infoButton) instanz.infoButton.destroy();
  if (instanz.karte) {
    instanz.karte.remove();
  }
  instanz.container.innerHTML = '';
  instanz.container.classList.remove('karte-viz-container');
  instanz = null;
}
