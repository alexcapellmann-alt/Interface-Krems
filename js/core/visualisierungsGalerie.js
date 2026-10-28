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
import { BESTAND_PALETTE, passendeTextfarbe } from '../utils/kategorieFarben.js';

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
    /* Bildschirmfüllende Variante (Wunsch des Autors, 2026-10-28; Urkunden, Personen, Orte): Kacheln teilen
       sich die ganze Fläche wie die Themen der Führungen, gefärbt mit der Palette der Bestand-Ansichten.
       Raster aus doppelt so vielen Spalten wie Kacheln je Zeile, jede Kachel belegt zwei - so lässt sich
       eine kürzere letzte Zeile mittig setzen (5 Kacheln: 3 + 2). */
    .galerie-bereich.galerie-vollflaechig { display: flex; flex-direction: column; min-height: 0; }
    .galerie-vollflaechig .visualisierungs-galerie { flex: 1 1 auto; min-height: 0; gap: var(--space-4);
      grid-template-columns: repeat(var(--galerie-spalten), minmax(0, 1fr)); grid-template-rows: repeat(var(--galerie-zeilen), minmax(0, 1fr)); }
    .galerie-vollflaechig .visualisierungs-galerie > li { grid-column: span 2; display: flex; min-height: 0; }
    .galerie-vollflaechig .visualisierungs-galerie button { height: 100%; justify-content: flex-end; gap: var(--space-3);
      padding: var(--space-5); border: 0; border-radius: calc(var(--radius) * 1.5); background: var(--kachel-farbe);
      color: var(--kachel-text); box-shadow: var(--shadow); transition: filter .15s ease, transform .15s ease; }
    .galerie-vollflaechig .visualisierungs-galerie button:hover { background: var(--kachel-farbe); border-color: transparent;
      filter: brightness(1.12); transform: translateY(-2px); }
    .galerie-vollflaechig .visualisierungs-galerie button:focus-visible { outline: 3px solid #e0b429; outline-offset: 3px; }
    .galerie-vollflaechig .visualisierungs-galerie-icon { color: inherit; opacity: .85; margin-bottom: auto; }
    .galerie-vollflaechig .visualisierungs-galerie-icon svg { width: 96px; height: 66px; }
    .galerie-vollflaechig .visualisierungs-galerie-name { font-family: var(--font-heading); font-size: var(--fs-xl); font-weight: 600; }
    .galerie-vollflaechig .visualisierungs-galerie-beschreibung { color: inherit; opacity: .9; font-size: var(--fs-md); max-width: 46ch; }
    @media (max-width: 700px) {
      .galerie-vollflaechig .visualisierungs-galerie { grid-template-columns: 1fr; grid-template-rows: none; }
      .galerie-vollflaechig .visualisierungs-galerie > li { grid-column: auto !important; min-height: 160px; }
    }
  `;
  container.appendChild(style);
}

// options.archivalientyp: der vollständige Registry-Eintrag (liefert Label +
// `ansichten`, jede mit `id`/`label`/`beschreibung`).
// options.onAuswahl(ansichtEintrag): bei Klick auf eine Kachel aufgerufen.
// options.vollflaechig (2026-10-28): Kacheln füllen die ganze Fläche, farbig (siehe Style oben).
export function erzeugeVisualisierungsGalerie(container, { archivalientyp, onAuswahl, vollflaechig = false } = {}) {
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
  const anzahl = archivalientyp.ansichten.length;
  // Zeilen und Kacheln je Zeile so, dass das Raster möglichst ausgewogen ist: bis 3 Kacheln eine Zeile,
  // bis 8 zwei Zeilen, darüber drei
  const zeilen = anzahl <= 3 ? 1 : (anzahl <= 8 ? 2 : 3);
  const proZeile = Math.ceil(anzahl / zeilen);
  container.classList.toggle('galerie-vollflaechig', vollflaechig);
  if (vollflaechig) {
    liste.style.setProperty('--galerie-spalten', String(proZeile * 2));
    liste.style.setProperty('--galerie-zeilen', String(zeilen));
  }

  archivalientyp.ansichten.forEach((ansicht, index) => {
    const eintrag = document.createElement('li');
    const kachel = document.createElement('button');
    kachel.type = 'button';
    if (vollflaechig) {
      const farbe = BESTAND_PALETTE[index % BESTAND_PALETTE.length];
      kachel.style.setProperty('--kachel-farbe', farbe);
      kachel.style.setProperty('--kachel-text', passendeTextfarbe(farbe));
      // kürzere letzte Zeile mittig: deren erste Kachel um die fehlenden Kacheln einrücken
      const rest = anzahl - (zeilen - 1) * proZeile;
      if (index === (zeilen - 1) * proZeile && rest < proZeile) eintrag.style.gridColumn = `${proZeile - rest + 1} / span 2`;
    }

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
