// js/core/lichtAusModus.js
// Auftrag 13 (Stufe B, Punkt 1): Seitenweite Steuerung des Modus „Licht aus“.
// - Der Zustand steht an EINER Stelle: js/core/state.js (unsicherheitModusAktiv + aktiveAnsichtLichtAus, istLichtAus()).
//   Diese Datei liest ihn nur und setzt danach das Wurzelattribut `data-modus="unsicherheit"` (zweite Palette in
//   css/base.css, Darstellung in css/components.css).
// - Esc beendet den Modus, wenn nicht gerade eine Seitenleiste, ein Dialog, ein Popover oder ein Aufklapper offen war
//   (deren eigenes Esc geht vor).
// - Der Wechsel wird einmal über eine höfliche Statusregion angesagt.
// - Dunkle Akzentfarbe (Entscheidung 10): `akzentfarbe_dunkel` aus archiv.csv, sonst aus `akzentfarbe` abgeleitet mit
//   Kontrastgarantie gegen die dunklen Flächen (--lichtaus-bg, --lichtaus-surface aus css/base.css).
import { istLichtAus, setUnsicherheitModus, setAktiveAnsichtLichtAus, setLichtAusAuswahl } from './state.js';
import { LEERE_AUSWAHL } from '../utils/lichtAus.js';
import { erzeugeLiveAnsage } from '../utils/liveAnsage.js';
import { hellGenugAufDunkel } from '../utils/kategorieFarben.js';
import { AKZENT_DUNKEL_MINDESTKONTRAST } from '../config/lichtAus.js';

export const MODUS_ATTRIBUT = 'data-modus';
export const MODUS_WERT = 'unsicherheit';
let ansage = null;
let escHandler = null;

export function wendeThemaAn() {
  const an = istLichtAus();
  const wurzel = document.documentElement;
  if (an) wurzel.setAttribute(MODUS_ATTRIBUT, MODUS_WERT); else wurzel.removeAttribute(MODUS_ATTRIBUT);
  return an;
}

export function sageModusAn(an, zusatz = '') {
  if (!ansage) ansage = erzeugeLiveAnsage(document.body, { verzoegerungMs: 150 });
  ansage.ansagen(an ? `Licht aus: Nur unsichere Angaben sind hell.${zusatz ? ` ${zusatz}` : ''}` : 'Licht wieder an.');
}

// Beim Verlassen der Erkundungsansichten (Startseite, Bestand, Führungen, Literatur, Über, Galerien)
export function beendeLichtAusUeberall() {
  const war = istLichtAus();
  setUnsicherheitModus(false);
  setAktiveAnsichtLichtAus(false);
  setLichtAusAuswahl(LEERE_AUSWAHL);
  wendeThemaAn();
  return war;
}

// Was Esc selbst schließt (Seitenleisten, Lightbox, Info-Popover, Personen-Popover, Aufklapper der Typenleiste).
// Nur sichtbare Elemente zählen; dauerhaft aufgeklappte Schalter (z. B. der Unterleisten-Schalter) nicht.
const OFFEN_AUSWAHL = '[role="dialog"]:not([hidden]):not([aria-hidden="true"]), .offen:not([aria-hidden="true"]), '
  + '.info-button-popover:not([hidden]), .familienbaum-popover, .lichtaus-weitere[aria-expanded="true"], details[open].lichtaus-hinweise';
const etwasOffen = () => [...document.querySelectorAll(OFFEN_AUSWAHL)].some((e) => e.getClientRects().length > 0);

// `beenden()` wird bei Esc aufgerufen, wenn Licht aus an ist und vorher nichts offen war
export function installiereEsc(beenden) {
  if (escHandler) return;
  let offenVorher = false;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') offenVorher = etwasOffen(); }, true);
  escHandler = (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented || offenVorher || !istLichtAus()) return;
    beenden();
  };
  document.addEventListener('keydown', escHandler);
}

function cssFarbe(name) {
  const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return /^#[0-9a-f]{6}$/i.test(wert) ? wert : null;
}

export function setzeDunkleAkzentfarbe(akzentfarbe, akzentfarbeDunkel) {
  const gruende = [cssFarbe('--lichtaus-bg'), cssFarbe('--lichtaus-surface')].filter(Boolean);
  const basis = String(akzentfarbeDunkel || '').trim() || String(akzentfarbe || '').trim() || cssFarbe('--accent');
  if (!basis || !gruende.length) return null;
  // auch eine angegebene dunkle Akzentfarbe wird bei zu wenig Kontrast aufgehellt (Garantie gilt immer)
  const farbe = hellGenugAufDunkel(basis, gruende, AKZENT_DUNKEL_MINDESTKONTRAST);
  document.documentElement.style.setProperty('--accent-dunkel', farbe);
  return farbe;
}
