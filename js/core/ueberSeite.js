// js/core/ueberSeite.js
// AUFTRAG "Archivspezifische Texte und Identität in CSV-Dateien", Punkt 2.6:
// ersetzt den bisherigen renderPlatzhalterTab('ueber', ...)-Aufruf in
// js/core/app.js. Stellt die Blöcke aus data/ueber.csv dar (ebene 1 als
// Zwischenüberschrift, ebene 2 als Unterpunkt), gefolgt von einem
// Kontaktblock aus data/archiv.csv. Gestaltung: ruhige Textseite mit
// begrenzter Zeilenlänge, dieselbe Typografie wie der Rest des Interfaces
// (keine eigenen Fonts/Farben - nur Layout/Breite in css/base.css ergänzt,
// siehe dortiger Kommentar).
//
// Baustein-Muster wie startseite.js: async, gibt {destroy()} zurück.

import { ladeSeitenBloecke, konfigurationswert } from './archivKonfiguration.js';
import { UNSICHERHEIT_SYMBOL } from '../config/constants.js';
import { erzeugeKontaktLink } from '../utils/kontaktLinks.js';

const UEBER_CSV = 'data/ueber.csv';

// Punkt 2.6: "Das σ im Text wird wie im übrigen Interface dargestellt,
// falls dafür eine gemeinsame Konstante existiert" - UNSICHERHEIT_SYMBOL
// (js/config/constants.js) ist genau diese Konstante. Zerlegt einen
// Absatz-String an jedem Vorkommen des Symbols und baut ihn als Fragment
// mit einem eigens dafür gestylten <span> wieder zusammen (dieselbe
// Warnfarbe wie z.B. js/viz/personenliste.js' `.pl-zeile-unsicher-symbol`,
// hier lokal `.ueber-sigma` genannt, siehe fuegeStyleEin() unten) - bleibt
// dabei Teil des normalen Lesetexts (kein eigenes Icon/aria-hidden), da
// das Zeichen hier innerhalb echter Sätze steht, nicht als separates
// Kennzeichen wie in Tabellenzeilen/Feldern.
function baueAbsatzMitSigma(text) {
  const fragment = document.createDocumentFragment();
  const teile = text.split(UNSICHERHEIT_SYMBOL);
  teile.forEach((teil, i) => {
    if (teil) fragment.appendChild(document.createTextNode(teil));
    if (i < teile.length - 1) {
      const sigma = document.createElement('span');
      sigma.className = 'ueber-sigma';
      sigma.textContent = UNSICHERHEIT_SYMBOL;
      fragment.appendChild(sigma);
    }
  });
  return fragment;
}

function baueBlock(block) {
  const wrapper = document.createElement('section');
  wrapper.className = 'ueber-block';

  const ueberschrift = document.createElement(block.ebene === '2' ? 'h3' : 'h2');
  ueberschrift.className = block.ebene === '2' ? 'ueber-block-h3' : 'ueber-block-h2';
  ueberschrift.textContent = block.titel;
  wrapper.appendChild(ueberschrift);

  const absaetze = Array.isArray(block.text) ? block.text : [block.text];
  absaetze.forEach((absatz) => {
    if (!absatz) return;
    const p = document.createElement('p');
    p.appendChild(baueAbsatzMitSigma(absatz));
    wrapper.appendChild(p);
  });

  return wrapper;
}

function baueKontaktblock() {
  const wrapper = document.createElement('section');
  wrapper.className = 'ueber-block ueber-kontaktblock';

  const ueberschrift = document.createElement('h2');
  ueberschrift.className = 'ueber-block-h2';
  ueberschrift.textContent = 'Kontakt';
  wrapper.appendChild(ueberschrift);

  const adresse = document.createElement('address');
  const name = konfigurationswert('archiv_name');
  const strasse = konfigurationswert('adresse_strasse');
  const ort = konfigurationswert('adresse_ort');
  const zeilen = [name, [strasse, ort].filter(Boolean).join(', ')].filter(Boolean);
  zeilen.forEach((zeile, i) => {
    if (i > 0) adresse.appendChild(document.createElement('br'));
    adresse.appendChild(document.createTextNode(zeile));
  });

  // Korrektur zu Paket 2 (Punkt 3): Icon+Unterstreichung jetzt über die mit
  // startseite.js geteilte erzeugeKontaktLink() (js/utils/kontaktLinks.js).
  const telefon = konfigurationswert('telefon');
  const telefonInternational = konfigurationswert('telefon_international');
  if (telefon) {
    adresse.appendChild(document.createElement('br'));
    adresse.appendChild(erzeugeKontaktLink('telefon', `tel:${telefonInternational}`, telefon));
  }

  const email = konfigurationswert('email');
  if (email) {
    adresse.appendChild(document.createElement('br'));
    adresse.appendChild(erzeugeKontaktLink('email', `mailto:${email}`, email));
  }

  const website = konfigurationswert('website');
  const websiteLink = konfigurationswert('website_link');
  if (website) {
    adresse.appendChild(document.createElement('br'));
    adresse.appendChild(erzeugeKontaktLink('website', websiteLink, website, { neuesFenster: true }));
  }

  wrapper.appendChild(adresse);
  return wrapper;
}

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    /* grid-column:1/-1 ist notwendig, nicht kosmetisch: #app-content ist ein
       Grid mit grid-template-columns:auto auto 1fr (layout.css) - ohne
       diese Regel landet .ueber-wurzel per Grid-Auto-Placement allein in der
       ersten, auf den Inhalt geschrumpften auto-Spalte. Diese Spalte ist
       dann exakt so breit wie max-width selbst, wodurch margin:auto keinen
       Freiraum zum Verteilen hat und der Block links klebt (live geprüft:
       grid-template-columns wurde dadurch "706.6px 0px 246.4px" statt einer
       vollbreiten Spur). .viz-inhalt/.platzhalter-seite nutzen exakt
       dasselbe grid-column:1/-1 aus demselben Grund. */
    .ueber-wurzel { grid-column: 1 / -1; max-width: 70ch; margin: 0 auto; padding: var(--space-5) var(--space-4); }
    .ueber-block { margin-bottom: var(--space-5); }
    .ueber-block-h2 { margin-top: var(--space-5); }
    .ueber-block-h3 { margin-top: var(--space-4); font-size: var(--fs-md); }
    .ueber-block p { margin: 0 0 var(--space-3) 0; }
    .ueber-sigma { color: var(--fuehrung-unsicher, #8a6d1f); font-weight: 700; }
    .ueber-kontaktblock address { font-style: normal; }
    .ueber-kontaktblock a { color: var(--accent); }
  `;
  container.appendChild(style);
}

export async function erzeugeUeberSeite(container) {
  const bloecke = await ladeSeitenBloecke(UEBER_CSV);

  container.innerHTML = '';
  container.className = 'ueber-wurzel';
  fuegeStyleEin(container);

  bloecke.forEach((block) => container.appendChild(baueBlock(block)));
  container.appendChild(baueKontaktblock());

  return {
    destroy() {
      container.innerHTML = '';
      container.className = '';
    }
  };
}
