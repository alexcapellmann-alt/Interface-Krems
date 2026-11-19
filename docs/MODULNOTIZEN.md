# MODULNOTIZEN.md

Technische Notizen zu einzelnen Modulen, die früher in langen Dateiköpfen standen (Auftrag 18, Teil 1, PROJEKTLOG 101).
Die Dateiköpfe nennen seitdem nur noch Zweck, Eingabedaten, Schnittstelle, Abhängigkeiten und Besonderheiten. Hier steht,
was darüber hinaus für die Nachnutzung wichtig ist: wie das Modul heute arbeitet, warum es so gebaut ist, und welche
Fehler beim Bau gefunden wurden (damit sie nicht wiederkehren).

- **Geschichte der Aufträge:** `docs/CHANGELOG.md` (was sich wann geändert hat) und `docs/PROJEKTLOG.md` (Begründung und
  Prüfung).
- **Wortlaut der früheren Köpfe:** in der Versionsgeschichte, zum Beispiel `git show 45d7c44:js/viz/bipartiteFlowMap.js`
  (letzter Stand vor der Kürzung).
- **Gemeinsame Schnittstelle aller Ansichten** (`render`, `resize`, `destroy`, Optionen `showUncertainty` und `lichtAus`):
  `docs/SCHEMA.md` und `js/config/archivalienRegistry.js`.

---

## js/viz/bipartiteFlowMap.js – Karte Soziale Gruppen

**Heutige Darstellung:** Jeder Ort aus `orte.csv` (alle Einträge, ohne Mindestschwelle) ist ein Kreisdiagramm mit vier
Segmenten für die sozialen Gruppen Dynastie, Adel, Klerus und Bürgertum. Gruppen, Priorität und Farben übernimmt das Modul
aus `chordDiagramm.js` (`GRUPPEN`, `ermittleGruppe()`).
- **Zählung:** Ein Segment zählt die Urkunden, die diesen Ort und mindestens eine Person dieser Gruppe nennen
  (`baueOrtDaten()`). Personen werden je Urkunde nur einmal gezählt, wie in `chordDiagramm.js`. Die Gruppe je Person
  kommt aus `personenliste.csv` (`soziale_gruppe`, über `uebernehmePersonenGruppen()`), mit `familien.csv` als Rückfall
  für die Dynastie (Registry `orte.datenDatei` als Mehrquellen-Objekt, `data.personenliste`, `data.familien`).
- **Segmentfolge:** fest (`d3.pie().sort(null)`), damit dieselbe Uhrzeigerposition überall dieselbe Gruppe bedeutet.
- **Größe:** Der Radius kodiert die Fläche (`d3.scaleSqrt`, bis `MAX_RADIUS`), damit die wahrgenommene Größe proportional
  zur Anzahl bleibt. Mindestens `MINDEST_RADIUS` (5 px); das `Math.max` ist nötig, weil `scaleSqrt` 0 auf 0 abbildet.
- **Orte ohne Gruppenbezug** (Summe 0) bekommen kein Kreisdiagramm (vier Nullen ergäben nichts Sichtbares), sondern einen
  grauen Vollkreis (`NEUTRAL_FARBE`) in Mindestgröße. Er bleibt anklickbar, ohne erfundene Anteile.
- **Überlappung:** In dichten Gegenden (Krems/Stein, Wien) überlappen sich Kreise bei kleiner Zoomstufe. Bewusst ohne
  Mindestschwelle gelöst: Hineinzoomen zieht die Kreise auseinander.

**Bedienung:**
- **Hover:** Ortsname und die vier Gruppenzahlen.
- **Klick auf ein Segment:** Seitenleiste mit den Urkunden dieser Gruppe an diesem Ort. `stopPropagation` verhindert, dass
  zusätzlich der Klick auf den ganzen Kreis feuert.
- **Klick auf die Trefferfläche:** Diese ist etwas größer als der Kreis (`TREFFERFLAECHE_ZUSATZ`). Der Klick öffnet alle
  Urkunden des Ortes.
- **Vergrößern:** Jeder Klick vergrößert den Ort um `VERGROESSERUNGS_FAKTOR` (1,75). `instanz.vergroessert` hält einen
  einzigen Wert, darum ist immer nur ein Ort groß.
  - `aktualisiereRadien()` schreibt die Radien aller Kreise neu. Das ist einfacher als ein Abgleich und bei rund 230 Orten
    schnell genug.
  - Ein Klick auf die freie Karte setzt die Vergrößerung über Leaflets eigenes `karte.on('click')` zurück. Die
    Seitenleiste bleibt dabei offen.
- **Gruppen-Knöpfe** in der Werkzeugleiste heben die Orte hervor, an denen eine Gruppe dominiert.
  - **Dominanz:** Es gilt die Mehrheitsregel ohne 50-%-Schwelle, wie im Infotext benannt. Bei Gleichstand an der Spitze
    dominieren alle führenden Gruppen. Orte mit Summe 0 dominieren nie.
  - **Darstellung:** Alle anderen Orte bekommen die Deckkraft `KNOTEN_ABGEBLENDETE_OPAZITAET` (0,15). Ein zusätzlicher Rand
    wäre mit der Randkennzeichnung unsicherer Orte (`orte_unsicher`) zusammengestoßen. Die hervorgehobenen Kreise werden
    nach vorn geholt (`.raise()`), damit sie bei pixelgleichen Nachbarorten nicht verdeckt werden.
  - Ein zweiter Klick auf denselben Knopf hebt die Hervorhebung auf.

**Aufbau und Lehren:**
- Kartengrundlage und SVG-Ebene kommen aus `js/utils/statischeKarte.js` (`erzeugeUeberlagerungsSvg()`). Ohne ausdrückliches
  `z-index` lag die SVG-Ebene unter den Kacheln, sobald diese geladen waren.
- Die SVG-Ebene ist ein Geschwister von `mapDiv`, nicht dessen Kind. Leaflet hört auf `mapDiv` und sieht nur Ereignisse,
  die dorthin aufsteigen. Daraus folgen drei Lehren:
  - Jede flächige, klickbare SVG-Fläche über der Karte schluckt Mausrad und Ziehen. Ein früheres Hintergrund-Rechteck tat
    genau das.
  - `.leaflet-control-container` bekam nach dem Umhängen eine volle Größe und braucht seitdem `pointer-events: none`. Seine
    Knöpfe bleiben bedienbar.
  - Viele lange unsichtbare Trefferlinien blockierten das Mausrad. Ziehen ging trotzdem, weil es nur einen freien
    Startpunkt braucht.
- `aktualisierePositionen()` läuft bei `zoom` und `move`. Es berechnet je Ort die Bildschirmposition einmal und
  speichert sie in einer `Map`, statt sie mehrfach je Element zu projizieren.
- Beim Fokusrahmen unterdrückt `:focus:not(:focus-visible)` den Rahmen nach einem Mausklick auf die Karte und auf die
  Knoten. Die Tastaturbedienung behält ihren sichtbaren Rahmen.
- Urkunden ohne auflösbaren Ort zählen nirgends mit (kein Sammelknoten „nicht verortet“), wie in `karte.js` und
  `verbindungskarte.js`.

**Frühere Formen** (in `CHANGELOG.md` unter „Bipartite Flow Map“):
- Flussbänder zwischen Orten und einer Kategoriespalte, später einer Gruppenspalte;
- danach Balkengruppen je Ort;
- seit dem Auftrag „Tortendiagramm-Knoten“ die heutige Form.

Der Dateiname `bipartiteFlowMap` stammt aus der ersten Form. Eine Umbenennung wurde zurückgestellt, weil elf Dateien
darauf verweisen.

---

## js/viz/familienbaum.js – Stammbaum (Zeitleistenbaum der Habsburger)

**Personenkreis:** Alle Einträge aus `familien.csv` mit `familie` in {habsburg, spanische_habsburger, habsburg_tirol,
habsburg_lothringen} und alle über `ehepartner_id` verknüpften Personen. Das ergibt heute 75 Personen (39 Kern,
36 Ehepartner). Der Kreis wird bei jedem `render()` aus den Daten ermittelt und einmal vorab gefiltert. Alle weiteren
Schritte (Index, Farben, Baum) arbeiten nur auf dieser Teilmenge. Damit ist eine frühere Fehlerquelle des alten
Quellenbaum-Modus, das getrennte Mitführen sichtbarer IDs, ausgeschlossen.

**Achsen:**
- **Y:** lineare Jahresskala, Bereich aus dem kleinsten und größten Geburts- bzw. Sterbejahr im Kreis. Jede Person ist ein
  senkrechtes Kästchen von Geburt bis Tod. `PIXEL_PRO_JAHR` legt die Höhe fest.
- **X:** Anordnung nach Familienzweig mit `d3.tree()`. Der Baum liefert nur die X-Position.
- **Ehepartner:** nicht Teil der Hierarchie. Sie werden nach dem Layout seitlich neben ihren Partner gesetzt.
- **Verbindungen:** Der Punkt, an dem die Kinderlinie ansetzt, liegt in der Mitte der gemeinsamen Lebenszeit beider
  Partner (`ermittleVerbindungsY()`). Gibt es keine gemeinsame Zeit, liegt er in der Mitte des Partner-Kästchens. Die
  Kinderlinien enden am Geburtsjahr des Kindes.

**Überlappung (`loeseUeberlappungGlobal()`):** `d3.tree()` setzt bei Einzelerben (ein Kind, keine Geschwister) Eltern und
Kind in dieselbe Spalte. Das betrifft 20 der 75 Personen, also die ganze Haupterbfolge. Ihre Lebenszeiten überlappen sich
meist stark (gemessen bis 281 px). Ein bloßer Randabstand reicht deshalb nicht, und die Jahresachse darf nicht verändert
werden.
- **Zwei frühere Ansätze scheiterten:**
  - Gruppieren nur nach gleicher Spalte: `nodeSize` sichert nur den Abstand zwischen Geschwistern, Nachbarspalten lagen
    teils näher als eine Kästchenbreite.
  - Ehepartner wurden dabei gar nicht erfasst.
- **Lösung:** ein Durchlauf über alle Personen nach Geburtsjahr, Anker und Ehepartner gemeinsam.
  - Es gibt eine Liste noch aktiver Kästchen: Zeitspanne plus `SPALTEN_MIN_LUECKE`.
  - Kollidiert eine Person mit einer aktiven, rückt sie abwechselnd nach rechts und links um `spaltenLaneAbstand`.
  - `baueRenderModell()` arbeitet deshalb in zwei Durchläufen: erst die Ausgangspositionen, dann Kästchen und Linien.
  - Geprüft per Skript an allen 75 × 74 Paaren. `BOX_Y_INSET` bleibt als kleiner kosmetischer Rand.

**Kästchen und Farben:**
- **Beschriftung:** Der Kurzname (Vorname und Ordnungszahl, höchstens 14 Zeichen) steht im Kästchen.
  - Die einheitliche Breite misst `berechneKastenbreite()` mit Canvas-`measureText()` am längsten Kurznamen.
  - Volle Namen (bis 55 Zeichen) hätten Kästchen von 330–375 px ergeben. Sie stehen darum im Hinweis und im Popover.
  - `instanz.spaltenAbstand` folgt der Kästchenbreite plus `ZWEIG_LUECKE_BASIS`.
- **Regierungszeit:** Hat eine Person `herrschaft_von` und `herrschaft_bis` (heute 17 Personen), liegt über dem Kästchen in
  Familienfarbe ein Abschnitt in `GOLD_FARBE`. Das ist einfacher als drei Teilstücke.
- **Durch Heirat:** Kaiserinnen und Königinnen durch Heirat (19, ohne Regierungsdaten) haben das ganze Kästchen in
  `HEIRAT_FARBE`, einem helleren Gold. So bleibt „aus eigenem Recht“ von „durch Heirat“ auch ohne Krone unterscheidbar.
  Die Kronen sitzen am Beginn des gefärbten Abschnitts.
- **Unsicher:** Unsichere Personen haben einen gestrichelten roten Rand (`#c0392b`, siehe `zeichneBaum()`). Den Modus
  „Licht aus“ (seit Auftrag 13) beschreibt `docs/EIGNUNGSMATRIX_UNSICHERHEIT.md`.
- **Legende:** `baueFarblegende()` zeigt nur Farben, die der Code wirklich verwendet. Die vier Habsburg-Abstufungen
  sind darin zu einem Eintrag zusammengefasst; die Kronen stehen nicht darin. Dafür bekam `js/utils/infoButton.js` den
  optionalen Parameter `zusatzInhalt` (ein DOM-Knoten).

**Zoom und Bedienung:**
- **Zoom:** 2D-Zoom wie in den Vorgängerfassungen: Mausrad zoomt, Ziehen verschiebt. Ein Baum braucht beides zugleich,
  anders als die eindimensionale Zeitachse. `scaleExtent` [0.2, 24], damit einzelne Jahre ablesbar werden.
- **Start:** Der Anfangsausschnitt ist nur nach der Breite begrenzt. Eine Begrenzung nach der Höhe hätte jede Vergrößerung
  von `PIXEL_PRO_JAHR` wieder aufgehoben.
- **Jahresmarken:** `ermittleJahresTickSchritt()` wählt aus festen Schritten (`JAHRES_TICK_SCHRITTE`, 200 bis 1 Jahr) die
  gröbste, die in den sichtbaren Bereich passt. `scale.ticks()` hätte krumme Schritte und doppelte Beschriftungen
  ergeben.
- **Hervorhebung:** `ermittleDirekteBeziehungen()` liest `vater_id`, `mutter_id`, `ehepartner_id` und den Kinderindex,
  nicht die Baumstruktur. Diese weicht aus Layoutgründen von der Verwandtschaft ab.
  - Die Linien tragen dafür die beteiligten IDs (`kindId`/`elternIds`, `aId`/`bId`).
  - Hover setzt `hoverFokusId`, ein Klick zusätzlich `eingefrorenerFokusId`. Wirksam ist der Hover-Fokus, sonst der
    eingefrorene.
  - Ein Klick auf eine leere Fläche löst den eingefrorenen Fokus.
  - Der Klick öffnet weiterhin das Personen-Popover.
- **Popover:** Bei langlebigen Personen ragte das Kästchen weit über das Fenster hinaus. Das Popover sprang dorthin, und
  `focus()` scrollte die Seite mit. Behoben: Die Ankerkante ist auf das Fenster begrenzt, und jedes `focus()` läuft mit
  `{ preventScroll: true }`.
- **Kurznamen:** `ermittleKurzname()` bildet sie; die Herleitung steht im Kommentar dort.

**Entfernt** (Geschichte in `CHANGELOG.md`, Aufträge „Habsburg-Zeitleistenbaum“, 11.09.2026):
- Vier-Wege-Modus und Personenauswahl;
- Quellenbaum mit Brückenpersonen und Nennungszahlen;
- Filter nach politischer Stellung samt Steiner-Baum-Berechnung (`baueVollGraph()` u. a.), die Färbung zeigt die Stellung
  schon;
- Außen-Etiketten mit `loeseLabelKollisionen()`.

---

## js/viz/dotPlot.js – Dot Plot der Urkunden

Erstes Urkunden-Modul, das auf den Stand der Bestandsansichten gebracht wurde. Die Befunde waren Vorlage für die übrigen
Urkunden-Module (CHANGELOG/PROJEKTLOG, Eintrag „Urkunden-Dot-Plot … (Vorlage für Urkunden-Module)“).

**Aufbau:**
- **Achsen:** x = Jahr, y = eine Zeile je Kategorie (erste Kategorie, `ersteKategorie()`), ein Punkt je Urkunde.
  Undatierte Urkunden stehen sichtbar in einem eigenen Bereich (`zeichneUnbekanntBereich()` aus `urkundenZeit.js`).
- **Höhe:** Ein eigener Wrapper `.dotplot-wurzel` (Flex-Spalte, `height: 100%`) ist das einzige Kind des
  `.viz-inhalt`-Containers. Die Werkzeugleiste hat ihre natürliche Höhe, der Plot den Rest. Das ist das Muster aus
  `ganttDiagramm.js`, nicht das von `treemap.js`, das `.viz-inhalt` per eigenem Stil überschreibt.
  - `.viz-inhalt` bekommt die volle Höhe schon über das Grid in `css/layout.css`; das war nie der Fehler.
  - Die Zeilenhöhe wird bei jedem Neuzeichnen aus `plotBereich.clientHeight` berechnet, begrenzt auf
    [`MIN_ZEILENHOEHE`, `MAX_ZEILENHOEHE`]; der Punktradius wächst mit. Reicht die Höhe nicht, scrollt die Seite.
- **Werkzeugleiste:** Info-Knopf (`erzeugeInfoButton()`) und Zoom-Knöpfe (`js/utils/zoomSteuerung.js`) stehen in einem
  gemeinsamen rechten Flex-Wrapper.
  - `zoomSteuerung.js` liefert nur DOM und Aussehen; das Modul verdrahtet `d3.zoom()`.
  - Die Leiste entsteht bei jedem Neuzeichnen neu, damit die Knöpfe das aktuelle Zoomverhalten kennen.
- **Zoom und Verschieben:** wie `wireZoom()` in `ganttDiagramm.js`, mit zwei Vorgaben.
  - Keine `.transition()` in der Zoomkette: Sie hängt an `requestAnimationFrame` und ist in inaktiven Tabs unzuverlässig.
  - `translateExtent()` und `extent()` decken die volle SVG-Fläche ab.
  - Ein `clip-path` begrenzt die Punktgruppe `.dotplot-punkte` auf die Fläche rechts von `RAND.links`. So wandern Punkte
    beim Zoomen nicht in die Beschriftungsspalte.
- **Kategoriebeschriftung:** gekürzt mit `ermittleBeschriftungstext()` aus `js/utils/beschriftung.js` nach der
  verfügbaren Pixelbreite der Spalte. Nur gekürzte Beschriftungen bekommen einen Hinweis (`wireKategorieLabelTooltip()`).
  Früher wurde nach Zeichenzahl ohne Hinweis gekürzt.
- **Seitenleiste:** Ein Klick auf einen Punkt öffnet die gemeinsame Urkunden-Detailansicht (`zeigeUrkundenDetail()` aus
  `sidebar.js`) mit allen Kategorien und Fotos.
- **Unsicherheit:** Gekennzeichnet wird `datum_unsicher` (wie in `zeitachse.js`).

**Bekannte Abweichung:**
- Die Punkte und Zeilen nutzen eine bei jedem Zeichnen erzeugte Farbskala (`kategorieFarbSkala`, `farbeFuerKategorie()`).
- Die Kategorie-Abzeichen in der Seitenleiste nutzen die feste Palette `CAT_COLORS` wie alle anderen Urkunden-Module.
- Punkt und Abzeichen derselben Kategorie können sich darum farblich unterscheiden. Eine Umstellung wäre ein eigener
  Auftrag.

**Befunde beim Bau** (Pixelwerte in PROJEKTLOG):
- **„Abgeschnittener Text“ unten:** Bei 0 undatierten Urkunden zeichnete `zeichneUnbekanntBereich()` die Beschriftung
  „Undatiert (0)“ trotzdem. Das SVG mit `overflow: hidden` schnitt sie etwa 9 px ab. Behoben zentral in `urkundenZeit.js`
  (`MINDEST_HOEHE_LEER`) für alle neun Aufrufer.
- **Kategorienamen:** Der später gemeldete abgeschnittene Kategoriename war ein anderer Fehler, die Kürzung nach Zeichenzahl.
  Er ist durch die Umstellung auf `beschriftung.js` behoben.

---

## js/viz/karte.js – Karte der Urkunden

**Aufbau:**
- **Marker:** ein Marker je Ort, der Radius nach Zahl der Urkunden.
  - Die Größe trägt die Information. Die Farbe ist ein einzelner technischer Ton (`MARKER_FARBE`) ohne Bezug zur
    Kategorie.
  - Orte werden über den Namen aufgelöst (`js/utils/urkundenOrte.js`). Nicht auflösbare Urkunden verwirft
    `baueOrtsAggregation()` ohne Sammelliste unter der Karte.
- **Zeitregler:** zwei überlagerte native `<input type="range">` in 10-Jahres-Schritten, nach dem Muster von
  `kalenderHeatmap.js`. Der Regler ist hier eigens gebaut, weil `kalenderHeatmap.js` ihn nicht exportiert.
  - Jedes `input`-Ereignis aktualisiert die Karte, entprellt um `DEBOUNCE_MS` (80 ms); es gibt keinen „Anwenden“-Knopf.
  - `zeichneKarte()` baut Leiste und Karte nur einmal. Während des Ziehens läuft nur `aktualisiereMarker()` und füllt die
    Markerebene neu.
  - Grund: Ein ersetzter Regler-DOM-Knoten bricht die laufende Ziehgeste ab.
- **Klick auf einen Marker** (auch mit Enter oder Leertaste): Im Normalmodus öffnet `zeigeUrkundenSidebar()` die Urkunden
  des Ortes, bei einer Urkunde direkt die Detailansicht.
  - Die Seitenleiste wird immer aufgebaut und bleibt zu, bis man einen Marker anklickt.
  - In der früheren Unsicherheitsansicht springt der Klick zum Abschnitt des Ortes (`springeZuOrtsAbschnitt()`) und hebt
    ihn `HERVORHEBUNG_DAUER_MS` (2,5 s) lang mit einem orangen `outline` hervor.
  - Das Orange ist dasselbe wie bei `.gantt-hervorgehoben`. Rot ist für Unsicherheit belegt, Blau für die Marker.
  - Der Übergang liegt auf der Basisregel `.karte-sidebar-ort`, damit auch das Ausblenden sanft verläuft.

**Unsichere Orte** (Seitenleiste der früheren Unsicherheitsansicht; heute zusätzlich Modus „Licht aus“ seit Auftrag 13,
siehe `docs/EIGNUNGSMATRIX_UNSICHERHEIT.md`):
- **Quelle:** das Feld `orte_unsicher` in `orte.csv`, also eine Eigenschaft des Ortes. Die erste Fassung nahm fälschlich
  das zeilenweise Feld aus `urkunden.csv` und kam auf eine falsche Zusammensetzung. Damals waren es 86 Orte, 63 mit und
  23 ohne Koordinaten.
- **Zugehörige Urkunden**, zwei Quellen, zusammengeführt mit einem `Set`:
  - Signaturen aus `unsicherheit_anmerkung` (`ermittleUnsichereUrkunden()`, mit Wortgrenzen, damit etwa „StaAKr-0001“
    nicht „StaAKr-0001b“ trifft);
  - zusätzlich die namensbasierte Suche im Feld `orte` (`ermittleUrkundenNachOrtsname()`).
  - Befunde dabei: Eine zitierte Signatur gab es nicht, eine gehörte laut ihrem Ortsfeld zu einem anderen Ort.
    Einzelheiten in PROJEKTLOG.
- **Orte ohne Koordinaten** stehen als erster Abschnitt „Völlig unklare Orte“ in der Seitenleiste, ohne Marker.
  `ladeOrtsVerzeichnis()` verwirft sie und gibt `unsicherheit_anmerkung` nicht heraus. Darum lädt das Modul `orte.csv`
  dafür zusätzlich selbst (`ladeCSV()` aus `core/dataLoader.js`).
- **Zurück:** Ein Klick auf eine Signatur öffnet `zeigeUrkundenDetail()`. Ein eigener Zurück-Handler führt zur
  Ortsübersicht zurück, weil die allgemeine Liste in `sidebar.js` eine flache Liste erwartet.
- **Zeitregler:** Im Unsicherheitsmodus ist er gesperrt und zurückgesetzt. Der Knopf für den Modus liegt in `app.js`,
  außerhalb dieses Moduls.

**Lehren zur Stapelung:**
- `.karte-werkzeugleiste` hat `z-index: 900`, damit das Info-Popover über Leaflets Ebenen liegt. Damit liegt sie aber auch
  über der Seitenleiste (`z-index: 500`), ebenso Leaflets Attribution.
- Befund: Bei offener Seitenleiste fing die umgebrochene Leiste Klicks auf den ersten Seitenleisten-Eintrag ab.
- Lösung: Eine `:has()`-Regel blendet die Leiste und die untere rechte Leaflet-Ecke per `visibility: hidden` aus, sobald
  `.bestand-sidebar.offen` besteht.
  - `visibility`, nicht `display`: So ändert sich die Höhe nicht, und Leaflets zwischengespeicherte Position stimmt
    weiter. Ein Reflow hätte ohne `invalidateSize()` die Kacheln versetzt.
  - Die Regel greift auch im Normalmodus.
- Der Zeitregler-Wrapper ist 320 px breit. Die Leiste bricht mit `flex-wrap` um, statt überzulaufen.

---

## js/viz/kalenderHeatmap.js – Kalender-Heatmap der Urkunden

**Auslegung:**
- Die Urkunden verteilen sich über rund 700 Jahre. Ein Kalenderraster (Monat × Tag) ergibt nur Sinn, wenn alle Jahre
  zusammengefasst werden: Eine Zelle zeigt, wie oft eine Urkunde auf diesen Kalendertag datiert ist, gleich in welchem
  Jahr. Das zeigt zum Beispiel die Häufung an Feiertagen.
- Die zweite Darstellung, Jahrzehnt × Monat, ist über einen Umschalter erreichbar. Eine Matrix Jahr × Kategorie
  gibt es schon als eigenes Modul.
- **Nicht darstellbar:** Nur Urkunden mit Tagesgenauigkeit (`datePrecision.js`: `exact`) haben einen Kalendertag. Alle
  anderen stehen sichtbar in „Nicht im Kalender darstellbar“ (`zeichneUnbekanntBereich()` aus `urkundenZeit.js`),
  berechnet in `teileNachTagesgenauigkeit()` bzw. `teileNachJahrzehntMonat()`. Diese Tabelle blendet die Option
  `showUncertainty` ein und aus (Standard: aus).

**Farbe und Legende:**
- Die Zellfarbe kommt aus `farbSkala()` (`d3.scaleSequential(d3.interpolateBlues)`).
  - Früher war jede Zelle `CAT_COLORS.default` (Grau) mit wechselnder Deckkraft. Die Zählung stimmte, aber alles wirkte
    grau.
  - `CAT_COLORS` bleibt für die Kategorie-Abzeichen in Listen.
- Die Legende ist eine eigene Flex-Gruppe `.kal-legende-gruppe` in derselben Zeile wie die Werkzeugleiste, direkt nach der
  Reglergruppe. Sie zeigt `LEGENDE_SCHRITTE` Farbquadrate aus derselben Skala (`aktualisiereLegende()`).
  - Als Gruppe bricht sie bei wenig Platz als Ganzes um.
  - Sie hat kein `margin-left: auto`, das sie an den Rand schob.
  - Nach mehreren Zwischenständen entspricht sie wieder dem ursprünglichen Vorbild.
- Der Info-Text ist statisch; der Info-Knopf entsteht einmal in `render()`.

**Zeitraum und Bedienung:**
- Der beidseitige Zeitraum-Regler ist neu gebaut; vorher gab es keinen. Er nutzt `parseJahr()` aus `urkundenZeit.js`.
  `aktiverZeitraum.bis` ist das Anfangsjahr der letzten eingeschlossenen Dekade; `zeichnePlot()` rechnet mit `bis + 9`.
- Der Moduswechsel Monat × Tag / Jahrzehnt × Monat zeigt den aktiven Zustand schon beim ersten Laden
  (`aktualisiereModusButtons()`).
- Ein Klick auf eine Zelle ruft `zeigeUrkundenSidebar(sidebar, titel, records)` aus `sidebar.js` auf: Bei einer Urkunde
  öffnet die Detailansicht, bei mehreren eine Liste mit Detailansicht in derselben Seitenleiste.
  - Früher sprang die Liste zum Regesten-Kachelraster (`navigiereZuKachel()`, entfernt). Der Mechanismus `zielSignatur` in
    `state.js` und `regestenKachelraster.js` bleibt bestehen, wird von hier aber nicht mehr befüllt.

---

## js/viz/chordDiagramm.js – Soziale Gruppen

**Inhalt:** Vier Segmente für die sozialen Gruppen Dynastie, Adel, Klerus und Bürgertum. Die Sehnen zeigen, wie viele
Urkunden Personen beider Gruppen nennen.
- **Daten:** `urkunden.csv` und `personenliste.csv` (Spalte `soziale_gruppe`), dazu `familien.csv` als Rückfall für die
  Dynastie. Das Modul steht unter `personen.ansichten` und bekommt das ganze geladene Objekt
  `{familien, personenliste, urkunden}`.
- **Vorgängerfassung:** Die frühere Fassung zeigte die 20 häufigsten Einzelpersonen (Versionsgeschichte).

**Zählung (`baueGruppenMatrixProUrkunde()`):**
- Eine Zelle `matrix[i][j]` zählt die Urkunden mit mindestens einer Person aus Gruppe i und einer aus Gruppe j. Die
  Diagonale zählt Urkunden mit mindestens zwei Personen derselben Gruppe.
- Jede Urkunde zählt je Zelle höchstens einmal. Früher zählte jedes Personenpaar, eine Urkunde mit k Personen also
  C(k,2)-mal; vielpersonige Urkunden wogen dadurch zu schwer.
- Die Personen je Urkunde kommen aus `ermittlePersonenDerUrkunde()`. Die alte `baueGruppenMatrix()` und
  `ermittleGruppeProKnoten()` sind entfallen.
- **Grenzen:** Jede Zelle ist durch die Zahl der Urkunden begrenzt, damals 1069. Die Zeilensumme, die den Winkel bestimmt,
  ist es nicht: Eine Urkunde mit drei oder vier Gruppen trägt zu mehreren Zellen einer Zeile bei. Damals betraf das 13
  Urkunden.

**Zuordnung zu Gruppen (`ermittleGruppe()`, auch von `bipartiteFlowMap.js` genutzt):**
- **Seit 27.10.2026** steht die Gruppe je Person in `personenliste.csv`, Spalte `soziale_gruppe` (dynastie, adel, klerus,
  buerger). `uebernehmePersonenGruppen()` liest sie aus `data.personenliste`.
- **Ohne Eintrag dort** zählt eine Person, deren `personen_id` in `familien.csv` steht, zur Dynastie, alle übrigen zum
  Bürgertum. Der Parameter `name` bleibt, damit die Aufrufer unverändert bleiben.
- **Vorher:** Das Modul ordnete beim Laden mit Wortlisten zu:
  - Dynastie über `familien.csv`;
  - Klerus über ganze Wörter (damit „Priorin“ nicht als „Prior“ zählt);
  - Adel über Titelwörter oder Schreibvarianten von Adelsfamilien als Teilzeichenkette;
  - Bürgertum für alles Übrige.
  - Die Spalte `soziale_gruppe` wurde mit derselben Regel befüllt. Geprüft: Alle 2 276 Nennungen ergeben dieselbe Gruppe.
- Die Einteilung ist eine eigene Faustregel, keine belegte historische Klassifikation. Der Infotext
  (`data/infotexte.csv`, `chordDiagramm`) sagt das.

`ermittleGruppenGroessen()` zählt jede einzelne Nennung (Stand damals 448/64/120/1645). Die Funktion wird nirgends
aufgerufen (toter Code, bisher stehen gelassen).

**Bedienung:**
- **Hover und Klick auf ein Segment:** heben dessen Sehnen hervor, die übrigen treten zurück. Das Muster ist wie in
  `sankey.js` und `bumpChart.js`: `hoverGruppe`, eingefroren `frozenGruppe`, `aktualisiereHighlight()`. Ein Klick auf eine
  freie Fläche oder Escape setzt zurück.
- **Klick auf eine Sehne:** öffnet die Urkunden in der Seitenleiste (`zeigeUrkundenSidebar()`).
- **Fokusrahmen:** `:focus:not(:focus-visible)` unterdrückt den Rahmen nach Mausklick. Die Tastatur behält einen eigenen
  3-px-Rahmen.
- **Beschriftung:** waagrecht, nicht mehr radial gedreht. Sie steht bei `radiusAussen + LABEL_ABSTAND` auf dem
  Mittelwinkel, `text-anchor` je Kreishälfte, mit einer kurzen Verbindungslinie in Segmentfarbe.
  - Nur der Gruppenname; die Zahlen stehen im Hinweis.
  - Der Rand ist 170 px breit, damit „Dynastie (Habsburger)“ ins SVG passt. Das SVG schneidet am eigenen Viewport ab;
    `overflow: visible` am umgebenden Div hilft nicht.

---

## js/core/app.js – Einstieg, Tabs, Laden der Ansichten

**Aufbau der Seiten:**
- **Tabs:** Startseite, Bestand, Visualisierungen, Führungen, Literatur, Über. `renderTab()` verzweigt.
  - Unbekannte Adressen zeigen „Nicht gefunden“ (`renderPlatzhalterTab()`).
  - Führungen, Literatur und Über waren anfangs Platzhalter. Heute haben sie eigene Seiten (`renderFuehrungenTab()`,
    `renderLiteraturTab()`, `renderUeberTab()` aus `ueber.csv`).
- **Visualisierungen:** Die Bereichs-Leiste (`bereichsLeiste.js`) ist dauerhaft sichtbar und ersetzt die frühere einmalige
  Kachelauswahl; `kachelauswahl.js` ist gelöscht.
  - Bereiche mit `hatGalerie: true` zeigen zuerst eine Galerie (`visualisierungsGalerie.js`).
  - Sonst öffnet sich die Primäransicht, und `ansichtWechseln.js` wechselt.
- **Bestand:** Er ist ein Haupttab ohne Bereichs-Leiste, nutzt aber dasselbe Muster aus Galerie und Flyout. Die Funktionen
  `zeigeGalerie()`, `stelleVizFlyoutSicher()`, `wechsleZuAnsicht()` und `aktualisiereGalerieFlyoutAnsicht()` arbeiten
  darum auf einem allgemeinen Kontext:
  - `kontext.bereich` mit `{label, ansichten, datenDatei}`;
  - `kontext.routeSegmente(id)` und `kontext.ermittleAnsichtId(route)` setzen die Route zusammen;
  - `kontext.ausloeser` ist das Element, das das Flyout auslöst.
  - `renderVisualisierungenTab()` (Galerie-Zweig) und `renderBestandTab()` bauen nur ihren Kontext.
- **Flyouts:**
  - Die Tab-Leiste der Visualisierungen ist ein Flyout mit `position: fixed` (`visualisierungsTabs.js`,
    `verankereFlyout()`), das die Ansicht überlagert, statt eine eigene Grid-Zeile zu belegen.
  - `verankereHauptnavFlyouts()` verankert die Flyouts der Hauptnavigation einmal beim Start, damit sie von überall
    erreichbar sind:
    - Hover auf „Visualisierungen“ zeigt eine Vorschau der Bereichs-Leiste (`erzeugeBereichsLeistenVorschau()`); jeder
      Eintrag hat sein eigenes Tab-Flyout (`erzeugeVizVorschauFlyout()`, auch verschachtelt).
    - Hover auf „Bestand“ zeigt dessen Ansichten als Kacheln (`verankereIconFlyout()`).
  - Ein Klick auf die Hauptnavigation navigiert normal und schaltet nichts um.
  - Verlauf der Navigationsformen (Mehrfach-Tabs, feste Tab-Leiste, Flyout): CHANGELOG 41, 42, 44, 46.

**Grundsätze, die beim Ändern gelten:**
- **Nachladen:** Jedes Visualisierungsmodul wird erst beim ersten Aufruf per `import()` geladen, nie beim Start. Die Pfade
  aus `archivalienRegistry.js` (`../viz/…`) gelten auch von `js/core/` aus, weil beide Ordner auf derselben Ebene liegen.
- **Schutz vor Überholen:** Der Zähler `generation` steigt bei jedem vollständigen Tab-Neuaufbau. Jede asynchrone
  Ladefunktion merkt sich ihre Generation und bricht nach jedem `await` ab, wenn inzwischen ein neuerer Aufbau begonnen
  hat. Sonst würde in abgebaute Container gezeichnet, oder es liefe eine Force-Simulation, deren `destroy()` nie kommt.
- **Ansichtswechsel oder Neuaufbau:** Wechselt nur die Ansicht im selben Tab oder Bereich (Tab, Zurück/Vor), wird nicht der
  ganze Tab abgebaut, sondern das Modul gewechselt (`destroy()` alt, `render()` neu).
  - Das ist nötig: Sonst löst `navigiereZu()` in `ladeModulUndRender()` einen `hashchange` aus, und jeder Wechsel zeichnet
    doppelt.
  - Die schnellen Pfade stehen in `handleRouteChange()`.
- **Fenstergröße:** Ein einziger entprellter `resize`-Listener (`RESIZE_DEBOUNCE_MS` = 200 ms) ruft `resize()` des aktiven
  Moduls ohne Argumente auf. Jedes Modul misst selbst; die Kartenmodule rufen `invalidateSize()` auf.
  - Die Generation wird beim letzten rohen Ereignis festgehalten und nach der Pause geprüft. So wird nach einem Tabwechsel
    kein verlassenes Modul mehr angepasst.
- **Modus „Licht aus“:** Wann der Modus endet, steht in `handleRouteChange()` und in `modusNachWechsel()`
  (`js/utils/lichtAus.js`). Seit Auftrag 17 endet er auch beim Wechsel zwischen Bestand und Visualisierungen und auf Seiten
  ohne Ansicht (PROJEKTLOG 100).

---

## js/viz/verbindungskarte.js – Verbindungskarte

**Heutige Darstellung (seit 28.10.2026, nach dem Prinzip der Karte hinter der Bilderwand):**
- **In Ruhe:** nur die Orte als Kreise, die Größe nach Zahl der Urkunden des Ortes. Keine Linien; die Kartenkacheln sind
  gedämpft.
- **Hover oder Tastaturfokus auf einen Ort:** Der Ort tritt mit Hof und Namen hervor. Nur seine Verbindungen erscheinen als
  leicht gebogene Bögen; Deckkraft und Breite wachsen mit der Zahl gemeinsamer Urkunden. Die verbundenen Orte leuchten
  mit, alle übrigen treten zurück.
  - Eine Verbindung ist eine Ko-Nennung: Zwei Orte stehen in derselben Urkunde.
  - Die Bögen sind immer gleich herum gekrümmt.
  - Der aktive Ort wird als Kopie in einer eigenen Ebene gezeichnet, nicht mit `raise()`.
- **Klick:** hält die Hervorhebung fest und öffnet die Seitenleiste mit allen Urkunden des Ortes (`baueOrtRecordsMap()`,
  `zeigeUrkundenSidebar()`). Ein zweiter Klick oder ein Klick auf die freie Karte löst sie.
- **Entfallen:**
  - der Regler „Verbindungsstärke“ (mit Mindestschwelle 2);
  - die stets sichtbaren geraden Linien mit Dicke nach Häufigkeit;
  - die breiten unsichtbaren Trefferlinien;
  - die Zeile „X von Y Verbindungen“.

**Aufbau und Lehren:**
- Kartengrundlage und SVG-Ebene kommen aus `js/utils/statischeKarte.js` (`erzeugeUeberlagerungsSvg()`). Ohne ausdrückliches
  `z-index` lag die SVG-Ebene unter `.leaflet-map-pane` (`z-index: 400`), und die Linien verschwanden, sobald Kacheln
  nachluden.
- Die Karte ist eine normale bedienbare Leaflet-Karte. `aktualisierePositionen()` läuft bei `zoom` und `move`, nicht erst am
  Ende der Geste; so folgen die Bögen flüssig.
- Urkunden mit weniger als zwei auflösbaren Orten bilden keine Verbindung. Es gibt keinen Sammelknoten „nicht verortet“,
  wie in `karte.js`.
- Bei offener Seitenleiste blendet dieselbe `:has()`-Regel wie in `karte.js` Werkzeugleiste und Attribution aus, die sonst
  darüber lägen.
- Eine Beschreibung des SVG für Hilfsmittel kommt aus dem Infotext (`beschreibeSvgAusInfotext()`).

---

## js/core/visualisierungsTabs.js – Flyouts der Visualisierungen

**Kern und Varianten:** Die Tab-Leiste der Visualisierungen ist seit CHANGELOG 44 ein Flyout mit `position: fixed`, vorher
eine feste Grid-Zeile (42). Gemeinsamer Kern ist `erzeugeFlyoutPanel()`, darauf bauen drei Varianten auf:
- **`verankereFlyout()`** für den aktiven Bereich bzw. Bestand: Ein Klick auf den Auslöser schaltet das Flyout um. Der
  Auslöser ist ein reiner `#`-Anker. `.aktualisiere()` ändert die aktive Ansicht live.
- **`verankereVorschauFlyout()`** öffnet nur beim Hover und hat keinen eigenen Klick-Handler. Der Auslöser hat schon eine
  eigene Klickfunktion, etwa einen inaktiven Bereichs-Tab; ein zweiter Handler mit `preventDefault()` hätte doppelt
  reagiert.
- **`verankereIconFlyout()`** zeigt Kacheln mit Symbol und Name (Hover auf „Bestand“). Ein Klick schließt nur, ohne
  `preventDefault()`, denn „Bestand“ ist ein echter Anker zur Galerie.

**Schließen:**
- Ein Klick auf einen Eintrag schließt sofort. Das Flyout liegt über der Fläche, auf der das Ergebnis erscheint, und
  würde die eigene Auswahl verdecken.
- **Seit CHANGELOG 47** schließt Wegbewegen der Maus nicht mehr; es schließt ein Klick außerhalb der offenen Kette
  (`stelleGlobalenKlickListenerSicher()`, ein einziger globaler Listener).
  - Grund: Die Panels verschachtelter Ketten liegen als Geschwister direkt in `<body>`. Beim Wandern von einer Ebene zur
    nächsten verlässt die Maus kurz Auslöser und Panel der äußeren Ebene. Das alte Schließen nach `mouseleave` mit 200 ms
    Verzögerung hielt das irgendwann für Verlassen.
  - Der globale Check schließt auch äußere Ebenen, wenn in einer inneren geklickt wird. Er überschneidet sich mit
    `zusaetzlichSchliessen` in `app.js`; beide Wege sind idempotent.
- **Stapel-Bug:** Seitdem blieben nacheinander gehoverte, nicht verwandte Panels offen. Darum schließt jedes `oeffne()`
  zuerst die offenen Instanzen, die nicht zur eigenen Kette gehören, deren Panel also den eigenen Auslöser nicht enthält
  (`schliesseGeschwister()`). Echte Vorfahren bleiben offen.
- **`schliesstBeiWegbewegen`** (Standard `false`) schaltet nur für die vorübergehenden Vorschau-Flyouts zusätzlich das
  Schließen beim Wegbewegen ein. Das gilt für Vorschau- und Icon-Flyout und das Hauptnav-Flyout „Visualisierungen“ in
  `app.js`. `verankereFlyout()` bleibt offen bis zum Klick.

**Weiteres:**
- Die Position berechnet nur `positioniere()` in `erzeugeFlyoutPanel()`, für alle Varianten. X richtet sich am Auslöser
  aus, nicht an `#app-content`.
- **Baustein:** kennt weder `router.js` noch die Ansichtsmodule. Jede Variante baut ein eigenes `<div>` in `<body>`
  (unabhängig vom Stapelkontext des Auslösers) und meldet Klicks über `options.onAktivieren(id)`. Die Navigation
  entscheiden `app.js` und `bereichsLeiste.js`.
- Die Hinweise mit Symbol kommen aus `js/utils/tooltip.js`.

---

## js/viz/zeitachse.js – Zeitachse der Urkunden

**Aufbau:**
- **Punkte:** ein Punkt je Urkunde nach Jahr, als Beeswarm (d3-force), nicht als Stapel je Jahr. Undatierte Urkunden stehen
  in einem eigenen Bereich.
- **Farbe:** nach erster Kategorie (`farbeFuerUrkundenKategorie()`).
  - Das Mehrfachauswahl-Menü `baueKategorieFilter()` ist zugleich Filter und Legende und mit dem Unsicherheitsfilter durch
    UND verknüpft.
  - Ohne Auswahl sind alle Punkte einheitlich `NEUTRALE_PUNKTFARBE`.
- **Rand je Punkt:** Kein einzelner Hintergrund erreicht 3:1 gegen alle 18 Punktfarben (per Suche über alle Grauwerte
  geprüft). Darum bekommt jeder Punkt einen eigenen Kontrastrand (`ermittleRandfarbe()`, Schwarz/Weiß-Wahl wie bei den
  Abzeichen in `kategorieFarben.js`). Die Messung ist bei `ermittleRandfarbe()` dokumentiert.
- **Unsicherheit:** `options.showUncertainty` filtert echt; nicht betroffene Urkunden verschwinden aus Beeswarm und
  Undatiert-Bereich. Die Regeln sind dieselben wie `istRecordUnsicher()` in `regestenKachelraster.js`. Die Kopie ist
  gewollt, weil die Funktion dort nicht exportiert ist.
  - Seit Auftrag 16 bleibt die Kategorieauswahl beim Umschalten von σ erhalten (PROJEKTLOG 99).

**Größe und Achsen:**
- Die Höhe kommt aus `ermittleVerfuegbareHoehe()` (`js/utils/viewportGroesse.js`) und fließt in `berechneBeeswarm()` ein.
  Die Zoom-Obergrenze folgt der Breite (`ermittleZoomSkalenExtent()`).
- Unter 900 × 500 px ersetzt der Hinweis aus `js/utils/bildschirmHinweis.js` die Ansicht. Das wird bei jedem
  `zeichneZeitachse()` geprüft, also auch bei `resize()`.
- **Achsentitel:** „Ausstellungsjahr“ und „Anzahl der Urkunden“ (gedreht), in `var(--fs-sm)` und `var(--text-muted)`.
  Vorher gab es im Projekt keine Achsentitel.
- **Teilstriche:** Schrift 14 px (`TICK_SCHRIFTGROESSE`); die Zahl der Teilstriche hängt von der Breite ab
  (`ermittleTickAnzahl()`).

**Bedienung:**
- Mausrad zoomt, Ziehen verschiebt.
- Ein Klick auf einen Punkt öffnet `zeigeUrkundenDetail()` aus `sidebar.js` mit Fotos.
- Den Info-Knopf erzeugt `render()` nur einmal in einem eigenen Container. Er hängt Listener an `document`; ein Neubau bei
  jedem Zeichnen hätte sie vervielfacht.
