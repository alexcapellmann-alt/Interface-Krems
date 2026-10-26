// js/fuehrungen/fuehrungenZeitleiste.js
// Zeitleiste aller Führungen (Wunsch des Autors, 2026-10-26), zweite Übersicht neben dem Feldraster
// (fuehrungenGalerie.js), Route #fuehrungen/zeitleiste.
// - Jede Führung ist ein Balken so lang wie ihr Zeitraum; ein Klick führt zu Station 1.
// - Der Zeitraum steht in fuehrungen.csv als Freitext (`zeitraum`, z. B. „1535–1625, Schwerpunkt 1568–1610“,
//   „15.–17. Jahrhundert“). leseZeitraum() liest daraus Anfang und Ende; ein „Schwerpunkt“ wird als
//   kräftigerer Abschnitt im Balken gezeigt, Jahrhundert-Angaben enden weich (unscharfe Grenze).
//   Ohne verwertbaren `zeitraum` gelten die Jahre der Stationen (`station_zeitraum`); bleibt nichts,
//   steht die Führung in der Liste „ohne Zeitraum“ unter der Zeitleiste.
// - Farbe = Themenbereich (Legende darüber), Balken in Zeilen gepackt, Titel im Balken oder daneben.
// - Hintergrund: heller Stadtplan von Krems, Stein und Mautern (vendor/karten/krems.json, OpenStreetMap,
//   erzeugt mit Interface-Krems-Testserver\karte_krems.py), zurückhaltend wie der Stadtplan im
//   Theaterzettel-Prototyp.
//
// Zugänglichkeit: Balken sind Links mit Titel, Zeitraum und Themenbereich im Namen, in Zeitfolge per
// Tab erreichbar; die Kurzbeschreibung erscheint bei Mauszeiger und Tastaturfokus.

import { ladeFuehrungenDaten } from './fuehrungenDaten.js';
import { baueAnsichtWahl } from './fuehrungenAnsichtWahl.js';
import { baueFuehrungHinweisBox } from './fuehrungHinweisBox.js';

const KARTE_PFAD = 'vendor/karten/krems.json';
// Maßstab und Lage: Altstädte von Krems und Stein; gezeichnet wird der ganze Kartenbereich
const KARTE_FOKUS = { W: 15.572, E: 15.632, S: 48.398, N: 48.424 };
// [Ebene, Linienbreite px, Farbe, Deckkraft]
const KARTE_EBENEN = [
  ['klein', 0.8, '#6b6358', 0.22], ['bahn', 1.2, '#6b6358', 0.24], ['gross', 1.8, '#6b6358', 0.30],
  ['wasser', 1.4, '#5f8aa6', 0.38], ['fluss', 3.4, '#5f8aa6', 0.42]
];
const FARBEN = ['#2c6e8f', '#9a5b13', '#4f7a2a', '#8c3b5e', '#5d4f99', '#6b6046'];
const ZEILE = { min: 24, max: 44, abstand: 6 };
const RAND = { links: 24, rechts: 24, oben: 12, achse: 34 };
const LABEL_ABSTAND = 8;
const SCHRIFT = "600 14px 'Inter', system-ui, sans-serif";

let I = null;

// ---- Zeitraum lesen ------------------------------------------------------------------------------

// Jahre und Jahrhunderte eines Textstücks als Intervalle [von, bis, unscharf]
function intervalle(text) {
  const iv = [];
  for (const m of text.matchAll(/\b(1\d{3})\b/g)) iv.push([+m[1], +m[1], false]);
  for (const m of text.matchAll(/(?:(früh|spät|Mitte)\S*\s+(?:des\s+)?)?\b(\d{1,2})\.(?=.*Jahrhundert)/gi)) {
    const c = +m[2], basis = (c - 1) * 100, art = (m[1] || '').toLowerCase();
    if (c < 8 || c > 21) continue;
    if (art === 'früh') iv.push([basis, basis + 33, true]);
    else if (art === 'spät') iv.push([basis + 66, basis + 99, true]);
    else if (art === 'mitte') iv.push([basis + 33, basis + 66, true]);
    else iv.push([basis, basis + 99, true]);
  }
  return iv;
}

function spanne(iv) {
  if (!iv.length) return null;
  const von = iv.reduce((a, b) => (b[0] < a[0] ? b : a));
  const bis = iv.reduce((a, b) => (b[1] > a[1] ? b : a));
  return { von: von[0], bis: Math.max(bis[1], von[0] + 1), vonUnscharf: von[2], bisUnscharf: bis[2] };
}

export function leseZeitraum(fuehrung) {
  const text = String(fuehrung.zeitraum || '');
  const [haupt, schwer] = text.split(/Schwerpunkt:?/i);
  // Hauptteil: vor Zusätzen wie „mit Ausblick“, „mit Rückblick“, Klammern und Nebensätzen nach Komma
  const kern = (haupt || '').split(/,|\(|mit Ausblick|mit Rückblick/i)[0];
  let z = spanne(intervalle(kern)) || spanne(intervalle(haupt || ''));
  let quelle = 'zeitraum';
  if (!z) {
    z = spanne(fuehrung.stationen.flatMap((s) => intervalle(String(s.station_zeitraum || ''))));
    quelle = 'stationen';
  }
  if (!z) return null;
  const sp = schwer ? spanne(intervalle(schwer)) : null;
  return { ...z, quelle, schwerpunkt: sp && sp.von >= z.von && sp.bis <= z.bis ? sp : null };
}

// ---- Karte ------------------------------------------------------------------------------------------

async function ladeKarte() {
  let grund = null;
  try { const r = await fetch(KARTE_PFAD); if (r.ok) grund = await r.json(); } catch { /* ohne Karte */ }
  if (!I || !grund) return;
  const k = Math.cos(grund.lat0 * Math.PI / 180) * grund.faktor;
  I.karte = {
    ebenen: Object.fromEntries(Object.entries(grund.ebenen).map(([n, d]) => [n, new Path2D(d)])),
    x0: KARTE_FOKUS.W * k, x1: KARTE_FOKUS.E * k, y0: -KARTE_FOKUS.N * grund.faktor, y1: -KARTE_FOKUS.S * grund.faktor,
    nachweis: grund.nachweis
  };
  zeichneKarte();
}

function zeichneKarte() {
  const { cv, karte } = I;
  const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  if (!karte) return;
  const s = Math.max(r.width / (karte.x1 - karte.x0), r.height / (karte.y1 - karte.y0)); // füllt die Fläche
  const ox = (r.width - (karte.x1 - karte.x0) * s) / 2 - karte.x0 * s;
  const oy = (r.height - (karte.y1 - karte.y0) * s) / 2 - karte.y0 * s;
  g.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [name, breite, farbe, deckkraft] of KARTE_EBENEN) {
    if (!karte.ebenen[name]) continue;
    g.strokeStyle = farbe; g.globalAlpha = deckkraft; g.lineWidth = breite / s;
    g.stroke(karte.ebenen[name]);
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.globalAlpha = 0.8; g.fillStyle = '#595959'; g.font = "11px 'Inter', system-ui, sans-serif";
  g.textAlign = 'right'; g.textBaseline = 'top'; g.fillText(karte.nachweis, r.width - 8, 6); // oben, die Achse liegt unten
}

// ---- Layout -----------------------------------------------------------------------------------------

function textBreite(text, groesse) {
  const g = I.messung.getContext('2d');
  g.font = SCHRIFT.replace('14px', `${groesse}px`);
  return g.measureText(text).width;
}

function achsenSchritt(jahre, breite) {
  for (const s of [10, 25, 50, 100, 200]) if ((breite / jahre) * s >= 70) return s;
  return 200;
}

function layout() {
  const { buehne, eintraege, balkenEbene, achse } = I;
  buehne.style.minHeight = ''; // eigene Mindesthöhe vor dem Messen zurücknehmen
  const W = buehne.clientWidth, H = buehne.clientHeight;
  const von = Math.floor(Math.min(...eintraege.map((e) => e.z.von)) / 50) * 50;
  const bis = Math.ceil(Math.max(...eintraege.map((e) => e.z.bis)) / 50) * 50;
  const nutz = Math.max(200, W - RAND.links - RAND.rechts);
  const x = (j) => RAND.links + ((j - von) / (bis - von)) * nutz;
  // Zeilen packen: Balken plus Titel daneben, wenn er nicht hineinpasst. Reicht der Platz für die
  // normale Schrift nicht, wird mit kleinerer Schrift und engeren Zeilen neu gepackt.
  const verfuegbar = H - RAND.oben - RAND.achse;
  let zeilen = 0, zh = ZEILE.min, abstand = ZEILE.abstand, schrift = 14;
  for (const stufe of [{ schrift: 14, min: ZEILE.min, abstand: ZEILE.abstand }, { schrift: 12, min: 18, abstand: 4 }]) {
    const zeilenEnde = [];
    eintraege.forEach((e) => {
      e.x0 = x(e.z.von); e.x1 = Math.max(x(e.z.bis), e.x0 + 6);
      e.tb = textBreite(e.f.fuehrung_titel, stufe.schrift) + 20;
      e.innen = e.tb <= e.x1 - e.x0;
      e.rechts = !e.innen && e.x1 + LABEL_ABSTAND + e.tb <= W - 4;
      // passt der Titel weder rechts noch links neben den Balken (schmale Fenster), steht er gekürzt im Balken
      if (!e.innen && !e.rechts && e.x0 - LABEL_ABSTAND - e.tb < 4) e.innen = true;
      const belegt0 = e.innen || e.rechts ? e.x0 : e.x0 - LABEL_ABSTAND - e.tb;
      const belegt1 = e.innen ? e.x1 : (e.rechts ? e.x1 + LABEL_ABSTAND + e.tb : e.x1);
      let z = zeilenEnde.findIndex((ende) => ende + 10 <= belegt0);
      if (z < 0) { z = zeilenEnde.length; zeilenEnde.push(0); }
      zeilenEnde[z] = belegt1;
      e.zeile = z;
    });
    zeilen = zeilenEnde.length; abstand = stufe.abstand; schrift = stufe.schrift;
    const passend = verfuegbar / zeilen - abstand;
    zh = Math.max(stufe.min, Math.min(ZEILE.max, passend));
    if (passend >= stufe.min) break;
  }
  buehne.style.setProperty('--fz-schrift', `${schrift}px`);
  const gesamt = zeilen * (zh + abstand);
  const start = RAND.oben + Math.max(0, (verfuegbar - gesamt) / 2);
  I.buehne.style.minHeight = `${RAND.oben + gesamt + RAND.achse + 8}px`;
  eintraege.forEach((e) => {
    const a = e.el, w = e.x1 - e.x0;
    a.style.left = `${e.x0}px`; a.style.width = `${w}px`;
    a.style.top = `${start + e.zeile * (zh + abstand)}px`; a.style.height = `${zh}px`;
    a.classList.toggle('fz-titel-innen', e.innen);
    a.classList.toggle('fz-titel-rechts', !e.innen && e.rechts);
    a.classList.toggle('fz-titel-links', !e.innen && !e.rechts);
    a.style.setProperty('--fz-titel-breite', `${e.tb}px`);
    // Füllung: weiche Enden bei Jahrhundert-Grenzen, kräftigerer Schwerpunkt
    const p = (j) => `${(((x(j) - e.x0) / w) * 100).toFixed(1)}%`;
    const stopps = [];
    stopps.push(e.z.vonUnscharf ? 'var(--fz-leicht0) 0%' : 'var(--fz-leicht) 0%');
    if (e.z.vonUnscharf) stopps.push(`var(--fz-leicht) ${Math.min(25, (40 / w) * 100).toFixed(1)}%`);
    if (e.z.schwerpunkt) {
      const sp = e.z.schwerpunkt;
      stopps.push(`var(--fz-leicht) ${p(sp.von)}`, `var(--fz-kraeftig) ${p(sp.von)}`, `var(--fz-kraeftig) ${p(sp.bis)}`, `var(--fz-leicht) ${p(sp.bis)}`);
    }
    if (e.z.bisUnscharf) stopps.push(`var(--fz-leicht) ${(100 - Math.min(25, (40 / w) * 100)).toFixed(1)}%`);
    stopps.push(e.z.bisUnscharf ? 'var(--fz-leicht0) 100%' : 'var(--fz-leicht) 100%');
    a.style.background = `linear-gradient(90deg, ${stopps.join(', ')})`;
  });
  balkenEbene.style.height = `${RAND.oben + gesamt}px`;
  // Achse
  achse.innerHTML = '';
  const schritt = achsenSchritt(bis - von, nutz);
  for (let j = Math.ceil(von / schritt) * schritt; j <= bis; j += schritt) {
    const t = document.createElement('span');
    t.className = `fz-tick${j % 100 === 0 ? ' fz-tick-jahrhundert' : ''}`;
    t.style.left = `${x(j)}px`;
    t.textContent = String(j);
    achse.appendChild(t);
  }
  zeichneKarte();
}

// ---- Tooltip ----------------------------------------------------------------------------------------

function zeigeTipp(e) {
  const tip = I.tipp, a = e.el;
  tip.innerHTML = '';
  const t = document.createElement('div'); t.className = 'fz-tt'; t.textContent = e.f.fuehrung_titel;
  const m = document.createElement('div'); m.className = 'fz-tm';
  m.textContent = [e.f.zeitraum || (e.z.quelle === 'stationen' ? `${e.z.von}–${e.z.bis} (aus den Stationen)` : ''), e.f.themenbereich].filter(Boolean).join(' · ');
  const k = document.createElement('div'); k.className = 'fz-tk'; k.textContent = e.f.kurzbeschreibung;
  tip.append(t, m, k);
  tip.hidden = false;
  const b = I.buehne.getBoundingClientRect(), r = a.getBoundingClientRect();
  const mitte = Math.min(Math.max(r.left - b.left + Math.min(r.width, 200) / 2, 150), b.width - 150);
  tip.style.left = `${mitte - 140}px`;
  const oben = r.top - b.top - tip.offsetHeight - 8;
  tip.style.top = `${oben > 0 ? oben : r.bottom - b.top + 8}px`;
}
function versteckeTipp() { if (I) I.tipp.hidden = true; }

// ---- Aufbau -------------------------------------------------------------------------------------------

export async function render(container) {
  container.innerHTML = '';
  const wurzel = document.createElement('div');
  wurzel.className = 'fuehrungen-zeitleiste';
  wurzel.appendChild(baueAnsichtWahl('zeitleiste'));
  container.appendChild(wurzel);

  const { fuehrungen } = await ladeFuehrungenDaten();
  const themen = [...new Set(fuehrungen.map((f) => f.themenbereich))];
  const farbe = new Map(themen.map((t, i) => [t, FARBEN[i % FARBEN.length]]));

  const legende = document.createElement('ul');
  legende.className = 'fz-legende';
  legende.setAttribute('aria-label', 'Themenbereiche');
  themen.forEach((t) => {
    const li = document.createElement('li');
    li.style.setProperty('--fz-farbe', farbe.get(t));
    li.textContent = t;
    legende.appendChild(li);
  });
  wurzel.appendChild(legende);

  const buehne = document.createElement('div');
  buehne.className = 'fz-buehne';
  const cv = document.createElement('canvas');
  cv.className = 'fz-karte';
  cv.setAttribute('aria-hidden', 'true');
  const balkenEbene = document.createElement('ol');
  balkenEbene.className = 'fz-balken-ebene';
  balkenEbene.setAttribute('aria-label', 'Führungen nach Zeitraum, früheste zuerst');
  const achse = document.createElement('div');
  achse.className = 'fz-achse';
  achse.setAttribute('aria-hidden', 'true');
  const tipp = document.createElement('div');
  tipp.className = 'fz-tipp';
  tipp.hidden = true;
  buehne.append(cv, balkenEbene, achse, tipp);
  wurzel.appendChild(buehne);

  const mitZeit = [], ohneZeit = [];
  fuehrungen.forEach((f) => { const z = leseZeitraum(f); (z ? mitZeit : ohneZeit).push({ f, z }); });
  mitZeit.sort((a, b) => a.z.von - b.z.von || (b.z.bis - b.z.von) - (a.z.bis - a.z.von));

  I = { container, wurzel, buehne, cv, balkenEbene, achse, tipp, eintraege: mitZeit, karte: null, messung: document.createElement('canvas') };

  mitZeit.forEach((e) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'fz-balken';
    a.href = `#fuehrungen/${encodeURIComponent(e.f.fuehrung_id)}/1`;
    a.style.setProperty('--fz-farbe', farbe.get(e.f.themenbereich));
    const titel = document.createElement('span');
    titel.className = 'fz-titel';
    titel.textContent = e.f.fuehrung_titel;
    a.appendChild(titel);
    const zeitText = e.f.zeitraum || `${e.z.von}–${e.z.bis}`;
    a.setAttribute('aria-label', `${e.f.fuehrung_titel}, ${zeitText}, ${e.f.themenbereich}${e.f.status === 'entwurf' ? ', Entwurf' : ''}`);
    a.addEventListener('mouseenter', () => zeigeTipp(e));
    a.addEventListener('focus', () => zeigeTipp(e));
    a.addEventListener('mouseleave', versteckeTipp);
    a.addEventListener('blur', versteckeTipp);
    e.el = a;
    li.appendChild(a);
    balkenEbene.appendChild(li);
  });

  if (ohneZeit.length) {
    const box = document.createElement('section');
    box.className = 'fz-ohne';
    const h = document.createElement('h2');
    h.textContent = 'Führungen ohne Zeitraum';
    const ul = document.createElement('ul');
    ohneZeit.forEach(({ f }) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#fuehrungen/${encodeURIComponent(f.fuehrung_id)}/1`;
      a.textContent = f.fuehrung_titel;
      li.appendChild(a);
      ul.appendChild(li);
    });
    box.append(h, ul);
    wurzel.appendChild(box);
  }
  if (!mitZeit.length) {
    buehne.replaceWith(baueFuehrungHinweisBox('Keine Führung hat einen auswertbaren Zeitraum.'));
    return { destroy: () => { container.innerHTML = ''; I = null; } };
  }

  layout();
  ladeKarte();
  const beobachter = new ResizeObserver(() => { if (I) layout(); });
  beobachter.observe(buehne);
  return {
    destroy: () => { beobachter.disconnect(); container.innerHTML = ''; I = null; }
  };
}
