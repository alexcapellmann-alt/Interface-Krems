// js/utils/lichtAusDarstellung.js
// Auftrag 13 (Stufe B): gemeinsame Kennzeichnung der Pilotmodule im Modus „Licht aus“ (Klassen und data-muster; das
// Aussehen steht in css/components.css, Abschnitt „Licht aus“). Die Logik (was leuchtet) steht in js/utils/lichtAus.js.
import { MUSTER_JE_AUSPRAEGUNG, MUSTER_VORRANG } from '../config/lichtAus.js';
import { vorrangigeAuspraegung, musterFuer } from './lichtAus.js';

export const LICHT_KLASSE = 'lichtaus-licht';
export const GEDIMMT_KLASSE = 'lichtaus-gedimmt';

export function musterAus(auspraegungen) {
  return musterFuer(vorrangigeAuspraegung(auspraegungen, MUSTER_VORRANG), MUSTER_JE_AUSPRAEGUNG);
}

// Element leuchtet (an = true) oder ist gedimmt; `null` entfernt beides (Modus aus)
export function setzeLicht(element, an) {
  if (!element) return;
  element.classList.toggle(LICHT_KLASSE, an === true);
  element.classList.toggle(GEDIMMT_KLASSE, an === false);
}

// Muster am betroffenen Feld (Datum, Orte, Personen …) bzw. am ganzen Element
export function setzeMuster(element, auspraegungen) {
  if (!element) return null;
  const muster = auspraegungen?.length ? musterAus(auspraegungen) : null;
  element.classList.toggle('lichtaus-feld', Boolean(muster));
  if (muster) element.dataset.muster = muster; else delete element.dataset.muster;
  return muster;
}

// Kurzbeschreibung für Bildschirmleser („Datierung ungenau; Ortsangabe mehrdeutig“), aus den Anzeigenamen
export function beschreibeEintraege(eintraege, typName, auspraegungName) {
  const teile = [];
  for (const e of eintraege) {
    const t = `${typName(e.typ)} ${auspraegungName(e.auspraegung)}`;
    if (!teile.includes(t)) teile.push(t);
  }
  return teile.join('; ');
}
