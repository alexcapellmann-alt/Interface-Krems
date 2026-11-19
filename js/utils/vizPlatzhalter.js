// js/utils/vizPlatzhalter.js – Fabrik für Ansichten mit vollständiger Schnittstelle, aber ohne Inhalt
// Schnittstelle: baueVizPlatzhalterModul({ … }) → { render, resize, destroy } mit echtem Info-Knopf, Filterleiste und
//   leerem Seitenleisten-Gerüst.
// Stand 19.11.2026: von keiner Datei mehr importiert (alle Bereiche haben echte Ansichten); Entscheidung über Entfernen
//   offen. Hintergrund: docs/MODULNOTIZEN.md, Abschnitt vizPlatzhalter.js.

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
        onChange: () => {} // noch nichts zu filtern - Infrastruktur bewusst bereits verdrahtet, siehe docs/MODULNOTIZEN.md
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
