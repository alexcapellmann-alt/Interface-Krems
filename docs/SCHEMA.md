# SCHEMA.md – Datentabellen Interface Krems

**Wichtigster Hinweis zuerst – CSV-Export aus Excel:** beim Speichern einer
CSV-Datei in Excel unbedingt **„CSV UTF-8 (durch Trennzeichen getrennt)"**
wählen, **nicht** „CSV (Trennzeichen-getrennt)". Der Unterschied ist beim
Speichern nicht offensichtlich, verursacht aber stille Datenschäden: bei
„CSV (Trennzeichen-getrennt)" bleiben Umlaute (ä/ö/ü/ß) zwar erhalten, aber
alle anderen Sonderzeichen außerhalb der Windows-„ANSI"-Kodierung – etwa
`ř`, `č`, `ů` in Ortsnamen wie „Jindřichův Hradec" oder übergeschriebene
Buchstaben in Transkriptionen (`v[er]retnu[ß]` u. ä.) – werden lautlos
durch `?` ersetzt. So geschehen am 2026-09-30 in `data/urkunden.csv`: 106
verlorene Zeichen in 38 Zellen (siehe `docs/PROJEKTLOG.md`, Abschnitt
„Datenkorrekturen"). Der Fehler fällt beim Öffnen der Datei nicht auf, da
`?` wie ein normales Zeichen aussieht – deshalb vor jedem Export die
Dialogauswahl bewusst prüfen.

Zusätzlich: eine in Excel **geöffnete** CSV-Datei ist für andere Programme
gesperrt (auch für automatisiertes Bearbeiten) - Excel vor dem Export/vor
Änderungen durch andere Werkzeuge schließen.

---

Dieses Dokument beschreibt die konkreten Spaltenstrukturen aller Datentabellen des Projekts. Es ergänzt den Masterprompt (allgemeine, archivübergreifende Regeln) um die Krems-spezifischen Details und wächst mit dem Projekt mit. Pflegeregel: neue Spalten dürfen ergänzt werden, bestehende, bereits dokumentierte Spalten nicht ohne Rückfrage geändert werden (siehe Masterprompt Abschnitt 12).

**Allgemeine Konventionen** (siehe Masterprompt Abschnitt 12 für Details): CSV, UTF-8, Semikolon als Spaltentrenner, Pipe `|` für Mehrfachwerte innerhalb einer Zelle, `kleinschreibung_mit_unterstrich`, Unsicherheit pro Feld über `<feldname>_unsicher` (`ja`/`nein`), `unsicherheit_anmerkung` für die Hover-Tooltip-Erklärung, Datumsfelder als Freitext mit automatischer Präzisionserkennung, DataLoader entfernt UTF-8-BOM automatisch. `erschliessungsstatus` ist seit v3.8 optional (siehe Masterprompt Abschnitt 12).

**Das Zeichen `|` ist reserviert – in allen Spalten.** Der senkrechte Strich `|` trennt mehrere Werte in einer Zelle. Das gilt für jede Spalte jeder Tabelle, nicht nur für die als „Liste“ beschriebenen. Beispiele aus `urkunden.csv`: In der Spalte `kategorien` steht bei `StaAKr-0001` `Religion|Vermögen und Finanzen` – das sind zwei Kategorien. In der Spalte `personen` steht bei `StaAKr-0001a` `Manegold von Passau|Konrad von Krems` – das sind zwei Personen. Darum darf `|` in Freitext (z. B. `regest`, `name`, `titel`, `kurzbeschreibung`) nicht vorkommen. Steht es trotzdem in einem Freitext, liest das Interface den Text als Liste von mehreren Teilen. Die Anzeige zeigt dann die Teile mit ` | ` dazwischen an. Für Trennungen innerhalb eines Freitexts stattdessen Komma oder Gedankenstrich verwenden.

### Mindestspalten und was bei Problemen passiert

*Stand: Auftrag B2, 2026-10-03.* Die Angaben in der Spalte „Pflicht“ der Tabellen unten sind **gemessen**: Jede Spalte wurde einzeln aus ihrer Datei entfernt, dann wurde geprüft, welche Ansicht danach nichts mehr zeigt. Die Begriffe bedeuten:

- **Pflicht (Ansicht):** Ohne diese Spalte kann die genannte Ansicht nichts zeigen. Fehlt sie, erscheint dort ein Hinweisbalken, z. B. „In urkunden.csv fehlt die Spalte 'jahr'. Diese Ansicht kann nicht angezeigt werden.“ Alle anderen Ansichten laufen weiter.
- **Schlüssel:** Die Spalte verbindet Zeilen untereinander oder mit anderen Dateien, z. B. `id` oder `block_id`. Ohne sie bleibt keine Ansicht leer; Verweise und Sortierung können aber fehlen. Sollte geliefert werden.
- **empfohlen:** Ohne die Spalte bleibt keine Ansicht leer, sie zeigt aber weniger an.
- **nein / –:** Die Spalte ist freiwillig.

**Mindestspalten je Datei (so wenig muss ein Archiv mindestens liefern):**

| Datei | Pflichtspalten | Ansicht |
|---|---|---|
| `archiv.csv` (Kerndatei) | `schluessel`, `wert` | Startseite, Über |
| `startseite.csv` (Kerndatei) | `typ`, `sichtbar` | Startseite |
| `ueber.csv` | `text`, `sichtbar` | Über |
| `urkunden.csv` | `jahr` | Zeitachse, Kalender-Heatmap, Dot Plot, Swimlanes, Ridgeline, Horizon Chart |
| | `kategorien` | Horizon Chart, Sankey |
| | `orte` | Karte, Verbindungskarte, Sankey |
| | `personen` | Adjazenzmatrix, Arc-Diagramm |
| | `regest` | Wortwolke |
| `orte.csv` | `orte`, `lat`, `lon` | Karte, Verbindungskarte, Bipartite Flow Map |
| `bestandsverzeichnis.csv` | `zeitraum_von`, `zeitraum_bis` | Gantt-Diagramm |
| `buergerbuch.csv` | `Datum` | Trellis, Bump Chart |
| | `Wirtschaftssektor` | Trellis |
| | `Name`, `buergen_id` | Personennetzwerk |
| `verlassenschaftsinventare.csv` | `Realvermoegen_fl`, `Gesamtvermoegen_fl`, `Anteil Grundstuecke am RV (%)`, `Anteil Bargeld am RV (%)`, `Anteil Wertgegenstaende am RV (%)`, `Anteil Sonderbestand am RV (%)` | Parallelkoordinaten |
| | `Anteil SchzG an Aktiva (%)`, `Anteil SchvG an Aktiva (%)` – *aus dem Code abgeleitet, nicht gemessen* | Parallelkoordinaten, nur Darstellung „Forderungs-/Schuldenprofil“ (fehlt eine, erscheint ein Hinweis; die übrige Ansicht bleibt nutzbar) |
| | `Jahrzehnt` | Vermögensschichtung |
| `familien.csv` | `familie`, `id` | Habsburg-Zeitleistenbaum |
| `fuehrungen.csv` | `fuehrung_id` | Führungen: Übersicht, Station, Ende |
| | `station_nr`, `text` | Führungsstation |
| `literatur.csv` | `zitation` | Literatur |

`personenliste.csv`, `recherche_links.csv` und `infotexte.csv` haben keine Pflichtspalte. `ratsprotokolle.csv` wird derzeit von keiner Ansicht gelesen; die Datei erzeugt keinen Tab und keinen Hinweis.

**Was passiert, wenn …**

- **… eine Pflichtspalte fehlt:** Die betroffene Ansicht zeigt einen Hinweisbalken mit Dateiname und Spaltenname, statt leer zu bleiben oder abzustürzen. Andere Ansichten laufen weiter.
- **… die Spalten nicht erkannt werden:** Das ist meist ein falsches Trennzeichen, etwa Komma statt Semikolon beim Speichern. Jede Ansicht, die die Datei nutzt, zeigt dann: „In … wurden keine bekannten Spalten erkannt. Vermutlich wurde die Datei mit einem falschen Trennzeichen gespeichert.“ Abhilfe: in Excel als „CSV UTF-8 (durch Trennzeichen getrennt)“ speichern, siehe ganz oben.
- **… eine Datei fehlt, leer ist oder nur aus der Kopfzeile besteht:** Die Datei gilt als „nicht vorhanden“.
  - **Ansichten, die nur diese Datei nutzen, werden ausgeblendet**, ebenso Navigationspunkte, Bereiche und Galerie-Kacheln, die dadurch leer würden. Ein Beispiel: Ist `buergerbuch.csv` leer, verschwindet der Bereich „Bürgerbuch“; ist `fuehrungen.csv` leer, verschwindet „Führungen“.
  - Wer eine solche Ansicht über einen gespeicherten Link öffnet, sieht einen Balken: „Für diese Ansicht liegen keine Daten vor: … enthält keine Datensätze.“
  - **Ansichten, die mehrere Dateien nutzen,** bleiben sichtbar und zeigen einen Balken. Ein Beispiel: Die Personenliste meldet „buergerbuch.csv enthält keine Datensätze. Diese Ansicht ist deshalb unvollständig.“ Die Karten werden bei leerer `orte.csv` gar nicht gezeichnet.
  - Die Personenliste wird bei leerer `personenliste.csv` ausgeblendet, obwohl sie mehrere Dateien nutzt (Entscheidung des Autors).
- **… eine Kerndatei fehlt oder leer ist:**
  - `startseite.csv`: Statt der Startseite erscheint ein Balken mit dem Dateinamen.
  - `archiv.csv`: Startseite und Über-Seite zeigen einen Balken; Name, Logo und Kontaktangaben fehlen dann.
- **Ohne Hinweis entfallen** nur die Recherche-Links (`recherche_links.csv`) und die „?“-Info-Texte (`infotexte.csv`), wie bisher (siehe Abschnitte 9.1 und 13.4).
- **Bekannte Grenzen:**
  - Steht in einem Datumsfeld nur ein unlesbarer Wert (z. B. bei falschem Datenformat statt fehlender Spalte), landen die Urkunden weiterhin ohne Hinweis unter „undatiert“.
  - Zählwerte wie `{n_urkunden}` zeigen bei leerer Datei „0“.

**Technischer Hinweis (Abweichung vom Lazy Loading):** Damit leere Bereiche gar nicht erst in der Navigation erscheinen, lädt das Interface nach dem ersten Bildaufbau im Hintergrund die Dateien, die über das Ausblenden entscheiden. Das betrifft `bestandsverzeichnis`, `urkunden`, `buergerbuch`, `verlassenschaftsinventare`, `personenliste`, `familien`, `fuehrungen`, `literatur` und `ueber`. Jede Datei wird dabei höchstens einmal angefragt. Die Ansichten selbst (Code und Darstellung) laden weiterhin erst beim Öffnen. Die Liste der Pflicht- und Schlüsselspalten steht technisch in `js/config/datenAnforderungen.js`.

**Präzisierung zu `unsicherheit_anmerkung` (nach Etappe-1-Praxisfund):** Ist bei einer Zeile nur ein Feld unsicher, steht dort einfacher Freitext. Sind mehrere Felder derselben Zeile unsicher, werden die einzelnen, feldspezifisch benannten Erklärungen mit Pipe `|` getrennt (z. B. `Datum: keine Jahresangabe erkennbar|Orte: Namensform mehrdeutig`) – der DataLoader zerlegt das dann, der allgemeinen Pipe-Konvention folgend, automatisch in eine Liste einzelner Erklärungen. Das ist beabsichtigtes Verhalten, keine Ausnahme und kein Sonderfall im Code nötig.

**Wichtiger Hinweis zum Dateiformat:** Die Quelldateien werden als Excel (.xlsx) gepflegt (Arbeits-/Erfassungsformat). Vor dem Einsatz im Interface werden sie als CSV (UTF-8, Semikolon-getrennt) exportiert und in `data/` abgelegt – der `dataLoader.js` liest ausschließlich CSV. Pipe-Zeichen innerhalb von Zellen sind beim Export unproblematisch, da sie sich vom Spalten-Trennzeichen (Semikolon) unterscheiden; Zellen mit zufälligen Semikolons im Freitext werden von Excel automatisch in Anführungszeichen gesetzt und von `d3.csvParse()` korrekt gelesen.

---

## 1. urkunden.csv (aus urkunden.xlsx, Sheet "urkunden")

Bereits ausgereifte, produktiv genutzte Tabelle. 26 bestehende Visualisierungen bauen darauf auf.

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `signatur` | Text | empfohlen (Schlüssel) | aktuelle/neue Signatur, eindeutig |
| `datum` | Text (Freitext) | nein | Datierung wie überliefert, Präzisionsstufe automatisch abgeleitet |
| `datum_normiert` | Text/Datum | nein | normierte Form (Herkunft/Zweck weiterhin nicht abschließend geklärt) |
| `datum_unsicher` | ja/nein | – | neu ergänzt |
| `jahr` | Zahl | **Pflicht** (Zeitachse, Kalender-Heatmap, Dot Plot, Swimlanes, Ridgeline, Horizon Chart) | |
| `orte` | Liste (Pipe-getrennt) | **Pflicht** (Karte, Verbindungskarte, Sankey) | |
| `orte_unsicher` | ja/nein | – | |
| `regest` | Volltext | **Pflicht** (Wortwolke) | |
| `personen` | Liste (Pipe-getrennt) | **Pflicht** (Adjazenzmatrix, Arc-Diagramm) | |
| `personen_id` | Text/Liste | nein | Verweis auf `personenliste.csv` (siehe Tabelle 8) |
| `personen_unsicher` | ja/nein | – | |
| `kategorien` | Liste (Pipe-getrennt) | **Pflicht** (Horizon Chart, Sankey) | |
| `foto_ordner` | Text | nein | tatsächlicher Ordnername unter `fotos/thumbs/` – **vollständig befüllt** (1068/1068 automatisch zugeordnet über `id`/`signatur`-Abgleich, entspricht 1:1 der `signatur`-Spalte) |
| `unsicherheit_anmerkung` | Text | nein | für Hover-Tooltip |
| `bilder` | Liste (Pipe-getrennt) | nein | **neu (Auftrag "Urkundenfotos über die Spalte `bilder`", 2026-09-30):** die tatsächlichen Dateinamen der Fotos zu dieser Urkunde, ohne Pfad - der vollständige Bildpfad ergibt sich aus `fotos/thumbs/<foto_ordner>/<Dateiname>`. Letzte Spalte der Tabelle, direkt nach `foto_ordner` eingefügt. Löst das bisherige, separat per Kommandozeilenskript erzeugte JSON-Manifest ab (siehe PROJEKTLOG) - Foto-Zuordnung ist damit ohne Programmierkenntnisse direkt in der Tabelle pflegbar. |

**Hinweis:** enthält zusätzliches Tabellenblatt "Änderungsprotokoll" – internes Arbeitsdokument, nicht Teil der Interface-Daten, wird nicht mit exportiert.

**Hinweise für Archivar:innen zu `bilder` (kein Programmierwissen nötig):**
- Dateinamen exakt wie im Ordner eintragen, **einschließlich Groß-/Kleinschreibung** - der Server, der das Interface ausliefert, unterscheidet Groß-/Kleinschreibung bei Dateinamen, Windows auf dem eigenen Rechner normalerweise nicht. Ein Dateiname, der auf dem eigenen PC klaglos funktioniert (`stak_0001_r.jpg` statt `StAK_0001_r.jpg`), kann online als "Bild nicht gefunden" erscheinen.
- Mehrere Fotos durch `|` trennen. Die Reihenfolge in der Zelle bestimmt die Anzeigereihenfolge.
- Neues Foto: Datei in den passenden Ordner unter `fotos/thumbs/<foto_ordner>/` legen UND den Dateinamen zusätzlich in die `bilder`-Zelle der betreffenden Zeile eintragen (beides nötig, nicht nur eines von beidem).
- Beim Neuerzeugen/Neuimportieren dieser Tabelle (z. B. bei der Einarbeitung weiterer Regestfassungen) **muss die Spalte `bilder` erhalten bleiben** - sie steht nirgendwo sonst.
- Beim Bearbeiten in Excel: als „CSV UTF-8 (durch Trennzeichen getrennt)“ speichern (dieselbe Konvention wie bei allen übrigen Tabellen dieses Interfaces).

---

## 2. ratsprotokolle.csv (geplant, weiterhin keine Dateninhalte)

Unverändert gegenüber letzter Prüfung.

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `id` | Text | Schlüssel (Datei wird derzeit nicht gelesen) | |
| `signatur` | Text | Schlüssel (Datei wird derzeit nicht gelesen) | |
| `datum` | Text (Freitext) | nein | |
| `datum_unsicher` | ja/nein | – | |
| `orte` | Liste (Pipe-getrennt) | nein | |
| `orte_unsicher` | ja/nein | – | |
| `regest` | Volltext | nein | |
| `personen` | Liste (Pipe-getrennt) | nein | |
| `personen_unsicher` | ja/nein | – | |
| `kategorien` | Liste (Pipe-getrennt) | nein | |
| `sitzungsort` | Text | nein | |
| `sitzungsnummer` | Text/Zahl | nein | |
| `top_nummer` | Text/Zahl | nein | |
| `quelltyp` | Text | nein | |
| `personen_rollen` | Liste (Pipe-getrennt, Person:Rolle) | nein | |
| `unsicherheit_anmerkung` | Text | nein | |

**Weiterhin offen:** `kategorien_unsicher` fehlt, Entscheidung noch offen.

**Korrektur (Auftrag "Führungen, Teil 1", Punkt 1, 2026-09-23):** die Datei trug eine fälschliche Platzhalter-Kopfzeile (`Column1;Column2;…`) VOR der echten Kopfzeile (derselbe Fund/dieselbe Ursache wie zuvor bei `buergerbuch.csv`, siehe CHANGELOG Eintrag 77) - entfernt, die echte Kopfzeile steht jetzt in Zeile 1. Es gab dafür keinen Umgehungs-Code (`js/core/dataLoader.js` liest immer Zeile 1 als Header), betraf aber bislang nichts Sichtbares: die Datei ist in `js/config/archivalienRegistry.js` nicht registriert und enthält weiterhin keine Datenzeilen.

---

## 3. bestandsverzeichnis.csv (aus bestandsverzeichnis.xlsx, Sheet LookupListe_Becker15)

329 Bestandsdatensätze (verifiziert in Etappe 2 durch den tatsächlichen D3-Parser; frühere Angabe "330" war eine grobe Schätzung). **Hierarchie (korrigiert):** Gesamtbestand → `bkk_kategorie` → `bkk_unterkategorie` → einzelner Bestand (Zeile) – vier Ebenen, nicht drei wie zuvor dokumentiert. Frühere Fassung hatte die Unterkategorie-Ebene fälschlich mit der Bestands-Ebene gleichgesetzt. `kuerzel` bleibt Sortierschlüssel innerhalb der untersten Ebene, keine eigene Hierarchietiefe.

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `name` | Text | empfohlen | |
| `kuerzel` | Text | Schlüssel | Sortierschlüssel |
| `zitierweise` | Text | nein | für Sidebar |
| `umfang` | Text (Rohangabe) | nein | |
| `umfang_lfm` | Zahl | empfohlen (Kachelgröße) | |
| `zeitraum_von` / `zeitraum_bis` | Zahl (Jahr) | **Pflicht** (Gantt-Diagramm) | |
| `zeitraum_text` | Text | nein | |
| `bkk_kategorie` | Text | empfohlen | Oberkategorie nach Becker |
| `bkk_unterkategorie` | Text | nein | |
| `daten_unsicher` | ja/nein | – | ersetzt die frühere, verworfene Buchstaben-Codierung (A/B1/B2/D/F/G) |
| `unsicherheit_anmerkung` | Text | nein | erklärt die Art der Unsicherheit, für Hover-Tooltip |
| `kurzbeschreibung` | Text | für Sidebar | |
| `form_inhalt` | Text | für Sidebar | |
| `bestandsgeschichte` | Text | für Sidebar | |
| `abgebende_stelle` | Text | für Sidebar | |
| `provenienz` | Text | für Sidebar | |
| `biografische_angaben` | Text | für Sidebar | |
| `benutzungsmodalitaeten` | Text | intern | |
| `reproduktionsbestimmungen` | Text | intern | |
| `vorgaenger` / `nachfolger` | Text/Verweis | für Sidebar | |
| `verwandte_verzeichnungseinheiten` | Text | für Sidebar | |
| `erschließungszustand_umfang` | Text | intern | |
| `verzeichnungsformular` | Text | intern | |
| `materialart` | Text | für Sidebar | |
| `sprache_schrift` | Text | für Sidebar | |
| `literaturhinweis` | Text | für Sidebar | |
| `veroeffentlichungen` | Text | für Sidebar | |

**Änderung gegenüber vorheriger Version:** `sort_nr` und das allgemeine `anmerkungen`-Feld sind nicht mehr vorhanden (bewusst entfernt oder beim Bearbeiten weggefallen – bitte bei Gelegenheit bestätigen, ob `sort_nr` absichtlich draußen ist).

---

## 4. buergerbuch.csv (aus buergerbuch.xlsx, Sheet Personenliste)

2791 Einträge. Neubürgerverzeichnis, kein Herkunfts-Ortsfeld (strukturell folgerichtig).

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `id` | Text | Schlüssel | neu ergänzt |
| `Datum` | Text (Freitext) | **Pflicht** (Trellis, Bump Chart) | |
| `Datum_unsicher` | ja/leer | – | reines Flag, sauber (33 von 2791 = ja) |
| `Name` | Text | **Pflicht** (Personennetzwerk) | |
| `personen_id` | Text | nein | neu, Verweis auf `personenliste.csv` |
| `Beruf` | Text | nein | |
| `Beruf_unsicher` | ja/leer | – | |
| `Wirtschaftssektor` | Text | **Pflicht** (Trellis) | |
| `Buergen` | Text/Liste | nein | |
| `buergen_id` | Text/Liste | **Pflicht** (Personennetzwerk) | neu, vermutlich Verweis auf `personenliste.csv` (zu bestätigen) |
| `Buergen_Berufe` | Text/Liste | nein | |
| `Anmerkungen` | Text | – | allgemein, NICHT für Unsicherheits-Tooltip |
| `Ort` | Text | nein | Zielort, nicht Herkunft |
| `orte_unsicher` | ja/nein | – | |
| `Datum_Anmerkung` | Text | – | alternative Datums-Lesart |
| `zuordnung_sicher` | ja/nein | – | |
| `unsicherheit_anmerkung` | Text | nein | für Hover-Tooltip |

**Hinweis:** Großschreibungs-Konvention weicht weiterhin von den übrigen Tabellen ab (noch nicht vereinheitlicht). Enthält zusätzliches Tabellenblatt "Änderungsprotokoll" – internes Arbeitsdokument, nicht Teil der Interface-Daten.

---

## 5. verlassenschaftsinventare.csv (aus verlassenschaftsinventare.xlsx, Sheet Personen_Gesamt)

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `id` | Text | Schlüssel | neu ergänzt |
| `Jahrzehnt` | Text | **Pflicht** (Vermögensschichtung) | |
| `Jahr` | Zahl | empfohlen | |
| `Name` | Text | empfohlen | |
| `Beruf/Funktion/Stand` | Text | nein | Originaltext |
| `Beruf` | Text | nein | bereinigt |
| `Ort (Schaetzung)` | Text | nein | |
| `Geschlecht (Schaetzung)` | Text | nein | |
| `Vermoegensgruppe` | Text (A–E, S) | nein | |
| `Realvermoegen_fl` | Zahl | **Pflicht** (Parallelkoordinaten) | |
| `Gesamtvermoegen_fl` | Zahl | **Pflicht** (Parallelkoordinaten) | |
| `Anteil SchzG an Aktiva (%)` | Zahl | **Pflicht** (Parallelkoordinaten, Darstellung „Forderungs-/Schuldenprofil“) – aus dem Code abgeleitet, nicht gemessen | Forderungen |
| `Anteil SchvG an Aktiva (%)` | Zahl | **Pflicht** (Parallelkoordinaten, Darstellung „Forderungs-/Schuldenprofil“) – aus dem Code abgeleitet, nicht gemessen | eigene Schulden |
| `Anteil Grundstuecke am RV (%)` | Zahl | **Pflicht** (Parallelkoordinaten) | |
| `Anteil Bargeld am RV (%)` | Zahl | **Pflicht** (Parallelkoordinaten) | |
| `Anteil Wertgegenstaende am RV (%)` | Zahl | **Pflicht** (Parallelkoordinaten) | |
| `Beruflicher Sonderbestand` | Text | nein | |
| `Anteil Sonderbestand am RV (%)` | Zahl | **Pflicht** (Parallelkoordinaten) | |
| `personen_id` | Text | nein | neu (Auftrag "Teil 2h", Punkt 4b, 2026-09-25) – Verweis auf `personenliste.csv` (Abschnitt 8), für alle 68 Zeilen befüllt. Zwei Zeilenpaare teilen sich dieselbe `personen_id` (`VI-0024`/`VI-0028` = `bartholomaeus_eggartner`, `VI-0032`/`VI-0033` = `anna_catharina_schoenthanin_hievor_leutmanslehnerin`) – bestätigte Zweitinventarisierungen derselben Person (Dietrich 2025), siehe `unsicherheit_anmerkung` unten und PROJEKTLOG. |
| `personen_id_unsicher` | ja/nein | – | neu (2026-09-25), analog zu `buergerbuch.csv`s Muster – aktuell für alle 68 Zeilen `nein`, auch für die beiden Zweitinventarisierungs-Paare (die Zuordnung selbst ist gesichert, nicht die Unsicherheit). |
| `unsicherheit_anmerkung` | Text | nein | neu ergänzt (Spalte), inhaltlich seit 2026-09-25 für vier Zeilen befüllt (die beiden Zweitinventarisierungs-Paare) – Hinweistext dort unabhängig von `personen_id_unsicher` (s. o.), löst trotzdem `baueUnsicherheitAbsatz()`s generische "Angaben unsicher"-Anzeige aus (die Komponente kennzeichnet jede befüllte `unsicherheit_anmerkung` so, unabhängig vom Grund - bewusst in Kauf genommen statt eines Sonderfalls im Code, siehe PROJEKTLOG). |

**Weiterhin offen:** Spaltennamen mit Leerzeichen/Klammern/Prozentzeichen noch nicht bereinigt.

---

## 6. familien.csv (aus familien.xlsx, Sheet "Herrschernamen" – vormals "Sheet")

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `id` | Text | **Pflicht** (Habsburg-Zeitleistenbaum), Schlüssel | Name + Ordnungszahl |
| `name` | Text | empfohlen | |
| `titel` | Text/Liste (Pipe) | nein | |
| `familie` | Text | **Pflicht** (Habsburg-Zeitleistenbaum) | |
| `geburtsdatum` | Text (Freitext) | nein | |
| `geburtsdatum_unsicher` | ja/nein | – | |
| `sterbedatum` | Text (Freitext) | nein | |
| `sterbedatum_unsicher` | ja/nein | – | |
| `ehepartner_id` | Text/Liste (Pipe) | nein | |
| `ehepartner_id_unsicher` | ja/nein | – | |
| `vater_id` | Text | nein | |
| `vater_id_unsicher` | ja/nein | – | |
| `mutter_id` | Text | nein | |
| `mutter_id_unsicher` | ja/nein | – | |
| `anmerkung` | Text | – | allgemein, NICHT für Unsicherheits-Tooltip |
| `unsicherheit_anmerkung` | Text | nein | für Hover-Tooltip |
| `hrr_status` | Text (Enum) | nein | `kaiser`/`koenig`/`kaiserin_heirat`/`koenigin_heirat`/`keiner` – strukturierte Statuskennzeichnung als Vorstufe für eine künftige „Kaiserlinie"-Fokusansicht im Familienbaum, aus dem bestehenden `titel`-Feld abgeleitet (Auftrag "Neues Datenfeld hrr_status", 2026-09-09). Verteilung über alle 80 Zeilen: 16 `kaiser`, 3 `koenig`, 19 `kaiserin_heirat`, 5 `koenigin_heirat`, 37 `keiner`. |
| `herrschaft_von` / `herrschaft_bis` | Zahl (Jahr) | nein | Regierungszeitraum als HRR-Kaiser/König aus eigenem Recht – nur für die 17 Personen mit `hrr_status` `kaiser`/`koenig` befüllt, deren Regierungsjahre eindeutig bestimmbar sind (die übrigen 2 `kaiser`/`koenig`-Personen sowie alle `_heirat`/`keiner`-Zeilen bleiben hier leer). Bei `friedrich_iii`, `maximilian_i`, `karl_v` bewusst das frühere König-Jahr als `herrschaft_von` verwendet, nicht das spätere Kaiser-Jahr (Auftrag "Habsburg-Zeitleistenbaum", 2026-09-11, siehe CHANGELOG). Neu ergänzt (Auftrag "Familienbaum-Regression beheben", 2026-09-21) – war zwischenzeitlich durch eine externe Datei-Operation verloren gegangen (Dateizeitstempel lag vor der ursprünglichen Einführung, siehe CHANGELOG Eintrag 77 für die Diagnose). |

**Änderung gegenüber vorheriger Version:** `erschliessungsstatus` bewusst entfernt (seit Masterprompt v3.8 kein Pflichtfeld mehr, `unsicherheit_anmerkung` übernimmt die Funktion). Zusatz-Arbeitsblätter (Prüfbericht, Urkundenherrscher usw.) sind nicht mehr vorhanden – Bereinigung erfolgreich abgeschlossen. `hrr_status` (2026-09-09), `herrschaft_von`/`herrschaft_bis` (2026-09-11, zwischenzeitlich verloren und am 2026-09-21 wiederhergestellt) neu ergänzt, siehe CHANGELOG.md/docs/PROJEKTLOG.md für die Zuordnung.

---

## 7. orte.csv (aus orte.xlsx, Sheet "Orte" – vormals orte.csv direkt)

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `orte_id` | Text | Schlüssel | neu, eindeutiger Schlüssel (ersetzt namensbasierte Referenz) |
| `orte` | Text | **Pflicht** (Karte, Verbindungskarte, Bipartite Flow Map) | Ortsname |
| `lat` | Zahl | **Pflicht** (Karte, Verbindungskarte, Bipartite Flow Map) | |
| `lon` | Zahl | **Pflicht** (Karte, Verbindungskarte, Bipartite Flow Map) | |
| `haeufigkeit` | Zahl | nein | |
| `orte_unsicher` | ja/nein | – | |
| `unsicherheit_anmerkung` | Text | nein | |

**Wichtige offene Frage:** Mit `orte_id` gibt es jetzt einen echten Schlüssel – Masterprompt Abschnitt 8 beschreibt aktuell aber noch eine rein namensbasierte Referenzierung zwischen Tabellen ("Andere Tabellen referenzieren Orte nur über den Ortsnamen"). Zu klären: Sollen `urkunden.orte` / `buergerbuch.Ort` künftig auf `orte_id` statt auf den Namen verweisen? Das wäre robuster (Namensänderungen/Schreibvarianten würden Verknüpfungen nicht mehr brechen), aber eine Änderung an bestehenden, bereits genutzten Feldern.

---

## 8. personenliste.csv (neu, aus personenliste.xlsx, Sheet Personenliste)

4176 Einträge (4110 aus Urkunden/Bürgerbuch + 66 aus `verlassenschaftsinventare.csv`, seit Auftrag "Familienbaum-Regression beheben + Personenliste umfassend erweitern", 2026-09-21 - ursprünglich 68 Verlassenschaftsinventar-Zeilen, davon zwei Paare am 2026-09-25 zu je einer Zeile zusammengelegt, siehe `nennung_in_verlassenschaften` unten und PROJEKTLOG "Teil 2h", Punkt 4b). Zusammengeführtes Personenregister – verknüpft Nennungen aus Urkunden, Bürgerbuch UND Verlassenschaftsinventaren über eine gemeinsame, normierte `personen_id`. Löst das Problem mehrdeutiger Namensschreibweisen (vgl. die früher besprochenen 8 Namensüberschneidungen). **Wichtig:** Namensgleichheit über die drei Quellen hinweg wird weiterhin NICHT automatisch verschmolzen – unabhängige Quellen ohne geprüfte Identität bekommen eigene Zeilen (z. B. gibt es sowohl `matthias_schmidt` als auch `matthias_schmidt_2`). Eine Zusammenlegung erfolgt nur bei geprüfter Identität INNERHALB derselben Quelle (die beiden Zweitinventarisierungs-Paare, s. o.).

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `personen_id` | Text | Schlüssel | eindeutiger Schlüssel, referenziert von `urkunden.personen_id`, `buergerbuch.personen_id`, `buergerbuch.buergen_id`. Für neu ergänzte Verlassenschaftsinventar-Personen als Namens-Slug vergeben (Kleinschreibung, Umlaute→ae/oe/ue/ss), bei Kollision mit einer bestehenden ID mit `_2`/`_3`/… durchnummeriert. |
| `schreibweisen` | Liste (Pipe-getrennt) | nein | bekannte Namensvarianten derselben Person |
| `quelle` | Text | nein | `Urkunden` / `Bürgerbuch` / `Verlassenschaftsinventare` (seit 2026-09-21) |
| `anzahl_nennungen` | Zahl | nein | |
| `erste_nennung` / `letzte_nennung` | Zahl (Jahr) | nein | |
| `nennungsspanne_jahre` | Zahl | nein | berechenbar aus erste/letzte Nennung – zu prüfen, ob Rohwert oder Ableitung im DataLoader sinnvoller ist (DRY) |
| `nennung_in_urkunden` | Text/Liste (Pipe-getrennt) | nein | Signatur(en) aus `urkunden.csv` – Format geklärt: leer bei `quelle` ≠ Urkunden |
| `nennung_in_buergerbuch` | Text/Liste (Pipe-getrennt) | nein | `id`(s) aus `buergerbuch.csv` – Format geklärt: leer bei `quelle` ≠ Bürgerbuch |
| `nennung_in_verlassenschaften` | Text/Liste (Pipe-getrennt) | nein | neu (2026-09-21): `id`(s) aus `verlassenschaftsinventare.csv` (z. B. `VI-0004`), analog zu den beiden Feldern oben – leer bei `quelle` ≠ Verlassenschaftsinventare. Seit 2026-09-25 bei den beiden zusammengelegten Zweitinventarisierungs-Personen eine Pipe-Liste (`VI-0024\|VI-0028`, `VI-0032\|VI-0033`), sonst weiterhin genau eine ID. |
| `soziale_gruppe` | Text (Enum) | nein | neu (2026-09-21): `dynastie`/`adel`/`klerus`/`buerger`, dieselbe Klassifikationslogik wie `chordDiagramm.js`' `ermittleGruppe()` (Priorität Dynastie→Klerus→Adel→Bürgertum, über `personen_id`/`schreibweisen` angewandt) – als Klartext-Spalte materialisiert, nicht nur Laufzeit-Berechnung. Keine belegte historische Klassifikation, sondern eine Näherung (siehe Chord-Diagramm-Info-Text). |
| `beruf` | Text | nein | neu (2026-09-21): bei `quelle`=Bürgerbuch direkter Pull aus `buergerbuch.Beruf` (über `nennung_in_buergerbuch` aufgelöst, bei mehreren verknüpften Einträgen der erste mit befülltem Wert), bei `quelle`=Verlassenschaftsinventare direkter Pull aus `verlassenschaftsinventare.Beruf`, bei `quelle`=Urkunden durchgehend leer (keine systematisch extrahierbaren Berufsangaben im Personenfeld) |
| `unsicherheit_anmerkung` | Text | nein | |

**Hinweis:** enthält zusätzliches Tabellenblatt "Änderungsprotokoll" – internes Arbeitsdokument, nicht Teil der Interface-Daten. Kein `erschliessungsstatus`-Feld, konform zur gelockerten Regel (v3.8).

**Für die Visualisierung relevant:** Diese Tabelle ist die Grundlage für die im Masterprompt (Abschnitt 5a) erwähnte, über den Unsicherheits-Button erreichbare Übersicht unidentifizierter/mehrdeutiger Personen – analog zur geplanten Orte-Übersicht.

---

## 9. literatur.csv (Auftrag "Literaturseite", 2026-09-29: neues Schema, 105 Datenzeilen)

Speist den Literatur-Tab (`js/core/literaturSeite.js`); neue Zeile = neuer Eintrag im Interface, automatisch, ohne Code-Änderung (Content-driven-Prinzip). Gliedert die Seite nach Themen (Generous-Interface-Prinzip: Überblick statt Suchmaske) - Heimat- und Familienforscher:innen sollen sehen, welche Literatur es gibt, wo sie online zugänglich ist und in welchen Führungen sie verwendet wird.

**Wichtige Korrektur gegenüber der früheren Planung (Auftrag "Führungen, Teil 1"):** `literatur_id` ist **kein Zotero-Zitierkey mehr** - vorgesehen ist jetzt ein einfacher Kurzschlüssel aus Autor + Jahr (z. B. `kuehnel1960`), von Hand vergeben. Referenzziel bleibt unverändert `fuehrungen.csv`s `weiterlesen`-Spalte (siehe Abschnitt 10).

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `literatur_id` | Text | Schlüssel | Kurzschlüssel Autor+Jahr (z. B. `kuehnel1960`), s. o. - **kein** Zotero-Key |
| `zitation` | Text | **Pflicht** (Literatur) | fertige Literaturangabe, wird UNVERÄNDERT als Haupttext des Eintrags angezeigt (keine Kürzung) |
| `autor` | Text | nein | Kurzform, nur für die Sortierung "nach Autor" und kompakte Verweise verwendet - nicht das, was angezeigt wird (das ist `zitation`) |
| `titel` | Text | nein | Kurzform, wie `autor` - dient zusätzlich als Sortier-Rückfall, wenn `autor` leer ist |
| `jahr` | Zahl | nein | für die Sortierung "nach Jahr"; leer erlaubt, solche Einträge erscheinen bei dieser Sortierung am Ende |
| `kurzbeschreibung` | Text | nein | derzeit in allen 105 Zeilen leer |
| `kategorie` | Text | nein | gliedert die Seite in Themen-Gruppen. **Die Reihenfolge der Gruppen im Interface folgt der Reihenfolge des ERSTEN Auftretens der Kategorie in dieser Datei, nicht alphabetisch** - die Archivarin bestimmt die Gliederung dadurch allein über die Zeilenreihenfolge, ohne Code-Änderung. Leere `kategorie` sammelt sich in einer Gruppe "Weitere Literatur" am Ende. |
| `link` | Text (URL) | nein | zeigt einen "online"-Link mit Extern-Kennzeichnung |
| `verfuegbarkeit` | Text | nein | vom Archiv zu befüllen (z. B. "Handbibliothek"), derzeit in allen 105 Zeilen leer |
| `zeitraum_von` | Zahl | nein | behandelter Zeitraum - wird geladen, aber NICHT dargestellt (Auftrag, Nicht-Ziel: keine Zeitleiste der Epochen); bleibt für einen späteren Auftrag in der Datei |
| `zeitraum_bis` | Zahl | nein | s. o. |

**Kein `_unsicher`-Feld vorgesehen:** Diese Tabelle beschreibt veröffentlichte, extern verifizierbare Literatur, keine archivarische Unsicherheit im bisherigen Sinn – daher keine Unsicherheits-Kennzeichnung nötig.

**"Verwendet in"-Rückverweise:** die Seite ermittelt aus `fuehrungen.csv`s `weiterlesen`-Spalte (Abschnitt 10), welche Führungen einen Titel referenzieren, und zeigt das dort - reine Auswertung, keine eigene Spalte in `literatur.csv` nötig.

---

### 9.1 recherche_links.csv (neu, Auftrag "Literaturseite", 2026-09-29)

Speist den Bereich "Weiter recherchieren" oben auf der Literaturseite (externe Einstiege wie Bibliothekskatalog, Zeitschrift des Archivs). Fehlt die Datei oder hat sie keine Zeile mit `sichtbar=ja`, entfällt der Bereich ohne Fehler.

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `reihenfolge` | Zahl | empfohlen | Anzeigereihenfolge der Karten |
| `titel` | Text | empfohlen | Kartentitel, zugleich Linktext |
| `beschreibung` | Text | nein | kurzer Erklärtext auf der Karte |
| `link` | Text (URL) | empfohlen | öffnet in neuem Tab, mit "↗"-Symbol und `aria-label` als extern gekennzeichnet - dieselbe Konvention wie "Zum Weiterlesen" in den Führungen (Abschnitt 12) |
| `sichtbar` | Text (Enum: `ja`/`nein`) | empfohlen | nur `sichtbar=ja`-Zeilen erscheinen |

---

## 10. fuehrungen.csv (neu, Auftrag "Führungen, Teil 1", 2026-09-23)

Datengrundlage für die künftigen Storytelling-Führungen (Darstellung/Navigation folgen in Teil 2). UTF-8, Semikolon-getrennt, Pipe für Listen - dieselben Konventionen wie alle übrigen Tabellen.

**Zeilenlogik:** eine Zeile pro STATION, nicht pro Führung. `fuehrung_id` steht in jeder Zeile. Die führungsweiten Angaben (`fuehrung_titel` bis `weiterlesen`) stehen NUR in der Zeile der ersten Station dieser Führung, in allen weiteren Stationen-Zeilen derselben Führung bleiben sie leer. Führungen erscheinen im Interface in der Reihenfolge ihres ERSTEN Auftretens in der Datei (keine separate Sortierspalte).

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `fuehrung_id` | Text | **Pflicht** (Führungen: Übersicht, Station, Ende) | eindeutiger Schlüssel, in jeder Zeile befüllt |
| `fuehrung_titel` | Text | nur 1. Station | |
| `leitfrage` | Text | nur 1. Station | die übergeordnete Frage, die die Führung beantwortet |
| `kurzbeschreibung` | Text | nur 1. Station | für eine künftige Führungs-Übersicht/Kachel |
| `themenbereich` | Text | nur 1. Station | |
| `zeitraum` | Text | nur 1. Station | der von der Führung abgedeckte Gesamtzeitraum |
| `status` | Text (Enum) | nur 1. Station | `entwurf` (sichtbar, aber gekennzeichnet) oder `veroeffentlicht` |
| `weiterlesen` | Liste (Pipe-getrennt) | nur 1. Station | `literatur_id`-Werte (siehe Abschnitt 9, kein Zotero-Key mehr) - manuell zu pflegen. **Stand 2026-09-29:** bei den meisten Führungen bereits befüllt, allerdings mit vollständigen Literaturangaben statt `literatur_id`-Kurzschlüsseln (Altbestand aus der Zeit vor Abschnitt 9s Schema-Umstellung) - diese Werte lösen sich gegen die jetzt echten `literatur.csv`-Einträge NICHT auf und erscheinen als sichtbarer Fehlerhinweis (s. Abschnitt 12). Betrifft alle Führungen außer `buergerspital-heringe`/`wer-fehlt` (dort leer). Nicht Teil des Auftrags "Literaturseite" (Nicht-Ziel: keine Änderung an `fuehrungen.csv`) - der Archivarin zur Kenntnis gebracht. |
| `station_nr` | Zahl | **Pflicht** (Führungsstation) | Reihenfolge der Stationen innerhalb einer Führung |
| `station_titel` | Text | empfohlen | |
| `station_zeitraum` | Text | nein | |
| `text` | Liste (Pipe-getrennt) | **Pflicht** (Führungsstation) | ein Absatz pro Listenelement; ein Absatz, der mit `- ` beginnt, ist ein Aufzählungspunkt - mehrere AUFEINANDERFOLGENDE `- `-Absätze bilden gemeinsam eine Liste |
| `beleg` | Liste (Pipe-getrennt, 0-2 Einträge) | nein | Format `typ:id`, Trennung am ERSTEN Doppelpunkt (IDs selbst enthalten keinen). Zwei Einträge ergeben eine Vergleichsslide. Bleibt der Wert leer, entfällt der Belegbereich vollständig - kein Fehler/Prüfhinweis, der Erzähltext steht dann über die volle verfügbare Breite (begrenzt auf die übliche Zeilenlänge, mittig angeordnet; Teil 2e, Punkt 1). Präfixtabelle: |
| `bild_text` | Text | nur bei `beleg`-Typ `bild` | Bildunterschrift UND Alt-Text zugleich - muss beschreiben, was zu sehen ist |
| `unsicherheit_hinweis` | Text | nein | zusätzlicher, REDAKTIONELLER Text - kein Ersatz für die aus der Quell-CSV übernommenen `_unsicher`-Felder/`unsicherheit_anmerkung` (siehe unten) |
| `vertiefung` | Liste (Pipe-getrennt) | nein | interne Pfade im Router-Format aus Punkt 0.2 (z. B. `#visualisierungen/urkunden/zeitachse`, siehe `js/core/router.js:1-9`) - Format muss erweiterbar bleiben, da Zustandsparameter (Stufe 3, `?entity_typ=…&entity_wert=…` nach demselben Muster wie `router.js:41-46`) später an denselben Pfad angehängt werden |
| `quellen_intern` | Text | nein | wird im Interface NIE angezeigt (interne Redaktionsnotiz) |

**`beleg`-Präfixtabelle** (gegen die tatsächlichen Spaltennamen der Quell-CSVs geprüft):

| Präfix | Datei | ID-Spalte |
|---|---|---|
| `urkunde` | `urkunden.csv` | `signatur` |
| `buergerbuch` | `buergerbuch.csv` | `id` |
| `inventar` | `verlassenschaftsinventare.csv` | `id` |
| `bestand` | `bestandsverzeichnis.csv` | `kuerzel` |
| `person` | `personenliste.csv` | `personen_id` |
| `familie` | `familien.csv` (Habsburg-Stammbaum) | `id` |
| `bild` | Bildpfad | – |

**Unsicherheit:** bei datenbasierten Belegen (alle Präfixe außer `bild`) übernimmt die künftige Darstellung (Teil 2) die `_unsicher`-Felder/`unsicherheit_anmerkung` DIREKT aus der jeweiligen Quell-CSV der referenzierten ID - `unsicherheit_hinweis` in `fuehrungen.csv` ist ein davon UNABHÄNGIGER, zusätzlicher redaktioneller Text (z. B. eine Einordnung, warum eine Station gerade wegen der Unsicherheit erzählenswert ist), kein Ersatz.

**Demo-Führung (`fuehrung_id = demo`, `status = entwurf`, vier Stationen, alle Texte als `[Platzhalter: …]` erkennbar):**

| Station | Beleg | Zweck |
|---|---|---|
| 1 | `urkunde:StaAKr-0001` | Einzelfall (älteste Urkunde, 1108), Führungsangaben ausgefüllt |
| 2 | `buergerbuch:BB-0148` | Bürgerbucheintrag mit Aufzählungs-Text (`- `-Absätze) und befülltem `unsicherheit_hinweis` |
| 3 | `urkunde:StaAKr-0798\|inventar:VI-0002` | Vergleichsslide (Erbschaftssache 1547 vs. Verlassenschaftsinventar 1671) |
| 4 | `bestand:1.1.1.1.1.` | längerer Text (113 Wörter Platzhalter), `vertiefung` = `#visualisierungen/urkunden/zeitachse` |

Alle fünf Beleg-IDs sind per grep gegen die jeweilige Quell-CSV verifiziert (siehe CHANGELOG/PROJEKTLOG).

## 11. Datensatzaufruf per URL (Auftrag "Führungen, Teil 2b", 2026-09-23)

**Format:** `?datensatz=<typ>:<id>`, z. B. `#visualisierungen/urkunden/zeitachse?datensatz=urkunde:StaAKr-0022`. Eigener Query-Parameter, unabhängig von `entity_typ`/`entity_wert` (`router.js:33-46`) - beide können nebeneinander in derselben URL stehen. `<typ>` sind dieselben vier Präfixe wie in Abschnitt 10 (`urkunde`/`inventar`/`bestand`/`person` - `buergerbuch` ist bewusst KEIN eigener Typ, siehe unten), `<id>` dieselben ID-Spalten.

**Zentrale Zuordnung:** `js/utils/datensatzAufruf.js`s `ZUORDNUNG`-Konstante (eine Stelle, siehe dortiger Dateikopf-Kommentar) verknüpft Typ → Zielansicht (Router-Segmente) → die schmale, vom Zielmodul exportierte `oeffneDatensatz(id)`-Funktion. Jede Zuordnung wird zur Laufzeit gegen `archivalienRegistry.js` geprüft - fehlt die referenzierte Ansicht dort, erscheint ein sichtbarer Hinweis statt eines Fehlers (Führungen hängen dadurch nicht an einzelnen Ansichten, siehe PROJEKTLOG Eintrag 32).

| Typ | Zielansicht | Öffnen-Funktion ruft auf |
|---|---|---|
| `urkunde` | `#visualisierungen/urkunden/zeitachse` | bestehendes `oeffneSidebar()` (Klick-Handler-Funktion) |
| `inventar` | `#visualisierungen/verlassenschaften/parallelKoordinaten` | bestehendes `schalteAuswahl()` (inkl. Linien-Hervorhebung) |
| `bestand` | `#bestand/treemap` | bestehendes `wechsleZuKategorie()` + `waehleBestandAus()` (inkl. Kategorie-Vorauswahl und Hervorhebung) |
| `person` | `#visualisierungen/personen/personenliste` | bestehende Suchfeld-Logik + `zeigePersonenNennungen()` |
| `buergerbuch` (Führungs-Belegtyp) | verlinkt NICHT sich selbst, sondern `person:<personen_id des Eintrags>` | s. o. (`person`) |
| `literatur` (Auftrag "Literaturseite", 2026-09-29) | `#literatur` (kein Archivalientyp/keine Visualisierung, daher nur ein Segment) | `js/core/literaturSeite.js`s `oeffneDatensatz(id)` - scrollt zum Eintrag (`scrollIntoView`, bewusst ohne `behavior:'smooth'`, siehe PROJEKTLOG) und hebt ihn kurz hervor |

**Erweiterung um Zustandsparameter (Stufe 3, NICHT Teil dieses Auftrags):** weitere Query-Parameter (z. B. `zeitraum=1500-1550`, `filter=kategorie:Kauf`) können künftig neben `datensatz` in derselben URL stehen, ohne dieses Format zu ändern - `router.js`' `parseHash()` bräuchte dafür nur weitere `params.get(...)`-Zeilen.

**Offener Punkt:** `filter.entity` (`entity_typ`/`entity_wert`) wird vom Router gesetzt, aber von keinem Modul ausgelesen (siehe PROJEKTLOG Eintrag 29) - unverändert, nicht Teil dieses Auftrags.

---

## 12. Abschlussbildschirm und weiterlesen-Auflösung (Auftrag "Führungen, Teil 2c", 2026-09-23)

**URL-Format:** `#fuehrungen/<fuehrung_id>/ende` - drittes Routensegment `ende` statt einer `station_nr`, von `js/core/app.js`' `aktualisiereFuehrungenAnsicht()` VOR der `station_nr`-Auflösung abgezweigt (sonst würde `Number('ende')` zu `NaN` und fälschlich "nicht gefunden" auslösen). Neuladen erhält die Ansicht (kein Sonderfall - derselbe Mechanismus wie jede andere Route).

**Auflösung von `weiterlesen`:** `js/fuehrungen/fuehrungenDaten.js`s `parseWeiterlesen()` löst jede `literatur_id` aus der (nur auf der ersten Stationszeile gültigen, siehe Abschnitt 10) `weiterlesen`-Spalte gegen `literatur.csv` auf (`ladeFuehrungenDaten()` lädt diese Datei zusätzlich zu den fünf Beleg-Quell-CSVs). **Anzeige (Abschlussbildschirm, Block "Zum Weiterlesen"), seit Auftrag "Literaturseite" (2026-09-29):** die vollständige `zitation` PLUS ein interner Link "in der Literaturliste" (Deep Link `literatur:<literatur_id>`, siehe Abschnitt 11) - ein vorhandener externer `link` bleibt zusätzlich als externer Link erhalten (Symbol, `target="_blank"`, `rel="noopener"`). Vorher zeigte dieser Block nur eine Kurzform aus `autor, titel, jahr`.

**Neue Prüfregel (Stil Abschnitt 10/2a):** `literatur_id` nicht in `literatur.csv` gefunden → sichtbarer Fehlerhinweis an der Stelle des Eintrags, statt eines stillen Auslassens oder Abbruchs. Ursprünglich (siehe PROJEKTLOG Eintrag 33) mit einer temporären Testkopie verifiziert, solange `literatur.csv` noch ohne echte Dateninhalte war. **Aktueller Stand (Auftrag "Literaturseite"):** dieselbe Prüfregel greift jetzt in der Praxis bei den meisten Führungen, da deren `weiterlesen`-Spalte volle Literaturangaben statt `literatur_id`-Kurzschlüssel enthält (siehe Abschnitt 10) - der Archivarin gemeldet, nicht behoben (Nicht-Ziel dieses Auftrags).

---

## 13. Archivspezifische Konfigurationsdateien (Auftrag "Archivspezifische Texte und Identität in CSV-Dateien", 2026-09-29)

Diese vier Dateien machen das Interface für ANDERE Kommunalarchive nachnutzbar, ohne dass am Code etwas geändert werden muss - Name, Kontakt, Logo, Kartenausschnitt sowie alle Texte der Startseite, der Über-Seite und der "?"-Info-Buttons stehen hier, nicht mehr fest im Code. **Dieser Abschnitt richtet sich ausdrücklich an Archivar:innen ohne Programmierkenntnisse** - die vier Dateien lassen sich mit jedem Tabellenprogramm (Excel, LibreOffice Calc, Google Sheets) öffnen und bearbeiten, solange beim Speichern das Format "CSV UTF-8, Semikolon-getrennt" gewählt wird (bei Excel: "CSV UTF-8 (durch Trennzeichen getrennt)").

**Gemeinsame Regeln für alle vier Dateien** (siehe auch die allgemeinen Konventionen ganz oben in diesem Dokument):

- CSV, UTF-8 **mit BOM** (das ist die Voreinstellung bei "CSV UTF-8" in Excel), Semikolon `;` als Spaltentrenner.
- Ein Absatzumbruch INNERHALB einer Textzelle wird mit einem senkrechten Strich `|` geschrieben, z. B. `Erster Absatz.|Zweiter Absatz.` - genau wie in `fuehrungen.csv` (Abschnitt 10).
- **Platzhalter** in geschweiften Klammern werden automatisch durch echte Werte ersetzt, z. B. `{archiv_kurzname}` oder `{n_urkunden}`. Verfügbare Platzhalter:
  - jeder Schlüssel aus `archiv.csv` (Spalte `schluessel`, z. B. `{archiv_kurzname}`, `{email}`)
  - `{n_bestaende}`, `{n_urkunden}`, `{n_buergerbuch}`, `{n_inventare}` - die jeweils aktuelle Zeilenzahl der entsprechenden Archivalien-Tabelle, wird bei jedem Seitenaufruf neu gezählt (muss nie von Hand aktualisiert werden)
  - in `infotexte.csv` zusätzlich einzelne, vom jeweiligen Modul selbst mitgegebene Werte (aktuell nur beim Sankey-Diagramm, siehe dort)
  - **Wichtig:** eckige Klammern `[wie hier]` sind KEINE Platzhalter und bleiben unverändert stehen - so lassen sich eigene Erinnerungen/Lücken im Text markieren (z. B. `[AUTOR:IN, TITEL, JAHR]`), ohne dass das Interface versucht, sie zu ersetzen.
  - Tippt man sich bei einem Platzhalter-Namen (z. B. `{n_urkunde}` statt `{n_urkunden}`), erscheint der betroffene Textblock auf der Seite **gar nicht** (statt einer falschen/rohen Ausgabe) - das Öffnen der Browser-Konsole zeigt dann eine Warnung mit dem genauen, nicht erkannten Namen.
- Fehlt eine der vier Dateien komplett (z. B. beim Ausprobieren, oder weil sie noch nicht befüllt ist), stürzt das Interface nicht ab - siehe die Spalte "Verhalten bei fehlender Datei" unten.

### 13.1 archiv.csv - Name, Kontakt, Logo, Kartenausschnitt

Eine Zeile pro Einstellung (Schlüssel-Wert-Tabelle, KEINE Zeile pro Urkunde o. Ä.). Wird als einzige der vier Dateien bereits geladen, bevor die Seite zum ersten Mal etwas anzeigt.

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `schluessel` | Text | **Pflicht** (Startseite, Über – Kerndatei) | fester Name der Einstellung, siehe Tabelle unten - nicht verändern, nicht übersetzen |
| `wert` | Text | **Pflicht** (Startseite, Über – Kerndatei) | der tatsächliche Wert |
| `anmerkung` | Text | nein | rein für die eigene Dokumentation, wird im Interface nirgends angezeigt |

**Vorgesehene Schlüssel** (jede fehlende Zeile bekommt einen neutralen Ersatzwert, siehe unten):

| `schluessel` | Beispielwert | Wo sichtbar |
|---|---|---|
| `archiv_name` | Stadtarchiv Krems an der Donau | Fußzeile (Kontakt), Über-Seite |
| `archiv_kurzname` | Stadtarchiv Krems | aria-Label des Logo-Links (barrierefreie Bezeichnung, nicht sichtbarer Text) |
| `seitentitel` | Interface Stadtarchiv Krems | Browser-Tab-Titel |
| `logo_datei` | logo.svg | Dateiname des Logos, muss zusammen mit dieser CSV in `data/` liegen |
| `logo_untertitel` | Stadtarchiv | kleiner Text neben dem Logo oben links |
| `favicon_datei` | favicon.svg | Symbol im Browser-Tab - eine quadratische SVG-Datei (gleiche Breite wie Höhe), muss in `data/` liegen - leer lassen, wenn kein Favicon gesetzt werden soll (kein Fehler, es erscheint dann einfach keines) |
| `favicon_png_datei` | favicon-32.png | Rückfall als 32×32-Pixel-PNG (ebenfalls quadratisch) für Browser, die ein SVG-Favicon nicht unterstützen - leer lassen, wenn nicht benötigt |
| `apple_touch_icon_datei` | apple-touch-icon.png | Symbol, das iPhones/iPads verwenden, wenn die Seite auf dem Startbildschirm gespeichert wird - ein 180×180-Pixel-PNG OHNE Transparenz (Apple stellt transparente Bereiche sonst teils schwarz statt durchsichtig dar) - leer lassen, wenn nicht benötigt |
| `adresse_strasse` | Körnermarkt 14 | Fußzeile/Kontakt, Über-Seite |
| `adresse_ort` | 3500 Krems an der Donau | Fußzeile/Kontakt, Über-Seite |
| `telefon` | 0 27 32 / 801 578 | als lesbarer Text angezeigt |
| `telefon_international` | +432732801578 | NICHT sichtbar, wird nur für den klickbaren `tel:`-Link verwendet - **vollständige internationale Nummer, mit Landesvorwahl, ohne Leerzeichen/Schrägstriche** |
| `email` | stadtarchiv@krems.gv.at | als Text UND als `mailto:`-Link |
| `website` | www.krems.gv.at/stadtarchiv | als lesbarer Text angezeigt |
| `website_link` | https://www.krems.gv.at/stadtarchiv | NICHT sichtbar, vollständige URL für den Link hinter `website` |
| `akzentfarbe` | #2c4a6e | Hauptfarbe der Oberfläche (Buttons, Links, Info-Buttons) - ein Hex-Farbcode wie in jedem Grafikprogramm, mit `#`. Kontrast zu Weiß sollte mindestens 4,5:1 betragen (in jedem Online-Kontrast-Prüfer eingeben) |
| `karte_zentrum_lat` | 48.42 | Breitengrad, wo alle Karten beim Öffnen zentriert sind |
| `karte_zentrum_lon` | 15.6 | Längengrad, siehe oben |
| `karte_zoom` | 7 | Start-Zoomstufe der Karten (kleinere Zahl = weiter herausgezoomt) |
| `footer_text` | Interface des Stadtarchivs … | Fußzeile ALLER Seiten AUSSER der Startseite (die hat ihre eigene, siehe `startseite.csv`s `footer_hinweis` unten) |

**Verhalten bei fehlender Datei:** neutrale Ersatzwerte (u. a. „Archiv" als Name/Titel, leere Kontaktangaben, die bisherige Standardfarbe, Kremser Kartenausschnitt als Rückfall), eine Fehlermeldung in der Browser-Konsole, kein Absturz. **Seit Auftrag B2 (2026-10-03):** `archiv.csv` ist eine Kerndatei - fehlt sie, ist sie leer oder fehlt `schluessel`/`wert`, zeigen Startseite und Über-Seite zusätzlich einen Hinweisbalken mit dem Dateinamen (siehe „Mindestspalten und was bei Problemen passiert" oben).

**Zum mitgelieferten Favicon:** Die drei Standarddateien (`favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`) zeigen ein weißes σ auf einem abgerundeten Quadrat in der Interface-Akzentfarbe - dasselbe Zeichen, das im Interface bereits für Unsicherheit steht. Es kennzeichnet das Interface selbst (die Anwendung), nicht ein bestimmtes Archiv. Andere Archive können es unverändert beibehalten oder durch ein eigenes Symbol ersetzen (einfach die drei Dateien gleichen Namens in `data/` austauschen, die Schlüssel in `archiv.csv` bleiben gleich).

### 13.2 startseite.csv - Inhalte der Startseite

Eine Zeile pro Baustein ("Block") der Startseite. Die Reihenfolge auf der Seite richtet sich NICHT nach der Zeilenreihenfolge in der Datei, sondern nach der Spalte `reihenfolge` - Zeilen lassen sich also in beliebiger Reihenfolge einfügen/sortieren.

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `block_id` | Text | Schlüssel | frei wählbarer, eindeutiger Name der Zeile (nur zur eigenen Orientierung) |
| `reihenfolge` | Zahl | empfohlen | bestimmt die Anzeigereihenfolge (aufsteigend), auch typübergreifend |
| `typ` | Text (Enum) | **Pflicht** (Startseite – Kerndatei) | einer von `slide` / `einleitung` / `kachel` / `download` / `footer_hinweis`, siehe unten |
| `kicker` | Text | nur bei `slide` | kurzer Vorspann über der Slide-Überschrift |
| `titel` | Text | bei `slide`/`kachel` | Überschrift |
| `text` | Text (Pipe-getrennt bei mehreren Absätzen) | bei `einleitung`/`kachel`/`footer_hinweis` | Fließtext |
| `link_text` | Text | nein | Beschriftung des Buttons/Links (bei `slide`/`kachel`: nur sichtbar, wenn `link_ziel` ebenfalls befüllt ist; bei `download`: Pflicht) |
| `link_ziel` | Text (URL oder `#anker`) | nein | Linkziel - `#visualisierungen`, `#fuehrungen` usw. für interne Sprünge, `https://…` für externe Seiten/PDFs |
| `bild` | Text (Dateiname) | nein, nur bei `slide` | Dateiname eines Bilds in `data/` als Slide-Hintergrund - bleibt die Zelle leer, zeigt die Slide stattdessen einen Verlaufshintergrund mit der Kennzeichnung "Platzhalterbild" |
| `sichtbar` | `ja`/`nein` | **Pflicht** (Startseite – Kerndatei) | nur Zeilen mit `ja` werden angezeigt - `nein` lässt eine Zeile in der Datei stehen, ohne sie zu löschen (z. B. um sie später wieder zu aktivieren) |

**Typen im Detail:**
- `slide`: ein Bild/Verlauf im Karussell oben. Beliebig viele Zeilen möglich (bei mehr als vier zyklische Wiederholung der vier Hintergrundverläufe).
- `einleitung`: GENAU EINE Zeile erwartet (weitere werden ignoriert, nur die mit der niedrigsten `reihenfolge` erscheint) - der Begrüßungstext unter dem Karussell.
- `kachel`: eine der Angebotskacheln darunter. Beliebig viele Zeilen möglich, das Kachelraster passt sich automatisch an.
- `download`: ein Link im Fußzeilen-Block "Downloads & Rechtliches". Ohne jede `download`-Zeile entfällt dieser Block vollständig (keine leere Überschrift).
- `footer_hinweis`: GENAU EINE Zeile erwartet - der Copyright-/Hinweistext ganz unten auf der Startseite (NICHT dieselbe Fußzeile wie auf den übrigen Seiten, siehe `archiv.csv`s `footer_text`).

Kontaktangaben (Adresse/Telefon/E-Mail/Website) stehen NICHT hier, sondern in `archiv.csv` (dort einmal für die ganze Seite gepflegt).

**Verhalten bei fehlender Datei:** **seit Auftrag B2 (2026-10-03)** zeigt die Startseite statt ihres Inhalts einen Hinweisbalken mit dem Dateinamen (Kerndatei) - ebenso bei leerer Datei, nur Kopfzeile oder fehlender Spalte `typ`/`sichtbar`. Bisher blieb sie bis auf Kopf- und Fußzeile leer.

### 13.3 ueber.csv - Inhalte der Über-Seite

Eine Zeile pro Textabschnitt, wie `startseite.csv` nach `reihenfolge` sortiert und nur `sichtbar=ja` angezeigt.

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `block_id` | Text | Schlüssel | frei wählbarer, eindeutiger Name (nur zur eigenen Orientierung) |
| `reihenfolge` | Zahl | empfohlen | Anzeigereihenfolge |
| `ebene` | `1`/`2` | empfohlen | `1` = eigene Zwischenüberschrift (größer), `2` = Unterpunkt innerhalb des zuletzt vorangegangenen `1`-Abschnitts (kleiner) |
| `titel` | Text | empfohlen | Überschrift des Abschnitts |
| `text` | Text (Pipe-getrennt bei mehreren Absätzen) | **Pflicht** (Über) | Fließtext |
| `sichtbar` | `ja`/`nein` | **Pflicht** (Über) | wie bei `startseite.csv` |

Am Ende der Seite erscheint automatisch ein Kontaktblock (Name/Adresse/Telefon/E-Mail/Website aus `archiv.csv`) - dafür ist keine eigene Zeile in `ueber.csv` nötig.

Das Unsicherheits-Symbol σ, an beliebiger Stelle im Fließtext verwendet, wird automatisch in derselben Warnfarbe hervorgehoben wie überall sonst im Interface.

**Verhalten bei fehlender Datei:** der Navigationspunkt "Über" wird oben in der Kopfzeile komplett ausgeblendet (keine leere Seite erreichbar). **Seit Auftrag B2 (2026-10-03)** gilt das auch bei leerer Datei oder nur Kopfzeile; ein gespeicherter Link auf die Über-Seite zeigt dann einen Hinweisbalken.

### 13.4 infotexte.csv - Texte der "?"-Info-Buttons

Eine Zeile pro Visualisierung/Modul, das einen Info-Button ("?" oben rechts) besitzt.

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `modul_id` | Text | Schlüssel | fester technischer Name der Visualisierung (= Dateiname ohne `.js` in `js/viz/`, z. B. `treemap`, `sankey`, `karte`) - NICHT verändern, sonst findet das Interface den Text nicht mehr |
| `aria_label` | Text | empfohlen | barrierefreie Bezeichnung des Buttons (wird von Screenreadern vorgelesen), z. B. "Erklärung zur Treemap" |
| `text` | Text (Pipe-getrennt bei mehreren Absätzen) | empfohlen | der eigentliche Erklärtext im aufklappbaren Popover |
| `anmerkung` | Text | nein | rein für die eigene Dokumentation, wird nirgends angezeigt |

**Vollständige Liste der 26 `modul_id`-Werte** (jede muss einmal vorkommen, damit die jeweilige Ansicht einen Info-Button hat): `adjazenzmatrix`, `bipartiteFlowMap`, `bumpChart`, `chordDiagramm`, `circlePacking`, `dotPlot`, `familienbaum`, `ganttDiagramm`, `icicle`, `kalenderHeatmap`, `karte`, `korrelationsmatrix`, `marimekkoVerlassenschaften`, `parallelKoordinaten`, `personenliste`, `personennetzwerk`, `regestenKachelraster`, `sankey`, `streamgraph`, `sunburst`, `treemap`, `trellis`, `verbindungskarte`, `vermoegensschichtung`, `wortwolke`, `zeitachse`.

**Sonderfall Sankey-Diagramm:** dessen Text verwendet zusätzlich drei modulinterne Platzhalter, die NICHT aus `archiv.csv` kommen, sondern vom Sankey-Modul selbst beim Anzeigen eingesetzt werden: `{ORT_BUENDELUNG_SCHWELLE}`, `{KATEGORIE_BUENDELUNG_SCHWELLE}`, `{ANDERE_KATEGORIEN}` (aktuell 15, 10 bzw. "Andere Kategorien").

**Verhalten bei fehlender Datei oder fehlendem Eintrag:** die betroffene Ansicht zeigt einfach KEINEN Info-Button (kein leeres oder kaputtes "?"), eine Warnung in der Browser-Konsole nennt die genaue `modul_id`. Alle übrigen Module mit einem vorhandenen Eintrag sind davon nicht betroffen.

---

## Zusammenfassung: offene Punkte über alle Tabellen hinweg

1. `ratsprotokolle.csv`: `kategorien_unsicher` fehlt weiterhin, Entscheidung offen
2. `verlassenschaftsinventare.csv`: Spaltennamen mit Leerzeichen/Sonderzeichen nicht bereinigt; kein `_unsicher`-Flag (jetzt optional, aber zu erwägen)
3. `buergerbuch.csv`: Großschreibungs-Konvention weicht ab; `buergen_id`-Verweisziel zu bestätigen
4. `urkunden.csv`: Herkunft/Zweck von `datum_normiert` weiterhin nicht abschließend geklärt
5. `bestand.csv`: Verbleib von `sort_nr` und allgemeinem `anmerkungen`-Feld zu bestätigen (bewusst entfernt oder versehentlich)
6. `orte.csv`: neue `orte_id` – Frage, ob andere Tabellen künftig darauf statt auf den Namen verweisen sollen (siehe Masterprompt Abschnitt 8)
7. ~~`personenliste.csv`: Format von `nennung_in_urkunden`/`nennung_in_buergerbuch` zu prüfen~~ – geklärt (Text/Liste, Pipe-getrennte IDs); `nennungsspanne_jahre` wird weiterhin als eigenes Rohfeld geführt (nicht im DataLoader abgeleitet)
8. Alle Dateien: Export von Excel (.xlsx, Arbeitsformat) zu CSV (Einsatzformat) steht noch aus
9. `unsicherheit_anmerkung` ist überall als Spalte vorhanden, aber inhaltlich noch nicht befüllt
10. `literatur.csv` war bisher nur im Masterprompt erwähnt, jetzt erstmals als eigene Struktur dokumentiert (Abschnitt 9) – noch keine echten Daten erfasst
11. `urkunden.csv`: `foto_ordner` erfolgreich befüllt (1068/1068, automatischer Abgleich über `id`/`signatur`), erledigt
12. Ordner `StaAKr-0892` existiert unter `fotos/thumbs/`, hat aber keine entsprechende Zeile in `urkunden.csv` – zu klären, ob eine Urkunde in der CSV fehlt oder der Ordner veraltet ist
13. **Datenintegrität/externe Datei-Operationen (2026-09-21):** `familien.csv` verlor zwischenzeitlich `hrr_status`/`herrschaft_von`/`herrschaft_bis` durch eine externe Datei-Operation (Dateizeitstempel lag vor deren ursprünglicher Einführung – kein CLI-Edit, sonst gäbe es einen CHANGELOG-Eintrag) und wurde wiederhergestellt; `buergerbuch.csv` hatte zusätzlich kurzzeitig eine fälschliche Platzhalter-Kopfzeile (`Column1;Column2;…`) vor dem echten Header, ebenfalls behoben. `orte.csv`/`verlassenschaftsinventare.csv` tragen denselben alten Dateizeitstempel wie `familien.csv` vor der Korrektur, wurden aber inhaltlich nie separat als beschädigt festgestellt – bei künftigen Aufträgen an diesen beiden Dateien vorsichtshalber Spalten-/Zeilenzahl gegen die hier dokumentierten Werte gegenprüfen. Siehe CHANGELOG Eintrag 77 für die volle Diagnose.
14. **Dieselbe Platzhalter-Kopfzeilen-Korruption, zwei weitere Fälle (Auftrag "Führungen, Teil 1", 2026-09-23):** `literatur.csv` und `ratsprotokolle.csv` hatten dieselbe fälschliche `Column1;Column2;…`-Zeile wie zuvor `buergerbuch.csv` (Punkt 13) - behoben (siehe Abschnitte 2/9). Root-Cause-Bestätigung: `js/core/dataLoader.js` (Zeile 143-144) hat KEINEN Zeilen-Skip, liest immer Zeile 1 als Kopfzeile - eine solche Platzhalterzeile ist daher IMMER ein Fehler, nie eine absichtliche Umgehung. Bei künftigen Datei-Operationen an beliebigen `data/*.csv` vorsorglich Zeile 1 gegen die hier dokumentierte Kopfzeile prüfen.
15. **`fuehrungen.csv` (neu, Abschnitt 10):** aktuell nur die Demo-Führung, `status = entwurf` - Darstellung/Navigation/Zustands-URL (Stufe 3) sind ausdrücklich NICHT Teil dieses Auftrags, folgen in "Führungen, Teil 2". Vorbedingung für Teil 2, bereits im PROJEKTLOG vermerkt: `state.js`' `zielSignatur`-Mechanismus (einziger bisheriger Ansatz für "Datensatz per ID öffnen") ist aktuell bewusst stillgelegt (`setZielSignatur()` wird im gesamten Code nirgends mehr aufgerufen, siehe `js/viz/kalenderHeatmap.js:124-136`) - Teil 2 braucht dafür einen neuen, URL-fähigen Mechanismus.
