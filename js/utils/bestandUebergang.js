// js/utils/bestandUebergang.js
// Fließende Übergänge zwischen den Bestand-Ansichten (Wunsch des Autors, 2026-10-28, „Bestand-Bühne“):
// Treemap, Sunburst und Gantt-Diagramm (Einzelbestände oder Kategorien) zeigen dieselben Bestände. Vor dem
// Wechsel wird der Umriss jedes Bestands auf dem Bildschirm festgehalten (erfasseFormen()), nach dem
// Zeichnen der neuen Ansicht verwandelt sich jeder Umriss in seinen neuen (spieleUebergang()): Kachel in
// Balken, Kachel in Ringsegment, Balken in Kategorieband und zurück.
// Die Module selbst bleiben unverändert und voll bedienbar - der Übergang ist eine Überlagerung, die nach
// dem Ende verschwindet, während die neue Ansicht einblendet.
//
// Zuordnung über die an die SVG-Formen gebundenen d3-Hierarchieknoten (alle drei Module): Tiefe 3 =
// Bestand (Schlüssel = Kürzel), Tiefe 1 = Kategorie, Tiefe 2 = Unterkategorie. Gibt es eine Form in der
// anderen Ansicht nicht (z. B. Einzelbestände -> Kategorien), wandert sie zur Form ihrer Kategorie bzw.
// kommt aus ihr. Jeder Umriss wird als Polygon aus gleich vielen Punkten abgetastet und Punkt für Punkt
// überblendet (gleiche Umlaufrichtung, Start am oberen linken Punkt) - so geht auch Rechteck in Bogen.

const FORMEN = 'rect.bestand-rand, rect.kategorie-rahmen-rect, path.sunburst-pfad, rect.gantt-balken, '
  + 'rect.gantt-ohne-zeitraum-sichtbar, path.gantt-kategorie-band';
const PUNKTE = 24;
const DAUER = 900;
const MAX_FORMEN = 700;

const istKnoten = (d) => d && typeof d === 'object' && typeof d.leaves === 'function';

function schluessel(d) {
  if (!d) return null;
  if (d.depth >= 3 || !d.children) return d.data?.record?.kuerzel ? `b:${d.data.record.kuerzel}` : null;
  const kette = d.ancestors().reverse().slice(1).map((a) => a.data?.name ?? '');
  return `${d.depth === 1 ? 'k' : 'u'}:${kette.join('/')}`;
}

// Schlüssel der übergeordneten Knoten, vom nächsten zum entferntesten (Unterkategorie, Kategorie)
const vorfahrenSchluessel = (d) => d.ancestors().slice(1).filter((a) => a.depth >= 1).map(schluessel);

function farbeVon(el) {
  const fuellung = el.getAttribute('fill');
  if (fuellung && fuellung !== 'none' && fuellung !== 'transparent' && !fuellung.startsWith('url(')) return fuellung;
  const rand = el.getAttribute('stroke');
  return rand && rand !== 'none' ? rand : '#9a9a9a';
}

// Umriss als Polygon in Bildschirmkoordinaten
function tasteAb(el) {
  const m = el.getScreenCTM();
  if (!m) return null;
  const punkt = (x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
  let roh = [];
  if (el.tagName.toLowerCase() === 'rect') {
    const x = +el.getAttribute('x') || 0;
    const y = +el.getAttribute('y') || 0;
    const w = +el.getAttribute('width') || 0;
    const h = +el.getAttribute('height') || 0;
    if (w <= 0 || h <= 0) return null;
    const umfang = 2 * (w + h);
    for (let i = 0; i < PUNKTE; i += 1) {
      let t = (i / PUNKTE) * umfang;
      if (t < w) roh.push(punkt(x + t, y));
      else if ((t -= w) < h) roh.push(punkt(x + w, y + t));
      else if ((t -= h) < w) roh.push(punkt(x + w - t, y + h));
      else roh.push(punkt(x, y + h - (t - w)));
    }
  } else {
    let laenge = 0;
    try { laenge = el.getTotalLength(); } catch { return null; }
    if (!laenge) return null;
    for (let i = 0; i < PUNKTE; i += 1) {
      const p = el.getPointAtLength((i / PUNKTE) * laenge);
      roh.push(punkt(p.x, p.y));
    }
  }
  // gleiche Umlaufrichtung (im Uhrzeigersinn) und Start am obersten linken Punkt
  const flaeche = roh.reduce((s, p, i) => { const q = roh[(i + 1) % roh.length]; return s + (p[0] * q[1] - q[0] * p[1]); }, 0);
  if (flaeche < 0) roh = roh.reverse();
  let start = 0;
  roh.forEach((p, i) => { if (p[0] + p[1] < roh[start][0] + roh[start][1]) start = i; });
  roh = [...roh.slice(start), ...roh.slice(0, start)];
  const xs = roh.map((p) => p[0]);
  const ys = roh.map((p) => p[1]);
  return { punkte: roh, flaeche: Math.abs(flaeche) / 2, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
}

const sichtbar = (box) => box[2] > -50 && box[0] < window.innerWidth + 50 && box[3] > -50 && box[1] < window.innerHeight + 50;

// Festhalten: je Schlüssel die größte Form (eine Kachel besteht teils aus mehreren Formen). Auch Formen
// außerhalb des Fensters (lange Gantt-Liste) - sie fliegen beim Übergang von dort herein bzw. hinaus.
export function erfasseFormen(container) {
  const formen = new Map();
  if (!container) return formen;
  container.querySelectorAll(FORMEN).forEach((el) => {
    const d = el.__data__;
    if (!istKnoten(d)) return;
    const key = schluessel(d);
    if (!key) return;
    const umriss = tasteAb(el);
    if (!umriss) return;
    const bisher = formen.get(key);
    if (bisher && bisher.flaeche >= umriss.flaeche) return;
    formen.set(key, { ...umriss, farbe: farbeVon(el), vorfahren: vorfahrenSchluessel(d) });
  });
  return formen;
}

const ohneAnimation = () => document.hidden || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const pfad = (punkte) => `M${punkte.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}Z`;
const mische = (a, b, t) => a.map((p, i) => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t]);
const sanft = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Übergang abspielen: `vorher` aus erfasseFormen(), `container` mit der neu gezeichneten Ansicht.
// Gibt ein Promise zurück, das nach dem Ende (oder sofort, ohne Animation) erfüllt ist.
export function spieleUebergang(vorher, container) {
  return new Promise((fertig) => {
    if (!vorher?.size || !container || ohneAnimation()) { fertig(); return; }
    const nachher = erfasseFormen(container);
    if (!nachher.size) { fertig(); return; }

    // Paare: gleiche Form, sonst die Form des nächsten Vorfahren auf der anderen Seite; ohne beides
    // blendet die Form an ihrem Platz ein bzw. aus (2026-10-28, z. B. beim Filter „Unsicherheiten anzeigen“)
    const paare = [];
    const findeIn = (formen, f) => f.vorfahren.map((k) => formen.get(k)).find(Boolean);
    nachher.forEach((ziel, key) => {
      const start = vorher.get(key) || findeIn(vorher, ziel) || ziel;
      if (sichtbar(start.box) || sichtbar(ziel.box)) paare.push({ von: start.punkte, nach: ziel.punkte, farbeVon: start.farbe, farbe: ziel.farbe, opVon: vorher.has(key) ? 1 : (start === ziel ? 0 : 0.25), opNach: 1 });
    });
    vorher.forEach((start, key) => {
      if (nachher.has(key)) return;
      const ziel = findeIn(nachher, start) || start;
      if (sichtbar(start.box) || sichtbar(ziel.box)) paare.push({ von: start.punkte, nach: ziel.punkte, farbeVon: start.farbe, farbe: start.farbe, opVon: 1, opNach: 0 });
    });
    if (!paare.length) { fertig(); return; }
    paare.splice(MAX_FORMEN);

    const ns = 'http://www.w3.org/2000/svg';
    const ueberlagerung = document.createElementNS(ns, 'svg');
    ueberlagerung.setAttribute('aria-hidden', 'true');
    ueberlagerung.setAttribute('class', 'bestand-uebergang');
    ueberlagerung.setAttribute('width', String(window.innerWidth));
    ueberlagerung.setAttribute('height', String(window.innerHeight));
    const elemente = paare.map((p) => {
      const el = document.createElementNS(ns, 'path');
      el.setAttribute('d', pfad(p.von));
      el.setAttribute('fill', p.farbeVon);
      el.setAttribute('stroke', '#ffffff');
      el.setAttribute('stroke-width', '0.5');
      el.style.opacity = String(p.opVon);
      ueberlagerung.appendChild(el);
      return el;
    });
    const farbe = paare.map((p) => d3.interpolateRgb(p.farbeVon, p.farbe));
    document.body.appendChild(ueberlagerung);
    container.classList.add('bestand-uebergang-laeuft');

    let beendet = false;
    const ende = () => {
      if (beendet) return;
      beendet = true;
      ueberlagerung.remove();
      container.classList.remove('bestand-uebergang-laeuft');
      fertig();
    };
    const t0 = performance.now();
    const schritt = (jetzt) => {
      if (beendet) return;
      const t = Math.min(1, (jetzt - t0) / DAUER);
      const e = sanft(t);
      paare.forEach((p, i) => {
        elemente[i].setAttribute('d', pfad(mische(p.von, p.nach, e)));
        elemente[i].setAttribute('fill', farbe[i](e));
        elemente[i].style.opacity = String(p.opVon + (p.opNach - p.opVon) * e);
      });
      if (t < 1) requestAnimationFrame(schritt);
      else ende();
    };
    requestAnimationFrame(schritt);
    setTimeout(ende, DAUER + 400); // ruht requestAnimationFrame (Hintergrund-Tab), endet der Übergang trotzdem
  });
}
