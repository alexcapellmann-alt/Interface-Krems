// js/utils/urkundenPersonen.js
// Gemeinsame Personen-Aufbereitung für die netzwerkartigen Urkunden-Visualisierungen
// (Abschnitt 13, DRY). `personen`/`personen_id` sind index-parallele Listen (siehe
// SCHEMA.md) - personen_id liefert den stabilen Knoten-Schlüssel (löst mehrdeutige
// Namensschreibweisen, siehe personenliste.csv), personen den lesbaren Anzeigenamen.
//
// SKALEN-HINWEIS: 1351 Personen haben mindestens eine Ko-Nennung mit einer
// anderen Person, macht 4083 eindeutige Paare. Für Diagrammtypen, die
// strukturell nicht auf diese Größenordnung skalieren (Adjazenzmatrix, Chord,
// Arc-Diagramm), wählt waehleTopPersonenNachGrad() eine überschaubare
// Teilmenge nach Anzahl unterschiedlicher Verbindungen (Grad) aus - mit
// sichtbarer Angabe, wie viele Personen insgesamt existieren (Abschnitt 12:
// kein stiller Datenverlust, nur eine bewusste, klar beschriftete Anzeige-
// Einschränkung).
//
// REGRESSIONSSCHUTZ: aktuell genutzt von adjazenzmatrix.js, chordDiagramm.js,
// arcDiagramm.js. AUFTRAG "Bipartiter Graph → Urkunden (Sankey),
// Personennetzwerk → Bürgerbuch...": personennetzwerk.js UND bipartiterGraph.js
// (jetzt kategorienOrteSankey.js) sind KEINE Nutzer mehr - personennetzwerk.js
// ist zu Bürgerbuch umgezogen und nutzt seither js/utils/buergerbuchZeit.js'
// eigenständige baueBuergschaftsNetzwerk() (andere Datenquelle, andere
// Feldnamen), bipartiterGraph.js zeigt jetzt gar keine Personen mehr (Sankey
// aus Kategorien/Orten).

export function ermittlePersonenDerUrkunde(record) {
  const namen = Array.isArray(record.personen) ? record.personen : (record.personen ? [record.personen] : []);
  const ids = Array.isArray(record.personen_id) ? record.personen_id : (record.personen_id ? [record.personen_id] : []);
  return namen.map((name, i) => ({ id: ids[i] || name, name }));
}

// Baut das vollständige Ko-Nennungs-Netzwerk: knoten = jede Person mit
// Gesamt-Nennungshäufigkeit, paare = zwei Personen, die mindestens einmal in
// derselben Urkunde genannt wurden. Personen ohne jede Ko-Nennung tauchen in
// knoten weiterhin auf (anzahl korrekt gezählt), aber in keinem Paar - siehe
// ermittlePersonenOhneKoNennung().
export function baueKoNennungsNetzwerk(records) {
  const knoten = new Map(); // id -> {id, name, anzahl}
  const paare = new Map(); // "idA|||idB" -> {a, b, anzahl, unsicherAnzahl, eintraege}

  records.forEach((record) => {
    const personen = ermittlePersonenDerUrkunde(record);
    const eindeutig = Array.from(new Map(personen.map((p) => [p.id, p])).values());

    eindeutig.forEach((person) => {
      if (!knoten.has(person.id)) {
        knoten.set(person.id, { id: person.id, name: person.name, anzahl: 0 });
      }
      knoten.get(person.id).anzahl += 1;
    });

    for (let i = 0; i < eindeutig.length; i += 1) {
      for (let j = i + 1; j < eindeutig.length; j += 1) {
        const schluessel = [eindeutig[i].id, eindeutig[j].id].sort().join('|||');
        if (!paare.has(schluessel)) {
          paare.set(schluessel, { a: eindeutig[i], b: eindeutig[j], anzahl: 0, unsicherAnzahl: 0, eintraege: [] });
        }
        const paar = paare.get(schluessel);
        paar.anzahl += 1;
        paar.eintraege.push(record);
        if (record.personen_unsicher) paar.unsicherAnzahl += 1;
      }
    }
  });

  return { knoten: Array.from(knoten.values()), paare: Array.from(paare.values()) };
}

// Personen, die in keinem Paar vorkommen (nie mit einer anderen Person gemeinsam
// genannt) - für eine sichtbare "ohne Ko-Nennung"-Liste in den Netzwerk-Modulen.
export function ermittlePersonenOhneKoNennung(knoten, paare) {
  const verbunden = new Set();
  paare.forEach((paar) => { verbunden.add(paar.a.id); verbunden.add(paar.b.id); });
  return knoten.filter((k) => !verbunden.has(k.id));
}

// Wählt die n Personen mit dem höchsten Grad (Anzahl gewichteter Verbindungen) aus -
// siehe Skalen-Hinweis oben. gesamtAnzahlVerbunden zeigt die tatsächliche Größe des
// vollständigen Netzwerks für eine ehrliche Beschriftung ("Top 40 von 1351").
export function waehleTopPersonenNachGrad(knoten, paare, n) {
  const gradProId = new Map();
  paare.forEach((paar) => {
    gradProId.set(paar.a.id, (gradProId.get(paar.a.id) || 0) + paar.anzahl);
    gradProId.set(paar.b.id, (gradProId.get(paar.b.id) || 0) + paar.anzahl);
  });

  const verbundeneKnoten = knoten.filter((k) => gradProId.has(k.id))
    .sort((a, b) => gradProId.get(b.id) - gradProId.get(a.id));
  const ausgewaehlteKnoten = verbundeneKnoten.slice(0, n);
  const ausgewaehlteIds = new Set(ausgewaehlteKnoten.map((k) => k.id));
  const gefiltertePaare = paare.filter((p) => ausgewaehlteIds.has(p.a.id) && ausgewaehlteIds.has(p.b.id));

  return { knoten: ausgewaehlteKnoten, paare: gefiltertePaare, gesamtAnzahlVerbunden: verbundeneKnoten.length };
}

export function baueKoNennungTooltip(paar) {
  const zeilen = [`${paar.a.name} ↔ ${paar.b.name}`, `${paar.anzahl} gemeinsame Nennung(en)`];
  if (paar.unsicherAnzahl > 0) zeilen.push(`davon ${paar.unsicherAnzahl} mit unsicherer Personenangabe`);
  return zeilen.join('\n');
}
