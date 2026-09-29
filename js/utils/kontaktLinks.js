// js/utils/kontaktLinks.js
// Korrektur zu Paket 2 (Punkt 3, Nutzer-Freigabe): Telefon/E-Mail/Website
// im Kontaktbereich der Startseite (startseite.js) UND der Über-Seite
// (ueberSeite.js) waren bislang nur durch die Akzentfarbe als Links
// erkennbar - ein kleines, eingebettetes SVG-Symbol (aria-hidden, Farbe
// über currentColor, also automatisch passend zum jeweiligen Hintergrund)
// macht sie zusätzlich formal erkennbar. Beide Module nutzten vorher
// eigenen, fast identischen Code für dieselben drei Linktypen - hier gemäß
// Auftrag ("am besten über eine gemeinsame Funktion") zu einem einzigen
// Baustein zusammengeführt.
//
// Icons sind bewusst selbst gezeichnete, einfache geometrische Formen
// (Kreis/Rechteck/Pfad aus wenigen Segmenten) im selben Stil wie
// js/utils/vizIcons.js - KEINE externe Icon-Bibliothek (Nicht-Ziel laut
// Auftrag), keine externe Anfrage (rein inline erzeugt).

const IKONEN = {
  telefon: '<path d="M6.6 3.5h2.4l1.5 3.6-1.6 1.3c1 2.3 2.8 4.1 5.1 5.1l1.3-1.6 3.6 1.5v2.4a1.6 1.6 0 0 1-1.7 1.6C11.3 17 6.8 12.5 6 6.6c-.1-.9.6-1.6 1.5-1.6z"/>',
  email: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="M4.5 7l7.5 6 7.5-6"/>',
  website: '<circle cx="12" cy="12" r="8.5"/><line x1="3.5" y1="12" x2="20.5" y2="12"/><path d="M12 3.5c2.6 2.6 2.6 14.4 0 17"/><path d="M12 3.5c-2.6 2.6-2.6 14.4 0 17"/>'
};

function erzeugeKontaktIcon(typ) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.classList.add('kontakt-link-icon');
  svg.innerHTML = IKONEN[typ] || '';
  return svg;
}

// typ: 'telefon' | 'email' | 'website' (bestimmt Icon).
// optionen.neuesFenster: true bei website (target=_blank/rel=noopener),
// dieselbe Konvention wie bisher in startseite.js/ueberSeite.js.
export function erzeugeKontaktLink(typ, href, text, optionen = {}) {
  const link = document.createElement('a');
  link.className = 'kontakt-link';
  link.href = href;
  if (optionen.neuesFenster) {
    link.target = '_blank';
    link.rel = 'noopener';
  }
  link.appendChild(erzeugeKontaktIcon(typ));
  const textSpan = document.createElement('span');
  textSpan.textContent = text;
  link.appendChild(textSpan);
  return link;
}
