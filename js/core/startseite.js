// js/core/startseite.js
// Startseite (Landingpage) des Interfaces - erscheint bei Aufruf der
// Root-URL (leerer Hash), oberhalb bleibt die unveränderte Hauptnavigation
// (Bestand/Visualisierungen/Führungen/Literatur/Über) sichtbar.
//
// AUFTRAG "Archivspezifische Texte und Identität in CSV-Dateien", Punkt
// 2.5: Slides/Einleitung/Kacheln/Downloads/Footer-Hinweis kommen jetzt aus
// data/startseite.csv (Typen `slide`/`einleitung`/`kachel`/`download`/
// `footer_hinweis`, über js/core/archivKonfiguration.js' ladeSeitenBloecke()
// - bereits nach `reihenfolge` sortiert, nur `sichtbar=ja`, Platzhalter
// aufgelöst), Kontaktdaten aus data/archiv.csv (konfigurationswert()).
// Anzahl der Slides/Kacheln/Downloads ergibt sich dadurch allein aus der
// CSV, keine feste Vier-Slides/Drei-Kacheln-Annahme mehr im Code.
//
// Baustein-Muster (Abschnitt 5, wie bereichsLeiste.js/ansichtWechseln.js):
// eine Funktion erzeugt den Baustein und gibt {destroy()} zurück - destroy()
// räumt hier zusätzlich den Karussell-Automatik-Timer auf (sonst liefe er
// nach einem Tab-Wechsel im Hintergrund weiter). Anders als die übrigen
// Bausteine im Projekt ist erzeugeStartseite() jetzt ASYNC (lädt Daten,
// siehe js/core/app.js' renderStartTab() für den Aufrufer-seitigen
// Wettlauf-Schutz).

import { ladeSeitenBloecke, konfigurationswert } from './archivKonfiguration.js';
import { erzeugeKontaktLink } from '../utils/kontaktLinks.js';
import { erzeugeLinkOderText } from '../utils/sichereUrl.js';

const KARUSSELL_INTERVALL_MS = 7000; // Auftrag: "alle 6-8 Sekunden", Mittelwert
const STARTSEITE_CSV = 'data/startseite.csv';

// Slide-Hintergründe bleiben nach POSITION den bestehenden CSS-Klassen
// zugeordnet (Auftrag Punkt 2.5, wörtlich: "weiter nach Position aus den
// bestehenden CSS-Klassen, bei mehr als vier Slides zyklisch") -
// `css/startseite.css` kennt genau vier Verlaufsklassen.
const SLIDE_HINTERGRUND_KLASSEN = ['startseite-slide-bg--1', 'startseite-slide-bg--2', 'startseite-slide-bg--3', 'startseite-slide-bg--4'];

function baueSlide(daten, index, anzahl) {
  const artikel = document.createElement('article');
  artikel.className = 'startseite-slide';
  artikel.setAttribute('aria-roledescription', 'Slide');
  artikel.setAttribute('aria-label', `Slide ${index + 1} von ${anzahl}: ${daten.kicker}`);

  const hintergrund = document.createElement('div');
  hintergrund.className = `startseite-slide-bg ${SLIDE_HINTERGRUND_KLASSEN[index % SLIDE_HINTERGRUND_KLASSEN.length]}`;

  // Punkt 2.5: "Ist die Spalte bild befüllt, wird das Bild aus data/ als
  // Hintergrund verwendet und der Hinweis 'Platzhalterbild' entfällt."
  if (daten.bild) {
    hintergrund.style.backgroundImage = `url("data/${daten.bild}")`;
    hintergrund.style.backgroundSize = 'cover';
    hintergrund.style.backgroundPosition = 'center';
  } else {
    const platzhalterHinweis = document.createElement('span');
    platzhalterHinweis.className = 'startseite-platzhalter-hinweis';
    platzhalterHinweis.setAttribute('aria-hidden', 'true');
    platzhalterHinweis.textContent = 'Platzhalterbild';
    hintergrund.appendChild(platzhalterHinweis);
  }

  const overlay = document.createElement('div');
  overlay.className = 'startseite-slide-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const inhalt = document.createElement('div');
  inhalt.className = 'startseite-slide-inhalt';

  const kicker = document.createElement('p');
  kicker.className = 'startseite-slide-kicker';
  kicker.textContent = daten.kicker;

  const headline = document.createElement('h2');
  headline.textContent = daten.titel;

  inhalt.append(kicker, headline);

  if (daten.link_text && daten.link_ziel) {
    // AUFTRAG A (Sicherheit): Linkziel aus startseite.csv nur mit erlaubtem Schema.
    const { element: cta, istLink } = erzeugeLinkOderText(daten.link_ziel);
    if (istLink) {
      cta.className = 'startseite-slide-cta';
      cta.textContent = daten.link_text;
    }
    inhalt.appendChild(cta);
  }

  artikel.append(hintergrund, overlay, inhalt);
  return artikel;
}

// Karussell-Logik (unverändert aus der bisherigen Fassung): automatischer
// Wechsel alle 7s, Pfeile links/rechts, Klick-Punkte unten, Pfeiltasten-
// Bedienung bei Fokus im Karussell. prefers-reduced-motion deaktiviert die
// Automatik - manuelle Bedienung bleibt davon unberührt.
function baueKarussell(wurzel, slides) {
  const bereich = document.createElement('section');
  bereich.className = 'startseite-hero';
  bereich.setAttribute('aria-label', 'Einstiegspunkte in die Sammlung');
  bereich.setAttribute('aria-roledescription', 'Karussell');
  bereich.setAttribute('tabindex', '0');

  const slidesWrapper = document.createElement('div');
  slidesWrapper.className = 'startseite-slides-wrapper';
  const slideElemente = slides.map((daten, i) => baueSlide(daten, i, slides.length));
  slideElemente.forEach((el) => slidesWrapper.appendChild(el));

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'startseite-slider-btn startseite-slider-btn--prev';
  prevBtn.setAttribute('aria-label', 'Vorheriger Slide');
  prevBtn.textContent = '‹';

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'startseite-slider-btn startseite-slider-btn--next';
  nextBtn.setAttribute('aria-label', 'Nächster Slide');
  nextBtn.textContent = '›';

  const punkteGruppe = document.createElement('div');
  punkteGruppe.className = 'startseite-slider-dots';
  punkteGruppe.setAttribute('role', 'group');
  punkteGruppe.setAttribute('aria-label', 'Slide direkt anwählen');
  const punkte = slides.map((daten, i) => {
    const punkt = document.createElement('button');
    punkt.type = 'button';
    punkt.className = 'startseite-slider-dot';
    punkt.setAttribute('aria-label', `Slide ${i + 1} anzeigen`);
    punkt.setAttribute('aria-pressed', 'false');
    punkteGruppe.appendChild(punkt);
    return punkt;
  });

  bereich.append(slidesWrapper, prevBtn, nextBtn, punkteGruppe);
  wurzel.appendChild(bereich);

  let aktuell = 0;
  let timer = null;

  function geheZu(index) {
    slideElemente[aktuell].classList.remove('aktiv');
    punkte[aktuell].classList.remove('aktiv');
    punkte[aktuell].setAttribute('aria-pressed', 'false');
    aktuell = ((index % slides.length) + slides.length) % slides.length;
    slideElemente[aktuell].classList.add('aktiv');
    punkte[aktuell].classList.add('aktiv');
    punkte[aktuell].setAttribute('aria-pressed', 'true');
  }

  function starteAutomatik() {
    clearInterval(timer);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(() => geheZu(aktuell + 1), KARUSSELL_INTERVALL_MS);
  }

  prevBtn.addEventListener('click', () => { geheZu(aktuell - 1); starteAutomatik(); });
  nextBtn.addEventListener('click', () => { geheZu(aktuell + 1); starteAutomatik(); });
  punkte.forEach((punkt, i) => punkt.addEventListener('click', () => { geheZu(i); starteAutomatik(); }));

  bereich.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); geheZu(aktuell - 1); starteAutomatik(); }
    if (event.key === 'ArrowRight') { event.preventDefault(); geheZu(aktuell + 1); starteAutomatik(); }
  });

  geheZu(0);
  starteAutomatik();

  return {
    destroy() {
      clearInterval(timer);
    }
  };
}

function baueEinleitung(wurzel, block) {
  const bereich = document.createElement('section');
  bereich.className = 'startseite-einleitung';
  bereich.setAttribute('aria-label', 'Willkommen');
  const absaetze = Array.isArray(block.text) ? block.text : [block.text];
  absaetze.forEach((absatz) => {
    const p = document.createElement('p');
    p.textContent = absatz;
    bereich.appendChild(p);
  });
  wurzel.appendChild(bereich);
}

// Punkt 2.5: "Kein Kopfbereich für Downloads, wenn keine download-Zeilen
// vorhanden sind" - deckt sowohl "keine Kachel" (kacheln.length===0, s.u.)
// als auch diesen expliziten Fall ab.
function baueKachelbereich(wurzel, kacheln) {
  if (kacheln.length === 0) return;
  const bereich = document.createElement('section');
  bereich.className = 'startseite-kachelbereich';
  bereich.setAttribute('aria-label', 'Unsere Angebote');

  const raster = document.createElement('div');
  raster.className = 'startseite-kacheln';

  kacheln.forEach((daten) => {
    const kachel = document.createElement('article');
    kachel.className = 'startseite-kachel';

    const titel = document.createElement('h3');
    titel.textContent = daten.titel;
    kachel.appendChild(titel);

    const absaetze = Array.isArray(daten.text) ? daten.text : [daten.text];
    absaetze.forEach((absatz) => {
      const p = document.createElement('p');
      p.textContent = absatz;
      kachel.appendChild(p);
    });

    if (daten.link_text && daten.link_ziel) {
      const { element: cta, istLink } = erzeugeLinkOderText(daten.link_ziel);
      if (istLink) {
        cta.className = 'startseite-kachel-cta';
        cta.textContent = `${daten.link_text} →`;
      }
      kachel.appendChild(cta);
    }

    raster.appendChild(kachel);
  });

  bereich.appendChild(raster);
  wurzel.appendChild(bereich);
}

function baueFooter(wurzel, downloads, footerHinweisBlock) {
  const footer = document.createElement('footer');
  footer.className = 'startseite-footer';
  footer.setAttribute('role', 'contentinfo');

  const innen = document.createElement('div');
  innen.className = 'startseite-footer-inner';

  const kontaktSpalte = document.createElement('div');
  const kontaktTitel = document.createElement('h3');
  kontaktTitel.textContent = 'Kontakt';
  const adresse = document.createElement('address');
  const name = konfigurationswert('archiv_name');
  const adresseStrasse = konfigurationswert('adresse_strasse');
  const adresseOrt = konfigurationswert('adresse_ort');
  // AUFTRAG A (Sicherheit): Textknoten statt innerHTML - Werte aus archiv.csv
  // wurden sonst als HTML ausgewertet (Prüfbericht 5e). Gleiche Struktur wie
  // zuvor: Name, <br>, Straße/Ort, <br>.
  const adresszeile = `${adresseStrasse}${adresseStrasse && adresseOrt ? ', ' : ''}${adresseOrt}`;
  adresse.append(document.createTextNode(name), document.createElement('br'),
    document.createTextNode(adresszeile), document.createElement('br'));
  // AUFTRAG Punkt 2.5: Telefonlink aus `telefon_international` (behebt den
  // Fehler im bisherigen Code, dem dafür die letzte Ziffer fehlte -
  // `telefon_international` in archiv.csv ist bereits vollständig).
  // Korrektur zu Paket 2 (Punkt 3): Icon+Unterstreichung jetzt über die mit
  // ueberSeite.js geteilte erzeugeKontaktLink() (js/utils/kontaktLinks.js).
  const telefonLink = erzeugeKontaktLink('telefon', `tel:${konfigurationswert('telefon_international')}`, konfigurationswert('telefon'));
  const emailLink = erzeugeKontaktLink('email', `mailto:${konfigurationswert('email')}`, konfigurationswert('email'));
  const websiteLink = erzeugeKontaktLink('website', konfigurationswert('website_link'), konfigurationswert('website'), { neuesFenster: true });
  adresse.append(telefonLink, document.createElement('br'), emailLink, document.createElement('br'), websiteLink);
  kontaktSpalte.append(kontaktTitel, adresse);

  innen.append(kontaktSpalte);

  if (downloads.length > 0) {
    const downloadsSpalte = document.createElement('div');
    const downloadsTitel = document.createElement('h3');
    downloadsTitel.textContent = 'Downloads & Rechtliches';
    const downloadsListe = document.createElement('ul');
    downloadsListe.className = 'startseite-footer-links';
    downloads.forEach((eintrag) => {
      const li = document.createElement('li');
      const { element: link, istLink } = erzeugeLinkOderText(eintrag.link_ziel);
      if (istLink) {
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = eintrag.link_text;
      }
      li.appendChild(link);
      downloadsListe.appendChild(li);
    });
    downloadsSpalte.append(downloadsTitel, downloadsListe);
    innen.append(downloadsSpalte);
  }

  footer.appendChild(innen);

  // Nicht-Ziel (Auftrag wörtlich): die Startseiten-Fußzeile (`footer_hinweis`
  // aus startseite.csv) bleibt eigenständig, wird NICHT mit `footer_text`
  // aus archiv.csv zusammengelegt (der bespielt stattdessen die app-weite
  // Fußzeile außerhalb der Startseite, siehe js/core/app.js).
  if (footerHinweisBlock) {
    const copy = document.createElement('p');
    copy.className = 'startseite-footer-copy';
    const absaetze = Array.isArray(footerHinweisBlock.text) ? footerHinweisBlock.text : [footerHinweisBlock.text];
    copy.textContent = absaetze.join(' ');
    footer.appendChild(copy);
  }

  wurzel.appendChild(footer);
}

export async function erzeugeStartseite(container) {
  const bloecke = await ladeSeitenBloecke(STARTSEITE_CSV);

  container.innerHTML = '';
  container.className = 'startseite-wurzel';

  const slides = bloecke.filter((b) => b.typ === 'slide');
  const einleitung = bloecke.find((b) => b.typ === 'einleitung');
  const kacheln = bloecke.filter((b) => b.typ === 'kachel');
  const downloads = bloecke.filter((b) => b.typ === 'download');
  const footerHinweis = bloecke.find((b) => b.typ === 'footer_hinweis');

  const karussell = slides.length > 0 ? baueKarussell(container, slides) : null;
  if (einleitung) baueEinleitung(container, einleitung);
  baueKachelbereich(container, kacheln);
  baueFooter(container, downloads, footerHinweis);

  return {
    destroy() {
      karussell?.destroy();
      container.innerHTML = '';
      container.className = '';
    }
  };
}
