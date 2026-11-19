// js/utils/uncertainty.js
// Filtert aus unsicherheit_anmerkung die zu einem konkreten Feld passende Erklärung
// heraus (Abschnitt 11, v4.2). Verbindliches Format pro Listeneintrag (bei mehreren
// unsicheren Feldern zerlegt der dataLoader das per Pipe-Konvention bereits in eine
// Liste, siehe Abschnitt 12): "<feldname>: <Erklärung>" - der Text vor dem ersten
// Doppelpunkt wird case-insensitiv mit dem Feldnamen abgeglichen. Strukturiertes
// Parsen eines festen Formats, keine Heuristik über freien Satzinhalt.
//
// Fallback bei Nichteinhaltung des Formats (z.B. noch nicht überarbeitete Altdaten,
// siehe Abschnitt 12 v4.2): kein Absturz, stattdessen wird der komplette Text
// gezeigt statt fälschlich nichts anzuzeigen.

// Lesbare Bezeichnung des Feldnamens vor dem Doppelpunkt (Nachbesserung 3, Punkt 2, Wunsch des Autors
// 15.11.2026): die EINZIGE Stelle dieser Übersetzung. Schlüssel klein geschrieben, Abgleich ohne
// Groß-/Kleinschreibung (wie filtereErklaerungFuerFeld). Unbekannter Feldname: Rohname bleibt stehen.
const FELD_BEZEICHNUNGEN = {
  datum: 'Datierung',
  orte: 'Ort',
  ausstellungsort: 'Ausstellungsort',
  personen: 'Personen',
  personen_id: 'Personenzuordnung',
  kategorien: 'Kategorien',
  bilder: 'Fotos',
  name: 'Name',
  beruf: 'Beruf',
  wirtschaftssektor: 'Wirtschaftssektor',
  umfang: 'Umfang',
  // Auftrag 17: Felder des Bestandsverzeichnisses im Strahl
  form_inhalt: 'Inhalt',
  bestandsgeschichte: 'Bestandsgeschichte',
  fehlende_jahrgaenge: 'Fehlende Jahrgänge',
  zeitraum_von: 'Laufzeit (Beginn)',
  zeitraum_bis: 'Laufzeit (Ende)'
};

export function feldBezeichnung(feldname) {
  const roh = String(feldname || '').trim();
  const schluessel = roh.toLowerCase();
  return Object.hasOwn(FELD_BEZEICHNUNGEN, schluessel) ? FELD_BEZEICHNUNGEN[schluessel] : roh;
}

// Für Anzeigen, die die GANZE Anmerkung zeigen (Sidebar, Tooltips): "<feldname>: <Erklärung>" wird zu
// "<Bezeichnung>: <Erklärung>". Ersetzt wird nur ein bekannter Feldname; Einträge ohne Doppelpunkt oder mit
// anderem Text davor bleiben wörtlich. Liste (Pipe-Konvention) wird mit `trenner` verbunden.
export function lesbareAnmerkung(anmerkung, trenner = ' | ') {
  if (!anmerkung) return '';
  const eintraege = Array.isArray(anmerkung) ? anmerkung : [anmerkung];
  return eintraege.map((eintrag) => {
    const text = String(eintrag);
    const doppelpunkt = text.indexOf(':');
    if (doppelpunkt === -1) return text;
    const schluessel = text.slice(0, doppelpunkt).trim().toLowerCase();
    if (!Object.hasOwn(FELD_BEZEICHNUNGEN, schluessel)) return text;
    return `${FELD_BEZEICHNUNGEN[schluessel]}:${text.slice(doppelpunkt + 1)}`;
  }).join(trenner);
}

export function filtereErklaerungFuerFeld(anmerkung, feldname) {
  if (!anmerkung) return '';
  const eintraege = Array.isArray(anmerkung) ? anmerkung : [anmerkung];

  const passende = eintraege
    .filter((eintrag) => {
      const doppelpunkt = eintrag.indexOf(':');
      if (doppelpunkt === -1) return false;
      return eintrag.slice(0, doppelpunkt).trim().toLowerCase() === feldname.toLowerCase();
    })
    .map((eintrag) => eintrag.slice(eintrag.indexOf(':') + 1).trim());

  if (passende.length > 0) {
    return passende.join(' | ');
  }

  // Kein Treffer im festen Format gefunden - gesamten Text als Fallback zeigen.
  return eintraege.join(' | ');
}

// ---------------------------------------------------------------------------------------------------------------------
// Auftrag 12: Unsicherheitstypen (Spalte `unsicherheit_typ`, Schreibweise `<feld>: <typ>/<auspraegung>`, mehrere Einträge
// mit `|`). Typen und Ausprägungen stehen in data/unsicherheit_typen.csv und data/unsicherheit_auspraegungen.csv – hier
// stehen keine Typnamen. Der Feldname wird ohne Rücksicht auf Groß- und Kleinschreibung verglichen und am ersten
// Doppelpunkt vom Rest getrennt; Typ und Ausprägung am ersten Schrägstrich. Die Anzeige nutzt das erst ab Auftrag 13.

const alsEintraege = (wert) => (Array.isArray(wert) ? wert : String(wert ?? '').split('|')).map((t) => String(t).trim()).filter(Boolean);

// Liefert [{feld, typ, auspraegung, roh}] – unvollständige Einträge mit typ/auspraegung = '' (die Prüfung meldet sie).
export function leseUnsicherheitTypen(wert) {
  return alsEintraege(wert).map((roh) => {
    const dp = roh.indexOf(':');
    const feld = dp === -1 ? '' : roh.slice(0, dp).trim();
    const rest = dp === -1 ? roh : roh.slice(dp + 1).trim();
    const schraeg = rest.indexOf('/');
    return {
      feld,
      typ: (schraeg === -1 ? rest : rest.slice(0, schraeg)).trim().toLowerCase(),
      auspraegung: schraeg === -1 ? '' : rest.slice(schraeg + 1).trim().toLowerCase(),
      roh
    };
  });
}

// Typ und Ausprägung zu einem Feld eines Datensatzes (erster passender Eintrag) oder null.
export function typFuerFeld(record, feldname) {
  const ziel = String(feldname || '').trim().toLowerCase();
  const e = leseUnsicherheitTypen(record?.unsicherheit_typ).find((x) => x.feld.toLowerCase() === ziel);
  return e ? { typ: e.typ, auspraegung: e.auspraegung } : null;
}

// Alle Typen eines Datensatzes (ohne Doppelungen, in der Reihenfolge des Vorkommens).
export function typenDesDatensatzes(record) {
  return [...new Set(leseUnsicherheitTypen(record?.unsicherheit_typ).map((x) => x.typ).filter(Boolean))];
}

// Prüfung eines Datensatzes gegen das Vokabular ({typen: Set, auspraegungen: Set}).
// Fehler: Format, unbekannter Typ, unbekannte Ausprägung. Warnungen: Typ ohne gesetzte `<feld>_unsicher`-Markierung
// (nur wenn es diese Spalte gibt) und gesetzte Markierung ohne Typ-Eintrag zu diesem Feld.
export function pruefeUnsicherheitTypen(record, vokabular) {
  const fehler = []; const warnungen = [];
  const eintraege = leseUnsicherheitTypen(record?.unsicherheit_typ);
  const schluessel = Object.keys(record || {});
  const markierung = (feld) => schluessel.find((k) => k.toLowerCase() === `${feld.toLowerCase()}_unsicher`);
  eintraege.forEach((e) => {
    if (!e.feld || !e.typ || !e.auspraegung) { fehler.push(`Eintrag nicht im Format <feld>: <typ>/<auspraegung>: ${e.roh}`); return; }
    if (vokabular?.typen && !vokabular.typen.has(e.typ)) fehler.push(`Unbekannter Typ „${e.typ}“ (${e.roh})`);
    if (vokabular?.auspraegungen && !vokabular.auspraegungen.has(e.auspraegung)) fehler.push(`Unbekannte Ausprägung „${e.auspraegung}“ (${e.roh})`);
    const m = markierung(e.feld);
    if (m && record[m] !== true) warnungen.push(`Typ für „${e.feld}“, aber ${m} ist nicht gesetzt`);
  });
  const mitTyp = new Set(eintraege.map((e) => e.feld.toLowerCase()));
  schluessel.filter((k) => /_unsicher$/i.test(k) && record[k] === true).forEach((k) => {
    const feld = k.replace(/_unsicher$/i, '').toLowerCase();
    if (!mitTyp.has(feld)) warnungen.push(`${k} ist gesetzt, aber es gibt keinen Typ für „${feld}“`);
  });
  return { fehler, warnungen };
}

// Auftrag 14 (18.11.2026): Erklärung zu einem Feld aus den Daten – die eigene aus `unsicherheit_anmerkung` (Einträge
// `<feld>: …`), sonst der Standardtext zu Typ/Ausprägung des Felds (Zeilen aus data/unsicherheit_standardtexte.csv),
// sonst wie bisher die ganze Anmerkung (filtereErklaerungFuerFeld). Rein, ohne Laden; js/core/unsicherheitVokabular.js
// reicht die geladenen Standardtexte durch.
const kleinText = (v) => String(v ?? '').trim().toLowerCase();
export function erklaerungFuerFeldAus(record, datei, feld, standardtexte = []) {
  const anmerkung = record?.unsicherheit_anmerkung;
  const eintraege = (Array.isArray(anmerkung) ? anmerkung : [anmerkung]).map((a) => String(a ?? ''));
  const eigene = eintraege.filter((a) => a.includes(':') && kleinText(a.slice(0, a.indexOf(':'))) === kleinText(feld))
    .map((a) => a.slice(a.indexOf(':') + 1).trim());
  if (eigene.length) return eigene.join(' | ');
  const t = typFuerFeld(record, feld);
  const standard = t && standardtexte.find((z) => kleinText(z.datei) === kleinText(datei) && kleinText(z.feld) === kleinText(feld)
    && kleinText(z.auspraegung) === kleinText(t.auspraegung))?.text;
  return standard || filtereErklaerungFuerFeld(anmerkung, feld);
}

// Zugängliche Beschreibung einer Kachel im Modus „Licht aus“: je leuchtendem Feld „<Feldbezeichnung>: <Erklärung>“
export function beschreibungFuerFelder(record, datei, felder, standardtexte = []) {
  return [...new Set(felder)].map((feld) => {
    const text = erklaerungFuerFeldAus(record, datei, feld, standardtexte);
    return text ? `${feldBezeichnung(feld)}: ${text}` : '';
  }).filter(Boolean).join(' ');
}
