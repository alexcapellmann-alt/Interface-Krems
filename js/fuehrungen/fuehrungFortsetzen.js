// js/fuehrungen/fuehrungFortsetzen.js
// AUFTRAG "Fuehrungen, Teil 2c", Punkt 1: schwebender "Fuehrung fortsetzen"-
// Button, app-weit EINMALIG an document.body verankert (nicht an einen
// einzelnen Tab-Kontext gebunden, siehe initialisiere() unten - bleibt
// dadurch beim Tab-Wechsel bestehen, ohne dass jeder renderXTab() ihn kennen
// muesste). Zustand liegt in sessionStorage (Auftrag woertlich: "in
// sessionStorage gespeichert"), EIN Schluessel je Sitzung - eine neu
// gespeicherte Fuehrung ersetzt dadurch automatisch eine vorherige
// pausierte (kein Stapel noetig).

import { aktuelleRoute, baueHash } from '../core/router.js';

const ZUSTAND_KEY = 'fuehrungFortsetzenZustand';
const POSITION_KEY = 'fuehrungFortsetzenPosition';
const ECKEN = ['unten-rechts', 'unten-links', 'oben-links', 'oben-rechts'];
const ZIEH_SCHWELLE_PX = 6;

function ermittleZustand() {
  try { return JSON.parse(sessionStorage.getItem(ZUSTAND_KEY)); } catch { return null; }
}

// Von aussen (fuehrungStation.js, beim Klick auf einen Belegs-/Vertiefungs-
// link) aufgerufen - Auftrag woertlich: NUR diese beiden Linkarten loesen
// das Speichern aus, normale Stationsnavigation (Pfeile) nicht.
//
// BUG (live gefunden, siehe PROJEKTLOG): ruft man hier synchron aktualisiere()
// auf, greift dessen "stehen wir schon auf der pausierten Station?"-Check
// noch gegen die ALTE Route - `<a href>`s Standardaktion (der eigentliche
// Hashwechsel) laeuft erst NACH allen click-Handlern, `location.hash` zeigt
// in diesem Moment also noch auf genau die Station, die gerade gespeichert
// wird - der frisch gespeicherte Zustand wuerde sich selbst sofort wieder
// loeschen. Der bereits registrierte `hashchange`-Listener (siehe
// initialisiereFortsetzenButton()) ruft aktualisiere() ohnehin gleich
// danach mit der dann schon aktuellen Route auf - kein zusaetzlicher Aufruf
// hier noetig.
export function speichereZustand(zustand) {
  sessionStorage.setItem(ZUSTAND_KEY, JSON.stringify(zustand));
}

export function loescheZustand() {
  sessionStorage.removeItem(ZUSTAND_KEY);
  aktualisiere();
}

// Fuer die Galerie-Kachel (fuehrungenGalerie.js) - liest nur, aendert nichts.
export function ermittlePausierteFuehrung() {
  return ermittleZustand();
}

function ermittlePosition() {
  try { return JSON.parse(sessionStorage.getItem(POSITION_KEY)) || { ecke: 'unten-rechts' }; }
  catch { return { ecke: 'unten-rechts' }; }
}

function speicherePosition(position) {
  sessionStorage.setItem(POSITION_KEY, JSON.stringify(position));
}

let instanz = null;

function baueElement() {
  const wurzel = document.createElement('div');
  wurzel.className = 'fuehrung-fortsetzen';
  wurzel.hidden = true;

  const griff = document.createElement('span');
  griff.className = 'fuehrung-fortsetzen-griff';
  griff.setAttribute('aria-hidden', 'true');
  griff.textContent = '⠿';

  const link = document.createElement('a');
  link.className = 'fuehrung-fortsetzen-link';

  const eckeBtn = document.createElement('button');
  eckeBtn.type = 'button';
  eckeBtn.className = 'fuehrung-fortsetzen-ecke';
  eckeBtn.textContent = '⤡';
  eckeBtn.setAttribute('aria-label', 'Führung-fortsetzen-Button in die nächste Bildschirmecke verschieben');

  const schliessenBtn = document.createElement('button');
  schliessenBtn.type = 'button';
  schliessenBtn.className = 'fuehrung-fortsetzen-schliessen';
  schliessenBtn.setAttribute('aria-label', 'Führung-fortsetzen-Hinweis ausblenden');
  schliessenBtn.textContent = '×';

  wurzel.append(griff, link, eckeBtn, schliessenBtn);
  return { wurzel, griff, link, eckeBtn, schliessenBtn };
}

// Haelt den Button vollstaendig im sichtbaren Fenster - bei freier
// (gezogener) Position UND nach einer Fenstergroessenaenderung.
function haltImFenster(wurzel) {
  const rect = wurzel.getBoundingClientRect();
  const maxLeft = window.innerWidth - rect.width - 8;
  const maxTop = window.innerHeight - rect.height - 8;
  const links = Math.min(Math.max(8, rect.left), Math.max(8, maxLeft));
  const oben = Math.min(Math.max(8, rect.top), Math.max(8, maxTop));
  wurzel.style.left = `${links}px`;
  wurzel.style.top = `${oben}px`;
  wurzel.style.right = 'auto';
  wurzel.style.bottom = 'auto';
}

function wendePositionAn(wurzel, position) {
  wurzel.classList.remove('ecke-unten-rechts', 'ecke-unten-links', 'ecke-oben-links', 'ecke-oben-rechts');
  if (position.ecke) {
    wurzel.classList.add(`ecke-${position.ecke}`);
    wurzel.style.left = '';
    wurzel.style.top = '';
    wurzel.style.right = '';
    wurzel.style.bottom = '';
  } else {
    wurzel.style.left = `${position.x}px`;
    wurzel.style.top = `${position.y}px`;
    wurzel.style.right = 'auto';
    wurzel.style.bottom = 'auto';
  }
}

// Alternative ohne Ziehen (WCAG 2.5.7): reiht die vier Ecken durch, per
// Maus/Tastatur/Touch gleichermassen ueber diesen normalen Button erreichbar.
function wechsleEcke() {
  const aktuell = ermittlePosition();
  const index = ECKEN.indexOf(aktuell.ecke);
  const naechste = { ecke: ECKEN[(index + 1 + ECKEN.length) % ECKEN.length] };
  speicherePosition(naechste);
  wendePositionAn(instanz.wurzel, naechste);
}

// Ziehen per Maus/Touch (Pointer Events decken beides ab) am Ziehgriff -
// wechselt dabei von Ecken- auf freie Pixel-Positionierung. wurdeGezogen
// unterdrueckt das anschliessende click-Ereignis auf dem Link, DAMIT
// Loslassen nach dem Ziehen kein Fortsetzen auslöst (Auftrag woertlich).
function verdrahteZiehen(griff, wurzel, link) {
  let start = null;
  let wurdeGezogen = false;
  griff.addEventListener('pointerdown', (event) => {
    const rect = wurzel.getBoundingClientRect();
    start = { x: event.clientX, y: event.clientY, links: rect.left, oben: rect.top };
    wurdeGezogen = false;
    griff.setPointerCapture(event.pointerId);
  });
  griff.addEventListener('pointermove', (event) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > ZIEH_SCHWELLE_PX || Math.abs(dy) > ZIEH_SCHWELLE_PX) wurdeGezogen = true;
    if (!wurdeGezogen) return;
    wurzel.classList.remove('ecke-unten-rechts', 'ecke-unten-links', 'ecke-oben-links', 'ecke-oben-rechts');
    wurzel.style.right = 'auto';
    wurzel.style.bottom = 'auto';
    wurzel.style.left = `${start.links + dx}px`;
    wurzel.style.top = `${start.oben + dy}px`;
  });
  griff.addEventListener('pointerup', () => {
    if (wurdeGezogen) {
      haltImFenster(wurzel);
      const rect = wurzel.getBoundingClientRect();
      speicherePosition({ x: rect.left, y: rect.top });
    }
    start = null;
  });
  link.addEventListener('click', (event) => { if (wurdeGezogen) { event.preventDefault(); wurdeGezogen = false; } });
}

function kuerzeTitel(text, laenge) {
  return text.length > laenge ? `${text.slice(0, laenge - 1)}…` : text;
}

function aktualisiereInhalt(zustand) {
  const kurz = `Führung fortsetzen: ${kuerzeTitel(zustand.fuehrungTitel, 30)}, Station ${zustand.stationNr}`;
  const voll = `Führung fortsetzen: ${zustand.fuehrungTitel}, Station ${zustand.stationNr}`;
  instanz.link.textContent = kurz;
  instanz.link.title = voll;
  instanz.link.setAttribute('aria-label', voll);
  instanz.link.href = baueHash(['fuehrungen', zustand.fuehrungId, String(zustand.stationNr)]);
}

// Einziger Einstiegspunkt fuer "soll der Button gerade sichtbar sein" -
// wird bei jeder Routenaenderung UND jedem speichereZustand()/
// loescheZustand() neu ausgewertet. Erreicht der Nutzer die pausierte
// Station (Klick auf den Button, Browser-Zurueck, o.ae.), gilt sie als
// fortgesetzt: Zustand wird geloescht (Auftrag: "Klick... Danach
// verschwindet er" / "Rueckkehr ueber Browser-Zurueck... Button
// verschwindet, da die Fuehrung wieder aktiv ist").
function aktualisiere() {
  if (!instanz) return;
  const zustand = ermittleZustand();
  if (!zustand) { instanz.wurzel.hidden = true; return; }
  const route = aktuelleRoute();
  const aufPausierterStation = route.tab === 'fuehrungen'
    && route.segmente[0] === zustand.fuehrungId
    && String(route.segmente[1]) === String(zustand.stationNr);
  if (aufPausierterStation) {
    sessionStorage.removeItem(ZUSTAND_KEY);
    instanz.wurzel.hidden = true;
    return;
  }
  if (zustand.ausgeblendet) { instanz.wurzel.hidden = true; return; }
  aktualisiereInhalt(zustand);
  instanz.wurzel.hidden = false;
}

// App-weit EINMAL beim Start aufgerufen (js/core/app.js).
export function initialisiereFortsetzenButton() {
  if (instanz) return;
  const teile = baueElement();
  instanz = teile;
  document.body.appendChild(teile.wurzel);
  wendePositionAn(teile.wurzel, ermittlePosition());
  verdrahteZiehen(teile.griff, teile.wurzel, teile.link);
  teile.eckeBtn.addEventListener('click', wechsleEcke);
  teile.schliessenBtn.addEventListener('click', () => {
    const zustand = ermittleZustand();
    if (zustand) sessionStorage.setItem(ZUSTAND_KEY, JSON.stringify({ ...zustand, ausgeblendet: true }));
    teile.wurzel.hidden = true;
  });
  window.addEventListener('hashchange', aktualisiere);
  // Nur bei freier (gezogener) Position noetig - eine Ecken-Position haelt
  // sich ueber die CSS-Klassen (right/bottom bzw. left/top) von selbst im
  // Fenster, ein Clamp wuerde dort die Ecken-Verankerung nur unnoetig durch
  // feste Pixelwerte ersetzen.
  window.addEventListener('resize', () => {
    if (!teile.wurzel.hidden && !ermittlePosition().ecke) haltImFenster(teile.wurzel);
  });
  aktualisiere();
}
