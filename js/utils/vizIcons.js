// js/utils/vizIcons.js
// AUFTRAG "Navigation – Permanente Bereichs-Leiste & Visualisierungs-Galerie
// (Pilot: Urkunden)", Punkt 3: eine kleine, generische SVG-Grafik je
// Diagrammtyp, die dessen Struktur schematisch andeutet - UNABHÄNGIG von
// echten Projektdaten (Auftrag, wörtlich). Icon-Konzept siehe Selbstauskunft/
// Vorschau-Widget im damaligen Chat (Freigabe erhalten).
//
// Baustein-Muster (Abschnitt 5): eine Funktion (erzeugeVizIcon()) baut ein
// <svg>-Element aus einer je Ansicht-ID hinterlegten, rein statischen
// Markup-Zeichenkette (IKONEN unten) - kein Bezug zu echten Datensätzen, rein
// dekorativ (aria-hidden). `currentColor` für alle Formen, damit die Icons
// automatisch die Textfarbe der jeweiligen Kachel übernehmen (Light/Dark-
// Modus-tauglich ohne eigene Farblogik, siehe visualisierungsGalerie.js).
//
// Absichtlich EIN gemeinsames Modul statt 21 Einzeldateien (Auftrag nennt
// zwar "Icon-Bausteine" im Plural, gemeint ist aber "ein Icon-Vorschlag je
// Modul", nicht zwingend 21 Dateien) - entspricht der im Projekt etablierten
// "eine gemeinsame Utility-Datei" Konvention (vgl. beschriftung.js,
// tooltip.js) statt Datei-Fragmentierung ohne inhaltlichen Mehrwert.
//
// Unterscheidbarkeits-Leitprinzip (siehe Selbstauskunft): ähnliche
// Diagrammfamilien bekommen bewusst UNTERSCHIEDLICHE Kompositionsmerkmale,
// nicht nur unterschiedliche Farben (die Icons sind ohnehin einfarbig):
// - Punktreihen: Zeitachse (eine Linie, Punkte darauf) vs. Dot Plot (lose
//   Punktreihen ohne Linie) vs. Swimlanes (durchgezogene Balken-"Bahnen").
// - Geschichtete Flächen: Streamgraph (organisch wellig) vs. Ridgeline
//   (gestapelte Bergsilhouetten) vs. Horizon Chart (gerade geschichtete
//   Bänder).
// - Fluss zwischen Spalten: Sankey (2 Spalten, kreuzende Bänder) vs. Alluvial
//   (3 Spalten) vs. Bipartite Flow Map (2 Spalten, gerade Linien + kleiner
//   Karten-Pin als Geo-Hinweis).
// - Matrix/Netzwerk: Adjazenzmatrix (Raster, gefüllte Zellen) vs.
//   Korrelationsmatrix (Raster, unterschiedlich große Kreise) vs. Chord
//   (Kreis mit Sehnen) vs. Arc (eine Linie mit Bögen darüber).
// - Karten: Karte (Umriss + Punkte) vs. Verbindungskarte (Umriss +
//   gestrichelter Verbindungsbogen).
//
// FOLGEAUFTRAG "...Galerie-Muster für Bestand", Punkt 2: fünf neue Icons für
// die Bestandsvisualisierungen - alle fünf zeigen dieselbe Hierarchie
// (Kategorie -> Unterkategorie -> Bestand), aber mit klar unterschiedlicher
// geometrischer Kodierung, damit sie trotz gemeinsamer Datengrundlage nicht
// verwechselbar sind:
// - Treemap: verschachtelte Rechtecke unterschiedlicher Größe (Fläche).
// - Sunburst: dieselbe Hierarchie radial (konzentrische Ringsegmente).
// - Icicle: dieselbe Hierarchie als gestapelte, sich nach unten aufteilende
//   Balkenreihen (Breite = Unterteilung, nicht Fläche wie bei Treemap).
// - Circle Packing: dieselbe Hierarchie als ineinander verschachtelte Kreise
//   statt Rechtecke.
// - Gantt-Diagramm fällt aus dieser Hierarchie-Familie heraus (zeitbasiert,
//   nicht hierarchisch) - horizontale Balken unterschiedlicher Länge auf
//   einer Zeitachse, klar vom Vier-Formen-Hierarchie-Satz unterscheidbar.
//
// FOLGEAUFTRAG "Parallelkoordinaten-Anpassung + neue Visualisierung
// 'Vermögensschichtung'": ein neues Icon für die neue Visualisierung
// (`vermoegensschichtung`) - Auftrags-Vorschlag "Drei kleine Gruppen
// gestapelter Rechtecke unterschiedlicher Höhe nebeneinander" direkt
// übernommen (Andeutung der drei Kleinmultiples-Panels, jedes mit
// unterschiedlich hohen Balken).
//
// FOLGEAUFTRAG "Marimekko für Verlassenschaften": eigenes Icon
// `marimekkoVerlassenschaften`, bewusst UNTERSCHEIDBAR vom bestehenden
// `marimekko`-Icon (beide zeigen unterschiedlich breite gestapelte Spalten,
// dasselbe Grundmotiv der Diagrammfamilie) - hier zusätzlich ein gestricheltes
// (nicht gefülltes) oberstes Segment je Spalte, als Andeutung des
// "Rest/nicht erfasst"-Schraffur-Segments, das dieses Modul (anders als das
// bestehende marimekko.js) tatsächlich zeichnet.
//
// FOLGEAUFTRAG "Galerie+Flyout für Bürgerbuch und Personen": sechs neue
// Icons (fünf beauftragt, plus `bubbleChart` selbst ergänzt - siehe
// archivalienRegistry.js' Kommentar dort zur fehlenden Kachel-Text-Vorgabe;
// ohne eigenes Icon würde es in der jetzt öffentlichen Personen-Galerie mit
// dem generischen Drei-Punkte-Fallback auffallen):
// - Trellis: acht Mini-Balkendiagramme im Raster (Klein-Multiples).
// - Bump Chart: zwei Punktspalten mit sich kreuzenden geraden Linien
//   (Rangfolge-Wechsel) - bewusst GERADE Linien statt Kurven, damit es sich
//   von Sankey/Alluvial (kreuzende KURVEN) unterscheidet.
// - Personennetzwerk: unregelmäßiges Knoten-Kanten-Netzwerk - bewusst KEINE
//   feste Spaltenstruktur (anders als bipartiteFlowMap) und KEIN Raster
//   (anders als adjazenzmatrix), da es hier um ein echtes, "loses" Netzwerk
//   geht, nicht um eine geordnete Beziehungsmatrix.
// - Habsburg-Zeitleistenbaum: eine senkrechte Stammlinie mit unterschiedlich
//   langen, versetzten vertikalen Balken (Herrschaftszeiten) - bewusst
//   VERTIKALE Balken auf einer VERTIKALEN Achse, zur klaren Abgrenzung von
//   Gantt-Diagramm (horizontale Balken auf horizontaler Achse).
// - Personenliste: schlichtes Listen-Symbol (Aufzählungspunkt + Zeile je
//   Reihe) - bewusst das einzige rein textbasierte/tabellarische Icon im
//   Satz, analog zu regestenKachelraster's Kachel-Charakter, aber als
//   Liste statt als Karten-Raster.
// - Bubble Chart: lose geclusterte, unterschiedlich große Kreise OHNE
//   umschließenden Rahmenkreis - Abgrenzung zu Bestands-circlePacking
//   (das bewusst EINEN äußeren Rahmenkreis je Kategorie zeigt, um die
//   Hierarchie anzudeuten): bubbleChart.js ist flach/nicht-hierarchisch.

const IKONEN = {
  regestenKachelraster: '<rect x="4" y="4" width="16" height="14" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><rect x="24" y="4" width="16" height="14" rx="2"/><line x1="27" y1="8" x2="37" y2="8"/><rect x="44" y="4" width="16" height="14" rx="2"/><line x1="47" y1="8" x2="57" y2="8"/><rect x="4" y="22" width="16" height="14" rx="2"/><line x1="7" y1="26" x2="17" y2="26"/><rect x="24" y="22" width="16" height="14" rx="2"/><line x1="27" y1="26" x2="37" y2="26"/><rect x="44" y="22" width="16" height="14" rx="2"/><line x1="47" y1="26" x2="57" y2="26"/>',
  zeitachse: '<line x1="4" y1="22" x2="60" y2="22"/><circle cx="12" cy="22" r="3" fill="currentColor" stroke="none"/><circle cx="24" cy="22" r="3" fill="currentColor" stroke="none"/><circle cx="34" cy="22" r="3" fill="currentColor" stroke="none"/><circle cx="48" cy="22" r="3" fill="currentColor" stroke="none"/><circle cx="56" cy="22" r="3" fill="currentColor" stroke="none"/>',
  kalenderHeatmap: '<g fill="currentColor" stroke="none"><rect x="8" y="4" width="9" height="9" opacity="0.15"/><rect x="20" y="4" width="9" height="9" opacity="0.85"/><rect x="32" y="4" width="9" height="9" opacity="0.4"/><rect x="44" y="4" width="9" height="9" opacity="0.6"/><rect x="8" y="16" width="9" height="9" opacity="0.6"/><rect x="20" y="16" width="9" height="9" opacity="0.15"/><rect x="32" y="16" width="9" height="9" opacity="0.85"/><rect x="44" y="16" width="9" height="9" opacity="0.3"/><rect x="8" y="28" width="9" height="9" opacity="0.4"/><rect x="20" y="28" width="9" height="9" opacity="0.7"/><rect x="32" y="28" width="9" height="9" opacity="0.2"/><rect x="44" y="28" width="9" height="9" opacity="0.9"/></g>',
  dotPlot: '<g fill="currentColor" stroke="none"><circle cx="10" cy="10" r="3"/><circle cx="22" cy="10" r="3"/><circle cx="38" cy="10" r="3"/><circle cx="14" cy="22" r="3"/><circle cx="30" cy="22" r="3"/><circle cx="50" cy="22" r="3"/><circle cx="18" cy="34" r="3"/><circle cx="34" cy="34" r="3"/><circle cx="46" cy="34" r="3"/></g>',
  swimlanes: '<g fill="currentColor" stroke="none"><rect x="4" y="5" width="56" height="9" rx="1.5" opacity="0.5"/><rect x="4" y="18" width="56" height="9" rx="1.5" opacity="0.5"/><rect x="4" y="31" width="56" height="9" rx="1.5" opacity="0.5"/></g><g stroke="var(--surface,#fff)"><line x1="10" y1="9.5" x2="20" y2="9.5"/><line x1="30" y1="9.5" x2="44" y2="9.5"/><line x1="16" y1="22.5" x2="34" y2="22.5"/><line x1="14" y1="35.5" x2="26" y2="35.5"/><line x1="38" y1="35.5" x2="52" y2="35.5"/></g>',
  streamgraph: '<path fill="currentColor" stroke="none" opacity="0.6" d="M4,22 C14,10 20,30 30,18 C40,8 46,28 60,20 L60,26 C46,34 40,14 30,24 C20,36 14,16 4,28 Z"/>',
  ridgeline: '<path opacity="0.9" d="M4,36 Q16,10 28,36"/><path opacity="0.65" d="M14,40 Q26,16 38,40"/><path opacity="0.4" d="M24,44 Q38,20 50,44"/>',
  horizonChart: '<g fill="currentColor" stroke="none"><rect x="8" y="8" width="48" height="6" opacity="0.2"/><rect x="8" y="16" width="48" height="6" opacity="0.45"/><rect x="8" y="24" width="48" height="6" opacity="0.7"/><rect x="8" y="32" width="48" height="6" opacity="0.95"/></g>',
  marimekko: '<g fill="currentColor" stroke="none"><rect x="4" y="4" width="22" height="16" opacity="0.7"/><rect x="4" y="22" width="22" height="18" opacity="0.35"/><rect x="28" y="4" width="12" height="30" opacity="0.5"/><rect x="42" y="4" width="18" height="10" opacity="0.85"/><rect x="42" y="16" width="18" height="18" opacity="0.25"/></g>',
  alluvial: '<line x1="6" y1="8" x2="6" y2="18"/><line x1="6" y1="24" x2="6" y2="34"/><line x1="32" y1="6" x2="32" y2="16"/><line x1="32" y1="22" x2="32" y2="30"/><line x1="32" y1="34" x2="32" y2="38"/><line x1="58" y1="10" x2="58" y2="24"/><line x1="58" y1="28" x2="58" y2="36"/><path opacity="0.6" d="M6,13 C19,13 19,11 32,11"/><path opacity="0.6" d="M6,29 C19,29 19,26 32,26"/><path opacity="0.6" d="M32,11 C45,11 45,17 58,17"/><path opacity="0.6" d="M32,36 C45,36 45,32 58,32"/>',
  parallelKoordinaten: '<line x1="10" y1="4" x2="10" y2="40"/><line x1="26" y1="4" x2="26" y2="40"/><line x1="42" y1="4" x2="42" y2="40"/><line x1="58" y1="4" x2="58" y2="40"/><path d="M10,12 L26,28 L42,10 L58,24"/><path d="M10,30 L26,10 L42,32 L58,14"/>',
  karte: '<path d="M6,20 C4,10 18,4 28,10 C40,4 58,10 56,22 C60,32 46,40 34,34 C22,42 6,34 6,20 Z"/><circle cx="22" cy="18" r="2.5" fill="currentColor" stroke="none"/><circle cx="38" cy="24" r="2.5" fill="currentColor" stroke="none"/><circle cx="30" cy="30" r="2.5" fill="currentColor" stroke="none"/>',
  verbindungskarte: '<path d="M6,22 C4,12 18,6 28,12 C40,6 58,12 56,24 C60,34 46,42 34,36 C22,44 6,36 6,22 Z"/><circle cx="16" cy="20" r="2.5" fill="currentColor" stroke="none"/><circle cx="46" cy="26" r="2.5" fill="currentColor" stroke="none"/><path stroke-dasharray="2,2" d="M16,20 Q31,4 46,26"/>',
  bipartiteFlowMap: '<circle cx="10" cy="10" r="2.5" fill="currentColor" stroke="none"/><circle cx="10" cy="22" r="2.5" fill="currentColor" stroke="none"/><circle cx="10" cy="34" r="2.5" fill="currentColor" stroke="none"/><circle cx="46" cy="10" r="2.5" fill="currentColor" stroke="none"/><circle cx="46" cy="22" r="2.5" fill="currentColor" stroke="none"/><circle cx="46" cy="34" r="2.5" fill="currentColor" stroke="none"/><line x1="10" y1="10" x2="46" y2="22"/><line x1="10" y1="22" x2="46" y2="10"/><line x1="10" y1="34" x2="46" y2="22"/><path opacity="0.6" d="M53,4 C58,4 58,10 53,12 C48,10 48,4 53,4 Z"/>',
  adjazenzmatrix: '<g fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" opacity="0.15"/><rect x="18" y="6" width="12" height="12" opacity="0.8"/><rect x="30" y="6" width="12" height="12" opacity="0.35"/><rect x="42" y="6" width="12" height="12" opacity="0.6"/><rect x="6" y="18" width="12" height="12" opacity="0.8"/><rect x="18" y="18" width="12" height="12" opacity="0.15"/><rect x="30" y="18" width="12" height="12" opacity="0.9"/><rect x="42" y="18" width="12" height="12" opacity="0.3"/><rect x="6" y="30" width="12" height="12" opacity="0.4"/><rect x="18" y="30" width="12" height="12" opacity="0.9"/><rect x="30" y="30" width="12" height="12" opacity="0.15"/><rect x="42" y="30" width="12" height="12" opacity="0.7"/></g>',
  chordDiagramm: '<circle cx="32" cy="22" r="17"/><path opacity="0.8" d="M18,12 Q32,22 20,34"/><path opacity="0.8" d="M46,12 Q32,22 44,34"/><path opacity="0.6" d="M32,5 Q26,22 46,30"/>',
  arcDiagramm: '<line x1="4" y1="34" x2="60" y2="34"/><g fill="currentColor" stroke="none"><circle cx="10" cy="34" r="2.5"/><circle cx="24" cy="34" r="2.5"/><circle cx="36" cy="34" r="2.5"/><circle cx="50" cy="34" r="2.5"/><circle cx="58" cy="34" r="2.5"/></g><path opacity="0.8" d="M10,34 Q17,16 24,34"/><path opacity="0.6" d="M24,34 Q43,4 58,34"/><path opacity="0.8" d="M36,34 Q43,20 50,34"/>',
  sankey: '<g fill="currentColor" stroke="none"><rect x="4" y="4" width="6" height="10"/><rect x="4" y="18" width="6" height="8"/><rect x="4" y="30" width="6" height="10"/><rect x="54" y="6" width="6" height="14"/><rect x="54" y="24" width="6" height="14"/></g><path opacity="0.6" d="M10,6 C30,6 30,10 54,10"/><path opacity="0.6" d="M10,20 C30,20 30,14 54,14"/><path opacity="0.6" d="M10,32 C30,32 30,30 54,30"/>',
  korrelationsmatrix: '<g fill="currentColor" stroke="none"><circle cx="13" cy="10" r="2.5" opacity="0.9"/><circle cx="25" cy="10" r="4.5" opacity="0.6"/><circle cx="37" cy="10" r="2" opacity="0.3"/><circle cx="49" cy="10" r="3.5" opacity="0.7"/><circle cx="13" cy="22" r="4.5" opacity="0.6"/><circle cx="25" cy="22" r="2.5" opacity="0.9"/><circle cx="37" cy="22" r="3.5" opacity="0.7"/><circle cx="49" cy="22" r="2" opacity="0.3"/><circle cx="13" cy="34" r="2" opacity="0.3"/><circle cx="25" cy="34" r="3.5" opacity="0.7"/><circle cx="37" cy="34" r="2.5" opacity="0.9"/><circle cx="49" cy="34" r="4.5" opacity="0.6"/></g>',
  wortwolke: '<g fill="currentColor" stroke="none"><rect x="6" y="18" width="20" height="7" rx="3.5" opacity="0.85"/><rect x="28" y="8" width="30" height="9" rx="4.5" opacity="0.6"/><rect x="10" y="30" width="16" height="6" rx="3" opacity="0.4"/><rect x="30" y="22" width="14" height="6" rx="3" opacity="0.7"/><rect x="46" y="22" width="12" height="6" rx="3" opacity="0.3"/><rect x="26" y="32" width="22" height="6" rx="3" opacity="0.5"/></g>',
  treemap: '<g fill="currentColor" stroke="none"><rect x="4" y="4" width="26" height="18" opacity="0.65"/><rect x="4" y="22" width="26" height="18" opacity="0.3"/><rect x="30" y="4" width="30" height="12" opacity="0.5"/><rect x="30" y="16" width="16" height="12" opacity="0.8"/><rect x="46" y="16" width="14" height="12" opacity="0.25"/><rect x="30" y="28" width="30" height="12" opacity="0.55"/></g>',
  sunburst: '<circle cx="32" cy="22" r="8"/><circle cx="32" cy="22" r="17"/><line x1="32" y1="5" x2="32" y2="39"/><line x1="15" y1="22" x2="49" y2="22"/><line x1="20" y1="10" x2="44" y2="34"/><line x1="44" y1="10" x2="20" y2="34"/>',
  icicle: '<g fill="currentColor" stroke="none"><rect x="4" y="4" width="56" height="8" opacity="0.5"/><rect x="4" y="14" width="30" height="8" opacity="0.7"/><rect x="36" y="14" width="24" height="8" opacity="0.3"/><rect x="4" y="24" width="14" height="8" opacity="0.85"/><rect x="20" y="24" width="12" height="8" opacity="0.4"/><rect x="36" y="24" width="10" height="8" opacity="0.6"/><rect x="48" y="24" width="12" height="8" opacity="0.2"/></g>',
  circlePacking: '<circle cx="32" cy="22" r="18"/><g fill="currentColor" stroke="none"><circle cx="22" cy="16" r="8" opacity="0.5"/><circle cx="39" cy="13" r="6" opacity="0.7"/><circle cx="24" cy="31" r="6" opacity="0.3"/><circle cx="41" cy="29" r="7" opacity="0.6"/><circle cx="34" cy="20" r="3" opacity="0.9"/></g>',
  ganttDiagramm: '<line x1="4" y1="4" x2="4" y2="40"/><g fill="currentColor" stroke="none"><rect x="8" y="6" width="24" height="6" rx="2" opacity="0.7"/><rect x="20" y="16" width="34" height="6" rx="2" opacity="0.5"/><rect x="8" y="26" width="14" height="6" rx="2" opacity="0.8"/><rect x="30" y="36" width="26" height="6" rx="2" opacity="0.4"/></g>',
  trellis: '<g fill="currentColor" stroke="none"><rect x="3" y="14" width="3" height="6" opacity="0.8"/><rect x="7" y="10" width="3" height="10" opacity="0.5"/><rect x="11" y="16" width="3" height="4" opacity="0.65"/><rect x="18" y="12" width="3" height="8" opacity="0.6"/><rect x="22" y="8" width="3" height="12" opacity="0.85"/><rect x="26" y="15" width="3" height="5" opacity="0.4"/><rect x="33" y="16" width="3" height="4" opacity="0.5"/><rect x="37" y="9" width="3" height="11" opacity="0.7"/><rect x="41" y="13" width="3" height="7" opacity="0.9"/><rect x="48" y="11" width="3" height="9" opacity="0.75"/><rect x="52" y="15" width="3" height="5" opacity="0.3"/><rect x="56" y="8" width="3" height="12" opacity="0.6"/><rect x="3" y="34" width="3" height="6" opacity="0.6"/><rect x="7" y="30" width="3" height="10" opacity="0.9"/><rect x="11" y="36" width="3" height="4" opacity="0.4"/><rect x="18" y="32" width="3" height="8" opacity="0.7"/><rect x="22" y="28" width="3" height="12" opacity="0.5"/><rect x="26" y="35" width="3" height="5" opacity="0.85"/><rect x="33" y="36" width="3" height="4" opacity="0.6"/><rect x="37" y="29" width="3" height="11" opacity="0.4"/><rect x="41" y="33" width="3" height="7" opacity="0.75"/><rect x="48" y="31" width="3" height="9" opacity="0.5"/><rect x="52" y="35" width="3" height="5" opacity="0.9"/><rect x="56" y="28" width="3" height="12" opacity="0.65"/></g>',
  bumpChart: '<g fill="currentColor" stroke="none"><circle cx="8" cy="8" r="3"/><circle cx="8" cy="18" r="3"/><circle cx="8" cy="28" r="3"/><circle cx="8" cy="38" r="3"/><circle cx="56" cy="8" r="3"/><circle cx="56" cy="18" r="3"/><circle cx="56" cy="28" r="3"/><circle cx="56" cy="38" r="3"/></g><path d="M8,8 L56,28"/><path d="M8,18 L56,8"/><path d="M8,28 L56,38"/><path d="M8,38 L56,18"/>',
  personennetzwerk: '<g fill="currentColor" stroke="none"><circle cx="14" cy="10" r="3"/><circle cx="32" cy="6" r="3"/><circle cx="50" cy="12" r="3"/><circle cx="10" cy="28" r="3"/><circle cx="30" cy="24" r="3"/><circle cx="48" cy="30" r="3"/><circle cx="24" cy="38" r="3"/></g><path d="M14,10 L32,6"/><path d="M32,6 L50,12"/><path d="M14,10 L10,28"/><path d="M32,6 L30,24"/><path d="M30,24 L10,28"/><path d="M30,24 L48,30"/><path d="M30,24 L24,38"/><path d="M10,28 L24,38"/>',
  familienbaum: '<line x1="8" y1="4" x2="8" y2="40"/><g fill="currentColor" stroke="none"><rect x="14" y="4" width="4" height="10" opacity="0.8"/><rect x="22" y="8" width="4" height="14" opacity="0.5"/><rect x="30" y="14" width="4" height="8" opacity="0.7"/><rect x="38" y="18" width="4" height="16" opacity="0.6"/><rect x="46" y="26" width="4" height="10" opacity="0.4"/><rect x="54" y="30" width="4" height="8" opacity="0.85"/></g><path d="M8,9 L14,9"/><path d="M8,15 L22,15"/><path d="M8,18 L30,18"/><path d="M8,26 L38,26"/><path d="M8,31 L46,31"/><path d="M8,34 L54,34"/>',
  personenliste: '<g fill="currentColor" stroke="none"><circle cx="7" cy="8" r="2"/><circle cx="7" cy="18" r="2"/><circle cx="7" cy="28" r="2"/><circle cx="7" cy="38" r="2"/></g><line x1="16" y1="8" x2="58" y2="8"/><line x1="16" y1="18" x2="52" y2="18"/><line x1="16" y1="28" x2="56" y2="28"/><line x1="16" y1="38" x2="48" y2="38"/>',
  bubbleChart: '<g fill="currentColor" stroke="none"><circle cx="16" cy="18" r="10" opacity="0.5"/><circle cx="34" cy="12" r="6" opacity="0.7"/><circle cx="46" cy="24" r="8" opacity="0.4"/><circle cx="28" cy="30" r="5" opacity="0.85"/><circle cx="14" cy="34" r="4" opacity="0.6"/><circle cx="54" cy="12" r="3" opacity="0.9"/><circle cx="40" cy="36" r="3.5" opacity="0.3"/></g>',
  vermoegensschichtung: '<g fill="currentColor" stroke="none"><rect x="2" y="26" width="4" height="14" opacity="0.9"/><rect x="8" y="18" width="4" height="22" opacity="0.6"/><rect x="14" y="32" width="4" height="8" opacity="0.75"/><rect x="24" y="22" width="4" height="18" opacity="0.9"/><rect x="30" y="30" width="4" height="10" opacity="0.6"/><rect x="36" y="16" width="4" height="24" opacity="0.75"/><rect x="46" y="32" width="4" height="8" opacity="0.9"/><rect x="52" y="20" width="4" height="20" opacity="0.6"/><rect x="58" y="26" width="4" height="14" opacity="0.75"/></g>',
  marimekkoVerlassenschaften: '<g fill="currentColor" stroke="none"><rect x="2" y="20" width="6" height="20" opacity="0.55"/><rect x="10" y="16" width="7" height="24" opacity="0.7"/><rect x="19" y="24" width="5" height="16" opacity="0.4"/><rect x="26" y="10" width="19" height="30" opacity="0.6"/><rect x="47" y="14" width="15" height="26" opacity="0.85"/></g><g fill="none" stroke-dasharray="2,1.5"><rect x="2" y="4" width="6" height="16"/><rect x="10" y="4" width="7" height="12"/><rect x="19" y="4" width="5" height="20"/><rect x="26" y="4" width="19" height="6"/><rect x="47" y="4" width="15" height="10"/></g>'
};

// Fallback für eine Ansicht-ID ohne hinterlegtes Icon (z.B. ein künftiges,
// noch nicht in IKONEN eingetragenes Modul) - drei Punkte statt eines leeren
// Kachel-Bereichs (Abschnitt 12: nie stillschweigend leer).
const FALLBACK_IKONE = '<circle cx="22" cy="22" r="3" fill="currentColor" stroke="none"/><circle cx="32" cy="22" r="3" fill="currentColor" stroke="none"/><circle cx="42" cy="22" r="3" fill="currentColor" stroke="none"/>';

export function erzeugeVizIcon(ansichtId) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 64 44');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.innerHTML = IKONEN[ansichtId] || FALLBACK_IKONE;
  return svg;
}
