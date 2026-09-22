// js/core/ansichtWechseln.js
// "Ansicht wechseln"-Bauteil (Abschnitt 4.1/4.2/5): Auswahlliste der für den
// aktuellen Kontext verfügbaren Ansichten. Bei bis zu 26 möglichen Ansichten (siehe
// js/config/archivalienRegistry.js) als Dropdown statt Cycle-Button umgesetzt, auf
// ausdrücklichen Wunsch.
//
// Übernimmt beim Wechsel: destroy() der aktuellen Visualisierung, dann render() der
// neuen; filter-Zustand aus state.js bleibt unangetastet (kontext-erhaltender
// Wechsel, Abschnitt 4.2 - dieses Bauteil greift dafür gar nicht erst ein);
// unsicherheitModusAktiv wird zurückgesetzt (Abschnitt 11).
//
// Weiß selbst nichts über dynamischen Import oder Datenladen - options.ladeModulUndRender
// übernimmt das (in Teil C: echter import() + render(); im isolierten Test: ein
// Dummy). So bleibt dieses Bauteil unabhängig von den 31 echten Modulen testbar.

import { setUnsicherheitModus } from './state.js';

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .ansicht-wechseln select { min-height: 44px; font: inherit; padding: 4px 8px; }
  `;
  container.appendChild(style);
}

export function erzeugeAnsichtWechseln(container, { ansichten, aktuelleAnsichtId, ladeModulUndRender }) {
  container.innerHTML = '';
  fuegeStyleEin(container);

  const wrapper = document.createElement('div');
  wrapper.className = 'ansicht-wechseln';

  const label = document.createElement('label');
  label.textContent = 'Ansicht: ';
  const auswahl = document.createElement('select');
  auswahl.setAttribute('aria-label', 'Ansicht wechseln');
  ansichten.forEach((ansicht) => {
    const option = document.createElement('option');
    option.value = ansicht.id;
    option.textContent = ansicht.label;
    auswahl.appendChild(option);
  });
  auswahl.value = aktuelleAnsichtId;
  label.appendChild(auswahl);
  wrapper.appendChild(label);
  container.appendChild(wrapper);

  let aktuellesModul = null;
  let wirdGewechselt = false;

  // Auch programmatisch aufrufbar (z.B. von router.js bei einer URL-Änderung,
  // Teil C) - synchronisiert dabei die Dropdown-Anzeige immer mit.
  //
  // BUGFIX ("Info-Button-Absturz in Kalender-Heatmap + robusteres Routing",
  // Teil B, siehe CHANGELOG): wirdGewechselt wurde zuvor nur im
  // Erfolgspfad (letzte Zeile) zurückgesetzt - warf destroy() oder
  // ladeModulUndRender() eines Moduls eine Exception (z.B. der
  // kalenderHeatmap.js-Absturz aus Teil A, aber grundsätzlich JEDES
  // künftige Modul), blieb wirdGewechselt für den Rest der Sitzung auf
  // `true` hängen - jeder weitere Dropdown-Wechsel brach seitdem sofort am
  // Guard oben ab (Zeile "if (!eintrag || wirdGewechselt) return;"), ohne
  // sichtbare Reaktion. Das äußere try/finally garantiert jetzt, dass
  // wirdGewechselt IMMER zurückgesetzt wird, unabhängig davon, ob/wo ein
  // Fehler auftritt. Das innere try/finally um destroy() sorgt zusätzlich
  // dafür, dass `aktuellesModul` auch bei einem werfenden destroy() auf
  // `null` gesetzt wird UND dass anschließend trotzdem versucht wird, das
  // NEUE Ziel zu laden/rendern (Zeile "aktuellesModul = await
  // ladeModulUndRender(eintrag);" läuft weiter) - ein kaputtes altes Modul
  // blockiert damit nicht auch noch den Wechsel zu einem funktionierenden
  // neuen Ziel. Die Exception selbst wird bewusst NICHT geschluckt (kein
  // catch, nur finally) - sie bleibt weiterhin als Konsolenfehler sichtbar,
  // nur der App-Zustand bleibt zusätzlich funktionsfähig.
  async function wechsleZu(ansichtId) {
    const eintrag = ansichten.find((a) => a.id === ansichtId);
    if (!eintrag || wirdGewechselt) return;
    wirdGewechselt = true;
    auswahl.value = ansichtId;

    try {
      if (aktuellesModul) {
        try {
          aktuellesModul.destroy();
        } finally {
          aktuellesModul = null;
        }
      }
      setUnsicherheitModus(false); // Abschnitt 11: schaltet sich bei Ansichtswechsel automatisch aus

      aktuellesModul = await ladeModulUndRender(eintrag);
    } finally {
      wirdGewechselt = false;
    }
  }

  auswahl.addEventListener('change', (event) => wechsleZu(event.target.value));

  return {
    wechsleZu,
    destroy() {
      if (aktuellesModul) {
        aktuellesModul.destroy();
        aktuellesModul = null;
      }
      container.innerHTML = '';
    }
  };
}
