// js/viz/karte.js – Ansicht „Karte“ der Urkunden
// Zweck: räumliche Häufung; ein Marker je Ort, Radius nach Zahl der Urkunden, ein einziger Markerton (Größe trägt die
//   Information, nicht die Farbe); Zeitregler über zwei Griffe.
// Eingabe: `data` = urkunden.csv (orte, ausstellungsort, datum, signatur, orte_unsicher, unsicherheit_typ); Orte
//   namensbasiert über utils/urkundenOrte.js (orte.csv mit lat/lon); für unsichere Orte zusätzlich orte.csv (orte_unsicher,
//   unsicherheit_anmerkung) über core/dataLoader.js.
// Schnittstelle: render(container, data, options), resize(neueOptionen), destroy() wie alle Ansichten (docs/SCHEMA.md);
//   Modus „Licht aus“ über options.lichtAus (seit Auftrag 13).
// Abhängigkeiten: Leaflet 1.9 (global), D3 v7, utils/urkundenOrte.js, utils/sidebar.js, utils/tooltip.js,
//   utils/infoButton.js, utils/lichtAus.js, utils/lichtAusDarstellung.js.
// Bedienung: Marker mit Tab erreichbar, Enter/Leertaste wie Klick (öffnet die Urkunden des Ortes in der Seitenleiste);
//   Regler ohne „Anwenden“, die Karte folgt beim Ziehen. Bei offener Seitenleiste sind Werkzeugleiste und Attribution
//   ausgeblendet (sie lägen sonst darüber).
// Hintergrund (Zeitregler, unsichere Orte, Stapelung): docs/MODULNOTIZEN.md, Abschnitt karte.js.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { ladeOrtsVerzeichnis, loeseOrteAuf } from '../utils/urkundenOrte.js';
import { hatOrtsbezug } from '../utils/ortsart.js'; // Auftrag 11
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { beschreibeSvgAusInfotext } from '../utils/svgBeschreibung.js';
import { markiereHellElement } from '../utils/abdunkeln.js'; // Nachbesserung 3, Punkt 4
import { eintraegeAus, lichtAusVorbereitung, wirksameEintraege } from '../utils/lichtAus.js'; // Auftrag 13
import { setzeLicht, musterAus, beschreibeEintraege } from '../utils/lichtAusDarstellung.js';
import { typName, auspraegungName } from '../core/unsicherheitVokabular.js';
import { baueSidebarGeruest, fuegeSidebarStyleEin, schliesseSidebar, zeigeUrkundenDetail, zeigeUrkundenSidebar } from '../utils/sidebar.js';
import { parseJahr } from '../utils/urkundenZeit.js';
import { ladeCSV } from '../core/dataLoader.js';
import { kartenStartpunkt, infotextFuerModul } from '../core/archivKonfiguration.js';
import { lesbareAnmerkung } from '../utils/uncertainty.js';
import { markiereElement, mitUnvollstaendigHinweis } from '../utils/vollstaendigkeit.js';
import { baueVorschlagAufklapper } from '../beteiligung/vorschlagFormular.js'; // Partizipations-Modul (2026-10-27)

// Punkt 5 (Vorschlag, siehe Selbstauskunft im Chat - noch nicht freigegeben):
// dritter Absatz zum neuen Verhalten ergänzt.

const MARKER_FARBE = '#1a4d8f';
// AUFTRAG "Archivspezifische Texte...", Punkt 2.8: Kartenstartpunkt aus
// archiv.csv (`karte_zentrum_lat`/`-lon`/`karte_zoom`).
// AUFTRAG C1, Punkt 5: kein fester Ersatzort mehr im Code - fehlt der
// Startpunkt in archiv.csv, zeigt die Karte den Ausschnitt aller Orte aus
// orte.csv, ohne Orte eine Weltübersicht.
// Seit 2026-10-28 (Wunsch des Autors): der Startpunkt aus archiv.csv (Krems) bleibt die Mitte, die Zoomstufe
// wird aber so gewählt, dass ALLE Orte der Daten sichtbar sind - über einen um die Mitte symmetrischen
// Rahmen (die feste Zoomstufe aus archiv.csv schnitt entfernte Orte wie Rom oder Aalst ab).
async function setzeStartansicht(karte, start) {
  const orte = Array.from((await ladeOrtsVerzeichnis()).values());
  if (orte.length === 0) {
    if (!start) karte.setView([0, 0], 2);
    return;
  }
  const alle = L.latLngBounds(orte.map((o) => [o.lat, o.lon]));
  if (!start) { karte.fitBounds(alle, { padding: [40, 40] }); return; }
  const [lat, lon] = start.zentrum;
  const dLat = Math.max(Math.abs(alle.getNorth() - lat), Math.abs(lat - alle.getSouth()));
  const dLon = Math.max(Math.abs(alle.getEast() - lon), Math.abs(lon - alle.getWest()));
  const rahmen = L.latLngBounds([lat - dLat, lon - dLon], [lat + dLat, lon + dLon]);
  karte.setView(start.zentrum, karte.getBoundsZoom(rahmen, false, L.point(60, 60)), { animate: false });
}
const JAHRZEHNT_SCHRITT = 10;
// Abspielen (Wunsch des Autors, 2026-10-28): der linke Regler bleibt am Anfang der Spanne, der rechte rückt
// Jahrzehnt für Jahrzehnt vor - die Karte füllt sich nach und nach mit Orten (derselbe Effekt wie beim Ziehen
// des rechten Reglers). Angehalten geht es beim nächsten Klick von dort weiter, am Ende beginnt es von vorn.
const ABSPIEL_TAKT_MS = 260;
const SYMBOL_ABSPIELEN = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>';
const SYMBOL_PAUSE = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" fill="currentColor"/></svg>';
const DEBOUNCE_MS = 80;
const HERVORHEBUNG_DAUER_MS = 2500;

let instanz = null; // { container, records, options, karte, markerLayer, infoButton, sidebar, aktiverZeitraum, ortsVerzeichnis, unsichereOrteDaten, debounceTimer } – eine aktive Karte pro Modul-Ladung

// Punkt 1 (siehe docs/MODULNOTIZEN.md): nicht auflösbare Records werden
// direkt verworfen, nicht mehr gesammelt.
function baueOrtsAggregation(records, ortsVerzeichnis) {
  const aggregation = new Map();
  records.forEach((record) => {
    const { aufgeloest } = loeseOrteAuf(record, ortsVerzeichnis);
    aufgeloest.forEach((ort) => {
      if (!aggregation.has(ort.name)) {
        aggregation.set(ort.name, { name: ort.name, lat: ort.lat, lon: ort.lon, ortRecord: ort.ortRecord, anzahl: 0, eintraege: [] });
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

// KORREKTUR Punkt 1 (siehe docs/MODULNOTIZEN.md): extrahiert aus einer
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

// KORREKTUR Punkt 4 (siehe docs/MODULNOTIZEN.md): direkte, namensbasierte
// Ergänzung zur reinen Anmerkungs-Textsuche oben - jede urkunden.csv-Zeile,
// deren `orte`-Feld diesen Ortsnamen exakt enthält (dieselbe
// Normalisierungs-Konvention wie js/utils/urkundenOrte.js' loeseOrteAuf()).
function ermittleUrkundenNachOrtsname(ortName, records) {
  return records.filter((record) => {
    const orteListe = Array.isArray(record.orte) ? record.orte : (record.orte ? [record.orte] : []);
    return orteListe.includes(ortName);
  });
}

// KORREKTUR Punkt 1/3 (siehe docs/MODULNOTIZEN.md): lädt orte.csv
// EIGENSTÄNDIG (nicht über urkundenOrte.js' ladeOrtsVerzeichnis(), die
// koordinatenlose Zeilen verwirft und `unsicherheit_anmerkung` nicht
// durchreicht) und liefert die nach Koordinaten-Vorhandensein getrennten,
// alphabetisch sortierten Listen unsicherer Orte, je Ort bereits mit den
// tatsächlich zugehörigen Urkunden-Records angereichert.
async function ladeUnsichereOrteDaten(records) {
  const { records: orteRecords } = await ladeCSV('data/orte.csv');
  const signaturZuRecord = new Map(records.filter((r) => r.signatur).map((r) => [r.signatur, r]));
  const alleSignaturenAbsteigend = Array.from(signaturZuRecord.keys()).sort((a, b) => b.length - a.length);

  const unsichereOrteRecords = orteRecords.filter((r) => r.orte_unsicher && hatOrtsbezug(r)); // Auftrag 11
  const voelligUnklar = [];
  const kartiert = [];

  unsichereOrteRecords.forEach((r) => {
    const lat = parseFloat(String(r.lat || '').replace(',', '.'));
    const lon = parseFloat(String(r.lon || '').replace(',', '.'));
    const hatKoordinaten = Number.isFinite(lat) && Number.isFinite(lon);
    const ausAnmerkung = ermittleUnsichereUrkunden(r.unsicherheit_anmerkung, alleSignaturenAbsteigend, signaturZuRecord).filter(Boolean);
    const ausOrtsname = ermittleUrkundenNachOrtsname(r.orte, records);
    const eintrag = {
      id: r.orte_id || r.orte,
      name: r.orte,
      ortRecord: r,
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

// KORREKTUR Punkt 1 (siehe docs/MODULNOTIZEN.md): ein Ort-Abschnitt - Name,
// die ortsbezogene Anmerkung (Begründung, gilt für alle darunter gelisteten
// Urkunden) und die tatsächlich betroffenen Urkunden als anklickbare
// Signatur-Schaltflächen (öffnen die volle Detailansicht).
function baueOrtAbschnitt(ort) {
  const block = document.createElement('div');
  block.className = 'karte-sidebar-ort';

  const titel = document.createElement('h4'); // Nachbesserung 6, Punkt 7: h4 unter dem h3 des Abschnitts (vorher h5)
  titel.className = 'karte-sidebar-ort-titel';
  titel.textContent = ort.name;
  block.appendChild(titel);

  const anmerkung = document.createElement('p');
  anmerkung.className = 'karte-sidebar-ort-anmerkung';
  anmerkung.textContent = lesbareAnmerkung(ort.anmerkung);
  block.appendChild(anmerkung);

  // Partizipations-Modul (2026-10-27): Vorschlag zu diesem Ort (z. B. Identifizierung, Koordinaten)
  const vorschlag = baueVorschlagAufklapper({
    typ: 'ort', id: ort.id, titel: ort.name,
    felder: [
      { name: 'orte', label: 'Ortsname / Identifizierung', wert: ort.name },
      { name: 'koordinaten', label: 'Koordinaten', wert: ort.lat !== null ? `${ort.lat}, ${ort.lon}` : '' },
      { name: 'unsicherheit_anmerkung', label: 'Anmerkung', wert: ort.anmerkung }
    ]
  });
  if (vorschlag) block.appendChild(vorschlag);

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
        // Punkt 1 (siehe docs/MODULNOTIZEN.md): eigener "Zurück"-Weg zur
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
  const titel = document.createElement('h3'); // Nachbesserung 6, Punkt 7 (heading-order): h3 statt h4 direkt unter dem h2 der Seitenleiste
  titel.className = 'karte-sidebar-abschnitt-titel';
  titel.textContent = `${titelText} (${orte.length})`;
  abschnitt.appendChild(titel);
  orte.forEach((ort) => abschnitt.appendChild(baueOrtAbschnitt(ort)));
  return abschnitt;
}

// KORREKTUR Punkt 3 (siehe docs/MODULNOTIZEN.md): "Völlig unklare Orte" ZUERST,
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
  sidebar.inert = false; // AUFTRAG D, Punkt 2: geöffnet = bedienbar
}

// KORREKTURAUFTRAG "Karte – Klick auf Ort-Marker öffnet Sidebar", Punkt 2
// (siehe docs/MODULNOTIZEN.md): baut IMMER zuerst die Übersicht auf (holt die
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
    .karte-slider-wrapper { position: relative; width: min(320px, 100%); height: 24px; } /* Nachbesserung 6, Punkt 16: bei schmalen Fenstern nicht breiter als der Platz */
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
    .karte-abspielen { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; color: var(--accent); }
    .karte-abspielen[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: #fff; }
    .karte-sidebar-abschnitt { margin-bottom: var(--space-4); }
    .karte-sidebar-abschnitt-titel { margin: 0 0 var(--space-2) 0; }
    .karte-sidebar-ort { margin-bottom: var(--space-3); padding-bottom: var(--space-2); border-bottom: 1px solid var(--border);
      outline: 3px solid transparent; outline-offset: 3px; border-radius: var(--radius);
      transition: background-color .5s ease, outline-color .5s ease; }
    .karte-sidebar-ort-titel { margin: 0 0 4px 0; font-size: var(--fs-sm); font-family: var(--font-ui); line-height: normal; font-weight: 700; }
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

// KORREKTUR Punkt 2 (siehe docs/MODULNOTIZEN.md): Dual-Handle-Regler OHNE
// "Anwenden"-Button - jedes 'input'-Ereignis plant über planeLiveUpdate()
// eine entprellte aktualisiereMarker()-Aktualisierung. `deaktiviert`
// (Punkt 4): true während `options.showUncertainty` aktiv ist.
// Länge begründet (über 100 Zeilen, Masterprompt §13.3; Nachbesserung 8): baut Zeitregler, Abspiel-Taste und Anzeige mit ihren Ereignissen; alle bedienen denselben Zeitraum-Zustand.
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

  // KORREKTUR Punkt 2 (siehe docs/MODULNOTIZEN.md): entprellte Live-
  // Aktualisierung statt "Anwenden"-Klick - aktualisiereMarker() (nicht
  // zeichneKarte()!) hält Werkzeugleiste/Slider-DOM unangetastet, damit die
  // laufende Ziehgeste nicht abbricht.
  function planeLiveUpdate() {
    instanz.aktiverZeitraum = { von: Number(vonInput.value), bis: Number(bisInput.value) };
    clearTimeout(instanz.debounceTimer);
    instanz.debounceTimer = setTimeout(() => { aktualisiereMarker(); }, DEBOUNCE_MS);
  }

  // Abspielen / Pause neben dem Regler
  const abspielBtn = document.createElement('button');
  abspielBtn.type = 'button';
  abspielBtn.className = 'karte-regler-btn karte-abspielen';
  abspielBtn.disabled = deaktiviert;
  const zeigeAbspielSymbol = (laeuft) => {
    abspielBtn.innerHTML = laeuft ? SYMBOL_PAUSE : SYMBOL_ABSPIELEN;
    abspielBtn.setAttribute('aria-label', laeuft ? 'Zeitraum-Animation anhalten' : 'Zeitraum-Animation abspielen');
    abspielBtn.title = laeuft ? 'Anhalten' : 'Abspielen';
    abspielBtn.setAttribute('aria-pressed', String(laeuft));
  };
  zeigeAbspielSymbol(false);
  function halteAn() {
    clearInterval(instanz.abspielTimer);
    instanz.abspielTimer = null;
    zeigeAbspielSymbol(false);
  }
  function setzeFenster(von, bis) {
    vonInput.value = String(von);
    bisInput.value = String(bis);
    aktualisiereReglerAnzeige();
    instanz.aktiverZeitraum = { von, bis };
    clearTimeout(instanz.debounceTimer);
    aktualisiereMarker();
  }
  function spieleAb() {
    const [anfang, ende] = jahresSpanneVoll;
    const von = anfang;
    let bis = Number(bisInput.value);
    if (bis >= ende) bis = Math.min(anfang + JAHRZEHNT_SCHRITT, ende); // am Ende (oder volle Spanne): von vorn
    setzeFenster(von, bis);
    zeigeAbspielSymbol(true);
    instanz.abspielTimer = setInterval(() => {
      if (!instanz || !abspielBtn.isConnected) { clearInterval(instanz?.abspielTimer); return; }
      if (bis >= ende) { halteAn(); return; }
      bis += JAHRZEHNT_SCHRITT;
      setzeFenster(von, bis);
    }, ABSPIEL_TAKT_MS);
  }
  abspielBtn.addEventListener('click', () => (instanz.abspielTimer ? halteAn() : spieleAb()));

  vonInput.addEventListener('input', () => {
    if (instanz.abspielTimer) halteAn(); // Greift man selbst zum Regler, hält die Animation an
    if (Number(vonInput.value) > Number(bisInput.value) - JAHRZEHNT_SCHRITT) {
      vonInput.value = String(Number(bisInput.value) - JAHRZEHNT_SCHRITT);
    }
    aktualisiereReglerAnzeige();
    planeLiveUpdate();
  });
  bisInput.addEventListener('input', () => {
    if (instanz.abspielTimer) halteAn();
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
    if (instanz.abspielTimer) halteAn();
    vonInput.value = String(jahresSpanneVoll[0]);
    bisInput.value = String(jahresSpanneVoll[1]);
    aktualisiereReglerAnzeige();
    instanz.aktiverZeitraum = null;
    clearTimeout(instanz.debounceTimer);
    aktualisiereMarker();
  });

  reglerGruppe.append(reglerLabel, abspielBtn, sliderWrapper, reglerAnzeige, alleBtn);

  if (deaktiviert) {
    const hinweis = document.createElement('span');
    hinweis.className = 'karte-regler-hinweis';
    hinweis.textContent = '(deaktiviert, solange Unsicherheiten angezeigt werden)';
    reglerGruppe.appendChild(hinweis);
  }

  return reglerGruppe;
}

// Nachbesserung 6, Punkt 12: Leaflet legt für die Marker ein eigenes SVG an (ohne Rolle, Namen, Beschreibung). Es
// enthält die fokussierbaren Ortspunkte, daher Rolle `group`; Name aus dem Info-Knopf-Text, Beschreibung aus dem Info-Text.
function beschreibeKartenebene() {
  const ebene = instanz?.karte?.getPanes?.().overlayPane?.querySelector('svg');
  if (ebene) beschreibeSvgAusInfotext(ebene, 'karte', { rolle: 'group', titel: 'Karte der Orte mit Urkunden' });
}

// --- Auftrag 13: Modus „Licht aus“ ------------------------------------------
// Alle Orte bleiben auf der Karte (Zeitregler wirkt weiter); Orte mit Unsicherheit leuchten (Bernstein-Kontur im Muster
// der Ausprägung, bei „strittig“ ein zweiter Ring), die übrigen sind gedimmt; die Kartenkacheln sind abgedunkelt
// (css/components.css). Ein Marker trägt die Einträge seines Orts aus orte.csv (Feld `orte`) und die Datierungs-
// einträge seiner Urkunden (`datum`). „Nur diese zeigen“ blendet die übrigen Marker aus. Orte ohne ermittelte Lage
// und Urkunden ohne Ausstellungsort stehen als Geister in der Randliste „Nicht auf der Karte“ (Entscheidung 7), nicht
// auf der Karte. Ein Klick auf einen leuchtenden Ort mit unsicherer Ortsangabe springt wie bisher in die Übersicht
// „Unsichere Orte“, sonst öffnet er die Urkunden des Orts.
const LICHT_AUS_FELDER = { 'orte.csv': ['orte'], 'urkunden.csv': ['orte', 'datum'] };

function lichtAusEinheitFuerOrt(ortsEintrag) {
  if (!instanz.lichtAusEinheiten) instanz.lichtAusEinheiten = new Map();
  let e = instanz.lichtAusEinheiten.get(ortsEintrag.name);
  if (!e) {
    const eintraege = eintraegeAus(ortsEintrag.ortRecord, 'orte.csv', ['orte']);
    for (const record of ortsEintrag.eintraege) eintraege.push(...eintraegeAus(record, 'urkunden.csv', ['datum']));
    e = { name: ortsEintrag.name, eintraege };
    instanz.lichtAusEinheiten.set(ortsEintrag.name, e);
  }
  return e;
}

function bereiteLichtAusVor() {
  const optionen = instanz.options.lichtAus;
  instanz.lichtAus = optionen && instanz.aggregation
    ? lichtAusVorbereitung(Array.from(instanz.aggregation.values()).map(lichtAusEinheitFuerOrt), optionen.auswahl) : null;
}

const wirksamFuerOrt = (ortsEintrag) => (instanz.lichtAus ? instanz.lichtAus.wirksam(lichtAusEinheitFuerOrt(ortsEintrag)) : []);

// Randliste „Nicht auf der Karte“ – nur Darstellung, kein erfundener Datensatz
function zeigeLichtAusRandliste() {
  instanz.randliste?.remove();
  instanz.randliste = null;
  const optionen = instanz.options.lichtAus;
  if (!optionen || !instanz.mapDiv || !instanz.orteRoh) return;
  const passt = (record, datei, felder) => wirksameEintraege(eintraegeAus(record, datei, felder), optionen.auswahl, []).length > 0;
  const ohneLage = instanz.orteRoh.filter((r) => hatOrtsbezug(r) && !String(r.lat ?? '').trim() && passt(r, 'orte.csv', null))
    .map((r) => r.orte).sort((a, b) => a.localeCompare(b, 'de'));
  const ohneAusstellungsort = instanz.records.filter((r) => !String(r.ausstellungsort ?? '').trim() && passt(r, 'urkunden.csv', ['ausstellungsort'])).length;
  if (!ohneLage.length && !ohneAusstellungsort) return;
  const box = document.createElement('section');
  box.className = 'lichtaus-randliste';
  box.setAttribute('aria-label', 'Nicht auf der Karte');
  const titel = document.createElement('h2'); // Überschriftenfolge: direkt unter der h1 der Seite
  titel.textContent = 'Nicht auf der Karte';
  box.appendChild(titel);
  if (ohneLage.length) {
    const geist = document.createElement('p');
    geist.className = 'lichtaus-geist';
    geist.textContent = `${ohneLage.length} ${ohneLage.length === 1 ? 'Ort' : 'Orte'} ohne ermittelte Lage`;
    const liste = document.createElement('ul');
    liste.id = `lichtaus-ohne-lage-${Math.random().toString(36).slice(2, 8)}`;
    const zeige = (alle) => { liste.textContent = ''; (alle ? ohneLage : ohneLage.slice(0, 8)).forEach((n) => { const li = document.createElement('li'); li.textContent = n; liste.appendChild(li); }); };
    zeige(false);
    box.append(geist, liste);
    if (ohneLage.length > 8) {
      const mehr = document.createElement('button');
      mehr.type = 'button';
      mehr.textContent = `Alle ${ohneLage.length} anzeigen`;
      mehr.setAttribute('aria-expanded', 'false');
      mehr.setAttribute('aria-controls', liste.id);
      mehr.addEventListener('click', () => {
        const offen = mehr.getAttribute('aria-expanded') !== 'true';
        mehr.setAttribute('aria-expanded', String(offen));
        mehr.textContent = offen ? 'Weniger anzeigen' : `Alle ${ohneLage.length} anzeigen`;
        zeige(offen);
      });
      box.appendChild(mehr);
    }
  }
  if (ohneAusstellungsort) {
    const geist = document.createElement('p');
    geist.className = 'lichtaus-geist';
    geist.textContent = `${ohneAusstellungsort} ${ohneAusstellungsort === 1 ? 'Urkunde' : 'Urkunden'} ohne Ausstellungsort`;
    box.appendChild(geist);
  }
  L.DomEvent.disableClickPropagation(box);
  L.DomEvent.disableScrollPropagation(box);
  instanz.mapDiv.appendChild(box);
  instanz.randliste = box;
}

function meldeLichtAus(sichtbareOrte) {
  const optionen = instanz.options.lichtAus;
  if (!optionen || !instanz.lichtAus) return;
  optionen.melde?.({ einheiten: sichtbareOrte.map(lichtAusEinheitFuerOrt), massengruppen: instanz.lichtAus.massengruppen,
    felder: LICHT_AUS_FELDER, nurDieseMoeglich: true });
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
    // docs/MODULNOTIZEN.md): Punkt 1 (Normalmodus) öffnet die Urkunden-Sidebar
    // über sidebar.js' etabliertes zeigeUrkundenSidebar(), Punkt 2
    // (Unsicherheiten-Modus) springt stattdessen innerhalb der bereits
    // offenen Übersicht zum passenden Ortsabschnitt.
    // Auftrag 13: leuchten oder gedimmt; „strittig“ bekommt einen zweiten Ring
    const wirksam = wirksamFuerOrt(ortsEintrag);
    const ortUnsicher = wirksam.some((e) => e.datei === 'orte.csv');
    if (instanz.lichtAus) {
      const muster = musterAus(wirksam.map((e) => e.auspraegung));
      const el = marker.getElement();
      setzeLicht(el, wirksam.length > 0);
      if (el && muster) el.dataset.muster = muster;
      if (muster === 'doppelt') {
        L.circleMarker([ortsEintrag.lat, ortsEintrag.lon], { radius: radiusFn(ortsEintrag) + 5, className: 'lichtaus-ring', interactive: false, fill: false })
          .addTo(instanz.markerLayer);
      }
    }
    const aktiviere = () => {
      if (istUnsicherModus || (ortUnsicher && instanz.unsichereOrteDaten)) {
        springeZuOrtsAbschnitt(ortsEintrag.name);
      } else {
        zeigeUrkundenSidebar(instanz.sidebar, ortsEintrag.name, ortsEintrag.eintraege);
      }
    };
    marker.on('click', aktiviere);

    const element = marker.getElement();
    if (element) {
      element.setAttribute('tabindex', '0');
      const tooltipText = mitUnvollstaendigHinweis(ortsEintrag.ortRecord, istUnsicherModus
        ? [ortsEintrag.name, `${ortsEintrag.urkunden.length} unsichere Urkunde(n)`].join('\n')
        : [baueMarkerTooltip(ortsEintrag), ...(wirksam.length ? [`Unsicher: ${beschreibeEintraege(wirksam, typName, auspraegungName)}`] : [])].join('\n'));
      markiereElement(element, ortsEintrag.ortRecord); // Nachbesserung 3, Punkt 3
      markiereHellElement(element, istUnsicherModus); // Nachbesserung 3, Punkt 4: im Modus zeigt die Karte nur unsichere Orte
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

// KORREKTUR Punkt 2 (siehe docs/MODULNOTIZEN.md): aktualisiert NUR die
// Leaflet-Marker-Ebene (instanz.markerLayer) anhand des aktuellen Filter-
// Zustands - rührt Werkzeugleiste/Slider/Karte selbst nicht an, sicher
// während einer laufenden Zieh-Geste aufrufbar. Wird sowohl vom entprellten
// Zeitregler-Live-Update als auch am Ende von zeichneKarte() (Erstaufbau)
// aufgerufen.
function aktualisiereMarker() {
  const { options } = instanz;
  queueMicrotask(beschreibeKartenebene); // Nachbesserung 6, Punkt 12: Beschreibung aus dem Info-Text
  const zeigeUnsicherheit = options.showUncertainty;

  if (zeigeUnsicherheit) {
    const radiusSkala = d3.scaleSqrt()
      .domain([1, d3.max(instanz.unsichereOrteDaten.kartiert, (d) => d.urkunden.length) || 1])
      .range([6, 22]);
    zeichneMarkerFuerOrte(instanz.unsichereOrteDaten.kartiert, (d) => radiusSkala(Math.max(d.urkunden.length, 1)), true);
    return;
  }

  const alleOrte = Array.from(instanz.aggregation.values());
  const imZeitraum = instanz.aktiverZeitraum
    ? alleOrte.filter((ort) => ortHatJahrImZeitraum(ort, instanz.aktiverZeitraum))
    : alleOrte;
  bereiteLichtAusVor(); // Auftrag 13
  const sichtbareOrte = instanz.lichtAus && options.lichtAus.auswahl?.nurDiese
    ? imZeitraum.filter((ort) => wirksamFuerOrt(ort).length > 0) : imZeitraum;
  // Auftrag 14, Punkt 3: Größe = Zahl aller Urkunden, die den Ort nennen (der Zeitregler wählt nur die Orte). Die Skala kommt aus allen Orten
  // des Zeitraums, nicht aus den im Modus gefilterten, damit derselbe Ort in „Licht an“ und im Modus gleich groß ist.
  const radiusSkala = d3.scaleSqrt().domain([1, d3.max(imZeitraum, (d) => d.anzahl) || 1]).range([5, 24]);
  zeichneMarkerFuerOrte(sichtbareOrte, (d) => radiusSkala(d.anzahl), false);
  zeigeLichtAusRandliste();
  meldeLichtAus(imZeitraum);
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
  clearInterval(instanz.abspielTimer);
  instanz.abspielTimer = null;
  container.innerHTML = '';
  fuegeStyleEin(container);

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'karte-werkzeugleiste';

  // Punkt 3/4 (siehe docs/MODULNOTIZEN.md): Regler LINKS, Info-Button bleibt
  // rechts - "neben dem Unsicherheiten-Button" wörtlich nicht erreichbar
  // (Container-Trennung, siehe docs/MODULNOTIZEN.md), hier die nächstliegende
  // erreichbare Platzierung in der eigenen Werkzeugleiste.
  const jahresSpanneVoll = ermittleJahresSpanneGerundet(records);
  const reglerGruppe = baueReglerGruppe(jahresSpanneVoll, zeigeUnsicherheit);
  werkzeugleiste.appendChild(reglerGruppe);

  container.appendChild(werkzeugleiste);
  const infoCfg = await infotextFuerModul('karte');
  // destroy() kann während des await aufgerufen worden sein; werkzeugleiste
  // kann durch einen zwischenzeitlichen Redraw bereits wieder aus dem DOM
  // entfernt worden sein, auch wenn instanz noch existiert (analog zum
  // .then()-Guard der übrigen 25 Module).
  if (!instanz || !werkzeugleiste.isConnected) return;
  if (infoCfg) instanz.infoButton = erzeugeInfoButton(werkzeugleiste, infoCfg);

  const mapDiv = document.createElement('div');
  const breite = options.width || container.clientWidth || 900;
  const hoehe = options.height || Math.max(container.clientHeight || 600, 400);
  const werkzeugleisteHoehe = werkzeugleiste.getBoundingClientRect().height + 10;
  mapDiv.style.width = `${breite}px`;
  mapDiv.style.height = `${Math.max(hoehe - werkzeugleisteHoehe, 300)}px`;
  container.appendChild(mapDiv);
  instanz.mapDiv = mapDiv;

  const start = kartenStartpunkt();
  // zoomSnap 0.25 (2026-10-28): die Startansicht (alle Orte um Krems) passt in Viertelstufen enger als in ganzen
  // Nachbesserung 2, Punkt 3 (2026-11-15): ohne Zwischenbilder bei prefers-reduced-motion: reduce, wie
  // js/utils/statischeKarte.js (Prüfung 14.11.2026, Befund 6.9).
  const ohneBewegung = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const karte = L.map(mapDiv, { zoomSnap: 0.25, ...(ohneBewegung ? { zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false, inertia: false } : {}) });
  if (start) karte.setView(start.zentrum, start.zoom);
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
    if (options.lichtAus) await ladeLichtAusDaten(); // Auftrag 13
  }
  if (!instanz) return; // destroy() kann während des await aufgerufen worden sein
  await setzeStartansicht(karte, start); // AUFTRAG C1, Punkt 5
  if (!instanz) return;

  aktualisiereMarker();

  // Punkt 1/3 (siehe docs/MODULNOTIZEN.md) + KORREKTURAUFTRAG "Karte – Klick
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
  // Punkt 1 (siehe docs/MODULNOTIZEN.md): eigener "Zurück zur Übersicht"-Weg
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
    if (zeigeUnsicherheit || (instanz.options.lichtAus && instanz.unsichereOrteDaten)) oeffneUnsichereOrteSidebar(); // Auftrag 13
  });
  if (zeigeUnsicherheit) {
    oeffneUnsichereOrteSidebar();
  }
}

// Auftrag 13: orte.csv (Randliste) und die Übersicht „Unsichere Orte“ (Sprung bei Klick), je einmal je Instanz
async function ladeLichtAusDaten() {
  if (!instanz.orteRoh) {
    const { records: orteRoh } = await ladeCSV('data/orte.csv');
    if (!instanz) return;
    instanz.orteRoh = orteRoh;
  }
  if (!instanz.unsichereOrteDaten) {
    const daten = await ladeUnsichereOrteDaten(instanz.records);
    if (!instanz) return;
    instanz.unsichereOrteDaten = daten;
  }
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  // KORREKTUR Punkt 1 (siehe docs/MODULNOTIZEN.md): eigene, stabile Klasse
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
  const lichtAusVorher = Boolean(instanz.options.lichtAus);
  const unsicherheitVorher = Boolean(instanz.options.showUncertainty);
  instanz.options = { ...instanz.options, ...neueOptionen };
  // Auftrag 13: Modus „Licht aus“ an/aus oder andere Auswahl – nur die Marker neu (Karte und Ausschnitt bleiben)
  const nurLichtAus = 'lichtAus' in neueOptionen && !neueOptionen.width && !neueOptionen.height
    && Boolean(instanz.options.showUncertainty) === unsicherheitVorher && instanz.aggregation && instanz.karte;
  if (nurLichtAus) {
    if (instanz.options.lichtAus && !lichtAusVorher) ladeLichtAusDaten().then(() => { if (instanz) aktualisiereMarker(); });
    else aktualisiereMarker();
    return;
  }
  if (neueOptionen.width || neueOptionen.height || 'showUncertainty' in neueOptionen) {
    zeichneKarte();
  } else if (instanz.karte) {
    instanz.karte.invalidateSize();
  }
}

export function destroy() {
  if (!instanz) return;
  clearTimeout(instanz.debounceTimer);
  clearInterval(instanz.abspielTimer);
  if (instanz.infoButton) instanz.infoButton.destroy();
  if (instanz.karte) {
    instanz.karte.remove();
  }
  instanz.container.innerHTML = '';
  instanz.container.classList.remove('karte-viz-container');
  instanz = null;
}
