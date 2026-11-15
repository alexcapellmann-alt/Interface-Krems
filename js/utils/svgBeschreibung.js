// js/utils/svgBeschreibung.js
// Nachbesserung 6, Punkt 12 (Befund 6.6): Diagramme erhalten eine Beschreibung (<desc>) für Hilfsmittel. Der Text kommt
// aus dem Info-Text des Moduls (data/infotexte.csv, erster Absatz), nicht aus dem Programm – so bleibt er
// archivspezifisch austauschbar. Fehlende Rolle und fehlender Name werden auf Wunsch ergänzt, vorhandene nicht ersetzt.

import { infotextFuerModul } from '../core/archivKonfiguration.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function setzeSvgBeschreibung(svgElement, text, { rolle = null, titel = null } = {}) {
  if (!svgElement) return;
  if (rolle && !svgElement.getAttribute('role')) svgElement.setAttribute('role', rolle);
  if (titel && !svgElement.getAttribute('aria-label') && !svgElement.getAttribute('aria-labelledby') && !svgElement.querySelector(':scope > title')) {
    svgElement.setAttribute('aria-label', titel);
  }
  const t = String(text || '').trim();
  if (!t) return;
  let desc = svgElement.querySelector(':scope > desc');
  if (!desc) {
    desc = document.createElementNS(SVG_NS, 'desc');
    svgElement.insertBefore(desc, svgElement.firstChild);
  }
  desc.textContent = t;
}

// Beschreibung aus dem ersten Absatz des Info-Texts; ohne Eintrag bleibt das SVG ohne <desc> (die Konsole nennt den
// fehlenden Eintrag bereits in infotextFuerModul()).
export async function beschreibeSvgAusInfotext(svgElement, modulId, optionen = {}) {
  const cfg = await infotextFuerModul(modulId).catch(() => null);
  const ersterAbsatz = String(cfg?.text || '').split(/\n\s*\n/)[0];
  if (svgElement?.isConnected !== false) setzeSvgBeschreibung(svgElement, ersterAbsatz, optionen);
}
