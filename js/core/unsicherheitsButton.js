// js/core/unsicherheitsButton.js
// Unsicherheits-Button (Abschnitt 5/11): schaltet state.unsicherheitModusAktiv um
// und löst über options.onToggle ein Neu-Rendern der aktuellen Visualisierung mit
// angepasstem options.showUncertainty aus.
//
// ARCHITEKTUR-KLARSTELLUNG, bitte bestätigen: Das "Hintergrund abdunkeln, unsichere
// Elemente bleiben hell" aus Abschnitt 11 ist NICHT etwas, das dieser Button über
// eine generische Overlay-Ebene von außen erzeugen kann - Abschnitt 11 selbst sagt,
// die Kennzeichnung erfolgt "gezielt auf das jeweils betroffene Feld/Element",
// also INNERHALB jeder einzelnen Visualisierung. Dieser Button toggelt daher nur
// Zustand + Beschriftung und löst das Neu-Rendern aus - das eigentliche
// Dimmen/Hervorheben entsteht erst in Teil B, wenn alle 31 Module
// options.showUncertainty selbst auswerten. Vor Teil B ändert sich durch einen
// Klick optisch nur der Button selbst, noch keine Visualisierung.
//
// Baustein-Muster (Abschnitt 5): eine Funktion erzeugt den Baustein und gibt die
// zugehörigen Handgriffe zurück.

import { toggleUnsicherheitModus, getZustand } from './state.js';

export function erzeugeUnsicherheitsButton(container, { onToggle } = {}) {
  container.innerHTML = '';

  const button = document.createElement('button');
  button.type = 'button';
  button.style.minHeight = '44px';
  button.style.minWidth = '44px';
  button.setAttribute('aria-pressed', 'false');

  function aktualisiereBeschriftung(aktiv) {
    button.setAttribute('aria-pressed', String(aktiv));
    button.textContent = aktiv ? 'Unsicherheiten ausblenden' : 'Unsicherheiten anzeigen';
  }
  aktualisiereBeschriftung(false);

  button.addEventListener('click', () => {
    toggleUnsicherheitModus();
    const aktiv = getZustand().unsicherheitModusAktiv;
    aktualisiereBeschriftung(aktiv);
    if (onToggle) onToggle(aktiv);
  });

  container.appendChild(button);

  return {
    // Für den Ansichtswechsel (Abschnitt 11: schaltet sich automatisch aus).
    // ansichtWechseln.js setzt state.js selbst zurück (Zugriffsregel Abschnitt 7 -
    // jedes Modul darf state.js' Funktionen direkt aufrufen); diese Methode hält
    // nur die Button-eigene Anzeige (Beschriftung/aria-pressed) synchron dazu, ohne
    // den Zustand ein zweites Mal zu verändern.
    setzeZurueck() {
      aktualisiereBeschriftung(false);
    },
    destroy() {
      container.innerHTML = '';
    }
  };
}
