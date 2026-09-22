// js/viz/bipartiteFlowMap.js
// Bipartite Flow Map der Urkunden: Flüsse von geografischen Orten (echte
// Kartenposition) zu Kategorien (feste Seitenspalte, wie bei alluvial.js) - zeigt,
// welche Kategorien an welchen Orten überwiegen. Modul-Interface siehe Abschnitt 5.
// Voraussetzung: Leaflet 1.9 global geladen. Kartengrundlage über
// js/utils/statischeKarte.js.
//
// Bipartit heißt hier zwei strukturell verschiedene Knotenarten (Ort = geografischer
// Punkt, Kategorie = Seitenspalten-Knoten) statt einer einzelnen Achse wie bei
// marimekko.js/alluvial.js.
//
// KORREKTUR (Auftrag "SVG-Overlay z-index setzen", siehe CHANGELOG): das
// SVG-Overlay wird jetzt über js/utils/statischeKarte.js' neue
// erzeugeUeberlagerungsSvg() gebaut statt selbst per `d3.select(mapDiv)
// .append('svg')...` - identischer Root-Cause-Fund wie in verbindungskarte.js
// (siehe dortiger Kommentar): ohne explizites z-index lag das Overlay
// dauerhaft UNTER Leaflets Kachel-Ebene, sobald deren Kacheln tatsächlich
// geladen waren.
//
// ERGÄNZUNGSAUFTRAG "Karten navigierbar machen, 'Nicht verortet'-Knoten
// entfernen" (siehe verbindungskarte.js für die volle Herleitung, hier
// identisch angewandt):
//
// Punkt 1 (Zoom/Pan): aktualisierePositionen() (neu, unten) berechnet die
// LINKE (geografische) Seite jedes Flussbandes bei jeder Kartenbewegung
// (`karte.on('zoom move', ...)`) neu - die RECHTE Seite (Kategorie-Spalte)
// ist nicht geografisch und bleibt unverändert fix stehen.
//
// Punkt 2 ("Nicht verortet"-Knoten entfernt): dieselbe Sonderbehandlung wie
// in verbindungskarte.js existierte hier ebenfalls (Prüfauftrag bestätigt)
// und ist jetzt ebenso ersatzlos entfernt - Urkunden ohne auflösbaren Ort
// tragen jetzt zu KEINEM Fluss mehr bei (statt zu einem Sammelknoten),
// dieselbe Konvention wie karte.js'/verbindungskarte.js' "nicht auflösbare
// Records werden direkt verworfen".
//
// AUFTRAG "Stärke-Regler (Verbindungskarte) + Node-Klick-Sidebar (beide
// Module)", Punkt 2 (der Stärke-Regler aus Punkt 1 des Auftrags gilt
// AUSDRÜCKLICH nur für verbindungskarte.js, hier nicht umgesetzt): Klick auf
// einen Orts-Knoten ODER einen Kategorie-Knoten öffnet jetzt sidebar.js'
// etabliertes zeigeUrkundenSidebar() - für Orte mit den Urkunden, deren
// `orte`-Feld diesen Ort auflösbar enthält (baueOrtRecordsMap(), neu), für
// Kategorien mit den Urkunden, deren erste Kategorie (ersteKategorie(),
// dieselbe Funktion wie beim Bau der Flüsse oben) übereinstimmt
// (baueKategorieRecordsMap(), neu). Orts-Knoten (`circle.orts-knoten`)
// existierten hier bisher NICHT als eigenes Element (nur die Flussbänder
// selbst) - neu ergänzt, analog zu verbindungskarte.js' bereits vorhandenen
// Orts-Kreisen, damit es überhaupt einen klickbaren Ort-Knoten gibt.
// Dieselbe `:has()`-Sidebar-Überlappungs-Ausblendung wie verbindungskarte.js
// (siehe dortiger Kommentar) proaktiv übernommen.
//
// AUFTRAG "Bipartite Flow Map – Überarbeitung":
//
// Punkt 1 (Orts-Knoten nach dominierender Kategorie einfärben):
// ermittleDominanteKategorie() (neu) summiert je Ort die `anzahl` pro
// Kategorie über alle Flüsse dieses Ortes, sortiert absteigend (Gleichstand:
// alphabetisch, `localeCompare('de')` - deterministisch, nachvollziehbar).
// Orts-Knoten-Füllfarbe kommt jetzt aus `farbeFuerKategorie()` der
// dominanten Kategorie statt der bisherigen festen ORT_KNOTEN_FARBE (jetzt
// entfernt, da ungenutzt). Ein neuer Hover-Tooltip auf den Orts-Knoten
// (vorher keiner vorhanden) macht die dominante Kategorie UND einen
// Gleichstand explizit sichtbar (Auftrag wörtlich: "im Tooltip/Popover kurz
// kenntlich machen").
//
// Punkt 2 (Kategoriebalken-Klick hebt hervor statt Sidebar zu öffnen):
// dasselbe, bereits etablierte Fixierungs-Muster wie sankey.js' Punkt 5
// ("Klick auf Balken fixiert Hervorhebung statt Sidebar") - EIN einfacher
// Auswahl-Zustand `instanz.auswahl = {kategorie}` statt sankey.js' vollem
// Hover+Auswahl-System (hier nicht gebraucht, der Auftrag verlangt nur die
// Klick-Fixierung, kein separates Hover-Preview). aktualisiereHighlight()
// (neu) dimmt alle Bänder/Orts-Knoten/Kategorie-Knoten/-Labels, die NICHT
// zur ausgewählten Kategorie gehören (dieselben Opazitäts-Ebenen wie
// sankey.js: NORMALE_/HERVORGEHOBENE_/ABGEBLENDETE_/KNOTEN_ABGEBLENDETE_
// OPAZITAET). Reset über erneuten Klick auf denselben Balken, Klick auf die
// freie Fläche (unsichtbares Hintergrund-Rect, unterste SVG-Ebene) oder
// Escape (document-weiter Listener, analog sankey.js' handleEscape()).
//
// Punkt 3 (Ort-Klick weiterhin Sidebar): UNVERÄNDERT - Orts-Knoten behalten
// ihre bestehende Klick-Logik aus dem vorigen Auftrag (zeigeUrkundenSidebar()),
// nur die Füllfarbe (Punkt 1) und ein neuer Tooltip kommen hinzu. Live
// regressionsgeprüft nach allen übrigen Änderungen (siehe Selbstauskunft).
//
// Punkt 4 (Kategoriespalte außerhalb der Karte, LINKS positioniert): neuer
// Layout-Aufbau - `plotWrapper` (position:relative, feste Breite/Höhe) ist
// jetzt der Elternknoten von sowohl `mapDiv` (Leaflet, per `position:
// absolute; left:SPALTEN_BREITE` nach rechts versetzt) als auch dem
// SVG-Overlay (jetzt an `plotWrapper` gehängt, NICHT mehr an `mapDiv` - der
// gemeinsame Baustein erzeugeUeberlagerungsSvg() aus js/utils/
// statischeKarte.js braucht dafür keine Änderung, er nimmt einfach
// irgendeinen Container entgegen). Das Overlay deckt dadurch die VOLLE
// Breite (Kategoriespalte + Karte) ab, während die eigentliche Leaflet-
// Kartenfläche (Kacheln) nur noch rechts von SPALTEN_BREITE existiert - echte
// Layout-Trennung, nicht nur Z-Stapelung. `mapDiv` bekommt zusätzlich ein
// eigenes, niedriges explizites z-index (1), das GARANTIERT einen eigenen
// CSS-Stapelkontext erzwingt (position+explizites z-index, nicht `auto`) -
// ohne das wäre nicht in jedem Browser sichergestellt, dass Leaflets interne
// Panes (bis z-index 400) als Ganzes unter dem SVG-Overlay (z-index 450,
// jetzt ein GESCHWISTER von mapDiv statt dessen Kind) bleiben. Orts-
// Positionen (`projiziere()`, kartenbezogen) brauchen jetzt einen
// horizontalen Versatz um SPALTEN_BREITE (projiziereOrtAufKarte(), neu),
// da ihr Koordinatenursprung weiterhin `mapDiv` selbst ist, das SVG-Overlay
// aber ab `plotWrapper`s Ursprung zählt. Die Kategoriebalken selbst wandern
// an den RECHTEN Rand der Spalte (nah an der Kartengrenze, damit die
// Flussbänder - die laut Auftrag weiterhin über die Karte verlaufen dürfen -
// einen kurzen, sauberen Übergang haben), die Labels stehen LINKS davon
// (rechtsbündig, `text-anchor:end`, wächst in den freien Spaltenraum hinein
// statt in Richtung Karte).
//
// Punkt 5 (größere Beschriftung): Kategorie-Label-Schriftgröße von 10 auf 14
// erhöht (entspricht `--fs-sm`, demselben "Nebentext"-Richtwert wie an
// anderer Stelle im Projekt) - SPALTEN_BREITE gleichzeitig von 170 auf 220
// vergrößert, damit die größere Schrift weiterhin Platz hat, ohne die
// Kürzungs-Schwelle verschärfen zu müssen.
//
// Punkt 6 (breitere Hover-Trefferfläche für Flussbänder, aus dem vorigen
// Auftrag vorgemerkt): dieselbe Lösung wie verbindungskarte.js' Punkt 3 -
// eine zusätzliche, unsichtbare `line.flow-band-trefferflaeche` (transparent,
// stroke-width:14) von der EXAKTEN Ort-Position zur MITTE des jeweiligen
// Kategorie-Segments (nicht die spitz zulaufende Bandform selbst nachziehen -
// eine gerade Linie ist überall gleich breit, auch direkt am Ortsende, wo
// das sichtbare Band auf 0 zuläuft). Trägt jetzt Tooltip-Listener/
// Tastatur-Fokus, das sichtbare Band selbst ist rein dekorativ
// (`pointer-events:none`).
//
// AUFTRAG "Bipartite Flow Map – Zoom-Regression beheben, Balken auf soziale
// Gruppen umstellen":
//
// Punkt 1 (Zoom-Regression, ROOT CAUSE per Live-Diagnose gefunden - siehe
// Selbstauskunft im Chat für die volle Herleitung, hier die Kurzfassung):
// WEDER eine neue statische L.map()-Instanz NOCH ein fehlendes
// invalidateSize() (beide vom Auftrag als Verdacht genannt) waren die
// Ursache. Tatsächliche Ursache: seit Punkt 4 des vorigen Auftrags ist das
// SVG-Overlay ein GESCHWISTER von `mapDiv` (beide Kinder von `plotWrapper`),
// nicht mehr dessen KIND. Leaflets Drag-/Zoom-Handler lauschen aber auf
// `mapDiv` SELBST und reagieren nur auf Maus-/Wheel-Ereignisse, die durch
// dessen eigenen Nachkommen-Baum BUBBLEN. Das im vorigen Auftrag ergänzte,
// unsichtbare Hintergrund-Rect (volle `breite` × `gesamtHoehe`,
// `pointer-events:auto`, für "Klick auf freie Fläche setzt Hervorhebung
// zurück") lag als Geschwister-Element ÜBER der kompletten Kartenfläche und
// fing dadurch JEDES Maus-/Wheel-Ereignis dort ab, BEVOR es überhaupt
// `mapDiv` erreichen konnte - per `document.elementFromPoint()` an der
// Zoom-Button-Position UND der Kartenmitte live bestätigt (beide Male kam
// das `<rect>` zurück, nicht der Zoom-Button/die Karte). Fix: das
// Hintergrund-Rect deckt jetzt NUR NOCH die Kategoriespalte ab (`width:
// SPALTEN_BREITE` statt `breite`) - die "Klick auf freie Fläche"-Funktion
// bleibt für die Spalte erhalten, blockiert aber nicht mehr die komplette
// Kartenfläche. Die verbleibenden, kleinflächigen Interaktions-Elemente auf
// der Karte selbst (Orts-Knoten, Hover-Trefferflächen der Bänder) fangen an
// ihrer eigenen, kleinen Position weiterhin Klicks ab - derselbe, bereits
// akzeptierte Kompromiss wie in verbindungskarte.js (dort funktioniert Zoom/
// Pan trotz identischer Elemente, weil deren SVG-Overlay dort weiterhin ein
// KIND von mapDiv ist, Ereignisse also normal zu mapDiv hochbubbeln).
//
// Punkt 2 (Balken auf soziale Gruppen umgestellt): die Kategoriespalte zeigt
// jetzt die vier sozialen Gruppen aus chordDiagramm.js (GRUPPEN/
// ermittleGruppe(), von dort EXPORTIERT und hier importiert statt neu
// implementiert, Auftrag wörtlich) - Dynastie/Adel/Klerus/Bürgertum, exakt
// dieselbe Priorität und Farben. Ein Flussband verbindet einen Ort mit einer
// Gruppe, wenn mindestens eine Urkunde diesen Ort UND mindestens eine Person
// dieser Gruppe enthält (ermittleGruppenDerUrkunde()/baueFluesse(), neu -
// dieselbe "eindeutige Personen pro Urkunde"-Deduplizierung wie
// chordDiagramm.js' ermittleGruppenAnzahlProUrkunde(), hier aber nur die
// MENGE der beteiligten Gruppen gebraucht, nicht deren Personenanzahl).
// Dafür lädt dieses Modul jetzt zusätzlich familien.csv (siehe
// archivalienRegistry.js' `orte.datenDatei`, jetzt ein Mehrquellen-Objekt
// wie bei `personen`) für den Dynastie-Abgleich.
//
// Nicht-Ziel (Auftrag wörtlich): die Orts-Knotenfarbe bleibt bei der
// DOMINIERENDEN THEMATISCHEN KATEGORIE aus dem vorigen Auftrag
// (ersteKategorie()/CAT_COLORS, UNVERÄNDERT) - eine bewusste Mischung aus
// zwei verschiedenen Klassifikationen (Knoten nach Thema, Balken nach
// sozialer Gruppe) in derselben Ansicht. Da die Balken jetzt NICHT mehr die
// Kategorien sind, kann `ermittleDominanteKategorie()` nicht mehr aus
// `fluesse` (jetzt gruppenbasiert) abgeleitet werden - eine eigene,
// parallele Ort→Kategorie-Zählung (ermittleOrtKategorieZaehlung(), neu)
// übernimmt das jetzt unabhängig von den Gruppen-Flüssen.
//
// AUFTRAG "Bipartite Flow Map – drei Regressionen nach dem Gruppen-Umbau":
// alle drei vom Auftrag genannten Verdachtsursachen erwiesen sich als
// FALSCH (live per elementFromPoint()/DOM-Datenabgleich widerlegt, siehe
// Selbstauskunft im Chat für die volle Herleitung).
//
// Punkt 1 (Mausrad-Zoom)/Punkt 2 (Node-Klick/Hover): EIN gemeinsamer Fund
// für beide - der vorige Auftrag gab `.leaflet-control-container` beim
// Verschieben nach `plotWrapper` zum ERSTEN MAL eine echte Breite/Höhe
// (volle Kartengröße, nötig für die korrekte Positionierung der
// rechts-/unten-verankerten Leaflet-Steuerelemente), aber KEIN eigenes
// `pointer-events:none` - der Container-KASTEN selbst (nicht nur seine
// Buttons, die bereits korrekt `auto` innerhalb von `.leaflet-top`/
// `.leaflet-bottom`s `none` sind) wurde dadurch zu einer unsichtbaren,
// Wheel-/Klick-schluckenden Fläche über der GESAMTEN Karte - bestätigt per
// elementFromPoint()-Raster über die komplette Kartenfläche (jeder Punkt
// lieferte `.leaflet-control-container`, nicht die Karte/Orts-Knoten
// darunter). Fix: `pointerEvents = 'none'` auf dem Container selbst
// ergänzt. Die vom Auftrag vermuteten Ursachen (Overlay-Trefferflächen
// blockieren Wheel; verlorene Event-Listener nach dem Gruppen-Umbau) waren
// NICHT die Ursache - Live-Test per dispatchEvent() bewies, dass die
// Klick-/Hover-Listener der Orts-Knoten die ganze Zeit korrekt gebunden
// blieben, nur nie erreicht wurden.
//
// Punkt 3 (verwaiste hervorgehobene Knoten): die vermutete Ursache
// (Hervorhebungslogik arbeitet noch kategorie-basiert) traf NICHT zu - ein
// direkter Abgleich der Kreis-Opazität gegen die gebundenen `fluesse`-Daten
// (zwei Gruppen getestet) ergab ZERO Diskrepanzen, `beteiligt` nutzt
// bereits korrekt `f.gruppe`. Tatsächliche Ursache: bei dieser Zoomstufe
// liegen mehrere geografisch nahe Orte auf demselben Bildschirm-Pixel: ein
// hervorgehobener Kreis konnte am selben Punkt mehrere unverbundene,
// abgeblendete Kreise optisch verdecken (oder umgekehrt) - unabhängig vom
// Hervorhebungs-Zustand, rein nach Dateneinlese-Reihenfolge in der DOM
// gestapelt. Fix: `aktualisiereHighlight()` hebt (`.raise()`) alle
// tatsächlich beteiligten Kreise konsequent ans Ende ihres Elternknotens -
// an jedem Kollisionspunkt liegt danach ein verbundener Kreis sichtbar über
// allen unverbundenen an derselben Position.
//
// AUFTRAG "Bipartite Flow Map – Zoom, Performance, Sichtbarkeit,
// Fokus-Rahmen":
//
// Punkt 1 (Mausrad-Zoom weiterhin defekt, obwohl Drag inzwischen
// funktioniert): die im Auftrag vermuteten Kandidaten (Overlay-
// Trefferflächen fangen Wheel gezielt ab; touch-action blockiert nur
// Scroll-Gesten) - der ERSTE Kandidat war strukturell zutreffend, der
// zweite nicht separat nötig. Fundstelle: `line.flow-band-trefferflaeche`
// (409 Elemente, `stroke-width:14`, `pointer-events:auto` über die
// Elterngruppe) kreuzten als GESCHWISTER von `mapDiv` einen Großteil der
// sichtbaren Kartenfläche (jede Linie verläuft vom Gruppen-Balken bis zu
// ihrem jeweiligen Ortsknoten, irgendwo auf der Karte) - ein Wheel-Ereignis
// an praktisch jeder Scroll-Position trifft mit hoher Wahrscheinlichkeit
// eine dieser Linien, die (identisch zum bereits diagnostizierten
// Geschwister-von-mapDiv-Bubbling-Problem) das Ereignis abfängt, bevor es
// `mapDiv` erreicht. Drag funktionierte bereits, weil ein Drag nur an
// SEINEM STARTPUNKT eine freie (nicht von einer Linie bedeckte) Stelle
// braucht - Folgebewegungen laufen über einen bereits gestarteten
// Leaflet-internen Drag-Zustand, der nicht erneut pro Bewegung auf
// `mapDiv` treffen muss. Da Punkt 3 dieses Auftrags die Trefferflächen
// ohnehin ersatzlos entfernt (siehe unten), ist damit auch dieser Blocker
// weg - Mausrad-Zoom live bestätigt (Kachel-Zoomstufe z=5 → z=7 nach
// echtem Scroll-Gesten-Test).
//
// Punkt 2 (Drag-Performance): `aktualisierePositionen()` rief
// `positionVonOrt()` (intern Leaflets `latLngToContainerPoint()`, eine
// nicht-triviale Transformation) vorher bis zu VIER Mal redundant für
// DENSELBEN Ort pro `move`-Ereignis auf (einmal je Fluss dieses Ortes in
// `baender`, nochmal je Fluss in der jetzt entfernten
// `baenderTrefferflaeche`). Fix: Positionen werden jetzt EINMAL pro
// tatsächlich beteiligtem Ort in einer `Map` zwischengespeichert
// (`ortPositionen`) und von `baender`/`ortsKnoten` nur noch nachgeschlagen
// - reduziert echte Projektions-Berechnungen pro Bewegung von geschätzt
// ~1600+ auf ~225, zusätzlich zum kompletten Wegfall der 409
// Trefferflächen-Attribut-Updates (Punkt 3).
//
// Punkt 3 (keine Linien-Tooltips mehr): `line.flow-band-trefferflaeche`
// samt ihrer `mouseenter/focus`/`mouseleave/blur`-Tooltip-Listener und
// `baueFlussTooltip()` ersatzlos entfernt (Auftrag wörtlich) - trägt auch
// zu Punkt 1 und 2 bei (s.o.).
//
// Punkt 4 (Mindest-Strichstärke): jedes sichtbare Band bekommt zusätzlich
// zur (weiterhin proportional kodierten) Füllung einen eigenen,
// gruppenfarbenen `stroke` mit `MINDEST_STRICHSTAERKE` (1,5px) - zeichnet
// die Kontur JEDER Verbindung, auch der am Ortsknoten spitz zulaufenden,
// durchgehend sichtbar nach, ohne die bestehende "dickere Füllung = mehr
// Verbindungen"-Kodierung selbst zu verändern.
//
// Punkt 5 (Gruppen-Klick blendet Linien komplett aus): `baender` bekommen
// bei nicht ausgewählter Gruppe jetzt `fill-opacity:0` UND
// `stroke-opacity:0` (vorher ABGEBLENDETE_OPAZITAET, sichtbar gedimmt) -
// die Gruppen-Balken selbst (`gruppenKnotenAuswahl`/`gruppenLabelAuswahl`)
// bleiben unverändert nur gedimmt (Auftrag wörtlich: "betrifft nur die
// Linien").
//
// Punkt 6 (blauer Fokus-Rahmen): neue CSS-Regel in `fuegeStyleEin()` -
// `:focus:not(:focus-visible) { outline: none; }` auf `.leaflet-container`
// (von Leaflet selbst fokussierbar gemacht - Fundstelle des berichteten
// Rahmens: ein Mausklick auf die Kartenfläche fokussiert Leaflets
// Kartencontainer, der Standard-Browser-Fokusring erscheint dafür auch bei
// reinem Mausklick) sowie `.orts-knoten`/`.gruppe-knoten`. `:focus-visible`
// bleibt unangetastet - Tastatur-Fokus (Tab-Navigation) zeigt weiterhin
// einen Rahmen (live bestätigt: `circle.orts-knoten` matcht
// `:focus-visible` nach `.focus()` mit sichtbarem `outline-style:solid`,
// während ein echter Mausklick auf die Karte `outline-style:none` ergibt).
//
// AUFTRAG "Bipartite Flow Map → Mini-Balkendiagramme an den Kartenpunkten":
// grundlegender Wechsel der Darstellungsform, ERSETZT die zweiseitige
// Balken-links/Flussbänder-Struktur der vorigen Aufträge (Punkt 4 der
// "Überarbeitung", Punkt 2 der "Zoom-Regression..."-Auftrag, s.o.) komplett -
// die dortige Historie bleibt oben stehen (Lehren zu z-index/pointer-events/
// Leaflet-Steuerelementen gelten unverändert weiter, s.u.), betrifft aber
// jetzt nicht mehr existierende Elemente (Kategoriespalte, Gruppen-Balken-
// Knoten, Flussbänder, Klick-Fixierung/Escape-Highlight).
//
// Punkt 1 (Mini-Balken-Cluster statt Kreis-Knoten): jeder der 225 Orte aus
// orte.csv (ladeOrtsVerzeichnis(), ALLE Einträge, keine Mindestschwelle -
// Auftrag wörtlich, vorher wurden nur Orte MIT mindestens einem Fluss
// gezeichnet) bekommt an seiner Kartenposition ein Cluster aus vier
// vertikalen Balken (Dynastie/Adel/Klerus/Bürgertum, GRUPPEN' feste
// Reihenfolge, Farben identisch zum Chord-Diagramm, unverändert aus
// chordDiagramm.js importiert). Balkenhöhe = absolute Anzahl der Urkunden,
// die diesen Ort mit einer Person dieser Gruppe verbinden (baueOrtDaten(),
// neu - dieselbe Zählweise wie die entfernte baueFluesse(), nur zusätzlich
// nach Ort UND Gruppe indiziert statt als flache Liste). EINE gemeinsame
// lineare Skala (`skala`, `d3.scaleLinear().domain([0, maxAnzahl])`) über
// ALLE Orte/Gruppen hinweg macht Balkenhöhen zwischen verschiedenen Orten
// vergleichbar - dieselbe Höhe bedeutet überall dieselbe Anzahl. Orte/Gruppen
// ohne jede Verbindung bekommen `anzahl:0` und damit `height:0` (kein
// sichtbarer Balken) - keine Erfindung von Werten, Auftrag wörtlich. Balken
// mit `anzahl>0` bekommen zusätzlich eine MINDEST_SICHTBARE_HOEHE (1,5px,
// dasselbe Prinzip wie die vorige MINDEST_STRICHSTAERKE für Flussbänder),
// damit auch die schwächste echte Verbindung bei sehr großem `maxAnzahl`
// nicht unter der Pixel-Wahrnehmungsschwelle verschwindet - das rundet
// KEINEN Wert auf einen anderen echten Wert, sondern verhindert nur, dass
// "anzahl=1" und "anzahl=0" optisch ununterscheidbar werden.
//
// Überlappungsrisiko (vom Auftrag ausdrücklich zur Rückmeldung angefragt,
// NICHT eigenmächtig durch eine Mindestschwelle gelöst): in dichten Regionen
// (Krems/Stein-Umgebung, Wien) liegen mehrere der 225 Cluster nahe genug
// beieinander, dass sich ihre Balken bei kleiner Kartenzoomstufe sichtbar
// überlappen bzw. ineinander verschachteln - live am Übersichts-Screenshot
// bestätigt (siehe Selbstauskunft im Chat). Zoom/Pan (unverändert
// funktionsfähig, s.o.) schafft für jeden einzelnen Fall Abhilfe, indem sich
// die Cluster beim Hineinzoomen geografisch auseinanderziehen - ein
// bewusster Kompromiss, keine automatische Lösung in diesem Auftrag (wie
// verlangt keine Mindestschwelle eingeführt).
//
// Punkt 2 (Kategoriespalte entfällt): SPALTEN_BREITE, GRUPPEN_BALKEN_*,
// berechneRechteSpalte(), die rechte Gruppen-Knoten/-Label-Spalte sowie die
// dazugehörige Klick-Fixierung/aktualisiereHighlight()/handleEscape() (Punkt
// 2 der "Überarbeitung", s.o.) sind ERSATZLOS entfernt - die Gruppen-
// zugehörigkeit ist jetzt direkt an jedem Ort ablesbar. `mapDiv` beginnt
// jetzt bei `left:0` mit voller `breite` (vorher ab SPALTEN_BREITE versetzt)
// - die Leaflet-Steuerelement-Verlagerung samt `pointer-events:none`-Fix
// (Lehre aus "drei Regressionen nach dem Gruppen-Umbau", s.o.) bleibt
// UNVERÄNDERT bestehen, ihr Root Cause (SVG-Overlay als Geschwister von
// `mapDiv` verdeckt dessen internen `.leaflet-control-container`) hängt
// nicht von SPALTEN_BREITE ab. Die Orts-Knotenfarbe nach dominierender
// THEMATISCHER Kategorie (ermittleDominanteKategorie()/CAT_COLORS, Punkt 1
// der "Überarbeitung") entfällt ebenfalls ersatzlos - mit vier sichtbaren
// Gruppen-Balken pro Ort ist eine zusätzliche, andersartige Einfärbung des
// (jetzt nicht mehr existierenden) einzelnen Knotens nicht mehr sinnvoll
// anwendbar; die Balkenfarben selbst kodieren bereits die soziale Gruppe.
//
// Punkt 3 (Interaktion): Hover über ein Cluster zeigt Ortsname + alle vier
// Gruppen-Zahlen (baueClusterTooltip(), neu, ersetzt das alte
// baueOrtTooltip()). Klick auf die Cluster-Trefferfläche (`.ort-
// trefferflaeche`, unsichtbar, etwas größer als die Balken selbst für eine
// komfortable Trefffläche) öffnet weiterhin die bestehende Urkunden-Sidebar
// mit ALLEN Urkunden dieses Ortes (unverändertes Verhalten/dieselbe
// zeigeUrkundenSidebar()). ZUSÄTZLICH umgesetzt (vom Auftrag als optionale
// Einschätzung angefragt): Klick auf einen EINZELNEN Balken öffnet dieselbe
// Sidebar nur mit den Urkunden DIESER Gruppe an diesem Ort
// (ortGruppeRecords-Map, neu, dieselbe Filterung wie baueOrtDaten() für die
// Balkenhöhen, nur mit den Records statt nur deren Anzahl) -
// `event.stopPropagation()` verhindert das zusätzliche Feuern des Cluster-
// Klicks. Aufwandseinschätzung: gering, da baueOrtDaten() die (Ort,Gruppe)-
// Records ohnehin schon für die Zählung durchläuft und nur zusätzlich statt
// eines Zählers gesammelt werden mussten - deshalb umgesetzt statt nur auf
// den Cluster-Klick beschränkt.
//
// Umbenennungsfrage (vom Auftrag zur Entscheidung freigestellt): NICHT jetzt
// umbenannt. 11 Dateien referenzieren `bipartiteFlowMap` (CHANGELOG.md,
// archivalienRegistry.js, app.js, personenliste.js, chordDiagramm.js,
// statischeKarte.js, vizIcons.js, PROJEKTLOG.md, wortwolke.js,
// urkundenOrte.js) - der Auftrag beschränkt "Betroffene Dateien" ausdrücklich
// auf diese eine Datei, eine Umbenennung würde diesen Rahmen überschreiten.
// Empfehlung: gesammelt mit anderen fälligen Umbenennungen (Auftrag nennt
// bipartiterGraph.js → kategorienOrteSankey.js als Präzedenzfall) in einem
// eigenen, dafür vorgesehenen Auftrag erledigen.
//
// AUFTRAG "Bipartite Flow Map → Tortendiagramm-Knoten mit Klick-
// Vergrößerung und Gruppen-Hervorhebung": ERSETZT die Balken-Cluster-
// Darstellung des vorigen Auftrags (s.o.) komplett - deren Historie (Lehren
// zu Klick-Zuständigkeit Segment/Cluster/Karte, Datenaufbau baueOrtDaten())
// bleibt oben stehen, betrifft aber jetzt nicht mehr existierende Elemente
// (Balken, Balken-Trefferfläche).
//
// Punkt 1 (Tortendiagramm-Knoten mit relativer Größe): jeder Ort wird jetzt
// als Kreisdiagramm mit vier Segmenten (Dynastie/Adel/Klerus/Bürgertum,
// GRUPPEN' feste Reihenfolge über `d3.pie().sort(null)` - KEINE
// wertbasierte Sortierung, damit dieselbe Uhrzeigerposition an JEDEM Ort
// dieselbe Gruppe bedeutet, direkte visuelle Vergleichbarkeit) gezeichnet.
// Radius kommt aus `d3.scaleSqrt().domain([0, maxGesamt]).range([0,
// MAX_RADIUS])` (baueOrtDaten() liefert jetzt zusätzlich `gesamtProOrt`/
// `maxGesamt`, dieselbe Summe wie die vier Tooltip-Werte zusammen) -
// Flächenkodierung statt linearer Radius-Kodierung, damit die WAHRGENOMMENE
// Größe (Fläche) proportional zur Anzahl bleibt, nicht nur der Radius
// (Standard-Empfehlung für größenskalierte Kreise). Radius explizit auf
// MINDEST_RADIUS (5px, Auftrag-Richtwert 4-5px) angehoben
// (`Math.max(skala(...), MINDEST_RADIUS)`) - `scaleSqrt` allein würde einen
// Ort mit `gesamt=0` auf Radius 0 statt auf den Mindestwert abbilden, das
// `Math.max` ist deshalb nötig, nicht nur eine Sicherheitsmarge. Orte mit
// `gesamt===0` (keine Gruppen-Verbindung) bekommen KEIN Kreisdiagramm
// (`d3.pie()` mit vier Werten von 0 würde die Fläche auf 0 statt auf echte
// Segmente aufteilen - kein Fehler, aber irreführend leer/unsichtbar),
// sondern einen neutralen, grauen Vollkreis bei MINDEST_RADIUS - weiterhin
// sichtbar/anklickbar (unverändert seit dem vorigen Auftrag: alle Orte aus
// dem Verzeichnis werden gezeichnet, keine Mindestschwelle), aber ohne
// erfundene Gruppen-Anteile.
//
// Punkt 2 (Klick-Vergrößerung): `instanz.vergroessert` (Ortsname oder null)
// - ein einfacher Auswahl-Zustand, dasselbe Grundprinzip wie die
// `auswahl`-Fixierung eines früheren Vorgängers dieses Moduls (dort für
// Gruppen-Hervorhebung genutzt, hier für Größe). Klick auf ein Segment ODER
// die Trefferfläche/den Rest-Cluster setzt `instanz.vergroessert =
// ort.name` UND öffnet weiterhin die bestehende Sidebar (Segment: gefiltert
// auf diese Gruppe, Trefferfläche/Rest-Cluster: alle Urkunden des Ortes -
// beide Klick-Ebenen aus dem vorigen Auftrag UNVERÄNDERT erhalten,
// `event.stopPropagation()` verhindert weiterhin das doppelte Feuern).
// `aktualisiereRadien()` (neu) berechnet den TATSÄCHLICH gezeigten Radius
// als `radiusBasis(ort) * (vergroessert === ort.name ?
// VERGROESSERUNGS_FAKTOR (1,75, Auftrag-Richtwert 1,5-2) : 1)` und
// schreibt ihn auf alle Segmente/den Neutralkreis/die Trefferfläche JEDES
// Clusters neu (nicht nur des betroffenen - einfacher als gezieltes
// Diffing, bei ~234 Orten unproblematisch performant). "Nur ein Knoten
// gleichzeitig vergrößert" (Auftrag wörtlich) folgt automatisch daraus,
// dass `vergroessert` ein einzelner Wert ist, kein Set. Reset über Klick
// auf freie Kartenfläche: `karte.on('click', ...)` (Leaflets EIGENES
// Klick-Ereignis auf `mapDiv`, NICHT ein SVG-Hintergrund-Rect wie in einem
// früheren Auftrag) - ein Klick auf ein Cluster-Element (SVG-Overlay,
// Geschwister von `mapDiv`) erreicht `mapDiv` aus demselben strukturellen
// Grund NIE (siehe Lehre "Zoom-Regression" oben: Geschwister-Elemente
// liegen in getrennten DOM-Teilbäumen, ein Klick auf das SVG-Overlay
// bubbelt nicht in `mapDiv` hinein) - Leaflets `click`-Ereignis feuert
// deshalb VERLÄSSLICH nur bei Klicks auf die tatsächliche Kartenfläche,
// kein zusätzliches, potenziell wheel-blockierendes Hintergrund-Element
// nötig (dieselbe, bereits mehrfach dokumentierte Lehre aus den
// z-index-Fixes oben). Die Sidebar bleibt von diesem Reset unberührt
// (Auftrag wörtlich) - der Karten-Klick-Handler ändert ausschließlich
// `instanz.vergroessert`.
//
// Punkt 3 (Gruppen-Buttons zur Hervorhebung dominanter Orte): vier Buttons
// in der Werkzeugleiste (Gruppenfarbe als Punkt/linker Akzent, Label wie im
// Chord-Diagramm), Klick setzt `instanz.hervorhebung` (Gruppen-Schlüssel
// oder null, erneuter Klick auf denselben Button schaltet zurück auf null -
// dasselbe Umschalt-Prinzip wie frühere Klick-Fixierungen dieses Moduls).
// "dominant" = Pluralitätsregel (Auftrag wörtlich, kein strenges
// >50%-Erfordernis, im Info-Button-Text so benannt) - eine Gruppe gilt an
// einem Ort als dominant, wenn ihr Wert dem MAXIMUM der vier Gruppenwerte
// an diesem Ort entspricht (`anzahl === Math.max(...)`); bei echtem
// Gleichstand an der Spitze gelten ALLE gleichauf führenden Gruppen als
// dominant (keine künstliche Tie-Break-Alleinentscheidung - der Auftrag
// verlangt nur "kein strenges Mehrheitserfordernis", keine zusätzliche
// Gleichstand-Regel). Orte mit `gesamt===0` gelten für KEINEN Button als
// dominant (kein Wert ist tatsächlich "der häufigste", wenn alle vier
// gleich Null sind). `aktualisiereHervorhebung()` (neu) setzt auf jedem
// Cluster `style('opacity', ...)` - volle Deckkraft (1) für dominante Orte
// der aktiven Gruppe, `KNOTEN_ABGEBLENDETE_OPAZITAET` (0.15, derselbe Wert
// wie im allerersten Balken-Vorgänger-Highlight dieses Moduls, s.o.) für
// alle übrigen - unverändert (Opazität 1 für alle), wenn keine Gruppe aktiv
// ist. Auf einen zusätzlichen Rand ("ggf." laut Auftrag, also optional)
// wurde bewusst verzichtet: die Randfarbe der Segmente ist bereits für die
// Unsicherheiten-Kennzeichnung reserviert (roter Rand bei `orte_unsicher`,
// unverändert seit dem vorigen Auftrag) - eine zweite, kollidierende
// Randfarben-Kodierung hätte beide Bedeutungen verwischt; der
// Opazitätskontrast allein (dasselbe Hervorhebungsprinzip wie in anderen
// Modulen dieses Projekts) ist eindeutig genug. Dominante Cluster werden
// zusätzlich per `.raise()` ans Ende ihres Elternknotens gehoben - dieselbe
// vorbeugende Maßnahme wie in einem früheren Auftrag dieses Moduls gegen
// optische Verdeckung bei pixelgleich benachbarten Orten (s.o., "verwaiste
// hervorgehobene Knoten").

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { ladeOrtsVerzeichnis } from '../utils/urkundenOrte.js';
import { ermittlePersonenDerUrkunde } from '../utils/urkundenPersonen.js';
import { baueStatischeKarte, projiziere, erzeugeUeberlagerungsSvg } from '../utils/statischeKarte.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { baueSidebarGeruest, fuegeSidebarStyleEin, schliesseSidebar, zeigeUrkundenSidebar } from '../utils/sidebar.js';
// Wiederverwendung statt Neuimplementierung (unverändert seit dem
// Gruppen-Umbau, s.o.).
import { GRUPPEN, ermittleGruppe } from './chordDiagramm.js';

// AUFTRAG "Info-Button für die 6 bleibenden Module" - erste Textfassung
// nannte fälschlich Urkunden/Orte als die zwei Knotenseiten statt Orte/
// Kategorien (siehe CHANGELOG/PROJEKTLOG, Eintrag 19) - diese, vom
// Auftraggeber nach Rückmeldung korrigierte Fassung, wörtlich übernommen.
// KORREKTUR (aktueller Auftrag, s.o.): auf die neue Tortendiagramm-
// Darstellung inkl. Klick-Vergrößerung und Pluralitätsregel aktualisiert.
const BIPARTITEFLOWMAP_INFO_TEXT = 'Diese Ansicht zeigt jeden in den Urkunden genannten Ort als Tortendiagramm: vier Segmente für die sozialen Gruppen Dynastie/Habsburger, Adel, Klerus und Bürgertum (dieselbe Heuristik wie im Chord-Diagramm der Personen-Ansicht - keine belegte historische Klassifikation, sondern eine Näherung, siehe dortige Erläuterung für Details). Die Kreisgröße zeigt die Gesamtzahl aller Verbindungen an diesem Ort, die Segmentanteile die Verteilung auf die vier Gruppen. Klick auf einen Knoten vergrößert ihn und öffnet die zugehörigen Urkunden (Klick auf ein Segment: nur die Urkunden dieser Gruppe, Klick auf den restlichen Knoten: alle Urkunden des Ortes), Klick auf freie Kartenfläche setzt die Vergrößerung zurück. Die vier Buttons oben links heben Orte hervor, an denen die jeweilige Gruppe den höchsten Einzelwert der vier hat (Pluralitätsregel - die relativ häufigste Gruppe genügt, eine strenge Mehrheit über 50% ist nicht nötig).';

// Punkt 1 (siehe Dateikopf-Kommentar): Mindestradius (Auftrag-Richtwert
// 4-5px) und Höchstradius der größenskalierten Kreise.
const MINDEST_RADIUS = 5;
const MAX_RADIUS = 26;
// Punkt 2 (siehe Dateikopf-Kommentar): Vergrößerungsfaktor bei Klick
// (Auftrag-Richtwert 1,5-2).
const VERGROESSERUNGS_FAKTOR = 1.75;
// Zusätzlicher, unsichtbarer Rand der Trefferfläche über den sichtbaren
// Radius hinaus - komfortablere Klickfläche gerade bei MINDEST_RADIUS.
const TREFFERFLAECHE_ZUSATZ = 5;
// Punkt 3 (siehe Dateikopf-Kommentar): derselbe Opazitäts-Wert wie im
// allerersten Balken-Vorgänger-Highlight dieses Moduls.
const KNOTEN_ABGEBLENDETE_OPAZITAET = 0.15;
// Punkt 1 (siehe Dateikopf-Kommentar): neutrale Füllfarbe für Orte ohne
// jede Gruppen-Verbindung (kein Kreisdiagramm, keine erfundenen Anteile).
const NEUTRAL_FARBE = '#b7b7b7';

let instanz = null; // { container, urkundenRecords, familienRecords, options, karte, sidebar, infoButton, vergroessert, hervorhebung } - eine aktive Ansicht pro Modul-Ladung

// Farbe je sozialer Gruppe - direkt aus chordDiagramm.js' GRUPPEN, nicht neu
// definiert (Wiedererkennbarkeit).
function farbeFuerGruppe(gruppe) {
  return GRUPPEN.find((g) => g.schluessel === gruppe)?.farbe || '#999999';
}

function labelFuerGruppe(gruppe) {
  return GRUPPEN.find((g) => g.schluessel === gruppe)?.label || gruppe;
}

// Dieselbe "eindeutige Personen pro Urkunde"-Deduplizierung wie
// chordDiagramm.js' ermittleGruppenAnzahlProUrkunde() - hier nur die MENGE
// der beteiligten Gruppen gebraucht, nicht deren Anzahl.
function ermittleGruppenDerUrkunde(record, familienIds) {
  const personen = ermittlePersonenDerUrkunde(record);
  const eindeutig = Array.from(new Map(personen.map((p) => [p.id, p])).values());
  const gruppen = new Set();
  eindeutig.forEach((p) => gruppen.add(ermittleGruppe(p.name, p.id, familienIds)));
  return Array.from(gruppen);
}

// Punkt 1 (siehe Dateikopf-Kommentar): EIN gemeinsamer Durchlauf baut
// - zaehlung: Ort -> Gruppe -> {anzahl, unsicherAnzahl} (für die
//   Segmentanteile UND den Tooltip)
// - ortRecords: Ort -> alle Urkunden mit auflösbarem Ort (für den
//   Cluster-/Trefferflächen-Klick, dieselbe Datenehrlichkeit wie die
//   vorige baueOrtRecordsMap() - unabhängig davon, ob die Urkunde
//   überhaupt eine klassifizierbare Person enthält)
// - ortGruppeRecords: `${ort}|||${gruppe}` -> Urkunden dieser Kombination
//   (für den Einzel-Segment-Klick)
// - gesamtProOrt: Ort -> Summe aller vier Gruppenwerte (Basis der
//   Radius-Skala UND der Pluralitätsregel)
// - maxGesamt: höchste Ortssumme, Basis der gemeinsamen Radius-Skala
function baueOrtDaten(records, ortsVerzeichnis, familienIds) {
  const zaehlung = new Map();
  const ortRecords = new Map();
  const ortGruppeRecords = new Map();

  records.forEach((record) => {
    const orteListe = Array.isArray(record.orte) ? record.orte : (record.orte ? [record.orte] : []);
    const orte = new Set(orteListe.filter((name) => ortsVerzeichnis.has(name)));
    if (orte.size === 0) return;

    orte.forEach((ort) => {
      if (!ortRecords.has(ort)) ortRecords.set(ort, []);
      ortRecords.get(ort).push(record);
    });

    const gruppenListe = ermittleGruppenDerUrkunde(record, familienIds);
    if (gruppenListe.length === 0) return;

    orte.forEach((ort) => {
      if (!zaehlung.has(ort)) zaehlung.set(ort, new Map());
      const proGruppe = zaehlung.get(ort);
      gruppenListe.forEach((gruppe) => {
        if (!proGruppe.has(gruppe)) proGruppe.set(gruppe, { anzahl: 0, unsicherAnzahl: 0 });
        const eintrag = proGruppe.get(gruppe);
        eintrag.anzahl += 1;
        if (record.orte_unsicher) eintrag.unsicherAnzahl += 1;

        const schluessel = `${ort}|||${gruppe}`;
        if (!ortGruppeRecords.has(schluessel)) ortGruppeRecords.set(schluessel, []);
        ortGruppeRecords.get(schluessel).push(record);
      });
    });
  });

  const gesamtProOrt = new Map();
  let maxGesamt = 0;
  zaehlung.forEach((proGruppe, ort) => {
    let summe = 0;
    proGruppe.forEach((eintrag) => { summe += eintrag.anzahl; });
    gesamtProOrt.set(ort, summe);
    maxGesamt = Math.max(maxGesamt, summe);
  });

  return { zaehlung, ortRecords, ortGruppeRecords, gesamtProOrt, maxGesamt };
}

// Ortsname + alle vier Gruppen-Zahlen, auch 0-Werte werden explizit gezeigt
// (Datenehrlichkeit - kein Weglassen).
function baueClusterTooltip(ortName, proGruppe) {
  const zeilen = [ortName];
  GRUPPEN.forEach((g) => {
    const anzahl = proGruppe.get(g.schluessel)?.anzahl || 0;
    zeilen.push(`${g.label}: ${anzahl}`);
  });
  return zeilen.join('\n');
}

// Punkt 3 (siehe Dateikopf-Kommentar): Pluralitätsregel - eine Gruppe ist an
// einem Ort dominant, wenn ihr Wert dem Maximum der vier Gruppenwerte
// entspricht (Gleichstand: alle gleichauf führenden Gruppen gelten als
// dominant, s.o.). Orte ohne jede Verbindung sind für keine Gruppe dominant.
function istGruppeDominant(ortName, gruppe, zaehlung, gesamtProOrt) {
  const gesamt = gesamtProOrt.get(ortName) || 0;
  if (gesamt === 0) return false;
  const proGruppe = zaehlung.get(ortName);
  const maxWert = Math.max(...GRUPPEN.map((g) => proGruppe.get(g.schluessel)?.anzahl || 0));
  return (proGruppe.get(gruppe)?.anzahl || 0) === maxWert;
}

// Dasselbe Leaflet-Pane-Überdeckungsproblem wie karte.js/verbindungskarte.js
// (siehe dortiger Kommentar): position:relative + z-index:900 hebt das
// Popover sicher über Leaflets internen Panes (max. z-index 700) hervor.
function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .bipartiteflowmap-werkzeugleiste { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 6px; position: relative; z-index: 900; }
    .bipartiteflowmap-gruppen-buttons { display: flex; flex-wrap: wrap; gap: 6px; }
    .gruppe-button {
      display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
      border: 1px solid #ccc; border-radius: 4px; background: #fff; cursor: pointer;
      font-size: var(--fs-sm, 13px); line-height: 1.2;
    }
    .gruppe-button:hover { border-color: #888; }
    .gruppe-button[aria-pressed="true"] { background: var(--gruppe-farbe, #eee); border-color: var(--gruppe-farbe, #999); font-weight: 600; }
    .gruppe-button-punkt { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex: none; }
    .ort-cluster { cursor: pointer; }
    .ort-segment, .ort-neutral { cursor: pointer; }
    /* Punkt 2 (siehe Dateikopf-Kommentar): dieselbe :has()-Ausblendung wie
       verbindungskarte.js/karte.js - nötig, seit Leaflets eigene
       Steuerelemente aktiv sind. */
    .bipartiteflowmap-viz-container:has(> .bestand-sidebar.offen) .bipartiteflowmap-werkzeugleiste,
    .bipartiteflowmap-viz-container:has(> .bestand-sidebar.offen) .leaflet-bottom.leaflet-right {
      visibility: hidden;
    }
    /* KORREKTUR (Auftrag "Zoom, Performance, Sichtbarkeit, Fokus-Rahmen",
       Punkt 6, siehe Dateikopf-Kommentar): unterdrückt den blauen
       Standard-Browser-Fokusrahmen NUR bei Maus-Fokus (:focus, aber nicht
       :focus-visible) - Leaflets Kartencontainer (.leaflet-container, von
       Leaflet selbst mit tabindex versehen) sowie die eigenen
       fokussierbaren Orts-Cluster (tabindex="0") behalten den Rahmen bei
       Tastatur-Fokus (Tab-Navigation, :focus-visible) - keine pauschale
       outline:none, um die Tastatur-Zugänglichkeit nicht zu opfern. */
    .bipartiteflowmap-viz-container .leaflet-container:focus:not(:focus-visible),
    .bipartiteflowmap-viz-container .ort-cluster:focus:not(:focus-visible) {
      outline: none;
    }
  `;
  container.appendChild(style);
}

async function zeichneFlowMap() {
  const { container, urkundenRecords, familienRecords, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  // Info-Button wird bei jedem Redraw zerstört/neu erzeugt, siehe karte.js'
  // identisches Muster/identische Begründung.
  if (instanz.infoButton) instanz.infoButton.destroy();
  container.innerHTML = '';
  fuegeStyleEin(container);
  // Punkt 2/3 (siehe Dateikopf-Kommentar): beide Klick-Zustände werden bei
  // jedem Redraw zurückgesetzt - dasselbe Prinzip wie das vorige Modul die
  // `auswahl` bei jedem zeichneFlowMap()-Aufruf zurücksetzte.
  instanz.vergroessert = null;
  instanz.hervorhebung = null;

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'bipartiteflowmap-werkzeugleiste';
  container.appendChild(werkzeugleiste);

  // Punkt 3 (siehe Dateikopf-Kommentar): vier Gruppen-Buttons, DOM-Reihenfolge
  // vor dem Info-Button - `justify-content:space-between` in fuegeStyleEin()
  // schiebt sie dadurch an den linken, den Info-Button an den rechten Rand.
  const gruppenLeiste = document.createElement('div');
  gruppenLeiste.className = 'bipartiteflowmap-gruppen-buttons';
  gruppenLeiste.setAttribute('role', 'group');
  gruppenLeiste.setAttribute('aria-label', 'Gruppe hervorheben');
  werkzeugleiste.appendChild(gruppenLeiste);
  const gruppenButtons = new Map();
  GRUPPEN.forEach((g) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gruppe-button';
    btn.setAttribute('aria-pressed', 'false');
    btn.style.setProperty('--gruppe-farbe', g.farbe);
    const punkt = document.createElement('span');
    punkt.className = 'gruppe-button-punkt';
    punkt.style.background = g.farbe;
    btn.appendChild(punkt);
    btn.appendChild(document.createTextNode(g.label));
    btn.addEventListener('click', () => {
      instanz.hervorhebung = instanz.hervorhebung === g.schluessel ? null : g.schluessel;
      aktualisiereHervorhebung();
    });
    gruppenLeiste.appendChild(btn);
    gruppenButtons.set(g.schluessel, btn);
  });

  instanz.infoButton = erzeugeInfoButton(werkzeugleiste, { text: BIPARTITEFLOWMAP_INFO_TEXT, ariaLabel: 'Erklärung zur Orte-Tortendiagramm-Karte' });

  const breite = options.width || container.clientWidth || 900;
  const hoehe = options.height || 600;

  // Keine Kategoriespalte (seit dem vorigen Auftrag) - `plotWrapper` deckt
  // genau die Kartenbreite ab, `mapDiv` beginnt bei `left:0`.
  const plotWrapper = document.createElement('div');
  plotWrapper.className = 'bipartiteflowmap-plot';
  plotWrapper.style.position = 'relative';
  plotWrapper.style.width = `${breite}px`;
  plotWrapper.style.height = `${hoehe}px`;
  container.appendChild(plotWrapper);

  const mapDiv = document.createElement('div');
  mapDiv.style.position = 'absolute';
  mapDiv.style.left = '0';
  mapDiv.style.top = '0';
  mapDiv.style.width = `${breite}px`;
  mapDiv.style.height = `${hoehe}px`;
  // Erzwingt weiterhin einen eigenen CSS-Stapelkontext (siehe Dateikopf-
  // Kommentar, Punkt 4 der "Überarbeitung") - Leaflets interne Panes bleiben
  // dadurch garantiert unter dem SVG-Overlay (z-index 450, Geschwister von
  // mapDiv).
  mapDiv.style.zIndex = '1';
  plotWrapper.appendChild(mapDiv);

  // Sidebar IMMER aufgebaut, geschlossen bis zum ersten Klick - dasselbe
  // Muster wie verbindungskarte.js.
  fuegeSidebarStyleEin(container);
  instanz.sidebar = baueSidebarGeruest(container);
  instanz.sidebar.schliessenBtn.addEventListener('click', () => schliesseSidebar(instanz.sidebar, mapDiv));

  const ortsVerzeichnis = await ladeOrtsVerzeichnis();
  if (!instanz) return; // destroy() kann während des await aufgerufen worden sein

  const familienIds = new Set(familienRecords.map((r) => r.id));
  // Alle Orte aus dem Verzeichnis, keine Mindestschwelle - unverändert seit
  // dem vorigen Auftrag, unabhängig davon ob dieser Ort überhaupt eine
  // Gruppen-Verbindung hat.
  const alleOrte = Array.from(ortsVerzeichnis, ([name, werte]) => ({ name, ...werte }));
  const { zaehlung, ortRecords, ortGruppeRecords, gesamtProOrt, maxGesamt } = baueOrtDaten(urkundenRecords, ortsVerzeichnis, familienIds);

  // Punkt 1 (siehe Dateikopf-Kommentar): Flächenkodierung (scaleSqrt) statt
  // linearer Radius-Kodierung, explizite Mindestgröße per Math.max().
  const radiusSkala = d3.scaleSqrt().domain([0, maxGesamt || 1]).range([0, MAX_RADIUS]);
  const radiusBasis = (ortName) => Math.max(radiusSkala(gesamtProOrt.get(ortName) || 0), MINDEST_RADIUS);
  // Punkt 2 (siehe Dateikopf-Kommentar): tatsächlich gezeigter Radius -
  // berücksichtigt die Klick-Vergrößerung.
  const radiusAktuell = (ortName) => {
    const basis = radiusBasis(ortName);
    return instanz.vergroessert === ortName ? basis * VERGROESSERUNGS_FAKTOR : basis;
  };

  const pieGen = d3.pie().sort(null).value((d) => d.anzahl);
  const arcGen = d3.arc().innerRadius(0).outerRadius((d) => radiusAktuell(d.data.ort));

  const karte = baueStatischeKarte(mapDiv, alleOrte);
  instanz.karte = karte;

  // Leaflet-Steuerelement-Verlagerung samt eigenem `pointer-events:none`
  // (Root Cause s.o., unverändert seit den vorigen Aufträgen).
  const steuerElemente = mapDiv.querySelector('.leaflet-control-container');
  if (steuerElemente) {
    steuerElemente.style.position = 'absolute';
    steuerElemente.style.left = '0';
    steuerElemente.style.top = '0';
    steuerElemente.style.width = `${breite}px`;
    steuerElemente.style.height = `${hoehe}px`;
    steuerElemente.style.zIndex = '1000';
    steuerElemente.style.pointerEvents = 'none';
    plotWrapper.appendChild(steuerElemente);
  }

  const svgUeberlagerung = erzeugeUeberlagerungsSvg(plotWrapper, breite, hoehe, {
    ariaLabel: 'Karte: Orte als Tortendiagramme der sozialen Gruppen'
  });

  // Ein Cluster (<g>) pro Ort, per `transform: translate(...)` an dessen
  // Kartenposition verankert - alle Kreiselemente sind relativ zum
  // Cluster-Ursprung (0,0 = Ortspunkt).
  const clusterGruppe = svgUeberlagerung.append('g').style('pointer-events', 'auto');
  const cluster = clusterGruppe.selectAll('g.ort-cluster')
    .data(alleOrte)
    .join('g')
    .attr('class', 'ort-cluster')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (o) => `Ort ${o.name}`);

  // Trefferfläche zuerst (unterste Ebene im Cluster) - unsichtbar, etwas
  // größer als der sichtbare Kreis für eine komfortable Klickfläche gerade
  // bei MINDEST_RADIUS. Wird unten von aktualisiereRadien() mitgeführt.
  cluster.append('circle')
    .attr('class', 'ort-trefferflaeche')
    .attr('r', (o) => radiusAktuell(o.name) + TREFFERFLAECHE_ZUSATZ)
    .attr('fill', 'transparent');

  // Punkt 1 (siehe Dateikopf-Kommentar): pro Ort entweder vier Pie-Segmente
  // (gesamt>0) oder ein neutraler Vollkreis (gesamt===0, keine erfundenen
  // Anteile).
  cluster.each(function (ort) {
    const g = d3.select(this);
    const gesamt = gesamtProOrt.get(ort.name) || 0;
    if (gesamt > 0) {
      const daten = GRUPPEN.map((grp) => {
        const eintrag = zaehlung.get(ort.name)?.get(grp.schluessel);
        return {
          ort: ort.name,
          gruppe: grp.schluessel,
          anzahl: eintrag?.anzahl || 0,
          unsicherAnzahl: eintrag?.unsicherAnzahl || 0
        };
      });
      g.selectAll('path.ort-segment')
        .data(pieGen(daten))
        .join('path')
        .attr('class', 'ort-segment')
        .attr('d', arcGen)
        .attr('fill', (d) => farbeFuerGruppe(d.data.gruppe))
        .attr('stroke', (d) => (zeigeUnsicherheit && d.data.unsicherAnzahl > 0 ? '#c0392b' : '#fff'))
        .attr('stroke-width', (d) => (zeigeUnsicherheit && d.data.unsicherAnzahl > 0 ? 1.5 : 0.5));
    } else {
      g.append('circle')
        .attr('class', 'ort-neutral')
        .attr('r', radiusBasis(ort.name))
        .attr('fill', NEUTRAL_FARBE)
        .attr('fill-opacity', 0.7);
    }
  });

  cluster
    .on('mouseenter focus', function (event, o) {
      zeigeTooltip(baueClusterTooltip(o.name, zaehlung.get(o.name) || new Map()), this, mapDiv);
    })
    .on('mouseleave blur', () => versteckeTooltip());

  // Punkt 2 (siehe Dateikopf-Kommentar): Klick auf den Rest-Cluster
  // (Trefferfläche oder Neutralkreis, nicht von einem Segment via
  // stopPropagation abgefangen) vergrößert den Knoten UND öffnet die
  // Sidebar mit ALLEN Urkunden dieses Ortes - unverändertes Sidebar-
  // Verhalten aus dem vorigen Auftrag, nur um die Vergrößerung ergänzt.
  cluster.each(function (ort) {
    const element = this;
    const aktiviere = () => {
      instanz.vergroessert = ort.name;
      aktualisiereRadien();
      zeigeUrkundenSidebar(instanz.sidebar, ort.name, ortRecords.get(ort.name) || []);
    };
    element.addEventListener('click', aktiviere);
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        aktiviere();
      }
    });
  });

  // Punkt 2 (siehe Dateikopf-Kommentar): Klick auf ein einzelnes Segment
  // vergrößert denselben Knoten UND zeigt nur die Urkunden DIESER Gruppe an
  // diesem Ort - event.stopPropagation() verhindert, dass zusätzlich der
  // Rest-Cluster-Klick (oben, mit ALLEN Urkunden des Ortes) mitfeuert.
  cluster.selectAll('path.ort-segment').on('click', (event, d) => {
    event.stopPropagation();
    instanz.vergroessert = d.data.ort;
    aktualisiereRadien();
    const schluessel = `${d.data.ort}|||${d.data.gruppe}`;
    zeigeUrkundenSidebar(instanz.sidebar, `${d.data.ort} – ${labelFuerGruppe(d.data.gruppe)}`, ortGruppeRecords.get(schluessel) || []);
  });

  instanz.cluster = cluster;

  // Punkt 2 (siehe Dateikopf-Kommentar): schreibt den aktuellen Radius
  // (Basis oder vergrößert) auf Trefferfläche, Segmente und Neutralkreise
  // jedes Clusters neu.
  function aktualisiereRadien() {
    cluster.select('circle.ort-trefferflaeche').attr('r', (o) => radiusAktuell(o.name) + TREFFERFLAECHE_ZUSATZ);
    cluster.selectAll('path.ort-segment').attr('d', arcGen);
    cluster.selectAll('circle.ort-neutral').attr('r', (o) => radiusAktuell(o.name));
  }

  // Punkt 2 (siehe Dateikopf-Kommentar): Klick auf freie Kartenfläche setzt
  // die Vergrößerung zurück, ohne die Sidebar zu beeinflussen - Leaflets
  // eigenes `click`-Ereignis auf `mapDiv`, das ein Klick auf ein
  // Cluster-Element (Geschwister-Teilbaum) strukturell nie erreicht (s.o.).
  karte.on('click', () => {
    if (instanz.vergroessert) {
      instanz.vergroessert = null;
      aktualisiereRadien();
    }
  });

  // Punkt 3 (siehe Dateikopf-Kommentar): volle Deckkraft + `.raise()` für
  // Orte, an denen die aktive Gruppe dominant ist, gedämpfte Opazität für
  // alle übrigen - unverändert (Opazität 1) ohne aktive Gruppe.
  function aktualisiereHervorhebung() {
    gruppenButtons.forEach((btn, schluessel) => {
      btn.setAttribute('aria-pressed', String(instanz.hervorhebung === schluessel));
    });
    if (!instanz.hervorhebung) {
      cluster.style('opacity', 1);
      return;
    }
    const gruppe = instanz.hervorhebung;
    cluster.style('opacity', (o) => (istGruppeDominant(o.name, gruppe, zaehlung, gesamtProOrt) ? 1 : KNOTEN_ABGEBLENDETE_OPAZITAET));
    cluster.filter((o) => istGruppeDominant(o.name, gruppe, zaehlung, gesamtProOrt)).raise();
  }

  // Zoom/Pan (Nicht-Ziel, unverändert): jedes Cluster hängt von der
  // Kartenposition seines Ortes ab - bei jeder Kartenbewegung neu
  // projiziert.
  function aktualisierePositionen() {
    cluster.attr('transform', (o) => {
      const p = projiziere(karte, o.lat, o.lon);
      return `translate(${p.x},${p.y})`;
    });
  }
  aktualisierePositionen();
  karte.on('zoom move', aktualisierePositionen);
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  // Stabile Klasse auf `container` selbst, Anker für die
  // `:has()`-Sichtbarkeitsregel in fuegeStyleEin() - dasselbe Muster wie
  // karte.js/verbindungskarte.js.
  container.classList.add('bipartiteflowmap-viz-container');
  // `data` ist das kombinierte `{urkunden, familien}`-Objekt
  // (archivalienRegistry.js' `orte.datenDatei`, s.o.) - dasselbe Muster wie
  // chordDiagramm.js' `data.familien || []`.
  instanz = {
    container,
    urkundenRecords: data.urkunden || [],
    familienRecords: data.familien || [],
    options: { showUncertainty: true, width: null, height: null, ...options },
    karte: null, infoButton: null, sidebar: null, cluster: null,
    vergroessert: null, hervorhebung: null
  };
  zeichneFlowMap();
}

// resize() zeichnet weiterhin komplett neu statt nur die Kartengröße zu
// invalidieren - dieselbe Begründung wie verbindungskarte.js' resize()
// (siehe dortiger Kommentar): geänderte Maße/showUncertainty müssen
// nachgezogen werden, Zoom-/Pan-Stand wird dabei bewusst zurückgesetzt.
export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneFlowMap();
}

export function destroy() {
  if (!instanz) return;
  if (instanz.infoButton) instanz.infoButton.destroy();
  if (instanz.karte) {
    instanz.karte.remove();
  }
  instanz.container.innerHTML = '';
  instanz.container.classList.remove('bipartiteflowmap-viz-container');
  instanz = null;
}
