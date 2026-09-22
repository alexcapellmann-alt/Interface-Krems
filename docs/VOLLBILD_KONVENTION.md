# VOLLBILD_KONVENTION.md

Verbindliche Konvention für JEDES Visualisierungsmodul unter `js/viz/` -
gleichrangig mit Info-Button, Kategorie-Farben und Sidebar-Integration
(Abschnitt 5/9 des Masterprompts), nicht optional oder nachgelagert. Ein
Auftrag für ein neues oder überarbeitetes Modul kann sich schlicht auf
"nach der Vollbild-Konvention umsetzen" beziehen - die Details müssen dann
nicht erneut ausformuliert werden.

Hintergrund: mehrere Module (u. a. `dotPlot.js`) wurden ursprünglich mit
einer rein inhaltsgetriebenen Höhe gebaut (Höhe = Anzahl Einträge × feste
Zeilenhöhe, unabhängig vom tatsächlich verfügbaren Platz) - bei großen
Bildschirmen blieb dadurch sichtbar ungenutzter Leerraum, bei kleinen
drohte hartes Abschneiden statt Scroll. Diese Datei fasst das seither
etablierte Gegenmuster zusammen (siehe `docs/PROJEKTLOG.md`, Einträge zu
"Dot Plot - Vollbild-Streckung" für die vollständige Herleitung).

---

## Ausgangslage (gilt für ALLE Module gleichermaßen, nicht modul-spezifisch zu lösen)

`app.js` übergibt jedem Modul denselben Container `.viz-inhalt`. Dieser
bekommt über das gemeinsame CSS-Grid in `css/layout.css`
(`#app-content{display:grid; grid-template-rows:auto auto 1fr}`,
`.viz-inhalt{min-height:480px}`) bereits korrekt die volle verfügbare
Höhe/Breite - reicht die Viewport-Höhe nicht für die 480px-Mindesthöhe,
wächst die Seite per Scroll (kein Stauchen/Abschneiden). **Das ist bereits
gelöst und ist NICHT Aufgabe des einzelnen Moduls.** Die Aufgabe jedes
Moduls ist ausschließlich: diese bereits vorhandene Fläche tatsächlich
NUTZEN, statt sie zu ignorieren.

## Checkliste

### 1. Laufzeit-Messung, nicht Annahme

Der Container wird zur Laufzeit gemessen (`clientHeight`/`clientWidth`),
nie hart codiert oder angenommen. Referenzmuster (aus `dotPlot.js`):

```js
const breite = options.width || container.clientWidth || 900;
// ... eigener Wrapper wieder in den DOM eingehängt (siehe Punkt 2) ...
const verfuegbareHoehe = plotBereich.clientHeight; // erst NACH dem erneuten
  // Einhängen messen - synchroner Reflow, dieselbe Technik wie bei breite
```

Wichtig: die Messung muss erfolgen, NACHDEM die eigene Werkzeugleiste
(falls vorhanden) bereits im DOM steht, sonst wird ihre Höhe nicht korrekt
von der verfügbaren Höhe abgezogen.

### 2. Eigener Flex-Wrapper statt `.viz-inhalt` zu überschreiben

Ein modul-lokaler `.<modul>-wurzel`-Wrapper (`display:flex;
flex-direction:column; height:100%`) wird als einziges Kind von `container`
eingehängt. Eine Werkzeugleiste (Zoom-Buttons, Info-Button, Legende) bekommt
`flex:0 0 auto` (natürliche Höhe), die eigentliche Zeichenfläche
`flex:1 1 auto` (gesamter Rest). NICHT das ältere, fragilere Muster
verwenden, das `.viz-inhalt` selbst per globaler `<style>`-Injektion
überschreibt (Cascade-Reihenfolge-abhängig) - Referenz: `dotPlot.js`s
`.dotplot-wurzel`, `ganttDiagramm.js`s `.gantt-wurzel`.

### 3a. Zeilen-/elementbasierter Inhalt → Streckung mit Clamp

Gilt für Module mit einer FESTEN Anzahl gleichartiger Zeilen/Elemente (eine
Zeile pro Kategorie, ein Balken pro Bestand, o. Ä.) - Referenzmuster
`dotPlot.js`:

```js
const MIN_ZEILENHOEHE = 20; // unterer Richtwert: bisheriger kompakter Wert
const MAX_ZEILENHOEHE = 44; // oberer Richtwert: dieselbe 44px-Zielgröße wie
  // die Zoom-Buttons (Fitts'sches Gesetz) - mehr als doppelt so groß wie
  // MIN, nutzt große Bildschirme sichtbar, ohne die Zeilen einer reinen
  // Übersicht unnatürlich auseinanderzuziehen. Beide Werte sind
  // MODUL-INDIVIDUELL neu zu bestimmen (abhängig von Inhalt/Lesbarkeit),
  // [20,44] ist das Referenzbeispiel, kein Universalwert.

const verfuegbarFuerZeilen = Math.max(verfuegbareHoehe - sockelHoehe, 0);
  // sockelHoehe = alles, was NICHT Zeile ist (Ränder, Achse, ggf. ein
  // Sammelbereich für Sonderfälle wie "ohne Jahr"/"ohne Kategorie" -
  // realistisch schätzen, siehe dotPlot.js's RESERVIERT_FUER_UNDATIERT-
  // Kommentar für die Begründung eines Schätzwerts statt exakter
  // Vorab-Berechnung).
const zeilenhoehe = Math.min(Math.max(verfuegbarFuerZeilen / anzahlZeilen, MIN_ZEILENHOEHE), MAX_ZEILENHOEHE);
```

Punktgröße/Balkenhöhe/Symbolgröße innerhalb einer Zeile skaliert
proportional mit der gewählten Zeilenhöhe (nicht separat fest codiert
lassen).

### 3b. Flächenbasierter Inhalt → volle Flex-Füllung

Gilt für Module, deren Inhalt eine zusammenhängende Fläche ist (Treemap,
Sunburst, Icicle, Circle Packing) - hier genügt der Flex-Wrapper aus Punkt 2
bereits vollständig: die Zeichenfläche (SVG mit `width`/`height` = die
gemessenen Container-Maße) füllt IMMER die volle verfügbare Fläche, kein
zusätzliches Clamping nötig, da es keine "Zeilen" gibt, die unnatürlich
auseinandergezogen werden könnten.

### 3c. Beschriftungen UNTERHALB der Hauptachse exakt einrechnen, nicht schätzen

AUFTRAG "Systemischer Clipping-Fix nach Vollbild-Umstellung" (siehe
`docs/PROJEKTLOG.md` für den vollen Root-Cause-Befund): mehrere Module
reservieren für Elemente unterhalb der Hauptachse (z. B. die
"Undatiert"/"Ohne Jahr"-Sammelfläche aus `urkundenZeit.js`'
`zeichneUnbekanntBereich()`) einen Platzbedarf, BEVOR die restliche Höhe auf
Zeilen/Fläche verteilt wird (Punkt 3a/3b). Ein GESCHÄTZTER Reservierungswert
(z. B. "0 Einträge → 24px + 10px Puffer") ist für den GENAU EINEN Fall, für
den er hergeleitet wurde, exakt richtig - für jeden anderen Fall (andere
Anzahl Einträge, künftige Datenänderung) nur zufällig. Bei einem Modul mit
zusätzlichem `overflow:hidden`-Wrapper (Punkt 2) führt eine Unterschätzung
zu hartem Clipping statt Scroll - der eigentliche Sinn von Punkt 4 unten
wird damit unterlaufen.

**Fix: der tatsächliche Platzbedarf wird per "Trockenlauf" exakt vorab
ermittelt, statt geschätzt** - ein Aufruf der ECHTEN Zeichenfunktion
(`zeichneUnbekanntBereich()`) in eine nie angehängte, unsichtbare SVG-Gruppe
liefert exakt denselben Rückgabewert wie der echte Aufruf später (der
Rückgabewert hängt nachweislich nur von `breite`/den Einträgen ab, NICHT von
`yStart` - die Funktion selbst bleibt einzige Quelle der Wahrheit, keine
Formel-Duplikation):

```js
const trockenlaufSvg = d3.create('svg');
const reserviert = zeichneUnbekanntBereich(trockenlaufSvg, ohneJahr, {
  breite, yStart: 0, beschriftung: 'Undatiert', farbeFn, tooltipTextFn, container
}) + 10; // +10: derselbe Abstand wie bei der echten gesamtHoehe-Berechnung
// ... reserviert jetzt statt eines geschätzten Werts in der
// verfuegbarFuerZeilen-Berechnung (Punkt 3a) verwenden ...
```

Zusätzlich als Sicherheitsnetz (falls ein Modul dennoch `overflow:hidden`
braucht, z. B. für Touch-Pan-Gesten): `overflow-y:visible` (oder `auto`)
statt `overflow-y:hidden` auf dem Zeichenflächen-Wrapper lässt JEDE
verbleibende Diskrepanz sichtbar scrollen statt hart abzuschneiden -
`overflow-x` kann bei bereits exakt gemessener Breite unverändert `hidden`
bleiben. Referenzimplementierung: `dotPlot.js`.

### 3d. Achsenbeschriftungsgröße: gemeinsame Konstante, UND d3-Falle beachten

AUFTRAG "Einheitliche Achsenbeschriftungsgröße app-weit": alle Tick-/
Achsentitel-Schriftgrößen nutzen `ACHSEN_SCHRIFTGROESSE` (aktuell 14px,
Referenzwert aus `zeitachse.js`) aus `js/config/constants.js` - eine
CSS-Variable (`var(--fs-sm)`) wäre hier NICHT direkt nutzbar, da die meisten
Aufrufstellen die Schriftgröße als SVG-Präsentationsattribut setzen
(`.attr('font-size', ...)`), und Attributwerte werden nicht als CSS geparst
(`var()` würde dort ignoriert) - eine JS-Konstante funktioniert dagegen für
`.attr()`-Aufrufe UND CSS-Klassen gleichermaßen.

**Wichtige Falle (live entdeckt, siehe PROJEKTLOG):** `d3.axisBottom()`/
`d3.axisLeft()`/`d3.axisTop()` setzen bei JEDEM `.call(...)`-Aufruf SELBST
`font-size:10` (Teil ihrer eigenen Default-Präsentation, zusammen mit
`fill`/`font-family`/`text-anchor`) auf die Zielgruppe - ein zuvor per
`.attr('font-size', ACHSEN_SCHRIFTGROESSE)` gesetzter Wert wird dadurch
SOFORT wieder überschrieben, auch bei jedem erneuten Redraw/Zoom-Tick (die
Achse wird bei Zoom-Interaktion typischerweise erneut `.call()`t). Ein
`.attr()` NACH dem `.call()` zu setzen hilft nur bis zum nächsten Zoom-Tick.

**Robuster Fix (bereits von `zeitachse.js` etabliert, hier auf alle
weiteren Achsen-Module übertragen): Schriftgröße per CSS-KLASSE setzen, nie
per `.attr('font-size', ...)` auf einer d3-Achsen-Gruppe** - eine CSS-Regel
hat höhere Präzedenz als ein SVG-Präsentationsattribut und übersteht daher
jeden erneuten `.call()` unverändert:

```js
// Style-Injektion (einmalig pro Redraw, wie die übrige Modul-CSS):
style.textContent = `.<modul>-achse { font-size: ${ACHSEN_SCHRIFTGROESSE}px; }`;
// Achsen-Gruppe:
svg.append('g').attr('class', '<modul>-achse').attr('transform', ...)
  .call(d3.axisBottom(xSkala)...); // font-size NICHT hier per .attr() setzen
```

Reiner `<text>` (z. B. ein Achsentitel, KEIN Ergebnis eines `d3.axis...()`-
Aufrufs) ist von dieser Falle nicht betroffen und kann weiterhin per
`.attr('font-size', ACHSEN_SCHRIFTGROESSE)` gesetzt werden.

**Randfall Zeilen-/Kategorienamen (y-Achsen-Äquivalent):** NICHT blind
anheben, wenn die Kürzung noch zeichenanzahl-basiert ist (`kategorie.length
> 22 ? ... : kategorie`, nicht pixelgenau) - eine größere Schrift bildet
denselben Zeichen-Grenzwert auf mehr Pixel ab und kann in die Plot-Fläche
hineinragen. Sicher ist die Anhebung nur, wenn die Kürzung bereits über
`js/utils/beschriftung.js`' `ermittleBeschriftungstext()` pixelgenau
erfolgt (Referenz: `dotPlot.js`) oder über CSS `text-overflow:ellipsis`
(fontgrößen-unabhängig, Referenz: `ganttDiagramm.js`s
`.gantt-namensspalte-name` - dort dennoch NICHT angehoben, weil die
umgebende Zeile eine FESTE, nicht mitwachsende Höhe hat, siehe dortiger
Kommentar). Bei zeichenanzahl-basierter Kürzung: erst auf
`ermittleBeschriftungstext()` umstellen, dann anheben - beides zusammen,
nicht die Schriftgröße isoliert ändern.

### 4. Mindestgröße + Scroll-Fallback statt Stauchung

Bei sehr kleinen Viewports NIE unter die modul-eigene Mindestgröße
(Punkt 3a) komprimieren oder Inhalt hart abschneiden - stattdessen greift
automatisch der bereits global gelöste Seiten-Scroll-Fallback aus der
Ausgangslage oben (funktioniert nur korrekt, wenn das Modul selbst KEIN
zusätzliches `overflow:hidden` mit einer vom Elternelement abgeleiteten
FESTEN (nicht wachsenden) Höhe einführt, das Inhalt unterhalb der
Mindestgröße hart clippen würde, statt die Seite wachsen zu lassen - im
Zweifel prüfen, dass die eigene Zeichenfläche bei knapper Höhe tatsächlich
über die Fensterkante hinausragt und scrollbar bleibt, nicht abgeschnitten
wird).

### 5. Bestehende Resize-Infrastruktur nutzen, keine eigene

`app.js` ruft bereits einen einzigen, debounced `window`-resize-Listener,
der `resize()` (ohne Argumente) auf dem aktiven Modul aufruft
(`RESIZE_DEBOUNCE_MS`, siehe `app.js`). Ein Modul braucht dafür KEINEN
eigenen `resize`-Listener, keinen eigenen `ResizeObserver` und keine eigene
Debounce-Logik - `resize()` muss lediglich (wie bei jedem Redraw)
`container.clientWidth`/`plotBereich.clientHeight` erneut messen und die
Zeichnung neu aufbauen, exakt wie beim ersten `render()`.

### 6. Modul-Vertrag beachten

`resize()` darf internen Zustand (Zoom-/Pan-Position, Drilldown-Ebene,
Sidebar-Auswahl) NICHT zurücksetzen, außer eine echte Breitenänderung macht
eine gespeicherte Transformation ungültig (siehe `dotPlot.js`s
`letzteBreite`-Vergleich) - dieselbe Regel gilt unverändert für die
Vollbild-Streckung selbst: eine reine Höhenänderung ohne Breitenänderung
darf z. B. eine offene Sidebar oder eine Zoom-Position nicht verwerfen.

---

## Kurz-Checkliste zum Abhaken (für den Abschlussbericht eines Moduls)

- [ ] Container-Höhe/-Breite wird zur Laufzeit gemessen, nicht angenommen
- [ ] Eigener Flex-Wrapper (`display:flex; flex-direction:column;
      height:100%`), Werkzeugleiste `flex:0 0 auto`, Zeichenfläche
      `flex:1 1 auto`
- [ ] Zeilen-/elementbasiert: Streckung mit modul-individuellem
      `[MIN, MAX]`-Clamp, Punktgröße/Elementgröße skaliert mit
- [ ] Flächenbasiert: volle Flex-Füllung, kein zusätzliches Clamping nötig
- [ ] Beschriftungen UNTERHALB der Hauptachse (z. B. "Undatiert"-Fläche):
      Platzbedarf per Trockenlauf exakt ermittelt, nicht geschätzt;
      `overflow-y:visible`/`auto` als Sicherheitsnetz statt `hidden`
- [ ] Achsen-Tick-/Titel-Schriftgröße: `ACHSEN_SCHRIFTGROESSE` aus
      `js/config/constants.js`, per CSS-KLASSE gesetzt (nie per
      `.attr('font-size', ...)` auf einer d3-Achsen-Gruppe - wird sonst bei
      jedem `.call()`/Zoom-Tick überschrieben)
- [ ] Kleine Viewports: Mindestgröße + Seiten-Scroll, kein hartes Clipping
- [ ] Kein eigener Resize-Listener/-Debounce - nutzt die bestehende
      `app.js`-Infrastruktur
- [ ] `resize()` verwirft keinen internen Zustand ohne echten Grund

## Bereits konforme Module (Referenz-Implementierungen)

**Mit eigenem Flex-Wrapper (Punkt 2), da eigene Werkzeugleiste
(Zoom-Buttons/Info-Button):** `dotPlot.js` (Zeilen-/elementbasiert, VORLAGE
für 3a), `ganttDiagramm.js`, `treemap.js`, `sunburst.js`, `icicle.js`,
`circlePacking.js` (flächenbasiert, VORLAGE für 3b), `zeitachse.js`.

**Ohne eigenen Flex-Wrapper, da KEINE Werkzeugleiste** (SVG ist einziges
Kind von `container`, daher genügt eine reine Höhenmessung ohne Punkt 2 -
siehe jeweiliger Modul-Kommentar an der Messstelle für die Begründung,
warum hier kein Wrapper nötig ist): `bubbleChart.js`, `marimekko.js`,
`streamgraph.js`, `alluvial.js`, `parallelKoordinaten.js`, `sankey.js`
(alle flächenbasiert, VORLAGE für 3b OHNE Werkzeugleiste - reines
`container.clientHeight`-Messen an der Stelle des vormals fest codierten
Höhen-Defaults, mit dem alten Wert als Mindesthöhe-Floor).

Vollständiger Audit-Status aller weiteren Module (inkl. der noch offenen):
siehe `docs/PROJEKTLOG.md`, Eintrag "Vollbild-Audit aller Module".
