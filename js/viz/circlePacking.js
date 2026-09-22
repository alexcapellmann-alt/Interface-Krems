// js/viz/circlePacking.js
// Circle Packing des Gesamtbestands (Abschnitt 4.1, 9). Modul-Interface siehe
// Abschnitt 5. Gleiche Datengrundlage wie treemap.js/sunburst.js/icicle.js,
// siehe js/utils/bestandsHierarchie.js.
//
// Auf denselben funktionalen/gestalterischen Stand gebracht (siehe CHANGELOG
// für Datum/Details): Kategorie-Farbcodierung aus js/utils/kategorieFarben.js
// (importiert, NICHT dupliziert), sqrt-Flächenskalierung, Mindestradius-
// Korrektur, Beschriftung, Zoom-Interaktion, Sidebar aus js/utils/sidebar.js.
//
// ZWEI NAVIGATIONSZUSTÄNDE (dieselbe Entscheidung wie bei treemap.js/
// sunburst.js/icicle.js, bewusst NICHT neu verhandelt, UND explizit KEIN
// klassisches Pan-/Zoom-Circle-Packing mit sichtbar bleibenden Elternkreisen,
// siehe Auftrag): Übersicht zeigt EINE flache Kreispackung, ein Kreis pro
// Kategorie; Klick auf einen Kategorie-Kreis ERSETZT die gesamte Ansicht durch
// eine flache Kreispackung der Bestände dieser Kategorie. Rücksprung-
// Mechanismus: externer "← Alle Kategorien"-Button in einer eigenen
// Werkzeugleiste - dieselbe, bereits an treemap.js erprobte Lösung (nicht
// Sunburst-artiges Zentrum, da ein Kreis-Packing keinen natürlichen,
// dauerhaft freien "Nabe"-Bereich in der Mitte hat, den man dafür verwenden
// könnte, ohne ihn künstlich freizuhalten - ein externer Button ist hier die
// unaufdringlichere, bereits bewährte Wahl).
//
// FLACHE PACKUNG STATT VERSCHACHTELTER HIERARCHIE (wichtiger Unterschied zu
// treemap.js/sunburst.js): d3.pack() bildet die Baum-VERSCHACHTELUNG direkt in
// verschachtelten Kreisen ab - ein Blatt-Kreis würde nur innerhalb des Platzes
// seines (nicht gezeichneten) Unterkategorie-Elternkreises liegen, nicht im
// gesamten verfügbaren Canvas (anders als bei treemap.js/sunburst.js, wo eine
// reine Radius-/Positions-Neuzuordnung genügte, weil dort nur EINE Dimension
// betroffen ist). In der Kategorie-Ansicht wird deshalb eine EIGENE, FLACHE
// Hilfshierarchie aus den Bestand-Blättern gebaut (baueFlacheBestaende()) -
// die Unterkategorie-Farbabstufung wird VORHER aus der echten, verschachtelten
// Hierarchie berechnet und den Blättern als fertige Farbe mitgegeben.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { baueBestandsHierarchie, baueTooltipText, OHNE_KATEGORIE, EBENENTYP_KATEGORIE } from '../utils/bestandsHierarchie.js';
import {
  passendeTextfarbe,
  baueKategorieFarbSkala,
  OHNE_KATEGORIE_FARBE,
  farbeFuerUnterkategorie
} from '../utils/kategorieFarben.js';
import {
  baueSidebarGeruest,
  oeffneSidebar as oeffneSidebarModul,
  schliesseSidebar as schliesseSidebarModul,
  fuegeSidebarStyleEin
} from '../utils/sidebar.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { ermittleBeschriftungstext } from '../utils/beschriftung.js';

const CIRCLEPACKING_INFO_TEXT = `Diese Darstellung zeigt die Bestände als ineinander verschachtelte Kreise: ein großer Kreis pro Kategorie, darin die einzelnen Bestände. Die Kreisgröße entspricht dem Umfang in Laufmetern.

Klick auf eine Kategorie zeigt deren Bestände, Klick auf einen einzelnen Bestand öffnet die Detailansicht in der Seitenleiste.`;

const MIN_SCHRIFTGROESSE = 11;
const MINDESTRADIUS_PX = 12; // Durchmesser 24px - dasselbe Fitts'sches-Gesetz-Ziel wie treemap.js/sunburst.js/icicle.js, hier als Radius
const WARN_SYMBOL = '⚠';
const AUSWAHL_FARBE = '#e07820';
const FOKUS_STROKE_BREITE = 3;

// Root-Cause-Check (Schritt 1, aktiv geprüft statt zufällig entdeckt): auch
// circlePacking.js rief baueBestandsHierarchie() bisher ohne den seit der
// Treemap-Etappe existierenden mindestgroesse-Parameter auf - fiel auf den
// gemeinsamen Default (10) zurück, derselbe bereits zweimal (Treemap,
// Sunburst) behobene Fehler. bestandsHierarchie.js selbst bleibt unverändert.
const MINDESTGROESSE_ROH_CIRCLEPACKING = 0.05;

let instanz = null; // { container, svgBereich, hierarchieDaten, kategorieFarbSkala, options, aktuelleKategorieDaten, ausgewaehlterName, sidebar, werkzeugleiste, zurueckBtn, titelSpan, infoButton }

function istUnsicherenKnoten(record, zeigeUnsicherheit) {
  return zeigeUnsicherheit && record && record.daten_unsicher;
}

// Randfarbe/-breite im Ruhezustand (Punkt A/D wie bei sunburst.js: derselbe
// Indikator dient Auswahl-Markierung UND Tastatur-Fokusanzeige).
function randStilFuerKreis({ istAusgewaehlt, istUnsicher, ohneKategorie }) {
  if (istAusgewaehlt) return { stroke: AUSWAHL_FARBE, breite: 2, dasharray: null };
  if (istUnsicher) return { stroke: '#c0392b', breite: 2, dasharray: '4,3' };
  return { stroke: '#ffffff', breite: 1, dasharray: ohneKategorie ? '4,3' : null };
}

// Punkt A (wie bei sunburst.js): Kreise entsprechen wie Bogen-Segmente nicht
// ihrer rechteckigen Fokus-Bounding-Box - derselbe Fix (outline unterdrückt,
// per JS ersetzter Indikator, kein ersatzloses outline:none).
function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .circlepacking-svg-bereich { height: 100%; }
    .circlepacking-werkzeugleiste { display: flex; align-items: center; gap: var(--space-3); margin: 0 0 var(--space-2) 0; min-height: 44px; flex: 0 0 auto; }
    /* Bugfix (Auftrag "Bugfix: Info-Button fehlt/unsichtbar"): identischer
       Fehler wie in treemap.js (siehe dortiger Kommentar/CHANGELOG) - ein
       pauschaler Typ-Selektor ".circlepacking-werkzeugleiste button" traf
       nach Einbindung des Info-Buttons auch dessen <button>-Element, seine
       höhere Spezifität (0,1,1 vs. .info-button's 0,1,0) überschrieb
       background/padding/border/border-radius/min-height, aus dem blauen
       Kreis wurde ein de facto unsichtbarer heller Kasten. Fix: eigene
       Klasse NUR für den Zurück-Button statt eines pauschalen Typ-Selektors -
       exakt dieselben Eigenschaften/Werte. */
    .circlepacking-werkzeugleiste .circlepacking-zurueck-btn { min-height: 44px; padding: var(--space-2) var(--space-3); border: 1px solid var(--border);
      border-radius: var(--radius); background: var(--surface); font: inherit; cursor: pointer; }
    .circlepacking-werkzeugleiste .circlepacking-zurueck-btn:hover { border-color: var(--accent); }
    .circlepacking-werkzeugleiste .circlepacking-zurueck-btn:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .circlepacking-titel { font-weight: 600; color: var(--text); }
    .circlepacking-kreisgruppe:focus,
    .circlepacking-kreisgruppe:focus-visible { outline: none; }
  `;
  container.appendChild(style);
}

function wireTooltip(auswahl, textFn, container) {
  auswahl
    .on('mouseenter.tooltip focus.tooltip', function mouseenterFocus(event, d) { zeigeTooltip(textFn(d), this, container); })
    .on('mouseleave.tooltip blur.tooltip', () => versteckeTooltip());
}

function wireFokusHighlight(gruppe, kreis, ruheZustand) {
  gruppe
    .on('focus.highlight', () => kreis.attr('stroke', AUSWAHL_FARBE).attr('stroke-width', FOKUS_STROKE_BREITE))
    .on('blur.highlight', () => {
      const stil = ruheZustand();
      kreis.attr('stroke', stil.stroke).attr('stroke-width', stil.breite).attr('stroke-dasharray', stil.dasharray);
    });
}

// Packt kinder-Knoten (bereits sqrt-summiert über d3.hierarchy(...).sum()) in
// die verfügbare Fläche; erzwingt danach einen Mindestradius über d3.pack()s
// eigenen radius()-Accessor - NICHT über eine nachträgliche Verschiebung wie
// bei treemap.js/sunburst.js (dort 1D-Intervalle, hier echte 2D-Kreise, wo
// ein nachträgliches Vergrößern zu neuen Überlappungen führen könnte). d3s
// eigener Packungsalgorithmus garantiert dagegen für JEDE ihm übergebene
// Radius-Menge eine überlappungsfreie Anordnung - deshalb: erst normal
// packen, dann bei Bedarf mit geflossenen Radien ERNEUT packen lassen.
// RECHNERISCH UNMÖGLICHER FALL (dieselbe bereits etablierte Regel wie bei
// Treemap/Sunburst): übersteigt die Gesamtfläche bei durchgängig
// durchgesetztem Mindestradius eine konservativ geschätzte verfügbare
// Fläche (60% der Canvas-Fläche - Kreispackungen erreichen praktisch nie
// 100% Flächennutzung), wird NICHT korrigiert, alle Kreise behalten ihre
// regulär gepackte, wertproportionale Größe.
function packeMitMindestradius(wurzel, breite, hoehe, mindestRadius) {
  d3.pack().size([breite, hoehe]).padding(3)(wurzel);
  const kinder = wurzel.children || [];
  const zuKlein = kinder.filter((k) => k.r < mindestRadius);
  if (zuKlein.length === 0) return wurzel;

  const flaecheGeflossen = kinder.reduce((s, k) => s + Math.PI * Math.pow(Math.max(k.r, mindestRadius), 2), 0);
  const verfuegbareFlaeche = breite * hoehe * 0.6;
  if (flaecheGeflossen > verfuegbareFlaeche) return wurzel; // rechnerisch unmöglich, siehe Dateikopf-Kommentar

  d3.pack().size([breite, hoehe]).padding(3).radius((d) => Math.max(d.r, mindestRadius))(wurzel);

  // Root-Cause-Check (Schritt 1, aktiv per isoliertem d3.pack()-Test verifiziert,
  // siehe CHANGELOG/PROJEKTLOG): d3.pack() mit eigenem radius()-Accessor
  // überspringt laut d3-hierarchy-Dokumentation die sonst automatische
  // Nachskalierung der gesamten Packung auf size() - "the radius of each leaf
  // circle is specified exactly by the function" statt "scaled proportionally
  // to fit the layout's size". Ohne dieses manuelle Nachholen kann die mit
  // erzwungenem Mindestradius gepackte Fläche die Zielhöhe/-breite überragen
  // (empirisch bestätigt: oben UND unten abgeschnittene Kreise bei
  // breite > hoehe, da die Einhüllende zentriert bei [breite/2, hoehe/2]
  // bleibt, aber nicht auf min(breite,hoehe) skaliert wird). Hier wird exakt
  // dieselbe Skalierung nachgeholt, die d3.pack() ohne radius()-Accessor
  // selbst durchführt (gleichmäßige Skalierung um die bereits korrekt
  // zentrierte Wurzel - bleibt garantiert überlappungsfrei, da alle Abstände
  // um denselben Faktor schrumpfen/wachsen). Kann den erzwungenen
  // Mindestradius dabei wieder leicht unterschreiten, wenn beides (Mindest-
  // radius UND Einpassung in die Zielfläche) nicht gleichzeitig erfüllbar ist -
  // Einpassung hat dann Vorrang vor dem Mindestradius, analog zum
  // "rechnerisch unmöglich"-Fall oben: kein Überlauf statt erzwungener Größe.
  const faktor = Math.min(breite, hoehe) / (2 * wurzel.r);
  if (faktor !== 1) {
    wurzel.each((knoten) => {
      knoten.x = wurzel.x + (knoten.x - wurzel.x) * faktor;
      knoten.y = wurzel.y + (knoten.y - wurzel.y) * faktor;
      knoten.r *= faktor;
    });
  }
  return wurzel;
}

// Baut eine FLACHE Hilfshierarchie aus allen Bestand-Blättern einer Kategorie
// (siehe Dateikopf-Kommentar) - die Unterkategorie-Farbabstufung wird VORHER
// aus der echten, verschachtelten Hierarchie berechnet (bestandKnoten.parent
// ist dort immer die Unterkategorie, wie bei treemap.js/sunburst.js) und pro
// Bestand-Record in einer Map gespeichert, da die flache Hilfshierarchie
// selbst keine Unterkategorie-Ebene mehr besitzt.
function baueFlacheBestaende(kategorieDaten, kategorieName, kategorieFarbSkala) {
  const voll = d3.hierarchy(kategorieDaten).sum((d) => Math.sqrt(d.value || 0));
  const farbeProRecord = new Map();
  voll.leaves().forEach((blatt) => {
    const farbe = kategorieName === OHNE_KATEGORIE
      ? OHNE_KATEGORIE_FARBE
      : farbeFuerUnterkategorie(kategorieFarbSkala(kategorieName), blatt.parent);
    farbeProRecord.set(blatt.data.record, farbe);
  });
  // BUGFIX (Auftrag "Falsche Kategorie im Tooltip in Zoomansichten", siehe
  // CHANGELOG): diese flache Hilfshierarchie hat KEINE Unterkategorie-Ebene
  // (Bestand-Blätter hängen direkt an der Kategorie, depth 0=Kategorie,
  // 1=Bestand statt der sonst üblichen drei Ebenen) - kategorieVonKnoten()
  // (bestandsHierarchie.js) erkennt die Kategorie-Ebene seit diesem Bugfix
  // nicht mehr an einer festen Tiefe, sondern am `ebenenTyp`-Attribut, das
  // hier deshalb explizit mitgegeben werden muss (die Bestand-Blätter selbst
  // tragen ihr `ebenenTyp: 'bestand'` bereits unverändert aus
  // baueBestandsHierarchie() mit, da `b.data` dieselben Objekte sind).
  return { flacheDaten: { name: kategorieName, ebenenTyp: EBENENTYP_KATEGORIE, children: voll.leaves().map((b) => b.data) }, farbeProRecord };
}

function wechsleZuKategorie(kategorieDaten) {
  instanz.aktuelleKategorieDaten = kategorieDaten;
  instanz.ausgewaehlterName = null;
  schliesseSidebarModul(instanz.sidebar, instanz.svgBereich);
  aktualisiereWerkzeugleiste();
  zeichneCirclePacking();
}

function wechsleZuWurzel() {
  instanz.aktuelleKategorieDaten = null;
  instanz.ausgewaehlterName = null;
  schliesseSidebarModul(instanz.sidebar, instanz.svgBereich);
  aktualisiereWerkzeugleiste();
  zeichneCirclePacking();
}

function waehleBestand(datenKnoten) {
  if (instanz.ausgewaehlterName === datenKnoten.name) {
    instanz.ausgewaehlterName = null;
    zeichneCirclePacking();
    schliesseSidebarModul(instanz.sidebar, instanz.svgBereich);
    instanz.svgBereich.focus();
    return;
  }
  instanz.ausgewaehlterName = datenKnoten.name;
  zeichneCirclePacking();
  const kategorieName = instanz.aktuelleKategorieDaten.name;
  const kategorieFarbe = kategorieName === OHNE_KATEGORIE ? OHNE_KATEGORIE_FARBE : instanz.kategorieFarbSkala(kategorieName);
  oeffneSidebarModul(instanz.sidebar, datenKnoten.record, { kategorieName, kategorieFarbe });
}

function baueWerkzeugleiste() {
  const zurueckBtn = document.createElement('button');
  zurueckBtn.type = 'button';
  zurueckBtn.className = 'circlepacking-zurueck-btn';
  zurueckBtn.textContent = '← Alle Kategorien';
  zurueckBtn.setAttribute('aria-label', 'Zurück zu allen Kategorien');
  zurueckBtn.addEventListener('click', wechsleZuWurzel);

  const titel = document.createElement('span');
  titel.className = 'circlepacking-titel';

  instanz.werkzeugleiste.append(zurueckBtn, titel);
  instanz.zurueckBtn = zurueckBtn;
  instanz.titelSpan = titel;
  aktualisiereWerkzeugleiste();

  // Derselbe Ansatz wie treemap.js' baueWerkzeugleiste(): ein einzelner
  // marginLeft:auto-Anker schiebt nur den Info-Button an den rechten Rand,
  // ohne eine neue globale CSS-Klasse einzuführen.
  const infoButtonAnker = document.createElement('div');
  infoButtonAnker.style.marginLeft = 'auto';
  instanz.werkzeugleiste.appendChild(infoButtonAnker);
  instanz.infoButton = erzeugeInfoButton(infoButtonAnker, { text: CIRCLEPACKING_INFO_TEXT, ariaLabel: 'Erklärung zum Circle Packing' });
}

function aktualisiereWerkzeugleiste() {
  const inKategorie = !!instanz.aktuelleKategorieDaten;
  instanz.zurueckBtn.hidden = !inKategorie;
  instanz.titelSpan.textContent = inKategorie ? instanz.aktuelleKategorieDaten.name : '';
}

function zeichneCirclePacking() {
  const { svgBereich, hierarchieDaten, options, aktuelleKategorieDaten, kategorieFarbSkala } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  svgBereich.innerHTML = '';

  const breite = options.width || svgBereich.clientWidth || 700;
  const hoehe = options.height || svgBereich.clientHeight || 700;
  const inKategorieAnsicht = !!aktuelleKategorieDaten;

  let gezeichneteKnoten;
  let farbeProRecord = null;
  let kategorieNameFuerBlatt = null;

  if (inKategorieAnsicht) {
    const kategorieName = aktuelleKategorieDaten.name;
    const { flacheDaten, farbeProRecord: fpr } = baueFlacheBestaende(aktuelleKategorieDaten, kategorieName, kategorieFarbSkala);
    farbeProRecord = fpr;
    kategorieNameFuerBlatt = kategorieName;
    const wurzel = d3.hierarchy(flacheDaten).sum((d) => Math.sqrt(d.value || 0)).sort((a, b) => b.value - a.value);
    packeMitMindestradius(wurzel, breite, hoehe, MINDESTRADIUS_PX);
    gezeichneteKnoten = wurzel.children || [];
  } else {
    const wurzel = d3.hierarchy(hierarchieDaten).sum((d) => Math.sqrt(d.value || 0)).sort((a, b) => b.value - a.value);
    packeMitMindestradius(wurzel, breite, hoehe, MINDESTRADIUS_PX);
    gezeichneteKnoten = wurzel.children || [];
  }

  const svg = d3.select(svgBereich)
    .append('svg')
    .attr('width', breite)
    .attr('height', hoehe)
    .attr('viewBox', `0 0 ${breite} ${hoehe}`)
    .attr('role', 'img')
    .attr('aria-label', inKategorieAnsicht
      ? `Bestände der Kategorie ${aktuelleKategorieDaten.name}`
      : 'Circle Packing des Gesamtbestands, gruppiert nach Kategorie');

  svg.append('desc').text(
    'Kreispackung: in der Übersicht ein Kreis pro Kategorie, Fläche nach ' +
    'Umfang in Laufmetern (Quadratwurzel-skaliert). Klick auf eine Kategorie ' +
    'zeigt deren Bestände als eigene Kreispackung; der Zurück-Button in der ' +
    'Werkzeugleiste kehrt zur Übersicht zurück. Farbton zeigt die Kategorie, ' +
    'Helligkeit die Unterkategorie; "ohne Kategorie" erscheint neutral grau ' +
    'mit Punktmuster. Gestrichelter roter Rand, Warnsymbol und Schraffur ' +
    'kennzeichnen unsichere Angaben.'
  );

  const defs = svg.append('defs');
  defs.append('pattern')
    .attr('id', 'circlepacking-unsicher-schraffur')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 8).attr('height', 8)
    .append('path')
    .attr('d', 'M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4')
    .attr('stroke', '#aaaaaa').attr('stroke-width', 1.5).attr('opacity', 0.45);
  const musterOhneKategorie = defs.append('pattern')
    .attr('id', 'circlepacking-ohne-kategorie-muster')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 6).attr('height', 6);
  musterOhneKategorie.append('circle').attr('cx', 3).attr('cy', 3).attr('r', 1).attr('fill', '#ffffff').attr('opacity', 0.55);

  const gruppen = svg.selectAll('g.circlepacking-kreisgruppe')
    .data(gezeichneteKnoten)
    .join('g')
    .attr('class', 'circlepacking-kreisgruppe')
    .attr('tabindex', 0)
    .attr('transform', (d) => `translate(${d.x},${d.y})`);

  gruppen.each(function jedeGruppe(d) {
    const gruppe = d3.select(this);
    const kategorieName = inKategorieAnsicht ? kategorieNameFuerBlatt : d.data.name;
    const ohneKategorie = kategorieName === OHNE_KATEGORIE;
    const farbe = inKategorieAnsicht
      ? farbeProRecord.get(d.data.record)
      : (ohneKategorie ? OHNE_KATEGORIE_FARBE : kategorieFarbSkala(kategorieName));
    const textFarbe = passendeTextfarbe(farbe);
    const istUnsicher = inKategorieAnsicht && istUnsicherenKnoten(d.data.record, zeigeUnsicherheit);
    const istAusgewaehlt = inKategorieAnsicht && instanz.ausgewaehlterName === d.data.name;
    const ruheZustand = () => randStilFuerKreis({ istAusgewaehlt, istUnsicher, ohneKategorie });
    const stil = ruheZustand();

    const kreis = gruppe.append('circle')
      .attr('r', d.r)
      .attr('fill', farbe)
      .attr('stroke', stil.stroke)
      .attr('stroke-width', stil.breite)
      .attr('stroke-dasharray', stil.dasharray);

    if (ohneKategorie) {
      gruppe.append('circle').attr('r', d.r).attr('fill', 'url(#circlepacking-ohne-kategorie-muster)').attr('pointer-events', 'none');
    }
    if (istUnsicher) {
      gruppe.append('circle').attr('r', d.r).attr('fill', 'url(#circlepacking-unsicher-schraffur)').attr('pointer-events', 'none');
      gruppe.append('text').attr('x', 0).attr('y', -d.r + 12).attr('text-anchor', 'middle').attr('aria-hidden', 'true').attr('font-size', 11).text(WARN_SYMBOL);
    }

    if (d.r > 18) {
      const name = d.data.name;
      const maxSchrift = Math.max(MIN_SCHRIFTGROESSE, Math.min(14, d.r / 2.5));
      let beschriftet = false;
      for (let versuch = maxSchrift; versuch >= MIN_SCHRIFTGROESSE; versuch -= 1) {
        const zeichenBreite = versuch * 0.57;
        const verfuegbareBreite = 2 * Math.sqrt(Math.max(d.r * d.r - (versuch * 0.7) * (versuch * 0.7), 0));
        if (name.length * zeichenBreite <= verfuegbareBreite) {
          gruppe.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em').attr('fill', textFarbe).attr('font-size', versuch).text(name);
          beschriftet = true;
          break;
        }
      }
      // NEU (Auftrag "Beschriftungs-Kürzung mit Ellipse", siehe CHANGELOG):
      // passt der volle Name bei KEINER Schriftgröße, wird bei
      // MIN_SCHRIFTGROESSE eine mit "…" gekürzte Fassung versucht
      // (js/utils/beschriftung.js, gemeinsam mit treemap.js/sunburst.js/
      // icicle.js genutzt) statt komplett auf ein Label zu verzichten -
      // dieselbe Sehnenbreiten-Formel wie oben, hier bei der kleinstmöglichen
      // Schriftgröße ausgewertet. Tooltip bleibt unverändert unconditional
      // gewirt (siehe wireTooltip()-Aufruf unten), kein separater
      // Tooltip-Ersatz-Zweig wie bei treemap.js nötig.
      if (!beschriftet) {
        const verfuegbareBreiteBeiMin = 2 * Math.sqrt(Math.max(d.r * d.r - (MIN_SCHRIFTGROESSE * 0.7) * (MIN_SCHRIFTGROESSE * 0.7), 0));
        const gekuerzterText = ermittleBeschriftungstext(name, verfuegbareBreiteBeiMin, MIN_SCHRIFTGROESSE);
        if (gekuerzterText) {
          gruppe.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em').attr('fill', textFarbe).attr('font-size', MIN_SCHRIFTGROESSE).text(gekuerzterText);
        }
      }
    }

    wireFokusHighlight(gruppe, kreis, ruheZustand);

    if (inKategorieAnsicht) {
      gruppe.style('cursor', 'pointer')
        .attr('role', 'button')
        .attr('aria-label', `${d.data.name} auswählen`)
        .on('click', () => waehleBestand(d.data))
        .on('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); waehleBestand(d.data); } });
      wireTooltip(gruppe, () => baueTooltipText(d), svgBereich);
    } else {
      gruppe.style('cursor', 'zoom-in')
        .attr('role', 'button')
        .attr('aria-label', `Kategorie ${kategorieName} öffnen`)
        .on('click', () => wechsleZuKategorie(d.data))
        .on('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); wechsleZuKategorie(d.data); } });
      wireTooltip(gruppe, () => `${kategorieName} (${d.leaves().length} Bestände)`, svgBereich);
    }
  });
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  container.innerHTML = '';

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'circlepacking-werkzeugleiste';

  const svgBereich = document.createElement('div');
  svgBereich.className = 'circlepacking-svg-bereich';
  svgBereich.setAttribute('tabindex', '-1');

  container.append(werkzeugleiste, svgBereich);
  fuegeStyleEin(container);
  fuegeSidebarStyleEin(container);
  const sidebar = baueSidebarGeruest(container);

  const hierarchieDaten = baueBestandsHierarchie(data, MINDESTGROESSE_ROH_CIRCLEPACKING);
  const kategorienNamen = hierarchieDaten.children.map((k) => k.name).filter((name) => name !== OHNE_KATEGORIE).sort((a, b) => a.localeCompare(b));

  instanz = {
    container,
    hierarchieDaten,
    kategorieFarbSkala: baueKategorieFarbSkala(kategorienNamen),
    options: { showUncertainty: true, width: null, height: null, ...options },
    aktuelleKategorieDaten: null,
    ausgewaehlterName: null,
    werkzeugleiste,
    svgBereich,
    sidebar
  };
  sidebar.schliessenBtn.addEventListener('click', () => schliesseSidebarModul(instanz.sidebar, instanz.svgBereich));
  baueWerkzeugleiste();
  zeichneCirclePacking();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneCirclePacking();
}

export function destroy() {
  if (!instanz) return;
  instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}
