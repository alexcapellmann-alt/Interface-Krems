// js/utils/kartenAusschnitt.js
// Kartenausschnitt beim Wechsel zwischen den Kartenansichten mitnehmen (Wunsch des Autors, 2026-10-28):
// Karte, Verbindungskarte und Bipartite Flow Map sind je eigene Leaflet-Karten, die beim Öffnen auf alle
// Orte zoomen. Wechselt man zwischen ihnen, soll der Ausschnitt stehen bleiben - nur die Zeichnung darüber
// ändert sich. Dafür merkt sich merkeAusschnitt() Mitte und Zoomstufe der aktuellen Karte; die nächste neu
// erzeugte Leaflet-Karte nimmt bei ihrer ersten Positionierung (fitBounds()/setView() des Moduls) stattdessen
// diesen Ausschnitt. Die Module selbst bleiben unverändert.

const karten = new Set();
let wunsch = null;
const WUNSCH_GUELTIG_MS = 8000; // die Karte entsteht teils erst nach dem Laden von orte.csv

if (window.L?.Map) {
  window.L.Map.addInitHook(function merkeUndUebernimm() {
    karten.add(this);
    this.on('unload', () => karten.delete(this));
    if (!wunsch || Date.now() - wunsch.zeit > WUNSCH_GUELTIG_MS) return;
    const { zentrum, zoom } = wunsch;
    wunsch = null;
    // Alle Positionierungen des Moduls in den ersten Sekunden ersetzen (die Karte setzt teils erst einen
    // Startpunkt und zoomt nach dem Laden der Orte noch einmal) - bis die Zeit um ist oder man selbst zieht,
    // zoomt oder scrollt; dann gelten wieder Leaflets eigene Funktionen.
    const original = { fitBounds: this.fitBounds, setView: this.setView };
    const ende = Date.now() + 4000;
    const zurueck = () => {
      this.fitBounds = original.fitBounds;
      this.setView = original.setView;
    };
    const ersetze = () => {
      if (Date.now() > ende) { zurueck(); return null; }
      return original.setView.call(this, zentrum, zoom, { animate: false });
    };
    this.fitBounds = function fitBoundsMitAusschnitt(...args) { return ersetze() || original.fitBounds.apply(this, args); };
    this.setView = function setViewMitAusschnitt(...args) { return ersetze() || original.setView.apply(this, args); };
    ['mousedown', 'wheel', 'touchstart', 'keydown'].forEach((art) => this.getContainer().addEventListener(art, zurueck, { once: true, capture: true }));
    setTimeout(zurueck, 4100);
  });
}

// Ausschnitt der Karte in `container` für die nächste neue Karte vormerken
export function merkeAusschnitt(container) {
  const karte = [...karten].find((k) => container?.contains(k.getContainer()));
  if (!karte || !karte._loaded) return;
  wunsch = { zentrum: karte.getCenter(), zoom: karte.getZoom(), zeit: Date.now() };
}
