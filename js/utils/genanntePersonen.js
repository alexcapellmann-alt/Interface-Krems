// js/utils/genanntePersonen.js
// AUFTRAG "Teil 2g", Punkt 4+5: EINE gemeinsame Funktion für verlinkte
// Personennamen - von js/fuehrungen/belegDarstellung.js (Punkt 4) UND
// js/viz/regestenKachelraster.js (Punkt 5, Auftrag wörtlich:
// "Wiederverwendung derselben Funktion, keine zweite Umsetzung") genutzt.
// Baut Links zur Personenliste über den bestehenden Datensatzaufruf
// (js/utils/datensatzAufruf.js' baueDatensatzLink('person', id) -> genau
// derselbe `#…?datensatz=person:<id>`-Mechanismus, der schon für den
// bisherigen Archiv-Link existiert) - exakte ID-Übereinstimmung, kein
// Fuzzy-Matching. Ein Eintrag ohne auflösbare ID erscheint als reiner Text
// statt als toter Link (Nicht-Ziel: keine Verlinkung einzelner Wörter im
// Fließtext - das betrifft NUR diese eigene, separate Zeile/Feld, niemals
// den Erzähltext oder den Regest-Fließtext selbst).

import { baueDatensatzLink } from './datensatzAufruf.js';
import { UNSICHERHEIT_SYMBOL } from '../config/constants.js';

// personen: [{name, id}] - id darf fehlen (dann reiner Text statt Link).
// Gibt ein <span>-Fragment mit den (ggf. verlinkten) Namen, durch ", "
// getrennt, zurück - roh, ohne umschließendes Label/Feld (siehe
// baueGenanntePersonenZeile() unten für die vollständige, beschriftete
// Zeile).
//
// AUFTRAG "Teil 2i": Beschriftung zentral hier festgelegt ("Personen" -
// ersetzt die vormals separate, unverlinkte "Personen"-Zeile an jeder
// Aufruferstelle vollständig, statt wie in 2g als ZUSÄTZLICHE "Genannte
// Personen"-Zeile danebenzustehen). Aufrufer ändern hierfür nichts an der
// Beschriftung selbst.
export function baueVerlinkteNamen(personen) {
  const fragment = document.createDocumentFragment();
  const eintraege = (personen || []).filter((p) => p && p.name);
  eintraege.forEach((person, i) => {
    if (i > 0) fragment.appendChild(document.createTextNode(', '));
    const href = person.id ? baueDatensatzLink('person', person.id) : null;
    if (href) {
      const link = document.createElement('a');
      link.className = 'genannte-personen-link';
      link.href = href;
      link.textContent = person.name;
      fragment.appendChild(link);
    } else {
      fragment.appendChild(document.createTextNode(person.name));
    }
  });
  return fragment;
}

// Vollständige, beschriftete "Personen: …"-Zeile (ursprünglich Punkt 4/5,
// Auftrag wörtlich: "als eigene Zeile unter dem Regest"; Beschriftung seit
// Teil 2i "Personen" statt "Genannte Personen" - ersetzt die vormals
// separate, unverlinkte "Personen"-Zeile, statt daneben zu stehen).
// `unsicher`
// (z. B. `record.personen_unsicher`) hängt ein σ mit zugänglicher
// Bezeichnung an - dieselbe Konvention wie die übrigen σ-Verwendungen
// (aria-hidden am Symbol selbst, Bedeutung über das umgebende `aria-label`
// des Elternelements... hier stattdessen ein eigenes `aria-label` auf dem
// Symbol-Span selbst, da kein umgebendes Element eine zugängliche
// Beschriftung liefert).
export function baueGenanntePersonenZeile(personen, { unsicher = false } = {}) {
  const eintraege = (personen || []).filter((p) => p && p.name);
  if (eintraege.length === 0) return null;
  const absatz = document.createElement('p');
  absatz.className = 'genannte-personen';
  absatz.appendChild(document.createTextNode('Personen: '));
  absatz.appendChild(baueVerlinkteNamen(eintraege));
  if (unsicher) {
    const symbol = document.createElement('span');
    symbol.className = 'genannte-personen-unsicher';
    symbol.setAttribute('aria-label', 'Personenangaben unsicher');
    symbol.textContent = ` ${UNSICHERHEIT_SYMBOL}`;
    absatz.appendChild(symbol);
  }
  return absatz;
}
