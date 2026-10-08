// js/viz/urkundenNetzwerk.js
// AUFTRAG G1 (Freigabe des Autors, 2026-10-08): Personennetzwerk der Urkunden.
// Ein Knoten ist eine Person (Schlüssel `personen_id` aus urkunden.csv), eine
// Kante verbindet zwei Personen, die gemeinsam in einer Urkunde genannt werden.
// Kreisgröße = Zahl der Urkunden, in denen die Person genannt wird; Linienstärke
// in vier Stufen = Zahl der gemeinsamen Urkunden. Keine Gruppierung (keine
// Familien, keine sozialen Gruppen). Modul-Interface siehe Abschnitt 5.
//
// Optik und Skalen nach der Netzwerkansicht der Alpha-Version (Commit d303e41,
// index.html renderNetwork(); nur als Referenz, kein Code übernommen):
// Radius 5 + 1,6·√Nennungen (5–20 px), Kraftlayout mit denselben Parametern,
// Personen ohne Verbindung am Rand und blasser, Namen weiß mit dunkler Kontur.
// Abweichend (Freigabe): Kanten in vier Stufen statt freier Skala, Auswahl-Orange
// #b85c00 statt #e07820 (3:1), Kanten #858585 statt Rahmengrau (3:1), Grau der
// unsicheren Personen #767676.
//
// Obergrenze (Masterprompt: nichts stillschweigend ausblenden): gezeigt werden
// zunächst die meistgenannten Personen - Zahl aus ansichten.csv (`obergrenze`,
// Vorgabe 100), bei Gleichstand an der Grenze alle mit derselben Zahl. Über dem
// Netz steht "N von M Personen gezeigt"; "50 weitere", "Alle" und die Suche
// blenden weitere Personen ein. Die Tabelle zeigt dieselben Personen.
//
// Zugänglichkeit: SVG als Gruppe (kein role="img" um bedienbare Knoten); jeder
// Knoten ist ein Knopf mit Namen (Person, Nennungen, Partner), per Tab in
// Reihenfolge der Nennungen erreichbar, Eingabe/Leertaste wählt, Escape hebt auf.
// Das Layout wird vorab berechnet (keine Animation, auch ohne reduced motion).

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { infotextFuerModul } from '../core/archivKonfiguration.js';
import { baueKoNennungsNetzwerk, ermittlePersonenDerUrkunde, waehlePersonenNachNennungen } from '../utils/urkundenPersonen.js';
import { baueDatensatzLink } from '../utils/datensatzAufruf.js';
import { alsText } from '../utils/textwert.js';

const STANDARD_OBERGRENZE = 100;
const SCHRITT_WEITERE = 50;
// Höchstzahl im NETZ (nicht in der Tabelle). Gemessen (PROJEKTLOG Eintrag 65):
// 222 Personen bedienbar (Aufbau 0,4 s, Kreise ≥ 5 px), alle 1 456 nicht (Aufbau
// 3,2 s, Namen nicht mehr lesbar, 1 456 Tab-Stopps). Wegen der Gleichstand-Regel gilt die
// größte Stufe bis zu dieser Zahl (Krems: 222 = alle ab 2 Nennungen).
const NETZ_HOECHSTENS = 250;
const FARBE = { knoten: '#2c4a6e', rand: '#1a2f45', kante: '#858585', auswahl: '#b85c00', unsicher: '#767676' };
const DECKKRAFT = { verbunden: 0.72, ohneVerbindung: 0.38, auswahl: 0.95, nachbar: 0.85, abgeblendet: 0.2 };
const KANTEN_STUFEN = [
  { von: 1, bis: 1, breite: 1, text: '1 gemeinsame Urkunde' },
  { von: 2, bis: 2, breite: 2, text: '2' },
  { von: 3, bis: 4, breite: 3.5, text: '3–4' },
  { von: 5, bis: Infinity, breite: 5, text: '5 und mehr' }
];
const kantenBreite = (anzahl) => KANTEN_STUFEN.find((s) => anzahl >= s.von && anzahl <= s.bis).breite;
const radius = (anzahl) => Math.max(5, Math.min(20, 5 + Math.sqrt(anzahl) * 1.6));
const nachNennungen = (a, b) => b.anzahl - a.anzahl || a.name.localeCompare(b.name, 'de');
const mitZahl = (n, einzahl, mehrzahl) => `${n.toLocaleString('de-DE')} ${n === 1 ? einzahl : mehrzahl}`;

let instanz = null;

// --- Daten ------------------------------------------------------------------

// Netz einmal je Darstellung aufbauen. Anzeigename = erste Schreibweise aus der
// Personenliste unverändert (Freigabe), sonst der Name aus der Urkunde.
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

// Gezeigte Personen: Obergrenze (mit Gleichstand) plus über die Suche
// eingeblendete Personen samt ihren Partnern.
function sichtbareMenge() {
  const { netz, grenze, zusatz, ansicht } = instanz;
  let { knoten: basis, schwelle } = waehlePersonenNachNennungen(netz.knoten, grenze);
  // Im Netz höchstens NETZ_HOECHSTENS: kleinste Nennungszahl, bei der die Stufe noch passt.
  let gekappt = false;
  let netzVoll = false; // Netz zeigt schon die größte erlaubte Stufe
  if (ansicht === 'netz') {
    const zahlen = [...new Set(netz.knoten.map((k) => k.anzahl))].sort((a, b) => a - b);
    const hoechsteSchwelle = zahlen.find((z) => netz.knoten.filter((k) => k.anzahl >= z).length <= NETZ_HOECHSTENS) ?? zahlen.at(-1);
    if (basis.length > NETZ_HOECHSTENS) {
      schwelle = hoechsteSchwelle;
      basis = basis.filter((k) => k.anzahl >= schwelle);
      gekappt = true;
    }
    netzVoll = schwelle <= hoechsteSchwelle && basis.length < netz.knoten.length;
  }
  const ids = new Set(basis.map((k) => k.id));
  let perSuche = 0;
  zusatz.forEach((id) => {
    [id, ...netz.partner.get(id).map((p) => p.person.id)].forEach((x) => {
      if (!ids.has(x)) { ids.add(x); perSuche += 1; }
    });
  });
  const knoten = [...ids].map((id) => netz.nachId.get(id)).sort(nachNennungen);
  const paare = netz.paare.filter((p) => ids.has(p.a.id) && ids.has(p.b.id));
  return { knoten, paare, ids, schwelle, basisAnzahl: basis.length, perSuche, gekappt, netzVoll, alle: basis.length >= netz.knoten.length };
}

// Vorab berechnetes Kraftlayout (Parameter wie Alpha). Bekannte Positionen
// bleiben Startwerte, damit sich beim Einblenden nicht alles verschiebt.
function berechneLayout(knoten, paare, breite, hoehe) {
  const verbunden = new Set();
  paare.forEach((p) => { verbunden.add(p.a.id); verbunden.add(p.b.id); });
  const punkte = knoten.map((k) => {
    const alt = instanz.positionen.get(k.id);
    return { id: k.id, person: k, ohneVerbindung: !verbunden.has(k.id), x: alt?.x, y: alt?.y };
  });
  const linien = paare.map((paar) => ({ source: paar.a.id, target: paar.b.id, paar }));
  const aussen = Math.min(breite, hoehe) * 0.42;
  const simulation = d3.forceSimulation(punkte)
    .force('link', d3.forceLink(linien).id((d) => d.id).distance(36).strength(0.55))
    .force('charge', d3.forceManyBody().strength(-60).distanceMax(160))
    .force('center', d3.forceCenter(breite / 2, hoehe / 2))
    .force('collision', d3.forceCollide((d) => radius(d.person.anzahl) + 2))
    .force('radial', d3.forceRadial((d) => (d.ohneVerbindung ? aussen : 0), breite / 2, hoehe / 2).strength((d) => (d.ohneVerbindung ? 0.55 : 0)))
    .stop();
  const schritte = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay()));
  for (let i = 0; i < schritte; i += 1) simulation.tick();
  punkte.forEach((p) => instanz.positionen.set(p.id, { x: p.x, y: p.y }));
  return { punkte, linien };
}

// --- Bedienung ----------------------------------------------------------------

function knopf(text, beiKlick, { gedrueckt = null, deaktiviert = false } = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'unetz-knopf';
  b.textContent = text;
  if (gedrueckt !== null) b.setAttribute('aria-pressed', String(gedrueckt));
  b.disabled = deaktiviert;
  b.addEventListener('click', beiKlick);
  return b;
}

function setzeGrenze(neu) {
  instanz.grenze = neu;
  zeichne();
}

function waehle(id, { fokus = false } = {}) {
  if (!instanz.sichtbar.ids.has(id)) {
    instanz.zusatz.add(id);
    instanz.auswahl = id;
    zeichne();
  } else {
    instanz.auswahl = instanz.auswahl === id ? null : id;
    wendeAuswahlAn();
    zeigeDetail();
  }
  if (fokus) instanz.wurzel.querySelector(`[data-person-id="${CSS.escape(id)}"]`)?.focus();
}

function hebeAuswahlAuf() {
  instanz.auswahl = null;
  wendeAuswahlAn();
  zeigeDetail();
}

function baueSuche() {
  const box = document.createElement('div');
  box.className = 'unetz-suche';
  const label = document.createElement('label');
  label.htmlFor = 'unetz-suchfeld';
  label.textContent = 'Person suchen';
  const feld = document.createElement('input');
  feld.type = 'search';
  feld.id = 'unetz-suchfeld';
  feld.autocomplete = 'off';
  const status = document.createElement('p');
  status.className = 'unetz-suchstatus';
  status.setAttribute('role', 'status');
  const treffer = document.createElement('ul');
  treffer.className = 'unetz-treffer';
  const suche = () => {
    const q = feld.value.trim().toLowerCase();
    treffer.innerHTML = '';
    if (!q) { status.textContent = ''; return; }
    const gefunden = instanz.netz.knoten.filter((k) => k.name.toLowerCase().includes(q)).sort(nachNennungen);
    status.textContent = gefunden.length === 0 ? 'Keine Person gefunden.'
      : `${mitZahl(gefunden.length, 'Person', 'Personen')} gefunden${gefunden.length > 10 ? ', die ersten 10 stehen unten' : ''}.`;
    gefunden.slice(0, 10).forEach((k) => {
      const li = document.createElement('li');
      li.appendChild(knopf(`${k.name} (${mitZahl(k.anzahl, 'Nennung', 'Nennungen')}) einblenden`, () => waehle(k.id, { fokus: true })));
      treffer.appendChild(li);
    });
  };
  feld.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); suche(); } });
  box.append(label, feld, knopf('Suchen', suche), status, treffer);
  return box;
}

function baueWerkzeugleiste() {
  const { sichtbar, grenze, zusatz, ansicht, netz, standard } = instanz;
  const leiste = document.createElement('div');
  leiste.className = 'unetz-werkzeugleiste';
  const umschalter = document.createElement('div');
  umschalter.setAttribute('role', 'group');
  umschalter.setAttribute('aria-label', 'Darstellung');
  umschalter.append(
    knopf('Netz', () => { instanz.ansicht = 'netz'; zeichne(); }, { gedrueckt: ansicht === 'netz' }),
    knopf('Tabelle', () => { instanz.ansicht = 'tabelle'; zeichne(); }, { gedrueckt: ansicht === 'tabelle' })
  );
  const mehr = document.createElement('div');
  mehr.setAttribute('role', 'group');
  mehr.setAttribute('aria-label', 'Weitere Personen');
  const amEnde = sichtbar.alle || sichtbar.gekappt || sichtbar.netzVoll;
  mehr.append(
    knopf(`${SCHRITT_WEITERE} weitere`, () => setzeGrenze(sichtbar.basisAnzahl + SCHRITT_WEITERE), { deaktiviert: amEnde }),
    knopf('Alle', () => setzeGrenze(Infinity), { deaktiviert: amEnde }),
    knopf('Übersicht', () => { instanz.zusatz.clear(); instanz.auswahl = null; setzeGrenze(standard); },
      { deaktiviert: grenze === standard && zusatz.size === 0 && !instanz.auswahl })
  );
  const info = document.createElement('div');
  info.className = 'unetz-info';
  leiste.append(umschalter, mehr, baueSuche(), info);
  infotextFuerModul('urkundenNetzwerk').then((cfg) => {
    if (!instanz || !cfg || !info.isConnected) return;
    instanz.infoButton = erzeugeInfoButton(info, cfg);
  });
  const hinweis = document.createElement('p');
  hinweis.className = 'unetz-hinweis';
  const m = netz.knoten.length;
  hinweis.textContent = sichtbar.alle
    ? `Alle ${m.toLocaleString('de-DE')} Personen gezeigt (${mitZahl(sichtbar.paare.length, 'Verbindung', 'Verbindungen')}).`
    : `${sichtbar.knoten.length.toLocaleString('de-DE')} von ${m.toLocaleString('de-DE')} Personen gezeigt: die ${sichtbar.basisAnzahl} meistgenannten (ab ${mitZahl(sichtbar.schwelle, 'Nennung', 'Nennungen')})`
      + `${sichtbar.perSuche ? `, dazu ${sichtbar.perSuche} über die Suche` : ''}; ${mitZahl(sichtbar.paare.length, 'Verbindung', 'Verbindungen')}.`;
  if (sichtbar.gekappt || sichtbar.netzVoll) {
    hinweis.textContent += ` Das Netz zeigt höchstens ${NETZ_HOECHSTENS} Personen, weil es darüber nicht mehr lesbar und per Tastatur bedienbar ist.`
      + ` Alle ${m.toLocaleString('de-DE')} Personen stehen in der Tabelle; die Suche blendet jede Person mit ihren Partnern ein.`;
  }
  return [leiste, hinweis];
}

function baueLegende() {
  const legende = document.createElement('div');
  legende.className = 'unetz-legende';
  const zeile = (svgInhalt, text) => {
    const span = document.createElement('span');
    span.className = 'unetz-legende-eintrag';
    span.innerHTML = `<svg width="34" height="14" aria-hidden="true" focusable="false">${svgInhalt}</svg>`;
    span.append(text);
    return span;
  };
  const titel = document.createElement('span');
  titel.textContent = 'Kreisgröße: Zahl der Nennungen in Urkunden. Linienstärke, gemeinsame Urkunden:';
  legende.appendChild(titel);
  KANTEN_STUFEN.forEach((s) => legende.appendChild(zeile(`<line x1="2" y1="7" x2="32" y2="7" stroke="${FARBE.kante}" stroke-width="${s.breite}"/>`, s.text)));
  legende.appendChild(zeile(`<circle cx="17" cy="7" r="5.5" fill="${FARBE.knoten}" fill-opacity="${DECKKRAFT.ohneVerbindung}" stroke="${FARBE.rand}" stroke-width="1.5"/>`,
    'blasser, am Rand: ohne Verbindung zu den anderen gezeigten Personen'));
  if (instanz.options.showUncertainty) {
    legende.appendChild(zeile(`<circle cx="17" cy="7" r="5.5" fill="${FARBE.knoten}" fill-opacity="${DECKKRAFT.verbunden}" stroke="${FARBE.unsicher}" stroke-width="1.5" stroke-dasharray="3 2"/>`,
      'gestrichelter Rand: Zuordnung in der Personenliste als unsicher vermerkt'));
    legende.appendChild(zeile(`<line x1="2" y1="7" x2="32" y2="7" stroke="${FARBE.kante}" stroke-width="2" stroke-dasharray="4 3"/>`,
      'gestrichelte Linie: gemeinsame Urkunde mit unsicherer Personenangabe'));
  }
  return legende;
}

// --- Netz ---------------------------------------------------------------------

function zeichneNetz(ziel) {
  const { options, sichtbar } = instanz;
  const breite = options.width || ziel.clientWidth || instanz.container.clientWidth || 900;
  const hoehe = options.height || 640;
  const { punkte, linien } = berechneLayout(sichtbar.knoten, sichtbar.paare, breite, hoehe);
  const unsicherSichtbar = options.showUncertainty;
  // Ausschnitt an die tatsächliche Ausdehnung anpassen (das Layout kann über den
  // Rand hinausreichen), damit keine Person angeschnitten ist.
  const rand = 24;
  const xs = punkte.map((p) => p.x), ys = punkte.map((p) => p.y);
  const [x0, x1, y0, y1] = punkte.length
    ? [Math.min(...xs) - rand - 20, Math.max(...xs) + rand + 20, Math.min(...ys) - rand - 20, Math.max(...ys) + rand + 20]
    : [0, breite, 0, hoehe];
  const svg = d3.select(ziel).append('svg')
    .attr('class', 'unetz-svg')
    .attr('width', breite).attr('height', hoehe).attr('viewBox', `${x0} ${y0} ${x1 - x0} ${y1 - y0}`)
    .attr('role', 'group')
    .attr('aria-label', `Personennetzwerk der Urkunden: ${mitZahl(punkte.length, 'Person', 'Personen')}, ${mitZahl(linien.length, 'Verbindung', 'Verbindungen')}`);
  const ebene = svg.append('g');
  svg.call(d3.zoom().scaleExtent([0.3, 4]).on('zoom', (e) => ebene.attr('transform', e.transform)));
  svg.on('click', (e) => { if (e.target === svg.node()) hebeAuswahlAuf(); });

  instanz.linienAuswahl = ebene.append('g').selectAll('line').data(linien).join('line')
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
    .attr('aria-label', (d) => {
      const p = d.person;
      return `${p.name}, ${mitZahl(p.anzahl, 'Nennung', 'Nennungen')}, ${mitZahl(instanz.netz.partner.get(p.id).length, 'Partner', 'Partner')}`
        + `${unsicherSichtbar && p.unsicher ? ', Zuordnung unsicher' : ''}`;
    })
    .on('click', (e, d) => { e.stopPropagation(); waehle(d.id); })
    .on('keydown', (e, d) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); waehle(d.id); }
      if (e.key === 'Escape') { e.preventDefault(); hebeAuswahlAuf(); }
    })
    .on('mouseenter focus', function (e, d) { zeigeTooltip(`${d.person.name}\n${mitZahl(d.person.anzahl, 'Nennung', 'Nennungen')}`, this, ziel); })
    .on('mouseleave blur', () => versteckeTooltip());
  knoten.append('circle').attr('class', 'unetz-fokusring').attr('r', (d) => radius(d.person.anzahl) + 4);
  instanz.kreisAuswahl = knoten.append('circle').attr('class', 'unetz-kreis')
    .attr('r', (d) => radius(d.person.anzahl))
    .attr('fill', FARBE.knoten)
    .attr('stroke-dasharray', (d) => (unsicherSichtbar && d.person.unsicher ? '3 2' : null));
  knoten.append('text')
    .attr('aria-hidden', 'true')
    .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
    .attr('font-size', (d) => Math.min(10, Math.max(6, radius(d.person.anzahl) * 0.75)))
    .attr('fill', '#fff').attr('stroke', FARBE.rand).attr('stroke-width', 2.5).attr('paint-order', 'stroke fill')
    .attr('pointer-events', 'none')
    .text((d) => {
      const max = Math.floor(radius(d.person.anzahl) * 1.5);
      return d.person.name.length > max ? `${d.person.name.slice(0, max)}…` : d.person.name;
    });
  instanz.knotenAuswahl = knoten;
  wendeAuswahlAn();
}

function wendeAuswahlAn() {
  const { kreisAuswahl, linienAuswahl, knotenAuswahl, auswahl, options } = instanz;
  if (!kreisAuswahl) return;
  const nachbarn = new Set(auswahl ? instanz.netz.partner.get(auswahl).map((p) => p.person.id) : []);
  const randFarbe = (d) => (options.showUncertainty && d.person.unsicher ? FARBE.unsicher : FARBE.rand);
  knotenAuswahl.attr('aria-pressed', (d) => String(d.id === auswahl));
  kreisAuswahl
    .attr('fill-opacity', (d) => {
      if (!auswahl) return d.ohneVerbindung ? DECKKRAFT.ohneVerbindung : DECKKRAFT.verbunden;
      if (d.id === auswahl) return DECKKRAFT.auswahl;
      return nachbarn.has(d.id) ? DECKKRAFT.nachbar : DECKKRAFT.abgeblendet;
    })
    .attr('stroke', (d) => (auswahl && nachbarn.has(d.id) ? FARBE.auswahl : randFarbe(d)))
    .attr('stroke-width', (d) => (d.id === auswahl ? 4 : (nachbarn.has(d.id) ? 2.5 : 1.5)));
  const beteiligt = (d) => auswahl && (d.source.id === auswahl || d.target.id === auswahl);
  linienAuswahl
    .attr('stroke', (d) => (beteiligt(d) ? FARBE.auswahl : FARBE.kante))
    .attr('stroke-width', (d) => (beteiligt(d) ? Math.max(2, kantenBreite(d.paar.anzahl) * 1.8) : (auswahl ? 1 : kantenBreite(d.paar.anzahl))));
}

// --- Tabelle ------------------------------------------------------------------

function zeichneTabelle(ziel) {
  const { sichtbar, netz, options } = instanz;
  const tabelle = document.createElement('table');
  tabelle.className = 'unetz-tabelle';
  const caption = document.createElement('caption');
  caption.textContent = `Personen im Urkunden-Netzwerk (${sichtbar.knoten.length.toLocaleString('de-DE')} von ${netz.knoten.length.toLocaleString('de-DE')})`;
  tabelle.appendChild(caption);
  const kopf = tabelle.createTHead().insertRow();
  ['Person', 'Nennungen', 'Partner', 'Häufigste Partner (gemeinsame Urkunden)', 'Personenliste'].forEach((t) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = t;
    kopf.appendChild(th);
  });
  const rumpf = tabelle.createTBody();
  sichtbar.knoten.forEach((p) => {
    const zeile = rumpf.insertRow();
    const name = document.createElement('th');
    name.scope = 'row';
    name.appendChild(knopf(`${p.name}${options.showUncertainty && p.unsicher ? ' (Zuordnung unsicher)' : ''}`, () => { instanz.auswahl = p.id; zeigeDetail(); }));
    zeile.appendChild(name);
    const partner = netz.partner.get(p.id);
    zeile.insertCell().textContent = p.anzahl;
    zeile.insertCell().textContent = partner.length;
    zeile.insertCell().textContent = partner.slice(0, 3).map((x) => `${x.person.name} (${x.paar.anzahl})`).join(', ') || '–';
    const link = zeile.insertCell();
    const href = p.imVerzeichnis ? baueDatensatzLink('person', p.id) : null;
    if (href) {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = 'Eintrag';
      a.setAttribute('aria-label', `${p.name} in der Personenliste`);
      link.appendChild(a);
    } else link.textContent = '–';
  });
  ziel.appendChild(tabelle);
}

// --- Detail der ausgewählten Person (Seitentext) ----------------------------

function zeigeDetail() {
  const { detail, auswahl, netz } = instanz;
  if (!detail) return;
  detail.innerHTML = '';
  if (!auswahl) {
    const p = document.createElement('p');
    p.className = 'unetz-hinweis';
    p.textContent = 'Eine Person wählen (Klick, Eingabe- oder Leertaste), um ihre Partner und Urkunden zu sehen.';
    detail.appendChild(p);
    return;
  }
  const person = netz.nachId.get(auswahl);
  const partner = netz.partner.get(auswahl);
  const urkunden = netz.urkundenJePerson.get(auswahl) || [];
  const titel = document.createElement('h2');
  titel.className = 'unetz-detail-titel';
  titel.textContent = person.name;
  const text = document.createElement('p');
  text.textContent = `${mitZahl(person.anzahl, 'Nennung', 'Nennungen')} in Urkunden, ${mitZahl(partner.length, 'Partner', 'Partner')}.`
    + `${instanz.options.showUncertainty && person.unsicher ? ' Die Zuordnung ist in der Personenliste als unsicher vermerkt.' : ''}`;
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
  liste(`Partner (${partner.length})`, partner, (x) => knopf(`${x.person.name} (${mitZahl(x.paar.anzahl, 'gemeinsame Urkunde', 'gemeinsame Urkunden')})`, () => waehle(x.person.id, { fokus: true })));
  liste(`Urkunden (${urkunden.length})`, urkunden, (u) => {
    const sig = alsText(u.signatur);
    const ziel = baueDatensatzLink('urkunde', sig);
    const a = document.createElement(ziel ? 'a' : 'span');
    if (ziel) a.href = ziel;
    a.textContent = [sig, alsText(u.datum)].filter(Boolean).join(' – ');
    return a;
  });
}

// --- Aufbau -------------------------------------------------------------------

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .unetz-werkzeugleiste { display: flex; flex-wrap: wrap; align-items: flex-start; gap: var(--space-3); margin: 0 0 var(--space-2) 0; }
    .unetz-werkzeugleiste [role=group] { display: flex; gap: var(--space-1); }
    .unetz-knopf { font: inherit; font-size: var(--fs-sm); min-height: 36px; padding: 4px 12px; border: 1px solid #767676;
      border-radius: var(--radius); background: var(--surface); color: var(--text); cursor: pointer; }
    .unetz-knopf[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: #fff; }
    .unetz-knopf:disabled { cursor: default; color: var(--text-muted); }
    .unetz-knopf:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .unetz-suche { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1); font-size: var(--fs-sm); }
    .unetz-suche input { font: inherit; min-height: 36px; border: 1px solid #767676; border-radius: var(--radius); padding: 0 8px; }
    .unetz-suchstatus { flex-basis: 100%; margin: 0; }
    .unetz-treffer { flex-basis: 100%; list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-1); }
    .unetz-info { margin-left: auto; }
    .unetz-hinweis { font-size: var(--fs-sm); color: var(--text-muted); margin: 0 0 var(--space-2) 0; }
    .unetz-legende { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-3); font-size: var(--fs-sm); margin: 0 0 var(--space-2) 0; }
    .unetz-legende-eintrag { display: inline-flex; align-items: center; gap: 4px; }
    .unetz-knoten { cursor: pointer; }
    .unetz-knoten:focus { outline: none; }
    .unetz-fokusring { fill: none; stroke: ${FARBE.rand}; stroke-width: 2.5; stroke-opacity: 0; }
    .unetz-knoten:focus-visible .unetz-fokusring { stroke-opacity: 1; }
    .unetz-svg { display: block; max-width: 100%; height: auto; background: var(--bg); }
    .unetz-tabelle { border-collapse: collapse; font-size: var(--fs-sm); width: 100%; }
    .unetz-tabelle caption { text-align: left; font-weight: 600; margin-bottom: var(--space-1); }
    .unetz-tabelle th, .unetz-tabelle td { border-bottom: 1px solid var(--border); padding: 4px 8px; text-align: left; vertical-align: top; }
    .unetz-tabelle th[scope=row] .unetz-knopf { border: none; background: none; padding: 0; min-height: 0; text-align: left; text-decoration: underline; }
    .unetz-detail { margin-top: var(--space-3); }
    .unetz-detail-titel { font-size: var(--fs-h3); margin: 0 0 var(--space-1) 0; }
    .unetz-detail h3 { font-size: var(--fs-md); margin: var(--space-3) 0 var(--space-1) 0; }
    .unetz-detail-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-2); max-height: 16em; overflow-y: auto; }
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
  container.appendChild(wurzel);
  instanz.wurzel = wurzel;
  instanz.sichtbar = sichtbareMenge();
  wurzel.append(...baueWerkzeugleiste());
  if (instanz.ansicht === 'netz') wurzel.appendChild(baueLegende());
  const ziel = document.createElement('div');
  ziel.className = 'unetz-ziel';
  wurzel.appendChild(ziel);
  if (instanz.ansicht === 'tabelle') zeichneTabelle(ziel); else zeichneNetz(ziel);
  instanz.detail = document.createElement('section');
  instanz.detail.className = 'unetz-detail';
  instanz.detail.setAttribute('aria-label', 'Ausgewählte Person');
  wurzel.appendChild(instanz.detail);
  zeigeDetail();
}

export function render(container, data, options = {}) {
  if (instanz) destroy();
  const standard = options.obergrenze || STANDARD_OBERGRENZE;
  instanz = {
    container, options: { showUncertainty: false, width: null, height: null, ...options },
    netz: bereiteDatenVor(data), standard, grenze: standard, zusatz: new Set(), auswahl: null,
    ansicht: 'netz', positionen: new Map(), infoButton: null
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
