// js/viz/familienbaum.js
// Habsburg-Zeitleistenbaum: EINE Ansicht (ersetzt die vier bisherigen
// Modi vollständig) - Balken je Person, Position/Länge = tatsächliche
// Lebensspanne (echte Kalenderjahre), keine Generationseinteilung mehr.
// Modul-Interface siehe Abschnitt 5.
//
// AUFTRAG "Familienbaum → Habsburg-Zeitleistenbaum (kompletter Ersatz)"
// (2026-09-11, siehe CHANGELOG/PROJEKTLOG für die volle Selbstauskunft):
//
// Personenkreis (Punkt 2, Vorab-Datenarbeit "1:1 übernehmen"): ALLE
// familien.csv-Einträge mit familie in {habsburg, spanische_habsburger,
// habsburg_tirol, habsburg_lothringen} (39 Personen) PLUS alle über
// ehepartner_id verknüpften Personen, die nicht bereits darin sind -
// NICHT hartcodiert, sondern bei jedem render() aus den geladenen Daten
// live ermittelt (Abschnitt 2 "content-driven") - live geprüft: ergibt
// exakt 75 Personen (39 Kern + 36 zusätzliche Ehepartner, siehe
// Selbstauskunft im Chat für die vollständige Liste). Der Kreis wird EINMAL
// bei render() gefiltert (`data.filter(...)`) - jede weitere Funktion
// (byId, kinderIndex, Farben, Baumaufbau, Steiner-Graph) arbeitet danach
// bereits auf dieser 75er-Teilmenge, genau wie zuvor auf allen 80 - kein
// separates "sichtbareIds"-Fädeln mehr nötig (das war im VORHERIGEN
// Quellenbaum-Modus noch die Fehlerquelle, siehe damaliger Bugfix-Kommentar
// im CHANGELOG - hier durch die Vorab-Filterung strukturell ausgeschlossen).
//
// Y-Achse (Punkt 2): lineare Jahres-Skala (d3.scaleLinear), Domain aus dem
// TATSÄCHLICHEN Minimum/Maximum der Geburts-/Sterbejahre im 75er-Kreis
// berechnet (nicht hartcodiert "1218-1790", auch wenn das Ergebnis exakt
// dem entspricht, siehe Selbstauskunft) - jede Person bekommt einen
// vertikalen Balken von yJahr(geburtsjahr) bis yJahr(sterbejahr). Die
// bisherige generationsbasierte Y-Berechnung (Union-Find/längste Kette)
// entfällt dadurch vollständig - nicht mehr nötig, da jetzt echte
// Kalenderjahre statt einer abgeleiteten Ebene verwendet werden.
//
// X-Achse: UNVERÄNDERT das bewährte d3.tree()-Verfahren aus den vorherigen
// Aufträgen für die horizontale Anordnung nach Familienzweig (Kollisions-
// vermeidung zwischen Teilbäumen) - liefert nur noch die X-Position, Y
// kommt vollständig aus der Jahres-Skala.
//
// Ehepaar-Anker/Kinder-Linien (Punkt 2, "bestehendes Muster beibehalten"):
// dieselbe Satelliten-Mechanik wie zuvor (Ehepartner NICHT Teil der
// d3.hierarchy, sondern nach dem Layout seitlich versetzt) - NEU ist nur,
// WELCHER Y-Wert als "Paar-Mitte" gilt, da beide Partner jetzt einen
// Balken (Zeitspanne) statt eines einzelnen Punkts haben: die Mitte der
// zeitlichen ÜBERLAPPUNG beider Balken (ermittleVerbindungsY()) - fällt
// bei fehlender Überlappung (z.B. Datenlücke) auf die Mitte des
// Anker-Balkens zurück. Kinder-Linien enden am oberen Rand (Geburtsjahr)
// des Kind-Balkens, wie zuvor am "oberen Rand des Kind-Knotens".
//
// Teil-Einfärbung (Punkt 2, Kernstück dieses Auftrags): für die 17
// Personen mit befülltem herrschaft_von/herrschaft_bis (neue Spalten,
// siehe familien.csv-Änderung) wird der GESAMTE Balken zunächst in der
// Familienfarbe gezeichnet, darüber ein zweites, schmaleres Rechteck NUR
// für den Regierungsabschnitt in Gold (GOLD_FARBE, dieselbe Farbe wie die
// bisherige Kaiser/König-Kronensymbolik) gelegt - einfacher und robuster
// als eine 3-Segment-Aufteilung (vor/während/nach der Regierungszeit)
// manuell zu berechnen, das Overlay deckt exakt den relevanten Abschnitt
// ab, der Rest bleibt automatisch sichtbar. Die 19 Kaiserinnen/Königinnen
// durch Heirat haben KEINE Regierungsdaten (Nicht-Ziel, keine Herleitung)
// - bekommen stattdessen den GANZEN Balken in einer eigenen, helleren
// Gold-Variante (HEIRAT_FARBE) gefüllt ("vollständige Einfärbung ohne
// Teilbalken", Auftrag wörtlich) - bewusst EIN eigener, hellerer Ton statt
// exakt GOLD_FARBE, damit "aus eigenem Recht" (kräftiges Gold, nur
// Teilabschnitt) und "durch Heirat" (helles Gold, ganzer Balken) auch ohne
// die zusätzliche Kronen-Symbolik unterscheidbar bleiben - dieselbe
// "zwei klar unterscheidbare Kennzeichnungen"-Idee wie die frühere
// gefüllte/hohle Krone, hier auf die Flächenfarbe übertragen. Die Kronen-
// Symbolik selbst bleibt UNVERÄNDERT bestehen (Auftrag erlaubt das explizit
// - "kann hier zusätzlich am gefüllten Abschnitt sitzen") und sitzt jetzt
// am oberen Rand des jeweils gefärbten Abschnitts (Regierungsbeginn bzw.
// Balkenanfang).
//
// Entfernt gegenüber der vorherigen Fassung (bewusste Vereinfachung im
// Rahmen des "kompletten Ersatzes", nicht Teil jenes Auftrags): der
// Vier-Wege-Modus-Umschalter, die Personenauswahl (kein "Wurzelperson"-
// Konzept mehr, es gibt nur noch die eine Gesamtansicht), der Quellenbaum-
// Modus samt Brücken-Personen-Kennzeichnung und die Urkunden-Nennungszahl-
// Badges (setzten beide auf dem alten 34-Personen-Quellenbaum-Kreis auf,
// der mit dem neuen 75-Personen-Habsburg-Kreis nichts mehr zu tun hat).
// Ebenso beibehalten (unverändert): Unsicherheits-Kennzeichnung
// (gestrichelter roter Rand), lokales Detail-Popover, Zoom/Pan-Grundmuster,
// Bildschirm-zu-klein-Fallback, Info-Button.
//
// AUFTRAG "Habsburg-Zeitleistenbaum – Breite, Beschriftung, Filterleiste
// entfernen" (2026-09-11, Folgeauftrag):
//
// Punkt 1 - der im ERSTEN Zeitleisten-Auftrag noch beibehaltene
// Politische-Stellung-Umschalter (Alle/Kaiser/Könige samt Steiner-Baum-
// Verbindungspersonen-Berechnung) entfällt jetzt VOLLSTÄNDIG und
// ERSATZLOS (Begründung des Auftrags: die Teil-Einfärbung der Balken
// selbst zeigt Kaiser/König bereits, ein zusätzlicher Filter ist
// redundant) - nicht nur die Buttons, sondern auch die komplette
// dahinterliegende Berechnung (`baueVollGraph()`, die BFS-/Steiner-Baum-
// Funktionen, `opazitaetFuerPolitischeStellung()`) wurde entfernt, nicht
// nur versteckt (Auftrag verlangt das ausdrücklich, siehe grep-
// Verifikation in der Selbstauskunft) - tote Berechnung ohne sichtbaren
// Effekt wäre reine Code-Leiche gewesen.
//
// Punkt 2 - BAR_BREITE 16→36 (mehr als verdoppelt), BAR_ABSTAND_X
// 140→190 proportional mitvergrößert, damit der zusätzliche Balken-Platz
// nicht auf Kosten des Zwischenraums geht.
//
// Punkt 3 - Label-Kollisionsvermeidung (`loeseLabelKollisionen()`): nach
// dem Bau des Render-Modells werden alle Namens-Etiketten nach ihrer
// X-Position sortiert, dann paarweise auf zu geringen Y-Abstand bei
// ÜBERLAPPENDER X-Ausdehnung geprüft (nur Etiketten, deren geschätzte
// Textbreite sich tatsächlich horizontal überschneiden, können optisch
// kollidieren) - ein zu nah stehendes Etikett wird nach unten verschoben,
// bis der Mindestabstand (LABEL_MINDESTABSTAND_Y) eingehalten ist. Bei
// spürbarer Verschiebung (>1px gegenüber der ursprünglichen Balkenanfang-
// Position) zeichnet `zeichneBaum()` zusätzlich eine dünne graue
// Führungslinie vom Balkenanfang zum verschobenen Etikett (Auftrag,
// wörtlich als Option genannt).
//
// Zoom/Pan (Punkt 2, "bestehendes Zoom-Verhalten aus der Zeitachse als
// Vorbild"): UNVERÄNDERT das bereits im vorherigen Familienbaum-Auftrag
// etablierte 2D-Transform-Muster (Mausrad zoomt ohne Zusatztaste, Ziehen
// verschiebt, `zoomInhalt.attr('transform', event.transform)`) - jenes
// Muster zitierte bereits DAMALS zeitachse.js als Vorbild ("gleiches
// Verhalten: Mausrad zoomt, Ziehen verschiebt", siehe damaliger
// Dateikopf-Kommentar) und wurde dort bewusst 2D statt zeitachses reinem
// 1D-rescaleX() umgesetzt, weil ein Baum - anders als eine reine
// Zeitachse - horizontale Verschiebung zwischen Familienzweigen UND
// vertikales Zoomen entlang der Zeit gleichzeitig braucht. Exakt dasselbe
// gilt hier unverändert, nur dass die Zeitachse jetzt vertikal statt
// horizontal verläuft ("Scrollen = Zoom (vertikal entlang der
// Zeitleiste)", Auftrag wörtlich) - keine neue Herleitung nötig. Die
// linke Jahres-Achse wird bei jedem Zoom-Schritt aus der aktuellen
// Transform neu berechnet (analog zu zeitachse.js' Achsen-Neuaufbau).
//
// Punkt 3 (Info-Text) - wörtlich wie im Auftrag übernommen.
//
// AUFTRAG "Habsburg-Zeitleistenbaum – Kästchen als beschriftete Boxen, mehr
// Abstand" (2026-09-11, zweiter Folgeauftrag):
//
// Punkt 1 - Namen stehen jetzt INNERHALB des Kästchens (kein separates
// Außen-Label mehr, siehe `loeseLabelKollisionen()` aus dem vorherigen
// Folgeauftrag entfällt dadurch komplett). Kästchenbreite wird bei jedem
// render() aus den tatsächlichen Daten berechnet: `ermittleTextbreite()`
// misst jeden der 75 Kurznamen per echter Canvas-`measureText()` (nicht
// nur eine Zeichenanzahl-Heuristik, Auftrag wörtlich) bei der verwendeten
// Schriftgröße/-familie, `berechneKastenbreite()` nimmt den längsten
// gemessenen Wert + Innenabstand als EINHEITLICHE Breite für alle 75
// Kästchen. RÜCKFRAGE GEKLÄRT (Auftrag verlangte das ausdrücklich, bevor
// eigenmächtig entschieden wird): eine einheitliche Breite nach dem
// LÄNGSTEN VOLLSTÄNDIGEN Namen (bis 55 Zeichen inkl. Beinamen-Klammern,
// z.B. "Albrecht VI. (\"der Verschwenderische\"/\"der Freigebige\")") hätte
// ca. 330-375px breite Kästchen für ALLE 75 Personen bedeutet, auch für
// kurze Namen wie "Rudolf I." - als unpraktikabel zurückgemeldet, drei
// Alternativen zur Wahl gestellt. Antwort: Kurzname verwenden (wie schon
// bisher als Beschriftung gezeigt: Vorname + römische Ordnungszahl, max.
// 14 Zeichen) - Kästchen bleiben dadurch ca. 100-130px breit, der
// vollständige Name bleibt weiterhin über Tooltip/Popover erreichbar.
//
// Punkt 2 - `instanz.spaltenAbstand` (ersetzt die vorherige feste
// BAR_ABSTAND_X-Konstante) wird aus `instanz.kastenBreite` + einer festen
// Mindestlücke (ZWEIG_LUECKE) berechnet, statt umgekehrt eine feste
// Kästchenbreite an einen festen Abstand anzupassen - die Kästchenbreite
// ist jetzt die primäre, datengetriebene Größe (Punkt 1), der
// Zweig-Abstand folgt ihr. Die Gesamtvisualisierung wird dadurch bewusst
// breiter (Auftrag erlaubt das ausdrücklich, Zoom/Pan bereits vorhanden).
//
// Punkt 3 - ERSTER Ansatz (`BOX_Y_INSET` allein, siehe frühere Fassung
// dieses Kommentars) ging von "nahtlos aneinander anschließenden"
// Lebenszeiten aus (Balkenende ≈ Balkenanfang, 0px Lücke) - eigene
// Live-Verifikation nach der Umsetzung zeigte aber: d3.tree() stellt bei
// Einzelerben-Ketten (ein Kind, kein Geschwister) Elternteil UND Kind
// strukturell exakt in dieselbe Spalte (dieselbe X-Position) - das ist bei
// 20 der 75 Personen im Kreis der Fall, betrifft also die komplette
// Haupt-Erbfolgelinie (z.B. Rudolf I./Albrecht I., Friedrich III./
// Maximilian I., Karl VI./Maria Theresia/Joseph II.). Da ein Kind
// üblicherweise zu Lebzeiten des Elternteils geboren wird (nicht erst nach
// dessen Tod), ÜBERLAPPEN sich die echten Lebensspannen dieser Paare in
// aller Regel erheblich (gemessene Überlappung bis zu 281px = >56 Jahre),
// nicht nur "nahtlos anschließend" wie im Auftrag angenommen - ein reiner
// Rand-Einzug (`BOX_Y_INSET`) kann eine echte Überlappung von >100px nicht
// zu einer sichtbaren Lücke machen, beide Kästchen würden weiterhin als
// ein durchgehender Balken erscheinen. Da die Y-Achse (echte Kalenderjahre)
// nicht angetastet werden darf/soll (Kernstück dieser gesamten Ansicht,
// siehe Abschnitt weiter oben), musste der ursprünglich gewählte Verzicht
// auf jede Positionsverschiebung revidiert werden.
//
// ZWEITER SELBST GEFUNDENER FEHLER (vor der eigentlichen Lösung): ein erster
// Versuch gruppierte Personen nur nach IDENTISCHER X-Position (Spalte) und
// verteilte sie dort auf Spuren. Live-Nachverifikation zeigte zwei
// unabhängige Lücken darin: (a) `d3.tree()`s `nodeSize` garantiert NUR den
// Abstand zwischen direkten Geschwistern, nicht zwischen beliebigen Spalten
// - bei tiefen Einzelerben-Ketten liegen manche Nachbarspalten nur 45px
// auseinander, deutlich weniger als die 85px breiten Kästchen (Punkt 1),
// was zu echten Rechteck-Überlappungen zwischen völlig UNVERWANDTEN
// Personen führte, ganz ohne jede Eltern-Kind-Beziehung; (b) Ehepartner-
// Satelliten (deren X sich erst aus der fertigen Anker-Position ergibt)
// wurden von der reinen Spalten-Gruppierung gar nicht erfasst und konnten
// unabhängig davon auf einem fremden Anker landen.
//
// TATSÄCHLICHE LÖSUNG (`loeseUeberlappungGlobal()`): ein Sweep-Line-
// Verfahren über ALLE 75 Personen gemeinsam (Anker UND Satelliten, dank
// zweigeteiltem `baueRenderModell()` - Durchlauf A sammelt jede
// Ausgangsposition, Durchlauf B baut Boxen/Linien erst danach mit der
// finalen Position, siehe dortiger Kommentar) - sortiert nach Geburtsjahr,
// mit einer Liste "aktiver" bereits platzierter Kästchen, deren Zeitspanne
// (+ `SPALTEN_MIN_LUECKE` Mindestlücke) den aktuellen Knoten noch
// überlappt. Jede Person bleibt nach Möglichkeit an ihrer bevorzugten
// (Baum-/Satelliten-)Position; kollidiert diese mit einer noch aktiven
// Person (Mittenabstand < `spaltenLaneAbstand`), wird abwechselnd nach
// rechts/links um ein Vielfaches von `spaltenLaneAbstand` verschoben, bis
// eine freie Position gefunden ist. Das prüft - anders als die reine
// Spalten-Gruppierung zuvor - JEDES Paar zeitlich aktiver Kästchen
// unabhängig von ihrer ursprünglichen Spalte und löst dadurch beide oben
// genannten Fehler zugleich. Per Skript exhaustiv gegen ALLE 75×74
// Kästchen-Paare auf echte Rechteck-Überlappung verifiziert (nicht nur
// spaltenintern): siehe Selbstauskunft im Chat.
// `BOX_Y_INSET` bleibt zusätzlich als winziger kosmetischer Rand bestehen
// (schadet nicht, da `SPALTEN_MIN_LUECKE` die eigentliche Garantie liefert).

// AUFTRAG "Habsburg-Zeitleistenbaum – Größe, Zoom-Granularität,
// Verbindungs-Hervorhebung, Legende" (2026-09-11, dritter Folgeauftrag):
//
// Punkt 1 (Größe) - `PIXEL_PRO_JAHR` 5→20 (vervierfacht, "deutlich erhöht"
// wörtlich). `ermittleVerfuegbareHoehe()`/`ermittleVerfuegbareBreite()` aus
// viewportGroesse.js waren bereits vorher im Einsatz (Punkt-1-Teil "bereits
// etablierte Utility nutzen" war also schon erfüllt) - das eigentliche
// "künstliche Höhenlimit" steckte stattdessen im initialen Zoom-Fit
// (`wireZoom()`): `skala = Math.min(1, breite/baumBreite, hoehe/baumHoehe)`
// staucht bei jedem Neuaufbau die GESAMTE Baumhöhe auf die sichtbare Fläche
// zusammen - jede Erhöhung von PIXEL_PRO_JAHR wäre dadurch beim Start sofort
// wieder herausgerechnet worden (größerer Baum → proportional kleinere
// Skala → optisch UNVERÄNDERTE Größe). Der `hoehe/baumHoehe`-Faktor entfällt
// daher ersatzlos - nur noch breiten-begrenzt (verhindert weiterhin, dass
// der Baum auf einem schmalen Fenster seitlich abgeschnitten startet), die
// Höhe darf jetzt über die sichtbare Fläche hinausragen und wird wie bei
// Zeitachse/Kalender-Heatmap durch Scrollen/Zoomen erschlossen (hier: durch
// das bereits bestehende Pan/Zoom, siehe unten).
//
// Punkt 2 (Adaptive Jahres-Beschriftung) - `ermittleJahresTickSchritt()`
// nach demselben Prinzip wie zeitachse.js' `ermittleTickAnzahl()`/
// kalenderHeatmap.js' `ermittleLabelSchritt()` (Ziel-Tick-Anzahl aus
// verfügbarem Pixel-Platz ÷ Mindestabstand), hier aber bewusst als feste
// Schrittweiten-Liste (200/100/50/25/10/5/2/1 Jahre) statt d3s eigenem
// `scale.ticks(n)` - Letzteres kann bei linearen Skalen krumme
// Zwischenwerte (z.B. alle 2,5 Jahre) erzeugen, was mit `d3.format('d')`
// gerundete, teils identisch aussehende Doppel-Beschriftungen ergäbe. Die
// jeweils gröbste Schrittweite, die mit maximal `hoehe/TICK_MIN_PIXELABSTAND_Y`
// Ticks über die AKTUELL SICHTBARE Jahresspanne (aus `neueYSkala.domain()`,
// nicht der vollen Baum-Spanne) auskommt, wird bei jedem Zoom-Schritt neu
// gewählt und liefert damit automatisch Jahrhundert-Marken beim
// Herauszoomen bis hin zu einzelnen Jahren beim Hineinzoomen - dieselbe
// Grundidee wie die beiden genannten Vorbilder, nur auf eine Y-Achse und
// echtes Zoom (statt Container-Breite) angewandt. `d3.zoom()`s
// `scaleExtent` wurde von `[0.2, 4]` auf `[0.2, 24]` angehoben (reine
// Parameteränderung, keine Änderung der Zoom/Pan-MECHANIK selbst) - bei der
// alten Obergrenze 4 wäre selbst mit dem größeren PIXEL_PRO_JAHR kein
// Zoomstand erreichbar gewesen, der weniger als ca. 30 Jahre sichtbar
// macht, das Akzeptanzkriterium "einzelne Jahre ablesbar" wäre unerreichbar
// geblieben.
//
// Punkt 3 (Verbindungs-Hervorhebung) - `ermittleDirekteBeziehungen()` liest
// AUSSCHLIESSLICH `vater_id`/`mutter_id`/`ehepartner_id` der gehoverten
// Person plus `kinderIndex` (bereits bestehender Index) - bewusst NICHT
// über die d3.hierarchy-Baumstruktur (`d.parent`/`d.children`), da der Baum
// aus Layout-Gründen (Satelliten-Mechanik, Einzelerben-Ketten) nicht 1:1
// den echten Verwandtschaftsbeziehungen entspricht und Geschwister dort
// zudem gar nicht direkt erreichbar wären. Jede Eltern-Kind- bzw.
// Ehe-Verbindungslinie trägt jetzt zusätzlich die beteiligten IDs
// (`kindId`/`elternIds` bzw. `aId`/`bId`, siehe `baueRenderModell()`) -
// vorher nur x1/y1/x2/y2 ohne Personenbezug, für die Hervorhebung aber
// nötig, um genau die Linien zu finden, die die gehoverte Person direkt
// berühren. Hover setzt `instanz.hoverFokusId` (temporär), Klick zusätzlich
// `instanz.eingefrorenerFokusId` (bleibt nach Mouseleave bestehen) - der
// Klick-Handler ruft weiterhin UNVERÄNDERT auch `zeigePersonenPopover()`
// auf (Nicht-Ziel: bestehendes Popover bleibt), beides schließt sich nicht
// aus. Effektiver Fokus = `hoverFokusId ?? eingefrorenerFokusId` (Hovern
// einer ANDEREN Person während eine Auswahl eingefroren ist, zeigt
// währenddessen testweise deren Beziehungen, fällt beim Verlassen zurück
// auf die eingefrorene Auswahl statt in den Normalzustand). Klick auf freie
// Fläche (neuer `svg.on('click', ...)`-Handler, nur erreichbar wenn der
// Klick NICHT auf einer Personen-Gruppe war - dort verhindert
// `event.stopPropagation()` das Durchbubbeln) setzt `eingefrorenerFokusId`
// zurück auf `null`.
//
// Punkt 4 (Farblegende) - `baueFarblegende()` liest die tatsächlich im
// Code verwendeten Fill-Konstanten (`HABSBURG_BASIS_FARBE`,
// `GRAU_EHEPARTNERFAMILIE`, `GOLD_FARBE`, `HEIRAT_FARBE`) plus die
// Unsicherheits-Randdarstellung (`#c0392b` gestrichelt, siehe `zeichneBaum()`s
// `unsicher()`-Fall) - bewusst KEINE weiteren/erfundenen Kategorien (Auftrag
// wörtlich: "nicht eigenmächtig neue Farbkategorien erfinden"). Die vier
// Habsburg-Farbvarianten (`HABSBURG_VARIANTEN`) werden NICHT einzeln
// gelistet (Auftrag: "kompakte" Legende) - ein Eintrag mit
// `HABSBURG_BASIS_FARBE` plus erklärendem Text deckt sie zusammenfassend ab,
// da alle vier optisch nur geringfügig variierende Töne DERSELBEN Kategorie
// "Familienfarbe" sind. Kronen-Symbole (gefüllt/hohl) bleiben AUSSERHALB der
// Legende (Auftrag-Scope ist wörtlich "Farblegende"/"was die Kästchenfarben
// bedeuten", die Kronen kodieren denselben Status bereits redundant über die
// Füllfarbe mit). `js/utils/infoButton.js` bekommt dafür einen neuen,
// optionalen `zusatzInhalt`-Parameter (beliebiger DOM-Node, nach den
// Text-Absätzen angehängt) - rückwärtskompatibel (Default `undefined`,
// alle anderen bisherigen Aufrufer unverändert), da erzeugeInfoButton()
// bisher nur reinen Text kannte, eine Farblegende aber echte Swatch-Elemente
// braucht.
//
// AUFTRAG "Habsburg-Zeitleistenbaum – Klick-Popup verschiebt Ansicht,
// größere Beschriftung" (2026-09-11, vierter Folgeauftrag):
//
// Punkt 1 - konkrete Root-Cause-Analyse siehe Dateikopf-Kommentar direkt
// bei `zeigePersonenPopover()`/`popoverElement` weiter unten (Abschnitt
// "Lokales Detail-Popover") - hier nur die Kurzfassung: `getBoundingClientRect()`
// des Ankers lieferte bei langlebigen Personen ein weit über den Viewport
// hinausragendes Kästchen, das Popup wurde entsprechend weit außerhalb
// positioniert, `popover.focus()` (ohne preventScroll) scrollte die Seite
// dorthin. Zwei unabhängige Fixes: Anker-Kante auf den sichtbaren Viewport
// geklemmt UND `{ preventScroll: true }` bei jedem `.focus()`-Aufruf.
//
// Punkt 2 - `SCHRIFTGROESSE` 11→24 (mehr als verdoppelt). Keine weitere
// Logikänderung nötig: `berechneKastenbreite()` (2. Folgeauftrag) misst
// bereits mit dieser Konstante, die Kästchenbreite wächst automatisch mit.

// AUFTRAG "Kästchen-Größe, Regierungsbeginn, Namenskorrektur" (2026-09-11,
// fünfter Folgeauftrag):
//
// Punkt 1 (Größe) - `SCHRIFTGROESSE` 24→34, `PIXEL_PRO_JAHR` 20→13 als
// Gegengewicht (visuell getestet, siehe Selbstauskunft im Chat für den
// begründeten Endwert innerhalb der vorgeschlagenen Spanne 12-14) -
// `berechneKastenbreite()` misst weiterhin mit derselben, jetzt größeren
// Konstante, keine separate Anpassung nötig (identisch zur Begründung im
// 4. Folgeauftrag).
//
// Punkt 2 (HRR-König-Datum) - reine Datenkorrektur in familien.csv
// (`herrschaft_von` bei friedrich_iii/maximilian_i/karl_v, siehe dortige
// Änderungs-Historie/CHANGELOG) - `ermittleRegierungszeit()` liest
// unverändert aus `herrschaft_von`/`herrschaft_bis`, keine Code-Änderung an
// der Einfärbungslogik selbst nötig (Auftrag, wörtlich zutreffend).
//
// Punkt 3 (Namenskorrektur) - `ermittleKurzname()` siehe dortiger
// Dateikopf-Kommentar für die vollständige Herleitung/Verifikation.

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { filtereErklaerungFuerFeld } from '../utils/uncertainty.js';
import { passendeTextfarbe } from '../utils/kategorieFarben.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { ermittleVerfuegbareHoehe, ermittleVerfuegbareBreite } from '../utils/viewportGroesse.js';
import {
  istBildschirmZuKlein,
  baueBildschirmHinweis,
  fuegeBildschirmHinweisStyleEin
} from '../utils/bildschirmHinweis.js';

// Punkt 1 (4. Folgeauftrag): 20→13 (moderat verringert, siehe Dateikopf-
// Kommentar - Gegengewicht zur nochmals größeren Schrift, Kästchen wirken
// dadurch gedrungener statt extrem in die Höhe gezogen). War zuvor 5→20
// (3. Folgeauftrag).
const PIXEL_PRO_JAHR = 13;
const RAND = { oben: 30, unten: 30, links: 56, rechts: 30 };
const WARN_SYMBOL = '⚠';
const MAX_TIEFE = 25; // Sicherheitsgrenze gegen Datenfehler-Zyklen (Kreis hat 75 Personen, weit weniger Generationen).
// Punkt 2 (4. Folgeauftrag): 11→24 (mehr als verdoppelt, Auftrag wörtlich
// "mindestens verdoppeln") - ermittleTextbreite()/berechneKastenbreite()
// verwenden dieselbe Konstante zur Messung, die Kästchenbreite (Punkt 1,
// 2. Folgeauftrag, UNVERÄNDERTE Logik) wächst dadurch automatisch mit,
// keine separate Anpassung nötig.
// Punkt 1 (4. Folgeauftrag): 24→34 (nochmals deutlich vergrößert, siehe
// Dateikopf-Kommentar). War zuvor 11→24 (3. Folgeauftrag).
const SCHRIFTGROESSE = 34;
const SCHRIFTGEWICHT = 600;
const SCHRIFTFAMILIE = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"; // dieselbe --font-ui-Deklaration wie css/base.css, siehe ermittleTextbreite()
// Punkt 1 (2. Folgeauftrag): Innenabstand links+rechts zusammen - die
// Kästchenbreite selbst ist jetzt datengetrieben (berechneKastenbreite()),
// kein fester BAR_BREITE-Wert mehr.
const KASTEN_PADDING_X = 14;
// Punkt 2 (2. Folgeauftrag): fester Mindest-Leerraum zwischen zwei
// benachbarten Kästchen-Spalten, zusätzlich zur (datengetriebenen)
// Kästchenbreite selbst - siehe instanz.spaltenAbstand. Basiswert, wird in
// render() ggf. durch den Spuren-Bedarf (siehe Dateikopf-Kommentar Punkt 3)
// nach oben überschrieben.
const ZWEIG_LUECKE_BASIS = 56;
// Punkt 3 (2. Folgeauftrag): feste Einrückung oben/unten je Kästchen -
// siehe Dateikopf-Kommentar (nur noch kosmetisch, SPALTEN_MIN_LUECKE liefert
// die eigentliche Garantie).
const BOX_Y_INSET = 2;
// Punkt 3 (2. Folgeauftrag): Mindestabstand zwischen zwei Kästchen derselben
// Spur (echte Pixel, unabhängig vom zeitlichen Abstand) und seitlicher
// Zusatzabstand zwischen zwei Spuren derselben Spalte - siehe
// loeseUeberlappungGlobal() und Dateikopf-Kommentar.
const SPALTEN_MIN_LUECKE = 8;
const SPALTEN_LANE_PADDING = 10;

// Punkt 2 (3. Folgeauftrag): adaptive Jahres-Tick-Schrittweite, siehe
// Dateikopf-Kommentar und ermittleJahresTickSchritt().
const JAHRES_TICK_SCHRITTE = [200, 100, 50, 25, 10, 5, 2, 1];
const TICK_MIN_PIXELABSTAND_Y = 40;

// Punkt 3 (3. Folgeauftrag): Opazität für nicht direkt verwandte
// Kästchen/Linien bei Hover/Klick-Hervorhebung (Auftrag nennt "ca. 0,1-0,15").
const HERVORHEBUNG_DIM_OPAZITAET = 0.12;

const HABSBURG_FAMILIEN = ['habsburg', 'spanische_habsburger', 'habsburg_tirol', 'habsburg_lothringen'];

// Farbsystem - Habsburg-Basis + 3 Varianten (dieselbe Technik wie zuvor:
// d3.rgb().brighter()/.darker(), analog zu kategorieFarben.js'
// farbeFuerUnterkategorie()). Da der Personenkreis jetzt AUSSCHLIESSLICH
// aus Habsburg-Familien + deren Ehepartnern besteht, tragen die
// Ehepartner-Familien (z.B. "burgund", "luxemburg" ...) hier bewusst NUR
// noch die neutrale Grau-Farbe (nicht mehr die im vorherigen Auftrag
// aufgebauten 6 eigenen Töne) - dieser Auftrag definiert die Farbgebung
// ausdrücklich neu ("Teil-Einfärbung ... Rest des Balkens bleibt in der
// neutralen/Familienfarbe") und nennt nur Habsburg-Varianten + Neutral,
// keine weiteren Familienfarben mehr.
const HABSBURG_BASIS_FARBE = '#7a1f2e';
const HABSBURG_VARIANTEN = {
  habsburg: 0,
  spanische_habsburger: 0.8,
  habsburg_tirol: -0.5,
  habsburg_lothringen: 1.6
};
const GRAU_EHEPARTNERFAMILIE = '#9a9a9a';

// Politische Stellung - Rand/Symbol UND jetzt zusätzlich die
// Teil-/Vollbalken-Füllfarbe (siehe Dateikopf-Kommentar).
const GOLD_FARBE = '#c9a227';
const HEIRAT_FARBE = '#e8cf8a'; // helle Gold-Variante, siehe Dateikopf-Kommentar
const KRONE_PFAD = 'M-5,4 L-5,-1 L-2.5,1.5 L0,-3.5 L2.5,1.5 L5,-1 L5,4 Z';

const INFO_TEXT = `Dieser Zeitleisten-Stammbaum zeigt das Haus Habsburg von Rudolf I. bis Joseph II., einschließlich Ehepartnern und Kindern. Die Länge jedes Balkens entspricht der Lebensspanne der Person. Bei Kaisern und Königen aus eigenem Recht ist nur der Zeitraum ihrer tatsächlichen Herrschaft farblich hervorgehoben, nicht die gesamte Lebenszeit.`;

let instanz = null; // { container, wurzel, plotBereich, records, options, byId, kinderIndex, familienFarben, jahrMin, jahrMax, kastenBreite, spaltenAbstand, spaltenLaneAbstand, zoomVerhalten, zoomTransform, letzteBreite, infoButton, hoverFokusId, eingefrorenerFokusId, selektionen } – eine aktive Ansicht pro Modul-Ladung

function ehepartnerListe(record) {
  return Array.isArray(record.ehepartner_id) ? record.ehepartner_id : (record.ehepartner_id ? [record.ehepartner_id] : []);
}

function istPersonUnsicher(record) {
  return Boolean(
    record.geburtsdatum_unsicher || record.sterbedatum_unsicher
    || record.ehepartner_id_unsicher || record.vater_id_unsicher || record.mutter_id_unsicher
  );
}

// Punkt 3 (3. Folgeauftrag): direkte Familienbeziehungen (Eltern,
// Ehepartner, Kinder) EINER Person - bewusst über die echten
// Datenfelder/kinderIndex ermittelt, nicht über die d3.hierarchy-
// Baumstruktur (siehe Dateikopf-Kommentar). Geschwister sind hier bewusst
// NICHT enthalten (Auftrag, wörtlich).
function ermittleDirekteBeziehungen(person, byId, kinderIndex) {
  const ids = new Set();
  [person.vater_id, person.mutter_id].forEach((id) => { if (id && byId.has(id)) ids.add(id); });
  ehepartnerListe(person).forEach((id) => { if (byId.has(id)) ids.add(id); });
  (kinderIndex.get(person.id) || []).forEach((kind) => ids.add(kind.id));
  return ids;
}

function baueUnsicherTooltip(record) {
  const felder = ['geburtsdatum', 'sterbedatum', 'vater_id', 'mutter_id', 'ehepartner_id'];
  const feldname = felder.find((f) => record[`${f}_unsicher`]);
  if (!feldname) return '';
  return filtereErklaerungFuerFeld(record.unsicherheit_anmerkung, feldname) || 'Angabe unsicher';
}

function baueDatenIndex(records) {
  const byId = new Map(records.map((r) => [r.id, r]));
  const kinderIndex = new Map();
  records.forEach((r) => {
    [r.vater_id, r.mutter_id].forEach((elternId) => {
      if (!elternId || !byId.has(elternId)) return;
      if (!kinderIndex.has(elternId)) kinderIndex.set(elternId, []);
      kinderIndex.get(elternId).push(r);
    });
  });
  return { byId, kinderIndex };
}

// --- Personenkreis (Vorab-Datenarbeit, siehe Dateikopf-Kommentar) --------

// Habsburg-Kernfamilien PLUS alle über ehepartner_id verknüpften Personen,
// die nicht bereits im Kern sind - live aus den geladenen Daten ermittelt,
// nicht hartcodiert (siehe Dateikopf-Kommentar).
function ermittleHabsburgKreis(records) {
  const byId = new Map(records.map((r) => [r.id, r]));
  const kern = new Set(records.filter((r) => HABSBURG_FAMILIEN.includes(r.familie)).map((r) => r.id));
  const zusaetzlich = new Set();
  kern.forEach((id) => {
    ehepartnerListe(byId.get(id)).forEach((eid) => {
      if (!kern.has(eid) && byId.has(eid)) zusaetzlich.add(eid);
    });
  });
  return { kreisIds: new Set([...kern, ...zusaetzlich]), zusaetzlicheEhepartnerIds: zusaetzlich };
}

// --- Farben ---------------------------------------------------------------

function berechneFamilienFarben() {
  const farben = new Map();
  Object.entries(HABSBURG_VARIANTEN).forEach(([familie, faktor]) => {
    const basis = d3.rgb(HABSBURG_BASIS_FARBE);
    const farbe = (faktor >= 0 ? basis.brighter(faktor) : basis.darker(-faktor)).formatHex();
    farben.set(familie, farbe);
  });
  return farben;
}

function farbeFuerFamilie(familie) {
  return instanz.familienFarben.get(familie) || GRAU_EHEPARTNERFAMILIE;
}

// --- Kästchenbreite (Punkt 1, 2. Folgeauftrag) ----------------------------

// Punkt 3 (4. Folgeauftrag): Präpositionen, die den Beginn des Herkunfts-/
// Familiennamen-Teils markieren (z.B. "Eleonore Magdalene VON
// Pfalz-Neuburg") - siehe ermittleKurzname().
const NAMENS_PRAEPOSITIONEN = new Set(['von', 'zu', 'de', 'van', 'af', 'aus', 'della', 'di']);

// Punkt 3 (4. Folgeauftrag): der einzige im gesamten Datensatz tatsächlich
// vorkommende Doppel-Vorname OHNE nachfolgende Präposition (grep-geprüft
// gegen alle 80 name-Werte, siehe Selbstauskunft im Chat) - für den echten
// String-Vergleich gegen `name` reicht daher diese kleine, explizite Liste,
// statt ein generisches "zwei Wörter ohne Präposition = Doppelname"-Muster
// zu raten (das hätte z.B. "Viridis Visconti" oder "Bianca Maria Sforza"
// fälschlich als Doppel-Vorname samt Nachname eingeschlossen - dort ist das
// zweite Wort ein bloßer Familienname, keine Präposition grenzt ihn ab).
const BEKANNTE_DOPPELVORNAMEN_OHNE_PRAEPOSITION = new Set(['Maria Theresia']);

// Punkt 3 (4. Folgeauftrag): Ist-Zustand war ein reiner "erstes Wort"-
// Kurzname (außer bei folgender römischer Ordnungszahl) - das schnitt bei
// echten Doppel-Vornamen (z.B. "Maria Theresia", "Eleonore Magdalene von
// Pfalz-Neuburg") fälschlich das zweite Namenswort ab, KEINE der bisherigen
// Titel-/Präfix-Entfernungsregeln aus personenliste.js war hier beteiligt
// (diese Funktion kannte nur "erstes Wort" + römische-Zahl-Sonderfall).
// Neu: das zweite Wort gehört zum Vornamen, wenn eindeutig erkennbar -
// entweder folgt direkt danach eine Präposition (das dritte Wort markiert
// dann den Beginn des Herkunfts-/Familiennamen-Teils) ODER der Name ist
// einer der wenigen bekannten Doppelvornamen ohne jeden nachfolgenden Teil
// (s.o.). Live gegen alle 80 `name`-Werte im Datensatz verifiziert: 12
// korrigiert (u.a. "Maria Theresia", "Eleonore Magdalene", "Elisabeth
// Christine"), 0 falsch-positive (Klammer-Zusätze wie "Gertrud (Anna) von
// Hohenberg" und bloße Nachnamen wie "Viridis Visconti" bleiben
// unverändert) - siehe Selbstauskunft im Chat für die vollständige Liste.
function ermittleKurzname(name) {
  const voller = name || '';
  const tokens = voller.split(' ');
  if (tokens.length > 1 && /^[IVXLCDM]+\.?$/.test(tokens[1])) return `${tokens[0]} ${tokens[1]}`;
  if (BEKANNTE_DOPPELVORNAMEN_OHNE_PRAEPOSITION.has(voller)) return voller;
  if (tokens.length > 2) {
    const zweitesWort = tokens[1];
    const istSelbstPraeposition = NAMENS_PRAEPOSITIONEN.has(zweitesWort.toLowerCase());
    const istKlammerZusatz = zweitesWort.startsWith('(');
    const drittesIstPraeposition = NAMENS_PRAEPOSITIONEN.has(tokens[2].toLowerCase());
    if (!istSelbstPraeposition && !istKlammerZusatz && drittesIstPraeposition) {
      return `${tokens[0]} ${zweitesWort}`;
    }
  }
  return tokens[0] || voller;
}

// Echte Textbreiten-Messung per Canvas-measureText() (Auftrag, wörtlich -
// keine Zeichenanzahl-Heuristik) - derselbe Canvas-2D-Context wird
// wiederverwendet (memoisiert), da measureText() selbst keinen Zustand
// zwischen Aufrufen hält und ein Canvas-Element nicht bei jeder Messung
// neu erzeugt werden muss.
let textbreiteKontext = null;
function ermittleTextbreite(text) {
  if (!textbreiteKontext) textbreiteKontext = document.createElement('canvas').getContext('2d');
  textbreiteKontext.font = `${SCHRIFTGEWICHT} ${SCHRIFTGROESSE}px ${SCHRIFTFAMILIE}`;
  return textbreiteKontext.measureText(text).width;
}

// Einheitliche Kästchenbreite = längster gemessener Kurzname + Innenabstand
// (Punkt 1) - aus den tatsächlichen 75 Personen berechnet, nicht
// hartcodiert (Abschnitt 2 "content-driven", dieselbe Konvention wie
// ermittleHabsburgKreis()/ermittleJahresSpanne()).
function berechneKastenbreite(records) {
  const breiten = records.map((r) => ermittleTextbreite(ermittleKurzname(r.name)));
  const maxBreite = Math.max(...breiten, 0);
  return Math.ceil(maxBreite) + KASTEN_PADDING_X;
}

// --- Jahres-Y-Achse ---------------------------------------------------

function ermittleJahr(datumText) {
  const treffer = (datumText || '').match(/\d{3,4}/);
  return treffer ? Number(treffer[0]) : null;
}

// Domain aus dem tatsächlichen Kreis berechnet (siehe Dateikopf-Kommentar) -
// ergibt bei den aktuellen Daten exakt 1218-1790.
function ermittleJahresSpanne(records) {
  let min = Infinity;
  let max = -Infinity;
  records.forEach((r) => {
    const g = ermittleJahr(r.geburtsdatum);
    const t = ermittleJahr(r.sterbedatum);
    if (g !== null && g < min) min = g;
    if (t !== null && t > max) max = t;
  });
  return { jahrMin: Number.isFinite(min) ? min : 1200, jahrMax: Number.isFinite(max) ? max : 1800 };
}

function jahrZuY(jahr) {
  return (jahr - instanz.jahrMin) * PIXEL_PRO_JAHR;
}

// --- Geschwister-Reihenfolge (unverändert aus dem vorherigen Auftrag:
// Ehe-Gruppe zuerst, dann Geburtsjahr) -------------------------------------

function andererElternteilVon(kindPerson, elternPerson) {
  if (kindPerson.vater_id === elternPerson.id) return kindPerson.mutter_id || null;
  if (kindPerson.mutter_id === elternPerson.id) return kindPerson.vater_id || null;
  return null;
}

function vergleicheKinderReihenfolge(kindA, kindB, elternPerson) {
  const ehepartnerReihenfolge = ehepartnerListe(elternPerson);
  const gruppeA = ehepartnerReihenfolge.indexOf(andererElternteilVon(kindA, elternPerson) || '');
  const gruppeB = ehepartnerReihenfolge.indexOf(andererElternteilVon(kindB, elternPerson) || '');
  if (gruppeA !== gruppeB) return gruppeA - gruppeB;
  const jahrA = ermittleJahr(kindA.geburtsdatum);
  const jahrB = ermittleJahr(kindB.geburtsdatum);
  if (jahrA === null) return jahrB === null ? 0 : 1;
  if (jahrB === null) return -1;
  return jahrA - jahrB;
}

// --- Baumaufbau (auf den bereits auf den Habsburg-Kreis gefilterten
// byId/kinderIndex bezogen - siehe Dateikopf-Kommentar, kein separates
// "sichtbareIds" mehr nötig). ----------------------------------------------

function baueWurzeln(byId, kinderIndex) {
  function hatEigeneEltern(r) {
    return Boolean((r.vater_id && byId.has(r.vater_id)) || (r.mutter_id && byId.has(r.mutter_id)));
  }
  function zaehleNachkommen(id, gezaehlt) {
    (kinderIndex.get(id) || []).forEach((k) => {
      if (gezaehlt.has(k.id)) return;
      gezaehlt.add(k.id);
      zaehleNachkommen(k.id, gezaehlt);
    });
    return gezaehlt.size;
  }
  function baueKnoten(id, besucht, tiefe) {
    if (besucht.has(id) || tiefe > MAX_TIEFE) return null;
    const person = byId.get(id);
    if (!person) return null;
    besucht.add(id);
    const kinder = (kinderIndex.get(id) || [])
      .map((k) => baueKnoten(k.id, besucht, tiefe + 1))
      .filter(Boolean)
      .sort((ka, kb) => vergleicheKinderReihenfolge(ka.person, kb.person, person));
    return { id, person, children: kinder.length ? kinder : undefined };
  }

  const kandidaten = [...byId.values()]
    .filter((r) => {
      if (hatEigeneEltern(r)) return false;
      return !ehepartnerListe(r).some((eid) => byId.has(eid) && hatEigeneEltern(byId.get(eid) || {}));
    })
    .sort((a, b) => zaehleNachkommen(b.id, new Set()) - zaehleNachkommen(a.id, new Set()));

  const besucht = new Set();
  const alsEhepartnerVergeben = new Set();
  const wurzelKnoten = [];
  kandidaten.forEach((r) => {
    if (besucht.has(r.id) || alsEhepartnerVergeben.has(r.id)) return;
    const knoten = baueKnoten(r.id, besucht, 0);
    if (!knoten) return;
    wurzelKnoten.push(knoten);
    ehepartnerListe(r).forEach((eid) => { if (byId.has(eid)) alsEhepartnerVergeben.add(eid); });
  });
  return wurzelKnoten;
}

// --- Layout: d3.tree() liefert weiterhin nur die X-Position (siehe
// Dateikopf-Kommentar) - Y kommt vollständig aus der Jahres-Skala. --------

function baueForstLayout(wurzelKnotenListe) {
  const root = d3.hierarchy({ id: '__forst__', person: null, children: wurzelKnotenListe });
  d3.tree().nodeSize([instanz.spaltenAbstand, 1])(root);
  root.each((d) => { d.data.x = d.x; });
  return root.children || [];
}

// Verschiebt Personen so weit seitlich von ihrer bevorzugten (aus dem
// d3.tree()-Layout bzw. der Ehepartner-Satelliten-Regel stammenden)
// X-Position, bis sich keine zwei GLEICHZEITIG (echte Lebenszeit,
// yTop/yBottom) aktiven Kästchen mehr näher als instanz.spaltenLaneAbstand
// kommen - klassisches Sweep-Line-Verfahren (sortiert nach yTop, eine Liste
// "aktiver" bereits platzierter Kästchen, deren Zeitspanne den aktuellen
// Knoten noch überlappt).
//
// WARUM nicht (wie in einer früheren Fassung) nur Personen mit IDENTISCHER
// X-Gruppieren und dort Spuren verteilen: Live-Nachverifikation zeigte, dass
// d3.tree()s `nodeSize` NUR den Abstand zwischen direkten Geschwistern
// garantiert, nicht zwischen beliebigen Spalten - bei tiefen
// Einzelerben-Ketten (ein Kind ohne Geschwister übernimmt die X-Position
// des Elternteils, ein Elternteil ohne Geschwister wiederum die des
// GROSSELTERNTEILS usw.) liegen manche Nachbarspalten nur 45px auseinander,
// deutlich weniger als die 85px breite Kästchen (Punkt 1) - das führte zu
// echten Rechteck-Überlappungen zwischen VÖLLIG UNVERWANDTEN Personen, auch
// ganz ohne die in Punkt 3 behandelte Eltern-Kind-Überlappung. Ein reiner
// Gleiche-Spalte-Ausgleich (vorherige Fassung dieser Funktion) übersah das
// strukturell, weil er nur exakt gleiche X-Werte gruppierte. Diese
// Sweep-Line-Fassung prüft dagegen JEDES Paar zeitlich aktiver Kästchen,
// unabhängig von ihrer ursprünglichen Spalte, und garantiert dadurch
// zusätzlich, dass auch Punkt 2 ("kein Berühren/Überlappen" zwischen
// Familienzweigen) für ALLE 75×74 Paare eingehalten wird, nicht nur für die
// in Punkt 3 gemeinte Eltern-Kind-Situation. Per Skript exhaustiv gegen alle
// Paare verifiziert (siehe Selbstauskunft im Chat).
function loeseUeberlappungGlobal(positionVonId) {
  const mindestAbstand = instanz.spaltenLaneAbstand; // Mittenabstand, der Rechteck-Überlappung ausschließt (kastenBreite + Puffer)

  const eintraege = [...positionVonId.entries()]
    .map(([id, pos]) => ({ id, prefX: pos.x, yTop: pos.yTop, yBottom: pos.yBottom }))
    .sort((a, b) => a.yTop - b.yTop);

  const finaleX = new Map();
  const aktiv = []; // { x, yBottom } - bereits platzierte Kästchen, deren Zeitspanne (+ Mindestlücke) noch nicht abgelaufen ist

  eintraege.forEach((eintrag) => {
    for (let i = aktiv.length - 1; i >= 0; i -= 1) {
      if (aktiv[i].yBottom + SPALTEN_MIN_LUECKE <= eintrag.yTop) aktiv.splice(i, 1);
    }

    let x = eintrag.prefX;
    let versuch = 0;
    while (aktiv.some((a) => Math.abs(a.x - x) < mindestAbstand)) {
      versuch += 1;
      const richtung = versuch % 2 === 1 ? 1 : -1;
      const schritt = Math.ceil(versuch / 2);
      x = eintrag.prefX + richtung * schritt * mindestAbstand;
    }

    finaleX.set(eintrag.id, x);
    aktiv.push({ x, yBottom: eintrag.yBottom });
  });

  return finaleX;
}

// Mitte der zeitlichen Überlappung zweier Balken (siehe Dateikopf-
// Kommentar "Ehepaar-Anker") - Fallback: Mitte des ersten Balkens, falls
// keine Überlappung besteht (z.B. bei einer Datenlücke).
function ermittleVerbindungsY(barA, barB) {
  const overlapStart = Math.max(barA.yTop, barB.yTop);
  const overlapEnde = Math.min(barA.yBottom, barB.yBottom);
  if (overlapStart <= overlapEnde) return (overlapStart + overlapEnde) / 2;
  return (barA.yTop + barA.yBottom) / 2;
}

function berechneJahresBereich(person) {
  const geburtsjahr = ermittleJahr(person.geburtsdatum);
  const sterbejahr = ermittleJahr(person.sterbedatum);
  const yTop = jahrZuY(geburtsjahr ?? instanz.jahrMin);
  const yBottom = jahrZuY(sterbejahr ?? geburtsjahr ?? instanz.jahrMax);
  return { yTop: Math.min(yTop, yBottom), yBottom: Math.max(yTop, yBottom) };
}

function baueBalken(id, person, x) {
  return { id, person, x, ...berechneJahresBereich(person) };
}

// Baut aus einer gelayouteten d3.hierarchy-Wurzel das flache Render-Modell -
// dieselbe Ehepartner-Satelliten-Mechanik wie in den vorherigen Aufträgen
// (Zwei-Durchlauf-Duplikatvermeidung, individueller Kind-Linien-
// Startpunkt), jetzt auf Balken (yTop/yBottom) statt Einzelpunkte bezogen.
//
// Zwei Durchläufe über den Baum, nicht einer (Punkt 3, 2. Folgeauftrag):
// Durchlauf A ermittelt für JEDEN Knoten - Anker UND Ehepartner-Satelliten -
// die anfängliche Position, Durchlauf B baut Boxen UND Verbindungslinien
// erst NACH der globalen Überlappungsauflösung (loeseUeberlappungGlobal,
// dazwischen), damit Linien-Endpunkte garantiert dieselbe (ggf. verschobene)
// X-Position verwenden wie die gezeichneten Boxen.
function baueRenderModell(wurzeln, byId) {
  const ankerIds = new Set();
  wurzeln.forEach((wurzelKnoten) => wurzelKnoten.each((d) => ankerIds.add(d.data.id)));

  // --- Durchlauf A: anfängliche Position jedes Knotens sammeln ---------
  const anfangsPosition = new Map(); // id -> {x, yTop, yBottom}
  const bereitsGezaehltA = new Set();
  wurzeln.forEach((wurzelKnoten) => {
    wurzelKnoten.each((d) => {
      const { id, person, x } = d.data;
      if (!anfangsPosition.has(id)) anfangsPosition.set(id, { x, ...berechneJahresBereich(person) });

      let i = 0;
      ehepartnerListe(person).forEach((ehepartnerId) => {
        if (!byId.has(ehepartnerId) || ankerIds.has(ehepartnerId)) return;
        if (bereitsGezaehltA.has(`${id}|${ehepartnerId}`)) return;
        bereitsGezaehltA.add(`${id}|${ehepartnerId}`);
        bereitsGezaehltA.add(`${ehepartnerId}|${id}`);
        i += 1;
        const satX = x + i * instanz.spaltenAbstand;
        if (!anfangsPosition.has(ehepartnerId)) {
          anfangsPosition.set(ehepartnerId, { x: satX, ...berechneJahresBereich(byId.get(ehepartnerId)) });
        }
      });
    });
  });

  const finaleX = loeseUeberlappungGlobal(anfangsPosition);

  // --- Durchlauf B: Boxen + Linien mit der finalen X-Position bauen ----
  const knoten = [];
  const eheLinien = [];
  const elternKindLinien = [];
  const satellitPositionVon = new Map(); // "ankerId|ehepartnerId" -> {x, y}
  const bereitsAlsSatellitGezeigt = new Set();
  const balkenVonId = new Map();

  function fuegeKnotenEin(id, person, istSatellit) {
    const balken = baueBalken(id, person, finaleX.get(id));
    balkenVonId.set(id, balken);
    knoten.push({ ...balken, istSatellit });
    return balken;
  }

  wurzeln.forEach((wurzelKnoten) => {
    wurzelKnoten.each((d) => {
      const { id, person } = d.data;
      const ankerBar = fuegeKnotenEin(id, person, false);
      const x = ankerBar.x;

      let i = 0;
      ehepartnerListe(person).forEach((ehepartnerId) => {
        if (!byId.has(ehepartnerId)) return;
        if (ankerIds.has(ehepartnerId)) return; // hat einen eigenen Anker-Platz, kein Satellit nötig
        if (bereitsAlsSatellitGezeigt.has(`${id}|${ehepartnerId}`)) return;
        bereitsAlsSatellitGezeigt.add(`${id}|${ehepartnerId}`);
        bereitsAlsSatellitGezeigt.add(`${ehepartnerId}|${id}`);

        i += 1;
        const satBar = fuegeKnotenEin(ehepartnerId, byId.get(ehepartnerId), true);
        const satX = satBar.x;
        const verbindungsY = ermittleVerbindungsY(ankerBar, satBar);
        eheLinien.push({ x1: x, y1: verbindungsY, x2: satX, y2: verbindungsY, aId: id, bId: ehepartnerId });
        satellitPositionVon.set(`${id}|${ehepartnerId}`, { x: (x + satX) / 2, y: verbindungsY });
        satellitPositionVon.set(`${ehepartnerId}|${id}`, { x: (x + satX) / 2, y: verbindungsY });
      });

      if (d.parent && d.parent.data.person) {
        const elternPerson = d.parent.data.person;
        const kindPerson = person;
        const andererElternteil = kindPerson.vater_id === elternPerson.id
          ? kindPerson.mutter_id
          : (kindPerson.mutter_id === elternPerson.id ? kindPerson.vater_id : null);
        const paarMitte = andererElternteil ? satellitPositionVon.get(`${elternPerson.id}|${andererElternteil}`) : null;
        const elternBar = balkenVonId.get(d.parent.data.id);
        const start = paarMitte || { x: finaleX.get(d.parent.data.id), y: elternBar ? (elternBar.yTop + elternBar.yBottom) / 2 : 0 };
        // Punkt 3 (3. Folgeauftrag): elternIds trägt IMMER beide echten
        // Eltern-IDs (vater_id/mutter_id), unabhängig davon, welcher
        // Elternteil strukturell der Baum-Anker ist (siehe Dateikopf-
        // Kommentar) - für die Hover-Hervorhebung zählt die echte
        // Verwandtschaft, nicht die Baum-Struktur.
        const elternIds = [kindPerson.vater_id, kindPerson.mutter_id].filter((eid) => eid && byId.has(eid));
        elternKindLinien.push({ x1: start.x, y1: start.y, x2: x, y2: ankerBar.yTop, kindId: id, elternIds });
      }
    });
  });

  // Nachtrag: Paare, bei denen BEIDE Seiten einen eigenen Anker-Platz haben
  // (z.B. eine verwandtschaftliche Doppelverbindung) - direkte Linie
  // zwischen den beiden Anker-Positionen (Verbindungs-Y wie bei Satelliten).
  const bereitsAlsAnkerPaarGezeigt = new Set();
  knoten.forEach((k) => {
    if (k.istSatellit) return;
    ehepartnerListe(k.person).forEach((ehepartnerId) => {
      if (!ankerIds.has(ehepartnerId) || ehepartnerId === k.id) return;
      const paarSchluessel = [k.id, ehepartnerId].sort().join('|||');
      if (bereitsAlsAnkerPaarGezeigt.has(paarSchluessel)) return;
      bereitsAlsAnkerPaarGezeigt.add(paarSchluessel);
      const partnerBar = balkenVonId.get(ehepartnerId);
      if (partnerBar) {
        const verbindungsY = ermittleVerbindungsY(k, partnerBar);
        eheLinien.push({ x1: k.x, y1: verbindungsY, x2: partnerBar.x, y2: verbindungsY, aId: k.id, bId: ehepartnerId });
      }
    });
  });

  return { knoten, eheLinien, elternKindLinien };
}

// --- Zeichnen -------------------------------------------------------------

// Hat diese Person eine befüllte Regierungszeit (die 17 Kaiser/Könige aus
// eigenem Recht, siehe familien.csv-Erweiterung)?
function ermittleRegierungszeit(person) {
  if (!person.herrschaft_von || !person.herrschaft_bis) return null;
  const von = Number(person.herrschaft_von);
  const bis = Number(person.herrschaft_bis);
  if (!Number.isFinite(von) || !Number.isFinite(bis)) return null;
  return { yTop: jahrZuY(von), yBottom: jahrZuY(bis) };
}

function zeichneBaum(svg, modell, container, zeigeUnsicherheit) {
  const zoomInhalt = svg.append('g').attr('class', 'familienbaum-zoom-inhalt');

  const elternKindLinienSel = zoomInhalt.append('g').attr('class', 'familienbaum-eltern-kind-linien')
    .selectAll('line').data(modell.elternKindLinien).join('line')
    .attr('x1', (d) => d.x1).attr('y1', (d) => d.y1)
    .attr('x2', (d) => d.x2).attr('y2', (d) => d.y2)
    .attr('stroke', '#999').attr('stroke-width', 1.5);

  const eheLinienSel = zoomInhalt.append('g').attr('class', 'familienbaum-ehe-linien')
    .selectAll('line').data(modell.eheLinien).join('line')
    .attr('x1', (d) => d.x1).attr('y1', (d) => d.y1)
    .attr('x2', (d) => d.x2).attr('y2', (d) => d.y2)
    .attr('stroke', '#c98a2c').attr('stroke-width', 2).attr('stroke-dasharray', '6,2');

  const knotenGruppen = zoomInhalt.append('g').attr('class', 'familienbaum-knoten')
    .selectAll('g.familienbaum-person').data(modell.knoten, (d) => d.id).join('g')
    .attr('class', 'familienbaum-person')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => `${d.person.name}, Details anzeigen`)
    .attr('transform', (d) => `translate(${d.x},0)`);

  const unsicher = (d) => zeigeUnsicherheit && istPersonUnsicher(d.person);
  const istEigenesRecht = (d) => ['kaiser', 'koenig'].includes(d.person.hrr_status);
  const istDurchHeirat = (d) => ['kaiserin_heirat', 'koenigin_heirat'].includes(d.person.hrr_status);
  const kastenBreite = instanz.kastenBreite;

  // Punkt 3 (2. Folgeauftrag): feste Einrückung oben/unten (BOX_Y_INSET) -
  // siehe Dateikopf-Kommentar. Bodenfall (Math.max(...,2)) verhindert eine
  // unsichtbare/negative Höhe bei extrem kurzen Lebensspannen.
  const boxYTop = (d) => d.yTop + BOX_Y_INSET;
  const boxHoehe = (d) => Math.max((d.yBottom - d.yTop) - BOX_Y_INSET * 2, 2);

  // Basis-Kästchen: ganze Lebensspanne (abzüglich der festen Einrückung),
  // Familienfarbe - bzw. bei "durch Heirat"-Status die volle Kästchen-
  // fläche bereits in HEIRAT_FARBE (siehe Dateikopf-Kommentar
  // "Teil-Einfärbung").
  knotenGruppen.append('rect')
    .attr('class', 'familienbaum-balken')
    .attr('x', -kastenBreite / 2).attr('y', boxYTop)
    .attr('width', kastenBreite).attr('height', boxHoehe)
    .attr('rx', 3)
    .attr('fill', (d) => (istDurchHeirat(d) ? HEIRAT_FARBE : farbeFuerFamilie(d.person.familie)))
    .attr('stroke', (d) => (unsicher(d) ? '#c0392b' : '#ffffff'))
    .attr('stroke-width', (d) => (unsicher(d) ? 2 : 1))
    .attr('stroke-dasharray', (d) => (unsicher(d) ? '4,3' : null));

  // Regierungs-Overlay: nur für die 17 Personen mit herrschaft_von/bis -
  // deckt ausschließlich den Regierungsabschnitt in Gold ab (siehe
  // Dateikopf-Kommentar). An die Einrückung des Basis-Kästchens geklemmt
  // (Math.max/min), damit das Overlay nie über dessen sichtbaren Rand
  // hinausragt, selbst wenn herrschaft_von/bis exakt mit Geburt/Tod
  // zusammenfällt.
  knotenGruppen.filter((d) => ermittleRegierungszeit(d.person))
    .append('rect')
    .attr('class', 'familienbaum-regierung')
    .attr('x', -kastenBreite / 2)
    .attr('y', (d) => Math.max(ermittleRegierungszeit(d.person).yTop, boxYTop(d)))
    .attr('width', kastenBreite)
    .attr('height', (d) => {
      const r = ermittleRegierungszeit(d.person);
      const yEnde = Math.min(r.yBottom, d.yBottom - BOX_Y_INSET);
      const yStart = Math.max(r.yTop, boxYTop(d));
      return Math.max(yEnde - yStart, 2);
    })
    .attr('fill', GOLD_FARBE)
    .attr('pointer-events', 'none');

  knotenGruppen.filter((d) => unsicher(d)).append('text')
    .attr('class', 'familienbaum-warn-icon')
    .attr('x', kastenBreite / 2 - 10).attr('y', (d) => boxYTop(d) + 11)
    .attr('font-size', 11)
    .text(WARN_SYMBOL);

  // Kronen-Symbol - gefüllt für "aus eigenem Recht" (am Beginn des
  // Regierungsabschnitts), hohl für "durch Heirat" (am Kästchenanfang) -
  // permanent sichtbar. Sitzt knapp OBERHALB des Kästchens (floats wie
  // eine Krone "auf dem Kopf"), statt den jetzt zentrierten Namenstext zu
  // überlagern.
  knotenGruppen.filter(istEigenesRecht)
    .append('path').attr('class', 'familienbaum-krone')
    .attr('transform', (d) => `translate(0,${(ermittleRegierungszeit(d.person)?.yTop ?? d.yTop) - 3})`)
    .attr('d', KRONE_PFAD).attr('fill', GOLD_FARBE);
  knotenGruppen.filter(istDurchHeirat)
    .append('path').attr('class', 'familienbaum-krone-hohl')
    .attr('transform', (d) => `translate(0,${d.yTop - 3})`)
    .attr('d', KRONE_PFAD).attr('fill', 'none').attr('stroke', '#8a6d1a').attr('stroke-width', 1.2);

  // Punkt 1 (2. Folgeauftrag): Name zentriert INNERHALB des Kästchens -
  // kein separates Außen-Label mehr, keine Kürzung nötig, da
  // instanz.kastenBreite bereits so berechnet ist, dass der längste
  // Kurzname vollständig hineinpasst (siehe berechneKastenbreite()).
  knotenGruppen.append('text')
    .attr('class', 'familienbaum-name')
    .attr('x', 0).attr('y', (d) => (boxYTop(d) + boxHoehe(d) / 2))
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('font-size', SCHRIFTGROESSE)
    .attr('font-weight', SCHRIFTGEWICHT)
    .attr('fill', (d) => passendeTextfarbe(istDurchHeirat(d) ? HEIRAT_FARBE : farbeFuerFamilie(d.person.familie)))
    .text((d) => ermittleKurzname(d.person.name));

  // Punkt 3 (3. Folgeauftrag): Referenzen auf die drei Selektionen, die
  // aktualisiereHervorhebung() bei Hover/Klick per .style('opacity', ...)
  // aktualisiert, OHNE einen kompletten Neuaufbau auszulösen - siehe
  // Dateikopf-Kommentar.
  instanz.selektionen = { knoten: knotenGruppen, elternKindLinien: elternKindLinienSel, eheLinien: eheLinienSel };

  knotenGruppen
    .on('mouseenter focus', function (event, d) {
      const lebensdaten = [d.person.geburtsdatum, d.person.sterbedatum].filter(Boolean).join(' – ');
      const zeilen = [d.person.name, d.person.titel || d.person.familie, lebensdaten];
      if (unsicher(d)) zeilen.push(baueUnsicherTooltip(d.person));
      zeigeTooltip(zeilen.filter(Boolean).join('\n'), this, container);
      instanz.hoverFokusId = d.id;
      aktualisiereHervorhebung();
    })
    .on('mouseleave blur', () => {
      versteckeTooltip();
      instanz.hoverFokusId = null;
      aktualisiereHervorhebung();
    })
    .on('click', function (event, d) {
      // Punkt 3: verhindert, dass derselbe Klick zusätzlich den
      // Leerflächen-Handler auf dem svg-Element auslöst (siehe
      // zeichneFamilienbaum()) - der würde die gerade gesetzte
      // eingefrorenerFokusId sonst im selben Klick wieder löschen.
      event.stopPropagation();
      versteckeTooltip();
      instanz.eingefrorenerFokusId = d.id;
      aktualisiereHervorhebung();
      zeigePersonenPopover(d.person, this);
    })
    .on('keydown', function (event, d) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        versteckeTooltip();
        instanz.eingefrorenerFokusId = d.id;
        aktualisiereHervorhebung();
        zeigePersonenPopover(d.person, this);
      }
    });

  aktualisiereHervorhebung();

  return zoomInhalt;
}

// Punkt 3 (3. Folgeauftrag): effektiver Fokus = temporärer Hover, sonst die
// eingefrorene (per Klick gesetzte) Auswahl, sonst kein Fokus (Normalzustand)
// - siehe Dateikopf-Kommentar. Setzt/entfernt nur .style('opacity', ...),
// baut nichts neu auf.
function aktualisiereHervorhebung() {
  const sel = instanz?.selektionen;
  if (!sel) return;
  const fokusId = instanz.hoverFokusId || instanz.eingefrorenerFokusId || null;

  if (!fokusId) {
    sel.knoten.style('opacity', null);
    sel.elternKindLinien.style('opacity', null);
    sel.eheLinien.style('opacity', null);
    return;
  }

  const person = instanz.byId.get(fokusId);
  const beziehungsIds = person ? ermittleDirekteBeziehungen(person, instanz.byId, instanz.kinderIndex) : new Set();

  sel.knoten.style('opacity', (d) => (d.id === fokusId || beziehungsIds.has(d.id) ? 1 : HERVORHEBUNG_DIM_OPAZITAET));
  sel.elternKindLinien.style('opacity', (d) => (
    d.kindId === fokusId || d.elternIds.includes(fokusId) ? 1 : HERVORHEBUNG_DIM_OPAZITAET
  ));
  sel.eheLinien.style('opacity', (d) => (
    d.aId === fokusId || d.bId === fokusId ? 1 : HERVORHEBUNG_DIM_OPAZITAET
  ));
}

// --- Lokales Detail-Popover -------------------------------------------
// AUFTRAG "Habsburg-Zeitleistenbaum – Klick-Popup verschiebt Ansicht,
// größere Beschriftung" (2026-09-11, vierter Folgeauftrag), Punkt 1 -
// KONKRETE URSACHE (per Live-Messung identifiziert, nicht nur vermutet):
// `ankerElement` ist die komplette Personen-`<g>`, deren
// `getBoundingClientRect()` die Bounding-Box des GESAMTEN Lebensspanne-
// Kästchens liefert - NICHT nur die tatsächlich angeklickte Stelle. Seit
// dem vorigen Folgeauftrag (PIXEL_PRO_JAHR 5→20 plus Wegfall des Auto-Fit-
// auf Viewport-Höhe, siehe dortiger Dateikopf-Kommentar) können einzelne
// Kästchen weit höher als der Viewport sein (per Test: Rudolf I., 73 Lebens-
// jahre, ergab bei Zoom-Skala 0,61 ein 892px hohes Kästchen auf einer
// 705px hohen Ansicht) - `rect.bottom` lag dadurch bei y≈1126, WEIT
// UNTERHALB des sichtbaren Bereichs. `popover.style.top` wurde exakt an
// dieser Stelle gesetzt (weit außerhalb der Seite zu dem Zeitpunkt), und
// das anschließende `popover.focus()` (ohne `{ preventScroll: true }`)
// löste GENAU DESHALB Browser-Standardverhalten aus: es scrollte die ganze
// Seite (nicht nur den Baum) so weit nach unten, bis das neu eingefügte,
// fokussierte Popover sichtbar wurde (per Test: window.scrollY 0→540,
// document.documentElement.scrollHeight 972→1490) - exakt der im Auftrag
// beschriebene "nur noch schmaler Streifen sichtbar"-Sprung. ZWEI
// zusammenwirkende Ursachen, nicht eine: (a) die Anker-Position wurde ohne
// Rücksicht auf den tatsächlich sichtbaren Ausschnitt aus der vollen
// Kästchenhöhe berechnet, (b) `.focus()` ohne `preventScroll` scrollt
// automatisch. Behoben durch BEIDES: `ermittleSichtbareAnkerkante()`
// klemmt Ober-/Unterkante des Ankers auf den aktuell sichtbaren
// Viewport-Bereich, BEVOR die Popover-Position berechnet wird (das Popup
// erscheint dadurch immer innerhalb des bereits Sichtbaren, auch bei
// extrem hohen Kästchen) - zusätzlich bekommt jeder `.focus()`-Aufruf in
// diesem Popover-Code (Öffnen, Schließen-Button, Escape) `{ preventScroll:
// true }` als zweite, unabhängige Absicherung (verhindert JEDES
// ungewollte Scrollen durch Fokuswechsel, auch für Randfälle, die die
// Klemmung selbst nicht abdeckt, z.B. sehr schmale Viewports).
let popoverElement = null;
let popoverAussenKlick = null;
let popoverEscape = null;

function schliessePersonenPopover() {
  if (!popoverElement) return;
  popoverElement.remove();
  popoverElement = null;
  if (popoverAussenKlick) document.removeEventListener('click', popoverAussenKlick);
  if (popoverEscape) document.removeEventListener('keydown', popoverEscape);
  popoverAussenKlick = null;
  popoverEscape = null;
}

const HRR_STATUS_LABEL = {
  kaiser: 'Kaiser',
  koenig: 'König',
  kaiserin_heirat: 'Kaiserin (durch Heirat)',
  koenigin_heirat: 'Königin (durch Heirat)'
};

function zeigePersonenPopover(person, ankerElement) {
  schliessePersonenPopover();

  const popover = document.createElement('div');
  popover.className = 'familienbaum-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', `Details zu ${person.name}`);
  popover.setAttribute('tabindex', '-1');

  const herrschaft = person.herrschaft_von && person.herrschaft_bis
    ? `${person.herrschaft_von}–${person.herrschaft_bis}`
    : null;
  const felder = [
    ['Name', person.name],
    ['Titel', person.titel],
    ['Geburtsdatum', person.geburtsdatum],
    ['Sterbedatum', person.sterbedatum],
    ['Familie', person.familie],
    ['Politische Stellung', HRR_STATUS_LABEL[person.hrr_status] || null],
    ['Herrschaftszeitraum', herrschaft]
  ];
  felder.forEach(([label, wert]) => {
    if (!wert) return;
    const feld = document.createElement('div');
    feld.className = 'familienbaum-popover-feld';
    const labelEl = document.createElement('div');
    labelEl.className = 'familienbaum-popover-feld-label';
    labelEl.textContent = label;
    const wertEl = document.createElement('div');
    wertEl.textContent = wert;
    feld.append(labelEl, wertEl);
    popover.appendChild(feld);
  });

  const schliessenBtn = document.createElement('button');
  schliessenBtn.type = 'button';
  schliessenBtn.className = 'familienbaum-popover-schliessen';
  schliessenBtn.setAttribute('aria-label', 'Details schließen');
  schliessenBtn.textContent = '×';
  schliessenBtn.addEventListener('click', () => { schliessePersonenPopover(); ankerElement.focus({ preventScroll: true }); });
  popover.appendChild(schliessenBtn);

  document.body.appendChild(popover);
  // Punkt 1 (4. Folgeauftrag, siehe Dateikopf-Kommentar): Ober-/Unterkante
  // des Ankers auf den AKTUELL SICHTBAREN Viewport-Bereich geklemmt, statt
  // die volle (bei langlebigen Personen ggf. weit über den Viewport
  // hinausragende) Kästchenhöhe zu verwenden.
  const rect = ankerElement.getBoundingClientRect();
  const ankerObenSichtbar = Math.min(Math.max(rect.top, 0), window.innerHeight);
  const ankerUntenSichtbar = Math.min(Math.max(rect.bottom, 0), window.innerHeight);
  const popoverHoehe = popover.offsetHeight;

  let top = ankerUntenSichtbar + window.scrollY + 6;
  // Passt das Popup unterhalb der sichtbaren Anker-Kante nicht mehr in den
  // aktuellen Viewport, wird es stattdessen oberhalb davon platziert -
  // bleibt dadurch immer vollständig innerhalb des bereits Sichtbaren,
  // ganz ohne dass die Seite scrollen müsste.
  if (top + popoverHoehe > window.scrollY + window.innerHeight) {
    top = Math.max(window.scrollY + 6, ankerObenSichtbar + window.scrollY - popoverHoehe - 6);
  }
  popover.style.left = `${Math.min(rect.left + window.scrollX, window.scrollX + document.documentElement.clientWidth - 260)}px`;
  popover.style.top = `${top}px`;
  popoverElement = popover;
  // Punkt 1 (4. Folgeauftrag): { preventScroll: true } als zweite,
  // unabhängige Absicherung gegen ungewolltes Scrollen (siehe
  // Dateikopf-Kommentar) - ohne Klammerzusatz scrollt der Browser
  // standardmäßig das fokussierte Element in den sichtbaren Bereich.
  popover.focus({ preventScroll: true });

  popoverAussenKlick = (event) => {
    if (!popover.contains(event.target) && event.target !== ankerElement) schliessePersonenPopover();
  };
  popoverEscape = (event) => {
    if (event.key === 'Escape') { schliessePersonenPopover(); ankerElement.focus({ preventScroll: true }); }
  };
  setTimeout(() => {
    document.addEventListener('click', popoverAussenKlick);
    document.addEventListener('keydown', popoverEscape);
  }, 0);
}

// Punkt 2 (3. Folgeauftrag): gröbste Schrittweite aus JAHRES_TICK_SCHRITTE,
// die mit höchstens `hoehePixel / TICK_MIN_PIXELABSTAND_Y` Ticks über die
// AKTUELL SICHTBARE Jahresspanne (nicht die volle Baum-Spanne) auskommt -
// siehe Dateikopf-Kommentar zur Begründung gegenüber scale.ticks(n).
function ermittleJahresTickSchritt(sichtbareJahresSpanne, hoehePixel) {
  const maxTicks = Math.max(2, Math.floor(hoehePixel / TICK_MIN_PIXELABSTAND_Y));
  // Von FEIN nach GROB durchgehen (JAHRES_TICK_SCHRITTE ist grob→fein
  // sortiert) und die erste (= feinste) Schrittweite zurückgeben, die noch
  // innerhalb des Tick-Platzbudgets bleibt - deckt sich mit maxTicks bei
  // KEINER Schrittweite (extrem wenig Pixel-Platz), Fallback auf die
  // gröbste verfügbare Schrittweite.
  for (let i = JAHRES_TICK_SCHRITTE.length - 1; i >= 0; i -= 1) {
    const schritt = JAHRES_TICK_SCHRITTE[i];
    if (sichtbareJahresSpanne / schritt <= maxTicks) return schritt;
  }
  return JAHRES_TICK_SCHRITTE[0];
}

function baueJahresTickWerte(minJahr, maxJahr, schritt) {
  const start = Math.ceil(minJahr / schritt) * schritt;
  const werte = [];
  for (let jahr = start; jahr <= maxJahr; jahr += schritt) werte.push(jahr);
  return werte;
}

// --- Zoom/Pan (Grundmuster unverändert aus den vorherigen Aufträgen, siehe
// Dateikopf-Kommentar zur Zeitachse-Herleitung; Punkt 1/2 des 3.
// Folgeauftrags ändern nur den initialen Fit sowie die Tick-Berechnung,
// siehe dortiger Dateikopf-Kommentar). --------------------------------------
function wireZoom(svg, zoomInhalt, achseGruppe, breite, hoehe, ausdehnung) {
  // WICHTIG (Punkt 2, 3. Folgeauftrag - per Live-Test gefunden, siehe
  // Dateikopf-Kommentar): transform.rescaleY() geht davon aus, dass die
  // RANGE der Basis-Skala bereits dem sichtbaren Viewport entspricht (so
  // wie bei zeitachse.js' xSkalaBasis, deren Range = [RAND.links,
  // breite-RAND.rechts] ist) - hier ist die RANGE von ySkalaBasis aber der
  // GESAMTE Inhalts-Bereich (0 bis Gesamthöhe des Baums in Pixeln, oft weit
  // größer als der Viewport, siehe Punkt 1), da familienbaum.js einen
  // Canvas/Karten-artigen Zoom verwendet (großer, fester Inhaltsraum, eine
  // Kamera-Transform blendet nur einen Ausschnitt ein) statt zeitachses
  // "Skala selbst neu skalieren"-Ansatz. `rescaleY(ySkalaBasis).domain()`
  // lieferte dadurch beim ersten Test falsche, weit außerhalb des sichtbaren
  // Bereichs liegende Jahre (Ticks bei Pixel-Position >9000 auf einer
  // 705px-hohen Ansicht) - stattdessen werden die beiden sichtbaren
  // Viewport-Ränder (0 und hoehe) über `transform.invertY()` zurück in
  // Inhalts-Pixel und dann über `ySkalaBasis.invert()` in Jahre übersetzt,
  // und eine EIGENE, viewport-breite Achsen-Skala (Range = [0, hoehe])
  // daraus gebaut - das ist unabhängig von rescaleY()s Annahme korrekt.
  function aktualisiereAchse(transform) {
    const ySkalaBasis = d3.scaleLinear().domain([instanz.jahrMin, instanz.jahrMax]).range([0, (instanz.jahrMax - instanz.jahrMin) * PIXEL_PRO_JAHR]);
    const jahrA = ySkalaBasis.invert(transform.invertY(0));
    const jahrB = ySkalaBasis.invert(transform.invertY(hoehe));
    const sichtbarMin = Math.min(jahrA, jahrB);
    const sichtbarMax = Math.max(jahrA, jahrB);
    const achsenSkala = d3.scaleLinear().domain([sichtbarMin, sichtbarMax]).range([0, hoehe]);
    const schritt = ermittleJahresTickSchritt(sichtbarMax - sichtbarMin, hoehe);
    const tickWerte = baueJahresTickWerte(sichtbarMin, sichtbarMax, schritt);
    achseGruppe.call(d3.axisLeft(achsenSkala).tickValues(tickWerte).tickFormat(d3.format('d')));
  }

  const zoomVerhalten = d3.zoom()
    // Punkt 2 (3. Folgeauftrag): Obergrenze 4→24, siehe Dateikopf-Kommentar -
    // reine Parameteränderung, dieselbe Zoom/Pan-Mechanik (Mausrad zoomt,
    // Ziehen verschiebt) bleibt unverändert.
    .scaleExtent([0.2, 24])
    .translateExtent([
      [ausdehnung.minX - breite, ausdehnung.minY - hoehe],
      [ausdehnung.maxX + breite, ausdehnung.maxY + hoehe]
    ])
    .on('zoom', (event) => {
      instanz.zoomTransform = event.transform;
      zoomInhalt.attr('transform', event.transform);
      aktualisiereAchse(event.transform);
    });
  svg.call(zoomVerhalten);

  if (instanz.zoomTransform) {
    svg.call(zoomVerhalten.transform, instanz.zoomTransform);
  } else {
    const baumBreite = Math.max(ausdehnung.maxX - ausdehnung.minX, 1);
    // Punkt 1 (3. Folgeauftrag): NUR noch breiten-begrenzt (verhindert
    // seitliches Abschneiden auf schmalen Fenstern), NICHT mehr
    // höhen-begrenzt - siehe Dateikopf-Kommentar ("künstliches Höhenlimit").
    const skala = Math.min(1, breite / baumBreite);
    const startX = breite / 2 - ((ausdehnung.minX + ausdehnung.maxX) / 2) * skala;
    const startY = RAND.oben - ausdehnung.minY * skala;
    svg.call(zoomVerhalten.transform, d3.zoomIdentity.translate(startX, startY).scale(skala));
  }
  return zoomVerhalten;
}

// Punkt 4 (3. Folgeauftrag): liest die tatsächlich im Code verwendeten
// Fill-Konstanten aus, siehe Dateikopf-Kommentar - keine erfundenen
// Kategorien. Modul-Funktion statt Inline im Aufrufer, damit die Zuordnung
// Konstante->Legenden-Text an einer Stelle steht.
function baueFarblegende() {
  const wrapper = document.createElement('div');
  wrapper.className = 'familienbaum-legende';

  const titel = document.createElement('div');
  titel.className = 'familienbaum-legende-titel';
  titel.textContent = 'Farblegende';
  wrapper.appendChild(titel);

  const eintraege = [
    { farbe: HABSBURG_BASIS_FARBE, label: 'Familienfarbe (Habsburg-Linie, Farbton je Zweig leicht abweichend)' },
    { farbe: GRAU_EHEPARTNERFAMILIE, label: 'Ehepartner aus anderer Familie' },
    { farbe: GOLD_FARBE, label: 'Regierungszeit als Kaiser/König aus eigenem Recht' },
    { farbe: HEIRAT_FARBE, label: 'Kaiserin/König durch Heirat (ganzer Balken)' }
  ];
  eintraege.forEach(({ farbe, label }) => {
    const zeile = document.createElement('div');
    zeile.className = 'familienbaum-legende-zeile';
    const swatch = document.createElement('span');
    swatch.className = 'familienbaum-legende-swatch';
    swatch.style.background = farbe;
    zeile.append(swatch, document.createTextNode(label));
    wrapper.appendChild(zeile);
  });

  const unsicherZeile = document.createElement('div');
  unsicherZeile.className = 'familienbaum-legende-zeile';
  const unsicherSwatch = document.createElement('span');
  unsicherSwatch.className = 'familienbaum-legende-swatch familienbaum-legende-swatch-unsicher';
  unsicherZeile.append(unsicherSwatch, document.createTextNode('Unsichere Angabe (gestrichelter roter Rand)'));
  wrapper.appendChild(unsicherZeile);

  return wrapper;
}

// --- Werkzeugleiste: nur noch der Info-Button (Punkt 1, Folgeauftrag:
// der Politische-Stellung-Umschalter entfällt ersatzlos). -----------------

function baueWerkzeugleiste(container) {
  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'familienbaum-werkzeugleiste';

  const infoContainer = document.createElement('div');
  infoContainer.className = 'familienbaum-info-anker';
  werkzeugleiste.appendChild(infoContainer);
  instanz.infoButton = erzeugeInfoButton(infoContainer, {
    text: INFO_TEXT,
    ariaLabel: 'Erklärung zum Familienbaum anzeigen',
    zusatzInhalt: baueFarblegende()
  });

  container.appendChild(werkzeugleiste);
}

// --- Hauptzeichenfunktion --------------------------------------------------
function zeichneFamilienbaum() {
  const { container, plotBereich, byId, kinderIndex, options } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  plotBereich.innerHTML = '';
  // Punkt 3 (3. Folgeauftrag): kein Element wird gerade gehovert, direkt
  // nach einem Neuaufbau (z.B. Fenster-Resize) - die eingefrorene Auswahl
  // (Klick) bleibt dagegen bewusst bestehen (siehe render()-Instanz-Objekt).
  instanz.hoverFokusId = null;

  const wurzelKnotenListe = baueWurzeln(byId, kinderIndex);
  const wurzeln = baueForstLayout(wurzelKnotenListe);

  if (wurzeln.length === 0) {
    const hinweis = document.createElement('p');
    hinweis.className = 'familienbaum-leer-hinweis';
    hinweis.textContent = 'Keine Personen im Habsburg-Kreis gefunden.';
    plotBereich.appendChild(hinweis);
    return;
  }

  const modell = baueRenderModell(wurzeln, byId);

  const minX = Math.min(...modell.knoten.map((k) => k.x)) - instanz.kastenBreite;
  const maxX = Math.max(...modell.knoten.map((k) => k.x)) + instanz.kastenBreite + instanz.spaltenAbstand;
  const minY = Math.min(...modell.knoten.map((k) => k.yTop)) - 20;
  const maxY = Math.max(...modell.knoten.map((k) => k.yBottom)) + 10;

  const breite = options.width || ermittleVerfuegbareBreite(plotBereich);
  const hoehe = options.height || ermittleVerfuegbareHoehe(plotBereich, { reserveUnten: RAND.unten });

  const svg = d3.select(plotBereich).append('svg')
    .attr('width', breite).attr('height', hoehe)
    .attr('role', 'img')
    .attr('aria-label', 'Habsburg-Zeitleistenbaum');
  // Punkt 3 (3. Folgeauftrag): Klick auf freie Fläche löst die eingefrorene
  // Hervorhebung - erreicht diesen Handler NUR, wenn der Klick nicht auf
  // einer Personen-Gruppe war (deren eigener Klick-Handler ruft
  // event.stopPropagation() auf, siehe zeichneBaum()).
  svg.on('click', () => {
    if (!instanz.eingefrorenerFokusId) return;
    instanz.eingefrorenerFokusId = null;
    aktualisiereHervorhebung();
  });
  svg.append('desc').text(
    'Zeitleisten-Stammbaum des Hauses Habsburg: jeder Balken reicht vom Geburts- bis zum Sterbejahr der Person. '
    + 'Bei Kaisern und Königen aus eigenem Recht ist der Regierungszeitraum golden hervorgehoben, Kaiserinnen und '
    + 'Königinnen durch Heirat sind vollständig in einem helleren Goldton gefüllt. Gestrichelt umrandete Personen '
    + 'haben unsichere Angaben.'
  );

  // Linke Jahres-Achse: eigene, NICHT mitgezoomte <g> (Zoom verschiebt nur
  // zoomInhalt) - wireZoom() berechnet ihre Ticks bei jedem Zoom-Schritt
  // aus der aktuellen Transform neu (siehe dortiger Kommentar).
  const achseGruppe = svg.append('g').attr('class', 'familienbaum-jahresachse').attr('transform', `translate(${RAND.links},0)`);

  const zoomInhalt = zeichneBaum(svg, modell, plotBereich, zeigeUnsicherheit);
  zoomInhalt.attr('transform', `translate(${RAND.links},0)`);

  instanz.zoomVerhalten = wireZoom(svg, zoomInhalt, achseGruppe, breite - RAND.links, hoehe, { minX, maxX, minY, maxY });
  instanz.letzteBaumausdehnung = { minX, maxX, minY, maxY };
}

// --- Modul-Interface (Abschnitt 5) ---------------------------------------

export function render(container, data, options = {}) {
  if (instanz) destroy();

  container.innerHTML = '';
  fuegeStyleEin(container);
  fuegeBildschirmHinweisStyleEin(container);

  const { kreisIds } = ermittleHabsburgKreis(data);
  const kreisRecords = data.filter((r) => kreisIds.has(r.id));
  const { byId, kinderIndex } = baueDatenIndex(kreisRecords);
  const { jahrMin, jahrMax } = ermittleJahresSpanne(kreisRecords);
  // Punkt 1/2 (2. Folgeauftrag): Kästchenbreite aus den tatsächlichen
  // Namen berechnet, Spaltenabstand folgt daraus (siehe Dateikopf-
  // Kommentar) - beide vor der Instanz-Erzeugung, da baueForstLayout()/
  // baueRenderModell() bereits beim ersten zeichneFamilienbaum()-Aufruf
  // auf instanz.spaltenAbstand zugreifen.
  const kastenBreite = berechneKastenbreite(kreisRecords);

  instanz = {
    container,
    records: kreisRecords,
    options: { showUncertainty: true, width: null, height: null, ...options },
    byId,
    kinderIndex,
    familienFarben: berechneFamilienFarben(),
    jahrMin,
    jahrMax,
    kastenBreite,
    spaltenAbstand: kastenBreite + ZWEIG_LUECKE_BASIS,
    // Mindest-Mittenabstand, den loeseUeberlappungGlobal() zwischen zwei
    // zeitlich aktiven Kästchen erzwingt (siehe Dateikopf-Kommentar Punkt 3) -
    // unabhängig von spaltenAbstand, das nur die BEVORZUGTE (nicht
    // garantierte) Baum-Spaltenbreite ist.
    spaltenLaneAbstand: kastenBreite + SPALTEN_LANE_PADDING,
    zoomVerhalten: null,
    zoomTransform: null,
    infoButton: null,
    // Punkt 3 (3. Folgeauftrag): siehe Dateikopf-Kommentar/aktualisiereHervorhebung().
    hoverFokusId: null,
    eingefrorenerFokusId: null,
    selektionen: null
  };

  const wurzel = document.createElement('div');
  wurzel.className = 'familienbaum-wurzel';
  container.appendChild(wurzel);
  instanz.wurzel = wurzel;

  const breite = ermittleVerfuegbareBreite(container);
  const hoehe = ermittleVerfuegbareHoehe(container, { reserveUnten: 10 });
  if (istBildschirmZuKlein(breite, hoehe)) {
    wurzel.appendChild(baueBildschirmHinweis());
    return;
  }

  baueWerkzeugleiste(wurzel);

  const plotBereich = document.createElement('div');
  plotBereich.className = 'familienbaum-plot-bereich';
  wurzel.appendChild(plotBereich);
  instanz.plotBereich = plotBereich;

  zeichneFamilienbaum();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };

  if (!instanz.plotBereich) {
    render(instanz.container, instanz.records, instanz.options);
    return;
  }
  const breite = instanz.options.width || ermittleVerfuegbareBreite(instanz.container);
  const hoehe = instanz.options.height || ermittleVerfuegbareHoehe(instanz.container, { reserveUnten: 10 });
  if (istBildschirmZuKlein(breite, hoehe)) {
    render(instanz.container, instanz.records, instanz.options);
    return;
  }

  const neueBreite = instanz.options.width || ermittleVerfuegbareBreite(instanz.plotBereich);
  if (instanz.letzteBreite !== undefined && instanz.letzteBreite !== neueBreite) {
    instanz.zoomTransform = null;
  }
  instanz.letzteBreite = neueBreite;
  zeichneFamilienbaum();
}

export function destroy() {
  if (!instanz) return;
  schliessePersonenPopover();
  instanz.infoButton?.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}

// --- Styles ---
function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .familienbaum-wurzel { display: flex; flex-direction: column; height: 100%; }
    .familienbaum-werkzeugleiste { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3);
      margin-bottom: var(--space-3); flex: 0 0 auto; }
    .familienbaum-info-anker { margin-left: auto; flex: 0 0 auto; }
    .familienbaum-plot-bereich { flex: 1 1 auto; overflow: hidden; touch-action: none; }
    .familienbaum-jahresachse { font-size: 11px; }
    .familienbaum-person { cursor: pointer; transition: opacity 150ms ease; }
    .familienbaum-person:focus, .familienbaum-person:focus-visible { outline: none; }
    .familienbaum-person:focus rect.familienbaum-balken, .familienbaum-person:focus-visible rect.familienbaum-balken { stroke: var(--accent); stroke-width: 2.5px; }
    /* Punkt 3 (3. Folgeauftrag): dieselbe Übergangszeit wie .familienbaum-person,
       damit Kästchen und ihre Verbindungslinien optisch synchron ein-/ausblenden. */
    .familienbaum-eltern-kind-linien line, .familienbaum-ehe-linien line { transition: opacity 150ms ease; }
    .familienbaum-leer-hinweis { padding: var(--space-4); color: var(--text-muted); }
    /* Punkt 4 (3. Folgeauftrag): Farblegende im Info-Popover. */
    .familienbaum-legende { margin-top: var(--space-3); padding-top: var(--space-2); border-top: 1px solid var(--border);
      display: flex; flex-direction: column; gap: 6px; }
    .familienbaum-legende-titel { font-weight: 600; font-size: var(--fs-sm); margin-bottom: 2px; }
    .familienbaum-legende-zeile { display: flex; align-items: center; gap: var(--space-2); font-size: var(--fs-sm); }
    .familienbaum-legende-swatch { width: 14px; height: 14px; min-width: 14px; border-radius: 3px;
      border: 1px solid var(--border); flex: 0 0 auto; }
    .familienbaum-legende-swatch-unsicher { background: transparent; border: 2px dashed #c0392b; }
    .familienbaum-popover { position: absolute; z-index: 40; width: 240px; background: var(--surface);
      border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding: var(--space-3); }
    .familienbaum-popover:focus { outline: none; }
    .familienbaum-popover-feld { margin-bottom: var(--space-2); font-size: var(--fs-sm); }
    .familienbaum-popover-feld:last-of-type { margin-bottom: 0; }
    .familienbaum-popover-feld-label { font-weight: 600; color: var(--text-muted); font-size: 11px; }
    .familienbaum-popover-schliessen { position: absolute; top: 4px; right: 4px; min-width: 32px; min-height: 32px;
      border: none; background: none; font-size: 1.2rem; cursor: pointer; }
    .familienbaum-popover-schliessen:focus-visible { outline: 3px solid var(--accent); outline-offset: 1px; }
  `;
  container.appendChild(style);
}
