// js/utils/statischeKarte.js – Kartengrundlage für verbindungskarte.js und bipartiteFlowMap.js
// Zweck: bedienbare Leaflet-Karte (Name aus der ersten, unbeweglichen Fassung) und darüber eine SVG-Ebene mit festem
//   z-index (OVERLAY_Z_INDEX 450: über den Kacheln, unter den Werkzeugleisten der Aufrufer).
// Schnittstelle: baueStatischeKarte(mapDiv, koordinatenListe), erzeugeUeberlagerungsSvg(mapDiv, breite, hoehe,
//   { ariaLabel }), projiziere(karte, lat, lon) (gilt bis zur nächsten Kartenbewegung).
// Abhängigkeiten: Leaflet 1.9 (global), D3 v7. Die Aufrufer setzen ihre Elemente bei karte.on('zoom move') neu.
// Hintergrund (z-index-Fehler): docs/MODULNOTIZEN.md, Abschnitt statischeKarte.js.

import { kartenStartpunkt } from '../core/archivKonfiguration.js';

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
    // Nachbesserung 6, Punkte 1-2 (Befunde 6.1, 6.3): `group` statt `img` - die Kinder einer Grafik mit Rolle `img`
    // gelten als reine Darstellung; Chrome ließ die fokussierbaren Ortspunkte deshalb nicht fokussieren (focus()
    // ohne Wirkung), und axe meldete nested-interactive. Die Beschriftung bleibt.
    .attr('role', 'group')
    .attr('aria-label', ariaLabel || '');
}

// Punkt 1 (siehe docs/MODULNOTIZEN.md): keine eigenen Interaktions-Optionen
// mehr - `L.map(mapDiv)` ohne Options-Objekt nutzt Leaflets normale
// Standardwerte (Dragging/Scroll-Zoom/Doppelklick-Zoom/Zoom-Buttons etc. alle
// aktiv), exakt "Standard-Leaflet-Interaktion, kein Sonderverhalten" (Auftrag
// wörtlich).
//
// Nachbesserung 2, Punkt 3 (2026-11-15, Prüfung 14.11.2026, Befund 6.9): Bei prefers-reduced-motion: reduce
// springt die Karte ohne Zwischenbilder (Zoom, Einblenden, Nachgleiten nach dem Ziehen); die Interaktionen
// selbst bleiben unverändert. Ohne diese Einstellung gelten wie bisher Leaflets Standardwerte.
export function baueStatischeKarte(mapDiv, koordinatenListe) {
  const ohneBewegung = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const karte = L.map(mapDiv, ohneBewegung
    ? { zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false, inertia: false }
    : {});

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
  }).addTo(karte);

  if (koordinatenListe.length > 0) {
    karte.fitBounds(L.latLngBounds(koordinatenListe.map((k) => [k.lat, k.lon])), { padding: [40, 40] });
  } else {
    // AUFTRAG "Archivspezifische Texte...", Punkt 2.8: Kartenstartpunkt aus
    // archiv.csv. AUFTRAG C1, Punkt 5: ohne Angabe eine Weltübersicht statt
    // eines festen Ersatzorts.
    const start = kartenStartpunkt();
    if (start) karte.setView(start.zentrum, start.zoom);
    else karte.setView([0, 0], 2);
  }
  return karte;
}

export function projiziere(karte, lat, lon) {
  const punkt = karte.latLngToContainerPoint([lat, lon]);
  return { x: punkt.x, y: punkt.y };
}
