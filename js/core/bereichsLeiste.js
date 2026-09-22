// js/core/bereichsLeiste.js
// AUFTRAG "Navigation – Permanente Bereichs-Leiste & Visualisierungs-Galerie
// (Pilot: Urkunden)", Punkt 1: ersetzt kachelauswahl.js' bisherige, EINMALIGE
// "Kachel wählen, dann verschwindet die Auswahl"-Landingpage durch eine
// Leiste, die dauerhaft sichtbar bleibt, solange man sich im
// Visualisierungen-Tab befindet - unabhängig davon, ob/welcher Bereich
// bereits gewählt ist bzw. wie tief man innerhalb eines Bereichs navigiert
// (Akzeptanzkriterium, wörtlich: "Leiste bleibt... durchgehend sichtbar").
// Dasselbe visuelle Muster wie die bestehende Hauptnavigation
// (.haupt-navigation in index.html/layout.css: Zeile klickbarer Links,
// aria-current markiert den aktiven Eintrag) - nur eine Ebene tiefer, für
// die vier Archivalientypen statt der fünf Haupt-Tabs.
//
// kachelauswahl.js löste dieselbe "Bereich wählen"-Aufgabe, nur mit
// einmaliger statt permanenter Sichtbarkeit - daher ein eigener, neuer
// Baustein statt einer Erweiterung des bestehenden; kachelauswahl.js wurde
// dadurch unerreichbar und ist gelöscht (siehe CHANGELOG).
//
// Baustein-Muster (Abschnitt 5): kennt selbst weder router.js noch die
// echten Visualisierungsmodule - options.onAuswahl(archivalientyp)
// entscheidet die eigentliche Navigation, dieses Modul rendert nur.
//
// FOLGEAUFTRAG "Bereichs-Leiste optisch als Unterebene von
// 'Visualisierungen' verankern" (siehe CHANGELOG): die Leiste wirkte bisher
// wie eine zweite, gleichrangige Vollbreiten-Navigation statt wie eine
// Unterebene von "Visualisierungen". Vier Anpassungen, alle vollständig in
// diesem eigenen Stylesheet/DOM gekapselt (Auftrag, "Betroffene Dateien":
// nur diese Datei - layout.css/#app-content bleibt unangetastet):
//   Punkt 1 (X-Position): .bereichs-leiste beginnt exakt unter dem
//     Linktext "Visualisierungen" der Hauptnavigation - siehe
//     synchronisiereXPosition() unten für die Begründung, warum das per
//     ECHTER Positionsmessung statt festem Pixelwert gelöst ist.
//   Punkt 2 (Schriftgröße): var(--fs-sm) (14px = 87,5% von var(--fs-md)s
//     16px, exakt im geforderten 85-90%-Korridor) statt der von der
//     Hauptnavigation geerbten var(--fs-md).
//   Punkt 3 (Hintergrund): var(--bg) (das gedeckte Seiten-Grundgrau) statt
//     dem weißen var(--surface) der Hauptnavigation.
//   Punkt 4 (gemeinsamer Container): .bereichs-leiste-huelle bricht mit
//     negativen Margins exakt in Höhe von #app-content's eigenem Padding
//     (var(--space-4)) aus diesem Padding aus - dadurch schließt sie
//     lückenlos UND randlos (volle Fensterbreite, wie die Hauptnavigation
//     selbst) an den Header an; der eigene box-shadow setzt den Header-
//     Schatten optisch fort statt eines zweiten, unabhängigen Schattens.
//     Ergebnis: Header + Bereichs-Leiste wirken als EIN zusammenhängender,
//     zweizeiliger Navigationsblock statt als zwei gestapelte Balken.
//     (Rein visuelle Technik, kein Eingriff in die Grid-Zeilenhöhen-Logik
//     von #app-content - siehe Kommentar bei .bereichs-leiste-huelle unten
//     für die Herleitung, warum die Grid-Zeile dadurch NICHT höher wird.)
//
// FOLGEAUFTRAG "Hover-Flyouts in der Hauptnavigation", Punkt 3: JEDER Eintrag
// (nicht mehr nur der aktive, siehe app.js' bisherige Verankerung) bekommt
// jetzt einen eigenen Visualisierungs-Tab-Flyout, damit von der Bereichs-
// Leiste aus per Hover direkt in einen ANDEREN Bereich gesprungen werden
// kann, ohne vorher dorthin zu klicken. Dafür ist die bisherige Link-Bau-
// Schleife in baueBereichsPillen() ausgelagert (Wiederverwendung durch die
// neue erzeugeBereichsLeistenVorschau() unten, siehe dortiger Kommentar) und
// nimmt jetzt einen optionalen dritten Callback options.verankereVizFlyout
// entgegen: app.js entscheidet darüber (bleibt beim Baustein-Vertrag - diese
// Datei kennt selbst weder router.js noch visualisierungsTabs.js), dieses
// Modul ruft ihn nur pro Link auf. Der AKTIVE Link wird bewusst
// AUSGESPART (siehe dortige Prüfung): der hat bereits einen eigenen,
// LIVE mit dem gerade offenen Bereich mitlaufenden Flyout (app.js'
// stelleVizFlyoutSicher()/verankereFlyout()) - ein zweiter, unabhängiger
// Flyout auf demselben Link wäre ein Doppel-Listener-Konflikt.
//
// Zweiter Export dieser Datei (neu): erzeugeBereichsLeistenVorschau() - eine
// schlanke Variante ohne .bereichs-leiste-huelle (kein Bleed-Trick/keine
// X-Positions-Sync, siehe dortiger Kommentar) für den Hauptnav-Hover-Flyout
// bei "Visualisierungen" (Punkt 1, verankert von app.js über
// visualisierungsTabs.js' erzeugeFlyoutPanel()) - dieselben Pillen/derselbe
// visuelle Stil (.bereichs-leiste-Klasse), nur innerhalb eines bereits
// fertig positionierten Flyout-Panels statt der festen ersten Grid-Zeile.

import { ARCHIVALIENTYPEN } from '../config/archivalienRegistry.js';

const HAUPTNAV_VISUALISIERUNGEN_SELEKTOR = '.haupt-navigation a[data-tab="visualisierungen"]';
const RESIZE_DEBOUNCE_MS = 150;

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    /* Punkt 4: siehe Dateikopf-Kommentar. Die negativen Margins entsprechen
       exakt #app-content's eigenem Padding (var(--space-4), layout.css) -
       dadurch landet die Hülle exakt an dessen Außenkante (= Fensterrand
       oben/links/rechts, kein Zufallswert). WARUM die Grid-Zeile dadurch
       NICHT höher wird als vorher (kein Überlappen der Werkzeugleiste
       darunter): eine negative margin-top verkleinert den vom Grid als
       "auto"-Zeilenhöhe gemessenen Platzbedarf des Elements um exakt
       denselben Betrag, um den sie es nach oben verschiebt - die
       UNTERKANTE der Hülle (und damit die von der Grid-Zeile tatsächlich
       beanspruchte Höhe) bleibt exakt an derselben Stelle wie ohne die
       negative Margin, nur die Oberkante wandert nach oben in den zuvor
       leeren Padding-Bereich hinein. */
    .bereichs-leiste-huelle {
      margin: calc(-1 * var(--space-4)) calc(-1 * var(--space-4)) 0 calc(-1 * var(--space-4));
      padding: 0 var(--space-4);
      background: var(--bg);
      box-shadow: var(--shadow);
    }
    .bereichs-leiste {
      display: flex; flex-wrap: wrap; gap: var(--space-1);
      font-size: var(--fs-sm); /* Punkt 2 */
    }
    .bereichs-leiste a { display: inline-flex; align-items: center; min-height: 44px; min-width: 44px;
      padding: var(--space-2) var(--space-3); text-decoration: none; color: var(--text); font-weight: 500;
      border-radius: var(--radius); }
    .bereichs-leiste a:hover { background: var(--surface); }
    .bereichs-leiste a:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .bereichs-leiste a[aria-current="page"] { background: var(--accent); color: var(--surface); font-weight: 600; }
  `;
  container.appendChild(style);
}

// Punkt 1: setzt .bereichs-leiste's margin-left so, dass ihr erster Link
// horizontal exakt dort beginnt, wo der Linktext "Visualisierungen" in der
// Hauptnavigation beginnt. BEWUSST per Positionsmessung (getBoundingClientRect)
// statt festem Pixelwert (Auftrag, wörtlich: "nicht an einem festen
// Pixelwert"): .app-header-inner ist zentriert mit max-width:1100px
// (layout.css), die X-Position von "Visualisierungen" verschiebt sich damit
// mit der Fensterbreite UND mit der (variablen) Breite von Logo/"Bestand"-
// Link davor - eine CSS-Konstante könnte das nicht nachbilden.
function synchronisiereXPosition(nav) {
  const vizTab = document.querySelector(HAUPTNAV_VISUALISIERUNGEN_SELEKTOR);
  if (!vizTab) return;
  nav.style.marginLeft = '0px';
  const versatz = vizTab.getBoundingClientRect().left - nav.getBoundingClientRect().left;
  nav.style.marginLeft = `${Math.max(0, versatz)}px`;
}

// Baut die vier Bereichs-Pillen in `nav` - gemeinsam genutzt von
// erzeugeBereichsLeiste() (permanent) und erzeugeBereichsLeistenVorschau()
// (Hover-Flyout-Inhalt), siehe Dateikopf-Kommentar.
// options.verankereVizFlyout(link, archivalientyp): optional, einmal pro
// NICHT-aktivem Link aufgerufen (siehe Dateikopf-Kommentar, Punkt 3) - der
// Rückgabewert (falls vorhanden) wird beim Abbau über .destroy() entsorgt.
function baueBereichsPillen(nav, { aktiverTyp, onAuswahl, verankereVizFlyout }) {
  let aktiverLink = null;
  const abzubauendeFlyouts = [];

  ARCHIVALIENTYPEN.forEach((archivalientyp) => {
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = archivalientyp.label;
    const istAktiv = archivalientyp.typ === aktiverTyp;
    if (istAktiv) {
      link.setAttribute('aria-current', 'page');
      aktiverLink = link;
    }
    link.addEventListener('click', (event) => {
      event.preventDefault();
      if (onAuswahl) onAuswahl(archivalientyp);
    });
    if (verankereVizFlyout && !istAktiv) {
      const flyout = verankereVizFlyout(link, archivalientyp);
      if (flyout) abzubauendeFlyouts.push(flyout);
    }
    nav.appendChild(link);
  });

  return {
    aktiverLink,
    abbauen() {
      abzubauendeFlyouts.forEach((flyout) => flyout.destroy());
    }
  };
}

// options.aktiverTyp: `typ`-Kennung (z.B. "urkunden") des gerade gewählten
// Bereichs, oder null (noch keiner gewählt) - bestimmt aria-current.
// options.onAuswahl(archivalientyp): bei Klick auf einen Eintrag aufgerufen.
// options.verankereVizFlyout: siehe baueBereichsPillen() oben.
export function erzeugeBereichsLeiste(container, { aktiverTyp = null, onAuswahl, verankereVizFlyout } = {}) {
  container.innerHTML = '';
  fuegeStyleEin(container);

  const huelle = document.createElement('div');
  huelle.className = 'bereichs-leiste-huelle';

  const nav = document.createElement('nav');
  nav.className = 'bereichs-leiste';
  nav.setAttribute('aria-label', 'Bereich wählen');

  // FOLGEAUFTRAG "...Hover/Klick-Flyout...": der DOM-Knoten des aktiven
  // Eintrags wird unten als `aktiverLink` zurückgegeben, damit app.js dort
  // den Flyout-Auslöser (visualisierungsTabs.js' verankereFlyout())
  // andocken kann - dieses Modul kennt selbst nichts vom Flyout (bleibt beim
  // Baustein-Vertrag "kennt weder router.js noch die Visualisierungsmodule"),
  // es liefert nur den fertigen Link-Knoten.
  const { aktiverLink, abbauen } = baueBereichsPillen(nav, { aktiverTyp, onAuswahl, verankereVizFlyout });

  huelle.appendChild(nav);
  container.appendChild(huelle);

  // Punkt 1: einmal sofort (Header-Markup ist bereits vor app.js im DOM,
  // siehe index.html) sowie erneut, sobald die Web-Fonts geladen sind -
  // Inter wird per <link> asynchron nachgeladen (index.html) und kann die
  // Textbreite von "Bestand"/"Visualisierungen" gegenüber der Fallback-Schrift
  // verändern, was die X-Position sonst kurzzeitig falsch berechnen würde.
  synchronisiereXPosition(nav);
  document.fonts?.ready?.then(() => synchronisiereXPosition(nav));

  let resizeTimeout = null;
  function planeNeuberechnung() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => synchronisiereXPosition(nav), RESIZE_DEBOUNCE_MS);
  }
  window.addEventListener('resize', planeNeuberechnung);

  return {
    aktiverLink,
    destroy() {
      abbauen();
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', planeNeuberechnung);
      container.innerHTML = '';
    }
  };
}

// FOLGEAUFTRAG "Hover-Flyouts in der Hauptnavigation", Punkt 1: schlanke
// Vorschau-Variante für den Hauptnav-Hover-Flyout bei "Visualisierungen" -
// dieselben Pillen (baueBereichsPillen(), also auch Punkt 3s verschachtelte
// Visualisierungs-Tab-Flyouts pro Bereich), aber OHNE .bereichs-leiste-huelle
// (deren Bleed-Trick setzt voraus, in #app-content selbst zu stecken - siehe
// Dateikopf-Kommentar bei .bereichs-leiste-huelle - innerhalb eines bereits
// fertig positionierten Flyout-Panels wäre das falsch/würde die Pillen über
// dessen Rahmen/Ecken hinausschieben) und OHNE synchronisiereXPosition()
// (aus demselben Grund unnötig: das Panel selbst ist schon relativ zu
// #app-content positioniert, siehe visualisierungsTabs.js' erzeugeFlyoutPanel()).
export function erzeugeBereichsLeistenVorschau(container, { aktiverTyp = null, onAuswahl, verankereVizFlyout } = {}) {
  container.innerHTML = '';
  fuegeStyleEin(container); // dieselben Regeln, .bereichs-leiste-huelle bleibt hier einfach ungenutzt

  const nav = document.createElement('nav');
  nav.className = 'bereichs-leiste';
  nav.setAttribute('aria-label', 'Bereich wählen');

  const { abbauen } = baueBereichsPillen(nav, { aktiverTyp, onAuswahl, verankereVizFlyout });
  container.appendChild(nav);

  return {
    destroy() {
      abbauen();
      container.innerHTML = '';
    }
  };
}
