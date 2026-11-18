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
import { lesbareAnmerkung, leseUnsicherheitTypen, feldBezeichnung } from './uncertainty.js';
import { typName, auspraegungName, standardText } from '../core/unsicherheitVokabular.js'; // Auftrag 13
import { baueVorschlagFormular, baueVorschlagAufklapper } from '../beteiligung/vorschlagFormular.js';

// Standardtexte für Felder mit Typ, zu denen die Anmerkung nichts sagt (Feldname wie in lesbareAnmerkung übersetzt)
function standardtexteOhneAnmerkung(record, datei) {
  if (!datei) return [];
  const mitAnmerkung = new Set((Array.isArray(record.unsicherheit_anmerkung) ? record.unsicherheit_anmerkung : [record.unsicherheit_anmerkung])
    .map((a) => /^\s*([^:]+):/.exec(String(a || ''))?.[1].trim().toLowerCase()).filter(Boolean));
  return leseUnsicherheitTypen(record.unsicherheit_typ)
    .filter((e) => !mitAnmerkung.has(e.feld.toLowerCase()))
    .map((e) => ({ feld: e.feld, text: standardText(datei, e.feld, e.auspraegung) }))
    .filter((e) => e.text)
    .map((e) => `${feldBezeichnung(e.feld)}: ${e.text}`);
}

function alsText(wert) {
  return Array.isArray(wert) ? wert.join('; ') : (wert || '');
}

// record: der rohe, bereits von dataLoader.js aufbereitete Datensatz (jedes
// `<feld>_unsicher` ist dort bereits ein Boolean, siehe dortiger Kommentar).
// unsicherFelder: Liste der `_unsicher`-Feldnamen, die fuer DIESEN Belegtyp
// gelten (je Aufrufer verschieden, siehe jeweilige Aufrufstelle) - zusaetzlich
// gilt ein befuellter `unsicherheit_anmerkung` immer als unsicher, auch ohne
// gesetztes `_unsicher`-Feld.
// vorschlag (optional, Partizipations-Modul, Wunsch des Autors 2026-10-27): Bezug fuer das
// Vorschlagsformular (siehe js/beteiligung/vorschlagFormular.js). Ist der Datensatz unsicher,
// erscheint das Formular im aufgeklappten Feld unter der Anmerkung; sonst liefert die Funktion
// statt null einen eigenen Knopf „Änderung vorschlagen“. Ohne `vorschlag` (Fuehrungen) wie bisher.
// datei (optional, seit 18.11.2026): Name der Datendatei; dann ergänzt der Absatz für Felder mit Typ, aber ohne eigene
// Erklärung, den Standardtext aus data/unsicherheit_standardtexte.csv.
export function baueUnsicherheitAbsatz(record, unsicherFelder, { vorschlag, datei } = {}) {
  const istUnsicher = unsicherFelder.some((f) => record[f]) || Boolean(alsText(record.unsicherheit_anmerkung).trim());
  if (!istUnsicher) return vorschlag ? baueVorschlagAufklapper(vorschlag) : null;
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
  text.textContent = [lesbareAnmerkung(record.unsicherheit_anmerkung, '; '), ...standardtexteOhneAnmerkung(record, datei)].filter(Boolean).join('; ')
    || 'Keine weitere Angabe.';
  // Auftrag 13: Detailansicht unverändert, ergänzt um Typ und Ausprägung je Feld (Anzeigenamen aus den Datendateien)
  const typen = leseUnsicherheitTypen(record.unsicherheit_typ);
  const typText = typen.length
    ? `Art der Unsicherheit: ${typen.map((e) => `${feldBezeichnung(e.feld)}: ${typName(e.typ)}, ${auspraegungName(e.auspraegung)}`).join('; ')}.`
    : '';
  const form = vorschlag ? baueVorschlagFormular(vorschlag) : null;
  if (form) form.hidden = true;
  btn.addEventListener('click', () => {
    const offen = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!offen));
    text.hidden = offen;
    if (form) form.hidden = offen;
  });
  wrapper.append(btn, text);
  if (typText) {
    const typAbsatz = document.createElement('p');
    typAbsatz.className = 'unsicher-absatz-text unsicher-absatz-typ';
    typAbsatz.hidden = true;
    typAbsatz.textContent = typText;
    btn.addEventListener('click', () => { typAbsatz.hidden = btn.getAttribute('aria-expanded') !== 'true'; });
    wrapper.append(typAbsatz);
  }
  if (form) wrapper.append(form);
  return wrapper;
}
