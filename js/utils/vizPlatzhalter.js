// js/utils/vizPlatzhalter.js
// AUFTRAG "Neue Kacheln Bürgerbuch/Verlassenschaften/Personen": gemeinsame
// Fabrik für Visualisierungsmodule, die das Modul-Interface (Abschnitt 5:
// render(container,data,options)/resize(optionen)/destroy()) bereits
// vollständig erfüllen, aber noch keinen tatsächlichen Visualisierungsinhalt
// haben - Nicht-Ziel des Auftrags: "keine tatsächlichen Visualisierungsinhalte
// ... nur Kacheln, Routing, leeres Gerüst". Analog zu js/core/app.js'
// renderPlatzhalterTab() (dort für ganze Tabs ohne Datentabelle/Modul:
// Führungen/Literatur/Über), hier aber auf MODUL-Ebene, weil jeder neue
// Archivalientyp-Bereich technisch ein eigenes render/resize/destroy braucht,
// um an js/core/ansichtWechseln.js anzudocken (siehe archivalienRegistry.js).
//
// "Technisch vorbereitet" (Auftrag Punkt 2, wörtlich) heißt hier: Info-Button
// und Filterleiste werden TATSÄCHLICH aufgebaut und sind bedienbar (auch wenn
// das Filtern noch nichts sichtbar verändert, da es ja keine Liste zum
// Filtern gibt) - kein reiner Text-Platzhalter ohne echte Bausteine.
// viewportGroesse.js bemisst die Platzhalterfläche (echte, nicht nur
// dekorative Verwendung).
//
// js/utils/bildschirmHinweis.js BEWUSST NICHT eingebunden: dessen einziger
// Zweck ("Diese Ansicht ist für größere Bildschirme optimiert") setzt
// tatsächlich dichten, raumgreifenden Visualisierungsinhalt voraus, den es
// hier per Auftrag noch nicht gibt - ein Aufruf ohne echten Grund wäre reine
// Attrappe (Abschnitt 12: Funktionalität nie nur vortäuschen). Wird ergänzt,
// sobald das erste echte Modul in einem der drei neuen Bereiche tatsächlich
// mehr Raum braucht.
//
// js/utils/sidebar.js-Anschluss: baueSidebarGeruest()/fuegeSidebarStyleEin()
// werden aufgebaut (Gerüst existiert im DOM, korrekt geschlossen), aber NICHT
// befüllt - zeigeUrkundenSidebar()/zeigeUrkundenDetail() bauen eine hart auf
// das Urkunden-Schema (Signatur/Datum/Regest/Kategorien/Orte/Personen)
// zugeschnittene Detailansicht (baueUrkundenDetailInhalt()) und passen
// fachlich NICHT zu Bürgerbuch-/Verlassenschaften-/Personen-Datensätzen - sie
// hier aufzurufen wäre falsch, nicht nur verfrüht, da es zudem noch gar keine
// anklickbaren Einzel-Datensätze gibt. Die vom Auftrag als Option genannte
// Umbenennung zu einer datenquellen-neutralen Funktion würde daher NICHT
// ausreichen, ohne auch baueUrkundenDetailInhalt()s feste Feldliste selbst
// auf eine konfigurierbare (STANDARD_SIDEBAR_FELDER-ähnliche) Struktur
// umzustellen - eine größere Änderung an sidebar.js UND deren drei
// bestehenden Aufrufern (kalenderHeatmap.js/zeitachse.js/dotPlot.js), die
// dieser rein gerüstbildende Auftrag nicht rechtfertigt. Zurückmeldung dazu
// siehe Abschluss-Selbstauskunft/PROJEKTLOG - bewusst NICHT umbenannt.

import { erzeugeFilterleiste } from './filterleiste.js';
import { erzeugeInfoButton } from './infoButton.js';
import { ermittleVerfuegbareHoehe } from './viewportGroesse.js';
import { baueSidebarGeruest, schliesseSidebar, fuegeSidebarStyleEin } from './sidebar.js';

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .viz-platzhalter-wurzel { display: flex; flex-direction: column; height: 100%; }
    .viz-platzhalter-werkzeugleiste { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: var(--space-3); margin-bottom: var(--space-3); flex: 0 0 auto; }
    .viz-platzhalter-flaeche { flex: 1 1 auto; display: flex; align-items: center; justify-content: center;
      text-align: center; border: 2px dashed var(--border); border-radius: var(--radius); background: var(--surface); }
    .viz-platzhalter-flaeche-inhalt { max-width: 480px; padding: var(--space-5); }
    .viz-platzhalter-flaeche h2 { margin: 0 0 var(--space-2) 0; }
    .viz-platzhalter-flaeche p { margin: 0; color: var(--text-muted); }
    .viz-platzhalter-anzahl { margin-top: var(--space-3); font-size: var(--fs-sm); color: var(--text-muted); }
  `;
  container.appendChild(style);
}

// konfiguration:
//   titel: Überschrift in der Platzhalterfläche (auch für den Info-Button-
//     aria-label genutzt)
//   hinweistext: Fließtext in der Platzhalterfläche
//   infoText: Text für den Info-Button-Popover (Absätze durch \n\n getrennt,
//     siehe infoButton.js)
//   suchPlaceholder: Placeholder-Text der Filterleisten-Suche
//   ermittleKategorien(data): liefert die Kategorie-Werteliste für die
//     Filterleiste - DATENGETRIEBEN statt hart codiert (Abschnitt 2:
//     "Content-driven"), da z.B. Bürgerbuchs "Wirtschaftssektor"-Werte nicht
//     wie Urkundens CAT_COLORS eine feste, vorab bekannte Taxonomie sind.
//     Default: keine Kategorie-Filterung (nur "Alle Kategorien"), passend für
//     Bereiche ohne sinnvolle Kategorie-Dimension (Auftrag nennt Personen als
//     Beispiel).
//   ermittleAnzahlText(data): liefert den Text für die kleine Datensatz-
//     Zähl-Zeile - als Funktion statt fixem Feld, weil `data` je nach
//     Archivalientyp ein flaches Array (Bürgerbuch/Verlassenschaften) ODER
//     ein Objekt aus mehreren Records-Listen sein kann (Personen, siehe
//     archivalienRegistry.js/app.js' ladeArchivalienDaten()) - diese Fabrik
//     kennt die konkrete Form von `data` selbst nicht, nur der Aufrufer.
export function baueVizPlatzhalterModul({
  titel,
  hinweistext = 'Noch keine Visualisierung vorhanden.',
  infoText,
  suchPlaceholder = 'Suchen …',
  ermittleKategorien = () => [],
  ermittleAnzahlText = (data) => `${Array.isArray(data) ? data.length : 0} Datensätze geladen.`
}) {
  let instanz = null;

  function zeichneFlaeche() {
    const { flaechenContainer, wurzel, records } = instanz;
    flaechenContainer.innerHTML = '';

    // Höhe der Platzhalterfläche über dieselbe geteilte Utility wie die
    // echten Urkunden-Module (js/utils/viewportGroesse.js) - keine
    // Sonderlösung nur für Platzhalter.
    const hoehe = ermittleVerfuegbareHoehe(wurzel, { reserveUnten: 10 });
    flaechenContainer.style.minHeight = `${hoehe}px`;

    const inhalt = document.createElement('div');
    inhalt.className = 'viz-platzhalter-flaeche-inhalt';
    const ueberschrift = document.createElement('h2');
    ueberschrift.textContent = titel;
    const text = document.createElement('p');
    text.textContent = hinweistext;
    const anzahl = document.createElement('p');
    anzahl.className = 'viz-platzhalter-anzahl';
    anzahl.textContent = ermittleAnzahlText(records);
    inhalt.append(ueberschrift, text, anzahl);
    flaechenContainer.appendChild(inhalt);
  }

  return {
    render(container, data, options = {}) {
      container.innerHTML = '';
      fuegeStyleEin(container);
      fuegeSidebarStyleEin(container);

      const wurzel = document.createElement('div');
      wurzel.className = 'viz-platzhalter-wurzel';

      const werkzeugleiste = document.createElement('div');
      werkzeugleiste.className = 'viz-platzhalter-werkzeugleiste';
      const filterContainer = document.createElement('div');
      const infoContainer = document.createElement('div');
      werkzeugleiste.append(filterContainer, infoContainer);

      const flaechenContainer = document.createElement('div');
      flaechenContainer.className = 'viz-platzhalter-flaeche';

      wurzel.append(werkzeugleiste, flaechenContainer);
      container.appendChild(wurzel);

      // Info-Button/Filterleiste/Sidebar-Gerüst werden EINMALIG hier in
      // render() aufgebaut, nicht bei jedem resize() neu erzeugt - dieselbe
      // Konvention wie bei den echten Urkunden-Modulen (siehe z.B.
      // kalenderHeatmap.js' Kommentar zum Info-Button: ein Neuaufbau bei
      // jedem Redraw würde infoButton.js' document-Listener (Außerhalb-
      // Klick/Escape) unnötig oft an-/abmelden und den Filterleisten-
      // Sucheingabe-Zustand bei jedem Resize verwerfen).
      const filterleiste = erzeugeFilterleiste(filterContainer, {
        suchPlaceholder,
        kategorien: ermittleKategorien(data),
        onChange: () => {} // noch nichts zu filtern - Infrastruktur bewusst bereits verdrahtet, siehe Dateikopf-Kommentar
      });
      const infoButton = erzeugeInfoButton(infoContainer, {
        text: infoText,
        ariaLabel: `Erklärung zu ${titel}`
      });
      const sidebar = baueSidebarGeruest(container);
      sidebar.schliessenBtn.addEventListener('click', () => schliesseSidebar(sidebar, wurzel));

      instanz = { container, wurzel, flaechenContainer, filterleiste, infoButton, sidebar, records: data, options };
      zeichneFlaeche();
    },

    resize(neueOptionen = {}) {
      if (!instanz) return;
      instanz.options = { ...instanz.options, ...neueOptionen };
      zeichneFlaeche();
    },

    destroy() {
      if (!instanz) return;
      instanz.filterleiste.destroy();
      instanz.infoButton.destroy(); // entfernt insb. dessen document-Click-/Keydown-Listener
      instanz.container.innerHTML = '';
      instanz = null;
    }
  };
}
