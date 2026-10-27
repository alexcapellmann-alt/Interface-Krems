// js/beteiligung/bezuege.js
// Partizipations-Modul: EINE Beschreibung je Datensatztyp, worauf sich ein Vorschlag bezieht (Typ,
// Kennung, Titel, wählbare Felder mit aktuellem Wert) - von allen Sidebars und den Regesten-Kacheln
// gemeinsam genutzt, damit überall dieselben Angaben beim Archiv ankommen.

const text = (w) => (Array.isArray(w) ? w.join('; ') : String(w ?? '')).trim();

export function urkundeBezug(r) {
  return {
    typ: 'urkunde', id: text(r.signatur), titel: [text(r.signatur), text(r.datum)].filter(Boolean).join(', '),
    felder: [
      { name: 'datum', label: 'Datum', wert: r.datum }, { name: 'regest', label: 'Regest', wert: r.regest },
      { name: 'orte', label: 'Orte', wert: r.orte }, { name: 'personen', label: 'Personen', wert: r.personen },
      { name: 'kategorien', label: 'Kategorien', wert: r.kategorien }
    ]
  };
}

export function buergerbuchBezug(r) {
  return {
    typ: 'buergerbuch', id: text(r.id), titel: [`Bürgerbuch ${text(r.id)}`, text(r.Name), text(r.Datum)].filter(Boolean).join(', '),
    felder: [
      { name: 'Name', label: 'Name', wert: r.Name }, { name: 'Datum', label: 'Datum', wert: r.Datum },
      { name: 'Beruf', label: 'Beruf', wert: r.Beruf }, { name: 'Ort', label: 'Ort', wert: r.Ort },
      { name: 'Buergen', label: 'Bürgen', wert: r.Buergen }
    ]
  };
}

export function inventarBezug(r) {
  return {
    typ: 'verlassenschaftsinventar', id: text(r.id),
    titel: [`Verlassenschaftsinventar ${text(r.id)}`, text(r.Name), text(r.Jahr)].filter(Boolean).join(', '),
    felder: [
      { name: 'Name', label: 'Name', wert: r.Name }, { name: 'Jahr', label: 'Jahr', wert: r.Jahr },
      { name: 'Beruf/Funktion/Stand', label: 'Beruf/Funktion/Stand', wert: r['Beruf/Funktion/Stand'] },
      { name: 'Ort (Schaetzung)', label: 'Ort', wert: r['Ort (Schaetzung)'] },
      { name: 'Vermoegensgruppe', label: 'Vermögensgruppe', wert: r.Vermoegensgruppe }
    ]
  };
}

// Bestand (bestandsverzeichnis.csv): Felder wie in der Sidebar (STANDARD_SIDEBAR_FELDER u. a.)
export function bestandBezug(r, felder = []) {
  return {
    typ: 'bestand', id: text(r.kuerzel) || text(r.name), titel: [text(r.kuerzel), text(r.name)].filter(Boolean).join(' '),
    felder: [
      { name: 'name', label: 'Name', wert: r.name }, { name: 'zeitraum_text', label: 'Zeitraum', wert: r.zeitraum_text },
      { name: 'umfang', label: 'Umfang', wert: r.umfang },
      ...felder.map(({ feld, label }) => ({ name: feld, label, wert: r[feld] }))
    ]
  };
}
