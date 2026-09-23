# SCHEMA.md – Datentabellen Interface Krems

Dieses Dokument beschreibt die konkreten Spaltenstrukturen aller Datentabellen des Projekts. Es ergänzt den Masterprompt (allgemeine, archivübergreifende Regeln) um die Krems-spezifischen Details und wächst mit dem Projekt mit. Pflegeregel: neue Spalten dürfen ergänzt werden, bestehende, bereits dokumentierte Spalten nicht ohne Rückfrage geändert werden (siehe Masterprompt Abschnitt 12).

**Allgemeine Konventionen** (siehe Masterprompt Abschnitt 12 für Details): CSV, UTF-8, Semikolon als Spaltentrenner, Pipe `|` für Mehrfachwerte innerhalb einer Zelle, `kleinschreibung_mit_unterstrich`, Unsicherheit pro Feld über `<feldname>_unsicher` (`ja`/`nein`), `unsicherheit_anmerkung` für die Hover-Tooltip-Erklärung, Datumsfelder als Freitext mit automatischer Präzisionserkennung, DataLoader entfernt UTF-8-BOM automatisch. `erschliessungsstatus` ist seit v3.8 optional (siehe Masterprompt Abschnitt 12).

**Präzisierung zu `unsicherheit_anmerkung` (nach Etappe-1-Praxisfund):** Ist bei einer Zeile nur ein Feld unsicher, steht dort einfacher Freitext. Sind mehrere Felder derselben Zeile unsicher, werden die einzelnen, feldspezifisch benannten Erklärungen mit Pipe `|` getrennt (z. B. `Datum: keine Jahresangabe erkennbar|Orte: Namensform mehrdeutig`) – der DataLoader zerlegt das dann, der allgemeinen Pipe-Konvention folgend, automatisch in eine Liste einzelner Erklärungen. Das ist beabsichtigtes Verhalten, keine Ausnahme und kein Sonderfall im Code nötig.

**Wichtiger Hinweis zum Dateiformat:** Die Quelldateien werden als Excel (.xlsx) gepflegt (Arbeits-/Erfassungsformat). Vor dem Einsatz im Interface werden sie als CSV (UTF-8, Semikolon-getrennt) exportiert und in `data/` abgelegt – der `dataLoader.js` liest ausschließlich CSV. Pipe-Zeichen innerhalb von Zellen sind beim Export unproblematisch, da sie sich vom Spalten-Trennzeichen (Semikolon) unterscheiden; Zellen mit zufälligen Semikolons im Freitext werden von Excel automatisch in Anführungszeichen gesetzt und von `d3.csvParse()` korrekt gelesen.

---

## 1. urkunden.csv (aus urkunden.xlsx, Sheet "urkunden")

Bereits ausgereifte, produktiv genutzte Tabelle. 26 bestehende Visualisierungen bauen darauf auf.

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `id` | Text | ja | **Altsignatur** (nicht generische Zeilen-ID, wie zuvor fälschlich beschrieben) |
| `signatur` | Text | ja | aktuelle/neue Signatur, eindeutig |
| `datum` | Text (Freitext) | nein | Datierung wie überliefert, Präzisionsstufe automatisch abgeleitet |
| `datum_normiert` | Text/Datum | nein | normierte Form (Herkunft/Zweck weiterhin nicht abschließend geklärt) |
| `datum_unsicher` | ja/nein | – | neu ergänzt |
| `jahr` | Zahl | für Zeitachse zwingend | |
| `orte` | Liste (Pipe-getrennt) | nein | |
| `orte_unsicher` | ja/nein | – | |
| `regest` | Volltext | nein | |
| `personen` | Liste (Pipe-getrennt) | nein | |
| `personen_id` | Text/Liste | nein | Verweis auf `personenliste.csv` (siehe Tabelle 8) |
| `personen_unsicher` | ja/nein | – | |
| `kategorien` | Liste (Pipe-getrennt) | nein | |
| `foto_ordner` | Text | nein | tatsächlicher Ordnername unter `fotos/thumbs/` – **vollständig befüllt** (1068/1068 automatisch zugeordnet über `id`/`signatur`-Abgleich, entspricht 1:1 der `signatur`-Spalte) |
| `unsicherheit_anmerkung` | Text | nein | für Hover-Tooltip |

**Hinweis:** enthält zusätzliches Tabellenblatt "Änderungsprotokoll" – internes Arbeitsdokument, nicht Teil der Interface-Daten, wird nicht mit exportiert.

---

## 2. ratsprotokolle.csv (geplant, weiterhin keine Dateninhalte)

Unverändert gegenüber letzter Prüfung.

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `id` | Text | ja | |
| `signatur` | Text | ja | |
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

## 3. bestand.csv (aus bestandsverzeichnis.xlsx, Sheet LookupListe_Becker15)

329 Bestandsdatensätze (verifiziert in Etappe 2 durch den tatsächlichen D3-Parser; frühere Angabe "330" war eine grobe Schätzung). **Hierarchie (korrigiert):** Gesamtbestand → `bkk_kategorie` → `bkk_unterkategorie` → einzelner Bestand (Zeile) – vier Ebenen, nicht drei wie zuvor dokumentiert. Frühere Fassung hatte die Unterkategorie-Ebene fälschlich mit der Bestands-Ebene gleichgesetzt. `kuerzel` bleibt Sortierschlüssel innerhalb der untersten Ebene, keine eigene Hierarchietiefe.

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `name` | Text | ja | |
| `kuerzel` | Text | ja | Sortierschlüssel |
| `zitierweise` | Text | nein | für Sidebar |
| `umfang` | Text (Rohangabe) | nein | |
| `umfang_lfm` | Zahl | für Kachelgröße | |
| `zeitraum_von` / `zeitraum_bis` | Zahl (Jahr) | nein | |
| `zeitraum_text` | Text | nein | |
| `bkk_kategorie` | Text | ja | Oberkategorie nach Becker |
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
| `id` | Text | ja | neu ergänzt |
| `Datum` | Text (Freitext) | nein | |
| `Datum_unsicher` | ja/leer | – | reines Flag, sauber (33 von 2791 = ja) |
| `Name` | Text | ja | |
| `personen_id` | Text | nein | neu, Verweis auf `personenliste.csv` |
| `Beruf` | Text | nein | |
| `Beruf_unsicher` | ja/leer | – | |
| `Wirtschaftssektor` | Text | nein | |
| `Buergen` | Text/Liste | nein | |
| `buergen_id` | Text/Liste | nein | neu, vermutlich Verweis auf `personenliste.csv` (zu bestätigen) |
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
| `id` | Text | ja | neu ergänzt |
| `Jahrzehnt` | Text | nein | |
| `Jahr` | Zahl | ja | |
| `Name` | Text | ja | |
| `Beruf/Funktion/Stand` | Text | nein | Originaltext |
| `Beruf` | Text | nein | bereinigt |
| `Ort (Schaetzung)` | Text | nein | |
| `Geschlecht (Schaetzung)` | Text | nein | |
| `Vermoegensgruppe` | Text (A–E, S) | nein | |
| `Realvermoegen_fl` | Zahl | nein | |
| `Gesamtvermoegen_fl` | Zahl | nein | |
| `Anteil SchzG an Aktiva (%)` | Zahl | nein | Forderungen |
| `Anteil SchvG an Aktiva (%)` | Zahl | nein | eigene Schulden |
| `Anteil Grundstuecke am RV (%)` | Zahl | nein | |
| `Anteil Bargeld am RV (%)` | Zahl | nein | |
| `Anteil Wertgegenstaende am RV (%)` | Zahl | nein | |
| `Beruflicher Sonderbestand` | Text | nein | |
| `Anteil Sonderbestand am RV (%)` | Zahl | nein | |
| `unsicherheit_anmerkung` | Text | nein | neu ergänzt |

**Weiterhin offen:** Spaltennamen mit Leerzeichen/Klammern/Prozentzeichen noch nicht bereinigt. Kein `_unsicher`-Flag vorhanden (nur die Anmerkungs-Spalte) – nach der gelockerten Mindestfelder-Regel (v3.8) kein Muss mehr, aber zu prüfen, ob ein Flag trotzdem sinnvoll wäre.

---

## 6. familien.csv (aus familien.xlsx, Sheet "Herrschernamen" – vormals "Sheet")

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `id` | Text | ja | Name + Ordnungszahl |
| `name` | Text | ja | |
| `titel` | Text/Liste (Pipe) | nein | |
| `familie` | Text | ja | |
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
| `orte_id` | Text | ja | neu, eindeutiger Schlüssel (ersetzt namensbasierte Referenz) |
| `orte` | Text | ja | Ortsname |
| `lat` | Zahl | ja | |
| `lon` | Zahl | ja | |
| `haeufigkeit` | Zahl | nein | |
| `orte_unsicher` | ja/nein | – | |
| `unsicherheit_anmerkung` | Text | nein | |

**Wichtige offene Frage:** Mit `orte_id` gibt es jetzt einen echten Schlüssel – Masterprompt Abschnitt 8 beschreibt aktuell aber noch eine rein namensbasierte Referenzierung zwischen Tabellen ("Andere Tabellen referenzieren Orte nur über den Ortsnamen"). Zu klären: Sollen `urkunden.orte` / `buergerbuch.Ort` künftig auf `orte_id` statt auf den Namen verweisen? Das wäre robuster (Namensänderungen/Schreibvarianten würden Verknüpfungen nicht mehr brechen), aber eine Änderung an bestehenden, bereits genutzten Feldern.

---

## 8. personenliste.csv (neu, aus personenliste.xlsx, Sheet Personenliste)

4179 Einträge (4111 aus Urkunden/Bürgerbuch + 68 aus `verlassenschaftsinventare.csv`, seit Auftrag "Familienbaum-Regression beheben + Personenliste umfassend erweitern", 2026-09-21). Zusammengeführtes Personenregister – verknüpft Nennungen aus Urkunden, Bürgerbuch UND Verlassenschaftsinventaren über eine gemeinsame, normierte `personen_id`. Löst das Problem mehrdeutiger Namensschreibweisen (vgl. die früher besprochenen 8 Namensüberschneidungen). **Wichtig:** Namensgleichheit über die drei Quellen hinweg wird NICHT automatisch verschmolzen – unabhängige Quellen ohne geprüfte Identität bekommen eigene Zeilen (z. B. gibt es sowohl `matthias_schmidt` als auch `matthias_schmidt_2`).

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `personen_id` | Text | ja | eindeutiger Schlüssel, referenziert von `urkunden.personen_id`, `buergerbuch.personen_id`, `buergerbuch.buergen_id`. Für neu ergänzte Verlassenschaftsinventar-Personen als Namens-Slug vergeben (Kleinschreibung, Umlaute→ae/oe/ue/ss), bei Kollision mit einer bestehenden ID mit `_2`/`_3`/… durchnummeriert. |
| `schreibweisen` | Liste (Pipe-getrennt) | nein | bekannte Namensvarianten derselben Person |
| `quelle` | Text | nein | `Urkunden` / `Bürgerbuch` / `Verlassenschaftsinventare` (seit 2026-09-21) |
| `anzahl_nennungen` | Zahl | nein | |
| `erste_nennung` / `letzte_nennung` | Zahl (Jahr) | nein | |
| `nennungsspanne_jahre` | Zahl | nein | berechenbar aus erste/letzte Nennung – zu prüfen, ob Rohwert oder Ableitung im DataLoader sinnvoller ist (DRY) |
| `nennung_in_urkunden` | Text/Liste (Pipe-getrennt) | nein | Signatur(en) aus `urkunden.csv` – Format geklärt: leer bei `quelle` ≠ Urkunden |
| `nennung_in_buergerbuch` | Text/Liste (Pipe-getrennt) | nein | `id`(s) aus `buergerbuch.csv` – Format geklärt: leer bei `quelle` ≠ Bürgerbuch |
| `nennung_in_verlassenschaften` | Text | nein | neu (2026-09-21): `id` aus `verlassenschaftsinventare.csv` (z. B. `VI-0004`), analog zu den beiden Feldern oben – leer bei `quelle` ≠ Verlassenschaftsinventare |
| `soziale_gruppe` | Text (Enum) | nein | neu (2026-09-21): `dynastie`/`adel`/`klerus`/`buerger`, dieselbe Klassifikationslogik wie `chordDiagramm.js`' `ermittleGruppe()` (Priorität Dynastie→Klerus→Adel→Bürgertum, über `personen_id`/`schreibweisen` angewandt) – als Klartext-Spalte materialisiert, nicht nur Laufzeit-Berechnung. Keine belegte historische Klassifikation, sondern eine Näherung (siehe Chord-Diagramm-Info-Text). |
| `beruf` | Text | nein | neu (2026-09-21): bei `quelle`=Bürgerbuch direkter Pull aus `buergerbuch.Beruf` (über `nennung_in_buergerbuch` aufgelöst, bei mehreren verknüpften Einträgen der erste mit befülltem Wert), bei `quelle`=Verlassenschaftsinventare direkter Pull aus `verlassenschaftsinventare.Beruf`, bei `quelle`=Urkunden durchgehend leer (keine systematisch extrahierbaren Berufsangaben im Personenfeld) |
| `unsicherheit_anmerkung` | Text | nein | |

**Hinweis:** enthält zusätzliches Tabellenblatt "Änderungsprotokoll" – internes Arbeitsdokument, nicht Teil der Interface-Daten. Kein `erschliessungsstatus`-Feld, konform zur gelockerten Regel (v3.8).

**Für die Visualisierung relevant:** Diese Tabelle ist die Grundlage für die im Masterprompt (Abschnitt 5a) erwähnte, über den Unsicherheits-Button erreichbare Übersicht unidentifizierter/mehrdeutiger Personen – analog zur geplanten Orte-Übersicht.

---

## 9. literatur.csv

Bisher nur im Masterprompt (Abschnitt 4.4, Ordnerstruktur) erwähnt, hier erstmals als eigene Tabellenstruktur festgehalten. Speist (künftig) den Literatur-Tab; neue Zeile = neuer Eintrag im Interface, automatisch, ohne Code-Änderung (Content-driven-Prinzip). **Aktuell nur die Kopfzeile, keine Datenzeilen** - der Literatur-Tab zeigt bislang ohnehin nur einen Platzhaltertext (`js/core/app.js:673-674`), lädt die Datei noch nicht.

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `literatur_id` | Text | ja | neu (Auftrag "Führungen, Teil 1", Punkt 2, 2026-09-23) - vorgesehen ist der Zotero-Zitierkey, Werte werden manuell nachgetragen, hier bewusst leer gelassen (keine abgeleiteten/erfundenen Keys). Referenzziel für `fuehrungen.csv`' `weiterlesen`-Spalte (siehe Abschnitt 10). |
| `titel` | Text | ja | |
| `autor` | Text | nein | |
| `jahr` | Zahl | nein | |
| `kurzbeschreibung` | Text | nein | |
| `kategorie` | Text | nein | z. B. "Zur Stadtgeschichte", "Zur Bürgerbuch-Forschung" |
| `link` | Text (URL) | nein | |

**Kein `_unsicher`-Feld vorgesehen:** Diese Tabelle beschreibt veröffentlichte, extern verifizierbare Literatur, keine archivarische Unsicherheit im bisherigen Sinn – daher keine Unsicherheits-Kennzeichnung nötig. Falls sich das ändert (z. B. bei unklaren bibliografischen Angaben), kann `unsicherheit_anmerkung` bei Bedarf nachträglich ergänzt werden, wie bei jeder anderen Tabelle auch.

**Korrektur (Auftrag "Führungen, Teil 1", Punkt 1, 2026-09-23):** dieselbe fälschliche Platzhalter-Kopfzeile wie bei `ratsprotokolle.csv` (siehe Abschnitt 2) entfernt - betraf ebenfalls nichts Sichtbares (Tab lädt die Datei noch nicht, s. o.).

---

## 10. fuehrungen.csv (neu, Auftrag "Führungen, Teil 1", 2026-09-23)

Datengrundlage für die künftigen Storytelling-Führungen (Darstellung/Navigation folgen in Teil 2). UTF-8, Semikolon-getrennt, Pipe für Listen - dieselben Konventionen wie alle übrigen Tabellen.

**Zeilenlogik:** eine Zeile pro STATION, nicht pro Führung. `fuehrung_id` steht in jeder Zeile. Die führungsweiten Angaben (`fuehrung_titel` bis `weiterlesen`) stehen NUR in der Zeile der ersten Station dieser Führung, in allen weiteren Stationen-Zeilen derselben Führung bleiben sie leer. Führungen erscheinen im Interface in der Reihenfolge ihres ERSTEN Auftretens in der Datei (keine separate Sortierspalte).

| Spalte | Format | Pflicht | Beschreibung |
|---|---|---|---|
| `fuehrung_id` | Text | ja | eindeutiger Schlüssel, in jeder Zeile befüllt |
| `fuehrung_titel` | Text | nur 1. Station | |
| `leitfrage` | Text | nur 1. Station | die übergeordnete Frage, die die Führung beantwortet |
| `kurzbeschreibung` | Text | nur 1. Station | für eine künftige Führungs-Übersicht/Kachel |
| `themenbereich` | Text | nur 1. Station | |
| `zeitraum` | Text | nur 1. Station | der von der Führung abgedeckte Gesamtzeitraum |
| `status` | Text (Enum) | nur 1. Station | `entwurf` (sichtbar, aber gekennzeichnet) oder `veroeffentlicht` |
| `weiterlesen` | Liste (Pipe-getrennt) | nur 1. Station | `literatur_id`-Werte (siehe Abschnitt 9), bleibt bis zur manuellen Zotero-Key-Pflege leer |
| `station_nr` | Zahl | ja | Reihenfolge der Stationen innerhalb einer Führung |
| `station_titel` | Text | ja | |
| `station_zeitraum` | Text | nein | |
| `text` | Liste (Pipe-getrennt) | ja | ein Absatz pro Listenelement; ein Absatz, der mit `- ` beginnt, ist ein Aufzählungspunkt - mehrere AUFEINANDERFOLGENDE `- `-Absätze bilden gemeinsam eine Liste |
| `beleg` | Liste (Pipe-getrennt, 1-2 Einträge) | ja | Format `typ:id`, Trennung am ERSTEN Doppelpunkt (IDs selbst enthalten keinen). Zwei Einträge ergeben eine Vergleichsslide. Präfixtabelle: |
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

**Erweiterung um Zustandsparameter (Stufe 3, NICHT Teil dieses Auftrags):** weitere Query-Parameter (z. B. `zeitraum=1500-1550`, `filter=kategorie:Kauf`) können künftig neben `datensatz` in derselben URL stehen, ohne dieses Format zu ändern - `router.js`' `parseHash()` bräuchte dafür nur weitere `params.get(...)`-Zeilen.

**Offener Punkt:** `filter.entity` (`entity_typ`/`entity_wert`) wird vom Router gesetzt, aber von keinem Modul ausgelesen (siehe PROJEKTLOG Eintrag 29) - unverändert, nicht Teil dieses Auftrags.

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
