// js/viz/parallelKoordinaten.js
// FOLGEAUFTRAG "Parallelkoordinaten neu konzipieren (Verlassenschaften)":
// kompletter Neuaufbau nach einem extern erarbeiteten, gegen die echten Daten
// verifizierten Konzept - ersetzt die bisherige 8-Achsen-Fassung aus (49)
// vollständig. Kernunterschiede zur Vorfassung:
//   - Zwei separate, feste Achsenfolgen statt einer einzigen (Punkt 1/5):
//     "Vermögensprofil" (Realvermögen, vier Vermögensanteile, Gesamtvermögen)
//     und "Forderungs-/Schuldenprofil" (Realvermögen, SchzG, SchvG,
//     Gesamtvermögen) - umschaltbar, kein Drag zum Neuanordnen (Nicht-Ziel).
//   - Realvermögen jetzt LOGARITHMISCH (vorher linear) - Vorgabe des neuen
//     Konzepts.
//   - Standardfarbe ist JETZT "keine" (alle Linien neutral grau) statt
//     Vermögensgruppe - Farbcodierung ist ein bewusst separater Umschalter
//     (Punkt 3), Hover/Klick-Hervorhebung (Punkt 2) funktioniert unabhängig
//     davon immer.
//   - Klick fixiert jetzt eine Linien-Hervorhebung (bleibt ohne Maus
//     bestehen, Klick auf freie Fläche löst sie) - GENAU DASSELBE Hover/
//     Fixierungs-Muster wie familienbaum.js/sankey.js (siehe
//     aktualisiereHighlight() unten, 1:1 an sankey.js' gleichnamige Funktion
//     angelehnt: `instanz.auswahl` (fixiert) hat immer Vorrang vor
//     `instanz.hover` (temporär), ein Klick auf dieselbe bereits fixierte
//     Linie löst die Fixierung wieder, Escape UND ein Klick auf die leere
//     Fläche tun dasselbe).
//   - Punkt 4 (AUSDRÜCKLICHE Kehrtwende gegenüber (49)): der eine
//     unvollständige Datensatz (VI-0004, Nicolaus Grollickh) wird jetzt OHNE
//     jeden Hinweistext ausgeschlossen - (49) hatte dort noch einen knappen
//     Transparenz-Hinweis ("1 von 68...") gezeigt, dieser Auftrag verlangt
//     wörtlich das Gegenteil ("ohne jeden Hinweistext... keine Erwähnung der
//     Zahl 67/68"). Kein Widerspruch zu Abschnitt 12 ("nie stillschweigend
//     ausblenden") - das ist eine bewusste, im aktuellen Auftrag explizit
//     getroffene Design-Entscheidung, keine übersehene Lücke.
//
// Detail-Anzeige (Punkt 2, "Tooltip/Fixierung zeigt: Name, Beruf, Ort, Jahr,
// exakte Werte aller [Achsen]"): weiterhin js/utils/sidebar.js' generische
// baueSidebarGeruest()/oeffneSidebar()/schliesseSidebar() (wie in (49)) -
// Klick fixiert JETZT zusätzlich die Linien-Hervorhebung UND öffnet die
// Sidebar gemeinsam (schalteAuswahl() unten), Schließen der Sidebar löst
// ebenfalls beides zusammen.
//
// SchzG/SchvG (Punkt 5): dieser Auftrag klärt ihre volle Bedeutung
// ("Schulden zum Gut" / "Schulden vom Gut") - anders als in (49)/(50), wo sie
// mangels gesicherter Kenntnis bewusst unaufgelöst blieben. Hier jetzt direkt
// übernommen (vom Auftrag geliefert, keine eigene Vermutung).
//
// Kein Brushing/Drag-Neuanordnung (Nicht-Ziel, wörtlich) - nur Hover/Fokus-
// Hervorhebung, Klick-Fixierung, Farb-/Ansicht-Umschalter.
//
// FOLGEAUFTRAG "Parallelkoordinaten-Anpassung + neue Visualisierung
// 'Vermögensschichtung'", Teil A - drei Ergänzungen zum obigen, bereits
// umgesetzten Auftrag:
//   A1: Standardfarbe ist jetzt NICHT MEHR "keine", sondern Vermögensgruppe -
//     mit einer eigenen ORDINALEN Rot-Gelb-Grün-Skala statt der bisherigen
//     nominalen baueKategorieFarbSkala()-Regenbogenverteilung (A-E ist eine
//     echte Rangordnung, siehe js/utils/vermoegensgruppenFarben.js für die
//     volle Begründung inkl. A*/S-Sonderbehandlung). Die drei übrigen
//     Farbfelder (Geschlecht/Ort/Jahrzehnt) bleiben unverändert bei der
//     bisherigen nominalen Skala - nur Vermögensgruppe ist jetzt ein
//     Sonderfall, siehe farbeFuerRecord()/baueLegende() unten.
//   A2: die bisherige einzelne "Nulllinie" bei Gesamtvermögen ist jetzt Teil
//     einer allgemeineren Liste `referenzlinien` (ACHSE_GESAMTVERMOEGEN
//     unten) - vier von Dietrich definierte Kategorie-Schwellenwerte
//     (0/500/1.000/3.000 fl.), jede einzeln beschriftet ("A/B" etc.) statt
//     nur eines unbeschrifteten Null-Strichs.
//   A3: INFO_TEXT um einen Quellen-/Bias-Hinweis ergänzt (siehe dort).
import { ACHSEN_SCHRIFTGROESSE } from '../config/constants.js';
import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { baueKategorieFarbSkala } from '../utils/kategorieFarben.js';
import { parseKommaZahl } from '../utils/verlassenschaftenFelder.js';
import { farbeFuerVermoegensgruppe, VERMOEGENSGRUPPE_ANZEIGE_REIHENFOLGE } from '../utils/vermoegensgruppenFarben.js';
import { baueSidebarGeruest, oeffneSidebar, schliesseSidebar, fuegeSidebarStyleEin } from '../utils/sidebar.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';

// rechts deutlich größer als bei der Vorfassung (49): die letzte Achse ist
// jetzt immer "Gesamtvermögen (fl.)" (20 Zeichen, fett) - ihr Titel würde
// bei einem knappen rechten Rand über den SVG-Rand hinausragen (live
// gefunden, siehe Selbstauskunft im Chat).
const RAND = { oben: 62, unten: 20, links: 70, rechts: 90 };

// Hover: HERVORGEHOBEN, alle anderen ABGEBLENDET. Ohne Hover/Fixierung: NORMAL
// (dasselbe Dreier-Schema wie sankey.js' NORMALE_/HERVORGEHOBENE_/
// ABGEBLENDETE_OPAZITAET, siehe dortiger Kommentar).
const OPAZITAET_NORMAL = 0.35;
const OPAZITAET_HERVORGEHOBEN = 0.95;
const OPAZITAET_ABGEBLENDET = 0.06;
const NEUTRALE_LINIENFARBE = '#9a9a9a';

// ---- Achsen-Definitionen (Punkt 1/5) -----------------------------------
// `feld`: wörtlicher CSV-Spaltenname (dataLoader.js normalisiert keine
// Spaltennamen, siehe js/utils/verlassenschaftenFelder.js). `einheit`: für
// die Werte-Anzeige in der Sidebar (Punkt 2). Realvermögen/Gesamtvermögen
// sind in BEIDEN Achsenfolgen identisch - als gemeinsame Objekte definiert
// statt zweimal dasselbe zu wiederholen.
const ACHSE_REALVERMOEGEN = { schluessel: 'realvermoegen', feld: 'Realvermoegen_fl', label: 'Realvermögen (fl.)', einheit: 'fl.', skalentyp: 'log' };
// Punkt 1 / Teil A2 (Folgeauftrag): symlog MIT vier beschrifteten
// Referenzlinien (`referenzlinien`, siehe zeichneAchsen() unten) - 20 von 67
// Werten sind negativ, eine reine log-Skala würde dort versagen. Die vier
// Schwellenwerte sind Dietrichs eigene Kategorie-Grenzen (0/500/1.000/3.000
// fl. = A/B-, B/C-, C/D-, D/E-Grenze) - macht sichtbar, warum eine Linie in
// welche Vermögensgruppe fällt, ohne separates Nachschlagen (Auftrag,
// wörtlich). Ersetzt die bisherige einzelne, unbeschriftete Nulllinie
// vollständig (0 fl. ist jetzt die erste, beschriftete Referenzlinie "A/B").
const ACHSE_GESAMTVERMOEGEN = {
  schluessel: 'gesamtvermoegen', feld: 'Gesamtvermoegen_fl', label: 'Gesamtvermögen (fl.)', einheit: 'fl.', skalentyp: 'symlog',
  referenzlinien: [
    { wert: 0, label: 'A/B' },
    { wert: 500, label: 'B/C' },
    { wert: 1000, label: 'C/D' },
    { wert: 3000, label: 'D/E' }
  ]
};
// Punkt 1: alle vier Anteils-Achsen FEST auf 0-100 (nicht auf den tatsächlichen
// Datenbereich) - macht sie untereinander direkt vergleichbar (100% ist bei
// allen vieren dieselbe Position), anders als bei einer datengetriebenen
// Skala, die je Achse unterschiedlich enden würde.
const ACHSE_GRUNDSTUECKE = { schluessel: 'grundstuecke', feld: 'Anteil Grundstuecke am RV (%)', label: 'Grundstücke (%)', einheit: '%', skalentyp: 'linear', domain: [0, 100] };
const ACHSE_BARGELD = { schluessel: 'bargeld', feld: 'Anteil Bargeld am RV (%)', label: 'Bargeld (%)', einheit: '%', skalentyp: 'linear', domain: [0, 100] };
const ACHSE_WERTGEGENSTAENDE = { schluessel: 'wertgegenstaende', feld: 'Anteil Wertgegenstaende am RV (%)', label: 'Wertgegenstände (%)', einheit: '%', skalentyp: 'linear', domain: [0, 100] };
const ACHSE_SONDERBESTAND = { schluessel: 'sonderbestand', feld: 'Anteil Sonderbestand am RV (%)', label: 'Sonderbestand (%)', einheit: '%', skalentyp: 'linear', domain: [0, 100] };
// Punkt 5: KEINE feste Domain - eigene, datengetriebene Skala je Achse.
// SchvG erreicht 780,49% (Ausreißer), `gestreckt: true` markiert das sichtbar
// (Sternchen am Achsentitel + Fußnotentext, siehe baueKopfzeile()/
// zeichneAchsen()).
const ACHSE_SCHZG = { schluessel: 'schzg', feld: 'Anteil SchzG an Aktiva (%)', label: 'SchzG an Aktiva (%)', einheit: '%', skalentyp: 'linear' };
const ACHSE_SCHVG = { schluessel: 'schvg', feld: 'Anteil SchvG an Aktiva (%)', label: 'SchvG an Aktiva (%)', einheit: '%', skalentyp: 'linear', gestreckt: true };

const ANSICHTEN = {
  vermoegensprofil: {
    knopfLabel: 'Vermögensprofil',
    titel: 'Vermögensprofile ausgewählter Verlassenschaftsinventare',
    achsen: [ACHSE_REALVERMOEGEN, ACHSE_GRUNDSTUECKE, ACHSE_BARGELD, ACHSE_WERTGEGENSTAENDE, ACHSE_SONDERBESTAND, ACHSE_GESAMTVERMOEGEN],
    // Punkt 1, "Wichtiger Beschriftungshinweis": die vier Anteils-Achsen
    // summieren sich NICHT auf 100% (live gegengeprüft: Median der Summe
    // 73,5%, Maximum 104,2% - exakt die im Auftrag genannten Werte) - daher
    // als "ausgewählte", nicht als vollständige Aufteilung beschriftet.
    anteilsGruppe: { von: 'grundstuecke', bis: 'sonderbestand', label: 'Ausgewählte Anteile am Realvermögen' }
  },
  schuldenprofil: {
    knopfLabel: 'Forderungs-/Schuldenprofil',
    titel: 'Forderungs-/Schuldenprofile ausgewählter Verlassenschaftsinventare',
    achsen: [ACHSE_REALVERMOEGEN, ACHSE_SCHZG, ACHSE_SCHVG, ACHSE_GESAMTVERMOEGEN],
    anteilsGruppe: null
  }
};

// Punkt 3: vier umschaltbare Farbcodierungen. `suffix`: Ort (Schätzung) trägt
// den "(geschätzt)"-Zusatz NICHT bereits im Rohwert (anders als Geschlecht,
// dessen CSV-Werte bereits wörtlich "maennlich (geschaetzt)"/"weiblich
// (geschaetzt)" lauten - dort genügt die unveränderte Anzeige des Rohwerts,
// siehe baueLegendeText() unten) - für Ort wird er beim Anzeigen ergänzt,
// die zugrunde liegende Farbskala bleibt trotzdem auf dem reinen Ortsnamen
// aufgebaut (stabiler Schlüssel).
const FARBFELD = {
  geschlecht: { spalte: 'Geschlecht (Schaetzung)', knopfLabel: 'Geschlecht (Schätzung)', suffix: false },
  ort: { spalte: 'Ort (Schaetzung)', knopfLabel: 'Ort (Schätzung)', suffix: true },
  jahrzehnt: { spalte: 'Jahrzehnt', knopfLabel: 'Jahrzehnt', suffix: false },
  vermoegensgruppe: { spalte: 'Vermoegensgruppe', knopfLabel: 'Vermögensgruppe', suffix: false }
};

// Punkt 6 (aus dem vorigen Auftrag) + Teil A3 (Folgeauftrag, neuer letzter
// Satz): beide Textteile wörtlich wie geliefert übernommen, noch nicht
// freigegeben. `\n\n` trennt die Absätze - infoButton.js teilt genau daran
// in einzelne <p>-Elemente auf (siehe dortiger Dateikopf-Kommentar).
const INFO_TEXT = 'Jede Linie zeigt das Vermögensprofil eines Verlassenschaftsinventars: von der Höhe des Realvermögens über dessen Zusammensetzung bis zum Gesamtergebnis. Die vier Anteilswerte summieren sich nicht auf 100 % - es sind ausgewählte, keine vollständigen Bestandteile. Über den Umschalter lässt sich zusätzlich ein Forderungs-/Schuldenprofil einblenden: SchzG ("Schulden zum Gut") zeigt Forderungen des Erblassers, SchvG ("Schulden vom Gut") die aus der Erbmasse zu begleichenden Verbindlichkeiten.\n\nDie Einteilung in die Vermögensgruppen A-E folgt der Klassifikation von Max Roman Dietrich (Masterarbeit "Verlassenschaftsinventare in Krems und Stein zwischen 1671 und 1719"). Die Inventare erfassen nahezu ausschließlich die besitzende Bürgerschaft - die besitzlose Unterschicht, die etwa die Hälfte der Stadtbevölkerung ausmachte, ist darin nicht vertreten.';

const DETAIL_FELDER_BASIS = [
  { feld: 'beruf', label: 'Beruf' },
  { feld: 'ort', label: 'Ort' },
  { feld: 'jahr', label: 'Jahr' }
];

let instanz = null; // { container, chartContainer, records, ansicht, farbModus, hover, auswahl, sidebar, infoButton, linienAuswahl } – eine aktive Ansicht pro Modul-Ladung

function wertFuerAchse(record, achse) {
  return parseKommaZahl(record[achse.feld]);
}

function istVollstaendig(record, achsen) {
  return achsen.every((achse) => wertFuerAchse(record, achse) !== null);
}

function baueSkala(achse, vollstaendig, bereich) {
  if (achse.skalentyp === 'log') {
    return d3.scaleLog().domain(d3.extent(vollstaendig, (r) => wertFuerAchse(r, achse))).range(bereich);
  }
  if (achse.skalentyp === 'symlog') {
    return d3.scaleSymlog().domain(d3.extent(vollstaendig, (r) => wertFuerAchse(r, achse))).range(bereich);
  }
  const domain = achse.domain || d3.extent(vollstaendig, (r) => wertFuerAchse(r, achse));
  return d3.scaleLinear().domain(domain).range(bereich);
}

function baueLinie(record, xSkala, skalen, achsen) {
  return d3.line()(achsen.map((achse) => [xSkala(achse.schluessel), skalen[achse.schluessel](wertFuerAchse(record, achse))]));
}

function formatiereWert(achse, wert) {
  if (wert === null) return '–';
  const zahl = achse.einheit === '%' ? wert.toLocaleString('de-AT', { maximumFractionDigits: 2 }) : wert.toLocaleString('de-AT');
  return `${zahl} ${achse.einheit}`;
}

function baueTooltipText(record, achsen) {
  const zeilen = [record['Name'] || '(ohne Name)'];
  achsen.forEach((achse) => zeilen.push(`${achse.label}: ${formatiereWert(achse, wertFuerAchse(record, achse))}`));
  return zeilen.join('\n');
}

function baueDetailRecord(record, achsen) {
  const detail = {
    name: record['Name'] || '(ohne Name)',
    beruf: record['Beruf'] || record['Beruf/Funktion/Stand'] || '',
    ort: record['Ort (Schaetzung)'] || '',
    jahr: record['Jahr'] || ''
  };
  achsen.forEach((achse) => { detail[achse.schluessel] = formatiereWert(achse, wertFuerAchse(record, achse)); });
  return detail;
}

function detailFelderFuerAchsen(achsen) {
  return [...DETAIL_FELDER_BASIS, ...achsen.map((achse) => ({ feld: achse.schluessel, label: achse.label }))];
}

// Punkt 3: Legende-Text je Farbwert - Ort bekommt den "(geschätzt)"-Zusatz
// hier ergänzt (siehe FARBFELD-Kommentar oben), Geschlecht trägt ihn bereits
// im Rohwert.
function baueLegendeText(farbModus, wert) {
  return FARBFELD[farbModus].suffix ? `${wert} (geschätzt)` : wert;
}

function ermittleWerteSortiert(records, spalte) {
  const werte = new Set();
  records.forEach((r) => { if (r[spalte]) werte.add(r[spalte]); });
  return [...werte].sort();
}

// Teil A1 (Folgeauftrag): Vermögensgruppe ist ein Sonderfall - eigene
// ordinale Skala (farbeFuerVermoegensgruppe()) statt der generischen
// `instanz.farbSkala` (die weiterhin nur für Geschlecht/Ort/Jahrzehnt gebaut
// wird, siehe baueLegende() unten).
function farbeFuerRecord(record) {
  if (instanz.farbModus === 'keine') return NEUTRALE_LINIENFARBE;
  if (instanz.farbModus === 'vermoegensgruppe') return farbeFuerVermoegensgruppe(record['Vermoegensgruppe']);
  const konfig = FARBFELD[instanz.farbModus];
  const wert = record[konfig.spalte];
  return wert ? instanz.farbSkala(wert) : NEUTRALE_LINIENFARBE;
}

// Punkt 2: 1:1 an sankey.js' gleichnamige Funktion angelehnt (siehe
// Dateikopf-Kommentar) - einzige Stelle, die tatsächlich Opazität/
// Linienstärke/Vordergrund auf die Linien anwendet, arbeitet auf der bereits
// gezeichneten `instanz.linienAuswahl` statt eines Neuaufbaus (kein Flackern
// bei jedem Hover). `aktiv = instanz.auswahl || instanz.hover` - eine
// fixierte Auswahl hat immer Vorrang vor einem laufenden Hover.
function aktualisiereHighlight() {
  const { linienAuswahl, auswahl, hover, farbModus } = instanz;
  if (!linienAuswahl) return;
  const aktiv = auswahl || hover;

  linienAuswahl
    .classed('ist-hervorgehoben-neutral', (d) => farbModus === 'keine' && d === aktiv)
    .attr('stroke-width', (d) => (d === aktiv ? 2.8 : 1.3))
    .attr('stroke-opacity', (d) => {
      if (!aktiv) return OPAZITAET_NORMAL;
      return d === aktiv ? OPAZITAET_HERVORGEHOBEN : OPAZITAET_ABGEBLENDET;
    });

  if (aktiv) linienAuswahl.filter((d) => d === aktiv).raise();
}

// Punkt 2: Klick fixiert die Hervorhebung UND öffnet die Sidebar gemeinsam -
// Klick auf dieselbe bereits fixierte Linie löst beides wieder (dasselbe
// Toggle-Muster wie sankey.js' schalteLinkAuswahl()/schalteKnotenAuswahl()).
function schalteAuswahl(record) {
  if (instanz.auswahl === record) {
    instanz.auswahl = null;
    schliesseSidebar(instanz.sidebar, instanz.container);
  } else {
    instanz.auswahl = record;
    oeffneDetail(record);
  }
  aktualisiereHighlight();
}

function raeumeAuswahlAuf() {
  if (!instanz.auswahl) return;
  instanz.auswahl = null;
  schliesseSidebar(instanz.sidebar, instanz.container);
  aktualisiereHighlight();
}

function oeffneDetail(record) {
  const achsen = ANSICHTEN[instanz.ansicht].achsen;
  oeffneSidebar(instanz.sidebar, baueDetailRecord(record, achsen), { felder: detailFelderFuerAchsen(achsen) });
}

// Punkt 2: Escape löst eine fixierte Auswahl (app-weiter document-Listener,
// analog zu sankey.js' handleEscape()/infoButton.js' Muster) - in destroy()
// wieder entfernt.
function handleEscape(event) {
  if (event.key === 'Escape' && instanz?.auswahl) raeumeAuswahlAuf();
}

function baueKopfzeile(container, ansichtKey) {
  const kopfzeile = document.createElement('div');
  kopfzeile.className = 'parkoord-kopfzeile';

  const titel = document.createElement('h3');
  titel.className = 'parkoord-titel';
  titel.textContent = ANSICHTEN[ansichtKey].titel;
  kopfzeile.appendChild(titel);

  const ansichtUmschalter = document.createElement('div');
  ansichtUmschalter.className = 'parkoord-umschalter';
  Object.entries(ANSICHTEN).forEach(([key, konfig]) => {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = key === ansichtKey ? 'parkoord-knopf ist-aktiv' : 'parkoord-knopf';
    knopf.textContent = konfig.knopfLabel;
    knopf.addEventListener('click', () => {
      if (instanz.ansicht === key) return;
      instanz.ansicht = key;
      raeumeAuswahlAuf();
      zeichneParallelKoordinaten();
    });
    ansichtUmschalter.appendChild(knopf);
  });
  kopfzeile.appendChild(ansichtUmschalter);

  // Punkt 3: Klick auf den bereits aktiven Farbknopf schaltet auf "keine"
  // zurück (Toggle, wie bei der Achsen-/Auswahl-Fixierung oben) - so bleibt
  // "keine Farbcodierung" (Standardzustand) jederzeit erreichbar, ohne einen
  // fünften, eigenen "Keine"-Knopf neben den vier im Auftrag genannten zu
  // brauchen.
  const farbUmschalter = document.createElement('div');
  farbUmschalter.className = 'parkoord-umschalter';
  Object.entries(FARBFELD).forEach(([modus, konfig]) => {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = modus === instanz.farbModus ? 'parkoord-knopf ist-aktiv' : 'parkoord-knopf';
    knopf.textContent = `Farbe: ${konfig.knopfLabel}`;
    knopf.addEventListener('click', () => {
      instanz.farbModus = instanz.farbModus === modus ? 'keine' : modus;
      zeichneParallelKoordinaten();
    });
    farbUmschalter.appendChild(knopf);
  });
  kopfzeile.appendChild(farbUmschalter);

  return kopfzeile;
}

// Teil A1 (Folgeauftrag): Vermögensgruppe zeigt ihre Legende in der
// vorgegebenen Anzeigereihenfolge (A, A*, B, C, D, E, S - siehe
// js/utils/vermoegensgruppenFarben.js), NICHT alphabetisch wie die übrigen
// drei Farbfelder - macht die Rot-Gelb-Grün-Rangfolge auch in der Legende
// selbst als geordnete Reihe sichtbar, statt sie durch Sortierung zufällig
// zu verwürfeln. Nur tatsächlich in den Daten vorkommende Werte werden
// gezeigt (Filter unten), falls einzelne Gruppen fehlen sollten.
function baueLegende(container, vollstaendig) {
  if (instanz.farbModus === 'keine') return null;

  if (instanz.farbModus === 'vermoegensgruppe') {
    const vorhandene = new Set(vollstaendig.map((r) => r['Vermoegensgruppe']).filter(Boolean));
    const werte = VERMOEGENSGRUPPE_ANZEIGE_REIHENFOLGE.filter((w) => vorhandene.has(w));
    const legende = document.createElement('div');
    legende.className = 'parkoord-legende';
    werte.forEach((wert) => {
      const eintrag = document.createElement('span');
      eintrag.className = 'parkoord-legende-eintrag';
      const punkt = document.createElement('span');
      punkt.className = 'parkoord-legende-punkt';
      punkt.style.background = farbeFuerVermoegensgruppe(wert);
      eintrag.append(punkt, document.createTextNode(wert));
      legende.appendChild(eintrag);
    });
    container.appendChild(legende);
    return legende;
  }

  const konfig = FARBFELD[instanz.farbModus];
  const werte = ermittleWerteSortiert(vollstaendig, konfig.spalte);
  const farbSkala = baueKategorieFarbSkala(werte);
  instanz.farbSkala = farbSkala;

  const legende = document.createElement('div');
  legende.className = 'parkoord-legende';
  werte.forEach((wert) => {
    const eintrag = document.createElement('span');
    eintrag.className = 'parkoord-legende-eintrag';
    const punkt = document.createElement('span');
    punkt.className = 'parkoord-legende-punkt';
    punkt.style.background = farbSkala(wert);
    eintrag.append(punkt, document.createTextNode(baueLegendeText(instanz.farbModus, wert)));
    legende.appendChild(eintrag);
  });
  container.appendChild(legende);
  return legende;
}

function zeichneAchsen(svg, xSkala, skalen, achsen, ansichtKey) {
  achsen.forEach((achse) => {
    const x = xSkala(achse.schluessel);
    const achsenGruppe = d3.axisLeft(skalen[achse.schluessel]).ticks(5);
    if (achse.skalentyp === 'log') achsenGruppe.ticks(5, '~s');
    svg.append('g').attr('class', 'parkoord-achse').attr('transform', `translate(${x},0)`).call(achsenGruppe);

    svg.append('text')
      .attr('x', x).attr('y', RAND.oben - 12)
      .attr('text-anchor', 'middle').attr('font-size', ACHSEN_SCHRIFTGROESSE).attr('font-weight', 'bold')
      .text(achse.label + (achse.gestreckt ? ' *' : ''));

    // Teil A2 (Folgeauftrag): Dietrichs Kategorie-Schwellenwerte als dezente,
    // beschriftete Referenzlinien - "dezent" (Auftrag, wörtlich) heißt hier
    // gestrichelt/gedämpfte Farbe statt der früheren, kräftig hervorgehobenen
    // einzelnen Nulllinie (siehe CSS-Klasse .parkoord-referenzlinie unten).
    // Beschriftung rechts neben der Linie, in dieser Achse immer frei (letzte
    // Achse beider Ansichten, RAND.rechts bietet dafür ausreichend Platz).
    if (achse.referenzlinien) {
      achse.referenzlinien.forEach(({ wert, label }) => {
        const y = skalen[achse.schluessel](wert);
        svg.append('line').attr('class', 'parkoord-referenzlinie')
          .attr('x1', x - 16).attr('x2', x + 16).attr('y1', y).attr('y2', y);
        svg.append('text').attr('class', 'parkoord-referenzlinie-label')
          .attr('x', x + 20).attr('y', y + 3)
          .attr('font-size', ACHSEN_SCHRIFTGROESSE - 3)
          .text(label);
      });
    }
  });

  // Punkt 1: Gruppenklammer + -beschriftung über den vier Anteils-Achsen
  // ("Ausgewählte Anteile am Realvermögen") - nur im Vermögensprofil.
  const gruppe = ANSICHTEN[ansichtKey].anteilsGruppe;
  if (gruppe) {
    const xVon = xSkala(gruppe.von);
    const xBis = xSkala(gruppe.bis);
    svg.append('line').attr('class', 'parkoord-gruppenklammer')
      .attr('x1', xVon).attr('x2', xBis).attr('y1', RAND.oben - 30).attr('y2', RAND.oben - 30);
    svg.append('text')
      .attr('x', (xVon + xBis) / 2).attr('y', RAND.oben - 34)
      .attr('text-anchor', 'middle').attr('font-size', ACHSEN_SCHRIFTGROESSE - 2).attr('font-style', 'italic')
      .text(gruppe.label);
  }
}

function zeichneParallelKoordinaten() {
  const { chartContainer, records } = instanz;
  const container = chartContainer;
  container.innerHTML = '';

  const style = document.createElement('style');
  style.textContent = `
    .parkoord-achse { font-size: ${ACHSEN_SCHRIFTGROESSE}px; }
    .parkoord-titel { margin: 0 0 var(--space-2) 0; }
    .parkoord-kopfzeile { margin-bottom: var(--space-2); }
    .parkoord-umschalter { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-2); }
    .parkoord-knopf { min-height: 44px; padding: var(--space-1) var(--space-3); border-radius: var(--radius);
      border: 1px solid var(--border); background: var(--bg); font-family: inherit; font-size: var(--fs-sm); cursor: pointer; }
    .parkoord-knopf.ist-aktiv { background: var(--accent); border-color: var(--accent); color: var(--surface); font-weight: 600; }
    .parkoord-knopf:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
    .parkoord-legende { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); margin-bottom: var(--space-2); font-size: var(--fs-sm); }
    .parkoord-legende-eintrag { display: inline-flex; align-items: center; gap: 4px; }
    .parkoord-legende-punkt { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .parkoord-fussnote { font-size: var(--fs-sm); color: var(--text-muted); margin: 0 0 var(--space-2) 0; }
    .parkoord-referenzlinie { stroke: var(--text-muted); stroke-width: 1; stroke-dasharray: 3,2; }
    .parkoord-referenzlinie-label { fill: var(--text-muted); dominant-baseline: middle; }
    .parkoord-gruppenklammer { stroke: var(--text-muted); stroke-width: 1; }
    .verlassenschaft-linie { cursor: pointer; }
    .verlassenschaft-linie.ist-hervorgehoben-neutral { stroke: var(--accent); }
    .verlassenschaft-linie:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  `;
  container.appendChild(style);

  const ansichtKey = instanz.ansicht;
  const achsen = ANSICHTEN[ansichtKey].achsen;
  // Punkt 4 (bewusst OHNE jeden Hinweistext, siehe Dateikopf-Kommentar):
  // VI-0004 wird hier still herausgefiltert.
  const vollstaendig = records.filter((r) => istVollstaendig(r, achsen));

  const kopfzeile = baueKopfzeile(container, ansichtKey);
  container.appendChild(kopfzeile);
  baueLegende(kopfzeile, vollstaendig);

  // Punkt 5: Fußnote zur "stark gestreckten" SchvG-Skala, nur im
  // Forderungs-/Schuldenprofil - Maximum live aus den Daten berechnet
  // (nicht hart codiert), damit der Text auch bei künftigen Datenänderungen
  // stimmt.
  if (ansichtKey === 'schuldenprofil') {
    const maxSchvg = d3.max(vollstaendig, (r) => wertFuerAchse(r, ACHSE_SCHVG));
    const fussnote = document.createElement('p');
    fussnote.className = 'parkoord-fussnote';
    fussnote.textContent = `* SchvG an Aktiva (%) hat eine eigene Skala bis zum tatsächlichen Maximum (${maxSchvg.toLocaleString('de-AT', { maximumFractionDigits: 2 })} %) - deutlich stärker gestreckt als die übrigen Achsen.`;
    kopfzeile.appendChild(fussnote);
  }

  const kopfzeileHoehe = kopfzeile.getBoundingClientRect().height + 10;
  const breite = instanz.options.width || container.clientWidth || 900;
  // WICHTIG (selbst gefundener Bug in (49), hier von Anfang an korrekt):
  // Höhen-Budget wird von `instanz.container` gemessen (das echte
  // `.viz-inhalt`-Element), NICHT von `container`/chartContainer hier - ein
  // <div> ohne eigene Höhe bezieht seine clientHeight zum Messzeitpunkt nur
  // aus seinem bisherigen Inhalt (der eben erst angehängten Kopfzeile
  // selbst), siehe CHANGELOG (49).
  const hoehePlot = (instanz.options.height || Math.max(instanz.container.clientHeight || 450, 450)) - RAND.oben - RAND.unten - kopfzeileHoehe;
  const xSkala = d3.scalePoint().domain(achsen.map((a) => a.schluessel)).range([RAND.links, breite - RAND.rechts]);
  const skalen = {};
  achsen.forEach((achse) => { skalen[achse.schluessel] = baueSkala(achse, vollstaendig, [hoehePlot, 0]); });

  const svgHoehe = hoehePlot + RAND.oben + RAND.unten;
  const svg = d3.select(container).append('svg').attr('width', breite).attr('height', svgHoehe)
    .attr('viewBox', `0 0 ${breite} ${svgHoehe}`)
    .attr('role', 'img')
    .attr('aria-label', ANSICHTEN[ansichtKey].titel);
  svg.append('desc').text(
    `${achsen.length} Achsen: ${achsen.map((a) => a.label).join(', ')}. Jede Linie ist ein Verlassenschaftsinventar. ` +
    'Hover hebt eine Linie hervor, Klick fixiert die Hervorhebung und öffnet die Detailansicht.'
  );

  // Punkt 2 (siehe Dateikopf-Kommentar): Klick auf die freie Fläche löst
  // eine fixierte Auswahl - unterste Ebene, dasselbe Muster wie sankey.js.
  svg.append('rect').attr('width', breite).attr('height', svgHoehe).attr('fill', 'transparent')
    .on('click', raeumeAuswahlAuf);

  const plotGruppe = svg.append('g').attr('transform', `translate(0,${RAND.oben})`);

  const linien = plotGruppe.append('g').attr('class', 'parkoord-linien')
    .selectAll('path.verlassenschaft-linie')
    .data(vollstaendig)
    .join('path')
    .attr('class', 'verlassenschaft-linie')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => `${d['Name'] || 'ohne Name'}, Details anzeigen`)
    .attr('d', (d) => baueLinie(d, xSkala, skalen, achsen))
    .attr('fill', 'none')
    .attr('stroke', (d) => farbeFuerRecord(d));

  instanz.linienAuswahl = linien;

  linien
    .on('mouseenter focus', (event, d) => {
      instanz.hover = d;
      aktualisiereHighlight();
      zeigeTooltip(baueTooltipText(d, achsen), event.currentTarget, container);
    })
    .on('mouseleave blur', () => {
      instanz.hover = null;
      aktualisiereHighlight();
      versteckeTooltip();
    })
    .on('click', (event, d) => { event.stopPropagation(); schalteAuswahl(d); })
    .on('keydown', (event, d) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      schalteAuswahl(d);
    });

  zeichneAchsen(plotGruppe, xSkala, skalen, achsen, ansichtKey);
  aktualisiereHighlight();
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  container.innerHTML = '';
  // Eigener Kind-Container für Kopfzeile+SVG, getrennt von der Sidebar (siehe
  // CHANGELOG (49) für die Begründung dieser Aufteilung).
  const chartContainer = document.createElement('div');
  container.appendChild(chartContainer);

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.style.cssText = 'display:flex;justify-content:flex-end;';
  container.appendChild(werkzeugleiste);

  instanz = {
    container, chartContainer, records: data, options: { width: null, height: null, ...options },
    // Teil A1 (Folgeauftrag): Standard ist jetzt "vermoegensgruppe" statt
    // "keine" - siehe Dateikopf-Kommentar.
    ansicht: 'vermoegensprofil', farbModus: 'vermoegensgruppe', hover: null, auswahl: null, farbSkala: null, linienAuswahl: null
  };
  instanz.infoButton = erzeugeInfoButton(werkzeugleiste, { text: INFO_TEXT, ariaLabel: 'Erklärung zu den Parallelkoordinaten' });
  fuegeSidebarStyleEin(container);
  instanz.sidebar = baueSidebarGeruest(container);
  instanz.sidebar.schliessenBtn.addEventListener('click', () => {
    instanz.auswahl = null;
    schliesseSidebar(instanz.sidebar, container);
    aktualisiereHighlight();
  });
  document.addEventListener('keydown', handleEscape);
  zeichneParallelKoordinaten();
}

export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneParallelKoordinaten();
}

export function destroy() {
  if (!instanz) return;
  document.removeEventListener('keydown', handleEscape);
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
}

// AUFTRAG "Fuehrungen, Teil 2b", Punkt 4: schmale, von js/utils/
// datensatzAufruf.js aufgerufene Oeffnen-Funktion - findet den Record per
// id und ruft denselben schalteAuswahl() auf wie der bestehende
// Klick-Handler (Zeile 551), inklusive der dort bereits eingebauten
// Linien-Hervorhebung - keine eigene Sidebar-/Hervorhebungslogik hier.
export function oeffneDatensatz(id) {
  if (!instanz) return false;
  const record = instanz.records.find((r) => r.id === id);
  if (!record) return false;
  if (instanz.auswahl !== record) schalteAuswahl(record);
  return true;
}
