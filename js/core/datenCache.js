// js/core/datenCache.js
// AUFTRAG B2 (Prüfbericht Punkt 3, Entscheidung "Cache erweitern"): EINE
// gemeinsame Ladefunktion über den bestehenden state.js-Datencache, statt
// zweier gleichlautender Kopien in app.js und archivKonfiguration.js und
// mehrerer direkter ladeCSV()-Aufrufe (fuehrungenDaten.js, literaturSeite.js,
// ladeSeitenBloecke(), Nav-Prüfungen). Grund: die Hintergrund-Prüfung der
// Datenverfügbarkeit (js/core/datenVerfuegbarkeit.js) darf keine Datei ein
// zweites Mal laden.
//
// Unterschied zur bisherigen Fassung: im Cache steht das LAUFENDE Laden
// (Promise), nicht erst das fertige Ergebnis - zwei gleichzeitige Aufrufe
// für dieselbe Datei teilen sich so eine einzige Anfrage. Schlägt das Laden
// fehl (Datei fehlt), wird der Eintrag wieder entfernt und der Fehler an
// alle Wartenden weitergegeben (unverändertes Fehlerverhalten).
//
// Die gelieferten Records-Listen werden von allen Aufrufern GETEILT - sie
// dürfen sie nicht verändern (Masterprompt Abschnitt 5, gilt ohnehin).

import { ladeCSV } from './dataLoader.js';
import { getDatenCacheEintrag, setDatenCacheEintrag } from './state.js';

export function ladeGecachteCSV(pfad) {
  const gecacht = getDatenCacheEintrag(pfad);
  if (gecacht) return Promise.resolve(gecacht);
  const laden = ladeCSV(pfad)
    .then(({ records }) => records)
    .catch((fehler) => {
      setDatenCacheEintrag(pfad, undefined);
      throw fehler;
    });
  setDatenCacheEintrag(pfad, laden);
  return laden;
}
