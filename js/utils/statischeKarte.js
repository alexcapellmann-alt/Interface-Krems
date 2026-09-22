// js/utils/statischeKarte.js
// Gemeinsame Grundlage für ortsbasierte Netz-Diagramme (verbindungskarte.js,
// bipartiteFlowMap.js), die zusätzlich zu echten Koordinaten auch feste,
// nicht-geografische Bezugspunkte brauchen (z.B. die Kategorie-Spalte in
// bipartiteFlowMap.js, siehe Masterprompt Abschnitt 8a/v4.3).
//
// ERGÄNZUNGSAUFTRAG "Karten navigierbar machen": der Dateiname ist seit
// diesem Auftrag ein Stück weit irreführend geworden - der Kartenausschnitt
// war ursprünglich bewusst UNBEWEGLICH (kein Pan/Zoom, siehe frühere Fassung
// dieses Kommentars/PROJEKTLOG.md), damit sich Bildschirm-Positionen
// einmalig berechnen ließen. Jetzt liefert baueStatischeKarte() STANDARD-
// interaktives Leaflet (Zoom per Scrollen, Verschieben per Ziehen, wie
// karte.js) - Bildschirm-Positionen (projiziere(), via
// `latLngToContainerPoint()`) ändern sich dadurch bei jeder Kartenbewegung.
// Die AUFRUFER (nicht dieser Baustein) sind dafür verantwortlich, ihre
// SVG-Overlay-Elemente bei `karte.on('zoom move', ...)` neu zu positionieren
// - dieser Baustein kennt die konkreten Overlay-Elemente der Aufrufer nicht
// (nur `erzeugeUeberlagerungsSvg()` unten, das reine Grundgerüst). Datei
// bewusst NICHT umbenannt (Nicht-Ziel: minimale, gezielte Änderung statt
// Umbenennungs-Aufräumaktion mit Auswirkung auf alle Importe).
//
// REGRESSIONSSCHUTZ: aktuell genutzt von verbindungskarte.js, bipartiteFlowMap.js.
//
// KORREKTURAUFTRAG "SVG-Overlay z-index setzen": beide Aufrufer bauten ihr
// SVG-Overlay bislang unabhängig voneinander SELBST (`d3.select(mapDiv)
// .append('svg')...`), beide OHNE explizites z-index - Root-Cause des
// vorigen Diagnoseauftrags ("Verbindungslinien verschwinden sofort nach dem
// Laden"): ein positioniertes Element ohne eigenes z-index (= `auto`) liegt
// in der CSS-Stapelreihenfolge IMMER unter jedem Geschwister mit explizitem,
// positivem z-index, unabhängig von der DOM-Reihenfolge - Leaflets eigene
// `.leaflet-map-pane` (die die Kachel-Ebene enthält) hat z-index:400, das
// SVG-Overlay lag also dauerhaft darunter, sobald die Kacheln tatsächlich
// geladen waren (vorher, während die Kachel-Ebene noch leer/transparent war,
// blieb es sichtbar - daher der "kurz sichtbar, dann weg"-Effekt).
// erzeugeUeberlagerungsSvg() (neu, unten) bündelt den Fix EINMALIG - beide
// Aufrufer ersetzen nur ihre eigene `d3.select(mapDiv).append('svg')...`-Zeile
// durch einen Aufruf dieser Funktion, der Rest ihres D3-Zeichen-Codes
// (weitere `.append()`/`.selectAll()`-Ketten auf der zurückgegebenen
// Selection) bleibt unverändert - kein Umbau der bestehenden Aufrufer nötig.
// OVERLAY_Z_INDEX (450) liegt bewusst über Leaflets höchstem verwendeten
// Pane-Wert hier (`.leaflet-map-pane`, 400) und unter der eigenen
// Werkzeugleiste/dem Info-Button beider Module (dortiges z-index:900, siehe
// jeweiliger Dateikopf-Kommentar) - Popover/Werkzeugleiste bleiben also
// weiterhin über allem.
const OVERLAY_Z_INDEX = 450;

// Baut das transparente SVG-Overlay über einer per baueStatischeKarte()
// erzeugten Karte - IMMER mit explizitem z-index (s.o.), damit es dauerhaft
// über Leaflets Kachel-Ebene sichtbar bleibt. Gibt die D3-Selection zurück,
// der Aufrufer hängt seine eigenen Linien/Bögen/Bänder wie gewohnt per
// `.append()`/`.selectAll()` daran.
export function erzeugeUeberlagerungsSvg(mapDiv, breite, hoehe, { ariaLabel } = {}) {
  return d3.select(mapDiv).append('svg')
    .attr('width', breite).attr('height', hoehe)
    .style('position', 'absolute').style('top', 0).style('left', 0)
    .style('z-index', OVERLAY_Z_INDEX)
    .style('pointer-events', 'none')
    .attr('role', 'img')
    .attr('aria-label', ariaLabel || '');
}

// Punkt 1 (siehe Dateikopf-Kommentar): keine eigenen Interaktions-Optionen
// mehr - `L.map(mapDiv)` ohne Options-Objekt nutzt Leaflets normale
// Standardwerte (Dragging/Scroll-Zoom/Doppelklick-Zoom/Zoom-Buttons etc. alle
// aktiv), exakt "Standard-Leaflet-Interaktion, kein Sonderverhalten" (Auftrag
// wörtlich).
export function baueStatischeKarte(mapDiv, koordinatenListe) {
  const karte = L.map(mapDiv);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
  }).addTo(karte);

  if (koordinatenListe.length > 0) {
    karte.fitBounds(L.latLngBounds(koordinatenListe.map((k) => [k.lat, k.lon])), { padding: [40, 40] });
  } else {
    karte.setView([48.42, 15.6], 7);
  }
  return karte;
}

export function projiziere(karte, lat, lon) {
  const punkt = karte.latLngToContainerPoint([lat, lon]);
  return { x: punkt.x, y: punkt.y };
}
