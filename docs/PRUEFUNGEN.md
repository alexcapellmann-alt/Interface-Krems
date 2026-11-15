# Prüfungen und Tests

Stand: 15.11.2026 (Nachbesserung 8). Was im Repository liegt und ohne Installation läuft, und welche Prüfungen außerhalb
liegen und wie sie sich wiederholen lassen.

## 1. Tests im Repository (`tests/`)

Kleine Tests mit Node-Bordmitteln (`node:test`, `node:assert`): kein `package.json`, kein `node_modules`, kein Netzwerk.
Voraussetzung ist nur Node.js ab Version 22 (geprüft mit 24.16).

Aufruf im Hauptordner des Repositorys:

```
node --test "tests/*.test.mjs"
```

Die Anführungszeichen sind nötig: Node 24 nimmt keinen Ordner mehr an (`node --test tests/` sucht eine Datei dieses
Namens), das Muster löst Node selbst auf. Erwartet: alle Tests bestanden (`fail 0`).

| Datei | prüft |
|---|---|
| `dataLoader.test.mjs` | `js/core/dataLoader.js`: BOM, Semikolon, Pipe-Listen, Zeilenumbruch in Anführungszeichen, unbekannte Spalte, `errors` (leere Zeile, fehlender Pflichtwert mit Zeile und Spalte; der Datensatz bleibt in `records`) |
| `datePrecision.test.mjs` | `js/utils/datePrecision.js`: alle Beispiele der Mustertabelle (Masterprompt §12) und die Randfälle aus Nachbesserung 7 (unmögliche Tage und Monate, „o. D.“, „undatiert“) |
| `uncertainty.test.mjs` | `js/utils/uncertainty.js`: Format `<feld>: <Erklärung>`, `filtereErklaerungFuerFeld()`, lesbare Feldnamen |
| `bestandsHierarchie.test.mjs` | `js/utils/bestandsHierarchie.js`: vier Ebenen aus `bestandsverzeichnis.csv` |
| `datenformat.test.mjs` | alle `unsicherheit_anmerkung`-Einträge der CSV-Dateien in `data/` gegen das Format; bewusste Ausnahmen stehen als Liste im Test |
| `hilfen.mjs` | kein Test: lädt `vendor/d3/d3.v7.min.js` ohne Browser, ersetzt `fetch` durch Dateizugriff |

Wann ausführen: nach jeder Änderung an den genannten Modulen und nach jeder Datenlieferung (`datenformat.test.mjs`
schlägt an, wenn ein neuer Eintrag ohne Feldnamen hinzukommt oder eine Ausnahme aus den Daten verschwindet; dann die
Daten oder die Ausnahmeliste nachführen).

## 2. Prüfungen außerhalb des Repositorys

Diese Prüfungen brauchen einen Browser (Chrome) und Node-Pakete (`puppeteer-core`, `axe-core`, `lighthouse`). Sie liegen
deshalb nicht im Repository, sondern in den Prüf- und Nachbesserungsordnern neben ihm:

- `Pruefung_2026-11-14/tools/` – die Skripte des Prüfberichts vom 14.11.2026 (mit `package.json`; einmalig `npm install`)
- `Nachbesserung_2026-11-15/tools/` – dieselben Prüfungen, an die Nachbesserungen angepasst, und die Messskripte der
  Aufträge 3–8 (`a3_*` … `a8_*`); nutzt die `node_modules` aus `Pruefung_2026-11-14/tools/`

Alle Skripte erwarten einen laufenden Server; Adresse über `PRUEF_BASIS`. Für parallele Läufe den mehrfädigen Server
nehmen (der Testserver auf 8845 bedient nur eine Anfrage zugleich):

```
python server_gross_klein.py "C:\Users\ali\Desktop\GitHub\Interface-Krems" 8901
```

| Prüfung | Skript (in `Nachbesserung_2026-11-15/tools/`) | Ergebnis |
|---|---|---|
| axe-core, 31 Ansichten in bis zu fünf Zuständen | `node t4_axe.mjs` | `a6/k6/axe/zusammenfassung.txt` |
| Lighthouse-Zugänglichkeit, 31 Ansichten | `node t4_lighthouse.mjs` | `a6/k6/lighthouse/zusammenfassung.json` |
| Tastatur (Erreichbarkeit, Fokus, Auslösen, Esc) | `node t4_tastatur.mjs`, Nachprüfung über Elementmarken `node a8_tab_identitaet.mjs <ansicht> …` | `a6/k6/tastatur/auswertung.tsv` |
| Sitzungsbedienung (alle Module nacheinander in einem Tab) | `PRUEF_AUSGABE=<ordner> node t2_sitzung.mjs` | `<ordner>/protokoll.json` |
| Matrix beschädigter Daten (8 Fälle × Dateien × Ansichten) | `server_datenkopie.py` starten, dann `node a7_matrix.mjs` | `a7/regression/voll_zusammenfassung.txt` |
| Zweitarchiv (fiktives Archiv, nur `data/` und Karten getauscht) | `Pruefung_2026-11-14/tools/t1_zweitarchiv.py`, dann `t1_zweitarchiv_browser.mjs` | Prüfordner `k4/` |
| Funktionen über 100 Zeilen mit/ohne Begründung | `node a8_funktionen.mjs` | Ausgabe in der Konsole |

Beispiel (Git Bash, im Ordner `Nachbesserung_2026-11-15/tools/`):

```
export PRUEF_BASIS=http://127.0.0.1:8901/
node t4_axe.mjs
```

Die Matrix arbeitet auf einer Kopie von `data/` (`a7/regression/daten_kopie`) und setzt sie nach jedem Fall zurück; am
Ende vergleicht sie die Kopie mit dem Original (`diff-exit=0`). Die Dateien in `data/` des Repositorys bleiben unberührt.

Zuletzt gemessen (15.11.2026): axe 0 Verstöße in 124 Zuständen; Lighthouse 1,0 in 31 von 31 Ansichten; Tastatur alle
Bedienelemente erreichbar (außer den Links im zugeklappten Impressum, wie vorgesehen); Sitzung 39 Ansichten, 0 Fehler;
Matrix 0 Abstürze, 0 „leer ohne Hinweis“, 0 „stark abweichend“ ohne Hinweis. Einzelheiten: PROJEKTLOG 87–89.
