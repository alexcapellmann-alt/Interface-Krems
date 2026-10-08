// js/viz/urkundenNetzwerk.js
// AUFTRAG G1 (Freigabe des Autors, 2026-10-08): Personennetzwerk der Urkunden.
// Ein Knoten ist eine Person (Schlüssel `personen_id` aus urkunden.csv), eine
// Kante verbindet zwei Personen, die gemeinsam in einer Urkunde genannt werden.
// Kreisgröße = Zahl der Urkunden, in denen die Person genannt wird; Linienstärke
// in vier Stufen = Zahl der gemeinsamen Urkunden. Keine Gruppierung (keine
// Familien, keine sozialen Gruppen). Modul-Interface siehe Abschnitt 5.
//
// Optik nach der Netzwerkansicht der Alpha-Version (Commit d303e41, index.html
// renderNetwork(); nur als Referenz, kein Code übernommen): Radius 5 + 1,6·√Nennungen
// (5–20 px), Namen weiß mit dunkler Kontur, Personen ohne Verbindung blasser.
// Abweichend (Freigabe G1): Kanten in vier Stufen, Auswahl-Orange #b85c00,
// Kanten #858585, Grau der unsicheren Personen #767676.
//
// AUFTRAG G1b (Freigabe des Autors, 2026-10-08): Die Ansicht zeigt nur noch das
// Netz. Erklärung, „N von M Personen“ und die Netzgrenze stehen im Info-Button
// (infotexte.csv, Platzhalter beim Zeichnen berechnet; der Button entfällt nie).
// - Obergrenze nur über ansichten.csv (`obergrenze`, Vorgabe 100, Gleichstand an
//   der Grenze mitgenommen), im Netz höchstens NETZ_HOECHSTENS (gemessen in G1).
// - Namen vollständig, 11 px, unter dem Kreis. Layout „V5 kompakt“ aus Phase 1:
//   Kollisionsradius = max(Kreisradius, halbe Namensbreite) + Abstand, Namensbreite
//   per getComputedTextLength() gemessen; Personen ohne Verbindung ohne Ring.
// - Maßstab 1; Ziehen verschiebt, Mausrad zoomt nur mit Strg (sonst scrollt die
//   Seite). Ist das Netz breiter als die Ansicht (Phone), beginnt der Ausschnitt bei
//   der meistgenannten Person; der Ausschnitt folgt dem Tastaturfokus.
// - Fokus-Modus: Klick/Eingabe/Leertaste zeigt eine Person, ihre gezeigten Partner
//   und die Kanten zu ihr; alles andere tritt auf FOKUS_DECKKRAFT zurück. Zurück per
//   Hintergrund, Zweitklick oder Esc. Nur im Fokus-Modus erscheint darunter ein
//   kompakter Detailbereich (Partner mit Zahlen, Urkunden, Link zur Personenliste).
//
// Zugänglichkeit: SVG als Gruppe (kein role="img" um bedienbare Knoten); jeder
// Knoten ist ein Knopf mit Namen (Person, Nennungen, Partner), per Tab in
// Reihenfolge der Nennungen erreichbar. Das Layout wird vorab berechnet.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { erzeugeHinweisBalken } from '../utils/hinweisBalken.js';
import { infotextFuerModul } from '../core/archivKonfiguration.js';
import { baueKoNennungsNetzwerk, ermittlePersonenDerUrkunde, waehlePersonenNachNennungen } from '../utils/urkundenPersonen.js';
import { baueDatensatzLink } from '../utils/datensatzAufruf.js';
import { alsText } from '../utils/textwert.js';

const STANDARD_OBERGRENZE = 100;
// Höchstzahl im Netz. Gemessen (PROJEKTLOG Eintrag 65): 222 Personen bedienbar
// (Aufbau 0,4 s, Kreise ≥ 5 px), alle 1 456 nicht (Aufbau 3,2 s, Namen nicht mehr
// lesbar, 1 456 Tab-Stopps). Wegen der Gleichstand-Regel gilt die größte Stufe bis
// zu dieser Zahl.
const NETZ_HOECHSTENS = 250;
const FOKUS_DECKKRAFT = 0.06; // AUFTRAG G1b: zurückgenommene Knoten und Kanten im Fokus-Modus
const SCHRIFT = { groesse: 11, gewicht: 600, abstand: 2, zeilenhoehe: 14 };
const LAYOUT = { distanz: 60, linkStaerke: 0.4, ladung: -160, ladungMax: 350, abstand: 6, zug: 0.05, rand: 24 };
const NICHT_BERECHENBAR = 'nicht berechenbar';
const FARBE = { knoten: '#2c4a6e', rand: '#1a2f45', kante: '#858585', auswahl: '#b85c00', unsicher: '#767676' };
const DECKKRAFT = { verbunden: 0.72, ohneVerbindung: 0.38, auswahl: 0.95, nachbar: 0.85 };
const KANTEN_STUFEN = [
  { von: 1, bis: 1, breite: 1 }, { von: 2, bis: 2, breite: 2 },
  { von: 3, bis: 4, breite: 3.5 }, { von: 5, bis: Infinity, breite: 5 }
];
const kantenBreite = (anzahl) => KANTEN_STUFEN.find((s) => anzahl >= s.von && anzahl <= s.bis).breite;
const radius = (anzahl) => Math.max(5, Math.min(20, 5 + Math.sqrt(anzahl) * 1.6));
const nachNennungen = (a, b) => b.anzahl - a.anzahl || a.name.localeCompare(b.name, 'de');
const mitZahl = (n, einzahl, mehrzahl) => `${n.toLocaleString('de-DE')} ${n === 1 ? einzahl : mehrzahl}`;

let instanz = null;

// --- Daten ------------------------------------------------------------------

// Netz einmal je Darstellung aufbauen. Anzeigename = erste Schreibweise aus der
// Personenliste unverändert (Freigabe G1), sonst der Name aus der Urkunde.
function bereiteDatenVor(data) {
  const urkunden = Array.isArray(data) ? data : (data?.urkunden || []);
  const personenliste = Array.isArray(data?.personenliste) ? data.personenliste : [];
  const verzeichnis = new Map(personenliste.map((r) => [alsText(r.personen_id).trim(), r]));
  const { knoten, paare } = baueKoNennungsNetzwerk(urkunden);
  const urkundenJePerson = new Map();
  urkunden.forEach((urkunde) => {
    new Set(ermittlePersonenDerUrkunde(urkunde).map((p) => p.id)).forEach((id) => {
      if (!urkundenJePerson.has(id)) urkundenJePerson.set(id, []);
      urkundenJePerson.get(id).push(urkunde);
    });
  });
  knoten.forEach((k) => {
    const eintrag = verzeichnis.get(k.id);
    const schreibweise = eintrag ? (Array.isArray(eintrag.schreibweisen) ? eintrag.schreibweisen[0] : alsText(eintrag.schreibweisen)) : '';
    k.name = String(schreibweise || '').trim() || k.name;
    k.imVerzeichnis = Boolean(eintrag);
    k.unsicher = Boolean(eintrag && alsText(eintrag.unsicherheit_anmerkung).trim());
  });
  const nachId = new Map(knoten.map((k) => [k.id, k]));
  const partner = new Map(knoten.map((k) => [k.id, []]));
  paare.forEach((paar) => {
    partner.get(paar.a.id).push({ person: nachId.get(paar.b.id), paar });
    partner.get(paar.b.id).push({ person: nachId.get(paar.a.id), paar });
  });
  partner.forEach((liste) => liste.sort((x, y) => y.paar.anzahl - x.paar.anzahl || x.person.name.localeCompare(y.person.name, 'de')));
  return { knoten, paare, partner, nachId, urkundenJePerson };
}

// Gezeigte Personen: Obergrenze (mit Gleichstand), im Netz höchstens NETZ_HOECHSTENS
// (dann die größte Stufe, die noch passt).
function sichtbareMenge() {
  const { netz, grenze } = instanz;
  let { knoten: basis, schwelle } = waehlePersonenNachNennungen(netz.knoten, grenze);
  if (basis.length > NETZ_HOECHSTENS) {
    const zahlen = [...new Set(netz.knoten.map((k) => k.anzahl))].sort((a, b) => a - b);
    schwelle = zahlen.find((z) => netz.knoten.filter((k) => k.anzahl >= z).length <= NETZ_HOECHSTENS) ?? zahlen.at(-1);
    basis = basis.filter((k) => k.anzahl >= schwelle);
  }
  const ids = new Set(basis.map((k) => k.id));
  const paare = netz.paare.filter((p) => ids.has(p.a.id) && ids.has(p.b.id));
  const imNetz = new Map(basis.map((k) => [k.id, 0]));
  paare.forEach((p) => { imNetz.set(p.a.id, imNetz.get(p.a.id) + 1); imNetz.set(p.b.id, imNetz.get(p.b.id) + 1); });
  return { knoten: [...basis].sort(nachNennungen), paare, ids, schwelle, imNetz };
}

// Namensbreite gemessen (gleiche Schrift wie die Beschriftung), nicht geschätzt.
function messeNamen(ziel, knoten) {
  const svg = d3.select(ziel).append('svg').attr('width', 0).attr('height', 0).attr('aria-hidden', 'true').style('position', 'absolute');
  const text = svg.append('text').attr('font-size', SCHRIFT.groesse).attr('font-weight', SCHRIFT.gewicht);
  const breiten = new Map(knoten.map((k) => { text.text(k.name); return [k.id, text.node().getComputedTextLength()]; }));
  svg.remove();
  return breiten;
}

// Vorab berechnetes Kraftlayout „V5 kompakt“ (Phase 1, PROJEKTLOG Eintrag 66).
function berechneLayout(knoten, paare, breiten) {
  const punkte = knoten.map((k) => ({ id: k.id, person: k, r: radius(k.anzahl), w: breiten.get(k.id) || 0 }));
  const verbunden = new Set();
  paare.forEach((p) => { verbunden.add(p.a.id); verbunden.add(p.b.id); });
  punkte.forEach((p) => { p.ohneVerbindung = !verbunden.has(p.id); });
  const linien = paare.map((paar) => ({ source: paar.a.id, target: paar.b.id, paar }));
  const simulation = d3.forceSimulation(punkte)
    .force('link', d3.forceLink(linien).id((d) => d.id).distance(LAYOUT.distanz).strength(LAYOUT.linkStaerke))
    .force('charge', d3.forceManyBody().strength(LAYOUT.ladung).distanceMax(LAYOUT.ladungMax))
    .force('center', d3.forceCenter(0, 0))
    .force('collision', d3.forceCollide((d) => Math.max(d.r, d.w / 2) + LAYOUT.abstand).iterations(3))
    .force('x', d3.forceX(0).strength(LAYOUT.zug))
    .force('y', d3.forceY(0).strength(LAYOUT.zug * 1.4))
    .stop();
  for (let i = 0; i < 300; i += 1) simulation.tick();
  // Ausdehnung aus Kreisen und Namen (Name unter dem Kreis)
  const x0 = d3.min(punkte, (p) => Math.min(p.x - p.r, p.x - p.w / 2)) - LAYOUT.rand;
  const x1 = d3.max(punkte, (p) => Math.max(p.x + p.r, p.x + p.w / 2)) + LAYOUT.rand;
  const y0 = d3.min(punkte, (p) => p.y - p.r) - LAYOUT.rand;
  const y1 = d3.max(punkte, (p) => p.y + p.r + SCHRIFT.abstand + SCHRIFT.zeilenhoehe) + LAYOUT.rand;
  return { punkte, linien, grenzen: { x0, x1, y0, y1 } };
}

// --- Fokus-Modus --------------------------------------------------------------

function waehle(id) {
  instanz.auswahl = instanz.auswahl === id ? null : id;
  wendeAuswahlAn();
  zeigeDetail();
  // Gewählte Person in den Ausschnitt holen (z. B. Auswahl aus der Partnerliste auf dem Phone).
  if (instanz.auswahl) zeigeKnotenImAusschnitt(instanz.punktNachId.get(id));
}

function hebeAuswahlAuf() {
  if (!instanz.auswahl) return;
  instanz.auswahl = null;
  wendeAuswahlAn();
  zeigeDetail();
}

function knotenName(d) {
  const { auswahl, options, sichtbar, netz } = instanz;
  const p = d.person;
  let name = `${p.name}, ${mitZahl(p.anzahl, 'Nennung', 'Nennungen')}, ${mitZahl(netz.partner.get(p.id).length, 'Partner', 'Partner')}, davon ${sichtbar.imNetz.get(p.id)} im Netz`;
  if (options.showUncertainty && p.unsicher) name += ', Zuordnung unsicher';
  if (auswahl && d.id !== auswahl) {
    const verbindung = netz.partner.get(auswahl).find((x) => x.person.id === d.id);
    name += verbindung
      ? `, verbunden mit ${netz.nachId.get(auswahl).name} (${mitZahl(verbindung.paar.anzahl, 'gemeinsame Urkunde', 'gemeinsame Urkunden')})`
      : ', nicht verbunden';
  }
  return name;
}

function wendeAuswahlAn() {
  const { knotenAuswahl, kreisAuswahl, linienAuswahl, auswahl, options } = instanz;
  if (!kreisAuswahl) return;
  const nachbarn = new Set(auswahl ? instanz.netz.partner.get(auswahl).map((p) => p.person.id) : []);
  const imFokus = (id) => !auswahl || id === auswahl || nachbarn.has(id);
  const randFarbe = (d) => (options.showUncertainty && d.person.unsicher ? FARBE.unsicher : FARBE.rand);
  knotenAuswahl
    .attr('aria-pressed', (d) => String(d.id === auswahl))
    .attr('aria-label', knotenName)
    .attr('opacity', (d) => (imFokus(d.id) ? 1 : FOKUS_DECKKRAFT));
  kreisAuswahl
    .attr('fill-opacity', (d) => {
      if (!auswahl) return d.ohneVerbindung ? DECKKRAFT.ohneVerbindung : DECKKRAFT.verbunden;
      if (d.id === auswahl) return DECKKRAFT.auswahl;
      return nachbarn.has(d.id) ? DECKKRAFT.nachbar : (d.ohneVerbindung ? DECKKRAFT.ohneVerbindung : DECKKRAFT.verbunden);
    })
    .attr('stroke', (d) => (auswahl && nachbarn.has(d.id) ? FARBE.auswahl : randFarbe(d)))
    .attr('stroke-width', (d) => (d.id === auswahl ? 4 : (nachbarn.has(d.id) ? 2.5 : 1.5)));
  const zurAuswahl = (d) => auswahl && (d.source.id === auswahl || d.target.id === auswahl);
  linienAuswahl
    .attr('stroke', (d) => (zurAuswahl(d) ? FARBE.auswahl : FARBE.kante))
    .attr('stroke-width', (d) => (zurAuswahl(d) ? Math.max(2, kantenBreite(d.paar.anzahl) * 1.8) : kantenBreite(d.paar.anzahl)))
    .attr('opacity', (d) => (!auswahl || zurAuswahl(d) ? 1 : FOKUS_DECKKRAFT));
}

// Kompakter Detailbereich, nur im Fokus-Modus (Seitentext).
function zeigeDetail() {
  const { detail, auswahl, netz, sichtbar, options } = instanz;
  if (!detail) return;
  detail.innerHTML = '';
  detail.hidden = !auswahl;
  if (!auswahl) return;
  const person = netz.nachId.get(auswahl);
  const partner = netz.partner.get(auswahl);
  const urkunden = netz.urkundenJePerson.get(auswahl) || [];
  const titel = document.createElement('h2');
  titel.className = 'unetz-detail-titel';
  titel.textContent = person.name;
  const text = document.createElement('p');
  text.textContent = `${mitZahl(person.anzahl, 'Nennung', 'Nennungen')} in Urkunden, ${mitZahl(partner.length, 'Partner', 'Partner')}, davon ${sichtbar.imNetz.get(auswahl)} im Netz.`
    + `${options.showUncertainty && person.unsicher ? ' Die Zuordnung ist in der Personenliste als unsicher vermerkt.' : ''}`;
  detail.append(titel, text);
  const href = person.imVerzeichnis ? baueDatensatzLink('person', person.id) : null;
  if (href) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = 'in der Personenliste';
    detail.appendChild(a);
  }
  const liste = (ueberschrift, eintraege, bauen) => {
    if (!eintraege.length) return;
    const h = document.createElement('h3');
    h.textContent = ueberschrift;
    const ul = document.createElement('ul');
    ul.className = 'unetz-detail-liste';
    eintraege.forEach((e) => { const li = document.createElement('li'); li.appendChild(bauen(e)); ul.appendChild(li); });
    detail.append(h, ul);
  };
  liste(`Partner (${partner.length})`, partner, (x) => {
    const beschriftung = `${x.person.name} (${x.paar.anzahl})`;
    if (!sichtbar.ids.has(x.person.id)) {
      const span = document.createElement('span');
      span.textContent = `${beschriftung}, nicht im Netz`;
      return span;
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'unetz-knopf';
    b.textContent = beschriftung;
    b.setAttribute('aria-label', `${x.person.name}, ${mitZahl(x.paar.anzahl, 'gemeinsame Urkunde', 'gemeinsame Urkunden')}, im Netz zeigen`);
    b.addEventListener('click', () => { waehle(x.person.id); fokussiereKnoten(x.person.id); });
    return b;
  });
  liste(`Urkunden (${urkunden.length})`, urkunden, (u) => {
    const sig = alsText(u.signatur);
    const ziel = baueDatensatzLink('urkunde', sig);
    const a = document.createElement(ziel ? 'a' : 'span');
    if (ziel) a.href = ziel;
    a.textContent = [sig, alsText(u.datum)].filter(Boolean).join(' – ');
    return a;
  });
}

// Ausschnitt so verschieben, dass ein Knoten sichtbar ist (Tastaturfokus).
function zeigeKnotenImAusschnitt(d) {
  const { svg, zoom, ansichtGroesse } = instanz;
  const t = d3.zoomTransform(svg.node());
  const [x, y] = t.apply([d.x, d.y]);
  const rand = d.r + 20;
  if (x >= rand && x <= ansichtGroesse.breite - rand && y >= rand && y <= ansichtGroesse.hoehe - rand) return;
  svg.call(zoom.translateTo, d.x, d.y);
}

function fokussiereKnoten(id) {
  instanz.wurzel.querySelector(`[data-person-id="${CSS.escape(id)}"]`)?.focus();
}

// --- Netz ---------------------------------------------------------------------

function zeichneNetz(ziel) {
  const { options, sichtbar } = instanz;
  const breiten = messeNamen(ziel, sichtbar.knoten);
  const { punkte, linien, grenzen } = berechneLayout(sichtbar.knoten, sichtbar.paare, breiten);
  instanz.punktNachId = new Map(punkte.map((p) => [p.id, p]));
  const layoutBreite = grenzen.x1 - grenzen.x0, layoutHoehe = grenzen.y1 - grenzen.y0;
  const breite = options.width || ziel.clientWidth || instanz.container.clientWidth || 900;
  const schmal = layoutBreite > breite; // Phone: Netz breiter als die Ansicht
  const hoehe = options.height || (schmal ? Math.min(layoutHoehe, Math.max(360, Math.round(window.innerHeight * 0.75))) : layoutHoehe);
  instanz.ansichtGroesse = { breite, hoehe };
  const unsicherSichtbar = options.showUncertainty;
  const svg = d3.select(ziel).append('svg')
    .attr('class', 'unetz-svg')
    .attr('width', breite).attr('height', hoehe)
    .attr('role', 'group')
    .attr('aria-label', `Personennetzwerk der Urkunden: ${mitZahl(punkte.length, 'Person', 'Personen')}, ${mitZahl(linien.length, 'Verbindung', 'Verbindungen')}`);
  const ebene = svg.append('g');
  // Ziehen verschiebt; Mausrad nur mit Strg (sonst scrollt die Seite).
  const zoom = d3.zoom().scaleExtent([0.3, 4])
    .filter((e) => (e.type === 'wheel' ? e.ctrlKey : !e.button))
    .on('zoom', (e) => ebene.attr('transform', e.transform));
  svg.call(zoom);
  instanz.svg = svg;
  instanz.zoom = zoom;
  // Start: Maßstab 1; passt das Netz in die Breite, mittig, sonst bei der meistgenannten Person.
  const erste = punkte[0];
  const mitteX = schmal && erste ? erste.x : (grenzen.x0 + grenzen.x1) / 2;
  const mitteY = layoutHoehe > hoehe && erste ? erste.y : (grenzen.y0 + grenzen.y1) / 2;
  svg.call(zoom.transform, d3.zoomIdentity.translate(breite / 2 - mitteX, hoehe / 2 - mitteY));
  svg.on('click', (e) => { if (e.target === svg.node()) hebeAuswahlAuf(); });

  instanz.linienAuswahl = ebene.append('g').attr('class', 'unetz-kanten').selectAll('line').data(linien).join('line')
    .attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
    .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y)
    .attr('stroke-dasharray', (d) => (unsicherSichtbar && d.paar.unsicherAnzahl > 0 ? '4 3' : null))
    .on('mouseenter', function (e, d) {
      zeigeTooltip(`${d.source.person.name} ↔ ${d.target.person.name}\n${mitZahl(d.paar.anzahl, 'gemeinsame Urkunde', 'gemeinsame Urkunden')}`, this, ziel);
    })
    .on('mouseleave', () => versteckeTooltip());

  const knoten = ebene.append('g').selectAll('g').data(punkte).join('g')
    .attr('class', 'unetz-knoten')
    .attr('transform', (d) => `translate(${d.x},${d.y})`)
    .attr('data-person-id', (d) => d.id)
    .attr('role', 'button')
    .attr('tabindex', 0)
    .on('click', (e, d) => { e.stopPropagation(); waehle(d.id); })
    .on('keydown', (e, d) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); waehle(d.id); }
    })
    .on('focus', function (e, d) { zeigeKnotenImAusschnitt(d); zeigeTooltip(`${d.person.name}\n${mitZahl(d.person.anzahl, 'Nennung', 'Nennungen')}`, this, ziel); })
    .on('mouseenter', function (e, d) { zeigeTooltip(`${d.person.name}\n${mitZahl(d.person.anzahl, 'Nennung', 'Nennungen')}`, this, ziel); })
    .on('mouseleave blur', () => versteckeTooltip());
  knoten.append('circle').attr('class', 'unetz-fokusring').attr('r', (d) => d.r + 4);
  instanz.kreisAuswahl = knoten.append('circle').attr('class', 'unetz-kreis')
    .attr('r', (d) => d.r)
    .attr('fill', FARBE.knoten)
    .attr('stroke-dasharray', (d) => (unsicherSichtbar && d.person.unsicher ? '3 2' : null));
  // Name vollständig unter dem Kreis (keine Kürzung).
  knoten.append('text')
    .attr('class', 'unetz-name')
    .attr('aria-hidden', 'true')
    .attr('text-anchor', 'middle').attr('dominant-baseline', 'hanging')
    .attr('y', (d) => d.r + SCHRIFT.abstand)
    .attr('font-size', SCHRIFT.groesse).attr('font-weight', SCHRIFT.gewicht)
    .attr('fill', '#fff').attr('stroke', FARBE.rand).attr('stroke-width', 2.5).attr('paint-order', 'stroke fill')
    .attr('pointer-events', 'none')
    .text((d) => d.person.name);
  instanz.knotenAuswahl = knoten;
  wendeAuswahlAn();
}

// --- Info-Button (entfällt nie, AUFTRAG G1b) ---------------------------------

function baueInfo(leiste) {
  const { sichtbar, netz } = instanz;
  const werte = {
    netz_gezeigt: sichtbar.knoten.length,
    netz_personen: netz.knoten.length,
    netz_personen_punkt: netz.knoten.length.toLocaleString('de-DE'),
    netz_ab_nennungen: sichtbar.schwelle,
    netz_verbindungen: sichtbar.paare.length,
    netz_verbindungen_punkt: sichtbar.paare.length.toLocaleString('de-DE'),
    netz_grenze: NETZ_HOECHSTENS
  };
  infotextFuerModul('urkundenNetzwerk', werte, { ersatzFuerFehlende: NICHT_BERECHENBAR }).then((cfg) => {
    if (!instanz || !leiste.isConnected) return;
    const texte = [];
    let text = cfg?.text;
    if (!cfg || cfg.eintragFehlt) {
      text = 'Für diese Ansicht ist in infotexte.csv keine Erklärung hinterlegt.';
      texte.push('Für diese Ansicht (urkundenNetzwerk) gibt es keinen Eintrag in infotexte.csv, oder die Datei fehlt. Der Info-Button zeigt deshalb keine Erklärung.');
    } else if (cfg.fehlend.length) {
      texte.push(`Im Info-Text dieser Ansicht (infotexte.csv) konnten diese Werte nicht berechnet werden: ${cfg.fehlend.join(', ')}. Dort steht „${NICHT_BERECHENBAR}“.`);
    }
    instanz.infoButton = erzeugeInfoButton(leiste, { text, ariaLabel: cfg?.ariaLabel });
    if (texte.length) instanz.wurzel.prepend(erzeugeHinweisBalken(texte));
  });
}

// --- Aufbau -------------------------------------------------------------------

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .unetz-werkzeugleiste { display: flex; justify-content: flex-end; margin: 0 0 var(--space-2) 0; }
    .unetz-knopf { font: inherit; font-size: var(--fs-sm); min-height: 32px; padding: 2px 10px; border: 1px solid #767676;
      border-radius: var(--radius); background: var(--surface); color: var(--text); cursor: pointer; }
    .unetz-knopf:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .unetz-knoten { cursor: pointer; }
    .unetz-knoten:focus { outline: none; }
    .unetz-fokusring { fill: none; stroke: ${FARBE.rand}; stroke-width: 2.5; stroke-opacity: 0; }
    .unetz-knoten:focus-visible .unetz-fokusring { stroke-opacity: 1; }
    .unetz-svg { display: block; max-width: 100%; background: var(--bg); cursor: grab; touch-action: none; }
    .unetz-detail { margin-top: var(--space-2); font-size: var(--fs-sm); }
    .unetz-detail p { margin: 0 0 var(--space-1) 0; }
    .unetz-detail-titel { font-size: var(--fs-h3); margin: 0 0 var(--space-1) 0; }
    .unetz-detail h3 { font-size: var(--fs-sm); margin: var(--space-2) 0 var(--space-1) 0; }
    .unetz-detail-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-2); max-height: 9em; overflow-y: auto; }
  `;
  container.appendChild(style);
}

function zeichne() {
  if (!instanz) return;
  versteckeTooltip();
  if (instanz.infoButton) { instanz.infoButton.destroy(); instanz.infoButton = null; }
  const { container } = instanz;
  container.innerHTML = '';
  instanz.kreisAuswahl = null;
  fuegeStyleEin(container);
  const wurzel = document.createElement('div');
  wurzel.className = 'unetz-wurzel';
  wurzel.addEventListener('keydown', (e) => { if (e.key === 'Escape' && instanz?.auswahl) { e.preventDefault(); hebeAuswahlAuf(); } });
  container.appendChild(wurzel);
  instanz.wurzel = wurzel;
  instanz.sichtbar = sichtbareMenge();
  const leiste = document.createElement('div');
  leiste.className = 'unetz-werkzeugleiste';
  wurzel.appendChild(leiste);
  const ziel = document.createElement('div');
  ziel.className = 'unetz-ziel';
  wurzel.appendChild(ziel);
  instanz.detail = document.createElement('section');
  instanz.detail.className = 'unetz-detail';
  instanz.detail.setAttribute('aria-label', 'Ausgewählte Person');
  wurzel.appendChild(instanz.detail);
  if (instanz.auswahl && !instanz.sichtbar.ids.has(instanz.auswahl)) instanz.auswahl = null;
  zeichneNetz(ziel);
  zeigeDetail();
  baueInfo(leiste);
}

export function render(container, data, options = {}) {
  if (instanz) destroy();
  instanz = {
    container, options: { showUncertainty: false, width: null, height: null, ...options },
    netz: bereiteDatenVor(data), grenze: options.obergrenze || STANDARD_OBERGRENZE, auswahl: null, infoButton: null
  };
  zeichne();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichne();
}

export function destroy() {
  if (!instanz) return;
  versteckeTooltip();
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
