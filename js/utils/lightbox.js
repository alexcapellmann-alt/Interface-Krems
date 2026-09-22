// js/utils/lightbox.js
// Gemeinsame Foto-Lightbox/Vollbildansicht (Punkt 7, Regesten-Kachelraster-
// Auftrag). Root-Cause-Check vor dem Neubau (siehe CHANGELOG/PROJEKTLOG):
// weder ein Fotoarchiv-Tab/-Modul noch eine bestehende Lightbox-/Dialog-
// Utility existieren im Projekt (`js/utils/*.js` durchsucht, kein Treffer
// außer einer False-Positive-Erwähnung von "Vollbild" in sunburst.js, die
// sich auf die App-Layout-Etappe bezieht, nicht auf Fotos) - dieses Modul
// ist daher neu.
//
// Bewusst allgemein gehalten (Bild-URLs + optionaler Alt-Text als Parameter,
// keine Kenntnis von "Urkunde"/"Regest" o.ä.), damit JEDES künftige Modul mit
// Fotoanzeige es unverändert mitnutzen kann - exakt dasselbe Architekturprinzip
// wie js/utils/tooltip.js (eine einzige geteilte Komponente statt einer
// modul-eigenen Parallel-Implementierung, siehe dortiger Dateikopf-Kommentar)
// und in der Singleton-Bauweise 1:1 an tooltip.js angelehnt: ein einziges,
// lazy erzeugtes Overlay-Element im <body>, über alle Aufrufe hinweg
// wiederverwendet statt pro Öffnung neu erzeugt.

const LIGHTBOX_ID = 'geteilte-lightbox';
const STYLE_ID = 'geteilte-lightbox-style';

let lightboxElement = null;
let bildEl = null;
let zaehlerEl = null;
let schliessenBtn = null;
let vorherigBtn = null;
let naechstesBtn = null;

let bilderListe = [];
let aktuellerIndex = 0;
let fokusVorOeffnen = null;

function fuegeStyleEinmaligEin() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${LIGHTBOX_ID} {
      position: fixed; inset: 0; background: rgba(20, 20, 20, .92); z-index: 2000;
      display: none; align-items: center; justify-content: center; padding: var(--space-5);
    }
    #${LIGHTBOX_ID}.offen { display: flex; }
    #${LIGHTBOX_ID} img {
      max-width: min(90vw, 1100px); max-height: 85vh; display: block;
      border-radius: var(--radius); box-shadow: var(--shadow);
    }
    #${LIGHTBOX_ID} button {
      position: absolute; min-width: 44px; min-height: 44px; border: none; border-radius: 50%;
      background: rgba(255, 255, 255, .15); color: #fff; font-size: 1.5rem; line-height: 1;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background-color .15s ease;
    }
    #${LIGHTBOX_ID} button:hover { background: rgba(255, 255, 255, .3); }
    #${LIGHTBOX_ID} button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
    #${LIGHTBOX_ID} .lightbox-schliessen { top: var(--space-4); right: var(--space-4); }
    #${LIGHTBOX_ID} .lightbox-vorherig { left: var(--space-4); top: 50%; transform: translateY(-50%); }
    #${LIGHTBOX_ID} .lightbox-naechstes { right: var(--space-4); top: 50%; transform: translateY(-50%); }
    #${LIGHTBOX_ID} .lightbox-zaehler {
      position: absolute; bottom: var(--space-4); left: 50%; transform: translateX(-50%);
      color: #fff; background: rgba(0, 0, 0, .5); padding: 2px 10px; border-radius: 99px; font-size: var(--fs-sm);
    }
  `;
  document.head.appendChild(style);
}

function zeigeBild(index) {
  aktuellerIndex = ((index % bilderListe.length) + bilderListe.length) % bilderListe.length;
  const eintrag = bilderListe[aktuellerIndex];
  bildEl.src = eintrag.url;
  bildEl.alt = eintrag.alt || '';

  const mehrereBilder = bilderListe.length > 1;
  vorherigBtn.hidden = !mehrereBilder;
  naechstesBtn.hidden = !mehrereBilder;
  zaehlerEl.hidden = !mehrereBilder;
  if (mehrereBilder) zaehlerEl.textContent = `${aktuellerIndex + 1} / ${bilderListe.length}`;
}

// Escape schließt (Auftrag, wörtlich), Pfeiltasten blättern bei mehreren
// Bildern (Punkt 7: "einfache Navigation... wünschenswert" - siehe
// Dateikopf-Kommentar/CHANGELOG zur Umsetzungsentscheidung). Tab/Shift+Tab
// bleibt innerhalb der sichtbaren Lightbox-Buttons gefangen (Abschnitt 10:
// WCAG-Tastaturzugänglichkeit für Dialoge - ohne Fokus-Falle könnte Tab aus
// dem Overlay heraus auf die verdeckte Seite dahinter springen).
function behandleTastatur(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    schliesseLightbox();
    return;
  }
  if (bilderListe.length > 1 && event.key === 'ArrowLeft') { zeigeBild(aktuellerIndex - 1); return; }
  if (bilderListe.length > 1 && event.key === 'ArrowRight') { zeigeBild(aktuellerIndex + 1); return; }

  if (event.key === 'Tab') {
    const fokussierbar = [schliessenBtn, vorherigBtn, naechstesBtn].filter((el) => !el.hidden);
    if (fokussierbar.length === 0) return;
    const erster = fokussierbar[0];
    const letzter = fokussierbar[fokussierbar.length - 1];
    if (event.shiftKey && document.activeElement === erster) {
      event.preventDefault();
      letzter.focus();
    } else if (!event.shiftKey && document.activeElement === letzter) {
      event.preventDefault();
      erster.focus();
    }
  }
}

function holeOderErstelleLightbox() {
  if (lightboxElement) return lightboxElement;

  fuegeStyleEinmaligEin();

  lightboxElement = document.createElement('div');
  lightboxElement.id = LIGHTBOX_ID;
  lightboxElement.setAttribute('role', 'dialog');
  lightboxElement.setAttribute('aria-modal', 'true');
  lightboxElement.setAttribute('aria-label', 'Foto-Vollansicht');
  lightboxElement.setAttribute('tabindex', '-1');

  // Klick auf den Hintergrund (nicht auf Bild/Buttons) schließt (Auftrag:
  // "Klick außerhalb des Bildes") - geprüft über event.target === das Overlay
  // selbst, da ein Klick auf ein Kindelement (Bild/Button) sonst ebenfalls
  // bis zum Overlay hochblubbert und fälschlich schließen würde.
  lightboxElement.addEventListener('click', (event) => {
    if (event.target === lightboxElement) schliesseLightbox();
  });
  lightboxElement.addEventListener('keydown', behandleTastatur);

  schliessenBtn = document.createElement('button');
  schliessenBtn.type = 'button';
  schliessenBtn.className = 'lightbox-schliessen';
  schliessenBtn.setAttribute('aria-label', 'Lightbox schließen');
  schliessenBtn.textContent = '×';
  schliessenBtn.addEventListener('click', schliesseLightbox);

  vorherigBtn = document.createElement('button');
  vorherigBtn.type = 'button';
  vorherigBtn.className = 'lightbox-vorherig';
  vorherigBtn.setAttribute('aria-label', 'Vorheriges Foto');
  vorherigBtn.textContent = '‹';
  vorherigBtn.addEventListener('click', () => zeigeBild(aktuellerIndex - 1));

  naechstesBtn = document.createElement('button');
  naechstesBtn.type = 'button';
  naechstesBtn.className = 'lightbox-naechstes';
  naechstesBtn.setAttribute('aria-label', 'Nächstes Foto');
  naechstesBtn.textContent = '›';
  naechstesBtn.addEventListener('click', () => zeigeBild(aktuellerIndex + 1));

  bildEl = document.createElement('img');
  bildEl.alt = '';

  zaehlerEl = document.createElement('p');
  zaehlerEl.className = 'lightbox-zaehler';
  zaehlerEl.setAttribute('aria-hidden', 'true'); // Information steckt bereits im alt-Text/aria-label der Navigations-Buttons

  lightboxElement.append(schliessenBtn, vorherigBtn, naechstesBtn, bildEl, zaehlerEl);
  document.body.appendChild(lightboxElement);

  return lightboxElement;
}

// bilder: Array aus Bild-URLs (String) ODER {url, alt}-Objekten (bevorzugt,
// damit die Lightbox denselben Alt-Text wie das angeklickte Vorschaubild
// zeigt). startIndex: welches Bild beim Öffnen zuerst gezeigt wird (Index
// des angeklickten Vorschaufotos innerhalb derselben Liste).
export function oeffneLightbox(bilder, startIndex = 0) {
  if (!bilder || bilder.length === 0) return;
  const lb = holeOderErstelleLightbox();

  bilderListe = bilder.map((b) => (typeof b === 'string' ? { url: b, alt: '' } : b));
  fokusVorOeffnen = document.activeElement;

  zeigeBild(startIndex);
  lb.classList.add('offen');
  schliessenBtn.focus();
}

// fokusVorOeffnen wird beim Öffnen selbst gemerkt (nicht als Parameter
// entgegengenommen wie sidebar.js' fokusZielFallback) - die Lightbox kann
// von jedem beliebigen Bild aus jedem beliebigen Modul geöffnet werden, der
// Aufrufer müsste sonst bei jedem oeffneLightbox()-Aufruf zusätzlich das
// zuletzt fokussierte Element mitreichen. Direktes document.activeElement-
// Merken zum Öffnungszeitpunkt ist hier einfacher und ausreichend korrekt.
export function schliesseLightbox() {
  if (!lightboxElement || !lightboxElement.classList.contains('offen')) return;
  lightboxElement.classList.remove('offen');
  bildEl.src = '';
  if (fokusVorOeffnen && document.body.contains(fokusVorOeffnen)) {
    fokusVorOeffnen.focus();
  }
  fokusVorOeffnen = null;
}
