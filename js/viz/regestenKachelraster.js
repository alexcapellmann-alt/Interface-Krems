// js/viz/regestenKachelraster.js
// Regesten-Kachelraster: Primäransicht der Urkunden-Seite (Abschnitt 4.2). Modul-
// Interface siehe Abschnitt 5: render(container, data, options) / destroy() / resize().
//
// Erwartete `data`: das flache `records`-Array aus dataLoader.js für urkunden.csv.
// Rein lesend - erstellt eigene DOM-Struktur (HTML, nicht SVG - Karten mit Fotos,
// Freitext und interaktiven Namen/Orten passen besser zu HTML als zu SVG), verändert
// keinen übergebenen Record.
//
// Fotoanzeige: siehe js/utils/fotoOrdner.js (liest data/foto_manifest.json, kein
// Live-Verzeichnislisting mehr). Fotos werden trotzdem lazy geladen
// (IntersectionObserver), um bei ~1068 Urkunden nicht alle Bilder sofort zu laden
// (Abschnitt 2: Lazy Loading).
//
// Kontext-erhaltender Wechsel (Abschnitt 4.2/7): Klick auf Person/Ort ruft bereits
// state.js: setFilterEntity() auf. Die Zielansicht, die diesen Filter ausliest,
// existiert in dieser Etappe noch nicht.
//
// KORREKTUR (Auftrag "Korrektur: Mindestgrößen-Platzhalter nicht für
// Kachelraster", siehe CHANGELOG): der im Folgeauftrag "Geteilte Viewport-
// Utilities" testweise ergänzte Mindestgrößen-Platzhalter (js/utils/
// bildschirmHinweis.js) wurde hier wieder entfernt - das Kachelraster ist
// ein reines, bereits reflow-fähiges CSS-Grid (siehe .regk-raster,
// auto-fill/minmax) und soll genau das auf schmalen Bildschirmen auch
// nutzen dürfen, statt komplett durch einen Platzhalter blockiert zu
// werden. Der Mindestgrößen-Platzhalter gilt ab sofort nur noch für Canvas-/
// SVG-Diagramm-Module mit fester Interaktionslogik (Zoom/Pan/Force-Layout,
// z.B. zeitachse.js), nicht für Karten-/Listen-basierte, reflow-fähige
// Module wie dieses hier.
//
// AUFTRAG "Kachel-Klick statt 'mehr/weniger anzeigen'-Button": der frühere
// eigene Button (mit Text "mehr anzeigen"/"weniger anzeigen") entfällt
// vollständig - Klick auf die GESAMTE Kachelfläche klappt den Regest-Text
// jetzt auf/zu (siehe baueKarte()), weiterhin pro Kachel unabhängig, kein
// Akkordeon. Zwei Ausnahmen bleiben von diesem Kachel-weiten Klick
// unberührt (eigenes event.stopPropagation() bzw. Fokus-Ziel-Prüfung, siehe
// dortige Kommentare): Fotos (öffnen weiterhin nur die Lightbox) und
// Personen-/Ortsnamen (lösen weiterhin nur setFilterEntity() aus, deren
// Zielansicht laut Nicht-Ziel weiterhin nicht existiert). Neues Chevron-Icon
// (baueChevron()) zeigt den Auf-/Zuklapp-Zustand visuell an.
//
// AUFTRAG "Geteilter Info-Button mit Erklär-Popover": dieses Modul hatte
// bisher keinen vergleichbaren Bedienhinweis - reine Ergänzung. Info-Button
// (js/utils/infoButton.js) oben rechts im Werkzeugleisten-Bereich, neben der
// Filterleiste (siehe .regk-werkzeugleiste in fuegeStyleEin()/render()).
//
// AUFTRAG "Kalender-Heatmap-Korrekturen, Sidebar-Umbau, Kategorie-Umbenennung",
// Punkt 4: Klick auf einen Eintrag in der neuen schlanken Sidebar-Urkunden-
// Liste (js/utils/sidebar.js' baueUrkundenListeInhalt(), aktuell genutzt von
// kalenderHeatmap.js) navigiert hierher und übergibt per state.js'
// zielSignatur (einmaliger Kanal, siehe dortiger Kommentar) die Ziel-Urkunde.
// render() liest sie EINMAL und löscht sie sofort wieder (clearZielSignatur())
// - sonst würde ein späterer, regulärer Aufruf dieses Moduls fälschlich
// erneut isolieren.
//
// KORREKTUR (Auftrag "Kalender-Legende zurück, Sidebar-Navigation isolieren,
// Expand-Umrandung", Punkt 3, siehe CHANGELOG): vorher wurde aus der Ziel-
// Signatur nur eine PASSENDE SEITE im ungefilterten Datensatz berechnet - die
// Zielkachel klappte dadurch unter allen anderen (unveränderten) Kacheln auf,
// Nutzer mussten sie ggf. erst auf der Seite finden/scrollen. Jetzt wird die
// Signatur stattdessen programmatisch in den bestehenden Suchschlitz
// eingetragen (filterleiste.js' setzeSuchbegriff(), "so als hätte man sie
// eingetippt") - die bestehende Suchlogik (ermittleGefilterteRecords())
// filtert dadurch von selbst auf die exakte/teilstring-passende(n) Urkunde(n),
// keine separate Positions-/Seitenberechnung mehr nötig. zeichneKachelraster()
// klappt die (jetzt garantiert auf Seite 1 sichtbare) Zielkachel weiterhin per
// echtem karte.click() auf (unverändert) und scrollt sie in den sichtbaren
// Bereich - instanz.zielSignatur wird danach gelöscht, damit ein späterer,
// unabhängiger Redraw (z.B. weitere Sucheingabe) nicht erneut aufklappt.
//
// KLEINAUFTRAG "Kachelraster – Paginierung auch unten": zweite, identische
// Paginierungsleiste unterhalb des Kachelrasters ergänzt (bauePaginierung()
// bekommt einen `position`-Parameter "oben"/"unten", nur für aria-label/
// Rand-Abstand relevant) - dieselbe, bereits in personenliste.js etablierte
// Zwei-Leisten-Konvention: beide Leisten werden bei jedem Seitenwechsel aus
// demselben instanz.aktuelleSeite komplett neu gebaut (zeichneKachelraster(),
// s.u.), sind dadurch immer synchron, ohne eigenen Abgleichs-Code.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { ladeFotos } from '../utils/fotoOrdner.js';
import { leiteDatumsPraezisionAb } from '../utils/datePrecision.js';
import { filtereErklaerungFuerFeld } from '../utils/uncertainty.js';
import { setFilterEntity, getZustand, clearZielSignatur } from '../core/state.js';
import { CAT_COLORS, UNSICHERHEIT_SYMBOL } from '../config/constants.js';
import { baueGenanntePersonenZeile } from '../utils/genanntePersonen.js';
import { passendeTextfarbe } from '../utils/kategorieFarben.js';
import { oeffneLightbox } from '../utils/lightbox.js';
import { erzeugeFilterleiste } from '../utils/filterleiste.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';

// Auftrag "Geteilter Info-Button", Punkt 3 - Text wörtlich wie im Auftrag
// formuliert übernommen (Akzeptanzkriterium: "keine eigenmächtige
// Umformulierung"), Absätze durch Leerzeilen getrennt (siehe infoButton.js).
const KACHELRASTER_INFO_TEXT = `Dieses Kachelraster zeigt die Urkunden des Stadtarchivs Krems als kurze Zusammenfassungen (Regesten). Jede Kachel enthält Datum, Ort, beteiligte Personen und thematische Kategorien einer einzelnen Urkunde.

Klick auf eine Kachel zeigt den vollständigen Text sowie vorhandene Fotos der Urkunde. Über die Suche lässt sich nach Signatur, Ort, Person oder Stichwort filtern, über das Kategorie-Menü nach Themenbereich. Der Button „Unsicherheiten anzeigen" blendet nur jene Urkunden ein, bei denen Datierung, Ort oder beteiligte Personen nicht sicher überliefert sind – inklusive einer kurzen Begründung.`;

let instanz = null; // { container, inhaltContainer, infoButton, records, suchtextByRecord, options, beobachter, aktuelleSeite, filterZustand, filterleiste } – ein aktives Kachelraster pro Modul-Ladung

// Schlüssel entsprechen den Präzisionsstufen aus datePrecision.js (Abschnitt 12, v4.2).
// Punkt 4 (Datumsformat-Überarbeitung): 'exact' bewusst OHNE Eintrag hier - eine
// exakte Datierung (z.B. "1259 XI 17") ist an ihrem eigenen Format schon
// eindeutig als Tag-genau erkennbar, ein früherer Klammerzusatz zu diesem Fall
// war rein redundant und wurde entfernt. Die beiden explizit als unverändert verlangten Zusätze
// ("ungefähre Angabe", "nur Jahr") sowie "Jahr und Monat"/"kein Datum
// überliefert" bleiben unangetastet - siehe baueDatumFeld() weiter unten.
const PRAEZISIONS_LABEL = {
  month: 'Jahr und Monat',
  approx: 'ungefähre Angabe',
  year: 'nur Jahr',
  undatiert: 'kein Datum überliefert'
};

// AUFTRAG "Teil 2f", Punkt 1: keine lokale Kopie mehr - zentrale Konstante
// aus config/constants.js, unter demselben lokalen Namen weiterverwendet.
const WARN_SYMBOL = UNSICHERHEIT_SYMBOL;

const SUCH_PLACEHOLDER = 'Suche in Signatur, Regest, Orten, Personen, Kategorien …';

// Punkt 1 (Paginierung): 50 Kacheln pro Seite (Auftrag), analog zum
// Alpha-Prototyp. Verhindert bei ~1069 Urkunden das gleichzeitige Rendern
// aller Kacheln (Performance).
const SEITENGROESSE = 50;

// Punkt 6 (Unsicherheiten-Filter): eine Urkunde gilt als "unsicher", wenn
// mindestens eines der drei Unsicher-Flags gesetzt ist ODER unsicherheit_anmerkung
// nicht leer ist (Auftrag, wörtlich). unsicherheit_anmerkung kann laut
// dataLoader.js' Pipe-Konvention ein Array (mehrere Einträge) oder ein
// einzelner String sein - beide Formen werden geprüft.
// Punkt 2 (Kategoriefilter): die 16 tatsächlichen Kategorie-Werte aus
// CAT_COLORS (Auftrag, wörtlich: "ohne default") - `__unbekannt__` wird
// zusätzlich ausgeschlossen, obwohl der Auftrag ihn nicht namentlich nennt,
// weil es sich (wie `default`) um einen rein technischen Fallback-Schlüssel
// mit identischem Grauwert handelt, der nie ein echter kategorien-Feldwert
// einer Urkunde ist - ohne diesen Ausschluss wären es 17 statt der im Auftrag
// geforderten 16 Einträge.
function ermittleAlleKategorien() {
  return Object.keys(CAT_COLORS).filter((schluessel) => schluessel !== 'default' && schluessel !== '__unbekannt__');
}

// Punkt 1 (Suchschlitz): durchsucht laut Auftrag genau die Felder signatur,
// regest, orte, personen, kategorien - orte/personen/kategorien können laut
// dataLoader.js' Pipe-Konvention Arrays (mehrere Werte) oder einzelne Strings
// sein, beide Formen werden vor dem Zusammenfügen vereinheitlicht. Einmal pro
// Record vorab in Kleinbuchstaben gebaut (siehe Aufrufer in render()), damit
// bei jedem Tastendruck nur noch ein einfacher Teilstring-Vergleich pro
// Record nötig ist, kein erneutes Array-Joinen/Lowercasing.
function baueDurchsuchbarenText(record) {
  const felder = [record.signatur, record.regest, record.orte, record.personen, record.kategorien];
  return felder
    .map((wert) => (Array.isArray(wert) ? wert.join(' ') : wert))
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function istRecordUnsicher(record) {
  const anmerkung = record.unsicherheit_anmerkung;
  const anmerkungVorhanden = Array.isArray(anmerkung) ? anmerkung.length > 0 : !!(anmerkung && anmerkung.trim() !== '');
  return !!(record.datum_unsicher || record.orte_unsicher || record.personen_unsicher || anmerkungVorhanden);
}

// Baut die Klartext-Anzeige für eine unsichere Urkunde (Punkt 6): zeigt ALLE
// Einträge aus unsicherheit_anmerkung (bereits im verbindlichen Format
// "<feldname>: <Begründung>", siehe uncertainty.js), pipe-separiert bei
// mehreren Feldern - anders als filtereErklaerungFuerFeld() (das GEZIELT nur
// die Erklärung EINES Feldes für dessen eigenen Tooltip herausfiltert), wird
// hier bewusst der VOLLSTÄNDIGE Text für die ganze Kachel gezeigt.
// Fallback, falls ein Unsicher-Flag gesetzt ist, aber keine Anmerkung
// hinterlegt wurde (Datenlücke): Feldname wird trotzdem genannt statt
// stillschweigend nichts anzuzeigen (Abschnitt 12: Grund muss sichtbar sein).
function baueUnsicherheitKlartext(record) {
  const anmerkung = record.unsicherheit_anmerkung;
  const eintraege = anmerkung ? (Array.isArray(anmerkung) ? anmerkung : [anmerkung]).filter(Boolean) : [];
  if (eintraege.length > 0) return eintraege.join(' | ');

  const fallback = [];
  if (record.datum_unsicher) fallback.push('datum: (keine Begründung hinterlegt)');
  if (record.orte_unsicher) fallback.push('orte: (keine Begründung hinterlegt)');
  if (record.personen_unsicher) fallback.push('personen: (keine Begründung hinterlegt)');
  return fallback.join(' | ');
}

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    /* Auftrag "Geteilter Info-Button": Filterleiste links, Info-Button
       rechts - gleiche Zeile, analog zu zeitachse.js' Werkzeugleiste
       (dort .zeitachse-werkzeugleiste, hier derselbe Aufbau). */
    .regk-werkzeugleiste { display: flex; align-items: flex-start; justify-content: space-between;
      gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-2); }
    .regk-raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-3); }
    /* cursor:pointer gilt für die gesamte Kachelfläche (Auftrag "Kachel-Klick",
       Punkt 2) - Foto/Entity-Buttons setzen ihren eigenen cursor:pointer
       bereits explizit selbst (keine Kollision, gleicher Wert, nur andere
       Aktion dahinter). */
    .regk-karte { border: 1px solid var(--border); border-radius: var(--radius); padding: var(--space-2); font-size: var(--fs-sm);
      background: var(--surface); cursor: pointer; }
    /* Auftrag "Kalender-Legende zurück, Sidebar-Navigation isolieren,
       Expand-Umrandung", Punkt 4: jede aufgeklappte Kachel bekommt eine
       deutliche Umrandung in der App-Akzentfarbe - unabhängig davon, ob sie
       per normalem Klick oder per Sidebar-Navigation (Punkt 3) geöffnet
       wurde, da beide denselben aria-expanded-Zustand auf .regk-karte selbst
       setzen (schalteAufklappzustandUm()), kein zusätzlicher Selektor/
       State nötig. box-sizing:border-box (base.css) verhindert dabei jede
       Layout-Verschiebung im Grid gegenüber eingeklappten Kacheln. */
    .regk-karte[aria-expanded="true"] { border: 3px solid var(--accent); }
    .regk-karte-titel { display: flex; align-items: center; gap: var(--space-1); }
    .regk-karte-titel-text { flex: 1 1 auto; }
    /* Punkt 2: Chevron dreht sich beim Auf-/Zuklappen (sanfte Transition) -
       aria-hidden (siehe baueChevron()), rein visueller Zustandshinweis. */
    .regk-chevron { flex: 0 0 auto; display: inline-block; color: var(--text-muted);
      transition: transform .15s ease; }
    .regk-chevron.regk-chevron-aufgeklappt { transform: rotate(180deg); }
    .regk-feld-unsicher { border: 1px dashed var(--unsicher); padding: 1px 4px; border-radius: 3px; }
    .regk-entity-btn { background: none; border: none; color: var(--accent); text-decoration: underline; cursor: pointer; padding: 0; font: inherit; }
    .regk-foto-platzhalter { font-style: italic; color: var(--text-muted); }
    .regk-foto-bereich img { max-width: 100px; max-height: 100px; margin: 2px; cursor: pointer; border-radius: 3px;
      transition: box-shadow .15s ease; }
    .regk-foto-bereich img:hover { box-shadow: 0 0 0 2px var(--accent); }
    /* :focus-visible-Rahmen kommt bereits aus der globalen [tabindex]:focus-visible-
       Regel in base.css - hier keine eigene Regel nötig. */
    .regk-regest { max-height: 4.5em; overflow: hidden; margin: 4px 0; }
    .regk-regest.regk-aufgeklappt { max-height: none; }
    .regk-kategorie-badge { display: inline-block; padding: 1px 8px; border-radius: 99px; font-size: .8em; font-weight: 600; margin: 1px 4px 1px 0; }
    .regk-warn-icon { color: var(--unsicher); margin-right: 4px; cursor: default; }
    .regk-unsicher-klartext { border: 1px dashed var(--unsicher); border-radius: var(--radius); padding: var(--space-1) var(--space-2);
      margin: 4px 0; font-size: .85em; color: var(--unsicher); background: color-mix(in srgb, var(--unsicher) 8%, transparent); }
    .regk-paginierung { display: flex; align-items: center; justify-content: center; gap: var(--space-3); flex-wrap: wrap; }
    .regk-paginierung-oben { margin-bottom: var(--space-3); }
    .regk-paginierung-unten { margin-top: var(--space-3); }
    .regk-paginierung button { min-height: 44px; min-width: 44px; padding: var(--space-2) var(--space-3); font: inherit; cursor: pointer;
      border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
    .regk-paginierung button:hover:not(:disabled) { border-color: var(--accent); background: var(--bg); }
    .regk-paginierung button:disabled { opacity: .4; cursor: not-allowed; }
    .regk-paginierung-status { font-size: var(--fs-sm); color: var(--text-muted); text-align: center; }
  `;
  container.appendChild(style);
}

// Baut anklickbare Namen/Orte (Abschnitt 4.2: Kontext-erhaltender Wechsel). Setzt
// bereits echten Filter-Zustand über state.js; die Zielansicht, die ihn ausliest,
// existiert in dieser Etappe noch nicht.
//
// Auftrag "Kachel-Klick statt 'mehr/weniger anzeigen'-Button", Ausnahme
// Links: event.stopPropagation() verhindert, dass ein Klick (auch der
// synthetische Klick, den Browser bei Enter/Leertaste auf einem fokussierten
// <button> selbst auslösen) zusätzlich den neuen Kachel-weiten Klick-Handler
// erreicht und die Kachel ungewollt mit auf-/zuklappt - setFilterEntity()
// selbst bleibt unverändert (Nicht-Ziel: keine Aktivierung der Links).
function baueEntityButtons(werte, typ) {
  const wrapper = document.createElement('span');
  werte.forEach((wert, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'regk-entity-btn';
    btn.textContent = wert;
    btn.setAttribute('aria-label', `Nach ${typ === 'ort' ? 'Ort' : 'Person'} ${wert} filtern`);
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      setFilterEntity(typ, wert);
    });
    wrapper.appendChild(btn);
    if (i < werte.length - 1) wrapper.appendChild(document.createTextNode(', '));
  });
  return wrapper;
}

// Markiert ein einzelnes Feld als unsicher (gestrichelt, Tooltip) statt der ganzen
// Karte (Abschnitt 11: Kennzeichnung pro Feld). feldname wird an
// filtereErklaerungFuerFeld() gereicht, damit bei mehreren unsicheren Feldern
// derselben Zeile nur die zu DIESEM Feld passende Erklärung im Tooltip erscheint
// (Abschnitt 11, v4.2: verbindliches Format "<feldname>: <Erklärung>").
function baueFeldMitUnsicherheit(inhaltElement, istUnsicher, anmerkung, feldname, container) {
  const feld = document.createElement('span');
  feld.appendChild(inhaltElement);
  if (!istUnsicher) return feld;

  feld.classList.add('regk-feld-unsicher');
  feld.setAttribute('tabindex', '0');
  feld.setAttribute('aria-label', 'Angabe unsicher, Details im Tooltip');
  const text = filtereErklaerungFuerFeld(anmerkung, feldname) || 'Angabe unsicher';
  feld.addEventListener('mouseenter', () => zeigeTooltip(text, feld, container));
  feld.addEventListener('focus', () => zeigeTooltip(text, feld, container));
  feld.addEventListener('mouseleave', versteckeTooltip);
  feld.addEventListener('blur', versteckeTooltip);
  return feld;
}

function baueListenFeld(label, werte, entityTyp, feldname, unsicher, anmerkung, container, zeigeUnsicherheit) {
  if (!werte || werte.length === 0) return null;
  const liste = Array.isArray(werte) ? werte : [werte];
  const feld = document.createElement('p');
  feld.appendChild(document.createTextNode(`${label}: `));
  feld.appendChild(baueFeldMitUnsicherheit(baueEntityButtons(liste, entityTyp), zeigeUnsicherheit && unsicher, anmerkung, feldname, container));
  return feld;
}

// Punkt 4: bei 'exact' entfällt der Klammerzusatz vollständig (siehe
// PRAEZISIONS_LABEL-Kommentar oben) - PRAEZISIONS_LABEL[praezision] ist für
// 'exact' bewusst undefined, daher hier explizit prüfen statt blind
// zusammenzusetzen.
function baueDatumFeld(record, container, zeigeUnsicherheit) {
  const praezision = leiteDatumsPraezisionAb(record.datum);
  const datumsText = record.datum || '(kein Datum)';
  const label = PRAEZISIONS_LABEL[praezision];
  const inhalt = document.createElement('span');
  inhalt.textContent = label ? `${datumsText} (${label})` : datumsText;
  const feld = document.createElement('p');
  feld.appendChild(baueFeldMitUnsicherheit(inhalt, zeigeUnsicherheit && record.datum_unsicher, record.unsicherheit_anmerkung, 'datum', container));
  return feld;
}

// Auftrag "Kachel-Klick statt 'mehr/weniger anzeigen'-Button": der
// vormalige eigene Button samt Toggle-Logik entfällt hier vollständig - das
// Auf-/Zuklappen wird jetzt vom Kachel-weiten Klick-Handler in baueKarte()
// gesteuert (der dort auch die Referenz auf dieses <p>-Element braucht, um
// dessen Klasse umzuschalten). Diese Funktion baut daher nur noch den reinen
// Textabsatz, keinen Wrapper/Button mehr.
function baueRegestBereich(text) {
  const absatz = document.createElement('p');
  absatz.className = 'regk-regest';
  absatz.textContent = text || '(kein Regest)';
  return absatz;
}

// Fehlt der Ordner oder ist er leer, erscheint "Foto folgt" statt eines kaputten
// Bild-Symbols (Abschnitt 3) - sowohl sofort (kein foto_ordner) als auch nach dem
// lazy geladenen Ergebnis (Ordner existiert nicht/ist leer).
function baueFotoBereich(record, beobachter) {
  const bereich = document.createElement('div');
  bereich.className = 'regk-foto-bereich';

  if (!record.foto_ordner) {
    bereich.textContent = 'Foto folgt';
    bereich.classList.add('regk-foto-platzhalter');
    return bereich;
  }

  bereich.textContent = 'Fotos werden geladen…';
  beobachter.beobachte(bereich, async () => {
    const urls = await ladeFotos(record.foto_ordner);
    bereich.textContent = '';
    if (urls.length === 0) {
      bereich.textContent = 'Foto folgt';
      bereich.classList.add('regk-foto-platzhalter');
      return;
    }
    // Punkt 7 (Lightbox): dieselbe Liste + derselbe Alt-Text, die/den auch
    // die Vorschaubilder selbst tragen, wird komplett an oeffneLightbox()
    // weitergereicht (nicht nur die angeklickte URL) - dadurch funktioniert
    // die Bild-zu-Bild-Navigation innerhalb der Lightbox bei mehreren Fotos
    // pro Urkunde, ohne dass lightbox.js irgendetwas über "Urkunden" wissen
    // müsste.
    const altText = `Foto zu Urkunde ${record.signatur}`;
    const lightboxBilder = urls.map((url) => ({ url, alt: altText }));
    urls.forEach((url, index) => {
      const img = document.createElement('img');
      img.src = url;
      img.alt = altText;
      img.loading = 'lazy';
      // Vorschaubild selbst ist kein natives interaktives Element - tabindex
      // + eigener Enter/Leertaste-Handler machen es tastaturbedienbar
      // (dasselbe Muster wie bei den Entity-Buttons/Feld-Unsicher-Markierungen
      // weiter oben in dieser Datei). Klick auf das Foto ist bewusst ein
      // eigener, unabhängiger Listener auf dem <img> selbst - kein Bubbling
      // zur Kachel, der Expand/Collapse-Zustand bleibt dadurch unberührt.
      //
      // Auftrag "Kachel-Klick statt 'mehr/weniger anzeigen'-Button", Ausnahme
      // Fotos: event.stopPropagation() im Klick-Handler verhindert explizit,
      // dass der Klick zusätzlich den neuen Kachel-weiten Klick-Handler
      // erreicht (siehe baueKarte()) - ohne dieses stopPropagation() würde
      // ein Foto-Klick die Lightbox öffnen UND gleichzeitig die Kachel auf-/
      // zuklappen. Der Enter/Leertaste-Handler braucht KEIN eigenes
      // stopPropagation(): baueKarte()s Tastatur-Handler reagiert ohnehin
      // nur, wenn die Kachel SELBST (nicht ein Kind-Element wie dieses Foto)
      // den Fokus trägt, siehe dortiger Kommentar.
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', `${altText}, vergrößert anzeigen`);
      img.addEventListener('click', (event) => {
        event.stopPropagation();
        oeffneLightbox(lightboxBilder, index);
      });
      img.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          oeffneLightbox(lightboxBilder, index);
        }
      });
      bereich.appendChild(img);
    });
  });

  return bereich;
}

// Punkt 3 (Kategorie-Farbcodierung): Hintergrundfarbe aus der verbindlichen
// CAT_COLORS-Palette (js/config/constants.js), Textfarbe per passendeTextfarbe()
// (kategorieFarben.js - echte WCAG-Formel, garantiert ≥4,5:1 für jede dort
// hinterlegte Farbe, siehe dortige Dokumentation/Verifikation). Fallback
// bewusst `CAT_COLORS.default` (NICHT `__unbekannt__`, obwohl beide auf
// denselben Grauwert zeigen) - exakt dasselbe Muster wie in zeitachse.js/
// kalenderHeatmap.js/bipartiterGraph.js/allen übrigen CAT_COLORS-Nutzern,
// damit ein unbekannter/fehlender Kategoriewert nie zu einem direkten,
// ungeschützten CAT_COLORS[kategorie]-Zugriff ohne Fallback führen kann
// (Abschnitt 12/WCAG 1.4.1: das Textlabel selbst bleibt in jedem Fall
// sichtbar - Farbe kommt NUR als zusätzlicher Hintergrund hinzu, nie als
// einziges Merkmal).
function baueKategorienFeld(record) {
  if (!record.kategorien || record.kategorien.length === 0) return null;
  const kategorienListe = Array.isArray(record.kategorien) ? record.kategorien : [record.kategorien];
  const feld = document.createElement('p');
  feld.appendChild(document.createTextNode('Kategorien: '));
  kategorienListe.forEach((kategorie) => {
    const badge = document.createElement('span');
    badge.className = 'regk-kategorie-badge';
    const farbe = CAT_COLORS[kategorie] || CAT_COLORS.default;
    badge.style.backgroundColor = farbe;
    badge.style.color = passendeTextfarbe(farbe);
    badge.textContent = kategorie;
    feld.appendChild(badge);
  });
  return feld;
}

// Punkt 6 (Unsicherheiten-Filter): Warn-Icon + Tooltip ist dieselbe, bereits
// app-weit etablierte Konvention (treemap.js/sunburst.js/icicle.js/
// circlePacking.js/ganttDiagramm.js) - hier neu für dieses Modul ergänzt, auf
// Kachel-Ebene statt pro Feld (die bestehenden gestrichelten Feld-Umrandungen
// bleiben zusätzlich UNVERÄNDERT bestehen, siehe baueFeldMitUnsicherheit()).
// Nur sichtbar, wenn der Filter aktiv ist (dann ist die Kachel per Definition
// unsicher, da sonst herausgefiltert) - kein zusätzlicher istRecordUnsicher()-
// Aufruf nötig, aber als explizite Bedingung belassen für den Fall künftiger
// Änderungen an der Filterlogik.
function baueWarnIcon(record, container) {
  const span = document.createElement('span');
  span.className = 'regk-warn-icon';
  span.setAttribute('tabindex', '0');
  span.setAttribute('aria-label', 'Angaben unsicher, Details im Tooltip');
  span.textContent = WARN_SYMBOL;
  const text = baueUnsicherheitKlartext(record) || 'Angaben unsicher';
  span.addEventListener('mouseenter', () => zeigeTooltip(text, span, container));
  span.addEventListener('focus', () => zeigeTooltip(text, span, container));
  span.addEventListener('mouseleave', versteckeTooltip);
  span.addEventListener('blur', versteckeTooltip);
  return span;
}

// Punkt 6: die Klartext-Anzeige selbst - ersetzt NICHT die bestehenden
// Konventionen (gestrichelter Rand pro Feld, ⚠-Icon mit Tooltip), kommt
// zusätzlich hinzu, direkt sichtbar ohne Hover/Fokus nötig.
function baueUnsicherheitBereich(record) {
  const text = baueUnsicherheitKlartext(record);
  if (!text) return null;
  const absatz = document.createElement('p');
  absatz.className = 'regk-unsicher-klartext';
  absatz.textContent = `Unsicher: ${text}`;
  return absatz;
}

// Auftrag "Kachel-Klick statt 'mehr/weniger anzeigen'-Button", Punkt 2: rein
// dekoratives Statussymbol (aria-hidden - die eigentliche Zustandsauskunft
// für Screenreader liefert aria-expanded auf der Kachel selbst, siehe
// baueKarte()). Unicode-Zeichen statt eigenem SVG, um beim bereits im
// Projekt etablierten Muster für einfache Richtungs-/Status-Icons zu
// bleiben (vgl. "←"/"→" in bauePaginierung(), "⚠" WARN_SYMBOL oben).
function baueChevron() {
  const chevron = document.createElement('span');
  chevron.className = 'regk-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.textContent = '▾';
  return chevron;
}

function baueKarte(record, beobachter, container, zeigeUnsicherheit) {
  const karte = document.createElement('article');
  karte.className = 'regk-karte';
  karte.setAttribute('tabindex', '0');
  karte.setAttribute('aria-label', `Urkunde ${record.signatur}`);
  // Punkt 1: aria-expanded macht den Auf-/Zuklapp-Zustand der Kachel für
  // Screenreader zugänglich (Standard-ARIA-Muster für "disclosure"-Widgets)
  // - bewusst OHNE role="button" auf demselben Element, das der Aufrufer
  // (zeichneKachelraster()) bereits als role="listitem" markiert: eine
  // Kachel ist weiterhin primär ein Listeneintrag der Urkundenliste, der
  // ZUSÄTZLICH auf-/zuklappbar ist - nicht umgekehrt ein "Button", der
  // zufällig in einer Liste steht. aria-expanded ist rollenunabhängig
  // gültig und verträgt sich mit role="listitem" ohne Konflikt.
  karte.setAttribute('aria-expanded', 'false');

  const titel = document.createElement('h3');
  titel.className = 'regk-karte-titel';
  if (zeigeUnsicherheit && istRecordUnsicher(record)) {
    titel.appendChild(baueWarnIcon(record, container));
  }
  const signaturText = document.createElement('span');
  signaturText.className = 'regk-karte-titel-text';
  signaturText.textContent = record.signatur;
  titel.appendChild(signaturText);
  const chevron = baueChevron();
  titel.appendChild(chevron);
  karte.appendChild(titel);
  karte.appendChild(baueDatumFeld(record, container, zeigeUnsicherheit));

  const orteFeld = baueListenFeld('Orte', record.orte, 'ort', 'orte', record.orte_unsicher, record.unsicherheit_anmerkung, container, zeigeUnsicherheit);
  if (orteFeld) karte.appendChild(orteFeld);

  // AUFTRAG "Teil 2i": die vormalige, hier gebaute "Personen"-Zeile
  // (Filter-Buttons über setFilterEntity(), optisch wie Links, aber ohne
  // Navigation zur Personenliste) entfernt - die weiter unten gebaute,
  // tatsächlich verlinkte Zeile (baueGenanntePersonenZeile()) trägt jetzt
  // dieselbe Beschriftung "Personen" und ersetzt sie vollständig, keine
  // doppelte Zeile mehr. Die Orte-Filter-Buttons (orteFeld oben) sind vom
  // Nicht-Ziel dieses Auftrags ausgenommen und bleiben unverändert.

  const kategorienFeld = baueKategorienFeld(record);
  if (kategorienFeld) karte.appendChild(kategorienFeld);

  if (zeigeUnsicherheit && istRecordUnsicher(record)) {
    const unsicherBereich = baueUnsicherheitBereich(record);
    if (unsicherBereich) karte.appendChild(unsicherBereich);
  }

  const regestAbsatz = baueRegestBereich(record.regest);
  karte.appendChild(regestAbsatz);
  karte.appendChild(baueFotoBereich(record, beobachter));

  // AUFTRAG "Teil 2g", Punkt 5 (Beschriftung seit Teil 2i "Personen" statt
  // "Genannte Personen", ersetzt die vormalige Filter-Buttons-Zeile oben
  // vollständig statt danebenzustehen): verlinkte Personenzeile unter dem
  // Regest - dieselbe Funktion wie js/fuehrungen/belegDarstellung.js (Punkt
  // 4, Auftrag wörtlich: "Wiederverwendung derselben Funktion, keine zweite
  // Umsetzung"). `personen`/`personen_id` sind dieselben index-parallelen
  // Listen (SCHEMA.md) wie dort. Bewusst IMMER sichtbar (nicht an
  // `regk-aufgeklappt` gekoppelt).
  const namen = Array.isArray(record.personen) ? record.personen : (record.personen ? [record.personen] : []);
  const ids = Array.isArray(record.personen_id) ? record.personen_id : (record.personen_id ? [record.personen_id] : []);
  const genanntePersonenZeile = baueGenanntePersonenZeile(
    namen.map((name, i) => ({ name, id: ids[i] || null })),
    { unsicher: zeigeUnsicherheit && !!record.personen_unsicher }
  );
  if (genanntePersonenZeile) {
    // Dieselbe Ausnahme vom kachelweiten Klick-Handler wie die Ortsnamen-
    // Buttons oben (baueEntityButtons()) - ein Linkklick darf die Kachel
    // nicht zusätzlich auf-/zuklappen.
    genanntePersonenZeile.addEventListener('click', (event) => {
      if (event.target.closest('a')) event.stopPropagation();
    });
    karte.appendChild(genanntePersonenZeile);
  }

  // Punkt 1 (Kernstück des Auftrags): Klick-Handler auf der GESAMTEN Kachel
  // statt nur auf dem entfallenen "mehr anzeigen"-Button - jeder Klick
  // innerhalb der Kachelfläche (Text, Hintergrund, Ränder) klappt sie auf/
  // zu, unabhängig von allen anderen Kacheln (kein Akkordeon, unverändert
  // aus dem ursprünglichen Punkt 2). Die beiden Ausnahmen (Foto, Orts-/
  // Personennamen) stoppen ihren eigenen Klick bereits selbst per
  // event.stopPropagation() (siehe baueFotoBereich()/baueEntityButtons()/
  // dem genanntePersonenZeile-Listener oben), erreichen diesen Handler also
  // gar nicht erst.
  function schalteAufklappzustandUm() {
    const aufgeklappt = regestAbsatz.classList.toggle('regk-aufgeklappt');
    karte.setAttribute('aria-expanded', String(aufgeklappt));
    chevron.classList.toggle('regk-chevron-aufgeklappt', aufgeklappt);
  }
  karte.addEventListener('click', schalteAufklappzustandUm);
  // Tastatur-Äquivalent zum entfallenen Button (der zuvor nativ per
  // Enter/Leertaste bedienbar war) - bewusst NUR, wenn die Kachel SELBST
  // (nicht ein fokussiertes Kind-Element wie Foto/Entity-Button/Warn-Icon)
  // den Fokus trägt: event.target !== karte filtert alle von Kind-Elementen
  // hochblubbernden keydown-Ereignisse zuverlässig heraus, ohne dass jedes
  // einzelne Kind-Element selbst ein stopPropagation() bräuchte (die
  // Kind-Elemente haben ohnehin bereits ihre eigene, unterschiedliche
  // Enter/Leertaste-Aktion, z.B. Lightbox öffnen statt Kachel umschalten).
  karte.addEventListener('keydown', (event) => {
    if (event.target !== karte) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      schalteAufklappzustandUm();
    }
  });

  return karte;
}

// Lädt Fotos erst, wenn eine Karte tatsächlich in den sichtbaren Bereich scrollt
// (Abschnitt 2: Lazy Loading) - verhindert ~1068 gleichzeitige Verzeichnis-Anfragen
// beim ersten Rendern. In destroy() über zerstoere() wieder freigegeben (Abschnitt 5).
function baueLazyBeobachter() {
  const callbacks = new WeakMap();
  const observer = new IntersectionObserver((eintraege) => {
    eintraege.forEach((eintrag) => {
      if (!eintrag.isIntersecting) return;
      const callback = callbacks.get(eintrag.target);
      if (callback) {
        callback();
        observer.unobserve(eintrag.target);
      }
    });
  });
  return {
    beobachte(element, callback) {
      callbacks.set(element, callback);
      observer.observe(element);
    },
    zerstoere() {
      observer.disconnect();
    }
  };
}

// Punkt 3 (Kombinationslogik): alle drei Filter (Unsicherheiten-Toggle,
// Kategorie, Suche) wirken per UND-Verknüpfung - jeder Schritt filtert das
// Ergebnis des vorherigen weiter ein, keiner überschreibt einen anderen. Bei
// komplett inaktiven Filtern alle Records unverändert (Normalzustand,
// Punkt 6 Auftrag wörtlich). Reihenfolge nach Aufwand gestaffelt (billige
// Boolean-/Array-Prüfungen zuerst, der Such-Teilstring-Vergleich zuletzt).
function ermittleGefilterteRecords() {
  const { records, options, filterZustand, suchtextByRecord } = instanz;
  let ergebnis = options.showUncertainty ? records.filter(istRecordUnsicher) : records;

  if (filterZustand.kategorie) {
    ergebnis = ergebnis.filter((record) => {
      const kategorienListe = Array.isArray(record.kategorien) ? record.kategorien : (record.kategorien ? [record.kategorien] : []);
      return kategorienListe.includes(filterZustand.kategorie);
    });
  }

  if (filterZustand.suchbegriff) {
    const suchbegriffKlein = filterZustand.suchbegriff.toLowerCase();
    ergebnis = ergebnis.filter((record) => suchtextByRecord.get(record).includes(suchbegriffKlein));
  }

  return ergebnis;
}

// Punkt 3: true, sobald IRGENDEIN Filter aktiv ist (nicht nur Unsicherheiten-
// Toggle wie vor diesem Auftrag) - steuert nur den Anzeigetext der
// Paginierung ("... gefilterten Treffern" vs. "... Treffern"), nicht die
// Filterlogik selbst (die läuft immer über ermittleGefilterteRecords()).
function istIrgendeinFilterAktiv() {
  const { options, filterZustand } = instanz;
  return !!(options.showUncertainty || filterZustand.kategorie || filterZustand.suchbegriff);
}

// Punkt 1 (Paginierung): "← Seite X / Y →" analog zum Alpha-Prototyp, dazu
// die (ggf. gefilterte) Trefferzahl dieser Seite/insgesamt (Punkt 6: "50 von
// 87 gefilterten Treffern"). Icon-Buttons mit aria-label statt Text
// "zurück"/"vor", wie an anderer Stelle im Projekt bereits üblich (z.B.
// ganttDiagramm.js' Zoom-Buttons).
//
// KLEINAUFTRAG "Kachelraster – Paginierung auch unten", Punkt 3: `position`
// ("oben"/"unten", neu) unterscheidet nur aria-label + Rand-Abstand
// (.regk-paginierung-oben/-unten) - dieselbe Zwei-Leisten-Konvention wie
// bereits in personenliste.js' gleichnamiger bauePaginierung() etabliert:
// zeichneKachelraster() (s.u.) baut BEIDE Leisten aus demselben
// instanz.aktuelleSeite bei jedem Redraw neu auf, sie sind dadurch immer
// synchron, ohne eigenen Abgleichs-Code zwischen zwei DOM-Instanzen.
function bauePaginierung(seite, gesamtSeiten, seitenTreffer, gesamtTreffer, gefiltert, position) {
  const leiste = document.createElement('div');
  leiste.className = `regk-paginierung regk-paginierung-${position}`;
  leiste.setAttribute('role', 'navigation');
  leiste.setAttribute('aria-label', `Regesten-Seiten (${position === 'oben' ? 'oberhalb' : 'unterhalb'} der Kacheln)`);

  const zurueckBtn = document.createElement('button');
  zurueckBtn.type = 'button';
  zurueckBtn.textContent = '←';
  zurueckBtn.setAttribute('aria-label', 'Vorherige Seite');
  zurueckBtn.disabled = seite <= 1;
  zurueckBtn.addEventListener('click', () => wechsleSeite(seite - 1));

  const status = document.createElement('span');
  status.className = 'regk-paginierung-status';
  const trefferText = gefiltert ? `${seitenTreffer} von ${gesamtTreffer} gefilterten Treffern` : `${seitenTreffer} von ${gesamtTreffer} Treffern`;
  status.textContent = `Seite ${seite} / ${gesamtSeiten} (${trefferText})`;

  const weiterBtn = document.createElement('button');
  weiterBtn.type = 'button';
  weiterBtn.textContent = '→';
  weiterBtn.setAttribute('aria-label', 'Nächste Seite');
  weiterBtn.disabled = seite >= gesamtSeiten;
  weiterBtn.addEventListener('click', () => wechsleSeite(seite + 1));

  leiste.append(zurueckBtn, status, weiterBtn);
  return leiste;
}

// Punkt 1: "Seitenwechsel scrollt die Ansicht nach oben" - offene Kachel-
// Expansionen dürfen dabei verloren gehen (Auftrag: "Reset ist unkritisch"),
// ein kompletter Neuaufbau der Seite (zeichneKachelraster()) erledigt das
// ohnehin von selbst, ohne eigene Aufräumlogik.
function wechsleSeite(neueSeite) {
  instanz.aktuelleSeite = neueSeite;
  zeichneKachelraster();
  window.scrollTo({ top: 0 });
}

// Baut/leert bewusst NUR instanz.inhaltContainer, nicht instanz.container
// selbst (Punkt 1/2 dieses Auftrags): die Filterleiste lebt in einem eigenen,
// von hier aus unangetasteten Geschwister-Container (siehe render()) - würde
// stattdessen wie zuvor der gesamte instanz.container geleert, würde bei
// jeder live gefilterten Eingabe (Suchschlitz-Debounce, Kategorie-Wechsel)
// auch das Sucheingabefeld selbst neu erzeugt und der Eingabefokus mitten in
// der Eingabe verloren gehen.
function zeichneKachelraster() {
  const { container, inhaltContainer, beobachter, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  inhaltContainer.innerHTML = '';

  const gefilterteRecords = ermittleGefilterteRecords();
  const gesamtSeiten = Math.max(1, Math.ceil(gefilterteRecords.length / SEITENGROESSE));
  // Klemmt eine ungültig gewordene Seitenzahl ab (z.B. Filter aktiviert,
  // vorherige Seite existiert in der gefilterten Treffermenge nicht mehr).
  instanz.aktuelleSeite = Math.min(Math.max(1, instanz.aktuelleSeite), gesamtSeiten);
  const start = (instanz.aktuelleSeite - 1) * SEITENGROESSE;
  const seiteRecords = gefilterteRecords.slice(start, start + SEITENGROESSE);

  inhaltContainer.appendChild(bauePaginierung(
    instanz.aktuelleSeite, gesamtSeiten, seiteRecords.length, gefilterteRecords.length, istIrgendeinFilterAktiv(), 'oben'
  ));

  const raster = document.createElement('div');
  raster.className = 'regk-raster';
  raster.setAttribute('role', 'list');
  raster.setAttribute('aria-label', 'Regesten-Kachelraster aller Urkunden');

  let zielKarteElement = null;
  seiteRecords.forEach((record) => {
    const karte = baueKarte(record, beobachter, container, zeigeUnsicherheit);
    karte.setAttribute('role', 'listitem');
    raster.appendChild(karte);
    if (instanz.zielSignatur && record.signatur === instanz.zielSignatur) {
      zielKarteElement = karte;
    }
  });

  inhaltContainer.appendChild(raster);

  // KLEINAUFTRAG "Kachelraster – Paginierung auch unten", Punkt 3: identische
  // zweite Leiste unterhalb der Kacheln (siehe bauePaginierung()-Kommentar
  // oben) - Nutzer, die ans Seitenende gescrollt haben, blättern hier weiter,
  // ohne zurückscrollen zu müssen.
  inhaltContainer.appendChild(bauePaginierung(
    instanz.aktuelleSeite, gesamtSeiten, seiteRecords.length, gefilterteRecords.length, istIrgendeinFilterAktiv(), 'unten'
  ));

  // Punkt 4 (Sidebar-Navigation, siehe Dateikopf-Kommentar): dank der
  // Suchschlitz-basierten Isolierung (statt Positions-/Seitenberechnung) ist
  // die Zielkachel bereits garantiert unter den gerade gefilterten
  // seiteRecords - karte.click() nutzt weiterhin den in baueKarte() bereits
  // verdrahteten Klick-Handler (schalteAufklappzustandUm()), keine zweite,
  // separate Aufklapp-Logik hier nötig. Einmalig (instanz.zielSignatur wird
  // danach gelöscht), damit ein späterer Redraw (weitere Sucheingabe, Filter)
  // nicht erneut aufklappt/scrollt.
  if (zielKarteElement) {
    zielKarteElement.click();
    zielKarteElement.scrollIntoView({ block: 'center' });
    zielKarteElement.focus();
    instanz.zielSignatur = null;
  }
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  container.innerHTML = '';
  fuegeStyleEin(container);

  // Eigener, von zeichneKachelraster() unangetasteter Geschwister-Container
  // für Filterleiste + Info-Button (siehe dortiger Kommentar) - nur EINMAL
  // hier erzeugt, nicht bei jedem Neuaufbau. Auftrag "Geteilter Info-Button":
  // werkzeugleiste ist jetzt eine Flex-Zeile (.regk-werkzeugleiste,
  // fuegeStyleEin()) - Filterleiste links, Info-Button rechts, analog zu
  // zeitachse.js' Werkzeugleiste.
  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'regk-werkzeugleiste';
  container.appendChild(werkzeugleiste);
  const filterContainer = document.createElement('div');
  werkzeugleiste.appendChild(filterContainer);
  const infoButtonContainer = document.createElement('div');
  werkzeugleiste.appendChild(infoButtonContainer);
  const inhaltContainer = document.createElement('div');
  container.appendChild(inhaltContainer);

  // Punkt 1 (Suchschlitz, Performance): der durchsuchbare Text pro Record wird
  // hier EINMAL beim Laden vorberechnet, nicht bei jedem Tastendruck neu
  // zusammengesetzt - als Map (nicht als zusätzliche Eigenschaft direkt auf
  // dem Record), weil dieses Modul laut Dateikopf-Vertrag "keinen übergebenen
  // Record verändert".
  const suchtextByRecord = new Map(data.map((record) => [record, baueDurchsuchbarenText(record)]));

  // Punkt 4 (siehe Dateikopf-Kommentar): einmaliger Konsum von state.js'
  // zielSignatur.
  const zielSignatur = getZustand().zielSignatur;
  clearZielSignatur();

  instanz = {
    container,
    inhaltContainer,
    records: data,
    suchtextByRecord,
    options: { showUncertainty: true, width: null, height: null, ...options },
    beobachter: baueLazyBeobachter(),
    aktuelleSeite: 1,
    filterZustand: { suchbegriff: '', kategorie: '' },
    filterleiste: null,
    infoButton: null,
    zielSignatur
  };

  instanz.filterleiste = erzeugeFilterleiste(filterContainer, {
    suchPlaceholder: SUCH_PLACEHOLDER,
    kategorien: ermittleAlleKategorien(),
    onChange: (zustand) => {
      instanz.filterZustand = zustand;
      instanz.aktuelleSeite = 1; // Punkt 1 Akzeptanzkriterium: neue Trefferzahl, alte Seitenzahl kann ungültig geworden sein
      zeichneKachelraster();
    }
  });

  instanz.infoButton = erzeugeInfoButton(infoButtonContainer, {
    text: KACHELRASTER_INFO_TEXT,
    ariaLabel: 'Erklärung zum Regesten-Kachelraster anzeigen'
  });

  // Punkt 3 (siehe Dateikopf-Kommentar): setzeSuchbegriff() löst denselben
  // onChange()-Pfad wie eine echte Eingabe aus (filterZustand/Seite 1/
  // zeichneKachelraster()) - der abschließende zeichneKachelraster()-Aufruf
  // im else-Zweig ist daher nur für den regulären Fall ohne Ziel-Signatur
  // nötig, sonst würde doppelt gezeichnet.
  if (zielSignatur) {
    instanz.filterleiste.setzeSuchbegriff(zielSignatur);
  } else {
    zeichneKachelraster();
  }
}

// KORREKTUR (Punkt 6, siehe CHANGELOG): resize() war bisher unconditional ein
// No-op ("reines CSS-Grid passt sich selbst an") - dadurch hatte der
// Unsicherheiten-Button trotz korrekt verdrahtetem onToggle in app.js
// (ruft resize({showUncertainty: aktiv}) auf) BUCHSTÄBLICH keine Wirkung,
// exakt der im Auftrag beschriebene Ist-Zustand. Jetzt: ein Aufruf MIT
// tatsächlichen Optionen (vom Unsicherheiten-Button) löst Filterung + Neu-
// aufbau + Rücksprung auf Seite 1 aus (die gefilterte Treffermenge hat eine
// andere Seitenzahl); ein Aufruf OHNE Argumente (reines Fenster-Resize, siehe
// app.js' verarbeiteResize()) bleibt bewusst der ursprüngliche No-op - das
// CSS-Grid regelt sein Layout weiterhin selbst, ein Neuaufbau aller Kacheln
// bei jedem Fenster-Resize wäre unnötig und würde störend auf Seite 1
// zurückspringen.
export function resize(neueOptionen = {}) {
  if (!instanz) return;
  if (Object.keys(neueOptionen).length === 0) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  instanz.aktuelleSeite = 1;
  zeichneKachelraster();
}

export function destroy() {
  if (!instanz) return;
  instanz.beobachter.zerstoere();
  instanz.filterleiste.destroy();
  instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
