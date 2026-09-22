# CHANGELOG.md

Änderungsprotokoll für die Interface-Codebasis (analog zum Änderungsprotokoll-
Tabellenblatt der Datenfiles, siehe `docs/SCHEMA.md`). Neueste Einträge oben.
Ausführlichere Begründungen/Testprotokolle stehen in `docs/PROJEKTLOG.md` -
dieser Eintrag ist die Kurzfassung "was, wann, wo".

---

## 2026-09-21 (78) – Chord-Diagramm: Fokus-Rahmen entfernen, horizontale Beschriftung; SCHEMA.md aktualisiert

Datei: `js/viz/chordDiagramm.js`; zusätzlich `docs/SCHEMA.md` (Auftrag
"schema.md aktualisieren").

**SCHEMA.md:** auf den tatsächlichen aktuellen Stand der Datendateien
gebracht - `familien.csv` (Abschnitt 6) um `herrschaft_von`/
`herrschaft_bis` ergänzt, `personenliste.csv` (Abschnitt 8) komplett
überarbeitet (4179 statt 4116 Einträge, drei neue Spalten
`nennung_in_verlassenschaften`/`soziale_gruppe`/`beruf` dokumentiert,
Format von `nennung_in_urkunden`/`nennung_in_buergerbuch` als geklärt
markiert), neuer Punkt 13 in der Zusammenfassung offener Punkte zur
Datenintegritäts-Historie (externe Datei-Operationen, siehe CHANGELOG
Eintrag 77).

**Punkt 1 (Fokus-Rahmen bei Klick entfernen):** dieselbe Lösung wie bereits
in `bipartiteFlowMap.js` - `.chord-gruppe:focus:not(:focus-visible),
.chord-sehne:focus:not(:focus-visible) { outline: none; }` ergänzt. Die
bestehende `:focus-visible`-Regel (eigener 3px-Rahmen) bleibt für
Tastatur-Fokus unverändert.

**Punkt 2 (horizontale Beschriftung):** die radiale
`rotate(...) translate(...) rotate(180)`-Transformation der vier
Gruppen-Labels entfällt ersatzlos - Labels stehen jetzt rein horizontal
(keine Rotation) an einem Punkt bei `radiusAussen + 26px` entlang
desselben Mittelwinkels, `text-anchor` weiterhin nach Kreishälfte
(links/rechts) gewählt. Zusätzlich eine kurze, segmentfarbene
Verbindungslinie vom äußeren Bogenrand zum Label ("mit kurzer
Verbindungslinie falls nötig", Auftrag wörtlich) für eindeutige
Zuordnung. Die bisherige Ergänzung "(X Urkunden-Verbindungen)" im
On-Chart-Label entfällt aus Platzgründen (bleibt vollständig über den
bestehenden Hover-Tooltip verfügbar, der ohnehin mehr Detail zeigt) -
`radiusAussen`-Randmarge von 90 auf 170px erhöht, damit auch das längste
Label ("Dynastie (Habsburger)") vollständig im SVG-Viewport Platz findet.

**Verifikation:** `node --check` fehlerfrei, grep bestätigt keine
Code-Reste der alten Rotations-Logik (nur noch im historischen
Dateikopf-Kommentar). Live getestet (frisch importierte Modulinstanz,
Standard-HTTP-Cache des Testservers hätte sonst eine veraltete Version
weiter angezeigt): alle vier Labels stehen horizontal mit kurzer
Verbindungslinie zum jeweiligen Segment, klar zuordenbar. Echter
Mausklick auf das Adel-Segment fokussiert das `<g>` ohne
`:focus-visible`/Rahmen (`outlineStyle: none`); echte Tab-Navigation
erreicht sowohl eine `chord-sehne` als auch ein `chord-gruppe`-Element
jeweils mit `:focus-visible: true` und sichtbarem 3px-Rahmen. Keine
Konsolenfehler.

---

## 2026-09-21 (77) – Familienbaum-Regression behoben + Personenliste umfassend erweitert (soziale_gruppe, Verlassenschaftsinventar-Integration, beruf)

Dateien: `data/familien.csv`, `data/personenliste.csv`; zusätzlich inzident
gefunden und mitkorrigiert: `data/buergerbuch.csv` (siehe Fund unten).

**Teil A (Regression `familien.csv`):** Ursache konkret diagnostiziert statt
nur "wiederhergestellt" - die Datei auf der Festplatte trug einen
Änderungszeitstempel vom **2026-08-09, 20:36:40**, mehr als einen Monat
VOR den beiden CHANGELOG-Einträgen, die `hrr_status` (Eintrag 21,
2026-09-09) bzw. `herrschaft_von`/`herrschaft_bis` (Eintrag 26,
2026-09-11) laut Protokoll hinzugefügt hatten. Ein späterer,
inhaltsverändernder Edit KANN diesen Zeitstempel nicht erzeugt haben (der
läge zwangsläufig nach dem 11.09.). `orte.csv` und
`verlassenschaftsinventare.csv` tragen exakt denselben verdächtigen
Zeitstempel-Cluster (20:33–20:37 Uhr, 09.08.) - beide Dateien wurden aber
selbst NIE von einem CLI-Auftrag beschrieben (nur gelesen), ihr altes Datum
ist für sich genommen also kein Beweis. Für `familien.csv` dagegen ist es
eindeutig: die Datei MUSS zwischen dem 11.09. und heute durch eine externe
Operation (Sync/Wiederherstellung/Re-Upload eines alten Datei-Snapshots -
kein CLI-Edit, dafür gäbe es einen CHANGELOG-Eintrag) auf den Stand vom
09.08. zurückgesetzt worden sein. Wiederhergestellt: alle drei Spalten mit
den vom Auftrag vorgegebenen Referenzwerten - `hrr_status` wurde dabei
NICHT einfach übernommen (nur die Verteilung 16/3/19/5 war vorgegeben,
keine Zuordnung pro ID), sondern aus dem bestehenden `titel`-Feld
neu abgeleitet (`kaiser`="Kaiser des Hl. Römischen Reichs" in eigenem
Recht, `koenig`="römisch-deutscher König" ohne späteren Kaisertitel,
`_heirat`-Varianten analog nur "durch Heirat") und die resultierende
Verteilung gegen alle vier vorgegebenen Zahlen exakt gegengeprüft (16
kaiser, 3 koenig, 19 kaiserin_heirat, 5 koenigin_heirat, 37 keiner -
Summe 80, alle vier Werte treffen exakt). `herrschaft_von`/`herrschaft_bis`
direkt aus der vorgegebenen 17-Zeilen-Tabelle übernommen. Byte-Prüfung:
BOM/CRLF erhalten, alle 80 Datenzeilen inhaltlich unverändert bis auf die
drei neu angehängten Felder.

**Inzidenter Fund (nicht Teil der Auftrags-"Betroffene Dateien", aber
Teil-D-blockierend):** `data/buergerbuch.csv` enthielt eine zusätzliche,
FALSCHE erste Zeile (`Column1;Column2;...;Column17`) VOR dem echten Header -
verschob den echten Header (`id;Datum;...`) faktisch zu einer Datenzeile
und hätte `record.Beruf`/`record.Datum`/etc. für die gesamte App auf
`undefined` gesetzt (Spaltennamen wären `Column1`...`Column17` gewesen).
Zeitstempel (21.09., 11:14, eine Minute nach dem letzten
`personenliste.csv`-Edit) und Symptom (eine generische Platzhalter-
Kopfzeile, wie sie Tabellenkalkulationsprogramme beim Import ohne erkannten
Header einfügen) passen zum selben "Sync-/Upload-Vorgang"-Verdacht wie bei
Teil A, hier aber als Präfix-Zeile statt vollständigem Revert. Fix: die
eine Zeile entfernt, die übrigen 2791 Datenzeilen unverändert (Byte-Diff
gegen die zuvor in dieser Session verifizierte 2792-Zeilen-Fassung: exakt
1 Zeile entfernt, sonst identisch). Nach dem Fix: 1541 von 2791 Zeilen mit
befülltem `Beruf` - **exakt der vom Auftrag erwarteten Referenzzahl**.

**Teil B (`soziale_gruppe`):** EIN gemeinsamer Klassifikator für alle drei
Quellen - dieselbe `ermittleGruppe()`-Logik aus `chordDiagramm.js` (Priorität
Dynastie→Klerus→Adel→Bürgertum, Wortlisten/Familiennamen 1:1 nach
JavaScript portiert) direkt auf `personen_id`+`schreibweisen` jeder
`personenliste.csv`-Zeile angewandt - erfüllt beide Auftragshälften
gleichzeitig, ohne Sonderfall-Code: Urkunden-Personen nutzen dieselbe
Funktion wie gefordert, Bürgerbuch/Verlassenschaftsinventar-Personen fallen
automatisch auf "Bürgertum" zurück, AUSSER die Funktion erkennt selbst ein
Titelwort oder eine Adelsfamilie im Namen - live bestätigt: 5 Bürgerbuch-
Personen als "adel" (Nachnamen wie "Ritter"/"Herzog"/"Graf"/"Fürst"/
"Hardegger" - dieselbe bekannte Heuristik-Grenze wie im Chord-Diagramm
selbst, dort bereits dokumentiert), 1 als "klerus" ("Bischof" als Nachname).
Verteilung gesamt: 4024 Bürgertum, 67 Adel, 57 Klerus, 31 Dynastie (0
leere Werte). Als Klartext-Spalte in der CSV geschrieben (nicht nur zur
Laufzeit berechnet), Auftrag wörtlich erfüllt.

**Teil C (Verlassenschaftsinventar-Integration):** genau 68 neue Zeilen
(alle Personen aus `verlassenschaftsinventare.csv`, inkl. Nicolaus
Grollickh - hat trotz fehlender Vermögenswerte Jahr UND Beruf befüllt,
daher regulär integrierbar). `personen_id` neu vergeben (Slug aus `Name`:
Kleinschreibung, Umlaute→ae/oe/ue/ss, Sonderzeichen/Sternchen entfernt),
1 Kollision mit einer bestehenden Urkunden-/Bürgerbuch-Person (`Matthias
Schmidt` → `matthias_schmidt_2`) automatisch aufgelöst - keine
Zusammenführung mit der gleichnamigen Bestandsperson (Auftrag wörtlich:
unabhängige Quellen ohne geprüfte Identität). `schreibweisen` = `Name`-Feld
UNVERÄNDERT übernommen, inkl. der 9 Namen mit einem `*`-Suffix im
Quellfeld (Bedeutung nicht dokumentiert, siehe `docs/SCHEMA.md` - bewusst
nicht stillschweigend entfernt). Neue Spalte `nennung_in_verlassenschaften`
bei allen 68 neuen Zeilen befüllt (z. B. `VI-0004`), `nennung_in_urkunden`/
`nennung_in_buergerbuch` bei diesen Zeilen leer. Keine Dopplung: alle 4111
bestehenden Zeilen inhaltlich unverändert (per Diff verifiziert), Gesamtzahl
danach 4179 (4111+68), alle `personen_id` weiterhin eindeutig.

**Teil D (`beruf`):** Bürgerbuch-Personen: `Beruf`-Feld aus (dem jetzt
korrigierten) `buergerbuch.csv` über `nennung_in_buergerbuch` aufgelöst -
bei den 514 Personen mit mehreren verknüpften Bürgerbuch-Einträgen wird der
erste Eintrag mit befülltem `Beruf` genommen (72 Fälle mit widersprüchlichen
Berufsangaben zwischen mehreren Einträgen derselben Person identifiziert und
transparent gezählt, nicht stillschweigend aufgelöst). Ergebnis: 1548 von
2654 Bürgerbuch-Personen mit befülltem `beruf` (weicht von der rohen
Zeilen-Zahl 1541/2791 in `buergerbuch.csv` selbst ab - erwartungsgemäß, da
mehrere Bürgerbuch-Zeilen auf dieselbe Person verweisen können).
Verlassenschaftsinventar-Personen: direkter 1:1-Pull aus `Beruf` (bereinigtes
Feld, NICHT `Beruf/Funktion/Stand`) - 56 von 68 befüllt (tatsächliche Zahl
wie vom Auftrag angefordert). Urkunden-Personen: `beruf` durchgehend leer
(0 von 1457) - unverändert die frühere Einschätzung, keine systematisch
extrahierbaren Berufsangaben im Personenfeld.

**Verifikation:** `familien.csv`/`personenliste.csv`/`buergerbuch.csv` alle
mit erhaltenem BOM, durchgehend CRLF, 0 verirrten LF. `personenliste.csv`:
4179 Datenzeilen, alle mit exakt 13 Feldern, 0 leere `soziale_gruppe`,
4111 eindeutig identifizierte Alt-Zeilen byte-für-Feld unverändert (Python-
Diff gegen Sicherungskopie). `familien.csv`: 80 Datenzeilen à 19 Spalten,
`hrr_status`-Verteilung/`herrschaft_von`-Belegung exakt gegen alle
Vorgabewerte geprüft. Live im Browser: Habsburg-Zeitleistenbaum zeigt die
Teil-Einfärbung wieder (Rudolf I. Popover: "Politische Stellung: König",
"Herrschaftszeitraum: 1273–1291"), Personenliste lädt weiterhin fehlerfrei
mit "4179 von 4179 Personen", Suche nach "Grollickh" findet die neue Zeile
("Nicolaus Grollickh\*", Quelle Verlassenschaftsinventare, 1672). Keine
Konsolenfehler.

---

## 2026-09-21 (76) – Bipartite Flow Map: Tortendiagramm-Knoten mit Klick-Vergrößerung und Gruppen-Hervorhebung

Datei: `js/viz/bipartiteFlowMap.js`.

Erneuter Wechsel der Darstellungsform: die Balken-Cluster des vorigen
Auftrags (Eintrag 75) werden durch größenskalierte Tortendiagramm-Knoten
ersetzt.

**Punkt 1 (Größe/Segmente):** jeder Ort ist jetzt ein Kreisdiagramm mit vier
Segmenten (Dynastie/Adel/Klerus/Bürgertum, feste Reihenfolge über
`d3.pie().sort(null)`, dieselbe Uhrzeigerposition an jedem Ort). Radius über
`d3.scaleSqrt().domain([0, maxGesamt]).range([0, 26])` (Flächenkodierung,
`maxGesamt` = höchste Ortssumme aller vier Gruppen), explizit auf
Mindestradius **5px** angehoben (`Math.max(...)` - `scaleSqrt` bildet 0
sonst auf 0 statt auf den Mindestwert ab). Orte ohne jede Gruppen-Verbindung
zeigen einen neutralen grauen Vollkreis bei Mindestradius statt eines
Kreisdiagramms (keine erfundenen Anteile bei Summe 0).

**Punkt 2 (Klick-Vergrößerung):** Klick auf ein Segment oder den restlichen
Knoten vergrößert dessen Radius um Faktor **1,75** und öffnet weiterhin die
Sidebar (Segment: gefiltert auf diese Gruppe, Rest: alle Urkunden des
Ortes - unverändertes Sidebar-Verhalten aus Eintrag 75). Nur ein Knoten kann
gleichzeitig vergrößert sein (`instanz.vergroessert`, ein einzelner Wert).
Klick auf freie Kartenfläche setzt zurück, ohne die Sidebar zu beeinflussen -
über Leaflets eigenes `karte.on('click', ...)`-Ereignis auf `mapDiv`, das ein
Klick auf ein Cluster-Element (SVG-Overlay, strukturell ein Geschwister-
statt Nachkommen-Teilbaum von `mapDiv`) nie erreicht - kein zusätzliches,
potenziell wheel-blockierendes Hintergrund-Element nötig (dieselbe Lehre aus
den früheren z-index/pointer-events-Fixes dieses Moduls).

**Punkt 3 (Gruppen-Hervorhebung):** vier Buttons in der Werkzeugleiste
(Gruppenfarbe, Klick schaltet um/zurück). Pluralitätsregel wie gefordert
(kein strenges >50%-Erfordernis, im Info-Button-Text benannt): eine Gruppe
gilt an einem Ort als dominant, wenn ihr Wert dem Maximum der vier
Gruppenwerte entspricht; echter Gleichstand an der Spitze zählt für alle
gleichauf führenden Gruppen als dominant. Orte mit Summe 0 sind für keine
Gruppe dominant. Dominante Orte: volle Deckkraft + `.raise()` (Lehre aus
einem früheren Auftrag gegen optische Verdeckung bei pixelgleichen Orten);
alle übrigen: Opazität 0.15. Auf einen zusätzlichen Rand wurde bewusst
verzichtet - die Randfarbe ist bereits für die Unsicherheiten-Kennzeichnung
reserviert, eine zweite Randfarben-Kodierung hätte beide Bedeutungen
verwischt; der Opazitätskontrast allein genügt.

Live regressionsgeprüft, keine Konsolenfehler: Segmentanteile/Tooltip-Werte
(Krems 65/11/4/186, Wien 192/31/4/101) stimmen weiterhin; Klick auf Krems
vergrößert dessen Trefferfläche exakt gemäß `basis*1,75+Zuschlag`
(28,41→45,97); Klick auf Wien vergrößert Wien und setzt Krems zurück,
Sidebar wechselt auf Wien; Klick auf freie Kartenfläche setzt Wien zurück
(50,5→31), Sidebar bleibt auf "Wien" offen; Aktivierung des
Dynastie-Buttons dimmt Krems (Opazität 0.15, da dort Bürgertum mit 186 die
höchste Einzelzahl ist) und lässt Wien voll sichtbar (Opazität 1, da dort
Dynastie mit 192 die höchste Einzelzahl ist) - exakt nach Pluralitätsregel.
Zoom/Pan und Unsicherheiten-Toggle (voller Redraw) unverändert
funktionsfähig.

## 2026-09-21 (75) – Bipartite Flow Map: Mini-Balkendiagramme an den Kartenpunkten

Datei: `js/viz/bipartiteFlowMap.js`.

Grundlegender Wechsel der Darstellungsform: statt der zweiseitigen
Balken-links/Flussbänder-Struktur bekommt jeder Ort direkt auf der Karte ein
kleines Balken-Cluster mit vier Balken (Dynastie/Adel/Klerus/Bürgertum,
Farben identisch zum Chord-Diagramm). Balkenhöhe = absolute Anzahl der
Urkunden, die diesen Ort mit einer Person dieser Gruppe verbinden, über eine
gemeinsame lineare Skala vergleichbar gemacht (Orte/Gruppen ohne Verbindung
zeigen keinen Balken - keine Wert-Erfindung). Alle Orte aus `orte.csv` mit
gültigen Koordinaten werden angezeigt (tatsächlich 233-234, nicht die vom
Auftrag angenommenen 225 - siehe Korrektur unten), keine Mindestschwelle.

Die bisherige linke Kategoriespalte (Gruppen-Balken/-Label, Flussbänder,
Klick-Fixierung/Escape-Highlight) entfällt ersatzlos; die Karte nutzt jetzt
die volle Breite. Die vorige Einfärbung der Orts-Knoten nach dominierender
THEMATISCHER Kategorie (separat von der Gruppen-Klassifikation) entfällt
ebenfalls - mit vier sichtbaren Gruppen-Balken pro Ort nicht mehr sinnvoll
anwendbar.

Interaktion: Hover über ein Cluster zeigt Ortsname + alle vier Gruppen-Zahlen
(auch 0-Werte, keine Auslassung). Klick auf das Cluster öffnet weiterhin die
bestehende Urkunden-Sidebar mit allen Urkunden dieses Ortes (unverändertes
Verhalten). Zusätzlich umgesetzt (vom Auftrag als optionale Einschätzung
angefragt, Aufwand als gering eingeschätzt und deshalb realisiert): Klick auf
einen einzelnen Balken öffnet dieselbe Sidebar nur mit den Urkunden dieser
Gruppe an diesem Ort.

**Korrektur zur Auftragsannahme:** der Auftrag ging von 225 Orten aus -
tatsächlich hat `data/orte.csv` 256 Zeilen, davon 233 mit auswertbaren
Koordinaten (Browser-Live-Zählung der gezeichneten Cluster: 234, minimale
Abweichung durch Namens-Deduplizierung im Verzeichnis-Aufbau). Transparent
im Dateikopf-Kommentar sowie im Chat dokumentiert statt stillschweigend
"225" beizubehalten.

**Überlappungsrisiko** (vom Auftrag zur Rückmeldung angefragt, bewusst NICHT
durch eine Mindestschwelle gelöst): in dichten Regionen (Krems/Stein-Umgebung,
Wien) überlappen sich Cluster bei kleiner Kartenzoomstufe sichtbar - live am
Übersichts-Screenshot bestätigt. Zoom/Pan (unverändert funktionsfähig) schafft
im Einzelfall Abhilfe.

**Umbenennungsfrage** (vom Auftrag zur Entscheidung freigestellt): nicht
umgesetzt - 11 Dateien referenzieren `bipartiteFlowMap`, der Auftrag
beschränkt "Betroffene Dateien" ausdrücklich auf `bipartiteFlowMap.js` selbst.
Empfehlung: gesammelt mit anderen fälligen Umbenennungen in einem eigenen
Auftrag erledigen.

Live regressionsgeprüft: Zoom/Pan, Unsicherheiten-Toggle, Cluster-Klick
(Sidebar mit allen Urkunden des Ortes, z.B. Krems: 4 Klerus-Urkunden per
Tooltip vs. per gefilterter Sidebar übereinstimmend geprüft), Einzel-Balken-
Klick (gefilterte Sidebar-Titel "Krems – Klerus"), Balkenfarben/-reihenfolge
und -skala (Krems: Dynastie 65/Adel 11/Klerus 4/Bürgertum 186; Wien: Dynastie
192/Adel 31/Klerus 4/Bürgertum 101, jeweils per Tooltip abgelesen). Keine
Konsolenfehler.

## 2026-09-20 (74) – Bürgerbuch: positionsgetreue Zuordnung der Bürgen-Berufe

Datei: `data/buergerbuch.csv`.

37 Zeilen mit mehreren Bürgen (`buergen_id`, pipe-getrennt) hatten in
`Buergen_Berufe` nur einen einzelnen, nicht positionierten Beruf, obwohl der
Klartext in `Buergen` die Zuordnung (Beruf in Klammern direkt hinter dem
jeweiligen Namen) bereits eindeutig enthielt. `Buergen_Berufe` zeigt jetzt
für jede der 37 Zeilen genau so viele Pipe-Segmente wie `buergen_id`
Positionen hat, leer an den Positionen ohne erkannten Beruf.

**Bestandsaufnahme (Punkt 0, vor der Korrektur zurückgemeldet und
bestätigt):** über die 37 hinaus keine weiteren Zeilen betroffen. Im
Einzelnen geprüft und bestätigt unverändert lassen:
- 57 Zeilen mit bereits pipe-getrenntem `Buergen_Berufe` - Stichprobe gegen
  den Klartext bestätigt korrekte Positionierung, 0 Zeilen mit Pipe-Anzahl-
  Mismatch.
- 7 Zeilen mit einem `(Name?)`-Klammermuster (z.B. `Carl (Steubnnwegg?)`) -
  Abgleich mit `buergen_id` zeigt, dass die Klammer eine unsichere
  Nachnamen-Lesung ist, kein Beruf (dieselbe Musterlogik wie das bereits
  vorhandene, korrekt undefinierte `(Thüll?)` in BB-2136, dort neben dem
  echten Beruf `(Wagner)`).
- 2 Zeilen mit ausschließlich dem Wohnort-Vermerk "(Bürger zu Krems und
  Stein)" bei beiden Bürgen - korrekt bereits leer.
- 2 Zeilen mit drei Bürgen (BB-0157, BB-1910) - kein Beruf im Klartext,
  korrekt bereits leer.
- Wohnort-Vokabular vollständig erfasst: "Bürger zu Krems"/"Bürger zu
  Stein"/"Bürger zu Krems und Stein" (plus eine Doppelleerzeichen-Variante)
  - alle als Nicht-Beruf ausgeschlossen.

**Sonderfall BB-1584:** einzige der 37 Zeilen mit tatsächlich ZWEI Berufen
im Klartext (`Jacoben Bittelschirs (Sattler), Joseffen Raab (pforer?).`) -
vorher ging der zweite Beruf komplett verloren (`Buergen_Berufe` zeigte nur
`Sattler`). Neu: `Sattler|pforer?` - die unsichere Lesung "pforer?" wörtlich
mit Fragezeichen übernommen, nicht aufgelöst oder geglättet (Auftrag,
wörtlich).

**Vorgehen:** `Buergen` anhand der Kommata in Bürgen-Segmente zerlegt
(dieselbe Reihenfolge wie `buergen_id`, bei allen 37 Zeilen Segmentanzahl
== `buergen_id`-Anzahl, keine Kommas innerhalb von Klammern), pro Segment
die erste nicht-Wohnort-Klammer als Beruf übernommen - ein einzelner
Vorname ohne Nachname vor der ersten Klammer wird dabei als
Namensvervollständigung (nicht Beruf) behandelt, s. Sonderfall-Liste oben.

**Verifikation:** genau 37 geänderte Zeilen (`diff` gegen Sicherungskopie
vor der Änderung), jeweils NUR das Feld `Buergen_Berufe` verändert, alle
anderen 16 Spalten byte-identisch; Zeilenanzahl (2792), BOM und
CRLF-Zeilenenden unverändert (0 einzelne LF gefunden); alle 208
Mehrfach-Bürgen-Zeilen datei­weit erneut auf Pipe-Anzahl-Konsistenz
geprüft (0 verbleibende Abweichungen); alle Zeilen weiterhin exakt 17
Spalten.



Dateien: `js/viz/personenliste.js`, `js/config/archivalienRegistry.js`.

Klick auf eine Personen-Zeile (vorher ohne jede Interaktion) öffnet jetzt
die etablierte Sidebar mit den tatsächlich verzeichneten Quelleneinträgen:
`nennung_in_urkunden` (Signatur(en), pipe-getrennt) wird gegen
`urkunden.csv`s `signatur` aufgelöst, `nennung_in_buergerbuch` (ID(s) wie
"BB-2454") gegen `buergerbuch.csv`s `id` - `buergerbuch.csv` ist dafür eine
NEUE, vierte Quelle in `personen.datenDatei` (vorher familien/personenliste/
urkunden); die `personenliste`-Ansicht bekommt dafür keinen `datenSchluessel`
mehr und erhält wie `chordDiagramm` das gesamte kombinierte Datenobjekt.

**Interaktion:** genau 1 Treffer insgesamt (Urkunden + Bürgerbuch
zusammengezählt) öffnet direkt die volle Detailansicht, mehrere eine
kompakte Liste mit Klick-durch - dieselbe "1 -> Detail, mehrere -> Liste"-
Konvention wie sidebar.js' `zeigeUrkundenSidebar()`, hier aber LOKAL in
personenliste.js nachgebaut (sidebar.js bleibt unverändert, wie im Auftrag
auf diese Datei beschränkt), weil die geforderte Zwei-Abschnitte-Liste
("In Urkunden:"/"Im Bürgerbuch:") bei gleichzeitigen Treffern in beiden
Quellen nicht in `zeigeUrkundenSidebar()` passt. Die Urkunden-Detail-/
Listendarstellung selbst wird unverändert aus sidebar.js wiederverwendet
(`baueUrkundenDetailInhalt()`/`baueUrkundenListeInhalt()`); für Bürgerbuch-
Einträge sind `baueBuergerbuchDetailInhalt()` (Datum/Beruf/Wirtschaftssektor/
Ort/Bürgen/Anmerkungen + Unsicher-Hinweis) und `baueBuergerbuchListeInhalt()`
neu, orientiert an Form und CSS-Klassen der Urkunden-Äquivalente.

**Prämissen-Prüfung (Auftrag erwähnte "bereits bestehende Bürgerbuch-
Sidebar-Nutzung in personennetzwerk.js"):** grep-bestätigt trifft das nicht
zu - personennetzwerk.js zeigt ein reines Kraft-Netzwerk mit Tooltips, keine
Sidebar, keine Bürgerbuch-Detaildarstellung. Es gab also keine bestehende
Vorlage, "analog" zu der die neuen Bürgerbuch-Bausteine entworfen werden
konnten - sie sind eigenständig neu, folgen aber densel­ben CSS-Klassen wie
die Urkunden-Bausteine.

**Datenlage-Befund:** in den aktuellen 4116 personenliste.csv-Zeilen hat
KEINE gleichzeitig `nennung_in_urkunden` UND `nennung_in_buergerbuch`
befüllt (1458 Urkunden-only + 2658 Bürgerbuch-only = 4116) - der Zwei-
Quellen-Fall wurde deshalb mangels echtem Beispiel per Konsole mit einem
synthetischen Testdatensatz verifiziert (Screenshot 3, siehe Selbstauskunft
im Chat), nicht mit echten Daten.

Live bestätigt: "Abel Krammer" (1 Urkunde, StaAKr-0026) öffnet direkt die
Detailansicht ohne Zurück-Button; "Abraham Behamb" (BB-2454) ebenso für
Bürgerbuch, korrekt ohne erfundene Felder (Beruf/Ort/Bürgen waren in den
Daten leer und wurden entsprechend weggelassen); "Abt Bendedikt" (2
Urkunden) öffnet die Liste mit Klick-durch und funktionierendem Zurück;
`bubbleChart.js` (dieselbe `personen.datenDatei`) läuft nach der Registry-
Änderung unverändert weiter.

---

## 2026-09-18 (72) – Bipartite Flow Map: Zoom, Drag-Performance, Sichtbarkeit dünner Linien, Gruppen-Hervorhebung, Fokus-Rahmen

Datei: `js/viz/bipartiteFlowMap.js`.

**Punkt 1 (Mausrad-Zoom weiterhin defekt, Drag aber funktionierend):**
Fundstelle: `line.flow-band-trefferflaeche` (409 unsichtbare, 14px breite
Trefferflächen-Linien, `pointer-events:auto`) verliefen als GESCHWISTER von
`mapDiv` quer über weite Teile der sichtbaren Kartenfläche (jede Linie vom
Gruppen-Balken bis zum jeweiligen Ortsknoten) - ein Wheel-Ereignis an
praktisch jeder Scroll-Position trifft mit hoher Wahrscheinlichkeit eine
dieser Linien und wird dort abgefangen, bevor es `mapDiv` erreicht (derselbe
Geschwister-Bubbling-Mechanismus wie in den beiden vorigen Aufträgen).
Drag funktionierte bereits, weil nur der STARTPUNKT eines Drags eine freie
Stelle braucht, nicht jede Folgebewegung. Da Punkt 3 (s.u.) diese Linien
ohnehin ersatzlos entfernt, ist der Blocker weg - live bestätigt (Kachel-
Zoomstufe z=5 → z=7 nach echtem Mausrad-Scroll).

**Punkt 2 (Drag-Performance):** `positionVonOrt()` (Leaflets
`latLngToContainerPoint()`) wurde pro `move`-Ereignis bis zu vier Mal
redundant für denselben Ort berechnet. Jetzt einmal pro Ort in einer `Map`
zwischengespeichert (`ortPositionen`) - reduziert echte Projektions-
Berechnungen pro Bewegung von geschätzt ~1600+ auf ~225, zusätzlich zum
kompletten Wegfall der 409 Trefferflächen-Attribut-Updates (Punkt 3).

**Punkt 3 (keine Linien-Tooltips mehr):** `line.flow-band-trefferflaeche`
samt Tooltip-Listenern und `baueFlussTooltip()` ersatzlos entfernt.

**Punkt 4 (Mindest-Strichstärke):** jedes Band bekommt zusätzlich zur
(weiterhin proportional kodierten) Füllung einen gruppenfarbenen `stroke`
mit mindestens 1,5px (`MINDEST_STRICHSTAERKE`) - zeichnet auch die am
Ortsknoten spitz zulaufende Kontur durchgehend sichtbar nach.

**Punkt 5 (Gruppen-Klick blendet Linien komplett aus):** Bänder nicht
ausgewählter Gruppen bekommen jetzt `fill-opacity:0` UND `stroke-opacity:0`
(vorher nur gedimmt) - die Balken selbst bleiben unverändert nur gedimmt.
Live bestätigt: 363 von 363 nicht-ausgewählten Bändern vollständig
unsichtbar nach Klick auf "Klerus", alle vier Balken weiterhin sichtbar.

**Punkt 6 (blauer Fokus-Rahmen):** neue CSS-Regel
`:focus:not(:focus-visible) { outline: none; }` auf `.leaflet-container`
(Fundstelle: ein Mausklick auf die Kartenfläche fokussiert Leaflets eigenen,
von Leaflet selbst fokussierbar gemachten Kartencontainer) sowie
`.orts-knoten`/`.gruppe-knoten`. Live bestätigt: Mausklick auf die Karte
ergibt `outline-style:none`, `circle.orts-knoten` matcht nach `.focus()`
weiterhin `:focus-visible` mit sichtbarem `outline-style:solid`.

Nebenbefund: eine Backtick-in-CSS-Kommentar-in-Template-Literal-Korruption
(dieselbe wiederkehrende Fehlerklasse wie in früheren Aufträgen dieser
Sitzung) trat beim ersten Entwurf des Punkt-6-Kommentars auf (`tabindex`/
`tabindex="0"` in Backticks im CSS-Kommentar), wurde per Live-Test
(`SyntaxError: Unexpected identifier 'tabindex'`) erkannt und vor
Fertigstellung korrigiert.

---

## 2026-09-18 (71) – Bipartite Flow Map: drei Regressionen nach dem Gruppen-Umbau behoben (Mausrad-Zoom, Node-Klick/Hover, verwaiste Hervorhebung)

Datei: `js/viz/bipartiteFlowMap.js`. Alle drei vom Auftrag genannten
Verdachtsursachen erwiesen sich als FALSCH - live per `elementFromPoint()`,
`dispatchEvent()` und direktem DOM-Datenabgleich widerlegt.

**Punkt 1 (Mausrad-Zoom) + Punkt 2 (Node-Klick/Hover), EIN gemeinsamer
Fund:** der vorige Auftrag ("Zoom-Regression beheben...", Eintrag 70) gab
`.leaflet-control-container` beim Verschieben nach `plotWrapper` zum ERSTEN
MAL eine echte Breite/Höhe (volle Kartengröße, nötig für die korrekte
Positionierung der rechts-/unten-verankerten Leaflet-Steuerelemente), aber
KEIN eigenes `pointer-events:none`. Der Container-KASTEN selbst (nicht nur
seine Buttons, die bereits korrekt `auto` innerhalb von Leaflets `.leaflet-
top`/`.leaflet-bottom`s `none` sind) wurde dadurch zu einer unsichtbaren,
Wheel-/Klick-schluckenden Fläche über der GESAMTEN Karte - per
`elementFromPoint()`-Raster über die komplette Kartenfläche bestätigt (jeder
getestete Punkt lieferte `.leaflet-control-container` zurück, nicht die
Karte/die Orts-Knoten darunter). Die vom Auftrag vermuteten Ursachen (Punkt
1: Overlay-Trefferflächen blockieren Wheel; Punkt 2: verlorene Event-
Listener nach dem Gruppen-Umbau) waren NICHT die Ursache - ein Live-Test per
`dispatchEvent()` bewies, dass Klick-/Hover-Listener der Orts-Knoten die
ganze Zeit korrekt gebunden blieben, nur nie erreicht wurden. Fix: ein
zusätzliches `steuerElemente.style.pointerEvents = 'none';`. Live bestätigt:
Mausrad-Scroll über der Karte änderte den Kachel-Zoom-Level nachweisbar
(z=5 → z=7, Kachel-URL-Vergleich); Klick auf "Praha" öffnete die Sidebar mit
4 Urkunden, Hover zeigte den Tooltip ("Tulln, Dominierende Kategorie:
Politik").

**Punkt 3 (verwaiste hervorgehobene Knoten):** die vermutete Ursache
(Hervorhebungslogik arbeitet noch kategorie-basiert) traf NICHT zu - ein
direkter Abgleich der Kreis-Opazität gegen die gebundenen `fluesse`-Daten
(zwei Gruppen getestet, Dynastie und Klerus) ergab ZERO Diskrepanzen;
`beteiligt` nutzt in `aktualisiereHighlight()` bereits korrekt `f.gruppe`.
Tatsächliche Ursache: bei dieser Kartenzoomstufe liegen mehrere,
geografisch nahe Orte (v.a. rund um Krems) auf demselben Bildschirm-Pixel -
welcher der überlappenden Kreise sichtbar obenauf liegt, hing bisher rein
von der Dateneinlese-Reihenfolge in `beteiligteOrte` ab, NICHT vom
Hervorhebungs-Zustand. Ein hervorgehobener Kreis konnte dadurch am selben
Punkt mehrere unverbundene, abgeblendete Kreise verdecken (oder umgekehrt) -
was optisch wie ein "verwaister, hervorgehobener Knoten ohne erkennbare
Verbindung" wirkt, obwohl die Daten dahinter bereits korrekt waren. Fix:
`aktualisiereHighlight()` hebt (`.raise()`) alle tatsächlich beteiligten
Kreise konsequent ans Ende ihres Elternknotens (= zuletzt gezeichnet =
optisch obenauf). Live bestätigt: an allen vier verbliebenen
Kollisionspunkten nach Klick auf "Klerus" liegt danach ausnahmslos ein
Kreis mit tatsächlicher Verbindung sichtbar über allen unverbundenen an
derselben Position (0 von 4 Kollisionen verletzen die Regel, vorher nicht
geprüft/nicht garantiert).

---

## 2026-09-18 (70) – Bipartite Flow Map: Zoom-Regression behoben, Balken auf soziale Gruppen umgestellt

Dateien: `js/viz/bipartiteFlowMap.js`, `js/viz/chordDiagramm.js` (nur `export`-
Keyword ergänzt).

**Punkt 1 (Zoom/Pan-Regression):** beide vom Auftrag vorgeschlagenen
Kandidatenursachen (neue statische `L.map()`-Instanz; fehlendes
`invalidateSize()`) wurden geprüft und ausgeschlossen -
`baueStatischeKarte()` ruft unverändert `L.map(mapDiv)` ohne Options auf.
Tatsächliche Ursache, per `document.elementFromPoint()` live nachgewiesen:
seit der Layout-Trennung des letzten Auftrags (Punkt 4, `plotWrapper`) ist
das SVG-Overlay ein GESCHWISTER von `mapDiv` statt dessen Kind. Konkret
blockiert wurde die Karte dadurch zweifach:
(a) das Hintergrund-Rect (Klick-auf-freie-Fläche-setzt-Hervorhebung-zurück,
voriger Auftrag) deckte mit voller `breite` auch die gesamte Kartenfläche ab
und fing dort JEDEN Klick/jedes Wheel-Ereignis ab, bevor es Leaflet erreichte;
(b) selbst nach Verkleinern dieses Rects auf `SPALTEN_BREITE` blieben
Leaflets eigene Zoom-Buttons blockiert, weil sie als Kind von `mapDiv` in
dessen eigenem CSS-Stacking-Context liegen (`mapDiv` hat explizites
`z-index:1`) - ihr internes `z-index:1000` kann diesen Context nicht
durchbrechen, weshalb das Overlay (Geschwister von `mapDiv`, `z-index:450`)
sie trotzdem verdeckt, sobald eine Flussband-Trefferfläche dort geometrisch
darüberliegt. Fix, zweiteilig: (a) Hintergrund-Rect deckt nur noch die
Kategoriespalte ab; (b) `.leaflet-control-container` wird aus `mapDiv` heraus
direkt nach `plotWrapper` verschoben (echtes Geschwister von Overlay UND
`mapDiv`, per Inline-Style exakt auf `mapDiv`s bisherige Position/Größe
gebracht) - rein optische DOM-Umhängung, Leaflet steuert die Buttons
weiterhin normal. Live per `elementFromPoint()` bestätigt: vor dem Fix lag an
der exakten Zoom-In-Button-Position die Flussband-Trefferfläche, danach der
Button selbst (dessen eigenes `<span>`). **Einschränkung, transparent
berichtet:** ein tatsächlicher Zoom-Level-Wechsel nach echtem Klick ließ sich
in dieser Testumgebung NICHT abschließend per Kachel-`src`/Knoten-Position
bestätigen - dieselbe Prüfung schlägt jedoch auch auf der unveränderten,
in einem früheren Auftrag bereits bestätigt funktionierenden `verbindungs
karte.js`-Basislinie fehl (weder echter Klick noch Doppelklick lösen dort
einen sichtbaren Zoom aus), was auf eine Einschränkung des Browser-Automat
isierungswerkzeugs in dieser Sitzung hindeutet, nicht auf eine Code-
Regression. Die strukturelle Ursache und ihr Fix gelten als solide
nachgewiesen (Trefferflächen-Test), der reine Pixel-Zoom-Effekt bleibt an
dieser Stelle unbestätigt.

**Punkt 2 (Balken zeigen soziale Gruppen statt Kategorien):** `GRUPPEN` und
`ermittleGruppe()` aus `chordDiagramm.js` exportiert (Logik unverändert) und
in `bipartiteFlowMap.js` importiert statt neu implementiert. Die vier
Kategoriebalken (16 Urkunden-Kategorien) sind ersetzt durch vier feste Balken
Dynastie (Habsburger)/Adel/Klerus/Bürgertum in denselben vier Farben wie das
Chord-Diagramm. `baueFluesse()` verknüpft jetzt Ort × soziale Gruppe (über
`ermittlePersonenDerUrkunde()` + `ermittleGruppe()` je Urkunde) statt
Ort × Kategorie. Orts-Knotenfarbe bleibt bewusst unverändert bei der
dominanten THEMATISCHEN Kategorie (eigene, von den Gruppen-Flüssen
unabhängige Zählung `ermittleOrtKategorieZaehlung()`, da die alte
Herleitung aus `fluesse` mit dem Gruppen-Umbau wegfiel) - Knoten nach Thema,
Balken nach sozialer Gruppe ist so gewollt (Nicht-Ziel des Auftrags). Live
bestätigt: vier Balken mit den Farben `#8b1a2b`/`#1f4e8c`/`#5b2d82`/`#2f7a45`,
Flussbänder verbinden Orte korrekt mit den sozialen Gruppen der dort
genannten Personen (225 Orts-Knoten, 818 Flussband-Elemente bei vollständig
geladenen Daten inkl. `familien.csv`); Klick-Hervorhebung funktioniert
unverändert auf den vier neuen Balken (selbes Muster wie zuvor auf den 16
Kategoriebalken).

---

## 2026-09-18 (69) – Bipartite Flow Map: Überarbeitung (Kategorie-Einfärbung, Balken-Hervorhebung, Layout-Trennung, Beschriftung, Hover-Trefferfläche)

Datei: `js/viz/bipartiteFlowMap.js`.

**Punkt 1 (Orts-Knoten nach dominierender Kategorie einfärben):**
`ermittleDominanteKategorie()` summiert je Ort die `anzahl` pro Kategorie
über alle Flüsse dieses Ortes, sortiert absteigend, Gleichstand alphabetisch
(`localeCompare('de')`, deterministisch). Orts-Knoten-Füllfarbe kommt jetzt
aus `farbeFuerKategorie()` der dominanten Kategorie statt der bisherigen
festen Farbe. Neuer Hover-Tooltip macht Gleichstände explizit sichtbar. Live
bestätigt: "Wien" → Politik (`#23953f`, 170 Urkunden vs. 49 für die
zweitstärkste Kategorie), "Krems" → Rechtswesen (`#239595`, 81 Urkunden) -
Tooltip-Text UND tatsächliche Kreis-Füllfarbe stimmen exakt überein.

**Punkt 2 (Kategoriebalken-Klick hebt hervor statt Sidebar):** dasselbe,
bereits etablierte Fixierungs-Muster wie sankey.js' Punkt 5
("Klick auf Balken fixiert Hervorhebung statt Sidebar") - `instanz.auswahl`,
`aktualisiereHighlight()`, dieselben Opazitäts-Ebenen. Reset über erneuten
Klick, Klick auf freie Fläche oder Escape. Live bestätigt: Klick auf
"Politik" → Bänder split in 0.85 (hervorgehoben) / 0.08 (abgeblendet) statt
Sidebar-Öffnung; Orts-/Kategorie-Knoten split in 1 / 0.15; erneuter Klick,
Klick auf Hintergrund-Rect UND Escape setzen jeweils zuverlässig zurück auf
einheitlich 0.5.

**Punkt 3 (Ort-Klick weiterhin Sidebar):** unverändert, live regressions-
geprüft NACH allen übrigen Änderungen - Klick auf einen Orts-Knoten öffnet
weiterhin korrekt "Tulln" mit der Urkunden-Sidebar.

**Punkt 4 (Kategoriespalte außerhalb der Karte, links):** neuer
`plotWrapper` trägt sowohl `mapDiv` (jetzt `position:absolute; left:
SPALTEN_BREITE` mit explizitem, niedrigem z-index für einen garantierten
eigenen Stapelkontext) als auch das SVG-Overlay (jetzt an `plotWrapper`
statt an `mapDiv` gehängt - `erzeugeUeberlagerungsSvg()` selbst brauchte
dafür keine Änderung). Orts-Positionen bekommen einen horizontalen Versatz
um SPALTEN_BREITE (`projiziereOrtAufKarte()`, neu). Live bestätigt: Karte
beginnt bei x=236px, Kategoriespalte bei x=16px - Differenz 220px entspricht
exakt SPALTEN_BREITE, keine Überlappung; Flussbänder verlaufen weiterhin
sichtbar über die Kartenfläche (Screenshot).

**Punkt 5 (größere Beschriftung):** Kategorie-Label-Schriftgröße von 10 auf
14 erhöht, SPALTEN_BREITE von 170 auf 220 vergrößert, damit die größere
Schrift weiterhin Platz hat. Labels stehen jetzt links vom Balken
(rechtsbündig, `text-anchor:end`), wachsen in den freien Spaltenraum statt
in Richtung Karte.

**Punkt 6 (breitere Hover-Trefferfläche für Flussbänder, aus dem vorigen
Auftrag vorgemerkt):** dieselbe Lösung wie verbindungskarte.js - eine
zusätzliche, unsichtbare `line.flow-band-trefferflaeche` (transparent,
stroke-width:14) von der exakten Ort-Position zur Mitte des Kategorie-
Segments (eine GERADE Linie statt der spitz zulaufenden Bandform selbst
nachzuziehen - dadurch überall gleich breit, auch direkt am Ortsende). Live
bestätigt per direktem Event-Dispatch auf die Trefferfläche: Tooltip "Wien →
Medien, 1 Urkunde(n)" erscheint korrekt und sofort (opacity:1).

Zoom/Pan-Regressionsprüfung (aus dem vorigen Auftrag): Bänder/Knoten bleiben
nach echtem Zoom-Button-Klick weiterhin korrekt an ihren Kartenpositionen
verankert, auch mit dem neuen Spalten-Versatz (Screenshot).

Nebenbei entfernt: `baueKategorieRecordsMap()` (ungenutzt seit Punkt 2, da
Kategorie-Klick keine Sidebar mehr öffnet) und die bereits zuvor ungenutzte
Konstante `KNOTEN_HOEHE`.

Cache-Bust-Testing: `?vbfm=1` durch die komplette Importkette temporär
gesetzt, live getestet, vollständig zurückgesetzt - grep-bestätigt keine
verbleibenden Marker.

---

## 2026-09-18 (68) – Verbindungskarte: verwaiste Orte ausgeblendet, Mindestschwelle 2, breitere Hover-Trefferfläche

Datei: `js/viz/verbindungskarte.js`.

**Punkt 1 (verwaiste Orte ausblenden):** `aktualisiereSichtbarkeit()` ermittelt
jetzt zusätzlich zur Linien-Sichtbarkeit die Menge der Ortsnamen, die bei der
aktuellen Schwelle noch an mindestens einer sichtbaren Linie beteiligt sind,
und blendet `ortsKnoten` entsprechend mit aus. Live bestätigt bei zwei
Schwellenwerten: Schwelle 2 → 42 von 177 Orts-Kreisen sichtbar (51
Verbindungen), Schwelle 5 → nur noch 8 Kreise (8 Verbindungen) - in beiden
Fällen 0 Abweichungen zwischen sichtbaren Linien-Endpunkten und sichtbaren
Kreisen (dieselbe geometrische Gegenprobe wie beim Zoom/Pan-Auftrag).

**Punkt 2 (Mindestschwelle 2):** Regler-`min` und Startwert jetzt 2 statt 1
(`Math.max(maxAnzahl, 2)` schützt vor einem ungültigen Bereich, falls die
stärkste Verbindung im Datensatz jemals unter 2 läge) - Einzelverbindungen
werden dadurch nie angezeigt, auch nicht im Ausgangszustand. Live bestätigt:
`min="2"`, `value="2"` beim ersten Rendern, Statustext zeigt sofort "51 von
338 Verbindungen" (nicht 338 von 338 wie zuvor).

**Punkt 3 (breitere Hover-Trefferfläche):** neue, unsichtbare
`line.verbindung-trefferflaeche` (transparent, `stroke-width:14`) direkt
über jeder sichtbaren Linie - trägt jetzt Tooltip-Listener/Tastatur-Fokus,
die sichtbare Linie ist rein dekorativ (`pointer-events:none`, unverändert in
ihrer Stärke-Kodierung). Live per `elementFromPoint()` bestätigt: die
Trefferfläche reagiert bis ±7px senkrechten Abstand von der Linienmitte
(vorher: nur die sichtbare, 1.5–8px dünne Linie selbst) - ein Tooltip-Test
mit echtem `mouseenter` bei 5px Abstand von der Linie zeigte korrekt "Venezia
↔ Wien, 2 gemeinsame Nennung(en)".

**Nebenfrage (Antwort):** Ja, dieselbe Präzisions-Problematik betrifft auch
die Flussbänder in `bipartiteFlowMap.js` - dort sogar tendenziell stärker,
da `baueRibbonPfad()` am Ortsende (linke Seite) spitz zuläuft (Breite 0 an
genau diesem Punkt) statt einer gleichbleibend dünnen Linie. Für den
nächsten Bipartite-Flow-Map-Auftrag vorgemerkt, hier nicht umgesetzt
(Auftrag wörtlich: "Betroffene Dateien: verbindungskarte.js").

Cache-Bust-Testing: `?vfilter2=1` durch die komplette Importkette temporär
gesetzt, live getestet, vollständig zurückgesetzt - grep-bestätigt keine
verbleibenden Marker.

---

## 2026-09-18 (67) – Verbindungskarte: Stärke-Regler; beide Module: Node-Klick öffnet Urkunden-Sidebar

Dateien: `js/viz/verbindungskarte.js`, `js/viz/bipartiteFlowMap.js`.

**Punkt 0 (Vorab-Diagnose, vor der Umsetzung beantwortet):** die Verbindungs-
stärke war bereits über die LINIENSTÄRKE kodiert (`dickeSkala`/
`stroke-width`, `d3.scaleSqrt()`, Bereich 1.5–8px) - Opazität (fix 0.5) und
Farbe (fix) trugen keine Information. Der neue Regler baut auf dieser
bestehenden Kodierung auf (filtert zusätzlich, ersetzt sie nicht).

**Punkt 1 (Stärke-Regler, nur Verbindungskarte):** neuer Schieberegler
"Mindeststärke" in der Werkzeugleiste, Bereich 1 bis zur tatsächlich
stärksten vorkommenden Verbindung (`d3.max(paare, p => p.anzahl)`, live
gemessen: 18). Blendet Linien unterhalb der Schwelle per
`style('display','none')` aus (Datenbindung bleibt intakt, kein erneutes
`.join()` nötig) und zeigt live "X von Y Verbindungen". Live bestätigt:
Schwelle 1 → 338/338, Schwelle 2 → 51/338, Schwelle 5 → 8/338 - Statustext
und tatsächlich sichtbare Linienzahl stimmen exakt überein. bipartiteFlowMap.js
unangetastet (Auftrag wörtlich).

**Punkt 2 (Node-Klick-Sidebar, beide Module):** Klick auf einen Orts-Knoten
öffnet sidebar.js' etabliertes `zeigeUrkundenSidebar()` mit den tatsächlich
zu diesem Ort beitragenden Urkunden (`baueOrtRecordsMap()`, neu in beiden
Dateien - alle Records, deren `orte`-Feld den Namen auflösbar enthält, nicht
nur die, die zusätzlich eine Verbindung/einen Fluss bilden). In
bipartiteFlowMap.js zusätzlich Kategorie-Knoten klickbar (`baueKategorie-
RecordsMap()`, neu - Records nach `ersteKategorie()`). Orts-Knoten
(`circle.orts-knoten`) existierten in bipartiteFlowMap.js bisher NICHT als
eigenes Element (nur die Flussbänder selbst) - neu ergänzt, analog zu
verbindungskarte.js' bereits vorhandenen Orts-Kreisen, sonst gäbe es dort
keinen klickbaren Ort-Knoten. Beide Module bauen die Sidebar jetzt IMMER auf
(geschlossen, öffnet sich erst per Klick) - dieselbe `:has()`-Ausblendung von
Werkzeugleiste/Leaflet-Attribution wie karte.js proaktiv mit übernommen, da
Leaflets eigene Steuerelemente seit dem vorigen Ergänzungsauftrag (Zoom/Pan)
aktiv sind und ansonsten dieselbe, dort bereits behobene Überlappung erneut
aufgetreten wäre. Live bestätigt (beide Module): Klick auf Orts-Knoten
"Tulln" öffnet identisch "5 Urkunde(n)" (Querverweis zur bereits verifizierten
Zahl aus dem karte.js-Marker-Klick-Auftrag); Klick auf Kategorie-Knoten
"Politik" (bipartiteFlowMap.js) öffnet Liste mit 331 Urkunden, Klick-durch
zu einer Detailansicht funktioniert.

Cache-Bust-Testing: `?vsidebar=1` durch die komplette Importkette temporär
gesetzt, live getestet, vollständig zurückgesetzt - grep-bestätigt keine
verbleibenden Marker.

---

## 2026-09-18 (66) – Verbindungskarte/Bipartite Flow Map: navigierbar (Zoom/Pan), "Nicht verortet"-Knoten entfernt

Dateien: `js/utils/statischeKarte.js`, `js/viz/verbindungskarte.js`, `js/viz/bipartiteFlowMap.js`.

**Punkt 1 (Zoom/Pan):** `baueStatischeKarte()` baut die Leaflet-Karte jetzt
ohne einschränkendes Options-Objekt (`L.map(mapDiv)` statt der vorherigen
`dragging:false`/`scrollWheelZoom:false`/... Liste) - Standard-Leaflet-
Interaktion inkl. Zoom-Buttons, wie gefordert. Beide Module registrieren
dafür je eine neue `aktualisierePositionen()`-Funktion auf
`karte.on('zoom move', ...)` (Auftrag wörtlich, nicht nur 'zoomend'/'moveend'
- Linien/Bänder folgen dadurch flüssig während der Geste): verbindungskarte.js
aktualisiert Linien-Endpunkte UND Orts-Kreise, bipartiteFlowMap.js nur die
LINKE (geografische) Seite jedes Flussbandes - die rechte Kategorie-Spalte
ist nicht geografisch und bleibt fix. Live bestätigt (Wheel-Zoom, Zoom-Button,
simulierter Drag): 0 Abweichungen zwischen Linien-Endpunkten und den
zugehörigen Orts-Kreisen nach Zoom UND nach Pan (338 Linien/177 Kreise in
verbindungskarte.js geprüft); Flussband-Startpunkte in bipartiteFlowMap.js
ändern sich korrekt mit der Kartenposition.

**Punkt 2 ("Nicht verortet"-Knoten entfernt):** in BEIDEN Modulen ersatzlos
entfernt (Prüfauftrag bestätigt: bipartiteFlowMap.js hatte denselben
Sammelknoten, ebenfalls unter dem Namen "Nicht verortet"). `ermittleKnoten()`
(verbindungskarte.js) bzw. die `quellen`-Ermittlung (bipartiteFlowMap.js)
nehmen jetzt nur noch tatsächlich auflösbare Ortsnamen auf - dieselbe
Konvention wie karte.js' `baueOrtsAggregation()` ("nicht auflösbare Records
werden direkt verworfen"). Die frühere `ohneVerbindungMoeglich`-Zählung in
verbindungskarte.js hing ausschließlich am jetzt entfernten Knoten-Tooltip
und wurde mangels Anzeigeort ebenfalls entfernt (keine tote Zählung ohne
Verwendung). Live bestätigt: keine "Nicht verortet"-Textknoten mehr in
beiden Modulen (vorher/nachher-Linienzahl: verbindungskarte.js 357→338,
bipartiteFlowMap.js 436→428 - die Differenz sind exakt die entfallenen
Verbindungen zum/vom Sammelknoten).

Cache-Bust-Testing: `?vnav=1` durch die komplette Importkette temporär
gesetzt, live getestet, vollständig zurückgesetzt - grep-bestätigt keine
verbleibenden Marker.

---

## 2026-09-17 (65) – Verbindungskarte/Bipartite Flow Map: SVG-Overlay z-index gesetzt (Linien/Bänder verschwanden nach dem Kachel-Laden)

Dateien: `js/utils/statischeKarte.js` (neue Funktion), `js/viz/verbindungskarte.js`, `js/viz/bipartiteFlowMap.js`.

**Root-Cause (siehe vorigen Diagnoseauftrag):** beide Module bauten ihr
SVG-Overlay bislang selbst per `d3.select(mapDiv).append('svg')...`, jeweils
OHNE explizites `z-index`. Ein positioniertes Element ohne eigenes z-index
(= `auto`) liegt in der CSS-Stapelreihenfolge immer UNTER jedem Geschwister
mit explizitem, positivem z-index - unabhängig von der DOM-Reihenfolge.
Leaflets eigene `.leaflet-map-pane` (enthält die Kachel-Ebene) hat
z-index:400, das Overlay lag also dauerhaft darunter, sobald die Kacheln
tatsächlich geladen waren (solange die Kachel-Ebene noch leer/transparent
war, blieb das Overlay sichtbar - daher der "kurz sichtbar, dann weg"-Effekt).

**Fix:** `js/utils/statischeKarte.js` bekommt eine neue, exportierte
Funktion `erzeugeUeberlagerungsSvg(mapDiv, breite, hoehe, { ariaLabel })`,
die das SVG-Overlay MIT explizitem `z-index: 450` (über Leaflets höchstem
hier verwendeten Pane-Wert von 400, unter der eigenen Werkzeugleiste/dem
Info-Button beider Module mit z-index:900) baut und als D3-Selection
zurückgibt - beide Aufrufer ersetzen nur ihre eigene, bisher fehlerhafte
`d3.select(mapDiv).append('svg')...`-Zeile durch einen Aufruf dieser
Funktion, der gesamte übrige Zeichen-Code (`.append()`/`.selectAll()`-Ketten
auf der zurückgegebenen Selection) bleibt unverändert.

**Entscheidung zur empfohlenen Vereinheitlichung: UMGESETZT.** Die
Auslagerung war ohne Umbau der bestehenden Aufrufer machbar (siehe oben -
nur die eine Zeile, die das SVG erzeugt, wird ersetzt, die Signatur der
zurückgegebenen D3-Selection ist identisch zur vorherigen). Damit bekommt
jedes künftige, auf `baueStatischeKarte()` aufbauende Karten-Modul den Fix
automatisch mit.

Live bestätigt (beide Module, nach vollständigem Kachel-Ladevorgang, 18/18
bzw. 6/6 Kacheln `leaflet-tile-loaded`): Verbindungslinien (357) und
Flow-Bänder (436) bleiben dauerhaft sichtbar über den geladenen Kacheln,
kein Verschwinden mehr. Info-Popover beider Module bleibt weiterhin über
allem sichtbar (z-index:900 > 450) - keine neue Überlappung eingeführt.

Cache-Bust-Testing: `?vsvgfix=1` durch die komplette Importkette (index.html
→ app.js → archivalienRegistry.js → verbindungskarte.js/bipartiteFlowMap.js
→ deren eigener statischeKarte.js-Import) temporär gesetzt, live getestet,
vollständig zurückgesetzt - grep-bestätigt keine verbleibenden Marker.

---

## 2026-09-17 (64) – Karte: deutlichere Hervorhebung & längerer Zeitregler; Kachelraster: Paginierung auch unten

Dateien: `js/viz/karte.js`, `js/viz/regestenKachelraster.js`.

**Punkt 1 (Karte, deutlichere Hervorhebung):** die vorige Hervorhebung
(Eintrag 63) verschwand bereits nach 200ms - kaum wahrnehmbar. Jetzt
`HERVORHEBUNG_DAUER_MS = 2500` (Auftrag: "2-3 Sekunden") UND ein deutlich
kräftigerer Effekt: ein orangener `outline`-Rahmen (`#e07820`) + heller
Hintergrund (`#fce6cc`) statt nur der reinen Hintergrundfarbe - `outline`
bewusst statt `border`, damit sich die Box-Größe/das Layout der Nachbar-
Abschnitte nicht verschiebt. Farbwahl bewusst NICHT Rot (kollidiert mit der
bestehenden Unsicherheits-Kennzeichnung, `--unsicher`/Marker-Randfarbe
`#c0392b`) und NICHT Blau (Marker-Füllfarbe/App-Akzent) - Orange ist im
Sidebar-Kontext sonst ungenutzt und identisch zur bereits etablierten
Hervorhebungsfarbe in `ganttDiagramm.js` (`.gantt-hervorgehoben`,
Wiederverwendung statt neuer Farbe). Die Transition liegt jetzt auf der
Basis-Regel `.karte-sidebar-ort` (nicht nur der `.hervorgehoben`-Variante),
damit auch das Ausblenden nach Ablauf der Frist sanft statt abrupt erfolgt.
Live bestätigt (Screenshot): Zielabschnitt eindeutig erkennbar umrandet.

**Punkt 2 (Karte, längerer Zeitregler):** `.karte-slider-wrapper`s Breite von
200px auf 320px erhöht. Die Werkzeugleiste bleibt dank ihres bereits
vorhandenen `flex-wrap:wrap` unverzerrt - live bestätigt, kein Umbruch bei
normaler Fensterbreite.

**Punkt 3 (Kachelraster, Paginierung auch unten):** `bauePaginierung()`
bekommt einen `position`-Parameter ("oben"/"unten", nur für aria-label und
Rand-Abstand relevant) - dieselbe Zwei-Leisten-Konvention wie bereits in
`personenliste.js` etabliert. `zeichneKachelraster()` hängt jetzt zusätzlich
zur bestehenden oberen Leiste eine zweite, identische Leiste ans Ende des
Kachelrasters an - beide werden bei jedem Seitenwechsel aus demselben
`instanz.aktuelleSeite` komplett neu gebaut, sind dadurch immer synchron
ohne eigenen Abgleichs-Code. Live bestätigt: Klick auf "Weiter" in der
unteren Leiste blättert beide Leisten synchron auf Seite 2, Ansicht scrollt
danach nach oben (unverändertes bestehendes Verhalten).

Test-Hinweis: die Screenshot-Erfassung dieser Sitzung zeigte bei einer sehr
langen, weit gescrollten Kachelraster-Seite (~4800px, viele lazy-geladene
Fotos) wiederholt leere Aufnahmen trotz korrekt geladener Inhalte (per
DOM-Abfrage/`elementFromPoint()` bestätigt) - eine Eigenheit der
Test-Browser-Aufnahme bei dieser Scroll-Tiefe, kein Anwendungsfehler. Für den
Screenshot-Beleg wurde die Trefferliste testweise auf 3 Einträge gefiltert
(Suchschlitz), wodurch beide Leisten unverschoben in einer Aufnahme sichtbar
sind - reine Test-Erleichterung, keine Code-Änderung an der Filterlogik.

---

## 2026-09-16 (63) – Karte: Klick auf Ort-Marker öffnet Sidebar (kontextabhängig)

Datei: `js/viz/karte.js`.

**Punkt 1 (Normalmodus, Marker-Klick öffnet Urkunden-Sidebar):** die Sidebar
(`baueSidebarGeruest()`) wird jetzt IMMER aufgebaut, nicht mehr nur im
Unsicherheiten-Modus - im Normalmodus bleibt sie beim Aufbau geschlossen und
öffnet sich erst durch einen Marker-Klick, über sidebar.js' bereits
etablierten generischen Einstiegspunkt `zeigeUrkundenSidebar()` (kein neuer
Code für Liste/Detail-Logik nötig - genau 1 Urkunde -> volle Detailansicht,
mehrere -> kompakte Liste mit Weiterklick zur Detailansicht). Die zugehörige
`zurueckBtn`-Verdrahtung aus Eintrag 61/62 ist jetzt auf den
Unsicherheiten-Modus beschränkt (sonst würde sie im Normalmodus mit
sidebar.js' eigenem, für die flache Liste zuständigen
`zurueckZurUrkundenListe()`-Handler kollidieren und beim Zurück-Klick
abstürzen, da `instanz.unsichereOrteDaten` dort nicht geladen ist). Live
bestätigt: Klick auf einen Mehrfach-Ort (z. B. "Tulln", 5 Urkunden) öffnet
die Liste, Klick auf einen Eintrag die Detailansicht, "← Zurück" (sidebar.js'
eigener, unveränderter Handler) führt korrekt zur Liste zurück; Klick auf
einen Einzel-Ort (z. B. eine Urkunde mit `orte`-Feld ohne weitere Treffer)
öffnet direkt die Detailansicht ohne Zwischenschritt.

**Punkt 2 (Unsicherheiten-Modus, Marker-Klick springt statt zu wechseln):**
`springeZuOrtsAbschnitt()` (neu) ruft zuerst `oeffneUnsichereOrteSidebar()`
auf (baut IMMER die Übersicht auf, nie eine Urkunden-Detailansicht -
idempotent, holt die Sidebar auch aus einer offenen Detailansicht zur
Übersicht zurück) und scrollt danach zum passenden `.karte-sidebar-ort`-Block
(Namensvergleich gegen `.karte-sidebar-ort-titel`, kein zusätzliches
ID-Attribut nötig), mit kurzer, per CSS-Transition ausblendender
Hervorhebung. `scrollIntoView({block:'start'})` bewusst OHNE
`behavior:'smooth'` (Root-Cause-Fund während des Testens: die
Scroll-Animation lief im automatisierten Test-Browser nicht zuverlässig zu
Ende, Standardverhalten - ein sofortiger Sprung - ist zudem für "spring zu
diesem Abschnitt" die unmittelbarere, robustere Wahl). Live bestätigt: Klick
auf einen unsicheren Marker springt zum richtigen Abschnitt (`scrollTop`
0 → 12654), der Sidebar-Titel bleibt "Unsichere Orte (86)" statt zu wechseln
- auch dann, wenn zuvor eine Urkunden-Detailansicht offen war (Klick auf
einen Signatur-Button). Bei inaktivem Unsicherheiten-Toggle verhält sich
derselbe Marker-Klick wie in Punkt 1 (per Toggle live bestätigt).

Beide Punkte teilen sich denselben Marker-Klick-Einstiegspunkt in
`zeichneMarkerFuerOrte()` (`aktiviere()`, verzweigt per `istUnsicherModus`)
- zusätzlich an Enter/Leertaste gekoppelt (die Marker trugen bereits zuvor
`tabindex="0"` für den Tooltip, aber keine Tastatur-Aktivierung; live per
simuliertem `Enter`-Tastendruck bestätigt).

Nebeneffekt (bewusst in Kauf genommen): die Punkt-1/3-CSS-Regel aus Eintrag
62 (Werkzeugleiste/Attribution ausgeblendet, sobald `.bestand-sidebar.offen`)
greift jetzt auch im Normalmodus, sobald ein Marker-Klick die Sidebar öffnet
- verhindert denselben Überlappungsfehler dort ebenfalls, auch für den dort
nicht deaktivierten Zeitregler.

Cache-Bust-Testing: `?vmarker=1` durch die Importkette temporär gesetzt,
live getestet, vollständig zurückgesetzt - grep-bestätigt keine
verbleibenden Marker.

---

## 2026-09-16 (62) – Karte: vier Fixes (Sidebar-Überlappung, Bógget-Koordinaten, Klickfläche, Signatur-Zuordnung)

Dateien: `js/viz/karte.js`, `data/orte.csv` (eine Zeile).

**Punkt 1 (Info-Button/Leaflet-Attribution hinter der Sidebar) - ROOT-CAUSE
per `document.elementFromPoint()` live diagnostiziert:** `.karte-werkzeug-
leiste` trägt `position:relative; z-index:900` (nötig, damit das Info-
Popover über Leaflets internen Panes liegt, siehe Eintrag 19/Dateikopf-
Kommentar) - das liegt automatisch ÜBER der Sidebar (z-index 500,
js/utils/sidebar.js), unabhängig vom Info-Button selbst. Ebenso Leaflets
EIGENER `.leaflet-control-container`. Fix: eine `:has()`-Regel (etabliertes
Muster, siehe js/utils/zoomSteuerung.js) blendet BEIDE per
`visibility:hidden` aus, sobald `.bestand-sidebar.offen` tatsächlich gesetzt
ist (nicht bloß, solange der Unsicherheiten-Modus aktiv ist - die Sidebar
lässt sich davon unabhängig per ×-Button schließen) - gezielt nur die rechte
untere Leaflet-Ecke (Attribution), die linke obere (Zoom-Buttons) bleibt
unberührt, die überlappt die rechtsseitige Sidebar nie. Live bestätigt: bei
offener Sidebar weder Info-Button noch Attribution sichtbar, bei
geschlossener Sidebar beide wie zuvor sichtbar.

**Punkt 2 (Bógget-Koordinaten):** `data/orte.csv`, Zeile `bogget_belgien`:
`lat=51,1667`, `lon=5,5833` nachgetragen (Bocholt, belgisch Limburg).
Anmerkungstext angepasst ("Koordinaten noch nicht ermittelt" → "Ortsidenti-
fikation unsicher", da die Koordinaten jetzt bekannt sind, die Ortsidentität
selbst aber weiterhin unsicher bleibt, daher `orte_unsicher` unverändert
"ja"). Live bestätigt: `ladeOrtsVerzeichnis()` liefert den Eintrag jetzt mit
Koordinaten, der Ort wandert im Unsicherheiten-Modus korrekt von "Völlig
unklare Orte" (23→22) zu "Kartierte, aber unsichere Orte" (63→64) und
erscheint jetzt auch im normalen Kartenmodus als Marker.

**Punkt 3 (Klickfläche der Signatur-Buttons) - KEIN eigenständiger Bug,
dieselbe Ursache wie Punkt 1:** Live-Diagnose per `elementFromPoint()` an
mehreren Punkten des ersten Sidebar-Eintrags ergab, dass die deaktivierte
Regler-Gruppe (der Hinweistext "(deaktiviert, solange ...)" lässt sie per
Flex-Wrap höher werden als sie aussieht) bei z-index:900 bis in den
Sidebar-Körper hineinreicht und dort Klicks abfängt - reproduzierbar exakt
beim ersten Eintrag (räumlich am nächsten am unteren Rand der Werkzeug-
leiste). Der Punkt-1-Fix (Werkzeugleiste komplett ausgeblendet, sobald die
Sidebar offen ist) behebt dies automatisch mit. Live bestätigt: Klick an
drei Punkten (oben/Mitte/unten) der sichtbaren Button-Fläche trifft jetzt
überall den Button; Klick nahe der Unterkante öffnet zuverlässig die
Detailansicht.

**Punkt 4 (robustere Signatur-Zuordnung) - Abweichung vom wörtlichen
Akzeptanzkriterium, transparent offengelegt:** `ermittleUrkundenNachOrtsname()`
(neu) ergänzt die reine Anmerkungs-Textsuche um eine direkte, namensbasierte
Suche in urkunden.csv (dieselbe Konvention wie urkundenOrte.js'
`loeseOrteAuf()`) - Ergänzung, keine Ersetzung (Auftrag wörtlich), Dedupli-
zierung per Objekt-Referenz. Live-Diagnose ergab ein echtes Datenqualitäts-
Problem statt nur "anderer Formulierung": Markt Ascha zitiert in seiner
Anmerkung "StaAKr-0914" - existiert in urkunden.csv nirgends (Volltextsuche
bestätigt, dieselbe Erkenntnis wie in Eintrag 61), kann nie auflösbar sein;
die neue Suche findet stattdessen die tatsächlich zugehörige Urkunde
StaAKr-0792 (orte-Feld exakt "Markt Ascha"). Neunkirchen zitiert "StaAKr-
0765" - diese Signatur EXISTIERT (die reine Textsuche fand sie bereits
vorher, live bestätigt), ihr eigenes orte-Feld ist aber "Wien", nicht
Neunkirchen (mutmaßlich ein Zahlendreher im Anmerkungstext) - Neunkirchen
zeigt daher am Ende BEIDE Signaturen (StaAKr-0765 UND das neu gefundene
StaAKr-0673b), nicht nur die eine im Auftrag genannte. Zusätzlicher, über
das Akzeptanzkriterium hinausgehender Effekt: alle bisherigen "4 Orte ohne
auswertbare Signatur" (nicht 5, siehe Eintrag 61 für die verifizierte Zahl)
lösen sich jetzt vollständig auf (0 statt der im Auftrag erwarteten 3) - auch
Bógget, Maigen und Marquartsurfar haben real existierende, namensgleiche
Urkunden in urkunden.csv, ihre Anmerkung hatte nur keine Signatur zitiert.
Live gegen alle 86 Orte im Browser bestätigt.

**Root-Cause-Fund während der Implementierung (Punkt 1/3):** ein Zwischen-
stand des CSS-Kommentars in `fuegeStyleEin()`s Template-Literal enthielt
Backticks (`` ` ``) um Codereferenzen wie `:has()` - da dieser Kommentar
INNERHALB des JS-Template-Literals liegt (nicht in einem `//`-Kommentar),
beendete der erste Backtick den String vorzeitig, der Rest der CSS wurde als
JS-Code fehlinterpretiert ("Unexpected token ':'" bei jedem Modul-Import).
Per `document.elementFromPoint()`-Diagnose UND direktem `import()`-Test im
Browser gefunden und behoben (Backticks entfernt) - Lehre für künftige
Kommentare innerhalb von Template-Literalen in diesem Projekt.

Cache-Bust-Testing: `?vkarte3=1` bzw. `?vfinal=1` durch die komplette
Importkette (index.html → app.js → archivalienRegistry.js → karte.js)
temporär gesetzt, live getestet, vollständig zurückgesetzt - grep-bestätigt
keine verbleibenden Marker.

---

## 2026-09-16 (61) – Karte: Sidebar-Filter, Live-Zeitregler, Rubrik "völlig unklare Orte"

Datei: `js/viz/karte.js` (Kernlogik großteils neu geschrieben).

**Punkt 1 (Sidebar-Filter) - ROOT-CAUSE-FUND, siehe Dateikopf-Kommentar für
die volle Herleitung:** die vorherige Fassung (Eintrag 60) interpretierte
"unsicherer Ort" fälschlich über urkunden.csv' ZEILENWEISES `orte_unsicher`-
Feld - lieferte 86 Orte, aber alle mit Koordinaten (0 ohne), im Widerspruch
zu den diesmal vorab verifizierten Zahlen (23 ohne/63 mit). Live-Diagnose
ergab: die korrekte Quelle ist orte.csv' EIGENES `orte_unsicher`-Feld (eine
Eigenschaft des ORTES, nicht der Urkunde-Zeile) - liefert exakt 86/23/63,
live per Node-Skript UND im Browser doppelt gegen die echten Daten bestätigt.
`unsicherheit_anmerkung` (ebenfalls orte.csv, "ortsbezogen" wie im Auftrag
explizit benannt) ist automatisch generierter Text der Form
"Ortsidentifikation in N Urkunde(n) als unsicher markiert (Signatur(en):
SIG1|SIG2)." - die referenzierten Urkunden werden per Textabgleich gegen
ALLE echten urkunden.csv-Signaturen herausgefiltert (nicht per Regex auf die
Anmerkungs-SYNTAX, da 5 von 86 Anmerkungen abweichend formuliert sind, z. B.
freier Text ohne Signatur-Erwähnung) - wortgrenzen-sicher gegen
Präfix-Kollisionen (z. B. "StaAKr-0001" vs. "StaAKr-0001b"). 4 der 86 Orte
benennen keine auswertbare Signatur (Datenehrlichkeit: leere Liste statt
erfundener Verknüpfung, Anmerkung bleibt trotzdem sichtbar). Klick auf eine
Signatur ruft sidebar.js' bereits etablierte `zeigeUrkundenDetail()` auf
(volle Detailansicht inkl. Fotogalerie/Lightbox, wiederverwendet statt neu
gebaut) - live bestätigt: Foto mit Farbreferenzkarte, Thumbnails, Signatur/
Datum/Regest/Kategorien korrekt. Eigener "← Zurück"-Weg zur Orte-Übersicht
ergänzt (zusätzlicher Klick-Handler auf demselben `zurueckBtn`, da sidebar.js'
generische `zeigeUrkundenListe()`/`_urkundenListe`-Maschinerie eine FLACHE
Liste erwartet, nicht unsere nach Ort gruppierte Struktur) - live bestätigt:
Rücksprung funktioniert, Sidebar zeigt wieder beide Abschnitte korrekt.

**Punkt 2 (Live-Zeitregler):** "Anwenden"-Button entfernt, beide Slider
lösen bei jedem `input`-Ereignis eine 80ms entprellte Aktualisierung aus.
Root-Cause-Überlegung vor der Umsetzung: ein voller `zeichneKarte()`-Aufruf
pro Debounce-Tick hätte `container.innerHTML=''` ausgelöst und damit den
gerade gezogenen Slider selbst zerstört (natives `<input type="range">`
verliert die Ziehgeste, wenn das Element ersetzt wird) - deshalb Trennung in
`zeichneKarte()` (baut Werkzeugleiste/Karte einmalig) und die neue
`aktualisiereMarker()` (leert/befüllt ausschließlich die Leaflet-Marker-
Ebene `instanz.markerLayer`, rührt Regler-DOM nicht an). Live bestätigt:
Simulierte Zieh-Sequenz (zwei `input`-Events ohne Klick) reduziert die
Markerzahl korrekt von 232 auf 116 (deckt sich exakt mit dem unabhängig
nachgerechneten Wert für 1400-1459); das Slider-`<input>`-Element bleibt
dabei nachweislich dasselbe DOM-Objekt (Referenzvergleich + Test-Attribut
vor/nach bestätigt).

**Punkt 3 ("Völlig unklare Orte"):** eigener, ERSTER Abschnitt in der
Sidebar für die 23 koordinatenlosen unsicheren Orte (gleiche Darstellungs-
tiefe wie Punkt 1: Anmerkung + anklickbare Signaturen), danach die 63
kartierten unsicheren Orte - da `js/utils/urkundenOrte.js`' `ladeOrtsVerzeichnis()`
koordinatenlose Zeilen strukturell verwirft und `unsicherheit_anmerkung`
nicht durchreicht, lädt karte.js orte.csv für den Unsicherheiten-Modus
JETZT EIGENSTÄNDIG über `core/dataLoader.js`' `ladeCSV()` (Nicht-Ziel:
keine Änderung an urkundenOrte.js, das für den normalen/Zeitregler-Modus
unverändert im Einsatz bleibt). Live bestätigt: Abschnitts-Reihenfolge
"Völlig unklare Orte (23)" vor "Kartierte, aber unsichere Orte (63)",
Kartenmarker-Anzahl exakt 63 (die 23 bekommen bewusst keinen Marker, nicht
positionierbar).

**Punkt 4 (gegenseitiger Ausschluss):** unverändert seit Eintrag 60 (Zeit-
regler disabled + zurückgesetzt, sobald der Unsicherheiten-Modus aktiv ist -
Details siehe dortiger Eintrag/Dateikopf-Kommentar).

Testmethodik: erneut das bekannte Python-http.server-Cache-Problem - Cache-
Bust-Marker `?vkarte2=1` vorübergehend auf `index.html`, `app.js` und
archivalienRegistry.js' `karte`-Eintrag gesetzt, nach erfolgreicher Live-
Verifikation vollständig zurückgesetzt (grep bestätigt: keine Datei enthält
noch `vkarte2`).

grep-Verifikation: `Anwenden`/`anwendenBtn` kommen nur noch in erklärenden
Kommentaren vor (kein Button-Code mehr). `node --check` sauber auf
`karte.js`, `app.js`, `archivalienRegistry.js`.

---

## 2026-09-16 (60) – Karte: Unsicherheiten-Sidebar, Zeitregler, unverortbare Urkunden ausblenden

Datei: `js/viz/karte.js` (vollständig überarbeitet).

**Root-Cause-Fund (Voraussetzung für Punkt 2):** die bisherige `resize()`
löste bei `options.showUncertainty`-Änderungen NUR `karte.invalidateSize()`
aus, nie einen echten Redraw (`zeichneKarte()`) - der app-weite
"Unsicherheiten anzeigen"-Button hatte dadurch auf dieses Modul bislang
NIE eine sichtbare Wirkung, obwohl der Info-Text bereits einen gestrichelten
Rand für unsichere Orte versprach. Behoben: `resize()` löst jetzt auch bei
`'showUncertainty' in neueOptionen` einen vollen Redraw aus - ohne diesen Fix
hätte Punkt 2 gar nicht funktionieren können.

**Punkt 1 (unverortbare Urkunden ausblenden):** `baueNichtVerortbarPanel()`
ersatzlos entfernt, `baueOrtsAggregation()` sammelt nicht auflösbare Records
nicht mehr. Live bestätigt: Panel verschwunden, Karte nutzt die freigewordene
Höhe vollständig.

**Punkt 2 (Unsicherheiten-Toggle → Filter + Sidebar):** `options.
showUncertainty` filtert jetzt auf Orte mit `unsicherAnzahl > 0` und öffnet
automatisch eine Sidebar (generisches Gerüst aus sidebar.js wiederverwendet,
eigene Orte→Urkunden-Gruppierung geschrieben, da die bestehenden Urkunden-
spezifischen Sidebar-Bausteine keine Gruppierung nach Ort kennen). Live
bestätigt: 68 unsichere Urkunden (exakt wie vorab verifiziert) betreffen 86
EINDEUTIGE Orte (mehrfach genannte Orte über mehrere unsichere Urkunden
hinweg bzw. Urkunden mit mehreren Orten) - Sidebar-Titel "Orte mit unsicherer
Identifizierung (86)" korrekt, je Ort die vollständige Urkundenliste
(Signatur – Datum), unsichere Einträge zusätzlich rot markiert. Live per
unabhängigem Node-/Browser-Skript gegengeprüft (identisches Ergebnis über
zwei verschiedene Berechnungswege).

**Punkt 3 (Zeitregler):** Dual-Handle-Regler 1:1 nach kalenderHeatmap.js'
bereits etabliertem Muster (zwei überlappende native `<input type="range">`,
10-Jahres-Schritte, Filter erst bei "Anwenden" aktiv) - hier lokal in
karte.js neu geschrieben (Nicht-Ziel: keine Änderung an kalenderHeatmap.js,
dessen eigene Regler-Bau-Funktion ist ohnehin nicht exportiert). Live
bestätigt: Zeitraum 1400-1459 reduziert die Anzeige von 233 auf 116 Orte -
unabhängig per Browser-Skript exakt nachgerechnet (116/232), deckt sich.

**Punkt 4 (gegenseitiger Ausschluss) - ARCHITEKTUR-EINSCHRÄNKUNG, siehe
Dateikopf-Kommentar für die volle Herleitung:** der "Unsicherheiten
anzeigen"-Button lebt in app.js' eigenem, von karte.js nicht erreichbarem
Container (`unsicherheitsContainer`, getrennt von `vizContainer`) - ein
direkter Rückkanal, um den externen Button selbst umzuschalten, existiert
nicht (state.js' `setUnsicherheitModus()` wäre zwar aufrufbar, würde aber
die Button-eigene Beschriftung/`aria-pressed` nicht synchron mithalten und
einen sichtbar falschen Zustand erzeugen). Der Ausschluss ist deshalb
PRÄVENTIV statt reaktiv umgesetzt: der Zeitregler wird disabled + optisch
ausgegraut (mit sichtbarem Hinweistext) UND auf die volle Spanne
zurückgesetzt, sobald `options.showUncertainty` aktiv ist - dadurch kann der
Zeitregler während des Unsicherheiten-Modus gar nicht erst bedient werden,
die umgekehrte Richtung ("Zeitregler aktiviert → Button schaltet sich ab")
ist dadurch gar nicht erst erreichbar. Live bestätigt: beide Slider-Inputs
und "Anwenden" tragen `disabled=true`, sobald der Unsicherheiten-Modus aktiv
ist; Deaktivieren gibt den Regler sofort wieder frei.

**Platzierung des Zeitreglers:** Auftrag wollte ihn "neben dem
Unsicherheiten-Button" - wegen der oben beschriebenen Container-Trennung
technisch nicht wörtlich umsetzbar (externer Button in fremder DOM-Region) -
stattdessen in der eigenen Werkzeugleiste von karte.js platziert, links vom
(ebenfalls lokalen) Info-Button.

**Punkt 5 (Info-Text):** dritter Absatz VORSCHLAGSWEISE ergänzt (Auftrag,
wörtlich "Vorschlag machen, ich gebe frei" - noch NICHT freigegeben, siehe
Selbstauskunft im Chat): "Urkunden ohne erkennbaren Ort werden hier nicht
dargestellt. Der Zeitregler grenzt die Karte auf einen Jahrzehnt-Zeitraum
ein; „Unsicherheiten anzeigen" blendet stattdessen ausschließlich Orte mit
unsicherer Identifizierung ein (mit Liste in der Seitenleiste) – beide
lassen sich nicht gleichzeitig nutzen."

Testmethodik: bekanntes Python-http.server-Cache-Problem (siehe frühere
Einträge) trat wieder auf - Cache-Bust-Marker `?vkarte=1` vorübergehend auf
`index.html`, `app.js` (Import von archivalienRegistry.js) und
archivalienRegistry.js' `karte`-Eintrag gesetzt, nach erfolgreicher Live-
Verifikation vollständig zurückgesetzt (grep bestätigt: keine Datei enthält
noch `vkarte`).

grep-Verifikation: keine verbliebene Referenz auf `baueNichtVerortbarPanel`/
`PANEL_HOEHE` im Code (nur eine erklärende Erwähnung im Dateikopf-Kommentar).
`node --check` sauber auf `karte.js`, `app.js`, `archivalienRegistry.js`.

---

## 2026-09-16 (59) – Neuer Bereichs-Tab "Orte" + Umzug der drei Karten-Module

Datei: `js/config/archivalienRegistry.js` (neuer Bereich `orte`, drei
Einträge von `urkunden.ansichten` verschoben). Keine Änderung an
`karte.js`/`verbindungskarte.js`/`bipartiteFlowMap.js` selbst (`id`/
`modulPfad` unverändert) und keine Änderung an `vizIcons.js` (alle drei
Icons - `karte`, `verbindungskarte`, `bipartiteFlowMap` - existierten
bereits, geprüft statt neu angelegt, wie im Auftrag vorgesehen).

**Punkt 1 (neuer Bereichs-Tab):** fünfter Eintrag in `ARCHIVALIENTYPEN`
(`typ: 'orte'`, `label: 'Orte'`, `datenDatei: 'data/urkunden.csv'` -
dieselbe Quelle wie zuvor, `primaeransicht: 'karte'`, `hatGalerie: true`) -
KEINE neue Implementierung nötig: `bereichsLeiste.js` iteriert bereits
generisch über `ARCHIVALIENTYPEN.forEach(...)` (kein Code kennt einen
Bereichsnamen wörtlich), app.js' `renderVisualisierungenTab()`/Galerie-/
Flyout-Logik löst den Archivalientyp ebenso generisch über
`ARCHIVALIENTYPEN.find((a) => a.typ === route.segmente[0])` auf - ein
fünfter Registry-Eintrag genügte. Live bestätigt: "Orte" erscheint als
fünfte Pille in der Bereichs-Leiste, Hover zeigt den Flyout mit "Übersicht/
Karte/Verbindungskarte/Bipartite Flow Map" (identisches Muster wie bei den
vier bestehenden Bereichen).

**Punkt 2 (drei Module umgezogen):** `karte`/`verbindungskarte`/
`bipartiteFlowMap` aus `urkunden.ansichten` entfernt, unter
`orte.ansichten` neu registriert, `id`/`modulPfad` unverändert. Kachel-
Texte für Karte/Verbindungskarte wörtlich aus dem Auftrag übernommen
(identisch zu den bisherigen); bei Bipartite Flow Map die geänderte
Formulierung vor Übernahme gegen den tatsächlichen Info-Button-Text des
Moduls geprüft - deckt sich exakt ("Diese Ansicht zeigt, welche Orte mit
welchen thematischen Kategorien in Verbindung stehen...").

**Live-Verifikation:**
- Urkunden-Galerie: **13 Kacheln** (vorher 16) - `document.querySelectorAll('.visualisierungs-galerie li')` bestätigt, die drei Karten-Module fehlen.
- Orte-Galerie: **3 Kacheln** mit korrekten Texten/Icons.
- Direktlinks geprüft: `#visualisierungen/orte/karte` (Leaflet-Karte mit Markern, "Nicht verortbare Urkunden"-Liste), `#visualisierungen/orte/verbindungskarte` (Leaflet-Karte), `#visualisierungen/orte/bipartiteFlowMap` (`aria-label` "Bipartite Flow Map: Orte zu Kategorien", Leaflet-Container vorhanden) - alle drei rendern fehlerfrei, keine Konsolenfehler (ein wiederkehrender, nicht mit dieser Änderung zusammenhängender 404 auf eine unbenannte Ressource - vermutlich Favicon - bereits vor diesem Auftrag beobachtet, nicht Teil dieser Änderung).
- Klick auf die bereits aktive "Orte"-Pille navigiert nicht weg (bestehendes Verhalten für `hatGalerie`-Bereiche, unverändert).

Nicht-Ziele eingehalten: keine inhaltliche Änderung an den drei Modulen,
keine Änderung an den übrigen 13 Urkunden-Modulen (nur Entfernung aus dem
Array, kein Dateiinhalt berührt).

grep-Verifikation: `typ: 'orte'` kommt genau einmal vor;
`id: 'karte'`/`id: 'verbindungskarte'`/`id: 'bipartiteFlowMap'` kommen
jeweils genau einmal vor (unter `orte.ansichten`, keine Reste unter
`urkunden.ansichten`). `node --check` sauber.

---

## 2026-09-16 (58) – Chord-Diagramm: Zählung pro Urkunde statt pro Personenpaar

Datei: `js/viz/chordDiagramm.js`.

**Hintergrund/Root Cause** (siehe Diagnose im Chat, zwei vorangegangene
Runden): die bisherige Zählweise summierte `paar.anzahl` über alle
PERSONENPAARE - eine Urkunde mit k gemeinsam genannten Personen erzeugt
kombinatorisch C(k,2) Paare, jedes zählte einzeln. Eine einzelne vielpersonige
Urkunde trug dadurch überproportional viele "Verbindungen" bei (Bürgertum-
Zeilensumme lag zuletzt bei 4.066 - weit über der Anzahl tatsächlicher
Urkunden).

**Korrektur:** `baueGruppenMatrix()` (arbeitete auf `urkundenPersonen.js`'
personenpaar-Liste `paare`, importiert via `baueKoNennungsNetzwerk()`)
ERSETZT durch `baueGruppenMatrixProUrkunde()` - iteriert direkt über die
Urkunden-Records (`ermittlePersonenDerUrkunde()`), ermittelt je Urkunde die
Menge der vorkommenden Gruppen (mit Personenzahl je Gruppe) und erhöht jede
betroffene Matrixzelle um GENAU 1 - unabhängig von der Personenzahl
dahinter. Diagonale (gruppeninterne Beziehung) nur, wenn mindestens ZWEI
eindeutige Personen derselben Gruppe in derselben Urkunde vorkommen (Auftrag,
wörtlich). `ermittleGruppeProKnoten()` (Personen-Knoten-Klassifikation für
die alte Matrix) entfällt ersatzlos - die neue Funktion klassifiziert direkt
pro Urkunde. Nicht-Ziel eingehalten: `ermittleGruppe()` (die Gruppenzuordnungs-
Logik selbst) unverändert.

**Neue Zeilensummen** (live doppelt verifiziert - im Browser gegen die
tatsächlich geladenen Records UND unabhängig per Node-Skript, beide
identisch):

| Gruppe | Zeilensumme (vorher) | Zeilensumme (jetzt) |
|---|---|---|
| Dynastie | 338 | **200** |
| Adel | 255 | **97** |
| Klerus | 178 | **61** |
| Bürgertum | 4.066 | **603** |

**Akzeptanzkriterium/Plausibilitätsgrenze:** aktiv geprüft, nicht nur
behauptet - `zeichneChordDiagramm()` vergleicht jetzt jede Matrixzelle live
gegen `urkundenRecords.length` (1.069) und würde bei einer Verletzung eine
`console.warn()` ausgeben (kein Rendering-Abbruch). Live bestätigt: KEINE
Warnung ausgelöst, größter Einzelzellenwert ist 385 (Bürgertum intern), alle
vier Zeilensummen (200/97/61/603) liegen deutlich unter 1.069. Wichtige
Klarstellung (siehe Dateikopf-Kommentar): jede EINZELNE Zelle ist
bauartbedingt durch 1.069 begrenzt (eine Urkunde erhöht eine Zelle höchstens
um 1); die ZEILENSUMME ist das nicht zwangsläufig, weil eine Urkunde mit
Personen aus 3+ Gruppen zu mehreren Zellen DERSELBEN Zeile beiträgt - live
geprüft betrifft das nur 13 von 1.069 Urkunden (12 mit drei Gruppen, 1 mit
allen vier), der Effekt bleibt dadurch klein und alle Zeilensummen liegen
klar unter der Grenze.

**Sidebar ohne Duplikate:** live bestätigt (Klick auf "Dynastie ↔ Klerus"
zeigt weiterhin exakt dieselben 4 Urkunden wie vor der Korrektur) - die
`Set`-basierte `recordsProZelle`-Struktur deduplizierte bereits vorher über
Objektreferenz, war von der fehlerhaften Zählweise also nicht betroffen
(nur die numerische Sehnenstärke/Segmentgröße war falsch, nicht die
Sidebar-Liste).

**Beschriftung präzisiert** (Punkt 3, Auftrag wörtlich "damit klar ist, was
gezählt wird"): Segment-Text jetzt `"<Gruppe> (X Urkunden-Verbindungen)"`
statt der mehrdeutigen `"(X)"`-Zahl - bewusst nicht exakt die
Auftrags-Beispielformulierung "X Urkunden mit gruppenübergreifendem
Kontakt" übernommen, weil die Zeilensumme sowohl gruppenübergreifende ALS
AUCH gruppeninterne Beiträge summiert (eine Formulierung, die nur
"gruppenübergreifend" nennt, wäre für den Diagonal-Anteil ungenau) - Hover-
Tooltip zeigt zusätzlich die Aufschlüsselung intern/gesamt. Sehnen-Tooltip
von "X gemeinsame Nennung(en)" auf "X Urkunde(n) mit Personen aus beiden
Gruppen" bzw. "X Urkunde(n) mit mind. zwei Personen aus dieser Gruppe"
geändert (zählt jetzt Urkunden, keine Personenpaare mehr). SVG-`desc` und
ARIA-Texte entsprechend mitgezogen.

grep-Verifikation: `baueGruppenMatrixProUrkunde` hat genau eine Definition
und einen Aufruf, `baueGruppenMatrix`/`baueKoNennungsNetzwerk`/
`ermittleGruppeProKnoten` kommen nur noch in erklärenden Kommentaren vor
(keine Code-Referenz mehr). `node --check` sauber.

---

## 2026-09-16 (57) – Chord-Diagramm: soziale Gruppen (Dynastie/Adel/Klerus/Bürger), Umzug nach Personen

Dateien: `js/viz/chordDiagramm.js` (komplette inhaltliche Neukonzeption, nicht
nur Registry-Umzug), `js/config/archivalienRegistry.js` (Eintrag von
`urkunden.ansichten` nach `personen.ansichten` verschoben, `personen.datenDatei`
um `urkunden: 'data/urkunden.csv'` ergänzt).

**Vorherige Fassung:** Chord-Diagramm der Top-20-EINZELPERSONEN nach
Verbindungsgrad. **Neue Fassung:** vier SOZIALE GRUPPEN (Dynastie/Adel/Klerus/
Bürgertum) als Segmente, Sehnenstärke = Anzahl gemeinsamer Urkunden-Nennungen
zwischen Personen der jeweiligen Gruppen, inkl. Beziehungen innerhalb einer
Gruppe (Selbstschleife). Datenquelle bleibt `urkunden.csv` (Ko-Nennungsnetzwerk
über die bereits bestehende `js/utils/urkundenPersonen.js`), zusätzlich
`familien.csv` für den Dynastie-Abgleich (Punkt 1.1) - der Umzug betrifft nur
die Registry-Zuordnung, nicht die Datenquelle. Technisch gelöst über
archivalienRegistry.js' bereits bestehenden Mehrquellen-Mechanismus
(`datenDatei` als Objekt, siehe `personen`-Eintrag): `urkunden` als dritter
Schlüssel ergänzt, chordDiagramm.js bekommt bewusst KEINEN `datenSchluessel`
und damit das komplette `{familien, personenliste, urkunden}`-Objekt - keine
Änderung an app.js nötig (der bestehende Fallback "ohne datenSchluessel wird
records unverändert durchgereicht" deckt diesen Fall bereits ab).

**Punkt 1 (Gruppenzuordnung, exakt in der vorgegebenen Priorität):**
1. Dynastie: `personen_id` ∈ familien.csv' `id`-Spalte (beide nutzen dieselbe
   Slug-Konvention).
2. Klerus: ganzes Wort (Wortgrenzen-Prüfung, siehe unten) aus der vorgegebenen
   Wortliste.
3. Adel: ganzes Wort aus der Titelliste ODER Teilstring-Treffer auf eine der
   23 recherchierten Adelsfamilien (inkl. aller angegebenen Schreibvarianten).
4. Bürger: Standardfall.

Live gegen `data/urkunden.csv`/`data/familien.csv` verifiziert (Node-Skript
UND zusätzlich im Browser über die tatsächlich von der App geladenen,
geparsten Records, siehe Selbstauskunft im Chat) - **Gruppengrößen (Anzahl
Personennennungen): Dynastie 448, Klerus 64, Adel 120, Bürgertum 1.645**
(Summe 2.277, entspricht der Gesamtzahl aller Personennennungen in
urkunden.csv). Dynastie (448) und Klerus (64) treffen die im Auftrag
vorab ermittelten Zielwerte EXAKT. Adel (120) liegt knapp unter dem
geschätzten Bereich "~130-150" - plausibel erklärbar dadurch, dass die
Dynastie-Priorität (Punkt 1, Regel 1) mehrere titeltragende Habsburger
("Herzog"/"Erzherzog" etc.) bereits VOR der Adels-Prüfung abfängt, wodurch
weniger Titel-Treffer in der Adelsgruppe selbst verbleiben, als eine
Schätzung ohne diese Priorisierung erwarten ließe - siehe Selbstauskunft im
Chat für die volle Zahlenaufschlüsselung (Titel- vs. Familiennamen-Treffer).
Wortgrenzen-Prüfung live bestätigt ("Priorin Elsbeth" löst NICHT zusätzlich
"Prior" aus).

Zwei bewusst getrennte Klassifikations-Ebenen (siehe Dateikopf-Kommentar):
(a) für die Gruppengröße wird JEDE Personennennung einzeln aus den rohen
Records klassifiziert (Auftrag, wörtlich); (b) für die Chord-MATRIX braucht
es eine eindeutige Gruppe pro eindeutiger Person (Knoten) - beide Ebenen
nutzen dieselbe Zuordnungsfunktion, angewendet auf unterschiedliche
Datengranularität.

**Punkt 2 (Diagramm):** vier Segmente, Sehnenstärke wie oben. Farben: eigene,
neue, vier klar unterscheidbare nominale Töne (Dynastie Karminrot, Adel
Königsblau, Klerus Violett, Bürgertum Grün) - bewusst NICHT
vermoegensgruppenFarben.js' ordinale Skala (die kodiert eine A-E-Rangfolge,
hier sind die vier Gruppen gleichrangig-nominal).

**Punkt 3 (Interaktion):** Hover/Klick-Hervorhebung nach demselben
etablierten Muster wie sankey.js/bumpChart.js/streamgraph.js
(hoverGruppe/frozenGruppe, `aktualisiereHighlight()` zentral, Klick auf freie
Fläche setzt zurück) - live bestätigt: Hover auf ein Segment hebt dessen vier
Sehnen auf Deckkraft 0,9 an, alle übrigen sechs fallen auf 0,06; Klick friert
ein (`chord-gruppe-eingefroren`-Klasse bestätigt). Klick auf eine Sehne öffnet
die bereits bestehende, VOLL wiederverwendete Urkunden-Sidebar
(`zeigeUrkundenSidebar()`/`baueUrkundenDetailInhalt()` aus sidebar.js, bewusst
nicht nur das generische Gerüst wie in vermoegensschichtung.js - die
zugrundeliegenden Datensätze SIND echte Urkunden-Records) - live bestätigt:
Klick auf "Dynastie ↔ Klerus" (7 gemeinsame Nennungen) öffnet eine Liste von
4 Urkunden mit Signatur/Datum/Kategorien, Klick auf einen Listeneintrag zeigt
die volle Detailansicht inkl. Regest/Personen-Feld, "← Zurück" führt zur
Liste zurück.

**Punkt 4 (Info-Text):** wörtlich übernommen, live im Popover bestätigt -
macht die Heuristik-Natur der Zuordnung unmissverständlich klar (Auftrag,
wörtlich zitiert im Text selbst).

**Galerie:** vierter Personen-Kachel-Eintrag mit dem bereits bestehenden,
unverändert wiederverwendeten `chordDiagramm`-Icon. Live bestätigt: vier
Kacheln in der Personen-Galerie, Chord-Diagramm-Kachel in der
Urkunden-Galerie verschwunden.

**Regressionsprüfung:** Adjazenzmatrix.js (Top 40 Personen) live erneut
gerendert, unverändert - beide teilen sich weiterhin `urkundenPersonen.js`.

grep-Verifikation: `id: 'chordDiagramm'` kommt in archivalienRegistry.js
genau einmal vor (unter `personen.ansichten`), keine verbliebene Referenz
unter `urkunden.ansichten`. `node --check` sauber auf beiden Dateien.

---

## 2026-09-16 (56) – Streamgraph → Bürgerbuch (Wirtschaftssektoren über die Zeit)

Dateien: `js/viz/streamgraph.js` (kompletter Neubau, gleicher Dateiname -
`id`/`modulPfad` unverändert), `js/config/archivalienRegistry.js` (Eintrag
von `urkunden.ansichten` nach `buergerbuch.ansichten` verschoben). Zusätzlich
kleine Kommentar-Korrekturen (keine Verhaltensänderung) in
`js/utils/urkundenZeit.js`, `js/viz/ridgeline.js`, `js/viz/horizonChart.js`,
`js/viz/swimlanes.js` - deren Dateikopf-Kommentare nannten streamgraph.js
bisher als Mitnutzer von urkundenZeit.js bzw. als Beispiel für das "kein
eigener Flex-Wrapper nötig"-Muster; beides stimmt seit diesem Umzug nicht
mehr (streamgraph.js nutzt jetzt buergerbuchZeit.js UND hat jetzt eine
Werkzeugleiste für den Info-Button) - unkorrigiert hätten die Kommentare
künftige Bearbeiter in die Irre geführt. Trellis, Bump Chart und
Personennetzwerk (Nicht-Ziel) unverändert - live regressionsgeprüft:
Ridgeline, Horizon Chart, Swimlanes rendern nach den Kommentar-Korrekturen
unverändert korrekt.

**Punkt 1 (Achsen/Daten):** X-Achse echte Jahresauflösung (1535-1625,
BIN_GROESSE_JAHRE=1 - dieselbe Designentscheidung wie trellis.js, macht beide
Module direkt vergleichbar). Alle 16 Sektoren inkl. "Beruf nicht angegeben"
als Schicht - live bestätigt (16 Pfade, 16 Legendeneinträge). Farben über
`baueSektorFarbSkala()` aus `buergerbuchZeit.js` (identische Funktion wie
trellis.js/bumpChart.js) - live Pixel-für-Pixel gegen trellis.js verglichen:
alle 16 Sektorfarben stimmen exakt überein. Flächensumme = tatsächliche
Eintragszahl je Jahr ist durch die Konstruktion garantiert (jeder
Bürgerbucheintrag hat genau einen Sektor, `gruppiereProBinUndSektor()` zählt
jeden Eintrag in genau eine Zelle) - zusätzlich per Node-Skript gegen die CSV
bestätigt: exakt 1.250 von 2.791 Zeilen ohne Sektor (→ "Beruf nicht
angegeben"), 0 Zeilen ohne auswertbares Jahr.

**Legende** (nicht explizit beauftragt, aber ohne sie wäre die
Hervorhebung aus Punkt 2 nicht sinnvoll nutzbar - eine hervorgehobene Fläche
ohne erkennbare Farbe-zu-Sektor-Zuordnung sagt nichts aus): kompakte
Farblegende in der Kopfzeile, dieselbe "immer sichtbare Identifikation" wie
bumpChart.js' Endbeschriftungen.

**Punkt 2 (Interaktion):** Hover/Klick-Hervorhebung 1:1 nach bumpChart.js'
bereits etablierter Drei-Zustände-Logik (hoverSektor/frozenSektor,
aktualisiereHervorhebung() zentral), hier auf Flächen statt Linien
übertragen. Live bestätigt: Hover hebt die Fläche voll hervor (Deckkraft 1 +
Randlinie), übrige treten zurück (Deckkraft 0,15); Klick friert die
Hervorhebung ein (bleibt nach mouseleave bestehen); Klick auf die freie
Fläche setzt zurück.

**Punkt 3 (Info-Button):** Text 1:1 übernommen, live im Popover bestätigt.

**Galerie:** vierter Bürgerbuch-Kachel-Eintrag mit dem bereits bestehenden,
unverändert wiederverwendeten `streamgraph`-Icon (organisch wellenförmige
Fläche, deckte den Auftrags-Icon-Vorschlag bereits ab) und dem wörtlich
übernommenen Kachel-Text. Live bestätigt: vier Kacheln in der
Bürgerbuch-Galerie, Streamgraph-Kachel in der Urkunden-Galerie verschwunden.

grep-Verifikation: `id: 'streamgraph'` kommt in archivalienRegistry.js genau
einmal vor (unter `buergerbuch.ansichten`), keine verbliebene Referenz unter
`urkunden.ansichten`. `node --check` sauber auf allen sechs Dateien.

---

## 2026-09-16 (55) – Marimekko: fünftes Segment neu benennen und interpretieren

Datei: `js/viz/marimekkoVerlassenschaften.js`.

Hintergrund: nach Rücksprache mit der Quelle (Dietrich, Kapitel VII.III,
S. 39-40) ist geklärt, dass die fehlenden Prozentpunkte zu 100% keine
Datenlücke sind, sondern eine bewusste methodische Entscheidung des Autors -
der Rest entfällt auf "übrige Mobilien" (Textilien, Geschirr, Möbel,
Alltagsgegenstände), die Dietrich bewusst qualitativ statt quantitativ
behandelt (uneinheitliche historische Verbuchung, Beispiel Hauerzubehör mal
als Fahrnis, mal als Handelslager).

**Punkt 1 (Segment umbenennen):** internes Schlüsselwort durchgängig von
`rest` auf `mobilien` umbenannt (Konstanten, Aggregationsfunktion,
Tooltip-/ARIA-Texte, Legende, SVG-`desc`) - nicht nur der sichtbare Text,
damit Code-Kommentare/Bezeichner nicht weiter von "Rest/Lücke" sprechen,
obwohl die Bedeutung jetzt eine andere ist. Sichtbarer Name: "Übrige Mobilien
(Textilien, Geschirr, Möbel u. a.)". Darstellung von grauer SVG-Schraffur
(Datenvisualisierungs-Konvention für "fehlend/Platzhalter") auf eine eigene,
zurückhaltend-neutrale Vollfarbe umgestellt (`#6b7a8f`, gedecktes Blaugrau) -
dieselbe visuelle Behandlung (durchgezogene Fläche, weißer Rand) wie die vier
"harten" Dietrich-Kategorien, damit das Segment wie eine plausible,
eigenständige fünfte Vermögenskomponente wirkt statt wie eine unbekannte/
fehlende Kategorie (Akzeptanzkriterium, wörtlich). `baueRestSchraffur()`
und das zugehörige `<pattern>` dadurch ersatzlos entfernt.

**Punkt 2 (Info-Text):** neuer, zweiabsätziger Text 1:1 übernommen, live im
Popover bestätigt (zwei `<p>`-Absätze, exakt wie geliefert inkl. Hauerzubehör-
Beispiel).

**Nicht-Ziel eingehalten:** die Berechnung selbst (`ermittleGruppenDaten()`)
ist unverändert - das fünfte Segment bleibt weiterhin die Differenz zur
Gruppen-RV-Summe, nur umbenannt. Live per `aria-label`-Abfrage bestätigt: alle
fünf "Übrige Mobilien"-Segmente zeigen exakt dieselben Prozent-/Gulden-Werte
wie vor dieser Änderung (A 26,9%/2.371 fl., B 23,1%/2.460 fl., C 29,8%/3.163 fl.,
D 23,5%/15.937 fl., E 30,6%/17.403 fl.) - keine Abweichung an Spaltenbreiten
oder Segmenthöhen. `node --check` sauber, grep bestätigt keine verbliebenen
Referenzen auf den alten Schlüssel/Namen im Modul.

---

## 2026-09-16 (54) – Marimekko für Verlassenschaften (Vermögensgruppe x Realvermögens-Zusammensetzung)

Dateien: NEU `js/viz/marimekkoVerlassenschaften.js`, `js/config/archivalienRegistry.js`
(vierter Ansicht-Eintrag unter `verlassenschaften`), `js/utils/vizIcons.js`
(ein neues Icon).

**Einschätzung neue Datei vs. Umwidmung (Auftrag bat darum):** `js/viz/marimekko.js`
ist unter `urkunden.ansichten` weiterhin aktiv (Jahrhundert x Kategorie,
Spaltenbreite = live gezählte Urkundenzahl). Das neue Diagramm ist trotz
gleichen Diagrammtyp-Namens strukturell etwas anderes: Spaltenbreite =
RV-Summe (nicht Anzahl), Segmenthöhe = geld-gewichtete Prozent-Zusammensetzung
(nicht Kategorie-Anteil an einer Zählung), plus ein eigenes "Rest"-Segment mit
Schraffur. Eine Umwidmung hätte entweder die bestehende, funktionierende
Urkunden-Ansicht ersatzlos entfernt oder zwei verschiedene Datenmodelle in
einer Datei verschränkt. Neue, eigene Datei war der geringere Aufwand UND das
geringere Risiko (keine Regression an Urkunden) - live gegengeprüft:
`urkunden/marimekko` rendert nach der Änderung unverändert 67 Rects.

**Zahlen:** Auftrag lieferte eine "vorab berechnete, verifizierte" Tabelle
(1:1 zu übernehmen). LIVE gegen `data/verlassenschaftsinventare.csv`
nachgerechnet (Methode: `Realvermoegen_fl` je Person mit ihrem jeweiligen
Anteils-Prozentsatz gewichtet, erst danach über die Gruppe aufsummiert - nicht
der Durchschnitt der Einzelprozente, exakt wie im Auftrag beschrieben) - deckt
sich für alle fünf Gruppen A-E exakt mit der gelieferten Tabelle (Node-Skript
zur Verifikation, siehe Selbstauskunft im Chat). Bewusst NICHT als
hartcodierte Tabelle übernommen, sondern weiterhin LIVE aus den Records
berechnet (`ermittleGruppenDaten()`), derselbe Präzedenzfall wie
vermoegensschichtung.js (Abschnitt 2: archivarische Inhalte ausschließlich aus
`data/*.csv`, nicht im Code verdoppeln). Feldnamen aus
`js/utils/verlassenschaftenFelder.js` wiederverwendet (Single Source of
Truth, bereits von parallelKoordinaten.js/korrelationsmatrix.js genutzt).
Gruppen A*/S bewusst außerhalb der x-Achse (Auftrag, wörtlich: "5 Spalten
A-E"); VI-0004 (Gruppe S, ohne Realvermögen-Werte) robust übersprungen.

**Punkt 1 (Aufbau):** fünf Spalten A-E, Breite live-proportional zur
RV-Summe der Gruppe (D/E live gemessen ~44%/~37% der Gesamtbreite, zusammen
~81%, deckt sich mit der Tabelle). Vier reale Bestandteile in eigenen,
gedeckten Flächenfarben (Grundstücke/Bargeld/Wertgegenstände/Sonderbestand) -
eine neue kleine Farbpalette, bewusst NICHT `vermoegensgruppenFarben.js`'
ordinale Rot-Gelb-Grün-Skala (die kodiert die GRUPPEN-Rangfolge A-E, hier
geht es um vier nominale, gleichrangige Bestandteile). "Sonstige/nicht
erfasste Bestandteile" bekommt eine graue SVG-Schraffur (kein Vollton) -
stärker als reines Grau als Lücke erkennbar, oben in der Spalte (Auftrag,
wörtlich), als Differenz zur RV-Summe berechnet (keine Rundungslücken
zwischen den fünf Segmenten).

**Punkt 2 (Beschriftung):** jede Spalte trägt Gruppenbezeichnung + "n=…"
darunter (live bestätigt: n=15/17/4/16/8, exakt wie Tabelle). Hover zeigt
Bezeichnung, exakten Prozentwert (eine Nachkommastelle, deutsches
Dezimalkomma) und den absoluten Gulden-Betrag - live per Klick auf das
Sonderbestand-Segment der Gruppe D bestätigt: "Sonstige/nicht erfasste
Bestandteile – Gruppe D / 23,5 % / 15.937 fl." Eine Farblegende (nicht
explizit beauftragt, aber ohne sie wäre die Segmentfarbe ohne Hover nicht
decodierbar - dieselbe Begründung wie in parallelKoordinaten.js/
vermoegensschichtung.js) ergänzt die Kopfzeile.

**Punkt 3 (Info-Button):** Text verbatim übernommen, live im Popover
bestätigt.

**Live-Verifikation:** alle 24 erwarteten Segmente (5 Gruppen x 4 reale
Bestandteile, minus Gruppe C's 0,0%-Sonderbestand = korrekt nicht gezeichnet)
per `aria-label`-Abfrage exakt gegen die Tabelle geprüft - jeder Prozentwert
und Gulden-Betrag stimmt. Gallerie-Kachel + neues Icon live bestätigt
(viertes Icon, unterscheidbar vom bestehenden `marimekko`-Icon durch
gestrichelte statt gefüllte oberste Segmente). `node --check` sauber auf
allen drei Dateien.

---

## 2026-09-15 (53) – Bürgerbuch-Trellis: größere Beschriftung, dünner Rahmen je Panel

Datei: `js/viz/trellis.js`.

**Punkt 1 (Beschriftung vergrößern):** Der Auftrag nennt "Sektor-Titel und
Achsenbeschriftungen" - geprüft (Root-Cause-Check vor der Umsetzung): trellis.js
zeichnet bislang KEINE separaten Achsen-Tick-Beschriftungen, nur den
Sektor-Titel und eine unbeschriftete Baseline. Es gab also nichts an
"Achsenbeschriftungen" zu vergrößern, das nicht bereits der Sektor-Titel wäre -
transparent so gemeldet, statt stillschweigend neue Achsenbeschriftungen zu
ergänzen (das wäre ein inhaltlicher Neubau gewesen, über "größere
Beschriftung" hinaus).

`SEKTOR_TITEL_SCHRIFTGROESSE` 11px → **15px** (Faktor ≈1,36, im Auftrag als
Richtwert 1,3-1,4× vorgegeben, identische Konvention zu früheren
Schriftgrößen-Aufträgen, z. B. (32)/(44)). Damit die bei größerer Schrift
schneller drohende Titel-Überlappung/-Abschneidung ausbleibt
(Akzeptanzkriterium, wörtlich), wurde die bisherige feste "30 Zeichen"-
Kürzungsheuristik durch die bereits geteilte, schriftgrößen- und
breitenabhängige Formel aus `js/utils/beschriftung.js` (Auftrag
"Beschriftungs-Kürzung mit Ellipse", bislang von Treemap/Sunburst/Icicle/
Circle-Packing genutzt, hier ein fünftes Mal eingebunden) ersetzt - passt sich
korrekt an die neue Schriftgröße UND die tatsächliche (viewport-abhängige)
Facet-Breite an, statt bei kleineren Bildschirmen zu lang zu werden.
`FACET_INNENRAND.oben` 22→26px, damit der größere Titel genug vertikalen Raum
hat, ohne die Balken/Baseline darunter zu berühren.

**Punkt 2 (dünner Rahmen je Panel):** Jedes der 16 Facets erhält jetzt einen
1px-Rahmen um die gesamte Panelfläche (Titel + Plot), Farbe `var(--border,
#ddd8cf)` - dasselbe bereits etablierte Rahmenfarb-Muster wie in
`sunburst.js`, bewusst kein eigener kräftigerer Ton (Akzeptanzkriterium: "kein
zu kräftiger/dominanter Rahmen").

**Live-Verifikation** (Browser-Pane, Route `#visualisierungen/buergerbuch/
trellis`): 16 Panels gerendert (15 Wirtschaftssektoren + "Beruf nicht
angegeben"), `font-size="15"` auf allen 16 Titel-Texten bestätigt (DOM-Abfrage),
16 Rahmen-Rects mit `stroke="var(--border, #ddd8cf)"` bestätigt (einer pro
Panel), keine gekürzten Titel (`…`) trotz größerer Schrift - auch der längste
Sektorname ("Kunst, Musik & Unterhaltung", 27 Zeichen) passt bei
`MIN_FACET_BREITE`=260px noch vollständig. `node --check` sauber. Vorher/
Nachher-Vergleichsscreenshot im Chat (Vorher testweise per DOM-Manipulation im
selben Browser-Zustand simuliert: Schriftgröße zurück auf 11px, Rahmen
entfernt - danach per hartem Cache-Bust-Reload wieder auf den echten,
gespeicherten Datei-Zustand zurückgesetzt und erneut verifiziert, um
sicherzustellen, dass der "Nachher"-Screenshot tatsächlich vom Datei-Zustand
und nicht vom manipulierten DOM stammt).

---

## 2026-09-15 (52) – Parallelkoordinaten-Anpassung + neue Visualisierung "Vermögensschichtung"

Dateien: `js/viz/parallelKoordinaten.js` (Ergänzung zu (51)), NEU:
`js/viz/vermoegensschichtung.js`, NEU: `js/utils/vermoegensgruppenFarben.js`
(gemeinsame Farblogik, siehe unten), `js/utils/vizIcons.js` (ein neues Icon),
`js/config/archivalienRegistry.js` (dritter Ansicht-Eintrag unter
`verlassenschaften`).

Basierend auf Max Roman Dietrichs Masterarbeitsbefunden - live gegen
data/verlassenschaftsinventare.csv nachgeprüft (siehe Selbstauskunft im Chat
für die vollen Zahlen).

### Teil A - Ergänzungen zu (51)

**A1 (Vermögensgruppe als Standard, ordinale Farbskala):** Neue gemeinsame
Datei `js/utils/vermoegensgruppenFarben.js` - `farbeFuerVermoegensgruppe()`
nutzt `d3.interpolateRdYlGn` über die geordneten Gruppen A-E (Rot->Gelb->Grün),
S/A* bekommen eine neutrale Sonderfarbe (#8a8a8a). BEWUSST NICHT
`kategorieFarben.js`' `baueKategorieFarbSkala()` wiederverwendet - die
verteilt Farbtöne für NOMINALE Kategorien gleichmäßig über den Farbkreis,
A-E ist aber eine echte Rangordnung (Auftrag, wörtlich), eine
Regenbogenverteilung hätte das verschleiert. `A*`-Verifikation (Auftrag
verlangte das ausdrücklich): kommt in der gesamten Tabelle genau einmal vor
(VI-0032, Gesamtvermögen -5 fl., exakt an der A/B-Schwelle von 0 fl.), trägt
keine `unsicherheit_anmerkung` und kein `<feld>_unsicher`-Begleitfeld -
technisch also KEINE Unsicherheitsmarkierung im Sinne des Datenschemas;
docs/SCHEMA.md dokumentiert die Spalte zudem nur als "Text (A-E, S)", ohne
"A*" zu erwähnen. Die exakte Bedeutung des Sternchens bleibt damit offen
(vermutlich ein Grenzfall) - wird wie verlangt trotzdem identisch zu S
behandelt, keine weitergehende Vermutung. Standardfarbe in
parallelKoordinaten.js jetzt "vermoegensgruppe" statt "keine", Legende zeigt
die feste Anzeigereihenfolge A/A*/B/C/D/E/S statt alphabetisch. Live
bestätigt: Standardansicht zeigt die Vermögensgruppen-Farbcodierung mit
erkennbarer Rot-Grün-Rangfolge (Screenshot).

**A2 (Referenzlinien):** Die bisherige einzelne, unbeschriftete Nulllinie bei
Gesamtvermögen ist jetzt eine Liste von vier dezenten, gestrichelten,
beschrifteten Referenzlinien (0/500/1.000/3.000 fl. = A/B-, B/C-, C/D-,
D/E-Grenze). Live bestätigt: alle vier Linien mit Beschriftung sichtbar
(Screenshot).

**A3 (Info-Text):** Der gelieferte Quellen-/Bias-Satz wurde als zweiter
Absatz an INFO_TEXT angehängt (durch Leerzeile getrennt, wird von
infoButton.js automatisch als eigener `<p>` dargestellt). Live im Popover
bestätigt.

### Teil B - Neue Visualisierung "Vermögensschichtung"

Drei nebeneinanderstehende Kleinmultiples-Balkendiagramme (eines je
Jahrzehnt: 1671-1679/1690-1699/1710-1719), X-Achse Vermögensgruppe in der
festen Reihenfolge A/A*/B/C/D/E/S, Y-Achse Anzahl mit GEMEINSAMER Skala über
alle drei Panels (`d3.max` über alle Panel-Rohdaten VOR dem Skalenaufbau).
Balkenfarbe: dieselbe ordinale Skala wie Teil A1 (aus der neuen gemeinsamen
Datei importiert, nicht dupliziert).

**Zahlen bewusst NICHT hartcodiert:** die im Auftrag als "vorab verifiziert,
1:1 zu übernehmen" gelieferte Tabelle wurde live aus der CSV nachgerechnet
(`d3.rollup`-artige Gruppierung in `ermittleGruppierteDaten()`) - deckt sich
exakt mit der Auftragstabelle. Abschnitt 2 verlangt archivarische Inhalte
ausschließlich aus data/*.csv, nicht im Code verdoppelt - die Live-Berechnung
IST die verifizierte Tabelle, nur ohne Duplizierung; bleibt dadurch außerdem
automatisch korrekt, falls sich die CSV künftig ändert.

**Punkt 2 (Aufteilen nach Ort/Geschlecht):** Button-Gruppe "Keine/Ort/
Geschlecht", bei aktiver Aufteilung werden die Balken gestapelt. Die
Unterkategorie-Kennzeichnung variiert bewusst NICHT den Farbton (würde mit
der Vermögensgruppen-Rot-Grün-Kodierung der Balken selbst konkurrieren),
sondern nur die Deckkraft derselben Gruppenfarbe (SEGMENT_OPAZITAETEN) - die
Balkenfarbe bleibt dadurch immer eindeutig der Vermögensgruppe zuordenbar,
auch gestapelt. "(geschätzt)" bei Ort in der Legende ergänzt, bei Geschlecht
bereits im CSV-Rohwert enthalten (dieselbe Konvention wie in (51)).

Live-Verifikation von Dietrichs Kernbefund (Auftrag, wörtlich: "Stein
nahezu ausschließlich in A/B" im ersten Jahrzehnt): Aufteilung nach Ort
zeigt für 1671-1679 exakt 5 Stein-Inventare in Gruppe A und 4 in Gruppe B,
NULL in C/D/E/S (Screenshot + `aria-label`-Auswertung der Balken-Segmente
bestätigen das direkt).

**Punkt 3 (Hover/Klick):** Hover zeigt Tooltip mit exakter Anzahl (und bei
aktiver Aufteilung der Unterkategorie). Klick öffnet die Detailliste der
betroffenen Personen (Name, Beruf, Realvermögen) - eigene, schlanke
Listendarstellung (`baueListeInhalt()`), NICHT `sidebar.js`' Urkunden-
spezifische `zeigeUrkundenListe()`/`baueUrkundenListeInhalt()` (die sind an
Urkunden-Felder wie signatur/regest gebunden) - wiederverwendet wird nur das
generische Gerüst (`baueSidebarGeruest()`/`fuegeSidebarStyleEin()`). Live
bestätigt: Klick auf "Vermögensgruppe A, 1671-1679, Stein" öffnet eine Liste
mit exakt den 5 erwarteten Personen samt Beruf/Realvermögen.

**Punkt 4 (Info-Text) + Icon:** Info-Text wörtlich übernommen, live im
Popover bestätigt. Icon-Vorschlag ("drei Gruppen gestapelter Rechtecke
unterschiedlicher Höhe") direkt in `vizIcons.js` umgesetzt und in der
Verlassenschaften-Galerie live bestätigt (dritte Kachel neben
Parallelkoordinaten/Korrelationsmatrix).

**Registry:** `beschreibung` für den neuen Eintrag SELBST verfasst (der
Auftrag lieferte dafür keinen Kachel-Text) - gegen den tatsächlichen
Info-Button-Text des neuen Moduls geprüft, wie bei früheren
selbst-verfassten Texten (z.B. bubbleChart in (Personen-Auftrag)).

Verifikationsmethodik: `node --check` auf allen sieben berührten/neuen
Dateien bestanden. Grep bestätigt konsistente Referenzen auf
"vermoegensschichtung" in genau den vier erwarteten Dateien (Registry,
Icons, Modul selbst, gemeinsame Farb-Datei-Kommentar), keine verbliebenen
Cache-Bust-Marker (`?vvs=1`, testweise auf der gesamten betroffenen
Import-Kette gesetzt - `index.html`, `app.js`' Importe von
`archivalienRegistry.js`/`visualisierungsGalerie.js`/`visualisierungsTabs.js`,
deren jeweiliger `vizIcons.js`-Import, sowie die beiden `modulPfad`-Werte in
der Registry - nach dem Test wieder vollständig entfernt). Korrelationsmatrix
live regressionsgeprüft: unverändert 64 Zellen, unberührt von diesem Auftrag.

---

## 2026-09-15 (51) – Parallelkoordinaten neu konzipiert (Verlassenschaften)

Datei: `js/viz/parallelKoordinaten.js` (kompletter Neuaufbau, einzige
geänderte Datei - `korrelationsmatrix.js`/`verlassenschaftenFelder.js`
bewusst unverändert, siehe unten).

Ersetzt die 8-Achsen-Fassung aus (49) vollständig nach einem extern
erarbeiteten, gegen die echten Daten verifizierten Konzept.

**Punkt 1 (Vermögensprofil):** Sechs feste Achsen (Realvermögen - jetzt
LOGARITHMISCH statt linear wie in (49), vier Anteils-Achsen fest auf 0-100%
statt datengetrieben, Gesamtvermögen - symlog mit neu hinzugekommener,
sichtbar hervorgehobener Nulllinie). Gruppenbeschriftung "Ausgewählte
Anteile am Realvermögen" über den vier Anteils-Achsen - live gegengeprüft:
Summe der vier Anteile hat Median 73,5 %, Maximum 104,2 % (exakt die im
Auftrag genannten Werte, unabhängig in Node nachgerechnet), summiert sich
also tatsächlich NICHT auf 100 %.

**Punkt 2 (Hervorhebung):** Hover/Klick-Fixierungs-Muster 1:1 von
sankey.js' `aktualisiereHighlight()` übernommen (`instanz.auswahl` fixiert,
hat Vorrang vor `instanz.hover`, Klick auf dieselbe fixierte Linie löst sie
wieder, Klick auf freie Fläche/Escape ebenso). Standardfarbe aller Linien
jetzt neutral-grau (`#9a9a9a`), Hervorhebung ohne aktive Farbcodierung
verwendet `var(--accent)` (per CSS-Klasse, nicht als SVG-Attribut - siehe
unten). Sidebar (wiederverwendet aus (49)/js/utils/sidebar.js) zeigt bei
Fixierung Name, Beruf, Ort, Jahr sowie alle Achsen der jeweils aktiven
Ansicht mit Einheit (fl./%). Live verifiziert: Hover hebt hervor
(Opazität 0,95 vs. 0,06 für alle anderen), bleibt nach Fixierung ohne Maus
bestehen, Klick auf freie Fläche/Escape setzt zurück.

**Punkt 3 (Farbcodierung):** Vier umschaltbare Felder (Geschlecht/Ort/
Jahrzehnt/Vermögensgruppe), Standardzustand "keine" (alle grau) - Klick auf
den bereits aktiven Farbknopf schaltet zurück auf "keine" (Toggle, kein
eigener fünfter Knopf nötig). "(geschätzt)" bei Ort in der Legende ergänzt
(Rohwert trägt es dort nicht, anders als Geschlecht, dessen CSV-Werte
bereits wörtlich "maennlich (geschaetzt)"/"weiblich (geschaetzt)" lauten -
live verifiziert für beide Fälle).

**Punkt 4 (bewusste Kehrtwende gegenüber (49)):** VI-0004 (Nicolaus
Grollickh) wird nach diesem Auftrag OHNE jeden Hinweistext ausgeschlossen -
(49) zeigte dort noch einen expliziten "1 von 68..."-Hinweis, dieser Auftrag
verlangt wörtlich das Gegenteil. Live verifiziert: 67 Linien, keinerlei
Text zur Zahl 67/68 mehr im DOM.

**Punkt 5 (Forderungs-/Schuldenprofil):** Zweite, umschaltbare Achsenfolge
(Realvermögen, SchzG an Aktiva, SchvG an Aktiva, Gesamtvermögen) - SchzG/
SchvG jetzt erstmals mit gesicherter Bedeutung ("Schulden zum Gut"/"Schulden
vom Gut", vom Auftrag geliefert - anders als in (49)/(50), wo beide mangels
Kenntnis bewusst unaufgelöst blieben). SchvG bekommt eine eigene,
datengetriebene Skala bis zu ihrem tatsächlichen Maximum - live berechnet
(nicht hart codiert): 780,49 %, als Fußnote sichtbar gekennzeichnet
("stark gestreckt").

**Punkt 6 (Info-Text):** Vorschlag wörtlich wie im Auftrag geliefert
übernommen, live im Popover bestätigt.

**Selbst gefundener Bug (Achsentitel abgeschnitten):** Erster Live-Test mit
knappem rechten Rand (RAND.rechts=34, aus (49) übernommen) schnitt den
neuen, längeren Titel der letzten Achse ("Gesamtvermögen (fl.)") am rechten
SVG-Rand ab (`getBoundingClientRect()` bestätigte das). Behoben durch
RAND.rechts=90.

**Bekannte, nicht neu eingeführte Einschränkung (Erst-Render-Breite):** Bei
sehr schnell aufeinanderfolgendem Fenster-Resize + Navigation kann die
anfängliche `container.clientWidth`-Messung (wie bei jedem Modul, das
`js/utils/viewportGroesse.js`' Muster nutzt, siehe dortiger Kommentar "beim
allerersten Aufbau, bevor der Browser einen Reflow durchgeführt hat") einen
zu kleinen Zwischenwert liefern - korrigiert sich automatisch über app.js'
zentralen, bereits bestehenden Resize-Handler (live geprüft:
`window.dispatchEvent(new Event('resize'))` stellt die korrekte Breite
sofort wieder her). Kein neues, durch diesen Auftrag eingeführtes Problem,
sondern dieselbe app-weite Charakteristik wie bei allen anderen
breiten-messenden Modulen.

**Bewusst unverändert:** `korrelationsmatrix.js` und
`verlassenschaftenFelder.js` (Nicht-Ziel: "Betroffene Dateien:
parallelKoordinaten.js") - die Achsen-/Label-/Skalentyp-Definitionen dieses
Auftrags leben deshalb LOKAL in `parallelKoordinaten.js`, nicht im
geteilten Utility (die beiden Module haben seit diesem Auftrag
unterschiedliche Achsensätze/Skalentypen für dieselben Felder - z.B.
Realvermögen jetzt log hier, weiterhin linear dort - eine gemeinsame
Definition wäre nicht mehr zutreffend). `parseKommaZahl` bleibt geteilt
(reine Zahl-Parsing-Hilfsfunktion, unverändert zutreffend für beide).
Korrelationsmatrix live regressionsgeprüft: weiterhin 64 Zellen, unverändert
funktionsfähig.

Verifikationsmethodik: `node --check` bestanden. Grep bestätigt keine
verbliebenen Cache-Bust-Marker (`?vpk=1`/`?vpk=2`, testweise auf
`index.html`s Script-Tag, `app.js`' Import von `archivalienRegistry.js` und
dessen `parallelKoordinaten`-`modulPfad` gesetzt, nach dem Test entfernt).

---

## 2026-09-15 (50) – Galerie-Seite für Verlassenschaften

Datei: `js/config/archivalienRegistry.js` (einzige geänderte Datei - siehe
unten, warum `js/utils/vizIcons.js` entgegen der ursprünglichen Erwartung
NICHT geändert werden musste).

`hatGalerie: true` bei `verlassenschaften` ergänzt (löst die in (49) noch
bewusst getroffene Gegenentscheidung "kein hatGalerie" ab - dort war eine
Galerie für nur zwei Ansichten nicht verlangt, jetzt ausdrücklich beauftragt)
+ `beschreibung`-Feld bei beiden Ansichten mit den gelieferten Texten (gegen
die tatsächlichen Modul-Inhalte geprüft, wie bei urkunden/Bestand/Bürgerbuch -
beide trafen es genau, keine Korrektur nötig). Reine Registry-Erweiterung:
die Galerie/Flyout-Logik in app.js ist seit dem Bürgerbuch/Personen-Auftrag
vollständig generisch (kein Code kennt "verlassenschaften" namentlich) und
greift hier unverändert, ohne app.js selbst anzufassen.

**Icons bereits vorhanden, keine Änderung nötig:** `js/utils/vizIcons.js`
hatte für `parallelKoordinaten` (kreuzende Diagonalen zwischen vier vertikalen
Achsen) und `korrelationsmatrix` (Raster mit unterschiedlich großen Kreisen)
bereits Einträge - Überbleibsel aus der Zeit, als beide Module noch unter
`urkunden.ansichten` liefen (vor (49)). Beide entsprechen inhaltlich fast
exakt den im Auftrag vorgeschlagenen Motiven und lagen seit dem Umzug in (49)
einfach ungenutzt da (keine Galerie, kein Icon-Rendering für Verlassenschaften).
Live bestätigt: beide Icons erscheinen korrekt auf den neuen Kacheln.

Live-Verifikation (alle im Screenshot/Chat dokumentiert):
- `#visualisierungen/verlassenschaften` zeigt jetzt die Galerie mit genau 2
  Kacheln (Icon, Name, Text), Hash bleibt beim Aufruf ohne Ansicht-Segment auf
  der Galerie stehen (kein automatischer Sprung zur Primäransicht mehr - das
  ist das erwartete, bereits bei den anderen Galerie-Bereichen etablierte
  Verhalten von `hatGalerie: true`).
- Klick auf eine Kachel öffnet die jeweilige Visualisierung
  (`#visualisierungen/verlassenschaften/parallelKoordinaten`, 67 Linien
  gerendert).
- Aktiver Bereichs-Tab-Flyout (Klick auf "Verlassenschaften" während bereits
  dort): zeigt korrekt "Übersicht" + "Parallelkoordinaten" + "Korrelationsmatrix"
  (die "Übersicht"-Option erscheint erst jetzt mit `hatGalerie: true`, siehe
  app.js' `baueVizVorschauTabs()`), Klick auf "Übersicht" navigiert zurück zur
  Galerie.
- Hover-Flyout auf den INAKTIVEN "Verlassenschaften"-Tab von einer anderen
  Seite aus (getestet von `#visualisierungen/buergerbuch/trellis`): öffnet
  dieselbe Drei-Einträge-Liste, `location.hash` bleibt währenddessen
  unverändert (reines Hover) - funktioniert wie in den anderen Bereichen.
- Direktlink `#visualisierungen/verlassenschaften/korrelationsmatrix` weiterhin
  funktionsfähig (64 Zellen gerendert, kein Umweg über die Galerie nötig).

Verifikationsmethodik: `node --check` bestanden. Grep bestätigt keine
verbliebenen Cache-Bust-Marker (`?vgv=1`, testweise auf `index.html`s
Script-Tag und `app.js`' Import von `archivalienRegistry.js` gesetzt, nach
dem Test entfernt).

---

## 2026-09-15 (49) – Parallelkoordinaten & Korrelationsmatrix → Verlassenschaften

Dateien: `js/viz/parallelKoordinaten.js` (grundlegend umgebaut), `js/viz/korrelationsmatrix.js`
(grundlegend umgebaut), `js/utils/verlassenschaftenFelder.js` (neu, gemeinsame
Feld-/Skalentyp-Definition beider Module), `js/config/archivalienRegistry.js`
(beide Ansichten von `urkunden` nach `verlassenschaften` umgehängt, Platzhalter
entfernt), `js/viz/verlassenschaftenPlatzhalter.js` (gelöscht, dadurch
unreferenziert).

**Grund des Umzugs:** Beide Module liefen bisher auf `urkunden.csv`, die dafür
strukturell ungeeignet ist (keine mehreren kontinuierlichen Zahlenwerte je
Datensatz). `verlassenschaftsinventare.csv` passt inhaltlich: 67 von 68
Datensätzen mit vollständigen Vermögenswerten (live verifiziert: VI-0004 fehlen
alle acht Werte, sonst niemandem).

**Punkt 1 (Parallelkoordinaten):** Acht Achsen (Realvermögen, Gesamtvermögen,
sechs Anteilswerte in %) statt der bisherigen vier. Gesamtvermögen-Achse
symlog-skaliert (`d3.scaleSymlog()`) statt linear/log - live verifiziert: 20
von 67 Personen haben negatives Gesamtvermögen, eine reine log-Skala hätte dort
versagt. Farbe: Vermögensgruppe (Standard) oder Geschlecht (Schätzung),
umschaltbar per Button (Auftrag nannte das als optionalen Plus-Punkt) -
Farbskala über das bereits etablierte `kategorieFarben.js`'
`baueKategorieFarbSkala()` erzeugt, keine neue ad-hoc-Farblogik. VI-0004 (der
einzige unvollständige Datensatz) wird NICHT stillschweigend fallengelassen:
als knapper Hinweistext oberhalb des Diagramms genannt (Name+ID), dann aus den
67 gezeichneten Linien ausgelassen - bewusst kein eigener Sammelbereich wie
beim urkunden-Vorbild dieser Datei (unverhältnismäßig für exakt einen
betroffenen Datensatz). Klick auf eine Linie öffnet die Detailansicht der
Person (Name, Beruf, Jahrzehnt, Ort) über `js/utils/sidebar.js`' generische,
bereits etablierte `baueSidebarGeruest()`/`oeffneSidebar()` - zum ersten Mal für
einen anderen Archivalientyp als Bestandsverzeichnis genutzt.

Live-Verifikation: 67 Linien sichtbar (`document.querySelectorAll('.verlassenschaft-linie').length
=== 67`), alle 8 Achsen korrekt beschriftet und skaliert (Gesamtvermögen-Achse
zeigt live sichtbar ungleichmäßige Tick-Abstände, charakteristisch für symlog),
Farbumschalter getestet (Legende/Linienfarben wechseln korrekt zwischen
Vermögensgruppe und Geschlecht), Klick auf eine Linie öffnet die Sidebar mit
korrektem Namen als Titel und den drei verlangten Feldern (Beruf/Jahrzehnt/Ort).

**Selbst gefundener Bug (Höhen-Budget):** Erster Live-Test zeigte den Plot auf
einen Bruchteil der eigentlich verfügbaren Höhe zusammengefallen (viel
Leerraum unter dem Diagramm). Ursache: das Höhen-Budget wurde von der
`clientHeight` des LOKALEN Kind-Containers gemessen statt vom eigentlichen
`.viz-inhalt`-Element mit echter Grid-Layout-Höhe - ein `<div>` ohne eigene
CSS-Höhe bezieht seine `clientHeight` zum Messzeitpunkt nur aus seinem
BISHERIGEN Inhalt (hier: der eben erst angehängten Kopfzeile selbst), nicht
aus dem verfügbaren Platz. Behoben: Messung jetzt explizit an `instanz.container`
(dem äußeren, vom Aufrufer übergebenen Element) statt am lokalen Kind-Container.

**Punkt 2 (Korrelationsmatrix):** Spearman-Rangkorrelation (Pearson der RÄNGE,
mit Durchschnittsrang bei Bindungen) statt Pearson - Auftrag, wegen kleiner
Stichprobe (67) und bekannter Ausreißer (live verifiziert: `Anteil SchvG an
Aktiva (%)` erreicht bei einer Person 780,49 %). Unabhängig in Node
nachgerechnet (siehe Selbstauskunft im Chat): SchzG×SchvG ergibt r=-0.5724,
rundet exakt auf die live in der UI gezeigten -0,57 - Implementierung
bestätigt korrekt. Klick auf eine Zelle öffnet ein Streudiagramm der beiden
Variablen (neu, eigenes schlankes Overlay nach demselben Singleton-Muster wie
`js/utils/lightbox.js`, aber bewusst NICHT dorthin ausgelagert - nur ein
Aufrufer, verfrühte Abstraktion vermieden). Achsenbeschriftung mit vollen
Feldnamen (z. B. "Anteil Grundstücke am Realvermögen (%)" statt der reinen
CSV-Kürzel) - SchzG/SchvG bleiben bewusst unaufgelöst, siehe Punkt 3.

Live-Verifikation: 64 Zellen (8×8), Legende nennt "Spearman-Rangkorrelation"
explizit, Diagonale zeigt korrekt r=1,00, Klick auf eine Zelle öffnet das
Streudiagramm mit 67 Punkten und identischem r/N wie die Zellen-Tooltip-Anzeige,
Escape schließt das Overlay, Fehlende-Werte-Fall bestätigt: da VI-0004 ALLEN
acht Kennzahlen gleichermaßen fehlt (nicht nur einzelnen), zeigt jede Zelle
einheitlich N=67 (keine unterschiedlichen N je Feldpaar) - ein zunächst im
Code-Kommentar vermuteter Wert von N=66 wurde dadurch live widerlegt und
korrigiert.

**Selbst gefundener Bug (abgeschnittene Achsentitel):** Die vollen Feldnamen
sind deutlich länger als die bisherigen fünf kurzen Kennzahlen-Labels der
urkunden-Vorgängerversion - mit deren altem Rand (`oben: 140, links: 190`)
wären die schräg gestellten Spaltentitel oben bzw. die Zeilentitel links am
SVG-Rand abgeschnitten worden. Vor dem ersten Live-Test bereits erkannt und
behoben (`oben: 240, links: 300`), live bestätigt: alle acht Labels
vollständig lesbar, keine Abschneidung.

**Zweite, selbst gefundene Korrektur (Tooltip hinter Overlay verdeckt):** Beim
ersten Entwurf lag das neue Streudiagramm-Overlay auf demselben z-index (2000)
wie `lightbox.js`, wodurch der gemeinsame Tooltip (z-index 1000) beim Hovern
eines Punkts INNERHALB des Overlays dahinter verdeckt gewesen wäre (höherer
z-index gewinnt unabhängig von der DOM-Reihenfolge) - vor dem ersten Test
bereits erkannt (Stacking-Kontext vorab durchdacht) und auf z-index 900
gesetzt (weiterhin über Sidebar/Flyouts, aber unter dem Tooltip). Live
bestätigt: `getComputedStyle` zeigt Overlay 900 / Tooltip 1000, Tooltip auf
einem Streudiagramm-Punkt erscheint sichtbar über dem Overlay.

**Punkt 3 (Info-Button-Texte):** Vorschläge in beiden Modulen ergänzt (noch
nicht freigegeben, siehe Auftrag). Beide Texte nennen SchzG/SchvG nur beim
Namen, ohne ihre Bedeutung zu erklären - siehe Selbstauskunft im Chat, warum
diese beiden Kürzel bewusst nicht aufgelöst wurden.

**Feldnamen-Herkunft (`js/utils/verlassenschaftenFelder.js`):** "RV" wurde zu
"Realvermögen" aufgelöst - keine Vermutung, sondern direkt aus der eigenen
CSV-Kopfzeile abgeleitet (die Spalte `Realvermoegen_fl` schreibt denselben
Begriff bereits explizit aus). "SchzG"/"SchvG" bleiben dagegen unaufgelöst -
ihre volle Bedeutung ist nicht zweifelsfrei bekannt (Auftrag, wörtlich:
"Abkürzung beibehalten statt zu raten, und zurückmelden") - hiermit
zurückgemeldet.

**Registry:** `verlassenschaften.primaeransicht` von `platzhalter` auf
`parallelKoordinaten` geändert, `hatGalerie` bewusst NICHT gesetzt (Nicht-Ziel:
"keine Änderung an der Galerie/Flyout-Logik" - unverändertes Verhalten dieses
Bereichs: Primäransicht + Ansicht-Auswahl-Dropdown, wie zuvor). Live bestätigt:
`#visualisierungen/verlassenschaften` (ohne Ansicht-Segment) leitet korrekt zu
`.../parallelKoordinaten` weiter; Urkundens Galerie zeigt jetzt 18 statt 20
Kacheln (Parallelkoordinaten/Korrelationsmatrix entfernt), Personen/Bürgerbuch
unverändert (Nicht-Ziel eingehalten).

Verifikationsmethodik: `node --check` auf allen fünf berührten/neuen Dateien
bestanden. Grep bestätigt: keine verbliebenen Cache-Bust-Marker (`?vvk=1`/`?vvk=2`
auf `index.html`s Script-Tag, `app.js`' Import von `archivalienRegistry.js` und
dessen `parallelKoordinaten`-`modulPfad` nach dem Test wieder entfernt), keine
verbliebenen Referenzen auf das gelöschte `verlassenschaftenPlatzhalter.js`
außer der eigenen Löschbegründung in `archivalienRegistry.js`, verbleibende
Treffer für "parallelKoordinaten"/"korrelationsmatrix" in anderen Dateien sind
harmlose, unveränderte Bestandsreferenzen (ein vorbereitetes, aktuell ungenutztes
Icon-Paar in `vizIcons.js`, sowie Doku-Querverweise in `swimlanes.js`/
`ridgeline.js`/`horizonChart.js` auf dasselbe, unverändert weiterhin gültige
Vollbild-Konventions-Muster).

---

## 2026-09-15 (48) – Flyouts schließen sich nicht mehr gegenseitig (Stapel-Bug)

Datei: `js/core/visualisierungsTabs.js` (einzige geänderte Datei - siehe
Begründung unten, warum `bereichsLeiste.js` nicht angefasst werden musste,
obwohl es als betroffen genannt war).

**Ursache:** (47) ersetzte das automatische mouseleave-Schließen komplett
durch ausschließlich Klick-basiertes Schließen. Das löste das damalige
Problem (Kette schloss sich fälschlich beim Überqueren von Zwischenräumen),
öffnete aber eine neue Lücke: da jetzt NICHTS mehr automatisch schloss,
blieben beim Hovern über mehrere unabhängige Auslöser nacheinander (z.B.
mehrere Bereichs-Tabs der Reihe nach, oder "Bestand" nach "Visualisierungen")
alle dabei geöffneten Panels gleichzeitig offen und überlappten sich - exakt
das im Auftrag gezeigte Screenshot-Problem. (Die Vermutung im Auftrag, dass
"Bestand" sich wegen seiner separaten `eigenerFlyoutNoetig`-Verdrahtung
korrekt verhalte, war eine Vermutung des Nutzers, keine bestätigte
Beobachtung - tatsächlich zeigte der Screenshot Bestand UND mehrere
Bereichs-Tab-Flyouts gleichzeitig überlappend, das Problem betraf also auch
Bestand gleichermaßen.)

**Lösung - eine gemeinsame Funktion statt zwei parallele Implementierungen**
(wie im Auftrag gefordert): die neue Prüfung sitzt direkt in
`erzeugeFlyoutPanel()`s `oeffne()` selbst - der EINEN Stelle, die (schon
seit (46)) ausnahmslos alle vier Flyout-Varianten zum Öffnen aufrufen,
egal ob Hover- oder Klick-ausgelöst (`verankereFlyout()`s Toggle ruft
ebenfalls `kern.oeffne()`). Neue private Hilfsfunktion
`schliesseGeschwister()`: beim Öffnen werden alle anderen aktuell offenen
Instanzen (aus dem bereits bestehenden `FLYOUT_INSTANZEN`-Set, siehe (47))
durchsucht - jede, deren Panel den eigenen Auslöser NICHT als DOM-Nachfahren
enthält, gilt als "Geschwister" (nicht Teil derselben verschachtelten Kette)
und wird geschlossen; jede, die den eigenen Auslöser SEHR WOHL enthält, ist
ein Vorfahre in der Kette (z.B. "Visualisierungen"-Panel enthält die
"Bürgerbuch"-Pille als Teil seines gerenderten Vorschau-Inhalts) und bleibt
unangetastet. Da diese Containment-Prüfung rein DOM-strukturell ist (nicht
auf einen bestimmten Flyout-Typ zugeschnitten), gilt sie automatisch
einheitlich für alle vier Varianten UND für beliebige Verschachtelungstiefe
- `bereichsLeiste.js` musste dafür nicht geändert werden, da es selbst keine
Öffnen/Schließen-Logik enthält (baut nur die Auslöser-Elemente, siehe
dortiger Baustein-Vertrag).

**Live-Verifikation:**
- Startseite → Hover "Visualisierungen" → Hover "Urkunden" (dessen
  verschachtelter Flyout öffnet, `aria-expanded="true"` auf dem
  Urkunden-Pill) → Hover "Bürgerbuch" (Geschwister-Pill): Urkunden-Pill
  fällt sofort auf `aria-expanded="false"` zurück, Bürgerbuch-Flyout öffnet,
  weiterhin genau 2 offene Panels (Visualisierungen-Ebene + jeweils EIN
  Bereichs-Tab-Flyout, nie mehr) - kein Überlappen mehr. Per Screenshot
  bestätigt (zeigt nur noch Bürgerbuchs Tabs, Urkundens sind weg).
- Dieselbe Kette danach 2 Sekunden mit der Maus auf einem neutralen
  Seitenbereich belassen: bleibt weiterhin offen (`count: 2`,
  `hash` weiterhin `""`) - bestätigt, dass (47)s Kern-Fix (Kette bleibt
  offen bis Klick) durch diese Änderung nicht beeinträchtigt wurde.
- Von dort Hover auf "Bestand" (komplett unverwandter, oberster Auslöser):
  schließt beide Ebenen der Visualisierungen-Kette
  (`visualisierungen[aria-expanded]: "false"`), öffnet ausschließlich
  Bestands eigenen Flyout (`count: 1`, `bestand[aria-expanded]: "true"`) -
  per Screenshot bestätigt.
- Klick-Verhalten unverändert bestätigt: Klick auf "Sunburst" in Bestands
  Flyout springt direkt zu `#bestand/sunburst`, schließt danach
  (`offeneFlyouts: 0`).
- Regressionscheck (kritisch, da `schliesseGeschwister()` jetzt auch beim
  KLICK-ausgelösten Öffnen läuft, nicht nur bei Hover): Urkundens eigener,
  per Klick getoggelter aktiver Tab-Flyout (`#visualisierungen/urkunden/sankey`)
  öffnet weiterhin zuverlässig auf einen reinen Klick (kein
  Selbst-Schließen durch die neue Geschwister-Prüfung, da der
  Selbst-Vergleich über `andere.panel === panel` korrekt überspringt) und
  toggelt beim zweiten Klick wieder zu.

Verifikationsmethodik: `node --check` bestanden. Grep bestätigt keine
verbliebenen Cache-Bust-Marker (`?vgs=1`, testweise auf `index.html`s
Script-Tag und `app.js`' Import gesetzt, nach dem Test entfernt) und
unveränderte, mit `app.js`' Import konsistente Exporte.

---

## 2026-09-15 (47) – Flyout-Kette bleibt offen bis Klick, einheitliche Positionierung

Dateien: `js/core/visualisierungsTabs.js` (einzige geänderte Datei - beide
Punkte betreffen ausschließlich den gemeinsamen Kern `erzeugeFlyoutPanel()`,
den alle vier Flyout-Varianten aus (46) nutzen; `bereichsLeiste.js`/`app.js`
mussten nicht angefasst werden).

**Punkt 1 - Flyout-Kette schließt nicht mehr durch Wegbewegen der Maus:**
Ursache des gemeldeten Problems: die Panels verschachtelter Flyout-Ebenen
liegen als GESCHWISTER direkt in `<body>` (nicht ineinander verschachtelt,
da `position:fixed` das erfordert), daher verließ die Maus beim Wandern von
einer Ebene zur nächsten zwangsläufig kurz Auslöser UND Panel der äußeren
Ebene - das alte mouseleave+200ms-Debounce-Schließen wertete das
unabhängig von der Debounce-Dauer irgendwann als "Nutzer verlässt das
Menü". Lösung: mouseleave-Schließen komplett entfernt (Hover öffnet weiter
unverändert). Schließen übernimmt jetzt ausschließlich a) Klick auf einen
Eintrag (bestehende, unveränderte Klick-Handler) oder b) ein neuer,
EINMALIG registrierter globaler `document`-Klick-Listener
(`stelleGlobalenKlickListenerSicher()`), der bei jedem Klick alle aktuell
offenen Flyout-Instanzen (Modul-weites `FLYOUT_INSTANZEN`-Set) daraufhin
prüft, ob das Klick-Ziel außerhalb von sowohl Panel als auch Auslöser
liegt, und sie in diesem Fall schließt.

Live-Verifikation: Startseite → Hover "Visualisierungen" (Flyout öffnet,
`location.hash` bleibt `""`) → Hover "Bürgerbuch" darin (verschachtelter
Flyout öffnet, jetzt 2 gleichzeitig offene Panels) → Maus bewusst auf einen
neutralen Punkt der Seite bewegt (weit weg von beiden Auslösern/Panels) →
2 Sekunden gewartet (10x die alte Debounce-Zeit) → beide Panels weiterhin
offen (`offeneFlyouts: 2`, `hash` weiterhin `""`) bestätigt per
JS-Zustandsabfrage UND Screenshot (zeigt alle drei Navigationsebenen
gleichzeitig sichtbar). Danach Klick auf "Trellis" darin: navigiert zu
`#visualisierungen/buergerbuch/trellis`, beide Panels schließen
(`offeneFlyouts: 0`). Separat verifiziert: erneutes Hover-Öffnen von
"Visualisierungen", danach Klick auf einen neutralen Seitenbereich
(außerhalb der Kette) → schließt sofort, `hash` bleibt unverändert (kein
versehentliches Navigieren durch den Schließen-Klick selbst). Ebenso für
den "Bestand"-Hover-Flyout wiederholt (2s offen nach Wegbewegen der Maus,
Klick auf "Sunburst" springt direkt zu `#bestand/sunburst`, Panel
schließt).

Regressionscheck (wichtig, da derselbe Kern auch für den bereits AKTIVEN
Bereichs-Tab per Klick TOGGELT, nicht nur hovert - Gefahr: der neue globale
Klick-Listener könnte einen gerade per Klick geöffneten Flyout im selben
Klick-Event sofort wieder schließen): Bubble-Reihenfolge macht das
ungefährlich - der elementeigene Klick-Handler (Toggle) läuft immer VOR dem
document-Listener (Ziel-Phase vor Bubble-Phase), und der globale Listener
überspringt Instanzen, deren Auslöser das Klick-Ziel selbst ist. Live
bestätigt an Urkundens eigenem, aktivem Tab-Flyout (`#visualisierungen/urkunden/sankey`):
ein per JS ausgelöster reiner Klick (ohne vorheriges Hover, zur sauberen
Isolation des Timings) auf den aktiven "Urkunden"-Pill öffnet den Flyout
zuverlässig (`offeneFlyouts: 1`, bleibt nach 1s weiterhin offen, Screenshot
zeigt alle 20 Tabs korrekt), ein zweiter Klick toggelt ihn wieder zu.

**Punkt 2 - Einheitliche Positionierung an der X-Position des Auslösers:**
`erzeugeFlyoutPanel()`s `positioniere()` war schon in (46) die EINZIGE
Stelle, die die Position irgendeiner der vier Flyout-Varianten berechnet -
keine neue Hilfsfunktion nötig, nur diese eine Stelle musste korrigiert
werden. Vorher: `panel.style.left` immer an `#app-content`s linker Kante
(unabhängig vom jeweiligen Auslöser), `width` immer volle Content-Breite.
Jetzt: `panel.style.left = ausloeserRect.left`, `max-width` statt fester
`width` (begrenzt auf den verbleibenden Platz bis zur rechten Kante von
`#app-content`, damit nichts überläuft) - exakt wie bereits zuvor
`bereichsLeiste.js`' `synchronisiereXPosition()` es für die PERMANENTE
Bereichs-Leiste vorgemacht hatte (Auftrags-Referenzbeispiel), jetzt auf
alle Flyout-Ebenen übertragen. Resize-Neuberechnung (`beiResize()`)
unverändert vorhanden.

Live-Verifikation (`getBoundingClientRect().left`-Vergleich Auslöser vs.
Panel, jeweils exakt gleich):
- "Visualisierungen"-Flyout: 292.84375px = 292.84375px
- "Bürgerbuch"-Pill (verschachtelt) vs. dessen Visualisierungs-Tab-Flyout: 399.8125px = 399.8125px
- "Bestand"-Flyout: 202.1875px = 202.1875px
- Urkundens aktiver Tab-Flyout (permanente Bereichs-Leiste): sichtbar am Screenshot exakt unter dem "Urkunden"-Pill (nicht mehr über die volle Seitenbreite gestreckt wie vor diesem Auftrag)

Gemeinsame Funktion bestätigt: alle vier o.g. Fälle laufen durch dieselbe,
einzige `positioniere()`-Implementierung in `erzeugeFlyoutPanel()` - keine
separate/abweichende Positionierungslogik pro Flyout-Typ.

Verifikationsmethodik: `node --check` auf allen geänderten Dateien
bestanden. Grep bestätigt: keine verbliebenen Cache-Bust-Marker
(`?vfk=1` auf `index.html`s Script-Tag und `app.js`' Import von
`visualisierungsTabs.js` nach dem Test wieder entfernt), Exporte
(`fuegeFlyoutStyleEin`, `erzeugeFlyoutPanel`, `verankereFlyout`,
`verankereVorschauFlyout`, `verankereIconFlyout`) unverändert konsistent
mit `app.js`' Import.

---

## 2026-09-15 (46) – Hover-Flyouts in der Hauptnavigation

Dateien: `js/core/visualisierungsTabs.js` (grundlegend umgebaut),
`js/core/bereichsLeiste.js` (jeder Link statt nur der aktive bekommt einen
Flyout), `js/core/app.js` (neue, einmalig beim Start verankerte
Hauptnav-Flyouts + ein selbst gefundener Konflikt behoben).

**Architektur:** Die bisherige, monolithische `verankereFlyout()`-Implementierung
ist in einen gemeinsamen Kern (`erzeugeFlyoutPanel()`, neu exportiert:
Panel/Positionierung/Hover-Öffnen-Schließen/Resize, OHNE eigene Klick-Semantik)
und vier darauf aufbauende Varianten aufgeteilt: `verankereFlyout()`
(unverändert, Klick togglet - für den jeweils AKTIVEN Kontext),
`verankereVorschauFlyout()` (neu, reiner Hover ohne Klick-Verdrahtung am
Auslöser - für Bereichs-Tabs, deren Klick bereits anderweitig belegt ist),
`verankereIconFlyout()` (neu, Icon+Name-Kacheln statt Text-Pillen, Klick am
Auslöser schließt nur, ohne preventDefault). Details/Begründung siehe
Dateikopf-Kommentar von visualisierungsTabs.js.

**Punkt 1 ("Visualisierungen" Hover=Flyout, Klick=permanent):** Neuer,
einmalig in `verankereHauptnavFlyouts()` (App-Start, unabhängig vom
Render-Zyklus) verankerter Flyout am "Visualisierungen"-Hauptnav-Link, Inhalt
= `bereichsLeiste.js`' neue `erzeugeBereichsLeistenVorschau()` (dieselben
Pillen wie die permanente Bereichs-Leiste, aber ohne deren Bleed-Trick/X-
Positions-Sync - im Flyout-Panel nicht nötig). Klick auf "Visualisierungen"
selbst navigiert normal (kein preventDefault), schließt nur den Flyout. Live
bestätigt: Hover von der Startseite aus zeigt die 4 Bereiche als Vorschau,
OHNE dass sich `location.hash` ändert; Klick navigiert und macht die
Bereichs-Leiste danach permanent.

**Punkt 2 ("Bestand" Icon-Flyout, Direktsprung):** `verankereIconFlyout()` am
"Bestand"-Hauptnav-Link, dauerhaft (nicht an renderBestandTab() gebunden) -
zeigt alle 5 Visualisierungen als Icon+Name-Kacheln, Klick springt DIREKT
dorthin (nicht zur Galerie). Live bestätigt: Hover von einer völlig anderen
Seite aus (Bürgerbuch/Trellis) zeigt den Flyout ohne Navigation; Klick auf
"Sunburst" darin landet direkt auf `#bestand/sunburst` (Galerie nicht
gezeigt); Klick auf "Bestand" selbst navigiert weiterhin zur Galerie.

**Punkt 3 (Bereichs-Tab-Flyouts bei Hover auf JEDEN Tab):**
`bereichsLeiste.js`' `baueBereichsPillen()` (aus der bisherigen
`erzeugeBereichsLeiste()`-Funktion ausgelagert, jetzt auch von
`erzeugeBereichsLeistenVorschau()` wiederverwendet) ruft jetzt für JEDEN
NICHT-aktiven Eintrag `options.verankereVizFlyout(link, archivalientyp)` auf
(app.js' `erzeugeVizVorschauFlyout()`) - der aktive Eintrag bleibt bewusst
ausgespart (hat bereits seinen eigenen, live mitlaufenden Flyout aus (44),
ein zweiter unabhängiger Flyout auf demselben Link wäre ein Doppel-Listener-
Konflikt). Dieselbe Funktion wird auch von der VERSCHACHTELTEN
Bereichs-Leiste-Vorschau aus Punkt 1 wiederverwendet (mit einem zusätzlichen
Schließen-Callback für den äußeren Flyout) - dadurch funktioniert Punkt 3
automatisch "von jeder beliebigen Stelle in der App aus": Live bestätigt
per Screenshot - von der Startseite aus Hover "Visualisierungen" -> Vorschau
erscheint -> Hover "Bürgerbuch" darin (während nichts aktiv ist) -> dessen
Visualisierungs-Flyout erscheint verschachtelt darunter -> Klick auf
"Trellis" navigiert direkt zu `#visualisierungen/buergerbuch/trellis`, alle
Flyouts schließen, die Bereichs-Leiste wird permanent.

**Zwei selbst gefundene, vor Auslieferung behobene Bugs (beide beim
Live-Testen entdeckt, siehe Selbstauskunft für die volle Herleitung):**
1. **Style-Wipe-Bug**: `erzeugeBereichsLeistenVorschau()` leert seinen
   Container als ersten Schritt (eigener Baustein-Vertrag) - in
   `verankereHauptnavFlyouts()`s ursprünglicher Reihenfolge wurde
   `fuegeFlyoutStyleEin()` VOR diesem Aufruf ausgeführt und dadurch sofort
   wieder mit gelöscht, wodurch der "Visualisierungen"-Flyout unsichtbar/
   unpositioniert blieb (kein `position:fixed`, landete am Dokumentende).
   Behoben durch Vertauschen der Reihenfolge.
2. **Doppel-Flyout-Konflikt bei "Bestand"**: Bestands `kontext.ausloeser`
   (für den aus (44) stammenden, live mit dem offenen Bereich mitlaufenden
   Flyout) ist DERSELBE Hauptnav-Link, an dem jetzt auch der neue,
   permanente Icon-Flyout aus Punkt 2 hängt - zwei unabhängige Klick-
   Listener auf einem Element, deren zweiter (aus (44), togglet MIT
   preventDefault) jeden Klick auf "Bestand" abfing und damit die in Punkt 2
   geforderte normale Navigation zur Galerie-Seite verhinderte (live
   entdeckt: Klick auf "Bestand" während einer offenen Bestand-Visualisierung
   navigierte nicht mehr). Behoben durch ein neues `eigenerFlyoutNoetig`-Flag
   in `erzeugeGalerieFlyoutKontext()` (Standard `true`, für Bestand explizit
   `false`) - `stelleVizFlyoutSicher()` lässt den zusätzlichen, für Bestand
   ohnehin redundanten Flyout-Aufbau dann aus. Bei Urkunden/Bürgerbuch/
   Personen tritt der Konflikt nicht auf (aktiver Bereichs-Leiste-Eintrag ist
   ein anderes Element als der "Visualisierungen"-Hauptnav-Link) und bleibt
   unverändert.

**Regressionscheck (live geprüft):** Urkundens eigener, aktiver
Bereichs-Leiste-Flyout (aus (44)) funktioniert nach beiden Fixes weiterhin
unverändert (Hover zeigt alle 20 Ansichten + Übersicht, Sankey korrekt
hervorgehoben).

**Verifikation:** `node --check` sauber auf allen drei berührten Dateien;
grep bestätigt konsistente Exporte/Importe und keine verbliebenen
Cache-Bust-Marker. Live-Test über die etablierten temporären `?vhn=N`-Marker
(N musste bei jedem der beiden Bugfixes erhöht werden, siehe (44)/(45) für
die Begründung des Cache-Verhaltens dieser Dev-Server-Umgebung), danach
vollständig entfernt und erneut geprüft. Drei Screenshots: "Visualisierungen"
Hover-Flyout ohne Klick (von der Startseite aus, inkl. verschachteltem
Bereichs-Tab-Flyout), "Bestand" Hover-Flyout mit Icon+Name-Kacheln, Hover auf
einen inaktiven Bereichs-Tab.

---

## 2026-09-15 (45) – Galerie+Flyout für Bürgerbuch und Personen

Dateien: `js/config/archivalienRegistry.js` (`hatGalerie`+`beschreibung` für
beide Bereiche, Label-Umbenennung), `js/utils/vizIcons.js` (6 neue Icons).
Keine Änderung an `app.js`/`bereichsLeiste.js`/`visualisierungsTabs.js`/
`layout.css` nötig - die Galerie/Flyout-Logik war durch (44) bereits
vollständig generisch (`archivalientyp.hatGalerie` steuert unabhängig vom
konkreten Bereich), reine Registry-Erweiterung reichte aus.

**Umsetzung:** `hatGalerie: true` bei `buergerbuch` (3 Ansichten) und
`personen` (3 Ansichten) ergänzt. Klick auf "Bürgerbuch"/"Personen" in der
Bereichs-Leiste zeigt jetzt jeweils die Galerie, Klick auf eine Kachel öffnet
die Visualisierung mit Hover/Klick-Flyout (live bestätigt, identisches
Verhalten zu Urkunden/Bestand - Screenshots aller vier Zustände oben).
Direktlinks weiterhin funktionsfähig (live geprüft, u.a.
`#visualisierungen/personen/bubbleChart`).

**Textprüfung:** Alle 5 gelieferten Kachel-Texte gegen die tatsächlichen
Info-Button-Texte der Module geprüft - alle 5 stimmten überein, keine
Korrektur nötig.

**Zwei transparent gemeldete Abweichungen bei Personen:**
1. **Label-Umbenennung `familienbaum` -> "Habsburg-Zeitleistenbaum"**: keine
   Umdeutung - das Modul beschreibt sich in seinem eigenen Dateikopf-
   Kommentar und internen Info-Text bereits selbst so ("Dieser Zeitleisten-
   Stammbaum zeigt das Haus Habsburg von Rudolf I. bis Joseph II.") und
   filtert die Daten fest auf den Habsburg-Familienkreis - kein generischer
   Stammbaum, der nur zufällig mit Habsburg-Daten gefüttert wird.
2. **Fehlender dritter Kachel-Text**: Der Auftrag nannte nur 2 Module
   ("Personen (2 Module)"), `personen.ansichten` hat aber DREI Einträge -
   `bubbleChart` fehlte in der gelieferten Liste. Bewusst NICHT entfernt
   (keine Anweisung dazu, hätte den bestehenden Direktlink
   `#visualisierungen/personen/bubbleChart` unerreichbar gemacht) -
   stattdessen selbst eine gegen den tatsächlichen Code geprüfte
   Kurzbeschreibung ergänzt ("Ein Kreis pro Person, Fläche = Gesamt-
   Nennungshäufigkeit über Urkunden und Bürgerbuch (Circle-Packing, Farbe
   ohne inhaltliche Bedeutung)"), damit die Galerie nicht mit einem
   Platzhaltertext auffällt - bitte im Chat bestätigen oder eigenen Text
   liefern.

**Icons:** 6 neue schematische Icons (die 5 beauftragten plus `bubbleChart`
selbst ergänzt, siehe Abweichung 2): Trellis (8 Mini-Balkendiagramme im
Raster), Bump Chart (zwei Punktspalten mit kreuzenden GERADEN Linien, bewusst
nicht kurvig wie Sankey/Alluvial), Personennetzwerk (unregelmäßiges Knoten-
Kanten-Netzwerk, bewusst kein Raster/keine feste Spaltenstruktur),
Habsburg-Zeitleistenbaum (vertikale Stammlinie mit unterschiedlich langen
vertikalen Balken, bewusst vertikal zur Abgrenzung von Gantt-Diagramms
horizontaler Zeitachse), Personenliste (schlichtes Listen-Symbol),
Bubble Chart (lose geclusterte Kreise ohne Rahmenkreis, zur Abgrenzung von
Bestands-circlePacking mit explizitem Kategorie-Rahmen) - live per
Screenshot bestätigt (beide neuen Galerien).

**Regressionscheck (live geprüft):** Verlassenschaften weiterhin unangetastet
- kein Galerie-Zweig, Klick auf "Verlassenschaften" springt weiterhin direkt
zum Platzhalter mit Dropdown. Führungen/Literatur ohnehin unberührt (keine
Bereichs-Leiste, kein Code-Pfad dieses Auftrags betrifft sie).

**Verifikation:** `node --check` sauber auf allen sechs berührten Dateien;
grep bestätigt `hatGalerie: true` bei genau 3 der 4 Archivalientypen
(Verlassenschaften absichtlich ausgenommen) und keine verbliebenen
Cache-Bust-Marker. Live-Test über die etablierten temporären `?vbb=1`-Marker,
danach vollständig entfernt und erneut geprüft. Vier Screenshots: Bürgerbuch-
Galerie, Bürgerbuch-Flyout (Trellis aktiv), Personen-Galerie, Personen-Flyout
(Habsburg-Zeitleistenbaum aktiv).

---

## 2026-09-15 (44) – Visualisierungs-Tab-Leiste als Hover/Klick-Flyout + Galerie-Muster für Bestand

Dateien: `js/core/visualisierungsTabs.js` (grundlegend umgebaut), `js/core/bereichsLeiste.js`
(Flyout-Auslöser exponiert), `js/core/app.js` (Galerie/Flyout-Logik verallgemeinert +
`renderBestandTab()` umgebaut), `js/config/archivalienRegistry.js` (`beschreibung` für
`BESTAND_ANSICHTEN`), `js/utils/vizIcons.js` (5 neue Icons), `css/layout.css`
(Grid-Zeile aus (41) wieder entfernt).

**Punkt 1 (Hover/Klick-Flyout):** Die permanente dritte Zeile aus (42) ist
entfernt - die Tab-Leiste ist jetzt ein `position:fixed`-Flyout
(`visualisierungsTabs.js`' neuer Haupt-Export `verankereFlyout()`), verankert
am aktiven Bereichs-Leiste-Eintrag ("Urkunden"). Standardmäßig eingeklappt,
öffnet bei Hover ODER Klick auf den Auslöser, schließt automatisch (200ms
Karenzzeit), sobald der Cursor sowohl Auslöser als auch Panel verlassen hat.
Live bestätigt: `.viz-inhalt` nimmt wieder dieselbe volle Höhe ein wie vor
(41) (Grid wieder auf vier statt fünf Zeilen, siehe layout.css), Flyout
überlappt den Inhalt statt ihn zu verschieben, verschwindet zuverlässig beim
Wegbewegen des Cursors (live mit Timing getestet).

**UX-Entscheidung "Flyout nach Tab-Klick schließen" (Auftrag verlangt eine
begründete Wahl):** JA, schließt sofort. Begründung (siehe ausführlicher
Dateikopf-Kommentar in visualisierungsTabs.js): der Flyout überlappt genau
die Fläche, auf der die neu gewählte Visualisierung erscheint - bliebe er
offen, würde er das eigene Klickergebnis des Nutzers verdecken. Ein Klick ist
ein abgeschlossener Entscheidungsakt, sofortiges Schließen liefert
unmittelbares Feedback. Hover und Klick teilen sich danach dieselbe
Wegbewegen-schließt-Logik, kein separater "angepinnt"-Zustand.

**Punkt 2 (Galerie-Muster für Bestand):** Bestand (Top-Level-Tab) bekommt
dasselbe Galerie+Flyout-Muster wie Urkunden - dafür wurde die vormals
Urkunden-spezifische Galerie/Flyout-Maschinerie in app.js verallgemeinert
(`erzeugeGalerieFlyoutKontext()`/`aktualisiereGalerieFlyoutAnsicht()` etc.,
arbeiten jetzt auf einem generischen `kontext.bereich`/`routeSegmente()`/
`ermittleAnsichtId()`/`ausloeser` statt fest auf `archivalientyp`) - bewusste
Entscheidung GEGEN eine zweite, fast identische Kopie der ganzen Logik nur
für Bestand. `#bestand` (bare) zeigt jetzt die Galerie statt automatisch zur
Treemap zu springen (Verhaltensänderung, wie beauftragt) - Direktlinks zu
einzelnen Ansichten (z.B. `#bestand/ganttDiagramm`) weiterhin unverändert
funktionsfähig (live getestet). `ansichtWechseln.js` wird für Bestand nicht
mehr verwendet (ersatzlos durch Galerie+Flyout ersetzt), bleibt aber für
Bürgerbuch/Verlassenschaften/Personen im Einsatz (unverändert).

Kachel-Texte: vier von fünf gelieferten Texten stimmten mit den bereits
bestehenden Info-Button-Texten der jeweiligen Module überein, EINER wurde vor
Übernahme korrigiert:
- **Sunburst**: gelieferter Text ("Kategorien innen, Bestände außen") nannte
  nur zwei Ringe - sunburst.js zeigt laut eigenem Info-Button-Text und einem
  dortigen Kommentar ("Rückkehr zur 3-Ebenen-Ansicht") tatsächlich DREI Ringe
  (Kategorie/Unterkategorie/Bestand). Korrigiert zu: "Dieselben Bestände
  radial angeordnet: Kategorie innen, Unterkategorie in der Mitte, Bestand
  außen."

Icons: fünf neue schematische Icons (treemap: verschachtelte Rechtecke
unterschiedlicher Größe; sunburst: konzentrische Ringsegmente; icicle:
gestapelte, sich nach unten aufteilende Balkenreihen; circlePacking:
verschachtelte Kreise; ganttDiagramm: horizontale Balken unterschiedlicher
Länge auf einer Zeitachse) - live per Screenshot bestätigt (Bestand-Galerie).

**Regressionscheck (live geprüft):** Bürgerbuch weiterhin unverändert -
Ansicht-Dropdown vorhanden, kein Flyout-Auslöser.

**Selbst gefundener Bug (während der Live-Verifikation, vor Auslieferung
behoben):** `bereichsLeiste.js`s `erzeugeBereichsLeiste()` berechnete
`aktiverLink` korrekt, vergaß ihn aber im zurückgegebenen Objekt
aufzunehmen (`return { destroy() {...} }` ohne `aktiverLink`) - dadurch war
`kontext.ausloeser` bei Urkunden `undefined` und `verankereFlyout()` warf
beim ersten Aufbau (`ausloeser.setAttribute(...)`) einen TypeError. Beim
ersten Live-Test über einen Direktlink zu `#visualisierungen/urkunden/sankey`
im Browser-Konsolenfehler entdeckt, behoben (`aktiverLink` jetzt Teil des
zurückgegebenen Objekts), erneut getestet - seitdem fehlerfrei.

**Verifikation:** `node --check` sauber auf allen sechs berührten/neuen
JS-Dateien; grep bestätigt keinen Code-Rest der alten permanenten Grid-Zeile
(`.visualisierungs-tabs-bereich`, nur noch als historischer Kommentar
erwähnt) und keine verbliebenen Cache-Bust-Marker. Live-Test über die
etablierten temporären `?vfg=1`-Marker (inkl. CSS-Links, siehe (43) für die
Begründung), zusätzlich ein zweiter Marker-Stand (`?vfg=2`) für
bereichsLeiste.js, nachdem der oben beschriebene Bug-Fix zunächst noch aus
dem Cache-Eintrag des ERSTEN Marker-Stands bedient wurde (derselbe
Cache-Mechanismus, der schon in früheren Einträgen dokumentiert ist, hier
zusätzlich erstmals beobachtet: ein bereits verwendeter Marker-Wert wird
nach einer Content-Änderung NICHT automatisch neu geholt, sondern braucht
selbst einen neuen, noch nie verwendeten Wert). Danach alle Marker
vollständig entfernt und erneut grep-bestätigt. Drei Screenshots: Urkunden
mit eingeklapptem Flyout (volle Höhe), Urkunden mit ausgeklapptem Flyout
(Sankey aktiv), Bestand-Galerie mit allen 5 Kacheln; zusätzlich Bestand mit
ausgeklapptem Flyout und sichtbarem Hover-Tooltip live bestätigt.

---

## 2026-09-14 (43) – Schriftgröße der Visualisierungs-Tab-Leiste verkleinern

Datei: `js/core/visualisierungsTabs.js` (nur eigenes injiziertes Stylesheet).

Root-Cause-Befund: `.visualisierungs-tab` hatte bislang gar keine eigene
`font-size` (nur `font: inherit`) und erbte dadurch die Fließtext-Größe von
`body` (`var(--fs-md)`, 16px) - war also tatsächlich GRÖSSER als die
darüberliegende Bereichs-Leiste (`var(--fs-sm)`, 14px), nicht kleiner. Jetzt
explizit `font-size: calc(var(--fs-sm) * 0.875)` (~12,25px) - dieselbe
87,5%-Rate, mit der `var(--fs-sm)` selbst bereits gegenüber `var(--fs-md)`
gestuft ist (siehe bereichsLeiste.js/CHANGELOG 40), dadurch fällt Stufe 3
optisch im selben Schritt ab wie Stufe 2 (Richtwert 85-90%, wörtlich erfüllt).

Live per `getComputedStyle()` bestätigt: Hauptnav 16px -> Bereichs-Leiste
14px -> Visualisierungs-Tab-Leiste 12,25px, jede Stufe exakt 87,5% der
vorherigen. Kein Umbruch-/Überlappungsproblem: durch die kleinere Schrift
werden die Tabs schmaler, die Leiste braucht bei gleicher Fensterbreite eher
WENIGER Zeilen als zuvor (live bestätigt: 3 Zeilen bei 1000px Fensterbreite,
alle 21 Einträge weiterhin einzeln lesbar).

Verifikation: `node --check` sauber. Live-Test wie bei (41)/(42) über die
etablierten temporären `?vbf=1`-Marker (Script-Tag, betroffener Import,
sowie - wie in (42) gelernt - auch die beiden CSS-`<link>`-Tags, da die
Dev-Server-Umgebung `layout.css`/`components.css` unabhängig von den JS-
Modulen cacht), danach vollständig entfernt und erneut geprüft. Screenshot
zeigt alle drei Navigationsebenen im direkten Größenvergleich.

---

## 2026-09-14 (42) – Permanente Tab-Leiste statt dynamischer Multi-Tabs (Pilot: Urkunden)

Dateien: `js/core/visualisierungsTabs.js` (grundlegend vereinfacht),
`js/core/visualisierungsGalerie.js` (nur Dateikopf-Kommentar korrigiert,
`onAuswahl`-Vertrag unverändert), `js/core/app.js` (hatGalerie-Kontext
vereinfacht), `css/layout.css` (.galerie-bereich als eigene Vollbild-Seite
wiederhergestellt, .visualisierungs-tab-inhalt entfernt).

Ersetzt die in Eintrag (41) gebaute Multi-Tab-Funktion (mehrere gleichzeitig
offene, dynamisch aus der Galerie hinzugefügte Tabs mit Schließen-Knopf)
durch eine permanente, immer vollständige Tab-Leiste - näher am
ursprünglichen Alpha-Verhalten.

**Punkt 1 (immer alle Visualisierungen):** Die Tab-Leiste zeigt jetzt IMMER
alle 20 Urkunden-Ansichten (`archivalientyp.ansichten`, dieselbe Reihenfolge
wie die Galerie-Kacheln) statt nur der bisher besuchten - live bestätigt (21
Einträge inkl. "Übersicht" sofort nach dem ersten Öffnen einer Visualisierung
aus der Galerie). Erscheint dabei bewusst NICHT auf der Galerie-Seite selbst
(anders als (41), wo sie dort als "Übersicht"-Panel sichtbar blieb) - erst
sobald eine erste Visualisierung geöffnet wurde (Auftrag, wörtlich) - live
bestätigt: Galerie-Route zeigt keine Tab-Leiste, `.visualisierungs-tabs-bereich`
gar nicht im DOM.

**Punkt 2 (Single-Select, kein Multi-Tab mehr):** Der komplette in (41)
gebaute "offene Tabs"-Zustand (`offeneTabs`-Array, `ladeVorgaenge`-Set,
Schließen-Knopf/`onSchliessen`, Hide-statt-Zerstören mehrerer gleichzeitig
gemounteter Module) ist ersatzlos entfernt. Tab-Wechsel läuft jetzt wie
ansichtWechseln.js' `wechsleZu()`: altes Modul wird zerstört, neues gerendert
(`wechsleZuAnsicht()` in app.js, mit `wirdGewechselt`-Wettlauf-Schutz nach
demselben Muster). Live bestätigt: Direktwechsel Sankey -> Wortwolke ohne
Galerie-Umweg, danach genau ein `<svg>` im DOM (altes Modul sauber zerstört).
Nebeneffekt: der Schließen-Knopf entfällt, wodurch jeder Tab die volle
44px-Mindestklickfläche (Abschnitt 9) jetzt uneingeschränkt einhält - (41)s
dokumentierte, bewusste Unterschreitung dafür ist damit hinfällig.

**Punkt 3 (Hover-Tooltip):** Unverändert aus (41) übernommen (Icon +
Name über js/utils/tooltip.js' Node-Erweiterung) - live bestätigt per
Screenshot (Hover auf inaktivem Tab "Marimekko" während Sankey aktiv ist).

**Punkt 4 (Galerie bleibt Startpunkt):** Bereichs-Leiste-Klick auf "Urkunden"
funktioniert wieder wie vor (41) (einfache Navigation, keine Sonderbehandlung
mehr nötig, da es keine "offenen Tabs" mehr zum Schließen gibt). Der feste
"Übersicht"-Eintrag aus (41) wurde wie im Auftrag vorgeschlagen 1:1
weiterverwendet (erster Tab, gestrichelter Rahmen, führt zur Galerie zurück).

**Layout:** Die Galerie ist wieder eine eigene Vollbild-Seite
(`.galerie-bereich`, `grid-row: 2/-1` - wie vor (41)), kein Panel mehr
innerhalb von `.viz-inhalt`; `.visualisierungs-tab-inhalt` (Wrapper-Div pro
offenem Tab aus (41)) ist damit ebenfalls entfallen, `.viz-inhalt` hält
direkt wieder genau ein Modul (wie vor (41)).

**Regressionscheck (live geprüft):** Bürgerbuch weiterhin unverändert -
Ansicht-Dropdown vorhanden, keine Tab-Leiste.

**Verifikation:** `node --check` sauber auf allen vier berührten JS-Dateien;
grep bestätigt keinen Code-Rest der Multi-Tab-/Schließen-Logik (`offeneTabs`,
`ladeVorgaenge`, `onSchliessen`, `.visualisierungs-tab-schliessen`, etc. -
nur noch als historischer Kommentar in visualisierungsTabs.js erwähnt) und
keine verbliebenen Cache-Bust-Marker. Live-Test über die etablierten
temporären `?vbp=1`-Marker - diesmal zusätzlich auch auf den beiden CSS-
`<link>`-Tags in index.html (layout.css/components.css), da ein erster
Testdurchlauf sonst eine sichtbar falsch positionierte, stark
zusammengestauchte Tab-Leiste zeigte (Root Cause: gecachtes altes CSS ohne
die (41)-Grid-Zeile, kein Fehler im eigentlichen Code) - nach Fund korrigiert,
erneut getestet, danach alle Marker vollständig entfernt und grep-bestätigt.
Screenshot zeigt die vollständige, in drei Zeilen umbrechende Tab-Leiste mit
aktivem Sankey-Tab und sichtbarem Hover-Tooltip auf einem inaktiven Tab.

---

## 2026-09-14 (41) – Visualisierungs-Tab-Leiste statt "Zurück zur Übersicht"-Link (Pilot: Urkunden)

Dateien: `js/core/visualisierungsGalerie.js` (Rückweg-Link entfernt), neu
`js/core/visualisierungsTabs.js`, `js/core/app.js` (Router-Anbindung/
Kontext-Umbau), `js/utils/tooltip.js` (um Node-Inhalte erweitert),
`css/layout.css` (neue Grid-Zeile), `css/components.css` (Tooltip-Icon-Layout),
`js/config/archivalienRegistry.js` (ein Kommentar korrigiert).

**Architektur-Entscheidung, die über den wörtlichen Auftragstext hinausgeht
(transparent gemeldet):** Punkt 4 verlangt, dass ein Klick auf "Urkunden" in
der Bereichs-Leiste alle offenen Tabs schließt und zur Galerie zurückführt.
Bei wörtlicher Auslegung ("jeder Weg zur Galerie schließt alle Tabs") wäre
es aber NIE möglich gewesen, mehr als einen Tab gleichzeitig offen zu haben -
die Galerie wäre dann nur über einen tabs-schließenden Weg erreichbar, ein
zweites Öffnen aus ihr heraus also unmöglich, im Widerspruch zu Punkt 2
("Mehrere gleichzeitig offene Tabs") und der eigenen Prämisse "wie Browser-
Tabs" (ein neuer Tab schließt in echten Browsern ja auch nicht die anderen).
Lösung: Ein fester, nicht schließbarer "Übersicht"-Eintrag (gestrichelter
Rahmen) steht immer als erster Eintrag in der Tab-Leiste - er führt zur
Galerie zurück, OHNE offene Tabs anzutasten (genau wie der Browser-Zurück-
Button von einem gerade geöffneten Tab aus). Das "alles schließen" bleibt
bewusst NUR an den Bereichs-Leiste-Klick gebunden (siehe
`erzeugeBereichsLeisteFuerTab()` in app.js) - exakt wie im Auftrag
beschrieben, aber eben nicht der EINZIGE Weg zur Galerie.

**Punkt 1 (Tab-Öffnen):** Kachel-Klick öffnet/aktiviert einen Tab
(`oeffneOderAktiviereTab()`), ans Ende angehängt; bereits offen -> kein
Duplikat, nur Aktivieren; Direktlink ohne vorherigen Galerie-Besuch öffnet
automatisch einen Tab (live getestet: `#visualisierungen/urkunden/karte` frisch
geladen -> Tab "Karte" sofort aktiv). Wettlauf-Schutz gegen Doppelklick auf
dieselbe noch ladende Kachel (`kontext.ladeVorgaenge`-Set) sowie gegen
inzwischen überholte Ladevorgänge (Route bereits weitergewandert) ergänzt -
beides gab es vorher nicht, weil jede Navigation bislang einen vollständigen
Tab-Neuaufbau (und damit einen neuen `generation`-Wert) auslöste; das entfällt
jetzt bewusst (siehe unten), wodurch mehrere Ladevorgänge über einen
unveränderten `generation`-Wert hinweg möglich werden.

**Punkt 2 (mehrere offene Tabs):** Alle offenen Tabs bleiben als eigene,
weiterhin gemountete Container im DOM (`.visualisierungs-tab-inhalt`,
`hidden`-Attribut statt Zerstören) - Force-Simulationen/Zoom-Zustand etc.
bleiben beim Tab-Wechsel erhalten. Schließen entfernt nur diesen einen Tab
(`schliesseTab()`); war er aktiv, wechselt die Route zum benachbarten Tab
(`Math.min(index, offeneTabs.length-1)`) oder zur bloßen Bereichs-Route (->
Übersicht), falls keine Tabs mehr offen sind. Live getestet: 3 Tabs
gleichzeitig offen (Kalender-Heatmap, Chord-Diagramm, + Übersicht), Schließen
des aktiven Tabs aktiviert korrekt den Nachbarn, Schließen des letzten
verbleibenden Tabs zeigt korrekt wieder die Galerie.

**Punkt 3 (Hover-Tooltip mit Icon):** `js/utils/tooltip.js`s `zeigeTooltip()`
akzeptiert jetzt zusätzlich einen DOM-Knoten statt nur Text (rückwärts-
kompatible Erweiterung, bestehende textbasierte Aufrufstellen unverändert) -
visualisierungsTabs.js zeigt darin Icon (vizIcons.js, dieselben Icons wie die
Galerie-Kachel) + Name. Live getestet und per Screenshot bestätigt (Hover auf
inaktivem Tab "Kalender-Heatmap").

**Punkt 4/5:** `erzeugeGalerieRueckweg()` und die zugehörige `.galerie-
rueckweg`-Klasse vollständig aus visualisierungsGalerie.js entfernt (kein
Text-Link mehr, grep-bestätigt). Bereichs-Leiste-Klick auf den bereits
aktiven Bereich schließt alle Tabs UND zeigt die Galerie (live getestet).

**Architektur-Umbau (Voraussetzung für alles obige):** `handleRouteChange()`s
Schnellpfad, der `hatGalerie`-Kontexte bisher bewusst ausschloss (jede
Navigation = vollständiger `raeumeSeiteAuf()`+`renderTab()`-Neuaufbau), nimmt
sie jetzt ausdrücklich mit auf - ein voller Neuaufbau hätte alle offenen Tabs
samt ihrer Module zerstört, das Gegenteil von "mehrere gleichzeitig offene
Tabs". Bereichs-Leiste/Tab-Leiste/Werkzeugleiste/Viz-Wurzel werden dafür EINMAL
aufgebaut und bleiben für die Lebenszeit des Archivalientyp-Kontexts bestehen
(`stelleHatGalerieChromeSicher()`); die Galerie selbst ist jetzt nur noch ein
weiteres Panel innerhalb der Viz-Wurzel (wie jeder Tab), kein eigener
Grid-Bereich mehr (`.galerie-bereich`-Regel aus layout.css entfernt).

**Layout:** `#app-content`s Grid um eine weitere Zeile erweitert (`auto auto
auto auto 1fr`, war vorher vier Zeilen) für `.visualisierungs-tabs-bereich`
direkt unter der Bereichs-Leiste - alle nachfolgenden Zeilen (Werkzeugleisten/
Hinweis/Inhalt) entsprechend verschoben. Neue `.visualisierungs-tab-inhalt`-
Regel (`height:100%`) nötig, da mehrere Visualisierungsmodule beim Rendern
`container.clientHeight` lesen.

**Regressionscheck (live getestet):** Bürgerbuch weiterhin unverändert -
Ansicht-Dropdown vorhanden, keine Tab-Leiste, Klick auf Bereichs-Leiste
springt direkt zur Primäransicht.

**Verifikation:** `node --check` sauber auf allen fünf berührten JS-Dateien;
grep bestätigt keinen Code-Rest des alten Rückweg-Links (nur zwei erklärende
Kommentare, die ihn als entfernt beschreiben) und keine verbliebenen
Cache-Bust-Marker. Live-Test wie bei Eintrag (39)/(40) über die etablierten
temporären `?vbt=1`-Marker (Cache-Problem dieser Dev-Server-Umgebung),
danach vollständig entfernt und erneut grep-bestätigt. Zwei Screenshots:
drei gleichzeitig offene Tabs mit aktivem Sankey-Diagramm, sowie derselbe
Zustand mit sichtbarem Hover-Tooltip (Icon + Name) auf einem inaktiven Tab.

---

## 2026-09-14 (40) – Bereichs-Leiste optisch als Unterebene von "Visualisierungen" verankert

Dateien: `js/core/bereichsLeiste.js` (einzige betroffene Datei, wie beauftragt -
kein Eingriff in `layout.css`/`#app-content`s gemeinsames Grid).

Ausgangslage: Die in Eintrag (39) eingeführte Bereichs-Leiste (Urkunden/
Bürgerbuch/Verlassenschaften/Personen) wirkte wie eine zweite, gleichrangige
Vollbreiten-Navigation statt wie eine Unterebene von "Visualisierungen" -
begann am linken Seitenrand statt unter dem Tab, hatte dieselbe Schriftgröße
und denselben weißen Hintergrund wie die Hauptnavigation, und stand als
optisch unabhängiger zweiter Balken darunter.

Vier Anpassungen, alle im eigenen Stylesheet/DOM von `bereichsLeiste.js`
gekapselt:

- **Punkt 1 (X-Position)**: `synchronisiereXPosition()` misst per
  `getBoundingClientRect()` die tatsächliche linke Kante des Linktexts
  "Visualisierungen" in der Hauptnavigation und setzt `margin-left` der
  Bereichs-Leiste exakt darauf - bewusst keine feste Pixel-Konstante, da
  `.app-header-inner` zentriert ist (`max-width:1100px`) und sich die
  X-Position mit Fensterbreite UND Logo-/"Bestand"-Textbreite verschiebt.
  Läuft einmal sofort, erneut nach `document.fonts.ready` (asynchron
  nachladende Inter-Schrift kann die Textbreite verändern) und erneut bei
  jedem (debounced) `resize`-Ereignis - eigener, in `destroy()` wieder
  entfernter Listener, kein Eingriff in app.js' bestehende Resize-Verdrahtung.
  Live gemessen (1440px-Fenster): `nav.getBoundingClientRect().left` ===
  `vizTab.getBoundingClientRect().left` nach einem `resize` exakt gleich
  (372,84375px beide).
- **Punkt 2 (Schriftgröße)**: `font-size: var(--fs-sm)` (14px) statt der von
  der Hauptnavigation geerbten `var(--fs-md)` (16px) - 87,5%, im geforderten
  85-90%-Korridor, wiederverwendete Design-System-Variable statt neuem
  Magic-Value.
- **Punkt 3 (Hintergrund)**: `background: var(--bg)` (#f7f5f0) statt des
  weißen `var(--surface)` der Hauptnavigation - live per
  `getComputedStyle()` bestätigt: `rgb(247, 245, 240)` gegen Header-
  Hintergrund `rgb(255, 255, 255)`.
- **Punkt 4 (gemeinsamer Container)**: neue `.bereichs-leiste-huelle` bricht
  mit `margin: calc(-1 * var(--space-4)) calc(-1 * var(--space-4)) 0
  calc(-1 * var(--space-4))` exakt in Höhe von `#app-content`s eigenem
  Padding aus diesem aus - dadurch randlos (volle Fensterbreite wie die
  Hauptnavigation) UND lückenlos an den Header anschließend, plus eigener
  `box-shadow: var(--shadow)` (identischer Wert wie der des Headers), der den
  Schatten des Headers optisch fortsetzt statt eines zweiten unabhängigen
  Schattens. Ergebnis: Header + Bereichs-Leiste wirken als ein
  zusammenhängender, zweizeiliger Block. Die negative margin-top verkleinert
  die vom Grid als "auto"-Zeilenhöhe gemessene Höhe um exakt denselben
  Betrag, um den sie die Hülle nach oben verschiebt - die Unterkante (und
  damit die tatsächlich beanspruchte Grid-Zeilenhöhe) bleibt unverändert,
  keine Überlappung mit der Werkzeugleiste darunter (live bestätigt: alle
  Folgezeilen unverändert an derselben Position).

Regressionscheck (live geprüft): Klick auf "Bürgerbuch" navigiert weiterhin
direkt zur Primäransicht (Trellis), Ansicht-Dropdown weiterhin vorhanden,
`aria-current` wechselt korrekt - Klickverhalten aller vier Bereichs-Tabs
unverändert. Getestet bei 1280px und 1440px Fensterbreite (bei 1280px
umbricht "Personen" in eine zweite Zeile, da der X-Versatz weniger Platz für
die vier Einträge lässt - dasselbe `flex-wrap`-Verhalten wie die bestehende
Hauptnavigation bei schmalen Fenstern, kein neues Verhalten).

Verifikation: `node --check` sauber auf `bereichsLeiste.js`; Live-Test via
den etablierten temporären Cache-Bust-Markern (`?vbl=1` auf `index.html`s
Script-Tag sowie den betroffenen `import`-Anweisungen in `app.js`/
`bereichsLeiste.js`, siehe Eintrag (39) für die Begründung des
Caching-Problems dieser Dev-Server-Umgebung) - alle Marker nach Test wieder
vollständig entfernt, per `grep -rn "vbl=1" js/ index.html` ohne Treffer
bestätigt.

---

## 2026-09-14 (39) – Navigation: Permanente Bereichs-Leiste & Visualisierungs-Galerie (Pilot: Urkunden)

Dateien: `js/config/archivalienRegistry.js`, `js/core/app.js`, neu `js/core/bereichsLeiste.js`,
neu `js/core/visualisierungsGalerie.js`, neu `js/utils/vizIcons.js`, `css/layout.css`,
`css/components.css`, `index.html`; entfernt `js/core/kachelauswahl.js`.

- **Punkt 0 (Bestandsaufnahme):** 21 tatsächlich unter `urkunden.ansichten` registrierte
  Module gemeldet und gegen `js/viz/` abgeglichen (keine Karteileiche) - siehe Selbstauskunft
  im Chat für die vollständige Liste.
- **Selbst gefundener Registrierungsfehler:** `bubbleChart.js` erwartet laut eigenem
  Dateikopf-Kommentar `personenliste.csv`-Records, stand aber unter `urkunden.ansichten` und
  bekam dadurch `urkunden.csv`-Records - live geprüft: das größenbestimmende Feld
  `anzahl_nennungen` existiert dort nicht, alle 1069 Kreise erschienen dadurch gleich groß
  (unbenutzbar). Mit personenliste.csv (4116 Records) ergeben sich dagegen 18 sinnvoll
  unterschiedliche Größen. Behoben: `bubbleChart` von `urkunden.ansichten` nach
  `personen.ansichten` verschoben (reine Registry-Zuordnung, wie beim früheren Präzedenzfall
  familienbaum/personenliste) - Urkunden-Galerie zeigt dadurch 20 statt 21 Kacheln.
- **Punkt 1 (permanente Bereichs-Leiste):** `js/core/kachelauswahl.js` (einmalige
  "Kachel wählen, dann verschwindet sie"-Landingpage) entfernt, ersetzt durch
  `bereichsLeiste.js` - rendert die vier Archivalientypen als dauerhaft sichtbare Leiste
  (Muster wie `.haupt-navigation`, `aria-current` auf dem aktiven Bereich), solange
  `renderVisualisierungenTab()` läuft - unabhängig davon, ob/welcher Bereich gewählt ist.
  `#app-content`s Grid bekam dafür eine zusätzliche erste Zeile (`css/layout.css`), alle
  bisherigen Zeilen um eins verschoben - auf dem Bestand-Tab (keine Bereichs-Leiste dort)
  bleibt diese Zeile leer und wirkt sich nicht aus.
- **Punkt 2 (Galerie-Seite, Pilot Urkunden):** `visualisierungsGalerie.js` (neu) zeigt jede
  Urkunden-Visualisierung als Kachel (Name, Kurztext, Icon). `archivalienRegistry.js` bekam
  dafür `hatGalerie: true` bei `urkunden` (bei den übrigen drei weiterhin `undefined`/falsy =
  unverändertes Verhalten, Nicht-Ziel) sowie ein `beschreibung`-Feld je Urkunden-Ansicht. Die
  vom Auftraggeber gelieferten Texte wurden vor Übernahme gegen den echten Modul-Code geprüft
  (Auftrag, wörtlich: "Abweichungen zurückmelden statt unpassend zu übernehmen") - 5 von 11
  vorläufigen Texten waren sachlich ungenau bzw. falsch und wurden korrigiert:
  - Marimekko: nannte die namensgebende zweite Achse (Jahrhundert/Spaltenbreite) nicht.
  - Alluviales Diagramm: tatsächlich zwei Spalten (Jahrhundert↔Kategorie), nicht "mehrstufig"
    und nicht "weitere Merkmale".
  - Parallelkoordinaten: nur 3 von 4 Achsen sind numerisch (die vierte, Kategorie, ist
    kategorial).
  - Chord-Diagramm: zeigt Personen-Ko-Nennungen (wie Adjazenzmatrix), nicht
    "Kategorienkombinationen".
  - Arc-Diagramm: Personen nach Verbindungsgrad angeordnet, nicht chronologisch.

  Für `urkunden` entfällt die "Ansicht"-Dropdown-Leiste (`ansichtWechseln.js`) vollständig
  (Auftrag, wörtlich) - eine geöffnete Einzel-Visualisierung zeigt stattdessen einen
  "← Zurück zur Übersicht"-Link (`erzeugeGalerieRueckweg()`) im selben Grid-Slot.
- **Punkt 3 (Icons):** `vizIcons.js` (neu) - ein generisches SVG-Schema je Diagrammtyp,
  `currentColor`-basiert, unabhängig von echten Projektdaten. Konzept vorab per Widget
  gezeigt und freigegeben (siehe Chat).
- **Punkt 4 (Direktlinks):** eine 3-Segment-Route (`#visualisierungen/urkunden/<id>`) landet
  direkt bei der jeweiligen Visualisierung, ohne Umweg über die Galerie - live geprüft u.a.
  für Sankey (Direktlink rendert 141 Bänder sofort, Rückweg-Link vorhanden).
- `handleRouteChange()`s Schnellpfad (kein voller Neuaufbau bei Ansichtswechsel innerhalb
  desselben Bereichs) gilt jetzt nur noch für NICHT-Galerie-Bereiche (er setzt
  `ansichtWechseln` voraus, das es bei `hatGalerie`-Bereichen nicht mehr gibt) - Galerie
  <-> Einzel-Visualisierung läuft für `urkunden` daher immer über den vollständigen
  `raeumeSeiteAuf()`+`renderTab()`-Neuaufbau; live geprüft, keine Beeinträchtigung der
  Bereichs-Leisten-Durchgängigkeit (synchroner Neuaufbau, kein wahrnehmbares Flackern).
- Bürgerbuch/Verlassenschaften/Personen live nachgeprüft: unverändertes Verhalten (Klick auf
  den Bereich springt weiterhin direkt zur Primäransicht, Ansicht-Dropdown weiterhin vorhanden) -
  Nicht-Ziel dieses Auftrags eingehalten.

---

## 2026-09-14 (38) – Sankey: Zählbasis vereinheitlicht, Bündelung korrigiert, Interaktion umgebaut

Datei: `js/viz/sankey.js`.

- **Punkt 0 (Zählbasis, Root-Cause-Befund):** live geprüft gab es tatsächlich
  drei abweichende Zählmethoden - Balkenhöhe (`summeAnzahl(links,...)`,
  Bandbreiten-Summe), der bisherige Tooltip-Wert (eindeutige Urkunden je
  Erst-Kategorie) und die Bündelungsschwelle aus Eintrag (37)
  (Gesamt-Nennungshäufigkeit über ALLE Kategorien einer Urkunde). Balkenhöhe
  und Tooltip beruhten beide bereits auf `ersteKategorie()`, unterschieden
  sich nur in der Aggregation (eine Urkunde mit mehreren Top-Orten zählt für
  JEDES ihrer Kategorie-Ort-Paare, "Politik": 331 eindeutige Urkunden vs. 417
  Bandbreiten-Summe) - für "Gesundheit"(7)/"Wirtschaft"(1) macht das keinen
  Unterschied. Einheitliche Zählbasis: die Bandbreiten-Summe
  (`summeAnzahl()`) - strukturell ohnehin für die Balkenhöhe nötig (Bänder
  müssen die Knotenhöhe exakt ausfüllen) - jetzt auch für Tooltip UND
  Bündelungsschwelle verwendet.
- **Punkt 1 (Andere-Kategorien-Schwelle neu):** mit der einheitlichen Summe
  bleibt "Bildung und Erziehung" (12, mehrere Top-Orte pro Urkunde) diesmal
  UNGEBÜNDELT, anders als in Eintrag (37). Neu gebündelt (6, alle <10):
  Gesundheit(7), Kultur(6), Grund und Boden(4), "Verkehr, Ver- und
  Entsorgung"(1), Medien(1), Wirtschaft(1) - live verifiziert per Tooltip.
- **Punkt 2 (Mindest-Klickfläche):** `zeichneKnotenSpalte()` zeichnet jetzt
  zwei Rechtecke je Knoten - das sichtbare (`pointer-events:none`) und ein
  unsichtbares, mindestens `MIN_KLICKFLAECHE_HOEHE` (10px) hohes Hit-Rechteck
  darüber, das alle Interaktion trägt. Live geprüft: kleinste Hit-Höhe = 10px
  unabhängig vom tatsächlich dünnsten Balken.
- **Punkt 3 (Unsicherheits-Kennzeichnung korrigiert):** die gestrichelte
  Randmarkierung hing bisher an `unsicherAnzahl` (Datierungs-Unsicherheit
  einzelner Urkunden - ein anderes Feld) und erschien dadurch an vielen
  Bändern. Jetzt ausschließlich an Bändern mit `von==="(ohne Kategorie)"`
  oder `nach==="(kein Ort)"`. Live verifiziert: bei aktivem Toggle exakt 8
  von 100 Bändern gestrichelt, alle nachweislich zu einem der beiden
  Unsicherheits-Knoten.
- **Punkt 4 (Orte-Schwelle + Label-Fix):** die PAVA-Korrektur aus Eintrag
  (37) lief bereits spaltenneutral für beide Spalten - der im Screenshot
  sichtbare Versatz kam von der glatt abfallenden "Top 20"-Verteilung ohne
  große Lücken, nicht von einer fehlenden Anwendung. `TOP_ORTE_ANZAHL`
  (fest 20) entfällt zugunsten von `ORT_BUENDELUNG_SCHWELLE` (15, analog zu
  Kategorien) - von 256 Orten bleiben nur noch 13 einzeln sichtbar (Wien 297
  bis Dürnstein 15), alle übrigen 243 unter "Andere Orte". Live verifiziert:
  0 Überlappungen/0 Out-of-Bounds über 6 Fenstergrößen, "Wien"/"Krems"/
  "Andere Orte" jetzt mit 0px Versatz. "Andere Orte"-Tooltip zeigt aus
  Platzgründen nur die häufigsten 15 Bestandteile plus "… und 228 weitere"
  (eigene, transparent dokumentierte Kappung - 243 Namen wären unlesbar).
- **Punkt 5 (Klick auf Balken fixiert Hervorhebung):** Knotenklick verhält
  sich jetzt wie Knoten-Hover (nur die zugehörigen Bänder hervorgehoben),
  fixiert diesen Zustand aber über `instanz.auswahl` (`schalteKnotenAuswahl()`,
  Knoten-Äquivalent zu `schalteLinkAuswahl()` aus Eintrag (37)). Öffnet keine
  Sidebar mehr. Da dadurch KEINE Interaktion in diesem Modul mehr die
  Urkunden-Sidebar erreicht, wurde deren gesamte Verdrahtung
  (`baueSidebarGeruest()`/`zeigeUrkundenSidebar()`/`fuegeSidebarStyleEin()`)
  hier entfernt (sidebar.js selbst unverändert, weiterhin von fünf anderen
  Bestand-Modulen genutzt) - ebenso `urkundenNachKategorie`/
  `urkundenNachOrtBucket`/`link.eintraege` (nur für die Sidebar befüllt,
  nirgends sonst gelesen). Live verifiziert: Klick auf "Politik" hebt alle
  13 zugehörigen Bänder hervor, bleibt nach `mouseleave` bestehen, Klick auf
  freie Fläche setzt zurück.

---

## 2026-09-14 (37) – Sankey: Label-Bug, Kategorien-Bündelung, Unsicherheiten-Toggle

Datei: `js/viz/sankey.js`.

- **Punkt 1 (Label-Bug, Root Cause):** live mit getBBox()/Attributauslesung
  nachgestellt. Ursache war NICHT die vermutete veraltete Knotenhöhen-
  Berechnung (Labels nutzten bereits dieselbe, aktuelle Positions-Map wie die
  Knoten), sondern ein Fehlverhalten des Zwei-Pass-Kollisionsausgleichs aus
  Eintrag (36) selbst: (a) er erzwang ab der ersten Kollision einen
  durchgehenden Mindestabstand bis zum Spaltenende, wodurch bei der stark
  ungleich verteilten Kategorie-Spalte (Knotenhöhen 137px bis 0,3px) die
  erzwungene Gesamtspanne (516px) unnötig weit über die natürliche Spanne
  (413px) hinauswuchs; (b) die dadurch ausgelöste Rand-Rettung verteilte
  bislang ALLE Label der Spalte gleichmäßig über die gesamte Höhe - auch
  längst unkritische Label wie "Politik"/"Rechtswesen", deren Position dabei
  bis zu 235px von der echten Knotenmitte abwich. Fix: `ordneLabelsAn()`
  nutzt jetzt PAVA (Pool Adjacent Violators Algorithm) statt der reinen
  Verschiebung - poolt nur tatsächlich kollidierende Nachbarn zu einem
  gemeinsamen Mittelwert, alle übrigen Label bleiben exakt auf ihrer
  Knotenmitte; der abschließende Randausgleich verschiebt die Spalte
  außerdem nur noch minimal statt sie unconditional auf den oberen Rand zu
  verankern. Live verifiziert (900×500): "Politik"/"Rechtswesen"/"Religion"/
  "Bevölkerung" jetzt mit 0px Versatz, nur der eng gepackte untere Cluster
  bekommt (korrekt) eine Führungslinie. 0 Überlappungen/0 Out-of-Bounds über
  6 Fenstergrößen (300-900px Höhe, 600-1200px Breite) erneut bestätigt.
- **Punkt 2 (Andere-Kategorien-Bündelung):** Kategorien mit einer
  GESAMT-Nennungshäufigkeit unter 10 (jede Kategorie, die irgendwo im
  Mehrfachwert-Feld einer Urkunde auftaucht, pro Urkunde höchstens einmal
  gezählt - bewusst eine andere Zählbasis als die Erst-Kategorie-Häufigkeit,
  die die eigentlichen Sankey-Knoten bestimmt) werden zu einem Knoten
  "Andere Kategorien" gebündelt. Tooltip listet die enthaltenen Kategorien
  einzeln mit Anzahl (live geprüft: "Bildung und Erziehung: 8", "Kultur: 5",
  "Grund und Boden: 2", "Verkehr, Ver- und Entsorgung: 1", "Medien: 1",
  zusammen 17 von 1069 Urkunden). Abweichung vom Auftrag, transparent: die
  dort genannte "Privatvermögen" kommt in urkunden.csv KEIN einziges Mal als
  ERSTE Kategorie einer Urkunde vor (nur einmal als zweitgenannte, neben
  "Grund und Boden") - unter der seit Eintrag (vor 36) etablierten Regel
  "eine Urkunde -> ihre jeweils erste Kategorie" existiert dafür kein
  eigener Sankey-Knoten, der gebündelt werden könnte; es werden daher exakt
  5 statt der genannten 6 Kategorien gebündelt. "Gesundheit" (Gesamt-
  Nennungshäufigkeit 11) bleibt wie gefordert eigenständig sichtbar.
- **Punkt 3 (Unsicherheiten-Toggle):** "(ohne Kategorie)"/"(kein Ort)" (samt
  ihrer Links) werden nur noch bei aktivem app-weitem Unsicherheiten-Button
  gezeichnet (`options.showUncertainty`). Die Top-Orte-Auswahl bleibt davon
  unabhängig (zählt weiterhin über alle Urkunden), damit sich beim
  Umschalten nur Sichtbarkeit, nicht die Ort-Auswahl selbst ändert. Live
  verifiziert: 11 Kategorie-Knoten ohne Toggle, 12 mit Toggle (inkl. "(ohne
  Kategorie)"), wieder 11 nach erneutem Umschalten - keine Sprünge in der
  übrigen Darstellung.
- Punkt-2-Klickfixierung/Hover aus Eintrag (36) per dispatchEvent erneut
  regressionsgeprüft (Bandklick fixiert 1 Band hervorgehoben/127 abgeblendet,
  Escape setzt alle 128 Bänder zurück auf Normalopazität) - unverändert
  funktionsfähig nach der `baueSankeyDaten()`-Signaturänderung.

---

## 2026-09-12 (36) – Sankey: Beschriftungen und Klickinteraktion überarbeitet

Datei: `js/viz/sankey.js`.

- **Punkt 1 (Beschriftung):** die bisherige "Knoten unter Mindesthöhe bekommt
  gar kein Label"-Regel entfällt - jetzt bekommen ALLE 16 Kategorie- und alle
  22 Ort-Knoten ein Label. Ausgangspunkt ist die echte Knotenmitte, ein
  Zwei-Pass-Kollisionsausgleich (`ordneLabelsAn()`, analog zu bumpChart.js)
  verschiebt bei Bedarf; bei tatsächlicher Verschiebung >4px verbindet eine
  dünne gestrichelte Führungslinie Label und Knotenmitte (37 von 38 Labels
  bei der aktuellen Datenlage betroffen). Kürzung läuft jetzt über
  `js/utils/beschriftung.js`' `ermittleBeschriftungstext()` (echte
  Pixelbreite statt fester Zeichenzahl); der volle Name bleibt im Tooltip.
  Kategorie-Spalte bekam einen deutlich großzügigeren äußeren
  Beschriftungsbereich (180px vs. 110px bei Orten) - live geprüft: bei
  aktueller Datenlage bleiben 15 von 16 Kategorienamen vollständig
  unbeschnitten (nur "Verkehr, Ver- und Entsorgung" wird gekürzt),
  Schriftgrößen-Reduktion (13→11px) ist ausschließlich für die Ort-Spalte
  vorgesehen und nur als rechnerischer Fallback bei zu wenig Höhe aktiv.
  **Zwei Root-Cause-Funde während der Implementierung, beide vor Auslieferung
  behoben:** (a) eine JavaScript-Falle, bei der eine Variable innerhalb der
  Schleife, die sie selbst noch als Referenzwert braucht, bereits überschrieben
  wurde (führte zu einer sich aufschaukelnden Fehlberechnung, Labels ragten bis
  zu 104px unter die SVG-Höhe hinaus); (b) eine rein proportionale Stauchung
  drückte bereits korrekt auf Mindestabstand stehende Label-Paare UNTER diesen
  Abstand - durch eine gleichmäßige Verteilung als Fallback ersetzt, die
  garantiert keine zwei Labels enger als alle anderen zusammenrückt. Beide
  live an einer eigens dafür gebauten Testschleife über 6 verschiedene
  Fenstergrößen (300-1600px Höhe) verifiziert: 0 Überlappungen, 0 aus der
  viewBox ragende Labels bei allen realistischen Höhen (Modul-Minimum 500px);
  nur bei der künstlich extremen Testgröße 300px (unterhalb des tatsächlichen
  Minimums, kommt in der App nie vor) bleibt ein geometrisch unvermeidbarer
  Rest-Überlapp bei den Ort-Labels, transparent als bekannte Grenze notiert.
- **Punkt 2 (Klick-Fixierung):** Klick auf ein Band fixiert jetzt dauerhaft
  dessen Hervorhebung (Band + beide Endknoten auf voller Opazität, alle
  anderen Bänder/Knoten/Labels abgeblendet) - bleibt nach `mouseleave`
  bestehen, öffnet keine Sidebar mehr, `event.stopPropagation()` verhindert
  ungewolltes Auslösen des Hintergrund-Resets. Erneuter Klick auf dasselbe
  Band, Klick auf die freie Fläche oder Escape setzen zurück; Klick auf ein
  anderes Band ersetzt die Auswahl. Ein gemeinsamer Zustand
  (`instanz.auswahl`/`instanz.hover`, ausgewertet in einer zentralen
  `aktualisiereHighlight()`) wird von Link- UND Knoten-Interaktion genutzt -
  Knotenklick bleibt dabei bewusst unverändert (öffnet weiterhin nur die
  Urkunden-Sidebar, live erneut bestätigt: Klick auf "Politik" zeigt 331
  Urkunden), Hover bleibt temporär und wird von einer fixierten Auswahl
  automatisch überschrieben/ignoriert (live geprüft: Hover auf einen anderen
  Knoten ändert die fixierte Hervorhebung nicht).
- **Live-Verifikation:** alle Zustandsübergänge (Klick/Toggle/Ersetzen/
  Hintergrund/Escape/Knotenklick-unverändert/Hover-Suspendierung) einzeln per
  dispatchEvent nachgestellt und die resultierenden `fill-opacity`-Werte
  geprüft, 0 Konsolenfehler, Screenshot mit vollständiger, überlappungsfreier
  Beschriftung oben im Chat gezeigt.

---

## 2026-09-12 (35) – Sankey konsolidieren, Beschriftung vergrößern, Layout-Fixes

**Vorab-Check-Ergebnis (wie angefordert zuerst geprüft):** Ja, es gab tatsächlich
noch eine eigenständige, separat registrierte "alte" Sankey-Ansicht - die
ursprüngliche Drei-Stufen-Darstellung (Jahrhundert→Kategorie→Datierungspräzision)
in `js/viz/sankey.js` war weiterhin unter `urkunden.ansichten` als eigener
Menüpunkt "Sankey" sichtbar, GLEICHZEITIG neben "Kategorien ↔ Orte"
(`kategorienOrteSankey.js`, das seit dem vorletzten Auftrag nur deren vier
generische Bausteine aus `sankey.js` importierte). Beide waren im
Urkunden-Dropdown parallel anwählbar.

Konsolidierung (Punkt 1): Die alte Drei-Stufen-Ansicht ist ersatzlos entfernt
(kein zweiter Nutzer für Jahrhundert-/Präzisionsstufen, `PRAEZISIONS_LABEL`/
`anzeigeName()` mit ihr entfallen). `kategorienOrteSankey.js` wurde nach
`js/viz/sankey.js` verschoben/umbenannt und ersetzt dort den alten Inhalt
vollständig; die vier Bausteine (`stapleSpalte`/`baueRibbonPfad`/
`zeichneVerbindungsEbene`/`zeichneKnotenSpalte`) sind jetzt wieder normale
modul-private Funktionen (kein Export mehr nötig, nur noch ein Nutzer).
Registry: einziger verbleibender Eintrag `{ id: 'sankey', label: 'Sankey',
modulPfad: '../viz/sankey.js' }` unter `urkunden.ansichten` - grep bestätigt
0 verbliebene Importe der alten Exporte, 0 Referenzen auf
`kategorienOrteSankey.js`, Datei gelöscht.

- **Punkt 2 (abgeschnittene Kategorien):** zwei Root Causes gefunden und
  behoben. (a) `hoehePlot` kam bisher aus `container.clientHeight`/festem
  600px-Minimum statt aus der echten verfügbaren Bildschirmhöhe - jetzt über
  `viewportGroesse.js` (analog zu trellis.js). (b) schwerwiegender: die
  Stapel-Funktion addiert pro Knoten zusätzlich 3px Abstand, den die
  bisherige `skala = hoehePlot / Summe`-Formel nirgends einplante - bei 16
  Kategorie- bzw. 22 Ort-Knoten macht das 48px bzw. 66px zusätzliche Höhe,
  die strukturell IMMER über `hoehePlot` hinausragte (live am DOM
  nachgewiesen: "Verwaltung"-Knoten lag außerhalb der SVG-viewBox). Fix:
  `skala` wird jetzt für beide Spalten getrennt unter Abzug ihres jeweiligen
  Abstands-Verbrauchs berechnet, der kleinere (strengere) Wert gewinnt. Live
  verifiziert bei drei Fenstergrößen (1280×900, ×800, ×650 mit greifendem
  500px-Mindesthöhen-Fallback): größter Knoten-Rand jeweils ≤ SVG-Höhe.
- **Punkt 3 (Titel kürzen):** Titel jetzt nur "Kategorie → Ort", der
  Erklärsatz darunter entfällt. Geprüft: der bestehende Info-Button-Text
  deckt alle drei entfernten Aussagen bereits ab (keine Änderung dort nötig).
- **Punkt 4 (Beschriftung vergrößern):** Schriftgröße 9→13px (Faktor 1,44).
  Zwei live entdeckte Folgeprobleme direkt behoben, bevor sie ausgeliefert
  wurden: (a) die auf 13 Zeichen zunächst beibehaltene Kürzungsgrenze ließ
  "Vermögen un…" auf ~94px Breite wachsen und über den linken 90px-Rand
  hinausragen (führendes "V" von der SVG-viewBox abgeschnitten, live per
  `getBBox()` gemessen) - auf 10 Zeichen reduziert, seither 0 Labels
  außerhalb der viewBox. (b) sehr kleine Knoten (z.B. "Wirtschaft" mit nur
  1 Urkunde) sind bei jeder Schriftgröße schmäler als eine Beschriftungszeile
  - Knoten unterhalb einer Mindesthöhe (17px) bekommen deshalb kein
  Text-Label (Klick/Tooltip/Hervorhebung bleiben erreichbar), statt einer
  vollen Kollisionsvermeidung wie beim Bump Chart (vom Auftrag als
  gleichwertige Alternative genannt). Live per `getBBox()` verifiziert: 0
  überlappende Labels auf beiden Seiten bei aktueller Datenlage.
- **Live-Verifikation:** 0 Konsolenfehler, Klick-Sidebar/Hover-Hervorhebung
  nach der Konsolidierung erneut funktionsfähig (Politik → 331 Urkunden,
  unverändert), Registry-Dropdown zeigt genau einen "Sankey"-Eintrag,
  Screenshot mit allen Kategorien vollständig sichtbar und größerer
  Beschriftung oben im Chat gezeigt.

---

## 2026-09-12 (34) – Kategorien-Orte-Sankey an Alpha-Vorbild angleichen

Dateien: `js/viz/kategorienOrteSankey.js` (alle vier Punkte), `js/viz/sankey.js`
(`zeichneKnotenSpalte()` von einem einzelnen optionalen Klick-Parameter auf ein
Optionen-Objekt erweitert - abwärtskompatibel, alle drei bestehenden Aufrufer
dort unverändert). Nicht-Ziel eingehalten: keine Änderung an der Datenlogik
(16 Kategorien links, Top-20-Orte+Andere rechts, Bandbreite=Anzahl).

- **Punkt 1 (Titel/Untertitel):** feste, wörtlich vorgegebene Texte oberhalb
  des Diagramms ("Kategorie → Ort: Fluss der Urkundenerwähnungen" fett,
  Untertitel normal).
- **Punkt 2 (Verbindungs-Zähler):** "X Verbindungen" oben rechts, live aus
  `links.length` - geprüft: 141 Verbindungen, exakt gleich der tatsächlich
  gezeichneten `<path class="sankey-band">`-Anzahl.
- **Punkt 3 (Hover-Hervorhebung):** Hover/Fokus auf einen Kategorie- ODER
  Ort-Knoten hebt dessen Bänder auf fill-opacity 0,85 an, alle übrigen fallen
  auf 0,06 (kaum sichtbares Hintergrundmuster) - dasselbe Hover-setzt-
  Zustand/zentrale-Funktion-zeichnet-neu-Prinzip wie familienbaum.js/
  bumpChart.js. Tooltip zeigt die Urkunden-Gesamtzahl des Knotens. Root-Cause
  einer dabei entdeckten Inkonsistenz behoben, bevor sie live ging: die für
  die Spalten-Stapelhöhe berechnete Summe zählt eine Urkunde mit mehreren
  Orten mehrfach (Politik zunächst fälschlich 417 statt 331) - der Tooltip
  zählt stattdessen über dieselbe deduplizierte Liste wie die Klick-Sidebar,
  beide zeigen jetzt garantiert dieselbe Zahl (live geprüft: Politik 331/331,
  Wien 297, Religion 176 - jeweils Tooltip = Sidebar-Anzahl).
- **Punkt 4 (Kategorie-Farben):** war bereits seit dem vorigen Auftrag über
  `CAT_COLORS` gesetzt, hier erneut geprüft und bestätigt (keine Code-Änderung
  nötig) - live: Knoten "Politik" `#23953f`, exakt `CAT_COLORS['Politik']`.
- **Live-Verifikation:** 0 Konsolenfehler, Hover-Test an drei Knoten
  (Politik/Wien/Religion) inkl. Vorher-Nachher-Opazitäts-Messung und
  Tooltip-Text, Screenshot direkt vergleichbar mit dem Alpha-Referenzbild
  (Titel/Untertitel/Zähler/Diagramm im selben Ausschnitt) oben im Chat
  gezeigt.

---

## 2026-09-12 (33) – Bipartiter Graph → Urkunden (Sankey), Personennetzwerk → Bürgerbuch, Trellis/Bump-Chart-Korrekturen

Dateien: `js/viz/kategorienOrteSankey.js` (neu, ersetzt `js/viz/bipartiterGraph.js`
- gelöscht, siehe unten - unter `urkunden.ansichten`), `js/viz/personennetzwerk.js`
(Umzug Urkunden→Bürgerbuch, inhaltlich neu: Bürgschafts- statt Ko-Nennungs-Netzwerk),
`js/viz/sankey.js` (vier Bausteine exportiert, `zeichneKnotenSpalte()` um optionalen
Klick-Parameter erweitert), `js/utils/buergerbuchZeit.js` (Bürgschaftsnetzwerk-
Aufbereitung ergänzt, vom alten `bipartiterGraph.js` übernommen), `js/utils/
urkundenPersonen.js` (REGRESSIONSSCHUTZ-Kommentar korrigiert), `js/viz/trellis.js`
(Vollbild-Vergrößerung), `js/viz/bumpChart.js` (Führungslinien-Fix),
`js/config/archivalienRegistry.js`.

- **Punkt 1 (Sankey Kategorien↔Orte, neu unter Urkunden):** Aufwandseinschätzung
  wie angefragt: eine einzelne Kategorie→Ort-Verbindungsebene ist strukturell
  identisch zu einer der beiden Ebenen, die `sankey.js` bereits zeichnet - die
  vier generischen Bausteine (`stapleSpalte`/`baueRibbonPfad`/
  `zeichneVerbindungsEbene`/`zeichneKnotenSpalte`) wurden dort exportiert und
  hier wiederverwendet statt neu geschrieben, deutlich weniger Aufwand als ein
  eigenständiger Nachbau. `zeichneKnotenSpalte()` bekam dafür einen
  abwärtskompatiblen optionalen Klick-Parameter. Neuer Dateiname statt
  Weiterverwendung von `bipartiterGraph.js`, weil die VisualisierungsART sich
  ändert (kein Bipartiter Graph mehr) - Begründung siehe dortiger Dateikopf-
  Kommentar. 16 Kategorien + "(ohne Kategorie)" (14 von 1069 Urkunden, nicht
  stillschweigend ausgeblendet) links, die 20 häufigsten von 256 tatsächlich
  vorkommenden Orten + "Andere Orte" + "(kein Ort)" (30 Urkunden ohne
  Ortsangabe) rechts. Bandbreite = Anzahl eindeutiger Urkunden je Kategorie-
  Ort-Paar (ein Set pro Urkunde, keine Mehrfachzählung bei mehreren Orten im
  selben Bucket). Farbe nach `CAT_COLORS`. Klick auf Band ODER Knoten öffnet
  die bestehende Urkunden-Sidebar (`zeigeUrkundenSidebar()`) - live geprüft:
  "Wien"-Knoten zeigt 297, "Politik"-Knoten 331, "Religion → Andere Orte"-Band
  70 Urkunden (alle drei Werte stimmen mit einer unabhängigen Node-Zählung
  überein). Info-Button-Text ist ein Vorschlag, noch nicht freigegeben.
- **Punkt 2 (Personennetzwerk → Bürgerbuch):** zeigt jetzt Bürgschafts- statt
  Ko-Nennungs-Beziehungen (`buergen_id`), Knoten sind Personen unabhängig von
  ihrer Rolle (Bürger/Bürge). Übersicht ohne Auswahl: die 15 am dichtesten
  vernetzten Personen PLUS deren direkte Nachbarn (76 von 762 Personen, 68 von
  539 eindeutigen Beziehungen - eine reine Top-15-ohne-Nachbarn-Auswahl hätte
  dagegen nur 3 von 68 Kanten gezeigt, live geprüft, da sich die meisten
  Bürgen nicht gegenseitig verbürgen). Klick auf eine Person ODER die
  wiederverwendete Namenssuche (aus dem vorigen `bipartiterGraph.js`
  übernommen, jetzt in `buergerbuchZeit.js`) zeigt ihr vollständiges
  induziertes Ego-Netzwerk - live geprüft an "Martin Kagerer"/"Jacob Anndre":
  je 9 Beziehungen, 10 Personen. Farbe nach Wirtschaftssektor
  (`buergerbuchZeit.js`' `baueSektorFarbSkala()`, live als identisch mit
  Trellis/Bump-Chart bestätigt: "Metall & Waffen" überall `#6292da`).
  Unsicherheits-Kennzeichnung (`zuordnung_sicher`) live an einem bekannten
  Fall (Hanns Khunis ↔ Jakob Sporer) verifiziert.
- **Punkt 3 (Trellis vergrößern):** `js/utils/viewportGroesse.js` liefert jetzt
  die tatsächlich verfügbare Breite/Höhe, eine neue `ermittleSpaltenzahl()`
  wählt die Spaltenzahl so, dass das Panel-Seitenverhältnis einem Zielwert
  (1,73, dem bisherigen festen 260/150) möglichst nahekommt - Panelgröße
  ergibt sich danach aus verfügbarer Fläche ÷ Spalten/Zeilen (Untergrenze
  260×150 bleibt für sehr kleine Bildschirme). Live geprüft: bei 1600×1200
  Browserfenster wachsen die Panels auf 392×246px (+51 %/+64 % gegenüber
  vorher) in einem 4×4-Raster; bei knappen 1280×720 wählt der Algorithmus
  stattdessen mehr Spalten (5 statt 4), die Panelgröße bleibt dort an der
  Untergrenze (derselbe "MIN-Klemme + Seiten-Scroll-Fallback"-Kompromiss wie
  bei dotPlot.js/swimlanes.js).
- **Punkt 4 (Bump-Chart-Endbeschriftungen):** Root-Cause identifiziert (wie
  vom Auftrag vermutet): der Kollisions-Ausgleich aus dem vorigen Auftrag
  verschiebt nur die y-Position eines Labels, nie seine x-Position (bleibt am
  eigenen letzten Jahrzehnt der jeweiligen Linie) - bei Sektoren, die vor dem
  letzten Jahrzehnt (1620) enden (live geprüft: genau die fünf vom Auftrag
  genannten Sektoren, alle enden vor 1620), erzeugte das eine sichtbare
  Lücke zwischen Linienende und verschobenem Label. Fix: dünne, gleichfarbige
  Führungslinie vom tatsächlichen Linienende zum Label - live gemessen:
  Verschiebung 18-38px bei genau diesen fünf Sektoren (Führungslinie macht die
  Zuordnung eindeutig), 0px bei den übrigen elf (Führungslinie praktisch
  unsichtbar kurz). 0 überlappende Labels weiterhin bestätigt.
- **Registry/Aufräumen:** `bipartiterGraph.js` (Bürger-Bürge-Fassung) gelöscht,
  `personennetzwerk` von `urkunden.ansichten` nach `buergerbuch.ansichten`
  verschoben, `kategorienOrteSankey` neu unter `urkunden.ansichten`,
  `bipartiterGraph`-Eintrag unter `buergerbuch` entfernt. `urkundenPersonen.js`'
  REGRESSIONSSCHUTZ-Kommentar korrigiert (nur noch adjazenzmatrix.js/
  chordDiagramm.js/arcDiagramm.js als tatsächliche Nutzer).
- **Live-Verifikation:** alle vier Ansichten über die Registry-Dropdowns
  erreichbar (Urkunden: "Kategorien ↔ Orte" statt "Personennetzwerk"/
  "Bipartiter Graph"; Bürgerbuch: "Personennetzwerk" statt "Bipartiter
  Graph"), 0 Konsolenfehler in allen vier Modulen. grep bestätigt: keine
  funktionale Referenz auf `bipartiterGraph.js` mehr im Code (nur noch
  erklärende Kommentare zur Historie), kein Modul importiert versehentlich
  über die Bürgerbuch/Urkunden-Grenze hinweg.

---

## 2026-09-11 (32) – Bürgerbuch: Trellis (Umzug), Bump Chart (Neubau), Bipartiter Graph (Umzug)

Dateien: `js/viz/trellis.js` (Umzug Urkunden→Bürgerbuch), `js/viz/bipartiterGraph.js`
(Umzug Urkunden→Bürgerbuch, inhaltlich neu: Bürger-Bürge statt Personen-Urkunden),
`js/viz/bumpChart.js` (neu), `js/utils/buergerbuchZeit.js` (neu, gemeinsame
Zeit-/Sektor-Aufbereitung analog zu `urkundenZeit.js`, bewusst eigenständig
gehalten - siehe dortiger Dateikopf-Kommentar), `js/config/archivalienRegistry.js`
(`buergerbuch.ansichten` jetzt trellis/bumpChart/bipartiterGraph statt des
einzigen Platzhalter-Eintrags, analog zum früheren Personen-Umzug),
`js/viz/buergerbuchPlatzhalter.js` (gelöscht, dadurch unreferenziert).

- **Punkt 1 (Trellis):** ein Mini-Histogramm je Wirtschaftssektor (x=Jahr,
  y=Anzahl Bürgeraufnahmen, gemeinsame y-Skala), "Beruf nicht angegeben"
  (1250 von 2791 Einträgen) als eigenes, sichtbares Panel. Anders als beim
  bisherigen Urkunden-Trellis (50-Jahres-Bins wegen 736 Jahren Zeitspanne)
  hier ECHTE Jahresauflösung (ein Balken je Kalenderjahr) - data/
  buergerbuch.csv deckt nur 91 Jahre ab (1535–1625) und der Auftrag nennt
  wörtlich "X = Jahr" (siehe Dateikopf-Kommentar dort für die volle
  Begründung). Info-Button-Text ist ein VORSCHLAG, noch nicht freigegeben.
- **Punkt 2 (Bump Chart, Neubau):** eine Linie je Wirtschaftssektor über die
  Jahrzehnte, y=Rang nach Anzahl Bürgeraufnahmen (Rang 1=häufigster Sektor,
  "Beruf nicht angegeben" reguär mitgerankt). Nur Sektoren mit ≥1 Aufnahme
  in einem Jahrzehnt bekommen dort einen Rang - 0 Aufnahmen = Lücke in der
  Linie, nicht "letzter Rang". Endbeschriftungen kollisionsfrei per
  Sortier-und-Verschiebe-Ausgleich (`ordneLabelsAn()`, Mindestabstand 18px) -
  live geprüft: 0 überlappende Bounding-Boxen bei allen 16 Sektoren, kleinster
  Abstand 3px. Hover/Klick-Hervorhebung exakt nach familienbaum.js-Muster
  (Hover=temporär, Klick=eingefroren/bleibt nach mouseleave, Klick auf freie
  Fläche=zurückgesetzt) - live per dispatchEvent verifiziert. Unsicherheits-
  Ring auf Rang-Punkten (Datum_unsicher/Beruf_unsicher), über den bestehenden
  app-weiten Knopf umschaltbar.
- **Punkt 3 (Bipartiter Graph, Umzug + inhaltlich neu):** links aufgenommene
  Bürger, rechts ihre Bürgen (`buergen_id`), Farbe = Wirtschaftssektor des
  Bürgers. Root-Cause-Fund bei der Namensauflösung: `Buergen` (Namen) ist
  KOMMA-getrennt, `buergen_id` dagegen PIPE-getrennt (unterschiedliche
  CSV-Konvention derselben Zeile) - `ermittleBuergenNamen()` zerlegt `Buergen`
  deshalb selbst per Komma und paart positionsgleich (329 von 330 Zeilen mit
  Bürgen stimmen so exakt überein, 1 Ausnahme mit eingebettetem Komma im Namen
  bekommt den vollen String als Fallback). Statt der alten festen
  Top-25-Kappung jetzt echte Filter (Jahrzehnt/Sektor/Person) - Jahrzehnt ist
  STRUKTURELL nie auf "alle" stellbar (größte Einzeldekade 129 von 540, live
  geprüft), das garantiert unabhängig von der Sektor-Wahl, dass ohne
  Personen-Filter nie alle 540 Bürgschaften gleichzeitig sichtbar werden.
  Standard-Jahrzehnt wird programmatisch aus den tatsächlichen Daten ermittelt
  (aktuell 1560er, 129 Verbindungen), nicht hart codiert. Klick auf eine
  Person öffnet eine lokal gebaute Detailansicht in der bestehenden Sidebar
  (Muster: eigener Bürgerbuch-Eintrag falls vorhanden, sonst "kein eigener
  Eintrag" + Liste der Bürgschaften) - live geprüft für beide Fälle (Bürger
  mit eigenem Eintrag, reiner Bürge ohne eigenen Eintrag).
- **Farbkonsistenz (Akzeptanzkriterium):** alle drei Module nutzen
  `js/utils/buergerbuchZeit.js`' `baueSektorFarbSkala()` (baut auf der
  bereits bestehenden, generischen `kategorieFarben.js` auf, NICHT auf
  `CAT_COLORS` - das ist laut eigenem Kommentar dort eine feste,
  urkunden.csv-spezifische Taxonomie). Live geprüft: "Metall & Waffen" ist in
  allen drei Modulen `#6292da`, "Beruf nicht angegeben" überall `#8a8a8a`
  (`OHNE_KATEGORIE_FARBE`).
- **Live-Verifikation:** alle drei Ansichten über die Registry erreichbar
  (Dropdown zeigt Trellis/Bump Chart/Bipartiter Graph unter "Bürgerbuch"),
  0 Konsolenfehler, Filter/Hover/Klick/Sidebar/Unsicherheiten-Umschalter in
  allen drei Modulen einzeln durchgeklickt (siehe Selbstauskunft im Chat für
  Details je Punkt). grep bestätigt: kein verbliebener Import aus
  `urkundenZeit.js`/`CAT_COLORS` in den drei Bürgerbuch-Modulen, `trellis`/
  `bipartiterGraph` nicht mehr in `urkunden.ansichten` gelistet,
  `buergerbuchPlatzhalter.js` unreferenziert und gelöscht.

---

## 2026-09-11 (31) – Habsburg-Zeitleistenbaum: Kästchen-Größe, Regierungsbeginn, Namenskorrektur

Folgeauftrag zu Eintrag (30). Dateien: `js/viz/familienbaum.js` (alle drei
Punkte), `data/familien.csv` (Punkt 2, 3 Datumskorrekturen).

- **Punkt 1 (Größe):** `SCHRIFTGROESSE` 24→34, `PIXEL_PRO_JAHR` 20→13 als
  Gegengewicht (aus der vorgeschlagenen Spanne 12-14 gewählt, visuell
  getestet - 13 ergab bei 34px-Schrift ausgewogen proportionierte, deutlich
  gedrungenere Kästchen statt der vorherigen extremen Höhe). Kästchenbreite
  wächst automatisch mit (`berechneKastenbreite()` misst mit derselben,
  jetzt größeren Konstante) - Beispiel "Maria Theresia" (längster Name):
  167px → 351px. 0 Textüberläufe bei allen 75 Namen verifiziert.
- **Punkt 2 (Regierungsbeginn):** `herrschaft_von` in `familien.csv`
  korrigiert: `friedrich_iii` 1452→1440, `maximilian_i` 1508→1486, `karl_v`
  1520→1519 (Beleg jeweils im `titel`-Feld: "Röm.-dt. König (ab ...)" vor
  der Kaiserkrönung). Bei `karl_v` zusätzlich die nicht mehr nötige
  `unsicherheit_anmerkung` zur 1520/1530-Kaiserdatum-Ambiguität entfernt
  (das jetzt verwendete König-Datum 1519 ist eindeutig belegt). Keine
  Code-Änderung an `ermittleRegierungszeit()`/der Einfärbungslogik nötig -
  liest bereits unverändert aus `herrschaft_von`/`herrschaft_bis`. CSV
  weiterhin BOM-intakt, 0 CR, 19 Spalten pro Zeile (Node-Skript geprüft).
  **Aktualisierte Anteilsprozente (Regierungszeit ÷ Lebensspanne, dieselbe
  Jahres-Methode wie in Eintrag (26) verifiziert):**
  - Friedrich III.: Lebensspanne 1415–1493 (78 Jahre), Regierung 1440–1493
    (53 Jahre) → **67,9 %** (zuvor 52,6 % mit dem alten Kaiser-Datum 1452).
  - Maximilian I.: Lebensspanne 1459–1519 (60 Jahre), Regierung 1486–1519
    (33 Jahre) → **55,0 %**.
  - Karl V.: Lebensspanne 1500–1558 (58 Jahre), Regierung 1519–1558
    (39 Jahre) → **67,2 %**.
- **Punkt 3 (Namenskorrektur):** `ermittleKurzname()` schnitt Doppel-
  Vornamen (z.B. "Maria Theresia") fälschlich auf das erste Wort - keine
  der bestehenden Titel-/Präfix-Regeln war beteiligt (diese Funktion kannte
  nur "erstes Wort" + römische-Zahl-Sonderfall, anders als vom Auftrag
  vermutet). Neue Regel: das zweite Wort gehört zum Vornamen, wenn direkt
  danach eine Präposition (von/zu/de/...) folgt - das markiert eindeutig
  den Beginn des Herkunfts-/Familiennamen-Teils - ODER der Name einer der
  (laut Live-Prüfung gegen alle 80 `name`-Werte im Datensatz) einzige
  Doppelvorname ohne jeden nachfolgenden Teil ist ("Maria Theresia").
  Klammer-Zusätze ("Gertrud (Anna) von Hohenberg") und bloße Nachnamen ohne
  Präposition ("Viridis Visconti", "Bianca Anna Sforza") bleiben bewusst
  unverändert (0 falsch-positive Treffer). **12 von 80 Namen korrigiert**
  (Stichprobe der im Auftrag genannten Beispiele: "Maria Theresia" →
  vollständig; "Eleonore Magdalene" [von Pfalz-Neuburg] → vollständig
  korrigiert, war zuvor nur "Eleonore"; zusätzlich u.a. "Elisabeth
  Christine", "Maria Anna", "Elisabeth Richza", "Wilhelmine Amalie",
  "Johanna Sophie", "Claudia Felicitas", "Margareta Theresia", "Maria
  Josepha", "Maria Leopoldine" korrigiert).

**Live-Verifikation:** 75 Boxen weiterhin vorhanden, `font-size="34"`, 0
Textüberläufe. Popover-Felder für Friedrich III. (die echte Kaiser-Person,
nicht die gleichnamige Nebenperson "Friedrich III. von Österreich
(1347–1362)" - Namensgleichheit bereits vor diesem Auftrag bestehend, kein
neues Problem), Maximilian I. und Karl V. zeigen die korrigierten
Herrschaftszeiträume (1440–1493 / 1486–1519 / 1519–1558). Echter Screenshot
im Chat geliefert. grep-verifiziert: keine alten Werte (`SCHRIFTGROESSE =
24`, `PIXEL_PRO_JAHR = 20`, alte CSV-Jahreszahlen 1452/1508/1520) mehr im
Code bzw. in der CSV vorhanden.

---

## 2026-09-11 (30) – Habsburg-Zeitleistenbaum: Klick-Popup verschiebt Ansicht, größere Beschriftung

Folgeauftrag zu Eintrag (29), einzige geänderte Datei `js/viz/familienbaum.js`.

- **Punkt 1 (Popup verschiebt Ansicht):** Konkrete Ursache per Live-Messung
  identifiziert (nicht nur vermutet): `zeigePersonenPopover()` berechnete
  die Popup-Position aus `ankerElement.getBoundingClientRect().bottom` -
  `ankerElement` ist die komplette Personen-`<g>`, deren Bounding-Box bei
  langlebigen Personen (seit Eintrag (29)s `PIXEL_PRO_JAHR` 5→20 plus
  Wegfall des Höhen-Auto-Fits) weit über den Viewport hinausragen kann.
  Gemessenes Beispiel: Rudolf I. (73 Lebensjahre) ergab bei Zoom-Skala 0,61
  ein 892px hohes Kästchen auf einer 705px hohen Ansicht -
  `rect.bottom≈1126`, weit unterhalb des Sichtbaren. Das Popup wurde exakt
  dort positioniert; das anschließende `popover.focus()` (ohne
  `{ preventScroll: true }`) löste daraufhin Browser-Standardverhalten aus:
  die ganze Seite scrollte so weit nach unten, bis das neu eingefügte,
  fokussierte Popup sichtbar wurde (gemessen: `window.scrollY` 0→540,
  `document.documentElement.scrollHeight` 972→1490) - exakt der im Auftrag
  beschriebene "nur noch schmaler Streifen sichtbar"-Sprung. Zwei
  unabhängige Fixes: die Anker-Ober-/Unterkante wird vor der
  Positionsberechnung auf den aktuell sichtbaren Viewport-Bereich geklemmt
  (springt bei zu wenig Platz unterhalb automatisch oberhalb des Ankers
  auf), UND jeder `.focus()`-Aufruf im Popover-Code (Öffnen,
  Schließen-Button, Escape) bekommt zusätzlich `{ preventScroll: true }`
  als unabhängige zweite Absicherung.
- **Punkt 2 (größere Namensbeschriftung):** `SCHRIFTGROESSE` 11→24 (mehr
  als verdoppelt). Keine weitere Logikänderung nötig: `berechneKastenbreite()`
  (bereits aus Eintrag (28)) misst mit derselben Konstante, die
  Kästchenbreite wächst automatisch mit (Test: 85px→167px bei "Rudolf I.").

**Live-Verifikation:** Vor/Nach-Vergleich bei echtem Klick auf "Rudolf I."
- SVG-`getBoundingClientRect()` UND `window.scrollY`/`scrollX` exakt
identisch vor und nach dem Klick (`identisch: true` im Testskript), Popup
liegt vollständig innerhalb des sichtbaren Viewports (oberhalb des Ankers
ausgewichen, da unterhalb kein Platz war). 0 Textüberläufe bei allen 75
Namen mit der neuen 24px-Schrift. Zwei echte Screenshots im Chat geliefert
(identische Baum-/Achsenposition vor und nach dem Klick, Popup überlagert
statt zu verdrängen). grep-verifiziert: kein `.focus()`-Aufruf im
Popover-Code mehr ohne `{ preventScroll: true }`.

---

## 2026-09-11 (29) – Habsburg-Zeitleistenbaum: Größe, Zoom-Granularität, Verbindungs-Hervorhebung, Legende

Folgeauftrag zu Eintrag (28), Dateien: `js/viz/familienbaum.js` (alle vier
Punkte), `js/utils/infoButton.js` (neuer, optionaler `zusatzInhalt`-
Parameter für Punkt 4, rückwärtskompatibel - alle 17 anderen Aufrufer
grep-geprüft, keiner nutzt ihn, keine Regression).

- **Punkt 1 (Größe):** `PIXEL_PRO_JAHR` 5→20. Die eigentliche Ursache des
  "künstlichen Höhenlimits" war nicht das Fehlen von `viewportGroesse.js`
  (bereits im Einsatz), sondern der initiale Zoom-Fit in `wireZoom()`:
  `skala = Math.min(1, breite/baumBreite, hoehe/baumHoehe)` staucht bei
  jedem Neuaufbau die GESAMTE Baumhöhe auf die sichtbare Fläche - jede
  PIXEL_PRO_JAHR-Erhöhung wäre dadurch beim Start sofort wieder
  herausgerechnet worden. Der `hoehe/baumHoehe`-Faktor entfällt ersatzlos,
  nur noch breiten-begrenzt.
- **Punkt 2 (Adaptive Jahres-Beschriftung):** `ermittleJahresTickSchritt()`
  wählt aus einer festen Schrittweiten-Liste (200/100/50/25/10/5/2/1 Jahre)
  die feinste, die noch innerhalb des verfügbaren Tick-Platzes
  (`hoehe / TICK_MIN_PIXELABSTAND_Y`) bleibt - bewusst KEIN `scale.ticks(n)`
  (könnte krumme Zwischenwerte wie alle 2,5 Jahre erzeugen). `scaleExtent`
  von `[0.2, 4]` auf `[0.2, 24]` angehoben (reine Parameteränderung, Zoom/
  Pan-Mechanik unverändert), sonst wäre "einzelne Jahre ablesbar" bei der
  alten Obergrenze unerreichbar gewesen. **Zwei selbst gefundene Fehler**
  vor der finalen Fassung, beide per Live-Verifikation entdeckt: (a) ein
  erster Versuch nutzte `transform.rescaleY()` wie in zeitachse.js - das
  setzt aber voraus, dass die Basis-Skala bereits im Viewport-Pixelbereich
  liegt (bei familienbaum.js liegt sie stattdessen im GESAMTEN, oft weit
  größeren Inhaltsbereich, da hier ein Karten-artiger Kamera-Zoom statt
  zeitachses "Skala neu skalieren"-Ansatz verwendet wird) - lieferte
  Tick-Jahre weit außerhalb des sichtbaren Bereichs (Pixel-Position >9000 auf
  705px Viewporthöhe); behoben durch eigene, direkt aus
  `transform.invertY()` + `ySkalaBasis.invert()` abgeleitete Sichtbereichs-
  Berechnung. (b) die Schrittweiten-Auswahl wählte zunächst die GRÖBSTE
  statt die FEINSTE passende Schrittweite (Array-Filter + `[0]` statt
  korrekter Iteration von fein nach grob) - führte dazu, dass bei
  zoombedingt engem Sichtbereich (z.B. 58 Jahre) ein 200-Jahre-Schritt
  gewählt wurde, dessen erster Tick-Wert bereits außerhalb der sichtbaren
  Spanne lag → 0 sichtbare Ticks. Live verifiziert: Ausgangszustand
  5-Jahre-Schritte, starkes Hineinzoomen (15× Mausrad) → einzelne Jahre
  (1240-1246), starkes Herauszoomen → 25-Jahre-Schritte.
- **Punkt 3 (Verbindungs-Hervorhebung):** `ermittleDirekteBeziehungen()`
  liest Eltern/Ehepartner/Kinder direkt aus den Datenfeldern (nicht aus der
  d3.hierarchy-Baumstruktur, die wegen der Satelliten-/Überlappungs-Logik
  nicht 1:1 der echten Verwandtschaft entspricht) - Geschwister bewusst
  nicht enthalten. Eltern-Kind- und Ehe-Verbindungslinien tragen jetzt
  zusätzlich die beteiligten Personen-IDs. Hover setzt `hoverFokusId`
  (temporär), Klick zusätzlich `eingefrorenerFokusId` (bleibt nach
  Mouseleave bestehen, bestehendes Popover öffnet sich weiterhin
  gleichzeitig), Klick auf freie Fläche löst die eingefrorene Auswahl.
  Live verifiziert: Hover auf Karl VI. hebt genau Leopold I. (Vater),
  Eleonore (Mutter), Elisabeth (Ehefrau) und Maria [Theresia] (Tochter)
  hervor (5 von 75 Kästchen inkl. Karl VI. selbst, 71 gedimmt) - Joseph I.
  (Bruder) und Joseph II. (Enkel) bleiben unhervorgehoben, wie gefordert.
  Klick friert ein (Zustand bleibt nach Mouseleave), Klick auf freie Fläche
  setzt zurück (0 gedimmte Kästchen danach).
- **Punkt 4 (Farblegende):** `baueFarblegende()` liest die tatsächlich im
  Code verwendeten Fill-Konstanten aus (`HABSBURG_BASIS_FARBE`,
  `GRAU_EHEPARTNERFAMILIE`, `GOLD_FARBE`, `HEIRAT_FARBE`) plus die
  Unsicherheits-Randdarstellung - keine erfundenen Kategorien. Die vier
  Habsburg-Farbvarianten werden zusammengefasst in einem Eintrag (Auftrag:
  "kompakte" Legende) dargestellt. Live verifiziert: Legende mit allen 5
  Einträgen erscheint im Info-Popover unterhalb des bisherigen Texts.

**Live-Verifikation (vollständig):** 75 Boxen weiterhin vorhanden, echter
Screenshot im Chat geliefert (Normalzustand mit sichtbarer Jahresachse
1200-1350 und allen Farbkategorien; zweiter Screenshot mit aktiver
Hover-Hervorhebung auf Rudolf I., Tooltip sichtbar, restliche Kästchen
sichtbar abgeblendet). grep-verifiziert: `rescaleY` und die alte
`scaleExtent([0.2, 4])` kommen nur noch in erklärenden Kommentaren vor,
kein lebender Code-Verweis mehr.

---

## 2026-09-11 (28) – Habsburg-Zeitleistenbaum: Kästchen als beschriftete Boxen, mehr Abstand

Folgeauftrag zu Eintrag (27), einzige geänderte Datei weiterhin
`js/viz/familienbaum.js`:

- **Punkt 1 (Kästchenbreite):** Namen stehen jetzt INNERHALB des Kästchens
  (kein separates Außen-Label mehr, `loeseLabelKollisionen()` aus Eintrag
  (27) entfällt dadurch komplett). Kästchenbreite wird pro `render()` aus
  den echten Daten berechnet: `ermittleTextbreite()` misst jeden der 75
  Kurznamen per Canvas-`measureText()` (echte Schriftmetrik, keine
  Zeichenanzahl-Heuristik) bei der tatsächlich verwendeten Schriftgröße/
  -familie (`'Inter', system-ui, ...`, identisch zu `css/base.css`),
  `berechneKastenbreite()` nimmt den längsten gemessenen Wert + Innenabstand
  als einheitliche Breite für alle 75 Kästchen (85px in der aktuellen
  Datenlage). **Rückfrage gestellt statt eigenmächtig entschieden** (Auftrag
  verlangte das ausdrücklich): eine einheitliche Breite nach dem längsten
  VOLLSTÄNDIGEN Namen hätte 330-375px breite Kästchen für alle 75 Personen
  bedeutet, auch für kurze Namen wie "Rudolf I." - als unpraktikabel
  zurückgemeldet, drei Alternativen zur Wahl gestellt. Antwort: Kurzname
  verwenden (Vorname + römische Ordnungszahl, wie bisher schon als
  Beschriftung gezeigt) - vollständiger Name bleibt über Tooltip/Popover
  erreichbar.
- **Punkt 2 (Zweig-Abstand):** `instanz.spaltenAbstand` wird jetzt aus
  `instanz.kastenBreite` + fester Mindestlücke (`ZWEIG_LUECKE_BASIS`, 56px)
  berechnet statt umgekehrt - die Kästchenbreite ist die primäre,
  datengetriebene Größe, der Zweig-Abstand folgt ihr. Visualisierung wird
  dadurch breiter (Auftrag erlaubt das ausdrücklich, Zoom/Pan bereits
  vorhanden).
- **Punkt 3 (Mindestabstand zwischen Kästchen):** **Zwei selbst gefundene,
  in sich verschachtelte Fehler**, beide erst durch eigene Nachverifikation
  entdeckt und dann behoben (Details siehe Dateikopf-Kommentar):
  1. Der erste Ansatz (reiner `BOX_Y_INSET`-Rand) ging vom Auftrag wörtlich
     ("nahtlos aneinander anschließend") aus - eigene Verifikation zeigte
     aber, dass `d3.tree()` bei Einzelerben-Ketten Elternteil und Kind
     strukturell auf dieselbe X-Position legt (20 von 75 Personen betroffen,
     komplette Haupt-Erbfolgelinie), und deren echte Lebensspannen sich
     dabei erheblich ÜBERLAPPEN (bis zu 281px = >56 Jahre gemessen), nicht
     nur berühren - ein reiner Rand-Einzug kann das nicht zu einer
     sichtbaren Lücke machen.
  2. Ein erster Lösungsversuch (Spuren-Verteilung nur unter Personen mit
     IDENTISCHER X-Position) behob zwar den spalteninternen Fall, erzeugte
     aber neue, unter anderen Personen gemessene Rechteck-Überlappungen
     (bis zu 40 Paare): `d3.tree()`s `nodeSize` garantiert nur den Abstand
     zwischen direkten Geschwistern, nicht zwischen beliebigen Spalten -
     manche Nachbarspalten lagen nur 45px auseinander, deutlich weniger als
     die 85px breiten Kästchen; zusätzlich wurden Ehepartner-Satelliten
     (deren X sich erst aus der fertigen Anker-Position ergibt) von der
     reinen Spalten-Gruppierung gar nicht erfasst.
  
  **Endgültige Lösung:** `loeseUeberlappungGlobal()`, ein Sweep-Line-
  Verfahren über ALLE 75 Personen (Anker UND Satelliten) gemeinsam - jede
  Person bleibt nach Möglichkeit an ihrer bevorzugten Position, kollidiert
  diese mit einer zeitlich noch aktiven Person, wird abwechselnd um ein
  Vielfaches von `spaltenLaneAbstand` (=`kastenBreite`+10) nach
  rechts/links verschoben, bis eine freie Position gefunden ist.
  `baueRenderModell()` dafür zweigeteilt (Durchlauf A sammelt alle
  Ausgangspositionen, Durchlauf B baut Boxen/Linien erst mit der finalen
  Position) - Linien-Endpunkte verwenden dadurch garantiert dieselbe
  Position wie die gezeichneten Boxen.

**Live-Verifikation (vollständig, nicht nur Stichprobe):** 75 Boxen
gerendert, 0 Textüberlauf (Name ragt bei keiner der 75 Personen aus ihrem
Kästchen), 0 Politik-Buttons im DOM (Regression aus Eintrag (27) weiterhin
korrekt), minimale spalteninterne Lücke 19px (≥ Mindestvorgabe 8px, 0
Unterschreitungen), UND alle 75×74 = 5550 Kästchen-Paare exhaustiv auf
echte Rechteck-Überlappung (X- UND Y-Bereich) geprüft: 0 Überlappungen.
grep-verifiziert: keine lebenden Referenzen mehr auf die verworfenen
Zwischenstände (`loeseSpaltenUeberlappungFlach`, alte spaltenlokale
Spuren-Logik) außer in erklärenden Kommentaren.

**Screenshot-Hinweis:** Die Vorschau-Umgebung meldete zu Beginn dieses
Auftrags erneut "Browser pane is currently hidden" (wie bereits in Eintrag
(27)) sowie zwischenzeitlich `window.innerWidth/Height = 0` trotz aktivem
Server; DOM-Ausführung (`javascript_tool`) funktionierte davon unabhängig
durchgehend. Durch explizites `resize_window` + `tabs_select` + einen
`resize`-Event-Dispatch (der App fehlt ein automatischer Re-Render bei
verzögert verfügbarer Fenstergröße) liess sich ein tatsächlicher,
aktueller Screenshot erzwingen - im Chat geliefert, zeigt sauber getrennte,
beschriftete Kästchen ohne erkennbare Überlappung.

---

## 2026-09-11 (27) – Habsburg-Zeitleistenbaum: Breite, Beschriftung, Filterleiste entfernen

Folgeauftrag zu Eintrag (26), einzige geänderte Datei weiterhin
`js/viz/familienbaum.js`:

- **Punkt 1:** Der "Alle/Kaiser/Könige"-Umschalter entfällt vollständig und
  ersatzlos - nicht nur die drei Buttons, sondern auch die komplette
  dahinterliegende Steiner-Baum-Berechnung (`baueVollGraph()`,
  BFS-/Pfad-Funktionen, `opazitaetFuerPolitischeStellung()`) wurde entfernt,
  nicht nur versteckt. grep-verifiziert: 0 Treffer für jede der entfernten
  Funktionen/Felder im Code (nur noch in einem erklärenden Kommentar
  erwähnt).
- **Punkt 2:** `BAR_BREITE` 16→36 (mehr als verdoppelt), `BAR_ABSTAND_X`
  proportional mitvergrößert (140→190), damit der zusätzliche
  Balken-Platz nicht auf Kosten des Zwischenraums geht.
- **Punkt 3:** neue `loeseLabelKollisionen()` - verschiebt Namens-Etiketten
  mit zu geringem Y-Abstand bei überlappender X-Ausdehnung nach unten,
  zeichnet bei spürbarer Verschiebung eine dünne Führungslinie zum Balken.
  Live verifiziert (vollständige Prüfung aller 75×74 Personenpaare, nicht
  nur Stichprobe): 0 verbleibende Kollisionen.

Live verifiziert: 75 Personen weiterhin vorhanden, 0 Politik-Buttons im
DOM, Balkenbreite 36px, Kollisionsauflösung greift bei einem echten Fall
(Leopold IV./Ernst I., beide Labels durch Führungslinie markiert), keine
Konsolenfehler.

---

## 2026-09-11 (26) – Familienbaum → Habsburg-Zeitleistenbaum (kompletter Ersatz)

Vollständiger Umbau von `familienbaum.js` (einzige geänderte JS-Datei) plus
zwei neue Spalten `herrschaft_von`/`herrschaft_bis` in `familien.csv` -
ersetzt die vier bisherigen Baumansichten (Vorfahren/Nachkommen/Gesamt/
Quellenbaum) durch EINE zeitleistenbasierte Darstellung des Hauses
Habsburg (Rudolf I. bis Joseph II.):

- **Personenkreis** (75 Personen: 39 Habsburg-Kernfamilien + 36 zusätzliche
  Ehepartner) live aus den Daten ermittelt, nicht hartcodiert - live
  verifiziert gegen die vorgegebenen Zahlen, exakte Übereinstimmung.
- **Datenfelder** (`familien.csv`): `herrschaft_von`/`herrschaft_bis` für
  genau die 17 vorgegebenen Kaiser/Könige aus eigenem Recht befüllt, 63
  Zeilen leer, zwei `unsicherheit_anmerkung`-Ergänzungen (karl_v, joseph_ii)
  zur Titel-Ambiguität. Byte-/Zeilenend-Prüfung wie in den letzten beiden
  Aufträgen (0 Fehler).
- **Y-Achse** = echte Kalenderjahre (Balkenlänge = Lebensspanne) statt der
  bisherigen Generationsebene - die gesamte Union-Find-Generationslogik
  aus dem vorletzten Auftrag entfällt dadurch ersatzlos.
- **Teil-Einfärbung**: die 17 Kaiser/Könige bekommen nur den
  Regierungsabschnitt golden hervorgehoben (Rest des Balkens in
  Familienfarbe), die 19 Kaiserinnen/Königinnen durch Heirat den ganzen
  Balken in einem helleren Goldton (keine Regierungsdaten, Nicht-Ziel).
- Ehepaar-Anker/Kinder-Linien, Zoom/Pan (2D-Transform-Muster wie zuvor),
  lokales Detail-Popover (um Herrschaftszeitraum ergänzt), Politische-
  Stellung-Umschalter, Unsicherheits-Kennzeichnung: aus den vorherigen
  Aufträgen übernommen bzw. angepasst. Entfernt (bewusste Vereinfachung
  im Rahmen des "kompletten Ersatzes", nicht mehr passend zum neuen
  75-Personen-Kreis): Vier-Wege-Modus, Personenauswahl, Quellenbaum/
  Brücken-Kennzeichnung, Urkunden-Nennungszahl-Badges.
- Info-Text wörtlich übernommen.

Live verifiziert: exakt 75 Knoten, 4 Stichproben der Teil-Einfärbung
(Friedrich III. 52,6 %, Maximilian I. 18,3 %, Joseph II. 51 %, Rudolf I.
24,7 % - die im Auftrag genannte grobe Schätzung "ca. 46 %" für Friedrich
III. wich vom tatsächlich berechneten Wert ab, siehe Selbstauskunft im
Chat für die Einordnung), Politische-Stellung-Umschalter (14/17 Personen
bei Kaiser/Könige, exakt), Popover mit Herrschaftszeitraum, keine neuen
Konsolenfehler.

---

## 2026-09-11 (25) – Personenliste: Sonderfälle bei Sortierung & Datenbereinigung

**Punkt 1 (`data/personenliste.csv`):** 4 gezielte Textkorrekturen im Feld
`schreibweisen` - Berufs-/Status-Klammerzusätze entfernt
(`andreasen_andre_buerger_zu_krems`, `hans_noglamir_buerger_zu`,
`wolf_wullenxerger_buerger_zu`, `sigmund_wasserburger_tischler`), alle
anderen Felder dieser Zeilen unangetastet. Byte-Prüfung (dieselbe Methode
wie beim `familien.csv`-Vorfall): Zeilenzahl unverändert (4117), alle 4117
Zeilenenden weiterhin einheitlich CRLF, 0 eingebettete/verirrte CR, BOM
erhalten, alle Datenzeilen weiterhin exakt 10 Felder.

**Punkt 2-4 (`js/viz/personenliste.js`, `ermittleSortierNachname()`):**
- Punkt 2: `zum`/`zur` werden jetzt wie `von`/`zu` behandelt (Wort +
  Folgewort entfernt).
- Punkt 3: eine am Ende stehende `(...?)`-Klammer (unsichere
  Namensvermutung) ersetzt die normale Verarbeitung vollständig - der
  Klammerinhalt selbst wird zum Sortierschlüssel.
- Punkt 4: bleiben nach den Entfernungen sowohl ein reines
  Ordinalzahl-Wort (`V.`) als auch eine zusätzliche geklammerte Ordinalzahl
  (`(III.)`) übrig, werden beide von der Sortierung ausgenommen -
  Schlüssel ist das erste verbleibende Wort (Vorname) statt wie sonst das
  letzte. Angezeigter Name bleibt in allen Fällen unverändert (betrifft
  nur `sortWertFn`, nicht `wertFn`).

Alle 8 Fälle aus dem Auftrag einzeln getestet (4 CSV-Fälle live über die
Suche, 4 Algorithmus-Fälle über eine isolierte Testfunktion) - alle 8
korrekt, siehe Selbstauskunft im Chat. Regressionscheck: alle 7 Fälle aus
dem vorherigen Auftrag weiterhin korrekt.

---

## 2026-09-11 (24) – Personenliste: Sortierung nach Nachname-Heuristik & zweite Paginierungsleiste

`js/viz/personenliste.js` (einzige geänderte Datei):

- **Paginierung (Punkt 1):** die bisher einzelne Leiste unten links gibt es
  jetzt zusätzlich identisch oben, beide mittig ausgerichtet
  (`.pl-paginierung { justify-content: center }`). Keine separate
  Synchronisierung zwischen beiden nötig - beide werden bei jedem
  Seitenwechsel aus demselben `instanz.aktuelleSeite` neu gezeichnet
  (dieselbe "eine Quelle der Wahrheit" Konvention wie im Rest des Moduls).
- **Sortierschlüssel „Nachname" (Punkt 2):** neue `ermittleSortierNachname()`
  - wendet die 5 vorgegebenen Entfernungsregeln (Titel/Amt, „von"/„zu" +
  Folgewort, Artikel „der/die/dem/des", „sohn"/„sonn"/„tochter" am
  Wortende) in der vorgegebenen Reihenfolge an; das letzte verbleibende
  Wort ist der Sortierschlüssel. Betrifft NUR die Sortierung (`sortWertFn`,
  neues optionales Feld in `SPALTEN`) - die angezeigte Zelle zeigt
  unverändert den vollen Namen. Alle 7 Beispiele aus dem Auftrag einzeln
  gegen die tatsächliche Implementierung getestet (siehe Selbstauskunft im
  Chat) - alle 7 bestehen exakt.
- **Transparenz (Punkt 3):** Info-Text um den vorgegebenen Heuristik-Hinweis
  ergänzt (zweiter Absatz), zusätzlich ein kleiner „*"-Hinweis mit
  Tooltip direkt an der Name-Spaltenüberschrift.

Live verifiziert: beide Paginierungsleisten sichtbar/zentriert/synchron,
Sortierung nach Name intern konsistent (localeCompare-Reihenfolge der
tatsächlichen Sortierschlüssel geprüft, nicht nur der sichtbaren Zellen),
Info-Text und Spalten-Hinweis korrekt, keine Konsolenfehler.

---

## 2026-09-10 (23) – Personenliste: Paginierung (100 pro Seite)

`js/viz/personenliste.js` zeigt jetzt maximal 100 Personen pro Seite
(zuvor alle 4116 auf einmal) - dieselbe "← Seite X / Y →"-Konvention wie
regestenKachelraster.js' `bauePaginierung()`. Seite springt automatisch auf
1 zurück, wenn sich Suche oder Sortierung ändert (die alte Seitenzahl kann
sonst in der neuen Treffermenge ungültig werden); eine ungültig gewordene
Seitenzahl wird zusätzlich defensiv abgeklemmt. Live verifiziert: 42
Seiten bei 4116 Personen, letzte Seite korrekt mit 16 Resteinträgen,
Zurück/Weiter-Buttons an den Rändern korrekt deaktiviert, Such-/
Sortierwechsel springen korrekt auf Seite 1.

---

## 2026-09-09 (22) – Familienbaum: Layout-Verbesserung, Quellenbaum-Modus, Kaiserlinie-Fokus, neues Farbsystem

Umfassender Umbau von `familienbaum.js` (einzige geänderte Datei):

- **Layout (Punkt 1/2):** Y-Position kommt jetzt aus einer EINMALIGEN,
  modus-unabhängigen globalen Generationsebene (Union-Find für
  Ehepartner-Gleichstand + längste Eltern-Kind-Kette je Ebenen-Gruppe)
  statt aus der bisherigen d3.tree()-Baumtiefe - die 43 elternlosen
  Personen übernehmen dadurch automatisch die Ebene ihres Ehepartners,
  ohne Sonderfall-Code. Die "spiegeln"-Sonderbehandlung des Vorfahrenbaums
  entfällt vollständig. Geschwister werden zusätzlich nach Ehepartner-
  Gruppe (verhindert Linienkreuzungen bei den 10 Mehrfachehen-Personen)
  und Geburtsjahr sortiert.
- **Neuer 4. Modus "Quellenbaum" (Punkt 3):** zeigt genau die 34 Personen
  (31 zur Laufzeit aus urkunden.csv ermittelte Urkundenpersonen + 3 fest
  vorgegebene genealogische Brückenpersonen) als einen zusammenhängenden
  Baum. Live-Bug gefunden und behoben: Ehepartner-Satelliten ignorierten
  ursprünglich die Teilmenge und zeigten 71 statt 34 Personen - behoben
  über einen neuen `sichtbareIds`-Parameter in `baueRenderModell()`.
- **Kaiserlinie-Fokus (Punkt 4):** neuer Umschalter "Politische Stellung"
  (Alle/Kaiser/Könige), hebt die Zielpersonen hervor, dämpft notwendige
  Verbindungspersonen (2-Approximation Steiner-Baum über den vollen
  Familiengraphen) und blendet den Rest stark ab - live verifiziert: 16
  bzw. 19 Personen exakt bei voller Deckkraft.
- **Farbsystem & Badges (Punkt 5):** Habsburg-Basisfarbe + 3 Farbvarianten
  für die Untergruppen (inkl. `habsburg_lothringen` als 4. Variante -
  eigenständige, begründete Entscheidung, siehe Selbstauskunft im Chat),
  6 weitere Familien mit je eigener gedämpfter Farbe (Schwellenwert
  "≥ 2 Personen", ebenfalls eigenständig begründet), alles Übrige
  gemeinsames Grau. Goldener Doppelrand + Kronensymbol (gefüllt für
  Kaiser/König, hohl für Kaiserin/König durch Heirat) als vom Familienfarbe
  unabhängiger Kanal. Urkunden-Nennungszahl als Badge, nur für die 31
  Urkundenpersonen.
- **Semantischer Zoom (Punkt 6):** unterhalb einer Zoomstufe von 0,5 nur
  Kurzname, darüber vollständiger Name + Lebensdaten - Klick-Popover
  (unverändert) bleibt die "Nahaufnahme"-Detailebene, jetzt um
  Politische-Stellung-Anzeige und Nennungszahl ergänzt.
- **Info-Text (Punkt 7):** wörtlich wie im Auftrag übernommen.

**Nebenbefund, live gefunden und vollständig behoben:** die im vorherigen
Auftrag "vermeintlich behobene" CRLF-Zeilenenden-Korrektur in
`familien.csv` war unvollständig - tatsächlich hatten ALLE 80 Datenzeilen
(nicht nur die Kopfzeile) ein fälschlich eingebettetes `\r` direkt vor dem
`hrr_status`-Wert, wodurch d3s CSV-Parser das Feld für praktisch jede
Person falsch zuordnete (0 Kronen wurden gerendert). Ursache: die damalige
Verifikation prüfte nur ein auf die Kopfzeile zugeschnittenes Muster, nie
Datenzeilen allgemein. Jetzt vollständig bereinigt (alle `\r` entfernt,
einheitlich reine LF-Zeilenenden) und mit einer allgemeinen Prüfung
(Gesamtzahl `\r` vs. Anzahl tatsächlicher Zeilenumbrüche) verifiziert.

Live verifiziert: alle vier Modi, beide Politische-Stellung-Stufen, exakte
Zählungen (34/80/16/19/31/24/19), keine Konsolenfehler.

---

## 2026-09-09 (21) – Neues Datenfeld `hrr_status` in familien.csv

Neue Spalte `hrr_status` in `data/familien.csv` (Werte: `kaiser`, `koenig`,
`kaiserin_heirat`, `koenigin_heirat`, `keiner`) - vom Auftraggeber
vorgegebene, bereits geprüfte Zuordnung 1:1 übernommen, keine eigene
Recherche/Herleitung. Reine Datengrundlage für eine künftige
„Kaiserlinie"-Fokusansicht im Familienbaum - `familienbaum.js` selbst
bewusst nicht angefasst (Nicht-Ziel).

grep-Zählung gegen die aktualisierte Datei bestätigt exakt die vorgegebenen
Zahlen: 16 kaiser / 3 koenig / 19 kaiserin_heirat / 5 koenigin_heirat / 37
keiner = 80 von 80 Datensätzen, keine Abweichung.

**Beim Schreiben gefundener und selbst behobener Fehler:** die Datei nutzt
CRLF-Zeilenenden (bis auf die - vermutlich schon vorher inkonsistente -
Kopfzeile war das nicht der Fall); der erste Schreibversuch spaltete nur
nach `\n`, wodurch das `\r` der Kopfzeile mitten in die Zeile statt an ihr
Ende rutschte. Vor dem Abschluss bemerkt (Feld-für-Feld-Konsistenzprüfung
zeigte eine Spalte namens `unsicherheit_anmerkung\r`) und korrigiert - alle
81 Zeilen enden jetzt wieder einheitlich mit CRLF, 0 eingebettete `\r`
mehr. Feldanzahl (17 je Zeile) und BOM am Dateianfang zusätzlich
verifiziert.

Dokumentiert in `docs/SCHEMA.md` (Abschnitt 6, familien.csv).

---

## 2026-09-09 (20) – Info-Button für die restlichen 2 Module (adjazenzmatrix, bipartiteFlowMap) mit korrigierten Texten

Abschluss des Auftrags "Info-Button für die 6 bleibenden Module": nach
Rückmeldung der in Eintrag (19) gefundenen Text/Code-Abweichungen wurden
korrigierte Texte vom Auftraggeber geliefert und 1:1 übernommen -
`adjazenzmatrix.js` (jetzt korrekt: Personen statt Kategorien, ohne
Klick-Funktion) und `bipartiteFlowMap.js` (jetzt korrekt: Orte↔Kategorien
statt Urkunden↔Orte). Gleiches Muster wie die vorherigen 4 Module:
Info-Button in einer neuen, minimalen Werkzeugleiste, keine Änderung an der
Zeichenlogik. `bipartiteFlowMap.js` (Leaflet-basiert) bekam denselben
`z-index:900`-Fix wie karte.js/verbindungskarte.js in Eintrag (19), aus
identischem Grund (Leaflet-Panes bis z-index 700 würden das Popover sonst
überdecken).

Alle 6 Module live geprüft (Eigen-Check): Info-Button vorhanden, Popover
öffnet mit dem exakten, jeweils zuletzt bestätigten Text, keine
Konsolenfehler. Damit sind jetzt 16 von 33 `js/viz/`-Modulen mit Info-Button
ausgestattet (10 aus früheren Aufträgen + diese 6) - die übrigen 15
(Eintrag 18) bleiben wie im Nicht-Ziel festgelegt unangetastet.

---

## 2026-09-09 (19) – Info-Button für 4 der 6 „bleibenden" Module (karte, verbindungskarte, wortwolke, personenliste)

Info-Button (`erzeugeInfoButton()`, oben rechts in einer neuen, minimalen
Werkzeugleiste, ohne sonstige Änderung an der Zeichenlogik) ergänzt für
`karte.js`, `verbindungskarte.js`, `wortwolke.js`, `personenliste.js` -
Texte wörtlich wie vom Auftraggeber vorgegeben übernommen.

**Zwei der 6 beauftragten Module zurückgestellt, NICHT umgesetzt:**
`adjazenzmatrix.js` zeigt tatsächlich Ko-Nennungen von **Personen** (Top 40
nach Verbindungsgrad), nicht von Kategorien wie im vorgeschlagenen Text
angenommen, und hat keine Klick-Funktion (nur Hover/Fokus-Tooltip) -
`bipartiteFlowMap.js`s zwei Knotenseiten sind tatsächlich **Orte** und
**Kategorien**, nicht Urkunden und Orte (genau der vom Auftraggeber selbst
als möglich benannte Fall). Rückmeldung mit den tatsächlichen Strukturen
erfolgt im Chat, Umsetzung folgt nach Bestätigung/Korrektur der Texte.

**Nebenbefund, live behoben:** bei karte.js/verbindungskarte.js (beide
Leaflet-basiert) blieb das Popover zunächst unsichtbar, obwohl es korrekt
positioniert und `hidden=false` war - Leaflets interne Panes
(tilePane/overlayPane/markerPane/tooltipPane/popupPane) setzen intern
z-index-Werte bis 700 und überdeckten das Popover (infoButton.js' z-index:
30). Fix: die jeweilige Werkzeugleiste bekommt `position:relative;
z-index:900` (lokal in den beiden Modulen, infoButton.js selbst
unverändert, da app-weit geteilt).

Live verifiziert (Screenshots aller 4 Popover): Text/Position korrekt,
keine Konsolenfehler, Personenliste-Sortierung (Auftrag (18)) weiterhin
funktionsfähig.

---

## 2026-09-09 (18) – Personenliste: sortierbare Spalten (Punkt 2 des Auftrags „Info-Button-Audit & sortierbare Personenliste")

Alle 6 Spalten der Personenliste (4.116 Einträge) sind jetzt klickbar
sortierbar - die Sortierlogik (`aendereSortierung()`/`sortiereRecords()`)
existierte im Modul bereits (der Auftrag nahm fälschlich an, sie fehle
komplett), es fehlten nur der visuelle Pfeil-Indikator und eine je nach
Spaltentyp passende Vergleichsfunktion statt durchgehendem `>`-Vergleich.

Jede `SPALTEN`-Definition trägt jetzt ein `typ` (`text`/`zahl`); die neue
`vergleicheWerte()` nutzt für Text `localeCompare('de', {sensitivity:
'base', numeric: true})` (korrekte deutsche Alphabetreihenfolge inkl.
Umlaute/ß statt UTF-16-Code-Vergleich) und für Zahlen numerische Subtraktion.
"Erste/Letzte Nennung" sind Jahreszahlen (personenliste.csv kennt keine
vollen Datumswerte), numerischer Vergleich sortiert sie damit zugleich
korrekt chronologisch.

Pfeil-Indikator (▲/▼) + `aria-sort` an der aktiven Spaltenüberschrift: die
Kopfzeile wird bei jedem Sortierwechsel über `zeichneTabelle()` ohnehin
komplett neu gebaut, der Indikator wird deshalb direkt aus dem aktuellen
Sortier-Zustand gesetzt - der aus dem Kalender-Heatmap-Auftrag bekannte
Bug-Typ ("aktiver Zustand erst nach Klick korrekt") kann hier strukturell
nicht auftreten, da nie mit veraltetem Zustand gerendert wird. Klick UND
Enter/Leertaste auf der Kopfzelle lösen die Sortierung aus (bestehende
Tastatur-Bedienbarkeit unverändert). Keine Paginierung vorhanden (Nicht-Ziel
entfällt damit).

Live verifiziert: Name (Text) und Erste Nennung (Zahl) je auf- und
absteigend korrekt sortiert, Pfeil/`aria-sort` wechselt korrekt zur
angeklickten Spalte, Rückwechsel zu Nennungen (Standard-Startsortierung)
funktioniert, keine Konsolenfehler. `js/viz/familienbaum.js` (Registry-
Nachbar) unverändert, Nicht-Ziel eingehalten.

---

## 2026-09-09 (17) – Familienbaum: drei umschaltbare klassische Baumansichten

Ersetzt die vorherige Kraft-Layout-Netzwerkdarstellung von `familienbaum.js`
(80 Knoten/117 Kanten, kein klassischer Stammbaum) vollständig durch drei
per Button umschaltbare Ansichten: Vorfahrenbaum, Nachkommenbaum, Gesamtbaum
(alle auf `d3.hierarchy()`/`d3.tree()` statt Force-Simulation).

**Datenprüfung vor dem Entwurf** ergab zwei im Auftrag angenommene, aber
nicht zutreffende Prämissen (gemeldet statt stillschweigend übernommen):
"Friedrich III." ist NICHT die bestverknüpfte Person (nur 4 direkte
Verknüpfungen) - tatsächlicher Spitzenreiter und daher als Startperson
gewählt: Albrecht II. ("der Lahme"/"der Weise", 7 Verknüpfungen, höchste
kombinierte Vorfahren+Nachkommen-Reichweite). Die Daten zerfallen NICHT in
mehrere unabhängige Familien-Cluster - eine Zusammenhangsanalyse ergibt
genau eine Komponente aller 80 Personen (die 32 "familie"-Werte sind reine
Namens-Etiketten, keine Graph-Partition); der Gesamtbaum-Aufbau bleibt
trotzdem generisch für mehrere, tatsächlich unverbundene Cluster.

Ehepartner sind keine Hierarchie-Kinder, sondern nach der Layout-Berechnung
platzierte Satelliten - Kinder hängen dadurch exakt mittig unter dem
jeweiligen Paar (individueller Verbindungslinien-Startpunkt pro Kind).
Mehrfach-Ehen zeigen alle bekannten Ehepartner nebeneinander. Beim Testen
gefundener und behobener Bug: eine Person, die andernorts bereits einen
eigenen Anker-Platz hat, wurde je nach Verarbeitungsreihenfolge zusätzlich
als Ehepartner-Satellit gezeichnet (Duplikate) - jetzt zwei Durchläufe
(erst alle Anker-IDs sammeln, dann Satelliten entscheiden).

Zoom/Pan wie Zeitachse (normales Mausrad zoomt, Ziehen verschiebt), Start-
Zoomstufe passt den ganzen Baum in die Fläche ein (sonst bei 15 Generationen
Tiefe fast nichts sichtbar). Unsicherheits-Kennzeichnung, Info-Button
(Text wörtlich übernommen), `viewportGroesse.js`/`bildschirmHinweis.js`
unverändert aus dem etablierten Baustein-Katalog wiederverwendet.

Punkt 7 (Detailanzeige, Auftrag verlangte Rückmeldung statt eigenmächtiger
Entscheidung): lokales Popover statt Wiederverwendung von sidebar.js'
zeigeUrkundenSidebar()/zeigeUrkundenDetail() - deren Feldliste ist hart auf
das Urkunden-Schema zugeschnitten und passt nicht zu familien.csv; eine
echte Verallgemeinerung bräuchte eine konfigurierbare Feldliste UND
Anpassungen an 3 bestehenden Aufrufern, für ein 4-Felder-Popover
unverhältnismäßig - der vom Auftrag selbst als pragmatischer erster Schritt
vorgeschlagene Weg.

Live verifiziert: alle drei Ansichten (Screenshots), 80/80 Personen ohne
Duplikate im Gesamtbaum, Personenauswahl (Suchschlitz + Datalist) baut den
Baum korrekt neu auf, Unsicherheits-Toggle, Zoom/Pan, Detail-Popover
(öffnen/Escape-schließen), Klein-Bildschirm-Hinweis, keine Konsolenfehler.
Regressionscheck: `personenliste.js` (Registry-Nachbar) unverändert
funktionsfähig.

---

## 2026-09-09 (16) – Kleinauftrag: Familienbaum & Personenliste in die Registry unter „Personen" umgehängt

Behebt den in Eintrag (15) gemeldeten Registrierungsfehler: `familienbaum`
und `personenliste` standen als Unterreiter-/Ansicht-Einträge unter
`urkunden`, obwohl beide (unveränderter) Modul-Code laut eigenem Dateikopf-
Kommentar `familien.csv`/`personenliste.csv`-Felder erwartet. Beide Einträge
unverändert (`id`/`label`/`modulPfad` gleich) von `urkunden.ansichten` nach
`personen.ansichten` verschoben (`js/config/archivalienRegistry.js`) - Urkunden-
Unterreiter-Leiste/Dropdown zeigt sie nicht mehr (24 statt 26 Einträge),
Personen-Bereich zeigt jetzt beide echten Module statt des bisherigen
Platzhalters.

Der Platzhalter-Eintrag für `personen` entfällt vollständig (nicht als
zusätzlicher dritter, leerer Unterreiter belassen - Abschnitt 2 "Content-
driven": ein dauerhaft leerer Tab neben zwei funktionierenden Modulen wäre
nur verwirrend, siehe PROJEKTLOG für die Begründung dieser Wahl); `js/viz/
personenPlatzhalter.js` dadurch unreferenziert und gelöscht.

Technisch notwendige Ergänzung über die reine Registry-Umhängung hinaus:
`personen.datenDatei` lädt beide CSVs als EIN kombiniertes Objekt
(`{familien:[...], personenliste:[...]}`, aus Auftrag (15)) - `familienbaum.js`/
`personenliste.js` erwarten aber (unverändert, Nicht-Ziel) je ein FLACHES
Records-Array ihrer eigenen Quelle. Neuer, optionaler Registry-Schlüssel
`datenSchluessel` pro Ansicht-Eintrag + kleine, abwärtskompatible Ergänzung
in `js/core/app.js`s `ladeModulUndRender()` wählen den passenden Teil aus -
alle Ansichten ohne `datenSchluessel` (also praktisch alle bisherigen)
verhalten sich exakt wie zuvor.

Live verifiziert: Personenliste (4116 Einträge, Tabelle/Suche/Sortierung
unverändert) und Familienbaum (80 Knoten/117 Kanten, Kraft-Layout
unverändert) unter `#visualisierungen/personen/...` funktionsfähig; alte
Urkunden-Direktlinks zu diesen IDs fallen sauber auf die Primäransicht
zurück statt einen Fehler zu zeigen; Regressionscheck (Bestand-Tab,
Regesten-Kachelraster, Kalender-Heatmap, Bürgerbuch-Platzhalter) ohne
Auffälligkeiten, keine Konsolenfehler.

Verbleibende, tatsächlich zu bearbeitende Urkunden-Module (Registry-Zählung,
`urkunden.ansichten`): **24** (vorher 26, −2 durch diese Verschiebung) - alle
24 sind bereits vollständig implementierte, funktionierende Visualisierungen
(kein Stub-Modul im gesamten `js/viz/`-Ordner gefunden, siehe Auftrag (15));
eine davon unabhängige, separate Vollständigkeits-Zählung (Vollbild-
Konvention-Audit) steht in `docs/PROJEKTLOG.md`, Eintrag "Vollbild-Audit
aller Module" - nicht identisch mit dieser Zahl, hier nicht neu ausgezählt.

---

## 2026-09-09 (15) – Neue Kacheln „Bürgerbuch", „Verlassenschaften", „Personen" im Visualisierungen-Tab

Drei neue, gleichberechtigte Kacheln neben „Urkunden" auf der Visualisierungen-
Landingpage - Architektur war dafür bereits vorbereitet (`js/config/
archivalienRegistry.js`s `ARCHIVALIENTYPEN`, per Dateikopf-Kommentar
ausdrücklich für genau diesen Fall angelegt): drei neue Einträge ergänzt
(`buergerbuch`/`verlassenschaften`/`personen`, Reihenfolge wie im Auftrag),
`js/core/kachelauswahl.js`/`js/core/router.js`/`js/core/ansichtWechseln.js`
brauchten dafür KEINE Änderung (vollständig registry-getrieben). Jeder neue
Bereich bekommt genau EINEN Platzhalter-Eintrag in seiner Unterreiter-/
Ansicht-Liste (Label „Noch keine Visualisierung vorhanden") statt echtem
Visualisierungsinhalt (Nicht-Ziel).

Neue geteilte Fabrik `js/utils/vizPlatzhalter.js` (`baueVizPlatzhalterModul()`)
erfüllt das volle Modul-Interface (render/resize/destroy) und baut dabei
echte, bedienbare Bausteine auf: Filterleiste (Kategorie-Dimension datenge-
trieben pro Bereich - Bürgerbuch: Wirtschaftssektor, Verlassenschaften:
Vermögensgruppe, Personen: keine Kategorie-Filterung), Info-Button, per
`viewportGroesse.js` bemessene Platzhalterfläche, sowie ein (noch leeres,
korrekt geschlossenes) Sidebar-Gerüst über `sidebar.js`. Drei schlanke Modul-
Dateien (`buergerbuchPlatzhalter.js`/`verlassenschaftenPlatzhalter.js`/
`personenPlatzhalter.js`) liefern nur die bereichsspezifische Konfiguration.

„Personen" braucht laut Auftrag zwei Datenquellen gemeinsam (`familien.csv`
UND `personenliste.csv`) - `app.js`s bisherige Ein-Datei-Ladefunktion wurde
dafür rückwärtskompatibel erweitert (`ladeArchivalienDaten()`: ein String
lädt weiterhin genau eine Liste, ein Objekt lädt mehrere benannte Quellen).

Sidebar-Funktionen `zeigeUrkundenSidebar()`/`zeigeUrkundenDetail()` bewusst
NICHT umbenannt (vom Auftrag als Option genannt, mit Rückmeldung verlangt):
ihre Feldliste ist hart auf das Urkunden-Schema zugeschnitten, eine sinnvolle
Umbenennung bräuchte zusätzlich eine konfigurierbare Feldliste - größere
Änderung, hier nicht gerechtfertigt, da keiner der drei neuen Bereiche
bereits anklickbare Einzeldatensätze hat.

Entdeckter, nicht behobener Bestandsfehler (gemeldet statt stillschweigend
übernommen): `familienbaum.js`/`personenliste.js` sind in `ARCHIVALIENTYPEN`
weiterhin unter `urkunden` registriert, obwohl beide laut eigenem Dateikopf-
Kommentar für `familien.csv`/`personenliste.csv` gebaut sind - Pflegeregel
der Datei ("bestehende Einträge nicht ohne Rückfrage ändern") verbietet eine
eigenmächtige Korrektur in diesem Auftrag.

Regressionsgeprüft: Bestand-Tab (Treemap/Gantt-Diagramm), Regesten-
Kachelraster (Direktlink), Kalender-Heatmap inkl. Sidebar/Fotogalerie/
Lightbox - alle unverändert funktionsfähig, keine Konsolenfehler.

---

## 2026-09-09 (14) – Sidebar-Lightbox & app-weite Vereinheitlichung

**Punkt 0 (Bestandsaufnahme):** drei Stellen befüllen eine Sidebar mit
Urkunden-Inhalt. `kalenderHeatmap.js` nutzte bereits die geteilte
`sidebar.js`-Logik (Auftrag (13)). `zeitachse.js` und `dotPlot.js` hatten
dagegen je eine EIGENE, ältere, lokale Implementierung (beide ohne
Fotogalerie; unterschiedliche, inkonsistente Kriterien für den "unsicher"-
Hinweis; `dotPlot.js`s Kategorie-Badges nutzten zusätzlich eine andere
Farbquelle als alle übrigen Urkunden-Module - siehe PROJEKTLOG für Details).

**Punkt 1:** Das Hauptfoto der Sidebar-Detailansicht öffnet jetzt die
bestehende, unveränderte Lightbox (`js/utils/lightbox.js`, identisch zum
Regesten-Kachelraster) inkl. Pfeiltasten-/Button-Navigation zwischen allen
Fotos derselben Urkunde, startend beim gerade angezeigten Bild. Die kleinen
Thumbnails bleiben ohne eigenen Lightbox-Trigger (wechseln weiterhin nur das
Hauptbild).

**Punkt 2:** `js/utils/sidebar.js` bekommt zwei neue, einzige nötige
Einstiegspunkte für jede künftige Urkunden-Sidebar: `zeigeUrkundenSidebar()`
(1 Treffer → sofort Detailansicht, mehrere → Liste) und `zeigeUrkundenDetail()`
(direkter Einzel-Aufruf, z.B. Punktklick). Die komplette Öffnen-
Orchestrierung (Modus-Wahl, Zurück-Button-Verdrahtung, Scroll-Position,
Fokus) ist jetzt Teil dieser Datei statt in jedem Aufrufer neu gebaut zu
werden. `zeitachse.js` und `dotPlot.js` sind auf diese Funktionen migriert
(inkl. jetzt sichtbarer Fotogalerie/Lightbox bei Punktklick, vorher Text-
only); `kalenderHeatmap.js` ist auf den neuen, verschlankten Aufruf
umgestellt - eine Zelle mit genau einer Urkunde öffnet dadurch jetzt direkt
die Detailansicht statt zuerst eine Ein-Element-Liste zu zeigen. Beim
Migrieren entdeckte Lücke behoben: der "Achtung: unsicher"-Hinweis, den
beide Alt-Implementierungen hatten, fehlte in der geteilten Detailansicht
(dort bislang nie gebraucht) - jetzt mit dem umfassenderen der beiden
vormaligen Kriterien ergänzt, damit keine Funktionalität stillschweigend
verloren geht.

Kachelraster und `js/utils/lightbox.js` selbst unverändert (Nicht-Ziel).
Live verifiziert: Lightbox-Öffnung aus der Sidebar-Detailansicht (Kalender-
Heatmap, Zeitachse, Dot Plot), korrekter Start-Index nach Thumbnail-Wechsel,
Escape schließt nur die Lightbox, Zeitachse/Dot Plot zeigen jetzt Fotos bei
Punktklick, alle 5 unveränderten Bestand-Sidebars (Treemap stichprobenartig
geprüft) weiterhin ohne Zurück-Button/Layout-Einfluss, keine Konsolenfehler.

---

## 2026-09-09 (13) – Sidebar-Liste: Regest-Vorschauzeile & Inline-Detailansicht statt Navigation

`js/utils/sidebar.js`s schlanke Urkunden-Liste (`baueUrkundenListeInhalt()`,
bisher nur Signatur+Kategorie, Klick navigierte zum Regesten-Kachelraster)
bekommt eine Regest-Vorschauzeile pro Eintrag (CSS-Ein-Zeilen-Kürzung mit
„…"). Klick auf einen Eintrag öffnet jetzt statt einer Navigation die volle
Detailansicht INNERHALB derselben Sidebar (neue, ebenfalls exportierte
`baueUrkundenDetailInhalt()`): eigene Fotogalerie (Hauptbild + anklickbare
Thumbnails, Wechsel bleibt in der Sidebar, keine Lightbox), Signatur, Datum,
Regest, Kategorien-Badges, Orte, Personen - dieselbe Feldauswahl wie die
aufgeklappte Kachelraster-Ansicht. `baueSidebarGeruest()` liefert dafür
zusätzlich einen standardmäßig versteckten "← Zurück"-Button (zusätzlich
zum bestehenden "×"), der für die sieben anderen, unveränderten Aufrufer
(treemap.js/sunburst.js/icicle.js/circlePacking.js/ganttDiagramm.js/
zeitachse.js/dotPlot.js) unsichtbar bleibt und deren Layout live geprüft
nachweislich nicht beeinflusst.

Betroffen ist ausschließlich `kalenderHeatmap.js` (der einzige tatsächliche
Aufrufer von `baueUrkundenListeInhalt()`): die vormalige `navigiereZuKachel()`
(state.js' `setZielSignatur()` + router.js' `navigiereZu()`) entfällt
ersatzlos, `filterleiste.js`s `setzeSuchbegriff()` bleibt unverändert
bestehen (wird von hier aus nur nicht mehr aufgerufen, Nicht-Ziel). Live
verifiziert: Liste mit Regest-Vorschau, Detailansicht mit allen Feldern +
Fotogalerie (Hauptbild-Wechsel per Thumbnail-Klick getestet), "← Zurück"
(Scroll-Position erhalten) und "×" (schließt vollständig, setzt Zurück-
Button zurück) funktionieren; die sieben anderen `baueSidebarGeruest()`-
Aufrufer sowie zeitachse.js' eigene, unveränderte Einzelurkunden-Detailansicht
unverändert getestet, keine Konsolenfehler.

---

## 2026-09-09 (12) – „Undatiert (…)"-Beschriftung app-weit entfernt

Die Beschriftung `"Undatiert (N)"` bzw. deren modulspezifische Varianten
unterhalb der X-Achse wurde ersatzlos entfernt (statt erneut das Clipping zu
reparieren), da sie laut Auftraggeber nicht gebraucht wird. Einzige
Renderstelle war `js/utils/urkundenZeit.js`'s gemeinsam genutzte
`zeichneUnbekanntBereich()` - dort wurde der `<text>`-Aufruf (und der jetzt
ungenutzte `beschriftung`-Parameter) entfernt; die graue Sammelfläche samt
ihren einzelnen, per Tooltip erklärten Kacheln bleibt unverändert bestehen
(Nicht-Ziel: Zähl-/Verarbeitungslogik unangetastet). Die jetzt toten
`beschriftung: '...'`-Config-Zeilen wurden an allen 10 Aufrufstellen in 9
Modulen entfernt: `dotPlot.js`, `swimlanes.js`, `streamgraph.js`,
`ridgeline.js`, `horizonChart.js`, `parallelKoordinaten.js`,
`kalenderHeatmap.js` (2 Aufrufstellen), `trellis.js`, `zeitachse.js`.
`trellis.js`s eigene, strukturell andersartige Facet-Titel-Beschriftung
"Undatiert" (Zeile 101, kein Bestandteil der geteilten Funktion, analog zu
den Kategorie-Facet-Titeln der übrigen Facets) sowie die davon unabhängige
"Undatiert"-Bucket-Logik in `marimekko.js`/`alluvial.js`/`sankey.js`
(regulärer Jahrhundert-Knoten/-Spalte, kein Beschriftungselement unterhalb
einer X-Achse) liegen außerhalb des Auftrags und wurden bewusst NICHT
angetastet - siehe `docs/PROJEKTLOG.md` für die vollständige Begründung.
Live in allen 9 betroffenen Modulen verifiziert (frischer Browser-Tab wegen
des bekannten Modul-Cache-Verhaltens, siehe Einträge (10)/(11)): 0
verbleibende "Undatiert (…)"-Textknoten im SVG-DOM, keine Konsolenfehler,
Achsen-/Kachel-Layout unverändert korrekt positioniert.

---

## 2026-09-08 (11) – Nachtrag zu Eintrag (10): Cache-Ursache bestätigt (Inkognito-Test), weiterhin kein Code-Defekt

**Kein Code geändert.** Der Auftraggeber meldete nach eigenem Hard-Refresh
(Strg+Shift+R) weiterhin exakt `SyntaxError: The requested module
'../config/constants.js' does not provide an export named
'ACHSEN_SCHRIFTGROESSE'` in `dotPlot.js`/`swimlanes.js`/`ganttDiagramm.js`.
Erneute Prüfung: Byte-für-Byte-Abgleich (Hex-Dump) von Export- und allen
sieben Import-Stellen ergab identische Schreibweise, keine unsichtbaren
Zeichen; ein direktes `import()` aller sechs betroffenen Module UND von
`constants.js` selbst im echten Browser (die exakt gleiche Prüfung, die der
Browser beim Laden durchführt, nicht nur eine Syntaxprüfung einzelner
Dateien) schlug fehl zu reproduzieren - alle Module/Exporte lösten sich
korrekt auf. Eine Suche nach einer zweiten `constants.js`-Kopie im gesamten
Benutzerprofil ergab nur eine unabhängige, JS-lose GitHub-Alt-Version des
Projekts (`Desktop/GitHub/Interface-Krems`, kein `js/`-Ordner vorhanden) -
nicht die Ursache.

**Auf Rückfrage vom Auftraggeber bestätigt:** derselbe Aufruf funktioniert
in einem neuen Inkognito-Fenster fehlerfrei - der Fehler war ein
Browser-Cache-Effekt im ursprünglichen Fenster, der einen normalen
Hard-Refresh überlebt hat (bekanntes Verhalten bei per `import()` dynamisch
geladenen ES-Modulen in manchen Chrome-Versionen - Strg+Shift+R verwirft
nicht zuverlässig jeden Modul-Cache-Eintrag). Kein Code-Defekt, keine
Änderung nötig.

---

## 2026-09-08 (10) – Dringende Fehlermeldung "sechs Module nicht aufrufbar": kein Code-Defekt gefunden, Diagnose + Verifikation aller 15 zuletzt bearbeiteten Module

**Kein Code geändert.** Trotz sehr gründlicher Fehlersuche (Syntax-Check
aller sieben zuletzt geänderten Dateien via `node --input-type=module
--check`, Live-Reproduktion der exakten gemeldeten Bedienfolge - Dropdown-
Wechsel aus Treemap zu Gantt, aus Regesten-Kachelraster zu Dot Plot, sowie
direkte Wechsel zwischen mehreren der sechs gemeldeten Module in Folge -
über mehrere frische Testports) konnte der gemeldete Fehler NICHT
reproduziert werden: alle sechs gemeldeten Module (Dot Plot, Streamgraph,
Ridgeline, Swimlanes, Horizon Chart, Gantt) sowie alle neun als weiterhin
funktionierend gemeldeten Module öffnen sich korrekt über das Dropdown, die
URL aktualisiert sich, Inhalt rendert, keine Konsolenfehler.

**Root-Cause-Mechanismus dennoch bestätigt (erklärt das gemeldete Symptom
strukturell, auch ohne aktuell reproduzierbaren Auslöser):** `app.js`s
`ladeModulUndRender()` ruft `navigiereZu()` (die URL-Aktualisierung) ERST
NACH einem erfolgreichen `import()` UND `render()` auf - ein fehlschlagender
Import/Render hätte exakt das gemeldete Bild zur Folge (URL ändert sich
nicht, keine sichtbare Reaktion), OHNE dass die Routing-Logik selbst einen
Fehler verursacht oder ihn stillschweigend verschluckt (die Exception bleibt
laut `ansichtWechseln.js`s explizitem Kommentar bewusst ungefangen und damit
als Konsolenfehler sichtbar).

**Wahrscheinlichste Erklärung:** ein zwischenzeitlich veralteter Browser-
Cache-Zustand in der Sitzung, in der der Fehler beobachtet wurde (kein
`Cache-Control`-Header auf dem Python-Testserver, mehrere Bearbeitungsrunden
mit Dateiänderungen an denselben sechs Modulen kurz hintereinander - dasselbe
Cache-Verhalten, das in dieser Sitzung bereits mehrfach ein frisches
Neuladen/einen frischen Port erforderte). Empfehlung: harter Reload
(Strg+Shift+R) im betroffenen Browser-Tab bzw. neuer Tab/Port.

Vollständige Verifikation aller 15 zuletzt bearbeiteten Module (die
gemeldeten sechs plus die neun zuvor als funktionierend gemeldeten) siehe
PROJEKTLOG.

---

## 2026-09-08 (9) – Systemischer Clipping-Fix nach Vollbild-Umstellung + einheitliche Achsenbeschriftungsgröße app-weit

**Teil A (Root Cause bestätigt, diesmal MIT Fix):** die Vollbild-
Höhenberechnung reservierte für die "Undatiert"/"Ohne Jahr"-Fläche einen
GESCHÄTZTEN Wert (`RESERVIERT_FUER_UNDATIERT=34`, exakt nur für den
0-Einträge-Fall) statt ihn vorab exakt zu ermitteln - bei einer
Abweichung hätte der `overflow:hidden`-Wrapper in `dotPlot.js` hart
geclippt statt zu scrollen. Fix: "Trockenlauf" von
`zeichneUnbekanntBereich()` in eine unsichtbare SVG-Gruppe liefert den
exakten Platzbedarf VOR der Zeilenhöhen-Berechnung (keine Formel-
Duplikation, `urkundenZeit.js` bleibt unverändert), zusätzlich
`overflow-y:visible` als Sicherheitsnetz in `dotPlot.js`. Live verifiziert
bei 1920×1080 (exakt reproduzierter Bug-Screenshot-Fall) und bei knapper
Höhe (Min-Clamp) - kein Clipping mehr, Zoom/Sidebar unverändert. Dieselbe
Präzisions-Verbesserung auch in `parallelKoordinaten.js`, `swimlanes.js`,
`ridgeline.js`, `horizonChart.js`, `streamgraph.js` angewendet (strukturell
NICHT hart-clipping-gefährdet, da ohne `overflow:hidden`-Wrapper, aber
derselbe Berechnungsfehler lag vor - alle vor der Änderung einzeln
live/statisch geprüft, siehe PROJEKTLOG). `bubbleChart.js`, `marimekko.js`,
`alluvial.js`, `sankey.js` bestätigt NICHT betroffen (kein Element unterhalb
einer Hauptachse).

**Teil B (einheitliche Achsenbeschriftungsgröße):** Referenzwert
`ACHSEN_SCHRIFTGROESSE=14` (= `zeitachse.js`s `TICK_SCHRIFTGROESSE`) neu in
`js/config/constants.js` - zentrale JS-Konstante statt CSS-Variable (SVG-
Präsentationsattribute parsen kein `var()`). Angewendet auf die
Achsen-Tick-Beschriftung von `dotPlot.js`, `ganttDiagramm.js`,
`swimlanes.js`, `ridgeline.js`, `horizonChart.js`, `streamgraph.js`,
`parallelKoordinaten.js` (Tick + Achsentitel) sowie `dotPlot.js`s
Zeilen-Beschriftung (bereits pixelgenau gekürzt, daher sicher anhebbar).
**Live entdeckte, systemische Falle dabei:** `d3.axis...()` setzt bei
JEDEM `.call()` selbst `font-size:10`, ein vorher per `.attr()` gesetzter
Wert wird dadurch überschrieben (auch bei jedem Zoom-Tick) - Fix: Schrift-
größe per CSS-KLASSE statt `.attr()`, exakt das bereits von `zeitachse.js`
für dasselbe Problem etablierte Muster, jetzt auf alle sieben Module
übertragen und live (inkl. nach Zoom-Interaktion) verifiziert. **Randfälle
bewusst NICHT angehoben, explizit dokumentiert:** `swimlanes.js`/
`ridgeline.js`/`horizonChart.js`s Zeilen-Beschriftung (noch zeichenanzahl-
statt pixelbasierte Kürzung, Überlauf-Risiko) und `ganttDiagramm.js`s
Namensspalte (feste, nicht mitwachsende Zeilenhöhe, vertikales
Überlauf-Risiko). `parallelKoordinaten.js`s Kategorie-Achse (16 Ticks ohne
`.ticks(5)`-Begrenzung) live bei minimaler Höhe geprüft - keine
Überlappung. Keine Konsolenfehler in jedem Testschritt.

`docs/VOLLBILD_KONVENTION.md` um Punkt 3c (exakte Reservierung statt
Schätzung) und 3d (Achsenbeschriftungsgröße + d3-Falle) ergänzt.

---

## 2026-09-08 (8) – Dot-Plot-Restfehler (nicht reproduzierbar), Vollbild-Audit aller Module, dauerhafte Vollbild-Konvention

**Teil A (Dot Plot, erneut gemeldeter abgeschnittener Text):** trotz
umfangreicher Tests (Viewports 375×667 bis 1920×1080, Höhen 350-1080px,
kalter/warmer Reload, direkte Hash-Navigation, Zoom, Unsicherheiten-Toggle)
KEINE Clipping-Situation reproduzierbar - die "Undatiert (0)"-Beschriftung
(die Stelle, die "unmittelbar unter der x-Achsen-Beschriftung, unten links"
am ehesten trifft) hält in jedem Test einen Sicherheitsabstand von
mindestens ~12px zu jeder potenziellen Clip-Grenze. Keine Code-Änderung an
`js/viz/dotPlot.js` in diesem Auftrag - siehe PROJEKTLOG für die vollständige
Liste der geprüften Szenarien.

**Teil B (Vollbild-Audit):** alle 31 Module unter `js/viz/` geprüft. 7 bereits
konform (`dotPlot.js`, `ganttDiagramm.js`, `treemap.js`, `sunburst.js`,
`icicle.js`, `circlePacking.js`, `zeitachse.js`). Von den 24 verbleibenden:
**6 in diesem Auftrag auf Vollbild-Standard gebracht** (alle flächenbasiert,
ohne eigene Werkzeugleiste, daher reine `container.clientHeight`-Messung
statt Flex-Wrapper nötig): `bubbleChart.js`, `marimekko.js`,
`streamgraph.js`, `alluvial.js`, `parallelKoordinaten.js`, `sankey.js` -
alle live bei 1920×1080 (deutlich mehr genutzte Fläche, z.B. Marimekko
400px→863px) und bei knapper Höhe (Mindestwert + Seiten-Scroll statt
Clipping) verifiziert, keine Konsolenfehler, Tooltips weiterhin
funktionsfähig. **18 Module bleiben als priorisierter Folgeauftrag offen**
(7 zeilenbasiert, 11 mit unklarem/eigenem Muster - u.a. Karten,
Netzwerk-/Matrix-/Radial-Diagramme, HTML-Tabelle/Kachelraster) - siehe
PROJEKTLOG für die vollständige, priorisierte Liste.

**Teil C:** neue Datei `docs/VOLLBILD_KONVENTION.md` - dauerhafte,
konkrete Checkliste (Laufzeit-Messung, Flex-Wrapper-Muster, Zeilen- vs.
Flächen-Streckung mit Clamp-Referenzwerten, Mindestgröße+Scroll-Fallback,
bestehende Resize-Infrastruktur, Modul-Vertrag) - künftige Aufträge können
sich auf "nach der Vollbild-Konvention umsetzen" beziehen, ohne die Details
erneut auszuformulieren.

---

## 2026-09-08 (7) – Dot Plot: Vollbild-Streckung, Klärung "erneutes Clipping", Tooltip für Kategorie-Labels

**Geänderte Datei:** `js/viz/dotPlot.js` (einzige Datei - kein anderes Modul
berührt, `zoomSteuerung.js`/Zoom-Pan-Logik unverändert).

**Schritt 1 (erneut abgeschnittenes Label) - Befund: KEINE neue
overflow:hidden-Regression.** Live an mehreren Viewport-Größen (480×720 bis
1920×1080), mit/ohne Unsicherheiten-Toggle, mit/ohne Zoom geprüft - kein
Text-Element lag je außerhalb der SVG- oder `.dotplot-plot-bereich`-Grenzen,
"Undatiert (0)" bleibt durch den zentralen Fix aus Eintrag (6) weiterhin
korrekt sichtbar. Das tatsächlich gemeinte Element war die
ZEICHENANZAHL-basierte Ellipsen-Kürzung der Zeilen-Beschriftung
(`kategorie.length > 22 → slice(0,20)+'…'`, reproduziert an "Verkehr, Ver-
und Entsorgung" → "Verkehr, Ver- und En…") - kein CSS-Clipping, sondern
bewusst gekürzter Text ohne Tooltip (= Schritt 3). Der zentrale Fix aus
Eintrag (6) betraf ausschließlich `urkundenZeit.js`s
`zeichneUnbekanntBereich()` - ein komplett anderer, unabhängiger Code-Pfad
von der hier betroffenen, modul-lokalen Zeilen-Beschriftungs-Kürzung in
`dotPlot.js` - konnte diesen Fall strukturell nicht abdecken.

**Schritt 2 (Vollbild-Streckung):** Zeilenhöhe wird jetzt pro Redraw aus der
tatsächlich verfügbaren Höhe (`plotBereich.clientHeight`) berechnet und auf
`[MIN_ZEILENHOEHE=20, MAX_ZEILENHOEHE=44]` geklemmt - Punktradius skaliert
proportional mit. MAX=44px orientiert sich an der bereits im Projekt
etablierten 44px-Zielgröße (Zoom-Buttons in `zoomSteuerung.js`). Verifiziert:
1920×1080 → Zeilenabstand 41.25px/Radius 7.7px (Obergrenze erreicht),
1280×900 → 32.29px/6.03px (Zwischenwert), 1280×350 → 20.39px/3.81px
(Untergrenze, Seite scrollt statt zu clippen).

**Schritt 3 (Tooltip für gekürzte Labels):** `js/utils/beschriftung.js`s
`ermittleBeschriftungstext()` direkt wiederverwendet (bereits
geometrieunabhängig, nimmt hier die feste Spaltenbreite statt einer
Kachel-/Bogen-/Kreisfläche entgegen) - ersetzt die alte
Zeichenanzahl-Heuristik. Bei Kürzung: Tooltip mit vollem Namen
(mouseenter/focus zeigt, mouseleave/blur versteckt), analog zur
Treemap/Sunburst/Icicle/Circle-Packing-Konvention. Live verifiziert:
Hover UND Tastaturfokus zeigen "Verkehr, Ver- und Entsorgung" vollständig.

**Regressionstest:** Zoom (`scaleBy`/Reset unverändert), Clip-Path
(`x=160` unverändert), Sidebar-Toggle bei Punkt-Klick, Info-Button-Popover,
Zoom-Button-Umrandung (weiterhin permanent `rgb(89,89,89)` im Ruhezustand),
Resize auf 3 Viewport-Größen (klein/mittel/groß, siehe Schritt 2). Keine
Konsolenfehler.

---

## 2026-09-08 (6) – Zentraler Fix für urkundenZeit.js + Permanente Zoom-Button-Umrandung

**Geänderte Dateien:** `js/utils/urkundenZeit.js`, `js/viz/dotPlot.js` (lokalen
Guard entfernt), `js/utils/zoomSteuerung.js`. Beide Fixes sind ab sofort Teil
der VORLAGE für die übrigen Urkunden-Module (analog zu `kategorieFarben.js`/
`sidebar.js`/`beschriftung.js`).

**Teil A - zentraler Fix statt lokalem Workaround:** der in Eintrag (5) lokal
in `dotPlot.js` eingeführte Mindesthöhen-Guard (Root Cause: `zeichneUnbekanntBereich()`
lieferte bei 0 Einträgen `bereichsHoehe=0`, zeichnete die Beschriftung aber
trotzdem, SVG-`overflow:hidden` schnitt sie ab) wurde nach `urkundenZeit.js`
selbst verschoben (neue Konstante `MINDEST_HOEHE_LEER=24`,
`zeichneUnbekanntBereich()` liefert jetzt nie mehr eine zu kleine Fläche für
ihre eigene Beschriftung) - alle neun Aufrufer sind automatisch geschützt,
ohne eigenen lokalen Guard. `dotPlot.js`s lokaler
`MINDEST_HOEHE_LEERER_UNBEKANNT_BEREICH`-Guard entfernt, `gesamtHoehe` nutzt
`bereichsHoehe` jetzt direkt. **Vorher/Nachher an Dot Plot:** `svgHeightAttr`
unverändert `394`, `undatiertTextBottom:583.61 < svgBottom:598.61` -
identisches Ergebnis wie mit dem vormals lokalen Fix, jetzt zentral erzeugt.
**Zweites Modul gegengeprüft (swimlanes.js, nutzt denselben ungeschützten
Höhen-Berechnungs-Pattern wie Dot Plot vor dem Fix, KEIN eigener
Workaround):** `"Undatiert (0)"` live reproduziert, `textBottom:589.61 <
svgBottom:604.61` - korrekt nicht abgeschnitten, ohne dass `swimlanes.js`
selbst angefasst wurde. **Hinweis:** ein drittes geprüftes Modul
(`zeitachse.js`) hatte den Bug nie - es entfernt sein `svgUndatiert`-Element
bei 0 Einträgen komplett (`if (ohneJahr.length === 0) svgUndatiert.remove()`),
ein anderes, ebenfalls gültiges Absicherungsmuster. Die übrigen 6 Aufrufer
(`kalenderHeatmap.js`, `parallelKoordinaten.js`, `trellis.js`,
`horizonChart.js`, `ridgeline.js`, `streamgraph.js`) wurden in diesem
Auftrag NICHT einzeln geprüft (Nicht-Ziel) - profitieren aber strukturell
vom selben zentralen Fix.

**Teil B - permanente Button-Umrandung:** Root Cause: der Ruhezustand-Rahmen
nutzte `var(--border)` (#ddd8cf) gegen `var(--bg)` (#f7f5f0)/`var(--surface)`
(#ffffff) - zu geringer Kontrast, praktisch unsichtbar bis zum Hover/Fokus-
Wechsel auf `var(--accent)`. Fix: Ruhezustand nutzt jetzt `var(--text-muted)`
(#595959, bereits im Design-System für sekundären Text etabliert) - Hover/
Fokus wechseln weiterhin auf `var(--accent)`. Live bestätigt (Computed
Style, kein Hover/Fokus aktiv): `borderColor: rgb(89, 89, 89)` an BEIDEN
aktuell nutzenden Modulen (Gantt, Dot Plot); bei Fokus: `rgb(44, 74, 110)`
(Akzentfarbe) an Rahmen UND Outline. Da die Änderung ausschließlich in der
gemeinsamen `zoomSteuerung.js` liegt, gilt sie automatisch für beide Module
sowie alle künftigen Nutzer der Komponente.

**Regressionstest:** Dot Plot (`scaleBy`/Reset unverändert `k:1→1.5→1`,
kein abgeschnittener Text), Gantt (`scaleBy`/Reset unverändert `k:1→2.25→1`,
Sidebar weiterhin funktionsfähig, Adjazenz Zoom-Steuerung↔Info-Button
weiterhin 8px - der `margin-left:auto`-Legendenumbruch-Fix aus Eintrag (5)
bleibt intakt), Tastaturfokus auf den Buttons (`title`/`aria-label` korrekt,
Fokus-Ring sichtbar). Keine Konsolenfehler in jedem Testschritt.

---

## 2026-09-08 (5) – Dot Plot: Nachbesserungen (Vollbild-Regressionsprüfung, abgeschnittener Text, Zoom-Steuerung ausgelagert, Clip-Path, Sidebar) – teilweise rückwirkend für Gantt

**Geänderte/neue Dateien:** `js/viz/dotPlot.js`, `js/viz/ganttDiagramm.js`
(NUR Zoom-Button-Position/-Optik, siehe Punkt 3 - Zoom-/Pan-Logik selbst
unverändert), NEU: `js/utils/zoomSteuerung.js` (Baustein-Muster wie
`kategorieFarben.js`/`sidebar.js`/`beschriftung.js`, jetzt Teil der VORLAGE
für die übrigen 25 Urkunden-Module). `js/utils/urkundenZeit.js` bewusst NICHT
geändert (außerhalb des Auftrags, siehe Punkt 2).

**Punkt 1 (Vollbild weiterhin nicht erreicht) - Befund: KEINE Regression.**
`.viz-inhalt` liefert bei 720px Fensterhöhe live nachgemessen unverändert
503.391px (identisch zum Root-Cause-Befund aus Eintrag (4)) - die neue,
einzeilige Zoom-Button-Werkzeugleiste (44px) verdrängt den Plot-Bereich nicht
relevant. Die Wahrnehmung "nicht vollflächig" war ausschließlich Punkt 2 (s.u.)
plus das bereits in Eintrag (4) dokumentierte, bewusst inhaltsgetriebene
Höhenverhalten (unverändert, dasselbe akzeptierte Verhalten wie
ganttDiagramm.js).

**Punkt 2 (abgeschnittener Text) - Befund: eigenständige Ursache, NICHT nur
Folge von Punkt 1 diesmal.** Live per Ancestor-Chain-Analyse (jeder
Vorfahren-Knoten der "Undatiert"-`<text>` auf `overflow`/`getBoundingClientRect().bottom`
geprüft) isoliert: einzig das `<svg>`-Element selbst (per UA-Stylesheet
standardmäßig `overflow:hidden`) verdeckte den Text (gemessen: `rectBottom
572.61 < textBottom 581.61`, Differenz ≈9px) - alle anderen Vorfahren
(`.dotplot-plot-bereich`, `.dotplot-wurzel`, `.viz-inhalt`, `main`, `body`,
`html`) reichten weit genug. Ursache in `urkundenZeit.js`'
`zeichneUnbekanntBereich()`: liefert bei 0 undatierten Urkunden
`bereichsHoehe=0`, zeichnet die "Undatiert (0)"-Beschriftung (y=16, font-size
11 bold) aber trotzdem. Da diese Datei außerhalb der "Betroffenen Dateien"
dieses Auftrags liegt (potenziell 8 weitere Urkunden-Module betroffen -
swimlanes/streamgraph/ridgeline/horizonChart/marimekko/alluvial/zeitachse +
1), erfolgte der Fix LOKAL in `dotPlot.js`: neue Konstante
`MINDEST_HOEHE_LEERER_UNBEKANNT_BEREICH = 24`, per `Math.max`-Äquivalent
(`bereichsHoehe === 0 ? MINDEST... : bereichsHoehe`) in die
`gesamtHoehe`-Berechnung eingesetzt. Live verifiziert nach Fix:
`textBottom 583.61 < svgBottom 598.61` → nicht mehr abgeschnitten.
**Hinweis für künftige Aufträge an den 8 weiteren Modulen:** derselbe
Root-Cause gilt dort strukturell identisch, sofern ihr jeweiliger
"unbekannt/undatiert"-Bereich auf 0 Einträge fallen kann.

**Punkt 3 (Zoom-Button-Position/-Optik, Dot Plot UND Gantt) - ausgelagert nach
`js/utils/zoomSteuerung.js`:** `erzeugeZoomSteuerung(container)` baut nur
DOM+Optik (drei Buttons, `title`-Attribut + `aria-label`, KEINE
Klick-Handler - der Aufrufer verdrahtet sie selbst, weil `zoomVerhalten` bei
beiden Modulen erst NACH dem SVG-Aufbau existiert, die Werkzeugleiste aber
VORHER gebaut wird) - reines Baustein-Muster, kennt d3.zoom() nicht.
**Wichtiger Befund:** Gantts tatsächlicher Vorzustand hatte die Zoom-Buttons
NICHT neben dem Info-Button (live gemessen: 1061px Abstand, Buttons oben
links, Info-Button oben rechts) - das war eine Fehlannahme im Auftragstext,
keine reale Ausgangslage. Der Soll-Zustand war trotzdem eindeutig und wurde
für beide Module identisch umgesetzt: Zoom-Steuerung + Info-Button als EIN
gemeinsamer rechter Flex-Wrapper (`.gantt-werkzeugleiste-rechts` /
`.dotplot-werkzeugleiste-rechts`, `gap:var(--space-2)`), garantiert Adjazenz
unabhängig von `justify-content`/Kindanzahl. Umrandung: die Button-GRUPPE
(nicht jeder Button einzeln) trägt einen Rahmen (`border:1px solid
var(--border)`, Trennlinien zwischen den Buttons per `border-left`), nimmt
bei Hover/Fokus eines Buttons per `:has()` die Akzentfarbe an.
**Nachträglich gefundener und behobener Zwischenfehler:** bei Gantt wickelt
sich die Legende (`.gantt-legende`) bei vielen Kategorien über die volle
Zeilenbreite - der rechte Wrapper landete dadurch per `flex-wrap` auf einer
eigenen zweiten Zeile, wo er als einziges Element von
`justify-content:space-between` fälschlich LINKS statt rechts platziert
wurde (live reproduziert). Fix: `margin-left:auto` auf beiden
`-werkzeugleiste-rechts`-Wrappern (robust unabhängig von Zeilenumbrüchen) -
in beiden Modulen live nachverifiziert (Gantt: 1075px/1249px, Lücke 8px;
Dot Plot: rechtsbündig, Lücke 8px).

**Vorher/Nachher-Vergleich Gantt (Auftrag, explizit gefordert):** Zoom-Logik
per JS-Simulation gegen den unveränderten `d3.zoom()`-Mechanismus geprüft -
`scaleBy`(+1.5×zweimal)→`k:2.25`, `transform`(Reset)→`k:1,x:0,y:0`, exakt wie
vor der Auslagerung (nur `zoomVerhalten`-Erzeugung/-Filter/-Extent
unverändert im Code). Sidebar-Öffnen per Balken-Klick weiterhin
funktionsfähig (`offen:true`, korrekter Titel). Keine Konsolenfehler.

**Punkt 4 (Punkte wandern beim Zoom in die Beschriftungsspalte) -
clip-path:** `.dotplot-punkte`-Gruppe trägt jetzt `clip-path:url(#dotplot-punkte-clip)`
mit einem Rechteck ab `x=RAND.links` (160) bis `breite-RAND.rechts` - rein
geometrisch, unabhängig vom `d3.zoom()`-Transform (der nur `cx` verändert,
die SVG-Clip-Geometrie bleibt fix). Verifiziert: bei Reproduktion eines
Zoom-/Pan-Zustands existierte ein Punkt mit `cx=-793.8` (weit im
Beschriftungsbereich) - laut DOM vom clip-path korrekt erfasst (Rechteck
`x=160`); bei Zoom auf `k=20` (Maximum) zentriert auf die
Beschriftungsspalten-Grenze: 0 von 1069 Kreisen überlappten die
"Religion"-Beschriftung (Label-rechte-Kante 168px, nächster sichtbarer
Kreis links bei 305px).

**Punkt 5 (Sidebar bei Klick auf einen Punkt):** wiederverwendet aus
`sidebar.js` NUR das Gerüst/Öffnen-Schließen-Verhalten
(`baueSidebarGeruest`/`schliesseSidebar`/`fuegeSidebarStyleEin`), NICHT
`baueSidebarInhalt()`/`STANDARD_SIDEBAR_FELDER` (Bestand-Schema passt nicht
auf Urkunden-Records) - Inhalt lokal in `dotPlot.js` gebaut
(`baueUrkundenSidebarInhalt()`: Datum/Regest/Personen/Orte,
Unsicherheits-Hinweis), zeigt ALLE pipe-getrennten Kategorien aus
`record.kategorien` als Badges (nicht nur die für die Zeilen-Zuordnung
verwendete Primärkategorie aus `ersteKategorie()`, Auftrag wörtlich) -
live verifiziert an StaAKr-0001 (Badges: "Religion" UND "Vermögen und
Finanzen", beide Kategorien der Urkunde). `signatur` als stabiler
Toggle-Schlüssel (gegen `urkunden.csv` verifiziert: alle 1069 Werte
vorhanden und einzigartig, 0 leere/doppelte). Toggle-Verhalten (erneuter
Klick schließt, Fokus kehrt zum Punkt zurück), Tastatur-Aktivierung
(Enter), Schließen-Button - alle live verifiziert, keine Konsolenfehler.

**Regressionstest (Testports 9931→9932→9933, je bei ES-Modul-/HTTP-Caching
neu gestartet, danach zurückgesetzt):** Gantt (Zoom-Verhalten unverändert,
Sidebar funktionsfähig, Info-Button-Popover unverändert), Dot Plot (Vollbild,
Legende/Zeilen-Beschriftung, Zoom/Pan inkl. Clip-Verhalten,
Sidebar-Toggle/Tastatur/Schließen-Button, Info-Button, Kategorie-Farben inkl.
Mehrfach-Kategorie-Badges), Tastaturfokus auf den neu positionierten Buttons
(sichtbarer Fokus-Ring bestätigt), Modulwechsel/Resize/Unsicherheiten-Toggle
(destroy/redraw-Zyklus) - in jedem Schritt keine Konsolenfehler.

**Direkte Dateiverifikation:** `grep -n "erzeugeZoomSteuerung"
js/viz/ganttDiagramm.js js/viz/dotPlot.js js/utils/zoomSteuerung.js` → in
allen drei Dateien vorhanden (Definition + je ein Aufruf); `grep -n
"gantt-zoom-buttons\|dotplot-zoom-buttons" js/viz/ganttDiagramm.js
js/viz/dotPlot.js` → keine Treffer (alte lokale Zoom-Button-Klassen
vollständig entfernt); `grep -n "clip-path\|clipPath" js/viz/dotPlot.js` →
vorhanden; `js/utils/urkundenZeit.js` unverändert (kein
`MINDEST_HOEHE`-Bezug dort, Fix bewusst lokal in `dotPlot.js`).

---

## 2026-09-08 (4) – Urkunden-Dot-Plot: Vollbild, Info-Button, Kategorie-Farben, Zoom/Pan (VORLAGE FÜR URKUNDEN-MODULE)

**Geänderte Datei:** `js/viz/dotPlot.js` (Pfad, kein `js/viz/urkunden/`-Unterordner
- alle 31 Module liegen flach in `js/viz/`). Erstes von 26 Urkunden-Modulen auf
den Bestand-Qualitätsstand gebracht - **künftige Aufträge für die übrigen 25
Urkunden-Module können auf diesen Eintrag sowie den ausführlichen
Root-Cause-Befund in `docs/PROJEKTLOG.md` verweisen**, statt die Analyse zu
wiederholen (siehe dortiger Vermerk).

**Schritt 1 (Root-Cause, alle vier Punkte live geprüft, siehe PROJEKTLOG für
die vollen Messwerte):**
- **Vollbild:** `container` ist bei Urkunden-Modulen dieselbe `.viz-inhalt`
  wie bei den 5 Bestand-Modulen (`app.js`' `erzeugeUnterContainer('viz-inhalt')`,
  identisch für `renderBestandTab()`/`renderVisualisierungenTab()`) - KEINE
  separate Layout-Struktur. `.viz-inhalt` bekommt über das gemeinsame CSS-Grid
  bereits korrekt die volle Höhe (live vermessen: 503px bei 720px Viewport,
  Grid-Stretch funktioniert wie vorgesehen). Der eigentliche Fehler: dotPlot.js
  hatte GAR KEINE eigene `<style>`-Injektion/Werkzeugleiste, versuchte nie, die
  verfügbare Höhe zu nutzen. Fix nach ganttDiagramm.js' Muster (eigener
  `.dotplot-wurzel`-Wrapper, NICHT treemap.js' Muster des direkten
  `.viz-inhalt`-Überschreibens - sauberer/robuster).
- **Info-Button:** `infoButton.js` war schlicht NICHT importiert (nicht:
  importiert, aber falsch eingebunden).
- **Abgeschnittener Text:** die "Undatiert (N)"-Beschriftung
  (`zeichneUnbekanntBereich()`, unverändert) wird an KEINER Stelle per CSS
  `overflow:hidden` abgeschnitten - `.viz-inhalt` hat `overflow:visible`. Die
  Wahrnehmung "abgeschnitten" entstand durch fehlende Werkzeugleisten-Struktur
  bei knapper Fensterhöhe (Seiten-Scroll nötig, aber optisch nicht erkennbar) -
  direkt von Punkt 1 abhängig, keine eigenständige Ursache. Nach dem Fix bei
  400px Fensterhöhe live verifiziert: Text vollständig erreichbar, kein
  Abschneiden.
- **Zoom/Pan:** im Code nicht vorhanden (nicht: vorhanden aber
  deaktiviert/kaputt) - beim Neuaufbau nie übernommen.

**Schritt 2 (Vollbild):** `.dotplot-wurzel{display:flex;flex-direction:column;
height:100%}` + `.dotplot-plot-bereich{flex:1 1 auto;overflow:hidden}` -
exakt ganttDiagramm.js' Struktur. Empfehlung dokumentiert (siehe PROJEKTLOG),
NICHT umgesetzt: keine zentrale layout.css-Änderung nötig, da `.viz-inhalt`
bereits korrekt funktioniert - jedes der 25 verbleibenden Module braucht
lediglich denselben modul-lokalen Wrapper.

**Schritt 3 (Info-Button):** Text (zur Prüfung):
> Dieser Dot Plot zeigt, wie sich die Urkunden über die Zeit und nach
> Kategorie verteilen. Jede Punktreihe entspricht einer Kategorie, die
> x-Achse dem Jahr der Urkunde - je dichter die Punkte an einer Stelle,
> desto mehr Urkunden wurden in diesem Zeitraum dieser Kategorie zugeordnet.
>
> „(ohne Kategorie)" fasst Urkunden ohne zugeordnete Kategorie in einer
> eigenen Zeile zusammen, statt sie auszublenden. Urkunden ohne auswertbares
> Jahr erscheinen im grau hinterlegten Bereich unten.
>
> Ziehen verschiebt die Zeitachse, Strg+Mausrad bzw. Trackpad-Pinch zoomt
> hinein oder heraus; die Buttons +/−/⟷ bieten dieselbe Funktion für
> Tastatur und Touch.

**Schritt 4 (Kategorie-Farben-Abgleich):** `baueKategorieFarbSkala()` aus
`kategorieFarben.js` baut die Skala DATENGETRIEBEN aus den tatsächlich in
`urkunden.csv` vorkommenden Kategorien (`ersteKategorie()`-Ergebnissen) - im
Unterschied zur alten, statischen `CAT_COLORS` (constants.js) kann dadurch
STRUKTURELL keine "fehlende Farbe" mehr auftreten. "Privatvermögen" (vom
Auftraggeber als möglicher Sonderfall benannt) kommt in `urkunden.csv`
NACHWEISLICH nur EINMAL vor (Datensatz StaAKr-0192) und dort NUR als
zweite/dritte von drei Pipe-getrennten Kategorien (`Grund und
Boden|Privatvermögen|Wirtschaft`) - `ersteKategorie()` (unverändert, gemeinsam
mit 9 weiteren Modulen genutzt) liefert nur die ERSTE, wodurch "Privatvermögen"
nie als eigene Dot-Plot-Zeile erscheint. Kein Fehler, keine fehlende
Farbzuordnung - live per `dataLoader.js` gegen alle 1069 Records verifiziert
(15 echte Erst-Kategorien + "(ohne Kategorie)" = 16 Zeilen, exakt "Privatvermögen"
als einzige rein-sekundäre Kategorie identifiziert).

**Schritt 5 (Zoom/Pan):** exakt ganttDiagramm.js' `wireZoom()`-Muster
übernommen - KEINE `.transition()` (rAF-Pitfall bei inaktivem Tab vermieden),
`translateExtent()`/`extent()` auf die volle SVG-Pixelfläche (Pitfall "zu eng"
vermieden). Live bestätigt: Zoom-Buttons (+/−/⟷) und Strg+Wheel verändern
Punkt-Positionen korrekt, einfaches Wheel löst KEIN `preventDefault()` aus
(Seiten-Scroll bleibt frei). Drag-Pan nutzt denselben, bereits produktiv
bewährten `d3.zoom()`-Mechanismus - direkte Browser-Simulation von Drag-Gesten
war in diesem Testwerkzeug nicht möglich (identisches Verhalten am
unveränderten ganttDiagramm.js reproduziert, siehe PROJEKTLOG), daher indirekt
über Wheel-Zoom auf derselben `zoomVerhalten`-Instanz sowie Code-Identität mit
ganttDiagramm.js abgesichert.

**Schritt 6 (abgeschnittener Text):** verschwindet nach Schritt 2 tatsächlich
von selbst (siehe Schritt 1).

**Regressionstest (Testport 9826, danach zurückgesetzt):** Bestand-Module
(Treemap) unverändert, Info-Button-Inhalt korrekt, Kategorie-Farben inkl.
"(ohne Kategorie)" (`#8a8a8a`, korrekt von allen 15 echten Kategoriefarben
unterschieden), Zoom-Buttons/Strg+Wheel/Kantenklemmen, Tooltip/Hover (bereits
vorhanden, unverändert funktionsfähig - kein Folgeauftrag nötig), Resize,
Modulwechsel weg/zurück (destroy/render), Tastaturfokus (eigener
Fokus-Indikator: `stroke:var(--accent)` statt rechteckigem Standard-Outline) -
keine Konsolenfehler in jedem Testschritt.

**Direkte Dateiverifikation:** `grep -n "^import" js/viz/dotPlot.js` → vier
Imports (tooltip, urkundenZeit, kategorieFarben, infoButton) bestätigt; `grep
-n "CAT_COLORS" js/viz/dotPlot.js` → keine Treffer (vollständig ersetzt);
`grep -rln "dotplot\|dotPlot" js/viz/treemap.js js/viz/sunburst.js
js/viz/icicle.js js/viz/circlePacking.js js/viz/ganttDiagramm.js` → keine
Treffer (5 Bestand-Module unangetastet); `grep -rn "DIAG\|TEMPORAERER" js/` →
keine Treffer.

---

## 2026-09-08 (3) – Bugfix: Falsche Kategorie im Tooltip in Zoomansichten (kategorieVonKnoten)

**Geänderte Dateien:** `js/utils/bestandsHierarchie.js`, `js/viz/circlePacking.js`
(einzige Modul-Datei mit Anpassungsbedarf). Kein Depth-Wert einfach getauscht
(würde den Fehler in der Nicht-Zoom-Ansicht umgekehrt reproduzieren) - stattdessen
neues, tiefenunabhängiges `ebenenTyp`-Attribut ('kategorie' | 'unterkategorie' |
'bestand', exportierte Konstanten `EBENENTYP_KATEGORIE`/`_UNTERKATEGORIE`/
`_BESTAND`), das `baueBestandsHierarchie()` jedem Knoten mitgibt.
`kategorieVonKnoten()` sucht jetzt über `d.ancestors()` nach diesem Attribut
statt nach `depth === 1` - bleibt dadurch korrekt, unabhängig davon, ob/wo eine
Kategorie-Zoomansicht die Hierarchie neu verwurzelt.

**Systematische Prüfung aller fünf Module (live an "Steuerbücher" nachvollzogen,
nicht nur vermutet):**
- **Sunburst, Circle Packing:** bereits bestätigt betroffen (siehe vorheriger
  Nutzer-Report) - Zoomansicht baut `d3.hierarchy(aktuelleKategorieDaten)` bzw.
  eine flache Teilhierarchie neu auf.
- **Icicle, Treemap:** GEGENGEPRÜFT (nicht nur angenommen) - beide bauen ihre
  Kategorie-Ansicht ebenfalls über `d3.hierarchy(aktuelleKategorieDaten)` neu
  auf (`anzeigeDaten = aktuelleKategorieDaten || hierarchieDaten`, identisches
  Muster wie Sunburst) und waren daher GLEICHERMASSEN betroffen - vor dem Fix
  live reproduziert.
- **Gantt-Diagramm:** einzige Ausnahme - baut nur EINE Hierarchie, immer ab
  `hierarchieDaten` (Gesamtbestand), kein Zoom-in-Kategorie-Muster - nie
  betroffen, live bestätigt unverändert korrekt.

**Zusätzlicher, beim Verifizieren entdeckter Folgefehler:** `baueTooltipText()`s
Unterkategorie-Zeile verließ sich auf `blatt.parent` ohne zu prüfen, ob dieser
Elternknoten tatsächlich eine Unterkategorie ist - in Circle Packings flacher
Zoomansicht (keine Unterkategorie-Zwischenebene) zeigte das fälschlich denselben
Wert wie die Kategorie-Zeile. Fix: Zeile erscheint nur noch bei
`blatt.parent.data.ebenenTyp === EBENENTYP_UNTERKATEGORIE` - fehlt die
Zwischenebene, entfällt die Zeile ganz (wie beim bereits bestehenden
OHNE_UNTERKATEGORIE-Fall), statt einen falschen Wert zu zeigen.

**Live-Verifikation (Testport 9694, danach zurückgesetzt) - drei Bestände,
alle fünf Module, exakter Vergleich mit `data/bestandsverzeichnis.csv`:**

| Bestand | bkk_kategorie (CSV) | bkk_unterkategorie (CSV) |
|---|---|---|
| Steuerbücher | Vermögen und Finanzen | Öffentliches Vermögen |
| Sparkasse Krems | Wirtschaft | Dienstleistungen |
| Bürgerbücher | Verwaltung | Kommunale Verwaltung |

Alle drei Bestände zeigen jetzt in Sunburst (Übersicht + Zoom), Circle Packing
(Übersicht + Zoom), Treemap (Zoom) und Icicle (Übersicht + Zoom) exakt die
korrekte Kategorie/Unterkategorie aus obiger Tabelle - per
`document.getElementById('geteilter-tooltip').textContent` ausgelesen, nicht
nur per Screenshot geprüft. Gantt zeigt "Steuerbücher" ebenfalls korrekt
(unverändert). Keine Konsolenfehler in jedem der ca. 15 Einzeltests.

**Direkte Dateiverifikation:** `grep -n "EBENENTYP_\|ebenenTyp"
js/utils/bestandsHierarchie.js` → Konstanten, Vergabe beim Aufbau, Nutzung in
`kategorieVonKnoten()`/`baueKnotenTooltipText()`/`baueTooltipText()` bestätigt;
`grep -n "EBENENTYP_KATEGORIE\|ebenenTyp" js/viz/circlePacking.js` → Import und
Vergabe an `flacheDaten` bestätigt; kein aktiver Code mehr, der auf
`d.depth === 1` prüft (nur noch in erklärenden Kommentaren erwähnt); `grep -rn
"DIAG\|TEMPORAERER" js/` → keine Treffer.

---

## 2026-09-08 (2) – Beschriftungs-Kürzung mit Ellipse – gemeinsame Utility für 4 Module

**Neue Datei:** `js/utils/beschriftung.js`. **Geändert:** `js/viz/treemap.js`,
`js/viz/sunburst.js`, `js/viz/icicle.js`, `js/viz/circlePacking.js` (Import +
Integration an der jeweils bestehenden Beschriftungs-Stelle). `js/viz/
ganttDiagramm.js` unangetastet (grep-bestätigt, siehe unten).

**Schritt 1 (Root-Cause-Check):** Die "voller Name oder gar kein Text"-Logik
war in den vier Modulen NICHT identisch dupliziert, sondern jedes Modul hatte
sein eigenes, geometrieabhängiges Verfahren: `treemap.js`
(`platziereAutoFitText()`, MEHRZEILIGER Wortumbruch in ein Rechteck),
`sunburst.js` (`fuegeSegmentBeschriftungEin()`, einzeilig entlang eines
Kreisbogens mit Radius-abhängiger Bogenlänge), `icicle.js`
(`platziereBeschriftung()`, einzeilig in ein Rechteck, kein Wortumbruch),
`circlePacking.js` (bislang gar keine eigene Funktion, sondern eine Inline-
Schleife mit Kreis-Sehnenbreiten-Formel). Extrahierbar war ausschließlich der
in allen vieren GLEICHE letzte Schritt: "passt der Name bei der (vom Aufrufer
bereits geometrieabhängig berechneten) verfügbaren Breite bei
MIN_SCHRIFTGROESSE nicht mehr vollständig - reicht wenigstens eine Kürzung
mit '…'?" - genau dieser Schritt wandert jetzt in `js/utils/beschriftung.js`
(`ermittleBeschriftungstext(name, verfuegbareBreite, schriftgroesse,
zeichenBreiteFaktor)`), alles Geometrische bleibt bewusst modul-lokal
(Nicht-Ziel: keine Änderung an der Skalierungslogik).

**Integration:** jedes Modul behält seine bestehende, unveränderte
Schriftgrößen-Suche (größte Schriftgröße, bei der der VOLLE Name passt) exakt
bei - erst wenn diese bei JEDER erlaubten Schriftgröße scheitert, wird die
neue Funktion EIN einziges Mal bei MIN_SCHRIFTGROESSE aufgerufen. `treemap.js`/
`sunburst.js` geben jetzt einen Tri-State (`'voll' | 'gekuerzt' | false`)
zurück statt eines reinen Booleans (rückwärtskompatibel für alle
Wahrheitswert-Prüfungen); `icicle.js`/`circlePacking.js` bleiben bei einem
einfachen `true`/`false`-Signal, da dort der Tooltip ohnehin unconditional
gewirt wird. In `treemap.js`s Wurzel-Ansicht wird der Tooltip-Ersatz jetzt bei
`!== 'voll'` (statt nur `!beschriftet`) gewirt, damit er auch bei gekürzter
Anzeige greift. In `sunburst.js`s Kategorie-Ring zeigt der Tooltip bei
`'gekuerzt'` jetzt die ausführlichere Variante mit Bestände-Zahl statt nur des
(dann nicht mehr vollständig sichtbaren) Namens.

**Live-Verifikation (Testport 9467, danach zurückgesetzt):**
- Treemap: "Kammeramtsrechnungen" (93×61px-Kachel) zeigt jetzt "Kammeramtsre…"
  bei 11px, Tooltip zeigt weiterhin "Kammeramtsrechnungen" vollständig (vorher:
  kein Label, da ein einzelnes 20-Zeichen-Wort bei keiner Zeilenbreite
  vollständig passte). "Oberkammeramts-Rechnungssammler" (34×56px-Kachel)
  bleibt korrekt OHNE Text (selbst "Obe…" passt bei diesem Breiten-Budget
  nicht). 109 von 116 sichtbaren Wurzel-Labels sind jetzt gekürzt statt vorher
  leer.
- Sunburst: "Öffentliches Vermögen" → "Öffentliches …" im Unterkategorie-Ring
  der Zoomansicht; volle Namen wie "Privatvermögen"/"Steuerbücher" bleiben bei
  ausreichend Platz unverändert vollständig sichtbar (keine unnötige Kürzung).
- Icicle/Circle Packing: beide zeigen live mehrere gekürzte Labels
  ("Gesundhe…", "Kammeram…" etc.), Tooltip bestätigt vollen Namen
  ("Kammeramtsrechnungen") bei gekürztem "Kammeram…"-Label in Circle Packing.
- Gantt-Diagramm: unverändert, eigene Namensspalten-Kürzung weiterhin aktiv,
  keine Konsolenfehler.
- Regressionstest: Sidebar-Klick, Fokus-Indikator, Farbcodierung, Zoom
  (alle vier Module), Resize/Destroy - keine Konsolenfehler in jedem
  Testschritt.

**Direkte Dateiverifikation:** `grep -n "import { ermittleBeschriftungstext }"
js/viz/treemap.js js/viz/sunburst.js js/viz/icicle.js
js/viz/circlePacking.js` → alle vier bestätigt; `grep -n
"ermittleBeschriftungstext\|utils/beschriftung" js/viz/ganttDiagramm.js` →
keine Treffer (unverändert); `grep -rn "DIAG\|TEMPORAERER" js/` → keine
Treffer.

---

## 2026-09-08 (1) – Sunburst: Rückkehr zur 3-Ebenen-Ansicht

**Geänderte Datei:** `js/viz/sunburst.js` (einzige Datei). `treemap.js`/
`circlePacking.js`/`js/utils/kategorieFarben.js`/`js/utils/sidebar.js`/
`js/utils/bestandsHierarchie.js` unangetastet - grep-bestätigt (siehe unten).

**Schritt 1 (Root-Cause-Check, VOR der Umsetzung geprüft):** `sunburst.js`
nutzt dieselbe `baueBestandsHierarchie()` aus `bestandsHierarchie.js` wie
`icicle.js` - unverändert seit der Icicle-Etappe. `MINDESTGROESSE_ROH_SUNBURST
= 0.05` bleibt nach Ergänzung der dritten Ebene korrekt: der Wert wirkt als
Floor auf `record.umfang_lfm` ausschließlich an der BLATT-Ebene (in
`baueBestandsHierarchie()`), unabhängig davon, wie viele Ebenen darüber
später als Ring gezeichnet werden - die Ringanzahl ist eine reine
Darstellungsentscheidung in `zeichneSunburst()`, berührt die Wertberechnung
nicht. Zusätzlich bereits empirisch bestätigt: `icicle.js` nutzt exakt
denselben Wert für eine bereits produktiv 3-ebenige Darstellung.

**Schritt 2 (drei konzentrische Ringe):** Übersicht zeigt jetzt Kategorie
(innen), Unterkategorie (mittig), Bestand (außen) gleichzeitig - jeder Ring
bekommt eine eigene, gleich breite Radius-Bande über `[INNERER_RADIUS,
aussenRadius]`. Mindest-Bogenlänge (24px) wird PRO RING aus dessen EIGENEM
Außenradius berechnet (`mindestWinkelFuerBand()`), nicht mehr aus dem
globalen Außenradius - weiter innen liegende Ringe brauchen bei gleicher
Ziel-Bogenlänge einen größeren Mindestwinkel. Dieselbe hierarchische
Korrektur-Kaskade wie `icicle.js` (`korrigiereWinkelPropagiertProElternteil()`/
`skaliereNachkommenWinkel()`, hier für Winkel statt Pixel-Breite - x0/x1 sind
bei `d3.partition()` in beiden Fällen dasselbe 1D-Intervall) verhindert den
dortigen Präzedenzfall (Kacheln laufen aus der Elternspanne heraus). Farbe:
Kategorie-Ring in vollen Kategoriefarben (`faerbeKategorieSegment()`,
unverändert), Unterkategorie-Ring NEU über `faerbeUnterkategorieSegment()`
(dieselbe `farbeFuerUnterkategorie()` aus `kategorieFarben.js`, jetzt direkt
auf den Unterkategorie-Knoten selbst angewendet statt nur zur
Bestand-Feinabstufung), Bestand-Ring unverändert über `faerbeBestandSegment()`.
"Ohne Kategorie" (Sonderfarbe + Punktmuster) live auf allen drei Ringen
bestätigt (1 Kategorie-, 1 Unterkategorie-, 2 Bestand-Segmente).

**Schritt 3 (einheitliches Klick-Verhalten):** neue `kategorieDatenVonKnoten(d)`
(analog zu `icicle.js`, läuft über `d.ancestors()` bis Tiefe 1) - Klick auf
JEDES Segment in JEDEM der drei Übersicht-Ringe zoomt in dieselbe
Kategorie-Ansicht. Live bestätigt: Klick auf Unterkategorie-Ring-Segment
("Kategorie Verwaltung öffnen") UND auf Bestand-Ring-Segment ("Kategorie
Vermögen und Finanzen öffnen") lösen beide korrekt denselben Zoom aus wie ein
Kategorie-Ring-Klick.

**Schritt 4 (Zoomansicht, weiterhin zwei Ringe):** Zentrum unverändert
(Kategoriename + "← zurück", `zeichneZentrum()` nicht angetastet). Innerer
Ring: Unterkategorien der gewählten Kategorie. Äußerer Ring: deren
Einzelbestände. Bestand-Klick: Sidebar-Toggle wie bisher (live bestätigt:
öffnet/schließt korrekt, Auswahl-Rahmen sichtbar). Unterkategorie-Klick: **OHNE
Wirkung** (kein `tabindex`, kein `role`, `cursor: auto`, live per
`getComputedStyle()` bestätigt) - Begründung: (a) eine Unterkategorie-Gruppe
hat keinen einzelnen `record` für die Sidebar, deren Detailansicht ist strikt
pro Bestand konzipiert (Nicht-Ziel: kein neues Sidebar-Wrapper-Muster); (b)
anders als bei Kategorien gibt es darunter keine weitere Zoom-Ebene, in die ein
Klick sinnvoll führen könnte - die Kategorie-Ansicht ist bereits die tiefste
Navigationsebene; (c) dieses Modul hat mit dem Zentrum in der Übersicht
bereits selbst die Konvention "reine Information, kein Klick-Ziel, kein
Zeigercursor" etabliert (`zeichneZentrum()`s eigener Kommentar: "vermeidet
genau die ... Verwechslung 'sieht klickbar aus, ist es aber nicht'") - die
inerte Unterkategorie folgt derselben, bereits im Modul vorhandenen
Konvention statt eine neue (z. B. Hervorhebungs-Mechanik mit eigenem
Reset-Zustand) einzuführen. Hover-/Fokus-Tooltip bleibt trotzdem informativ
nutzbar.

**Schritt 5 (Beschriftung/Tooltip):** `fuegeSegmentBeschriftungEin()`
unverändert wiederverwendet (bereits Level-agnostisch: liest nur `d.y0/y1/
x0/x1`). Tooltip-Text pro Ring: Kategorie unverändert (voller Text nur wenn
kein Label passte), Unterkategorie neu (`"<Name> (Kategorie: X, N Bestände)"`,
Formulierung an `icicle.js` angeglichen), Bestand unverändert
(`baueTooltipText(d)`).

**Schritt 6 (Info-Button/Unsicherheiten-Toggle unverändert):** Info-Button-
Mechanismus (einmalige Erzeugung in `render()`, kein destroy()/Neubau bei
Redraw) unangetastet - nur der TEXT wurde inhaltlich an die drei Ringe
angepasst (reine Wortwahl, siehe `SUNBURST_INFO_TEXT`). `resize({show
Uncertainty})` unverändert (`export function resize()` byte-identisch) - live
bestätigt: Toggle funktioniert, unsichere Bestände im Zoom-Bestand-Ring
korrekt mit Schraffur/Warnsymbol markiert (2 von 142 in der getesteten
Kategorie).

**Regressionstest (Testport 9358, danach zurückgesetzt):**
- Treemap UND Circle Packing: Screenshot zeigt unverändertes 2-Ebenen-Modell
  (nur Kategorie-Kacheln/-Kreise auf Ebene 1 sichtbar), keine Konsolenfehler -
  keine versehentliche Übertragung des 3-Ebenen-Verhaltens.
- Fokus-Indikator: `getComputedStyle()` bestätigt `outline-style: none` bei
  fokussiertem Segment UND korrekten Stroke-Wechsel (Ruhezustand `#ffffff`/1px
  → Fokus `#e07820`/3px → zurück nach `blur()`) - derselbe Bogenform-Indikator
  wie zuvor, für alle drei Ring-Arten bestätigt.
- Sidebar-Toggle, Zoom/Rücksprung (Zentrum-Klick), Resize/Destroy
  (Modul-Wechsel weg und zurück, sauberer Neuaufbau), Info-Button, Un-
  sicherheiten-Toggle: alle live bestätigt, keine Konsolenfehler in jedem
  Testschritt.

**Nebenbefund (NICHT behoben, außerhalb des Auftragsumfangs, siehe
Nicht-Ziel "keine Änderung an bestandsHierarchie.js"):** in der Zoomansicht
zeigt der Bestand-Tooltip (`baueTooltipText()` → `kategorieVonKnoten()`, beide
aus `bestandsHierarchie.js`) fälschlich die UNTERKATEGORIE statt der echten
Kategorie in der Zeile "Kategorie: ...", weil `kategorieVonKnoten()` per
`d.ancestors().find(v => v.depth === 1)` sucht - in der Zoomansicht wird die
Hierarchie aber lokal ab der Kategorie neu aufgebaut (`d3.hierarchy
(aktuelleKategorieDaten)`), wodurch dort depth 1 bereits die Unterkategorie
ist, nicht die Kategorie. Live reproduziert: Tooltip zeigte "Kategorie:
Staatliche Verwaltung" und "Unterkategorie: Staatliche Verwaltung" identisch,
obwohl die tatsächliche Kategorie "Verwaltung" hieß (korrekt sichtbar im
Zentrum UND im Sidebar-Badge, das `instanz.aktuelleKategorieDaten.name` direkt
nutzt statt über `kategorieVonKnoten()` zu gehen). Bug ist PRE-EXISTING (exakt
derselbe Code-Pfad existierte unverändert bereits in der vorigen 2-Ebenen-
Fassung dieses Moduls, betrifft also nicht nur die hier neu hinzugekommene
Unterkategorie-Ebene) und liegt in der geteilten `bestandsHierarchie.js`,
NICHT in diesem Auftrag behoben (Nicht-Ziel). Dem Auftraggeber separat
gemeldet.

**Direkte Dateiverifikation:** `grep -n "korrigiereWinkelPropagiertProElternteil\|
faerbeUnterkategorieSegment\|sunburst-segment-" js/viz/treemap.js
js/viz/circlePacking.js` → keine Treffer (unverändert); `grep -n
"^function korrigiereWinkelPropagiertProElternteil\|^function
skaliereNachkommenWinkel\|^function faerbeUnterkategorieSegment\|^function
kategorieDatenVonKnoten" js/viz/sunburst.js` → alle vier neuen Funktionen
bestätigt; `grep -rn "DIAG\|TEMPORAERER" js/` → keine Treffer.

---

## 2026-09-07 (13) – Kleinauftrag: Legenden-Position anpassen

**Geänderte Datei:** `js/viz/kalenderHeatmap.js` (einzige Datei). Korrigiert
nur die POSITION aus Eintrag (12), nicht die optische Gestaltung - die
Farbmuster-Quadrate (echter `d3.interpolateBlues`-Verlauf) bleiben unverändert
bestehen.

**Umsetzung:** die Legende ist jetzt eine eigenständige Flex-Gruppe
(`.kal-legende-gruppe`, dasselbe Muster wie `.kal-modus-gruppe`/
`.kal-regler-gruppe`), in `baueWerkzeugleiste()` direkt nach `reglerGruppe`
angehängt (`instanz.werkzeugleiste.append(modusGruppe, reglerGruppe,
legendeGruppe)`) - erscheint dadurch unmittelbar nach "Anwenden"/"Alle" in
derselben Zeile, statt wie in Eintrag (12) als eigene Zeile darunter. Die
eigene `.kal-legende-zeile`-Zeile (Container, CSS-Regeln inkl. der
`[hidden]`-Spezifitäts-Absicherung) ist vollständig entfernt - da die Legende
jetzt ein normales Kind von `.kal-werkzeugleiste` ist, übernimmt dessen
bereits bestehendes `flex-wrap:wrap` den Zeilenumbruch UND dessen bereits
bestehende `hidden`-Steuerung (Mindestgrößen-Platzhalter) automatisch mit -
kein separates `instanz.legendeZeile.hidden` mehr nötig.
`legendeFarbenElement`/`legendeMaxElement` werden entsprechend jetzt in
`baueWerkzeugleiste()` statt in `render()` erzeugt und direkt auf `instanz`
geschrieben. Bewusst KEIN `margin-left:auto` (das hatte die Legende im
Zwischenstand aus Eintrag (11) isoliert an den rechten Rand der Werkzeugleiste
geschoben, exakt das vom Auftraggeber beanstandete Problem) - die Gruppe fügt
sich stattdessen normal, ohne Sonderbehandlung, in den Zeilenfluss ein und
bricht bei wenig Platz als GESCHLOSSENE Einheit (nicht einzelne Quadrate) in
eine neue Zeile um.

**Live-Verifikation (Testport 9241, danach zurückgesetzt) - echte
Screenshots:** bei ausreichend breitem Fenster erscheint "Urkunden: [6
Quadrate hell→dunkel] max. 12" in derselben Zeile wie "Monat × Tag /
Jahrzehnt × Monat / Zeitraum: ... / Anwenden / Alle", unmittelbar nach
"Alle". `getComputedStyle`/DOM-Auszug bestätigt programmatisch:
`legendeIstKindDerWerkzeugleiste: true`, Kind-Reihenfolge der Werkzeugleiste
exakt `["kal-modus-gruppe", "kal-regler-gruppe", "kal-legende-gruppe"]`,
6 Quadrate mit `rgb(247, 251, 255)` (hellstes) bis `rgb(8, 48, 107)`
(dunkelstes). Schmalbild-Test: bei 1000px UND 950px Fensterbreite (letzteres
nur knapp über der 900px-Mindestbreite) bricht die komplette Legenden-Gruppe
sauber als zweite Zeile unter die übrige Werkzeugleiste um, alle sechs
Quadrate plus "max. 12" bleiben vollständig sichtbar, nichts wird
abgeschnitten. Bei 700×500px (unterhalb der Mindestgröße) verschwindet die
Legende korrekt zusammen mit der gesamten Werkzeugleiste. Keine
Konsolenfehler in allen Testschritten.

**Direkte Dateiverifikation:** `grep -n "kal-legende-zeile"
js/viz/kalenderHeatmap.js` → keine Treffer mehr (vollständig entfernt);
`grep -n "kal-legende-gruppe" js/viz/kalenderHeatmap.js` → Erzeugung in
`baueWerkzeugleiste()` und CSS-Regel bestätigt; `grep -rn
"DIAG\|TEMPORAERER" js/` → keine Treffer.

---

## 2026-09-07 (12) – Kleinauftrag: Kalender-Legende auf ursprüngliches Erscheinungsbild zurücksetzen

**Geänderte Datei:** `js/viz/kalenderHeatmap.js` (einzige Datei - keine
Änderung an anderen Modulen). Korrigiert Punkt 1 aus Eintrag (11) ein zweites
Mal: der dortige Zwischenstand (reiner Beschreibungssatz als `<span>`
rechtsbündig IN der Werkzeugleiste) entsprach nicht dem vom Auftraggeber
beschriebenen Alpha-Vorbild.

**Umsetzung:** `.kal-legende-zeile` ist jetzt ein eigenes Geschwister-Element
von `.kal-werkzeugleiste` (in `render()` direkt danach eingefügt, VOR
`plotBereich`) statt eines Kindelements der Werkzeugleiste selbst - dieselbe
`[hidden]`-vs-Autoren-Regel-Spezifitätsfalle wie bei `.kal-werkzeugleiste`
(siehe Eintrag (8)) wurde hier von Anfang an mit derselben höher-spezifischen
`.kal-legende-zeile[hidden] { display: none; }`-Regel vermieden, statt sie
erst live zu entdecken. Struktur: Label "Urkunden:", dann `LEGENDE_SCHRITTE`
(6) echte `<span class="kal-legende-swatch">`-Quadrate, dann "max. X". Die
Quadrate werden in `aktualisiereLegende(maxAnzahl, farbSkala)` bei jedem
Redraw neu befüllt - `farbSkala` ist jetzt ein zweiter Parameter und dieselbe
Funktion, mit der auch die Heatmap-Zellen selbst eingefärbt werden
(`zeichneTagModus()`/`zeichneJahrzehntModus()`), die Legende zeigt dadurch
garantiert den tatsächlich verwendeten `d3.interpolateBlues`-Verlauf, keine
separat gepflegte Kopie. `instanz.legendeZeile.hidden` wird analog zu
`instanz.werkzeugleiste.hidden` bei zu kleinem Bildschirm mitgeschaltet
(Legende ohne Diagramm ist bedeutungslos).

**Live-Verifikation (Testport 9124, danach zurückgesetzt) - echte
Screenshots:** Screenshot zeigt Zeile "Urkunden: [6 Quadrate hell→dunkel]
max. 12" direkt unterhalb der Werkzeugleiste (Modus-Buttons/Zeitregler),
linksbündig, klar als eigene Zeile erkennbar. `getComputedStyle`-Auszug der
sechs `.kal-legende-swatch`-Elemente bestätigt einen echten Verlauf:
`rgb(247, 251, 255)` (hellstes Quadrat) bis `rgb(8, 48, 107)` (dunkelstes
Quadrat), dazwischen vier sichtbar unterschiedliche Zwischentöne - exakt die
`d3.interpolateBlues`-Endwerte. `.kal-werkzeugleiste.contains(.kal-legende-
zeile)` per JS bestätigt `false` (kein Kindelement der Werkzeugleiste).
Jahrzehnt×Monat-Modus geprüft: Zahl wechselt korrekt auf "max. 18". Bei
700×500px (Mindestgrößen-Platzhalter) verschwindet die Legendenzeile
vollständig mit der Werkzeugleiste, kein Leerraum. Keine Konsolenfehler in
allen Testschritten.

**Direkte Dateiverifikation:** `grep -n "kal-legende-zeile\|kal-legende-
swatch\|LEGENDE_SCHRITTE" js/viz/kalenderHeatmap.js` → CSS-Regeln, Funktion,
Konstante und alle Aufrufstellen bestätigt; `grep -n "kal-legende'"
js/viz/kalenderHeatmap.js` → keine Treffer mehr (alte, rein textuelle
`.kal-legende`-Klasse aus Eintrag (11) vollständig ersetzt, nur noch ein
historischer Verweis im Dateikopf-Kommentar); `grep -rn "DIAG\|TEMPORAERER"
js/` → keine Treffer.

---

## 2026-09-07 (11) – Kalender-Legende zurück, Sidebar-Navigation isolieren, Expand-Umrandung

**Geänderte Dateien:** `js/viz/kalenderHeatmap.js`, `js/viz/regestenKachelraster.js`,
`js/utils/filterleiste.js`. Kein Zwischenauftrag ("Diagnoseauftrag: Wechsel zur
Kalender-Heatmap schlägt still fehl") hatte sich als real reproduzierbar
erwiesen (siehe dortiger CHANGELOG-Eintrag) - dieser Auftrag knüpft direkt an
Eintrag (10) an. `js/utils/sidebar.js`/`js/utils/infoButton.js` blieben
unangetastet: die Sidebar-Navigationslogik lebt bereits vollständig in
`regestenKachelraster.js`/`kalenderHeatmap.js` (sidebar.js kennt nur den
generischen `onEintragKlick`-Callback), die Legende war nie in infoButton.js
selbst kodiert (nur der von kalenderHeatmap.js übergebene Text).

**Punkt 1 (Legende zurück auf die Seite):** `.kal-legende` wieder als eigenes
`<span>`, einmalig in `baueWerkzeugleiste()` erzeugt (neben Modus-Umschaltung/
Zeitraum-Regler, `margin-left:auto` schiebt sie in der flex-wrap-Zeile nach
rechts) statt als dritter Absatz im Info-Popover. `aktualisiereInfoButton()`
(destroy-und-Neubau bei jedem Redraw) ist entfallen und durch
`aktualisiereLegende(maxAnzahl)` ersetzt - reiner `textContent`-Update auf dem
bestehenden Element, kein destroy() nötig, da dieses `<span>` keine eigenen
Event-Listener trägt. `KALENDER_INFO_TEXT` war nie verändert worden (der
Legenden-Satz wurde nur zur Laufzeit angehängt), daher hier keine Textänderung
nötig - der Info-Button selbst ist dadurch wieder vollständig statisch und
wird nur noch einmal in `render()` erzeugt (der Bugfix aus Eintrag (9)/(10),
unconditional Erzeugung + Null-Check in `destroy()`, bleibt unverändert
bestehen). Exakte Vorab-Prüfung des ursprünglichen Standorts war mangels
Git-Historie nicht möglich (Projekt ist kein Git-Repository) - Platzierung in
der Werkzeugleiste ist eine begründete, dem Auftraggeber zur Prüfung
vorgelegte Entscheidung, keine rekonstruierte Originalposition.

**Punkt 2 ("Unsicherheiten anzeigen" toggelt die bestehende Tabelle):**
`resize({showUncertainty})` löst keine Sidebar mehr aus - `options.
showUncertainty` ist jetzt direkt die Sichtbarkeits-Bedingung für den Aufruf
von `zeichneUnbekanntBereich()` (aus `urkundenZeit.js`, UNVERÄNDERT, siehe
Nicht-Ziel) in `zeichneTagModus()`/`zeichneJahrzehntModus()`: `zeigeUnsicherheit
? zeichneUnbekanntBereich(...) : 0` statt eines unconditional Aufrufs -
Standardzustand versteckt (kein Leerraum, `bereichsHoehe` wird 0 statt einer
leeren Fläche). `oeffneNichtDarstellbarListe()` (vormals von `resize()`
aufgerufen) sowie `instanz.nichtDarstellbarAktuell` (nur für diese Funktion
gehalten) vollständig entfernt - toter Code, da nichts anderes sie nutzte.
`resize()` selbst dadurch wieder trivial (nur `options` mergen +
`zeichnePlot()`), berührt die Sidebar bewusst gar nicht mehr (weder öffnend
noch schließend) - eine vom Zellklick (Punkt 5b) noch offene Sidebar bleibt
unangetastet, exakt wie im Auftrag gefordert ("Sidebar bleibt dabei
unbeteiligt").

**Punkt 3 (Sidebar-Klick isoliert die Ziel-Urkunde über den Suchschlitz):**
`js/utils/filterleiste.js` um `setzeSuchbegriff(wert)` ergänzt (einzige
Änderung an dieser Datei, nicht in der ursprünglichen Betroffene-Dateien-Liste
genannt, aber zur Erfüllung von Punkt 3 zwingend nötig - ohne sie hätte der
Suchschlitz nicht programmatisch befüllt werden können) - setzt
`sucheInput.value` und ruft `meldeAenderung()` sofort auf (kein Debounce, da
kein Tastendruck-Ereignis). `regestenKachelraster.js`' `render()`: die vormalige
Positions-/Seitenberechnung (`data.findIndex()` gegen den UNGEFILTERTEN
Datensatz, `startSeite`) ist komplett entfallen - bei vorhandener
`zielSignatur` wird stattdessen `filterleiste.setzeSuchbegriff(zielSignatur)`
aufgerufen, was über den bestehenden `onChange()`-Pfad automatisch
`filterZustand`/Seite 1/`zeichneKachelraster()` auslöst; die bestehende
Suchlogik (`ermittleGefilterteRecords()`, unverändert) filtert dadurch von
selbst auf die passende(n) Urkunde(n). Der abschließende `karte.click()` in
`zeichneKachelraster()` (unverändert, findet die Zielkachel jetzt in den
gefilterten `seiteRecords`) klappt sie weiterhin auf und scrollt sie in den
sichtbaren Bereich.

**Punkt 4 (Umrandung für aufgeklappte Kachel):** `.regk-karte[aria-expanded=
"true"] { border: 3px solid var(--accent); }` in `regestenKachelraster.js`'
`fuegeStyleEin()` - `var(--accent)` = `#2c4a6e` = `rgb(44, 74, 110)`, exakt der
im Auftrag geforderte Wert (siehe `base.css`). Kein zusätzlicher Selektor/
State nötig, da normaler Klick UND Sidebar-Navigation (Punkt 3) beide
denselben `aria-expanded`-Zustand über `schalteAufklappzustandUm()` setzen.
`box-sizing:border-box` (app-weit in `base.css`) verhindert jede
Layout-Verschiebung im Grid.

**Live-Verifikation (Testport 9013, danach zurückgesetzt) - echte
Screenshots:**
- Punkt 1: Screenshot der Kalender-Heatmap-Werkzeugleiste zeigt den Satz
  "Urkunden: hell bis dunkel Blau, entsprechend der Anzahl je Feld (aktuell
  maximal 12)." als sichtbares Element rechts neben dem Zeitregler; Klick auf
  den Info-Button zeigt per Screenshot einen Popover, der NACH dem zweiten
  Absatz ("... öffnet die Liste der Urkunden dieses Datums.") endet, kein
  Legenden-Satz mehr enthalten.
- Punkt 2: Screenshot vor Klick auf "Unsicherheiten anzeigen" zeigt keine
  "Nicht darstellbar"-Fläche; nach Klick (Button-Label wechselt zu
  "Unsicherheiten ausblenden") erscheint "Nicht im Kalender darstellbar (kein
  exaktes Tagesdatum) (53)" mit den 53 farbigen Kacheln darunter, keine
  Sidebar sichtbar; erneuter Klick blendet sie wieder vollständig aus. Im
  Jahrzehnt×Monat-Modus identisch geprüft ("Nicht darstellbar (kein Monat
  und/oder Jahr auswertbar) (53)").
- Punkt 3: Klick auf Kalenderzelle "25. Mai" öffnet Sidebar (12 Urkunden),
  Klick auf Eintrag "StaAKr-0049" navigiert zum Kachelraster - Screenshot
  zeigt Suchschlitz mit Inhalt "StaAKr-0049", Status "Seite 1 / 1 (1 von 1
  gefilterten Treffern)", nur diese eine (aufgeklappte) Kachel sichtbar.
  `getComputedStyle`-Auszug bestätigt zusätzlich programmatisch:
  `ariaExpanded:"true"`, `suchwert:"StaAKr-0049"`, `trefferzahl:1`.
- Punkt 4: derselbe `getComputedStyle`-Auszug bestätigt `borderWidth:"3px"`,
  `borderColor:"rgb(44, 74, 110)"` auf der isolierten Kachel. Zusätzlich per
  normalem Klick (ohne Sidebar) getestet: Screenshot zeigt eine einzelne
  aufgeklappte Kachel mit sichtbar dickerem blauem Rahmen inmitten dreier
  unveränderter, dünn umrandeter Kacheln; erneuter Klick entfernt den Rahmen
  wieder vollständig (Screenshot vor/nach).

**Direkte Dateiverifikation:** `grep -n "aktualisiereLegende\|legendeElement\|
kal-legende" js/viz/kalenderHeatmap.js` → Funktion, Instanz-Feld, CSS-Regel
und beide Aufrufstellen (Zeilen 573/674) bestätigt; `grep -n
"oeffneNichtDarstellbarListe" js/viz/kalenderHeatmap.js` → keine Treffer mehr
(vollständig entfernt); `grep -n "setzeSuchbegriff"
js/utils/filterleiste.js js/viz/regestenKachelraster.js` → Definition und
Aufruf bestätigt; `grep -n "regk-karte\[aria-expanded"
js/viz/regestenKachelraster.js` → CSS-Regel bestätigt; `grep -rn
"DIAG\|TEMPORAERER" js/` → keine Treffer (keine Test-/Diagnose-Reste).

---

## 2026-09-07 (10) – Bugfix: Info-Button-Absturz in Kalender-Heatmap + robusteres Routing

**Geänderte Dateien:** `js/viz/kalenderHeatmap.js` (Teil A), `js/core/ansichtWechseln.js`
(Teil B). Root Cause bereits im vorigen Diagnoseauftrag mit Codezeile und
`console.log`-Beleg identifiziert (siehe dortiger CHANGELOG-Eintrag) - dieser
Eintrag dokumentiert die tatsächliche Behebung.

**Teil A (kalenderHeatmap.js):** der Info-Button wird jetzt UNCONDITIONAL in
`render()` erzeugt (mit dem Basistext, ohne die dynamische Maximalzahl aus
Punkt 3 der vorigen Etappe, die erst nach dem ersten erfolgreichen Zeichnen
bekannt ist) - `instanz.infoButton` ist dadurch nie mehr `null`, unabhängig
vom Bildschirmzustand beim ersten Aufruf. `aktualisiereInfoButton()` ersetzt
ihn weiterhin bei jedem tatsächlichen Redraw (sobald der Bildschirm groß
genug ist) durch die Version mit aktueller Maximalzahl. Zusätzlich zwei
defensive `if (instanz.infoButton)`-Null-Checks vor jedem
`.destroy()`-Aufruf (in `aktualisiereInfoButton()` und im Modul-`destroy()`)
als zweite Absicherung.

**Teil B (ansichtWechseln.js):** `wechsleZu()` wurde mit einem äußeren
try/finally abgesichert - `wirdGewechselt` wird jetzt IMMER zurückgesetzt,
auch wenn `destroy()` oder `ladeModulUndRender()` eines Moduls eine
Exception wirft. Ein zusätzliches inneres try/finally um den
`aktuellesModul.destroy()`-Aufruf sorgt dafür, dass `aktuellesModul` auch
bei einem werfenden `destroy()` auf `null` gesetzt wird UND dass
anschließend trotzdem versucht wird, das NEUE Ziel zu laden/rendern - ein
kaputtes altes Modul blockiert damit nicht zusätzlich auch noch den Wechsel
zu einem funktionierenden neuen Ziel. Die Exception selbst wird bewusst
NICHT geschluckt (kein `catch`, nur `finally`) - sie bleibt weiterhin als
Konsolenfehler sichtbar, nur der App-Zustand bleibt zusätzlich
funktionsfähig.

**Live-Verifikation (Testport 8953, danach zurückgesetzt) - echte
Reproduktion mit Vorher/Nachher-Beleg:**
- **Ursprüngliches Symptom, exakter Trigger reproduziert:** Viewport auf
  700×500px (unterhalb der 900×500-Schwelle) gesetzt, dann Regesten →
  Zeitachse → Kalender-Heatmap → zurück zu Regesten - im vorigen
  Diagnoseauftrag hatte genau diese Abfolge
  `TypeError: Cannot read properties of null (reading 'destroy')` geworfen
  und das Dropdown dauerhaft blockiert. Jetzt: keine Konsolenfehler, Wechsel
  zurück zu Regesten-Kachelraster zeigt korrekt dessen Inhalt (Screenshot),
  Dropdown bleibt bedienbar.
- **Info-Button bei zu kleinem Bildschirm sichtbar:** Screenshot des
  Mindestgrößen-Platzhalters bei 700×500 zeigt den blauen Info-Button
  weiterhin oben rechts (`document.querySelectorAll('.info-button-wrapper').length`
  → 1) - vorher wäre `instanz.infoButton` hier `null` gewesen.
  Anschließend auf 1400×950 vergrößert: Info-Button-Text wurde korrekt durch
  die Version mit aktueller Maximalzahl ersetzt ("...aktuell maximal 12."),
  weiterhin nur 1 `.info-button-wrapper` (kein Leck durch den
  Fallback-dann-Ersetzen-Übergang).
- **Mehrfache Reproduktion:** komplette Regesten→Zeitachse→Kalender-Zyklen
  zweimal hintereinander bei 700×500 automatisiert durchlaufen
  (`select.value` + dispatchtes `change`-Event) - am Ende korrekt auf
  Regesten-Kachelraster gelandet, vollständig gerendert (Seite 1/22, 50 von
  1069 Treffern), keine Konsolenfehler über den gesamten Durchlauf.
- **Simulierter Modul-Fehler (Teil B, Akzeptanzkriterium 2):** temporär ein
  `throw new Error(...)` in `dotPlot.js`' `destroy()` eingebaut, getestet,
  wieder vollständig entfernt (grep bestätigt: keine Reste). Wechsel weg von
  Dot Plot warf den Fehler wie erwartet sichtbar in der Konsole (nicht
  geschluckt) und die alte Dot-Plot-Ansicht blieb (erwartungsgemäß - ein
  kaputtes `destroy()` kann sich nicht selbst korrekt aufräumen) sichtbar,
  ABER der unmittelbar folgende Wechsel zu Kalender-Heatmap gelang trotzdem
  vollständig und fehlerfrei (Screenshot: voll funktionsfähige Heatmap) -
  belegt, dass ein einzelner Modul-Fehler das Dropdown nicht mehr dauerhaft
  blockiert.

**Direkte Dateiverifikation:** `grep -n "erzeugeInfoButton\|infoButton: null\|
infoButton,\|if (instanz.infoButton)" js/viz/kalenderHeatmap.js` →
`erzeugeInfoButton()`-Aufruf jetzt in `render()` (Zeile 798) statt nur in
`aktualisiereInfoButton()`, kein `infoButton: null` mehr in der
`instanz`-Initialisierung, zwei Null-Check-Guards (Zeilen 335/874) bestätigt.
`grep -n "try {\|finally {\|wirdGewechselt" js/core/ansichtWechseln.js` →
äußeres und inneres try/finally um `wechsleZu()`s Kernlogik bestätigt.
`grep -rn "TEMPORAERER\|DIAG"` über `js/` → keine Reste der temporären
Test-Instrumentierung/des simulierten Fehlers.

---

## 2026-09-07 (9) – Kalender-Heatmap-Korrekturen, Sidebar-Umbau, Kategorie-Umbenennung

**Geänderte Dateien:** `js/viz/kalenderHeatmap.js`, `js/utils/sidebar.js`,
`js/core/state.js`, `js/viz/regestenKachelraster.js`, `js/config/constants.js`,
`js/viz/zeitachse.js` (nur Kommentar), `data/urkunden.csv`,
`data/bestandsverzeichnis.csv`.

**Punkt 5 (Kategorie-Umbenennung) - Vorab-Diskrepanz geklärt (per
Rückfrage):** `urkunden.csv` bestätigt exakt 100 Zeilen (`kategorien`-Feld,
pipe-separierte Tokens exakt geprüft). `bestandsverzeichnis.csv` ergab per
korrektem CSV-Parsing (Python `csv`-Modul, respektiert Anführungszeichen mit
eingebetteten Semikolons, z. B. `"16 Bände ; 2 Kartons ; 0,2 lfm."`) exakt
**29**, nicht 31 wie vorab ermittelt. Root Cause der Diskrepanz konkret
identifiziert und dem Auftraggeber vorgelegt: die aktuelle Datei enthält
„Nachlass Josef Maria Eder" als EINEN Datensatz (`7.2.EderJM.`), während die
Vorab-Zählung von zwei getrennten Unterdatensätzen (`7.2.EderJM.1.`/`.2.`)
ausging; „Nachlass Josef Utz" ist aktuell in zwei Datensätze
(`7.3.4.1.`/`7.3.4.2.`) aufgeteilt und trägt dort `bkk_kategorie` =
„Stadt und Raum", nicht „Bevölkerung und Bevölkerungsgruppen" wie in der
Vorab-Zählung angenommen - 29 + 2 = 31, exakt reconciled. Auf Anweisung: die
29 tatsächlich im aktuellen Stand betroffenen Zeilen umbenannt, Utz
unangetastet gelassen (andere Kategorie, keine reine Umbenennung).
**Umsetzung:** beide CSVs per Python (`csv`-Modul, UTF-8-BOM/CRLF/Quoting
erhalten) exakt in den betroffenen Feldern umbenannt - 100 Zeilen in
`urkunden.csv`s `kategorien` (Pipe-Trennzeichen/andere Werte in derselben
Zeile unangetastet), 29 Zeilen in `bestandsverzeichnis.csv`s `bkk_kategorie`.
Code-Referenzen gefunden (nur zwei, beide reine Dokumentationskommentare -
`kategorieFarben.js`/`filterleiste.js` referenzieren Kategorienamen bereits
nie hartkodiert, sondern datengetrieben): `constants.js`' `CAT_COLORS`-Key
(Farbwert `#952323` unverändert) und ein Kontrast-Dokumentationskommentar in
`zeitachse.js`, beide umbenannt. Grep-Nachweis: 0 Treffer für den alten Namen
in `js/`/`data/` nach der Umsetzung.

**Punkt 1 (Bugfix, Toggle-Anfangszustand):** `aria-pressed` wurde beim
Erstaufbau korrekt gesetzt, die zugehörige visuelle Klasse
(`.kal-modus-aktiv`) aber nur bei einem tatsächlichen Klick über
`aktualisiereModusButtons()` - der Startzustand blieb unmarkiert. Fix: selber
Aufruf zusätzlich am Ende des Button-Aufbaus in `baueWerkzeugleiste()`. Live
bestätigt: Button ist direkt nach dem Laden blau markiert, ohne jede
Interaktion.

**Punkt 2 ("Unsicherheiten anzeigen" öffnet die nicht darstellbaren
Urkunden):** `resize({showUncertainty})` (vom globalen, app.js-weiten Button
aufgerufen) öffnet/schließt jetzt die Sidebar-Liste - nur bei einem
tatsächlichen Wertwechsel (`'showUncertainty' in neueOptionen`-Prüfung,
unterscheidet echten Toggle-Klick von einem reinen Fenster-Resize-Aufruf
ohne Argumente). Liste zeigt exakt dieselbe Menge, die als Zahl im
„Nicht darstellbar"-Bereich bereits ausgewiesen ist
(`instanz.nichtDarstellbarAktuell`, bei jedem Redraw aktuell gehalten) - live
bestätigt: 53 Einträge in der Liste, exakt konsistent mit der „(53)"-Anzeige
unter dem Raster.

**Punkt 3 (Legende ins Info-Popover):** `.kal-legende` als sichtbares
Seitenelement vollständig entfernt. Der Info-Button wird jetzt bei jedem
Redraw destruiert und mit einem dritten, die aktuelle Maximalzahl
enthaltenden Absatz neu erzeugt (`aktualisiereInfoButton()`) - dasselbe,
bereits produktiv bewährte Destroy-vor-Neubau-Muster wie ganttDiagramm.js'
Werkzeugleiste (siehe CHANGELOG-Eintrag „Info-Button für die 5
Bestandsvisualisierungen"), `infoButton.js` selbst unverändert (kein
update()/setText(), Nicht-Ziel). Live bestätigt: Popover-Text endet mit
„Urkunden: hell bis dunkel Blau, entsprechend der Anzahl je Feld (aktuell
maximal 12)." - Zahl ändert sich korrekt mit Modus/Zeitraum-Filter (bei
1400-1849 im Jahrzehnt-Modus lief die Legende auf einen anderen Wert um).

**Punkt 4 (schlanke Sidebar-Liste + Klick-Navigation zum Kachelraster) -
größte Einzeländerung:**
- Neue geteilte Komponente `js/utils/sidebar.js`' `baueUrkundenListeInhalt(records,
  {onEintragKlick})` - bewusst als ZWEITER, klar von `baueSidebarInhalt()`
  (Einzel-Datensatz, volle Detailtiefe, weiterhin unverändert von
  zeitachse.js genutzt) getrennter Darstellungsmodus, keine Vermischung.
  Zeigt pro Eintrag nur Signatur + Kategorie-Badges, kein Regest-Text.
- Klick/Enter/Leertaste auf einen Eintrag ruft `onEintragKlick(record)` -
  sidebar.js selbst bleibt dabei bewusst Router-/State-unabhängig (Aufrufer
  entscheidet, was der Klick auslöst), konsistent mit dem bereits
  etablierten Prinzip der Datei ("keine Annahme über die Interaktionslogik
  des aufrufenden Moduls").
- `kalenderHeatmap.js`' `navigiereZuKachel(record)` setzt `state.js`' neuen,
  einmaligen Übergabekanal `zielSignatur` (`setZielSignatur()`/
  `clearZielSignatur()`, bewusst getrennt von `filter.entity` - eine
  einmalige Navigationsabsicht, kein dauerhafter Kontext-Filter) und
  navigiert per `router.js`' bereits vorhandenem `navigiereZu()` zum
  Regesten-Kachelraster; `handleRouteChange()` in app.js erkennt den
  Ansichtswechsel innerhalb desselben Tabs/Archivalientyps automatisch und
  ruft den bereits etablierten „leichtgewichtigen Ansichtswechsel"
  (`ansichtWechseln.wechsleZu()`) auf - keine Änderung an app.js/router.js
  nötig.
- `regestenKachelraster.js`' `render()` liest `zielSignatur` EINMAL, löscht
  sie sofort wieder (verhindert, dass ein späterer regulärer Aufruf
  fälschlich erneut aufklappt), berechnet die Zielseite direkt gegen das
  ungefilterte `data`-Array (`render()` setzt Filter/Unsicherheiten-Modus
  ohnehin auf den Ausgangszustand zurück, siehe `ansichtWechseln.js`'
  `setUnsicherheitModus(false)` vor jedem Wechsel) und öffnet dort mit
  `zeichneKachelraster()`. Die passende Kachel wird über einen echten
  `karte.click()` aufgeklappt (nutzt den bereits vorhandenen
  Klick-Handler, keine doppelte Aufklapp-Logik) und per `scrollIntoView()`
  in den sichtbaren Bereich gescrollt.
- **Live-Verifikation, zwei unabhängige Testfälle:** (1) Klick auf einen
  Eintrag der Kalenderzell-Liste ("StaAKr-0001a") → korrekt auf Seite 1
  gelandet, `aria-expanded="true"` UND fokussiert exakt auf dieser Kachel.
  (2) Klick auf einen Eintrag mit deutlich höherer CSV-Position
  ("StaAKr-0849") → korrekt auf „Seite 21 / 22" gelandet (NICHT Seite 1) -
  belegt, dass die Seitenberechnung echt funktioniert, nicht nur zufällig
  bei Seite 1 passt. Beide Male per `getComputedStyle`-unabhängiger
  JS-Prüfung (`aria-expanded`, `document.activeElement`) bestätigt, nicht
  nur per Screenshot.
- **Regressionscheck (Nicht-Ziel):** zeitachse.js' Einzelurkunden-Detailklick
  weiterhin unverändert - Screenshot zeigt vollen Regest-Text, Orte,
  Personen, Kategorie-Badge exakt wie vor diesem Auftrag (andere
  Funktion/Datei, von der Umstellung nicht berührt).

**Live-Verifikation aller vier Punkte (Testport 8929, danach zurückgesetzt) -
echte Screenshots, keine reine Text-/DOM-Bestätigung:** siehe oben je Punkt;
zusätzlich Modus-Wechsel (Jahrzehnt × Monat) und Zeitraum-Regler
(Anwenden → 1400-1849, Zähler korrekt auf 47 aktualisiert) nach allen
Änderungen erneut regressionsgeprüft, keine Konsolenfehler im gesamten
Testdurchlauf.

**Direkte Dateiverifikation:** `grep -rn "Bevölkerung und Bevölkerungsgruppen"
js/ data/` → keine Treffer. `grep -n "aktualisiereModusButtons"
js/viz/kalenderHeatmap.js` → Aufruf in `baueWerkzeugleiste()` (Zeile 377)
zusätzlich zum bestehenden Klick-Handler-Aufruf. `grep -n
"oeffneNichtDarstellbarListe\|nichtDarstellbarAktuell"` → Definition,
Aufruf in `resize()`, Befüllung in beiden Zeichenfunktionen. `grep -n
"kal-legende\|aktualisiereInfoButton"` → keine `kal-legende`-Treffer mehr
(CSS entfernt), `aktualisiereInfoButton()` an beiden vorherigen
`aktualisiereLegende()`-Aufrufstellen. `grep -n
"baueUrkundenListeInhalt\|navigiereZuKachel\|setZielSignatur"` über alle vier
betroffenen Dateien → Definition in `sidebar.js`, Nutzung/Navigation in
`kalenderHeatmap.js`, Konsum in `regestenKachelraster.js`, State-Funktion in
`state.js` - alle bestätigt.

---

## 2026-09-07 (8) – Kalender-Heatmap: Farbdiagnose, Zeitraum-Regler, Achsen, Info-Button

**Geänderte Datei:** `js/viz/kalenderHeatmap.js` (vollständig überarbeitet - fünf
Punkte, siehe unten; keine Änderung an anderen Modulen).

**Vorab-Diskrepanzen (vor der Umsetzung geklärt, siehe AskUserQuestion-Rückfrage):**
der Auftrag beschrieb zwei als "Ist-Zustand" angenommene Bestandteile, die im
tatsächlichen Code nicht existierten: (1) eine Umschaltung "Monat × Tag" /
"Jahrzehnt × Monat" - es gab nur eine einzige Monat×Tag-Ansicht; (2) eine
Zeitraum-Eingrenzung ("zwei Zahlenfelder + Anwenden") - es gab überhaupt keine
Zeitraum-Filterung. Zusätzlich hatten Zellen nur einen Hover-Tooltip, kein
Klick-Verhalten, obwohl der vorgegebene Info-Button-Text "Klick auf ein Feld
öffnet die Liste der Urkunden" voraussetzt. Auf Rückfrage vom Auftraggeber
ausdrücklich freigegeben, alle drei als NEUE Funktionalität zu bauen (nicht nur
den Text anzupassen) - Umfang dieses Eintrags entsprechend größer als der
ursprüngliche Auftragstext allein nahelegt.

**Punkt 1 (Root-Cause-Diagnose "durchgehend graue Felder"):** live gegen die
echten Daten geprüft, BEVOR etwas geändert wurde (Testport 8892). Befund:
`d3.max()`-Aggregation und die vorherige `d3.scaleLinear()`-Opazitätsskala
funktionierten bereits korrekt - `getComputedStyle`/Attribut-Auslesung zeigte
`fill-opacity` real variierend zwischen 0,04 und 1,0 über 342 von 372 Zellen,
`uniqueFillColors` aber IMMER nur `["#888888"]` (ein einziger Wert über alle
372 Zellen). Root Cause: jede Zelle erhielt unconditional
`.attr('fill', CAT_COLORS.default)` - ein bewusst so entworfener, aber nie als
Blau-Skala gedachter Fallback-Grauwert (`#888888`), NICHT durch eine fehlende
Key-Zuordnung ausgelöst (anders als beim ähnlich gelagerten CAT_COLORS-Vorfall
bei ganttDiagramm.js). Da nur die Opazität EINER Grundfarbe variierte, blieb
das Ergebnis immer "irgendein Grauton", nie "hell bis dunkel Blau". Fix:
`d3.scaleSequential(d3.interpolateBlues).domain([0, maxAnzahl])` ersetzt
CAT_COLORS.default+Opazität vollständig für die Zellenfläche; CAT_COLORS bleibt
für die Kategorie-Badges der neuen Urkunden-Liste (Punkt 5b) und den
"Nicht darstellbar"-Bereich in Verwendung (unverändert). Live nach dem Fix
bestätigt (Testport 8905/8917): 12 tatsächlich unterschiedliche echte
Blau-RGB-Werte (`rgb(247,251,255)` hell bis `rgb(34,113,180)` dunkel) statt
eines einzigen Grauwerts.

**Punkt 2 (Zeitraum-Regler):** komplett neu (siehe Diskrepanz-Abschnitt oben) -
zwei überlappende native `<input type="range" step="10">` (Dual-Handle-Muster
ohne externe Bibliothek: Track `pointer-events:none`, nur
`::-webkit-slider-thumb`/`::-moz-range-thumb` klickbar), Spanne aus
`ermittleDatenJahresSpanneGerundet()` (frühestes/spätestes `jahr` aller
Records, per `Math.floor(.../10)*10` abgerundet). Griffe können sich nicht
überkreuzen (Clamp bei `input`-Event). Filter wird NICHT live beim Ziehen
angewendet, nur die Textanzeige (`1400–1509`) aktualisiert sich - erst
"Anwenden" schreibt `instanz.aktiverZeitraum` und löst `zeichnePlot()` aus,
"Alle" setzt Regler UND Zustand auf die volle Spanne zurück. Live getestet:
Regler auf 1400/1500 gesetzt → "Anwenden" → Raster/„Nicht darstellbar"-Zähler
korrekt auf den engeren Zeitraum reduziert (53 → 21 Einträge); "Alle" →
korrekt zurückgesetzt.

**Punkt 3 (Achsentitel):** "Tag" (X) / "Monat" (Y) im Monat×Tag-Modus,
"Jahrzehnt" (X) / "Monat" (Y) im Jahrzehnt×Monat-Modus (Auftrag Punkt 3, "falls
… andere Achsdimensionen hat" - hat sie, siehe Punkt 5b). Zusätzlich: X-Achse
hatte zuvor GAR KEINE Tick-Beschriftung (nur die Y-Achsen-Monatsnamen
existierten) - Tag-/Jahrzehnt-Zahlen sind jetzt neu ergänzt, mit adaptiver
Schrittweite (`ermittleLabelSchritt()`, analog zu zeitachse.js'
`ermittleTickAnzahl()`) gegen Überlappung bei vielen Jahrzehnt-Spalten.

**Punkt 4 (Beschriftungsgröße & Vollbild):** Tick-Schrift 10px → 14px (Faktor
1,4x, `TICK_SCHRIFTGROESSE`, identische Konvention zu zeitachse.js). Zellengröße
wird jetzt aus `ermittleVerfuegbareBreite()`/`ermittleVerfuegbareHoehe()`
(viewportGroesse.js) responsiv berechnet statt fest 18px, geclampt auf
8-26px. `istBildschirmZuKlein()`/`baueBildschirmHinweis()`
(bildschirmHinweis.js) integriert - unterhalb 900×500px ersetzt der einheitliche
Hinweistext die Visualisierung, dieselbe Kategorisierung wie zeitachse.js
("Canvas/SVG-Diagramm mit fester Interaktionslogik", nicht die
reflow-fähige Kachelraster-Kategorie, siehe Auftrag Punkt 4).
**Bug gefunden und behoben (im eigenen Live-Test, vor Auslieferung):** die
Werkzeugleiste blieb auch bei zu kleinem Bildschirm sichtbar, obwohl
`zeichnePlot()` `werkzeugleiste.hidden = true` setzte - Ursache: die eigene
`.kal-werkzeugleiste { display:flex; ... }`-Regel hat dieselbe Spezifität
(0,1,0) wie das UA-Stylesheet-`[hidden] { display:none }` (Attribut-Selektor);
bei Gleichstand gewinnt die später im Cascade stehende Autoren-Regel, hier
also immer "flex". Behoben durch eine explizit höher-spezifische Regel
`.kal-werkzeugleiste[hidden] { display: none; }` (0,2,0) - live erneut
getestet (700×450px), jetzt korrekt vollständig durch den Hinweistext
ersetzt, Info-Button bleibt (wie bei zeitachse.js) sichtbar, da er ein
eigener, von der Werkzeugleiste unabhängiger Streifen ist.

**Punkt 5 (Info-Button):** Text wörtlich wie im Auftrag übernommen (beide
zuvor unklaren Sätze - Modus-Umschaltung, Klick-öffnet-Liste - sind jetzt
echte Funktionalität, siehe Diskrepanz-Abschnitt oben, der Text musste dafür
NICHT angepasst werden). Eigener, dauerhafter Streifen oben rechts
(`.kal-info-button-zeile`, echter Streifen im Dokumentfluss statt eines
absoluten Ankers) - dasselbe, gerade erst im vorigen Eintrag
("Icicle Info-Button-Position korrigiert") bewährte Muster, hier von Anfang an
korrekt angewendet (kein Nachbesserungsbedarf).

**Punkt 5b (Modus-Umschaltung + Klick-öffnet-Liste, als neue Funktionalität
freigegeben):** "Jahrzehnt × Monat" gruppiert Records mit Monat-ODER-Tag-
Präzision (`leiteDatumsPraezisionAb()` 'exact' oder 'month') nach
`Math.floor(jahr/10)*10`, breiter gefasst als der Tag-Modus (der nur 'exact'
zulässt) - fachlich sinnvoll, da eine Dekaden-Auflösung keine Tagesgenauigkeit
braucht. Klick auf eine besetzte Zelle öffnet eine Sidebar mit Urkundenliste
(Kategorie-Badge, Signatur, Jahr, Regest, Unsicher-Hinweis) - Sidebar-Gerüst/
Fokus-Mechanik/CSS UNVERÄNDERT aus `js/utils/sidebar.js` wiederverwendet
(`baueSidebarGeruest`/`schliesseSidebar`/`fuegeSidebarStyleEin`), Inhalt lokal
gebaut (identisches Muster zu zeitachse.js' `baueUrkundenSidebarInhalt()` -
sidebar.js' `baueSidebarInhalt()` ist Bestand-Schema-spezifisch, siehe
dortiger Dateikopf-Kommentar). Maus- UND Tastatur-Bedienung (Enter/Space)
verdrahtet und live getestet.

**Live-Verifikation (Testports 8892/8905/8917, danach zurückgesetzt) - echte
Screenshots, keine reine DOM-/Text-Prüfung:**
- Farbskala: Screenshot zeigt klar erkennbare helle-bis-dunkle Blautöne;
  `uniqueFillColors`-Auszug bestätigt 12 echte, unterschiedliche Blau-RGB-Werte.
- Zeitraum-Regler: Screenshot vor/nach "Anwenden" zeigt sichtbar engeres
  Datengitter (Jahrzehnt-Spalten 1400-1500 statt 1100-1849), "Nicht
  darstellbar"-Zähler korrekt von 53 auf 21 gesunken; "Alle" setzt sichtbar
  zurück.
- Achsentitel/Beschriftung: Screenshot zeigt "Tag"/"Monat" (Monat×Tag) bzw.
  "Jahrzehnt"/"Monat" (Jahrzehnt×Monat), sichtbar größere Zahlen/Monatsnamen.
- Vollbild/Mindestgröße: Screenshot bei 1400×950 zeigt füllende Darstellung;
  Screenshot bei 700×450 zeigt (nach dem oben beschriebenen CSS-Fix) den
  vollständigen Ersatz durch den Mindestgrößen-Hinweis.
- Info-Button: Screenshot zeigt blauen Kreis oben rechts in allen Zuständen
  (beide Modi, gefiltert/ungefiltert, zu-klein-Zustand); Popover-Text per
  `.innerText` zeichengleich mit dem Auftragstext abgeglichen.
- Klick-auf-Zelle: Screenshot zeigt geöffnete Sidebar mit Urkundenliste
  ("25. Mai", 12 Urkunden, Kategorie-Badges); Tastaturbedienung (Enter auf
  fokussierter Zelle) separat bestätigt.
- Regressionscheck "Unsicherheiten anzeigen": Button-Label wechselt korrekt
  zu "Unsicherheiten ausblenden", Redraw ohne Konsolenfehler,
  `.info-button-wrapper`-Anzahl bleibt bei 1 (kein Listener-Leck über
  mehrere Redraws/Modus-Wechsel/Zeitraum-Änderungen hinweg).

**Direkte Dateiverifikation:** `grep -n "erzeugeInfoButton\|infoButton.destroy\|
scaleSequential\|interpolateBlues\|kal-slider-von\|kal-slider-bis\|
CAT_COLORS.default\|kal-werkzeugleiste\[hidden\]" js/viz/kalenderHeatmap.js` →
Info-Button-Import/Erzeugung/destroy() (Zeilen 82/774/827), `d3.scaleSequential
(d3.interpolateBlues)` für beide Modi (Zeilen 545/634), `CAT_COLORS.default`
nur noch für Badges/"Nicht darstellbar" (Zeilen 237/609/703, NICHT mehr für
die Zellenfläche selbst), Dual-Slider-Klassen (Zeilen 386/395), CSS-Bugfix
(Zeile 470) - alle bestätigt in der tatsächlich ausgelieferten Datei.

---

## 2026-09-07 (7) – Bugfix: Icicle Info-Button-Position korrigiert

**Geänderte Datei:** `js/viz/icicle.js` (nur `render()`/CSS betroffen, keine
Änderung an Hierarchie-Logik, Klick-/Zoom-Verhalten oder
`MINDESTGROESSE`-Skalierung).

**Root Cause:** der zuvor absolut positionierte Anker
(`.icicle-info-button-anker { position:absolute; top:0; right:0; }`, Muster
von `sunburst.js` übernommen) lag über echten Datenelementen. Bei Sunburst
funktioniert genau diese Positionierung beschwerdefrei, weil dort ein KREIS
in eine quadratische Fläche einbeschrieben wird - die obere rechte Ecke
bleibt dadurch geometrisch von selbst leer. Icicles erste Zeile
(Kategorie-Kacheln) ist dagegen ein Rechteck, das die GESAMTE Breite bis zum
rechten Rand ausfüllt - der Anker lag deshalb direkt auf der ersten Kachel
("Gesundheit"). Das Sunburst-Muster war für Icicle nicht übertragbar, da
beide Diagrammtypen strukturell unterschiedlich sind (Kreis vs. volle
Rechteck-Zeile).

**Fix:** absoluter Overlay-Anker entfernt, ersetzt durch einen echten,
schmalen Streifen (`.icicle-werkzeugleiste`, `display:flex;
justify-content:flex-end; min-height:44px;`) im normalen Dokumentfluss
oberhalb von `.icicle-svg-bereich` - dasselbe, bereits produktiv bewährte
Muster wie `circlePacking.js`' `.circlepacking-werkzeugleiste` +
`.circlepacking-svg-bereich` (dort ohne Überlauf-Probleme im Einsatz, siehe
vorheriger Live-Test). Schiebt die Zeichenfläche strukturell nach unten,
statt sich mit ihr zu überschneiden - `container.style.position =
'relative'` (nur für den alten Anker nötig) entfällt. Info-Button bleibt wie
zuvor nur einmal pro `render()` erzeugt (`werkzeugleiste` wird von
`zeichneIcicle()` nie angetastet, nur `svgBereich`).

**Live-Verifikation (Testport 8879, danach zurückgesetzt) - echte
Screenshots:** Screenshot der Übersichtsebene zeigt den Info-Button in
eigenem freien Streifen oberhalb der Zeichenfläche, erste Zeile
("Vermögen und Finanzen") vollständig sichtbar, keine Überlappung mehr.
Popover per echtem Koordinaten-Klick (nicht Ref-Klick) auf die sichtbare
Position geöffnet - korrekter Text. Nach Drilldown in eine Kategorie
(Breadcrumb-Zeile "← Vermögen und Finanzen") bleibt der Button weiterhin im
eigenen Streifen oberhalb, keine Überlappung mit der Breadcrumb-Zeile.
Redraw-Test über "Unsicherheiten anzeigen": `.info-button-wrapper`-Anzahl
blieb bei 1 (kein Listener-Leck), `getComputedStyle(.info-button)
.backgroundColor` weiterhin `"rgb(44, 74, 110)"`, Screenshot danach erneut
ohne Überlappung.

**Direkte Dateiverifikation:** `grep -n "icicle-werkzeugleiste\|
erzeugeInfoButton\|icicle-info-button-anker" js/viz/icicle.js` → neue Klasse
`icicle-werkzeugleiste` (Zeilen 525/535), `erzeugeInfoButton()`-Aufruf
gegen `werkzeugleiste` statt gegen den alten Anker (Zeile 547), keine
Treffer mehr für `icicle-info-button-anker` (vollständig entfernt).

---

## 2026-09-07 (6) – Bugfix: Info-Button in Treemap/Circle Packing unsichtbar

**Geänderte Dateien:** `js/viz/treemap.js`, `js/viz/circlePacking.js`. Kein
Code-Fehler in `js/viz/sunburst.js`/`js/viz/icicle.js` gefunden (siehe unten) -
dort keine Änderung nötig.

**Root Cause (Treemap, bestätigt per `getComputedStyle`):** die bestehende
Regel `.treemap-werkzeugleiste button { ... background: var(--surface); ...
}` (Typ-Selektor, Spezifität 0,1,1) traf nach Einbindung des Info-Buttons in
der letzten Etappe UNGEWOLLT auch dessen `<button class="info-button">` (via
den `marginLeft:auto`-Anker in derselben Werkzeugleiste verschachtelt) und
gewann gegen `.info-button`s eigene Deklarationen (Spezifität 0,1,0) auf
allen fünf gemeinsamen Eigenschaften: `background` (var(--surface) statt
var(--accent)), `padding`, `border`, `border-radius` (var(--radius) statt
50%), `min-height`. Ergebnis: aus dem blauen 32px-Kreis wurde ein gepolsterter
Kasten mit weißem "?" auf hellem `var(--surface)`-Hintergrund - de facto
unsichtbar (weiß auf beinahe-weiß). `circlePacking.js` enthielt exakt
denselben Fehler (`.circlepacking-werkzeugleiste button`, byte-identisches
Muster), dort noch nicht gemeldet, aber beim Root-Cause-Check aktiv geprüft
und ebenfalls bestätigt.

**Fix:** in beiden Dateien bekommt NUR der jeweilige "← Alle Kategorien"-
Zurück-Button eine eigene Klasse (`treemap-zurueck-btn` bzw.
`circlepacking-zurueck-btn`, je in `baueWerkzeugleiste()` gesetzt), die
CSS-Regel wird von `.werkzeugleiste button` auf `.werkzeugleiste
.zurueck-btn-Klasse` umgestellt - exakt dieselben Werte, nur nicht mehr
pauschal auf jedes `<button>`-Element in der Werkzeugleiste anwendbar. Optik/
Verhalten des Zurück-Buttons dadurch unverändert (Regressionscheck siehe
unten).

**Sunburst/Icicle - kein Code-Fehler gefunden:** `grep -n "^export function
render"` zeigt in beiden Dateien genau EINE `render()`-Definition, die
Info-Button-Erzeugung darin ist unbedingt (kein `if`, kein früher `return`
davor). Live-Test über einen komplett neuen, zuvor nie verwendeten Port
(8861) reproduziert den Button in beiden Modulen korrekt (Screenshot +
`getComputedStyle` siehe unten) - der zuvor gemeldete Zustand ("kein
`.info-button` im DOM") lässt sich auf frischem Ladepfad nicht reproduzieren.
Plausibelste Erklärung: der bereits mehrfach in diesem Protokoll dokumentierte
Cache-Effekt des Test-Setups (Python `http.server` sendet keine expliziten
Cache-Control-Header, Browser wenden dann eine Heuristik auf Basis von
Last-Modified an) - wurde nicht selbst am Testrechner des Auftraggebers
nachvollzogen, daher hier als wahrscheinlichste, nicht als bewiesene Ursache
benannt. Empfehlung: erneuter Test nach hartem Reload (Strg+Shift+R) bzw. in
einem frischen Tab.

**Live-Verifikation (Testport 8861, danach zurückgesetzt) - echte Screenshots,
keine reine DOM-Prüfung:**
- Treemap: Screenshot zeigt sichtbaren blauen Kreis oben rechts;
  `getComputedStyle(.info-button)` → `backgroundColor: "rgb(44, 74, 110)"`
  (= `var(--accent)`), `borderRadius: "50%"`, `padding: "0px"`,
  `border: "0px none"`, `width/height: "32px"` - exakt die in `infoButton.js`
  vorgegebenen Werte, keine Überschreibung mehr.
- Sunburst: Screenshot zeigt sichtbaren blauen Kreis oben rechts;
  `getComputedStyle` → `backgroundColor: "rgb(44, 74, 110)"`.
- Icicle: Screenshot zeigt sichtbaren blauen Kreis oben rechts;
  `getComputedStyle` → `backgroundColor: "rgb(44, 74, 110)"`.
- Circle Packing: Screenshot zeigt sichtbaren blauen Kreis oben rechts;
  `getComputedStyle` → `backgroundColor: "rgb(44, 74, 110)"`, `borderRadius:
  "50%"`. Zusätzlich per ECHTEM Koordinaten-Klick (nicht Ref-Klick) auf die
  sichtbare Position getestet - Popover öffnete mit korrektem Text.

**Regressionscheck:** Treemap- und Circle-Packing-Kategorie-Zoom nach der
Klassen-Umbenennung erneut per echtem Koordinaten-Klick getestet (Klick auf
"Vermögen und Finanzen" → Kategorie-Ansicht mit unverändert aussehendem
"← Alle Kategorien"-Button) - funktioniert unverändert, keine
Konsolenfehler.

**Reflexion (angefordert): warum die vorige Live-Verifikation das Fehlen/die
Unsichtbarkeit nicht aufdeckte.** Zwei unabhängige methodische Lücken:
1. Interaktionen liefen über `ref`-basierte Klicks (Accessibility-Tree) statt
   echter Koordinaten-Klicks auf die tatsächlich gerenderte Position - ein
   `ref`-Klick trifft das Element unabhängig davon, ob es visuell sichtbar
   ist (Kontrast, Farbe, Position), da er nicht über Pixel, sondern über den
   Accessibility-Knoten adressiert. Der klickbare, semantisch korrekte
   Button wurde dadurch fälschlich als "funktioniert" gewertet, obwohl er
   für einen echten Nutzer unsichtbar war.
2. Der einzige Versuch einer visuellen Nahaufnahme (`zoom`-Tool auf den
   Button-Bereich) schlug mit einer Fehlermeldung fehl ("region crop not yet
   supported") und fiel still auf einen vollständigen, niedrig aufgelösten
   Screenshot zurück - dieser Fallback wurde nicht als Ausfall erkannt und
   der 32×32px-Button in der Gesamtansicht dadurch nicht als Kontrastproblem
   bemerkt. Es wurde außerdem nie `getComputedStyle` auf `.info-button`
   selbst geprüft - reiner DOM-Text-/Vorhandensein-Abgleich
   (`.innerText`, `document.querySelector`) sagt nichts über die tatsächlich
   gerenderte Farbe/Kontrast aus. Konsequenz für künftige Sichtbarkeits-
   Behauptungen: bei jeder "ist sichtbar/ist korrekt gestylt"-Aussage
   entweder einen echten, vollflächigen Screenshot mit anschließender
   visueller Prüfung ODER einen `getComputedStyle`-Abgleich gegen die
   erwarteten Werte liefern - ein erfolgreicher `ref`-Klick oder ein
   Text-Abgleich allein belegt das nicht.

**Direkte Dateiverifikation:** `grep -n "zurueckBtn.className\|treemap-zurueck-btn"
js/viz/treemap.js` → Klassenzuweisung Zeile 276, CSS-Regeln Zeilen 243/245/246.
`grep -n "zurueckBtn.className\|circlepacking-zurueck-btn"
js/viz/circlePacking.js` → Klassenzuweisung Zeile 232, CSS-Regeln Zeilen
99/101/102.

---

## 2026-09-07 (5) – Info-Button für die 5 Bestandsvisualisierungen

**Geänderte Dateien:** `js/viz/treemap.js`, `js/viz/sunburst.js`,
`js/viz/icicle.js`, `js/viz/circlePacking.js`, `js/viz/ganttDiagramm.js`
(jeweils reine Einbindung des in der vorigen Etappe gebauten, geteilten
`js/utils/infoButton.js` - siehe Eintrag „Geteilter Info-Button mit
Erklär-Popover" oben). Keine Änderung an `infoButton.js` selbst,
Hierarchie-Logik, Farbzuordnung (`kategorieFarben.js`), Sidebar-Integration,
Klick-/Zoom-Verhalten oder `MINDESTGROESSE`-Skalierung in einem der fünf
Module (Nicht-Ziele) - Regressionscheck siehe unten.

**Vorab-Verifikation (Auftrag verlangte Rückmeldung bei abweichendem
Verhalten statt unpassender Textübernahme):** alle fünf Module vor der
Umsetzung gegen den jeweils vorgegebenen Popover-Text gelesen.
Treemap/Sunburst/Icicle/Circle Packing entsprachen exakt (Kategorie-Zoom +
Bestand-Klick-Sidebar, bei Treemap kein Zeitspannen-Filter vorhanden, bei
Sunburst „zurück" über Zentrum-Klick statt externen Button - Text bleibt in
der Sache korrekt). Bei `ganttDiagramm.js` (`wireZoom()`, Zeile ~556)
entdeckt: das Modul hat eine bestehende Zoom/Pan-Funktion (Strg+Mausrad/
Trackpad-Pinch zoomt, Ziehen verschiebt, Buttons +/−/⟷), die der
vorgegebene Text nicht erwähnte. Rückgemeldet, Auftraggeber hat die
Ergänzung eines dritten Absatzes dazu freigegeben (erste zwei Absätze
wortwörtlich wie vorgegeben übernommen).

**Zwei unterschiedliche Einbindungs-Muster je nach vorhandener
Modul-Struktur:**
- **Treemap/Circle Packing** (bereits vorhandene Werkzeugleiste mit
  Zurück-Button + Titel): Info-Button als drittes Kind der Werkzeugleiste,
  über einen einzelnen `marginLeft:auto`-Anker-Div ganz nach rechts
  geschoben (keine neue globale CSS-Klasse nötig) - in `baueWerkzeugleiste()`
  einmalig erzeugt, dieselbe Funktion, die auch Zurück-Button/Titel baut.
- **Sunburst/Icicle** (keine vorhandene Werkzeugleiste, Navigation läuft
  ausschließlich über SVG-interne Klicks): neuer, fest positionierter
  Anker-Container (`position:absolute; top:0; right:0; z-index:25`),
  identisches Muster zu `zeitachse.js`' `.zeitachse-info-button-anker`,
  inkl. explizitem `container.style.position = 'relative'` in `render()`
  (`.viz-inhalt` selbst setzt keine Positionierung, siehe
  `css/layout.css:141`). Eigener, von den jeweiligen `zeichneX()`-Neuaufbauten
  nie geleerter Geschwister-Container, wie bei `zeitachse.js`.
- **Gantt** (Werkzeugleiste vorhanden, wird aber bei JEDEM `zeichneGantt()`-
  Aufruf - also bei jedem `resize()`/Unsicherheiten-Toggle - komplett neu
  gebaut, anders als bei Treemap/Circle Packing): Info-Button hier bewusst
  NICHT nur einmal in `render()` erzeugt, sondern bei jedem `zeichneGantt()`-
  Durchlauf neu, mit expliziter `instanz.infoButton.destroy()` unmittelbar
  VOR dem Leeren von `wurzel` - verhindert das sonst bei jedem Redraw
  auftretende Listener-Leck (siehe infoButton.js). `.gantt-werkzeugleiste`
  nutzt bereits `justify-content:space-between` - der als drittes Kind
  angehängte Info-Button landet dadurch automatisch ganz rechts, ohne
  weitere Positionierung.

**Live-Verifikation (Testport 8847, danach zurückgesetzt):** in allen fünf
Modulen Info-Button an visuell gleicher Position (oben rechts im jeweiligen
Werkzeugbereich) bestätigt; Popover-Text in jedem Modul per JS
(`.info-button-popover.innerText`) zeichengleich mit dem Auftragstext
abgeglichen (inkl. des freigegebenen dritten Gantt-Absatzes). Öffnen/
Schließen einzeln getestet: Treemap/Sunburst/Icicle per Escape, Circle
Packing/Gantt per Außerhalb-Klick bzw. Escape - jeweils korrektes Schließen
und Fokus-Rückkehr zum Button. Gantt zusätzlich zweifach über
„Unsicherheiten anzeigen" neu gezeichnet: `.info-button-wrapper`-Anzahl blieb
dabei konstant bei 1 (kein Listener-Leck), Popover öffnete nach dem Redraw
weiterhin korrekt. Regressionscheck: Treemap-Kategorie-Zoom (Klick auf
„Vermögen und Finanzen" → Kategorie-Ansicht mit Zurück-Button), Sunburst-
Segment-Zoom (Kategorie-Segment-Klick → Zoom, Zentrum weiterhin als
Rücksprung-Fläche vorhanden), Icicle-Drilldown (Zeile-1-Klick → Breadcrumb-
Ansicht), Circle-Packing-Kategorie-Klick (→ eigene Kreispackung der
Bestände), Gantt-Balken-Klick (→ Sidebar mit Bestandsdetails) - in allen
fünf Fällen unverändert funktionsfähig, keine Konsolenfehler im gesamten
Testdurchlauf.

**Direkte Dateiverifikation:**
`grep -n "erzeugeInfoButton\|infoButton.destroy\|_INFO_TEXT =" js/viz/{treemap,sunburst,icicle,circlePacking,ganttDiagramm}.js`
→ Import, Text-Konstante, Erzeugung und `destroy()`-Aufruf in allen fünf
Dateien bestätigt (treemap.js: Zeilen 55/57/282/681; sunburst.js: Zeilen
48/50/590/621; icicle.js: Zeilen 56/58/539/570; circlePacking.js: Zeilen
49/51/241/424; ganttDiagramm.js: Zeilen 48/56/620/656/823).

---

## 2026-09-07 (4) – Geteilter Info-Button mit Erklär-Popover

**Neue Datei:** [js/utils/infoButton.js](js/utils/infoButton.js). **Geänderte
Dateien:** `js/viz/zeitachse.js` (Einbindung, Entfernen des bisherigen
Hinweistexts), `js/viz/regestenKachelraster.js` (reine Ergänzung, hatte
zuvor keinen vergleichbaren Hinweistext). Zoom/Pan/Beeswarm/Kategorie-Filter/
Sidebar (Zeitachse) sowie Paginierung/Kachel-Klick/Lightbox/Suchschlitz
(Kachelraster) unangetastet - Regressionscheck siehe unten. Auf die
übrigen 24 Module bewusst NICHT angewendet (Nicht-Ziel), gilt aber ab sofort
als Standardbaustein für jeden künftigen Modul-Auftrag.

**Punkt 1 (geteilte Komponente):** `erzeugeInfoButton(container, {text,
ariaLabel})` - Baustein-Muster wie `ansichtWechseln.js`/das bereits
etablierte Kategorie-Menü in `zeitachse.js` (NICHT das Singleton-Muster von
`tooltip.js`/`lightbox.js`, da jedes Modul seinen eigenen Text braucht).
Blauer, kreisrunder Button (32×32px, `var(--accent)`, weißes „?") mit
`aria-haspopup="dialog"`/`aria-expanded`/`aria-describedby`; Popover
`role="dialog"` + `aria-label`, `position:absolute` direkt am Button
(`top: calc(100% + Abstand); right: 0;`), `max-width: min(360px, 90vw)` und
`max-height: min(420px, 70vh)` mit `overflow-y:auto` gegen Abschneiden am
Bildschirmrand. Schließen über alle drei geforderten Wege (Button-Toggle,
Außerhalb-Klick, Escape) - Fokus wandert beim Öffnen in den Popover-Inhalt
(`tabindex="-1"`, kein eigener Schließen-Button im Popover-Inneren
vorgesehen) und beim Schließen zurück zum Button, analog zur bestehenden
Lightbox-Konvention. Text wird an Leerzeilen in einzelne `<p>`-Absätze
aufgeteilt (mehrere Absätze laut Auftrag ausdrücklich erlaubt).

**Wichtige Architekturentscheidung (Vermeidung eines Listener-Lecks):** In
`zeitachse.js` wird der Info-Button bewusst NUR EINMAL in `render()` erzeugt
(eigener, von `zeichneZeitachse()` nie geleerter Geschwister-Container,
analog zur Sidebar) statt bei jedem Neuaufbau neu - anders als das
Kategorie-Menü, das zwar bei jedem Neuaufbau visuell neu gebaut wird, aber
seine document-Listener unverändert nur einmal registriert. Da der
Info-Button-Text sich nie ändert, gibt es keinen Grund, ihn (und seine
eigenen document-Listener) bei jeder Filteränderung/jedem Resize neu
aufzubauen.

**Punkt 2 (Zeitachse):** „Scrollen = Zoom · Ziehen = Verschieben" entfällt
vollständig, Info-Button an derselben Stelle (oben rechts in der
Werkzeugleiste). Popover-Text wortwörtlich wie im Auftrag übernommen.

**Punkt 3 (Kachelraster):** Neue `.regk-werkzeugleiste`-Flex-Zeile
(Filterleiste links, Info-Button rechts) - vorher gab es dort nur die
Filterleiste ohne umgebende Zeile. Popover-Text wortwörtlich wie im Auftrag
übernommen.

**Live-Verifikation:** Button an visuell gleicher Position (oben rechts der
jeweiligen Werkzeugleiste) in beiden Modulen; Popover-Text in beiden Fällen
per JS exakt mit dem Auftragstext abgeglichen (zeichengleich, inkl. der
„…"-Anführungszeichen um „Unsicherheiten anzeigen"); alle drei Schließen-Wege
einzeln getestet (Button-Klick, `document.body`-Klick, Escape) - jeweils
korrektes Schließen + Fokus-Rückkehr zum Button. Regressionscheck: Zeitachse
- Kategorie-Menü öffnete/schloss weiterhin unabhängig vom Info-Popover
(beide koexistieren korrekt, keine gegenseitige Störung), Zoom weiterhin
funktionsfähig (Tick-Bereich änderte sich nach Scroll-Zoom korrekt).
Kachelraster - Suchschlitz weiterhin korrekt („Wien" → 331 gefilterte
Treffer, exakt wie zuvor), Kachel-Klick-Expand/Collapse weiterhin
funktionsfähig (`aria-expanded` korrekt auf „true" nach Klick). Keine
Konsolenfehler im gesamten Testdurchlauf (nach Behebung eines during der
Umsetzung selbst gefundenen Syntaxfehlers - siehe unten).

**Bug gefunden und behoben (während der eigenen Umsetzung, vor Auslieferung):**
ein rückwärtiger Anführungsstrich (`` ` ``) in einem CSS-Kommentar innerhalb
von `zeitachse.js`' `fuegeStyleEin()`-Template-Literal beendete dieses
vorzeitig und erzeugte einen echten `SyntaxError` beim Laden des Moduls -
beim ersten Testaufruf sofort per Konsolenfehler bemerkt und vor Abschluss
korrigiert (Backtick aus dem Kommentartext entfernt).

**Direkte Dateiverifikation:** `grep -n "^export function" js/utils/infoButton.js` → `erzeugeInfoButton` (Zeile 50); Einbindung in `zeitachse.js` (Import Zeile 115, `ZEITACHSE_INFO_TEXT` Zeile 120, Aufruf Zeilen 889-892, `destroy()` Zeile 940) und `regestenKachelraster.js` (Import Zeile 56, `KACHELRASTER_INFO_TEXT` Zeile 61, Aufruf Zeilen 706-709, `destroy()` Zeile 738) in den tatsächlich ausgelieferten Dateien bestätigt.

---

## 2026-09-07 (3) – Kachel-Klick statt "mehr/weniger anzeigen"-Button

**Betroffene Datei:** `js/viz/regestenKachelraster.js`. Lightbox-Logik selbst
(`js/utils/lightbox.js`) unverändert - nur das Zusammenspiel mit dem neuen
Klick-Handler angepasst. Personen-/Ortsnamen-Links weiterhin nicht aktiviert
(Nicht-Ziel) - lösen unverändert nur `setFilterEntity()` aus. Paginierung/
Suchschlitz/Kategoriefilter/Unsicherheiten-Filter unangetastet.

**Punkt 1:** Der vormalige eigene `<button>` mit Text „mehr anzeigen"/
„weniger anzeigen" (`baueRegestBereich()`) entfällt vollständig - die
Funktion baut jetzt nur noch den reinen Regest-Textabsatz. Der Klick-Handler
sitzt jetzt auf der gesamten Kachel (`baueKarte()`, `karte.addEventListener('click', ...)`)
und schaltet weiterhin pro Kachel unabhängig um (kein Akkordeon, unverändert
aus dem ursprünglichen Punkt 2). Zwei Ausnahmen:
- **Fotos:** `event.stopPropagation()` im Foto-Klick-Handler
  (`baueFotoBereich()`) - ohne dieses stopPropagation() hätte ein Foto-Klick
  gleichzeitig die Lightbox geöffnet UND die Kachel auf-/zugeklappt.
- **Personen-/Ortsnamen:** `event.stopPropagation()` im Entity-Button-Klick-
  Handler (`baueEntityButtons()`).
- **Tastatur:** statt in jedem Kind-Element ein eigenes stopPropagation()
  zu brauchen, prüft der Kachel-eigene `keydown`-Handler `event.target !== karte`
  - reagiert also nur, wenn die Kachel SELBST (nicht ein fokussiertes
  Kind-Element) den Fokus trägt. Robuster als Propagation-Stopping bei
  jedem einzelnen Kind-Element und deckt automatisch auch künftige,
  noch nicht existierende interaktive Kind-Elemente ab.

**Punkt 2:** Neues Chevron-Icon (`baueChevron()`, Unicode „▾", `aria-hidden`)
oben rechts im Kachel-Titel (`.regk-karte-titel`, Flexbox), rotiert per
CSS-Transition (`.regk-chevron-aufgeklappt { transform: rotate(180deg) }`)
beim Auf-/Zuklappen. `cursor: pointer` auf `.regk-karte` gesamt (Foto/Entity-
Buttons hatten bereits ihren eigenen `cursor: pointer`, keine Kollision).
`aria-expanded` auf der Kachel selbst macht den Zustand für Screenreader
zugänglich - bewusst OHNE `role="button"` (das würde mit dem vom Aufrufer
gesetzten `role="listitem"` kollidieren; eine Kachel bleibt primär ein
Listeneintrag, der zusätzlich auf-/zuklappbar ist).

**Live-Verifikation (insbesondere die im Auftrag verlangte Bestätigung zu
Foto-Klicks/Lightbox):**
- Klick auf Kachel-Titel/-Hintergrund: `aria-expanded` korrekt
  false→true→false, unabhängig von anderen Kacheln (Stichprobe über 4
  Kacheln: nur die angeklickte änderte sich).
- **Foto-Klick öffnete die Lightbox korrekt UND die Kachel blieb dabei
  `aria-expanded="false"`** (vor und nach dem Klick identisch) - sowohl per
  Maus-Klick als auch per Tastatur (Fokus auf Foto, Enter → Lightbox öffnet,
  Kachel bleibt unverändert).
- Klick auf einen Personen-/Ortsnamen (Entity-Button) ließ den
  Aufklapp-Zustand der Kachel unverändert (blieb `true`, keine ungewollte
  Umschaltung).
- Tastatur: Enter auf der fokussierten Kachel selbst schaltete korrekt um;
  Enter auf einem anschließend fokussierten Kind-Element (Entity-Button)
  löste KEINE zusätzliche Umschaltung aus (`event.target !== karte`-Prüfung
  bestätigt wirksam).
- Kein alter Button-Text „mehr anzeigen"/„weniger anzeigen" mehr im
  gerenderten DOM (grep + Live-Check: 50 Kacheln, 50 Chevron-Icons, 0 alte
  Buttons). Keine Konsolenfehler während des gesamten Testdurchlaufs.

**Direkte Dateiverifikation:** `grep -n "function baueChevron\|regk-chevron\|schalteAufklappzustandUm\|aria-expanded\|event.stopPropagation\|event.target !== karte" js/viz/regestenKachelraster.js` → alle Fundstellen (u. a. Zeilen 197/319/405/426/468/473/483) in der tatsächlich ausgelieferten Datei bestätigt; `grep -n "btn.textContent = 'mehr anzeigen'"` → kein Treffer (korrekt entfernt).

---

## 2026-09-07 (2) – Korrektur: Mindestgrößen-Platzhalter nicht für Kachelraster

**Betroffene Datei:** `js/viz/regestenKachelraster.js`. `zeitachse.js`
unverändert (mtime bestätigt unangetastet) - behält den Mindestgrößen-
Platzhalter wie vorgesehen.

**Änderung:** Der im vorherigen Auftrag ("Geteilte Viewport-Utilities")
ergänzte Mindestgrößen-Platzhalter (`js/utils/bildschirmHinweis.js`) wurde
aus `regestenKachelraster.js` vollständig entfernt - Import, der dritte
Geschwister-Container (`hinweisContainer`), die Funktion
`aktualisiereBildschirmHinweis()` sowie deren Aufrufe in `render()`/`resize()`.
`resize()` ist jetzt wieder exakt im Zustand von vor jenem Auftrag (die
DAVOR bereits bestehende, unabhängige Punkt-6-Korrektur - options-loser
Aufruf bleibt No-op, ein Aufruf MIT Optionen löst Neuaufbau aus - blieb dabei
unangetastet erhalten, wie verlangt).

**Grundsatzklärung für künftige Modul-Briefs (vom Nutzer vorgegeben, hier nur
dokumentiert):** Der Mindestgrößen-Platzhalter gilt ab sofort nur noch für
Canvas-/SVG-Diagramm-Module mit fester Interaktionslogik (Zoom/Pan/Force-
Layout, z. B. `zeitachse.js`), nicht für Karten-/Listen-basierte,
reflow-fähige Module wie das Kachelraster.

**Punkt 2 des Auftrags (Prüfung Grid-Reflow + Touch-Ziele bei 375px) - Ergebnis:**
- Grid bricht bei 375px sauber auf eine Spalte um (`grid-template-columns`
  reduziert sich auf eine ~450px breite Spalte), kein horizontaler Seiten-
  Scroll (`document.documentElement.scrollWidth === window.innerWidth`
  live geprüft), Regest-Fließtext bricht normal um (`scrollWidth ===
  clientWidth` der `.regk-regest`-Absätze, keine Textabschneidung).
- Paginierungs-Buttons: 44×44px (bereits vorhandenes `min-height`/
  `min-width: 44px` in der CSS) - erfüllt die Richtwert-Empfehlung.
- Lightbox-Foto-Trigger: ~98-100×99-100px (durch `max-width/-height: 100px`
  plus das tatsächliche Thumbnail-Seitenverhältnis) - erfüllt die
  Richtwert-Empfehlung deutlich.
- **"mehr anzeigen"/"weniger anzeigen"-Button (Regest-Ausklapper): nur
  ~104×21px** - die Höhe liegt klar UNTER der 44px-Richtwert-Empfehlung
  (keine `min-height` in der CSS für diesen Button gesetzt, anders als bei
  den Paginierungs-Buttons). **Wie im Auftrag verlangt hier zurückgemeldet,
  NICHT selbstständig behoben** - betrifft `baueRegestBereich()` in
  `regestenKachelraster.js`, außerhalb des Rahmens dieses Korrektur-Auftrags
  (der nur den Platzhalter zurückbauen sollte).

**Direkte Dateiverifikation:** `grep -n "bildschirmHinweis" js/viz/regestenKachelraster.js` → nur noch die erklärende Kopfzeilen-Notiz (Zeile 22), kein Import/Aufruf mehr; `resize()` (Zeilen 592-597) exakt im Vor-Zustand bestätigt; `grep -c "bildschirmHinweis" js/viz/zeitachse.js` → weiterhin 2 Fundstellen (unverändert) in den tatsächlich ausgelieferten Dateien.

---

## 2026-09-07 (1) – Geteilte Viewport-Utilities (Responsive Größe + Mindestgrößen-Platzhalter)

**Neue Dateien:** [js/utils/viewportGroesse.js](js/utils/viewportGroesse.js),
[js/utils/bildschirmHinweis.js](js/utils/bildschirmHinweis.js). **Geänderte
Dateien:** `js/viz/zeitachse.js`, `js/viz/regestenKachelraster.js`. Beeswarm-
Algorithmus/Zoom-Pan/Sidebar/Kategorie-Filter (Zeitachse) sowie Paginierung/
Expand-Collapse/Lightbox/Suchschlitz (Kachelraster) unverändert (Nicht-Ziel) -
Regressionscheck siehe unten.

**Design-Entscheidung mit Auswirkung auf alle künftigen Module (wie im
Auftrag verlangt explizit dokumentiert): Schwellenwert 900px Breite UND
500px Höhe** (`MINDEST_BREITE`/`MINDEST_HOEHE` in `bildschirmHinweis.js`) -
unverändert vom Vorschlag im Auftrag übernommen, live gegen 375×667
(Smartphone-Hochformat) und 1400×900 (Desktop) getestet, keine Anpassung
nötig befunden.

**Punkt 1 (geteilte Höhen-/Breitenermittlung):** `viewportGroesse.js`
exportiert `ermittleVerfuegbareHoehe()`, `ermittleVerfuegbareBreite()` und
eine kombinierte `ermittleVerfuegbareGroesse()` - identische Formel zu
`zeitachse.js`' vorheriger lokaler Implementierung, nur containerunabhängig
statt modul-lokal dupliziert (Parameter `reserveUnten`/`mindestHoehe`/
`seitenfussPuffer` statt fest codierter Konstanten). `zeitachse.js` ruft
ausschließlich noch die geteilte Funktion auf (`grep` bestätigt: keine lokale
`function ermittleVerfuegbareHoehe` mehr in der Datei). **regestenKachelraster.js
übernimmt Punkt 1 bewusst NICHT** (Selbstauskunft, wie im Auftrag als möglich
vorgesehen): das Kachelraster ist ein reines CSS-Grid (`auto-fill`/`minmax`),
bereits von sich aus reflow-fähig, die Seite scrollt regulär - es gibt dort
keine feste "verfügbare Zeichenfläche" wie bei der SVG-basierten Zeitachse,
für die eine Höhenberechnung überhaupt etwas bewirken würde.

**Punkt 2 (Mindestgrößen-Platzhalter):** `bildschirmHinweis.js` exportiert
`istBildschirmZuKlein(breite, hoehe)`, `baueBildschirmHinweis()` und
`fuegeBildschirmHinweisStyleEin()`. Unterhalb des Schwellenwerts ersetzt ein
zentrierter Hinweistext ("Diese Visualisierung benötigt einen größeren
Bildschirm. Bitte Fenster vergrößern oder einen Desktop-/Laptop-Bildschirm
verwenden.") die gesamte Darstellung, in denselben Typografie-/Farb-Tokens
wie das übrige Interface (`var(--text-muted)`/`var(--fs-md)`). Bewusst NICHT
identisch mit dem bereits bestehenden `.kleiner-bildschirm-hinweis`
(app.js/components.css) - jener ist ein schmaler Warnhinweis NEBEN einer
weiterhin dargestellten Visualisierung (Personennetzwerk/Gantt), dieser hier
ersetzt sie vollständig; beide Bedeutungen bewusst nicht vermischt.
- **zeitachse.js:** Prüfung am Anfang von `zeichneZeitachse()` (läuft bei
  jedem `render()`/`resize()`, da diese Funktion von beiden unconditional neu
  aufgerufen wird - keine Strukturänderung nötig).
- **regestenKachelraster.js:** neue Funktion `aktualisiereBildschirmHinweis()`,
  aufgerufen aus `render()` UND am Anfang von `resize()` - **wichtige
  Anpassung:** `resize()` war zuvor bei leeren Optionen (reiner Fenster-
  Resize ohne Argumente, so ruft `app.js` es bei jedem echten Fenster-Resize
  auf) ein vollständiger No-op und hätte den Mindestgrößen-Hinweis nie
  aktualisiert - `aktualisiereBildschirmHinweis()` läuft jetzt VOR diesem
  Early-Return, der Rest von `resize()` bleibt für den optionslosen Fall
  weiterhin bewusst ein No-op (Kachelraster-CSS-Grid regelt sein Layout
  selbst, siehe bestehender Kommentar dort).

**Live-Verifikation:** 375×667 zeigte in BEIDEN Modulen den Platzhalter
(Visualisierung vollständig ersetzt, keine Karten/kein SVG im DOM sichtbar),
Vergrößern auf 1400×900 stellte in beiden Fällen ohne Neuladen den
Normalzustand wieder her (Zeitachse: 1069 Punkte neu aufgebaut; Kachelraster:
50 Karten, korrekte Paginierung „Seite 1/22"). **Regressionscheck bestanden:**
Kachelraster - Paginierung, Expand/Collapse ("mehr anzeigen"), Suchschlitz
(„Wien" → 331 gefilterte Treffer, exakt wie zuvor), Unsicherheiten-Filter
(186 Treffer, exakt wie zuvor) je einzeln nachgetestet; Zeitachse - Beeswarm-
Höhe unverändert nach derselben Formel (497px bei 720px Fensterhöhe, wie
zuvor), Achsentitel/Tick-Schrift/Kontrast-Ränder weiterhin korrekt,
Kategorie-Filter-Standardzustand ("alle ausgewählt") unverändert.

**Testhinweis:** Die Test-Pane emuliert Viewport-Größenänderungen ohne ein
natives `resize`-Ereignis auszulösen (bereits aus früheren Aufträgen dieser
Session bekannte Eigenart) - bei einer Erstauslieferung an der bereits
emulierten kleinen Größe griff die Emulation teils erst NACH dem ersten
`render()`-Aufruf, wodurch die Prüfung beim allerersten Laden einmalig zu
spät griff (reines Test-Artefakt, kein Code-Fehler: ein echtes Gerät liefert
seine Viewport-Maße von Anfang an korrekt, ein echter Fenster-Resize löst
immer ein natives Ereignis aus). Per `window.dispatchEvent(new Event('resize'))`
nachgebildet, um die bestehende App-Verdrahtung (200ms-Debounce in `app.js`)
end-to-end zu prüfen - danach funktionierte der Wechsel in beide Richtungen
zuverlässig.

**Direkte Dateiverifikation:** `grep -n "^export function" js/utils/viewportGroesse.js` → 3 Exporte (Zeilen 28/41/54); `grep -n "^export function\|^export const" js/utils/bildschirmHinweis.js` → 5 Exporte (Zeilen 26/27/29/40/53); Einbindung in `zeitachse.js` (Import Zeile 97/99-102, Aufrufe Zeilen 646/694/724) und `regestenKachelraster.js` (Import Zeile 40-43, `aktualisiereBildschirmHinweis()` Zeile 546, Aufrufe Zeilen 610/633) in den tatsächlich ausgelieferten Dateien bestätigt.

---

## 2026-09-06 (9) – Zeitachse: Standardzustand des Kategorie-Filters geändert

**Betroffene Datei:** `js/viz/zeitachse.js`, einzelne Zeile in `render()`.

**Änderung:** `ausgewaehlteKategorien` startet jetzt mit `new Set(ermittleAlleKategorien())`
(alle 16 Kategorien) statt einem leeren Set - beim Laden sind damit von
Anfang an alle 1069 Punkte nach Kategorie eingefärbt und alle 16 Checkboxen
im Dropdown bereits angehakt, identisch zum bisherigen "Alle auswählen"-
Ergebnis. `ermittleAnzeigeFarbe()`/`passtKategorieFilter()` selbst unverändert
(werten nur `ausgewaehlteKategorien.size` aus, kennen keinen Unterschied
zwischen Start- und Klick-Zustand). "Zurücksetzen" (→ Neutralzustand, leeres
Set) bleibt unverändert erreichbar, ist nur nicht mehr der Ausgangszustand.

**Live-Verifikation:** direkt nach dem Laden (keine Interaktion) waren alle
16 Checkboxen angehakt, 0 von 1069 Punkten neutral gefärbt, Button zeigte
„Kategorie: alle ausgewählt". „Zurücksetzen" stellte danach korrekt wieder
den einheitlich-neutralen Zustand her (1069/1069 neutral), „Alle auswählen"
reproduzierte anschließend erneut den Vollfarben-Zustand - beide bestehenden
Aktionen funktionieren unverändert.

**Direkte Dateiverifikation:** `grep -n "ausgewaehlteKategorien: new Set(ermittleAlleKategorien())" js/viz/zeitachse.js` → Zeile 857 in der tatsächlich ausgelieferten Datei bestätigt.

---

## 2026-09-06 (8) – Zeitachse: Achsenbeschriftung & Kontrast

**Betroffene Datei:** `js/viz/zeitachse.js`. Beeswarm-Algorithmus, Zoom/Pan-
Mechanik, Sidebar-Klick-Logik, Kategorie-Filter und responsive
Größenberechnung unverändert (Nicht-Ziel) - stichprobenartig erneut
verifiziert (Sidebar öffnete korrekt, Unsicherheiten-Filter zeigte weiterhin
exakt 186 Treffer mit rotem Strich-Rand).

**Punkt A (Achsenbeschriftungen):** X-Achse trägt jetzt den Titel
„Ausstellungsjahr“, Y-Achse „Anzahl der Urkunden“ (Standard-D3-Muster, um
-90° rotiert). **Selbstauskunft** (Auftrag verwies auf eine angeblich im
Projekt bereits übliche Achsentitel-Konvention, z. B. bei
„Bestandsvisualisierungen“): alle 31 Visualisierungsmodule durchsucht - es
existiert AKTUELL KEIN einziges Beispiel einer Achsentitel-Rotation/
-Positionierung im gesamten Projekt. Die Positionierung wurde daher neu,
aber mit den bereits etablierten Typografie-/Farb-Tokens (`var(--fs-sm)`/
`var(--text-muted)`) entworfen. `RAND.unten`/`RAND.links` von 30/30 auf 58/55
vergrößert, um Platz für Titel + größere Tick-Schrift zu schaffen. Live
geprüft: X-Titel beginnt 17px unterhalb der Tick-Zahlen, Y-Titel endet 34px
links vom ersten Datenpunkt - keine Überlappung.

**Punkt B (Schriftgröße):** Tick-Schriftgröße 10px → **14px** (= `var(--fs-sm)`,
**Faktor 1,4×**, im Auftrag als Richtwert 1,3–1,5× vorgegeben - explizit
zurückgemeldet wie verlangt). Zusätzlich adaptive Tick-Anzahl
(`ermittleTickAnzahl()`, ~90px Mindestabstand pro Tick, an Breite gekoppelt,
gilt für Erstaufbau UND jeden Zoom-Schritt) - live geprüft: weder im
Ausgangszustand noch nach mehrfachem Hineinzoomen (12 Ticks bei 20-Jahres-
Schritten) trat eine Überlappung benachbarter Jahreszahlen auf.

**Bug gefunden und behoben (bei der Umsetzung von Punkt B):** ein per
`.attr('font-size', 14)` gesetzter Wert auf der Achsen-Gruppe wurde von
`d3.axisBottom()` bei jedem `.call(...)` intern wieder auf dessen eigenen
Default 10 zurückgesetzt (Teil von d3-axis' eigener Rendering-Routine,
unabhängig von der Aufrufreihenfolge) - betraf sowohl den Erstaufbau als
auch jeden Zoom-Schritt. Behoben durch eine CSS-Klasse (`.zeitachse-x-achse`)
statt eines Attributs - höhere Spezifität gewinnt zuverlässig gegen d3's
eigenes Attribut, live an `getComputedStyle()` vor/nach dem Fix sowie nach
mehrfachem Zoomen bestätigt (durchgehend 14px).

**Punkt C (Kontrast) - Rückfrage & Richtungswechsel:** Ursprünglich verlangt:
eine globale Hintergrundfläche mit ≥3:1 Kontrast gegen alle 16 Kategorie-
Farben + Neutralfarbe + Standardfarbe (18 Farben). **Per Erschöpfungssuche
über den gesamten Grauwertebereich (0–255) rechnerisch nachgewiesen: keine
einzelne Hintergrundfarbe erreicht das gleichzeitig** - die ~6 hellsten
Kategorie-Farben (u. a. „Grund und Boden“, „Medien“, „Privatvermögen“)
brauchen einen dunkleren Hintergrund, die ~5 dunkelsten (u. a. „Verkehr, Ver-
und Entsorgung“, „Soziales Leben“, die Neutralfarbe) brauchen einen
helleren - unvereinbar ohne CAT_COLORS zu ändern (laut Nicht-Ziel
ausgeschlossen). Selbst Schwarz/Weiß als Extremfälle erreichen maximal 13
von 18 (nachgewiesenes Maximum). Nutzer per Rückfrage informiert; auf dessen
Vorschlag umgesetzt: **kein globaler Hintergrund**, stattdessen ein
**individuell pro Punkt berechneter Kontrast-Rand** (`ermittleRandfarbe()`),
der `passendeTextfarbe()` aus `kategorieFarben.js` unverändert wiederverwendet
(dieselbe Schwarz/Weiß-Wahl-Funktion, die dort bereits für Sidebar-Badge-Text
läuft - keine neue Kontrastlogik). Ergebnis: **18 von 18 Farben ≥ 3:1**
(schwächster Fall „Politik“ 4,51:1, weit über der Anforderung), vollständig
dokumentiert im Kopfkommentar von `ermittleRandfarbe()` in `zeitachse.js`
(analog zur Text-Kontrastdokumentation in `constants.js`). CAT_COLORS selbst
unverändert. Live an zwei Fällen verifiziert: Neutralfarbe (dunkel) → weißer
Rand (9,08:1); „Grund und Boden“ (hell) → dunkler Rand (`#1a1a1a`, 11,39:1) -
jeweils exakt wie in der Dokumentationstabelle vorausberechnet.

**Direkte Dateiverifikation:** `grep -n "X_ACHSEN_TITEL\|Y_ACHSEN_TITEL\|zeitachse-achsentitel\|function ermittleRandfarbe\|function ermittleTickAnzahl\|TICK_SCHRIFTGROESSE\|NEUTRALE_PUNKTFARBE = " js/viz/zeitachse.js` → alle Fundstellen (u. a. Zeilen 102/106/107/158/472/481/606/610/735/740/748/752) in der tatsächlich ausgelieferten Datei bestätigt.

---

## 2026-09-06 (7) – Zeitachse: Größe & Kategorie-Mehrfachauswahl

**Betroffene Datei:** `js/viz/zeitachse.js`. Beeswarm-Algorithmus (forceX/
forceY/forceCollide-Formeln, Stärken, Tick-Zahl), Zoom/Pan-Mechanik
(rescaleX-Muster, clickDistance-Fix) und Sidebar-Klick-Logik unverändert
(Nicht-Ziel) - beide Punkte greifen nur an den Ein-/Ausgabewerten dieser
bereits bestätigten Bausteine an, nicht an ihrer Funktionsweise selbst.

**Punkt A (bildschirmfüllend, responsiv):** Neue Funktion
`ermittleVerfuegbareHoehe()` misst zur Laufzeit `window.innerHeight` abzüglich
der tatsächlichen Position des (noch leeren) Plot-Bereichs im Viewport -
berücksichtigt damit automatisch die tatsächliche Höhe von Kopfzeile/
Werkzeugleiste, auch wenn diese z.B. auf einem schmalen Bildschirm mehrzeilig
umbricht. Dieser Wert fließt als `zielHoehe`-Parameter in `berechneBeeswarm()`
ein: passt der Schwarm in die verfügbare Höhe, wird er darin mittig zentriert
(füllt die Fläche sinnvoll aus, statt oben zu kleben); braucht er mehr Platz,
wächst die Höhe wie bisher über die verfügbare Fläche hinaus, statt zu
stauchen. Die Zoom-Obergrenze (`ermittleZoomSkalenExtent()`) richtet sich
zusätzlich nach der aktuellen Breite. **Kein neuer, eigener resize-Listener**
nötig/hinzugefügt - `zeitachse.js` nutzt weiterhin ausschließlich das bereits
etablierte, in `app.js` zentral verdrahtete `resize()`-Interface (200ms
Debounce), das schon vor diesem Auftrag bei jedem Fenster-Resize
`mod.resize()` aufrief; `zeichneZeitachse()` berechnet dabei ohnehin komplett
neu (Breite UND jetzt auch Höhe), keine Restgröße vom vorherigen Aufbau
bleibt erhalten.

**Punkt B (Kategorie-Mehrfachauswahl statt Legende):** Die horizontal
scrollbare Farblegende (`baueLegende()`) weicht einem kompakten Dropdown-Menü
mit Checkboxen (`baueKategorieFilter()`), das gleichzeitig als echter,
mit dem Unsicherheiten-Filter UND-verknüpfter Kategorie-Filter dient
(`passtKategorieFilter()`, ODER-Verknüpfung zwischen den ausgewählten
Kategorien). Neutralzustand (keine Auswahl): alle Punkte sichtbar, einheitlich
in `NEUTRALE_PUNKTFARBE` (App-Akzentton) statt nach Kategorie eingefärbt
(`ermittleAnzeigeFarbe()`). "Alle auswählen" (alle 16 Kategorien aktiv)
entspricht dem bisherigen Vollfarben-Zustand, inklusive der ca. 14 Urkunden
ganz ohne Kategorie (bewusst NICHT herausgefiltert, siehe
`kategorieFilterSchraenktEin()`). Öffnen/Schließen des Menüs selbst löst
KEINEN Neuaufbau aus (reine DOM-Sichtbarkeits-Umschaltung, siehe
`setzeKategorieMenuOffen()`) - nur eine tatsächliche Auswahländerung
(Checkbox/"Alle auswählen"/"Zurücksetzen") berechnet das Beeswarm neu, damit
ein bloßer Öffnen-Klick nicht unnötig eine 200-Tick-Simulation über bis zu
1069 Punkte auslöst. Menü schließt bei Klick außerhalb oder Escape (je ein
einziger, in `render()` registrierter `document`-Listener, in `destroy()`
wieder entfernt - kein Listener-Leck bei wiederholtem Neuaufbau).

**Live-Verifikation (zwei Auflösungen für Punkt A, siehe mitgelieferte
Screenshots):**
- 1920×1080: SVG-Höhe wuchs von zuvor rein inhaltsgetrieben (~350-400px) auf
  857px (deutlich mehr der verfügbaren Fläche genutzt), Schwarm sichtbar
  zentriert statt oben klebend.
- 1366×768: nach simuliertem Resize-Ereignis (die Test-Pane emuliert
  Viewport-Änderungen ohne ein natives `resize`-Ereignis auszulösen - live per
  `window.dispatchEvent(new Event('resize'))` nachgebildet, um die bereits
  bestehende App-Verdrahtung end-to-end zu prüfen) schrumpfte die SVG-Höhe
  korrekt auf 545px, alle 1069 Punkte blieben erhalten, keine Abschneidung,
  Achse und Werkzeugleiste vollständig sichtbar.
- Kategorie-Filter: "Religion" allein → 240 Treffer; zusätzlich "Politik" →
  576 Treffer, 0 falsch-positive (stichprobenartig gegen alle gerenderten
  Punkte geprüft); "Alle auswählen" → alle 1069 Punkte, vollständig
  eingefärbt; "Zurücksetzen" → alle 1069 Punkte, einheitlich neutral gefärbt.
  Kombiniert mit aktivem Unsicherheiten-Filter + "Religion" → 43 Treffer, alle
  erfüllten beide Bedingungen gleichzeitig (echte UND-Verknüpfung bestätigt).
- Zoom/Pan und Sidebar-Klick nach den Änderungen erneut stichprobenartig
  geprüft, funktionieren unverändert.

**Direkte Dateiverifikation:** `grep -n "function ermittleVerfuegbareHoehe\|function ermittleZoomSkalenExtent\|function baueKategorieFilter\|function passtKategorieFilter\|function ermittleAnzeigeFarbe\|NEUTRALE_PUNKTFARBE\|zielHoehe" js/viz/zeitachse.js` → alle Fundstellen in der tatsächlich ausgelieferten Datei bestätigt.

---

## 2026-09-06 (6) – Zeitachse (Urkunden): Neuaufbau nach Alpha-Vorbild

**Betroffene Datei:** `js/viz/zeitachse.js` (vollständig überarbeitet). Keine
Änderung an `regestenKachelraster.js`, `CAT_COLORS`, `js/utils/urkundenZeit.js`
oder `js/utils/sidebar.js` - Letztere beide werden nur unverändert importiert
(siehe Selbstauskunft unten).

**Punkt 1 (Beeswarm):** Ersetzt das alte Stapel-Layout (Punkte eines Jahres
stur untereinander, "Stalaktiten") durch eine echte `d3.forceSimulation`
(forceX zur Jahresposition, forceY zu einer gemeinsamen Mittelachse,
forceCollide gegen Überlappung), 200 Ticks synchron pro Neuaufbau. Live
geprüft: dichte Jahre (ca. 1400-1550) bilden ein rundliches, symmetrisches
Cluster statt einer schmalen Linie, dünn besetzte Randjahre zeigen einzelne,
nicht überlappende Punkte (Screenshot beigefügt).

**Punkt 2 (Kategorie-Farbe):** War inhaltlich bereits vorhanden
(`CAT_COLORS[ersteKategorie(record)] || CAT_COLORS.default`, `ersteKategorie()`
= erste Kategorie der pipe-separierten Liste, aus `urkundenZeit.js`, dort
bereits von 8 weiteren Modulen genutzte Konvention). **Selbstauskunft zur
"primären Kategorie"-Regel** (Auftrag: "gleiche Konvention wie im
Kachelraster, falls dort bereits eine Regel existiert - sonst bitte kurz
zurückmelden"): `regestenKachelraster.js` hat KEINE Regel für eine "primäre"
Kategorie - es zeigt dort grundsätzlich ALLE Kategorien einer Urkunde als
eigene Badges nebeneinander, es gibt nichts zu übernehmen. Die Zeitachse
verwendet daher weiterhin die bereits etablierte "erste Kategorie der Liste"-
Konvention aus `urkundenZeit.js` (unverändert, wird von 8 anderen Modulen
ebenso genutzt). Live an 5 Stichproben gegen die tatsächlichen
`kategorien`-Werte geprüft (siehe Testprotokoll unten) - alle 5 Punktfarben
stimmten mit dem jeweils ersten Kategorie-Eintrag überein.

**Punkt 3 (Sidebar bei Klick):** Neu verdrahtet - Klick (und Enter/Leertaste)
auf einen Punkt öffnet die Sidebar mit genau dieser einen Urkunde
(Datum/Orte/Personen/Kategorien/Regest, wie in der aufgeklappten
Kachelraster-Kachel). **Selbstauskunft zur Sidebar-Wiederverwendung**
(Auftrag verlangt Rückmeldung, falls keine 1:1-Wiederverwendung möglich ist):
`js/utils/sidebar.js`s `oeffneSidebar()`/`baueSidebarInhalt()` sind fest auf
das Bestandsverzeichnis-Schema zugeschnitten (Titel aus
`record.name`/`record.kuerzel`, Unsicher-Flag aus `record.daten_unsicher`,
Bestand-Feldnamen wie "zitierweise") - keines davon existiert bei
Urkunden-Records; unverändert übernommen hätte das für jede Urkunde nur
"(ohne Name)" gezeigt und nie eine Unsicher-Kennzeichnung ausgelöst. Statt
`sidebar.js` für ein zweites Datenschema zu verallgemeinern (Risiko für die
fünf bestehenden, nicht zu diesem Auftrag gehörenden Aufrufer treemap.js/
sunburst.js/icicle.js/circlePacking.js/ganttDiagramm.js), wird nur der
tatsächlich schema-unabhängige Teil wiederverwendet (`baueSidebarGeruest()`,
`schliesseSidebar()`, `fuegeSidebarStyleEin()` - Gerüst/Fokus-Mechanik/CSS,
unverändert); Titel und Inhalt baut `zeitachse.js` lokal, mit denselben
CSS-Klassen, damit es optisch identisch aussieht. `js/utils/sidebar.js`
selbst wurde nicht angefasst.

**Punkt 4 (Zoom/Pan):** `d3.zoom()` mit `rescaleX()` auf einer festen
Basis-Skala (gleiches Muster wie `ganttDiagramm.js`), aber bewusst OHNE
dessen Strg+Wheel-Einschränkung - Auftrag verlangt wörtlich "Scrollen = Zoom"
wie im Alpha-Screenshot. Jede Punktposition wird bei jedem Zoom-Schritt aus
`d.jahr` neu berechnet (plus einer kleinen, konstanten
Kollisions-Abweichung `dx`), nicht aus dem alten `cx` skaliert - dadurch
keine Verzerrung (Radius bleibt konstant) und kein Drift nach mehrfachem
Zoomen. Live geprüft: Scrollen zoomt (Achsenbereich 1200-1800 → 1450-1750
nach 5 Scroll-Schritten), Ziehen verschiebt den Ausschnitt, nach mehrfachem
Zoom/Pan und Rückkehr zur Ausgangsstufe hatten alle 1069 Punkte weiterhin
endliche, korrekte `cx`-Werte (keine NaN/Ausreißer).

**Punkt 5 (Unsicherheiten-Filter):** Vorher schaltete der Toggle nur die
Stroke-Farbe eines Punktes um, verbarg aber nie einen Punkt wirklich. Jetzt:
`options.showUncertainty` filtert die Records ECHT (Kriterien identisch zu
`regestenKachelraster.js`s `istRecordUnsicher()` - dort nicht exportiert,
daher als inhaltsgleiche Kopie in `zeitachse.js` selbst), das Beeswarm wird
für die reduzierte Menge neu berechnet. Live geprüft: aktiv zeigte
ausschließlich die 186 tatsächlich unsicheren Urkunden (0 falsch-positive
Treffer per Stichprobenvergleich gegen die Kriterien), alle übrigen Punkte
waren vollständig aus dem DOM entfernt (nicht nur ausgeblendet/ausgegraut -
`document.querySelectorAll('circle').length` war exakt 186, nicht 1069);
Toggle inaktiv stellte alle 1069 Punkte wieder her.

**Punkt 6 (Kategorienlegende, optional):** Umgesetzt - horizontal
scrollbare Legende mit allen 16 `CAT_COLORS`-Kategorien (alphabetisch,
ohne `default`/`__unbekannt__`) plus einem zusätzlichen "(ohne Kategorie)"-
Eintrag für den Grau-Fallback (WCAG 1.4.1: Farbe nie ohne Textlabel).

**Bewusst nicht umgesetzt (Scope-Entscheidung, hier offen zurückgemeldet
statt still entschieden):** Die "Undatiert"-Kacheln (Urkunden ohne
auswertbares Jahr, separater Bereich unterhalb der Zeitachse) sind weiterhin
NUR per Hover/Tooltip erreichbar, nicht per Klick zur Sidebar - die
zugrundeliegende, geteilte Funktion `zeichneUnbekanntBereich()` in
`js/utils/urkundenZeit.js` wird von 8 weiteren Modulen genutzt und war nicht
Teil des Auftragsrahmens.

**Testhinweis (Verifikationsmethode):** Klicks per exakter Bildschirm-
Koordinate waren im Test-Browser-Pane wiederholt unzuverlässig (bekannte
Eigenart dieser Umgebung, bereits in früheren Aufträgen dieser Session
beobachtet); Klicks über das Element-Referenz-System (nicht Koordinaten)
funktionierten zuverlässig und wurden für die gesamte Verifikation verwendet.
Zusätzlich `clickDistance(6)` auf dem Zoom-Verhalten gesetzt (D3-Standardwert
0), da minimale Zeiger-Bewegung zwischen Mausdown/-up sonst von `d3.zoom()`
als Pan-Geste gewertet werden und das native Klick-Ereignis unterdrücken
kann - beeinträchtigt echtes Ziehen (Punkt 4) nicht.

**Direkte Dateiverifikation:** `grep -n "d3.forceSimulation\|function berechneBeeswarm\|function wireZoom\|d3.zoom()\|function oeffneSidebar\|clickDistance\|function istRecordUnsicher\|zeigeUnsicherheit ? records.filter" js/viz/zeitachse.js` → alle acht Fundstellen (Zeilen 77, 165, 206, 216, 248-249, 261, 327) in der tatsächlich ausgelieferten Datei bestätigt.

---

## 2026-09-06 (5) – Bugfix: Placeholder-Text im Suchschlitz abgeschnitten

**Betroffene Datei:** `js/utils/filterleiste.js` (nur CSS in `fuegeStyleEin()`
sowie zwei neue Klassennamen auf den bestehenden `<label>`-Elementen).

**Ursache:** `min-width: 260px` für das Suchfeld reichte nicht annähernd für
den vollständigen Placeholder-Text „Suche in Signatur, Regest, Orten,
Personen, Kategorien …" - per `canvas.measureText()` mit der tatsächlich
verwendeten Schrift (14px Inter) gemessen: ~402px allein für den Text zzgl.
Padding/Rahmen, also gut 140px mehr als die bisherige Mindestbreite.

**Fix (Kombination aus den beiden im Auftrag vorgeschlagenen Optionen):**
`min-width` auf 440px angehoben (Sicherheitsspanne über die gemessenen 402px
für andere Systemschriften/Zoomstufen) UND das Such-`<label>` bekommt
zusätzlich `flex: 1 1 440px`, sodass es bei ausreichend breitem Fenster mehr
als die Mindestbreite einnimmt. Das Kategorie-`<label>` bekommt bewusst
`flex: 0 0 auto` (keine eigene Streckung), damit nur das Suchfeld zusätzlichen
Platz bekommt und das Kategorie-Dropdown seine bisherige Breite behält -
Placeholder-Text wurde NICHT gekürzt.

**Verifikation:** Per `canvas.measureText()` gegen den tatsächlich gerenderten
Input geprüft: benötigte Breite 402px, tatsächliche Feldbreite bei
Standard-Fensterbreite 800px (`passtRein: true`). Screenshot bei
Standard-Breite zeigt den vollständigen Placeholder ohne Abschneiden;
Kategorie-Dropdown („Alle Kategorien") unverändert bei ~299px, nicht gestreckt
oder verzerrt. Bei künstlich verengtem Fenster (900px) bricht das Suchfeld
regulär in eine neue Zeile um (bestehendes `flex-wrap: wrap` der
Filterleiste) statt zu überlaufen oder das Kategorie-Feld zu verdrängen.

**Direkte Dateiverifikation:** `grep -n "min-width: 440px\|filterleiste-suche-label\|filterleiste-kategorie-label" js/utils/filterleiste.js` → Zeilen 38-41 (CSS) und 71/79 (Klassenzuweisung auf den Labels) in der tatsächlich ausgelieferten Datei bestätigt.

---

## 2026-09-06 (4) – Suchschlitz + Kategoriefilter im Regesten-Kachelraster

**Betroffene Dateien:** `js/utils/filterleiste.js` (neu), `js/viz/regestenKachelraster.js`
(Einbindung, Filterlogik, Paginierungs-Status-Text; `app.js` und alle übrigen
30 Visualisierungsmodule bewusst unangetastet - Nicht-Ziel).

**Änderung:** Oberhalb des Kachelrasters erscheint eine Filterleiste mit
Suchschlitz (Placeholder „Suche in Signatur, Regest, Orten, Personen,
Kategorien …", case-insensitive Teilstring-Suche über genau diese fünf Felder,
live bei Eingabe mit 250ms Debounce) und Kategorie-Dropdown („Alle Kategorien"
als Default, darunter alle 16 Kategorien aus `CAT_COLORS` alphabetisch, ohne
die beiden technischen Fallback-Schlüssel `default`/`__unbekannt__`). Beide
kombinieren sich per UND-Verknüpfung mit dem bereits bestehenden
Unsicherheiten-Toggle; Paginierung und der Seitenzähler-Text („Seite X / Y (…
von … gefilterten Treffern)") beziehen sich stets auf die tatsächlich
kombinierte Treffermenge aller aktiven Filter.

**Architektur/Selbstauskunft:** Neu angelegtes, geteiltes
`js/utils/filterleiste.js` nach dem Baustein-Muster von
`js/core/ansichtWechseln.js`/`unsicherheitsButton.js` (jeder Aufruf erzeugt
eine eigene, unabhängige Instanz mit eigenem Zustand) - bewusst NICHT nach dem
Singleton-Muster von `tooltip.js`/`lightbox.js`, weil der Auftrag ausdrücklich
keinen geteilten Filter-Zustand zwischen Urkunden-Modulen vorsieht. Weiß selbst
nichts über „Urkunde"/„Kategorie" im fachlichen Sinn (Placeholder- und
Kategorienliste kommen als Konfiguration von außen), damit z. B. `zeitachse.js`
es später unverändert mitnutzen kann. Die Filterleiste wird in einem eigenen,
von jedem Kachelraster-Neuaufbau (Seitenwechsel, Unsicherheiten-Toggle)
unangetasteten Geschwister-Container gerendert - sonst würde bei jeder live
gefilterten Eingabe das Sucheingabefeld selbst neu erzeugt und der
Eingabefokus mitten in der Eingabe verloren gehen (im Test bewusst geprüft:
Fokus und Eingabewert bleiben über den Debounce-Rerender hinweg erhalten).

**Live-Verifikation:** Suche „Wien" → 331 von 1069 Treffern, alle 50 auf Seite 1
gerenderten Karten enthielten tatsächlich „Wien" (stichprobenartig über alle
gerenderten Karten geprüft, nicht nur die Trefferzahl). Kategorie „Politik" →
343 Treffer, alle gerenderten Karten trugen das Politik-Badge. Kombination
Kategorie „Politik" + Suche „Krems" + Unsicherheiten-Toggle aktiv → 37 Treffer,
alle 37 gerenderten Karten erfüllten alle drei Bedingungen gleichzeitig (Badge,
Textvorkommen, Warn-Icon) - keine der drei Filterlogiken überschrieb eine
andere. „Alle Kategorien" setzte den Kategoriefilter korrekt zurück, während
Suche/Unsicherheiten-Toggle aktiv blieben. Seitenwechsel innerhalb eines
aktiven Filters funktionierte, Suchwert blieb dabei erhalten.

**Direkte Dateiverifikation:** `grep -n "export function erzeugeFilterleiste"
js/utils/filterleiste.js` → Zeile 47; `grep -n "erzeugeFilterleiste"
js/viz/regestenKachelraster.js` → Import (Zeile 27) und Aufruf in `render()`
(Zeile 555) in der tatsächlich ausgelieferten Datei bestätigt.

---

## 2026-09-06 (3) – Punkt 7: Foto-Lightbox im Regesten-Kachelraster

**Betroffene Dateien:** `js/utils/lightbox.js` (neu), `js/viz/regestenKachelraster.js`
(`baueFotoBereich()` erweitert, Import ergänzt, CSS für Foto-Thumbnails ergänzt).

**Änderung:** Klick (oder Enter/Leertaste bei Tastaturbedienung) auf ein
Vorschaufoto in der aufgeklappten Kachel öffnet dieses vergrößert in einer
Lightbox/Vollbild-Overlay. Schließen per Schließen-Button, Klick außerhalb des
Bildes oder Escape-Taste. `role="dialog"`, `aria-modal="true"`, `aria-label`
für Screenreader; Fokus wandert beim Öffnen auf den Schließen-Button, ist beim
Overlay per Tab/Shift+Tab gefangen (Fokus-Falle) und kehrt beim Schließen zum
zuvor fokussierten Vorschaufoto zurück. Öffnen/Schließen der Lightbox hat
keinen Einfluss auf den Aufklapp-Zustand der Regest-Kurzfassung derselben
Kachel (separat geprüft).

**Selbstauskunft (bestehende Lösung vs. Neubau):** Vor dem Neubau geprüft, ob
bereits ein wiederverwendbares Lightbox-/Vollbild- oder Fotoarchiv-Modul
existiert (`js/utils/*.js` sowie das gesamte Projekt durchsucht) – kein
Treffer. Es wurde daher eine neue, geteilte Utility `js/utils/lightbox.js`
angelegt, nach demselben Singleton-Muster wie `tooltip.js` (ein einziges,
lazy erzeugtes Overlay-Element, über alle Aufrufe hinweg wiederverwendet statt
pro Modul dupliziert), damit sie unverändert von jedem künftigen Modul mit
Fotoanzeige mitgenutzt werden kann.

**Entscheidung Mehrfach-Navigation (nicht zwingend beauftragt):** Da die
Vorschaubilder pro Urkunde bereits als Liste vorlagen, wurde einfache
Vor-/Zurück-Navigation (Pfeil-Buttons, Pfeiltasten links/rechts, Zähler
„x / y") zusätzlich umgesetzt statt als offener Punkt zurückgemeldet – der aus
dem bereits vorhandenen `bilder`-Array kombinierte Mehraufwand war gering. Bei
nur einem Foto pro Urkunde bleiben Navigations-Buttons und Zähler ausgeblendet.

**Bekannte Einschränkung beim Testen (nicht funktional, Testumgebung):** Das
bereits bestehende, unveränderte Lazy-Loading der Fotos per
`IntersectionObserver` (`baueLazyBeobachter()`) lädt in der genutzten
Browser-Testumgebung nicht zuverlässig alle unterhalb des ersten Bildschirms
liegenden Kacheln nach (bekannte Eigenart nicht-sichtbarer/nicht-kompositierter
Browser-Tabs in dieser Umgebung, siehe frühere Beobachtungen zu
`requestAnimationFrame` in diesem Projekt). Die Lightbox selbst wurde davon
unabhängig an mehreren tatsächlich geladenen, echten Vorschaufotos
(u. a. Urkunde StaAKr-0007 mit 5 Fotos) vollständig verifiziert: Öffnen mit
korrektem Bild/Index, Vor-/Zurück-Navigation, Zähler, Fokus-Falle (Tab und
Shift+Tab), Schließen per Button/Außerhalb-Klick/Escape, Fokus-Rückkehr zum
auslösenden Foto, sowie keine Seitenwirkung auf den Aufklapp-Zustand der
Kachel.

**Direkte Dateiverifikation:** `grep -n "export function oeffneLightbox"
js/utils/lightbox.js` → Zeile 168; `grep -n "oeffneLightbox"
js/viz/regestenKachelraster.js` → Import (Zeile 26) und zwei Aufrufstellen
(Klick- und Tastatur-Handler, Zeilen 238/242) in der tatsächlich ausgelieferten
Datei bestätigt.

---

## 2026-09-06 (2) – Datenkorrektur: `unsicherheit_anmerkung` für Urkunde StaAKr-0566b

**Betroffene Datei:** `data/urkunden.csv`, einzelne Datenzeile (Signatur
`StaAKr-0566b`). Reine Dateneingabe, keine Code-Änderung.

**Änderung:** `unsicherheit_anmerkung` war bislang leer, jetzt befüllt mit:
`kategorien: Keine inhaltliche Kategorisierung möglich – Regest beschreibt
reine Ausstellungshandlung ohne erkennbaren thematischen Schwerpunkt`.
`kategorien` selbst und alle übrigen Felder dieser Zeile bewusst
unverändert gelassen (Auftrag). Feld war zuvor komplett leer, daher kein
Pipe-Anhängen an bestehende Einträge nötig.

**Nebeneffekt (kein Code geändert):** Da `istRecordUnsicher()` in
`js/viz/regestenKachelraster.js` (siehe Eintrag (1) oben) bereits jede
nicht-leere `unsicherheit_anmerkung` als Unsicherheitsgrund wertet,
erscheint diese Urkunde ab sofort auch im „Unsicherheiten anzeigen"-Filter,
mit obigem Text als Klartext-Begründung auf der Kachel - ohne dass dafür
eine eigene `kategorien_unsicher`-Spalte nötig wäre (die laut `SCHEMA.md`
weiterhin nicht existiert).

Live verifiziert: Datenzeile hat weiterhin exakt 14 Felder (RFC4180-
konform geparst), `kategorien` bleibt leer, Gesamt-Datenzeilenzahl (1069)
unverändert.

---

## 2026-09-06 (1) – Regesten-Kachelraster: Überarbeitung (Paginierung, Kategorie-Farben, Datumsformat, Unsicherheiten-Filter)

**Betroffene Dateien:** `js/viz/regestenKachelraster.js` (Hauptänderung),
`js/config/constants.js` (`CAT_COLORS` mit den 16 realen, aus `urkunden.csv`
ermittelten Kategorien befüllt - vormals Platzhalter). Keine Änderung an
`kategorieFarben.js` selbst (nur `passendeTextfarbe()` importiert), an
`app.js`-Loader-Logik oder an den übrigen ~25 Urkunden-Visualisierungsmodulen
(Zeitachse, Kalender, Netzwerk etc.) - diese profitieren als NEBENEFFEKT der
`CAT_COLORS`-Befüllung (nach Rücksprache mit dem Auftraggeber bewusst so
gewählt) automatisch von echten Kategorie-Farben statt Einheitsgrau, ohne
dass ihr Code angefasst wurde.

**Punkt 1 (Paginierung):** 50 Kacheln/Seite, "← Seite X/Y →"-Navigation,
Seitenwechsel scrollt nach oben. Bei 1069 echten Urkunden: 22 Seiten (21×50 +
1×19 Rest) - live verifiziert.

**Punkt 2 (Expand/Collapse):** bereits vor diesem Auftrag korrekt
unabhängig pro Kachel implementiert (kein Akkordeon) - live erneut bestätigt,
keine Codeänderung nötig.

**Punkt 3 (Kategorie-Farben):** `CAT_COLORS` war bislang nur ein
Platzhalter ohne reale Kategoriewerte. Root-Cause-Check der 16 tatsächlichen
Kategorien in `urkunden.csv` (naive Semikolon-Aufteilung lieferte zunächst
Unsinn wegen eingebetteter Anführungszeichen in Regest-Freitexten - RFC4180-
konformes Parsen behoben), Farben nach demselben Verfahren wie
`baueKategorieFarbSkala()` erzeugt und einzeln gegen WCAG-AA (4,5:1)
verifiziert (alle ≥ 4,51:1, Details in `constants.js`). Unbekannte
Kategorien nutzen `__unbekannt__`. Textlabel bleibt immer sichtbar (WCAG
1.4.1) - Farbe ist reine Ergänzung.

**Punkt 4 (Datumsformat):** Klammerzusatz "(genaues Datum)" entfällt bei
exakten Datierungen (z.B. "1259 XI 17" statt "1259 XI 17 (genaues Datum)");
"ungefähre Angabe"/"nur Jahr" bleiben unverändert.

**Punkt 5:** nicht umgesetzt, wie gefordert zurückgestellt.

**Punkt 6 (Unsicherheiten-Filter):** Button war UI-seitig vorhanden, aber
wirkungslos (`resize()` war ein unconditionaler No-op). Jetzt: Klick filtert
auf Urkunden mit mindestens einem gesetzten Unsicher-Flag oder nicht-leerer
`unsicherheit_anmerkung` (185 von 1069 in den echten Daten), zeigt den Grund
zusätzlich als Klartext direkt auf der Kachel, Paginierung bezieht sich auf
die gefilterte Treffermenge ("50 von 185 gefilterten Treffern").

**Regressionstest:** Zeitachse (andere Urkunden-Visualisierung) und Treemap
(Bestand-Tab) unverändert funktionsfähig, keine Konsolenfehler.

---

## 2026-09-05 (14) – Neue Startseite (Landingpage) im Stil des alten Prototyps

**Neue Dateien:** `js/core/startseite.js`, `css/startseite.css`. **Geänderte
Dateien:** `js/core/app.js` (Routing), `index.html`/`css/layout.css`
(Logo/Wortmarke). Keine Änderung an der Hauptnavigation selbst oder an den
fünf Visualisierungsmodulen.

**Root-Cause-Befund (Schritt 1):** Es existierte bislang KEINE eigene
Startseiten-Route - ein leerer Hash wurde in `app.js` unconditional auf
`#bestand` umgeleitet. Root-URL landete damit faktisch immer direkt im
Bestand-Tab. Jetzt zeigt ein leerer Hash die neue Startseite.

**Referenzquelle:** Der im Auftrag erwähnte alte Single-File-Prototyp
existiert real unter `Desktop/GitHub/Interface-Krems/index.html` (bereits
in `css/base.css`s Farbpaletten-Kommentar referenziert) - Struktur/Klassen/
Texte/Footer-Links/Logo-SVG wurden von dort direkt gelesen statt geraten,
Inhalte für Hero/Einleitung/Kacheln bewusst angepasst statt wörtlich
übernommen (siehe PROJEKTLOG für alle vorgeschlagenen Texte).

**Hero-Karussell:** 4 Slides, Auto-Wechsel alle 7s (deaktiviert bei
`prefers-reduced-motion`), Pfeile, Klick-Punkte, Pfeiltasten-Bedienung.
Themen an die echte Struktur angepasst (Visualisierungen/Führungen/
Literatur/allgemeiner Einstieg) statt der alten "Urkundensuche"/"Bibliotheks-
katalog"-Themen, die im neuen Interface keinen Tab haben. Bildinhalte:
vier unterschiedliche, gedeckte Verlaufsflächen statt echter Fotos, mit
dezentem "Platzhalterbild"-Hinweis.

**Drei-Spalten-Kachelbereich:** Bestand-Visualisierungen / Führungen /
Literatur & Forschung - die alte dritte Kachel "Service & Lesesaal" wurde
NICHT übernommen (keine entsprechende Funktion im neuen Interface, siehe
Auftrag), stattdessen Führungen (echter, im alten Prototyp nicht beworbener
Tab).

**Footer:** Kontakt- und Downloads-Spalte 1:1 aus dem alten Prototyp
übernommen. Root-Cause zu den drei PDFs: nicht lokal im Projekt vorhanden,
aber bereits im alten Prototyp real extern auf `www.krems.at` verlinkt -
dieselben echten URLs übernommen, keine toten Links nötig.

**Logo/Wortmarke:** zweizeilige "krems"/"Stadtarchiv"-Wortmarke (dieselbe
SVG wie im alten Prototyp) ersetzt den Textschriftzug, verlinkt neu auf die
Startseite.

**Regressionstest:** Bestand-Tab inkl. Treemap und Gantt-Diagramm weiterhin
funktionsfähig, Kachel-/Slide-Links navigieren korrekt zu den echten Tabs,
Logo-Link führt zur Startseite zurück, Responsivität bei 375px und 768px
ohne horizontalen Überlauf geprüft - keine Konsolenfehler.

---

## 2026-09-05 (13) – Gantt-Diagramm: Sidebar, Namens-Tooltip, größerer Hover-Bereich

**Betroffene Datei:** `js/viz/ganttDiagramm.js`. `js/utils/sidebar.js`
**unverändert wiederverwendet** - keine Anpassung nötig.

**Punkt 1 (Sidebar):** Klick auf Balken/Marker öffnet die Sidebar (Toggle
bei erneutem Klick), dasselbe Wrapper-Muster wie bei Treemap/Sunburst/Circle
Packing. Strukturell abgesichert gegen den beim Sunburst bereits einmal
aufgetretenen Fehler ("Redraw löscht offene Sidebar mit"): `render()` legt
Sidebar und einen `wurzel`-Wrapper als GESCHWISTER direkt in `container` an;
`zeichneGantt()` (aufgerufen bei jedem `resize()`/Unsicherheiten-Toggle)
leert seither nur noch `wurzel.innerHTML`, nie mehr `container.innerHTML` -
die Sidebar bleibt über jeden Redraw hinweg erhalten, live verifiziert
(Sidebar blieb nach Unsicherheiten-Toggle offen, Titel unverändert). Auswahl-
Markierung: solides dunkelblaues `var(--accent)`-Rahmen (3px, kein Dash/Glow)
statt des orangen Hover-Rahmens - beide Zustände live gleichzeitig geprüft,
Auswahl gewinnt sichtbar über Hover.

**Punkt 2 (Namens-Tooltip):** Hover über die Namensspalte zeigt denselben
Tooltip wie der Balken (Zeitraum/Name/Kategorie/Umfang), verknüpft über
`kuerzel` wie das bestehende Hover-Highlighting. Auf der ganzen Zeile
verdrahtet, nicht nur dem (ggf. per Ellipsis gekürzten) Namens-Span.

**Punkt 3 (Hover-Bereich "ohne Zeitangabe"):** Root-Cause: die sichtbare
Markierung hatte `fill:none` - SVG-Hit-Testing zählt das NICHT als
Trefferfläche, nur der dünne, gestrichelte Stroke-Pfad reagierte. Fix: neue
unsichtbare `fill:transparent`-Trefferflächen-Rect über die volle Zeilenhöhe
und dieselbe Breite wie die Markierung, unter der sichtbaren Markierung
liegend. Live an 4 verschiedenen Punkten der Zeile geprüft (u.a. Zeilenmitte,
vorher nicht trefferfähig) - alle innerhalb der Trefferfläche.

**Regressionstest:** Hover-Highlighting, Pan/Zoom, Tastaturfokus (Enter
öffnet/schließt Sidebar), Resize (Sidebar bleibt erhalten), Modulwechsel
(sauberer Teardown) - keine Konsolenfehler. Sunburst/Circle Packing (Sidebar-
Nutzer) unverändert funktionsfähig.

---

## 2026-09-05 (12) – Gantt-Diagramm: Skalen-Versatz behoben, Hover-Highlighting ergänzt

**Betroffene Datei:** `js/viz/ganttDiagramm.js`.

**Root-Cause-Befund:** Achse und Balken nutzten durchgehend dieselbe
`xSkalaBasis`-Instanz (keine zwei getrennten Skalen) - der gemeldete
Versatz kam stattdessen aus einem klassischen CSS-Flexbox-Fehler:
`.gantt-namensspalte` hatte `flex: 0 0 220px`, aber KEIN `min-width: 0`.
Flex-Items haben standardmäßig `min-width: auto`, was bei einem
Nachfahren mit `white-space: nowrap` (dem längsten Bestandsnamen) die
Spalte auf 520,8px statt 220px aufblähte - Namensspalte und
Kopf-Platzhalter (220px) liefen dadurch ca. 300px auseinander, obwohl die
Skalen selbst korrekt synchron waren. Fix: `min-width: 0` auf
`.gantt-namensspalte`/`.gantt-kopf-namensplatzhalter`.

**Domain-Endwert:** `.nice()` rundete die reale Spanne 1108-2024 auf
[1100, 2100] auf (76 Jahre über dem echten Maximum). Jetzt explizit auf
volle 10 Jahre ab-/aufgerundet: Domain [1100, 2030], nur 6 Jahre Puffer.

**Verifikation:** 5 stichprobenartige Bestände (inkl. "Ingedenkbücher" und
"Chronologische Reihe (Krems)") gegen eine aus den Achsen-Ticks per
linearer Regression rekonstruierte Skala geprüft - alle Breiten exakt
deckungsgleich, X-Positionen bis auf einen konstanten 0,5px-Subpixel-
Rendering-Versatz (Tick-Crisp-Edge-Rundung, kein Skalenfehler) exakt
getroffen.

**Neu: Hover-Highlighting Namensspalte <-> Balken** (bidirektional), verknüpft
über `kuerzel` (live verifiziert: bei allen 315 Beständen vorhanden und
einzigartig) statt Position/Index - bleibt dadurch sortier-/scroll-robust.
Verstärkter oranger Rahmen + dezenter Glow (`filter: drop-shadow`) auf dem
Balken bzw. Farbtönung + linker Akzentstreifen auf der Namenszeile, ohne die
Kategoriefarbe zu verdecken. Funktioniert auch, wenn der Balken durch
Zoom/Pan aktuell außerhalb des sichtbaren Bereichs liegt.

**Regressionstest:** Zoom/Pan, Resize, Unsicherheiten-Toggle, Modulwechsel -
keine Konsolenfehler. Andere vier Module unverändert.

---

## 2026-09-05 (11) – Gantt-Diagramm: Grundfunktionalität neu aufgebaut

**Betroffene Datei:** `js/viz/ganttDiagramm.js` (komplett neu aufgebaute
Zeichenlogik). Farb-Import aus `js/utils/kategorieFarben.js` (wiederverwendet,
nicht dupliziert) statt der bisherigen, für urkunden.csv gedachten
`CAT_COLORS`-Platzhalterkonstante. Keine Änderung an Treemap, Sunburst,
Icicle, Circle Packing oder `kategorieFarben.js` selbst.

**Root-Cause-Befund (Schritt 1):** Kein hierarchischer/verschachtelter
Layout-Fehler - jede Zeile bekam bereits einen simplen, sequenziellen y-Wert
nach Listenindex. Die gemeldete "Kaskade" war ein SORTIER-Artefakt: die
Liste war zuerst nach Kategorie-Name, erst danach nach `zeitraum_von`
sortiert - das erzeugte 12 separate, je in sich aufsteigende Mini-Kaskaden
(eine pro Kategorie), übereinandergestapelt. Die x-Skala existierte bereits
und war funktional korrekt; `baueBestandsHierarchie()` wurde bereits
genutzt. Zusätzlich zwei Fehler, die "unfarbig"/"ohne Zeitachse" erklären:
Balkenfarbe kam aus `CAT_COLORS` (`{default:'#888888'}`, ein Platzhalter für
urkunden.csv) statt `kategorieFarben.js` - alle Balken fielen auf dasselbe
Grau zurück; die Zeitachse wurde technisch gezeichnet, aber unterhalb aller
Balkenzeilen platziert statt oben.

**Neuaufbau:** Feste Namensspalte links (eigener DOM-Ast, vom Zeitachsen-Zoom
strukturell unberührt), Zeitachse oben (`position: sticky`, bleibt beim
vertikalen Scrollen sichtbar), Balken chronologisch nach `zeitraum_von`
sortiert (Kategorien durchmischt), Farbcodierung aus `kategorieFarben.js`,
automatisch generierte Legende, Mindestbalkenbreite 24px (Fitts'sches Gesetz,
verifiziert: 91 von 297 datierten Beständen, 30,6%, liegen bei realistischer
Achsenbreite sonst unter 24px, darunter 13 mit exakt nulljähriger Laufzeit).

**Pan/Zoom:** Ziehen verschiebt die Zeitachse, Strg+Mausrad bzw.
Trackpad-Pinch-Geste zoomt (einfaches Mausrad bleibt bewusst unangetastet für
normales, unabhängiges vertikales Seiten-Scrollen), zusätzlich drei Buttons
(+/-/Zurücksetzen) für Tastatur-/Touch-Bedienung. Buttons wenden die
Zoom-Änderung bewusst OHNE `.transition()` sofort an (Begründung siehe
PROJEKTLOG - Animation hängt von `requestAnimationFrame` ab, das in
unsichtbaren/Hintergrund-Tabs nicht zuverlässig feuert).

**Fehlende Zeiträume:** 18 von 315 Beständen (5,7%) ohne auswertbaren
Zeitraum - nicht ausgeblendet, sondern als eigene, gleichwertige Zeilen am
Ende der Liste mit Badge "ohne Zeitangabe" und gestricheltem Platzhalter
statt Balken.

**Regressionstest:** Resize/Destroy, Tastaturfokus + Tooltip (Balken UND
"ohne Zeitangabe"-Marker), Unsicherheiten-Toggle (bewahrt Zoom-/Pan-Zustand),
Modulwechsel (sauberer Teardown, keine DOM-Reste) - keine Konsolenfehler.
Treemap/Sunburst/Icicle/Circle Packing unverändert.

---

## 2026-09-05 (10) – Circle Packing: Kreise oben/unten abgeschnitten (radius()-Accessor-Bug)

**Betroffene Datei:** `js/viz/circlePacking.js`. Keine Änderung an anderen Modulen.

**Root-Cause-Verdacht des Auftraggebers:** Circle Packing schneidet Kreise
oben/unten ab (sichtbar u.a. bei "ohne Kategorie", zwei weiteren Kategorien
oben, "Stadt und Raum" unten); Vermutung: fehlerhafte/veraltete
`clientHeight`-Lesung im Gegensatz zu Treemap/Sunburst/Icicle.

**Root-Cause-Check (aktiv geprüft, Vermutung des Auftraggebers NICHT
bestätigt in der vermuteten Form):** `clientHeight`-Lesung in
`circlePacking.js` ist identisch zu treemap.js/icicle.js
(`options.height || svgBereich.clientHeight || …`, dynamisch bei jedem
Zeichnen neu gelesen) - kein Unterschied zu den anderen Modulen. Tatsächliche
Ursache lag stattdessen in `packeMitMindestradius()`: der zweite
`d3.pack()`-Aufruf mit eigenem `.radius()`-Accessor (zum Erzwingen des
12px-Mindestradius) überspringt laut d3-hierarchy-Dokumentation die sonst
automatische Nachskalierung der gesamten Packung auf `size([breite, hoehe])`
- "the radius of each leaf circle is specified exactly by the function"
statt proportional an die Zielgröße angepasst. Per isoliertem d3.pack()-Test
empirisch bestätigt: bei breite=900/hoehe=300 überragte die mit erzwungenem
Mindestradius gepackte Fläche die Zielhöhe (minY=-2.7, maxY=324.0 statt
[0,300]) - exakt das gemeldete Symptom (oben UND unten abgeschnitten, da die
Einhüllende zentriert bleibt, aber nicht skaliert wird).

**Fix:** Nach dem `.radius()`-Pack-Aufruf wird dieselbe Skalierung manuell
nachgeholt, die `d3.pack()` ohne `.radius()`-Accessor selbst durchführt
(`faktor = min(breite,hoehe) / (2 * wurzel.r)`, gleichmäßig auf alle
Nachfahren angewendet - bleibt garantiert überlappungsfrei, da alle Abstände
um denselben Faktor skalieren). Kann den erzwungenen Mindestradius dabei
leicht unterschreiten, wenn beides nicht gleichzeitig erfüllbar ist -
Einpassung in die Zielfläche hat dann Vorrang, analog zum bereits etablierten
"rechnerisch unmöglich"-Prinzip.

**Verifikation:** Isolierter d3.pack()-Test (vor Fix: Überlauf bestätigt,
nach Fix: 0 Überlauf, 0 Überlappungen). Live gegen echte Daten: Übersicht bei
1920×1080 (0/12 Verletzungen) und 1600×350 (0/62 Verletzungen, Kategorie-
Ansicht "Verwaltung"). Zusätzlich mit synthetischen Extremdaten (1 großer +
40 sehr kleine Bestände, Canvas 1600×200) gezielt in den Korrekturpfad
gezwungen: 40 Kreise fielen dabei unter den 12px-Mindestradius (r≈9,08,
Einpassung hat wie vorgesehen Vorrang), 0 Verletzungen der Zielfläche.

**Regressionstest:** Zoom in Kategorie-Ansicht, Sidebar-Toggle (öffnen/
schließen), "← Alle Kategorien"-Rücksprung, Unsicherheiten-Toggle über
`resize()` (Navigation bleibt erhalten) - alle bestanden, keine echten
Konsolenfehler (ein 404 stammte nachweislich aus einem eigenen Testaufruf,
nicht aus der App). Treemap/Sunburst/Icicle nicht betroffen (keine
gemeinsam genutzte Funktion geändert).

---

## 2026-09-05 (9) – Icicle: Hierarchische Mindestbreiten-Korrektur (Verschachtelungs-Bug)

**Betroffene Datei:** `js/viz/icicle.js`. Keine Änderung an anderen Modulen.

**Root-Cause (vom Auftraggeber per Screenshot identifiziert, exakt
bestätigt):** Die in (8) eingeführte 24px-Mindestbreiten-Korrektur lief pro
Zeile DREIMAL UNABHÄNGIG (Kategorie-, Unterkategorie-, Bestand-Zeile je als
eine globale, flache Gruppe über die volle Canvas-Breite), ohne Bezug zur
bereits korrigierten Zeile darüber. Das verletzt die Verschachtelungs-
eigenschaft von `d3.partition()`: Unterkategorie-/Bestand-Kacheln lagen
dadurch nicht mehr exakt innerhalb der x0/x1-Spanne ihrer Kategorie-Kachel
aus Zeile 1. Sichtbar u.a. an der Kategoriegrenze
"Vermögen und Finanzen"/"Verwaltung", die zwischen den drei Zeilen um
mehrere hundert Pixel verschoben war.

**Fix:** Korrektur läuft jetzt strikt hierarchisch, Zeile für Zeile, jeweils
NUR innerhalb der bereits korrigierten Elternspanne. Neue Funktion
`korrigierePropagiertProElternteil()` ruft die unveränderte
`korrigiereBreiteFuerGeschwister()` pro Elternteil (statt global pro Zeile)
auf und propagiert eine Verschiebung per neuer Funktion
`skaliereNachkommenX()` linear auf alle Nachfahren des betroffenen Kindes
weiter, bevor die nächste Zeile berechnet wird: erst Kategorie (mit der
Wurzel als einzigem "Elternteil" - reproduziert exakt die bisherige globale
Korrektur, da Kategorien ohnehin die volle Wurzelspanne teilen), dann
Unterkategorie innerhalb der korrigierten Kategoriegrenzen, dann Bestand
innerhalb der korrigierten Unterkategoriegrenzen.

**Verifikation (exakt nach Vorgabe, nicht nur "keine Lücken innerhalb der
Zeile"):** Pixelgenauer Containment-Check (0,05px Toleranz) aller 26
Unterkategorie- und aller 315 Bestand-Kacheln gegen die x0/x1-Spanne ihrer
per `d.ancestors()` aufgelösten Kategorie-Kachel, über alle 12
Kategoriegrenzen - 0 Verletzungen. Explizit an den beiden vom Auftraggeber
genannten/relevanten Grenzen bestätigt: "Vermögen und Finanzen" (x0=0,
x1=396.72528…) / "Verwaltung" (x0=396.72528…, x1=650.96938…) - x1 der einen
== x0 der anderen, exakt kontiguierlich; ebenso "Stadt und Raum" (x1=824.0)
/ "Wirtschaft" (x0=824.0).

**Regressionstest** (frischer Server/Tab): Ebene 2 unverändert bei 2 Zeilen
(Breadcrumb + Bestand, hier war die Korrektur nie fehlerhaft, da nur ein
Elternteil über der Bestand-Zeile steht), Zoom Ebene 1→2 und Rücksprung
Ebene 2→1 (alle drei Zeilen korrekt wiederhergestellt), Resize - alle
bestanden, keine Konsolenfehler. Treemap/Sunburst/Circle Packing nicht
betroffen (keine gemeinsam genutzte Funktion geändert).

---

## 2026-09-05 (8) – Icicle: Rückkehr zur 3-Ebenen-Ansicht mit Zoom-Verhalten

**Betroffene Datei:** `js/viz/icicle.js`. Keine Änderung an `treemap.js`,
`sunburst.js`, `circlePacking.js` (bleiben unverändert beim 2-Ebenen-Modell),
`kategorieFarben.js` oder `sidebar.js`.

**Root-Cause-Befund (Schritt 1):** `baueBestandsHierarchie()` liefert bereits
die volle 3-Ebenen-Struktur unterhalb der Wurzel (Kategorie → Unterkategorie
→ Bestand) - keine Erweiterung der gemeinsamen Datei nötig. `icicle.js`
nutzte diese Daten schon, zeichnete aber bisher nur 2 der 3 Ebenen als
Zeilen; die dritte Zeile ließ sich rein lokal ergänzen, da `d3.partition()`
alle Tiefen in einem Aufruf bereits korrekt proportional berechnet.

**Bewusste modul-spezifische Ausnahme vom 2-Ebenen-Prinzip**, ausschließlich
für Icicle (Begründung des Auftraggebers): Icicle-Zeilen stapeln sich
vertikal und konkurrieren nicht um dieselbe Fläche wie Kacheln, Winkel oder
Kreisradien - eine dritte Zeile kostet nur zusätzliche Höhe, nicht die
Lesbarkeit der anderen Ebenen.

**Ebene 1 (Übersicht):** Jetzt DREI gleichzeitig sichtbare Zeilen
(Kategorie/Unterkategorie/Bestand), jede mit eigener sqrt-Breitenskalierung
und unabhängiger 24px-Mindestbreiten-Korrektur. Live gegen die echten Daten
verifiziert: alle drei Zeilen tilen exakt 968px ohne Lücken/Überlappungen
(0/0 in allen drei Zeilen). Mindestbreiten-Korrektur griff korrekt dort, wo
rechnerisch möglich (Kategorie-Zeile: 6 von 12 auf 24px fixiert;
Unterkategorie-Zeile: 22 von 26 auf 24px fixiert) und blieb korrekt
inaktiv, wo nicht (Bestand-Zeile: 315 Kacheln auf 968px, 315×24px wäre mehr
als das 7-fache der verfügbaren Breite - kleinste Kachel bleibt bei 1,09px,
kein Fehler, sondern explizit im Auftrag als erwartetes Verhalten benannt).
"Ohne Kategorie" propagiert die etablierte Sonderfarbe/-schraffur korrekt
in alle drei Zeilen (Unterkategorie- UND Bestand-Kacheln dieser Gruppe).

**Klick-Verhalten (Schritt 3):** Klick auf JEDE Kachel in Ebene 1 -
unabhängig von ihrer Zeile - zoomt einheitlich in Ebene 2 der zugehörigen
Kategorie (über `d.ancestors()` bis Tiefe 1 aufgelöst). Live verifiziert:
Klick auf eine Unterkategorie-Kachel unter "Verwaltung" UND Klick auf eine
Bestand-Kachel unter "Kultur" öffnen jeweils korrekt die zugehörige
Kategorie-Ansicht (Breadcrumb "← Verwaltung" bzw. "← Kultur"), OHNE die
Sidebar zu öffnen - entspricht exakt dem für die Treemap etablierten
Prinzip "Ebene-1-Klick öffnet eine Kategorie, wählt nicht direkt aus".

**Ebene 2 (Kategorie-Ansicht):** Unverändert bei ZWEI Zeilen (Breadcrumb +
Bestand, Unterkategorie-Zeile verschwindet wieder) - erst hier öffnet ein
Klick auf eine Bestand-Kachel die Sidebar (Toggle-Verhalten bei erneutem
Klick, Fokus-Rückgabe auf `svgBereich`) - live erneut bestätigt.

**Tooltip auf allen drei Zeilen** (Name/Kategorie/Unterkategorie/Umfang wo
zutreffend), live geprüft: Kategorie-Zeile zeigt Name+Bestandanzahl,
Unterkategorie-Zeile zeigt Name+Kategorie-Kontext+Bestandanzahl,
Bestand-Zeile zeigt die volle `baueTooltipText()`-Ausgabe.

**Regressionstest** (frischer Server/Tab, echte Daten, 1000×900): Treemap
(12 Kategorie-Gruppen, unverändert 2-Ebenen), Sunburst (12 Segmente, ein
Ring, unverändert), Circle Packing (12 Kreise, flache Packung, unverändert)
- keine versehentliche Übertragung des 3-Ebenen-Verhaltens. Icicle:
Farbcodierung, Sidebar-Toggle, Tooltip in beiden Ebenen, Rücksprung zu
Ebene 1 (alle drei Zeilen korrekt wiederhergestellt), Unsicherheiten-Toggle
über `resize()` (Navigation bleibt erhalten), Resize/Destroy,
Tastaturfokus (Standard-Rahmen bleibt sichtbar, nicht unterdrückt) - alle
bestanden, keine Konsolenfehler.

---

## 2026-09-05 (7) – Icicle und Circle Packing: Farben, Interaktivität, Sidebar

**Betroffene Dateien:** `js/viz/icicle.js`, `js/viz/circlePacking.js` (beide
komplett überarbeitet). Keine Änderung an `treemap.js`, `sunburst.js`,
`kategorieFarben.js`, `sidebar.js`, `bestandsHierarchie.js` - nur importiert.

**Schritt 1 – Root-Cause-Check (vor jeder Umsetzung geprüft, nicht zufällig
entdeckt):** Beide Module riefen `baueBestandsHierarchie(data)` bisher OHNE
den seit der Treemap-Etappe existierenden `mindestgroesse`-Parameter auf -
fielen auf den gemeinsamen Default (10) zurück, derselbe bereits zweimal
(Treemap, Sunburst) behobene Fehler. Behoben durch denselben
`MINDESTGROESSE_ROH`-Wert (0,05) wie in den anderen drei Modulen;
`bestandsHierarchie.js` selbst bleibt unverändert.

**Beide Module** bekamen zusätzlich: Kategorie-Farbcodierung aus
`js/utils/kategorieFarben.js` (statt der bisherigen `CAT_COLORS`-
Fehlverwendung, identischer Root Cause wie bei Sunburst - Platzhalter für
`urkunden.csv`, keine `bkk_kategorie`-Zuordnung), 2-Ebenen-Navigation
(Kategorie ↔ Bestand, Unterkategorie nur zur Farbabstufung, nie als eigene
Ebene/Ring/Zeile gezeichnet), Name-only-Beschriftung mit Mindestschriftgröße
11px und Tooltip-Fallback, Sidebar-Integration über `js/utils/sidebar.js`
nach dem etablierten Wrapper-Muster (Toggle bei erneutem Klick auf dasselbe
Segment, Fokus-Fallback via eigenem `svgBereich`-Unter-Container mit
`tabindex="-1"`), Unsicherheits-Kennzeichnung mit denselben drei Kanälen
(gestrichelter roter Rand, Warnsymbol, Schraffur).

**Icicle - Rücksprung-Mechanismus (Auftrag verlangte eine begründete
Wahl):** Klick auf die obere Zeile selbst - in der Kategorie-Ansicht zeigt
diese Zeile EIN vollbreites "← Kategoriename"-Breadcrumb-Segment statt der
einzelnen Kategorien. Begründung: konsistent mit Sunburst, wo die
"übergeordnete" Fläche (das Zentrum) ebenfalls gleichzeitig Kontext-Anker
UND Rücksprung-Ziel ist, statt einen an keiner anderen Stelle dieses
Projekts verwendeten neuen Button-Typ einzuführen. Mindestbreite 24px
(Fitts'sches Gesetz, dieselbe Zielgröße wie `treemap.js`/`sunburst.js`),
per Wasserfüllungsverfahren korrigiert (strukturell identisch zu
`sunburst.js`s Winkel-Korrektur, nur ohne Radius-Umrechnung, da Icicle
bereits in Pixeln rechnet). Live verifiziert: Kategorie "Verwaltung" (62
Bestände) auf 968px Breite ist rechnerisch UNMÖGLICH (62 × 24px = 1488px >
968px verfügbar) - korrekt NICHT korrigiert (kleinstes Segment bleibt bei
5,3px); Kategorie "Bevölkerung und Bevölkerungsgruppen" (29 Bestände) ist
möglich - korrekt korrigiert (18 von 29 Segmenten exakt auf 24px fixiert,
0 verbleibend darunter). Fokus-Indikator: Standard-Browser-Rahmen bleibt
unverändert aktiv (rechteckige Segmente, wie bei der Treemap kein
Bedarf für einen eigenen Indikator, siehe Auftrag).

**Circle Packing - Rücksprung-Mechanismus:** externer "← Alle
Kategorien"-Button in einer eigenen Werkzeugleiste, exakt das an
`treemap.js` bereits erprobte Muster (nicht Sunburst-artiges Zentrum, da
eine Kreispackung keinen natürlichen, dauerhaft freien Mittelbereich hat,
den man dafür verwenden könnte). Zwei-Zustands-Wechsel wie gefordert - kein
klassisches Pan-/Zoom-Circle-Packing: die Kategorie-Ansicht baut eine
FLACHE Hilfshierarchie aus den Bestand-Blättern (Unterkategorie-
Farbabstufung wird vorher aus der echten, verschachtelten Hierarchie
berechnet und den Blättern mitgegeben), damit die Bestand-Kreise die volle
verfügbare Fläche nutzen statt nur den Platz ihres nicht gezeichneten
Unterkategorie-Elternkreises.

**Größenkodierung, explizit gegengeprüft statt behauptet:** Da d3.pack()
Fläche linear zum übergebenen (bereits sqrt-transformierten) Wert setzt,
ergibt sich Fläche ∝ sqrt(umfang_lfm) - dieselbe Kompressionsstärke wie bei
der Treemap. Live an den echten Daten gemessen (Kategorie "Verwaltung", 62
Bestände): Radius-Verhältnis größter/kleinster Kreis 3,68:1, **Flächen-
verhältnis 13,53:1** - nahezu exakt das aus der Treemap-Etappe bekannte
Zielverhältnis von ca. 13,5:1. Kein Kompressions- oder Verzerrungsproblem
durch die Kombination der beiden Transformationen.

**Mindestradius:** 12px (Durchmesser 24px, dieselbe Fitts'sches-Gesetz-
Zielgröße). Da `d3.pack()` selbst eine überlappungsfreie Kreisanordnung für
JEDE ihm übergebene Radius-Menge garantiert, wird der Mindestradius über
`d3.pack().radius()` durchgesetzt (ein zweiter Packungsdurchlauf mit
geflossenen Radien) statt über eine nachträgliche Positionskorrektur wie
bei Treemap/Sunburst - bei echten 2D-Kreisen könnte eine nachträgliche
Vergrößerung sonst neue Überlappungen erzeugen. Rechnerisch unmöglicher
Fall (dieselbe bereits etablierte Regel): übersteigt die Gesamtfläche bei
durchgängigem Mindestradius eine konservativ geschätzte verfügbare Fläche
(60% der Canvas-Fläche), wird NICHT korrigiert. Beide Fälle live
verifiziert: bei kleinem Canvas (300×250px) mit "Vermögen und Finanzen"
(142 Bestände) korrekt NICHT korrigiert (129 von 142 unter dem Mindestradius,
rechnerisch unmöglich, 0 Überlappungen der reinen Natural-Packung); bei
"Bevölkerung und Bevölkerungsgruppen" (29 Bestände, 230×200px) korrekt
korrigiert (18 von 29 exakt auf 12px, 0 Überlappungen auch nach dem zweiten
Packungsdurchlauf - paarweise für alle Kreise geprüft, nicht nur
stichprobenartig).

**Fokus-Indikator (wie bei Sunburst, da Kreise ebenfalls nicht der
rechteckigen Bounding Box entsprechen):** `outline: none` nur für
`.circlepacking-kreisgruppe`, ersetzt durch denselben JS-gesteuerten
Indikator (verstärkter `stroke`, `AUSWAHL_FARBE`) wie bei Sunburst - kein
ersatzloses `outline:none`.

**Regressionstest** (frischer Server/Tab, echte Daten, 1000×900): Treemap
(Sidebar-Öffnen/-Schließen/-Toggle, Fokus-Verhalten) und Sunburst (Zoom,
Zentrum-Klick, Sidebar-Toggle) erneut stichprobenartig gegengeprüft, da
beide dieselben, jetzt von vier Modulen genutzten Dateien importieren -
unverändert funktionsfähig. Icicle und Circle Packing: Zoom Ebene 1↔2,
Rücksprung-Mechanismus (Breadcrumb-Zeile bzw. Zurück-Button), Sidebar
öffnen/schließen/Toggle inkl. Fokus-Rückgabe, Unsicherheiten-Toggle über
`resize()` (Navigationsposition bleibt erhalten), Mindestgrößen-Randfälle
(je ein möglicher und ein rechnerisch unmöglicher Fall pro Modul), Resize,
Destroy - alle bestanden, keine Konsolenfehler.

---

## 2026-09-05 (6) – Sunburst: Fokusrahmen-Fix + gemeinsame Sidebar-Architektur

**Betroffene Dateien:** `js/viz/sunburst.js` (Fokus-Indikator, Sidebar-
Integration), `js/viz/treemap.js` (nur Extraktion, keine
Verhaltensänderung), `js/utils/sidebar.js` (neu).

**Punkt A – Root-Cause bestätigt:** Der rechteckige Rahmen ist der
browserseitige Standard-Fokusrahmen, konkret `base.css`s bereits
bestehende Regel `[tabindex]:focus-visible { outline: 3px solid
var(--accent); ... }`, die auch auf `.sunburst-segment` (trägt
`tabindex="0"`) zutrifft. CSS `outline` ist PER SPEZIFIKATION immer ein
Rechteck entlang der Border-Box - kann einer gekrümmten Bogenform
grundsätzlich nie folgen (bei der Treemap fällt das nicht auf, weil
Kachel-Bounding-Box und sichtbare Form dort übereinstimmen). Kein
selbst gezeichneter Auswahl-Indikator, kein Bindungsfehler.

**Punkt A – Behoben:** `outline: none` NUR für `.sunburst-segment`/
`.sunburst-zentrum` (treemap.js unverändert, Nicht-Ziel eingehalten),
ersetzt durch einen zur Bogenform passenden Indikator (verstärkter
`stroke` direkt auf dem Pfad/der Zentrum-Kreislinie, `AUSWAHL_FARBE`,
3px bei reinem Tastaturfokus) - kein ersatzloses `outline:none` (WCAG-
Pflicht zur Fokus-Sichtbarkeit erfüllt). Per JS auf `focus`/`blur`
umgesetzt, nicht per CSS `:focus-visible`-Regel - derselbe bereits in der
Treemap-Etappe bestätigte Grund (ein per `.attr()` gesetztes
Präsentationsattribut hat in dieser Laufzeitumgebung Vorrang vor einer
reinen CSS-Regel für dieselbe Eigenschaft). Per Test verifiziert:
`outlineStyle` nach Fokus `"none"`, eigener Indikator (`#e07820`, 3px)
erscheint bei Fokus und verschwindet korrekt bei „blur" (fällt dabei auf
den tatsächlichen Ruhezustand zurück - inkl. Auswahl-Hervorhebung, falls
das Segment zwischenzeitlich ausgewählt wurde, nicht auf einen pauschal
neutralen Zustand).

**Punkt B – Sidebar-Extraktion:** Gerüst (`baueSidebarGeruest`),
Inhalt-Aufbau (`baueSidebarInhalt`/`baueSidebarBadges`/`baueSidebarFeld`,
inkl. `SIDEBAR_FELDER` → `STANDARD_SIDEBAR_FELDER`) und Fokus-Handling
(`oeffneSidebar`/`schliesseSidebar`) aus `treemap.js` nach
`js/utils/sidebar.js` verschoben - reine Verschiebung, `treemap.js` ruft
dieselbe Logik jetzt importiert auf. CSS-Klassen umbenannt von
`treemap-sidebar*` auf neutrales `bestand-sidebar*` (kein anderes CSS-File
referenzierte die alten Namen, per Grep geprüft). Vergleichsergebnis
vor/nach (wie bei der Farblogik-Auslagerung explizit verlangt): identische
Sidebar-Inhalte (Badges, Felder, Unsicherheits-Hinweis), identisches
Öffnen/Schließen-Verhalten, der kürzlich behobene Fokus-Verwaisungs-Bug
(Fokus landet beim Schließen-per-Wiederklick auf `svgBereich`, nicht
`<body>`) bleibt bestätigt behoben - alles per Test an der Treemap
NACH der Extraktion verifiziert (siehe PROJEKTLOG für Details).

**Generalisierung für Icicle/Circle Packing (Schritt 2, vorbereitet, NICHT
umgesetzt):** `sidebar.js` kennt keine Kachel-/Bogen-Geometrie - nur
Container, `record` und eine kleine Konfiguration
(`{kategorieName, kategorieFarbe, felder}`). `STANDARD_SIDEBAR_FELDER` ist
als Default-Parameter gestaltet (nicht hart codiert), ein künftiges Modul
kann eine eigene Feldliste übergeben, ohne `sidebar.js` zu ändern. Für
Icicle/Circle Packing würde jeweils ein dünner, modul-eigener Wrapper
nötig (analog zu `treemap.js`s `oeffneSidebar()`/`schliesseSidebar()`):
eine eigene Kategorie-Farbe/-Name-Ermittlung aus der jeweiligen
`instanz`, ein eigener `svgBereich`-artiger Fokus-Fallback (`tabindex="-1"`)
sowie das Verdrahten von Klick/Toggle auf den jeweiligen Blatt-Elementen -
keine erneute Architekturentscheidung, aber auch keine automatische
Fertig-Integration ohne diese modulspezifischen Handgriffe.

**Punkt C/D – Sunburst-Integration:** Klick auf ein Bestand-Segment in der
Kategorie-Ansicht öffnet die Sidebar (Name, Kategorie, Unterkategorie,
Umfang, Unsicherheits-Hinweis); erneuter Klick auf dasselbe Segment
schließt sie (Toggle, analog zum Treemap-Fix). Bestehender Hover-Tooltip
bleibt zusätzlich bestehen (unabhängige, sich nicht ausschließende
Mechanismen, wie im Auftrag gefordert) - Namenskollision zwischen
Tooltip/Sidebar-Fokus-Events per D3-Event-Namespacing (`.tooltip`/
`.highlight`) vermieden, da beide unabhängig voneinander auf
`focus`/`blur` reagieren müssen (ohne Namespacing hätte der zuletzt
registrierte Handler den anderen überschrieben - im Test entdeckt und
korrigiert, bevor es zu einem sichtbaren Fehler kam). Ausgewähltes Segment
bekommt denselben Indikator wie Punkt A (keine zweite Mechanik).

**Strukturelle Notwendigkeit, beim Umsetzen entdeckt:** `sunburst.js`
zeichnete bisher direkt in den geteilten Container (`.viz-inhalt`) und
leerte ihn bei jedem Redraw komplett (`container.innerHTML = ''`) - mit
einer Sidebar als Geschwisterelement hätte das die Sidebar bei jedem Zoom/
Resize/Toggle mitgelöscht. Behoben durch denselben Strukturkniff wie
`treemap.js`: ein eigener `svgBereich`-Unter-Container, der jetzt allein
geleert/neu gezeichnet wird.

**Regressionstest** (frischer Server/Tab, echte Daten): Treemap
(Sidebar-Öffnen/-Schließen/-Toggle, Fokus-Verhalten, Kategorie-Hover,
Zurück-Button, Resize, Destroy) und Sunburst (Zoom Ebene 1↔2 inkl. Sidebar-
Zustand, Zentrum-Klick schließt Sidebar korrekt, Mindestwinkel-Korrektur
weiterhin exakt 360°/0 Überlappungen, "ohne Kategorie"-Darstellung,
Unsicherheiten-Toggle über `resize()` - Navigations- UND Sidebar-Zustand
bleiben dabei beide erhalten, Resize, Destroy) - alle bestanden, keine
Konsolenfehler.

---

## 2026-09-05 (5) – Bestandsverzeichnis-Sunburst: Interaktivität, Farben, Skalierung

**Betroffene Dateien:** `js/viz/sunburst.js` (komplett überarbeitet),
`js/utils/kategorieFarben.js` (neu, aus `treemap.js` ausgelagert),
`js/viz/treemap.js` (Farblogik-Import statt lokaler Definition, sonst
unverändert).

**Root-Cause-Befund (Schritt 1):**
- **Einheitlich grau:** `farbeFuerKategorie()` nutzte `CAT_COLORS` aus
  `js/config/constants.js` - laut eigenem Dateikommentar dort nur ein
  Platzhalter für `urkunden.csv`s "kategorien"-Spalte, ohne jede
  `bkk_kategorie`-Zuordnung. Jede Kategorie fiel auf `default: '#888888'`
  zurück - kein Bindungsfehler, die Farblogik für `bkk_kategorie` fehlte
  schlicht komplett.
- **Keine Beschriftung:** Es existierte kein Label-Zeichencode in
  `sunburst.js` (kein Äquivalent zu `treemap.js`s Auto-Fit-Text) - nie
  gebaut, kein Bug.
- **Keine Klick-Interaktion:** Nur `mouseenter/focus`+`mouseleave/blur` für
  Tooltips, kein `click`-Handler, kein Navigationszustand - rein statisch.
- **Hierarchietiefe:** `baueBestandsHierarchie()` lieferte bereits die volle
  4-Ebenen-Struktur, `wurzel.descendants().filter(d => d.depth > 0)` zeichnete
  alle drei Tiefen (Kategorie/Unterkategorie/Bestand) - erklärt die 3
  sichtbaren Ringe im Screenshot.
- **Zusatzfund:** Die Farb-/Kontrastlogik der Treemap existierte nur als
  nicht-exportierte lokale Funktionen in `treemap.js`, nicht als
  importierbares Modul - nach Rückfrage nach `js/utils/kategorieFarben.js`
  ausgelagert (reine Verschiebung, per Test verifiziert: identische
  Kategorie-Farben und WCAG-Kontrastwerte vor/nach der Umstellung, siehe
  PROJEKTLOG).
- **Zweiter Zusatzfund, beim Testen entdeckt:** `render()` rief
  `baueBestandsHierarchie(data)` ohne den seit der Treemap-Etappe
  existierenden `mindestgroesse`-Parameter auf - fiel dadurch auf den
  gemeinsamen Default (10) zurück und floorte praktisch alle Bestände auf
  denselben Wert (exakt der bereits im Treemap-CHANGELOG als
  Folgeauftrag angekündigte Fehler). Behoben durch denselben
  `MINDESTGROESSE_ROH`-Parameter wie in `treemap.js` (0,05), ohne
  `bestandsHierarchie.js` selbst zu ändern (Nicht-Ziel eingehalten - der
  Parameter existierte dort bereits).

**Zwei Navigationszustände (Schritt 2):** Übersicht zeigt genau einen Ring
mit einem Segment pro Kategorie; Klick zoomt in die Kategorie-Ansicht (voller
Kreis aus deren Beständen); Klick auf das Zentrum navigiert zurück. Die
Unterkategorie-Ebene bleibt in der Datenstruktur erhalten (für die
Farbabstufung, s. u.), wird aber in KEINER der beiden Ansichten als Ring
gezeichnet - da nur eine Tiefe pro Ansicht überhaupt gerendert wird, war
keine manuelle Radius-Neuzuordnung zwischen den Ebenen nötig.

**Farbcodierung (Schritt 3):** Kategorie-Farbskala und Unterkategorie-
Abstufung 1:1 aus `js/utils/kategorieFarben.js` importiert (keine
Duplikation). "Ohne Kategorie" bekommt dieselbe neutrale Farbe (`#8a8a8a`)
plus dasselbe Punktmuster wie die Treemap (eigene `<pattern>`-Definition,
da jedes Modul sein eigenes `<svg><defs>` aufbaut - Farb-BERECHNUNG wird
geteilt, SVG-Zeichnen bleibt modul-lokal). Unsicherheits-Kennzeichnung mit
denselben drei Kanälen wie die Treemap (gestrichelter roter Rand,
Warnsymbol, Schraffur-Overlay) - alle drei per Test verifiziert.

**sqrt-Winkeltransformation (Schritt 4), explizit gegengeprüft statt
angenommen:** `.sum((d) => Math.sqrt(d.value || 0))` vor `d3.partition()` -
da d3.partition() Winkel linear proportional zum `.value` vergibt (nicht
zur Fläche), überträgt sich die sqrt-Transformation direkt und korrekt auf
den WINKEL, nicht auf eine Pixelfläche. Live an den echten Daten gemessen
(Kategorie "Vermögen und Finanzen" gezoomt, 142 Bestände): Winkelverhältnis
größtes/kleinstes Segment 12,73:1 (Zielwert ca. 13,5:1 aus der
Treemap-Etappe, siehe Toleranz durch die zusätzliche Mindestwinkel-
Korrektur einiger Segmente) - Gesamtwinkel exakt 360,00° in jeder Ansicht,
keine Überlappungen.

**Mindestwinkel (Schritt 5), Wert anhand echter Daten hergeleitet, nicht
geraten:** Ziel-Bogenlänge 24px (dieselbe Fitts'sches-Gesetz-Zielgröße wie
`treemap.js`' `MINDESTHOEHE_ZELLE`) - der resultierende Mindestwinkel wird
responsiv aus dem tatsächlichen Außenradius berechnet
(`24 / aussenRadius` im Bogenmaß), bei einem typischen Radius von ca.
340-450px ergibt das ca. 3-4°. Empirisch an der Winkelverteilung der echten
Daten geprüft: in der dichtesten Kategorie ("Vermögen und Finanzen", 142
Bestände) fallen je nach Containergröße 32-109 Segmente unter diesen Wert.
**Rechnerisch unmöglicher Fall, live nachgewiesen:** bei kleinerem Radius
(getestet: 338,5px) bräuchten die 109 zu kleinen Segmente 339-443° -
teils über den verfügbaren 360° - hier greift dieselbe bereits in der
Treemap etablierte Lösung: KEINE Korrektur, alle Segmente bleiben an ihrer
regulären, wertproportionalen Position (kein neuer Stapel-Mechanismus, da
d3.partition() ohnehin nie überlappt). Wo rechnerisch möglich (z. B.
Kategorie "Verwaltung", 62 Bestände, 28 zu klein, benötigt nur 87-98°): ein
iteratives Wasserfüllungsverfahren (Defizit anteilig von den größeren
Geschwistern abgezogen, konvergiert nachweislich) - live verifiziert: 38 von
62 Segmenten exakt auf den Mindestwinkel fixiert, 0 verbleibend darunter,
Gesamtwinkel weiterhin exakt 360°.

**Beschriftung (Schritt 6):** Name only, radial vom inneren zum äußeren Rand
laufend (in der unteren Kreishälfte gespiegelt, damit nie auf dem Kopf
stehend), Mindestschriftgröße 11px, keine Abschneidung - passt der Name bei
keiner erlaubten Größe, wird kein Label gezeichnet (nur über Tooltip
erreichbar).

**Zentrum (Schritt 7):** Übersicht zeigt Gesamtzahl der Bestände, reiner
Info-Text ohne Zeigercursor/Klick-Handler (vermeidet die Verwechslung
"sieht klickbar aus, ist es aber nicht"). Kategorie-Ansicht zeigt
Kategorienamen + "← zurück" mit `cursor:pointer`, Hover-Hervorhebung,
Tastaturzugriff (Tab/Enter/Space) - per Test verifiziert.

**Bewusst außerhalb dieses Auftrags (nach Rückfrage):** Kein Sidebar-Klick
auf einzelne Bestand-Segmente in der Kategorie-Ansicht - nur Hover-Tooltip
über die bereits vorhandene `baueTooltipText()` (Name, Kategorie,
Unterkategorie, Umfang, Unsicherheits-Hinweis). Eine Sidebar hätte eine
weitere, deutlich größere Auslagerung aus `treemap.js` erfordert (eigener
Auftrag).

**Regressionstest** (drei Viewport-Größen, frische Server/Tabs, echte
Daten): Übersicht/Kategorie-Zoom (Tastatur UND Maus), Zentrum-Navigation,
Unsicherheiten-Toggle über `resize()` (Navigationsposition bleibt erhalten,
wie beim `app.js`-Fix), Resize (`500×500` neu berechnet), Destroy (Container
vollständig geleert), "ohne Kategorie"-Darstellung, Vollbild-Layout aus der
letzten Etappe (Treemap läuft unverändert auf demselben Server/Datensatz) -
alle bestanden, keine Konsolenfehler auf jeder getesteten Größe (1000×900,
schmales 380×700-Fenster).

**Nebenbefund (informativ, nicht Teil dieses Auftrags):** Die zugrunde
liegende `data/bestandsverzeichnis.csv` hat sich seit der Treemap-Etappe
geändert (315 Datenzeilen/12 benannte Kategorien statt vormals 329/13 - die
Kategorie "Bildung und Erziehung" existiert nicht mehr) - per
`Import-Csv` direkt gegen die Datei verifiziert, keine Fehlfunktion in
diesem oder einem vorherigen Auftrag. Alle in diesem Eintrag genannten
Zahlen (142/62/109/28 etc.) beziehen sich auf den AKTUELLEN Datenstand.

---

## 2026-09-05 (4) – Vollbild-/Viewport-Anpassung aller 31 Visualisierungsmodule

**Betroffene Dateien:** `css/layout.css` (Hauptänderung), `js/viz/treemap.js`
(eine vorab gemeldete, rein optische CSS-Zeile), keine weiteren.

**Root Cause (verifiziert, nicht angenommen):** `#app-content` (das
gemeinsame `<main>` für alle 31 Module) war auf `max-width: 1100px` gedeckelt
- unabhängig vom tatsächlichen Viewport, verschwendete das auf breiten
Bildschirmen (z. B. 1920px) über 800px Breite. `min-height: 60vh` auf
`#app-content` täuschte eine Höhenanpassung nur vor: Ein CSS-`min-height` auf
einem Elternelement vererbt sich NICHT automatisch an Kind-Elemente ohne
eigene Höhen-/Flex-Regel - `.viz-inhalt` selbst hatte gar keine Höhenregel.
Die tatsächliche SVG-Größe wird pro Modul unterschiedlich berechnet (per Grep
über alle 31 Dateien verifiziert): 4 Module (treemap, sunburst, icicle,
circlePacking) lesen bereits `container.clientHeight` dynamisch, ~12 nutzen
eine feste Höhe (`options.height || 600` etc.), ~15 berechnen die Höhe
bewusst aus der Datenmenge (z. B. Zeilenanzahl × Zeilenhöhe bei Gantt/
Ridgeline/Zeitachse) - Letztere sollen laut Design NICHT auf Viewport-Höhe
gezwungen werden. Breite ist dagegen bei ALLEN 31 Modulen bereits
`container.clientWidth`-basiert - die reine Breitenkorrektur wirkt daher
sofort auf alle 31, ohne jede Modul-Änderung.

**Lösung:** `body` wird zur Flex-Spalte (`display:flex; flex-direction:
column; min-height:100vh`), `#app-content` darin `flex:1 1 auto` - füllt
dadurch die komplette verbleibende Höhe, unabhängig von der tatsächlichen
Header-/Footer-Höhe. Bewusst KEIN fester `calc(100vh - Xpx)`-Wert, da Header
und Footer per `flex-wrap` bei schmalen Fenstern ihre Höhe ändern können (an
375px Breite gemessen: Header wächst von 61px auf 158px durch Zeilenumbruch)
- ein fixer Pixel-Abzug wäre dort falsch gewesen. Innerhalb von
`#app-content`: CSS Grid statt Flex-Spalte (`grid-template-columns: auto
auto 1fr; grid-template-rows: auto auto 1fr`), damit die beiden
Werkzeugleisten-Elemente (zwei DOM-Geschwister ohne gemeinsamen Wrapper,
siehe `app.js`) weiterhin nebeneinander in einer Zeile stehen, während
`.viz-inhalt` die komplette dritte Zeile bekommt. `max-width:1100px`
entfernt; Platzhalter-Seiten (Führungen/Literatur/Über, reiner Fließtext)
bekommen stattdessen eine eigene `max-width:700px` für lesbare Zeilenlänge -
nach Rückfrage bewusst gewählt statt eines fragileren Breakout-Tricks nur für
den Viz-Bereich.

**Vorab gemeldete, einzige Modul-Datei-Berührung:** `treemap.js` erzeugt
(anders als sunburst/icicle/circlePacking, die direkt in `.viz-inhalt`
rendern) einen eigenen Unter-Container (`.treemap-svg-bereich`) neben seiner
eigenen Werkzeugleiste - dessen alte feste `min-height:480px` hätte die neue
verfügbare Höhe nicht ausgenutzt. Nach Bestätigung: `.viz-inhalt` wird
(nur während treemap.js aktiv ist, da die Regel in dessen eigenem
injizierten `<style>` lebt) zur Flex-Spalte, `.treemap-svg-bereich` bekommt
`flex:1` (behält `min-height:480px` als Boden). Rein optische CSS-Werte,
keine Interaktions-/Renderlogik verändert.

**Randfall/Fallback (Schritt 3):** `.viz-inhalt` behält `min-height:480px`
(bereits zuvor treemap.js' eigener Wert, jetzt gemeinsamer Boden für alle
Module). Reicht die Viewport-Höhe nicht aus, wächst `#app-content` (bewusst
OHNE `min-height:0` - ein erster Versuch DAMIT führte im Test bei 1024×700
zu sichtbarer Überlappung mit dem Footer, siehe PROJEKTLOG) über den
zugeteilten Platz hinaus, die Seite scrollt. Konkret gemessen: Bei ≥700px
Breite (Header einzeilig) beginnt der Seiten-Scroll unterhalb von **745px
Viewport-Höhe** für die Treemap (die zusätzlich noch ihre eigene interne
Werkzeugleiste trägt - Module ohne eigene interne Werkzeugleiste wie
Sunburst brauchen entsprechend etwas weniger). Keine neue Breiten-Schwelle
eingeführt - Breite war bereits vorher durchgehend fließend bis zu jeder
Fenstergröße; das bestehende `@media (max-width:700px)`-Verhalten
(Header-Umbruch, Kleiner-Bildschirm-Hinweis für Personennetzwerk/Gantt)
bleibt unverändert.

**Getestet (drei Viewport-Größen, echter Server, frische Tabs):**
- **1920×1080:** Treemap-SVG von vorher 1068×480px (≈513.000px²) auf
  1888×821px (≈1.550.000px²) - ca. 3× Fläche. Kein Überdecken von
  Header/Footer.
- **1024×700 ("kleinerer Laptop-Screen"):** 480px-Mindesthöhe greift
  korrekt, Seite scrollt, kein Überlappen mit dem Footer (nach Korrektur des
  `min-height:0`-Fehlversuchs, siehe oben).
- **375px Breite (schmales/mobiles Fenster):** Werkzeugleiste bleibt
  einzeilig (Unsicherheiten-Button + Dropdown passen nebeneinander), Header
  wächst korrekt durch Umbruch, kein Überlappen.
- **Resize-Verhalten:** bestehende 200ms-Debounce/Generation-Counter-
  Infrastruktur unverändert wiederverwendet (kein Code in `app.js` geändert
  außer der bereits vorherigen `render()`→`resize()`-Korrektur) - per echtem
  `resize`-Event verifiziert, SVG passt sich nach der Debounce-Pause korrekt
  an (Hinweis: das Viewport-Resize-Testwerkzeug selbst löst keinen echten
  DOM-`resize`-Event aus, das ist eine Eigenschaft des Testwerkzeugs, nicht
  der App - mit manuell dispatchtem Event verifiziert).
- **Weitere Module stichprobenartig:** Sunburst/Icicle/CirclePacking (SVG
  jeweils auf 1888×873 gewachsen, ganz ohne Modul-Änderung, wie erwartet),
  Zeitachse (Breite jetzt 1888px, Höhe bleibt bewusst datengetrieben),
  Regesten-Kachelraster (großer, absichtlich scrollender Inhalt,
  unverändert), Karte/Leaflet (1888×460, kein Fehler). Kachelauswahl- und
  Platzhalter-Seiten ebenfalls geprüft (volle bzw. auf 700px begrenzte
  Breite, wie vorgesehen).
- **Bereits behobene Interaktionen erneut geprüft:** Unsicherheiten-Toggle
  via `resize()` (Navigationsposition bleibt erhalten) und Sidebar-Toggle bei
  Wiederklick - beide nach der Layout-Änderung unverändert funktionsfähig.
- Keine Konsolenfehler auf jeder getesteten Seite/Größe.

---

## 2026-09-05 (3) – Bestandsverzeichnis-Treemap: zwei Interaktions-Bugs

**Betroffene Dateien:** `js/core/app.js` (zwei Stellen), `js/viz/treemap.js`.

**Punkt 1 – „Unsicherheiten anzeigen" sprang zur Wurzel zurück.** Root Cause
lag NICHT in `treemap.js`, sondern zentral in `js/core/app.js`: Der Button-
Handler (`onToggle`, in `renderBestandTab()` und `renderVisualisierungenTab()`)
rief bei jedem Klick `kontext.aktuellesVizModul.render(vizContainer, records,
{...})` auf - `render()` initialisiert laut Modul-Vertrag (Abschnitt 5) den
kompletten internen Modul-Zustand neu (bei `treemap.js`:
`aktuelleKategorieDaten` wird auf `null` zurückgesetzt, daher der Sprung zur
Wurzel). Vor der Änderung an `app.js` wurde dies mit dem Auftraggeber
abgestimmt, da die Datei zentral von allen 31 Visualisierungsmodulen genutzt
wird. Alle 31 Module implementieren bereits `resize(optionen)` nach demselben
Muster (Optionen zusammenführen, ohne internen Zustand zu berühren) - beide
Aufrufstellen in `app.js` wurden von `.render(...)` auf
`.resize({ showUncertainty: aktiv })` umgestellt. Kontraktkonforme Behebung,
kommt allen 31 Modulen zugute (nicht nur der Treemap): Zoom-/Auswahl-/
Filterzustand anderer Module bleibt beim Umschalten der Unsicherheiten-
Anzeige künftig ebenfalls erhalten.

**Punkt 2 – Sidebar schloss sich nicht bei erneutem Klick auf dieselbe
Kachel.** Root Cause in `treemap.js`: `waehleBestandAus()` setzte bei jedem
Klick unbedingt `instanz.ausgewaehlterName` und öffnete die Sidebar, ohne den
bisherigen Auswahlzustand zu prüfen. Behoben: Klick auf die bereits
ausgewählte Kachel (Namensvergleich gegen `instanz.ausgewaehlterName`,
dieselbe bestehende Vergleichsbasis wie für die Auswahl-Hervorhebung) setzt
die Auswahl zurück und schließt die Sidebar; Klick auf eine andere Kachel
verhält sich unverändert (öffnet/aktualisiert). Zusätzlich behoben: Da der
Klick von der durch `zeichneTreemap()` zerstörten Kachel selbst ausgeht (nicht
vom bereits vorhandenen ×-Button der Sidebar), griff `schliesseSidebar()`s
eigene Fokus-Rückgabe nicht (sie prüft nur, ob der Fokus VOR dem Schließen
innerhalb der Sidebar lag) - der Fokus wäre sonst auf `<body>` verwaist;
`waehleBestandAus()` holt ihn beim Schließen jetzt explizit auf
`instanz.svgBereich` zurück (bereits vorhandenes `tabindex="-1"`).
**Bekannte, bereits dokumentierte Einschränkung bleibt bestehen:** Teilen sich
zwei unterschiedliche Bestände denselben Namen (z. B. real vorhanden:
zweimal „Grundbücher" in „Stadt und Raum"), behandelt der Namensvergleich
einen Klick auf den zweiten wie einen erneuten Klick auf den ersten - dieselbe
vorbestehende Einschränkung wie bei der Auswahl-Hervorhebung, nicht neu
eingeführt.

**Regressionstest** (echter Server, frischer Tab, an den echten Daten):
Zoom Ebene 1↔2 (Titel/Kachelanzahl bleiben beim Unsicherheiten-Toggle
unverändert), Zurück-Button (13 Kategorie-Gruppen, Titel leer, Sidebar
automatisch geschlossen), Kategorie-Hover (`stroke-width` 2.5→4.5→2.5),
Mindesthöhen-Korrektur (weiterhin 0 Kacheln außerhalb der Box), Resize
(SVG-Maße ändern sich, Ansicht bleibt erhalten), Destroy (Container vollständig
geleert) - alle bestanden, keine Konsolenfehler. Zusätzlich ein anderes Modul
(`sunburst.js`) stichprobenartig gegen die `app.js`-Änderung geprüft:
Unsicherheiten-Toggle funktioniert dort unverändert, kein Rendering-Fehler.

---

## 2026-09-05 (2) – Bestandsverzeichnis-Treemap: Regression aus dem Duplikat-Fix behoben

**Betroffene Datei:** `js/viz/treemap.js` (nur `korrigiereMindesthoehen()`).

**Meldung:** Nach dem vorherigen Fix (Stapeln statt identischer Position, siehe
Eintrag unten) erschienen in "Vermögen und Finanzen" und "Verwaltung" neue,
sichtbar abgetrennte schmale Streifen aus vielen winzigen Kacheln.

**Root Cause, konkret verifiziert (nicht angenommen):** Direkt aus dem
gerenderten DOM ausgelesen (an echten Daten, Canvas 1068×480px): in
"Vermögen und Finanzen" lagen 22 von 153 Kacheln außerhalb der eigenen
Kategorie-Fläche, mit `y0`-Werten bis **-522px** - fast 550px über dem
sichtbaren Bereich. Die betroffenen Kacheln gehörten alle zur Unterkategorie
"Öffentliches Vermögen", die allein **109 Bestände in einer nur ca. 450px
hohen Fläche** enthält. Der Stapel-Mechanismus aus dem vorherigen Fix hatte
keine Obergrenze: Bei mehreren gleichzeitig zu niedrigen Geschwistern
subtrahierte er pro Zelle weiterhin 24px von einem gemeinsamen Cursor, ohne zu
prüfen, ob der insgesamt benötigte Platz (Anzahl × 24px) überhaupt in den
Elternbereich passt. Bei 109 Beständen wären 2616px nötig gewesen - mehr als
das 5-fache der tatsächlich vorhandenen ca. 450px. Der Cursor lief dadurch
weit über den oberen Rand hinaus; da dieselbe Korrektur unabhängig auf jeder
Hierarchie-Ebene läuft, verschärfte sich der Effekt zusätzlich rekursiv
(bereits fehlplatzierte Unterkategorie-Boxen wurden zum - jetzt zu kleinen -
Elternbereich für ihre eigenen Bestand-Blätter).

Ein erster Korrekturversuch (Cursor hart auf den Elternbereich begrenzt, Platz
bei Bedarf anteilig kleiner gemacht) erwies sich bei Verifikation gegen die
echten Daten selbst als unzureichend: Die Verfügbarkeits-Berechnung ging von
der GESAMTEN Elternhöhe aus, ohne zu berücksichtigen, dass die übrigen
(nicht betroffenen) Geschwister diese Fläche bereits belegen - und ein
gemeinsamer, X-Position-unabhängiger Stapel-Cursor kann grundsätzlich nicht
ausschließen, mit anderen Geschwistern an derselben Y-Position, aber anderer
X-Position, zu überlappen.

**Endgültige Lösung:** Bei genau EINER zu niedrigen Geschwisterzelle
(sicher lösbar) bleibt die bisherige, getestete Korrektur (Leihen von der
größten Geschwisterzelle, Zelle an den unteren Rand gesetzt) unverändert
bestehen. Bei MEHREREN gleichzeitig zu niedrigen Geschwistern wird bewusst
**keine Verschiebung mehr vorgenommen** - diese Zellen bleiben an ihrer
regulären, wertproportionalen, von d3.treemap() bereits garantiert
überlappungsfreien Position, auch wenn sie dadurch unter 24px bleiben. Das
ist eine bewusste Rücknahme der ursprünglich in Punkt 4 verlangten "harten"
24px-Untergrenze für den Fall extrem dicht besetzter Unterkategorien, in
denen sie rechnerisch nicht für alle Zellen gleichzeitig erfüllbar ist -
Erreichbarkeit bleibt über Tastatur-Fokus und den bestehenden sofortigen
Tooltip-Ersatz für unbeschriftete Kacheln erhalten.

**Verifikation gegen die echten Daten (1068×480px, alle 13 Kategorien):**
0 Kacheln außerhalb ihrer Kategorie-Fläche, 0 echte Überlappungen (vorher: 22
außerhalb allein in "Vermögen und Finanzen", bis zu 522px). Verbleibend unter
24px: 41 von 153 in "Vermögen und Finanzen", 18 von 63 in "Verwaltung" (u. a.)
- ausschließlich in den am dichtesten besetzten Unterkategorien, unvermeidbar
gegeben deren Bestandszahl. Navigation (Kategorie-Drilldown, Zurück-Button,
Sidebar-Öffnen bei Bestand-Klick) erneut getestet, unverändert funktionsfähig.

---

## 2026-09-05 – Bestandsverzeichnis-Treemap: drei offene Punkte aus dem Screenshot-Review

**Betroffene Dateien:** `js/viz/treemap.js` (drei Korrekturen).

**Punkt A – weiße Leerflächen / "Stadt und Raum" ohne sichtbare Kacheln:**
Root Cause verifiziert (nicht angenommen), zwei getrennte, echte Fehler
gefunden, keiner davon `umfang_lfm=0`/leer (diese Bestände hätten korrekt die
Mindestgröße bekommen, wie in der vorherigen Etappe umgesetzt):
1. `d3.treemap().paddingTop(zahl)` reserviert bei JEDEM Knoten mit Kindern
   erneut denselben Abstand, nicht nur einmal auf der Kategorie-Ebene, wo
   tatsächlich eine Beschriftung hineingezeichnet wird - an einem
   Minimalbeispiel nachgewiesen (Unterkategorie-Kinder begannen bei y0=44
   statt y0=22, weil sowohl Kategorie ALS AUCH Unterkategorie je eigenes
   Top-Padding erhielten). Bei "Stadt und Raum" (nur 3 kleinteilige
   Unterkategorien) blieb dadurch praktisch kein Platz für die eigentlichen
   Bestände übrig (Zellen bei 0-1px Höhe/Breite gemessen). Behoben: Top-Padding
   wird jetzt über eine Funktion vergeben, die nur auf Tiefe 1 der
   Wurzel-Ansicht greift (wo die Kategorie-Pille gezeichnet wird), sonst
   überall 0 - auch in der kompletten Kategorie-Ansicht (deren Titel im
   externen Werkzeugleisten-Titel steht, nicht in der SVG).
2. Die Mindesthöhen-Korrektur aus der vorherigen Etappe setzte MEHRERE
   gleichzeitig zu niedrige Geschwisterzellen im selben Elternbereich
   unabhängig voneinander auf dieselbe fest berechnete Position - bei "Stadt
   und Raum" konkret nachgewiesen: drei identische `translate(886,466)`-
   Positionen, nur eine davon sichtbar, die anderen exakt darunter verdeckt.
   Behoben: korrigierte Zellen werden jetzt von unten nach oben gestapelt statt
   auf dieselbe Stelle gesetzt.

Ergebnis nach beiden Korrekturen (verifiziert gegen echte Daten, 1060×650):
Zellen unter 24px Höhe von 115 auf 0 gesenkt, "Stadt und Raum" zeigt jetzt alle
sieben Bestände mit plausiblen Maßen (24-35px), Positions-Duplikate von 24 auf
2 gesenkt. **Bekannter Restfund, nicht vollständig behoben:** 2 Kachelpaare
(je 2 korrekt große, aber exakt deckungsgleiche 24px-Zellen) bleiben bestehen -
vermutlich eine Wechselwirkung zwischen der Korrektur auf Unterkategorie- und
auf Bestand-Ebene in denselben Kategorien. Deutlich selteneres, weniger
schwerwiegendes Restrisiko als vorher (korrekt große statt entarteter
0px-Zellen); nicht weiter verfolgt, da außerhalb der drei gemeldeten Punkte.

**Punkt B – sqrt-Skalierung, konkret verifiziert:** "Zimentierungsbücher"
(0,1 lfm) und "Oberkammeramtsrechnungen" (1,6 lfm) direkt aus dem gerenderten
DOM ausgelesen: `.value`-Verhältnis exakt 4,00:1 (√16 = 4, wie erwartet),
tatsächliche Pixelfläche 2627px² zu 627px² = 4,19:1 (kleine Abweichung durch
die quadratische Packung des Treemap-Algorithmus bei ungleichem
Seitenverhältnis, keine Abweichung in der Skalierungslogik selbst).

**Punkt C – abgeschnittene Kategorienamen ohne eigenen Tooltip:** Der volle
Name war technisch bereits erreichbar (die Pille hat `pointer-events:none`,
Hover fällt auf die dahinterliegende, bereits bestehende 600ms-verzögerte
Kategorie-Klickfläche durch) - aber nicht "analog" zur sofortigen
Ebene-2-Regelung, wie gefordert. Ergänzt: bekommt eine Pille abgeschnittenen
Text, wird NUR SIE (`pointer-events:auto`, eigener `tabindex`/`role="button"`)
zusätzlich mit einem SOFORTIGEN (0ms) Tooltip sowie Klick-zum-Zoomen verdrahtet
- die bestehende 600ms-Verzögerung für den Rest der Kategorie-Fläche bleibt
unverändert und unabhängig bestehen.

---

## 2026-08-27 – Bestandsverzeichnis-Treemap: Überarbeitung

**Betroffene Dateien:**
- `js/viz/treemap.js` (überarbeitet)
- `js/utils/bestandsHierarchie.js` (additive Erweiterung: `baueBestandsHierarchie()` bekommt einen optionalen zweiten Parameter `mindestgroesse`, Default unverändert bei 10; neu `export` für `OHNE_KATEGORIE`)

Kein zentraler Farbskalen-Helper angelegt (keiner vorhanden, Farblogik bewusst
modul-lokal in `treemap.js` gehalten, siehe dortiger Kommentar). Keine anderen
Visualisierungsmodule verändert - `sunburst.js`/`icicle.js`/`circlePacking.js`/
`ganttDiagramm.js` rufen `baueBestandsHierarchie()` weiterhin ohne zweites
Argument auf und erhalten dadurch exakt dieselben Werte wie zuvor (per Test
verifiziert, nicht nur angenommen: `baueBestandsHierarchie(records)` ohne
Argument liefert vor/nach dieser Änderung identische `.value`-Werte für alle
Blätter; `sunburst.js` zusätzlich tatsächlich gerendert und auf unveränderte
Segmentanzahl geprüft).

**Kurzbeschreibung je Punkt:**

1. **Farbcodierung:** Kategoriale Farbskala (Farbton gleichmäßig über den
   vollen Farbkreis verteilt, nicht auf Rot/Grün beschränkt, Helligkeit
   zwischen zwei Stufen wechselnd für Unterscheidbarkeit auch bei
   Graustufen-/Farbfehlsichtigkeits-Simulation), Unterkategorien als
   Helligkeitsabstufung derselben Kategoriefarbe. "Ohne Kategorie" bewusst
   NICHT Teil der Skala: neutrales Grau (#8a8a8a) mit eigenem Punktmuster
   (unterscheidbar von der Unsicherheits-Schraffur), gestrichelter (statt
   durchgezogener) Kategorie-Rahmen, sonst identische Interaktions-/Größen-/
   Beschriftungsregeln wie jede andere Kategorie. Textfarbe: bestehende
   Luminanz-Logik durch echte WCAG-Kontrastformel ersetzt (wählt Schwarz/Weiß
   nach tatsächlich höherem Kontrast, nicht nur einer Helligkeits-Schwelle),
   zusätzlich ein Selbstkorrektur-Mechanismus (`garantiereKontrast()`), der
   jede erzeugte Farbe bei Bedarf nachjustiert, bis mindestens eine Textfarbe
   4,5:1 erreicht - per Test gegen alle 26 tatsächlich vorkommenden
   Hintergrundfarben verifiziert (schlechtester Wert 4,64:1).
2. **Kachelgrößen-Verzerrung:** Root Cause verifiziert (nicht angenommen):
   `bestandsHierarchie.js`s bisheriger Mindestwert 10 floorte 286 von 288
   Beständen mit Wert (99%) auf denselben Wert, da der reale `umfang_lfm`-
   Median bei 0,2 liegt. Kein Bindungsfehler, keine vorher vorhandene Log/
   Sqrt-Transformation. Nach Rückfrage behoben durch: (a) optionaler,
   niedrigerer Mindestwert (0,05) ausschließlich für `treemap.js`s eigenen
   Aufruf, (b) milde Quadratwurzel-Skalierung der Fläche (reduziert das
   Extremverhältnis von ca. 180:1 auf ca. 13,5:1, bleibt streng monoton).
3. **Klickverhalten Ebene 1:** Jede Kategorie ist jetzt eine gruppierte SVG-
   Einheit (`<g class="kategorie-gruppe">`); Hover/Fokus auf JEDEM Kind
   (Kachel oder Zwischenraum) hebt Rahmen + alle Kacheln der ganzen Kategorie
   gemeinsam hervor. Bewusst per JS (`mouseenter`/`mouseleave`/`focusin`/
   `focusout` + `.attr()`) statt per CSS `:hover`/`:focus-within` umgesetzt:
   Ein erster CSS-Ansatz wurde per Vergleichstest verworfen, weil D3s
   `.attr('stroke-width', ...)` in dieser Laufzeitumgebung nachweislich
   Vorrang vor einer reinen CSS-Regel behält - der jetzige, im ganzen Projekt
   bereits bewährte Event+`.attr()`-Ansatz wurde direkt per Event-Dispatch
   verifiziert (Hover UND Tastatur-Fokus lösen die Hervorhebung korrekt aus
   und beenden sie korrekt wieder).
4. **Beschriftung:** Mindestschriftgröße von 9px auf 11px angehoben; Umfangs-
   angabe aus der Kachel-Beschriftung entfernt (bleibt im Tooltip); "…"-
   Abschneidung bei zu langem Namen entfernt - passt der Name bei keiner
   erlaubten Schriftgröße vollständig, wird kein Label gezeichnet. In der
   Wurzel-Ansicht bekommt eine dadurch unbeschriftete Kachel ersatzweise
   einen sofortigen Namens-Tooltip, damit "nur noch über Tooltip erreichbar"
   auch tatsächlich zutrifft (in der Kategorie-Ansicht existiert der
   Bestand-Tooltip ohnehin bereits). Mindesthöhen-Mechanismus (24px,
   bestehend aus Teil B) unverändert als separate harte Untergrenze aktiv.
5. **Legende entfernt:** `.treemap-legende` (Container, Aufbau-Funktion,
   zugehöriges CSS) vollständig entfernt. Navigation ausschließlich über die
   Ebene-1-Kacheln der Treemap selbst.

**Bekannter, nicht behobener Fund (außerhalb des Auftrags, zur Kenntnis):**
Die Auswahl-Hervorhebung (oranger Rahmen bei Klick auf einen Bestand) matcht
aktuell über den Anzeigenamen (`record.name`). Mehrere reale Bestände
teilen sich denselben Namen (z. B. zweimal "Steuerbücher" innerhalb
derselben Kategorie, per Test bestätigt) - dadurch kann fälschlich mehr als
eine Kachel gleichzeitig als ausgewählt erscheinen. Vorschlag für eine
spätere Korrektur: über `record.kuerzel` (laut SCHEMA.md Sortierschlüssel)
oder einen anderen eindeutigen Schlüssel statt über den Namen matchen.

**Hinweis (Nicht-Ziel-Diskrepanz, informativ):** Der in den Nicht-Zielen
erwähnte "Zeitspannen-Slider (25-Jahres-Blöcke, 1100–2025)" wurde weder in
`treemap.js` noch im alten Single-File-Interface gefunden - nichts zum
Erhalten vorhanden, keine Auswirkung auf diesen Auftrag.

**Hinweis für mögliche Folgearbeit (auf Wunsch des Auftraggebers vermerkt):**
Dieselbe Größen-Verzerrung (Punkt 2) liegt mit hoher Wahrscheinlichkeit auch
in `sunburst.js`/`icicle.js`/`circlePacking.js`/`ganttDiagramm.js` vor, da
alle vier denselben (unveränderten) Standard-Mindestwert 10 verwenden. Bewusst
außerhalb dieses Auftrags belassen (Nicht-Ziel: keine Änderungen an anderen
Visualisierungsmodulen) - als eigener Folgeauftrag zu behandeln.

---
