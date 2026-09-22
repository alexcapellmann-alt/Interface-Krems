// js/core/startseite.js
// Startseite (Landingpage) des neuen Interfaces - erscheint bei Aufruf der
// Root-URL (leerer Hash), oberhalb bleibt die unveränderte Hauptnavigation
// (Bestand/Visualisierungen/Führungen/Literatur/Über) sichtbar. Strukturell
// und gestalterisch an der Landingpage des alten Single-File-Prototyps
// orientiert (Desktop/GitHub/Interface-Krems/index.html, dort:
// #hero-slider/.welcome-section/.info-grid-section/.landing-footer) - Inhalte
// bewusst NICHT wörtlich übernommen, sondern an die tatsächliche Struktur des
// neuen Interfaces angepasst (siehe einzelne Kommentare unten und
// PROJEKTLOG.md für die vollständige Abwägung).
//
// Baustein-Muster (Abschnitt 5, wie bereichsLeiste.js/ansichtWechseln.js):
// eine Funktion erzeugt den Baustein und gibt {destroy()} zurück - destroy()
// räumt hier zusätzlich den Karussell-Automatik-Timer auf (sonst liefe er
// nach einem Tab-Wechsel im Hintergrund weiter).

const KARUSSELL_INTERVALL_MS = 7000; // Auftrag: "alle 6-8 Sekunden", Mittelwert

// Vier Slides, thematisch an die tatsächlich vorhandenen Tabs angelehnt (nicht
// die alten Themen "Urkundensuche"/"Bibliothekskatalog" - dafür gibt es im
// neuen Interface keinen eigenen Tab). Bewusste Zuordnung: Visualisierungen,
// Führungen, Literatur, ein allgemein einladender Einstieg zu Bestand - deckt
// vier der fünf Haupttabs ab (Über wird stattdessen im Footer/Kachelbereich
// nicht separat beworben, da es aktuell nur ein Platzhalter ist).
const SLIDES = [
  {
    kicker: 'Für Entdecker:innen',
    headline: 'Entdecken Sie das Gedächtnis der Doppelstadt Krems-Stein.',
    ctaText: 'Zu den Visualisierungen',
    ctaHref: '#visualisierungen',
    verlauf: 'startseite-slide-bg--1'
  },
  {
    kicker: 'Geführte Einblicke',
    headline: 'Historische Bestände anhand kuratierter Pfade kennenlernen.',
    ctaText: 'Zu den Führungen',
    ctaHref: '#fuehrungen',
    verlauf: 'startseite-slide-bg--2'
  },
  {
    kicker: 'Für Forschende & Leser:innen',
    headline: 'Literatur und Forschung rund um die Stadtgeschichte.',
    ctaText: 'Zur Literatur',
    ctaHref: '#literatur',
    verlauf: 'startseite-slide-bg--3'
  },
  {
    kicker: 'Für Neueinsteiger:innen',
    headline: 'Das Stadtarchiv Krems – ein digitaler Einstieg für alle.',
    ctaText: 'Jetzt entdecken',
    ctaHref: '#bestand',
    verlauf: 'startseite-slide-bg--4'
  }
];

// Einleitungstext (Schritt 3) - bewusst NEU formuliert, nicht die wörtliche
// Übernahme aus dem alten Interface (dort: "Wir verwahren den schriftlichen
// Nachweis der Verwaltungstätigkeit, eine rund 1.000 Stück umfassende
// Urkundensammlung..."). Dieselbe kommunikative Aufgabe (Begrüßung,
// historischer Umfang seit 1108, Hinweis auf den Inhalt), aber realistisch
// auf das neue Interface bezogen: keine eigene Urkunden-Datenbank als Tab,
// stattdessen Bestandsvisualisierungen als zentrales Angebot.
const EINLEITUNGSTEXT = 'Willkommen im digitalen Interface des Stadtarchivs Krems an der Donau. '
  + 'Unsere Bestände reichen bis in das Jahr 1108 zurück und bewahren das schriftliche '
  + 'Gedächtnis der historischen Doppelstadt Krems-Stein. Dieses Interface macht den '
  + 'gesamten Bestandsbaum als interaktive Visualisierung erfahrbar – nach Kategorie, '
  + 'Zeitraum und Umfang erkundbar, ergänzt um geführte Pfade und weiterführende Literatur.';

// Drei Kacheln (Schritt 4) - bewusst NUR die drei Themen, die tatsächlich
// einem echten Tab entsprechen (Bestand/Führungen/Literatur). Die alte dritte
// Kachel "Service & Lesesaal" (Öffnungszeiten, Voranmeldung, Lesesaal-Infos)
// wurde NICHT übernommen - dafür gibt es im neuen Interface keine
// entsprechende Funktion/Information (auch nicht im "Über"-Platzhalter),
// eine erfundene Entsprechung wäre irreführend. Stattdessen: Führungen, ein
// im alten Prototyp gar nicht auf der Startseite beworbenes, aber im neuen
// Interface echt vorhandenes Tab (siehe PROJEKTLOG für die Abwägung).
const KACHELN = [
  {
    titel: 'Unsere Bestände visualisiert',
    text: 'Der gesamte Bestand des Stadtarchivs als interaktive Treemap, Sunburst, Icicle, '
      + 'Circle Packing und Zeitachse – nach Kategorie, Zeitraum und Umfang erkundbar.',
    ctaText: 'Visualisierungen entdecken',
    ctaHref: '#bestand'
  },
  {
    titel: 'Geführte Pfade',
    text: 'Kuratierte Einblicke in ausgewählte Themen und Zeiträume des Archivs – ein guter '
      + 'Einstieg für alle, die nicht auf eigene Faust recherchieren möchten.',
    ctaText: 'Zu den Führungen',
    ctaHref: '#fuehrungen'
  },
  {
    titel: 'Literatur & Forschung',
    text: 'Publikationen und Literaturhinweise rund um die Geschichte der Stadt Krems und '
      + 'ihres Archivs.',
    ctaText: 'Zur Literatur',
    ctaHref: '#literatur'
  }
];

// Footer-Inhalte (Schritt 5) - 1:1 aus dem alten Interface übernommen
// (Kontaktdaten sind real, siehe Auftrag). Root-Cause-Check zu den drei
// PDF-Links (aktiv geprüft, nicht angenommen): im Projektordner selbst
// existiert kein assets-/docs-Ordner mit diesen Dateien - im alten Interface
// verweisen dieselben drei Links jedoch bereits auf reale, öffentlich
// gehostete PDFs auf www.krems.at (nicht auf lokale Pfade) - genau diese
// externen URLs werden hier unverändert übernommen, keine toten/erfundenen
// Pfade nötig.
const KONTAKT = {
  name: 'Stadtarchiv Krems an der Donau',
  adresse: 'Körnermarkt 14, 3500 Krems an der Donau',
  telefon: '0 27 32 / 801 578',
  telefonHref: 'tel:+43273280157',
  email: 'stadtarchiv@krems.gv.at',
  website: 'www.krems.gv.at/stadtarchiv',
  websiteHref: 'https://www.krems.gv.at/stadtarchiv'
};

const DOWNLOADS = [
  { text: 'Archivordnung (PDF)', href: 'https://www.krems.at/fileadmin/user_upload/Archiv_Krems_Archivordnung_publiziert_03_2019.pdf' },
  { text: 'Benützerordnung (PDF)', href: 'https://www.krems.at/fileadmin/user_upload/Benuetzerordnung_Stadtarchiv_Krems_Jaenner_2020.pdf' },
  { text: 'ISDIAH-Beschreibung (PDF)', href: 'https://www.krems.at/fileadmin/user_upload/Stadtarchiv_Krems_ISDIAH_2023.pdf' }
];

function baueSlide(daten, index) {
  const artikel = document.createElement('article');
  artikel.className = 'startseite-slide';
  artikel.setAttribute('aria-roledescription', 'Slide');
  artikel.setAttribute('aria-label', `Slide ${index + 1} von ${SLIDES.length}: ${daten.kicker}`);

  const hintergrund = document.createElement('div');
  hintergrund.className = `startseite-slide-bg ${daten.verlauf}`;

  // Platzhalter-Hinweis (Schritt 2: noch keine echten Fotos zugeordnet) -
  // aria-hidden, da rein visueller Entwicklungshinweis ohne inhaltlichen
  // Wert für Screenreader-Nutzende (Kicker/Headline werden ohnehin vorgelesen).
  const platzhalterHinweis = document.createElement('span');
  platzhalterHinweis.className = 'startseite-platzhalter-hinweis';
  platzhalterHinweis.setAttribute('aria-hidden', 'true');
  platzhalterHinweis.textContent = 'Platzhalterbild';
  hintergrund.appendChild(platzhalterHinweis);

  const overlay = document.createElement('div');
  overlay.className = 'startseite-slide-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const inhalt = document.createElement('div');
  inhalt.className = 'startseite-slide-inhalt';

  const kicker = document.createElement('p');
  kicker.className = 'startseite-slide-kicker';
  kicker.textContent = daten.kicker;

  const headline = document.createElement('h2');
  headline.textContent = daten.headline;

  inhalt.append(kicker, headline);

  if (daten.ctaText && daten.ctaHref) {
    const cta = document.createElement('a');
    cta.className = 'startseite-slide-cta';
    cta.href = daten.ctaHref;
    cta.textContent = daten.ctaText;
    inhalt.appendChild(cta);
  }

  artikel.append(hintergrund, overlay, inhalt);
  return artikel;
}

// Karussell-Logik (Schritt 2): automatischer Wechsel alle 7s, Pfeile links/
// rechts, Klick-Punkte unten, Pfeiltasten-Bedienung bei Fokus im Karussell.
// prefers-reduced-motion deaktiviert die Automatik (dieselbe Rücksichtnahme
// wie im alten Prototyp) - manuelle Bedienung bleibt davon unberührt.
function baueKarussell(wurzel) {
  const bereich = document.createElement('section');
  bereich.className = 'startseite-hero';
  bereich.setAttribute('aria-label', 'Einstiegspunkte in die Sammlung');
  bereich.setAttribute('aria-roledescription', 'Karussell');
  bereich.setAttribute('tabindex', '0');

  const slidesWrapper = document.createElement('div');
  slidesWrapper.className = 'startseite-slides-wrapper';
  const slideElemente = SLIDES.map((daten, i) => baueSlide(daten, i));
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
  const punkte = SLIDES.map((daten, i) => {
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
    aktuell = ((index % SLIDES.length) + SLIDES.length) % SLIDES.length;
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

  // Tastaturbedienung (Auftrag: Pfeiltasten ODER Tab+Enter auf die Punkte -
  // Tab+Enter funktioniert bereits nativ über die <button>-Punkte, hier
  // zusätzlich Pfeiltasten bei Fokus irgendwo im Karussell-Bereich).
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

function baueEinleitung(wurzel) {
  const bereich = document.createElement('section');
  bereich.className = 'startseite-einleitung';
  bereich.setAttribute('aria-label', 'Willkommen');
  const text = document.createElement('p');
  text.textContent = EINLEITUNGSTEXT;
  bereich.appendChild(text);
  wurzel.appendChild(bereich);
}

function baueKachelbereich(wurzel) {
  const bereich = document.createElement('section');
  bereich.className = 'startseite-kachelbereich';
  bereich.setAttribute('aria-label', 'Unsere Angebote');

  const raster = document.createElement('div');
  raster.className = 'startseite-kacheln';

  KACHELN.forEach((daten) => {
    const kachel = document.createElement('article');
    kachel.className = 'startseite-kachel';

    const titel = document.createElement('h3');
    titel.textContent = daten.titel;

    const text = document.createElement('p');
    text.textContent = daten.text;

    const cta = document.createElement('a');
    cta.className = 'startseite-kachel-cta';
    cta.href = daten.ctaHref;
    cta.textContent = `${daten.ctaText} →`;

    kachel.append(titel, text, cta);
    raster.appendChild(kachel);
  });

  bereich.appendChild(raster);
  wurzel.appendChild(bereich);
}

function baueFooter(wurzel) {
  const footer = document.createElement('footer');
  footer.className = 'startseite-footer';
  footer.setAttribute('role', 'contentinfo');

  const innen = document.createElement('div');
  innen.className = 'startseite-footer-inner';

  const kontaktSpalte = document.createElement('div');
  const kontaktTitel = document.createElement('h3');
  kontaktTitel.textContent = 'Kontakt';
  const adresse = document.createElement('address');
  adresse.innerHTML = `${KONTAKT.name}<br>${KONTAKT.adresse}<br>`;
  const telefonLink = document.createElement('a');
  telefonLink.href = KONTAKT.telefonHref;
  telefonLink.textContent = KONTAKT.telefon;
  const emailLink = document.createElement('a');
  emailLink.href = `mailto:${KONTAKT.email}`;
  emailLink.textContent = KONTAKT.email;
  const websiteLink = document.createElement('a');
  websiteLink.href = KONTAKT.websiteHref;
  websiteLink.target = '_blank';
  websiteLink.rel = 'noopener';
  websiteLink.textContent = KONTAKT.website;
  adresse.append(telefonLink, document.createElement('br'), emailLink, document.createElement('br'), websiteLink);
  kontaktSpalte.append(kontaktTitel, adresse);

  const downloadsSpalte = document.createElement('div');
  const downloadsTitel = document.createElement('h3');
  downloadsTitel.textContent = 'Downloads & Rechtliches';
  const downloadsListe = document.createElement('ul');
  downloadsListe.className = 'startseite-footer-links';
  DOWNLOADS.forEach((eintrag) => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = eintrag.href;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = eintrag.text;
    li.appendChild(link);
    downloadsListe.appendChild(li);
  });
  downloadsSpalte.append(downloadsTitel, downloadsListe);

  innen.append(kontaktSpalte, downloadsSpalte);

  const copy = document.createElement('p');
  copy.className = 'startseite-footer-copy';
  copy.textContent = '© Stadtarchiv Krems an der Donau · Interface im Rahmen einer Masterarbeit (Historische Hilfswissenschaften und Archivwissenschaft, Universität Wien).';

  footer.append(innen, copy);
  wurzel.appendChild(footer);
}

export function erzeugeStartseite(container) {
  container.innerHTML = '';
  container.className = 'startseite-wurzel';

  const karussell = baueKarussell(container);
  baueEinleitung(container);
  baueKachelbereich(container);
  baueFooter(container);

  return {
    destroy() {
      karussell.destroy();
      container.innerHTML = '';
      container.className = '';
    }
  };
}
