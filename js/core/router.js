// js/core/router.js
// Vertrag: siehe Masterprompt Abschnitt 8.
//
// Hash-basierte Navigation, z.B.:
//   #bestand
//   #visualisierungen/urkunden
//   #visualisierungen/orte/karte
//   #visualisierungen/orte/ortsliste?datensatz=ort:Stein
//   #fuehrungen/ns-zeit
//
// Nachbesserung 2, Punkt 4 (2026-11-15, Prüfung 14.11.2026, Befund 2.2; Entscheidung des Autors): Der Router
// kennt state.js nicht mehr. Er zerlegt nur die Adresse und meldet jede Route an einen Rückruf, den app.js beim
// Start übergibt; app.js trägt die Route in state.js ein. So sind router.js, state.js und dataLoader.js
// voneinander unabhängig (Masterprompt Abschnitt 13.9).
//
// Nachbesserung 1 (2026-11-15, Prüfung 14.11.2026, Befund 8.2): Die im Masterprompt Abschnitt 7/8 geplanten
// Entity-Parameter der Adresse und der zugehörige Entity-Filter im Zustand wurden nie von einer Ansicht
// ausgewertet und sind entfernt. Kontext wird ausschließlich über ?datensatz=<typ>:<id> übergeben (js/utils/datensatzAufruf.js).

// Zerlegt einen Hash-String in Pfadsegmente und Filter-Parameter.
// Rein lesende Funktion, verändert nichts am Zustand – dadurch für sich
// alleine testbar (Abschnitt 13.9).
export function parseHash(hash) {
  const roh = (hash || '').replace(/^#\/?/, '');
  const [pfadTeil, queryTeil] = roh.split('?');
  const segmente = pfadTeil.split('/').filter(Boolean);
  const params = new URLSearchParams(queryTeil || '');

  return {
    tab: segmente[0] || null,
    segmente: segmente.slice(1),
    // AUFTRAG "Führungen, Teil 2b": Datensatzaufruf (Stufe 2, siehe
    // js/utils/datensatzAufruf.js), Format "<typ>:<id>" - bewusst NICHT über
    // state.js gespiegelt (nur diese Route soll die Quelle sein, siehe
    // PROJEKTLOG). baueHash() bleibt unverändert (kein Aufrufer davon baut
    // aktuell einen datensatz-Link - datensatzAufruf.js baut seine Links
    // selbst, siehe dortiger Kommentar), daher hier nur die Lesehälfte nötig.
    datensatz: params.get('datensatz'),
    // 2026-10-29: `unsicherheit=an` öffnet die Ansicht mit eingeschalteter Unsicherheitsdarstellung (Link aus der
    // Führung „Bürgerinnen?“ zur Ortsliste); wird in app.js nach dem Rendern angewandt
    unsicherheit: params.get('unsicherheit')
  };
}

// Baut aus Pfadsegmenten einen Hash-String.
export function baueHash(segmente) {
  return '#' + segmente.filter(Boolean).join('/');
}

// Startet den Router: meldet die aktuelle URL an beiRoute(route) und danach jede Hash-Änderung. Jeder
// Navigationsschritt über navigiereZu() bzw. direkte Hash-Änderungen erzeugt automatisch einen
// Browser-History-Eintrag (Standardverhalten von location.hash, siehe Abschnitt 8).
export function starteRouter(beiRoute) {
  window.addEventListener('hashchange', () => {
    beiRoute(parseHash(location.hash));
  });
  beiRoute(parseHash(location.hash || '#bestand'));
}

// Navigiert zu einer neuen Route. segmente z.B. ['visualisierungen', 'urkunden', 'karte'].
export function navigiereZu(segmente) {
  location.hash = baueHash(segmente);
}

export function aktuelleRoute() {
  return parseHash(location.hash);
}
