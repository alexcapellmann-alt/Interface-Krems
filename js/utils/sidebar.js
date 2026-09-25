// js/utils/sidebar.js
// Gemeinsame Detail-Sidebar für Bestandsverzeichnis-Visualisierungen, die
// einzelne Bestände anklickbar machen. Ursprünglich lokal in treemap.js
// entstanden (Gerüst, Inhalt-Aufbau, Fokus-Handling), bei der Sunburst-
// Sidebar-Integration hierher ausgelagert, um Duplikation zu vermeiden -
// dieselbe Motivation wie bei js/utils/kategorieFarben.js. Reine
// Verschiebung, keine Verhaltensänderung (per Test gegen die Treemap
// verifiziert, siehe CHANGELOG).
//
// BEWUSST KEINE Annahme über die Geometrie/Interaktionslogik des
// aufrufenden Moduls (rechteckige Kachel, Bogen-Segment oder sonstige
// Form) - dieses Modul kennt nur: einen Container, einen Datensatz
// (`record`) und eine kleine Konfiguration (Kategoriename/-farbe,
// anzuzeigende Felder). Vorbereitet für icicle.js/circlePacking.js, ohne
// diese in diesem Auftrag inhaltlich zu ändern (siehe CHANGELOG - welche
// Anpassung dort nötig wird, ist dort dokumentiert).
//
// Fokus-Handling bleibt Aufgabe des AUFRUFENDEN Moduls: schliesseSidebar()
// nimmt ein "fokusZielFallback"-Element entgegen, auf das der Fokus
// zurückspringt, falls er sich beim Schließen INNERHALB der Sidebar befand
// (verhindert Verwaisen auf <body>, siehe CHANGELOG - ursprünglich in der
// Treemap-Sidebar behobener Bug). Ebenso bleibt das Verdrahten des
// Schließen-Buttons beim Aufrufer, da der jeweils passende Fallback
// (z. B. treemap.js' svgBereich) zum Zeitpunkt des Sidebar-Aufbaus noch
// nicht feststeht (die Modul-Instanz existiert erst danach) - baueSidebarGeruest()
// gibt den Button zurück, statt ihn selbst zu verdrahten.
//
// SCHEMA.md, Spalten "für Sidebar" markiert - Feldliste bewusst als
// Parameter gestaltet (nicht hart codiert): STANDARD_SIDEBAR_FELDER ist der
// bisher für alle Module identische Standard, ein zukünftiges Modul kann
// aber eine eigene Liste übergeben, ohne diese Datei zu ändern.
//
// AUFTRAG "Sidebar-Liste – Regest-Vorschauzeile & Inline-Detailansicht":
// erweitert die bestehende, schlanke Urkunden-Liste (baueUrkundenListeInhalt(),
// s. u.) um eine Regest-Vorschauzeile pro Eintrag UND um eine neue, ebenfalls
// Urkunden-spezifische Detailansicht (baueUrkundenDetailInhalt()) samt
// eigener Fotogalerie - für Module, die per Klick auf einen Listeneintrag
// bisher wegnavigiert sind (damals nur kalenderHeatmap.js) und stattdessen
// jetzt innerhalb derselben Sidebar zwischen Liste und Detail wechseln
// sollen. baueSidebarGeruest() liefert dafür zusätzlich einen (standardmäßig
// verstecktem) "← Zurück"-Button.
//
// AUFTRAG "Sidebar-Lightbox & app-weite Vereinheitlichung": zwei Ergänzungen.
// (1) Das Hauptfoto der Detailansicht ist jetzt anklickbar und öffnet die
// bereits bestehende, geteilte Lightbox (js/utils/lightbox.js, dieselbe wie
// im Regesten-Kachelraster) - siehe baueFotogalerie(). (2) Die komplette
// Öffnen-Orchestrierung (welcher Modus - Liste oder Detail -, Zurück-Klick,
// Scroll-Position, Fokus, aria-hidden/.offen) ist jetzt selbst Teil dieser
// Datei (zeigeUrkundenSidebar()/zeigeUrkundenDetail(), s.u.), NICHT mehr nur
// die reinen Inhalts-Bausteine - vorher musste jeder Aufrufer (kalenderHeatmap.js)
// diese Logik selbst nachbauen, obwohl sie für JEDES Modul mit
// Urkunden-Sidebar identisch sein soll ("1 Ergebnis -> Detail, mehrere ->
// Liste"). zeigeUrkundenSidebar()/zeigeUrkundenDetail() sind daher die
// einzigen Einstiegspunkte, die ein Aufrufer noch braucht - baueSidebarGeruest()
// verdrahtet den Zurück-Button jetzt selbst (nicht mehr Aufgabe des
// Aufrufers, anders als schliessenBtn: dessen fokusZielFallback ist pro
// Modul unterschiedlich und bleibt daher Aufgabe des Aufrufers), und
// schliesseSidebar() setzt den Listen-/Zurück-Zustand beim Schließen
// automatisch zurück. Migriert (siehe CHANGELOG/PROJEKTLOG für die
// Bestandsaufnahme): kalenderHeatmap.js (bereits korrekt, jetzt auf die
// neuen Einstiegspunkte verschlankt), zeitachse.js und dotPlot.js (beide
// hatten eine eigene, ältere, Foto-lose Parallel-Implementierung, siehe
// jeweiliger Dateikopf-Kommentar dort).

import { passendeTextfarbe } from './kategorieFarben.js';
import { CAT_COLORS } from '../config/constants.js';
import { ladeFotos } from './fotoOrdner.js';
import { oeffneLightbox } from './lightbox.js';
import { baueUnsicherheitAbsatz } from './unsicherAbsatz.js';
import { baueGenanntePersonenZeile } from './genanntePersonen.js';

export const STANDARD_SIDEBAR_FELDER = [
  { feld: 'zitierweise', label: 'Zitierweise' },
  { feld: 'kurzbeschreibung', label: 'Kurzbeschreibung' },
  { feld: 'form_inhalt', label: 'Form und Inhalt' },
  { feld: 'bestandsgeschichte', label: 'Bestandsgeschichte' },
  { feld: 'abgebende_stelle', label: 'Abgebende Stelle' },
  { feld: 'provenienz', label: 'Provenienz' },
  { feld: 'biografische_angaben', label: 'Biografische Angaben' },
  { feld: 'materialart', label: 'Materialart' },
  { feld: 'sprache_schrift', label: 'Sprache/Schrift' },
  { feld: 'literaturhinweis', label: 'Literaturhinweis' },
  { feld: 'veroeffentlichungen', label: 'Veröffentlichungen' },
  { feld: 'vorgaenger', label: 'Vorgänger' },
  { feld: 'nachfolger', label: 'Nachfolger' }
];

function alsText(wert) {
  return Array.isArray(wert) ? wert.join('; ') : wert;
}

function baueSidebarFeld(label, wert) {
  const feld = document.createElement('div');
  feld.className = 'bestand-sidebar-feld';
  const labelEl = document.createElement('div');
  labelEl.className = 'bestand-sidebar-feld-label';
  labelEl.textContent = label;
  const wertEl = document.createElement('div');
  wertEl.textContent = wert;
  feld.append(labelEl, wertEl);
  return feld;
}

function baueSidebarBadges(record, kategorieName, kategorieFarbe) {
  const badges = document.createElement('div');
  badges.className = 'bestand-sidebar-badges';
  [kategorieName, record.bkk_unterkategorie].filter(Boolean).forEach((wert) => {
    const badge = document.createElement('span');
    badge.className = 'bestand-sidebar-badge';
    badge.textContent = wert;
    badge.style.background = kategorieFarbe;
    badge.style.color = passendeTextfarbe(kategorieFarbe);
    badges.appendChild(badge);
  });
  return badges;
}

export function baueSidebarInhalt(record, { kategorieName, kategorieFarbe, felder = STANDARD_SIDEBAR_FELDER }) {
  const wrapper = document.createElement('div');
  wrapper.appendChild(baueSidebarBadges(record, kategorieName, kategorieFarbe));

  if (record.umfang) wrapper.appendChild(baueSidebarFeld('Umfang', record.umfang));

  felder.forEach(({ feld, label }) => {
    const wert = alsText(record[feld]);
    if (wert) wrapper.appendChild(baueSidebarFeld(label, wert));
  });

  // AUFTRAG "Teil 2g", Punkt 1: geteilte σ-Komponente statt "Achtung:
  // Angaben unsicher..." in Rot/Fett - siehe js/utils/unsicherAbsatz.js.
  const unsicherAbsatz = baueUnsicherheitAbsatz(record, ['daten_unsicher']);
  if (unsicherAbsatz) wrapper.appendChild(unsicherAbsatz);

  return wrapper;
}

// Geteilte, SCHLANKE Listendarstellung für Sidebar-Kontexte, die MEHRERE
// Urkunden gleichzeitig auflisten - bewusst ein ZWEITER, klar getrennter
// Darstellungsmodus neben baueSidebarInhalt() oben (Bestandsverzeichnis,
// Einzel-Datensatz, ein grundverschiedenes Schema, siehe dortiger
// Kommentar). Pro Eintrag Signatur + Kategorie(n) + eine Regest-
// Vorschauzeile (siehe unten), bewusst NICHT der volle Regest-Text - der
// ist einen Klick entfernt in der Detailansicht (baueUrkundenDetailInhalt(),
// s.u.) erreichbar.
//
// onEintragKlick(record): wird bei Klick/Enter/Leertaste auf einen
// Listeneintrag aufgerufen - reiner Baustein, kennt selbst kein "Modus"-
// Konzept (dieselbe Bewusst-keine-Navigations-/Router-Kopplung wie beim
// Rest dieser generischen Bausteine, siehe Dateikopf-Kommentar "BEWUSST
// KEINE Annahme über die Geometrie/Interaktionslogik des aufrufenden
// Moduls"). Der eigentliche Modus-Wechsel (Liste -> Detail) passiert seit
// dem Auftrag "Sidebar-Lightbox & app-weite Vereinheitlichung" NICHT mehr
// beim Aufrufer, sondern zentral in zeigeUrkundenListe() weiter unten, die
// hier automatisch `onEintragKlick: (record) => zeigeUrkundenDetail(...)`
// übergibt - ein externer Aufruf mit einem eigenen onEintragKlick bleibt
// trotzdem möglich (z.B. für einen künftigen, hier nicht vorhergesehenen
// Anwendungsfall), wird aber von keinem aktuellen Modul mehr gebraucht.
export function baueUrkundenListeInhalt(records, { onEintragKlick } = {}) {
  const liste = document.createElement('ul');
  liste.className = 'bestand-sidebar-urkunden-liste';

  records.forEach((record) => {
    const item = document.createElement('li');
    item.className = 'bestand-sidebar-urkunden-eintrag';
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `Urkunde ${record.signatur || '(ohne Signatur)'}, Details anzeigen`);

    const signatur = document.createElement('span');
    signatur.className = 'bestand-sidebar-urkunden-signatur';
    signatur.textContent = record.signatur || '(ohne Signatur)';
    item.appendChild(signatur);

    // Auftrag "Sidebar-Liste – Regest-Vorschauzeile & Inline-
    // Detailansicht", Punkt 1: eine Zeile Regest-Vorschau zusätzlich zu
    // Signatur/Kategorie. Bewusst CSS-basierte Ein-Zeilen-Kürzung
    // (white-space:nowrap + text-overflow:ellipsis, siehe
    // fuegeSidebarStyleEin()) statt einer JS-Zeichenanzahl-/Pixel-Kürzung
    // wie in den SVG-Modulen (dotPlot.js' ermittleBeschriftungstext() o.ä.)
    // - dort ist CSS-Textabschneidung mangels SVG-Unterstützung keine
    // Option, hier (echtes HTML-Element) ist sie die einfachere, robustere
    // Standardlösung und braucht keine Pixel-Messung.
    if (record.regest) {
      const regestVorschau = document.createElement('p');
      regestVorschau.className = 'bestand-sidebar-urkunden-regest';
      regestVorschau.textContent = record.regest;
      item.appendChild(regestVorschau);
    }

    const kategorienListe = Array.isArray(record.kategorien) ? record.kategorien : (record.kategorien ? [record.kategorien] : []);
    if (kategorienListe.length > 0) {
      const badges = document.createElement('div');
      badges.className = 'bestand-sidebar-urkunden-badges';
      kategorienListe.forEach((kategorie) => {
        const farbe = CAT_COLORS[kategorie] || CAT_COLORS.default;
        const badge = document.createElement('span');
        badge.className = 'bestand-sidebar-badge';
        badge.textContent = kategorie;
        badge.style.background = farbe;
        badge.style.color = passendeTextfarbe(farbe);
        badges.appendChild(badge);
      });
      item.appendChild(badges);
    }

    const aktivieren = () => onEintragKlick?.(record);
    item.addEventListener('click', aktivieren);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        aktivieren();
      }
    });

    liste.appendChild(item);
  });

  return liste;
}

// Auftrag "Sidebar-Liste – Regest-Vorschauzeile & Inline-Detailansicht",
// Punkt 2: eigene, schlanke Fotogalerie-Umsetzung statt der geteilten
// Lightbox (js/utils/lightbox.js) - Auftrag ausdrücklich "kein Lightbox-
// Overlay nötig, Wechsel bleibt innerhalb der Sidebar". Nutzt dieselbe
// URL-Quelle (ladeFotos()/data/foto_manifest.json) wie
// regestenKachelraster.js' baueFotoBereich(), aber EIGENE, nicht
// identische Umsetzung: dort ist zusätzlich Lazy-Loading per
// IntersectionObserver nötig (bis zu ~1000 gleichzeitig gerenderte
// Kacheln), hier wird immer nur EINE Urkunde auf einmal angezeigt
// (Sidebar-Detailansicht) - ein einfacher async-Aufruf beim Öffnen reicht,
// kein Beobachter nötig. Gibt den Bereich SOFORT (synchron, ggf. leer)
// zurück und befüllt ihn nach - konsistent mit baueUrkundenDetailInhalt(),
// die selbst synchron bleiben muss (Aufrufer hängt den Rückgabewert
// direkt per appendChild() ein, siehe oeffneUrkundenListe()-Analogon in
// kalenderHeatmap.js).
// Auftrag "Sidebar-Lightbox & app-weite Vereinheitlichung", Punkt 1: das
// Hauptbild öffnet jetzt die geteilte Lightbox (js/utils/lightbox.js,
// dieselbe wie regestenKachelraster.js' baueFotoBereich() - Komponente
// selbst UNVERÄNDERT, nur wiederverwendet) mit ALLEN Fotos dieser Urkunde
// (Pfeiltasten-/Button-Navigation zwischen ihnen kommt dadurch automatisch
// von der Lightbox selbst, keine eigene Umsetzung nötig) und startet bei
// dem Foto, das gerade als Hauptbild angezeigt wird (aktuellerIndex, von
// waehleBild() unten mitgeführt) - NICHT immer bei Index 0. Die kleinen
// Thumbnails bleiben bewusst OHNE eigenen Lightbox-Trigger (Auftrag,
// wörtlich: "kein Lightbox-Trigger auf die kleinen Thumbnails selbst, nur
// auf das große Hauptbild") - sie wechseln weiterhin nur, welches Foto als
// Hauptbild angezeigt wird.
function baueFotogalerie(record) {
  const bereich = document.createElement('div');
  bereich.className = 'bestand-sidebar-fotogalerie';
  if (!record.foto_ordner) return bereich;

  ladeFotos(record.foto_ordner).then((urls) => {
    if (urls.length === 0) return;
    const altText = `Foto zu Urkunde ${record.signatur || '(ohne Signatur)'}`;
    const lightboxBilder = urls.map((url) => ({ url, alt: altText }));
    let aktuellerIndex = 0;

    const hauptbild = document.createElement('img');
    hauptbild.className = 'bestand-sidebar-foto-haupt';
    hauptbild.src = urls[0];
    hauptbild.alt = altText;
    hauptbild.tabIndex = 0;
    hauptbild.setAttribute('role', 'button');
    hauptbild.setAttribute('aria-label', `${altText}, vergrößert anzeigen`);
    const oeffneHauptbildLightbox = () => oeffneLightbox(lightboxBilder, aktuellerIndex);
    hauptbild.addEventListener('click', oeffneHauptbildLightbox);
    hauptbild.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        oeffneHauptbildLightbox();
      }
    });
    bereich.appendChild(hauptbild);

    if (urls.length <= 1) return;

    const thumbs = document.createElement('div');
    thumbs.className = 'bestand-sidebar-foto-thumbs';
    urls.forEach((url, index) => {
      const thumb = document.createElement('img');
      thumb.src = url;
      thumb.alt = `${altText}, Bild ${index + 1} von ${urls.length}`;
      thumb.tabIndex = 0;
      thumb.setAttribute('role', 'button');
      if (index === 0) thumb.classList.add('bestand-sidebar-foto-thumb-aktiv');
      // Klick/Enter/Leertaste wechselt nur das Hauptbild (Attribut +
      // Alt-Text) - kein Overlay, kein Navigations-/Router-Zustand, bleibt
      // vollständig innerhalb der Sidebar (Auftrag, wörtlich) - merkt sich
      // zusätzlich den Index, damit ein anschließender Hauptbild-Klick die
      // Lightbox beim RICHTIGEN Foto öffnet, nicht immer beim ersten.
      const waehleBild = () => {
        aktuellerIndex = index;
        hauptbild.src = url;
        hauptbild.alt = thumb.alt;
        thumbs.querySelectorAll('img').forEach((el) => el.classList.remove('bestand-sidebar-foto-thumb-aktiv'));
        thumb.classList.add('bestand-sidebar-foto-thumb-aktiv');
      };
      thumb.addEventListener('click', waehleBild);
      thumb.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          waehleBild();
        }
      });
      thumbs.appendChild(thumb);
    });
    bereich.appendChild(thumbs);
  });

  return bereich;
}

// Punkt 2: Kategorien-Badges als eigenes, BESCHRIFTETES Feld (Label
// "Kategorien" + Badge-Reihe darunter) - anders als
// baueUrkundenListeInhalt()'s Badges (dort bewusst ohne Label, siehe
// dortiger Kommentar zur schlanken Listendarstellung), weil die
// Detailansicht laut Auftrag dieselbe Feld-Struktur wie die übrigen
// Felder (Label + Wert) durchziehen soll.
function baueUrkundenKategorienFeld(record) {
  const kategorienListe = Array.isArray(record.kategorien) ? record.kategorien : (record.kategorien ? [record.kategorien] : []);
  if (kategorienListe.length === 0) return null;
  const feld = document.createElement('div');
  feld.className = 'bestand-sidebar-feld';
  const labelEl = document.createElement('div');
  labelEl.className = 'bestand-sidebar-feld-label';
  labelEl.textContent = 'Kategorien';
  const badges = document.createElement('div');
  badges.className = 'bestand-sidebar-badges';
  kategorienListe.forEach((kategorie) => {
    const farbe = CAT_COLORS[kategorie] || CAT_COLORS.default;
    const badge = document.createElement('span');
    badge.className = 'bestand-sidebar-badge';
    badge.textContent = kategorie;
    badge.style.background = farbe;
    badge.style.color = passendeTextfarbe(farbe);
    badges.appendChild(badge);
  });
  feld.append(labelEl, badges);
  return feld;
}

// Auftrag "Sidebar-Liste – Regest-Vorschauzeile & Inline-Detailansicht",
// Punkt 2: volle Detailansicht EINER Urkunde für Sidebar-Kontexte. Bewusst
// eine EIGENE Funktion, keine Erweiterung von baueSidebarInhalt() oben:
// das Bestandsverzeichnis-Schema (STANDARD_SIDEBAR_FELDER, record.name/
// record.daten_unsicher) und das Urkunden-Schema (Signatur/Datum/Regest/
// Kategorien/Orte/Personen) sind grundverschieden, eine Vermischung würde
// baueSidebarInhalt() für seine fünf bestehenden Aufrufer riskant
// verkomplizieren.
//
// AUFTRAG "Sidebar-Lightbox & app-weite Vereinheitlichung", Punkt 0/2:
// zeitachse.js UND dotPlot.js hatten jeweils eine eigene, sehr ähnliche,
// aber lokal gehaltene Parallel-Implementierung (zeitachse.js'
// baueUrkundenSidebarInhalt(), dotPlot.js' gleichnamige Funktion - beide
// OHNE Fotogalerie/Lightbox) - jetzt auf DIESE Funktion umgestellt (siehe
// jeweiliger Dateikopf-Kommentar dort), statt einer dritten/vierten
// Parallel-Implementierung. kalenderHeatmap.js nutzte sie bereits.
//
// Auftrag "Sidebar-Lightbox & app-weite Vereinheitlichung", Punkt 0
// (Bestandsaufnahme): zeitachse.js' UND dotPlot.js' bisherige lokale
// Implementierungen zeigten beide einen "Achtung: ... unsicher"-Hinweis
// (kalenderHeatmap.js' Detailansicht - der bisher einzige Aufrufer dieser
// Funktion - brauchte das nie, daher fehlte er hier). Mit INKONSISTENTEN
// Kriterien zwischen den beiden Alt-Implementierungen (zeitachse.js prüfte
// datum_unsicher/orte_unsicher/personen_unsicher/Anmerkung, dotPlot.js nur
// datum_unsicher) - dieses Kriterium ist jetzt Teil der geteilten
// baueUnsicherheitAbsatz()-Komponente (Teil 2g, Punkt 1, siehe unten), keine
// separate istUrkundeUnsicher()-Kopie mehr nötig.

// Feldreihenfolge exakt wie im Auftrag vorgegeben (Fotogalerie, Signatur,
// Datum, Regest, Kategorien, Orte, Personen) - entspricht inhaltlich
// derselben Feldauswahl wie die aufgeklappte Kachelraster-Ansicht
// (regestenKachelraster.js' baueKarte()), nur in anderer Reihenfolge (dort:
// Signatur-Titel, Datum, Orte, Personen, Kategorien, Regest, Fotos). Der
// Unsicher-Hinweis (s.o.) steht wie bei baueSidebarInhalt()/zeitachse.js'
// Alt-Version zuletzt, nach allen regulären Feldern.
export function baueUrkundenDetailInhalt(record) {
  const wrapper = document.createElement('div');
  wrapper.appendChild(baueFotogalerie(record));
  wrapper.appendChild(baueSidebarFeld('Signatur', record.signatur || '(ohne Signatur)'));
  if (record.datum) wrapper.appendChild(baueSidebarFeld('Datum', record.datum));
  wrapper.appendChild(baueSidebarFeld('Regest', record.regest || '(kein Regest)'));
  const kategorienFeld = baueUrkundenKategorienFeld(record);
  if (kategorienFeld) wrapper.appendChild(kategorienFeld);
  if (record.orte && record.orte.length) wrapper.appendChild(baueSidebarFeld('Orte', alsText(record.orte)));
  // AUFTRAG "Teil 2h", Punkt 1: Personen jetzt verlinkt zur Personenliste -
  // dieselbe Funktion wie in den Führungen (belegDarstellung.js) und im
  // Regestenkachelraster (Auftrag wörtlich: "keine zweite Implementierung").
  // `personen`/`personen_id` sind index-parallele Listen (SCHEMA.md).
  if (record.personen && record.personen.length) {
    const namen = Array.isArray(record.personen) ? record.personen : [record.personen];
    const ids = Array.isArray(record.personen_id) ? record.personen_id : (record.personen_id ? [record.personen_id] : []);
    const personenZeile = baueGenanntePersonenZeile(
      namen.map((name, i) => ({ name, id: ids[i] || null })),
      { unsicher: !!record.personen_unsicher }
    );
    if (personenZeile) wrapper.appendChild(personenZeile);
  }
  // AUFTRAG "Teil 2g", Punkt 1: geteilte σ-Komponente statt "Achtung:
  // Angaben unsicher..." in Rot/Fett - siehe js/utils/unsicherAbsatz.js.
  const unsicherAbsatz = baueUnsicherheitAbsatz(record, ['datum_unsicher', 'orte_unsicher', 'personen_unsicher']);
  if (unsicherAbsatz) wrapper.appendChild(unsicherAbsatz);
  return wrapper;
}

// AUFTRAG "Sidebar-Lightbox & app-weite Vereinheitlichung", Punkt 2: die
// beiden folgenden Funktionen sind die einzigen Einstiegspunkte, die ein
// Modul für eine Urkunden-Sidebar noch braucht - "1 Ergebnis -> Detail,
// mehrere -> Liste" ist damit an EINER Stelle implementiert statt in jedem
// Aufrufer erneut. zeigeUrkundenListe() ist bewusst NICHT exportiert (nur
// über zeigeUrkundenSidebar() bzw. den intern verdrahteten Zurück-Button
// erreichbar) - ein Aufrufer, der eine bereits bekannte Einzel-Urkunde ohne
// Listen-Kontext zeigen will (z.B. ein Punktklick in zeitachse.js/
// dotPlot.js), ruft direkt zeigeUrkundenDetail() auf.
function zeigeUrkundenListe(sidebarInstanz, titel, records) {
  const { sidebar, titel: titelEl, koerper, zurueckBtn } = sidebarInstanz;
  sidebarInstanz._urkundenListe = { titel, records };
  titelEl.textContent = titel;
  koerper.innerHTML = '';
  const anzahl = document.createElement('p');
  anzahl.className = 'bestand-sidebar-urkunden-anzahl';
  anzahl.textContent = `${records.length} Urkunde(n)`;
  koerper.appendChild(anzahl);
  koerper.appendChild(baueUrkundenListeInhalt(records, {
    onEintragKlick: (record) => zeigeUrkundenDetail(sidebarInstanz, record)
  }));
  zurueckBtn.hidden = true;
  sidebar.classList.add('offen');
  sidebar.setAttribute('aria-hidden', 'false');
  titelEl.focus();
}

// Zeigt die volle Detailansicht EINER Urkunde. `zurueckBtn` erscheint nur,
// wenn es tatsächlich eine vorherige Liste gibt, zu der man zurückkehren
// kann (sidebarInstanz._urkundenListe, von zeigeUrkundenListe() gesetzt) -
// ein direkter Aufruf ohne vorherige Liste (Punktklick in zeitachse.js/
// dotPlot.js) zeigt daher korrekt KEINEN Zurück-Button (Nicht-Ziel: "1
// Ergebnis -> Detail ... kein Zwischenschritt über eine Ein-Element-Liste"
// - ein Zurück-Button ohne Liste dahinter wäre irreführend).
export function zeigeUrkundenDetail(sidebarInstanz, record) {
  const { sidebar, titel, koerper, zurueckBtn } = sidebarInstanz;
  sidebarInstanz._urkundenScrollPosition = koerper.scrollTop;
  titel.textContent = record.signatur || '(ohne Signatur)';
  koerper.innerHTML = '';
  koerper.appendChild(baueUrkundenDetailInhalt(record));
  zurueckBtn.hidden = !sidebarInstanz._urkundenListe;
  sidebar.classList.add('offen');
  sidebar.setAttribute('aria-hidden', 'false');
  titel.focus();
}

// Baut dieselbe zuletzt gezeigte Liste erneut auf (instanz._urkundenListe)
// und stellt die Scroll-Position bestmöglich wieder her - vom Zurück-Button
// selbst aufgerufen (siehe baueSidebarGeruest()), kein Aufrufer muss dies
// selbst verdrahten.
function zurueckZurUrkundenListe(sidebarInstanz) {
  if (!sidebarInstanz._urkundenListe) return;
  const { titel, records } = sidebarInstanz._urkundenListe;
  const scrollPosition = sidebarInstanz._urkundenScrollPosition || 0;
  zeigeUrkundenListe(sidebarInstanz, titel, records);
  sidebarInstanz.koerper.scrollTop = scrollPosition;
}

// Der eine öffentliche Einstiegspunkt für "eine Menge Urkunden in dieser
// Sidebar zeigen" (Auftrag, Punkt 2, wörtlich): genau ein Treffer öffnet
// direkt die Detailansicht (kein Zwischenschritt über eine Ein-Element-
// Liste), mehrere die Liste. `titel` wird nur im Listen-Fall gebraucht
// (Detailansicht zeigt stattdessen die Signatur als Titel, siehe
// zeigeUrkundenDetail()).
export function zeigeUrkundenSidebar(sidebarInstanz, titel, records) {
  if (records.length === 1) {
    zeigeUrkundenDetail(sidebarInstanz, records[0]);
    return;
  }
  zeigeUrkundenListe(sidebarInstanz, titel, records);
}

// Gibt {sidebar, titel, koerper, schliessenBtn, zurueckBtn} zurück - der
// Aufrufer verdrahtet schliessenBtn selbst (siehe Dateikopf-Kommentar zum
// Fokus-Fallback); zurueckBtn verdrahtet sich seit dem Auftrag "Sidebar-
// Lightbox & app-weite Vereinheitlichung" selbst (zurueckZurUrkundenListe()
// oben) - sein Verhalten ist immer identisch, anders als schliessenBtns
// modulspezifischer Fokus-Fallback.
export function baueSidebarGeruest(container) {
  const sidebar = document.createElement('aside');
  sidebar.className = 'bestand-sidebar';
  sidebar.setAttribute('aria-hidden', 'true');
  sidebar.setAttribute('aria-label', 'Bestand-Details');

  const kopf = document.createElement('div');
  kopf.className = 'bestand-sidebar-kopf';

  // Zurück-Button für Module mit zweistufiger Sidebar (schlanke Liste <->
  // volle Detailansicht, siehe zeigeUrkundenSidebar() oben). Standardmäßig
  // `hidden` (= per UA-Stylesheet display:none, nimmt keinen Platz ein) -
  // für alle Aufrufer, die zeigeUrkundenSidebar()/zeigeUrkundenDetail() nie
  // aufrufen (treemap.js/sunburst.js/icicle.js/circlePacking.js/
  // ganttDiagramm.js, die weiterhin nur baueSidebarInhalt()/oeffneSidebar()
  // nutzen), dadurch unverändert unsichtbar, ohne deren bestehendes
  // Kopfzeilen-Layout zu beeinflussen (Nicht-Ziel: keine Änderung an
  // anderen Modulen). Klick-Verdrahtung passiert HIER, nicht beim Aufrufer
  // (anders als schliessenBtn - dessen fokusZielFallback ist pro Modul
  // unterschiedlich, das Zurück-Verhalten dagegen ist app-weit IMMER
  // dasselbe: zurueckZurUrkundenListe()).
  const zurueckBtn = document.createElement('button');
  zurueckBtn.type = 'button';
  zurueckBtn.className = 'bestand-sidebar-zurueck';
  zurueckBtn.textContent = '← Zurück';
  zurueckBtn.hidden = true;

  const titel = document.createElement('h3');
  titel.className = 'bestand-sidebar-titel';
  titel.setAttribute('tabindex', '-1');
  const schliessenBtn = document.createElement('button');
  schliessenBtn.type = 'button';
  schliessenBtn.setAttribute('aria-label', 'Sidebar schließen');
  schliessenBtn.textContent = '×';
  kopf.append(zurueckBtn, titel, schliessenBtn);

  const koerper = document.createElement('div');

  sidebar.append(kopf, koerper);
  container.appendChild(sidebar);

  const sidebarInstanz = { sidebar, titel, koerper, schliessenBtn, zurueckBtn };
  zurueckBtn.addEventListener('click', () => zurueckZurUrkundenListe(sidebarInstanz));
  return sidebarInstanz;
}

export function oeffneSidebar(sidebarInstanz, record, konfiguration) {
  const { sidebar, titel, koerper } = sidebarInstanz;
  titel.textContent = record.name || record.kuerzel || '(ohne Name)';
  koerper.innerHTML = '';
  koerper.appendChild(baueSidebarInhalt(record, konfiguration));
  sidebar.classList.add('offen');
  sidebar.setAttribute('aria-hidden', 'false');
  titel.focus(); // Abschnitt 10: Fokus wandert beim Öffnen zum Sidebar-Titel
}

// fokusZielFallback (optional): Element, das den Fokus bekommt, falls er
// sich beim Schließen INNERHALB der Sidebar befand - verhindert Verwaisen
// auf <body> (siehe Dateikopf-Kommentar).
//
// Auftrag "Sidebar-Lightbox & app-weite Vereinheitlichung": setzt zusätzlich
// den Listen-/Zurück-Zustand zurück (sidebarInstanz._urkundenListe,
// zurueckBtn.hidden), damit ein späteres erneutes Öffnen wieder im
// "Wurzel"-Zustand beginnt. Für Aufrufer, die zeigeUrkundenSidebar() nie
// nutzen (die fünf Bestand-Module), ist _urkundenListe ohnehin nie gesetzt
// und zurueckBtn bereits versteckt - reiner No-Op dort.
export function schliesseSidebar(sidebarInstanz, fokusZielFallback) {
  const { sidebar, zurueckBtn } = sidebarInstanz;
  if (fokusZielFallback && sidebar.contains(document.activeElement)) {
    fokusZielFallback.focus();
  }
  sidebar.classList.remove('offen');
  sidebar.setAttribute('aria-hidden', 'true');
  sidebarInstanz._urkundenListe = null;
  zurueckBtn.hidden = true;
}

// Eigener <style>-Tag (analog zum bereits etablierten Muster jedes
// Viz-Moduls, sein eigenes Styling zu injizieren) - vom Aufrufer einmal pro
// render() aufgerufen.
export function fuegeSidebarStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .bestand-sidebar { position: fixed; top: 0; right: 0; bottom: 0; width: min(360px, 90vw); background: var(--surface);
      border-left: 1px solid var(--border); box-shadow: var(--shadow); transform: translateX(100%); transition: transform .2s ease;
      overflow-y: auto; z-index: 500; padding: var(--space-4); }
    .bestand-sidebar.offen { transform: translateX(0); }
    .bestand-sidebar-kopf { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); margin-bottom: var(--space-3); }
    .bestand-sidebar-titel { margin: 0; }
    .bestand-sidebar-kopf button { min-height: 44px; min-width: 44px; border: none; background: none; font-size: 1.5rem; line-height: 1; cursor: pointer; }
    .bestand-sidebar-kopf button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .bestand-sidebar-badges { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3); }
    .bestand-sidebar-badge { padding: 2px 10px; border-radius: 99px; font-size: var(--fs-sm); font-weight: 600; }
    .bestand-sidebar-feld { margin-bottom: var(--space-3); }
    .bestand-sidebar-feld-label { font-size: var(--fs-sm); color: var(--text-muted); font-weight: 600; margin-bottom: 2px; }
    /* AUFTRAG "Teil 2g", Punkt 1: .bestand-sidebar-unsicher (rot/fett)
       entfaellt - Unsicherheit wird jetzt ueber die geteilte
       .unsicher-absatz-Komponente dargestellt (css/components.css, dort
       auch fuer die Fuehrungen genutzt). */
    /* Punkt 4 (schlanke Urkunden-Liste, siehe baueUrkundenListeInhalt()) */
    .bestand-sidebar-urkunden-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }
    .bestand-sidebar-urkunden-eintrag { border: 1px solid var(--border); border-radius: var(--radius); padding: var(--space-2);
      cursor: pointer; background: var(--surface); }
    .bestand-sidebar-urkunden-eintrag:hover { border-color: var(--accent); }
    .bestand-sidebar-urkunden-eintrag:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .bestand-sidebar-urkunden-signatur { display: block; font-weight: 600; font-size: var(--fs-sm); margin-bottom: 2px; }
    .bestand-sidebar-urkunden-badges { display: flex; flex-wrap: wrap; gap: var(--space-1); }
    /* Auftrag "Sidebar-Liste – Regest-Vorschauzeile & Inline-Detailansicht":
       Punkt 1 (Ein-Zeilen-Vorschau, siehe baueUrkundenListeInhalt()) */
    .bestand-sidebar-urkunden-regest { margin: 2px 0 0; font-size: var(--fs-sm); color: var(--text-muted);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    /* Punkt 3 (Zurück-Button, siehe baueSidebarGeruest()) - eigene, spezifischere
       Regel überschreibt die generische ".bestand-sidebar-kopf button"-Regel oben
       (Schließen-×-Größe wäre für einen Textlink unpassend); bleibt für alle
       Aufrufer ohne zurueckBtn.hidden=false unsichtbar (kein Layout-Einfluss). */
    .bestand-sidebar-kopf .bestand-sidebar-zurueck { font-size: var(--fs-sm); font-weight: 600; width: auto;
      min-width: 0; padding: 0 var(--space-1); color: var(--accent); }
    /* Punkt 2 (Fotogalerie, siehe baueFotogalerie()) */
    .bestand-sidebar-fotogalerie:empty { display: none; }
    /* Auftrag "Sidebar-Lightbox & app-weite Vereinheitlichung", Punkt 1:
       cursor:pointer + Fokus-Kontur signalisieren, dass das Hauptbild jetzt
       selbst anklickbar ist (öffnet die Lightbox, siehe baueFotogalerie()). */
    .bestand-sidebar-foto-haupt { display: block; width: 100%; border-radius: var(--radius); margin-bottom: var(--space-2);
      cursor: pointer; }
    .bestand-sidebar-foto-haupt:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .bestand-sidebar-foto-thumbs { display: flex; flex-wrap: wrap; gap: var(--space-1); margin-bottom: var(--space-3); }
    .bestand-sidebar-foto-thumbs img { width: 56px; height: 56px; object-fit: cover; border-radius: var(--radius);
      cursor: pointer; border: 2px solid transparent; }
    .bestand-sidebar-foto-thumbs img:hover, .bestand-sidebar-foto-thumbs img.bestand-sidebar-foto-thumb-aktiv { border-color: var(--accent); }
    .bestand-sidebar-foto-thumbs img:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    /* Punkt 2 (Zähl-Absatz der Liste, siehe zeigeUrkundenListe()) */
    .bestand-sidebar-urkunden-anzahl { color: var(--text-muted); font-size: var(--fs-sm); margin: 0 0 var(--space-3) 0; }
    @media (prefers-reduced-motion: reduce) { .bestand-sidebar { transition: none; } }
  `;
  container.appendChild(style);
  return style;
}
