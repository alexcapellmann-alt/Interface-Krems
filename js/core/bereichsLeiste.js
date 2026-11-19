// js/core/bereichsLeiste.js – Bereichs-Leiste im Tab Visualisierungen
// Zweck: dauerhaft sichtbare Leiste zur Wahl des Archivalientyps, optisch eine Ebene unter der Hauptnavigation
//   (beginnt unter „Visualisierungen“, kleinere Schrift, Seitengrund, schließt randlos an den Kopf an).
// Eingabe: Liste der Archivalientypen (config/archivalienRegistry.js), aktiver Typ, Optionen.
// Schnittstelle: Erzeugung der Leiste mit options.onAuswahl(archivalientyp) und optional options.verankereVizFlyout;
//   erzeugeBereichsLeistenVorschau() für das Hover-Flyout der Hauptnavigation.
// Abhängigkeiten: keine zu router.js oder den Ansichten (Baustein; app.js entscheidet die Navigation).
// Barrierefreiheit: Links mit aria-current für den aktiven Eintrag.
// Hintergrund (Positionsabgleich, Hülle, Flyouts): docs/MODULNOTIZEN.md, Abschnitt bereichsLeiste.js.

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
// (Hover-Flyout-Inhalt), siehe docs/MODULNOTIZEN.md.
// options.verankereVizFlyout(link, archivalientyp): optional, einmal pro
// NICHT-aktivem Link aufgerufen (siehe docs/MODULNOTIZEN.md, Punkt 3) - der
// Rückgabewert (falls vorhanden) wird beim Abbau über .destroy() entsorgt.
// options.istAusgeblendet(archivalientyp): AUFTRAG B2 - von app.js übergeben
// (statt Import, kürzere Importkette beim Start); fehlt sie, ist nichts ausgeblendet.
function baueBereichsPillen(nav, { aktiverTyp, onAuswahl, verankereVizFlyout, istAusgeblendet = () => false }) {
  let aktiverLink = null;
  const abzubauendeFlyouts = [];

  ARCHIVALIENTYPEN.forEach((archivalientyp) => {
    const istAktiv = archivalientyp.typ === aktiverTyp;
    // AUFTRAG B2: Bereiche ohne Daten erscheinen nicht (außer dem gerade per
    // direktem Link geöffneten - dort erklärt der Hinweisbalken den Grund).
    if (!istAktiv && istAusgeblendet(archivalientyp)) return;
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = archivalientyp.label;
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
export function erzeugeBereichsLeiste(container, { aktiverTyp = null, onAuswahl, verankereVizFlyout, istAusgeblendet } = {}) {
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
  const { aktiverLink, abbauen } = baueBereichsPillen(nav, { aktiverTyp, onAuswahl, verankereVizFlyout, istAusgeblendet });

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
// docs/MODULNOTIZEN.md bei .bereichs-leiste-huelle - innerhalb eines bereits
// fertig positionierten Flyout-Panels wäre das falsch/würde die Pillen über
// dessen Rahmen/Ecken hinausschieben) und OHNE synchronisiereXPosition()
// (aus demselben Grund unnötig: das Panel selbst ist schon relativ zu
// #app-content positioniert, siehe visualisierungsTabs.js' erzeugeFlyoutPanel()).
export function erzeugeBereichsLeistenVorschau(container, { aktiverTyp = null, onAuswahl, verankereVizFlyout, istAusgeblendet } = {}) {
  container.innerHTML = '';
  fuegeStyleEin(container); // dieselben Regeln, .bereichs-leiste-huelle bleibt hier einfach ungenutzt

  const nav = document.createElement('nav');
  nav.className = 'bereichs-leiste';
  nav.setAttribute('aria-label', 'Bereich wählen');

  const { abbauen } = baueBereichsPillen(nav, { aktiverTyp, onAuswahl, verankereVizFlyout, istAusgeblendet });
  container.appendChild(nav);

  return {
    destroy() {
      abbauen();
      container.innerHTML = '';
    }
  };
}
