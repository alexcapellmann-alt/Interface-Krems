// js/viz/personenliste.js
// Personenliste: sortier- und durchsuchbare Tabelle des vollständigen
// Personenregisters (personenliste.csv - Urkunden UND Bürgerbuch, siehe SCHEMA.md).
// Modul-Interface siehe Abschnitt 5.
//
// AUFTRAG "Personenliste – Sidebar mit den tatsächlichen Urkunden/
// Bürgerbuch-Einträgen": `data` ist jetzt NICHT mehr das flache
// personenliste.csv-Array allein, sondern das kombinierte
// `{familien, personenliste, urkunden, buergerbuch}`-Objekt (`personen`-Typ
// in archivalienRegistry.js, `datenSchluessel` bei dieser Ansicht dafür
// entfernt - dasselbe Muster wie chordDiagramm.js, das ebenfalls mehr als
// eine Quelle gleichzeitig braucht) - `buergerbuch.csv` ist dabei eine NEUE,
// vierte Quelle in `personen.datenDatei` (vorher nur familien/personenliste/
// urkunden). Klick auf eine Personen-Zeile löst `nennung_in_urkunden`
// (Signatur(en), pipe-getrennt bei mehreren) über `urkunden.csv`s
// `signatur` und `nennung_in_buergerbuch` (ID(s) wie "BB-2454") über
// `buergerbuch.csv`s `id` auf und zeigt die tatsächlich gefundenen
// Einträge in der etablierten Sidebar (js/utils/sidebar.js) - siehe
// zeigePersonenNennungen() weiter unten für die volle Fallunterscheidung.
//
// Gegenprüfung der Auftrags-Prämisse "Bürgerbuch-Sidebar-Nutzung ... in
// personennetzwerk.js": personennetzwerk.js zeigt Bürgschaftsbeziehungen
// als reines Kraft-Netzwerk mit Tooltips - es hat KEINE Sidebar und keine
// Bürgerbuch-Detaildarstellung (grep-bestätigt: keine einzige Erwähnung von
// "sidebar" in dieser Datei). Es gibt also keine bestehende Bürgerbuch-
// Sidebar-Darstellung im Projekt, auf die sich "analog" beziehen ließe -
// baueBuergerbuchDetailInhalt()/baueBuergerbuchListeInhalt() unten sind
// deshalb NEU, orientieren sich aber an Form/CSS-Klassen der bestehenden
// Urkunden-Äquivalente aus sidebar.js (baueUrkundenDetailInhalt()/
// baueUrkundenListeInhalt(), hier importiert und für den Urkunden-Teil
// unverändert wiederverwendet - "bestehendes Muster wiederverwenden" gilt
// dort, wo es tatsächlich existiert).
//
// Datenlage-Befund (Transparenz, Auftrag erwähnt "Person kommt in beiden
// Quellen vor" als Möglichkeit): in den aktuellen Daten hat KEINE einzige
// der 4116 personenliste.csv-Zeilen gleichzeitig `nennung_in_urkunden` UND
// `nennung_in_buergerbuch` befüllt (`quelle` ist immer eindeutig "Urkunden"
// ODER "Bürgerbuch", 1458 + 2658 = 4116) - der kombinierte Listen-Zweig
// unten ist trotzdem vollständig implementiert (Akzeptanzkriterium verlangt
// korrektes Verhalten, keine Annahme über künftige Datenpflege) und wurde
// mangels echtem Beispiel per Konsole/synthetischem Datensatz getestet,
// siehe Selbstauskunft im Chat.
//
// Interaktion (Auftrag, wörtlich "bestehendes, etabliertes Muster
// wiederverwenden"): genau 1 Treffer INSGESAMT (Urkunden + Bürgerbuch
// zusammengezählt) öffnet direkt die volle Detailansicht (Urkunden- oder
// Bürgerbuch-Form, je nachdem), mehrere öffnen eine kompakte Liste mit
// Klick-durch zur jeweiligen Detailansicht - dieselbe "1 -> Detail, mehrere
// -> Liste"-Konvention wie zeigeUrkundenSidebar() in sidebar.js, hier aber
// lokal nachgebaut (nicht direkt zeigeUrkundenSidebar() aufgerufen), weil
// diese Funktion NUR Urkunden-Listen kennt und die geforderte, klar
// getrennte "In Urkunden:"/"Im Bürgerbuch:"-Zwei-Abschnitte-Liste (bei
// gleichzeitigen Treffern in beiden Quellen) nicht abbilden kann -
// sidebar.js selbst bleibt dabei UNVERÄNDERT (Betroffene Dateien laut
// Auftrag: nur personenliste.js), der eigene, zweite Klick-Listener auf
// `zurueckBtn` (siehe unten) ergänzt sidebar.js' bereits vorhandenen,
// dort für `_urkundenListe` zuständigen Listener, ohne ihn zu ersetzen -
// dieser bleibt für den (hier nie befüllten) `_urkundenListe`-Fall ein
// harmloses No-Op.
//
// unsicherheit_anmerkung bezieht sich bei personenliste.csv selbst auf die
// ganze Zeile (keine `<feldname>_unsicher`-Begleitfelder, siehe SCHEMA.md) -
// anders als bei urkunden.csv wird deshalb nicht pro Feld, sondern pro
// Zeile markiert. buergerbuch.csv hat dagegen echte `<feldname>_unsicher`-
// Felder (Datum_unsicher/Beruf_unsicher/orte_unsicher) - siehe
// istBuergerbuchUnsicher() unten, analog zu sidebar.js' istUrkundeUnsicher().

import { zeigeTooltip, versteckeTooltip } from '../utils/tooltip.js';
import { erzeugeInfoButton } from '../utils/infoButton.js';
import { baueUnsicherheitAbsatz } from '../utils/unsicherAbsatz.js';
import { UNSICHERHEIT_SYMBOL } from '../config/constants.js';
import {
  baueSidebarGeruest, fuegeSidebarStyleEin, schliesseSidebar,
  baueUrkundenListeInhalt, baueUrkundenDetailInhalt
} from '../utils/sidebar.js';

// AUFTRAG "Info-Button für die 6 bleibenden Module": Text wörtlich übernommen.
// AUFTRAG "Sortierung nach Nachname & Paginierungs-Button-Layout", Punkt 3:
// zweiter Absatz wörtlich ergänzt (Transparenz über die Sortier-Heuristik,
// siehe ermittleSortierNachname()).
const PERSONENLISTE_INFO_TEXT = `Diese Liste zeigt alle in den Quellen erfassten Personen mit ihren Schreibvarianten, der Herkunftsquelle sowie erster und letzter Nennung. Klick auf eine Spaltenüberschrift sortiert die Liste danach.

Die Sortierung nach Name folgt einer vereinfachten Heuristik (letzter erkennbarer Namensbestandteil nach Entfernen von Titeln, Herkunftsangaben und Verwandtschaftszusätzen) – bei uneinheitlicher historischer Schreibweise ist eine zuverlässige Trennung von Vor- und Nachname nicht in allen Fällen möglich.`;

// Punkt 2 - Liste wörtlich wie im Auftrag vorgegeben (Groß-/Kleinschreibung
// und Punkt werden beim Abgleich ignoriert, siehe istTitelwort()).
const TITEL_WOERTER = [
  'abt', 'pfleger', 'bürgermeister', 'richter', 'dechant', 'propst', 'bischof', 'herzog', 'graf',
  'ritter', 'meister', 'frau', 'herr', 'pfarrer', 'kaplan', 'stadtschreiber', 'bürger', 'witwe',
  'gräfin', 'herzogin', 'freiherr', 'vikar', 'kanoniker', 'domherr', 'landrichter', 'stadtrichter',
  'kammerer', 'kämmerer', 'rat', 'ratsherr'
];
const ARTIKEL_WOERTER = ['der', 'die', 'dem', 'des'];
const VERWANDTSCHAFT_ENDUNGEN = ['sohn', 'sonn', 'tochter'];
// Herkunfts-/Sitzangabe-Marker - AUFTRAG "Personenliste – Sonderfälle bei
// Sortierung & Datenbereinigung", Punkt 2: "zum"/"zur" werden genauso wie
// "von"/"zu" behandelt (Wort + Folgewort entfernen).
const HERKUNFT_MARKER = ['von', 'zu', 'zum', 'zur'];

// Punkt 3 (Sonderfälle-Auftrag): eine am Ende stehende Klammer, die auf
// "?)" schließt, markiert eine UNSICHERE Namensvermutung (z.B. "Georg
// (Irnfridt?)") - der Klammerinhalt selbst (ohne "?"/Klammern) ist dann
// der eigentliche vermutete Nachname und ersetzt die normale Regel 1-6
// VOLLSTÄNDIG (Auftrag, wörtlich: "anstelle des Wortes davor, nicht
// zusätzlich") - deshalb als früher Sonderfall-Rückgabepfad umgesetzt,
// nicht als weitere Entfernungsregel innerhalb der normalen Wortliste.
const UNSICHERE_VERMUTUNG_MUSTER = /\(([^()]+)\?\)\s*$/;

// Punkt 4 (Sonderfälle-Auftrag): reine Ordinalzahl-Wörter ("V.", "III.")
// - dieselbe römische-Ziffern-Erkennung wie familienbaum.js'
// ermittleKurzname() (dort für dieselbe Art Ordnungszahl-Erkennung nach
// einem Vornamen), hier zusätzlich eine geklammerte Variante für die
// alternative-Zählung-Angabe wie "(III.)".
const ROEMISCH_MUSTER = /^[ivxlcdm]+\.?$/i;
const ROEMISCH_KLAMMER_MUSTER = /^\([ivxlcdm]+\.?\)$/i;

function istTitelwort(wort) {
  return TITEL_WOERTER.includes(wort.toLowerCase().replace(/\.$/, ''));
}

// Punkt 2: Heuristik, KEINE linguistisch gesicherte Nachnamen-Erkennung
// (Auftrag, wörtlich - deshalb auch im Info-Text und im Spalten-Hinweis
// transparent gemacht, siehe PERSONENLISTE_INFO_TEXT/baueKopfzeile()).
// Wendet die Entfernungsregeln in der im Auftrag vorgegebenen Reihenfolge
// an (1. erste Schreibvariante, 2. Titel/Amt am Wortanfang, 3. "von"/"zu"/
// "zum"/"zur" + Folgewort, 4. Artikel "der/die/dem/des" einzeln,
// 5. "sohn"/"sonn"/"tochter" am Wortende, 5b. reine Ordinalzahl-Namen mit
// zusätzlicher geklammerter Ordinalzahl - siehe "Sonderfälle"-Auftrag) -
// das jeweils letzte verbleibende Wort ist der Sortierschlüssel (Regel 6,
// Ausnahme 5b nimmt stattdessen das erste Wort). Ein leerer Rest (z.B. ein
// Name, der komplett aus entfernten Wörtern bestünde) fällt auf die
// ursprüngliche erste Schreibvariante zurück - reines Sicherheitsnetz.
function ermittleSortierNachname(schreibweisen) {
  let erste = Array.isArray(schreibweisen) ? schreibweisen[0] : String(schreibweisen || '');
  if (typeof schreibweisen === 'string' && schreibweisen.includes('|')) {
    erste = schreibweisen.split('|')[0];
  }
  erste = (erste || '').trim();
  if (!erste) return '';

  // Regel 3 (Sonderfälle-Auftrag, Punkt 3): unsichere Namensvermutung in
  // einer "(...?)"-Klammer am Ende ERSETZT die normale Verarbeitung
  // vollständig, siehe Konstanten-Kommentar oben.
  const vermutungsTreffer = erste.match(UNSICHERE_VERMUTUNG_MUSTER);
  if (vermutungsTreffer) {
    return vermutungsTreffer[1].trim();
  }

  let woerter = erste.split(/\s+/).filter(Boolean);

  // Regel 2: Titel-/Amtswörter am Wortanfang entfernen - ggf. mehrere
  // direkt aufeinanderfolgende (z.B. "Herr Pfarrer X").
  while (woerter.length > 1 && istTitelwort(woerter[0])) {
    woerter.shift();
  }

  // Regel 3: "von"/"zu"/"zum"/"zur" UND das direkt darauffolgende Wort
  // entfernen (Herkunfts-/Sitzangabe) - wiederholt, falls mehrfach
  // vorhanden.
  let geaendert = true;
  while (geaendert) {
    geaendert = false;
    for (let i = 0; i < woerter.length; i += 1) {
      const wortLower = woerter[i].toLowerCase();
      if (HERKUNFT_MARKER.includes(wortLower)) {
        const anzahlZuEntfernen = i + 1 < woerter.length ? 2 : 1;
        woerter.splice(i, anzahlZuEntfernen);
        geaendert = true;
        break;
      }
    }
  }

  // Regel 4: "der"/"die"/"dem"/"des" entfernen, Folgewort bleibt erhalten.
  woerter = woerter.filter((w) => !ARTIKEL_WOERTER.includes(w.toLowerCase()));

  // Regel 5: "sohn"/"sonn"/"tochter" am Wortende entfernen (als eigenes
  // letztes Wort, nicht als Endung eines zusammengesetzten Worts).
  if (woerter.length > 1) {
    const letztes = woerter[woerter.length - 1].toLowerCase().replace(/\.$/, '');
    if (VERWANDTSCHAFT_ENDUNGEN.includes(letztes)) {
      woerter.pop();
    }
  }

  // Regel 5b (Sonderfälle-Auftrag, Punkt 4): bleibt sowohl ein reines
  // Ordinalzahl-Wort ("V.") ALS AUCH eine zusätzliche geklammerte
  // Ordinalzahl ("(III.)") übrig, sind beide keine brauchbaren
  // Sortierschlüssel (weder Nach- noch Vorname) - Schlüssel ist dann
  // stattdessen das ERSTE verbleibende Wort (Vorname, Auftrag wörtlich),
  // nicht das letzte wie sonst üblich (Regel 6). Der angezeigte Name
  // bleibt davon unberührt - diese Funktion liefert ausschließlich den
  // Sortierschlüssel, siehe SPALTEN' sortWertFn/wertFn-Trennung.
  if (woerter.length > 1) {
    const hatPlainOrdinal = woerter.some((w) => ROEMISCH_MUSTER.test(w));
    const hatGeklammerteOrdinal = woerter.some((w) => ROEMISCH_KLAMMER_MUSTER.test(w));
    if (hatPlainOrdinal && hatGeklammerteOrdinal) {
      const bereinigt = woerter.filter((w) => !ROEMISCH_MUSTER.test(w) && !ROEMISCH_KLAMMER_MUSTER.test(w));
      if (bereinigt.length > 0) return bereinigt[0];
    }
  }

  // Regel 6: letztes verbleibendes Wort ist der Sortierschlüssel.
  if (woerter.length === 0) return erste;
  return woerter[woerter.length - 1];
}

let instanz = null; // { container, records, options, sortierung, suchbegriff, aktuelleSeite, infoButton, sidebar, urkundenNachSignatur, buergerbuchNachId, inventareNachId } – eine aktive Liste pro Modul-Ladung

// AUFTRAG "Personenliste – Sidebar...": hält die zuletzt gezeigte
// kombinierte Liste (Name + aufgelöste Urkunden-/Bürgerbuch-Records) für die
// Zurück-Navigation aus einer Detailansicht - Modul-weiter Zustand analog zu
// `instanz` selbst (siehe Dateikopf-Kommentar zum zweiten, eigenen
// `zurueckBtn`-Listener), in destroy() zurückgesetzt.
let sidebarListenZustand = null;

// Löst `nennung_in_urkunden` (Signatur(en), ggf. Liste bei mehreren) über
// die übergebene Signatur->Record-Map auf - nicht auflösbare Signaturen
// werden stillschweigend übersprungen (dieselbe Datenehrlichkeit wie
// verbindungskarte.js/bipartiteFlowMap.js' "nicht auflösbare Records werden
// verworfen", hier aber pro Signatur statt pro ganzem Record).
function ermittleUrkundenFuerPerson(record, urkundenNachSignatur) {
  const signaturen = Array.isArray(record.nennung_in_urkunden)
    ? record.nennung_in_urkunden
    : (record.nennung_in_urkunden ? [record.nennung_in_urkunden] : []);
  return signaturen.map((signatur) => urkundenNachSignatur.get(signatur)).filter(Boolean);
}

// Löst `nennung_in_buergerbuch` (ID(s) wie "BB-2454", ggf. Liste) über die
// übergebene ID->Record-Map auf.
function ermittleBuergerbuchFuerPerson(record, buergerbuchNachId) {
  const ids = Array.isArray(record.nennung_in_buergerbuch)
    ? record.nennung_in_buergerbuch
    : (record.nennung_in_buergerbuch ? [record.nennung_in_buergerbuch] : []);
  return ids.map((id) => buergerbuchNachId.get(id)).filter(Boolean);
}

// AUFTRAG "Teil 2h", Punkt 4b: löst `nennung_in_verlassenschaften` (ID(s)
// wie "VI-0024", pipe-getrennte Liste bei einer Zweitinventarisierung
// derselben Person, z.B. `bartholomaeus_eggartner` -> "VI-0024|VI-0028",
// siehe PROJEKTLOG) über die übergebene ID->Record-Map auf - analog zu den
// beiden Funktionen oben.
function ermittleInventareFuerPerson(record, inventareNachId) {
  const ids = Array.isArray(record.nennung_in_verlassenschaften)
    ? record.nennung_in_verlassenschaften
    : (record.nennung_in_verlassenschaften ? [record.nennung_in_verlassenschaften] : []);
  return ids.map((id) => inventareNachId.get(id)).filter(Boolean);
}

// Dasselbe Label+Wert-Feld-Layout wie sidebar.js' (dort private)
// baueSidebarFeld() - bewusst inhaltsgleich statt exportiert/importiert
// (sidebar.js bleibt laut Auftrag unverändert), nutzt aber dieselben,
// bereits vorhandenen CSS-Klassen (.bestand-sidebar-feld/-feld-label), die
// fuegeSidebarStyleEin() app-weit generisch definiert - visuell also
// identisch zur Urkunden-Detailansicht.
function baueBuergerbuchSidebarFeld(label, wert) {
  const feld = document.createElement('div');
  feld.className = 'bestand-sidebar-feld';
  const labelEl = document.createElement('div');
  labelEl.className = 'bestand-sidebar-feld-label';
  labelEl.textContent = label;
  const wertEl = document.createElement('div');
  wertEl.textContent = wert;
  feld.append(labelEl, wertEl);
  return feld;
}

// Volle Detailansicht EINES Bürgerbuch-Eintrags - Feldauswahl exakt wie im
// Auftrag benannt ("Datum, Beruf, Ort, Bürgen"), plus Wirtschaftssektor/
// Anmerkungen (in buergerbuch.csv vorhanden, weggelassen wäre Auslassung
// tatsächlich vorhandener Angaben) und den Unsicher-Hinweis, analog zu
// baueUrkundenDetailInhalt()'s Aufbau (Feld für Feld, nur wenn befüllt).
function baueBuergerbuchDetailInhalt(record) {
  const wrapper = document.createElement('div');
  wrapper.appendChild(baueBuergerbuchSidebarFeld('Datum', record.Datum || '(kein Datum)'));
  if (record.Beruf) wrapper.appendChild(baueBuergerbuchSidebarFeld('Beruf', record.Beruf));
  if (record.Wirtschaftssektor) wrapper.appendChild(baueBuergerbuchSidebarFeld('Wirtschaftssektor', record.Wirtschaftssektor));
  if (record.Ort) wrapper.appendChild(baueBuergerbuchSidebarFeld('Ort', record.Ort));
  if (record.Buergen) wrapper.appendChild(baueBuergerbuchSidebarFeld('Bürgen', record.Buergen));
  if (record.Anmerkungen) wrapper.appendChild(baueBuergerbuchSidebarFeld('Anmerkungen', record.Anmerkungen));
  // AUFTRAG "Teil 2g", Punkt 1: geteilte σ-Komponente statt "Achtung:
  // Angaben unsicher..." in Rot/Fett - siehe js/utils/unsicherAbsatz.js.
  const unsicherAbsatz = baueUnsicherheitAbsatz(record, ['Datum_unsicher', 'Beruf_unsicher', 'orte_unsicher']);
  if (unsicherAbsatz) wrapper.appendChild(unsicherAbsatz);
  return wrapper;
}

// Kompakte Bürgerbuch-Liste - dieselben, bereits bestehenden CSS-Klassen wie
// baueUrkundenListeInhalt() (.bestand-sidebar-urkunden-liste/-eintrag/
// -signatur/-regest), inhaltlich aber ID+Datum als "Signatur"-Zeile und
// Beruf als Vorschauzeile (kein Regest-Äquivalent in buergerbuch.csv).
function baueBuergerbuchListeInhalt(records, { onEintragKlick } = {}) {
  const liste = document.createElement('ul');
  liste.className = 'bestand-sidebar-urkunden-liste';

  records.forEach((record) => {
    const item = document.createElement('li');
    item.className = 'bestand-sidebar-urkunden-eintrag';
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `Bürgerbuch-Eintrag ${record.id}, Details anzeigen`);

    const kopfzeile = document.createElement('span');
    kopfzeile.className = 'bestand-sidebar-urkunden-signatur';
    kopfzeile.textContent = `${record.id}${record.Datum ? ` – ${record.Datum}` : ''}`;
    item.appendChild(kopfzeile);

    if (record.Beruf) {
      const vorschau = document.createElement('p');
      vorschau.className = 'bestand-sidebar-urkunden-regest';
      vorschau.textContent = record.Beruf;
      item.appendChild(vorschau);
    }

    const aktivieren = () => onEintragKlick?.(record);
    item.addEventListener('click', aktivieren);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        aktivieren();
      }
    });

    liste.appendChild(item);
  });

  return liste;
}

// AUFTRAG "Teil 2h", Punkt 4b: volle Detailansicht EINES Verlassenschafts-
// inventars, analog zu baueBuergerbuchDetailInhalt() - Feldauswahl wie in
// js/fuehrungen/belegDarstellung.js' baueInventarInhalt() (Jahr, Beruf/
// Funktion/Stand, Vermögensgruppe), hier zusätzlich Ort (dort bislang nicht
// gezeigt, in der Personenliste aber sinnvoll, da personenliste.js sonst
// keine Ortsangabe zu einer Verlassenschafts-Person hat). unsicherheit_
// anmerkung kann seit der Zusammenlegung zweier Zweitinventarisierungs-Fälle
// (siehe PROJEKTLOG) informativ befüllt sein, ohne dass `personen_id_unsicher`
// gesetzt ist - baueUnsicherheitAbsatz() zeigt den Hinweis trotzdem
// (unsicherheit_anmerkung gilt dort unabhängig von einem `_unsicher`-Feld
// immer als Auslöser, siehe dortiger Dateikopf-Kommentar).
function baueInventarDetailInhalt(record) {
  const wrapper = document.createElement('div');
  wrapper.appendChild(baueBuergerbuchSidebarFeld('Jahr', record.Jahr || '(ohne Jahr)'));
  if (record['Beruf/Funktion/Stand']) wrapper.appendChild(baueBuergerbuchSidebarFeld('Beruf/Funktion/Stand', record['Beruf/Funktion/Stand']));
  if (record['Ort (Schaetzung)']) wrapper.appendChild(baueBuergerbuchSidebarFeld('Ort', record['Ort (Schaetzung)']));
  if (record.Vermoegensgruppe) wrapper.appendChild(baueBuergerbuchSidebarFeld('Vermögensgruppe', record.Vermoegensgruppe));
  const unsicherAbsatz = baueUnsicherheitAbsatz(record, []);
  if (unsicherAbsatz) wrapper.appendChild(unsicherAbsatz);
  return wrapper;
}

// Kompakte Inventar-Liste, analog zu baueBuergerbuchListeInhalt() - ID+Jahr
// als Kopfzeile, Beruf/Funktion/Stand als Vorschauzeile.
function baueInventarListeInhalt(records, { onEintragKlick } = {}) {
  const liste = document.createElement('ul');
  liste.className = 'bestand-sidebar-urkunden-liste';

  records.forEach((record) => {
    const item = document.createElement('li');
    item.className = 'bestand-sidebar-urkunden-eintrag';
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `Verlassenschaftsinventar ${record.id}, Details anzeigen`);

    const kopfzeile = document.createElement('span');
    kopfzeile.className = 'bestand-sidebar-urkunden-signatur';
    kopfzeile.textContent = `${record.id}${record.Jahr ? ` – ${record.Jahr}` : ''}`;
    item.appendChild(kopfzeile);

    if (record['Beruf/Funktion/Stand']) {
      const vorschau = document.createElement('p');
      vorschau.className = 'bestand-sidebar-urkunden-regest';
      vorschau.textContent = record['Beruf/Funktion/Stand'];
      item.appendChild(vorschau);
    }

    const aktivieren = () => onEintragKlick?.(record);
    item.addEventListener('click', aktivieren);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        aktivieren();
      }
    });

    liste.appendChild(item);
  });

  return liste;
}

// Volle Detailansicht einer Urkunde - `zeigeZurueck` steuert, ob der
// Zurück-Button sichtbar wird (nur wenn diese Detailansicht tatsächlich aus
// einer Liste heraus erreicht wurde, dieselbe Konvention wie sidebar.js'
// zeigeUrkundenDetail(), hier aber lokal, da unser Zurück-Ziel die
// KOMBINIERTE Liste ist, nicht sidebar.js' eigene `_urkundenListe`).
function zeigeDetailUrkunde(sidebarInstanz, record, zeigeZurueck) {
  const { sidebar, titel, koerper, zurueckBtn } = sidebarInstanz;
  titel.textContent = record.signatur || '(ohne Signatur)';
  koerper.innerHTML = '';
  koerper.appendChild(baueUrkundenDetailInhalt(record));
  zurueckBtn.hidden = !zeigeZurueck;
  sidebar.classList.add('offen');
  sidebar.setAttribute('aria-hidden', 'false');
  titel.focus();
}

// Volle Detailansicht eines Bürgerbuch-Eintrags, analog zu zeigeDetailUrkunde().
function zeigeDetailBuergerbuch(sidebarInstanz, record, zeigeZurueck) {
  const { sidebar, titel, koerper, zurueckBtn } = sidebarInstanz;
  titel.textContent = `${record.Name || record.id}${record.Name ? ` (${record.id})` : ''}`;
  koerper.innerHTML = '';
  koerper.appendChild(baueBuergerbuchDetailInhalt(record));
  zurueckBtn.hidden = !zeigeZurueck;
  sidebar.classList.add('offen');
  sidebar.setAttribute('aria-hidden', 'false');
  titel.focus();
}

// Volle Detailansicht eines Verlassenschaftsinventars, analog zu
// zeigeDetailBuergerbuch() (AUFTRAG "Teil 2h", Punkt 4b).
function zeigeDetailInventar(sidebarInstanz, record, zeigeZurueck) {
  const { sidebar, titel, koerper, zurueckBtn } = sidebarInstanz;
  titel.textContent = `${record.Name || record.id}${record.Name ? ` (${record.id})` : ''}`;
  koerper.innerHTML = '';
  koerper.appendChild(baueInventarDetailInhalt(record));
  zurueckBtn.hidden = !zeigeZurueck;
  sidebar.classList.add('offen');
  sidebar.setAttribute('aria-hidden', 'false');
  titel.focus();
}

// Kombinierte Liste bei mehreren Treffern INSGESAMT - klar getrennt
// beschriftete Abschnitte (Auftrag, wörtlich: "In Urkunden:"/"Im
// Bürgerbuch:"; "In den Verlassenschaftsinventaren:" seit Teil 2h Punkt 4b
// als dritter, analog benannter Abschnitt ergänzt), jeweils nur gezeigt,
// wenn diese Quelle tatsächlich Treffer hat (eine reine Urkunden-Person
// zeigt also nur EINEN Abschnitt, ohne leere weitere Überschriften). Merkt
// sich den eigenen Zustand in `sidebarListenZustand` für die
// Zurück-Navigation.
function zeigeKombinierteListe(sidebarInstanz, personName, urkundenRecords, buergerbuchRecords, inventarRecords) {
  sidebarListenZustand = { personName, urkundenRecords, buergerbuchRecords, inventarRecords };
  const { sidebar, titel, koerper, zurueckBtn } = sidebarInstanz;
  titel.textContent = personName;
  koerper.innerHTML = '';

  const gesamt = urkundenRecords.length + buergerbuchRecords.length + inventarRecords.length;
  const anzahl = document.createElement('p');
  anzahl.className = 'bestand-sidebar-urkunden-anzahl';
  anzahl.textContent = `${gesamt} Eintrag/Einträge`;
  koerper.appendChild(anzahl);

  if (urkundenRecords.length > 0) {
    const ueberschrift = document.createElement('h4');
    ueberschrift.textContent = 'In Urkunden:';
    koerper.appendChild(ueberschrift);
    koerper.appendChild(baueUrkundenListeInhalt(urkundenRecords, {
      onEintragKlick: (record) => zeigeDetailUrkunde(sidebarInstanz, record, true)
    }));
  }
  if (buergerbuchRecords.length > 0) {
    const ueberschrift = document.createElement('h4');
    ueberschrift.textContent = 'Im Bürgerbuch:';
    koerper.appendChild(ueberschrift);
    koerper.appendChild(baueBuergerbuchListeInhalt(buergerbuchRecords, {
      onEintragKlick: (record) => zeigeDetailBuergerbuch(sidebarInstanz, record, true)
    }));
  }
  if (inventarRecords.length > 0) {
    const ueberschrift = document.createElement('h4');
    ueberschrift.textContent = 'In den Verlassenschaftsinventaren:';
    koerper.appendChild(ueberschrift);
    koerper.appendChild(baueInventarListeInhalt(inventarRecords, {
      onEintragKlick: (record) => zeigeDetailInventar(sidebarInstanz, record, true)
    }));
  }

  zurueckBtn.hidden = true; // die kombinierte Liste selbst ist die Wurzel, kein Zurück-Ziel dahinter
  sidebar.classList.add('offen');
  sidebar.setAttribute('aria-hidden', 'false');
  titel.focus();
}

// Vom eigenen, zweiten zurueckBtn-Listener aufgerufen (siehe
// zeichnePersonenliste()) - baut dieselbe kombinierte Liste aus
// `sidebarListenZustand` erneut auf. No-op, falls die Detailansicht ohne
// vorherige Liste erreicht wurde (genau-1-Treffer-Fall) oder die Sidebar
// zwischenzeitlich geschlossen/zurückgesetzt wurde.
function zurueckZurKombiniertenListe(sidebarInstanz) {
  if (!sidebarListenZustand) return;
  const { personName, urkundenRecords, buergerbuchRecords, inventarRecords } = sidebarListenZustand;
  zeigeKombinierteListe(sidebarInstanz, personName, urkundenRecords, buergerbuchRecords, inventarRecords);
}

// Einziger Einstiegspunkt vom Zeilen-Klick (siehe baueZeile()): "genau 1
// Treffer insgesamt -> volle Detailansicht, mehrere -> kompakte Liste"
// (Auftrag, wörtlich) - unabhängig davon, aus welcher der drei Quellen der
// eine Treffer stammt (Verlassenschaftsinventare seit Teil 2h Punkt 4b als
// dritte Quelle ergänzt).
function zeigePersonenNennungen(sidebarInstanz, personName, urkundenRecords, buergerbuchRecords, inventarRecords) {
  sidebarListenZustand = null;
  const gesamt = urkundenRecords.length + buergerbuchRecords.length + inventarRecords.length;
  if (gesamt === 0) return; // keine auflösbare Nennung - nichts zum Anzeigen
  if (gesamt === 1) {
    if (urkundenRecords.length === 1) zeigeDetailUrkunde(sidebarInstanz, urkundenRecords[0], false);
    else if (buergerbuchRecords.length === 1) zeigeDetailBuergerbuch(sidebarInstanz, buergerbuchRecords[0], false);
    else zeigeDetailInventar(sidebarInstanz, inventarRecords[0], false);
    return;
  }
  zeigeKombinierteListe(sidebarInstanz, personName, urkundenRecords, buergerbuchRecords, inventarRecords);
}

// Paginierung (Auftrag "in der Personenliste nur 100 Personen pro Seite
// anzeigen"): dieselbe Konvention wie regestenKachelraster.js'
// SEITENGROESSE/bauePaginierung() - dort 50 Kacheln, hier 100 Tabellenzeilen
// (Auftrag, wörtlich).
const SEITENGROESSE = 100;

// typ steuert die Vergleichsfunktion in sortiereRecords(): 'text' nutzt
// localeCompare('de') (korrekte deutsche Alphabetreihenfolge inkl. Umlaute/ß,
// statt UTF-16-Code-Vergleich per '>'), 'zahl' einen numerischen Vergleich -
// erste_nennung/letzte_nennung sind Jahreszahlen (personenliste.csv kennt
// keine vollen Datumswerte, siehe SCHEMA.md), numerischer Vergleich sortiert
// sie damit zugleich korrekt chronologisch.
// Punkt 2: `sortWertFn` (falls gesetzt) steuert NUR die Sortierung, die
// angezeigte Zelle (`wertFn`) bleibt unverändert der volle Name - die
// Heuristik verändert also nur die Reihenfolge, nicht den sichtbaren Text.
const SPALTEN = [
  {
    schluessel: 'name',
    label: 'Name',
    typ: 'text',
    wertFn: (r) => (Array.isArray(r.schreibweisen) ? r.schreibweisen[0] : r.schreibweisen) || r.personen_id,
    sortWertFn: (r) => ermittleSortierNachname(r.schreibweisen) || r.personen_id
  },
  { schluessel: 'weitereSchreibweisen', label: 'Weitere Schreibweisen', typ: 'text', wertFn: (r) => (Array.isArray(r.schreibweisen) ? r.schreibweisen.slice(1).join(', ') : '') },
  { schluessel: 'quelle', label: 'Quelle', typ: 'text', wertFn: (r) => r.quelle || '' },
  { schluessel: 'anzahl_nennungen', label: 'Nennungen', typ: 'zahl', wertFn: (r) => Number(r.anzahl_nennungen) || 0 },
  { schluessel: 'erste_nennung', label: 'Erste Nennung', typ: 'zahl', wertFn: (r) => Number(r.erste_nennung) || null },
  { schluessel: 'letzte_nennung', label: 'Letzte Nennung', typ: 'zahl', wertFn: (r) => Number(r.letzte_nennung) || null }
];

function fuegeStyleEin(container) {
  const style = document.createElement('style');
  style.textContent = `
    .pl-werkzeugleiste { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
    .pl-suche { padding: 4px; width: 100%; max-width: 320px; box-sizing: border-box; }
    .pl-tabelle { border-collapse: collapse; width: 100%; font-size: 13px; }
    .pl-tabelle th, .pl-tabelle td { border-bottom: 1px solid #ddd; padding: 4px 8px; text-align: left; }
    .pl-tabelle th { cursor: pointer; user-select: none; background: #f4f4f4; position: sticky; top: 0; }
    .pl-sortier-pfeil { margin-left: 4px; font-size: 10px; color: #555; }
    /* AUFTRAG "Teil 2h", Punkt 3: kein roter Rahmen mehr - stattdessen ein
       σ-Symbol in derselben Warnfarbe wie das übrige Interface
       (--fuehrung-unsicher, amber statt Rot - dieselbe Variable wie
       js/utils/unsicherAbsatz.js). */
    .pl-zeile-unsicher-symbol { color: var(--fuehrung-unsicher, #8a6d1f); font-weight: 700; margin-right: 4px; }
    .pl-paginierung { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 13px; }
    .pl-paginierung-oben { margin-bottom: 8px; }
    .pl-paginierung-unten { margin-top: 8px; }
    .pl-paginierung button { min-height: 32px; padding: 4px 10px; cursor: pointer; }
    .pl-paginierung button:disabled { cursor: default; opacity: 0.5; }
    .pl-heuristik-hinweis { margin-left: 3px; color: #a05a00; cursor: help; }
    /* AUFTRAG "Personenliste - Sidebar...": jede Zeile öffnet jetzt die
       Sidebar (siehe baueZeile()) - dieselbe Hover-/Fokus-Konvention wie die
       bereits bestehenden .bestand-sidebar-urkunden-eintrag-Listenpunkte. */
    .pl-zeile-klickbar { cursor: pointer; }
    .pl-zeile-klickbar:hover { background: #f7f7f7; }
    .pl-zeile-klickbar:focus-visible { outline: 3px solid var(--accent); outline-offset: -3px; }
    /* Zwischenüberschriften der kombinierten Liste (siehe
       zeigeKombinierteListe()) - eine Ebene unter dem Sidebar-Titel. */
    .bestand-sidebar h4 { margin: var(--space-3) 0 var(--space-2); font-size: var(--fs-sm); color: var(--text-muted); }
  `;
  container.appendChild(style);
}

function vergleicheWerte(wertA, wertB, typ) {
  if (wertA === wertB) return 0;
  if (wertA === null || wertA === undefined || wertA === '') return 1;
  if (wertB === null || wertB === undefined || wertB === '') return -1;
  if (typ === 'zahl') return wertA - wertB;
  return String(wertA).localeCompare(String(wertB), 'de', { sensitivity: 'base', numeric: true });
}

function sortiereRecords(records, sortierung) {
  const spalte = SPALTEN.find((s) => s.schluessel === sortierung.schluessel);
  const sortFn = spalte.sortWertFn || spalte.wertFn;
  const sortiert = [...records].sort((a, b) => vergleicheWerte(sortFn(a), sortFn(b), spalte.typ));
  return sortierung.richtung === 'auf' ? sortiert : sortiert.reverse();
}

function filtereRecords(records, suchbegriff) {
  if (!suchbegriff) return records;
  const begriff = suchbegriff.toLowerCase();
  return records.filter((r) => {
    const namen = Array.isArray(r.schreibweisen) ? r.schreibweisen : [r.schreibweisen];
    return namen.some((name) => (name || '').toLowerCase().includes(begriff)) || (r.personen_id || '').toLowerCase().includes(begriff);
  });
}

// Die Kopfzeile wird bei jedem Sortierwechsel über zeichneTabelle() komplett
// neu gebaut (siehe dort) - der Pfeil-Indikator kann daher direkt beim Bau
// aus dem aktuellen instanz.sortierung-Zustand gesetzt werden. Kein
// nachträgliches "Indikator aktualisieren" nötig und damit auch keine
// Gefahr des aus kalenderHeatmap.js bekannten Bug-Typs (aktiver Zustand
// zeigt sich erst nach einem Klick) - der Startzustand ist immer korrekt,
// weil die Kopfzeile nie mit veraltetem Zustand stehen bleibt.
function baueKopfzeile(tabelle, sortierung) {
  const kopf = tabelle.createTHead().insertRow();
  SPALTEN.forEach((spalte) => {
    const th = document.createElement('th');
    const aktiv = sortierung.schluessel === spalte.schluessel;
    const richtungsPfeil = sortierung.richtung === 'auf' ? '▲' : '▼';

    const beschriftung = document.createElement('span');
    beschriftung.textContent = spalte.label;
    th.appendChild(beschriftung);

    // Punkt 2/3: kleiner, unaufdringlicher Hinweis direkt an der Spalte,
    // die die Heuristik nutzt - zusätzlich zum (maßgeblichen) Info-Text.
    if (spalte.sortWertFn) {
      const hinweis = document.createElement('span');
      hinweis.className = 'pl-heuristik-hinweis';
      hinweis.textContent = '*';
      hinweis.title = 'Sortierung nach vereinfachter Nachname-Heuristik - siehe Info-Button für Details.';
      th.appendChild(hinweis);
    }

    if (aktiv) {
      const pfeil = document.createElement('span');
      pfeil.className = 'pl-sortier-pfeil';
      pfeil.textContent = richtungsPfeil;
      pfeil.setAttribute('aria-hidden', 'true');
      th.appendChild(pfeil);
      th.setAttribute('aria-sort', sortierung.richtung === 'auf' ? 'ascending' : 'descending');
    } else {
      th.setAttribute('aria-sort', 'none');
    }

    th.setAttribute('tabindex', '0');
    th.setAttribute('role', 'columnheader');
    th.addEventListener('click', () => aendereSortierung(spalte.schluessel));
    th.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        aendereSortierung(spalte.schluessel);
      }
    });
    kopf.appendChild(th);
  });
}

function aendereSortierung(schluessel) {
  const { sortierung } = instanz;
  if (sortierung.schluessel === schluessel) {
    sortierung.richtung = sortierung.richtung === 'auf' ? 'ab' : 'auf';
  } else {
    instanz.sortierung = { schluessel, richtung: 'auf' };
  }
  // Paginierung bezieht sich auf die sortierte Reihenfolge (Auftrag) - ein
  // Sortierwechsel ändert, welche Personen auf Seite 1 stehen, daher zurück
  // auf Seite 1 (dieselbe Konvention wie regestenKachelraster.js bei einem
  // neuen Filter).
  instanz.aktuelleSeite = 1;
  zeichneTabelle();
}

// Punkt 1 (Auftrag "Sortierung nach Nachname & Paginierungs-Button-Layout"):
// zwei Instanzen dieser Leiste (oben mittig, unten mittig, siehe
// zeichneTabelle()) - beide werden aus demselben instanz.aktuelleSeite
// gebaut und lösen bei jedem Klick einen kompletten Neuaufbau über
// zeichneTabelle()/wechsleSeite() aus, sind also IMMER synchron (kein
// separater Abgleichs-Code zwischen zwei DOM-Instanzen nötig - dieselbe
// "eine Quelle der Wahrheit, komplett neu zeichnen" Konvention wie überall
// sonst in diesem Modul). Dieselbe "← Seite X / Y →"-Konvention wie
// regestenKachelraster.js' bauePaginierung() - hier auf die Tabellenzeilen
// statt Kacheln angewendet.
function bauePaginierung(seite, gesamtSeiten, seitenTreffer, gesamtTreffer, position) {
  const leiste = document.createElement('div');
  leiste.className = `pl-paginierung pl-paginierung-${position}`;
  leiste.setAttribute('role', 'navigation');
  leiste.setAttribute('aria-label', `Personenliste-Seiten (${position === 'oben' ? 'oberhalb' : 'unterhalb'} der Tabelle)`);

  const zurueckBtn = document.createElement('button');
  zurueckBtn.type = 'button';
  zurueckBtn.textContent = '← Zurück';
  zurueckBtn.setAttribute('aria-label', 'Vorherige Seite');
  zurueckBtn.disabled = seite <= 1;
  zurueckBtn.addEventListener('click', () => wechsleSeite(seite - 1));

  const status = document.createElement('span');
  status.textContent = `Seite ${seite} / ${gesamtSeiten} (${seitenTreffer} von ${gesamtTreffer} Personen)`;

  const weiterBtn = document.createElement('button');
  weiterBtn.type = 'button';
  weiterBtn.textContent = 'Weiter →';
  weiterBtn.setAttribute('aria-label', 'Nächste Seite');
  weiterBtn.disabled = seite >= gesamtSeiten;
  weiterBtn.addEventListener('click', () => wechsleSeite(seite + 1));

  leiste.append(zurueckBtn, status, weiterBtn);
  return leiste;
}

function wechsleSeite(neueSeite) {
  instanz.aktuelleSeite = neueSeite;
  zeichneTabelle();
}

// AUFTRAG "Personenliste - Sidebar...": jede Zeile ist jetzt klickbar
// (vorher keine Interaktion) - Klick/Enter/Leertaste löst die Nennungen
// dieser Person auf und übergibt sie an zeigePersonenNennungen() (siehe
// oben für die volle "1 -> Detail, mehrere -> Liste"-Fallunterscheidung).
// AUFTRAG "Teil 2h", Punkt 3: die bestehende Unsicherheits-Markierung war
// bisher ein roter Rahmen (`.pl-zeile-unsicher`, PROJEKTLOG Eintrag 40) -
// jetzt stattdessen ein σ-Symbol (amber, dieselbe Warnfarbe wie im übrigen
// Interface) vor dem Namen. Tooltip (Maus/Tastatur, unverändert per
// mouseenter/focus auf der ganzen Zeile) UND das zugängliche `aria-label`
// (jetzt zusätzlich "Angaben unsicher" - "wie bisher" bezog sich auf die
// Symbol-Wahl selbst, die Zeile brauchte vorher aber gar keine textuelle
// Bezeichnung für einen reinen Rahmen, ein σ-Symbol dagegen schon) bleiben
// bzw. werden entsprechend ergänzt.
function baueZeile(record, koerper, container, zeigeUnsicherheit, urkundenNachSignatur, buergerbuchNachId, inventareNachId, sidebarInstanz) {
  const zeile = koerper.insertRow();
  zeile.classList.add('pl-zeile-klickbar');
  zeile.setAttribute('tabindex', '0');
  zeile.setAttribute('role', 'button');
  const anzeigeName = SPALTEN.find((s) => s.schluessel === 'name').wertFn(record);
  const istUnsicher = zeigeUnsicherheit && Boolean(record.unsicherheit_anmerkung);
  zeile.setAttribute('aria-label', istUnsicher
    ? `${anzeigeName}, Angaben unsicher, Quelleneinträge anzeigen`
    : `${anzeigeName}, Quelleneinträge anzeigen`);
  if (istUnsicher) {
    const anmerkung = Array.isArray(record.unsicherheit_anmerkung) ? record.unsicherheit_anmerkung.join(' | ') : record.unsicherheit_anmerkung;
    zeile.addEventListener('mouseenter', () => zeigeTooltip(anmerkung, zeile, container));
    zeile.addEventListener('focus', () => zeigeTooltip(anmerkung, zeile, container));
    zeile.addEventListener('mouseleave', () => versteckeTooltip());
    zeile.addEventListener('blur', () => versteckeTooltip());
  }
  const aktivieren = () => {
    const urkundenRecords = ermittleUrkundenFuerPerson(record, urkundenNachSignatur);
    const buergerbuchRecords = ermittleBuergerbuchFuerPerson(record, buergerbuchNachId);
    const inventarRecords = ermittleInventareFuerPerson(record, inventareNachId);
    zeigePersonenNennungen(sidebarInstanz, anzeigeName, urkundenRecords, buergerbuchRecords, inventarRecords);
  };
  zeile.addEventListener('click', aktivieren);
  zeile.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      aktivieren();
    }
  });
  SPALTEN.forEach((spalte) => {
    const zelle = zeile.insertCell();
    const wert = spalte.wertFn(record);
    // AUFTRAG "Teil 2h", Punkt 3: σ-Symbol vor dem Namen - aria-hidden, die
    // zugängliche Bezeichnung liefert bereits `aria-label` der ganzen Zeile
    // (s. o.), dieselbe Konvention wie die übrigen σ-Icon-Marker im Projekt.
    if (istUnsicher && spalte.schluessel === 'name') {
      const symbol = document.createElement('span');
      symbol.className = 'pl-zeile-unsicher-symbol';
      symbol.setAttribute('aria-hidden', 'true');
      symbol.textContent = UNSICHERHEIT_SYMBOL;
      zelle.appendChild(symbol);
    }
    zelle.appendChild(document.createTextNode(wert === null || wert === undefined || wert === '' ? '–' : wert));
  });
}

function zeichneTabelle() {
  const { container, records, sortierung, suchbegriff, options, urkundenNachSignatur, buergerbuchNachId, inventareNachId, sidebar } = instanz;
  const zeigeUnsicherheit = options.showUncertainty;
  const bestehendeTabelle = container.querySelector('table.pl-tabelle');
  if (bestehendeTabelle) bestehendeTabelle.remove();
  container.querySelectorAll('.pl-paginierung').forEach((el) => el.remove());

  // AUFTRAG "Fuehrungen, Teil 2b", Rueckfrage: instanz.exaktId (nur von
  // oeffneDatensatz() unten gesetzt) filtert auf EXAKTE personen_id statt
  // der normalen Teilstring-Suche - sonst zeigte z.B. "adam" auch
  // "adam_eissler" mit an. filtereRecords() selbst bleibt fuer die normale,
  // getippte Suche unveraendert; das Sucheingabefeld setzt exaktId beim
  // naechsten Tippen selbst wieder zurueck (siehe zeichnePersonenliste()).
  const gefiltert = instanz.exaktId
    ? records.filter((r) => r.personen_id === instanz.exaktId)
    : filtereRecords(records, suchbegriff);
  const sortiert = sortiereRecords(gefiltert, sortierung);

  const gesamtSeiten = Math.max(1, Math.ceil(sortiert.length / SEITENGROESSE));
  // Klemmt eine ungültig gewordene Seitenzahl ab (z.B. Suche geändert,
  // vorherige Seite existiert in der neuen Trefferzahl nicht mehr) -
  // dieselbe Absicherung wie regestenKachelraster.js.
  instanz.aktuelleSeite = Math.min(Math.max(1, instanz.aktuelleSeite), gesamtSeiten);
  const start = (instanz.aktuelleSeite - 1) * SEITENGROESSE;
  const seitenRecords = sortiert.slice(start, start + SEITENGROESSE);

  container.appendChild(bauePaginierung(instanz.aktuelleSeite, gesamtSeiten, seitenRecords.length, sortiert.length, 'oben'));

  const tabelle = document.createElement('table');
  tabelle.className = 'pl-tabelle';
  baueKopfzeile(tabelle, sortierung);
  const koerper = tabelle.createTBody();
  seitenRecords.forEach((record) => baueZeile(record, koerper, container, zeigeUnsicherheit, urkundenNachSignatur, buergerbuchNachId, inventareNachId, sidebar));
  container.appendChild(tabelle);
  container.appendChild(bauePaginierung(instanz.aktuelleSeite, gesamtSeiten, seitenRecords.length, sortiert.length, 'unten'));

  const hinweis = instanz.hinweisElement;
  hinweis.textContent = `${sortiert.length} von ${records.length} Personen angezeigt.`;
}

function zeichnePersonenliste() {
  const { container } = instanz;
  container.innerHTML = '';
  fuegeStyleEin(container);
  fuegeSidebarStyleEin(container);

  const werkzeugleiste = document.createElement('div');
  werkzeugleiste.className = 'pl-werkzeugleiste';

  const sucheInput = document.createElement('input');
  sucheInput.type = 'search';
  sucheInput.className = 'pl-suche';
  sucheInput.placeholder = 'Nach Name suchen…';
  sucheInput.setAttribute('aria-label', 'Personenliste durchsuchen');
  sucheInput.addEventListener('input', (event) => {
    instanz.suchbegriff = event.target.value;
    instanz.exaktId = null; // normales Tippen beendet einen exakten Datensatzaufruf wieder
    instanz.aktuelleSeite = 1; // neue Trefferzahl, alte Seitenzahl kann ungültig geworden sein
    zeichneTabelle();
  });
  werkzeugleiste.appendChild(sucheInput);
  instanz.infoButton = erzeugeInfoButton(werkzeugleiste, { text: PERSONENLISTE_INFO_TEXT, ariaLabel: 'Erklärung zur Personenliste' });
  container.appendChild(werkzeugleiste);

  const hinweis = document.createElement('p');
  hinweis.style.fontSize = '12px';
  container.appendChild(hinweis);
  instanz.hinweisElement = hinweis;

  // AUFTRAG "Personenliste - Sidebar...": einmalig aufgebaut (nicht bei
  // jedem zeichneTabelle()-Aufruf neu), dieselbe Konvention wie
  // verbindungskarte.js/bipartiteFlowMap.js' Sidebar-Aufbau. Der eigene,
  // ZUSÄTZLICHE zurueckBtn-Listener (siehe Dateikopf-Kommentar) ergänzt
  // sidebar.js' bereits eingebauten Listener, statt ihn zu ersetzen.
  instanz.sidebar = baueSidebarGeruest(container);
  instanz.sidebar.schliessenBtn.addEventListener('click', () => schliesseSidebar(instanz.sidebar, container));
  instanz.sidebar.zurueckBtn.addEventListener('click', () => zurueckZurKombiniertenListe(instanz.sidebar));

  zeichneTabelle();
}

export function render(container, data, options = {}) {
  if (instanz) {
    destroy();
  }
  // AUFTRAG "Personenliste - Sidebar...": `data` ist jetzt das kombinierte
  // `{familien, personenliste, urkunden, buergerbuch, verlassenschaften}`-
  // Objekt (siehe Dateikopf-Kommentar) - `data.personenliste` bleibt das
  // flache, von dieser Tabelle angezeigte Array, `urkunden`/`buergerbuch`/
  // `verlassenschaften` (Teil 2h, Punkt 4b) werden hier EINMALIG zu
  // Nachschlage-Maps (Signatur/ID -> Record) aufbereitet statt bei jedem
  // Zeilen-Klick erneut linear durchsucht zu werden.
  const urkundenRecords = data.urkunden || [];
  const buergerbuchRecords = data.buergerbuch || [];
  const inventarRecords = data.verlassenschaften || [];
  instanz = {
    container,
    records: data.personenliste || [],
    urkundenNachSignatur: new Map(urkundenRecords.map((r) => [r.signatur, r])),
    buergerbuchNachId: new Map(buergerbuchRecords.map((r) => [r.id, r])),
    inventareNachId: new Map(inventarRecords.map((r) => [r.id, r])),
    options: { showUncertainty: true, width: null, height: null, ...options },
    sortierung: { schluessel: 'anzahl_nennungen', richtung: 'ab' },
    suchbegriff: '',
    exaktId: null,
    aktuelleSeite: 1,
    infoButton: null,
    sidebar: null
  };
  zeichnePersonenliste();
}

// AUFTRAG "Teil 2h", Punkt 3: LIVE GEFUNDENER BUG (Selbstauskunft) - resize()
// war bisher ein reines No-Op ("reflowt selbstständig bei veränderter
// Containerbreite, wie bei regestenKachelraster.js"), das stimmt fuer eine
// reine Breitenaenderung tatsaechlich (HTML-Tabellen reflowen von selbst).
// ABER: js/core/app.js nutzt DIESELBE resize()-Funktion generisch auch fuer
// den Unsicherheiten-Umschalter (`onToggle: (aktiv) => ...resize({
// showUncertainty: aktiv })`, s. app.js) - das No-Op ignorierte diesen Aufruf
// bisher komplett, `instanz.options.showUncertainty` aktualisierte sich nie.
// Die σ-Kennzeichnung (wie zuvor der rote Rahmen, PROJEKTLOG Eintrag 40)
// war dadurch praktisch nie sichtbar, unabhaengig vom Knopf-Zustand - ein
// bereits VOR diesem Auftrag bestehender Fehler, hier live beim Testen von
// Punkt 3 gefunden und behoben (sonst waere Punkt 3 nicht demonstrierbar).
export function resize(neueOptionen = {}) {
  if (!instanz) return;
  instanz.options = { ...instanz.options, ...neueOptionen };
  zeichneTabelle();
}

export function destroy() {
  if (!instanz) return;
  if (instanz.infoButton) instanz.infoButton.destroy();
  instanz.container.innerHTML = '';
  instanz = null;
  sidebarListenZustand = null;
}

// AUFTRAG "Fuehrungen, Teil 2b", Punkt 4: schmale, von js/utils/
// datensatzAufruf.js aufgerufene Oeffnen-Funktion - setzt exaktId (siehe
// zeichneTabelle() oben) statt sich auf die normale Teilstring-Suche zu
// verlassen, damit z.B. "adam" nicht auch "adam_eissler" mit anzeigt -
// dieselbe personen_id kann sonst Praefix einer anderen sein (live
// gefunden, siehe Selbstauskunft/PROJEKTLOG). Ruft danach dieselben
// Funktionen wie der bestehende Zeilen-Klick-Handler (Zeile 639-643) auf -
// keine eigene Sidebar-Logik hier. Auch der Aufruf fuer buergerbuch-Belege
// (typ:'person', siehe belegDarstellung.js) laeuft hierueber.
export function oeffneDatensatz(personenId) {
  if (!instanz) return false;
  const record = instanz.records.find((r) => r.personen_id === personenId);
  if (!record) return false;
  instanz.suchbegriff = personenId;
  instanz.exaktId = personenId;
  instanz.aktuelleSeite = 1;
  const sucheInput = instanz.container.querySelector('.pl-suche');
  if (sucheInput) sucheInput.value = personenId;
  zeichneTabelle();
  const anzeigeName = SPALTEN.find((s) => s.schluessel === 'name').wertFn(record);
  const urkundenRecords = ermittleUrkundenFuerPerson(record, instanz.urkundenNachSignatur);
  const buergerbuchRecords = ermittleBuergerbuchFuerPerson(record, instanz.buergerbuchNachId);
  const inventarRecords = ermittleInventareFuerPerson(record, instanz.inventareNachId);
  zeigePersonenNennungen(instanz.sidebar, anzeigeName, urkundenRecords, buergerbuchRecords, inventarRecords);
  return true;
}
