// js/utils/bestandVorschau.js
// Vorläufige Hervorhebung eines Bestands aus der Vorschlagsliste des Bestand-Suchfelds (Wunsch des
// Autors, 2026-10-28; js/utils/bestandSuche.js, `onVorschau`). Gilt für alle Bestand-Visualisierungen,
// ohne dass jedes Modul eigenen Code braucht: Treemap, Sunburst, Icicle, Circle Packing und Gantt
// binden ihre d3-Hierarchieknoten an die SVG-Elemente. Gesucht wird das Element des Bestands selbst
// (Blatt mit `data.record.kuerzel`); zeigt die aktuelle Ebene ihn nicht einzeln (z. B. Gesamtansicht
// der Sunburst), das kleinste gezeichnete Element, das ihn enthält (seine Kategorie). Dieses wird
// betont, alle übrigen Elemente treten zurück. Kindelemente erben in d3 den Datensatz ihres
// Elternelements, sie zählen deshalb nicht als eigene Elemente.

const AKTIV = 'bestand-vorschau-aktiv';
const TREFFER = 'bestand-vorschau-treffer';
const ANDERE = 'bestand-vorschau-andere';

const istKnoten = (d) => d && typeof d === 'object' && typeof d.leaves === 'function';

export function zeigeBestandVorschau(container, kuerzel) {
  if (!container) return;
  container.querySelectorAll(`.${TREFFER}, .${ANDERE}`).forEach((el) => el.classList.remove(TREFFER, ANDERE));
  container.querySelectorAll(`.${AKTIV}`).forEach((el) => el.classList.remove(AKTIV));
  if (!kuerzel) return;

  // Eigenständige Elemente: Hierarchieknoten als Datensatz, anders als das Elternelement
  const elemente = [...container.querySelectorAll('svg *')].filter((el) => istKnoten(el.__data__) && el.parentNode?.__data__ !== el.__data__);
  if (!elemente.length) return;
  const enthaelt = (d) => d.leaves().some((blatt) => blatt.data?.record?.kuerzel === kuerzel);
  let treffer = elemente.filter((el) => el.__data__.data?.record?.kuerzel === kuerzel);
  if (!treffer.length) {
    const umfassend = elemente.filter((el) => enthaelt(el.__data__));
    if (!umfassend.length) return;
    const tiefste = Math.max(...umfassend.map((el) => el.__data__.depth ?? 0));
    treffer = umfassend.filter((el) => (el.__data__.depth ?? 0) === tiefste);
  }
  treffer.forEach((el) => el.classList.add(TREFFER));
  // Zurücktreten nur, was weder Treffer ist noch einen Treffer enthält oder in einem liegt; auch
  // Kategorie und Unterkategorie des Treffers bleiben sichtbar (eigene Ringe in Sunburst und Icicle)
  const vorfahren = new Set(treffer.flatMap((t) => t.__data__.ancestors()));
  elemente.forEach((el) => {
    if (vorfahren.has(el.__data__) || treffer.some((t) => t === el || el.contains(t) || t.contains(el))) return;
    el.classList.add(ANDERE);
  });
  treffer[0].ownerSVGElement?.classList.add(AKTIV);
}
