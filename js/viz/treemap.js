// js/viz/treemap.js
// Treemap des Gesamtbestands (Abschnitt 4.1, 9). Modul-Interface siehe Abschnitt 5:
// render(container, data, options) / destroy() / resize(). Voraussetzung: D3 v7
// global geladen (siehe dataLoader.js).
//
// Überarbeitung (siehe CHANGELOG.md für Datum/Details): Farbcodierung nach
// Kategorie/Unterkategorie, korrigierte (nicht mehr geflootete) Flächenskalierung,
// vereinheitlichtes Hover/Klick-Feedback auf Kategorie-Ebene, Beschriftung ohne
// Umfangsangabe/Abschneidung, Legende oberhalb der Treemap entfernt (Kategorien
// sind über die Ebene-1-Kacheln selbst navigierbar).
//
// Farblogik (Kategorie-Farbskala, WCAG-Kontrastkorrektur, Unterkategorie-
// Abstufung) liegt in js/utils/kategorieFarben.js - bei der Sunburst-
// Überarbeitung dorthin ausgelagert (siehe CHANGELOG), damit sunburst.js
// dieselbe Logik importieren statt duplizieren kann. js/config/constants.js'
// CAT_COLORS ist für urkunden.csv vorgesehen, nicht für bkk_kategorie, daher
// hier nicht verwendet.
//
// ZWEI INTERNE ANSICHTS-EBENEN (modul-intern, kein erneuter render()-Aufruf von
// außen nötig): Wurzel-Ansicht zeigt alle Bestände, gruppiert nach Kategorie
// (jede Kategorie inkl. "ohne Kategorie" als eigene, per CSS :hover/:focus-within
// als Einheit hervorgehobene Gruppe); Klick auf eine Kategorie-Fläche wechselt
// intern in die Kategorie-Ansicht (nur die Bestände dieser Kategorie, per
// Unterkategorie natürlich geclustert). instanz.aktuelleKategorieDaten hält
// den Zustand.
//
// Erwartete `data`: das flache `records`-Array aus dataLoader.js für
// bestandsverzeichnis.csv. Wird intern zu einer Hierarchie umgebaut (Gesamtbestand
// -> bkk_kategorie -> bkk_unterkategorie -> Bestand, siehe bestandsHierarchie.js),
// die übergebenen Records selbst werden nicht verändert (Abschnitt 5).
//
// Unsicherheits-Kennzeichnung (daten_unsicher) pro Bestand-Zelle, DREI Kanäle:
// gestrichelter roter Rand, Warnsymbol, Schraffur-Overlay - folgt
// options.showUncertainty (Unsicherheits-Button, Abschnitt 11). Unabhängig davon:
// "ohne Kategorie" ist ein eigener, dauerhafter Status (fehlende Zuordnung ist
// bereits in daten_unsicher/unsicherheit_anmerkung dokumentiert, siehe SCHEMA.md)
// und bekommt eine eigene, neutrale Fläche mit Punktmuster statt einer
// Kategoriefarbe - beide Kennzeichnungen können unabhängig voneinander an
// derselben Kachel auftreten.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { baueBestandsHierarchie, baueTooltipText, OHNE_KATEGORIE } from '../utils/bestandsHierarchie.js';
import {
  passendeTextfarbe,
  baueKategorieFarbSkala,
  OHNE_KATEGORIE_FARBE,
  farbeFuerUnterkategorie
} from '../utils/kategorieFarben.js';
import {
  baueSidebarGeruest,
  oeffneSidebar as oeffneSidebarModul,
  schliesseSidebar as schliesseSidebarModul,
  fuegeSidebarStyleEin
} from '../utils/sidebar.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { ermittleBeschriftungstext } from '../utils/beschriftung.js';
import { UNSICHERHEIT_SYMBOL } from '../config/constants.js';

const TREEMAP_INFO_TEXT = `Diese Treemap zeigt die Bestände des Stadtarchivs Krems als verschachtelte Flächen, gruppiert nach Kategorien (BKK-Dokumentationsprofil). Die Größe jeder Fläche entspricht dem Umfang des jeweiligen Bestands in Laufmetern.

Klick auf eine Kategorie zoomt in deren Bestände hinein, ein weiterer Klick führt zurück zur Gesamtübersicht. Klick auf einen einzelnen Bestand öffnet die Detailansicht in der Seitenleiste.`;

const RAND_AUSSEN = 6;
const RAND_OBEN_WURZEL = 22; // nur für Tiefe 1 in der Wurzel-Ansicht (Kategorie-Pille), siehe topPaddingFuer()
const MINDESTHOEHE_ZELLE = 24; // Klickbarkeit (Fitts'sches Gesetz, Abschnitt 9) - harte Untergrenze für Randfälle
const ZURUECK_VERZOEGERUNG_MS = 250; // Back-Button: Sidebar schließt zuerst
const TOOLTIP_VERZOEGERUNG_WURZEL_MS = 600;
const AUSWAHL_FARBE = '#e07820';
// AUFTRAG "Teil 2f", Punkt 1: keine lokale Kopie mehr - zentrale Konstante
// aus config/constants.js, unter demselben lokalen Namen weiterverwendet.
const WARN_SYMBOL = UNSICHERHEIT_SYMBOL;
const MIN_SCHRIFTGROESSE = 11; // Richtwert 10-11px, siehe Auftrag

// Größenberechnung (Punkt 2): eigener, viel kleinerer Mindestwert als der
// gemeinsame Default (10) in bestandsHierarchie.js - der reale umfang_lfm-Median
// liegt bei 0,2 lfm (Verhältnis Max/Min 183:1), ein Mindestwert von 10 würde 99%
// aller Bestände auf denselben Wert flooren. 0,05 liegt bewusst UNTER dem
// kleinsten real vorkommenden Wert (0,1 lfm), damit Bestände mit fehlendem/
// unlesbarem umfang_lfm sichtbar bleiben, aber nie größer wirken als der
// kleinste tatsächlich gemessene Bestand. Nach Rückfrage: milde
// Quadratwurzel-Skalierung (nicht linear) für die Gesamtlesbarkeit gewählt -
// reduziert den Flächenfaktor zwischen größtem und kleinstem Bestand von ca.
// 180:1 auf ca. 13,5:1, bleibt aber streng monoton (keine Kompression, die
// Größenverhältnisse innerhalb der kleinen Werte verwischt).
const MINDESTGROESSE_ROH_TREEMAP = 0.05;

let instanz = null; // { container, hierarchieDaten, options, kategorieFarbSkala, aktuelleKategorieDaten, ausgewaehlterName, infoButton, ... }

// knoten.parent ist für ein Bestand-Blatt in BEIDEN Ansichten (Wurzel wie
// Kategorie) immer die Unterkategorie - unabhängig von der jeweiligen
// Baumtiefe, da d3.hierarchy() hier je nach Ansicht an unterschiedlicher Stelle
// verwurzelt wird (siehe zeichneTreemap()).
function farbeFuerBestandsKachel(knoten, kategorieName) {
  if (kategorieName === OHNE_KATEGORIE) return OHNE_KATEGORIE_FARBE;
  const basis = instanz.kategorieFarbSkala(kategorieName);
  return farbeFuerUnterkategorie(basis, knoten.parent);
}

function baueSchraffurPattern(defs) {
  defs.append('pattern')
    .attr('id', 'treemap-unsicher-schraffur')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 8).attr('height', 8)
    .append('path')
    .attr('d', 'M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4')
    .attr('stroke', '#aaaaaa')
    .attr('stroke-width', 1.5)
    .attr('opacity', 0.45);
}

// Bewusst ein ANDERES Muster (Punkte statt Diagonalstreifen) als die
// Unsicherheits-Schraffur - "ohne Kategorie" und "daten_unsicher" sind zwei
// unabhängige Aussagen und dürfen optisch nicht verwechselt werden.
function baueOhneKategorieMuster(defs) {
  const muster = defs.append('pattern')
    .attr('id', 'treemap-ohne-kategorie-muster')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 6).attr('height', 6);
  muster.append('circle').attr('cx', 3).attr('cy', 3).attr('r', 1).attr('fill', '#ffffff').attr('opacity', 0.55);
}

// Post-Layout-Korrektur: keine Zelle darf unter MINDESTHOEHE_ZELLE Pixel Höhe
// fallen (Klickbarkeit). Getrennt von der Größenskalierung (Punkt 2 betrifft
// Verhältnismäßigkeit im Normalbereich, dies eine harte Untergrenze für
// Randfälle).
//
// GENAU EIN zu niedriges Geschwister in einem Elternbereich: sicher lösbar,
// indem das Defizit von der größten Geschwisterzelle abgezogen und die zu
// niedrige Zelle an den unteren Rand des Elternbereichs gesetzt wird (Punkt A,
// siehe CHANGELOG) - unverändert gegenüber der bereits getesteten Fassung.
//
// MEHRERE gleichzeitig zu niedrige Geschwister: bewusst KEINE Verschiebung
// mehr (siehe CHANGELOG für die vollständige Herleitung, per Test an den
// echten Daten nachgewiesen, nicht nur angenommen). Zwei frühere Versuche sind
// daran gescheitert, aus demselben Grund: bei dicht besetzten Unterkategorien
// ist eine harte 24px-Mindesthöhe für ALLE gleichzeitig betroffenen
// Geschwister rechnerisch gar nicht erfüllbar - real gemessen enthält allein
// die Unterkategorie "Öffentliches Vermögen" (unter "Vermögen und Finanzen")
// 109 Bestände in einem nur ca. 450px hohen Bereich; 109 × 24px = 2616px wäre
// mehr als das 5-fache der tatsächlich vorhandenen Fläche. Jeder Versuch,
// dies durch Stapeln/Verschieben zu erzwingen (erst: alle auf dieselbe
// Position; danach: von unten nach oben gestapelt mit einem gemeinsamen,
// X-Position-unabhängigen Cursor), drängte Zellen zwangsläufig entweder
// exakt übereinander oder - nachgewiesen bis zu 522px - über den eigenen
// Elternbereich und damit über den sichtbaren Kachel-Canvas hinaus (sichtbar
// als scheinbar "abgetrennter" schmaler Streifen winziger Kacheln). Da
// d3.treemap() selbst eine überlappungsfreie Aufteilung ALLER Geschwister
// garantiert, ist "die Zellen an ihrer bereits zugewiesenen, wertproportionalen
// Position belassen" die einzige Vorgehensweise, die diese Garantie nicht
// bricht - die betroffenen Zellen bleiben dadurch regulär im Kachelraster
// ihrer Unterkategorie integriert (wie gefordert), auch wenn einzelne davon
// in extrem dicht besetzten Unterkategorien unter 24px bleiben. Erreichbarkeit
// bleibt über Tastatur-Fokus sowie den bereits bestehenden sofortigen
// Tooltip-Ersatz für unbeschriftete Kacheln erhalten (zeichneEineWurzelKachel()
// bzw. den Bestand-Tooltip der Kategorie-Ansicht).
function korrigiereMindesthoehen(wurzel, topPaddingFuer) {
  wurzel.each((knoten) => {
    if (!knoten.children) return;
    const kinder = knoten.children;
    const zuNiedrig = kinder.filter((k) => k.y1 - k.y0 < MINDESTHOEHE_ZELLE);
    if (zuNiedrig.length !== 1) return;

    const k = zuNiedrig[0];
    const groesste = kinder.reduce((max, c) => (c.y1 - c.y0 > max.y1 - max.y0 ? c : max));
    const defizit = MINDESTHOEHE_ZELLE - (k.y1 - k.y0);
    if (groesste === k || groesste.y1 - groesste.y0 <= MINDESTHOEHE_ZELLE + defizit) return;

    groesste.y1 -= defizit;
    k.y1 = knoten.y1 - (topPaddingFuer(knoten) + RAND_AUSSEN);
    k.y0 = k.y1 - MINDESTHOEHE_ZELLE;
  });
}

function zeileUmbrechenOhneSilbentrennung(text, zeichenProZeile) {
  const woerter = text.split(' ');
  const zeilen = [];
  let aktuelleZeile = '';
  woerter.forEach((wort) => {
    const testZeile = aktuelleZeile ? `${aktuelleZeile} ${wort}` : wort;
    if (testZeile.length <= zeichenProZeile) {
      aktuelleZeile = testZeile;
    } else {
      if (aktuelleZeile) zeilen.push(aktuelleZeile);
      aktuelleZeile = wort;
    }
  });
  if (aktuelleZeile) zeilen.push(aktuelleZeile);
  return zeilen;
}

// Auto-Fit-Text: sucht die größte Schriftgröße zwischen MIN_SCHRIFTGROESSE und
// einem von der Zellbreite abhängigen Maximum, bei der die Beschriftung
// (Wortumbruch ohne Silbentrennung) VOLLSTÄNDIG in die Zelle passt - dieser
// Teil ist UNVERÄNDERT (Nicht-Ziel: keine Änderung an der Skalierungslogik).
// NEU (Auftrag "Beschriftungs-Kürzung mit Ellipse", siehe CHANGELOG): passt
// der Name bei KEINER erlaubten Schriftgröße auch nur wortumbrochen
// vollständig hinein, wird jetzt - statt komplett auf ein Label zu
// verzichten - bei MIN_SCHRIFTGROESSE eine EINZEILIGE, mit "…" gekürzte
// Fassung versucht (js/utils/beschriftung.js, gemeinsam mit sunburst.js/
// icicle.js/circlePacking.js genutzt). Rückgabe ist jetzt ein Tri-State
// ('voll' | 'gekuerzt' | false) statt eines reinen Booleans - alle
// bestehenden Aufrufer, die nur auf Wahrheitswert prüfen (Kategorie-Ansicht,
// siehe zeichneKategorieAnsicht()), funktionieren dadurch unverändert weiter
// ('voll'/'gekuerzt' sind beide truthy); nur zeichneEineWurzelKachel() nutzt
// die genauere Unterscheidung, um den Tooltip-Ersatz jetzt auch bei
// gekürzter (nicht mehr nur bei komplett fehlender) Anzeige zu wiren -
// Auftrag Schritt 3, wörtlich: "Tooltip zeigt weiterhin den vollständigen
// Namen" auch bei gekürzter Darstellung.
function platziereAutoFitText(gruppe, text, breite, hoehe, textFarbe) {
  if (breite <= 28 || hoehe <= 18) return false;

  const maxSchrift = Math.max(MIN_SCHRIFTGROESSE, Math.min(15, breite / 6));

  for (let versuch = maxSchrift; versuch >= MIN_SCHRIFTGROESSE; versuch -= 1) {
    const zeichenProZeile = Math.max(3, Math.floor((breite - 10) / (versuch * 0.57)));
    const zeilenHoehe = versuch + 3;
    const maxZeilenAnzahl = Math.max(1, Math.floor((hoehe - 8) / zeilenHoehe));
    const zeilen = zeileUmbrechenOhneSilbentrennung(text, zeichenProZeile);
    const passtVollstaendig = zeilen.length <= maxZeilenAnzahl && zeilen.every((z) => z.length <= zeichenProZeile);
    if (!passtVollstaendig) continue;

    const textElement = gruppe.append('text').attr('fill', textFarbe).attr('font-size', versuch);
    zeilen.forEach((zeile, i) => {
      textElement.append('tspan').attr('x', 5).attr('y', 5 + i * zeilenHoehe).attr('dominant-baseline', 'hanging').text(zeile);
    });
    return 'voll';
  }

  const gekuerzterText = ermittleBeschriftungstext(text, breite - 10, MIN_SCHRIFTGROESSE);
  if (!gekuerzterText || gekuerzterText === text) return false;
  gruppe.append('text')
    .attr('x', 5).attr('y', 5)
    .attr('dominant-baseline', 'hanging')
    .attr('fill', textFarbe).attr('font-size', MIN_SCHRIFTGROESSE)
    .text(gekuerzterText);
  return 'gekuerzt';
}

// VOLLBILD-KORREKTUR (siehe CHANGELOG): container (= die geteilte .viz-inhalt,
// von app.js übergeben) wird HIER, nur während treemap.js aktiv ist (dieses
// <style> lebt nur so lange im DOM), zur Flex-Spalte gemacht, damit
// .treemap-svg-bereich die von #app-content's neuem Grid bereitgestellte
// Resthöhe tatsächlich ausfüllt statt bei der alten festen min-height:480px
// zu verharren - .treemap-werkzeugleiste behält dabei ihre natürliche Höhe.
// Rein optische CSS-Wert-Änderung, keine Interaktions-/Renderlogik betroffen;
// vorab mit dem Auftraggeber abgestimmt (einzige Modul-Datei-Berührung dieses
// Auftrags).
function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .viz-inhalt { display: flex; flex-direction: column; min-height: 0; height: 100%; }
    .treemap-werkzeugleiste { display: flex; align-items: center; gap: var(--space-3); margin: 0 0 var(--space-2) 0; min-height: 44px; flex: 0 0 auto; }
    /* Bugfix (Auftrag "Bugfix: Info-Button fehlt/unsichtbar"): vormals ein
       ungezielter Typ-Selektor ".treemap-werkzeugleiste button" - der traf
       nach Einbindung des Info-Buttons (ebenfalls ein <button>, verschachtelt
       in derselben Werkzeugleiste über den marginLeft:auto-Anker) UNGEWOLLT
       auch ihn: die Deklarations-Reihenfolge ist hier egal, da diese Regel
       durch den zusätzlichen Typ-Selektor "button" höhere Spezifität hat
       (0,1,1) als .info-button (0,1,0) - background/padding/border/
       border-radius/min-height dieser Regel gewannen dadurch über die
       gleichnamigen .info-button-Eigenschaften, aus dem blauen 32px-Kreis
       wurde ein gepolsterter, hellgrauer Kasten mit weißem "?" auf
       var(--surface) - de facto unsichtbar (siehe CHANGELOG). Fix: eigene
       Klasse NUR für den Zurück-Button statt eines pauschalen Typ-Selektors -
       exakt dieselben Eigenschaften/Werte, nur nicht mehr versehentlich auf
       andere <button>-Elemente in der Werkzeugleiste anwendbar. */
    .treemap-werkzeugleiste .treemap-zurueck-btn { min-height: 44px; padding: var(--space-2) var(--space-3); border: 1px solid var(--border);
      border-radius: var(--radius); background: var(--surface); font: inherit; cursor: pointer; }
    .treemap-werkzeugleiste .treemap-zurueck-btn:hover { border-color: var(--accent); }
    .treemap-werkzeugleiste .treemap-zurueck-btn:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .treemap-titel { font-weight: 600; color: var(--text); }
    .treemap-svg-bereich { position: relative; flex: 1 1 auto; min-height: 480px; }
    .kategorie-gruppe rect.bestand-rand { transition: filter .12s ease; }
    @media (prefers-reduced-motion: reduce) {
      .kategorie-gruppe rect.bestand-rand { transition: none; }
    }
  `;
  container.appendChild(style);
}

// Sidebar-Gerüst/-Inhalt/-Fokus-Handling liegt in js/utils/sidebar.js (bei
// der Sunburst-Sidebar-Integration dorthin ausgelagert, siehe CHANGELOG) -
// hier nur die beiden dünnen, treemap-spezifischen Wrapper, die wissen, WO
// die Kategorie-Farbe/der Fokus-Fallback herkommen (instanz.kategorieFarbSkala
// bzw. instanz.svgBereich); Gerüst/Inhalt/Feldliste sind modul-unabhängig.
function oeffneSidebar(record) {
  const kategorieName = record.bkk_kategorie && record.bkk_kategorie.trim() !== '' ? record.bkk_kategorie : OHNE_KATEGORIE;
  const kategorieFarbe = kategorieName === OHNE_KATEGORIE ? OHNE_KATEGORIE_FARBE : instanz.kategorieFarbSkala(kategorieName);
  oeffneSidebarModul(instanz.sidebar, record, { kategorieName, kategorieFarbe });
}

function schliesseSidebar() {
  if (!instanz) return;
  schliesseSidebarModul(instanz.sidebar, instanz.svgBereich);
}

function baueWerkzeugleiste() {
  const zurueckBtn = document.createElement('button');
  zurueckBtn.type = 'button';
  zurueckBtn.className = 'treemap-zurueck-btn';
  zurueckBtn.textContent = '← Alle Kategorien';
  zurueckBtn.setAttribute('aria-label', 'Zurück zu allen Kategorien');
  zurueckBtn.addEventListener('click', wechsleZuWurzel);

  const titel = document.createElement('span');
  titel.className = 'treemap-titel';

  instanz.werkzeugleiste.append(zurueckBtn, titel);
  instanz.zurueckBtn = zurueckBtn;
  instanz.titelSpan = titel;
  aktualisiereWerkzeugleiste();

  // Eigener, ganz rechts sitzender Anker statt einer neuen globalen CSS-Klasse
  // (marginLeft direkt am Element) - .treemap-werkzeugleiste nutzt bewusst
  // KEIN justify-content:space-between (siehe fuegeStyleEin()), ein einzelner
  // auto-Margin genügt, um nur diesen einen Bestandteil an den rechten Rand zu
  // schieben, ohne zurueckBtn/titel-Abstand zu verändern.
  const infoButtonAnker = document.createElement('div');
  infoButtonAnker.style.marginLeft = 'auto';
  instanz.werkzeugleiste.appendChild(infoButtonAnker);
  instanz.infoButton = erzeugeInfoButton(infoButtonAnker, { text: TREEMAP_INFO_TEXT, ariaLabel: 'Erklärung zur Treemap' });
}

function aktualisiereWerkzeugleiste() {
  const inKategorie = !!instanz.aktuelleKategorieDaten;
  instanz.zurueckBtn.hidden = !inKategorie;
  instanz.titelSpan.textContent = inKategorie ? instanz.aktuelleKategorieDaten.name : '';
}

function wechsleZuKategorie(kategorieDaten) {
  instanz.aktuelleKategorieDaten = kategorieDaten;
  instanz.ausgewaehlterName = null;
  schliesseSidebar();
  aktualisiereWerkzeugleiste();
  zeichneTreemap();
}

// Back-Button: kurze Verzögerung, damit die Sidebar zuerst zuklappt (Animation),
// bevor die Wurzel-Ansicht neu gezeichnet wird.
function wechsleZuWurzel() {
  schliesseSidebar();
  clearTimeout(instanz.zurueckTimeout);
  instanz.zurueckTimeout = setTimeout(() => {
    if (!instanz) return; // destroy() kann während der Verzögerung aufgerufen worden sein
    instanz.aktuelleKategorieDaten = null;
    instanz.ausgewaehlterName = null;
    aktualisiereWerkzeugleiste();
    zeichneTreemap();
  }, ZURUECK_VERZOEGERUNG_MS);
}

// Klick auf die BEREITS ausgewählte Kachel schaltet ab (Sidebar schließt,
// Hervorhebung verschwindet) statt wirkungslos zu bleiben - Klick auf eine
// ANDERE Kachel wählt sie regulär aus und öffnet/aktualisiert die Sidebar,
// unabhängig davon, ob sie bereits offen war.
function waehleBestandAus(datenKnoten) {
  if (instanz.ausgewaehlterName === datenKnoten.name) {
    instanz.ausgewaehlterName = null;
    zeichneTreemap();
    schliesseSidebar();
    // schliesseSidebar() holt den Fokus nur zurück, wenn er sich VOR dem
    // Schließen innerhalb der Sidebar befand (z. B. ×-Button) - hier kommt der
    // Klick aber von der soeben durch zeichneTreemap() zerstörten Kachel selbst,
    // der Fokus wäre sonst auf <body> verwaist. svgBereich trägt genau dafür
    // bereits ein programmatisches tabindex="-1" (siehe render()).
    instanz.svgBereich.focus();
    return;
  }
  instanz.ausgewaehlterName = datenKnoten.name;
  zeichneTreemap();
  oeffneSidebar(datenKnoten.record);
}

// 600ms-verzögerter Tooltip beim Hover/Fokus über eine ganze Kategorie-Region in
// der Wurzel-Ansicht - eigene Verzögerung innerhalb von treemap.js, ohne den
// gemeinsamen Tooltip-Vertrag selbst zu verändern (Abschnitt 5b).
function wireVerzoegerterTooltip(auswahl, text, container, verzoegerungMs) {
  let timerId = null;
  const starte = (element) => {
    timerId = setTimeout(() => zeigeTooltip(text, element, container), verzoegerungMs);
  };
  const stoppe = () => {
    clearTimeout(timerId);
    versteckeTooltip();
  };
  auswahl
    .on('mouseenter', function mouseenter() { starte(this); })
    .on('mouseleave', stoppe)
    .on('focus', function focus() { starte(this); })
    .on('blur', stoppe);
}

// Unsichtbare Klickfläche über der ganzen Kategorie-Region, VOR den Bestand-
// Kacheln gezeichnet (liegt dadurch dahinter) - fängt Klicks/Fokus nur in
// Lücken zwischen den Kacheln ab; echte Kacheltreffer gehen direkt an die
// jeweilige Kachel (siehe wireWurzelKachelKlick()). Beide lösen denselben
// Kategorie-Wechsel aus.
function zeichneKategorieKlickflaeche(gruppe, kategorieKnoten, container) {
  const rect = gruppe.append('rect')
    .attr('x', kategorieKnoten.x0).attr('y', kategorieKnoten.y0)
    .attr('width', kategorieKnoten.x1 - kategorieKnoten.x0)
    .attr('height', kategorieKnoten.y1 - kategorieKnoten.y0)
    .attr('fill', 'transparent')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', `Kategorie ${kategorieKnoten.data.name} öffnen`)
    .style('cursor', 'zoom-in')
    .on('click', () => wechsleZuKategorie(kategorieKnoten.data))
    .on('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); wechsleZuKategorie(kategorieKnoten.data); }
    });
  wireVerzoegerterTooltip(rect, kategorieKnoten.data.name, container, TOOLTIP_VERZOEGERUNG_WURZEL_MS);
}

function zeichneKategorieRahmen(gruppe, knoten, container) {
  const breite = knoten.x1 - knoten.x0;
  const hoehe = knoten.y1 - knoten.y0;
  const farbe = knoten.data.name === OHNE_KATEGORIE ? OHNE_KATEGORIE_FARBE : instanz.kategorieFarbSkala(knoten.data.name);

  gruppe.append('rect')
    .attr('class', 'kategorie-rahmen-rect')
    .attr('x', knoten.x0).attr('y', knoten.y0)
    .attr('width', breite).attr('height', hoehe)
    .attr('fill', 'none')
    .attr('stroke', farbe)
    .attr('stroke-width', 2.5)
    .attr('stroke-dasharray', knoten.data.name === OHNE_KATEGORIE ? '6,3' : null)
    .attr('rx', 4)
    .attr('pointer-events', 'none');

  if (breite <= 18) return;
  zeichneKategorieBeschriftungsPille(gruppe, knoten, farbe, container);
}

// Ergänzung (siehe CHANGELOG): Ist der Kategoriename in der Pille abgeschnitten,
// bekommt GENAU die Pille (Rechteck+Text) einen eigenen, SOFORTIGEN Tooltip mit
// dem vollständigen Namen sowie denselben Klick-zum-Zoomen - analog zur bereits
// bestehenden Regelung für zu klein beschriftete Einzelkacheln auf Ebene 2
// (dort ebenfalls sofort, ohne Verzögerung). Die restliche Kategorie-Fläche
// behält die bestehende, um 600ms verzögerte Tooltip-Anzeige (siehe
// zeichneKategorieKlickflaeche()) - beide Mechanismen sind unabhängig
// voneinander und schließen sich nicht aus, da die Pille flächenmäßig separat
// (im ohnehin für sie reservierten Kopfbereich) liegt und keine Bestand-Kachel
// überdeckt.
function zeichneKategorieBeschriftungsPille(gruppe, knoten, farbe, container) {
  const breite = knoten.x1 - knoten.x0;
  const schriftgroesse = breite > 100 ? 11 : 9;
  const zeichenBreite = schriftgroesse * 0.57;
  const maxZeichen = Math.max(2, Math.floor((breite - 8) / zeichenBreite));
  const istAbgeschnitten = knoten.data.name.length > maxZeichen;
  const beschriftung = istAbgeschnitten ? `${knoten.data.name.slice(0, maxZeichen - 1)}…` : knoten.data.name;
  const pillBreite = Math.min(breite - 4, beschriftung.length * zeichenBreite + 8);

  const pillRect = gruppe.append('rect')
    .attr('x', knoten.x0 + 2).attr('y', knoten.y0 + 2)
    .attr('width', pillBreite).attr('height', schriftgroesse + 6)
    .attr('fill', farbe).attr('opacity', 0.92).attr('rx', 3)
    .attr('pointer-events', istAbgeschnitten ? 'auto' : 'none');

  const pillText = gruppe.append('text')
    .attr('x', knoten.x0 + 5).attr('y', knoten.y0 + schriftgroesse + 3)
    .attr('fill', passendeTextfarbe(farbe))
    .attr('font-size', schriftgroesse).attr('font-weight', 700)
    .attr('pointer-events', 'none')
    .text(beschriftung);

  if (!istAbgeschnitten) return;
  pillRect.style('cursor', 'zoom-in').attr('tabindex', 0).attr('role', 'button')
    .attr('aria-label', `Kategorie ${knoten.data.name} öffnen`)
    .on('click', () => wechsleZuKategorie(knoten.data))
    .on('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); wechsleZuKategorie(knoten.data); }
    });
  wireVerzoegerterTooltip(pillRect, knoten.data.name, container, 0);
  void pillText; // nur zur Klarheit, dass der sichtbare (abgeschnittene) Text unverändert bleibt
}

function wireWurzelKachelKlick(kachel, kategorieDaten) {
  kachel.style('cursor', 'zoom-in')
    .on('click', () => wechsleZuKategorie(kategorieDaten))
    .on('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); wechsleZuKategorie(kategorieDaten); }
    });
}

function wireKategorieKachelInteraktion(kachel, knoten, container) {
  kachel
    .on('mouseenter focus', function mouseenterFocus() { zeigeTooltip(baueTooltipText(knoten), this, container); })
    .on('mouseleave blur', () => versteckeTooltip())
    .on('click', () => waehleBestandAus(knoten.data))
    .on('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); waehleBestandAus(knoten.data); }
    });
}

// Zeichnet eine einzelne Bestand-Kachel und meldet zurück, ob/wie eine
// Beschriftung tatsächlich platziert wurde (Tri-State 'voll' | 'gekuerzt' |
// false, siehe platziereAutoFitText()) - bei false ODER 'gekuerzt' bekommt
// die Kachel (nur in der Wurzel-Ansicht, siehe zeichneEineWurzelKachel())
// einen Namens-Tooltip als Ersatz/Ergänzung, damit der volle Name in beiden
// Fällen weiterhin erreichbar bleibt.
function zeichneEineKachel(gruppe, knoten, kategorieName, zeigeUnsicherheit) {
  const breite = Math.max(knoten.x1 - knoten.x0, 0);
  const hoehe = Math.max(knoten.y1 - knoten.y0, 0);
  const farbe = farbeFuerBestandsKachel(knoten, kategorieName);
  const textFarbe = passendeTextfarbe(farbe);
  const istUnsicher = zeigeUnsicherheit && knoten.data.record.daten_unsicher;
  const istAusgewaehlt = instanz.ausgewaehlterName === knoten.data.name;
  const ohneKategorie = kategorieName === OHNE_KATEGORIE;

  gruppe.append('rect')
    .attr('class', 'bestand-rand')
    .attr('width', breite).attr('height', hoehe)
    .attr('fill', farbe)
    .attr('rx', 3)
    .attr('stroke', istAusgewaehlt ? AUSWAHL_FARBE : (istUnsicher ? '#c0392b' : '#ffffff'))
    .attr('stroke-width', istAusgewaehlt || istUnsicher ? 2 : 1)
    .attr('stroke-dasharray', istUnsicher ? '4,3' : null)
    .attr('stroke-opacity', istAusgewaehlt ? 0.9 : 1);

  if (ohneKategorie) {
    gruppe.append('rect')
      .attr('width', breite).attr('height', hoehe)
      .attr('fill', 'url(#treemap-ohne-kategorie-muster)')
      .attr('rx', 3)
      .attr('pointer-events', 'none');
  }

  if (istUnsicher) {
    gruppe.append('rect')
      .attr('width', breite).attr('height', hoehe)
      .attr('fill', 'url(#treemap-unsicher-schraffur)')
      .attr('rx', 3)
      .attr('pointer-events', 'none');
    gruppe.append('text')
      .attr('x', Math.max(breite - 14, 2)).attr('y', 14)
      .attr('aria-hidden', 'true')
      .attr('font-size', 12)
      .text(WARN_SYMBOL);
  }

  return platziereAutoFitText(gruppe, knoten.data.name, breite, hoehe, textFarbe);
}

// Wurzel-Ansicht: eine Bestand-Kachel innerhalb ihrer Kategorie-Gruppe. Klick
// zoomt in die Kategorie (nicht in den einzelnen Bestand, siehe Punkt 3) - ohne
// sichtbares Label bekommt die Kachel ersatzweise einen sofortigen
// Namens-Tooltip, damit der Name trotzdem auffindbar bleibt.
function zeichneEineWurzelKachel(gruppe, knoten, kategorieName, zeigeUnsicherheit, container) {
  const beschriftungsErgebnis = zeichneEineKachel(gruppe, knoten, kategorieName, zeigeUnsicherheit);
  // KORREKTUR (Auftrag "Beschriftungs-Kürzung mit Ellipse", siehe CHANGELOG):
  // vormals nur bei komplett fehlendem Label (`!beschriftet`) - der
  // Tooltip-Ersatz greift jetzt auch bei GEKÜRZTER Anzeige, da dort der volle
  // Name ebenfalls nicht direkt sichtbar ist (nur `'voll'` überspringt den
  // Tooltip weiterhin, exakt wie zuvor bei vollständig sichtbarem Namen).
  if (beschriftungsErgebnis !== 'voll') {
    wireVerzoegerterTooltip(gruppe, knoten.data.name, container, 0);
  }
}

// Hebt die GESAMTE Kategorie-Region als eine Einheit hervor (Punkt 3: Hover-/
// Fokus-Feedback muss "ich öffne eine Kategorie" vermitteln, nicht "ich wähle
// eine Einzelkachel"). Bewusst per JS auf mouseenter/mouseleave/focusin/focusout
// statt per CSS :hover/:focus-within umgesetzt: D3s .attr('stroke-width', ...)
// setzt ein SVG-Präsentationsattribut, das in dieser Laufzeitumgebung
// nachweislich Vorrang vor einer reinen CSS-Regel hat (per Vergleichstest
// bestätigt, siehe CHANGELOG) - der bewährte, im ganzen Projekt bereits genutzte
// Event+attr()-Ansatz (wie bei Tooltip/Auswahl) ist hier zuverlässig, nicht nur
// vermutet richtig.
function wireKategorieGruppenHervorhebung(gruppe) {
  const setzeHervorhebung = (aktiv) => {
    gruppe.selectAll('rect.kategorie-rahmen-rect').attr('stroke-width', aktiv ? 4.5 : 2.5);
    gruppe.selectAll('rect.bestand-rand').style('filter', aktiv ? 'brightness(1.1)' : null);
  };
  gruppe
    .on('mouseenter', () => setzeHervorhebung(true))
    .on('mouseleave', () => setzeHervorhebung(false))
    .on('focusin', () => setzeHervorhebung(true))
    .on('focusout', () => setzeHervorhebung(false));
}

function zeichneWurzelAnsicht(svg, wurzel, container, zeigeUnsicherheit) {
  const kategorieKnoten = wurzel.descendants().filter((d) => d.depth === 1);
  const gruppen = svg.selectAll('g.kategorie-gruppe').data(kategorieKnoten).join('g')
    .attr('class', 'kategorie-gruppe');

  gruppen.each(function jedeKategorieGruppe(kategorieD) {
    const gruppe = d3.select(this);
    zeichneKategorieKlickflaeche(gruppe, kategorieD, container);

    const kacheln = gruppe.selectAll('g.bestand-kachel').data(kategorieD.leaves()).join('g')
      .attr('class', 'bestand-kachel')
      .attr('tabindex', 0)
      .attr('transform', (d) => `translate(${d.x0},${d.y0})`);
    kacheln.each(function jedeWurzelKachel(d) {
      zeichneEineWurzelKachel(d3.select(this), d, kategorieD.data.name, zeigeUnsicherheit, container);
    });
    wireWurzelKachelKlick(kacheln, kategorieD.data);

    zeichneKategorieRahmen(gruppe, kategorieD, container);
    wireKategorieGruppenHervorhebung(gruppe);
  });
}

function zeichneKategorieAnsicht(svg, wurzel, kategorieName, zeigeUnsicherheit, container) {
  const kacheln = svg.selectAll('g.bestand-kachel').data(wurzel.leaves()).join('g')
    .attr('class', 'bestand-kachel')
    .attr('tabindex', 0)
    .attr('transform', (d) => `translate(${d.x0},${d.y0})`);

  kacheln.each(function jedeKategorieKachel(d) {
    zeichneEineKachel(d3.select(this), d, kategorieName, zeigeUnsicherheit);
    wireKategorieKachelInteraktion(d3.select(this), d, container);
  });
}

function zeichneTreemap() {
  const { svgBereich, hierarchieDaten, aktuelleKategorieDaten, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  svgBereich.innerHTML = '';

  const breite = options.width || svgBereich.clientWidth || 800;
  const hoehe = options.height || svgBereich.clientHeight || 600;
  const inKategorieAnsicht = !!aktuelleKategorieDaten;

  // KORREKTUR (siehe CHANGELOG): d3.treemap().paddingTop(zahl) reserviert bei
  // JEDEM Knoten mit Kindern erneut denselben Abstand, nicht nur einmal auf der
  // Ebene, wo tatsächlich eine Beschriftung hineingezeichnet wird - per Test an
  // einem Minimalbeispiel nachgewiesen (Unterkategorie-Kinder begannen bei
  // y0=44 statt y0=22, weil sowohl die Kategorie ALS AUCH die Unterkategorie
  // je eigenes Top-Padding erhielten). Das erklärte sowohl die im Screenshot
  // sichtbaren Lücken als auch das komplette Fehlen sichtbarer Kacheln bei
  // "Stadt und Raum" (wenige, kleinteilig verschachtelte Unterkategorien -
  // dort blieb nach mehrfach reserviertem Top-Padding praktisch kein Platz
  // mehr übrig). Jetzt: Top-Padding nur dort, wo tatsächlich eine
  // Kategorie-Pille gezeichnet wird (Wurzel-Ansicht, Tiefe 1) - überall sonst
  // 0, inklusive der kompletten Kategorie-Ansicht (deren Titel im externen
  // Werkzeugleisten-Titel steht, nicht innerhalb der SVG).
  const topPaddingFuer = (knoten) => (!inKategorieAnsicht && knoten.depth === 1 ? RAND_OBEN_WURZEL : 0);

  const anzeigeDaten = aktuelleKategorieDaten || hierarchieDaten;
  const wurzel = d3.hierarchy(anzeigeDaten).sum((d) => Math.sqrt(d.value || 0)).sort((a, b) => b.value - a.value);
  d3.treemap().size([breite, hoehe]).paddingOuter(RAND_AUSSEN).paddingTop(topPaddingFuer).paddingInner(1).round(true)(wurzel);
  korrigiereMindesthoehen(wurzel, topPaddingFuer);

  const svg = d3.select(svgBereich).append('svg')
    .attr('width', breite).attr('height', hoehe)
    .attr('viewBox', `0 0 ${breite} ${hoehe}`)
    .attr('role', 'img')
    .attr('aria-label', inKategorieAnsicht
      ? `Bestände der Kategorie ${aktuelleKategorieDaten.name}`
      : 'Treemap des Gesamtbestands, gruppiert nach Kategorie');
  svg.append('desc').text(
    'Jede Kachel entspricht einem Bestand, Fläche nach Umfang in Laufmetern ' +
    '(Quadratwurzel-skaliert für Lesbarkeit). Farbton zeigt die Kategorie, ' +
    'Helligkeit die Unterkategorie; "ohne Kategorie" erscheint neutral grau mit ' +
    'Punktmuster. Gestrichelter roter Rand, Warnsymbol und Schraffur ' +
    'kennzeichnen Bestände mit unsicheren Angaben. Klick auf eine ' +
    'Kategorie-Fläche in der Wurzel-Ansicht zeigt nur deren Bestände; Klick auf ' +
    'einen Bestand in der Kategorie-Ansicht öffnet Details in der Seitenleiste.'
  );

  const defs = svg.append('defs');
  baueSchraffurPattern(defs);
  baueOhneKategorieMuster(defs);

  if (inKategorieAnsicht) {
    zeichneKategorieAnsicht(svg, wurzel, aktuelleKategorieDaten.name, zeigeUnsicherheit, svgBereich);
  } else {
    zeichneWurzelAnsicht(svg, wurzel, svgBereich, zeigeUnsicherheit);
  }
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  container.innerHTML = '';

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'treemap-werkzeugleiste';

  const svgBereich = document.createElement('div');
  svgBereich.className = 'treemap-svg-bereich';
  svgBereich.setAttribute('tabindex', '-1');

  container.append(werkzeugleiste, svgBereich);
  fuegeStyleEin(container);
  fuegeSidebarStyleEin(container);
  const sidebar = baueSidebarGeruest(container);
  sidebar.schliessenBtn.addEventListener('click', schliesseSidebar);

  const hierarchieDaten = baueBestandsHierarchie(data, MINDESTGROESSE_ROH_TREEMAP);
  const kategorienNamen = hierarchieDaten.children.map((k) => k.name).filter((name) => name !== OHNE_KATEGORIE).sort((a, b) => a.localeCompare(b));

  instanz = {
    container,
    hierarchieDaten,
    kategorieFarbSkala: baueKategorieFarbSkala(kategorienNamen),
    options: { showUncertainty: true, width: null, height: null, ...options },
    aktuelleKategorieDaten: null,
    ausgewaehlterName: null,
    werkzeugleiste,
    svgBereich,
    sidebar,
    zurueckTimeout: null
  };

  baueWerkzeugleiste();
  zeichneTreemap();
}

// Ohne Argumente: misst den Container neu aus (reagiert auf veränderte
// Bildschirmgröße). Mit Argumenten: überschreibt gezielt einzelne options.
// Aktuelle Ansicht (Wurzel/Kategorie) und offene Sidebar bleiben erhalten -
// resize() zeichnet nur den SVG-Bereich neu, nicht Werkzeugleiste/Sidebar.
export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneTreemap();
}

export function destroy() {
  if (!instanz) return;
  clearTimeout(instanz.zurueckTimeout);
  versteckeTooltip();
  instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}

// AUFTRAG "Fuehrungen, Teil 2b", Punkt 4: schmale, von js/utils/
// datensatzAufruf.js aufgerufene Oeffnen-Funktion - sucht den Bestand per
// kuerzel in der Hierarchie und ruft dieselben zwei bestehenden
// Klick-Handler wie ein Nutzer auf: wechsleZuKategorie() (Zeile 477, wie ein
// Klick auf die Kategorie-Kachel) faehrt automatisch in die passende
// Kategorie hinein, danach waehleBestandAus() (Zeile 368, wie ein Klick auf
// die Bestand-Kachel) oeffnet Sidebar + Hervorhebung - keine eigene
// Sidebar-/Hervorhebungslogik hier.
export function oeffneDatensatz(kuerzel) {
  if (!instanz) return false;
  for (const kategorie of instanz.hierarchieDaten.children) {
    for (const unterkategorie of kategorie.children) {
      const knoten = unterkategorie.children.find((b) => b.record.kuerzel === kuerzel);
      if (knoten) {
        wechsleZuKategorie(kategorie);
        waehleBestandAus(knoten);
        return true;
      }
    }
  }
  return false;
}
