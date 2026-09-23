// js/core/router.js
// Vertrag: siehe Masterprompt Abschnitt 8.
//
// Hash-basierte Navigation, z.B.:
//   #bestand
//   #visualisierungen/urkunden
//   #visualisierungen/urkunden/karte
//   #visualisierungen/urkunden/karte?entity_typ=ort&entity_wert=Stein
//   #fuehrungen/ns-zeit
//
// Der Router liest/schreibt ausschließlich über die state.js-Funktionen
// (Zugriffsregel Abschnitt 7) – nie direkt am internen Zustandsobjekt.

import {
  setAktiverTab,
  setAktiveAnsicht,
  setFilterEntity,
  clearFilterEntity
} from './state.js';

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
    entityTyp: params.get('entity_typ'),
    entityWert: params.get('entity_wert'),
    // AUFTRAG "Führungen, Teil 2b": Datensatzaufruf (Stufe 2, siehe
    // js/utils/datensatzAufruf.js), Format "<typ>:<id>" - bewusst NICHT über
    // state.js gespiegelt (nur diese Route soll die Quelle sein, siehe
    // PROJEKTLOG). baueHash() bleibt unverändert (kein Aufrufer davon baut
    // aktuell einen datensatz-Link - datensatzAufruf.js baut seine Links
    // selbst, siehe dortiger Kommentar), daher hier nur die Lesehälfte nötig.
    datensatz: params.get('datensatz')
  };
}

// Baut aus Pfadsegmenten und optionalem Entity-Filter einen Hash-String.
export function baueHash(segmente, entityFilter) {
  let hash = '#' + segmente.filter(Boolean).join('/');
  if (entityFilter && entityFilter.typ && entityFilter.wert) {
    const params = new URLSearchParams({
      entity_typ: entityFilter.typ,
      entity_wert: entityFilter.wert
    });
    hash += '?' + params.toString();
  }
  return hash;
}

function wendeRouteAufZustandAn(route) {
  setAktiverTab(route.tab);
  const letztesSegment = route.segmente[route.segmente.length - 1] || null;
  setAktiveAnsicht(letztesSegment);

  if (route.entityTyp && route.entityWert) {
    setFilterEntity(route.entityTyp, route.entityWert);
  } else {
    clearFilterEntity();
  }
}

// Startet den Router: übernimmt die aktuelle URL in den Zustand und reagiert
// danach auf jede Hash-Änderung. Jeder Navigationsschritt über navigiereZu()
// bzw. direkte Hash-Änderungen erzeugt automatisch einen Browser-History-Eintrag
// (Standardverhalten von location.hash, siehe Abschnitt 8).
export function starteRouter() {
  window.addEventListener('hashchange', () => {
    wendeRouteAufZustandAn(parseHash(location.hash));
  });
  wendeRouteAufZustandAn(parseHash(location.hash || '#bestand'));
}

// Navigiert zu einer neuen Route. segmente z.B. ['visualisierungen', 'urkunden', 'karte'].
export function navigiereZu(segmente, entityFilter) {
  location.hash = baueHash(segmente, entityFilter);
}

export function aktuelleRoute() {
  return parseHash(location.hash);
}
