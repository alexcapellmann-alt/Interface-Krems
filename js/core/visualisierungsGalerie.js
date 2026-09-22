// js/core/visualisierungsGalerie.js
// AUFTRAG "Navigation – Permanente Bereichs-Leiste & Visualisierungs-Galerie
// (Pilot: Urkunden)", Punkt 2: Übersichtsseite für einen Bereich, die jede
// seiner Visualisierungen als Kachel zeigt (Name, Kurz-Erklärtext, Icon,
// siehe archivalienRegistry.js' `beschreibung`-Feld bzw. vizIcons.js) - ersetzt
// für Bereiche mit `hatGalerie:true` (aktuell nur Urkunden, Pilot) den
// bisherigen automatischen Sprung zur Primäransicht UND die "Ansicht"-
// Dropdown-Leiste (ansichtWechseln.js) - die Galerie übernimmt deren
// Funktion (Auftrag, wörtlich), siehe app.js für die Verzweigung.
//
// Baustein-Muster (Abschnitt 5): kennt selbst weder router.js noch die
// echten Visualisierungsmodule - options.onAuswahl(ansichtEintrag)
// entscheidet die eigentliche Navigation, diese Datei rendert nur die
// Kacheln. Was ein Kachel-Klick konkret auslöst, entscheidet ausschließlich
// app.js (navigiert zur gewählten Ansicht) - diese Datei muss dafür nichts
// wissen/ändern, unabhängig davon, wie app.js diese Ansicht anschließend
// darstellt (einfacher, stabiler Callback-Vertrag über mehrere Folgeaufträge
// hinweg unverändert geblieben, siehe CHANGELOG (41)/(42)).
//
// Die vormals zweite Funktion dieser Datei, erzeugeGalerieRueckweg() (der
// "Zurück zur Übersicht"-Link innerhalb einer geöffneten Einzel-
// Visualisierung), ist seit AUFTRAG "Visualisierungs-Tab-Leiste statt
// 'Zurück zur Übersicht'-Link" ERSATZLOS entfernt - der Rückweg zur Galerie
// führt seitdem über den festen "Übersicht"-Eintrag in der (permanenten,
// siehe CHANGELOG 42) Tab-Leiste (visualisierungsTabs.js) sowie über einen
// Klick auf den bereits aktiven "Urkunden"-Eintrag in der Bereichs-Leiste
// (bereichsLeiste.js).

import { erzeugeVizIcon } from '../utils/vizIcons.js';

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .visualisierungs-galerie-titel { margin: 0 0 var(--space-3) 0; }
    .visualisierungs-galerie { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-3);
      list-style: none; margin: 0; padding: 0; }
    .visualisierungs-galerie button { display: flex; flex-direction: column; gap: var(--space-2); width: 100%;
      min-height: 44px; padding: var(--space-3); font: inherit; text-align: left; cursor: pointer;
      border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface);
      color: var(--text); transition: border-color .15s ease, background-color .15s ease; }
    .visualisierungs-galerie button:hover { border-color: var(--accent); background: var(--bg); }
    .visualisierungs-galerie button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .visualisierungs-galerie-icon { color: var(--text-muted); }
    .visualisierungs-galerie-icon svg { width: 64px; height: 44px; }
    .visualisierungs-galerie-name { font-weight: 600; }
    .visualisierungs-galerie-beschreibung { font-size: var(--fs-sm); color: var(--text-muted); margin: 0; }
  `;
  container.appendChild(style);
}

// options.archivalientyp: der vollständige Registry-Eintrag (liefert Label +
// `ansichten`, jede mit `id`/`label`/`beschreibung`).
// options.onAuswahl(ansichtEintrag): bei Klick auf eine Kachel aufgerufen.
export function erzeugeVisualisierungsGalerie(container, { archivalientyp, onAuswahl } = {}) {
  container.innerHTML = '';
  fuegeStyleEin(container);

  const titel = document.createElement('h2');
  titel.className = 'visualisierungs-galerie-titel';
  titel.textContent = archivalientyp.label;
  container.appendChild(titel);

  const liste = document.createElement('ul');
  liste.className = 'visualisierungs-galerie';
  liste.setAttribute('role', 'list');
  liste.setAttribute('aria-label', `Visualisierungen: ${archivalientyp.label}`);

  archivalientyp.ansichten.forEach((ansicht) => {
    const eintrag = document.createElement('li');
    const kachel = document.createElement('button');
    kachel.type = 'button';

    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'visualisierungs-galerie-icon';
    iconWrapper.appendChild(erzeugeVizIcon(ansicht.id));

    const name = document.createElement('span');
    name.className = 'visualisierungs-galerie-name';
    name.textContent = ansicht.label;

    const beschreibung = document.createElement('p');
    beschreibung.className = 'visualisierungs-galerie-beschreibung';
    beschreibung.textContent = ansicht.beschreibung || 'Beschreibung folgt.';

    kachel.append(iconWrapper, name, beschreibung);
    kachel.addEventListener('click', () => { if (onAuswahl) onAuswahl(ansicht); });

    eintrag.appendChild(kachel);
    liste.appendChild(eintrag);
  });

  container.appendChild(liste);

  return {
    destroy() {
      container.innerHTML = '';
    }
  };
}
