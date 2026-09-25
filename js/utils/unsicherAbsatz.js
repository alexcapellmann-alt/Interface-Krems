// js/utils/unsicherAbsatz.js
// AUFTRAG "Teil 2g", Punkt 1: EINE gemeinsame Komponente fuer den
// aufklappbaren "σ Angaben unsicher"-Hinweis - vormals lokal in
// js/fuehrungen/belegDarstellung.js definiert (K3, Teil 2c: eingeklappter
// Button statt fett/rotem Absatz, eigene ruhige Warnfarbe statt `--unsicher`/
// `--fuehrung-fehler`). Jetzt hierher verschoben und zusaetzlich von
// js/utils/sidebar.js/js/viz/personenliste.js genutzt (Auftrag woertlich:
// "Keine zweite, abweichende Umsetzung") - ersetzt dort das bisherige
// "Achtung: Angaben unsicher..." in Rot/Fett (`.bestand-sidebar-unsicher`).
// Verhalten (Maus/Touch/Tastatur ueber ein natives <button>, `aria-expanded`,
// Start eingeklappt) unveraendert aus der urspruenglichen Fuehrungen-Fassung.

import { UNSICHERHEIT_SYMBOL } from '../config/constants.js';

function alsText(wert) {
  return Array.isArray(wert) ? wert.join('; ') : (wert || '');
}

// record: der rohe, bereits von dataLoader.js aufbereitete Datensatz (jedes
// `<feld>_unsicher` ist dort bereits ein Boolean, siehe dortiger Kommentar).
// unsicherFelder: Liste der `_unsicher`-Feldnamen, die fuer DIESEN Belegtyp
// gelten (je Aufrufer verschieden, siehe jeweilige Aufrufstelle) - zusaetzlich
// gilt ein befuellter `unsicherheit_anmerkung` immer als unsicher, auch ohne
// gesetztes `_unsicher`-Feld.
export function baueUnsicherheitAbsatz(record, unsicherFelder) {
  const istUnsicher = unsicherFelder.some((f) => record[f]) || Boolean(alsText(record.unsicherheit_anmerkung).trim());
  if (!istUnsicher) return null;
  const wrapper = document.createElement('div');
  wrapper.className = 'unsicher-absatz';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'unsicher-absatz-btn';
  btn.textContent = `${UNSICHERHEIT_SYMBOL} Angaben unsicher`;
  btn.setAttribute('aria-expanded', 'false');
  const text = document.createElement('p');
  text.className = 'unsicher-absatz-text';
  text.hidden = true;
  text.textContent = alsText(record.unsicherheit_anmerkung) || 'Keine weitere Angabe.';
  btn.addEventListener('click', () => {
    const offen = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!offen));
    text.hidden = offen;
  });
  wrapper.append(btn, text);
  return wrapper;
}
