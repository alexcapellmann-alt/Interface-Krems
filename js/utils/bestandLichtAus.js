// js/utils/bestandLichtAus.js
// Auftrag 17: was Strahl, Baum und Sonne im Modus „Licht aus“ gemeinsam brauchen – die Felder des Bestandsverzeichnisses
// mit Unsicherheitstyp, die Einheit je Bestand und die Schraffur des Musters „fehlt“ für SVG-Flächen. Farben der
// Schraffur kommen über CSS-Klassen (css/components.css, Abschnitt „Licht aus“), nicht aus dem Code.
import { eintraegeAus } from './lichtAus.js';

export const BESTAND_DATEI = 'bestandsverzeichnis.csv';
export const BESTAND_FELDER = ['zeitraum_von', 'zeitraum_bis', 'fehlende_jahrgaenge', 'umfang', 'form_inhalt', 'bestandsgeschichte'];
export const BESTAND_HINWEIS_FELDER = [...BESTAND_FELDER, 'bkk_kategorie'];

const einheiten = new WeakMap();
// Einheit zu einem Datensatz (über den Datensatz zwischengespeichert, damit Zähler und Kennzeichnung dieselbe sehen)
export function bestandEinheit(record) {
  let e = einheiten.get(record);
  if (!e) { e = { eintraege: eintraegeAus(record, BESTAND_DATEI, BESTAND_FELDER) }; einheiten.set(record, e); }
  return e;
}

// Schraffur wie das Muster „fehlt“ (Auftrag 13) als SVG-Pattern; `id` je Ansicht, damit sich bei einem Übergang zwischen
// zwei Ansichten keine IDs doppeln.
export function baueMusterFehlt(defs, id) {
  const muster = defs.append('pattern').attr('id', id).attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 6).attr('height', 6).attr('patternTransform', 'rotate(45)');
  muster.append('rect').attr('class', 'lichtaus-muster-grund').attr('width', 6).attr('height', 6);
  muster.append('line').attr('class', 'lichtaus-muster-strich').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6);
  return `url(#${id})`;
}
