// js/utils/unsicherheitHinweis.js
// AUFTRAG "Führungen, Teil 2a", Punkt 5: wiederverwendbarer ⚠-Button mit
// anker-verankertem Popup-Fenster für einen redaktionellen
// unsicherheit_hinweis-Text (js/fuehrungen/*.js, Erzählbereich). Bewusst
// eine EIGENE, neue Utility statt einer der sieben bestehenden lokalen
// `WARN_SYMBOL`-Kopien (circlePacking.js/familienbaum.js/ganttDiagramm.js/
// icicle.js/regestenKachelraster.js/sunburst.js/treemap.js) - eine
// nachträgliche Zusammenführung dieser sieben Module auf DIESE Utility ist
// explizit NICHT Teil dieses Auftrags (Nicht-Ziel), nur als offener Punkt im
// PROJEKTLOG vermerkt.
//
// AUFTRAG "Teil 2f", Punkt 1: die oben erwähnte Zusammenführung ist jetzt
// (in Gegenrichtung) trotzdem erfolgt - nicht indem diese Utility die
// sieben Module übernimmt, sondern indem ALLE (auch diese Datei) dieselbe
// zentrale Konstante `UNSICHERHEIT_SYMBOL` aus config/constants.js
// importieren, statt weiter eigene ⚠-Zeichenliterale zu pflegen.
//
// Optisch bewusst vom blauen Info-Button (js/utils/infoButton.js)
// unterschieden (eigene Klasse/Farbe, siehe fuegeUnsicherheitHinweisStyleEin()
// in css/components.css) - beide sind runde Buttons mit Popup, aber
// unterschiedlicher Bedeutung (Info: Erklärung der Ansicht: Unsicherheit:
// redaktionelle Einordnung einer einzelnen Station).

import { UNSICHERHEIT_SYMBOL } from '../config/constants.js';

let offeneInstanz = null;

function schliesse(instanz) {
  if (!instanz.offen) return;
  instanz.offen = false;
  instanz.panel.hidden = true;
  instanz.button.setAttribute('aria-expanded', 'false');
  instanz.button.focus();
  document.removeEventListener('keydown', instanz.handleKeydown);
  document.removeEventListener('mousedown', instanz.handleAussenklick);
  if (offeneInstanz === instanz) offeneInstanz = null;
}

function oeffne(instanz) {
  if (offeneInstanz && offeneInstanz !== instanz) schliesse(offeneInstanz);
  instanz.offen = true;
  instanz.panel.hidden = false;
  instanz.button.setAttribute('aria-expanded', 'true');
  document.addEventListener('keydown', instanz.handleKeydown);
  document.addEventListener('mousedown', instanz.handleAussenklick);
  offeneInstanz = instanz;
  instanz.panel.focus();
}

// Erzeugt Button + Panel in `container` (muss selbst `position: relative`
// haben oder bekommen - siehe CSS `.unsicherheit-hinweis-wrapper`). `text`
// ist der rohe `unsicherheit_hinweis`-Wert aus fuehrungen.csv, als reiner
// Text eingefügt (nie innerHTML).
export function erzeugeUnsicherheitHinweis(container, text) {
  const wrapper = document.createElement('div');
  wrapper.className = 'unsicherheit-hinweis-wrapper';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'unsicherheit-hinweis-btn';
  button.textContent = `${UNSICHERHEIT_SYMBOL} Was wir nicht wissen`;
  button.setAttribute('aria-expanded', 'false');

  const panel = document.createElement('div');
  panel.className = 'unsicherheit-hinweis-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Was wir nicht wissen');
  panel.tabIndex = -1;
  panel.hidden = true;

  const schliessenBtn = document.createElement('button');
  schliessenBtn.type = 'button';
  schliessenBtn.className = 'unsicherheit-hinweis-schliessen';
  schliessenBtn.setAttribute('aria-label', 'Fenster schließen');
  schliessenBtn.textContent = '×';

  const inhalt = document.createElement('p');
  inhalt.textContent = text;

  panel.append(schliessenBtn, inhalt);
  wrapper.append(button, panel);
  container.appendChild(wrapper);

  const instanz = { button, panel, offen: false };
  instanz.handleKeydown = (event) => { if (event.key === 'Escape') schliesse(instanz); };
  instanz.handleAussenklick = (event) => {
    if (!wrapper.contains(event.target)) schliesse(instanz);
  };

  button.addEventListener('click', () => (instanz.offen ? schliesse(instanz) : oeffne(instanz)));
  schliessenBtn.addEventListener('click', () => schliesse(instanz));

  return {
    element: wrapper,
    destroy: () => {
      schliesse(instanz);
      document.removeEventListener('keydown', instanz.handleKeydown);
      document.removeEventListener('mousedown', instanz.handleAussenklick);
      wrapper.remove();
    }
  };
}
