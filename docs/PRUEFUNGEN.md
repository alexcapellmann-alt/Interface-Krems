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
| `lichtAus.test.mjs` | `js/utils/lichtAus.js` (Auswahl, Alle, Massengruppen, ausgegraute Typen, Moduswechsel beim Ansichtenwechsel, Zähler, Muster), `hellGenugAufDunkel` (Akzentkontrast 4,5:1), Methodenhinweise je Pilotansicht, Zahlen der Pilotansichten auf den Daten, keine Typnamen im Code |
| `unsicherheitTyp.test.mjs` | `js/utils/uncertainty.js`: Parser der Unsicherheitstypen (Leerzeichen, Groß-/Kleinschreibung, mehrere Doppelpunkte, leere Einträge), Prüfung; Vokabulardateien; alle sieben Dateien mit `unsicherheit_typ` ohne Fehler, Warnungen nur die dokumentierten |
| `bildschirmHinweis.test.mjs` | `js/utils/bildschirmHinweis.js`: Grenze für den Hinweis „größerer Bildschirm“ (900 × 500), gängige Laptop-Fenster, Telefon, Breite 0 |
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
python server_gross_klein.py "..\..\Interface-Krems" 8901
```

| Prüfung | Skript (in `Nachbesserung_2026-11-15/tools/`) | Ergebnis |
|---|---|---|
| axe-core, 31 Ansichten in bis zu fünf Zuständen | `node t4_axe.mjs` | `a6/k6/axe/zusammenfassung.txt` |
| Lighthouse-Zugänglichkeit, 31 Ansichten | `node t4_lighthouse.mjs` | `a6/k6/lighthouse/zusammenfassung.json` |
| Tastatur (Erreichbarkeit, Fokus, Auslösen, Esc) | `node t4_tastatur.mjs`, Nachprüfung über Elementmarken `node a8_tab_identitaet.mjs <ansicht> …` | `a6/k6/tastatur/auswertung.tsv` |
| Sitzungsbedienung (alle Module nacheinander in einem Tab) | `PRUEF_AUSGABE=<ordner> node t2_sitzung.mjs`; Fenstergröße über `PRUEF_FENSTER=1366x768` (Standard 1366x900), meldet je Ansicht den Ersatztext „größerer Bildschirm“ | `<ordner>/protokoll.json` |
| Stammbaum bei Laptop-Größen, 375 px, Größenwechsel, Listener | `node a9_abnahme.mjs` | `a9/stammbaum_abnahme.txt`, Screenshots |
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
Bedienelemente erreichbar (außer den Links im zugeklappten Impressum, wie vorgesehen); Sitzung 39 Ansichten, 0 Fehler (auch bei 1366 × 768 und 1280 × 720, ohne Ersatztext); 34 Tests;
Matrix 0 Abstürze, 0 „leer ohne Hinweis“, 0 „stark abweichend“ ohne Hinweis. Einzelheiten: PROJEKTLOG 87–89.

**Auftrag 13 (16.11.2026):** Prüfskripte in `Unsicherheitstypen_2026-11/a13/werkzeuge/` (Server 8901):
`b_axe.mjs` (alle Zustände plus Modus „Licht aus“; `NUR`, `PRUEF_AUSGABE`), `b_sitzung_modus.mjs` (Sitzung mit Modus,
`PRUEF_FENSTER`), `b_tastatur_medien.mjs` (Tastatur, reduced-motion, forced-colors, Listener), `b_stammbaum_abnahme.mjs`,
`b_rundgang.mjs` (Bilder je Zustand), `b_sigma_vergleich.mjs` (Zahlen des alten σ-Filters). Vergleichsstand vor einem
Auftrag: `git archive <commit>` in einen Ordner außerhalb des Repositorys und auf eigenem Port starten. Zuletzt
gemessen: 57 Tests; axe 163 Zustände, 0 neue Verstöße (Vorbefund Bilderwand bei 768 px Höhe); Sitzung mit und ohne
Modus bei 1366×768 und 1280×720 ohne Fehler (PROJEKTLOG 95).

**Auftrag 14 (18.11.2026):** Werkzeuge in `Unsicherheitstypen_2026-11/a14/werkzeuge/`:
- `p2_beschreibung.mjs`: Beschreibung der Kachel im Zugänglichkeitsbaum, Hinweis beim Fokus, Text nach dem Aufklappen.
- `p3_markergroesse.mjs vorher|nachher`: Markergröße benannter Orte in „Licht an“, im Modus und mit nur „Ortsangabe“.
- `p4_bilderwand.mjs vorher|nachher`: Bilderwand mit geöffnetem Info-Text bei 1366 × 768 und 1280 × 720, axe mit den
  Regeln aus WCAG 2.2.
- `sitzung_modus.mjs`: Kopie von `b_sitzung_modus.mjs` mit Ausgabe nach `a14/regression`.

axe über alle Zustände weiter mit `a13/werkzeuge/b_axe.mjs` (`PRUEF_AUSGABE`). Tests 59 → 60 (`node --test "tests/*.test.mjs"`); axe 161 Zustände in 34 Ansichten mit WCAG-2.2-Regeln, 0 Verstöße (der Bilderwand-Vorbefund ist behoben); Sitzung ohne Modus 39 Ansichten, mit Modus 42 Schritte, je bei 1366 × 768 und 1280 × 720 ohne Fehler und ohne Ersatztext; Zahlen des Modus bestätigt: Regesten 687, Karte 100 von 224, Stammbaum 26 von 75.

**Auftrag 15 (18.11.2026):** Werkzeuge in `Unsicherheitstypen_2026-11/a15/werkzeuge/`:
- `p1_zustand_sigma.mjs vorher|nachher`: je Ansicht mit σ eine Auswahl herstellen, σ zweimal umschalten, Sidebar,
  Markierungen und Listener vergleichen.
- `p1_verbindungskarte_wien.mjs`: Akzeptanz Verbindungskarte (Wien, vier σ-Klicks, zwei Fenstergrößen).
- `sitzung_modus.mjs`: Kopie mit Ausgabe nach `a15/regression`.

Tests 60 → 60 (`node --test "tests/*.test.mjs"`); axe 161 Zustände in 34 Ansichten mit WCAG-2.2-Regeln, 0 Verstöße; Sitzung ohne Modus 39 Ansichten, mit Modus 42 Schritte, je bei 1366 × 768 und 1280 × 720 ohne Fehler und ohne Ersatztext; Zahlen des Modus unverändert (Regesten 687, Karte 100 von 224, Stammbaum 26 von 75); keine Datenänderung. Gesammelte Befunde für das Kapitel zur Prüfmethode: `docs/KAPITEL7_MATERIAL.md`.

**Gesamt-Sitzung (seit 18.11.2026):** `Unsicherheitstypen_2026-11/a15/werkzeuge/sitzung_gesamt.mjs` mit
`PRUEF_BASIS=http://127.0.0.1:8901/`. Je Fenstergröße (Standard 1366x768 und 1280x720) die Sitzung ohne Modus
(`t2_sitzung.mjs`) und mit Modus (`sitzung_modus.mjs`), dazu einmal die Auswahl beim Umschalten von σ über alle Ansichten
(`p1_zustand_sigma.mjs`) und die Verbindungskarte Wien (`p1_verbindungskarte_wien.mjs`). Ausgabe
`regression/sitzung_gesamt/zusammenfassung.txt` mit OK oder FEHLER je Teil; bekannte Ausnahme: Zeitachse (PROJEKTLOG 97).
Zuletzt (18.11.2026) alle Teile OK; axe 161 Zustände, 0 Verstöße; 60 Tests.

**Messung an einer Datenkopie:** Vorhergesagte Folgen einer Datenänderung werden an einer Kopie geprüft, die auf eigenem
Port läuft (z. B. 8903). Dort läuft `a13/werkzeuge/b_sigma_vergleich.mjs` (`PRUEF_BASIS`, `PRUEF_AUSGABE`), verglichen mit
dem echten Stand. So geprüft: Bürgen-Flaggen im Bürgerbuch, 26 Ansichten unverändert (PROJEKTLOG 98).

**Auftrag 16 (18.11.2026):** Werkzeuge in `Unsicherheitstypen_2026-11/a16/werkzeuge/`:
- `zellen.py`: Zellen einer CSV ändern, ohne andere Zeilen anzufassen; bricht ab, wenn eine Zeile sich nicht verlustfrei
  neu schreiben lässt.
- `a16_teil0.py`, `a16_buergen.py`: Datenänderungen mit Protokoll.
- `a16_zahlen.mjs vorher|nachher`: Ortsliste, Kartenpunkte, Verbindungskarte, Kategoriefluss.
- `a16_entwurf_strahl.mjs` (`PRUEF_FENSTER`): Attrappe des Strahls in fünf Zuständen mit axe.
- `a16_kontrast.py <ordner>`: Kontraste der Attrappe am Bildschirmfoto gemessen (Pixel, nicht Farbwerte).

Die Gesamt-Sitzung wertet eine Auswahl jetzt als verloren, wenn sie nach σ ein und aus nicht wiederhergestellt ist; die
Ausnahme für die Zeitachse ist entfallen. Zuletzt (18.11.2026): 60 Tests, axe 161 Zustände 0 Verstöße, Gesamt-Sitzung
alle Teile OK; Attrappe Strahl 0 Verstöße in 10 Zuständen, Kontrast mindestens 6,48:1.

**Grenzen der Prüfmethode (für Kapitel 7):**
- **Feste Fenstergrößen:** Geprüft wird bei festen Fenstergrößen, meist 1366 × 900, 1366 × 768 und 1280 × 720.
  Befunde, die nur bei anderen Höhen oder Breiten auftreten, bleiben unentdeckt; so war es beim Bilderwand-Kopf, den erst
  768 px Höhe zeigte.
- **Regelsätze von axe:** Die Ergebnisse hängen vom gewählten Regelsatz ab. Die Regel `target-size` gehört zu WCAG 2.2
  und läuft nur mit dem Schlagwort `wcag22aa`. „axe 0 Verstöße“ gilt jeweils für die genannten Größen und Regeln.
- **Kontraste in SVG:** axe meldet viele Texte über Karte und SVG als „incomplete“. Nachbesserung 6 hat sie am Element
  nachgerechnet (227 Texte, 225 bestanden; PROJEKTLOG 87). Die Kontraste der Muster und Linien im Modus „Licht aus“
  sind aus den Farbwerten berechnet, die Farbfehlsicht an Bildern simuliert; gemessen am Bildschirm wurde nichts.
- **Erklärung beim Überfahren:** Am einzelnen Feld einer Kachel gibt es sie nur mit der Maus. Tastatur und Touch erreichen
  dieselbe Erklärung über den Fokus auf die Kachel bzw. das Aufklappen, Bildschirmleser über die Beschreibung der Kachel.
- **Wirkung des σ-Knopfs:** Gezählt wurde in Auftrag 13 nur eine Art der Kennzeichnung (hell markiert). Kennzeichnungen
  durch Einblenden oder Stricheln, die erst nach einer Auswahl erscheinen, entgingen der Zählung (PROJEKTLOG 96, Punkt 5).

## 3. Datenerhebungen (nur lesen)

Die Vorerhebung für den Unsicherheits-Modus (15.11.2026, PROJEKTLOG 92) liegt in `Vorerhebung_2026-11-15/`: Bericht,
CSV-Listen und die Skripte (`werkzeuge/*.py`, `*.mjs`), die nur lesen. Wiederholen nach einer Datenlieferung:
`python -I werkzeuge/<skript>.py` im Ordner `werkzeuge`; `e12_knopf.mjs` braucht den Testserver auf 8845.

Datenbereinigung (Auftrag 11, PROJEKTLOG 93): `Unsicherheitstypen_2026-11/a11/` – Prüfblätter, Änderungsskript mit
Protokoll (`werkzeuge/a11_umsetzung.py`, `aenderungsprotokoll.csv`) und Zahlenvergleich der Oberfläche
(`node werkzeuge/a11_zahlen.mjs <name>`: Ortsliste, Kartenpunkte, unsichere Orte, Verbindungskarte, Ortswolke, Kategoriefluss).
