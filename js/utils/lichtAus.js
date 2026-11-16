// js/utils/lichtAus.js
// Auftrag 13 (Stufe B): reine Funktionen des Unsicherheits-Modus „Licht aus“ – ohne DOM, ohne Zustand, getestet in
// tests/lichtAus.test.mjs. Begriffe:
// - Eintrag: { datei, feld, typ, auspraegung } aus `unsicherheit_typ` (js/utils/uncertainty.js: leseUnsicherheitTypen).
// - Einheit: was eine Ansicht als ein Element zeichnet (Kachel, Marker, Person): { eintraege: [Eintrag, …] }.
// - Gruppe: Feld + Typ/Ausprägung einer Datei, Schlüssel `datei|feld|typ/auspraegung`.
// - Auswahl: { typen: 'alle' | [typ, …], masseEin: [Gruppenschlüssel, …], nurDiese: bool }.
// - Massengruppe: Gruppe, die mindestens MASSEN_SCHWELLE der Einheiten der ganzen Ansicht betrifft; zählt bei „Alle“
//   und bei der Wahl ihres Typs nicht mit, nur über ihren Zusatzschalter (masseEin).
import { leseUnsicherheitTypen } from './uncertainty.js';
import { MASSEN_SCHWELLE } from '../config/lichtAus.js';

export const LEERE_AUSWAHL = Object.freeze({ typen: 'alle', masseEin: [], nurDiese: false });

export function gruppenSchluessel(e) {
  return `${e.datei || ''}|${String(e.feld).toLowerCase()}|${e.typ}/${e.auspraegung}`;
}

// Einträge eines Datensatzes, optional nur für bestimmte Felder (klein geschrieben verglichen)
export function eintraegeAus(record, datei, felder = null) {
  const erlaubt = felder ? new Set(felder.map((f) => String(f).toLowerCase())) : null;
  return leseUnsicherheitTypen(record?.unsicherheit_typ)
    .filter((e) => !erlaubt || erlaubt.has(e.feld.toLowerCase()))
    .map((e) => ({ datei, feld: e.feld.toLowerCase(), typ: e.typ, auspraegung: e.auspraegung }));
}

// Je Gruppe die Zahl der Einheiten, die sie tragen (eine Einheit zählt je Gruppe höchstens einmal)
export function zaehleGruppen(einheiten) {
  const gruppen = new Map();
  for (const einheit of einheiten) {
    const gesehen = new Set();
    for (const e of einheit.eintraege || []) {
      const k = gruppenSchluessel(e);
      if (gesehen.has(k)) continue;
      gesehen.add(k);
      if (!gruppen.has(k)) gruppen.set(k, { schluessel: k, datei: e.datei, feld: e.feld, typ: e.typ, auspraegung: e.auspraegung, anzahl: 0 });
      gruppen.get(k).anzahl += 1;
    }
  }
  return gruppen;
}

// Massengruppen auf den ganzen Daten der Ansicht: Anteil = Einheiten mit der Gruppe / alle Einheiten
export function ermittleMassengruppen(alleEinheiten, schwelle) {
  const n = alleEinheiten.length;
  if (!n || !(schwelle > 0)) return [];
  return [...zaehleGruppen(alleEinheiten).values()]
    .filter((g) => g.anzahl / n >= schwelle)
    .map((g) => ({ ...g, anteil: g.anzahl / n }))
    .sort((a, b) => b.anzahl - a.anzahl);
}

// Welche Einträge einer Einheit bei dieser Auswahl leuchten
export function wirksameEintraege(eintraege, auswahl = LEERE_AUSWAHL, masseSchluessel = []) {
  const masse = new Set(masseSchluessel);
  const ein = new Set(auswahl.masseEin || []);
  const typen = auswahl.typen === 'alle' ? null : new Set(auswahl.typen || []);
  return (eintraege || []).filter((e) => {
    const k = gruppenSchluessel(e);
    if (masse.has(k)) return ein.has(k);
    return !typen || typen.has(e.typ);
  });
}

// Für ein Modul: Massengruppen aus den ganzen Daten der Ansicht und die wirksamen Einträge je Einheit bei dieser Auswahl
export function lichtAusVorbereitung(alleEinheiten, auswahl = LEERE_AUSWAHL, schwelle = MASSEN_SCHWELLE) {
  const massengruppen = ermittleMassengruppen(alleEinheiten, schwelle);
  const masse = massengruppen.map((g) => g.schluessel);
  return { massengruppen, masse, wirksam: (einheit) => wirksameEintraege(einheit.eintraege, auswahl, masse) };
}

export const leuchtet = (einheit, auswahl, masseSchluessel) => wirksameEintraege(einheit.eintraege, auswahl, masseSchluessel).length > 0;

// Zähler der Typenleiste für die aktuelle Ansicht (Einheiten nach den übrigen Filtern der Ansicht):
// - alle: Einheiten, die bei der Auswahl leuchten
// - proTyp: je Typ die Einheiten mit mindestens einem Eintrag dieses Typs außerhalb der Massengruppen
// - proMasse: je Massengruppe die Einheiten, die sie tragen
// - auspraegungen: Ausprägungen der leuchtenden Einträge (für die Legende)
export function zaehleFuerLeiste(einheiten, auswahl, masseSchluessel) {
  const masse = new Set(masseSchluessel);
  const proTyp = {}, proMasse = {};
  const auspraegungen = new Set();
  let alle = 0;
  for (const einheit of einheiten) {
    const eintraege = einheit.eintraege || [];
    const typenHier = new Set(), masseHier = new Set();
    for (const e of eintraege) {
      const k = gruppenSchluessel(e);
      if (masse.has(k)) masseHier.add(k); else typenHier.add(e.typ);
    }
    typenHier.forEach((t) => { proTyp[t] = (proTyp[t] || 0) + 1; });
    masseHier.forEach((k) => { proMasse[k] = (proMasse[k] || 0) + 1; });
    const wirksam = wirksameEintraege(eintraege, auswahl, masseSchluessel);
    if (wirksam.length) { alle += 1; wirksam.forEach((e) => auspraegungen.add(e.auspraegung)); }
  }
  return { alle, proTyp, proMasse, auspraegungen: [...auspraegungen] };
}

// Klick auf eine Schaltfläche der Leiste. „Alle“ setzt zurück; ein Typ bei „Alle“ wählt nur ihn; sonst wird er
// hinzugefügt oder entfernt; ist danach nichts gewählt, gilt wieder „Alle“.
export function schalteTyp(auswahl, typ) {
  if (typ === 'alle') return { ...auswahl, typen: 'alle' };
  if (auswahl.typen === 'alle') return { ...auswahl, typen: [typ] };
  const set = new Set(auswahl.typen);
  if (set.has(typ)) set.delete(typ); else set.add(typ);
  return { ...auswahl, typen: set.size ? [...set] : 'alle' };
}

export function schalteMasse(auswahl, schluessel) {
  const set = new Set(auswahl.masseEin || []);
  if (set.has(schluessel)) set.delete(schluessel); else set.add(schluessel);
  return { ...auswahl, masseEin: [...set] };
}

export const schalteNurDiese = (auswahl) => ({ ...auswahl, nurDiese: !auswahl.nurDiese });

// Ansichtenwechsel (Entscheidung 5/6): Der Modus bleibt nur, wenn er an war und beide Ansichten für „Licht aus“
// freigegeben sind (Registry `lichtAus`). Die Typenauswahl beginnt in jeder Ansicht bei „Alle“.
export function modusNachWechsel({ aktiv, vorherLichtAus, nachherLichtAus }) {
  return Boolean(aktiv && vorherLichtAus && nachherLichtAus);
}

// Ein Muster je Element: die erste vorkommende Ausprägung in `vorrang`, sonst die erste überhaupt
export function vorrangigeAuspraegung(auspraegungen, vorrang) {
  const liste = [...new Set(auspraegungen)];
  return vorrang.find((a) => liste.includes(a)) ?? liste[0] ?? null;
}

export const musterFuer = (auspraegung, zuordnung) => (auspraegung ? zuordnung[auspraegung] || 'ohne' : null);

// Typen, die in der Ansicht nicht vorkommen (für die ausgegrauten Schaltflächen bzw. die Kompaktvariante)
export function fehlendeTypen(vokabular, proTyp, proMasse = {}, massengruppen = []) {
  const mitMasse = new Set(massengruppen.filter((g) => proMasse[g.schluessel]).map((g) => g.typ));
  return vokabular.filter((t) => !proTyp[t.typ_id] && !mitMasse.has(t.typ_id)).map((t) => t.typ_id);
}

// Methodenhinweise einer Ansicht. `geltungsbereich` (data/methodenhinweise.csv) enthält, durch „;“ getrennt:
// „datei.csv/feld[, feld]“, „Ansicht Name“ bzw. „Ansichten Name, Name“ (Klammerzusätze zählen nicht) oder
// „Bereich Name“. `ansicht`: { felder: { 'datei.csv': [feld, …] }, namen: [Name, …], bereich: Name }.
export function hinweiseFuerAnsicht(hinweise, ansicht) {
  const norm = (s) => String(s || '').replace(/\(.*?\)/g, '').trim().toLowerCase();
  const namen = new Set((ansicht.namen || []).map(norm));
  const felder = Object.fromEntries(Object.entries(ansicht.felder || {}).map(([d, f]) => [d.toLowerCase(), new Set(f.map((x) => x.toLowerCase()))]));
  return hinweise.filter((h) => String(h.geltungsbereich || '').split(';').some((teil) => {
    const t = teil.trim();
    const ansichtTreffer = t.match(/^Ansicht(?:en)?\s+(.+)$/i);
    if (ansichtTreffer) return ansichtTreffer[1].split(',').some((n) => namen.has(norm(n)));
    const bereichTreffer = t.match(/^Bereich\s+(.+)$/i);
    if (bereichTreffer) return norm(bereichTreffer[1]) === norm(ansicht.bereich);
    const i = t.indexOf('/');
    if (i < 0) return false;
    const datei = t.slice(0, i).trim().toLowerCase();
    return Boolean(felder[datei]) && t.slice(i + 1).split(',').some((f) => felder[datei].has(f.trim().toLowerCase()));
  }));
}

// Hinweis zu einer Massengruppe: derjenige, dessen Geltungsbereich Datei und Feld der Gruppe nennt
export function hinweisFuerGruppe(hinweise, gruppe) {
  return hinweiseFuerAnsicht(hinweise, { felder: { [gruppe.datei]: [gruppe.feld] } })[0] || null;
}
