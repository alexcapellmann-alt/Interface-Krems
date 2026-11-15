// js/config/archivalienRegistry.js
// Technisches Verzeichnis der Ansichten: welche Bereiche und Ansichten es gibt, welches Modul sie zeichnet und welche
// Dateien es braucht. Keine archivarischen Inhalte (Masterprompt §2): Namen und Beschreibungen hier sind neutrale
// Vorgaben; maßgeblich sind data/ansichten.csv (Namen, Texte, Reihenfolge, anbieten) und data/infotexte.csv.
//
// Aufbau
// - BESTAND_ANSICHTEN: Ansichten des Bereichs Bestand (alle auf bestandsverzeichnis.csv).
// - ARCHIVALIENTYPEN: Bereiche der Erkundung (`typ` = Bereichs-ID in Adresse und ansichten.csv) mit ihren `ansichten`.
//   Ein Bereich erscheint nur, wenn es für ihn mindestens ein Modul gibt („content-driven“, Masterprompt §2); ein neuer
//   Bereichstyp braucht deshalb Programmteile (Datenbestände ohne Modul nennt js/core/unbekannteDaten.js).
// - ANSICHTS_FUEHRUNGEN: Führungen, die statt Stationen ein eigenes Modul zeigen (Willkommenstour).
//
// Felder: `id`/`label`/`beschreibung` (Vorgaben), `modulPfad` (dynamischer import(), Lazy Loading),
// `datenDatei` – ein Pfad oder ein Objekt mehrerer Quellen, die app.js gemeinsam lädt; `datenSchluessel` wählt daraus
// den Teil, den ein Modul als flache Liste erwartet. `hatGalerie` (Bereich mit Kachel-Galerie),
// `eigenerUnsicherheitsButton`/`ohneUnsicherheitsButton` (allgemeiner Unsicherheitsknopf ausgeblendet).
// Welche Spalten eine Ansicht mindestens braucht, steht in js/config/datenAnforderungen.js.
//
// Pflegeregel (Masterprompt §14): Einträge für neue Module dürfen ergänzt werden; bestehende nur nach Rückfrage ändern.
// Entstehung und frühere Fassungen: docs/PROJEKTLOG.md.

// Führungen, die statt Stationen eine interaktive Ansicht zeigen: fuehrung_id aus fuehrungen.csv → Modul und Daten
// (app.js' aktualisiereFuehrungenAnsicht()). Wunsch des Autors (2026-10-29): „Bürgerinnen?“ aus dem Bereich Personen
// in die Führungen („Geschichten über das Archiv“) verlegt; das Modul bekommt dieselben Daten wie bisher unter Personen.
export const ANSICHTS_FUEHRUNGEN = {
  buergerinnen: {
    modulPfad: '../viz/buergerinnen.js',
    datenDatei: { personenliste: 'data/personenliste.csv', urkunden: 'data/urkunden.csv', buergerbuch: 'data/buergerbuch.csv', verlassenschaften: 'data/verlassenschaftsinventare.csv' }
  }
};

export const BESTAND_ANSICHTEN = [
  { id: 'treemap', label: 'Baum', modulPfad: '../viz/treemap.js',
    beschreibung: 'Zeigt Bestände als verschachtelte Flächen nach Kategorie, Größe = Umfang in Laufmetern.' },
  // KORRIGIERT (siehe Dateikopf-Kommentar): sunburst.js zeigt drei Ringe
  // (Kategorie/Unterkategorie/Bestand), nicht zwei.
  { id: 'sunburst', label: 'Sonne', modulPfad: '../viz/sunburst.js',
    beschreibung: 'Dieselben Bestände radial angeordnet: Kategorie innen, Unterkategorie in der Mitte, Bestand außen.' },
  { id: 'icicle', label: 'Icicle', modulPfad: '../viz/icicle.js',
    beschreibung: 'Bestände als gestapelte Ebenen: Kategorie, Unterkategorie, Bestand.' },
  { id: 'circlePacking', label: 'Circle Packing', modulPfad: '../viz/circlePacking.js',
    beschreibung: 'Bestände als ineinander verschachtelte Kreise je Kategorie.' },
  { id: 'ganttDiagramm', label: 'Strahl', modulPfad: '../viz/ganttDiagramm.js',
    beschreibung: 'Entstehungs-/Laufzeitraum jedes Bestands als horizontaler Balken auf der Zeitachse.' }
];

export const ARCHIVALIENTYPEN = [
  {
    typ: 'urkunden',
    label: 'Urkunden',
    datenDatei: 'data/urkunden.csv',
    primaeransicht: 'regestenKachelraster',
    hatGalerie: true,
    ansichten: [
      { id: 'regestenKachelraster', label: 'Regesten', modulPfad: '../viz/regestenKachelraster.js',
        // AUFTRAG C1, Punkt 1/2: neutrale Vorgabe - die archivspezifische
        // Fassung (mit berechneter Urkundenzahl) steht in data/ansichten.csv.
        beschreibung: 'Durchsuchbare Kurzfassungen (Regesten) aller Urkunden mit Foto, Kategorie und Volltextsuche.' },
      { id: 'zeitachse', label: 'Zeitachse', modulPfad: '../viz/zeitachse.js',
        beschreibung: 'Jede Urkunde als Punkt auf der Zeitachse, eingefärbt nach Kategorie.' },
      { id: 'kalenderHeatmap', label: 'Kalender-Heatmap', modulPfad: '../viz/kalenderHeatmap.js',
        beschreibung: 'Zeigt, an welchen Kalendertagen bzw. Jahrzehnten die meisten Urkunden ausgestellt wurden.' },
      { id: 'dotPlot', label: 'Dot Plot', modulPfad: '../viz/dotPlot.js',
        beschreibung: 'Verteilung der Urkunden nach Kategorie über die Zeit, jede Urkunde ein Punkt.' },
      { id: 'swimlanes', label: 'Swimlanes', modulPfad: '../viz/swimlanes.js',
        beschreibung: 'Urkundenhäufigkeit je Kategorie über die Zeit, als Zeitspuren dargestellt.' },
      // AUFTRAG "Streamgraph → Bürgerbuch (Wirtschaftssektoren über die
      // Zeit)": Eintrag nach `buergerbuch.ansichten` UMGEZOGEN (siehe dortiger
      // Kommentar) - `id`/`modulPfad` unverändert, nur Zuordnung + Inhalt der
      // Datei selbst haben sich geändert.
      { id: 'ridgeline', label: 'Ridgeline', modulPfad: '../viz/ridgeline.js',
        beschreibung: 'Gestapelte Verteilungskurven je Kategorie über die Zeit.' },
      { id: 'horizonChart', label: 'Horizon Chart', modulPfad: '../viz/horizonChart.js',
        beschreibung: 'Kompakte, geschichtete Zeitreihen für mehrere Kategorien gleichzeitig.' },
      // KORRIGIERT (siehe Dateikopf-Kommentar): geliefertes "Mosaik-
      // Darstellung von Kategorie-Anteilen" nannte die für ein Marimekko
      // namensgebende zweite Achse (Jahrhundert, Spaltenbreite) nicht.
      { id: 'marimekko', label: 'Marimekko', modulPfad: '../viz/marimekko.js',
        beschreibung: 'Mosaik je Jahrhundert: Spaltenbreite zeigt die Urkundenzahl, Höhe den Kategorie-Anteil.' },
      // KORRIGIERT (siehe Dateikopf-Kommentar): das Modul verbindet
      // Jahrhundert und Kategorie in genau ZWEI Spalten, nicht mehrstufig
      // und nicht mit unspezifischen "weiteren Merkmalen".
      { id: 'alluvial', label: 'Alluviales Diagramm', modulPfad: '../viz/alluvial.js',
        beschreibung: 'Fluss zwischen Jahrhundert und Kategorie - zeigt Verschiebungen der Kategorienzusammensetzung über die Zeit.' },
      // AUFTRAG "Neuer Bereichs-Tab 'Orte' + Umzug der drei Karten-Module":
      // karte/verbindungskarte/bipartiteFlowMap nach `orte.ansichten`
      // UMGEZOGEN (siehe dortiger Kommentar) - `id`/`modulPfad` unverändert,
      // keine inhaltliche Änderung an den drei Modulen selbst.
      { id: 'adjazenzmatrix', label: 'Adjazenzmatrix', modulPfad: '../viz/adjazenzmatrix.js',
        beschreibung: 'Matrix der am häufigsten gemeinsam in Urkunden genannten Personen.' },
      // AUFTRAG "Chord-Diagramm – soziale Gruppen ..., Umzug nach Personen":
      // Eintrag nach `personen.ansichten` UMGEZOGEN (`id`/`modulPfad`
      // unverändert - siehe dortiger Kommentar/chordDiagramm.js' eigener
      // Dateikopf-Kommentar für die inhaltliche Neukonzeption).
      // KORRIGIERT (siehe Dateikopf-Kommentar): Personen sind nach
      // Verbindungsgrad angeordnet, nicht chronologisch, und es sind
      // Personen, keine unspezifischen "Elemente".
      { id: 'arcDiagramm', label: 'Arc-Diagramm', modulPfad: '../viz/arcDiagramm.js',
        beschreibung: 'Personen entlang einer Achse, Bögen verbinden die am häufigsten gemeinsam Genannten.' },
      { id: 'sankey', label: 'Kategoriefluss', modulPfad: '../viz/sankey.js',
        beschreibung: 'Zeigt den Zusammenhang zwischen Urkundenkategorien und genannten Orten.' },
      // `ohneUnsicherheitsButton` (2026-10-28): die Ansicht kennzeichnet keine Unsicherheiten, Knopf ausgeblendet
      { id: 'wortwolke', label: 'Wortwolke', modulPfad: '../viz/wortwolke.js', ohneUnsicherheitsButton: true,
        beschreibung: 'Häufigste Begriffe aus den Regesten-Texten, je größer desto häufiger.' },
      // Wunsch des Autors (2026-10-25): Darstellungsform des Theaterzettel-Prototyps mit den Urkunden.
      // `eigenerUnsicherheitsButton` (2026-10-28): der Knopf sitzt in der Ansicht selbst, links oben
      { id: 'bilderwand', label: 'Bilderwand', modulPfad: '../viz/bilderwand.js', eigenerUnsicherheitsButton: true,
        beschreibung: 'Jede Urkunde als Bild in Jahrzehnt-Säulen; Orte, Kategorien und Personen filtern und teilen die Säulen.' }
    ]
  },
  {
    typ: 'buergerbuch',
    label: 'Bürgerbuch',
    datenDatei: 'data/buergerbuch.csv',
    primaeransicht: 'trellis',
    // FOLGEAUFTRAG "Galerie+Flyout für Bürgerbuch und Personen": `hatGalerie`
    // + `beschreibung` analog zu urkunden/BESTAND_ANSICHTEN oben - reine
    // Registry-Erweiterung, die gesamte Galerie/Flyout-Logik in app.js war
    // durch den vorigen Auftrag bereits vollständig verallgemeinert
    // (`archivalientyp.hatGalerie` steuert generisch, kein Code kennt
    // "urkunden" namentlich) und greift hier unverändert. Alle drei Texte
    // gegen die tatsächlichen Info-Button-Texte der Module geprüft (wie bei
    // urkunden/Bestand) - alle drei stimmten überein, keine Korrektur nötig.
    hatGalerie: true,
    ansichten: [
      { id: 'trellis', label: 'Trellis', modulPfad: '../viz/trellis.js',
        beschreibung: 'Ein kleines Diagramm pro Wirtschaftssektor zeigt die Entwicklung der Bürgeraufnahmen über die Zeit.' },
      { id: 'bumpChart', label: 'Bump Chart', modulPfad: '../viz/bumpChart.js',
        beschreibung: 'Zeigt, wie sich die Rangfolge der Wirtschaftssektoren von Jahrzehnt zu Jahrzehnt verschiebt.' },
      { id: 'personennetzwerk', label: 'Personennetzwerk', modulPfad: '../viz/personennetzwerk.js',
        beschreibung: 'Zeigt Bürgschaftsbeziehungen zwischen Personen im Bürgerbuch.' }
      // Streamgraph am 2026-10-27 nach `personen.ansichten` verschoben (Wunsch des Autors).
    ]
  },
  {
    typ: 'verlassenschaften',
    label: 'Verlassenschaften',
    datenDatei: 'data/verlassenschaftsinventare.csv',
    primaeransicht: 'parallelKoordinaten',
    // AUFTRAG "Parallelkoordinaten & Korrelationsmatrix → Verlassenschaften":
    // beide Module von `urkunden.ansichten` hierher UMGEZOGEN (nicht nur
    // Registry-Zuordnung wie beim Personen-Umzug, siehe oben - hier zusätzlich
    // inhaltlich umgebaut, siehe jeweiliger Dateikopf-Kommentar) und dabei
    // grundlegend neu gebaut: acht echte Vermögenskennzahlen aus
    // verlassenschaftsinventare.csv statt urkunden.csv-Feldern, die für
    // Parallelkoordinaten/Korrelation strukturell ungeeignet waren (keine
    // mehreren kontinuierlichen Zahlenwerte je Urkunde). Der bisherige
    // einzige Platzhalter-Eintrag entfällt (Abschnitt 2 "Content-driven",
    // derselbe Präzedenzfall wie beim Wegfall der Personen-/Bürgerbuch-
    // Platzhalter) - `js/viz/verlassenschaftenPlatzhalter.js` dadurch
    // unreferenziert, gelöscht (siehe CHANGELOG). `primaeransicht` von
    // `platzhalter` auf `parallelKoordinaten` geändert (die beiden neuen
    // Ansichten sind gleichrangig, Parallelkoordinaten steht im Auftrag an
    // erster Stelle). Damals bewusst KEIN `hatGalerie` (eine Galerie für nur
    // zwei Ansichten war dort nicht verlangt).
    //
    // FOLGEAUFTRAG "Galerie-Seite für Verlassenschaften": `hatGalerie: true`
    // jetzt ergänzt (löst die obige Entscheidung ab) + `beschreibung`-Felder,
    // analog zu urkunden/buergerbuch/personen oben - reine Registry-
    // Erweiterung, die Galerie/Flyout-Logik in app.js ist bereits vollständig
    // generisch (kein Code kennt "verlassenschaften" namentlich, siehe
    // Kommentar bei buergerbuch oben) und greift hier unverändert. Beide
    // gelieferten Kachel-Texte gegen die tatsächlichen Modul-Inhalte geprüft
    // (wie bei urkunden/Bestand/Bürgerbuch) - beide trafen es genau, keine
    // Korrektur nötig. Icons: `js/utils/vizIcons.js` hatte für beide IDs
    // (`parallelKoordinaten`/`korrelationsmatrix`) bereits Einträge aus der
    // Zeit, als beide Module noch unter `urkunden` liefen - diese entsprechen
    // inhaltlich fast exakt den im Auftrag vorgeschlagenen Motiven
    // (kreuzende Diagonalen zwischen vertikalen Achsen bzw. unterschiedlich
    // große Kreise im Raster) und blieben seit dem Umzug einfach ungenutzt
    // (keine Galerie, kein Icon-Rendering) - keine Änderung an vizIcons.js
    // nötig, siehe Selbstauskunft im Chat.
    // FOLGEAUFTRAG "Parallelkoordinaten-Anpassung + neue Visualisierung
    // 'Vermögensschichtung'", Teil B: dritter Eintrag `vermoegensschichtung`
    // ergänzt - `beschreibung` hier SELBST verfasst (der Auftrag lieferte
    // dafür keinen eigenen Kachel-Text, anders als bei den ersten beiden
    // Einträgen), gegen den tatsächlichen Info-Button-Text des neuen Moduls
    // geprüft (dieselbe Vorgehensweise wie bei bubbleChart, siehe
    // Kommentar unten bei `personen`).
    hatGalerie: true,
    ansichten: [
      { id: 'parallelKoordinaten', label: 'Parallelkoordinaten', modulPfad: '../viz/parallelKoordinaten.js',
        beschreibung: 'Vergleicht Vermögenswerte und -anteile jeder Verlassenschaft entlang mehrerer paralleler Achsen.' },
      { id: 'korrelationsmatrix', label: 'Korrelationsmatrix', modulPfad: '../viz/korrelationsmatrix.js',
        beschreibung: 'Zeigt statistische Zusammenhänge zwischen den Vermögensmerkmalen der Verlassenschaftsinventare.' },
      { id: 'vermoegensschichtung', label: 'Vermögensschichtung', modulPfad: '../viz/vermoegensschichtung.js',
        beschreibung: 'Verteilung der Verlassenschaften auf die Vermögensgruppen A bis E je Jahrzehnt, optional nach Ort oder Geschlecht aufgeschlüsselt.' },
      // FOLGEAUFTRAG "Marimekko für Verlassenschaften (Vermögensgruppe x
      // Realvermögens-Zusammensetzung)": vierter Eintrag, eigene ID
      // `marimekkoVerlassenschaften` (NICHT `marimekko` - der Wert ist unter
      // `urkunden.ansichten` oben bereits für ein strukturell anderes Diagramm
      // vergeben, siehe js/viz/marimekkoVerlassenschaften.js' Dateikopf-
      // Kommentar zur Neue-Datei-Entscheidung). `beschreibung` hier SELBST
      // verfasst (der Auftrag lieferte keinen eigenen Kachel-Text), gegen den
      // tatsächlichen Info-Button-Text des Moduls geprüft.
      { id: 'marimekkoVerlassenschaften', label: 'Marimekko', modulPfad: '../viz/marimekkoVerlassenschaften.js',
        beschreibung: 'Zeigt je Vermögensgruppe die Zusammensetzung des Realvermögens aus Grundstücken, Bargeld, Wertgegenständen und beruflichem Sonderbestand.' }
    ]
  },
  {
    typ: 'personen',
    label: 'Personen',
    // Drei gemeinsam benötigte Quellen - siehe Dateikopf-Kommentar/app.js'
    // ladeArchivalienDaten(). Schlüssel ('familien'/'personenliste'/
    // 'urkunden') sind die Namen, unter denen die Datensatz-Listen im
    // geladenen `data`-Objekt stehen - die einzelnen Ansichten unten wählen
    // sich per `datenSchluessel` ihren jeweils eigenen Teil davon aus (ohne
    // `datenSchluessel` bekommt eine Ansicht das GESAMTE `data`-Objekt, siehe
    // chordDiagramm.js unten - das einzige Modul, das mehr als eine Quelle
    // gleichzeitig braucht: urkunden.csv für die Ko-Nennungen, familien.csv
    // für den Dynastie-Abgleich, siehe dortiger Dateikopf-Kommentar).
    // `urkunden` NEU (AUFTRAG "Chord-Diagramm – soziale Gruppen ..., Umzug
    // nach Personen") - derselbe generische ladeArchivalienDaten()-
    // Mechanismus lädt jeden zusätzlichen Pfad automatisch mit, ohne dass
    // app.js selbst geändert werden musste.
    // `buergerbuch` NEU (AUFTRAG "Personenliste – Sidebar mit den
    // tatsächlichen Urkunden/Bürgerbuch-Einträgen") - personenliste.js löst
    // `nennung_in_buergerbuch` jetzt gegen `buergerbuch.csv`s `id` auf,
    // braucht dafür diese vierte Quelle.
    // `verlassenschaften` NEU (AUFTRAG "Teil 2h", Punkt 4b) - personenliste.js
    // löst `nennung_in_verlassenschaften` jetzt ebenso gegen
    // `verlassenschaftsinventare.csv`s `id` auf, fünfte Quelle.
    // AUFTRAG C1, Punkt 4: `rollen` (data/rollen.csv) für Chord-Diagramm und Personenliste
    datenDatei: { familien: 'data/familien.csv', personenliste: 'data/personenliste.csv', urkunden: 'data/urkunden.csv', buergerbuch: 'data/buergerbuch.csv', verlassenschaften: 'data/verlassenschaftsinventare.csv' },
    primaeransicht: 'personenliste',
    // FOLGEAUFTRAG "Galerie+Flyout für Bürgerbuch und Personen": `hatGalerie`
    // + `beschreibung` wie bei buergerbuch oben. Zwei Abweichungen vom
    // gelieferten Auftrag, beide geprüft und hier transparent vermerkt (siehe
    // Selbstauskunft im Chat für den vollen Befund):
    // (1) `familienbaum` -> Label umbenannt zu "Habsburg-Zeitleistenbaum":
    //     keine Umdeutung, das Modul beschreibt sich in seinem EIGENEN
    //     Dateikopf-Kommentar und internen Info-Text bereits selbst so
    //     ("Dieser Zeitleisten-Stammbaum zeigt das Haus Habsburg von
    //     Rudolf I. bis Joseph II.") und filtert die Daten fest auf den
    //     Habsburg-Familienkreis (ermittleHabsburgKreis()) - kein generischer
    //     Stammbaum, der nur zufällig mit Habsburg-Daten gefüttert wird.
    // (2) Der Auftrag nannte nur 2 Kachel-Texte ("Personen (2 Module)"),
    //     `personen.ansichten` hat aber DREI Einträge (`bubbleChart` fehlte
    //     in der Liste). Bewusst NICHT entfernt (keine Anweisung dazu, hätte
    //     den bestehenden Direktlink #visualisierungen/personen/bubbleChart
    //     unerreichbar gemacht) - stattdessen selbst eine geprüfte
    //     Kurzbeschreibung ergänzt (gegen bubbleChart.js' tatsächlichen Code
    //     verifiziert: d3.pack()/Circle-Packing, Kreisfläche = Gesamt-
    //     Nennungshäufigkeit über Urkunden+Bürgerbuch, Farbe rein technisch
    //     ohne Kategorie-Bezug), damit die Galerie nicht mit einem
    //     Platzhaltertext auffällt. Bitte bestätigen oder eigenen Text liefern.
    hatGalerie: true,
    ansichten: [
      // datenSchluessel: welchen Teil von data ({familien:[...],
      // personenliste:[...]}) dieses Modul als sein `data`-Argument bekommt -
      // siehe Dateikopf-Kommentar und app.js' ladeModulUndRender().
      // AUFTRAG "Personenliste – Sidebar...": `datenSchluessel` entfernt -
      // personenliste.js braucht jetzt zusätzlich zu `personenliste` auch
      // `urkunden`/`buergerbuch` (Sidebar-Nachschlage-Maps), bekommt daher
      // wie chordDiagramm.js das GESAMTE `data`-Objekt (siehe Dateikopf-
      // Kommentar oben).
      { id: 'personenliste', label: 'Personenliste', modulPfad: '../viz/personenliste.js',
        beschreibung: 'Durchsuchbare, sortierbare Liste aller erfassten Personen mit Nennungshäufigkeit und Zeitspanne.' },
      // Wunsch des Autors (2026-10-27): aus dem Bereich Bürgerbuch hierher verschoben; zeichnet weiterhin
      // die Bürgeraufnahmen aus buergerbuch.csv (`datenSchluessel`).
      { id: 'streamgraph', label: 'Wirtschaftssektoren über die Zeit', modulPfad: '../viz/streamgraph.js', datenSchluessel: 'buergerbuch',
        beschreibung: 'Zeigt die zeitliche Entwicklung der Bürgeraufnahmen je Wirtschaftssektor als organisch geschichtete Flächen.' },
      // Von `urkunden.ansichten` hierher verschoben (siehe Dateikopf-
      // Kommentar, "SELBST GEFUNDENER REGISTRIERUNGSFEHLER") - bubbleChart.js
      // erwartet personenliste.csv-Records, nicht urkunden.csv.
      // beschreibung: selbst verfasst, siehe Kommentar oben (Punkt 2).
      { id: 'bubbleChart', label: 'Bubble Chart', modulPfad: '../viz/bubbleChart.js', datenSchluessel: 'personenliste',
        beschreibung: 'Ein Kreis pro Person, Fläche = Gesamt-Nennungshäufigkeit über Urkunden und Bürgerbuch (Circle-Packing, Farbe ohne inhaltliche Bedeutung).' },
      // Label umbenannt, siehe Kommentar oben (Punkt 1).
      // AUFTRAG C1, Punkt 2/3: neutrale Vorgabe - Name und Beschreibung des
      // Archivs (Krems: Habsburg) stehen in data/ansichten.csv.
      { id: 'familienbaum', label: 'Stammbaum', modulPfad: '../viz/familienbaum.js', datenSchluessel: 'familien',
        beschreibung: 'Zeitleisten-Stammbaum einer Herrscherfamilie, mit Herrschaftszeiten von Kaisern und Königen.' },
      // AUFTRAG "Chord-Diagramm – soziale Gruppen (Dynastie/Adel/Klerus/
      // Bürger), Umzug nach Personen": vierter Eintrag, von
      // `urkunden.ansichten` hierher UMGEZOGEN (`id`/`modulPfad` unverändert -
      // `chordDiagramm`/`../viz/chordDiagramm.js`, inhaltlich aber komplett
      // neu konzipiert, siehe dortiger Dateikopf-Kommentar). BEWUSST KEIN
      // `datenSchluessel` (anders als die drei Einträge oben) - das Modul
      // braucht urkunden.csv UND familien.csv gleichzeitig, bekommt deshalb
      // das komplette geladene `data`-Objekt (`{familien, personenliste,
      // urkunden}`) und wählt sich intern selbst die zwei benötigten Teile
      // heraus (siehe app.js' ladeModulUndRender()-Kommentar: "ohne
      // datenSchluessel ... records unverändert durchgereicht").
      // AUFTRAG G1: Personennetzwerk der Urkunden (Knoten = Person, Kante = gemeinsame
      // Urkunde); bekommt das ganze Personen-Datenobjekt (urkunden + personenliste).
      { id: 'urkundenNetzwerk', label: 'Urkundennetzwerk', modulPfad: '../viz/urkundenNetzwerk.js',
        beschreibung: 'Ein Kreis pro Person, Größe = Nennungen in Urkunden, Linien verbinden Personen, die gemeinsam in einer Urkunde genannt werden.' },
      { id: 'chordDiagramm', label: 'Soziale Gruppen', modulPfad: '../viz/chordDiagramm.js',
        beschreibung: 'Zeigt, wie oft Personen aus vier sozialen Gruppen (Dynastie, Adel, Klerus, Bürgertum) gemeinsam in Urkunden genannt werden.' }
      // „Bürgerinnen?“ ist seit 2026-10-29 keine Ansicht mehr, sondern eine Führung (ANSICHTS_FUEHRUNGEN unten)
    ]
  },
  {
    // AUFTRAG "Neuer Bereichs-Tab 'Orte' + Umzug der drei Karten-Module":
    // fünfter Bereichs-Tab, identische Struktur wie die vier bestehenden
    // (hatGalerie:true, Galerie-Seite + Hover/Klick-Flyout-Tab-Leiste) -
    // KEINE neue Implementierung nötig, da bereichsLeiste.js
    // (`ARCHIVALIENTYPEN.forEach(...)`) und app.js' renderVisualisierungenTab()/
    // Galerie-/Flyout-Logik bereits vollständig generisch über
    // ARCHIVALIENTYPEN iterieren (kein Code kennt "urkunden"/"personen"/etc.
    // namentlich, siehe Kommentare bei buergerbuch/personen oben) - ein
    // fünfter Eintrag hier genügt.
    typ: 'orte',
    label: 'Orte',
    // AUFTRAG "Bipartite Flow Map – Zoom-Regression beheben, Balken auf
    // soziale Gruppen umstellen", Punkt 2: `datenDatei` jetzt ein
    // Mehrquellen-Objekt (dasselbe Muster wie bei `personen` oben) - Grund:
    // bipartiteFlowMap.js braucht für die neue Dynastie-Klassifikation
    // (Abgleich gegen familien.csv' `id`-Spalte, wiederverwendet aus
    // chordDiagramm.js) jetzt zusätzlich familien.csv. `karte`/
    // `verbindungskarte` bleiben inhaltlich unverändert (nur urkunden.csv
    // nötig) und bekommen dafür `datenSchluessel: 'urkunden'`, damit sie
    // weiterhin das FLACHE Array statt des kombinierten Objekts erhalten
    // (Nicht-Ziel: keine Änderung an deren eigener Datenverarbeitung).
    // `bipartiteFlowMap` bekommt bewusst KEINEN datenSchluessel (erhält das
    // gesamte `{urkunden, familien}`-Objekt) - exakt dasselbe Muster wie
    // chordDiagramm.js unter `personen` oben.
    // AUFTRAG C1, Punkt 4: `rollen` für die Bipartite Flow Map
    // 2026-10-28: `ortsverzeichnis` (orte.csv) und `verlassenschaften` für die Ortsliste
    datenDatei: { urkunden: 'data/urkunden.csv', familien: 'data/familien.csv', personenliste: 'data/personenliste.csv', ortsverzeichnis: 'data/orte.csv', verlassenschaften: 'data/verlassenschaftsinventare.csv' }, // 2026-10-27: Gruppen aus personenliste.csv statt rollen.csv
    primaeransicht: 'karte',
    hatGalerie: true,
    ansichten: [
      // Von `urkunden.ansichten` hierher UMGEZOGEN (siehe dortiger
      // Kommentar) - `id`/`modulPfad` unverändert. Kachel-Texte wörtlich aus
      // dem Auftrag übernommen (bei `bipartiteFlowMap` gegen dessen eigenen
      // Info-Button-Text geprüft: "Diese Ansicht zeigt, welche Orte mit
      // welchen thematischen Kategorien in Verbindung stehen..." - deckt
      // sich exakt mit dem im Auftrag gelieferten Kachel-Text, genauer als
      // die bisherige Kurzfassung).
      // Wunsch des Autors (2026-10-28): Ortsliste nach dem Vorbild der Personenliste
      { id: 'ortsliste', label: 'Ortsliste', modulPfad: '../viz/ortsliste.js',
        beschreibung: 'Durchsuchbare, sortierbare Liste aller Orte mit der Zahl ihrer Nennungen in Urkunden und Verlassenschaftsinventaren.' },
      { id: 'karte', label: 'Karte', modulPfad: '../viz/karte.js', datenSchluessel: 'urkunden',
        beschreibung: 'Alle in den Urkunden genannten Orte auf einer Karte, Größe = Häufigkeit der Nennung.' },
      { id: 'verbindungskarte', label: 'Verbindungskarte', modulPfad: '../viz/verbindungskarte.js', datenSchluessel: 'urkunden',
        beschreibung: 'Zeigt, welche Orte gemeinsam in derselben Urkunde genannt werden.' },
      { id: 'bipartiteFlowMap', label: 'Karte Soziale Gruppen', modulPfad: '../viz/bipartiteFlowMap.js',
        beschreibung: 'Zeigt, welche Orte mit welchen sozialen Gruppen (Dynastie/Adel/Klerus/Bürgertum) in Verbindung stehen.' }
    ]
  }
];
